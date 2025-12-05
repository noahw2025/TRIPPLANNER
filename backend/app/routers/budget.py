"""Budget endpoints."""

from collections import defaultdict
from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import BudgetEnvelope, Expense, Trip
from app.routers.auth import get_current_user
from app.schemas import BudgetEnvelopeCreate, BudgetEnvelopeRead, ExpenseCreate, ExpenseRead, BudgetEnvelopeSummary, BudgetSummaryResponse
from app.services.budgeting import allocate_default_envelopes, ensure_envelopes

router = APIRouter(tags=["budget"])


def _get_trip(db: Session, trip_id: int) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


def _user_role_for_trip(trip: Trip, user_id: int):
    if trip.owner_id == user_id:
        return "owner"
    membership = next((m for m in trip.members if m.user_id == user_id), None)
    return membership.role if membership else None


def _require_view_access(trip: Trip, user_id: int) -> str:
    role = _user_role_for_trip(trip, user_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this trip")
    return role


def _require_edit_access(trip: Trip, user_id: int) -> None:
    role = _require_view_access(trip, user_id)
    if role not in {"owner", "editor"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner or editor can modify budgets/expenses")


class BudgetEnvelopeUpdate(BaseModel):
    category: Optional[str] = None
    planned_amount: Optional[float] = None
    trip_id: Optional[int] = None
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    trip_id: Optional[int] = None
    envelope_id: Optional[int] = None
    event_id: Optional[int] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    spent_at_date: Optional[date] = None


@router.get("/trips/{trip_id}/budget")
def budget_summary(trip_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip(db, trip_id)
    _require_view_access(trip, current_user.id)

    envelopes = db.query(BudgetEnvelope).filter(BudgetEnvelope.trip_id == trip_id).all()
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()

    category_planned: Dict[str, float] = defaultdict(float)
    category_actual: Dict[str, float] = defaultdict(float)

    for env in envelopes:
        category_planned[env.category] += env.planned_amount

    for exp in expenses:
        if exp.envelope:
            category_actual[exp.envelope.category] += exp.amount
        else:
            category_actual["uncategorized"] += exp.amount

    planned_total_all = sum(category_planned.values())
    actual_total_all = sum(category_actual.values())

    # Remaining budget and forward-looking guidance
    remaining_total = max(trip.total_budget - actual_total_all, 0.0)
    days_left = max((trip.end_date - date.today()).days + 1, 1)
    recommended_daily = remaining_total / days_left if days_left > 0 else 0.0

    envelope_summaries: List[BudgetEnvelopeSummary] = []
    for env in envelopes:
        actual = sum(exp.amount for exp in expenses if exp.envelope_id == env.id)
        remaining = max(env.planned_amount - actual, 0.0)
        pct = env.planned_amount and max(0.0, min(100.0, (actual / env.planned_amount) * 100.0)) or 0.0
        envelope_summaries.append(
            BudgetEnvelopeSummary(
                envelope=BudgetEnvelopeRead.model_validate(env),
                actual_spent=actual,
                remaining=remaining,
                percent_used=pct,
            )
        )

    return BudgetSummaryResponse(
        envelopes=envelope_summaries,
        expenses=[ExpenseRead.model_validate(e) for e in expenses],
        categories={
            cat: {"planned_total": category_planned.get(cat, 0.0), "actual_total": category_actual.get(cat, 0.0)}
            for cat in set(category_planned.keys()).union(set(category_actual.keys()))
        },
        totals={"planned_total_all": planned_total_all, "actual_total_all": actual_total_all},
        remaining_total=remaining_total,
        recommended_daily_spend=recommended_daily,
    )


@router.post("/trips/{trip_id}/envelopes", response_model=BudgetEnvelopeRead, status_code=status.HTTP_201_CREATED)
def create_envelope(trip_id: int, payload: BudgetEnvelopeCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip(db, trip_id)
    _require_edit_access(trip, current_user.id)

    if payload.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trip ID mismatch")

    env = BudgetEnvelope(**payload.model_dump())
    db.add(env)
    db.commit()
    db.refresh(env)
    return env


def _get_envelope_or_404(db: Session, envelope_id: int) -> BudgetEnvelope:
    env = db.query(BudgetEnvelope).filter(BudgetEnvelope.id == envelope_id).first()
    if not env:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget envelope not found")
    return env


@router.patch("/envelopes/{envelope_id}", response_model=BudgetEnvelopeRead)
def update_envelope(envelope_id: int, payload: BudgetEnvelopeUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    env = _get_envelope_or_404(db, envelope_id)
    trip = _get_trip(db, env.trip_id)
    _require_edit_access(trip, current_user.id)

    if payload.trip_id and payload.trip_id != env.trip_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot move envelope to another trip")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "trip_id":
            continue
        setattr(env, field, value)

    db.commit()
    db.refresh(env)
    return env


@router.delete("/envelopes/{envelope_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_envelope(envelope_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    env = _get_envelope_or_404(db, envelope_id)
    trip = _get_trip(db, env.trip_id)
    _require_edit_access(trip, current_user.id)

    db.delete(env)
    db.commit()
    return None


@router.post("/trips/{trip_id}/expenses", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(trip_id: int, payload: ExpenseCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip(db, trip_id)
    _require_edit_access(trip, current_user.id)

    if payload.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trip ID mismatch")

    expense = Expense(**payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def _get_expense_or_404(db: Session, expense_id: int) -> Expense:
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return expense


@router.patch("/expenses/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: int, payload: ExpenseUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    expense = _get_expense_or_404(db, expense_id)
    trip = _get_trip(db, expense.trip_id)
    _require_edit_access(trip, current_user.id)

    if payload.trip_id and payload.trip_id != expense.trip_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot move expense to another trip")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "trip_id":
            continue
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    expense = _get_expense_or_404(db, expense_id)
    trip = _get_trip(db, expense.trip_id)
    _require_edit_access(trip, current_user.id)

    db.delete(expense)
    db.commit()
    return None


@router.post("/trips/{trip_id}/budget/recalculate", response_model=List[BudgetEnvelopeRead])
def recalc_envelopes(trip_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip(db, trip_id)
    _require_edit_access(trip, current_user.id)

    ensure_envelopes(trip, db, allocate_default_envelopes(trip))
    db.commit()
    updated = db.query(BudgetEnvelope).filter(BudgetEnvelope.trip_id == trip_id).all()
    return [BudgetEnvelopeRead.model_validate(env) for env in updated]
