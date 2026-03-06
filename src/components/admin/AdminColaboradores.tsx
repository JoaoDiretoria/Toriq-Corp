import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Phone,
  Mail,
  Building2,
  Building,
  User,
  Search,
  Loader2,
  Users,
  UserCheck,
  UserX,
  Download,
  Upload,
  Eye,
  Key,
  Shield,
  Calendar,
  Briefcase,
  Hash,
  FileText,
} from 'lucide-react';
import { AdminSetorDialog } from './AdminSetorDialog';
import { AdminCargoDialog } from './AdminCargoDialog';

interface Colaborador {
  id: string;
  empresa_id: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  setor: string | null;
  data_admissao: string | null;
  email: string | null;
  telefone: string | null;
  matricula: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  grupo_homogeneo_id: string | null;
  grupo_homogeneo?: { nome: string } | null;
  // Novos campos
  rg: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  estado_civil: string | null;
  nacionalidade: string | null;
  naturalidade: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone_emergencia: string | null;
  contato_emergencia: string | null;
  pis: string | null;
  ctps: string | null;
  ctps_serie: string | null;
  tipo_contrato: string | null;
  carga_horaria: string | null;
  salario: number | null;
  formacao: string | null;
  nivel_escolaridade: string | null;
  tem_acesso_sistema: boolean;
  perfil_acesso: string | null;
  modulos_acesso: string[] | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  pix: string | null;
  observacoes: string | null;
  foto_url: string | null;
  comissao: number | null;
}

interface GrupoHomogeneo {
  id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
}

interface Cargo {
  id: string;
  nome: string;
}

// ID fixo da empresa Toriq (vertical_on)
const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

