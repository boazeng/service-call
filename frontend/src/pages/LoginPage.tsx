import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/Toast'
import { ApiError } from '../lib/api'
import TactLogo from '../components/TactLogo'

export default function LoginPage() {
  const { login, devLogin } = useAuth()
  const { notify } = useToast()
  const [email, setEmail] = useState('admin@tact.co.il')
  const [password, setPassword] = useState('admin123')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'התחברות נכשלה', 'err')
    } finally {
      setBusy(false)
    }
  }

  async function quickDev() {
    setBusy(true)
    try {
      await devLogin(email)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'התחברות נכשלה', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tact-aurora" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div
        className="tact-card tone-steel"
        style={{ width: 'min(420px, 92vw)' }}
      >
        <div className="tact-card-cap">
          <TactLogo word="שירות" size={1.1} />
          <span className="tact-badge tact-badge-on">כניסה</span>
        </div>
        <form className="tact-card-body" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            ניהול קריאות שירות
          </h1>
          <div className="tact-field">
            <label>אימייל</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" dir="ltr" />
          </div>
          <div className="tact-field">
            <label>סיסמה</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" dir="ltr" />
          </div>
          <button className="tact-btn tact-btn-primary" disabled={busy} type="submit">
            {busy ? 'מתחבר…' : 'התחברות'}
          </button>
          <button className="tact-btn tact-btn-ghost" disabled={busy} type="button" onClick={quickDev}>
            כניסת פיתוח (ללא סיסמה)
          </button>
        </form>
      </div>
    </div>
  )
}
