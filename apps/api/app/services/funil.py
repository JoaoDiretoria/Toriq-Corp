"""Serviço de funil — inclui a porta do trigger criar_configuracao_funil_padrao."""
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m


async def criar_configuracao_padrao(
    db: AsyncSession, funil: "m.Funis"
) -> "m.FunisConfiguracoes":
    """Ao criar um funil, cria sua configuração padrão conforme o tipo.

    Porta o trigger `criar_configuracao_funil_padrao`:
    - funis 'negocio': exibem valor, cliente, data, responsável, etiquetas e dashboard;
    - 'fluxo_trabalho': ocultam valor e dashboard por padrão.
    """
    is_negocio = funil.tipo == "negocio"
    cfg = m.FunisConfiguracoes(
        id=uuid.uuid4(),
        funil_id=funil.id,
        empresa_id=funil.empresa_id,
        modo_visualizacao="kanban",
        card_mostrar_valor=is_negocio,
        card_mostrar_cliente=True,
        card_mostrar_data=True,
        card_mostrar_responsavel=True,
        card_mostrar_etiquetas=True,
        dashboard_visivel=is_negocio,
        botao_adicionar_visivel=True,
    )
    db.add(cfg)
    await db.flush()
    return cfg
