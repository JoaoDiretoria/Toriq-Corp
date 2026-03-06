# Módulo Gestão Empresa Toriq - Páginas Detalhadas

Este documento descreve detalhadamente cada página do módulo **Gestão Empresa Toriq**, incluindo funcionalidades, campos e comportamentos.

---

## Índice

1. [Dashboard](#1-dashboard)
2. [Empresas](#2-empresas)
3. [Categorias de Clientes](#3-categorias-de-clientes)
4. [Usuários](#4-usuários)
5. [Colaboradores](#5-colaboradores)
6. [Serviços](#6-serviços)
7. [Módulos](#7-módulos)
8. [Tarefas](#8-tarefas)
9. [Comercial](#9-comercial)
10. [Financeiro](#10-financeiro)
11. [Estatísticas do Sistema](#11-estatísticas-do-sistema)

---

## 1. Dashboard

**Componente**: `AdminDashboardHome.tsx`

### Descrição
Página inicial do painel administrativo com visão geral dos principais indicadores e atalhos rápidos.

### Elementos da Interface

#### Cabeçalho
- Saudação personalizada (Bom dia/Boa tarde/Boa noite + nome do usuário)
- Data atual formatada
- Botão "Novo Lead" para acesso rápido à prospecção

#### Cards de KPIs
| Card | Descrição | Ação ao Clicar |
|------|-----------|----------------|
| Empresas Ativas | Total de empresas cadastradas | Navega para Empresas |
| Leads no Pipeline | Leads novos + em progresso | Navega para Prospecção |
| Atividades Registradas | Atividades do dia atual | - |
| Usuários Ativos | Total de usuários | Navega para Usuários |

#### Atalhos Rápidos
- Ver Kanban (Prospecção)
- Empresas
- Usuários
- Financeiro

#### Atividade Recente
- Lista das 5 últimas atividades registradas
- Exibe: usuário, tipo de atividade, descrição, tempo decorrido

#### Pipeline de Vendas
- Barra visual com etapas do funil
- Legenda: Novos, Em progresso, Proposta, Fechados

### Dados Carregados
- Total de empresas (`empresas`)
- Total de usuários (`profiles`)
- Cards de prospecção (`prospeccao_cards`)
- Atividades de prospecção (`prospeccao_atividades`)

---

## 2. Empresas

**Componente**: `AdminEmpresas.tsx` + `EmpresaDetalhe.tsx`

### Descrição
CRUD completo de empresas com busca automática por CNPJ e CEP.

### Funcionalidades

#### Listagem
- Tabela com colunas: Nome, Tipo, CNPJ, Cidade/UF, Ações
- Filtros: busca por texto, filtro por tipo de empresa
- Badges coloridos por tipo de empresa

#### Tipos de Empresa
| Valor | Label |
|-------|-------|
| `cliente_final` | Cliente Final |
| `sst` | SST |
| `vertical_on` | Toriq |
| `empresa_parceira` | Empresa Parceira |
| `lead` | Lead |

#### Ações por Empresa
| Ícone | Ação |
|-------|------|
| 👁️ Eye | Ver detalhes |
| ✏️ Pencil | Editar |
| ⚙️ Settings | Configurar módulos |
| 🔑 LogIn | Entrar como empresa (Modo Empresa) |
| 🗑️ Trash | Excluir |

### Formulário de Cadastro/Edição

#### Dados Principais
| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| CNPJ | Input com máscara | Sim | Busca automática via BrasilAPI |
| Razão Social | Input | Sim | Preenchido automaticamente |
| Tipo | Select | Sim | - |
| Telefone | Input | Não | - |
| Email | Input | Não | - |

#### Endereço
| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| CEP | Input com máscara | Não | Busca automática via ViaCEP |
| Logradouro | Input | Não | Preenchido automaticamente |
| Número | Input | Não | - |
| Complemento | Input | Não | - |
| Bairro | Input | Não | Preenchido automaticamente |
| Cidade | Input | Não | Preenchido automaticamente |
| Estado | Select (UFs) | Não | Preenchido automaticamente |

#### Informações Adicionais
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Porte | Input (readonly) ou Select | Não |
| Site | Input | Não |
| LinkedIn | Input | Não |
| Instagram | Input | Não |

### Detalhes da Empresa (`EmpresaDetalhe.tsx`)

#### Abas Disponíveis
1. **Informações**: Dados cadastrais da empresa
2. **Usuários**: Lista de usuários vinculados
3. **Clientes**: Clientes da empresa (apenas para tipo SST)
4. **Módulos**: Configuração de módulos e telas

#### Configuração de Módulos
- Lista de módulos disponíveis no sistema
- Toggle para ativar/desativar cada módulo
- Clique no módulo abre dialog de seleção de telas
- Contador de telas ativas por módulo

#### Configuração de Telas
- Dialog com lista de telas do módulo selecionado
- Checkbox para cada tela
- Opção "Selecionar Todas"
- Salva em `empresas_modulos_telas`

### Modo Empresa
- Permite admin acessar o sistema como qualquer empresa SST
- Salva contexto no `localStorage`
- Redireciona para `/dashboard`
- Hook: `useEmpresaMode`

---

## 3. Categorias de Clientes

**Componente**: `AdminCategoriasClientes.tsx`

### Descrição
Gestão de categorias para classificação de clientes (ex: Premium, Básico, VIP).

### Funcionalidades
- CRUD completo de categorias
- Busca por nome ou descrição
- Tabela com: Nome, Descrição, Data de Criação, Ações

### Formulário
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | Input | Sim |
| Descrição | Textarea | Não |

### Tabela do Banco
- `categorias_clientes`

---

## 4. Usuários

**Componente**: `AdminUsuarios.tsx`

### Descrição
Gestão de usuários do sistema com criação via Edge Function.

### Funcionalidades

#### Listagem
- Tabela com: Nome, Email, Role, Empresa, Ações
- Filtros: busca, filtro por empresa, filtro por role
- Badges coloridos por role

#### Roles Disponíveis
| Role | Label | Descrição |
|------|-------|-----------|
| `admin_vertical` | Admin Toriq | Acesso total à plataforma |
| `empresa_sst` | Admin Empresa SST | Administrador de empresa SST |
| `cliente_final` | Cliente Final | Usuário de empresa cliente |

### Formulário de Criação
| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| Nome | Input | Sim | - |
| Email | Input | Sim | Validação de duplicidade |
| Senha | Input (password) | Sim | Mínimo 6 caracteres |
| Role | Select | Sim | - |
| Empresa | Select | Condicional | Obrigatório se não for admin_vertical |

### Criação de Usuário
- Utiliza Edge Function `admin-create-user`
- Cria usuário no Supabase Auth
- Cria registro em `profiles`

### Formulário de Edição
- Mesmos campos, exceto senha
- Atualiza apenas tabela `profiles`

---

## 5. Colaboradores

**Componente**: `AdminColaboradores.tsx`

### Descrição
Gestão completa de colaboradores da empresa Toriq.

### Funcionalidades
- CRUD completo
- Filtros: busca, status (ativos/inativos)
- Upload de foto
- Visualização detalhada

### Formulário - Dados Pessoais
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | Input | Sim |
| CPF | Input com máscara | Não |
| RG | Input | Não |
| Data de Nascimento | DatePicker | Não |
| Gênero | Select | Não |
| Estado Civil | Select | Não |
| Nacionalidade | Input | Não |
| Email Pessoal | Input | Não |
| Telefone | Input | Não |

### Formulário - Endereço
| Campo | Tipo |
|-------|------|
| CEP | Input com busca automática |
| Logradouro | Input |
| Número | Input |
| Complemento | Input |
| Bairro | Input |
| Cidade | Input |
| Estado | Select |

### Formulário - Dados Profissionais
| Campo | Tipo |
|-------|------|
| Cargo | Select (cadastro dinâmico) |
| Setor | Select (cadastro dinâmico) |
| Data de Admissão | DatePicker |
| Data de Demissão | DatePicker |
| CTPS | Input |
| Série CTPS | Input |
| Tipo de Contrato | Select |
| Carga Horária | Input |
| Salário | Input numérico |
| Comissão (%) | Input numérico |

### Formulário - Dados Bancários
| Campo | Tipo |
|-------|------|
| Banco | Input |
| Agência | Input |
| Conta | Input |
| Tipo de Conta | Select |
| PIX | Input |

### Formulário - Acesso ao Sistema
| Campo | Tipo |
|-------|------|
| Tem Acesso | Checkbox |
| Perfil de Acesso | Select |
| Módulos de Acesso | Multi-select |

### Dialogs Auxiliares
- `AdminSetorDialog.tsx`: Cadastro de setores
- `AdminCargoDialog.tsx`: Cadastro de cargos

---

## 6. Serviços

**Componente**: `AdminServicos.tsx`

### Descrição
Catálogo de serviços oferecidos pela Toriq.

### Funcionalidades
- CRUD completo
- Filtros: busca, categoria, status
- Cards de estatísticas: Total, Ativos, Em Destaque

### Categorias Disponíveis
- Consultoria
- Treinamento
- Auditoria
- Documentação
- Assessoria
- Software
- Outros

### Tipos de Serviço
| Valor | Label |
|-------|-------|
| `servico` | Serviço |
| `produto` | Produto |
| `consultoria` | Consultoria |
| `treinamento` | Treinamento |

### Unidades de Cobrança
| Valor | Label |
|-------|-------|
| `hora` | Por Hora |
| `dia` | Por Dia |
| `projeto` | Por Projeto |
| `mensal` | Mensal |
| `anual` | Anual |
| `unidade` | Por Unidade |

### Formulário
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | Input | Sim |
| Descrição | Textarea | Não |
| Categoria | Select | Não |
| Tipo | Select | Não |
| Preço | Input numérico | Não |
| Unidade | Select | Não |
| Duração Estimada | Input | Não |
| Ativo | Checkbox | Não (default: true) |
| Destaque | Checkbox | Não |

---

## 7. Módulos

**Componente**: `AdminModulos.tsx`

### Descrição
Cadastro de módulos do sistema que podem ser atribuídos às empresas.

### Funcionalidades
- CRUD completo
- Busca por nome
- Seleção de ícone

### Ícones Disponíveis
Package, Calendar, Bell, FileText, HardHat, Users, GraduationCap, BarChart3, Stethoscope, Shield, Settings, Clipboard, Heart, Truck, Building2, AlertTriangle, CheckCircle, Clock, Folder

### Formulário
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | Input | Sim |
| Descrição | Textarea | Não |
| Ícone | Select com preview | Sim |
| Rota | Input | Sim |

### Tabela do Banco
- `modulos`

---

## 8. Tarefas

**Componente**: `AdminTarefas.tsx`

### Descrição
Gestão de tarefas internas da equipe Toriq.

### Funcionalidades
- Criação e atribuição de tarefas
- Status: Pendente, Em Andamento, Concluída
- Prioridade: Baixa, Média, Alta, Urgente
- Filtros e busca

---

## 9. Comercial

### 9.1 Dashboard Comercial

**Componente**: `AdminComercialDashboard.tsx`

- Visão geral do setor comercial
- KPIs de vendas e conversão
- Gráficos de desempenho

### 9.2 Funil CLOSER

**Componente**: `AdminCloser.tsx`

- Kanban de oportunidades de venda
- Drag and drop entre colunas
- Detalhes de cada oportunidade
- Registro de atividades

### 9.3 Prospecção (SDR)

**Componente**: `AdminProspeccao.tsx`

- Kanban de leads
- Gestão de prospecção
- Registro de contatos e atividades
- Qualificação de leads

### 9.4 Onboarding (Pós-Venda)

**Componente**: `AdminPosVenda.tsx`

- Acompanhamento de novos clientes
- Checklist de onboarding
- Status de implementação

### 9.5 CS / Cross-selling

**Componente**: `AdminCrossSelling.tsx`

- Gestão de relacionamento com clientes
- Oportunidades de cross-selling
- Indicadores de satisfação

---

## 10. Financeiro

### 10.1 Dashboard Financeiro

**Componente**: `AdminFinanceiroDashboard.tsx`

- Visão geral financeira
- Receitas vs Despesas
- Saldo atual
- Gráficos de evolução

### 10.2 Cadastros

**Componente**: `AdminFinanceiroCadastros.tsx`

- Categorias financeiras
- Centros de custo
- Formas de pagamento
- Contas bancárias

### 10.3 Contas a Receber

**Componente**: `AdminContasReceber.tsx`

- Listagem de recebíveis
- Filtros por status, período, cliente
- Baixa de pagamentos
- Relatórios

### 10.4 Contas a Pagar

**Componente**: `AdminContasPagar.tsx`

- Listagem de pagamentos
- Filtros por status, período, fornecedor
- Registro de pagamentos
- Relatórios

### 10.5 Fluxo de Caixa

**Componente**: `AdminFluxoCaixa.tsx`

- Projeção de entradas e saídas
- Saldo projetado
- Visão por período

### 10.6 DRE

**Componente**: `AdminDRE.tsx`

- Demonstrativo de Resultados do Exercício
- Receitas, Custos, Despesas
- Resultado líquido
- Comparativo por período

---

## 11. Estatísticas do Sistema

**Componente**: `AdminEstatisticas.tsx`

### Descrição
Métricas e estatísticas de uso da plataforma.

### Dados Exibidos
- Total de empresas por tipo
- Total de usuários por role
- Módulos mais utilizados
- Acessos por período
- Logs de atividades

---

## Componentes Auxiliares

### Calculadoras

| Componente | Descrição |
|------------|-----------|
| `CalculadoraCustoMensal.tsx` | Cálculo de custos mensais |
| `CalculadoraLicencaVitalicia.tsx` | Cálculo de licença vitalícia |
| `CalculadoraServicosSST.tsx` | Precificação de serviços SST |
| `CalculadoraTreinamentoNormativo.tsx` | Cálculo de treinamentos |

---

## Hooks Utilizados

| Hook | Descrição |
|------|-----------|
| `useAuth` | Autenticação e dados do usuário |
| `useEmpresaMode` | Controle do Modo Empresa |
| `useAccessLog` | Registro de logs de acesso |
| `useToast` | Notificações toast |

---

## Tabelas do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `empresas` | Cadastro de empresas |
| `profiles` | Usuários do sistema |
| `colaboradores` | Colaboradores da Toriq |
| `modulos` | Módulos disponíveis |
| `empresas_modulos` | Módulos ativos por empresa |
| `empresas_modulos_telas` | Telas ativas por empresa/módulo |
| `servicos` | Catálogo de serviços |
| `categorias_clientes` | Categorias de clientes |
| `prospeccao_cards` | Cards do Kanban de prospecção |
| `prospeccao_colunas` | Colunas do Kanban |
| `prospeccao_atividades` | Atividades de prospecção |

---

*Documentação atualizada em Janeiro/2026*
