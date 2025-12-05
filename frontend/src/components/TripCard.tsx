import type { TripRead } from '../api/types'
import Card from './ui/Card'
import Button from './ui/Button'

type Props = {
  trip: TripRead
  onSelect: () => void
  onDuplicate: () => void
  onDelete?: () => void
  plannedBudget?: number
  actualBudget?: number
}

const tripTypeLabel: Record<string, string> = {
  adventurous: 'Adventurous',
  hiking: 'Hiking',
  chill: 'Chill',
  relaxing: 'Relaxing',
  foodie: 'Foodie',
  cultural: 'Cultural',
  balanced: 'Balanced',
}

export default function TripCard({ trip, onSelect, onDuplicate, onDelete, plannedBudget, actualBudget }: Props) {
  const typeLabel = tripTypeLabel[trip.trip_type] ?? 'Trip'
  const budgetValue = plannedBudget ?? trip.total_budget ?? 0
  return (
    <Card className="trip-card">
      <div className="trip-card__header">
        <div className="chip">{typeLabel}</div>
        <div className="muted">{trip.currency}</div>
      </div>
      <h3>{trip.name}</h3>
      <p className="muted">{trip.destination}</p>
      <p className="muted">
        {trip.start_date} → {trip.end_date}
      </p>
      <div className="trip-card__meta">
        <div>
          <div className="muted label">Budget</div>
          <strong>${budgetValue?.toFixed?.(0) ?? budgetValue}</strong>
          {actualBudget !== undefined ? (
            <div className="muted small">Spent: ${actualBudget?.toFixed?.(0) ?? actualBudget}</div>
          ) : null}
        </div>
        <div>
          <div className="muted label">Party</div>
          <strong>{trip.party_size}</strong>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <Button onClick={onSelect}>Open itinerary</Button>
        <Button variant="ghost" onClick={onDuplicate}>Duplicate</Button>
        {onDelete && <Button variant="ghost" onClick={onDelete}>Delete</Button>}
      </div>
    </Card>
  )
}
