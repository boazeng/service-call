import { useState } from 'react'
import { useAuth } from './lib/AuthContext'
import AppShell, { type Page } from './components/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ServiceCallsPage from './pages/ServiceCallsPage'
import DevicesPage from './pages/DevicesPage'
import IntegrationPage from './pages/IntegrationPage'
import ApiKeysPage from './pages/ApiKeysPage'
import UsersPage from './pages/UsersPage'

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')

  if (loading) {
    return (
      <div className="tact-aurora" style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <span style={{ color: 'var(--color-text-light)' }}>טוען…</span>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <AppShell page={page} setPage={setPage}>
      {page === 'dashboard' && <DashboardPage onOpenCalls={() => setPage('calls')} />}
      {page === 'calls' && <ServiceCallsPage />}
      {page === 'devices' && <DevicesPage />}
      {page === 'integration' && <IntegrationPage />}
      {page === 'apikeys' && <ApiKeysPage />}
      {page === 'users' && <UsersPage />}
    </AppShell>
  )
}
