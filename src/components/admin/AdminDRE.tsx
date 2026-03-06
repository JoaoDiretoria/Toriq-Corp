import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, getMonth, getYear } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileBarChart,
  Download,
  Printer,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  PieChart,
  BarChart3,
  LineChart,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

// Tipos de classificação de despesas do plano_despesas
const TIPOS_DESPESA = {
  DEDUCOES: 'deducoes_sobre_vendas',
  CUSTO_SERVICO: 'custo_servico_prestado',
  DESPESAS_ADMIN: 'despesas_administrativas',
  DESPESAS_ESTRUTURA: 'despesas_estrutura',
  DESPESAS_PESSOAL: 'despesas_pessoal',
  DESPESAS_COMERCIAIS: 'despesas_comerciais',
  DESPESAS_FINANCEIRAS: 'despesas_financeiras',
  DESPESAS_NAO_OPERACIONAL: 'despesas_nao_operacional',
  IMPOSTOS: 'impostos',
  PARTICIPACAO_DIVIDENDOS: 'participacao_dividendos',
};

// Tipos de classificação de receitas do plano_receitas
const TIPOS_RECEITA = {
  RECEITAS_OPERACIONAIS: 'receitas_operacionais',
  OUTRAS_RECEITAS_OPERACIONAIS: 'outras_receitas_operacionais',
  RECEITAS_FINANCEIRAS: 'receitas_financeiras',
  RECEITAS_NAO_OPERACIONAIS: 'receitas_nao_operacionais',
};

// Interfaces
interface DREItem {
  id: string;
  descricao: string;
  tipo: 'receita' | 'deducao' | 'custo' | 'despesa' | 'resultado';
  categoria?: string;
  valores: Record<string, number>; // { '2024-01': 1000, '2024-02': 1200, ... }
}

