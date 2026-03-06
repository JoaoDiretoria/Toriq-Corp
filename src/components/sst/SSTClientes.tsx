import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useToast } from '@/hooks/use-toast';
import { useAccessLog } from '@/hooks/useAccessLog';
import { useTelaPermissoes } from '@/hooks/useTelaPermissoes';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Plus, Search, Pencil, Trash2, Package, Loader2, User, X, UserCircle, Building2, Users, MapPin, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ClientesImportExport } from './ClientesImportExport';

interface Profile {
  id: string;
  nome: string;
  email: string;
  role?: string;
}

interface Modulo {
  id: string;
  nome: string;
  descricao: string | null;
}

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

interface Cliente {
  id: string;
  nome: string;
  sigla: string | null;
  cnpj: string | null;
  responsavel: string | null;
  responsavel_id: string | null;
  email: string | null;
  telefone: string | null;
  cliente_empresa_id: string | null;
  responsavel_profile?: Profile | null;
  cliente_empresa?: Empresa | null;
  admin_profile?: Profile | null;
}

interface EmpresaModulo {
  modulo_id: string;
  ativo: boolean;
}

interface CategoriaCliente {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
}

interface Contato {
  id?: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  linkedin: string;
  principal: boolean;
}

interface SSTClientesProps {
  empresaIdOverride?: string;
}

