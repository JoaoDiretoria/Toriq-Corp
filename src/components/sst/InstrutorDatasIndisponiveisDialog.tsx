import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { 
  Loader2, 
  Trash2,
  CalendarX,
  CalendarCheck,
  AlertTriangle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InstrutorDatasIndisponiveisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instrutor: {
    id: string;
    nome: string;
  } | null;
  onSuccess?: () => void;
}

interface DataIndisponivel {
  id: string;
  instrutor_id: string;
  data: string;
  motivo: string | null;
  created_at: string;
}

interface TurmaAgendada {
  id: string;
  codigo_turma: string | null;
  cliente_nome: string;
  treinamento_nome: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
}

export function InstrutorDatasIndisponiveisDialog({
  open,
  onOpenChange,
  instrutor,
  onSuccess,
}: InstrutorDatasIndisponiveisDialogProps) {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  
  // Estados para cadastro
  const [datasSelecionadas, setDatasSelecionadas] = useState<Date[]>([]);
  const [motivo, setMotivo] = useState('');
  
  // Estados para lista
  const [datasIndisponiveis, setDatasIndisponiveis] = useState<DataIndisponivel[]>([]);
  
  // Estados para turmas agendadas
  const [turmasAgendadas, setTurmasAgendadas] = useState<TurmaAgendada[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && instrutor) {
      // Reset estados ao abrir
      setDatasSelecionadas([]);
      setMotivo('');
      setActiveTab('geral');
      
      // Definir filtro padrão como mês atual
      const hoje = new Date();
      setFiltroInicio(format(startOfMonth(hoje), 'yyyy-MM-dd'));
      setFiltroFim(format(endOfMonth(hoje), 'yyyy-MM-dd'));
      
      fetchDatasIndisponiveis();
      fetchTurmasAgendadas();
    }
  }, [open, instrutor]);

  useEffect(() => {
    if (open && instrutor && filtroInicio && filtroFim) {
      fetchDatasIndisponiveis();
      fetchTurmasAgendadas();
    }
  }, [filtroInicio, filtroFim]);

  const fetchDatasIndisponiveis = async () => {
    if (!instrutor) return;

    setLoading(true);
    try {
      let query = (supabase as any)
        .from('instrutor_datas_indisponiveis')
        .select('*')
        .eq('instrutor_id', instrutor.id)
        .order('data', { ascending: true });

      if (filtroInicio) {
        query = query.gte('data', filtroInicio);
      }
      if (filtroFim) {
        query = query.lte('data', filtroFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDatasIndisponiveis(data || []);
    } catch (error) {
      console.error('Erro ao buscar datas indisponíveis:', error);
      toast.error('Erro ao carregar datas indisponíveis');
    } finally {
      setLoading(false);
    }
  };

  const handleCadastrar = async () => {
    if (!instrutor || datasSelecionadas.length === 0) {
      toast.error('Selecione pelo menos uma data');
      return;
    }

    setSaving(true);
    try {
      // Preparar array de inserções
      const insercoes = datasSelecionadas.map(data => ({
        instrutor_id: instrutor.id,
        data: format(data, 'yyyy-MM-dd'),
        motivo: motivo.trim() || null,
      }));

      const { error } = await (supabase as any)
        .from('instrutor_datas_indisponiveis')
        .insert(insercoes);

      if (error) {
        if (error.code === '23505') {
          toast.error('Uma ou mais datas já estão cadastradas como indisponíveis');
        } else {
          throw error;
        }
        return;
      }

      const qtd = datasSelecionadas.length;
      toast.success(`${qtd} data${qtd > 1 ? 's' : ''} indisponível${qtd > 1 ? 'is' : ''} cadastrada${qtd > 1 ? 's' : ''} com sucesso!`);
      setDatasSelecionadas([]);
      setMotivo('');
      fetchDatasIndisponiveis();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao cadastrar data indisponível:', error);
      toast.error('Erro ao cadastrar datas indisponíveis');
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await (supabase as any)
        .from('instrutor_datas_indisponiveis')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Data excluída com sucesso!');
      fetchDatasIndisponiveis();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao excluir data:', error);
      toast.error('Erro ao excluir data');
    } finally {
      setDeletingId(null);
    }
  };

  const fetchTurmasAgendadas = async () => {
    if (!instrutor) return;

    setLoadingTurmas(true);
    try {
      // Buscar turmas onde o instrutor está alocado
      const { data: turmasData, error } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          codigo_turma,
          status,
          cliente:clientes_sst!turmas_treinamento_cliente_id_fkey(nome),
          treinamento:catalogo_treinamentos!turmas_treinamento_treinamento_id_fkey(nome),
          aulas:turmas_treinamento_aulas(data, hora_inicio, hora_fim)
        `)
        .eq('instrutor_id', instrutor.id)
        .neq('status', 'concluido')
        .neq('status', 'cancelado');

      if (error) throw error;

      // Transformar em lista de datas com turmas
      const turmasComDatas: TurmaAgendada[] = [];
      
      (turmasData || []).forEach((turma: any) => {
        const aulas = turma.aulas || [];
        aulas.forEach((aula: any) => {
          // Filtrar por período se definido
          if (filtroInicio && aula.data < filtroInicio) return;
          if (filtroFim && aula.data > filtroFim) return;
          
          turmasComDatas.push({
            id: turma.id,
            codigo_turma: turma.codigo_turma,
            cliente_nome: turma.cliente?.nome || 'Cliente não informado',
            treinamento_nome: turma.treinamento?.nome || 'Treinamento não informado',
            data: aula.data,
            hora_inicio: aula.hora_inicio || '',
            hora_fim: aula.hora_fim || '',
            status: turma.status
          });
        });
      });

      // Ordenar por data
      turmasComDatas.sort((a, b) => a.data.localeCompare(b.data));
      
      setTurmasAgendadas(turmasComDatas);
    } catch (error) {
      console.error('Erro ao buscar turmas agendadas:', error);
    } finally {
      setLoadingTurmas(false);
    }
  };

  const formatarData = (dataStr: string) => {
    try {
      const data = new Date(dataStr + 'T00:00:00');
      return format(data, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dataStr;
    }
  };

  const formatarHora = (hora: string) => {
    if (!hora) return '';
    return hora.substring(0, 5);
  };

  // Verificar se uma data tem conflito (instrutor já alocado em turma)
  const datasOcupadas = turmasAgendadas.map(t => t.data);

  if (!instrutor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX className="h-5 w-5" />
            Cadastrar data não disponível
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Instrutor: <span className="font-medium">{instrutor.nome}</span>
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="geral" className="flex items-center gap-2">
              Geral
            </TabsTrigger>
            <TabsTrigger value="lista" className="flex items-center gap-2">
              Indisponíveis ({datasIndisponiveis.length})
            </TabsTrigger>
            <TabsTrigger value="turmas" className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Turmas ({turmasAgendadas.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab Geral - Cadastrar */}
          <TabsContent value="geral" className="mt-4">
            <div className="space-y-4">
              {/* Aviso sobre datas ocupadas */}
              {datasOcupadas.length > 0 && (
                <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CalendarCheck className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-success">
                      <p className="font-medium">Datas com turmas agendadas</p>
                      <p className="text-success/80">As datas marcadas em verde no calendário já possuem turmas. O instrutor não pode ser atribuído a outra turma nesses dias.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Selecione as datas (clique para selecionar múltiplas)</Label>
                <div className="border rounded-md p-2 flex justify-center">
                  <Calendar
                    mode="multiple"
                    selected={datasSelecionadas}
                    onSelect={(dates) => setDatasSelecionadas(dates || [])}
                    locale={ptBR}
                    className="rounded-md"
                    modifiers={{
                      ocupada: datasOcupadas.map(d => new Date(d + 'T00:00:00'))
                    }}
                    modifiersStyles={{
                      ocupada: {
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        fontWeight: 'bold',
                        border: '2px solid #22c55e'
                      }
                    }}
                  />
                </div>
                {datasSelecionadas.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {datasSelecionadas.length} data{datasSelecionadas.length > 1 ? 's' : ''} selecionada{datasSelecionadas.length > 1 ? 's' : ''}:
                    <div className="flex flex-wrap gap-1 mt-1">
                      {datasSelecionadas
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map((data, idx) => (
                          <span key={idx} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                            {format(data, 'dd/MM/yyyy')}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo (aplicado a todas as datas)</Label>
                <Textarea
                  id="motivo"
                  placeholder="Informe o motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                onClick={handleCadastrar}
                disabled={saving || datasSelecionadas.length === 0}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Cadastrando...
                  </>
                ) : (
                  `Cadastrar ${datasSelecionadas.length > 0 ? datasSelecionadas.length : ''} Indisponibilidade${datasSelecionadas.length > 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Tab Lista */}
          <TabsContent value="lista" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione um período para filtrar a lista</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={filtroInicio}
                    onChange={(e) => setFiltroInicio(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input
                    type="date"
                    value={filtroFim}
                    onChange={(e) => setFiltroFim(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="bg-muted/50 px-3 py-2 border-b">
                  <span className="text-sm font-medium">Datas não disponíveis</span>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : datasIndisponiveis.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Nenhuma data indisponível cadastrada neste período
                  </div>
                ) : (
                  <div className="divide-y max-h-60 overflow-y-auto">
                    {datasIndisponiveis.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {formatarData(item.data)}
                          </div>
                          {item.motivo && (
                            <div className="text-xs text-muted-foreground">
                              {item.motivo}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExcluir(item.id)}
                          disabled={deletingId === item.id}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab Turmas Agendadas */}
          <TabsContent value="turmas" className="mt-4">
            <div className="space-y-4">
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-warning">
                    <p className="font-medium">Atenção: Conflito de agenda</p>
                    <p className="text-warning/80">O instrutor não pode ser atribuído a mais de uma turma no mesmo dia. As datas abaixo já estão ocupadas.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Período de visualização</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={filtroInicio}
                    onChange={(e) => setFiltroInicio(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input
                    type="date"
                    value={filtroFim}
                    onChange={(e) => setFiltroFim(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="bg-success/5 px-3 py-2 border-b">
                  <span className="text-sm font-medium text-success">Turmas agendadas (datas ocupadas)</span>
                </div>
                
                {loadingTurmas ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : turmasAgendadas.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Nenhuma turma agendada neste período
                  </div>
                ) : (
                  <div className="divide-y max-h-60 overflow-y-auto">
                    {turmasAgendadas.map((turma, idx) => (
                      <div key={`${turma.id}-${turma.data}-${idx}`} className="px-3 py-2 hover:bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm text-success">
                            {formatarData(turma.data)}
                            {turma.hora_inicio && (
                              <span className="text-muted-foreground font-normal ml-2">
                                {formatarHora(turma.hora_inicio)} - {formatarHora(turma.hora_fim)}
                              </span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            turma.status === 'agendado' ? 'bg-primary/10 text-primary' :
                            turma.status === 'em_andamento' ? 'bg-warning/10 text-warning' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {turma.status === 'agendado' ? 'Agendado' :
                             turma.status === 'em_andamento' ? 'Em andamento' :
                             turma.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">{turma.codigo_turma || 'Turma'}</span>
                          <span className="mx-1">•</span>
                          <span>{turma.treinamento_nome}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cliente: {turma.cliente_nome}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-start mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
