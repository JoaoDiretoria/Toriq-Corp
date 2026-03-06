import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useToast } from '@/hooks/use-toast';
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
import { Plus, Search, Pencil, Trash2, Loader2, User, Building } from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  email: string;
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

interface EmpresaParceira {
  id: string;
  nome: string;
  cnpj: string | null;
  responsavel: string | null;
  responsavel_id: string | null;
  email: string | null;
  telefone: string | null;
  tipo_fornecedor: string | null;
  parceira_empresa_id: string | null;
  responsavel_profile?: Profile | null;
  parceira_empresa?: Empresa | null;
}

export function SSTEmpresasParceiras() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  
  // Usar empresa_id do modo empresa quando ativo
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  const [parceiras, setParceiras] = useState<EmpresaParceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeResponsavelDialogOpen, setRemoveResponsavelDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedParceira, setSelectedParceira] = useState<EmpresaParceira | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipoFornecedor, setFilterTipoFornecedor] = useState<string>('todos');
  const [creatingUser, setCreatingUser] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
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
    tipo_fornecedor: '',
    criarAdmin: false,
    adminEmail: '',
    adminNome: '',
    adminSenha: '',
  });

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

  const handleCnpjChange = (value: string) => {
    const cnpjLimpo = value.replace(/\D/g, '').slice(0, 14);
    let cnpjFormatado = cnpjLimpo;
    
    if (cnpjLimpo.length > 12) {
      cnpjFormatado = `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2, 5)}.${cnpjLimpo.slice(5, 8)}/${cnpjLimpo.slice(8, 12)}-${cnpjLimpo.slice(12, 14)}`;
    } else if (cnpjLimpo.length > 8) {
      cnpjFormatado = `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2, 5)}.${cnpjLimpo.slice(5, 8)}/${cnpjLimpo.slice(8)}`;
    } else if (cnpjLimpo.length > 5) {
      cnpjFormatado = `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2, 5)}.${cnpjLimpo.slice(5)}`;
    } else if (cnpjLimpo.length > 2) {
      cnpjFormatado = `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2)}`;
    }
    
    setFormData(prev => ({ ...prev, cnpj: cnpjFormatado }));
    
    // Buscar dados do CNPJ quando completo (14 dígitos)
    if (cnpjLimpo.length === 14) {
      buscarCnpj(cnpjLimpo);
    }
  };

  const buscarCnpj = async (cnpj: string) => {
    if (cnpj.length !== 14) return;
    
    setBuscandoCnpj(true);
    try {
      // Usar Edge Function proxy para evitar CORS
      const { data: funcData, error: funcError } = await supabase.functions.invoke('cnpj-lookup', {
        body: { cnpj }
      });
      
      if (funcError) {
        console.error('Erro na Edge Function:', funcError);
        toast({
          title: "Erro ao consultar CNPJ",
          variant: "destructive",
        });
        return;
      }
      
      if (funcData?.error) {
        toast({
          title: funcData.error,
          variant: "destructive",
        });
        return;
      }
      
      const data = funcData;
      
      if (data.razao_social) {
        const estabelecimento = data.estabelecimento || {};
        const telefone = estabelecimento.ddd1 && estabelecimento.telefone1 
          ? `(${estabelecimento.ddd1}) ${estabelecimento.telefone1}` 
          : '';
        
        setFormData(prev => ({
          ...prev,
          nome: estabelecimento.nome_fantasia || data.razao_social || prev.nome,
          razao_social: data.razao_social || prev.razao_social,
          nome_fantasia: estabelecimento.nome_fantasia || prev.nome_fantasia,
          telefone: telefone || prev.telefone,
          email: estabelecimento.email?.toLowerCase() || prev.email,
          cep: estabelecimento.cep ? `${estabelecimento.cep.slice(0, 5)}-${estabelecimento.cep.slice(5)}` : prev.cep,
          endereco: estabelecimento.logradouro || prev.endereco,
          numero: estabelecimento.numero || prev.numero,
          complemento: estabelecimento.complemento || prev.complemento,
          bairro: estabelecimento.bairro || prev.bairro,
          cidade: estabelecimento.cidade?.nome || prev.cidade,
          estado: estabelecimento.estado?.sigla || prev.estado,
        }));
        toast({
          title: "Dados da empresa encontrados!",
          description: "Os campos foram preenchidos automaticamente.",
        });
      } else {
        toast({
          title: "Não foi possível obter os dados da empresa",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast({
        title: "Erro ao buscar dados do CNPJ",
        variant: "destructive",
      });
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const fetchParceiras = async () => {
    if (!empresaId) return;
    
    const { data, error } = await supabase
      .from('empresas_parceiras')
      .select(`
        *,
        responsavel_profile:profiles!empresas_parceiras_responsavel_id_fkey(id, nome, email),
        parceira_empresa:empresas!empresas_parceiras_parceira_empresa_id_fkey(id, nome, cnpj, razao_social, nome_fantasia, email, telefone, cep, endereco, numero, complemento, bairro, cidade, estado)
      `)
      .eq('empresa_sst_id', empresaId)
      .order('nome');

    if (error) {
      toast({
        title: "Erro ao carregar empresas parceiras",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setParceiras(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchParceiras();
  }, [empresaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    if (!formData.tipo_fornecedor) {
      toast({
        title: "Erro",
        description: "Selecione o tipo de fornecedor.",
        variant: "destructive",
      });
      return;
    }

    setCreatingUser(true);

    try {
      // 1. Criar empresa do tipo empresa_parceira
      const { data: novaEmpresa, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nome: formData.nome,
          cnpj: formData.cnpj || null,
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
          tipo: 'empresa_parceira' as const,
        })
        .select()
        .single();

      if (empresaError) throw empresaError;

      // 2. Criar registro em empresas_parceiras vinculando a empresa SST
      const { data: novaParceira, error: parceiraError } = await supabase
        .from('empresas_parceiras')
        .insert({
          empresa_sst_id: empresaId,
          nome: formData.nome,
          cnpj: formData.cnpj || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          tipo_fornecedor: formData.tipo_fornecedor,
          parceira_empresa_id: novaEmpresa.id,
        })
        .select()
        .single();

      if (parceiraError) throw parceiraError;

      // 3. Criar admin da empresa se solicitado e vincular como responsável
      if (formData.criarAdmin && formData.adminEmail && formData.adminSenha) {
        console.log('[SSTEmpresasParceiras] Criando admin para empresa:', novaEmpresa.id);
        
        // Verificar se há sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[SSTEmpresasParceiras] Sessão ativa:', !!session, 'Token:', session?.access_token?.substring(0, 30));
        
        if (!session) {
          toast({
            title: "Erro",
            description: "Sessão expirada. Por favor, faça login novamente.",
            variant: "destructive",
          });
          return;
        }
        
        // Usar fetch direto para ter mais controle sobre os headers
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        console.log('[SSTEmpresasParceiras] Chamando Edge Function via fetch...');
        
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/admin-create-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabaseAnonKey,
            },
            body: JSON.stringify({
              email: formData.adminEmail,
              password: formData.adminSenha,
              nome: formData.adminNome || formData.nome,
              role: 'empresa_parceira',
              empresa_id: novaEmpresa.id,
              send_invite: true,
            }),
          });
          
          const adminResponse = await response.json();
          console.log('[SSTEmpresasParceiras] Resposta admin-create-user:', { status: response.status, adminResponse });
          
          if (!response.ok) {
            console.error('[SSTEmpresasParceiras] Erro HTTP:', response.status, adminResponse);
            toast({
              title: "Aviso",
              description: "Empresa parceira criada, mas houve erro ao criar o admin: " + (adminResponse.error || `HTTP ${response.status}`),
              variant: "destructive",
            });
          } else if (adminResponse?.error) {
            console.error('[SSTEmpresasParceiras] Erro retornado pela Edge Function:', adminResponse.error);
            toast({
              title: "Aviso",
              description: "Empresa parceira criada, mas houve erro ao criar o admin: " + adminResponse.error,
              variant: "destructive",
            });
          } else if (adminResponse?.user?.id) {
            console.log('[SSTEmpresasParceiras] Admin criado com sucesso:', adminResponse.user.id);
            // Vincular o admin criado como responsável
            await supabase
              .from('empresas_parceiras')
              .update({
                responsavel_id: adminResponse.user.id,
                responsavel: formData.adminNome || formData.nome,
              })
              .eq('id', novaParceira.id);
            
            toast({
              title: "Sucesso",
              description: "Administrador criado e vinculado com sucesso!",
            });
          } else {
            console.warn('[SSTEmpresasParceiras] Resposta inesperada:', adminResponse);
            toast({
              title: "Aviso",
              description: "Empresa parceira criada, mas não foi possível confirmar a criação do admin.",
              variant: "destructive",
            });
          }
        } catch (fetchError: any) {
          console.error('[SSTEmpresasParceiras] Erro no fetch:', fetchError);
          toast({
            title: "Erro",
            description: "Erro de conexão ao criar admin: " + fetchError.message,
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Empresa parceira cadastrada",
        description: "A empresa parceira foi adicionada com sucesso.",
      });
      setDialogOpen(false);
      resetForm();
      fetchParceiras();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar empresa parceira",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParceira) return;

    setCreatingUser(true);

    try {
      // Atualizar empresa vinculada se existir
      if (selectedParceira.parceira_empresa_id) {
        const { error: empresaError } = await supabase
          .from('empresas')
          .update({
            nome: formData.nome,
            cnpj: formData.cnpj || null,
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
          .eq('id', selectedParceira.parceira_empresa_id);

        if (empresaError) throw empresaError;
      }

      // Se estiver criando um novo admin
      let novoResponsavelId: string | null = selectedParceira.responsavel_id;
      let novoResponsavelNome: string | null = selectedParceira.responsavel;

      if (formData.criarAdmin && formData.adminEmail && formData.adminSenha && selectedParceira.parceira_empresa_id) {
        console.log('[SSTEmpresasParceiras] Criando admin na edição para empresa:', selectedParceira.parceira_empresa_id);
        
        // Verificar se há sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[SSTEmpresasParceiras] Sessão ativa (edição):', !!session, 'Token:', session?.access_token?.substring(0, 30));
        
        if (!session) {
          toast({
            title: "Erro",
            description: "Sessão expirada. Por favor, faça login novamente.",
            variant: "destructive",
          });
          return;
        }
        
        // Usar fetch direto para ter mais controle sobre os headers
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        console.log('[SSTEmpresasParceiras] Chamando Edge Function via fetch...');
        
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/admin-create-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabaseAnonKey,
            },
            body: JSON.stringify({
              email: formData.adminEmail,
              password: formData.adminSenha,
              nome: formData.adminNome || 'Administrador',
              role: 'empresa_parceira',
              empresa_id: selectedParceira.parceira_empresa_id,
              send_invite: true,
            }),
          });
          
          const adminResponse = await response.json();
          console.log('[SSTEmpresasParceiras] Resposta admin-create-user (edição):', { status: response.status, adminResponse });
          
          if (!response.ok) {
            console.error('[SSTEmpresasParceiras] Erro HTTP:', response.status, adminResponse);
            toast({
              title: "Aviso",
              description: "Houve erro ao criar o admin: " + (adminResponse.error || `HTTP ${response.status}`),
              variant: "destructive",
            });
          } else if (adminResponse?.error) {
            console.error('[SSTEmpresasParceiras] Erro retornado pela Edge Function:', adminResponse.error);
            toast({
              title: "Aviso",
              description: "Houve erro ao criar o admin: " + adminResponse.error,
              variant: "destructive",
            });
          } else if (adminResponse?.user?.id) {
            console.log('[SSTEmpresasParceiras] Admin criado com sucesso:', adminResponse.user.id);
            novoResponsavelId = adminResponse.user.id;
            novoResponsavelNome = formData.adminNome || 'Administrador';
            toast({
              title: "Sucesso",
              description: "Administrador criado com sucesso!",
            });
          } else {
            console.warn('[SSTEmpresasParceiras] Resposta inesperada:', adminResponse);
            toast({
              title: "Aviso",
              description: "Não foi possível confirmar a criação do admin.",
              variant: "destructive",
            });
          }
        } catch (fetchError: any) {
          console.error('[SSTEmpresasParceiras] Erro no fetch:', fetchError);
          toast({
            title: "Erro",
            description: "Erro de conexão ao criar admin: " + fetchError.message,
            variant: "destructive",
          });
        }
      }

      // Atualizar registro em empresas_parceiras
      const { error: parceiraError } = await supabase
        .from('empresas_parceiras')
        .update({
          nome: formData.nome,
          cnpj: formData.cnpj || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          tipo_fornecedor: formData.tipo_fornecedor,
          responsavel_id: novoResponsavelId,
          responsavel: novoResponsavelNome,
        })
        .eq('id', selectedParceira.id);

      if (parceiraError) throw parceiraError;

      toast({
        title: "Empresa parceira atualizada",
        description: "Os dados foram atualizados com sucesso.",
      });
      setEditDialogOpen(false);
      setSelectedParceira(null);
      resetForm();
      fetchParceiras();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar empresa parceira",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedParceira) return;

    try {
      const { error: parceiraError } = await supabase
        .from('empresas_parceiras')
        .delete()
        .eq('id', selectedParceira.id);

      if (parceiraError) throw parceiraError;

      toast({
        title: "Empresa parceira excluída",
        description: "A empresa parceira foi removida com sucesso.",
      });
      setDeleteDialogOpen(false);
      setSelectedParceira(null);
      fetchParceiras();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir empresa parceira",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (parceira: EmpresaParceira) => {
    setSelectedParceira(parceira);
    const emp = parceira.parceira_empresa;
    setFormData({
      nome: parceira.nome,
      cnpj: parceira.cnpj || emp?.cnpj || '',
      razao_social: emp?.razao_social || '',
      nome_fantasia: emp?.nome_fantasia || '',
      email: parceira.email || emp?.email || '',
      telefone: parceira.telefone || emp?.telefone || '',
      cep: emp?.cep || '',
      endereco: emp?.endereco || '',
      numero: emp?.numero || '',
      complemento: emp?.complemento || '',
      bairro: emp?.bairro || '',
      cidade: emp?.cidade || '',
      estado: emp?.estado || '',
      responsavel_id: parceira.responsavel_id || '',
      tipo_fornecedor: parceira.tipo_fornecedor || '',
      criarAdmin: false,
      adminEmail: '',
      adminNome: '',
      adminSenha: '',
    });
    setEditDialogOpen(true);
  };

  const handleRemoveResponsavel = async () => {
    if (!selectedParceira) return;
    
    try {
      const { error } = await supabase
        .from('empresas_parceiras')
        .update({
          responsavel_id: null,
          responsavel: null,
        })
        .eq('id', selectedParceira.id);

      if (error) throw error;

      setSelectedParceira({
        ...selectedParceira,
        responsavel_id: null,
        responsavel: null,
        responsavel_profile: null,
      });

      toast({
        title: "Responsável removido",
        description: "O responsável foi desvinculado com sucesso.",
      });
      
      setRemoveResponsavelDialogOpen(false);
      fetchParceiras();
    } catch (error: any) {
      toast({
        title: "Erro ao remover responsável",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (parceira: EmpresaParceira) => {
    setSelectedParceira(parceira);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cnpj: '',
      razao_social: '',
      nome_fantasia: '',
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
      tipo_fornecedor: '',
      criarAdmin: false,
      adminEmail: '',
      adminNome: '',
      adminSenha: '',
    });
  };

  const filteredParceiras = parceiras.filter(parceira => {
    const matchesSearch = 
      parceira.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (parceira.cnpj && parceira.cnpj.includes(searchTerm));
    
    const matchesTipo = 
      filterTipoFornecedor === 'todos' || 
      parceira.tipo_fornecedor === filterTipoFornecedor;

    return matchesSearch && matchesTipo;
  });

  const getResponsavelNome = (parceira: EmpresaParceira) => {
    if (parceira.responsavel_profile) {
      return parceira.responsavel_profile.nome;
    }
    return parceira.responsavel || '-';
  };

  const getResponsavelInfo = () => {
    if (!selectedParceira?.responsavel_id) return null;
    
    if (selectedParceira.responsavel_profile) {
      return selectedParceira.responsavel_profile;
    }
    
    if (selectedParceira.responsavel) {
      return { nome: selectedParceira.responsavel, email: '' };
    }
    
    return null;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6" />
            Empresas Parceiras
          </h1>
          <p className="text-muted-foreground">
            Gerencie as empresas parceiras e fornecedores da sua empresa.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa Parceira
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Empresa Parceira</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input
                    id="razao_social"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value, nome: e.target.value })}
                    placeholder="Razão social da empresa"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <div className="relative">
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => handleCnpjChange(e.target.value)}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                    {buscandoCnpj && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    placeholder="Nome fantasia (opcional)"
                  />
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
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>

                {/* Tipo de Fornecedor */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tipo_fornecedor">Tipo de Fornecedor *</Label>
                  <Select
                    value={formData.tipo_fornecedor}
                    onValueChange={(value) => setFormData({ ...formData, tipo_fornecedor: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Instrutores">Instrutores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Seção Endereço */}
                <div className="md:col-span-2 pt-2">
                  <Label className="text-sm font-medium text-muted-foreground">Endereço</Label>
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

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Select value={filterTipoFornecedor} onValueChange={setFilterTipoFornecedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="Instrutores">Instrutores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Tipo de Fornecedor</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParceiras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma empresa parceira encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredParceiras.map((parceira) => (
                  <TableRow key={parceira.id}>
                    <TableCell className="font-medium">{parceira.parceira_empresa?.razao_social || parceira.nome}</TableCell>
                    <TableCell className="text-sm">{parceira.parceira_empresa?.nome_fantasia || '-'}</TableCell>
                    <TableCell>{parceira.cnpj || parceira.parceira_empresa?.cnpj || '-'}</TableCell>
                    <TableCell>{parceira.tipo_fornecedor || '-'}</TableCell>
                    <TableCell>
                      {parceira.parceira_empresa?.cidade && parceira.parceira_empresa?.estado
                        ? `${parceira.parceira_empresa.cidade}/${parceira.parceira_empresa.estado}`
                        : '-'}
                    </TableCell>
                    <TableCell>{getResponsavelNome(parceira)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(parceira)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(parceira)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setSelectedParceira(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empresa Parceira</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cnpj">CNPJ</Label>
                <div className="relative">
                  <Input
                    id="edit-cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                  {buscandoCnpj && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-razao_social">Razão Social *</Label>
                <Input
                  id="edit-razao_social"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value, nome: e.target.value })}
                  placeholder="Razão social da empresa"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="edit-nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  placeholder="Nome fantasia (opcional)"
                />
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
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>

              {/* Tipo de Fornecedor */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-tipo_fornecedor">Tipo de Fornecedor *</Label>
                <Select
                  value={formData.tipo_fornecedor}
                  onValueChange={(value) => setFormData({ ...formData, tipo_fornecedor: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Instrutores">Instrutores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seção Endereço na Edição */}
              <div className="md:col-span-2 pt-2">
                <Label className="text-sm font-medium text-muted-foreground">Endereço</Label>
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
            </div>

            {/* Seção Responsável */}
            <div className="border-t pt-4 space-y-4">
              <Label className="text-sm font-medium">Responsável da Empresa Parceira</Label>
              
              {(() => {
                const responsavelInfo = getResponsavelInfo();
                if (responsavelInfo) {
                  return (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Responsável Atual</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setRemoveResponsavelDialogOpen(true)}
                          title="Remover responsável"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pl-6">
                        <div>
                          <span className="text-xs text-muted-foreground">Nome:</span>
                          <p className="text-sm">{responsavelInfo.nome}</p>
                        </div>
                        {responsavelInfo.email && (
                          <div>
                            <span className="text-xs text-muted-foreground">Email:</span>
                            <p className="text-sm">{responsavelInfo.email}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Esta empresa não possui um responsável definido. Você pode criar um administrador abaixo.
                    </p>
                  </div>
                );
              })()}

              {!selectedParceira?.responsavel_id && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-criarAdmin"
                      checked={formData.criarAdmin}
                      onCheckedChange={(checked) => setFormData({ ...formData, criarAdmin: !!checked })}
                    />
                    <Label htmlFor="edit-criarAdmin" className="font-medium cursor-pointer">
                      Criar administrador para esta empresa
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
                        O novo administrador será definido como responsável pela empresa.
                      </p>
                    </div>
                  )}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa parceira "{selectedParceira?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedParceira(null)}>Cancelar</AlertDialogCancel>
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
              Tem certeza que deseja remover o responsável desta empresa parceira? 
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
