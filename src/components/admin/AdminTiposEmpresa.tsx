import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FolderTree, Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';

interface TipoEmpresa {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
}

export function AdminTiposEmpresa() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tipos, setTipos] = useState<TipoEmpresa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoEmpresa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
  });

  useEffect(() => {
    fetchTipos();
  }, []);

  const fetchTipos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tipos_empresa' as any)
        .select('*')
        .order('nome');

      if (error) throw error;
      setTipos((data as unknown as TipoEmpresa[]) || []);
    } catch (error) {
      console.error('Erro ao buscar tipos de empresa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os tipos de empresa.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tipo?: TipoEmpresa) => {
    if (tipo) {
      setEditingTipo(tipo);
      setForm({
        nome: tipo.nome,
        descricao: tipo.descricao || '',
      });
    } else {
      setEditingTipo(null);
      setForm({ nome: '', descricao: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTipo) {
        const { error } = await supabase
          .from('tipos_empresa' as any)
          .update({
            nome: form.nome,
            descricao: form.descricao || null,
          })
          .eq('id', editingTipo.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Tipo de empresa atualizado!' });
      } else {
        const { error } = await supabase
          .from('tipos_empresa' as any)
          .insert({
            nome: form.nome,
            descricao: form.descricao || null,
          });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Tipo de empresa criado!' });
      }

      setDialogOpen(false);
      fetchTipos();
    } catch (error) {
      console.error('Erro ao salvar tipo de empresa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o tipo de empresa.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from('tipos_empresa' as any)
        .delete()
        .eq('id', deletingId);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Tipo de empresa excluído!' });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchTipos();
    } catch (error) {
      console.error('Erro ao excluir tipo de empresa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o tipo de empresa.',
        variant: 'destructive',
      });
    }
  };

  const filteredTipos = tipos.filter(tipo =>
    tipo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tipo.descricao && tipo.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderTree className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Tipos de Empresa</CardTitle>
                <CardDescription>Gerencie os tipos de empresa disponíveis no sistema</CardDescription>
              </div>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tipos de empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTipos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum tipo de empresa encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTipos.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell className="font-medium">{tipo.nome}</TableCell>
                      <TableCell>{tipo.descricao || '-'}</TableCell>
                      <TableCell>{new Date(tipo.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(tipo)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setDeletingId(tipo.id); setDeleteDialogOpen(true); }}
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
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTipo ? 'Editar Tipo de Empresa' : 'Novo Tipo de Empresa'}</DialogTitle>
            <DialogDescription>
              {editingTipo ? 'Atualize as informações do tipo de empresa' : 'Preencha as informações para criar um novo tipo'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Indústria, Comércio, Serviços..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição opcional do tipo de empresa"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-gradient-primary">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este tipo de empresa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
