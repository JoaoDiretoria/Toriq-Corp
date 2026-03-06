# 🔐 Mapa Completo de Segurança - Supabase

**Projeto:** `xraggzqaddfiymqgrtha`  
**Data:** 20/01/2026  
**Status:** ✅ Fases 1-4 Aplicadas

---

## 📊 Resumo Executivo

| Fase | Foco | Tabelas | Policies | Status |
|------|------|---------|----------|--------|
| **Fase 1** | RLS, Índices, Functions | 8 | 15 | ✅ Aplicada |
| **Fase 2** | search_path, Functions | 20+ funções | - | ✅ Aplicada |
| **Fase 3** | Policies USING(true) | 22 | 63 | ✅ Aplicada |
| **Fase 4** | Policies restantes + admin_vertical | 12 | 48 | ✅ Aplicada |
| **Fase 5** | View SECURITY DEFINER + tabela restante | 2 | 4 | ✅ Aplicada |
| **Total** | - | **~52 tabelas** | **~130 policies** | ✅ |

---

## 🏗️ Estrutura de Níveis de Acesso

### Roles do Sistema

| Role | Descrição | Quantidade | Acesso |
|------|-----------|------------|--------|
| `admin_vertical` | Super Admin (Toriq) | 1 | 🔓 **TOTAL** - Acessa todas as empresas |
| `empresa_sst` | Admin de Empresa SST | 12 | 🔒 Apenas sua empresa |
| `cliente_final` | Usuário Cliente | 5 | 🔒 Apenas sua empresa |
| `empresa_parceira` | Usuário Parceiro | 4 | 🔒 Apenas sua empresa |
| `instrutor` | Instrutor | 11 | 🔒 Apenas sua empresa |

### Tipos de Empresa

| Tipo | Descrição | Quantidade |
|------|-----------|------------|
| `vertical_on` | Toriq (empresa mãe) | 1 |
| `sst` | Empresas SST | 6 |
| `cliente_final` | Clientes finais | 8 |
| `empresa_parceira` | Parceiros | 5 |
| `lead` | Leads | 2 |

---

## 📋 Mapa de Tabelas por Fase

### Fase 1 - Correções Críticas

| Tabela | Correção | Impacto |
|--------|----------|---------|
| `avaliacao_reacao_modelos` | RLS habilitado | Modelos por empresa |
| `catalogo_treinamentos` | RLS habilitado | Catálogo por empresa |
| `contas_bancarias` | RLS habilitado | Contas por empresa |
| `plano_despesas` | RLS habilitado | Planos por empresa |
| `plano_receitas` | RLS habilitado | Planos por empresa |
| `notificacao_config` | RLS habilitado | Config por empresa |
| `notificacoes` | RLS habilitado | Notificações por usuário |
| Índices duplicados | Removidos | Performance |

### Fase 2 - Functions com search_path

| Função | Correção |
|--------|----------|
| `get_user_empresa_id` | `public.` prefix |
| `get_user_role` | `public.` prefix |
| `has_role` | `public.` prefix |
| `get_instrutor_id_for_user` | `public.` prefix |
| `get_clientes_empresa_ids` | `public.` prefix |
| `is_admin_vertical` | `public.` prefix |
| `is_empresa_sst` | `public.` prefix |
| `generate_contrato_numero` | `public.` prefix |
| `generate_utilizacao_codigo` | `public.` prefix |
| `gerar_numero_movimentacao` | `public.` prefix |
| `log_card_movimentacao` | `public.` prefix |
| `log_funil_card_changes` | `public.` prefix |
| `notify_*` (6 funções) | `public.` prefix |
| `log_*` (4 funções) | `public.` prefix |
| + outras | `public.` prefix |

### Fase 3 - Policies USING(true)

