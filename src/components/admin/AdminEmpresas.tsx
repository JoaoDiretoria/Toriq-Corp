import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Building2, Settings, Loader2, Plus, Pencil, Trash2, Search, UserPlus, Eye, User, X } from 'lucide-react';
import { EmpresaDetalhe } from './EmpresaDetalhe';
import { EmpresasImportExport } from './EmpresasImportExport';

interface EmpresaContato {
  id?: string;
  empresa_id?: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  linkedin: string;
  principal: boolean;
}

interface Empresa {
  id: string;
  nome: string;
  tipo: string;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  porte: string | null;
  site: string | null;
  linkedin: string | null;
  instagram: string | null;
}

interface Modulo {
  id: string;
  nome: string;
}

interface EmpresaModulo {
  modulo_id: string;
  ativo: boolean;
}

const tiposEmpresa = [
  { value: 'sst', label: 'SST' },
  { value: 'lead', label: 'Lead' },
];

// Tipos visíveis para o admin Toriq (exclui cliente_final e empresa_parceira)
const TIPOS_VISIVEIS = ['sst', 'lead'];

const estados = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const portesEmpresa = [
  { value: 'MEI', label: 'MEI - Microempreendedor Individual' },
  { value: 'ME', label: 'ME - Microempresa' },
  { value: 'EPP', label: 'EPP - Empresa de Pequeno Porte' },
  { value: 'MEDIO', label: 'Médio Porte' },
  { value: 'GRANDE', label: 'Grande Porte' },
];

interface EmpresaFormData {
  nome: string;
  tipo: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  porte: string;
  site: string;
  linkedin: string;
  instagram: string;
}

interface EmpresaFormFieldsProps {
  prefix: string;
  formData: EmpresaFormData;
  setFormData: React.Dispatch<React.SetStateAction<EmpresaFormData>>;
  onCepSearch: (cep: string) => void;
  buscandoCep: boolean;
  onCnpjSearch: (cnpj: string) => void;
  buscandoCnpj: boolean;
  isEditing?: boolean;
}

