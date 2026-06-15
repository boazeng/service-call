from datetime import datetime

from pydantic import BaseModel, ConfigDict

from ..models.enums import SyncDirection


class SyncLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    direction: SyncDirection
    status: str
    items_created: int
    items_updated: int
    items_failed: int
    message: str | None
    started_at: datetime
    finished_at: datetime | None


class SyncResult(BaseModel):
    """Returned by push/pull endpoints — a summary plus the log row."""
    ok: bool
    created: int = 0
    updated: int = 0
    failed: int = 0
    message: str = ""


class PriorityStatus(BaseModel):
    """Reported on the Integration screen so the user knows what's wired."""
    configured: bool
    use_mock: bool
    base_url: str
    company: str
    service_entity: str
