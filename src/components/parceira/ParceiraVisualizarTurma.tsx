import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  Building2, 
  GraduationCap,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Info,
  FileCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TurmaDetalhes {
  id: string;
  numero_turma: number;
  codigo_turma: string | null;
  cliente_nome: string;
  treinamento_nome: string;
  treinamento_norma: string;
  instrutor_nome: string;
  tipo_treinamento: string;
  quantidade_participantes: number;
  status: string;
  aulas: {
    id: string;
    data: string;
    hora_inicio: string;
    hora_fim: string;
  }[];
  colaboradores: {
    id: string;
    nome: string;
    cpf: string;
    presente: boolean;
    aprovado: boolean | null;
  }[];
}

export function ParceiraVisualizarTurma() {
  const { turmaId } = useParams<{ turmaId: string }>();
  const navigate = useNavigate();
  const { profile, empresa, loading: authLoading } = useAuth();
  const [turma, setTurma] = useState<TurmaDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresaParceiraId, setEmpresaParceiraId] = useState<string | null>(null);

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
    if (empresaParceiraId && turmaId) {
      fetchTurmaDetalhes();
    }
  }, [empresaParceiraId, turmaId]);

  const fetchTurmaDetalhes = async () => {
    if (!empresaParceiraId || !turmaId) return;

    try {
      setLoading(true);

      // Buscar turma
      const { data: turmaData, error: turmaError } = await (supabase as any)
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
          tipo_treinamento
        `)
        .eq('id', turmaId)
        .single();

      if (turmaError) throw turmaError;

      // Verificar se o instrutor pertence à empresa parceira
      const { data: instrutor } = await supabase
        .from('instrutores')
        .select('id, nome, empresa_parceira_id')
        .eq('id', turmaData.instrutor_id)
        .single();

      if (!instrutor || instrutor.empresa_parceira_id !== empresaParceiraId) {
        console.error('Turma não pertence a um instrutor desta empresa parceira');
        setLoading(false);
        return;
      }

      // Buscar aulas
      const { data: aulasData } = await supabase
        .from('turmas_treinamento_aulas')
        .select('id, data, hora_inicio, hora_fim')
        .eq('turma_id', turmaId)
        .order('data');

      // Buscar cliente e treinamento
      const [clienteRes, treinamentoRes] = await Promise.all([
        supabase.from('clientes_sst').select('nome').eq('id', turmaData.cliente_id).single(),
        supabase.from('catalogo_treinamentos').select('nome, norma').eq('id', turmaData.treinamento_id).single()
      ]);

      // Buscar colaboradores
      const { data: colaboradoresData } = await (supabase as any)
        .from('turmas_treinamento_colaboradores')
        .select(`
          id,
          colaborador_id,
          presente,
          aprovado,
          colaborador:colaboradores(nome, cpf)
        `)
        .eq('turma_id', turmaId);

      const turmaFormatada: TurmaDetalhes = {
        id: turmaData.id,
        numero_turma: turmaData.numero_turma,
        codigo_turma: turmaData.codigo_turma,
        cliente_nome: clienteRes.data?.nome || '',
        treinamento_nome: treinamentoRes.data?.nome || '',
        treinamento_norma: treinamentoRes.data?.norma || '',
        instrutor_nome: instrutor.nome,
        tipo_treinamento: turmaData.tipo_treinamento || 'Inicial',
        quantidade_participantes: turmaData.quantidade_participantes || 0,
        status: turmaData.status,
        aulas: (aulasData || []).map((a: any) => ({
          id: a.id,
          data: a.data,
          hora_inicio: a.hora_inicio,
          hora_fim: a.hora_fim
        })),
        colaboradores: (colaboradoresData || []).map((c: any) => ({
          id: c.id,
          nome: c.colaborador?.nome || '',
          cpf: c.colaborador?.cpf || '',
          presente: c.presente || false,
          aprovado: c.aprovado
        }))
      };

      setTurma(turmaFormatada);
    } catch (error) {
      console.error('Erro ao buscar detalhes da turma:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendado':
        return <Badge className="bg-blue-100 text-blue-700">Agendado</Badge>;
      case 'em_andamento':
        return <Badge className="bg-yellow-100 text-yellow-700">Em Andamento</Badge>;
      case 'concluido':
        return <Badge className="bg-green-100 text-green-700">Concluído</Badge>;
      case 'cancelado':
        return <Badge className="bg-red-100 text-red-700">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Turma não encontrada</h3>
          <p className="text-muted-foreground">
            A turma solicitada não foi encontrada ou você não tem permissão para visualizá-la.
          </p>
          <Button className="mt-4" onClick={() => navigate('/parceira')}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/parceira')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-blue-600" />
              {turma.codigo_turma || `Turma ${turma.numero_turma}`}
            </h1>
            <p className="text-sm text-slate-500">
              NR {turma.treinamento_norma} - {turma.treinamento_nome}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(turma.status)}
        </div>
      </div>

      {/* Card de Informações Resumidas */}
      <Card className="border-slate-200">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Empresa</p>
                <p className="text-sm font-medium">{turma.cliente_nome}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Data</p>
                <p className="text-sm font-medium">
                  {turma.aulas.length > 0 ? format(parseISO(turma.aulas[0].data), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                  {turma.aulas.length > 1 && (
                    <span className="text-slate-400"> - {format(parseISO(turma.aulas[turma.aulas.length - 1].data), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Instrutor</p>
                <p className="text-sm font-medium">{turma.instrutor_nome || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Participantes</p>
                <p className="text-sm font-medium">{turma.quantidade_participantes}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden md:inline">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="aulas" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden md:inline">Aulas ({turma.aulas.length})</span>
          </TabsTrigger>
          <TabsTrigger value="colaboradores" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">Colaboradores ({turma.colaboradores.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba Geral */}
        <TabsContent value="geral" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Informações Gerais
              </CardTitle>
              <CardDescription>
                Dados gerais da turma de treinamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Código da Turma</p>
                    <p className="font-medium">{turma.codigo_turma || `Turma ${turma.numero_turma}`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Treinamento</p>
                    <p className="font-medium">NR {turma.treinamento_norma} - {turma.treinamento_nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tipo de Treinamento</p>
                    <p className="font-medium">{turma.tipo_treinamento}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Empresa/Cliente</p>
                    <p className="font-medium">{turma.cliente_nome}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Instrutor</p>
                    <p className="font-medium">{turma.instrutor_nome || 'Não definido'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Quantidade de Participantes</p>
                    <p className="font-medium">{turma.quantidade_participantes}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    {getStatusBadge(turma.status)}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Aulas Programadas</p>
                    <div className="mt-2 space-y-1">
                      {turma.aulas.length > 0 ? (
                        turma.aulas.map((aula, index) => (
                          <div key={index} className="text-sm bg-slate-50 p-2 rounded">
                            {format(parseISO(aula.data), 'dd/MM/yyyy', { locale: ptBR })} - {aula.hora_inicio} às {aula.hora_fim}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400">Nenhuma aula programada</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aulas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cronograma de Aulas</CardTitle>
            </CardHeader>
            <CardContent>
              {turma.aulas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma aula agendada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turma.aulas.map((aula) => (
                      <TableRow key={aula.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {format(parseISO(aula.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            {aula.hora_inicio} - {aula.hora_fim}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colaboradores" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lista de Colaboradores</CardTitle>
            </CardHeader>
            <CardContent>
              {turma.colaboradores.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum colaborador inscrito
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead className="text-center">Presença</TableHead>
                      <TableHead className="text-center">Aprovado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turma.colaboradores.map((colab) => (
                      <TableRow key={colab.id}>
                        <TableCell className="font-medium">{colab.nome}</TableCell>
                        <TableCell>{colab.cpf}</TableCell>
                        <TableCell className="text-center">
                          {colab.presente ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {colab.aprovado === null ? (
                            <span className="text-slate-400">-</span>
                          ) : colab.aprovado ? (
                            <Badge className="bg-green-100 text-green-700">Aprovado</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">Reprovado</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
