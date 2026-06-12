"""Serviços do módulo Notificações.

A função ``criar_notificacao`` é o equivalente Python da função PG
``criar_notificacao`` invocada por triggers.  Outros módulos podem chamá-la
diretamente após realizar operações que precisam notificar o tenant.
"""
import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m


async def criar_notificacao(
    db: AsyncSession,
    *,
    empresa_id: uuid.UUID,
    titulo: str,
    mensagem: str,
    tipo: str = "info",          # info | success | warning | error
    categoria: str = "sistema",
    modulo: Optional[str] = None,
    tela: Optional[str] = None,
    referencia_tipo: Optional[str] = None,
    referencia_id: Optional[uuid.UUID] = None,
    referencia_dados: Optional[Any] = None,
    usuario_id: Optional[uuid.UUID] = None,
    usuario_nome: Optional[str] = None,
) -> m.Notificacoes:
    """Insere uma notificação para o tenant *empresa_id* e retorna o objeto
    persistido.

    Parâmetros
    ----------
    db          : sessão async do SQLAlchemy.
    empresa_id  : obrigatório — toda notificação pertence a um tenant.
    titulo      : título curto da notificação.
    mensagem    : corpo da mensagem.
    tipo        : visual — ``info``, ``success``, ``warning`` ou ``error``.
    categoria   : categoria de domínio (treinamento, epi, financeiro, …).
    modulo      : módulo do sistema associado (opcional).
    tela        : tela/rota de destino (opcional).
    referencia_tipo : tipo do registro relacionado para navegação (opcional).
    referencia_id   : id do registro relacionado (opcional).
    referencia_dados: JSON com dados extras de navegação (opcional).
    usuario_id  : FK para ``users.id`` do destinatário (opcional).
    usuario_nome: nome do usuário em texto livre (opcional, desnormalizado).
    """
    notif = m.Notificacoes(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        tipo=tipo,
        categoria=categoria,
        titulo=titulo,
        mensagem=mensagem,
        modulo=modulo,
        tela=tela,
        referencia_tipo=referencia_tipo,
        referencia_id=referencia_id,
        referencia_dados=referencia_dados,
        usuario_id=usuario_id,
        usuario_nome=usuario_nome,
        lida=False,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif
