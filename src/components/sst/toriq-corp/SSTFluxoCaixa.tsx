import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaEfetiva } from '@/hooks/useEmpresaMode';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Calendar, ArrowUpCircle, ArrowDownCircle, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  centro_custo_id?: string;
  status_pagamento: string;
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
  centro_custo_id?: string;
  status_pagamento: string;
}

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

interface PlanoDespesa {
  id: string;
  nome: string;
  tipo: string;
}

interface PlanoReceita {
  id: string;
  nome: string;
  tipo: string;
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

const TIPOS_RECEITA_LABELS: Record<string, string> = {
  'receitas_operacionais': 'Receitas Operacionais',
  'outras_receitas_operacionais': 'Outras Receitas Operacionais',
  'receitas_financeiras': 'Receitas Financeiras',
  'receitas_nao_operacionais': 'Receitas não Operacionais',
};

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

const TIPOS_RECEITA_ORDEM = [
  'receitas_operacionais',
  'outras_receitas_operacionais',
  'receitas_financeiras',
  'receitas_nao_operacionais',
];

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

export function SSTFluxoCaixa() {
  const { toast } = useToast();
  const { empresa } = useAuth();
  const { empresaIdEfetivo } = useEmpresaEfetiva();
  const empresaId = empresaIdEfetivo || empresa?.id;
  
  const [loading, setLoading] = useState(true);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [planoDespesas, setPlanoDespesas] = useState<PlanoDespesa[]>([]);
  const [planoReceitas, setPlanoReceitas] = useState<PlanoReceita[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [colunaRecebidos, setColunaRecebidos] = useState<string | null>(null);
  const [colunaPagos, setColunaPagos] = useState<string | null>(null);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [anoSelecionado, setAnoSelecionado] = useState(currentYear.toString());
  const [mesSelecionado, setMesSelecionado] = useState(currentMonth.toString());
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [contaFiltro, setContaFiltro] = useState('todas');
  const [grupoDespesaFiltro, setGrupoDespesaFiltro] = useState('todos');
  const [grupoContasSelecionado, setGrupoContasSelecionado] = useState('todos');

  const saldoInicial = useMemo(() => {
    if (contaFiltro === 'todas') {
      return contasBancarias.reduce((sum, conta) => sum + Number(conta.saldo_inicial || 0), 0);
    }
    const contaSelecionada = contasBancarias.find(c => c.id === contaFiltro);
    return contaSelecionada ? Number(contaSelecionada.saldo_inicial || 0) : 0;
  }, [contaFiltro, contasBancarias]);

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

      const { data: contasPagarData } = await (supabase as any)
        .from('contas_pagar')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('arquivado', false);
      
      setContasPagar(contasPagarData || []);

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

      try {
        const { data: planoDespesasData } = await (supabase as any)
          .from('plano_despesas')
          .select('*')
          .eq('empresa_id', empresaId);
        
        setPlanoDespesas(planoDespesasData || []);
      } catch (e) {
        setPlanoDespesas([]);
      }

      try {
        const { data: planoReceitasData } = await (supabase as any)
          .from('plano_receitas')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('ativo', true);
        
        setPlanoReceitas(planoReceitasData || []);
      } catch (e) {
        setPlanoReceitas([]);
      }

      try {
        const { data: contasBancariasData } = await (supabase as any)
          .from('contas_bancarias')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('ativo', true);
        
        setContasBancarias(contasBancariasData || []);
      } catch (e) {
        setContasBancarias([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar dados do fluxo de caixa', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Calcular dados do demonstrativo mensal
  const dadosDemonstrativo = useMemo(() => {
    const ano = parseInt(anoSelecionado);
    const meses = eachMonthOfInterval({
      start: startOfYear(new Date(ano, 0, 1)),
      end: endOfYear(new Date(ano, 11, 31))
    });

    let saldoAcumulado = saldoInicial;
    
    return meses.map((mesDate, index) => {
      const mesInicio = startOfMonth(mesDate);
      const mesFim = endOfMonth(mesDate);

      // Entradas do mês - apenas contas na coluna "Recebidos"
      const entradasMes = contasReceber
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

      // Saídas do mês - apenas contas na coluna "Pagos"
      const saidasMes = contasPagar
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
        .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);

      const resultadoMes = entradasMes - saidasMes;
      saldoAcumulado += resultadoMes;

      return {
        mes: format(mesDate, 'MMMM', { locale: ptBR }),
        mesIndex: index,
        saldoInicial: index === 0 ? saldoInicial : saldoAcumulado - resultadoMes,
        entradas: entradasMes,
        saidas: saidasMes,
        resultado: resultadoMes,
        saldoFinal: saldoAcumulado
      };
    });
  }, [anoSelecionado, contasPagar, contasReceber, saldoInicial, colunaRecebidos, colunaPagos]);

  // Calcular dados detalhados por grupo de contas
  const dadosGrupoContas = useMemo(() => {
    if (grupoContasSelecionado === 'todos') return null;
    
    const ano = parseInt(anoSelecionado);
    const meses = eachMonthOfInterval({
      start: startOfYear(new Date(ano, 0, 1)),
      end: endOfYear(new Date(ano, 11, 31))
    });

    const isReceita = grupoContasSelecionado.startsWith('receitas_') || grupoContasSelecionado === 'outras_receitas_operacionais';
    
    // Filtrar planos do grupo selecionado
    const planosDoGrupo = isReceita 
      ? planoReceitas.filter(p => p.tipo === grupoContasSelecionado)
      : planoDespesas.filter(p => p.tipo === grupoContasSelecionado);

    // Calcular valores por plano e por mês
    const dadosPorPlano = planosDoGrupo.map(plano => {
      const valoresPorMes = meses.map((mesDate, index) => {
        const mesInicio = startOfMonth(mesDate);
        const mesFim = endOfMonth(mesDate);

        let valorMes = 0;
        if (isReceita) {
          valorMes = contasReceber
            .filter(c => {
              if (colunaRecebidos && (c as any).coluna_id !== colunaRecebidos) return false;
              // Usar servico_produto para comparar com o nome do plano de receita
              if (c.servico_produto !== plano.nome) return false;
              const dataRef = c.data_pagamento || c.data_recebimento;
              if (!dataRef) return false;
              try {
                const data = parseISO(dataRef.split('T')[0]);
                return data >= mesInicio && data <= mesFim;
              } catch { return false; }
            })
            .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);
        } else {
          valorMes = contasPagar
            .filter(c => {
              if (colunaPagos && (c as any).coluna_id !== colunaPagos) return false;
              // Usar descricao para comparar com o nome do plano de despesa
              if (c.descricao !== plano.nome) return false;
              const dataRef = c.data_pagamento || c.data_vencimento;
              if (!dataRef) return false;
              try {
                const data = parseISO(dataRef.split('T')[0]);
                return data >= mesInicio && data <= mesFim;
              } catch { return false; }
            })
            .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);
        }

        return { mesIndex: index, valor: valorMes };
      });

      const total = valoresPorMes.reduce((sum, m) => sum + m.valor, 0);

      return {
        nome: plano.nome,
        valoresPorMes,
        total
      };
    });

    // Calcular totais por mês
    const totaisPorMes = meses.map((_, index) => {
      return dadosPorPlano.reduce((sum, p) => sum + p.valoresPorMes[index].valor, 0);
    });

    const totalGeral = dadosPorPlano.reduce((sum, p) => sum + p.total, 0);

    return {
      isReceita,
      grupoNome: isReceita 
        ? TIPOS_RECEITA_LABELS[grupoContasSelecionado] || grupoContasSelecionado
        : TIPOS_DESPESA_LABELS[grupoContasSelecionado] || grupoContasSelecionado,
      planos: dadosPorPlano,
      totaisPorMes,
      totalGeral,
      meses: meses.map(m => format(m, 'MMMM', { locale: ptBR }))
    };
  }, [grupoContasSelecionado, anoSelecionado, planoReceitas, planoDespesas, contasReceber, contasPagar, colunaRecebidos, colunaPagos]);

  // Calcular fluxo diário
  const fluxoDiario = useMemo(() => {
    const ano = parseInt(anoSelecionado);
    const mes = parseInt(mesSelecionado);
    const mesDate = new Date(ano, mes, 1);
    const dias = eachDayOfInterval({
      start: startOfMonth(mesDate),
      end: endOfMonth(mesDate)
    });

    let saldoAcumulado = saldoInicial;

    return dias.map(dia => {
      const diaStr = format(dia, 'yyyy-MM-dd');

      // Entradas - apenas contas na coluna "Recebidos"
      const entradasDia = contasReceber
        .filter(c => {
          if (colunaRecebidos && (c as any).coluna_id !== colunaRecebidos) return false;
          const dataRef = c.data_pagamento || c.data_recebimento;
          return dataRef?.split('T')[0] === diaStr;
        })
        .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);

      // Saídas - apenas contas na coluna "Pagos"
      const saidasDia = contasPagar
        .filter(c => {
          if (colunaPagos && (c as any).coluna_id !== colunaPagos) return false;
          const dataRef = c.data_pagamento || c.data_vencimento;
          return dataRef?.split('T')[0] === diaStr;
        })
        .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);

      const saldoDia = entradasDia - saidasDia;
      saldoAcumulado += saldoDia;

      return {
        dia: format(dia, 'dd/MM/yyyy'),
        entradas: entradasDia,
        saidas: saidasDia,
        saldo: saldoDia,
        acumulado: saldoAcumulado
      };
    });
  }, [anoSelecionado, mesSelecionado, contasPagar, contasReceber, saldoInicial, colunaRecebidos, colunaPagos]);

