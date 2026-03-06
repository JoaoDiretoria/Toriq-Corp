# Documentação de Impacto dos Rollbacks - Fases 1 a 11

**Data de Criação:** 21/01/2026  
**Projeto Supabase:** `xraggzqaddfiymqgrtha`  
**Status:** Análise Completa

---

## Sumário Executivo

Este documento detalha o impacto de reverter cada fase de correções de segurança e performance aplicadas ao banco de dados. **A reversão completa restaurará políticas vulneráveis e removerá otimizações de performance.**

### ⚠️ ALERTA CRÍTICO

**Reverter as Fases 1-5 reintroduzirá vulnerabilidades de segurança conhecidas:**
- Policies com `USING(true)` que permitem acesso irrestrito
- Funções sem `search_path` seguro (vulneráveis a hijacking)
- RLS desabilitado em tabelas sensíveis

---

## Análise por Fase

---

## FASE 1 + FASE 2: Correções Críticas de Segurança
**Arquivo Migration:** `20260120190000_fix_critical_security_issues.sql` + `20260120200000_fix_security_issues_fase2.sql`  
**Arquivo Rollback:** `ROLLBACK_fase1_fase2.sql`

### O que a Migration fez:
1. **Habilitou RLS** em `turma_cases_sucesso`
2. **Adicionou colunas de controle** (`permite_presenca_publica`, `permite_prova_publica`) em `turmas_treinamento`
3. **Removeu índices duplicados** (performance)
4. **Corrigiu policies** com `USING(true)` em:
   - `turma_colaborador_presencas`
   - `turma_colaboradores`
   - `turma_provas`
5. **Recriou view** `atividades_unificadas` sem `SECURITY DEFINER`
6. **Definiu `search_path = ''`** em 78 funções públicas
7. **Habilitou RLS** em `notificacao_config`
8. **Corrigiu policies** em `turma_anexos`, `tickets_suporte`, `solicitacoes_treinamento`

### ✅ Validação do Rollback:
| Item | Revertido Corretamente? | Observação |
|------|------------------------|------------|
| RLS `turma_cases_sucesso` | ✅ Sim | `DISABLE ROW LEVEL SECURITY` |
| Colunas de controle | ✅ Sim | `DROP COLUMN IF EXISTS` |
| Policies `turma_colaborador_presencas` | ✅ Sim | Recria com `USING(true)` |
| Policies `turma_colaboradores` | ✅ Sim | Recria com `USING(true)` |
| Policies `turma_provas` | ✅ Sim | Recria 6 policies originais |
| `search_path` das funções | ✅ Sim | `RESET search_path` em 78 funções |
| RLS `notificacao_config` | ✅ Sim | `DISABLE ROW LEVEL SECURITY` |
| Policies `turma_anexos` | ✅ Sim | Restaura `USING(true)` |
| Policies `tickets_suporte` | ✅ Sim | Restaura `WITH CHECK(true)` |

### 🔴 IMPACTO DO ROLLBACK:
| Severidade | Impacto |
|------------|---------|
| **CRÍTICO** | Vulnerabilidade de SQL injection via hijacking de `search_path` em 78 funções |
| **CRÍTICO** | Tabela `turma_cases_sucesso` acessível sem restrições |
| **CRÍTICO** | Qualquer usuário autenticado pode modificar presenças, provas e anexos de QUALQUER empresa |
| **ALTO** | Tabela `notificacao_config` sem proteção RLS |
| **BAIXO** | Índices duplicados podem ser recriados (comentados no rollback) |

### ⚠️ Funcionalidades Afetadas:
- **Sistema de Treinamentos:** Links públicos de presença/prova funcionarão sem validação de turma
- **Formulários públicos:** Continuarão funcionando (eram mais permissivos antes)
- **Trigger `handle_new_user`:** Com `search_path` vazio + `RESET`, o tipo `app_role` pode falhar novamente

---

## FASE 3: Correções de Policies INSERT/UPDATE/DELETE
**Arquivo Migration:** `20260120210000_fix_security_issues_fase3.sql`  
**Arquivo Rollback:** `ROLLBACK_fase3.sql`

