import type { EventRead } from '../api/types'

type Props = {
  events: EventRead[]
  days: string[]
  onAddForDay?: (date: string) => void
}

export default function EventList({ events, days, onAddForDay }: Props) {
  const grouped = events.reduce<Record<string, EventRead[]>>((acc, evt) => {
    acc[evt.date] = acc[evt.date] || []
    acc[evt.date].push(evt)
    return acc
  }, {})

  return (
    <div className="event-list">
      {days.map((date) => {
        const list = (grouped[date] || []).slice().sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
        const label = new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        return (
          <div key={date} className="event-day">
            <h4>{label}</h4>
            {list.length === 0 ? (
              <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                No plans yet.
                {onAddForDay && (
                  <button className="btn ghost" onClick={() => onAddForDay(date)}>
                    Add event
                  </button>
                )}
              </div>
            ) : (
              <ul>
                {list.map((evt) => (
                  <li key={evt.id}>
                    <div className="event-row">
                      <div>
                        <strong>{evt.title}</strong>
                        {evt.start_time && ` @ ${evt.start_time}`}
                        <div className="muted">{evt.type}</div>
                        {evt.category_type && evt.category_type !== 'other' ? (
                          <span className="chip">{evt.category_type}</span>
                        ) : null}
                        {evt.is_refundable ? <span className="chip low">Refundable</span> : null}
                        {evt.reservation_link ? (
                          <div><a href={evt.reservation_link} target="_blank" rel="noreferrer">Reservation</a></div>
                        ) : null}
                      </div>
                      {evt.cost ? <div>Cost: ${evt.cost.toFixed(2)}</div> : null}
                      {evt.notes ? <div>{evt.notes}</div> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
