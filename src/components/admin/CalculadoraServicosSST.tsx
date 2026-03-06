import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calculator, Save, RotateCcw, AlertCircle, CheckCircle2, AlertTriangle, Plus, Trash2, Package, TrendingUp, Percent, Car, Receipt, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TreinamentoSelectorModal } from './TreinamentoSelectorModal';

interface ProdutoServico {
  id: string;
  nome: string;
  codigo: string | null;
  preco: number | null;
  descricao: string | null;
  tipo: 'produto' | 'servico';
  carga_horaria: number | null;
  ch_formacao: number | null;
  ch_reciclagem: number | null;
  treinamento_id?: string | null;
  natureza_id?: string | null;
  classificacao_id?: string | null;
  forma_cobranca_id?: string | null;
  categoria?: { id: string; nome: string; cor: string } | null;
  classificacao?: { id: string; nome: string } | null;
  forma_cobranca?: { id: string; nome: string } | null;
  treinamento?: { id: string; nome: string; norma: string | null; ch_formacao?: number; ch_reciclagem?: number } | null;
  colaboradores_por_turma: number | null;
  norma: string | null;
}

type ModoPrecificacao = 'margin' | 'markup';
type ModoElaboracao = 'custo_total' | 'hora_tecnica' | 'colaborador' | 'cargos_risco' | 'pacotes';

// Item do orçamento - apenas custo técnico base (sem deslocamento, encargos ou margem por item)
interface ItemOrcamento {
  id: string;
  produtoId: string | null;
  nome: string;
  modoElaboracao: ModoElaboracao;
  quantidade: number;
  custoTotalBase: number;
  horasTecnicas: number;
  custoHoraTecnica: number;
  numColaboradores: number;
  custoColaborador: number;
  qtdSetores: number;
  custoSetor: number;
  qtdCargos: number;
  custoCargo: number;
  grauRisco: number;
  periodoMeses: number;
  nomePacote: string;
  custoPacote: number;
  tipoTreinamento: 'formacao' | 'reciclagem' | '';
  cargaHoraria: number;
  colaboradoresPorTurma: number;
  norma: string;
  categoria: string;
}

// Custos globais de deslocamento e diárias (aplicados uma única vez ao orçamento)
interface CustosGlobais {
  km: number;
  custoKm: number;
  noitesHotel: number;
  custoNoite: number;
  diasAlimentacao: number;
  custoDiaAlimentacao: number;
  pedagio: number;
}

// Encargos e taxas globais (aplicados uma única vez sobre o total)
interface EncargosGlobais {
  comissaoPct: number;
  impostoPct: number;
  taxaAdminPct: number;
}

// Precificação global
interface PrecificacaoGlobal {
  modoPrecificacao: 'margin' | 'markup';
  margemPct: number;
  markupPct: number;
}

interface CalculadoraServicosSSTProps {
  onClose: () => void;
  onSave?: (dados: any) => void;
  empresaInicial?: string;
  dadosSalvos?: any | null;
}

const fmtBRL = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const fmtPct = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(2).replace('.', ',') + '%';
};

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

// Criar novo item - apenas custo técnico base (sem deslocamento, encargos ou margem)
const criarNovoItem = (): ItemOrcamento => ({
  id: crypto.randomUUID(),
  produtoId: null,
  nome: '',
  modoElaboracao: 'custo_total',
  quantidade: 1,
  custoTotalBase: 0,
  horasTecnicas: 1,
  custoHoraTecnica: 0,
  numColaboradores: 1,
  custoColaborador: 0,
  qtdSetores: 1,
  custoSetor: 0,
  qtdCargos: 1,
  custoCargo: 0,
  grauRisco: 1,
  periodoMeses: 1,
  nomePacote: '',
  custoPacote: 0,
  tipoTreinamento: 'formacao',
  cargaHoraria: 0,
  colaboradoresPorTurma: 30,
  norma: '',
  categoria: '',
});

// Valores padrão para custos globais
const custosGlobaisDefault: CustosGlobais = {
  km: 0,
  custoKm: 1.50,
  noitesHotel: 0,
  custoNoite: 150,
  diasAlimentacao: 0,
  custoDiaAlimentacao: 80,
  pedagio: 0,
};

// Valores padrão para encargos globais
const encargosGlobaisDefault: EncargosGlobais = {
  comissaoPct: 3,
  impostoPct: 17,
  taxaAdminPct: 10,
};

// Valores padrão para precificação global
const precificacaoGlobalDefault: PrecificacaoGlobal = {
  modoPrecificacao: 'margin',
  margemPct: 30,
  markupPct: 60,
};