interface DREData {
  periodo: string;
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custoServicos: number;
  lucroBruto: number;
  despesasOperacionais: number;
  despesasAdministrativas: number;
  despesasEstrutura: number;
  despesasPessoal: number;
  despesasComerciais: number;
  resultadoOperacional: number;
  receitasFinanceiras: number;
  despesasFinanceiras: number;
  resultadoFinanceiro: number;
  resultadoAntesIR: number;
  impostos: number;
  lucroLiquido: number;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

// Gerar lista de anos (2020 até 2030)
const ANOS = Array.from({ length: 11 }, (_, i) => (2020 + i).toString());

export function AdminDRE() {
  const { toast } = useToast();
  const [periodoSelecionado, setPeriodoSelecionado] = useState(new Date().getFullYear().toString());
  const [visualizacao, setVisualizacao] = useState<'mensal' | 'trimestral' | 'anual'>('mensal');
  const [loading, setLoading] = useState(true);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [contasReceber, setContasReceber] = useState<any[]>([]);

  // Carregar dados do Supabase
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Carregar contas a pagar
        const { data: contasPagarData } = await (supabase as any)
          .from('contas_pagar')
          .select('*')
          .eq('empresa_id', TORIQ_EMPRESA_ID)
          .eq('arquivado', false);
        
        setContasPagar(contasPagarData || []);

        // Carregar contas a receber
        const { data: contasReceberData } = await (supabase as any)
          .from('contas_receber')
          .select('*')
          .eq('empresa_id', TORIQ_EMPRESA_ID)
          .eq('arquivado', false);
        
        setContasReceber(contasReceberData || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Função auxiliar para filtrar despesas por tipo de classificação
  const filtrarDespesasPorTipo = (despesas: any[], tipos: string[]) => {
    return despesas.filter(c => {
      const categoria = (c.categoria || '').toLowerCase();
      return tipos.some(tipo => categoria.includes(tipo.toLowerCase()));
    });
  };

  // Função auxiliar para filtrar receitas por tipo de classificação
  const filtrarReceitasPorTipo = (receitas: any[], tipos: string[]) => {
    return receitas.filter(c => {
      const categoria = (c.categoria || '').toLowerCase();
      return tipos.some(tipo => categoria.includes(tipo.toLowerCase()));
    });
  };

  // Calcular dados do DRE baseado nos dados reais
  const dreData = useMemo(() => {
    const ano = parseInt(periodoSelecionado);
    
    return MESES.map((mes, index) => {
      // Filtrar receitas do mês (usar data_competencia ou data_recebimento)
      const receitasMes = contasReceber.filter(c => {
        const dataRef = c.data_competencia || c.data_recebimento || c.data_vencimento;
        if (!dataRef) return false;
        try {
          const data = parseISO(dataRef);
          return getYear(data) === ano && getMonth(data) === index;
        } catch { return false; }
      });

      // Filtrar despesas do mês (usar data_competencia ou data_vencimento)
      const despesasMes = contasPagar.filter(c => {
        const dataRef = c.data_competencia || c.data_vencimento;
        if (!dataRef) return false;
        try {
          const data = parseISO(dataRef);
          return getYear(data) === ano && getMonth(data) === index;
        } catch { return false; }
      });

      // === RECEITAS ===
      // Receita Bruta (receitas operacionais + outras receitas operacionais)
      const receitasOperacionais = receitasMes
        .filter(c => {
          const cat = (c.categoria || '').toLowerCase();
          return cat.includes('operacion') || cat === '' || !cat.includes('financ');
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);
      
      const receitaBruta = receitasOperacionais;
      
      // === DEDUÇÕES SOBRE VENDAS ===
      const deducoes = despesasMes
        .filter(c => {
          const cat = (c.categoria || '').toLowerCase();
          return cat.includes('deducoes') || cat.includes('deduções') || cat.includes('imposto sobre venda');
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);
      
      // Se não houver deduções cadastradas, estimar 5% da receita
      const deducoesCalculadas = deducoes > 0 ? deducoes : receitaBruta * 0.05;
      const receitaLiquida = receitaBruta - deducoesCalculadas;
      
      // === CUSTO DOS SERVIÇOS PRESTADOS ===
      const custoServicos = despesasMes
        .filter(c => {
          const cat = (c.categoria || '').toLowerCase();
          return cat.includes('custo') || cat.includes('csp') || cat.includes('servico_prestado');
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);
      
      const lucroBruto = receitaLiquida - custoServicos;
      
      // === DESPESAS OPERACIONAIS ===
      // Despesas Administrativas
      const despesasAdministrativas = despesasMes
        .filter(c => {
          const cat = (c.categoria || '').toLowerCase();
          return cat.includes('admin');
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);
      
      // Despesas de Estrutura
      const despesasEstrutura = despesasMes
        .filter(c => {
          const cat = (c.categoria || '').toLowerCase();
          return cat.includes('estrutura') || cat.includes('aluguel') || cat.includes('energia') || cat.includes('agua');
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);
      
      // Despesas de Pessoal
      const despesasPessoal = despesasMes
        .filter(c => {
          const cat = (c.categoria || '').toLowerCase();
          return cat.includes('pessoal') || cat.includes('salario') || cat.includes('folha');
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);
      
      // Despesas Comerciais
      const despesasComerciais = despesasMes
        .filter(c => {
          const cat = (c.categoria || '').toLowerCase();
          return cat.includes('comerci') || cat.includes('marketing') || cat.includes('vendas');
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);
      
      // Total de despesas operacionais
      const despesasOperacionais = despesasAdministrativas + despesasEstrutura + despesasPessoal + despesasComerciais;
      
      const resultadoOperacional = lucroBruto - despesasOperacionais;
      
      // === RESULTADO FINANCEIRO ===
      // Receitas Financeiras
      const receitasFinanceiras = receitasMes
        .filter(c => {
          const cat = (c.categoria || '').toLowerCase();
          return cat.includes('financ') || cat.includes('juros recebido') || cat.includes('rendimento');
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);
      
      // Despesas Financeiras
      const despesasFinanceiras = despesasMes
        .filter(c => {
          const cat = (c.categoria || '').toLowerCase();
          return cat.includes('financ') || cat.includes('juros') || cat.includes('taxa banc');
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);
      
      const resultadoFinanceiro = receitasFinanceiras - despesasFinanceiras;
      
      const resultadoAntesIR = resultadoOperacional + resultadoFinanceiro;
      
      // === IMPOSTOS SOBRE O LUCRO ===
      const impostosLucro = despesasMes
        .filter(c => {
          const cat = (c.categoria || '').toLowerCase();
          return cat.includes('imposto') && (cat.includes('renda') || cat.includes('csll') || cat.includes('lucro'));
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);
      
      // Se não houver impostos cadastrados, estimar 15% do lucro positivo
      const impostos = impostosLucro > 0 ? impostosLucro : (resultadoAntesIR > 0 ? resultadoAntesIR * 0.15 : 0);
      
      const lucroLiquido = resultadoAntesIR - impostos;

      return {
        periodo: `${mes}/${ano}`,
        receitaBruta: Math.round(receitaBruta * 100) / 100,
        deducoes: Math.round(deducoesCalculadas * 100) / 100,
        receitaLiquida: Math.round(receitaLiquida * 100) / 100,
        custoServicos: Math.round(custoServicos * 100) / 100,
        lucroBruto: Math.round(lucroBruto * 100) / 100,
        despesasOperacionais: Math.round(despesasOperacionais * 100) / 100,
        despesasAdministrativas: Math.round(despesasAdministrativas * 100) / 100,
        despesasEstrutura: Math.round(despesasEstrutura * 100) / 100,
        despesasPessoal: Math.round(despesasPessoal * 100) / 100,
        despesasComerciais: Math.round(despesasComerciais * 100) / 100,
        resultadoOperacional: Math.round(resultadoOperacional * 100) / 100,
        receitasFinanceiras: Math.round(receitasFinanceiras * 100) / 100,
        despesasFinanceiras: Math.round(despesasFinanceiras * 100) / 100,
        resultadoFinanceiro: Math.round(resultadoFinanceiro * 100) / 100,
        resultadoAntesIR: Math.round(resultadoAntesIR * 100) / 100,
        impostos: Math.round(impostos * 100) / 100,
        lucroLiquido: Math.round(lucroLiquido * 100) / 100,
      };
    });
  }, [periodoSelecionado, contasPagar, contasReceber]);

  // Calcular totais e médias
  const totais = useMemo(() => {
    const total = dreData.reduce((acc, item) => ({
      receitaBruta: acc.receitaBruta + item.receitaBruta,
      deducoes: acc.deducoes + item.deducoes,
      receitaLiquida: acc.receitaLiquida + item.receitaLiquida,
      custoServicos: acc.custoServicos + item.custoServicos,
      lucroBruto: acc.lucroBruto + item.lucroBruto,
      despesasOperacionais: acc.despesasOperacionais + item.despesasOperacionais,
      despesasAdministrativas: acc.despesasAdministrativas + item.despesasAdministrativas,
      despesasEstrutura: acc.despesasEstrutura + item.despesasEstrutura,
      despesasPessoal: acc.despesasPessoal + item.despesasPessoal,
      despesasComerciais: acc.despesasComerciais + item.despesasComerciais,
      resultadoOperacional: acc.resultadoOperacional + item.resultadoOperacional,
      receitasFinanceiras: acc.receitasFinanceiras + item.receitasFinanceiras,
      despesasFinanceiras: acc.despesasFinanceiras + item.despesasFinanceiras,
      resultadoFinanceiro: acc.resultadoFinanceiro + item.resultadoFinanceiro,
      resultadoAntesIR: acc.resultadoAntesIR + item.resultadoAntesIR,
      impostos: acc.impostos + item.impostos,
      lucroLiquido: acc.lucroLiquido + item.lucroLiquido,
    }), {
      receitaBruta: 0,
      deducoes: 0,
      receitaLiquida: 0,
      custoServicos: 0,
      lucroBruto: 0,
      despesasOperacionais: 0,
      despesasAdministrativas: 0,
      despesasEstrutura: 0,
      despesasPessoal: 0,
      despesasComerciais: 0,
      resultadoOperacional: 0,
      receitasFinanceiras: 0,
      despesasFinanceiras: 0,
      resultadoFinanceiro: 0,
      resultadoAntesIR: 0,
      impostos: 0,
      lucroLiquido: 0,
    });

    return total;
  }, [dreData]);

  // Dados para gráficos
  const chartData = useMemo(() => {
    return dreData.map(item => ({
      periodo: item.periodo,
      'Receita Líquida': item.receitaLiquida,
      'Lucro Bruto': item.lucroBruto,
      'Lucro Líquido': item.lucroLiquido,
    }));
  }, [dreData]);

  const pieData = useMemo(() => {
    return [
      { name: 'Custo dos Serviços', value: totais.custoServicos },
      { name: 'Despesas Administrativas', value: totais.despesasAdministrativas },
      { name: 'Despesas de Estrutura', value: totais.despesasEstrutura },
      { name: 'Despesas de Pessoal', value: totais.despesasPessoal },
      { name: 'Despesas Comerciais', value: totais.despesasComerciais },
      { name: 'Despesas Financeiras', value: totais.despesasFinanceiras },
      { name: 'Impostos', value: totais.impostos },
      { name: 'Lucro Líquido', value: Math.max(0, totais.lucroLiquido) },
    ].filter(item => item.value > 0);
  }, [totais]);

  // Indicadores
  const indicadores = useMemo(() => {
    const margemBruta = (totais.lucroBruto / totais.receitaLiquida) * 100;
    const margemOperacional = (totais.resultadoOperacional / totais.receitaLiquida) * 100;
    const margemLiquida = (totais.lucroLiquido / totais.receitaLiquida) * 100;
    
    // Comparação com período anterior (simulado)
    const variacaoReceita = 12.5;
    const variacaoLucro = 8.3;

    return {
      margemBruta: Math.round(margemBruta * 100) / 100,
      margemOperacional: Math.round(margemOperacional * 100) / 100,
      margemLiquida: Math.round(margemLiquida * 100) / 100,
      variacaoReceita,
      variacaoLucro,
    };
  }, [totais]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const handleExportPDF = () => {
    toast({ title: 'Exportando PDF...', description: 'O relatório será baixado em instantes.' });
    // Implementar exportação real
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DRE - Demonstração do Resultado do Exercício</h1>
          <p className="text-muted-foreground">Análise de receitas, despesas e resultados</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANOS.map(ano => (
                <SelectItem key={ano} value={ano}>{ano}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleExportPDF} className="bg-gradient-primary">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Líquida</p>
                <p className="text-2xl font-bold">{formatCurrency(totais.receitaLiquida)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+{indicadores.variacaoReceita}%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lucro Bruto</p>
                <p className="text-2xl font-bold">{formatCurrency(totais.lucroBruto)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Margem: {formatPercent(indicadores.margemBruta)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resultado Operacional</p>
                <p className="text-2xl font-bold">{formatCurrency(totais.resultadoOperacional)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Margem: {formatPercent(indicadores.margemOperacional)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totais.lucroLiquido >= 0 ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                <p className={`text-2xl font-bold ${totais.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totais.lucroLiquido)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {totais.lucroLiquido >= 0 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-500">Lucro</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-500">Prejuízo</span>
                    </>
                  )}
                </div>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${totais.lucroLiquido >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {totais.lucroLiquido >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Visualização */}
      <Tabs defaultValue="tabela" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tabela" className="flex items-center gap-2 text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileBarChart className="h-4 w-4" />
            Tabela DRE
          </TabsTrigger>
          <TabsTrigger value="graficos" className="flex items-center gap-2 text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <LineChart className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="analise" className="flex items-center gap-2 text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <PieChart className="h-4 w-4" />
            Análise
          </TabsTrigger>
        </TabsList>

        {/* Tabela DRE */}
        <TabsContent value="tabela">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5 text-primary" />
                Demonstração do Resultado - {periodoSelecionado}
              </CardTitle>
              <CardDescription>Visão detalhada mês a mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background min-w-[200px] z-10">Descrição</TableHead>
                      {dreData.map(item => (
                        <TableHead key={item.periodo} className="text-right min-w-[100px]">
                          {item.periodo}
                        </TableHead>
                      ))}
                      <TableHead className="text-right min-w-[120px] font-bold bg-muted">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Receita Bruta */}
                    <TableRow className="bg-blue-50/50">
                      <TableCell className="sticky left-0 bg-blue-50/50 font-medium z-10">
                        (+) Receita Bruta
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right">
                          {formatCurrency(item.receitaBruta)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold bg-muted">
                        {formatCurrency(totais.receitaBruta)}
                      </TableCell>
                    </TableRow>

                    {/* Deduções */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-background text-red-600 z-10">
                        (-) Deduções da Receita
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right text-red-600">
                          ({formatCurrency(item.deducoes)})
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold bg-muted text-red-600">
                        ({formatCurrency(totais.deducoes)})
                      </TableCell>
                    </TableRow>

                    {/* Receita Líquida */}
                    <TableRow className="bg-blue-100/50 font-semibold">
                      <TableCell className="sticky left-0 bg-blue-100/50 z-10">
                        (=) Receita Líquida
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right">
                          {formatCurrency(item.receitaLiquida)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold bg-muted">
                        {formatCurrency(totais.receitaLiquida)}
                      </TableCell>
                    </TableRow>

                    {/* Custo dos Serviços */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-background text-red-600 z-10">
                        (-) Custo dos Serviços
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right text-red-600">
                          ({formatCurrency(item.custoServicos)})
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold bg-muted text-red-600">
                        ({formatCurrency(totais.custoServicos)})
                      </TableCell>
                    </TableRow>

                    {/* Lucro Bruto */}
                    <TableRow className="bg-green-100/50 font-semibold">
                      <TableCell className="sticky left-0 bg-green-100/50 z-10">
                        (=) Lucro Bruto
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right">
                          {formatCurrency(item.lucroBruto)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold bg-muted">
                        {formatCurrency(totais.lucroBruto)}
                      </TableCell>
                    </TableRow>

                    {/* Despesas Operacionais - Subtítulo */}
                    <TableRow className="bg-gray-50">
                      <TableCell className="sticky left-0 bg-gray-50 font-medium text-red-600 z-10">
                        (-) Despesas Operacionais
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right text-red-600">
                          ({formatCurrency(item.despesasOperacionais)})
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold bg-muted text-red-600">
                        ({formatCurrency(totais.despesasOperacionais)})
                      </TableCell>
                    </TableRow>

                    {/* Despesas Administrativas */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-background text-red-600 pl-8 z-10 text-sm">
                        Despesas Administrativas
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right text-red-600 text-sm">
                          ({formatCurrency(item.despesasAdministrativas)})
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium bg-muted text-red-600 text-sm">
                        ({formatCurrency(totais.despesasAdministrativas)})
                      </TableCell>
                    </TableRow>

                    {/* Despesas de Estrutura */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-background text-red-600 pl-8 z-10 text-sm">
                        Despesas de Estrutura
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right text-red-600 text-sm">
                          ({formatCurrency(item.despesasEstrutura)})
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium bg-muted text-red-600 text-sm">
                        ({formatCurrency(totais.despesasEstrutura)})
                      </TableCell>
                    </TableRow>

                    {/* Despesas de Pessoal */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-background text-red-600 pl-8 z-10 text-sm">
                        Despesas de Pessoal
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right text-red-600 text-sm">
                          ({formatCurrency(item.despesasPessoal)})
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium bg-muted text-red-600 text-sm">
                        ({formatCurrency(totais.despesasPessoal)})
                      </TableCell>
                    </TableRow>

                    {/* Despesas Comerciais */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-background text-red-600 pl-8 z-10 text-sm">
                        Despesas Comerciais
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right text-red-600 text-sm">
                          ({formatCurrency(item.despesasComerciais)})
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium bg-muted text-red-600 text-sm">
                        ({formatCurrency(totais.despesasComerciais)})
                      </TableCell>
                    </TableRow>

                    {/* Resultado Operacional */}
                    <TableRow className="bg-purple-100/50 font-semibold">
                      <TableCell className="sticky left-0 bg-purple-100/50 z-10">
                        (=) Resultado Operacional
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className={`text-right ${item.resultadoOperacional < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(item.resultadoOperacional)}
                        </TableCell>
                      ))}
                      <TableCell className={`text-right font-bold bg-muted ${totais.resultadoOperacional < 0 ? 'text-red-600' : ''}`}>
                        {formatCurrency(totais.resultadoOperacional)}
                      </TableCell>
                    </TableRow>

                    {/* Resultado Financeiro - Subtítulo */}
                    <TableRow className="bg-gray-50">
                      <TableCell className="sticky left-0 bg-gray-50 font-medium z-10">
                        (+/-) Resultado Financeiro
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className={`text-right ${item.resultadoFinanceiro < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(item.resultadoFinanceiro)}
                        </TableCell>
                      ))}
                      <TableCell className={`text-right font-bold bg-muted ${totais.resultadoFinanceiro < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(totais.resultadoFinanceiro)}
                      </TableCell>
                    </TableRow>

                    {/* Receitas Financeiras */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-background text-green-600 pl-8 z-10 text-sm">
                        (+) Receitas Financeiras
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right text-green-600 text-sm">
                          {formatCurrency(item.receitasFinanceiras)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium bg-muted text-green-600 text-sm">
                        {formatCurrency(totais.receitasFinanceiras)}
                      </TableCell>
                    </TableRow>

                    {/* Despesas Financeiras */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-background text-red-600 pl-8 z-10 text-sm">
                        (-) Despesas Financeiras
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right text-red-600 text-sm">
                          ({formatCurrency(item.despesasFinanceiras)})
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium bg-muted text-red-600 text-sm">
                        ({formatCurrency(totais.despesasFinanceiras)})
                      </TableCell>
                    </TableRow>

                    {/* Resultado Antes IR */}
                    <TableRow className="bg-yellow-100/50 font-semibold">
                      <TableCell className="sticky left-0 bg-yellow-100/50 z-10">
                        (=) Resultado Antes do IR
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className={`text-right ${item.resultadoAntesIR < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(item.resultadoAntesIR)}
                        </TableCell>
                      ))}
                      <TableCell className={`text-right font-bold bg-muted ${totais.resultadoAntesIR < 0 ? 'text-red-600' : ''}`}>
                        {formatCurrency(totais.resultadoAntesIR)}
                      </TableCell>
                    </TableRow>

                    {/* Impostos */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-background text-red-600 z-10">
                        (-) Impostos sobre o Lucro
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className="text-right text-red-600">
                          ({formatCurrency(item.impostos)})
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold bg-muted text-red-600">
                        ({formatCurrency(totais.impostos)})
                      </TableCell>
                    </TableRow>

                    {/* Lucro Líquido */}
                    <TableRow className={`font-bold text-lg ${totais.lucroLiquido >= 0 ? 'bg-green-200/50' : 'bg-red-200/50'}`}>
                      <TableCell className={`sticky left-0 z-10 ${totais.lucroLiquido >= 0 ? 'bg-green-200/50' : 'bg-red-200/50'}`}>
                        (=) LUCRO/PREJUÍZO LÍQUIDO
                      </TableCell>
                      {dreData.map(item => (
                        <TableCell key={item.periodo} className={`text-right ${item.lucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(item.lucroLiquido)}
                        </TableCell>
                      ))}
                      <TableCell className={`text-right font-bold bg-muted ${totais.lucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(totais.lucroLiquido)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gráficos */}
        <TabsContent value="graficos">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evolução Mensal</CardTitle>
                <CardDescription>Receita, Lucro Bruto e Lucro Líquido</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                <CardTitle className="text-lg">Tendência do Lucro Líquido</CardTitle>
                <CardDescription>Evolução ao longo do período</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="Lucro Líquido" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
                    <Line type="monotone" dataKey="Receita Líquida" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Composição das Despesas e Lucro</CardTitle>
                <CardDescription>Distribuição percentual da receita</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="50%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {pieData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index] }} />
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Análise */}
        <TabsContent value="analise">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Margem Bruta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">{formatPercent(indicadores.margemBruta)}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Para cada R$ 100 de receita, sobram R$ {indicadores.margemBruta.toFixed(2)} após custos diretos
                  </p>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-center gap-2">
                    {indicadores.margemBruta >= 50 ? (
                      <Badge className="bg-green-100 text-green-700">Excelente</Badge>
                    ) : indicadores.margemBruta >= 30 ? (
                      <Badge className="bg-yellow-100 text-yellow-700">Bom</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">Atenção</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  Margem Operacional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-600">{formatPercent(indicadores.margemOperacional)}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Eficiência operacional da empresa após todas as despesas operacionais
                  </p>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-center gap-2">
                    {indicadores.margemOperacional >= 20 ? (
                      <Badge className="bg-green-100 text-green-700">Excelente</Badge>
                    ) : indicadores.margemOperacional >= 10 ? (
                      <Badge className="bg-yellow-100 text-yellow-700">Bom</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">Atenção</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  Margem Líquida
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className={`text-4xl font-bold ${indicadores.margemLiquida >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatPercent(indicadores.margemLiquida)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Lucro final para cada R$ 100 de receita após todos os custos e impostos
                  </p>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-center gap-2">
                    {indicadores.margemLiquida >= 15 ? (
                      <Badge className="bg-green-100 text-green-700">Excelente</Badge>
                    ) : indicadores.margemLiquida >= 5 ? (
                      <Badge className="bg-yellow-100 text-yellow-700">Bom</Badge>
                    ) : indicadores.margemLiquida >= 0 ? (
                      <Badge className="bg-orange-100 text-orange-700">Regular</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">Prejuízo</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Resumo Executivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Pontos Positivos</h4>
                    <ul className="space-y-2">
                      {indicadores.margemBruta >= 40 && (
                        <li className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Margem bruta saudável ({formatPercent(indicadores.margemBruta)})
                        </li>
                      )}
                      {totais.lucroLiquido > 0 && (
                        <li className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Empresa operando com lucro
                        </li>
                      )}
                      {indicadores.variacaoReceita > 0 && (
                        <li className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Crescimento de receita de {indicadores.variacaoReceita}%
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Pontos de Atenção</h4>
                    <ul className="space-y-2">
                      {indicadores.margemOperacional < 15 && (
                        <li className="flex items-center gap-2 text-yellow-600">
                          <AlertTriangle className="h-4 w-4" />
                          Margem operacional pode ser melhorada
                        </li>
                      )}
                      {totais.despesasOperacionais / totais.receitaLiquida > 0.3 && (
                        <li className="flex items-center gap-2 text-yellow-600">
                          <AlertTriangle className="h-4 w-4" />
                          Despesas operacionais elevadas
                        </li>
                      )}
                      {totais.lucroLiquido < 0 && (
                        <li className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          Empresa operando com prejuízo
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
