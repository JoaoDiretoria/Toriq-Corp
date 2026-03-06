import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Star, Users, MessageSquare, Download, BarChart3, TrendingUp, RefreshCw, CheckCircle2, AlertCircle, Award } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
  Cell
} from 'recharts';
import html2canvas from 'html2canvas';

interface OpcaoResposta {
  id: string;
  valor: number;
  texto: string;
}

interface Item {
  id: string;
  texto: string;
  ordem: number;
}

interface Categoria {
  id: string;
  nome: string;
  ordem: number;
  opcoes: OpcaoResposta[];
  itens: Item[];
}

interface Modelo {
  id: string;
  nome: string;
  descricao: string | null;
  campo_sugestoes: boolean;
  categorias: Categoria[];
}

interface RespostaColaborador {
  colaborador_id: string;
  colaborador_nome: string;
  respostas: Record<string, number>;
  sugestoes_comentarios: string | null;
}

interface ColaboradorNotas {
  id: string;
  nome: string;
  nota_pre_teste: number | null;
  nota_pos_teste: number | null;
  reorientado: boolean;
}

interface AvaliacaoReacaoResultadosProps {
  turmaId: string;
  treinamentoId: string;
  totalColaboradores?: number;
  colaboradores?: ColaboradorNotas[];
  onRefresh?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

const db = supabase as any;

// Função para determinar cor semântica baseada no texto da opção
const getSemanticColor = (texto: string, valor: number, totalOpcoes: number): string => {
  const textoLower = texto.toLowerCase().trim();
  
  // Cores para Sim/Não
  if (textoLower === 'sim') return '#22c55e'; // Verde
  if (textoLower === 'não' || textoLower === 'nao') return '#ef4444'; // Vermelho
  
  // Cores para Ótimo/Bom/Ruim (escala de 3)
  if (textoLower === 'ótimo' || textoLower === 'otimo' || textoLower === 'excelente') return '#22c55e'; // Verde
  if (textoLower === 'bom' || textoLower === 'regular') return '#eab308'; // Amarelo
  if (textoLower === 'ruim' || textoLower === 'péssimo' || textoLower === 'pessimo') return '#ef4444'; // Vermelho
  
  // Fallback baseado no valor (quanto maior, mais verde)
  if (totalOpcoes <= 2) {
    return valor === 1 ? '#ef4444' : '#22c55e';
  }
  if (totalOpcoes === 3) {
    if (valor === 1) return '#ef4444'; // Vermelho
    if (valor === 2) return '#eab308'; // Amarelo
    return '#22c55e'; // Verde
  }
  
  // Para escalas maiores, gradiente de vermelho a verde
  const ratio = (valor - 1) / (totalOpcoes - 1);
  if (ratio < 0.33) return '#ef4444';
  if (ratio < 0.66) return '#eab308';
  return '#22c55e';
};

export function AvaliacaoReacaoResultados({ turmaId, treinamentoId, totalColaboradores = 0, colaboradores = [], onRefresh, onLoadingChange }: AvaliacaoReacaoResultadosProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [respostas, setRespostas] = useState<RespostaColaborador[]>([]);
  const [contagens, setContagens] = useState<Record<string, Record<number, number>>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mainCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchDados();
  }, [turmaId, treinamentoId]);

  // Notificar mudança de loading
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDados();
    if (onRefresh) onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  const fetchDados = async () => {
    try {
      setLoading(true);
      
      // Buscar modelo de avaliação vinculado ao treinamento
      const { data: modeloTreinamento, error: mtError } = await db
        .from('avaliacao_reacao_modelo_treinamentos')
        .select('modelo_id')
        .eq('treinamento_id', treinamentoId)
        .limit(1)
        .single();

      if (mtError || !modeloTreinamento) {
        console.log('Nenhum modelo de avaliação vinculado a este treinamento');
        setModelo(null);
        setLoading(false);
        return;
      }

      // Buscar dados do modelo
      const { data: modeloData, error: modeloError } = await db
        .from('avaliacao_reacao_modelos')
        .select('id, nome, descricao, campo_sugestoes')
        .eq('id', modeloTreinamento.modelo_id)
        .single();

      if (modeloError || !modeloData) {
        console.log('Modelo de avaliação não encontrado');
        setModelo(null);
        setLoading(false);
        return;
      }

      // Buscar categorias do modelo
      const { data: categoriasData, error: categoriasError } = await db
        .from('avaliacao_reacao_categorias')
        .select('id, nome, ordem')
        .eq('modelo_id', modeloData.id)
        .order('ordem');

      if (categoriasError) throw categoriasError;

      const categorias: Categoria[] = [];

      for (const cat of categoriasData || []) {
        // Buscar opções de resposta
        const { data: opcoesData } = await db
          .from('avaliacao_reacao_opcoes_resposta')
          .select('id, valor, texto')
          .eq('categoria_id', cat.id)
          .order('valor');

        // Buscar itens
        const { data: itensData } = await db
          .from('avaliacao_reacao_itens')
          .select('id, texto, ordem')
          .eq('categoria_id', cat.id)
          .order('ordem');

        categorias.push({
          ...cat,
          opcoes: opcoesData || [],
          itens: itensData || []
        });
      }

      setModelo({
        ...modeloData,
        categorias
      });

      // Buscar respostas dos colaboradores da turma
      const { data: respostasData, error: respostasError } = await db
        .from('avaliacao_reacao_respostas')
        .select(`
          colaborador_id,
          respostas,
          sugestoes_comentarios,
          colaborador:colaboradores!avaliacao_reacao_respostas_colaborador_id_fkey(nome)
        `)
        .eq('turma_id', turmaId)
        .eq('modelo_id', modeloData.id);

      if (respostasError) throw respostasError;

      const respostasFormatadas: RespostaColaborador[] = (respostasData || []).map((r: any) => ({
        colaborador_id: r.colaborador_id,
        colaborador_nome: r.colaborador?.nome || 'Colaborador',
        respostas: r.respostas || {},
        sugestoes_comentarios: r.sugestoes_comentarios
      }));

      setRespostas(respostasFormatadas);

      // Calcular contagens por item e opção
      const novasContagens: Record<string, Record<number, number>> = {};
      
      // Inicializar contagens com 0
      categorias.forEach(cat => {
        cat.itens.forEach(item => {
          novasContagens[item.id] = {};
          cat.opcoes.forEach(opcao => {
            novasContagens[item.id][opcao.valor] = 0;
          });
        });
      });

      // Contar respostas
      respostasFormatadas.forEach(resposta => {
        Object.entries(resposta.respostas).forEach(([itemId, valor]) => {
          if (novasContagens[itemId] && novasContagens[itemId][valor] !== undefined) {
            novasContagens[itemId][valor]++;
          }
        });
      });

      setContagens(novasContagens);

    } catch (error) {
      console.error('Erro ao buscar dados da avaliação:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCard = async (elementId: string, filename: string) => {
    const element = cardRefs.current[elementId] || mainCardRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Erro ao fazer download:', error);
    }
  };

  // Gráfico de barras horizontais empilhadas: cada pergunta é uma barra, cada opção é uma parte da pilha
  const getStackedHorizontalChartData = (categoria: Categoria) => {
    // Cada item/pergunta gera uma linha no gráfico
    return categoria.itens.map((item) => {
      const itemData: Record<string, any> = {
        name: item.texto,
        shortName: item.texto.length > 40 ? item.texto.substring(0, 40) + '...' : item.texto
      };
      
      // Adicionar contagem de cada opção de resposta
      categoria.opcoes.forEach(opcao => {
        itemData[opcao.texto] = contagens[item.id]?.[opcao.valor] || 0;
      });
      
      return itemData;
    });
  };

  // Obter totais por opção para o resumo
  const getTotaisPorOpcao = (categoria: Categoria) => {
    return categoria.opcoes.map((opcao) => {
      let total = 0;
      categoria.itens.forEach(item => {
        total += contagens[item.id]?.[opcao.valor] || 0;
      });
      
      return {
        texto: opcao.texto,
        valor: opcao.valor,
        total,
        cor: getSemanticColor(opcao.texto, opcao.valor, categoria.opcoes.length)
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!modelo) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Star className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum modelo de avaliação vinculado</p>
          <p className="text-sm">Configure um modelo de avaliação na página de Avaliação de Reação</p>
        </CardContent>
      </Card>
    );
  }

  const totalRespostas = respostas.length;
  const percentualRespondido = totalColaboradores > 0 
    ? Math.round((totalRespostas / totalColaboradores) * 100) 
    : 0;
  const sugestoesComentarios = respostas.filter(r => r.sugestoes_comentarios).map(r => ({
    nome: r.colaborador_nome,
    texto: r.sugestoes_comentarios
  }));

  // Calcular estatísticas dos colaboradores
  const colaboradoresComNota = colaboradores.filter(c => c.nota_pos_teste !== null && c.nota_pos_teste >= 7);
  const colaboradoresReorientados = colaboradoresComNota.filter(c => c.nota_pos_teste !== null && c.nota_pos_teste < 10 && c.reorientado);
  const colaboradoresNaoReorientados = colaboradoresComNota.filter(c => c.nota_pos_teste === 10);
  const colaboradoresPendentesReorientacao = colaboradoresComNota.filter(c => c.nota_pos_teste !== null && c.nota_pos_teste < 10 && !c.reorientado);
  
  // Calcular nota média do pós-teste
  const notasPosTeste = colaboradores.filter(c => c.nota_pos_teste !== null).map(c => c.nota_pos_teste as number);
  const notaMediaPosTeste = notasPosTeste.length > 0 
    ? notasPosTeste.reduce((a, b) => a + b, 0) / notasPosTeste.length 
    : 0;

  // Dados para o gráfico comparativo pré/pós-teste
  const dadosComparativoNotas = colaboradores
    .filter(c => c.nota_pre_teste !== null || c.nota_pos_teste !== null)
    .map(c => ({
      nome: c.nome.length > 15 ? c.nome.substring(0, 15) + '...' : c.nome,
      nomeCompleto: c.nome,
      'Pré-Teste': c.nota_pre_teste || 0,
      'Pós-Teste': c.nota_pos_teste || 0,
    }));

  // Calcular média geral (considerando que valores maiores são melhores)
  const calcularMediaCategoria = (categoria: Categoria) => {
    let somaTotal = 0;
    let countTotal = 0;
    const maxValor = Math.max(...categoria.opcoes.map(o => o.valor));

    categoria.itens.forEach(item => {
      categoria.opcoes.forEach(opcao => {
        const count = contagens[item.id]?.[opcao.valor] || 0;
        somaTotal += opcao.valor * count;
        countTotal += count;
      });
    });

    if (countTotal === 0) return 0;
    return ((somaTotal / countTotal) / maxValor) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header com botão de atualizar */}
      <div className="flex items-center justify-between bg-slate-50 rounded-lg p-4 border">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Star className="h-5 w-5 text-slate-600" />
            Resultados da Avaliação
          </h2>
          <p className="text-sm text-slate-500">
            {dadosComparativoNotas.length} / {colaboradores.length} colaboradores com notas registradas
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Cards de Estatísticas - Visual Neutro e Uniforme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Nota Média */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Nota Média (Pós-Teste)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-800">{notaMediaPosTeste.toFixed(1)}</span>
                  <span className="text-lg text-slate-400">/ 10</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {notasPosTeste.length} colaborador{notasPosTeste.length !== 1 ? 'es' : ''} avaliado{notasPosTeste.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <Award className="h-8 w-8 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Não Reorientados (Nota 10) */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Nota 10 (Sem Reorientação)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-800">{colaboradoresNaoReorientados.length}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  colaborador{colaboradoresNaoReorientados.length !== 1 ? 'es' : ''} com nota máxima
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <CheckCircle2 className="h-8 w-8 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Reorientados */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Reorientados (7-9)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-800">{colaboradoresReorientados.length}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  colaborador{colaboradoresReorientados.length !== 1 ? 'es' : ''} reorientado{colaboradoresReorientados.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <RefreshCw className="h-8 w-8 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Pendentes Reorientação */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Pendentes Reorientação</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-800">{colaboradoresPendentesReorientacao.length}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  aguardando reorientação
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <AlertCircle className="h-8 w-8 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Comparativo Pré x Pós-Teste */}
      {dadosComparativoNotas.length > 0 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100">
                  <BarChart3 className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Comparativo Pré-Teste x Pós-Teste</CardTitle>
                  <CardDescription>
                    Evolução das notas por colaborador
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-300">
                {dadosComparativoNotas.length} / {colaboradores.length} responderam
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-xl p-4 border" style={{ height: Math.max(350, dadosComparativoNotas.length * 70) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosComparativoNotas}
                  layout="vertical"
                  margin={{ top: 20, right: 50, left: 100, bottom: 20 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    domain={[0, 10]} 
                    tickCount={11}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="nome" 
                    width={90}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [`Nota: ${value}`, name]}
                    labelFormatter={(label) => {
                      const item = dadosComparativoNotas.find(d => d.nome === label);
                      return item?.nomeCompleto || label;
                    }}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend 
                    verticalAlign="top"
                    wrapperStyle={{ paddingBottom: '10px' }}
                  />
                  <Bar 
                    dataKey="Pré-Teste" 
                    fill="#94a3b8" 
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  >
                    <LabelList 
                      dataKey="Pré-Teste" 
                      position="insideRight"
                      fill="#fff"
                      fontSize={12}
                      fontWeight={600}
                      formatter={(value: number) => value > 0 ? value : ''}
                    />
                  </Bar>
                  <Bar 
                    dataKey="Pós-Teste" 
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  >
                    {dadosComparativoNotas.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry['Pós-Teste'] >= 7 ? '#22c55e' : '#ef4444'} 
                      />
                    ))}
                    <LabelList 
                      dataKey="Pós-Teste" 
                      position="insideRight"
                      fill="#fff"
                      fontSize={12}
                      fontWeight={600}
                      formatter={(value: number) => value > 0 ? value : ''}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card Principal - Resumo Avaliação de Reação */}
      <div ref={mainCardRef}>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-100 rounded-xl">
                  <Star className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-slate-800">{modelo.nome}</CardTitle>
                  {modelo.descricao && (
                    <CardDescription className="text-slate-500">{modelo.descricao}</CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-300">
                  {totalRespostas} / {totalColaboradores || '?'} responderam
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCard('main', 'avaliacao-reacao-resumo')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Card de Respostas */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">Respostas Avaliação</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-800">{totalRespostas}</span>
                  <span className="text-lg text-slate-400">/ {totalColaboradores || '?'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">colaboradores responderam</p>
              </div>

              {/* Card de Percentual */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">Taxa de Resposta</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-800">{percentualRespondido}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-slate-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentualRespondido}%` }}
                  />
                </div>
              </div>

              {/* Card de Categorias */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">Categorias</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-800">{modelo.categorias.length}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {modelo.categorias.reduce((acc, cat) => acc + cat.itens.length, 0)} itens avaliados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards por Categoria com Gráficos de Barras Horizontais Empilhadas */}
      {modelo.categorias.map((categoria) => {
        const chartData = getStackedHorizontalChartData(categoria);
        const totaisPorOpcao = getTotaisPorOpcao(categoria);
        const mediaCategoria = calcularMediaCategoria(categoria);
        const chartHeight = Math.max(300, categoria.itens.length * 45);
        const totalRespostasCategoria = totaisPorOpcao.reduce((acc, item) => acc + item.total, 0);
        const totalPossivel = categoria.itens.length * totalColaboradores;
        
        return (
          <div 
            key={categoria.id} 
            ref={el => cardRefs.current[categoria.id] = el}
          >
            <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <BarChart3 className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{categoria.nome}</CardTitle>
                      <CardDescription>
                        {categoria.itens.length} {categoria.itens.length === 1 ? 'item' : 'itens'} avaliados
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-300">
                      {totalRespostas} / {totalColaboradores} responderam
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadCard(categoria.id, `avaliacao-${categoria.nome.toLowerCase().replace(/\s+/g, '-')}`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Gráfico de Barras Horizontais Empilhadas */}
                <div className="bg-white rounded-xl p-4 mb-4 border">
                  <div style={{ height: `${chartHeight}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 200, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis 
                          type="number"
                          allowDecimals={false}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          type="category"
                          dataKey="shortName"
                          width={190}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [`${value} respostas`, name]}
                          labelFormatter={(label) => {
                            const item = chartData.find(d => d.shortName === label);
                            return item?.name || label;
                          }}
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom"
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                        {categoria.opcoes.map((opcao) => (
                          <Bar 
                            key={opcao.id}
                            dataKey={opcao.texto}
                            stackId="stack"
                            fill={getSemanticColor(opcao.texto, opcao.valor, categoria.opcoes.length)}
                            radius={0}
                          >
                            <LabelList 
                              dataKey={opcao.texto}
                              position="center"
                              fill="#fff"
                              fontSize={12}
                              fontWeight={600}
                              formatter={(value: number) => value > 0 ? value : ''}
                            />
                          </Bar>
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cards Resumo por Opção */}
                <div className="flex flex-wrap gap-3 justify-center">
                  {totaisPorOpcao.map((item) => (
                    <div 
                      key={item.texto}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                      style={{ 
                        borderColor: item.cor,
                        backgroundColor: `${item.cor}15`
                      }}
                    >
                      <span 
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: item.cor }}
                      />
                      <span className="text-sm font-medium text-slate-700">{item.texto}:</span>
                      <span 
                        className="text-lg font-bold"
                        style={{ color: item.cor }}
                      >
                        {item.total}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}

      {/* Sugestões e Comentários */}
      {modelo.campo_sugestoes && (
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Sugestões e Comentários</CardTitle>
                  <CardDescription>
                    {sugestoesComentarios.length} colaborador{sugestoesComentarios.length !== 1 ? 'es' : ''} deixaram comentários
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sugestoesComentarios.length > 0 ? (
              <div className="space-y-3">
                {sugestoesComentarios.map((item, index) => (
                  <div key={index} className="border rounded-xl p-4 bg-gradient-to-r from-blue-50 to-slate-50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">
                          {item.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item.nome}</span>
                    </div>
                    <p className="text-sm text-slate-600 pl-10">{item.texto}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhum colaborador deixou sugestões ou comentários</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
