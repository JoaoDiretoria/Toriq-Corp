# eSocial SST (transmissão de eventos) + Assinatura gov.br — Design

> Status: **rascunho para revisão**. Cobre as duas pontas que faltaram na migração do
> `backend-esocial` (Node) para o `apps/api` (Python). A assinatura PDF A1 (PAdES) já foi
> portada (`feature/esocial-assinatura-a1`); este doc trata de **3a** (transmissão eSocial)
> e **3b** (assinatura gov.br na nuvem).

## Contexto

O serviço legado `backend-esocial` (Node/TS, em
`TORIQ/vertical-on-sistema-de-sst/backend-esocial`) fazia, além da assinatura PDF:

- **eSocial SST** (`esocialService.ts`): gerava XML dos eventos **S-2210, S-2220, S-2240**,
  assinava cada um com **XMLDSig** (cert A1) e transmitia via **SOAP** com **mTLS** aos
  webservices do eSocial; depois consultava o lote pelo protocolo.
- **gov.br** (`govbrSignatureService.ts`): fluxo OAuth (scope `signature_session`) +
  assinatura remota de hash (`/externo/v2/assinarPKCS7`).

Ambos exigem o **certificado A1 real** (ICP-Brasil) para homologar — não é possível validar
ponta-a-ponta com cert self-signed. O cert já é armazenado criptografado em
`empresa_integracoes_esocial` (colunas `*_enc`), reutilizável por estas features.

## Objetivo

Permitir que a empresa (tenant) **transmita eventos SST ao eSocial** a partir de dados que já
existem na TORIQ, e (opcionalmente) **assine documentos via gov.br** quando não houver A1 local.

## Não-objetivos (YAGNI)

- Outros eventos eSocial além de S-2210/2220/2240 (folha, admissão, etc.).
- Retificação/exclusão de eventos (S-3000) na primeira versão — só envio + consulta.
- Fila/agendamento de transmissão — a primeira versão transmite sob demanda (endpoint); a fila
  Redis existente pode ser plugada depois se o volume exigir.

---

## 3a — Transmissão de eventos eSocial SST

### Mapeamento dado → evento (fontes na TORIQ)

| Evento | Significado | Fonte na TORIQ |
|---|---|---|
| **S-2210** | Comunicação de Acidente de Trabalho (CAT) | `SinistrosColaborador` (sinistros) |
| **S-2220** | Monitoramento da Saúde do Trabalhador (ASO) | exames de saúde (`data_exame`, `aso_arquivo_url`) |
| **S-2240** | Condições Ambientais do Trabalho (agentes nocivos) | cadastro de setores/agentes (a confirmar a tabela exata) |

> **Decisão aberta (1):** confirmar a tabela exata que alimenta o S-2240 (condições ambientais).
> S-2210 e S-2220 têm fonte clara; o S-2240 pode exigir um cadastro novo se hoje não existir.

### Arquitetura

```
app/integrations/esocial_ws.py   → transporte SOAP + mTLS (enviarLote / consultarLote)
app/core/xml_signer.py           → assinatura XMLDSig enveloped (A1) de um evento
app/services/esocial_eventos.py  → gera o XML de cada evento (S-2210/2220/2240) a partir
                                    dos dados da TORIQ; orquestra assinar→montar lote→enviar
app/api/esocial.py (+endpoints)  → POST /esocial/eventos/{tipo}/enviar, GET /esocial/lotes/{protocolo}
app/models/esocial.py (+tabela)  → esocial_eventos_log (protocolo, tipo, status, recibo, erro)
```

### Assinatura XMLDSig (porte fiel do legado)

- **Enveloped signature** dentro do elemento do evento, `Reference URI="#<IdEvento>"`.
- Canonicalização **C14N** `http://www.w3.org/TR/2001/REC-xml-c14n-20010315`.
- `SignatureMethod` = `rsa-sha256`; `DigestMethod` = `sha256`.
- `KeyInfo`/`X509Data` com o certificado A1.
- **Biblioteca Python:** `signxml` (suporta enveloped + C14N + RSA-SHA256 e aceita chave/cert
  do `cryptography`). Reaproveita o `.pfx` já descriptografado (mesma rotina do `pdf_sign.py`).

### Transporte SOAP + mTLS

- Envelope SOAP 1.2 (`application/soap+xml`), schema do lote `v1_1_1`, `ideEmpregador` e
  `ideTransmissor` (tpInsc/nrInsc vindos da config), `grupo="2"`.
- **mTLS:** o POST exige o A1 como **client certificate**. Em Python usa-se um
  `ssl.SSLContext` com `load_cert_chain`. **Problema:** `load_cert_chain` exige caminhos de
  arquivo; o `.pfx` vive só em memória.
  - **Decisão aberta (2) — recomendada:** escrever cert+chave PEM em arquivos **temporários
    com permissão 0600**, usar e apagar imediatamente (`tempfile` + `finally: unlink`). É o
    caminho pragmático e o `httpx`/`ssl` o aceitam. Alternativa (sem disco) exige
    `pyOpenSSL`/`SSLContext` de baixo nível — mais complexo; deixar para depois se necessário.
