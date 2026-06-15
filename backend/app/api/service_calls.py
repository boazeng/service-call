"""Management API for service calls (JWT-authenticated UI)."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models import User
from ..schemas.service_call import (
    ServiceCallCreate,
    ServiceCallList,
    ServiceCallOut,
    ServiceCallUpdate,
)
from ..services import service_call_service, sync_service
from ..services.priority_service import PriorityError

router = APIRouter(prefix="/api/service-calls", tags=["service-calls"])


@router.get("", response_model=ServiceCallList)
def list_calls(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    status_: str | None = Query(default=None, alias="status"),
    priority_status: str | None = None,
    show_final: bool = False,
    show_cancelled: bool = False,
    source: str | None = None,
    category: str | None = None,
    urgency: str | None = None,
    sync_status: str | None = None,
    local_only: bool | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 50,
):
    items, total = service_call_service.list_calls(
        db,
        status=status_,
        priority_status=priority_status,
        show_final=show_final,
        show_cancelled=show_cancelled,
        source=source,
        category=category,
        urgency=urgency,
        sync_status=sync_status,
        local_only=local_only,
        search=search,
        page=page,
        page_size=page_size,
    )
    return ServiceCallList(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=ServiceCallOut, status_code=status.HTTP_201_CREATED)
def create_call(
    body: ServiceCallCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return service_call_service.create_manual(db, body)


def _get_or_404(db: Session, call_id: int):
    call = service_call_service.get(db, call_id)
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return call


@router.get("/{call_id}", response_model=ServiceCallOut)
def get_call(call_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _get_or_404(db, call_id)


@router.patch("/{call_id}", response_model=ServiceCallOut)
def update_call(
    call_id: int,
    body: ServiceCallUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return service_call_service.update(db, _get_or_404(db, call_id), body)


@router.delete("/{call_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_call(call_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    service_call_service.delete(db, _get_or_404(db, call_id))


@router.post("/{call_id}/push", response_model=ServiceCallOut)
def push_call(call_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Open this call in Priority (creates the Priority document)."""
    call = _get_or_404(db, call_id)
    if call.priority_doc_number:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Already in Priority (doc {call.priority_doc_number})",
        )
    try:
        return sync_service.push_call(db, call)
    except PriorityError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
