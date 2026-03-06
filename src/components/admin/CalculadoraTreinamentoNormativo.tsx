import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Copy, Printer, Calculator, ChevronDown, ChevronUp, Loader2, Check, ChevronsUpDown, FileText, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calculateDistance } from '@/lib/googleMapsService';
import { getEstados, getCidadesPorEstado, type Estado, type Cidade } from '@/lib/ibgeService';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { TreinamentoSelectorModal } from './TreinamentoSelectorModal';

// Interface para item do orçamento
interface ItemOrcamento {
  id: string;
  treinamentoId: string;
  treinamentoNome: string;
  tipo: 'formacao' | 'reciclagem';
  cargaHoraria: number;
  precoUnitario: number;
  quantidade: number;
  // Campos adicionais do treinamento
  norma?: string;
  natureza?: string;
  categoria?: string;
  classificacao?: string;
  formaCobranca?: string;
  colaboradoresPorTurma?: number;
}

// Interface para produto/serviço (treinamento)
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
  colaboradores_por_turma?: number | null;
  classificacao_id?: string | null;
  forma_cobranca_id?: string | null;
  treinamento_id?: string | null;
  categoria?: {
    id: string;
    nome: string;
    cor: string;
  };
  classificacao?: {
    id: string;
    nome: string;
  };
  forma_cobranca?: {
    id: string;
    nome: string;
  };
  treinamento?: {
    id: string;
    nome: string;
    norma: string | null;
    ch_formacao?: number | null;
    ch_reciclagem?: number | null;
  };
}

// Constantes baseadas na planilha
const Q_HORA_AULA: Record<string, number> = { "8": 8, "16": 16, "20": 24, "24": 24, "40": 40 };
const Q_DIARIAS: Record<string, number> = { "8": 1, "16": 2, "20": 3, "24": 3, "40": 5 };
const Q_REFEICAO: Record<string, number> = { "8": 2, "16": 4, "20": 6, "24": 6, "40": 10 };
const Q_CAFE: Record<string, number> = { "8": 2, "16": 4, "20": 6, "24": 6, "40": 10 };

const CHS = ["8", "16", "20", "24", "40"];
const PLANOS = ["OURO", "PRATA", "BRONZE"] as const;
type Plano = typeof PLANOS[number];

interface CalculoResultado {
  plan: Plano;
  ch: string;
  kmEfetivo: number;
  custo: number;
  preco: number;
  imposto: number;
  comissao: number;
  lucro: number;
  breakdown: [string, number][];
}

interface EntradaConfig {
  empresa: string;
  cidade: string;
  estadoDestino: string;
  estadoOrigem: string;
  cidadeOrigem: string;
  km: number;
  pedagio: number;
  ch: string;
  plano: Plano;
  brigadaOn: boolean;
  brigadaVal: number;
  artNrOn: boolean;
  artNrVal: number;
  artPlhOn: boolean;
  artPlhVal: number;
  simOn: boolean;
  simVal: number;
  autoKmOn: boolean;
  autoKmVal: number;
  rsKm: number;
  horaAula: number;
  diaria: number;
  refeicao: number;
  cafe: number;
  impostoPct: number;
  comissaoPct: number;
  mBronze: number;
  mPrata: number;
  mOuro: number;
}

interface ClienteComCidade {
  id: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
}

interface CalculadoraTreinamentoNormativoProps {
  onClose: () => void;
  onSave?: (dados: any) => void;
  onSaveOrcamentoCliente?: (dados: any) => void; // Callback para salvar orçamento do cliente
  onOpenPropostaComercial?: (dados: any) => void; // Callback para abrir proposta comercial
  clientes?: ClienteComCidade[];
  empresaInicial?: string;
  cidadeInicial?: string;
  estadoDestinoInicial?: string;
  estadoOrigemInicial?: string;
  cidadeOrigemInicial?: string;
  dadosSalvos?: {
    config?: EntradaConfig;
    tabelaPrecos?: Array<{
      ch: string;
      horaAula: number;
      bronze: number;
      prata: number;
      ouro: number;
    }>;
  } | null;
  // Props para salvar no banco de dados
  cardId?: string;
  empresaId?: string;
}

