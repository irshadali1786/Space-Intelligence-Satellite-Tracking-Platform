from fastapi import APIRouter

from ..config import settings

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/limits")
def limits():
    """Limits the frontend must respect (single source of truth)."""
    return {"proximity_max_objects": settings.PROXIMITY_MAX_OBJECTS,
            "proximity_default_objects": settings.PROXIMITY_DEFAULT_OBJECTS,
            "positions_max": settings.POSITIONS_MAX}