| Tabela | Policies Criadas | Filtro |
|--------|------------------|--------|
| `contas_pagar` | 3 (INSERT/UPDATE/DELETE) | `empresa_id` |
| `contas_receber` | 3 | `empresa_id` |
| `cross_selling_cards` | 3 | `empresa_id` |
| `cross_selling_colunas` | 3 | `empresa_id` |
| `cross_selling_etiquetas` | 3 | `empresa_id` |
| `cross_selling_atividades` | 3 | via `card_id` |
| `cross_selling_card_etiquetas` | 3 | via `card_id` |
| `avaliacao_reacao_categorias` | 3 | via `modelo_id` |
| `avaliacao_reacao_itens` | 3 | via `categoria_id` |
| `avaliacao_reacao_modelo_treinamentos` | 3 | via `modelo_id` |
| `avaliacao_reacao_modelos` | 3 | `empresa_id` |
| `prospeccao_cards` | 3 | `empresa_id` |
| `prospeccao_colunas` | 3 | `empresa_id` |
| `prospeccao_atividades` | 3 | via `card_id` |
| `solicitacoes_treinamento` | 3 | `empresa_id` |
| `colaboradores_temporarios` | 3 | via `turma_id` |
| `reorientacoes_colaborador` | 3 | via `turma_id` |
| `sinistros_colaborador` | 3 | via `turma_id` |
| `sinistro_fotos` | 3 | via `sinistro_id` |
| `tipos_sinistro` | 3 | `empresa_id` |
| `turma_provas` | 3 | via `turma_id` |
| `turma_colaborador_presencas` | 3 | via `colaborador_turma_id` |

### Fase 4 - Policies Restantes + admin_vertical

| Tabela | Policies | Filtro | admin_vertical |
|--------|----------|--------|----------------|
| `closer_cards` | 4 | `empresa_id` | ✅ Exceção |
| `closer_colunas` | 4 | `empresa_id` | ✅ Exceção |
| `closer_etiquetas` | 4 | `empresa_id` | ✅ Exceção |
| `closer_modelos_atividade` | 4 | `empresa_id` | ✅ Exceção |
| `closer_atividades` | 4 | via `card_id` | ✅ Exceção |
| `closer_card_etiquetas` | 3 | via `card_id` | ✅ Exceção |
| `contas_pagar_atividades` | 4 | via `conta_id` | ✅ Exceção |
| `contas_pagar_movimentacoes` | 4 | via `conta_id` | ✅ Exceção |
| `avaliacao_reacao_opcoes_resposta` | 3 | via `categoria_id` | ✅ Exceção |
| `avaliacao_reacao_respostas` | 3 | via `modelo_id` | ✅ Exceção |
| `empresa_contatos` | 4 | `empresa_id` | ✅ Exceção |
| `prospeccao_card_movimentacoes` | 4 | via `card_id` | ✅ Exceção |

### Fase 5 - View SECURITY DEFINER + Tabela Restante

| Item | Tipo | Correção | admin_vertical |
|------|------|----------|----------------|
| `atividades_unificadas` | View | SECURITY DEFINER → INVOKER | N/A |
| `colaboradores_treinamentos_datas` | Tabela | 4 policies via `colaborador_treinamento_id` | ✅ Exceção |

---

## 🗺️ Mapa de Funcionalidades por Módulo

### 🔷 Painel Super Admin (`/admin`)

| Seção | Funcionalidade | Tabelas RLS |
|-------|----------------|-------------|
| **Dashboard** | KPIs, métricas | - |
| **Empresas** | CRUD empresas | `empresa_contatos` |
| **Usuários** | CRUD usuários | `profiles` |
| **Comercial → Closer** | Funil de vendas | `closer_*` (6 tabelas) |
| **Comercial → Prospecção** | SDR | `prospeccao_*`, `prospeccao_card_movimentacoes` |
| **Comercial → Cross-Selling** | Vendas adicionais | `cross_selling_*` |
| **Financeiro → Contas a Pagar** | Despesas | `contas_pagar`, `contas_pagar_atividades`, `contas_pagar_movimentacoes` |
| **Financeiro → Contas a Receber** | Receitas | `contas_receber` |

### 🔷 Painel Empresa SST (`/sst`)

| Seção | Funcionalidade | Tabelas RLS |
|-------|----------------|-------------|
| **Clientes** | Gestão de clientes | `clientes_sst` |
| **Financeiro** | Contas | `contas_pagar`, `contas_receber` |
| **Treinamentos** | Turmas, provas | `turmas_treinamento`, `turma_provas` |
| **Avaliação Reação** | Formulários | `avaliacao_reacao_*` |
| **Cadastros** | Contatos | `empresa_contatos` |

### 🔷 Links Públicos (anon)

| Funcionalidade | Tabelas | Acesso |
|----------------|---------|--------|
| Presença | `turma_colaborador_presencas` | SELECT público |
| Prova | `turma_provas`, `provas_questoes` | SELECT público |
| Avaliação | `avaliacao_reacao_respostas` | INSERT público |
| Cadastro Instrutor | `instrutor_solicitacoes` | Público via token |

---

## ✅ Checklist de Testes

