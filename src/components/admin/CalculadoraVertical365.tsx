import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Save, AlertTriangle, Search, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TreinamentoSelectorModal } from './TreinamentoSelectorModal';

interface TreinamentoCatalogo {
  id: string;
  nome: string;
  norma: string;
  ch_formacao: number;
  ch_reciclagem: number;
}

interface ProdutoServicoTreinamento {
  id: string;
  nome: string;
  codigo: string | null;
  preco: number | null;
  descricao: string | null;
  tipo: 'produto' | 'servico';
  carga_horaria: number | null;
  ch_formacao: number | null;
  ch_reciclagem: number | null;
  colaboradores_por_turma: number | null;
  categoria?: {
    id: string;
    nome: string;
    cor: string;
  };
  treinamento?: {
    id: string;
    nome: string;
    norma: string;
    ch_formacao: number;
    ch_reciclagem: number;
  } | null;
}

interface TreinamentoIncluso {
  id: string;
  treinamentoId: string;
  treinamento: string;
  tipo: 'formacao' | 'reciclagem';
  ch: string;
  planoOuro: number;
  quantidadeTurma: number;
  colaboradoresPorTurma: number;
  valor: number;
}

interface ServicoGestao {
  id: string;
  servico: string;
  implantacao: number;
}

interface TabelaPrecosTreinamento {
  ch: string;
  horaAula: number;
  bronze: number;
  prata: number;
  ouro: number;
}

interface CalculadoraVertical365Props {
  onClose: () => void;
  onSave?: (dados: any) => void;
  onOpenPropostaComercial?: (dados: any) => void;
  empresaInicial?: string;
  tabelaPrecosTreinamento?: TabelaPrecosTreinamento[];
  planoSelecionado?: 'bronze' | 'prata' | 'ouro';
  dadosSalvos?: {
    treinamentos?: TreinamentoIncluso[];
    servicosGestao?: ServicoGestao[];
    valorGestaoMensal?: number;
    valorGestaoAnual?: number;
    valorImplantacaoSistema?: number;
    desconto?: number;
    planoSelecionado?: 'bronze' | 'prata' | 'ouro';
  } | null;
}

// Treinamentos que requerem orçamento específico (não inclusos no pacote 8h padrão)
const TREINAMENTOS_ESPECIAIS = ['brigada', 'nr-10', 'nr 10', 'nr-13', 'nr 13'];

const fmtBRL = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Função para verificar se é treinamento especial
const isTreinamentoEspecial = (nome: string, norma: string): boolean => {
  const nomeNorma = `${nome} ${norma}`.toLowerCase();
  return TREINAMENTOS_ESPECIAIS.some(especial => nomeNorma.includes(especial));
};

