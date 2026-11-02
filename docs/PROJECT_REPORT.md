# ORBITX — Space Intelligence & Satellite Tracking Platform
**Project report · Advanced Database Management Systems (ADBMS) · B.E. CSE (AI & ML), Chandigarh University**
Submitted by: Irshad Ali (24BAI70610)

## 1. Abstract
ORBITX is a web application that stores public satellite orbital data (TLEs from CelesTrak) in a normalized MySQL 8 database, calculates satellite positions with the SGP4 algorithm, keeps a timestamped position history, and shows everything on an interactive 3D Earth. The project demonstrates relational design, joins, nested queries, aggregates, indexing, transactions, stored procedures, triggers and historical data management in a working system.

## 2. Problem statement
Orbital data changes continuously. A plain file or spreadsheet cannot enforce integrity, answer queries quickly across thousands of objects, or keep history safely. A relational database solves this, and a visual front end makes the data understandable.

## 3. Objectives
1. Design a normalized schema (users, satellites, orbital_elements, position_history, watchlists, alerts).
2. Ingest real TLE data transactionally via a stored procedure.
3. Calculate latitude, longitude, altitude and velocity with SGP4.
4. Store and query historical positions with time filters.
5. Provide analytics, satellite comparison and an experimental proximity estimator.
6. Present results through a REST API and a React + Three.js interface.

## 4. Important scope statement
Positions are **calculated** from TLEs. They are **not** live radar observations. TLE-based accuracy is typically kilometres and degrades as the TLE ages. Proximity output is an **experimental estimate**, not a certified collision prediction. No data is bundled; everything shown comes from CelesTrak ingest or calculation.

## 5. Technology
| Layer | Choice |
|---|---|
| Database | MySQL 8, InnoDB |
| Backend | Python, FastAPI, SQLAlchemy 2, PyMySQL |
| Orbit maths | `sgp4` library, own TEME→geodetic (WGS84) conversion |
| Frontend | React, Vite, Tailwind CSS, Three.js, Plotly.js |
| Data | CelesTrak GP data (TLE format) |

## 6. System design
See `ER_AND_ARCHITECTURE.md` for the ER diagram and architecture. Flow: CelesTrak → `ingest_celestrak.py` → stored procedure `sp_upsert_satellite_tle` → MySQL ← SQLAlchemy services (SGP4) ← FastAPI routes → React UI.

### Database design
- `satellites` holds stable identity (NORAD ID unique).
- `orbital_elements` holds TLE snapshots, one per satellite per epoch (UNIQUE satellite_id+epoch), so history of elements is preserved.
- `position_history` holds calculated positions, each referencing the TLE used (`element_id`).
- `watchlists` resolves the many-to-many between users and satellites.
- `alerts` is filled by trigger `trg_low_altitude` (calculated altitude below 200 km).
- View `v_latest_elements` returns the newest TLE per satellite (nested query + join).
- Normalization: 3NF, no repeating groups, no transitive dependencies.

### Algorithms
1. Parse TLE fixed-width fields to get epoch, inclination, eccentricity, mean motion.
2. Period = 1440 / mean motion. Semi-major axis from n = mean motion in rad/s, a = (μ/n²)^(1/3); perigee = a(1−e) − Re, apogee = a(1+e) − Re.
3. SGP4 gives TEME position and velocity at a time.
4. Rotate by Greenwich Mean Sidereal Time, then iterate WGS84 to get latitude, longitude, altitude.
5. Proximity: propagate selected objects over a window, compute pairwise Euclidean distance in TEME, report the minimum per pair and flag those under the threshold.

## 7. Implementation summary
- **API:** satellites list/search/profile, calculated track, stored history, record history, analytics, compare, proximity, watchlist CRUD (documented at `/docs`).
- **UI pages:** Landing, Overview, Live Tracking, Explorer, Satellite Details, Orbit History, Analytics, Proximity, Watchlist, Settings.
- **3D Earth:** Three.js sphere with textures, warm sun light, atmosphere shader, amber markers in one Points object, orbit path line, click picking.
- **Design:** Obsidian + Solar Amber palette, editorial serif headings, minimal borders.

## 8. ADBMS concepts covered
Relational design, normalization, PK/FK, joins, nested queries, aggregates, indexing, query optimization (EXPLAIN), transactions, stored procedures, triggers, historical data. Queries and viva answers: `ADBMS_CONCEPTS_AND_VIVA.md`.

## 9. Testing
| Test | Result |
|---|---|
| SGP4 position vs published test vector (satellite 00005) | Matches to displayed precision |
| FastAPI app import and OpenAPI route listing | All endpoints registered |
| Frontend production build | Succeeds |
| MySQL schema, SQL queries, CelesTrak ingest, UI in browser | **To be run by the student on their machine; record results and screenshots in section 10** |

## 10. Screenshots (to add after running)
1. Landing page · 2. Overview with globe · 3. Live Tracking with selected satellite · 4. Explorer table · 5. Orbit History charts · 6. Analytics · 7. Proximity table · 8. `/docs` page · 9. `SHOW TABLES` and `EXPLAIN` output in MySQL.

## 11. Limitations
- TLE accuracy and age limit position precision.
- Proximity uses straight-line distance without uncertainty (no covariance).
- One demo user; no authentication.
- Position history is generated on demand or by script, not by a continuous background service.

## 12. Future scope
Authentication, scheduled ingest (cron), table partitioning of `position_history`, ground-station pass predictions, alert notifications.

## 13. Conclusion
ORBITX shows how a well-designed relational database, with constraints, indexes, transactions, procedures and triggers, can power a real analytical and visual application over public orbital data.

## 14. References
CelesTrak (celestrak.org) GP data; Vallado et al., "Revisiting Spacetrack Report #3" (SGP4); MySQL 8 Reference Manual; FastAPI and SQLAlchemy documentation; Three.js and Plotly.js documentation.
