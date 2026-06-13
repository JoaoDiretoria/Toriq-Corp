# Fatia 4 — eSocial em Python (plano detalhado)

> **Status:** EM IMPLEMENTAÇÃO — decisão do produto (2026-06-13): **descartar** o `backend-esocial`
> Node e **reescrever do zero** em Python (FastAPI), dentro do `apps/api`. Não há dados a migrar
> (sistema vazio). A fonte TS antiga foi **preservada como referência** em
> `docs/legacy-esocial-reference/` (ela funcionava — usar como spec dos leiautes/SOAP).
> **Atualizado:** 2026-06-13
> **Objetivo:** integração eSocial nativa em Python cobrindo (A) configuração + certificado A1
> ICP-Brasil, (B) assinatura (A1 local **e** gov.br na nuvem), (C) eventos SST ao eSocial (SOAP gov.br).

---

## 1. Por que esta fatia existe

O front (telas `CertificadoA1Config.tsx` e `SSTConfiguracoes.tsx`) ainda fala com um **serviço externo separado** — o `backend-esocial` — por `fetch` direto, fora do `api` client do backend novo:

- `VITE_ESOCIAL_BACKEND_URL` — base URL do serviço.
- `VITE_ESOCIAL_CONFIG_API_KEY` — enviado no header `X-API-Key`.

Hoje, no app migrado, essas funções estão **degradadas** (a tela de certificado A1 mostra "Funcionalidade indisponível"; a config eSocial só funciona se a URL externa estiver setada). A Fatia 4 traz isso para dentro do Python e religa as telas.

> **Referência fiel:** `docs/legacy-esocial-reference/` contém o `API_DOCS.md` e a fonte TS
> (`src/services/esocialService.ts`, `govbrSignatureService.ts`, `pdfSignatureService.ts`,
> `groupConfigService.ts`, `utils/crypto.ts`). A reescrita Python deve seguir esse contrato.
> Modelo legado: tabela `empresa_integracoes_esocial` (gov.br + A1, tudo `*_enc` criptografado);
> chave de cripto via env `INTEGRATION_ENCRYPTION_KEY`. Multi-tenant era por header `X-Empresa-ID`
> → no Python vira o `empresa_id` do JWT (mais seguro). `esocial_tipo_inscricao` vai de 1 a 6.

## 2. Contrato atual (engenharia reversa do front + API_DOCS legado)

**Dois caminhos de assinatura** (o plano antigo cobria ambos):
- **gov.br na nuvem** (`/api/signature`): OAuth2 + PKCE (`/auth-url`, `/callback`), `/certificate`,
  `/sign`, `/sign-batch`. Exige conta gov.br nível **Prata/Ouro** (403 se não tiver).
- **Certificado A1** (.pfx): armazenado criptografado, usado p/ assinar XML dos eventos eSocial.

**Eventos eSocial** (`/api/esocial`): `/evento/s2210` (CAT), `/evento/s2220` (ASO),
`/evento/s2240` (condições ambientais/fatores de risco), `/lote` (até 50 eventos),
`/consulta/:protocolo`.


Endpoints que o front espera do `backend-esocial`:

| Método | Rota | Body / Headers | Resposta |
|---|---|---|---|
| POST | `/api/pdf/validate-certificate` | `{ pfxBase64, senha }` | `{ success, valido, mensagem, certificado: { cn, ou, o, serialNumber, validoDe, validoAte, emissor, expirado } }` |
| GET | `/api/esocial/config` | header `X-API-Key`, escopo por empresa | `{ esocialTipoInscricao, esocialNrInscricao, esocialAmbiente, ... }` (cert NÃO retorna) |
| POST | `/api/esocial/config` | `{ esocialCertBase64, esocialCertPassword, esocialTipoInscricao, esocialNrInscricao, esocialAmbiente }` | ok/erro |
| POST | (implícito) `/api/pdf/sign` | PDF + cert | PDF assinado (PAdES) — assinatura de certificados de treinamento (Portaria 211/2019) |
| POST/GET | (implícito) eventos eSocial | evento SST + cert | recibo/protocolo |

