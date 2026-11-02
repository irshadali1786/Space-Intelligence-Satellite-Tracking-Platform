from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..schemas import (CurrentPositionOut, HistoryOut, PositionOut, SatelliteOut,
                       SatellitePage)
from ..services import history_service, satellite_service

router = APIRouter(prefix="/satellites", tags=["satellites"])


@router.get("", response_model=SatellitePage)
def list_satellites(category: Optional[str] = None, limit: int = Query(50, ge=1, le=500),
                    offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    total, items = satellite_service.list_satellites(db, category, limit, offset)
    return {"total": total, "items": items}


@router.get("/search", response_model=List[SatelliteOut])
def search(q: str = Query(..., min_length=1, max_length=60), category: Optional[str] = None,
           limit: int = Query(25, ge=1, le=100), db: Session = Depends(get_db)):
    """Search by name fragment or exact NORAD ID."""
    return satellite_service.search_satellites(db, q.strip(), category, limit)


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    return satellite_service.categories(db)


@router.get("/positions/now", response_model=List[CurrentPositionOut])
def positions_now(category: Optional[str] = None, limit: int = Query(300, ge=1, le=settings.POSITIONS_MAX),
                  db: Session = Depends(get_db)):
    """Current CALCULATED positions (SGP4), used by the 3D globe."""
    return satellite_service.positions_now(db, category, limit)


@router.get("/{satellite_id}", response_model=SatelliteOut)
def get_satellite(satellite_id: int, db: Session = Depends(get_db)):
    sat = satellite_service.get_satellite(db, satellite_id)
    return satellite_service.to_out(sat, satellite_service.latest_element(db, satellite_id))


@router.get("/{satellite_id}/positions", response_model=List[PositionOut])
def positions(satellite_id: int, start: Optional[datetime] = None,
              minutes: int = Query(95, ge=1, le=1440), step_seconds: int = Query(60, ge=5, le=3600),
              db: Session = Depends(get_db)):
    """Calculated track starting at `start` (default now). Not radar data."""
    return satellite_service.satellite_track(db, satellite_id, start, minutes, step_seconds)


@router.get("/{satellite_id}/history", response_model=List[HistoryOut])
def history(satellite_id: int, start: Optional[datetime] = None, end: Optional[datetime] = None,
            limit: int = Query(1000, ge=1, le=10000), db: Session = Depends(get_db)):
    """Stored position history (timestamp filtered)."""
    return history_service.query_history(db, satellite_id, start, end, limit)


@router.post("/{satellite_id}/history/record")
def record_history(satellite_id: int, hours_back: int = Query(6, ge=1, le=72),
                   step_minutes: int = Query(5, ge=1, le=60), db: Session = Depends(get_db)):
    """Calculate and store positions for the last N hours (idempotent)."""
    satellite_service.get_satellite(db, satellite_id)
    inserted = history_service.record_positions(db, satellite_id, hours_back, step_minutes)
    return {"satellite_id": satellite_id, "inserted": inserted}
