"""Inbound ingest endpoint for EXTERNAL bots (X-API-Key auth).

This is the only programmatic write path. No bot logic lives here — bots are
separate systems that simply POST their service calls to this endpoint.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..deps import get_api_key, get_db
from ..models import ApiKey
from ..schemas.service_call import BotServiceCallIn, ServiceCallOut
from ..services import service_call_service

router = APIRouter(prefix="/api/v1", tags=["bot-ingest"])


@router.post(
    "/service-calls",
    response_model=ServiceCallOut,
    status_code=status.HTTP_201_CREATED,
)
def ingest_service_call(
    body: BotServiceCallIn,
    db: Session = Depends(get_db),
    key: ApiKey = Depends(get_api_key),
):
    """A bot submits a new service call. Dedups on (source, external_id)."""
    return service_call_service.ingest_from_bot(db, key, body)