// Calcular custo técnico base do item (apenas custo do modo × quantidade, SEM deslocamento)
const calcularCustoTecnicoItem = (item: ItemOrcamento): number => {
  let custoModo = 0;
  switch (item.modoElaboracao) {
    case 'custo_total':
      custoModo = item.custoTotalBase * item.quantidade;
      break;
    case 'hora_tecnica':
      custoModo = item.horasTecnicas * item.custoHoraTecnica * item.quantidade;
      break;
    case 'colaborador':
      custoModo = item.numColaboradores * item.custoColaborador * item.quantidade;
      break;
    case 'cargos_risco':
      custoModo = ((item.qtdSetores * item.custoSetor) + (item.qtdCargos * item.custoCargo)) * item.grauRisco * item.quantidade;
      break;
    case 'pacotes':
      custoModo = item.custoPacote * item.quantidade * item.periodoMeses;
      break;
  }
  return custoModo;
};

// Calcular custo total de deslocamento global
const calcularCustoDeslocamentoGlobal = (custos: CustosGlobais): number => {
  return (custos.km * custos.custoKm) + 
         (custos.noitesHotel * custos.custoNoite) + 
         (custos.diasAlimentacao * custos.custoDiaAlimentacao) + 
         custos.pedagio;
};

// Calcular preço final global usando a fórmula: Preço Final = Custo Base Total ÷ (1 - Encargos% - Margem%)
const calcularPrecoFinalGlobal = (
  custoBaseTotal: number,
  encargos: EncargosGlobais,
  precificacao: PrecificacaoGlobal
): { precoFinal: number; totalEncargos: number; lucro: number; comissaoVal: number; impostoVal: number; taxaAdminVal: number } => {
  const varRate = clamp(encargos.comissaoPct + encargos.impostoPct + encargos.taxaAdminPct, 0, 99.999) / 100;
  
  let precoFinal = 0;
  if (precificacao.modoPrecificacao === 'margin') {
    const margin = clamp(precificacao.margemPct, 0, 99.999) / 100;
    const denom = 1 - (varRate + margin);
    if (denom > 0.000001) {
      precoFinal = custoBaseTotal / denom;
    }
  } else {
    const markup = Math.max(0, precificacao.markupPct) / 100;
    const denom = 1 - varRate;
    if (denom > 0.000001) {
      precoFinal = (custoBaseTotal * (1 + markup)) / denom;
    }
  }
  
  const precoFinalValido = Number.isFinite(precoFinal) ? precoFinal : 0;
  const comissaoVal = precoFinalValido * (clamp(encargos.comissaoPct, 0, 100) / 100);
  const impostoVal = precoFinalValido * (clamp(encargos.impostoPct, 0, 100) / 100);
  const taxaAdminVal = precoFinalValido * (clamp(encargos.taxaAdminPct, 0, 100) / 100);
  const totalEncargos = comissaoVal + impostoVal + taxaAdminVal;
  const lucro = precoFinalValido - custoBaseTotal - totalEncargos;
  
  return { precoFinal: precoFinalValido, totalEncargos, lucro, comissaoVal, impostoVal, taxaAdminVal };
};