Campos de config:
- `esocialTipoInscricao`: `1` = CNPJ, `2` = CPF/CAEPF.
- `esocialNrInscricao`: número da inscrição.
- `esocialAmbiente`: `1` = Produção, `2` = Produção Restrita (homologação).
- `esocialCertBase64` + `esocialCertPassword`: o A1 (.pfx) e sua senha — **write-only** (nunca devolvidos ao front).

## 3. Escopo técnico

Duas capacidades grandes e independentes:

### 3A. Assinatura digital (A1 ICP-Brasil)
1. **Ler/validar o .pfx**: extrair chave privada + cadeia X.509, validar senha, extrair metadados (CN, emissor, validade, serial), checar expiração e cadeia ICP-Brasil.
2. **Assinar PDF (PAdES)**: assinar certificados de treinamento SST com validade jurídica (MP 2.200-2/2001, Portaria 211/2019).

**Libs Python:** `cryptography` (`pkcs12.load_key_and_certificates`) para o A1; `pyhanko` (recomendado, melhor suporte PAdES) ou `endesive` para assinar PDF.

### 3B. Eventos eSocial SST (SOAP gov.br)
Eventos relevantes para consultoria SST:
- **Base/tabelas:** S-1000 (Empregador), S-1005 (Estabelecimentos), S-1060 (Tabela de Ambientes de Trabalho).
- **SST:** S-2210 (CAT — Comunicação de Acidente de Trabalho), S-2220 (Monitoramento da Saúde — ASO), S-2240 (Condições Ambientais — agentes nocivos).

Fluxo por evento: montar XML do leiaute → **assinar XML (XMLDSig enveloped, RSA-SHA256 + C14N)** → empacotar em lote → **transmitir via SOAP** (`EnviarLoteEventos`) com **TLS mútuo** (o A1 é o cert de cliente) → **consultar processamento** (`ConsultarLoteEventos`) → guardar recibo/erros.

**Libs Python:** `lxml` + `xmlsec` (python-xmlsec, exige `libxmlsec1` no Docker) ou `signxml` para XMLDSig; `zeep` ou `requests` cru para o SOAP com `cert=(pem,key)`; endpoints WS do eSocial (produção restrita vs produção).

**WS endpoints (públicos):**
- Produção restrita: `https://webservices.producaorestrita.esocial.gov.br/...`
- Produção: `https://webservices.envio.esocial.gov.br/...`

## 4. 🚧 Bloqueios — o que preciso de VOCÊ antes de implementar

Sem isso, não dá para implementar (não é questão de esforço, é dependência externa):

1. ~~**Código-fonte do `backend-esocial` atual**~~ ✅ RESOLVIDO — preservado em
   `docs/legacy-esocial-reference/`. Decisão: **reescrever do zero** seguindo esse contrato.
2. **Certificado A1 de teste** (.pfx + senha) de um CNPJ — para validar assinatura e transmissão em
   **produção restrita**. *(Para os testes unitários das Fases A/B eu gero um .pfx self-signed; o A1
   real ICP-Brasil só é necessário p/ validar cadeia ICP e transmitir ao gov.br nas Fases C+.)*
3. **Decisão de armazenamento do A1**: o .pfx é dado sensível. Opções: (a) coluna criptografada no Postgres (chave via env/KMS), (b) cofre de segredos. Recomendo (a) com criptografia simétrica (Fernet) e a chave fora do banco.
4. **Arquitetura**: dobrar dentro do `apps/api` (um router `/esocial/*`) **ou** manter microserviço Python separado? Recomendo **dentro do apps/api** (menos infra, reusa auth/tenant), salvo se o volume de XML/SOAP justificar isolar.
5. **Quais eventos entram no MVP**: sugiro começar só por **S-2220 (ASO)** e **S-2210 (CAT)** + a base S-1000/S-1005, que é o core de uma consultoria SST. S-2240 depois.

