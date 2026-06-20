# Canal WhatsApp via Evolution API (Projeto incremental)

**Data:** 2026-06-20
**Branch:** `feat/evolution-whatsapp-channel`
**Depende de:** Toriq Vendas (Disparo Fase 2/3, SDR Fase 4-6, Pipeline) — já em `main`.

## Objetivo

Adicionar um **novo canal de WhatsApp** baseado na **Evolution API** (self-hosted
na VPS do usuário), de forma **totalmente incremental** e **paralela** ao canal
Meta Cloud API já existente. Multi-tenant: o super admin configura UM servidor
Evolution global; o super admin e cada empresa criam e gerenciam suas próprias
instâncias nesse servidor.

NÃO usa os endpoints `/evoai/*` da Evolution. O "cérebro" de IA continua sendo o
**SDR Inteligente (Claude)** que já existe — a Evolution é apenas mais um
*transporte* de WhatsApp.

## Decisões (do brainstorming)

1. **Papel do TORIQ:** cliente da Evolution API, com gestão de instâncias
   multi-tenant.
2. **Topologia:** 1 servidor Evolution global (VPS). Super admin configura a
   conexão (baseUrl + API key global). Super admin e cada empresa criam
   instâncias, com limite configurável por empresa.
3. **Escopo do v1:** (a) gestão de instâncias, (b) envio avulso, (c) integração
   com Disparo/Campanhas, (d) inbound via webhook, (e) conexão com o SDR.
4. **IA:** SDR completo e automático — reusa o fluxo `sdr_inbound` existente,
   trocando apenas o transporte de envio.

## Achado-chave (de-risca o projeto)

O canal Meta já estabelece TODO o padrão a seguir:
- `app/integrations/whatsapp_meta.py` — cliente httpx stateless, `WhatsAppError`,
  funções puras de webhook.
- `app/services/vendas_whatsapp.py` — regra de negócio; **não commita** (quem
  chama commita), exceto processadores de webhook.
- `app/api/vendas_whatsapp.py` — webhook público (GET verify + POST eventos com
  validação de assinatura).
- O webhook inbound do Meta já faz exatamente o que precisamos replicar:
  `append_mensagem` no Pipeline + `queue.enqueue("sdr_inbound", ...)` quando o
  SDR está ativo com `auto_responder`.

Logo o canal Evolution é **espelhar esse padrão** com tabelas próprias para
suportar N instâncias por empresa, e adicionar um `case` de roteamento por canal.

## Arquitetura de camadas

```
Frontend (React)  src/components/admin/vendas/evolution/*
                  src/integrations/api/vendasEvolution.ts
        ▼
API (router)      app/api/vendas_evolution.py   ← CRUD instâncias (auth) + webhook (público)
        ▼
Service (regra)   app/services/vendas_evolution.py   ← ciclo de vida, envio, webhook; NÃO commita
        ▼
Integration       app/integrations/evolution_api.py  ← httpx stateless, header apikey, EvolutionError
        ▼
Evolution API (VPS)  ──webhook──▶  POST /vendas/evolution/webhook/{webhook_token}
```

## Modelo de dados (2 tabelas novas + 1 coluna)

### `vendas_evolution_servidor` (global, 1 linha — só super admin)
- `id` (uuid, PK)
- `base_url` (text) — ex.: `https://evo.minhavps.com.br`
- `api_key_enc` (text) — API key global da Evolution, criptografada
  (`app.core.esocial_crypto`)
- `webhook_base_url` (text) — URL pública do TORIQ que a Evolution chama
- `limite_padrao_instancias` (int, default ex. 1)
- `ativo` (bool, default true)
- `created_at`, `updated_at`

### `vendas_evolution_instancias` (N por empresa)
- `id` (uuid, PK)
- `empresa_id` (uuid, FK empresas)
- `nome_exibicao` (text) — nome amigável escolhido pelo usuário
- `instance_name` (text, UNIQUE) — nome real na Evolution, namespeado para evitar
  colisão entre tenants no servidor compartilhado: `emp_{empresa_id[:8]}_{slug}`
- `numero` (text, nullable) — telefone conectado (preenchido ao conectar)
- `status` (text) — `criada` | `conectando` | `conectada` | `desconectada`
- `instance_token_enc` (text, nullable) — token da instância retornado pela
  Evolution, criptografado
- `webhook_token` (text, UNIQUE) — segredo aleatório usado na URL do webhook para
  identificar empresa+instância com segurança
- `criado_por` (uuid, nullable) — user id
- `created_at`, `updated_at`

