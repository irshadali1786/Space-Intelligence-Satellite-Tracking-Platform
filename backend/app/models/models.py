"""ORM models mirroring database/schema.sql."""
from sqlalchemy import (BigInteger, Column, DateTime, Double, Enum, ForeignKey,
                        Integer, String, TIMESTAMP, UniqueConstraint, func)
from sqlalchemy.dialects.mysql import INTEGER, BIGINT
from sqlalchemy.orm import relationship

from ..database import Base

UInt = INTEGER(unsigned=True)
UBigInt = BIGINT(unsigned=True)


class User(Base):
    __tablename__ = "users"
    user_id = Column(UInt, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(120), nullable=False, unique=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    watchlist = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")


class Satellite(Base):
    __tablename__ = "satellites"
    satellite_id = Column(UInt, primary_key=True, autoincrement=True)
    norad_id = Column(UInt, nullable=False, unique=True)
    name = Column(String(120), nullable=False, index=True)
    category = Column(String(40), nullable=False, default="other", index=True)
    intl_designator = Column(String(20))
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    elements = relationship("OrbitalElement", back_populates="satellite", cascade="all, delete-orphan")


class OrbitalElement(Base):
    __tablename__ = "orbital_elements"
    element_id = Column(UBigInt, primary_key=True, autoincrement=True)
    satellite_id = Column(UInt, ForeignKey("satellites.satellite_id", ondelete="CASCADE"), nullable=False)
    tle_line1 = Column(String(80), nullable=False)
    tle_line2 = Column(String(80), nullable=False)
    epoch = Column(DateTime, nullable=False)
    inclination_deg = Column(Double, nullable=False)
    eccentricity = Column(Double, nullable=False)
    mean_motion = Column(Double, nullable=False)
    period_min = Column(Double, nullable=False)
    perigee_km = Column(Double)
    apogee_km = Column(Double)
    fetched_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    source = Column(String(40), nullable=False, default="CelesTrak")
    satellite = relationship("Satellite", back_populates="elements")
    __table_args__ = (UniqueConstraint("satellite_id", "epoch", name="uq_oe_sat_epoch"),)


class PositionHistory(Base):
    """Positions CALCULATED with SGP4 (not radar observations)."""
    __tablename__ = "position_history"
    position_id = Column(UBigInt, primary_key=True, autoincrement=True)
    satellite_id = Column(UInt, ForeignKey("satellites.satellite_id", ondelete="CASCADE"), nullable=False)
    element_id = Column(UBigInt, ForeignKey("orbital_elements.element_id"), nullable=False)
    recorded_at = Column(DateTime, nullable=False, index=True)
    latitude_deg = Column(Double, nullable=False)
    longitude_deg = Column(Double, nullable=False)
    altitude_km = Column(Double, nullable=False)
    velocity_kms = Column(Double, nullable=False)
    __table_args__ = (UniqueConstraint("satellite_id", "recorded_at", name="uq_ph_sat_time"),)


class Watchlist(Base):
    __tablename__ = "watchlists"
    watchlist_id = Column(UInt, primary_key=True, autoincrement=True)
    user_id = Column(UInt, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    satellite_id = Column(UInt, ForeignKey("satellites.satellite_id", ondelete="CASCADE"), nullable=False)
    note = Column(String(255))
    added_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    user = relationship("User", back_populates="watchlist")
    satellite = relationship("Satellite")
    __table_args__ = (UniqueConstraint("user_id", "satellite_id", name="uq_wl_user_sat"),)


class Alert(Base):
    __tablename__ = "alerts"
    alert_id = Column(UBigInt, primary_key=True, autoincrement=True)
    satellite_id = Column(UInt, ForeignKey("satellites.satellite_id", ondelete="CASCADE"), nullable=False)
    other_satellite_id = Column(UInt, ForeignKey("satellites.satellite_id", ondelete="SET NULL"))
    alert_type = Column(Enum("LOW_ALTITUDE", "PROXIMITY", "STALE_TLE"), nullable=False)
    message = Column(String(255), nullable=False)
    value = Column(Double)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp(), index=True)
