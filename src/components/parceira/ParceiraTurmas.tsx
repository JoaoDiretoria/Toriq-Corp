import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, GraduationCap, Search, AlertCircle, Calendar, CheckCircle, PlayCircle, XCircle, Clock, Building2, FileCheck, Eye } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Turma {
  id: string;
  codigo_turma: string | null;
  numero_turma: number;
  cliente_nome: string;
  treinamento_nome: string;
  treinamento_norma: string;
  instrutor_nome: string;
  data_inicio: string;
  data_fim: string;
  quantidade_participantes: number;
  status: string;
  tipo_treinamento: string;
}

export function ParceiraTurmas() {
  const { profile, empresa, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaParceiraId, setEmpresaParceiraId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchEmpresaParceiraId = async () => {
      const empresaIdToUse = empresa?.id || profile?.empresa_id;
      
      if (authLoading) return;
      if (!empresaIdToUse) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('empresas_parceiras')
          .select('id, empresa_sst_id')
          .eq('parceira_empresa_id', empresaIdToUse)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setEmpresaParceiraId(data.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa parceira:', error);
        setLoading(false);
      }
    };

    fetchEmpresaParceiraId();
  }, [empresa?.id, profile?.empresa_id, authLoading]);

  useEffect(() => {
    if (empresaParceiraId) {
      fetchTurmas();
    }
  }, [empresaParceiraId]);

  const fetchTurmas = async () => {
    if (!empresaParceiraId) return;

    try {
      setLoading(true);

      // Buscar instrutores da empresa parceira
      const { data: instrutores, error: instrutoresError } = await supabase
        .from('instrutores')
        .select('id, nome')
        .eq('empresa_parceira_id', empresaParceiraId);

      if (instrutoresError) throw instrutoresError;

      if (!instrutores || instrutores.length === 0) {
        setTurmas([]);
        setLoading(false);
        return;
      }

      const instrutorIds = instrutores.map(i => i.id);
      const instrutorMap = Object.fromEntries(instrutores.map(i => [i.id, i.nome]));

      // Buscar turmas desses instrutores
      const { data: turmasData, error: turmasError } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          numero_turma,
          codigo_turma,
          instrutor_id,
          status,
          cliente_id,
          treinamento_id,
          quantidade_participantes,
          tipo_treinamento,
          validado
        `)
        .in('instrutor_id', instrutorIds)
        .order('created_at', { ascending: false });

      if (turmasError) throw turmasError;

      if (!turmasData || turmasData.length === 0) {
        setTurmas([]);
        setLoading(false);
        return;
      }

      // Buscar aulas para obter datas
      const turmaIds = turmasData.map((t: any) => t.id);
      const { data: aulasData } = await supabase
        .from('turmas_treinamento_aulas')
        .select('turma_id, data')
        .in('turma_id', turmaIds)
        .order('data');

      // Agrupar aulas por turma
      const aulasPorTurma: Record<string, string[]> = {};
      (aulasData || []).forEach((aula: any) => {
        if (!aulasPorTurma[aula.turma_id]) {
          aulasPorTurma[aula.turma_id] = [];
        }
        aulasPorTurma[aula.turma_id].push(aula.data);
      });

      // Buscar clientes e treinamentos
      const clienteIds = [...new Set(turmasData.map((t: any) => t.cliente_id).filter(Boolean))] as string[];
      const treinamentoIds = [...new Set(turmasData.map((t: any) => t.treinamento_id).filter(Boolean))] as string[];

      const [clientesRes, treinamentosRes] = await Promise.all([
        supabase.from('clientes_sst').select('id, nome').in('id', clienteIds),
        supabase.from('catalogo_treinamentos').select('id, nome, norma').in('id', treinamentoIds)
      ]);

      const clienteMap = Object.fromEntries((clientesRes.data || []).map(c => [c.id, c.nome]));
      const treinamentoMap = Object.fromEntries((treinamentosRes.data || []).map(t => [t.id, { nome: t.nome, norma: t.norma }]));

      // Montar dados das turmas
      const turmasFormatadas: Turma[] = turmasData.map((turma: any) => {
        const treinamento = treinamentoMap[turma.treinamento_id] || { nome: '', norma: '' };
        const datas = aulasPorTurma[turma.id] || [];
        const datasOrdenadas = datas.sort();
        
        return {
          id: turma.id,
          codigo_turma: turma.codigo_turma,
          numero_turma: turma.numero_turma,
          cliente_nome: clienteMap[turma.cliente_id] || '',
          treinamento_nome: treinamento.nome,
          treinamento_norma: treinamento.norma,
          instrutor_nome: instrutorMap[turma.instrutor_id] || '',
          data_inicio: datasOrdenadas[0] || '',
          data_fim: datasOrdenadas[datasOrdenadas.length - 1] || '',
          quantidade_participantes: turma.quantidade_participantes || 0,
          status: turma.status,
          tipo_treinamento: turma.tipo_treinamento || 'Inicial'
        };
      });

      setTurmas(turmasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (turma: Turma) => {
    const hoje = new Date();
    const dataInicio = turma.data_inicio ? parseISO(turma.data_inicio) : null;
    
    if (turma.status === 'cancelado') {
      return { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle };
    }
    if (turma.status === 'concluido') {
      return { label: 'Concluído', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    }
    if (turma.status === 'em_andamento') {
      return { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700', icon: PlayCircle };
    }
    if (dataInicio && isBefore(hoje, dataInicio)) {
      return { label: 'Agendado', color: 'bg-blue-100 text-blue-700', icon: Calendar };
    }
    return { label: 'Agendado', color: 'bg-blue-100 text-blue-700', icon: Calendar };
  };

  const filteredTurmas = turmas.filter(turma => {
    const matchesSearch = 
      turma.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turma.treinamento_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turma.instrutor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (turma.codigo_turma && turma.codigo_turma.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (statusFilter === 'all') return matchesSearch;
    
    const statusInfo = getStatusInfo(turma);
    if (statusFilter === 'agendado') return matchesSearch && statusInfo.label === 'Agendado';
    if (statusFilter === 'em_andamento') return matchesSearch && statusInfo.label === 'Em Andamento';
    if (statusFilter === 'concluido') return matchesSearch && statusInfo.label === 'Concluído';
    if (statusFilter === 'cancelado') return matchesSearch && statusInfo.label === 'Cancelado';
    
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

  if (!empresaParceiraId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Empresa não vinculada</h3>
          <p className="text-muted-foreground">
            Sua empresa não está vinculada como parceira de nenhuma empresa SST.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileCheck className="h-6 w-6 text-blue-600" />
          Gestão de Turmas
        </h1>
        <p className="text-sm text-slate-500">
          Acompanhe as turmas dos seus instrutores
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de Turmas</p>
                <p className="text-2xl font-bold text-slate-800">{estatisticas.total}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Agendadas</p>
                <p className="text-2xl font-bold text-blue-700">{estatisticas.agendados}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Em Andamento</p>
                <p className="text-2xl font-bold text-yellow-700">{estatisticas.emAndamento}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Concluídas</p>
                <p className="text-2xl font-bold text-green-700">{estatisticas.concluidos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-slate-200">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por treinamento, empresa ou instrutor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-slate-700">
            Turmas ({filteredTurmas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-medium">Turma</TableHead>
                  <TableHead className="font-medium">Treinamento</TableHead>
                  <TableHead className="font-medium">Empresa</TableHead>
                  <TableHead className="font-medium">Data</TableHead>
                  <TableHead className="font-medium">Instrutor</TableHead>
                  <TableHead className="font-medium text-center">Status</TableHead>
                  <TableHead className="font-medium text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTurmas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Nenhuma turma encontrada com os filtros aplicados'
                        : 'Nenhuma turma encontrada para seus instrutores.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTurmas.map(turma => {
                    const statusInfo = getStatusInfo(turma);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={turma.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                          {turma.codigo_turma || `Turma ${turma.numero_turma}`}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <span className="text-sm truncate block" title={`NR ${turma.treinamento_norma} - ${turma.treinamento_nome}`}>
                              NR {turma.treinamento_norma} - {turma.treinamento_nome}
                            </span>
                            <span className="text-xs text-slate-400">{turma.tipo_treinamento}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="text-sm">{turma.cliente_nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {turma.data_inicio ? (
                              <>
                                {format(parseISO(turma.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                                {turma.data_fim && turma.data_fim !== turma.data_inicio && (
                                  <span className="text-slate-400">
                                    {' - '}{format(parseISO(turma.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{turma.instrutor_nome || '-'}</span>
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
                            variant="outline"
                            onClick={() => navigate(`/parceira/turmas/${turma.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Visualizar
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