export function CalculadoraServicosSST({ onClose, onSave, empresaInicial, dadosSalvos }: CalculadoraServicosSSTProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [produtosServicos, setProdutosServicos] = useState<ProdutoServico[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  
  // Estado para controlar o modal de seleção de produto/serviço
  const [produtoSelectorOpen, setProdutoSelectorOpen] = useState(false);
  const [produtoSelectorItemId, setProdutoSelectorItemId] = useState<string>('');
  
  // Validar e reconstruir itens salvos para garantir que tenham todos os campos necessários
  const itensIniciais = (): ItemOrcamento[] => {
    if (!dadosSalvos?.itens || !Array.isArray(dadosSalvos.itens)) return [];
    return dadosSalvos.itens.map((item: any) => ({
      ...criarNovoItem(),
      ...item,
      id: item.id || crypto.randomUUID(),
    }));
  };
  
  const [itens, setItens] = useState<ItemOrcamento[]>(itensIniciais);
  const [itemExpandido, setItemExpandido] = useState<string | null>(null);
  
  // Estados globais de custos, encargos e precificação
  const [custosGlobais, setCustosGlobais] = useState<CustosGlobais>(
    dadosSalvos?.custosGlobais || custosGlobaisDefault
  );
  const [encargosGlobais, setEncargosGlobais] = useState<EncargosGlobais>(
    dadosSalvos?.encargosGlobais || encargosGlobaisDefault
  );
  const [precificacaoGlobal, setPrecificacaoGlobal] = useState<PrecificacaoGlobal>(
    dadosSalvos?.precificacaoGlobal || precificacaoGlobalDefault
  );
  
  // Estado para desconto (único campo global)
  const [descontoTipo, setDescontoTipo] = useState<'percentual' | 'valor'>(dadosSalvos?.descontoTipo || 'percentual');
  const [descontoValor, setDescontoValor] = useState<number>(dadosSalvos?.descontoValor || 0);

  useEffect(() => {
    const fetchProdutosServicos = async () => {
      if (!profile?.empresa_id) return;
      try {
        // Buscar produtos com todos os campos necessários (igual à calculadora de treinamento)
        const { data, error } = await (supabase as any)
          .from('produtos_servicos')
          .select(`
            id, nome, codigo, preco, descricao, tipo, carga_horaria, ch_formacao, ch_reciclagem, colaboradores_por_turma, norma,
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
        setProdutosServicos(data || []);
      } catch (err) { console.error('Erro ao buscar produtos/servicos:', err); } finally { setLoadingProdutos(false); }
    };
    fetchProdutosServicos();
  }, [profile?.empresa_id]);

  const adicionarItem = () => { 
    const novoItem = criarNovoItem();
    setItens([...itens, novoItem]); 
    setItemExpandido(novoItem.id);
  };
  const removerItem = (id: string) => { setItens(itens.filter(item => item.id !== id)); };
  const atualizarItem = (id: string, campo: keyof ItemOrcamento, valor: any) => {
    setItens(itens.map(item => item.id !== id ? item : { ...item, [campo]: valor }));
  };
  const selecionarProduto = (itemId: string, produtoId: string) => {
    const produto = produtosServicos.find(p => p.id === produtoId);
    if (!produto) return;
    setItens(itens.map(item => {
      if (item.id !== itemId) return item;
      const chFormacao = produto.ch_formacao || produto.treinamento?.ch_formacao || 0;
      const chReciclagem = produto.ch_reciclagem || produto.treinamento?.ch_reciclagem || 0;
      return {
        ...item,
        produtoId: produto.id,
        nome: produto.nome,
        custoTotalBase: produto.preco || item.custoTotalBase,
        numColaboradores: produto.colaboradores_por_turma || item.numColaboradores,
        colaboradoresPorTurma: produto.colaboradores_por_turma || item.colaboradoresPorTurma,
        horasTecnicas: produto.carga_horaria || chFormacao || item.horasTecnicas,
        nomePacote: produto.nome,
        tipoTreinamento: 'formacao' as const,
        cargaHoraria: chFormacao || produto.carga_horaria || 0,
        norma: (() => {
          let n = produto.norma || produto.treinamento?.norma || '';
          if (n && !n.toString().toLowerCase().startsWith('nr')) {
            n = `NR-${n.toString().padStart(2, '0')}`;
          }
          return n;
        })(),
        categoria: produto.categoria?.nome || '',
      };
    }));
  };

  const calculos = useMemo(() => {
    // 1. Somar custo técnico de todos os itens (sem deslocamento)
    const custoTecnicoItens = itens.reduce((acc, item) => acc + calcularCustoTecnicoItem(item), 0);
    
    // 2. Somar custos globais de deslocamento (aplicados uma única vez)
    const custoDeslocamento = calcularCustoDeslocamentoGlobal(custosGlobais);
    
    // 3. Custo Base Total = Custo Técnico dos Itens + Custos Globais de Deslocamento
    const custoBaseTotal = custoTecnicoItens + custoDeslocamento;
    
    // 4. Aplicar encargos e margem de forma global
    const globalCalc = calcularPrecoFinalGlobal(custoBaseTotal, encargosGlobais, precificacaoGlobal);
    
    const precoTotal = globalCalc.precoFinal;
    const totalEncargos = globalCalc.totalEncargos;
    const lucroTotal = globalCalc.lucro;
    const custoTotal = custoBaseTotal + totalEncargos;
    
    let alertType: 'ok' | 'warn' | 'danger' = 'ok';
    let alertMsg = '';
    
    const margemReal = (precoTotal > 0) ? (lucroTotal / precoTotal) * 100 : 0;
    const markupReal = (custoBaseTotal > 0) ? (lucroTotal / custoBaseTotal) * 100 : 0;
    
    if (itens.length === 0) { alertType = 'warn'; alertMsg = 'Adicione pelo menos um item.'; }
    else if (precoTotal <= 0) { alertType = 'warn'; alertMsg = 'Ajuste metas/taxas.'; }
    else if (lucroTotal < 0) { alertType = 'danger'; alertMsg = 'Lucro negativo.'; }
    else { alertMsg = 'Calculo OK!'; }
    
    // 5. Aplicar desconto somente no final, sobre o preço final já calculado
    const valorDesconto = descontoTipo === 'percentual' 
      ? precoTotal * (descontoValor / 100) 
      : descontoValor;
    const precoComDesconto = precoTotal - valorDesconto;
    
    return { 
      custoTecnicoItens,
      custoDeslocamento,
      custoBase: custoBaseTotal, 
      totalEncargos, 
      custoTotal, 
      precoTotal, 
      lucro: lucroTotal, 
      margemReal, 
      markupReal, 
      alertType, 
      alertMsg, 
      valorDesconto, 
      precoComDesconto 
    };
  }, [itens, custosGlobais, encargosGlobais, precificacaoGlobal, descontoTipo, descontoValor]);

  const handleSave = () => { 
    if (onSave) onSave({ 
      itens, 
      custosGlobais,
      encargosGlobais,
      precificacaoGlobal,
      descontoTipo,
      descontoValor,
      desconto: {
        tipo: descontoTipo,
        valor: descontoValor,
        valorDesconto: calculos.valorDesconto,
        totalComDesconto: calculos.precoComDesconto
      },
      totais: calculos 
    }); 
  };
  const handleReset = () => { 
    setItens([]); 
    setCustosGlobais(custosGlobaisDefault);
    setEncargosGlobais(encargosGlobaisDefault);
    setPrecificacaoGlobal(precificacaoGlobalDefault);
    setDescontoTipo('percentual'); 
    setDescontoValor(0); 
    toast({ title: 'Reset', description: 'Valores resetados.' }); 
  };

  return (
    <div className="flex flex-col w-full h-full bg-background rounded-lg overflow-hidden">
      <DialogHeader className="flex-shrink-0 pb-2 border-b bg-background px-3 pt-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-primary" />
              Calculadora para Serviços de SST
            </DialogTitle>
            <DialogDescription className="text-xs">
              {empresaInicial ? `Cliente: ${empresaInicial}` : 'Elabore o orçamento de serviços'}
            </DialogDescription>
          </div>
          <Button size="sm" onClick={adicionarItem} className="h-7 text-xs bg-primary hover:bg-primary/90">
            <Plus className="h-3 w-3 mr-1" />
            Adicionar Item
          </Button>
          <Badge variant={calculos.alertType === 'ok' ? 'default' : calculos.alertType === 'warn' ? 'secondary' : 'destructive'} className="text-xs">
            {calculos.alertType === 'ok' ? 'OK' : calculos.alertType === 'warn' ? 'Atenção' : 'Erro'}
          </Badge>
        </div>
      </DialogHeader>

      <div className="flex-1 min-h-0 overflow-y-scroll p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
        <div className="space-y-2 max-w-full">
          <div className="grid grid-cols-4 gap-2">
            <Card className="bg-success/5 border-success/20">
              <CardContent className="p-2">
                <p className="text-[10px] text-success font-medium uppercase">Preço Final</p>
                <p className="text-lg font-bold text-success">{Number.isFinite(calculos.precoTotal) ? fmtBRL(calculos.precoTotal) : '-'}</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-2">
                <p className="text-[10px] text-primary font-medium uppercase">Lucro</p>
                <p className="text-lg font-bold text-primary">{Number.isFinite(calculos.lucro) ? fmtBRL(calculos.lucro) : '-'}</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-2">
                <p className="text-[10px] text-primary font-medium uppercase">Margem</p>
                <p className="text-lg font-bold text-primary">{Number.isFinite(calculos.margemReal) ? fmtPct(calculos.margemReal) : '-'}</p>
              </CardContent>
            </Card>
            <Card className="bg-warning/5 border-warning/20">
              <CardContent className="p-2">
                <p className="text-[10px] text-warning font-medium uppercase">Markup</p>
                <p className="text-lg font-bold text-warning">{Number.isFinite(calculos.markupReal) ? fmtPct(calculos.markupReal) : '-'}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20">
            <CardHeader className="py-2 bg-primary/5">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Itens do Orçamento ({itens.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {itens.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-xs">Nenhum item adicionado</p>
                  <p className="text-[10px] mt-1">Clique em "Adicionar Item" acima para começar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {itens.map((item, index) => (
                    <Card key={item.id} className="border-border">
                      <CardHeader className="py-1 px-2 bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs font-bold text-muted-foreground">{index + 1}.</span>
                            <div className="flex-1 max-w-[250px]">
                              <Button
                                variant="outline"
                                className="h-7 w-full justify-start text-xs font-normal px-2"
                                onClick={() => {
                                  setProdutoSelectorItemId(item.id);
                                  setProdutoSelectorOpen(true);
                                }}
                              >
                                <Search className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
                                {item.nome ? (
                                  <span className="truncate">{item.nome}</span>
                                ) : (
                                  <span className="text-muted-foreground">Selecionar produto/serviço...</span>
                                )}
                              </Button>
                            </div>
                            <span className="text-xs font-semibold text-success">{fmtBRL(calcularCustoTecnicoItem(item))}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setItemExpandido(itemExpandido === item.id ? null : item.id)} className="h-6 w-6 p-0">
                              {itemExpandido === item.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removerItem(item.id)} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {item.produtoId && (() => {
                        const prod = produtosServicos.find(p => p.id === item.produtoId);
                        if (!prod) return null;
                        const chFormacao = prod.ch_formacao || prod.treinamento?.ch_formacao || 0;
                        const chReciclagem = prod.ch_reciclagem || prod.treinamento?.ch_reciclagem || 0;
                        return (
                          <div className="px-2 py-1.5 bg-primary/5 border-t border-primary/10 flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Tipo</Label>
                              <Select
                                value={item.tipoTreinamento || 'formacao'}
                                onValueChange={(v) => {
                                  const novaCH = v === 'formacao' ? (chFormacao || prod.carga_horaria || 0) : (chReciclagem || prod.carga_horaria || 0);
                                  setItens(itens.map(it => it.id !== item.id ? it : { ...it, tipoTreinamento: v as any, cargaHoraria: novaCH }));
                                }}
                              >
                                <SelectTrigger className="h-6 w-[110px] text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="formacao">Formação</SelectItem>
                                  <SelectItem value="reciclagem">Reciclagem</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {(item.categoria || prod.categoria?.nome) && (
                              <div className="flex items-center gap-1.5">
                                <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Categoria</Label>
                                <Badge variant="outline" className="text-[10px] h-5 font-normal">{item.categoria || prod.categoria?.nome}</Badge>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Label className="text-[10px] text-muted-foreground whitespace-nowrap">CH</Label>
                              <Input
                                type="number"
                                min={0}
                                value={item.cargaHoraria}
                                onChange={(e) => atualizarItem(item.id, 'cargaHoraria', Number(e.target.value) || 0)}
                                className="h-6 w-[60px] text-[10px]"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Colaboradores por Turma</Label>
                              <Input
                                type="number"
                                min={1}
                                value={item.colaboradoresPorTurma}
                                onChange={(e) => atualizarItem(item.id, 'colaboradoresPorTurma', Number(e.target.value) || 1)}
                                className="h-6 w-[60px] text-[10px]"
                              />
                            </div>
                            {prod.norma && (
                              <Badge variant="secondary" className="text-[10px] h-5 font-normal">{prod.norma}</Badge>
                            )}
                          </div>
                        );
                      })()}
                      
                      {itemExpandido === item.id && (
                        <CardContent className="p-2 space-y-2">
                          <div className="space-y-2">
                            <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Calculator className="h-3 w-3" />
                              Modo de Elaboração
                            </h5>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Modo</Label>
                                <Select value={item.modoElaboracao} onValueChange={(v) => atualizarItem(item.id, 'modoElaboracao', v)}>
                                  <SelectTrigger className="h-7 text-xs mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="custo_total">Por custo total</SelectItem>
                                    <SelectItem value="hora_tecnica">Por hora técnica</SelectItem>
                                    <SelectItem value="colaborador">Por colaborador</SelectItem>
                                    <SelectItem value="cargos_risco">Por cargos/risco</SelectItem>
                                    <SelectItem value="pacotes">Por pacotes</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Quantidade</Label>
                                <Input type="number" min={1} value={item.quantidade} onChange={(e) => atualizarItem(item.id, 'quantidade', Number(e.target.value) || 1)} className="h-7 text-xs mt-1" />
                              </div>
                            </div>

                            <div className="bg-warning/5 rounded p-2 border border-warning/20">
                              <h5 className="text-[10px] font-medium text-warning mb-1">Base de custos</h5>
                              {item.modoElaboracao === 'custo_total' && (
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">Custo total base (R$)</Label>
                                  <Input type="number" min={0} step={0.01} value={item.custoTotalBase} onChange={(e) => atualizarItem(item.id, 'custoTotalBase', Number(e.target.value) || 0)} className="h-7 text-xs mt-1" />
                                </div>
                              )}
                              {item.modoElaboracao === 'hora_tecnica' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Horas</Label>
                                    <Input type="number" min={1} value={item.horasTecnicas} onChange={(e) => atualizarItem(item.id, 'horasTecnicas', Number(e.target.value) || 1)} className="h-7 text-xs mt-1" />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">R$/Hora</Label>
                                    <Input type="number" min={0} step={0.01} value={item.custoHoraTecnica} onChange={(e) => atualizarItem(item.id, 'custoHoraTecnica', Number(e.target.value) || 0)} className="h-7 text-xs mt-1" />
                                  </div>
                                </div>
                              )}
                              {item.modoElaboracao === 'colaborador' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Nº colaboradores</Label>
                                    <Input type="number" min={1} value={item.numColaboradores} onChange={(e) => atualizarItem(item.id, 'numColaboradores', Number(e.target.value) || 1)} className="h-7 text-xs mt-1" />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">R$/Colaborador</Label>
                                    <Input type="number" min={0} step={0.01} value={item.custoColaborador} onChange={(e) => atualizarItem(item.id, 'custoColaborador', Number(e.target.value) || 0)} className="h-7 text-xs mt-1" />
                                  </div>
                                </div>
                              )}
                              {item.modoElaboracao === 'cargos_risco' && (
                                <div className="space-y-1">
                                  <div className="grid grid-cols-4 gap-1">
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">Setores</Label>
                                      <Input type="number" min={1} value={item.qtdSetores} onChange={(e) => atualizarItem(item.id, 'qtdSetores', Number(e.target.value) || 1)} className="h-7 text-xs mt-1" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">R$/Setor</Label>
                                      <Input type="number" min={0} step={0.01} value={item.custoSetor} onChange={(e) => atualizarItem(item.id, 'custoSetor', Number(e.target.value) || 0)} className="h-7 text-xs mt-1" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">Cargos</Label>
                                      <Input type="number" min={1} value={item.qtdCargos} onChange={(e) => atualizarItem(item.id, 'qtdCargos', Number(e.target.value) || 1)} className="h-7 text-xs mt-1" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">R$/Cargo</Label>
                                      <Input type="number" min={0} step={0.01} value={item.custoCargo} onChange={(e) => atualizarItem(item.id, 'custoCargo', Number(e.target.value) || 0)} className="h-7 text-xs mt-1" />
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Grau de risco (multiplicador)</Label>
                                    <Input type="number" min={0.1} step={0.01} value={item.grauRisco} onChange={(e) => atualizarItem(item.id, 'grauRisco', Number(e.target.value) || 1)} className="h-7 text-xs mt-1" />
                                  </div>
                                </div>
                              )}
                              {item.modoElaboracao === 'pacotes' && (
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Nome pacote</Label>
                                    <Input type="text" value={item.nomePacote} onChange={(e) => atualizarItem(item.id, 'nomePacote', e.target.value)} className="h-7 text-xs mt-1" placeholder="Ex.: Básico" />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">R$/Pacote</Label>
                                    <Input type="number" min={0} step={0.01} value={item.custoPacote} onChange={(e) => atualizarItem(item.id, 'custoPacote', Number(e.target.value) || 0)} className="h-7 text-xs mt-1" />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Período (meses)</Label>
                                    <Input type="number" min={1} value={item.periodoMeses} onChange={(e) => atualizarItem(item.id, 'periodoMeses', Number(e.target.value) || 1)} className="h-7 text-xs mt-1" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Custo técnico do item (sem deslocamento, encargos ou margem) */}
                          <div className="flex justify-between items-center bg-primary/10 rounded p-2 mt-2">
                            <span className="text-[10px] font-bold text-primary">CUSTO TÉCNICO DO ITEM:</span>
                            <span className="text-sm font-bold text-primary">{fmtBRL(calcularCustoTecnicoItem(item))}</span>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center pt-2 mt-2 border-t">
                <span className="text-xs font-bold text-muted-foreground">CUSTO TÉCNICO DOS ITENS:</span>
                <span className="text-sm font-bold text-foreground">{fmtBRL(calculos.custoTecnicoItens)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Deslocamento e Diárias GLOBAL (aplicado uma única vez) */}
          <Card className="border-primary/20">
            <CardHeader className="py-2 bg-primary/5">
              <CardTitle className="text-sm flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                Deslocamento e Diárias (Global)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-[10px] text-muted-foreground mb-2">Estes custos são aplicados uma única vez ao orçamento total, não por item.</p>
              <div className="grid grid-cols-7 gap-1">
                <div>
                  <Label className="text-[10px]">KM</Label>
                  <Input type="number" min={0} step={0.1} value={custosGlobais.km} onChange={(e) => setCustosGlobais(prev => ({ ...prev, km: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">R$/KM</Label>
                  <Input type="number" min={0} step={0.01} value={custosGlobais.custoKm} onChange={(e) => setCustosGlobais(prev => ({ ...prev, custoKm: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Noites</Label>
                  <Input type="number" min={0} value={custosGlobais.noitesHotel} onChange={(e) => setCustosGlobais(prev => ({ ...prev, noitesHotel: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">R$/Noite</Label>
                  <Input type="number" min={0} step={0.01} value={custosGlobais.custoNoite} onChange={(e) => setCustosGlobais(prev => ({ ...prev, custoNoite: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Dias</Label>
                  <Input type="number" min={0} value={custosGlobais.diasAlimentacao} onChange={(e) => setCustosGlobais(prev => ({ ...prev, diasAlimentacao: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">R$/Dia</Label>
                  <Input type="number" min={0} step={0.01} value={custosGlobais.custoDiaAlimentacao} onChange={(e) => setCustosGlobais(prev => ({ ...prev, custoDiaAlimentacao: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Pedágio</Label>
                  <Input type="number" min={0} step={0.01} value={custosGlobais.pedagio} onChange={(e) => setCustosGlobais(prev => ({ ...prev, pedagio: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                </div>
              </div>
              <div className="flex justify-between items-center bg-primary/10 rounded p-2 mt-2">
                <span className="text-[10px] font-bold text-primary">CUSTO DESLOCAMENTO:</span>
                <span className="text-sm font-bold text-primary">{fmtBRL(calculos.custoDeslocamento)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Encargos e Taxas GLOBAL */}
          <Card className="border-warning/20">
            <CardHeader className="py-2 bg-warning/5">
              <CardTitle className="text-sm flex items-center gap-2">
                <Percent className="h-4 w-4 text-warning" />
                Encargos e Taxas (Global)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-[10px] text-muted-foreground mb-2">Aplicados uma única vez sobre o custo base total (itens + deslocamento).</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Comissão (%)</Label>
                  <Input type="number" min={0} max={100} step={0.01} value={encargosGlobais.comissaoPct} onChange={(e) => setEncargosGlobais(prev => ({ ...prev, comissaoPct: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Imposto (%)</Label>
                  <Input type="number" min={0} max={100} step={0.01} value={encargosGlobais.impostoPct} onChange={(e) => setEncargosGlobais(prev => ({ ...prev, impostoPct: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Taxa Admin. (%)</Label>
                  <Input type="number" min={0} max={100} step={0.01} value={encargosGlobais.taxaAdminPct} onChange={(e) => setEncargosGlobais(prev => ({ ...prev, taxaAdminPct: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Precificação GLOBAL */}
          <Card className="border-success/20">
            <CardHeader className="py-2 bg-success/5">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Precificação (Global)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-[10px] text-muted-foreground mb-2">Fórmula: Preço Final = Custo Base Total ÷ (1 - Encargos% - Margem%)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Modo</Label>
                  <Select value={precificacaoGlobal.modoPrecificacao} onValueChange={(v) => setPrecificacaoGlobal(prev => ({ ...prev, modoPrecificacao: v as 'margin' | 'markup' }))}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="margin">Margem de lucro (%)</SelectItem>
                      <SelectItem value="markup">Markup (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {precificacaoGlobal.modoPrecificacao === 'margin' ? (
                  <div>
                    <Label className="text-[10px]">Margem (%)</Label>
                    <Input type="number" min={0} max={99} step={0.01} value={precificacaoGlobal.margemPct} onChange={(e) => setPrecificacaoGlobal(prev => ({ ...prev, margemPct: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                  </div>
                ) : (
                  <div>
                    <Label className="text-[10px]">Markup (%)</Label>
                    <Input type="number" min={0} step={0.01} value={precificacaoGlobal.markupPct} onChange={(e) => setPrecificacaoGlobal(prev => ({ ...prev, markupPct: Number(e.target.value) || 0 }))} className="h-7 text-xs" />
                  </div>
                )}
              </div>
              <div className="bg-success/10 rounded p-2 mt-2 space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground">Custo Técnico Itens:</span>
                  <span className="font-medium">{fmtBRL(calculos.custoTecnicoItens)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground">Custo Deslocamento:</span>
                  <span className="font-medium">{fmtBRL(calculos.custoDeslocamento)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between items-center text-[10px] font-medium">
                  <span>Custo Base Total:</span>
                  <span>{fmtBRL(calculos.custoBase)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-warning">
                  <span>Encargos:</span>
                  <span>{fmtBRL(calculos.totalEncargos)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-success">
                  <span>PREÇO FINAL:</span>
                  <span>{fmtBRL(calculos.precoTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desconto sobre o Total (único campo global) */}
          <Card className="border-green-500/20">
            <CardHeader className="py-2 bg-green-500/5">
              <CardTitle className="text-sm flex items-center gap-2">
                <Percent className="h-4 w-4 text-green-600" />
                Desconto sobre Total
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Select 
                    value={descontoTipo}
                    onValueChange={(v) => setDescontoTipo(v as 'percentual' | 'valor')}
                  >
                    <SelectTrigger className="h-7 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentual" className="text-xs">Percentual (%)</SelectItem>
                      <SelectItem value="valor" className="text-xs">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step={descontoTipo === 'percentual' ? 1 : 0.01}
                    value={descontoValor || ''}
                    onChange={(e) => setDescontoValor(parseFloat(e.target.value) || 0)}
                    placeholder={descontoTipo === 'percentual' ? '0%' : 'R$ 0,00'}
                    className="h-7 w-[120px] text-xs"
                  />
                </div>
                <div className="text-right">
                  {descontoValor > 0 ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground line-through">{fmtBRL(calculos.precoTotal)}</span>
                      <span className="text-xs text-green-600 font-medium">
                        -{descontoTipo === 'percentual' ? `${descontoValor}%` : fmtBRL(descontoValor)}
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        {fmtBRL(calculos.precoComDesconto)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem desconto</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-1">
              <CardTitle className="text-xs flex items-center gap-2">
                <Receipt className="h-3 w-3" />
                Detalhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span>Custo Base Total</span>
                  <span>{fmtBRL(calculos.custoBase)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Encargos</span>
                  <span>{fmtBRL(calculos.totalEncargos)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium bg-muted/50 px-2 py-1 rounded">
                  <span>Custo Total</span>
                  <span>{fmtBRL(calculos.custoTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-success bg-success/10 px-2 py-1 rounded">
                  <span>PREÇO FINAL</span>
                  <span>{Number.isFinite(calculos.precoTotal) ? fmtBRL(calculos.precoTotal) : '-'}</span>
                </div>
                {descontoValor > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Desconto ({descontoTipo === 'percentual' ? `${descontoValor}%` : 'Fixo'})</span>
                      <span>-{fmtBRL(calculos.valorDesconto)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                      <span>PREÇO COM DESCONTO</span>
                      <span>{fmtBRL(calculos.precoComDesconto)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-medium text-primary">
                  <span>Lucro</span>
                  <span>{Number.isFinite(calculos.lucro) ? fmtBRL(calculos.lucro) : '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {calculos.alertMsg && (
            <Alert variant={calculos.alertType === 'danger' ? 'destructive' : 'default'} className={calculos.alertType === 'ok' ? 'border-success/30 bg-success/10' : calculos.alertType === 'warn' ? 'border-warning/30 bg-warning/10' : ''}>
              {calculos.alertType === 'ok' ? <CheckCircle2 className="h-4 w-4 text-success" /> : calculos.alertType === 'warn' ? <AlertTriangle className="h-4 w-4 text-warning" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription className={'text-xs ' + (calculos.alertType === 'ok' ? 'text-success' : calculos.alertType === 'warn' ? 'text-warning' : '')}>
                {calculos.alertMsg}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1 bg-success hover:bg-success/90" disabled={itens.length === 0}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Orçamento
            </Button>
            <Button variant="outline" onClick={handleReset} size="icon">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Produto/Serviço */}
      <TreinamentoSelectorModal
        open={produtoSelectorOpen}
        onOpenChange={setProdutoSelectorOpen}
        produtos={produtosServicos}
        selectedId={itens.find(i => i.id === produtoSelectorItemId)?.produtoId || undefined}
        onSelect={(produto) => {
          setItens(itens.map(item => {
            if (item.id !== produtoSelectorItemId) return item;
            const p = produto as any;
            const chFormacao = p.ch_formacao || p.treinamento?.ch_formacao || 0;
            const chReciclagem = p.ch_reciclagem || p.treinamento?.ch_reciclagem || 0;
            return {
              ...item,
              produtoId: produto.id,
              nome: produto.nome,
              custoTotalBase: produto.preco || item.custoTotalBase,
              numColaboradores: p.colaboradores_por_turma || item.numColaboradores,
              colaboradoresPorTurma: p.colaboradores_por_turma || item.colaboradoresPorTurma,
              horasTecnicas: p.carga_horaria || chFormacao || item.horasTecnicas,
              nomePacote: produto.nome,
              tipoTreinamento: 'formacao' as const,
              cargaHoraria: chFormacao || p.carga_horaria || 0,
              norma: (() => {
                let n = p.norma || p.treinamento?.norma || '';
                if (n && !n.toString().toLowerCase().startsWith('nr')) {
                  n = `NR-${n.toString().padStart(2, '0')}`;
                }
                return n;
              })(),
              categoria: p.categoria?.nome || '',
            };
          }));
          setProdutoSelectorOpen(false);
        }}
      />
    </div>
  );
}
