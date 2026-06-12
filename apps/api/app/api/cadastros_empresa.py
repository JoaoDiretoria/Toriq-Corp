"""Cadastros simples escopados por empresa (contatos, categorias, origens).

Todas as tabelas têm coluna de tenant `empresa_id`, então usam o
TenantRepository genérico via make_crud_router (isolamento estrutural).

Segurança:
- Os schemas de entrada não expõem `empresa_id` nem qualquer FK de tenant;
  o empresa_id é sempre forçado pelo repositório a partir do usuário logado.
- Nenhuma destas tabelas tem FK de parentesco no payload de criação, logo não
  há validação cross-tenant de FK a aplicar (são cadastros-folha).
"""
from fastapi import APIRouter

from app.api.crud_factory import make_crud_router
from app.models import generated as m
from app.schemas import cadastros_empresa as s

router = APIRouter(prefix="/cadastros")

# ── Contatos de empresa ───────────────────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.EmpresaContatos,
    create_schema=s.EmpresaContatoIn,
    update_schema=s.EmpresaContatoIn,
    read_schema=s.EmpresaContatoOut,
    prefix="/empresa-contatos",
    tags=["empresa-contatos"],
))

# ── Categorias de cliente (por empresa) ───────────────────────────────────────
router.include_router(make_crud_router(
    model=m.CategoriasClientesEmpresa,
    create_schema=s.CategoriaClienteEmpresaIn,
    update_schema=s.CategoriaClienteEmpresaIn,
    read_schema=s.CategoriaClienteEmpresaOut,
    prefix="/categorias-clientes-empresa",
    tags=["categorias-clientes-empresa"],
))

# ── Origens de contato/lead ───────────────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.OrigensContato,
    create_schema=s.OrigemContatoIn,
    update_schema=s.OrigemContatoIn,
    read_schema=s.OrigemContatoOut,
    prefix="/origens-contato",
    tags=["origens-contato"],
))
