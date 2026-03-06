import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
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
  CheckCircle, 
  Clock, 
  PlayCircle,
  XCircle,
  FileCheck,
  Eye
} from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  instrutor_nome: string | null;
  quantidade_participantes: number;
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
  validado: boolean;
  tem_gestao: boolean;
}

export function ClienteTurmas() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const navigate = useNavigate();
  
  // Usar empresaId do modo empresa se estiver ativo, senão usar empresa.id
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  
  const [turmas, setTurmas] = useState<TurmaValidada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (empresaId) {
      fetchTurmasCliente();
    } else {
      setLoading(false);
    }
  }, [empresaId, isInEmpresaMode]);

  const fetchTurmasCliente = async () => {
    if (!empresaId) return;

    try {
      // Primeiro tentar buscar cliente_sst vinculado à empresa pelo cliente_empresa_id
      let clienteData = null;
      
      const { data: clienteByEmpresaId } = await (supabase as any)
        .from('clientes_sst')
        .select('id, nome')
        .eq('cliente_empresa_id', empresaId)
        .maybeSingle();

      if (clienteByEmpresaId) {
        clienteData = clienteByEmpresaId;
      } else {
        // Se não encontrou por cliente_empresa_id, buscar CNPJ da empresa e tentar encontrar cliente por CNPJ
        const { data: empresaData } = await (supabase as any)
          .from('empresas')
          .select('cnpj, nome')
          .eq('id', empresaId)
          .single();
        
        if (empresaData?.cnpj) {
          // Tentar encontrar cliente por CNPJ
          const { data: clienteByCnpj } = await (supabase as any)
            .from('clientes_sst')
            .select('id, nome')
            .eq('cnpj', empresaData.cnpj)
            .maybeSingle();
          
          if (clienteByCnpj) {
            clienteData = clienteByCnpj;
          }
        }
        
        // Se ainda não encontrou, tentar por nome
        if (!clienteData && empresaData?.nome) {
          const { data: clientesByNome } = await (supabase as any)
            .from('clientes_sst')
            .select('id, nome')
            .ilike('nome', `%${empresaData.nome}%`)
            .limit(1);
          
          if (clientesByNome && clientesByNome.length > 0) {
            clienteData = clientesByNome[0];
          }
        }
      }

      if (!clienteData) {
        setTurmas([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          numero_turma,
          codigo_turma,
          cliente_id,
          treinamento_id,
          tipo_treinamento,
          instrutor_id,
          quantidade_participantes,
          status,
          validado,
          treinamento:catalogo_treinamentos!turmas_treinamento_treinamento_id_fkey(
            nome,
            norma
          ),
          instrutor:instrutores!turmas_treinamento_instrutor_id_fkey(
            nome
          ),
          aulas:turmas_treinamento_aulas(
            data,
            hora_inicio,
            hora_fim
          )
        `)
        .eq('cliente_id', clienteData.id)
        .eq('validado', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const turmasFormatadas: TurmaValidada[] = (data || []).map((t: any) => {
        const aulas = t.aulas || [];
        const datasOrdenadas = aulas
          .map((a: any) => a.data)
          .sort((a: string, b: string) => a.localeCompare(b));
        
        const dataInicio = datasOrdenadas[0] || '';
        const dataFim = datasOrdenadas[datasOrdenadas.length - 1] || dataInicio;

        return {
          id: t.id,
          numero_turma: t.numero_turma,
          codigo_turma: t.codigo_turma || null,
          cliente_id: t.cliente_id,
          cliente_nome: clienteData.nome || '',
          treinamento_id: t.treinamento_id,
          treinamento_nome: `NR ${t.treinamento?.norma} - ${t.treinamento?.nome}`,
          tipo_treinamento: t.tipo_treinamento || 'Inicial',
          data_inicio: dataInicio,
          data_fim: dataFim,
          instrutor_nome: t.instrutor?.nome || null,
          quantidade_participantes: t.quantidade_participantes || 0,
          status: t.status as 'agendado' | 'em_andamento' | 'concluido' | 'cancelado',
          validado: t.validado || false,
          tem_gestao: t.instrutor_id !== null && t.quantidade_participantes > 0
        };
      });

      setTurmas(turmasFormatadas);
    } catch (error: any) {
      console.error('Erro ao buscar turmas:', error);
      toast.error('Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (turma: TurmaValidada) => {
    const hoje = new Date();
    const dataInicio = turma.data_inicio ? parseISO(turma.data_inicio) : null;
    const dataFim = turma.data_fim ? parseISO(turma.data_fim) : null;

    if (turma.status === 'cancelado') {
      return { label: 'Cancelado', color: 'bg-destructive/10 text-destructive', icon: XCircle };
    }
    if (turma.status === 'concluido') {
      return { label: 'Concluído', color: 'bg-success/10 text-success', icon: CheckCircle };
    }
    
    if (dataInicio && dataFim) {
      if (isBefore(hoje, dataInicio)) {
        return { label: 'Agendado', color: 'bg-primary/10 text-primary', icon: Calendar };
      }
      return { label: 'Em Andamento', color: 'bg-warning/10 text-warning', icon: PlayCircle };
    }
    return { label: 'Agendado', color: 'bg-primary/10 text-primary', icon: Calendar };
  };

  const filteredTurmas = turmas.filter(turma => {
    const matchesSearch = 
      turma.treinamento_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turma.instrutor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (turma.codigo_turma || '').toLowerCase().includes(searchTerm.toLowerCase());
    
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-primary" />
              Gestão de Turmas
            </h1>
            <p className="text-sm text-muted-foreground">
              Controle de turmas validadas - prestes a ocorrer, em andamento e concluídas
            </p>
          </div>
        </div>
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
              <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
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
              <Calendar className="h-8 w-8 text-primary/50" />
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
              <PlayCircle className="h-8 w-8 text-warning/50" />
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
              <CheckCircle className="h-8 w-8 text-success/50" />
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
                  placeholder="Buscar por treinamento, empresa ou instrutor..."
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
            Turmas Validadas ({filteredTurmas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Turma</TableHead>
                  <TableHead className="font-medium">Treinamento</TableHead>
                  <TableHead className="font-medium">Data</TableHead>
                  <TableHead className="font-medium">Instrutor</TableHead>
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
                        : 'Nenhuma turma validada ainda.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTurmas.map(turma => {
                    const statusInfo = getStatusInfo(turma);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={turma.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/cliente/turma/${turma.id}`)}>
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
                        <TableCell>
                          <span className="text-sm">{turma.instrutor_nome || '-'}</span>
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
                          <Button 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cliente/turma/${turma.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Visualizar Turma
                          </Button>
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