  // Filtrar contas a pagar
  const contasPagarFiltradas = useMemo(() => {
    const ano = parseInt(anoSelecionado);
    const mes = parseInt(mesSelecionado);
    
    return contasPagar.filter(c => {
      const dataRef = c.data_pagamento || c.data_vencimento;
      if (!dataRef) return false;
      
      try {
        const data = parseISO(dataRef.split('T')[0]);
        const mesMatch = data.getMonth() === mes && data.getFullYear() === ano;
        const statusMatch = statusFiltro === 'todos' || c.status_pagamento === statusFiltro;
        return mesMatch && statusMatch;
      } catch { return false; }
    });
  }, [anoSelecionado, mesSelecionado, contasPagar, statusFiltro]);

  // Filtrar contas a receber
  const contasReceberFiltradas = useMemo(() => {
    const ano = parseInt(anoSelecionado);
    const mes = parseInt(mesSelecionado);
    
    return contasReceber.filter(c => {
      const dataRef = c.data_pagamento || c.data_recebimento;
      if (!dataRef) return false;
      
      try {
        const data = parseISO(dataRef.split('T')[0]);
        const mesMatch = data.getMonth() === mes && data.getFullYear() === ano;
        const statusMatch = statusFiltro === 'todos' || c.status_pagamento === statusFiltro;
        return mesMatch && statusMatch;
      } catch { return false; }
    });
  }, [anoSelecionado, mesSelecionado, contasReceber, statusFiltro]);