const fmtBRL = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export function CalculadoraTreinamentoNormativo({ onClose, onSave, onSaveOrcamentoCliente, onOpenPropostaComercial, clientes = [], empresaInicial, cidadeInicial, estadoDestinoInicial, estadoOrigemInicial, cidadeOrigemInicial, dadosSalvos, cardId, empresaId }: CalculadoraTreinamentoNormativoProps) {
  const { toast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'comparar' | 'detalhar'>('comparar');
  const [calculandoKm, setCalculandoKm] = useState(false);
  
  // Estados e cidades da API do IBGE
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidadesOrigem, setCidadesOrigem] = useState<Cidade[]>([]);
  const [carregandoEstados, setCarregandoEstados] = useState(false);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  
  // Controle dos popovers de busca
  const [estadoOrigemOpen, setEstadoOrigemOpen] = useState(false);
  const [cidadeOrigemOpen, setCidadeOrigemOpen] = useState(false);
  
  // Estado para o popup de orçamento para o cliente
  const [orcamentoClienteOpen, setOrcamentoClienteOpen] = useState(false);
  const [produtosServicos, setProdutosServicos] = useState<ProdutoServico[]>([]);
  const [carregandoTreinamentos, setCarregandoTreinamentos] = useState(false);
  const [carregandoOrcamentoSalvo, setCarregandoOrcamentoSalvo] = useState(false);
  const [orcamentoSalvoId, setOrcamentoSalvoId] = useState<string | null>(null);
  
  // Itens do orçamento por plano - inicia com 1 item vazio em cada plano
  const gerarIdItem = () => Math.random().toString(36).substring(2, 9);
  
  const criarItemVazio = (): ItemOrcamento => ({
    id: gerarIdItem(),
    treinamentoId: '',
    treinamentoNome: '',
    tipo: 'formacao',
    cargaHoraria: 0,
    precoUnitario: 0,
    quantidade: 1
  });
  
  const [itensPorPlano, setItensPorPlano] = useState<Record<Plano, ItemOrcamento[]>>(() => ({
    OURO: [criarItemVazio()],
    PRATA: [criarItemVazio()],
    BRONZE: [criarItemVazio()]
  }));

  // Estado para controlar a replicação selecionada por plano
  const [replicacaoPorPlano, setReplicacaoPorPlano] = useState<Record<Plano, string>>({
    OURO: '',
    PRATA: '',
    BRONZE: ''
  });

  // Estado para desconto por plano
  const [descontoPorPlano, setDescontoPorPlano] = useState<Record<Plano, { tipo: 'percentual' | 'valor'; valor: number }>>({
    OURO: { tipo: 'percentual', valor: 0 },
    PRATA: { tipo: 'percentual', valor: 0 },
    BRONZE: { tipo: 'percentual', valor: 0 }
  });

  // Estado para controlar o modal de seleção de treinamento
  const [treinamentoSelectorOpen, setTreinamentoSelectorOpen] = useState(false);
  const [treinamentoSelectorPlano, setTreinamentoSelectorPlano] = useState<Plano>('OURO');
  const [treinamentoSelectorItemId, setTreinamentoSelectorItemId] = useState<string>('');

  // Ref para controlar se já carregou o orçamento (evita loops)
  const orcamentoJaCarregado = useState(false);

  // Função para carregar orçamento salvo do banco de dados
  const carregarOrcamentoSalvo = async () => {
    if (!cardId || orcamentoJaCarregado[0]) return;
    
    setCarregandoOrcamentoSalvo(true);
    try {
      const { data, error } = await (supabase as any)
        .from('funil_card_orcamentos')
        .select('*')
        .eq('card_id', cardId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setOrcamentoSalvoId(data.id);
        
        // Carregar itens salvos por plano
        const itensOuro = data.itens_ouro && data.itens_ouro.length > 0 
          ? data.itens_ouro 
          : [criarItemVazio()];
        const itensPrata = data.itens_prata && data.itens_prata.length > 0 
          ? data.itens_prata 
          : [criarItemVazio()];
        const itensBronze = data.itens_bronze && data.itens_bronze.length > 0 
          ? data.itens_bronze 
          : [criarItemVazio()];
        
        setItensPorPlano({
          OURO: itensOuro,
          PRATA: itensPrata,
          BRONZE: itensBronze
        });
        
        // Marcar como carregado para evitar loops
        orcamentoJaCarregado[1](true);
        
        console.log('Orçamento carregado do banco:', data);
      }
    } catch (err) {
      console.error('Erro ao carregar orçamento salvo:', err);
    } finally {
      setCarregandoOrcamentoSalvo(false);
    }
  };

  // Carregar orçamento salvo quando o componente montar (apenas uma vez)
  useEffect(() => {
    if (cardId && !orcamentoJaCarregado[0]) {
      carregarOrcamentoSalvo();
    }
  }, [cardId]);

  // Carregar produtos/serviços quando abrir o popup
  const carregarProdutosServicos = async () => {
    if (!empresaId) return;
    
    setCarregandoTreinamentos(true);
    try {
      // Primeiro, buscar a empresa SST pai
      const { data: empresaSstPai } = await (supabase as any)
        .rpc('get_empresa_sst_pai', { p_empresa_id: empresaId });
      
      const empresaParaBuscar = empresaSstPai || empresaId;
      
      // Buscar produtos da empresa SST pai
      let { data, error } = await (supabase as any)
        .from('produtos_servicos')
        .select(`
          id, nome, codigo, preco, descricao, tipo, carga_horaria, ch_formacao, ch_reciclagem, colaboradores_por_turma,
          classificacao_id, forma_cobranca_id, treinamento_id,
          categoria:categorias_produtos(id, nome, cor),
          classificacao:classificacoes_produtos(id, nome),
          forma_cobranca:formas_cobranca(id, nome),
          treinamento:catalogo_treinamentos(id, nome, norma, ch_formacao, ch_reciclagem)
        `)
        .eq('empresa_id', empresaParaBuscar)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      // Se não encontrou produtos, buscar todos os produtos ativos (fallback)
      if (!data || data.length === 0) {
        const { data: todosProdutos, error: errTodos } = await (supabase as any)
          .from('produtos_servicos')
          .select(`
            id, nome, codigo, preco, descricao, tipo, carga_horaria, ch_formacao, ch_reciclagem, colaboradores_por_turma,
            classificacao_id, forma_cobranca_id, treinamento_id,
            categoria:categorias_produtos(id, nome, cor),
            classificacao:classificacoes_produtos(id, nome),
            forma_cobranca:formas_cobranca(id, nome),
            treinamento:catalogo_treinamentos(id, nome, norma, ch_formacao, ch_reciclagem)
          `)
          .eq('ativo', true)
          .order('nome', { ascending: true });
        
        if (!errTodos) {
          data = todosProdutos;
        }
      }
      
      if (error) throw error;
      setProdutosServicos(data || []);
    } catch (err) {
      console.error('Erro ao carregar produtos/serviços:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos/serviços.',
        variant: 'destructive'
      });
    } finally {
      setCarregandoTreinamentos(false);
    }
  };

  // Carregar produtos/serviços quando abrir o popup
  useEffect(() => {
    if (orcamentoClienteOpen && produtosServicos.length === 0) {
      carregarProdutosServicos();
    }
  }, [orcamentoClienteOpen]);

  // Backfill colaboradoresPorTurma from produtos_servicos for saved items that don't have it
  useEffect(() => {
    if (produtosServicos.length === 0) return;
    
    let changed = false;
    const novosItens = { ...itensPorPlano };
    
    for (const plano of PLANOS) {
      novosItens[plano] = novosItens[plano].map(item => {
        if (item.treinamentoId && !item.colaboradoresPorTurma) {
          const produto = produtosServicos.find(p => p.id === item.treinamentoId);
          if (produto && produto.colaboradores_por_turma) {
            changed = true;
            return { ...item, colaboradoresPorTurma: produto.colaboradores_por_turma };
          }
        }
        return item;
      });
    }
    
    if (changed) {
      setItensPorPlano(novosItens);
    }
  }, [produtosServicos]);

  // Função para calcular preço baseado na carga horária
  const calcularPrecoParaCH = (ch: number, plano: Plano): number => {
    // Encontrar a CH mais próxima nas opções disponíveis
    const chStr = CHS.find(c => parseInt(c) === ch) || CHS.reduce((prev, curr) => 
      Math.abs(parseInt(curr) - ch) < Math.abs(parseInt(prev) - ch) ? curr : prev
    );
    const calc = calcAll(chStr);
    return calc[plano].preco;
  };

  // Funções para manipular itens do orçamento
  const adicionarItem = (plano: Plano) => {
    setItensPorPlano(prev => ({
      ...prev,
      [plano]: [...prev[plano], criarItemVazio()]
    }));
  };

  const removerItem = (plano: Plano, itemId: string) => {
    setItensPorPlano(prev => ({
      ...prev,
      [plano]: prev[plano].filter(item => item.id !== itemId)
    }));
  };

  // Estado para controlar salvamento
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);

  // Função para salvar orçamento no banco de dados
  const salvarOrcamentoNoBanco = async () => {
    if (!cardId || !empresaId) {
      console.log('cardId ou empresaId não fornecidos, salvando apenas localmente');
      return true;
    }

    setSalvandoOrcamento(true);
    try {
      // Calcular totais por plano
      const totalOuro = itensPorPlano.OURO.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
      const totalPrata = itensPorPlano.PRATA.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
      const totalBronze = itensPorPlano.BRONZE.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);

      const dadosOrcamento = {
        card_id: cardId,
        empresa_id: empresaId,
        cliente_nome: config.empresa,
        cidade_destino: config.cidade,
        estado_destino: config.estadoDestino,
        km: config.km,
        itens_ouro: itensPorPlano.OURO,
        itens_prata: itensPorPlano.PRATA,
        itens_bronze: itensPorPlano.BRONZE,
        total_ouro: totalOuro,
        total_prata: totalPrata,
        total_bronze: totalBronze,
        config: config,
      };

      let savedId = orcamentoSalvoId;

      if (orcamentoSalvoId) {
        // Atualizar existente usando o ID já conhecido
        const { error } = await (supabase as any)
          .from('funil_card_orcamentos')
          .update(dadosOrcamento)
          .eq('id', orcamentoSalvoId);

        if (error) throw error;
        console.log('Orçamento atualizado no banco:', orcamentoSalvoId);
      } else {
        // Verificar se já existe um orçamento para este card (fallback)
        const { data: existente } = await (supabase as any)
          .from('funil_card_orcamentos')
          .select('id')
          .eq('card_id', cardId)
          .maybeSingle();

        if (existente?.id) {
          // Atualizar existente
          const { error } = await (supabase as any)
            .from('funil_card_orcamentos')
            .update(dadosOrcamento)
            .eq('id', existente.id);

          if (error) throw error;
          savedId = existente.id;
          setOrcamentoSalvoId(existente.id);
          console.log('Orçamento atualizado no banco (fallback):', existente.id);
        } else {
          // Criar novo
          const { data: novoOrcamento, error } = await (supabase as any)
            .from('funil_card_orcamentos')
            .insert(dadosOrcamento)
            .select('id')
            .single();

          if (error) throw error;
          savedId = novoOrcamento?.id;
          setOrcamentoSalvoId(novoOrcamento?.id);
          console.log('Novo orçamento criado no banco:', novoOrcamento?.id);
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao salvar orçamento no banco:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o orçamento no banco de dados.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSalvandoOrcamento(false);
    }
  };

  // Função para replicar itens de um plano para outros
  const replicarParaPlanos = (planoOrigem: Plano, planosDestino: Plano[]) => {
    const itensOrigem = itensPorPlano[planoOrigem];
    
    setItensPorPlano(prev => {
      const novoEstado = { ...prev };
      
      planosDestino.forEach(planoDestino => {
        // Criar cópias dos itens com novos IDs e preços recalculados para o plano destino
        novoEstado[planoDestino] = itensOrigem.map(item => {
          const novoItem: ItemOrcamento = {
            ...item,
            id: gerarIdItem(),
            precoUnitario: item.cargaHoraria > 0 ? calcularPrecoParaCH(item.cargaHoraria, planoDestino) : 0
          };
          return novoItem;
        });
      });
      
      return novoEstado;
    });
    
    toast({
      title: 'Itens replicados!',
      description: `Os itens do plano ${planoOrigem} foram copiados para ${planosDestino.join(' e ')}.`,
    });
  };

  const atualizarItem = (plano: Plano, itemId: string, campo: keyof ItemOrcamento, valor: any) => {
    setItensPorPlano(prev => ({
      ...prev,
      [plano]: prev[plano].map(item => {
        if (item.id !== itemId) return item;
        
        const novoItem = { ...item, [campo]: valor };
        
        // Se mudou o treinamento, atualizar nome, carga horária, preço e campos adicionais
        if (campo === 'treinamentoId') {
          const produto = produtosServicos.find(p => p.id === valor);
          if (produto) {
            // Mostrar NR + Nome se tiver treinamento vinculado (NR-05 formato)
            const formatNR = (n: string) => `NR-${parseInt(n, 10).toString().padStart(2, '0')}`;
            novoItem.treinamentoNome = produto.treinamento?.norma 
              ? `${formatNR(produto.treinamento.norma)} - ${produto.nome}`
              : produto.nome;
            // Usar carga horária: primeiro do produto, depois do catálogo de treinamentos
            let ch = 0;
            if (novoItem.tipo === 'formacao') {
              // Prioridade: produto.ch_formacao > produto.carga_horaria > treinamento.ch_formacao
              ch = (produto.ch_formacao && produto.ch_formacao > 0) ? produto.ch_formacao 
                 : (produto.carga_horaria && produto.carga_horaria > 0) ? produto.carga_horaria 
                 : (produto.treinamento?.ch_formacao && produto.treinamento.ch_formacao > 0) ? produto.treinamento.ch_formacao 
                 : 0;
            } else {
              // Prioridade: produto.ch_reciclagem > produto.carga_horaria > treinamento.ch_reciclagem
              ch = (produto.ch_reciclagem && produto.ch_reciclagem > 0) ? produto.ch_reciclagem 
                 : (produto.carga_horaria && produto.carga_horaria > 0) ? produto.carga_horaria 
                 : (produto.treinamento?.ch_reciclagem && produto.treinamento.ch_reciclagem > 0) ? produto.treinamento.ch_reciclagem 
                 : 0;
            }
            novoItem.cargaHoraria = ch;
            // Sempre usar calcularPrecoParaCH para manter consistência com a calculadora
            if (ch > 0) {
              novoItem.precoUnitario = calcularPrecoParaCH(ch, plano);
            } else if (produto.preco) {
              novoItem.precoUnitario = produto.preco;
            }
            // Preencher campos adicionais do treinamento
            novoItem.norma = produto.treinamento?.norma ? formatNR(produto.treinamento.norma) : '';
            novoItem.natureza = produto.tipo === 'servico' ? 'Serviço' : 'Produto';
            novoItem.categoria = produto.categoria?.nome || '';
            novoItem.classificacao = produto.classificacao?.nome || '';
            novoItem.formaCobranca = produto.forma_cobranca?.nome || '';
            novoItem.colaboradoresPorTurma = produto.colaboradores_por_turma || 30;
          }
        }
        
        // Se mudou o tipo (formação/reciclagem), atualizar CH e recalcular preço
        if (campo === 'tipo') {
          const produto = produtosServicos.find(p => p.id === item.treinamentoId);
          if (produto) {
            // Atualizar carga horária: primeiro do produto, depois do catálogo
            let ch = 0;
            if (valor === 'formacao') {
              ch = (produto.ch_formacao && produto.ch_formacao > 0) ? produto.ch_formacao 
                 : (produto.carga_horaria && produto.carga_horaria > 0) ? produto.carga_horaria 
                 : (produto.treinamento?.ch_formacao && produto.treinamento.ch_formacao > 0) ? produto.treinamento.ch_formacao 
                 : 0;
            } else {
              ch = (produto.ch_reciclagem && produto.ch_reciclagem > 0) ? produto.ch_reciclagem 
                 : (produto.carga_horaria && produto.carga_horaria > 0) ? produto.carga_horaria 
                 : (produto.treinamento?.ch_reciclagem && produto.treinamento.ch_reciclagem > 0) ? produto.treinamento.ch_reciclagem 
                 : 0;
            }
            novoItem.cargaHoraria = ch;
            // Sempre usar calcularPrecoParaCH para manter consistência com a calculadora
            if (ch > 0) {
              novoItem.precoUnitario = calcularPrecoParaCH(ch, plano);
            } else if (produto.preco) {
              novoItem.precoUnitario = produto.preco;
            }
          }
        }
        
        // Se mudou a carga horária manualmente, recalcular preço
        if (campo === 'cargaHoraria' && valor > 0) {
          novoItem.precoUnitario = calcularPrecoParaCH(valor, plano);
        }
        
        return novoItem;
      })
    }));
  };

  const [config, setConfig] = useState<EntradaConfig>(() => {
    // Se tiver dados salvos, usar eles
    if (dadosSalvos?.config) {
      return dadosSalvos.config;
    }
    // Caso contrário, usar valores padrão com empresa, cidade e estado inicial se fornecidos
    return {
      empresa: empresaInicial || '',
      cidade: cidadeInicial || '',
      estadoDestino: estadoDestinoInicial || '',
      estadoOrigem: estadoOrigemInicial || '',
      cidadeOrigem: cidadeOrigemInicial || '',
      km: 100,
      pedagio: 50,
      ch: '8',
      plano: 'OURO',
      brigadaOn: false,
      brigadaVal: 300,
      artNrOn: false,
      artNrVal: 300,
      artPlhOn: false,
      artPlhVal: 0,
      simOn: false,
      simVal: 0,
      autoKmOn: false,
      autoKmVal: 100,
      rsKm: 1,
      horaAula: 50,
      diaria: 200,
      refeicao: 60,
      cafe: 10,
      impostoPct: 14,
      comissaoPct: 3,
      mBronze: 1.5,
      mPrata: 2,
      mOuro: 2.2,
    };
  });

  const calcFor = useCallback((plan: Plano, ch: string): CalculoResultado => {
    const kmBase = config.km;
    const pedagio = config.pedagio;
    const rsKm = config.rsKm;
    const horaAula = config.horaAula;
    const diaria = config.diaria;
    const refeicao = config.refeicao;
    const cafe = config.cafe;
    const impostoPct = config.impostoPct / 100.0;
    const comissaoPct = config.comissaoPct / 100.0;
    const mBronze = config.mBronze;
    const mPrata = config.mPrata;
    const mOuro = config.mOuro;

    const brigada = config.brigadaOn ? config.brigadaVal : 0;
    const artNr = config.artNrOn ? config.artNrVal : 0;
    const artPlh = config.artPlhOn ? config.artPlhVal : 0;
    const sim = config.simOn ? config.simVal : 0;

    let kmEfetivo = kmBase;
    if (config.autoKmOn) {
      const extra = config.autoKmVal;
      kmEfetivo = kmBase + extra * (Q_DIARIAS[ch] ?? 0);
    }

    const veiculo = rsKm * kmEfetivo;
    const instrutor = horaAula * (Q_HORA_AULA[ch] ?? 0);
    const hotel = diaria * (Q_DIARIAS[ch] ?? 0);
    const refeicaoTotal = refeicao * (Q_REFEICAO[ch] ?? 0);

    const cafeTotalBronze = cafe * (Q_CAFE[ch] ?? 0);
    let cafeTotal: number;
    if (plan === "BRONZE") {
      cafeTotal = cafeTotalBronze;
    } else {
      if (ch === "24" || ch === "40") cafeTotal = cafeTotalBronze;
      else cafeTotal = cafe;
    }

    let custo: number;
    if (plan === "BRONZE") {
      custo = cafeTotal + refeicaoTotal + hotel + instrutor + pedagio + veiculo + brigada + artNr + artPlh;
    } else if (plan === "PRATA") {
      custo = cafeTotal + refeicaoTotal + hotel + instrutor + pedagio + veiculo + artPlh + brigada + artNr;
    } else {
      custo = cafeTotal + refeicaoTotal + hotel + instrutor + pedagio + veiculo + brigada + artNr + sim + artPlh;
    }

    const mult = (plan === "BRONZE") ? mBronze : (plan === "PRATA") ? mPrata : mOuro;
    const preco = custo * mult;
    const imposto = preco * impostoPct;
    const comissao = preco * comissaoPct;
    const lucro = preco - custo - imposto - comissao;

    const breakdown: [string, number][] = [
      ["Veículo (R$ por KM × KM)", veiculo],
      ["Pedágio", pedagio],
      ["Instrutor (hora-aula × qtd)", instrutor],
      ["Hotel (diária × qtd)", hotel],
      ["Refeição", refeicaoTotal],
      ["Café", cafeTotal],
      ["Brigada (Extintores)", brigada],
      ["ART NR 10/12/13", artNr],
      ["ART (PLH / não obrigatório)", artPlh],
    ];
    if (plan === "OURO") breakdown.push(["Simulador / Estrutura (NR 33/35)", sim]);

    return { plan, ch, kmEfetivo, custo, preco, imposto, comissao, lucro, breakdown };
  }, [config]);

  const calcAll = useCallback((ch: string) => {
    return {
      BRONZE: calcFor("BRONZE", ch),
      PRATA: calcFor("PRATA", ch),
      OURO: calcFor("OURO", ch),
    };
  }, [calcFor]);

  const resultado = calcFor(config.plano, config.ch);

  const buildSummary = (): string => {
    const empresa = config.empresa?.trim() || "—";
    const cidadeDestino = config.cidade?.trim() || "—";
    const estadoOrigem = config.estadoOrigem?.trim() || "—";
    const cidadeOrigem = config.cidadeOrigem?.trim() || "—";
    const now = new Date();
    const dt = now.toLocaleDateString("pt-BR");

    const linhas = [
      `ORÇAMENTO - TREINAMENTO NORMATIVO`,
      `Data: ${dt}`,
      `Empresa: ${empresa}`,
      `Origem: ${cidadeOrigem}/${estadoOrigem}`,
      `Destino: ${cidadeDestino}`,
      `Plano: ${config.plano}`,
      `CH: ${config.ch}h (hora-aula usada: ${Q_HORA_AULA[config.ch]})`,
      `KM (base): ${config.km} | KM efetivo: ${resultado.kmEfetivo}`,
      `Pedágio: ${fmtBRL(config.pedagio)}`,
      `Preço (Valor do Treinamento): ${fmtBRL(resultado.preco)}`,
      `Custo: ${fmtBRL(resultado.custo)}`,
      `Imposto: ${fmtBRL(resultado.imposto)} | Comissão: ${fmtBRL(resultado.comissao)}`,
      `Lucro estimado: ${fmtBRL(resultado.lucro)}`
    ];

    return linhas.join("\n");
  };

  const handleCopy = async () => {
    const text = buildSummary();
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado!',
        description: 'Resumo copiado para a área de transferência.',
      });
    } catch (e) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar automaticamente.',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    // Gerar tabela completa de preços (todas as CHs x todos os planos)
    const tabelaPrecos = CHS.map(ch => {
      const calc = calcAll(ch);
      return {
        ch,
        horaAula: Q_HORA_AULA[ch],
        bronze: calc.BRONZE.preco,
        prata: calc.PRATA.preco,
        ouro: calc.OURO.preco,
      };
    });

    if (onSave) {
      onSave({
        config,
        resultado,
        resumo: buildSummary(),
        tabelaPrecos,
        empresa: config.empresa,
        cidadeDestino: config.cidade,
        estadoOrigem: config.estadoOrigem,
        cidadeOrigem: config.cidadeOrigem,
        km: config.km,
      });
    }
    toast({
      title: 'Orçamento salvo',
      description: 'Os valores foram salvos com sucesso!',
    });
  };

  const updateConfig = (key: keyof EntradaConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Carregar estados do IBGE ao montar o componente
  useEffect(() => {
    const carregarEstados = async () => {
      setCarregandoEstados(true);
      try {
        const data = await getEstados();
        setEstados(data);
      } catch (error) {
        console.error('Erro ao carregar estados:', error);
      } finally {
        setCarregandoEstados(false);
      }
    };
    carregarEstados();
  }, []);

  // Carregar cidades quando o estado de origem mudar
  useEffect(() => {
    const carregarCidades = async () => {
      if (!config.estadoOrigem) {
        setCidadesOrigem([]);
        return;
      }
      
      setCarregandoCidades(true);
      try {
        const data = await getCidadesPorEstado(config.estadoOrigem);
        setCidadesOrigem(data);
      } catch (error) {
        console.error('Erro ao carregar cidades:', error);
      } finally {
        setCarregandoCidades(false);
      }
    };
    carregarCidades();
  }, [config.estadoOrigem]);

  // Calcular KM automaticamente quando cidade de origem e destino forem preenchidas
  useEffect(() => {
    const calcularDistancia = async () => {
      // Precisa ter cidade de origem, estado de origem, cidade de destino e estado de destino
      if (!config.cidadeOrigem || !config.estadoOrigem || !config.cidade || !config.estadoDestino) {
        return;
      }
      
      setCalculandoKm(true);
      try {
        const result = await calculateDistance(
          config.cidadeOrigem,
          config.estadoOrigem,
          config.cidade,
          config.estadoDestino
        );

        if (result) {
          // Multiplicar por 2 para ida e volta + 50 km extra
          const kmIdaVolta = Math.round(result.distanceKm * 2) + 50;
          updateConfig('km', kmIdaVolta);
          toast({
            title: 'Distância calculada',
            description: `${result.distanceText} (ida) × 2 + 50 km = ${kmIdaVolta} km (ida e volta)`,
          });
        }
      } catch (error) {
        console.error('Erro ao calcular distância:', error);
      } finally {
        setCalculandoKm(false);
      }
    };

    calcularDistancia();
  }, [config.cidadeOrigem, config.estadoOrigem, config.cidade, config.estadoDestino]);

  return (
    <div className="flex flex-col h-full max-h-[85vh] overflow-hidden">
      {/* Header fixo */}
      <div className="flex items-center justify-between pb-4 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Calculadora de Preço — Treinamento Normativo</h2>
            <p className="text-xs text-muted-foreground">
              Baseada na planilha "Elaboração de Orçamento Padrão 2025 (V4)"
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          <span className="font-bold text-primary">{config.plano}</span>
          <span className="mx-1">•</span>
          <span className="font-bold">{config.ch}h</span>
        </Badge>
      </div>

      <div className="flex-1 mt-4 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pr-4">
          {/* Coluna Esquerda - Entradas */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Entradas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Empresa e Cidade de Destino */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Empresa</Label>
                    <Input
                      value={config.empresa}
                      readOnly
                      className="h-9 bg-muted/50"
                      placeholder="Empresa do card"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cidade de Destino</Label>
                    <Input
                      value={config.cidade}
                      readOnly
                      className="h-9 bg-muted/50"
                      placeholder="Cidade do treinamento"
                    />
                  </div>
                </div>

                {/* Estado de Origem e Cidade de Origem */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-2">
                      Estado de Origem
                      {carregandoEstados && <Loader2 className="h-3 w-3 animate-spin" />}
                    </Label>
                    <Popover open={estadoOrigemOpen} onOpenChange={setEstadoOrigemOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={estadoOrigemOpen}
                          className="h-9 w-full justify-between font-normal"
                        >
                          {config.estadoOrigem
                            ? estados.find((e) => e.sigla === config.estadoOrigem)?.nome || config.estadoOrigem
                            : "Selecione o estado..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar estado..." />
                          <CommandList>
                            <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                            <CommandGroup>
                              {estados.map((estado) => (
                                <CommandItem
                                  key={estado.sigla}
                                  value={`${estado.sigla} ${estado.nome}`}
                                  onSelect={() => {
                                    updateConfig('estadoOrigem', estado.sigla);
                                    updateConfig('cidadeOrigem', '');
                                    setEstadoOrigemOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      config.estadoOrigem === estado.sigla ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {estado.sigla} - {estado.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-2">
                      Cidade de Origem
                      {carregandoCidades && <Loader2 className="h-3 w-3 animate-spin" />}
                    </Label>
                    <Popover open={cidadeOrigemOpen} onOpenChange={setCidadeOrigemOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={cidadeOrigemOpen}
                          className="h-9 w-full justify-between font-normal"
                          disabled={!config.estadoOrigem || carregandoCidades}
                        >
                          {config.cidadeOrigem || (config.estadoOrigem ? "Selecione a cidade..." : "Selecione o estado primeiro")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar cidade..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                            <CommandGroup>
                              {cidadesOrigem.map((cidade) => (
                                <CommandItem
                                  key={cidade.id}
                                  value={cidade.nome}
                                  onSelect={() => {
                                    updateConfig('cidadeOrigem', cidade.nome);
                                    setCidadeOrigemOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      config.cidadeOrigem === cidade.nome ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {cidade.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* KM e Pedágio */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-2">
                      KM ida e volta
                      {calculandoKm && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={config.km}
                        onChange={(e) => updateConfig('km', parseFloat(e.target.value) || 0)}
                        className="h-9"
                        disabled={calculandoKm}
                      />
                      {calculandoKm && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
                          <span className="text-xs text-muted-foreground">Calculando...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pedágio (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={config.pedagio}
                      onChange={(e) => updateConfig('pedagio', parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* CH e Plano */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Treinamento (CH)</Label>
                    <Select value={config.ch} onValueChange={(v) => updateConfig('ch', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHS.map(ch => (
                          <SelectItem key={ch} value={ch}>{ch} horas</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Plano</Label>
                    <Select value={config.plano} onValueChange={(v) => updateConfig('plano', v as Plano)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANOS.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add-ons */}
                <div className="space-y-2">
                  {/* Brigada */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Brigada (Extintores)</p>
                      <p className="text-xs text-muted-foreground">Treinamento de Brigada</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={config.brigadaOn}
                        onCheckedChange={(v) => updateConfig('brigadaOn', !!v)}
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={config.brigadaVal}
                        onChange={(e) => updateConfig('brigadaVal', parseFloat(e.target.value) || 0)}
                        className="h-8 w-24"
                        disabled={!config.brigadaOn}
                      />
                    </div>
                  </div>

                  {/* ART NR */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium">ART NR 10/12/13</p>
                      <p className="text-xs text-muted-foreground">NR 10/12/13 - ART</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={config.artNrOn}
                        onCheckedChange={(v) => updateConfig('artNrOn', !!v)}
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={config.artNrVal}
                        onChange={(e) => updateConfig('artNrVal', parseFloat(e.target.value) || 0)}
                        className="h-8 w-24"
                        disabled={!config.artNrOn}
                      />
                    </div>
                  </div>

                  {/* ART PLH */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium">ART (PLH / Não obrigatório)</p>
                      <p className="text-xs text-muted-foreground">ART para treinamentos não obrigatórios</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={config.artPlhOn}
                        onCheckedChange={(v) => updateConfig('artPlhOn', !!v)}
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={config.artPlhVal}
                        onChange={(e) => updateConfig('artPlhVal', parseFloat(e.target.value) || 0)}
                        className="h-8 w-24"
                        disabled={!config.artPlhOn}
                      />
                    </div>
                  </div>

                  {/* Simulador */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Simulador / Estrutura (NR 33/35)</p>
                      <p className="text-xs text-muted-foreground">Aparece no cálculo do Plano Ouro</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={config.simOn}
                        onCheckedChange={(v) => updateConfig('simOn', !!v)}
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={config.simVal}
                        onChange={(e) => updateConfig('simVal', parseFloat(e.target.value) || 0)}
                        className="h-8 w-24"
                        disabled={!config.simOn}
                      />
                    </div>
                  </div>

                  {/* Auto KM */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Auto-ajuste de KM (+100 km por diária)</p>
                      <p className="text-xs text-muted-foreground">Ajusta o KM efetivo para cálculo</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={config.autoKmOn}
                        onCheckedChange={(v) => updateConfig('autoKmOn', !!v)}
                      />
                      <Input
                        type="number"
                        min={0}
                        value={config.autoKmVal}
                        onChange={(e) => updateConfig('autoKmVal', parseFloat(e.target.value) || 0)}
                        className="h-8 w-24"
                        disabled={!config.autoKmOn}
                      />
                    </div>
                  </div>
                </div>

                {/* Avançado */}
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full justify-between text-muted-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Avançado</Badge>
                      Campos da planilha (não mudar)
                    </span>
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>

                  {showAdvanced && (
                    <div className="grid grid-cols-2 gap-3 mt-3 p-3 rounded-lg border bg-muted/20">
                      <div className="space-y-1.5">
                        <Label className="text-xs">R$ por KM</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={config.rsKm}
                          onChange={(e) => updateConfig('rsKm', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">R$ Hora-aula</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={config.horaAula}
                          onChange={(e) => updateConfig('horaAula', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">R$ Diária (hotel)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={config.diaria}
                          onChange={(e) => updateConfig('diaria', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">R$ Refeição</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={config.refeicao}
                          onChange={(e) => updateConfig('refeicao', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">R$ Café</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={config.cafe}
                          onChange={(e) => updateConfig('cafe', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Imposto (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={config.impostoPct}
                          onChange={(e) => updateConfig('impostoPct', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Comissão (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={config.comissaoPct}
                          onChange={(e) => updateConfig('comissaoPct', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Markup Bronze (x)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={config.mBronze}
                          onChange={(e) => updateConfig('mBronze', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Markup Prata (x)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={config.mPrata}
                          onChange={(e) => updateConfig('mPrata', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Markup Ouro (x)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={config.mOuro}
                          onChange={(e) => updateConfig('mOuro', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita - Resultados */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Resultados</CardTitle>
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'comparar' | 'detalhar')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="comparar" className="text-xs px-3">Comparar</TabsTrigger>
                      <TabsTrigger value="detalhar" className="text-xs px-3">Detalhar</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {activeTab === 'comparar' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Clique em uma linha para selecionar a CH. A seleção também atualiza o painel de detalhes.
                    </p>

                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Treinamento (CH)</TableHead>
                            <TableHead className="text-xs text-right">Bronze</TableHead>
                            <TableHead className="text-xs text-right">Prata</TableHead>
                            <TableHead className="text-xs text-right">Ouro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {CHS.map(ch => {
                            const all = calcAll(ch);
                            // Calcular margem de lucro em % para cada plano
                            const margemBronze = all.BRONZE.preco > 0 ? ((all.BRONZE.lucro / all.BRONZE.preco) * 100) : 0;
                            const margemPrata = all.PRATA.preco > 0 ? ((all.PRATA.lucro / all.PRATA.preco) * 100) : 0;
                            const margemOuro = all.OURO.preco > 0 ? ((all.OURO.lucro / all.OURO.preco) * 100) : 0;
                            return (
                              <TableRow
                                key={ch}
                                className={`cursor-pointer ${config.ch === ch ? 'bg-primary/10' : ''}`}
                                onClick={() => updateConfig('ch', ch)}
                              >
                                <TableCell className="font-medium">
                                  <span className="font-bold">{ch}h</span>
                                  <Badge variant="secondary" className="ml-2 text-[10px]">
                                    hora-aula: {Q_HORA_AULA[ch]}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="font-mono text-sm">{fmtBRL(all.BRONZE.preco)}</div>
                                  <div className={`text-[10px] ${margemBronze >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Margem: {margemBronze.toFixed(1)}%
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="font-mono text-sm">{fmtBRL(all.PRATA.preco)}</div>
                                  <div className={`text-[10px] ${margemPrata >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Margem: {margemPrata.toFixed(1)}%
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="font-mono text-sm">{fmtBRL(all.OURO.preco)}</div>
                                  <div className={`text-[10px] ${margemOuro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Margem: {margemOuro.toFixed(1)}%
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Preço ({config.plano})</p>
                        <p className="text-lg font-bold font-mono">{fmtBRL(resultado.preco)}</p>
                      </div>
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Custo ({config.plano})</p>
                        <p className="text-lg font-bold font-mono">{fmtBRL(resultado.custo)}</p>
                      </div>
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Lucro ({config.plano})</p>
                        <p className={`text-lg font-bold font-mono ${resultado.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {fmtBRL(resultado.lucro)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Breakdown */}
                      <div>
                        <Badge variant="outline" className="mb-3">
                          Resumo — <span className="font-bold">{config.plano}</span> • <span className="font-bold">{config.ch}h</span>
                        </Badge>
                        <div className="space-y-2">
                          {resultado.breakdown
                            .filter(([, val]) => Math.abs(val) >= 0.01)
                            .map(([name, val], idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                                <span className="text-xs">{name}</span>
                                <span className="text-sm font-mono">{fmtBRL(val)}</span>
                              </div>
                            ))}
                          {resultado.breakdown.filter(([, val]) => Math.abs(val) >= 0.01).length === 0 && (
                            <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                              <span className="text-xs">Sem itens (todos em 0)</span>
                              <span className="text-sm font-mono">{fmtBRL(0)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Totais */}
                      <div>
                        <Badge variant="outline" className="mb-3">Totais</Badge>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                            <span className="text-xs">Custo</span>
                            <span className="text-sm font-mono">{fmtBRL(resultado.custo)}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                            <span className="text-xs">Preço (Valor do treinamento)</span>
                            <span className="text-sm font-mono">{fmtBRL(resultado.preco)}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                            <span className="text-xs">Imposto</span>
                            <span className="text-sm font-mono">{fmtBRL(resultado.imposto)}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                            <span className="text-xs">Comissão</span>
                            <span className="text-sm font-mono">{fmtBRL(resultado.comissao)}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg border bg-green-50 dark:bg-green-950/30">
                            <span className="text-xs font-bold">Lucro estimado</span>
                            <span className={`text-sm font-mono font-bold ${resultado.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {fmtBRL(resultado.lucro)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 p-3 rounded-lg border bg-muted/20">
                          <p className="text-xs font-semibold mb-2">Notas de fidelidade à planilha</p>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                            <li>Para <strong>20h</strong>, a planilha usa <code className="bg-muted px-1 rounded">24</code> como "Quant. Hora aula".</li>
                            <li>Para <strong>Prata</strong> e <strong>Ouro</strong>, o "Café Total" é <code className="bg-muted px-1 rounded">10</code> em 8/16/20h.</li>
                            <li>Imposto e comissão são calculados sobre o <strong>Valor do Treinamento</strong>.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button size="sm" variant="outline" className="ml-auto border-primary/50 text-primary hover:bg-primary/10" onClick={() => setOrcamentoClienteOpen(true)}>
                    Criar orçamento para o cliente
                  </Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => {
                    handleSave();
                    toast({
                      title: 'Cálculo salvo!',
                      description: 'Os valores da calculadora foram salvos.',
                    });
                  }}>
                    Salvar Cálculo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de Orçamento para o Cliente */}
      <Dialog open={orcamentoClienteOpen} onOpenChange={setOrcamentoClienteOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Orçamento para o Cliente - {config.empresa || 'Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Informações do Cliente */}
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <div className="grid grid-cols-3 gap-4">
                <div><span className="text-muted-foreground">Empresa:</span> <strong>{config.empresa || '-'}</strong></div>
                <div><span className="text-muted-foreground">Cidade:</span> <strong>{config.cidade || '-'}</strong></div>
                <div><span className="text-muted-foreground">Distância:</span> <strong>{config.km} km</strong></div>
              </div>
            </div>

            {carregandoTreinamentos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando treinamentos...</span>
              </div>
            ) : (
              <>
                {/* Blocos por Plano */}
                {PLANOS.map(plano => {
                  const planoColors: Record<Plano, { bg: string; border: string; badge: string; badgeText: string }> = {
                    OURO: { bg: 'bg-card', border: 'border-primary/50', badge: 'bg-primary', badgeText: 'text-primary-foreground' },
                    PRATA: { bg: 'bg-card', border: 'border-muted-foreground/30', badge: 'bg-muted-foreground', badgeText: 'text-background' },
                    BRONZE: { bg: 'bg-card', border: 'border-primary/30', badge: 'bg-primary/70', badgeText: 'text-primary-foreground' }
                  };
                  const colors = planoColors[plano];
                  const itens = itensPorPlano[plano] || [];
                  
                  // Calcular total do plano
                  const totalPlano = itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);

                  return (
                    <Card key={plano} className={`${colors.bg} ${colors.border} border-2`}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge className={`${colors.badge} ${colors.badgeText}`}>{plano}</Badge>
                              Plano {plano}
                            </CardTitle>
                            {/* Dropdown para replicar */}
                            <Select 
                              value={replicacaoPorPlano[plano] || undefined}
                              onValueChange={(v) => {
                                // Atualizar o estado de replicação
                                setReplicacaoPorPlano(prev => ({ ...prev, [plano]: v }));
                                
                                if (v === 'nao_replicar') {
                                  // Não faz nada, apenas limpa a seleção visual
                                  toast({
                                    title: 'Replicação desativada',
                                    description: `O plano ${plano} não será mais replicado.`,
                                  });
                                } else if (v === 'todos') {
                                  const outrosPlanos = PLANOS.filter(p => p !== plano);
                                  replicarParaPlanos(plano, outrosPlanos);
                                } else if (v) {
                                  replicarParaPlanos(plano, [v as Plano]);
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 w-[180px] text-xs">
                                <SelectValue placeholder="Replicar para..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nao_replicar" className="text-xs text-muted-foreground">Não replicar</SelectItem>
                                <SelectItem value="todos" className="text-xs">Todos os planos</SelectItem>
                                {PLANOS.filter(p => p !== plano).map(p => (
                                  <SelectItem key={p} value={p} className="text-xs">Somente {p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-muted-foreground">Total:</span>
                            <span className="ml-2 text-lg font-bold">{fmtBRL(totalPlano)}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2">
                        {/* Desconto sobre o Total - no topo */}
                        <div className="mb-4 pb-3 border-b bg-muted/30 -mx-6 px-6 -mt-2 pt-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Desconto sobre Total:</Label>
                              <Select 
                                value={descontoPorPlano[plano].tipo}
                                onValueChange={(v) => setDescontoPorPlano(prev => ({
                                  ...prev,
                                  [plano]: { ...prev[plano], tipo: v as 'percentual' | 'valor' }
                                }))}
                              >
                                <SelectTrigger className="h-7 w-[100px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentual" className="text-xs">%</SelectItem>
                                  <SelectItem value="valor" className="text-xs">R$ (fixo)</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min={0}
                                step={descontoPorPlano[plano].tipo === 'percentual' ? 1 : 0.01}
                                value={descontoPorPlano[plano].valor || ''}
                                onChange={(e) => setDescontoPorPlano(prev => ({
                                  ...prev,
                                  [plano]: { ...prev[plano], valor: parseFloat(e.target.value) || 0 }
                                }))}
                                placeholder={descontoPorPlano[plano].tipo === 'percentual' ? '0%' : 'R$ 0,00'}
                                className="h-7 w-[100px] text-xs"
                              />
                            </div>
                            <div className="text-right">
                              {descontoPorPlano[plano].valor > 0 ? (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground line-through">{fmtBRL(totalPlano)}</span>
                                  <span className="text-xs text-green-600 font-medium">
                                    -{descontoPorPlano[plano].tipo === 'percentual' 
                                      ? `${descontoPorPlano[plano].valor}%` 
                                      : fmtBRL(descontoPorPlano[plano].valor)}
                                  </span>
                                  <span className="text-lg font-bold text-primary">
                                    {fmtBRL(
                                      descontoPorPlano[plano].tipo === 'percentual'
                                        ? totalPlano * (1 - descontoPorPlano[plano].valor / 100)
                                        : totalPlano - descontoPorPlano[plano].valor
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-lg font-bold">{fmtBRL(totalPlano)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Table className="w-full table-fixed">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[30px] text-center text-[10px] px-1">Item</TableHead>
                              <TableHead className="text-[10px] px-1">Treinamento</TableHead>
                              <TableHead className="w-[40px] text-center text-[10px] px-1">Nat.</TableHead>
                              <TableHead className="w-[80px] text-center text-[10px] px-1">Categ.</TableHead>
                              <TableHead className="w-[50px] text-center text-[10px] px-1">Cobr.</TableHead>
                              <TableHead className="w-[62px] text-center text-[10px] px-1">Tipo</TableHead>
                              <TableHead className="w-[45px] text-center text-[10px] px-1">CH</TableHead>
                              <TableHead className="w-[70px] text-center text-[10px] px-1">Colab./Turma</TableHead>
                              <TableHead className="w-[70px] text-right text-[10px] px-1">Preço</TableHead>
                              <TableHead className="w-[38px] text-center text-[10px] px-1">Qtd</TableHead>
                              <TableHead className="w-[75px] text-right text-[10px] px-1">Total</TableHead>
                              <TableHead className="w-[28px] text-center text-[10px] px-0"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itens.map((item, index) => {
                              const total = item.precoUnitario * item.quantidade;

                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="text-center text-[10px] text-muted-foreground px-1">
                                    {index + 1}
                                  </TableCell>
                                  <TableCell className="px-1 py-1 overflow-hidden">
                                    <Button
                                      variant="outline"
                                      className="h-7 w-full justify-start text-[10px] font-normal px-1.5 overflow-hidden"
                                      onClick={() => {
                                        setTreinamentoSelectorPlano(plano);
                                        setTreinamentoSelectorItemId(item.id);
                                        setTreinamentoSelectorOpen(true);
                                      }}
                                    >
                                      <Search className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
                                      {item.treinamentoNome ? (
                                        <span className="truncate">{item.treinamentoNome}</span>
                                      ) : (
                                        <span className="text-muted-foreground">Selecionar...</span>
                                      )}
                                    </Button>
                                  </TableCell>
                                  {/* Natureza */}
                                  <TableCell className="text-center px-1 py-1">
                                    <span className="text-[10px]">{item.natureza === 'Serviço' ? 'Serv.' : item.natureza || '-'}</span>
                                  </TableCell>
                                  {/* Categoria */}
                                  <TableCell className="text-center px-1 py-1">
                                    <span className="text-[10px] truncate block">{item.categoria || '-'}</span>
                                  </TableCell>
                                  {/* Forma de Cobrança */}
                                  <TableCell className="text-center px-1 py-1">
                                    <span className="text-[10px] truncate block">{item.formaCobranca || '-'}</span>
                                  </TableCell>
                                  {/* Formação/Reciclagem */}
                                  <TableCell className="text-center px-1 py-1">
                                    <Select 
                                      value={item.tipo} 
                                      onValueChange={(v) => atualizarItem(plano, item.id, 'tipo', v)}
                                    >
                                      <SelectTrigger className="h-6 text-[9px] w-full px-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="formacao" className="text-xs">Formação</SelectItem>
                                        <SelectItem value="reciclagem" className="text-xs">Reciclagem</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  {/* Carga Horária */}
                                  <TableCell className="text-center px-1 py-1">
                                    <Input 
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={item.cargaHoraria}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        atualizarItem(plano, item.id, 'cargaHoraria', parseInt(val) || 0);
                                      }}
                                      className="h-6 text-[10px] text-center w-full px-1"
                                    />
                                  </TableCell>
                                  {/* Colaboradores por Turma */}
                                  <TableCell className="text-center px-1 py-1">
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">Até</span>
                                      <Input 
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={item.colaboradoresPorTurma || ''}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/\D/g, '');
                                          atualizarItem(plano, item.id, 'colaboradoresPorTurma', parseInt(val) || 0);
                                        }}
                                        className="h-6 text-[10px] text-center w-full px-1"
                                      />
                                    </div>
                                  </TableCell>
                                  {/* Preço Unitário */}
                                  <TableCell className="text-right font-medium text-[10px] px-1 py-1">
                                    {fmtBRL(item.precoUnitario)}
                                  </TableCell>
                                  {/* Quantidade */}
                                  <TableCell className="text-center px-1 py-1">
                                    <Input 
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={item.quantidade}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        atualizarItem(plano, item.id, 'quantidade', parseInt(val) || 1);
                                      }}
                                      className="h-6 text-[10px] text-center w-full px-1"
                                    />
                                  </TableCell>
                                  {/* Total */}
                                  <TableCell className="text-right font-bold text-[10px] px-1 py-1">
                                    {fmtBRL(total)}
                                  </TableCell>
                                  {/* Ações */}
                                  <TableCell className="px-0 py-1 text-center">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                      onClick={() => removerItem(plano, item.id)}
                                      disabled={itens.length === 1}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        
                        {/* Botão Adicionar Serviço */}
                        <div className="mt-3 pt-3 border-t border-dashed">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => adicionarItem(plano)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Serviço
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Resumo Geral */}
                <Card className="bg-muted/30 border-primary/50 border-2">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg">Resumo Geral</span>
                      <div className="flex gap-6">
                        {PLANOS.map(plano => {
                          const itens = itensPorPlano[plano] || [];
                          const totalPlano = itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
                          const desconto = descontoPorPlano[plano];
                          const valorDesconto = desconto.tipo === 'percentual' 
                            ? totalPlano * (desconto.valor / 100) 
                            : desconto.valor;
                          const totalComDesconto = totalPlano - valorDesconto;
                          const temDesconto = desconto.valor > 0;
                          return (
                            <div key={plano} className="text-center">
                              <Badge variant="outline" className="mb-1">{plano}</Badge>
                              {temDesconto ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-xs text-muted-foreground line-through">{fmtBRL(totalPlano)}</span>
                                  <p className="font-bold text-lg text-primary">{fmtBRL(totalComDesconto)}</p>
                                </div>
                              ) : (
                                <p className="font-bold text-lg">{fmtBRL(totalPlano)}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Botões */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setOrcamentoClienteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              {onOpenPropostaComercial && (
                <Button 
                  variant="outline"
                  className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                  onClick={() => {
                    // Calcular totais por plano (sem desconto)
                    const totalOuro = itensPorPlano.OURO.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
                    const totalPrata = itensPorPlano.PRATA.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
                    const totalBronze = itensPorPlano.BRONZE.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
                    
                    // Calcular descontos
                    const calcularDesconto = (total: number, plano: Plano) => {
                      const desc = descontoPorPlano[plano];
                      return desc.tipo === 'percentual' ? total * (desc.valor / 100) : desc.valor;
                    };
                    
                    onOpenPropostaComercial({
                      empresa: config.empresa,
                      cidadeDestino: config.cidade,
                      estadoOrigem: config.estadoOrigem,
                      cidadeOrigem: config.cidadeOrigem,
                      km: config.km,
                      itensPorPlano,
                      totais: {
                        ouro: totalOuro,
                        prata: totalPrata,
                        bronze: totalBronze,
                      },
                      descontos: {
                        ouro: { ...descontoPorPlano.OURO, valorDesconto: calcularDesconto(totalOuro, 'OURO'), totalComDesconto: totalOuro - calcularDesconto(totalOuro, 'OURO') },
                        prata: { ...descontoPorPlano.PRATA, valorDesconto: calcularDesconto(totalPrata, 'PRATA'), totalComDesconto: totalPrata - calcularDesconto(totalPrata, 'PRATA') },
                        bronze: { ...descontoPorPlano.BRONZE, valorDesconto: calcularDesconto(totalBronze, 'BRONZE'), totalComDesconto: totalBronze - calcularDesconto(totalBronze, 'BRONZE') },
                      },
                    });
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Proposta Comercial
                </Button>
              )}
              <Button 
                className="bg-primary hover:bg-primary/90" 
                disabled={salvandoOrcamento}
                onClick={async () => {
                  // Salvar no banco de dados
                  const salvouNoBanco = await salvarOrcamentoNoBanco();
                  
                  // Calcular totais por plano para enviar ao resultado
                  const totalOuro = itensPorPlano.OURO.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
                  const totalPrata = itensPorPlano.PRATA.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
                  const totalBronze = itensPorPlano.BRONZE.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
                  
                  // Calcular descontos
                  const calcularDesconto = (total: number, plano: Plano) => {
                    const desc = descontoPorPlano[plano];
                    return desc.tipo === 'percentual' ? total * (desc.valor / 100) : desc.valor;
                  };
                  
                  // Enviar dados do orçamento do cliente para a tela de resultado
                  if (onSaveOrcamentoCliente) {
                    onSaveOrcamentoCliente({
                      empresa: config.empresa,
                      cidadeDestino: config.cidade,
                      estadoOrigem: config.estadoOrigem,
                      cidadeOrigem: config.cidadeOrigem,
                      km: config.km,
                      itensPorPlano,
                      totais: {
                        ouro: totalOuro,
                        prata: totalPrata,
                        bronze: totalBronze,
                      },
                      descontos: {
                        ouro: { ...descontoPorPlano.OURO, valorDesconto: calcularDesconto(totalOuro, 'OURO'), totalComDesconto: totalOuro - calcularDesconto(totalOuro, 'OURO') },
                        prata: { ...descontoPorPlano.PRATA, valorDesconto: calcularDesconto(totalPrata, 'PRATA'), totalComDesconto: totalPrata - calcularDesconto(totalPrata, 'PRATA') },
                        bronze: { ...descontoPorPlano.BRONZE, valorDesconto: calcularDesconto(totalBronze, 'BRONZE'), totalComDesconto: totalBronze - calcularDesconto(totalBronze, 'BRONZE') },
                      },
                    });
                  }
                  
                  // Salvar localmente também (para a calculadora)
                  handleSave();
                  
                  setOrcamentoClienteOpen(false);
                  toast({
                    title: 'Orçamento salvo!',
                    description: salvouNoBanco 
                      ? 'O orçamento foi salvo no banco de dados com sucesso.' 
                      : 'O orçamento foi gerado com sucesso.',
                  });
                }}
              >
                {salvandoOrcamento ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {salvandoOrcamento ? 'Salvando...' : 'Salvar Orçamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Seleção de Treinamento */}
      <TreinamentoSelectorModal
        open={treinamentoSelectorOpen}
        onOpenChange={setTreinamentoSelectorOpen}
        produtos={produtosServicos}
        selectedId={itensPorPlano[treinamentoSelectorPlano]?.find(i => i.id === treinamentoSelectorItemId)?.treinamentoId}
        onSelect={(produto) => {
          atualizarItem(treinamentoSelectorPlano, treinamentoSelectorItemId, 'treinamentoId', produto.id);
        }}
      />
    </div>
  );
}
