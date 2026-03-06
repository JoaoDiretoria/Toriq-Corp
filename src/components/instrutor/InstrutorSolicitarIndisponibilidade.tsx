import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CalendarX, 
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Send,
  Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Indisponibilidade {
  id: string;
  data: string;
  motivo: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  origem: 'admin' | 'instrutor';
  motivo_rejeicao: string | null;
  created_at: string;
}

const db = supabase as any;

export function InstrutorSolicitarIndisponibilidade() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [instrutorId, setInstrutorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('solicitar');
  
  // Solicitações
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState<Indisponibilidade[]>([]);
  const [minhasIndisponibilidades, setMinhasIndisponibilidades] = useState<Indisponibilidade[]>([]);
  
  // Formulário
  const [datasSelecionadas, setDatasSelecionadas] = useState<Date[]>([]);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  
  // Dialog cancelar
  const [dialogCancelarOpen, setDialogCancelarOpen] = useState(false);
  const [solicitacaoCancelar, setSolicitacaoCancelar] = useState<Indisponibilidade | null>(null);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    fetchInstrutorId();
  }, [profile]);

  useEffect(() => {
    if (instrutorId) {
      fetchMinhasSolicitacoes();
    }
  }, [instrutorId]);

  const fetchInstrutorId = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('instrutores')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setInstrutorId(data.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao buscar instrutor:', error);
      setLoading(false);
    }
  };

  const fetchMinhasSolicitacoes = async () => {
    if (!instrutorId) return;

    try {
      setLoading(true);

      // Buscar solicitações pendentes
      const { data: pendentes, error: errorPendentes } = await db
        .from('instrutor_datas_indisponiveis')
        .select('*')
        .eq('instrutor_id', instrutorId)
        .eq('status', 'pendente')
        .order('data', { ascending: true });

      if (errorPendentes) throw errorPendentes;

      // Buscar indisponibilidades aprovadas
      const { data: aprovadas, error: errorAprovadas } = await db
        .from('instrutor_datas_indisponiveis')
        .select('*')
        .eq('instrutor_id', instrutorId)
        .eq('status', 'aprovado')
        .gte('data', format(new Date(), 'yyyy-MM-dd'))
        .order('data', { ascending: true });

      if (errorAprovadas) throw errorAprovadas;

      // Buscar rejeitadas recentes (últimos 30 dias)
      const { data: rejeitadas, error: errorRejeitadas } = await db
        .from('instrutor_datas_indisponiveis')
        .select('*')
        .eq('instrutor_id', instrutorId)
        .eq('status', 'rejeitado')
        .order('created_at', { ascending: false })
        .limit(10);

      if (errorRejeitadas) throw errorRejeitadas;

      setMinhasSolicitacoes([...(pendentes || []), ...(rejeitadas || [])]);
      setMinhasIndisponibilidades(aprovadas || []);

    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarIndisponibilidade = async () => {
    if (!instrutorId || datasSelecionadas.length === 0) {
      toast.error('Selecione pelo menos uma data');
      return;
    }

    setSalvando(true);
    try {
      const insercoes = datasSelecionadas.map(data => ({
        instrutor_id: instrutorId,
        data: format(data, 'yyyy-MM-dd'),
        motivo: motivo.trim() || null,
        status: 'pendente',
        origem: 'instrutor',
        solicitado_por: profile?.id
      }));

      const { error } = await db
        .from('instrutor_datas_indisponiveis')
        .insert(insercoes);

      if (error) {
        if (error.code === '23505') {
          toast.error('Uma ou mais datas já foram solicitadas ou estão indisponíveis');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Solicitação enviada para ${datasSelecionadas.length} data(s)! Aguarde aprovação.`);
      setDatasSelecionadas([]);
      setMotivo('');
      fetchMinhasSolicitacoes();
    } catch (error) {
      console.error('Erro ao solicitar indisponibilidade:', error);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelarSolicitacao = async () => {
    if (!solicitacaoCancelar) return;

    setProcessando(true);
    try {
      const { error } = await db
        .from('instrutor_datas_indisponiveis')
        .delete()
        .eq('id', solicitacaoCancelar.id);

      if (error) throw error;

      toast.success('Solicitação cancelada');
      setDialogCancelarOpen(false);
      setSolicitacaoCancelar(null);
      fetchMinhasSolicitacoes();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao cancelar solicitação');
    } finally {
      setProcessando(false);
    }
  };

  const formatarData = (dataStr: string) => {
    try {
      return format(parseISO(dataStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dataStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Aguardando</Badge>;
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Datas já indisponíveis ou pendentes (para marcar no calendário)
  const datasOcupadas = [
    ...minhasIndisponibilidades.map(i => i.data),
    ...minhasSolicitacoes.filter(s => s.status === 'pendente').map(s => s.data)
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!instrutorId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Perfil não encontrado</h3>
          <p className="text-muted-foreground">
            Não foi possível identificar seu perfil de instrutor.
          </p>
        </div>
      </div>
    );
  }

  const solicitacoesPendentes = minhasSolicitacoes.filter(s => s.status === 'pendente');
  const solicitacoesRejeitadas = minhasSolicitacoes.filter(s => s.status === 'rejeitado');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarX className="h-6 w-6 text-warning" />
          Solicitar Indisponibilidade
        </h1>
        <p className="text-muted-foreground">
          Solicite dias de folga ou indisponibilidade para sua agenda
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warning">Aguardando Aprovação</p>
                <p className="text-2xl font-bold text-warning">{solicitacoesPendentes.length}</p>
              </div>
              <Clock className="h-8 w-8 text-warning/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-success">Dias Indisponíveis</p>
                <p className="text-2xl font-bold text-success">{minhasIndisponibilidades.length}</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-success/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-destructive">Rejeitadas</p>
                <p className="text-2xl font-bold text-destructive">{solicitacoesRejeitadas.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="solicitar" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Solicitação
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Minhas Solicitações
            {solicitacoesPendentes.length > 0 && (
              <Badge variant="secondary" className="ml-1">{solicitacoesPendentes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="aprovadas" className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Indisponibilidades
          </TabsTrigger>
        </TabsList>

        {/* Tab Nova Solicitação */}
        <TabsContent value="solicitar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Solicitar Indisponibilidade</CardTitle>
              <CardDescription>
                Selecione as datas em que você não estará disponível. A solicitação será enviada para aprovação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aviso */}
              <div className="bg-info/5 border border-info/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-info">
                    <p className="font-medium">Como funciona?</p>
                    <p className="text-info/80">
                      Após enviar a solicitação, ela será analisada pela empresa. 
                      Você receberá uma notificação quando for aprovada ou rejeitada.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Selecione as datas (clique para selecionar múltiplas)</Label>
                <div className="border rounded-md p-2 flex justify-center">
                  <Calendar
                    mode="multiple"
                    selected={datasSelecionadas}
                    onSelect={(dates) => setDatasSelecionadas(dates || [])}
                    locale={ptBR}
                    className="rounded-md"
                    disabled={(date) => date < new Date()}
                    modifiers={{
                      ocupada: datasOcupadas.map(d => new Date(d + 'T00:00:00'))
                    }}
                    modifiersStyles={{
                      ocupada: {
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        fontWeight: 'bold'
                      }
                    }}
                  />
                </div>
                {datasSelecionadas.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {datasSelecionadas.length} data(s) selecionada(s):
                    <div className="flex flex-wrap gap-1 mt-1">
                      {datasSelecionadas
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map((data, idx) => (
                          <span key={idx} className="bg-warning/10 text-warning px-2 py-0.5 rounded text-xs">
                            {format(data, 'dd/MM/yyyy')}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo (opcional)</Label>
                <Textarea
                  id="motivo"
                  placeholder="Informe o motivo da indisponibilidade (ex: consulta médica, compromisso pessoal)"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                onClick={handleSolicitarIndisponibilidade}
                disabled={salvando || datasSelecionadas.length === 0}
                className="w-full"
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Solicitação
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Minhas Solicitações */}
        <TabsContent value="pendentes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Minhas Solicitações</CardTitle>
            </CardHeader>
            <CardContent>
              {minhasSolicitacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-10 w-10 mb-2 opacity-50" />
                  <p>Nenhuma solicitação encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {minhasSolicitacoes.map((solicitacao) => (
                    <div 
                      key={solicitacao.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatarData(solicitacao.data)}</span>
                          {getStatusBadge(solicitacao.status)}
                        </div>
                        {solicitacao.motivo && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {solicitacao.motivo}
                          </div>
                        )}
                        {solicitacao.status === 'rejeitado' && solicitacao.motivo_rejeicao && (
                          <div className="text-sm text-red-600 mt-1">
                            <span className="font-medium">Motivo da rejeição:</span> {solicitacao.motivo_rejeicao}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Solicitado em {format(parseISO(solicitacao.created_at), "dd/MM/yyyy 'às' HH:mm")}
                        </div>
                      </div>
                      {solicitacao.status === 'pendente' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSolicitacaoCancelar(solicitacao);
                            setDialogCancelarOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Indisponibilidades Aprovadas */}
        <TabsContent value="aprovadas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Minhas Indisponibilidades</CardTitle>
              <CardDescription>
                Datas em que você está marcado como indisponível
              </CardDescription>
            </CardHeader>
            <CardContent>
              {minhasIndisponibilidades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CalendarCheck className="h-10 w-10 mb-2 opacity-50" />
                  <p>Nenhuma indisponibilidade cadastrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {minhasIndisponibilidades.map((ind) => (
                    <div 
                      key={ind.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-green-600">
                            {format(parseISO(ind.data), 'dd', { locale: ptBR })}
                          </span>
                          <span className="text-[10px] text-green-500 uppercase">
                            {format(parseISO(ind.data), 'MMM', { locale: ptBR })}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{formatarData(ind.data)}</div>
                          {ind.motivo && (
                            <div className="text-xs text-muted-foreground">{ind.motivo}</div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        ind.origem === 'admin' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }>
                        {ind.origem === 'admin' ? 'Empresa' : 'Solicitação'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Cancelar */}
      <AlertDialog open={dialogCancelarOpen} onOpenChange={setDialogCancelarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta solicitação de indisponibilidade?
              {solicitacaoCancelar && (
                <div className="mt-2 p-3 bg-muted rounded">
                  <div className="font-medium">{formatarData(solicitacaoCancelar.data)}</div>
                  {solicitacaoCancelar.motivo && (
                    <div className="text-sm">{solicitacaoCancelar.motivo}</div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelarSolicitacao}
              className="bg-red-600 hover:bg-red-700"
              disabled={processando}
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancelar Solicitação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
