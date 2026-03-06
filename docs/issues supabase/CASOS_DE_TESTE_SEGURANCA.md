# 🧪 Casos de Teste - Segurança e Performance Supabase

**Projeto:** `xraggzqaddfiymqgrtha`  
**Data:** 20/01/2026  
**Fases Testadas:** 1-8

---

## 📋 Pré-requisitos

### Usuários de Teste
| Usuário | Email | Role | Empresa |
|---------|-------|------|---------|
| **Super Admin** | `joao@toriq.com` | `admin_vertical` | Toriq |
| **Empresa SST** | Usuário empresa SST | `empresa_sst` | Vertical SST |
| **Cliente Final** | Usuário cliente | `cliente_final` | Cliente da Vertical |

---

## 🔴 TESTE 1: Super Admin - Acesso Total

### Objetivo
Verificar se o Super Admin (`joao@toriq.com`) consegue ver dados de TODAS as empresas.

### Passos
1. **Login** como `joao@toriq.com`
2. **Navegar** para `/admin`

### Casos de Teste

| # | Tela | Caminho | Verificar | Resultado Esperado | ✅/❌ |
|---|------|---------|-----------|-------------------|------|
| 1.1 | Dashboard | `/admin` | KPIs carregam | Ver dados de TODAS empresas | |
| 1.2 | Closer | `/admin` → Comercial → Closer | Cards carregam | Ver cards de TODAS empresas | |
| 1.3 | Prospecção | `/admin` → Comercial → Prospecção | Cards carregam | Ver cards de TODAS empresas | |
| 1.4 | Cross-Selling | `/admin` → Comercial → Cross-Selling | Cards carregam | Ver cards de TODAS empresas | |
| 1.5 | Contas a Pagar | `/admin` → Financeiro → Contas a Pagar | Lista carrega | Ver contas de TODAS empresas | |
| 1.6 | Contas a Receber | `/admin` → Financeiro → Contas a Receber | Lista carrega | Ver receitas de TODAS empresas | |
| 1.7 | Empresas | `/admin` → Empresas | Lista carrega | Ver TODAS as empresas | |
| 1.8 | Usuários | `/admin` → Usuários | Lista carrega | Ver TODOS os usuários | |

### Ações CRUD

| # | Ação | Tela | Verificar | Resultado Esperado | ✅/❌ |
|---|------|------|-----------|-------------------|------|
| 1.9 | Criar | Closer → Novo Card | Criar card | Card criado com sucesso | |
| 1.10 | Editar | Closer → Card existente | Editar card | Card atualizado | |
| 1.11 | Mover | Closer → Arrastar card | Mover coluna | Card movido | |
| 1.12 | Deletar | Closer → Excluir card | Excluir | Card removido | |

---

## 🟡 TESTE 2: Empresa SST - Isolamento de Dados

### Objetivo
Verificar se uma Empresa SST vê APENAS dados dos seus clientes.

### Passos
1. **Login** como usuário de Empresa SST (ex: `carolina@vertical.com.br`)
2. **Navegar** para `/sst`

### Casos de Teste

| # | Tela | Caminho | Verificar | Resultado Esperado | ✅/❌ |
|---|------|---------|-----------|-------------------|------|
| 2.1 | Dashboard | `/sst` | KPIs carregam | Ver APENAS dados dos seus clientes | |
| 2.2 | Clientes | `/sst` → Clientes | Lista carrega | Ver APENAS seus clientes | |
| 2.3 | Colaboradores | `/sst` → Colaboradores | Lista carrega | Ver APENAS colaboradores dos clientes | |
| 2.4 | Treinamentos | `/sst` → Treinamentos | Lista carrega | Ver APENAS treinamentos dos clientes | |
| 2.5 | Contas a Pagar | `/sst` → Financeiro | Lista carrega | Ver APENAS suas contas | |
| 2.6 | Avaliação de Reação | `/sst` → Avaliações | Lista carrega | Ver APENAS suas avaliações | |

### Teste de Isolamento (CRÍTICO)

| # | Teste | Como Testar | Resultado Esperado | ✅/❌ |
|---|-------|-------------|-------------------|------|
| 2.7 | Não ver Toriq | Verificar listas | Dados da Toriq NÃO aparecem | |
| 2.8 | Não ver outras SST | Verificar listas | Dados de outras SST NÃO aparecem | |
| 2.9 | Tentar URL direta | Acessar `/admin/empresas/[id-toriq]` | Erro ou redirecionamento | |

---

## 🟢 TESTE 3: Cliente Final - Isolamento de Dados

### Objetivo
Verificar se um Cliente Final vê APENAS seus próprios dados.

### Passos
1. **Login** como usuário Cliente Final
2. **Navegar** para `/cliente`

### Casos de Teste

