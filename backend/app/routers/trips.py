"""Trip management endpoints."""

from typing import List, Optional
import io

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.db import get_db
from app.models import Trip, TripMember, Event, BudgetEnvelope, Expense, WeatherAlert
from app.routers.auth import get_current_user
from app.schemas import (
    TripCreate,
    TripMemberRead,
    TripRead,
    TripUpdate,
)
from app.services.budgeting import allocate_default_envelopes, ensure_envelopes

router = APIRouter(prefix="/trips", tags=["trips"])


class TripMemberUpsert(BaseModel):
    user_id: int
    role: str


def _get_trip_or_404(db: Session, trip_id: int) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


def _ensure_member_or_owner(trip: Trip, user_id: int) -> None:
    is_owner = trip.owner_id == user_id
    is_member = any(member.user_id == user_id for member in trip.members)
    if not (is_owner or is_member):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this trip")


def _ensure_owner(trip: Trip, user_id: int) -> None:
    if trip.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can perform this action")


@router.get("", response_model=List[TripRead])
def list_trips(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trips = (
        db.query(Trip)
        .outerjoin(TripMember, TripMember.trip_id == Trip.id)
        .filter(or_(Trip.owner_id == current_user.id, TripMember.user_id == current_user.id))
        .distinct()
        .all()
    )
    return trips


@router.post("", response_model=TripRead, status_code=status.HTTP_201_CREATED)
def create_trip(payload: TripCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip_data = payload.model_dump(exclude={"owner_id"})
    trip = Trip(owner_id=current_user.id, **trip_data)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    ensure_envelopes(trip, db, allocate_default_envelopes(trip))
    db.commit()
    return trip


@router.get("/{trip_id}", response_model=TripRead)
def get_trip(trip_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip_or_404(db, trip_id)
    _ensure_member_or_owner(trip, current_user.id)
    return trip


@router.patch("/{trip_id}", response_model=TripRead)
def update_trip(
    trip_id: int,
    payload: TripUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    trip = _get_trip_or_404(db, trip_id)
    _ensure_owner(trip, current_user.id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trip, field, value)

    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip_or_404(db, trip_id)
    _ensure_owner(trip, current_user.id)

    db.delete(trip)
    db.commit()
    return None


@router.get("/{trip_id}/members", response_model=List[TripMemberRead])
def list_trip_members(trip_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip_or_404(db, trip_id)
    _ensure_member_or_owner(trip, current_user.id)
    return trip.members


@router.post("/{trip_id}/members", response_model=TripMemberRead, status_code=status.HTTP_201_CREATED)
def add_or_update_member(
    trip_id: int,
    payload: TripMemberUpsert,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    trip = _get_trip_or_404(db, trip_id)
    _ensure_owner(trip, current_user.id)

    member = (
        db.query(TripMember)
        .filter(TripMember.trip_id == trip_id, TripMember.user_id == payload.user_id)
        .first()
    )
    if member:
        member.role = payload.role
    else:
        member = TripMember(trip_id=trip_id, user_id=payload.user_id, role=payload.role)
        db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{trip_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    trip_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    trip = _get_trip_or_404(db, trip_id)
    _ensure_owner(trip, current_user.id)

    member = (
        db.query(TripMember)
        .filter(TripMember.trip_id == trip_id, TripMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    db.delete(member)
    db.commit()
    return None


@router.get("/{trip_id}/export/pdf")
def export_trip_pdf(trip_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    trip = _get_trip_or_404(db, trip_id)
    _ensure_member_or_owner(trip, current_user.id)

    events = (
        db.query(Event)
        .filter(Event.trip_id == trip_id)
        .order_by(Event.date, Event.start_time)
        .all()
    )
    envelopes = db.query(BudgetEnvelope).filter(BudgetEnvelope.trip_id == trip_id).all()
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()
    alerts = db.query(WeatherAlert).filter(WeatherAlert.trip_id == trip_id).all()

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    margin = 50
    y = height - margin

    def new_page():
        nonlocal y
        p.showPage()
        y = height - margin

    def line_break(amount=16):
        nonlocal y
        y -= amount
        if y < margin:
            new_page()

    p.setFont("Helvetica-Bold", 18)
    p.drawString(margin, y, trip.name)
    line_break(22)

    p.setFont("Helvetica", 11)
    p.drawString(margin, y, f"Destination: {trip.destination}")
    line_break(14)
    p.drawString(margin, y, f"Dates: {trip.start_date} to {trip.end_date}")
    line_break(20)

    # Section: Events grouped by date
    p.setFont("Helvetica-Bold", 14)
    p.drawString(margin, y, "Itinerary")
    line_break(18)
    p.setFont("Helvetica", 11)
    current_date = None
    for evt in events:
        if evt.date != current_date:
            current_date = evt.date
            p.setFont("Helvetica-Bold", 11)
            p.drawString(margin + 5, y, str(current_date))
            line_break(14)
            p.setFont("Helvetica", 11)
        line = f"• {evt.title} ({evt.type})"
        if evt.start_time:
            line += f" @ {evt.start_time}"
        if evt.cost:
            line += f"  · Cost: ${evt.cost:.2f}"
        p.drawString(margin + 12, y, line)
        line_break(12)
        if evt.notes:
            p.setFont("Helvetica-Oblique", 10)
            p.drawString(margin + 18, y, f"Notes: {evt.notes}")
            p.setFont("Helvetica", 11)
            line_break(12)

    line_break(12)

    # Section: Budget
    planned_total_all = sum(env.planned_amount for env in envelopes)
    actual_total_all = sum(exp.amount for exp in expenses)
    p.setFont("Helvetica-Bold", 14)
    p.drawString(margin, y, "Budget")
    line_break(16)
    p.setFont("Helvetica", 11)
    p.drawString(margin + 5, y, f"Planned total: ${planned_total_all:.2f}   Actual total: ${actual_total_all:.2f}")
    line_break(16)
    for env in envelopes:
        actual = sum(exp.amount for exp in expenses if exp.envelope_id == env.id)
        pct = f"{(actual / env.planned_amount * 100):.0f}%" if env.planned_amount else "0%"
        p.drawString(margin + 8, y, f"{env.category.capitalize()}: planned ${env.planned_amount:.2f} / actual ${actual:.2f} ({pct} used)")
        line_break(12)

    line_break(12)

    if alerts:
        p.setFont("Helvetica-Bold", 14)
        p.drawString(margin, y, "Weather Alerts")
        line_break(16)
        p.setFont("Helvetica", 11)
        for alert in alerts:
            p.drawString(margin + 5, y, f"{alert.date} [{alert.severity.upper()}] {alert.summary}")
            line_break(14)

    p.showPage()
    p.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="trip-{trip_id}.pdf"'},
    )
