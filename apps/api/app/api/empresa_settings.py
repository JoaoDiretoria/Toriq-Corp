"""Configurações por empresa — todas com empresa_id (tenant via TenantRepository).

  /configuracoes-empresa  → configuracoes_empresa
  /empresa-configuracoes  → empresa_configuracoes
  /informacoes-empresa    → informacoes_empresa

Cada tabela tem UNIQUE(empresa_id) (uma linha por empresa), mas o CRUD genérico
expõe list/get/post/put/delete escopados por empresa_id. O TenantRepository força
o empresa_id do usuário — nenhum schema de entrada o expõe.
"""
from fastapi import APIRouter

from app.api.crud_factory import make_crud_router
from app.models import generated as m
from app.schemas import empresa_settings as s

router = APIRouter()

router.include_router(
    make_crud_router(
        model=m.ConfiguracoesEmpresa,
        create_schema=s.ConfiguracoesEmpresaIn,
        update_schema=s.ConfiguracoesEmpresaIn,
        read_schema=s.ConfiguracoesEmpresaOut,
        prefix="/configuracoes-empresa",
        tags=["configuracoes-empresa"],
    )
)

router.include_router(
    make_crud_router(
        model=m.EmpresaConfiguracoes,
        create_schema=s.EmpresaConfiguracoesIn,
        update_schema=s.EmpresaConfiguracoesIn,
        read_schema=s.EmpresaConfiguracoesOut,
        prefix="/empresa-configuracoes",
        tags=["empresa-configuracoes"],
    )
)

router.include_router(
    make_crud_router(
        model=m.InformacoesEmpresa,
        create_schema=s.InformacoesEmpresaIn,
        update_schema=s.InformacoesEmpresaIn,
        read_schema=s.InformacoesEmpresaOut,
        prefix="/informacoes-empresa",
        tags=["informacoes-empresa"],
    )
)