### Reuso — `vendas_mensagens` (1 coluna nova)
- Adicionar `instancia_id` (uuid, FK nullable) — liga a mensagem à instância
  Evolution que a enviou/recebeu.
- Novo valor de `canal`: **`whatsapp_evo`** (templates, campanhas e mensagens).
- Supressão (tipo `telefone`, valor só dígitos), dedup, métricas e templates são
  reaproveitados sem mudança.

### Reuso — `vendas_leads` (1 coluna nova, para o SDR channel-aware)
- Adicionar `ultimo_canal` (text, nullable, default `whatsapp`) — registra por
  qual canal chegou o último inbound do lead. O webhook do Meta seta `whatsapp`;
  o webhook da Evolution seta `whatsapp_evo`. O default `whatsapp` preserva o
  comportamento atual para leads existentes (regressão zero no Meta).

### Limite de instâncias por empresa
- Default global em `vendas_evolution_servidor.limite_padrao_instancias`.
- Override opcional por empresa via metadata de empresa (a confirmar onde; v1
  pode usar só o default global se não houver necessidade imediata de override).

## Cliente de integração — `app/integrations/evolution_api.py`

Espelho de `whatsapp_meta.py` (httpx `AsyncClient` stateless, header
`apikey: <key>`, erros viram `EvolutionError`):

- `criar_instancia(base_url, api_key, instance_name, webhook_url, eventos)` →
  cria a instância já com webhook configurado.
- `conectar_qrcode(base_url, api_key, instance_name)` → `{base64, pairingCode}`.
- `estado_conexao(base_url, api_key, instance_name)` → `open|close|connecting`.
- `definir_webhook(base_url, api_key, instance_name, url, eventos)`.
- `logout(...)`, `deletar(...)`, `reiniciar(...)`.
- `enviar_texto(base_url, api_key, instance_name, numero, texto)` → id da mensagem.
- `enviar_midia(...)`.
- Funções puras de webhook: `parse_webhook(payload)` → normaliza para
  `{"mensagens": [...], "statuses": [...], "conexao": {...}}`;
  `map_status(...)` → vocabulário interno (igual ao Meta).

### A CONFIRMAR contra a instância Evolution do usuário (na fase de plano)
Paths e payloads exatos podem variar entre versões v1/v2 da Evolution:
- `POST /instance/create`, `GET /instance/connect/{i}`,
  `GET /instance/connectionState/{i}`, `DELETE /instance/logout/{i}`,
  `DELETE /instance/delete/{i}`, `POST /instance/restart/{i}`.
- `POST /message/sendText/{i}`, `POST /message/sendMedia/{i}`.
- `POST /webhook/set/{i}`.
- Eventos: `MESSAGES_UPSERT` (inbound), `CONNECTION_UPDATE`, `QRCODE_UPDATED`,
  `MESSAGES_UPDATE`.
- Estrutura do callback `messages.upsert`: `data.key.remoteJid` (remetente),
  `data.pushName`, `data.message.conversation` (texto), `data.messageType`.
- Header de auth: `apikey`.

## Fluxos principais

### 1. Configurar servidor (super admin)
`PUT /vendas/evolution/servidor` (super admin) salva base_url + api_key
(criptografada) + webhook_base_url. `GET` retorna com a key mascarada.

### 2. Criar + conectar instância
1. Empresa: `POST /vendas/evolution/instancias` `{nome_exibicao}`.
2. Service valida limite, gera `instance_name` namespeado + `webhook_token`,
   chama `criar_instancia` na Evolution já com o webhook apontando para
   `{webhook_base_url}/vendas/evolution/webhook/{webhook_token}`.
3. Persiste a instância com status `conectando`.
4. Frontend abre `GET /vendas/evolution/instancias/{id}/qrcode` → mostra o QR
   (base64) e faz polling em `GET .../status` até `conectada`.

### 3. Listar / status / desconectar / deletar
`GET /vendas/evolution/instancias` (escopado por empresa), `GET .../status`,
`POST .../reconectar`, `DELETE .../{id}` (logout + delete na Evolution).

### 4. Envio avulso
`POST /vendas/evolution/instancias/{id}/enviar` `{numero, texto|media}` →
`enviar_texto/midia` → grava `vendas_mensagens` (canal `whatsapp_evo`,
`instancia_id`).

### 5. Campanha pelo canal Evolution
Campanha com `canal=whatsapp_evo`. O dispatcher de `vendas_disparo` roteia por
canal: `email→smtp`, `whatsapp→meta`, **`whatsapp_evo→evolution`**. Reusa
supressão, dedup, materialização de mensagens e métricas. A instância usada é a
instância **conectada** da empresa (escolha explícita na campanha ou a default).

