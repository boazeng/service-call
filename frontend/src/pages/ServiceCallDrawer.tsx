import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/Toast'
import {
  CATEGORY_LABELS, STATUS_LABELS, URGENCY_LABELS,
  type Category, type Device, type DeviceList, type ServiceCall, type Status, type Urgency,
} from '../lib/types'
import { SourceChip, SyncChip } from '../components/badges'
import TactIcon from '../components/TactIcon'

const STATUSES: Status[] = ['new', 'in_review', 'ready_to_send', 'sent', 'in_progress', 'closed', 'cancelled']
const URGENCIES: Urgency[] = ['low', 'medium', 'high', 'urgent']
const CATEGORIES: Category[] = ['maintenance', 'energy', 'other']

export default function ServiceCallDrawer({
  call, onClose, onChanged,
}: {
  call: ServiceCall
  onClose: () => void
  onChanged: () => void
}) {
  const { notify } = useToast()
  const [form, setForm] = useState({
    title: call.title,
    description: call.description ?? '',
    company: call.company ?? '',
    category: call.category,
    urgency: call.urgency,
    status: call.status,
    customer_name: call.customer_name ?? '',
    site: call.site ?? '',
    branch: call.branch ?? '',
    device_sernum: call.device_sernum ?? '',
    contact_phone: call.contact_phone ?? '',
    assigned_to: call.assigned_to ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [device, setDevice] = useState<Device | null>(null)
  const inPriority = !!call.priority_doc_number

  // Look up the linked device (by serial) to show its part/description.
  useEffect(() => {
    if (!call.device_sernum) { setDevice(null); return }
    api<DeviceList>('/api/devices', { query: { search: call.device_sernum, page_size: 5 } })
      .then((res) => setDevice(res.items.find((d) => d.sernum === call.device_sernum) ?? null))
      .catch(() => setDevice(null))
  }, [call.device_sernum])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function save() {
    setBusy(true)
    try {
      await api(`/api/service-calls/${call.id}`, { method: 'PATCH', body: form })
      notify('הקריאה נשמרה')
      onChanged()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'שמירה נכשלה', 'err')
    } finally {
      setBusy(false)
    }
  }

  async function push() {
    setBusy(true)
    try {
      const updated = await api<ServiceCall>(`/api/service-calls/${call.id}/push`, { method: 'POST' })
      notify(`נשלחה ל-Priority (מסמך ${updated.priority_doc_number})`)
      onChanged()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'שליחה ל-Priority נכשלה', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {call.call_number}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <SourceChip value={call.source} />
              <SyncChip value={call.sync_status} />
              {inPriority && (
                <span className="tact-chip" style={{ background: 'var(--color-pos-soft)', color: 'var(--color-pos)' }}>
                  Priority · {call.priority_doc_number}
                </span>
              )}
            </div>
          </div>
          <button className="tact-btn tact-btn-ghost" style={{ padding: '6px 12px' }} onClick={onClose}>✕</button>
        </div>

        {!inPriority && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 14,
              borderRadius: 'var(--radius-sm)', background: 'rgba(214,74,46,0.10)',
              border: '1px solid rgba(214,74,46,0.35)', color: 'var(--color-accent)', fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <span className="local-dot" />
            קריאה זו עדיין לא קיימת ב-Priority. עדכן את הפרטים ולחץ "הוסף ל-Priority".
          </div>
        )}

        {call.sync_error && (
          <div className="tact-chip" style={{ display: 'block', padding: '10px 12px', marginBottom: 14, background: 'rgba(214,74,46,0.1)', color: 'var(--color-accent)' }}>
            שגיאת סנכרון: {call.sync_error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="כותרת">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="תיאור">
            <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="חברה">
            <input value={form.company} onChange={(e) => set('company', e.target.value)} />
          </Field>
          <Row>
            <Field label="קטגוריה">
              <select value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </Field>
            <Field label="דחיפות">
              <select value={form.urgency} onChange={(e) => set('urgency', e.target.value as Urgency)}>
                {URGENCIES.map((u) => <option key={u} value={u}>{URGENCY_LABELS[u]}</option>)}
              </select>
            </Field>
          </Row>
          <Field label="סטטוס">
            <select value={form.status} onChange={(e) => set('status', e.target.value as Status)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
          <Row>
            <Field label="לקוח">
              <input value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
            </Field>
            <Field label="אתר">
              <input value={form.site} onChange={(e) => set('site', e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="מספר סניף">
              <input dir="ltr" value={form.branch} onChange={(e) => set('branch', e.target.value)} />
            </Field>
            <Field label="מספר מכשיר (סידורי)">
              <input dir="ltr" value={form.device_sernum} onChange={(e) => set('device_sernum', e.target.value)} />
            </Field>
          </Row>
          {device && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary-soft)', fontSize: '0.85rem',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>מכשיר מקושר</div>
              <div dir="ltr" style={{ fontFamily: 'var(--font-family-en)' }}>{device.sernum} · {device.part_name}</div>
              {device.part_description && <div style={{ color: 'var(--color-text-light)' }}>{device.part_description}</div>}
              {device.status && <div style={{ color: 'var(--color-text-light)' }}>סטטוס: {device.status}</div>}
            </div>
          )}
          <Row>
            <Field label="טלפון">
              <input dir="ltr" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
            </Field>
            <Field label="הוקצה ל">
              <input value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} />
            </Field>
          </Row>

          {inPriority && (
            <div style={{
              padding: '12px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-white)', border: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: 2 }}>נתוני Priority</div>
              <Info label="סטטוס" value={call.priority_status} />
              <Info label="מספר חוזה" value={call.contract_number} extra={call.contract_status} ltr />
              <Info label="שולם עד" value={fmtDate(call.paid_until)} ltr />
              <Info label="תחילת השבתה" value={fmtDateTime(call.downtime_start)} ltr />
              <Info label="סיום השבתה" value={fmtDateTime(call.downtime_end)} ltr />
              <Info label="סניף" value={call.branch} extra={call.branch_description} ltr />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button
            className={inPriority ? 'tact-btn tact-btn-primary' : 'tact-btn tact-btn-ghost'}
            disabled={busy}
            onClick={save}
          >
            שמירה
          </button>
          {!inPriority && (
            <button
              className="tact-btn tact-btn-primary"
              disabled={busy}
              onClick={push}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <TactIcon name="send" size={16} />
              הוסף ל-Priority
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function fmtDate(v: string | null): string {
  return v ? v.slice(0, 10) : ''
}
function fmtDateTime(v: string | null): string {
  return v ? v.slice(0, 16).replace('T', ' ') : ''
}

function Info({ label, value, extra, ltr }: { label: string; value?: string | null; extra?: string | null; ltr?: boolean }) {
  if (!value && !extra) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--color-text-light)' }}>{label}</span>
      <span dir={ltr ? 'ltr' : undefined} style={{ fontWeight: 600, textAlign: 'left' }}>
        {value || '—'}{extra ? <span dir="rtl" style={{ color: 'var(--color-text-light)', fontWeight: 400 }}> · {extra}</span> : ''}
      </span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="tact-field">
      <label>{label}</label>
      {children}
    </div>
  )
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
}
