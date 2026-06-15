"""Priority sync + integration status endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config import settings
from ..deps import get_current_user, get_db, require_admin
from ..models import SyncLog, User
from ..schemas.sync import PriorityStatus, SyncLogOut, SyncResult
from ..services import priority_service, sync_service
from ..services.priority_service import PriorityError

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.get("/status", response_model=PriorityStatus)
def integration_status(_: User = Depends(get_current_user)):
    return PriorityStatus(
        configured=priority_service.is_configured(),
        use_mock=settings.priority_use_mock,
        base_url=settings.priority_base_url,
        company=settings.priority_company,
        service_entity=settings.priority_service_entity,
    )


@router.post("/test")
def test_connection(_: User = Depends(require_admin)):
    """Verify the Priority connection without importing anything."""
    ok, message = priority_service.test_connection()
    return {"ok": ok, "message": message}


@router.get("/logs", response_model=list[SyncLogOut])
def sync_logs(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    limit: int = 30,
):
    return (
        db.query(SyncLog)
        .order_by(SyncLog.started_at.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )


@router.post("/pull", response_model=SyncResult)
def pull_now(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Pull the authoritative service-call list from Priority."""
    try:
        log = sync_service.pull_all(db)
    except PriorityError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    return SyncResult(
        ok=True,
        created=log.items_created,
        updated=log.items_updated,
        failed=log.items_failed,
        message=log.message or "",
    )


@router.post("/pull-devices", response_model=SyncResult)
def pull_devices_now(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Import devices/equipment from Priority SERNUMBERS."""
    try:
        log = sync_service.pull_devices_all(db)
    except PriorityError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    return SyncResult(
        ok=True,
        created=log.items_created,
        updated=log.items_updated,
        failed=log.items_failed,
        message=log.message or "",
    )
