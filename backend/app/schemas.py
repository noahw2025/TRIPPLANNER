"""Pydantic schemas for request/response models."""

from datetime import date, time
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str


class UserCreate(BaseModel):
    email: str
    username: str
    password: str


class UserLogin(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str


class UserRead(BaseModel):
    id: int
    email: str
    username: str

    model_config = ConfigDict(from_attributes=True)


class TripCreate(BaseModel):
    owner_id: Optional[int] = None
    name: str
    destination: str
    start_date: date
    end_date: date
    total_budget: float = 0.0
    currency: str = "USD"
    party_size: int = 1
    price_sensitivity: str = "balanced"
    trip_type: str = "balanced"


class TripUpdate(BaseModel):
    name: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_budget: Optional[float] = None
    currency: Optional[str] = None
    party_size: Optional[int] = None
    price_sensitivity: Optional[str] = None
    trip_type: Optional[str] = None


class TripRead(BaseModel):
    id: int
    owner_id: int
    name: str
    destination: str
    start_date: date
    end_date: date
    total_budget: float
    currency: str
    party_size: int
    price_sensitivity: str
    trip_type: str

    model_config = ConfigDict(from_attributes=True)


class TripMemberRead(BaseModel):
    id: int
    trip_id: int
    user_id: int
    role: str

    model_config = ConfigDict(from_attributes=True)


class LocationCreate(BaseModel):
    name: str
    type: str
    address: Optional[str] = None


class LocationRead(BaseModel):
    id: int
    name: str
    type: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class TripDestinationCreate(BaseModel):
    trip_id: int
    location_id: int
    sort_order: Optional[int] = 0


class TripDestinationRead(BaseModel):
    id: int
    trip_id: int
    location_id: int
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class EventCreate(BaseModel):
    trip_id: int
    location_id: Optional[int] = None
    date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    title: str
    type: str
    cost: Optional[float] = None
    notes: Optional[str] = None
    category_type: Optional[str] = "other"
    is_refundable: Optional[bool] = False
    reservation_link: Optional[str] = None


class EventUpdate(BaseModel):
    location_id: Optional[int] = None
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    title: Optional[str] = None
    type: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    category_type: Optional[str] = None
    is_refundable: Optional[bool] = None
    reservation_link: Optional[str] = None


class EventRead(BaseModel):
    id: int
    trip_id: int
    location_id: Optional[int] = None
    date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    title: str
    type: str
    cost: Optional[float] = None
    notes: Optional[str] = None
    category_type: Optional[str] = None
    is_refundable: bool
    reservation_link: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BudgetEnvelopeCreate(BaseModel):
    trip_id: int
    category: str
    planned_amount: float
    notes: Optional[str] = None


class BudgetEnvelopeRead(BaseModel):
    id: int
    trip_id: int
    category: str
    planned_amount: float
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ExpenseCreate(BaseModel):
    trip_id: int
    envelope_id: Optional[int] = None
    event_id: Optional[int] = None
    description: str
    amount: float
    currency: str = "USD"
    spent_at_date: date


class ExpenseRead(BaseModel):
    id: int
    trip_id: int
    envelope_id: Optional[int] = None
    event_id: Optional[int] = None
    description: str
    amount: float
    currency: str
    spent_at_date: date

    model_config = ConfigDict(from_attributes=True)


class WeatherAlertRead(BaseModel):
    id: int
    trip_id: int
    date: date
    severity: str
    summary: str
    provider_payload: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)


class TripWeatherDay(BaseModel):
    date: date
    temp_max: float
    temp_min: float
    precip_prob: int
    summary: str
    advice: str
    risk_score: int
    risk_category: str
    contributing_factors: list[str]

    class Config:
        orm_mode = False


class WeatherAlertDetail(BaseModel):
    id: int
    trip_id: int
    date: date
    severity: str
    summary: str
    contributing_factors: list[str] = []
    provider_payload: Optional[Any] = None


class TripWeatherResponse(BaseModel):
    city: str
    start_date: date
    end_date: date
    days: list[TripWeatherDay]
    alerts: list[WeatherAlertDetail] = []


class BudgetEnvelopeSummary(BaseModel):
    envelope: BudgetEnvelopeRead
    actual_spent: float
    remaining: float
    percent_used: float


class BudgetSummaryResponse(BaseModel):
    envelopes: list[BudgetEnvelopeSummary]
    expenses: list[ExpenseRead]
    totals: dict
    remaining_total: float
    recommended_daily_spend: float
    categories: dict
