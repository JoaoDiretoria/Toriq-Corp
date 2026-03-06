import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { 
  Zap, 
  MessageSquare, 
  Calendar, 
  Copy, 
  ArrowRight, 
  MoveRight,
  Clock, 
  User, 
  Building2, 
  Trophy, 
  XCircle, 
  CheckCircle2,
  Lightbulb,
  Trash2,
  Edit2,
  Info,
  Mail,
  Phone,
  Video,
  FileText
} from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker';

interface Funil {
  id: string;
  nome: string;
  tipo: 'negocio' | 'fluxo_trabalho';
  setor?: { nome: string };
}

interface FunilEtapa {
  id: string;
  funil_id: string;
  nome: string;
  cor: string;
  ordem: number;
}

interface Automacao {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  gatilho: string;
  funil_id: string | null;
  etapa_id: string | null;
  dias_parado: number | null;
  acao_config: Record<string, any>;
  ativo: boolean;
  created_at: string;
  funil?: Funil;
  etapa?: FunilEtapa;
}

// Templates de automação pré-configurados
const TEMPLATES_AUTOMACAO = {
  duplicar_card: {
    titulo: 'Duplicar card automaticamente',
    badge: null,
    templates: [
      {
        id: 'duplicar_card_etapa',
        gatilho: 'negocio_chegar_etapa',
        gatilhoLabel: 'Quando um card chegar a uma etapa',
        acao: 'duplicar_card',
        acaoLabel: 'Duplicá-lo para outro funil/etapa',
        iconeGatilho: 'signal',
        iconeAcao: 'copy'
      },
      {
        id: 'duplicar_card_agendado',
        gatilho: 'negocio_chegar_etapa',
        gatilhoLabel: 'Quando um card chegar a uma etapa',
        acao: 'duplicar_card_agendado',
        acaoLabel: 'Duplicar após X dias no horário exato',
        iconeGatilho: 'signal',
        iconeAcao: 'clock'
      }
    ]
  },
  mover_card: {
    titulo: 'Mover card automaticamente',
    badge: null,
    templates: [
      {
        id: 'mover_card_etapa',
        gatilho: 'negocio_chegar_etapa',
        gatilhoLabel: 'Quando um card chegar a uma etapa',
        acao: 'mover_card',
        acaoLabel: 'Transferi-lo para outro funil/etapa',
        iconeGatilho: 'signal',
        iconeAcao: 'move'
      },
      {
        id: 'mover_card_agendado',
        gatilho: 'negocio_chegar_etapa',
        gatilhoLabel: 'Quando um card chegar a uma etapa',
        acao: 'mover_card_agendado',
        acaoLabel: 'Mover após X dias no horário exato',
        iconeGatilho: 'signal',
        iconeAcao: 'clock'
      }
    ]
  },
  agendar_atividade: {
    titulo: 'Agendar atividade automaticamente',
    badge: null,
    templates: [
      {
        id: 'ativ_negocio_etapa',
        gatilho: 'negocio_chegar_etapa',
        gatilhoLabel: 'Quando um card chegar a uma etapa',
        acao: 'agendar_atividade',
        acaoLabel: 'Agendar uma atividade',
        iconeGatilho: 'signal',
        iconeAcao: 'calendar'
      }
    ]
  }
};

const TIPOS_ATIVIDADE = [
  { value: 'ligacao', label: 'Ligação', icon: Phone },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'reuniao', label: 'Reunião', icon: Video },
  { value: 'tarefa', label: 'Tarefa', icon: FileText },
  { value: 'visita', label: 'Visita', icon: Building2 }
];

const QUANDO_OPTIONS = [
  { value: 'mesmo_dia', label: 'Para o mesmo dia' },
  { value: '1_dia', label: 'Para 1 dia depois' },
  { value: '2_dias', label: 'Para 2 dias depois' },
  { value: '3_dias', label: 'Para 3 dias depois' },
  { value: '1_semana', label: 'Para 1 semana depois' },
  { value: 'personalizado', label: 'Personalizado (dias)' }
];

