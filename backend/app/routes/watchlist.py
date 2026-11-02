from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..schemas import WatchlistIn, WatchlistOut
from ..services import watchlist_service

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("", response_model=List[WatchlistOut])
def get_watchlist(db: Session = Depends(get_db)):
    return watchlist_service.list_watchlist(db, settings.DEFAULT_USER_ID)


@router.post("", response_model=WatchlistOut, status_code=201)
def add_to_watchlist(body: WatchlistIn, db: Session = Depends(get_db)):
    return watchlist_service.add(db, settings.DEFAULT_USER_ID, body.satellite_id, body.note)


@router.delete("/{watchlist_id}", status_code=204)
def remove_from_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    watchlist_service.remove(db, settings.DEFAULT_USER_ID, watchlist_id)
