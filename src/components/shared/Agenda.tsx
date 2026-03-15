import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  isSameMonth,
  parseISO,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  isBefore,
  isAfter,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  Clock,
  MapPin,
  Users,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Share2,
  Edit2,
  Trash2,
  X,
  Check,
  UserPlus,
  CalendarDays,
  MoreVertical,
  Filter,
  AlertCircle,
  Video,
  Briefcase,
  Bell,
  Car,
  Ban,
  Send,
  LinkIcon,
  Building2,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  nome_completo: string | null;
  email: string | null;
  role: string;
  setor_id: string | null;
}

interface ClienteSst {
  id: string;
  nome: string;
  responsavel: string | null;
  email: string | null;
}

interface AgendaEvento {
  id: string;
  empresa_id: string;
  criado_por: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  dia_inteiro: boolean;
  local: string | null;
  cor: string;
  tipo: string;
  status: string;
  visibilidade: string;
  bloqueado: boolean;
  meet_link: string | null;
  cliente_sst_id: string | null;
  cliente_email: string | null;
  cliente_nome: string | null;
  convite_enviado: boolean;
  convite_enviado_em: string | null;
  created_at: string;
  criador?: Profile;
  compartilhamentos?: AgendaCompartilhamento[];
}

interface AgendaCompartilhamento {
  id: string;
  evento_id: string;
  compartilhado_com: string;
  compartilhado_por: string;
  pode_editar: boolean;
  usuario?: Profile;
}

type VisualizacaoTipo = 'mes' | 'semana' | 'dia' | 'lista';
type FiltroVisibilidade = 'todos' | 'meus' | 'compartilhados';

// ── Constantes ─────────────────────────────────────────────────────────────────
const TIPOS_EVENTO = [
  { value: 'evento', label: 'Evento', icon: CalendarDays },
  { value: 'reuniao', label: 'Reunião', icon: Users },
  { value: 'tarefa', label: 'Tarefa', icon: Check },
  { value: 'lembrete', label: 'Lembrete', icon: Bell },
  { value: 'visita', label: 'Visita', icon: Car },
  { value: 'outro', label: 'Outro', icon: Briefcase },
  { value: 'bloqueio', label: 'Bloqueio', icon: Ban },
];

const CORES_EVENTO = [
  '#16E17A', '#0B5D4A', '#3B82F6', '#EF4444',
  '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4',
  '#84CC16', '#F97316', '#6B7280', '#1D4ED8',
];

