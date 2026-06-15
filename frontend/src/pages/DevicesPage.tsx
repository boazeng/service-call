import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/Toast'
import { useAuth } from '../lib/AuthContext'
import type { DeviceList } from '../lib/types'
import TactIcon from '../components/TactIcon'

export default function DevicesPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const [data, setData] = useState<DeviceList | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const isAdmin = user?.role === 'admin'

  const load = useCallback(async () => {
    const res = await api<DeviceList>('/api/devices', {
      query: { search: search || undefined, page_size: 100 },
    })
    setData(res)
  }, [search])

  useEffect(() => { load() }, [load])

  async function importDevices() {
    setBusy(true)
    try {
      const res = await api<{ created: number; updated: number }>('/api/sync/pull-devices', { method: 'POST' })
      notify(`ייבוא מכשירים הושלם · נוצרו ${res.created}, עודכנו ${res.updated}`)
      await load()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'ייבוא המכשירים נכשל', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          מכשירים {data && <span style={{ color: 'var(--color-text-light)', fontSize: '1rem' }}>({data.total})</span>}
        </h1>
        {isAdmin && (
          <button className="tact-btn tact-btn-primary" disabled={busy} onClick={importDevices}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <TactIcon name="swap" size={18} />
            {busy ? 'מייבא…' : 'ייבא מכשירים מ-Priority'}
          </button>
        )}
      </div>

      <input
        className="tact-input"
        style={{ maxWidth: 320, border: '1px solid var(--color-border)', background: 'var(--color-bg-white)' }}
        placeholder="חיפוש (מק״ט / מספר סידורי / לקוח)…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={{ overflowX: 'auto' }}>
      <table className="tact-table" style={{ minWidth: 1200 }}>
        <thead>
          <tr>
            <th>מק״ט</th>
            <th>מספר מכשיר</th>
            <th>סיומת מכשיר</th>
            <th>תיאור המכשיר</th>
            <th>שם לקוח</th>
            <th>איש קשר</th>
            <th>טלפון</th>
            <th>אתר (מספר)</th>
            <th>אתר (תיאור)</th>
            <th>חוזה שירות</th>
            <th>קוד איזור</th>
            <th>תאריך התקנה</th>
            <th>משפחת מוצר</th>
            <th>תיאור משפחת מוצר</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map((d) => (
            <tr key={d.id} style={{ cursor: 'default' }}>
              <td style={{ fontFamily: 'var(--font-family-en)', whiteSpace: 'nowrap' }} dir="ltr">{d.part_name || '—'}</td>
              <td style={{ fontFamily: 'var(--font-family-en)', fontWeight: 600 }} dir="ltr">{d.sernum}</td>
              <td style={{ fontFamily: 'var(--font-family-en)' }} dir="ltr">{d.sernum_suffix || '—'}</td>
              <td>{d.part_description || '—'}</td>
              <td>{d.customer_name || '—'}</td>
              <td>{d.contact_name || '—'}</td>
              <td dir="ltr" style={{ fontFamily: 'var(--font-family-en)', whiteSpace: 'nowrap' }}>{d.phone || '—'}</td>
              <td dir="ltr" style={{ fontFamily: 'var(--font-family-en)' }}>{d.site_code || '—'}</td>
              <td>{d.site_description || '—'}</td>
              <td dir="ltr" style={{ fontFamily: 'var(--font-family-en)' }}>{d.service_contract || '—'}</td>
              <td dir="ltr" style={{ fontFamily: 'var(--font-family-en)' }}>
                {d.zone_code || '—'}{d.zone_description ? <span dir="rtl" style={{ color: 'var(--color-text-light)' }}> · {d.zone_description}</span> : ''}
              </td>
              <td dir="ltr" style={{ fontFamily: 'var(--font-family-en)', whiteSpace: 'nowrap' }}>
                {d.install_date ? d.install_date.slice(0, 10) : '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-family-en)' }} dir="ltr">{d.family_name || '—'}</td>
              <td style={{ color: 'var(--color-text-light)' }}>{d.family_description || '—'}</td>
            </tr>
          ))}
          {data && data.items.length === 0 && (
            <tr><td colSpan={14} style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: 28 }}>
              לא נמצאו מכשירים — נסה "ייבא מכשירים מ-Priority"
            </td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  )
}
