"""Pydantic response / request models."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ElementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    element_id: int
    epoch: datetime
    inclination_deg: float
    eccentricity: float
    mean_motion: float
    period_min: float
    perigee_km: Optional[float] = None
    apogee_km: Optional[float] = None


class SatelliteOut(BaseModel):
    satellite_id: int
    norad_id: int
    name: str
    category: str
    element: Optional[ElementOut] = None


class SatellitePage(BaseModel):
    total: int
    items: List[SatelliteOut]


class PositionOut(BaseModel):
    """Calculated by SGP4 from a TLE; not a radar observation."""
    time: datetime
    latitude_deg: float
    longitude_deg: float
    altitude_km: float
    velocity_kms: float


class CurrentPositionOut(PositionOut):
    satellite_id: int
    norad_id: int
    name: str
    category: str


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    recorded_at: datetime
    latitude_deg: float
    longitude_deg: float
    altitude_km: float
    velocity_kms: float


class WatchlistIn(BaseModel):
    satellite_id: int = Field(gt=0)
    note: Optional[str] = Field(default=None, max_length=255)


class WatchlistOut(BaseModel):
    watchlist_id: int
    added_at: Optional[datetime] = None
    note: Optional[str] = None
    satellite: SatelliteOut


class ProximityPair(BaseModel):
    satellite_a: str
    norad_a: int
    satellite_b: str
    norad_b: int
    min_distance_km: float
    at: datetime
    below_threshold: bool


class ProximityOut(BaseModel):
    disclaimer: str
    threshold_km: float
    window_minutes: int
    objects_compared: int
    pairs: List[ProximityPair]
