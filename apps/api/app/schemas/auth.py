import uuid

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    nome: str
    role: UserRole
    empresa_id: uuid.UUID | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    nome: str
    role: UserRole
    empresa_id: uuid.UUID | None

    model_config = {"from_attributes": True}
