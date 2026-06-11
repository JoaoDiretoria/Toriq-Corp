from fastapi import APIRouter

from app.api.crud_factory import make_crud_router
from app.models import generated as m
from app.schemas import financeiro_cadastros as s

router = APIRouter(prefix="/financeiro/cadastros")

router.include_router(make_crud_router(
    model=m.Fornecedores,
    create_schema=s.FornecedorIn,
    update_schema=s.FornecedorIn,
    read_schema=s.FornecedorOut,
    prefix="/fornecedores",
    tags=["fornecedores"],
))

router.include_router(make_crud_router(
    model=m.FormasPagamento,
    create_schema=s.FormaPagamentoIn,
    update_schema=s.FormaPagamentoIn,
    read_schema=s.FormaPagamentoOut,
    prefix="/formas-pagamento",
    tags=["formas-pagamento"],
))

router.include_router(make_crud_router(
    model=m.FormasCobranca,
    create_schema=s.FormaCobrancaIn,
    update_schema=s.FormaCobrancaIn,
    read_schema=s.FormaCobrancaOut,
    prefix="/formas-cobranca",
    tags=["formas-cobranca"],
))

router.include_router(make_crud_router(
    model=m.CondicoesPagamento,
    create_schema=s.CondicaoPagamentoIn,
    update_schema=s.CondicaoPagamentoIn,
    read_schema=s.CondicaoPagamentoOut,
    prefix="/condicoes-pagamento",
    tags=["condicoes-pagamento"],
))

router.include_router(make_crud_router(
    model=m.CentrosCusto,
    create_schema=s.CentroCustoIn,
    update_schema=s.CentroCustoIn,
    read_schema=s.CentroCustoOut,
    prefix="/centros-custo",
    tags=["centros-custo"],
))

router.include_router(make_crud_router(
    model=m.ContasBancarias,
    create_schema=s.ContaBancariaIn,
    update_schema=s.ContaBancariaIn,
    read_schema=s.ContaBancariaOut,
    prefix="/contas-bancarias",
    tags=["contas-bancarias"],
))

router.include_router(make_crud_router(
    model=m.PlanoReceitas,
    create_schema=s.PlanoReceitaIn,
    update_schema=s.PlanoReceitaIn,
    read_schema=s.PlanoReceitaOut,
    prefix="/plano-receitas",
    tags=["plano-receitas"],
))

router.include_router(make_crud_router(
    model=m.PlanoDespesas,
    create_schema=s.PlanoDespesaIn,
    update_schema=s.PlanoDespesaIn,
    read_schema=s.PlanoDespesaOut,
    prefix="/plano-despesas",
    tags=["plano-despesas"],
))
