# Sistema de Relatórios de Treinamento - Documentação

## 📋 Visão Geral

Sistema completo para geração de relatórios profissionais de turmas de treinamento. Design moderno, limpo e profissional com paleta de cores neutras (slate/gray) e tipografia consistente.

## 🎨 Design System

### Paleta de Cores
- **Primária**: `#1e293b` (slate-800) - Headers e textos principais
- **Secundária**: `#64748b` (slate-500) - Textos secundários e labels
- **Fundo**: `#f8fafc` (slate-50) - Cards e áreas de destaque
- **Bordas**: `#e2e8f0` (slate-200) - Separadores e bordas
- **Azul**: `#3b82f6` - Pré-teste e destaques
- **Verde**: `#22c55e` - Pós-teste e aprovações
- **Âmbar**: `#f59e0b` - Estatísticas e alertas

### Tipografia
- **Fonte**: Segoe UI, system-ui, sans-serif
- **Títulos**: 24px, weight 600
- **Labels**: 10px, uppercase, letter-spacing 0.5px
- **Corpo**: 14px, weight 500

### Componentes Reutilizáveis
- **Header**: Logo + código da turma/norma (fundo slate-800)
- **Título da página**: H2 + subtítulo descritivo
- **Cards**: Fundo slate-50, borda slate-200, border-radius 8px
- **Tabelas**: Header slate-100, linhas alternadas
- **Rodapé**: Nome empresa + endereço + paginação

## 📄 Páginas do Relatório

### 1. Capa
- Logo centralizada
- Título "Relatório de Treinamento" com linha decorativa azul
- Informações: Treinamento, Norma, Empresa Cliente
- Grid 2x2: Turma, Data, Carga Horária, Participantes

### 2. Empresa SST
- Dados da empresa prestadora de serviços
- Logo e endereço
- Diretor Técnico (nome, formação, registro)
- Cards de Missão, Visão e Valores com bordas coloridas

### 3. Cliente/Empresa
- Informações da empresa contratante do treinamento
- Razão Social / Nome
- Endereço completo
- Cidade e Estado (em grid 2 colunas)
- Exibe "Não informado" quando dados não disponíveis

### 4. Treinamento
- Nome do treinamento, norma regulamentadora, carga horária
- Conteúdo programático em grid 2 colunas com bullets

### 5. Turma e Instrutor
- Grid 2 colunas:
  - **Turma**: Código, tipo, período, local, total participantes
  - **Instrutor**: Nome, formação acadêmica, formações específicas
- Lista de colaboradores participantes em grid 3 colunas

### 6. Lista de Presença
- Tabela profissional com header slate
- Colunas: #, Nome, CPF, Assinatura por data
- Exibe assinaturas digitais anexadas (imagens)
- Campos com borda verde quando assinado, cinza quando vazio

### 7. Avaliações
- Gráfico de barras comparativo (Pré x Pós)
- Cards de estatísticas com bordas coloridas
- Tabela de notas: #, Colaborador, CPF, Pré-Teste, Pós-Teste
- Indicador de evolução percentual

### 8. Registro Fotográfico
- 1 foto por página
- Imagem em card com borda suave
- Legenda opcional

### 9. Certificados (Frente)
- Layout horizontal A4 (1123x794px)
- Moldura dupla (laranja externa, cinza interna)
- Título "CERTIFICADO" em fonte serifada
- Dados do colaborador, treinamento, datas
- 2 assinaturas: Diretor Técnico e Instrutor

### 10. Certificados (Verso)
- Conteúdo programático detalhado
- Informações complementares

### 11. Diplomas do Instrutor
- Formações vinculadas ao treinamento
- Anexos de formação e treinamento

## 🏷️ Variáveis Disponíveis para Certificados

### Logo e Assinaturas
- `{LOGO_EMPRESA}` - Logo pequena da empresa (cadastrada em Informações Empresa > Imagens)
- `{ASSINATURAS}` - Bloco de assinaturas (Diretor Técnico + Instrutor) com dados reais

### Colaborador
- `{COLABORADOR_NOME}` - Nome do colaborador
- `{COLABORADOR_CPF}` - CPF do colaborador
- `{COLABORADOR_EMPRESA}` - Nome da empresa do colaborador
- `{COLABORADOR_LOCAL}` - Endereço da empresa do colaborador

### Treinamento
- `{TREINAMENTO_NOME}` - Nome do treinamento
- `{TREINAMENTO_NR}` - Norma regulamentadora
- `{TREINAMENTO_CH}` - Carga horária
- `{TREINAMENTO_DATA}` - Data de realização
- `{TREINAMENTO_CP}` - Conteúdo programático
- `{TREINAMENTO_VALIDADE}` - Data de validade

