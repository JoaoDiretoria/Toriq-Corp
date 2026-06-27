"""Toriq Vendas — canal Instagram (Fase IG-1): serviço de orquestração.

Ponto de entrada: ``processar_comentarios_webhook`` (chamado pelo router do
webhook). Para cada comentário recebido:
  1. anti-loop: ignora comentário do próprio @ (senão responde a si mesmo ∞);
  2. idempotência: pula comment_id já registrado;
  3. acha/cria o lead pela identidade IG (escopado por empresa);
  4. registra na thread de Conversas (canal='instagram') — reusa append_mensagem;
  5. gating híbrido: se casa um gatilho ativo, a IA do SDR escreve e enviamos
     resposta pública e/ou DM;
  6. enfileira a qualificação do lead (reusa 'sdr_qualificar_lote').

Convenção: este é um ponto de entrada de webhook → COMMITA ao final. (Reusa
``append_mensagem`` e ``gerar_resposta``, que também commitam internamente — ok,
vira um commit por comentário, igual ao inbound de WhatsApp.)
"""
from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.esocial_crypto import decrypt_secret
from app.core.queue import queue
from app.integrations import instagram_meta
from app.integrations.llm import LLMError
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasDisparoConfig
from app.models.vendas_instagram import (
    VendasInstagramComentarios,
    VendasInstagramGatilhos,
    VendasInstagramPublicacoes,
)
from app.services import vendas_sdr
from app.services.vendas_pipeline import append_mensagem

_POLL_SLEEP = 5.0       # s entre polls de vídeo
_POLL_MAX = 24          # ~2 min


async def _carregar_config(db: AsyncSession, empresa_id: uuid.UUID) -> VendasDisparoConfig | None:
    return await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )


async def _achar_ou_criar_lead(
    db: AsyncSession, *, empresa_id: uuid.UUID, from_id: str, from_username: str | None
) -> VendasLeads:
    """Casa o lead por instagram_user_id (escopo empresa); senão cria um novo."""
    lead = await db.scalar(
        select(VendasLeads).where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.instagram_user_id == from_id,
        )
    )
    if lead is not None:
        return lead
    lead = VendasLeads(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        nome=(f"@{from_username}" if from_username else "Instagram"),
        instagram_user_id=from_id,
        instagram_username=from_username,
        origem="instagram",
        ultimo_canal="instagram",
    )
    db.add(lead)
    await db.flush()
    return lead


def _casar_gatilho(
    texto: str | None, gatilhos: list[VendasInstagramGatilhos]
) -> VendasInstagramGatilhos | None:
    """Match case-insensitive por substring. Gatilho com palavra_chave vazia
    ('qualquer comentário') é avaliado por último, como fallback."""
    txt = (texto or "").lower()
    coringa: VendasInstagramGatilhos | None = None
    for g in gatilhos:
        chave = (g.palavra_chave or "").strip().lower()
        if not chave:
            coringa = coringa or g
            continue
        if chave in txt:
            return g
    return coringa


async def _responder(
    db: AsyncSession,
    *,
    config: VendasDisparoConfig,
    lead: VendasLeads,
    gatilho: VendasInstagramGatilhos,
    comentario: dict,
    registro: VendasInstagramComentarios,
) -> None:
    """Gera (IA) e envia a resposta conforme o gatilho. Tolerante: falha de envio
    grava ``erro`` no registro e não derruba o webhook."""
    token = decrypt_secret(config.instagram_token_enc) if config.instagram_token_enc else ""
    comment_id = comentario.get("comment_id") or ""

    precisa_ia = bool(gatilho.responder_dm) or (
        gatilho.responder_publico and not gatilho.resposta_publica_fixa
    )
    texto_ia = ""
    if precisa_ia:
        mensagem = comentario.get("texto") or ""
        if gatilho.instrucao_ia:
            mensagem = f"{mensagem}\n\n[Instrução para a resposta: {gatilho.instrucao_ia}]"
        try:
            texto_ia = await vendas_sdr.gerar_resposta(
                db, empresa_id=lead.empresa_id, lead_id=lead.id, mensagem=mensagem
            )
        except (ValueError, LLMError):  # SDR sem config / falha de IA → segue sem IA
            texto_ia = ""

    texto_publico = gatilho.resposta_publica_fixa or texto_ia
    registro.gatilho_id = gatilho.id
    registro.resposta_texto = texto_ia or texto_publico or None

    if gatilho.responder_publico and texto_publico and comment_id:
        try:
            await instagram_meta.reply_public(
                token=token, comment_id=comment_id, message=texto_publico
            )
            registro.respondido_publico = True
        except instagram_meta.InstagramError as exc:
            registro.erro = (registro.erro or "") + f"[publico] {exc} "

    if gatilho.responder_dm and texto_ia and comment_id:
        try:
            await instagram_meta.send_private_reply(
                token=token,
                ig_user_id=config.instagram_user_id or "",
                comment_id=comment_id,
                message=texto_ia,
            )
            registro.respondido_dm = True
        except instagram_meta.InstagramError as exc:
            registro.erro = (registro.erro or "") + f"[dm] {exc} "


