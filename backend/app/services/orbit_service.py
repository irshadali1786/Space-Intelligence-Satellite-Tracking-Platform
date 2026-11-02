"""SGP4 propagation + coordinate conversion. Pure functions, no DB access.

All positions here are CALCULATED from TLEs. They are not radar observations.
"""
import math
from functools import lru_cache
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import numpy as np
from sgp4.api import Satrec, jday

WGS84_A = 6378.137            # km
WGS84_F = 1 / 298.257223563
WGS84_E2 = WGS84_F * (2 - WGS84_F)
MU = 398600.4418              # km^3/s^2


@lru_cache(maxsize=8192)
def make_satrec(line1: str, line2: str) -> Satrec:
    """Cached per TLE text. propagate() only reads the returned error code, never sat.error."""
    return Satrec.twoline2rv(line1, line2)


def _jd(t: datetime):
    t = t.astimezone(timezone.utc) if t.tzinfo else t
    return jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6)


def gmst_rad(jd: float, fr: float) -> float:
    """Greenwich Mean Sidereal Time (radians) from Julian date (UT1 ~ UTC)."""
    t = ((jd - 2451545.0) + fr) / 36525.0
    sec = (67310.54841 + (876600 * 3600 + 8640184.812866) * t
           + 0.093104 * t * t - 6.2e-6 * t ** 3)
    return math.radians((sec % 86400.0) / 240.0)


def teme_to_geodetic(r, gmst: float):
    """TEME position (km) -> (lat_deg, lon_deg, alt_km) on WGS84."""
    x, y, z = r
    lon = math.atan2(y, x) - gmst
    lon = (lon + math.pi) % (2 * math.pi) - math.pi
    p = math.hypot(x, y)
    lat = math.atan2(z, p * (1 - WGS84_E2))
    for _ in range(6):
        n = WGS84_A / math.sqrt(1 - WGS84_E2 * math.sin(lat) ** 2)
        alt = p / math.cos(lat) - n if abs(math.cos(lat)) > 1e-9 else abs(z) / abs(math.sin(lat)) - n * (1 - WGS84_E2)
        lat = math.atan2(z, p * (1 - WGS84_E2 * n / (n + alt)))
    return math.degrees(lat), math.degrees(lon), alt


def propagate(sat: Satrec, t: datetime) -> Optional[Dict]:
    """Return position/velocity at time t, or None if SGP4 reports an error."""
    jd, fr = _jd(t)
    err, r, v = sat.sgp4(jd, fr)
    if err != 0:
        return None
    lat, lon, alt = teme_to_geodetic(r, gmst_rad(jd, fr))
    return {
        "time": t.replace(tzinfo=None) if t.tzinfo is None else t.astimezone(timezone.utc).replace(tzinfo=None),
        "latitude_deg": lat,
        "longitude_deg": lon,
        "altitude_km": alt,
        "velocity_kms": float(np.linalg.norm(v)),
        "r_teme": r,
    }


def track(sat: Satrec, start: datetime, minutes: int, step_seconds: int) -> List[Dict]:
    """Ground track / future path as a list of positions."""
    out = []
    n = int(minutes * 60 / step_seconds) + 1
    for i in range(n):
        p = propagate(sat, start + timedelta(seconds=i * step_seconds))
        if p:
            p.pop("r_teme")
            out.append(p)
    return out


def parse_tle_metrics(line1: str, line2: str) -> Dict:
    """Extract orbital elements from fixed-width TLE columns."""
    yy = int(line1[18:20])
    day = float(line1[20:32])
    year = 2000 + yy if yy < 57 else 1900 + yy
    epoch = datetime(year, 1, 1) + timedelta(days=day - 1)
    inc = float(line2[8:16])
    ecc = float("0." + line2[26:33].strip())
    mm = float(line2[52:63])
    n_rad_s = mm * 2 * math.pi / 86400.0
    a = (MU / n_rad_s ** 2) ** (1 / 3)
    return {
        "epoch": epoch,
        "inclination_deg": inc,
        "eccentricity": ecc,
        "mean_motion": mm,
        "period_min": 1440.0 / mm,
        "perigee_km": a * (1 - ecc) - WGS84_A,
        "apogee_km": a * (1 + ecc) - WGS84_A,
    }
