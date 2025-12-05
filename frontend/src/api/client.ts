import axios from "axios";
import { getToken } from "../context/AuthContext";
import type { TripWeatherResponse, WeatherAlertDetail } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export async function fetchTripWeather(tripId: number): Promise<TripWeatherResponse> {
  const response = await api.get<TripWeatherResponse>(`/trips/${tripId}/weather`);
  return response.data;
}

export async function fetchTripAlerts(tripId: number): Promise<WeatherAlertDetail[]> {
  const response = await api.get<WeatherAlertDetail[]>(`/trips/${tripId}/alerts`);
  return response.data;
}

export async function fetchScheduleAlerts(tripId: number) {
  const response = await api.get(`/trips/${tripId}/schedule/alerts`);
  return response.data as Array<{
    event: { id: number; title: string; date: string; category_type?: string; type: string };
    reason: string;
    factors: string[];
    suggested_date: string | null;
    risk_score: number;
  }>;
}
