# 🧪 Roteiro de Testes Detalhado - Sistema Vertical ON

**Objetivo:** Validar o funcionamento completo do sistema após correções de segurança e performance no Supabase (Fases 1-9).

**URL do Sistema:** `https://seu-dominio.com` *(substituir pela URL real)*

---

## 📋 ÍNDICE

1. [Pré-requisitos](#pré-requisitos)
2. [Teste 1: Super Admin (joao@toriq.com)](#teste-1-super-admin)
3. [Teste 2: Empresa SST](#teste-2-empresa-sst)
4. [Teste 3: Cliente Final](#teste-3-cliente-final)
5. [Teste 4: Instrutor](#teste-4-instrutor)
6. [Teste 5: Links Públicos (Sem Login)](#teste-5-links-públicos)
7. [Teste 6: Isolamento de Dados (Segurança)](#teste-6-isolamento-de-dados)
8. [Formulário de Resultado](#formulário-de-resultado)

---

## 🔧 Pré-requisitos

Antes de iniciar os testes, você precisa de:

| Item | Descrição | Obtido? |
|------|-----------|---------|
| **Credencial Super Admin** | `joao@toriq.com` + senha | ⬜ |
| **Credencial Empresa SST** | Email de um usuário de empresa SST | ⬜ |
| **Credencial Cliente** | Email de um cliente final | ⬜ |
| **Credencial Instrutor** | Email de um instrutor | ⬜ |
| **ID de Turma ativa** | Para testar links públicos | ⬜ |
| **Navegador com DevTools** | Chrome/Firefox com F12 | ⬜ |

---

## 🔴 TESTE 1: SUPER ADMIN

**Usuário:** `joao@toriq.com`  
**Rota principal:** `/admin`  
**Tempo estimado:** 15 minutos

### 1.1 Login e Dashboard

| Passo | Ação | URL/Caminho | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------|-------------------|------|------------|
| 1.1.1 | Acessar sistema | `/auth` | Página de login carrega | | |
| 1.1.2 | Fazer login | Email + Senha | Redireciona para `/admin` | | |
| 1.1.3 | Verificar Dashboard | `/admin` | Cards/KPIs carregam com números | | |
| 1.1.4 | Verificar menu lateral | Sidebar | Todos os módulos visíveis | | |

### 1.2 Módulo Comercial (Toriq Corp)

| Passo | Ação | URL/Caminho | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------|-------------------|------|------------|
| 1.2.1 | Abrir Closer | Menu → Comercial → Closer | Kanban com cards de **múltiplas empresas** | | |
| 1.2.2 | Criar card no Closer | Botão "+ Novo" | Modal de criação abre | | |
| 1.2.3 | Preencher e salvar | Preencher campos → Salvar | Card aparece na primeira coluna | | |
| 1.2.4 | Mover card | Arrastar para outra coluna | Card muda de coluna | | |
| 1.2.5 | Abrir Prospecção | Menu → Comercial → Prospecção | Kanban com cards de **múltiplas empresas** | | |
| 1.2.6 | Abrir Cross-Selling | Menu → Comercial → Cross-Selling | Lista/Kanban carrega | | |
| 1.2.7 | Abrir Funis | Menu → Comercial → Funis | Lista de funis | | |
| 1.2.8 | Criar funil | Botão "Novo Funil" | Funil criado | | |
| 1.2.9 | Criar etapa no funil | Botão "Nova Etapa" | Etapa adicionada | | |
| 1.2.10 | Deletar etapa | Botão excluir na etapa | Etapa removida | | |
| 1.2.11 | Deletar funil | Botão excluir no funil | Funil removido | | |

### 1.3 Módulo Financeiro

| Passo | Ação | URL/Caminho | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------|-------------------|------|------------|
| 1.3.1 | Abrir Dashboard Financeiro | Menu → Financeiro → Dashboard | Gráficos e KPIs carregam | | |
| 1.3.2 | Abrir Contas a Pagar | Menu → Financeiro → Contas a Pagar | Lista de contas de **múltiplas empresas** | | |
| 1.3.3 | Criar conta a pagar | Botão "Nova Conta" | Modal abre, criar conta | | |
| 1.3.4 | Editar conta | Clicar em uma conta | Modal de edição abre | | |
| 1.3.5 | Deletar conta | Botão excluir | Conta removida | | |
| 1.3.6 | Abrir Contas a Receber | Menu → Financeiro → Contas a Receber | Lista carrega | | |
| 1.3.7 | Abrir Fluxo de Caixa | Menu → Financeiro → Fluxo de Caixa | Relatório carrega | | |
| 1.3.8 | Abrir DRE | Menu → Financeiro → DRE | Relatório carrega | | |

### 1.4 Módulo Treinamentos (Toriq Training)

| Passo | Ação | URL/Caminho | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------|-------------------|------|------------|
| 1.4.1 | Abrir Gestão de Turmas | Menu → Treinamentos → Gestão de Turmas ou `/modulos/gestao-turmas` | Lista de turmas carrega | | |
| 1.4.2 | Criar turma | Botão "Nova Turma" | Modal de criação | | |
| 1.4.3 | Abrir detalhes turma | Clicar em uma turma | `/modulos/gestao-turmas/{id}` carrega | | |
| 1.4.4 | Ver colaboradores da turma | Aba "Colaboradores" | Lista de colaboradores | | |
| 1.4.5 | Ver presenças | Aba "Presenças" | Lista de presenças | | |
| 1.4.6 | Copiar link público | Botão "Link Presença" | Link copiado | | |
| 1.4.7 | Abrir Avaliação de Reação | Menu → Avaliação de Reação ou `/modulos/avaliacao-reacao` | Tela carrega | | |
| 1.4.8 | Ver modelos | Lista de modelos | Modelos aparecem | | |
| 1.4.9 | Ver categorias | Expandir modelo | Categorias aparecem | | |
| 1.4.10 | Ver itens/perguntas | Expandir categoria | Perguntas aparecem | | |
| 1.4.11 | Abrir Provas | Menu → Provas | Lista de provas | | |
| 1.4.12 | Abrir Instrutores | Menu → Instrutores | Lista de instrutores | | |

### 1.5 Módulo EPI (Toriq EPI)

| Passo | Ação | URL/Caminho | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------|-------------------|------|------------|
| 1.5.1 | Abrir Dashboard EPI | Menu → EPI → Dashboard | Dashboard carrega | | |
| 1.5.2 | Abrir Catálogo | Menu → EPI → Cadastro de EPI | Lista de EPIs | | |
| 1.5.3 | Abrir Estoque | Menu → EPI → Estoque | Lista de estoque | | |
| 1.5.4 | Abrir Entregas | Menu → EPI → Entregas | Lista de entregas | | |
| 1.5.5 | Abrir Devoluções | Menu → EPI → Devoluções | Lista de devoluções | | |

### 1.6 Cadastros Gerais

| Passo | Ação | URL/Caminho | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------|-------------------|------|------------|
| 1.6.1 | Abrir Empresas | Menu → Cadastros → Empresas | Lista de **TODAS** as empresas | | |
| 1.6.2 | Abrir uma empresa | Clicar em empresa | Detalhes da empresa | | |
| 1.6.3 | "Acessar como" empresa | Botão "Acessar como" | Muda para contexto da empresa | | |
| 1.6.4 | Voltar ao admin | Botão "Voltar ao Admin" | Retorna para `/admin` | | |
| 1.6.5 | Abrir Usuários | Menu → Cadastros → Usuários | Lista de **TODOS** usuários | | |
| 1.6.6 | Abrir Colaboradores | Menu → Cadastros → Colaboradores | Lista de colaboradores | | |

---

## 🟠 TESTE 2: EMPRESA SST

**Usuário:** *(email de usuário de empresa SST)*  
**Rota principal:** `/sst`  
**Tempo estimado:** 10 minutos

### 2.1 Login e Dashboard

| Passo | Ação | URL/Caminho | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------|-------------------|------|------------|
| 2.1.1 | Fazer logout | Botão logout | Volta para `/auth` | | |
| 2.1.2 | Login como SST | Email + Senha | Redireciona para `/sst` | | |
| 2.1.3 | Verificar Dashboard | `/sst` | KPIs carregam (apenas seus dados) | | |

### 2.2 Validar Isolamento de Dados

| Passo | Ação | O que verificar | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-----------------|-------------------|------|------------|
| 2.2.1 | Abrir Clientes | Menu → Clientes | Aparecem **APENAS seus clientes** | | |
| 2.2.2 | Contar clientes | Comparar com BD | Número bate com esperado | | |
| 2.2.3 | Abrir Colaboradores | Menu → Colaboradores | **APENAS** colaboradores dos seus clientes | | |
| 2.2.4 | Abrir Turmas | Menu → Turmas | **APENAS** turmas dos seus clientes | | |
| 2.2.5 | Abrir Contas a Pagar | Menu → Financeiro | **APENAS** suas contas | | |
| 2.2.6 | ⚠️ **VERIFICAR** | Qualquer tela | **NÃO** aparecem dados da Toriq | | |
| 2.2.7 | ⚠️ **VERIFICAR** | Qualquer tela | **NÃO** aparecem dados de outras SST | | |

### 2.3 Operações CRUD

| Passo | Ação | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------------|------|------------|
| 2.3.1 | Criar colaborador | Novo colaborador criado | | |
| 2.3.2 | Editar colaborador | Dados atualizados | | |
| 2.3.3 | Criar turma | Nova turma criada | | |
| 2.3.4 | Adicionar colaborador à turma | Colaborador vinculado | | |

---

## 🟡 TESTE 3: CLIENTE FINAL

**Usuário:** *(email de cliente final)*  
**Rota principal:** `/cliente`  
**Tempo estimado:** 8 minutos

### 3.1 Login e Dashboard

| Passo | Ação | URL/Caminho | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------|-------------------|------|------------|
| 3.1.1 | Fazer logout | Botão logout | Volta para `/auth` | | |
| 3.1.2 | Login como Cliente | Email + Senha | Redireciona para `/cliente` | | |
| 3.1.3 | Verificar Dashboard | `/cliente` | KPIs carregam | | |

### 3.2 Validar Isolamento de Dados

| Passo | Ação | O que verificar | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-----------------|-------------------|------|------------|
| 3.2.1 | Abrir Colaboradores | Menu → Colaboradores | **APENAS** seus colaboradores | | |
| 3.2.2 | Abrir Treinamentos | Menu → Treinamentos | **APENAS** seus treinamentos | | |
| 3.2.3 | Abrir EPIs | Menu → EPIs | **APENAS** suas entregas | | |
| 3.2.4 | ⚠️ **VERIFICAR** | Qualquer tela | **NÃO** vê dados de outras empresas | | |

### 3.3 Visualizar Turma

| Passo | Ação | URL/Caminho | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------|-------------------|------|------------|
| 3.3.1 | Abrir turma | `/cliente/turma/{turmaId}` | Detalhes da turma carregam | | |
| 3.3.2 | Ver colaboradores | Aba colaboradores | Lista de colaboradores da turma | | |

---

## 🟢 TESTE 4: INSTRUTOR

**Usuário:** *(email de instrutor)*  
**Rota principal:** `/instrutor`  
**Tempo estimado:** 5 minutos

| Passo | Ação | URL/Caminho | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-------------|-------------------|------|------------|
| 4.1 | Login como Instrutor | Email + Senha | Redireciona para `/instrutor` | | |
| 4.2 | Ver turmas | Dashboard | Lista de turmas atribuídas | | |
| 4.3 | Abrir turma | `/instrutor/turma/{turmaId}` | Detalhes da turma | | |
| 4.4 | Marcar presença | Botão presença | Presença registrada | | |
| 4.5 | Ver colaboradores | Aba colaboradores | Lista carrega | | |

---

## 🔵 TESTE 5: LINKS PÚBLICOS (SEM LOGIN)

**⚠️ IMPORTANTE:** Testar em **JANELA ANÔNIMA** (Ctrl+Shift+N)

### 5.1 Link de Presença

| Passo | Ação | URL | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-----|-------------------|------|------------|
| 5.1.1 | Abrir link | `/presenca-turma/{turmaId}` | Página carrega SEM login | | |
| 5.1.2 | Ver formulário | - | Campos de presença visíveis | | |
| 5.1.3 | Preencher dados | Nome, CPF, etc | Campos aceitam entrada | | |
| 5.1.4 | Enviar presença | Botão Enviar | Mensagem de sucesso | | |

### 5.2 Link de Prova

| Passo | Ação | URL | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-----|-------------------|------|------------|
| 5.2.1 | Abrir link | `/prova-turma/{turmaId}` | Página carrega SEM login | | |
| 5.2.2 | Ver questões | - | Questões visíveis | | |
| 5.2.3 | Ver alternativas | - | Alternativas visíveis | | |
| 5.2.4 | Responder prova | Selecionar respostas | Respostas marcadas | | |
| 5.2.5 | Enviar prova | Botão Enviar | Mensagem de sucesso | | |

### 5.3 Link de Cadastro na Turma

| Passo | Ação | URL | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-----|-------------------|------|------------|
| 5.3.1 | Abrir link | `/cadastro-turma/{turmaId}` | Página carrega SEM login | | |
| 5.3.2 | Ver formulário | - | Campos de cadastro visíveis | | |
| 5.3.3 | Preencher dados | Nome, CPF, etc | Campos aceitam entrada | | |
| 5.3.4 | Enviar cadastro | Botão Enviar | Mensagem de sucesso | | |

### 5.4 Link de Cadastro de Instrutor

| Passo | Ação | URL | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-----|-------------------|------|------------|
| 5.4.1 | Abrir link | `/cadastro-instrutor/{token}` | Página carrega SEM login | | |
| 5.4.2 | Ver formulário | - | Campos visíveis | | |

### 5.5 Link de Proposta

| Passo | Ação | URL | Resultado Esperado | ✅/❌ | Observação |
|-------|------|-----|-------------------|------|------------|
| 5.5.1 | Abrir link | `/proposta/{propostaId}` | Página carrega SEM login | | |
| 5.5.2 | Ver proposta | - | Conteúdo da proposta visível | | |

---

## 🛡️ TESTE 6: ISOLAMENTO DE DADOS (SEGURANÇA)

Este teste valida que as correções de segurança (RLS) estão funcionando.

### 6.1 Teste de Isolamento via Console (DevTools)

**Como fazer:**
1. Abra o DevTools (F12)
2. Vá na aba "Console"
3. Execute os comandos abaixo

```javascript
// Obter cliente Supabase
const supabase = window.__SUPABASE_CLIENT__ || window.supabase;

// Tentar buscar dados de OUTRA empresa (substitua pelo ID real)
const outraEmpresaId = 'ID_DE_OUTRA_EMPRESA_AQUI';

// Teste 1: Buscar colaboradores de outra empresa
const { data: colabs, error: e1 } = await supabase
  .from('colaboradores')
  .select('*')
  .eq('empresa_id', outraEmpresaId)
  .limit(5);

console.log('Colaboradores de outra empresa:', colabs);
// ESPERADO: Array vazio [] ou erro de permissão
```

### 6.2 Checklist de Segurança

| Teste | Login como | Tentar acessar | Resultado Esperado | ✅/❌ |
|-------|-----------|----------------|-------------------|------|
| 6.2.1 | Empresa SST | Dados da Toriq | Array vazio ou erro | |
| 6.2.2 | Empresa SST | Dados de outra SST | Array vazio ou erro | |
| 6.2.3 | Cliente Final | Dados de outro cliente | Array vazio ou erro | |
| 6.2.4 | Cliente Final | Dados da SST | Array vazio ou erro | |
| 6.2.5 | Não logado | Qualquer dado | Erro de autenticação | |

---

## 📊 TESTE DE PERFORMANCE

| Tela | Tempo Máximo Aceitável | Tempo Real | ✅/❌ |
|------|------------------------|------------|------|
| Dashboard Admin | 3 segundos | | |
| Closer (Kanban) | 3 segundos | | |
| Lista de Colaboradores | 3 segundos | | |
| Gestão de Turmas | 3 segundos | | |
| Contas a Pagar | 3 segundos | | |
| Filtros/Buscas | 1 segundo | | |

**Como medir:**
1. Abra DevTools (F12) → Aba "Network"
2. Recarregue a página (Ctrl+Shift+R)
3. Veja o tempo total no rodapé

---

## ❌ O QUE FAZER SE ALGO FALHOU

### Passo 1: Documentar o Erro

```
ERRO ENCONTRADO:
- Teste: [Ex: 1.2.1 - Abrir Closer]
- O que aconteceu: [Descrever]
- Mensagem de erro: [Copiar se houver]
- Console (F12): [Copiar erros em vermelho]
- Screenshot: [Anexar se possível]
```

### Passo 2: Verificar Console do Navegador

1. Pressione F12
2. Vá na aba "Console"
3. Procure mensagens em **vermelho**
4. Copie as mensagens de erro

### Passo 3: Classificar o Erro

| Tipo | Descrição | Prioridade |
|------|-----------|------------|
| **Bloqueante** | Não consegue fazer login ou acessar telas | 🔴 CRÍTICO |
| **Funcional** | Funcionalidade não funciona | 🟠 ALTO |
| **Visual** | Tela carrega mas layout errado | 🟡 MÉDIO |
| **Performance** | Demora mais que 5 segundos | 🟢 BAIXO |

### Passo 4: Comunicar

Envie para o desenvolvedor:
- Tipo do erro
- Teste que falhou
- Evidências (screenshot, console)

---

## 📝 FORMULÁRIO DE RESULTADO

```
═══════════════════════════════════════════════════════════
              RESULTADO DOS TESTES - VERTICAL ON
═══════════════════════════════════════════════════════════

📅 Data: ___/___/______
👤 Testador: _______________________
🌐 Ambiente: [ ] Produção  [ ] Homologação

───────────────────────────────────────────────────────────
                      RESUMO GERAL
───────────────────────────────────────────────────────────

| Teste                    | Passou | Falhou | Bloqueado |
|--------------------------|--------|--------|-----------|
| 1. Super Admin           |   /    |   /    |     /     |
| 2. Empresa SST           |   /    |   /    |     /     |
| 3. Cliente Final         |   /    |   /    |     /     |
| 4. Instrutor             |   /    |   /    |     /     |
| 5. Links Públicos        |   /    |   /    |     /     |
| 6. Segurança/Isolamento  |   /    |   /    |     /     |
| 7. Performance           |   /    |   /    |     /     |

───────────────────────────────────────────────────────────
                    PROBLEMAS ENCONTRADOS
───────────────────────────────────────────────────────────

🔴 CRÍTICOS (Bloqueantes):
1. 
2. 

🟠 ALTOS (Funcionais):
1. 
2. 

🟡 MÉDIOS (Visuais):
1. 
2. 

───────────────────────────────────────────────────────────
                      OBSERVAÇÕES
───────────────────────────────────────────────────────────



───────────────────────────────────────────────────────────
                       APROVAÇÃO
───────────────────────────────────────────────────────────

[ ] ✅ APROVADO - Sistema funcionando corretamente
[ ] ⚠️ APROVADO COM RESSALVAS - Funciona, mas com problemas menores
[ ] ❌ REPROVADO - Problemas críticos encontrados

Assinatura: _______________________

═══════════════════════════════════════════════════════════
```

---

## 🔄 ROLLBACKS DISPONÍVEIS

Se precisar reverter alguma alteração:

| Se o problema for em... | Execute o rollback |
|-------------------------|-------------------|
| Login/Autenticação | `ROLLBACK_fase1_fase2.sql` |
| Policies de empresas | `ROLLBACK_fase3.sql` |
| Super Admin não vê tudo | `ROLLBACK_fase4.sql` |
| Views/Datas treinamentos | `ROLLBACK_fase5.sql` |
| Performance muito lenta | `ROLLBACK_fase6.sql` a `ROLLBACK_fase9.sql` |

---

## ✅ CRITÉRIOS DE APROVAÇÃO

O sistema está **APROVADO** se:

- [ ] Super Admin consegue acessar dados de **TODAS** as empresas
- [ ] Empresa SST vê **APENAS** dados dos seus clientes
- [ ] Cliente Final vê **APENAS** seus próprios dados
- [ ] Instrutor vê **APENAS** suas turmas
- [ ] **Todos** os links públicos funcionam sem login
- [ ] **Nenhum** vazamento de dados entre empresas
- [ ] Performance aceitável (< 3 segundos por tela)
- [ ] **Zero** erros bloqueantes

---

*Documento criado em 20/01/2026 - Versão 2.0*
*Cobertura: Fases 1-9 do Supabase*
