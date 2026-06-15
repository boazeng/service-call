import type { ReactNode } from 'react'
import { useAuth } from '../lib/AuthContext'
import TactLogo from './TactLogo'
import TactIcon from './TactIcon'

export type Page = 'dashboard' | 'calls' | 'devices' | 'integration' | 'apikeys' | 'users'

type NavItem = { key: Page; label: string; icon: string; adminOnly?: boolean }

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'לוח מחוונים', icon: 'dashboard' },
  { key: 'calls', label: 'קריאות שירות', icon: 'document' },
  { key: 'devices', label: 'מכשירים', icon: 'package' },
  { key: 'integration', label: 'סנכרון Priority', icon: 'swap' },
  { key: 'apikeys', label: 'מפתחות בוטים', icon: 'link2', adminOnly: true },
  { key: 'users', label: 'משתמשים', icon: 'users', adminOnly: true },
]

export default function AppShell({
  page,
  setPage,
  children,
}: {
  page: Page
  setPage: (p: Page) => void
  children: ReactNode
}) {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const items = NAV.filter((n) => !n.adminOnly || isAdmin)

  return (
    <div className="tact-aurora">
      <header className="tact-bar">
        <TactLogo word="שירות" size={1.05} />
        <nav className="tact-nav" style={{ marginInlineStart: 'auto' }}>
          {items.map((n) => (
            <button
              key={n.key}
              className={page === n.key ? 'active' : ''}
              onClick={() => setPage(n.key)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <TactIcon name={n.icon} size={16} />
                {n.label}
              </span>
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
            {user?.full_name || user?.email}
          </span>
          <button
            className="tact-btn tact-btn-ghost"
            style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={logout}
          >
            <TactIcon name="logout" size={16} />
            יציאה
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
