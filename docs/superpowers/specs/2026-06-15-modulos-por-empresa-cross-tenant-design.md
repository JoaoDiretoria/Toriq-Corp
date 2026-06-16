# Módulos por empresa — correção cross-tenant (super admin)

**Data:** 2026-06-15
**Branch:** `fix/modulos-por-empresa-cross-tenant`
**Projeto:** 1 de 2 (o Projeto 2 — "Toriq Vendas como módulo client-facing" — terá seu próprio spec e depende deste)

## Problema

No dashboard super admin (`admin_vertical`), a atribuição de módulos por empresa
(`EmpresaDetalhe` → aba "Módulos" e o dialog de módulos em `AdminEmpresas`) existe
na UI mas **não funciona**: os toggles chamam `/white-label/empresa-modulos*`, que
derivam o `empresa_id` **do token** (`_require_empresa`), nunca da empresa visualizada.

Consequências:
- **Leitura:** ao abrir a Empresa X, mostra os módulos da empresa *do admin*, não de X.
- **Escrita:** ligar um módulo para a Empresa X grava o vínculo na empresa *do admin* —
  corrompe a config do admin e a Empresa X nunca recebe o módulo (sintoma real: o bloco
  "Toriq Corp" não aparece na sidebar do cliente lucas, embora "ativado" pelo admin).

O próprio código documenta isso como `NOTA (migração)` / `TODO` (ex.: `AdminEmpresas.tsx:976`).

Bug latente acoplado: `usePermissoes.tsx` mapeia `'toriq_corp'` para um **UUID chumbado**
(`a1b2c3d4-...`) que não corresponde ao UUID real gerado por `gen_random_uuid()` no
catálogo. Hoje fica mascarado pelo fallback "sem módulos configurados → libera tudo".
Ao corrigir o lado do admin (passando a popular `empresas_modulos` de verdade), esse
fallback some e o gate quebraria — escondendo o Corp de usuários reais. Por isso os dois
lados são corrigidos juntos.

## Decisões

- **Desenho da API:** rota nova `/empresas/{empresa_id}/modulos` (escopo pelo path +
  guard de role), mantendo os `/white-label/*` intactos para o auto-serviço do tenant.
- **UUID:** resolver dinamicamente pelo catálogo; remover o `MODULO_ID_PARA_UUID` chumbado.
- **Escopo:** apenas a correção (Corp). Registrar o Vendas como módulo client-facing é o
  Projeto 2.

## Arquitetura

### Backend — `app/api/empresas_modulos_admin.py` (novo, isolado)

Router montado sob `/empresas/{empresa_id}`, **restrito a `admin_vertical`**
(`require_role(UserRole.admin_vertical)`). O `empresa_id` vem do path = a empresa-alvo.

```
GET    /empresas/{empresa_id}/modulos                    → vínculos da empresa-alvo
PUT    /empresas/{empresa_id}/modulos/{modulo_id}        → upsert {ativo} (idempotente)
DELETE /empresas/{empresa_id}/modulos/{modulo_id}        → remove vínculo
GET    /empresas/{empresa_id}/modulos-telas              → todas as telas da empresa (lista plana)
PUT    /empresas/{empresa_id}/modulos/{modulo_id}/telas  → define o conjunto exato {tela_ids:[...]}
```

- **Upsert idempotente** apoiado na `UniqueConstraint(empresa_id, modulo_id)`.
- **`PUT .../telas`** recebe o conjunto inteiro de `tela_ids` e reconcilia (insere as novas,
  remove as ausentes, reativa as presentes) numa transação. Substitui o loop client-side
  de N requests por 1 chamada atômica.
- Validações: 403 se não-admin; 404 se a empresa não existir; 404 se o `modulo_id` não
  estiver no catálogo; DELETE 404 se não houver vínculo.

Schemas novos em `app/schemas/white_label.py`:
- `EmpresaModuloAtivoIn { ativo: bool = True }`
- `TelasSetIn { tela_ids: list[str] }`

Registro em `app/main.py`.

### Frontend

- `EmpresaDetalhe.tsx`: `fetchModulosAtivos`, `fetchEmpresaModulosTelas`, `toggleModulo`,
  `saveTelasModulo` passam a usar `/empresas/${empresa.id}/...`. Telas viram 1 PUT de conjunto.
- `AdminEmpresas.tsx`: `openModulosDialog`, `saveModulos` e a **checagem de exclusão**
  (hoje desligada, ~linha 910) usam `empresa.id`. Remover os comentários `NOTA (migração)`/`TODO`.
- `usePermissoes.tsx`: remover `MODULO_ID_PARA_UUID` chumbado; resolver o UUID real do
  módulo pelo catálogo (`/white-label/modulos`) via `MODULO_NOME_PARA_CODIGO`.

## Segurança

`/white-label/*` (auto-serviço) nunca aceita `empresa_id` do payload. Os endpoints novos
**invertem** isso de propósito — aceitam `empresa_id` do path — protegidos pelo guard
`admin_vertical`. Arquivos separados tornam essa fronteira de tenant explícita. Padrão
já validado em `/admin/users?empresa_id=`.

## Testes

`apps/api/tests/test_empresas_modulos_admin.py`:
- admin_vertical vincula módulo em empresa-alvo arbitrária (200) e GET lista.
- **regressão do bug:** o vínculo cai na empresa-alvo, e a empresa *do admin* continua sem vínculo.
- upsert idempotente (PUT 2x → 1 linha, `ativo` atualizado).
- desativar + DELETE (204) → GET vazio.
- `PUT .../telas` reconcilia o conjunto (a,b → b,c deixa só b,c ativas).
- não-admin (cliente_torq) → 403.
- empresa inexistente → 404; módulo inexistente → 404.

**Aceite manual:** ativar Corp para a empresa do lucas pelo novo fluxo → o bloco
"Toriq Corp" aparece na sidebar do lucas.

## Fora de escopo (Projeto 2)

Catalogar Vendas, montar o bloco Vendas no `SSTSidebar`/dashboard do cliente, mapear
permissões das telas de Vendas e auditar o tenant-scoping das telas/APIs `vendas_*.py`.
