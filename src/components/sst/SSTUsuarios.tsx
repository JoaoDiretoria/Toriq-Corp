import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { usePermissoes } from '@/hooks/usePermissoes';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  DialogDescription,
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
import { Users, Plus, Mail, Phone, Shield, Edit, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  role: string;
  setor_id: string | null;
  grupo_acesso: string | null;
  gestor_id: string | null;
  created_at: string;
  ativo: boolean;
  gestor?: { id: string; nome: string } | null;
}

interface Setor {
  id: string;
  nome: string;
  ativo: boolean;
}

export function SSTUsuarios() {
  const { empresa, profile } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { hierarquia } = usePermissoes();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [usuarioForm, setUsuarioForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    senha: '',
    role: 'empresa_sst',
    setor_id: '',
    grupo_acesso: '',
    gestor_id: ''
  });
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [gestoresDisponiveis, setGestoresDisponiveis] = useState<Usuario[]>([]);
  const [savingUsuario, setSavingUsuario] = useState(false);
  const [usuarioToToggle, setUsuarioToToggle] = useState<Usuario | null>(null);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [togglingUsuario, setTogglingUsuario] = useState(false);

  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;

  useEffect(() => {
    fetchUsuarios();
    fetchSetores();
    fetchGestores();
  }, [empresaId]);

  const fetchUsuarios = async () => {
    if (!empresaId) return;

    try {
      // 1. Buscar usuários da empresa SST
      let query = (supabase as any)
        .from('profiles')
        .select('id, nome, email, telefone, cpf, cep, logradouro, numero, complemento, bairro, cidade, uf, role, setor_id, grupo_acesso, gestor_id, created_at, ativo')
        .eq('empresa_id', empresaId)
        .eq('role', 'empresa_sst'); // Apenas funcionários da empresa SST

      // Aplicar filtro de hierarquia se não for administrador
      // Se o filtro retornar vazio, significa que é administrador e vê todos
      const filtroUsuarios = hierarquia.getFiltroUsuarios();
      if (filtroUsuarios.length > 0 && !hierarquia.isAdministrador) {
        query = query.in('id', filtroUsuarios);
      }

      const { data: usuariosSST, error: errorSST } = await query.order('created_at', { ascending: false });

      if (errorSST) throw errorSST;

      // 2. Buscar empresas parceiras vinculadas a esta empresa SST
      const { data: empresasParceiras } = await (supabase as any)
        .from('empresas_parceiras')
        .select('parceira_empresa_id')
        .eq('empresa_sst_id', empresaId);

      // 3. Buscar usuários das empresas parceiras (role = empresa_parceira)
      let usuariosParceiras: any[] = [];
      if (empresasParceiras && empresasParceiras.length > 0) {
        const parceirasIds = empresasParceiras.map((ep: any) => ep.parceira_empresa_id);
        
        const { data: parceirasData, error: errorParceiras } = await (supabase as any)
          .from('profiles')
          .select('id, nome, email, telefone, cpf, cep, logradouro, numero, complemento, bairro, cidade, uf, role, setor_id, grupo_acesso, gestor_id, created_at, ativo')
          .in('empresa_id', parceirasIds)
          .eq('role', 'empresa_parceira')
          .order('created_at', { ascending: false });

        if (!errorParceiras && parceirasData) {
          usuariosParceiras = parceirasData;
        }
      }

      // 4. Buscar clientes vinculados a esta empresa SST
      const { data: clientesSST } = await (supabase as any)
        .from('clientes')
        .select('user_id')
        .eq('empresa_id', empresaId)
        .not('user_id', 'is', null);

      // 5. Buscar usuários dos clientes (role = cliente_final)
      let usuariosClientes: any[] = [];
      if (clientesSST && clientesSST.length > 0) {
        const clientesUserIds = clientesSST.map((c: any) => c.user_id).filter(Boolean);
        
        if (clientesUserIds.length > 0) {
          const { data: clientesData, error: errorClientes } = await (supabase as any)
            .from('profiles')
            .select('id, nome, email, telefone, cpf, cep, logradouro, numero, complemento, bairro, cidade, uf, role, setor_id, grupo_acesso, gestor_id, created_at, ativo')
            .in('id', clientesUserIds)
            .eq('role', 'cliente_final')
            .order('created_at', { ascending: false });

          if (!errorClientes && clientesData) {
            usuariosClientes = clientesData;
          }
        }
      }

      // 6. Buscar instrutores vinculados às empresas parceiras
      let usuariosInstrutores: any[] = [];
      if (empresasParceiras && empresasParceiras.length > 0) {
        // Buscar IDs das empresas parceiras na tabela empresas_parceiras
        const { data: empresasParceirasFull } = await (supabase as any)
          .from('empresas_parceiras')
          .select('id')
          .eq('empresa_sst_id', empresaId);
        
        if (empresasParceirasFull && empresasParceirasFull.length > 0) {
          const empresaParceiraIds = empresasParceirasFull.map((ep: any) => ep.id);
          
          // Buscar instrutores dessas empresas parceiras
          const { data: instrutoresData } = await (supabase as any)
            .from('instrutores')
            .select('user_id')
            .in('empresa_parceira_id', empresaParceiraIds)
            .not('user_id', 'is', null);
          
          if (instrutoresData && instrutoresData.length > 0) {
            const instrutorUserIds = instrutoresData.map((i: any) => i.user_id).filter(Boolean);
            
            if (instrutorUserIds.length > 0) {
              const { data: instrutoresProfiles, error: errorInstrutores } = await (supabase as any)
                .from('profiles')
                .select('id, nome, email, telefone, cpf, cep, logradouro, numero, complemento, bairro, cidade, uf, role, setor_id, grupo_acesso, gestor_id, created_at, ativo')
                .in('id', instrutorUserIds)
                .eq('role', 'instrutor')
                .order('created_at', { ascending: false });
              
              if (!errorInstrutores && instrutoresProfiles) {
                usuariosInstrutores = instrutoresProfiles;
              }
            }
          }
        }
      }

      // 7. Combinar todos os usuários
      const todosUsuarios = [...(usuariosSST || []), ...usuariosParceiras, ...usuariosClientes, ...usuariosInstrutores];
      
      // Buscar nomes dos gestores separadamente
      const usuariosComGestor = await Promise.all(
        todosUsuarios.map(async (usuario: any) => {
          if (usuario.gestor_id) {
            const { data: gestorData } = await (supabase as any)
              .from('profiles')
              .select('id, nome')
              .eq('id', usuario.gestor_id)
              .single();
            return { ...usuario, gestor: gestorData };
          }
          return { ...usuario, gestor: null };
        })
      );
      
      setUsuarios(usuariosComGestor);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSetores = async () => {
    if (!empresaId) return;

    try {
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome, ativo')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setSetores(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar setores:', error);
    }
  };

  const fetchGestores = async () => {
    if (!empresaId) return;

    try {
      // Buscar usuários que podem ser gestores (administradores e gestores)
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, nome, email, grupo_acesso')
        .eq('empresa_id', empresaId)
        .in('grupo_acesso', ['administrador', 'gestor'])
        .order('nome');

      if (error) throw error;
      setGestoresDisponiveis(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar gestores:', error);
    }
  };

  // Funções de formatação
  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
    return numbers.slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2');
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
  };

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numbers.slice(0, 11)
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  // Buscar endereço pelo CEP
  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({ title: 'CEP não encontrado', variant: 'destructive' });
        return;
      }

      setUsuarioForm(prev => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
      }));
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({ title: 'Erro ao buscar CEP', variant: 'destructive' });
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleOpenDialog = (usuario?: Usuario) => {
    if (usuario) {
      setEditingUsuario(usuario);
      setUsuarioForm({
        nome: usuario.nome || '',
        email: usuario.email || '',
        telefone: usuario.telefone || '',
        cpf: usuario.cpf || '',
        cep: usuario.cep || '',
        logradouro: usuario.logradouro || '',
        numero: usuario.numero || '',
        complemento: usuario.complemento || '',
        bairro: usuario.bairro || '',
        cidade: usuario.cidade || '',
        uf: usuario.uf || '',
        senha: '',
        role: usuario.role || 'empresa_sst',
        setor_id: usuario.setor_id || '',
        grupo_acesso: usuario.grupo_acesso || '',
        gestor_id: usuario.gestor_id || ''
      });
    } else {
      setEditingUsuario(null);
      setUsuarioForm({
        nome: '',
        email: '',
        telefone: '',
        cpf: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        senha: '',
        role: 'empresa_sst',
        setor_id: '',
        grupo_acesso: '',
        gestor_id: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSaveUsuario = async () => {
    if (!usuarioForm.nome.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    if (!usuarioForm.email.trim()) {
      toast({ title: 'E-mail é obrigatório', variant: 'destructive' });
      return;
    }
    if (!editingUsuario && !usuarioForm.senha.trim()) {
      toast({ title: 'Senha é obrigatória para novos usuários', variant: 'destructive' });
      return;
    }
    if (!empresaId) return;

    setSavingUsuario(true);
    try {
      if (editingUsuario) {
        // Verificar permissão de edição
        if (!hierarquia.podeEditarUsuario(editingUsuario.id)) {
          toast({ title: 'Sem permissão para editar este usuário', variant: 'destructive' });
          return;
        }
        // Atualizar usuário existente
        const { error } = await (supabase as any)
          .from('profiles')
          .update({
            nome: usuarioForm.nome.trim(),
            email: usuarioForm.email.trim(),
            telefone: usuarioForm.telefone.replace(/\D/g, '') || null,
            cpf: usuarioForm.cpf.replace(/\D/g, '') || null,
            cep: usuarioForm.cep.replace(/\D/g, '') || null,
            logradouro: usuarioForm.logradouro.trim() || null,
            numero: usuarioForm.numero.trim() || null,
            complemento: usuarioForm.complemento.trim() || null,
            bairro: usuarioForm.bairro.trim() || null,
            cidade: usuarioForm.cidade.trim() || null,
            uf: usuarioForm.uf.trim() || null,
            setor_id: usuarioForm.setor_id || null,
            role: usuarioForm.role,
            grupo_acesso: usuarioForm.grupo_acesso || null,
            gestor_id: usuarioForm.gestor_id || null
          })
          .eq('id', editingUsuario.id);
        if (error) throw error;
        toast({ title: 'Usuário atualizado com sucesso!' });
      } else {
        // Criar novo usuário via Edge Function admin-create-user
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        
        if (!token) {
          throw new Error('Sessão não encontrada. Faça login novamente.');
        }

        const response = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: usuarioForm.email.trim(),
            password: usuarioForm.senha,
            nome: usuarioForm.nome.trim(),
            telefone: usuarioForm.telefone.replace(/\D/g, '') || null,
            cpf: usuarioForm.cpf.replace(/\D/g, '') || null,
            cep: usuarioForm.cep.replace(/\D/g, '') || null,
            logradouro: usuarioForm.logradouro.trim() || null,
            numero: usuarioForm.numero.trim() || null,
            complemento: usuarioForm.complemento.trim() || null,
            bairro: usuarioForm.bairro.trim() || null,
            cidade: usuarioForm.cidade.trim() || null,
            uf: usuarioForm.uf.trim() || null,
            role: usuarioForm.role,
            empresa_id: empresaId,
            setor_id: usuarioForm.setor_id || null,
            grupo_acesso: usuarioForm.grupo_acesso || null,
            gestor_id: usuarioForm.gestor_id || null,
            send_invite: true, // Envia email de convite para o usuário definir sua senha
          }
        });

        console.log('Response from admin-create-user:', response);

        if (response.error) {
          console.error('Edge function error:', response.error);
          throw new Error(response.error.message || 'Erro ao criar usuário');
        }

        if (response.data?.error) {
          console.error('Edge function data error:', response.data.error);
          throw new Error(response.data.error);
        }

        if (response.data?.warning) {
          console.warn('Edge function warning:', response.data.warning);
        }
        
        toast({ title: 'Usuário criado com sucesso!' });
      }
      setDialogOpen(false);
      fetchUsuarios();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast({ title: 'Erro ao salvar usuário', description: error.message, variant: 'destructive' });
    } finally {
      setSavingUsuario(false);
    }
  };

  const handleToggleUsuario = async () => {
    if (!usuarioToToggle) return;
    
    // Verificar permissão de edição
    if (!hierarquia.podeEditarUsuario(usuarioToToggle.id)) {
      toast({ title: 'Sem permissão para alterar este usuário', variant: 'destructive' });
      setToggleDialogOpen(false);
      setUsuarioToToggle(null);
      return;
    }
    
    // Verificar se é o único usuário ativo (não pode desativar)
    const usuariosAtivos = usuarios.filter(u => u.ativo !== false);
    if (usuariosAtivos.length === 1 && usuarioToToggle.ativo !== false) {
      toast({ title: 'Não é possível desativar o único usuário ativo', variant: 'destructive' });
      setToggleDialogOpen(false);
      setUsuarioToToggle(null);
      return;
    }
    
    // Verificar se admin está tentando ser desativado por não-admin
    if (usuarioToToggle.grupo_acesso === 'administrador' && 
        profile?.grupo_acesso !== 'administrador' && 
        usuarioToToggle.ativo !== false) {
      toast({ title: 'Apenas administradores podem desativar outros administradores', variant: 'destructive' });
      setToggleDialogOpen(false);
      setUsuarioToToggle(null);
      return;
    }
    
    setTogglingUsuario(true);
    try {
      // Se ativo é undefined ou true, desativar (false). Se é false, ativar (true)
      const novoStatus = usuarioToToggle.ativo === false ? true : false;
      
      // Atualizar status do usuário
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ ativo: novoStatus })
        .eq('id', usuarioToToggle.id);
      
      if (error) throw error;
      
      // Se estiver desativando uma empresa_parceira, desativar também todos os instrutores vinculados
      if (!novoStatus && usuarioToToggle.role === 'empresa_parceira') {
        // Buscar o ID da empresa parceira na tabela empresas_parceiras
        const { data: empresaParceira } = await supabase
          .from('empresas_parceiras')
          .select('id')
          .eq('parceira_empresa_id', usuarioToToggle.id)
          .maybeSingle();
        
        if (empresaParceira) {
          // Buscar todos os instrutores dessa empresa parceira
          const { data: instrutores } = await (supabase as any)
            .from('instrutores')
            .select('user_id')
            .eq('empresa_parceira_id', empresaParceira.id)
            .not('user_id', 'is', null);
          
          if (instrutores && instrutores.length > 0) {
            // Desativar todos os instrutores
            const instrutorUserIds = instrutores.map((i: any) => i.user_id).filter(Boolean);
            if (instrutorUserIds.length > 0) {
              await (supabase as any)
                .from('profiles')
                .update({ ativo: false })
                .in('id', instrutorUserIds);
            }
          }
        }
        
        toast({ 
          title: 'Usuário desativado com sucesso!',
          description: 'Os instrutores vinculados também foram desativados.'
        });
      } else {
        toast({ title: novoStatus ? 'Usuário ativado com sucesso!' : 'Usuário desativado com sucesso!' });
      }
      
      setToggleDialogOpen(false);
      setUsuarioToToggle(null);
      fetchUsuarios();
    } catch (error: any) {
      console.error('Erro ao alterar status do usuário:', error);
      toast({ title: 'Erro ao alterar status', description: error.message, variant: 'destructive' });
    } finally {
      setTogglingUsuario(false);
    }
  };

  const getSetorNome = (setorId: string | null) => {
    if (!setorId) return '-';
    const setor = setores.find(s => s.id === setorId);
    return setor?.nome || '-';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin_vertical':
        return <Badge variant="destructive">Admin Toriq</Badge>;
      case 'empresa_sst':
        return <Badge variant="default">Empresa SST</Badge>;
      case 'cliente_final':
        return <Badge variant="secondary">Cliente Final</Badge>;
      case 'empresa_parceira':
        return <Badge className="bg-purple-600 text-white">Empresa Parceira</Badge>;
      case 'instrutor':
        return <Badge className="bg-blue-600 text-white">Instrutor</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getGrupoAcessoBadge = (grupoAcesso: string | null) => {
    switch (grupoAcesso) {
      case 'administrador':
        return <Badge variant="destructive">Administrador</Badge>;
      case 'gestor':
        return <Badge variant="default">Gestor</Badge>;
      case 'colaborador':
        return <Badge variant="secondary">Colaborador</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getModuloNome = (role: string) => {
    switch (role) {
      case 'admin_vertical':
        return 'Admin Toriq';
      case 'empresa_sst':
        return 'Toriq Corp';
      case 'cliente_final':
        return 'Portal Cliente';
      case 'empresa_parceira':
        return 'Portal Parceira';
      case 'instrutor':
        return 'Portal Instrutor';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>{usuarios.length} usuário(s) cadastrado(s)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="h-8 w-8 mb-2" />
              <p>Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Grupo de Acesso</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Tipo de Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id} className={usuario.ativo === false ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{usuario.nome || 'Sem nome'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {usuario.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {usuario.telefone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {formatTelefone(usuario.telefone)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getModuloNome(usuario.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getSetorNome(usuario.setor_id)}
                    </TableCell>
                    <TableCell>{getGrupoAcessoBadge(usuario.grupo_acesso)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {usuario.gestor?.nome || '-'}
                    </TableCell>
                    <TableCell>{getRoleBadge(usuario.role)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Regras de desativação:
                            1. Se há apenas 1 usuário ativo, não pode desativar
                            2. Admin só pode ser desativado por outro admin
                        */}
                        {(() => {
                          const usuariosAtivos = usuarios.filter(u => u.ativo !== false);
                          const apenasUmUsuarioAtivo = usuariosAtivos.length === 1 && usuario.ativo !== false;
                          const usuarioEhAdmin = usuario.grupo_acesso === 'administrador';
                          const usuarioLogadoEhAdmin = profile?.grupo_acesso === 'administrador';
                          const adminTentandoDesativarAdmin = usuarioEhAdmin && !usuarioLogadoEhAdmin && usuario.ativo !== false;
                          
                          const podeToggle = hierarquia.podeEditarUsuario(usuario.id) && 
                                            !apenasUmUsuarioAtivo && 
                                            !adminTentandoDesativarAdmin;
                          
                          return (
                            <Switch
                              checked={usuario.ativo !== false}
                              disabled={!podeToggle}
                              onCheckedChange={() => {
                                setUsuarioToToggle(usuario);
                                setToggleDialogOpen(true);
                              }}
                            />
                          );
                        })()}
                        <span className={`text-xs ${usuario.ativo !== false ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {usuario.ativo !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {hierarquia.podeEditarUsuario(usuario.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(usuario)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar Usuário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editingUsuario 
                ? 'Atualize as informações do usuário' 
                : 'Preencha os dados para criar um novo usuário'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={usuarioForm.nome}
                onChange={(e) => setUsuarioForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={usuarioForm.email}
                onChange={(e) => setUsuarioForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={usuarioForm.telefone}
                  onChange={(e) => setUsuarioForm(prev => ({ ...prev, telefone: formatTelefone(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={usuarioForm.cpf}
                  onChange={(e) => setUsuarioForm(prev => ({ ...prev, cpf: formatCpf(e.target.value) }))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3">Endereço</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      value={usuarioForm.cep}
                      onChange={(e) => {
                        const formatted = formatCep(e.target.value);
                        setUsuarioForm(prev => ({ ...prev, cep: formatted }));
                        if (formatted.replace(/\D/g, '').length === 8) {
                          buscarCep(formatted);
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                      disabled={buscandoCep}
                    />
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    value={usuarioForm.logradouro}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, logradouro: e.target.value }))}
                    placeholder="Rua, Avenida..."
                    disabled={buscandoCep}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={usuarioForm.numero}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, numero: e.target.value }))}
                    placeholder="Nº"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={usuarioForm.complemento}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, complemento: e.target.value }))}
                    placeholder="Apto, Sala..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={usuarioForm.bairro}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, bairro: e.target.value }))}
                    placeholder="Bairro"
                    disabled={buscandoCep}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={usuarioForm.cidade}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, cidade: e.target.value }))}
                    placeholder="Cidade"
                    disabled={buscandoCep}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    value={usuarioForm.uf}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                    placeholder="UF"
                    maxLength={2}
                    disabled={buscandoCep}
                  />
                </div>
              </div>
            </div>

            {!editingUsuario && (
              <div className="space-y-2">
                <Label htmlFor="senha">Senha *</Label>
                <Input
                  id="senha"
                  type="password"
                  value={usuarioForm.senha}
                  onChange={(e) => setUsuarioForm(prev => ({ ...prev, senha: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="setor">Setor</Label>
              <Select 
                value={usuarioForm.setor_id || "none"} 
                onValueChange={(value) => setUsuarioForm(prev => ({ ...prev, setor_id: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {setores.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>
                      {setor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {setores.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum setor cadastrado. Cadastre setores em Configurações → Setores.
                </p>
              )}
            </div>
            {/* Tipo de Acesso removido - usuários internos sempre são empresa_sst */}
            {/* O que diferencia é o Setor + Grupo de Acesso + Permissões configuradas */}
            <div className="space-y-2">
              <Label htmlFor="grupo_acesso">Grupo de Acesso</Label>
              <Select 
                value={usuarioForm.grupo_acesso || "none"} 
                onValueChange={(value) => setUsuarioForm(prev => ({ ...prev, grupo_acesso: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo de acesso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <strong>Administrador:</strong> Acesso total, vê todos os dados da empresa<br/>
                <strong>Gestor:</strong> Vê seus dados e de seus subordinados<br/>
                <strong>Colaborador:</strong> Vê apenas seus próprios dados
              </p>
            </div>
            {(usuarioForm.grupo_acesso === 'gestor' || usuarioForm.grupo_acesso === 'colaborador') && (
              <div className="space-y-2">
                <Label htmlFor="gestor_id">Gestor Responsável</Label>
                <Select 
                  value={usuarioForm.gestor_id || "none"} 
                  onValueChange={(value) => setUsuarioForm(prev => ({ ...prev, gestor_id: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gestor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (sem hierarquia)</SelectItem>
                    {gestoresDisponiveis
                      .filter(g => g.id !== editingUsuario?.id)
                      .map((gestor) => (
                        <SelectItem key={gestor.id} value={gestor.id}>
                          {gestor.nome} ({gestor.grupo_acesso === 'administrador' ? 'Admin' : 'Gestor'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O gestor poderá visualizar e gerenciar os dados deste usuário
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={savingUsuario}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUsuario} disabled={savingUsuario}>
              {savingUsuario ? 'Salvando...' : editingUsuario ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Ativar/Desativar */}
      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {usuarioToToggle?.ativo !== false ? 'Desativar Usuário' : 'Ativar Usuário'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {usuarioToToggle?.ativo !== false ? (
                <>
                  Tem certeza que deseja desativar o usuário "{usuarioToToggle?.nome || usuarioToToggle?.email}"?
                  {usuarioToToggle?.role === 'empresa_parceira' && (
                    <span className="block mt-2 text-orange-600 font-medium">
                      ⚠️ Atenção: Todos os instrutores vinculados a esta empresa parceira também serão desativados.
                    </span>
                  )}
                  <span className="block mt-2">O usuário não poderá fazer login enquanto estiver desativado.</span>
                </>
              ) : (
                <>Tem certeza que deseja ativar o usuário "{usuarioToToggle?.nome || usuarioToToggle?.email}"?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUsuarioToToggle(null)} disabled={togglingUsuario}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleUsuario}
              disabled={togglingUsuario}
              className={usuarioToToggle?.ativo !== false 
                ? 'bg-warning text-white hover:bg-warning/90' 
                : 'bg-success text-white hover:bg-success/90'}
            >
              {togglingUsuario ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : usuarioToToggle?.ativo !== false ? 'Desativar' : 'Ativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
