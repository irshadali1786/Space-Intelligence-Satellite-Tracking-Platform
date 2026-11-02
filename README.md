# ORBITX — Space Intelligence & Satellite Tracking Platform

ADBMS capstone: React + Three.js + Plotly frontend, FastAPI + SQLAlchemy backend, **MySQL 8** database, CelesTrak TLE data propagated with **SGP4**.

> Satellite positions are **calculated** from public TLEs. They are not live radar observations. Proximity results are **experimental estimates**, not collision predictions.

## Folder structure

```
orbitx/
  database/schema.sql            tables, view, trigger, stored procedures
  docs/                          ER diagram, ADBMS concepts, viva Q&A
  backend/
    app/main.py                  FastAPI app
    app/config.py, database.py   env settings, engine, session
    app/models/                  ORM models
    app/schemas/                 Pydantic models
    app/services/                orbit_service (SGP4), satellite, history, analytics, proximity, watchlist
    app/routes/                  REST endpoints
    scripts/ingest_celestrak.py  real TLE ingest (calls stored procedure)
    scripts/record_positions.py  calculate + store position history
  frontend/src/
    components/                  Globe (Three.js), Sidebar, charts, search, info panel
    pages/                       Landing, Dashboard, LiveTracking, Explorer, SatelliteDetails,
                                 OrbitHistory, Analytics, Proximity, Watchlist, Settings
```

## Setup (needs MySQL 8, Python 3.10+, Node 18+)

```bash
# 1. Database
mysql -u root -p < database/schema.sql

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # put your MySQL password in .env
python -m scripts.ingest_celestrak                     # downloads real TLEs from CelesTrak
python -m scripts.record_positions --hours 6 --step 5  # stores calculated history
uvicorn app.main:app --reload                          # API docs: http://localhost:8000/docs

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                                            # http://localhost:5173
```

The browser needs internet for Earth textures (unpkg) and fonts (Google Fonts). Ingest needs internet for CelesTrak. No data is bundled, so nothing fake is shown as live.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | /satellites?category=&limit=&offset= | paged list with latest orbital elements |
| GET | /satellites/search?q= | name fragment or NORAD ID |
| GET | /satellites/categories | category counts |
| GET | /satellites/positions/now | current calculated positions (globe) |
| GET | /satellites/{id} | profile |
| GET | /satellites/{id}/positions?minutes=&step_seconds= | calculated track |
| GET | /satellites/{id}/history?start=&end= | stored history, time filter |
| POST | /satellites/{id}/history/record | calculate + store last N hours |
| GET | /analytics, /analytics/compare?ids=1,2 | aggregates, comparison |
| GET | /proximity?ids=&threshold_km=&window_minutes= | experimental close approaches |
| GET/POST | /watchlist | list / add `{satellite_id, note}` |
| DELETE | /watchlist/{id} | remove |

Interactive docs: `/docs`. There is no login, so one demo user (`DEFAULT_USER_ID=1`) owns the watchlist.

## Honest status

- Python SGP4 maths verified against the standard test vector. Frontend `vite build` passes.
- **Not yet run end to end**: the MySQL schema, SQL queries and the live CelesTrak ingest could not be executed in the build sandbox (no MySQL, network restricted). Run the steps above and report any error text; fixes will be quick.

## Testing (backend)

Needs a real MySQL/MariaDB server. One-time setup:

```sql
CREATE USER 'orbitx_app'@'%' IDENTIFIED BY 'testpw';
GRANT ALL ON orbitx_test.* TO 'orbitx_app'@'%';
```
```bash
cd backend && pip install -r requirements-dev.txt
python -m pytest -q tests          # drops/recreates database orbitx_test each run
```
Tests load **synthetic SGP4 fixtures** named `TEST-*` (see `tests/fixtures.py`). They exist only in the test database; the app itself never creates fake data.
