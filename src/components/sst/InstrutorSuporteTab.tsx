import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Search, Send, CheckCircle2, Clock, User, Calendar, HelpCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pergunta {
  id: string;
  solicitacao_id: string;
  campo: string;
  pergunta: string;
  resposta: string | null;
  respondido_em: string | null;
  status: string;
  created_at: string;
  solicitacao?: {
    nome: string | null;
    email: string | null;
    telefone: string | null;
    status: string;
  };
}

const CAMPOS_FORMULARIO: Record<string, string> = {
  'nome': 'Nome Completo',
  'cpf': 'CPF',
  'cpf_cnpj': 'CPF',
  'email': 'E-mail',
  'telefone': 'Telefone',
  'data_nascimento': 'Data de Nascimento',
  'endereco': 'Endereço',
  'formacao_academica': 'Formação Acadêmica',
  'veiculo': 'Veículo',
  'formacoes': 'Formações e Treinamentos',
  'assinatura': 'Assinatura Digital',
  'outro': 'Outro',
};

interface InstrutorSuporteTabProps {
  empresaParceiraId?: string | null;
}

export function InstrutorSuporteTab({ empresaParceiraId }: InstrutorSuporteTabProps = {}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  
  const [respondendoPergunta, setRespondendoPergunta] = useState<Pergunta | null>(null);
  const [respostaTexto, setRespostaTexto] = useState('');
  const [enviandoResposta, setEnviandoResposta] = useState(false);

  const empresaId = profile?.empresa_id;

  const fetchPerguntas = async () => {
    if (!empresaId && !empresaParceiraId) return;
    
    setLoading(true);
    try {
      const db = supabase as any;
      
      // Buscar todas as perguntas das solicitações da empresa ou empresa parceira
      let query = db.from('instrutor_solicitacoes').select('id, nome, email, telefone, status');
      
      if (empresaParceiraId) {
        query = query.eq('empresa_parceira_id', empresaParceiraId);
      } else {
        query = query.eq('empresa_id', empresaId).is('empresa_parceira_id', null);
      }
      
      const { data: solicitacoes, error: solError } = await query;

      if (solError) throw solError;

      if (!solicitacoes || solicitacoes.length === 0) {
        setPerguntas([]);
        setLoading(false);
        return;
      }

      const solicitacaoIds = solicitacoes.map((s: any) => s.id);
      const solicitacaoMap = new Map(solicitacoes.map((s: any) => [s.id, s]));

      const { data: perguntasData, error: pergError } = await db
        .from('instrutor_solicitacao_perguntas')
        .select('*')
        .in('solicitacao_id', solicitacaoIds)
        .order('created_at', { ascending: false });

      if (pergError) throw pergError;

      const perguntasComSolicitacao = (perguntasData || []).map((p: any) => ({
        ...p,
        solicitacao: solicitacaoMap.get(p.solicitacao_id),
      }));

      setPerguntas(perguntasComSolicitacao);
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
      toast.error('Erro ao carregar perguntas de suporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerguntas();
  }, [empresaId]);

  const handleResponder = async () => {
    if (!respondendoPergunta || !respostaTexto.trim() || !profile) return;

    setEnviandoResposta(true);
    try {
      const db = supabase as any;

      const { error } = await db
        .from('instrutor_solicitacao_perguntas')
        .update({
          resposta: respostaTexto.trim(),
          respondido_em: new Date().toISOString(),
          respondido_por: profile.id,
          status: 'respondido',
        })
        .eq('id', respondendoPergunta.id);

      if (error) throw error;

      toast.success('Resposta enviada com sucesso');
      setRespondendoPergunta(null);
      setRespostaTexto('');
      fetchPerguntas();
    } catch (error) {
      console.error('Erro ao responder:', error);
      toast.error('Erro ao enviar resposta');
    } finally {
      setEnviandoResposta(false);
    }
  };

  const filteredPerguntas = perguntas.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.pergunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.solicitacao?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.solicitacao?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'todos' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendentes = perguntas.filter((p) => p.status === 'pendente').length;
  const respondidas = perguntas.filter((p) => p.status === 'respondido').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Perguntas</p>
                <p className="text-2xl font-bold">{perguntas.length}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-warning">{pendentes}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Respondidas</p>
                <p className="text-2xl font-bold text-success">{respondidas}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Perguntas de Suporte
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="respondido">Respondidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPerguntas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma pergunta encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPerguntas.map((pergunta) => (
                <Card key={pergunta.id} className="border">
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Header */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {CAMPOS_FORMULARIO[pergunta.campo] || pergunta.campo}
                          </Badge>
                          <Badge
                            variant={pergunta.status === 'respondido' ? 'default' : 'secondary'}
                            className={
                              pergunta.status === 'respondido'
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                            }
                          >
                            {pergunta.status === 'respondido' ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Respondido
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Pendente
                              </>
                            )}
                          </Badge>
                        </div>

                        {/* Solicitante */}
                        {pergunta.solicitacao && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{pergunta.solicitacao.nome || 'Nome não informado'}</span>
                            {pergunta.solicitacao.email && (
                              <span className="text-xs">({pergunta.solicitacao.email})</span>
                            )}
                          </div>
                        )}

                        {/* Pergunta */}
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm font-medium mb-1">Pergunta:</p>
                          <p className="text-sm">{pergunta.pergunta}</p>
                        </div>

                        {/* Resposta */}
                        {pergunta.resposta && (
                          <div className="bg-success/5 rounded-lg p-3">
                            <p className="text-sm font-medium mb-1 text-success">Resposta:</p>
                            <p className="text-sm text-success/80">{pergunta.resposta}</p>
                            {pergunta.respondido_em && (
                              <p className="text-xs text-success/70 mt-2">
                                Respondido em {format(new Date(pergunta.respondido_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Data */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Enviada em {format(new Date(pergunta.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>

                      {/* Actions */}
                      {pergunta.status === 'pendente' && (
                        <Button
                          onClick={() => {
                            setRespondendoPergunta(pergunta);
                            setRespostaTexto('');
                          }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Responder
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Resposta */}
      <Dialog open={!!respondendoPergunta} onOpenChange={(open) => !open && setRespondendoPergunta(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Responder Pergunta</DialogTitle>
          </DialogHeader>
          
          {respondendoPergunta && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Solicitante:</p>
                <p className="font-medium">{respondendoPergunta.solicitacao?.nome || 'Nome não informado'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Campo:</p>
                <Badge variant="outline">
                  {CAMPOS_FORMULARIO[respondendoPergunta.campo] || respondendoPergunta.campo}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pergunta:</p>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">{respondendoPergunta.pergunta}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sua Resposta:</p>
                <Textarea
                  value={respostaTexto}
                  onChange={(e) => setRespostaTexto(e.target.value)}
                  placeholder="Digite sua resposta..."
                  rows={4}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondendoPergunta(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleResponder}
              disabled={!respostaTexto.trim() || enviandoResposta}
            >
              {enviandoResposta ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
