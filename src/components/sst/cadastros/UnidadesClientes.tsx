import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, Pencil, Trash2, Loader2, ExternalLink, ChevronDown, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Cliente {
  id: string;
  nome: string;
  sigla: string | null;
}

interface Grupo {
  id: string;
  nome: string;
}

interface ProfissionalSaude {
  id: string;
  nome: string;
}

interface ProfissionalSeguranca {
  id: string;
  nome: string;
}

interface Unidade {
  id: string;
  empresa_id: string;
  cliente_id: string;
  grupo_id: string | null;
  tipo_inscricao: string;
  numero_inscricao: string | null;
  nome_referencia: string | null;
  razao_social: string;
  cnae: string | null;
  cnae_atividade: string | null;
  grau_risco: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  codigo_interno: string | null;
  tipo_local: string | null;
  email: string | null;
  medico_pcmso_id: string | null;
  tecnico_responsavel_id: string | null;
  faturamento: string;
  status: string;
  cliente?: Cliente;
  grupo?: Grupo;
}

interface ContatoUnidade {
  id?: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  linkedin: string;
  principal: boolean;
}

const TIPOS_INSCRICAO = [
  { value: '1', label: '1-CNPJ' },
  { value: '2', label: '2-CPF' },
  { value: '3', label: '3-CAEPF (Cadastro de Atividade Econômica de Pessoa Física)' },
  { value: '4', label: '4-CNO (Cadastro Nacional de Obra)' },
  { value: '5', label: '5-CGC' },
  { value: '6', label: '6-CEI' },
];

const TIPOS_LOCAL = [
  { value: '1', label: '1 - Estabelecimento do empregador no Brasil' },
  { value: '2', label: '2 - Estabelecimento do empregador no Exterior' },
  { value: '3', label: '3 - Estabelecimento de terceiros onde o empregador presta serviços' },
  { value: '4', label: '4 - Via pública' },
  { value: '5', label: '5 - Área rural' },
  { value: '6', label: '6 - Embarcação' },
  { value: '9', label: '9 - Outros' },
];

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const ESTADOS_NOMES: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia',
  'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás',
  'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
  'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí',
  'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina', 'SP': 'São Paulo',
  'SE': 'Sergipe', 'TO': 'Tocantins'
};

