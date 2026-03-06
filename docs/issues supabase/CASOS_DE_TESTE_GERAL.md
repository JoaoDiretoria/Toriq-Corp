# 🧪 Casos de Teste Geral - Segurança e Performance Supabase

**Projeto:** `xraggzqaddfiymqgrtha`  
**Data:** 20/01/2026  
**Fases Cobertas:** 1-9 (Todas)

---

## 📋 Resumo das Alterações

| Fase | Tipo | O que foi feito |
|------|------|-----------------|
| 1-2 | Segurança | RLS habilitado + Functions corrigidas |
| 3-4 | Segurança | Policies restritivas + exceção admin_vertical |
| 5 | Segurança | View INVOKER + colaboradores_treinamentos_datas |
| 6 | Performance | ~100 índices em Foreign Keys |
| 7 | Performance | ~832 policies otimizadas (auth.uid → select) |
| 8 | Performance | ~70 índices removidos + ~28 FKs recriados |
| 9 | Performance | ~35 policies consolidadas |

---

## 🎯 TESTE RÁPIDO (5 minutos)

Execute estes testes primeiro para validação rápida:

| # | Teste | Como | Resultado Esperado | ✅/❌ |
|---|-------|------|-------------------|------|
| 1 | **Login Super Admin** | Login `joao@toriq.com` | Acessa `/admin` | |
| 2 | **Dashboard carrega** | Verificar `/admin` | KPIs aparecem | |
| 3 | **Closer carrega** | Comercial → Closer | Cards aparecem | |
| 4 | **Login Empresa SST** | Login usuário SST | Acessa `/sst` | |
| 5 | **Link público** | Abrir link avaliação anônimo | Formulário carrega | |

**Se todos passarem:** Sistema funcional ✅

---

## 🔴 TESTES CRÍTICOS

### TC-01: Super Admin - Acesso Total

**Usuário:** `joao@toriq.com` (role: `admin_vertical`)

| # | Funcionalidade | Caminho | Verificar | ✅/❌ |
|---|----------------|---------|-----------|------|
| 1.1 | Dashboard | `/admin` | KPIs de TODAS empresas | |
| 1.2 | Closer | Comercial → Closer | Cards de TODAS empresas | |
| 1.3 | Prospecção | Comercial → Prospecção | Cards de TODAS empresas | |
| 1.4 | Cross-Selling | Comercial → Cross-Selling | Cards de TODAS empresas | |
| 1.5 | Contas Pagar | Financeiro → Contas Pagar | Contas de TODAS empresas | |
| 1.6 | Contas Receber | Financeiro → Contas Receber | Receitas de TODAS empresas | |
| 1.7 | Empresas | Cadastros → Empresas | Lista TODAS empresas | |
| 1.8 | Usuários | Cadastros → Usuários | Lista TODOS usuários | |
| 1.9 | Funis | Comercial → Funis | Ver/criar/deletar funis | |
| 1.10 | Modo Empresa | Empresas → "Acessar como" | Entra no painel da empresa | |

---

### TC-02: Empresa SST - Isolamento de Dados

**Usuário:** Usuário de empresa SST

| # | Funcionalidade | Caminho | Verificar | ✅/❌ |
|---|----------------|---------|-----------|------|
| 2.1 | Dashboard | `/sst` | KPIs APENAS dos seus clientes | |
| 2.2 | Clientes | Cadastros → Clientes | APENAS seus clientes | |
| 2.3 | Colaboradores | Cadastros → Colaboradores | APENAS dos seus clientes | |
| 2.4 | Treinamentos | Treinamentos → Lista | APENAS dos seus clientes | |
| 2.5 | Turmas | Treinamentos → Turmas | APENAS suas turmas | |
| 2.6 | Contas Pagar | Financeiro → Contas Pagar | APENAS suas contas | |
| 2.7 | **NÃO VER** | Qualquer tela | Dados da Toriq NÃO aparecem | |
| 2.8 | **NÃO VER** | Qualquer tela | Dados de outras SST NÃO aparecem | |

---

### TC-03: Cliente Final - Isolamento de Dados

**Usuário:** Usuário cliente final

| # | Funcionalidade | Caminho | Verificar | ✅/❌ |
|---|----------------|---------|-----------|------|
| 3.1 | Dashboard | `/cliente` | KPIs APENAS da sua empresa | |
| 3.2 | Colaboradores | Cadastros → Colaboradores | APENAS seus colaboradores | |
| 3.3 | Treinamentos | Treinamentos → Lista | APENAS seus treinamentos | |
| 3.4 | EPIs | EPIs → Entregas | APENAS suas entregas | |
| 3.5 | **NÃO VER** | Qualquer tela | Dados de outras empresas NÃO aparecem | |

---

### TC-04: Links Públicos (Sem Login)

**Testar em:** Janela anônima (Ctrl+Shift+N)

| # | Funcionalidade | URL | Verificar | ✅/❌ |
|---|----------------|-----|-----------|------|
| 4.1 | Presença | `/presenca/{token}` | Formulário carrega | |
| 4.2 | Prova | `/prova/{token}` | Prova carrega | |
| 4.3 | Avaliação | Link de avaliação | Formulário carrega | |
| 4.4 | Cadastro Instrutor | `/instrutor/cadastro/{token}` | Formulário carrega | |
| 4.5 | Enviar Presença | Preencher → Enviar | Presença registrada | |
| 4.6 | Enviar Avaliação | Preencher → Enviar | Resposta salva | |
| 4.7 | Fazer Prova | Responder → Enviar | Prova enviada | |

---

## 🟡 TESTES FUNCIONAIS

### TC-05: CRUD Completo

