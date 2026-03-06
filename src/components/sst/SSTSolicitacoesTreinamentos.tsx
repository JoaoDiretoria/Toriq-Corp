import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Clock, CheckCircle2, XCircle, Calendar, Building2, FileText, Users, BarChart3 } from 'lucide-react';

interface AulaAgendada {
  id: string;
  data: string;
  inicio: string;
  fim: string;
  horas: number;
}

interface SolicitacaoTreinamento {
  id: string;
  numero_solicitacao: number;
  nr_treinamento: string;
  nome_treinamento: string;
  datas_treinamento: string;
  data_treinamento_raw: string | null;
  solicitante_empresa_nome: string;
  solicitante_empresa_id: string;
  cliente_sst_id: string | null;
  treinamento_id: string;
  tipo: string | null;
  quantidade_participantes: number;
  observacoes: string | null;
  status: 'pendente' | 'aceito' | 'recusado';
  created_at: string;
  aulas: AulaAgendada[];
}

export function SSTSolicitacoesTreinamentos() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoTreinamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<SolicitacaoTreinamento | null>(null);
  const [processando, setProcessando] = useState(false);
  const [mostrarMotivoRecusa, setMostrarMotivoRecusa] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  useEffect(() => {
    fetchSolicitacoes();
  }, [empresaId]);

  const fetchSolicitacoes = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      // Buscar solicitações usando RPC (evita problema de URL muito longa com muitos IDs)
      const { data: solicitacoesData, error: solicitacoesError } = await (supabase as any)
        .rpc('get_solicitacoes_treinamento_clientes', { p_empresa_sst_id: empresaId });

      if (solicitacoesError) throw solicitacoesError;

      const solicitacoesArray = solicitacoesData || [];

      // Buscar datas/aulas de todas as solicitações
      const solicitacaoIds = solicitacoesArray.map((s: any) => s.id);
      let datasAulas: any[] = [];
      
      if (solicitacaoIds.length > 0) {
        const { data } = await (supabase as any)
          .from('solicitacoes_treinamento_datas')
          .select('*')
          .in('solicitacao_id', solicitacaoIds)
          .order('data', { ascending: true });
        datasAulas = data || [];
      }

      // Agrupar aulas por solicitação
      const aulasMap = new Map<string, AulaAgendada[]>();
      (datasAulas || []).forEach((aula: any) => {
        const aulas = aulasMap.get(aula.solicitacao_id) || [];
        aulas.push({
          id: aula.id,
          data: aula.data,
          inicio: aula.inicio || '08:00',
          fim: aula.fim || '17:00',
          horas: aula.horas || 8,
        });
        aulasMap.set(aula.solicitacao_id, aulas);
      });

      // Função para formatar datas conforme regra
      const formatarDatas = (aulas: AulaAgendada[], dataFallback: string | null): string => {
        if (aulas.length === 0) {
          return dataFallback 
            ? new Date(dataFallback + 'T00:00:00').toLocaleDateString('pt-BR')
            : '-';
        }

        const datasOrdenadas = aulas
          .map(a => new Date(a.data + 'T00:00:00'))
          .sort((a, b) => a.getTime() - b.getTime());

        if (datasOrdenadas.length === 1) {
          // 1 dia: dd/mm/aaaa
          return datasOrdenadas[0].toLocaleDateString('pt-BR');
        } else if (datasOrdenadas.length === 2) {
          // 2 dias: Dia dd e dd/mm/aaaa
          const dia1 = datasOrdenadas[0].getDate().toString().padStart(2, '0');
          const dia2 = datasOrdenadas[1].toLocaleDateString('pt-BR');
          return `Dia ${dia1} e ${dia2}`;
        } else {
          // 3+ dias: De dd/mm/aaaa à dd/mm/aaaa
          const primeiraData = datasOrdenadas[0].toLocaleDateString('pt-BR');
          const ultimaData = datasOrdenadas[datasOrdenadas.length - 1].toLocaleDateString('pt-BR');
          return `De ${primeiraData} à ${ultimaData}`;
        }
      };

      const solicitacoesFormatadas: SolicitacaoTreinamento[] = solicitacoesArray.map((s: any) => {
        const aulas = aulasMap.get(s.id) || [];
        return {
          id: s.id,
          numero_solicitacao: s.numero,
          nr_treinamento: `NR-${s.treinamento_norma || ''}`,
          nome_treinamento: s.treinamento_nome || '',
          datas_treinamento: formatarDatas(aulas, s.data_treinamento),
          data_treinamento_raw: s.data_treinamento,
          solicitante_empresa_nome: s.empresa_nome || '',
          solicitante_empresa_id: s.empresa_id,
          cliente_sst_id: s.cliente_sst_id || null,
          treinamento_id: s.treinamento_id,
          tipo: s.tipo,
          quantidade_participantes: 1,
          observacoes: s.observacoes,
          status: s.status === 'enviado' ? 'pendente' : s.status,
          created_at: s.created_at,
          aulas,
        };
      });

      setSolicitacoes(solicitacoesFormatadas);
    } catch (error: any) {
      console.error('Erro ao carregar solicitações:', error);
      toast({
        title: "Erro ao carregar solicitações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (solicitacao: SolicitacaoTreinamento) => {
    setSelectedSolicitacao(solicitacao);
    setMostrarMotivoRecusa(false);
    setMotivoRecusa('');
    setDialogOpen(true);
  };

  const handleAceitar = async () => {
    if (!selectedSolicitacao || !empresaId) return;

    setProcessando(true);
    try {
      // 1. Atualizar status da solicitação
      const { error: updateError } = await supabase
        .from('solicitacoes_treinamento')
        .update({ status: 'aceito' })
        .eq('id', selectedSolicitacao.id);

      if (updateError) throw updateError;

      // 2. Buscar próximo número de turma
      const { data: ultimaTurma } = await supabase
        .from('turmas_treinamento')
        .select('numero_turma')
        .eq('empresa_id', empresaId)
        .order('numero_turma', { ascending: false })
        .limit(1)
        .single();

      const proximoNumeroTurma = (ultimaTurma?.numero_turma || 0) + 1;

      // 3. Buscar carga horária do treinamento
      const { data: treinamentoData } = await supabase
        .from('catalogo_treinamentos')
        .select('ch_formacao, ch_reciclagem')
        .eq('id', selectedSolicitacao.treinamento_id)
        .single();

      // Mapear tipo para valores aceitos pelo banco
      const tipoMap: Record<string, string> = {
        'inicial': 'Inicial',
        'formacao': 'Inicial',
        'periodico': 'Periódico',
        'reciclagem': 'Periódico',
        'eventual': 'Eventual',
      };
      const tipoTreinamento = tipoMap[selectedSolicitacao.tipo?.toLowerCase() || ''] || 'Inicial';

      const cargaHoraria = selectedSolicitacao.tipo?.toLowerCase() === 'reciclagem' || selectedSolicitacao.tipo?.toLowerCase() === 'periodico'
        ? (treinamentoData?.ch_reciclagem || 0)
        : (treinamentoData?.ch_formacao || 0);

      // 4. Criar turma na agenda de treinamentos
      if (selectedSolicitacao.cliente_sst_id) {
        const { data: novaTurma, error: turmaError } = await supabase
          .from('turmas_treinamento')
          .insert({
            empresa_id: empresaId,
            numero_turma: proximoNumeroTurma,
            cliente_id: selectedSolicitacao.cliente_sst_id,
            treinamento_id: selectedSolicitacao.treinamento_id,
            tipo_treinamento: tipoTreinamento,
            carga_horaria_total: cargaHoraria,
            quantidade_participantes: selectedSolicitacao.quantidade_participantes,
            status: 'agendado',
            observacoes: selectedSolicitacao.observacoes,
          })
          .select()
          .single();

        if (turmaError) throw turmaError;

        // 5. Criar aulas para a turma
        if (novaTurma) {
          if (selectedSolicitacao.aulas.length > 0) {
            // Usar as aulas do cronograma
            const aulasParaInserir = selectedSolicitacao.aulas.map(aula => ({
              turma_id: novaTurma.id,
              data: aula.data,
              hora_inicio: aula.inicio,
              hora_fim: aula.fim,
              horas: aula.horas,
            }));
            await supabase
              .from('turmas_treinamento_aulas')
              .insert(aulasParaInserir);
          } else if (selectedSolicitacao.data_treinamento_raw) {
            // Fallback para data única
            await supabase
              .from('turmas_treinamento_aulas')
              .insert({
                turma_id: novaTurma.id,
                data: selectedSolicitacao.data_treinamento_raw,
                hora_inicio: '08:00',
                hora_fim: '17:00',
              });
          }

          // 6. Buscar todas as solicitações aceitas com o mesmo treinamento e cliente para adicionar colaboradores
          const { data: solicitacoesAceitas } = await supabase
            .from('solicitacoes_treinamento')
            .select('colaborador_id')
            .eq('treinamento_id', selectedSolicitacao.treinamento_id)
            .eq('empresa_id', selectedSolicitacao.solicitante_empresa_id)
            .eq('status', 'aceito')
            .not('colaborador_id', 'is', null);

          // Adicionar colaboradores à turma
          if (solicitacoesAceitas && solicitacoesAceitas.length > 0) {
            const colaboradoresUnicos = [...new Set(solicitacoesAceitas.map(s => s.colaborador_id))];
            
            for (const colaboradorId of colaboradoresUnicos) {
              // Adicionar à turma
              await (supabase as any)
                .from('turma_colaboradores')
                .insert({
                  turma_id: novaTurma.id,
                  colaborador_id: colaboradorId,
                  presente: false,
                  reorientado: false
                });

              // Adicionar treinamento ao colaborador se ainda não tiver
              const { data: existingTreinamento } = await (supabase as any)
                .from('colaboradores_treinamentos')
                .select('id')
                .eq('colaborador_id', colaboradorId)
                .eq('treinamento_id', selectedSolicitacao.treinamento_id)
                .single();

              if (!existingTreinamento) {
                await (supabase as any)
                  .from('colaboradores_treinamentos')
                  .insert({
                    colaborador_id: colaboradorId,
                    treinamento_id: selectedSolicitacao.treinamento_id,
                    status: 'pendente'
                  });
              }
            }
          }
        }
      }

      setSolicitacoes(prev => 
        prev.map(s => 
          s.id === selectedSolicitacao.id 
            ? { ...s, status: 'aceito' as const }
            : s
        )
      );

      toast({
        title: "Solicitação aceita!",
        description: `O treinamento "${selectedSolicitacao.nome_treinamento}" foi aceito e adicionado à agenda.`,
      });

      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao aceitar solicitação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  const handleRecusar = async () => {
    if (!selectedSolicitacao) return;

    // Se ainda não mostrou o campo de motivo, mostrar primeiro
    if (!mostrarMotivoRecusa) {
      setMostrarMotivoRecusa(true);
      return;
    }

    // Validar se o motivo foi preenchido
    if (!motivoRecusa.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o motivo da recusa.",
        variant: "destructive",
      });
      return;
    }

    setProcessando(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_treinamento')
        .update({ 
          status: 'recusado',
          observacoes: motivoRecusa 
        })
        .eq('id', selectedSolicitacao.id);

      if (error) throw error;

      setSolicitacoes(prev => 
        prev.map(s => 
          s.id === selectedSolicitacao.id 
            ? { ...s, status: 'recusado' as const }
            : s
        )
      );

      toast({
        title: "Solicitação recusada",
        description: `O treinamento "${selectedSolicitacao.nome_treinamento}" foi recusado.`,
        variant: "destructive",
      });

      setDialogOpen(false);
      setMostrarMotivoRecusa(false);
      setMotivoRecusa('');
    } catch (error: any) {
      toast({
        title: "Erro ao recusar solicitação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'aceito':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aceito
          </Badge>
        );
      case 'recusado':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Recusado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const solicitacoesPendentes = solicitacoes.filter(s => s.status === 'pendente');
  const solicitacoesAceitas = solicitacoes.filter(s => s.status === 'aceito');
  const solicitacoesRecusadas = solicitacoes.filter(s => s.status === 'recusado');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Solicitações de Treinamentos</h1>
          <p className="text-muted-foreground">
            Gerencie as demandas de treinamentos das empresas clientes
          </p>
        </div>
        {solicitacoesPendentes.length > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {solicitacoesPendentes.length} pendente{solicitacoesPendentes.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Dashboard de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Solicitações</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{solicitacoes.length}</div>
            <p className="text-xs text-muted-foreground">Todas as solicitações</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aceitas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{solicitacoesAceitas.length}</div>
            <p className="text-xs text-muted-foreground">Solicitações aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recusadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{solicitacoesRecusadas.length}</div>
            <p className="text-xs text-muted-foreground">Solicitações recusadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{solicitacoesPendentes.length}</div>
            <p className="text-xs text-muted-foreground">Aguardando análise</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Lista de Solicitações</CardTitle>
              <CardDescription>
                Solicitações recebidas de empresas com gestão de treinamentos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {solicitacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mb-4" />
              <p>Nenhuma solicitação de treinamento encontrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Nº Solicitação</TableHead>
                  <TableHead>NR e Treinamento</TableHead>
                  <TableHead>Datas do Treinamento</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead className="text-center">Solicitação de Treinamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoes.map((solicitacao) => (
                  <TableRow key={solicitacao.id}>
                    <TableCell className="font-medium">
                      #{solicitacao.numero_solicitacao.toString().padStart(4, '0')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{solicitacao.nr_treinamento}</p>
                        <p className="text-sm text-muted-foreground">{solicitacao.nome_treinamento}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{solicitacao.datas_treinamento}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{solicitacao.solicitante_empresa_nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {solicitacao.status === 'pendente' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                          onClick={() => handleOpenDetails(solicitacao)}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Pendente
                        </Button>
                      ) : (
                        getStatusBadge(solicitacao.status)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes da Solicitação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Detalhes da Solicitação #{selectedSolicitacao?.numero_solicitacao.toString().padStart(4, '0')}
            </DialogTitle>
            <DialogDescription>
              Analise as informações e decida se aceita ou não o treinamento
            </DialogDescription>
          </DialogHeader>
          
          {selectedSolicitacao && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">NR</Label>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedSolicitacao.nr_treinamento}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Participantes</Label>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedSolicitacao.quantidade_participantes}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Treinamento</Label>
                <div className="p-2 bg-muted rounded-md">
                  <span className="font-medium">{selectedSolicitacao.nome_treinamento}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Datas Solicitadas</Label>
                {selectedSolicitacao.aulas.length > 0 ? (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {selectedSolicitacao.aulas
                      .sort((a, b) => a.data.localeCompare(b.data))
                      .map((aula) => (
                        <div key={aula.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {new Date(aula.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{aula.inicio} - {aula.fim}</span>
                            <Badge variant="secondary" className="text-xs">
                              {aula.horas}h
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedSolicitacao.datas_treinamento}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Empresa Solicitante</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedSolicitacao.solicitante_empresa_nome}</span>
                </div>
              </div>

              {selectedSolicitacao.observacoes && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Observações</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">{selectedSolicitacao.observacoes}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Data da Solicitação</Label>
                <div className="p-2 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedSolicitacao.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {mostrarMotivoRecusa && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="motivo-recusa" className="text-sm font-medium text-red-600">
                Motivo da Recusa *
              </Label>
              <Textarea
                id="motivo-recusa"
                placeholder="Informe o motivo da recusa da solicitação..."
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={3}
                className="border-red-200 focus:border-red-400"
              />
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setMostrarMotivoRecusa(false);
                setMotivoRecusa('');
              }}
              disabled={processando}
            >
              Sair
            </Button>
            <Button
              variant="destructive"
              onClick={handleRecusar}
              disabled={processando}
            >
              <XCircle className="h-4 w-4 mr-1" />
              {processando ? 'Processando...' : 'Recusar'}
            </Button>
            {!mostrarMotivoRecusa && (
              <Button
                onClick={handleAceitar}
                disabled={processando}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {processando ? 'Processando...' : 'Aceitar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
