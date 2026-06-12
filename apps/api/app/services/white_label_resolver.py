"""Resolver de white-label — porte das RPCs Supabase para Python.

Determina a "empresa SST pai" (dona da configuração white-label) a partir de
uma empresa ou de um usuário, navegando a hierarquia de tenants:

  tipo de empresa     | resolução
  --------------------|--------------------------------------------------------
  vertical_on         | None (admin da vertical — sem white-label de cliente)
  sst                 | a própria empresa
  cliente_final       | clientes_sst.empresa_sst_id (via cliente_empresa_id)
  empresa_parceira    | empresas_parceiras.empresa_sst_id (via parceira_empresa_id)
  (outro / None)      | None

Por usuário, partimos do profile (empresa_id + role):
  admin_vertical      | None
  instrutor           | instrutores.empresa_id (via user_id) ou None
  (demais roles)      | resolve_empresa_sst_pai(profile.empresa_id) ou None
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m
from app.models.treinamentos import Instrutores


async def resolve_empresa_sst_pai(
    db: AsyncSession, empresa_id: uuid.UUID
) -> uuid.UUID | None:
    """Resolve a empresa SST "pai" de uma empresa, conforme seu tipo."""
    tipo = await db.scalar(
        select(m.Empresas.tipo).where(m.Empresas.id == empresa_id)
    )
    if tipo is None:
        return None

    # tipo pode vir como Enum TipoEmpresa ou str — normaliza para o .value
    tipo_val = getattr(tipo, "value", tipo)

    if tipo_val == "vertical_on":
        return None
    if tipo_val == "sst":
        return empresa_id
    if tipo_val == "cliente_final":
        return await db.scalar(
            select(m.ClientesSst.empresa_sst_id)
            .where(m.ClientesSst.cliente_empresa_id == empresa_id)
            .limit(1)
        )
    if tipo_val == "empresa_parceira":
        return await db.scalar(
            select(m.EmpresasParceiras.empresa_sst_id)
            .where(m.EmpresasParceiras.parceira_empresa_id == empresa_id)
            .limit(1)
        )
    return None


async def resolve_by_user(
    db: AsyncSession, user_id: uuid.UUID
) -> uuid.UUID | None:
    """Resolve a empresa SST "pai" a partir do profile de um usuário."""
    row = (
        await db.execute(
            select(m.Profiles.empresa_id, m.Profiles.role).where(
                m.Profiles.id == user_id
            )
        )
    ).first()
    if row is None:
        return None

    empresa_id, role = row
    if role is None:
        return None

    role_val = getattr(role, "value", role)

    if role_val == "admin_vertical":
        return None
    if role_val == "instrutor":
        return await db.scalar(
            select(Instrutores.empresa_id)
            .where(Instrutores.user_id == user_id)
            .limit(1)
        )

    if empresa_id is not None:
        return await resolve_empresa_sst_pai(db, empresa_id)
    return None
