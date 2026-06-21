"""Canal WhatsApp via Evolution API — regra de negócio.

Tenant SEMPRE por empresa_id. NÃO commita (quem chama commita), exceto
``processar_webhook`` (ponto de entrada de webhook, commita ao final), seguindo o
padrão de app/services/vendas_whatsapp.py.

Rede delegada a app.integrations.evolution_api; nos testes é mockada por
monkeypatch nesse módulo.
"""
from __future__ import annotations

import datetime
import re
import secrets
import uuid

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.esocial_crypto import decrypt_secret, encrypt_secret
from app.integrations import evolution_api
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasMensagens
from app.models.vendas_evolution import (
    VendasEvolutionInstancias,
    VendasEvolutionServidor,
    VendasEvolutionWebhookEventos,
)


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s or "wa"


def gerar_instance_name(empresa_id: uuid.UUID, nome: str) -> str:
    """Namespeado por empresa para não colidir no servidor compartilhado."""
    return f"emp_{str(empresa_id)[:8]}_{_slug(nome)}_{secrets.token_hex(2)}"


# Settings padrão de uma instância de vendas: ignora grupos, não rejeita ligação,
# não marca lido automaticamente (o SDR controla o fluxo). Best-effort no create.
SETTINGS_PADRAO = {
    "rejectCall": False,
    "groupsIgnore": True,
    "alwaysOnline": False,
    "readMessages": False,
    "readStatus": False,
    "syncFullHistory": False,
}


# ───────────────────────── Servidor (global) ─────────────────────────

async def get_servidor(db: AsyncSession) -> VendasEvolutionServidor | None:
    return await db.scalar(select(VendasEvolutionServidor).limit(1))


async def salvar_servidor(db: AsyncSession, *, dados) -> VendasEvolutionServidor:
    obj = await get_servidor(db)
    if obj is None:
        obj = VendasEvolutionServidor(id=uuid.uuid4())
        db.add(obj)
    if dados.base_url is not None:
        obj.base_url = dados.base_url
    if dados.webhook_base_url is not None:
        obj.webhook_base_url = dados.webhook_base_url
    if dados.limite_padrao_instancias is not None:
        obj.limite_padrao_instancias = dados.limite_padrao_instancias
    if dados.ativo is not None:
        obj.ativo = dados.ativo
    if dados.api_key:  # só troca se veio uma nova
        obj.api_key_enc = encrypt_secret(dados.api_key)
    obj.updated_at = _now()
    return obj


async def _exigir_servidor(db: AsyncSession) -> tuple[str, str]:
    """Retorna (base_url, api_key) ou levanta ValueError."""
    srv = await get_servidor(db)
    if srv is None or not srv.base_url or not srv.api_key_enc:
        raise ValueError("servidor Evolution não configurado")
    return srv.base_url, decrypt_secret(srv.api_key_enc)


# ───────────────────────── Instâncias ─────────────────────────

async def contar_instancias(db: AsyncSession, empresa_id: uuid.UUID) -> int:
    return int(
        await db.scalar(
            select(func.count(VendasEvolutionInstancias.id)).where(
                VendasEvolutionInstancias.empresa_id == empresa_id
            )
        )
        or 0
    )


async def criar_instancia(
    db: AsyncSession, *, empresa_id: uuid.UUID, nome_exibicao: str, criado_por=None
) -> VendasEvolutionInstancias:
    """Valida limite, cria na Evolution (com webhook) e persiste. NÃO commita."""
    base_url, api_key = await _exigir_servidor(db)
    srv = await get_servidor(db)
    limite = srv.limite_padrao_instancias or 1
    if await contar_instancias(db, empresa_id) >= limite:
        raise ValueError(f"limite de instâncias atingido ({limite})")

    instance_name = gerar_instance_name(empresa_id, nome_exibicao)
    webhook_token = secrets.token_urlsafe(24)

    await evolution_api.criar_instancia(
        base_url=base_url, api_key=api_key, instance_name=instance_name
    )
    webhook_url = (
        f"{(srv.webhook_base_url or '').rstrip('/')}"
        f"/vendas/evolution/webhook/{webhook_token}"
    )
    await evolution_api.definir_webhook(
        base_url=base_url, api_key=api_key,
        instance_name=instance_name, webhook_url=webhook_url,
    )
    # Settings padrão (best-effort: não bloqueia a criação se falhar).
    try:
        await evolution_api.definir_settings(
            base_url=base_url, api_key=api_key,
            instance_name=instance_name, settings=SETTINGS_PADRAO,
        )
    except evolution_api.EvolutionError:
        pass

    obj = VendasEvolutionInstancias(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        nome_exibicao=nome_exibicao,
        instance_name=instance_name,
        status="conectando",
        webhook_token=webhook_token,
        criado_por=criado_por,
    )
    db.add(obj)
    return obj