const EmpresaFormFields = ({ prefix, formData, setFormData, onCepSearch, buscandoCep, onCnpjSearch, buscandoCnpj, isEditing = false }: EmpresaFormFieldsProps) => {
  const handleCepChange = (value: string) => {
    // Apply mask: 00000-000
    const cepLimpo = value.replace(/\D/g, '');
    let cepFormatado = cepLimpo;
    if (cepLimpo.length > 5) {
      cepFormatado = `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5, 8)}`;
    }
    setFormData({ ...formData, cep: cepFormatado });
    
    // Auto-search when 8 digits
    if (cepLimpo.length === 8) {
      onCepSearch(cepLimpo);
    }
  };

  const handleCnpjChange = (value: string) => {
    // Apply mask: 00.000.000/0000-00
    const cnpjLimpo = value.replace(/\D/g, '');
    let cnpjFormatado = cnpjLimpo;
    if (cnpjLimpo.length > 2) {
      cnpjFormatado = `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2)}`;
    }
    if (cnpjLimpo.length > 5) {
      cnpjFormatado = `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2, 5)}.${cnpjLimpo.slice(5)}`;
    }
    if (cnpjLimpo.length > 8) {
      cnpjFormatado = `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2, 5)}.${cnpjLimpo.slice(5, 8)}/${cnpjLimpo.slice(8)}`;
    }
    if (cnpjLimpo.length > 12) {
      cnpjFormatado = `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2, 5)}.${cnpjLimpo.slice(5, 8)}/${cnpjLimpo.slice(8, 12)}-${cnpjLimpo.slice(12, 14)}`;
    }
    setFormData({ ...formData, cnpj: cnpjFormatado });
    
    // Auto-search when 14 digits
    if (cnpjLimpo.length === 14) {
      onCnpjSearch(cnpjLimpo);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-cnpj`}>CNPJ</Label>
        <div className="relative">
          <Input
            id={`${prefix}-cnpj`}
            value={formData.cnpj || ''}
            onChange={(e) => handleCnpjChange(e.target.value)}
            placeholder="00.000.000/0000-00"
            maxLength={18}
          />
          {buscandoCnpj && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">Digite o CNPJ para buscar os dados automaticamente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-razao_social`}>Razão Social *</Label>
          <Input
            id={`${prefix}-razao_social`}
            value={formData.razao_social || ''}
            onChange={(e) => setFormData({ ...formData, razao_social: e.target.value, nome: e.target.value })}
            placeholder="Razão social da empresa"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-tipo`}>Tipo *</Label>
          <Select
            value={formData.tipo}
            onValueChange={(value) => setFormData({ ...formData, tipo: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {tiposEmpresa.map(tipo => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-nome_fantasia`}>Nome Fantasia</Label>
          <Input
            id={`${prefix}-nome_fantasia`}
            value={formData.nome_fantasia || ''}
            onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
            placeholder="Nome fantasia (opcional)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-telefone`}>Telefone</Label>
          <Input
            id={`${prefix}-telefone`}
            value={formData.telefone || ''}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-email`}>Email da Empresa</Label>
          <Input
            id={`${prefix}-email`}
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="contato@empresa.com"
          />
        </div>
      </div>

      <Separator className="my-4" />
      <p className="text-sm font-medium text-muted-foreground">Endereço</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-cep`}>CEP</Label>
          <div className="relative">
            <Input
              id={`${prefix}-cep`}
              value={formData.cep || ''}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
            />
            {buscandoCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-endereco`}>Logradouro</Label>
        <Input
          id={`${prefix}-endereco`}
          value={formData.endereco || ''}
          onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
          placeholder="Rua, Avenida, etc."
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-numero`}>Número</Label>
          <Input
            id={`${prefix}-numero`}
            value={formData.numero || ''}
            onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
            placeholder="Nº"
          />
        </div>
        <div className="space-y-2 col-span-1 md:col-span-3">
          <Label htmlFor={`${prefix}-complemento`}>Complemento</Label>
          <Input
            id={`${prefix}-complemento`}
            value={formData.complemento || ''}
            onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
            placeholder="Apto, Sala, Bloco..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-bairro`}>Bairro</Label>
          <Input
            id={`${prefix}-bairro`}
            value={formData.bairro || ''}
            onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
            placeholder="Bairro"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-cidade`}>Cidade</Label>
          <Input
            id={`${prefix}-cidade`}
            value={formData.cidade || ''}
            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
            placeholder="Cidade"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-estado`}>Estado</Label>
          <Select
            value={formData.estado}
            onValueChange={(value) => setFormData({ ...formData, estado: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {estados.map(uf => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-4" />
      <p className="text-sm font-medium text-muted-foreground">Informações Adicionais</p>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-porte`}>Porte da Empresa</Label>
        {isEditing ? (
          <Select
            value={formData.porte}
            onValueChange={(value) => setFormData({ ...formData, porte: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o porte" />
            </SelectTrigger>
            <SelectContent>
              {portesEmpresa.map(porte => (
                <SelectItem key={porte.value} value={porte.value}>
                  {porte.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={`${prefix}-porte`}
            value={formData.porte || ''}
            readOnly
            placeholder="Preenchido automaticamente via CNPJ"
            className="bg-muted"
          />
        )}
        {!isEditing && (
          <p className="text-xs text-muted-foreground">O porte será preenchido automaticamente ao buscar o CNPJ</p>
        )}
      </div>

      <Separator className="my-4" />
      <p className="text-sm font-medium text-muted-foreground">Redes Sociais (Opcional)</p>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-site`}>Site</Label>
        <Input
          id={`${prefix}-site`}
          value={formData.site || ''}
          onChange={(e) => setFormData({ ...formData, site: e.target.value })}
          placeholder="https://www.empresa.com.br"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-linkedin`}>LinkedIn</Label>
          <Input
            id={`${prefix}-linkedin`}
            value={formData.linkedin || ''}
            onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
            placeholder="https://linkedin.com/company/empresa"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-instagram`}>Instagram</Label>
          <Input
            id={`${prefix}-instagram`}
            value={formData.instagram || ''}
            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
            placeholder="https://instagram.com/empresa"
          />
        </div>
      </div>
    </>
  );
};

export function AdminEmpresas() {
  
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [empresaModulos, setEmpresaModulos] = useState<EmpresaModulo[]>([]);
  const [savingModulos, setSavingModulos] = useState(false);
  const [modulosDialogOpen, setModulosDialogOpen] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  
  // CRUD state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<Empresa | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [detalheEmpresa, setDetalheEmpresa] = useState<Empresa | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState<EmpresaFormData>({
    nome: '',
    tipo: '',
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    telefone: '',
    email: '',
    porte: '',
    site: '',
    linkedin: '',
    instagram: '',
  });

  // Contatos state
  const [contatos, setContatos] = useState<EmpresaContato[]>([]);
  const [contatosToDelete, setContatosToDelete] = useState<string[]>([]);

  // Admin creation state (for create dialog)
  const [criarAdmin, setCriarAdmin] = useState(false);
  const [adminData, setAdminData] = useState({
    nome: '',
    email: '',
    password: '',
  });

  // Admin creation state (for edit dialog)
  const [empresaTemAdmin, setEmpresaTemAdmin] = useState(false);
  const [criarAdminEdit, setCriarAdminEdit] = useState(false);
  const [adminDataEdit, setAdminDataEdit] = useState({
    nome: '',
    email: '',
    password: '',
  });
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  useEffect(() => {
    fetchModulos();
  }, []);

  // Buscar empresas quando página, filtros ou itemsPerPage mudam
  useEffect(() => {
    fetchEmpresas();
  }, [currentPage, itemsPerPage, searchTerm, tipoFilter]);

  const fetchEmpresas = async () => {
    setLoading(true);
    
    // Construir query base
    let query = supabase
      .from('empresas')
      .select('*', { count: 'exact' });
    
    // Aplicar filtro de tipo - Toriq só vê SST e Lead
    if (tipoFilter !== 'todos') {
      query = query.eq('tipo', tipoFilter as any);
    } else {
      query = query.in('tipo', TIPOS_VISIVEIS as any);
    }
    
    // Aplicar filtro de busca (nome, razao_social, nome_fantasia ou CNPJ)
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      query = query.or(`nome.ilike.%${term}%,razao_social.ilike.%${term}%,nome_fantasia.ilike.%${term}%,cnpj.ilike.%${term}%`);
    }
    
    // Aplicar ordenação e paginação
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    const { data, error, count } = await query
      .order('nome')
      .range(from, to);
    
    if (error) {
      toast.error('Erro ao carregar empresas');
      console.error('[AdminEmpresas] Erro:', error);
    } else {
      setEmpresas((data as unknown as Empresa[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const fetchModulos = async () => {
    const { data, error } = await supabase.from('modulos').select('id, nome').order('nome');
    if (error) {
      console.error(error);
    } else {
      setModulos(data || []);
    }
  };

  const buscarCep = useCallback(async (cep: string) => {
    if (cep.length !== 8) return;
    
    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
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
        toast.success('Endereço encontrado!');
      } else {
        toast.error('CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setBuscandoCep(false);
    }
  }, []);

  const buscarCnpj = useCallback(async (cnpj: string) => {
    if (cnpj.length !== 14) return;
    
    setBuscandoCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      
      if (response.status === 429) {
        toast.error('Limite de consultas atingido. Aguarde um momento.');
        return;
      }
      
      if (response.status === 404) {
        toast.error('CNPJ não encontrado');
        return;
      }
      
      const data = await response.json();
      
      if (data.razao_social) {
        // Determinar porte baseado no codigo_porte da BrasilAPI
        let porte = '';
        const codigoPorte = data.codigo_porte;
        const porteDescricao = data.porte?.toUpperCase() || '';
        const isMei = data.opcao_pelo_mei === true;
        
        if (isMei) {
          porte = 'MEI';
        } else if (codigoPorte === 1 || porteDescricao.includes('MICRO')) {
          porte = 'ME';
        } else if (codigoPorte === 3 || porteDescricao.includes('PEQUENO')) {
          porte = 'EPP';
        } else if (codigoPorte === 5) {
          const capitalSocial = data.capital_social || 0;
          porte = capitalSocial > 300000000 ? 'GRANDE' : 'MEDIO';
        }
        
        // Formatar CEP
        const cepFormatado = data.cep ? `${data.cep.slice(0, 5)}-${data.cep.slice(5)}` : '';
        
        setFormData(prev => ({
          ...prev,
          nome: data.nome_fantasia || data.razao_social || prev.nome,
          razao_social: data.razao_social || prev.razao_social,
          nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
          telefone: data.ddd_telefone_1 || prev.telefone,
          email: data.email?.toLowerCase() || prev.email,
          cep: cepFormatado || prev.cep,
          endereco: data.logradouro || prev.endereco,
          numero: data.numero || prev.numero,
          complemento: data.complemento || prev.complemento,
          bairro: data.bairro || prev.bairro,
          cidade: data.municipio || prev.cidade,
          estado: data.uf || prev.estado,
          porte: porte || prev.porte,
        }));
        toast.success('Dados da empresa encontrados!');
      } else {
        toast.error('Não foi possível obter os dados da empresa');
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast.error('Erro ao buscar dados do CNPJ');
    } finally {
      setBuscandoCnpj(false);
    }
  }, []);

  // CREATE
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.tipo) {
      toast.error('Preencha os campos obrigatórios: Nome e Tipo');
      return;
    }

    if (criarAdmin && (!adminData.nome || !adminData.email || !adminData.password)) {
      toast.error('Preencha todos os dados do administrador');
      return;
    }

    if (criarAdmin && adminData.password.length < 6) {
      toast.error('A senha do administrador deve ter pelo menos 6 caracteres');
      return;
    }
    
    setSaving(true);
    
    try {
      // Determine the role based on company type
      const roleMap: { [key: string]: string } = {
        'cliente_final': 'cliente_final',
        'sst': 'empresa_sst',
        'vertical_on': 'admin_vertical',
        'empresa_parceira': 'empresa_parceira',
      };

      // Create empresa
      const { data: empresaData, error: empresaError } = await supabase.from('empresas').insert({
        nome: formData.nome,
        tipo: formData.tipo as 'cliente_final' | 'sst' | 'vertical_on' | 'empresa_parceira' | 'lead',
        cnpj: formData.cnpj || null,
        razao_social: formData.razao_social || null,
        nome_fantasia: formData.nome_fantasia || null,
        cep: formData.cep || null,
        endereco: formData.endereco || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        telefone: formData.telefone || null,
        email: formData.email || null,
        porte: formData.porte || null,
        site: formData.site || null,
        linkedin: formData.linkedin || null,
        instagram: formData.instagram || null,
      }).select().single();

      if (empresaError) {
        throw new Error('Erro ao cadastrar empresa: ' + empresaError.message);
      }

      if (!empresaData) {
        throw new Error('Erro ao cadastrar empresa: não foi possível recuperar os dados da empresa criada. Verifique as permissões.');
      }

      // Save contatos if any
      if (contatos.length > 0 && empresaData) {
        const contatosToInsert = contatos.map(c => ({
          empresa_id: empresaData.id,
          nome: c.nome,
          cargo: c.cargo || null,
          email: c.email || null,
          telefone: c.telefone || null,
          linkedin: c.linkedin || null,
          principal: c.principal || false,
        }));

        const { error: contatosError } = await (supabase as any)
          .from('empresa_contatos')
          .insert(contatosToInsert);

        if (contatosError) {
          console.error('Erro ao salvar contatos:', contatosError);
          toast.warning('Empresa criada, mas houve erro ao salvar alguns contatos');
        }
      }

      // Create admin user if requested
      if (criarAdmin && empresaData) {
        const { data: sessionData } = await supabase.auth.getSession();
        
        const response = await fetch(`https://xraggzqaddfiymqgrtha.supabase.co/functions/v1/admin-create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            email: adminData.email,
            password: adminData.password,
            nome: adminData.nome,
            role: roleMap[formData.tipo] || 'cliente_final',
            empresa_id: empresaData.id,
            send_invite: true,
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          // Empresa created but admin failed - inform user
          toast.warning(`Empresa criada, mas erro ao criar admin: ${result.error}`);
        } else {
          toast.success('Empresa e administrador criados com sucesso!');
        }
      } else {
        toast.success('Empresa cadastrada com sucesso!');
      }

      setCreateDialogOpen(false);
      resetForm();
      fetchEmpresas();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar empresa');
    }
    
    setSaving(false);
  };

  // UPDATE
  const openEditDialog = async (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setFormData({
      nome: empresa.nome,
      tipo: empresa.tipo,
      cnpj: empresa.cnpj || '',
      razao_social: empresa.razao_social || '',
      nome_fantasia: empresa.nome_fantasia || '',
      cep: empresa.cep || '',
      endereco: empresa.endereco || '',
      numero: empresa.numero || '',
      complemento: empresa.complemento || '',
      bairro: empresa.bairro || '',
      cidade: empresa.cidade || '',
      estado: empresa.estado || '',
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      porte: empresa.porte || '',
      site: empresa.site || '',
      linkedin: empresa.linkedin || '',
      instagram: empresa.instagram || '',
    });
    
    // Reset admin edit states
    setCriarAdminEdit(false);
    setAdminDataEdit({ nome: '', email: '', password: '' });
    setCheckingAdmin(true);
    setEditDialogOpen(true);
    setContatosToDelete([]);
    
    // Load contatos
    const { data: contatosData } = await (supabase as any)
      .from('empresa_contatos')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('principal', { ascending: false });
    
    setContatos((contatosData as unknown as EmpresaContato[]) || []);
    
    // Check if empresa already has admin
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('empresa_id', empresa.id)
      .limit(1);
    
    setEmpresaTemAdmin(admins && admins.length > 0);
    setCheckingAdmin(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpresa || !formData.nome || !formData.tipo) {
      toast.error('Preencha os campos obrigatórios: Nome e Tipo');
      return;
    }

    // Validate admin fields if creating admin
    if (criarAdminEdit) {
      if (!adminDataEdit.nome || !adminDataEdit.email || !adminDataEdit.password) {
        toast.error('Preencha todos os dados do administrador');
        return;
      }
      if (adminDataEdit.password.length < 6) {
        toast.error('A senha do administrador deve ter pelo menos 6 caracteres');
        return;
      }
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('empresas')
      .update({
        nome: formData.nome,
        tipo: formData.tipo as 'cliente_final' | 'sst' | 'vertical_on' | 'empresa_parceira' | 'lead',
        cnpj: formData.cnpj || null,
        razao_social: formData.razao_social || null,
        nome_fantasia: formData.nome_fantasia || null,
        cep: formData.cep || null,
        endereco: formData.endereco || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        telefone: formData.telefone || null,
        email: formData.email || null,
        porte: formData.porte || null,
        site: formData.site || null,
        linkedin: formData.linkedin || null,
        instagram: formData.instagram || null,
      })
      .eq('id', selectedEmpresa.id);

    if (error) {
      toast.error('Erro ao atualizar empresa: ' + error.message);
      setSaving(false);
      return;
    }

    // Handle contatos - delete removed ones
    if (contatosToDelete.length > 0) {
      await (supabase as any)
        .from('empresa_contatos')
        .delete()
        .in('id', contatosToDelete);
    }

    // Update existing and insert new contatos
    for (const contato of contatos) {
      if (contato.id) {
        // Update existing
        await (supabase as any)
          .from('empresa_contatos')
          .update({
            nome: contato.nome,
            cargo: contato.cargo || null,
            email: contato.email || null,
            telefone: contato.telefone || null,
            linkedin: contato.linkedin || null,
            principal: contato.principal || false,
          })
          .eq('id', contato.id);
      } else {
        // Insert new
        await (supabase as any)
          .from('empresa_contatos')
          .insert({
            empresa_id: selectedEmpresa.id,
            nome: contato.nome,
            cargo: contato.cargo || null,
            email: contato.email || null,
            telefone: contato.telefone || null,
            linkedin: contato.linkedin || null,
            principal: contato.principal || false,
          });
      }
    }

    // Create admin if requested
    if (criarAdminEdit) {
      const roleMap: { [key: string]: string } = {
        'cliente_final': 'cliente_final',
        'sst': 'empresa_sst',
        'vertical_on': 'admin_vertical',
        'empresa_parceira': 'empresa_parceira',
      };

      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(`https://xraggzqaddfiymqgrtha.supabase.co/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          email: adminDataEdit.email,
          password: adminDataEdit.password,
          nome: adminDataEdit.nome,
          role: roleMap[formData.tipo] || 'cliente_final',
          empresa_id: selectedEmpresa.id,
          send_invite: true,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        toast.warning(`Empresa atualizada, mas erro ao criar admin: ${result.error}`);
      } else {
        toast.success('Empresa atualizada e administrador criado com sucesso!');
      }
    } else {
      toast.success('Empresa atualizada com sucesso!');
    }

    setEditDialogOpen(false);
    resetForm();
    fetchEmpresas();
    setSaving(false);
  };

  // DELETE
  const openDeleteDialog = (empresa: Empresa) => {
    setEmpresaToDelete(empresa);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!empresaToDelete) return;
    
    setDeleting(true);
    
    // Check if empresa has linked users or modules
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('empresa_id', empresaToDelete.id)
      .limit(1);
    
    const { data: empresasModulos } = await supabase
      .from('empresas_modulos')
      .select('id')
      .eq('empresa_id', empresaToDelete.id)
      .limit(1);

    if ((profiles && profiles.length > 0) || (empresasModulos && empresasModulos.length > 0)) {
      toast.error('Não é possível excluir: empresa possui usuários ou módulos vinculados');
      setDeleting(false);
      setDeleteDialogOpen(false);
      return;
    }

    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', empresaToDelete.id);

    if (error) {
      toast.error('Erro ao excluir empresa: ' + error.message);
    } else {
      toast.success('Empresa excluída com sucesso!');
      fetchEmpresas();
    }
    
    setDeleting(false);
    setDeleteDialogOpen(false);
    setEmpresaToDelete(null);
  };

  const resetForm = () => {
    setFormData({ 
      nome: '', 
      tipo: '', 
      cnpj: '', 
      razao_social: '',
      nome_fantasia: '',
      cep: '',
      endereco: '', 
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '', 
      estado: '', 
      telefone: '', 
      email: '',
      porte: '',
      site: '',
      linkedin: '',
      instagram: '',
    });
    setAdminData({ nome: '', email: '', password: '' });
    setCriarAdmin(false);
    setSelectedEmpresa(null);
    // Reset edit admin states
    setCriarAdminEdit(false);
    setAdminDataEdit({ nome: '', email: '', password: '' });
    setEmpresaTemAdmin(false);
    // Reset contatos
    setContatos([]);
    setContatosToDelete([]);
  };

  // MODULES
  const openModulosDialog = async (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    const { data, error } = await supabase
      .from('empresas_modulos')
      .select('modulo_id, ativo')
      .eq('empresa_id', empresa.id);

    if (error) {
      toast.error('Erro ao carregar módulos da empresa');
      console.error(error);
    } else {
      setEmpresaModulos(data || []);
    }
    setModulosDialogOpen(true);
  };

  const isModuloAtivo = (moduloId: string) => {
    const em = empresaModulos.find((e) => e.modulo_id === moduloId);
    return em?.ativo ?? false;
  };

  const toggleModulo = (moduloId: string) => {
    setEmpresaModulos((prev) => {
      const existing = prev.find((e) => e.modulo_id === moduloId);
      if (existing) {
        return prev.map((e) => (e.modulo_id === moduloId ? { ...e, ativo: !e.ativo } : e));
      }
      return [...prev, { modulo_id: moduloId, ativo: true }];
    });
  };

  const saveModulos = async () => {
    if (!selectedEmpresa) return;
    setSavingModulos(true);

    try {
      await supabase.from('empresas_modulos').delete().eq('empresa_id', selectedEmpresa.id);

      const activeModulos = empresaModulos.filter((em) => em.ativo);
      if (activeModulos.length > 0) {
        const { error } = await supabase.from('empresas_modulos').insert(
          activeModulos.map((em) => ({
            empresa_id: selectedEmpresa.id,
            modulo_id: em.modulo_id,
            ativo: true,
          }))
        );

        if (error) throw error;
      }

      toast.success('Módulos atualizados com sucesso!');
      setModulosDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar módulos');
    } finally {
      setSavingModulos(false);
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'sst':
        return <Badge variant="default">SST</Badge>;
      case 'vertical_on':
        return <Badge className="bg-primary hover:bg-primary/90">Toriq</Badge>;
      case 'empresa_parceira':
        return <Badge className="bg-warning hover:bg-warning/90">Empresa Parceira</Badge>;
      case 'lead':
        return <Badge className="bg-warning/80 hover:bg-warning/70">Lead</Badge>;
      default:
        return <Badge variant="secondary">Cliente Final</Badge>;
    }
  };


  // Paginação - cálculos
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  
  // Gerar números de páginas para exibição
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Loading inicial (primeira carga)
  const [initialLoading, setInitialLoading] = useState(true);
  
  useEffect(() => {
    if (!loading && initialLoading) {
      setInitialLoading(false);
    }
  }, [loading]);

  if (initialLoading && loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Empresas
        </h1>
        <div className="flex items-center gap-2">
          <EmpresasImportExport 
            empresas={empresas} 
            onImportSuccess={fetchEmpresas} 
          />
          <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <EmpresaFormFields 
                prefix="create" 
                formData={formData} 
                setFormData={setFormData}
                onCepSearch={buscarCep}
                buscandoCep={buscandoCep}
                onCnpjSearch={buscarCnpj}
                buscandoCnpj={buscandoCnpj}
              />
              
              <Separator className="my-4" />
              <p className="text-sm font-medium text-muted-foreground">Contatos da Empresa</p>
              
              {/* Contatos Section */}
              <div className="space-y-3">
                {contatos.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum contato cadastrado</p>
                ) : (
                  contatos.map((contato, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Contato {index + 1}</span>
                          {contato.principal && (
                            <Badge variant="secondary" className="text-xs">Principal</Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newContatos = contatos.filter((_, i) => i !== index);
                            setContatos(newContatos);
                            if (contato.id) {
                              setContatosToDelete([...contatosToDelete, contato.id]);
                            }
                          }}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome *</Label>
                          <Input
                            value={contato.nome || ''}
                            onChange={(e) => {
                              const newContatos = [...contatos];
                              newContatos[index].nome = e.target.value;
                              setContatos(newContatos);
                            }}
                            placeholder="Nome do contato"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cargo</Label>
                          <Input
                            value={contato.cargo || ''}
                            onChange={(e) => {
                              const newContatos = [...contatos];
                              newContatos[index].cargo = e.target.value;
                              setContatos(newContatos);
                            }}
                            placeholder="Cargo"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">E-mail</Label>
                          <Input
                            type="email"
                            value={contato.email || ''}
                            onChange={(e) => {
                              const newContatos = [...contatos];
                              newContatos[index].email = e.target.value;
                              setContatos(newContatos);
                            }}
                            placeholder="email@exemplo.com"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Telefone</Label>
                          <Input
                            value={contato.telefone || ''}
                            onChange={(e) => {
                              const newContatos = [...contatos];
                              newContatos[index].telefone = e.target.value;
                              setContatos(newContatos);
                            }}
                            placeholder="(00) 00000-0000"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs">LinkedIn</Label>
                          <Input
                            value={contato.linkedin || ''}
                            onChange={(e) => {
                              const newContatos = [...contatos];
                              newContatos[index].linkedin = e.target.value;
                              setContatos(newContatos);
                            }}
                            placeholder="https://linkedin.com/in/usuario"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`contato-principal-${index}`}
                          checked={contato.principal}
                          onCheckedChange={(checked) => {
                            const newContatos = contatos.map((c, i) => ({
                              ...c,
                              principal: i === index ? checked === true : false
                            }));
                            setContatos(newContatos);
                          }}
                        />
                        <label
                          htmlFor={`contato-principal-${index}`}
                          className="text-xs cursor-pointer"
                        >
                          Contato principal
                        </label>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setContatos([...contatos, {
                      nome: '',
                      cargo: '',
                      email: '',
                      telefone: '',
                      linkedin: '',
                      principal: contatos.length === 0
                    }]);
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Contato
                </Button>
              </div>
              
              <Separator className="my-4" />
              
              {/* Admin Creation Section */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="criar-admin"
                  checked={criarAdmin}
                  onCheckedChange={(checked) => setCriarAdmin(checked === true)}
                />
                <label
                  htmlFor="criar-admin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Criar administrador para esta empresa
                </label>
              </div>

              {criarAdmin && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">Dados do Administrador</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-nome">Nome *</Label>
                      <Input
                        id="admin-nome"
                        value={adminData.nome}
                        onChange={(e) => setAdminData({ ...adminData, nome: e.target.value })}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">Email *</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={adminData.email}
                        onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                        placeholder="admin@empresa.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Senha *</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminData.password}
                      onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O usuário será criado com a role apropriada para o tipo de empresa selecionado.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { resetForm(); setCreateDialogOpen(false); }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || !formData.tipo}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tiposEmpresa.map(tipo => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {empresas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma empresa encontrada
              </div>
            ) : (
              empresas.map((empresa) => (
                <div 
                  key={empresa.id} 
                  className="p-4 border rounded-lg space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setDetalheEmpresa(empresa)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{empresa.nome}</p>
                      <p className="text-sm text-muted-foreground">{empresa.cnpj || '-'}</p>
                      {empresa.cidade && empresa.estado && (
                        <p className="text-xs text-muted-foreground">{empresa.cidade} - {empresa.estado}</p>
                      )}
                    </div>
                    {getTipoBadge(empresa.tipo)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setDetalheEmpresa(empresa); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditDialog(empresa); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); openDeleteDialog(empresa); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block relative">
            {loading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma empresa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  empresas.map((empresa) => (
                    <TableRow 
                      key={empresa.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetalheEmpresa(empresa)}
                    >
                      <TableCell className="font-medium">{empresa.razao_social || empresa.nome}</TableCell>
                      <TableCell className="text-sm">{empresa.nome_fantasia || '-'}</TableCell>
                      <TableCell>{getTipoBadge(empresa.tipo)}</TableCell>
                      <TableCell>{empresa.cnpj || '-'}</TableCell>
                      <TableCell>
                        {empresa.cidade && empresa.estado 
                          ? `${empresa.cidade}/${empresa.estado}` 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); setDetalheEmpresa(empresa); }}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); openEditDialog(empresa); }}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(empresa); }}
                            title="Excluir"
                          >
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
          
          {/* Paginação */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Mostrando {empresas.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} empresas
              </span>
              <div className="flex items-center gap-2">
                <span>Itens por página:</span>
                <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || loading}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Primeira página</span>
                  ««
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Página anterior</span>
                  «
                </Button>
                {getPageNumbers().map((page, idx) =>
                  typeof page === 'number' ? (
                    <Button
                      key={idx}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      disabled={loading}
                      className="h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  ) : (
                    <span key={idx} className="px-1 text-muted-foreground">...</span>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Próxima página</span>
                  »
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || loading}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Última página</span>
                  »»
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <EmpresaFormFields 
              prefix="edit" 
              formData={formData} 
              setFormData={setFormData}
              onCepSearch={buscarCep}
              buscandoCep={buscandoCep}
              onCnpjSearch={buscarCnpj}
              buscandoCnpj={buscandoCnpj}
              isEditing={true}
            />
            
            <Separator className="my-4" />
            <p className="text-sm font-medium text-muted-foreground">Contatos da Empresa</p>
            
            {/* Contatos Section for Edit */}
            <div className="space-y-3">
              {contatos.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum contato cadastrado</p>
              ) : (
                contatos.map((contato, index) => (
                  <div key={contato.id || `new-${index}`} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Contato {index + 1}</span>
                        {contato.principal && (
                          <Badge variant="secondary" className="text-xs">Principal</Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newContatos = contatos.filter((_, i) => i !== index);
                          setContatos(newContatos);
                          if (contato.id) {
                            setContatosToDelete([...contatosToDelete, contato.id]);
                          }
                        }}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome *</Label>
                        <Input
                          value={contato.nome}
                          onChange={(e) => {
                            const newContatos = [...contatos];
                            newContatos[index].nome = e.target.value;
                            setContatos(newContatos);
                          }}
                          placeholder="Nome do contato"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cargo</Label>
                        <Input
                          value={contato.cargo}
                          onChange={(e) => {
                            const newContatos = [...contatos];
                            newContatos[index].cargo = e.target.value;
                            setContatos(newContatos);
                          }}
                          placeholder="Cargo"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">E-mail</Label>
                        <Input
                          type="email"
                          value={contato.email}
                          onChange={(e) => {
                            const newContatos = [...contatos];
                            newContatos[index].email = e.target.value;
                            setContatos(newContatos);
                          }}
                          placeholder="email@exemplo.com"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Telefone</Label>
                        <Input
                          value={contato.telefone}
                          onChange={(e) => {
                            const newContatos = [...contatos];
                            newContatos[index].telefone = e.target.value;
                            setContatos(newContatos);
                          }}
                          placeholder="(00) 00000-0000"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs">LinkedIn</Label>
                        <Input
                          value={contato.linkedin}
                          onChange={(e) => {
                            const newContatos = [...contatos];
                            newContatos[index].linkedin = e.target.value;
                            setContatos(newContatos);
                          }}
                          placeholder="https://linkedin.com/in/usuario"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-contato-principal-${index}`}
                        checked={contato.principal}
                        onCheckedChange={(checked) => {
                          const newContatos = contatos.map((c, i) => ({
                            ...c,
                            principal: i === index ? checked === true : false
                          }));
                          setContatos(newContatos);
                        }}
                      />
                      <label
                        htmlFor={`edit-contato-principal-${index}`}
                        className="text-xs cursor-pointer"
                      >
                        Contato principal
                      </label>
                    </div>
                  </div>
                ))
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setContatos([...contatos, {
                    nome: '',
                    cargo: '',
                    email: '',
                    telefone: '',
                    linkedin: '',
                    principal: contatos.length === 0
                  }]);
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Contato
              </Button>
            </div>
            
            <Separator className="my-4" />
            
            {/* Admin Creation Section for Edit */}
            {checkingAdmin ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando administradores...
              </div>
            ) : empresaTemAdmin ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                <UserPlus className="h-4 w-4" />
                Esta empresa já possui administrador vinculado
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="criar-admin-edit"
                    checked={criarAdminEdit}
                    onCheckedChange={(checked) => setCriarAdminEdit(checked === true)}
                  />
                  <label
                    htmlFor="criar-admin-edit"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Criar administrador para esta empresa
                  </label>
                </div>

                {criarAdminEdit && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">Dados do Administrador</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-edit-nome">Nome *</Label>
                        <Input
                          id="admin-edit-nome"
                          value={adminDataEdit.nome}
                          onChange={(e) => setAdminDataEdit({ ...adminDataEdit, nome: e.target.value })}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-edit-email">Email *</Label>
                        <Input
                          id="admin-edit-email"
                          type="email"
                          value={adminDataEdit.email}
                          onChange={(e) => setAdminDataEdit({ ...adminDataEdit, email: e.target.value })}
                          placeholder="admin@empresa.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-edit-password">Senha *</Label>
                      <Input
                        id="admin-edit-password"
                        type="password"
                        value={adminDataEdit.password}
                        onChange={(e) => setAdminDataEdit({ ...adminDataEdit, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O usuário será criado com a role apropriada para o tipo de empresa.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setEditDialogOpen(false); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !formData.tipo}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa <strong>{empresaToDelete?.nome}</strong>?
              <br /><br />
              Esta ação não poderá ser desfeita. A exclusão só será permitida se a empresa não possuir usuários ou módulos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modules Dialog */}
      <Dialog open={modulosDialogOpen} onOpenChange={setModulosDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Módulos - {selectedEmpresa?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {modulos.map((modulo) => (
              <div key={modulo.id} className="flex items-center space-x-3">
                <Checkbox
                  id={modulo.id}
                  checked={isModuloAtivo(modulo.id)}
                  onCheckedChange={() => toggleModulo(modulo.id)}
                />
                <label
                  htmlFor={modulo.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {modulo.nome}
                </label>
              </div>
            ))}
            {modulos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum módulo disponível</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModulosDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveModulos} disabled={savingModulos}>
              {savingModulos && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Empresa Detalhe */}
      {detalheEmpresa && (
        <EmpresaDetalhe
          empresa={detalheEmpresa}
          onClose={() => setDetalheEmpresa(null)}
          onUpdate={fetchEmpresas}
        />
      )}
    </div>
  );
}
