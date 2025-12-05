"""Budget allocation helpers for trips."""

from __future__ import annotations

from typing import Dict

from app.models import BudgetEnvelope, Trip


def allocation_ratios(price_sensitivity: str, trip_type: str) -> Dict[str, float]:
    """Return suggested category ratios based on sensitivity and trip type."""
    base = {"food": 0.3, "activities": 0.3, "transport": 0.2, "flex": 0.2}

    sensitivity = (price_sensitivity or "balanced").lower()
    if sensitivity == "frugal":
        base = {"food": 0.25, "activities": 0.25, "transport": 0.25, "flex": 0.25}
    elif sensitivity == "treat_yourself":
        base = {"food": 0.32, "activities": 0.36, "transport": 0.16, "flex": 0.16}

    ttype = (trip_type or "balanced").lower()
    if ttype == "foodie":
        base["food"] += 0.08
        base["activities"] -= 0.04
        base["flex"] -= 0.04
    elif ttype in {"hiking", "adventurous"}:
        base["transport"] += 0.05
        base["activities"] += 0.05
        base["food"] -= 0.05
        base["flex"] -= 0.05
    elif ttype in {"chill", "relaxing"}:
        base["flex"] += 0.05
        base["food"] += 0.03
        base["activities"] -= 0.08

    # Normalize to 1.0
    total = sum(base.values())
    if not total:
        return base
    return {k: v / total for k, v in base.items()}


def allocate_default_envelopes(trip: Trip) -> Dict[str, float]:
    ratios = allocation_ratios(trip.price_sensitivity, trip.trip_type)
    total = trip.total_budget or 0
    return {cat: round(total * pct, 2) for cat, pct in ratios.items()}


def ensure_envelopes(trip: Trip, db, planned: Dict[str, float]) -> None:
    """Create or update key envelopes for a trip."""
    existing = {env.category: env for env in trip.budget_envelopes}
    for category, amount in planned.items():
        env = existing.get(category)
        if not env:
            env = BudgetEnvelope(trip_id=trip.id, category=category, planned_amount=amount)
            db.add(env)
        else:
            env.planned_amount = amount
