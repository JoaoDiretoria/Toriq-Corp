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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Autor {
  id: string;
  nome: string;
  sobrenome: string;
  cargo: string;
  bio?: string;
  avatar_url?: string;
  email?: string;
  linkedin_url?: string;
}

interface AdminAutorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autores: Autor[];
  onRefresh: () => void;
}

export function AdminAutorDialog({ open, onOpenChange, autores, onRefresh }: AdminAutorDialogProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    cargo: '',
    bio: '',
    email: '',
    linkedin_url: '',
  });

  const resetForm = () => {
    setFormData({ nome: '', sobrenome: '', cargo: '', bio: '', email: '', linkedin_url: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (autor: Autor) => {
    setFormData({
      nome: autor.nome,
      sobrenome: autor.sobrenome || '',
      cargo: autor.cargo || '',
      bio: autor.bio || '',
      email: autor.email || '',
      linkedin_url: autor.linkedin_url || '',
    });
    setEditingId(autor.id);
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
      if (editingId) {
        const { error } = await (supabase as any)
          .from('blog_autores')
          .update({
            nome: formData.nome,
            sobrenome: formData.sobrenome || null,
            cargo: formData.cargo || null,
            bio: formData.bio || null,
            email: formData.email || null,
            linkedin_url: formData.linkedin_url || null,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Autor atualizado com sucesso');
      } else {
        const { error } = await (supabase as any)
          .from('blog_autores')
          .insert({
            nome: formData.nome,
            sobrenome: formData.sobrenome || null,
            cargo: formData.cargo || null,
            bio: formData.bio || null,
            email: formData.email || null,
            linkedin_url: formData.linkedin_url || null,
          });

        if (error) throw error;
        toast.success('Autor criado com sucesso');
      }

      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Erro ao salvar autor:', error);
      toast.error('Erro ao salvar autor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este autor?')) return;

    try {
      const { error } = await (supabase as any)
        .from('blog_autores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Autor excluído com sucesso');
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir autor:', error);
      toast.error('Erro ao excluir autor');
    }
  };

  const getInitials = (nome: string, sobrenome?: string) => {
    const first = nome?.charAt(0) || '';
    const last = sobrenome?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Autores</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Novo Autor
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
                    placeholder="Ex: João"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sobrenome">Sobrenome</Label>
                  <Input
                    id="sobrenome"
                    value={formData.sobrenome}
                    onChange={(e) => setFormData({ ...formData, sobrenome: e.target.value })}
                    placeholder="Ex: Silva"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="Ex: Especialista em SST"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Uma breve descrição sobre o autor..."
                  rows={3}
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
                  <TableHead>Autor</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum autor cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  autores.map((autor) => (
                    <TableRow key={autor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={autor.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(autor.nome, autor.sobrenome)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {autor.nome} {autor.sobrenome}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {autor.cargo || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {autor.email || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(autor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(autor.id)}
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
