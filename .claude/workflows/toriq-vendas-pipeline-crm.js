export const meta = {
  name: 'toriq-vendas-pipeline-crm',
  description: 'Build Toriq Vendas Pipeline & Conversas (Chatwoot-style): Redis SSE events + pipeline stages/conversas models + service/router (board, move, chat, conversao, SSE) + Kanban front + Conversas inbox/Conversao front, in parallel over disjoint NEW files against a fixed contract.',
  phases: [{ title: 'Build' }],
}

const CONTRACT = `
# PROJETO
TORIQ Corp — monorepo. Backend Python apps/api (FastAPI + SQLAlchemy 2.0 async/asyncpg + Alembic, uv). Front Vite+React+TS em src/. Multi-tenant: tenant SEMPRE por user.empresa_id (403 se None). pt-BR no código. httpx e redis são deps de runtime. @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities já instalados no front. shadcn/ui em @/components/ui/*. Toast: sonner. Em toasts use error?.message (NUNCA error?.detail).

# FEATURE: Toriq Vendas — Pipeline & Conversas (CRM estilo Chatwoot/tio-crm)
Acompanhar leads (de disparo, prospecção, WhatsApp, etc.) numa PIPELINE (kanban por estágios) + INBOX de conversas (thread por lead) + dashboard de CONVERSÃO, com TEMPO REAL via SSE (Redis pub/sub). Reusa vendas_leads, vendas_tags/vendas_lead_tags, e o envio WhatsApp (send_text) + cripto.

# COLUNAS que o integrador VAI adicionar em vendas_leads (use por NOME; já assuma que existem):
stage_id (Uuid), is_pinned (Boolean), is_archived (Boolean), last_message_at (DateTime(True)), last_read_at (DateTime(True)), pending_reply (Boolean), temperatura (Text: quente|morno|frio|null), valor_estimado (Numeric).
Model existente: app/models/vendas.py -> VendasLeads (tem nome, empresa_nome, telefone, email, status, origem, plataforma, cidade, estado, sdr_status, sdr_score, sdr_notas).

# CONTRATO FIXO (nomes EXATOS)

## Eventos SSE — app/core/events.py (Redis pub/sub; LEIA app/core/cache.py p/ estilo de cliente redis com fallback)
- import redis.asyncio em try/except (degrade se faltar). Usa settings.redis_url + settings.cache_prefix.
- def _canal(empresa_id) -> str: retorna a string (cache_prefix + ":eventos:" + empresa_id).
- async def publicar(empresa_id, evento: dict) -> None: se redis configurado, faz PUBLISH do json no canal da empresa; SEM redis ou erro -> no-op silencioso (nunca levanta).
- async def assinar(empresa_id): ASYNC GENERATOR que dá yield em dicts de eventos recebidos no canal. Se SEM redis -> apenas dorme e dá yield de heartbeat ({"tipo":"ping"}) a cada ~15s. Trata CancelledError encerrando a subscription limpo. Nunca levanta para fora.
- Tipos de evento (string em evento["tipo"]): "conversa_nova_mensagem", "lead_atualizado", "lead_movido". Sempre inclua evento["lead_id"] quando aplicável.

## Models — app/models/vendas_pipeline.py (from app.models.generated import Base; schema "public"; LEIA app/models/vendas_disparo.py p/ estilo)
class VendasPipelineStages(Base): __tablename__="vendas_pipeline_stages".
  Cols: id (Uuid pk gen_random_uuid()), empresa_id (Uuid not null), nome (Text not null), cor (Text), ordem (Integer server_default text("0")), is_closed (Boolean server_default text("false")), is_won (Boolean server_default text("false")), created_at (DateTime(True) now()).
  __table_args__: FK empresa CASCADE (vendas_pipeline_stages_empresa_id_fkey), PK (vendas_pipeline_stages_pkey), Index("idx_vendas_pipeline_stages_empresa","empresa_id"), {"schema":"public"}.
class VendasConversas(Base): __tablename__="vendas_conversas".
  Cols: id (Uuid pk gen_random_uuid()), empresa_id (Uuid not null), lead_id (Uuid not null), sender_type (Text not null) [lead|agente|sdr|sistema], canal (Text) [whatsapp|email|interno], conteudo (Text), status (Text), media (JSONB), created_at (DateTime(True) now()).
  __table_args__: FK empresa CASCADE (vendas_conversas_empresa_id_fkey), FK(["lead_id"],["public.vendas_leads.id"],ondelete="CASCADE", name="vendas_conversas_lead_id_fkey"), PK (vendas_conversas_pkey), Index("idx_vendas_conversas_lead","lead_id"), Index("idx_vendas_conversas_empresa","empresa_id"), {"schema":"public"}.
(NÃO crie migration; NÃO edite vendas.py/models/__init__.py/main.py.)

## Schemas — app/schemas/vendas_pipeline.py (Pydantic v2, ConfigDict(from_attributes=True) nos *Out; import uuid, datetime)
- StageIn: nome:str; cor:str|None=None; ordem:int|None=None; is_closed:bool|None=None; is_won:bool|None=None
- StageUpdate: todos opcionais
- StageOut(from_attributes): id, empresa_id(uuid); nome; cor:str|None; ordem:int; is_closed:bool; is_won:bool
- LeadCardOut: id:uuid; nome:str|None; empresa_nome:str|None; telefone:str|None; email:str|None; stage_id:uuid|None; temperatura:str|None; valor_estimado:float|None; sdr_score:int|None; status:str|None; origem:str|None; is_pinned:bool; is_archived:bool; pending_reply:bool; unread:int; last_message_at:datetime|None; last_message_preview:str|None; tags:list[dict]
- BoardOut: stages:list[StageOut]; leads:list[LeadCardOut]
- MoverLeadIn: stage_id:uuid.UUID; valor_estimado:float|None=None; motivo:str|None=None
- ConversaMensagemOut(from_attributes): id, empresa_id, lead_id(uuid); sender_type:str; canal:str|None; conteudo:str|None; status:str|None; media:dict|None; created_at:datetime|None
- ConversaThreadOut: lead:LeadCardOut; mensagens:list[ConversaMensagemOut]
- EnviarMensagemIn: conteudo:str
- LeadPatchIn: stage_id:uuid|None=None; temperatura:str|None=None; valor_estimado:float|None=None; is_pinned:bool|None=None; is_archived:bool|None=None
- ConversaoOut: itens:list[dict]; total_leads:int; valor_total:float

## Serviço — app/services/vendas_pipeline.py (LEIA app/services/vendas_disparo.py p/ estilo; recebe db, commita nos pontos de entrada)
- ESTAGIOS_PADRAO = [("Novo","#64748b",0,False,False),("Contatado","#3b82f6",1,False,False),("Respondeu","#06b6d4",2,False,False),("Qualificado","#f59e0b",3,False,False),("Proposta","#a855f7",4,False,False),("Ganho","#22c55e",5,True,True),("Perdido","#ef4444",6,True,False)]
- async def garantir_estagios(db, empresa_id) -> list: se a empresa não tem estágios, cria os ESTAGIOS_PADRAO; retorna estágios ordenados por ordem. (lazy-seed)
- async def append_mensagem(db, *, empresa_id, lead_id, sender_type, conteudo, canal="whatsapp", status=None, media=None): cria VendasConversas; atualiza lead.last_message_at=now; se sender_type=="lead" -> lead.pending_reply=True; commit; PUBLICA evento "conversa_nova_mensagem" (import local de app.core.events.publicar) com lead_id. Retorna a msg.
- async def mover_lead(db, *, empresa_id, lead_id, stage_id, valor_estimado=None, motivo=None): valida stage da empresa; seta lead.stage_id; se valor_estimado -> lead.valor_estimado; commit; PUBLICA "lead_movido". Retorna lead.
- async def marcar_lido(db, *, empresa_id, lead_id) -> None: lead.last_read_at=now; lead.pending_reply=False; commit; PUBLICA "lead_atualizado".
- async def board(db, *, empresa_id, incluir_arquivados=False) -> dict: garante estágios; retorna {stages:[...], leads:[dicts no formato LeadCardOut]} (leads não arquivados; unread = count de vendas_conversas sender_type="lead" com created_at > last_read_at; last_message_preview = última conversa; tags do lead). Leads com stage_id null -> usar o id do estágio "Novo" no card.
- async def listar_conversas(db, *, empresa_id, busca=None, tag_id=None, temperatura=None, stage_id=None, arquivados=False, limit=50, offset=0) -> list[dict]: leads ordenados por is_pinned desc, last_message_at desc nulls last; aplica filtros; inclui unread/preview/tags.
- async def thread(db, *, empresa_id, lead_id, limit=200) -> dict: {lead:dict, mensagens:[...asc]}; ValueError se lead não é da empresa. NÃO marca lido.
- async def enviar_resposta(db, *, empresa_id, lead_id, conteudo): carrega lead; envia por WhatsApp (send_text com VendasDisparoConfig: whatsapp_phone_id + decrypt(whatsapp_token_enc), to=telefone só dígitos) — tolerante (status="erro" se WhatsAppError, mas registra a msg). append_mensagem(sender_type="agente", canal="whatsapp", status). Retorna a msg.
- async def conversao(db, *, empresa_id) -> dict: por estágio total de leads + soma valor_estimado; {itens:[{stage_id,nome,cor,total,valor}], total_leads, valor_total}.

## Router — app/api/vendas_pipeline.py (router = APIRouter(prefix="/vendas", tags=["vendas-pipeline"]); require_admin + _require_empresa iguais a app/api/vendas.py)
- GET /vendas/pipeline/stages -> list[StageOut] (garante padrões). POST -> StageOut. PUT /vendas/pipeline/stages/{id}. DELETE /vendas/pipeline/stages/{id} (ao deletar, leads daquele stage ficam stage_id=null).
- GET /vendas/pipeline/board -> BoardOut.
- POST /vendas/pipeline/leads/{lead_id}/mover (MoverLeadIn) -> LeadCardOut.
- PATCH /vendas/pipeline/leads/{lead_id} (LeadPatchIn) -> LeadCardOut.
- GET /vendas/conversas?busca&tag_id&temperatura&stage_id&arquivados&limit&offset -> list[LeadCardOut].
- GET /vendas/conversas/{lead_id} -> ConversaThreadOut.
- POST /vendas/conversas/{lead_id}/mensagem (EnviarMensagemIn) -> ConversaMensagemOut.
- POST /vendas/conversas/{lead_id}/ler -> 204 (marcar_lido).
- GET /vendas/pipeline/conversao -> ConversaoOut.
- SSE: GET /vendas/eventos/stream -> StreamingResponse(media_type="text/event-stream"). Autentica via get_current_user (cookie). Gera um async generator: primeiro um heartbeat (uma linha que começa com ":" + ping), depois "async for evento in app.core.events.assinar(empresa_id): yield f-string no formato SSE 'data: ' + json.dumps(evento) + duas quebras de linha". Headers: Cache-Control no-cache, Connection keep-alive, X-Accel-Buffering no. Encerra limpo no disconnect.
Tests tests/test_vendas_pipeline.py: harness existente (LEIA tests/test_vendas_disparo.py + conftest). MOCKE whatsapp send_text. Cubra: garantir_estagios cria 7 padrões, board agrupa leads, mover_lead muda stage, append_mensagem + thread, enviar_resposta (provider chamado, msg registrada), conversas list filtros, marcar_lido zera unread, cross-tenant. (Sem migration — integrador roda; campos de vendas_leads dependem dela.)

## Reuso: from app.api.deps import require_role, get_current_user; from app.core.db import get_db; from app.core.esocial_crypto import decrypt_secret; from app.models.user import User, UserRole; from app.models.vendas import VendasLeads, VendasTags, VendasLeadTags; from app.models.vendas_disparo import VendasDisparoConfig; from app.models.vendas_pipeline import VendasPipelineStages, VendasConversas; from app.integrations.whatsapp_meta import send_text, WhatsAppError.

## FRONT (NÃO edite AdminDashboard/AdminSidebar — integrador liga). LEIA src/integrations/api/vendas.ts (client), src/components/admin/vendas/LeadsCaptados.tsx + .../disparo/Disparo.tsx (estilo, abas, skeleton, sonner) e src/components/sst/toriq-corp/FunilKanban.tsx (kanban existente). Use @dnd-kit p/ o kanban.
- src/integrations/api/vendasPipeline.ts: client api/apiRequest de @/integrations/api/client. Métodos: getStages/createStage/updateStage/deleteStage; getBoard; moverLead(id,{stage_id,valor_estimado?,motivo?}); patchLead(id,data); listConversas(filtros); getThread(leadId); enviarMensagem(leadId,conteudo); marcarLido(leadId); getConversao. E um helper conectarEventos(onEvento): cria um EventSource para o endpoint de stream — a URL base vem de import.meta.env.VITE_API_URL (ou http://localhost:8000) concatenada com "/vendas/eventos/stream", passando { withCredentials: true }; no onmessage faz JSON.parse(ev.data) e chama onEvento(parsed); retorna a instância do EventSource para depois chamar .close(). Tipos espelhando os schemas.
- src/components/admin/vendas/pipeline/PipelineCRM.tsx: PÁGINA com toggle de 3 visões (Conversas | Kanban | Conversão) no topo (segmented/tabs). Abre a conexão SSE via conectarEventos e, ao receber evento, invalida/refetch da visão ativa. Cleanup do EventSource no unmount + fallback de polling leve (~20s).
- src/components/admin/vendas/pipeline/KanbanBoard.tsx (+ StageColumn.tsx, LeadCard.tsx, GanhoPerdidoDialog.tsx, GerenciarEstagios.tsx): colunas por estágio (scroll horizontal), cards arrastáveis via @dnd-kit (PointerSensor activationConstraint distance 8, DragOverlay). Soltar em estágio is_closed -> abre GanhoPerdidoDialog (valor/motivo) e chama moverLead; senão moverLead direto. Botão gerenciar estágios. Card: nome, empresa, telefone, temperatura (emoji), valor R$, badge de não-lidas.
- src/components/admin/vendas/pipeline/ConversasInbox.tsx (+ ConversationList.tsx, ConversationChat.tsx): layout tri-coluna (sidebar filtros [busca, tags, temperatura, estágio, arquivados] | lista [pin no topo, badge não-lidas, preview, tempo relativo] | chat [thread + composer chamando enviarMensagem; ao abrir chama marcarLido]). Responsivo.
- src/components/admin/vendas/pipeline/ConversaoDashboard.tsx: cards/barras por estágio (total + valor) + totais.
Estados de loading (skeleton) e vazios desenhados. Intl/date-fns p/ tempo relativo.
`

