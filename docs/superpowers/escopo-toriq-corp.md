# Escopo do módulo Toriq Corp (CRM + Financeiro + Contratos)

> Mapa de escopo que orienta os planos da Fatia 3 (módulos de negócio), começando pelo Toriq Corp.
> Baseado em: `app/models/generated.py`, `docs/superpowers/inventario-logica-banco.md`,
> `supabase/functions/gerar-contas-recorrentes/index.ts`, e os componentes `src/components/**/toriq-corp/*`.

## Decomposição em 4 sub-módulos (ordem de dependência)

1. **Cadastros Financeiros** (base, sem dependências) — `fornecedores`, `formas_pagamento`,
   `formas_cobranca`, `condicoes_pagamento`, `centros_custo`, `contas_bancarias`,
   `plano_receitas`, `plano_despesas`. CRUD com isolamento por `empresa_id`. **Estabelece o
   padrão de módulo** (router + repository CRUD + schemas + testes) para os demais.
2. **Financeiro** — `contas_pagar*`, `contas_receber*` (+ colunas/atividades/movimentações),
   `financeiro_contas`. Kanban (reorder batch, bootstrap de colunas). Job de **contas
   recorrentes** + job de **automação de colunas por data**.
3. **Funil / CRM** — `funis`, `funil_etapas`, `funil_cards`, `funis_configuracoes`,
   `automacoes`, `automacoes_execucoes`, etiquetas/atividades; + kanbans legados
   (`prospeccao_*`, `closer_*`, `pos_venda_*`, `cross_selling_*`); `comercial_funil` (legado simples).
4. **Contratos** — `contratos`, `contrato_clausulas`, `contrato_modulos`, `modelos_contrato`
   (+ cláusulas/módulos de modelo). Numeração sequencial `TQ-{ano}-{seq}`.

## Lógica do banco a portar (prioridade alta)

- `criar_configuracao_funil_padrao` — ao criar funil, cria `funis_configuracoes` default.
- `gerar_contas_recorrentes` (PL/pgSQL + edge function) — gera contas do mês para `frequencia_cobranca='recorrente'`, dedup por (empresa+fornecedor+descrição+categoria+mês), valor fixo/variável.
- `executar_automacoes_agendadas` / `executar_automacoes_negocio_parado` — workers de automação de funil.
- `generate_contrato_numero` — número sequencial por empresa.
- `notify_*_created` (contas/cards) — notificações (média prioridade).
- `log_*` / `update_*_updated_at` — auditoria genérica (middleware) e timestamps (`onupdate=func.now()`).

## Lógica que hoje vive no FRONT (precisa virar backend)

- **Automação de colunas por data** (contas a receber/pagar): hoje roda em `useEffect` a cada
  load; move cards para "Vencidos"/"Cobrança"/"Emitir NFe". → job agendado diário.
- **Geração de número de contrato**: `MAX+1` client-side. → sequência no backend.
- **Closer → Contas a Receber**: ganhar negócio no Closer cria conta a receber (`origem='closer'`,
  `closer_card_id`). → efeito do endpoint de atualização de card do Closer.

## Decisões técnicas (padrão adotado, reversível)

| Tema | Decisão |
|---|---|
| Agendamento (recorrência, automação de colunas, automações de funil) | **APScheduler** in-process, 1×/dia (+ endpoint de trigger manual preservando o botão atual) |
| Realtime no kanban | HTTP + polling no v1 (sem WebSocket) |
| Numeração (contrato, recorrência) | Sequência Postgres (evita race do `Date.now()`) |
| Reordenação de cards | Endpoint batch `PATCH .../reorder` com `[{id, ordem}]` |
| Colunas padrão CP/CR | Criadas no primeiro acesso ao módulo |
| TenantRepository | Estender com `get_by_id`/`update`/`delete` (hoje só `list`/`add`) + Protocol `TenantModel` |

## Decisões de produto pendentes (a confirmar se surgirem)

- Funis legados (prospeccao/closer/pos_venda/cross_selling) vs funil genérico (`funis`): manter
  ambos em paralelo no v1; unificação é backlog.
- `comercial_funil` (legado simples) vs `funis`: expor ambos; baixa prioridade.
