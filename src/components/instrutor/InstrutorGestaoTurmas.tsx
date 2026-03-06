import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  GraduationCap, 
  Loader2, 
  Search, 
  Calendar, 
  Building2, 
  CheckCircle, 
  Clock, 
  PlayCircle,
  XCircle,
  FileCheck
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface TurmaValidada {
  id: string;
  numero_turma: number;
  codigo_turma: string | null;
  cliente_nome: string;
  cliente_id: string;
  treinamento_nome: string;
  treinamento_id: string;
  tipo_treinamento: string;
  data_inicio: string;
  data_fim: string;
  quantidade_participantes: number;
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
  validado: boolean;
  tem_gestao: boolean;
}

const db = supabase as any;

export function InstrutorGestaoTurmas() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [turmas, setTurmas] = useState<TurmaValidada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [instrutorId, setInstrutorId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchTurmasValidadas();
    }
  }, [profile]);

  const fetchTurmasValidadas = async () => {
    if (!profile) return;
    
    try {
      console.log('[InstrutorGestaoTurmas] Buscando turmas para user_id:', profile.id);
      
      // Usar função RPC que bypassa RLS
      const { data, error } = await db
        .rpc('get_turmas_instrutor', { p_user_id: profile.id });

      console.log('[InstrutorGestaoTurmas] Resultado RPC:', { data, error });

      if (error) throw error;

      // Filtrar apenas turmas validadas e buscar aulas
      const turmasFormatadas: TurmaValidada[] = [];
      
      for (const t of (data || []).filter((turma: any) => turma.validado)) {
        // Buscar aulas
        const { data: aulasData } = await db
          .from('turmas_treinamento_aulas')
          .select('data, hora_inicio, hora_fim')
          .eq('turma_id', t.id)
          .order('data');
        
        const aulas = aulasData || [];
        const datasOrdenadas = aulas.map((a: any) => a.data).sort();
        const dataInicio = datasOrdenadas[0] || '';
        const dataFim = datasOrdenadas[datasOrdenadas.length - 1] || dataInicio;

        turmasFormatadas.push({
          id: t.id,
          numero_turma: t.numero_turma,
          codigo_turma: t.codigo_turma || null,
          cliente_id: t.cliente_id,
          cliente_nome: t.cliente_nome || '',
          treinamento_id: t.treinamento_id,
          treinamento_nome: `NR ${t.treinamento_norma || ''} - ${t.treinamento_nome || ''}`,
          tipo_treinamento: t.tipo_treinamento || 'Inicial',
          data_inicio: dataInicio,
          data_fim: dataFim,
          quantidade_participantes: t.quantidade_participantes || 0,
          status: t.status as 'agendado' | 'em_andamento' | 'concluido' | 'cancelado',
          validado: t.validado || false,
          tem_gestao: t.quantidade_participantes > 0
        });
      }

      setTurmas(turmasFormatadas);
    } catch (error: any) {
      console.error('Erro ao buscar turmas validadas:', error);
      toast.error('Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (turma: TurmaValidada) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Normalizar para início do dia
    const dataInicio = turma.data_inicio ? parseISO(turma.data_inicio) : null;
    const dataFim = turma.data_fim ? parseISO(turma.data_fim) : null;

    // Primeiro verificar status explícito do banco
    if (turma.status === 'cancelado') {
      return { label: 'Cancelado', color: 'bg-destructive/10 text-destructive', icon: XCircle, canEnter: false };
    }
    if (turma.status === 'concluido') {
      return { label: 'Concluído', color: 'bg-success/10 text-success', icon: CheckCircle, canEnter: true };
    }
    
    // Calcular status baseado nas datas das aulas
    if (dataInicio && dataFim) {
      if (isBefore(hoje, dataInicio)) {
        return { label: 'Agendado', color: 'bg-primary/10 text-primary', icon: Calendar, canEnter: false };
      }
      if (isAfter(hoje, dataFim)) {
        // Se passou da data fim mas status não é concluído, ainda está em andamento
        return { label: 'Concluído', color: 'bg-success/10 text-success', icon: CheckCircle, canEnter: true };
      }
      return { label: 'Em Andamento', color: 'bg-warning/10 text-warning', icon: PlayCircle, canEnter: true };
    }
    
    // Se não tem datas, verificar status do banco
    if (turma.status === 'em_andamento') {
      return { label: 'Em Andamento', color: 'bg-warning/10 text-warning', icon: PlayCircle, canEnter: true };
    }
    if (turma.status === 'agendado') {
      return { label: 'Agendado', color: 'bg-primary/10 text-primary', icon: Calendar, canEnter: false };
    }
    
    return { label: 'Agendado', color: 'bg-primary/10 text-primary', icon: Calendar, canEnter: false };
  };

  const filteredTurmas = turmas.filter(turma => {
    const matchesSearch = 
      turma.treinamento_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turma.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    
    const statusInfo = getStatusInfo(turma);
    if (filterStatus === 'agendado') return matchesSearch && statusInfo.label === 'Agendado';
    if (filterStatus === 'em_andamento') return matchesSearch && statusInfo.label === 'Em Andamento';
    if (filterStatus === 'concluido') return matchesSearch && statusInfo.label === 'Concluído';
    if (filterStatus === 'cancelado') return matchesSearch && statusInfo.label === 'Cancelado';
    
    return matchesSearch;
  });

  const estatisticas = {
    total: turmas.length,
    agendados: turmas.filter(t => getStatusInfo(t).label === 'Agendado').length,
    emAndamento: turmas.filter(t => getStatusInfo(t).label === 'Em Andamento').length,
    concluidos: turmas.filter(t => getStatusInfo(t).label === 'Concluído').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileCheck className="h-6 w-6 text-primary" />
          Gestão de Turmas
        </h1>
        <p className="text-sm text-muted-foreground">
          Controle das suas turmas validadas - prestes a ocorrer, em andamento e concluídas
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Turmas</p>
                <p className="text-2xl font-bold text-foreground">{estatisticas.total}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary">Agendadas</p>
                <p className="text-2xl font-bold text-primary">{estatisticas.agendados}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warning">Em Andamento</p>
                <p className="text-2xl font-bold text-warning">{estatisticas.emAndamento}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-warning/60" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-success">Concluídas</p>
                <p className="text-2xl font-bold text-success">{estatisticas.concluidos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-border">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por treinamento ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="agendado">Agendadas</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluídas</SelectItem>
                <SelectItem value="cancelado">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Turmas */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground">
            Minhas Turmas Validadas ({filteredTurmas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-medium">Turma</TableHead>
                  <TableHead className="font-medium">Treinamento</TableHead>
                  <TableHead className="font-medium">Empresa</TableHead>
                  <TableHead className="font-medium">Data</TableHead>
                  <TableHead className="font-medium text-center">Gestão</TableHead>
                  <TableHead className="font-medium text-center">Status</TableHead>
                  <TableHead className="font-medium text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTurmas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'Nenhuma turma encontrada com os filtros aplicados'
                        : 'Você ainda não possui turmas validadas.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTurmas.map(turma => {
                    const statusInfo = getStatusInfo(turma);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={turma.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {turma.codigo_turma || `Turma ${turma.numero_turma}`}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <span className="text-sm truncate block" title={turma.treinamento_nome}>
                              {turma.treinamento_nome}
                            </span>
                            <span className="text-xs text-muted-foreground">{turma.tipo_treinamento}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{turma.cliente_nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {turma.data_inicio ? (
                              <>
                                {format(parseISO(turma.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                                {turma.data_fim && turma.data_fim !== turma.data_inicio && (
                                  <span className="text-muted-foreground">
                                    {' - '}{format(parseISO(turma.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {turma.tem_gestao ? (
                            <Badge className="bg-success/10 text-success hover:bg-success/10">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sim
                            </Badge>
                          ) : (
                            <Badge className="bg-warning/10 text-warning hover:bg-warning/10">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {statusInfo.canEnter ? (
                            <Button 
                              size="sm"
                              onClick={() => navigate(`/instrutor/turma/${turma.id}`)}
                            >
                              Gerenciar Turma
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              variant="outline"
                              disabled
                              title="Turma ainda não iniciou"
                            >
                              Aguardando Início
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
