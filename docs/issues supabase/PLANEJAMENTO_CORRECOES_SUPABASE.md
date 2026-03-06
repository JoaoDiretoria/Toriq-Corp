# Planejamento de Correções - Supabase Database Advisors

**Data de Análise:** 11 de Janeiro de 2026  
**Total de Issues:** 1524 (124 Segurança + 1400 Performance)

---

## 📊 Resumo Executivo

| Categoria | Quantidade | Prioridade |
|-----------|------------|------------|
| **SEGURANÇA - ERRO** | ~10 | 🔴 CRÍTICA |
| **SEGURANÇA - WARN** | ~114 | 🟠 ALTA |
| **PERFORMANCE - INFO** | ~1350 | 🟡 MÉDIA |
| **PERFORMANCE - WARN** | ~50 | 🟠 ALTA |

---

## 🔴 ISSUES DE SEGURANÇA - CRÍTICAS (ERRO)

### 1. RLS Desabilitado com Policies Existentes

**Problema:** Tabelas têm políticas RLS criadas, mas o RLS não está habilitado.

| Tabela | Policies Existentes |
|--------|---------------------|
| `turma_cases_sucesso` | "Admin pode ver todos cases de sucesso", "Cliente final pode ver cases de sucesso das suas turmas" |

**Solução:**
```sql
ALTER TABLE public.turma_cases_sucesso ENABLE ROW LEVEL SECURITY;
```

**Prioridade:** 🔴 CRÍTICA - Executar imediatamente

---

## 🟠 ISSUES DE SEGURANÇA - ALTA (WARN)

### 2. Tabelas Públicas sem RLS

**Problema:** Tabelas expostas publicamente sem Row Level Security habilitado.

| Tabela | Descrição |
|--------|-----------|
| `automacoes` | Automações do sistema |
| `catalogo_treinamentos` | Catálogo de treinamentos |
| `clientes_sst` | Clientes SST |
| `closer_atividades` | Atividades do closer |
| `closer_card_etiquetas` | Etiquetas de cards |
| `closer_card_movimentacoes` | Movimentações de cards |
| `closer_cards` | Cards do closer |
| `closer_colunas` | Colunas do closer |
| `closer_etiquetas` | Etiquetas |
| `closer_modelos_atividade` | Modelos de atividade |
| `colaboradores` | Colaboradores |
| `colaboradores_treinamentos` | Treinamentos de colaboradores |
| `colaboradores_treinamentos_datas` | Datas de treinamentos |
| `comercial_funil` | Funil comercial |
| `contas_pagar` | Contas a pagar |
| `contas_pagar_atividades` | Atividades de contas |
| `contas_pagar_atividades_anexos` | Anexos de atividades |
| `contas_pagar_colunas` | Colunas de contas |
| `contas_pagar_movimentacoes` | Movimentações |
| `contas_receber` | Contas a receber |
| `contas_receber_atividades` | Atividades |
| `contas_receber_colunas` | Colunas |
| `contas_receber_movimentacoes` | Movimentações |
| `contratos` | Contratos |
| `declaracoes_reorientacao` | Declarações |
| `documentos_empresa` | Documentos |
| `empresa_leads` | Leads |
| `empresas` | Empresas |
| `etiquetas` | Etiquetas |
| `funil_card_comparacoes` | Comparações |
| `funil_card_etiquetas` | Etiquetas de cards |
| `funil_card_movimentacoes` | Movimentações |
| `funil_card_orcamentos` | Orçamentos |
| `funil_cards` | Cards de funil |
| `funil_etapas` | Etapas de funil |
| `funis` | Funis |
| `funis_configuracoes` | Configurações |
| `grupos_homogeneos` | Grupos homogêneos |
| `informacoes_empresa` | Informações |
| `instrutor_solicitacoes` | Solicitações |
| `instrutores` | Instrutores |
| `matriz_treinamentos` | Matriz |
| `modelo_relatorio_blocos` | Blocos de relatório |
| `modelos_atividade` | Modelos |
| `modelos_relatorio` | Modelos de relatório |
| `normas_regulamentadoras` | NRs |
| `profiles` | Perfis de usuário |
| `prospeccao_card_movimentacoes` | Movimentações |
| `prospeccao_cards` | Cards |
| `prospeccao_colunas` | Colunas |
| `relatorios` | Relatórios |
| `setores` | Setores |
| `turma_cases_sucesso` | Cases de sucesso |
| `turma_colaborador_presencas` | Presenças |
| `turma_colaboradores` | Colaboradores de turma |
| `turma_provas` | Provas |
| `turmas_treinamento` | Turmas |
| `turmas_treinamento_aulas` | Aulas |

