"""Live weather forecast for a trip."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Trip, WeatherAlert
from app.routers.auth import get_current_user
from app.schemas import TripWeatherDay, TripWeatherResponse, WeatherAlertDetail
from app.services.weather_client import geocode_city, fetch_daily_forecast
from app.services.weather_risk import annotate_weather_with_risk, upsert_weather_alerts, evaluate_schedule_impacts
from app.models import Event

router = APIRouter(tags=["weather"])


def _get_trip(db: Session, trip_id: int) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


def _user_role_for_trip(trip: Trip, user_id: int):
    if trip.owner_id == user_id:
        return "owner"
    membership = next((m for m in trip.members if m.user_id == user_id), None)
    return membership.role if membership else None


def _require_view_access(trip: Trip, user_id: int) -> None:
    role = _user_role_for_trip(trip, user_id)
    if not role:
        raise HTTPException(status_code=403, detail="Not authorized for this trip")


@router.get("/trips/{trip_id}/weather", response_model=TripWeatherResponse)
async def trip_weather(trip_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip(db, trip_id)
    _require_view_access(trip, current_user.id)

    coords = await geocode_city(trip.destination)
    if not coords:
        raise HTTPException(status_code=404, detail="Could not find location for this trip's destination")

    lat, lon = coords
    daily = await fetch_daily_forecast(lat, lon, trip.start_date, trip.end_date)
    enriched = annotate_weather_with_risk(daily)
    alerts = upsert_weather_alerts(trip, enriched, db)
    days = [
        TripWeatherDay(
            date=d["date"],
            temp_max=d["temp_max"],
            temp_min=d["temp_min"],
            precip_prob=d["precip_prob"],
            summary=d.get("summary", ""),
            advice=d.get("advice", ""),
            risk_score=d["risk_score"],
            risk_category=d["risk_category"],
            contributing_factors=d.get("contributing_factors", []),
        )
        for d in enriched
    ]
    alert_models = [
        WeatherAlertDetail(
            id=a.id,
            trip_id=a.trip_id,
            date=a.date,
            severity=a.severity,
            summary=a.summary,
            contributing_factors=(a.provider_payload or {}).get("factors", []),
            provider_payload=a.provider_payload,
        )
        for a in alerts
    ]
    return TripWeatherResponse(
        city=trip.destination,
        start_date=trip.start_date,
        end_date=trip.end_date,
        days=days,
        alerts=alert_models,
    )


@router.get("/trips/{trip_id}/alerts", response_model=list[WeatherAlertDetail])
def trip_alerts(trip_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip(db, trip_id)
    _require_view_access(trip, current_user.id)
    alerts = db.query(WeatherAlert).filter(WeatherAlert.trip_id == trip.id).order_by(WeatherAlert.date).all()
    return [
        WeatherAlertDetail(
            id=a.id,
            trip_id=a.trip_id,
            date=a.date,
            severity=a.severity,
            summary=a.summary,
            contributing_factors=(a.provider_payload or {}).get("factors", []),
            provider_payload=a.provider_payload,
        )
        for a in alerts
    ]


@router.get("/trips/{trip_id}/schedule/alerts")
async def schedule_alerts(trip_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip(db, trip_id)
    _require_view_access(trip, current_user.id)

    coords = await geocode_city(trip.destination)
    if not coords:
        raise HTTPException(status_code=404, detail="Could not find location for this trip's destination")
    lat, lon = coords
    daily = annotate_weather_with_risk(await fetch_daily_forecast(lat, lon, trip.start_date, trip.end_date))
    events = db.query(Event).filter(Event.trip_id == trip.id).all()
    impacts = evaluate_schedule_impacts(trip, events, daily, db)

    def serialize_impact(item):
        ev = item["event"]
        return {
            "event": {
                "id": ev.id,
                "title": ev.title,
                "date": ev.date,
                "category_type": ev.category_type,
                "type": ev.type,
            },
            "reason": item["reason"],
            "factors": item.get("factors", []),
            "suggested_date": item["suggested_date"],
            "risk_score": item["risk_score"],
        }

    return [serialize_impact(i) for i in impacts]
