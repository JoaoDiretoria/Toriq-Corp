import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, getMonth, getYear, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Receipt,
  Building2,
  Users,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Target,
  Percent,
  Activity,
  Landmark,
  ChevronDown,
  ChevronUp,
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
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const ANOS = Array.from({ length: 11 }, (_, i) => String(2020 + i));

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

interface ContaPagar {
  id: string;
  fornecedor_nome: string;
  descricao: string;
  valor: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string | null;
  categoria?: string;
  coluna_id: string;
}

interface ContaReceber {
  id: string;
  cliente_nome: string;
  servico_produto: string;
  valor: number;
  valor_pago: number;
  data_recebimento: string;
  data_pagamento?: string | null;
  categoria?: string;
  coluna_id: string;
}

interface ContaBancaria {
  id: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo: string;
  descricao: string;
  saldo_inicial: number;
  ativo: boolean;
}

// Componente de Gauge/Velocímetro para indicadores
function GaugeIndicator({ 
  value, 
  label, 
  meta = 100,
  color = 'green'
}: { 
  value: number; 
  label: string;
  meta?: number;
  color?: 'green' | 'yellow' | 'red';
}) {
  const percentage = Math.min((value / meta) * 100, 100);
  const colorClasses = {
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-12 overflow-hidden">
        <div className="absolute w-24 h-24 rounded-full border-8 border-gray-200" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }} />
        <div 
          className={`absolute w-24 h-24 rounded-full border-8 ${color === 'green' ? 'border-green-500' : color === 'yellow' ? 'border-yellow-500' : 'border-red-500'}`}
          style={{ 
            clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
            transform: `rotate(${(percentage / 100) * 180 - 180}deg)`,
            transformOrigin: 'center center'
          }} 
        />
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className={`text-lg font-bold ${colorClasses[color]}`}>{value.toFixed(1)}%</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );
}

