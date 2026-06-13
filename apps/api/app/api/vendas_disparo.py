"""Toriq Vendas — FASE 2 (Disparo em Massa por Email): router.

Configuração do provedor de email (SMTP, senha criptografada em repouso),
templates, campanhas (sobre segmentos/leads), envio respeitando supressão
(opt-out LGPD) + rate limit, e mensagens com tracking.

Inclui 2 ROTAS PÚBLICAS (sem auth): descadastro (opt-out) e pixel de rastreio.

Tenant SEMPRE por user.empresa_id (403 se None). Acesso admin restrito a
admin_vertical / cliente_torq via require_role (mesma regra de app/api/vendas.py).
Cripto da senha SMTP via app/core/esocial_crypto.py.
"""
import datetime
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.db import get_db
from app.core.esocial_crypto import decrypt_secret, encrypt_secret, mask_secret
from app.integrations.email_provider import normalizar_supressao
from app.models.user import User, UserRole
from app.models.vendas_disparo import (
    VendasCampanhas,
    VendasDisparoConfig,
    VendasMensagens,
    VendasSupressao,
    VendasTemplates,
)
from app.schemas import vendas_disparo as s
from app.services import vendas_disparo as svc

router = APIRouter(prefix="/vendas", tags=["vendas-disparo"])

# Admin do módulo de Vendas (mesma regra de app/api/vendas.py).
require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)

# GIF 1x1 transparente (bytes fixos) para o pixel de rastreio.
_PIXEL_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!"
    b"\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00"
    b"\x00\x02\x01D\x00;"
)


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG (provedor de email / SMTP)
# ═══════════════════════════════════════════════════════════════════════════════

def _config_public(obj: Optional[VendasDisparoConfig]) -> s.DisparoConfigPublic:
    if obj is None:
        return s.DisparoConfigPublic(
            email_provider=None,
            email_remetente=None,
            email_remetente_nome=None,
            smtp_host=None,
            smtp_port=None,
            smtp_user=None,
            smtp_use_tls=None,
            email_rate_limit=None,
            smtp_password_set=False,
            smtp_password_masked=None,
        )
    masked = None
    if obj.smtp_password_enc:
        masked = mask_secret(decrypt_secret(obj.smtp_password_enc))
    return s.DisparoConfigPublic(
        email_provider=obj.email_provider,
        email_remetente=obj.email_remetente,
        email_remetente_nome=obj.email_remetente_nome,
        smtp_host=obj.smtp_host,
        smtp_port=obj.smtp_port,
        smtp_user=obj.smtp_user,
        smtp_use_tls=obj.smtp_use_tls,
        email_rate_limit=obj.email_rate_limit,
        smtp_password_set=bool(obj.smtp_password_enc),
        smtp_password_masked=masked,
    )


@router.get("/disparo/config", response_model=s.DisparoConfigPublic)
async def get_disparo_config(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.empresa_id == empresa_id
        )
    )
    return _config_public(obj)


