import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import type { TripCreate, TripRead, BudgetSummaryResponse } from '../api/types'
import TripCard from '../components/TripCard'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import SectionHeader from '../components/ui/SectionHeader'

export default function TripsListPage() {
  const [trips, setTrips] = useState<TripRead[]>([])
  const [form, setForm] = useState<TripCreate>({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    total_budget: 0,
    currency: 'USD',
    party_size: 1,
    price_sensitivity: 'balanced',
    trip_type: 'balanced',
  })
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [loading, setLoading] = useState(false)
  const [budgetSummaries, setBudgetSummaries] = useState<Record<number, { planned: number; actual: number }>>({})

  const loadTrips = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<TripRead[]>('/trips')
      const list = data.slice().sort((a, b) => b.id - a.id)
      setTrips(list)
      // Fetch budget summaries in the background so cards can show planned totals.
      const results = await Promise.allSettled(
        list.map((t) => api.get<BudgetSummaryResponse>(`/trips/${t.id}/budget`).catch((e) => e))
      )
      const summaryMap: Record<number, { planned: number; actual: number }> = {}
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          const data = res.value.data
          summaryMap[list[idx].id] = {
            planned: data.totals?.planned_total_all ?? 0,
            actual: data.totals?.actual_total_all ?? 0,
          }
        }
      })
      setBudgetSummaries(summaryMap)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout()
        navigate('/login')
      } else {
        setError('Could not load trips right now. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrips()
  }, [])

  const createTrip = async () => {
    setError(null)
    setSaving(true)
    try {
      await api.post('/trips', form)
      await loadTrips()
      setForm({ name: '', destination: '', start_date: '', end_date: '' })
    } catch (err) {
      setError('Could not create trip')
    } finally {
      setSaving(false)
    }
  }

  const filteredTrips = trips.filter((t) => {
    const end = new Date(t.end_date)
    const now = new Date()
    if (filter === 'upcoming') return end >= now
    if (filter === 'past') return end < now
    return true
  })

  const useTemplate = () => {
    const today = new Date()
    const nextFriday = new Date(today)
    nextFriday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7))
    const nextSunday = new Date(nextFriday)
    nextSunday.setDate(nextFriday.getDate() + 2)

    setForm({
      name: 'Weekend in Chicago',
      destination: 'Chicago',
      start_date: nextFriday.toISOString().slice(0, 10),
      end_date: nextSunday.toISOString().slice(0, 10),
      total_budget: 900,
      currency: 'USD',
      party_size: 2,
      price_sensitivity: 'balanced',
      trip_type: 'foodie',
    })
  }

  return (
    <div className="page page-padded">
      <div className="hero hero-split">
        <div>
          <p className="pill">TripIt</p>
          <h1>Plan your next trip</h1>
          <p className="muted">
            Create trips, build daily itineraries, track your budget, and watch for weather alerts.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button onClick={createTrip} disabled={saving || !form.name || !form.destination || !form.start_date || !form.end_date}>
              {saving ? 'Saving...' : 'Create trip'}
            </Button>
            <Button variant="ghost" onClick={useTemplate}>Use sample template</Button>
          </div>
        </div>
        <Card className="glass-card">
          <SectionHeader title="Create a trip" subtitle="Destination, dates, budget, and style." />
          <div className="form-grid">
            <label>
              Name
              <input required placeholder="e.g., Summer in Paris" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Destination
              <input
                required
                placeholder="City or region"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
              />
            </label>
            <label>
              Start date
              <input
                required
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </label>
            <label>
              End date
              <input required type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </label>
            <label>
              Total budget
              <input type="number" min={0} value={form.total_budget} onChange={(e) => setForm({ ...form, total_budget: Number(e.target.value) })} />
            </label>
            <label>
              Currency
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Party size
              <input type="number" min={1} value={form.party_size} onChange={(e) => setForm({ ...form, party_size: Number(e.target.value) })} />
            </label>
            <label>
              Price sensitivity
              <select value={form.price_sensitivity} onChange={(e) => setForm({ ...form, price_sensitivity: e.target.value })}>
                <option value="frugal">Frugal</option>
                <option value="balanced">Balanced</option>
                <option value="treat_yourself">Treat yourself</option>
              </select>
            </label>
            <label>
              Trip type
              <select value={form.trip_type} onChange={(e) => setForm({ ...form, trip_type: e.target.value })}>
                <option value="balanced">Balanced</option>
                <option value="foodie">Foodie</option>
                <option value="adventurous">Adventurous</option>
                <option value="hiking">Hiking</option>
                <option value="chill">Chill/Relaxing</option>
                <option value="cultural">Cultural</option>
              </select>
            </label>
          </div>
          {error && <p className="error">{error}</p>}
        </Card>
      </div>

      <SectionHeader title="Your Trips" subtitle="Browse your itineraries and jump back in." />
      <div className="tabs">
        {(['all', 'upcoming', 'past'] as const).map((tab) => (
          <div key={tab} className={`tab ${filter === tab ? 'active' : ''}`} onClick={() => setFilter(tab)}>
            {tab === 'all' ? 'All' : tab === 'upcoming' ? 'Upcoming' : 'Past'}
          </div>
        ))}
      </div>
      {loading && <p className="muted">Loading trips...</p>}
      {error && <p className="error">{error}</p>}
      {filteredTrips.length === 0 && !loading ? (
        <Card>
          <p className="muted">No trips yet. Create one above to get started.</p>
        </Card>
      ) : (
        <div className="trip-grid">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onSelect={() => navigate(`/trips/${trip.id}`)} onDuplicate={async () => {
              await api.post('/trips', {
                name: `${trip.name} (Copy)`,
                destination: trip.destination,
                start_date: trip.start_date,
                end_date: trip.end_date,
                total_budget: trip.total_budget,
                currency: trip.currency,
                party_size: trip.party_size,
                price_sensitivity: trip.price_sensitivity,
                trip_type: trip.trip_type,
              })
              await loadTrips()
            }} onDelete={async () => {
              const confirmDelete = window.confirm(`Delete trip "${trip.name}"? This cannot be undone.`)
              if (!confirmDelete) return
              try {
                await api.delete(`/trips/${trip.id}`)
                await loadTrips()
              } catch (err) {
                setError('Could not delete trip right now.')
              }
            }} plannedBudget={budgetSummaries[trip.id]?.planned} actualBudget={budgetSummaries[trip.id]?.actual} />
          ))}
        </div>
      )}
    </div>
  )
}
