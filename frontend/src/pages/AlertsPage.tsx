import { useEffect, useState } from 'react'
import api, { fetchTripAlerts } from '../api/client'
import type { TripRead, WeatherAlertDetail } from '../api/types'
import Card from '../components/ui/Card'
import SectionHeader from '../components/ui/SectionHeader'

export default function AlertsPage() {
  const [trips, setTrips] = useState<TripRead[]>([])
  const [alerts, setAlerts] = useState<WeatherAlertDetail[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get<TripRead[]>('/trips')
      setTrips(data)
      const all: WeatherAlertDetail[] = []
      for (const trip of data.slice(0, 5)) {
        try {
          const tripAlerts = await fetchTripAlerts(trip.id)
          all.push(...tripAlerts)
        } catch {
          // ignore
        }
      }
      setAlerts(all)
    }
    load()
  }, [])

  return (
    <div className="page page-padded">
      <SectionHeader title="Alerts" subtitle="Weather and scheduling signals across trips." />
      <div className="grid two-col">
        <Card>
          <h3>Active alerts</h3>
          {alerts.length === 0 && <p className="muted">No alerts yet. Weather risks will appear here.</p>}
          <div className="stack">
            {alerts.map((a) => (
              <div key={a.id} className="alert-row">
                <div>
                  <div className="risk-chip" data-level={a.severity}>{a.severity.toUpperCase()}</div>
                  <strong>{a.summary}</strong>
                  <div className="muted">{a.date}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Trips watched</h3>
          <ul className="list">
            {trips.map((t) => (
              <li key={t.id} className="list-row">
                <div>
                  <strong>{t.name}</strong>
                  <div className="muted">{t.destination}</div>
                </div>
                <div className="chip">{t.trip_type}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