### Outros
- `{INSTRUTOR_NOME}` - Nome do instrutor
- `{DATA_ATUAL}` - Data atual
- `{QRCODE_VALIDACAO}` - QR Code para validação

## 🏷️ Placeholders Legados (Relatórios)

### Empresa
- `{{EMPRESA_NOME}}`, `{{EMPRESA_CNPJ}}`, `{{EMPRESA_ENDERECO}}`
- `{{EMPRESA_TELEFONE}}`, `{{EMPRESA_EMAIL}}`, `{{LOGO_EMPRESA}}`
- `{{EMPRESA_MISSAO}}`, `{{EMPRESA_VISAO}}`, `{{EMPRESA_VALORES}}`

### Treinamento
- `{{TREINAMENTO_NOME}}`, `{{TREINAMENTO_NR}}`, `{{CARGA_HORARIA}}`
- `{{TREINAMENTO_OBJETIVO}}`, `{{TREINAMENTO_CONTEUDO_PROGRAMATICO}}`

### Turma
- `{{CODIGO_TURMA}}`, `{{DATA_INICIO}}`, `{{DATA_FIM}}`
- `{{LOCAL_TREINAMENTO}}`, `{{TOTAL_PARTICIPANTES}}`

### Instrutor
- `{{INSTRUTOR_NOME}}`, `{{INSTRUTOR_FORMACAO}}`, `{{INSTRUTOR_REGISTRO}}`

### Avaliações
- `{{MEDIA_PRE_TESTE}}`, `{{MEDIA_POS_TESTE}}`, `{{TAXA_APROVACAO}}`

### Tabelas Dinâmicas
- `{{LISTA_PRESENCA}}`, `{{RESULTADOS_AVALIACOES}}`
- `{{LISTA_CERTIFICADOS}}`, `{{FOTOS_TREINAMENTO}}`

## 📁 Arquivos do Sistema

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/relatorio/VisualizarRelatorio.tsx` | Componente principal com todas as páginas |
| `src/pages/modulos/GerenciarTurma.tsx` | Aba "Relatório" para acessar |

## 🗄️ Tabelas Utilizadas

| Tabela | Dados |
|--------|-------|
| `turmas_treinamento` | Dados da turma |
| `turmas_treinamento_aulas` | Datas das aulas |
| `turma_colaboradores` | Colaboradores da turma + notas |
| `catalogo_treinamentos` | Nome, norma, carga horária |
| `clientes_sst` | Cliente do treinamento |
| `instrutores` | Dados do instrutor |
| `empresas` | Empresa SST (logo, endereço) |
| `informacoes_empresa` | Missão, visão, valores |
| `turma_provas` | Notas pré/pós-teste |
| `turma_anexos` | Fotos e documentos |

## 🚀 Rotas

| Rota | Descrição |
|------|-----------|
| `/relatorio/visualizar?turmaId=xxx` | Visualizar relatório da turma |
| `/modulos/gestao-turmas/:turmaId` (aba Relatório) | Acesso via turma |

## 💡 Funcionalidades

- ✅ **8 abas separadas** com layouts profissionais
- ✅ **Busca automática** de dados do banco (turma, empresa, colaboradores, provas, fotos, instrutor)
- ✅ **Gráficos dinâmicos** com Recharts (evolução pré/pós teste)
- ✅ **Estatísticas calculadas** (médias, taxa de aprovação, evolução)
- ✅ **Exportação para PDF** com compressão
- ✅ **Impressão direta** com quebras de página
- ✅ **Preview visual** no navegador
- ✅ **Aba "Relatório"** integrada na gestão de turmas
- ✅ **Certificados individuais** gerados automaticamente
- ✅ **1 foto por página** para melhor visualização

## 🔍 Queries do Banco de Dados

O sistema busca dados de:
- `turmas_treinamento` → Dados da turma
- `catalogo_treinamentos` → Info do treinamento
- `instrutores` → Dados do instrutor
- `clientes_sst` → Cliente da turma
- `empresas` → Empresa SST prestadora
- `informacoes_empresa` → Missão, visão, valores
- `turma_colaboradores` → Participantes e notas
- `instrutor_formacoes_certificado` → Formações do instrutor
- `instrutor_formacao_treinamentos` → Vínculo formação-treinamento
- `colaboradores` → Dados dos colaboradores
- `turma_provas` → Notas pré/pós teste
- `turma_anexos` → Fotos e documentos