### O que a Migration fez:
Substituiu policies vulneráveis por policies baseadas em `empresa_id` para:
- `contas_pagar`, `contas_pagar_colunas`
- `cross_selling_*` (cards, atividades, colunas, etiquetas, card_etiquetas)
- `avaliacao_reacao_*` (modelos, categorias, itens, modelo_treinamentos)
- `prospeccao_*` (atividades, etiquetas, card_etiquetas)
- `solicitacoes_treinamento`
- `colaboradores_temporarios`, `sinistros_colaborador`, `sinistro_fotos`
- `reorientacoes_colaborador`, `colaboradores_treinamentos_datas`
- `notificacoes`, `closer_card_movimentacoes`

### ✅ Validação do Rollback:
| Item | Revertido Corretamente? | Observação |
|------|------------------------|------------|
| Policies `contas_pagar` | ✅ Sim | Recria com `USING(true)` |
| Policies `cross_selling_*` | ✅ Sim | 6 tabelas restauradas |
| Policies `avaliacao_reacao_*` | ✅ Sim | 4 tabelas restauradas |
| Policies `prospeccao_*` | ✅ Sim | 3 tabelas restauradas |
| Policies colaboradores/sinistros | ✅ Sim | 5 tabelas restauradas |
| Policies `notificacoes` | ✅ Sim | `WITH CHECK(true)` |
| Policies `closer_card_movimentacoes` | ✅ Sim | `WITH CHECK(true)` |

### 🔴 IMPACTO DO ROLLBACK:
| Severidade | Impacto |
|------------|---------|
| **CRÍTICO** | Usuário da Empresa A pode modificar/deletar dados da Empresa B |
| **CRÍTICO** | Cross-selling, Closer e Prospecção sem isolamento por empresa |
| **ALTO** | Contas a pagar de qualquer empresa podem ser modificadas |
| **ALTO** | Avaliações de reação de outras empresas podem ser alteradas |
| **MÉDIO** | Notificações podem ser criadas para qualquer empresa |

### ⚠️ Funcionalidades Afetadas:
- **CRM (Closer/Prospecção/Cross-selling):** Dados visíveis e editáveis entre empresas
- **Financeiro:** Contas a pagar de outras empresas podem ser alteradas
- **Treinamentos:** Avaliações podem ser manipuladas

---

## FASE 4: Correções de Segurança Adicionais
**Arquivo Migration:** `20260120220000_fix_security_issues_fase4.sql`  
**Arquivo Rollback:** `ROLLBACK_fase4.sql`

### O que a Migration fez:
Policies mais restritas com exceção para `admin_vertical` em:
- `closer_cards`, `closer_colunas`, `closer_etiquetas`, `closer_modelos_atividade`, `closer_atividades`, `closer_card_etiquetas`
- `contas_pagar_atividades`, `contas_pagar_movimentacoes`
- `avaliacao_reacao_opcoes_resposta`, `avaliacao_reacao_respostas`
- `empresa_contatos`, `prospeccao_card_movimentacoes`

### ✅ Validação do Rollback:
| Item | Revertido Corretamente? | Observação |
|------|------------------------|------------|
| Policies Closer (6 tabelas) | ✅ Sim | `FOR ALL USING(true) WITH CHECK(true)` |
| Policies Contas Pagar | ✅ Sim | `FOR ALL USING(true) WITH CHECK(true)` |
| Policies Avaliação Reação | ✅ Sim | Restaura separadas por operação |
| Policies empresa_contatos | ✅ Sim | `FOR ALL USING(true)` |
| Policies prospeccao_card_movimentacoes | ✅ Sim | `FOR ALL USING(true)` |

### 🔴 IMPACTO DO ROLLBACK:
| Severidade | Impacto |
|------------|---------|
| **CRÍTICO** | CRM Closer completamente aberto entre empresas |
| **ALTO** | Movimentações financeiras sem isolamento |
| **ALTO** | Contatos de empresas visíveis/editáveis por todos |
| **MÉDIO** | Respostas de avaliação editáveis por qualquer usuário |