// Componente de Card de Métrica
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  color = 'primary',
  onClick
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'green' | 'red' | 'orange' | 'blue' | 'purple';
  onClick?: () => void;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            ) : null}
            <span className={`text-xs ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminFinanceiroDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [anoSelecionado, setAnoSelecionado] = useState(String(new Date().getFullYear()));
  const [mesSelecionado, setMesSelecionado] = useState(String(new Date().getMonth()));
  
  // Dados
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contasPagarRes, contasReceberRes, contasBancariasRes] = await Promise.all([
        (supabase as any).from('contas_pagar').select('*').eq('empresa_id', TORIQ_EMPRESA_ID),
        (supabase as any).from('contas_receber').select('*').eq('empresa_id', TORIQ_EMPRESA_ID),
        (supabase as any).from('contas_bancarias').select('*').eq('empresa_id', TORIQ_EMPRESA_ID).eq('ativo', true),
      ]);

      if (contasPagarRes.data) setContasPagar(contasPagarRes.data as ContaPagar[]);
      if (contasReceberRes.data) setContasReceber(contasReceberRes.data as ContaReceber[]);
      if (contasBancariasRes.data) setContasBancarias(contasBancariasRes.data as ContaBancaria[]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar dados do dashboard', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar dados pelo período selecionado
  const dadosFiltrados = useMemo(() => {
    const ano = parseInt(anoSelecionado);
    const mes = parseInt(mesSelecionado);

    const filtrarPorPeriodo = (data: string | null | undefined) => {
      if (!data) return false;
      try {
        const d = parseISO(data);
        return getYear(d) === ano && getMonth(d) === mes;
      } catch { return false; }
    };

    const contasPagarMes = contasPagar.filter(c => filtrarPorPeriodo(c.data_pagamento || c.data_vencimento));
    const contasReceberMes = contasReceber.filter(c => filtrarPorPeriodo(c.data_pagamento || c.data_recebimento));

    return { contasPagarMes, contasReceberMes };
  }, [anoSelecionado, mesSelecionado, contasPagar, contasReceber]);

  // Calcular totais do período
  const totaisPeriodo = useMemo(() => {
    const { contasPagarMes, contasReceberMes } = dadosFiltrados;

    const totalReceber = contasReceberMes.reduce((sum, c) => sum + Number(c.valor || 0), 0);
    const totalPagar = contasPagarMes.reduce((sum, c) => sum + Number(c.valor || 0), 0);
    const totalRecebido = contasReceberMes.filter(c => c.data_pagamento).reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);
    const totalPago = contasPagarMes.filter(c => c.data_pagamento).reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);

    return {
      totalReceber,
      totalPagar,
      totalRecebido,
      totalPago,
      saldoPrevisto: totalReceber - totalPagar,
      saldoRealizado: totalRecebido - totalPago,
    };
  }, [dadosFiltrados]);

  // Calcular DRE resumido
  const dreResumo = useMemo(() => {
    const { contasPagarMes, contasReceberMes } = dadosFiltrados;

    const receitaBruta = contasReceberMes.reduce((sum, c) => sum + Number(c.valor || 0), 0);
    const deducoes = receitaBruta * 0.05; // 5% de deduções
    const receitaLiquida = receitaBruta - deducoes;

    // Custos e despesas por categoria
    const custoServicos = contasPagarMes
      .filter(c => (c.categoria || '').toLowerCase().includes('custo'))
      .reduce((sum, c) => sum + Number(c.valor || 0), 0);

    const lucroBruto = receitaLiquida - custoServicos;

    const despesasOperacionais = contasPagarMes
      .filter(c => {
        const cat = (c.categoria || '').toLowerCase();
        return !cat.includes('custo') && !cat.includes('financ');
      })
      .reduce((sum, c) => sum + Number(c.valor || 0), 0);

    const resultadoOperacional = lucroBruto - despesasOperacionais;

    const despesasFinanceiras = contasPagarMes
      .filter(c => (c.categoria || '').toLowerCase().includes('financ'))
      .reduce((sum, c) => sum + Number(c.valor || 0), 0);

    const resultadoAntesIR = resultadoOperacional - despesasFinanceiras;
    const impostos = resultadoAntesIR > 0 ? resultadoAntesIR * 0.15 : 0;
    const lucroLiquido = resultadoAntesIR - impostos;

    // Margens
    const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
    const margemOperacional = receitaLiquida > 0 ? (resultadoOperacional / receitaLiquida) * 100 : 0;
    const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

    return {
      receitaBruta,
      deducoes,
      receitaLiquida,
      custoServicos,
      lucroBruto,
      despesasOperacionais,
      resultadoOperacional,
      despesasFinanceiras,
      resultadoAntesIR,
      impostos,
      lucroLiquido,
      margemBruta,
      margemOperacional,
      margemLiquida,
    };
  }, [dadosFiltrados]);

  // Dados para gráfico de fluxo de caixa mensal
  const fluxoCaixaMensal = useMemo(() => {
    const ano = parseInt(anoSelecionado);

    return MESES.map((mes, index) => {
      const entradas = contasReceber
        .filter(c => {
          const data = c.data_pagamento || c.data_recebimento;
          if (!data) return false;
          try {
            const d = parseISO(data);
            return getYear(d) === ano && getMonth(d) === index;
          } catch { return false; }
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);

      const saidas = contasPagar
        .filter(c => {
          const data = c.data_pagamento || c.data_vencimento;
          if (!data) return false;
          try {
            const d = parseISO(data);
            return getYear(d) === ano && getMonth(d) === index;
          } catch { return false; }
        })
        .reduce((sum, c) => sum + Number(c.valor || 0), 0);

      return {
        mes,
        entradas,
        saidas,
        resultado: entradas - saidas,
      };
    });
  }, [anoSelecionado, contasPagar, contasReceber]);

  // Distribuição de despesas por categoria
  const distribuicaoDespesas = useMemo(() => {
    const { contasPagarMes } = dadosFiltrados;
    const categorias: Record<string, number> = {};

    contasPagarMes.forEach(c => {
      const cat = c.categoria || 'Outros';
      categorias[cat] = (categorias[cat] || 0) + Number(c.valor || 0);
    });

    return Object.entries(categorias)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [dadosFiltrados]);

  // Distribuição de receitas por categoria
  const distribuicaoReceitas = useMemo(() => {
    const { contasReceberMes } = dadosFiltrados;
    const categorias: Record<string, number> = {};

    contasReceberMes.forEach(c => {
      const cat = c.categoria || 'Receitas Operacionais';
      categorias[cat] = (categorias[cat] || 0) + Number(c.valor || 0);
    });

    return Object.entries(categorias)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [dadosFiltrados]);

  // Maiores clientes
  const maioresClientes = useMemo(() => {
    const { contasReceberMes } = dadosFiltrados;
    const clientes: Record<string, number> = {};

    contasReceberMes.forEach(c => {
      const cliente = c.cliente_nome || 'Não informado';
      clientes[cliente] = (clientes[cliente] || 0) + Number(c.valor || 0);
    });

    const total = Object.values(clientes).reduce((sum, v) => sum + v, 0);

    return Object.entries(clientes)
      .map(([nome, valor]) => ({ nome, valor, percentual: total > 0 ? (valor / total) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [dadosFiltrados]);

  // Maiores fornecedores
  const maioresFornecedores = useMemo(() => {
    const { contasPagarMes } = dadosFiltrados;
    const fornecedores: Record<string, number> = {};

    contasPagarMes.forEach(c => {
      const fornecedor = c.fornecedor_nome || 'Não informado';
      fornecedores[fornecedor] = (fornecedores[fornecedor] || 0) + Number(c.valor || 0);
    });

    const total = Object.values(fornecedores).reduce((sum, v) => sum + v, 0);

    return Object.entries(fornecedores)
      .map(([nome, valor]) => ({ nome, valor, percentual: total > 0 ? (valor / total) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [dadosFiltrados]);

  // Saldo por banco
  const saldoPorBanco = useMemo(() => {
    return contasBancarias.map(banco => {
      // Calcular movimentações do banco
      const entradas = contasReceber
        .filter(c => c.data_pagamento)
        .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);

      const saidas = contasPagar
        .filter(c => c.data_pagamento)
        .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);

      // Distribuir proporcionalmente entre os bancos (simplificado)
      const numBancos = contasBancarias.length || 1;
      const saldoAtual = banco.saldo_inicial + (entradas - saidas) / numBancos;

      return {
        ...banco,
        saldoAtual,
      };
    });
  }, [contasBancarias, contasPagar, contasReceber]);

  // Indicadores de saúde financeira
  const indicadoresSaude = useMemo(() => {
    const { margemBruta, margemOperacional, margemLiquida, lucroLiquido } = dreResumo;

    const getStatusMargem = (valor: number, meta: number) => {
      if (valor >= meta) return 'green';
      if (valor >= meta * 0.7) return 'yellow';
      return 'red';
    };

    return {
      margemBruta: { valor: margemBruta, status: getStatusMargem(margemBruta, 40) },
      margemOperacional: { valor: margemOperacional, status: getStatusMargem(margemOperacional, 25) },
      margemLiquida: { valor: margemLiquida, status: getStatusMargem(margemLiquida, 20) },
      lucroLiquido: { valor: lucroLiquido, status: lucroLiquido >= 0 ? 'green' : 'red' },
    };
  }, [dreResumo]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão geral da saúde financeira da empresa</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ano:</span>
          <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANOS.map(ano => (
                <SelectItem key={ano} value={ano}>{ano}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mês:</span>
          <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES_COMPLETOS.map((mes, index) => (
                <SelectItem key={index} value={String(index)}>{mes}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Resumo Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Contas a Pagar</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totaisPeriodo.totalPagar)}</p>
              </div>
              <div className="p-2 rounded-full bg-red-100">
                <CreditCard className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Contas a Receber</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totaisPeriodo.totalReceber)}</p>
              </div>
              <div className="p-2 rounded-full bg-green-100">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saldo Atual</p>
                <p className={`text-2xl font-bold ${totaisPeriodo.saldoRealizado >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(totaisPeriodo.saldoRealizado)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-blue-100">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Resultado Líquido</p>
                <p className={`text-2xl font-bold ${dreResumo.lucroLiquido >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {formatCurrency(dreResumo.lucroLiquido)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Saldo por Bancos e DRE Resumido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Saldo por Bancos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Saldo por Bancos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {saldoPorBanco.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conta bancária cadastrada</p>
                ) : (
                  saldoPorBanco.map(banco => (
                    <div key={banco.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{banco.banco}</p>
                          <p className="text-xs text-muted-foreground">{banco.descricao}</p>
                        </div>
                      </div>
                      <span className={`font-bold ${banco.saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(banco.saldoAtual)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* DRE Resumido */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              DRE - Demonstrativo do Resultado ({MESES_COMPLETOS[parseInt(mesSelecionado)]}/{anoSelecionado})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-sm">(+) Receita Bruta</span>
                  <span className="font-medium text-green-600">{formatCurrency(dreResumo.receitaBruta)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-sm text-red-600">(-) Deduções</span>
                  <span className="font-medium text-red-600">({formatCurrency(dreResumo.deducoes)})</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b bg-blue-50 px-2 rounded">
                  <span className="text-sm font-medium">(=) Receita Líquida</span>
                  <span className="font-bold">{formatCurrency(dreResumo.receitaLiquida)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-sm text-red-600">(-) Custo dos Serviços</span>
                  <span className="font-medium text-red-600">({formatCurrency(dreResumo.custoServicos)})</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b bg-green-50 px-2 rounded">
                  <span className="text-sm font-medium">(=) Lucro Bruto</span>
                  <span className="font-bold">{formatCurrency(dreResumo.lucroBruto)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-sm text-red-600">(-) Despesas Operacionais</span>
                  <span className="font-medium text-red-600">({formatCurrency(dreResumo.despesasOperacionais)})</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b bg-purple-50 px-2 rounded">
                  <span className="text-sm font-medium">(=) Resultado Operacional</span>
                  <span className={`font-bold ${dreResumo.resultadoOperacional >= 0 ? '' : 'text-red-600'}`}>
                    {formatCurrency(dreResumo.resultadoOperacional)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-sm">(+/-) Resultado Financeiro</span>
                  <span className="font-medium text-red-600">({formatCurrency(dreResumo.despesasFinanceiras)})</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-sm text-red-600">(-) Impostos</span>
                  <span className="font-medium text-red-600">({formatCurrency(dreResumo.impostos)})</span>
                </div>
                <div className={`flex justify-between items-center py-1 px-2 rounded ${dreResumo.lucroLiquido >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <span className="text-sm font-bold">(=) Resultado Líquido</span>
                  <span className={`font-bold ${dreResumo.lucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(dreResumo.lucroLiquido)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores de Saúde Financeira */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Saúde dos Indicadores
          </CardTitle>
          <CardDescription>Análise das margens e indicadores financeiros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${indicadoresSaude.margemBruta.status === 'green' ? 'text-green-600' : indicadoresSaude.margemBruta.status === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
                {indicadoresSaude.margemBruta.valor.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Margem Bruta</p>
              <Badge variant={indicadoresSaude.margemBruta.status === 'green' ? 'default' : indicadoresSaude.margemBruta.status === 'yellow' ? 'secondary' : 'destructive'} className="mt-1">
                Meta: 40%
              </Badge>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${indicadoresSaude.margemOperacional.status === 'green' ? 'text-green-600' : indicadoresSaude.margemOperacional.status === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
                {indicadoresSaude.margemOperacional.valor.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Margem Operacional</p>
              <Badge variant={indicadoresSaude.margemOperacional.status === 'green' ? 'default' : indicadoresSaude.margemOperacional.status === 'yellow' ? 'secondary' : 'destructive'} className="mt-1">
                Meta: 25%
              </Badge>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${indicadoresSaude.margemLiquida.status === 'green' ? 'text-green-600' : indicadoresSaude.margemLiquida.status === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
                {indicadoresSaude.margemLiquida.valor.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Margem Líquida</p>
              <Badge variant={indicadoresSaude.margemLiquida.status === 'green' ? 'default' : indicadoresSaude.margemLiquida.status === 'yellow' ? 'secondary' : 'destructive'} className="mt-1">
                Meta: 20%
              </Badge>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${indicadoresSaude.lucroLiquido.status === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                {indicadoresSaude.lucroLiquido.valor >= 0 ? (
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 mx-auto text-red-600" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Resultado</p>
              <Badge variant={indicadoresSaude.lucroLiquido.status === 'green' ? 'default' : 'destructive'} className="mt-1">
                {indicadoresSaude.lucroLiquido.status === 'green' ? 'Lucro' : 'Prejuízo'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Fluxo de Caixa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Fluxo de Caixa Previsto + Realizado ({anoSelecionado})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fluxoCaixaMensal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="entradas" name="Entradas" fill="#22c55e" />
              <Bar dataKey="saidas" name="Saídas" fill="#ef4444" />
              <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#8b5cf6" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição de Saídas e Entradas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Saídas no Período */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Saídas no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {distribuicaoDespesas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa no período</p>
                ) : (
                  distribuicaoDespesas.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-medium text-red-600">{formatCurrency(item.value)}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Entradas no Período */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Entradas no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {distribuicaoReceitas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma receita no período</p>
                ) : (
                  distribuicaoReceitas.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-medium text-green-600">{formatCurrency(item.value)}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Maiores Clientes e Fornecedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Maiores Clientes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              Maiores Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {maioresClientes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente no período</p>
                ) : (
                  maioresClientes.map((cliente, index) => (
                    <div key={cliente.nome} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className="shrink-0">{index + 1}º</Badge>
                        <span className="text-sm truncate">{cliente.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium text-green-600">{formatCurrency(cliente.valor)}</span>
                        <Badge variant="secondary" className="text-xs">{cliente.percentual.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Maiores Fornecedores */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-red-500" />
              Maiores Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {maioresFornecedores.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum fornecedor no período</p>
                ) : (
                  maioresFornecedores.map((fornecedor, index) => (
                    <div key={fornecedor.nome} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className="shrink-0">{index + 1}º</Badge>
                        <span className="text-sm truncate">{fornecedor.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium text-red-600">{formatCurrency(fornecedor.valor)}</span>
                        <Badge variant="secondary" className="text-xs">{fornecedor.percentual.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