| # | Tela | Caminho | Verificar | Resultado Esperado | ✅/❌ |
|---|------|---------|-----------|-------------------|------|
| 3.1 | Dashboard | `/cliente` | KPIs carregam | Ver APENAS dados da sua empresa | |
| 3.2 | Colaboradores | `/cliente` → Colaboradores | Lista carrega | Ver APENAS seus colaboradores | |
| 3.3 | Treinamentos | `/cliente` → Treinamentos | Lista carrega | Ver APENAS seus treinamentos | |
| 3.4 | Entregas EPI | `/cliente` → EPIs | Lista carrega | Ver APENAS suas entregas | |

### Teste de Isolamento (CRÍTICO)

| # | Teste | Como Testar | Resultado Esperado | ✅/❌ |
|---|-------|-------------|-------------------|------|
| 3.5 | Não ver outros clientes | Verificar listas | Dados de outras empresas NÃO aparecem | |
| 3.6 | Não ver SST | Verificar listas | Dados da Empresa SST NÃO aparecem | |

---

## 🔵 TESTE 4: Links Públicos (Sem Login)

### Objetivo
Verificar se links públicos funcionam SEM autenticação.

### Casos de Teste

| # | Funcionalidade | URL | Como Testar | Resultado Esperado | ✅/❌ |
|---|----------------|-----|-------------|-------------------|------|
| 4.1 | Presença | `/presenca/{token}` | Abrir em janela anônima | Formulário carrega | |
| 4.2 | Prova | `/prova/{token}` | Abrir em janela anônima | Prova carrega | |
| 4.3 | Avaliação | Link de avaliação | Abrir em janela anônima | Formulário carrega | |
| 4.4 | Cadastro Instrutor | `/instrutor/cadastro/{token}` | Abrir em janela anônima | Formulário carrega | |
| 4.5 | Enviar Presença | Preencher e enviar | Marcar presença | Presença registrada | |
| 4.6 | Enviar Avaliação | Preencher e enviar | Responder avaliação | Resposta salva | |

---

## 🚨 TESTE 5: Segurança - Tentativas de Bypass

### Objetivo
Verificar se o sistema BLOQUEIA tentativas de acesso não autorizado.

### Casos de Teste

| # | Teste | Como Testar | Resultado Esperado | ✅/❌ |
|---|-------|-------------|-------------------|------|
| 5.1 | SQL Injection | Inserir `'; DROP TABLE --` em campos | Entrada sanitizada/bloqueada | |
| 5.2 | Acesso direto por ID | Tentar acessar `/admin/empresa/[id-outro]` | Erro 403 ou sem dados | |
| 5.3 | Manipular JWT | Alterar empresa_id no token | Bloqueado por RLS | |
| 5.4 | API direta | Chamar Supabase direto com outro empresa_id | Retorna vazio ou erro | |

---

## ⚡ TESTE 6: Performance

### Objetivo
Verificar se as otimizações de performance estão funcionando.

### Casos de Teste

| # | Tela | Verificar | Método | Resultado Esperado | ✅/❌ |
|---|------|-----------|--------|-------------------|------|
| 6.1 | Closer | Tempo de carregamento | DevTools → Network | < 3 segundos | |
| 6.2 | Colaboradores | Tempo de carregamento | DevTools → Network | < 3 segundos | |
| 6.3 | Dashboard | Tempo de carregamento | DevTools → Network | < 5 segundos | |
| 6.4 | Filtros | Filtrar lista grande | Observar resposta | Resposta rápida | |

---

## 📊 Checklist de Execução

### Passo a Passo

```
[ ] 1. Fazer backup antes de testar (opcional)
[ ] 2. Executar TESTE 1 (Super Admin)
[ ] 3. Executar TESTE 2 (Empresa SST)
[ ] 4. Executar TESTE 3 (Cliente Final)
[ ] 5. Executar TESTE 4 (Links Públicos)
[ ] 6. Executar TESTE 5 (Segurança)
[ ] 7. Executar TESTE 6 (Performance)
[ ] 8. Documentar resultados
[ ] 9. Reportar problemas encontrados
```

---

## ⚠️ Se Algo Falhar

### Erro de Permissão (403/404)
1. Verificar se o usuário tem a role correta
2. Verificar logs do Supabase
3. Se necessário, executar ROLLBACK da fase específica

### Dados Não Carregam
1. Verificar console do navegador (F12)
2. Verificar aba Network para erros
3. Verificar logs do Supabase

### Rollback Disponíveis
| Fase | Arquivo | Comando |
|------|---------|---------|
| 6 | `ROLLBACK_fase6.sql` | Reverter índices |
| 7 | `ROLLBACK_fase7.sql` | Reverter policies |
| 8 | `ROLLBACK_fase8.sql` | Recriar índices removidos |

---

## 📝 Registro de Resultados

### Data do Teste: ___/___/______
### Testador: ________________

| Teste | Passou | Falhou | Observações |
|-------|--------|--------|-------------|
| TESTE 1 | | | |
| TESTE 2 | | | |
| TESTE 3 | | | |
| TESTE 4 | | | |
| TESTE 5 | | | |
| TESTE 6 | | | |

### Problemas Encontrados
1. 
2. 
3. 

### Ações Necessárias
1. 
2. 
3. 

---

*Documento criado em 20/01/2026 para validação das Fases 1-8*
