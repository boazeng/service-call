// Colored chips for enum values, on-brand (steel structural, rust/green accents).
import {
  STATUS_LABELS, URGENCY_LABELS, SYNC_LABELS, SOURCE_LABELS, CATEGORY_LABELS,
  type Status, type Urgency, type SyncStatus, type Source, type Category,
} from '../lib/types'

type Style = { background: string; color: string; border?: string }

const URGENCY_STYLE: Record<Urgency, Style> = {
  low: { background: 'var(--color-primary-soft)', color: 'var(--color-text-light)' },
  medium: { background: 'var(--color-primary-soft)', color: 'var(--color-primary)' },
  high: { background: 'rgba(214,74,46,0.10)', color: 'var(--color-accent)' },
  urgent: { background: 'var(--color-accent)', color: '#fff' },
}

const SYNC_STYLE: Record<SyncStatus, Style> = {
  local_only: { background: 'rgba(214,74,46,0.12)', color: 'var(--color-accent)' },
  pending_push: { background: 'var(--color-bg)', color: 'var(--color-text-light)' },
  synced: { background: 'var(--color-pos-soft)', color: 'var(--color-pos)' },
  sync_error: { background: 'var(--color-accent)', color: '#fff' },
}

function Chip({ style, children }: { style: Style; children: string }) {
  return <span className="tact-chip" style={style}>{children}</span>
}

export function StatusChip({ value }: { value: Status }) {
  const on = value === 'closed' || value === 'cancelled'
  return (
    <Chip
      style={
        on
          ? { background: 'var(--color-bg)', color: 'var(--color-text-light)' }
          : { background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }
      }
    >
      {STATUS_LABELS[value]}
    </Chip>
  )
}

export function UrgencyChip({ value }: { value: Urgency }) {
  return <Chip style={URGENCY_STYLE[value]}>{URGENCY_LABELS[value]}</Chip>
}

export function SyncChip({ value }: { value: SyncStatus }) {
  return <Chip style={SYNC_STYLE[value]}>{SYNC_LABELS[value]}</Chip>
}

export function SourceChip({ value }: { value: Source }) {
  return (
    <Chip style={{ background: 'var(--color-bg)', color: 'var(--color-text-light)', border: '1px solid var(--color-border)' }}>
      {SOURCE_LABELS[value]}
    </Chip>
  )
}

export function CategoryChip({ value }: { value: Category }) {
  return (
    <Chip style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
      {CATEGORY_LABELS[value]}
    </Chip>
  )
}
