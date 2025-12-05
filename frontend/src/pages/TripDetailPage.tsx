import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api, { fetchTripWeather, fetchTripAlerts, fetchScheduleAlerts } from '../api/client'
import type {
  BudgetEnvelopeCreate,
  BudgetEnvelopeSummary,
  BudgetSummaryResponse,
  EventCreate,
  EventRead,
  ExpenseCreate,
  LocationRead,
  TripRead,
  TripWeatherResponse,
  WeatherAlertDetail,
} from '../api/types'
import EventList from '../components/EventList'
import { useAuth } from '../context/AuthContext'
import PdfExportButton from '../components/PdfExportButton'
import SectionHeader from '../components/ui/SectionHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

const toF = (c: number) => Math.round((c * 9) / 5 + 32)

export default function TripDetailPage() {
  const { id } = useParams()
  const tripId = Number(id)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { logout } = useAuth()

  const [trip, setTrip] = useState<TripRead | null>(null)
  const [events, setEvents] = useState<EventRead[]>([])
  const [budget, setBudget] = useState<BudgetSummaryResponse | null>(null)
  const [weather, setWeather] = useState<TripWeatherResponse | null>(null)
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlertDetail[]>([])
  const [scheduleAlerts, setScheduleAlerts] = useState<Array<{
    event: { id: number; title: string; date: string; category_type?: string; type: string };
    reason: string;
    factors: string[];
    suggested_date: string | null;
    risk_score: number;
  }>>([])

  const [eventForm, setEventForm] = useState<EventCreate>({
    trip_id: tripId,
    title: '',
    type: 'activity',
    date: '',
    category_type: 'outdoor',
    is_refundable: false,
    reservation_link: '',
  } as EventCreate)
  const [expenseForm, setExpenseForm] = useState<ExpenseCreate>({
    trip_id: tripId,
    description: '',
    amount: 0,
    currency: 'USD',
    spent_at_date: '',
  })
  const [envelopeForm, setEnvelopeForm] = useState<BudgetEnvelopeCreate>({
    trip_id: tripId,
    category: '',
    planned_amount: 0,
    notes: '',
  })
  const [editingEnvelope, setEditingEnvelope] = useState<BudgetEnvelopeSummary | null>(null)
  const [envelopeError, setEnvelopeError] = useState<string | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [eventError, setEventError] = useState<string | null>(null)
  const [eventSaving, setEventSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'destinations' | 'itinerary' | 'budget' | 'weather' | 'alerts' | 'documents' | 'settings'>('overview')
  const [destinations, setDestinations] = useState<{ id: number; sort_order: number; location: LocationRead }[]>([])
  const [destinationForm, setDestinationForm] = useState<{ name: string; type: string; address?: string }>({
    name: '',
    type: 'city',
    address: '',
  })
  const [dayRange, setDayRange] = useState<string[]>([])

  const loadData = async () => {
    setMessage(null)
    try {
      const tripRes = await api.get<TripRead>(`/trips/${tripId}`)
      setTrip(tripRes.data)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout()
        navigate('/login')
      } else {
        setMessage('Unable to load this trip right now. Please retry.')
      }
      return
    }

    const [eventsRes, budgetRes, destRes, alertsRes] = await Promise.allSettled([
      api.get<EventRead[]>(`/trips/${tripId}/events`),
      api.get<BudgetSummaryResponse>(`/trips/${tripId}/budget`),
      api.get(`/trips/${tripId}/destinations`),
      fetchTripAlerts(tripId),
    ])

    if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.data)
    if (budgetRes.status === 'fulfilled') setBudget(budgetRes.value.data)
    if (destRes.status === 'fulfilled') setDestinations(destRes.value.data)
    if (alertsRes.status === 'fulfilled') setWeatherAlerts(alertsRes.value)

    if ([eventsRes, budgetRes, destRes, alertsRes].some((r) => r.status === 'rejected')) {
      setMessage('Some sections failed to load. Please try again.')
    }
  }

  useEffect(() => {
    if (!id) return
    setEventForm((prev) => ({ ...prev, trip_id: tripId }))
    setExpenseForm((prev) => ({ ...prev, trip_id: tripId }))
    setEnvelopeForm((prev) => ({ ...prev, trip_id: tripId }))
    loadData()
  }, [id])

  useEffect(() => {
    if (!trip) return
    if (!eventForm.date) {
      setEventForm((prev) => ({ ...prev, date: trip.start_date }))
    }
    const days: string[] = []
    const start = new Date(trip.start_date)
    const end = new Date(trip.end_date)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d).toISOString().slice(0, 10))
    }
    setDayRange(days)
  }, [trip])

  useEffect(() => {
    const loadWeather = async () => {
      if (!tripId) return
      setWeatherLoading(true)
      setWeatherError(null)
      try {
        const data = await fetchTripWeather(tripId)
        setWeather(data)
        setWeatherAlerts(data.alerts || [])
      } catch {
        setWeatherError('Could not load weather right now.')
      } finally {
        setWeatherLoading(false)
      }
    }
    if (activeTab === 'weather') loadWeather()
  }, [activeTab, tripId])

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const res = await fetchScheduleAlerts(tripId)
        setScheduleAlerts(res)
      } catch {
        setScheduleAlerts([])
      }
    }
    if (activeTab === 'alerts') {
      loadSchedule()
    }
  }, [activeTab, tripId])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['overview', 'destinations', 'itinerary', 'budget', 'weather', 'alerts', 'documents', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab)
    }
  }, [searchParams])

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    }, { replace: true })
  }

  const plannedTotal = useMemo(() => {
    if (budget?.envelopes?.length) return budget.envelopes.reduce((sum, e) => sum + e.envelope.planned_amount, 0)
    return budget?.totals?.planned_total_all ?? 0
  }, [budget])

  const actualTotal = useMemo(() => {
    if (budget?.expenses?.length) return budget.expenses.reduce((sum, e) => sum + e.amount, 0)
    return budget?.totals?.actual_total_all ?? 0
  }, [budget])

  if (!trip) return <div className="page">Loading trip...</div>

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>{trip.name}</h2>
          <p className="muted">
            {trip.destination} · {trip.start_date} → {trip.end_date}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="pill">{trip.trip_type ?? 'Trip'} · {trip.price_sensitivity}</div>
          <div className="pill">Trip #{trip.id}</div>
        </div>
      </header>

      <div className="tabs">
        {(['overview', 'destinations', 'itinerary', 'budget', 'weather', 'alerts', 'documents', 'settings'] as const).map((tab) => (
          <div key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => handleTabChange(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="page">
          <SectionHeader
            title="Overview"
            subtitle="At-a-glance stats for your trip."
            action={<PdfExportButton tripId={trip.id} />}
          />
          <div className="trip-grid">
            <Card>
              <h4>Dates</h4>
              <p>{trip.start_date} → {trip.end_date}</p>
            </Card>
            <Card>
              <h4>Destination</h4>
              <p>{trip.destination}</p>
            </Card>
            <Card>
              <h4>Events</h4>
              <p>{events.length}</p>
            </Card>
            <Card>
              <h4>Budget</h4>
              <p>${actualTotal.toFixed(2)} / ${plannedTotal.toFixed(2)}</p>
            </Card>
            <Card>
              <h4>Trip style</h4>
              <p className="muted">{trip.trip_type} · {trip.price_sensitivity}</p>
              <p className="muted">Party size: {trip.party_size}</p>
              <p className="muted">
                Total budget: {trip.currency}{' '}
                {budget?.totals?.planned_total_all?.toFixed?.(2) ?? trip.total_budget}
              </p>
            </Card>
            {weather?.days?.length ? (
              <Card>
                <h4>Weather snapshot</h4>
                <div className="forecast-row">
                  {weather.days.map((f) => (
                    <div key={f.date} className="forecast-card">
                      <div className="muted">{f.date}</div>
                      <div style={{ color: f.precip_prob >= 70 ? '#f43f5e' : f.precip_prob >= 40 ? '#f59e0b' : '#22c55e' }}>
                        {f.summary}
                      </div>
                      <div className="muted">High {toF(f.temp_max)}°F · Low {toF(f.temp_min)}°F · Rain {f.precip_prob}%</div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          <Card>
            <h4>Quick actions</h4>
            <div className="button-row">
              <PdfExportButton tripId={trip.id} />
              <Button variant="ghost" onClick={() => navigate('/trips')}>Back to trips</Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'destinations' && (
        <div className="page">
          <SectionHeader title="Destinations" subtitle="Places you plan to visit." />
          <Card>
            <div className="form-row">
              <input placeholder="Name" value={destinationForm.name} onChange={(e) => setDestinationForm({ ...destinationForm, name: e.target.value })} />
              <input placeholder="Type (city, hotel, etc.)" value={destinationForm.type} onChange={(e) => setDestinationForm({ ...destinationForm, type: e.target.value })} />
              <input placeholder="Address" value={destinationForm.address} onChange={(e) => setDestinationForm({ ...destinationForm, address: e.target.value })} />
              <Button onClick={async () => {
                if (!destinationForm.name) { setMessage('Destination name required'); return }
                await api.post(`/trips/${tripId}/destinations`, destinationForm)
                setDestinationForm({ name: '', type: 'city', address: '' })
                setMessage(null)
                await loadData()
              }}>
                Add Destination
              </Button>
            </div>
            <ul>
              {destinations.map((dest) => (
                <li key={dest.id} className="list-row">
                  <div>
                    <strong>{dest.location.name}</strong> · {dest.location.type}
                    <div className="muted">{dest.location.address}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                    <Button variant="ghost" onClick={() => api.patch(`/trips/${tripId}/destinations/${dest.id}?direction=up`).then(loadData)}>↑</Button>
                    <Button variant="ghost" onClick={() => api.patch(`/trips/${tripId}/destinations/${dest.id}?direction=down`).then(loadData)}>↓</Button>
                    <Button variant="ghost" onClick={() => api.delete(`/trips/${tripId}/destinations/${dest.id}`).then(loadData)}>Remove</Button>
                  </div>
                </li>
              ))}
              {destinations.length === 0 && <p className="muted">No destinations yet.</p>}
            </ul>
          </Card>
        </div>
      )}

      {activeTab === 'itinerary' && (
        <div className="page">
          <SectionHeader title="Itinerary" subtitle="Day-by-day schedule." />
          <Card>
            <EventList
              events={events}
              days={dayRange}
              onAddForDay={(date) => {
                setEventForm((prev) => ({ ...prev, date }))
              }}
            />
            <div className="form-row" style={{ marginTop: '1rem' }}>
              <input
                placeholder="Title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              />
              <input
                placeholder="Type (flight, hotel, meal, etc.)"
                value={eventForm.type}
                onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
              />
              <input
                type="date"
                min={trip.start_date}
                max={trip.end_date}
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              />
              <select value={eventForm.category_type || 'outdoor'} onChange={(e) => setEventForm({ ...eventForm, category_type: e.target.value })}>
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor</option>
                <option value="water">Water</option>
                <option value="hiking">Hiking</option>
                <option value="other">Other</option>
              </select>
              <input
                placeholder="Reservation link (optional)"
                value={eventForm.reservation_link || ''}
                onChange={(e) => setEventForm({ ...eventForm, reservation_link: e.target.value })}
              />
              <label className="inline">
                <input
                  type="checkbox"
                  checked={!!eventForm.is_refundable}
                  onChange={(e) => setEventForm({ ...eventForm, is_refundable: e.target.checked })}
                />
                Refundable?
              </label>
              <Button
                onClick={async () => {
                  if (!tripId) return
                  setEventError(null)
                  if (!eventForm.title || !eventForm.date) {
                    setEventError('Event title and date are required')
                    return
                  }
                  try {
                    setEventSaving(true)
                    await api.post(`/trips/${tripId}/events`, { ...eventForm, trip_id: tripId })
                    setEventForm({
                      ...eventForm,
                      title: '',
                      date: eventForm.date || trip.start_date,
                      reservation_link: '',
                      is_refundable: false,
                    })
                    setMessage(null)
                    await loadData()
                  } catch (err) {
                    if (axios.isAxiosError(err) && err.response?.status === 401) {
                      logout()
                      navigate('/login')
                    } else {
                      setEventError('Could not add event. Please try again.')
                    }
                  } finally {
                    setEventSaving(false)
                  }
                }}
                disabled={eventSaving}
              >
                {eventSaving ? 'Saving...' : 'Add Event'}
              </Button>
            </div>
            {eventError && <p className="error">{eventError}</p>}
          </Card>
        </div>
      )}

      {activeTab === 'budget' && (
        <div className="page">
          <SectionHeader title="Budget" subtitle="Planned vs actual spending." />
          <div className="budget-summary-bar">
            <div>
              <div className="muted label">Planned</div>
              <strong>${plannedTotal.toFixed(2)}</strong>
            </div>
            <div>
              <div className="muted label">Actual</div>
              <strong>${actualTotal.toFixed(2)}</strong>
            </div>
            <div>
              <div className="muted label">Remaining</div>
              <strong>${budget?.remaining_total?.toFixed(2) ?? 0}</strong>
            </div>
            <div>
              <div className="muted label">Recommended/day</div>
              <strong>${budget?.recommended_daily_spend?.toFixed(2) ?? 0}</strong>
            </div>
            <Button variant="ghost" onClick={async () => {
              await api.post(`/trips/${tripId}/budget/recalculate`)
              await loadData()
            }}>Recalculate envelopes</Button>
          </div>
          <Card>
            <div className="form-row">
              <input
                placeholder="Category"
                value={editingEnvelope ? editingEnvelope.envelope.category : envelopeForm.category}
                onChange={(e) =>
                  editingEnvelope
                    ? setEditingEnvelope({ ...editingEnvelope, envelope: { ...editingEnvelope.envelope, category: e.target.value } })
                    : setEnvelopeForm({ ...envelopeForm, category: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Planned amount"
                value={editingEnvelope ? editingEnvelope.envelope.planned_amount : envelopeForm.planned_amount}
                onChange={(e) =>
                  editingEnvelope
                    ? setEditingEnvelope({ ...editingEnvelope, envelope: { ...editingEnvelope.envelope, planned_amount: Number(e.target.value) } })
                    : setEnvelopeForm({ ...envelopeForm, planned_amount: Number(e.target.value) })
                }
              />
              <input
                placeholder="Notes"
                value={editingEnvelope ? editingEnvelope.envelope.notes || '' : envelopeForm.notes || ''}
                onChange={(e) =>
                  editingEnvelope
                    ? setEditingEnvelope({ ...editingEnvelope, envelope: { ...editingEnvelope.envelope, notes: e.target.value } })
                    : setEnvelopeForm({ ...envelopeForm, notes: e.target.value })
                }
              />
              <Button
                onClick={async () => {
                  if (!tripId) return
                  setEnvelopeError(null)
                  const category = editingEnvelope ? editingEnvelope.envelope.category : envelopeForm.category
                  const planned = editingEnvelope ? editingEnvelope.envelope.planned_amount : envelopeForm.planned_amount
                  if (!category || planned <= 0) {
                    setEnvelopeError('Category and planned amount (> 0) are required')
                    return
                  }
                  try {
                    if (editingEnvelope) {
                      await api.patch(`/envelopes/${editingEnvelope.envelope.id}`, { ...editingEnvelope.envelope, trip_id: tripId })
                      setEditingEnvelope(null)
                    } else {
                      await api.post(`/trips/${tripId}/envelopes`, { ...envelopeForm, trip_id: tripId })
                      setEnvelopeForm({ ...envelopeForm, category: '', planned_amount: 0, notes: '' })
                    }
                    await loadData()
                  } catch {
                    setEnvelopeError('Could not save category. Please try again.')
                  }
                }}
              >
                {editingEnvelope ? 'Update Category' : 'Add Category'}
              </Button>
            </div>
            {envelopeError && <p className="error">{envelopeError}</p>}
            <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
              <table className="budget-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Planned</th>
                    <th>Actual</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {budget?.envelopes?.map((env) => {
                    const actual = env.actual_spent
                    const pct = env.percent_used
                    return (
                      <tr key={env.envelope.id}>
                        <td>{env.envelope.category}</td>
                        <td>${env.envelope.planned_amount.toFixed(2)}</td>
                        <td>
                          ${actual.toFixed(2)}
                          <div className="muted">{pct}% used</div>
                          <div className="progress">
                            <div className="progress-bar" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button variant="ghost" onClick={() => setEditingEnvelope(env)}>Edit</Button>
                            <Button variant="ghost" onClick={async () => {
                              await api.delete(`/envelopes/${env.envelope.id}`)
                              await loadData()
                            }}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="form-row">
              <input
                placeholder="Expense description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
              <input
                type="number"
                placeholder="Amount"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
              />
              <select
                value={expenseForm.envelope_id || ''}
                onChange={(e) => setExpenseForm({ ...expenseForm, envelope_id: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">Uncategorized</option>
                {budget?.envelopes?.map((env) => (
                  <option key={env.envelope.id} value={env.envelope.id}>{env.envelope.category}</option>
                ))}
              </select>
              <input
                type="date"
                value={expenseForm.spent_at_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, spent_at_date: e.target.value })}
              />
              <Button
                onClick={async () => {
                  if (!tripId) return
                  if (!expenseForm.description || !expenseForm.spent_at_date) {
                    setMessage('Expense description and date are required')
                    return
                  }
                  await api.post(`/trips/${tripId}/expenses`, { ...expenseForm, trip_id: tripId })
                  setExpenseForm({ ...expenseForm, description: '', amount: 0, spent_at_date: '' })
                  setMessage(null)
                  await loadData()
                }}
              >
                Add Expense
              </Button>
            </div>
            {message && <p className="muted">{message}</p>}
            <div style={{ marginTop: '1rem' }}>
              <h4>Expenses</h4>
              {budget?.expenses.map((exp) => (
                <div key={exp.id} className="event-day">
                  <div><strong>{exp.description}</strong> — ${exp.amount.toFixed(2)}</div>
                  <div className="muted">{exp.spent_at_date}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                    <Button variant="ghost" onClick={async () => {
                      await api.delete(`/expenses/${exp.id}`)
                      await loadData()
                    }}>Delete</Button>
                  </div>
                </div>
              ))}
              {budget?.expenses.length === 0 && <p className="muted">No expenses yet.</p>}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'weather' && (
        <div className="page">
          <SectionHeader title="Weather" subtitle="Live forecast for your trip dates." />
          {weatherAlerts.length > 0 && (
            <div className="banner warning">
              <strong>Active alerts</strong>
              <ul>
                {weatherAlerts.map((a) => (
                  <li key={a.id}>
                    <span className={`chip ${a.severity}`}>{a.severity.toUpperCase()}</span> {a.summary}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {weatherLoading && <p className="muted">Loading forecast...</p>}
          {weatherError && <p className="error">{weatherError}</p>}
          {weather && weather.days.length > 0 && (
            <div className="forecast-grid">
              {weather.days.map((d) => (
                <div key={d.date} className="forecast-card">
                  <div className="forecast-head">
                    <div>
                      <div className="muted">{d.date}</div>
                      <div className="risk-chip" data-level={d.risk_category}>{d.risk_category.toUpperCase()} · {d.risk_score}</div>
                    </div>
                    <div className="muted">{d.summary}</div>
                  </div>
                  <div className="muted">High {toF(d.temp_max)}°F · Low {toF(d.temp_min)}°F</div>
                  <div className="muted">Chance of rain: {d.precip_prob}%</div>
                  <details>
                    <summary>Why we’re alerting</summary>
                    <ul>
                      {d.contributing_factors.length ? d.contributing_factors.map((f) => <li key={f}>{f}</li>) : <li>No major risks</li>}
                    </ul>
                    <div className="muted">{d.advice}</div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="page">
          <SectionHeader title="Alerts" subtitle="Weather + schedule impacts." />
          <Card>
            <h4>Weather alerts</h4>
            {weatherAlerts.length === 0 && <p className="muted">No weather alerts.</p>}
            {weatherAlerts.map((a) => (
              <div key={a.id} className="alert-row">
                <div>
                  <div className="risk-chip" data-level={a.severity}>{a.severity.toUpperCase()}</div>
                  <strong>{a.summary}</strong>
                  <div className="muted">{a.contributing_factors?.join(', ')}</div>
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <h4>Schedule alerts</h4>
            {scheduleAlerts?.length ? scheduleAlerts.map((s) => (
              <div key={s.event.id} className="alert-row">
                <div>
                  <strong>{s.event.title}</strong> · {s.event.date}
                  <div className="muted">{s.reason}</div>
                  {s.factors?.length ? <div className="muted">{s.factors.join(', ')}</div> : null}
                  {s.suggested_date && (
                    <div className="pill muted">Suggested: {s.suggested_date}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {s.suggested_date && (
                    <Button variant="ghost" onClick={async () => {
                      await api.patch(`/events/${s.event.id}`, { date: s.suggested_date })
                      await loadData()
                      setActiveTab('itinerary')
                    }}>Accept reschedule</Button>
                  )}
                  <Button variant="ghost" onClick={() => setScheduleAlerts((prev) => prev.filter((p) => p.event.id !== s.event.id))}>Dismiss</Button>
                </div>
              </div>
            )) : <p className="muted">No scheduling alerts right now.</p>}
          </Card>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="page">
          <SectionHeader title="Documents" subtitle="Exports and confirmations." />
          <Card>
            <h4>PDF Exports</h4>
            <PdfExportButton tripId={trip.id} />
            <p className="muted">Export the current itinerary as a PDF for offline access.</p>
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="page">
          <SectionHeader title="Trip settings" subtitle="Trip-level preferences." />
          <Card>
            <div className="form-row">
              <label>
                Trip type
                <input value={trip.trip_type} disabled />
              </label>
              <label>
                Price sensitivity
                <input value={trip.price_sensitivity} disabled />
              </label>
              <label>
                Currency
                <input value={trip.currency} disabled />
              </label>
              <label>
                Party size
                <input value={trip.party_size} disabled />
              </label>
            </div>
            <p className="muted">Trip settings are set on creation. Future versions will allow editing.</p>
            <div className="button-row">
              <Button variant="ghost" onClick={async () => {
                const confirmDelete = window.confirm(`Delete trip "${trip.name}"? This cannot be undone.`)
                if (!confirmDelete) return
                try {
                  await api.delete(`/trips/${trip.id}`)
                  navigate('/trips')
                } catch {
                  setMessage('Could not delete trip. Please try again.')
                }
              }}>
                Delete trip
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
