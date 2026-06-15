import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/Toast'
import { CATEGORY_LABELS, type ApiKey, type Category } from '../lib/types'
import { CategoryChip } from '../components/badges'
import TactIcon from '../components/TactIcon'

const CATEGORIES: Category[] = ['maintenance', 'energy', 'other']

export default function ApiKeysPage() {
  const { notify } = useToast()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<Category>('maintenance')
  const [created, setCreated] = useState<string | null>(null)

  async function load() {
    setKeys(await api<ApiKey[]>('/api/api-keys'))
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!label.trim()) { notify('יש להזין שם למפתח', 'err'); return }
    try {
      const res = await api<ApiKey & { raw_key: string }>('/api/api-keys', {
        method: 'POST', body: { label, category },
      })
      setCreated(res.raw_key)
      setLabel('')
      await load()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'יצירת מפתח נכשלה', 'err')
    }
  }

  async function revoke(id: number) {
    try {
      await api(`/api/api-keys/${id}`, { method: 'DELETE' })
      notify('המפתח בוטל')
      await load()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'ביטול נכשל', 'err')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>מפתחות בוטים</h1>
      <p style={{ color: 'var(--color-text-light)', marginTop: -12, maxWidth: 640 }}>
        כל בוט חיצוני (אחזקה / אנרגיה) משתמש במפתח כדי לשלוח קריאות שירות אל המערכת
        באמצעות הכותרת <code dir="ltr">X-API-Key</code> לכתובת <code dir="ltr">POST /api/v1/service-calls</code>.
      </p>

      <div className="tact-card tone-steel" style={{ maxWidth: 560 }}>
        <div className="tact-card-cap">
          <strong style={{ color: 'var(--color-primary)' }}>מפתח חדש</strong>
          <span className="tact-card-ico"><TactIcon name="plus" size={18} /></span>
        </div>
        <div className="tact-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="tact-field">
            <label>שם (למשל: בוט אחזקה ראשי)</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="tact-field">
            <label>קטגוריית ברירת מחדל</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <button className="tact-btn tact-btn-primary" onClick={create}>צור מפתח</button>

          {created && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 700 }}>
                המפתח מוצג פעם אחת בלבד — העתק אותו עכשיו:
              </span>
              <code
                dir="ltr"
                style={{
                  display: 'block', padding: '10px 12px', borderRadius: 8,
                  background: 'var(--color-ink)', color: 'var(--color-text-white)',
                  wordBreak: 'break-all', fontSize: '0.82rem',
                }}
              >
                {created}
              </code>
              <button className="tact-btn tact-btn-ghost" style={{ alignSelf: 'flex-start', padding: '6px 14px' }}
                onClick={() => { navigator.clipboard?.writeText(created); notify('הועתק') }}>
                העתק
              </button>
            </div>
          )}
        </div>
      </div>

      <table className="tact-table">
        <thead>
          <tr><th>שם</th><th>קטגוריה</th><th>קידומת</th><th>סטטוס</th><th>שימוש אחרון</th><th></th></tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id} style={{ cursor: 'default' }}>
              <td>{k.label}</td>
              <td><CategoryChip value={k.category} /></td>
              <td style={{ fontFamily: 'var(--font-family-en)' }} dir="ltr">{k.key_prefix}…</td>
              <td>
                <span className={`tact-chip ${k.is_active ? 'tact-badge-pos' : 'tact-badge-new'}`}>
                  {k.is_active ? 'פעיל' : 'מבוטל'}
                </span>
              </td>
              <td style={{ color: 'var(--color-text-light)', fontSize: '0.8rem' }}>
                {k.last_used_at ? new Date(k.last_used_at).toLocaleString('he-IL') : '—'}
              </td>
              <td>
                {k.is_active && (
                  <button className="tact-btn tact-btn-ghost" style={{ padding: '6px 12px' }}
                    onClick={() => revoke(k.id)}>בטל</button>
                )}
              </td>
            </tr>
          ))}
          {keys.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: 24 }}>
              אין מפתחות עדיין
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
