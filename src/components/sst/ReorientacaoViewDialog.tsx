import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Building2, GraduationCap, Calendar, XCircle, CheckCircle2, PenTool, AlertTriangle, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface QuestaoIncorreta {
  questao_id: string;
  numero: number;
  pergunta: string;
  alternativa_selecionada: string;
  alternativa_selecionada_texto: string;
  alternativa_correta: string;
  alternativa_correta_texto: string;
  alternativas_erradas: Array<{ letra: string; texto: string }>;
}

interface ReorientacaoData {
  id: string;
  colaborador_nome: string;
  colaborador_cpf: string;
  empresa_nome: string;
  treinamento_nome: string;
  data_treinamento: string;
  nota: number;
  total_questoes: number;
  acertos: number;
  questoes_incorretas: QuestaoIncorreta[];
  texto_reorientacao: string | null;
  assinatura_digital: string | null;
  assinado_em: string | null;
  created_at: string;
}

interface ReorientacaoViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaId: string;
  colaboradorId: string;
  colaboradorNome: string;
}

export function ReorientacaoViewDialog({
  open,
  onOpenChange,
  turmaId,
  colaboradorId,
  colaboradorNome
}: ReorientacaoViewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [reorientacao, setReorientacao] = useState<ReorientacaoData | null>(null);

  useEffect(() => {
    if (open && turmaId && colaboradorId) {
      fetchReorientacao();
    }
  }, [open, turmaId, colaboradorId]);

  const fetchReorientacao = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('reorientacoes_colaborador')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Erro ao buscar reorientação:', error);
        setReorientacao(null);
      } else {
        setReorientacao(data as ReorientacaoData);
      }
    } catch (error) {
      console.error('Erro ao buscar reorientação:', error);
      setReorientacao(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf?.replace(/\D/g, '') || '';
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Reorientação - {colaboradorNome}
          </DialogTitle>
          <DialogDescription>
            Detalhes da reorientação após pós-teste
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !reorientacao ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhuma reorientação encontrada para este colaborador.</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Informações do Colaborador */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Colaborador</p>
                      <p className="font-medium">{reorientacao.colaborador_nome}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPF</p>
                    <p className="font-medium">{formatCPF(reorientacao.colaborador_cpf)}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Empresa</p>
                      <p className="font-medium">{reorientacao.empresa_nome}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <GraduationCap className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Treinamento</p>
                      <p className="font-medium">{reorientacao.treinamento_nome}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {reorientacao.data_treinamento 
                          ? format(parseISO(reorientacao.data_treinamento), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Resultado</p>
                    <Badge className="bg-amber-100 text-amber-700">
                      {reorientacao.acertos}/{reorientacao.total_questoes}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Texto de Reorientação - Exibido ANTES das questões */}
            {reorientacao.texto_reorientacao && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Termo de Reorientação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-white border border-blue-200 rounded-lg">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {reorientacao.texto_reorientacao}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Questões Incorretas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-600 text-base">
                  <XCircle className="h-5 w-5" />
                  Questões Incorretas ({(reorientacao.questoes_incorretas as QuestaoIncorreta[])?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(reorientacao.questoes_incorretas as QuestaoIncorreta[])?.map((questao) => (
                  <div key={questao.questao_id} className="border rounded-lg p-3 bg-slate-50">
                    <p className="font-medium text-sm mb-2">
                      {questao.numero}. {questao.pergunta}
                    </p>
                    
                    {/* Resposta do colaborador (errada) */}
                    <div className="mb-2 p-2 rounded bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-red-600 font-medium">Resposta do colaborador:</p>
                          <p className="text-xs text-red-700">
                            <span className="font-medium">{questao.alternativa_selecionada})</span> {questao.alternativa_selecionada_texto}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resposta correta */}
                    <div className="p-2 rounded bg-green-50 border border-green-200">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-green-600 font-medium">Resposta correta:</p>
                          <p className="text-xs text-green-700">
                            <span className="font-medium">{questao.alternativa_correta})</span> {questao.alternativa_correta_texto}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Assinatura Digital */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PenTool className="h-4 w-4 text-green-600" />
                  Assinatura Digital
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reorientacao.assinatura_digital ? (
                  <div className="space-y-2">
                    <div className="border rounded-lg p-2 bg-white inline-block">
                      <img 
                        src={reorientacao.assinatura_digital} 
                        alt="Assinatura do colaborador"
                        className="max-h-24"
                      />
                    </div>
                    {reorientacao.assinado_em && (
                      <p className="text-xs text-muted-foreground">
                        Assinado em: {format(parseISO(reorientacao.assinado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Assinatura não disponível
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
