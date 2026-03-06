import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  GraduationCap,
  User,
  Calendar,
  Clock,
  FileCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://xraggzqaddfiymqgrtha.supabase.co'}/functions/v1/validacao-digital-certificado`;

type Step = 'captcha' | 'identify' | 'quiz' | 'certificate' | 'error';

interface QuizOption {
  id: string;
  label: string;
}

interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

interface CertificadoData {
  colaborador_nome: string;
  colaborador_cpf: string;
  empresa_nome: string;
  treinamento_nome: string;
  treinamento_norma: string;
  instrutor_nome: string;
  tipo_treinamento: string;
  carga_horaria: number | null;
  data_inicio: string;
  data_fim: string;
  data_emissao: string;
  data_validade: string;
  arquivo_url: string | null;
  empresa_sst_nome: string;
  empresa_sst_logo: string | null;
  empresa_sst_cnpj: string | null;
  responsavel_tecnico_nome: string | null;
  responsavel_tecnico_cargo: string | null;
  responsavel_tecnico_registro: string | null;
  assinatura_responsavel: string | null;
  observacoes: string | null;
}

async function callEdgeFunction(body: Record<string, unknown>) {
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro no servidor');
  return data;
}

export default function ValidacaoDigitalCertificado() {
  const { token } = useParams<{ token: string }>();

  const [step, setStep] = useState<Step>('captcha');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // Identify step
  const [cpf, setCpf] = useState('');
  const [dataTreinamento, setDataTreinamento] = useState('');

  // Quiz step
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>('');

  // Certificate step
  const [certificado, setCertificado] = useState<CertificadoData | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);

  const formatCPFInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };

  const handleCaptchaSuccess = () => {
    setStep('identify');
  };

  const handleIdentify = async () => {
    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      setErrorMsg('CPF inválido. Informe os 11 dígitos.');
      return;
    }
    if (!dataTreinamento) {
      setErrorMsg('Informe a data do treinamento.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const result = await callEdgeFunction({
        action: 'verify-identity',
        token,
        cpf: cpfClean,
        data_treinamento: dataTreinamento
      });

      setQuizQuestions(result.questions || []);
      setSessionToken(result.session_token || '');
      setStep('quiz');
    } catch (error: any) {
      setErrorMsg(error.message || 'Erro ao verificar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSubmit = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // Build answers map: question index -> selected option ID
      const answersPayload: Record<string, string> = {};
      quizQuestions.forEach((q, i) => {
        const selectedId = quizAnswers[i];
        if (q.question.includes('empresa')) answersPayload.empresa = selectedId;
        else if (q.question.includes('treinamento')) answersPayload.treinamento = selectedId;
        else if (q.question.includes('instrutor')) answersPayload.instrutor = selectedId;
      });

      const result = await callEdgeFunction({
        action: 'verify-quiz',
        session_token: sessionToken,
        answers: answersPayload
      });

      if (result.passed) {
        setQuizPassed(true);
        setQuizSubmitted(true);
        setCertificado(result.certificado);
        setTimeout(() => {
          setStep('certificate');
        }, 1500);
      } else {
        setQuizPassed(false);
        setQuizSubmitted(true);
      }
    } catch (error: any) {
      setQuizPassed(false);
      setQuizSubmitted(true);
      setErrorMsg(error.message || 'Erro ao verificar respostas.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizPassed(false);
    setErrorMsg('');
  };

  const allQuizAnswered = quizQuestions.length > 0 && quizQuestions.every((_, i) => quizAnswers[i] !== undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-primary/10 rounded-full p-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800">Validação Digital de Certificado</h1>
            <p className="text-xs text-slate-500">Verifique a autenticidade do seu certificado de treinamento</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Verificação', 'Identificação', 'Quiz', 'Certificado'].map((label, i) => {
            const stepMap: Step[] = ['captcha', 'identify', 'quiz', 'certificate'];
            const currentIdx = stepMap.indexOf(step);
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone ? 'bg-green-500 text-white' : isActive ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {isDone ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${isActive ? 'text-primary font-medium' : 'text-slate-400'}`}>{label}</span>
                {i < 3 && <div className={`w-8 h-0.5 ${isDone ? 'bg-green-500' : 'bg-slate-200'}`} />}
              </div>
            );
          })}
        </div>

        {/* Error state */}
        {step === 'error' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Link Inválido</h2>
            <p className="text-slate-500">{errorMsg}</p>
          </div>
        )}

        {/* Step 1: Captcha */}
        {step === 'captcha' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Verificação de Segurança</h2>
              <p className="text-sm text-slate-500">Complete a verificação abaixo para continuar</p>
            </div>
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  handleCaptchaSuccess();
                }}
                onError={() => setCaptchaToken(null)}
                options={{ theme: 'light', size: 'normal' }}
              />
            </div>
          </div>
        )}

        {/* Step 2: Identify */}
        {step === 'identify' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <User className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Identificação</h2>
              <p className="text-sm text-slate-500">Informe seus dados para localizar seu certificado</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="cpf" className="text-sm font-medium">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPFInput(e.target.value))}
                  className="mt-1"
                  maxLength={14}
                />
              </div>
              <div>
                <Label htmlFor="data" className="text-sm font-medium">Data do Treinamento</Label>
                <Input
                  id="data"
                  type="date"
                  value={dataTreinamento}
                  onChange={(e) => setDataTreinamento(e.target.value)}
                  className="mt-1"
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={handleIdentify}
                disabled={loading || cpf.replace(/\D/g, '').length !== 11 || !dataTreinamento}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Quiz */}
        {step === 'quiz' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="bg-amber-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <GraduationCap className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Verificação de Identidade</h2>
              <p className="text-sm text-slate-500">Responda corretamente para acessar seu certificado</p>
            </div>

            <div className="space-y-6">
              {quizQuestions.map((q, qIdx) => (
                <div key={qIdx} className="space-y-3">
                  <p className="font-medium text-slate-700">{qIdx + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const isSelected = quizAnswers[qIdx] === opt.id;
                      let borderClass = 'border-slate-200 hover:border-primary/50';
                      if (isSelected && !quizSubmitted) borderClass = 'border-primary bg-primary/5';
                      if (quizSubmitted && isSelected && !quizPassed) borderClass = 'border-red-500 bg-red-50';
                      if (quizSubmitted && isSelected && quizPassed) borderClass = 'border-green-500 bg-green-50';

                      return (
                        <button
                          key={opt.id}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${borderClass} ${quizSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                          onClick={() => {
                            if (!quizSubmitted) {
                              setQuizAnswers(prev => ({ ...prev, [qIdx]: opt.id }));
                            }
                          }}
                          disabled={quizSubmitted}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-primary' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                            </div>
                            <span>{opt.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {quizSubmitted && !quizPassed && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-red-700">Respostas incorretas. Tente novamente.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleRetryQuiz}>
                    Tentar Novamente
                  </Button>
                </div>
              )}

              {quizSubmitted && quizPassed && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-700">
                    {loading ? 'Carregando certificado...' : 'Verificação concluída com sucesso!'}
                  </p>
                  {loading && <Loader2 className="h-5 w-5 animate-spin text-green-500 mx-auto mt-2" />}
                </div>
              )}

              {!quizSubmitted && (
                <Button 
                  className="w-full" 
                  onClick={handleQuizSubmit}
                  disabled={!allQuizAnswered || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar Respostas'
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Certificate */}
        {step === 'certificate' && certificado && (
          <div className="max-w-3xl mx-auto">
            {/* Validated badge */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <div className="bg-green-500 rounded-full p-2">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-green-800">Certificado Validado Digitalmente</p>
                <p className="text-xs text-green-600">Este certificado foi verificado e é autêntico.</p>
              </div>
            </div>

            {/* ICP-Brasil badge */}
            {certificado.observacoes?.includes('ICP-Brasil') && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                <div className="bg-blue-600 rounded-full p-2">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-blue-800">Assinatura Digital ICP-Brasil</p>
                  <p className="text-xs text-blue-600">
                    Documento assinado digitalmente com certificado A1 ICP-Brasil, conforme MP 2.200-2/2001 e Portaria 211/2019.
                  </p>
                </div>
              </div>
            )}

            {/* Certificate info card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
              {/* Header with logo */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-300 uppercase tracking-wider mb-1">Certificado de Treinamento</p>
                    <h2 className="text-xl font-bold">NR-{certificado.treinamento_norma} - {certificado.treinamento_nome}</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      {certificado.tipo_treinamento === 'reciclagem' ? 'Reciclagem' : 'Formação'}
                    </p>
                  </div>
                  {certificado.empresa_sst_logo && (
                    <img 
                      src={certificado.empresa_sst_logo} 
                      alt="Logo" 
                      className="h-14 max-w-[120px] object-contain rounded bg-white/10 p-1"
                    />
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Participante</p>
                      <p className="font-semibold text-slate-800">{certificado.colaborador_nome}</p>
                      <p className="text-xs text-slate-500">CPF: {certificado.colaborador_cpf}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Empresa</p>
                      <p className="font-semibold text-slate-800">{certificado.empresa_nome}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Instrutor</p>
                      <p className="font-semibold text-slate-800">{certificado.instrutor_nome || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Carga Horária</p>
                      <p className="font-semibold text-slate-800">{certificado.carga_horaria ? `${certificado.carga_horaria}h` : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Período</p>
                      <p className="font-semibold text-slate-800">
                        {certificado.data_inicio ? format(parseISO(certificado.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        {certificado.data_fim && certificado.data_fim !== certificado.data_inicio && (
                          <span> a {format(parseISO(certificado.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileCheck className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Validade</p>
                      <p className="font-semibold text-slate-800">
                        {certificado.data_validade ? format(parseISO(certificado.data_validade), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Certificate PDF pages */}
                {certificado.arquivo_url && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-slate-700">Certificado</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPaginaAtual(0)}
                          disabled={paginaAtual === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-slate-500">
                          Página {paginaAtual + 1} de 2
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPaginaAtual(1)}
                          disabled={paginaAtual === 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="bg-slate-100 rounded-lg p-2">
                      <iframe 
                        src={`${certificado.arquivo_url}#page=${paginaAtual + 1}`}
                        className="w-full rounded border bg-white"
                        style={{ height: '500px' }}
                        title={`Certificado - Página ${paginaAtual + 1}`}
                      />
                    </div>
                  </div>
                )}

                {!certificado.arquivo_url && (
                  <div className="border-t pt-4 mt-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                      <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm text-amber-700">O arquivo PDF do certificado ainda não foi gerado para este colaborador.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Company info */}
              <div className="bg-slate-50 border-t p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Emitido por</p>
                    <p className="font-bold text-slate-800">{certificado.empresa_sst_nome}</p>
                    {certificado.empresa_sst_cnpj && (
                      <p className="text-xs text-slate-500">CNPJ: {certificado.empresa_sst_cnpj}</p>
                    )}
                  </div>
                  {certificado.empresa_sst_logo && (
                    <img 
                      src={certificado.empresa_sst_logo} 
                      alt="Logo empresa" 
                      className="h-10 max-w-[100px] object-contain"
                    />
                  )}
                </div>

                {certificado.responsavel_tecnico_nome && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-4">
                      {certificado.assinatura_responsavel && (
                        <img 
                          src={certificado.assinatura_responsavel} 
                          alt="Assinatura" 
                          className="h-12 object-contain"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-slate-700">{certificado.responsavel_tecnico_nome}</p>
                        {certificado.responsavel_tecnico_cargo && (
                          <p className="text-xs text-slate-500">{certificado.responsavel_tecnico_cargo}</p>
                        )}
                        {certificado.responsavel_tecnico_registro && (
                          <p className="text-xs text-slate-500">{certificado.responsavel_tecnico_registro}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <ShieldCheck className="h-4 w-4" />
                    <p className="text-xs font-medium">Certificado validado digitalmente</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Verificação realizada em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