### 6. Inbound (webhook)
`POST /vendas/evolution/webhook/{webhook_token}`:
1. Acha a instância pelo `webhook_token` (sem token válido → 403).
2. `parse_webhook` extrai mensagens/statuses/conexão.
3. Para inbound: acha o lead pelo telefone (escopado por empresa), marca
   `respondeu`, chama `append_mensagem` (Pipeline, `sender_type=lead`).
4. Se o SDR está `ativo` + `auto_responder` + tem `api_key`: `commit` e
   `queue.enqueue("sdr_inbound", {empresa_id, lead_id, mensagem})` — idêntico ao
   Meta.
5. Para `connection.update`: atualiza `status`/`numero` da instância.
6. Sempre responde 200 (Evolution reenvia em não-200). Tolerante a falhas.

### 7. SDR responde (channel-aware) — único ponto não-aditivo
Hoje `_enviar_whatsapp_sdr` (em `app/services/vendas_sdr.py`) usa só o Meta.
Mudança:
- O webhook (Meta e Evolution) grava `vendas_leads.ultimo_canal` a cada inbound.
- `_enviar_whatsapp_sdr` lê `lead.ultimo_canal` e escolhe o transporte:
  - `whatsapp_evo` → busca a instância conectada da empresa e usa
    `evolution_api.enviar_texto`.
  - `whatsapp` (default) → Meta (comportamento atual, inalterado).
- Mantém "um cérebro, múltiplos canais": o SDR não muda de lógica, só de saída.
  O job `sdr_inbound` continua recebendo só `{empresa_id, lead_id, mensagem}`; a
  decisão de transporte é resolvida na hora do envio lendo o lead.

## Segurança / multi-tenant

- `api_key` global e `instance_token` **criptografados** em repouso; nunca
  retornam em claro (mascarados na UI).
- Config do servidor: só **super admin** (`require_role`).
- Instâncias escopadas por `empresa_id`; `instance_name` namespeado.
- Webhook público identificado por `webhook_token` secreto na URL; inválido → 403.
- Limite de instâncias por empresa validado no service.

## Frontend

- Nova aba **Evolution** em `src/components/admin/vendas/evolution/`:
  - Lista de instâncias com badges de status.
  - Diálogo "Nova instância" + **modal de QR code** (com polling de status).
  - Botões reconectar / desconectar / deletar; envio de teste.
- Tela de **config do servidor** (só super admin).
- `src/integrations/api/vendasEvolution.ts` — cliente HTTP espelhado (tipos +
  funções), autenticado via cookie httpOnly como os demais.
- Registrar a seção no dashboard (sidebar + `renderSection`) seguindo o padrão
  das demais telas de vendas.

## Migrations, testes, registro

- **Migration Alembic:** cria as 2 tabelas + coluna `instancia_id` em
  `vendas_mensagens`; (a confirmar) ajustar checks de `canal` para aceitar
  `whatsapp_evo`.
- **Router:** registrar `vendas_evolution_router` em `app/main.py`.
- **Testes** (espelhando `apps/api/tests/test_vendas_whatsapp.py`): mock do
  `evolution_api` por monkeypatch — ciclo de vida (criar/QR/status/deletar),
  envio avulso, campanha por `whatsapp_evo`, webhook inbound que enfileira
  `sdr_inbound`, SDR respondendo via Evolution, isolamento cross-tenant,
  permissões (super admin para servidor; empresa para instâncias).

## Fora do escopo (v1 — YAGNI)

- Endpoints `/evoai/*` da Evolution (não usamos — o cérebro é o SDR).
- Mensagens de grupo.
- Tipos avançados de mídia além do básico (texto + imagem/documento simples).
- Múltiplos servidores Evolution (só 1 global no v1).
- Override de limite por empresa pode ficar para depois se não for necessário já.

## Verificação (success criteria)

- Super admin configura o servidor; empresa cria instância e conecta via QR
  (status vira `conectada`).
- Envio avulso chega no WhatsApp de destino e grava `vendas_mensagens`.
- Campanha com `canal=whatsapp_evo` envia respeitando supressão/dedup.
- Inbound do lead aparece no Pipeline e dispara o SDR, que **responde pela
  Evolution**.
- Empresa A não enxerga instâncias/mensagens da empresa B.
- Nada do canal Meta/email é alterado em comportamento (regressão zero).
