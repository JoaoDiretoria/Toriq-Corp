import { useState, useEffect, useCallback, useRef } from 'react';
import {
  vendasDisparoApi,
  type DisparoTemplate,
  type DisparoTemplateInput,
  type DisparoTemplateUpdate,
} from '@/integrations/api/vendasDisparo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  FileText,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react';

// Variáveis disponíveis para interpolação no assunto/corpo (batem com o
// backend: render_template substitui {{chave}} pelos campos do lead).
const AVAILABLE_VARIABLES = [
  { key: 'nome', label: 'Nome' },
  { key: 'empresa_nome', label: 'Empresa' },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado' },
];

const SAMPLE_DATA: Record<string, string> = {
  nome: 'João Silva',
  empresa_nome: 'Empresa ABC',
  email: 'joao@empresa.com',
  telefone: '(11) 99999-9999',
  cidade: 'São Paulo',
  estado: 'SP',
};

function renderSample(texto: string): string {
  return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => SAMPLE_DATA[key] ?? `[${key}]`);
}

export function TemplatesManager() {
  const [templates, setTemplates] = useState<DisparoTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DisparoTemplate | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DisparoTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendasDisparoApi.listTemplates('email');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[TemplatesManager] erro ao listar:', err);
      toast.error('Erro ao carregar templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (tpl: DisparoTemplate) => {
    setEditing(tpl);
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await vendasDisparoApi.deleteTemplate(deleteTarget.id);
      toast.success('Template excluído');
      setDeleteTarget(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir template');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {templates.length} {templates.length === 1 ? 'template' : 'templates'} de e-mail
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo template
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum template ainda</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Crie um template reutilizável com assunto e corpo. Use variáveis
              como {'{{nome}}'} para personalizar cada e-mail.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Criar template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{tpl.nome}</p>
                      {tpl.categoria && (
                        <Badge variant="outline" className="text-xs">{tpl.categoria}</Badge>
                      )}
                      {tpl.canal === 'whatsapp' && tpl.meta_template_name && (
                        <Badge
                          variant={
                            tpl.approval_status === 'approved'
                              ? 'default'
                              : tpl.approval_status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-xs"
                        >
                          HSM: {tpl.approval_status ?? 'unknown'}
                        </Badge>
                      )}
                    </div>
                    {tpl.assunto && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {tpl.assunto}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 whitespace-pre-wrap">
                      {tpl.conteudo}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(tpl)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(tpl)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editing}
        onSaved={() => {
          setEditorOpen(false);
          fetchTemplates();
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{deleteTarget?.nome}"?
              Campanhas já criadas não são afetadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
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

// ---------------------------------------------------------------------------
// Editor de template (criar/editar)
// ---------------------------------------------------------------------------

function TemplateEditor({
  open,
  onOpenChange,
  template,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: DisparoTemplate | null;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState('');
  const [assunto, setAssunto] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const conteudoRef = useRef<HTMLTextAreaElement>(null);
  const assuntoRef = useRef<HTMLInputElement>(null);
  // Qual campo recebeu foco por último — alvo da inserção de variável.
  const lastFocused = useRef<'conteudo' | 'assunto'>('conteudo');

  useEffect(() => {
    if (open) {
      setNome(template?.nome ?? '');
      setAssunto(template?.assunto ?? '');
      setConteudo(template?.conteudo ?? '');
      setCategoria(template?.categoria ?? '');
      setShowPreview(false);
      lastFocused.current = 'conteudo';
    }
  }, [open, template]);

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    if (lastFocused.current === 'assunto') {
      const el = assuntoRef.current;
      const start = el?.selectionStart ?? assunto.length;
      const end = el?.selectionEnd ?? assunto.length;
      const next = assunto.slice(0, start) + token + assunto.slice(end);
      setAssunto(next);
      setTimeout(() => {
        el?.focus();
        el?.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    } else {
      const el = conteudoRef.current;
      const start = el?.selectionStart ?? conteudo.length;
      const end = el?.selectionEnd ?? conteudo.length;
      const next = conteudo.slice(0, start) + token + conteudo.slice(end);
      setConteudo(next);
      setTimeout(() => {
        el?.focus();
        el?.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    }
  };

  const handleSave = async () => {
    if (!nome.trim() || !conteudo.trim()) {
      toast.error('Nome e conteúdo são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      if (template) {
        const payload: DisparoTemplateUpdate = {
          nome: nome.trim(),
          assunto: assunto.trim() || null,
          conteudo,
          categoria: categoria.trim() || null,
        };
        await vendasDisparoApi.updateTemplate(template.id, payload);
        toast.success('Template atualizado');
      } else {
        const payload: DisparoTemplateInput = {
          nome: nome.trim(),
          canal: 'email',
          assunto: assunto.trim() || null,
          conteudo,
          categoria: categoria.trim() || null,
        };
        await vendasDisparoApi.createTemplate(payload);
        toast.success('Template criado');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {template ? 'Editar template' : 'Novo template de e-mail'}
          </DialogTitle>
          <DialogDescription>
            Use variáveis como {'{{nome}}'} no assunto ou no corpo para
            personalizar cada e-mail enviado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-nome">Nome *</Label>
              <Input
                id="tpl-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Boas-vindas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-categoria">Categoria</Label>
              <Input
                id="tpl-categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: prospecção"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-assunto">Assunto</Label>
            <Input
              id="tpl-assunto"
              ref={assuntoRef}
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              onFocus={() => (lastFocused.current = 'assunto')}
              placeholder="Olá {{nome}}, uma proposta para a {{empresa_nome}}"
            />
          </div>

          <div className="space-y-2">
            <Label>Variáveis disponíveis</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_VARIABLES.map((v) => (
                <Badge
                  key={v.key}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-mono text-xs"
                  onClick={() => insertVariable(v.key)}
                  title={`Inserir ${v.label}`}
                >
                  {`{{${v.key}}}`}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Clique numa variável para inseri-la no campo selecionado (assunto ou corpo).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-conteudo">Corpo do e-mail *</Label>
            <Textarea
              id="tpl-conteudo"
              ref={conteudoRef}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              onFocus={() => (lastFocused.current = 'conteudo')}
              placeholder="Olá {{nome}}, somos da Toriq Corp e gostaríamos de..."
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              {conteudo.length} caracteres · O link de descadastro é adicionado
              automaticamente ao final do e-mail (LGPD).
            </p>
          </div>

          {showPreview && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Pré-visualização (dados de exemplo)
              </p>
              {assunto.trim() && (
                <p className="text-sm">
                  <span className="font-medium">Assunto: </span>
                  {renderSample(assunto)}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{renderSample(conteudo)}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showPreview ? 'Ocultar' : 'Pré-visualizar'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {template ? 'Salvar' : 'Criar template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
