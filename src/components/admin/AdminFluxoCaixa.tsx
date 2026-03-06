import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmpresaEfetiva } from '@/hooks/useEmpresaMode';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWithinInterval, parseISO, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Calendar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

interface ContaPagar {
  id: string;
  numero: string;
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
  numero: string;
  cliente_nome: string;
  servico_produto: string;
  valor: number;
  valor_pago: number;
  data_recebimento: string;
  data_pagamento?: string | null;
  categoria?: string;
  coluna_id: string;
}

interface PlanoDespesa {
  id: string;
  nome: string;
  tipo: string;
}

interface PlanoReceita {
  id: string;
  nome: string;
  tipo: string;
  descricao?: string;
}

// Mapeamento de tipos de receita do banco para labels amigáveis
const TIPOS_RECEITA_LABELS: Record<string, string> = {
  'receitas_operacionais': 'Receitas Operacionais',
  'outras_receitas_operacionais': 'Outras Receitas Operacionais',
  'receitas_financeiras': 'Receitas Financeiras',
  'receitas_nao_operacionais': 'Receitas não Operacionais',
};

// Mapeamento de tipos de despesa do banco para labels amigáveis
const TIPOS_DESPESA_LABELS: Record<string, string> = {
  'deducoes_sobre_vendas': 'Deduções sobre Vendas',
  'custo_servico_prestado': 'Custo de Serviço Prestado',
  'despesas_administrativas': 'Despesas Administrativas',
  'despesas_estrutura': 'Despesas com Estrutura',
  'despesas_pessoal': 'Despesas com Pessoal',
  'despesas_comerciais': 'Despesas Comerciais',
  'despesas_financeiras': 'Despesas Financeiras',
  'despesas_nao_operacional': 'Despesas Não Operacional',
  'impostos': 'Impostos',
  'participacao_dividendos': 'Participação e Dividendos',
};

// Ordem de exibição dos tipos de despesa
const TIPOS_DESPESA_ORDEM = [
  'deducoes_sobre_vendas',
  'custo_servico_prestado',
  'despesas_administrativas',
  'despesas_estrutura',
  'despesas_pessoal',
  'despesas_comerciais',
  'despesas_financeiras',
  'despesas_nao_operacional',
  'impostos',
  'participacao_dividendos',
];

interface ContaBancaria {
  id: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo: 'corrente' | 'poupanca' | 'investimento';
  descricao: string;
  saldo_inicial: number;
  ativo: boolean;
}

const MESES = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' },
];

// Ordem de exibição dos tipos de receita
const TIPOS_RECEITA_ORDEM = [
  'receitas_operacionais',
  'outras_receitas_operacionais',
  'receitas_financeiras',
  'receitas_nao_operacionais',
];


// Descrições padrão por tipo de despesa (baseado no print da planilha)
const DESCRICOES_POR_TIPO: Record<string, string[]> = {
  'Despesas Administrativas': ['Luz', 'Água', 'Internet', 'Aluguel', 'Contador', 'Marketing', 'Segurança', 'Sistema', 'Limpeza', 'Sistemas', 'Advocacia'],
  'Despesas com Estrutura': ['Manutenção', 'Reformas', 'Equipamentos', 'Móveis'],
  'Despesas com Pessoal': ['Salários', 'FGTS', 'INSS', 'Vale Transporte', 'Vale Alimentação', 'Férias', '13º Salário', 'Rescisões'],
  'Despesas Comerciais': ['Comissões', 'Propaganda', 'Brindes', 'Eventos'],
  'Despesas Financeiras': ['Juros', 'Tarifas Bancárias', 'IOF', 'Multas'],
  'Deduções sobre Vendas': ['Impostos sobre Vendas', 'Devoluções', 'Descontos'],
  'Custo de Serviço Prestado': ['Materiais', 'Mão de Obra', 'Terceirização'],
  'Despesas Não Operacionais': ['Perdas', 'Doações', 'Outras Despesas'],
  'Impostos': ['IRPJ', 'CSLL', 'PIS', 'COFINS', 'ISS'],
  'Participações e Dividendos': ['Distribuição de Lucros', 'Participação nos Resultados'],
  'Receitas Operacionais': ['Vendas de Serviços', 'Consultoria', 'Treinamentos', 'Assessoria'],
  'Receitas Não Operacionais': ['Rendimentos Financeiros', 'Aluguéis Recebidos', 'Outras Receitas'],
  'Outras Receitas': ['Receitas Diversas'],
};

