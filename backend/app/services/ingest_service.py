"""Reusable TLE ingestion (used by the CLI script, background jobs and tests)."""
import logging
from typing import Iterable, List, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from .orbit_service import make_satrec, parse_tle_metrics

log = logging.getLogger("orbitx.ingest")

Tle = Tuple[str, str, str]  # name, line1, line2


def tle_is_valid(l1: str, l2: str) -> bool:
    """Structural check: line numbers, same NORAD ID, checksums, SGP4 can initialise."""
    if len(l1) < 69 or len(l2) < 69 or l1[0] != "1" or l2[0] != "2" or l1[2:7] != l2[2:7]:
        return False
    for line in (l1, l2):
        total = sum(int(c) if c.isdigit() else (1 if c == "-" else 0) for c in line[:68])
        if total % 10 != int(line[68]):
            return False
    try:
        return make_satrec(l1, l2).error == 0
    except Exception:
        return False


def load_tle(db: Session, name: str, l1: str, l2: str, category: str) -> bool:
    """Insert/update one satellite + TLE via sp_upsert_satellite_tle (one transaction). Returns success."""
    if not tle_is_valid(l1, l2):
        log.warning("invalid TLE skipped: %s", name)
        return False
    m = parse_tle_metrics(l1, l2)
    try:
        db.execute(text("CALL sp_upsert_satellite_tle(:norad,:name,:cat,:l1,:l2,:epoch,:inc,:ecc,:mm,:pg,:ap)"),
                   {"norad": int(l1[2:7]), "name": name[:120], "cat": category, "l1": l1, "l2": l2,
                    "epoch": m["epoch"], "inc": m["inclination_deg"], "ecc": m["eccentricity"],
                    "mm": m["mean_motion"], "pg": m["perigee_km"], "ap": m["apogee_km"]})
        db.commit()
        return True
    except Exception:
        db.rollback()
        log.exception("ingest failed for NORAD %s", l1[2:7])
        return False


def load_many(db: Session, tles: Iterable[Tle], category: str) -> Tuple[int, int]:
    ok = bad = 0
    for name, l1, l2 in tles:
        if load_tle(db, name, l1, l2, category):
            ok += 1
        else:
            bad += 1
    return ok, bad
