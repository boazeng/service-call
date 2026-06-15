"""Production database initialization.

Run once on the server after deploy:  python -m app.bootstrap

Creates all tables (idempotent) and ensures an admin user from the
SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars (set in the server .env).
Safe to re-run — it resets the admin password to the configured value.
"""
from sqlalchemy import inspect, text

from .auth.passwords import hash_password
from .config import settings
from .database import Base, SessionLocal, engine
from . import models  # noqa: F401 — registers tables on Base
from .models import User, UserRole


def _ensure_columns() -> None:
    """Add any model columns missing from existing tables.

    create_all() creates missing *tables* but never alters existing ones, so a
    newly-added (nullable) column needs an explicit ALTER. Idempotent — only
    adds what's absent. Used in place of a full migration tool for this SQLite app.
    """
    insp = inspect(engine)
    existing = set(insp.get_table_names())
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing:
                continue  # create_all handles brand-new tables in full
            have = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name in have:
                    continue
                coltype = col.type.compile(dialect=engine.dialect)
                conn.execute(
                    text(f'ALTER TABLE "{table.name}" ADD COLUMN "{col.name}" {coltype}')
                )
                print(f"migrated: added {table.name}.{col.name} ({coltype})")


def run() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_columns()
    if not (settings.seed_admin_email and settings.seed_admin_password):
        print("tables ensured (no SEED_ADMIN_* set — skipped admin seed)")
        return

    email = settings.seed_admin_email.lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.password_hash = hash_password(settings.seed_admin_password)
            user.role = UserRole.ADMIN
            user.is_active = True
        else:
            db.add(
                User(
                    email=email,
                    full_name="מנהל מערכת",
                    role=UserRole.ADMIN,
                    password_hash=hash_password(settings.seed_admin_password),
                )
            )
        db.commit()
        print(f"admin ensured: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
