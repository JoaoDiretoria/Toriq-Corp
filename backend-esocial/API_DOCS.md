# API Docs - Backend eSocial + gov.br

Documentacao dos endpoints ativos no backend `backend-esocial`.

## 1. Multi-tenant (empresa)

As rotas de integracao usam contexto de empresa via header:

```http
X-Empresa-ID: <uuid-da-empresa>
```

Compatibilidade temporaria:
- `X-Group-ID` ainda e aceito como fallback
- o objetivo e remover este fallback depois da migracao completa

Comportamento por ambiente:
- `REQUIRE_EMPRESA_ID_HEADER=true` (recomendado): header obrigatorio
- `ALLOW_GLOBAL_INTEGRATION_FALLBACK=false` (recomendado): sem fallback para credenciais globais

## 2. Seguranca para rotas de configuracao

As rotas de configuracao exigem:
- `X-Empresa-ID`
- `X-API-Key` quando `API_SECRET_KEY` estiver definido no backend

Headers:

```http
X-Empresa-ID: <uuid-da-empresa>
X-API-Key: <api-secret-key>
```

## 3. Endpoints de configuracao da integracao

Base URL: `/api/esocial`

### GET `/config`
Retorna visao publica da configuracao da empresa (sem vazar segredos).

Resposta (exemplo):

```json
{
  "success": true,
  "config": {
    "empresaId": "uuid",
    "govbrClientId": "...",
    "govbrRedirectUri": "https://...",
    "govbrEnvironment": "staging",
    "hasGovbrClientSecret": true,
    "govbrClientSecretMasked": "********1234",
    "hasEsocialCert": true,
    "hasEsocialCertPassword": true,
    "esocialTipoInscricao": "1",
    "esocialNrInscricao": "12345678000190",
    "esocialAmbiente": "2",
    "certificadoAlias": "Certificado Matriz",
    "certificadoValidoAte": "2027-05-31",
    "updatedAt": "2026-02-16T17:20:00.000Z"
  }
}
```

### PUT `/config`
Cria/atualiza a configuracao da empresa.

Payload:

```json
{
  "govbrClientId": "string|null",
  "govbrClientSecret": "string|null",
  "govbrRedirectUri": "string|null",
  "govbrEnvironment": "staging|production|null",
  "esocialCertBase64": "string|null",
  "esocialCertPassword": "string|null",
  "esocialTipoInscricao": "1|2|3|4|5|6|null",
  "esocialNrInscricao": "string|null",
  "esocialAmbiente": "1|2|null",
  "certificadoAlias": "string|null",
  "certificadoValidoAte": "YYYY-MM-DD|null",
  "clearGovbrClientSecret": false,
  "clearEsocialCert": false,
  "clearEsocialCertPassword": false
}
```

Notas:
- `clearGovbrClientSecret=true` limpa o segredo salvo
- `clearEsocialCert=true` limpa o certificado
- `clearEsocialCertPassword=true` limpa a senha do certificado
- segredos sao persistidos criptografados (`*_enc`) no banco

## 4. Endpoints de assinatura gov.br

Base URL: `/api/signature`

### GET `/auth-url`
Gera URL OAuth2 do gov.br com PKCE.

### POST `/callback`
Recebe `code` e `state`, troca por token de acesso.

Payload:

```json
{ "code": "...", "state": "..." }
```

### GET `/certificate`
Busca certificado publico do usuario autenticado no gov.br.

Header obrigatorio:

```http
Authorization: Bearer <access_token>
```

### POST `/sign`
Assina hash/documento via gov.br.

Payload (uma das opcoes):

```json
{ "documentHash": "base64-sha256" }
```

ou

```json
{ "documentBase64": "base64-do-arquivo" }
```

### POST `/sign-batch`
Assina lote de hashes/documentos.

Payload:

```json
{
  "documents": [
    { "hash": "base64-sha256" },
    { "base64": "base64-do-arquivo" }
  ]
}
```

## 5. Endpoints eSocial

Base URL: `/api/esocial`

### POST `/evento/s2210`
Envia evento S-2210 (CAT).

### POST `/evento/s2220`
Envia evento S-2220 (ASO).

### POST `/evento/s2240`
Envia evento S-2240 (condicoes ambientais/fatores de risco).

### POST `/lote`
Envia lote com ate 50 eventos (`S-2210`, `S-2220`, `S-2240`).

### GET `/consulta/:protocolo`
Consulta processamento de lote no eSocial.

## 6. Banco de dados (novo modelo)

Tabela principal:
- `public.empresa_integracoes_esocial`

Campos de destaque:
- `empresa_id` (unique, FK `empresas.id`)
- `govbr_client_id`
- `govbr_client_secret_enc`
- `govbr_redirect_uri`
- `govbr_environment`
- `esocial_cert_base64_enc`
- `esocial_cert_password_enc`
- `esocial_tipo_inscricao`
- `esocial_nr_inscricao`
- `esocial_ambiente`
- `certificado_alias`
- `certificado_valido_ate`

Migration:
- `supabase/migrations/20260216170000_create_empresa_integracoes_esocial.sql`

## 7. Compatibilidade legado

O backend ainda tenta ler configuracao legada em `group_integrations` quando:
- nao encontra registro em `empresa_integracoes_esocial`
- existe registro legado associado ao mesmo UUID

Esse fallback existe para transicao e deve ser removido apos migracao dos dados.

## 8. Codigos de erro comuns

- `400`: payload invalido ou header obrigatorio ausente
- `401`: token ausente/invalido ou `X-API-Key` invalida
- `403`: conta gov.br sem nivel Prata/Ouro
- `404`: configuracao da empresa nao encontrada
- `500`: erro interno/integracao
