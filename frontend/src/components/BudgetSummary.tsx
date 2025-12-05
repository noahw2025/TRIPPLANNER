import type { BudgetSummaryResponse } from '../api/types'

type Props = {
  summary: BudgetSummaryResponse
}

export default function BudgetSummary({ summary }: Props) {
  const categories = Object.entries(summary.categories)

  return (
    <div className="budget-summary">
      <div className="totals">
        <div>Planned Total: ${summary.totals.planned_total_all.toFixed(2)}</div>
        <div>Actual Total: ${summary.totals.actual_total_all.toFixed(2)}</div>
        <div>Remaining: ${summary.remaining_total.toFixed(2)}</div>
        <div>Per day suggestion: ${summary.recommended_daily_spend.toFixed(2)}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Planned</th>
            <th>Actual</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(([cat, vals]) => (
            <tr key={cat}>
              <td>{cat}</td>
              <td>${vals.planned_total.toFixed(2)}</td>
              <td>${vals.actual_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
