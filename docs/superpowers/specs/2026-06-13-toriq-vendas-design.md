# Toriq Vendas — Design & Roadmap (plano detalhado)

> **Status:** DESIGN (aguardando aprovação). Nenhum código antes do OK.
> **Data:** 2026-06-13
> **O que é:** plataforma de prospecção + outreach + SDR com IA, dentro do TORIQ, entregue
> como **módulo contratável** (white-label). Começa só para super-admin; depois liberável
> por empresa, com **medição de uso** para cobrança.

## 1. Decisões já tomadas (input do usuário)

| Tema | Decisão |
|---|---|
| Scraping | **Apify** (actors gerenciados: Maps/IG/LinkedIn/FB). Sem evasão de detecção construída por nós; risco gerenciado pelo usuário. |
| IA do SDR | **Claude (Anthropic)** — já usado no projeto, melhor p/ agentes/tool-use. |
| Gating | **Módulo contratável white-label desde o início** (reusa `/modulos` + `/empresas-modulos`). Super-admin agora; empresas depois com medição de uso. |
| WhatsApp | **API oficial Meta (WhatsApp Cloud API / Graph API)**. |
| Email | Provedor transacional (SMTP/Resend/SendGrid — decidir na Fase 2). |

## 2. Guardrails de compliance (não-negociáveis no design)

Independente do scraping ser via Apify, o **outreach** precisa ser legal:
- **LGPD:** rastrear base legal/consentimento por lead; armazenar origem do dado.
- **Opt-out/descadastro** obrigatório em todo email; **lista de supressão** global por empresa (nunca redisparar para quem saiu).
- **WhatsApp:** Meta exige **opt-in** e **templates aprovados** para marketing; janela de 24h para mensagens livres (free-form) após resposta do usuário. O design respeita isso.
- **Rate limiting / throttling** por canal (limites do Meta, reputação de email) e por execução Apify.
- Segredos (tokens Apify/Meta/SMTP/Anthropic) **criptografados em repouso** — reusa o padrão `app/core/esocial_crypto.py` (Fernet + `INTEGRATION_ENCRYPTION_KEY`).

## 2b. Referência comprovada (projeto `vertical-on-sistema-de-sst`)

Existe uma **implementação anterior funcional** em `C:\Users\lukas\Desktop\TORIQ\vertical-on-sistema-de-sst`.
O novo plano **porta** isso (não reinventa). O que existia:

- **Front pronto** (a portar/religar): `src/components/admin/apify/` (ApifyProspeccaoPage,
  ApifyScrapingForm, ApifyJobsTracker, ApifyLeadsList, ApifyLeadConvertDialog, **SDRInteligente**,
  **SegmentacaoLeads**, ApifyConfigDialog) e `src/components/admin/disparo/` (CampanhaCriar,
  CampanhaDetalhe, DisparoConfig, DisparoDashboard, TemplateEditor/List). Hooks `useVendasApi.ts`,
  `useDisparoApi.ts`.
- **Backend** era um **serviço Node externo** (`VITE_ESOCIAL_BACKEND_URL:3001`, rotas `/api/vendas/*`
  e `/api/disparo/*`, Bearer JWT do Supabase), com pipeline de filas (docs CONNECTOR/DEQUEUER/FORMATTER).
- **Contrato `/api/vendas`** (comprovado): `config` (apify key+actors); `scraping/start|status|results`;
  `jobs` + `jobs/{id}/enrich[-stats]|cancel`; `leads` (filtros: plataforma/status/busca/cidade/
  avaliacao_min/datas/tags) + status/delete/limpar-prospeccao; `segmentos` CRUD + `{id}/leads`;
  `tags` CRUD + add/remove em leads; `sdr/stats|recalcular|leads|followups`, `sdr/leads/{id}` +
  interações; **`sdr/ai/config`** (provider, api_key, modelo, **prompt_sistema, temperatura,
  diretrizes, prompt_qualificacao**) + `qualificar[-batch]`.
- **Contrato `/api/disparo`**: `config` WhatsApp (era **Twilio**: account_sid/auth_token/number/
  rate_limit), `instagram/config` (DM via session_cookie + apify_actor), `templates` CRUD,
  `campanhas` (criar com leads[]+canal+agendamento, listar, get, cancelar, retry msg, mensagens).