**Solução Template:**
```sql
-- Para cada tabela, habilitar RLS e criar policies apropriadas
ALTER TABLE public.<nome_tabela> ENABLE ROW LEVEL SECURITY;

-- Policy padrão para usuários autenticados da mesma empresa
CREATE POLICY "Usuários podem ver dados da sua empresa"
  ON public.<nome_tabela> FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));
```

**Prioridade:** 🟠 ALTA

---

### 3. Functions com Search Path Mutável

**Problema:** Funções sem `search_path` definido podem ser vulneráveis a ataques de injeção de schema.

| Função | Schema |
|--------|--------|
| `update_declaracoes_reorientacao_updated_at` | public |
| `update_catalogo_treinamentos_updated_at` | public |
| `update_turma_colaboradores_updated_at` | public |
| `update_modelo_relatorio_updated_at` | public |
| `update_prospeccao_updated_at` | public |
| `update_grupos_homogeneos_updated_at` | public |
| `update_modelo_relatorio_blocos_updated_at` | public |
| `update_cliente_contatos_updated_at` | public |
| `update_funil_card_orcamentos_updated_at` | public |
| `update_funil_card_comparacoes_updated_at` | public |
| `update_informacoes_empresa_updated_at` | public |
| `update_instrutor_solicitacoes_updated_at` | public |
| `get_subordinados` | public |
| `generate_contrato_numero` | public |
| `update_contratos_updated_at` | public |
| ... e mais ~100 funções |

**Solução Template:**
```sql
-- Recriar função com search_path fixo
CREATE OR REPLACE FUNCTION public.<nome_funcao>()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

**Prioridade:** 🟠 ALTA

---

### 4. Policies RLS Sempre Verdadeiras (USING true / WITH CHECK true)

**Problema:** Policies que permitem acesso irrestrito, efetivamente bypassando RLS.

| Tabela | Policy | Comando | Role |
|--------|--------|---------|------|
| `turma_colaborador_presencas` | Presenças atualizáveis publicamente | UPDATE | anon |
| `turma_colaborador_presencas` | Presenças inseríveis publicamente | INSERT | anon |
| `turma_colaboradores` | Atualizar notas de provas publicamente | UPDATE | anon |
| `turma_provas` | Atualizar provas autenticado | UPDATE | authenticated |
| `turma_provas` | Atualizar provas publicamente | UPDATE | anon |
| `turma_provas` | Deletar provas autenticado | DELETE | authenticated |
| `turma_provas` | Deletar provas publicamente | DELETE | anon |
| `turma_provas` | Inserir provas autenticado | INSERT | authenticated |
| `turma_provas` | Inserir provas publicamente | INSERT | anon |

**Solução:**
Revisar cada policy e adicionar condições apropriadas:
```sql
-- Exemplo: Restringir para turmas da empresa do usuário
DROP POLICY IF EXISTS "Presenças atualizáveis publicamente" ON turma_colaborador_presencas;

