import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import type { TripRead } from '../api/types'
import Card from '../components/ui/Card'
import SectionHeader from '../components/ui/SectionHeader'
import Button from '../components/ui/Button'

export default function WeatherPage() {
  const [trips, setTrips] = useState<TripRead[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get<TripRead[]>('/trips').then((res) => setTrips(res.data)).catch(() => setTrips([]))
  }, [])

  return (
    <div className="page page-padded">
      <SectionHeader title="Weather overview" subtitle="Open any trip to see detailed forecast and risk." />
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
            <p className="muted">{trip.start_date} → {trip.end_date}</p>
            <Button variant="ghost" onClick={() => navigate(`/trips/${trip.id}?tab=weather`)}>Open weather</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