- Cliente HTTP: `httpx` (já é dep) com o `SSLContext` custom. Timeouts generosos (o eSocial
  pode demorar).
- URLs por ambiente (`esocial_ambiente`): `1` = produção, `2` = produção-restrita (homologação).

### Endpoints

- `POST /esocial/eventos/{tipo}/enviar` — body com o(s) id(s) da fonte (ex.: `sinistro_id`);
  gera XML → assina → monta lote → envia; persiste em `esocial_eventos_log` (protocolo +
  status). Tenant por `user.empresa_id`. 400 se cert/config ausente.
- `GET /esocial/lotes/{protocolo}` — `consultarLote`; atualiza o log com o resultado
  (recibo/erros por evento).
- `GET /esocial/eventos` — lista o log de transmissões da empresa (status, datas, protocolo).

### Persistência

Nova tabela `esocial_eventos_log` (tenant `empresa_id`): `id, tipo, fonte_id, id_lote,
protocolo, status, recibo, erro, payload_hash, created_at, updated_at`. Migration dedicada
(aplicação em prod sob autorização explícita, como sempre).

### Tratamento de erro

- Falha de geração/assinatura → 400 com mensagem; nada é enviado.
- Falha de transporte (timeout/SOAP fault) → status `erro` no log + mensagem; reenvio é
  idempotente por `payload_hash` (não duplica lote já aceito).
- Respostas do eSocial parseadas por regex (igual ao legado) para extrair
  `protocoloEnvio`/`cdResposta`/eventos processados.

### Testes

- **Unidade (sem rede):** geração de XML de cada evento (estrutura/atributos), assinatura
  XMLDSig válida (verificar `SignatureValue`/`DigestValue` com cert self-signed), parsing das
  respostas SOAP de exemplo (fixtures XML).
- **Integração (homologação):** contra produção-restrita, **requer o A1 real** — roda manual,
  fora da suíte automática (marcador `@pytest.mark.homologacao`, skip por default).

---

## 3b — Assinatura gov.br na nuvem

### Fluxo (porte do `govbrSignatureService.ts`)

1. **Authorize:** monta URL do SSO gov.br (`/authorize`), scope
   `openid email phone profile govbr_confiabilidades signature_session`, com
   `client_id`/`redirect_uri` da config. PKCE (`code_verifier`/`code_challenge`).
2. **Callback → token:** troca `code` por `access_token` (`/token`, Basic auth
   `client_id:client_secret`). State assinado (Fernet, como no Google OAuth já feito).
3. **Assinar:** `POST {signApi}/externo/v2/assinarPKCS7` com o **hash** do documento →
   devolve PKCS7. Exige o usuário ter **conta Prata/Ouro** (senão 4xx tratado).
4. (Opcional) `getUserCertificate` para exibir o titular.

### Endpoints

- `GET /esocial/govbr/iniciar` → URL de consentimento (503 se não configurado).
- `GET /esocial/govbr/callback` → troca code por token; guarda o token (curto, em memória/Redis
  por sessão — **não** persistir long-lived sem necessidade).
- `POST /esocial/govbr/assinar` → recebe `pdf_base64` (ou hash), assina via gov.br, devolve o
  PKCS7/PDF.

### Decisão aberta (3)

A1 local (já portado) e gov.br são **caminhos alternativos** de assinatura. Definir a UX: a tela
oferece os dois e o usuário escolhe? Ou gov.br é fallback quando não há A1? (Recomendo: oferecer
ambos, A1 como padrão por ser server-side e sem depender de conta gov.br do operador.)

### URLs por ambiente

`staging` = `sso.staging.acesso.gov.br`; `production` = `sso.acesso.gov.br` (campo
`govbr_environment` já existe na config).

---

## Dependências novas (runtime, em `[project].dependencies`)

- `signxml` (XMLDSig). Avaliar `lxml` (já vem com signxml).
- gov.br usa só `httpx` (já é dep) — sem dep nova.
- (mTLS usa `ssl` da stdlib + `tempfile`.)

## Segurança / LGPD

- O `.pfx` e a senha continuam criptografados em repouso (Fernet, `INTEGRATION_ENCRYPTION_KEY`).
- PEM temporário do mTLS: arquivo 0600, apagado em `finally`. Nunca logar conteúdo do cert.
- Token gov.br: vida curta, não persistir além do necessário.
- Tudo tenant-scoped por `user.empresa_id`.

## Sequência de implementação sugerida

1. `xml_signer.py` (XMLDSig) + testes de unidade.
2. `esocial_eventos.py` (geração S-2210/2220/2240 a partir das fontes TORIQ) + testes.
3. `esocial_ws.py` (SOAP + mTLS) + `esocial_eventos_log` (migration) + endpoints de envio/consulta.
4. Homologação manual com o A1 real (produção-restrita).
5. gov.br (3b) — depois que a transmissão estiver homologada.

## Decisões abertas (recapitulando)

1. Tabela-fonte do **S-2240** (condições ambientais) — existe hoje ou precisa de cadastro novo?
2. mTLS via **PEM temporário 0600** (recomendado) vs. SSLContext em memória.
3. UX de assinatura: A1 e gov.br como opções paralelas (recomendado) vs. fallback.
