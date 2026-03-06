import { useState, useEffect, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  LayoutDashboard,
  Filter,
  UserSearch,
  HeartHandshake,
  FileText,
  Phone,
  Mail,
  CalendarDays,
  Trophy,
  Flame,
  ChevronDown,
  Percent,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

// Tipos
interface Coluna {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
}

interface CardData {
  id: string;
  titulo: string;
  coluna_id: string;
  valor: number;
  valor_a_vista?: number;
  valor_3x?: number;
  valor_leasing?: number;
  forma_pagamento?: string;
  created_at: string;
  temperatura?: string;
  responsavel_id?: string;
}

interface Atividade {
  id: string;
  card_id: string;
  tipo: string;
  descricao: string;
  created_at: string;
  status: string;
  prazo?: string;
}

interface MenuOption {
  id: string;
  label: string;
  icon: any;
  description: string;
}

const menuOptions: MenuOption[] = [
  { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard, description: 'Resumo completo do setor comercial' },
  { id: 'funil-closer', label: 'Funil - CLOSER', icon: Filter, description: 'Métricas do funil de vendas' },
  { id: 'prospeccao', label: 'Prospecção (SDR)', icon: UserSearch, description: 'Métricas de prospecção' },
  { id: 'pos-venda', label: 'Pós Venda', icon: HeartHandshake, description: 'Métricas de pós-venda' },
  { id: 'atividades', label: 'Atividades', icon: Activity, description: 'Histórico de atividades' },
  { id: 'metas', label: 'Metas', icon: Target, description: 'Acompanhamento de metas' },
];

// Componente de Gráfico de Pizza simples usando SVG
function PieChartSimple({ 
  data, 
  title, 
  subtitle 
}: { 
  data: { label: string; value: number; color: string }[]; 
  title: string;
  subtitle?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const createArc = (startAngle: number, endAngle: number, color: string) => {
    const start = polarToCartesian(50, 50, 40, endAngle);
    const end = polarToCartesian(50, 50, 40, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return `M 50 50 L ${start.x} ${start.y} A 40 40 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {subtitle && <CardDescription className="text-xs">{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            {total === 0 ? (
              <circle cx="50" cy="50" r="40" fill="#e5e7eb" />
            ) : (
              data.map((item, index) => {
                if (item.value === 0) return null;
                const angle = (item.value / total) * 360;
                const path = createArc(currentAngle, currentAngle + angle, item.color);
                currentAngle += angle;
                return <path key={index} d={path} fill={item.color} className="hover:opacity-80 transition-opacity" />;
              })
            )}
            <circle cx="50" cy="50" r="25" fill="white" />
            <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-foreground">
              {total}
            </text>
          </svg>
          <div className="flex-1">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
                <span>Leads por Etapa</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-2">
                {data.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
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
  color = 'primary'
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'green' | 'red' | 'orange' | 'blue';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
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

export function AdminComercialDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('visao-geral');
  
  // Dados do Closer
  const [closerColunas, setCloserColunas] = useState<Coluna[]>([]);
  const [closerCards, setCloserCards] = useState<CardData[]>([]);
  const [closerAtividades, setCloserAtividades] = useState<Atividade[]>([]);
  
  // Dados da Prospecção
  const [prospeccaoColunas, setProspeccaoColunas] = useState<Coluna[]>([]);
  const [prospeccaoCards, setProspeccaoCards] = useState<CardData[]>([]);
  
  // Dados do Pós Venda
  const [posVendaColunas, setPosVendaColunas] = useState<Coluna[]>([]);
  const [posVendaCards, setPosVendaCards] = useState<CardData[]>([]);

  // Filtros para Relação de Negócios Ganhos
  const [filtroNegociosGanhos, setFiltroNegociosGanhos] = useState<'mes_atual' | 'proximo_mes' | 'anual' | 'personalizado'>('mes_atual');
  const [dataInicioPersonalizado, setDataInicioPersonalizado] = useState<Date | undefined>(undefined);
  const [dataFimPersonalizado, setDataFimPersonalizado] = useState<Date | undefined>(undefined);
  
  // Estado para popup de comissões
  const [comissaoDialogOpen, setComissaoDialogOpen] = useState(false);
  const [mesCompetencia, setMesCompetencia] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth()).padStart(2, '0')}`; // Mês atual por padrão
  });
  const [colaboradoresComerciais, setColaboradoresComerciais] = useState<{ id: string; nome: string; comissao: number | null }[]>([]);
  
  // Calcular mês de referência baseado no filtro
  const getMesReferencia = () => {
    const hoje = new Date();
    if (filtroNegociosGanhos === 'proximo_mes') {
      return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    }
    return hoje;
  };
  
  // Calcular mês de recebimento (1 mês após competência)
  const getMesRecebimento = () => {
    const [ano, mes] = mesCompetencia.split('-').map(Number);
    const dataCompetencia = new Date(ano, mes, 1);
    dataCompetencia.setMonth(dataCompetencia.getMonth() + 1);
    return format(dataCompetencia, 'MMMM/yyyy', { locale: ptBR });
  };
  
  // Gerar lista de meses para o dropdown (últimos 12 meses + mês atual + próximos 6 meses)
  const mesesDisponiveis = useMemo(() => {
    const meses = [];
    const hoje = new Date();
    
    // Próximos 6 meses (do mais distante para o mais próximo)
    for (let i = 6; i >= 1; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      meses.push({
        value: `${data.getFullYear()}-${String(data.getMonth()).padStart(2, '0')}`,
        label: format(data, 'MMMM/yyyy', { locale: ptBR })
      });
    }
    
    // Mês atual
    meses.push({
      value: `${hoje.getFullYear()}-${String(hoje.getMonth()).padStart(2, '0')}`,
      label: `${format(hoje, 'MMMM/yyyy', { locale: ptBR })} (atual)`
    });
    
    // Últimos 12 meses
    for (let i = 1; i <= 12; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({
        value: `${data.getFullYear()}-${String(data.getMonth()).padStart(2, '0')}`,
        label: format(data, 'MMMM/yyyy', { locale: ptBR })
      });
    }
    return meses;
  }, []);

  const empresaId = TORIQ_EMPRESA_ID;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Buscar dados do Closer
      const [closerColunasRes, closerCardsRes, closerAtividadesRes] = await Promise.all([
        (supabase as any).from('closer_colunas').select('*').eq('empresa_id', empresaId).order('ordem'),
        (supabase as any).from('closer_cards').select('*').eq('empresa_id', empresaId).eq('arquivado', false),
        (supabase as any).from('closer_atividades').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (closerColunasRes.data) setCloserColunas(closerColunasRes.data);
      if (closerCardsRes.data) setCloserCards(closerCardsRes.data);
      if (closerAtividadesRes.data) setCloserAtividades(closerAtividadesRes.data);

      // Buscar dados da Prospecção
      const [prospeccaoColunasRes, prospeccaoCardsRes] = await Promise.all([
        (supabase as any).from('prospeccao_colunas').select('*').eq('empresa_id', empresaId).order('ordem'),
        (supabase as any).from('prospeccao_cards').select('*').eq('empresa_id', empresaId),
      ]);

      if (prospeccaoColunasRes.data) setProspeccaoColunas(prospeccaoColunasRes.data);
      if (prospeccaoCardsRes.data) setProspeccaoCards(prospeccaoCardsRes.data);

      // Buscar dados do Pós Venda
      const [posVendaColunasRes, posVendaCardsRes] = await Promise.all([
        (supabase as any).from('pos_venda_colunas').select('*').eq('empresa_id', empresaId).order('ordem'),
        (supabase as any).from('pos_venda_cards').select('*').eq('empresa_id', empresaId),
      ]);

      if (posVendaColunasRes.data) setPosVendaColunas(posVendaColunasRes.data);
      if (posVendaCardsRes.data) setPosVendaCards(posVendaCardsRes.data);

      // Buscar colaboradores do setor comercial com comissão
      const { data: colaboradoresData } = await supabase
        .from('colaboradores')
        .select('id, nome, comissao')
        .eq('empresa_id', empresaId)
        .eq('setor', 'Comercial')
        .eq('ativo', true);
      
      if (colaboradoresData) setColaboradoresComerciais(colaboradoresData as any);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar negócios com parcelas no mês de competência selecionado
  // Inclui: negócios à vista fechados no mês OU parcelas de negócios 3x que caem nesse mês
  const negociosComParcelasNoMes = useMemo(() => {
    const [ano, mes] = mesCompetencia.split('-').map(Number);
    const mesCompetenciaDate = new Date(ano, mes, 1);
    
    const nomeNormalizado = (nome: string) => nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
    const colunaGanho = closerColunas.find(c => 
      nomeNormalizado(c.nome).includes('fechado') && nomeNormalizado(c.nome).includes('ganho')
    );
    
    if (!colunaGanho) return [];
    
    // Filtrar cards ganhos que têm parcela no mês de competência
    return closerCards
      .filter(card => card.coluna_id === colunaGanho.id)
      .map(card => {
        const dataCard = new Date(card.created_at);
        const forma = card.forma_pagamento || '3x';
        
        // Calcular diferença de meses entre a data do card e o mês de competência
        const mesesDesdeVenda = (mesCompetenciaDate.getFullYear() - dataCard.getFullYear()) * 12 + 
                                 (mesCompetenciaDate.getMonth() - dataCard.getMonth());
        
        // Para pagamento à vista: só aparece no mês do fechamento
        if (forma === 'a_vista') {
          if (mesesDesdeVenda === 0) {
            return {
              ...card,
              valorNoMes: card.valor_a_vista || card.valor || 0,
              numeroParcela: null,
              totalParcelas: null,
              tipoValor: 'À Vista'
            };
          }
          return null;
        }
        
        // Para leasing: só aparece no mês do fechamento
        if (forma === 'leasing') {
          if (mesesDesdeVenda === 0) {
            return {
              ...card,
              valorNoMes: card.valor_leasing || card.valor || 0,
              numeroParcela: null,
              totalParcelas: null,
              tipoValor: 'Leasing'
            };
          }
          return null;
        }
        
        // Para 3x: aparece nos 3 primeiros meses após o fechamento
        if (forma === '3x') {
          if (mesesDesdeVenda >= 0 && mesesDesdeVenda < 3) {
            const valorTotal = card.valor_3x || card.valor || 0;
            return {
              ...card,
              valorNoMes: valorTotal / 3,
              numeroParcela: mesesDesdeVenda + 1,
              totalParcelas: 3,
              tipoValor: `Parcela ${mesesDesdeVenda + 1}/3`
            };
          }
          return null;
        }
        
        return null;
      })
      .filter(Boolean) as (CardData & { valorNoMes: number; numeroParcela: number | null; totalParcelas: number | null; tipoValor: string })[];
  }, [closerCards, closerColunas, mesCompetencia]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    // Closer
    const totalCloserCards = closerCards.length;
    const closerValorTotal = closerCards.reduce((sum, card) => {
      const forma = card.forma_pagamento || '3x';
      if (forma === 'a_vista') return sum + (card.valor_a_vista || card.valor || 0);
      if (forma === 'leasing') return sum + (card.valor_leasing || card.valor || 0);
      return sum + (card.valor_3x || card.valor || 0);
    }, 0);

    // Cards por coluna do Closer
    const closerPorColuna = closerColunas.map(col => ({
      label: col.nome,
      value: closerCards.filter(c => c.coluna_id === col.id).length,
      color: col.cor,
    }));

    // Cards ganhos/perdidos
    const colunaGanho = closerColunas.find(c => 
      c.nome.toLowerCase().includes('ganho') || 
      c.nome.toLowerCase().includes('fechado') ||
      c.nome.toLowerCase().includes('aceito')
    );
    const colunaPerdido = closerColunas.find(c => c.nome.toLowerCase().includes('perdido'));
    
    const cardsGanhos = colunaGanho ? closerCards.filter(c => c.coluna_id === colunaGanho.id).length : 0;
    const cardsPerdidos = colunaPerdido ? closerCards.filter(c => c.coluna_id === colunaPerdido.id).length : 0;
    const cardsEmAndamento = totalCloserCards - cardsGanhos - cardsPerdidos;

    // Taxa de conversão
    const taxaConversao = totalCloserCards > 0 ? ((cardsGanhos / totalCloserCards) * 100).toFixed(1) : '0';

    // Prospecção
    const totalProspeccaoCards = prospeccaoCards.length;
    const prospeccaoPorColuna = prospeccaoColunas.map(col => ({
      label: col.nome,
      value: prospeccaoCards.filter(c => c.coluna_id === col.id).length,
      color: col.cor,
    }));

    // Pós Venda
    const totalPosVendaCards = posVendaCards.length;
    const posVendaPorColuna = posVendaColunas.map(col => ({
      label: col.nome,
      value: posVendaCards.filter(c => c.coluna_id === col.id).length,
      color: col.cor,
    }));

    // Temperatura dos leads (Closer)
    const leadsQuentes = closerCards.filter(c => c.temperatura === 'quente').length;
    const leadsMornos = closerCards.filter(c => c.temperatura === 'morno').length;
    const leadsFrios = closerCards.filter(c => c.temperatura === 'frio').length;

    // Atividades
    const atividadesHoje = closerAtividades.filter(a => {
      const hoje = new Date();
      const dataAtividade = new Date(a.created_at);
      return dataAtividade.toDateString() === hoje.toDateString();
    }).length;

    const atividadesPendentes = closerAtividades.filter(a => 
      a.status === 'pendente' || a.status === 'a_realizar' || a.status === 'programada'
    ).length;

    // Prospecção - Cards qualificados vs não qualificados
    const prospeccaoQualificados = prospeccaoColunas.find(c => 
      c.nome.toLowerCase().includes('qualificado') || c.nome.toLowerCase().includes('qualificação')
    );
    const prospeccaoNovos = prospeccaoColunas.find(c => 
      c.nome.toLowerCase().includes('novo') || c.nome.toLowerCase().includes('lead')
    );
    const prospeccaoConvertidos = prospeccaoColunas.find(c => 
      c.nome.toLowerCase().includes('convertido') || c.nome.toLowerCase().includes('ganho') || c.nome.toLowerCase().includes('fechado')
    );
    
    const sdrNovosLeads = prospeccaoNovos ? prospeccaoCards.filter(c => c.coluna_id === prospeccaoNovos.id).length : 0;
    const sdrQualificados = prospeccaoQualificados ? prospeccaoCards.filter(c => c.coluna_id === prospeccaoQualificados.id).length : 0;
    const sdrConvertidos = prospeccaoConvertidos ? prospeccaoCards.filter(c => c.coluna_id === prospeccaoConvertidos.id).length : 0;
    const sdrEmProcesso = totalProspeccaoCards - sdrNovosLeads - sdrQualificados - sdrConvertidos;

    // Valor de negócios fechados do mês
    const inicioMes = startOfMonth(new Date());
    const fimMes = endOfMonth(new Date());
    
    const cardsGanhosMes = colunaGanho ? closerCards.filter(c => {
      if (c.coluna_id !== colunaGanho.id) return false;
      const dataCard = new Date(c.created_at);
      return isWithinInterval(dataCard, { start: inicioMes, end: fimMes });
    }) : [];
    
    const valorFechadoMes = cardsGanhosMes.reduce((sum, card) => {
      const forma = card.forma_pagamento || '3x';
      if (forma === 'a_vista') return sum + (card.valor_a_vista || card.valor || 0);
      if (forma === 'leasing') return sum + (card.valor_leasing || card.valor || 0);
      return sum + (card.valor_3x || card.valor || 0);
    }, 0);

    const qtdFechadoMes = cardsGanhosMes.length;

    return {
      totalCloserCards,
      closerValorTotal,
      closerPorColuna,
      cardsGanhos,
      cardsPerdidos,
      cardsEmAndamento,
      taxaConversao,
      totalProspeccaoCards,
      prospeccaoPorColuna,
      totalPosVendaCards,
      posVendaPorColuna,
      leadsQuentes,
      leadsMornos,
      leadsFrios,
      atividadesHoje,
      atividadesPendentes,
      sdrNovosLeads,
      sdrQualificados,
      sdrConvertidos,
      sdrEmProcesso,
      valorFechadoMes,
      qtdFechadoMes,
    };
  }, [closerCards, closerColunas, prospeccaoCards, prospeccaoColunas, posVendaCards, posVendaColunas, closerAtividades]);

  // Negócios ganhos filtrados - apenas da coluna "Fechado/Ganho" ou "Fechado / Ganho" (excluindo "Negócio Aceito")
  const negociosGanhosFiltrados = useMemo(() => {
    const nomeNormalizado = (nome: string) => nome.toLowerCase().replace(/\s+/g, '');
    const colunaGanho = closerColunas.find(c => 
      nomeNormalizado(c.nome).includes('fechado') && nomeNormalizado(c.nome).includes('ganho')
    );
    
    if (!colunaGanho) return [];
    
    const cardsGanhos = closerCards.filter(c => c.coluna_id === colunaGanho.id);
    
    let dataInicio: Date;
    let dataFim: Date;
    
    if (filtroNegociosGanhos === 'mes_atual') {
      dataInicio = startOfMonth(new Date());
      dataFim = endOfMonth(new Date());
    } else if (filtroNegociosGanhos === 'proximo_mes') {
      const proximoMes = new Date();
      proximoMes.setMonth(proximoMes.getMonth() + 1);
      dataInicio = startOfMonth(proximoMes);
      dataFim = endOfMonth(proximoMes);
    } else if (filtroNegociosGanhos === 'anual') {
      dataInicio = startOfYear(new Date());
      dataFim = endOfYear(new Date());
    } else {
      dataInicio = dataInicioPersonalizado || startOfMonth(new Date());
      dataFim = dataFimPersonalizado || endOfMonth(new Date());
    }
    
    return cardsGanhos.filter(card => {
      const dataCard = new Date(card.created_at);
      return isWithinInterval(dataCard, { start: dataInicio, end: dataFim });
    });
  }, [closerCards, closerColunas, filtroNegociosGanhos, dataInicioPersonalizado, dataFimPersonalizado]);

  // Dados para os gráficos de pizza do topo
  const pieChartData = useMemo(() => ({
    // Gráfico 1: Funil SDR (Prospecção)
    funilSDR: [
      { label: 'Novos Leads', value: metrics.sdrNovosLeads, color: '#6366f1' },
      { label: 'Em Processo', value: metrics.sdrEmProcesso, color: '#f59e0b' },
      { label: 'Qualificados', value: metrics.sdrQualificados, color: '#22c55e' },
      { label: 'Convertidos', value: metrics.sdrConvertidos, color: '#10b981' },
    ],
    // Gráfico 2: Funil Closer
    funilCloser: [
      { label: 'Em Andamento', value: metrics.cardsEmAndamento, color: '#f59e0b' },
      { label: 'Ganhos', value: metrics.cardsGanhos, color: '#22c55e' },
      { label: 'Perdidos', value: metrics.cardsPerdidos, color: '#ef4444' },
    ],
    // Gráfico 3: Negócios Fechados do Mês (valor)
    negociosFechadosMes: metrics.qtdFechadoMes,
    valorFechadoMes: metrics.valorFechadoMes,
  }), [metrics]);

  const renderContent = () => {
    switch (activeMenu) {
      case 'visao-geral':
        return (
          <div className="space-y-6">
            {/* Cards de métricas principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total de Leads (Closer)"
                value={metrics.totalCloserCards}
                subtitle="Leads ativos no funil"
                icon={Users}
                color="primary"
              />
              <MetricCard
                title="Valor Total em Pipeline"
                value={`R$ ${metrics.closerValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subtitle="Soma dos negócios"
                icon={DollarSign}
                color="green"
              />
              <MetricCard
                title="Taxa de Conversão"
                value={`${metrics.taxaConversao}%`}
                subtitle="Leads ganhos / total"
                icon={Target}
                color="blue"
              />
              <MetricCard
                title="Atividades Hoje"
                value={metrics.atividadesHoje}
                subtitle={`${metrics.atividadesPendentes} pendentes`}
                icon={Activity}
                color="orange"
              />
            </div>

            {/* Tabela de leads por coluna */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuição por Etapa do Funil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.closerPorColuna.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="flex-1 text-sm">{item.label}</span>
                      <Badge variant="secondary">{item.value}</Badge>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all" 
                          style={{ 
                            width: `${metrics.totalCloserCards > 0 ? (item.value / metrics.totalCloserCards) * 100 : 0}%`,
                            backgroundColor: item.color 
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'funil-closer':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="Total de Leads" value={metrics.totalCloserCards} icon={Users} color="primary" />
              <MetricCard title="Leads Ganhos" value={metrics.cardsGanhos} icon={Trophy} color="green" />
              <MetricCard title="Leads Perdidos" value={metrics.cardsPerdidos} icon={XCircle} color="red" />
            </div>
            <Collapsible>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-sm">Leads por Etapa</CardTitle>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.closerPorColuna.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="flex-1 text-sm">{item.label}</span>
                          <Badge variant="secondary">{item.value}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Widget Relação de Negócios Ganhos */}
            <Collapsible>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-sm">Relação de Negócios Ganhos</CardTitle>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Filtros */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Select value={filtroNegociosGanhos} onValueChange={(value: 'mes_atual' | 'proximo_mes' | 'anual' | 'personalizado') => setFiltroNegociosGanhos(value)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mes_atual">Mês Atual</SelectItem>
                          <SelectItem value="proximo_mes">Próximo Mês</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                          <SelectItem value="personalizado">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>

                      {filtroNegociosGanhos === 'personalizado' && (
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-[130px] justify-start text-left font-normal">
                                <Calendar className="mr-2 h-4 w-4" />
                                {dataInicioPersonalizado ? format(dataInicioPersonalizado, 'dd/MM/yyyy') : 'Data início'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={dataInicioPersonalizado}
                                onSelect={setDataInicioPersonalizado}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <span className="text-muted-foreground">até</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-[130px] justify-start text-left font-normal">
                                <Calendar className="mr-2 h-4 w-4" />
                                {dataFimPersonalizado ? format(dataFimPersonalizado, 'dd/MM/yyyy') : 'Data fim'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={dataFimPersonalizado}
                                onSelect={setDataFimPersonalizado}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}

                      <Badge variant="outline">
                        {negociosGanhosFiltrados.length} negócio{negociosGanhosFiltrados.length !== 1 ? 's' : ''}
                      </Badge>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-auto"
                        onClick={() => setComissaoDialogOpen(true)}
                      >
                        <Percent className="h-4 w-4 mr-2" />
                        Comissão
                      </Button>
                    </div>

                    {/* Tabela de Negócios Ganhos */}
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Forma Pgto</TableHead>
                            <TableHead className="text-right">Valor À Vista</TableHead>
                            <TableHead className="text-right">Valor Parcelado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {negociosGanhosFiltrados.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                Nenhum negócio ganho no período selecionado
                              </TableCell>
                            </TableRow>
                          ) : (
                            negociosGanhosFiltrados.map((card) => {
                              const forma = card.forma_pagamento || '3x';
                              const valorAVista = card.valor_a_vista || card.valor || 0;
                              const valor3x = card.valor_3x || card.valor || 0;
                              
                              // Calcular valor da parcela do mês atual
                              // Se for 3x, divide por 3 para mostrar a parcela mensal
                              const valorParcela = forma === '3x' ? valor3x / 3 : 0;
                              
                              // Verificar se o card tem parcelas pendentes para o mês de referência
                              const mesReferencia = getMesReferencia();
                              const dataCard = new Date(card.created_at);
                              const mesesDesdeVenda = (mesReferencia.getFullYear() - dataCard.getFullYear()) * 12 + (mesReferencia.getMonth() - dataCard.getMonth());
                              
                              // Se for parcelado em 3x, mostrar parcela apenas nos 3 primeiros meses
                              const temParcelaNoPeriodo = forma === '3x' && mesesDesdeVenda >= 0 && mesesDesdeVenda < 3;
                              
                              return (
                                <TableRow key={card.id}>
                                  <TableCell className="font-medium">{card.titulo}</TableCell>
                                  <TableCell>{format(new Date(card.created_at), 'dd/MM/yyyy')}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">
                                      {forma === 'a_vista' ? 'À Vista' : forma === 'leasing' ? 'Leasing' : '3x'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-green-600">
                                    {forma === 'a_vista' ? (
                                      `R$ ${valorAVista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-blue-600">
                                    {forma === '3x' && temParcelaNoPeriodo ? (
                                      <div className="flex flex-col items-end">
                                        <span>R$ {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        <span className="text-xs text-muted-foreground">
                                          Parcela {mesesDesdeVenda + 1}/3
                                        </span>
                                      </div>
                                    ) : forma === '3x' ? (
                                      <span className="text-muted-foreground text-xs">Quitado</span>
                                    ) : '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    {/* Total */}
                    {negociosGanhosFiltrados.length > 0 && (() => {
                      const mesReferencia = getMesReferencia();
                      
                      // Calcular total à vista
                      const totalAVista = negociosGanhosFiltrados.reduce((sum, card) => {
                        const forma = card.forma_pagamento || '3x';
                        if (forma === 'a_vista') {
                          return sum + (card.valor_a_vista || card.valor || 0);
                        }
                        return sum;
                      }, 0);
                      
                      // Calcular total parcelado do período
                      const totalParcelado = negociosGanhosFiltrados.reduce((sum, card) => {
                        const forma = card.forma_pagamento || '3x';
                        if (forma === '3x') {
                          const valor3x = card.valor_3x || card.valor || 0;
                          const valorParcela = valor3x / 3;
                          const dataCard = new Date(card.created_at);
                          const mesesDesdeVenda = (mesReferencia.getFullYear() - dataCard.getFullYear()) * 12 + (mesReferencia.getMonth() - dataCard.getMonth());
                          if (mesesDesdeVenda >= 0 && mesesDesdeVenda < 3) {
                            return sum + valorParcela;
                          }
                        }
                        return sum;
                      }, 0);
                      
                      return (
                        <div className="pt-2 border-t space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Total À Vista</span>
                            <span className="text-lg font-bold text-green-600">
                              R$ {totalAVista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Total Parcelado (no período)</span>
                            <span className="text-lg font-bold text-blue-600">
                              R$ {totalParcelado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-bold">Total Geral do Período</span>
                            <span className="text-xl font-bold text-primary">
                              R$ {(totalAVista + totalParcelado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        );

      case 'prospeccao':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard title="Total de Leads" value={metrics.totalProspeccaoCards} icon={UserSearch} color="primary" />
              <MetricCard title="Colunas Ativas" value={prospeccaoColunas.length} icon={BarChart3} color="blue" />
            </div>
            <Collapsible>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-sm">Leads por Etapa (SDR)</CardTitle>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.prospeccaoPorColuna.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="flex-1 text-sm">{item.label}</span>
                          <Badge variant="secondary">{item.value}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        );

      case 'pos-venda':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard title="Total de Clientes" value={metrics.totalPosVendaCards} icon={HeartHandshake} color="primary" />
              <MetricCard title="Etapas Ativas" value={posVendaColunas.length} icon={BarChart3} color="green" />
            </div>
            <Collapsible>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-sm">Clientes por Etapa (Pós Venda)</CardTitle>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.posVendaPorColuna.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="flex-1 text-sm">{item.label}</span>
                          <Badge variant="secondary">{item.value}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        );

      case 'atividades':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="Atividades Hoje" value={metrics.atividadesHoje} icon={CalendarDays} color="primary" />
              <MetricCard title="Pendentes" value={metrics.atividadesPendentes} icon={Clock} color="orange" />
              <MetricCard title="Total Registradas" value={closerAtividades.length} icon={Activity} color="blue" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Últimas Atividades</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {closerAtividades.slice(0, 20).map((atividade) => (
                      <div key={atividade.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className={`p-1.5 rounded-full ${
                          atividade.status === 'concluida' ? 'bg-green-100 text-green-600' :
                          atividade.status === 'pendente' ? 'bg-orange-100 text-orange-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {atividade.tipo === 'ligacao' ? <Phone className="h-3 w-3" /> :
                           atividade.tipo === 'email' ? <Mail className="h-3 w-3" /> :
                           <FileText className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{atividade.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(atividade.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant={atividade.status === 'concluida' ? 'default' : 'secondary'} className="text-xs">
                          {atividade.status === 'concluida' ? 'Concluída' : 
                           atividade.status === 'pendente' ? 'Pendente' : 
                           atividade.status === 'programada' ? 'Programada' : 'A realizar'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );

      case 'metas':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Metas do Mês</CardTitle>
                <CardDescription>Acompanhamento de metas comerciais</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Meta de Leads */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Leads Qualificados</span>
                      <span className="text-sm text-muted-foreground">{metrics.totalCloserCards} / 50</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all" 
                        style={{ width: `${Math.min((metrics.totalCloserCards / 50) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>

                  {/* Meta de Conversão */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Taxa de Conversão</span>
                      <span className="text-sm text-muted-foreground">{metrics.taxaConversao}% / 30%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all" 
                        style={{ width: `${Math.min((parseFloat(metrics.taxaConversao) / 30) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>

                  {/* Meta de Valor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Valor em Pipeline</span>
                      <span className="text-sm text-muted-foreground">
                        R$ {metrics.closerValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} / R$ 500.000
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all" 
                        style={{ width: `${Math.min((metrics.closerValorTotal / 500000) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <h1 className="text-2xl font-bold">Dashboard Comercial</h1>
          <p className="text-sm text-muted-foreground">Métricas e indicadores do setor comercial</p>
        </div>
      </div>

      {/* Gráficos de Pizza no Topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PieChartSimple
          data={pieChartData.funilSDR}
          title="Funil SDR (Prospecção)"
          subtitle={`${metrics.totalProspeccaoCards} leads no funil`}
        />
        <PieChartSimple
          data={pieChartData.funilCloser}
          title="Funil CLOSER"
          subtitle={`${metrics.totalCloserCards} leads | Taxa: ${metrics.taxaConversao}%`}
        />
        {/* Card de Negócios Fechados do Mês */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Negócios Fechados do Mês</CardTitle>
            <CardDescription className="text-xs">{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-green-100">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-green-600">
                  R$ {pieChartData.valorFechadoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pieChartData.negociosFechadosMes} negócio{pieChartData.negociosFechadosMes !== 1 ? 's' : ''} fechado{pieChartData.negociosFechadosMes !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Layout com Menu Lateral e Conteúdo */}
      <div className="flex gap-6">
        {/* Menu Lateral */}
        <div className="w-64 flex-shrink-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Menu</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {menuOptions.map((option) => (
                  <Button
                    key={option.id}
                    variant={activeMenu === option.id ? 'secondary' : 'ghost'}
                    className={`w-full justify-start text-left h-auto py-3 ${
                      activeMenu === option.id ? 'bg-primary/10 text-primary' : ''
                    }`}
                    onClick={() => setActiveMenu(option.id)}
                  >
                    <option.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{option.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>

      {/* Dialog de Comissões */}
      <Dialog open={comissaoDialogOpen} onOpenChange={setComissaoDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Comissões do Período
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Seletores de Mês */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mês de Competência</Label>
                <Select value={mesCompetencia} onValueChange={setMesCompetencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {mesesDisponiveis.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mês de Recebimento</Label>
                <Input 
                  value={getMesRecebimento()} 
                  disabled 
                  className="bg-muted capitalize"
                />
              </div>
            </div>

            {/* Tabela de Negócios com Comissão */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Negócio</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Comissão (%)</TableHead>
                    <TableHead className="text-right">Valor Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {negociosComParcelasNoMes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum valor a receber no mês selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    negociosComParcelasNoMes.map((card, index) => {
                      // Buscar comissão do colaborador responsável (usar primeiro colaborador comercial como padrão)
                      const colaborador = colaboradoresComerciais.find(c => c.id === card.responsavel_id) || colaboradoresComerciais[0];
                      const percentualComissao = colaborador?.comissao || 0;
                      const valorComissao = (card.valorNoMes * percentualComissao) / 100;
                      
                      return (
                        <TableRow key={`${card.id}-${index}`}>
                          <TableCell className="font-medium">
                            {card.titulo}
                            <Badge variant="outline" className="ml-2 text-xs">
                              {card.tipoValor}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(card.created_at), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right">
                            R$ {card.valorNoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            {percentualComissao > 0 ? `${percentualComissao}%` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {percentualComissao > 0 
                              ? `R$ ${valorComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Total de Comissões */}
            {negociosComParcelasNoMes.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <span className="font-semibold text-green-800">Total de Comissões do Mês</span>
                <span className="text-2xl font-bold text-green-600">
                  R$ {negociosComParcelasNoMes.reduce((sum, card) => {
                    const colaborador = colaboradoresComerciais.find(c => c.id === card.responsavel_id) || colaboradoresComerciais[0];
                    const percentualComissao = colaborador?.comissao || 0;
                    return sum + (card.valorNoMes * percentualComissao) / 100;
                  }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
