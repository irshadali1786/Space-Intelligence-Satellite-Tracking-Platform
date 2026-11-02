# ORBITX — Phase 1 Audit

Method: read every file, then ran the backend against a real database (MariaDB 10.11, MySQL-compatible; MySQL 8 itself was not available in the sandbox) with synthetic SGP4-valid **test fixtures** (never used by the app). Live CelesTrak access is blocked in the build sandbox, so live ingest is still untested.

## Verified working (9 automated tests)
Schema, view, trigger, stored procedures load; list/search (name + NORAD); current positions; ground track; GEO altitude sanity; history record is idempotent; analytics; proximity finds an injected close pair; watchlist add/duplicate/delete; 404/422 handling.

## Findings

| # | Area | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | Frontend polling | `setInterval` fetch with no in-flight guard or abort; slow responses overlap and can apply stale data | High | Phase 1 fix |
| 2 | Three.js | Marker/line geometries replaced without `dispose()`, textures and materials never disposed on unmount (GPU memory leak) | High | Phase 1 fix |
| 3 | Proximity | Frontend allows 40 picks, backend default 30 / max 60, placeholder says "first 30", extra ids silently truncated | Medium | Phase 1 fix |
| 4 | Performance | `Satrec` rebuilt from TLE text for every satellite on every request | Medium | Phase 1 fix (cache) |
| 5 | Ingest | No TLE checksum / validity check; bad lines could be stored | Medium | Fixed (`ingest_service.tle_is_valid`) |
| 6 | Ingest | `ON DUPLICATE KEY UPDATE category` lets a later run with different groups silently re-categorise a satellite | Low | Phase 2 (keep first category, add source table) |
| 7 | Auth | No users/auth; one hard-coded demo user owns the watchlist | High | Phase 2 |
| 8 | Alerts | Trigger raises one alert per low-altitude row, so repeated rows duplicate alerts | Medium | Phase 2/6 (dedupe key) |
| 9 | API | No logging, rate limits, readiness check, consistent error shape, sorting | Medium | Phase 2/7 |
| 10 | Data model | No operator/country/object-type/status columns, no ground stations, conjunction or notification tables | Needed | Phase 2 (migrations) |
| 11 | Timestamps | DB stores naive UTC; API returns naive ISO strings (frontend appends Z) | Low | Document; Phase 2 serialise with `Z` |
| 12 | Tests | None existed | High | Added `backend/tests` |

## Conflict to confirm
The first brief asked for Obsidian + Solar Amber and "avoid cyan neon". The new brief asks for navy/black with subtle cyan. Phase 7 will follow the newer brief unless you say to keep amber.
