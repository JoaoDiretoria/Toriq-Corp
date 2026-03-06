import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react';

interface DeclaracaoReorientacao {
  id: string;
  texto: string;
  ativo: boolean;
  created_at: string;
}

export function SSTDeclaracaoReorientacao() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  
  const [declaracoes, setDeclaracoes] = useState<DeclaracaoReorientacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedDeclaracao, setSelectedDeclaracao] = useState<DeclaracaoReorientacao | null>(null);
  
  // Form states
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  
  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [declaracaoToDelete, setDeclaracaoToDelete] = useState<DeclaracaoReorientacao | null>(null);

  useEffect(() => {
    if (empresaId) {
      fetchDeclaracoes();
    }
  }, [empresaId]);

  const fetchDeclaracoes = async () => {
    if (!empresaId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('declaracoes_reorientacao')
        .select(`
          id,
          texto,
          ativo,
          created_at
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeclaracoes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar declarações:', error);
      toast({
        title: "Erro ao carregar declarações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setTexto('');
    setSelectedDeclaracao(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (declaracao: DeclaracaoReorientacao) => {
    setDialogMode('edit');
    setSelectedDeclaracao(declaracao);
    setTexto(declaracao.texto);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTexto('');
    setSelectedDeclaracao(null);
  };

  const handleSave = async () => {
    if (!empresaId || !texto.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o texto da declaração.",
        variant: "destructive",
      });
      return;
    }

    setSalvando(true);

    try {
      if (dialogMode === 'edit' && selectedDeclaracao) {
        const { error } = await (supabase as any)
          .from('declaracoes_reorientacao')
          .update({
            texto: texto.trim(),
          })
          .eq('id', selectedDeclaracao.id);

        if (error) throw error;

        toast({
          title: "Declaração atualizada!",
          description: "A declaração foi atualizada com sucesso.",
        });
      } else {
        const { error } = await (supabase as any)
          .from('declaracoes_reorientacao')
          .insert({
            empresa_id: empresaId,
            texto: texto.trim(),
          });

        if (error) throw error;

        toast({
          title: "Declaração criada!",
          description: "A declaração foi criada com sucesso.",
        });
      }

      handleCloseDialog();
      fetchDeclaracoes();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar declaração",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleOpenDeleteDialog = (declaracao: DeclaracaoReorientacao) => {
    setDeclaracaoToDelete(declaracao);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!declaracaoToDelete) return;

    try {
      const { error } = await (supabase as any)
        .from('declaracoes_reorientacao')
        .delete()
        .eq('id', declaracaoToDelete.id);

      if (error) throw error;

      toast({
        title: "Declaração excluída!",
        description: "A declaração foi excluída com sucesso.",
      });

      setDeleteDialogOpen(false);
      setDeclaracaoToDelete(null);
      fetchDeclaracoes();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir declaração",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Pegar a primeira (e única) declaração
  const declaracao = declaracoes.length > 0 ? declaracoes[0] : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle className="text-lg">Modelo de Declaração de Reorientação</CardTitle>
                <CardDescription>
                  Configure o texto que será exibido na reorientação após o pós-teste
                </CardDescription>
              </div>
            </div>
            {!declaracao ? (
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Modelo
              </Button>
            ) : (
              <Button variant="outline" onClick={() => handleOpenEdit(declaracao)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar Modelo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!declaracao ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4" />
              <p>Nenhum modelo de declaração cadastrado.</p>
              <p className="text-sm">Clique em "Criar Modelo" para configurar a declaração de reorientação.</p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Texto da Declaração:</p>
                  <p className="text-sm whitespace-pre-wrap">{declaracao.texto}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(declaracao)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(declaracao)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar Declaração */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {dialogMode === 'edit' ? 'Editar Declaração' : 'Nova Declaração de Reorientação'}
            </DialogTitle>
            <DialogDescription>
              Digite o texto da declaração de reorientação
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Texto */}
            <div className="space-y-2">
              <Label>Texto da Declaração</Label>
              <Textarea 
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite o texto completo da declaração de reorientação..."
                rows={10}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={salvando}>
              {salvando ? 'Salvando...' : dialogMode === 'edit' ? 'Salvar Alterações' : 'Criar Declaração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta declaração de reorientação? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeclaracaoToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
