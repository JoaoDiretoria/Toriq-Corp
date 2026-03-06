import { useState, useEffect } from 'react';
import { Briefcase, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { usePermissoes } from '@/hooks/usePermissoes';
import { supabase } from '@/integrations/supabase/client';

interface Setor {
  id: string;
  nome: string;
  descricao: string | null;
}

interface ToriqCorpSetoresProps {
  onNavigateToSetor: (setorId: string) => void;
}

export function ToriqCorpSetores({ onNavigateToSetor }: ToriqCorpSetoresProps) {
  const { empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const { podeVisualizar, podeEditar, podeCriar } = usePermissoes();
  const { toast } = useToast();
  
  const empresaId = empresaMode?.empresaId || empresa?.id;
  
  // Verifica se o usuário tem permissão para visualizar um setor específico
  const setorVisivel = (setorId: string): boolean => {
    return podeVisualizar(`setor-${setorId}`);
  };
  
  // Verifica se o usuário pode editar em algum setor visível
  const podeEditarAlgumSetor = (): boolean => {
    // Verifica se tem permissão de editar em pelo menos um setor
    return setores.some(setor => podeEditar(`setor-${setor.id}`));
  };
  
  // Verifica se o usuário pode criar novos setores (precisa ter permissão de criar em algum setor)
  const podeAdicionarSetor = podeCriar('toriq-corp-setores');
  
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: ''
  });

  useEffect(() => {
    if (empresaId) {
      loadSetores();
    }
  }, [empresaId]);

  const loadSetores = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('setores')
        .select('id, nome, descricao')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .neq('nome', 'Financeiro')
        .order('nome');

      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
      toast({
        title: 'Erro ao carregar setores',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSetor = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do setor.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await (supabase as any)
        .from('setores')
        .insert({
          empresa_id: empresaId,
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          ativo: true
        });

      if (error) throw error;

      toast({
        title: 'Setor criado com sucesso!',
        description: `O setor "${formData.nome}" foi criado.`
      });

      setDialogOpen(false);
      setFormData({ nome: '', descricao: '' });
      loadSetores();
      
      // Disparar evento para atualizar sidebar
      window.dispatchEvent(new Event('setores-updated'));
    } catch (error: any) {
      console.error('Erro ao criar setor:', error);
      toast({
        title: 'Erro ao criar setor',
        description: error.message || 'Não foi possível criar o setor.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Setores</h1>
            <p className="text-muted-foreground">Gerencie os setores da empresa e seus funis</p>
          </div>
        </div>
        {podeAdicionarSetor && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Setor
          </Button>
        )}
      </div>

      {/* Badge de permissões - mostra quando usuário não pode criar E não pode editar */}
      {!podeAdicionarSetor && !podeEditarAlgumSetor() && setores.filter(setor => setorVisivel(setor.id)).length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            Somente Visualização
          </Badge>
          <span className="text-sm text-amber-700 dark:text-amber-400">
            Você tem permissão apenas para visualizar os setores. Não é possível criar ou editar registros.
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {setores.filter(setor => setorVisivel(setor.id)).map(setor => (
              <Card
                key={setor.id}
                onClick={() => onNavigateToSetor(setor.id)}
                className="hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{setor.nome}</CardTitle>
                      <CardDescription className="text-xs">
                        {setor.descricao || 'Sem descrição'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Clique para gerenciar funis
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {setores.filter(setor => setorVisivel(setor.id)).length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-2">Nenhum setor disponível</h3>
              <p className="text-muted-foreground mb-4">
                {setores.length === 0 
                  ? 'Nenhum setor foi cadastrado ainda.'
                  : 'Você não tem permissão para acessar nenhum setor.'}
              </p>
              {podeAdicionarSetor && setores.length === 0 && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Setor
                </Button>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Setor</DialogTitle>
            <DialogDescription>
              Crie um novo setor para organizar seus funis e processos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Setor *</Label>
              <Input
                id="nome"
                placeholder="Ex: Recursos Humanos, Logística..."
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva as responsabilidades deste setor..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSetor} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Setor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
