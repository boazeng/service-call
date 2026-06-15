from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root = service-call/ (config.py is at backend/app/config.py).
PROJECT_ROOT = Path(__file__).resolve().parents[2]
# All DB artifacts live under service-call/database/. Absolute path → the DB file
# is the same no matter which directory the process is launched from.
DB_FILE = PROJECT_ROOT / "database" / "servicecall.db"

# Shared env used by all of the user's projects, plus a project-local .env that
# overrides it. Later files in the tuple take precedence in pydantic-settings.
SHARED_ENV = Path(r"C:\Users\User\Aiprojects\env\.env")
LOCAL_ENV = PROJECT_ROOT / "backend" / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(SHARED_ENV), str(LOCAL_ENV)),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "TACT Service-Call"
    app_env: str = "development"
    # Local dev defaults to SQLite at service-call/database/servicecall.db (absolute,
    # so CWD never matters). For Postgres set:
    # DATABASE_URL=postgresql+pg8000://sc:sc@localhost:5432/servicecall
    database_url: str = f"sqlite:///{DB_FILE.as_posix()}"
    # Postgres connection pool — kept tiny so many warm Lambda containers don't
    # exhaust RDS max_connections.
    db_pool_size: int = 2
    db_max_overflow: int = 3
    cors_origins: str = "http://localhost:5300"

    # JWT — replace in production with a long random value via .env
    jwt_secret: str = "dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_ttl_hours: int = 24

    # Allow /api/auth/dev-login (email-only, no password) only while True.
    # MUST be False in any deployed environment.
    enable_dev_login: bool = True

    # Production admin seeded by `python -m app.bootstrap` (set in the server .env).
    seed_admin_email: str = ""
    seed_admin_password: str = ""

    # ---- Priority ERP integration ----
    # Base URL of the Priority OData/REST API, e.g.
    # https://priority.example.co.il/odata/Priority/tabula.ini/<company>
    priority_base_url: str = ""
    priority_company: str = ""
    priority_user: str = ""
    priority_password: str = ""
    # The Priority entity/form that holds service calls. In the urbangroup Priority
    # setup this is DOCUMENTS_Q (service-call documents, TYPE='Q').
    priority_service_entity: str = "DOCUMENTS_Q"
    # Import only open calls (ACTIVEFLAG eq 'Y'); avoids pulling years of closed ones.
    priority_active_only: bool = True
    # When True the Priority client returns deterministic mock data instead of
    # hitting the real API — lets the full push/pull flow run before credentials
    # are wired in.
    priority_use_mock: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() in ("development", "dev", "local")


settings = Settings()
