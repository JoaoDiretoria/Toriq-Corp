"""Canal WhatsApp via Evolution Go — regra de negócio.

Tenant SEMPRE por empresa_id. NÃO commita (quem chama commita), exceto
``processar_webhook`` (ponto de entrada de webhook, commita ao final), seguindo o
padrão de app/services/vendas_whatsapp.py.

Rede delegada a app.integrations.evolution_api; nos testes é mockada por
monkeypatch nesse módulo.

Credenciais (Evolution Go): rotas admin usam a GLOBAL_API_KEY do servidor
(``_exigir_servidor``); rotas de instância usam o token DAQUELA instância
(``_token`` → ``instance_token_enc``).
"""
from __future__ import annotations

import asyncio
import base64 as _b64
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


# Janela de debounce do SDR: mensagens do mesmo lead em até N segundos são
# agrupadas numa única chamada ao SDR (economiza LLM e evita respostas picadas).
_DEBOUNCE_SEG = 8


def _slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s or "wa"


def gerar_instance_name(empresa_id: uuid.UUID, nome: str) -> str:
    """Namespeado por empresa para não colidir no servidor compartilhado."""
    return f"emp_{str(empresa_id)[:8]}_{_slug(nome)}_{secrets.token_hex(2)}"


# Settings padrão de uma instância de vendas: ignora grupos, não rejeita ligação,
# não marca lido automaticamente (o SDR controla o fluxo). Vão como advancedSettings
# no create (o Go não tem /settings/set). Chaves no formato do AdvancedSettings do Go.
SETTINGS_PADRAO = {
    "rejectCall": False,
    "ignoreGroups": True,
    "alwaysOnline": False,
    "readMessages": False,
    "ignoreStatus": False,
}


# ───────────────────────────── Servidor (global) ─────────────────────────────

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
    """Retorna (base_url, GLOBAL_API_KEY) ou levanta ValueError."""
    srv = await get_servidor(db)
    if srv is None or not srv.base_url or not srv.api_key_enc:
        raise ValueError("servidor Evolution não configurado")
    return srv.base_url, decrypt_secret(srv.api_key_enc)


def _token(inst: VendasEvolutionInstancias) -> str:
    """Token (apikey) da instância para as rotas de instância do Go."""
    return decrypt_secret(inst.instance_token_enc) if inst.instance_token_enc else ""


def _webhook_url(srv: VendasEvolutionServidor, webhook_token: str) -> str:
    return (
        f"{(srv.webhook_base_url or '').rstrip('/')}"
        f"/vendas/evolution/webhook/{webhook_token}"
    )