**Dois upgrades no novo plano vs. o antigo:**
1. **WhatsApp:** trocar Twilio → **API oficial Meta (Cloud API)** (requisito explícito do usuário).
2. **Backend:** reescrever o Node externo → **Python no `apps/api`** (auth/tenant/cripto internos),
   consistente com a migração. A lógica/contrato acima é a spec do port.

## 3. Decomposição em subsistemas

Cada um é uma unidade com fronteira clara (spec→plano→build próprios):

1. **Fundação & Gating** — módulo contratável, tabelas base, nav "Toriq Vendas", medição de uso.
2. **Leads Captados** — armazenamento/gestão/dedupe de leads + import CSV.
3. **Segmentação** — filtros salvos sobre leads (origem, cidade, tags, status…) reutilizados por campanhas e pelo SDR.
4. **Prospecção (Apify)** — disparar actors, normalizar resultados → Leads Captados.
5. **Disparo em Massa — Email** — provedor, templates, campanhas, opt-out, tracking.
6. **WhatsApp (Meta Cloud API)** — config, templates, envio, webhook de entrada.
7. **SDR Inteligente** — agente Claude, prompts dinâmicos, configs, conversação multicanal, escalonamento p/ humano.

## 4. Arquitetura

**Backend (apps/api, FastAPI/SQLAlchemy async):** novo pacote `app/api/vendas/` (routers por subsistema) + models/schemas dedicados. Multi-tenant pelo padrão existente (`user.empresa_id`, `require_role`). Integrações externas isoladas em `app/integrations/` (apify.py, whatsapp_meta.py, email_provider.py, llm_claude.py), cada uma com client fino + segredos via config criptografada.

**Front (src):** novo grupo de nav **"Toriq Vendas"** no `AdminSidebar` (espelha o submenu "Comercial"), com as telas: Prospecção Maps/Insta/LinkedIn/Face, Leads Captados, Disparo em Massa, SDR Inteligente, Segmentação. Visibilidade controlada por `useModulosAtivos` (módulo "toriq_vendas").

**Jobs assíncronos:** scraping, disparo em massa e o loop do SDR são assíncronos. Reusar o scheduler já existente (`app/jobs/scheduler.py`) + tabelas de "job/execução" com status, para não bloquear request e respeitar rate limits. Webhooks (Apify e WhatsApp) entram por endpoints dedicados.

## 5. Modelo de dados (tabelas novas, todas tenant por empresa_id)

Derivado do schema comprovado do `vertical-on` + os upgrades. Todas com `empresa_id`.

```
vendas_config          -- Apify: apify_token_enc, actors jsonb (por plataforma)
vendas_jobs            -- execução Apify (plataforma, parametros jsonb, apify_run_id, status,
                          total_captados, enrich_status, custo)
vendas_leads           -- lead (nome, empresa_nome, telefone, email, plataforma, cidade, estado,
                          avaliacao, dados_brutos jsonb, status, dedupe_key, consentimento, origem;
                          + SDR: sdr_status, sdr_score, sdr_notas, sdr_proximo_followup)
vendas_tags            -- tag (nome, cor) ; vendas_lead_tags (lead_id, tag_id)
vendas_segmentos       -- filtro salvo (filtros jsonb, cor, descricao) sobre vendas_leads
vendas_sdr_ai_config   -- IA do SDR (provider, api_key_enc, modelo, prompt_sistema, temperatura,
                          diretrizes, prompt_qualificacao)  -- "prompts dinâmicos" do agente
vendas_sdr_interacoes  -- histórico por lead (tipo, descricao, ts) + conversas multicanal
vendas_disparo_config  -- WhatsApp Meta (waba_id, phone_id, token_enc, app_secret_enc, rate_limit);
                          Email (provider, smtp_*_enc/api_key_enc, dominio)
vendas_templates       -- templates (nome, conteudo, categoria, canal, meta_template_name p/ aprovados)
vendas_campanhas       -- campanha (nome, template_id, canal email|whatsapp, segmento_id|leads,
                          agendada_para, status, metricas)
vendas_mensagens       -- 1 linha por envio (campanha_id, lead_id, canal, status, provider_id,
                          eventos: enviado/entregue/lido/respondeu/erro)
vendas_supressao       -- opt-out global por empresa (email/telefone) — LGPD
vendas_uso             -- medição p/ cobrança (metrica, qtd, periodo)
```

