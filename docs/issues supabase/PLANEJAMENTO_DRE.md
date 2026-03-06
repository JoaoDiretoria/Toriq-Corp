# Planejamento - Página DRE (Demonstração do Resultado do Exercício)

## Visão Geral
A página DRE será uma ferramenta de análise financeira completa que exibe a Demonstração do Resultado do Exercício da empresa, permitindo visualizar receitas, despesas e resultados de forma detalhada.

---

## Estrutura da Página

### 1. Header
- **Título**: "DRE - Demonstração do Resultado do Exercício"
- **Subtítulo**: "Análise de receitas, despesas e resultados"
- **Seletor de Ano**: Dropdown para selecionar o ano (últimos 5 anos)
- **Botão Imprimir**: Para exportar/imprimir o relatório

---

### 2. Cards de Resumo (4 cards)

| Card | Valor | Indicador | Ícone |
|------|-------|-----------|-------|
| **Receita Líquida** | R$ XX.XXX,XX | ↑ X% (variação) | DollarSign (azul) |
| **Lucro Bruto** | R$ XX.XXX,XX | Margem: X% | TrendingUp (verde) |
| **Resultado Operacional** | R$ XX.XXX,XX | Margem: X% | Percent (roxo) |
| **Lucro Líquido** | R$ XX.XXX,XX | ↑ Lucro / ↓ Prejuízo | TrendingUp (verde-esmeralda) |

---

### 3. Abas (Tabs)

#### Tab 1: Tabela DRE
Tabela completa com demonstração mensal do resultado.

**Colunas**: Descrição | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | **Total**

**Linhas da DRE**:
```
(+) Receita Bruta
(-) Deduções da Receita
(=) Receita Líquida
(-) Custo dos Serviços
(=) Lucro Bruto
(-) Despesas Operacionais
    - Despesas Administrativas
    - Despesas de Pessoal
    - Despesas de Vendas
    - Despesas Financeiras
    - Outras Despesas
(=) Resultado Operacional
(+/-) Resultado Financeiro
(=) Resultado Antes do IR
(-) Impostos
(=) LUCRO/PREJUÍZO LÍQUIDO
```

**Formatação**:
- Valores positivos: texto normal
- Valores negativos: texto vermelho
- Linhas de resultado (=): fundo destacado, fonte bold
- Última linha (Lucro/Prejuízo): fundo verde/vermelho conforme resultado

---

#### Tab 2: Gráficos

**Gráfico 1 - Evolução Mensal** (BarChart)
- Tipo: Gráfico de barras agrupadas
- Séries: Receita Líquida, Lucro Bruto, Lucro Líquido
- Eixo X: Meses (Jan a Dez)
- Eixo Y: Valores em R$
- Legenda: Abaixo do gráfico

**Gráfico 2 - Tendência do Lucro Líquido** (LineChart)
- Tipo: Gráfico de linha
- Séries: Lucro Líquido, Receita Líquida
- Eixo X: Meses
- Eixo Y: Valores em R$
- Mostrar pontos de dados

**Gráfico 3 - Composição das Despesas e Lucro** (PieChart)
- Tipo: Gráfico de pizza/donut
- Segmentos:
  - Despesas Administrativas
  - Impostos
  - Lucro Líquido
- Legenda com valores e percentuais

---

#### Tab 3: Análise

**Cards de Margens** (3 cards):

| Margem | Cálculo | Descrição |
|--------|---------|-----------|
| **Margem Bruta** | (Lucro Bruto / Receita Líquida) × 100 | "Para cada R$ 100 de receita, sobram R$ X após custos diretos" |
| **Margem Operacional** | (Resultado Operacional / Receita Líquida) × 100 | "Eficiência operacional após todas as despesas operacionais" |
| **Margem Líquida** | (Lucro Líquido / Receita Líquida) × 100 | "Lucro final para cada R$ 100 de receita após custos e impostos" |

**Indicadores de Status**:
- Excelente: > 20% (verde)
- Bom: 10-20% (azul)
- Regular: 5-10% (amarelo)
- Atenção: < 5% (vermelho)

**Resumo Executivo**:
- **Pontos Positivos**: Lista automática baseada nos indicadores
- **Pontos de Atenção**: Lista automática de alertas

---

## Fonte de Dados

### Receitas (contas_receber)
```sql
SELECT 
  EXTRACT(MONTH FROM data_vencimento) as mes,
  SUM(valor) as receita
FROM contas_receber
WHERE empresa_id = :empresa_id
  AND EXTRACT(YEAR FROM data_vencimento) = :ano
  AND status = 'pago'
GROUP BY mes
```

### Despesas (contas_pagar)
```sql
SELECT 
  EXTRACT(MONTH FROM data_vencimento) as mes,
  classificacao_despesa,
  SUM(valor) as despesa
FROM contas_pagar
WHERE empresa_id = :empresa_id
  AND EXTRACT(YEAR FROM data_vencimento) = :ano
  AND status = 'pago'
GROUP BY mes, classificacao_despesa
```

### Classificação de Despesas
Usar o campo `classificacao_despesa` da tabela `contas_pagar` para categorizar:
- Despesas Administrativas
- Despesas de Pessoal
- Despesas de Vendas
- Despesas Financeiras
- Impostos
- Outras Despesas

---

## Componentes Necessários

1. **SSTDRE.tsx** - Componente principal (já criado como placeholder)
2. **DRETable.tsx** - Tabela de demonstração
3. **DRECharts.tsx** - Gráficos (usar Recharts)
4. **DREAnalysis.tsx** - Análise e margens

---

## Dependências

- `recharts` - Para gráficos (já instalado)
- `@tanstack/react-query` - Para busca de dados (já instalado)
- `date-fns` - Para manipulação de datas (já instalado)

---

## Próximos Passos

1. [ ] Implementar busca de dados de contas_receber e contas_pagar
2. [ ] Criar componente DRETable com a tabela completa
3. [ ] Criar componente DRECharts com os 3 gráficos
4. [ ] Criar componente DREAnalysis com cálculo de margens
5. [ ] Implementar lógica de cálculo do DRE
6. [ ] Adicionar funcionalidade de impressão/exportação PDF
7. [ ] Testar com dados reais

---

## Referência Visual

Os prints fornecidos mostram:
1. **Print 1**: Tabela DRE com valores mensais e totais
2. **Print 2**: Gráficos de evolução mensal e pizza de composição
3. **Print 3**: Cards de análise de margens e resumo executivo

---

*Documento criado em: 11/01/2026*
