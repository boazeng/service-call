"""Production database initialization.

Run once on the server after deploy:  python -m app.bootstrap

Creates all tables (idempotent) and ensures an admin user from the
SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars (set in the server .env).
Safe to re-run — it resets the admin password to the configured value.
"""
from .auth.passwords import hash_password
from .config import settings
from .database import Base, SessionLocal, engine
from . import models  # noqa: F401 — registers tables on Base
from .models import User, UserRole


def run() -> None:
    Base.metadata.create_all(bind=engine)
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
