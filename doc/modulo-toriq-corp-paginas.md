# Toriq Corp - Documentação Detalhada das Páginas

Este documento detalha cada página/componente do módulo Toriq Corp.

---

## Índice

1. [Setor Comercial](#1-setor-comercial)
2. [Setor Administrativo](#2-setor-administrativo)
3. [Setor Financeiro](#3-setor-financeiro)
4. [Setor Técnico](#4-setor-técnico)
5. [Setor Marketing](#5-setor-marketing)
6. [Configurações](#6-configurações)

---

## 1. Setor Comercial

### 1.1 ToriqCorpComercial.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpComercial.tsx`

**Descrição**: Página principal do setor comercial. Serve como hub de navegação para as funcionalidades comerciais.

**Funcionalidades**:
- Exibe card informativo do setor
- Ponto de entrada para funis comerciais

---

### 1.2 FunilKanban.tsx
**Arquivo**: `src/components/sst/toriq-corp/FunilKanban.tsx`

**Descrição**: Componente principal de gestão de funis no formato Kanban. Permite visualização e manipulação de cards de oportunidades/negócios.

**Funcionalidades**:
- **Visualização Kanban**: Colunas representando etapas do funil
- **Drag-and-Drop**: Movimentação de cards entre etapas (dnd-kit)
- **Cards de Negócio**: Exibem título, valor, cliente, responsável, prazo
- **Ações Rápidas**: Botões configuráveis por card
- **Etiquetas**: Tags coloridas para categorização
- **Status de Negócio**: Em andamento, Ganho, Perdido, Aceito

**Atividades Suportadas**:
| Tipo | Ícone | Descrição |
|------|-------|-----------|
| tarefa | FileText | Tarefa genérica |
| email | Mail | E-mail |
| ligacao | Phone | Ligação telefônica |
| whatsapp | MessageSquare | Mensagem WhatsApp |
| reuniao | Video | Reunião |
| visita | MapPin | Visita presencial |
| nota | Pencil | Anotação |
| checklist | ListChecks | Lista de verificação |

**Integrações**:
- Calculadora de Treinamento Normativo
- Calculadora Vertical 365
- Calculadora de Serviços SST
- Gerador de Propostas

**Props**:
```typescript
interface FunilKanbanProps {
  funilId: string;      // ID do funil a ser exibido
  onBack?: () => void;  // Callback para voltar
}
```

---

### 1.3 ToriqCorpContratos.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpContratos.tsx`

**Descrição**: Gestão de contratos com clientes e parceiros.

**Funcionalidades**:
- **Listagem de Contratos**: Tabela com filtros e busca
- **Abas**: Contratos e Modelos de Contrato
- **Filtros**: Por status (rascunho, enviado, assinado, cancelado) e tipo (cliente, parceiro)
- **CRUD**: Criar, visualizar, editar, excluir contratos
- **Modelos**: Templates reutilizáveis de contratos

**Status de Contrato**:
| Status | Descrição |
|--------|-----------|
| rascunho | Em elaboração |
| enviado | Enviado para assinatura |
| assinado | Contrato assinado |
| cancelado | Contrato cancelado |

**Campos do Contrato**:
- Número, Tipo (cliente/parceiro)
- Razão Social, CNPJ
- Valor à vista, Forma de pagamento
- Status

---

### 1.4 ElaborarContrato.tsx
**Arquivo**: `src/components/sst/toriq-corp/ElaborarContrato.tsx`

**Descrição**: Editor de contratos com suporte a variáveis dinâmicas.

**Funcionalidades**:
- Editor de texto rico
- Variáveis substituíveis (dados do cliente, empresa, etc.)
- Preview do contrato
- Exportação para PDF

---

### 1.5 ToriqCorpTarefas.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpTarefas.tsx`

**Descrição**: Gestão centralizada de tarefas e atividades de todos os funis.

**Funcionalidades**:
- **Visualização Calendário**: Tarefas por dia/mês
- **Visualização Lista**: Tarefas em formato de lista
- **Filtros**: Por tipo, status, responsável
- **Navegação**: Mês anterior/próximo

**Tipos de Atividade**:
| Tipo | Label | Ícone |
|------|-------|-------|
| tarefa | Tarefa | CheckCircle2 |
| email | E-mail | Mail |
| ligacao | Ligação | Phone |
| whatsapp | WhatsApp | MessageSquare |
| reuniao | Reunião | Users |
| visita | Visita | MapPin |
| outro | Outro | FileText |

**Status das Tarefas**:
| Status | Cor | Descrição |
|--------|-----|-----------|
| a_realizar | Laranja | A ser realizada |
| programada | Azul | Agendada |
| pendente | Vermelho | Atrasada |
| concluida | Verde | Finalizada |

---

## 2. Setor Administrativo

### 2.1 ToriqCorpAdministrativo.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpAdministrativo.tsx`

**Descrição**: Página principal do setor administrativo.

**Funcionalidades**:
- Hub de navegação para funcionalidades administrativas
- Card informativo do setor

---

### 2.2 ToriqCorpControleEquipamentos.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpControleEquipamentos.tsx`

**Descrição**: Sistema completo de controle de equipamentos da empresa.

**Seções (Menu Lateral)**:
| Seção | Descrição |
|-------|-----------|
| Dashboard | Visão geral dos equipamentos |
| Cadastro Equipamento | CRUD de equipamentos |
| Cadastro Kit | Agrupamento de equipamentos |
| Movimentações | Entrada/saída de equipamentos |
| Consulta | Busca de equipamentos |
| Histórico | Histórico de movimentações |

**Campos do Equipamento**:
- Nome, Código, Número de série
- Categoria, Unidade de medida, Quantidade
- Usado para (array de tipos de serviço)
- Status, Local base
- Validade de calibração
- Observações

**Campos do Kit**:
- Nome, Código
- Tipo de serviço (array)
- Descrição, Quantidade
- Lista de equipamentos com quantidades

**Campos da Movimentação**:
- Número da movimentação
- Kit ou Equipamento
- Tipo (saída/entrada)
- Quantidade
- Tipo de serviço
- Cliente
- Responsável pela retirada
- Usuário que separou/utilizou/recebeu
- Data de saída/entrada
- Observações

---

### 2.3 ToriqCorpControleFrota.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpControleFrota.tsx`

**Descrição**: Sistema completo de gestão de frota de veículos.

**Funcionalidades**:
- **Cadastro de Veículos**: Dados completos do veículo
- **Abastecimentos**: Registro de abastecimentos
- **Manutenções**: Controle de manutenções preventivas/corretivas
- **Documentos**: IPVA, Licenciamento, Seguro com alertas de vencimento

**Tipos de Veículo Suportados**:
- Passeio
- Utilitário
- Caminhão
- Moto
- Outro

**Marcas Cadastradas**: Chevrolet, Fiat, Ford, Volkswagen, Toyota, Honda, Hyundai, Renault, Jeep, Nissan, Peugeot, Citroën, Mitsubishi, Kia, Mercedes-Benz, BMW, Audi, Volvo, Suzuki, Subaru, entre outras.

**Campos do Veículo**:
- Tipo, Marca, Modelo, Ano
- Placa, Renavam, Chassi
- Cor, Combustível
- Km atual
- Responsável
- Status (ativo, manutenção, inativo)

**Campos do Abastecimento**:
- Data, Km atual
- Litros, Valor por litro, Valor total
- Tipo de combustível
- Posto, Observações

**Campos da Manutenção**:
- Tipo (preventiva/corretiva)
- Data, Km
- Descrição, Valor
- Fornecedor, Observações

**Campos dos Documentos**:
- IPVA: Ano, Valor, Data vencimento, Status
- Licenciamento: Ano, Data vencimento, Status
- Seguro: Seguradora, Apólice, Vigência, Valor

---

## 3. Setor Financeiro

### 3.1 ToriqCorpFinanceiro.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpFinanceiro.tsx`

**Descrição**: Página principal do setor financeiro.

**Funcionalidades**:
- Hub de navegação para funcionalidades financeiras
- Card informativo do setor

---

### 3.2 ToriqCorpFinanceiroDashboard.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpFinanceiroDashboard.tsx`

**Descrição**: Dashboard financeiro com visão consolidada.

**Funcionalidades**:
- **Filtros**: Por mês e ano
- **Cards de Resumo**: Receitas, Despesas, Saldo, Contas bancárias
- **Gráficos**: Receitas vs Despesas (Recharts)
- **Totais**: Por cliente, fornecedor, status

**Métricas Exibidas**:
- Total a Receber (previsto)
- Total Recebido (realizado)
- Total a Pagar (previsto)
- Total Pago (realizado)
- Saldo das Contas Bancárias

---

### 3.3 SSTContasPagar.tsx
**Arquivo**: `src/components/sst/toriq-corp/SSTContasPagar.tsx`

**Descrição**: Gestão de contas a pagar no formato Kanban.

**Funcionalidades**:
- **Kanban**: Colunas configuráveis (ex: Previsto, Pago, Vencido)
- **Drag-and-Drop**: Movimentação entre colunas
- **CRUD**: Criar, editar, excluir contas
- **Baixa**: Registrar pagamento parcial ou total
- **Filtros**: Por fornecedor, categoria, período
- **Anexos**: Upload de comprovantes

**Campos da Conta a Pagar**:
- Número, Fornecedor (ID e nome)
- CNPJ do fornecedor
- Descrição, Valor, Valor pago
- Data de competência, Data de vencimento
- Data de pagamento
- Forma de pagamento
- Categoria (classificação de despesa)
- Centro de custo
- Conta financeira (bancária)
- Coluna do Kanban
- Observações
- Status (previsto, realizado, vencido)
- Frequência (único, recorrente)

**Status de Pagamento**:
| Status | Cor | Descrição |
|--------|-----|-----------|
| previsto | Azul | Pagamento previsto |
| realizado | Verde | Pago |
| vencido | Vermelho | Vencido |

---

### 3.4 ToriqCorpContasReceber.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpContasReceber.tsx`

**Descrição**: Gestão de contas a receber.

**Funcionalidades**:
- Similar ao Contas a Pagar
- Vinculação com clientes
- Controle de recebimentos

---

### 3.5 SSTFluxoCaixa.tsx
**Arquivo**: `src/components/sst/toriq-corp/SSTFluxoCaixa.tsx`

**Descrição**: Fluxo de caixa com visão diária e mensal.

**Funcionalidades**:
- **Filtros**: Por mês, ano e conta bancária
- **Visão Diária**: Entradas e saídas por dia
- **Visão Mensal**: Consolidado por mês
- **Saldo**: Saldo inicial, movimentações, saldo final
- **Categorização**: Por tipo de receita/despesa

**Tipos de Receita**:
- Receitas Operacionais
- Outras Receitas Operacionais
- Receitas Financeiras
- Receitas não Operacionais

**Tipos de Despesa**:
- Deduções sobre Vendas
- Custo de Serviço Prestado
- Despesas Administrativas
- Despesas com Estrutura
- Despesas com Pessoal
- Despesas Comerciais
- Despesas Financeiras
- Despesas Não Operacional
- Impostos
- Participação e Dividendos

---

### 3.6 SSTDRE.tsx
**Arquivo**: `src/components/sst/toriq-corp/SSTDRE.tsx`

**Descrição**: Demonstrativo de Resultado do Exercício.

**Funcionalidades**:
- **Filtro**: Por ano
- **Abas**: Tabela DRE, Gráficos
- **Estrutura Contábil**: Receita Bruta → Lucro Líquido
- **Gráficos**: Barras, Linhas, Pizza (Recharts)
- **Impressão**: Exportação para impressão

**Estrutura do DRE**:
```
(+) Receita Bruta
(-) Deduções da Receita
(=) Receita Líquida
(-) Custo dos Serviços
(=) Lucro Bruto
(-) Despesas Operacionais
    - Despesas Administrativas
    - Despesas de Estrutura
    - Despesas de Pessoal
    - Despesas Comerciais
(=) Resultado Operacional
(+/-) Resultado Financeiro
    (+) Receitas Financeiras
    (-) Despesas Financeiras
(=) Resultado Antes do IR
(-) Impostos sobre o Lucro
(=) LUCRO/PREJUÍZO LÍQUIDO
```

---

### 3.7 ToriqCorpFinanceiroCadastros.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpFinanceiroCadastros.tsx`

**Descrição**: Cadastros auxiliares do módulo financeiro.

**Cadastros Disponíveis**:
- Formas de Pagamento
- Contas Bancárias
- Plano de Despesas
- Plano de Receitas
- Centros de Custo
- Fornecedores
- Colunas do Kanban (Pagar/Receber)

---

## 4. Setor Técnico

### 4.1 ToriqCorpTecnico.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpTecnico.tsx`

**Descrição**: Página principal do setor técnico.

**Status**: Em desenvolvimento

**Funcionalidades Planejadas**:
- Gestão de laudos técnicos
- Documentos de SST
- Cronograma de visitas técnicas

---

## 5. Setor Marketing

### 5.1 ToriqCorpMarketing.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpMarketing.tsx`

**Descrição**: Página principal do setor de marketing.

**Status**: Em desenvolvimento

**Funcionalidades Planejadas**:
- Campanhas de marketing
- Gestão de mídias sociais
- Métricas de marketing

---

## 6. Configurações

### 6.1 ToriqCorpConfiguracoes.tsx
**Arquivo**: `src/components/sst/toriq-corp/ToriqCorpConfiguracoes.tsx`

**Descrição**: Página de configurações do módulo Toriq Corp.

**Abas**:
| Aba | Componente | Descrição |
|-----|------------|-----------|
| Automações | Automacoes.tsx | Regras automáticas |
| Funis/Fluxo de Trabalho | FunisFluxoTrabalho.tsx | Gestão de funis |

---

### 6.2 Automacoes.tsx
**Arquivo**: `src/components/sst/toriq-corp/configuracoes/Automacoes.tsx`

**Descrição**: Configuração de automações para os funis.

**Funcionalidades**:
- **CRUD de Automações**: Criar, editar, excluir regras
- **Gatilhos**: Quando um card entra em uma etapa
- **Ações**: Criar tarefa, enviar notificação, mover card
- **Condições**: Filtros para aplicação da regra

**Estrutura da Automação**:
- Nome, Descrição
- Funil de origem
- Etapa gatilho
- Tipo de ação
- Parâmetros da ação
- Ativo/Inativo

---

### 6.3 FunisFluxoTrabalho.tsx
**Arquivo**: `src/components/sst/toriq-corp/configuracoes/FunisFluxoTrabalho.tsx`

**Descrição**: Gestão de funis e fluxos de trabalho.

**Funcionalidades**:
- **CRUD de Funis**: Criar, editar, excluir funis
- **Tipos de Funil**: Negócio ou Fluxo de Trabalho
- **Vinculação a Setor**: Comercial, Administrativo, etc.
- **Gestão de Etapas**: Criar, ordenar, colorir etapas
- **Gestão de Etiquetas**: Tags para categorização

**Campos do Funil**:
- Nome, Descrição
- Tipo (negocio, fluxo_trabalho)
- Setor vinculado
- Ativo/Inativo

**Campos da Etapa**:
- Nome
- Cor (hex)
- Ordem

---

### 6.4 FunilConfigDialog.tsx
**Arquivo**: `src/components/sst/toriq-corp/configuracoes/FunilConfigDialog.tsx`

**Descrição**: Dialog para configuração detalhada de um funil específico.

**Funcionalidades**:
- Edição de dados do funil
- Gestão de etapas (adicionar, remover, reordenar)
- Gestão de etiquetas
- Preview do funil

---

### 6.5 ProdutosServicos.tsx
**Arquivo**: `src/components/sst/toriq-corp/configuracoes/ProdutosServicos.tsx`

**Descrição**: Cadastro de produtos e serviços da empresa.

**Funcionalidades**:
- **CRUD**: Criar, editar, excluir produtos/serviços
- **Categorização**: Por tipo de serviço
- **Precificação**: Valores e condições
- **Vinculação**: Uso em propostas e contratos

---

## Resumo de Arquivos

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| FunilKanban.tsx | ~6650 | Kanban principal |
| ToriqCorpControleFrota.tsx | ~4580 | Controle de frota |
| ToriqCorpControleEquipamentos.tsx | ~4200 | Controle de equipamentos |
| SSTContasPagar.tsx | ~2680 | Contas a pagar |
| SSTFluxoCaixa.tsx | ~1017 | Fluxo de caixa |
| ToriqCorpFinanceiroDashboard.tsx | ~886 | Dashboard financeiro |
| ToriqCorpContratos.tsx | ~823 | Contratos |
| SSTDRE.tsx | ~751 | DRE |
| ToriqCorpTarefas.tsx | ~586 | Tarefas |
| ToriqCorpConfiguracoes.tsx | ~80 | Configurações |
| Automacoes.tsx | ~38000 | Automações |
| FunisFluxoTrabalho.tsx | ~48000 | Funis |
| ProdutosServicos.tsx | ~77000 | Produtos/Serviços |

---

## Dependências Principais

- **dnd-kit**: Drag-and-drop
- **recharts**: Gráficos
- **date-fns**: Manipulação de datas
- **jspdf + html2canvas**: Geração de PDFs
- **lucide-react**: Ícones
