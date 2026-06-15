from datetime import datetime

from pydantic import BaseModel, ConfigDict

from ..models.enums import Category


class ApiKeyCreate(BaseModel):
    label: str
    category: Category = Category.OTHER


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    category: Category
    key_prefix: str
    is_active: bool
    last_used_at: datetime | None
    created_at: datetime


class ApiKeyCreated(ApiKeyOut):
    """Returned once on creation — includes the raw key, never stored or shown again."""
    raw_key: str
