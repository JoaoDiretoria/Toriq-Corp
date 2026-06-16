# Toriq Vendas como módulo client-facing (Projeto 2)

**Data:** 2026-06-15
**Branch:** `feat/toriq-vendas-modulo-cliente`
**Depende de:** Projeto 1 (módulos por empresa cross-tenant) — já em `main`.

## Objetivo

Tornar o Toriq Vendas (hoje só no dashboard super admin) um módulo **vendável**,
que o cliente acessa no próprio dashboard quando a Toriq ativa o módulo para a
empresa dele. As 8 telas: Prospecção, Leads Captados, Pipeline & Conversas,
Disparo em Massa, SDR Inteligente, Segmentação, Tags, Uso & Contratação.

## Achado-chave (de-risca o projeto)

As APIs `vendas_*.py` **já nascem multi-tenant**: cabeçalho do `vendas.py` diz
"Tenant SEMPRE por user.empresa_id"; os 7 routers usam
`require_role(admin_vertical, cliente_torq)` + filtro por `empresa_id`. Logo um
`cliente_torq` já pode chamá-las e só vê os dados da própria empresa.

- `GET /vendas/uso` (uso da própria empresa) aceita `cliente_torq`.
- `GET /vendas/uso/empresas` (cross-empresa, cobrança) é super-admin; o
  `PainelUso` **já esconde essa seção no 403**, então a tela funciona pro cliente
  mostrando só o próprio uso.

**Conclusão: Projeto 2 é frontend puro. Zero mudança de backend, zero migração**
(o catálogo já tem "Toriq Vendas" via `c1e2f3a4b5c6`).

## Abordagem

Reaproveitar os componentes existentes em `components/admin/vendas/` (não
duplicar) e montá-los no dashboard do cliente, reusando os mesmos `section ids`
do AdminDashboard: `vendas-prospeccao`, `vendas-leads`, `vendas-pipeline`,
`vendas-disparo`, `vendas-sdr`, `vendas-segmentacao`, `vendas-tags`, `vendas-uso`.

## Arquivos (5, todos no front)

1. **`config/modulosTelas.ts`** — entrada `toriq_vendas` no `MODULOS_CONFIG` com
   as 8 telas; `MODULO_NOME_PARA_CODIGO['Toriq Vendas'] = 'toriq_vendas'` (faz a
   "Configurar Telas" do super admin e a resolução de UUID funcionarem p/ Vendas).
2. **`hooks/useModulosAtivos.tsx`** — mapear `'Toriq Vendas' ↔ 'toriq_vendas'`.
3. **`hooks/usePermissoes.tsx`** — `SECAO_PARA_PERMISSAO` das 8 telas +
   `MODULO_SECOES['toriq_vendas']`.
4. **`components/sst/SSTSidebar.tsx`** — bloco "Toriq Vendas" (espelha o do Corp),
   gated por `moduloVisivelEContratado('toriq_vendas')`; cada tela por
   `telaVisivel(...)`. + entradas no QuickSearch.
5. **`pages/SSTDashboard.tsx`** — imports dos 8 componentes; entradas em
   `SECAO_PARA_MODULO` (auto-redirect se o módulo for desativado); casos
   `vendas-*` no `renderSection`.

## Controle (grátis, herdado do Projeto 1)

Com `toriq_vendas` no `MODULOS_CONFIG`, a aba "Módulos" do `EmpresaDetalhe` passa
a permitir ativar Vendas por empresa **e** escolher quais das 8 telas cada
empresa vê (via "Configurar Telas"). O Projeto 2 só ensina o dashboard do cliente
a renderizar o que o Projeto 1 já liga/desliga.

## Verificação

- **Smoke-check** dos 8 componentes montados no contexto cliente (suposições de
  admin: links/ações que assumem AdminDashboard). Risco baixo — APIs escopadas,
  `PainelUso` degrada no 403.
- `tsc --noEmit` e lint dos arquivos tocados.
- **Aceite manual:** ativar Vendas para empresa de teste → logar como
  `cliente_torq` → ver o bloco "Toriq Vendas" e abrir as 8 telas com dados só
  da própria empresa.

## Fora de escopo

Mudanças nas próprias telas de Vendas (UX, novas features) e qualquer cobrança/
billing automatizado em cima do `vendas_uso`.
