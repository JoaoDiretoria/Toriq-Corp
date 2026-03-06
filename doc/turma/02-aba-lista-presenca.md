# Aba Lista de Presença — Tutorial de Uso

## Visão Geral

A aba **Lista de Presença** é onde você gerencia os colaboradores participantes da turma, registra presenças com assinatura digital, realiza validação facial e acompanha os resultados das provas e reorientações.

---

## Estrutura da Tela

### Cabeçalho
- **Título** — "Lista de Presença" com contagem de colaboradores
- **Botão "Marcar Presença"** — Abre QR Code para marcar presença em lote
- **Botão "Adicionar"** — Abre diálogo para incluir colaboradores na turma

### Tabela Principal

A tabela exibe as seguintes colunas:

| Coluna | Descrição |
|--------|-----------|
| **#** | Número sequencial |
| **Nome** | Nome completo do colaborador |
| **CPF** | CPF formatado |
| **Assinatura por data** | Uma coluna para cada data de aula (ex: 15/01, 16/01) |
| **Pré** | Nota do pré-teste |
| **Pós** | Nota do pós-teste |
| **Resultado** | Aprovado, Reprovado ou Aguardando |
| **Reorient.** | Status da reorientação |

### Legenda (rodapé)
- **Verde com check** — Presente (assinatura + validação facial completa)
- **Amarelo com caneta** — Marcar presença hoje
- **Cinza** — Ausente
- **Média de aprovação** — 7.0

---

## Passo a Passo: Adicionar Colaboradores

Ao clicar no botão **"Adicionar"**, um diálogo é aberto com 3 métodos de cadastro:

### Método 1 — Da Empresa (lista existente)

Seleciona colaboradores que já estão cadastrados na empresa cliente. É o método mais rápido quando os colaboradores já existem no sistema.

1. Clique no botão **"Adicionar"** e selecione a aba **"Da Empresa"**
2. A lista mostra todos os colaboradores ativos da empresa cliente
3. Colaboradores que precisam do treinamento aparecem destacados em verde no topo
4. Colaboradores já na turma aparecem desabilitados
5. Use a barra de busca para filtrar por nome
6. Selecione os colaboradores desejados (checkbox)
7. Clique em **"Adicionar Selecionados"**

> **Nota:** O sistema verifica automaticamente conflitos de agenda — se o colaborador já está em outra turma com datas sobrepostas, a adição será bloqueada.

### Método 2 — QR Code (auto-cadastro pelo colaborador)

O colaborador escaneia um QR Code com o celular e preenche seus próprios dados. O instrutor revisa e aprova ou recusa a solicitação.

**Passo a passo do instrutor:**

1. Clique em **"Adicionar"** e selecione a aba **"QR Code"**
2. O sistema exibe um QR Code e um link copiável
3. Projete o QR Code na tela ou compartilhe o link com os colaboradores
4. Os colaboradores escaneiam o QR Code com o celular
5. No celular, o colaborador preenche: **Nome** e **CPF**
6. Após enviar, o colaborador aparece na seção **"Pendentes de Aprovação"** (painel amarelo)

**Aprovar ou recusar uma solicitação:**

1. Na seção **"Pendentes de Aprovação"**, clique no card do colaborador
2. Um diálogo abre mostrando os dados preenchidos (nome, CPF, data do cadastro)
3. Se o reconhecimento facial estiver ativo, adicione a foto do colaborador (selfie, câmera ou galeria) — **obrigatório** neste caso
4. Revise os dados com atenção
5. Clique em **"Aprovar"** (verde) para adicionar à turma, ou **"Recusar"** (vermelho) para rejeitar

> **Importante:** Ao aprovar, o sistema verifica se já existe um colaborador com o mesmo CPF na empresa. Se existir, vincula ao existente. Se não, cria um novo cadastro automaticamente. Também verifica conflitos de agenda com outras turmas.

**Solicitação recusada:**

Ao recusar, o registro temporário é removido. O colaborador pode escanear o QR Code novamente e reenviar a solicitação com os dados corretos. Não há limite de tentativas.

### Método 3 — Novo (cadastro manual pelo instrutor)

O instrutor preenche manualmente os dados do colaborador e o adiciona diretamente à turma. Útil quando o colaborador não está cadastrado na empresa e não tem acesso ao QR Code.

