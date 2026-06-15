"""Admin management of bot API keys."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.keys import generate_api_key
from ..deps import get_db, require_admin
from ..models import ApiKey, User
from ..schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyOut

router = APIRouter(prefix="/api/api-keys", tags=["api-keys"])


@router.get("", response_model=list[ApiKeyOut])
def list_keys(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
def create_key(
    body: ApiKeyCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    raw, prefix, key_hash = generate_api_key()
    key = ApiKey(
        label=body.label,
        category=body.category,
        key_prefix=prefix,
        key_hash=key_hash,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return ApiKeyCreated.model_validate({**ApiKeyOut.model_validate(key).model_dump(), "raw_key": raw})


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_key(key_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    key = db.get(ApiKey, key_id)
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    key.is_active = False
    db.commit()
