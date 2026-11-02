"""Historical position storage (timestamped, calculated by SGP4)."""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.orm import Session

from ..models import PositionHistory
from . import orbit_service, satellite_service


def query_history(db: Session, satellite_id: int, start: Optional[datetime],
                  end: Optional[datetime], limit: int) -> List[PositionHistory]:
    satellite_service.get_satellite(db, satellite_id)
    q = db.query(PositionHistory).filter(PositionHistory.satellite_id == satellite_id)
    if start:
        q = q.filter(PositionHistory.recorded_at >= start)
    if end:
        q = q.filter(PositionHistory.recorded_at <= end)
    return q.order_by(PositionHistory.recorded_at.asc()).limit(limit).all()


def record_positions(db: Session, satellite_id: int, hours_back: int, step_minutes: int,
                     end: Optional[datetime] = None) -> int:
    """Calculate and store positions in ONE transaction. Duplicates are ignored (unique key)."""
    el = satellite_service.latest_element(db, satellite_id)
    if not el:
        return 0
    sat = orbit_service.make_satrec(el.tle_line1, el.tle_line2)
    end = (end or datetime.now(timezone.utc)).replace(second=0, microsecond=0)
    rows = []
    for i in range(int(hours_back * 60 / step_minutes) + 1):
        t = end - timedelta(minutes=i * step_minutes)
        p = orbit_service.propagate(sat, t)
        if p:
            rows.append({"satellite_id": satellite_id, "element_id": el.element_id,
                         "recorded_at": p["time"], "latitude_deg": p["latitude_deg"],
                         "longitude_deg": p["longitude_deg"], "altitude_km": p["altitude_km"],
                         "velocity_kms": p["velocity_kms"]})
    if not rows:
        return 0
    try:
        stmt = mysql_insert(PositionHistory).values(rows).prefix_with("IGNORE")
        res = db.execute(stmt)
        db.commit()          # trigger trg_low_altitude fires per inserted row
        return res.rowcount
    except Exception:
        db.rollback()
        raise
