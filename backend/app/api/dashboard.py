"""Dashboard KPIs."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models import ServiceCall, Status, User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

_OPEN_STATUSES = (Status.NEW, Status.IN_REVIEW, Status.READY_TO_SEND, Status.IN_PROGRESS)


def _count_by(db: Session, column) -> dict[str, int]:
    rows = db.execute(select(column, func.count()).group_by(column)).all()
    return {str(k): v for k, v in rows}


@router.get("/summary")
def summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total = db.scalar(select(func.count()).select_from(ServiceCall)) or 0
    open_count = (
        db.scalar(
            select(func.count())
            .select_from(ServiceCall)
            .where(ServiceCall.status.in_([s.value for s in _OPEN_STATUSES]))
        )
        or 0
    )
    # Local bot/manual calls not yet pushed to Priority.
    local_only = (
        db.scalar(
            select(func.count())
            .select_from(ServiceCall)
            .where(ServiceCall.priority_doc_number.is_(None))
        )
        or 0
    )
    return {
        "total": total,
        "open": open_count,
        "local_only": local_only,
        "by_category": _count_by(db, ServiceCall.category),
        "by_urgency": _count_by(db, ServiceCall.urgency),
        "by_status": _count_by(db, ServiceCall.status),
        "by_source": _count_by(db, ServiceCall.source),
    }
