// Shared API types + Hebrew labels for enum values.

export type Role = 'admin' | 'operator'
export type Source = 'bot_maintenance' | 'bot_energy' | 'priority' | 'manual'
export type Category = 'maintenance' | 'energy' | 'other'
export type Status =
  | 'new' | 'in_review' | 'ready_to_send' | 'sent'
  | 'in_progress' | 'closed' | 'cancelled'
export type Urgency = 'low' | 'medium' | 'high' | 'urgent'
export type SyncStatus = 'local_only' | 'pending_push' | 'synced' | 'sync_error'

export type User = {
  id: number
  email: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
}

export type ServiceCall = {
  id: number
  call_number: string
  priority_doc_number: string | null
  source: Source
  category: Category
  status: Status
  urgency: Urgency
  title: string
  description: string | null
  company: string | null
  customer_name: string | null
  site: string | null
  branch: string | null
  branch_description: string | null
  device_sernum: string | null
  contact_phone: string | null
  assigned_to: string | null
  sync_status: SyncStatus
  priority_status: string | null
  contract_number: string | null
  contract_status: string | null
  paid_until: string | null
  downtime_start: string | null
  downtime_end: string | null
  device_part_description: string | null
  device_site_description: string | null
  external_id: string | null
  sync_error: string | null
  created_at: string
  updated_at: string
  sent_to_priority_at: string | null
  last_synced_at: string | null
}

export type ServiceCallList = {
  items: ServiceCall[]
  total: number
  page: number
  page_size: number
}

export type Device = {
  id: number
  sernum: string
  sernum_suffix: string | null
  part_name: string | null
  part_description: string | null
  customer_code: string | null
  customer_name: string | null
  contact_name: string | null
  branch: string | null
  phone: string | null
  site_code: string | null
  site_description: string | null
  service_contract: string | null
  zone_code: string | null
  zone_description: string | null
  install_date: string | null
  status: string | null
  family_name: string | null
  family_description: string | null
  facility_name: string | null
  facility_description: string | null
  last_synced_at: string | null
  created_at: string
}

export type DeviceList = {
  items: Device[]
  total: number
  page: number
  page_size: number
}

export type ApiKey = {
  id: number
  label: string
  category: Category
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export type SyncLog = {
  id: number
  direction: 'push' | 'pull' | 'devices'
  status: string
  items_created: number
  items_updated: number
  items_failed: number
  message: string | null
  started_at: string
  finished_at: string | null
}

export type IntegrationStatus = {
  configured: boolean
  use_mock: boolean
  base_url: string
  company: string
  service_entity: string
}

// ---- Hebrew labels ----
export const SOURCE_LABELS: Record<Source, string> = {
  bot_maintenance: 'בוט אחזקה',
  bot_energy: 'בוט אנרגיה',
  priority: 'Priority',
  manual: 'ידני',
}
export const CATEGORY_LABELS: Record<Category, string> = {
  maintenance: 'אחזקה',
  energy: 'אנרגיה',
  other: 'אחר',
}
export const STATUS_LABELS: Record<Status, string> = {
  new: 'חדשה',
  in_review: 'בבדיקה',
  ready_to_send: 'מוכנה לשליחה',
  sent: 'נשלחה ל-Priority',
  in_progress: 'בטיפול',
  closed: 'סגורה',
  cancelled: 'בוטלה',
}
export const URGENCY_LABELS: Record<Urgency, string> = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
  urgent: 'דחופה',
}
export const SYNC_LABELS: Record<SyncStatus, string> = {
  local_only: 'מקומית בלבד',
  pending_push: 'ממתינה לשליחה',
  synced: 'מסונכרנת',
  sync_error: 'שגיאת סנכרון',
}
