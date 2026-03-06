import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, LayoutDashboard, CreditCard, ListTodo, Plus, Eye, EyeOff, Save, Loader2, LayoutGrid, List, GripVertical, Kanban, Pencil, Trash2, X, Check, Lock } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FunilConfiguracao {
  id?: string;
  funil_id: string;
  titulo_pagina: string;
  descricao_pagina: string;
  modo_visualizacao: 'kanban' | 'lista';
  dashboard_visivel: boolean;
  dashboard_tipo: string;
  dashboard_metricas: string[];
  botao_adicionar_visivel: boolean;
  botao_adicionar_texto: string;
  card_mostrar_valor: boolean;
  card_mostrar_cliente: boolean;
  card_mostrar_data: boolean;
  card_mostrar_responsavel: boolean;
  card_mostrar_etiquetas: boolean;
  card_mostrar_status: boolean;
  card_mostrar_status_atividade: boolean;
  cards_ordenacao: 'ordem_chegada' | 'atividade_proxima' | 'data_previsao' | 'valor' | 'prioridade';
  card_interno_atividades_tipos: string[];
  card_interno_acoes_rapidas: string[];
  card_interno_mostrar_historico: boolean;
  card_interno_mostrar_movimentacoes: boolean;
  acoes_especiais: any[];
  formulario_campos: any[];
}

interface FunilConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funilId: string;
  funilNome: string;
  funilTipo: 'negocio' | 'fluxo_trabalho';
  empresaId?: string;
  onSave?: () => void;
}

interface FunilEtapa {
  id: string;
  funil_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ordem: number;
  ativo: boolean;
  trancada?: boolean;
}

// Componente para etapa arrastável no dialog de configuração
interface SortableEtapaConfigItemProps {
  etapa: FunilEtapa;
  index: number;
  onEdit: (etapa: FunilEtapa) => void;
  onDelete: (etapaId: string) => void;
}

