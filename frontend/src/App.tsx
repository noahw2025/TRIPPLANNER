import type { ReactElement } from 'react'
import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TripsListPage from './pages/TripsListPage'
import TripDetailPage from './pages/TripDetailPage'
import DashboardPage from './pages/DashboardPage'
import CalendarPage from './pages/CalendarPage'
import BudgetPage from './pages/BudgetPage'
import WeatherPage from './pages/WeatherPage'
import AlertsPage from './pages/AlertsPage'
import SettingsPage from './pages/SettingsPage'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/AppLayout'

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { token } = useAuth()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

const DefaultRedirect = () => {
  const { token } = useAuth()
  return <Navigate to={token ? '/dashboard' : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<DefaultRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trips" element={<TripsListPage />} />
        <Route path="/create-trip" element={<TripsListPage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/weather" element={<WeatherPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  )
}

export default App
