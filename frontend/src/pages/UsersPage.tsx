import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/Toast'
import type { Role, User } from '../lib/types'

const ROLE_LABELS: Record<Role, string> = { admin: 'מנהל', operator: 'מוקדן' }

export default function UsersPage() {
  const { notify } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState<{ email: string; full_name: string; password: string; role: Role }>({
    email: '', full_name: '', password: '', role: 'operator',
  })
  const [pwEditId, setPwEditId] = useState<number | null>(null)
  const [pwValue, setPwValue] = useState('')

  async function load() {
    setUsers(await api<User[]>('/api/users'))
  }
  useEffect(() => { load() }, [])

  async function changePassword(u: User) {
    if (pwValue.trim().length < 4) { notify('סיסמה קצרה מדי (לפחות 4 תווים)', 'err'); return }
    try {
      await api(`/api/users/${u.id}`, { method: 'PATCH', body: { password: pwValue } })
      notify(`הסיסמה של ${u.email} עודכנה`)
      setPwEditId(null)
      setPwValue('')
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'עדכון הסיסמה נכשל', 'err')
    }
  }

  async function create() {
    if (!form.email.trim()) { notify('יש להזין אימייל', 'err'); return }
    try {
      await api('/api/users', { method: 'POST', body: form })
      notify('המשתמש נוצר')
      setForm({ email: '', full_name: '', password: '', role: 'operator' })
      await load()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'יצירת משתמש נכשלה', 'err')
    }
  }

  async function toggleActive(u: User) {
    try {
      await api(`/api/users/${u.id}`, { method: 'PATCH', body: { is_active: !u.is_active } })
      await load()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'עדכון נכשל', 'err')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>משתמשים</h1>

      <div className="tact-card tone-steel" style={{ maxWidth: 620 }}>
        <div className="tact-card-cap">
          <strong style={{ color: 'var(--color-primary)' }}>משתמש חדש</strong>
        </div>
        <div className="tact-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="tact-field">
            <label>אימייל</label>
            <input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="tact-field">
            <label>שם מלא</label>
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="tact-field">
            <label>סיסמה</label>
            <input dir="ltr" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="tact-field">
            <label>תפקיד</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="operator">מוקדן</option>
              <option value="admin">מנהל</option>
            </select>
          </div>
          <button className="tact-btn tact-btn-primary" style={{ gridColumn: '1 / -1' }} onClick={create}>
            צור משתמש
          </button>
        </div>
      </div>

      <table className="tact-table">
        <thead>
          <tr><th>שם</th><th>אימייל</th><th>תפקיד</th><th>סטטוס</th><th></th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ cursor: 'default' }}>
              <td>{u.full_name || '—'}</td>
              <td dir="ltr" style={{ fontFamily: 'var(--font-family-en)' }}>{u.email}</td>
              <td>
                <span className="tact-chip tact-badge-on">{ROLE_LABELS[u.role]}</span>
              </td>
              <td>
                <span className={`tact-chip ${u.is_active ? 'tact-badge-pos' : 'tact-badge-new'}`}>
                  {u.is_active ? 'פעיל' : 'מושבת'}
                </span>
              </td>
              <td>
                {pwEditId === u.id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      dir="ltr"
                      type="text"
                      autoFocus
                      placeholder="סיסמה חדשה"
                      value={pwValue}
                      onChange={(e) => setPwValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') changePassword(u); if (e.key === 'Escape') { setPwEditId(null); setPwValue('') } }}
                      style={{ font: 'inherit', fontSize: '0.85rem', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', width: 150 }}
                    />
                    <button className="tact-btn tact-btn-primary" style={{ padding: '6px 12px' }} onClick={() => changePassword(u)}>שמור</button>
                    <button className="tact-btn tact-btn-ghost" style={{ padding: '6px 10px' }} onClick={() => { setPwEditId(null); setPwValue('') }}>ביטול</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="tact-btn tact-btn-ghost" style={{ padding: '6px 12px' }}
                      onClick={() => { setPwEditId(u.id); setPwValue('') }}>
                      שנה סיסמה
                    </button>
                    <button className="tact-btn tact-btn-ghost" style={{ padding: '6px 12px' }}
                      onClick={() => toggleActive(u)}>
                      {u.is_active ? 'השבת' : 'הפעל'}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
