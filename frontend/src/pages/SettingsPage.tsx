import Card from '../components/ui/Card'
import SectionHeader from '../components/ui/SectionHeader'
import Button from '../components/ui/Button'

export default function SettingsPage() {
  return (
    <div className="page page-padded">
      <SectionHeader title="Settings" subtitle="Account and app preferences." />
      <div className="grid two-col">
        <Card>
          <h3>Profile</h3>
          <div className="form-column">
            <label>
              Display name
              <input placeholder="Your name" />
            </label>
            <label>
              Email
              <input type="email" placeholder="you@example.com" />
            </label>
            <Button>Save</Button>
          </div>
        </Card>
        <Card>
          <h3>Preferences</h3>
          <div className="form-column">
            <label>
              Theme
              <select>
                <option>Dark</option>
                <option>System</option>
              </select>
            </label>
            <label className="inline">
              <input type="checkbox" defaultChecked /> Enable alerts
            </label>
          </div>
        </Card>
      </div>
    </div>
  )
}
