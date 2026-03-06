# Impacto das Mudanças de Segurança Supabase

**Data:** 20/01/2026  
**Projeto:** `xraggzqaddfiymqgrtha`

---

## Resumo de Mudanças

| Categoria | Quantidade | Risco |
|-----------|------------|-------|
| Funções com search_path | 78 | 🟡 Médio |
| Policies restritivas | 18 | 🟠 Alto |
| RLS habilitado | 2 tabelas | 🟠 Alto |
| Índices removidos | 7 | 🟢 Baixo |
| Colunas adicionadas | 2 | 🟢 Baixo |

---

## Detalhamento por Mudança

### 1. RLS Habilitado em `turma_cases_sucesso`
**O que foi feito:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

**Impacto:**
- ⚠️ Se não existirem policies de SELECT, a tabela fica INACESSÍVEL
- ✅ Policies existentes agora são enforçadas

**Sintomas de problema:**
- Erro "permission denied for table turma_cases_sucesso"
- Listagem de cases vazia

**Rollback:** `ALTER TABLE public.turma_cases_sucesso DISABLE ROW LEVEL SECURITY;`

---

### 2. View `atividades_unificadas` Recriada
**O que foi feito:** Removido SECURITY DEFINER da view

**Impacto:**
- ✅ Queries respeitam RLS do usuário que consulta
- ⚠️ Se usuário não tiver acesso às tabelas subjacentes, verá menos dados

**Sintomas de problema:**
- Dashboard de atividades mostrando menos itens
- Atividades de outras empresas não aparecem (esperado)

**Rollback:** Recriar view com SECURITY DEFINER (não recomendado)

---

### 3. Policies de `turma_colaborador_presencas` (anon)
**O que foi feito:** Substituídas policies `USING(true)` por verificação de `permite_presenca_publica`

**Impacto:**
- ⚠️ Links públicos de presença só funcionam se turma tiver `permite_presenca_publica = true`
- ✅ Por padrão, todas as turmas têm `true` (DEFAULT)

**Sintomas de problema:**
- Link de presença pública retorna erro de permissão
- Aluno não consegue registrar presença via link público

**Rollback:** Ver `ROLLBACK_fase1_fase2.sql` seção 3

---

### 4. Policies de `turma_provas` (anon)
**O que foi feito:** Substituídas policies `USING(true)` por verificação de `permite_prova_publica`

**Impacto:**
- ⚠️ Links públicos de prova só funcionam se turma tiver `permite_prova_publica = true`
- ✅ Por padrão, todas as turmas têm `true` (DEFAULT)

**Sintomas de problema:**
- Link de prova pública retorna erro de permissão
- Aluno não consegue fazer prova via link público

**Rollback:** Ver `ROLLBACK_fase1_fase2.sql` seção 5

---

### 5. 78 Funções com `search_path = ''`
**O que foi feito:** `ALTER FUNCTION ... SET search_path = ''`

**Impacto:**
- ⚠️ Funções que referenciam tabelas SEM `public.` podem falhar
- ✅ Protege contra ataques de search_path hijacking

**Sintomas de problema:**
- Erro "relation X does not exist" em triggers ou funções
- Triggers de updated_at param de funcionar

**Rollback:** `ALTER FUNCTION public.nome_funcao RESET search_path;`

---

### 6. RLS em `notificacao_config`
**O que foi feito:** Habilitado RLS com policy de leitura para authenticated

**Impacto:**
- ⚠️ Usuários não autenticados não conseguem ler configurações
- ✅ Esperado - configurações são para usuários logados

**Sintomas de problema:**
- Configurações de notificação não carregam

**Rollback:** 
```sql
DROP POLICY IF EXISTS "Usuários autenticados podem ver configurações" ON public.notificacao_config;
ALTER TABLE public.notificacao_config DISABLE ROW LEVEL SECURITY;
```

---

### 7. Policies de `turma_anexos`, `tickets_suporte_*`, `solicitacoes_treinamento`
**O que foi feito:** Políticas restritivas por empresa

**Impacto:**
- ⚠️ Usuários só acessam dados da SUA empresa
- ✅ Isolamento de dados entre empresas (esperado)

**Sintomas de problema:**
- Anexos de turma não aparecem
- Tickets de outras empresas não acessíveis

**Rollback:** Ver `ROLLBACK_fase1_fase2.sql` seções correspondentes

---

### 8. Índices Duplicados Removidos (7)
**O que foi feito:** DROP INDEX de índices redundantes

**Impacto:**
- ✅ Zero impacto funcional
- ✅ Melhora performance de escrita
- ✅ Economia de espaço

**Rollback:** Não necessário

---

### 9. Colunas Adicionadas em `turmas_treinamento`
**O que foi feito:** 
- `permite_presenca_publica BOOLEAN DEFAULT true`
- `permite_prova_publica BOOLEAN DEFAULT true`

**Impacto:**
- ✅ Zero impacto - DEFAULT true mantém comportamento atual

**Rollback:** 
```sql
ALTER TABLE public.turmas_treinamento DROP COLUMN IF EXISTS permite_presenca_publica;
ALTER TABLE public.turmas_treinamento DROP COLUMN IF EXISTS permite_prova_publica;
```

---

## Como Testar

### Testes Críticos (fazer agora)
1. ✅ Login de usuário
2. ✅ Listagem de turmas
3. ⚠️ Link público de presença
4. ⚠️ Link público de prova
5. ✅ Dashboard de atividades

### Testes Secundários
1. Criar novo ticket de suporte
2. Adicionar anexo em turma
3. Atualizar solicitação de treinamento

---

## Contato para Rollback

Se houver problemas críticos, execute o rollback via MCP:
```
mcp1_execute_sql(project_id="xraggzqaddfiymqgrtha", query="<conteúdo do ROLLBACK_fase1_fase2.sql>")
```

Ou acesse o Supabase Dashboard > SQL Editor e execute manualmente.
