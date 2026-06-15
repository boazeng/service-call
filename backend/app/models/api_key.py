from datetime import datetime

from sqlalchemy import String, DateTime, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class ApiKey(Base):
    """An API key used by an external bot to POST service calls into this system.

    The raw key is shown only once at creation; we persist only its sha256 hash
    plus a short non-secret prefix so the UI can identify the key in a list.
    `category` is the default category stamped on calls ingested with this key.
    """

    __tablename__ = "api_keys"
    __table_args__ = (Index("ix_api_keys_hash", "key_hash"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    # Default category for calls created with this key: maintenance | energy | other
    category: Mapped[str] = mapped_column(String(20), nullable=False, default="other")
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
