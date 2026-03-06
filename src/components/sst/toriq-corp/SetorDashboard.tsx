import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { usePermissoes } from '@/hooks/usePermissoes';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, 
  Kanban, 
  LayoutGrid, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ArrowLeft,
  Loader2,
  LucideIcon,
  DollarSign,
  ListTodo,
  Trash2,
  AlertTriangle
} from 'lucide-react';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Funil {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  ativo: boolean;
  created_at: string;
  _count?: {
    cards: number;
    atividades: number;
  };
}

interface SetorDashboardProps {
  titulo: string;
  descricao: string;
  setorNome: string;
  setorId?: string; // ID do setor para verificar permissões
  icon: LucideIcon;
  onNavigateToFunil: (funilId: string) => void;
  onBack?: () => void;
}

export function SetorDashboard({ 
  titulo, 
  descricao, 
  setorNome, 
  setorId: propSetorId,
  icon: Icon,
  onNavigateToFunil,
  onBack 
}: SetorDashboardProps) {
  const { empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const { podeVisualizar, podeEditar, podeCriar } = usePermissoes();
  const empresaId = empresaMode?.empresaId || empresa?.id;
  const { toast } = useToast();

  const [funis, setFunis] = useState<Funil[]>([]);
  const [loading, setLoading] = useState(true);
  const [setorId, setSetorId] = useState<string | null>(propSetorId || null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [criandoFunil, setCriandoFunil] = useState(false);
  const [novoFunil, setNovoFunil] = useState({
    nome: '',
    descricao: '',
    tipo: 'fluxo_trabalho' as 'negocio' | 'fluxo_trabalho',
  });

  // Estados para apagar funil
  const [apagarFunilDialogOpen, setApagarFunilDialogOpen] = useState(false);
  const [funilParaApagar, setFunilParaApagar] = useState<Funil | null>(null);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('');
  const [apagandoFunil, setApagandoFunil] = useState(false);
  const TEXTO_CONFIRMACAO = 'APAGAR FUNIL';

  // Métricas
  const [metricas, setMetricas] = useState({
    totalFunis: 0,
    totalCards: 0,
    totalAtividades: 0,
  });

  // Permissões do setor atual
  const secaoSetor = setorId ? `setor-${setorId}` : '';
  const temPermissaoVisualizar = secaoSetor ? podeVisualizar(secaoSetor) : true;
  const temPermissaoEditar = secaoSetor ? podeEditar(secaoSetor) : true;
  const temPermissaoCriar = secaoSetor ? podeCriar(secaoSetor) : true;

  // Função para verificar permissão antes de executar ação
  const verificarPermissaoAntesDaAcao = (acao: 'criar' | 'editar', callback: () => void) => {
    if (acao === 'criar' && !temPermissaoCriar) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para criar novos registros neste setor.',
        variant: 'destructive',
      });
      return;
    }
    if (acao === 'editar' && !temPermissaoEditar) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para editar registros neste setor.',
        variant: 'destructive',
      });
      return;
    }
    callback();
  };

  useEffect(() => {
    if (empresaId) {
      loadSetorEFunis();
    }
  }, [empresaId, setorNome]);

  const loadSetorEFunis = async () => {
    try {
      setLoading(true);

      // Buscar ou criar setor
      let { data: setor, error: setorError } = await (supabase as any)
        .from('setores')
        .select('id')
        .eq('empresa_id', empresaId)
        .ilike('nome', setorNome)
        .single();

      if (setorError && setorError.code === 'PGRST116') {
        // Setor não existe, criar
        const { data: novoSetor, error: createError } = await (supabase as any)
          .from('setores')
          .insert({
            empresa_id: empresaId,
            nome: setorNome,
            descricao: `Setor ${setorNome}`,
            ativo: true,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        setor = novoSetor;
      } else if (setorError) {
        throw setorError;
      }

      setSetorId(setor.id);

      // Buscar funis do setor
      const { data: funisData, error: funisError } = await (supabase as any)
        .from('funis')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('setor_id', setor.id)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (funisError) throw funisError;

      // Buscar contagens para cada funil
      const funisComContagem = await Promise.all(
        (funisData || []).map(async (funil: Funil) => {
          // Contar cards
          const { count: cardsCount } = await (supabase as any)
            .from('funil_cards')
            .select('*', { count: 'exact', head: true })
            .eq('funil_id', funil.id)
            .eq('ativo', true);

          // Contar atividades
          const { count: atividadesCount } = await (supabase as any)
            .from('funil_card_atividades')
            .select('*, funil_cards!inner(funil_id)', { count: 'exact', head: true })
            .eq('funil_cards.funil_id', funil.id);

          return {
            ...funil,
            _count: {
              cards: cardsCount || 0,
              atividades: atividadesCount || 0,
            },
          };
        })
      );

      setFunis(funisComContagem);

      // Calcular métricas totais
      const totalCards = funisComContagem.reduce((acc, f) => acc + (f._count?.cards || 0), 0);
      const totalAtividades = funisComContagem.reduce((acc, f) => acc + (f._count?.atividades || 0), 0);

      setMetricas({
        totalFunis: funisComContagem.length,
        totalCards,
        totalAtividades,
      });

    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os funis.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCriarFunil = async () => {
    if (!novoFunil.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o nome do funil.',
        variant: 'destructive',
      });
      return;
    }

    if (!setorId) {
      toast({
        title: 'Erro',
        description: 'Setor não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    setCriandoFunil(true);
    try {
      // Criar funil
      const { data, error } = await (supabase as any)
        .from('funis')
        .insert({
          empresa_id: empresaId,
          setor_id: setorId,
          nome: novoFunil.nome.trim(),
          descricao: novoFunil.descricao.trim() || null,
          tipo: novoFunil.tipo,
          ativo: true,
          ordem: funis.length + 1,
        })
        .select()
        .single();

      if (error) throw error;

      // Etapas serão criadas manualmente pelo usuário nas configurações do funil

      toast({
        title: 'Sucesso',
        description: 'Funil criado com sucesso!',
      });

      setDialogOpen(false);
      setNovoFunil({ nome: '', descricao: '', tipo: 'fluxo_trabalho' });
      loadSetorEFunis();

      // Navegar para o novo funil
      if (data?.id) {
        onNavigateToFunil(data.id);
      }
    } catch (error) {
      console.error('Erro ao criar funil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o funil.',
        variant: 'destructive',
      });
    } finally {
      setCriandoFunil(false);
    }
  };

  // Função para apagar funil
  const handleApagarFunil = async () => {
    if (!funilParaApagar || confirmacaoTexto !== TEXTO_CONFIRMACAO) return;

    setApagandoFunil(true);
    try {
      // 1. Buscar todos os cards do funil
      const { data: cards } = await (supabase as any)
        .from('funil_cards')
        .select('id')
        .eq('funil_id', funilParaApagar.id);

      const cardIds = cards?.map((c: any) => c.id) || [];

      if (cardIds.length > 0) {
        // 2. Deletar atividades dos cards
        await (supabase as any)
          .from('funil_card_atividades')
          .delete()
          .in('card_id', cardIds);

        // 3. Deletar anexos dos cards
        await (supabase as any)
          .from('funil_card_anexos')
          .delete()
          .in('card_id', cardIds);

        // 4. Deletar automações de execução relacionadas
        await (supabase as any)
          .from('automacoes_execucoes')
          .delete()
          .in('card_id', cardIds);

        // 5. Deletar cards
        await (supabase as any)
          .from('funil_cards')
          .delete()
          .eq('funil_id', funilParaApagar.id);
      }

      // 6. Deletar etapas do funil
      await (supabase as any)
        .from('funil_etapas')
        .delete()
        .eq('funil_id', funilParaApagar.id);

      // 7. Deletar automações do funil
      await (supabase as any)
        .from('automacoes')
        .delete()
        .eq('funil_id', funilParaApagar.id);

      // 8. Deletar o funil
      const { error } = await (supabase as any)
        .from('funis')
        .delete()
        .eq('id', funilParaApagar.id);

      if (error) throw error;

      toast({
        title: 'Funil apagado',
        description: `O funil "${funilParaApagar.nome}" e todos os seus dados foram apagados permanentemente.`,
      });

      setApagarFunilDialogOpen(false);
      setFunilParaApagar(null);
      setConfirmacaoTexto('');
      loadSetorEFunis();
    } catch (error) {
      console.error('Erro ao apagar funil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível apagar o funil.',
        variant: 'destructive',
      });
    } finally {
      setApagandoFunil(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{titulo}</h1>
            <p className="text-muted-foreground">{descricao}</p>
          </div>
        </div>
        <Button 
          onClick={() => verificarPermissaoAntesDaAcao('criar', () => setDialogOpen(true))}
          disabled={!temPermissaoCriar}
          title={!temPermissaoCriar ? 'Você não tem permissão para criar funis' : 'Criar novo funil'}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Funil
        </Button>
      </div>

      {/* Badge de permissões */}
      {!temPermissaoCriar && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            Somente Visualização
          </Badge>
          <span className="text-sm text-amber-700 dark:text-amber-400">
            Você tem permissão apenas para visualizar este setor. Não é possível criar ou editar registros.
          </span>
        </div>
      )}

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Total de Funis
            </CardDescription>
            <CardTitle className="text-3xl">{metricas.totalFunis}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Total de Cards
            </CardDescription>
            <CardTitle className="text-3xl">{metricas.totalCards}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Total de Atividades
            </CardDescription>
            <CardTitle className="text-3xl">{metricas.totalAtividades}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de Funis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Kanban className="h-5 w-5" />
            Funis do Setor
          </CardTitle>
          <CardDescription>
            Clique em um funil para acessar o quadro Kanban
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : funis.length === 0 ? (
            <div className="text-center py-8">
              <Kanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                Nenhum funil criado ainda para este setor.
              </p>
              {temPermissaoCriar && (
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro funil
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {funis.map((funil) => (
                <div
                  key={funil.id}
                  onClick={() => onNavigateToFunil(funil.id)}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Kanban className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {funil.nome}
                      </h3>
                      {funil.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {funil.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Criado em {format(new Date(funil.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <LayoutGrid className="h-3 w-3" />
                        {funil._count?.cards || 0} cards
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {funil._count?.atividades || 0} atividades
                      </Badge>
                    </div>
                    {temPermissaoEditar && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFunilParaApagar(funil);
                          setApagarFunilDialogOpen(true);
                        }}
                        title="Apagar funil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar novo funil */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Funil</DialogTitle>
            <DialogDescription>
              Crie um novo funil Kanban para o setor {setorNome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Funil *</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setNovoFunil({ ...novoFunil, tipo: 'negocio' })}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    novoFunil.tipo === 'negocio'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-medium">Negócio</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para vendas, propostas e oportunidades comerciais
                  </p>
                </div>
                <div
                  onClick={() => setNovoFunil({ ...novoFunil, tipo: 'fluxo_trabalho' })}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    novoFunil.tipo === 'fluxo_trabalho'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ListTodo className="h-5 w-5 text-secondary-foreground" />
                    <span className="font-medium">Fluxo de Trabalho</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para tarefas, processos e gestão de atividades
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Funil *</Label>
              <Input
                id="nome"
                placeholder="Ex: Vendas B2B, Onboarding, etc."
                value={novoFunil.nome}
                onChange={(e) => setNovoFunil({ ...novoFunil, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o objetivo deste funil..."
                value={novoFunil.descricao}
                onChange={(e) => setNovoFunil({ ...novoFunil, descricao: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarFunil} disabled={criandoFunil}>
              {criandoFunil ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Funil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para apagar funil */}
      <AlertDialog open={apagarFunilDialogOpen} onOpenChange={(open) => {
        setApagarFunilDialogOpen(open);
        if (!open) {
          setFunilParaApagar(null);
          setConfirmacaoTexto('');
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Apagar Funil Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Você está prestes a apagar o funil <strong>"{funilParaApagar?.nome}"</strong>.
                </p>
                
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-destructive">Esta ação irá apagar permanentemente:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>{funilParaApagar?._count?.cards || 0}</strong> cards</li>
                    <li><strong>{funilParaApagar?._count?.atividades || 0}</strong> atividades</li>
                    <li>Todas as etapas do funil</li>
                    <li>Todas as automações configuradas</li>
                    <li>Todos os anexos dos cards</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Para confirmar, digite <strong className="text-destructive">{TEXTO_CONFIRMACAO}</strong> abaixo:
                  </p>
                  <Input
                    value={confirmacaoTexto}
                    onChange={(e) => setConfirmacaoTexto(e.target.value.toUpperCase())}
                    placeholder={TEXTO_CONFIRMACAO}
                    className="font-mono"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApagarFunil}
              disabled={confirmacaoTexto !== TEXTO_CONFIRMACAO || apagandoFunil}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {apagandoFunil ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Apagando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar Funil
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
