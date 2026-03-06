# 🧪 Casos de Teste - Fase 9: Consolidação de Policies

**Data:** 20/01/2026  
**Fase:** 9 - Multiple Permissive Policies  
**Status:** 🔄 Aguardando Testes

---

## 📋 Resumo das Alterações

A Fase 9 consolidou ~35 policies permissivas duplicadas em policies únicas para melhorar performance.

### Tabelas Afetadas

| Tabela | Alteração | Risco |
|--------|-----------|-------|
| `funis` | 3 DELETE → 1 | 🟡 Médio |
| `funil_etapas` | 3 DELETE → 1 | 🟡 Médio |
| `avaliacao_reacao_categorias` | Removidas 3 redundantes | 🟢 Baixo |
| `avaliacao_reacao_itens` | Removidas 3 redundantes | 🟢 Baixo |
| `avaliacao_reacao_modelos` | Removidas 3 redundantes | 🟢 Baixo |
| `avaliacao_reacao_opcoes_resposta` | Removidas 3 redundantes | 🟢 Baixo |
| `avaliacao_reacao_modelo_treinamentos` | Removidas 3 redundantes | 🟢 Baixo |
| `avaliacao_reacao_respostas` | Removidas 3 redundantes | 🟢 Baixo |
| `provas_alternativas` | Removidas 3 redundantes | 🟢 Baixo |
| `provas_questoes` | Removidas 3 redundantes | 🟢 Baixo |
| `provas_treinamento` | Removidas 3 redundantes | 🟢 Baixo |
| `reorientacoes_colaborador` | Removidas 3 redundantes | 🟢 Baixo |
| `turma_colaborador_presencas` | Removidas 3 redundantes | 🟢 Baixo |
| `declaracoes_reorientacao` | 3 SELECT → 1 | 🟡 Médio |
| `financeiro_contas` | 3 SELECT → 1 | 🟡 Médio |

---

## 🔴 TESTE 1: Funis (CRÍTICO)

### Objetivo
Verificar se criação e exclusão de funis e etapas continua funcionando.

### Pré-requisitos
- Login como usuário com permissão de gerenciar funis

### Casos de Teste

| # | Ação | Passos | Resultado Esperado | ✅/❌ |
|---|------|--------|-------------------|------|
| 1.1 | **Listar funis** | `/admin` → Comercial → Funis Genéricos | Lista de funis carrega | |
| 1.2 | **Criar funil** | Clicar "Novo Funil" → Preencher → Salvar | Funil criado com sucesso | |
| 1.3 | **Editar funil** | Clicar em funil → Editar → Salvar | Funil atualizado | |
| 1.4 | **Criar etapa** | Dentro do funil → "Nova Etapa" → Salvar | Etapa criada | |
| 1.5 | **Deletar etapa** | Clicar em etapa → Excluir → Confirmar | ⚠️ Etapa removida | |
| 1.6 | **Deletar funil** | Clicar em funil → Excluir → Confirmar | ⚠️ Funil removido | |

### ⚠️ Se falhar:
Execute `ROLLBACK_fase9.sql` - Seção LOTE 1

---

## 🟡 TESTE 2: Avaliação de Reação (Links Públicos)

### Objetivo
Verificar se formulários públicos de avaliação de reação continuam funcionando.

### Pré-requisitos
- Link público de avaliação de reação
- Testar em **janela anônima** (sem login)

### Casos de Teste

| # | Ação | Passos | Resultado Esperado | ✅/❌ |
|---|------|--------|-------------------|------|
| 2.1 | **Abrir link público** | Abrir link de avaliação em janela anônima | Formulário carrega | |
| 2.2 | **Carregar categorias** | Verificar se categorias aparecem | Categorias visíveis | |
| 2.3 | **Carregar itens** | Verificar se perguntas aparecem | Perguntas visíveis | |
| 2.4 | **Carregar opções** | Verificar se opções de resposta aparecem | Opções visíveis | |
| 2.5 | **Enviar avaliação** | Preencher formulário → Enviar | Resposta salva com sucesso | |

### Como obter link de avaliação:
1. Login como Admin → Treinamentos → Avaliações
2. Selecionar uma avaliação → Copiar link público

### ⚠️ Se falhar:
Execute `ROLLBACK_fase9.sql` - Seção LOTE 2

---

## 🟡 TESTE 3: Provas Públicas

### Objetivo
Verificar se provas públicas continuam funcionando.

### Pré-requisitos
- Link público de prova (`/prova/{token}`)
- Testar em **janela anônima** (sem login)

### Casos de Teste

