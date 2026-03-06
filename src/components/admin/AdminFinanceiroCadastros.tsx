import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaEfetiva } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  CreditCard,
  Tags,
  Wallet,
  Landmark,
  Receipt,
  FileText,
  Save,
  X,
  ChevronDown,
  TrendingUp,
  DollarSign,
  Banknote,
  PiggyBank,
  Info,
} from 'lucide-react';

// Interfaces
interface CentroCusto {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'receita' | 'despesa' | 'ambos';
  ativo: boolean;
  created_at: string;
}

interface FormaPagamento {
  id: string;
  nome: string;
  descricao: string;
  taxa_percentual: number;
  dias_recebimento: number;
  ativo: boolean;
  created_at: string;
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
  created_at: string;
}

interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
  icone: string;
  ativo: boolean;
  created_at: string;
}

interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj_cpf: string;
  email: string;
  telefone: string;
  endereco: string;
  observacoes: string;
  classificacao_despesa_padrao?: string;
  descricao_despesa_padrao?: string;
  ativo: boolean;
  created_at: string;
}

interface PlanoReceita {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'receitas_operacionais' | 'outras_receitas_operacionais' | 'receitas_financeiras' | 'receitas_nao_operacionais';
  ativo: boolean;
  created_at: string;
}

interface PlanoDespesa {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'deducoes_sobre_vendas' | 'custo_servico_prestado' | 'despesas_administrativas' | 'despesas_estrutura' | 'despesas_pessoal' | 'despesas_comerciais' | 'despesas_financeiras' | 'despesas_nao_operacional' | 'impostos' | 'participacao_dividendos';
  ativo: boolean;
  created_at: string;
}

interface CondicaoPagamento {
  id: string;
  nome: string;
  descricao: string;
  parcelas: number;
  intervalo_dias: number;
  entrada_percentual: number;
  ativo: boolean;
  created_at: string;
}

// Dados iniciais vazios (serão carregados do Supabase)
const initialCentrosCusto: CentroCusto[] = [];
const initialFormasPagamento: FormaPagamento[] = [];
const initialContasBancarias: ContaBancaria[] = [];
const initialCategorias: CategoriaFinanceira[] = [];
const initialFornecedores: Fornecedor[] = [];
const initialPlanoReceitas: PlanoReceita[] = [];
const initialPlanoDespesas: PlanoDespesa[] = [];

const tiposReceita = [
  { value: 'receitas_operacionais', label: 'Receitas Operacionais', icon: TrendingUp, color: 'text-green-600' },
  { value: 'outras_receitas_operacionais', label: 'Outras Receitas Operacionais', icon: DollarSign, color: 'text-blue-600' },
  { value: 'receitas_financeiras', label: 'Receitas Financeiras', icon: Banknote, color: 'text-purple-600' },
  { value: 'receitas_nao_operacionais', label: 'Receitas não Operacionais', icon: PiggyBank, color: 'text-orange-600' },
];

const tiposDespesa = [
  { value: 'deducoes_sobre_vendas', label: 'Deduções sobre Vendas', icon: Receipt, color: 'text-red-600' },
  { value: 'custo_servico_prestado', label: 'Custo de Serviço Prestado', icon: FileText, color: 'text-orange-600' },
  { value: 'despesas_administrativas', label: 'Despesas Administrativas', icon: Building2, color: 'text-blue-600' },
  { value: 'despesas_estrutura', label: 'Despesas com Estrutura', icon: Landmark, color: 'text-purple-600' },
  { value: 'despesas_pessoal', label: 'Despesas com Pessoal', icon: Tags, color: 'text-green-600' },
  { value: 'despesas_comerciais', label: 'Despesas Comerciais', icon: CreditCard, color: 'text-cyan-600' },
  { value: 'despesas_financeiras', label: 'Despesas Financeiras', icon: Banknote, color: 'text-yellow-600' },
  { value: 'despesas_nao_operacional', label: 'Despesas Não Operacional', icon: Wallet, color: 'text-pink-600' },
  { value: 'impostos', label: 'Impostos', icon: DollarSign, color: 'text-red-500' },
  { value: 'participacao_dividendos', label: 'Participação e Dividendos', icon: PiggyBank, color: 'text-indigo-600' },
];

// ID fixo da empresa Toriq (vertical_on) - para admin_vertical
const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

