# SDR multi-provedor de IA (Claude + OpenAI + Gemini)

**Data:** 2026-06-22
**Módulo:** Vendas → SDR Inteligente
**Status:** aprovado (Abordagem A)

## Problema

O campo `vendas_sdr_config.provider` existe (default `anthropic`) e é salvo pelo
router, mas é **decorativo**: as 6 chamadas de IA do SDR vão direto para
`chamar_claude`. Não dá para usar OpenAI nem Gemini. O usuário pediu "mais opções
como open ai e etc" no dropdown "Provedor de IA".

## Escopo

- **Provedores:** Anthropic (existente), **OpenAI** (novo), **Google Gemini** (novo).
- **Chave:** `api_key_enc` passa a ser a chave do **provedor ativo** (Claude OU
  OpenAI OU Gemini). `openai_api_key_enc` continua exclusivo do Whisper, com
  fallback: se `provider=openai` e `openai_api_key_enc` vazio, Whisper reusa
  `api_key_enc`.
- **Sem migration** — os campos `provider`/`modelo`/`api_key` já existem.

## Arquitetura (Abordagem A — dispatcher + helper)

Mantém a convenção do repo: integrações são funções de módulo stateless; o
serviço consome a integração; o serviço não commita (o router commita).

### 1. Integrações novas (`apps/api/app/integrations/`)

Espelham o contrato de `chamar_claude` — mesma assinatura, devolvem **texto puro**,
levantam `LLMError`.

- `llm_openai.py` → `chamar_openai(*, api_key, modelo, system, mensagens, temperatura, max_tokens) -> str`
  - POST `https://api.openai.com/v1/chat/completions`
  - `system` (se houver) vira `{"role":"system","content":system}` no topo de `messages`
  - `mensagens` já estão em `{role, content}` (compatível: user/assistant)
  - extrai `choices[0].message.content`
  - `max_tokens` → `max_tokens`; `temperatura` → `temperature`
- `llm_gemini.py` → `chamar_gemini(*, api_key, modelo, system, mensagens, temperatura, max_tokens) -> str`
  - POST `https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={api_key}`
  - mapeia papéis: `assistant` → `role:"model"`, `user` → `role:"user"`
  - `system` → `system_instruction.parts[].text`
  - `temperatura`/`max_tokens` → `generationConfig.temperature`/`.maxOutputTokens`
  - extrai e concatena `candidates[0].content.parts[].text`

### 2. Dispatcher (`apps/api/app/integrations/llm.py`)

- `chamar_llm(*, provider, api_key, modelo, system, mensagens, temperatura, max_tokens) -> str`
  roteia por `provider` (`anthropic|openai|gemini`); provider desconhecido →
  `LLMError`.
- `LLMError` e `extrair_json` continuam reaproveitados de `llm_claude` (re-export
  para um ponto único de import).

### 3. Serviço (`apps/api/app/services/vendas_sdr.py`)

- Novo helper `_chamar_ia(config, *, system, mensagens, temperatura=None, max_tokens=...)`:
  decripta `api_key_enc`, resolve o modelo-default por provedor, chama `chamar_llm`.
- Substitui as 6 chamadas a `chamar_claude` (qualificar, responder, CoT 2 fases,
  auto-responder) pelo helper.
- Modelos-default: `anthropic`→`claude-sonnet-4-6`, `openai`→`gpt-4o`,
  `gemini`→`gemini-2.0-flash`. Backend segue aceitando texto livre no `modelo`.

### 4. Visão (entender imagens recebidas)

- `descrever_imagem_llm(*, provider, api_key, modelo, imagem, mime, prompt=None)`
  roteia visão: OpenAI (chat/completions com `image_url` base64), Gemini
  (`inline_data` base64), Anthropic (reusa `descrever_imagem` atual).
- `vendas_evolution.py` passa a chamar a versão roteada (continua degradando para
  `None` em falha, como hoje).

### 5. Whisper (transcrição de áudio)

- Inalterado (`openai_whisper.transcrever`, endpoint `/audio/transcriptions`).
- Fallback de chave: se `provider=openai` e `openai_api_key_enc` vazio, usa
  `api_key_enc`.

### 6. Frontend (`src/components/admin/vendas/sdr/SdrConfig.tsx`)

- Dropdown **Provedor** ganha `OpenAI` e `Google (Gemini)`.
- `MODELOS` vira mapa por provedor:
  - anthropic: claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-6
  - openai: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini
  - gemini: gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash
- Ao trocar de provedor, o modelo reseta para o default daquele provedor.
- Modelo fora da lista continua exibível (texto livre). Sem mudança no contrato
  da API.

## Erros

- Falha HTTP/rede em qualquer provedor → `LLMError` (router converte; auto-responder
  degrada como hoje).
- `provider` desconhecido → `LLMError` explícito.
- Sem `api_key_enc` → `ValueError("configure o SDR ...")` (comportamento atual).

## Testes (TDD)

- `tests/test_llm_openai.py`, `tests/test_llm_gemini.py`: montagem de payload +
  parse da resposta + erro HTTP, mockando `httpx`.
- `tests/test_vendas_sdr.py`: roteamento (`provider` → integração certa) mockando
  `chamar_llm`; atualizar testes que mockavam `chamar_claude` para o novo seam.
- Visão: teste de roteamento de `descrever_imagem_llm` por provedor.

## Fora de escopo

- Streaming de resposta.
- Seleção de provedor por-disparo/por-conversa (SDR só).
- Campos de chave separados por provedor (decisão: chave única do provedor ativo).
