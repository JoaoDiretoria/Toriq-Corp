import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Download, 
  Upload, 
  Tags, 
  Package,
  X,
  CreditCard,
  FileText,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Table2,
  Image,
  Link2,
  Layers
} from 'lucide-react';
import { ProdutosServicosImportExport } from './ProdutosServicosImportExport';

interface Categoria {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
}

interface TipoProduto {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface TreinamentoCatalogo {
  id: string;
  nome: string;
  norma: string | null;
  ch_formacao: number | null;
  ch_reciclagem: number | null;
}

interface FormaCobranca {
  id: string;
  nome: string;
  periodicidade: string;
  ativo: boolean;
}

interface Natureza {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface Classificacao {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface Produto {
  id: string;
  nome: string;
  codigo: string | null;
  preco: number | null;
  descricao: string | null;
  tipo: 'produto' | 'servico';
  forma_cobranca: string | null;
  forma_cobranca_id: string | null;
  forma_cobranca_obj?: FormaCobranca;
  ativo: boolean;
  categoria_id: string | null;
  categoria?: Categoria;
  natureza_id: string | null;
  natureza?: Natureza;
  classificacao_id: string | null;
  classificacao?: Classificacao;
  created_at: string;
  carga_horaria: number | null;
  ch_formacao: number | null;
  ch_reciclagem: number | null;
  colaboradores_por_turma: number | null;
}

interface Pacote {
  id: string;
  nome: string;
  descricao: string | null;
  preco_total: number | null;
  preco_fixo: number | null;
  forma_cobranca: string | null;
  desconto_percentual: number;
  ativo: boolean;
  itens?: PacoteItem[];
}

interface PacoteItem {
  id: string;
  pacote_id: string;
  produto_id: string;
  quantidade: number;
  produto?: Produto;
}

export function ProdutosServicos() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [formasCobranca, setFormasCobranca] = useState<FormaCobranca[]>([]);
  const [tipos, setTipos] = useState<TipoProduto[]>([]);
  const [naturezas, setNaturezas] = useState<Natureza[]>([]);
  const [classificacoes, setClassificacoes] = useState<Classificacao[]>([]);
  const [treinamentosCatalogo, setTreinamentosCatalogo] = useState<TreinamentoCatalogo[]>([]);
  const [temModuloToriqTrain, setTemModuloToriqTrain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [produtoDialogOpen, setProdutoDialogOpen] = useState(false);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [pacoteDialogOpen, setPacoteDialogOpen] = useState(false);
  const [formaCobrancaDialogOpen, setFormaCobrancaDialogOpen] = useState(false);
  const [tipoDialogOpen, setTipoDialogOpen] = useState(false);
  const [naturezaDialogOpen, setNaturezaDialogOpen] = useState(false);
  const [classificacaoDialogOpen, setClassificacaoDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [descricaoDialogOpen, setDescricaoDialogOpen] = useState(false);
  const [descricaoVisualizando, setDescricaoVisualizando] = useState<{ nome: string; descricao: string } | null>(null);
  
  // Edit states
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [editingPacote, setEditingPacote] = useState<Pacote | null>(null);
  const [editingFormaCobranca, setEditingFormaCobranca] = useState<FormaCobranca | null>(null);
  const [editingTipo, setEditingTipo] = useState<TipoProduto | null>(null);
  const [editingNatureza, setEditingNatureza] = useState<Natureza | null>(null);
  const [editingClassificacao, setEditingClassificacao] = useState<Classificacao | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'produto' | 'categoria' | 'pacote' | 'forma_cobranca' | 'tipo' | 'natureza' | 'classificacao'; item: any } | null>(null);
  
  // Form states
  const [produtoForm, setProdutoForm] = useState({
    nome: '',
    codigo: '',
    preco: '',
    descricao: '',
    tipo: 'servico' as 'produto' | 'servico',
    tipo_id: '',
    forma_cobranca_id: '',
    categoria_id: '',
    natureza_id: '',
    classificacao_id: '',
    ativo: true,
    // Campos específicos para treinamento
    treinamento_id: '',
    formacao_reciclagem: '' as '' | 'formacao' | 'reciclagem',
    carga_horaria: '',
    ch_formacao: '',
    ch_reciclagem: '',
    colaboradores_por_turma: '30',
  });
  
  const [formaCobrancaForm, setFormaCobrancaForm] = useState({
    nome: '',
    periodicidade: '1',
  });
  
  const [categoriaForm, setCategoriaForm] = useState({
    nome: '',
    descricao: '',
    cor: '#6366f1',
  });

  const [tipoForm, setTipoForm] = useState({
    nome: '',
    descricao: '',
  });

  const [naturezaForm, setNaturezaForm] = useState({
    nome: '',
    descricao: '',
  });

  const [classificacaoForm, setClassificacaoForm] = useState({
    nome: '',
    descricao: '',
  });
  
  const [pacoteForm, setPacoteForm] = useState({
    nome: '',
    descricao: '',
    preco_fixo: '',
    forma_cobranca: 'por_produto',
    desconto_percentual: '0',
    produtosSelecionados: [] as { produto_id: string; quantidade: number }[],
  });

  useEffect(() => {
    if (empresa?.id) {
      fetchData();
    }
  }, [empresa?.id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchProdutos(), fetchCategorias(), fetchPacotes(), fetchFormasCobranca(), fetchTipos(), fetchNaturezas(), fetchClassificacoes(), fetchTreinamentosCatalogo()]);
    setLoading(false);
  };