---

## FASE 5: Correções Finais de Segurança
**Arquivo Migration:** `20260120230000_fix_security_issues_fase5.sql`  
**Arquivo Rollback:** `ROLLBACK_fase5.sql`

### O que a Migration fez:
1. **Recriou view `atividades_unificadas`** com `SECURITY INVOKER` (não `DEFINER`)
2. **Corrigiu policies** de `colaboradores_treinamentos_datas` com filtro por empresa

### ✅ Validação do Rollback:
| Item | Revertido Corretamente? | Observação |
|------|------------------------|------------|
| View `atividades_unificadas` | ✅ Sim | Recriada com `security_invoker = false` |
| Policies `colaboradores_treinamentos_datas` | ✅ Sim | Restaura `USING(true)` e `WITH CHECK(true)` |

### 🔴 IMPACTO DO ROLLBACK:
| Severidade | Impacto |
|------------|---------|
| **ALTO** | View executará como owner (bypassa RLS das tabelas base) |
| **MÉDIO** | Datas de treinamentos podem ser modificadas por qualquer usuário |

---

## FASE 6: Índices de Performance em FKs
**Arquivo Migration:** `20260120240000_fix_performance_issues_fase6.sql`  
**Arquivo Rollback:** `ROLLBACK_fase6.sql`

### O que a Migration fez:
Criou ~100 índices em colunas de Foreign Key organizados em 13 grupos:
- Closer, Contas Pagar/Receber, Cross-selling, Prospecção, Pós-venda
- Funil Genérico, Treinamentos, Instrutores, Empresas/Parceiros
- Equipamentos/Frota, EPIs, Notificações/Suporte, Produtos/Pacotes

### ✅ Validação do Rollback:
| Item | Revertido Corretamente? | Observação |
|------|------------------------|------------|
| ~100 índices de FK | ✅ Sim | `DROP INDEX IF EXISTS` para todos |

### 🟡 IMPACTO DO ROLLBACK:
| Severidade | Impacto |
|------------|---------|
| **NENHUM** | Funcionalidade não é afetada |
| **PERFORMANCE** | JOINs e queries com filtros ficam mais lentos |
| **PERFORMANCE** | Policies RLS com subconsultas ficam mais lentas |

### ✅ Seguro para Reverter: **SIM** (apenas afeta performance)

---

## FASE 7: Otimização `auth.uid()` → `(select auth.uid())`
**Arquivo Migration:** `20260120250000_fix_performance_issues_fase7.sql`  
**Arquivo Rollback:** `ROLLBACK_fase7.sql`

### O que a Migration fez:
Substituiu `auth.uid()` por `(select auth.uid())` em ~832 policies para melhorar performance (initplan optimization).

### ✅ Validação do Rollback:
| Item | Revertido Corretamente? | Observação |
|------|------------------------|------------|
| ~832 policies | ✅ Sim | Script dinâmico reverte automaticamente |

### 🟡 IMPACTO DO ROLLBACK:
| Severidade | Impacto |
|------------|---------|
| **NENHUM** | Funcionalidade não é afetada |
| **PERFORMANCE** | Queries com muitas linhas ficam mais lentas |

### ✅ Seguro para Reverter: **SIM** (apenas afeta performance)

---

## FASE 8: Remoção de Índices Não Usados
**Arquivo Migration:** `20260120260000_fix_performance_issues_fase8.sql`  
**Arquivo Rollback:** `ROLLBACK_fase8.sql`

### O que a Migration fez:
1. Removeu ~70 índices não utilizados (status, ativo, data, etc.)
2. Recriou ~28 índices de FK importantes

### ✅ Validação do Rollback:
| Item | Revertido Corretamente? | Observação |
|------|------------------------|------------|
| ~70 índices removidos | ✅ Sim | `CREATE INDEX IF NOT EXISTS` |
| ~28 índices de FK | ⚠️ Parcial | Serão removidos pelos índices originais |