## 5. Modelo de dados proposto

```
empresa_integracao_esocial
  empresa_id (FK, PK)        -- tenant
  tipo_inscricao             -- '1'|'2'
  nr_inscricao
  ambiente                   -- '1'|'2'
  cert_pfx_encrypted (bytea) -- A1 criptografado (Fernet)
  cert_cn, cert_validade_ate, cert_serial  -- metadados p/ exibir status
  updated_at

esocial_eventos
  id (PK), empresa_id (FK)   -- tenant
  tipo_evento                -- 'S-2210' | 'S-2220' | ...
  ref_id                     -- id do registro de origem (ex.: sinistro, ASO)
  xml_assinado (text)
  lote_protocolo, recibo
  status                     -- 'rascunho'|'enviado'|'processado'|'erro'
  erros (jsonb), created_at, updated_at
```

## 6. Endpoints FastAPI a criar (espelhando o contrato do front)

- `POST /esocial/validate-certificate` `{ pfx_base64, senha }` → metadados do cert (admin da empresa).
- `GET  /esocial/config` → config da empresa (sem cert).
- `PUT  /esocial/config` → salva config + cert (criptografa o .pfx).
- `DELETE /esocial/config/certificado` → remove o A1.
- `POST /esocial/sign-pdf` `{ pdf_base64 }` → PDF assinado (PAdES) com o A1 da empresa.
- `POST /esocial/eventos/{tipo}` → monta+assina+transmite um evento; grava em `esocial_eventos`.
- `GET  /esocial/eventos` / `GET /esocial/eventos/{id}` → status/recibo.

Tudo tenant-scoped por `empresa_id` (mesmo padrão das outras rotas). Religar `CertificadoA1Config.tsx` e a aba eSocial do `SSTConfiguracoes.tsx` para usar o `api` client em vez do `fetch` externo.

## 7. Fases de implementação (incremental, TDD)

- **Fase A — Certificado:** parse/validate A1, modelo `empresa_integracao_esocial`, criptografia do .pfx, `validate-certificate` + `config` (GET/PUT/DELETE). Religa `CertificadoA1Config.tsx`. *(Entrega valor sozinha: tela de certificado volta a 100%.)*
- **Fase B — Assinatura de PDF:** `sign-pdf` (PAdES) com o A1. Religa assinatura de certificados de treinamento.
- **Fase C — Infra de eventos:** modelo `esocial_eventos`, montagem de XML + XMLDSig, transmissão SOAP em **produção restrita** (S-2220 primeiro).
- **Fase D — Cobertura de eventos:** S-2210, S-1000/S-1005, consulta de lote, tratamento de erros do eSocial.
- **Fase E — Produção:** habilitar ambiente `1`, hardening, monitoramento de recibos.

## 8. Riscos & segurança

- **A1 em repouso:** criptografar sempre; chave fora do banco; nunca logar pfx/senha; nunca devolver ao front.
- **TLS mútuo:** o eSocial exige o A1 como cert de cliente no handshake SOAP — `requests`/`zeep` precisam de chave+cert em PEM derivados do .pfx em memória.
- **Cadeia ICP-Brasil:** validar contra as ACs raiz/intermediárias da ICP-Brasil.
- **Docker:** `python-xmlsec` exige `libxmlsec1-dev` + `libxml2` no `apps/api/Dockerfile`.
- **Leiautes:** versão do leiaute eSocial muda; fixar a versão (ex.: S-1.3) e validar contra os XSDs oficiais.

## 9. Estimativa grosseira

- Fase A: ~2-3 dias. Fase B: ~1-2 dias. Fase C: ~4-5 dias (a parte mais espinhosa: XMLDSig + SOAP + TLS mútuo em homologação). Fases D-E: ~3-5 dias + idas e vindas com a homologação do gov.br.

**Não dá para começar a Fase C/D sem o item 1 (fonte do backend-esocial) e o item 2 (cert de teste) da seção 4.** As Fases A e B podem começar assim que houver um A1 de teste.
