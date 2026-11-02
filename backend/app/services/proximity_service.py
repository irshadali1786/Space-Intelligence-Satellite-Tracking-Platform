"""Experimental proximity estimates between SGP4-propagated objects.

Not a certified conjunction assessment: TLE accuracy is roughly kilometres.
"""
from datetime import datetime, timedelta, timezone
from itertools import combinations
from typing import List, Optional

import numpy as np
from sqlalchemy.orm import Session

from ..models import Satellite
from . import orbit_service, satellite_service

DISCLAIMER = ("EXPERIMENTAL ESTIMATE. Distances come from SGP4 propagation of public TLEs, whose "
              "error is typically kilometres. This is not a certified collision prediction.")


def compute(db: Session, ids: Optional[List[int]], threshold_km: float, window_minutes: int,
            step_seconds: int, max_objects: int, at: Optional[datetime]) -> dict:
    if ids:
        sats = db.query(Satellite).filter(Satellite.satellite_id.in_(ids)).all()
    else:
        sats = db.query(Satellite).order_by(Satellite.satellite_id).limit(max_objects).all()
    if not ids:
        sats = sats[:max_objects]

    objs = []
    for s in sats:
        el = satellite_service.latest_element(db, s.satellite_id)
        if el:
            objs.append((s, orbit_service.make_satrec(el.tle_line1, el.tle_line2)))

    start = at or datetime.now(timezone.utc)
    steps = max(1, int(window_minutes * 60 / step_seconds) + 1) if window_minutes else 1
    times = [start + timedelta(seconds=i * step_seconds) for i in range(steps)]

    # positions[obj_index] -> array (steps, 3) with NaN where SGP4 failed
    pos = np.full((len(objs), steps, 3), np.nan)
    for i, (_, sat) in enumerate(objs):
        for k, t in enumerate(times):
            p = orbit_service.propagate(sat, t)
            if p:
                pos[i, k] = p["r_teme"]

    pairs = []
    for i, j in combinations(range(len(objs)), 2):
        d = np.linalg.norm(pos[i] - pos[j], axis=1)
        if np.all(np.isnan(d)):
            continue
        k = int(np.nanargmin(d))
        a, b = objs[i][0], objs[j][0]
        pairs.append({
            "satellite_a": a.name, "norad_a": a.norad_id, "satellite_b": b.name, "norad_b": b.norad_id,
            "min_distance_km": round(float(d[k]), 3),
            "at": times[k].replace(tzinfo=None),
            "below_threshold": bool(d[k] <= threshold_km),
        })
    pairs.sort(key=lambda p: p["min_distance_km"])
    return {"disclaimer": DISCLAIMER, "threshold_km": threshold_km, "window_minutes": window_minutes,
            "objects_compared": len(objs), "pairs": pairs[:200]}
