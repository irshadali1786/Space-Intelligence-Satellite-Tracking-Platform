# ORBITX — ADBMS Concepts and Viva Q&A

Expected results depend on the data you ingest; shapes of results are described.

## 1. Relational design
- **Where:** 6 tables: users, satellites, orbital_elements, position_history, watchlists, alerts.
- **Query:** `SHOW TABLES;`
- **Result:** the six tables plus view `v_latest_elements`.
- **Viva:** Each real-world thing (satellite, TLE snapshot, position, user) is its own table, linked by keys.

## 2. Normalization
- **Where:** satellite identity is in `satellites`; the changing TLE values are in `orbital_elements`; positions in `position_history`.
- **Query:** `SELECT s.name, COUNT(*) AS tle_versions FROM satellites s JOIN orbital_elements e USING (satellite_id) GROUP BY s.satellite_id;`
- **Result:** one row per satellite with its number of stored TLEs.
- **Viva:** If name were repeated in every TLE row, renaming a satellite would need many updates (update anomaly). Splitting gives 3NF: every non-key column depends on the key only.

## 3. Primary and foreign keys
- **Where:** `satellite_id` PK in satellites, FK in orbital_elements, position_history, watchlists, alerts.
- **Query:** `SELECT table_name, constraint_name FROM information_schema.table_constraints WHERE table_schema='orbitx' AND constraint_type='FOREIGN KEY';`
- **Result:** the FK constraints (fk_oe_sat, fk_ph_sat, ...).
- **Viva:** PK uniquely identifies a row. FK guarantees a child row cannot point to a missing parent (referential integrity). `ON DELETE CASCADE` removes children with the parent.

## 4. Joins
- **Where:** Explorer list, watchlist, analytics.
- **Query:** `SELECT s.name, e.period_min, e.perigee_km FROM satellites s JOIN v_latest_elements e ON e.satellite_id = s.satellite_id ORDER BY e.period_min LIMIT 5;`
- **Result:** five shortest-period satellites.
- **Viva:** INNER JOIN returns only rows that match in both tables; a satellite without a TLE is excluded.

## 5. Nested queries
- **Where:** view `v_latest_elements` (subquery finds MAX(epoch) per satellite); orbit class in analytics (derived table).
- **Query:** `SELECT name FROM satellites WHERE satellite_id IN (SELECT satellite_id FROM position_history WHERE altitude_km < 400);`
- **Result:** satellites with a stored position below 400 km.
- **Viva:** A subquery runs inside another query; here it supplies the list that the outer query filters on.

## 6. Aggregate functions
- **Where:** dashboard totals, category distribution, period comparison.
- **Query:** `SELECT category, COUNT(*), ROUND(AVG(period_min),1) FROM satellites s JOIN v_latest_elements e USING (satellite_id) GROUP BY category;`
- **Result:** one row per category with count and mean period.
- **Viva:** Aggregates collapse many rows into one value per group; GROUP BY defines the groups.

## 7. Indexing
- **Where:** UNIQUE(norad_id), INDEX(name), INDEX(satellite_id, epoch DESC), INDEX(recorded_at).
- **Query:** `SHOW INDEX FROM orbital_elements;`
- **Result:** listed indexes.
- **Viva:** An index is a sorted structure (B-tree) that lets MySQL find rows without scanning the whole table.

## 8. Query optimization
- **Where:** NORAD lookup and per-satellite history use indexes.
- **Query:** `EXPLAIN SELECT * FROM satellites WHERE norad_id = 25544;` then compare with `... WHERE intl_designator = 'x';`
- **Result:** first uses `type=const` on uq_sat_norad; second shows `type=ALL` (full scan).
- **Viva:** EXPLAIN shows the plan. Aim for `ref/const` instead of `ALL`. Composite index (satellite_id, recorded_at) serves "one satellite in a time range".

## 9. Transactions
- **Where:** `sp_upsert_satellite_tle` (START TRANSACTION, COMMIT, ROLLBACK on error); `record_positions` commits the batch or rolls back.
- **Query:** `START TRANSACTION; INSERT INTO watchlists (user_id, satellite_id) VALUES (1, 1); ROLLBACK; SELECT COUNT(*) FROM watchlists;`
- **Result:** count unchanged after ROLLBACK.
- **Viva:** ACID: a transaction is all-or-nothing. If inserting the TLE fails, the satellite row is not left half-saved.

## 10. Stored procedures
- **Where:** `sp_upsert_satellite_tle`, `sp_category_stats`.
- **Query:** `CALL sp_category_stats();`
- **Result:** category, satellites, avg_period_min, avg_perigee_km, max_apogee_km.
- **Viva:** A procedure is SQL stored in the database; logic lives next to data and runs in one round trip.

## 11. Triggers
- **Where:** `trg_low_altitude` fires after each insert into position_history.
- **Query:** `SELECT * FROM alerts WHERE alert_type='LOW_ALTITUDE' ORDER BY created_at DESC LIMIT 5;`
- **Result:** alerts for any stored position under 200 km (empty if none occurred).
- **Viva:** A trigger runs automatically on INSERT/UPDATE/DELETE, so the rule is enforced regardless of which app writes.

## 12. Historical data management
- **Where:** every TLE is kept (one per epoch); positions are timestamped; UNIQUE(satellite_id, recorded_at) prevents duplicates.
- **Query:** `SELECT recorded_at, altitude_km FROM position_history WHERE satellite_id=1 AND recorded_at BETWEEN '2026-11-01 00:00:00' AND '2026-11-01 06:00:00' ORDER BY recorded_at;`
- **Result:** time series for that window.
- **Viva:** We insert rather than overwrite, so the past can be replayed. Each position stores `element_id` showing which TLE produced it.

---

## Extra viva questions

1. **Why store computed positions at all?** They are cheap to recompute, but storing gives a fast, queryable timeline and demonstrates historical data management and indexing.
2. **Is this live radar?** No. SGP4 predicts position from a TLE. Accuracy degrades as the TLE ages (days).
3. **What is a TLE?** Two-Line Element set: compact orbital parameters (epoch, inclination, eccentricity, mean motion...) published by CelesTrak/NORAD.
4. **What does SGP4 do?** Propagates a TLE to a time, returning position and velocity in the TEME frame; we rotate by sidereal time to get latitude, longitude, altitude.
5. **Why DOUBLE for coordinates?** Avoids rounding loss in orbital values; DECIMAL would also work for display-only fields.
6. **Why a many-to-many `watchlists` table?** A user saves many satellites and a satellite is saved by many users; the junction table with UNIQUE(user_id, satellite_id) resolves it.
7. **Why INSERT IGNORE for history?** Re-running the job should not fail or duplicate rows; the unique key makes it idempotent.
8. **Limit of the proximity feature?** Straight-line distance between TLE-based positions, kilometre-level error, no covariance. Experimental only.
9. **What if CelesTrak is down?** The ingest script skips the failed group; the app keeps using stored TLEs.
10. **Why MySQL InnoDB?** It supports transactions, foreign keys and row-level locking; MyISAM does not.
