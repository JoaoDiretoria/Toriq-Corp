# Aba Provas e Sinistros — Tutorial de Uso

## Visão Geral

A aba **Provas e Sinistros** é dividida em duas sub-abas internas:

- **Provas** — Gestão de pré-testes (comparativo) e pós-testes (aprovação/reprovação)
- **Sinistros** — Registro de ocorrências graves que resultam em reprovação automática

---

## Sub-aba: Provas

### Estrutura da Tela

A sub-aba de Provas é dividida em duas áreas:

#### Área Esquerda: QR Code da Prova
- Exibe um **QR Code** que os colaboradores podem escanear para realizar a prova
- Botão **"Abrir Link da Prova"** — Abre o link em nova aba

#### Área Direita: Resultados das Provas
- Tabela com todos os resultados de provas realizadas
- Botões de ação: **Registrar Prova**, **Gabarito**, **Atualizar**

### Tabela de Resultados

| Coluna | Descrição |
|--------|-----------|
| **Colaborador** | Nome do colaborador |
| **Tipo** | Pré-Teste ou Pós-Teste |
| **Nota** | Nota obtida (verde ≥ 7, vermelho < 7). Apenas o pós-teste define aprovação |
| **Acertos** | Quantidade de acertos / total de questões |
| **Origem** | "QR Code" (colaborador fez sozinho) ou "Instrutor" (registrado pelo instrutor) |
| **Data** | Data e hora da realização |

### Sobre o Pré-Teste e Pós-Teste

- O **Pré-Teste** serve como **comparativo de evolução** — mede o conhecimento prévio do colaborador antes do treinamento. Não reprova ninguém.
- O **Pós-Teste** é o teste que **define aprovação ou reprovação**:
  - **Nota ≥ 7**: Aprovado
  - **Nota entre 7 e 9**: Aprovado, mas precisa de **reorientação** nas questões erradas
  - **Nota = 10**: Aprovado sem necessidade de reorientação
  - **Nota < 7**: Reprovado — o colaborador pode **refazer o pós-teste**
- Colaboradores **já aprovados** não podem refazer o pós-teste (pois já estão aprovados)

### Passo a passo: Aplicar prova via QR Code

1. Acesse a sub-aba **Provas**
2. Exiba o **QR Code** para os colaboradores (projetor, impressão, etc.)
3. Os colaboradores escaneiam com o celular
4. Cada colaborador seleciona se é **Pré-Teste** ou **Pós-Teste**
5. Responde as questões e envia
6. O resultado aparece automaticamente na tabela
7. Clique em **"Atualizar"** para recarregar os resultados

### Passo a passo: Registrar prova manualmente (pelo instrutor)

1. Clique no botão **"Registrar Prova"**
2. Selecione o **tipo de prova** (Pré-Teste ou Pós-Teste)
3. Selecione o **colaborador** (apenas os que ainda não fizeram aparecem)
4. Escolha o **modo de registro**:
   - **Todas as questões** — Responder questão por questão
   - **Apenas incorretas** — Marcar apenas as questões que o colaborador errou
5. Responda/marque as questões conforme o desempenho do colaborador
6. Clique em **"Salvar"**

### Passo a passo: Visualizar gabarito

1. Clique no botão **"Gabarito"**
2. Escolha o modo de visualização:
   - **Resumido** — Apenas número da questão e alternativa correta
   - **Completo** — Questão completa com todas as alternativas e destaque da correta
3. Visualize o gabarito completo da prova

---

## Sub-aba: Sinistros

### O que é um Sinistro?

Um sinistro é uma **ocorrência grave** registrada durante o treinamento que resulta na **reprovação automática** do colaborador, independentemente de suas notas nas provas. Exemplos: comportamento inadequado, recusa de uso de EPI, abandono do treinamento, etc.

### Estrutura da Tela

- **Cabeçalho** — Título "Sinistros Registrados" com botões de ação
- **Tabela de sinistros** — Lista de todas as ocorrências registradas
- **Badge de contagem** — Número total de sinistros na aba

### Tabela de Sinistros

| Coluna | Descrição |
|--------|-----------|
| **Colaborador** | Nome e CPF do colaborador (em vermelho) |
| **Motivo** | Tipo de sinistro (badge) |
| **Registrado por** | Nome do instrutor que registrou |
| **Data/Hora** | Data e hora do registro |
| **Ações** | Botão "Detalhes" para ver informações completas |

### Passo a passo: Registrar sinistro

1. Clique no botão **"Registrar Sinistro"** (vermelho)
2. No diálogo:
   - Selecione o **colaborador** afetado
   - Selecione o **tipo de sinistro** (lista pré-cadastrada)
   - A **ação** é preenchida automaticamente como "Reprovação"
   - Preencha a **descrição** detalhada da ocorrência
   - Opcionalmente, adicione **fotos** como evidência (com descrição e data)
3. Clique em **"Registrar Sinistro"**
4. O colaborador será automaticamente **reprovado**

### Passo a passo: Visualizar detalhes do sinistro

1. Na tabela, clique no botão **"Detalhes"** do sinistro desejado
2. O diálogo exibe:
   - Dados do colaborador
   - Tipo e descrição do sinistro
   - Fotos de evidência (se houver)
   - Instrutor responsável pelo registro
   - Data e hora completas

---

## Dicas

- O **pré-teste** é apenas comparativo — não reprova ninguém
- Apenas o **pós-teste** define aprovação ou reprovação
- Colaboradores reprovados (nota < 7) podem refazer o pós-teste
- Colaboradores já aprovados não precisam e não devem refazer o pós-teste
- O QR Code da prova pode ser compartilhado por link ou projetado em tela
- Provas registradas pelo instrutor são marcadas com badge "Instrutor" para diferenciação
- Sinistros são irreversíveis — o colaborador é reprovado automaticamente
- A contagem de sinistros aparece como badge na sub-aba para fácil identificação
- Colaboradores com sinistro não podem ter certificado emitido
