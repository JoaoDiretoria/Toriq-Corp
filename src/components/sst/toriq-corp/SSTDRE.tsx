import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DollarSign, TrendingUp, TrendingDown, Percent, FileText, BarChart3, PieChart, Printer, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaEfetiva } from '@/hooks/useEmpresaMode';
import { parseISO, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

interface ContaPagar {
  id: string;
  valor: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string | null;
  classificacao_despesa?: string;
  coluna_id?: string;
  status_pagamento?: string;
  [key: string]: any;
}

interface ContaReceber {
  id: string;
  valor: number;
  valor_pago: number;
  data_recebimento: string;
  data_pagamento?: string | null;
  categoria?: string;
  coluna_id?: string;
  status_pagamento?: string;
  [key: string]: any;
}

const MESES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Estrutura do DRE
interface LinhaDRE {
  id: string;
  descricao: string;
  tipo: 'receita' | 'despesa' | 'resultado' | 'subtotal';
  operador: string;
  nivel: number; // 0 = principal, 1 = sub-item
  classificacao?: string; // para mapear com classificacao_despesa ou categoria
  isTotal?: boolean;
}

const ESTRUTURA_DRE: LinhaDRE[] = [
  { id: 'receita_bruta', descricao: 'Receita Bruta', tipo: 'receita', operador: '+', nivel: 0 },
  { id: 'deducoes_receita', descricao: 'Deduções da Receita', tipo: 'despesa', operador: '-', nivel: 0, classificacao: 'deducoes_sobre_vendas' },
  { id: 'receita_liquida', descricao: 'Receita Líquida', tipo: 'resultado', operador: '=', nivel: 0 },
  { id: 'custo_servicos', descricao: 'Custo dos Serviços', tipo: 'despesa', operador: '-', nivel: 0, classificacao: 'custo_servico_prestado' },
  { id: 'lucro_bruto', descricao: 'Lucro Bruto', tipo: 'resultado', operador: '=', nivel: 0 },
  { id: 'despesas_operacionais', descricao: 'Despesas Operacionais', tipo: 'subtotal', operador: '-', nivel: 0 },
  { id: 'despesas_administrativas', descricao: 'Despesas Administrativas', tipo: 'despesa', operador: '', nivel: 1, classificacao: 'despesas_administrativas' },
  { id: 'despesas_estrutura', descricao: 'Despesas de Estrutura', tipo: 'despesa', operador: '', nivel: 1, classificacao: 'despesas_estrutura' },
  { id: 'despesas_pessoal', descricao: 'Despesas de Pessoal', tipo: 'despesa', operador: '', nivel: 1, classificacao: 'despesas_pessoal' },
  { id: 'despesas_comerciais', descricao: 'Despesas Comerciais', tipo: 'despesa', operador: '', nivel: 1, classificacao: 'despesas_comerciais' },
  { id: 'resultado_operacional', descricao: 'Resultado Operacional', tipo: 'resultado', operador: '=', nivel: 0 },
  { id: 'resultado_financeiro', descricao: 'Resultado Financeiro', tipo: 'subtotal', operador: '+/-', nivel: 0 },
  { id: 'receitas_financeiras', descricao: 'Receitas Financeiras', tipo: 'receita', operador: '+', nivel: 1, classificacao: 'receitas_financeiras' },
  { id: 'despesas_financeiras', descricao: 'Despesas Financeiras', tipo: 'despesa', operador: '-', nivel: 1, classificacao: 'despesas_financeiras' },
  { id: 'resultado_antes_ir', descricao: 'Resultado Antes do IR', tipo: 'resultado', operador: '=', nivel: 0 },
  { id: 'impostos', descricao: 'Impostos sobre o Lucro', tipo: 'despesa', operador: '-', nivel: 0, classificacao: 'impostos' },
  { id: 'lucro_liquido', descricao: 'LUCRO/PREJUÍZO LÍQUIDO', tipo: 'resultado', operador: '=', nivel: 0, isTotal: true },
];

export function SSTDRE() {
  const { empresa } = useAuth();
  const { empresaIdEfetivo } = useEmpresaEfetiva();
  const empresaId = empresaIdEfetivo || empresa?.id;

  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('tabela-dre');
  const [loading, setLoading] = useState(true);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [colunaRecebidos, setColunaRecebidos] = useState<string | null>(null);
  const [colunaPagos, setColunaPagos] = useState<string | null>(null);

  const anos = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    if (empresaId) {
      loadData();
    }
  }, [empresaId]);

  const loadData = async () => {
    if (!empresaId) return;
    setLoading(true);

    try {
      // Carregar colunas de contas a receber para identificar "Recebidos"
      try {
        const { data: colunasReceberData } = await (supabase as any)
          .from('contas_receber_colunas')
          .select('id, nome')
          .eq('empresa_id', empresaId);
        
        const colunaRecebidosFound = colunasReceberData?.find((c: any) => 
          c.nome.toLowerCase().includes('recebido')
        );
        setColunaRecebidos(colunaRecebidosFound?.id || null);
      } catch (e) {
        setColunaRecebidos(null);
      }

      // Carregar colunas de contas a pagar para identificar "Pagos"
      try {
        const { data: colunasPagarData } = await (supabase as any)
          .from('contas_pagar_colunas')
          .select('id, nome')
          .eq('empresa_id', empresaId);
        
        const colunaPagosFound = colunasPagarData?.find((c: any) => 
          c.nome.toLowerCase().includes('pago')
        );
        setColunaPagos(colunaPagosFound?.id || null);
      } catch (e) {
        setColunaPagos(null);
      }

      // Carregar contas a pagar (mesma query do Fluxo de Caixa)
      const { data: contasPagarData } = await (supabase as any)
        .from('contas_pagar')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('arquivado', false);
      
      setContasPagar(contasPagarData || []);

      // Carregar contas a receber (mesma query do Fluxo de Caixa)
      try {
        const { data: contasReceberData } = await (supabase as any)
          .from('contas_receber')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('arquivado', false);
        
        setContasReceber(contasReceberData || []);
      } catch (e) {
        setContasReceber([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Calcular valores do DRE por mês
  const dadosDRE = useMemo(() => {
    const anoNum = parseInt(ano);
    const resultado: Record<string, number[]> = {};

    // Inicializar todas as linhas com zeros
    ESTRUTURA_DRE.forEach(linha => {
      resultado[linha.id] = Array(12).fill(0);
    });

    // Calcular receita bruta por mês (contas recebidas)
    // Mesma lógica do Fluxo de Caixa: filtra por coluna "Recebidos" se existir
    for (let mesIndex = 0; mesIndex < 12; mesIndex++) {
      const mesInicio = startOfMonth(new Date(anoNum, mesIndex, 1));
      const mesFim = endOfMonth(new Date(anoNum, mesIndex, 1));
      
      const receitaMes = contasReceber
        .filter(c => {
          // Filtrar apenas contas na coluna "Recebidos"
          if (colunaRecebidos && (c as any).coluna_id !== colunaRecebidos) return false;
          
          const dataRef = c.data_pagamento || c.data_recebimento;
          if (!dataRef) return false;
          try {
            const data = parseISO(dataRef.split('T')[0]);
            return data >= mesInicio && data <= mesFim;
          } catch { return false; }
        })
        .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);
      
      resultado['receita_bruta'][mesIndex] = receitaMes;
    }

    // Calcular despesas por mês e classificação
    // Mesma lógica do Fluxo de Caixa: filtra por coluna "Pagos" se existir
    const linhaMap: Record<string, string> = {
      'deducoes_sobre_vendas': 'deducoes_receita',
      'custo_servico_prestado': 'custo_servicos',
      'despesas_administrativas': 'despesas_administrativas',
      'despesas_estrutura': 'despesas_estrutura',
      'despesas_pessoal': 'despesas_pessoal',
      'despesas_comerciais': 'despesas_comerciais',
      'despesas_financeiras': 'despesas_financeiras',
      'impostos': 'impostos',
    };

    for (let mesIndex = 0; mesIndex < 12; mesIndex++) {
      const mesInicio = startOfMonth(new Date(anoNum, mesIndex, 1));
      const mesFim = endOfMonth(new Date(anoNum, mesIndex, 1));
      
      contasPagar
        .filter(c => {
          // Filtrar apenas contas na coluna "Pagos"
          if (colunaPagos && (c as any).coluna_id !== colunaPagos) return false;
          
          const dataRef = c.data_pagamento || c.data_vencimento;
          if (!dataRef) return false;
          try {
            const data = parseISO(dataRef.split('T')[0]);
            return data >= mesInicio && data <= mesFim;
          } catch { return false; }
        })
        .forEach(c => {
          const valor = Number(c.valor_pago || c.valor || 0);
          const classificacao = c.classificacao_despesa || 'despesas_administrativas';
          const linhaId = linhaMap[classificacao] || 'despesas_administrativas';
          if (resultado[linhaId]) {
            resultado[linhaId][mesIndex] += valor;
          }
        });
    }

    // Calcular totais de despesas operacionais
    for (let mes = 0; mes < 12; mes++) {
      resultado['despesas_operacionais'][mes] = 
        resultado['despesas_administrativas'][mes] +
        resultado['despesas_estrutura'][mes] +
        resultado['despesas_pessoal'][mes] +
        resultado['despesas_comerciais'][mes];
    }

    // Calcular linhas de resultado
    for (let mes = 0; mes < 12; mes++) {
      // Receita Líquida = Receita Bruta - Deduções
      resultado['receita_liquida'][mes] = resultado['receita_bruta'][mes] - resultado['deducoes_receita'][mes];
      
      // Lucro Bruto = Receita Líquida - Custo dos Serviços
      resultado['lucro_bruto'][mes] = resultado['receita_liquida'][mes] - resultado['custo_servicos'][mes];
      
      // Resultado Operacional = Lucro Bruto - Despesas Operacionais
      resultado['resultado_operacional'][mes] = resultado['lucro_bruto'][mes] - resultado['despesas_operacionais'][mes];
      
      // Resultado Financeiro = Receitas Financeiras - Despesas Financeiras
      resultado['resultado_financeiro'][mes] = resultado['receitas_financeiras'][mes] - resultado['despesas_financeiras'][mes];
      
      // Resultado Antes do IR = Resultado Operacional + Resultado Financeiro
      resultado['resultado_antes_ir'][mes] = resultado['resultado_operacional'][mes] + resultado['resultado_financeiro'][mes];
      
      // Lucro Líquido = Resultado Antes do IR - Impostos
      resultado['lucro_liquido'][mes] = resultado['resultado_antes_ir'][mes] - resultado['impostos'][mes];
    }

    return resultado;
  }, [contasReceber, contasPagar, ano, colunaRecebidos, colunaPagos]);

  // Calcular totais anuais
  const totaisAnuais = useMemo(() => {
    const totais: Record<string, number> = {};
    Object.keys(dadosDRE).forEach(linhaId => {
      totais[linhaId] = dadosDRE[linhaId].reduce((sum, val) => sum + val, 0);
    });
    return totais;
  }, [dadosDRE]);

  // Calcular resumo para cards
  const resumo = useMemo(() => {
    return {
      receitaLiquida: totaisAnuais['receita_liquida'] || 0,
      lucroBruto: totaisAnuais['lucro_bruto'] || 0,
      resultadoOperacional: totaisAnuais['resultado_operacional'] || 0,
      lucroLiquido: totaisAnuais['lucro_liquido'] || 0,
      margemBruta: totaisAnuais['receita_liquida'] > 0 
        ? (totaisAnuais['lucro_bruto'] / totaisAnuais['receita_liquida']) * 100 
        : 0,
      margemOperacional: totaisAnuais['receita_liquida'] > 0 
        ? (totaisAnuais['resultado_operacional'] / totaisAnuais['receita_liquida']) * 100 
        : 0,
      margemLiquida: totaisAnuais['receita_liquida'] > 0 
        ? (totaisAnuais['lucro_liquido'] / totaisAnuais['receita_liquida']) * 100 
        : 0,
    };
  }, [totaisAnuais]);

  // Dados para o gráfico de evolução mensal
  const chartData = useMemo(() => {
    const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return mesesAbrev.map((mes, index) => ({
      periodo: `${mes}/${ano}`,
      'Receita Líquida': dadosDRE['receita_liquida']?.[index] || 0,
      'Lucro Bruto': dadosDRE['lucro_bruto']?.[index] || 0,
      'Lucro Líquido': dadosDRE['lucro_liquido']?.[index] || 0,
    }));
  }, [dadosDRE, ano]);

  // Dados para o gráfico de pizza (composição das despesas e lucro)
  const pieChartData = useMemo(() => {
    const despesasAdmin = totaisAnuais['despesas_administrativas'] || 0;
    const despesasEstrutura = totaisAnuais['despesas_estrutura'] || 0;
    const despesasPessoal = totaisAnuais['despesas_pessoal'] || 0;
    const despesasComerciais = totaisAnuais['despesas_comerciais'] || 0;
    const despesasFinanceiras = totaisAnuais['despesas_financeiras'] || 0;
    const impostos = totaisAnuais['impostos'] || 0;
    const lucroLiquido = totaisAnuais['lucro_liquido'] || 0;

    const data = [
      { name: 'Despesas Administrativas', value: despesasAdmin, color: '#22c55e' },
      { name: 'Despesas de Estrutura', value: despesasEstrutura, color: '#3b82f6' },
      { name: 'Despesas de Pessoal', value: despesasPessoal, color: '#f59e0b' },
      { name: 'Despesas Comerciais', value: despesasComerciais, color: '#ef4444' },
      { name: 'Despesas Financeiras', value: despesasFinanceiras, color: '#6366f1' },
      { name: 'Impostos', value: impostos, color: '#3b82f6' },
      { name: 'Lucro Líquido', value: Math.max(0, lucroLiquido), color: '#f97316' },
    ].filter(item => item.value > 0);

    return data;
  }, [totaisAnuais]);

  const getRowStyle = (linha: LinhaDRE) => {
    if (linha.isTotal) {
      return 'bg-success text-success-foreground font-bold';
    }
    if (linha.tipo === 'resultado') {
      return 'bg-warning/10 font-semibold';
    }
    if (linha.tipo === 'subtotal') {
      return 'bg-muted/50 font-medium';
    }
    if (linha.nivel === 1) {
      return 'text-muted-foreground';
    }
    return '';
  };

  const getCellStyle = (valor: number, linha: LinhaDRE) => {
    if (linha.isTotal) return '';
    if (valor < 0) return 'text-destructive';
    if (linha.tipo === 'despesa' && valor > 0) return 'text-destructive';
    return '';
  };

  const formatValorDRE = (valor: number, linha: LinhaDRE) => {
    const isNegativo = valor < 0 || (linha.tipo === 'despesa' && valor > 0 && linha.operador === '-');
    const valorAbs = Math.abs(valor);
    const formatted = formatCurrency(valorAbs);
    
    if (isNegativo && linha.tipo === 'despesa') {
      return `(${formatted})`;
    }
    return formatted;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DRE - Demonstração do Resultado do Exercício</h1>
          <p className="text-muted-foreground">Análise de receitas, despesas e resultados</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.print();
            }}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Líquida</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(resumo.receitaLiquida)}</p>
                <p className="text-xs text-muted-foreground">Total do ano</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lucro Bruto</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(resumo.lucroBruto)}</p>
                <p className="text-xs text-muted-foreground">Margem: {resumo.margemBruta.toFixed(2)}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resultado Operacional</p>
                <p className="text-2xl font-bold text-secondary-foreground">{formatCurrency(resumo.resultadoOperacional)}</p>
                <p className="text-xs text-muted-foreground">Margem: {resumo.margemOperacional.toFixed(2)}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Percent className="h-6 w-6 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                <p className={`text-2xl font-bold ${resumo.lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(resumo.lucroLiquido)}
                </p>
                <p className={`text-xs ${resumo.lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {resumo.lucroLiquido >= 0 ? '↑ Lucro' : '↓ Prejuízo'}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${resumo.lucroLiquido >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {resumo.lucroLiquido >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-success" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-destructive" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tabela-dre" className="flex items-center gap-2 text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" />
            Tabela DRE
          </TabsTrigger>
          <TabsTrigger value="graficos" className="flex items-center gap-2 text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="analise" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tabela-dre" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Demonstração do Resultado - {ano}
              </CardTitle>
              <p className="text-sm text-muted-foreground">Visão detalhada mês a mês</p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <div className="min-w-[1200px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[200px] sticky left-0 bg-muted/50 z-10">Descrição</TableHead>
                          {MESES_LABELS.map((mes, index) => (
                            <TableHead key={index} className="text-right min-w-[90px]">
                              {mes}/{ano}
                            </TableHead>
                          ))}
                          <TableHead className="text-right min-w-[110px] font-bold bg-primary/5">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ESTRUTURA_DRE.map((linha) => (
                          <TableRow key={linha.id} className={getRowStyle(linha)}>
                            <TableCell className={`sticky left-0 z-10 ${linha.isTotal ? 'bg-success' : linha.tipo === 'resultado' ? 'bg-warning/10' : linha.tipo === 'subtotal' ? 'bg-muted/50' : 'bg-background'}`}>
                              <span className={linha.nivel === 1 ? 'pl-4' : ''}>
                                {linha.operador && <span className="text-muted-foreground mr-1">({linha.operador})</span>}
                                {linha.descricao}
                              </span>
                            </TableCell>
                            {dadosDRE[linha.id]?.map((valor, mesIndex) => (
                              <TableCell 
                                key={mesIndex} 
                                className={`text-right ${getCellStyle(valor, linha)}`}
                              >
                                {formatValorDRE(valor, linha)}
                              </TableCell>
                            ))}
                            <TableCell className={`text-right font-semibold ${linha.isTotal ? '' : 'bg-primary/5'} ${getCellStyle(totaisAnuais[linha.id] || 0, linha)}`}>
                              {formatValorDRE(totaisAnuais[linha.id] || 0, linha)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graficos" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolução Mensal</CardTitle>
                <p className="text-sm text-muted-foreground">Receita, Lucro Bruto e Lucro Líquido</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    />
                    <Legend />
                    <Bar dataKey="Receita Líquida" fill="#3b82f6" />
                    <Bar dataKey="Lucro Bruto" fill="#22c55e" />
                    <Bar dataKey="Lucro Líquido" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendência do Lucro Líquido</CardTitle>
                <p className="text-sm text-muted-foreground">Evolução ao longo do período</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Lucro Líquido" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Receita Líquida" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Composição das Despesas e Lucro</CardTitle>
                <p className="text-sm text-muted-foreground">Distribuição percentual da receita</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-8">
                  <ResponsiveContainer width="60%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2">
                    {pieChartData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                        <span>{entry.name}</span>
                        <span className="font-medium ml-2">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analise" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Margem Bruta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold text-center ${resumo.margemBruta >= 20 ? 'text-success' : resumo.margemBruta >= 10 ? 'text-primary' : resumo.margemBruta >= 5 ? 'text-warning' : 'text-destructive'}`}>
                  {resumo.margemBruta.toFixed(2)}%
                </p>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Para cada R$ 100 de receita, sobram R$ {resumo.margemBruta.toFixed(2)} após custos diretos
                </p>
                <div className="mt-4 text-center">
                  <span className={`text-xs px-2 py-1 rounded ${resumo.margemBruta >= 20 ? 'bg-success/10 text-success' : resumo.margemBruta >= 10 ? 'bg-primary/10 text-primary' : resumo.margemBruta >= 5 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                    {resumo.margemBruta >= 20 ? 'Excelente' : resumo.margemBruta >= 10 ? 'Bom' : resumo.margemBruta >= 5 ? 'Regular' : 'Atenção'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-secondary-foreground" />
                  Margem Operacional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold text-center ${resumo.margemOperacional >= 15 ? 'text-success' : resumo.margemOperacional >= 8 ? 'text-primary' : resumo.margemOperacional >= 3 ? 'text-warning' : 'text-destructive'}`}>
                  {resumo.margemOperacional.toFixed(2)}%
                </p>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Eficiência operacional após todas as despesas operacionais
                </p>
                <div className="mt-4 text-center">
                  <span className={`text-xs px-2 py-1 rounded ${resumo.margemOperacional >= 15 ? 'bg-success/10 text-success' : resumo.margemOperacional >= 8 ? 'bg-primary/10 text-primary' : resumo.margemOperacional >= 3 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                    {resumo.margemOperacional >= 15 ? 'Excelente' : resumo.margemOperacional >= 8 ? 'Bom' : resumo.margemOperacional >= 3 ? 'Regular' : 'Atenção'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Margem Líquida
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold text-center ${resumo.margemLiquida >= 10 ? 'text-success' : resumo.margemLiquida >= 5 ? 'text-primary' : resumo.margemLiquida >= 0 ? 'text-warning' : 'text-destructive'}`}>
                  {resumo.margemLiquida.toFixed(2)}%
                </p>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Lucro final para cada R$ 100 de receita após custos e impostos
                </p>
                <div className="mt-4 text-center">
                  <span className={`text-xs px-2 py-1 rounded ${resumo.margemLiquida >= 10 ? 'bg-success/10 text-success' : resumo.margemLiquida >= 5 ? 'bg-primary/10 text-primary' : resumo.margemLiquida >= 0 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                    {resumo.margemLiquida >= 10 ? 'Excelente' : resumo.margemLiquida >= 5 ? 'Bom' : resumo.margemLiquida >= 0 ? 'Regular' : 'Prejuízo'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Resumo Executivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-success mb-2">Pontos Positivos</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {resumo.margemBruta >= 20 && <li>• Margem bruta excelente ({resumo.margemBruta.toFixed(2)}%)</li>}
                    {resumo.lucroLiquido > 0 && <li>• Empresa operando com lucro</li>}
                    {resumo.margemOperacional >= 15 && <li>• Boa eficiência operacional</li>}
                    {resumo.receitaLiquida > 0 && <li>• Receita líquida de {formatCurrency(resumo.receitaLiquida)}</li>}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-warning mb-2">Pontos de Atenção</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {resumo.margemBruta < 20 && resumo.margemBruta > 0 && <li>• Margem bruta pode ser melhorada ({resumo.margemBruta.toFixed(2)}%)</li>}
                    {resumo.lucroLiquido <= 0 && <li>• Empresa operando com prejuízo</li>}
                    {resumo.margemOperacional < 10 && resumo.margemOperacional >= 0 && <li>• Despesas operacionais elevadas</li>}
                    {resumo.receitaLiquida === 0 && <li>• Sem receitas registradas no período</li>}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
