import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2,
  Package,
  Calendar,
  Bell,
  FileText,
  HardHat,
  Users,
  GraduationCap,
  BarChart3,
  Stethoscope,
  Shield,
  Settings,
  Clipboard,
  Heart,
  Truck,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Folder,
} from 'lucide-react';

const AVAILABLE_ICONS = [
  { value: 'Package', label: 'Pacote', icon: Package },
  { value: 'Calendar', label: 'Calendário', icon: Calendar },
  { value: 'Bell', label: 'Sino', icon: Bell },
  { value: 'FileText', label: 'Arquivo', icon: FileText },
  { value: 'HardHat', label: 'Capacete', icon: HardHat },
  { value: 'Users', label: 'Usuários', icon: Users },
  { value: 'GraduationCap', label: 'Formatura', icon: GraduationCap },
  { value: 'BarChart3', label: 'Gráfico', icon: BarChart3 },
  { value: 'Stethoscope', label: 'Estetoscópio', icon: Stethoscope },
  { value: 'Shield', label: 'Escudo', icon: Shield },
  { value: 'Settings', label: 'Engrenagem', icon: Settings },
  { value: 'Clipboard', label: 'Prancheta', icon: Clipboard },
  { value: 'Heart', label: 'Coração', icon: Heart },
  { value: 'Truck', label: 'Caminhão', icon: Truck },
  { value: 'Building2', label: 'Prédio', icon: Building2 },
  { value: 'AlertTriangle', label: 'Alerta', icon: AlertTriangle },
  { value: 'CheckCircle', label: 'Check', icon: CheckCircle },
  { value: 'Clock', label: 'Relógio', icon: Clock },
  { value: 'Folder', label: 'Pasta', icon: Folder },
];

const getIconComponent = (iconName: string | null) => {
  const iconItem = AVAILABLE_ICONS.find(i => i.value === iconName);
  return iconItem?.icon || Package;
};

interface Modulo {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  rota: string;
  created_at: string;
}

export function AdminModulos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedModulo, setSelectedModulo] = useState<Modulo | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    icone: 'Package',
    rota: '',
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      icone: 'Package',
      rota: '',
    });
  };

  // Fetch módulos
  const { data: modulos, isLoading } = useQuery({
    queryKey: ['modulos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modulos')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as Modulo[];
    },
  });

  // Create módulo
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('modulos')
        .insert({
          nome: data.nome,
          descricao: data.descricao || null,
          icone: data.icone,
          rota: data.rota.startsWith('/') ? data.rota : `/${data.rota}`,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modulos'] });
      toast.success('Módulo criado com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar módulo: ${error.message}`);
    },
  });

  // Update módulo
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from('modulos')
        .update({
          nome: data.nome,
          descricao: data.descricao || null,
          icone: data.icone,
          rota: data.rota.startsWith('/') ? data.rota : `/${data.rota}`,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modulos'] });
      toast.success('Módulo atualizado com sucesso!');
      setIsEditDialogOpen(false);
      setSelectedModulo(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar módulo: ${error.message}`);
    },
  });

  // Delete módulo
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modulos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modulos'] });
      toast.success('Módulo excluído com sucesso!');
      setIsDeleteDialogOpen(false);
      setSelectedModulo(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir módulo: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formData.nome || !formData.rota) {
      toast.error('Nome e rota são obrigatórios');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedModulo || !formData.nome || !formData.rota) {
      toast.error('Nome e rota são obrigatórios');
      return;
    }
    updateMutation.mutate({ id: selectedModulo.id, ...formData });
  };

  const handleDelete = () => {
    if (!selectedModulo) return;
    deleteMutation.mutate(selectedModulo.id);
  };

  const openEditDialog = (modulo: Modulo) => {
    setSelectedModulo(modulo);
    setFormData({
      nome: modulo.nome,
      descricao: modulo.descricao || '',
      icone: modulo.icone || 'Package',
      rota: modulo.rota,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (modulo: Modulo) => {
    setSelectedModulo(modulo);
    setIsDeleteDialogOpen(true);
  };

  const filteredModulos = modulos?.filter(modulo =>
    modulo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    modulo.rota.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Módulos</h2>
          <p className="text-muted-foreground">Gerencie os módulos disponíveis na aplicação</p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Módulo
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar módulos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Ícone</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredModulos?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum módulo encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredModulos?.map((modulo) => {
                const IconComponent = getIconComponent(modulo.icone);
                return (
                  <TableRow key={modulo.id}>
                    <TableCell>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <IconComponent className="h-4 w-4" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{modulo.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{modulo.rota}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground max-w-xs truncate">
                      {modulo.descricao || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(modulo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(modulo)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsCreateDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Módulo</DialogTitle>
            <DialogDescription>Preencha os dados do novo módulo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do módulo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rota">Rota *</Label>
              <Input
                id="rota"
                value={formData.rota}
                onChange={(e) => setFormData({ ...formData, rota: e.target.value })}
                placeholder="/modulos/exemplo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icone">Ícone</Label>
              <Select
                value={formData.icone}
                onValueChange={(value) => setFormData({ ...formData, icone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ícone" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map((iconItem) => {
                    const IconComp = iconItem.icon;
                    return (
                      <SelectItem key={iconItem.value} value={iconItem.value}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" />
                          <span>{iconItem.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do módulo"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsCreateDialogOpen(false); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { resetForm(); setSelectedModulo(null); } setIsEditDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Módulo</DialogTitle>
            <DialogDescription>Atualize os dados do módulo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do módulo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rota">Rota *</Label>
              <Input
                id="edit-rota"
                value={formData.rota}
                onChange={(e) => setFormData({ ...formData, rota: e.target.value })}
                placeholder="/modulos/exemplo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-icone">Ícone</Label>
              <Select
                value={formData.icone}
                onValueChange={(value) => setFormData({ ...formData, icone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ícone" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map((iconItem) => {
                    const IconComp = iconItem.icon;
                    return (
                      <SelectItem key={iconItem.value} value={iconItem.value}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" />
                          <span>{iconItem.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do módulo"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setSelectedModulo(null); setIsEditDialogOpen(false); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Módulo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o módulo "{selectedModulo?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