export function SSTClientes({ empresaIdOverride }: SSTClientesProps = {}) {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logCreate, logUpdate, logDelete } = useAccessLog();
  const { podeEditar, podeCriar, verificarAntesDeEditar, verificarAntesDeCriar } = useTelaPermissoes('cadastros');
  
  // Usar empresa_id do modo empresa quando ativo
  const empresaId = empresaIdOverride || (isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [modulosDisponiveis, setModulosDisponiveis] = useState<Modulo[]>([]);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<CategoriaCliente[]>([]);
  const [origensContatoDisponiveis, setOrigensContatoDisponiveis] = useState<{id: string; nome: string; cor: string; ativo: boolean}[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [removeResponsavelDialogOpen, setRemoveResponsavelDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modulosDialogOpen, setModulosDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteModulos, setClienteModulos] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('todos');
  const [filterCategoria, setFilterCategoria] = useState<string>('todos');
  const [filterPorte, setFilterPorte] = useState<string>('todos');
  const [filterGrauRisco, setFilterGrauRisco] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [creatingUser, setCreatingUser] = useState(false);
  const [modulosSelecionados, setModulosSelecionados] = useState<string[]>([]);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    razao_social: '',
    nome_fantasia: '',
    sigla: '',
    tipo_inscricao: '1',
    numero_inscricao_esocial: '',
    cnae: '',
    cnae_atividade: '',
    grau_risco: '',
    porte_empresa: '',
    email: '',
    telefone: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    responsavel_id: '',
    categoria_id: '',
    origem_contato_id: '',
    possuiGestaoTreinamentos: 'nao',
    possuiPcmso: 'nao',
    medicoResponsavelId: '',
    criarAdmin: false,
    adminEmail: '',
    adminNome: '',
    adminSenha: '',
  });
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [contatos, setContatos] = useState<Contato[]>([{
    nome: '',
    cargo: '',
    email: '',
    telefone: '',
    linkedin: '',
    principal: true,
  }]);

  // Função para gerar sigla automática baseada no nome da empresa
  const gerarSiglaAutomatica = (nome: string, siglasExistentes: string[]): string => {
    if (!nome.trim()) return '';
    
    // Remove palavras comuns e preposições
    const palavrasIgnorar = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'com', 'ltda', 'me', 'epp', 'eireli', 's/a', 'sa', 'ss'];
    const palavras = nome
      .toUpperCase()
      .split(/\s+/)
      .filter(p => !palavrasIgnorar.includes(p.toLowerCase()) && p.length > 0);
    
    // Tenta gerar sigla com 3 letras primeiro
    let sigla = '';
    
    if (palavras.length >= 3) {
      // Pega a primeira letra de cada uma das 3 primeiras palavras
      sigla = palavras.slice(0, 3).map(p => p[0]).join('');
    } else if (palavras.length === 2) {
      // Pega primeira letra da primeira palavra e duas da segunda
      sigla = palavras[0][0] + palavras[1].slice(0, 2);
    } else if (palavras.length === 1) {
      // Pega as 3 primeiras letras da única palavra
      sigla = palavras[0].slice(0, 3);
    }
    
    // Verifica se a sigla já existe
    if (siglasExistentes.includes(sigla) && sigla.length === 3) {
      // Tenta com 4 letras
      if (palavras.length >= 4) {
        sigla = palavras.slice(0, 4).map(p => p[0]).join('');
      } else if (palavras.length >= 2) {
        sigla = palavras[0].slice(0, 2) + palavras[1].slice(0, 2);
      } else if (palavras.length === 1 && palavras[0].length >= 4) {
        sigla = palavras[0].slice(0, 4);
      }
    }
    
    return sigla.slice(0, 4);
  };

  const handleNomeChange = (nome: string) => {
    const siglasExistentes = clientes.map(c => c.sigla || '').filter(s => s);
    const novaSigla = gerarSiglaAutomatica(nome, siglasExistentes);
    setFormData(prev => ({ 
      ...prev, 
      nome,
      sigla: novaSigla
    }));
  };

  // Função para formatar CNPJ para exibição
  const formatarCnpjExibicao = (cnpj: string | null): string => {
    if (!cnpj) return '-';
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) return cnpj; // Retorna original se não for CNPJ válido
    return numeros
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  // Máscaras para diferentes tipos de inscrição
  const aplicarMascaraInscricao = (valor: string, tipo: string): string => {
    const numeros = valor.replace(/\D/g, '');
    
    switch (tipo) {
      case '1': // CNPJ: 00.000.000/0000-00
        return numeros
          .replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2')
          .slice(0, 18);
      case '2': // CPF: 000.000.000-00
        return numeros
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
          .slice(0, 14);
      case '3': // CAEPF: 000.000.000/000-00
        return numeros
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1/$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
          .slice(0, 18);
      case '4': // CNO: 00.000.00000/00
        return numeros
          .replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{5})(\d)/, '$1/$2')
          .slice(0, 15);
      case '5': // CGC: 00.000.000/0000-00 (mesmo formato CNPJ)
        return numeros
          .replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2')
          .slice(0, 18);
      case '6': // CEI: 00.000.00000/00
        return numeros
          .replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{5})(\d)/, '$1/$2')
          .slice(0, 15);
      default:
        return numeros;
    }
  };

  const getPlaceholderInscricao = (tipo: string): string => {
    switch (tipo) {
      case '1': return '00.000.000/0000-00';
      case '2': return '000.000.000-00';
      case '3': return '000.000.000/000-00';
      case '4': return '00.000.00000/00';
      case '5': return '00.000.000/0000-00';
      case '6': return '00.000.00000/00';
      default: return 'Número da inscrição';
    }
  };

  const formatTelefone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      if (numbers.length <= 10) {
        // Telefone fixo: (00) 0000-0000
        return numbers
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2')
          .slice(0, 14);
      } else {
        // Celular: (00) 00000-0000
        return numbers
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{5})(\d)/, '$1-$2')
          .slice(0, 15);
      }
    }
    return value.slice(0, 15);
  };

  const handleInscricaoChange = (valor: string) => {
    const valorFormatado = aplicarMascaraInscricao(valor, formData.tipo_inscricao);
    setFormData(prev => ({ ...prev, numero_inscricao_esocial: valorFormatado }));
    
    // Se for CNPJ e tiver 14 dígitos, buscar dados
    if (formData.tipo_inscricao === '1') {
      const numeros = valor.replace(/\D/g, '');
      if (numeros.length === 14) {
        buscarDadosCnpj(numeros);
      }
    }
  };

  const buscarDadosCnpj = async (cnpj: string) => {
    setBuscandoCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await response.json();
      
      if (!data.message) {
        // Mapear porte da API para o formato do sistema
        const mapearPorte = (porte: string): string => {
          if (!porte) return '';
          const porteUpper = porte.toUpperCase();
          if (porteUpper.includes('MEI') || porteUpper.includes('MICRO EMPREENDEDOR')) return 'MEI';
          if (porteUpper.includes('ME') || porteUpper.includes('MICRO EMPRESA')) return 'ME';
          if (porteUpper.includes('EPP') || porteUpper.includes('PEQUENO PORTE')) return 'EPP';
          if (porteUpper.includes('MEDIO') || porteUpper.includes('MÉDIO')) return 'Médio Porte';
          if (porteUpper.includes('GRANDE') || porteUpper.includes('DEMAIS')) return 'Grande Porte';
          return porte;
        };

        // Determinar grau de risco baseado no CNAE (simplificado)
        // Graus: 1 (baixo), 2 (médio-baixo), 3 (médio), 4 (alto)
        const determinarGrauRisco = (cnae: string): string => {
          if (!cnae) return '';
          const cnaeNum = String(cnae).replace(/\D/g, '');
          // CNAEs de serviços administrativos, educação, saúde geralmente são grau 1-2
          // CNAEs industriais, construção geralmente são grau 3-4
          const primeiroDigito = cnaeNum.charAt(0);
          switch (primeiroDigito) {
            case '0': return '3'; // Agricultura
            case '1': return '3'; // Indústrias extrativas
            case '2': return '3'; // Indústrias de transformação
            case '3': return '3'; // Indústrias de transformação
            case '4': return '3'; // Construção
            case '5': return '2'; // Comércio
            case '6': return '2'; // Transporte
            case '7': return '1'; // Informação e comunicação
            case '8': return '1'; // Atividades financeiras, imobiliárias, profissionais
            case '9': return '1'; // Administração pública, educação, saúde
            default: return '2';
          }
        };

        setFormData(prev => ({
          ...prev,
          nome: prev.nome || data.nome_fantasia || data.razao_social || '',
          razao_social: data.razao_social || prev.razao_social,
          nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
          email: prev.email || data.email || '',
          telefone: prev.telefone || data.ddd_telefone_1 || '',
          cep: data.cep ? data.cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') : prev.cep,
          endereco: data.logradouro || prev.endereco,
          numero: data.numero || prev.numero,
          complemento: data.complemento || prev.complemento,
          bairro: data.bairro || prev.bairro,
          cidade: data.municipio || prev.cidade,
          estado: data.uf || prev.estado,
          cnae: data.cnae_fiscal ? String(data.cnae_fiscal).replace(/(\d{4})(\d)(\d{2})/, '$1-$2/$3') : prev.cnae,
          cnae_atividade: data.cnae_fiscal_descricao || prev.cnae_atividade,
          porte_empresa: mapearPorte(data.porte) || prev.porte_empresa,
          grau_risco: determinarGrauRisco(data.cnae_fiscal) || prev.grau_risco,
        }));
        
        // Gerar sigla se nome foi preenchido
        if (data.razao_social || data.nome_fantasia) {
          const siglasExistentes = clientes.map(c => c.sigla || '').filter(s => s);
          const novaSigla = gerarSiglaAutomatica(data.razao_social || data.nome_fantasia, siglasExistentes);
          setFormData(prev => ({ ...prev, sigla: prev.sigla || novaSigla }));
        }
        
        toast({
          title: "Dados encontrados!",
          description: "Os campos foram preenchidos automaticamente.",
        });
      } else {
        toast({
          title: "CNPJ não encontrado",
          description: "Verifique o número e tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast({
        title: "Erro ao buscar CNPJ",
        description: "Não foi possível consultar os dados.",
        variant: "destructive",
      });
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const buscarCep = async (cep: string) => {
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
        toast({
          title: "Endereço encontrado!",
          description: "Os campos foram preenchidos automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro ao buscar CEP",
        variant: "destructive",
      });
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const cepLimpo = value.replace(/\D/g, '');
    let cepFormatado = cepLimpo;
    if (cepLimpo.length > 5) {
      cepFormatado = `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5, 8)}`;
    }
    setFormData(prev => ({ ...prev, cep: cepFormatado }));
    
    if (cepLimpo.length === 8) {
      buscarCep(cepLimpo);
    }
  };

  // Buscar apenas o total de clientes (para o card)
  const fetchTotalClientes = async () => {
    if (!empresaId) return;
    
    const { count, error } = await (supabase as any)
      .from('clientes_sst')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_sst_id', empresaId);

    if (!error && count !== null) {
      setTotalClientes(count);
    }
  };

  // Buscar clientes paginados do banco
  const fetchClientes = async () => {
    if (!empresaId) return;
    
    setLoadingData(true);
    
    try {
      // Calcular range para paginação no backend
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Construir query base
      let query = (supabase as any)
        .from('clientes_sst')
        .select(`
          *,
          responsavel_profile:profiles!clientes_sst_responsavel_id_fkey(id, nome, email),
          cliente_empresa:empresas!clientes_sst_cliente_empresa_id_fkey(id, nome, cnpj, razao_social, nome_fantasia, email, telefone, cep, endereco, numero, complemento, bairro, cidade, estado)
        `, { count: 'exact' })
        .eq('empresa_sst_id', empresaId);

      // Aplicar filtro de busca
      if (searchTerm.trim()) {
        const termo = searchTerm.trim();
        const termoLimpo = termo.replace(/[.\-\/]/g, '');
        query = query.or(`nome.ilike.%${termo}%,cnpj.ilike.%${termo}%,cnpj.ilike.%${termoLimpo}%,sigla.ilike.%${termo}%`);
      }

      // Aplicar filtros
      if (filterResponsavel !== 'todos') {
        if (filterResponsavel === 'sem_responsavel') {
          query = query.is('responsavel_id', null);
        } else {
          query = query.eq('responsavel_id', filterResponsavel);
        }
      }

      if (filterCategoria !== 'todos') {
        if (filterCategoria === 'sem_categoria') {
          query = query.is('categoria_id', null);
        } else {
          query = query.eq('categoria_id', filterCategoria);
        }
      }

      if (filterPorte !== 'todos') {
        if (filterPorte === 'sem_porte') {
          query = query.is('porte_empresa', null);
        } else {
          query = query.eq('porte_empresa', filterPorte);
        }
      }

      if (filterGrauRisco !== 'todos') {
        if (filterGrauRisco === 'sem_risco') {
          query = query.is('grau_risco', null);
        } else {
          query = query.eq('grau_risco', filterGrauRisco);
        }
      }

      // Ordenar e paginar
      query = query.order('nome').range(from, to);

      const { data, error, count } = await query;

      if (error) {
        toast({
          title: "Erro ao carregar clientes",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Buscar admins das empresas clientes (apenas para os resultados atuais)
      const clienteEmpresaIds = (data || [])
        .map((c: any) => c.cliente_empresa_id)
        .filter(Boolean);

      const adminsMap: Record<string, any> = {};
      if (clienteEmpresaIds.length > 0) {
        const uniqueIds = [...new Set(clienteEmpresaIds)] as string[];
        const { data: admins } = await supabase
          .from('profiles')
          .select('id, nome, email, empresa_id')
          .in('empresa_id', uniqueIds)
          .eq('role', 'cliente_final');
        
        if (admins) {
          admins.forEach((admin: any) => {
            if (!adminsMap[admin.empresa_id]) {
              adminsMap[admin.empresa_id] = admin;
            }
          });
        }
      }

      // Mapear dados para incluir sigla e admin
      const clientesFormatados = (data || []).map((c: any) => ({
        ...c,
        sigla: c.sigla || null,
        admin_profile: c.cliente_empresa_id ? adminsMap[c.cliente_empresa_id] || null : null
      }));
      
      setClientes(clientesFormatados);
      if (count !== null) {
        setTotalClientes(count);
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchUsuarios = async () => {
    if (!empresaId) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, role')
      .eq('empresa_id', empresaId)
      .eq('role', 'empresa_sst')
      .order('nome');

    if (error) {
      console.error('Erro ao carregar usuários:', error);
    } else {
      setUsuarios(data || []);
    }
  };


  const fetchModulosDisponiveis = async () => {
    if (!empresaId) return;
    
    // Buscar apenas os módulos que a empresa SST possui
    const { data, error } = await supabase
      .from('empresas_modulos')
      .select(`
        modulo_id,
        modulos(id, nome, descricao)
      `)
      .eq('empresa_id', empresaId)
      .eq('ativo', true);

    if (error) {
      console.error('Erro ao carregar módulos:', error);
    } else {
      const modulos = data?.map(em => em.modulos).filter(Boolean) as Modulo[];
      setModulosDisponiveis(modulos || []);
    }
  };

  const fetchCategoriasDisponiveis = async () => {
    if (!empresaId) return;
    
    const { data, error } = await (supabase as any)
      .from('categorias_clientes_empresa')
      .select('id, nome, cor, ativo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao carregar categorias:', error);
    } else {
      setCategoriasDisponiveis(data || []);
    }
  };

  const fetchOrigensContatoDisponiveis = async () => {
    if (!empresaId) return;
    
    const { data, error } = await (supabase as any)
      .from('origens_contato')
      .select('id, nome, cor, ativo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao carregar origens de contato:', error);
    } else {
      setOrigensContatoDisponiveis(data || []);
    }
  };

  // Carregar total e dados auxiliares ao montar
  useEffect(() => {
    if (empresaId) {
      fetchTotalClientes();
      fetchUsuarios();
      fetchModulosDisponiveis();
      fetchCategoriasDisponiveis();
      fetchOrigensContatoDisponiveis();
    }
  }, [empresaId]);

  // Carregar clientes quando página, filtros ou busca mudam
  useEffect(() => {
    if (empresaId) {
      const loadData = async () => {
        await fetchClientes();
        setInitialLoading(false);
      };
      loadData();
    }
  }, [empresaId, currentPage, itemsPerPage, searchTerm, filterResponsavel, filterCategoria, filterPorte, filterGrauRisco]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    setCreatingUser(true);

    try {
      // Extrair CNPJ do numero_inscricao_esocial se tipo for CNPJ
      const cnpjValue = formData.tipo_inscricao === '1' ? formData.numero_inscricao_esocial : null;
      
      // Verificar se CNPJ já existe APENAS entre os clientes da mesma empresa SST
      // Uma empresa pode ser cliente de múltiplas empresas SST, então só validamos duplicados dentro da mesma empresa SST
      if (cnpjValue) {
        const { data: existingCliente } = await supabase
          .from('clientes_sst')
          .select('id, nome')
          .eq('empresa_sst_id', empresaId)
          .eq('cnpj', cnpjValue)
          .maybeSingle();
        
        if (existingCliente) {
          toast({ 
            title: 'CNPJ já cadastrado', 
            description: `Este CNPJ já está cadastrado como cliente da sua empresa: "${existingCliente.nome}"`,
            variant: 'destructive' 
          });
          setCreatingUser(false);
          return;
        }
      }
      
      // 1. Criar empresa do tipo cliente_final
      const { data: novaEmpresa, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nome: formData.nome,
          cnpj: cnpjValue,
          razao_social: formData.razao_social || null,
          nome_fantasia: formData.nome_fantasia || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          cep: formData.cep || null,
          endereco: formData.endereco || null,
          numero: formData.numero || null,
          complemento: formData.complemento || null,
          bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        tipo: 'cliente_final' as const,
      })
        .select()
        .single();

      if (empresaError) throw empresaError;

      // 2. Criar registro em clientes_sst vinculando a empresa SST
      // Buscar nome do responsável se selecionado
      const responsavelSelecionado = formData.responsavel_id 
        ? usuarios.find(u => u.id === formData.responsavel_id) 
        : null;

      const { data: novoCliente, error: clienteError } = await (supabase as any)
        .from('clientes_sst')
        .insert({
          empresa_sst_id: empresaId,
          nome: formData.nome,
          sigla: formData.sigla || null,
          tipo_inscricao: formData.tipo_inscricao || null,
          numero_inscricao_esocial: formData.numero_inscricao_esocial || null,
          cnpj: cnpjValue,
          cnae: formData.cnae || null,
          cnae_atividade: formData.cnae_atividade || null,
          grau_risco: formData.grau_risco || null,
          porte_empresa: formData.porte_empresa || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          cliente_empresa_id: novaEmpresa.id,
          categoria_id: formData.categoria_id || null,
          origem_contato_id: formData.origem_contato_id || null,
          responsavel_id: formData.responsavel_id || null,
          responsavel: responsavelSelecionado?.nome || null,
          servicos_contratados: null,
          possui_pcmso: formData.possuiPcmso === 'sim',
          medico_responsavel_id: formData.medicoResponsavelId || null,
        })
        .select()
        .single();

      if (clienteError) throw clienteError;

      // 3. Adicionar módulos selecionados à empresa cliente
      if (modulosSelecionados.length > 0) {
        const { error: modulosError } = await supabase
          .from('empresas_modulos')
          .insert(
            modulosSelecionados.map(moduloId => ({
              empresa_id: novaEmpresa.id,
              modulo_id: moduloId,
              ativo: true,
            }))
          );

        if (modulosError) {
          console.error('Erro ao adicionar módulos:', modulosError);
        }
      }

      // 4. Criar admin da empresa se solicitado e vincular como responsável
      if (formData.criarAdmin && formData.adminEmail && formData.adminSenha) {
        // Verificar se há sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Erro",
            description: "Sessão expirada. Por favor, faça login novamente.",
            variant: "destructive",
          });
          return;
        }
        
        const { data: adminResponse, error: adminError } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: formData.adminEmail,
            password: formData.adminSenha,
            nome: formData.adminNome || formData.nome,
            role: 'cliente_final',
            empresa_id: novaEmpresa.id,
            send_invite: true,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (adminError) {
          toast({
            title: "Aviso",
            description: "Cliente criado, mas houve erro ao criar o admin: " + adminError.message,
            variant: "destructive",
          });
        } else if (adminResponse?.error) {
          toast({
            title: "Aviso",
            description: "Cliente criado, mas houve erro ao criar o admin: " + adminResponse.error,
            variant: "destructive",
          });
        } else if (adminResponse?.user?.id) {
          // Vincular o admin criado como responsável do cliente
          await supabase
            .from('clientes_sst')
            .update({
              responsavel_id: adminResponse.user.id,
              responsavel: formData.adminNome || formData.nome,
            })
            .eq('id', novoCliente.id);
          
          toast({
            title: "Sucesso",
            description: "Administrador criado e vinculado com sucesso!",
          });
        }
      }

      // 5. Salvar contatos
      await saveContatos(novoCliente.id);

      // Registrar log de criação
      logCreate('Perfil da Empresa', 'Meus Clientes', `Cliente "${formData.nome}" cadastrado`, { cliente_id: novoCliente.id });

      toast({
        title: "Cliente cadastrado",
        description: "O cliente foi adicionado com sucesso.",
      });
      setDialogOpen(false);
      resetForm();
      fetchClientes();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;

    setCreatingUser(true);

    try {
      // Atualizar empresa vinculada se existir
      // Extrair CNPJ do numero_inscricao_esocial se tipo for CNPJ
      const cnpjValue = formData.tipo_inscricao === '1' ? formData.numero_inscricao_esocial : null;
      
      if (selectedCliente.cliente_empresa_id) {
        const { error: empresaError } = await supabase
          .from('empresas')
          .update({
            nome: formData.nome,
            cnpj: cnpjValue,
            razao_social: formData.razao_social || null,
            nome_fantasia: formData.nome_fantasia || null,
            email: formData.email || null,
            telefone: formData.telefone || null,
            endereco: formData.endereco || null,
            numero: formData.numero || null,
            complemento: formData.complemento || null,
            bairro: formData.bairro || null,
            cidade: formData.cidade || null,
            estado: formData.estado || null,
            cep: formData.cep || null,
          })
          .eq('id', selectedCliente.cliente_empresa_id);

        if (empresaError) throw empresaError;
      }

      // Determinar responsável: prioridade para seleção manual, depois admin criado
      let novoResponsavelId: string | null = formData.responsavel_id || selectedCliente.responsavel_id;
      let novoResponsavelNome: string | null = formData.responsavel_id 
        ? usuarios.find(u => u.id === formData.responsavel_id)?.nome || null
        : selectedCliente.responsavel;

      if (formData.criarAdmin && formData.adminEmail && formData.adminSenha && selectedCliente.cliente_empresa_id) {
        // Verificar se há sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Erro",
            description: "Sessão expirada. Por favor, faça login novamente.",
            variant: "destructive",
          });
          return;
        }
        
        const { data: adminResponse, error: adminError } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: formData.adminEmail,
            password: formData.adminSenha,
            nome: formData.adminNome || 'Administrador',
            role: 'cliente_final',
            empresa_id: selectedCliente.cliente_empresa_id,
            send_invite: true,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (adminError) {
          toast({
            title: "Aviso",
            description: "Houve erro ao criar o admin: " + adminError.message,
            variant: "destructive",
          });
        } else if (adminResponse?.error) {
          toast({
            title: "Aviso",
            description: "Houve erro ao criar o admin: " + adminResponse.error,
            variant: "destructive",
          });
        } else if (adminResponse?.user?.id) {
          novoResponsavelId = adminResponse.user.id;
          novoResponsavelNome = formData.adminNome || 'Administrador';
          toast({
            title: "Sucesso",
            description: "Administrador criado com sucesso!",
          });
        }
      }

      // Atualizar registro em clientes_sst
      const { error: clienteError } = await (supabase as any)
        .from('clientes_sst')
        .update({
          nome: formData.nome,
          sigla: formData.sigla || null,
          tipo_inscricao: formData.tipo_inscricao || null,
          numero_inscricao_esocial: formData.numero_inscricao_esocial || null,
          cnpj: cnpjValue,
          cnae: formData.cnae || null,
          cnae_atividade: formData.cnae_atividade || null,
          grau_risco: formData.grau_risco || null,
          porte_empresa: formData.porte_empresa || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          responsavel_id: novoResponsavelId,
          responsavel: novoResponsavelNome,
          categoria_id: formData.categoria_id || null,
          origem_contato_id: formData.origem_contato_id || null,
          possui_pcmso: formData.possuiPcmso === 'sim',
          medico_responsavel_id: formData.medicoResponsavelId || null,
        })
        .eq('id', selectedCliente.id);

      if (clienteError) throw clienteError;

      // Atualizar contatos
      await updateContatos(selectedCliente.id);

      // Registrar log de atualização
      logUpdate('Perfil da Empresa', 'Meus Clientes', `Cliente "${formData.nome}" atualizado`, { cliente_id: selectedCliente.id });

      toast({
        title: "Cliente atualizado",
        description: "Os dados foram atualizados com sucesso.",
      });
      setEditDialogOpen(false);
      setSelectedCliente(null);
      resetForm();
      fetchClientes();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;

    try {
      // Guardar o ID da empresa para deletar depois
      const empresaId = selectedCliente.cliente_empresa_id;

      // Primeiro deletar o registro em clientes_sst
      const { error: clienteError } = await supabase
        .from('clientes_sst')
        .delete()
        .eq('id', selectedCliente.id);

      if (clienteError) throw clienteError;

      // Deletar a empresa associada para evitar CNPJs órfãos
      if (empresaId) {
        const { error: empresaError } = await supabase
          .from('empresas')
          .delete()
          .eq('id', empresaId);

        if (empresaError) {
          console.warn('Aviso: Não foi possível deletar a empresa associada:', empresaError.message);
        }
      }

      // Registrar log de exclusão
      logDelete('Perfil da Empresa', 'Meus Clientes', `Cliente "${selectedCliente.nome}" excluído`, { cliente_id: selectedCliente.id });

      toast({
        title: "Cliente excluído",
        description: "O cliente foi removido com sucesso.",
      });
      setDeleteDialogOpen(false);
      setSelectedCliente(null);
      fetchClientes();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    const emp = cliente.cliente_empresa;
    
    // Carregar contatos existentes
    const contatosExistentes = await fetchContatos(cliente.id);
    if (contatosExistentes.length > 0) {
      setContatos(contatosExistentes.map((c: any) => ({
        id: c.id,
        nome: c.nome || '',
        cargo: c.cargo || '',
        email: c.email || '',
        telefone: c.telefone || '',
        linkedin: c.linkedin || '',
        principal: c.principal || false,
      })));
    } else {
      setContatos([{
        nome: '',
        cargo: '',
        email: '',
        telefone: '',
        linkedin: '',
        principal: true,
      }]);
    }
    
    setFormData({
      nome: cliente.nome,
      razao_social: emp?.razao_social || '',
      nome_fantasia: emp?.nome_fantasia || '',
      sigla: (cliente as any).sigla || '',
      tipo_inscricao: (cliente as any).tipo_inscricao || '1',
      numero_inscricao_esocial: (cliente as any).numero_inscricao_esocial || '',
      cnae: (cliente as any).cnae || '',
      cnae_atividade: (cliente as any).cnae_atividade || '',
      grau_risco: (cliente as any).grau_risco || '',
      porte_empresa: (cliente as any).porte_empresa || '',
      email: cliente.email || emp?.email || '',
      telefone: cliente.telefone || emp?.telefone || '',
      cep: emp?.cep || '',
      endereco: emp?.endereco || '',
      numero: emp?.numero || '',
      complemento: emp?.complemento || '',
      bairro: emp?.bairro || '',
      cidade: emp?.cidade || '',
      estado: emp?.estado || '',
      responsavel_id: cliente.responsavel_id || '',
      categoria_id: (cliente as any).categoria_id || '',
      origem_contato_id: (cliente as any).origem_contato_id || '',
      possuiGestaoTreinamentos: (emp as any)?.possui_gestao_treinamentos ? 'sim' : 'nao',
      possuiPcmso: (cliente as any).possui_pcmso ? 'sim' : 'nao',
      medicoResponsavelId: (cliente as any).medico_responsavel_id || '',
      criarAdmin: false,
      adminEmail: '',
      adminNome: '',
      adminSenha: '',
    });
    
    setEditDialogOpen(true);
  };

  const handleRemoveResponsavel = async () => {
    if (!selectedCliente) return;
    
    try {
      const { error } = await supabase
        .from('clientes_sst')
        .update({
          responsavel_id: null,
          responsavel: null,
        })
        .eq('id', selectedCliente.id);

      if (error) throw error;

      setSelectedCliente({
        ...selectedCliente,
        responsavel_id: null,
        responsavel: null,
        responsavel_profile: null,
      });

      toast({
        title: "Responsável removido",
        description: "O responsável foi desvinculado com sucesso.",
      });
      
      setRemoveResponsavelDialogOpen(false);
      fetchClientes();
    } catch (error: any) {
      toast({
        title: "Erro ao remover responsável",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setDeleteDialogOpen(true);
  };

  const openModulosDialog = async (cliente: Cliente) => {
    if (!cliente.cliente_empresa_id) {
      toast({
        title: "Empresa não vinculada",
        description: "Este cliente não possui uma empresa vinculada para gerenciar módulos.",
        variant: "destructive",
      });
      return;
    }

    setSelectedCliente(cliente);

    // Buscar módulos ativos do cliente
    const { data, error } = await supabase
      .from('empresas_modulos')
      .select('modulo_id')
      .eq('empresa_id', cliente.cliente_empresa_id)
      .eq('ativo', true);

    if (error) {
      console.error('Erro ao carregar módulos do cliente:', error);
      setClienteModulos([]);
    } else {
      setClienteModulos(data?.map(m => m.modulo_id) || []);
    }

    setModulosDialogOpen(true);
  };

  const handleModuloToggle = (moduloId: string, checked: boolean) => {
    if (checked) {
      setClienteModulos([...clienteModulos, moduloId]);
    } else {
      setClienteModulos(clienteModulos.filter(id => id !== moduloId));
    }
  };

  const saveModulos = async () => {
    if (!selectedCliente?.cliente_empresa_id) return;

    try {
      // Remover todos os módulos atuais
      await supabase
        .from('empresas_modulos')
        .delete()
        .eq('empresa_id', selectedCliente.cliente_empresa_id);

      // Adicionar módulos selecionados
      if (clienteModulos.length > 0) {
        const { error } = await supabase
          .from('empresas_modulos')
          .insert(
            clienteModulos.map(moduloId => ({
              empresa_id: selectedCliente.cliente_empresa_id!,
              modulo_id: moduloId,
              ativo: true,
            }))
          );

        if (error) throw error;
      }

      toast({
        title: "Módulos atualizados",
        description: "Os módulos do cliente foram atualizados com sucesso.",
      });
      setModulosDialogOpen(false);
      setSelectedCliente(null);
      setClienteModulos([]);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar módulos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      razao_social: '',
      nome_fantasia: '',
      sigla: '',
      tipo_inscricao: '1',
      numero_inscricao_esocial: '',
      cnae: '',
      cnae_atividade: '',
      grau_risco: '',
      porte_empresa: '',
      email: '',
      telefone: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      responsavel_id: '',
      categoria_id: '',
      origem_contato_id: '',
      possuiGestaoTreinamentos: 'nao',
      possuiPcmso: 'nao',
      medicoResponsavelId: '',
      criarAdmin: false,
      adminEmail: '',
      adminNome: '',
      adminSenha: '',
    });
    setModulosSelecionados([]);
    setContatos([{
      nome: '',
      cargo: '',
      email: '',
      telefone: '',
      linkedin: '',
      principal: true,
    }]);
  };

  const addContato = () => {
    setContatos([...contatos, {
      nome: '',
      cargo: '',
      email: '',
      telefone: '',
      linkedin: '',
      principal: false,
    }]);
  };

  const removeContato = (index: number) => {
    if (contatos.length === 1) return;
    const newContatos = contatos.filter((_, i) => i !== index);
    // Se removeu o principal, definir o primeiro como principal
    if (contatos[index].principal && newContatos.length > 0) {
      newContatos[0].principal = true;
    }
    setContatos(newContatos);
  };

  const updateContato = (index: number, field: keyof Contato, value: string | boolean) => {
    const newContatos = [...contatos];
    if (field === 'principal' && value === true) {
      // Desmarcar todos os outros como principal
      newContatos.forEach((c, i) => {
        c.principal = i === index;
      });
    } else {
      (newContatos[index] as any)[field] = value;
    }
    setContatos(newContatos);
  };

  const saveContatos = async (clienteId: string) => {
    // Filtrar contatos que têm pelo menos o nome preenchido
    const contatosValidos = contatos.filter(c => c.nome.trim() !== '');
    if (contatosValidos.length === 0) return;

    try {
      const { error } = await (supabase as any)
        .from('cliente_contatos')
        .insert(
          contatosValidos.map(c => ({
            cliente_id: clienteId,
            nome: c.nome,
            cargo: c.cargo || null,
            email: c.email || null,
            telefone: c.telefone || null,
            linkedin: c.linkedin || null,
            principal: c.principal,
          }))
        );

      if (error) {
        console.error('Erro ao salvar contatos:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar contatos:', error);
    }
  };

  const fetchContatos = async (clienteId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('cliente_contatos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('principal', { ascending: false });

      if (error) {
        console.error('Erro ao buscar contatos:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      return [];
    }
  };

  const updateContatos = async (clienteId: string) => {
    // Deletar contatos existentes e inserir novos
    try {
      await (supabase as any)
        .from('cliente_contatos')
        .delete()
        .eq('cliente_id', clienteId);

      await saveContatos(clienteId);
    } catch (error) {
      console.error('Erro ao atualizar contatos:', error);
    }
  };

  // Paginação agora é feita no backend - clientes já vem paginados
  const totalPages = Math.ceil(totalClientes / itemsPerPage);
  const paginatedClientes = clientes; // Já vem paginado do backend

  // Resetar página quando filtros mudam
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
    setPageInputValue('1');
  };

  // Navegação de páginas
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
    setPageInputValue(String(validPage));
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputValue);
    if (!isNaN(page)) {
      goToPage(page);
    } else {
      setPageInputValue(String(currentPage));
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputBlur();
    }
  };

  // Lista de estados únicos (será carregada separadamente se necessário)
  const estadosUnicos: string[] = [];

  const getResponsavelNome = (cliente: Cliente) => {
    // Mostrar apenas se tem responsavel_id (usuário da SST vinculado)
    if (cliente.responsavel_id && cliente.responsavel_profile) {
      return cliente.responsavel_profile.nome;
    }
    // Se tem responsavel_id mas não carregou o profile, mostrar o nome salvo
    if (cliente.responsavel_id && cliente.responsavel) {
      return cliente.responsavel;
    }
    return '-';
  };

  const getResponsavelInfo = () => {
    if (!selectedCliente?.responsavel_id) return null;
    
    if (selectedCliente.responsavel_profile) {
      return selectedCliente.responsavel_profile;
    }
    
    // Fallback se não tiver perfil carregado
    if (selectedCliente.responsavel) {
      return { nome: selectedCliente.responsavel, email: '' };
    }
    
    return null;
  };

  // Loading inicial - mostrar skeleton enquanto carrega
  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Clientes da Minha Empresa</h1>
        </div>
        
        {/* Card skeleton */}
        <div className="rounded-xl border bg-card p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <div className="h-8 w-8 bg-muted rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-8 w-24 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </div>
        </div>

        {/* Table skeleton */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <div className="flex gap-4">
              <div className="h-9 w-64 bg-muted rounded animate-pulse" />
              <div className="h-9 w-32 bg-muted rounded animate-pulse" />
              <div className="h-9 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="h-10 flex-1 bg-muted rounded" />
                <div className="h-10 w-32 bg-muted rounded" />
                <div className="h-10 w-24 bg-muted rounded" />
                <div className="h-10 w-32 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clientes da Minha Empresa</h1>
        <div className="flex gap-2">
          {empresaId && (
            <ClientesImportExport 
              clientes={clientes.map(c => ({
                ...c,
                tipo_inscricao: (c as any).tipo_inscricao,
                numero_inscricao_esocial: (c as any).numero_inscricao_esocial,
                cnae: (c as any).cnae,
                cnae_atividade: (c as any).cnae_atividade,
                grau_risco: (c as any).grau_risco,
                porte_empresa: (c as any).porte_empresa,
                categoria_id: (c as any).categoria_id,
                origem_contato_id: (c as any).origem_contato_id,
              }))} 
              empresaId={empresaId}
              usuarios={usuarios}
              categorias={categoriasDisponiveis}
              origensContato={origensContatoDisponiveis}
              onImportSuccess={fetchClientes} 
            />
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button
                disabled={!podeCriar}
                title={!podeCriar ? 'Você não tem permissão para criar novos registros' : 'Criar nova empresa'}
                onClick={(e) => {
                  if (!podeCriar) {
                    e.preventDefault();
                    verificarAntesDeCriar(() => {});
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input
                    id="razao_social"
                    value={formData.razao_social}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, razao_social: value, nome: value });
                      // Gerar sigla automaticamente
                      if (value && !formData.sigla) {
                        const siglasExistentes = clientes.map(c => c.sigla || '').filter(s => s);
                        const novaSigla = gerarSiglaAutomatica(value, siglasExistentes);
                        setFormData(prev => ({ ...prev, sigla: novaSigla, razao_social: value, nome: value }));
                      }
                    }}
                    placeholder="Razão social da empresa"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sigla">Sigla</Label>
                  <Input
                    id="sigla"
                    value={formData.sigla}
                    onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase().slice(0, 4) })}
                    placeholder="ABC"
                    maxLength={4}
                    className="text-center uppercase"
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    placeholder="Nome fantasia (opcional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_inscricao">Tipo Inscrição</Label>
                  <Select
                    value={formData.tipo_inscricao}
                    onValueChange={(value) => setFormData({ ...formData, tipo_inscricao: value, numero_inscricao_esocial: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1-CNPJ</SelectItem>
                      <SelectItem value="2">2-CPF</SelectItem>
                      <SelectItem value="3">3-CAEPF (Cadastro de Atividade Econômica de Pessoa Física)</SelectItem>
                      <SelectItem value="4">4-CNO (Cadastro Nacional de Obra)</SelectItem>
                      <SelectItem value="5">5-CGC</SelectItem>
                      <SelectItem value="6">6-CEI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="numero_inscricao_esocial">Nº Inscrição eSocial (CNPJ, CPF...)</Label>
                  <div className="relative">
                    <Input
                      id="numero_inscricao_esocial"
                      value={formData.numero_inscricao_esocial}
                      onChange={(e) => handleInscricaoChange(e.target.value)}
                      placeholder={getPlaceholderInscricao(formData.tipo_inscricao)}
                    />
                    {buscandoCnpj && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnae">CNAE</Label>
                  <Input
                    id="cnae"
                    value={formData.cnae}
                    onChange={(e) => setFormData({ ...formData, cnae: e.target.value })}
                    placeholder="0000-0/00"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cnae_atividade">CNAE Atividade</Label>
                  <Input
                    id="cnae_atividade"
                    value={formData.cnae_atividade}
                    onChange={(e) => setFormData({ ...formData, cnae_atividade: e.target.value })}
                    placeholder="Descrição da atividade econômica"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grau_risco">Grau de Risco</Label>
                  <Select
                    value={formData.grau_risco}
                    onValueChange={(value) => setFormData({ ...formData, grau_risco: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Risco Leve</SelectItem>
                      <SelectItem value="2">2 - Risco Moderado</SelectItem>
                      <SelectItem value="3">3 - Risco Alto</SelectItem>
                      <SelectItem value="4">4 - Risco Muito Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="porte_empresa">Porte da Empresa</Label>
                  <Select
                    value={formData.porte_empresa}
                    onValueChange={(value) => setFormData({ ...formData, porte_empresa: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEI">MEI - Microempreendedor Individual</SelectItem>
                      <SelectItem value="ME">ME - Microempresa</SelectItem>
                      <SelectItem value="EPP">EPP - Empresa de Pequeno Porte</SelectItem>
                      <SelectItem value="MEDIO">Médio Porte</SelectItem>
                      <SelectItem value="GRANDE">Grande Porte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
                {/* Seção Endereço */}
                <div className="md:col-span-3 pt-4 pb-2 border-t mt-2">
                  <h4 className="text-base font-semibold text-primary">Endereço</h4>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="relative">
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {buscandoCep && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco">Logradouro</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="Nº"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    placeholder="Apto, Sala, Bloco..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">AC</SelectItem>
                      <SelectItem value="AL">AL</SelectItem>
                      <SelectItem value="AP">AP</SelectItem>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="BA">BA</SelectItem>
                      <SelectItem value="CE">CE</SelectItem>
                      <SelectItem value="DF">DF</SelectItem>
                      <SelectItem value="ES">ES</SelectItem>
                      <SelectItem value="GO">GO</SelectItem>
                      <SelectItem value="MA">MA</SelectItem>
                      <SelectItem value="MT">MT</SelectItem>
                      <SelectItem value="MS">MS</SelectItem>
                      <SelectItem value="MG">MG</SelectItem>
                      <SelectItem value="PA">PA</SelectItem>
                      <SelectItem value="PB">PB</SelectItem>
                      <SelectItem value="PR">PR</SelectItem>
                      <SelectItem value="PE">PE</SelectItem>
                      <SelectItem value="PI">PI</SelectItem>
                      <SelectItem value="RJ">RJ</SelectItem>
                      <SelectItem value="RN">RN</SelectItem>
                      <SelectItem value="RS">RS</SelectItem>
                      <SelectItem value="RO">RO</SelectItem>
                      <SelectItem value="RR">RR</SelectItem>
                      <SelectItem value="SC">SC</SelectItem>
                      <SelectItem value="SP">SP</SelectItem>
                      <SelectItem value="SE">SE</SelectItem>
                      <SelectItem value="TO">TO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoria do Cliente */}
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="categoria">Categoria da Empresa</Label>
                  <Select
                    value={formData.categoria_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, categoria_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categoriasDisponiveis.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: categoria.cor }}
                            />
                            {categoria.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Origem de Contato */}
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="origem_contato">Origem do Contato</Label>
                  <Select
                    value={formData.origem_contato_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, origem_contato_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem do contato (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem origem definida</SelectItem>
                      {origensContatoDisponiveis.map((origem) => (
                        <SelectItem key={origem.id} value={origem.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: origem.cor }}
                            />
                            {origem.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Responsável pelo Cliente */}
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="responsavel_id">Responsável pela Empresa (opcional)</Label>
                  <Select
                    value={formData.responsavel_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, responsavel_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável definido</SelectItem>
                      {usuarios.map((usuario) => (
                        <SelectItem key={usuario.id} value={usuario.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {usuario.nome}
                            <span className="text-muted-foreground text-xs">({usuario.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Usuário da sua empresa SST que será responsável por este cliente
                  </p>
                </div>
              </div>

              {/* Seção de Contatos da Empresa */}
              <div className="border-t pt-4 space-y-4">
                <Label className="text-sm font-medium">Contatos da Empresa</Label>
                
                {contatos.map((contato, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Contato {index + 1}</span>
                        {contato.principal && (
                          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                            Principal
                          </span>
                        )}
                      </div>
                      {contatos.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeContato(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          onChange={(e) => updateContato(index, 'telefone', formatTelefone(e.target.value))}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>LinkedIn</Label>
                        <Input
                          value={contato.linkedin}
                          onChange={(e) => updateContato(index, 'linkedin', e.target.value)}
                          placeholder="https://linkedin.com/in/usuario"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`contato-principal-${index}`}
                        checked={contato.principal}
                        onCheckedChange={(checked) => updateContato(index, 'principal', !!checked)}
                      />
                      <Label htmlFor={`contato-principal-${index}`} className="font-normal cursor-pointer">
                        Contato principal
                      </Label>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addContato}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Contato
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gestão de Treinamentos Normativos */}
                <div className="space-y-2 md:col-span-3">
                  <Label>Terá gestão dos treinamentos normativos:</Label>
                  <RadioGroup
                    value={formData.possuiGestaoTreinamentos}
                    onValueChange={(value) => setFormData({ ...formData, possuiGestaoTreinamentos: value })}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="gestao-treinamentos-sim" />
                      <Label htmlFor="gestao-treinamentos-sim" className="font-normal cursor-pointer">
                        Sim
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="gestao-treinamentos-nao" />
                      <Label htmlFor="gestao-treinamentos-nao" className="font-normal cursor-pointer">
                        Não
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* PCMSO */}
                <div className="space-y-2 md:col-span-3">
                  <Label>Possui PCMSO:</Label>
                  <RadioGroup
                    value={formData.possuiPcmso}
                    onValueChange={(value) => setFormData({ ...formData, possuiPcmso: value, medicoResponsavelId: value === 'nao' ? '' : formData.medicoResponsavelId })}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="pcmso-sim" />
                      <Label htmlFor="pcmso-sim" className="font-normal cursor-pointer">
                        Sim
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="pcmso-nao" />
                      <Label htmlFor="pcmso-nao" className="font-normal cursor-pointer">
                        Não
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Médico Responsável - só aparece se PCMSO = Sim */}
                {formData.possuiPcmso === 'sim' && (
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="medicoResponsavel">Médico Responsável</Label>
                    <Select
                      value={formData.medicoResponsavelId}
                      onValueChange={(value) => setFormData({ ...formData, medicoResponsavelId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o médico responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuarios.filter(u => (u as any).cargo?.toLowerCase().includes('médico') || (u as any).cargo?.toLowerCase().includes('medico')).length > 0 ? (
                          usuarios.filter(u => (u as any).cargo?.toLowerCase().includes('médico') || (u as any).cargo?.toLowerCase().includes('medico')).map((usuario) => (
                            <SelectItem key={usuario.id} value={usuario.id}>
                              {usuario.nome}
                            </SelectItem>
                          ))
                        ) : (
                          usuarios.map((usuario) => (
                            <SelectItem key={usuario.id} value={usuario.id}>
                              {usuario.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="criarAdmin"
                    checked={formData.criarAdmin}
                    onCheckedChange={(checked) => setFormData({ ...formData, criarAdmin: !!checked })}
                  />
                  <Label htmlFor="criarAdmin" className="font-medium">
                    Criar usuário administrador para esta empresa
                  </Label>
                </div>

                {formData.criarAdmin && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="adminNome">Nome do Admin</Label>
                      <Input
                        id="adminNome"
                        value={formData.adminNome}
                        onChange={(e) => setFormData({ ...formData, adminNome: e.target.value })}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Email do Admin *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        required={formData.criarAdmin}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="adminSenha">Senha do Admin *</Label>
                      <Input
                        id="adminSenha"
                        type="password"
                        value={formData.adminSenha}
                        onChange={(e) => setFormData({ ...formData, adminSenha: e.target.value })}
                        required={formData.criarAdmin}
                        minLength={6}
                      />
                    </div>
                  </div>
                )}
                {formData.criarAdmin && (
                  <p className="text-sm text-muted-foreground mt-2 pl-6">
                    O administrador criado será automaticamente definido como responsável pela empresa.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creatingUser}>
                  {creatingUser ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Card de Total de Empresas - mostra contagem absoluta total */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => { 
          setFilterCategoria('todos'); 
          setFilterPorte('todos'); 
          setFilterGrauRisco('todos'); 
          setFilterEstado('todos'); 
          setFilterResponsavel('todos'); 
          setSearchTerm('');
          setCurrentPage(1); 
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-4xl font-bold text-foreground">{totalClientes.toLocaleString('pt-BR')}</p>
              <p className="text-sm text-muted-foreground">
                Total de Clientes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card principal com filtros e tabela */}
      <Card className="flex flex-col max-h-[calc(100vh-320px)] mb-16">
        <CardHeader className="flex-shrink-0 pb-4">
          {/* Filtros organizados */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Busca */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, CNPJ, sigla..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* Filtro Categoria */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select value={filterCategoria} onValueChange={(v) => handleFilterChange(setFilterCategoria, v)}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="sem_categoria">Sem categoria</SelectItem>
                  {categoriasDisponiveis.map((cat) => (
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

            {/* Filtro Porte */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Porte</Label>
              <Select value={filterPorte} onValueChange={(v) => handleFilterChange(setFilterPorte, v)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Porte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sem_porte">Sem porte</SelectItem>
                  <SelectItem value="MEI">MEI</SelectItem>
                  <SelectItem value="ME">ME</SelectItem>
                  <SelectItem value="EPP">EPP</SelectItem>
                  <SelectItem value="MEDIO">Médio Porte</SelectItem>
                  <SelectItem value="GRANDE">Grande Porte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Grau de Risco */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Grau de Risco</Label>
              <Select value={filterGrauRisco} onValueChange={(v) => handleFilterChange(setFilterGrauRisco, v)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sem_risco">Sem risco</SelectItem>
                  <SelectItem value="1">1 - Leve</SelectItem>
                  <SelectItem value="2">2 - Moderado</SelectItem>
                  <SelectItem value="3">3 - Alto</SelectItem>
                  <SelectItem value="4">4 - Muito Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Estado */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={filterEstado} onValueChange={(v) => handleFilterChange(setFilterEstado, v)}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {estadosUnicos.sort().map((estado) => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Responsável */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Select value={filterResponsavel} onValueChange={(v) => handleFilterChange(setFilterResponsavel, v)}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sem_responsavel">Sem responsável</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botão limpar filtros */}
            {(filterCategoria !== 'todos' || filterPorte !== 'todos' || filterGrauRisco !== 'todos' || filterEstado !== 'todos' || filterResponsavel !== 'todos' || searchTerm) && (
              <div className="space-y-1">
                <Label className="text-xs text-transparent">.</Label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setFilterCategoria('todos');
                    setFilterPorte('todos');
                    setFilterGrauRisco('todos');
                    setFilterEstado('todos');
                    setFilterResponsavel('todos');
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          {/* Container único com scroll - header sticky dentro */}
          <div className="flex-1 overflow-auto max-h-[calc(100vh-480px)] scrollbar-always-visible">
            <table className="w-full caption-bottom text-sm min-w-[1200px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-secondary/80 border-b border-border/50">
                  <th className="h-11 px-4 text-left align-middle font-semibold text-secondary-foreground bg-secondary/80 whitespace-nowrap">Razão Social</th>
                  <th className="h-11 px-4 text-left align-middle font-semibold text-secondary-foreground bg-secondary/80 whitespace-nowrap">Nome Fantasia</th>
                  <th className="h-11 px-4 text-center align-middle font-semibold text-secondary-foreground bg-secondary/80 whitespace-nowrap">Sigla</th>
                  <th className="h-11 px-4 text-left align-middle font-semibold text-secondary-foreground bg-secondary/80 whitespace-nowrap">CNPJ</th>
                  <th className="h-11 px-4 text-left align-middle font-semibold text-secondary-foreground bg-secondary/80 whitespace-nowrap">Cidade/UF</th>
                  <th className="h-11 px-4 text-left align-middle font-semibold text-secondary-foreground bg-secondary/80 whitespace-nowrap">Responsável (SST)</th>
                  <th className="h-11 px-4 text-left align-middle font-semibold text-secondary-foreground bg-secondary/80 whitespace-nowrap">Administrador</th>
                  <th className="h-11 px-4 text-right align-middle font-semibold text-secondary-foreground bg-secondary/80 whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr>
                    <td colSpan={8} className="p-8 align-middle text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">Carregando...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedClientes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 align-middle text-center text-muted-foreground">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                ) : (
                  paginatedClientes.map((cliente, index) => (
                    <tr 
                      key={cliente.id} 
                      className={`border-b border-border/30 transition-colors hover:bg-primary/5 ${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}
                    >
                      <td 
                        className="p-3 align-middle font-medium text-primary cursor-pointer hover:underline"
                        onClick={() => navigate(`/sst/cliente/${cliente.id}`)}
                      >
                        {cliente.cliente_empresa?.razao_social || cliente.nome}
                      </td>
                      <td className="p-3 align-middle text-sm text-foreground/80">{cliente.cliente_empresa?.nome_fantasia || '-'}</td>
                      <td className="p-3 align-middle text-center font-mono font-medium text-foreground/90">{cliente.sigla || '-'}</td>
                      <td className="p-3 align-middle font-mono text-sm text-foreground/80">{formatarCnpjExibicao(cliente.cnpj || cliente.cliente_empresa?.cnpj)}</td>
                      <td className="p-3 align-middle text-sm text-foreground/80">
                        {cliente.cliente_empresa?.cidade && cliente.cliente_empresa?.estado
                          ? `${cliente.cliente_empresa.cidade}/${cliente.cliente_empresa.estado}`
                          : '-'}
                      </td>
                      <td className="p-3 align-middle text-sm text-foreground/80">{getResponsavelNome(cliente)}</td>
                      <td className="p-3 align-middle text-sm text-foreground/80">{cliente.admin_profile?.nome || '-'}</td>
                      <td className="p-3 align-middle text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            onClick={() => verificarAntesDeEditar(() => openEditDialog(cliente))}
                            title={!podeEditar ? 'Você não tem permissão para editar' : 'Editar'}
                            disabled={!podeEditar}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => verificarAntesDeEditar(() => openDeleteDialog(cliente))}
                            title={!podeEditar ? 'Você não tem permissão para excluir' : 'Excluir'}
                            disabled={!podeEditar}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Paginação */}
          {totalClientes > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalClientes)} de {totalClientes.toLocaleString('pt-BR')} clientes</span>
                <span className="text-muted-foreground/50">|</span>
                <span>Por página:</span>
                <Select 
                  value={String(itemsPerPage)} 
                  onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); setPageInputValue('1'); }}
                >
                  <SelectTrigger className="w-[80px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="150">150</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  title="Primeira página"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1 mx-2">
                  <span className="text-sm text-muted-foreground">Página</span>
                  <Input
                    type="text"
                    value={pageInputValue}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputBlur}
                    onKeyDown={handlePageInputKeyDown}
                    className="w-14 h-8 text-center"
                  />
                  <span className="text-sm text-muted-foreground">de {totalPages || 1}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  title="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  title="Última página"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setSelectedCliente(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-razao_social">Razão Social *</Label>
                <Input
                  id="edit-razao_social"
                  value={formData.razao_social}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, razao_social: value, nome: value });
                    // Gerar sigla automaticamente se ainda não tiver
                    if (!formData.sigla) {
                      const siglasExistentes = clientes.map(c => c.sigla).filter(Boolean) as string[];
                      const novaSigla = gerarSiglaAutomatica(value, siglasExistentes);
                      setFormData(prev => ({ ...prev, razao_social: value, nome: value, sigla: novaSigla }));
                    }
                  }}
                  placeholder="Razão social da empresa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sigla">Sigla</Label>
                <Input
                  id="edit-sigla"
                  value={formData.sigla}
                  onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase().slice(0, 4) })}
                  placeholder="ABC"
                  maxLength={4}
                  className="text-center uppercase"
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="edit-nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="edit-nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  placeholder="Nome fantasia (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tipo_inscricao">Tipo Inscrição</Label>
                <Select
                  value={formData.tipo_inscricao}
                  onValueChange={(value) => setFormData({ ...formData, tipo_inscricao: value, numero_inscricao_esocial: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1-CNPJ</SelectItem>
                    <SelectItem value="2">2-CPF</SelectItem>
                    <SelectItem value="3">3-CAEPF (Cadastro de Atividade Econômica de Pessoa Física)</SelectItem>
                    <SelectItem value="4">4-CNO (Cadastro Nacional de Obra)</SelectItem>
                    <SelectItem value="5">5-CGC</SelectItem>
                    <SelectItem value="6">6-CEI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-numero_inscricao_esocial">Nº Inscrição eSocial (CNPJ, CPF...)</Label>
                <div className="relative">
                  <Input
                    id="edit-numero_inscricao_esocial"
                    value={formData.numero_inscricao_esocial}
                    onChange={(e) => handleInscricaoChange(e.target.value)}
                    placeholder={getPlaceholderInscricao(formData.tipo_inscricao)}
                  />
                  {buscandoCnpj && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cnae">CNAE</Label>
                <Input
                  id="edit-cnae"
                  value={formData.cnae}
                  onChange={(e) => setFormData({ ...formData, cnae: e.target.value })}
                  placeholder="0000-0/00"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-cnae_atividade">CNAE Atividade</Label>
                <Input
                  id="edit-cnae_atividade"
                  value={formData.cnae_atividade}
                  onChange={(e) => setFormData({ ...formData, cnae_atividade: e.target.value })}
                  placeholder="Descrição da atividade econômica"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-grau_risco">Grau de Risco</Label>
                <Select
                  value={formData.grau_risco}
                  onValueChange={(value) => setFormData({ ...formData, grau_risco: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Risco Leve</SelectItem>
                    <SelectItem value="2">2 - Risco Moderado</SelectItem>
                    <SelectItem value="3">3 - Risco Alto</SelectItem>
                    <SelectItem value="4">4 - Risco Muito Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-porte_empresa">Porte da Empresa</Label>
                <Select
                  value={formData.porte_empresa}
                  onValueChange={(value) => setFormData({ ...formData, porte_empresa: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEI">MEI - Microempreendedor Individual</SelectItem>
                    <SelectItem value="ME">ME - Microempresa</SelectItem>
                    <SelectItem value="EPP">EPP - Empresa de Pequeno Porte</SelectItem>
                    <SelectItem value="MEDIO">Médio Porte</SelectItem>
                    <SelectItem value="GRANDE">Grande Porte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input
                  id="edit-telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>

              {/* Seção Endereço na Edição */}
              <div className="md:col-span-3 pt-4 pb-2 border-t mt-2">
                <h4 className="text-base font-semibold text-primary">Endereço</h4>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="edit-cep"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {buscandoCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-endereco">Logradouro</Label>
                <Input
                  id="edit-endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, Avenida, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-numero">Número</Label>
                <Input
                  id="edit-numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Nº"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-complemento">Complemento</Label>
                <Input
                  id="edit-complemento"
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  placeholder="Apto, Sala, Bloco..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bairro">Bairro</Label>
                <Input
                  id="edit-bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="Bairro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cidade">Cidade</Label>
                <Input
                  id="edit-cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AC">AC</SelectItem>
                    <SelectItem value="AL">AL</SelectItem>
                    <SelectItem value="AP">AP</SelectItem>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="BA">BA</SelectItem>
                    <SelectItem value="CE">CE</SelectItem>
                    <SelectItem value="DF">DF</SelectItem>
                    <SelectItem value="ES">ES</SelectItem>
                    <SelectItem value="GO">GO</SelectItem>
                    <SelectItem value="MA">MA</SelectItem>
                    <SelectItem value="MT">MT</SelectItem>
                    <SelectItem value="MS">MS</SelectItem>
                    <SelectItem value="MG">MG</SelectItem>
                    <SelectItem value="PA">PA</SelectItem>
                    <SelectItem value="PB">PB</SelectItem>
                    <SelectItem value="PR">PR</SelectItem>
                    <SelectItem value="PE">PE</SelectItem>
                    <SelectItem value="PI">PI</SelectItem>
                    <SelectItem value="RJ">RJ</SelectItem>
                    <SelectItem value="RN">RN</SelectItem>
                    <SelectItem value="RS">RS</SelectItem>
                    <SelectItem value="RO">RO</SelectItem>
                    <SelectItem value="RR">RR</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                    <SelectItem value="SP">SP</SelectItem>
                    <SelectItem value="SE">SE</SelectItem>
                    <SelectItem value="TO">TO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Categoria do Cliente */}
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="categoria">Categoria da Empresa</Label>
                <Select
                  value={formData.categoria_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, categoria_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categoriasDisponiveis.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: categoria.cor }}
                          />
                          {categoria.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Origem de Contato */}
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="origem_contato">Origem do Contato</Label>
                <Select
                  value={formData.origem_contato_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, origem_contato_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem do contato (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem origem definida</SelectItem>
                    {origensContatoDisponiveis.map((origem) => (
                      <SelectItem key={origem.id} value={origem.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: origem.cor }}
                          />
                          {origem.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsável pelo Cliente */}
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="responsavel_id">Responsável pela Empresa (opcional)</Label>
                <Select
                  value={formData.responsavel_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, responsavel_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável definido</SelectItem>
                    {usuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {usuario.nome}
                          <span className="text-muted-foreground text-xs">({usuario.email})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Usuário da sua empresa SST que será responsável por este cliente
                </p>
              </div>
            </div>

            {/* Seção de Contatos da Empresa - Edição */}
            <div className="border-t pt-4 space-y-4">
              <Label className="text-sm font-medium">Contatos da Empresa</Label>
              
              {contatos.map((contato, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Contato {index + 1}</span>
                      {contato.principal && (
                        <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                    {contatos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeContato(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="space-y-2 md:col-span-2">
                      <Label>LinkedIn</Label>
                      <Input
                        value={contato.linkedin}
                        onChange={(e) => updateContato(index, 'linkedin', e.target.value)}
                        placeholder="https://linkedin.com/in/usuario"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-contato-principal-${index}`}
                      checked={contato.principal}
                      onCheckedChange={(checked) => updateContato(index, 'principal', !!checked)}
                    />
                    <Label htmlFor={`edit-contato-principal-${index}`} className="font-normal cursor-pointer">
                      Contato principal
                    </Label>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addContato}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Contato
              </Button>
            </div>

            {/* Seção PCMSO - Edição */}
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label>Possui PCMSO:</Label>
                  <RadioGroup
                    value={formData.possuiPcmso}
                    onValueChange={(value) => setFormData({ ...formData, possuiPcmso: value, medicoResponsavelId: value === 'nao' ? '' : formData.medicoResponsavelId })}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="edit-pcmso-sim" />
                      <Label htmlFor="edit-pcmso-sim" className="font-normal cursor-pointer">
                        Sim
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="edit-pcmso-nao" />
                      <Label htmlFor="edit-pcmso-nao" className="font-normal cursor-pointer">
                        Não
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.possuiPcmso === 'sim' && (
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="edit-medicoResponsavel">Médico Responsável</Label>
                    <Select
                      value={formData.medicoResponsavelId}
                      onValueChange={(value) => setFormData({ ...formData, medicoResponsavelId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o médico responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuarios.filter(u => (u as any).cargo?.toLowerCase().includes('médico') || (u as any).cargo?.toLowerCase().includes('medico')).length > 0 ? (
                          usuarios.filter(u => (u as any).cargo?.toLowerCase().includes('médico') || (u as any).cargo?.toLowerCase().includes('medico')).map((usuario) => (
                            <SelectItem key={usuario.id} value={usuario.id}>
                              {usuario.nome}
                            </SelectItem>
                          ))
                        ) : (
                          usuarios.map((usuario) => (
                            <SelectItem key={usuario.id} value={usuario.id}>
                              {usuario.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Seção Administrador */}
            <div className="border-t pt-4 space-y-4">
                {/* Exibir administrador existente */}
                {selectedCliente?.admin_profile && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <Label className="text-sm font-medium">Administrador Atual</Label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {selectedCliente.admin_profile.nome?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{selectedCliente.admin_profile.nome}</p>
                        <p className="text-sm text-muted-foreground">{selectedCliente.admin_profile.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-criarAdmin"
                    checked={formData.criarAdmin}
                    onCheckedChange={(checked) => setFormData({ ...formData, criarAdmin: !!checked })}
                  />
                  <Label htmlFor="edit-criarAdmin" className="font-medium cursor-pointer">
                    {selectedCliente?.admin_profile ? 'Criar novo administrador (substituirá o atual)' : 'Criar novo administrador para esta empresa cliente'}
                  </Label>
                </div>

                {formData.criarAdmin && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="edit-adminNome">Nome do Admin</Label>
                      <Input
                        id="edit-adminNome"
                        value={formData.adminNome}
                        onChange={(e) => setFormData({ ...formData, adminNome: e.target.value })}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-adminEmail">Email do Admin *</Label>
                      <Input
                        id="edit-adminEmail"
                        type="email"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        required={formData.criarAdmin}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="edit-adminSenha">Senha do Admin *</Label>
                      <Input
                        id="edit-adminSenha"
                        type="password"
                        value={formData.adminSenha}
                        onChange={(e) => setFormData({ ...formData, adminSenha: e.target.value })}
                        required={formData.criarAdmin}
                        minLength={6}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground md:col-span-2">
                      Este administrador terá acesso ao portal do cliente e será vinculado à empresa.
                    </p>
                  </div>
                )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingUser}>
                {creatingUser ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modulos Dialog */}
      <Dialog open={modulosDialogOpen} onOpenChange={(open) => { setModulosDialogOpen(open); if (!open) { setSelectedCliente(null); setClienteModulos([]); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Módulos - {selectedCliente?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os módulos que este cliente terá acesso. Apenas módulos disponíveis para sua empresa são listados.
            </p>
            {modulosDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sua empresa não possui módulos ativos para atribuir.
              </p>
            ) : (
              <div className="space-y-3">
                {modulosDisponiveis.map((modulo) => (
                  <div key={modulo.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`modulo-${modulo.id}`}
                      checked={clienteModulos.includes(modulo.id)}
                      onCheckedChange={(checked) => handleModuloToggle(modulo.id, !!checked)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={`modulo-${modulo.id}`} className="font-medium cursor-pointer">
                        {modulo.nome}
                      </Label>
                      {modulo.descricao && (
                        <p className="text-sm text-muted-foreground">{modulo.descricao}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModulosDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveModulos} disabled={modulosDisponiveis.length === 0}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{selectedCliente?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCliente(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Responsável Confirmation Dialog */}
      <AlertDialog open={removeResponsavelDialogOpen} onOpenChange={setRemoveResponsavelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Responsável</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o responsável desta empresa cliente? 
              Você poderá adicionar um novo administrador posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveResponsavel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
