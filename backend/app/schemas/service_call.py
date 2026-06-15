from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from ..models.enums import Source, Category, Status, Urgency, SyncStatus


class ServiceCallBase(BaseModel):
    title: str = ""
    description: str | None = None
    company: str | None = None
    category: Category = Category.OTHER
    urgency: Urgency = Urgency.MEDIUM
    customer_name: str | None = None
    site: str | None = None
    branch: str | None = None
    device_sernum: str | None = None
    contact_phone: str | None = None
    assigned_to: str | None = None


class ServiceCallCreate(ServiceCallBase):
    """Create a call by hand from the management UI."""
    status: Status = Status.NEW


class ServiceCallUpdate(BaseModel):
    """Partial update from the management UI — every field optional."""
    title: str | None = None
    description: str | None = None
    company: str | None = None
    category: Category | None = None
    urgency: Urgency | None = None
    status: Status | None = None
    customer_name: str | None = None
    site: str | None = None
    branch: str | None = None
    device_sernum: str | None = None
    contact_phone: str | None = None
    assigned_to: str | None = None


class BotServiceCallIn(BaseModel):
    """Payload an external bot POSTs to /api/v1/service-calls (X-API-Key auth)."""
    title: str = Field(..., min_length=1)
    description: str | None = None
    company: str | None = None
    customer_name: str | None = None
    site: str | None = None
    contact_phone: str | None = None
    branch: str | None = None
    device_sernum: str | None = None
    urgency: Urgency = Urgency.MEDIUM
    # Optional overrides; default category comes from the API key.
    category: Category | None = None
    # The bot's own reference id — used to dedup retries.
    external_id: str | None = None
    # Anything else the bot wants preserved for audit.
    extra: dict | None = None


class ServiceCallOut(ServiceCallBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    call_number: str
    priority_doc_number: str | None
    source: Source
    status: Status
    sync_status: SyncStatus
    priority_status: str | None
    branch_description: str | None = None
    contract_number: str | None = None
    contract_status: str | None = None
    paid_until: str | None = None
    downtime_start: str | None = None
    downtime_end: str | None = None
    # תאור מתקן — description of the linked device (Device.part_description).
    device_part_description: str | None = None
    external_id: str | None
    sync_error: str | None
    created_at: datetime
    updated_at: datetime
    sent_to_priority_at: datetime | None
    last_synced_at: datetime | None


class ServiceCallList(BaseModel):
    items: list[ServiceCallOut]
    total: int
    page: int
    page_size: int
