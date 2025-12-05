import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from './ui/Button'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/trips', label: 'Trips', icon: '🧭' },
  { to: '/create-trip', label: 'Create Trip', icon: '➕' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/budget', label: 'Budget', icon: '💰' },
  { to: '/weather', label: 'Weather', icon: '🌤️' },
  { to: '/alerts', label: 'Alerts', icon: '⚠️' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function AppLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => navigate('/dashboard')}>
          <span className="brand-mark">TripIt</span>
          <span className="brand-sub">itinerary planner</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{user?.username?.[0]?.toUpperCase() ?? 'U'}</div>
            <div>
              <div className="user-name">{user?.username ?? 'Traveler'}</div>
              <div className="user-sub">@trip</div>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>Logout</Button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="pill muted">Premium planner</div>
          <div className="top-actions">
            <Button variant="ghost" onClick={() => navigate('/create-trip')}>New trip</Button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
