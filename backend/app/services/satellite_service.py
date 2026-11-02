"""Satellite queries (joins against the latest TLE view)."""
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, text
from sqlalchemy.orm import Session

from ..models import OrbitalElement, Satellite
from . import orbit_service

LATEST = text("""
    SELECT oe.* FROM orbital_elements oe
    JOIN (SELECT satellite_id, MAX(epoch) AS max_epoch FROM orbital_elements GROUP BY satellite_id) m
      ON m.satellite_id = oe.satellite_id AND m.max_epoch = oe.epoch
""")


def latest_element(db: Session, satellite_id: int) -> Optional[OrbitalElement]:
    return (db.query(OrbitalElement)
            .filter(OrbitalElement.satellite_id == satellite_id)
            .order_by(OrbitalElement.epoch.desc()).first())


def to_out(sat: Satellite, el: Optional[OrbitalElement]) -> dict:
    return {"satellite_id": sat.satellite_id, "norad_id": sat.norad_id, "name": sat.name,
            "category": sat.category, "element": el}


def _attach_latest(db: Session, sats: List[Satellite]) -> List[dict]:
    ids = [s.satellite_id for s in sats]
    els = {}
    if ids:
        latest = (db.query(OrbitalElement.satellite_id.label("sid"),
                           func.max(OrbitalElement.epoch).label("max_epoch"))
                  .filter(OrbitalElement.satellite_id.in_(ids))
                  .group_by(OrbitalElement.satellite_id).subquery())
        rows = (db.query(OrbitalElement)
                .join(latest, and_(latest.c.sid == OrbitalElement.satellite_id,
                                   latest.c.max_epoch == OrbitalElement.epoch)).all())
        els = {e.satellite_id: e for e in rows}
    return [to_out(s, els.get(s.satellite_id)) for s in sats]


def list_satellites(db: Session, category: Optional[str], limit: int, offset: int) -> Tuple[int, List[dict]]:
    q = db.query(Satellite)
    if category:
        q = q.filter(Satellite.category == category)
    total = q.count()
    sats = q.order_by(Satellite.name).limit(limit).offset(offset).all()
    return total, _attach_latest(db, sats)


def search_satellites(db: Session, term: str, category: Optional[str], limit: int) -> List[dict]:
    q = db.query(Satellite)
    if term.isdigit():
        q = q.filter(or_(Satellite.norad_id == int(term), Satellite.name.like(f"%{term}%")))
    else:
        q = q.filter(Satellite.name.like(f"%{term}%"))
    if category:
        q = q.filter(Satellite.category == category)
    return _attach_latest(db, q.order_by(Satellite.name).limit(limit).all())


def get_satellite(db: Session, satellite_id: int) -> Satellite:
    sat = db.get(Satellite, satellite_id)
    if not sat:
        raise HTTPException(404, f"Satellite {satellite_id} not found")
    return sat


def categories(db: Session) -> List[dict]:
    rows = db.execute(text("SELECT category, COUNT(*) AS n FROM satellites GROUP BY category ORDER BY n DESC")).all()
    return [{"category": r[0], "count": r[1]} for r in rows]


def positions_now(db: Session, category: Optional[str], limit: int) -> List[dict]:
    """Current calculated position of up to `limit` satellites (for the globe)."""
    q = db.query(Satellite)
    if category:
        q = q.filter(Satellite.category == category)
    sats = q.order_by(Satellite.satellite_id).limit(limit).all()
    now = datetime.now(timezone.utc)
    out = []
    for item in _attach_latest(db, sats):
        el = item["element"]
        if not el:
            continue
        p = orbit_service.propagate(orbit_service.make_satrec(el.tle_line1, el.tle_line2), now)
        if p:
            p.pop("r_teme")
            out.append({**p, "satellite_id": item["satellite_id"], "norad_id": item["norad_id"],
                        "name": item["name"], "category": item["category"]})
    return out


def satellite_track(db: Session, satellite_id: int, start: Optional[datetime], minutes: int, step: int) -> List[dict]:
    get_satellite(db, satellite_id)
    el = latest_element(db, satellite_id)
    if not el:
        raise HTTPException(404, "No orbital elements stored for this satellite")
    start = start or datetime.now(timezone.utc)
    return orbit_service.track(orbit_service.make_satrec(el.tle_line1, el.tle_line2), start, minutes, step)
