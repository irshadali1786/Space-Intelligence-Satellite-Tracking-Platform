"""TEST FIXTURES ONLY. Synthetic but SGP4-valid TLEs for automated tests.

These are never loaded by the application. Names start with TEST- so they cannot be
confused with real CelesTrak objects.
"""
import math
import random
from datetime import datetime, timezone

from sgp4.api import WGS72, Satrec
from sgp4.exporter import export_tle

MU = 398600.4418
RE = 6378.137


def make_tle(satnum: int, name: str, alt_km: float, inc_deg: float, raan_deg: float = 0.0,
             ma_deg: float = 0.0, ecc: float = 0.0005, epoch: datetime = None):
    epoch = epoch or datetime.now(timezone.utc)
    a = RE + alt_km
    n_rad_min = math.sqrt(MU / a ** 3) * 60.0
    jd0 = 2433281.5  # 1949-12-31
    ep_days = (epoch - datetime(1949, 12, 31, tzinfo=timezone.utc)).total_seconds() / 86400.0
    sat = Satrec()
    sat.sgp4init(WGS72, "i", satnum, ep_days, 1e-5, 0.0, 0.0, ecc, 0.0,
                 math.radians(inc_deg), math.radians(ma_deg), n_rad_min, math.radians(raan_deg))
    l1, l2 = export_tle(sat)
    return name, l1, l2


def build_set(seed: int = 7):
    """Returns {category: [(name, l1, l2), ...]} with a deliberately close LEO pair."""
    rnd = random.Random(seed)
    out = {"test-leo": [], "test-meo": [], "test-geo": [], "debris": []}
    for i in range(12):
        out["test-leo"].append(make_tle(90000 + i, f"TEST-LEO-{i:03d}", rnd.uniform(400, 1200),
                                        rnd.uniform(30, 98), rnd.uniform(0, 360), rnd.uniform(0, 360)))
    # close pair: same orbit, 0.02 deg mean-anomaly apart (~2.5 km along-track)
    out["test-leo"].append(make_tle(90100, "TEST-PAIR-A", 550, 53.0, 100.0, 10.00))
    out["test-leo"].append(make_tle(90101, "TEST-PAIR-B", 550, 53.0, 100.0, 10.02))
    for i in range(4):
        out["test-meo"].append(make_tle(90200 + i, f"TEST-MEO-{i:03d}", 20200, 55.0, i * 60.0, i * 90.0))
    for i in range(3):
        out["test-geo"].append(make_tle(90300 + i, f"TEST-GEO-{i:03d}", 35786, 0.05, 0.0, i * 120.0, ecc=0.0002))
    for i in range(10):
        out["debris"].append(make_tle(90400 + i, f"TEST-DEB-{i:03d}", rnd.uniform(500, 1500),
                                      rnd.uniform(60, 100), rnd.uniform(0, 360), rnd.uniform(0, 360), ecc=0.002))
    return out