export function UnidadesClientes() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [profissionaisSaude, setProfissionaisSaude] = useState<ProfissionalSaude[]>([]);
  const [profissionaisSeguranca, setProfissionaisSeguranca] = useState<ProfissionalSeguranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCliente, setFilterCliente] = useState<string>('');
  const [filterUnidade, setFilterUnidade] = useState<string>('');
  const [showTable, setShowTable] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [contatos, setContatos] = useState<ContatoUnidade[]>([]);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    grupo_id: '',
    tipo_inscricao: '1',
    numero_inscricao: '',
    nome_referencia: '',
    razao_social: '',
    cnae: '',
    cnae_atividade: '',
    grau_risco: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: 'AC',
    codigo_interno: '',
    tipo_local: '',
    email: '',
    medico_pcmso_id: '',
    tecnico_responsavel_id: '',
    faturamento: 'faturar',
    status: 'ativo',
  });

  useEffect(() => {
    if (empresaId) {
      loadData();
    }
  }, [empresaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unidadesRes, clientesRes, gruposRes, saudeRes, segurancaRes] = await Promise.all([
        (supabase as any)
          .from('unidades_clientes')
          .select('*, cliente:clientes_sst(id, nome, sigla), grupo:grupos_clientes(id, nome)')
          .eq('empresa_id', empresaId)
          .order('razao_social'),
        (supabase as any)
          .from('clientes_sst')
          .select('id, nome, sigla')
          .eq('empresa_sst_id', empresaId)
          .order('nome'),
        (supabase as any)
          .from('grupos_clientes')
          .select('id, nome')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('nome'),
        (supabase as any)
          .from('profissionais_saude')
          .select('id, nome')
          .eq('empresa_id', empresaId)
          .order('nome'),
        (supabase as any)
          .from('profissionais_seguranca')
          .select('id, nome')
          .eq('empresa_id', empresaId)
          .order('nome'),
      ]);

      console.log('Clientes carregados:', clientesRes.data, 'Erro:', clientesRes.error);
      if (unidadesRes.data) setUnidades(unidadesRes.data);
      if (clientesRes.data) setClientes(clientesRes.data);
      if (gruposRes.data) setGrupos(gruposRes.data);
      if (saudeRes.data) setProfissionaisSaude(saudeRes.data);
      if (segurancaRes.data) setProfissionaisSeguranca(segurancaRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados das unidades.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      grupo_id: '',
      tipo_inscricao: '1',
      numero_inscricao: '',
      nome_referencia: '',
      razao_social: '',
      cnae: '',
      cnae_atividade: '',
      grau_risco: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: 'AC',
      codigo_interno: '',
      tipo_local: '',
      email: '',
      medico_pcmso_id: '',
      tecnico_responsavel_id: '',
      faturamento: 'faturar',
      status: 'ativo',
    });
    setContatos([]);
  };

  const addContato = () => {
    setContatos(prev => [...prev, {
      nome: '',
      cargo: '',
      email: '',
      telefone: '',
      linkedin: '',
      principal: prev.length === 0,
    }]);
  };

  const removeContato = (index: number) => {
    setContatos(prev => {
      const newContatos = prev.filter((_, i) => i !== index);
      if (newContatos.length > 0 && !newContatos.some(c => c.principal)) {
        newContatos[0].principal = true;
      }
      return newContatos;
    });
  };

  const updateContato = (index: number, field: keyof ContatoUnidade, value: string | boolean) => {
    setContatos(prev => prev.map((contato, i) => {
      if (i === index) {
        if (field === 'principal' && value === true) {
          return { ...contato, principal: true };
        }
        return { ...contato, [field]: value };
      }
      if (field === 'principal' && value === true) {
        return { ...contato, principal: false };
      }
      return contato;
    }));
  };

  const GRAU_RISCO_POR_CNAE: Record<string, string> = {
    '86': '3',
    '87': '3',
    '88': '2',
    '01': '3',
    '02': '3',
    '03': '3',
    '05': '4',
    '06': '4',
    '07': '4',
    '08': '4',
    '09': '4',
    '10': '3',
    '11': '3',
    '12': '3',
    '13': '3',
    '14': '2',
    '15': '3',
    '16': '3',
    '17': '3',
    '18': '2',
    '19': '3',
    '20': '3',
    '21': '3',
    '22': '3',
    '23': '3',
    '24': '3',
    '25': '3',
    '26': '2',
    '27': '3',
    '28': '3',
    '29': '3',
    '30': '3',
    '31': '3',
    '32': '2',
    '33': '3',
    '35': '3',
    '36': '2',
    '37': '3',
    '38': '3',
    '39': '3',
    '41': '3',
    '42': '4',
    '43': '3',
    '45': '2',
    '46': '2',
    '47': '2',
    '49': '3',
    '50': '3',
    '51': '3',
    '52': '3',
    '53': '2',
    '55': '2',
    '56': '2',
    '58': '1',
    '59': '2',
    '60': '2',
    '61': '2',
    '62': '1',
    '63': '1',
    '64': '1',
    '65': '1',
    '66': '1',
    '68': '1',
    '69': '1',
    '70': '1',
    '71': '2',
    '72': '1',
    '73': '1',
    '74': '2',
    '75': '2',
    '77': '2',
    '78': '2',
    '79': '1',
    '80': '2',
    '81': '2',
    '82': '1',
    '84': '2',
    '85': '2',
    '90': '2',
    '91': '2',
    '92': '2',
    '93': '3',
    '94': '1',
    '95': '2',
    '96': '2',
    '97': '2',
    '99': '1',
  };

  const buscarGrauRiscoPorCnae = (cnae: string): string => {
    if (!cnae) return '';
    const divisao = cnae.substring(0, 2);
    return GRAU_RISCO_POR_CNAE[divisao] || '';
  };

  const buscarDadosCnpj = async (cnpj: string) => {
    if (!cnpj || formData.tipo_inscricao !== '1') return;
    
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return;

    setBuscandoCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (response.ok) {
        const data = await response.json();
        const cnaeCode = data.cnae_fiscal?.toString() || '';
        const grauRisco = buscarGrauRiscoPorCnae(cnaeCode);
        
        setFormData(prev => ({
          ...prev,
          razao_social: data.razao_social || '',
          nome_referencia: data.nome_fantasia || '',
          cnae: cnaeCode,
          cnae_atividade: data.cnae_fiscal_descricao || '',
          grau_risco: grauRisco,
          cep: data.cep?.replace(/\D/g, '') || '',
          logradouro: data.logradouro || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.municipio || '',
          uf: data.uf || 'AC',
        }));
        toast({
          title: 'Dados encontrados',
          description: 'Os dados do CNPJ foram preenchidos automaticamente.',
        });
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const handleNumeroInscricaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, numero_inscricao: value }));
    
    const cnpjLimpo = value.replace(/\D/g, '');
    if (cnpjLimpo.length === 14 && formData.tipo_inscricao === '1') {
      buscarDadosCnpj(value);
    }
  };

  const copiarDadosEmpresa = async () => {
    if (!formData.cliente_id) {
      toast({
        title: 'Selecione uma empresa',
        description: 'Selecione uma empresa primeiro para copiar os dados.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: cliente } = await (supabase as any)
        .from('clientes_sst')
        .select('*')
        .eq('id', formData.cliente_id)
        .single();

      if (cliente) {
        setFormData(prev => ({
          ...prev,
          tipo_inscricao: cliente.tipo_inscricao || '1',
          numero_inscricao: cliente.numero_inscricao_esocial || '',
          razao_social: cliente.nome || '',
          cnae: cliente.cnae || '',
          cnae_atividade: cliente.cnae_atividade || '',
          grau_risco: cliente.grau_risco || '',
          cep: cliente.cep || '',
          logradouro: cliente.endereco || '',
          numero: cliente.numero || '',
          complemento: cliente.complemento || '',
          bairro: cliente.bairro || '',
          cidade: cliente.cidade || '',
          uf: cliente.estado || 'AC',
          email: cliente.email || '',
        }));
        toast({
          title: 'Dados copiados',
          description: 'Os dados da empresa foram copiados para a unidade.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao copiar dados da empresa.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.cliente_id || !formData.razao_social) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a empresa e a razão social.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('unidades_clientes')
        .insert({
          empresa_id: empresaId,
          cliente_id: formData.cliente_id,
          grupo_id: formData.grupo_id && formData.grupo_id !== 'none' ? formData.grupo_id : null,
          tipo_inscricao: formData.tipo_inscricao,
          numero_inscricao: formData.numero_inscricao || null,
          nome_referencia: formData.nome_referencia || null,
          razao_social: formData.razao_social,
          cnae: formData.cnae || null,
          cnae_atividade: formData.cnae_atividade || null,
          grau_risco: formData.grau_risco || null,
          cep: formData.cep || null,
          logradouro: formData.logradouro || null,
          numero: formData.numero || null,
          complemento: formData.complemento || null,
          bairro: formData.bairro || null,
          cidade: formData.cidade || null,
          uf: formData.uf || null,
          codigo_interno: formData.codigo_interno || null,
          tipo_local: formData.tipo_local || null,
          email: formData.email || null,
          medico_pcmso_id: formData.medico_pcmso_id && formData.medico_pcmso_id !== 'none' ? formData.medico_pcmso_id : null,
          tecnico_responsavel_id: formData.tecnico_responsavel_id && formData.tecnico_responsavel_id !== 'none' ? formData.tecnico_responsavel_id : null,
          faturamento: formData.faturamento,
          status: formData.status,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Unidade cadastrada com sucesso!',
      });
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao cadastrar unidade.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUnidade || !formData.razao_social) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a razão social.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('unidades_clientes')
        .update({
          cliente_id: formData.cliente_id,
          grupo_id: formData.grupo_id && formData.grupo_id !== 'none' ? formData.grupo_id : null,
          tipo_inscricao: formData.tipo_inscricao,
          numero_inscricao: formData.numero_inscricao || null,
          nome_referencia: formData.nome_referencia || null,
          razao_social: formData.razao_social,
          cnae: formData.cnae || null,
          cnae_atividade: formData.cnae_atividade || null,
          grau_risco: formData.grau_risco || null,
          cep: formData.cep || null,
          logradouro: formData.logradouro || null,
          numero: formData.numero || null,
          complemento: formData.complemento || null,
          bairro: formData.bairro || null,
          cidade: formData.cidade || null,
          uf: formData.uf || null,
          codigo_interno: formData.codigo_interno || null,
          tipo_local: formData.tipo_local || null,
          email: formData.email || null,
          medico_pcmso_id: formData.medico_pcmso_id && formData.medico_pcmso_id !== 'none' ? formData.medico_pcmso_id : null,
          tecnico_responsavel_id: formData.tecnico_responsavel_id && formData.tecnico_responsavel_id !== 'none' ? formData.tecnico_responsavel_id : null,
          faturamento: formData.faturamento,
          status: formData.status,
        })
        .eq('id', selectedUnidade.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Unidade atualizada com sucesso!',
      });
      setEditDialogOpen(false);
      setSelectedUnidade(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar unidade.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUnidade) return;

    try {
      const { error } = await (supabase as any)
        .from('unidades_clientes')
        .delete()
        .eq('id', selectedUnidade.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Unidade excluída com sucesso!',
      });
      setDeleteDialogOpen(false);
      setSelectedUnidade(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir unidade.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await (supabase as any)
        .from('unidades_clientes')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `${selectedIds.length} unidade(s) excluída(s) com sucesso!`,
      });
      setSelectedIds([]);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir unidades.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (unidade: Unidade) => {
    setSelectedUnidade(unidade);
    setFormData({
      cliente_id: unidade.cliente_id,
      grupo_id: unidade.grupo_id || '',
      tipo_inscricao: unidade.tipo_inscricao || '1',
      numero_inscricao: unidade.numero_inscricao || '',
      nome_referencia: unidade.nome_referencia || '',
      razao_social: unidade.razao_social,
      cnae: unidade.cnae || '',
      cnae_atividade: unidade.cnae_atividade || '',
      grau_risco: unidade.grau_risco || '',
      cep: unidade.cep || '',
      logradouro: unidade.logradouro || '',
      numero: unidade.numero || '',
      complemento: unidade.complemento || '',
      bairro: unidade.bairro || '',
      cidade: unidade.cidade || '',
      uf: unidade.uf || 'AC',
      codigo_interno: unidade.codigo_interno || '',
      tipo_local: unidade.tipo_local || '',
      email: unidade.email || '',
      medico_pcmso_id: unidade.medico_pcmso_id || '',
      tecnico_responsavel_id: unidade.tecnico_responsavel_id || '',
      faturamento: unidade.faturamento || 'faturar',
      status: unidade.status || 'ativo',
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (unidade: Unidade) => {
    setSelectedUnidade(unidade);
    setDeleteDialogOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUnidades.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUnidades.map(u => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const unidadesFiltradas = filterCliente ? unidades.filter(u => u.cliente_id === filterCliente) : [];
  
  const filteredUnidades = unidadesFiltradas.filter(unidade => {
    const matchesSearch = unidade.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unidade.numero_inscricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnidade = !filterUnidade || unidade.id === filterUnidade;
    return matchesSearch && matchesUnidade;
  });

  const renderFormFields = () => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label>Criar filial da empresa: *</Label>
        <Select value={formData.cliente_id} onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a empresa" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map(cliente => (
              <SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-t pt-4 mt-4">
        <div className="space-y-2">
          <Label>Tipo Inscrição</Label>
          <Select value={formData.tipo_inscricao} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_inscricao: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_INSCRICAO.map(tipo => (
                <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Nr Inscrição eSocial (CNPJ,...)</Label>
          <div className="flex gap-2">
            <Input
              value={formData.numero_inscricao}
              onChange={handleNumeroInscricaoChange}
              placeholder="Digite o número de inscrição"
            />
            {buscandoCnpj && <Loader2 className="h-4 w-4 animate-spin self-center" />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Nome de referência</Label>
            <Input
              value={formData.nome_referencia}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_referencia: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Razão Social *</Label>
            <Input
              value={formData.razao_social}
              onChange={(e) => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Loc. CNAE</Label>
            <Input
              value={formData.cnae}
              onChange={(e) => setFormData(prev => ({ ...prev, cnae: e.target.value }))}
              placeholder="Localize o CNAE"
            />
          </div>
          <div className="space-y-2">
            <Label>CNAE</Label>
            <Input
              value={formData.cnae}
              onChange={(e) => setFormData(prev => ({ ...prev, cnae: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Atividade (CNAE)</Label>
            <Input
              value={formData.cnae_atividade}
              onChange={(e) => setFormData(prev => ({ ...prev, cnae_atividade: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Grau de Risco</Label>
            <Input
              value={formData.grau_risco}
              onChange={(e) => setFormData(prev => ({ ...prev, grau_risco: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>CEP</Label>
            <Input
              value={formData.cep}
              onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Código Interno</Label>
            <Input
              value={formData.codigo_interno}
              onChange={(e) => setFormData(prev => ({ ...prev, codigo_interno: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Logradouro</Label>
            <Input
              value={formData.logradouro}
              onChange={(e) => setFormData(prev => ({ ...prev, logradouro: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input
              value={formData.complemento}
              onChange={(e) => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>NR (Número)</Label>
            <Input
              value={formData.numero}
              onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input
              value={formData.bairro}
              onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>UF</Label>
            <Select value={formData.uf} onValueChange={(value) => setFormData(prev => ({ ...prev, uf: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_BRASIL.map(uf => (
                  <SelectItem key={uf} value={uf}>{ESTADOS_NOMES[uf]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              value={formData.cidade}
              onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Tipo local</Label>
            <Select value={formData.tipo_local} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_local: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_LOCAL.map(tipo => (
                  <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Médico PCMSO</Label>
            <Select value={formData.medico_pcmso_id} onValueChange={(value) => setFormData(prev => ({ ...prev, medico_pcmso_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Localize o profissional da saúde" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {profissionaisSaude.map(prof => (
                  <SelectItem key={prof.id} value={prof.id}>{prof.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Técnico Responsável</Label>
          <Select value={formData.tecnico_responsavel_id} onValueChange={(value) => setFormData(prev => ({ ...prev, tecnico_responsavel_id: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Localize o profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {profissionaisSeguranca.map(prof => (
                <SelectItem key={prof.id} value={prof.id}>{prof.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bloco de Contatos da Unidade */}
        <div className="border-t pt-4 mt-6">
          <h3 className="text-lg font-semibold mb-4">Contatos da unidade</h3>
          
          {contatos.map((contato, index) => (
            <div key={index} className="border rounded-lg p-4 mb-4 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Contato {index + 1}</span>
                  {contato.principal && (
                    <Badge variant="secondary" className="text-xs">Principal</Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContato(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={contato.nome}
                    onChange={(e) => updateContato(index, 'nome', e.target.value)}
                    placeholder="Nome do contato"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={contato.cargo}
                    onChange={(e) => updateContato(index, 'cargo', e.target.value)}
                    placeholder="Ex: Gerente de RH"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={contato.email}
                    onChange={(e) => updateContato(index, 'email', e.target.value)}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={contato.telefone}
                    onChange={(e) => updateContato(index, 'telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              
              <div className="space-y-2 mt-4">
                <Label>LinkedIn</Label>
                <Input
                  value={contato.linkedin}
                  onChange={(e) => updateContato(index, 'linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/usuario"
                />
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <Checkbox
                  id={`principal-${index}`}
                  checked={contato.principal}
                  onCheckedChange={(checked) => updateContato(index, 'principal', checked === true)}
                />
                <Label htmlFor={`principal-${index}`} className="text-sm cursor-pointer">
                  Contato principal
                </Label>
              </div>
            </div>
          ))}
          
          <Button type="button" variant="outline" onClick={addContato} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Contato
          </Button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
        <p className="text-sm text-muted-foreground">Gerencie as unidades das empresas.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filtrar</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterCliente} onValueChange={(value) => {
            setFilterCliente(value === 'none' ? '' : value);
            setFilterUnidade('');
            setShowTable(value !== 'none');
          }}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Todas as Empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Todas as Empresas</SelectItem>
              {clientes.map(cliente => (
                <SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {filterCliente && (
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione a Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Todas as Unidades</SelectItem>
                {unidadesFiltradas.map(unidade => (
                  <SelectItem key={unidade.id} value={unidade.id}>{unidade.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button variant="default" size="sm" onClick={() => setShowTable(true)} disabled={!filterCliente}>
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Unidade +
          </Button>
          <Button variant="secondary">
            <ExternalLink className="h-4 w-4 mr-2" />
            Área do Cliente
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Ações em Massa
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDeleteSelected} disabled={selectedIds.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Selecionados ({selectedIds.length})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showTable && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === filteredUnidades.length && filteredUnidades.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnidades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhuma unidade encontrada
                  </TableCell>
                </TableRow>
              ) : (
              filteredUnidades.map((unidade) => (
                <TableRow key={unidade.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(unidade.id)}
                      onCheckedChange={() => toggleSelect(unidade.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{unidade.id.slice(0, 8)}...</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{unidade.razao_social}</p>
                      <p className="text-sm text-muted-foreground">{unidade.cliente?.nome}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(unidade)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openDeleteDialog(unidade)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      )}

      {/* Dialog Nova Unidade */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nova Unidade (Filial)</DialogTitle>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Fechar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Unidade */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Fechar</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a unidade "{selectedUnidade?.razao_social}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
