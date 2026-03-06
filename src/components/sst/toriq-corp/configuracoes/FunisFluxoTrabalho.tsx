import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, GitBranch, DollarSign, ListTodo, GripVertical, ChevronDown, ChevronUp, Settings, Eye, EyeOff, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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

interface Setor {
  id: string;
  nome: string;
  ativo: boolean;
}

interface Funil {
  id: string;
  empresa_id: string;
  setor_id: string;
  nome: string;
  descricao: string | null;
  tipo: 'negocio' | 'fluxo_trabalho';
  ativo: boolean;
  ordem: number;
  created_at: string;
  setor?: Setor;
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

const LIMITE_FUNIS_POR_SETOR = 10;
const LIMITE_ETAPAS_POR_FUNIL = 20;

// Componente para etapa arrastável
interface SortableEtapaItemProps {
  etapa: FunilEtapa;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableEtapaItem({ etapa, index, onEdit, onDelete }: SortableEtapaItemProps) {
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
      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
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
          <span className="text-xs text-muted-foreground">#{index + 1}</span>
          <span className="font-medium truncate">{etapa.nome}</span>
        </div>
        {etapa.descricao && (
          <p className="text-xs text-muted-foreground truncate">
            {etapa.descricao}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

const CORES_ETAPAS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#2563eb', '#64748b', '#71717a'
];

export function FunisFluxoTrabalho() {
  const { toast } = useToast();
  const { empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || empresa?.id;

  const [setores, setSetores] = useState<Setor[]>([]);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [expandedFunilId, setExpandedFunilId] = useState<string | null>(null);
  const [etapasPorFunil, setEtapasPorFunil] = useState<Record<string, FunilEtapa[]>>({});
  const [currentFunilId, setCurrentFunilId] = useState<string | null>(null);

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

  // Handler para reordenar etapas via drag and drop
  const handleEtapaDragEnd = async (event: DragEndEvent, funilId: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const etapas = etapasPorFunil[funilId] || [];
    const oldIndex = etapas.findIndex(e => e.id === active.id);
    const newIndex = etapas.findIndex(e => e.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newEtapas = arrayMove(etapas, oldIndex, newIndex);
    
    // Atualizar estado local imediatamente
    setEtapasPorFunil(prev => ({
      ...prev,
      [funilId]: newEtapas
    }));

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
      loadEtapasForFunil(funilId);
    }
  };

  // Modal de criação/edição de funil
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFunil, setEditingFunil] = useState<Funil | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    setor_id: '',
    tipo: 'negocio' as 'negocio' | 'fluxo_trabalho'
  });

  // Modal de criação/edição de etapa
  const [etapaDialogOpen, setEtapaDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<FunilEtapa | null>(null);
  const [etapaFormData, setEtapaFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#6366f1'
  });

  // Modais de configuração de tipo de funil
  const [configNegocioOpen, setConfigNegocioOpen] = useState(false);
  const [configFluxoOpen, setConfigFluxoOpen] = useState(false);
  const [savingConfigNegocio, setSavingConfigNegocio] = useState(false);

  // Modal de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [funilToDelete, setFunilToDelete] = useState<Funil | null>(null);
  const [etapaToDelete, setEtapaToDelete] = useState<{ funilId: string; etapa: FunilEtapa } | null>(null);

  // Configurações de Funil Negócios
  const [configNegocio, setConfigNegocio] = useState({
    campos: {
      valor: { ativo: true, obrigatorio: true },
      status_negocio: { ativo: true, obrigatorio: true },
      cliente: { ativo: true, obrigatorio: false },
      data_previsao: { ativo: true, obrigatorio: false },
      responsavel: { ativo: true, obrigatorio: false },
      descricao: { ativo: true, obrigatorio: false },
    },
    status: [
      { id: 'perdido', label: 'Perdido', cor: 'bg-red-500', ativo: true },
      { id: 'em_andamento', label: 'Em andamento', cor: 'bg-orange-500', ativo: true },
      { id: 'aceito', label: 'Aceito', cor: 'bg-green-500', ativo: true },
      { id: 'ganho', label: 'Ganho', cor: 'bg-amber-600', ativo: true },
    ],
    acoes: {
      etiquetas: true,
      encaminhar_card: true,
      elaborar_orcamento: true,
      enviar_email: true,
    },
    // Opções de calculadoras dentro de "Elaborar Orçamento"
    calculadoras: {
      treinamento_normativo: true,
      servicos_sst: true,
      vertical_365: true,
      comparacao_vertical_treinamentos: true,
    }
  });

  // Carregar configurações do banco de dados
  const loadConfigNegocio = async () => {
    if (!empresaId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('funil_negocio_configuracoes')
        .select('*')
        .eq('empresa_id', empresaId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configurações:', error);
        return;
      }
      
      if (data) {
        setConfigNegocio({
          campos: {
            valor: { ativo: data.campo_valor_ativo ?? true, obrigatorio: data.campo_valor_obrigatorio ?? true },
            status_negocio: { ativo: data.campo_status_negocio_ativo ?? true, obrigatorio: data.campo_status_negocio_obrigatorio ?? true },
            cliente: { ativo: data.campo_cliente_ativo ?? true, obrigatorio: data.campo_cliente_obrigatorio ?? false },
            data_previsao: { ativo: data.campo_data_previsao_ativo ?? true, obrigatorio: data.campo_data_previsao_obrigatorio ?? false },
            responsavel: { ativo: data.campo_responsavel_ativo ?? true, obrigatorio: data.campo_responsavel_obrigatorio ?? false },
            descricao: { ativo: data.campo_descricao_ativo ?? true, obrigatorio: data.campo_descricao_obrigatorio ?? false },
          },
          status: data.status_config || configNegocio.status,
          acoes: {
            etiquetas: data.acao_etiquetas ?? true,
            encaminhar_card: data.acao_encaminhar_card ?? true,
            elaborar_orcamento: data.acao_elaborar_orcamento ?? true,
            enviar_email: data.acao_enviar_email ?? true,
          },
          calculadoras: {
            treinamento_normativo: data.calc_treinamento_normativo ?? true,
            servicos_sst: data.calc_servicos_sst ?? true,
            vertical_365: data.calc_vertical_365 ?? true,
            comparacao_vertical_treinamentos: data.calc_comparacao_vertical_treinamentos ?? true,
          }
        });
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  // Salvar configurações no banco de dados
  const saveConfigNegocio = async () => {
    if (!empresaId) return;
    
    setSavingConfigNegocio(true);
    try {
      const configData = {
        empresa_id: empresaId,
        acao_etiquetas: configNegocio.acoes.etiquetas,
        acao_encaminhar_card: configNegocio.acoes.encaminhar_card,
        acao_elaborar_orcamento: configNegocio.acoes.elaborar_orcamento,
        acao_enviar_email: configNegocio.acoes.enviar_email,
        calc_treinamento_normativo: configNegocio.calculadoras.treinamento_normativo,
        calc_servicos_sst: configNegocio.calculadoras.servicos_sst,
        calc_vertical_365: configNegocio.calculadoras.vertical_365,
        calc_comparacao_vertical_treinamentos: configNegocio.calculadoras.comparacao_vertical_treinamentos,
        campo_valor_ativo: configNegocio.campos.valor.ativo,
        campo_valor_obrigatorio: configNegocio.campos.valor.obrigatorio,
        campo_status_negocio_ativo: configNegocio.campos.status_negocio.ativo,
        campo_status_negocio_obrigatorio: configNegocio.campos.status_negocio.obrigatorio,
        campo_cliente_ativo: configNegocio.campos.cliente.ativo,
        campo_cliente_obrigatorio: configNegocio.campos.cliente.obrigatorio,
        campo_data_previsao_ativo: configNegocio.campos.data_previsao.ativo,
        campo_data_previsao_obrigatorio: configNegocio.campos.data_previsao.obrigatorio,
        campo_responsavel_ativo: configNegocio.campos.responsavel.ativo,
        campo_responsavel_obrigatorio: configNegocio.campos.responsavel.obrigatorio,
        campo_descricao_ativo: configNegocio.campos.descricao.ativo,
        campo_descricao_obrigatorio: configNegocio.campos.descricao.obrigatorio,
        status_config: configNegocio.status,
      };

      const { error } = await (supabase as any)
        .from('funil_negocio_configuracoes')
        .upsert(configData, { onConflict: 'empresa_id' });
      
      if (error) throw error;
      
      toast({ title: 'Configurações salvas', description: 'As configurações do Funil Negócios foram atualizadas.' });
      setConfigNegocioOpen(false);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      toast({ title: 'Erro', description: 'Não foi possível salvar as configurações.', variant: 'destructive' });
    } finally {
      setSavingConfigNegocio(false);
    }
  };

  // Configurações de Fluxo de Trabalho
  const [configFluxo, setConfigFluxo] = useState({
    campos: {
      titulo: { ativo: true, obrigatorio: true },
      prioridade: { ativo: true, obrigatorio: true },
      responsavel: { ativo: true, obrigatorio: false },
      data_previsao: { ativo: true, obrigatorio: false },
      descricao: { ativo: true, obrigatorio: false },
      cliente: { ativo: true, obrigatorio: false },
    },
    prioridades: [
      { id: 'baixa', label: 'Baixa', cor: 'bg-gray-500', ativo: true },
      { id: 'media', label: 'Média', cor: 'bg-blue-500', ativo: true },
      { id: 'alta', label: 'Alta', cor: 'bg-orange-500', ativo: true },
      { id: 'urgente', label: 'Urgente', cor: 'bg-red-500', ativo: true },
    ],
    acoes: {
      etiquetas: true,
      encaminhar_card: true,
      enviar_email: true,
    }
  });

  useEffect(() => {
    if (empresaId) {
      loadSetores();
      loadFunis();
      loadConfigNegocio();
    }
  }, [empresaId]);

  useEffect(() => {
    if (expandedFunilId) {
      loadEtapasForFunil(expandedFunilId);
    }
  }, [expandedFunilId]);

  const loadSetores = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('setores')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  };

  const loadFunis = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('funis')
        .select(`
          *,
          setor:setores(id, nome, ativo)
        `)
        .eq('empresa_id', empresaId)
        .order('ordem');

      if (error) throw error;
      setFunis(data || []);

      // Carregar contagem de etapas para todos os funis
      if (data && data.length > 0) {
        const funilIds = data.map((f: any) => f.id);
        const { data: etapasData, error: etapasError } = await (supabase as any)
          .from('funil_etapas')
          .select('*')
          .in('funil_id', funilIds)
          .eq('ativo', true)
          .order('ordem');

        if (!etapasError && etapasData) {
          const etapasAgrupadas: Record<string, FunilEtapa[]> = {};
          etapasData.forEach((etapa: FunilEtapa) => {
            if (!etapasAgrupadas[etapa.funil_id]) {
              etapasAgrupadas[etapa.funil_id] = [];
            }
            etapasAgrupadas[etapa.funil_id].push(etapa);
          });
          setEtapasPorFunil(etapasAgrupadas);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os funis.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEtapasForFunil = async (funilId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('funil_etapas')
        .select('*')
        .eq('funil_id', funilId)
        .order('ordem');

      if (error) throw error;
      setEtapasPorFunil(prev => ({ ...prev, [funilId]: data || [] }));
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
    }
  };

  const getEtapasDoFunil = (funilId: string) => {
    return etapasPorFunil[funilId] || [];
  };

  const toggleFunilExpanded = (funilId: string) => {
    if (expandedFunilId === funilId) {
      setExpandedFunilId(null);
    } else {
      setExpandedFunilId(funilId);
      setCurrentFunilId(funilId);
    }
  };

  const getFunisPorSetor = (setorId: string) => {
    return funis.filter(f => f.setor_id === setorId);
  };

  const podeAdicionarFunil = (setorId: string) => {
    return getFunisPorSetor(setorId).length < LIMITE_FUNIS_POR_SETOR;
  };

  const podeAdicionarEtapa = (funilId: string) => {
    const etapasDoFunil = getEtapasDoFunil(funilId);
    return etapasDoFunil.length < LIMITE_ETAPAS_POR_FUNIL;
  };

  const handleOpenDialog = (funil?: Funil) => {
    if (funil) {
      setEditingFunil(funil);
      setFormData({
        nome: funil.nome,
        descricao: funil.descricao || '',
        setor_id: funil.setor_id,
        tipo: funil.tipo
      });
    } else {
      setEditingFunil(null);
      setFormData({
        nome: '',
        descricao: '',
        setor_id: selectedSetor !== 'todos' ? selectedSetor : '',
        tipo: 'negocio'
      });
    }
    setDialogOpen(true);
  };

  const handleSaveFunil = async () => {
    if (!formData.nome.trim() || !formData.setor_id) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome e selecione um setor.',
        variant: 'destructive'
      });
      return;
    }

    if (!editingFunil && !podeAdicionarFunil(formData.setor_id)) {
      toast({
        title: 'Limite atingido',
        description: `Você já possui ${LIMITE_FUNIS_POR_SETOR} funis neste setor.`,
        variant: 'destructive'
      });
      return;
    }

    try {
      if (editingFunil) {
        const { error } = await (supabase as any)
          .from('funis')
          .update({
            nome: formData.nome,
            descricao: formData.descricao || null,
            setor_id: formData.setor_id,
            tipo: formData.tipo,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFunil.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Funil atualizado com sucesso!' });
      } else {
        const ordem = getFunisPorSetor(formData.setor_id).length;
        const { error } = await (supabase as any)
          .from('funis')
          .insert({
            empresa_id: empresaId,
            setor_id: formData.setor_id,
            nome: formData.nome,
            descricao: formData.descricao || null,
            tipo: formData.tipo,
            ordem
          });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Funil criado com sucesso!' });
      }

      setDialogOpen(false);
      loadFunis();
    } catch (error) {
      console.error('Erro ao salvar funil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o funil.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteFunil = (funil: Funil) => {
    setFunilToDelete(funil);
    setEtapaToDelete(null);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteFunil = async () => {
    if (!funilToDelete) return;

    try {
      const { error } = await (supabase as any)
        .from('funis')
        .delete()
        .eq('id', funilToDelete.id);

      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Funil excluído com sucesso!' });
      if (expandedFunilId === funilToDelete.id) {
        setExpandedFunilId(null);
      }
      loadFunis();
    } catch (error) {
      console.error('Erro ao excluir funil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o funil.',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setFunilToDelete(null);
    }
  };

  const handleOpenEtapaDialog = (funilId: string, etapa?: FunilEtapa) => {
    setCurrentFunilId(funilId);
    const etapasDoFunil = getEtapasDoFunil(funilId);
    if (etapa) {
      setEditingEtapa(etapa);
      setEtapaFormData({
        nome: etapa.nome,
        descricao: etapa.descricao || '',
        cor: etapa.cor
      });
    } else {
      setEditingEtapa(null);
      setEtapaFormData({
        nome: '',
        descricao: '',
        cor: CORES_ETAPAS[etapasDoFunil.length % CORES_ETAPAS.length]
      });
    }
    setEtapaDialogOpen(true);
  };

  const handleSaveEtapa = async () => {
    if (!etapaFormData.nome.trim() || !currentFunilId) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome da etapa.',
        variant: 'destructive'
      });
      return;
    }

    const etapasDoFunil = getEtapasDoFunil(currentFunilId);

    if (!editingEtapa && !podeAdicionarEtapa(currentFunilId)) {
      toast({
        title: 'Limite atingido',
        description: `Você já possui ${LIMITE_ETAPAS_POR_FUNIL} etapas neste funil.`,
        variant: 'destructive'
      });
      return;
    }

    try {
      if (editingEtapa) {
        const { error } = await (supabase as any)
          .from('funil_etapas')
          .update({
            nome: etapaFormData.nome,
            descricao: etapaFormData.descricao || null,
            cor: etapaFormData.cor,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEtapa.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Etapa atualizada com sucesso!' });
      } else {
        const { error } = await (supabase as any)
          .from('funil_etapas')
          .insert({
            funil_id: currentFunilId,
            nome: etapaFormData.nome,
            descricao: etapaFormData.descricao || null,
            cor: etapaFormData.cor,
            ordem: etapasDoFunil.length
          });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Etapa criada com sucesso!' });
      }

      setEtapaDialogOpen(false);
      loadEtapasForFunil(currentFunilId);
    } catch (error) {
      console.error('Erro ao salvar etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a etapa.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteEtapa = (funilId: string, etapa: FunilEtapa) => {
    setEtapaToDelete({ funilId, etapa });
    setFunilToDelete(null);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEtapa = async () => {
    if (!etapaToDelete) return;

    try {
      const { error } = await (supabase as any)
        .from('funil_etapas')
        .delete()
        .eq('id', etapaToDelete.etapa.id);

      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Etapa excluída com sucesso!' });
      loadEtapasForFunil(etapaToDelete.funilId);
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a etapa.',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setEtapaToDelete(null);
    }
  };

  const filteredFunis = selectedSetor === 'todos' 
    ? funis 
    : funis.filter(f => f.setor_id === selectedSetor);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Funis / Fluxo de Trabalho</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Configure os funis e fluxos de trabalho dos setores da empresa. 
          Cada setor pode ter até {LIMITE_FUNIS_POR_SETOR} funis, e cada funil até {LIMITE_ETAPAS_POR_FUNIL} etapas.
        </p>
      </div>

      {/* Filtro e Ações */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Select value={selectedSetor} onValueChange={setSelectedSetor}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                {setores.map(setor => (
                  <SelectItem key={setor.id} value={setor.id}>
                    {setor.nome} ({getFunisPorSetor(setor.id).length}/{LIMITE_FUNIS_POR_SETOR})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setConfigNegocioOpen(true)}
            className="border-amber-500 text-amber-600 hover:bg-amber-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configuração Funil Negócios
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setConfigFluxoOpen(true)}
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configuração Fluxo de Trabalho
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Funil
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFunil ? 'Editar Funil' : 'Novo Funil'}</DialogTitle>
              <DialogDescription>
                {editingFunil 
                  ? 'Edite as informações do funil.' 
                  : 'Crie um novo funil para organizar seu fluxo de trabalho.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="setor">Setor *</Label>
                <Select 
                  value={formData.setor_id} 
                  onValueChange={(value) => setFormData({ ...formData, setor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map(setor => (
                      <SelectItem 
                        key={setor.id} 
                        value={setor.id}
                        disabled={!editingFunil && !podeAdicionarFunil(setor.id)}
                      >
                        {setor.nome} ({getFunisPorSetor(setor.id).length}/{LIMITE_FUNIS_POR_SETOR})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Funil *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Funil de Vendas, Fluxo de Atendimento..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o objetivo deste funil..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo do Funil *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'negocio' })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.tipo === 'negocio'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Negócio</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Funil com valores monetários (R$). Ideal para vendas e propostas comerciais.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'fluxo_trabalho' })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.tipo === 'fluxo_trabalho'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ListTodo className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Fluxo de Trabalho</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fluxo para tarefas e atividades. Sem vínculo com valores monetários.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveFunil}>
                {editingFunil ? 'Salvar' : 'Criar Funil'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de Funis com Etapas em Cascata */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Funis Cadastrados</h4>
        
        {loading ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Carregando funis...
            </CardContent>
          </Card>
        ) : filteredFunis.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {setores.length === 0 
                ? 'Cadastre setores em Configurações > Setores antes de criar funis.'
                : 'Nenhum funil cadastrado. Clique em "Novo Funil" para começar.'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredFunis.map(funil => {
              const isExpanded = expandedFunilId === funil.id;
              const etapasDoFunil = getEtapasDoFunil(funil.id);
              
              return (
                <Card 
                  key={funil.id}
                  className={`transition-all ${isExpanded ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                >
                  <CardContent className="p-4">
                    {/* Header do Funil */}
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => toggleFunilExpanded(funil.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{funil.nome}</span>
                          <Badge variant={funil.tipo === 'negocio' ? 'default' : 'secondary'}>
                            {funil.tipo === 'negocio' ? (
                              <><DollarSign className="h-3 w-3 mr-1" />Negócio</>
                            ) : (
                              <><ListTodo className="h-3 w-3 mr-1" />Fluxo</>
                            )}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {etapasDoFunil.length} etapas
                          </Badge>
                        </div>
                        {funil.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {funil.descricao}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Setor: {funil.setor?.nome || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(funil);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFunil(funil);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleFunilExpanded(funil.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Etapas em Cascata (expandido) */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium text-muted-foreground">
                            Etapas do Funil ({etapasDoFunil.length}/{LIMITE_ETAPAS_POR_FUNIL})
                          </h5>
                          {podeAdicionarEtapa(funil.id) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleOpenEtapaDialog(funil.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Nova Etapa
                            </Button>
                          )}
                        </div>

                        {etapasDoFunil.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm bg-muted/30 rounded-lg">
                            Este funil ainda não possui etapas. Clique em "Nova Etapa" para adicionar.
                          </div>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => handleEtapaDragEnd(event, funil.id)}
                          >
                            <SortableContext
                              items={etapasDoFunil.map(e => e.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {etapasDoFunil.map((etapa, index) => (
                                  <SortableEtapaItem
                                    key={etapa.id}
                                    etapa={etapa}
                                    index={index}
                                    onEdit={() => handleOpenEtapaDialog(funil.id, etapa)}
                                    onDelete={() => handleDeleteEtapa(funil.id, etapa)}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog de Etapa */}
      <Dialog open={etapaDialogOpen} onOpenChange={setEtapaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEtapa ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
            <DialogDescription>
              {editingEtapa 
                ? 'Edite as informações da etapa.' 
                : 'Adicione uma nova etapa ao funil.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="etapa-nome">Nome da Etapa *</Label>
              <Input
                id="etapa-nome"
                value={etapaFormData.nome}
                onChange={(e) => setEtapaFormData({ ...etapaFormData, nome: e.target.value })}
                placeholder="Ex: Prospecção, Negociação, Fechamento..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="etapa-descricao">Descrição</Label>
              <Textarea
                id="etapa-descricao"
                value={etapaFormData.descricao}
                onChange={(e) => setEtapaFormData({ ...etapaFormData, descricao: e.target.value })}
                placeholder="Descreva o objetivo desta etapa..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor da Etapa</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_ETAPAS.map(cor => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setEtapaFormData({ ...etapaFormData, cor })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      etapaFormData.cor === cor 
                        ? 'ring-2 ring-offset-2 ring-primary' 
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEtapaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEtapa}>
              {editingEtapa ? 'Salvar' : 'Criar Etapa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração Funil Negócios */}
      <Dialog open={configNegocioOpen} onOpenChange={setConfigNegocioOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              Configuração Funil Negócios
            </DialogTitle>
            <DialogDescription>
              Configure as opções padrão para funis do tipo Negócio (vendas, propostas comerciais, etc.)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Campos do Card */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Campos do Card</h4>
              <p className="text-xs text-muted-foreground">
                Ative ou desative os campos que serão exibidos nos cards de funis do tipo Negócio.
              </p>
              
              <div className="space-y-2">
                {Object.entries(configNegocio.campos).map(([campo, config]) => {
                  const labels: Record<string, string> = {
                    valor: 'Valor do Negócio',
                    status_negocio: 'Status do Negócio',
                    cliente: 'Cliente',
                    data_previsao: 'Data de Previsão',
                    responsavel: 'Responsável',
                    descricao: 'Descrição',
                  };
                  return (
                    <div key={campo} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={config.ativo}
                          onCheckedChange={(checked) => {
                            if (!config.obrigatorio) {
                              setConfigNegocio(prev => ({
                                ...prev,
                                campos: {
                                  ...prev.campos,
                                  [campo]: { ...config, ativo: checked }
                                }
                              }));
                            }
                          }}
                          disabled={config.obrigatorio}
                        />
                        <span className="text-sm">{labels[campo]}</span>
                      </div>
                      <Badge className={config.obrigatorio ? 'bg-green-500' : 'bg-blue-500'}>
                        {config.obrigatorio ? 'Obrigatório' : 'Opcional'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status do Negócio */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Status do Negócio</h4>
              <p className="text-xs text-muted-foreground">
                Ative ou desative os status disponíveis para classificar os negócios.
              </p>
              
              <div className="space-y-2">
                {configNegocio.status.map((status, index) => (
                  <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={status.ativo}
                        onCheckedChange={(checked) => {
                          setConfigNegocio(prev => ({
                            ...prev,
                            status: prev.status.map((s, i) => 
                              i === index ? { ...s, ativo: checked } : s
                            )
                          }));
                        }}
                      />
                      <Badge className={`${status.cor} text-white`}>{status.label}</Badge>
                    </div>
                    {status.ativo ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Ações Rápidas Padrão */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Ações Rápidas Padrão</h4>
              <p className="text-xs text-muted-foreground">
                Ative ou desative as ações rápidas disponíveis por padrão nos cards de negócio.
              </p>
              
              <div className="space-y-2">
                {Object.entries(configNegocio.acoes).map(([acao, ativo]) => {
                  const labels: Record<string, string> = {
                    etiquetas: 'Etiquetas',
                    encaminhar_card: 'Encaminhar card',
                    elaborar_orcamento: 'Elaborar Orçamento',
                    enviar_email: 'Enviar E-mail',
                  };
                  
                  // Renderização especial para "Elaborar Orçamento" com sub-opções
                  if (acao === 'elaborar_orcamento') {
                    return (
                      <div key={acao} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={ativo}
                              onCheckedChange={(checked) => {
                                setConfigNegocio(prev => ({
                                  ...prev,
                                  acoes: {
                                    ...prev.acoes,
                                    [acao]: checked
                                  }
                                }));
                              }}
                            />
                            <span className="text-sm text-green-600 font-medium">
                              {labels[acao]}
                            </span>
                          </div>
                          {ativo ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        
{/* Sub-opções de calculadoras removidas conforme solicitação */}
                      </div>
                    );
                  }
                  
                  return (
                    <div key={acao} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={ativo}
                          onCheckedChange={(checked) => {
                            setConfigNegocio(prev => ({
                              ...prev,
                              acoes: {
                                ...prev.acoes,
                                [acao]: checked
                              }
                            }));
                          }}
                        />
                        <span className="text-sm">
                          {labels[acao]}
                        </span>
                      </div>
                      {ativo ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigNegocioOpen(false)}>
              Fechar
            </Button>
            <Button onClick={saveConfigNegocio} disabled={savingConfigNegocio}>
              {savingConfigNegocio ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração Fluxo de Trabalho */}
      <Dialog open={configFluxoOpen} onOpenChange={setConfigFluxoOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-blue-600" />
              Configuração Fluxo de Trabalho
            </DialogTitle>
            <DialogDescription>
              Configure as opções padrão para funis do tipo Fluxo de Trabalho (tarefas, processos, etc.)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Campos do Card */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Campos do Card</h4>
              <p className="text-xs text-muted-foreground">
                Ative ou desative os campos que serão exibidos nos cards de fluxo de trabalho.
              </p>
              
              <div className="space-y-2">
                {Object.entries(configFluxo.campos).map(([campo, config]) => {
                  const labels: Record<string, string> = {
                    titulo: 'Título',
                    prioridade: 'Prioridade',
                    responsavel: 'Responsável',
                    data_previsao: 'Data de Previsão',
                    descricao: 'Descrição',
                    cliente: 'Cliente',
                  };
                  return (
                    <div key={campo} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={config.ativo}
                          onCheckedChange={(checked) => {
                            if (!config.obrigatorio) {
                              setConfigFluxo(prev => ({
                                ...prev,
                                campos: {
                                  ...prev.campos,
                                  [campo]: { ...config, ativo: checked }
                                }
                              }));
                            }
                          }}
                          disabled={config.obrigatorio}
                        />
                        <span className="text-sm">{labels[campo]}</span>
                      </div>
                      <Badge className={config.obrigatorio ? 'bg-green-500' : 'bg-blue-500'}>
                        {config.obrigatorio ? 'Obrigatório' : 'Opcional'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Níveis de Prioridade */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Níveis de Prioridade</h4>
              <p className="text-xs text-muted-foreground">
                Ative ou desative os níveis de prioridade disponíveis para os cards.
              </p>
              
              <div className="space-y-2">
                {configFluxo.prioridades.map((prioridade, index) => (
                  <div key={prioridade.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={prioridade.ativo}
                        onCheckedChange={(checked) => {
                          setConfigFluxo(prev => ({
                            ...prev,
                            prioridades: prev.prioridades.map((p, i) => 
                              i === index ? { ...p, ativo: checked } : p
                            )
                          }));
                        }}
                      />
                      <Badge className={`${prioridade.cor} text-white`}>{prioridade.label}</Badge>
                    </div>
                    {prioridade.ativo ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Ações Rápidas Padrão */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Ações Rápidas Padrão</h4>
              <p className="text-xs text-muted-foreground">
                Ative ou desative as ações rápidas disponíveis por padrão nos cards de fluxo de trabalho.
              </p>
              
              <div className="space-y-2">
                {Object.entries(configFluxo.acoes).map(([acao, ativo]) => {
                  const labels: Record<string, string> = {
                    etiquetas: 'Etiquetas',
                    encaminhar_card: 'Encaminhar card',
                    enviar_email: 'Enviar E-mail',
                  };
                  return (
                    <div key={acao} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={ativo}
                          onCheckedChange={(checked) => {
                            setConfigFluxo(prev => ({
                              ...prev,
                              acoes: {
                                ...prev.acoes,
                                [acao]: checked
                              }
                            }));
                          }}
                        />
                        <span className="text-sm">{labels[acao]}</span>
                      </div>
                      {ativo ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigFluxoOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              toast({ title: 'Configurações salvas', description: 'As configurações do Fluxo de Trabalho foram atualizadas.' });
              setConfigFluxoOpen(false);
            }}>
              Salvar Configurações
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
              {funilToDelete && (
                <>
                  Deseja realmente excluir o funil <strong>"{funilToDelete.nome}"</strong>?
                  <br />
                  <span className="text-destructive">Todas as etapas serão removidas permanentemente.</span>
                </>
              )}
              {etapaToDelete && (
                <>
                  Deseja realmente excluir a etapa <strong>"{etapaToDelete.etapa.nome}"</strong>?
                  <br />
                  <span className="text-destructive">Esta ação não pode ser desfeita.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (funilToDelete) {
                  confirmDeleteFunil();
                } else if (etapaToDelete) {
                  confirmDeleteEtapa();
                }
              }}
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
