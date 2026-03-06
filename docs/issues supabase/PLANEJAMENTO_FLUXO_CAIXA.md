# Planejamento - Página Fluxo de Caixa

**Data:** 11 de Janeiro de 2026  
**Status:** ✅ Implementado (versão inicial)  
**Componente:** `src/components/sst/toriq-corp/SSTFluxoCaixa.tsx`

---

## 📋 Visão Geral

A página de Fluxo de Caixa permite acompanhar as entradas e saídas financeiras da empresa, com visualizações em diferentes formatos:

1. **Demonstrativo do Fluxo de Caixa** - Visão anual por mês
2. **Fluxo de Caixa Diário** - Visão diária de um mês específico
3. **Fluxo Contas a Pagar** - Lista de contas a pagar do período
4. **Fluxo Contas a Receber** - Lista de contas a receber do período

---

## 🎯 Funcionalidades Implementadas

### Aba 1: Demonstrativo do Fluxo de Caixa

**Filtros:**
- [x] Ano (seletor)
- [x] Conta Bancária (Todas as Contas / Conta específica)
- [x] Status (Todos / Previsto / Realizado)
- [ ] Centro de Custos (a implementar)

**Tabela:**
- [x] Colunas: Janeiro a Dezembro + Total
- [x] Linhas:
  - **Saldo Inicial** - Saldo inicial do período (azul)
  - **Entradas** - Total de receitas (verde)
  - **Saídas** - Total de despesas (vermelho)
  - **Resultado do Mês** - Entradas - Saídas (amarelo)
  - **Disponível** - Saldo acumulado (roxo)

**Melhorias Futuras:**
- [ ] Expandir linhas por categoria de receita/despesa
- [ ] Receitas Operacionais, Outras Receitas Operacionais, Receitas Financeiras, Receitas não Operacionais
- [ ] Deduções sobre Vendas, Custo de Serviço Prestado, Despesas Administrativas, etc.
- [ ] Filtro "Selecione um grupo de contas para análise" com opções:
  - Todos
  - Classificação de Receitas (Receitas Operacionais, Outras Receitas, etc.)
  - Classificação de Despesas (Deduções, Custos, Despesas Administrativas, etc.)

---

### Aba 2: Fluxo de Caixa Diário

**Filtros:**
- [x] Ano (seletor)
- [x] Mês (seletor)
- [x] Conta Bancária
- [x] Status (Todos / Previsto / Realizado)

**Tabela:**
- [x] Colunas: DIA | ENTRADAS | SAÍDAS | SALDO | ACUMULADO
- [x] Uma linha para cada dia do mês
- [x] Valores em verde (entradas) e vermelho (saídas)
- [x] Saldo acumulado atualizado diariamente

**Aviso Importante:**
- [x] Alerta informando que lançamentos previstos anteriores à data do filtro não são considerados no saldo acumulado

---

### Aba 3: Fluxo Contas a Pagar

**Filtros:**
- [x] Ano (seletor)
- [x] Mês (seletor)
- [x] Status (Todos / Previsto / Realizado)

**Card de Resumo:**
- [x] "TOTAL A PAGAR: R$ X.XXX,XX" (badge vermelho)

**Tabela:**
- [x] Colunas: Fornecedor | Descrição | Vencimento | Status | Valor
- [x] Status com badges (Realizado / Previsto)
- [x] Valores em vermelho

---

### Aba 4: Fluxo Contas a Receber

**Filtros:**
- [x] Ano (seletor)
- [x] Mês (seletor)
- [x] Status (Todos / Previsto / Realizado)

**Card de Resumo:**
- [x] "TOTAL A RECEBER: R$ X.XXX,XX" (badge verde)

**Tabela:**
- [x] Colunas: Cliente | Descrição | Vencimento | Status | Valor
- [x] Status com badges (Realizado / Previsto)
- [x] Valores em verde

---

## 🔧 Melhorias Futuras (Backlog)

### Alta Prioridade
1. **Filtro por Centro de Custos** - Permitir filtrar por centro de custo específico
2. **Filtro por Grupo de Contas** - Dropdown para selecionar grupo de análise:
   - Todos
   - Receitas Operacionais
   - Outras Receitas Operacionais
   - Receitas Financeiras
   - Receitas não Operacionais
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

3. **Detalhamento por Categoria** - Ao selecionar um grupo, mostrar:
   - Subtotais por categoria
   - Linhas individuais por plano de conta
   - Ex: "Receitas Operacionais" → "Toriq Train" → R$ 7.246,38

### Média Prioridade
4. **Exportar para Excel/PDF** - Botão para exportar relatório
5. **Gráficos** - Visualização gráfica do fluxo de caixa
6. **Comparativo** - Comparar períodos (mês atual vs anterior, ano atual vs anterior)

### Baixa Prioridade
7. **Projeções** - Projetar fluxo futuro baseado em recorrências
8. **Alertas** - Notificar quando saldo ficar negativo
9. **Integração Bancária** - Importar extratos bancários

---

## 📊 Estrutura de Dados

### Tabelas Utilizadas
- `contas_pagar` - Contas a pagar
- `contas_receber` - Contas a receber
- `contas_bancarias` - Contas bancárias (saldo inicial)
- `plano_despesas` - Plano de despesas (categorização)
- `plano_receitas` - Plano de receitas (categorização)

### Campos Importantes
```typescript
interface ContaPagar {
  id: string;
  fornecedor_nome: string;
  descricao: string;
  valor: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  status_pagamento: 'previsto' | 'realizado' | 'vencido';
  centro_custo_id?: string;
  categoria?: string;
}

interface ContaReceber {
  id: string;
  cliente_nome: string;
  servico_produto: string;
  valor: number;
  valor_pago: number;
  data_recebimento: string;
  data_pagamento?: string;
  status_pagamento: 'previsto' | 'realizado';
  centro_custo_id?: string;
  categoria?: string;
}
```

---

## 🎨 Design

### Cores
- **Entradas/Receitas:** Verde (#22c55e)
- **Saídas/Despesas:** Vermelho (#ef4444)
- **Saldo Positivo:** Verde
- **Saldo Negativo:** Vermelho
- **Saldo Inicial:** Azul (#3b82f6)
- **Resultado:** Âmbar (#f59e0b)
- **Disponível:** Índigo (#6366f1)

### Layout
- Header com título e descrição
- Tabs para navegação entre visualizações
- Filtros no topo de cada aba
- Tabelas responsivas com scroll horizontal
- Badges para status

---

## 📁 Arquivos Relacionados

- `src/components/sst/toriq-corp/SSTFluxoCaixa.tsx` - Componente principal
- `src/components/sst/SSTSidebar.tsx` - Menu lateral (botão adicionado)
- `src/pages/SSTDashboard.tsx` - Roteamento
- `src/components/admin/AdminFluxoCaixa.tsx` - Versão admin (referência)

---

## ✅ Checklist de Implementação

### Fase 1 - Estrutura Básica (Concluído)
- [x] Criar componente SSTFluxoCaixa
- [x] Adicionar botão no menu lateral
- [x] Configurar roteamento
- [x] Implementar 4 abas básicas
- [x] Filtros de ano, mês, status, conta

### Fase 2 - Demonstrativo Detalhado (Pendente)
- [ ] Expandir linhas por tipo de receita
- [ ] Expandir linhas por tipo de despesa
- [ ] Filtro de grupo de contas
- [ ] Subtotais por categoria

### Fase 3 - Recursos Avançados (Pendente)
- [ ] Exportação Excel/PDF
- [ ] Gráficos
- [ ] Comparativos
- [ ] Projeções

---

**Última atualização:** 11/01/2026
