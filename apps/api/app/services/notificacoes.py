"""Serviços do módulo Notificações.

A função ``criar_notificacao`` é o equivalente Python da função PG
``criar_notificacao`` invocada por triggers.  Outros módulos podem chamá-la
diretamente após realizar operações que precisam notificar o tenant.

``notificar`` é o ponto de entrada de alto nível: além de persistir, publica
um evento SSE (``notificacao_nova``) no canal da empresa para PUSH em tempo
real no sino do front. Prefira ``notificar`` nos services de domínio.
"""
import logging
import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import publicar
from app.models import generated as m

logger = logging.getLogger("toriq.notificacoes")


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


def _evento_de(notif: m.Notificacoes) -> dict:
    """Monta o payload SSE a partir de uma notificação persistida.

    Inclui campos suficientes para o sino renderizar o item SEM refetch.
    """
    return {
        "tipo": "notificacao_nova",
        "notificacao": {
            "id": str(notif.id),
            "empresa_id": str(notif.empresa_id),
            "usuario_id": str(notif.usuario_id) if notif.usuario_id else None,
            "usuario_nome": notif.usuario_nome,
            "tipo": notif.tipo,
            "categoria": notif.categoria,
            "titulo": notif.titulo,
            "mensagem": notif.mensagem,
            "modulo": notif.modulo,
            "tela": notif.tela,
            "referencia_tipo": notif.referencia_tipo,
            "referencia_id": str(notif.referencia_id) if notif.referencia_id else None,
            "referencia_dados": notif.referencia_dados or {},
            "lida": False,
            "created_at": notif.created_at.isoformat() if notif.created_at else None,
        },
    }


async def notificar(
    db: AsyncSession,
    *,
    empresa_id: uuid.UUID,
    titulo: str,
    mensagem: str,
    tipo: str = "info",
    categoria: str = "sistema",
    modulo: Optional[str] = None,
    tela: Optional[str] = None,
    referencia_tipo: Optional[str] = None,
    referencia_id: Optional[uuid.UUID] = None,
    referencia_dados: Optional[Any] = None,
    usuario_id: Optional[uuid.UUID] = None,
    usuario_nome: Optional[str] = None,
) -> Optional[m.Notificacoes]:
    """Cria a notificação E publica o evento SSE de push.

    NUNCA levanta para o chamador: notificar é um efeito colateral de domínio —
    falhar aqui não pode derrubar a operação principal (criar lead, empresa…).
    Em erro, loga e retorna ``None``.
    """
    try:
        notif = await criar_notificacao(
            db,
            empresa_id=empresa_id,
            titulo=titulo,
            mensagem=mensagem,
            tipo=tipo,
            categoria=categoria,
            modulo=modulo,
            tela=tela,
            referencia_tipo=referencia_tipo,
            referencia_id=referencia_id,
            referencia_dados=referencia_dados,
            usuario_id=usuario_id,
            usuario_nome=usuario_nome,
        )
    except Exception as exc:  # pragma: no cover
        logger.warning("notificar: falha ao persistir (%s) — ignorado.", exc)
        return None

    # Push em tempo real (no-op gracioso se Redis ausente).
    await publicar(empresa_id, _evento_de(notif))
    return notif
