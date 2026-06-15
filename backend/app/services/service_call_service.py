"""Business logic for service calls: numbering, CRUD, filtered listing, bot ingest."""
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..models import ApiKey, ServiceCall, Source, Status, SyncStatus
from ..models.enums import Category
from ..schemas.service_call import (
    BotServiceCallIn,
    ServiceCallCreate,
    ServiceCallUpdate,
)

# A bot key's category maps to the matching bot source.
_CATEGORY_TO_BOT_SOURCE = {
    Category.MAINTENANCE: Source.BOT_MAINTENANCE,
    Category.ENERGY: Source.BOT_ENERGY,
    Category.OTHER: Source.BOT_MAINTENANCE,
}


def next_call_number(db: Session) -> str:
    """SC-<year>-<4-digit running number within the year>."""
    year = datetime.utcnow().year
    prefix = f"SC-{year}-"
    count = db.scalar(
        select(func.count())
        .select_from(ServiceCall)
        .where(ServiceCall.call_number.like(f"{prefix}%"))
    )
    return f"{prefix}{(count or 0) + 1:04d}"


def create_manual(db: Session, data: ServiceCallCreate) -> ServiceCall:
    call = ServiceCall(
        call_number=next_call_number(db),
        source=Source.MANUAL,
        sync_status=SyncStatus.LOCAL_ONLY,
        **data.model_dump(),
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


def ingest_from_bot(db: Session, key: ApiKey, payload: BotServiceCallIn) -> ServiceCall:
    """Create (or return existing) a service call from a bot POST.

    Dedup: a retry with the same (source, external_id) returns the existing row
    instead of creating a duplicate.
    """
    category = payload.category or Category(key.category)
    source = _CATEGORY_TO_BOT_SOURCE.get(category, Source.BOT_MAINTENANCE)

    if payload.external_id:
        existing = db.scalar(
            select(ServiceCall).where(
                ServiceCall.source == source,
                ServiceCall.external_id == payload.external_id,
            )
        )
        if existing:
            return existing

    call = ServiceCall(
        call_number=next_call_number(db),
        source=source,
        category=category,
        status=Status.NEW,
        sync_status=SyncStatus.LOCAL_ONLY,
        urgency=payload.urgency,
        title=payload.title,
        description=payload.description,
        company=payload.company,
        customer_name=payload.customer_name,
        site=payload.site,
        branch=payload.branch,
        device_sernum=payload.device_sernum,
        contact_phone=payload.contact_phone,
        external_id=payload.external_id,
        raw_payload=payload.model_dump(),
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


def get(db: Session, call_id: int) -> ServiceCall | None:
    return db.get(ServiceCall, call_id)


def update(db: Session, call: ServiceCall, data: ServiceCallUpdate) -> ServiceCall:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(call, field, value)
    db.commit()
    db.refresh(call)
    return call


def delete(db: Session, call: ServiceCall) -> None:
    db.delete(call)
    db.commit()


def list_calls(
    db: Session,
    *,
    status: str | None = None,
    source: str | None = None,
    category: str | None = None,
    urgency: str | None = None,
    sync_status: str | None = None,
    local_only: bool | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[ServiceCall], int]:
    """Filtered, paginated list. Returns (items, total)."""
    conditions = []
    if status:
        conditions.append(ServiceCall.status == status)
    if source:
        conditions.append(ServiceCall.source == source)
    if category:
        conditions.append(ServiceCall.category == category)
    if urgency:
        conditions.append(ServiceCall.urgency == urgency)
    if sync_status:
        conditions.append(ServiceCall.sync_status == sync_status)
    if local_only is True:
        conditions.append(ServiceCall.priority_doc_number.is_(None))
    elif local_only is False:
        conditions.append(ServiceCall.priority_doc_number.is_not(None))
    if search:
        like = f"%{search.strip()}%"
        conditions.append(
            or_(
                ServiceCall.title.ilike(like),
                ServiceCall.customer_name.ilike(like),
                ServiceCall.site.ilike(like),
                ServiceCall.call_number.ilike(like),
                ServiceCall.priority_doc_number.ilike(like),
            )
        )

    total = db.scalar(
        select(func.count()).select_from(ServiceCall).where(*conditions)
    ) or 0
    page = max(1, page)
    page_size = max(1, min(page_size, 200))
    items = list(
        db.scalars(
            select(ServiceCall)
            .where(*conditions)
            .order_by(ServiceCall.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return items, total