## 6. Integrações externas (o que vou precisar de você)

| Integração | Para quê | Credencial necessária |
|---|---|---|
| **Apify** | Scraping (Maps/IG/LinkedIn/FB) | API token + nomes dos actors que você já usa |
| **Meta WhatsApp Cloud API** | Disparo/recebimento WhatsApp | WABA ID, Phone Number ID, token permanente, app secret (webhook) |
| **Provedor de email** | Disparo em massa | SMTP ou key (Resend/SendGrid) + domínio verificado (SPF/DKIM) |
| **Anthropic** | Cérebro do SDR | API key |

## 7. Gating & contratação (white-label)

- Cadastrar o módulo **`toriq_vendas`** no catálogo `/modulos` (rota, ícone, nome).
- Super-admin: sempre habilitado. Empresas: habilitado via `/empresas-modulos` quando contratarem.
- **Telas granulares** via `empresas-modulos/{id}/telas` (ex.: empresa contrata só Disparo, não SDR).
- **Medição de uso** (`vendas_uso`): leads captados, mensagens enviadas, conversas SDR, runs Apify → base para planos/cobrança. Painel de uso no super-admin.

## 8. Roadmap faseado (cada fase = entrega utilizável + spec/plano próprios)

- **Fase 0 — Fundação & Gating:** módulo `toriq_vendas` no catálogo + nav "Toriq Vendas" gated + `vendas_config` + `vendas_leads` + **Leads Captados** (CRUD/list/import CSV) + **Segmentação**. *(Entrega: gestão de leads já funcional.)*
- **Fase 1 — Prospecção (Apify):** `vendas_prospeccao_jobs` + integração Apify (Maps primeiro; depois IG/LinkedIn/FB) + webhook de resultado → normaliza em `vendas_leads`. Telas Prospecção Maps/Insta/LinkedIn/Face.
- **Fase 2 — Disparo Email:** provedor + `vendas_templates` + `vendas_campanhas` + `vendas_disparos` + opt-out/`vendas_supressao` + tracking (entregue/aberto). Tela Disparo em Massa (email).
- **Fase 3 — WhatsApp (Meta):** `app/integrations/whatsapp_meta.py` + config + templates aprovados + envio + webhook inbound. Disparo em Massa ganha o canal WhatsApp.
- **Fase 4 — SDR Inteligente:** `vendas_sdr_agentes` (persona/objetivo/prompts dinâmicos/guardrails) + `vendas_sdr_conversas` + loop do agente Claude com tool-use (consultar lead, agendar, escalar p/ humano), respondendo inbound de WhatsApp/email dentro das janelas/opt-in. Telas de config do agente + prompts dinâmicos.
- **Fase 5 — Medição & Contratação:** `vendas_uso` + painel de uso + liberação por empresa + ganchos de cobrança.

## 9. Riscos & mitigações

- **ToS/legal do scraping:** mitigado por usar Apify (terceiro) + decisão consciente do usuário; dados pessoais sob LGPD (origem + base legal registradas).
- **Bloqueio/banimento WhatsApp:** seguir regras de opt-in/templates/janela 24h do Meta; throttling.
- **Reputação de email/spam:** SPF/DKIM/DMARC, warm-up, opt-out, supressão.
- **Custo:** Apify (por run), WhatsApp (por conversa), LLM (por token) — `vendas_uso` mede tudo p/ repassar.
- **Escopo:** entregue em fases; cada fase é utilizável sozinha.

## 10. Premissas (ajuste se necessário)

- Reusa infra existente: auth/tenant, módulos white-label, scheduler, `esocial_crypto` (Fernet).
- Banco começa vazio (sem backfill).
- "Mesma métrica p/ empresas contratarem" = sistema de módulos + telas + `vendas_uso` (medição).
