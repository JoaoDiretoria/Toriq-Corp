# Migração do canal Evolution: Evolution API (Baileys) → Evolution Go (whatsmeow)

**Data:** 2026-06-22
**Branch:** `feature/evolution-go-migracao`
**Escopo:** substituir de vez o backend do canal WhatsApp do módulo Vendas, do Evolution API
clássico (Node/Baileys) para o **Evolution Go** (Go/whatsmeow). Sem suporte paralelo aos dois.

## Contexto

O canal Evolution vive numa fatia vertical isolada:
`integrations/evolution_api.py` (única fronteira de rede) → `services/vendas_evolution.py`
(regra) → `api/vendas_evolution.py` (router) → front (`vendasEvolution.ts` + telas).
O `evolution_api.py` é o anti-corruption layer: trocar o provedor por baixo mexe nele +
ajustes pontuais no service. Router, schemas, model e front praticamente não mudam.

Fonte do contrato novo: Swagger (`/swagger/doc.json`) **e** código-fonte de
`evolution-foundation/evolution-go` (auth_middleware.go, routes.go, instance_service.go,
instance_handler.go, send_service.go, send_handler.go, whatsmeow.go).

## Decisões

- **Substituição total (Go-only)**; sem abstração de provider (YAGNI).
- **Reescrever `evolution_api.py` in-place** (mantém assinaturas onde dá; menor blast radius).
- **Sem migração de banco**: reusa `instance_token_enc` e `webhook_token`; o `id` (UUID) da
  linha local vira o `instanceId` do Go (passado no create).
- **QR só** (paridade atual); pairing-code, RabbitMQ/NATS/websocket, botões/listas/enquetes ⇒ fora.

## Auth (header `apikey`, dois valores conforme a rota)

- Rotas **admin** → `apikey` = GLOBAL_API_KEY (= `vendas_evolution_servidor.api_key_enc`):
  `POST /instance/create`, `GET /instance/all`, `DELETE /instance/delete/{id}`,
  `POST /instance/forcereconnect/{id}`.
- Rotas **de instância** → `apikey` = token da instância (= `instance_token_enc`):
  `connect`, `qr`, `status`, `logout`, `reconnect`, todo `/send/*`, `/message/*`.
  O servidor resolve a instância via `GetInstanceByToken(token)`.

## Mapa de equivalência (núcleo da reescrita)

| Operação | Evolution API (atual) | Evolution Go | Mudança |
|---|---|---|---|
| Criar | `POST /instance/create {instanceName,qrcode,integration}` | `POST /instance/create {name,token,instanceId,advancedSettings}` (global) | passamos token + instanceId=UUID local; name+token obrigatórios |
| Webhook | `POST /webhook/set/{i}` | (não existe) | vai no `connect` |
| Conectar | `GET /instance/connect/{i}` | `POST /instance/connect {webhookUrl,subscribe[],phone?}` (token) | configura webhook+subscribe; não retorna QR |
| QR | (vem do connect) | `GET /instance/qr` (token) → `data.Qrcode` | PNG **data-URL** pronto |
| Status | `GET /connectionState/{i}` → open/connecting/close | `GET /instance/status` (token) → `{Connected: bool}` | vira booleano |
| Logout | `DELETE /instance/logout/{i}` | `DELETE /instance/logout` (token) | sem path |
| Deletar | `DELETE /instance/delete/{i}` | `DELETE /instance/delete/{id}` (global) | id = UUID local |
| Reconectar | `PUT /instance/restart/{i}` | `POST /instance/reconnect` (token) | — |
| Settings | `POST /settings/set/{i}` | `advancedSettings` no create / `PUT /instance/{id}/advanced-settings` | mapear chaves |
| Texto | `POST /message/sendText/{i}` | `POST /send/text {number,text}` (token) | rota/header |
| Mídia | `POST /message/sendMedia/{i} {mediatype,media,...}` | `POST /send/media {number,type,url,caption,filename}` (token) | `mediatype`→`type`, `media`→`url` (URL **ou** base64) |
| Áudio | `POST /message/sendWhatsAppAudio/{i}` | `POST /send/media {type:"audio"}` | unifica (vira PTT) |
| Presença | `POST /chat/sendPresence/{i} {presence,delay}` | `POST /message/presence {number,state,isAudio}` (token) | `presence`→`state` |
| Download mídia | `getBase64FromMediaMessage` | (desnecessário) | webhook traz `base64`/`mediaUrl` inline |

