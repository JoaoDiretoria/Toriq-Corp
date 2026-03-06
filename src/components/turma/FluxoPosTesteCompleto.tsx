import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SignaturePad } from '@/components/ui/signature-pad';
import { AvaliacaoReacaoForm } from '@/components/avaliacao/AvaliacaoReacaoForm';
import { 
  Check, 
  X, 
  ClipboardList, 
  Award, 
  PenTool, 
  Star, 
  AlertTriangle,
  Loader2,
  ChevronRight,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Questao {
  id: string;
  numero: number;
  pergunta: string;
  alternativas: Array<{
    id: string;
    letra: string;
    texto: string;
    correta: boolean;
  }>;
}

interface FluxoPosTesteCompletoProps {
  turmaId: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorCpf: string;
  treinamentoId: string;
  treinamentoNome: string;
  treinamentoNorma: string;
  clienteNome: string;
  dataInicio: string;
  questoes: Questao[];
  onComplete: () => void;
  onCancel: () => void;
}

type Step = 'prova' | 'resultado' | 'reorientacao' | 'assinatura_certificado' | 'avaliacao_reacao' | 'concluido';

const db = supabase as any;

export function FluxoPosTesteCompleto({
  turmaId,
  colaboradorId,
  colaboradorNome,
  colaboradorCpf,
  treinamentoId,
  treinamentoNome,
  treinamentoNorma,
  clienteNome,
  dataInicio,
  questoes,
  onComplete,
  onCancel
}: FluxoPosTesteCompletoProps) {
  const [currentStep, setCurrentStep] = useState<Step>('prova');
  const [loading, setLoading] = useState(false);
  
  // Estado da prova
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [modoProva, setModoProva] = useState<'todas' | 'incorretas' | null>(null);
  const [questoesIncorretas, setQuestoesIncorretas] = useState<Array<{ questaoId: string; alternativaId: string }>>([]);
  
  // Resultado da prova
  const [nota, setNota] = useState<number>(0);
  const [acertos, setAcertos] = useState<number>(0);
  const [totalQuestoes, setTotalQuestoes] = useState<number>(0);
  const [resultado, setResultado] = useState<'aprovado' | 'aguardando' | 'reprovado'>('aguardando');
  const [respostasDetalhadas, setRespostasDetalhadas] = useState<Record<string, { resposta: string; correta: string; acertou: boolean }>>({});
  
  // Estado da reorientação
  const [questoesErradasParaReorientacao, setQuestoesErradasParaReorientacao] = useState<Array<{
    questaoId: string;
    pergunta: string;
    respostaErrada: string;
    respostaCorreta: string;
  }>>([]);
  
  // Verificar se já tem avaliação de reação
  const [temAvaliacaoReacao, setTemAvaliacaoReacao] = useState(false);
  const [avaliacaoReacaoJaRespondida, setAvaliacaoReacaoJaRespondida] = useState(false);

  useEffect(() => {
    verificarAvaliacaoReacao();
  }, [treinamentoId, colaboradorId, turmaId]);

  const verificarAvaliacaoReacao = async () => {
    try {
      // Verificar se tem modelo de avaliação vinculado ao treinamento
      const { data: modeloTreinamento } = await db
        .from('avaliacao_reacao_modelo_treinamentos')
        .select('modelo_id')
        .eq('treinamento_id', treinamentoId)
        .limit(1)
        .single();

      setTemAvaliacaoReacao(!!modeloTreinamento);

      // Verificar se já respondeu
      const { data: respostaExistente } = await db
        .from('avaliacao_reacao_respostas')
        .select('id')
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorId)
        .limit(1)
        .single();

      setAvaliacaoReacaoJaRespondida(!!respostaExistente);
    } catch (error) {
      // Ignora erros - assume que não tem
    }
  };

  const getSteps = (): { key: Step; label: string; icon: React.ReactNode }[] => {
    const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
      { key: 'prova', label: 'Prova', icon: <ClipboardList className="h-4 w-4" /> },
      { key: 'resultado', label: 'Resultado', icon: <Award className="h-4 w-4" /> },
    ];

    if (resultado === 'aguardando') {
      steps.push({ key: 'reorientacao', label: 'Reorientação', icon: <AlertTriangle className="h-4 w-4" /> });
    }

    steps.push({ key: 'assinatura_certificado', label: 'Assinatura', icon: <PenTool className="h-4 w-4" /> });

    if (temAvaliacaoReacao && !avaliacaoReacaoJaRespondida) {
      steps.push({ key: 'avaliacao_reacao', label: 'Avaliação', icon: <Star className="h-4 w-4" /> });
    }

    steps.push({ key: 'concluido', label: 'Concluído', icon: <Check className="h-4 w-4" /> });

    return steps;
  };

  const getCurrentStepIndex = () => {
    const steps = getSteps();
    return steps.findIndex(s => s.key === currentStep);
  };

  const handleSalvarProva = async () => {
    if (questoes.length === 0) {
      toast.error('Não há questões cadastradas para este treinamento');
      return;
    }

    setLoading(true);
    try {
      let acertosCount = 0;
      const respostasObj: Record<string, { resposta: string; correta: string; acertou: boolean }> = {};
      const questoesErradas: Array<{
        questaoId: string;
        pergunta: string;
        respostaErrada: string;
        respostaCorreta: string;
      }> = [];

      if (modoProva === 'todas') {
        questoes.forEach(q => {
          const alternativaSelecionada = q.alternativas.find(a => a.id === respostas[q.id]);
          const alternativaCorreta = q.alternativas.find(a => a.correta);
          const acertou = alternativaSelecionada?.correta || false;

          if (acertou) acertosCount++;

          respostasObj[q.id] = {
            resposta: alternativaSelecionada?.letra || '',
            correta: alternativaCorreta?.letra || '',
            acertou
          };

          if (!acertou) {
            questoesErradas.push({
              questaoId: q.id,
              pergunta: q.pergunta,
              respostaErrada: alternativaSelecionada?.letra || '',
              respostaCorreta: alternativaCorreta?.letra || ''
            });
          }
        });
      } else {
        // Modo incorretas
        const questoesErradasSet = new Set(questoesIncorretas.map(i => i.questaoId));
        
        questoes.forEach(q => {
          const alternativaCorreta = q.alternativas.find(a => a.correta);
          
          if (questoesErradasSet.has(q.id)) {
            const incorreta = questoesIncorretas.find(i => i.questaoId === q.id);
            const altErrada = q.alternativas.find(a => a.id === incorreta?.alternativaId);
            respostasObj[q.id] = {
              resposta: altErrada?.letra || '',
              correta: alternativaCorreta?.letra || '',
              acertou: false
            };
            questoesErradas.push({
              questaoId: q.id,
              pergunta: q.pergunta,
              respostaErrada: altErrada?.letra || '',
              respostaCorreta: alternativaCorreta?.letra || ''
            });
          } else {
            acertosCount++;
            respostasObj[q.id] = {
              resposta: alternativaCorreta?.letra || '',
              correta: alternativaCorreta?.letra || '',
              acertou: true
            };
          }
        });
      }

      const notaCalculada = acertosCount;
      const total = questoes.length;

      // Deletar prova anterior se existir
      await db
        .from('turma_provas')
        .delete()
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorId)
        .eq('tipo_prova', 'pos_teste');

      // Inserir nova prova
      const { error } = await db
        .from('turma_provas')
        .insert({
          turma_id: turmaId,
          colaborador_id: colaboradorId,
          tipo_prova: 'pos_teste',
          nota: notaCalculada,
          total_questoes: total,
          acertos: acertosCount,
          respostas: respostasObj,
          origem: 'instrutor'
        });

      if (error) throw error;

      // Determinar resultado
      let resultadoCalc: 'aprovado' | 'aguardando' | 'reprovado';
      if (acertosCount === 10) {
        resultadoCalc = 'aprovado';
      } else if (acertosCount >= 7) {
        resultadoCalc = 'aguardando'; // Precisa de reorientação
      } else {
        resultadoCalc = 'reprovado';
      }

      // Atualizar turma_colaboradores
      await db
        .from('turma_colaboradores')
        .update({ 
          nota_pos_teste: notaCalculada,
          resultado: resultadoCalc === 'aguardando' ? 'aguardando' : resultadoCalc
        })
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorId);

      setNota(notaCalculada);
      setAcertos(acertosCount);
      setTotalQuestoes(total);
      setResultado(resultadoCalc);
      setRespostasDetalhadas(respostasObj);
      setQuestoesErradasParaReorientacao(questoesErradas);

      setCurrentStep('resultado');
    } catch (error: any) {
      console.error('Erro ao salvar prova:', error);
      toast.error('Erro ao registrar prova');
    } finally {
      setLoading(false);
    }
  };

  const handleAvancarDoResultado = () => {
    if (resultado === 'reprovado') {
      toast.error('Colaborador reprovado. Não é possível continuar o fluxo.');
      onComplete();
      return;
    }

    if (resultado === 'aguardando') {
      setCurrentStep('reorientacao');
    } else {
      setCurrentStep('assinatura_certificado');
    }
  };

  const handleSalvarReorientacao = async (signatureData: string) => {
    setLoading(true);
    try {
      // Buscar a prova pós-teste existente
      const { data: provaExistente, error: provaError } = await db
        .from('turma_provas')
        .select('id, acertos, total_questoes, nota')
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorId)
        .eq('tipo_prova', 'pos_teste')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (provaError || !provaExistente) {
        toast.error('Prova pós-teste não encontrada');
        setLoading(false);
        return;
      }

      // Montar texto de reorientação
      const textoReorientacao = questoesErradasParaReorientacao.map(q => 
        `Questão: ${q.pergunta}\nResposta marcada: ${q.respostaErrada}\nResposta correta: ${q.respostaCorreta}`
      ).join('\n\n');

      // Inserir reorientação
      const { error: reorientacaoError } = await db
        .from('reorientacoes_colaborador')
        .insert({
          turma_id: turmaId,
          colaborador_id: colaboradorId,
          turma_prova_id: provaExistente.id,
          colaborador_nome: colaboradorNome,
          colaborador_cpf: colaboradorCpf || '',
          empresa_nome: clienteNome || '',
          treinamento_nome: `${treinamentoNorma || ''} - ${treinamentoNome || ''}`,
          data_treinamento: dataInicio || new Date().toISOString().split('T')[0],
          nota: provaExistente.nota,
          total_questoes: provaExistente.total_questoes,
          acertos: provaExistente.acertos,
          questoes_incorretas: questoesErradasParaReorientacao,
          texto_reorientacao: textoReorientacao,
          assinatura_digital: signatureData,
          assinado_em: new Date().toISOString()
        });

      if (reorientacaoError) throw reorientacaoError;

      // Atualizar colaborador com status reorientado e aprovado
      await db
        .from('turma_colaboradores')
        .update({
          reorientado: true,
          resultado: 'aprovado'
        })
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorId);

      setResultado('aprovado');
      toast.success('Reorientação salva com sucesso!');
      setCurrentStep('assinatura_certificado');
    } catch (error: any) {
      console.error('Erro ao salvar reorientação:', error);
      toast.error('Erro ao salvar reorientação');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarAssinaturaCertificado = async (signatureData: string) => {
    setLoading(true);
    try {
      const { error } = await db
        .from('turma_colaboradores')
        .update({ assinatura_certificado: signatureData })
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorId);

      if (error) throw error;

      toast.success('Assinatura do certificado salva!');
      
      if (temAvaliacaoReacao && !avaliacaoReacaoJaRespondida) {
        setCurrentStep('avaliacao_reacao');
      } else {
        setCurrentStep('concluido');
      }
    } catch (error: any) {
      console.error('Erro ao salvar assinatura:', error);
      toast.error('Erro ao salvar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleAvaliacaoComplete = () => {
    setCurrentStep('concluido');
  };

  const handlePularAvaliacao = () => {
    setCurrentStep('concluido');
  };

  const renderStepIndicator = () => {
    const steps = getSteps();
    const currentIndex = getCurrentStepIndex();

    return (
      <div className="flex items-center justify-center mb-6 overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
              index < currentIndex 
                ? 'bg-success/10 text-success' 
                : index === currentIndex 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
            }`}>
              {index < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderProva = () => (
    <div className="space-y-4">
      {!modoProva ? (
        <div className="bg-muted/50 border rounded-lg p-4">
          <p className="text-sm font-medium mb-3">Como deseja registrar a prova?</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setModoProva('todas')}
            >
              <ClipboardList className="h-6 w-6 text-primary" />
              <span className="font-medium">Registrar Todas</span>
              <span className="text-xs text-muted-foreground">Responder todas as questões</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setModoProva('incorretas');
                setQuestoesIncorretas([]);
              }}
            >
              <XCircle className="h-6 w-6 text-destructive" />
              <span className="font-medium">Registrar Incorretas</span>
              <span className="text-xs text-muted-foreground">Apenas as questões erradas</span>
            </Button>
          </div>
        </div>
      ) : modoProva === 'todas' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Responda todas as questões:</p>
            <Button variant="ghost" size="sm" onClick={() => setModoProva(null)}>
              Voltar
            </Button>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {questoes.map((q) => (
              <div key={q.id} className="border rounded-lg p-4 bg-white dark:bg-background">
                <p className="font-medium text-sm mb-3">
                  {q.numero}. {q.pergunta}
                </p>
                <div className="space-y-2">
                  {q.alternativas.map((alt) => (
                    <label
                      key={alt.id}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm ${
                        respostas[q.id] === alt.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`questao-${q.id}`}
                        checked={respostas[q.id] === alt.id}
                        onChange={() => setRespostas(prev => ({ ...prev, [q.id]: alt.id }))}
                        className="text-primary"
                      />
                      <span className="font-medium">{alt.letra})</span> {alt.texto}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Respondidas: {Object.keys(respostas).length}/{questoes.length}
            </p>
            <Button
              className="w-full"
              onClick={handleSalvarProva}
              disabled={loading || questoes.length === 0 || Object.keys(respostas).length !== questoes.length}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Salvar Prova e Ver Resultado
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Selecione as questões incorretas:</p>
            <Button variant="ghost" size="sm" onClick={() => setModoProva(null)}>
              Voltar
            </Button>
          </div>

          <div className="bg-success/5 border border-success/20 rounded-lg p-3">
            <p className="text-xs text-success">
              As questões não selecionadas serão consideradas corretas automaticamente.
            </p>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {questoesIncorretas.map((item, index) => {
              const questaoSelecionada = questoes.find(q => q.id === item.questaoId);
              const alternativasIncorretas = questaoSelecionada?.alternativas.filter(a => !a.correta) || [];
              
              return (
                <div key={index} className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <select
                      className="w-full p-2 border rounded-md text-sm bg-background"
                      value={item.questaoId}
                      onChange={(e) => {
                        const newIncorretas = [...questoesIncorretas];
                        newIncorretas[index] = { questaoId: e.target.value, alternativaId: '' };
                        setQuestoesIncorretas(newIncorretas);
                      }}
                    >
                      <option value="">Selecione a questão...</option>
                      {questoes.filter(q => !questoesIncorretas.some((i, idx) => idx !== index && i.questaoId === q.id)).map(q => (
                        <option key={q.id} value={q.id}>
                          {q.numero}. {q.pergunta.substring(0, 50)}...
                        </option>
                      ))}
                    </select>
                    <select
                      className="w-full p-2 border rounded-md text-sm bg-background"
                      value={item.alternativaId}
                      onChange={(e) => {
                        const newIncorretas = [...questoesIncorretas];
                        newIncorretas[index].alternativaId = e.target.value;
                        setQuestoesIncorretas(newIncorretas);
                      }}
                      disabled={!item.questaoId}
                    >
                      <option value="">Alternativa marcada...</option>
                      {alternativasIncorretas.map(alt => (
                        <option key={alt.id} value={alt.id}>
                          {alt.letra}) {alt.texto.substring(0, 30)}...
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setQuestoesIncorretas(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuestoesIncorretas(prev => [...prev, { questaoId: '', alternativaId: '' }])}
            disabled={questoesIncorretas.length >= questoes.length}
          >
            + Adicionar questão incorreta
          </Button>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Questões incorretas: {questoesIncorretas.filter(i => i.questaoId && i.alternativaId).length}
            </p>
            <Button
              className="w-full"
              onClick={handleSalvarProva}
              disabled={loading || questoes.length === 0 || questoesIncorretas.some(i => i.questaoId && !i.alternativaId)}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Salvar Prova e Ver Resultado
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderResultado = () => (
    <div className="space-y-6 text-center">
      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
        resultado === 'aprovado' ? 'bg-success/10' : resultado === 'aguardando' ? 'bg-warning/10' : 'bg-destructive/10'
      }`}>
        {resultado === 'aprovado' ? (
          <CheckCircle2 className="h-10 w-10 text-success" />
        ) : resultado === 'aguardando' ? (
          <AlertTriangle className="h-10 w-10 text-warning" />
        ) : (
          <XCircle className="h-10 w-10 text-destructive" />
        )}
      </div>

      <div>
        <h3 className="text-2xl font-bold mb-2">{colaboradorNome}</h3>
        <Badge className={
          resultado === 'aprovado' ? 'bg-success' : resultado === 'aguardando' ? 'bg-warning' : 'bg-destructive'
        }>
          {resultado === 'aprovado' ? 'APROVADO' : resultado === 'aguardando' ? 'AGUARDANDO REORIENTAÇÃO' : 'REPROVADO'}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-primary">{nota}</p>
            <p className="text-xs text-muted-foreground">Nota</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-success">{acertos}</p>
            <p className="text-xs text-muted-foreground">Acertos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-destructive">{totalQuestoes - acertos}</p>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
      </div>

      {resultado === 'aguardando' && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-left">
          <p className="text-sm font-medium text-warning mb-2">Reorientação Necessária</p>
          <p className="text-xs text-muted-foreground">
            O colaborador obteve nota entre 7 e 9. É necessário realizar a reorientação sobre as questões erradas e coletar a assinatura.
          </p>
        </div>
      )}

      {resultado === 'reprovado' && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-left">
          <p className="text-sm font-medium text-destructive mb-2">Colaborador Reprovado</p>
          <p className="text-xs text-muted-foreground">
            O colaborador obteve nota inferior a 7 e foi reprovado. Será necessário refazer o treinamento.
          </p>
        </div>
      )}

      <Button onClick={handleAvancarDoResultado} className="w-full">
        {resultado === 'reprovado' ? 'Finalizar' : 'Continuar'}
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  const renderReorientacao = () => (
    <div className="space-y-4">
      {/* Card de Informações do Colaborador */}
      <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Colaborador</p>
            <p className="font-medium">{colaboradorNome}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CPF</p>
            <p className="font-medium">{colaboradorCpf || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Empresa</p>
            <p className="font-medium">{clienteNome}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Treinamento</p>
            <p className="font-medium">{treinamentoNorma} - {treinamentoNome}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data</p>
            <p className="font-medium">{dataInicio || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Resultado</p>
            <p className="font-medium text-warning">{nota}/10</p>
          </div>
        </div>
      </div>

      {/* Título de Reorientação */}
      <div className="text-center py-2 border-b">
        <h3 className="font-semibold text-lg">📋 Termo de Reorientação</h3>
      </div>

      {/* Questões Incorretas */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <XCircle className="h-5 w-5 text-destructive" />
          <h4 className="font-semibold text-destructive">
            Questões Incorretas ({questoesErradasParaReorientacao.length})
          </h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Revise as questões que o colaborador errou e entenda a resposta correta
        </p>

        <div className="space-y-4 max-h-[300px] overflow-y-auto">
          {questoesErradasParaReorientacao.map((q, index) => {
            const questaoOriginal = questoes.find(qo => qo.id === q.questaoId);
            const alternativaErrada = questaoOriginal?.alternativas.find(a => a.letra === q.respostaErrada);
            const alternativaCorreta = questaoOriginal?.alternativas.find(a => a.letra === q.respostaCorreta);
            
            return (
              <div key={index} className="border rounded-lg p-4 bg-muted/50">
                {/* Pergunta */}
                <p className="font-medium text-sm mb-3">
                  {questaoOriginal?.numero || index + 1}. {q.pergunta}
                </p>

                {/* Resposta do colaborador (errada) */}
                <div className="mb-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-destructive font-medium mb-1">Resposta do colaborador:</p>
                      <p className="text-sm text-destructive">
                        <span className="font-medium">{q.respostaErrada})</span> {alternativaErrada?.texto || ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resposta correta */}
                <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-success font-medium mb-1">Resposta correta:</p>
                      <p className="text-sm text-success">
                        <span className="font-medium">{q.respostaCorreta})</span> {alternativaCorreta?.texto || ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assinatura */}
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground text-center mb-3">
          Ao assinar, o colaborador confirma que revisou todas as questões incorretas e compreendeu as respostas corretas.
        </p>
        
        <p className="text-sm font-medium mb-2">Assinatura do Colaborador</p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <SignaturePad
            onSave={handleSalvarReorientacao}
            onCancel={() => {}}
          />
        )}
      </div>
    </div>
  );

  const renderAssinaturaCertificado = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Award className="h-12 w-12 text-success" />
          </div>
          <CardTitle>Assinatura do Certificado</CardTitle>
          <CardDescription>
            Colete a assinatura do colaborador para o certificado de conclusão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-success/5 border border-success/20 rounded-lg p-4 mb-4 text-center">
            <p className="text-sm font-medium text-success">Colaborador Aprovado!</p>
            <p className="text-xs text-muted-foreground mt-1">
              {colaboradorNome} - Nota: {nota}/10
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <SignaturePad
              onSave={handleSalvarAssinaturaCertificado}
              onCancel={() => {}}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderAvaliacaoReacao = () => (
    <div className="space-y-4">
      <AvaliacaoReacaoForm
        turmaId={turmaId}
        colaboradorId={colaboradorId}
        treinamentoId={treinamentoId}
        onComplete={handleAvaliacaoComplete}
        onSkip={handlePularAvaliacao}
      />
    </div>
  );

  const renderConcluido = () => (
    <div className="space-y-6 text-center py-8">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10">
        <CheckCircle2 className="h-10 w-10 text-success" />
      </div>

      <div>
        <h3 className="text-2xl font-bold mb-2">Processo Concluído!</h3>
        <p className="text-muted-foreground">
          Todas as etapas foram finalizadas com sucesso para {colaboradorNome}.
        </p>
      </div>

      <div className="bg-success/5 border border-success/20 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Nota</p>
            <p className="font-bold text-success">{nota}/10</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-bold text-success">Aprovado</p>
          </div>
        </div>
      </div>

      <Button onClick={onComplete} className="w-full">
        <Check className="h-4 w-4 mr-2" />
        Finalizar
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderStepIndicator()}
      
      {currentStep === 'prova' && renderProva()}
      {currentStep === 'resultado' && renderResultado()}
      {currentStep === 'reorientacao' && renderReorientacao()}
      {currentStep === 'assinatura_certificado' && renderAssinaturaCertificado()}
      {currentStep === 'avaliacao_reacao' && renderAvaliacaoReacao()}
      {currentStep === 'concluido' && renderConcluido()}
    </div>
  );
}
