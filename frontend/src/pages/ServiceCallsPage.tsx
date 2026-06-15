import { Fragment, useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/Toast'
import {
  CATEGORY_LABELS, SOURCE_LABELS, SYNC_LABELS, URGENCY_LABELS,
  type ServiceCall, type ServiceCallList,
  type Source, type Urgency,
} from '../lib/types'
import { StatusChip } from '../components/badges'
import TactIcon from '../components/TactIcon'
import ServiceCallDrawer from './ServiceCallDrawer'

const SOURCES: Source[] = ['bot_maintenance', 'bot_energy', 'priority', 'manual']
const URGENCIES: Urgency[] = ['low', 'medium', 'high', 'urgent']
// Real Priority statuses to narrow by (terminal סופית/מבוטלת are handled by toggles).
const PRIORITY_STATUSES = [
  'מתוכנן', 'לביצוע', 'ממתין', 'בדיקה להסכם', 'להצעת מחיר',
  'הקפאת תוכנית', 'ת"ע טיפולים', 'לגביה', 'בוצע',
]

export default function ServiceCallsPage() {
  const { notify } = useToast()
  const [data, setData] = useState<ServiceCallList | null>(null)
  const [selected, setSelected] = useState<ServiceCall | null>(null)
  const [pushingId, setPushingId] = useState<number | null>(null)
  const [expandAll, setExpandAll] = useState(false)
  // Terminal statuses are hidden by default; these toggles bring them back.
  const [showFinal, setShowFinal] = useState(false)
  const [showCancelled, setShowCancelled] = useState(false)
  const [filters, setFilters] = useState({
    search: '', priority_status: '', source: '', category: '', urgency: '',
  })

  const load = useCallback(async () => {
    const res = await api<ServiceCallList>('/api/service-calls', {
      query: {
        search: filters.search || undefined,
        priority_status: filters.priority_status || undefined,
        show_final: showFinal ? 'true' : undefined,
        show_cancelled: showCancelled ? 'true' : undefined,
        source: filters.source || undefined,
        category: filters.category || undefined,
        urgency: filters.urgency || undefined,
        page_size: 100,
      },
    })
    setData(res)
  }, [filters, showFinal, showCancelled])

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
        <Select value={filters.priority_status} onChange={(v) => set('priority_status', v)} placeholder="כל הסטטוסים"
          options={PRIORITY_STATUSES.map((s) => [s, s])} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>הצג גם:</span>
          <Toggle on={showFinal} onClick={() => setShowFinal((v) => !v)} label="סופית" />
          <Toggle on={showCancelled} onClick={() => setShowCancelled((v) => !v)} label="מבוטלת" />
        </div>
        <Select value={filters.source} onChange={(v) => set('source', v)} placeholder="כל המקורות"
          options={SOURCES.map((s) => [s, SOURCE_LABELS[s]])} />
        <Select value={filters.urgency} onChange={(v) => set('urgency', v)} placeholder="כל הדחיפויות"
          options={URGENCIES.map((u) => [u, URGENCY_LABELS[u]])} />
        <button
          className={expandAll ? 'tact-btn tact-btn-primary' : 'tact-btn tact-btn-ghost'}
          style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => setExpandAll((v) => !v)}
        >
          <TactIcon name={expandAll ? 'chevron-up' : 'chevron-down'} size={14} />
          {expandAll ? 'כווץ הכל' : 'הרחב הכל'}
        </button>
      </div>

      <table className="tact-table">
        <thead>
          <tr>
            <th>מספר קריאה</th>
            <th>סטטוס</th>
            <th>תאריך פתיחה</th>
            <th>תאור אתר לקוח</th>
            <th>שם לקוח</th>
            <th>פרטים</th>
            <th>טלפון</th>
            <th>מספר מכשיר</th>
            <th>תאור מתקן</th>
            <th>מספר חוזה</th>
            <th>שולם עד</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map((c) => {
            const local = !c.priority_doc_number // not yet approved into Priority
            return (
            <Fragment key={c.id}>
            <tr
              onClick={() => setSelected(c)}
              className={local ? 'row-local' : undefined}
            >
              <td style={{ fontFamily: 'var(--font-family-en)', whiteSpace: 'nowrap' }}>
                {local && <span className="local-dot" />}
                {c.call_number}
              </td>
              <td>
                {c.priority_status ? (
                  <span className="tact-chip" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                    {c.priority_status}
                  </span>
                ) : (
                  <StatusChip value={c.status} />
                )}
              </td>
              <td dir="ltr" style={{ whiteSpace: 'nowrap', textAlign: 'right', color: 'var(--color-text-light)' }}>
                {fmtDate(c.open_date || c.created_at)}
              </td>
              <td><Clip w={170}>{c.device_site_description || c.site || '—'}</Clip></td>
              <td style={{ fontWeight: 600 }}><Clip w={150}>{c.customer_name || '—'}</Clip></td>
              <td><Clip w={230}>{c.description || c.title || '—'}</Clip></td>
              <td dir="ltr" style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-family-en)' }}>
                {c.contact_phone || '—'}
              </td>
              <td dir="ltr" style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-family-en)' }}>
                {c.device_sernum || '—'}
              </td>
              <td><Clip w={160}>{c.device_part_description || '—'}</Clip></td>
              <td dir="ltr" style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-family-en)' }}>
                {c.contract_number || '—'}
              </td>
              <td dir="ltr" style={{ whiteSpace: 'nowrap', textAlign: 'right', color: 'var(--color-text-light)' }}>
                {fmtDate(c.paid_until)}
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
            {expandAll && (
              <tr className={local ? 'row-local' : undefined} onClick={() => setSelected(c)}>
                <td colSpan={12} style={{ paddingTop: 0, borderTop: 'none' }}>
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '6px 22px',
                    padding: '4px 8px 10px', fontSize: '0.82rem', color: 'var(--color-text-light)',
                  }}>
                    <Detail label="כותרת" value={c.title} />
                    <Detail label="חברה" value={c.company} />
                    <Detail label="קטגוריה" value={CATEGORY_LABELS[c.category]} />
                    <Detail label="דחיפות" value={URGENCY_LABELS[c.urgency]} />
                    <Detail label="מקור" value={SOURCE_LABELS[c.source]} />
                    <Detail label="סנכרון" value={SYNC_LABELS[c.sync_status]} />
                    <Detail label="סניף" value={c.branch} extra={c.branch_description} />
                    <Detail label="מסמך Priority" value={c.priority_doc_number} />
                  </div>
                </td>
              </tr>
            )}
            </Fragment>
            )
          })}
          {data && data.items.length === 0 && (
            <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: 28 }}>
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

function fmtDate(v: string | null): string {
  if (!v) return '—'
  const [y, m, d] = v.slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : '—'
}

function Clip({ children, w }: { children: React.ReactNode; w: number }) {
  const title = typeof children === 'string' ? children : undefined
  return (
    <div title={title} style={{ maxWidth: w, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {children}
    </div>
  )
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={on ? 'tact-btn tact-btn-primary' : 'tact-btn tact-btn-ghost'}
      style={{ padding: '6px 12px', fontSize: '0.82rem', border: on ? undefined : '1px solid var(--color-border)' }}
    >
      {label}
    </button>
  )
}

function Detail({ label, value, extra }: { label: string; value?: string | null; extra?: string | null }) {
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--color-text-light)' }}>{label}: </span>
      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{value || '—'}</span>
      {extra && <span style={{ color: 'var(--color-text-light)' }}> · {extra}</span>}
    </span>
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
