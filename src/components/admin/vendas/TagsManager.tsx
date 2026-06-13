import { useState, useEffect, useCallback } from 'react';
import { vendasApi } from '@/integrations/api/vendas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { toast } from 'sonner';
import { Tags, Plus, Trash2, Loader2, Tag as TagIcon } from 'lucide-react';

// ─── Tipos (snake_case batendo com o backend vendas_tags) ──────────────

interface VendasTag {
  id: string;
  empresa_id?: string;
  nome: string;
  cor: string | null;
  created_at?: string;
}

// Paleta de cores rápida para tags.
const TAG_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#14b8a6', '#6366f1', '#84cc16', '#64748b',
];

const DEFAULT_COR = '#3b82f6';

export function TagsManager() {
  const [tags, setTags] = useState<VendasTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Dialog criar
  const [createOpen, setCreateOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState(DEFAULT_COR);
  const [saving, setSaving] = useState(false);

  // Dialog excluir
  const [tagToDelete, setTagToDelete] = useState<VendasTag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendasApi.listTags().catch(() => [] as VendasTag[]);
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      setTags(list);
    } catch (err: any) {
      toast.error(err?.detail || err?.message || 'Erro ao carregar tags');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const resetCreateForm = () => {
    setNovoNome('');
    setNovaCor(DEFAULT_COR);
  };

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const nome = novoNome.trim();
    if (!nome) {
      toast.error('Informe o nome da tag');
      return;
    }
    if (tags.some((t) => t.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error('Já existe uma tag com esse nome');
      return;
    }
    setSaving(true);
    try {
      await vendasApi.createTag(nome, novaCor);
      toast.success('Tag criada com sucesso!');
      setCreateOpen(false);
      resetCreateForm();
      fetchTags();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || 'Erro ao criar tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tagToDelete) return;
    setDeleting(true);
    try {
      await vendasApi.deleteTag(tagToDelete.id);
      toast.success('Tag excluída com sucesso!');
      setTagToDelete(null);
      fetchTags();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || 'Erro ao excluir tag');
    } finally {
      setDeleting(false);
    }
  };

  if (initialLoading && loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-6 w-6" />
            Tags
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize seus leads com etiquetas coloridas reutilizáveis.
          </p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) resetCreateForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar nova tag</DialogTitle>
              <DialogDescription>
                Dê um nome e escolha uma cor para identificar seus leads.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tag-nome">Nome *</Label>
                <Input
                  id="tag-nome"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Quente, Prioridade, Follow-up..."
                  autoFocus
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setNovaCor(cor)}
                      className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        novaCor === cor ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: cor }}
                      aria-label={`Cor ${cor}`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
                <div>
                  <Badge
                    className="border text-foreground"
                    style={{
                      backgroundColor: `${novaCor}20`,
                      borderColor: novaCor,
                    }}
                  >
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: novaCor }}
                    />
                    {novoNome.trim() || 'Nome da tag'}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetCreateForm();
                    setCreateOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || !novoNome.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar tag
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de tags */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <TagIcon className="h-4 w-4" />
            Tags cadastradas
            {tags.length > 0 && (
              <Badge variant="secondary" className="ml-1">{tags.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Tags aplicadas a leads na tela de Leads e em Segmentação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {tags.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Tags className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nenhuma tag ainda</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                  Crie tags coloridas para classificar e filtrar seus leads rapidamente.
                </p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira tag
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tags.map((tag) => {
                  const cor = tag.cor || DEFAULT_COR;
                  return (
                    <div
                      key={tag.id}
                      className="group flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background"
                          style={{ backgroundColor: cor, ['--tw-ring-color' as any]: `${cor}55` }}
                        />
                        <span className="truncate font-medium" title={tag.nome}>
                          {tag.nome}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 opacity-60 hover:opacity-100"
                        onClick={() => setTagToDelete(tag)}
                        title="Excluir tag"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => { if (!open) setTagToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tag</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tag{' '}
              <strong>{tagToDelete?.nome}</strong>? Ela será removida de todos os leads
              que a possuem. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
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

export default TagsManager;
