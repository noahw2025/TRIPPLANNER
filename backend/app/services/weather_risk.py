"""Weather risk scoring, alerting, and schedule impact helpers."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import Event, Trip, WeatherAlert


def _score_day(day: Dict) -> Dict:
    """Compute a risk score (0-100) and contributing factors for a forecast day."""
    score = 0
    factors: List[str] = []

    precip_prob = day.get("precip_prob", 0) or 0
    precip_sum = day.get("precip_sum", 0) or 0
    wind_gust = day.get("wind_gust", 0) or 0
    wind_speed = day.get("wind_speed", 0) or 0
    heat = day.get("apparent_max", day.get("temp_max", 0)) or 0
    chill = day.get("apparent_min", day.get("temp_min", 0)) or 0

    if precip_prob >= 70:
        score += 25
        factors.append("Heavy rain likely")
    elif precip_prob >= 40:
        score += 15
        factors.append("Chance of showers")

    if precip_sum >= 10:
        score += 15
        factors.append("Significant precipitation")
    elif precip_sum >= 5:
        score += 8
        factors.append("Moderate precipitation")

    if wind_gust >= 50 or wind_speed >= 45:
        score += 25
        factors.append("Severe wind gusts")
    elif wind_gust >= 35 or wind_speed >= 30:
        score += 15
        factors.append("Strong wind")
    elif wind_gust >= 25:
        score += 8
        factors.append("Breezy conditions")

    if heat >= 38:  # ~100F
        score += 20
        factors.append("Extreme heat")
    elif heat >= 32:
        score += 12
        factors.append("Hot temperatures")

    if chill <= -5:
        score += 20
        factors.append("Extreme cold")
    elif chill <= 3:
        score += 10
        factors.append("Cold temperatures")

    # Cap and categorize
    score = min(100, score)
    category = "low"
    if score >= 60:
        category = "high"
    elif score >= 30:
        category = "moderate"

    return {
        "risk_score": int(score),
        "risk_category": category,
        "contributing_factors": factors,
    }


def annotate_weather_with_risk(days: List[Dict]) -> List[Dict]:
    """Add risk metadata to daily forecast dictionaries."""
    enriched = []
    for day in days:
        scored = _score_day(day)
        enriched.append({**day, **scored})
    return enriched


def upsert_weather_alerts(trip: Trip, days: List[Dict], db: Session, risk_threshold: int = 60) -> List[WeatherAlert]:
    """Persist alerts for days above the threshold or with severe factors."""
    alerts: List[WeatherAlert] = []
    for day in days:
        risk_score = day.get("risk_score", 0)
        if risk_score < risk_threshold:
            continue
        summary = f"High risk: {day.get('summary', 'Unsafe conditions')}"
        payload = {
            "risk_score": risk_score,
            "risk_category": day.get("risk_category"),
            "factors": day.get("contributing_factors", []),
        }
        alert = (
            db.query(WeatherAlert)
            .filter(WeatherAlert.trip_id == trip.id, WeatherAlert.date == day["date"])
            .first()
        )
        if not alert:
            alert = WeatherAlert(
                trip_id=trip.id,
                date=day["date"],
                severity="high" if risk_score >= 75 else "medium",
                summary=summary,
                provider_payload=payload,
            )
            db.add(alert)
        else:
            alert.severity = "high" if risk_score >= 75 else "medium"
            alert.summary = summary
            alert.provider_payload = payload
        alerts.append(alert)
    db.commit()
    return alerts


def evaluate_schedule_impacts(
    trip: Trip, events: List[Event], daily_weather: List[Dict], db: Session
) -> List[Dict]:
    """Flag events impacted by weather and suggest alternatives."""
    impacts: List[Dict] = []
    weather_map = {day["date"]: day for day in daily_weather}
    for event in events:
        w = weather_map.get(event.date)
        if not w:
            continue
        risk = w.get("risk_score", 0)
        if risk < 60:
            continue

        category = (event.category_type or "other").lower()
        risky = category in {"outdoor", "water", "hiking"} or ("activity" in (event.type or "").lower())
        if not risky:
            continue

        reason = f"High risk ({w.get('risk_category')}) on {event.date}"
        factors = w.get("contributing_factors", [])
        suggestion: Optional[date] = None
        for delta in range(1, 3):
            for sign in (-1, 1):
                candidate = event.date + timedelta(days=delta * sign)
                alt = weather_map.get(candidate)
                if alt and alt.get("risk_score", 0) < 30 and trip.start_date <= candidate <= trip.end_date:
                    suggestion = candidate
                    break
            if suggestion:
                break

        alert = (
            db.query(WeatherAlert)
            .filter(WeatherAlert.trip_id == trip.id, WeatherAlert.date == event.date, WeatherAlert.summary.ilike(f"%{event.title}%"))
            .first()
        )
        payload = {
            "risk_score": risk,
            "factors": factors,
            "event_id": event.id,
            "suggested_date": suggestion.isoformat() if suggestion else None,
            "category": category,
        }
        if not alert:
            alert = WeatherAlert(
                trip_id=trip.id,
                date=event.date,
                severity="high",
                summary=f"Event impacted: {event.title}",
                provider_payload=payload,
            )
            db.add(alert)
        else:
            alert.provider_payload = payload
            alert.severity = "high"
            alert.summary = f"Event impacted: {event.title}"
        impacts.append(
            {
                "event": event,
                "reason": reason,
                "factors": factors,
                "suggested_date": suggestion,
                "risk_score": risk,
            }
        )
    db.commit()
    return impacts