export function AdminColaboradores() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [gruposHomogeneos, setGruposHomogeneos] = useState<GrupoHomogeneo[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [colaboradorToDelete, setColaboradorToDelete] = useState<Colaborador | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);
  const [setorDialogOpen, setSetorDialogOpen] = useState(false);
  const [cargoDialogOpen, setCargoDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    // Dados pessoais
    nome: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    sexo: '',
    estado_civil: '',
    nacionalidade: 'Brasileira',
    naturalidade: '',
    nome_mae: '',
    nome_pai: '',
    email: '',
    telefone: '',
    // Endereço
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    // Contato de emergência
    telefone_emergencia: '',
    contato_emergencia: '',
    // Dados profissionais
    matricula: '',
    cargo: '',
    setor: '',
    formacao: '',
    nivel_escolaridade: '',
    data_admissao: '',
    tipo_contrato: '',
    carga_horaria: '',
    salario: '',
    grupo_homogeneo_id: '',
    // Acesso ao sistema
    tem_acesso_sistema: false,
    perfil_acesso: '',
    modulos_acesso: [] as string[],
    // Documentos
    pis: '',
    ctps: '',
    ctps_serie: '',
    // Dados bancários
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: '',
    pix: '',
    // Outros
    observacoes: '',
    ativo: true,
    comissao: '',
  });

  // Sempre usa a empresa Toriq para colaboradores do admin
  const empresaId = TORIQ_EMPRESA_ID;

  useEffect(() => {
    fetchColaboradores();
    fetchGruposHomogeneos();
    fetchSetores();
    fetchCargos();
  }, []);

  const fetchColaboradores = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      if (error) throw error;
      setColaboradores((data || []) as Colaborador[]);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os colaboradores.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGruposHomogeneos = async () => {
    setGruposHomogeneos([]);
  };

  const fetchSetores = async () => {
    if (!empresaId) return;
    
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
    }
  };

  const fetchCargos = async () => {
    if (!empresaId) return;
    
    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      setCargos(data || []);
    } catch (error) {
      console.error('Erro ao buscar cargos:', error);
    }
  };

  const handleOpenDialog = (colaborador?: Colaborador) => {
    if (colaborador) {
      setEditingColaborador(colaborador);
      setFormData({
        nome: colaborador.nome,
        cpf: colaborador.cpf || '',
        rg: colaborador.rg || '',
        data_nascimento: colaborador.data_nascimento || '',
        sexo: colaborador.sexo || '',
        estado_civil: colaborador.estado_civil || '',
        nacionalidade: colaborador.nacionalidade || 'Brasileira',
        naturalidade: colaborador.naturalidade || '',
        nome_mae: colaborador.nome_mae || '',
        nome_pai: colaborador.nome_pai || '',
        email: colaborador.email || '',
        telefone: colaborador.telefone || '',
        endereco: colaborador.endereco || '',
        numero: colaborador.numero || '',
        complemento: colaborador.complemento || '',
        bairro: colaborador.bairro || '',
        cidade: colaborador.cidade || '',
        estado: colaborador.estado || '',
        cep: colaborador.cep || '',
        telefone_emergencia: colaborador.telefone_emergencia || '',
        contato_emergencia: colaborador.contato_emergencia || '',
        matricula: colaborador.matricula || '',
        cargo: colaborador.cargo || '',
        setor: colaborador.setor || '',
        formacao: colaborador.formacao || '',
        nivel_escolaridade: colaborador.nivel_escolaridade || '',
        data_admissao: colaborador.data_admissao || '',
        tipo_contrato: colaborador.tipo_contrato || '',
        carga_horaria: colaborador.carga_horaria || '',
        salario: colaborador.salario?.toString() || '',
        grupo_homogeneo_id: colaborador.grupo_homogeneo_id || '',
        tem_acesso_sistema: colaborador.tem_acesso_sistema || false,
        perfil_acesso: colaborador.perfil_acesso || '',
        modulos_acesso: colaborador.modulos_acesso || [],
        pis: colaborador.pis || '',
        ctps: colaborador.ctps || '',
        ctps_serie: colaborador.ctps_serie || '',
        banco: colaborador.banco || '',
        agencia: colaborador.agencia || '',
        conta: colaborador.conta || '',
        tipo_conta: colaborador.tipo_conta || '',
        pix: colaborador.pix || '',
        observacoes: colaborador.observacoes || '',
        ativo: colaborador.ativo,
        comissao: colaborador.comissao?.toString() || '',
      });
    } else {
      setEditingColaborador(null);
      setFormData({
        nome: '',
        cpf: '',
        rg: '',
        data_nascimento: '',
        sexo: '',
        estado_civil: '',
        nacionalidade: 'Brasileira',
        naturalidade: '',
        nome_mae: '',
        nome_pai: '',
        email: '',
        telefone: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        telefone_emergencia: '',
        contato_emergencia: '',
        matricula: '',
        cargo: '',
        setor: '',
        formacao: '',
        nivel_escolaridade: '',
        data_admissao: '',
        tipo_contrato: '',
        carga_horaria: '',
        salario: '',
        grupo_homogeneo_id: '',
        tem_acesso_sistema: false,
        perfil_acesso: '',
        modulos_acesso: [],
        pis: '',
        ctps: '',
        ctps_serie: '',
        banco: '',
        agencia: '',
        conta: '',
        tipo_conta: '',
        pix: '',
        observacoes: '',
        ativo: true,
        comissao: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    
    try {
      const payload = {
        empresa_id: empresaId,
        nome: formData.nome.trim(),
        cpf: formData.cpf.trim() || null,
        rg: formData.rg.trim() || null,
        data_nascimento: formData.data_nascimento || null,
        sexo: formData.sexo || null,
        estado_civil: formData.estado_civil || null,
        nacionalidade: formData.nacionalidade.trim() || null,
        naturalidade: formData.naturalidade.trim() || null,
        nome_mae: formData.nome_mae.trim() || null,
        nome_pai: formData.nome_pai.trim() || null,
        email: formData.email.trim() || null,
        telefone: formData.telefone.trim() || null,
        endereco: formData.endereco.trim() || null,
        numero: formData.numero.trim() || null,
        complemento: formData.complemento.trim() || null,
        bairro: formData.bairro.trim() || null,
        cidade: formData.cidade.trim() || null,
        estado: formData.estado || null,
        cep: formData.cep.trim() || null,
        telefone_emergencia: formData.telefone_emergencia.trim() || null,
        contato_emergencia: formData.contato_emergencia.trim() || null,
        matricula: formData.matricula.trim() || null,
        cargo: formData.cargo.trim() || null,
        setor: formData.setor || null,
        formacao: formData.formacao.trim() || null,
        nivel_escolaridade: formData.nivel_escolaridade || null,
        data_admissao: formData.data_admissao || null,
        tipo_contrato: formData.tipo_contrato || null,
        carga_horaria: formData.carga_horaria.trim() || null,
        salario: formData.salario ? parseFloat(formData.salario) : null,
        grupo_homogeneo_id: formData.grupo_homogeneo_id === 'none' ? null : (formData.grupo_homogeneo_id || null),
        tem_acesso_sistema: formData.tem_acesso_sistema,
        perfil_acesso: formData.perfil_acesso || null,
        modulos_acesso: formData.modulos_acesso.length > 0 ? formData.modulos_acesso : null,
        pis: formData.pis.trim() || null,
        ctps: formData.ctps.trim() || null,
        ctps_serie: formData.ctps_serie.trim() || null,
        banco: formData.banco.trim() || null,
        agencia: formData.agencia.trim() || null,
        conta: formData.conta.trim() || null,
        tipo_conta: formData.tipo_conta || null,
        pix: formData.pix.trim() || null,
        observacoes: formData.observacoes.trim() || null,
        ativo: formData.ativo,
        comissao: formData.comissao ? parseFloat(formData.comissao) : null,
      };

      if (editingColaborador) {
        const { error } = await supabase
          .from('colaboradores')
          .update(payload)
          .eq('id', editingColaborador.id);
        
        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Colaborador atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('colaboradores')
          .insert(payload);
        
        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Colaborador cadastrado com sucesso.',
        });
      }

      setDialogOpen(false);
      fetchColaboradores();
    } catch (error: any) {
      console.error('Erro ao salvar colaborador:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o colaborador.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!colaboradorToDelete) return;

    try {
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', colaboradorToDelete.id);
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Colaborador excluído com sucesso.',
      });
      
      setDeleteDialogOpen(false);
      setColaboradorToDelete(null);
      fetchColaboradores();
    } catch (error: any) {
      console.error('Erro ao excluir colaborador:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o colaborador.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (colaborador: Colaborador) => {
    try {
      const { error } = await supabase
        .from('colaboradores')
        .update({ ativo: !colaborador.ativo })
        .eq('id', colaborador.id);
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: `Colaborador ${colaborador.ativo ? 'desativado' : 'ativado'} com sucesso.`,
      });
      
      fetchColaboradores();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
    }
  };

  const filteredColaboradores = useMemo(() => {
    return colaboradores.filter(c => {
      const matchesSearch = !searchTerm || 
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cpf?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.setor?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'todos' || 
        (filterStatus === 'ativos' && c.ativo) ||
        (filterStatus === 'inativos' && !c.ativo);
      
      return matchesSearch && matchesStatus;
    });
  }, [colaboradores, searchTerm, filterStatus]);

  const stats = useMemo(() => ({
    total: colaboradores.length,
    ativos: colaboradores.filter(c => c.ativo).length,
    inativos: colaboradores.filter(c => !c.ativo).length,
  }), [colaboradores]);

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  };

  const maskCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    let masked = cleaned;
    if (cleaned.length > 3) masked = cleaned.slice(0, 3) + '.' + cleaned.slice(3);
    if (cleaned.length > 6) masked = masked.slice(0, 7) + '.' + cleaned.slice(6);
    if (cleaned.length > 9) masked = masked.slice(0, 11) + '-' + cleaned.slice(9);
    return masked;
  };

  const maskPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    let masked = cleaned;
    if (cleaned.length > 0) masked = '(' + cleaned;
    if (cleaned.length > 2) masked = '(' + cleaned.slice(0, 2) + ') ' + cleaned.slice(2);
    if (cleaned.length > 7) masked = '(' + cleaned.slice(0, 2) + ') ' + cleaned.slice(2, 7) + '-' + cleaned.slice(7);
    return masked;
  };

  const maskCEP = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length > 5) {
      return cleaned.slice(0, 5) + '-' + cleaned.slice(5);
    }
    return cleaned;
  };

  const fetchAddressByCEP = async (cep: string) => {
    const cleanedCEP = cep.replace(/\D/g, '');
    if (cleanedCEP.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCEP}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          complemento: data.complemento || prev.complemento,
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  
  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Users className="h-5 w-5 text-info" />
            </div>
            <span>Colaboradores</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os colaboradores da equipe Toriq
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => setSetorDialogOpen(true)} 
            className="border-border hover:border-primary hover:bg-primary/5"
          >
            <Building className="h-4 w-4 mr-2" />
            Setor
          </Button>
          <Button 
            variant="outline"
            onClick={() => setCargoDialogOpen(true)} 
            className="border-border hover:border-primary hover:bg-primary/5"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Cargo
          </Button>
          <Button 
            onClick={() => handleOpenDialog()} 
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Colaborador
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border hover:border-info/50 transition-colors cursor-pointer" onClick={() => setFilterStatus('todos')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-info/10">
                <Users className="h-5 w-5 text-info" />
              </div>
              <Badge variant="secondary" className={`text-xs ${filterStatus === 'todos' ? 'bg-info/20 text-info' : 'bg-muted'}`}>
                {filterStatus === 'todos' ? 'Selecionado' : 'Filtrar'}
              </Badge>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total de Colaboradores</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-success/50 transition-colors cursor-pointer" onClick={() => setFilterStatus('ativos')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <Badge variant="secondary" className={`text-xs ${filterStatus === 'ativos' ? 'bg-success/20 text-success' : 'bg-muted'}`}>
                {filterStatus === 'ativos' ? 'Selecionado' : 'Filtrar'}
              </Badge>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{stats.ativos}</p>
              <p className="text-sm text-muted-foreground">Colaboradores Ativos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-error/50 transition-colors cursor-pointer" onClick={() => setFilterStatus('inativos')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-error/10">
                <UserX className="h-5 w-5 text-error" />
              </div>
              <Badge variant="secondary" className={`text-xs ${filterStatus === 'inativos' ? 'bg-error/20 text-error' : 'bg-muted'}`}>
                {filterStatus === 'inativos' ? 'Selecionado' : 'Filtrar'}
              </Badge>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{stats.inativos}</p>
              <p className="text-sm text-muted-foreground">Colaboradores Inativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF, e-mail, matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border focus:border-primary"
          />
        </div>
        <Button variant="outline" size="sm" className="border-border hover:border-primary hover:bg-primary/5">
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
        <Button variant="outline" size="sm" className="border-border hover:border-primary hover:bg-primary/5">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card border-border flex-1">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredColaboradores.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum colaborador encontrado</p>
              <p className="text-sm">
                {searchTerm ? 'Tente ajustar sua busca' : 'Clique em "Novo Colaborador" para começar'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-450px)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">Matrícula</TableHead>
                    <TableHead className="text-muted-foreground">Cargo</TableHead>
                    <TableHead className="text-muted-foreground">Setor</TableHead>
                    <TableHead className="text-muted-foreground">E-mail</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredColaboradores.map((colaborador) => (
                    <TableRow 
                      key={colaborador.id} 
                      className="border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        setSelectedColaborador(colaborador);
                        setDetailsDialogOpen(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{colaborador.nome}</p>
                            {colaborador.cpf && (
                              <p className="text-xs text-muted-foreground">{formatCPF(colaborador.cpf)}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">{colaborador.matricula || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{colaborador.cargo || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{colaborador.setor || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{colaborador.email || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={colaborador.ativo 
                            ? 'bg-success/15 text-success border-success/30' 
                            : 'bg-error/15 text-error border-error/30'
                          }
                        >
                          {colaborador.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedColaborador(colaborador);
                              setDetailsDialogOpen(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(colaborador);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(colaborador);
                            }}>
                              {colaborador.ativo ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setColaboradorToDelete(colaborador);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Cadastro/Edição Completo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
            </DialogTitle>
            <DialogDescription>
              {editingColaborador 
                ? 'Atualize as informações do colaborador' 
                : 'Preencha os dados para cadastrar um novo colaborador da equipe Toriq'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-180px)] overflow-y-auto pr-4">
            <Tabs defaultValue="pessoal" className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-muted/30">
                <TabsTrigger value="pessoal" className="text-xs">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="endereco" className="text-xs">Endereço</TabsTrigger>
                <TabsTrigger value="profissional" className="text-xs">Profissional</TabsTrigger>
                <TabsTrigger value="acesso" className="text-xs">Acesso</TabsTrigger>
                <TabsTrigger value="documentos" className="text-xs">Documentos</TabsTrigger>
                <TabsTrigger value="bancario" className="text-xs">Dados Bancários</TabsTrigger>
              </TabsList>

              {/* Aba Dados Pessoais */}
              <TabsContent value="pessoal" className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome completo do colaborador"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={maskCPF(formData.cpf)}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      placeholder="000.000.000-00"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                      placeholder="00.000.000-0"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sexo">Sexo</Label>
                    <Select
                      value={formData.sexo || undefined}
                      onValueChange={(value) => setFormData({ ...formData, sexo: value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="estado_civil">Estado Civil</Label>
                    <Select
                      value={formData.estado_civil || undefined}
                      onValueChange={(value) => setFormData({ ...formData, estado_civil: value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                        <SelectItem value="União Estável">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="nacionalidade">Nacionalidade</Label>
                    <Input
                      id="nacionalidade"
                      value={formData.nacionalidade}
                      onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                      placeholder="Brasileira"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="naturalidade">Naturalidade</Label>
                    <Input
                      id="naturalidade"
                      value={formData.naturalidade}
                      onChange={(e) => setFormData({ ...formData, naturalidade: e.target.value })}
                      placeholder="Cidade/Estado"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nome_mae">Nome da Mãe</Label>
                    <Input
                      id="nome_mae"
                      value={formData.nome_mae}
                      onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })}
                      placeholder="Nome completo da mãe"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nome_pai">Nome do Pai</Label>
                    <Input
                      id="nome_pai"
                      value={formData.nome_pai}
                      onChange={(e) => setFormData({ ...formData, nome_pai: e.target.value })}
                      placeholder="Nome completo do pai"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={maskPhone(formData.telefone)}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      placeholder="(00) 00000-0000"
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="col-span-3 border-t border-border pt-4 mt-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Contato de Emergência</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contato_emergencia">Nome do Contato</Label>
                        <Input
                          id="contato_emergencia"
                          value={formData.contato_emergencia}
                          onChange={(e) => setFormData({ ...formData, contato_emergencia: e.target.value })}
                          placeholder="Nome do contato de emergência"
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <Label htmlFor="telefone_emergencia">Telefone de Emergência</Label>
                        <Input
                          id="telefone_emergencia"
                          value={maskPhone(formData.telefone_emergencia)}
                          onChange={(e) => setFormData({ ...formData, telefone_emergencia: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                          placeholder="(00) 00000-0000"
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Aba Endereço */}
              <TabsContent value="endereco" className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={maskCEP(formData.cep)}
                      onChange={(e) => {
                        const newCep = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setFormData({ ...formData, cep: newCep });
                        if (newCep.length === 8) {
                          fetchAddressByCEP(newCep);
                        }
                      }}
                      placeholder="00000-000"
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      placeholder="Rua, Avenida..."
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="Nº"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento}
                      onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                      placeholder="Apto, Bloco..."
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                      placeholder="Bairro"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="Cidade"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Select
                      value={formData.estado || undefined}
                      onValueChange={(value) => setFormData({ ...formData, estado: value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Aba Profissional */}
              <TabsContent value="profissional" className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="matricula">Matrícula</Label>
                    <Input
                      id="matricula"
                      value={formData.matricula}
                      onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                      placeholder="Número da matrícula"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cargo">Cargo *</Label>
                    <Select
                      value={formData.cargo || undefined}
                      onValueChange={(value) => setFormData({ ...formData, cargo: value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {cargos.map((cargo) => (
                          <SelectItem key={cargo.id} value={cargo.nome}>
                            {cargo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="setor_input">Setor / Departamento *</Label>
                    <Select
                      value={formData.setor || undefined}
                      onValueChange={(value) => setFormData({ ...formData, setor: value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        {setores.map((setor) => (
                          <SelectItem key={setor.id} value={setor.nome}>
                            {setor.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="formacao">Formação Acadêmica</Label>
                    <Input
                      id="formacao"
                      value={formData.formacao}
                      onChange={(e) => setFormData({ ...formData, formacao: e.target.value })}
                      placeholder="Ex: Administração, Engenharia..."
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nivel_escolaridade_input">Nível de Escolaridade</Label>
                    <Input
                      id="nivel_escolaridade_input"
                      value={formData.nivel_escolaridade}
                      onChange={(e) => setFormData({ ...formData, nivel_escolaridade: e.target.value })}
                      placeholder="Ex: Superior, Técnico..."
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_admissao">Data de Admissão</Label>
                    <Input
                      id="data_admissao"
                      type="date"
                      value={formData.data_admissao}
                      onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tipo_contrato_input">Tipo de Contrato</Label>
                    <Input
                      id="tipo_contrato_input"
                      value={formData.tipo_contrato}
                      onChange={(e) => setFormData({ ...formData, tipo_contrato: e.target.value })}
                      placeholder="Ex: CLT, PJ, Estágio..."
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="carga_horaria">Carga Horária</Label>
                    <Input
                      id="carga_horaria"
                      value={formData.carga_horaria}
                      onChange={(e) => setFormData({ ...formData, carga_horaria: e.target.value })}
                      placeholder="Ex: 44h semanais"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="salario">Salário (R$)</Label>
                    <Input
                      id="salario"
                      type="number"
                      step="0.01"
                      value={formData.salario}
                      onChange={(e) => setFormData({ ...formData, salario: e.target.value })}
                      placeholder="0,00"
                      className="bg-background border-border"
                    />
                  </div>

                  {formData.setor === 'Comercial' && (
                    <div>
                      <Label htmlFor="comissao">Comissão %</Label>
                      <Input
                        id="comissao"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.comissao}
                        onChange={(e) => setFormData({ ...formData, comissao: e.target.value })}
                        placeholder="Ex: 5"
                        className="bg-background border-border"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                      className="h-4 w-4 rounded border-border"
                    />
                    <Label htmlFor="ativo" className="cursor-pointer">Colaborador Ativo</Label>
                  </div>

                  <div className="col-span-3">
                    <Label htmlFor="observacoes">Observações</Label>
                    <textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      placeholder="Observações adicionais sobre o colaborador..."
                      className="w-full min-h-[80px] px-3 py-2 rounded-md bg-background border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Acesso */}
              <TabsContent value="acesso" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-6">
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="tem_acesso_sistema"
                        checked={formData.tem_acesso_sistema}
                        onChange={(e) => setFormData({ ...formData, tem_acesso_sistema: e.target.checked })}
                        className="h-5 w-5 rounded border-border"
                      />
                      <div>
                        <Label htmlFor="tem_acesso_sistema" className="cursor-pointer text-base font-medium">
                          Habilitar Acesso ao Sistema
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Permite que o colaborador acesse o sistema com base no perfil definido
                        </p>
                      </div>
                    </div>

                    {formData.tem_acesso_sistema && (
                      <div className="space-y-4 pt-4 border-t border-border">
                        <div>
                          <Label htmlFor="perfil_acesso">Perfil de Acesso</Label>
                          <Select
                            value={formData.perfil_acesso || undefined}
                            onValueChange={(value) => setFormData({ ...formData, perfil_acesso: value })}
                          >
                            <SelectTrigger className="bg-background border-border mt-1">
                              <SelectValue placeholder="Selecione o perfil de acesso" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Administrativo">
                                <div className="flex flex-col">
                                  <span>Administrativo</span>
                                  <span className="text-xs text-muted-foreground">Gestão de documentos e cadastros</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Financeiro">
                                <div className="flex flex-col">
                                  <span>Financeiro</span>
                                  <span className="text-xs text-muted-foreground">Controle financeiro e faturamento</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Comercial">
                                <div className="flex flex-col">
                                  <span>Comercial</span>
                                  <span className="text-xs text-muted-foreground">Prospecção e vendas</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="TI">
                                <div className="flex flex-col">
                                  <span>TI</span>
                                  <span className="text-xs text-muted-foreground">Acesso técnico e desenvolvimento</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Diretoria">
                                <div className="flex flex-col">
                                  <span>Diretoria</span>
                                  <span className="text-xs text-muted-foreground">Acesso completo ao sistema</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="p-3 rounded-md bg-muted/30 border border-border">
                          <div className="flex items-start gap-2">
                            <Shield className="h-4 w-4 text-primary mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-primary">Permissões por Setor</p>
                              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                                <li><strong>Administrativo:</strong> Cadastros, documentos, relatórios básicos</li>
                                <li><strong>Financeiro:</strong> Faturamento, contas, relatórios financeiros</li>
                                <li><strong>Comercial:</strong> Prospecção, leads, propostas, clientes</li>
                                <li><strong>TI:</strong> Configurações, integrações, suporte técnico</li>
                                <li><strong>Diretoria:</strong> Acesso total a todos os módulos</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Aba Documentos */}
              <TabsContent value="documentos" className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="pis">PIS/PASEP</Label>
                    <Input
                      id="pis"
                      value={formData.pis}
                      onChange={(e) => setFormData({ ...formData, pis: e.target.value })}
                      placeholder="000.00000.00-0"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ctps">CTPS (Número)</Label>
                    <Input
                      id="ctps"
                      value={formData.ctps}
                      onChange={(e) => setFormData({ ...formData, ctps: e.target.value })}
                      placeholder="Número da CTPS"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ctps_serie">CTPS (Série)</Label>
                    <Input
                      id="ctps_serie"
                      value={formData.ctps_serie}
                      onChange={(e) => setFormData({ ...formData, ctps_serie: e.target.value })}
                      placeholder="Série da CTPS"
                      className="bg-background border-border"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Dados Bancários */}
              <TabsContent value="bancario" className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="banco">Banco</Label>
                    <Input
                      id="banco"
                      value={formData.banco}
                      onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                      placeholder="Nome do banco"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="agencia">Agência</Label>
                    <Input
                      id="agencia"
                      value={formData.agencia}
                      onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                      placeholder="0000"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="conta">Conta</Label>
                    <Input
                      id="conta"
                      value={formData.conta}
                      onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                      placeholder="00000-0"
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                    <Select
                      value={formData.tipo_conta || undefined}
                      onValueChange={(value) => setFormData({ ...formData, tipo_conta: value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Corrente">Corrente</SelectItem>
                        <SelectItem value="Poupança">Poupança</SelectItem>
                        <SelectItem value="Salário">Salário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="pix">Chave PIX</Label>
                    <Input
                      id="pix"
                      value={formData.pix}
                      onChange={(e) => setFormData({ ...formData, pix: e.target.value })}
                      placeholder="CPF, E-mail, Telefone ou Chave aleatória"
                      className="bg-background border-border"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90">
              {editingColaborador ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span>{selectedColaborador?.nome}</span>
                <Badge 
                  className={`ml-2 ${selectedColaborador?.ativo 
                    ? 'bg-success/15 text-success border-success/30' 
                    : 'bg-error/15 text-error border-error/30'
                  }`}
                >
                  {selectedColaborador?.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedColaborador && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="bg-muted/30">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="access">Acessos</TabsTrigger>
                <TabsTrigger value="docs">Documentos</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Matrícula</p>
                      <p className="font-medium">{selectedColaborador.matricula || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">CPF</p>
                      <p className="font-medium">{selectedColaborador.cpf ? formatCPF(selectedColaborador.cpf) : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cargo</p>
                      <p className="font-medium">{selectedColaborador.cargo || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Setor</p>
                      <p className="font-medium">{selectedColaborador.setor || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="font-medium">{selectedColaborador.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{selectedColaborador.telefone ? formatPhone(selectedColaborador.telefone) : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Data de Admissão</p>
                      <p className="font-medium">
                        {selectedColaborador.data_admissao 
                          ? new Date(selectedColaborador.data_admissao).toLocaleDateString('pt-BR')
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Grupo Homogêneo</p>
                      <p className="font-medium">{selectedColaborador.grupo_homogeneo?.nome || '-'}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="access" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Gerenciamento de Acessos</p>
                  <p className="text-sm mb-4">Configure permissões e acessos do colaborador ao sistema</p>
                  <Button variant="outline" className="border-border">
                    <Shield className="h-4 w-4 mr-2" />
                    Configurar Acessos
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="docs" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Documentos do Colaborador</p>
                  <p className="text-sm mb-4">Visualize certificados, treinamentos e outros documentos</p>
                  <Button variant="outline" className="border-border">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Documentos
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
            <Button 
              onClick={() => {
                setDetailsDialogOpen(false);
                if (selectedColaborador) handleOpenDialog(selectedColaborador);
              }}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Colaborador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o colaborador <strong>{colaboradorToDelete?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Setores */}
      <AdminSetorDialog
        open={setorDialogOpen}
        onOpenChange={setSetorDialogOpen}
        empresaId={empresaId}
        onDataChange={fetchSetores}
      />

      {/* Dialog de Cargos */}
      <AdminCargoDialog
        open={cargoDialogOpen}
        onOpenChange={setCargoDialogOpen}
        empresaId={empresaId}
        onDataChange={fetchCargos}
      />
    </div>
  );
}