  const fetchProdutos = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('produtos_servicos')
        .select(`
          *,
          categoria:categorias_produtos(id, nome, cor),
          forma_cobranca_obj:formas_cobranca(id, nome, periodicidade)
        `)
        .eq('empresa_id', empresa?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('categorias_produtos')
        .select('*')
        .eq('empresa_id', empresa?.id)
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchPacotes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('pacotes_produtos')
        .select(`
          *,
          itens:pacotes_produtos_itens(
            id,
            produto_id,
            quantidade,
            produto:produtos_servicos(id, nome, preco)
          )
        `)
        .eq('empresa_id', empresa?.id)
        .order('nome');

      if (error) throw error;
      setPacotes(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar pacotes:', error);
    }
  };

  const fetchFormasCobranca = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('formas_cobranca')
        .select('*')
        .eq('empresa_id', empresa?.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFormasCobranca(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar formas de cobrança:', error);
    }
  };

  const fetchTipos = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('tipos_produtos')
        .select('*')
        .eq('empresa_id', empresa?.id)
        .order('nome');

      if (error) throw error;
      setTipos(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar tipos:', error);
    }
  };

  const fetchNaturezas = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('naturezas_produtos')
        .select('*')
        .eq('empresa_id', empresa?.id)
        .order('nome');

      if (error) throw error;
      setNaturezas(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar naturezas:', error);
    }
  };

  const fetchClassificacoes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('classificacoes_produtos')
        .select('*')
        .eq('empresa_id', empresa?.id)
        .order('nome');

