"""Seed script to populate demo data for the Trip Planner app."""

from datetime import date, time, timedelta

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import (
    BudgetEnvelope,
    Event,
    Expense,
    Location,
    Trip,
    TripDestination,
    User,
    WeatherAlert,
)
from app.routers.auth import get_password_hash


def seed_demo(db: Session) -> None:
    # Create demo user
    demo_user = db.query(User).filter(User.email == "demo@example.com").first()
    if not demo_user:
        demo_user = User(
            email="demo@example.com",
            username="demo",
            password_hash=get_password_hash("demo123"),
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    # Create trip
    trip = (
        db.query(Trip)
        .filter(Trip.owner_id == demo_user.id, Trip.name == "Summer Trip to New York")
        .first()
    )
    start = date.today() + timedelta(days=7)
    end = start + timedelta(days=4)
    if not trip:
        trip = Trip(
            owner_id=demo_user.id,
            name="Summer Trip to New York",
            destination="New York City",
            start_date=start,
            end_date=end,
            total_budget=2500.0,
            currency="USD",
            party_size=2,
            price_sensitivity="balanced",
            trip_type="cultural",
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

    # Locations
    loc_data = [
        ("New York City", "city", "NY, USA", 40.7128, -74.0060),
        ("Grand Hotel", "hotel", "123 Main St, NY", 40.756, -73.986),
        ("Joe's Pizza", "restaurant", "7 Carmine St, NY", 40.7309, -74.0020),
        ("Modern Art Museum", "attraction", "11 W 53rd St, NY", 40.7614, -73.9776),
        ("JFK Airport", "airport", "Queens, NY", 40.6413, -73.7781),
    ]
    locations = {}
    for name, ltype, addr, lat, lon in loc_data:
        loc = db.query(Location).filter(Location.name == name).first()
        if not loc:
            loc = Location(name=name, type=ltype, address=addr, latitude=lat, longitude=lon)
            db.add(loc)
            db.commit()
            db.refresh(loc)
        locations[name] = loc

    # Trip destinations
    destinations = [
        ("New York City", 0),
        ("Grand Hotel", 1),
        ("Modern Art Museum", 2),
    ]
    for name, order in destinations:
        loc = locations[name]
        existing = (
            db.query(TripDestination)
            .filter(TripDestination.trip_id == trip.id, TripDestination.location_id == loc.id)
            .first()
        )
        if not existing:
            db.add(TripDestination(trip_id=trip.id, location_id=loc.id, sort_order=order))
    db.commit()

    # Events across days
    def add_event(offset: int, title: str, etype: str, loc_name: str | None = None, start_t: time | None = None, end_t: time | None = None, cost: float | None = None, notes: str | None = None):
        evt_date = start + timedelta(days=offset)
        loc_id = locations[loc_name].id if loc_name else None
        event = Event(
            trip_id=trip.id,
            location_id=loc_id,
            date=evt_date,
            start_time=start_t,
            end_time=end_t,
            title=title,
            type=etype,
            cost=cost,
            notes=notes,
            category_type="outdoor" if etype in {"activity", "flight"} else "indoor",
            reservation_link=None,
            is_refundable=False,
        )
        db.add(event)
        return event

    events = []
    events.append(add_event(0, "Flight to JFK", "flight", "JFK Airport", time(9, 0), time(12, 0)))
    events.append(add_event(0, "Hotel Check-in", "hotel", "Grand Hotel", time(14, 0)))
    events.append(add_event(0, "Welcome Dinner", "meal", "Joe's Pizza", time(19, 0), cost=40.0))
    events.append(add_event(1, "Museum Visit", "activity", "Modern Art Museum", time(10, 0), time(13, 0), cost=25.0))
    events.append(add_event(1, "Lunch", "meal", "Joe's Pizza", time(13, 30), cost=20.0))
    events.append(add_event(2, "City Tour", "activity", "New York City", time(9, 0), time(15, 0), cost=60.0))
    events.append(add_event(3, "Free Day", "activity", "New York City"))
    events.append(add_event(4, "Flight Home", "flight", "JFK Airport", time(16, 0), time(19, 0)))
    db.commit()
    for evt in events:
        db.refresh(evt)

    # Budget envelopes
    envelopes_data = [
        ("lodging", 800.0),
        ("food", 300.0),
        ("transport", 400.0),
        ("activities", 300.0),
    ]
    envelopes = {}
    for category, planned in envelopes_data:
        env = (
            db.query(BudgetEnvelope)
            .filter(BudgetEnvelope.trip_id == trip.id, BudgetEnvelope.category == category)
            .first()
        )
        if not env:
            env = BudgetEnvelope(trip_id=trip.id, category=category, planned_amount=planned)
            db.add(env)
            db.commit()
            db.refresh(env)
        envelopes[category] = env

    # Expenses
    expenses_data = [
        ("Hotel deposit", "lodging", 200.0, events[1]),
        ("Welcome Dinner", "food", 42.5, events[2]),
        ("Museum Tickets", "activities", 50.0, events[3]),
        ("Metro Card", "transport", 33.0, None),
    ]
    for desc, cat, amt, evt in expenses_data:
        env = envelopes.get(cat)
        exists = (
            db.query(Expense)
            .filter(
                Expense.trip_id == trip.id,
                Expense.description == desc,
                Expense.amount == amt,
            )
            .first()
        )
        if exists:
            continue
        db.add(
            Expense(
                trip_id=trip.id,
                envelope_id=env.id if env else None,
                event_id=evt.id if evt else None,
                description=desc,
                amount=amt,
                currency="USD",
                spent_at_date=evt.date if evt else start,
            )
        )
    db.commit()

    # Weather alerts
    existing_alerts = db.query(WeatherAlert).filter(WeatherAlert.trip_id == trip.id).all()
    if not existing_alerts:
        risky_event = events[3]  # Museum Visit
        db.add(
            WeatherAlert(
                trip_id=trip.id,
                date=risky_event.date,
                severity="medium",
                summary="Rain expected during museum visit.",
                provider_payload={"event_ids": [risky_event.id]},
            )
        )
        db.add(
            WeatherAlert(
                trip_id=trip.id,
                date=events[6].date,
                severity="high",
                summary="Severe storm possible.",
                provider_payload={"event_ids": [events[6].id]},
            )
        )
        db.commit()

    print("Seed complete.")
    print("Demo credentials -> email: demo@example.com, password: demo123")
    print(f"Demo trip id: {trip.id}")


if __name__ == "__main__":
    # Running via `python -m app.seed`
    session: Session = SessionLocal()
    try:
        seed_demo(session)
    finally:
        session.close()