export function CalculadoraVertical365({ onClose, onSave, onOpenPropostaComercial, empresaInicial, tabelaPrecosTreinamento, planoSelecionado: planoInicial, dadosSalvos }: CalculadoraVertical365Props) {
  const { toast } = useToast();
  const { profile } = useAuth();
  
  // Plano selecionado (bronze, prata, ouro)
  const [planoSelecionado, setPlanoSelecionado] = useState<'bronze' | 'prata' | 'ouro'>(
    dadosSalvos?.planoSelecionado || planoInicial || 'ouro'
  );
  
  const temTabelaPrecos = tabelaPrecosTreinamento && tabelaPrecosTreinamento.length > 0;

  // Função para obter valor do plano baseado na CH e plano selecionado
  const getValorPlano = (ch: string): number => {
    const chNumero = ch.replace('h', '');
    
    // Usar tabela de preços dinâmica da Calculadora de Treinamento Normativo
    if (temTabelaPrecos) {
      const preco = tabelaPrecosTreinamento!.find(p => p.ch === chNumero);
      if (preco) {
        return preco[planoSelecionado];
      }
      // Para CHs intermediárias, encontrar a CH mais próxima acima
      const chs = tabelaPrecosTreinamento!.map(p => parseInt(p.ch)).sort((a, b) => a - b);
      const chNum = parseInt(chNumero);
      const chProxima = chs.find(c => c >= chNum) || chs[chs.length - 1];
      const precoProximo = tabelaPrecosTreinamento!.find(p => p.ch === String(chProxima));
      if (precoProximo) {
        return precoProximo[planoSelecionado];
      }
    }
    
    return 0;
  };
  
  // Catálogo de treinamentos do banco de dados
  const [catalogoTreinamentos, setCatalogoTreinamentos] = useState<TreinamentoCatalogo[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  
  // Produtos/Serviços de treinamento do banco de dados
  const [produtosServicosTreinamento, setProdutosServicosTreinamento] = useState<ProdutoServicoTreinamento[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  
  // Valor inicial para 8h baseado na tabela dinâmica
  const valorInicial8h = temTabelaPrecos 
    ? (tabelaPrecosTreinamento!.find(p => p.ch === '8')?.[planoInicial || 'ouro'] || 0)
    : 0;

  // Estado dos treinamentos inclusos - padrão: 3 treinamentos de 8h
  const [treinamentos, setTreinamentos] = useState<TreinamentoIncluso[]>(
    dadosSalvos?.treinamentos || [
      { id: '1', treinamentoId: '', treinamento: 'Treinamento 8h (a definir)', tipo: 'formacao', ch: '8h', planoOuro: valorInicial8h, quantidadeTurma: 1, colaboradoresPorTurma: 30, valor: valorInicial8h },
      { id: '2', treinamentoId: '', treinamento: 'Treinamento 8h (a definir)', tipo: 'formacao', ch: '8h', planoOuro: valorInicial8h, quantidadeTurma: 1, colaboradoresPorTurma: 30, valor: valorInicial8h },
      { id: '3', treinamentoId: '', treinamento: 'Treinamento 8h (a definir)', tipo: 'formacao', ch: '8h', planoOuro: valorInicial8h, quantidadeTurma: 1, colaboradoresPorTurma: 30, valor: valorInicial8h },
    ]
  );

  // Estado dos serviços de gestão (mantido para compatibilidade)
  const [servicosGestao, setServicosGestao] = useState<ServicoGestao[]>(
    dadosSalvos?.servicosGestao || []
  );

  // Valor anual da gestão de treinamentos
  const [valorGestaoAnual, setValorGestaoAnual] = useState<number>(
    dadosSalvos?.valorGestaoAnual || 1200
  );

  // Valor da implantação do sistema (valor único)
  const [valorImplantacaoSistema, setValorImplantacaoSistema] = useState<number>(
    dadosSalvos?.valorImplantacaoSistema || 1000
  );

  // Valor mensal da gestão (mantido para compatibilidade)
  const [valorGestaoMensal, setValorGestaoMensal] = useState<number>(
    dadosSalvos?.valorGestaoMensal || 500
  );

  // Desconto (percentual)
  const [desconto, setDesconto] = useState<number>(
    dadosSalvos?.desconto || 0
  );

  // Estados para o modal de seleção de treinamento
  const [treinamentoSelectorOpen, setTreinamentoSelectorOpen] = useState(false);
  const [treinamentoSelectorItemId, setTreinamentoSelectorItemId] = useState<string | null>(null);

  // Carregar catálogo de treinamentos do banco de dados
  useEffect(() => {
    const loadCatalogo = async () => {
      if (!profile?.empresa_id) {
        setLoadingCatalogo(false);
        return;
      }
      
      try {
        const { data, error } = await (supabase as any)
          .from('catalogo_treinamentos')
          .select('id, nome, norma, ch_formacao, ch_reciclagem')
          .eq('empresa_id', profile.empresa_id)
          .order('norma', { ascending: true });
        
        if (error) throw error;
        setCatalogoTreinamentos(data || []);
      } catch (error) {
        console.error('Erro ao carregar catálogo de treinamentos:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o catálogo de treinamentos.',
          variant: 'destructive'
        });
      } finally {
        setLoadingCatalogo(false);
      }
    };
    
    loadCatalogo();
  }, [profile?.empresa_id]);
  
  // Carregar produtos/serviços de treinamento do banco de dados
  useEffect(() => {
    const loadProdutosServicos = async () => {
      if (!profile?.empresa_id) {
        setLoadingProdutos(false);
        return;
      }
      
      try {
        // Buscar produtos/serviços ativos (igual à calculadora de treinamento normativo)
        const { data, error } = await (supabase as any)
          .from('produtos_servicos')
          .select(`
            id, nome, codigo, preco, descricao, tipo, carga_horaria, ch_formacao, ch_reciclagem, colaboradores_por_turma,
            classificacao_id, forma_cobranca_id, treinamento_id,
            categoria:categorias_produtos(id, nome, cor),
            classificacao:classificacoes_produtos(id, nome),
            forma_cobranca:formas_cobranca(id, nome),
            treinamento:catalogo_treinamentos(id, nome, norma, ch_formacao, ch_reciclagem)
          `)
          .eq('empresa_id', profile.empresa_id)
          .eq('ativo', true)
          .order('nome', { ascending: true });
        
        if (error) throw error;
        
        setProdutosServicosTreinamento(data || []);
      } catch (error) {
        console.error('Erro ao carregar produtos/serviços de treinamento:', error);
      } finally {
        setLoadingProdutos(false);
      }
    };
    
    loadProdutosServicos();
  }, [profile?.empresa_id]);

  // Recalcular valores dos treinamentos quando o plano selecionado mudar
  useEffect(() => {
    if (tabelaPrecosTreinamento && tabelaPrecosTreinamento.length > 0) {
      setTreinamentos(prev => prev.map(t => {
        const valorPlano = getValorPlano(t.ch);
        return {
          ...t,
          planoOuro: valorPlano,
          valor: valorPlano * t.quantidadeTurma
        };
      }));
    }
  }, [planoSelecionado, tabelaPrecosTreinamento]);

  // Funções para manipular treinamentos
  const adicionarTreinamento = () => {
    const valorPlano = getValorPlano('8h');
    const novoTreinamento: TreinamentoIncluso = {
      id: Date.now().toString(),
      treinamentoId: '',
      treinamento: 'Treinamento 8h (a definir)',
      tipo: 'formacao',
      ch: '8h',
      planoOuro: valorPlano,
      quantidadeTurma: 1,
      colaboradoresPorTurma: 30,
      valor: valorPlano
    };
    setTreinamentos([...treinamentos, novoTreinamento]);
  };

  const removerTreinamento = (id: string) => {
    setTreinamentos(treinamentos.filter(t => t.id !== id));
  };

  // Função para selecionar treinamento do produtos/serviços
  const selecionarTreinamento = (id: string, treinamentoId: string) => {
    const produtoServico = produtosServicosTreinamento.find(t => t.id === treinamentoId);
    if (!produtoServico) return;
    
    setTreinamentos(treinamentos.map(t => {
      if (t.id === id) {
        // Usar CH baseado no tipo (formação ou reciclagem) com fallback chain
        let chReal = 0;
        if (t.tipo === 'formacao') {
          chReal = (produtoServico.ch_formacao && produtoServico.ch_formacao > 0) ? produtoServico.ch_formacao
            : (produtoServico.carga_horaria && produtoServico.carga_horaria > 0) ? produtoServico.carga_horaria
            : (produtoServico.treinamento?.ch_formacao && produtoServico.treinamento.ch_formacao > 0) ? produtoServico.treinamento.ch_formacao
            : 0;
        } else {
          chReal = (produtoServico.ch_reciclagem && produtoServico.ch_reciclagem > 0) ? produtoServico.ch_reciclagem
            : (produtoServico.carga_horaria && produtoServico.carga_horaria > 0) ? produtoServico.carga_horaria
            : (produtoServico.treinamento?.ch_reciclagem && produtoServico.treinamento.ch_reciclagem > 0) ? produtoServico.treinamento.ch_reciclagem
            : 0;
        }
        const ch = `${chReal}h`;
        // Para preço: se CH < 8, usar preço de 8h
        const chParaPreco = chReal < 8 ? 8 : chReal;
        const valorPlano = getValorPlano(`${chParaPreco}h`);
        
        return {
          ...t,
          treinamentoId,
          treinamento: `${produtoServico.nome}${produtoServico.codigo ? ` - ${produtoServico.codigo}` : ''}`,
          ch,
          planoOuro: valorPlano,
          colaboradoresPorTurma: produtoServico.colaboradores_por_turma || 30,
          valor: valorPlano * t.quantidadeTurma
        };
      }
      return t;
    }));
  };

  // Função para alterar o tipo (formação/reciclagem) e recalcular CH
  const alterarTipoTreinamento = (id: string, novoTipo: 'formacao' | 'reciclagem') => {
    setTreinamentos(treinamentos.map(t => {
      if (t.id === id) {
        // Se tem treinamento selecionado, recalcular CH baseado no novo tipo
        if (t.treinamentoId) {
          const produtoServico = produtosServicosTreinamento.find(p => p.id === t.treinamentoId);
          if (produtoServico) {
            // Usar CH baseado no tipo com fallback chain
            let chReal = 0;
            if (novoTipo === 'formacao') {
              chReal = (produtoServico.ch_formacao && produtoServico.ch_formacao > 0) ? produtoServico.ch_formacao
                : (produtoServico.carga_horaria && produtoServico.carga_horaria > 0) ? produtoServico.carga_horaria
                : (produtoServico.treinamento?.ch_formacao && produtoServico.treinamento.ch_formacao > 0) ? produtoServico.treinamento.ch_formacao
                : 0;
            } else {
              chReal = (produtoServico.ch_reciclagem && produtoServico.ch_reciclagem > 0) ? produtoServico.ch_reciclagem
                : (produtoServico.carga_horaria && produtoServico.carga_horaria > 0) ? produtoServico.carga_horaria
                : (produtoServico.treinamento?.ch_reciclagem && produtoServico.treinamento.ch_reciclagem > 0) ? produtoServico.treinamento.ch_reciclagem
                : 0;
            }
            const ch = `${chReal}h`;
            // Para preço: se CH < 8, usar preço de 8h
            const chParaPreco = chReal < 8 ? 8 : chReal;
            const valorPlano = getValorPlano(`${chParaPreco}h`);
            return {
              ...t,
              tipo: novoTipo,
              ch,
              planoOuro: valorPlano,
              colaboradoresPorTurma: produtoServico.colaboradores_por_turma || t.colaboradoresPorTurma,
              valor: valorPlano * t.quantidadeTurma
            };
          }
        }
        return { ...t, tipo: novoTipo };
      }
      return t;
    }));
  };

  const atualizarTreinamento = (id: string, campo: keyof TreinamentoIncluso, valor: any) => {
    setTreinamentos(treinamentos.map(t => {
      if (t.id === id) {
        const atualizado = { ...t, [campo]: valor };
        // Recalcular valor quando planoOuro ou quantidadeTurma mudar
        if (campo === 'planoOuro' || campo === 'quantidadeTurma') {
          atualizado.valor = atualizado.planoOuro * atualizado.quantidadeTurma;
        }
        return atualizado;
      }
      return t;
    }));
  };

  // Funções para manipular serviços de gestão
  const adicionarServico = () => {
    const novoServico: ServicoGestao = {
      id: Date.now().toString(),
      servico: '',
      implantacao: 0
    };
    setServicosGestao([...servicosGestao, novoServico]);
  };

  const removerServico = (id: string) => {
    setServicosGestao(servicosGestao.filter(s => s.id !== id));
  };

  const atualizarServico = (id: string, campo: keyof ServicoGestao, valor: any) => {
    setServicosGestao(servicosGestao.map(s => {
      if (s.id === id) {
        return { ...s, [campo]: valor };
      }
      return s;
    }));
  };

  // Cálculos dos totais
  const totalTreinamentos = treinamentos.reduce((acc, t) => acc + t.valor, 0);
  const totalGestaoSistema = valorGestaoAnual + valorImplantacaoSistema;
  const totalAnual = totalTreinamentos + totalGestaoSistema;
  const valorMensal = totalAnual / 12;

  // Cálculos com desconto
  const valorDesconto = totalAnual * desconto / 100;
  const totalComDesconto = totalAnual - valorDesconto;
  const planoVertical365 = totalComDesconto / 12;

  // Salvar orçamento
  const handleSave = () => {
    const dados = {
      treinamentos,
      servicosGestao,
      valorGestaoMensal,
      valorGestaoAnual,
      valorImplantacaoSistema,
      desconto,
      planoSelecionado,
      totais: {
        totalTreinamentos,
        totalGestaoSistema,
        valorDesconto,
        totalComDesconto,
        planoVertical365,
        valorGestaoAnual,
        valorImplantacaoSistema,
        totalAnual,
        valorMensal
      }
    };
    
    if (onSave) {
      onSave(dados);
    }
    
    toast({
      title: 'Orçamento salvo',
      description: 'Os valores do Vertical 365 foram salvos com sucesso!'
    });
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Calculadora Vertical 365</h2>
            <p className="text-xs text-muted-foreground">
              {empresaInicial || 'Orçamento anual de treinamentos e gestão'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Orçamento
          </Button>
          {onOpenPropostaComercial && (
            <Button 
              size="sm" 
              variant="outline"
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
              onClick={() => {
                const dados = {
                  empresa: empresaInicial,
                  treinamentos,
                  servicosGestao,
                  valorGestaoMensal,
                  valorGestaoAnual,
                  valorImplantacaoSistema,
                  desconto,
                  planoSelecionado,
                  totais: {
                    totalTreinamentos,
                    totalGestaoSistema,
                    totalAnual,
                    valorMensal: (totalAnual * (1 - desconto / 100)) / 12
                  }
                };
                onOpenPropostaComercial(dados);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar Proposta
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 mt-4">
        <div className="space-y-6 pr-4">
          {/* Aviso se não tem tabela de preços */}
          {!temTabelaPrecos && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Os preços não estão disponíveis. Para obter valores corretos, primeiro salve um cálculo na <strong>Calculadora de Treinamento Normativo</strong> com os dados do cliente (KM, pedágio, etc.).
              </AlertDescription>
            </Alert>
          )}

          {/* Tabela 1 - Treinamentos Inclusos */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Treinamentos Inclusos</CardTitle>
                <Button variant="outline" size="sm" onClick={adicionarTreinamento}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Treinamento</TableHead>
                    <TableHead className="w-[15%]">Formação/Reciclagem</TableHead>
                    <TableHead className="w-[8%] text-center">C.H</TableHead>
                    <TableHead className="text-right">Plano {planoSelecionado.charAt(0).toUpperCase() + planoSelecionado.slice(1)}</TableHead>
                    <TableHead className="text-center">Colaboradores por Turma</TableHead>
                    <TableHead className="text-center">Qtd. Turma</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treinamentos.map((t) => {
                    const produtoServico = t.treinamentoId 
                      ? produtosServicosTreinamento.find(p => p.id === t.treinamentoId)
                      : null;
                    const isEspecial = produtoServico 
                      ? isTreinamentoEspecial(produtoServico.nome, '')
                      : false;
                    
                    return (
                      <TableRow key={t.id} className={isEspecial ? 'bg-red-50' : ''}>
                        <TableCell>
                          <Button
                            variant="outline"
                            className="h-8 w-full justify-start text-xs font-normal px-2"
                            onClick={() => {
                              setTreinamentoSelectorItemId(t.id);
                              setTreinamentoSelectorOpen(true);
                            }}
                          >
                            <Search className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
                            {t.treinamentoId ? (
                              <span className="truncate">{t.treinamento}</span>
                            ) : (
                              <span className="text-muted-foreground">Selecionar treinamento...</span>
                            )}
                          </Button>
                          {isEspecial && (
                            <p className="text-[10px] text-red-600 mt-1">
                              ⚠️ Requer orçamento específico
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={t.tipo}
                            onValueChange={(value: 'formacao' | 'reciclagem') => alterarTipoTreinamento(t.id, value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="formacao">Formação</SelectItem>
                              <SelectItem value="reciclagem">Reciclagem</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            value={t.ch.replace('h', '')}
                            onChange={(e) => {
                              const novaCh = e.target.value ? `${e.target.value}h` : '0h';
                              const novoValorPlano = getValorPlano(novaCh);
                              setTreinamentos(treinamentos.map(tr => 
                                tr.id === t.id 
                                  ? { ...tr, ch: novaCh, planoOuro: novoValorPlano, valor: novoValorPlano * tr.quantidadeTurma }
                                  : tr
                              ));
                            }}
                            placeholder="CH"
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={t.planoOuro}
                            onChange={(e) => atualizarTreinamento(t.id, 'planoOuro', Number(e.target.value))}
                            className="h-8 w-28 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={t.colaboradoresPorTurma}
                            onChange={(e) => atualizarTreinamento(t.id, 'colaboradoresPorTurma', Number(e.target.value))}
                            className="h-8 w-16 text-center mx-auto"
                            min={1}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={t.quantidadeTurma}
                            onChange={(e) => atualizarTreinamento(t.id, 'quantidadeTurma', Number(e.target.value))}
                            className="h-8 w-16 text-center mx-auto"
                            min={1}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {fmtBRL(t.valor)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerTreinamento(t.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {treinamentos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                        Nenhum treinamento adicionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-2 pt-2 border-t space-y-2">
                <div className="flex justify-end">
                  <div className="text-sm font-semibold">
                    Total Treinamentos: <span className="text-green-600">{fmtBRL(totalTreinamentos)}</span>
                  </div>
                </div>
                <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  <strong>Obs:</strong> Os treinamentos de 8h podem ser qualquer treinamento (formação ou reciclagem), 
                  <strong className="text-red-600"> exceto Brigada de Incêndio, NR-10 e NR-13</strong>. 
                  Para esses, é necessário orçamento específico.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela 2 - Gestão de Treinamentos via Sistema */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Gestão de Treinamentos via Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Valor Anual da Gestão */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Gestão de Treinamentos (Anual):</span>
                  <Input
                    type="number"
                    value={valorGestaoAnual}
                    onChange={(e) => setValorGestaoAnual(Number(e.target.value))}
                    className="h-8 w-32 text-right"
                  />
                </div>
                
                {/* Implantação do Sistema */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Implantação do Sistema (Valor Único):</span>
                  <Input
                    type="number"
                    value={valorImplantacaoSistema}
                    onChange={(e) => setValorImplantacaoSistema(Number(e.target.value))}
                    className="h-8 w-32 text-right"
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-4 pt-2 border-t">
                <div className="text-sm font-semibold">
                  Total Gestão + Implantação: <span className="text-blue-600">{fmtBRL(totalGestaoSistema)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela 3 - Resumo e Totais */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Resumo do Orçamento Vertical 365</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total Treinamentos</TableCell>
                    <TableCell className="text-right font-mono">{fmtBRL(totalTreinamentos)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Gestão de Treinamentos (Anual)</TableCell>
                    <TableCell className="text-right font-mono">{fmtBRL(valorGestaoAnual)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Implantação do Sistema</TableCell>
                    <TableCell className="text-right font-mono">{fmtBRL(valorImplantacaoSistema)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        Desconto (%)
                        <Input
                          type="number"
                          value={desconto}
                          onChange={(e) => setDesconto(Number(e.target.value))}
                          className="h-8 w-20 text-center"
                          min={0}
                          max={100}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {desconto > 0 ? `- ${fmtBRL(totalAnual * desconto / 100)}` : '-'}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold text-lg">Valor Total Anual</TableCell>
                    <TableCell className="text-right font-mono font-bold text-lg text-green-600">
                      {fmtBRL(totalAnual * (1 - desconto / 100))}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-green-100/50 dark:bg-green-900/20">
                    <TableCell className="font-bold text-lg">Plano Vertical 365</TableCell>
                    <TableCell className="text-right font-mono font-bold text-lg text-blue-600">
                      {fmtBRL((totalAnual * (1 - desconto / 100)) / 12)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Modal de Seleção de Treinamento */}
      <TreinamentoSelectorModal
        open={treinamentoSelectorOpen}
        onOpenChange={setTreinamentoSelectorOpen}
        produtos={produtosServicosTreinamento}
        selectedId={treinamentos.find(t => t.id === treinamentoSelectorItemId)?.treinamentoId || undefined}
        onSelect={(produto) => {
          if (treinamentoSelectorItemId) {
            selecionarTreinamento(treinamentoSelectorItemId, produto.id);
          }
          setTreinamentoSelectorOpen(false);
        }}
      />
    </div>
  );
}
