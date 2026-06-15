import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/Toast'
import {
  SOURCE_LABELS, STATUS_LABELS, URGENCY_LABELS,
  type ServiceCall, type ServiceCallList,
  type Source, type Status, type Urgency,
} from '../lib/types'
import { CategoryChip, SourceChip, StatusChip, SyncChip, UrgencyChip } from '../components/badges'
import TactIcon from '../components/TactIcon'
import ServiceCallDrawer from './ServiceCallDrawer'

const STATUSES: Status[] = ['new', 'in_review', 'ready_to_send', 'sent', 'in_progress', 'closed', 'cancelled']
const SOURCES: Source[] = ['bot_maintenance', 'bot_energy', 'priority', 'manual']
const URGENCIES: Urgency[] = ['low', 'medium', 'high', 'urgent']

export default function ServiceCallsPage() {
  const { notify } = useToast()
  const [data, setData] = useState<ServiceCallList | null>(null)
  const [selected, setSelected] = useState<ServiceCall | null>(null)
  const [pushingId, setPushingId] = useState<number | null>(null)
  const [filters, setFilters] = useState({
    search: '', status: '', source: '', category: '', urgency: '', local_only: '',
  })

  const load = useCallback(async () => {
    const res = await api<ServiceCallList>('/api/service-calls', {
      query: {
        search: filters.search || undefined,
        status: filters.status || undefined,
        source: filters.source || undefined,
        category: filters.category || undefined,
        urgency: filters.urgency || undefined,
        local_only: filters.local_only || undefined,
        page_size: 100,
      },
    })
    setData(res)
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  function set<K extends keyof typeof filters>(k: K, v: string) {
    setFilters((f) => ({ ...f, [k]: v }))
  }

  async function pushToPriority(c: ServiceCall, e: React.MouseEvent) {
    e.stopPropagation() // don't open the drawer
    setPushingId(c.id)
    try {
      const updated = await api<ServiceCall>(`/api/service-calls/${c.id}/push`, { method: 'POST' })
      notify(`נוספה ל-Priority (מסמך ${updated.priority_doc_number})`)
      await load()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'הוספה ל-Priority נכשלה', 'err')
    } finally {
      setPushingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          קריאות שירות {data && <span style={{ color: 'var(--color-text-light)', fontSize: '1rem' }}>({data.total})</span>}
        </h1>
        <nav className="tact-nav">
          {([['', 'הכל'], ['maintenance', 'אחזקה'], ['energy', 'אנרגיה'], ['other', 'אחר']] as [string, string][]).map(
            ([val, label]) => (
              <button
                key={val || 'all'}
                className={filters.category === val ? 'active' : ''}
                onClick={() => set('category', val)}
              >
                {label}
              </button>
            ),
          )}
        </nav>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="tact-input"
          style={{ maxWidth: 240, border: '1px solid var(--color-border)', background: 'var(--color-bg-white)' }}
          placeholder="חיפוש (כותרת / לקוח / מספר)…"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
        />
        <Select value={filters.status} onChange={(v) => set('status', v)} placeholder="כל הסטטוסים"
          options={STATUSES.map((s) => [s, STATUS_LABELS[s]])} />
        <Select value={filters.source} onChange={(v) => set('source', v)} placeholder="כל המקורות"
          options={SOURCES.map((s) => [s, SOURCE_LABELS[s]])} />
        <Select value={filters.urgency} onChange={(v) => set('urgency', v)} placeholder="כל הדחיפויות"
          options={URGENCIES.map((u) => [u, URGENCY_LABELS[u]])} />
        <Select value={filters.local_only} onChange={(v) => set('local_only', v)} placeholder="מצב Priority"
          options={[['true', 'מקומיות בלבד'], ['false', 'ב-Priority']]} />
      </div>

      <table className="tact-table">
        <thead>
          <tr>
            <th>מספר</th>
            <th>כותרת</th>
            <th>חברה</th>
            <th>לקוח / אתר</th>
            <th>קטגוריה</th>
            <th>דחיפות</th>
            <th>סטטוס</th>
            <th>מקור</th>
            <th>סנכרון</th>
            <th>Priority</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map((c) => {
            const local = !c.priority_doc_number // not yet approved into Priority
            return (
            <tr
              key={c.id}
              onClick={() => setSelected(c)}
              className={local ? 'row-local' : undefined}
            >
              <td style={{ fontFamily: 'var(--font-family-en)', whiteSpace: 'nowrap' }}>
                {local && <span className="local-dot" />}
                {c.call_number}
              </td>
              <td>{c.title}</td>
              <td style={{ fontWeight: 600 }}>{c.company || '—'}</td>
              <td>
                <div>{c.customer_name || '—'}</div>
                {c.device_sernum && (
                  <div dir="ltr" style={{ fontSize: '0.74rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-family-en)', textAlign: 'right' }}>
                    מכשיר {c.device_sernum}{c.branch ? ` · סניף ${c.branch}` : ''}
                  </div>
                )}
              </td>
              <td><CategoryChip value={c.category} /></td>
              <td><UrgencyChip value={c.urgency} /></td>
              <td>
                {c.priority_status ? (
                  <span className="tact-chip" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                    {c.priority_status}
                  </span>
                ) : (
                  <StatusChip value={c.status} />
                )}
              </td>
              <td><SourceChip value={c.source} /></td>
              <td><SyncChip value={c.sync_status} /></td>
              <td style={{ fontFamily: 'var(--font-family-en)', color: 'var(--color-text-light)' }}>
                {c.priority_doc_number || (
                  <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontFamily: 'var(--font-family)' }}>
                    לא ב-Priority
                  </span>
                )}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {local && (
                  <button
                    className="tact-btn tact-btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    disabled={pushingId === c.id}
                    onClick={(e) => pushToPriority(c, e)}
                  >
                    <TactIcon name="send" size={14} />
                    {pushingId === c.id ? 'מוסיף…' : 'הוסף ל-Priority'}
                  </button>
                )}
              </td>
            </tr>
            )
          })}
          {data && data.items.length === 0 && (
            <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: 28 }}>
              לא נמצאו קריאות
            </td></tr>
          )}
        </tbody>
      </table>

      {selected && (
        <ServiceCallDrawer
          call={selected}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}

function Select({
  value, onChange, placeholder, options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: [string, string][]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        font: 'inherit', fontSize: '0.85rem', padding: '8px 12px',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
        background: 'var(--color-bg-white)', color: 'var(--color-text)',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}
