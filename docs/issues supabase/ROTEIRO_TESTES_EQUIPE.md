# 🧪 Roteiro de Testes - Para a Equipe

**O que foi alterado:** Correções de segurança e performance no banco de dados  
**Risco:** O sistema pode ter parado de funcionar em algumas telas  
**Objetivo:** Verificar se tudo continua funcionando normalmente

---

## ⏱️ TESTE RÁPIDO (5 minutos)

Faça estes 5 testes primeiro. Se todos passarem, o sistema está OK.

### Teste 1: Login do João
```
1. Abra o sistema: https://vertical-on.com.br (ou URL do sistema)
2. Faça login com: joao@toriq.com
3. ✅ PASSOU se: Entrou no painel /admin sem erros
4. ❌ FALHOU se: Deu erro ou não carregou
```

### Teste 2: Dashboard do Admin
```
1. Já logado como João
2. Verifique se o Dashboard carregou
3. ✅ PASSOU se: Os cards/KPIs aparecem com números
4. ❌ FALHOU se: Tela em branco ou erro
```

### Teste 3: Closer (Funil de Vendas)
```
1. Clique em: Comercial → Closer
2. Aguarde carregar
3. ✅ PASSOU se: Os cards do Closer aparecem
4. ❌ FALHOU se: Tela em branco, erro, ou "Nenhum resultado"
```

### Teste 4: Login Empresa SST
```
1. Faça logout
2. Faça login com um usuário de empresa SST (ex: usuario@empresa-sst.com)
3. ✅ PASSOU se: Entrou no painel /sst sem erros
4. ❌ FALHOU se: Deu erro ou não carregou
```

### Teste 5: Link Público de Avaliação
```
1. Abra uma JANELA ANÔNIMA (Ctrl+Shift+N)
2. Cole um link de avaliação de reação (peça para alguém)
3. ✅ PASSOU se: Formulário de avaliação carregou
4. ❌ FALHOU se: Deu erro ou não carregou
```

---

## 📋 RESULTADO DO TESTE RÁPIDO

| Teste | Passou? |
|-------|---------|
| 1. Login João | ⬜ Sim / ⬜ Não |
| 2. Dashboard Admin | ⬜ Sim / ⬜ Não |
| 3. Closer | ⬜ Sim / ⬜ Não |
| 4. Login Empresa SST | ⬜ Sim / ⬜ Não |
| 5. Link Público | ⬜ Sim / ⬜ Não |

**Se todos passaram:** ✅ Sistema OK! Pode parar aqui.  
**Se algum falhou:** ❌ Anote qual e avise o desenvolvedor.

---

## 🔍 TESTES DETALHADOS (se precisar)

Só faça estes se o teste rápido passou e quiser testar mais a fundo.

---

### 📌 TESTE A: Super Admin vê tudo

**Quem testa:** Alguém logado como `joao@toriq.com`

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|---------------------|
| A1 | Ir em Comercial → Closer | Ver cards de VÁRIAS empresas diferentes |
| A2 | Ir em Comercial → Prospecção | Ver cards de VÁRIAS empresas |
| A3 | Ir em Financeiro → Contas a Pagar | Ver contas de VÁRIAS empresas |
| A4 | Ir em Cadastros → Empresas | Ver lista de TODAS as empresas |
| A5 | Clicar em "Acessar como" em uma empresa | Entrar no painel daquela empresa |

**Resultado:**
- ⬜ Todos passaram
- ⬜ Algum falhou: _________________

---

### 📌 TESTE B: Empresa SST só vê seus dados

**Quem testa:** Alguém logado como usuário de empresa SST

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|---------------------|
| B1 | Ver Dashboard | Só aparecem dados dos SEUS clientes |
| B2 | Ver Clientes | Só aparecem SEUS clientes |
| B3 | Ver Colaboradores | Só colaboradores dos SEUS clientes |
| B4 | Ver Treinamentos | Só treinamentos dos SEUS clientes |
| B5 | Ver Contas a Pagar | Só SUAS contas |
| B6 | **IMPORTANTE:** Verificar se NÃO aparecem dados da Toriq ou outras SST | NÃO pode aparecer nada de outras empresas |

**Resultado:**
- ⬜ Todos passaram
- ⬜ Algum falhou: _________________

---

### 📌 TESTE C: Links Públicos funcionam

**Quem testa:** Qualquer pessoa em JANELA ANÔNIMA (sem login)

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|---------------------|
| C1 | Abrir link de presença `/presenca/xxx` | Formulário de presença carrega |
| C2 | Abrir link de prova `/prova/xxx` | Prova carrega com questões |
| C3 | Abrir link de avaliação | Formulário de avaliação carrega |
| C4 | Preencher e enviar uma avaliação | Mensagem de sucesso |

**Resultado:**
- ⬜ Todos passaram
- ⬜ Algum falhou: _________________

---

### 📌 TESTE D: Criar e Deletar coisas

**Quem testa:** Super Admin ou Empresa SST

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|---------------------|
| D1 | Criar um card no Closer | Card aparece na coluna |
| D2 | Mover o card para outra coluna | Card move |
| D3 | Criar uma conta a pagar | Conta aparece na lista |
| D4 | Ir em Comercial → Funis → Criar funil | Funil criado |
| D5 | Deletar o funil que criou | Funil some |

**Resultado:**
- ⬜ Todos passaram
- ⬜ Algum falhou: _________________

---

## ❌ O QUE FAZER SE ALGO FALHOU

### Passo 1: Anote o erro
```
- Qual teste falhou?
- Qual a mensagem de erro (se tiver)?
- Print da tela (se possível)
```

### Passo 2: Avise o desenvolvedor
```
Envie as informações acima para o desenvolvedor responsável.
```

### Passo 3: Aguarde correção
```
O desenvolvedor pode precisar executar um "rollback" 
para reverter as alterações e corrigir o problema.
```

---

## 📝 FORMULÁRIO DE RESULTADO

Copie e preencha:

```
RESULTADO DOS TESTES - [DATA]
Testador: [SEU NOME]

TESTE RÁPIDO:
- Login João: [PASSOU/FALHOU]
- Dashboard: [PASSOU/FALHOU]
- Closer: [PASSOU/FALHOU]
- Login SST: [PASSOU/FALHOU]
- Link Público: [PASSOU/FALHOU]

TESTES DETALHADOS (se fez):
- Teste A (Super Admin): [PASSOU/FALHOU]
- Teste B (SST): [PASSOU/FALHOU]
- Teste C (Links): [PASSOU/FALHOU]
- Teste D (CRUD): [PASSOU/FALHOU]

PROBLEMAS ENCONTRADOS:
1. 
2. 
3. 

OBSERVAÇÕES:

```

---

## ✅ PRONTO!

Se tudo passou, o sistema está funcionando normalmente após as correções de segurança e performance.

**Dúvidas?** Fale com o desenvolvedor responsável.