@router.put("/disparo/config", response_model=s.DisparoConfigPublic)
async def put_disparo_config(
    payload: s.DisparoConfigUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.empresa_id == empresa_id
        )
    )
    created = obj is None
    if created:
        obj = VendasDisparoConfig(id=uuid.uuid4(), empresa_id=empresa_id)

    # Campos simples (atualiza só os que vieram).
    for campo in (
        "email_provider",
        "email_remetente",
        "email_remetente_nome",
        "smtp_host",
        "smtp_port",
        "smtp_user",
        "smtp_use_tls",
        "email_rate_limit",
    ):
        valor = getattr(payload, campo)
        if valor is not None:
            setattr(obj, campo, valor)

    # Senha (segredo): clear tem precedência; senão grava se veio não-nula.
    if payload.clear_smtp_password:
        obj.smtp_password_enc = None
    elif payload.smtp_password is not None:
        obj.smtp_password_enc = encrypt_secret(payload.smtp_password)

    obj.updated_at = _now()

    if created:
        db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _config_public(obj)


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/templates", response_model=list[s.TemplateOut])
async def listar_templates(
    canal: Optional[str] = Query(None),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    conds = [VendasTemplates.empresa_id == empresa_id]
    if canal:
        conds.append(VendasTemplates.canal == canal)
    result = await db.scalars(
        select(VendasTemplates)
        .where(*conds)
        .order_by(VendasTemplates.created_at.desc())
    )
    return list(result)


@router.post(
    "/templates", response_model=s.TemplateOut, status_code=status.HTTP_201_CREATED
)
async def criar_template(
    payload: s.TemplateIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = VendasTemplates(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def _get_template(
    db: AsyncSession, template_id: uuid.UUID, empresa_id: uuid.UUID
) -> VendasTemplates:
    obj = await db.scalar(
        select(VendasTemplates).where(
            VendasTemplates.id == template_id,
            VendasTemplates.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "template não encontrado")
    return obj


@router.get("/templates/{template_id}", response_model=s.TemplateOut)
async def get_template(
    template_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    return await _get_template(db, template_id, empresa_id)


@router.put("/templates/{template_id}", response_model=s.TemplateOut)
async def atualizar_template(
    template_id: uuid.UUID,
    payload: s.TemplateUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await _get_template(db, template_id, empresa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_template(
    template_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await _get_template(db, template_id, empresa_id)
    await db.delete(obj)
    await db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# CAMPANHAS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/campanhas", response_model=list[s.CampanhaOut])
async def listar_campanhas(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(VendasCampanhas)
        .where(VendasCampanhas.empresa_id == empresa_id)
        .order_by(VendasCampanhas.created_at.desc())
    )
    return list(result)


@router.post(
    "/campanhas", response_model=s.CampanhaOut, status_code=status.HTTP_201_CREATED
)
async def criar_campanha(
    payload: s.CampanhaIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    data = payload.model_dump(exclude_unset=True)

    # lead_ids: JSONB → serializa UUID como str.
    lead_ids = data.get("lead_ids")
    if lead_ids is not None:
        data["lead_ids"] = [str(x) for x in lead_ids]

    # status inicial: 'agendada' se agendada_para no futuro, senão 'rascunho'.
    agendada_para = data.get("agendada_para")
    inicial = "rascunho"
    if agendada_para is not None and agendada_para > _now():
        inicial = "agendada"

    obj = VendasCampanhas(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        status=inicial,
        **data,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def _get_campanha(
    db: AsyncSession, campanha_id: uuid.UUID, empresa_id: uuid.UUID
) -> VendasCampanhas:
    obj = await db.scalar(
        select(VendasCampanhas).where(
            VendasCampanhas.id == campanha_id,
            VendasCampanhas.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "campanha não encontrada")
    return obj


@router.get("/campanhas/{campanha_id}", response_model=s.CampanhaOut)
async def get_campanha(
    campanha_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    return await _get_campanha(db, campanha_id, empresa_id)


@router.put("/campanhas/{campanha_id}", response_model=s.CampanhaOut)
async def atualizar_campanha(
    campanha_id: uuid.UUID,
    payload: s.CampanhaUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await _get_campanha(db, campanha_id, empresa_id)
    if obj.status not in ("rascunho", "agendada"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "só é possível editar campanha em rascunho ou agendada",
        )
    data = payload.model_dump(exclude_unset=True)
    if "lead_ids" in data and data["lead_ids"] is not None:
        data["lead_ids"] = [str(x) for x in data["lead_ids"]]
    for k, v in data.items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/campanhas/{campanha_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_campanha(
    campanha_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await _get_campanha(db, campanha_id, empresa_id)
    await db.delete(obj)
    await db.commit()


@router.post("/campanhas/{campanha_id}/enviar", response_model=s.EnviarCampanhaOut)
async def enviar_campanha(
    campanha_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    # 404 se a campanha não é da empresa.
    await _get_campanha(db, campanha_id, empresa_id)
    try:
        resultado = await svc.enviar_campanha(
            db, campanha_id=campanha_id, empresa_id=empresa_id
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return resultado


@router.get(
    "/campanhas/{campanha_id}/mensagens", response_model=list[s.MensagemOut]
)
async def listar_mensagens(
    campanha_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_campanha(db, campanha_id, empresa_id)
    result = await db.scalars(
        select(VendasMensagens)
        .where(
            VendasMensagens.campanha_id == campanha_id,
            VendasMensagens.empresa_id == empresa_id,
        )
        .order_by(VendasMensagens.created_at)
        .limit(limit)
        .offset(offset)
    )
    return list(result)


# ═══════════════════════════════════════════════════════════════════════════════
# SUPRESSÃO (opt-out LGPD)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/supressao", response_model=list[s.SupressaoOut])
async def listar_supressao(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(VendasSupressao)
        .where(VendasSupressao.empresa_id == empresa_id)
        .order_by(VendasSupressao.created_at.desc())
    )
    return list(result)


@router.post(
    "/supressao", response_model=s.SupressaoOut, status_code=status.HTTP_201_CREATED
)
async def criar_supressao(
    payload: s.SupressaoIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    valor = normalizar_supressao(payload.tipo, payload.valor)

    existente = await db.scalar(
        select(VendasSupressao).where(
            VendasSupressao.empresa_id == empresa_id,
            VendasSupressao.tipo == payload.tipo,
            VendasSupressao.valor == valor,
        )
    )
    if existente is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "valor já suprimido")

    obj = VendasSupressao(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        tipo=payload.tipo,
        valor=valor,
        motivo=payload.motivo,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/supressao/{supressao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_supressao(
    supressao_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasSupressao).where(
            VendasSupressao.id == supressao_id,
            VendasSupressao.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "registro não encontrado")
    await db.delete(obj)
    await db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# ROTAS PÚBLICAS (sem auth) — descadastro (opt-out) + pixel de rastreio
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/descadastro/{mensagem_id}", response_class=HTMLResponse)
async def descadastro(
    mensagem_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Pública: adiciona o destinatário da mensagem à supressão da empresa.

    Status 200 mesmo se já suprimido ou se a mensagem não existir.
    """
    pagina = (
        "<!doctype html><html lang='pt-br'><head><meta charset='utf-8'>"
        "<title>Descadastro</title></head><body style='font-family:sans-serif;"
        "text-align:center;margin-top:80px'>"
        "<h1>Você foi descadastrado</h1>"
        "<p>Não enviaremos mais emails para este endereço.</p>"
        "</body></html>"
    )

    msg = await db.scalar(
        select(VendasMensagens).where(VendasMensagens.id == mensagem_id)
    )
    if msg is not None and msg.destinatario:
        valor = normalizar_supressao("email", msg.destinatario)
        existente = await db.scalar(
            select(VendasSupressao.id).where(
                VendasSupressao.empresa_id == msg.empresa_id,
                VendasSupressao.tipo == "email",
                VendasSupressao.valor == valor,
            )
        )
        if existente is None:
            db.add(
                VendasSupressao(
                    id=uuid.uuid4(),
                    empresa_id=msg.empresa_id,
                    tipo="email",
                    valor=valor,
                    motivo="descadastro",
                )
            )
            await db.commit()

    return HTMLResponse(content=pagina, status_code=200)


@router.get("/rastrear/{mensagem_id}.png")
async def rastrear(
    mensagem_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Pública: pixel de rastreio de abertura. NUNCA erra (sempre devolve o gif).

    Marca lido_em=now e status='lido' se a mensagem ainda não foi respondida.
    """
    try:
        msg = await db.scalar(
            select(VendasMensagens).where(VendasMensagens.id == mensagem_id)
        )
        if msg is not None and msg.respondeu_em is None:
            if msg.lido_em is None:
                msg.lido_em = _now()
            if msg.status != "respondeu":
                msg.status = "lido"
            await db.commit()
    except Exception:  # noqa: BLE001 — pixel nunca pode falhar.
        pass

    return Response(content=_PIXEL_GIF, media_type="image/gif")
