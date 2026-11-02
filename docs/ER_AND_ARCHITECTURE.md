# ORBITX — ER Diagram & Architecture

## ER diagram (Mermaid — renders on GitHub / VS Code Mermaid preview)

```mermaid
erDiagram
  users ||--o{ watchlists : saves
  satellites ||--o{ watchlists : "is saved in"
  satellites ||--o{ orbital_elements : "has TLE snapshots"
  satellites ||--o{ position_history : "has calculated positions"
  orbital_elements ||--o{ position_history : "used to compute"
  satellites ||--o{ alerts : "raises"

  users { int user_id PK
          varchar username UK
          varchar email UK
          timestamp created_at }
  satellites { int satellite_id PK
               int norad_id UK
               varchar name
               varchar category
               timestamp created_at }
  orbital_elements { bigint element_id PK
               int satellite_id FK
               varchar tle_line1
               varchar tle_line2
               datetime epoch
               double inclination_deg
               double eccentricity
               double mean_motion
               double period_min
               double perigee_km
               double apogee_km }
  position_history { bigint position_id PK
               int satellite_id FK
               bigint element_id FK
               datetime recorded_at
               double latitude_deg
               double longitude_deg
               double altitude_km
               double velocity_kms }
  watchlists { int watchlist_id PK
               int user_id FK
               int satellite_id FK
               varchar note }
  alerts { bigint alert_id PK
           int satellite_id FK
           int other_satellite_id FK
           enum alert_type
           varchar message }
```

**Relationships**
- `users` 1—N `watchlists` N—1 `satellites` → many-to-many resolved by `watchlists`, with `UNIQUE(user_id, satellite_id)`.
- `satellites` 1—N `orbital_elements`: TLEs change every few days, so they are stored separately (3NF — no repeating groups in `satellites`).
- `orbital_elements` 1—N `position_history`: each calculated position records which TLE produced it (traceability).
- `satellites` 1—N `alerts`.

## System architecture

```
CelesTrak (TLE, GP data)
        │  ingest_celestrak.py  (calls sp_upsert_satellite_tle → transaction)
        ▼
   MySQL 8  ◄──── SQLAlchemy ORM ◄──── FastAPI services (SGP4 via `sgp4` lib)
                                              │ REST/JSON
                                              ▼
                       React (Vite) + Tailwind + Three.js + Plotly
```

Positions are **calculated with SGP4 from TLEs**. They are not live radar observations, and the UI labels them that way.