const VISIBILIDADE_CONFIG = {
  privado: { label: 'Privado', icon: Lock, desc: 'Somente você vê' },
  compartilhado: { label: 'Compartilhado', icon: Share2, desc: 'Visível para selecionados' },
  empresa: { label: 'Empresa', icon: Globe, desc: 'Todos da empresa veem' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function iniciais(nome: string | null): string {
  if (!nome) return '?';
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function formatarHora(dt: string): string {
  return format(parseISO(dt), 'HH:mm');
}

function corComOpacidade(cor: string, opacidade: number): string {
  const hex = cor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacidade})`;
}

// ── Componente Principal ───────────────────────────────────────────────────────
interface AgendaProps {
  modoAdmin?: boolean; // admin_vertical vê agendas de todos
}

export function Agenda({ modoAdmin = false }: AgendaProps) {
  const { user, profile, empresa } = useAuth();
  const { toast } = useToast();

  // Estado de navegação
  const [dataAtual, setDataAtual] = useState(new Date());
  const [visualizacao, setVisualizacao] = useState<VisualizacaoTipo>('mes');
  const [filtro, setFiltro] = useState<FiltroVisibilidade>('todos');

  // Dados
  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [clientes, setClientes] = useState<ClienteSst[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviandoConvite, setEnviandoConvite] = useState(false);

  // Dialog de evento
  const [dialogAberto, setDialogAberto] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<AgendaEvento | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);

  // Dialog de compartilhamento
  const [dialogCompartilhar, setDialogCompartilhar] = useState(false);
  const [eventoParaCompartilhar, setEventoParaCompartilhar] = useState<AgendaEvento | null>(null);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);
  const [buscarUsuario, setBuscarUsuario] = useState('');

  // Formulário
  const FORM_INICIAL = {
    titulo: '',
    descricao: '',
    data_inicio: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    data_fim: format(addDays(new Date(), 0), "yyyy-MM-dd'T'HH:mm"),
    dia_inteiro: false,
    local: '',
    cor: '#16E17A',
    tipo: 'evento',
    visibilidade: 'privado',
    bloqueado: false,
    meet_link: '',
    cliente_sst_id: '',
    cliente_email: '',
    cliente_nome: '',
  };
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);

  // ── Carregar Clientes SST ────────────────────────────────────────────────
  const carregarClientes = useCallback(async () => {
    if (!empresa?.id) return;
    const { data } = await (supabase as any)
      .from('clientes_sst')
      .select('id, nome, responsavel, email')
      .eq('empresa_sst_id', empresa.id)
      .order('nome');
    if (data) setClientes(data);
  }, [empresa?.id]);

  // ── Carregar Usuários ──────────────────────────────────────────────────────
  const carregarUsuarios = useCallback(async () => {
    if (!empresa?.id) return;
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, nome_completo, email, role, setor_id')
      .eq('empresa_id', empresa.id)
      .neq('id', user?.id)
      .order('nome_completo');
    if (data) setUsuarios(data);
  }, [empresa?.id, user?.id]);

  // ── Carregar Eventos ───────────────────────────────────────────────────────
  const carregarEventos = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('agenda_eventos')
        .select(`
          *,
          criador:profiles!agenda_eventos_criado_por_fkey(id, nome_completo, email, role, setor_id),
          compartilhamentos:agenda_compartilhamentos(
            id, evento_id, compartilhado_com, compartilhado_por, pode_editar,
            usuario:profiles!agenda_compartilhamentos_compartilhado_com_fkey(id, nome_completo, email, role, setor_id)
          )
        `)
        .eq('empresa_id', empresa.id)
        .eq('status', 'ativo')
        .order('data_inicio', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      setEventos(data || []);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar agenda', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, toast]);

  useEffect(() => {
    carregarEventos();
    carregarUsuarios();
    carregarClientes();
  }, [carregarEventos, carregarUsuarios, carregarClientes]);

  // ── Filtrar Eventos ────────────────────────────────────────────────────────
  const eventosFiltrados = eventos.filter(ev => {
    if (filtro === 'meus') return ev.criado_por === user?.id;
    if (filtro === 'compartilhados') {
      return ev.criado_por !== user?.id && (
        ev.compartilhamentos?.some(c => c.compartilhado_com === user?.id) ||
        ev.visibilidade === 'empresa'
      );
    }
    return true;
  });

  // ── Eventos do Dia ─────────────────────────────────────────────────────────
  function eventosNoDia(dia: Date): AgendaEvento[] {
    return eventosFiltrados.filter(ev => {
      const inicio = parseISO(ev.data_inicio);
      return isSameDay(inicio, dia);
    });
  }

  // ── Permissão de edição ────────────────────────────────────────────────────
  function podeEditar(ev: AgendaEvento): boolean {
    if (ev.criado_por === user?.id) return true;
    if (modoAdmin && profile?.role === 'admin_vertical') return true;
    if (profile?.role === 'empresa_sst' || profile?.role === 'cliente_final') return true;
    return ev.compartilhamentos?.some(
      c => c.compartilhado_com === user?.id && c.pode_editar
    ) ?? false;
  }

  function podeDeletar(ev: AgendaEvento): boolean {
    if (ev.criado_por === user?.id) return true;
    if (modoAdmin && profile?.role === 'admin_vertical') return true;
    return false;
  }

  // ── Salvar Evento ──────────────────────────────────────────────────────────
  const salvarEvento = async () => {
    if (!form.titulo.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao || null,
        data_inicio: form.dia_inteiro
          ? form.data_inicio.split('T')[0] + 'T00:00:00'
          : form.data_inicio,
        data_fim: form.data_fim
          ? (form.dia_inteiro ? form.data_fim.split('T')[0] + 'T23:59:59' : form.data_fim)
          : null,
        dia_inteiro: form.dia_inteiro,
        local: form.local || null,
        cor: form.tipo === 'bloqueio' ? '#6B7280' : form.cor,
        tipo: form.tipo,
        visibilidade: form.tipo === 'bloqueio' ? 'privado' : form.visibilidade,
        bloqueado: form.bloqueado || form.tipo === 'bloqueio',
        meet_link: form.meet_link || null,
        cliente_sst_id: form.cliente_sst_id || null,
        cliente_email: form.cliente_email || null,
        cliente_nome: form.cliente_nome || null,
        empresa_id: empresa?.id,
        criado_por: user?.id,
      };

      if (eventoSelecionado && modoEdicao) {
        const { error } = await (supabase as any)
          .from('agenda_eventos')
          .update(payload)
          .eq('id', eventoSelecionado.id);
        if (error) throw error;
        toast({ title: 'Evento atualizado com sucesso!' });
      } else {
        const { error } = await (supabase as any)
          .from('agenda_eventos')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Evento criado com sucesso!' });
      }

      setDialogAberto(false);
      setEventoSelecionado(null);
      setModoEdicao(false);
      setForm(FORM_INICIAL);
      carregarEventos();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar evento', description: e.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  // ── Deletar Evento ─────────────────────────────────────────────────────────
  const deletarEvento = async (ev: AgendaEvento) => {
    if (!confirm(`Excluir o evento "${ev.titulo}"?`)) return;
    try {
      const { error } = await (supabase as any)
        .from('agenda_eventos')
        .update({ status: 'cancelado' })
        .eq('id', ev.id);
      if (error) throw error;
      toast({ title: 'Evento excluído' });
      setEventoSelecionado(null);
      carregarEventos();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    }
  };

  // ── Compartilhar Evento ────────────────────────────────────────────────────
  const abrirCompartilhar = (ev: AgendaEvento) => {
    setEventoParaCompartilhar(ev);
    const jaCompartilhados = ev.compartilhamentos?.map(c => c.compartilhado_com) ?? [];
    setUsuariosSelecionados(jaCompartilhados);
    setDialogCompartilhar(true);
  };

  const salvarCompartilhamento = async () => {
    if (!eventoParaCompartilhar) return;
    setSalvando(true);
    try {
      // Remover compartilhamentos antigos
      await (supabase as any)
        .from('agenda_compartilhamentos')
        .delete()
        .eq('evento_id', eventoParaCompartilhar.id);

      // Inserir novos
      if (usuariosSelecionados.length > 0) {
        const inserts = usuariosSelecionados.map(uid => ({
          evento_id: eventoParaCompartilhar.id,
          compartilhado_com: uid,
          compartilhado_por: user?.id,
          pode_editar: false,
        }));
        const { error } = await (supabase as any)
          .from('agenda_compartilhamentos')
          .insert(inserts);
        if (error) throw error;
      }

      // Atualizar visibilidade do evento para 'compartilhado' se há usuários
      const novaVisibilidade = usuariosSelecionados.length > 0 ? 'compartilhado' : 'privado';
      await (supabase as any)
        .from('agenda_eventos')
        .update({ visibilidade: novaVisibilidade })
        .eq('id', eventoParaCompartilhar.id);

      toast({ title: 'Compartilhamento salvo!' });
      setDialogCompartilhar(false);
      carregarEventos();
    } catch (e: any) {
      toast({ title: 'Erro ao compartilhar', description: e.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  // ── Abrir formulário ───────────────────────────────────────────────────────
  const abrirNovoEvento = (dia?: Date) => {
    const base = dia || new Date();
    setForm({
      ...FORM_INICIAL,
      data_inicio: format(base, "yyyy-MM-dd'T'09:00"),
      data_fim: format(base, "yyyy-MM-dd'T'10:00"),
    });
    setEventoSelecionado(null);
    setModoEdicao(false);
    setDialogAberto(true);
  };

  const abrirEdicao = (ev: AgendaEvento) => {
    setForm({
      titulo: ev.titulo,
      descricao: ev.descricao || '',
      data_inicio: format(parseISO(ev.data_inicio), "yyyy-MM-dd'T'HH:mm"),
      data_fim: ev.data_fim ? format(parseISO(ev.data_fim), "yyyy-MM-dd'T'HH:mm") : format(parseISO(ev.data_inicio), "yyyy-MM-dd'T'HH:mm"),
      dia_inteiro: ev.dia_inteiro,
      local: ev.local || '',
      cor: ev.cor,
      tipo: ev.tipo,
      visibilidade: ev.visibilidade,
      bloqueado: ev.bloqueado ?? false,
      meet_link: ev.meet_link || '',
      cliente_sst_id: ev.cliente_sst_id || '',
      cliente_email: ev.cliente_email || '',
      cliente_nome: ev.cliente_nome || '',
    });
    setEventoSelecionado(ev);
    setModoEdicao(true);
    setDialogAberto(true);
  };

  // ── Enviar Convite de Reunião via Meet ─────────────────────────────────────
  const enviarConviteMeet = async (ev: AgendaEvento) => {
    if (!ev.meet_link) {
      toast({ title: 'Adicione um link do Google Meet antes de enviar o convite', variant: 'destructive' });
      return;
    }
    const emailDestino = ev.cliente_email || (
      ev.cliente_sst_id ? clientes.find(c => c.id === ev.cliente_sst_id)?.email : null
    );
    if (!emailDestino) {
      toast({ title: 'Informe o email do cliente no evento para enviar o convite', variant: 'destructive' });
      return;
    }
    setEnviandoConvite(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/agenda-enviar-convite-reuniao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ evento_id: ev.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar convite');
      toast({ title: `Convite enviado para ${json.destinatario}!` });
      carregarEventos();
    } catch (e: any) {
      toast({ title: 'Erro ao enviar convite', description: e.message, variant: 'destructive' });
    } finally {
      setEnviandoConvite(false);
    }
  };

  // ── Gerar Link Google Meet ─────────────────────────────────────────────────
  const [gerandoMeet, setGerandoMeet] = useState(false);

  const gerarLinkMeet = async () => {
    setGerandoMeet(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/google-meet-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          titulo: form.titulo || 'Reunião',
          data_inicio: form.data_inicio,
          data_fim: form.data_fim,
          descricao: form.descricao || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === 'NOT_CONNECTED') {
          toast({ title: 'Google Meet não conectado', description: 'Acesse Configurações → Integrações para conectar o Google Meet da empresa.', variant: 'destructive' });
        } else if (json.code === 'TOKEN_EXPIRED') {
          toast({ title: 'Token expirado', description: 'Reconecte o Google Meet em Configurações → Integrações.', variant: 'destructive' });
        } else {
          throw new Error(json.error || 'Erro ao gerar link');
        }
        return;
      }
      setForm(f => ({ ...f, meet_link: json.meet_link }));
      toast({ title: 'Link do Meet gerado!', description: json.meet_link });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar link Meet', description: e.message, variant: 'destructive' });
    } finally {
      setGerandoMeet(false);
    }
  };

  // ── Renderizar Evento (pill) ───────────────────────────────────────────────
  const PillEvento = ({ ev, pequeno = false }: { ev: AgendaEvento; pequeno?: boolean }) => {
    const isCompartilhado = ev.visibilidade === 'compartilhado' || ev.visibilidade === 'empresa';
    const TipoIcon = TIPOS_EVENTO.find(t => t.value === ev.tipo)?.icon ?? CalendarDays;
    return (
      <div
        className={cn(
          'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium cursor-pointer truncate select-none',
          'hover:brightness-110 transition-all'
        )}
        style={{ backgroundColor: corComOpacidade(ev.cor, 0.2), borderLeft: `3px solid ${ev.cor}`, color: ev.cor }}
        onClick={e => { e.stopPropagation(); setEventoSelecionado(ev); }}
      >
        <TipoIcon className={cn('shrink-0', pequeno ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
        {!pequeno && <span className="truncate">{ev.titulo}</span>}
        {!ev.dia_inteiro && !pequeno && (
          <span className="shrink-0 opacity-70">{formatarHora(ev.data_inicio)}</span>
        )}
        {isCompartilhado && !pequeno && <Share2 className="h-2.5 w-2.5 shrink-0 opacity-60" />}
      </div>
    );
  };

  // ── Visualização Mês ───────────────────────────────────────────────────────
  const renderMes = () => {
    const inicioMes = startOfMonth(dataAtual);
    const fimMes = endOfMonth(dataAtual);
    const inicioGrid = startOfWeek(inicioMes, { weekStartsOn: 0 });
    const fimGrid = endOfWeek(fimMes, { weekStartsOn: 0 });
    const dias = eachDayOfInterval({ start: inicioGrid, end: fimGrid });

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: 'minmax(100px, 1fr)' }}>
          {dias.map(dia => {
            const evsDia = eventosNoDia(dia);
            const mesAtual = isSameMonth(dia, dataAtual);
            return (
              <div
                key={dia.toISOString()}
                className={cn(
                  'border-b border-r p-1 overflow-hidden cursor-pointer hover:bg-muted/40 transition-colors',
                  !mesAtual && 'opacity-40',
                  isToday(dia) && 'bg-primary/5'
                )}
                onClick={() => abrirNovoEvento(dia)}
              >
                <div className={cn(
                  'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                  isToday(dia) && 'bg-primary text-primary-foreground'
                )}>
                  {format(dia, 'd')}
                </div>
                <div className="flex flex-col gap-0.5">
                  {evsDia.slice(0, 3).map(ev => (
                    <PillEvento key={ev.id} ev={ev} pequeno={evsDia.length > 3} />
                  ))}
                  {evsDia.length > 3 && (
                    <span className="text-xs text-muted-foreground pl-1">
                      +{evsDia.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Visualização Semana ────────────────────────────────────────────────────
  const renderSemana = () => {
    const inicio = startOfWeek(dataAtual, { weekStartsOn: 0 });
    const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {dias.map(dia => (
            <div key={dia.toISOString()} className={cn(
              'text-center py-2 border-r',
              isToday(dia) && 'bg-primary/5'
            )}>
              <div className="text-xs text-muted-foreground">{format(dia, 'EEE', { locale: ptBR })}</div>
              <div className={cn(
                'text-sm font-semibold w-8 h-8 mx-auto flex items-center justify-center rounded-full',
                isToday(dia) && 'bg-primary text-primary-foreground'
              )}>
                {format(dia, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 overflow-auto">
          {dias.map(dia => {
            const evsDia = eventosNoDia(dia);
            return (
              <div
                key={dia.toISOString()}
                className="border-r p-2 flex flex-col gap-1 min-h-[400px] cursor-pointer hover:bg-muted/20"
                onClick={() => abrirNovoEvento(dia)}
              >
                {evsDia.map(ev => (
                  <PillEvento key={ev.id} ev={ev} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Visualização Dia ───────────────────────────────────────────────────────
  const renderDia = () => {
    const evsDia = eventosNoDia(dataAtual);
    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {format(dataAtual, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
          <Button size="sm" onClick={() => abrirNovoEvento(dataAtual)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Evento
          </Button>
        </div>
        {evsDia.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-2 opacity-30" />
            <p>Nenhum evento neste dia</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {evsDia.map(ev => <CardEvento key={ev.id} ev={ev} />)}
          </div>
        )}
      </div>
    );
  };

  // ── Visualização Lista ─────────────────────────────────────────────────────
  const renderLista = () => {
    const hoje = startOfDay(new Date());
    const proximos = eventosFiltrados
      .filter(ev => !isBefore(parseISO(ev.data_inicio), hoje))
      .slice(0, 50);

    const porData: Record<string, AgendaEvento[]> = {};
    proximos.forEach(ev => {
      const chave = format(parseISO(ev.data_inicio), 'yyyy-MM-dd');
      if (!porData[chave]) porData[chave] = [];
      porData[chave].push(ev);
    });

    return (
      <ScrollArea className="flex-1 p-4">
        {Object.keys(porData).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <List className="h-12 w-12 mb-2 opacity-30" />
            <p>Nenhum evento próximo</p>
          </div>
        ) : (
          Object.entries(porData).map(([data, evs]) => (
            <div key={data} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  'text-sm font-semibold px-2 py-0.5 rounded',
                  isToday(parseISO(data)) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}>
                  {isToday(parseISO(data)) ? 'Hoje' : format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </div>
                <Separator className="flex-1" />
              </div>
              <div className="flex flex-col gap-2 ml-2">
                {evs.map(ev => <CardEvento key={ev.id} ev={ev} />)}
              </div>
            </div>
          ))
        )}
      </ScrollArea>
    );
  };

  // ── Card Evento (visão detalhada) ──────────────────────────────────────────
  const CardEvento = ({ ev }: { ev: AgendaEvento }) => {
    const TipoIcon = TIPOS_EVENTO.find(t => t.value === ev.tipo)?.icon ?? CalendarDays;
    const VisIcon = VISIBILIDADE_CONFIG[ev.visibilidade as keyof typeof VISIBILIDADE_CONFIG]?.icon ?? Lock;
    const isMeu = ev.criado_por === user?.id;

    return (
      <div
        className="flex gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all"
        style={{ borderLeft: `4px solid ${ev.cor}` }}
        onClick={() => setEventoSelecionado(ev)}
      >
        <div className="flex flex-col items-center gap-1 min-w-[50px]">
          <TipoIcon className="h-4 w-4 text-muted-foreground" />
          {!ev.dia_inteiro ? (
            <span className="text-xs text-muted-foreground">{formatarHora(ev.data_inicio)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">Dia todo</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm truncate">{ev.titulo}</p>
            <div className="flex items-center gap-1 shrink-0">
              <VisIcon className="h-3 w-3 text-muted-foreground" />
              {!isMeu && (
                <Badge variant="secondary" className="text-xs h-4 px-1">
                  {ev.criador?.nome_completo?.split(' ')[0]}
                </Badge>
              )}
            </div>
          </div>
          {ev.local && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">{ev.local}</span>
            </div>
          )}
          {ev.descricao && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.descricao}</p>
          )}
        </div>
      </div>
    );
  };

  // ── Navegar ────────────────────────────────────────────────────────────────
  const navAnterior = () => {
    if (visualizacao === 'mes') setDataAtual(subMonths(dataAtual, 1));
    else if (visualizacao === 'semana') setDataAtual(subWeeks(dataAtual, 1));
    else setDataAtual(subDays(dataAtual, 1));
  };
  const navProximo = () => {
    if (visualizacao === 'mes') setDataAtual(addMonths(dataAtual, 1));
    else if (visualizacao === 'semana') setDataAtual(addWeeks(dataAtual, 1));
    else setDataAtual(addDays(dataAtual, 1));
  };

  const tituloNavegacao = () => {
    if (visualizacao === 'mes') return format(dataAtual, "MMMM 'de' yyyy", { locale: ptBR });
    if (visualizacao === 'semana') {
      const ini = startOfWeek(dataAtual, { weekStartsOn: 0 });
      const fim = endOfWeek(dataAtual, { weekStartsOn: 0 });
      return `${format(ini, 'd MMM', { locale: ptBR })} – ${format(fim, 'd MMM yyyy', { locale: ptBR })}`;
    }
    return format(dataAtual, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // ── Usuários filtrados para busca ──────────────────────────────────────────
  const usuariosFiltradosBusca = usuarios.filter(u =>
    !buscarUsuario || u.nome_completo?.toLowerCase().includes(buscarUsuario.toLowerCase()) || u.email?.toLowerCase().includes(buscarUsuario.toLowerCase())
  );

  // ── Render Principal ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Agenda</h2>
          {modoAdmin && (
            <Badge variant="secondary" className="text-xs">Visão Geral</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro */}
          <Select value={filtro} onValueChange={v => setFiltro(v as FiltroVisibilidade)}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os eventos</SelectItem>
              <SelectItem value="meus">Meus eventos</SelectItem>
              <SelectItem value="compartilhados">Compartilhados comigo</SelectItem>
            </SelectContent>
          </Select>

          {/* Visualização */}
          <div className="flex rounded-md border overflow-hidden">
            {(['mes', 'semana', 'dia', 'lista'] as const).map(v => (
              <button
                key={v}
                onClick={() => setVisualizacao(v)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium transition-colors',
                  visualizacao === v
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                {v === 'mes' ? 'Mês' : v === 'semana' ? 'Semana' : v === 'dia' ? 'Dia' : 'Lista'}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => abrirNovoEvento()}>
            <Plus className="h-4 w-4 mr-1" /> Novo Evento
          </Button>
        </div>
      </div>

      {/* Navegação de data */}
      {visualizacao !== 'lista' && (
        <div className="flex items-center gap-3 mb-3">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={navAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-sm font-medium min-w-[200px] justify-center" onClick={() => setDataAtual(new Date())}>
            {tituloNavegacao()}
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={navProximo}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-background">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="animate-pulse">Carregando agenda...</div>
          </div>
        ) : (
          <>
            {visualizacao === 'mes' && renderMes()}
            {visualizacao === 'semana' && renderSemana()}
            {visualizacao === 'dia' && renderDia()}
            {visualizacao === 'lista' && renderLista()}
          </>
        )}
      </div>

      {/* ── Dialog: Detalhe do Evento ─────────────────────────────────────── */}
      {eventoSelecionado && !modoEdicao && (
        <Dialog open={!!eventoSelecionado} onOpenChange={() => setEventoSelecionado(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: eventoSelecionado.cor }} />
                  <DialogTitle className="text-lg truncate">{eventoSelecionado.titulo}</DialogTitle>
                  {eventoSelecionado.bloqueado && (
                    <Badge variant="secondary" className="text-xs shrink-0"><Ban className="h-3 w-3 mr-1" />Bloqueado</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {podeEditar(eventoSelecionado) && (
                    <>
                      {eventoSelecionado.criado_por === user?.id && eventoSelecionado.tipo !== 'bloqueio' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirCompartilhar(eventoSelecionado)}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEdicao(eventoSelecionado)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {podeDeletar(eventoSelecionado) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deletarEvento(eventoSelecionado)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-3 text-sm mt-2">
              {/* Tipo + Visibilidade */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="capitalize">
                  {TIPOS_EVENTO.find(t => t.value === eventoSelecionado.tipo)?.label}
                </Badge>
                {eventoSelecionado.tipo !== 'bloqueio' && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {(() => {
                      const V = VISIBILIDADE_CONFIG[eventoSelecionado.visibilidade as keyof typeof VISIBILIDADE_CONFIG];
                      if (!V) return null;
                      const Icon = V.icon;
                      return <><Icon className="h-3 w-3" /><span className="text-xs">{V.label}</span></>;
                    })()}
                  </div>
                )}
              </div>

              {/* Data/Hora */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  {eventoSelecionado.dia_inteiro
                    ? format(parseISO(eventoSelecionado.data_inicio), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) + ' — dia todo'
                    : format(parseISO(eventoSelecionado.data_inicio), "d MMM yyyy, HH:mm", { locale: ptBR })
                      + (eventoSelecionado.data_fim ? ` → ${format(parseISO(eventoSelecionado.data_fim), 'HH:mm')}` : '')
                  }
                </span>
              </div>

              {/* Local */}
              {eventoSelecionado.local && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{eventoSelecionado.local}</span>
                </div>
              )}

              {/* Cliente vinculado */}
              {(eventoSelecionado.cliente_nome || eventoSelecionado.cliente_sst_id) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">
                      {eventoSelecionado.cliente_nome ||
                        clientes.find(c => c.id === eventoSelecionado.cliente_sst_id)?.nome ||
                        'Cliente'}
                    </span>
                    {eventoSelecionado.cliente_email && (
                      <span className="text-xs ml-2 opacity-70">{eventoSelecionado.cliente_email}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Google Meet */}
              {eventoSelecionado.meet_link && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Google Meet</span>
                    </div>
                    <a
                      href={eventoSelecionado.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                    >
                      Entrar na reunião
                    </a>
                  </div>
                  {/* Botão enviar convite */}
                  {eventoSelecionado.criado_por === user?.id && eventoSelecionado.tipo === 'reuniao' && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      {eventoSelecionado.convite_enviado ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Convite enviado {eventoSelecionado.convite_enviado_em
                            ? format(parseISO(eventoSelecionado.convite_enviado_em), "d/MM 'às' HH:mm")
                            : ''}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs ml-auto text-blue-700 hover:text-blue-800"
                            onClick={() => enviarConviteMeet(eventoSelecionado)}
                            disabled={enviandoConvite}
                          >
                            Reenviar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => enviarConviteMeet(eventoSelecionado)}
                          disabled={enviandoConvite}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {enviandoConvite ? 'Enviando...' : 'Enviar convite ao cliente'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Descrição */}
              {eventoSelecionado.descricao && (
                <p className="text-muted-foreground whitespace-pre-line">{eventoSelecionado.descricao}</p>
              )}

              {/* Criador */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">{iniciais(eventoSelecionado.criador?.nome_completo ?? null)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  Criado por <strong>{eventoSelecionado.criador?.nome_completo ?? 'Desconhecido'}</strong>
                </span>
              </div>

              {/* Compartilhamentos */}
              {(eventoSelecionado.compartilhamentos?.length ?? 0) > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium mb-1 text-muted-foreground">Compartilhado com:</p>
                  <div className="flex flex-wrap gap-1">
                    {eventoSelecionado.compartilhamentos?.map(c => (
                      <Badge key={c.id} variant="secondary" className="text-xs">
                        {c.usuario?.nome_completo?.split(' ')[0] ?? 'Usuário'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Dialog: Formulário de Evento ──────────────────────────────────── */}
      <Dialog open={dialogAberto} onOpenChange={open => { if (!open) { setDialogAberto(false); setModoEdicao(false); setEventoSelecionado(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modoEdicao ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Título + Cor */}
            <div className="flex gap-2 items-start">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-8 h-8 rounded-full border-2 border-border shrink-0 mt-0.5 hover:scale-110 transition-transform"
                    style={{ backgroundColor: form.cor }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-44 p-2">
                  <div className="grid grid-cols-6 gap-1">
                    {CORES_EVENTO.map(c => (
                      <button
                        key={c}
                        className={cn('w-6 h-6 rounded-full hover:scale-110 transition-transform', form.cor === c && 'ring-2 ring-offset-1 ring-primary')}
                        style={{ backgroundColor: c }}
                        onClick={() => setForm(f => ({ ...f, cor: c }))}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex-1">
                <Input
                  placeholder="Título do evento *"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                />
              </div>
            </div>

            {/* Tipo */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
              <div className="flex flex-wrap gap-1">
                {TIPOS_EVENTO.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors',
                        form.tipo === t.value ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dia Inteiro */}
            <div className="flex items-center gap-2">
              <Switch
                id="dia-inteiro"
                checked={form.dia_inteiro}
                onCheckedChange={v => setForm(f => ({ ...f, dia_inteiro: v }))}
              />
              <Label htmlFor="dia-inteiro" className="text-sm">Dia inteiro</Label>
            </div>

            {/* Data/Hora */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Início *</Label>
                <Input
                  type={form.dia_inteiro ? 'date' : 'datetime-local'}
                  value={form.dia_inteiro ? form.data_inicio.split('T')[0] : form.data_inicio}
                  onChange={e => setForm(f => ({ ...f, data_inicio: form.dia_inteiro ? e.target.value + 'T00:00' : e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Fim</Label>
                <Input
                  type={form.dia_inteiro ? 'date' : 'datetime-local'}
                  value={form.dia_inteiro ? (form.data_fim?.split('T')[0] ?? '') : (form.data_fim ?? '')}
                  onChange={e => setForm(f => ({ ...f, data_fim: form.dia_inteiro ? e.target.value + 'T23:59' : e.target.value }))}
                />
              </div>
            </div>

            {/* Local */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Local</Label>
              <div className="relative">
                <MapPin className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Endereço ou link de videoconferência"
                  value={form.local}
                  onChange={e => setForm(f => ({ ...f, local: e.target.value }))}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Descrição</Label>
              <Textarea
                placeholder="Notas, pauta, observações..."
                rows={3}
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            {/* Bloqueio de horário */}
            {form.tipo === 'bloqueio' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                <Ban className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Bloqueio de Horário</p>
                  <p className="text-xs text-muted-foreground">Este período ficará marcado como indisponível na sua agenda. Visível somente para você.</p>
                </div>
              </div>
            )}

            {/* Google Meet — só para tipo reunião */}
            {form.tipo === 'reuniao' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Video className="h-3 w-3" /> Link do Google Meet
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      placeholder="https://meet.google.com/xxx-xxxx-xxx"
                      value={form.meet_link}
                      onChange={e => setForm(f => ({ ...f, meet_link: e.target.value }))}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={gerarLinkMeet}
                    disabled={gerandoMeet}
                    className="shrink-0 text-xs h-9 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Video className="h-3 w-3 mr-1" />
                    {gerandoMeet ? 'Gerando...' : 'Gerar Meet'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em <strong>Gerar Meet</strong> para criar automaticamente (requer conexão em Configurações → Integrações), ou cole o link manualmente.
                </p>
              </div>
            )}

            {/* Cliente — só para tipo reunião ou visita */}
            {(form.tipo === 'reuniao' || form.tipo === 'visita') && (
              <div className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/30">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Cliente
                </Label>
                {clientes.length > 0 && (
                  <Select
                    value={form.cliente_sst_id}
                    onValueChange={v => {
                      const cli = clientes.find(c => c.id === v);
                      setForm(f => ({
                        ...f,
                        cliente_sst_id: v,
                        cliente_nome: cli?.responsavel || cli?.nome || '',
                        cliente_email: cli?.email || '',
                      }));
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar cliente cadastrado..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum (inserir manualmente)</SelectItem>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome} {c.email ? `— ${c.email}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Nome do contato</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Nome do responsável"
                      value={form.cliente_nome}
                      onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email p/ convite
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      type="email"
                      placeholder="email@cliente.com"
                      value={form.cliente_email}
                      onChange={e => setForm(f => ({ ...f, cliente_email: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Visibilidade — esconde para bloqueio */}
            {form.tipo !== 'bloqueio' && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Visibilidade</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(VISIBILIDADE_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setForm(f => ({ ...f, visibilidade: key }))}
                      className={cn(
                        'flex flex-col items-center gap-0.5 px-3 py-2 rounded border text-xs transition-colors',
                        form.visibilidade === key ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {VISIBILIDADE_CONFIG[form.visibilidade as keyof typeof VISIBILIDADE_CONFIG]?.desc}
              </p>
            </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogAberto(false); setModoEdicao(false); }}>
              Cancelar
            </Button>
            <Button onClick={salvarEvento} disabled={salvando}>
              {salvando ? 'Salvando...' : modoEdicao ? 'Salvar Alterações' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Compartilhar Evento ───────────────────────────────────── */}
      <Dialog open={dialogCompartilhar} onOpenChange={setDialogCompartilhar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Compartilhar Evento
            </DialogTitle>
          </DialogHeader>

          {eventoParaCompartilhar && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Selecione os colaboradores que poderão ver <strong>"{eventoParaCompartilhar.titulo}"</strong>:
              </p>

              <Input
                placeholder="Buscar colaborador..."
                value={buscarUsuario}
                onChange={e => setBuscarUsuario(e.target.value)}
                className="h-8 text-sm"
              />

              <ScrollArea className="h-48 border rounded-md p-2">
                {usuariosFiltradosBusca.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum colaborador encontrado</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {usuariosFiltradosBusca.map(u => (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => {
                          setUsuariosSelecionados(prev =>
                            prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                          );
                        }}
                      >
                        <Checkbox checked={usuariosSelecionados.includes(u.id)} onCheckedChange={() => {}} />
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{iniciais(u.nome_completo)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{u.nome_completo}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {usuariosSelecionados.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {usuariosSelecionados.length} colaborador(es) selecionado(s)
                </p>
              )}

              <div className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Os colaboradores selecionados poderão visualizar este evento na agenda deles. O evento ficará com visibilidade "Compartilhado".</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCompartilhar(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarCompartilhamento} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