phase('Build')
const REPORT = { type:'object', additionalProperties:false, required:['arquivos_criados','resumo','pontos_de_atencao'],
  properties:{ arquivos_criados:{type:'array',items:{type:'string'}}, resumo:{type:'string'}, pontos_de_atencao:{type:'array',items:{type:'string'}} } }

const results = await parallel([
  () => agent(CONTRACT + `
# SUA TAREFA (Agent A — Eventos SSE/Redis)
Crie APENAS: apps/api/app/core/events.py + apps/api/tests/test_events.py.
Implemente publicar/assinar/_canal EXATOS, com fallback gracioso. Testes sem rede: publicar não levanta sem redis; _canal formata certo; assinar (sem redis) dá ao menos um heartbeat (use asyncio.wait_for com timeout curto p/ pegar 1 item) e encerra. LEIA app/core/cache.py. Rode: cd apps/api && uv run pytest tests/test_events.py -q. Retorne o relatório.`,
    { label:'A:events-sse', phase:'Build', schema:REPORT }),

  () => agent(CONTRACT + `
# SUA TAREFA (Agent B — Models + Schemas)
Crie APENAS: apps/api/app/models/vendas_pipeline.py + apps/api/app/schemas/vendas_pipeline.py (EXATOS do contrato).
Antes LEIA app/models/vendas_disparo.py + app/schemas/vendas_disparo.py. Valide: cd apps/api && uv run python -m py_compile app/models/vendas_pipeline.py app/schemas/vendas_pipeline.py. Retorne o relatório.`,
    { label:'B:models-schemas', phase:'Build', schema:REPORT }),

  () => agent(CONTRACT + `
# SUA TAREFA (Agent C — Serviço + Router + Tests)
Crie APENAS: apps/api/app/services/vendas_pipeline.py + apps/api/app/api/vendas_pipeline.py + apps/api/tests/test_vendas_pipeline.py.
Implemente Serviço + Router EXATOS (incl. SSE). Importe models/schemas (Agent B), events (Agent A), whatsapp_meta. py_compile para validar.
pontos_de_atencao DEVE listar: (1) registrar router em main.py, (2) ALTER vendas_leads (stage_id,is_pinned,is_archived,last_message_at,last_read_at,pending_reply,temperatura,valor_estimado) é do integrador, (3) VendasLeads precisa ganhar esses atributos no model, (4) hooks: integrador faz o WhatsApp inbound e o SDR gravarem em vendas_conversas via append_mensagem. Retorne o relatório.`,
    { label:'C:service-router', phase:'Build', schema:REPORT }),

  () => agent(CONTRACT + `
# SUA TAREFA (Agent D — Front Kanban)
Crie APENAS (em src/components/admin/vendas/pipeline/): KanbanBoard.tsx, StageColumn.tsx, LeadCard.tsx, GanhoPerdidoDialog.tsx, GerenciarEstagios.tsx.
Siga o bloco FRONT (Kanban). Use @dnd-kit. LEIA src/components/sst/toriq-corp/FunilKanban.tsx e src/integrations/api/vendas.ts. Importe o client de '@/integrations/api/vendasPipeline' (criado pelo Agent E em paralelo). TS válido, NÃO rode build. Retorne o relatório.`,
    { label:'D:front-kanban', phase:'Build', schema:REPORT }),

  () => agent(CONTRACT + `
# SUA TAREFA (Agent E — Front Conversas + Conversão + client/SSE + página)
Crie APENAS: src/integrations/api/vendasPipeline.ts + src/components/admin/vendas/pipeline/PipelineCRM.tsx + ConversasInbox.tsx + ConversationList.tsx + ConversationChat.tsx + ConversaoDashboard.tsx.
Siga o bloco FRONT (client + SSE + página toggle + inbox tri-coluna + dashboard). PipelineCRM importa KanbanBoard de './KanbanBoard' (Agent D, paralelo). LEIA src/integrations/api/vendas.ts, .../disparo/Disparo.tsx e LeadsCaptados.tsx. TS válido, NÃO rode build. Retorne o relatório.`,
    { label:'E:front-conversas', phase:'Build', schema:REPORT }),
])
return { agentes:['A:events','B:models','C:service-router','D:kanban','E:conversas'], resultados: results }