async def _get_instancia(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> VendasEvolutionInstancias | None:
    return await db.scalar(
        select(VendasEvolutionInstancias).where(
            VendasEvolutionInstancias.id == instancia_id,
            VendasEvolutionInstancias.empresa_id == empresa_id,
        )
    )


async def obter_qrcode(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> dict:
    base_url, api_key = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")
    data = await evolution_api.conectar_qrcode(
        base_url=base_url, api_key=api_key, instance_name=inst.instance_name
    )
    return {
        "base64": data.get("base64"),
        "code": data.get("code") or data.get("pairingCode"),
    }


async def sincronizar_status(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> str:
    base_url, api_key = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")
    estado = await evolution_api.estado_conexao(
        base_url=base_url, api_key=api_key, instance_name=inst.instance_name
    )
    inst.status = {"open": "conectada", "connecting": "conectando"}.get(
        estado, "desconectada"
    )
    inst.updated_at = _now()
    return inst.status


async def reconectar(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> dict:
    """Ritual de reconexão (estilo tio-crm, sem bloquear): logout → restart →
    novo QR. logout/restart são best-effort; o status vai p/ 'conectando' e o
    frontend faz polling de status até 'conectada'. NÃO commita."""
    base_url, api_key = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")

    for fn in (evolution_api.logout, evolution_api.reiniciar):
        try:
            await fn(
                base_url=base_url, api_key=api_key, instance_name=inst.instance_name
            )
        except evolution_api.EvolutionError:
            pass

    inst.status = "conectando"
    inst.updated_at = _now()
    data = await evolution_api.conectar_qrcode(
        base_url=base_url, api_key=api_key, instance_name=inst.instance_name
    )
    return {
        "base64": data.get("base64"),
        "code": data.get("code") or data.get("pairingCode"),
    }


async def deletar_instancia(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> bool:
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        return False
    try:
        base_url, api_key = await _exigir_servidor(db)
        await evolution_api.logout(
            base_url=base_url, api_key=api_key, instance_name=inst.instance_name
        )
        await evolution_api.deletar(
            base_url=base_url, api_key=api_key, instance_name=inst.instance_name
        )
    except (ValueError, evolution_api.EvolutionError):
        pass  # remove localmente mesmo se a Evolution já não tiver a instância
    await db.delete(inst)
    return True


# ───────────────────────── Envio avulso ─────────────────────────

async def enviar_texto(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID,
    numero: str, texto: str, typing: bool = False,
) -> dict:
    """Envia um texto e grava em vendas_mensagens. NÃO commita.

    ``typing=True`` mostra 'digitando...' antes (respostas do SDR — mais humano).
    """
    base_url, api_key = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")

    destino = re.sub(r"\D", "", numero or "")
    if typing:
        await evolution_api.enviar_presenca(
            base_url=base_url, api_key=api_key,
            instance_name=inst.instance_name, numero=destino, presence="composing",
        )
    enviado, provider_id, erro = False, None, None
    try:
        provider_id = await evolution_api.enviar_texto(
            base_url=base_url, api_key=api_key,
            instance_name=inst.instance_name, numero=destino, texto=texto,
        )
        enviado = True
    except evolution_api.EvolutionError as exc:
        erro = str(exc)

    return {"enviado": enviado, "provider_id": provider_id, "erro": erro}


async def instancia_conectada(
    db: AsyncSession, empresa_id: uuid.UUID
) -> VendasEvolutionInstancias | None:
    """A instância conectada da empresa (para SDR/campanha). Preferir 'conectada'."""
    inst = await db.scalar(
        select(VendasEvolutionInstancias)
        .where(
            VendasEvolutionInstancias.empresa_id == empresa_id,
            VendasEvolutionInstancias.status == "conectada",
        )
        .limit(1)
    )
    if inst is not None:
        return inst
    return await db.scalar(
        select(VendasEvolutionInstancias)
        .where(VendasEvolutionInstancias.empresa_id == empresa_id)
        .limit(1)
    )


# ───────────────── Webhook: idempotência (dedup por event_id) ─────────────────

def _event_id_de(payload: dict) -> str:
    """ID estável do evento p/ dedup. Mensagens → data.key.id; resto → sintético."""
    data = (payload or {}).get("data")
    if isinstance(data, list):
        data = data[0] if data else None
    if isinstance(data, dict):
        key = data.get("key") or {}
        if key.get("id"):
            return str(key["id"])
    return f"evt-{uuid.uuid4()}"


async def registrar_webhook_evento(
    db: AsyncSession, *, instancia, payload: dict
) -> uuid.UUID | None:
    """Insere o evento (idempotente via UNIQUE event_id). Retorna o id se NOVO,
    ou None se já existia (duplicata → descartar). Usa ON CONFLICT DO NOTHING."""
    stmt = (
        pg_insert(VendasEvolutionWebhookEventos.__table__)
        .values(
            id=uuid.uuid4(),
            instancia_id=instancia.id,
            event_id=_event_id_de(payload),
            event_type=(payload or {}).get("event"),
            payload=payload,
            status="received",
        )
        .on_conflict_do_nothing(index_elements=["event_id"])
        .returning(VendasEvolutionWebhookEventos.__table__.c.id)
    )
    res = await db.execute(stmt)
    row = res.first()
    await db.commit()
    return row[0] if row else None


# ───────────────── Webhook (ponto de entrada — COMMITA) ─────────────────

async def processar_webhook(db: AsyncSession, *, instancia, payload: dict) -> int:
    """Processa o callback da Evolution para UMA instância já identificada.

    - connection.update → atualiza status/numero da instância.
    - messages.upsert (inbound) → acha o lead pelo telefone, marca 'respondeu',
      espelha no Pipeline (append_mensagem), grava ultimo_canal='whatsapp_evo' e
      enfileira 'sdr_inbound' se o SDR estiver ativo+auto_responder. COMMITA.
    Retorna a quantidade de inbounds processados.
    """
    eventos = evolution_api.parse_webhook(payload)
    empresa_id = instancia.empresa_id

    conexao = eventos.get("conexao")
    if conexao and conexao.get("state"):
        instancia.status = {"open": "conectada", "connecting": "conectando"}.get(
            conexao["state"], "desconectada"
        )
        instancia.updated_at = _now()

    processadas = 0
    for inbound in eventos.get("mensagens") or []:
        de = inbound.get("from") or ""
        if not de:
            continue
        leads = (
            await db.scalars(
                select(VendasLeads).where(
                    VendasLeads.empresa_id == empresa_id,
                    VendasLeads.telefone.isnot(None),
                )
            )
        ).all()
        lead = next(
            (l for l in leads if re.sub(r"\D", "", l.telefone or "") == de), None
        )
        if lead is None:
            continue

        msg = await db.scalar(
            select(VendasMensagens)
            .where(
                VendasMensagens.empresa_id == empresa_id,
                VendasMensagens.lead_id == lead.id,
            )
            .order_by(VendasMensagens.created_at.desc())
            .limit(1)
        )
        if msg is not None and msg.respondeu_em is None:
            msg.respondeu_em = _now()
            msg.status = "respondeu"

        lead.ultimo_canal = "whatsapp_evo"
        processadas += 1

        from app.services.vendas_pipeline import append_mensagem

        try:
            await append_mensagem(
                db, empresa_id=empresa_id, lead_id=lead.id,
                sender_type="lead", conteudo=inbound.get("texto") or "",
                canal="whatsapp_evo", media=None,
            )
        except Exception:  # pragma: no cover - best-effort
            await db.rollback()

        from app.models.vendas_sdr import VendasSdrConfig

        sdr = await db.scalar(
            select(VendasSdrConfig).where(VendasSdrConfig.empresa_id == empresa_id)
        )
        if sdr is not None and sdr.ativo and sdr.auto_responder and sdr.api_key_enc:
            from app.core.queue import queue

            await db.commit()
            await queue.enqueue(
                "sdr_inbound",
                {
                    "empresa_id": str(empresa_id),
                    "lead_id": str(lead.id),
                    "mensagem": inbound.get("texto") or "",
                },
            )

    await db.commit()
    return processadas