async def processar_comentarios_webhook(
    db: AsyncSession, *, empresa_id: uuid.UUID, comentarios: list[dict]
) -> int:
    """Processa comentários inbound. COMMITA ao final. Retorna quantos viraram
    registro novo (após anti-loop + dedup)."""
    config = await _carregar_config(db, empresa_id)
    self_id = (config.instagram_user_id or None) if config else None

    gatilhos = (
        await db.scalars(
            select(VendasInstagramGatilhos).where(
                VendasInstagramGatilhos.empresa_id == empresa_id,
                VendasInstagramGatilhos.ativo.is_(True),
            )
        )
    ).all()

    processados = 0
    for c in comentarios or []:
        comment_id = c.get("comment_id")
        from_id = c.get("from_id")
        if not comment_id or not from_id:
            continue
        # 1) anti-loop
        if self_id and from_id == self_id:
            continue
        # 2) idempotência
        existe = await db.scalar(
            select(VendasInstagramComentarios).where(
                VendasInstagramComentarios.empresa_id == empresa_id,
                VendasInstagramComentarios.comment_id == comment_id,
            )
        )
        if existe is not None:
            continue

        # 3) lead
        lead = await _achar_ou_criar_lead(
            db, empresa_id=empresa_id, from_id=from_id,
            from_username=c.get("from_username"),
        )

        # registro do comentário (idempotência + histórico)
        registro = VendasInstagramComentarios(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            comment_id=comment_id,
            media_id=c.get("media_id"),
            parent_id=c.get("parent_id"),
            from_user_id=from_id,
            from_username=c.get("from_username"),
            texto=c.get("texto"),
            lead_id=lead.id,
        )
        db.add(registro)

        # 4) Conversas (inbox + SSE)
        try:
            await append_mensagem(
                db, empresa_id=empresa_id, lead_id=lead.id,
                sender_type="lead", conteudo=c.get("texto") or "",
                canal="instagram",
            )
        except Exception:  # pragma: no cover - espelho best-effort
            await db.rollback()
            continue

        # 5) gating + resposta
        if config is not None:
            gatilho = _casar_gatilho(c.get("texto"), gatilhos)
            if gatilho is not None:
                await _responder(
                    db, config=config, lead=lead, gatilho=gatilho,
                    comentario=c, registro=registro,
                )

        # 6) qualificação assíncrona (reusa a fila existente)
        await queue.enqueue(
            "sdr_qualificar_lote",
            {"empresa_id": str(empresa_id), "lead_ids": [str(lead.id)]},
        )

        processados += 1

    await db.commit()
    return processados


# ═══════════════════════════════════════════════════════════════════════════════
# Fase 3: publicação de posts (Content Publishing)
# ═══════════════════════════════════════════════════════════════════════════════

async def iniciar_publicacao(
    db: AsyncSession, *, empresa_id: uuid.UUID, tipo: str, caption: str | None, midias: list[dict]
) -> VendasInstagramPublicacoes:
    """Cria a linha de publicação (status processando). NÃO chama a Meta (o router
    commita e enfileira)."""
    pub = VendasInstagramPublicacoes(
        id=uuid.uuid4(), empresa_id=empresa_id, tipo=tipo,
        caption=caption, midias=midias, status="processando",
    )
    db.add(pub)
    await db.flush()
    return pub


async def _aguardar_container(token: str, creation_id: str) -> None:
    """Faz poll do container até FINISHED. ERROR/timeout → InstagramError."""
    for _ in range(_POLL_MAX):
        st = await instagram_meta.status_container(token=token, creation_id=creation_id)
        if st == "FINISHED":
            return
        if st == "ERROR":
            raise instagram_meta.InstagramError("processamento da mídia falhou (ERROR)")
        if _POLL_SLEEP:
            await asyncio.sleep(_POLL_SLEEP)
    raise instagram_meta.InstagramError("timeout aguardando processamento da mídia")


async def executar_publicacao(db: AsyncSession, *, publicacao_id: uuid.UUID) -> None:
    """Handler da fila 'instagram_publicar'. Cria container(s), publica e atualiza a
    linha. Idempotente (pula se já publicado). COMMITA ao final."""
    pub = await db.get(VendasInstagramPublicacoes, publicacao_id)
    if pub is None or pub.status == "publicado":
        return
    config = await _carregar_config(db, pub.empresa_id)
    if config is None or not config.instagram_user_id or not config.instagram_token_enc:
        pub.status = "erro"
        pub.erro = "Instagram não configurado"
        await db.commit()
        return

    token = decrypt_secret(config.instagram_token_enc)
    ig_id = config.instagram_user_id
    midias = pub.midias or []
    if not midias:
        pub.status = "erro"
        pub.erro = "sem mídia"
        await db.commit()
        return
    try:
        if pub.tipo == "CAROUSEL":
            filhos: list[str] = []
            for m in midias:
                kw = {"image_url": m["url"]} if m.get("tipo") == "image" else {"video_url": m["url"]}
                cid = await instagram_meta.criar_container(
                    token=token, ig_user_id=ig_id, is_carousel_item=True, **kw
                )
                if m.get("tipo") == "video":
                    await _aguardar_container(token, cid)
                filhos.append(cid)
            creation_id = await instagram_meta.criar_container(
                token=token, ig_user_id=ig_id, media_type="CAROUSEL",
                children=filhos, caption=pub.caption,
            )
        elif pub.tipo == "REELS":
            creation_id = await instagram_meta.criar_container(
                token=token, ig_user_id=ig_id, media_type="REELS",
                video_url=midias[0]["url"], caption=pub.caption,
            )
            await _aguardar_container(token, creation_id)
        else:  # IMAGE
            creation_id = await instagram_meta.criar_container(
                token=token, ig_user_id=ig_id, image_url=midias[0]["url"], caption=pub.caption,
            )

        pub.creation_id = creation_id
        media_id = await instagram_meta.publicar_container(
            token=token, ig_user_id=ig_id, creation_id=creation_id
        )
        pub.ig_media_id = media_id
        pub.status = "publicado"
        pub.erro = None
    except instagram_meta.InstagramError as exc:
        pub.status = "erro"
        pub.erro = str(exc)

    await db.commit()
