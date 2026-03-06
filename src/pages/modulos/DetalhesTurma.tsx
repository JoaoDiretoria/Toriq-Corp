import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  FileText,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TurmaDetalhes {
  id: string;
  numero_turma: number;
  codigo_turma: string | null;
  cliente_id: string;
  cliente_nome: string;
  cliente_cnpj: string | null;
  treinamento_nome: string;
  treinamento_norma: string;
  tipo_treinamento: string;
  carga_horaria: number;
  data_inicio: string;
  data_fim: string;
  horario: string;
  instrutor_id: string | null;
  instrutor_nome: string | null;
  instrutor_cpf: string | null;
  instrutor_telefone: string | null;
  instrutor_email: string | null;
  quantidade_participantes: number;
  status: string;
  observacoes: string | null;
  aulas: { data: string; hora_inicio: string; hora_fim: string }[];
}

export default function DetalhesTurma() {
  const { turmaId } = useParams<{ turmaId: string }>();
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  
  const [turma, setTurma] = useState<TurmaDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('geral');

  useEffect(() => {
    if (turmaId) {
      fetchTurmaDetalhes();
    }
  }, [turmaId]);

  const fetchTurmaDetalhes = async () => {
    if (!turmaId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          numero_turma,
          codigo_turma,
          cliente_id,
          treinamento_id,
          tipo_treinamento,
          carga_horaria_total,
          instrutor_id,
          quantidade_participantes,
          status,
          observacoes,
          cliente:clientes_sst!turmas_treinamento_cliente_id_fkey(
            nome,
            cnpj
          ),
          treinamento:catalogo_treinamentos!turmas_treinamento_treinamento_id_fkey(
            nome,
            norma
          ),
          instrutor:instrutores!turmas_treinamento_instrutor_id_fkey(
            nome,
            cpf,
            telefone,
            email
          ),
          aulas:turmas_treinamento_aulas(
            data,
            hora_inicio,
            hora_fim
          )
        `)
        .eq('id', turmaId)
        .single();

      if (error) throw error;

      const aulas = data.aulas || [];
      const datasOrdenadas = aulas
        .map((a: any) => a.data)
        .sort((a: string, b: string) => a.localeCompare(b));
      
      const dataInicio = datasOrdenadas[0] || '';
      const dataFim = datasOrdenadas[datasOrdenadas.length - 1] || dataInicio;
      const horario = aulas.length > 0 
        ? `${aulas[0].hora_inicio} - ${aulas[0].hora_fim}`
        : '';

      const turmaFormatada: TurmaDetalhes = {
        id: data.id,
        numero_turma: data.numero_turma,
        codigo_turma: data.codigo_turma,
        cliente_id: data.cliente_id,
        cliente_nome: data.cliente?.nome || '',
        cliente_cnpj: data.cliente?.cnpj || null,
        treinamento_nome: data.treinamento?.nome || '',
        treinamento_norma: data.treinamento?.norma || '',
        tipo_treinamento: data.tipo_treinamento || 'Inicial',
        carga_horaria: data.carga_horaria_total || 0,
        data_inicio: dataInicio,
        data_fim: dataFim,
        horario: horario,
        instrutor_id: data.instrutor_id,
        instrutor_nome: data.instrutor?.nome || null,
        instrutor_cpf: data.instrutor?.cpf || null,
        instrutor_telefone: data.instrutor?.telefone || null,
        instrutor_email: data.instrutor?.email || null,
        quantidade_participantes: data.quantidade_participantes || 0,
        status: data.status,
        observacoes: data.observacoes,
        aulas: aulas
      };

      setTurma(turmaFormatada);
    } catch (error: any) {
      console.error('Erro ao buscar detalhes da turma:', error);
      toast.error('Erro ao carregar detalhes da turma');
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
        return <Badge className="bg-slate-100 text-slate-700">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">Turma não encontrada</h1>
        </div>
      </div>
    );
  }

  const tituloTurma = `${turma.codigo_turma || `Turma ${turma.numero_turma}`} - ${turma.tipo_treinamento} em NR ${turma.treinamento_norma}`;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{tituloTurma}</h1>
            <p className="text-sm text-slate-500">{turma.treinamento_nome}</p>
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <UserPlus className="h-4 w-4 mr-2" />
          + Colaborador
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 border-b border-slate-200 w-full justify-start rounded-none h-auto p-0">
          <TabsTrigger 
            value="geral" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
          >
            Geral
          </TabsTrigger>
          <TabsTrigger 
            value="lista-presenca" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
          >
            Lista de presença
          </TabsTrigger>
          <TabsTrigger 
            value="anexo" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
          >
            Anexo
          </TabsTrigger>
          <TabsTrigger 
            value="assinatura-ec" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
          >
            Assinatura do EC
          </TabsTrigger>
          <TabsTrigger 
            value="avaliacao" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
          >
            Avaliação do treinamento
          </TabsTrigger>
        </TabsList>

        {/* Aba Geral */}
        <TabsContent value="geral" className="mt-6 space-y-6">
          {/* Informações da Turma */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-800">{tituloTurma}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Status:</span>
              {getStatusBadge(turma.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Data de início: {turma.data_inicio ? format(parseISO(turma.data_inicio), 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR }) : '-'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-slate-600">
              <Clock className="h-4 w-4" />
              <span>Hora de início: {turma.horario ? turma.horario.split(' - ')[0] : 'Aguardando!'}</span>
            </div>
          </div>

          {/* Empresa */}
          <div className="space-y-2">
            <h3 className="text-md font-semibold text-slate-800">Empresa</h3>
            <div className="text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Empresa: <span className="text-blue-600">{turma.cliente_nome}</span></span>
              </div>
              {turma.cliente_cnpj && (
                <div className="ml-6">
                  <span>CNPJ: {turma.cliente_cnpj}</span>
                </div>
              )}
            </div>
          </div>

          {/* Instrutor */}
          <div className="space-y-2">
            <h3 className="text-md font-semibold text-slate-800">Instrutor</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Nome: <span className="text-blue-600">{turma.instrutor_nome || '-'}</span></span>
              </div>
              {turma.instrutor_cpf && (
                <div className="ml-6">
                  <span>CNPJ/CPF: {turma.instrutor_cpf}</span>
                </div>
              )}
              {turma.instrutor_telefone && (
                <div className="flex items-center gap-2 ml-6">
                  <Phone className="h-4 w-4" />
                  <span>Telefone: <span className="text-blue-600">{turma.instrutor_telefone}</span></span>
                </div>
              )}
              {turma.instrutor_email && (
                <div className="flex items-center gap-2 ml-6">
                  <Mail className="h-4 w-4" />
                  <span>Email: <span className="text-blue-600">{turma.instrutor_email}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Dados mínimos para finalização */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-md font-semibold text-slate-800">Dados mínimos para finalização da turma:</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <span className="font-medium">1)</span>
                <span>Preencha as notas de pré-teste e pós-teste de <span className="text-blue-600 underline">todos os colaboradores da turma</span>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">2)</span>
                <span>Em caso de notas entre 7 e 9, o colaborador deve ser reorientado e <span className="text-blue-600 underline">uma foto da declaração de reorientação assinada pelo colaborador deve ser anexada</span> no campo Reorientado.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">3)</span>
                <span>Anexe <span className="text-blue-600 underline">fotos do feedback do aluno</span>;</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">4)</span>
                <span>Salve os demais arquivos em anexo (uma foto da lista de presenças dos colaboradores e no mínimo <span className="text-blue-600 underline">duas fotos</span> de comprovação <span className="text-blue-600 underline">da realização do treinamento</span>);</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Aba Lista de Presença */}
        <TabsContent value="lista-presenca" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lista de Presença</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhum colaborador adicionado ainda.</p>
                <p className="text-sm">Clique em "+ Colaborador" para adicionar participantes.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Anexo */}
        <TabsContent value="anexo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anexos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhum anexo adicionado ainda.</p>
                <p className="text-sm">Adicione fotos e documentos do treinamento.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Assinatura do EC */}
        <TabsContent value="assinatura-ec" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assinatura do EC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Assinatura do Engenheiro de Segurança do Trabalho.</p>
                <p className="text-sm">Esta seção será preenchida após a conclusão do treinamento.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Avaliação do Treinamento */}
        <TabsContent value="avaliacao" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avaliação do Treinamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Avaliação do treinamento pelos participantes.</p>
                <p className="text-sm">Esta seção será preenchida após a conclusão do treinamento.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