function SortableEtapaConfigItem({ etapa, index, onEdit, onDelete }: SortableEtapaConfigItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: etapa.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border group"
    >
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div 
        className="w-3 h-3 rounded-full flex-shrink-0" 
        style={{ backgroundColor: etapa.cor }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
          <span className="font-medium truncate">{etapa.nome}</span>
          {etapa.trancada && <span className="flex-shrink-0"><Lock className="h-3 w-3 text-orange-500" /></span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(etapa)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(etapa.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

const TIPOS_ATIVIDADE = [
  { id: 'tarefa', label: 'Tarefa' },
  { id: 'email', label: 'E-mail' },
  { id: 'ligacao', label: 'Ligação' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'reuniao', label: 'Reunião' },
  { id: 'visita', label: 'Visita' },
  { id: 'nota', label: 'Nota' },
  { id: 'checklist', label: 'Checklist' },
];

const ACOES_RAPIDAS = [
  { id: 'editar', label: 'Editar Card' },
  { id: 'mover', label: 'Mover Card' },
  { id: 'excluir', label: 'Excluir Card' },
  { id: 'nova_atividade', label: 'Nova Atividade' },
  { id: 'etiquetas', label: 'Gerenciar Etiquetas' },
  { id: 'encaminhar_card', label: 'Encaminhar Card' },
  { id: 'enviar_email', label: 'Enviar E-mail' },
  { id: 'atribuir_kit', label: 'Atribuir Kit Equipamentos' },
  { id: 'atribuir_veiculo', label: 'Atribuir Movimentação de Veículo' },
  { id: 'elaborar_orcamento', label: 'Elaborar Orçamento', apenasNegocio: true },
  { id: 'ver_propostas', label: 'Propostas', apenasNegocio: true },
];

const METRICAS_DASHBOARD = [
  { id: 'total_cards', label: 'Total de Cards' },
  { id: 'valor_total', label: 'Valor Total' },
  { id: 'taxa_conversao', label: 'Taxa de Conversão' },
  { id: 'taxa_perdido', label: 'Taxa de Perdido' },
  { id: 'cards_atrasados', label: 'Cards Atrasados' },
  { id: 'media_tempo_etapa', label: 'Média de Tempo por Etapa' },
];

const CAMPOS_FORMULARIO_PADRAO = [
  { campo: 'titulo', label: 'Título', tipo: 'text', obrigatorio: false, visivel: true },
  { campo: 'cliente', label: 'Cliente', tipo: 'select', obrigatorio: false, visivel: true },
  { campo: 'valor', label: 'Valor', tipo: 'currency', obrigatorio: false, visivel: true },
  { campo: 'data_previsao', label: 'Data Previsão', tipo: 'date', obrigatorio: false, visivel: true },
  { campo: 'responsavel', label: 'Responsável', tipo: 'select', obrigatorio: false, visivel: true },
  { campo: 'descricao', label: 'Descrição', tipo: 'textarea', obrigatorio: false, visivel: true },
];

// Componente sortable para campos do formulário
function SortableFormularioCampo({ 
  campo, 
  index, 
  updateFormularioCampo 
}: { 
  campo: any; 
  index: number; 
  updateFormularioCampo: (index: number, field: string, value: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: campo.campo });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg bg-card ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <span className="font-medium text-sm">{campo.label}</span>
        <span className="text-xs text-muted-foreground ml-2">({campo.tipo})</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`campo-visivel-${campo.campo}`}
            checked={campo.visivel}
            onCheckedChange={(checked) => updateFormularioCampo(index, 'visivel', checked)}
          />
          <Label htmlFor={`campo-visivel-${campo.campo}`} className="text-xs">Visível</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`campo-obrigatorio-${campo.campo}`}
            checked={campo.obrigatorio}
            onCheckedChange={(checked) => updateFormularioCampo(index, 'obrigatorio', checked)}
          />
          <Label htmlFor={`campo-obrigatorio-${campo.campo}`} className="text-xs">Obrigatório</Label>
        </div>
      </div>
    </div>
  );
}

export function FunilConfigDialog({ open, onOpenChange, funilId, funilNome, funilTipo, empresaId, onSave }: FunilConfigDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [etapas, setEtapas] = useState<FunilEtapa[]>([]);
  const [loadingEtapas, setLoadingEtapas] = useState(false);
  
  // Estados para criar/editar etapa
  const [editingEtapa, setEditingEtapa] = useState<FunilEtapa | null>(null);
  const [novaEtapaForm, setNovaEtapaForm] = useState({ nome: '', cor: '#6366f1', trancada: false });
  const [showNovaEtapaForm, setShowNovaEtapaForm] = useState(false);
  const [savingEtapa, setSavingEtapa] = useState(false);

  // Sensors para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [config, setConfig] = useState<FunilConfiguracao>({
    funil_id: funilId,
    titulo_pagina: funilNome,
    descricao_pagina: '',
    modo_visualizacao: 'kanban',
    dashboard_visivel: true,
    dashboard_tipo: 'simples',
    dashboard_metricas: funilTipo === 'negocio' 
      ? ['total_cards', 'valor_total', 'taxa_conversao'] 
      : ['total_cards', 'cards_atrasados', 'media_tempo_etapa'],
    botao_adicionar_visivel: true,
    botao_adicionar_texto: 'Novo Card',
    card_mostrar_valor: funilTipo === 'negocio',
    card_mostrar_cliente: true,
    card_mostrar_data: true,
    card_mostrar_responsavel: true,
    card_mostrar_etiquetas: true,
    card_mostrar_status: true,
    card_mostrar_status_atividade: true,
    cards_ordenacao: 'ordem_chegada',
    card_interno_atividades_tipos: ['tarefa', 'email', 'ligacao', 'whatsapp', 'reuniao', 'visita', 'nota'],
    card_interno_acoes_rapidas: ['editar_card', 'mover_card', 'excluir_card', 'nova_atividade', 'etiquetas', 'encaminhar_card', 'enviar_email', 'atribuir_kit', 'atribuir_veiculo', 'elaborar_orcamento', 'ver_propostas', 'finalizar_card'],
    card_interno_mostrar_historico: true,
    card_interno_mostrar_movimentacoes: true,
    acoes_especiais: [],
    formulario_campos: CAMPOS_FORMULARIO_PADRAO,
  });

  useEffect(() => {
    if (open && funilId) {
      loadConfig();
      loadEtapas();
    }
  }, [open, funilId]);

  const loadEtapas = async () => {
    setLoadingEtapas(true);
    try {
      const { data, error } = await (supabase as any)
        .from('funil_etapas')
        .select('*')
        .eq('funil_id', funilId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setEtapas(data || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
    } finally {
      setLoadingEtapas(false);
    }
  };

  const handleEtapaDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = etapas.findIndex(e => e.id === active.id);
    const newIndex = etapas.findIndex(e => e.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newEtapas = arrayMove(etapas, oldIndex, newIndex);
    
    // Atualizar estado local imediatamente
    setEtapas(newEtapas);

    // Atualizar ordem no banco de dados
    try {
      const updates = newEtapas.map((etapa, index) => ({
        id: etapa.id,
        ordem: index
      }));

      for (const update of updates) {
        await (supabase as any)
          .from('funil_etapas')
          .update({ ordem: update.ordem })
          .eq('id', update.id);
      }

      toast({ title: 'Sucesso', description: 'Ordem das etapas atualizada!' });
    } catch (error) {
      console.error('Erro ao reordenar etapas:', error);
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível salvar a nova ordem.', 
        variant: 'destructive' 
      });
      // Reverter em caso de erro
      loadEtapas();
    }
  };

  // Criar nova etapa
  const handleCreateEtapa = async () => {
    if (!novaEtapaForm.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome da etapa é obrigatório.', variant: 'destructive' });
      return;
    }
    
    setSavingEtapa(true);
    try {
      const novaOrdem = etapas.length;
      const { data, error } = await (supabase as any)
        .from('funil_etapas')
        .insert({
          funil_id: funilId,
          nome: novaEtapaForm.nome.trim(),
          cor: novaEtapaForm.cor,
          ordem: novaOrdem,
          ativo: true,
          trancada: novaEtapaForm.trancada
        })
        .select()
        .single();

      if (error) throw error;

      setEtapas([...etapas, data]);
      setNovaEtapaForm({ nome: '', cor: '#6366f1', trancada: false });
      setShowNovaEtapaForm(false);
      toast({ title: 'Sucesso', description: 'Etapa criada com sucesso!' });
    } catch (error) {
      console.error('Erro ao criar etapa:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar a etapa.', variant: 'destructive' });
    } finally {
      setSavingEtapa(false);
    }
  };

  // Editar etapa existente
  const handleEditEtapa = (etapa: FunilEtapa) => {
    setEditingEtapa(etapa);
    setNovaEtapaForm({ nome: etapa.nome, cor: etapa.cor, trancada: etapa.trancada || false });
  };

  // Salvar edição de etapa
  const handleSaveEditEtapa = async () => {
    if (!editingEtapa || !novaEtapaForm.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome da etapa é obrigatório.', variant: 'destructive' });
      return;
    }
    
    setSavingEtapa(true);
    try {
      const { error } = await (supabase as any)
        .from('funil_etapas')
        .update({
          nome: novaEtapaForm.nome.trim(),
          cor: novaEtapaForm.cor,
          trancada: novaEtapaForm.trancada
        })
        .eq('id', editingEtapa.id);

      if (error) throw error;

      setEtapas(etapas.map(e => 
        e.id === editingEtapa.id 
          ? { ...e, nome: novaEtapaForm.nome.trim(), cor: novaEtapaForm.cor, trancada: novaEtapaForm.trancada }
          : e
      ));
      setEditingEtapa(null);
      setNovaEtapaForm({ nome: '', cor: '#6366f1', trancada: false });
      toast({ title: 'Sucesso', description: 'Etapa atualizada com sucesso!' });
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a etapa.', variant: 'destructive' });
    } finally {
      setSavingEtapa(false);
    }
  };

  // Excluir etapa
  const handleDeleteEtapa = async (etapaId: string) => {
    // Verificar se há cards nesta etapa
    try {
      const { count, error: countError } = await (supabase as any)
        .from('funil_cards')
        .select('*', { count: 'exact', head: true })
        .eq('etapa_id', etapaId);

      if (countError) throw countError;

      if (count && count > 0) {
        toast({ 
          title: 'Atenção', 
          description: `Esta etapa possui ${count} card(s). Mova-os para outra etapa antes de excluir.`, 
          variant: 'destructive' 
        });
        return;
      }

      // Excluir etapa (soft delete)
      const { error } = await (supabase as any)
        .from('funil_etapas')
        .update({ ativo: false })
        .eq('id', etapaId);

      if (error) throw error;

      setEtapas(etapas.filter(e => e.id !== etapaId));
      toast({ title: 'Sucesso', description: 'Etapa excluída com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir a etapa.', variant: 'destructive' });
    }
  };

  // Cancelar edição/criação
  const handleCancelEtapaForm = () => {
    setEditingEtapa(null);
    setShowNovaEtapaForm(false);
    setNovaEtapaForm({ nome: '', cor: '#6366f1', trancada: false });
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('funis_configuracoes')
        .select('*')
        .eq('funil_id', funilId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig(prevConfig => ({
          ...prevConfig,
          id: data.id,
          funil_id: funilId,
          titulo_pagina: data.titulo_pagina || funilNome,
          descricao_pagina: data.descricao_pagina || '',
          modo_visualizacao: data.modo_visualizacao || 'kanban',
          dashboard_visivel: data.dashboard_visivel ?? true,
          dashboard_tipo: data.dashboard_tipo || 'simples',
          dashboard_metricas: data.dashboard_metricas || prevConfig.dashboard_metricas,
          botao_adicionar_visivel: data.botao_adicionar_visivel ?? true,
          botao_adicionar_texto: data.botao_adicionar_texto || 'Novo Card',
          card_mostrar_valor: data.card_mostrar_valor ?? (funilTipo === 'negocio'),
          card_mostrar_cliente: data.card_mostrar_cliente ?? true,
          card_mostrar_data: data.card_mostrar_data ?? true,
          card_mostrar_responsavel: data.card_mostrar_responsavel ?? true,
          card_mostrar_etiquetas: data.card_mostrar_etiquetas ?? true,
          card_mostrar_status: data.card_mostrar_status ?? true,
          card_mostrar_status_atividade: data.card_mostrar_status_atividade ?? true,
          cards_ordenacao: data.cards_ordenacao || 'ordem_chegada',
          card_interno_atividades_tipos: data.card_interno_atividades_tipos || prevConfig.card_interno_atividades_tipos,
          card_interno_acoes_rapidas: data.card_interno_acoes_rapidas || prevConfig.card_interno_acoes_rapidas,
          card_interno_mostrar_historico: data.card_interno_mostrar_historico ?? true,
          card_interno_mostrar_movimentacoes: data.card_interno_mostrar_movimentacoes ?? true,
          acoes_especiais: data.acoes_especiais || [],
          formulario_campos: data.formulario_campos || CAMPOS_FORMULARIO_PADRAO,
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        funil_id: funilId,
        titulo_pagina: config.titulo_pagina,
        descricao_pagina: config.descricao_pagina,
        modo_visualizacao: config.modo_visualizacao,
        dashboard_visivel: config.dashboard_visivel,
        dashboard_tipo: config.dashboard_tipo,
        dashboard_metricas: config.dashboard_metricas,
        botao_adicionar_visivel: config.botao_adicionar_visivel,
        botao_adicionar_texto: config.botao_adicionar_texto,
        card_mostrar_valor: config.card_mostrar_valor,
        card_mostrar_cliente: config.card_mostrar_cliente,
        card_mostrar_data: config.card_mostrar_data,
        card_mostrar_responsavel: config.card_mostrar_responsavel,
        card_mostrar_etiquetas: config.card_mostrar_etiquetas,
        card_mostrar_status: config.card_mostrar_status,
        card_mostrar_status_atividade: config.card_mostrar_status_atividade,
        cards_ordenacao: config.cards_ordenacao,
        card_interno_atividades_tipos: config.card_interno_atividades_tipos,
        card_interno_acoes_rapidas: config.card_interno_acoes_rapidas,
        card_interno_mostrar_historico: config.card_interno_mostrar_historico,
        card_interno_mostrar_movimentacoes: config.card_interno_mostrar_movimentacoes,
        acoes_especiais: config.acoes_especiais,
        formulario_campos: config.formulario_campos,
        updated_at: new Date().toISOString(),
      };

      // Sempre incluir empresa_id para RLS funcionar corretamente
      if (empresaId) {
        payload.empresa_id = empresaId;
      }

      console.log('[FunilConfigDialog] Salvando config:', { configId: config.id, payload });

      if (config.id) {
        console.log('[FunilConfigDialog] Atualizando config existente, id:', config.id);
        const { error, data } = await (supabase as any)
          .from('funis_configuracoes')
          .update(payload)
          .eq('id', config.id)
          .select();
        console.log('[FunilConfigDialog] Resultado update:', { error, data });
        if (error) throw error;
      } else {
        console.log('[FunilConfigDialog] Inserindo nova config');
        const { error, data } = await (supabase as any)
          .from('funis_configuracoes')
          .insert(payload)
          .select();
        console.log('[FunilConfigDialog] Resultado insert:', { error, data });
        if (error) throw error;
      }

      // Atualizar também o nome do funil na tabela funis se o título da página mudou
      if (config.titulo_pagina && config.titulo_pagina !== funilNome) {
        console.log('[FunilConfigDialog] Atualizando nome do funil:', config.titulo_pagina);
        const { error: funilError } = await (supabase as any)
          .from('funis')
          .update({ nome: config.titulo_pagina })
          .eq('id', funilId);
        
        if (funilError) {
          console.error('Erro ao atualizar nome do funil:', funilError);
        } else {
          // Disparar evento para atualizar a sidebar
          window.dispatchEvent(new CustomEvent('setores-updated'));
        }
      }

      toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso!' });
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar as configurações.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item) ? array.filter(i => i !== item) : [...array, item];
  };

  const updateFormularioCampo = (index: number, field: string, value: any) => {
    const campos = config.formulario_campos || [];
    const newCampos = [...campos];
    if (newCampos[index]) {
      newCampos[index] = { ...newCampos[index], [field]: value };
      setConfig(prev => ({ ...prev, formulario_campos: newCampos }));
    }
  };

  const handleFormularioDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && config.formulario_campos) {
      const campos = config.formulario_campos || [];
      const oldIndex = campos.findIndex((c: any) => c.campo === active.id);
      const newIndex = campos.findIndex((c: any) => c.campo === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newCampos = arrayMove(campos, oldIndex, newIndex);
        setConfig(prev => ({ ...prev, formulario_campos: newCampos }));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Funil: {funilNome}
          </DialogTitle>
          <DialogDescription>
            Personalize a exibição e funcionalidades deste funil
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="geral" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="funil" className="text-xs">
                <Kanban className="h-3 w-3 mr-1" />
                Funil
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="text-xs">
                <LayoutDashboard className="h-3 w-3 mr-1" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="card" className="text-xs">
                <CreditCard className="h-3 w-3 mr-1" />
                Card
              </TabsTrigger>
              <TabsTrigger value="formulario" className="text-xs">
                <ListTodo className="h-3 w-3 mr-1" />
                Formulário
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4 pr-4">
              <TabsContent value="geral" className="space-y-4 m-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título da Página</Label>
                    <Input
                      value={config.titulo_pagina}
                      onChange={(e) => setConfig(prev => ({ ...prev, titulo_pagina: e.target.value }))}
                      placeholder="Título exibido na página"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição da Página</Label>
                    <Textarea
                      value={config.descricao_pagina}
                      onChange={(e) => setConfig(prev => ({ ...prev, descricao_pagina: e.target.value }))}
                      placeholder="Descrição exibida abaixo do título"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Modo de Visualização Padrão</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={config.modo_visualizacao === 'kanban' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setConfig(prev => ({ ...prev, modo_visualizacao: 'kanban' }))}
                      >
                        <LayoutGrid className="h-4 w-4 mr-2" />
                        Kanban
                      </Button>
                      <Button
                        variant={config.modo_visualizacao === 'lista' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setConfig(prev => ({ ...prev, modo_visualizacao: 'lista' }))}
                      >
                        <List className="h-4 w-4 mr-2" />
                        Lista
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm">Botão de Adicionar Card</h4>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Exibir botão</Label>
                      <Switch
                        checked={config.botao_adicionar_visivel}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, botao_adicionar_visivel: checked }))}
                      />
                    </div>
                    {config.botao_adicionar_visivel && (
                      <div className="space-y-2">
                        <Label className="text-sm">Texto do botão</Label>
                        <Input
                          value={config.botao_adicionar_texto}
                          onChange={(e) => setConfig(prev => ({ ...prev, botao_adicionar_texto: e.target.value }))}
                          placeholder="+ Novo Card"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="funil" className="space-y-4 m-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Etapas do Funil</Label>
                      <p className="text-xs text-muted-foreground">
                        Crie, edite e reorganize as etapas do Kanban
                      </p>
                    </div>
                    {!showNovaEtapaForm && !editingEtapa && (
                      <Button
                        size="sm"
                        onClick={() => setShowNovaEtapaForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Etapa
                      </Button>
                    )}
                  </div>

                  {/* Formulário de criar/editar etapa */}
                  {(showNovaEtapaForm || editingEtapa) && (
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <h4 className="font-medium text-sm">
                        {editingEtapa ? 'Editar Etapa' : 'Nova Etapa'}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={novaEtapaForm.nome}
                            onChange={(e) => setNovaEtapaForm({ ...novaEtapaForm, nome: e.target.value })}
                            placeholder="Ex: Em Andamento"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Cor</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={novaEtapaForm.cor}
                              onChange={(e) => setNovaEtapaForm({ ...novaEtapaForm, cor: e.target.value })}
                              className="w-10 h-10 rounded cursor-pointer border"
                            />
                            <Input
                              value={novaEtapaForm.cor}
                              onChange={(e) => setNovaEtapaForm({ ...novaEtapaForm, cor: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border rounded-lg p-3 bg-background">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Label className="text-xs font-medium">Trancar Etapa</Label>
                            <p className="text-[10px] text-muted-foreground">Cards não poderão sair desta etapa após entrar</p>
                          </div>
                        </div>
                        <Switch
                          checked={novaEtapaForm.trancada}
                          onCheckedChange={(checked) => setNovaEtapaForm({ ...novaEtapaForm, trancada: checked })}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEtapaForm}
                          disabled={savingEtapa}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={editingEtapa ? handleSaveEditEtapa : handleCreateEtapa}
                          disabled={savingEtapa || !novaEtapaForm.nome.trim()}
                        >
                          {savingEtapa ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          {editingEtapa ? 'Salvar' : 'Criar'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {loadingEtapas ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : etapas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm bg-muted/30 rounded-lg">
                      <p>Este funil ainda não possui etapas.</p>
                      <p className="text-xs mt-1">Clique em "Nova Etapa" para começar.</p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleEtapaDragEnd}
                    >
                      <SortableContext
                        items={etapas.map(e => e.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {etapas.map((etapa, index) => (
                            <SortableEtapaConfigItem
                              key={etapa.id}
                              etapa={etapa}
                              index={index}
                              onEdit={handleEditEtapa}
                              onDelete={handleDeleteEtapa}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="dashboard" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <Label>Exibir Dashboard</Label>
                  <Switch
                    checked={config.dashboard_visivel}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, dashboard_visivel: checked }))}
                  />
                </div>

                {config.dashboard_visivel && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Métricas a Exibir</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {METRICAS_DASHBOARD.map((metrica) => (
                          <div key={metrica.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`metrica-${metrica.id}`}
                              checked={config.dashboard_metricas.includes(metrica.id)}
                              onCheckedChange={() => setConfig(prev => ({
                                ...prev,
                                dashboard_metricas: toggleArrayItem(prev.dashboard_metricas, metrica.id)
                              }))}
                            />
                            <Label htmlFor={`metrica-${metrica.id}`} className="text-sm font-normal">
                              {metrica.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="card" className="space-y-4 m-0">
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Campos Visíveis na Frente do Card</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Valor</Label>
                      <Switch
                        checked={config.card_mostrar_valor}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, card_mostrar_valor: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Cliente</Label>
                      <Switch
                        checked={config.card_mostrar_cliente}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, card_mostrar_cliente: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Data</Label>
                      <Switch
                        checked={config.card_mostrar_data}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, card_mostrar_data: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Responsável</Label>
                      <Switch
                        checked={config.card_mostrar_responsavel}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, card_mostrar_responsavel: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Etiquetas</Label>
                      <Switch
                        checked={config.card_mostrar_etiquetas}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, card_mostrar_etiquetas: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Status do Negócio</Label>
                      <Switch
                        checked={config.card_mostrar_status}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, card_mostrar_status: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Status de Atividade</Label>
                      <Switch
                        checked={config.card_mostrar_status_atividade}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, card_mostrar_status_atividade: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Ordenação dos Cards nas Colunas</h4>
                  <p className="text-xs text-muted-foreground">Define como os cards serão ordenados em todas as etapas do funil</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'ordem_chegada', label: 'Ordem de Chegada', desc: 'Cards mais recentes primeiro' },
                      { id: 'atividade_proxima', label: 'Atividade Mais Próxima', desc: 'Cards com atividades mais urgentes primeiro' },
                      { id: 'data_previsao', label: 'Data de Previsão', desc: 'Cards com data mais próxima primeiro' },
                      { id: 'valor', label: 'Valor', desc: 'Cards com maior valor primeiro' },
                      { id: 'prioridade', label: 'Prioridade', desc: 'Cards com maior prioridade primeiro' },
                    ].map((opcao) => (
                      <div 
                        key={opcao.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                          config.cards_ordenacao === opcao.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setConfig(prev => ({ ...prev, cards_ordenacao: opcao.id as any }))}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          config.cards_ordenacao === opcao.id ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {config.cards_ordenacao === opcao.id && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{opcao.label}</p>
                          <p className="text-xs text-muted-foreground">{opcao.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Tipos de Atividades no Card</h4>
                  <div className="flex flex-wrap gap-2">
                    {TIPOS_ATIVIDADE.map((tipo) => (
                      <Badge
                        key={tipo.id}
                        variant={config.card_interno_atividades_tipos.includes(tipo.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          card_interno_atividades_tipos: toggleArrayItem(prev.card_interno_atividades_tipos, tipo.id)
                        }))}
                      >
                        {config.card_interno_atividades_tipos.includes(tipo.id) ? (
                          <Eye className="h-3 w-3 mr-1" />
                        ) : (
                          <EyeOff className="h-3 w-3 mr-1" />
                        )}
                        {tipo.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Ações Rápidas no Card</h4>
                  <div className="flex flex-wrap gap-2">
                    {ACOES_RAPIDAS
                      .filter((acao: any) => !acao.apenasNegocio || funilTipo === 'negocio')
                      .map((acao) => (
                      <Badge
                        key={acao.id}
                        variant={config.card_interno_acoes_rapidas.includes(acao.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          card_interno_acoes_rapidas: toggleArrayItem(prev.card_interno_acoes_rapidas, acao.id)
                        }))}
                      >
                        {config.card_interno_acoes_rapidas.includes(acao.id) ? (
                          <Eye className="h-3 w-3 mr-1" />
                        ) : (
                          <EyeOff className="h-3 w-3 mr-1" />
                        )}
                        {acao.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Seções Internas do Card</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Histórico de Atividades</Label>
                      <Switch
                        checked={config.card_interno_mostrar_historico}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, card_interno_mostrar_historico: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Histórico de Movimentações</Label>
                      <Switch
                        checked={config.card_interno_mostrar_movimentacoes}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, card_interno_mostrar_movimentacoes: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="formulario" className="space-y-4 m-0">
                <div className="space-y-2">
                  <Label>Campos do Formulário de Novo Card</Label>
                  <p className="text-xs text-muted-foreground">Arraste para reordenar os campos. Configure visibilidade e obrigatoriedade.</p>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleFormularioDragEnd}
                >
                  <SortableContext
                    items={(config.formulario_campos || []).map((c: any) => c.campo)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {(config.formulario_campos || []).map((campo, index) => (
                        <SortableFormularioCampo
                          key={campo.campo}
                          campo={campo}
                          index={index}
                          updateFormularioCampo={updateFormularioCampo}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
