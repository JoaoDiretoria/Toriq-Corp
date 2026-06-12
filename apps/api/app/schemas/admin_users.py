import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole

# Mínimo de senha (quando o admin/usuário fornece uma explicitamente).
MIN_SENHA = 8


class AdminUserCreateIn(BaseModel):
    """Criação de usuário pelo admin.

    `empresa_id` só é honrado para admin_vertical; para cliente_torq ele é
    validado contra a própria empresa (ou ignorado em favor dela).
    `password` é opcional — se ausente, gera-se uma senha temporária forte
    devolvida UMA única vez em `temp_password`.
    """

    email: EmailStr
    nome: str
    role: UserRole
    empresa_id: uuid.UUID | None = None
    password: str | None = Field(default=None, min_length=MIN_SENHA)


class AdminUserUpdateIn(BaseModel):
    """Atualização administrativa — NUNCA email, empresa_id ou senha."""

    nome: str | None = None
    role: UserRole | None = None
    ativo: bool | None = None


class AdminResetPasswordIn(BaseModel):
    """Nova senha definida pelo admin; se ausente gera temporária."""

    password: str | None = Field(default=None, min_length=MIN_SENHA)


class AdminUserOut(BaseModel):
    """Representação segura de usuário — NUNCA inclui senha_hash."""

    id: uuid.UUID
    email: EmailStr
    nome: str
    role: UserRole
    empresa_id: uuid.UUID | None
    ativo: bool

    model_config = {"from_attributes": True}


class AdminUserCreatedOut(AdminUserOut):
    """Resposta da criação — pode carregar a senha temporária gerada (1x)."""

    temp_password: str | None = None


class ChangePasswordIn(BaseModel):
    """Troca de senha do próprio usuário logado."""

    current_password: str
    new_password: str = Field(min_length=MIN_SENHA)