export function Automacoes() {
  const { toast } = useToast();
  const { empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || empresa?.id;

  const [activeTab, setActiveTab] = useState('nova');
  const [funis, setFunis] = useState<Funil[]>([]);
  const [etapas, setEtapas] = useState<FunilEtapa[]>([]);
  const [automacoes, setAutomacoes] = useState<Automacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de criação
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // Modal de detalhes
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAutomacao, setSelectedAutomacao] = useState<Automacao | null>(null);
  const [formData, setFormData] = useState({
    funil_id: '',
    etapa_id: '',
    funil_destino_id: '',
    etapa_destino_id: '',
    tipo_atividade: '',
    quando: 'mesmo_dia',
    dias_personalizado: 5,
    descricao: '',
    dias_parado: 3,
    agendamento_dias: 0,
    agendamento_hora: '08:00:00'
  });
  const [etapasDestino, setEtapasDestino] = useState<FunilEtapa[]>([]);

  useEffect(() => {
    if (empresaId) {
      loadFunis();
      loadAutomacoes();
    }
  }, [empresaId]);

  useEffect(() => {
    if (formData.funil_id) {
      loadEtapas(formData.funil_id);
    } else {
      setEtapas([]);
    }
  }, [formData.funil_id]);

  useEffect(() => {
    if (formData.funil_destino_id) {
      loadEtapasDestino(formData.funil_destino_id);
    } else {
      setEtapasDestino([]);
    }
  }, [formData.funil_destino_id]);

  const loadFunis = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('funis')
        .select('*, setor:setores(nome)')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFunis(data || []);
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
    }
  };

  const loadEtapas = async (funilId: string) => {
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

  const loadEtapasDestino = async (funilId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('funil_etapas')
        .select('*')
        .eq('funil_id', funilId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setEtapasDestino(data || []);
    } catch (error) {
      console.error('Erro ao carregar etapas destino:', error);
    }
  };

  const loadAutomacoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('automacoes')
        .select('*, funil:funis(id, nome, tipo), etapa:funil_etapas(id, nome, cor)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutomacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar automações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setFormData({
      funil_id: '',
      etapa_id: '',
      funil_destino_id: '',
      etapa_destino_id: '',
      tipo_atividade: '',
      quando: 'mesmo_dia',
      dias_personalizado: 5,
      descricao: '',
      dias_parado: 3,
      agendamento_dias: 0,
      agendamento_hora: '08:00:00'
    });
    setEtapasDestino([]);
    setDialogOpen(true);
  };

  const handleSaveAutomacao = async () => {
    if (!selectedTemplate) return;

    // Validações - Funil e Etapa são sempre obrigatórios
    if (!formData.funil_id) {
      toast({
        title: 'Erro',
        description: 'Selecione um funil.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.etapa_id) {
      toast({
        title: 'Erro',
        description: 'Selecione uma etapa.',
        variant: 'destructive'
      });
      return;
    }

    if (selectedTemplate.acao === 'agendar_atividade' && !formData.tipo_atividade) {
      toast({
        title: 'Erro',
        description: 'Selecione o tipo de atividade.',
        variant: 'destructive'
      });
      return;
    }

    if (selectedTemplate.acao === 'criar_negocio') {
      if (!formData.funil_destino_id) {
        toast({
          title: 'Erro',
          description: 'Selecione o funil de destino.',
          variant: 'destructive'
        });
        return;
      }
      if (!formData.etapa_destino_id) {
        toast({
          title: 'Erro',
          description: 'Selecione a etapa de destino.',
          variant: 'destructive'
        });
        return;
      }
    }

    if (selectedTemplate.acao === 'duplicar_card' || selectedTemplate.acao === 'mover_card' || selectedTemplate.acao === 'duplicar_card_agendado' || selectedTemplate.acao === 'mover_card_agendado') {
      if (!formData.funil_destino_id) {
        toast({
          title: 'Erro',
          description: 'Selecione o funil de destino.',
          variant: 'destructive'
        });
        return;
      }
      if (!formData.etapa_destino_id) {
        toast({
          title: 'Erro',
          description: 'Selecione a etapa de destino.',
          variant: 'destructive'
        });
        return;
      }
    }

    // Validação para automações agendadas (por dias)
    if (selectedTemplate.acao === 'duplicar_card_agendado' || selectedTemplate.acao === 'mover_card_agendado') {
      if (formData.agendamento_dias === undefined || formData.agendamento_dias === null || formData.agendamento_dias < 0) {
        toast({
          title: 'Erro',
          description: 'Informe o prazo em dias (mínimo 0).',
          variant: 'destructive'
        });
        return;
      }
      if (!formData.agendamento_hora) {
        toast({
          title: 'Erro',
          description: 'Selecione o horário exato.',
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      const funilSelecionado = funis.find(f => f.id === formData.funil_id);
      const etapaSelecionada = etapas.find(e => e.id === formData.etapa_id);
      const funilDestino = funis.find(f => f.id === formData.funil_destino_id);
      const etapaDestino = etapasDestino.find(e => e.id === formData.etapa_destino_id);

      // Montar nome descritivo
      let nome = '';
      if (selectedTemplate.acao === 'agendar_atividade') {
        const tipoAtiv = TIPOS_ATIVIDADE.find(t => t.value === formData.tipo_atividade);
        const quando = QUANDO_OPTIONS.find(q => q.value === formData.quando);
        const quandoLabel = formData.quando === 'personalizado' 
          ? `para ${formData.dias_personalizado} dias depois` 
          : quando?.label?.toLowerCase();
        nome = `${selectedTemplate.gatilhoLabel} ${etapaSelecionada?.nome || ''} do ${funilSelecionado?.nome} → Agendar ${tipoAtiv?.label} ${quandoLabel}`;
      } else if (selectedTemplate.acao === 'duplicar_card') {
        nome = `Quando card chegar em ${etapaSelecionada?.nome} do ${funilSelecionado?.nome} → Duplicar para ${etapaDestino?.nome} do ${funilDestino?.nome}`;
      } else if (selectedTemplate.acao === 'mover_card') {
        nome = `Quando card chegar em ${etapaSelecionada?.nome} do ${funilSelecionado?.nome} → Mover para ${etapaDestino?.nome} do ${funilDestino?.nome}`;
      } else if (selectedTemplate.acao === 'duplicar_card_agendado') {
        nome = `Card chegar em ${etapaSelecionada?.nome} do ${funilSelecionado?.nome} → Após ${formData.agendamento_dias} dia(s) às ${formData.agendamento_hora}, duplicar para ${etapaDestino?.nome} do ${funilDestino?.nome}`;
      } else if (selectedTemplate.acao === 'mover_card_agendado') {
        nome = `Card chegar em ${etapaSelecionada?.nome} do ${funilSelecionado?.nome} → Após ${formData.agendamento_dias} dia(s) às ${formData.agendamento_hora}, mover para ${etapaDestino?.nome} do ${funilDestino?.nome}`;
      } else if (selectedTemplate.acao === 'criar_negocio') {
        nome = `${selectedTemplate.gatilhoLabel} no ${funilSelecionado?.nome} → Duplicar para ${funilDestino?.nome}`;
      } else {
        nome = `${selectedTemplate.gatilhoLabel} → ${selectedTemplate.acaoLabel}`;
      }

      // Montar configuração da ação
      const acaoConfig: Record<string, any> = {};
      if (selectedTemplate.acao === 'agendar_atividade') {
        acaoConfig.tipo_atividade = formData.tipo_atividade;
        acaoConfig.quando = formData.quando;
        acaoConfig.dias_personalizado = formData.quando === 'personalizado' ? formData.dias_personalizado : null;
        acaoConfig.descricao = formData.descricao;
        acaoConfig.responsavel = 'responsavel_negocio';
      } else if (selectedTemplate.acao === 'duplicar_card' || selectedTemplate.acao === 'mover_card' || selectedTemplate.acao === 'duplicar_card_agendado' || selectedTemplate.acao === 'mover_card_agendado') {
        acaoConfig.funil_destino_id = formData.funil_destino_id;
        acaoConfig.etapa_destino_id = formData.etapa_destino_id;
      } else if (selectedTemplate.acao === 'criar_negocio') {
        acaoConfig.funil_destino_id = formData.funil_destino_id;
        acaoConfig.etapa_destino_id = formData.etapa_destino_id;
      }

      // Salvar dias e hora na acao_config para automações agendadas
      if (selectedTemplate.acao === 'duplicar_card_agendado' || selectedTemplate.acao === 'mover_card_agendado') {
        acaoConfig.agendamento_dias = formData.agendamento_dias;
        acaoConfig.agendamento_hora = formData.agendamento_hora;
      }

      const { error } = await (supabase as any)
        .from('automacoes')
        .insert({
          empresa_id: empresaId,
          nome,
          tipo: selectedTemplate.acao,
          gatilho: selectedTemplate.gatilho,
          funil_id: formData.funil_id,
          etapa_id: formData.etapa_id,
          dias_parado: selectedTemplate.gatilho === 'negocio_parado_etapa' ? formData.dias_parado : null,
          acao_config: acaoConfig,
          ativo: true
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Automação criada com sucesso!' });
      setDialogOpen(false);
      setSelectedTemplate(null);
      loadAutomacoes();
      setActiveTab('criadas');
    } catch (error) {
      console.error('Erro ao salvar automação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a automação.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleAtivo = async (automacao: Automacao) => {
    try {
      const { error } = await (supabase as any)
        .from('automacoes')
        .update({ ativo: !automacao.ativo })
        .eq('id', automacao.id);

      if (error) throw error;

      toast({ 
        title: 'Sucesso', 
        description: `Automação ${!automacao.ativo ? 'ativada' : 'desativada'} com sucesso!` 
      });
      loadAutomacoes();
    } catch (error) {
      console.error('Erro ao atualizar automação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a automação.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAutomacao = async (automacao: Automacao) => {
    if (!confirm('Deseja realmente excluir esta automação?')) return;

    try {
      const { error } = await (supabase as any)
        .from('automacoes')
        .delete()
        .eq('id', automacao.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Automação excluída com sucesso!' });
      loadAutomacoes();
    } catch (error) {
      console.error('Erro ao excluir automação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a automação.',
        variant: 'destructive'
      });
    }
  };

  const getIconeGatilho = (icone: string) => {
    switch (icone) {
      case 'signal': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><Zap className="h-3 w-3 text-primary" /></div>;
      case 'trophy': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><Trophy className="h-3 w-3 text-primary" /></div>;
      case 'x-circle': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><XCircle className="h-3 w-3 text-primary" /></div>;
      case 'user': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><User className="h-3 w-3 text-primary" /></div>;
      case 'building': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><Building2 className="h-3 w-3 text-primary" /></div>;
      case 'clock': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><Clock className="h-3 w-3 text-primary" /></div>;
      case 'check': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-primary" /></div>;
      case 'plus': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><Zap className="h-3 w-3 text-primary" /></div>;
      default: return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><Zap className="h-3 w-3 text-primary" /></div>;
    }
  };

  const getIconeAcao = (icone: string) => {
    switch (icone) {
      case 'whatsapp': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><MessageSquare className="h-3 w-3 text-primary" /></div>;
      case 'calendar': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><Calendar className="h-3 w-3 text-primary" /></div>;
      case 'copy': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><Copy className="h-3 w-3 text-primary" /></div>;
      case 'move': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><MoveRight className="h-3 w-3 text-primary" /></div>;
      case 'dollar': return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><Zap className="h-3 w-3 text-primary" /></div>;
      default: return <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center"><Zap className="h-3 w-3 text-primary" /></div>;
    }
  };

  const renderResumo = () => {
    if (!selectedTemplate) return null;

    const funilSelecionado = funis.find(f => f.id === formData.funil_id);
    const etapaSelecionada = etapas.find(e => e.id === formData.etapa_id);
    const funilDestino = funis.find(f => f.id === formData.funil_destino_id);
    const tipoAtiv = TIPOS_ATIVIDADE.find(t => t.value === formData.tipo_atividade);
    const quando = QUANDO_OPTIONS.find(q => q.value === formData.quando);

    let resumoTexto = selectedTemplate.gatilhoLabel;
    
    if (etapaSelecionada && funilSelecionado) {
      resumoTexto = `Quando um negócio chegar a uma etapa ${etapaSelecionada.nome} do ${funilSelecionado.nome}`;
    } else if (funilSelecionado) {
      resumoTexto = `${selectedTemplate.gatilhoLabel} no ${funilSelecionado.nome}`;
    }

    resumoTexto += ' → ';

    if (selectedTemplate.acao === 'agendar_atividade' && tipoAtiv && quando) {
      const quandoLabel = formData.quando === 'personalizado' 
        ? `para ${formData.dias_personalizado} dias depois` 
        : quando.label.toLowerCase();
      resumoTexto += `Agendar uma atividade ${tipoAtiv.label.toLowerCase()} ${quandoLabel}`;
    } else if (selectedTemplate.acao === 'criar_negocio' && funilDestino) {
      resumoTexto += `Duplicá-lo para o ${funilDestino.nome}`;
    } else {
      resumoTexto += selectedTemplate.acaoLabel;
    }

    return (
      <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-4 mt-4">
        <p className="text-sm text-muted-foreground mb-2">Resumo</p>
        <div className="flex items-start gap-2">
          <Zap className="h-4 w-4 text-violet-600 mt-0.5" />
          <p className="text-sm">
            {resumoTexto.split('→').map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="text-muted-foreground"> → </span>}
                <span className={i > 0 ? 'text-violet-600 font-medium' : ''}>
                  {part.trim()}
                </span>
              </span>
            ))}
          </p>
        </div>
      </div>
    );
  };

  const renderTemplateCard = (template: any) => (
    <div
      key={template.id}
      className="bg-card border rounded-xl p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group relative"
      onClick={() => handleSelectTemplate(template)}
    >
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-background/90 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <Button variant="link" className="text-primary hover:text-primary/80">
          + Usar esse modelo
        </Button>
        <span className="text-muted-foreground text-sm">ou</span>
        <Button variant="link" className="text-muted-foreground hover:text-foreground text-sm">
          <Info className="h-3 w-3 mr-1" />
          Ver como funciona
        </Button>
      </div>

      {/* Gatilho */}
      <div className="flex items-center gap-2 mb-3">
        {getIconeGatilho(template.iconeGatilho)}
        <span className="text-sm text-foreground">
          {template.gatilhoLabel.split(' ').map((word: string, i: number) => (
            <span key={i} className={word === 'negócio' || word === 'pessoa' || word === 'empresa' || word === 'atividade' ? 'font-semibold' : ''}>
              {word}{' '}
            </span>
          ))}
        </span>
      </div>

      {/* Seta de conexão */}
      <div className="flex justify-center my-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <ArrowRight className="h-3 w-3 text-primary rotate-90" />
        </div>
      </div>

      {/* Ação */}
      <div className="flex items-center gap-2 bg-primary/10 rounded-lg p-3">
        {getIconeAcao(template.iconeAcao)}
        <span className="text-sm text-foreground">{template.acaoLabel}</span>
      </div>
    </div>
  );

  const handleViewDetails = (automacao: Automacao) => {
    setSelectedAutomacao(automacao);
    setDetailsDialogOpen(true);
  };

  const getQuandoLabel = (quando: string, diasPersonalizado?: number) => {
    switch (quando) {
      case 'mesmo_dia': return 'Para o mesmo dia';
      case '1_dia': return 'Para 1 dia depois';
      case '2_dias': return 'Para 2 dias depois';
      case '3_dias': return 'Para 3 dias depois';
      case '1_semana': return 'Para 1 semana depois';
      case 'personalizado': return `Para ${diasPersonalizado || 1} dias depois`;
      default: return quando;
    }
  };

  const getTipoAtividadeLabel = (tipo: string) => {
    const tipoObj = TIPOS_ATIVIDADE.find(t => t.value === tipo);
    return tipoObj?.label || tipo;
  };

  const renderAutomacaoCard = (automacao: Automacao) => {
    const dataFormatada = new Date(automacao.created_at).toLocaleDateString('pt-BR');
    
    return (
      <Card 
        key={automacao.id} 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleViewDetails(automacao)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
              {automacao.tipo === 'agendar_atividade' && <Calendar className="h-4 w-4 text-violet-600" />}
              {automacao.tipo === 'criar_negocio' && <Copy className="h-4 w-4 text-violet-600" />}
              {automacao.tipo === 'duplicar_card' && <Copy className="h-4 w-4 text-violet-600" />}
              {automacao.tipo === 'duplicar_card_agendado' && <Clock className="h-4 w-4 text-violet-600" />}
              {automacao.tipo === 'mover_card' && <MoveRight className="h-4 w-4 text-violet-600" />}
              {automacao.tipo === 'mover_card_agendado' && <Clock className="h-4 w-4 text-violet-600" />}
              {automacao.tipo === 'enviar_mensagem_whatsapp' && <MessageSquare className="h-4 w-4 text-violet-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">
                {automacao.nome.split('→').map((part, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-muted-foreground"> → </span>}
                    <span className={i > 0 ? 'text-violet-600' : ''}>
                      {part.trim()}
                    </span>
                  </span>
                ))}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Criada em {dataFormatada}
                </p>
                {(automacao.tipo === 'duplicar_card_agendado' || automacao.tipo === 'mover_card_agendado') && automacao.acao_config?.agendamento_dias && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    ⏰ {automacao.acao_config.agendamento_dias} dia(s) às {automacao.acao_config.agendamento_hora}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={automacao.ativo}
                    onCheckedChange={() => handleToggleAtivo(automacao)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {automacao.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDeleteAutomacao(automacao)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Agrupar automações por tipo
  const automacoesAgrupadas = automacoes.reduce((acc, automacao) => {
    const tipo = automacao.tipo;
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(automacao);
    return acc;
  }, {} as Record<string, Automacao[]>);

  const getTituloTipo = (tipo: string) => {
    switch (tipo) {
      case 'agendar_atividade': return 'Agendar atividade automaticamente';
      case 'criar_negocio': return 'Criar negócio automaticamente';
      case 'duplicar_card': return 'Duplicar card automaticamente';
      case 'duplicar_card_agendado': return 'Duplicar card em data/hora programada';
      case 'mover_card': return 'Mover card automaticamente';
      case 'mover_card_agendado': return 'Mover card em data/hora programada';
      case 'enviar_mensagem_whatsapp': return 'Enviar mensagem automaticamente';
      default: return 'Outras automações';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automações</h2>
          <p className="text-muted-foreground">
            Crie ações automáticas para otimizar seu fluxo de trabalho
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Lightbulb className="h-4 w-4" />
          Sugerir nova automação
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="nova">Nova automação</TabsTrigger>
          <TabsTrigger value="criadas">
            Automações criadas
            {automacoes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {automacoes.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Nova automação */}
        <TabsContent value="nova" className="space-y-8 mt-6">
          {/* Duplicar card automaticamente */}
          <div>
            <h3 className="font-semibold mb-4">{TEMPLATES_AUTOMACAO.duplicar_card.titulo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {TEMPLATES_AUTOMACAO.duplicar_card.templates.map(renderTemplateCard)}
            </div>
          </div>

          {/* Mover card automaticamente */}
          <div>
            <h3 className="font-semibold mb-4">{TEMPLATES_AUTOMACAO.mover_card.titulo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {TEMPLATES_AUTOMACAO.mover_card.templates.map(renderTemplateCard)}
            </div>
          </div>

          {/* Agendar atividade automaticamente */}
          <div>
            <h3 className="font-semibold mb-4">{TEMPLATES_AUTOMACAO.agendar_atividade.titulo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {TEMPLATES_AUTOMACAO.agendar_atividade.templates.map(renderTemplateCard)}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Automações criadas */}
        <TabsContent value="criadas" className="space-y-8 mt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando automações...
            </div>
          ) : automacoes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nenhuma automação criada</h3>
                <p className="text-muted-foreground mb-4">
                  Crie sua primeira automação para otimizar seu fluxo de trabalho.
                </p>
                <Button onClick={() => setActiveTab('nova')}>
                  Criar automação
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.entries(automacoesAgrupadas).map(([tipo, lista]) => (
              <div key={tipo}>
                <h3 className="font-semibold mb-4">{getTituloTipo(tipo)}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lista.map(renderAutomacaoCard)}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar nova automação</DialogTitle>
            <DialogDescription>
              Configure os detalhes da automação.
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6 py-4">
              {/* Gatilho */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <Zap className="h-3 w-3" />
                  </div>
                  <span className="font-medium text-sm">{selectedTemplate.gatilhoLabel}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Selecionar o funil</Label>
                    <Select
                      value={formData.funil_id}
                      onValueChange={(value) => setFormData({ ...formData, funil_id: value, etapa_id: '' })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Ex.: Funil de Vendas" />
                      </SelectTrigger>
                      <SelectContent>
                        {funis.map(funil => (
                          <SelectItem key={funil.id} value={funil.id}>
                            {funil.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Selecionar a etapa</Label>
                    <Select
                      value={formData.etapa_id}
                      onValueChange={(value) => setFormData({ ...formData, etapa_id: value })}
                      disabled={!formData.funil_id}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {etapas.map(etapa => (
                          <SelectItem key={etapa.id} value={etapa.id}>
                            {etapa.ordem + 1}. {etapa.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seta de conexão */}
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-violet-600 rotate-90" />
                </div>
              </div>

              {/* Ação */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    {selectedTemplate.acao === 'agendar_atividade' && <Calendar className="h-3 w-3 text-violet-600" />}
                    {selectedTemplate.acao === 'criar_negocio' && <Copy className="h-3 w-3 text-violet-600" />}
                    {selectedTemplate.acao === 'duplicar_card' && <Copy className="h-3 w-3 text-violet-600" />}
                    {selectedTemplate.acao === 'duplicar_card_agendado' && <Clock className="h-3 w-3 text-violet-600" />}
                    {selectedTemplate.acao === 'mover_card' && <MoveRight className="h-3 w-3 text-violet-600" />}
                    {selectedTemplate.acao === 'mover_card_agendado' && <Clock className="h-3 w-3 text-violet-600" />}
                    {selectedTemplate.acao === 'enviar_mensagem_whatsapp' && <MessageSquare className="h-3 w-3 text-violet-600" />}
                  </div>
                  <span className="font-medium text-sm">{selectedTemplate.acaoLabel}</span>
                </div>

                {/* Campos específicos por tipo de ação */}
                {selectedTemplate.acao === 'agendar_atividade' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Tipo da atividade</Label>
                        <Select
                          value={formData.tipo_atividade}
                          onValueChange={(value) => setFormData({ ...formData, tipo_atividade: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Ex.: Ligação" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_ATIVIDADE.map(tipo => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                <div className="flex items-center gap-2">
                                  <tipo.icon className="h-4 w-4" />
                                  {tipo.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Para quando?</Label>
                        <Select
                          value={formData.quando}
                          onValueChange={(value) => setFormData({ ...formData, quando: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUANDO_OPTIONS.map(opcao => (
                              <SelectItem key={opcao.value} value={opcao.value}>
                                {opcao.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Campo de dias personalizados */}
                    {formData.quando === 'personalizado' && (
                      <div>
                        <Label className="text-xs">Quantos dias depois?</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={formData.dias_personalizado}
                          onChange={(e) => setFormData({ ...formData, dias_personalizado: parseInt(e.target.value) || 1 })}
                          className="mt-1 w-32"
                          placeholder="Ex: 5"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">Descrição da atividade</Label>
                      <Textarea
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        placeholder="Qual o próximo passo?"
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {selectedTemplate.acao === 'criar_negocio' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Funil de destino</Label>
                        <Select
                          value={formData.funil_destino_id}
                          onValueChange={(value) => setFormData({ ...formData, funil_destino_id: value, etapa_destino_id: '' })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione o funil..." />
                          </SelectTrigger>
                          <SelectContent>
                            {funis.filter(f => f.id !== formData.funil_id).map(funil => (
                              <SelectItem key={funil.id} value={funil.id}>
                                {funil.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Etapa de destino</Label>
                        <Select
                          value={formData.etapa_destino_id}
                          onValueChange={(value) => setFormData({ ...formData, etapa_destino_id: value })}
                          disabled={!formData.funil_destino_id}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione a etapa..." />
                          </SelectTrigger>
                          <SelectContent>
                            {etapasDestino.map(etapa => (
                              <SelectItem key={etapa.id} value={etapa.id}>
                                {etapa.ordem + 1}. {etapa.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {(selectedTemplate.acao === 'duplicar_card' || selectedTemplate.acao === 'mover_card' || selectedTemplate.acao === 'duplicar_card_agendado' || selectedTemplate.acao === 'mover_card_agendado') && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Funil de destino</Label>
                        <Select
                          value={formData.funil_destino_id}
                          onValueChange={(value) => setFormData({ ...formData, funil_destino_id: value, etapa_destino_id: '' })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione o funil..." />
                          </SelectTrigger>
                          <SelectContent>
                            {funis.map(funil => (
                              <SelectItem key={funil.id} value={funil.id}>
                                {funil.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Etapa de destino</Label>
                        <Select
                          value={formData.etapa_destino_id}
                          onValueChange={(value) => setFormData({ ...formData, etapa_destino_id: value })}
                          disabled={!formData.funil_destino_id}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione a etapa..." />
                          </SelectTrigger>
                          <SelectContent>
                            {etapasDestino.map(etapa => (
                              <SelectItem key={etapa.id} value={etapa.id}>
                                {etapa.ordem + 1}. {etapa.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Prazo em dias e horário exato para automações agendadas */}
                    {(selectedTemplate.acao === 'duplicar_card_agendado' || selectedTemplate.acao === 'mover_card_agendado') && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        <div>
                          <Label className="text-xs">Após quantos dias?</Label>
                          <Input
                            type="number"
                            value={formData.agendamento_dias}
                            onChange={(e) => setFormData({ ...formData, agendamento_dias: parseInt(e.target.value) || 0 })}
                            className="mt-1"
                            min={0}
                            max={365}
                            placeholder="Ex: 0"
                          />
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">0 = mesmo dia do gatilho</span>
                        </div>
                        <div>
                          <Label className="text-xs">No horário exato</Label>
                          <TimePicker
                            value={formData.agendamento_hora}
                            onChange={(value) => setFormData({ ...formData, agendamento_hora: value })}
                            className="mt-1"
                          />
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">Hora, minuto e segundo</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Resumo */}
              {renderResumo()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAutomacao}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhes da automação */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Automação</DialogTitle>
            <DialogDescription>
              Informações completas sobre esta automação.
            </DialogDescription>
          </DialogHeader>

          {selectedAutomacao && (
            <div className="space-y-6 py-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selectedAutomacao.ativo ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">
                    {selectedAutomacao.ativo ? 'Automação Ativa' : 'Automação Inativa'}
                  </span>
                </div>
                <Switch
                  checked={selectedAutomacao.ativo}
                  onCheckedChange={() => {
                    handleToggleAtivo(selectedAutomacao);
                    setSelectedAutomacao({ ...selectedAutomacao, ativo: !selectedAutomacao.ativo });
                  }}
                />
              </div>

              {/* Gatilho */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <Zap className="h-3 w-3" />
                  </div>
                  <span className="font-medium text-sm">Gatilho</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium">
                      {selectedAutomacao.gatilho === 'negocio_chegar_etapa' ? 'Quando card chegar a uma etapa' : selectedAutomacao.gatilho}
                    </span>
                  </div>
                  {selectedAutomacao.funil && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Funil:</span>
                      <span className="font-medium">{selectedAutomacao.funil.nome}</span>
                    </div>
                  )}
                  {selectedAutomacao.etapa && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Etapa:</span>
                      <Badge 
                        variant="outline" 
                        style={{ borderColor: selectedAutomacao.etapa.cor, color: selectedAutomacao.etapa.cor }}
                      >
                        {selectedAutomacao.etapa.nome}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Seta de conexão */}
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-violet-600 rotate-90" />
                </div>
              </div>

              {/* Ação */}
              <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    {selectedAutomacao.tipo === 'agendar_atividade' && <Calendar className="h-3 w-3 text-violet-600" />}
                    {selectedAutomacao.tipo === 'duplicar_card' && <Copy className="h-3 w-3 text-violet-600" />}
                    {selectedAutomacao.tipo === 'duplicar_card_agendado' && <Clock className="h-3 w-3 text-violet-600" />}
                    {selectedAutomacao.tipo === 'mover_card' && <MoveRight className="h-3 w-3 text-violet-600" />}
                    {selectedAutomacao.tipo === 'mover_card_agendado' && <Clock className="h-3 w-3 text-violet-600" />}
                    {selectedAutomacao.tipo === 'criar_negocio' && <Copy className="h-3 w-3 text-violet-600" />}
                  </div>
                  <span className="font-medium text-sm">Ação</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium text-violet-600">
                      {selectedAutomacao.tipo === 'agendar_atividade' && 'Agendar atividade'}
                      {selectedAutomacao.tipo === 'duplicar_card' && 'Duplicar card'}
                      {selectedAutomacao.tipo === 'duplicar_card_agendado' && 'Duplicar card (agendado)'}
                      {selectedAutomacao.tipo === 'mover_card' && 'Mover card'}
                      {selectedAutomacao.tipo === 'mover_card_agendado' && 'Mover card (agendado)'}
                      {selectedAutomacao.tipo === 'criar_negocio' && 'Criar negócio'}
                    </span>
                  </div>
                  
                  {/* Detalhes específicos por tipo de ação */}
                  {selectedAutomacao.tipo === 'agendar_atividade' && selectedAutomacao.acao_config && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo de atividade:</span>
                        <span className="font-medium">{getTipoAtividadeLabel(selectedAutomacao.acao_config.tipo_atividade)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Agendamento:</span>
                        <span className="font-medium">
                          {getQuandoLabel(selectedAutomacao.acao_config.quando, selectedAutomacao.acao_config.dias_personalizado)}
                        </span>
                      </div>
                      {selectedAutomacao.acao_config.descricao && (
                        <div className="pt-2 border-t">
                          <span className="text-muted-foreground block mb-1">Descrição:</span>
                          <p className="text-sm bg-white dark:bg-slate-900 rounded p-2">
                            {selectedAutomacao.acao_config.descricao}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {(selectedAutomacao.tipo === 'duplicar_card' || selectedAutomacao.tipo === 'mover_card' || selectedAutomacao.tipo === 'duplicar_card_agendado' || selectedAutomacao.tipo === 'mover_card_agendado' || selectedAutomacao.tipo === 'criar_negocio') && selectedAutomacao.acao_config && (
                    <>
                      {selectedAutomacao.acao_config.funil_destino_id && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Funil destino:</span>
                          <span className="font-medium">
                            {funis.find(f => f.id === selectedAutomacao.acao_config.funil_destino_id)?.nome || 'N/A'}
                          </span>
                        </div>
                      )}
                      {selectedAutomacao.acao_config.agendamento_dias && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prazo:</span>
                          <span className="font-medium">{selectedAutomacao.acao_config.agendamento_dias} dia(s)</span>
                        </div>
                      )}
                      {selectedAutomacao.acao_config.agendamento_hora && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Horário exato:</span>
                          <span className="font-medium">{selectedAutomacao.acao_config.agendamento_hora}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Informações adicionais */}
              <div className="text-xs text-muted-foreground border-t pt-4">
                <div className="flex justify-between">
                  <span>Criada em:</span>
                  <span>{new Date(selectedAutomacao.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedAutomacao) {
                  handleDeleteAutomacao(selectedAutomacao);
                  setDetailsDialogOpen(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
