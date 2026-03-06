import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Pencil, Trash2, Briefcase } from 'lucide-react';

export interface Cargo {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function ClienteCargos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const [deletingCargo, setDeletingCargo] = useState<Cargo | null>(null);
  
  // Form state
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);

  const { data: cargos, isLoading } = useQuery({
    queryKey: ['cargos', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('nome');
      if (error) throw error;
      return data as Cargo[];
    },
    enabled: !!profile?.empresa_id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { nome: string; descricao: string; ativo: boolean }) => {
      const { error } = await supabase.from('cargos').insert({
        empresa_id: profile?.empresa_id,
        nome: data.nome,
        descricao: data.descricao || null,
        ativo: data.ativo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast({ title: 'Cargo criado com sucesso' });
      handleCloseDialog();
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
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast({ title: 'Cargo atualizado com sucesso' });
      handleCloseDialog();
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
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast({ title: 'Cargo excluído com sucesso' });
      setDeletingCargo(null);
    },
    onError: () => {
      toast({ title: 'Erro ao excluir cargo', variant: 'destructive' });
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
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
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
      updateMutation.mutate({
        id: editingCargo.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        ativo,
      });
    } else {
      createMutation.mutate({
        nome: nome.trim(),
        descricao: descricao.trim(),
        ativo,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cargos</h1>
          <p className="text-muted-foreground">
            Gerencie os cargos da sua empresa
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cargo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Lista de Cargos
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCargos?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'Nenhum cargo encontrado para a busca.'
                : 'Nenhum cargo cadastrado. Clique em "Novo Cargo" para começar.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {filteredCargos?.map((cargo) => (
                    <TableRow key={cargo.id}>
                      <TableCell className="font-medium">
                        {cargo.nome}
                      </TableCell>
                      <TableCell>{cargo.descricao || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={cargo.ativo ? 'default' : 'secondary'}>
                          {cargo.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(cargo)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingCargo(cargo)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCargo ? 'Editar Cargo' : 'Novo Cargo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do cargo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição do cargo (opcional)"
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
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingCargo}
        onOpenChange={() => setDeletingCargo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cargo "{deletingCargo?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCargo && deleteMutation.mutate(deletingCargo.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