      if (error) throw error;
      setClassificacoes(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar classificações:', error);
    }
  };

  const fetchTreinamentosCatalogo = async () => {
    if (!empresa?.id) return;
    
    try {
      // Verificar se a empresa tem o módulo Toriq Train
      const { data: modulosData, error: modulosError } = await (supabase as any)
        .from('empresas_modulos')
        .select('modulo_id, modulos(nome)')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true);
      
      if (modulosError) throw modulosError;
      
      const temToriqTrain = modulosData?.some((m: any) => 
        m.modulos?.nome?.toLowerCase().includes('toriq train') || 
        m.modulos?.nome?.toLowerCase().includes('gestão de treinamentos')
      );
      setTemModuloToriqTrain(temToriqTrain || false);
      
      // Se tem o módulo, carregar os treinamentos do catálogo
      if (temToriqTrain) {
        const { data, error } = await (supabase as any)
          .from('catalogo_treinamentos')
          .select('id, nome, norma, ch_formacao, ch_reciclagem')
          .eq('empresa_id', empresa.id)
          .order('nome');

        if (error) throw error;
        setTreinamentosCatalogo(data || []);
      }
    } catch (error: any) {
      console.error('Erro ao buscar treinamentos do catálogo:', error);
    }
  };

  const gerarCodigoAutomatico = (tipo: 'produto' | 'servico' = 'servico') => {
    const prefixo = tipo === 'produto' ? 'PROD' : 'SERV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const sequencial = (produtos.length + 1).toString().padStart(3, '0');
    return `${prefixo}-${timestamp}-${sequencial}`;
  };

  const resetProdutoForm = () => {
    setProdutoForm({
      nome: '',
      codigo: gerarCodigoAutomatico('servico'),
      preco: '',
      descricao: '',
      tipo: 'servico',
      tipo_id: '',
      forma_cobranca_id: '',
      categoria_id: '',
      natureza_id: '',
      classificacao_id: '',
      ativo: true,
      treinamento_id: '',
      formacao_reciclagem: '',
      carga_horaria: '',
      ch_formacao: '',
      ch_reciclagem: '',
      colaboradores_por_turma: '30',
    });
    setEditingProduto(null);
  };

  const resetFormaCobrancaForm = () => {
    setFormaCobrancaForm({
      nome: '',
      periodicidade: '1',
    });
    setEditingFormaCobranca(null);
  };

  const resetCategoriaForm = () => {
    setCategoriaForm({
      nome: '',
      descricao: '',
      cor: '#6366f1',
    });
    setEditingCategoria(null);
  };

  const resetPacoteForm = () => {
    setPacoteForm({
      nome: '',
      descricao: '',
      preco_fixo: '',
      forma_cobranca: 'por_produto',
      desconto_percentual: '0',
      produtosSelecionados: [],
    });
    setEditingPacote(null);
  };

  const resetTipoForm = () => {
    setTipoForm({
      nome: '',
      descricao: '',
    });
    setEditingTipo(null);
  };

  const resetNaturezaForm = () => {
    setNaturezaForm({
      nome: '',
      descricao: '',
    });
    setEditingNatureza(null);
  };

  const resetClassificacaoForm = () => {
    setClassificacaoForm({
      nome: '',
      descricao: '',
    });
    setEditingClassificacao(null);
  };

  const handleSaveTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tipoForm.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do tipo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tipoData = {
        empresa_id: empresa?.id,
        nome: tipoForm.nome,
        descricao: tipoForm.descricao || null,
        ativo: true,
      };

      if (editingTipo) {
        const { error } = await (supabase as any)
          .from('tipos_produtos')
          .update(tipoData)
          .eq('id', editingTipo.id);

        if (error) throw error;
        toast({ title: "Tipo atualizado com sucesso!" });
      } else {
        const { error } = await (supabase as any)
          .from('tipos_produtos')
          .insert(tipoData);

        if (error) throw error;
        toast({ title: "Tipo cadastrado com sucesso!" });
      }

      resetTipoForm();
      fetchTipos();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar tipo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditTipo = (tipo: TipoProduto) => {
    setTipoForm({
      nome: tipo.nome,
      descricao: tipo.descricao || '',
    });
    setEditingTipo(tipo);
  };

  const handleSaveNatureza = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!naturezaForm.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome da natureza é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const naturezaData = {
        empresa_id: empresa?.id,
        nome: naturezaForm.nome,
        descricao: naturezaForm.descricao || null,
        ativo: true,
      };

      if (editingNatureza) {
        const { error } = await (supabase as any)
          .from('naturezas_produtos')
          .update(naturezaData)
          .eq('id', editingNatureza.id);

        if (error) throw error;
        toast({ title: "Natureza atualizada com sucesso!" });
      } else {
        const { error } = await (supabase as any)
          .from('naturezas_produtos')
          .insert(naturezaData);

        if (error) throw error;
        toast({ title: "Natureza cadastrada com sucesso!" });
      }

      resetNaturezaForm();
      fetchNaturezas();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar natureza",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditNatureza = (natureza: Natureza) => {
    setNaturezaForm({
      nome: natureza.nome,
      descricao: natureza.descricao || '',
    });
    setEditingNatureza(natureza);
  };

  const handleSaveClassificacao = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!classificacaoForm.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome da classificação é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const classificacaoData = {
        empresa_id: empresa?.id,
        nome: classificacaoForm.nome,
        descricao: classificacaoForm.descricao || null,
        ativo: true,
      };

      if (editingClassificacao) {
        const { error } = await (supabase as any)
          .from('classificacoes_produtos')
          .update(classificacaoData)
          .eq('id', editingClassificacao.id);

        if (error) throw error;
        toast({ title: "Classificação atualizada com sucesso!" });
      } else {
        const { error } = await (supabase as any)
          .from('classificacoes_produtos')
          .insert(classificacaoData);

        if (error) throw error;
        toast({ title: "Classificação cadastrada com sucesso!" });
      }

      resetClassificacaoForm();
      fetchClassificacoes();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar classificação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditClassificacao = (classificacao: Classificacao) => {
    setClassificacaoForm({
      nome: classificacao.nome,
      descricao: classificacao.descricao || '',
    });
    setEditingClassificacao(classificacao);
  };

  const handleSaveProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!produtoForm.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do produto/serviço é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const produtoData = {
        empresa_id: empresa?.id,
        nome: produtoForm.nome,
        codigo: produtoForm.codigo || null,
        preco: produtoForm.preco ? parseFloat(produtoForm.preco) : null,
        descricao: produtoForm.descricao || null,
        tipo: produtoForm.tipo,
        tipo_id: produtoForm.tipo_id || null,
        forma_cobranca_id: produtoForm.forma_cobranca_id || null,
        categoria_id: produtoForm.categoria_id || null,
        natureza_id: produtoForm.natureza_id || null,
        classificacao_id: produtoForm.classificacao_id || null,
        treinamento_id: produtoForm.treinamento_id || null,
        ativo: produtoForm.ativo,
        carga_horaria: produtoForm.carga_horaria ? parseInt(produtoForm.carga_horaria) : null,
        ch_formacao: produtoForm.ch_formacao ? parseInt(produtoForm.ch_formacao) : null,
        ch_reciclagem: produtoForm.ch_reciclagem ? parseInt(produtoForm.ch_reciclagem) : null,
        colaboradores_por_turma: produtoForm.colaboradores_por_turma ? parseInt(produtoForm.colaboradores_por_turma) : 30,
      };

      if (editingProduto) {
        const { error } = await (supabase as any)
          .from('produtos_servicos')
          .update(produtoData)
          .eq('id', editingProduto.id);

        if (error) throw error;
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
        const { error } = await (supabase as any)
          .from('produtos_servicos')
          .insert(produtoData);

        if (error) throw error;
        toast({ title: "Produto cadastrado com sucesso!" });
      }

      setProdutoDialogOpen(false);
      resetProdutoForm();
      fetchProdutos();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveFormaCobranca = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formaCobrancaForm.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome da forma de cobrança é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const formaCobrancaData = {
        empresa_id: empresa?.id,
        nome: formaCobrancaForm.nome,
        periodicidade: formaCobrancaForm.periodicidade,
      };

      if (editingFormaCobranca) {
        const { error } = await (supabase as any)
          .from('formas_cobranca')
          .update(formaCobrancaData)
          .eq('id', editingFormaCobranca.id);

        if (error) throw error;
        toast({ title: "Forma de cobrança atualizada com sucesso!" });
      } else {
        const { error } = await (supabase as any)
          .from('formas_cobranca')
          .insert(formaCobrancaData);

        if (error) throw error;
        toast({ title: "Forma de cobrança cadastrada com sucesso!" });
      }

      resetFormaCobrancaForm();
      fetchFormasCobranca();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar forma de cobrança",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditFormaCobranca = (formaCobranca: FormaCobranca) => {
    setEditingFormaCobranca(formaCobranca);
    setFormaCobrancaForm({
      nome: formaCobranca.nome,
      periodicidade: formaCobranca.periodicidade,
    });
  };

  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoriaForm.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome da categoria é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const categoriaData = {
        empresa_id: empresa?.id,
        nome: categoriaForm.nome,
        descricao: categoriaForm.descricao || null,
        cor: categoriaForm.cor,
      };

      if (editingCategoria) {
        const { error } = await (supabase as any)
          .from('categorias_produtos')
          .update(categoriaData)
          .eq('id', editingCategoria.id);

        if (error) throw error;
        toast({ title: "Categoria atualizada com sucesso!" });
      } else {
        const { error } = await (supabase as any)
          .from('categorias_produtos')
          .insert(categoriaData);

        if (error) throw error;
        toast({ title: "Categoria cadastrada com sucesso!" });
      }

      setCategoriaDialogOpen(false);
      resetCategoriaForm();
      fetchCategorias();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSavePacote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pacoteForm.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do pacote é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (pacoteForm.produtosSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um produto para o pacote.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calcular preço total
      let precoTotal = 0;
      pacoteForm.produtosSelecionados.forEach(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        if (produto?.preco) {
          precoTotal += produto.preco * item.quantidade;
        }
      });

      const desconto = parseFloat(pacoteForm.desconto_percentual) || 0;
      precoTotal = precoTotal * (1 - desconto / 100);

      const precoFixo = pacoteForm.preco_fixo ? parseFloat(pacoteForm.preco_fixo) : null;
      const pacoteData = {
        empresa_id: empresa?.id,
        nome: pacoteForm.nome,
        descricao: pacoteForm.descricao || null,
        preco_total: precoFixo || precoTotal,
        preco_fixo: precoFixo,
        forma_cobranca: pacoteForm.forma_cobranca,
        desconto_percentual: desconto,
      };

      if (editingPacote) {
        const { error: pacoteError } = await (supabase as any)
          .from('pacotes_produtos')
          .update(pacoteData)
          .eq('id', editingPacote.id);

        if (pacoteError) throw pacoteError;

        // Remover itens antigos e adicionar novos
        await (supabase as any)
          .from('pacotes_produtos_itens')
          .delete()
          .eq('pacote_id', editingPacote.id);

        const { error: itensError } = await (supabase as any)
          .from('pacotes_produtos_itens')
          .insert(
            pacoteForm.produtosSelecionados.map(item => ({
              pacote_id: editingPacote.id,
              produto_id: item.produto_id,
              quantidade: item.quantidade,
            }))
          );

        if (itensError) throw itensError;
        toast({ title: "Pacote atualizado com sucesso!" });
      } else {
        const { data: novoPacote, error: pacoteError } = await (supabase as any)
          .from('pacotes_produtos')
          .insert(pacoteData)
          .select()
          .single();

        if (pacoteError) throw pacoteError;

        const { error: itensError } = await (supabase as any)
          .from('pacotes_produtos_itens')
          .insert(
            pacoteForm.produtosSelecionados.map(item => ({
              pacote_id: novoPacote.id,
              produto_id: item.produto_id,
              quantidade: item.quantidade,
            }))
          );

        if (itensError) throw itensError;
        toast({ title: "Pacote criado com sucesso!" });
      }

      setPacoteDialogOpen(false);
      resetPacoteForm();
      fetchPacotes();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar pacote",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      const tableNames: Record<string, string> = {
        produto: 'produtos_servicos',
        categoria: 'categorias_produtos',
        forma_cobranca: 'formas_cobranca',
        pacote: 'pacotes_produtos',
        tipo: 'tipos_produtos',
        natureza: 'naturezas_produtos',
        classificacao: 'classificacoes_produtos'
      };
      const tableName = tableNames[deletingItem.type];

      const { error } = await (supabase as any)
        .from(tableName)
        .delete()
        .eq('id', deletingItem.item.id);

      if (error) throw error;

      const typeLabels: Record<string, string> = {
        produto: 'Produto',
        categoria: 'Categoria',
        forma_cobranca: 'Forma de cobrança',
        pacote: 'Pacote',
        tipo: 'Tipo',
        natureza: 'Natureza',
        classificacao: 'Classificação'
      };
      toast({ title: `${typeLabels[deletingItem.type]} excluído com sucesso!` });
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditProduto = (produto: Produto) => {
    setEditingProduto(produto);
    setProdutoForm({
      nome: produto.nome,
      codigo: produto.codigo || '',
      preco: produto.preco?.toString() || '',
      descricao: produto.descricao || '',
      tipo: produto.tipo,
      tipo_id: (produto as any).tipo_id || '',
      forma_cobranca_id: produto.forma_cobranca_id || '',
      categoria_id: produto.categoria_id || '',
      natureza_id: produto.natureza_id || '',
      classificacao_id: produto.classificacao_id || '',
      ativo: produto.ativo,
      treinamento_id: (produto as any).treinamento_id || '',
      formacao_reciclagem: (produto as any).formacao_reciclagem || '',
      carga_horaria: produto.carga_horaria?.toString() || '',
      ch_formacao: produto.ch_formacao?.toString() || '',
      ch_reciclagem: produto.ch_reciclagem?.toString() || '',
      colaboradores_por_turma: (produto as any).colaboradores_por_turma?.toString() || '30',
    });
    setProdutoDialogOpen(true);
  };

  const openEditCategoria = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setCategoriaForm({
      nome: categoria.nome,
      descricao: categoria.descricao || '',
      cor: categoria.cor,
    });
    setCategoriaDialogOpen(true);
  };

  const openEditPacote = (pacote: Pacote) => {
    setEditingPacote(pacote);
    setPacoteForm({
      nome: pacote.nome,
      descricao: pacote.descricao || '',
      preco_fixo: pacote.preco_fixo?.toString() || '',
      forma_cobranca: pacote.forma_cobranca || 'por_produto',
      desconto_percentual: pacote.desconto_percentual?.toString() || '0',
      produtosSelecionados: pacote.itens?.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
      })) || [],
    });
    setPacoteDialogOpen(true);
  };

  const toggleProdutoNoPacote = (produtoId: string) => {
    const exists = pacoteForm.produtosSelecionados.find(p => p.produto_id === produtoId);
    if (exists) {
      setPacoteForm({
        ...pacoteForm,
        produtosSelecionados: pacoteForm.produtosSelecionados.filter(p => p.produto_id !== produtoId),
      });
    } else {
      setPacoteForm({
        ...pacoteForm,
        produtosSelecionados: [...pacoteForm.produtosSelecionados, { produto_id: produtoId, quantidade: 1 }],
      });
    }
  };

  const updateQuantidadePacote = (produtoId: string, quantidade: number) => {
    setPacoteForm({
      ...pacoteForm,
      produtosSelecionados: pacoteForm.produtosSelecionados.map(p =>
        p.produto_id === produtoId ? { ...p, quantidade: Math.max(1, quantidade) } : p
      ),
    });
  };

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.categoria?.nome && p.categoria.nome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campo de busca */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, categoria ou código"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-2">
        <ProdutosServicosImportExport
          produtos={produtos}
          categorias={categorias}
          tipos={tipos}
          formasCobranca={formasCobranca}
          naturezas={naturezas}
          classificacoes={classificacoes}
          treinamentos={treinamentosCatalogo}
          empresaId={empresa?.id || ''}
          onImportSuccess={fetchData}
        />
        <Button variant="outline" onClick={() => { resetClassificacaoForm(); setClassificacaoDialogOpen(true); }}>
          <Layers className="h-4 w-4 mr-2" />
          Classificação
        </Button>
        <Button variant="outline" onClick={() => { resetNaturezaForm(); setNaturezaDialogOpen(true); }}>
          <Tags className="h-4 w-4 mr-2" />
          Natureza
        </Button>
        <Button variant="outline" onClick={() => { resetTipoForm(); setTipoDialogOpen(true); }}>
          <Layers className="h-4 w-4 mr-2" />
          Tipo
        </Button>
        <Button variant="outline" onClick={() => { resetCategoriaForm(); setCategoriaDialogOpen(true); }}>
          <Tags className="h-4 w-4 mr-2" />
          Categorias
        </Button>
        <Button variant="outline" onClick={() => { resetFormaCobrancaForm(); setFormaCobrancaDialogOpen(true); }}>
          <CreditCard className="h-4 w-4 mr-2" />
          Forma de Cobrança
        </Button>
        <Button variant="outline" onClick={() => { resetPacoteForm(); setPacoteDialogOpen(true); }}>
          <Package className="h-4 w-4 mr-2" />
          Criar Pacote
        </Button>
        <Button onClick={() => { resetProdutoForm(); setProdutoDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* Tabela de Produtos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">#</TableHead>
                <TableHead>NOME</TableHead>
                <TableHead>CÓDIGO</TableHead>
                <TableHead>PREÇO</TableHead>
                <TableHead>CATEGORIA</TableHead>
                <TableHead>DESCRIÇÃO</TableHead>
                <TableHead>FORMA DE COBRANÇA</TableHead>
                <TableHead>DATA DE CADASTRO</TableHead>
                <TableHead className="text-right">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProdutos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhum produto ou serviço cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProdutos.map((produto, index) => (
                  <TableRow key={produto.id}>
                    <TableCell className="text-muted-foreground">{String(index + 1).padStart(2, '0')}</TableCell>
                    <TableCell className="font-medium text-primary">{produto.nome}</TableCell>
                    <TableCell>{produto.codigo || '-'}</TableCell>
                    <TableCell>{formatCurrency(produto.preco)}</TableCell>
                    <TableCell>
                      {produto.categoria ? (
                        <Badge 
                          variant="outline" 
                          style={{ borderColor: produto.categoria.cor, color: produto.categoria.cor }}
                        >
                          {produto.categoria.nome}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Sem categoria</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {produto.descricao ? (
                        <button
                          onClick={() => {
                            setDescricaoVisualizando({ nome: produto.nome, descricao: produto.descricao || '' });
                            setDescricaoDialogOpen(true);
                          }}
                          className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">Ver descrição</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem descrição</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {produto.forma_cobranca_obj ? (
                        <span>{produto.forma_cobranca_obj.nome}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(produto.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditProduto(produto)}
                          className="text-primary hover:text-primary"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setDeletingItem({ type: 'produto', item: produto }); setDeleteDialogOpen(true); }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Produto */}
      <Dialog open={produtoDialogOpen} onOpenChange={(open) => { setProdutoDialogOpen(open); if (!open) resetProdutoForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduto ? 'Editar Produto/Serviço' : 'Novo Produto/Serviço'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProduto} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Tipo - Primeiro campo */}
              <div className="col-span-2 space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={produtoForm.tipo_id || "none"}
                  onValueChange={(value) => {
                    const tipoSelecionado = tipos.find(t => t.id === value);
                    const isTreinamento = tipoSelecionado?.nome.toLowerCase().includes('treinamento');
                    setProdutoForm({ 
                      ...produtoForm, 
                      tipo_id: value === "none" ? "" : value,
                      // Limpar campos de treinamento se não for treinamento
                      treinamento_id: isTreinamento ? produtoForm.treinamento_id : '',
                      ch_formacao: isTreinamento ? produtoForm.ch_formacao : '',
                      ch_reciclagem: isTreinamento ? produtoForm.ch_reciclagem : '',
                      nome: isTreinamento ? produtoForm.nome : produtoForm.nome,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione um tipo</SelectItem>
                    {tipos.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Treinamento do Catálogo - só aparece se tipo for Treinamento */}
              {tipos.find(t => t.id === produtoForm.tipo_id)?.nome.toLowerCase().includes('treinamento') && treinamentosCatalogo.length > 0 && (
                <div className="col-span-2 space-y-2">
                  <Label>Treinamento do Catálogo</Label>
                  <Select
                    value={produtoForm.treinamento_id || "none"}
                    onValueChange={(value) => {
                      const treinamento = treinamentosCatalogo.find(t => t.id === value);
                      if (treinamento) {
                        setProdutoForm({ 
                          ...produtoForm, 
                          treinamento_id: value,
                          nome: treinamento.nome,
                          ch_formacao: treinamento.ch_formacao?.toString() || '',
                          ch_reciclagem: treinamento.ch_reciclagem?.toString() || '',
                        });
                      } else {
                        setProdutoForm({ 
                          ...produtoForm, 
                          treinamento_id: '',
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o treinamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione um treinamento</SelectItem>
                      {[...treinamentosCatalogo]
                        .sort((a, b) => {
                          const normaA = a.norma || 'ZZZ';
                          const normaB = b.norma || 'ZZZ';
                          if (normaA !== normaB) return normaA.localeCompare(normaB);
                          return a.nome.localeCompare(b.nome);
                        })
                        .map((treinamento) => (
                        <SelectItem key={treinamento.id} value={treinamento.id}>
                          {treinamento.norma ? `${treinamento.norma} - ${treinamento.nome}` : treinamento.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Campo Nome - sempre editável */}
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={produtoForm.nome}
                  onChange={(e) => setProdutoForm({ ...produtoForm, nome: e.target.value })}
                  placeholder="Nome do produto ou serviço"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={produtoForm.codigo}
                  onChange={(e) => setProdutoForm({ ...produtoForm, codigo: e.target.value })}
                  placeholder="Automático"
                  readOnly={!editingProduto}
                  className={!editingProduto ? 'bg-muted' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={produtoForm.preco}
                  onChange={(e) => setProdutoForm({ ...produtoForm, preco: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Natureza</Label>
                <Select
                  value={produtoForm.tipo}
                  onValueChange={(value: 'produto' | 'servico') => setProdutoForm({ 
                    ...produtoForm, 
                    tipo: value,
                    codigo: editingProduto ? produtoForm.codigo : gerarCodigoAutomatico(value)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servico">Serviço</SelectItem>
                    <SelectItem value="produto">Produto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classificação</Label>
                <Select
                  value={produtoForm.classificacao_id || "none"}
                  onValueChange={(value) => setProdutoForm({ ...produtoForm, classificacao_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem classificação</SelectItem>
                    {classificacoes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={produtoForm.categoria_id || "none"}
                  onValueChange={(value) => setProdutoForm({ ...produtoForm, categoria_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                          {cat.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Forma de Cobrança</Label>
                <Select
                  value={produtoForm.forma_cobranca_id || "none"}
                  onValueChange={(value) => setProdutoForm({ ...produtoForm, forma_cobranca_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem forma de cobrança</SelectItem>
                    {formasCobranca.map((fc) => (
                      <SelectItem key={fc.id} value={fc.id}>
                        {fc.nome} ({parseInt(fc.periodicidade) === 0 ? 'Único' : `${fc.periodicidade} ${parseInt(fc.periodicidade) === 1 ? 'mês' : 'meses'}`})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Colaboradores por Turma</Label>
                <Input
                  type="number"
                  min="1"
                  value={produtoForm.colaboradores_por_turma}
                  onChange={(e) => setProdutoForm({ ...produtoForm, colaboradores_por_turma: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Descrição</Label>
                <div className="border rounded-md">
                  <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => document.execCommand('bold')}
                      title="Negrito"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => document.execCommand('italic')}
                      title="Itálico"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => document.execCommand('underline')}
                      title="Sublinhado"
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => document.execCommand('strikeThrough')}
                      title="Tachado"
                    >
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => document.execCommand('justifyLeft')}
                      title="Alinhar à esquerda"
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => document.execCommand('justifyCenter')}
                      title="Centralizar"
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => document.execCommand('justifyRight')}
                      title="Alinhar à direita"
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => document.execCommand('insertUnorderedList')}
                      title="Lista"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => document.execCommand('insertOrderedList')}
                      title="Lista numerada"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        const tableHtml = `<table style="border-collapse: collapse; width: 100%; margin: 8px 0;">
                          <tr>
                            <td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>
                            <td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>
                            <td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>
                          </tr>
                          <tr>
                            <td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>
                            <td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>
                            <td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>
                          </tr>
                        </table>`;
                        document.execCommand('insertHTML', false, tableHtml);
                      }}
                      title="Inserir tabela"
                    >
                      <Table2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        const url = prompt('Digite a URL da imagem:');
                        if (url) {
                          document.execCommand('insertHTML', false, `<img src="${url}" alt="Imagem" style="max-width: 100%; height: auto; margin: 8px 0;" />`);
                        }
                      }}
                      title="Inserir imagem"
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        const url = prompt('Digite a URL do link:');
                        if (url) {
                          const text = prompt('Digite o texto do link:', url);
                          document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" style="color: #6366f1; text-decoration: underline;">${text || url}</a>`);
                        }
                      }}
                      title="Inserir link"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div
                    contentEditable
                    className="min-h-[100px] p-3 focus:outline-none text-sm"
                    dangerouslySetInnerHTML={{ __html: produtoForm.descricao }}
                    onBlur={(e) => setProdutoForm({ ...produtoForm, descricao: e.currentTarget.innerHTML })}
                    onInput={(e) => setProdutoForm({ ...produtoForm, descricao: e.currentTarget.innerHTML })}
                    data-placeholder="Descreva especificações ou coloque imagens do produto..."
                    style={{ minHeight: '100px' }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setProdutoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingProduto ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Categoria */}
      <Dialog open={categoriaDialogOpen} onOpenChange={(open) => { setCategoriaDialogOpen(open); if (!open) resetCategoriaForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
          </DialogHeader>
          
          {/* Formulário de Nova Categoria primeiro */}
          <div className="space-y-4">
            <h4 className="font-medium">{editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}</h4>
            <form onSubmit={handleSaveCategoria} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={categoriaForm.nome}
                  onChange={(e) => setCategoriaForm({ ...categoriaForm, nome: e.target.value })}
                  placeholder="Nome da categoria"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={categoriaForm.descricao}
                  onChange={(e) => setCategoriaForm({ ...categoriaForm, descricao: e.target.value })}
                  placeholder="Descrição da categoria"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={categoriaForm.cor}
                    onChange={(e) => setCategoriaForm({ ...categoriaForm, cor: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={categoriaForm.cor}
                    onChange={(e) => setCategoriaForm({ ...categoriaForm, cor: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {editingCategoria && (
                  <Button type="button" variant="outline" onClick={resetCategoriaForm}>
                    Cancelar Edição
                  </Button>
                )}
                <Button type="submit">
                  {editingCategoria ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </div>

          {/* Lista de categorias existentes depois */}
          {categorias.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Categorias Cadastradas</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categorias.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.cor }} />
                      <span>{cat.nome}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditCategoria(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { setDeletingItem({ type: 'categoria', item: cat }); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Tipo */}
      <Dialog open={tipoDialogOpen} onOpenChange={(open) => { setTipoDialogOpen(open); if (!open) resetTipoForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Tipos</DialogTitle>
          </DialogHeader>
          
          {/* Formulário de Novo Tipo primeiro */}
          <div className="space-y-4">
            <h4 className="font-medium">{editingTipo ? 'Editar Tipo' : 'Novo Tipo'}</h4>
            <form onSubmit={handleSaveTipo} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={tipoForm.nome}
                  onChange={(e) => setTipoForm({ ...tipoForm, nome: e.target.value })}
                  placeholder="Nome do tipo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={tipoForm.descricao}
                  onChange={(e) => setTipoForm({ ...tipoForm, descricao: e.target.value })}
                  placeholder="Descrição do tipo"
                />
              </div>
              <div className="flex justify-end gap-2">
                {editingTipo && (
                  <Button type="button" variant="outline" onClick={resetTipoForm}>
                    Cancelar Edição
                  </Button>
                )}
                <Button type="submit">
                  {editingTipo ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </div>

          {/* Lista de tipos existentes depois */}
          {tipos.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Tipos Cadastrados</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tipos.map((tipo) => (
                  <div key={tipo.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span>{tipo.nome}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditTipo(tipo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { setDeletingItem({ type: 'tipo', item: tipo }); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Forma de Cobrança */}
      <Dialog open={formaCobrancaDialogOpen} onOpenChange={(open) => { setFormaCobrancaDialogOpen(open); if (!open) resetFormaCobrancaForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Formas de Cobrança</DialogTitle>
          </DialogHeader>
          
          {/* Formulário de Nova Forma de Cobrança primeiro */}
          <div className="space-y-4">
            <h4 className="font-medium">{editingFormaCobranca ? 'Editar Forma de Cobrança' : 'Nova Forma de Cobrança'}</h4>
            <form onSubmit={handleSaveFormaCobranca} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formaCobrancaForm.nome}
                  onChange={(e) => setFormaCobrancaForm({ ...formaCobrancaForm, nome: e.target.value })}
                  placeholder="Ex: Mensal, Anual, Por Serviço"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Periodicidade (Por mês) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formaCobrancaForm.periodicidade}
                  onChange={(e) => setFormaCobrancaForm({ ...formaCobrancaForm, periodicidade: e.target.value })}
                  placeholder="Ex: 0 = Único, 1 = Mensal, 12 = Anual"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  0 = Cobrança única (por produto), 1 = Mensal, 3 = Trimestral, 6 = Semestral, 12 = Anual
                </p>
              </div>
              <div className="flex justify-end gap-2">
                {editingFormaCobranca && (
                  <Button type="button" variant="outline" onClick={resetFormaCobrancaForm}>
                    Cancelar Edição
                  </Button>
                )}
                <Button type="submit">
                  {editingFormaCobranca ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </div>

          {/* Lista de formas de cobrança existentes */}
          {formasCobranca.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Formas de Cobrança Cadastradas</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formasCobranca.map((fc) => (
                  <div key={fc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex flex-col">
                      <span className="font-medium">{fc.nome}</span>
                      <span className="text-sm text-muted-foreground">Periodicidade: {parseInt(fc.periodicidade) === 0 ? 'Cobrança única' : `${fc.periodicidade} ${parseInt(fc.periodicidade) === 1 ? 'mês' : 'meses'}`}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditFormaCobranca(fc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { setDeletingItem({ type: 'forma_cobranca', item: fc }); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Pacote */}
      <Dialog open={pacoteDialogOpen} onOpenChange={(open) => { setPacoteDialogOpen(open); if (!open) resetPacoteForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPacote ? 'Editar Pacote' : 'Criar Pacote de Produtos e Serviços'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePacote} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome do Pacote *</Label>
                <Input
                  value={pacoteForm.nome}
                  onChange={(e) => setPacoteForm({ ...pacoteForm, nome: e.target.value })}
                  placeholder="Ex: Pacote Completo SST"
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={pacoteForm.descricao}
                  onChange={(e) => setPacoteForm({ ...pacoteForm, descricao: e.target.value })}
                  placeholder="Descrição do pacote"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço do Pacote</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pacoteForm.preco_fixo}
                  onChange={(e) => setPacoteForm({ ...pacoteForm, preco_fixo: e.target.value })}
                  placeholder="Deixe vazio para calcular automaticamente"
                />
              </div>
              <div className="space-y-2">
                <Label>Forma de Cobrança</Label>
                <Select
                  value={pacoteForm.forma_cobranca}
                  onValueChange={(value) => setPacoteForm({ ...pacoteForm, forma_cobranca: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="por_produto">Por Produto/Serviço</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="bienal">Bienal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={pacoteForm.desconto_percentual}
                  onChange={(e) => setPacoteForm({ ...pacoteForm, desconto_percentual: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Selecione os Produtos/Serviços</Label>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {produtos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum produto cadastrado
                  </p>
                ) : (
                  produtos.filter(p => p.ativo).map((produto) => {
                    const selecionado = pacoteForm.produtosSelecionados.find(p => p.produto_id === produto.id);
                    return (
                      <div key={produto.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={!!selecionado}
                            onCheckedChange={() => toggleProdutoNoPacote(produto.id)}
                          />
                          <div>
                            <p className="font-medium">{produto.nome}</p>
                            <p className="text-sm text-muted-foreground">{formatCurrency(produto.preco)}</p>
                          </div>
                        </div>
                        {selecionado && (
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Qtd:</Label>
                            <Input
                              type="number"
                              min="1"
                              value={selecionado.quantidade}
                              onChange={(e) => updateQuantidadePacote(produto.id, parseInt(e.target.value) || 1)}
                              className="w-20"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {pacoteForm.produtosSelecionados.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium">Resumo do Pacote:</p>
                <p className="text-sm text-muted-foreground">
                  {pacoteForm.produtosSelecionados.length} item(ns) selecionado(s)
                </p>
                <p className="text-lg font-bold mt-2">
                  Total: {formatCurrency(
                    pacoteForm.produtosSelecionados.reduce((acc, item) => {
                      const produto = produtos.find(p => p.id === item.produto_id);
                      return acc + (produto?.preco || 0) * item.quantidade;
                    }, 0) * (1 - (parseFloat(pacoteForm.desconto_percentual) || 0) / 100)
                  )}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPacoteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPacote ? 'Salvar' : 'Criar Pacote'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Natureza */}
      <Dialog open={naturezaDialogOpen} onOpenChange={(open) => { setNaturezaDialogOpen(open); if (!open) resetNaturezaForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNatureza ? 'Editar Natureza' : 'Nova Natureza'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveNatureza} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={naturezaForm.nome}
                onChange={(e) => setNaturezaForm({ ...naturezaForm, nome: e.target.value })}
                placeholder="Nome da natureza"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={naturezaForm.descricao}
                onChange={(e) => setNaturezaForm({ ...naturezaForm, descricao: e.target.value })}
                placeholder="Descrição (opcional)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNaturezaDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingNatureza ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
          {/* Lista de Naturezas */}
          {naturezas.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-2">Naturezas cadastradas:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {naturezas.map((natureza) => (
                  <div key={natureza.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{natureza.nome}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditNatureza(natureza)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setDeletingItem({ type: 'natureza', item: natureza }); setDeleteDialogOpen(true); }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Classificação */}
      <Dialog open={classificacaoDialogOpen} onOpenChange={(open) => { setClassificacaoDialogOpen(open); if (!open) resetClassificacaoForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClassificacao ? 'Editar Classificação' : 'Nova Classificação'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveClassificacao} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={classificacaoForm.nome}
                onChange={(e) => setClassificacaoForm({ ...classificacaoForm, nome: e.target.value })}
                placeholder="Nome da classificação"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={classificacaoForm.descricao}
                onChange={(e) => setClassificacaoForm({ ...classificacaoForm, descricao: e.target.value })}
                placeholder="Descrição (opcional)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setClassificacaoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingClassificacao ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
          {/* Lista de Classificações */}
          {classificacoes.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-2">Classificações cadastradas:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {classificacoes.map((classificacao) => (
                  <div key={classificacao.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{classificacao.nome}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditClassificacao(classificacao)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setDeletingItem({ type: 'classificacao', item: classificacao }); setDeleteDialogOpen(true); }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingItem?.item?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingItem(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Visualizar Descrição */}
      <Dialog open={descricaoDialogOpen} onOpenChange={setDescricaoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Descrição do produto/serviço</DialogTitle>
          </DialogHeader>
          {descricaoVisualizando && (
            <div className="space-y-4">
              <div className="font-medium text-lg">{descricaoVisualizando.nome}</div>
              <div 
                className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/20"
                dangerouslySetInnerHTML={{ __html: descricaoVisualizando.descricao }}
              />
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setDescricaoDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lista de Pacotes */}
      {pacotes.length > 0 && (
        <Card>
          <CardHeader>
            <h4 className="font-semibold">Pacotes Criados</h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pacotes.map((pacote) => (
                <div key={pacote.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{pacote.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {pacote.itens?.length || 0} item(ns) • {formatCurrency(pacote.preco_total)}
                      {pacote.desconto_percentual > 0 && ` (${pacote.desconto_percentual}% desconto)`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditPacote(pacote)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { setDeletingItem({ type: 'pacote', item: pacote }); setDeleteDialogOpen(true); }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