export function AdminFinanceiroCadastros() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { getEmpresaIdEfetivo, empresaIdEfetivo, isInEmpresaMode } = useEmpresaEfetiva();
  
  // Obter empresa_id efetivo:
  // 1. Se estiver no modo empresa, usa o empresaIdEfetivo
  // 2. Se for admin_vertical sem modo empresa, usa TORIQ_EMPRESA_ID
  // 3. Caso contrário, usa o empresa_id do profile
  const empresaId = isInEmpresaMode 
    ? empresaIdEfetivo 
    : (profile?.role === 'admin_vertical' ? TORIQ_EMPRESA_ID : profile?.empresa_id);
  
  const [activeTab, setActiveTab] = useState('centros-custo');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingReceitas, setLoadingReceitas] = useState(false);
  const [loadingDespesas, setLoadingDespesas] = useState(false);
  
  // Estados para cada tipo de cadastro
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>(initialCentrosCusto);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>(initialFormasPagamento);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>(initialContasBancarias);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>(initialCategorias);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(initialFornecedores);
  const [planoReceitas, setPlanoReceitas] = useState<PlanoReceita[]>(initialPlanoReceitas);
  const [planoDespesas, setPlanoDespesas] = useState<PlanoDespesa[]>(initialPlanoDespesas);
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([]);
  const [loadingCondicoes, setLoadingCondicoes] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
  // Estados para modais
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Estados para formulários
  const [formCentroCusto, setFormCentroCusto] = useState<Partial<CentroCusto>>({});
  const [formFormaPagamento, setFormFormaPagamento] = useState<Partial<FormaPagamento>>({});
  const [formContaBancaria, setFormContaBancaria] = useState<Partial<ContaBancaria>>({});
  const [formCategoria, setFormCategoria] = useState<Partial<CategoriaFinanceira>>({});
  const [formFornecedor, setFormFornecedor] = useState<Partial<Fornecedor>>({});
  const [formPlanoReceita, setFormPlanoReceita] = useState<Partial<PlanoReceita>>({});
  const [formPlanoDespesa, setFormPlanoDespesa] = useState<Partial<PlanoDespesa>>({});
  const [formCondicaoPagamento, setFormCondicaoPagamento] = useState<Partial<CondicaoPagamento>>({});
  const [currentTipoReceita, setCurrentTipoReceita] = useState<string>('');
  const [currentTipoDespesa, setCurrentTipoDespesa] = useState<string>('');

  // Carregar dados do Supabase
  const loadPlanoReceitas = async () => {
    if (!empresaId) return;
    setLoadingReceitas(true);
    try {
      const { data, error } = await (supabase as any)
        .from('plano_receitas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setPlanoReceitas(data.map((item: any) => ({
          id: item.id,
          nome: item.nome,
          descricao: item.descricao || '',
          tipo: item.tipo,
          ativo: item.ativo,
          created_at: item.created_at,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar plano de receitas:', error);
      toast({ title: 'Erro ao carregar receitas', variant: 'destructive' });
    } finally {
      setLoadingReceitas(false);
    }
  };

  const loadPlanoDespesas = async () => {
    if (!empresaId) return;
    setLoadingDespesas(true);
    try {
      const { data, error } = await (supabase as any)
        .from('plano_despesas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setPlanoDespesas(data.map((item: any) => ({
          id: item.id,
          nome: item.nome,
          descricao: item.descricao || '',
          tipo: item.tipo,
          ativo: item.ativo,
          created_at: item.created_at,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar plano de despesas:', error);
      toast({ title: 'Erro ao carregar despesas', variant: 'destructive' });
    } finally {
      setLoadingDespesas(false);
    }
  };

  const loadCondicoesPagamento = async () => {
    if (!empresaId) return;
    setLoadingCondicoes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('condicoes_pagamento')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setCondicoesPagamento(data.map((item: any) => ({
          id: item.id,
          nome: item.nome,
          descricao: item.descricao || '',
          parcelas: item.parcelas,
          intervalo_dias: item.intervalo_dias,
          entrada_percentual: item.entrada_percentual || 0,
          ativo: item.ativo,
          created_at: item.created_at,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar condições de pagamento:', error);
      toast({ title: 'Erro ao carregar condições de pagamento', variant: 'destructive' });
    } finally {
      setLoadingCondicoes(false);
    }
  };

  const loadFornecedores = async () => {
    if (!empresaId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('fornecedores')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome_fantasia', { ascending: true });

      if (error) throw error;
      if (data) {
        setFornecedores(data.map((item: any) => ({
          id: item.id,
          razao_social: item.razao_social,
          nome_fantasia: item.nome_fantasia || '',
          cnpj_cpf: item.cnpj_cpf || '',
          email: item.email || '',
          telefone: item.telefone || '',
          endereco: item.endereco || '',
          observacoes: item.observacoes || '',
          classificacao_despesa_padrao: item.classificacao_despesa_padrao || '',
          descricao_despesa_padrao: item.descricao_despesa_padrao || '',
          ativo: item.ativo,
          created_at: item.created_at,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const loadContasBancarias = async () => {
    if (!empresaId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('contas_bancarias')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('banco', { ascending: true });

      if (error) throw error;
      if (data) {
        setContasBancarias(data.map((item: any) => ({
          id: item.id,
          banco: item.banco,
          agencia: item.agencia,
          conta: item.conta,
          tipo: item.tipo,
          descricao: item.descricao || '',
          saldo_inicial: item.saldo_inicial || 0,
          ativo: item.ativo,
          created_at: item.created_at,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar contas bancárias:', error);
    }
  };

  const loadCentrosCusto = async () => {
    if (!empresaId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('centros_custo')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true });

      if (error) throw error;
      if (data) {
        setCentrosCusto(data.map((item: any) => ({
          id: item.id,
          nome: item.nome,
          descricao: item.descricao || '',
          tipo: item.tipo,
          ativo: item.ativo,
          created_at: item.created_at,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar centros de custo:', error);
    }
  };

  const loadFormasPagamento = async () => {
    if (!empresaId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('formas_pagamento')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true });

      if (error) throw error;
      if (data) {
        setFormasPagamento(data.map((item: any) => ({
          id: item.id,
          nome: item.nome,
          descricao: item.descricao || '',
          taxa_percentual: item.taxa_percentual || 0,
          dias_recebimento: item.dias_recebimento || 0,
          ativo: item.ativo,
          created_at: item.created_at,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error);
    }
  };

  const handleSaveCentroCusto = async () => {
    if (!empresaId) {
      toast({ title: 'Erro: empresa não identificada', variant: 'destructive' });
      return;
    }

    if (!formCentroCusto.nome?.trim()) {
      toast({ title: 'Informe o nome do centro de custo', variant: 'destructive' });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await (supabase as any)
          .from('centros_custo')
          .update({
            nome: formCentroCusto.nome,
            descricao: formCentroCusto.descricao || null,
            tipo: formCentroCusto.tipo || 'ambos',
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        setCentrosCusto(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...formCentroCusto } : item
        ));
        toast({ title: 'Centro de custo atualizado!' });
      } else {
        const { data, error } = await (supabase as any)
          .from('centros_custo')
          .insert({
            empresa_id: empresaId,
            nome: formCentroCusto.nome,
            descricao: formCentroCusto.descricao || null,
            tipo: formCentroCusto.tipo || 'ambos',
            ativo: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCentrosCusto(prev => [...prev, {
            id: data.id,
            nome: data.nome,
            descricao: data.descricao || '',
            tipo: data.tipo,
            ativo: data.ativo,
            created_at: data.created_at,
          }]);
        }
        toast({ title: 'Centro de custo cadastrado!' });
      }

      setIsDialogOpen(false);
      resetForms();
    } catch (error) {
      console.error('Erro ao salvar centro de custo:', error);
      toast({ title: 'Erro ao salvar centro de custo', variant: 'destructive' });
    }
  };

  const handleDeleteCentroCusto = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('centros_custo')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCentrosCusto(prev => prev.filter(item => item.id !== id));
      toast({ title: 'Centro de custo excluído com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir centro de custo:', error);
      toast({ title: 'Erro ao excluir centro de custo', variant: 'destructive' });
    }
  };

  const handleSaveFormaPagamento = async () => {
    if (!empresaId) {
      toast({ title: 'Erro: empresa não identificada', variant: 'destructive' });
      return;
    }

    if (!formFormaPagamento.nome?.trim()) {
      toast({ title: 'Informe o nome da forma de pagamento', variant: 'destructive' });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await (supabase as any)
          .from('formas_pagamento')
          .update({
            nome: formFormaPagamento.nome,
            descricao: formFormaPagamento.descricao || null,
            taxa_percentual: formFormaPagamento.taxa_percentual || 0,
            dias_recebimento: formFormaPagamento.dias_recebimento || 0,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        setFormasPagamento(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...formFormaPagamento } : item
        ));
        toast({ title: 'Forma de pagamento atualizada!' });
      } else {
        const { data, error } = await (supabase as any)
          .from('formas_pagamento')
          .insert({
            empresa_id: empresaId,
            nome: formFormaPagamento.nome,
            descricao: formFormaPagamento.descricao || null,
            taxa_percentual: formFormaPagamento.taxa_percentual || 0,
            dias_recebimento: formFormaPagamento.dias_recebimento || 0,
            ativo: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setFormasPagamento(prev => [...prev, {
            id: data.id,
            nome: data.nome,
            descricao: data.descricao || '',
            taxa_percentual: data.taxa_percentual || 0,
            dias_recebimento: data.dias_recebimento || 0,
            ativo: data.ativo,
            created_at: data.created_at,
          }]);
        }
        toast({ title: 'Forma de pagamento cadastrada!' });
      }

      setIsDialogOpen(false);
      resetForms();
    } catch (error) {
      console.error('Erro ao salvar forma de pagamento:', error);
      toast({ title: 'Erro ao salvar forma de pagamento', variant: 'destructive' });
    }
  };

  const handleDeleteFormaPagamento = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('formas_pagamento')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFormasPagamento(prev => prev.filter(item => item.id !== id));
      toast({ title: 'Forma de pagamento excluída com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir forma de pagamento:', error);
      toast({ title: 'Erro ao excluir forma de pagamento', variant: 'destructive' });
    }
  };

  const handleSaveContaBancaria = async () => {
    if (!empresaId) {
      toast({ title: 'Erro: empresa não identificada', variant: 'destructive' });
      return;
    }

    if (!formContaBancaria.banco?.trim()) {
      toast({ title: 'Informe o nome do banco', variant: 'destructive' });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await (supabase as any)
          .from('contas_bancarias')
          .update({
            banco: formContaBancaria.banco,
            agencia: formContaBancaria.agencia || '',
            conta: formContaBancaria.conta || '',
            tipo: formContaBancaria.tipo || 'corrente',
            descricao: formContaBancaria.descricao || null,
            saldo_inicial: formContaBancaria.saldo_inicial || 0,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        setContasBancarias(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...formContaBancaria } : item
        ));
        toast({ title: 'Conta bancária atualizada!' });
      } else {
        const { data, error } = await (supabase as any)
          .from('contas_bancarias')
          .insert({
            empresa_id: empresaId,
            banco: formContaBancaria.banco,
            agencia: formContaBancaria.agencia || '',
            conta: formContaBancaria.conta || '',
            tipo: formContaBancaria.tipo || 'corrente',
            descricao: formContaBancaria.descricao || null,
            saldo_inicial: formContaBancaria.saldo_inicial || 0,
            ativo: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setContasBancarias(prev => [...prev, {
            id: data.id,
            banco: data.banco,
            agencia: data.agencia,
            conta: data.conta,
            tipo: data.tipo,
            descricao: data.descricao || '',
            saldo_inicial: data.saldo_inicial || 0,
            ativo: data.ativo,
            created_at: data.created_at,
          }]);
        }
        toast({ title: 'Conta bancária cadastrada!' });
      }

      setIsDialogOpen(false);
      resetForms();
    } catch (error) {
      console.error('Erro ao salvar conta bancária:', error);
      toast({ title: 'Erro ao salvar conta bancária', variant: 'destructive' });
    }
  };

  const handleDeleteContaBancaria = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('contas_bancarias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setContasBancarias(prev => prev.filter(item => item.id !== id));
      toast({ title: 'Conta bancária excluída com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir conta bancária:', error);
      toast({ title: 'Erro ao excluir conta bancária', variant: 'destructive' });
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    if (empresaId) {
      loadPlanoReceitas();
      loadPlanoDespesas();
      loadCondicoesPagamento();
      loadFornecedores();
      loadContasBancarias();
      loadCentrosCusto();
      loadFormasPagamento();
    }
  }, [empresaId]);

  // Funções de CRUD genéricas
  const handleAdd = () => {
    setEditingItem(null);
    resetForms();
    setIsDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    switch (activeTab) {
      case 'centros-custo':
        setFormCentroCusto(item);
        break;
      case 'formas-pagamento':
        setFormFormaPagamento(item);
        break;
      case 'contas-bancarias':
        setFormContaBancaria(item);
        break;
      case 'categorias':
        setFormCategoria(item);
        break;
      case 'fornecedores':
        setFormFornecedor(item);
        break;
      case 'plano-receitas':
        setFormPlanoReceita(item);
        break;
      case 'condicoes-pagamento':
        setFormCondicaoPagamento(item);
        break;
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    switch (activeTab) {
      case 'centros-custo':
        handleDeleteCentroCusto(id);
        return;
      case 'formas-pagamento':
        handleDeleteFormaPagamento(id);
        return;
      case 'contas-bancarias':
        handleDeleteContaBancaria(id);
        return;
      case 'categorias':
        setCategorias(prev => prev.filter(item => item.id !== id));
        break;
      case 'fornecedores':
        handleDeleteFornecedor(id);
        return;
      case 'plano-receitas':
        setPlanoReceitas(prev => prev.filter(item => item.id !== id));
        break;
      case 'condicoes-pagamento':
        handleDeleteCondicaoPagamento(id);
        return;
    }
    toast({ title: 'Item excluído com sucesso!' });
  };

  const handleSave = () => {
    const newId = Date.now().toString();
    const now = new Date().toISOString();

    switch (activeTab) {
      case 'centros-custo':
        if (editingItem) {
          setCentrosCusto(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formCentroCusto } : item));
        } else {
          setCentrosCusto(prev => [...prev, { ...formCentroCusto, id: newId, ativo: true, created_at: now } as CentroCusto]);
        }
        break;
      case 'formas-pagamento':
        if (editingItem) {
          setFormasPagamento(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formFormaPagamento } : item));
        } else {
          setFormasPagamento(prev => [...prev, { ...formFormaPagamento, id: newId, ativo: true, created_at: now } as FormaPagamento]);
        }
        break;
      case 'contas-bancarias':
        handleSaveContaBancaria();
        return;
      case 'categorias':
        if (editingItem) {
          setCategorias(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formCategoria } : item));
        } else {
          setCategorias(prev => [...prev, { ...formCategoria, id: newId, ativo: true, created_at: now } as CategoriaFinanceira]);
        }
        break;
      case 'fornecedores':
        if (editingItem) {
          setFornecedores(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formFornecedor } : item));
        } else {
          setFornecedores(prev => [...prev, { ...formFornecedor, id: newId, ativo: true, created_at: now } as Fornecedor]);
        }
        break;
      case 'plano-receitas':
        if (editingItem) {
          setPlanoReceitas(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formPlanoReceita } : item));
        } else {
          setPlanoReceitas(prev => [...prev, { ...formPlanoReceita, id: newId, ativo: true, created_at: now } as PlanoReceita]);
        }
        break;
      case 'condicoes-pagamento':
        if (editingItem) {
          setCondicoesPagamento(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formCondicaoPagamento } : item));
        } else {
          setCondicoesPagamento(prev => [...prev, { ...formCondicaoPagamento, id: newId, ativo: true, created_at: now } as CondicaoPagamento]);
        }
        break;
    }

    toast({ title: editingItem ? 'Item atualizado!' : 'Item cadastrado!' });
    setIsDialogOpen(false);
    resetForms();
  };

  const resetForms = () => {
    setFormCentroCusto({});
    setFormFormaPagamento({});
    setFormContaBancaria({});
    setFormCategoria({});
    setFormFornecedor({});
    setFormPlanoReceita({});
    setFormPlanoDespesa({});
    setFormCondicaoPagamento({});
    setCurrentTipoReceita('');
    setCurrentTipoDespesa('');
  };

  // Funções específicas para Plano de Receitas
  const handleAddPlanoReceita = (tipo: string) => {
    setEditingItem(null);
    setFormPlanoReceita({ tipo: tipo as PlanoReceita['tipo'] });
    setCurrentTipoReceita(tipo);
    setIsDialogOpen(true);
  };

  const handleEditPlanoReceita = (item: PlanoReceita) => {
    setEditingItem(item);
    setFormPlanoReceita(item);
    setCurrentTipoReceita(item.tipo);
    setIsDialogOpen(true);
  };

  const handleDeletePlanoReceita = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('plano_receitas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPlanoReceitas(prev => prev.filter(item => item.id !== id));
      toast({ title: 'Item excluído com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir receita:', error);
      toast({ title: 'Erro ao excluir item', variant: 'destructive' });
    }
  };

  const handleSavePlanoReceita = async () => {
    if (!empresaId) {
      toast({ title: 'Erro: empresa não identificada', variant: 'destructive' });
      return;
    }

    try {
      if (editingItem) {
        // Atualizar
        const { error } = await (supabase as any)
          .from('plano_receitas')
          .update({
            nome: formPlanoReceita.nome,
            descricao: formPlanoReceita.descricao || null,
            tipo: formPlanoReceita.tipo,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        setPlanoReceitas(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...formPlanoReceita } : item
        ));
        toast({ title: 'Item atualizado!' });
      } else {
        // Criar novo
        const { data, error } = await (supabase as any)
          .from('plano_receitas')
          .insert({
            empresa_id: empresaId,
            nome: formPlanoReceita.nome,
            descricao: formPlanoReceita.descricao || null,
            tipo: formPlanoReceita.tipo,
            ativo: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setPlanoReceitas(prev => [...prev, {
            id: data.id,
            nome: data.nome,
            descricao: data.descricao || '',
            tipo: data.tipo,
            ativo: data.ativo,
            created_at: data.created_at,
          }]);
        }
        toast({ title: 'Item cadastrado!' });
      }

      setIsDialogOpen(false);
      resetForms();
    } catch (error) {
      console.error('Erro ao salvar receita:', error);
      toast({ title: 'Erro ao salvar item', variant: 'destructive' });
    }
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const getReceitasByTipo = (tipo: string) => {
    return planoReceitas.filter(item => item.tipo === tipo);
  };

  // Funções específicas para Plano de Despesas
  const handleAddPlanoDespesa = (tipo: string) => {
    setEditingItem(null);
    setFormPlanoDespesa({ tipo: tipo as PlanoDespesa['tipo'] });
    setCurrentTipoDespesa(tipo);
    setIsDialogOpen(true);
  };

  const handleEditPlanoDespesa = (item: PlanoDespesa) => {
    setEditingItem(item);
    setFormPlanoDespesa(item);
    setCurrentTipoDespesa(item.tipo);
    setIsDialogOpen(true);
  };

  const handleDeletePlanoDespesa = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('plano_despesas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPlanoDespesas(prev => prev.filter(item => item.id !== id));
      toast({ title: 'Item excluído com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      toast({ title: 'Erro ao excluir item', variant: 'destructive' });
    }
  };

  const handleSavePlanoDespesa = async () => {
    if (!empresaId) {
      toast({ title: 'Erro: empresa não identificada', variant: 'destructive' });
      return;
    }

    try {
      if (editingItem) {
        // Atualizar
        const { error } = await (supabase as any)
          .from('plano_despesas')
          .update({
            nome: formPlanoDespesa.nome,
            descricao: formPlanoDespesa.descricao || null,
            tipo: formPlanoDespesa.tipo,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        setPlanoDespesas(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...formPlanoDespesa } : item
        ));
        toast({ title: 'Item atualizado!' });
      } else {
        // Criar novo
        const { data, error } = await (supabase as any)
          .from('plano_despesas')
          .insert({
            empresa_id: empresaId,
            nome: formPlanoDespesa.nome,
            descricao: formPlanoDespesa.descricao || null,
            tipo: formPlanoDespesa.tipo,
            ativo: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setPlanoDespesas(prev => [...prev, {
            id: data.id,
            nome: data.nome,
            descricao: data.descricao || '',
            tipo: data.tipo,
            ativo: data.ativo,
            created_at: data.created_at,
          }]);
        }
        toast({ title: 'Item cadastrado!' });
      }

      setIsDialogOpen(false);
      resetForms();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      toast({ title: 'Erro ao salvar item', variant: 'destructive' });
    }
  };

  const getDespesasByTipo = (tipo: string) => {
    return planoDespesas.filter(item => item.tipo === tipo);
  };

  // Funções específicas para Condições de Pagamento
  const handleAddCondicaoPagamento = () => {
    setEditingItem(null);
    setFormCondicaoPagamento({ parcelas: 1, intervalo_dias: 30, entrada_percentual: 0 });
    setIsDialogOpen(true);
  };

  const handleEditCondicaoPagamento = (item: CondicaoPagamento) => {
    setEditingItem(item);
    setFormCondicaoPagamento(item);
    setIsDialogOpen(true);
  };

  const handleDeleteCondicaoPagamento = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('condicoes_pagamento')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCondicoesPagamento(prev => prev.filter(item => item.id !== id));
      toast({ title: 'Condição excluída com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir condição:', error);
      toast({ title: 'Erro ao excluir condição', variant: 'destructive' });
    }
  };

  const handleSaveCondicaoPagamento = async () => {
    if (!empresaId) {
      toast({ title: 'Erro: empresa não identificada', variant: 'destructive' });
      return;
    }

    if (!formCondicaoPagamento.nome?.trim()) {
      toast({ title: 'Informe o nome da condição', variant: 'destructive' });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await (supabase as any)
          .from('condicoes_pagamento')
          .update({
            nome: formCondicaoPagamento.nome,
            descricao: formCondicaoPagamento.descricao || null,
            parcelas: formCondicaoPagamento.parcelas || 1,
            intervalo_dias: formCondicaoPagamento.intervalo_dias || 30,
            entrada_percentual: formCondicaoPagamento.entrada_percentual || 0,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        setCondicoesPagamento(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...formCondicaoPagamento } : item
        ));
        toast({ title: 'Condição atualizada!' });
      } else {
        const { data, error } = await (supabase as any)
          .from('condicoes_pagamento')
          .insert({
            empresa_id: empresaId,
            nome: formCondicaoPagamento.nome,
            descricao: formCondicaoPagamento.descricao || null,
            parcelas: formCondicaoPagamento.parcelas || 1,
            intervalo_dias: formCondicaoPagamento.intervalo_dias || 30,
            entrada_percentual: formCondicaoPagamento.entrada_percentual || 0,
            ativo: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCondicoesPagamento(prev => [...prev, {
            id: data.id,
            nome: data.nome,
            descricao: data.descricao || '',
            parcelas: data.parcelas,
            intervalo_dias: data.intervalo_dias,
            entrada_percentual: data.entrada_percentual || 0,
            ativo: data.ativo,
            created_at: data.created_at,
          }]);
        }
        toast({ title: 'Condição cadastrada!' });
      }

      setIsDialogOpen(false);
      resetForms();
    } catch (error) {
      console.error('Erro ao salvar condição:', error);
      toast({ title: 'Erro ao salvar condição', variant: 'destructive' });
    }
  };

  // Funções específicas para Fornecedores
  const handleAddFornecedor = () => {
    setEditingItem(null);
    setFormFornecedor({});
    setIsDialogOpen(true);
  };

  const handleEditFornecedor = (item: Fornecedor) => {
    setEditingItem(item);
    setFormFornecedor(item);
    setIsDialogOpen(true);
  };

  const handleDeleteFornecedor = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('fornecedores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFornecedores(prev => prev.filter(item => item.id !== id));
      toast({ title: 'Fornecedor excluído com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      toast({ title: 'Erro ao excluir fornecedor', variant: 'destructive' });
    }
  };

  const handleSaveFornecedor = async () => {
    if (!empresaId) {
      toast({ title: 'Erro: empresa não identificada', variant: 'destructive' });
      return;
    }

    if (!formFornecedor.razao_social?.trim()) {
      toast({ title: 'Informe a razão social', variant: 'destructive' });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await (supabase as any)
          .from('fornecedores')
          .update({
            razao_social: formFornecedor.razao_social,
            nome_fantasia: formFornecedor.nome_fantasia || null,
            cnpj_cpf: formFornecedor.cnpj_cpf || null,
            email: formFornecedor.email || null,
            telefone: formFornecedor.telefone || null,
            endereco: formFornecedor.endereco || null,
            observacoes: formFornecedor.observacoes || null,
            classificacao_despesa_padrao: formFornecedor.classificacao_despesa_padrao || null,
            descricao_despesa_padrao: formFornecedor.descricao_despesa_padrao || null,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        setFornecedores(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...formFornecedor } : item
        ));
        toast({ title: 'Fornecedor atualizado!' });
      } else {
        const { data, error } = await (supabase as any)
          .from('fornecedores')
          .insert({
            empresa_id: empresaId,
            razao_social: formFornecedor.razao_social,
            nome_fantasia: formFornecedor.nome_fantasia || null,
            cnpj_cpf: formFornecedor.cnpj_cpf || null,
            email: formFornecedor.email || null,
            telefone: formFornecedor.telefone || null,
            endereco: formFornecedor.endereco || null,
            observacoes: formFornecedor.observacoes || null,
            classificacao_despesa_padrao: formFornecedor.classificacao_despesa_padrao || null,
            descricao_despesa_padrao: formFornecedor.descricao_despesa_padrao || null,
            ativo: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setFornecedores(prev => [...prev, {
            id: data.id,
            razao_social: data.razao_social,
            nome_fantasia: data.nome_fantasia || '',
            cnpj_cpf: data.cnpj_cpf || '',
            email: data.email || '',
            telefone: data.telefone || '',
            endereco: data.endereco || '',
            observacoes: data.observacoes || '',
            ativo: data.ativo,
            created_at: data.created_at,
          }]);
        }
        toast({ title: 'Fornecedor cadastrado!' });
      }

      setIsDialogOpen(false);
      resetForms();
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      toast({ title: 'Erro ao salvar fornecedor', variant: 'destructive' });
    }
  };

  // Filtro de busca
  const filterItems = (items: any[], term: string) => {
    if (!term) return items;
    return items.filter(item => 
      Object.values(item).some(value => 
        String(value).toLowerCase().includes(term.toLowerCase())
      )
    );
  };

  // Renderização dos formulários
  const renderCentroCustoForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Nome</Label>
        <Input
          value={formCentroCusto.nome || ''}
          onChange={(e) => setFormCentroCusto(prev => ({ ...prev, nome: e.target.value }))}
          placeholder="Nome do centro de custo"
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          value={formCentroCusto.descricao || ''}
          onChange={(e) => setFormCentroCusto(prev => ({ ...prev, descricao: e.target.value }))}
          placeholder="Descrição"
        />
      </div>
      <div>
        <Label>Tipo</Label>
        <Select
          value={formCentroCusto.tipo || ''}
          onValueChange={(value) => setFormCentroCusto(prev => ({ ...prev, tipo: value as any }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="receita">Receita</SelectItem>
            <SelectItem value="despesa">Despesa</SelectItem>
            <SelectItem value="ambos">Ambos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderFormaPagamentoForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Nome</Label>
        <Input
          value={formFormaPagamento.nome || ''}
          onChange={(e) => setFormFormaPagamento(prev => ({ ...prev, nome: e.target.value }))}
          placeholder="Nome da forma de pagamento"
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          value={formFormaPagamento.descricao || ''}
          onChange={(e) => setFormFormaPagamento(prev => ({ ...prev, descricao: e.target.value }))}
          placeholder="Descrição"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Taxa (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={formFormaPagamento.taxa_percentual || ''}
            onChange={(e) => setFormFormaPagamento(prev => ({ ...prev, taxa_percentual: parseFloat(e.target.value) }))}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label>Dias para Recebimento</Label>
          <Input
            type="number"
            value={formFormaPagamento.dias_recebimento || ''}
            onChange={(e) => setFormFormaPagamento(prev => ({ ...prev, dias_recebimento: parseInt(e.target.value) }))}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );

  const renderContaBancariaForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Banco</Label>
        <Input
          value={formContaBancaria.banco || ''}
          onChange={(e) => setFormContaBancaria(prev => ({ ...prev, banco: e.target.value }))}
          placeholder="Nome do banco"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Agência</Label>
          <Input
            value={formContaBancaria.agencia || ''}
            onChange={(e) => setFormContaBancaria(prev => ({ ...prev, agencia: e.target.value }))}
            placeholder="0000-0"
          />
        </div>
        <div>
          <Label>Conta</Label>
          <Input
            value={formContaBancaria.conta || ''}
            onChange={(e) => setFormContaBancaria(prev => ({ ...prev, conta: e.target.value }))}
            placeholder="00000-0"
          />
        </div>
      </div>
      <div>
        <Label>Tipo</Label>
        <Select
          value={formContaBancaria.tipo || ''}
          onValueChange={(value) => setFormContaBancaria(prev => ({ ...prev, tipo: value as any }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="corrente">Conta Corrente</SelectItem>
            <SelectItem value="poupanca">Poupança</SelectItem>
            <SelectItem value="investimento">Investimento</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Descrição</Label>
        <Input
          value={formContaBancaria.descricao || ''}
          onChange={(e) => setFormContaBancaria(prev => ({ ...prev, descricao: e.target.value }))}
          placeholder="Descrição da conta"
        />
      </div>
      <div>
        <Label>Saldo Inicial (R$)</Label>
        <Input
          type="number"
          step="0.01"
          value={formContaBancaria.saldo_inicial || ''}
          onChange={(e) => setFormContaBancaria(prev => ({ ...prev, saldo_inicial: parseFloat(e.target.value) }))}
          placeholder="0.00"
        />
      </div>
    </div>
  );

  const renderCategoriaForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Nome</Label>
        <Input
          value={formCategoria.nome || ''}
          onChange={(e) => setFormCategoria(prev => ({ ...prev, nome: e.target.value }))}
          placeholder="Nome da categoria"
        />
      </div>
      <div>
        <Label>Tipo</Label>
        <Select
          value={formCategoria.tipo || ''}
          onValueChange={(value) => setFormCategoria(prev => ({ ...prev, tipo: value as any }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="receita">Receita</SelectItem>
            <SelectItem value="despesa">Despesa</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Cor</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={formCategoria.cor || '#000000'}
            onChange={(e) => setFormCategoria(prev => ({ ...prev, cor: e.target.value }))}
            className="w-16 h-10 p-1"
          />
          <Input
            value={formCategoria.cor || ''}
            onChange={(e) => setFormCategoria(prev => ({ ...prev, cor: e.target.value }))}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );

  const renderFornecedorForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Razão Social</Label>
        <Input
          value={formFornecedor.razao_social || ''}
          onChange={(e) => setFormFornecedor(prev => ({ ...prev, razao_social: e.target.value }))}
          placeholder="Razão social"
        />
      </div>
      <div>
        <Label>Nome Fantasia</Label>
        <Input
          value={formFornecedor.nome_fantasia || ''}
          onChange={(e) => setFormFornecedor(prev => ({ ...prev, nome_fantasia: e.target.value }))}
          placeholder="Nome fantasia"
        />
      </div>
      <div>
        <Label>CNPJ/CPF</Label>
        <Input
          value={formFornecedor.cnpj_cpf || ''}
          onChange={(e) => setFormFornecedor(prev => ({ ...prev, cnpj_cpf: e.target.value }))}
          placeholder="00.000.000/0000-00"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>E-mail</Label>
          <Input
            type="email"
            value={formFornecedor.email || ''}
            onChange={(e) => setFormFornecedor(prev => ({ ...prev, email: e.target.value }))}
            placeholder="email@exemplo.com"
          />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input
            value={formFornecedor.telefone || ''}
            onChange={(e) => setFormFornecedor(prev => ({ ...prev, telefone: e.target.value }))}
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>
      <div>
        <Label>Endereço</Label>
        <Input
          value={formFornecedor.endereco || ''}
          onChange={(e) => setFormFornecedor(prev => ({ ...prev, endereco: e.target.value }))}
          placeholder="Endereço completo"
        />
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea
          value={formFornecedor.observacoes || ''}
          onChange={(e) => setFormFornecedor(prev => ({ ...prev, observacoes: e.target.value }))}
          placeholder="Observações"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Label>Classificação de Despesa</Label>
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Classificações de Despesa e suas Despesas</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Classificação</TableHead>
                        <TableHead>Despesas Cadastradas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tiposDespesa.map(tipo => {
                        const despesasDoTipo = planoDespesas.filter(d => d.tipo === tipo.value);
                        return (
                          <TableRow key={tipo.value}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <tipo.icon className={`h-4 w-4 ${tipo.color}`} />
                                {tipo.label}
                              </div>
                            </TableCell>
                            <TableCell>
                              {despesasDoTipo.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {despesasDoTipo.map(d => (
                                    <Badge key={d.id} variant="secondary" className="text-xs">
                                      {d.nome}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Nenhuma despesa cadastrada</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          <Select 
            value={formFornecedor.classificacao_despesa_padrao || 'none'} 
            onValueChange={(v) => setFormFornecedor(prev => ({ ...prev, classificacao_despesa_padrao: v === 'none' ? '' : v, descricao_despesa_padrao: '' }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a classificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {tiposDespesa.map(tipo => (
                <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Despesa</Label>
          <Select 
            value={formFornecedor.descricao_despesa_padrao || 'none'} 
            onValueChange={(v) => setFormFornecedor(prev => ({ ...prev, descricao_despesa_padrao: v === 'none' ? '' : v }))}
            disabled={!formFornecedor.classificacao_despesa_padrao}
          >
            <SelectTrigger>
              <SelectValue placeholder={formFornecedor.classificacao_despesa_padrao ? "Selecione a despesa" : "Selecione a classificação primeiro"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {planoDespesas.filter(p => p.tipo === formFornecedor.classificacao_despesa_padrao).map(d => (
                <SelectItem key={d.id} value={d.nome}>{d.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderPlanoReceitaForm = () => {
    const tipoInfo = tiposReceita.find(t => t.value === currentTipoReceita);
    return (
      <div className="space-y-4">
        {tipoInfo && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <tipoInfo.icon className={`h-5 w-5 ${tipoInfo.color}`} />
            <span className="font-medium">{tipoInfo.label}</span>
          </div>
        )}
        <div>
          <Label>Nome</Label>
          <Input
            value={formPlanoReceita.nome || ''}
            onChange={(e) => setFormPlanoReceita(prev => ({ ...prev, nome: e.target.value }))}
            placeholder="Nome da receita"
          />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea
            value={formPlanoReceita.descricao || ''}
            onChange={(e) => setFormPlanoReceita(prev => ({ ...prev, descricao: e.target.value }))}
            placeholder="Descrição (opcional)"
          />
        </div>
      </div>
    );
  };

  const renderPlanoDespesaForm = () => {
    const tipoInfo = tiposDespesa.find(t => t.value === currentTipoDespesa);
    return (
      <div className="space-y-4">
        {tipoInfo && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <tipoInfo.icon className={`h-5 w-5 ${tipoInfo.color}`} />
            <span className="font-medium">{tipoInfo.label}</span>
          </div>
        )}
        <div>
          <Label>Nome</Label>
          <Input
            value={formPlanoDespesa.nome || ''}
            onChange={(e) => setFormPlanoDespesa(prev => ({ ...prev, nome: e.target.value }))}
            placeholder="Nome da despesa"
          />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea
            value={formPlanoDespesa.descricao || ''}
            onChange={(e) => setFormPlanoDespesa(prev => ({ ...prev, descricao: e.target.value }))}
            placeholder="Descrição (opcional)"
          />
        </div>
      </div>
    );
  };

  const renderCondicaoPagamentoForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Nome *</Label>
        <Input
          value={formCondicaoPagamento.nome || ''}
          onChange={(e) => setFormCondicaoPagamento(prev => ({ ...prev, nome: e.target.value }))}
          placeholder="Ex: 30/60/90 dias"
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          value={formCondicaoPagamento.descricao || ''}
          onChange={(e) => setFormCondicaoPagamento(prev => ({ ...prev, descricao: e.target.value }))}
          placeholder="Descrição da condição (opcional)"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Parcelas</Label>
          <Input
            type="number"
            min="1"
            value={formCondicaoPagamento.parcelas || 1}
            onChange={(e) => setFormCondicaoPagamento(prev => ({ ...prev, parcelas: parseInt(e.target.value) || 1 }))}
            placeholder="1"
          />
        </div>
        <div>
          <Label>Intervalo (dias)</Label>
          <Input
            type="number"
            min="0"
            value={formCondicaoPagamento.intervalo_dias || 30}
            onChange={(e) => setFormCondicaoPagamento(prev => ({ ...prev, intervalo_dias: parseInt(e.target.value) || 0 }))}
            placeholder="30"
          />
        </div>
        <div>
          <Label>Entrada (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formCondicaoPagamento.entrada_percentual || 0}
            onChange={(e) => setFormCondicaoPagamento(prev => ({ ...prev, entrada_percentual: parseFloat(e.target.value) || 0 }))}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );

  const getDialogTitle = () => {
    const action = editingItem ? 'Editar' : 'Nova';
    if (activeTab === 'plano-receitas' || currentTipoReceita) {
      const tipoInfo = tiposReceita.find(t => t.value === currentTipoReceita);
      return `${action} ${tipoInfo?.label || 'Receita'}`;
    }
    if (activeTab === 'plano-despesas' || currentTipoDespesa) {
      const tipoInfo = tiposDespesa.find(t => t.value === currentTipoDespesa);
      return `${action} ${tipoInfo?.label || 'Despesa'}`;
    }
    switch (activeTab) {
      case 'centros-custo': return `${editingItem ? 'Editar' : 'Novo'} Centro de Custo`;
      case 'formas-pagamento': return `${editingItem ? 'Editar' : 'Nova'} Forma de Pagamento`;
      case 'contas-bancarias': return `${editingItem ? 'Editar' : 'Nova'} Conta Bancária`;
      case 'categorias': return `${editingItem ? 'Editar' : 'Nova'} Categoria`;
      case 'fornecedores': return `${editingItem ? 'Editar' : 'Novo'} Fornecedor`;
      case 'condicoes-pagamento': return `${editingItem ? 'Editar' : 'Nova'} Condição de Pagamento`;
      default: return action;
    }
  };

  const renderDialogForm = () => {
    if (activeTab === 'plano-receitas' || currentTipoReceita) {
      return renderPlanoReceitaForm();
    }
    if (activeTab === 'plano-despesas' || currentTipoDespesa) {
      return renderPlanoDespesaForm();
    }
    switch (activeTab) {
      case 'centros-custo': return renderCentroCustoForm();
      case 'formas-pagamento': return renderFormaPagamentoForm();
      case 'contas-bancarias': return renderContaBancariaForm();
      case 'categorias': return renderCategoriaForm();
      case 'fornecedores': return renderFornecedorForm();
      case 'condicoes-pagamento': return renderCondicaoPagamentoForm();
      default: return null;
    }
  };

  const handleDialogSave = () => {
    if (activeTab === 'plano-receitas' || currentTipoReceita) {
      handleSavePlanoReceita();
    } else if (activeTab === 'plano-despesas' || currentTipoDespesa) {
      handleSavePlanoDespesa();
    } else if (activeTab === 'condicoes-pagamento') {
      handleSaveCondicaoPagamento();
    } else if (activeTab === 'fornecedores') {
      handleSaveFornecedor();
    } else if (activeTab === 'centros-custo') {
      handleSaveCentroCusto();
    } else if (activeTab === 'formas-pagamento') {
      handleSaveFormaPagamento();
    } else {
      handleSave();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cadastros Financeiros</h1>
          <p className="text-muted-foreground">Gerencie os cadastros base do módulo financeiro</p>
        </div>
      </div>

      {/* Tabs de Cadastros */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-12 items-center justify-start gap-1 rounded-lg bg-muted p-1 min-w-max">
            <TabsTrigger 
              value="plano-receitas" 
              className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Plano de Receitas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="plano-despesas" 
              className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border"
            >
              <Receipt className="h-4 w-4" />
              <span>Plano de Despesas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="centros-custo" 
              className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border"
            >
              <Tags className="h-4 w-4" />
              <span>Centros de Custo</span>
            </TabsTrigger>
            <TabsTrigger 
              value="formas-pagamento" 
              className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border"
            >
              <CreditCard className="h-4 w-4" />
              <span>Formas de Pagamento</span>
            </TabsTrigger>
            <TabsTrigger 
              value="condicoes-pagamento" 
              className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border"
            >
              <FileText className="h-4 w-4" />
              <span>Condições de Pagamento</span>
            </TabsTrigger>
            <TabsTrigger 
              value="contas-bancarias" 
              className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border"
            >
              <Landmark className="h-4 w-4" />
              <span>Contas Bancárias</span>
            </TabsTrigger>
            <TabsTrigger 
              value="fornecedores" 
              className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border"
            >
              <Building2 className="h-4 w-4" />
              <span>Fornecedores</span>
            </TabsTrigger>
          </TabsList>
        </div>

        
        {/* Plano de Receitas */}
        <TabsContent value="plano-receitas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Classificação das Receitas
              </CardTitle>
              <CardDescription>Organize suas receitas por categoria para o DRE</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {tiposReceita.map((tipo) => {
                const Icon = tipo.icon;
                const receitas = getReceitasByTipo(tipo.value);
                const isOpen = openSections[tipo.value] ?? false;
                
                return (
                  <Collapsible key={tipo.value} open={isOpen} onOpenChange={() => toggleSection(tipo.value)}>
                    <Card className="border">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors py-3">
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${tipo.color}`} />
                            <CardTitle className="text-sm font-medium">{tipo.label}</CardTitle>
                            <Badge variant="secondary" className="ml-2">{receitas.length}</Badge>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-4 border-t">
                          <div className="flex justify-end mb-4">
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddPlanoReceita(tipo.value);
                              }}
                              className="bg-primary hover:bg-primary/90 text-white"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar
                            </Button>
                          </div>
                          {receitas.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
                              Nenhum item cadastrado
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {receitas.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.nome}</TableCell>
                                    <TableCell>{item.descricao || '-'}</TableCell>
                                    <TableCell>
                                      <Badge variant={item.ativo ? 'default' : 'outline'}>
                                        {item.ativo ? 'Ativo' : 'Inativo'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="icon" onClick={() => handleEditPlanoReceita(item)}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDeletePlanoReceita(item.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plano de Despesas */}
        <TabsContent value="plano-despesas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Classificação das Despesas
              </CardTitle>
              <CardDescription>Organize suas despesas por categoria para o DRE</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {tiposDespesa.map((tipo) => {
                const Icon = tipo.icon;
                const despesas = getDespesasByTipo(tipo.value);
                const isOpen = openSections[`despesa_${tipo.value}`] ?? false;
                
                return (
                  <Collapsible key={tipo.value} open={isOpen} onOpenChange={() => toggleSection(`despesa_${tipo.value}`)}>
                    <Card className="border">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors py-3">
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${tipo.color}`} />
                            <CardTitle className="text-sm font-medium">{tipo.label}</CardTitle>
                            <Badge variant="secondary" className="ml-2">{despesas.length}</Badge>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-4 border-t">
                          <div className="flex justify-end mb-4">
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddPlanoDespesa(tipo.value);
                              }}
                              className="bg-primary hover:bg-primary/90 text-white"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar
                            </Button>
                          </div>
                          {despesas.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
                              Nenhum item cadastrado
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {despesas.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.nome}</TableCell>
                                    <TableCell>{item.descricao || '-'}</TableCell>
                                    <TableCell>
                                      <Badge variant={item.ativo ? 'default' : 'outline'}>
                                        {item.ativo ? 'Ativo' : 'Inativo'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="icon" onClick={() => handleEditPlanoDespesa(item)}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDeletePlanoDespesa(item.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Centros de Custo */}
        <TabsContent value="centros-custo">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5 text-primary" />
                  Centros de Custo
                </CardTitle>
                <CardDescription>Organize suas receitas e despesas por centros de custo</CardDescription>
              </div>
              <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterItems(centrosCusto, searchTerm).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{item.descricao}</TableCell>
                      <TableCell>
                        <Badge variant={item.ativo ? 'default' : 'outline'}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Formas de Pagamento */}
        <TabsContent value="formas-pagamento">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Formas de Pagamento
                </CardTitle>
                <CardDescription>Configure as formas de pagamento aceitas</CardDescription>
              </div>
              <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Taxa (%)</TableHead>
                    <TableHead>Dias Recebimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterItems(formasPagamento, searchTerm).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{item.descricao}</TableCell>
                      <TableCell>{item.taxa_percentual}%</TableCell>
                      <TableCell>{item.dias_recebimento} dias</TableCell>
                      <TableCell>
                        <Badge variant={item.ativo ? 'default' : 'outline'}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Condições de Pagamento */}
        <TabsContent value="condicoes-pagamento">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Condições de Pagamento
                </CardTitle>
                <CardDescription>Configure as condições de pagamento para vendas</CardDescription>
              </div>
              <Button onClick={handleAddCondicaoPagamento} className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCondicoes ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : condicoesPagamento.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
                  Nenhuma condição cadastrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead>Intervalo (dias)</TableHead>
                      <TableHead>Entrada (%)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterItems(condicoesPagamento, searchTerm).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell>{item.descricao || '-'}</TableCell>
                        <TableCell>{item.parcelas}x</TableCell>
                        <TableCell>{item.intervalo_dias} dias</TableCell>
                        <TableCell>{item.entrada_percentual}%</TableCell>
                        <TableCell>
                          <Badge variant={item.ativo ? 'default' : 'outline'}>
                            {item.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCondicaoPagamento(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCondicaoPagamento(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contas Bancárias */}
        <TabsContent value="contas-bancarias">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  Contas Bancárias
                </CardTitle>
                <CardDescription>Gerencie suas contas bancárias</CardDescription>
              </div>
              <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Agência</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Saldo Inicial</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterItems(contasBancarias, searchTerm).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.banco}</TableCell>
                      <TableCell>{item.agencia}</TableCell>
                      <TableCell>{item.conta}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {item.tipo === 'corrente' ? 'Corrente' : item.tipo === 'poupanca' ? 'Poupança' : 'Investimento'}
                        </Badge>
                      </TableCell>
                      <TableCell>R$ {item.saldo_inicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Badge variant={item.ativo ? 'default' : 'outline'}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fornecedores */}
        <TabsContent value="fornecedores">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Fornecedores
                </CardTitle>
                <CardDescription>Cadastre e gerencie seus fornecedores</CardDescription>
              </div>
              <Button onClick={handleAddFornecedor} className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Fantasia</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterItems(fornecedores, searchTerm).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome_fantasia}</TableCell>
                      <TableCell>{item.razao_social}</TableCell>
                      <TableCell>{item.cnpj_cpf}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{item.email}</div>
                          <div className="text-muted-foreground">{item.telefone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.ativo ? 'default' : 'outline'}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditFornecedor(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteFornecedor(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          {renderDialogForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleDialogSave} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
