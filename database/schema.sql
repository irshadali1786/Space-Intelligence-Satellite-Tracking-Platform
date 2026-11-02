-- ORBITX :: MySQL 8 schema
-- Run: mysql -u root -p < database/schema.sql

DROP DATABASE IF EXISTS orbitx;
CREATE DATABASE orbitx CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE orbitx;

-- 1. users -------------------------------------------------------------
CREATE TABLE users (
  user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL,
  email         VARCHAR(120) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT uq_users_email    UNIQUE (email)
) ENGINE=InnoDB;

-- 2. satellites (static identity, one row per object) -------------------
CREATE TABLE satellites (
  satellite_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  norad_id      INT UNSIGNED NOT NULL,
  name          VARCHAR(120) NOT NULL,
  category      VARCHAR(40)  NOT NULL DEFAULT 'other',
  intl_designator VARCHAR(20) NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_sat_norad UNIQUE (norad_id),
  INDEX idx_sat_name (name),
  INDEX idx_sat_category (category)
) ENGINE=InnoDB;

-- 3. orbital_elements (TLE snapshots; many per satellite over time) -----
CREATE TABLE orbital_elements (
  element_id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  satellite_id  INT UNSIGNED NOT NULL,
  tle_line1     VARCHAR(80)  NOT NULL,
  tle_line2     VARCHAR(80)  NOT NULL,
  epoch         DATETIME     NOT NULL,
  inclination_deg DOUBLE     NOT NULL,
  eccentricity  DOUBLE       NOT NULL,
  mean_motion   DOUBLE       NOT NULL,           -- revolutions/day
  period_min    DOUBLE       NOT NULL,           -- 1440 / mean_motion
  perigee_km    DOUBLE       NULL,
  apogee_km     DOUBLE       NULL,
  fetched_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source        VARCHAR(40)  NOT NULL DEFAULT 'CelesTrak',
  CONSTRAINT fk_oe_sat FOREIGN KEY (satellite_id) REFERENCES satellites(satellite_id) ON DELETE CASCADE,
  CONSTRAINT uq_oe_sat_epoch UNIQUE (satellite_id, epoch),
  INDEX idx_oe_sat_epoch (satellite_id, epoch DESC)
) ENGINE=InnoDB;

-- 4. position_history (CALCULATED by SGP4, not radar observations) ------
CREATE TABLE position_history (
  position_id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  satellite_id  INT UNSIGNED NOT NULL,
  element_id    BIGINT UNSIGNED NOT NULL,
  recorded_at   DATETIME     NOT NULL,
  latitude_deg  DOUBLE       NOT NULL,
  longitude_deg DOUBLE       NOT NULL,
  altitude_km   DOUBLE       NOT NULL,
  velocity_kms  DOUBLE       NOT NULL,
  CONSTRAINT fk_ph_sat FOREIGN KEY (satellite_id) REFERENCES satellites(satellite_id) ON DELETE CASCADE,
  CONSTRAINT fk_ph_el  FOREIGN KEY (element_id)   REFERENCES orbital_elements(element_id),
  CONSTRAINT uq_ph_sat_time UNIQUE (satellite_id, recorded_at),
  INDEX idx_ph_time (recorded_at)
) ENGINE=InnoDB;

-- 5. watchlists (M:N between users and satellites) ----------------------
CREATE TABLE watchlists (
  watchlist_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  satellite_id  INT UNSIGNED NOT NULL,
  note          VARCHAR(255) NULL,
  added_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wl_user FOREIGN KEY (user_id)      REFERENCES users(user_id)           ON DELETE CASCADE,
  CONSTRAINT fk_wl_sat  FOREIGN KEY (satellite_id) REFERENCES satellites(satellite_id) ON DELETE CASCADE,
  CONSTRAINT uq_wl_user_sat UNIQUE (user_id, satellite_id)
) ENGINE=InnoDB;

-- 6. alerts (filled by trigger / proximity job) -------------------------
CREATE TABLE alerts (
  alert_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  satellite_id  INT UNSIGNED NOT NULL,
  other_satellite_id INT UNSIGNED NULL,
  alert_type    ENUM('LOW_ALTITUDE','PROXIMITY','STALE_TLE') NOT NULL,
  message       VARCHAR(255) NOT NULL,
  value         DOUBLE NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_al_sat   FOREIGN KEY (satellite_id)       REFERENCES satellites(satellite_id) ON DELETE CASCADE,
  CONSTRAINT fk_al_other FOREIGN KEY (other_satellite_id) REFERENCES satellites(satellite_id) ON DELETE SET NULL,
  INDEX idx_al_created (created_at)
) ENGINE=InnoDB;

-- Default demo user (no auth in scope of this project)
INSERT INTO users (username, email) VALUES ('demo', 'demo@orbitx.local');

-- VIEW: latest TLE per satellite (joins + nested query) ------------------
CREATE VIEW v_latest_elements AS
SELECT oe.*
FROM orbital_elements oe
JOIN (SELECT satellite_id, MAX(epoch) AS max_epoch
      FROM orbital_elements GROUP BY satellite_id) m
  ON m.satellite_id = oe.satellite_id AND m.max_epoch = oe.epoch;

DELIMITER $$

-- TRIGGER: raise alert when a calculated position is below 200 km --------
CREATE TRIGGER trg_low_altitude
AFTER INSERT ON position_history
FOR EACH ROW
BEGIN
  IF NEW.altitude_km < 200 THEN
    INSERT INTO alerts (satellite_id, alert_type, message, value)
    VALUES (NEW.satellite_id, 'LOW_ALTITUDE',
            CONCAT('Calculated altitude below 200 km at ', NEW.recorded_at), NEW.altitude_km);
  END IF;
END$$

-- STORED PROCEDURE: ingest one TLE + first position inside a transaction -
CREATE PROCEDURE sp_upsert_satellite_tle(
  IN p_norad INT UNSIGNED, IN p_name VARCHAR(120), IN p_category VARCHAR(40),
  IN p_l1 VARCHAR(80), IN p_l2 VARCHAR(80), IN p_epoch DATETIME,
  IN p_inc DOUBLE, IN p_ecc DOUBLE, IN p_mm DOUBLE,
  IN p_perigee DOUBLE, IN p_apogee DOUBLE)
BEGIN
  DECLARE v_sat INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
    INSERT INTO satellites (norad_id, name, category)
    VALUES (p_norad, p_name, p_category)
    ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category);

    SELECT satellite_id INTO v_sat FROM satellites WHERE norad_id = p_norad;

    INSERT IGNORE INTO orbital_elements
      (satellite_id, tle_line1, tle_line2, epoch, inclination_deg, eccentricity,
       mean_motion, period_min, perigee_km, apogee_km)
    VALUES (v_sat, p_l1, p_l2, p_epoch, p_inc, p_ecc, p_mm, 1440.0 / p_mm, p_perigee, p_apogee);
  COMMIT;
END$$

-- STORED PROCEDURE: category statistics (aggregates + GROUP BY) ----------
CREATE PROCEDURE sp_category_stats()
BEGIN
  SELECT s.category,
         COUNT(*)                AS satellites,
         ROUND(AVG(e.period_min),2)  AS avg_period_min,
         ROUND(AVG(e.perigee_km),1)  AS avg_perigee_km,
         ROUND(MAX(e.apogee_km),1)   AS max_apogee_km
  FROM satellites s
  JOIN v_latest_elements e ON e.satellite_id = s.satellite_id
  GROUP BY s.category
  ORDER BY satellites DESC;
END$$

DELIMITER ;
