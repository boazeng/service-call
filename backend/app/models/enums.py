"""Domain enumerations. Stored as short strings in the DB (not native SQL enums)
so values stay portable across SQLite/Postgres and easy to map to/from Priority."""
try:
    from enum import StrEnum  # Python 3.11+
except ImportError:  # Python 3.10 and earlier
    from enum import Enum

    class StrEnum(str, Enum):
        """Minimal StrEnum backport: members are real str instances."""
        def __str__(self) -> str:  # match 3.11 StrEnum behavior
            return str(self.value)


class UserRole(StrEnum):
    ADMIN = "admin"        # full access incl. user + API-key + integration mgmt
    OPERATOR = "operator"  # view/edit service calls, send to Priority


class Source(StrEnum):
    BOT_MAINTENANCE = "bot_maintenance"
    BOT_ENERGY = "bot_energy"
    PRIORITY = "priority"   # created directly in Priority, pulled in by sync
    MANUAL = "manual"       # created by hand in this app


class Category(StrEnum):
    MAINTENANCE = "maintenance"
    ENERGY = "energy"
    OTHER = "other"


class Status(StrEnum):
    NEW = "new"
    IN_REVIEW = "in_review"
    READY_TO_SEND = "ready_to_send"
    SENT = "sent"            # pushed to Priority
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class Urgency(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class SyncStatus(StrEnum):
    LOCAL_ONLY = "local_only"   # exists only here; not yet in Priority
    PENDING_PUSH = "pending_push"
    SYNCED = "synced"           # mirrors a Priority document
    SYNC_ERROR = "sync_error"


class SyncDirection(StrEnum):
    PUSH = "push"
    PULL = "pull"
    DEVICES = "devices"
