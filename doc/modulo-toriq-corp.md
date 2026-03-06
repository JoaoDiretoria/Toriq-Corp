# Toriq Corp - Módulo de Gestão Empresarial

## Visão Geral

O **Toriq Corp** é o módulo de gestão empresarial da plataforma Vertical ON. Ele permite que empresas de SST gerenciem todos os aspectos do seu negócio de forma integrada, desde a prospecção comercial até o controle financeiro.

---

## Filosofia do Módulo

O Toriq Corp segue um modelo **configurável pelo usuário**, onde cada empresa SST pode personalizar:
- **Funis de trabalho** (fluxos personalizados)
- **Produtos e Serviços**
- **Automações**
- **Setores e permissões**

---

## Estrutura de Setores

O módulo é organizado em **6 setores principais**:

| Setor | Descrição | Ícone |
|-------|-----------|-------|
| **Comercial** | Vendas, prospecção, funis e contratos | TrendingUp |
| **Administrativo** | Equipamentos, frota e processos internos | ClipboardList |
| **Financeiro** | Contas, fluxo de caixa e DRE | DollarSign |
| **Técnico** | Laudos e documentos técnicos de SST | Wrench |
| **Marketing** | Campanhas e estratégias de marketing | Megaphone |
| **Configurações** | Automações e funis de trabalho | Settings |

---

## Funcionalidades por Setor

### 1. Comercial
- **Funis Kanban**: Gestão visual de oportunidades com drag-and-drop
- **Cards de Negócio**: Leads com valor, cliente, responsável e prazo
- **Atividades**: Tarefas, e-mails, ligações, reuniões, visitas
- **Contratos**: Elaboração e gestão de contratos com clientes/parceiros
- **Calculadoras**: Treinamento normativo, Vertical 365, Serviços SST
- **Gerador de Propostas**: Criação de propostas comerciais

### 2. Administrativo
- **Controle de Equipamentos**: Cadastro, movimentações e histórico
- **Kits de Equipamentos**: Agrupamento para tipos de serviço
- **Controle de Frota**: Veículos, manutenções, abastecimentos
- **Documentos de Veículos**: IPVA, licenciamento, seguro

### 3. Financeiro
- **Dashboard Financeiro**: Visão geral de receitas e despesas
- **Contas a Pagar**: Kanban de despesas com fornecedores
- **Contas a Receber**: Gestão de recebimentos de clientes
- **Fluxo de Caixa**: Visão diária/mensal de entradas e saídas
- **DRE**: Demonstrativo de Resultado do Exercício
- **Cadastros Financeiros**: Formas de pagamento, contas bancárias, planos

### 4. Técnico
- Gestão de atividades técnicas
- Laudos e documentos de SST
- *(Em desenvolvimento)*

### 5. Marketing
- Campanhas de marketing
- Mídias sociais
- *(Em desenvolvimento)*

### 6. Configurações
- **Automações**: Regras automáticas para cards nos funis
- **Funis/Fluxo de Trabalho**: Criação e configuração de funis personalizados
- **Etapas**: Definição de etapas para cada funil
- **Etiquetas**: Tags coloridas para categorização

---

## Arquitetura de Componentes

```
src/components/sst/toriq-corp/
├── index.ts                          # Exports centralizados
├── ToriqCorpComercial.tsx            # Página do setor comercial
├── ToriqCorpAdministrativo.tsx       # Página do setor administrativo
├── ToriqCorpFinanceiro.tsx           # Página do setor financeiro
├── ToriqCorpTecnico.tsx              # Página do setor técnico
├── ToriqCorpMarketing.tsx            # Página do setor marketing
├── ToriqCorpConfiguracoes.tsx        # Página de configurações
├── FunilKanban.tsx                   # Componente Kanban dos funis
├── FunilPage.tsx                     # Página de funil específico
├── ToriqCorpContratos.tsx            # Gestão de contratos
├── ElaborarContrato.tsx              # Editor de contratos
├── ToriqCorpTarefas.tsx              # Gestão de tarefas/atividades
├── ToriqCorpControleEquipamentos.tsx # Controle de equipamentos
├── ToriqCorpControleFrota.tsx        # Controle de frota
├── ToriqCorpFinanceiroDashboard.tsx  # Dashboard financeiro
├── ToriqCorpFinanceiroCadastros.tsx  # Cadastros financeiros
├── ToriqCorpContasReceber.tsx        # Contas a receber
├── SSTContasPagar.tsx                # Contas a pagar (Kanban)
├── SSTFluxoCaixa.tsx                 # Fluxo de caixa
├── SSTDRE.tsx                        # DRE - Demonstrativo de Resultado
└── configuracoes/
    ├── Automacoes.tsx                # Configuração de automações
    ├── FunisFluxoTrabalho.tsx        # Configuração de funis
    ├── FunilConfigDialog.tsx         # Dialog de configuração do funil
    └── ProdutosServicos.tsx          # Cadastro de produtos/serviços
```