1. Clique em **"Adicionar"** e selecione a aba **"Novo"**
2. Preencha os campos obrigatórios: **Nome Completo** e **CPF**
3. Se o reconhecimento facial estiver ativo, adicione a **foto** do colaborador (clique no círculo da foto)
4. Clique em **"Cadastrar e Adicionar"**
5. O colaborador é criado na empresa cliente e adicionado à turma automaticamente

> **Nota:** Se já existir um colaborador com o mesmo CPF na empresa, o sistema vincula o existente à turma em vez de criar duplicata.

---

## Passo a Passo: Registrar Presença

### Método 1: Assinatura individual (na tela)
1. Na tabela, localize o colaborador e a data desejada
2. Clique no botão **"Assinar"** (ícone de caneta amarelo) na célula correspondente
3. O colaborador assina digitalmente na tela
4. A assinatura é salva automaticamente

### Método 2: Validação Facial + Assinatura (quando ativado)
Se a empresa cliente tem **reconhecimento facial ativado**:
1. Clique no botão **"Assinar"** na célula da data
2. O sistema abrirá a câmera para captura facial
3. Tire a foto do colaborador
4. O sistema compara com a foto cadastrada (similaridade)
5. Se autenticado, o colaborador assina digitalmente
6. São salvos: foto de validação, assinatura, localização GPS, dispositivo e horário

### Método 3: QR Code de presença em lote
1. Clique no botão **"Marcar Presença"** no cabeçalho
2. Um QR Code será exibido
3. Os colaboradores escaneiam o QR Code com seus celulares
4. Cada um registra sua presença individualmente

---

## Visualizar Detalhes da Validação

Quando um colaborador tem presença completa (foto + assinatura), a célula exibe 3 miniaturas:
- **Foto cadastrada** — Foto original do colaborador
- **Foto de validação** — Foto tirada no momento da presença
- **Assinatura** — Assinatura digital coletada

Clique na célula para ver os **detalhes completos** da validação:
- Similaridade facial (%)
- Dispositivo de captura
- Localização GPS
- Data e hora exatas

---

## Resultados das Provas (na tabela)

As colunas **Pré** e **Pós** mostram as notas dos testes:
- **Verde** — Nota ≥ 7
- **Vermelho** — Nota < 7
- **Cinza (-)** — Prova ainda não realizada

> **Importante:** O **pré-teste** serve apenas como comparativo de evolução — ele não reprova ninguém. Apenas o **pós-teste** define aprovação ou reprovação.

A coluna **Resultado** mostra:
- **Aprovado** (badge verde) — Nota pós-teste ≥ 7
- **Reprovado** (badge vermelho) — Nota pós-teste < 7 (pode refazer o pós-teste)
- **Aguardando** (badge cinza) — Pós-teste não realizado

---

## Reorientação

A reorientação aplica-se apenas ao **pós-teste** e somente para colaboradores **aprovados com nota entre 7 e 9**. O objetivo é revisar as questões que o colaborador errou, reforçando o aprendizado.

A coluna **Reorient.** indica o status de reorientação:

- **"Sim"** (verde) — Reorientação concluída. Clique para ver detalhes
- **"Pendente"** (amarelo) — Colaborador aprovado (nota 7-9) que precisa de reorientação. Clique para registrar
- **"N/A"** — Não aplicável (nota = 10, aprovado sem erros)
- **"Refazer"** (vermelho) — Reprovado (nota < 7), pode refazer o pós-teste
- **"-"** — Pós-teste ainda não realizado

### Registrar Reorientação
1. Clique em **"Pendente"** na coluna Reorient.
2. O sistema carrega as questões que o colaborador errou no pós-teste
3. Selecione as questões a serem reorientadas
4. O colaborador assina confirmando a reorientação
5. Clique em **"Salvar Reorientação"**

---

## Gerar Lista de Presença (documento)

Após todos os colaboradores terem presença registrada em todas as datas:

1. Role até o rodapé da tabela
2. Se houver pendências, elas serão listadas (ex: "Todos devem registrar presença")
3. Quando não houver pendências, o botão **"Gerar lista de presença"** ficará disponível
4. Clique no botão para gerar o documento
5. A lista será salva automaticamente na aba **Anexos**
6. Se já existir uma lista gerada, o botão mostrará **"Gerar novamente"**

---

## Dicas

- A tabela é rolável horizontalmente quando há muitas datas de aula
- Notas são coloridas automaticamente: verde (≥ 7) e vermelho (< 7)
- Colaboradores com sinistro são automaticamente reprovados independente da nota
- A validação facial requer que o colaborador tenha foto cadastrada previamente
