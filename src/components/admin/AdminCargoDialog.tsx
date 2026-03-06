import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, Briefcase, Loader2 } from 'lucide-react';

interface Cargo {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminCargoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  onDataChange?: () => void;
}

export function AdminCargoDialog({ open, onOpenChange, empresaId, onDataChange }: AdminCargoDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const [deletingCargo, setDeletingCargo] = useState<Cargo | null>(null);
  
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);

  const { data: cargos, isLoading } = useQuery({
    queryKey: ['admin-cargos', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      if (error) throw error;
      return data as Cargo[];
    },
    enabled: open && !!empresaId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { nome: string; descricao: string; ativo: boolean }) => {
      const { error } = await supabase.from('cargos').insert({
        empresa_id: empresaId,
        nome: data.nome,
        descricao: data.descricao || null,
        ativo: data.ativo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cargos'] });
      toast({ title: 'Cargo criado com sucesso' });
      handleCloseFormDialog();
      onDataChange?.();
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast({ title: 'Já existe um cargo com este nome', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao criar cargo', variant: 'destructive' });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; nome: string; descricao: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('cargos')
        .update({
          nome: data.nome,
          descricao: data.descricao || null,
          ativo: data.ativo,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cargos'] });
      toast({ title: 'Cargo atualizado com sucesso' });
      handleCloseFormDialog();
      onDataChange?.();
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast({ title: 'Já existe um cargo com este nome', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao atualizar cargo', variant: 'destructive' });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cargos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cargos'] });
      toast({ title: 'Cargo excluído com sucesso' });
      onDataChange?.();
      setDeletingCargo(null);
    },
    onError: () => {
      toast({ title: 'Erro ao excluir cargo. Pode haver colaboradores vinculados.', variant: 'destructive' });
    },
  });

  const filteredCargos = cargos?.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (cargo: Cargo) => {
    setEditingCargo(cargo);
    setNome(cargo.nome);
    setDescricao(cargo.descricao || '');
    setAtivo(cargo.ativo);
    setFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setFormDialogOpen(false);
    setEditingCargo(null);
    setNome('');
    setDescricao('');
    setAtivo(true);
  };

  const handleSubmit = () => {
    if (!nome.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    if (editingCargo) {
      updateMutation.mutate({ id: editingCargo.id, nome, descricao, ativo });
    } else {
      createMutation.mutate({ nome, descricao, ativo });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Cargos - Toriq
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background border-border"
                />
              </div>
              <Button 
                onClick={() => setFormDialogOpen(true)}
                className="bg-gradient-primary hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Cargo
              </Button>
            </div>

            <ScrollArea className="h-[400px] rounded-md border border-border">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredCargos?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Briefcase className="h-8 w-8 mb-2 opacity-50" />
                  <p>Nenhum cargo encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCargos?.map((cargo) => (
                      <TableRow key={cargo.id} className="border-border">
                        <TableCell className="font-medium">{cargo.nome}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {cargo.descricao || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              cargo.ativo
                                ? 'bg-success/15 text-success border-success/30'
                                : 'bg-error/15 text-error border-error/30'
                            }
                          >
                            {cargo.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(cargo)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingCargo(cargo)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={formDialogOpen} onOpenChange={handleCloseFormDialog}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingCargo ? 'Editar Cargo' : 'Novo Cargo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do cargo"
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição do cargo"
                className="bg-background border-border"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ativo">Ativo</Label>
              <Switch
                id="ativo"
                checked={ativo}
                onCheckedChange={setAtivo}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseFormDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-primary hover:opacity-90"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCargo ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCargo} onOpenChange={() => setDeletingCargo(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cargo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cargo "{deletingCargo?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCargo && deleteMutation.mutate(deletingCargo.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
