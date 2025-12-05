import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import type { TripRead } from '../api/types'
import Card from '../components/ui/Card'
import SectionHeader from '../components/ui/SectionHeader'
import Button from '../components/ui/Button'

export default function BudgetPage() {
  const [trips, setTrips] = useState<TripRead[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get<TripRead[]>('/trips').then((res) => setTrips(res.data)).catch(() => setTrips([]))
  }, [])

  const totalPlanned = useMemo(() => trips.reduce((sum, t) => sum + (t.total_budget || 0), 0), [trips])

  return (
    <div className="page page-padded">
      <SectionHeader title="Budget" subtitle="High-level budget overview across trips." />
      <Card>
        <div className="stat-grid">
          <div className="stat">
            <div className="label muted">Planned</div>
            <div className="stat-value">${totalPlanned.toFixed(0)}</div>
          </div>
          <div className="stat">
            <div className="label muted">Trips tracked</div>
            <div className="stat-value">{trips.length}</div>
          </div>
          <div className="stat">
            <div className="label muted">Currency</div>
            <div className="stat-value">Mixed</div>
          </div>
        </div>
      </Card>

      <div className="grid two-col">
        {trips.map((trip) => (
          <Card key={trip.id}>
            <div className="card-header-row">
              <div>
                <h3>{trip.name}</h3>
                <div className="muted">{trip.destination}</div>
              </div>
              <span className="chip">{trip.trip_type}</span>
            </div>
            <div className="muted">Budget: {trip.currency} {trip.total_budget.toFixed(0)}</div>
            <Button variant="ghost" onClick={() => navigate(`/trips/${trip.id}?tab=budget`)}>Open budget</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
