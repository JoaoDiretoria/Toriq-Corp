# Aba Relatório — Tutorial de Uso

## Visão Geral

A aba **Relatório** permite visualizar, exportar e baixar os relatórios completos do treinamento. Estes relatórios são documentos oficiais enviados à empresa cliente como comprovação do treinamento realizado. Esta aba é visível apenas para perfis **Empresa SST**, **Admin Vertical** e **Cliente Final** (somente leitura). Instrutores não têm acesso.

---

## Estrutura da Tela

A aba é organizada em 3 seções principais:

### 1. Cabeçalho
- **Título** — "Relatórios da Turma"
- **Descrição** — "Visualize e exporte os relatórios completos do treinamento"
- **Badges** — Código da turma e status atual

### 2. Relatório Principal (destaque)
Card grande e destacado com informações resumidas e botão de acesso.

### 3. Relatórios Secundários (grid)
Cards menores para relatórios específicos (Presenças e Sinistros).

### 4. Relatório Validado (quando disponível)
Card verde que aparece quando o relatório foi validado e está pronto para download.

---

## Relatório Completo de Treinamento

### O que contém?
O relatório principal inclui **todas** as informações da turma:
- Dados gerais do treinamento (norma, tipo, datas, carga horária)
- Dados da empresa cliente e da empresa de SST
- Dados do instrutor e sua formação
- Lista completa de participantes com resultados
- Fotos do treinamento (galeria)
- Resultados das avaliações de reação
- Cases de sucesso
- Documentos do instrutor
- Certificados emitidos

### Cards de Resumo
O card do relatório principal exibe 4 indicadores:

| Indicador | Descrição |
|-----------|-----------|
| **Participantes** | Total de colaboradores na turma |
| **Carga Horária** | Total de horas calculado a partir das aulas |
| **Dias de Aula** | Quantidade de datas de aula programadas |
| **Aprovados** | Total de colaboradores aprovados |

### Passo a passo: Visualizar relatório completo

1. Acesse a aba **Relatório**
2. No card principal "Relatório Completo de Treinamento", clique em **"Visualizar Relatório Completo"**
3. O relatório será aberto em uma **nova aba** do navegador
4. O relatório usa o **modelo de relatório** vinculado ao treinamento
5. Navegue pelas páginas do relatório
6. Use as opções do navegador para imprimir ou salvar como PDF

---

## Relatório de Presenças

### O que contém?
Documentos comprobatórios de presença de cada colaborador:
- Foto cadastrada do colaborador
- Foto de validação facial (capturada no momento da presença)
- Assinatura digital por dia de aula
- Dados de geolocalização e dispositivo

### Informações exibidas no card
- Quantidade de colaboradores
- Quantidade de dias de aula

### Passo a passo: Visualizar relatório de presenças

1. No grid de relatórios secundários, localize o card **"Relatório de Presenças"** (ícone teal/verde-azulado)
2. Clique em **"Visualizar Presenças"**
3. O relatório será aberto em uma nova aba

---

## Relatório de Sinistros

### O que contém?
Registro detalhado de todas as ocorrências (sinistros) da turma:
- Dados do colaborador afetado
- Tipo de sinistro e descrição
- Fotos de evidência
- Instrutor responsável pelo registro
- Data e hora da ocorrência

### Estados do card

| Estado | Aparência |
|--------|-----------|
| **Com sinistros** | Card vermelho com contagem de ocorrências e botão "Visualizar Sinistros" |
| **Sem sinistros** | Card cinza com badge verde "Sem ocorrências" e mensagem positiva |

### Passo a passo: Visualizar relatório de sinistros

1. No grid de relatórios secundários, localize o card **"Relatório de Sinistros"**
2. Se houver sinistros registrados:
   - O card exibe a contagem de ocorrências e colaboradores afetados
   - Clique em **"Visualizar Sinistros"**
   - O relatório será aberto em uma nova aba
3. Se não houver sinistros:
   - O card exibe "Sem ocorrências" com ícone de check verde
   - Nenhuma ação disponível

---

## Relatório Validado

Quando o relatório é validado (processo de finalização), um card verde aparece na parte inferior da aba.

### O que significa?
O relatório validado é o **documento final oficial** que foi aprovado e está pronto para envio à empresa cliente.

### Ações disponíveis

| Botão | Ação |
|-------|------|
| **Visualizar** | Abre o PDF validado em nova aba |
| **Baixar PDF** | Faz download do arquivo PDF |

### Passo a passo: Baixar relatório validado

1. Localize o card verde **"Relatório Validado"** (aparece apenas quando disponível)
2. Clique em **"Baixar PDF"** para fazer download
3. O arquivo será salvo como `relatorio_CODIGO_TURMA.pdf`
4. Ou clique em **"Visualizar"** para abrir no navegador primeiro

---

## Modelo de Relatório

O relatório utiliza o **modelo de relatório** configurado no cadastro do treinamento (Catálogo de Treinamentos). O modelo define:
- Layout e design das páginas
- Molduras e cabeçalhos
- Variáveis dinâmicas (nome da empresa, instrutor, datas, etc.)
- Ordem e conteúdo das seções

Para alterar o modelo, acesse **Catálogo de Treinamentos > Modelos de Relatório** (componente SSTModeloRelatorio).

---

## Dicas

- O relatório completo é o documento mais importante — confira todos os dados antes de enviar ao cliente
- O relatório de presenças serve como comprovação legal da participação dos colaboradores
- Relatórios de sinistros documentam ocorrências graves para fins legais e de auditoria
- O relatório validado é o documento final — baixe e arquive para seus registros
- Todos os relatórios abrem em nova aba, permitindo imprimir ou salvar como PDF pelo navegador
