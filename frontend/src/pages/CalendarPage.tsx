import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import type { TripRead } from '../api/types'
import Card from '../components/ui/Card'
import SectionHeader from '../components/ui/SectionHeader'

type CalendarCell = {
  date: Date
  inCurrentMonth: boolean
  trips: TripRead[]
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function CalendarPage() {
  const [trips, setTrips] = useState<TripRead[]>([])
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  useEffect(() => {
    api.get<TripRead[]>('/trips').then((res) => setTrips(res.data)).catch(() => setTrips([]))
  }, [])

  const cells: CalendarCell[] = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const startWeekday = first.getDay() // 0=Sun
    const startDate = new Date(first)
    startDate.setDate(first.getDate() - startWeekday)

    const grid: CalendarCell[] = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const day = startOfDay(date)
      const dayTrips = trips.filter((t) => {
        const start = startOfDay(parseISO(t.start_date))
        const end = startOfDay(parseISO(t.end_date))
        return day >= start && day <= end
      })
      grid.push({
        date,
        inCurrentMonth: date.getMonth() === month.getMonth(),
        trips: dayTrips,
      })
    }
    return grid
  }, [month, trips])

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const moveMonth = (delta: number) => {
    const next = new Date(month)
    next.setMonth(month.getMonth() + delta)
    setMonth(next)
  }

  return (
    <div className="page page-padded">
      <SectionHeader title="Calendar" subtitle="Trip ranges overlaid on a monthly grid." />
      <div className="calendar-header">
        <div className="button-row">
          <button className="btn ghost" onClick={() => moveMonth(-1)}>&lt;</button>
          <button className="btn ghost" onClick={() => setMonth(new Date())}>Today</button>
          <button className="btn ghost" onClick={() => moveMonth(1)}>&gt;</button>
        </div>
        <h3>{monthLabel}</h3>
      </div>
      <Card>
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="calendar-cell calendar-head">{d}</div>
          ))}
          {cells.map((cell, idx) => (
            <div
              key={idx}
              className={`calendar-cell ${cell.inCurrentMonth ? '' : 'muted-cell'}`}
            >
              <div className="calendar-date">{cell.date.getDate()}</div>
              <div className="calendar-tags">
                {cell.trips.map((t) => (
                  <span key={`${t.id}-${idx}`} className="chip small">{t.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        {trips.length === 0 && <p className="muted">No trips yet. Create one to populate the calendar.</p>}
      </Card>
    </div>
  )
}