---

## Tabelas do Banco de Dados

### Funis e Cards
| Tabela | Descrição |
|--------|-----------|
| `funis` | Funis de trabalho configurados |
| `funil_etapas` | Etapas de cada funil |
| `funil_cards` | Cards/oportunidades nos funis |
| `card_atividades` | Atividades vinculadas aos cards |
| `card_movimentacoes` | Histórico de movimentações |
| `card_etiquetas` | Etiquetas dos cards |
| `etiquetas` | Cadastro de etiquetas |

### Financeiro
| Tabela | Descrição |
|--------|-----------|
| `contas_pagar` | Contas a pagar |
| `contas_receber` | Contas a receber |
| `contas_bancarias` | Contas bancárias |
| `formas_pagamento` | Formas de pagamento |
| `plano_despesas` | Plano de contas de despesas |
| `plano_receitas` | Plano de contas de receitas |
| `centros_custo` | Centros de custo |
| `kanban_colunas_pagar` | Colunas do Kanban de contas a pagar |
| `kanban_colunas_receber` | Colunas do Kanban de contas a receber |

### Contratos
| Tabela | Descrição |
|--------|-----------|
| `contratos` | Contratos com clientes/parceiros |
| `modelos_contrato` | Templates de contratos |

### Equipamentos e Frota
| Tabela | Descrição |
|--------|-----------|
| `equipamentos` | Cadastro de equipamentos |
| `kits_equipamentos` | Kits de equipamentos |
| `movimentacoes_equipamentos` | Movimentações de equipamentos |
| `veiculos` | Cadastro de veículos |
| `veiculos_abastecimentos` | Abastecimentos |
| `veiculos_manutencoes` | Manutenções |
| `veiculos_documentos` | Documentos dos veículos |

### Automações
| Tabela | Descrição |
|--------|-----------|
| `automacoes` | Regras de automação |

---

## Fluxos Principais

### Fluxo Comercial (Funil de Vendas)
```
1. Lead entra no funil (card criado)
2. Card passa pelas etapas (drag-and-drop)
3. Atividades são registradas (ligações, e-mails, reuniões)
4. Proposta é gerada
5. Contrato é elaborado
6. Negócio é ganho/perdido
```

### Fluxo Financeiro
```
1. Conta a pagar/receber é criada
2. Passa pelas colunas do Kanban (Previsto → Realizado)
3. Baixa é registrada com data e valor
4. Dados alimentam Fluxo de Caixa e DRE
```

### Fluxo de Equipamentos
```
1. Equipamento é cadastrado
2. Kit é montado (opcional)
3. Movimentação de saída (para serviço)
4. Movimentação de entrada (retorno)
5. Histórico é mantido
```

---

## Integrações

- **Clientes SST**: Cards podem ser vinculados a clientes
- **Empresas Parceiras**: Contratos com parceiros
- **Usuários**: Responsáveis por cards e atividades
- **Setores**: Funis são organizados por setor

---

## Permissões

O acesso ao Toriq Corp é controlado por:
1. **Módulo ativo** para a empresa (`empresas_modulos`)
2. **Telas liberadas** (`empresas_modulos_telas`)
3. **Permissões do setor** do usuário (`setor_permissoes`)
4. **Hierarquia** (Administrador/Gestor/Colaborador)

---

## Próximos Passos

Para detalhamento de cada página do módulo, consulte:
- [Toriq Corp - Páginas Detalhadas](./modulo-toriq-corp-paginas.md)