### Super Admin (joao)
- [ ] Acessar `/admin`
- [ ] **Closer**: Criar/editar/mover card
- [ ] **Prospecção**: Criar card, ver movimentações
- [ ] **Cross-Selling**: Criar/editar card
- [ ] **Contas a Pagar**: Criar conta, adicionar atividade
- [ ] **Empresas**: Editar empresa, adicionar contato
- [ ] **Liberar Módulo**: Ativar/desativar módulo para empresa
- [ ] **Modo Empresa**: Entrar no painel de uma SST

### Empresa SST (Carolina - Vertical SST)
- [ ] Acessar `/sst`
- [ ] **Contas a Pagar**: Criar/editar conta
- [ ] **Avaliação Reação**: Criar modelo, ver respostas
- [ ] **Contatos**: Criar/editar contato
- [ ] **NÃO** deve ver dados de outras empresas

### Links Públicos
- [ ] Presença: `/presenca/{token}` funciona
- [ ] Prova: `/prova/{token}` funciona
- [ ] Avaliação: Formulário público funciona

---

## 🔄 Rollback

### Arquivos de Rollback
- `ROLLBACK_fase1_fase2.sql` - Fases 1 e 2
- `ROLLBACK_fase3.sql` - Fase 3
- `ROLLBACK_fase4.sql` - Fase 4
- `ROLLBACK_fase5.sql` - Fase 5
- `ROLLBACK_fase6.sql` - Fase 6 (Performance - Índices FK)
- `ROLLBACK_fase7.sql` - Fase 7 (Performance - auth_rls_initplan)
- `ROLLBACK_fase8.sql` - Fase 8 (Performance - Limpeza de índices)
- `ROLLBACK_fase9.sql` - Fase 9 (Performance - Consolidação de policies)

### Como Executar Rollback
```sql
-- Via MCP:
mcp1_execute_sql(project_id="xraggzqaddfiymqgrtha", query="<conteúdo do arquivo>")

-- Ou via Supabase SQL Editor
```

---

## 📈 Próximos Passos (Issues Restantes)

### Security (Restantes) ✅ RESOLVIDO
- [x] View `atividades_unificadas` - SECURITY INVOKER (Fase 5)
- [x] Policies de SELECT com USING(true) - **INTENCIONAIS** para acesso público

### Performance ✅ RESOLVIDO
- [x] Foreign keys sem índices - ~100 índices criados (Fase 6)
- [x] auth_rls_initplan - ~832 policies otimizadas (Fase 7)
- [x] Índices não usados removidos - ~70 removidos (Fase 8)

### Performance (Issues Restantes - ~250)
- [ ] Multiple Permissive Policies (~100) - Otimização futura
- [ ] Unused Indexes (~150) - Índices novos ainda não usados (normal)

---

## 📝 Histórico de Migrações

| Migration | Data | Descrição |
|-----------|------|-----------|
| `20260120190000_fix_critical_security_issues.sql` | 20/01/2026 | Fase 1 |
| `20260120200000_fix_security_issues_fase2.sql` | 20/01/2026 | Fase 2 |
| `20260120210000_fix_security_issues_fase3.sql` | 20/01/2026 | Fase 3 |
| `20260120220000_fix_security_issues_fase4.sql` | 20/01/2026 | Fase 4 |
| `20260120230000_fix_security_issues_fase5.sql` | 20/01/2026 | Fase 5 - View + colaboradores_treinamentos_datas |
| `20260120240000_fix_performance_issues_fase6.sql` | 20/01/2026 | Fase 6 - ~100 índices em FKs |
| `20260120250000_fix_performance_issues_fase7.sql` | 20/01/2026 | Fase 7 - ~832 policies otimizadas |
| `20260120260000_fix_performance_issues_fase8.sql` | 20/01/2026 | Fase 8 - Limpeza de índices |
| `20260120270000_fix_performance_issues_fase9.sql` | 20/01/2026 | Fase 9 - ~35 policies consolidadas |

---

## ⚠️ Issues de Segurança Restantes (INTENCIONAIS)

| Tabela | Policy | Motivo |
|--------|--------|--------|
| `avaliacao_reacao_respostas` | INSERT público (anon) | Formulário público de avaliação |
| `instrutor_solicitacao_perguntas` | INSERT público | Formulário de cadastro de instrutor |
| `instrutor_solicitacoes` | ALL público | Formulário de cadastro de instrutor |
| `notificacoes` | INSERT (authenticated) | Triggers do sistema |

**NOTA:** Estas policies são **INTENCIONAIS** para permitir acesso público a formulários específicos.

---

*Documento atualizado em 20/01/2026 - Fases 1-9 aplicadas (Segurança + Performance)*