export function AdminFluxoCaixa() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [planoDespesas, setPlanoDespesas] = useState<PlanoDespesa[]>([]);
  const [planoReceitas, setPlanoReceitas] = useState<PlanoReceita[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  
  // Filtros
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [anoSelecionado, setAnoSelecionado] = useState(currentYear.toString());
  const [mesSelecionado, setMesSelecionado] = useState(currentMonth.toString());
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [contaFiltro, setContaFiltro] = useState('todas');
  const [centroCustoFiltro, setCentroCustoFiltro] = useState('todos');
  const [grupoDespesaFiltro, setGrupoDespesaFiltro] = useState('todos');

  // Calcular saldo inicial baseado na conta bancária selecionada
  const saldoInicial = useMemo(() => {
    if (contaFiltro === 'todas') {
      return contasBancarias.reduce((sum, conta) => sum + Number(conta.saldo_inicial || 0), 0);
    }
    const contaSelecionada = contasBancarias.find(c => c.id === contaFiltro);
    return contaSelecionada ? Number(contaSelecionada.saldo_inicial || 0) : 0;
  }, [contaFiltro, contasBancarias]);

  useEffect(() => {
    loadData();
  }, []);


  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar contas a pagar
      const { data: contasPagarData, error: contasPagarError } = await (supabase as any)
        .from('contas_pagar')
        .select('*')
        .eq('empresa_id', TORIQ_EMPRESA_ID)
        .eq('arquivado', false);
      
      if (contasPagarError) {
        console.error('Erro ao carregar contas a pagar:', contasPagarError);
      } else {
        setContasPagar(contasPagarData || []);
      }

      // Carregar contas a receber (pode não existir ainda)
      try {
        const { data: contasReceberData, error: contasReceberError } = await (supabase as any)
          .from('contas_receber')
          .select('*')
          .eq('empresa_id', TORIQ_EMPRESA_ID)
          .eq('arquivado', false);
        
        if (!contasReceberError) {
          setContasReceber(contasReceberData || []);
        } else {
          console.error('Erro ao carregar contas a receber:', contasReceberError);
        }
      } catch (e) {
        console.log('Tabela contas_receber não disponível:', e);
        setContasReceber([]);
      }

      // Carregar plano de despesas
      try {
        const { data: planoDespesasData, error: planoDespesasError } = await (supabase as any)
          .from('plano_despesas')
          .select('*')
          .eq('empresa_id', TORIQ_EMPRESA_ID);
        
        if (!planoDespesasError) {
          setPlanoDespesas(planoDespesasData || []);
        }
      } catch (e) {
        console.log('Tabela plano_despesas não disponível');
        setPlanoDespesas([]);
      }

      // Carregar plano de receitas
      try {
        const { data: planoReceitasData, error: planoReceitasError } = await (supabase as any)
          .from('plano_receitas')
          .select('*')
          .eq('empresa_id', TORIQ_EMPRESA_ID)
          .eq('ativo', true);
        
        if (!planoReceitasError) {
          setPlanoReceitas(planoReceitasData || []);
        }
      } catch (e) {
        console.log('Tabela plano_receitas não disponível');
        setPlanoReceitas([]);
      }

      // Carregar contas bancárias
      try {
        const { data: contasBancariasData, error: contasBancariasError } = await (supabase as any)
          .from('contas_bancarias')
          .select('*')
          .eq('empresa_id', TORIQ_EMPRESA_ID)
          .eq('ativo', true);
        
        if (!contasBancariasError) {
          setContasBancarias(contasBancariasData || []);
        }
      } catch (e) {
        console.log('Tabela contas_bancarias não disponível');
        setContasBancarias([]);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Calcular dados do fluxo de caixa mensal (Demonstrativo)
  const fluxoCaixaMensal = useMemo(() => {
    try {
      const ano = parseInt(anoSelecionado);
      const meses = eachMonthOfInterval({
        start: startOfYear(new Date(ano, 0, 1)),
        end: endOfYear(new Date(ano, 0, 1))
      });

      let saldoAcumulado = saldoInicial;
      
      return meses.map((mes, index) => {
        const inicioMes = startOfMonth(mes);
        const fimMes = endOfMonth(mes);

        // Filtrar contas a receber do mês
        const contasReceberMes = contasReceber.filter(c => {
          try {
            const dataRef = c.data_pagamento || c.data_recebimento;
            if (!dataRef) return false;
            const data = parseISO(dataRef);
            
            // Filtro de status (previsto, realizado, vencido)
            const isPago = !!c.data_pagamento;
            const hoje = new Date();
            const dataVencimento = c.data_recebimento ? parseISO(c.data_recebimento) : null;
            const isVencido = !isPago && dataVencimento && dataVencimento < hoje;
            
            if (statusFiltro === 'realizado' && !isPago) return false;
            if (statusFiltro === 'previsto' && (isPago || isVencido)) return false;
            if (statusFiltro === 'vencido' && !isVencido) return false;
            
            return isWithinInterval(data, { start: inicioMes, end: fimMes });
          } catch { return false; }
        });

        // Entradas do mês por tipo de receita (usando classificações do plano_receitas)
        const entradasPorTipo: Record<string, number> = {};
        TIPOS_RECEITA_ORDEM.forEach(tipoKey => {
          const tipoLabel = TIPOS_RECEITA_LABELS[tipoKey];
          entradasPorTipo[tipoKey] = contasReceberMes
            .filter(c => (c.categoria || 'receitas_operacionais') === tipoKey || (c.categoria || 'Receitas Operacionais') === tipoLabel)
            .reduce((sum, c) => sum + Number(c.data_pagamento ? c.valor_pago : c.valor || 0), 0);
        });

        // Total de entradas do mês (soma de todas as contas, independente da categoria)
        const entradasMes = contasReceberMes.reduce((sum, c) => sum + Number(c.data_pagamento ? c.valor_pago : c.valor || 0), 0);

        // Filtrar contas a pagar do mês
        const contasPagarMes = contasPagar.filter(c => {
          try {
            const dataRef = c.data_pagamento || c.data_vencimento;
            if (!dataRef) return false;
            const data = parseISO(dataRef);
            
            // Filtro de status (previsto, realizado, vencido)
            const isPago = !!c.data_pagamento;
            const hoje = new Date();
            const dataVencimento = c.data_vencimento ? parseISO(c.data_vencimento) : null;
            const isVencido = !isPago && dataVencimento && dataVencimento < hoje;
            
            if (statusFiltro === 'realizado' && !isPago) return false;
            if (statusFiltro === 'previsto' && (isPago || isVencido)) return false;
            if (statusFiltro === 'vencido' && !isVencido) return false;
            
            return isWithinInterval(data, { start: inicioMes, end: fimMes });
          } catch { return false; }
        });

        // Saídas do mês por tipo de despesa (usando classificações do plano_despesas)
        const saidasPorTipo: Record<string, number> = {};
        TIPOS_DESPESA_ORDEM.forEach(tipoKey => {
          const tipoLabel = TIPOS_DESPESA_LABELS[tipoKey];
          saidasPorTipo[tipoKey] = contasPagarMes
            .filter(c => (c.categoria || 'despesas_administrativas') === tipoKey || (c.categoria || 'Despesas Administrativas') === tipoLabel)
            .reduce((sum, c) => sum + Number(c.data_pagamento ? c.valor_pago : c.valor || 0), 0);
        });

        // Total de saídas do mês (soma de todas as contas, independente da categoria)
        const totalSaidas = contasPagarMes.reduce((sum, c) => sum + Number(c.data_pagamento ? c.valor_pago : c.valor || 0), 0);
        const saldoMes = entradasMes - totalSaidas;
        
        if (index === 0) {
          saldoAcumulado = saldoInicial + saldoMes;
        } else {
          saldoAcumulado = saldoAcumulado + saldoMes;
        }

        return {
          mes: format(mes, 'MMMM', { locale: ptBR }),
          mesIndex: index,
          saldoInicial: index === 0 ? saldoInicial : saldoAcumulado - saldoMes,
          entradas: entradasMes,
          entradasPorTipo,
          saidasPorTipo,
          totalSaidas,
          saldo: saldoMes,
          saldoAcumulado,
        };
      });
    } catch (error) {
      console.error('Erro ao calcular fluxo mensal:', error);
      return [];
    }
  }, [anoSelecionado, contasPagar, contasReceber, saldoInicial, statusFiltro]);

  // Calcular fluxo de caixa diário
  const fluxoCaixaDiario = useMemo(() => {
    try {
      const ano = parseInt(anoSelecionado);
      const mes = parseInt(mesSelecionado);
      if (isNaN(mes)) return [];
      
      const inicioMes = startOfMonth(new Date(ano, mes, 1));
      const fimMes = endOfMonth(new Date(ano, mes, 1));
      
      // Mostrar apenas os dias do mês selecionado
      const dias = eachDayOfInterval({ start: inicioMes, end: fimMes });
      
      let saldoAcumulado = saldoInicial;
      
      return dias.map(dia => {
        const diaStr = format(dia, 'yyyy-MM-dd');
        
        // Entradas do dia (contas recebidas ou previstas)
        const entradasDia = contasReceber
          .filter(c => {
            const dataRef = c.data_pagamento || c.data_recebimento;
            if (!dataRef || !dataRef.startsWith(diaStr)) return false;
            
            const isPago = !!c.data_pagamento;
            const hoje = new Date();
            const dataVencimento = c.data_recebimento ? parseISO(c.data_recebimento) : null;
            const isVencido = !isPago && dataVencimento && dataVencimento < hoje;
            
            if (statusFiltro === 'realizado' && !isPago) return false;
            if (statusFiltro === 'previsto' && (isPago || isVencido)) return false;
            if (statusFiltro === 'vencido' && !isVencido) return false;
            return true;
          })
          .reduce((sum, c) => sum + Number(c.data_pagamento ? c.valor_pago : c.valor || 0), 0);

        // Saídas do dia (contas pagas ou previstas)
        const saidasDia = contasPagar
          .filter(c => {
            const dataRef = c.data_pagamento || c.data_vencimento;
            if (!dataRef || !dataRef.startsWith(diaStr)) return false;
            
            const isPago = !!c.data_pagamento;
            const hoje = new Date();
            const dataVencimento = c.data_vencimento ? parseISO(c.data_vencimento) : null;
            const isVencido = !isPago && dataVencimento && dataVencimento < hoje;
            
            if (statusFiltro === 'realizado' && !isPago) return false;
            if (statusFiltro === 'previsto' && (isPago || isVencido)) return false;
            if (statusFiltro === 'vencido' && !isVencido) return false;
            return true;
          })
          .reduce((sum, c) => sum + Number(c.data_pagamento ? c.valor_pago : c.valor || 0), 0);

        const saldoDia = entradasDia - saidasDia;
        saldoAcumulado = saldoAcumulado + saldoDia;

        return {
          data: dia,
          dataFormatada: format(dia, 'dd/MM/yyyy'),
          entradas: entradasDia,
          saidas: saidasDia,
          saldo: saldoDia,
          acumulado: saldoAcumulado,
        };
      });
    } catch (error) {
      console.error('Erro ao calcular fluxo diário:', error);
      return [];
    }
  }, [anoSelecionado, mesSelecionado, contasPagar, contasReceber, saldoInicial, statusFiltro]);

  // Filtrar contas a pagar
  const contasPagarFiltradas = useMemo(() => {
    const ano = parseInt(anoSelecionado);
    const mes = mesSelecionado === 'todos' ? null : parseInt(mesSelecionado);
    
    return contasPagar.filter(conta => {
      if (!conta.data_vencimento) return false;
      try {
        const dataVencimento = parseISO(conta.data_vencimento);
        const anoMatch = dataVencimento.getFullYear() === ano;
        const mesMatch = mes === null || dataVencimento.getMonth() === mes;
        
        // Filtro de status (previsto, realizado, vencido)
        const isPago = !!conta.data_pagamento;
        const hoje = new Date();
        const isVencido = !isPago && dataVencimento < hoje;
        
        let statusMatch = statusFiltro === 'todos';
        if (statusFiltro === 'realizado') statusMatch = isPago;
        if (statusFiltro === 'previsto') statusMatch = !isPago && !isVencido;
        if (statusFiltro === 'vencido') statusMatch = isVencido;
        
        return anoMatch && mesMatch && statusMatch;
      } catch {
        return false;
      }
    });
  }, [anoSelecionado, mesSelecionado, statusFiltro, contasPagar]);

  // Filtrar contas a receber
  const contasReceberFiltradas = useMemo(() => {
    const ano = parseInt(anoSelecionado);
    const mes = mesSelecionado === 'todos' ? null : parseInt(mesSelecionado);
    
    return contasReceber.filter(conta => {
      if (!conta.data_recebimento) return false;
      try {
        const dataRecebimento = parseISO(conta.data_recebimento);
        const anoMatch = dataRecebimento.getFullYear() === ano;
        const mesMatch = mes === null || dataRecebimento.getMonth() === mes;
        
        // Filtro de status (previsto, realizado, vencido)
        const isPago = !!conta.data_pagamento;
        const hoje = new Date();
        const isVencido = !isPago && dataRecebimento < hoje;
        
        let statusMatch = statusFiltro === 'todos';
        if (statusFiltro === 'realizado') statusMatch = isPago;
        if (statusFiltro === 'previsto') statusMatch = !isPago && !isVencido;
        if (statusFiltro === 'vencido') statusMatch = isVencido;
        
        return anoMatch && mesMatch && statusMatch;
      } catch {
        return false;
      }
    });
  }, [anoSelecionado, mesSelecionado, statusFiltro, contasReceber]);

  // Totais
  const totalAPagar = contasPagarFiltradas.reduce((sum, c) => sum + Number(c.valor || 0), 0);
  const totalAReceber = contasReceberFiltradas.reduce((sum, c) => sum + Number(c.valor || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const anos = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>
          <p className="text-muted-foreground">Acompanhe as entradas e saídas financeiras</p>
        </div>
      </div>

      <Tabs defaultValue="demonstrativo" className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-12 items-center justify-start gap-1 rounded-lg bg-muted p-1 min-w-max">
            <TabsTrigger value="demonstrativo" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">Demonstrativo do Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="diario" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">Fluxo de Caixa Diário</TabsTrigger>
            <TabsTrigger value="contas-pagar" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">Fluxo Contas a Pagar</TabsTrigger>
            <TabsTrigger value="contas-receber" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">Fluxo Contas a Receber</TabsTrigger>
          </TabsList>
        </div>

        {/* Aba Demonstrativo do Fluxo de Caixa */}
        <TabsContent value="demonstrativo" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Ano:</Label>
                  <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {anos.map(ano => (
                        <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Conta:</Label>
                  <Select value={contaFiltro} onValueChange={setContaFiltro}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Contas</SelectItem>
                      {contasBancarias.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.banco} - {conta.conta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Status:</Label>
                  <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="previsto">Previsto</SelectItem>
                      <SelectItem value="realizado">Realizado</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Centro de Custos:</Label>
                  <Select value={centroCustoFiltro} onValueChange={setCentroCustoFiltro}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="[&_td]:py-1 [&_th]:py-1.5">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold min-w-[180px]">Descrição</TableHead>
                      {fluxoCaixaMensal.map((mes, i) => (
                        <TableHead key={i} className="text-center min-w-[80px] capitalize">{mes.mes}</TableHead>
                      ))}
                      <TableHead className="text-center min-w-[100px] font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Saldo Inicial */}
                    <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                      <TableCell className="font-semibold">Saldo Inicial</TableCell>
                      {fluxoCaixaMensal.map((mes, i) => (
                        <TableCell key={i} className="text-center">{formatCurrency(mes.saldoInicial)}</TableCell>
                      ))}
                      <TableCell className="text-center font-bold">{formatCurrency(saldoInicial)}</TableCell>
                    </TableRow>

                    {/* Entradas */}
                    <TableRow className="bg-green-50 dark:bg-green-950/30">
                      <TableCell className="font-semibold text-green-700 dark:text-green-400">Entradas</TableCell>
                      {fluxoCaixaMensal.map((mes, i) => (
                        <TableCell key={i} className="text-center text-green-700 dark:text-green-400">
                          {formatCurrency(mes.entradas)}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(fluxoCaixaMensal.reduce((sum, m) => sum + m.entradas, 0))}
                      </TableCell>
                    </TableRow>

                    {/* Classificações de Receitas do Plano de Receitas */}
                    {TIPOS_RECEITA_ORDEM.map(tipoKey => {
                      const tipoLabel = TIPOS_RECEITA_LABELS[tipoKey];
                      const totalTipo = fluxoCaixaMensal.reduce((sum, m) => sum + (m.entradasPorTipo?.[tipoKey] || 0), 0);
                      
                      return (
                        <TableRow key={tipoKey} className="bg-green-50/30 dark:bg-green-950/10">
                          <TableCell className="pl-6 text-green-700 dark:text-green-400">
                            {tipoLabel}
                          </TableCell>
                          {fluxoCaixaMensal.map((mes, i) => (
                            <TableCell key={i} className="text-center text-green-700 dark:text-green-400">
                              {formatCurrency(mes.entradasPorTipo?.[tipoKey] || 0)}
                            </TableCell>
                          ))}
                          <TableCell className="text-center text-green-700 dark:text-green-400">
                            {formatCurrency(totalTipo)}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Saídas */}
                    <TableRow className="bg-red-50 dark:bg-red-950/30">
                      <TableCell className="font-semibold text-red-700 dark:text-red-400">Saídas</TableCell>
                      {fluxoCaixaMensal.map((mes, i) => (
                        <TableCell key={i} className="text-center text-red-700 dark:text-red-400">
                          {formatCurrency(mes.totalSaidas)}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold text-red-700 dark:text-red-400">
                        {formatCurrency(fluxoCaixaMensal.reduce((sum, m) => sum + m.totalSaidas, 0))}
                      </TableCell>
                    </TableRow>

                    {/* Classificações de Despesas do Plano de Despesas */}
                    {TIPOS_DESPESA_ORDEM.map(tipoKey => {
                      const tipoLabel = TIPOS_DESPESA_LABELS[tipoKey];
                      const totalTipo = fluxoCaixaMensal.reduce((sum, m) => sum + (m.saidasPorTipo?.[tipoKey] || 0), 0);
                      
                      return (
                        <TableRow key={tipoKey} className="bg-red-50/30 dark:bg-red-950/10">
                          <TableCell className="pl-6 text-red-700 dark:text-red-400">
                            {tipoLabel}
                          </TableCell>
                          {fluxoCaixaMensal.map((mes, i) => (
                            <TableCell key={i} className="text-center text-red-700 dark:text-red-400">
                              {formatCurrency(mes.saidasPorTipo?.[tipoKey] || 0)}
                            </TableCell>
                          ))}
                          <TableCell className="text-center text-red-700 dark:text-red-400">
                            {formatCurrency(totalTipo)}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Resultado do Mês */}
                    <TableRow className="bg-yellow-50 dark:bg-yellow-950/30 font-semibold">
                      <TableCell className="font-bold">Resultado do Mês</TableCell>
                      {fluxoCaixaMensal.map((mes, i) => (
                        <TableCell key={i} className={`text-center font-semibold ${mes.saldo >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                          {formatCurrency(mes.saldo)}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold">
                        {formatCurrency(fluxoCaixaMensal.reduce((sum, m) => sum + m.saldo, 0))}
                      </TableCell>
                    </TableRow>

                    {/* Disponível */}
                    <TableRow className="bg-primary/10 font-bold">
                      <TableCell className="font-bold">Disponível</TableCell>
                      {fluxoCaixaMensal.map((mes, i) => (
                        <TableCell key={i} className={`text-center font-bold ${mes.saldoAcumulado >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                          {formatCurrency(mes.saldoAcumulado)}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold">
                        {formatCurrency(fluxoCaixaMensal[fluxoCaixaMensal.length - 1]?.saldoAcumulado || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Seção de detalhamento por grupo de contas */}
              <div className="mt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Label>Selecione um grupo de contas para análise:</Label>
                  <Select value={grupoDespesaFiltro} onValueChange={setGrupoDespesaFiltro}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem disabled value="receitas-header" className="font-bold text-green-600">— CLASSIFICAÇÃO DE RECEITAS —</SelectItem>
                      {TIPOS_RECEITA_ORDEM.map(tipoKey => (
                        <SelectItem key={tipoKey} value={`receita:${tipoKey}`}>{TIPOS_RECEITA_LABELS[tipoKey]}</SelectItem>
                      ))}
                      <SelectItem disabled value="despesas-header" className="font-bold text-red-600">— CLASSIFICAÇÃO DE DESPESAS —</SelectItem>
                      {TIPOS_DESPESA_ORDEM.map(tipoKey => (
                        <SelectItem key={tipoKey} value={`despesa:${tipoKey}`}>{TIPOS_DESPESA_LABELS[tipoKey]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {grupoDespesaFiltro !== 'todos' && (() => {
                  const isReceita = grupoDespesaFiltro.startsWith('receita:');
                  const tipoSelecionado = grupoDespesaFiltro.replace('receita:', '').replace('despesa:', '');
                  const tipoLabel = isReceita ? TIPOS_RECEITA_LABELS[tipoSelecionado] : TIPOS_DESPESA_LABELS[tipoSelecionado];
                  
                  // Buscar descrições cadastradas no plano de receitas ou despesas
                  const descricoesCadastradas = isReceita
                    ? planoReceitas.filter(r => r.tipo === tipoSelecionado).map(r => r.nome)
                    : planoDespesas.filter(d => d.tipo === tipoSelecionado).map(d => d.nome);
                  
                  return (
                    <Table className="[&_td]:py-1 [&_th]:py-1.5">
                      <TableHeader>
                        <TableRow className={isReceita ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}>
                          <TableHead className="font-bold min-w-[180px]">{tipoLabel}</TableHead>
                          {fluxoCaixaMensal.map((mes, i) => (
                            <TableHead key={i} className="text-center capitalize min-w-[80px]">{mes.mes}</TableHead>
                          ))}
                          <TableHead className="text-center font-bold min-w-[100px]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {descricoesCadastradas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={14} className="text-center text-muted-foreground py-4">
                              Nenhuma descrição cadastrada para esta classificação
                            </TableCell>
                          </TableRow>
                        ) : (
                          descricoesCadastradas.map(descricao => (
                            <TableRow key={descricao}>
                              <TableCell>{descricao}</TableCell>
                              {fluxoCaixaMensal.map((mes, i) => {
                                const ano = parseInt(anoSelecionado);
                                const inicioMes = startOfMonth(new Date(ano, i, 1));
                                const fimMes = endOfMonth(new Date(ano, i, 1));
                                
                                const valor = isReceita
                                  ? contasReceber
                                      .filter(c => {
                                        try {
                                          const dataRef = c.data_pagamento || c.data_recebimento;
                                          if (!dataRef) return false;
                                          const data = parseISO(dataRef);
                                          // Filtrar por descrição (servico_produto ou categoria que contenha a descrição)
                                          const matchDescricao = c.servico_produto === descricao || 
                                                                 (c.categoria && c.categoria.includes(descricao));
                                          // Filtrar por tipo de classificação
                                          const matchTipo = c.categoria === tipoSelecionado || 
                                                           c.categoria === tipoLabel;
                                          return isWithinInterval(data, { start: inicioMes, end: fimMes }) && 
                                                 (matchDescricao || matchTipo);
                                        } catch { return false; }
                                      })
                                      .filter(c => c.servico_produto === descricao)
                                      .reduce((sum, c) => sum + Number(c.data_pagamento ? c.valor_pago : c.valor || 0), 0)
                                  : contasPagar
                                      .filter(c => {
                                        try {
                                          const dataRef = c.data_pagamento || c.data_vencimento;
                                          if (!dataRef) return false;
                                          const data = parseISO(dataRef);
                                          return isWithinInterval(data, { start: inicioMes, end: fimMes }) && 
                                                 c.descricao === descricao;
                                        } catch { return false; }
                                      })
                                      .reduce((sum, c) => sum + Number(c.data_pagamento ? c.valor_pago : c.valor || 0), 0);
                                return (
                                  <TableCell key={i} className={`text-center ${isReceita ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {formatCurrency(valor)}
                                  </TableCell>
                                );
                              })}
                              <TableCell className={`text-center font-semibold ${isReceita ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                {formatCurrency(
                                  isReceita
                                    ? contasReceber
                                        .filter(c => {
                                          const ano = parseInt(anoSelecionado);
                                          const dataRef = c.data_pagamento || c.data_recebimento;
                                          if (!dataRef) return false;
                                          try {
                                            const data = parseISO(dataRef);
                                            return data.getFullYear() === ano && c.servico_produto === descricao;
                                          } catch { return false; }
                                        })
                                        .reduce((sum, c) => sum + Number(c.data_pagamento ? c.valor_pago : c.valor || 0), 0)
                                    : contasPagar
                                        .filter(c => {
                                          const ano = parseInt(anoSelecionado);
                                          const dataRef = c.data_pagamento || c.data_vencimento;
                                          if (!dataRef) return false;
                                          try {
                                            const data = parseISO(dataRef);
                                            return data.getFullYear() === ano && c.descricao === descricao;
                                          } catch { return false; }
                                        })
                                        .reduce((sum, c) => sum + Number(c.data_pagamento ? c.valor_pago : c.valor || 0), 0)
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        {/* Linha de Total */}
                        <TableRow className={isReceita ? 'bg-green-100 dark:bg-green-900/30 font-bold' : 'bg-red-100 dark:bg-red-900/30 font-bold'}>
                          <TableCell className="font-bold">Total {tipoLabel}</TableCell>
                          {fluxoCaixaMensal.map((mes, i) => (
                            <TableCell key={i} className="text-center font-bold">
                              {formatCurrency(isReceita ? (mes.entradasPorTipo?.[tipoSelecionado] || 0) : (mes.saidasPorTipo?.[tipoSelecionado] || 0))}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold">
                            {formatCurrency(fluxoCaixaMensal.reduce((sum, m) => sum + (isReceita ? (m.entradasPorTipo?.[tipoSelecionado] || 0) : (m.saidasPorTipo?.[tipoSelecionado] || 0)), 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Fluxo de Caixa Diário */}
        <TabsContent value="diario" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Ano:</Label>
                  <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {anos.map(ano => (
                        <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Mês:</Label>
                  <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map(mes => (
                        <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Conta:</Label>
                  <Select value={contaFiltro} onValueChange={setContaFiltro}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Contas</SelectItem>
                      {contasBancarias.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.banco} - {conta.conta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Status:</Label>
                  <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="previsto">Previsto</SelectItem>
                      <SelectItem value="realizado">Realizado</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <h3 className="font-semibold mb-4 text-center">FLUXO DIÁRIO</h3>
                  <div className="overflow-y-auto max-h-[600px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow className="bg-primary/10">
                          <TableHead className="font-bold">DIA</TableHead>
                          <TableHead className="text-right font-bold">ENTRADAS</TableHead>
                          <TableHead className="text-right font-bold">SAÍDAS</TableHead>
                          <TableHead className="text-right font-bold">SALDO</TableHead>
                          <TableHead className="text-right font-bold">ACUMULADO</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fluxoCaixaDiario.map((dia, i) => (
                          <TableRow key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                            <TableCell>{dia.dataFormatada}</TableCell>
                            <TableCell className="text-right text-green-600">
                              {dia.entradas > 0 ? formatCurrency(dia.entradas) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {dia.saidas > 0 ? formatCurrency(dia.saidas) : '-'}
                            </TableCell>
                            <TableCell className={`text-right ${dia.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {dia.saldo !== 0 ? formatCurrency(dia.saldo) : '-'}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${dia.acumulado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {formatCurrency(dia.acumulado)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Ao utilizar uma data futura no filtro, todo lançamento previsto anterior a essa data, 
                        não será considerado no saldo acumulado. Por exemplo, ao definir o filtro a partir de 
                        Março de 2023, o boleto com vencimento previsto anterior a essa data e que não foi pago, 
                        não será considerado no saldo acumulado.
                      </p>
                    </CardContent>
                  </Card>

                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Fluxo Contas a Pagar */}
        <TabsContent value="contas-pagar" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>Ano:</Label>
                    <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {anos.map(ano => (
                          <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Mês:</Label>
                    <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {MESES.map(mes => (
                          <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Status:</Label>
                    <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="previsto">Previsto</SelectItem>
                        <SelectItem value="realizado">Realizado</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Card className="bg-destructive text-destructive-foreground">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-5 w-5" />
                      <span className="font-semibold">TOTAL A PAGAR:</span>
                      <span className="text-xl font-bold">{formatCurrency(totalAPagar)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Fornecedor</TableHead>
                    <TableHead className="font-bold">Descrição</TableHead>
                    <TableHead className="text-center font-bold">Vencimento</TableHead>
                    <TableHead className="text-center font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contasPagarFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma conta a pagar encontrada para o período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    contasPagarFiltradas.map(conta => {
                      const isPago = !!conta.data_pagamento;
                      const dataVenc = conta.data_vencimento ? parseISO(conta.data_vencimento) : null;
                      const isVencido = !isPago && dataVenc && dataVenc < new Date();
                      const statusLabel = isPago ? 'Realizado' : isVencido ? 'Vencido' : 'Previsto';
                      const statusColor = isPago ? 'bg-green-100 text-green-700 border-green-200' : isVencido ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200';
                      
                      return (
                        <TableRow key={conta.id}>
                          <TableCell className="font-medium">{conta.fornecedor_nome || '-'}</TableCell>
                          <TableCell>{conta.descricao || '-'}</TableCell>
                          <TableCell className="text-center">
                            {conta.data_vencimento ? format(parseISO(conta.data_vencimento), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${statusColor} border`}>{statusLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-destructive">
                            {formatCurrency(conta.valor || 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Fluxo Contas a Receber */}
        <TabsContent value="contas-receber" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>Ano:</Label>
                    <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {anos.map(ano => (
                          <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Mês:</Label>
                    <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {MESES.map(mes => (
                          <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Status:</Label>
                    <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="previsto">Previsto</SelectItem>
                        <SelectItem value="realizado">Realizado</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Card className="bg-green-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-5 w-5" />
                      <span className="font-semibold">TOTAL A RECEBER:</span>
                      <span className="text-xl font-bold">{formatCurrency(totalAReceber)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Cliente</TableHead>
                    <TableHead className="font-bold">Descrição</TableHead>
                    <TableHead className="text-center font-bold">Vencimento</TableHead>
                    <TableHead className="text-center font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contasReceberFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma conta a receber encontrada para o período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    contasReceberFiltradas.map(conta => {
                      const isPago = !!conta.data_pagamento;
                      const dataVenc = conta.data_recebimento ? parseISO(conta.data_recebimento) : null;
                      const isVencido = !isPago && dataVenc && dataVenc < new Date();
                      const statusLabel = isPago ? 'Realizado' : isVencido ? 'Vencido' : 'Previsto';
                      const statusColor = isPago ? 'bg-green-100 text-green-700 border-green-200' : isVencido ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200';
                      
                      return (
                        <TableRow key={conta.id}>
                          <TableCell className="font-medium">{conta.cliente_nome || '-'}</TableCell>
                          <TableCell>{conta.servico_produto || '-'}</TableCell>
                          <TableCell className="text-center">
                            {conta.data_recebimento ? format(parseISO(conta.data_recebimento), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${statusColor} border`}>{statusLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(conta.valor || 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
