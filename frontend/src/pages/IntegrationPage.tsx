import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/Toast'
import { useAuth } from '../lib/AuthContext'
import type { IntegrationStatus, SyncLog } from '../lib/types'
import TactIcon from '../components/TactIcon'

export default function IntegrationPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [busy, setBusy] = useState(false)
  const isAdmin = user?.role === 'admin'

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([
      api<IntegrationStatus>('/api/sync/status'),
      api<SyncLog[]>('/api/sync/logs'),
    ])
    setStatus(s)
    setLogs(l)
  }, [])

  useEffect(() => { load() }, [load])

  async function pull() {
    setBusy(true)
    try {
      const res = await api<{ created: number; updated: number }>('/api/sync/pull', { method: 'POST' })
      notify(`ייבוא הושלם · נוצרו ${res.created}, עודכנו ${res.updated}`)
      await load()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'הייבוא נכשל', 'err')
    } finally {
      setBusy(false)
    }
  }

  async function testConn() {
    setBusy(true)
    try {
      const res = await api<{ ok: boolean; message: string }>('/api/sync/test', { method: 'POST' })
      notify(res.message, res.ok ? 'ok' : 'err')
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'בדיקת החיבור נכשלה', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>סנכרון Priority</h1>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="tact-btn tact-btn-ghost" disabled={busy} onClick={testConn}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <TactIcon name="link2" size={18} />
              בדוק חיבור
            </button>
            <button className="tact-btn tact-btn-primary" disabled={busy} onClick={pull}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <TactIcon name="swap" size={18} />
              {busy ? 'מייבא…' : 'ייבא מ-Priority'}
            </button>
          </div>
        )}
      </div>

      <div className="tact-card tone-steel" style={{ maxWidth: 560 }}>
        <div className="tact-card-cap">
          <strong style={{ color: 'var(--color-primary)' }}>מצב החיבור</strong>
          <span className={`tact-badge ${status?.configured ? 'tact-badge-pos' : 'tact-badge-new'}`}>
            {status?.configured ? 'מחובר' : 'לא מוגדר'}
          </span>
        </div>
        <div className="tact-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Line label="מצב" value={status?.use_mock ? 'הדמיה (mock) — עד חיבור ל-API אמיתי' : 'API אמיתי'} />
          <Line label="כתובת" value={status?.base_url || '— (טרם הוגדר)'} ltr />
          <Line label="חברה" value={status?.company || '—'} />
          <Line label="Entity" value={status?.service_entity || '—'} ltr />
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 10 }}>
          יומן סנכרון
        </h2>
        <table className="tact-table">
          <thead>
            <tr><th>כיוון</th><th>סטטוס</th><th>נוצרו</th><th>עודכנו</th><th>נכשלו</th><th>הודעה</th><th>זמן</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ cursor: 'default' }}>
                <td>{l.direction === 'pull' ? 'משיכה' : l.direction === 'devices' ? 'מכשירים' : 'דחיפה'}</td>
                <td>
                  <span className={`tact-chip ${l.status === 'ok' ? 'tact-badge-pos' : 'tact-badge-new'}`}>
                    {l.status === 'ok' ? 'הצליח' : l.status === 'error' ? 'נכשל' : l.status}
                  </span>
                </td>
                <td>{l.items_created}</td>
                <td>{l.items_updated}</td>
                <td>{l.items_failed}</td>
                <td style={{ color: 'var(--color-text-light)' }}>{l.message || '—'}</td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-light)', fontSize: '0.8rem' }}>
                  {new Date(l.started_at).toLocaleString('he-IL')}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: 24 }}>
                אין סנכרונים עדיין
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Line({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--color-text-light)' }}>{label}</span>
      <span dir={ltr ? 'ltr' : undefined} style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}
