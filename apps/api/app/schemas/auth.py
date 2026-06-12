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


class ProfileOut(BaseModel):
    """Perfil de negócio (espelha o que o front consome em `useAuth`).

    Campos sensíveis da tabela (nenhum aqui) ficam de fora de propósito.
    """

    id: uuid.UUID
    email: str | None = None
    nome: str | None = None
    role: str
    empresa_id: uuid.UUID | None = None
    setor_id: uuid.UUID | None = None
    grupo_acesso: str | None = None
    primeiro_acesso: bool | None = None
    senha_alterada: bool | None = None
    ativo: bool | None = None
    motivo_desativacao: str | None = None

    model_config = {"from_attributes": True}


class EmpresaOut(BaseModel):
    """Empresa do usuário — só os campos públicos (sem certificado/senha A1)."""

    id: uuid.UUID
    nome: str
    tipo: str
    cidade: str | None = None
    estado: str | None = None
    logo_url: str | None = None

    model_config = {"from_attributes": True}


class MeOut(BaseModel):
    """Sessão atual: usuário (credenciais) + perfil + empresa."""

    user: UserOut
    profile: ProfileOut | None = None
    empresa: EmpresaOut | None = None
