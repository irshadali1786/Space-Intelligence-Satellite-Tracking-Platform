"""Calculate (SGP4) and store position history for stored satellites.

Run from backend/:  python -m scripts.record_positions --hours 6 --step 5 --max 100
Safe to re-run: duplicate (satellite, timestamp) rows are ignored by the UNIQUE key.
"""
import argparse

from app.database import SessionLocal
from app.models import Satellite
from app.services import history_service


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hours", type=int, default=6)
    ap.add_argument("--step", type=int, default=5, help="minutes between stored points")
    ap.add_argument("--max", type=int, default=100)
    a = ap.parse_args()
    db = SessionLocal()
    sats = db.query(Satellite).order_by(Satellite.satellite_id).limit(a.max).all()
    total = 0
    for s in sats:
        total += history_service.record_positions(db, s.satellite_id, a.hours, a.step)
    print(f"Stored {total} new calculated positions for {len(sats)} satellites.")
    db.close()


if __name__ == "__main__":
    main()
