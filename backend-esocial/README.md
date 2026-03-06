# Backend eSocial + gov.br Signature

Backend Node.js/Express para:
- assinatura digital gov.br
- envio de eventos SST no eSocial (S-2210, S-2220, S-2240)

## Multi-tenant por empresa

Header principal em todas as rotas de integracao:

```http
X-Empresa-ID: <uuid-da-empresa>
```

Compatibilidade temporaria:
- `X-Group-ID` ainda e aceito
- sera removido apos migracao completa

## Instalacao

```bash
cd backend-esocial
npm install
cp .env.example .env
npm run dev
```

Build:

```bash
npm run build
npm start
```

## Variaveis de ambiente principais

```env
NODE_ENV=production
PORT=3001

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=...

GOVBR_CLIENT_ID=...
GOVBR_CLIENT_SECRET=...
GOVBR_REDIRECT_URI=https://seu-dominio.com/callback/govbr
GOVBR_ENVIRONMENT=staging

ESOCIAL_CERT_PATH=/certs/certificado.pfx
ESOCIAL_CERT_PASSWORD=...
ESOCIAL_TIPO_INSCRICAO=1
ESOCIAL_NR_INSCRICAO=00000000000000
ESOCIAL_AMBIENTE=2

API_SECRET_KEY=...
ALLOWED_ORIGINS=http://localhost:5173
REQUIRE_EMPRESA_ID_HEADER=true
ALLOW_GLOBAL_INTEGRATION_FALLBACK=false
INTEGRATION_ENCRYPTION_KEY=chave-longa-e-aleatoria
```

## Endpoints

### Assinatura gov.br (`/api/signature`)
- `GET /auth-url`
- `POST /callback`
- `GET /certificate`
- `POST /sign`
- `POST /sign-batch`

### eSocial (`/api/esocial`)
- `GET /config` (requer `X-API-Key` quando `API_SECRET_KEY` definido)
- `PUT /config` (requer `X-API-Key` quando `API_SECRET_KEY` definido)
- `POST /evento/s2210`
- `POST /evento/s2220`
- `POST /evento/s2240`
- `POST /lote`
- `GET /consulta/:protocolo`

## Exemplo rapido (assinatura)

```javascript
const empresaId = 'uuid-da-empresa';

const authResp = await fetch('/api/signature/auth-url', {
  headers: { 'X-Empresa-ID': empresaId }
});
const { authUrl, state } = await authResp.json();

// redireciona usuario para authUrl

const callbackResp = await fetch('/api/signature/callback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Empresa-ID': empresaId
  },
  body: JSON.stringify({ code, state })
});
const { accessToken } = await callbackResp.json();

const signResp = await fetch('/api/signature/sign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'X-Empresa-ID': empresaId
  },
  body: JSON.stringify({ documentBase64: btoa(conteudoDocumento) })
});
const { signature } = await signResp.json();
```

## Exemplo rapido (eSocial S-2220)

```javascript
const empresaId = 'uuid-da-empresa';

const response = await fetch('/api/esocial/evento/s2220', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Empresa-ID': empresaId
  },
  body: JSON.stringify({
    cpfTrabalhador: '12345678901',
    codCateg: '101',
    dtAso: '2026-02-16',
    tpAso: '0',
    resAso: '1',
    exames: [
      {
        dtExm: '2026-02-16',
        procRealizado: '0101010010',
        ordExame: '1',
        indResult: '1'
      }
    ],
    nmMed: 'Dr. Joao Silva',
    nrCRM: '123456',
    ufCRM: 'SP'
  })
});

const { protocolo } = await response.json();
```

## Segurança

- HTTPS obrigatorio
- rate limit ativo
- segredos criptografados no banco (`*_enc`)
- CORS por lista de origens

## Referencias

- https://manual-integracao-assinatura-eletronica.readthedocs.io
- https://www.gov.br/esocial/pt-br/documentacao-tecnica
