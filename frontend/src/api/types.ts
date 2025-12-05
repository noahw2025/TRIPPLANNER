// Shared TypeScript interfaces mirroring backend schemas.

export interface UserRead {
  id: number;
  email: string;
  username: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
}

export interface UserLogin {
  email?: string;
  username?: string;
  password: string;
}

export interface TripRead {
  id: number;
  owner_id: number;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  currency: string;
  party_size: number;
  price_sensitivity: string;
  trip_type: string;
}

export interface TripCreate {
  owner_id?: number;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  total_budget?: number;
  currency?: string;
  party_size?: number;
  price_sensitivity?: string;
  trip_type?: string;
}

export interface TripUpdate {
  name?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  total_budget?: number;
  currency?: string;
  party_size?: number;
  price_sensitivity?: string;
  trip_type?: string;
}

export interface TripMemberRead {
  id: number;
  trip_id: number;
  user_id: number;
  role: string;
}

export interface LocationRead {
  id: number;
  name: string;
  type: string;
  address?: string | null;
}

export interface TripDestinationRead {
  id: number;
  trip_id: number;
  location_id: number;
  sort_order: number;
}

export interface EventRead {
  id: number;
  trip_id: number;
  location_id?: number | null;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  title: string;
  type: string;
  cost?: number | null;
  notes?: string | null;
  category_type?: string | null;
  is_refundable: boolean;
  reservation_link?: string | null;
}

export interface EventCreate {
  trip_id: number;
  location_id?: number | null;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  title: string;
  type: string;
  cost?: number | null;
  notes?: string | null;
  category_type?: string | null;
  is_refundable?: boolean;
  reservation_link?: string | null;
}

export interface EventUpdate extends Partial<EventCreate> {}

export interface BudgetEnvelopeRead {
  id: number;
  trip_id: number;
  category: string;
  planned_amount: number;
  notes?: string | null;
}

export interface BudgetEnvelopeCreate {
  trip_id: number;
  category: string;
  planned_amount: number;
  notes?: string | null;
}

export interface ExpenseRead {
  id: number;
  trip_id: number;
  envelope_id?: number | null;
  event_id?: number | null;
  description: string;
  amount: number;
  currency: string;
  spent_at_date: string;
}

export interface ExpenseCreate {
  trip_id: number;
  envelope_id?: number | null;
  event_id?: number | null;
  description: string;
  amount: number;
  currency?: string;
  spent_at_date: string;
}

export interface WeatherAlertRead {
  id: number;
  trip_id: number;
  date: string;
  severity: string;
  summary: string;
  provider_payload?: unknown;
}

export interface WeatherAlertWithEvents {
  alert: WeatherAlertRead;
  events: EventRead[];
  suggested_alternative: string;
}

export interface WeatherForecastEntry {
  date: string;
  summary: string;
  severity: string;
  raw?: any;
}

export interface TripWeatherDay {
  date: string;
  temp_max: number;
  temp_min: number;
  precip_prob: number;
  summary: string;
  advice: string;
  risk_score: number;
  risk_category: string;
  contributing_factors: string[];
}

export interface TripWeatherResponse {
  city: string;
  start_date: string;
  end_date: string;
  days: TripWeatherDay[];
  alerts: WeatherAlertDetail[];
}

export interface WeatherAlertDetail {
  id: number;
  trip_id: number;
  date: string;
  severity: string;
  summary: string;
  contributing_factors: string[];
  provider_payload?: any;
}

export interface BudgetEnvelopeSummary {
  envelope: BudgetEnvelopeRead;
  actual_spent: number;
  remaining: number;
  percent_used: number;
}

export interface BudgetSummaryResponse {
  envelopes: BudgetEnvelopeSummary[];
  expenses: ExpenseRead[];
  categories: Record<string, { planned_total: number; actual_total: number }>;
  totals: { planned_total_all: number; actual_total_all: number };
  remaining_total: number;
  recommended_daily_spend: number;
}
