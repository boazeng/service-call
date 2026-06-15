"""Dependency injection: DB session, authenticated user, permission gates, API key.

Two authentication paths:
  • JWT (admin UI)            → get_current_user / require_admin
  • X-API-Key (bot ingest)    → get_api_key
Single organization — no tenant scoping.
"""
from datetime import datetime

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
import jwt

from .auth.keys import hash_key
from .auth.tokens import decode_token
from .database import SessionLocal
from .models import ApiKey, User, UserRole


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> User:
    """Resolve the authenticated user from `Authorization: Bearer <jwt>`."""
    if not authorization:
        raise _unauthorized("Missing Authorization header")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise _unauthorized("Authorization header must be 'Bearer <token>'")

    try:
        user_id = decode_token(parts[1])
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Token expired")
    except jwt.PyJWTError:
        raise _unauthorized("Invalid token")

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise _unauthorized("User not found or inactive")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin only"
        )
    return user


def get_api_key(
    db: Session = Depends(get_db),
    x_api_key: str | None = Header(default=None),
) -> ApiKey:
    """Resolve and validate the bot's API key from the `X-API-Key` header."""
    if not x_api_key:
        raise _unauthorized("Missing X-API-Key header")
    key = (
        db.query(ApiKey)
        .filter(ApiKey.key_hash == hash_key(x_api_key), ApiKey.is_active.is_(True))
        .first()
    )
    if not key:
        raise _unauthorized("Invalid or revoked API key")
    key.last_used_at = datetime.utcnow()
    db.commit()
    return key