## Webhook inbound (payload do Go)

`POST {webhook_base_url}/vendas/evolution/webhook/{webhook_token}` — instância identificada
pelo `webhook_token` na URL (independe do payload). Body:

```
{ "event": "<Nome>", "data": { ... } }   // event: Message | Connected | Disconnected | LoggedOut | QRCode | Receipt | ...
```

Para `event=="Message"`, `data` é o `events.Message` do whatsmeow marshalado:
- `data.Info.{ID, Sender, Chat, IsFromMe, IsGroup, PushName, Timestamp, Type}`
- `data.Message.{conversation, extendedTextMessage.text, imageMessage|audioMessage|videoMessage|documentMessage{mimetype,caption,fileName,seconds}, base64?, mediaUrl?, mimetype?}`

**A validar empiricamente (passo 0):** casing/serialização do JID em `Info.Sender`/`Info.Chat`
(string `"55..@s.whatsapp.net"` vs objeto). `parse_webhook` será **defensivo** (aceita os dois).

`QRCode`: `data.qrcode` = `data:image/png;base64,...`, `data.code` = raw.
`Connected`/`Disconnected`/`LoggedOut`: usados para atualizar status da instância.

## Mudanças por arquivo

1. **`integrations/evolution_api.py`** (reescrito): credencial admin vs token; novas rotas/payloads;
   remove `definir_webhook`/`definir_settings`/`baixar_midia`/`enviar_audio`;
   `parse_webhook` reescrito (eventos PascalCase, `Info`/`Message`, JID defensivo, base64/mediaUrl);
   `_extrair_id` lê `data.key.id` do retorno de send do Go (confirmar) — fallback genérico.
2. **`services/vendas_evolution.py`**: `criar_instancia` gera id+token → create(global)+connect(token,webhook);
   grava `instance_token_enc`; helper `_token(inst)`; `deletar` por instanceId+global; status bool→texto;
   mídia inbound usa base64 inline ou `mediaUrl` direto; `_event_id_de` por `Info.ID`.
3. **`api/vendas_evolution.py`**: praticamente inalterado.
4. **`schemas/vendas_evolution.py`**: superfície externa estável (`EnviarMidiaIn.mediatype` mantém;
   mapeado p/ `type` internamente). `QRCodeOut {base64,code}` mantido.
5. **Front**: sem mudança esperada (QR via `<img src=base64>` já funciona).
6. **Config servidor**: `base_url` → Go; `api_key` → GLOBAL_API_KEY; `webhook_base_url` = URL pública TORIQ.

## Erros

`EvolutionError` em não-2xx (Go responde `{error}` 400/500). Wrappers best-effort (presence,
logout, reconnect, settings) seguem engolindo falha para não travar criação/envio.

## Testes

- `tests/test_evolution_api.py`: `parse_webhook` com payloads reais do Go (texto, extended, imagem
  c/ base64, conexão), JID string **e** objeto, ignora `IsFromMe`.
- `tests/test_vendas_evolution.py`: `_mock_rede` adaptado às novas funções; asserta token no header,
  `connect` com `webhookUrl`, status bool→texto, dedup por `Info.ID`, mídia (image/audio via send/media).
- **Passo 0 na execução real:** subir 1 instância de teste, apontar webhook p/ captura, gravar 1
  payload `Message` real → fixar como fixture e confirmar o JID.

## Fora de escopo (YAGNI)

Pairing-code (phone→código), RabbitMQ/NATS/websocket, botões/listas/carrossel/enquetes,
suporte paralelo ao Baileys, limpeza automática das instâncias antigas (usuário recria).