# ───────────────────────────── Instâncias ─────────────────────────────

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
    """Valida limite, cria a instância no Go (token + settings), conecta (configurando
    webhook) e persiste o token. NÃO commita.

    O ``id`` (UUID) da linha local é reusado como ``instanceId`` no Go — assim
    ``delete/{id}`` não precisa de coluna extra. O ``token`` gerado vira a credencial
    das rotas de instância (``instance_token_enc``).
    """
    base_url, api_key = await _exigir_servidor(db)
    srv = await get_servidor(db)
    limite = srv.limite_padrao_instancias or 1
    if await contar_instancias(db, empresa_id) >= limite:
        raise ValueError(f"limite de instâncias atingido ({limite})")

    instance_id = uuid.uuid4()
    instance_name = gerar_instance_name(empresa_id, nome_exibicao)
    webhook_token = secrets.token_urlsafe(24)
    token = secrets.token_urlsafe(24)

    # 1) cria no servidor (rota admin → global key); instanceId = nosso UUID.
    await evolution_api.criar_instancia(
        base_url=base_url, api_key=api_key, name=instance_name,
        instance_id=str(instance_id), token=token, advanced_settings=SETTINGS_PADRAO,
    )
    # 2) conecta (rota de instância → token): configura webhook + categorias e
    #    dispara o login (QR vem via /qr ou pelo próprio webhook). Best-effort.
    try:
        await evolution_api.conectar(
            base_url=base_url, token=token,
            webhook_url=_webhook_url(srv, webhook_token),
        )
    except evolution_api.EvolutionError:
        pass

    obj = VendasEvolutionInstancias(
        id=instance_id,
        empresa_id=empresa_id,
        nome_exibicao=nome_exibicao,
        instance_name=instance_name,
        status="conectando",
        instance_token_enc=encrypt_secret(token),
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
    base_url, _ = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")
    # QR pode ainda não estar pronto (logo após o connect) → tolera e o front faz polling.
    try:
        data = await evolution_api.obter_qrcode(base_url=base_url, token=_token(inst))
    except evolution_api.EvolutionError:
        return {"base64": None, "code": None}
    return {"base64": data.get("base64"), "code": data.get("code")}


async def sincronizar_status(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> str:
    base_url, _ = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")
    estado = await evolution_api.estado_conexao(base_url=base_url, token=_token(inst))
    inst.status = {"open": "conectada", "connecting": "conectando"}.get(
        estado, "desconectada"
    )
    inst.updated_at = _now()
    return inst.status


async def reconectar(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> dict:
    """Ritual de reconexão (re-pareamento): logout → connect (re-arma webhook + novo
    login) → novo QR. logout/connect são best-effort; o status vai p/ 'conectando' e o
    frontend faz polling de status até 'conectada'. NÃO commita."""
    base_url, _ = await _exigir_servidor(db)
    srv = await get_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")
    token = _token(inst)

    try:
        await evolution_api.logout(base_url=base_url, token=token)
    except evolution_api.EvolutionError:
        pass

    inst.status = "conectando"
    inst.updated_at = _now()

    try:
        await evolution_api.conectar(
            base_url=base_url, token=token,
            webhook_url=_webhook_url(srv, inst.webhook_token),
        )
    except evolution_api.EvolutionError:
        pass

    try:
        data = await evolution_api.obter_qrcode(base_url=base_url, token=token)
    except evolution_api.EvolutionError:
        data = {}
    return {"base64": data.get("base64"), "code": data.get("code")}


async def deletar_instancia(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> bool:
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        return False
    try:
        base_url, api_key = await _exigir_servidor(db)
        await evolution_api.logout(base_url=base_url, token=_token(inst))
        await evolution_api.deletar(
            base_url=base_url, api_key=api_key, instance_id=str(inst.id)
        )
    except (ValueError, evolution_api.EvolutionError):
        pass  # remove localmente mesmo se a Evolution já não tiver a instância
    await db.delete(inst)
    return True


# ───────────────────────────── Envio avulso ─────────────────────────────

async def enviar_texto(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID,
    numero: str, texto: str, typing: bool = False,
) -> dict:
    """Envia um texto pela instância. NÃO commita.

    ``typing=True`` mostra 'digitando...' antes (respostas do SDR — mais humano).
    """
    base_url, _ = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")

    destino = re.sub(r"\D", "", numero or "")
    token = _token(inst)
    if typing:
        await evolution_api.enviar_presenca(
            base_url=base_url, token=token, numero=destino, state="composing",
        )
    enviado, provider_id, erro = False, None, None
    try:
        provider_id = await evolution_api.enviar_texto(
            base_url=base_url, token=token, numero=destino, texto=texto,
        )
        enviado = True
    except evolution_api.EvolutionError as exc:
        erro = str(exc)

    return {"enviado": enviado, "provider_id": provider_id, "erro": erro}


async def enviar_midia(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID,
    numero: str, mediatype: str, media: str, mimetype: str | None = None,
    filename: str | None = None, caption: str | None = None,
) -> dict:
    """Envia mídia (image/video/document/audio) pela instância. NÃO commita.
    ``media`` = URL pública ou base64. ``mediatype='audio'`` vira nota de voz (PTT).
    No Go tudo passa por /send/media (não há endpoint de voz separado)."""
    base_url, _ = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")

    destino = re.sub(r"\D", "", numero or "")
    enviado, provider_id, erro = False, None, None
    try:
        provider_id = await evolution_api.enviar_midia(
            base_url=base_url, token=_token(inst), numero=destino,
            mediatype=mediatype, media=media, mimetype=mimetype,
            filename=filename, caption=caption,
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


# ───────────────── Webhook: mídia inbound (download + storage) ─────────────────

_EXT_MIME = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
    "audio/ogg": ".ogg", "audio/mpeg": ".mp3", "video/mp4": ".mp4",
    "application/pdf": ".pdf",
}


def _ext_de_mime(mime: str | None) -> str:
    if not mime:
        return ".bin"
    return _EXT_MIME.get(mime.split(";")[0].strip(), ".bin")


async def persistir_midia_inbound(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia, media: dict
) -> tuple[dict, bytes | None]:
    """Sobe a mídia recebida no storage (best-effort) e devolve (metadata, bytes).

    metadata (p/ o pipeline): {tipo, mime_type, caption, filename, url, downloaded}.
    Os ``bytes`` brutos são devolvidos p/ a IA (transcrição/visão) sem persistir o
    base64 no banco. O webhook do Go traz a mídia inline: ``base64`` (MinIO off) ou
    ``mediaUrl`` (MinIO on). Com base64, subimos no nosso storage; com URL pronta,
    usamos ela direto. Storage não configurado (503) → url=None, mas o resto segue.
    """
    meta = {
        "tipo": media.get("tipo"),
        "mime_type": media.get("mime_type"),
        "caption": media.get("caption"),
        "filename": media.get("filename"),
        "url": None,
        "downloaded": False,
    }

    # MinIO no Go: já temos uma URL pública pronta → usa direto (sem re-upload).
    if media.get("url"):
        meta["url"] = media["url"]
        meta["downloaded"] = True
        return meta, None

    b64 = media.get("base64") or ""
    if not b64:
        return meta, None
    try:
        conteudo = _b64.b64decode(b64)
    except Exception:  # base64 inválido
        return meta, None

    ext = _ext_de_mime(media.get("mime_type"))
    chave = f"{empresa_id}/{instancia.instance_name}/{media.get('media_id') or uuid.uuid4()}{ext}"
    try:
        from app.core.storage import storage_service

        url = await asyncio.to_thread(
            storage_service.upload,
            "vendas-evolution",
            chave,
            conteudo,
            media.get("mime_type") or "application/octet-stream",
            "attachment",
        )
        meta["url"] = url
        meta["downloaded"] = True
    except Exception:  # pragma: no cover - storage 503/erro: best-effort
        pass
    return meta, conteudo


async def _texto_de_midia(
    db: AsyncSession, *, empresa_id: uuid.UUID, media: dict, conteudo: bytes | None
) -> str | None:
    """Texto que representa a mídia para a IA: áudio→Whisper, imagem→visão do
    provedor configurado (Claude/OpenAI/Gemini).

    Usa a config do SDR (openai_api_key_enc p/ Whisper, com fallback p/ api_key_enc
    quando provider=openai; api_key_enc/modelo/provider p/ visão). Degrada
    graciosamente (sem chave / falha → None → cai no placeholder).
    """
    if not conteudo:
        return None
    from app.models.vendas_sdr import VendasSdrConfig

    sdr = await db.scalar(
        select(VendasSdrConfig).where(VendasSdrConfig.empresa_id == empresa_id)
    )
    if sdr is None:
        return None

    tipo = media.get("tipo")
    mime = media.get("mime_type")
    eh_openai = (sdr.provider or "").lower() == "openai"
    # Whisper usa a chave dedicada; se o provedor for OpenAI, reusa a chave do
    # provedor ativo (api_key_enc) como fallback.
    whisper_key = sdr.openai_api_key_enc or (sdr.api_key_enc if eh_openai else None)
    try:
        if tipo == "audio" and whisper_key:
            from app.integrations.openai_whisper import transcrever

            texto = await transcrever(
                api_key=decrypt_secret(whisper_key),
                audio=conteudo, mime=mime,
            )
            return f"[áudio transcrito] {texto}".strip() if texto else None
        if tipo == "image" and sdr.api_key_enc:
            from app.integrations.llm import descrever_imagem_llm, modelo_padrao

            desc = await descrever_imagem_llm(
                provider=sdr.provider,
                api_key=decrypt_secret(sdr.api_key_enc),
                modelo=sdr.modelo or modelo_padrao(sdr.provider),
                imagem=conteudo, mime=mime,
            )
            cap = media.get("caption")
            prefixo = f"[imagem] {desc}".strip()
            return f"{prefixo}\nLegenda: {cap}" if cap else prefixo
    except Exception:  # noqa: BLE001 - IA é best-effort; placeholder se falhar
        return None
    return None


# ───────────────── Webhook: idempotência (dedup por event_id) ─────────────────

def _event_id_de(payload: dict) -> str:
    """ID estável do evento p/ dedup. Mensagens → data.Info.ID; resto → sintético."""
    data = (payload or {}).get("data")
    if isinstance(data, dict):
        info = data.get("Info") or data.get("info") or {}
        if info.get("ID"):
            return str(info["ID"])
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
    """Processa o callback da Evolution Go para UMA instância já identificada.

    - Connected/Disconnected/LoggedOut → atualiza status da instância.
    - Message (inbound) → acha o lead pelo telefone, marca 'respondeu', espelha no
      Pipeline (append_mensagem), grava ultimo_canal='whatsapp_evo' e bufferiza p/ o
      SDR (debounce) se ativo+auto_responder. COMMITA.
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
        de_chave = evolution_api.telefone_chave(de)
        lead = next(
            (
                l
                for l in leads
                if evolution_api.telefone_chave(l.telefone or "") == de_chave
            ),
            None,
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

        # Automação do funil: lead que respondeu avança p/ "Respondeu" (só avança).
        from app.services.vendas_pipeline import avancar_estagio

        await avancar_estagio(db, empresa_id=empresa_id, lead=lead, alvo="Respondeu")

        # Mídia recebida: download + storage (best-effort) + texto para a IA.
        midia = inbound.get("media")
        texto_in = inbound.get("texto") or ""
        media_meta = None
        if midia:
            media_meta, conteudo_bytes = await persistir_midia_inbound(
                db, empresa_id=empresa_id, instancia=instancia, media=midia
            )
            texto_ia = await _texto_de_midia(
                db, empresa_id=empresa_id, media=midia, conteudo=conteudo_bytes
            )
            texto_in = (
                texto_ia or texto_in or f"[{midia.get('tipo') or 'mídia'} recebido]"
            )

        from app.services.vendas_pipeline import append_mensagem

        try:
            await append_mensagem(
                db, empresa_id=empresa_id, lead_id=lead.id,
                sender_type="lead", conteudo=texto_in,
                canal="whatsapp_evo", media=media_meta,
            )
        except Exception:  # pragma: no cover - best-effort
            await db.rollback()

        from app.models.vendas_sdr import VendasSdrConfig

        sdr = await db.scalar(
            select(VendasSdrConfig).where(VendasSdrConfig.empresa_id == empresa_id)
        )
        if sdr is not None and sdr.ativo and sdr.auto_responder and sdr.api_key_enc:
            # Debounce: agrupa mensagens que chegam rápido. Acumula no buffer do
            # lead e estende a janela; o scheduler drena depois e chama o SDR 1x.
            atual = (lead.sdr_buffer or "").strip()
            lead.sdr_buffer = (
                f"{atual}\n{texto_in}".strip() if atual else texto_in
            )
            lead.sdr_buffer_ate = _now() + datetime.timedelta(seconds=_DEBOUNCE_SEG)

    await db.commit()
    return processadas


async def processar_sdr_buffers(db: AsyncSession, limite: int = 200) -> int:
    """Drena os buffers de debounce vencidos: para cada lead com a janela
    encerrada, enfileira UM ``sdr_inbound`` com as mensagens agrupadas. Roda no
    scheduler (~10s). Retorna quantos leads foram despachados."""
    agora = _now()
    leads = (
        await db.scalars(
            select(VendasLeads)
            .where(
                VendasLeads.sdr_buffer_ate.isnot(None),
                VendasLeads.sdr_buffer_ate <= agora,
            )
            .limit(limite)
        )
    ).all()

    despachados = 0
    for lead in leads:
        texto = (lead.sdr_buffer or "").strip()
        empresa_id = lead.empresa_id
        lead_id = lead.id
        lead.sdr_buffer = None
        lead.sdr_buffer_ate = None
        await db.commit()
        if not texto:
            continue
        from app.core.queue import queue

        await queue.enqueue(
            "sdr_inbound",
            {"empresa_id": str(empresa_id), "lead_id": str(lead_id), "mensagem": texto},
        )
        despachados += 1
    return despachados
