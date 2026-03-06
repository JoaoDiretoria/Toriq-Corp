import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, Calendar as CalendarIcon, Eye, GripVertical, LayoutGrid, List, BarChart3, TrendingUp, Clock, AlertTriangle, Loader2, Settings, ArrowLeft, Columns } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FunilConfigDialog } from './configuracoes/FunilConfigDialog';

interface FunilPageProps {
  funilId: string;
  onBack?: () => void;
}

interface Funil {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: 'negocio' | 'fluxo_trabalho';
  setor?: {
    nome: string;
  };
}

interface FunilEtapa {
  id: string;
  funil_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ordem: number;
  ativo: boolean;
}

interface FunilCard {
  id: string;
  funil_id: string;
  etapa_id: string;
  titulo: string;
  descricao: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  valor: number;
  data_previsao: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  ordem: number;
  created_at: string;
}

interface FunilConfiguracao {
  id: string;
  titulo_pagina: string;
  descricao_pagina: string;
  modo_visualizacao: 'kanban' | 'lista';
  dashboard_visivel: boolean;
  dashboard_metricas: string[];
  botao_adicionar_visivel: boolean;
  botao_adicionar_texto: string;
  card_mostrar_valor: boolean;
  card_mostrar_cliente: boolean;
  card_mostrar_data: boolean;
  card_mostrar_responsavel: boolean;
  card_mostrar_etiquetas: boolean;
}

interface DashboardMetrica {
  id: string;
  label: string;
  valor: string | number;
  icon: React.ReactNode;
  cor: string;
}

