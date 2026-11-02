from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..schemas import ProximityOut
from ..services import analytics_service, proximity_service

router = APIRouter(tags=["analytics"])


@router.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    return analytics_service.build_analytics(db)


@router.get("/analytics/compare")
def compare(ids: str = Query(..., description="comma separated satellite_ids, 2 to 6"),
            db: Session = Depends(get_db)):
    try:
        id_list = [int(x) for x in ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(422, "ids must be integers")
    if not 2 <= len(id_list) <= 6:
        raise HTTPException(422, "Provide between 2 and 6 ids")
    return analytics_service.compare_satellites(db, id_list)


@router.get("/proximity", response_model=ProximityOut)
def proximity(ids: Optional[str] = Query(None, description="comma separated satellite_ids; default: first N"),
              threshold_km: float = Query(50.0, gt=0, le=5000),
              window_minutes: int = Query(0, ge=0, le=180),
              step_seconds: int = Query(60, ge=10, le=600),
              max_objects: int = Query(settings.PROXIMITY_DEFAULT_OBJECTS, ge=2, le=settings.PROXIMITY_MAX_OBJECTS),
              db: Session = Depends(get_db)):
    """Experimental close-approach estimates (not collision predictions)."""
    id_list: Optional[List[int]] = None
    if ids:
        try:
            id_list = [int(x) for x in ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(422, "ids must be integers")
        if len(id_list) > settings.PROXIMITY_MAX_OBJECTS:
            raise HTTPException(422, f"At most {settings.PROXIMITY_MAX_OBJECTS} satellites per analysis")
    return proximity_service.compute(db, id_list, threshold_km, window_minutes, step_seconds, max_objects, None)
