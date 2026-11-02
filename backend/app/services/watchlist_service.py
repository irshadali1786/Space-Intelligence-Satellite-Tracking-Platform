from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models import Watchlist
from . import satellite_service


def list_watchlist(db: Session, user_id: int) -> list:
    rows = db.query(Watchlist).filter(Watchlist.user_id == user_id).order_by(Watchlist.added_at.desc()).all()
    out = []
    for w in rows:
        el = satellite_service.latest_element(db, w.satellite_id)
        out.append({"watchlist_id": w.watchlist_id, "added_at": w.added_at, "note": w.note,
                    "satellite": satellite_service.to_out(w.satellite, el)})
    return out


def add(db: Session, user_id: int, satellite_id: int, note):
    satellite_service.get_satellite(db, satellite_id)
    w = Watchlist(user_id=user_id, satellite_id=satellite_id, note=note)
    db.add(w)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Satellite is already in the watchlist")
    db.refresh(w)
    el = satellite_service.latest_element(db, satellite_id)
    return {"watchlist_id": w.watchlist_id, "added_at": w.added_at, "note": w.note,
            "satellite": satellite_service.to_out(w.satellite, el)}


def remove(db: Session, user_id: int, watchlist_id: int) -> None:
    w = db.query(Watchlist).filter(Watchlist.watchlist_id == watchlist_id, Watchlist.user_id == user_id).first()
    if not w:
        raise HTTPException(404, "Watchlist entry not found")
    db.delete(w)
    db.commit()
