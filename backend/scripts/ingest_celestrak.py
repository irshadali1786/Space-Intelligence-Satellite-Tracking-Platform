"""Fetch real TLE data from CelesTrak and load it through stored procedure
sp_upsert_satellite_tle (one transaction per satellite).

Run from backend/:  python -m scripts.ingest_celestrak
Options:            python -m scripts.ingest_celestrak --groups stations,weather,gps-ops --max 400
"""
import argparse
import sys

import requests
from app.database import SessionLocal
from app.services.ingest_service import load_tle

BASE = "https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle"

# CelesTrak group -> category label stored in satellites.category
GROUPS = {
    "stations": "space-station",
    "weather": "weather",
    "gps-ops": "navigation",
    "galileo": "navigation",
    "science": "science",
    "geo": "geostationary",
    "starlink": "communications",
    "visual": "bright",
}


def fetch_group(group: str) -> list:
    r = requests.get(BASE.format(group=group), timeout=60, headers={"User-Agent": "ORBITX-student-project"})
    r.raise_for_status()
    lines = [ln.rstrip() for ln in r.text.splitlines() if ln.strip()]
    out = []
    for i in range(0, len(lines) - 2, 3):
        name, l1, l2 = lines[i].strip(), lines[i + 1], lines[i + 2]
        if l1.startswith("1 ") and l2.startswith("2 "):
            out.append((name, l1, l2))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--groups", default="stations,weather,gps-ops,science,visual")
    ap.add_argument("--max", type=int, default=300, help="max satellites per group")
    args = ap.parse_args()

    db = SessionLocal()
    total = 0
    seen = set()
    for group in [g.strip() for g in args.groups.split(",") if g.strip()]:
        category = GROUPS.get(group, group)
        try:
            tles = fetch_group(group)[: args.max]
        except Exception as exc:          # network problems should not kill the whole run
            print(f"[skip] {group}: {exc}", file=sys.stderr)
            continue
        ok = 0
        for name, l1, l2 in tles:
            norad = int(l1[2:7])
            if norad in seen:
                continue
            seen.add(norad)
            if load_tle(db, name, l1, l2, category):
                ok += 1
        print(f"{group:10s} -> {ok} satellites loaded (category '{category}')")
        total += ok
    db.close()
    print(f"Done. {total} satellites ingested from CelesTrak.")


if __name__ == "__main__":
    main()
