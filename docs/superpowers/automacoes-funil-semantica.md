# Motor de Automações do Funil — semântica para portar (front → Python)

> Extraído do front (`Automacoes.tsx` cria; `FunilKanban.tsx` dispara/executa) + jobs SQL
> documentados em `inventario-logica-banco.md`. Fonte da verdade para o motor em Python.

## Gatilhos válidos (constraint do banco)
`negocio_chegar_etapa`, `negocio_ganho`, `negocio_perdido`, `pessoa_adicionada`,
`empresa_adicionada`, `negocio_parado_etapa`, `atividade_finalizada`.

| gatilho | condição | filtro |
|---|---|---|
| `negocio_chegar_etapa` | card entra em `etapa_id` do `funil_id` | funil_id + etapa_id (exato) |
| `negocio_ganho` | `status_negocio` do card vira `'ganho'` | funil_id (sem etapa) |
| `negocio_perdido` | `status_negocio` vira `'perdido'` | funil_id |
| `atividade_finalizada` | atividade do card finalizada | funil_id; pula se `etapa_id` configurada ≠ card.etapa_id |
| `negocio_parado_etapa` | card há > `dias_parado` dias na etapa (`funil_cards.updated_at < now()-dias_parado`) | funil_id + etapa_id + dias_parado (JOB diário) |
| `pessoa_adicionada`/`empresa_adicionada` | sem implementação → no-op | — |

## `tipo` = ação + schema do `acao_config` (JSONB)

- **`agendar_atividade`** → insere em `funil_card_atividades`: `{tipo_atividade, quando, dias_personalizado, descricao, responsavel}`.
  `quando`→dias: mesmo_dia=0,1_dia=1,2_dias=2,3_dias=3,1_semana=7,personalizado=dias_personalizado||1.
  prazo=hoje+dias; status='a_realizar'; tipo=tipo_atividade; responsavel_id=card.responsavel_id||user.id.
- **`duplicar_card`** → cria novo card em `funil_cards` (ordem=count da etapa destino) + copia histórico
  (atividades/movimentações/etiquetas). Mantém original. `{funil_destino_id, etapa_destino_id}`.
  **Caso especial Contas a Receber** (ver abaixo).
- **`mover_card`** → UPDATE no mesmo card (`funil_id`,`etapa_id`,`ordem`). `{funil_destino_id, etapa_destino_id}`.
- **`duplicar_card_agendado` / `mover_card_agendado`** → NÃO executa já; insere em `automacoes_execucoes`
  com `executar_em` = (hoje+`agendamento_dias`) T `agendamento_hora`. `{funil_destino_id, etapa_destino_id, agendamento_dias, agendamento_hora}`.
- **`criar_negocio`** → cria card em outro funil (etapa destino ou primeira por ordem). Legado, não-criável na UI.
- **`enviar_mensagem_whatsapp`** → sem execução (não implementar).

## Fluxo de execução
- **Imediato (evento):** gatilhos chegar_etapa/ganho/perdido/atividade_finalizada rodam na hora da
  ação na API. Ações duplicar/mover/agendar_atividade/criar_negocio executam direto.
- **Loop guard:** após duplicar/mover/criar, no card destino roda **apenas** `agendar_atividade`
  (ignora duplicar/mover) — anti-loop. Reproduzir.
- **Agendado:** só `*_agendado` cria `automacoes_execucoes` (executado=false). 
  - Anti-dup: antes de inserir busca `(automacao_id, card_id)`: se existe e !executado → não cria;
    se existe e executado → deleta e recria. Constraint única `(automacao_id, card_id)` + índice parcial
    `WHERE executado=false`. Erro 23505 ignorado.
  - Ao card SAIR da etapa: deleta execuções pendentes (executado=false) das automações *_agendado da etapa origem.
- **JOB `executar_automacoes_agendadas`** (APScheduler, ~1min): pega até 100 com `executado=false AND
  executar_em<=now()` ordenado por executar_em. Por execução: automação inativa → executado=true,
  erro='Automação desativada'. Card inexistente/inativo → erro. **card.etapa_id ≠ automacao.etapa_id →
  erro='Card não está mais na etapa de gatilho', pula.** Senão executa (INSERT/UPDATE card),
  marca executado=true, executado_em=now(). Erro na ação → SET erro (NÃO marca executado → reprocessa).
- **JOB `executar_automacoes_negocio_parado`** (diário): para cada automação ativa `negocio_parado_etapa`
  c/ dias_parado, para cada card no funil/etapa com `updated_at < now()-dias_parado dias` E SEM atividade
  `'Atividade automática:%'` criada na última 1 dia → insere atividade. Re-roda diário (dedup só pela janela 1 dia).

## Integração Closer → Contas a Receber
É o caminho `duplicar_card` quando o funil destino é "Contas a Receber" do setor "Financeiro"
(`funil.nome` contém 'contas a receber' E `setor.nome` contém 'financeiro' — frágil, por substring).
Mapeia `etapa_destino_id`→nome→`contas_receber_colunas` (ilike) p/ coluna_id (fallback: o próprio id).
Cria em `contas_receber`: numero='CR-'+base36(now), cliente_id/nome/cnpj (de clientes_sst), 
servico_produto=card.descricao||titulo, valor=card.valor||0, valor_pago=0, data_emissao=hoje,
origem='closer', origem_card_id/closer_card_id=card.id, origem_kanban=funil.nome, ordem=0, arquivado=false.
NÃO cria em funil_cards nesse caminho.

## Ambiguidades a resolver no Python
- `executar_em` sem timezone no front → usar TZ explícito (America/Sao_Paulo).
- Colunas `automacoes.agendamento_data_hora/ultima_execucao/executado` não são usadas (legado).
- Automações NÃO geram `notificacoes` hoje (só toasts UI) — não criar notificação.
- `negocio_parado` não marca "executado" — só dedup pela janela de 1 dia.
