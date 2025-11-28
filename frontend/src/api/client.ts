import axios from "axios";
import { getToken } from "../context/AuthContext";
import type { TripWeatherResponse } from "./types";

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
