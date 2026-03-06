# Módulo Toriq EPI - Documentação Detalhada das Páginas

## Índice

1. [Dashboard](#1-dashboard)
2. [Catálogo de EPIs](#2-catálogo-de-epis)
3. [Estoque de EPIs](#3-estoque-de-epis)
4. [Entregas de EPIs](#4-entregas-de-epis)
5. [Ficha de EPI](#5-ficha-de-epi)
6. [Devoluções](#6-devoluções)
7. [Relatórios](#7-relatórios)

---

## 1. Dashboard

**Arquivo**: `ToriqEPIDashboard.tsx`

### Descrição
Tela inicial do módulo que apresenta uma visão geral consolidada de todos os indicadores de EPIs da empresa.

### Componentes Visuais

#### KPIs (Cards de Indicadores)
| Indicador | Descrição | Ícone |
|-----------|-----------|-------|
| Total de EPIs | Quantidade de itens cadastrados no catálogo | Package |
| Entregas do Mês | Quantidade de EPIs entregues no mês atual | Users |
| Estoque Baixo | Itens com quantidade abaixo do mínimo | AlertTriangle (amarelo) |
| Vencendo | EPIs próximos da data de vencimento | Clock (laranja) |

#### Seção de Alertas
- Exibe alertas que requerem atenção imediata
- Mostra ícone verde de "OK" quando não há alertas

#### Resumo do Período (Últimos 30 dias)
- **Entregas**: Total de entregas realizadas
- **Devoluções**: Total de devoluções registradas
- **Baixas**: Total de baixas de estoque

### Funcionalidades
- Visualização rápida do status geral do módulo
- Identificação de itens que requerem ação

---

## 2. Catálogo de EPIs

**Arquivo**: `ToriqEPICatalogo.tsx`

### Descrição
Gerenciamento do catálogo de EPIs disponíveis para a empresa. Permite cadastrar, editar, excluir e importar/exportar EPIs.

### Componentes Visuais

#### Header
- Título: "Catálogo de EPIs"
- Descrição: "Gerencie os EPIs disponíveis para sua empresa"
- Campo de busca
- Botões: Exportar CSV, Importar CSV, Novo EPI

#### Tabela de EPIs
| Coluna | Descrição |
|--------|-----------|
| Nome/Modelo | Nome do EPI |
| Categoria | Categoria de proteção (A-I) |
| Tipo | Tipo específico do EPI |
| Fabricante | Nome do fabricante |
| CA | Número do Certificado de Aprovação |
| Validade CA | Data de validade do CA |
| Status | Ativo/Inativo |
| Ações | Editar, Excluir |

### Formulário de Cadastro/Edição

#### Campos do Formulário
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Nome/Modelo | Input texto | Sim | Nome identificador do EPI |
| Categoria de Proteção | Select | Sim | Categoria A-I conforme NR-6 |
| Tipo de EPI | Select | Sim | Tipo específico (depende da categoria) |
| Fabricante | Input texto | Não | Nome do fabricante |
| Número do CA | Input texto | Não | Certificado de Aprovação |
| Validade do CA | Date picker | Não | Data de validade do CA |
| Descrição | Textarea | Não | Descrição adicional |

### Categorias de Proteção
O sistema implementa as 9 categorias da NR-6:
- **A**: Proteção da Cabeça
- **B**: Proteção dos Olhos e Face
- **C**: Proteção Auditiva
- **D**: Proteção Respiratória
- **E**: Proteção do Tronco
- **F**: Proteção dos Membros Superiores
- **G**: Proteção dos Membros Inferiores
- **H**: Proteção do Corpo Inteiro
- **I**: Proteção Contra Quedas

### Funcionalidades
- **CRUD completo**: Criar, ler, atualizar e excluir EPIs
- **Busca**: Filtro por nome, fabricante ou CA
- **Importação CSV**: Importar EPIs em lote (delimitador: pipe `|`)
- **Exportação CSV**: Exportar catálogo completo
- **Validação**: Campos obrigatórios e formato de dados

---

## 3. Estoque de EPIs

**Arquivo**: `ToriqEPIEstoque.tsx`

### Descrição
Controle completo do estoque de EPIs, incluindo entradas, movimentações e controle de validade.

### Componentes Visuais

#### Header
- Título: "Estoque de EPIs"
- Descrição: "Controle de estoque e movimentações"
- Campo de busca
- Botão: "Entrada de Estoque"

#### Tabela de Posição de Estoque
| Coluna | Descrição |
|--------|-----------|
| EPI | Nome do EPI (com link para catálogo) |
| CA | Número do CA |
| Lote | Código do lote (se aplicável) |
| Qtd. Inicial | Quantidade de entrada |
| Qtd. Atual | Quantidade disponível |
| Localização | Local físico de armazenamento |
| Recebimento | Data de recebimento |
| Validade | Data de validade prioritária + ícone info |
| Status | OK, Vencido ou Próx. Venc. |
| Ações | Editar, Excluir |

### Formulário de Entrada de Estoque

#### Abas de Tipo de Entrada
- **Individual**: Entrada de item único
- **Lote**: Entrada de múltiplos itens do mesmo lote

#### Campos do Formulário (Aba Individual)
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| EPI | Select | Sim | Seleção do EPI cadastrado |
| Quantidade | Input número | Sim | Quantidade de entrada |
| Qtd. Atual | Input número | Apenas edição | Quantidade atual (editável) |
| Localização | Input texto | Não | Local de armazenamento |
| Recebimento | Date picker | Não | Data de recebimento |
| Validade do CA | Date picker | Não | Validade do CA |
| Validade Fabricante | Date picker | Não | Validade do fabricante |
| Validade Operacional | Date picker | Não | Validade periódica |
| Bloquear Vencido | Select | Sim | Sim/Não |

#### Campos Adicionais (Aba Lote)
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Código do Lote | Input texto | Não | Identificador do lote |

### Lógica de Validade Prioritária
A coluna "Validade" exibe a data seguindo prioridade:
1. **Validade do Fabricante** (maior prioridade)
2. **Validade do CA**
3. **Validade Operacional** (menor prioridade)

Um ícone de informação (ℹ️) ao lado da data indica qual tipo de validade está sendo exibida via tooltip.

### Status de Validade
| Status | Cor | Condição |
|--------|-----|----------|
| OK | Verde | Validade > 30 dias |
| Próx. Venc. | Amarelo | Validade ≤ 30 dias |
| Vencido | Vermelho | Validade < hoje |

### Funcionalidades
- **Entrada individual ou por lote**
- **Edição de quantidade atual** (para ajustes de inventário)
- **Controle de múltiplas validades**
- **Alertas visuais** de vencimento
- **Busca** por EPI, lote ou localização

---

## 4. Entregas de EPIs

**Arquivo**: `ToriqEPIEntregas.tsx`

### Descrição
Registro de entregas de EPIs aos colaboradores da empresa.

### Componentes Visuais

#### Header
- Título: "Entregas de EPIs"
- Descrição: "Registro de entregas de EPIs aos colaboradores"
- Campo de busca
- Botão: "Nova Entrega"

#### Tabela de Histórico
| Coluna | Descrição |
|--------|-----------|
| Colaborador | Nome do colaborador |
| EPI | Nome do EPI entregue |
| Quantidade | Quantidade entregue |
| Data Entrega | Data da entrega |
| Motivo | Motivo da entrega |
| Responsável | Quem realizou a entrega |
| Ações | Visualizar, Imprimir termo |

### Funcionalidades (Planejadas)
- Registro de nova entrega
- Seleção de colaborador
- Seleção de EPI do estoque
- Geração de termo de responsabilidade
- Baixa automática do estoque

---

## 5. Ficha de EPI

**Arquivo**: `ToriqEPIFicha.tsx`

### Descrição
Ficha individual de controle de EPIs por colaborador, contendo todo o histórico de EPIs recebidos.

### Componentes Visuais

#### Header
- Título: "Ficha de EPI"
- Descrição: "Ficha individual de controle de EPIs por colaborador"
- Campo de busca por colaborador
- Botão: "Imprimir Ficha"

#### Seleção de Colaborador
- Lista de colaboradores da empresa
- Busca por nome ou matrícula

#### Ficha do Colaborador
- Dados do colaborador (nome, cargo, setor)
- Histórico de EPIs recebidos
- Status de cada EPI (em uso, devolvido, baixado)

### Funcionalidades (Planejadas)
- Visualização completa do histórico
- Impressão da ficha para assinatura
- Filtro por período
- Exportação em PDF

---

## 6. Devoluções

**Arquivo**: `ToriqEPIDevolucoes.tsx`

### Descrição
Registro de devoluções e baixas de EPIs.

### Componentes Visuais

#### Header
- Título: "Devoluções de EPIs"
- Descrição: "Registro de devoluções e baixas de EPIs"
- Campo de busca
- Botão: "Registrar Devolução"

#### Tabela de Histórico
| Coluna | Descrição |
|--------|-----------|
| Colaborador | Nome do colaborador |
| EPI | Nome do EPI devolvido |
| Data Devolução | Data da devolução |
| Motivo | Motivo da devolução |
| Condição | Estado do EPI |
| Destino | Reintegrado ou baixado |
| Ações | Visualizar |

### Motivos de Devolução
- Fim do contrato
- Troca por desgaste
- Troca por tamanho
- Desligamento
- Outros

### Funcionalidades (Planejadas)
- Registro de devolução
- Avaliação da condição do EPI
- Reintegração ao estoque (se em boas condições)
- Baixa definitiva (se danificado/vencido)

---

## 7. Relatórios

**Arquivo**: `ToriqEPIRelatorios.tsx`

### Descrição
Central de relatórios do módulo de EPIs.

### Relatórios Disponíveis

| Relatório | Descrição | Ícone |
|-----------|-----------|-------|
| Posição de Estoque | Relatório completo do estoque atual | Package |
| Entregas por Colaborador | Histórico de entregas por colaborador | Users |
| Fichas de EPI | Fichas individuais para impressão | FileText |
| Consumo Mensal | Análise de consumo por período | TrendingUp |
| EPIs Vencidos/Vencendo | Lista de EPIs próximos do vencimento | Package |
| Termo de Responsabilidade | Modelo de termo para assinatura | FileText |

### Funcionalidades
- Geração de relatórios em PDF
- Filtros por período, colaborador, EPI
- Exportação de dados
- Impressão direta

---

## Componentes Compartilhados

### UI Components Utilizados
- `Card`, `CardHeader`, `CardContent` - Containers
- `Button` - Botões de ação
- `Input`, `Label` - Campos de formulário
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` - Dropdowns
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` - Tabelas
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter` - Modais
- `AlertDialog` - Confirmações
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` - Abas
- `Popover`, `PopoverTrigger`, `PopoverContent` - Popovers
- `Calendar` - Seletor de data
- `Badge` - Etiquetas de status
- `Tooltip` - Dicas de contexto

### Hooks Utilizados
- `useState`, `useEffect` - Estado e efeitos
- `useToast` - Notificações
- `useAuth` - Autenticação
- `useEmpresaMode` - Contexto da empresa

### Integrações
- `supabase` - Cliente do Supabase para operações de banco

---

## Fluxo de Navegação

```
┌─────────────────────────────────────────────────────────────┐
│                      SSTSidebar                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Toriq EPI                                               ││
│  │  ├── Dashboard ────────► ToriqEPIDashboard              ││
│  │  ├── Catálogo ─────────► ToriqEPICatalogo               ││
│  │  ├── Estoque ──────────► ToriqEPIEstoque                ││
│  │  ├── Entregas ─────────► ToriqEPIEntregas               ││
│  │  ├── Ficha de EPI ─────► ToriqEPIFicha                  ││
│  │  ├── Devoluções ───────► ToriqEPIDevolucoes             ││
│  │  └── Relatórios ───────► ToriqEPIRelatorios             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

*Documentação Detalhada do Módulo Toriq EPI - Vertical ON*
*Atualizado em Janeiro/2026*
