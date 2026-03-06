import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Categoria {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  cor: string;
}

interface AdminCategoriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: Categoria[];
  onRefresh: () => void;
}

const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export function AdminCategoriaDialog({ open, onOpenChange, categorias, onRefresh }: AdminCategoriaDialogProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#6366f1',
  });

  const resetForm = () => {
    setFormData({ nome: '', descricao: '', cor: '#6366f1' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (categoria: Categoria) => {
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || '',
      cor: categoria.cor,
    });
    setEditingId(categoria.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const slug = generateSlug(formData.nome);
      
      if (editingId) {
        const { error } = await (supabase as any)
          .from('blog_categorias')
          .update({
            nome: formData.nome,
            slug,
            descricao: formData.descricao || null,
            cor: formData.cor,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Categoria atualizada com sucesso');
      } else {
        const { error } = await (supabase as any)
          .from('blog_categorias')
          .insert({
            nome: formData.nome,
            slug,
            descricao: formData.descricao || null,
            cor: formData.cor,
          });

        if (error) throw error;
        toast.success('Categoria criada com sucesso');
      }

      resetForm();
      onRefresh();
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma categoria com este nome');
      } else {
        toast.error('Erro ao salvar categoria');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const { error } = await (supabase as any)
        .from('blog_categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Categoria excluída com sucesso');
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Segurança do Trabalho"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cor">Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cor"
                      type="color"
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição da categoria..."
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  <Check className="h-4 w-4 mr-2" />
                  {editingId ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          )}

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma categoria cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  categorias.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div 
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: cat.cor }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{cat.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(cat)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(cat.id)}
                            className="text-destructive hover:text-destructive"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
