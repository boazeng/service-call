from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from ..models.enums import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class DevLoginRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = ""
    password: str | None = None
    role: UserRole = UserRole.OPERATOR


class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