**Usuário:** Super Admin ou Empresa SST

| # | Entidade | Criar | Editar | Deletar | ✅/❌ |
|---|----------|-------|--------|---------|------|
| 5.1 | Funil | Novo funil | Renomear | Excluir | |
| 5.2 | Etapa do Funil | Nova etapa | Reordenar | Excluir | |
| 5.3 | Card Closer | Novo card | Mover coluna | Arquivar | |
| 5.4 | Conta Pagar | Nova conta | Alterar valor | Excluir | |
| 5.5 | Conta Receber | Nova conta | Alterar valor | Excluir | |
| 5.6 | Colaborador | Novo colaborador | Alterar dados | Desativar | |
| 5.7 | Treinamento | Novo treinamento | Alterar dados | Excluir | |

---

### TC-06: Avaliação de Reação

| # | Ação | Verificar | ✅/❌ |
|---|------|-----------|------|
| 6.1 | Listar modelos | Modelos carregam | |
| 6.2 | Listar categorias | Categorias carregam | |
| 6.3 | Listar itens | Itens/perguntas carregam | |
| 6.4 | Listar opções | Opções de resposta carregam | |
| 6.5 | Link público | Formulário carrega sem login | |
| 6.6 | Enviar resposta | Resposta salva | |

---

### TC-07: Provas e Turmas

| # | Ação | Verificar | ✅/❌ |
|---|------|-----------|------|
| 7.1 | Listar turmas | Turmas carregam | |
| 7.2 | Ver colaboradores turma | Lista de colaboradores | |
| 7.3 | Ver presenças | Lista de presenças | |
| 7.4 | Prova pública | Prova carrega sem login | |
| 7.5 | Questões carregam | Questões visíveis | |
| 7.6 | Alternativas carregam | Alternativas visíveis | |
| 7.7 | Enviar prova | Resposta salva | |

---

### TC-08: Financeiro

| # | Ação | Verificar | ✅/❌ |
|---|------|-----------|------|
| 8.1 | Contas a Pagar | Lista carrega | |
| 8.2 | Contas a Receber | Lista carrega | |
| 8.3 | Financeiro Contas | Lista carrega | |
| 8.4 | Criar conta | Conta criada | |
| 8.5 | Filtrar por status | Filtro funciona | |
| 8.6 | Movimentações | Histórico carrega | |

---

## 🟢 TESTES DE PERFORMANCE

| # | Tela | Tempo Esperado | Tempo Real | ✅/❌ |
|---|------|----------------|------------|------|
| P1 | Dashboard | < 3s | | |
| P2 | Closer (muitos cards) | < 3s | | |
| P3 | Colaboradores (lista grande) | < 3s | | |
| P4 | Treinamentos | < 3s | | |
| P5 | Filtros | < 1s | | |

---

## 🚨 TESTES DE SEGURANÇA

| # | Teste | Como | Resultado Esperado | ✅/❌ |
|---|-------|------|-------------------|------|
| S1 | Isolamento SST | Login SST → verificar dados | Só vê seus clientes | |
| S2 | Isolamento Cliente | Login cliente → verificar dados | Só vê seus dados | |
| S3 | URL direta | Tentar acessar `/admin/empresa/{outro-id}` | Erro ou sem dados | |
| S4 | API direta | Chamar Supabase com outro empresa_id | Retorna vazio | |

---

## 📊 Checklist Final

### Execução Recomendada

```
[ ] 1. TESTE RÁPIDO (5 min) - Validação básica
[ ] 2. TC-01 Super Admin - Acesso total
[ ] 3. TC-02 Empresa SST - Isolamento
[ ] 4. TC-03 Cliente Final - Isolamento
[ ] 5. TC-04 Links Públicos - Formulários
[ ] 6. TC-05 CRUD - Operações básicas
[ ] 7. TC-06 Avaliação - Formulários
[ ] 8. TC-07 Provas - Fluxo completo
[ ] 9. TC-08 Financeiro - Operações
```

---

## 🔄 Rollbacks Disponíveis

Se algo falhar, execute o rollback correspondente:

| Problema | Arquivo |
|----------|---------|
| Login/RLS básico | `ROLLBACK_fase1_fase2.sql` |
| Policies empresas | `ROLLBACK_fase3.sql` |
| Super Admin | `ROLLBACK_fase4.sql` |
| View/Datas | `ROLLBACK_fase5.sql` |
| Índices FK | `ROLLBACK_fase6.sql` |
| Policies otimizadas | `ROLLBACK_fase7.sql` |
| Índices removidos | `ROLLBACK_fase8.sql` |
| Policies consolidadas | `ROLLBACK_fase9.sql` |

---

## 📝 Registro de Resultados

### Data: ___/___/______
### Testador: ________________

| Seção | Passou | Falhou | Observações |
|-------|--------|--------|-------------|
| TESTE RÁPIDO | | | |
| TC-01 Super Admin | | | |
| TC-02 Empresa SST | | | |
| TC-03 Cliente Final | | | |
| TC-04 Links Públicos | | | |
| TC-05 CRUD | | | |
| TC-06 Avaliação | | | |
| TC-07 Provas | | | |
| TC-08 Financeiro | | | |
| Performance | | | |
| Segurança | | | |

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

**Sistema APROVADO se:**
- [ ] Super Admin vê dados de TODAS empresas
- [ ] Empresa SST vê APENAS seus clientes
- [ ] Cliente Final vê APENAS seus dados
- [ ] Links públicos funcionam sem login
- [ ] CRUD básico funciona
- [ ] Performance aceitável (< 3s)
- [ ] Sem erros de permissão inesperados

---

*Documento criado em 20/01/2026 - Cobertura completa Fases 1-9*
