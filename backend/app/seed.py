"""Seed the initial admin + a demo operator for local development."""
from sqlalchemy.orm import Session

from .auth.passwords import hash_password
from .models import User, UserRole

_SEED_USERS = [
    {"email": "admin@tact.co.il", "full_name": "מנהל מערכת", "role": UserRole.ADMIN,
     "password": "admin123"},
    {"email": "operator@tact.co.il", "full_name": "מוקדן", "role": UserRole.OPERATOR,
     "password": "operator123"},
]


def seed_users(db: Session) -> None:
    for spec in _SEED_USERS:
        if db.query(User).filter(User.email == spec["email"]).first():
            continue
        db.add(
            User(
                email=spec["email"],
                full_name=spec["full_name"],
                role=spec["role"],
                password_hash=hash_password(spec["password"]),
            )
        )
    db.commit()
