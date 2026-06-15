import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { CATEGORY_LABELS, URGENCY_LABELS, type Category, type Urgency } from '../lib/types'
import TactIcon from '../components/TactIcon'

type Summary = {
  total: number
  open: number
  local_only: number
  by_category: Record<string, number>
  by_urgency: Record<string, number>
  by_status: Record<string, number>
  by_source: Record<string, number>
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="tact-kpi">
      <div className="tact-kpi-label">{label}</div>
      <div className="tact-kpi-val" style={accent ? { color: 'var(--color-accent)' } : undefined}>
        {value.toLocaleString('he-IL')}
      </div>
    </div>
  )
}

export default function DashboardPage({ onOpenCalls }: { onOpenCalls: () => void }) {
  const [s, setS] = useState<Summary | null>(null)

  useEffect(() => {
    api<Summary>('/api/dashboard/summary').then(setS).catch(() => setS(null))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          לוח מחוונים
        </h1>
        <button className="tact-btn tact-btn-primary" onClick={onOpenCalls}>
          לכל קריאות השירות
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Kpi label="סך הכל קריאות" value={s?.total ?? 0} />
        <Kpi label="קריאות פתוחות" value={s?.open ?? 0} />
        <Kpi label="מקומיות (טרם נשלחו ל-Priority)" value={s?.local_only ?? 0} accent />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <BreakdownCard
          title="לפי קטגוריה"
          tone="tone-steel"
          icon="folder"
          data={s?.by_category}
          label={(k) => CATEGORY_LABELS[k as Category] ?? k}
        />
        <BreakdownCard
          title="לפי דחיפות"
          tone="tone-blue"
          icon="bolt"
          data={s?.by_urgency}
          label={(k) => URGENCY_LABELS[k as Urgency] ?? k}
        />
      </div>
    </div>
  )
}

function BreakdownCard({
  title, tone, icon, data, label,
}: {
  title: string
  tone: string
  icon: string
  data?: Record<string, number>
  label: (k: string) => string
}) {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1])
  return (
    <div className={`tact-card ${tone}`}>
      <div className="tact-card-cap">
        <strong style={{ color: 'var(--color-primary)' }}>{title}</strong>
        <span className="tact-card-ico"><TactIcon name={icon} size={18} /></span>
      </div>
      <div className="tact-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.length === 0 && <span style={{ color: 'var(--color-text-light)' }}>אין נתונים</span>}
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{label(k)}</span>
            <span className="tact-kpi-val" style={{ fontSize: '1.2rem', margin: 0 }}>
              {v.toLocaleString('he-IL')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