CREATE POLICY "Presenças atualizáveis pela empresa"
  ON turma_colaborador_presencas FOR UPDATE
  USING (
    turma_colaborador_id IN (
      SELECT tc.id FROM turma_colaboradores tc
      JOIN turmas_treinamento tt ON tc.turma_id = tt.id
      WHERE tt.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );
```

**Prioridade:** 🟠 ALTA

---

### 5. Proteção contra Senhas Vazadas Desabilitada

**Problema:** A proteção contra senhas comprometidas (HaveIBeenPwned) está desabilitada.

**Solução:**
1. Acessar o Dashboard do Supabase
2. Ir em Authentication > Settings
3. Habilitar "Leaked Password Protection"

**Link:** https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

**Prioridade:** 🟠 ALTA

---

## 🟡 ISSUES DE PERFORMANCE - MÉDIA (INFO)

### 6. Foreign Keys sem Índices

**Problema:** Chaves estrangeiras sem índices de cobertura podem causar queries lentas.

| Tabela | Foreign Key |
|--------|-------------|
| `automacoes` | automacoes_etapa_id_fkey |
| `closer_atividades` | closer_atividades_responsavel_id_fkey |
| `closer_atividades` | closer_atividades_usuario_id_fkey |
| `closer_card_etiquetas` | closer_card_etiquetas_etiqueta_id_fkey |
| `closer_card_movimentacoes` | closer_card_movimentacoes_coluna_destino_id_fkey |
| `closer_card_movimentacoes` | closer_card_movimentacoes_coluna_origem_id_fkey |
| `closer_card_movimentacoes` | closer_card_movimentacoes_usuario_id_fkey |
| `closer_cards` | closer_cards_empresa_lead_id_fkey |
| `closer_modelos_atividade` | closer_modelos_atividade_empresa_id_fkey |
| `colaboradores_treinamentos_datas` | colaboradores_treinamentos_data_colaborador_treinamento_id_fkey |
| `comercial_funil` | comercial_funil_empresa_id_fkey |
| `contas_pagar` | contas_pagar_created_by_fkey |
| `contas_pagar_atividades` | contas_pagar_atividades_usuario_id_fkey |
| ... e mais ~1300 foreign keys |

**Solução Template:**
```sql
-- Criar índice para cada foreign key
CREATE INDEX IF NOT EXISTS idx_<tabela>_<coluna> 
  ON public.<tabela>(<coluna_fk>);

-- Exemplo:
CREATE INDEX IF NOT EXISTS idx_automacoes_etapa_id 
  ON public.automacoes(etapa_id);
```

**Prioridade:** 🟡 MÉDIA

---

### 7. Múltiplas Policies Permissivas

**Problema:** Múltiplas policies permissivas para o mesmo role/action causam overhead de performance.

| Tabela | Role | Action | Policies |
|--------|------|--------|----------|
| `turma_provas` | authenticated | SELECT | "Instrutores podem ver provas turma", "Provas visíveis para usuários autenticados" |
| `turma_provas` | authenticated | UPDATE | "Atualizar provas autenticado", "Instrutores podem atualizar provas turma" |
| `turmas_treinamento` | anon | SELECT | "Turmas visíveis publicamente para cadastro", "Turmas visíveis publicamente para provas" |
| `turmas_treinamento` | authenticated | SELECT | "Clientes finais podem ver suas turmas", "Instrutores podem ver suas turmas", "Parceira pode ver turmas via empresa_sst", "Usuários podem ver turmas da sua empresa" |
| `turmas_treinamento` | authenticated | UPDATE | "Instrutores podem atualizar suas turmas", "Usuários SST podem atualizar turmas da sua empresa" |
| `turmas_treinamento_aulas` | authenticated | SELECT | "Clientes finais podem ver aulas das suas turmas", "Instrutores podem ver aulas das suas turmas", "Parceira pode ver aulas via empresa_sst", "Usuários podem ver aulas de turmas da sua empresa" |
| `turmas_treinamento_aulas` | authenticated | UPDATE | "Instrutores podem atualizar aulas das suas turmas", "Usuários SST podem atualizar aulas" |

**Solução:**
Consolidar múltiplas policies em uma única policy com condições OR:
```sql
-- Antes: 4 policies separadas
-- Depois: 1 policy consolidada
DROP POLICY IF EXISTS "Clientes finais podem ver suas turmas" ON turmas_treinamento;
DROP POLICY IF EXISTS "Instrutores podem ver suas turmas" ON turmas_treinamento;
DROP POLICY IF EXISTS "Parceira pode ver turmas via empresa_sst" ON turmas_treinamento;
DROP POLICY IF EXISTS "Usuários podem ver turmas da sua empresa" ON turmas_treinamento;

CREATE POLICY "Usuários autorizados podem ver turmas"
  ON turmas_treinamento FOR SELECT
  USING (
    -- Usuários da empresa
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    OR
    -- Instrutores
    instrutor_id = auth.uid()
    OR
    -- Clientes finais
    EXISTS (SELECT 1 FROM turma_colaboradores tc WHERE tc.turma_id = id AND tc.colaborador_id IN (
      SELECT c.id FROM colaboradores c WHERE c.user_id = auth.uid()
    ))
    OR
    -- Parceira via empresa_sst
    empresa_sst_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );
```

**Prioridade:** 🟠 ALTA (impacto direto em performance)

---

### 8. Índices Duplicados

**Problema:** Índices idênticos ocupam espaço e causam overhead em writes.

| Tabela | Índices Duplicados |
|--------|-------------------|
| `contas_pagar_atividades` | idx_contas_pagar_atividades_conta, idx_contas_pagar_atividades_conta_id |
| `contas_pagar_colunas` | idx_contas_pagar_colunas_empresa, idx_contas_pagar_colunas_empresa_id |
| `contas_pagar_movimentacoes` | idx_contas_pagar_movimentacoes_conta, idx_contas_pagar_movimentacoes_conta_id |
| `prospeccao_card_movimentacoes` | idx_card_movimentacoes_card_id, idx_prospeccao_card_movimentacoes_card_id |
| `prospeccao_card_movimentacoes` | idx_card_movimentacoes_created_at, idx_prospeccao_card_movimentacoes_created_at |

**Solução:**
```sql
-- Remover índices duplicados (manter apenas um)
DROP INDEX IF EXISTS idx_contas_pagar_atividades_conta;
DROP INDEX IF EXISTS idx_contas_pagar_colunas_empresa;
DROP INDEX IF EXISTS idx_contas_pagar_movimentacoes_conta;
DROP INDEX IF EXISTS idx_card_movimentacoes_card_id;
DROP INDEX IF EXISTS idx_card_movimentacoes_created_at;
```

**Prioridade:** 🟡 MÉDIA

---

## 📋 PLANO DE EXECUÇÃO

### Fase 1: Correções Críticas (Imediato)
- [ ] Habilitar RLS na tabela `turma_cases_sucesso`
- [ ] Habilitar proteção contra senhas vazadas no Auth
- [ ] Revisar policies com `USING (true)` em tabelas sensíveis

### Fase 2: Segurança Alta (1-2 semanas)
- [ ] Habilitar RLS em todas as tabelas públicas
- [ ] Criar policies apropriadas para cada tabela
- [ ] Corrigir search_path em todas as funções

### Fase 3: Performance Alta (2-3 semanas)
- [ ] Consolidar múltiplas policies permissivas
- [ ] Remover índices duplicados

### Fase 4: Performance Média (Ongoing)
- [ ] Criar índices para foreign keys sem cobertura
- [ ] Monitorar slow queries e otimizar

---

## 🔗 Referências

- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Password Security](https://supabase.com/docs/guides/auth/password-security)
- [Performance Tuning](https://supabase.com/docs/guides/database/performance)

---

## 📝 Notas

Este documento foi gerado automaticamente através da análise dos advisors do Supabase MCP.
As correções devem ser aplicadas em ambiente de desenvolvimento primeiro e testadas antes de ir para produção.

**Última atualização:** 11/01/2026