function SortableCard({ card, config, onClick }: { card: FunilCard; config: FunilConfiguracao; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div {...listeners} className="cursor-grab mt-1">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{card.titulo}</h4>
              {config.card_mostrar_cliente && card.cliente_nome && (
                <p className="text-xs text-muted-foreground truncate">{card.cliente_nome}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                {config.card_mostrar_valor && card.valor > 0 && (
                  <span className="text-sm font-bold text-primary">
                    R$ {card.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
                {config.card_mostrar_data && card.data_previsao && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {format(new Date(card.data_previsao + 'T00:00:00'), 'dd/MM/yyyy')}
                  </span>
                )}
              </div>
              {config.card_mostrar_responsavel && card.responsavel_nome && (
                <p className="text-xs text-muted-foreground mt-1">
                  Resp: {card.responsavel_nome}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableColumn({ etapa, cards, config, onCardClick }: { 
  etapa: FunilEtapa; 
  cards: FunilCard[]; 
  config: FunilConfiguracao;
  onCardClick: (card: FunilCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id });

  return (
    <div 
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-muted/30 rounded-lg p-3 ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.cor }} />
          <h3 className="font-medium text-sm">{etapa.nome}</h3>
          <Badge variant="secondary" className="text-xs">{cards.length}</Badge>
        </div>
      </div>
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {cards.map((card) => (
            <SortableCard 
              key={card.id} 
              card={card} 
              config={config}
              onClick={() => onCardClick(card)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function FunilPage({ funilId, onBack }: FunilPageProps) {
  const { toast } = useToast();
  const { user, empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || empresa?.id;

  const [loading, setLoading] = useState(true);
  const [funil, setFunil] = useState<Funil | null>(null);
  const [etapas, setEtapas] = useState<FunilEtapa[]>([]);
  const [cards, setCards] = useState<FunilCard[]>([]);
  const [config, setConfig] = useState<FunilConfiguracao | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState<'kanban' | 'lista'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [novaEtapaDialogOpen, setNovaEtapaDialogOpen] = useState(false);
  const [novaEtapaForm, setNovaEtapaForm] = useState({ nome: '', cor: '#6366f1' });
  const [savingEtapa, setSavingEtapa] = useState(false);

  // Dialog de novo card
  const [novoCardDialogOpen, setNovoCardDialogOpen] = useState(false);
  const [cardForm, setCardForm] = useState({
    titulo: '',
    descricao: '',
    cliente_id: '',
    valor: '',
    data_previsao: null as Date | null,
    responsavel_id: '',
    etapa_id: '',
  });

  // Dialog de visualização do card
  const [viewingCard, setViewingCard] = useState<FunilCard | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (funilId) {
      loadFunil();
      loadEtapas();
      loadCards();
      loadConfig();
    }
  }, [funilId]);

  useEffect(() => {
    if (config) {
      setModoVisualizacao(config.modo_visualizacao);
    }
  }, [config]);

  const loadFunil = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('funis')
        .select(`
          *,
          setor:setores(nome)
        `)
        .eq('id', funilId)
        .single();

      if (error) throw error;
      setFunil(data);
    } catch (error) {
      console.error('Erro ao carregar funil:', error);
    }
  };

  const loadEtapas = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('funil_etapas')
        .select('*')
        .eq('funil_id', funilId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setEtapas(data || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
    }
  };

  const loadCards = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('funil_cards')
        .select('*')
        .eq('funil_id', funilId)
        .order('ordem');

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Erro ao carregar cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('funis_configuracoes')
        .select('*')
        .eq('funil_id', funilId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setConfig(data);
      } else {
        // Configuração padrão
        setConfig({
          id: '',
          titulo_pagina: funil?.nome || 'Funil',
          descricao_pagina: funil?.descricao || '',
          modo_visualizacao: 'kanban',
          dashboard_visivel: true,
          dashboard_metricas: ['total_cards', 'valor_total', 'cards_por_etapa'],
          botao_adicionar_visivel: true,
          botao_adicionar_texto: 'Novo Card',
          card_mostrar_valor: funil?.tipo === 'negocio',
          card_mostrar_cliente: true,
          card_mostrar_data: true,
          card_mostrar_responsavel: true,
          card_mostrar_etiquetas: true,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const cardsPorEtapa = useMemo(() => {
    const result: Record<string, FunilCard[]> = {};
    etapas.forEach(etapa => {
      result[etapa.id] = cards
        .filter(c => c.etapa_id === etapa.id)
        .filter(c => !searchTerm || 
          c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.ordem - b.ordem);
    });
    return result;
  }, [cards, etapas, searchTerm]);

  const dashboardMetricas = useMemo((): DashboardMetrica[] => {
    if (!config?.dashboard_visivel) return [];

    const metricas: DashboardMetrica[] = [];
    
    if (config.dashboard_metricas.includes('total_cards')) {
      metricas.push({
        id: 'total_cards',
        label: 'Total de Cards',
        valor: cards.length,
        icon: <BarChart3 className="h-4 w-4" />,
        cor: 'text-blue-600',
      });
    }

    if (config.dashboard_metricas.includes('valor_total')) {
      const valorTotal = cards.reduce((acc, c) => acc + (c.valor || 0), 0);
      metricas.push({
        id: 'valor_total',
        label: 'Valor Total',
        valor: `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        icon: <TrendingUp className="h-4 w-4" />,
        cor: 'text-green-600',
      });
    }

    if (config.dashboard_metricas.includes('cards_atrasados')) {
      const hoje = new Date();
      const atrasados = cards.filter(c => c.data_previsao && new Date(c.data_previsao) < hoje).length;
      metricas.push({
        id: 'cards_atrasados',
        label: 'Cards Atrasados',
        valor: atrasados,
        icon: <AlertTriangle className="h-4 w-4" />,
        cor: 'text-red-600',
      });
    }

    return metricas;
  }, [cards, config]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Verificar se foi dropado em uma etapa
    const etapaDestino = etapas.find(e => e.id === over.id);
    if (etapaDestino && card.etapa_id !== etapaDestino.id) {
      // Mover para outra etapa
      try {
        await (supabase as any)
          .from('funil_cards')
          .update({ etapa_id: etapaDestino.id })
          .eq('id', cardId);

        setCards(prev => prev.map(c => 
          c.id === cardId ? { ...c, etapa_id: etapaDestino.id } : c
        ));
      } catch (error) {
        console.error('Erro ao mover card:', error);
      }
    }
  };

  const handleSaveCard = async () => {
    if (!cardForm.titulo.trim()) {
      toast({ title: 'Erro', description: 'Preencha o título do card.', variant: 'destructive' });
      return;
    }

    const etapaId = cardForm.etapa_id || etapas[0]?.id;
    if (!etapaId) {
      toast({ title: 'Erro', description: 'Nenhuma etapa disponível.', variant: 'destructive' });
      return;
    }

    try {
      const cardsNaEtapa = cards.filter(c => c.etapa_id === etapaId);
      const { error } = await (supabase as any)
        .from('funil_cards')
        .insert({
          funil_id: funilId,
          etapa_id: etapaId,
          titulo: cardForm.titulo,
          descricao: cardForm.descricao || null,
          cliente_id: cardForm.cliente_id || null,
          valor: parseFloat(cardForm.valor) || 0,
          data_previsao: cardForm.data_previsao ? format(cardForm.data_previsao, 'yyyy-MM-dd') : null,
          responsavel_id: cardForm.responsavel_id || null,
          ordem: cardsNaEtapa.length,
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Card criado com sucesso!' });
      setNovoCardDialogOpen(false);
      setCardForm({
        titulo: '',
        descricao: '',
        cliente_id: '',
        valor: '',
        data_previsao: null,
        responsavel_id: '',
        etapa_id: '',
      });
      loadCards();
    } catch (error) {
      console.error('Erro ao salvar card:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar o card.', variant: 'destructive' });
    }
  };

  const handleCardClick = (card: FunilCard) => {
    setViewingCard(card);
    setViewDialogOpen(true);
  };

  const handleCreateEtapa = async () => {
    if (!novaEtapaForm.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome da etapa é obrigatório.', variant: 'destructive' });
      return;
    }
    
    setSavingEtapa(true);
    try {
      const novaOrdem = etapas.length;
      const { error } = await (supabase as any)
        .from('funil_etapas')
        .insert({
          funil_id: funilId,
          nome: novaEtapaForm.nome.trim(),
          cor: novaEtapaForm.cor,
          ordem: novaOrdem,
          ativo: true
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Etapa criada com sucesso!' });
      setNovaEtapaDialogOpen(false);
      setNovaEtapaForm({ nome: '', cor: '#6366f1' });
      loadEtapas();
    } catch (error) {
      console.error('Erro ao criar etapa:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar a etapa.', variant: 'destructive' });
    } finally {
      setSavingEtapa(false);
    }
  };

  if (loading && !funil) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!funil || !config) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Funil não encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{config.titulo_pagina || funil.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {funil.setor?.nome && `${funil.setor.nome} • `}
              {funil.tipo === 'negocio' ? 'Funil de Negócios' : 'Fluxo de Trabalho'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setNovaEtapaDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Etapa
          </Button>
          <div className="flex border rounded-lg">
            <Button
              variant={modoVisualizacao === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setModoVisualizacao('kanban')}
              className="gap-1"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
            <Button
              variant={modoVisualizacao === 'lista' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setModoVisualizacao('lista')}
              className="gap-1"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setConfigDialogOpen(true)}
            title="Configurações do Funil"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dashboard de Métricas */}
      {config.dashboard_visivel && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total de Cards</p>
              <p className="text-3xl font-bold">{cards.length}</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Cards por Etapa</p>
              <p className="text-3xl font-bold">{etapas.length > 0 ? Math.round(cards.length / etapas.length) : 0}</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Cards Atrasados</p>
              <p className="text-3xl font-bold text-red-600">
                {cards.filter(c => c.data_previsao && new Date(c.data_previsao) < new Date()).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {config.botao_adicionar_visivel && (
          <Button onClick={() => setNovoCardDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {config.botao_adicionar_texto || 'Novo Card'}
          </Button>
        )}
      </div>

      {/* Kanban View */}
      {modoVisualizacao === 'kanban' && (
        etapas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
            <Columns className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Este funil ainda não possui etapas.
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie etapas para começar a adicionar cards.
            </p>
            <Button onClick={() => setNovaEtapaDialogOpen(true)} variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Etapa
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4" style={{ minWidth: `${etapas.length * 300}px` }}>
                {etapas.map((etapa) => (
                  <DroppableColumn
                    key={etapa.id}
                    etapa={etapa}
                    cards={cardsPorEtapa[etapa.id] || []}
                    config={config}
                    onCardClick={handleCardClick}
                  />
                ))}
              </div>
            </ScrollArea>
          </DndContext>
        )
      )}

      {/* List View */}
      {modoVisualizacao === 'lista' && (
        etapas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
            <Columns className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Este funil ainda não possui etapas.
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie etapas para começar a adicionar cards.
            </p>
            <Button onClick={() => setNovaEtapaDialogOpen(true)} variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Etapa
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {etapas.map((etapa) => (
              <div key={etapa.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.cor }} />
                  <h3 className="font-medium">{etapa.nome}</h3>
                  <Badge variant="secondary">{(cardsPorEtapa[etapa.id] || []).length}</Badge>
                </div>
                <div className="space-y-2">
                  {(cardsPorEtapa[etapa.id] || []).map((card) => (
                    <Card key={card.id} className="cursor-pointer hover:shadow-md" onClick={() => handleCardClick(card)}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{card.titulo}</h4>
                          {config.card_mostrar_cliente && card.cliente_nome && (
                            <p className="text-sm text-muted-foreground">{card.cliente_nome}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          {config.card_mostrar_valor && card.valor > 0 && (
                            <span className="font-bold text-primary">
                              R$ {card.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                          {config.card_mostrar_data && card.data_previsao && (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(card.data_previsao + 'T00:00:00'), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Dialog Novo Card */}
      <Dialog open={novoCardDialogOpen} onOpenChange={setNovoCardDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <Plus className="h-5 w-5 inline mr-2" />
              {config.botao_adicionar_texto || 'Novo Card'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do novo card
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={cardForm.titulo}
                onChange={(e) => setCardForm({ ...cardForm, titulo: e.target.value })}
                placeholder="Título do card"
              />
            </div>

            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select value={cardForm.etapa_id || etapas[0]?.id} onValueChange={(v) => setCardForm({ ...cardForm, etapa_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {etapas.map((etapa) => (
                    <SelectItem key={etapa.id} value={etapa.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: etapa.cor }} />
                        {etapa.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config.card_mostrar_valor && (
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={cardForm.valor}
                  onChange={(e) => setCardForm({ ...cardForm, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            )}

            {config.card_mostrar_data && (
              <div className="space-y-2">
                <Label>Data Previsão</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {cardForm.data_previsao ? format(cardForm.data_previsao, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={cardForm.data_previsao || undefined}
                      onSelect={(date) => setCardForm({ ...cardForm, data_previsao: date || null })}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={cardForm.descricao}
                onChange={(e) => setCardForm({ ...cardForm, descricao: e.target.value })}
                placeholder="Descrição do card"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoCardDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCard}>
              Criar Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Visualizar Card */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingCard?.titulo}</DialogTitle>
          </DialogHeader>
          {viewingCard && (
            <div className="space-y-4">
              {viewingCard.descricao && (
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="mt-1">{viewingCard.descricao}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {config.card_mostrar_cliente && viewingCard.cliente_nome && (
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p className="mt-1 font-medium">{viewingCard.cliente_nome}</p>
                  </div>
                )}
                {config.card_mostrar_valor && viewingCard.valor > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Valor</Label>
                    <p className="mt-1 font-bold text-primary">
                      R$ {viewingCard.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {config.card_mostrar_data && viewingCard.data_previsao && (
                  <div>
                    <Label className="text-muted-foreground">Data Previsão</Label>
                    <p className="mt-1">{format(new Date(viewingCard.data_previsao + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                  </div>
                )}
                {config.card_mostrar_responsavel && viewingCard.responsavel_nome && (
                  <div>
                    <Label className="text-muted-foreground">Responsável</Label>
                    <p className="mt-1">{viewingCard.responsavel_nome}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Etapa */}
      <Dialog open={novaEtapaDialogOpen} onOpenChange={setNovaEtapaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Etapa</DialogTitle>
            <DialogDescription>
              Crie uma nova etapa para o funil
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Etapa *</Label>
              <Input
                value={novaEtapaForm.nome}
                onChange={(e) => setNovaEtapaForm({ ...novaEtapaForm, nome: e.target.value })}
                placeholder="Ex: Em Andamento, Aguardando, Concluído..."
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={novaEtapaForm.cor}
                  onChange={(e) => setNovaEtapaForm({ ...novaEtapaForm, cor: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer border"
                />
                <Input
                  value={novaEtapaForm.cor}
                  onChange={(e) => setNovaEtapaForm({ ...novaEtapaForm, cor: e.target.value })}
                  className="flex-1"
                  placeholder="#6366f1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaEtapaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEtapa} disabled={savingEtapa || !novaEtapaForm.nome.trim()}>
              {savingEtapa ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Configuração */}
      <FunilConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        funilId={funilId}
        funilNome={funil.nome}
        funilTipo={funil.tipo}
        empresaId={empresaId}
        onSave={() => loadConfig()}
      />
    </div>
  );
}