| # | Ação | Passos | Resultado Esperado | ✅/❌ |
|---|------|--------|-------------------|------|
| 3.1 | **Abrir prova** | Abrir `/prova/{token}` em janela anônima | Prova carrega | |
| 3.2 | **Carregar questões** | Verificar se questões aparecem | Questões visíveis | |
| 3.3 | **Carregar alternativas** | Verificar se alternativas aparecem | Alternativas visíveis | |
| 3.4 | **Responder prova** | Selecionar alternativas → Enviar | Prova enviada com sucesso | |

### ⚠️ Se falhar:
Execute `ROLLBACK_fase9.sql` - Seção LOTE 3

---

## 🟢 TESTE 4: Presenças e Reorientações

### Objetivo
Verificar se lista de presenças e reorientações carrega corretamente.

### Pré-requisitos
- Login como Admin ou Empresa SST

### Casos de Teste

| # | Ação | Passos | Resultado Esperado | ✅/❌ |
|---|------|--------|-------------------|------|
| 4.1 | **Listar presenças** | Turmas → Selecionar turma → Presenças | Lista de presenças carrega | |
| 4.2 | **Listar reorientações** | Turmas → Selecionar turma → Reorientações | Lista de reorientações carrega | |

### ⚠️ Se falhar:
Execute `ROLLBACK_fase9.sql` - Seções LOTE 4 e 5

---

## 🟡 TESTE 5: Declarações de Reorientação

### Objetivo
Verificar se declarações de reorientação são visíveis corretamente.

### Casos de Teste

| # | Usuário | Ação | Resultado Esperado | ✅/❌ |
|---|---------|------|-------------------|------|
| 5.1 | **Super Admin** | Listar declarações | Vê TODAS as declarações | |
| 5.2 | **Empresa SST** | Listar declarações | Vê APENAS suas declarações | |
| 5.3 | **Cliente Final** | Listar declarações | Vê declarações das suas turmas | |

### ⚠️ Se falhar:
Execute `ROLLBACK_fase9.sql` - Seção LOTE 6

---

## 🟡 TESTE 6: Financeiro - Contas

### Objetivo
Verificar se contas financeiras são visíveis corretamente.

### Casos de Teste

| # | Usuário | Ação | Resultado Esperado | ✅/❌ |
|---|---------|------|-------------------|------|
| 6.1 | **Super Admin** | Financeiro → Contas | Vê TODAS as contas | |
| 6.2 | **Empresa SST** | Financeiro → Contas | Vê APENAS suas contas | |
| 6.3 | **Cliente Final** | Financeiro → Contas | Vê APENAS suas contas | |

### ⚠️ Se falhar:
Execute `ROLLBACK_fase9.sql` - Seção LOTE 7

---

## 📊 Checklist de Execução

### Ordem Recomendada

```
[ ] 1. TESTE 2 - Avaliação de Reação (link público) - MAIS IMPORTANTE
[ ] 2. TESTE 3 - Provas Públicas (link público) - IMPORTANTE
[ ] 3. TESTE 1 - Funis (criar/deletar) - MÉDIO
[ ] 4. TESTE 4 - Presenças e Reorientações - BAIXO
[ ] 5. TESTE 5 - Declarações de Reorientação - BAIXO
[ ] 6. TESTE 6 - Financeiro Contas - BAIXO
```

---

## 🚨 Procedimento de Rollback

Se qualquer teste falhar:

### Opção 1: Rollback Completo
```sql
-- Executar todo o arquivo ROLLBACK_fase9.sql
```

### Opção 2: Rollback Parcial (por lote)
```sql
-- Executar apenas a seção específica do ROLLBACK_fase9.sql
-- LOTE 1: Funis
-- LOTE 2: Avaliação de Reação
-- LOTE 3: Provas
-- LOTE 4: Reorientações
-- LOTE 5: Presenças
-- LOTE 6: Declarações
-- LOTE 7: Financeiro
```

---

## 📝 Registro de Resultados

### Data do Teste: ___/___/______
### Testador: ________________

| Teste | Passou | Falhou | Observações |
|-------|--------|--------|-------------|
| TESTE 1 - Funis | | | |
| TESTE 2 - Avaliação | | | |
| TESTE 3 - Provas | | | |
| TESTE 4 - Presenças | | | |
| TESTE 5 - Declarações | | | |
| TESTE 6 - Financeiro | | | |

### Problemas Encontrados
1. 
2. 
3. 

### Ações Tomadas
1. 
2. 
3. 

---

## ✅ Critérios de Aprovação

Para considerar a Fase 9 **APROVADA**, todos os testes devem passar:

- [ ] Links públicos de avaliação funcionam
- [ ] Links públicos de provas funcionam
- [ ] Criar/deletar funis funciona
- [ ] Criar/deletar etapas funciona
- [ ] Listas de presenças carregam
- [ ] Listas de reorientações carregam
- [ ] Declarações são visíveis por role
- [ ] Contas financeiras são visíveis por role

---

*Documento criado em 20/01/2026 para validação da Fase 9*
