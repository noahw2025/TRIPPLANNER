import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import type { TripRead } from '../api/types'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import SectionHeader from '../components/ui/SectionHeader'

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '')

export default function DashboardPage() {
  const [trips, setTrips] = useState<TripRead[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await api.get<TripRead[]>('/trips')
        setTrips(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const upcomingTrips = trips.filter((t) => new Date(t.end_date) >= new Date())
  const nextTrip = useMemo(() => {
    return upcomingTrips.slice().sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0]
  }, [upcomingTrips])

  const stats = [
    { label: 'Total trips', value: trips.length },
    { label: 'Upcoming', value: upcomingTrips.length },
    { label: 'Past', value: trips.length - upcomingTrips.length },
  ]

  return (
    <div className="page page-padded">
      <div className="hero-split">
        <div>
          <p className="pill">TripIt</p>
          <h1>Plan your next trip smarter</h1>
          <p className="muted">Live weather risk, budget clarity, and beautiful itineraries—ready for your next departure.</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button onClick={() => navigate('/create-trip')}>Create a new trip</Button>
            <Button variant="ghost" onClick={() => navigate('/trips')}>Browse trips</Button>
          </div>
        </div>
        <Card className="glass-card">
          <h3>Quick stats</h3>
          <div className="stat-grid">
            {stats.map((s) => (
              <div key={s.label} className="stat">
                <div className="label muted">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid two-col">
        <Card>
          <SectionHeader title="Next trip" subtitle="Nearest upcoming itinerary." />
          {loading && <p className="muted">Loading...</p>}
          {!loading && !nextTrip && <p className="muted">No upcoming trips yet.</p>}
          {nextTrip && (
            <div className="stack">
              <h3>{nextTrip.name}</h3>
              <p className="muted">{nextTrip.destination}</p>
              <p className="muted">{formatDate(nextTrip.start_date)} → {formatDate(nextTrip.end_date)}</p>
              <div className="chip-row">
                <span className="chip">{nextTrip.trip_type}</span>
                <span className="chip muted">{nextTrip.price_sensitivity}</span>
              </div>
              <div className="button-row">
                <Button onClick={() => navigate(`/trips/${nextTrip.id}`)}>Open itinerary</Button>
                <Button variant="ghost" onClick={() => navigate('/trips')}>See all trips</Button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Upcoming alerts" subtitle="Weather & schedule risks" />
          <div className="stack">
            <div className="banner info">
              <strong>No critical alerts.</strong>
              <div className="muted">We’ll surface high-risk weather and scheduling issues here.</div>
            </div>
            <Button variant="ghost" onClick={() => navigate('/alerts')}>View alerts</Button>
          </div>
        </Card>
      </div>

      <div className="grid three-col">
        <Card>
          <SectionHeader title="Budget overview" subtitle="Planned vs actual per trip." />
          {trips.length === 0 ? <p className="muted">Add a trip to start budgeting.</p> : (
            <ul className="list">
              {trips.slice(0, 4).map((t) => (
                <li key={t.id} className="list-row">
                  <div>
                    <strong>{t.name}</strong>
                    <div className="muted">{t.currency} {t.total_budget.toFixed(0)}</div>
                  </div>
                  <Button variant="ghost" onClick={() => navigate(`/trips/${t.id}?tab=budget`)}>Budget</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeader title="Trips summary" subtitle="At a glance." />
          <div className="stat-grid">
            {stats.map((s) => (
              <div key={s.label} className="stat">
                <div className="label muted">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Weather watch" subtitle="Keep an eye on risky days." />
          <div className="banner muted">
            <strong>Connect trips to see weather risk.</strong>
            <div className="muted">Open any trip’s weather tab to fetch the latest forecast.</div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/weather')}>Open weather</Button>
        </Card>
      </div>
    </div>
  )
}