  const totalPagar = contasPagarFiltradas.reduce((sum, c) => sum + Number(c.valor || 0), 0);
  const totalReceber = contasReceberFiltradas.reduce((sum, c) => sum + Number(c.valor || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
        <p className="text-muted-foreground">Acompanhe as entradas e saídas financeiras</p>
      </div>

      <Tabs defaultValue="demonstrativo" className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-12 items-center justify-start gap-1 rounded-lg bg-muted p-1 min-w-max">
            <TabsTrigger value="demonstrativo" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">Demonstrativo do Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="diario" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">Fluxo de Caixa Diário</TabsTrigger>
            <TabsTrigger value="contas-pagar" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">Fluxo Contas a Pagar</TabsTrigger>
            <TabsTrigger value="contas-receber" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">Fluxo Contas a Receber</TabsTrigger>
          </TabsList>
        </div>

        {/* Aba Demonstrativo */}
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
                      {[currentYear - 1, currentYear, currentYear + 1].map(ano => (
                        <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Conta:</Label>
                  <Select value={contaFiltro} onValueChange={setContaFiltro}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Contas</SelectItem>
                      {contasBancarias.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.descricao || `${conta.banco} - ${conta.conta}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Status:</Label>
                  <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="previsto">Previsto</SelectItem>
                      <SelectItem value="realizado">Realizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background">Descrição</TableHead>
                      {dadosDemonstrativo.map(d => (
                        <TableHead key={d.mesIndex} className="text-right min-w-[100px]">
                          {d.mes.charAt(0).toUpperCase() + d.mes.slice(1)}
                        </TableHead>
                      ))}
                      <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-primary/5 dark:bg-primary/10">
                      <TableCell className="font-semibold sticky left-0 bg-primary/5 dark:bg-primary/10">Saldo Inicial</TableCell>
                      {dadosDemonstrativo.map(d => (
                        <TableCell key={d.mesIndex} className="text-right">{formatCurrency(d.saldoInicial)}</TableCell>
                      ))}
                      <TableCell className="text-right font-bold">{formatCurrency(saldoInicial)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-success/5 dark:bg-success/10">
                      <TableCell className="font-semibold sticky left-0 bg-success/5 dark:bg-success/10">Entradas</TableCell>
                      {dadosDemonstrativo.map(d => (
                        <TableCell key={d.mesIndex} className="text-right text-success">{formatCurrency(d.entradas)}</TableCell>
                      ))}
                      <TableCell className="text-right font-bold text-success">
                        {formatCurrency(dadosDemonstrativo.reduce((sum, d) => sum + d.entradas, 0))}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-destructive/5 dark:bg-destructive/10">
                      <TableCell className="font-semibold sticky left-0 bg-destructive/5 dark:bg-destructive/10">Saídas</TableCell>
                      {dadosDemonstrativo.map(d => (
                        <TableCell key={d.mesIndex} className="text-right text-destructive">{formatCurrency(d.saidas)}</TableCell>
                      ))}
                      <TableCell className="text-right font-bold text-destructive">
                        {formatCurrency(dadosDemonstrativo.reduce((sum, d) => sum + d.saidas, 0))}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-warning/5 dark:bg-warning/10">
                      <TableCell className="font-semibold sticky left-0 bg-warning/5 dark:bg-warning/10">Resultado do Mês</TableCell>
                      {dadosDemonstrativo.map(d => (
                        <TableCell key={d.mesIndex} className={`text-right ${d.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(d.resultado)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        {formatCurrency(dadosDemonstrativo.reduce((sum, d) => sum + d.resultado, 0))}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-secondary/10 dark:bg-secondary/20">
                      <TableCell className="font-semibold sticky left-0 bg-secondary/10 dark:bg-secondary/20">Disponível</TableCell>
                      {dadosDemonstrativo.map(d => (
                        <TableCell key={d.mesIndex} className={`text-right font-semibold ${d.saldoFinal >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(d.saldoFinal)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        {formatCurrency(dadosDemonstrativo[dadosDemonstrativo.length - 1]?.saldoFinal || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Seção de análise por grupo de contas */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <Label className="whitespace-nowrap">Selecione um grupo de contas para análise:</Label>
                <Select value={grupoContasSelecionado} onValueChange={setGrupoContasSelecionado}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="separator-receitas" disabled className="font-semibold text-muted-foreground">
                      — CLASSIFICAÇÃO DE RECEITAS —
                    </SelectItem>
                    {TIPOS_RECEITA_ORDEM.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>
                        {TIPOS_RECEITA_LABELS[tipo] || tipo}
                      </SelectItem>
                    ))}
                    <SelectItem value="separator-despesas" disabled className="font-semibold text-muted-foreground">
                      — CLASSIFICAÇÃO DE DESPESAS —
                    </SelectItem>
                    {TIPOS_DESPESA_ORDEM.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>
                        {TIPOS_DESPESA_LABELS[tipo] || tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            {dadosGrupoContas && (
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">{dadosGrupoContas.grupoNome}</TableHead>
                        {dadosGrupoContas.meses.map((mes, index) => (
                          <TableHead key={index} className="text-right min-w-[100px]">
                            {mes.charAt(0).toUpperCase() + mes.slice(1)}
                          </TableHead>
                        ))}
                        <TableHead className="text-right font-bold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosGrupoContas.planos.map((plano, idx) => (
                        <TableRow key={idx} className={dadosGrupoContas.isReceita ? 'hover:bg-success/5' : 'hover:bg-destructive/5'}>
                          <TableCell className="sticky left-0 bg-background pl-4">{plano.nome}</TableCell>
                          {plano.valoresPorMes.map((m, mIdx) => (
                            <TableCell 
                              key={mIdx} 
                              className={`text-right ${dadosGrupoContas.isReceita ? 'text-success' : 'text-destructive'}`}
                            >
                              {formatCurrency(m.valor)}
                            </TableCell>
                          ))}
                          <TableCell className={`text-right font-semibold ${dadosGrupoContas.isReceita ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(plano.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className={dadosGrupoContas.isReceita ? 'bg-success/10 dark:bg-success/20' : 'bg-destructive/10 dark:bg-destructive/20'}>
                        <TableCell className={`font-bold sticky left-0 ${dadosGrupoContas.isReceita ? 'bg-success/10 dark:bg-success/20' : 'bg-destructive/10 dark:bg-destructive/20'}`}>
                          Total {dadosGrupoContas.grupoNome}
                        </TableCell>
                        {dadosGrupoContas.totaisPorMes.map((total, idx) => (
                          <TableCell 
                            key={idx} 
                            className={`text-right font-bold ${dadosGrupoContas.isReceita ? 'text-success' : 'text-destructive'}`}
                          >
                            {formatCurrency(total)}
                          </TableCell>
                        ))}
                        <TableCell className={`text-right font-bold ${dadosGrupoContas.isReceita ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(dadosGrupoContas.totalGeral)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Aba Fluxo Diário */}
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
                      {[currentYear - 1, currentYear, currentYear + 1].map(ano => (
                        <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
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
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Contas</SelectItem>
                      {contasBancarias.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.descricao || `${conta.banco} - ${conta.conta}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Status:</Label>
                  <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="previsto">Previsto</SelectItem>
                      <SelectItem value="realizado">Realizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-center">FLUXO DIÁRIO</h3>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Ao utilizar uma data futura no filtro, todo lançamento previsto anterior a essa data, não será considerado no saldo acumulado.
                </AlertDescription>
              </Alert>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DIA</TableHead>
                    <TableHead className="text-right">ENTRADAS</TableHead>
                    <TableHead className="text-right">SAÍDAS</TableHead>
                    <TableHead className="text-right">SALDO</TableHead>
                    <TableHead className="text-right">ACUMULADO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fluxoDiario.map((dia, index) => (
                    <TableRow key={index}>
                      <TableCell>{dia.dia}</TableCell>
                      <TableCell className="text-right text-success">
                        {dia.entradas > 0 ? formatCurrency(dia.entradas) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {dia.saidas > 0 ? formatCurrency(dia.saidas) : '-'}
                      </TableCell>
                      <TableCell className={`text-right ${dia.saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {dia.saldo !== 0 ? formatCurrency(dia.saldo) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${dia.acumulado >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(dia.acumulado)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Contas a Pagar */}
        <TabsContent value="contas-pagar" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>Ano:</Label>
                    <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[currentYear - 1, currentYear, currentYear + 1].map(ano => (
                          <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
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
                    <Label>Status:</Label>
                    <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="previsto">Previsto</SelectItem>
                        <SelectItem value="realizado">Realizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-semibold">TOTAL A PAGAR: {formatCurrency(totalPagar)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
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
                    contasPagarFiltradas.map(conta => (
                      <TableRow key={conta.id}>
                        <TableCell className="font-medium">{conta.fornecedor_nome}</TableCell>
                        <TableCell>{conta.descricao}</TableCell>
                        <TableCell>
                          {conta.data_vencimento ? format(parseISO(conta.data_vencimento.split('T')[0]), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={conta.status_pagamento === 'realizado' ? 'default' : 'secondary'}>
                            {conta.status_pagamento === 'realizado' ? 'Realizado' : 'Previsto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {formatCurrency(conta.valor)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Contas a Receber */}
        <TabsContent value="contas-receber" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>Ano:</Label>
                    <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[currentYear - 1, currentYear, currentYear + 1].map(ano => (
                          <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
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
                    <Label>Status:</Label>
                    <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="previsto">Previsto</SelectItem>
                        <SelectItem value="realizado">Realizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-semibold">TOTAL A RECEBER: {formatCurrency(totalReceber)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
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
                    contasReceberFiltradas.map(conta => (
                      <TableRow key={conta.id}>
                        <TableCell className="font-medium">{conta.cliente_nome}</TableCell>
                        <TableCell>{conta.servico_produto}</TableCell>
                        <TableCell>
                          {conta.data_recebimento ? format(parseISO(conta.data_recebimento.split('T')[0]), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={conta.status_pagamento === 'realizado' ? 'default' : 'secondary'}>
                            {conta.status_pagamento === 'realizado' ? 'Realizado' : 'Previsto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(conta.valor)}
                        </TableCell>
                      </TableRow>
                    ))
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