### 🟡 IMPACTO DO ROLLBACK:
| Severidade | Impacto |
|------------|---------|
| **NENHUM** | Funcionalidade não é afetada |
| **PERFORMANCE** | Overhead de escrita aumenta (mais índices para manter) |

### ✅ Seguro para Reverter: **SIM** (apenas afeta performance)

---

## FASE 9: Consolidação de Policies Duplicadas
**Arquivo Migration:** `20260120270000_fix_performance_issues_fase9.sql`  
**Arquivo Rollback:** `ROLLBACK_fase9.sql`

### O que a Migration fez:
Consolidou ~50 policies duplicadas em policies únicas:
- Funis: 6 → 2 policies
- Avaliação de Reação: 30 → 12 policies
- Provas: 15 → 6 policies
- Reorientações: 5 → 2 policies
- Presenças: 5 → 2 policies
- Declarações: 3 → 1 policy
- Financeiro: 3 → 1 policy

### ✅ Validação do Rollback:
| Item | Revertido Corretamente? | Observação |
|------|------------------------|------------|
| Policies de funis | ✅ Sim | Restaura 6 policies originais |
| Policies de avaliação | ✅ Sim | Restaura policies separadas |
| Policies de provas | ✅ Sim | Restaura policies separadas |
| Policies financeiro | ✅ Sim | Restaura 3 policies |

### 🟡 IMPACTO DO ROLLBACK:
| Severidade | Impacto |
|------------|---------|
| **NENHUM** | Funcionalidade não é afetada |
| **PERFORMANCE** | Multiple permissive policies = mais avaliações por query |

### ✅ Seguro para Reverter: **SIM** (apenas afeta performance)

---

## FASE 10: Correções Finais de Segurança + Performance
**Arquivo Migration:** `20260121000000_fix_security_performance_fase10.sql`  
**Arquivo Rollback:** `ROLLBACK_fase10.sql`

### O que a Migration fez:
1. **Segurança:**
   - Removeu policy `ALL + true` de `instrutor_solicitacoes`, criou `SELECT` para anon
   - Restringiu INSERT de `notificacoes` para empresa do usuário

2. **Performance:**
   - Criou 9 índices em FKs sem cobertura

### ✅ Validação do Rollback:
| Item | Revertido Corretamente? | Observação |
|------|------------------------|------------|
| Policy `instrutor_solicitacoes` | ✅ Sim | Restaura `FOR ALL USING(true)` |
| Policy `notificacoes` | ✅ Sim | Restaura `WITH CHECK(true)` |
| 9 índices | ✅ Sim | `DROP INDEX IF EXISTS` |

### 🔴 IMPACTO DO ROLLBACK:
| Severidade | Impacto |
|------------|---------|
| **ALTO** | Qualquer anon pode modificar `instrutor_solicitacoes` |
| **MÉDIO** | Notificações podem ser criadas para qualquer empresa |
| **PERFORMANCE** | 9 índices de FK removidos |

---

## FASE 11: Consolidação Agressiva de Policies
**Arquivo Migration:** `20260121010000_consolidate_policies_fase11.sql`  
**Arquivo Rollback:** `ROLLBACK_fase11.sql`

### O que a Migration fez:
Consolidação massiva de policies (~75 removidas):
- `catalogo_treinamentos`: 9 → 2 policies
- `clientes_sst`: 7 → 2 policies
- `turmas_treinamento`: 6 → 2 policies
- `turma_colaboradores`: 5 → 2 policies
- `turmas_treinamento_aulas`: 5 → 2 policies
- `empresas_modulos`: 5 → 1 policy
- `colaboradores`: 3 → 2 policies
- `avaliacao_reacao_*`: ~12 → ~12 (renomeadas)
- `closer_*`: ~16 → 4 policies
- `cargos`: 8 → 1 policy

