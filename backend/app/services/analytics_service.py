"""Analytics via SQL aggregates, joins and nested queries."""
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

LATEST_VIEW = "v_latest_elements"


def build_analytics(db: Session) -> dict:
    totals = db.execute(text(f"""
        SELECT (SELECT COUNT(*) FROM satellites)                  AS satellites,
               (SELECT COUNT(*) FROM orbital_elements)            AS tle_records,
               (SELECT COUNT(*) FROM position_history)            AS position_records,
               (SELECT MAX(fetched_at) FROM orbital_elements)     AS last_ingest,
               ROUND(AVG((perigee_km + apogee_km)/2),1)           AS avg_altitude_km,
               ROUND(MIN(perigee_km),1)                           AS min_perigee_km,
               ROUND(MAX(apogee_km),1)                            AS max_apogee_km
        FROM {LATEST_VIEW}
    """)).mappings().first()

    categories = db.execute(text("""
        SELECT category, COUNT(*) AS count FROM satellites GROUP BY category ORDER BY count DESC
    """)).mappings().all()

    # Orbit class from mean altitude. Nested via derived table.
    orbit_classes = db.execute(text(f"""
        SELECT orbit_class, COUNT(*) AS count FROM (
          SELECT CASE
                   WHEN (perigee_km+apogee_km)/2 < 2000 THEN 'LEO'
                   WHEN (perigee_km+apogee_km)/2 < 35000 THEN 'MEO'
                   WHEN (perigee_km+apogee_km)/2 BETWEEN 35000 AND 36500 THEN 'GEO'
                   ELSE 'HEO/Other' END AS orbit_class
          FROM {LATEST_VIEW}) t
        GROUP BY orbit_class ORDER BY count DESC
    """)).mappings().all()

    # Altitude histogram, 200 km buckets under 2000 km.
    altitude_buckets = db.execute(text(f"""
        SELECT FLOOR(((perigee_km+apogee_km)/2)/200)*200 AS bucket_km, COUNT(*) AS count
        FROM {LATEST_VIEW}
        WHERE (perigee_km+apogee_km)/2 < 2000
        GROUP BY bucket_km ORDER BY bucket_km
    """)).mappings().all()

    periods = db.execute(text("""
        SELECT s.category, ROUND(AVG(e.period_min),2) AS avg_period_min,
               ROUND(MIN(e.period_min),2) AS min_period_min, ROUND(MAX(e.period_min),2) AS max_period_min
        FROM satellites s JOIN v_latest_elements e ON e.satellite_id = s.satellite_id
        GROUP BY s.category ORDER BY avg_period_min
    """)).mappings().all()

    recent_elements = db.execute(text("""
        SELECT s.name, s.norad_id, e.epoch, e.fetched_at
        FROM v_latest_elements e JOIN satellites s ON s.satellite_id = e.satellite_id
        ORDER BY e.epoch DESC LIMIT 8
    """)).mappings().all()

    activity = db.execute(text("""
        (SELECT 'position' AS kind, s.name, p.recorded_at AS at,
                CONCAT('Calculated position stored, alt ', ROUND(p.altitude_km,0), ' km') AS detail
           FROM position_history p JOIN satellites s ON s.satellite_id = p.satellite_id
          ORDER BY p.recorded_at DESC LIMIT 6)
        UNION ALL
        (SELECT 'alert', s.name, a.created_at, a.message
           FROM alerts a JOIN satellites s ON s.satellite_id = a.satellite_id
          ORDER BY a.created_at DESC LIMIT 6)
        ORDER BY at DESC LIMIT 10
    """)).mappings().all()

    return {
        "totals": dict(totals) if totals else {},
        "categories": [dict(r) for r in categories],
        "orbit_classes": [dict(r) for r in orbit_classes],
        "altitude_buckets": [dict(r) for r in altitude_buckets],
        "period_by_category": [dict(r) for r in periods],
        "recent_elements": [dict(r) for r in recent_elements],
        "recent_activity": [dict(r) for r in activity],
    }


def compare_satellites(db: Session, ids: list) -> list:
    rows = db.execute(text("""
        SELECT s.satellite_id, s.name, s.norad_id, s.category, e.inclination_deg, e.eccentricity,
               e.period_min, e.perigee_km, e.apogee_km
        FROM satellites s JOIN v_latest_elements e ON e.satellite_id = s.satellite_id
        WHERE s.satellite_id IN :ids
    """).bindparams(bindparam("ids", expanding=True)), {"ids": ids}).mappings().all()
    return [dict(r) for r in rows]
