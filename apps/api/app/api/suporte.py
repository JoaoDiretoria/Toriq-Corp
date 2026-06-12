"""Tickets/Suporte — CRUD de tickets, comentários, anexos e configuração de SLA.

Estrutura de rotas:
  GET/POST   /suporte/tickets                      — lista / cria ticket
  GET/PUT    /suporte/tickets/{ticket_id}           — detalhe / atualiza ticket
  DELETE     /suporte/tickets/{ticket_id}           — remove ticket
  GET/POST   /suporte/tickets/{ticket_id}/comentarios — filhos do ticket
  DELETE     /suporte/tickets/{ticket_id}/comentarios/{comentario_id}
  GET/POST   /suporte/tickets/{ticket_id}/anexos    — filhos do ticket
  DELETE     /suporte/tickets/{ticket_id}/anexos/{anexo_id}
  GET/PUT    /suporte/sla-config                   — config SLA da empresa (upsert)

Notas de segurança:
- TicketsSuporte não possui coluna `empresa_id`; usa `empresa_solicitante_id`
  como campo tenant — repositório customizado (_TicketRepo) reflete isso.
- Comentários e anexos são filhos de ticket; o ticket é validado como pertencente
  à empresa autenticada (404 em caso cross-tenant).
- Payload FKs que chegam no body: `empresa_destino_id` (opcional) — não há
  validação cruzada por ser referência livre.  `atendente_id` no update também
  é referência livre (usado por admins).
- TicketsSlaConfig tem empresa_id e é 1-to-1 com Empresas (UNIQUE empresa_id).
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.schemas import suporte as s

router = APIRouter(prefix="/suporte", tags=["suporte"])


# ── Helpers de tenant ─────────────────────────────────────────────────────────

def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


async def _get_ticket_scoped(
    ticket_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.TicketsSuporte:
    """Retorna ticket garantindo que pertence à empresa autenticada (empresa_solicitante_id)."""
    ticket = await db.scalar(
        select(m.TicketsSuporte).where(
            m.TicketsSuporte.id == ticket_id,
            m.TicketsSuporte.empresa_solicitante_id == empresa_id,
        )
    )
    if ticket is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ticket não encontrado")
    return ticket


# ── Tickets ───────────────────────────────────────────────────────────────────

@router.get("/tickets", response_model=list[s.TicketOut])
async def listar_tickets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(m.TicketsSuporte).where(
            m.TicketsSuporte.empresa_solicitante_id == empresa_id
        )
    )
    return list(result)


@router.post("/tickets", response_model=s.TicketOut, status_code=status.HTTP_201_CREATED)
async def criar_ticket(
    payload: s.TicketIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    data = payload.model_dump(exclude_unset=True)
    ticket = m.TicketsSuporte(
        id=uuid.uuid4(),
        empresa_solicitante_id=empresa_id,
        solicitante_id=user.id,
        solicitante_nome=getattr(user, "nome", str(user.id)),
        solicitante_email=getattr(user, "email", None),
        **data,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/tickets/{ticket_id}", response_model=s.TicketOut)
async def obter_ticket(
    ticket_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    return await _get_ticket_scoped(ticket_id, db, empresa_id)


@router.put("/tickets/{ticket_id}", response_model=s.TicketOut)
async def atualizar_ticket(
    ticket_id: uuid.UUID,
    payload: s.TicketUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    ticket = await _get_ticket_scoped(ticket_id, db, empresa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(ticket, k, v)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_ticket(
    ticket_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.execute(
        sa_delete(m.TicketsSuporte).where(
            m.TicketsSuporte.id == ticket_id,
            m.TicketsSuporte.empresa_solicitante_id == empresa_id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ticket não encontrado")


# ── Comentários (filhos de ticket) ────────────────────────────────────────────

@router.get(
    "/tickets/{ticket_id}/comentarios",
    response_model=list[s.ComentarioOut],
)
async def listar_comentarios(
    ticket_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    # Valida que o ticket pertence à empresa (404 em cross-tenant)
    await _get_ticket_scoped(ticket_id, db, empresa_id)
    result = await db.scalars(
        select(m.TicketsSuporteComentarios).where(
            m.TicketsSuporteComentarios.ticket_id == ticket_id
        )
    )
    return list(result)


@router.post(
    "/tickets/{ticket_id}/comentarios",
    response_model=s.ComentarioOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_comentario(
    ticket_id: uuid.UUID,
    payload: s.ComentarioIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_ticket_scoped(ticket_id, db, empresa_id)
    comentario = m.TicketsSuporteComentarios(
        id=uuid.uuid4(),
        ticket_id=ticket_id,
        autor_id=user.id,
        autor_nome=getattr(user, "nome", str(user.id)),
        **payload.model_dump(exclude_unset=True),
    )
    db.add(comentario)
    await db.commit()
    await db.refresh(comentario)
    return comentario


@router.delete(
    "/tickets/{ticket_id}/comentarios/{comentario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_comentario(
    ticket_id: uuid.UUID,
    comentario_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_ticket_scoped(ticket_id, db, empresa_id)
    result = await db.execute(
        sa_delete(m.TicketsSuporteComentarios).where(
            m.TicketsSuporteComentarios.id == comentario_id,
            m.TicketsSuporteComentarios.ticket_id == ticket_id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "comentário não encontrado")


# ── Anexos (filhos de ticket) ─────────────────────────────────────────────────

@router.get(
    "/tickets/{ticket_id}/anexos",
    response_model=list[s.AnexoOut],
)
async def listar_anexos(
    ticket_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_ticket_scoped(ticket_id, db, empresa_id)
    result = await db.scalars(
        select(m.TicketsSuporteAnexos).where(
            m.TicketsSuporteAnexos.ticket_id == ticket_id
        )
    )
    return list(result)


@router.post(
    "/tickets/{ticket_id}/anexos",
    response_model=s.AnexoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_anexo(
    ticket_id: uuid.UUID,
    payload: s.AnexoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_ticket_scoped(ticket_id, db, empresa_id)
    anexo = m.TicketsSuporteAnexos(
        id=uuid.uuid4(),
        ticket_id=ticket_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(anexo)
    await db.commit()
    await db.refresh(anexo)
    return anexo


@router.delete(
    "/tickets/{ticket_id}/anexos/{anexo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_anexo(
    ticket_id: uuid.UUID,
    anexo_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_ticket_scoped(ticket_id, db, empresa_id)
    result = await db.execute(
        sa_delete(m.TicketsSuporteAnexos).where(
            m.TicketsSuporteAnexos.id == anexo_id,
            m.TicketsSuporteAnexos.ticket_id == ticket_id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "anexo não encontrado")


# ── Configuração SLA (1-to-1 com empresa) ─────────────────────────────────────

@router.get("/sla-config", response_model=Optional[s.SlaConfigOut])
async def obter_sla_config(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    config = await db.scalar(
        select(m.TicketsSlaConfig).where(
            m.TicketsSlaConfig.empresa_id == empresa_id
        )
    )
    return config


@router.put("/sla-config", response_model=s.SlaConfigOut)
async def upsert_sla_config(
    payload: s.SlaConfigIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    config = await db.scalar(
        select(m.TicketsSlaConfig).where(
            m.TicketsSlaConfig.empresa_id == empresa_id
        )
    )
    if config is None:
        config = m.TicketsSlaConfig(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            **payload.model_dump(),
        )
        db.add(config)
    else:
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(config, k, v)
    await db.commit()
    await db.refresh(config)
    return config