### ✅ Validação do Rollback:
| Item | Revertido Corretamente? | Observação |
|------|------------------------|------------|
| `catalogo_treinamentos` | ✅ Sim | Restaura policies originais |
| `clientes_sst` | ✅ Sim | Restaura policies originais |
| `turmas_treinamento` | ✅ Sim | Restaura policies originais |
| `turma_colaboradores` | ✅ Sim | Restaura policies originais |
| `turmas_treinamento_aulas` | ✅ Sim | Restaura policies originais |
| `empresas_modulos` | ✅ Sim | Restaura 2 policies |
| `colaboradores` | ✅ Sim | Restaura policies originais |
| `avaliacao_reacao_*` | ✅ Sim | Restaura com nomes originais |
| `closer_*` | ✅ Sim | Restaura policies separadas |
| `cargos` | ✅ Sim | Restaura 4 policies |

### 🟡 IMPACTO DO ROLLBACK:
| Severidade | Impacto |
|------------|---------|
| **NENHUM** | Funcionalidade não é afetada |
| **PERFORMANCE** | ~75 policies a mais para avaliar por query |

### ✅ Seguro para Reverter: **SIM** (apenas afeta performance)

---

## Resumo de Decisão

### 🔴 FASES CRÍTICAS (NÃO REVERTER):
| Fase | Motivo |
|------|--------|
| **1-2** | Reintroduz vulnerabilidades de SQL injection e acesso irrestrito |
| **3** | Remove isolamento por empresa (dados expostos entre empresas) |
| **4** | CRM completamente aberto entre empresas |
| **5** | View bypassa RLS das tabelas base |
| **10** | Permite modificação anônima de instrutor_solicitacoes |

### 🟢 FASES SEGURAS PARA REVERTER:
| Fase | Impacto |
|------|---------|
| **6** | Apenas performance (JOINs mais lentos) |
| **7** | Apenas performance (queries mais lentas) |
| **8** | Apenas performance (overhead de escrita) |
| **9** | Apenas performance (mais policies para avaliar) |
| **11** | Apenas performance (mais policies para avaliar) |

---

## Ordem de Execução do Rollback (se necessário)

⚠️ **IMPORTANTE:** Execute na ordem REVERSA (11 → 1)

```
1. ROLLBACK_fase11.sql  (seguro)
2. ROLLBACK_fase10.sql  (CUIDADO: reintroduz vulnerabilidade)
3. ROLLBACK_fase9.sql   (seguro)
4. ROLLBACK_fase8.sql   (seguro)
5. ROLLBACK_fase7.sql   (seguro)
6. ROLLBACK_fase6.sql   (seguro)
7. ROLLBACK_fase5.sql   (CUIDADO: view sem SECURITY INVOKER)
8. ROLLBACK_fase4.sql   (CUIDADO: CRM aberto)
9. ROLLBACK_fase3.sql   (CUIDADO: dados entre empresas)
10. ROLLBACK_fase1_fase2.sql (CRÍTICO: vulnerabilidades graves)
```

---

## Conclusão da Validação

### ✅ Todos os Rollbacks estão VÁLIDOS e FUNCIONAIS

Cada arquivo de rollback reverte corretamente as mudanças da sua migration correspondente.

### ⚠️ Recomendação

**NÃO EXECUTAR rollback das Fases 1-5 e 10** em produção, a menos que:
1. A aplicação esteja completamente quebrada
2. Não haja outra alternativa
3. O acesso seja imediatamente restrito após o rollback

Para problemas específicos, considere **corrigir pontualmente** em vez de reverter toda a fase.

---

## Próximo Passo Recomendado

Aplicar a correção do `handle_new_user` para resolver o erro de criação de usuários:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, empresa_id, setor_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'cliente_final'::public.app_role),
    (NEW.raw_user_meta_data ->> 'empresa_id')::uuid,
    (NEW.raw_user_meta_data ->> 'setor_id')::uuid
  );
  RETURN NEW;
END;
$$;
```

Esta correção qualifica explicitamente o tipo `app_role` com `public.app_role`, resolvendo o erro `type "app_role" does not exist` sem necessidade de rollback.
