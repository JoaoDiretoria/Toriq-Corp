import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Building2, Users, Package, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaEfetiva } from '@/hooks/useEmpresaMode';
import { parseISO, startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ContaPagar {
  id: string;
  valor: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string | null;
  classificacao_despesa?: string;
  coluna_id?: string;
  fornecedor_id?: string;
  status_pagamento?: 'previsto' | 'realizado' | 'vencido';
  fornecedor_nome?: string;
}

interface ContaReceber {
  id: string;
  valor: number;
  valor_pago: number;
  data_vencimento: string;
  data_recebimento?: string | null;
  data_pagamento?: string | null;
  cliente_id?: string;
  coluna_id?: string;
  status_recebimento?: 'previsto' | 'realizado' | 'vencido';
  cliente_nome?: string;
}

interface ContaBancaria {
  id: string;
  banco?: string;
  descricao?: string;
  saldo_atual: number;
}

interface Cliente {
  id: string;
  razao_social?: string;
  nome_fantasia?: string;
}

interface Fornecedor {
  id: string;
  razao_social?: string;
  nome_fantasia?: string;
}

interface KanbanColuna {
  id: string;
  nome: string;
  cor: string;
}

const meses = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export function ToriqCorpFinanceiroDashboard() {
  const { profile } = useAuth();
  const { empresaIdEfetivo, getEmpresaIdEfetivo } = useEmpresaEfetiva();
  const empresaId = empresaIdEfetivo || profile?.empresa_id;
  
  const currentDate = new Date();
  const [ano, setAno] = useState(currentDate.getFullYear().toString());
  const [mes, setMes] = useState((currentDate.getMonth() + 1).toString());
  
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [colunasKanban, setColunasKanban] = useState<KanbanColuna[]>([]);
  const [loading, setLoading] = useState(true);

  const anos = Array.from({ length: 5 }, (_, i) => (currentDate.getFullYear() - 2 + i).toString());

  useEffect(() => {
    if (empresaId) {
      loadData();
    }
  }, [empresaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar dados em paralelo
      const [contasReceberRes, contasPagarRes, contasBancariasRes, clientesRes, fornecedoresRes, colunasReceberRes, colunasPagarRes] = await Promise.all([
        supabase.from('contas_receber').select('*').eq('empresa_id', empresaId),
        supabase.from('contas_pagar').select('*').eq('empresa_id', empresaId),
        supabase.from('contas_bancarias').select('*').eq('empresa_id', empresaId),
        supabase.from('clientes_sst').select('id, razao_social, nome_fantasia').eq('empresa_sst_id', empresaId),
        supabase.from('fornecedores').select('id, razao_social, nome_fantasia').eq('empresa_id', empresaId),
        supabase.from('contas_receber_colunas').select('id, nome, cor').eq('empresa_id', empresaId),
        supabase.from('contas_pagar_colunas').select('id, nome, cor').eq('empresa_id', empresaId),
      ]);

      setContasReceber(contasReceberRes.data || []);
      setContasPagar(contasPagarRes.data || []);
      setContasBancarias(contasBancariasRes.data || []);
      setClientes(clientesRes.data || []);
      setFornecedores(fornecedoresRes.data || []);
      // Combinar colunas de receber e pagar para o kanban
      const todasColunas = [...(colunasReceberRes.data || []), ...(colunasPagarRes.data || [])];
      setColunasKanban(todasColunas);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Encontrar colunas específicas
  const colunaRecebidos = colunasKanban.find(c => c.nome === 'Recebidos')?.id || null;
  const colunaPagos = colunasKanban.find(c => c.nome === 'Pagos')?.id || null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Calcular totais gerais (igual às páginas de Contas a Pagar e Contas a Receber)
  const totaisGerais = useMemo(() => {
    // Total a Pagar (todas as contas não pagas)
    const totalAPagar = contasPagar
      .filter(c => c.status_pagamento !== 'realizado')
      .reduce((sum, c) => sum + Number(c.valor || 0) - Number(c.valor_pago || 0), 0);
    
    // Total Pago (contas com status realizado ou valor_pago > 0)
    const totalPago = contasPagar
      .reduce((sum, c) => sum + Number(c.valor_pago || 0), 0);
    
    // Total a Receber (todas as contas não recebidas)
    const totalAReceber = contasReceber
      .filter(c => c.status_recebimento !== 'realizado')
      .reduce((sum, c) => sum + Number(c.valor || 0) - Number(c.valor_pago || 0), 0);
    
    // Total Recebido (contas com status realizado ou valor_pago > 0)
    const totalRecebido = contasReceber
      .reduce((sum, c) => sum + Number(c.valor_pago || 0), 0);
    
    // Contas vencidas
    const hoje = new Date();
    const contasPagarVencidas = contasPagar.filter(c => {
      if (c.status_pagamento === 'realizado') return false;
      if (!c.data_vencimento) return false;
      try {
        const dataVenc = new Date(c.data_vencimento + 'T00:00:00');
        return dataVenc < hoje;
      } catch {
        return false;
      }
    });
    const totalVencido = contasPagarVencidas.reduce((sum, c) => sum + Number(c.valor || 0) - Number(c.valor_pago || 0), 0);
    
    // Saldo atual (recebido - pago)
    const saldoAtual = totalRecebido - totalPago;
    
    // Resultado líquido
    const resultadoLiquido = totalRecebido - totalPago;

    return {
      totalAPagar,
      totalPago,
      totalAReceber,
      totalRecebido,
      totalVencido,
      saldoAtual,
      resultadoLiquido,
      qtdContasPagar: contasPagar.length,
      qtdContasReceber: contasReceber.length,
      qtdVencidas: contasPagarVencidas.length,
    };
  }, [contasPagar, contasReceber]);

  // Calcular DRE do mês
  const dreMes = useMemo(() => {
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes) - 1;
    const mesInicio = startOfMonth(new Date(anoNum, mesNum, 1));
    const mesFim = endOfMonth(new Date(anoNum, mesNum, 1));

    // Receita Bruta - se tem coluna "Recebidos", filtra por ela; senão usa data_vencimento
    const receitaBruta = contasReceber
      .filter(c => {
        if (colunaRecebidos) {
          if ((c as any).coluna_id !== colunaRecebidos) return false;
          const dataRef = c.data_pagamento || c.data_recebimento;
          if (!dataRef) return false;
          try {
            const data = parseISO(dataRef.split('T')[0]);
            return data >= mesInicio && data <= mesFim;
          } catch { return false; }
        }
        const dataRef = c.data_vencimento;
        if (!dataRef) return false;
        try {
          const data = parseISO(dataRef.split('T')[0]);
          return data >= mesInicio && data <= mesFim;
        } catch { return false; }
      })
      .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);

    // Despesas por classificação - se tem coluna "Pagos", filtra por ela; senão usa data_vencimento
    const despesasPorClassificacao: Record<string, number> = {};
    contasPagar
      .filter(c => {
        if (colunaPagos) {
          if ((c as any).coluna_id !== colunaPagos) return false;
          const dataRef = c.data_pagamento || c.data_vencimento;
          if (!dataRef) return false;
          try {
            const data = parseISO(dataRef.split('T')[0]);
            return data >= mesInicio && data <= mesFim;
          } catch { return false; }
        }
        const dataRef = c.data_vencimento;
        if (!dataRef) return false;
        try {
          const data = parseISO(dataRef.split('T')[0]);
          return data >= mesInicio && data <= mesFim;
        } catch { return false; }
      })
      .forEach(c => {
        const classificacao = c.classificacao_despesa || 'despesas_administrativas';
        despesasPorClassificacao[classificacao] = (despesasPorClassificacao[classificacao] || 0) + Number(c.valor_pago || c.valor || 0);
      });

    const deducoes = despesasPorClassificacao['deducoes_sobre_vendas'] || 0;
    const custoServicos = despesasPorClassificacao['custo_servico_prestado'] || 0;
    const despesasOperacionais = (despesasPorClassificacao['despesas_administrativas'] || 0) +
      (despesasPorClassificacao['despesas_estrutura'] || 0) +
      (despesasPorClassificacao['despesas_pessoal'] || 0) +
      (despesasPorClassificacao['despesas_comerciais'] || 0);
    const despesasFinanceiras = despesasPorClassificacao['despesas_financeiras'] || 0;
    const impostos = despesasPorClassificacao['impostos'] || 0;

    const receitaLiquida = receitaBruta - deducoes;
    const lucroBruto = receitaLiquida - custoServicos;
    const resultadoOperacional = lucroBruto - despesasOperacionais;
    const resultadoFinanceiro = -despesasFinanceiras;
    const resultadoLiquido = resultadoOperacional + resultadoFinanceiro - impostos;

    return {
      receitaBruta,
      deducoes,
      receitaLiquida,
      custoServicos,
      lucroBruto,
      despesasOperacionais,
      resultadoOperacional,
      resultadoFinanceiro,
      impostos,
      resultadoLiquido,
    };
  }, [contasPagar, contasReceber, ano, mes, colunaRecebidos, colunaPagos]);

  // Calcular margens
  const margens = useMemo(() => {
    const margemBruta = dreMes.receitaLiquida > 0 ? (dreMes.lucroBruto / dreMes.receitaLiquida) * 100 : 0;
    const margemOperacional = dreMes.receitaLiquida > 0 ? (dreMes.resultadoOperacional / dreMes.receitaLiquida) * 100 : 0;
    const margemLiquida = dreMes.receitaLiquida > 0 ? (dreMes.resultadoLiquido / dreMes.receitaLiquida) * 100 : 0;
    return { margemBruta, margemOperacional, margemLiquida };
  }, [dreMes]);

  // Calcular saldo por bancos
  const saldoBancos = useMemo(() => {
    return contasBancarias.reduce((sum, conta) => sum + Number(conta.saldo_atual || 0), 0);
  }, [contasBancarias]);

  // Dados do gráfico de fluxo de caixa anual
  const chartData = useMemo(() => {
    const anoNum = parseInt(ano);
    const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return mesesAbrev.map((mesNome, index) => {
      const mesInicio = startOfMonth(new Date(anoNum, index, 1));
      const mesFim = endOfMonth(new Date(anoNum, index, 1));

      const entradas = contasReceber
        .filter(c => {
          if (colunaRecebidos) {
            if ((c as any).coluna_id !== colunaRecebidos) return false;
            const dataRef = c.data_pagamento || c.data_recebimento;
            if (!dataRef) return false;
            try {
              const data = parseISO(dataRef.split('T')[0]);
              return data >= mesInicio && data <= mesFim;
            } catch { return false; }
          }
          const dataRef = c.data_vencimento;
          if (!dataRef) return false;
          try {
            const data = parseISO(dataRef.split('T')[0]);
            return data >= mesInicio && data <= mesFim;
          } catch { return false; }
        })
        .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);

      const saidas = contasPagar
        .filter(c => {
          if (colunaPagos) {
            if ((c as any).coluna_id !== colunaPagos) return false;
            const dataRef = c.data_pagamento || c.data_vencimento;
            if (!dataRef) return false;
            try {
              const data = parseISO(dataRef.split('T')[0]);
              return data >= mesInicio && data <= mesFim;
            } catch { return false; }
          }
          const dataRef = c.data_vencimento;
          if (!dataRef) return false;
          try {
            const data = parseISO(dataRef.split('T')[0]);
            return data >= mesInicio && data <= mesFim;
          } catch { return false; }
        })
        .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);

      return {
        mes: mesNome,
        Entradas: entradas,
        Saídas: saidas,
      };
    });
  }, [contasPagar, contasReceber, ano, colunaRecebidos, colunaPagos]);

  // Saídas por categoria no período
  const saidasPorCategoria = useMemo(() => {
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes) - 1;
    const mesInicio = startOfMonth(new Date(anoNum, mesNum, 1));
    const mesFim = endOfMonth(new Date(anoNum, mesNum, 1));

    const categorias: Record<string, number> = {};
    contasPagar
      .filter(c => {
        if (colunaPagos) {
          if ((c as any).coluna_id !== colunaPagos) return false;
          const dataRef = c.data_pagamento || c.data_vencimento;
          if (!dataRef) return false;
          try {
            const data = parseISO(dataRef.split('T')[0]);
            return data >= mesInicio && data <= mesFim;
          } catch { return false; }
        }
        const dataRef = c.data_vencimento;
        if (!dataRef) return false;
        try {
          const data = parseISO(dataRef.split('T')[0]);
          return data >= mesInicio && data <= mesFim;
        } catch { return false; }
      })
      .forEach(c => {
        const classificacao = c.classificacao_despesa || 'despesas_administrativas';
        categorias[classificacao] = (categorias[classificacao] || 0) + Number(c.valor_pago || c.valor || 0);
      });

    return Object.entries(categorias).map(([nome, valor]) => ({ nome, valor }));
  }, [contasPagar, ano, mes, colunaPagos]);

  // Entradas por categoria no período
  const entradasPorCategoria = useMemo(() => {
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes) - 1;
    const mesInicio = startOfMonth(new Date(anoNum, mesNum, 1));
    const mesFim = endOfMonth(new Date(anoNum, mesNum, 1));

    // Agrupar por tipo de receita (simplificado como "receitas_operacionais")
    const total = contasReceber
      .filter(c => {
        if (colunaRecebidos) {
          if ((c as any).coluna_id !== colunaRecebidos) return false;
          const dataRef = c.data_pagamento || c.data_recebimento;
          if (!dataRef) return false;
          try {
            const data = parseISO(dataRef.split('T')[0]);
            return data >= mesInicio && data <= mesFim;
          } catch { return false; }
        }
        const dataRef = c.data_vencimento;
        if (!dataRef) return false;
        try {
          const data = parseISO(dataRef.split('T')[0]);
          return data >= mesInicio && data <= mesFim;
        } catch { return false; }
      })
      .reduce((sum, c) => sum + Number(c.valor_pago || c.valor || 0), 0);

    return total > 0 ? [{ nome: 'receitas_operacionais', valor: total }] : [];
  }, [contasReceber, ano, mes, colunaRecebidos]);

  // Maiores clientes do período
  const maioresClientes = useMemo(() => {
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes) - 1;
    const mesInicio = startOfMonth(new Date(anoNum, mesNum, 1));
    const mesFim = endOfMonth(new Date(anoNum, mesNum, 1));

    const clienteValores: Record<string, number> = {};
    const totalGeral = contasReceber
      .filter(c => {
        if (colunaRecebidos) {
          if ((c as any).coluna_id !== colunaRecebidos) return false;
          const dataRef = c.data_pagamento || c.data_recebimento;
          if (!dataRef) return false;
          try {
            const data = parseISO(dataRef.split('T')[0]);
            return data >= mesInicio && data <= mesFim;
          } catch { return false; }
        }
        const dataRef = c.data_vencimento;
        if (!dataRef) return false;
        try {
          const data = parseISO(dataRef.split('T')[0]);
          return data >= mesInicio && data <= mesFim;
        } catch { return false; }
      })
      .reduce((sum, c) => {
        const clienteId = c.cliente_id || 'sem_cliente';
        clienteValores[clienteId] = (clienteValores[clienteId] || 0) + Number(c.valor_pago || c.valor || 0);
        return sum + Number(c.valor_pago || c.valor || 0);
      }, 0);

    return Object.entries(clienteValores)
      .map(([clienteId, valor]) => {
        const cliente = clientes.find(c => c.id === clienteId);
        return {
          nome: cliente?.razao_social || cliente?.nome_fantasia || 'Cliente não identificado',
          valor,
          percentual: totalGeral > 0 ? (valor / totalGeral) * 100 : 0,
        };
      })
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [contasReceber, clientes, ano, mes, colunaRecebidos]);

  // Maiores fornecedores do período
  const maioresFornecedores = useMemo(() => {
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes) - 1;
    const mesInicio = startOfMonth(new Date(anoNum, mesNum, 1));
    const mesFim = endOfMonth(new Date(anoNum, mesNum, 1));

    const fornecedorValores: Record<string, number> = {};
    const totalGeral = contasPagar
      .filter(c => {
        if (colunaPagos) {
          if ((c as any).coluna_id !== colunaPagos) return false;
          const dataRef = c.data_pagamento || c.data_vencimento;
          if (!dataRef) return false;
          try {
            const data = parseISO(dataRef.split('T')[0]);
            return data >= mesInicio && data <= mesFim;
          } catch { return false; }
        }
        const dataRef = c.data_vencimento;
        if (!dataRef) return false;
        try {
          const data = parseISO(dataRef.split('T')[0]);
          return data >= mesInicio && data <= mesFim;
        } catch { return false; }
      })
      .reduce((sum, c) => {
        const fornecedorId = c.fornecedor_id || 'sem_fornecedor';
        fornecedorValores[fornecedorId] = (fornecedorValores[fornecedorId] || 0) + Number(c.valor_pago || c.valor || 0);
        return sum + Number(c.valor_pago || c.valor || 0);
      }, 0);

    return Object.entries(fornecedorValores)
      .map(([fornecedorId, valor]) => {
        const fornecedor = fornecedores.find(f => f.id === fornecedorId);
        return {
          nome: fornecedor?.razao_social || fornecedor?.nome_fantasia || 'Fornecedor não identificado',
          valor,
          percentual: totalGeral > 0 ? (valor / totalGeral) * 100 : 0,
        };
      })
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [contasPagar, fornecedores, ano, mes, colunaPagos]);

  const mesLabel = meses.find(m => m.value === mes)?.label || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Dashboard Financeiro
          </h1>
          <p className="text-muted-foreground">Visão geral da saúde financeira da empresa</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ano:</span>
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mês:</span>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500 relative">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Contas a Pagar</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totaisGerais.totalAPagar)}</p>
            <p className="text-xs text-muted-foreground mt-1">{totaisGerais.qtdContasPagar} contas</p>
            <DollarSign className="h-8 w-8 text-red-200 absolute right-4 top-4" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 relative">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Contas a Receber</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totaisGerais.totalAReceber)}</p>
            <p className="text-xs text-muted-foreground mt-1">{totaisGerais.qtdContasReceber} contas</p>
            <DollarSign className="h-8 w-8 text-green-200 absolute right-4 top-4" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 relative">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Saldo Atual</p>
            <p className={`text-2xl font-bold ${totaisGerais.saldoAtual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(totaisGerais.saldoAtual)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Recebido - Pago</p>
            <Wallet className="h-8 w-8 text-blue-200 absolute right-4 top-4" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 relative">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Resultado Líquido</p>
            <p className={`text-2xl font-bold ${totaisGerais.resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totaisGerais.resultadoLiquido)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{totaisGerais.resultadoLiquido >= 0 ? 'Lucro' : 'Prejuízo'}</p>
            <TrendingUp className="h-8 w-8 text-purple-200 absolute right-4 top-4" />
          </CardContent>
        </Card>
      </div>

      {/* Saldo por Bancos e DRE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Saldo por Bancos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Saldo por Bancos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contasBancarias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta bancária cadastrada</p>
            ) : (
              <div className="space-y-2">
                {contasBancarias.map((conta) => (
                  <div key={conta.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{conta.banco || conta.descricao || 'Conta Bancária'}</span>
                    </div>
                    <span className={`font-medium ${Number(conta.saldo_atual) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Number(conta.saldo_atual))}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between items-center font-medium">
                  <span>Total</span>
                  <span className={contasBancarias.reduce((sum, c) => sum + Number(c.saldo_atual || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(contasBancarias.reduce((sum, c) => sum + Number(c.saldo_atual || 0), 0))}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DRE Resumido */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              DRE - Demonstrativo do Resultado ({mesLabel}/{ano})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <div className="flex justify-between">
                <span>(+) Receita Bruta</span>
                <span className="text-green-600">{formatCurrency(dreMes.receitaBruta)}</span>
              </div>
              <div className="flex justify-between">
                <span>(-) Despesas Operacionais</span>
                <span className="text-red-600">({formatCurrency(dreMes.despesasOperacionais)})</span>
              </div>
              <div className="flex justify-between">
                <span>(-) Deduções</span>
                <span className="text-red-600">({formatCurrency(dreMes.deducoes)})</span>
              </div>
              <div className="flex justify-between">
                <span>(=) Resultado Operacional</span>
                <span className={dreMes.resultadoOperacional >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(dreMes.resultadoOperacional)}
                </span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>(=) Receita Líquida</span>
                <span className="text-green-600">{formatCurrency(dreMes.receitaLiquida)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+/-) Resultado Financeiro</span>
                <span className={dreMes.resultadoFinanceiro >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ({formatCurrency(Math.abs(dreMes.resultadoFinanceiro))})
                </span>
              </div>
              <div className="flex justify-between">
                <span>(-) Custo dos Serviços</span>
                <span className="text-red-600">({formatCurrency(dreMes.custoServicos)})</span>
              </div>
              <div className="flex justify-between">
                <span>(-) Impostos</span>
                <span className="text-red-600">({formatCurrency(dreMes.impostos)})</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>(=) Lucro Bruto</span>
                <span className="text-green-600">{formatCurrency(dreMes.lucroBruto)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1 text-base">
                <span>(=) Resultado Líquido</span>
                <span className={dreMes.resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(dreMes.resultadoLiquido)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saúde dos Indicadores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Saúde dos Indicadores
          </CardTitle>
          <p className="text-sm text-muted-foreground">Análise das margens e indicadores financeiros</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className={`text-3xl font-bold ${margens.margemBruta >= 40 ? 'text-green-600' : margens.margemBruta >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                {margens.margemBruta.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Margem Bruta</p>
              <span className={`text-xs px-2 py-1 rounded ${margens.margemBruta >= 40 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                Meta: 40%
              </span>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${margens.margemOperacional >= 25 ? 'text-green-600' : margens.margemOperacional >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                {margens.margemOperacional.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Margem Operacional</p>
              <span className={`text-xs px-2 py-1 rounded ${margens.margemOperacional >= 25 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                Meta: 25%
              </span>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${margens.margemLiquida >= 20 ? 'text-green-600' : margens.margemLiquida >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                {margens.margemLiquida.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Margem Líquida</p>
              <span className={`text-xs px-2 py-1 rounded ${margens.margemLiquida >= 20 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                Meta: 20%
              </span>
            </div>
            <div className="text-center">
              <CheckCircle className={`h-10 w-10 mx-auto ${dreMes.resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <p className="text-sm text-muted-foreground mt-1">Resultado</p>
              <span className={`text-xs px-2 py-1 rounded ${dreMes.resultadoLiquido >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {dreMes.resultadoLiquido >= 0 ? 'Lucro' : 'Prejuízo'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Fluxo de Caixa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Fluxo de Caixa Previsto + Realizado ({ano})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="Entradas" fill="#22c55e" />
              <Bar dataKey="Saídas" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Saídas e Entradas por Categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Saídas no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {saidasPorCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma saída no período</p>
            ) : (
              <div className="space-y-2">
                {saidasPorCategoria.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm">{item.nome}</span>
                    </div>
                    <span className="font-medium text-red-600">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Entradas no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entradasPorCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma entrada no período</p>
            ) : (
              <div className="space-y-2">
                {entradasPorCategoria.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm">{item.nome}</span>
                    </div>
                    <span className="font-medium text-green-600">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maiores Clientes e Fornecedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Maiores Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maioresClientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente no período</p>
            ) : (
              <div className="space-y-2">
                {maioresClientes.map((cliente, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{index + 1}º</span>
                      <span className="text-sm truncate max-w-[200px]">{cliente.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-600">{formatCurrency(cliente.valor)}</span>
                      <span className="text-xs text-muted-foreground">{cliente.percentual.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Maiores Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maioresFornecedores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum fornecedor no período</p>
            ) : (
              <div className="space-y-2">
                {maioresFornecedores.map((fornecedor, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{index + 1}º</span>
                      <span className="text-sm truncate max-w-[200px]">{fornecedor.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-600">{formatCurrency(fornecedor.valor)}</span>
                      <span className="text-xs text-muted-foreground">{fornecedor.percentual.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
