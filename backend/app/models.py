"""SQLAlchemy models for the trip planner domain."""

from sqlalchemy import Column, Date, Float, ForeignKey, Integer, JSON, String, Text, Time
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import Boolean

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)

    trips_owned = relationship("Trip", back_populates="owner", cascade="all, delete-orphan")
    memberships = relationship("TripMember", back_populates="user", cascade="all, delete-orphan")


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_budget = Column(Float, nullable=False, default=0.0)
    currency = Column(String, nullable=False, default="USD")
    party_size = Column(Integer, nullable=False, default=1)
    price_sensitivity = Column(String, nullable=False, default="balanced")
    trip_type = Column(String, nullable=False, default="balanced")

    owner = relationship("User", back_populates="trips_owned")
    members = relationship("TripMember", back_populates="trip", cascade="all, delete-orphan")
    destinations = relationship("TripDestination", back_populates="trip", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="trip", cascade="all, delete-orphan")
    budget_envelopes = relationship("BudgetEnvelope", back_populates="trip", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan")
    weather_alerts = relationship("WeatherAlert", back_populates="trip", cascade="all, delete-orphan")


class TripMember(Base):
    __tablename__ = "trip_members"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=False)

    trip = relationship("Trip", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    destinations = relationship("TripDestination", back_populates="location", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="location")


class TripDestination(Base):
    __tablename__ = "trip_destinations"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    sort_order = Column(Integer, nullable=False, default=0)

    trip = relationship("Trip", back_populates="destinations")
    location = relationship("Location", back_populates="destinations")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True, index=True)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)
    cost = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    category_type = Column(String, nullable=False, default="other")
    is_refundable = Column(Boolean, nullable=False, default=False)
    reservation_link = Column(String, nullable=True)

    trip = relationship("Trip", back_populates="events")
    location = relationship("Location", back_populates="events")
    expenses = relationship("Expense", back_populates="event", cascade="all, delete-orphan")


class BudgetEnvelope(Base):
    __tablename__ = "budget_envelopes"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    category = Column(String, nullable=False)
    planned_amount = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)

    trip = relationship("Trip", back_populates="budget_envelopes")
    expenses = relationship("Expense", back_populates="envelope")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    envelope_id = Column(Integer, ForeignKey("budget_envelopes.id"), nullable=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True, index=True)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False, default="USD")
    spent_at_date = Column(Date, nullable=False)

    trip = relationship("Trip", back_populates="expenses")
    envelope = relationship("BudgetEnvelope", back_populates="expenses")
    event = relationship("Event", back_populates="expenses")


class WeatherAlert(Base):
    __tablename__ = "weather_alerts"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    severity = Column(String, nullable=False)
    summary = Column(String, nullable=False)
    provider_payload = Column(JSON, nullable=True)

    trip = relationship("Trip", back_populates="weather_alerts")
