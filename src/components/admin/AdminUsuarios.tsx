import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { toast } from 'sonner';
import { Users, Loader2, Plus, Pencil, Trash2, Search, KeyRound } from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  email: string;
  role: 'admin_vertical' | 'empresa_sst' | 'cliente_final';
  empresa_id: string | null;
}

interface Empresa {
  id: string;
  nome: string;
}

const roles = [
  { value: 'admin_vertical', label: 'Admin Toriq', description: 'Administrador da plataforma (acesso total)' },
  { value: 'empresa_sst', label: 'Admin Empresa SST', description: 'Administrador de uma empresa SST' },
  { value: 'cliente_final', label: 'Cliente Final', description: 'Usuário de uma empresa cliente' },
];

export function AdminUsuarios() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // CRUD state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingResetPassword, setSendingResetPassword] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: '',
    empresa_id: '',
  });
  const [createFormData, setCreateFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: '',
    empresa_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, empresasRes] = await Promise.all([
      supabase.from('profiles').select('*').order('nome'),
      supabase.from('empresas').select('id, nome').order('nome'),
    ]);

    if (profilesRes.error) {
      toast.error('Erro ao carregar usuários');
      console.error(profilesRes.error);
    } else {
      setProfiles(profilesRes.data || []);
    }

    if (!empresasRes.error) {
      setEmpresas(empresasRes.data || []);
    }

    setLoading(false);
  };

  const getEmpresaNome = (empresaId: string | null) => {
    if (!empresaId) return '-';
    const empresa = empresas.find((e) => e.id === empresaId);
    return empresa?.nome || '-';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin_vertical':
        return <Badge className="bg-primary text-primary-foreground">Admin Toriq</Badge>;
      case 'empresa_sst':
        return <Badge variant="secondary">Empresa SST</Badge>;
      case 'cliente_final':
        return <Badge variant="outline">Cliente Final</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', email: '', password: '', role: '', empresa_id: '' });
    setCreateFormData({ nome: '', email: '', password: '', role: '', empresa_id: '' });
    setSelectedProfile(null);
  };

  // CREATE
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.nome || !createFormData.email || !createFormData.password || !createFormData.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Empresa é obrigatória para roles que não são admin_vertical
    if (createFormData.role !== 'admin_vertical' && !createFormData.empresa_id) {
      toast.error('Selecione uma empresa para este tipo de usuário');
      return;
    }

    if (createFormData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: createFormData.email,
          password: createFormData.password,
          nome: createFormData.nome,
          role: createFormData.role,
          empresa_id: createFormData.empresa_id || null,
          send_invite: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        toast.error(response.data.error);
      } else if (response.data?.warning) {
        toast.warning(response.data.warning);
        setCreateDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        toast.success('Usuário criado com sucesso!');
        setCreateDialogOpen(false);
        resetForm();
        fetchData();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário: ' + error.message);
    }
    
    setSaving(false);
  };

  // UPDATE
  const openEditDialog = (profile: Profile) => {
    setSelectedProfile(profile);
    setFormData({
      nome: profile.nome,
      email: profile.email,
      password: '',
      role: profile.role,
      empresa_id: profile.empresa_id || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !formData.nome || !formData.email || !formData.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Empresa é obrigatória para roles que não são admin_vertical
    if (formData.role !== 'admin_vertical' && !formData.empresa_id) {
      toast.error('Selecione uma empresa para este tipo de usuário');
      return;
    }
    
    setSaving(true);
    
    // Check for duplicate email if changed
    if (formData.email !== selectedProfile.email) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .neq('id', selectedProfile.id)
        .maybeSingle();
      
      if (existingProfile) {
        toast.error('Este email já está em uso por outro usuário');
        setSaving(false);
        return;
      }
    }

    // Update profile in database
    const { error } = await supabase
      .from('profiles')
      .update({
        nome: formData.nome,
        email: formData.email,
        role: formData.role as 'admin_vertical' | 'empresa_sst' | 'cliente_final',
        empresa_id: formData.empresa_id || null,
      })
      .eq('id', selectedProfile.id);

    if (error) {
      toast.error('Erro ao atualizar usuário: ' + error.message);
      setSaving(false);
      return;
    }

    // If email changed, update in auth.users via Edge Function
    if (formData.email !== selectedProfile.email) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        
        const response = await fetch(`https://xraggzqaddfiymqgrtha.supabase.co/functions/v1/admin-update-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            userId: selectedProfile.id,
            email: formData.email,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          toast.warning(`Perfil atualizado, mas erro ao atualizar credenciais: ${result.error || 'Erro desconhecido'}`);
        } else {
          toast.success('Usuário atualizado com sucesso! O usuário precisará fazer login novamente.');
        }
      } catch (error) {
        toast.warning('Perfil atualizado, mas erro ao atualizar credenciais de login');
      }
    } else {
      toast.success('Usuário atualizado com sucesso!');
    }

    setEditDialogOpen(false);
    resetForm();
    fetchData();
    setSaving(false);
  };

  // DELETE
  const openDeleteDialog = (profile: Profile) => {
    if (profile.id === user?.id) {
      toast.error('Você não pode excluir seu próprio usuário');
      return;
    }
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!profileToDelete) return;
    
    if (profileToDelete.id === user?.id) {
      toast.error('Você não pode excluir seu próprio usuário');
      setDeleteDialogOpen(false);
      return;
    }

    setDeleting(true);

    try {
      // Get session for authorization
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Call Edge Function to delete user from both profiles and auth.users
      const response = await fetch(`https://xraggzqaddfiymqgrtha.supabase.co/functions/v1/admin-delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          userId: profileToDelete.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error('Erro ao excluir usuário: ' + (result.error || 'Erro desconhecido'));
      } else {
        toast.success('Usuário excluído com sucesso!');
        fetchData();
      }
    } catch (error) {
      toast.error('Erro ao excluir usuário');
    }
    
    setDeleting(false);
    setDeleteDialogOpen(false);
    setProfileToDelete(null);
  };

  // RESET PASSWORD - Usando Edge Function para evitar CAPTCHA
  const handleSendResetPassword = async (profile: Profile) => {
    if (!profile.email) {
      toast.error('Este usuário não possui email cadastrado');
      return;
    }

    setSendingResetPassword(profile.id);

    try {
      // Usar Edge Function admin-reset-password que não requer CAPTCHA
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Sessão não encontrada');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://xraggzqaddfiymqgrtha.supabase.co'}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email: profile.email,
            redirectTo: `${window.location.origin}/reset-password`,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar email');
      }

      toast.success(`Email de redefinição de senha enviado para ${profile.email}`);
    } catch (error: any) {
      console.error('Erro ao enviar email de reset:', error);
      toast.error('Erro ao enviar email de redefinição de senha: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSendingResetPassword(null);
    }
  };

  const filteredProfiles = profiles.filter((profile) => {
    const matchSearch = 
      profile.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEmpresa = filterEmpresa === 'all' || profile.empresa_id === filterEmpresa;
    const matchRole = filterRole === 'all' || profile.role === filterRole;
    return matchSearch && matchEmpresa && matchRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Usuários
        </h1>
        <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-nome">Nome *</Label>
                <Input
                  id="create-nome"
                  value={createFormData.nome}
                  onChange={(e) => setCreateFormData({ ...createFormData, nome: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Senha *</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role *</Label>
                <Select
                  value={createFormData.role}
                  onValueChange={(value) => setCreateFormData({ ...createFormData, role: value, empresa_id: value === 'admin_vertical' ? '' : createFormData.empresa_id })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          <span className="text-xs text-muted-foreground">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-empresa">
                  Empresa {createFormData.role && createFormData.role !== 'admin_vertical' ? '*' : ''}
                </Label>
                <Select
                  value={createFormData.empresa_id || "none"}
                  onValueChange={(value) => setCreateFormData({ ...createFormData, empresa_id: value === "none" ? "" : value })}
                  disabled={createFormData.role === 'admin_vertical'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {createFormData.role === 'admin_vertical' && (
                      <SelectItem value="none">Nenhuma</SelectItem>
                    )}
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createFormData.role && createFormData.role !== 'admin_vertical' && (
                  <p className="text-xs text-muted-foreground">
                    Este usuário será o administrador da empresa selecionada
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || !createFormData.role}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              filteredProfiles.map((profile) => (
                <div key={profile.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{profile.nome}</p>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                    </div>
                    {getRoleBadge(profile.role)}
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Empresa:</span> {getEmpresaNome(profile.empresa_id)}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSendResetPassword(profile)}
                      disabled={sendingResetPassword === profile.id}
                      title="Enviar email de redefinição de senha"
                    >
                      {sendingResetPassword === profile.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(profile)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(profile)}
                      disabled={profile.id === user?.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.nome}</TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>{getRoleBadge(profile.role)}</TableCell>
                      <TableCell>{getEmpresaNome(profile.empresa_id)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSendResetPassword(profile)}
                            disabled={sendingResetPassword === profile.id}
                            title="Enviar email de redefinição de senha"
                          >
                            {sendingResetPassword === profile.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <KeyRound className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(profile)}>
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(profile)}
                            disabled={profile.id === user?.id}
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value, empresa_id: value === 'admin_vertical' ? '' : formData.empresa_id })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col">
                        <span>{role.label}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-empresa">
                Empresa {formData.role && formData.role !== 'admin_vertical' ? '*' : ''}
              </Label>
              <Select
                value={formData.empresa_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, empresa_id: value === "none" ? "" : value })}
                disabled={formData.role === 'admin_vertical'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {formData.role === 'admin_vertical' && (
                    <SelectItem value="none">Nenhuma</SelectItem>
                  )}
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !formData.role}>
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
              Tem certeza que deseja excluir o usuário <strong>{profileToDelete?.nome}</strong> ({profileToDelete?.email})?
              <br /><br />
              Esta ação não poderá ser desfeita.
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
    </div>
  );
}
