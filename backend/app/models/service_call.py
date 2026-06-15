from datetime import datetime

from sqlalchemy import String, Text, DateTime, JSON, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base
from .enums import Source, Category, Status, Urgency, SyncStatus


class ServiceCall(Base):
    """A service call.

    Source-of-truth rule: a call is "local only" (exists only here, not yet in
    Priority) iff `priority_doc_number IS NULL`. Once it has a Priority document
    number it mirrors Priority, which is authoritative for the mapped fields.
    """

    __tablename__ = "service_calls"
    __table_args__ = (
        # A bot may retry; dedup on its own reference id per source.
        UniqueConstraint("source", "external_id", name="uq_service_calls_source_extid"),
        Index("ix_service_calls_priority_doc", "priority_doc_number", unique=True),
        Index("ix_service_calls_status", "status"),
        Index("ix_service_calls_sync_status", "sync_status"),
        Index("ix_service_calls_category", "category"),
        Index("ix_service_calls_company", "company"),
        Index("ix_service_calls_branch", "branch"),
        Index("ix_service_calls_device", "device_sernum"),
        Index("ix_service_calls_created", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # Internal human-friendly number, e.g. SC-2026-0001.
    call_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    # Priority document number — NULL until the call is pushed to / pulled from Priority.
    priority_doc_number: Mapped[str | None] = mapped_column(String(64))

    source: Mapped[str] = mapped_column(String(20), default=Source.MANUAL, nullable=False)
    category: Mapped[str] = mapped_column(String(20), default=Category.OTHER, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=Status.NEW, nullable=False)
    urgency: Mapped[str] = mapped_column(String(20), default=Urgency.MEDIUM, nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    description: Mapped[str | None] = mapped_column(Text)
    # The company the call belongs to (which TACT company / client company it is for).
    company: Mapped[str | None] = mapped_column(String(255))
    customer_name: Mapped[str | None] = mapped_column(String(255))
    site: Mapped[str | None] = mapped_column(String(255))
    branch: Mapped[str | None] = mapped_column(String(120))           # Priority BRANCHNAME
    branch_description: Mapped[str | None] = mapped_column(String(255))  # BRANCHDES
    device_sernum: Mapped[str | None] = mapped_column(String(120))    # links to Device.sernum
    contact_phone: Mapped[str | None] = mapped_column(String(40))
    # Contract + downtime, imported from Priority DOCUMENTS_Q.
    contract_number: Mapped[str | None] = mapped_column(String(80))    # CONTNUM
    contract_status: Mapped[str | None] = mapped_column(String(80))    # CONTSTATDES
    paid_until: Mapped[str | None] = mapped_column(String(40))         # EXPIRYDATE
    downtime_start: Mapped[str | None] = mapped_column(String(40))     # BREAKSTART
    downtime_end: Mapped[str | None] = mapped_column(String(40))       # BREAKEND
    open_date: Mapped[str | None] = mapped_column(String(40))          # Priority STARTDATE — תאריך/שעת פתיחה
    # Free-text fault description from Priority's DOCTEXT_Q_2_SUBFORM (תאור התקלה).
    fault_description: Mapped[str | None] = mapped_column(Text)
    assigned_to: Mapped[str | None] = mapped_column(String(160))

    # Sync bookkeeping.
    sync_status: Mapped[str] = mapped_column(
        String(20), default=SyncStatus.LOCAL_ONLY, nullable=False
    )
    priority_status: Mapped[str | None] = mapped_column(String(80))
    external_id: Mapped[str | None] = mapped_column(String(120))
    raw_payload: Mapped[dict | None] = mapped_column(JSON)
    sync_error: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    sent_to_priority_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime)
