import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignaturePad } from '@/components/ui/signature-pad';
import { AvaliacaoReacaoForm } from '@/components/avaliacao/AvaliacaoReacaoForm';
import { toast } from 'sonner';
import { Loader2, ClipboardList, User, CheckCircle, AlertCircle, AlertTriangle, XCircle, CheckCircle2, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Alternativa {
  id: string;
  letra: string;
  texto: string;
  correta: boolean;
}

interface Questao {
  id: string;
  numero: number;
  tipo_questao: 'selecao' | 'vf';
  pergunta: string;
  alternativas: Alternativa[];
}

interface ProvaInfo {
  id: string;
  tipo: string;
  total_questoes: number;
}

interface TurmaInfo {
  id: string;
  codigo_turma: string;
  treinamento_id: string;
  treinamento_nome: string;
  treinamento_norma: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_cnpj: string | null;
  cliente_razao_social: string | null;
  empresa_id: string;
  empresa_sst_cnpj: string | null;
  empresa_sst_razao_social: string | null;
  instrutor_id: string | null;
  instrutor_nome: string | null;
  instrutor_email: string | null;
  instrutor_cpf: string | null;
  instrutor_telefone: string | null;
  instrutor_formacao: string | null;
}

interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
}

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
  colaborador_nome: string;
  colaborador_cpf: string;
  empresa_nome: string;
  treinamento_nome: string;
  data_treinamento: string;
  nota: number;
  total_questoes: number;
  acertos: number;
  questoes_incorretas: QuestaoIncorreta[];
  texto_reorientacao: string;
}

type TipoProva = 'pre_teste' | 'pos_teste';
type StepType = 'identificacao' | 'prova' | 'resultado' | 'reorientacao' | 'assinatura_certificado' | 'avaliacao_reacao';

// Função para detectar sistema operacional corretamente
const detectOS = (userAgent: string): string => {
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Mac OS|Macintosh/i.test(userAgent)) return 'macOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Desconhecido';
};

// Função para detectar navegador
const detectBrowser = (userAgent: string): string => {
  if (/Edg/i.test(userAgent)) return 'Edge';
  if (/OPR|Opera/i.test(userAgent)) return 'Opera';
  if (/Chrome/i.test(userAgent)) return 'Chrome';
  if (/Firefox/i.test(userAgent)) return 'Firefox';
  if (/Safari/i.test(userAgent)) return 'Safari';
  return 'Desconhecido';
};

// Função para buscar IP público com timeout
const fetchPublicIP = async (): Promise<string | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos de timeout
  
  try {
    const response = await fetch('https://api.ipify.org?format=json', { 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    return data.ip || null;
  } catch {
    clearTimeout(timeoutId);
    // Tentar fallback com timeout
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 3000);
    try {
      const response = await fetch('https://ipapi.co/json/', { 
        signal: controller2.signal 
      });
      clearTimeout(timeoutId2);
      const data = await response.json();
      return data.ip || null;
    } catch {
      clearTimeout(timeoutId2);
      return null;
    }
  }
};

// Função para obter informações do dispositivo (não bloqueia se IP falhar)
const getDeviceInfo = async () => {
  const userAgent = navigator.userAgent || 'Unknown';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
  
  // Buscar IP em paralelo mas não esperar muito
  let ip: string | null = null;
  try {
    ip = await fetchPublicIP();
  } catch {
    ip = null;
  }
  
  return {
    userAgent: userAgent.substring(0, 500), // Limitar tamanho do userAgent
    dispositivo: isMobile ? 'Mobile' : 'Desktop',
    navegador: detectBrowser(userAgent),
    sistemaOperacional: detectOS(userAgent),
    ip
  };
};

export default function ProvaTurma() {
  const { turmaId } = useParams<{ turmaId: string }>();
  
  const [step, setStep] = useState<StepType>('identificacao');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [turma, setTurma] = useState<TurmaInfo | null>(null);
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [provaId, setProvaId] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  
  const [cpf, setCpf] = useState('');
  const [tipoProva, setTipoProva] = useState<TipoProva>('pre_teste');
  
  const [resultado, setResultado] = useState<{ nota: number; acertos: number; total: number } | null>(null);
  
  // Reorientação states
  const [reorientacaoData, setReorientacaoData] = useState<ReorientacaoData | null>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [savingReorientacao, setSavingReorientacao] = useState(false);
  const [turmaProvaId, setTurmaProvaId] = useState<string | null>(null);

  // Assinatura certificado states
  const [savingAssinaturaCertificado, setSavingAssinaturaCertificado] = useState(false);

  // Estados para acumular dados antes de salvar tudo no final
  const [dadosProvaAcumulados, setDadosProvaAcumulados] = useState<{
    nota: number;
    acertos: number;
    totalQuestoes: number;
    respostasDetalhadas: Record<string, any>;
    resultadoProva: string | null;
  } | null>(null);
  const [assinaturaReorientacao, setAssinaturaReorientacao] = useState<string | null>(null);
  const [assinaturaCertificado, setAssinaturaCertificado] = useState<string | null>(null);
  const [avaliacaoReacaoRespostas, setAvaliacaoReacaoRespostas] = useState<any>(null);
  const [salvandoTudo, setSalvandoTudo] = useState(false);

  useEffect(() => {
    if (turmaId) {
      fetchTurmaInfo();
    }
  }, [turmaId]);

  const fetchTurmaInfo = async () => {
    try {
      // Buscar turma sem join com clientes_sst (que tem política RESTRICTIVE)
      const { data, error } = await supabase
        .from('turmas_treinamento')
        .select(`
          id,
          codigo_turma,
          treinamento_id,
          cliente_id,
          empresa_id,
          instrutor_id,
          treinamento:catalogo_treinamentos(nome, norma)
        `)
        .eq('id', turmaId)
        .single();

      if (error) throw error;

      if (data) {
        // Buscar nome do cliente e cliente_empresa_id separadamente
        let clienteNome = '';
        let clienteEmpresaId: string | null = null;
        if (data.cliente_id) {
          const { data: clienteData } = await supabase
            .from('clientes_sst')
            .select('nome, cliente_empresa_id')
            .eq('id', data.cliente_id)
            .single();
          clienteNome = clienteData?.nome || '';
          clienteEmpresaId = clienteData?.cliente_empresa_id || null;
        }

        // Buscar dados da empresa SST (CNPJ e razão social)
        let empresaSstCnpj: string | null = null;
        let empresaSstRazaoSocial: string | null = null;
        if (data.empresa_id) {
          const { data: empresaSstData } = await supabase
            .from('empresas')
            .select('cnpj, razao_social')
            .eq('id', data.empresa_id)
            .single();
          empresaSstCnpj = empresaSstData?.cnpj || null;
          empresaSstRazaoSocial = empresaSstData?.razao_social || null;
        }

        // Buscar dados da empresa cliente (CNPJ e razão social)
        let clienteCnpj: string | null = null;
        let clienteRazaoSocial: string | null = null;
        if (clienteEmpresaId) {
          const { data: clienteEmpresaData } = await supabase
            .from('empresas')
            .select('cnpj, razao_social')
            .eq('id', clienteEmpresaId)
            .single();
          clienteCnpj = clienteEmpresaData?.cnpj || null;
          clienteRazaoSocial = clienteEmpresaData?.razao_social || null;
        }

        // Buscar dados do instrutor separadamente (tabela instrutores)
        let instrutorNome: string | null = null;
        let instrutorEmail: string | null = null;
        let instrutorCpf: string | null = null;
        let instrutorTelefone: string | null = null;
        let instrutorFormacao: string | null = null;
        if (data.instrutor_id) {
          const { data: instrutorData } = await supabase
            .from('instrutores')
            .select('nome, email, cpf_cnpj, telefone, formacao_academica')
            .eq('id', data.instrutor_id)
            .single();
          instrutorNome = instrutorData?.nome || null;
          instrutorEmail = instrutorData?.email || null;
          instrutorCpf = instrutorData?.cpf_cnpj || null;
          instrutorTelefone = instrutorData?.telefone || null;
          instrutorFormacao = instrutorData?.formacao_academica || null;
        }

        setTurma({
          id: data.id,
          codigo_turma: data.codigo_turma || '',
          treinamento_id: data.treinamento_id,
          treinamento_nome: (data.treinamento as any)?.nome || '',
          treinamento_norma: (data.treinamento as any)?.norma || '',
          cliente_id: data.cliente_id,
          cliente_nome: clienteNome,
          cliente_cnpj: clienteCnpj,
          cliente_razao_social: clienteRazaoSocial,
          empresa_id: data.empresa_id,
          empresa_sst_cnpj: empresaSstCnpj,
          empresa_sst_razao_social: empresaSstRazaoSocial,
          instrutor_id: data.instrutor_id,
          instrutor_nome: instrutorNome,
          instrutor_email: instrutorEmail,
          instrutor_cpf: instrutorCpf,
          instrutor_telefone: instrutorTelefone,
          instrutor_formacao: instrutorFormacao
        });
      }
    } catch (error) {
      console.error('Erro ao buscar turma:', error);
      toast.error('Turma não encontrada');
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleIdentificacao = async () => {
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      toast.error('Digite um CPF válido');
      return;
    }

    setLoading(true);
    try {
      const cpfLimpo = cpf.replace(/\D/g, '');
      
      // Buscar colaborador pelo CPF que está na turma
      const { data: turmaColaboradores, error: tcError } = await supabase
        .from('turma_colaboradores')
        .select(`
          colaborador_id,
          colaborador:colaboradores(id, nome, cpf)
        `)
        .eq('turma_id', turmaId);

      if (tcError) throw tcError;

      const colaboradorEncontrado = turmaColaboradores?.find(
        (tc: any) => tc.colaborador?.cpf?.replace(/\D/g, '') === cpfLimpo
      );

      if (!colaboradorEncontrado) {
        toast.error('CPF não encontrado nesta turma. Verifique se você está inscrito.');
        setLoading(false);
        return;
      }

      // Verificar se já fez esta prova
      const { data: provaExistente } = await supabase
        .from('turma_provas')
        .select('id, acertos, nota')
        .eq('turma_id', turmaId)
        .eq('colaborador_id', (colaboradorEncontrado.colaborador as any).id)
        .eq('tipo_prova', tipoProva)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (provaExistente) {
        // Pré-teste: só pode fazer uma vez
        if (tipoProva === 'pre_teste') {
          toast.error('Você já realizou o Pré-Teste desta turma.');
          setLoading(false);
          return;
        }
        
        // Pós-teste: pode refazer se nota < 7 (acertos < 7)
        // A nota é o número de acertos (cada questão vale 1 ponto)
        const acertosProva = provaExistente.acertos ?? Math.floor(provaExistente.nota);
        if (acertosProva >= 7) {
          // Colaborador aprovado - verificar etapas pendentes
          const colaboradorId = (colaboradorEncontrado.colaborador as any).id;
          
          // Buscar dados do colaborador na turma
          const { data: turmaColabData } = await supabase
            .from('turma_colaboradores')
            .select('reorientado, assinatura_certificado, resultado')
            .eq('turma_id', turmaId)
            .eq('colaborador_id', colaboradorId)
            .single();

          // Verificar se tem avaliação de reação
          const { data: avaliacaoReacao } = await supabase
            .from('avaliacoes_reacao')
            .select('id')
            .eq('turma_id', turmaId)
            .eq('colaborador_id', colaboradorId)
            .limit(1)
            .maybeSingle();

          // Verificar se precisa de reorientação (nota 7-9) e se já fez
          const precisaReorientacao = acertosProva >= 7 && acertosProva < 10;
          const fezReorientacao = turmaColabData?.reorientado === true;
          
          // Verificar assinatura do certificado
          const temAssinaturaCertificado = !!turmaColabData?.assinatura_certificado;
          
          // Verificar avaliação de reação
          const temAvaliacaoReacao = !!avaliacaoReacao;

          // Montar lista de etapas pendentes
          const etapasPendentes: string[] = [];
          
          if (precisaReorientacao && !fezReorientacao) {
            etapasPendentes.push('Reorientação');
          }
          if (!temAssinaturaCertificado) {
            etapasPendentes.push('Assinatura do Certificado');
          }
          if (!temAvaliacaoReacao) {
            etapasPendentes.push('Avaliação de Reação');
          }

          // Se todas as etapas estão completas
          if (etapasPendentes.length === 0) {
            toast.error('Você já completou todas as etapas! Prova realizada, certificado assinado e avaliação de reação preenchida.');
            setLoading(false);
            return;
          }

          // Setar colaborador e redirecionar para a próxima etapa pendente
          setColaborador({
            id: colaboradorId,
            nome: (colaboradorEncontrado.colaborador as any).nome,
            cpf: (colaboradorEncontrado.colaborador as any).cpf
          });

          setTurmaProvaId(provaExistente.id);
          setResultado({ nota: acertosProva, acertos: acertosProva, total: 10 });

          // Redirecionar para a primeira etapa pendente
          if (precisaReorientacao && !fezReorientacao) {
            // Buscar dados para reorientação
            const { data: provaDetalhes } = await supabase
              .from('turma_provas')
              .select('respostas')
              .eq('id', provaExistente.id)
              .single();

            // Buscar questões da prova para montar reorientação
            const { data: provaData } = await supabase
              .from('provas_treinamento')
              .select('id')
              .eq('treinamento_id', turma?.treinamento_id)
              .eq('tipo', 'pos_teste')
              .eq('ativo', true)
              .single();

            if (provaData) {
              const { data: questoesData } = await supabase
                .from('provas_questoes')
                .select(`
                  id,
                  numero,
                  tipo_questao,
                  pergunta,
                  alternativas:provas_alternativas(id, letra, texto, correta)
                `)
                .eq('prova_id', provaData.id)
                .order('numero');

              if (questoesData && provaDetalhes?.respostas) {
                const questoesIncorretas: QuestaoIncorreta[] = [];
                const respostasObj = provaDetalhes.respostas as Record<string, { resposta: string; correta: string; acertou: boolean }>;

                questoesData.forEach((q: any) => {
                  const respostaInfo = respostasObj[q.id];
                  if (respostaInfo && !respostaInfo.acertou) {
                    const alternativaCorreta = q.alternativas?.find((a: any) => a.correta);
                    const alternativaSelecionada = q.alternativas?.find((a: any) => a.letra === respostaInfo.resposta);
                    
                    questoesIncorretas.push({
                      questao_id: q.id,
                      numero: q.numero,
                      pergunta: q.pergunta,
                      alternativa_selecionada: respostaInfo.resposta,
                      alternativa_selecionada_texto: alternativaSelecionada?.texto || '',
                      alternativa_correta: alternativaCorreta?.letra || '',
                      alternativa_correta_texto: alternativaCorreta?.texto || '',
                      alternativas_erradas: (q.alternativas || [])
                        .filter((a: any) => !a.correta)
                        .map((a: any) => ({ letra: a.letra, texto: a.texto }))
                    });
                  }
                });

                // Buscar texto de reorientação
                let textoReorientacao = '';
                try {
                  const { data: turmaData } = await supabase
                    .from('turmas_treinamento')
                    .select('empresa_id')
                    .eq('id', turmaId)
                    .single();

                  if (turmaData?.empresa_id) {
                    const { data: declaracaoData } = await supabase
                      .from('declaracoes_reorientacao')
                      .select('texto')
                      .eq('empresa_id', turmaData.empresa_id)
                      .eq('ativo', true)
                      .limit(1)
                      .single();

                    textoReorientacao = declaracaoData?.texto || '';
                  }
                } catch (e) {
                  console.log('Declaração de reorientação não encontrada');
                }

                setReorientacaoData({
                  colaborador_nome: (colaboradorEncontrado.colaborador as any).nome,
                  colaborador_cpf: (colaboradorEncontrado.colaborador as any).cpf,
                  empresa_nome: turma?.cliente_nome || '',
                  treinamento_nome: `${turma?.treinamento_norma} - ${turma?.treinamento_nome}`,
                  data_treinamento: format(new Date(), 'yyyy-MM-dd'),
                  nota: acertosProva,
                  total_questoes: 10,
                  acertos: acertosProva,
                  questoes_incorretas: questoesIncorretas,
                  texto_reorientacao: textoReorientacao
                });
              }
            }

            toast.info(`Etapas pendentes: ${etapasPendentes.join(', ')}`);
            setStep('reorientacao');
            setLoading(false);
            return;
          } else if (!temAssinaturaCertificado) {
            toast.info(`Etapas pendentes: ${etapasPendentes.join(', ')}`);
            setStep('assinatura_certificado');
            setLoading(false);
            return;
          } else if (!temAvaliacaoReacao) {
            toast.info(`Etapa pendente: Avaliação de Reação`);
            setStep('avaliacao_reacao');
            setLoading(false);
            return;
          }
        }
        // Se nota < 7, permite refazer - a prova anterior será substituída
      }

      setColaborador({
        id: (colaboradorEncontrado.colaborador as any).id,
        nome: (colaboradorEncontrado.colaborador as any).nome,
        cpf: (colaboradorEncontrado.colaborador as any).cpf
      });

      // Buscar a prova do treinamento de acordo com o tipo selecionado
      const { data: provaData, error: provaError } = await supabase
        .from('provas_treinamento')
        .select('id, tipo, total_questoes')
        .eq('treinamento_id', turma?.treinamento_id)
        .eq('tipo', tipoProva)
        .eq('ativo', true)
        .single();

      if (provaError || !provaData) {
        toast.error(`Nenhuma prova de ${tipoProva === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'} cadastrada para este treinamento.`);
        setLoading(false);
        return;
      }

      setProvaId(provaData.id);

      // Buscar questões da prova com suas alternativas
      const { data: questoesData, error: questoesError } = await supabase
        .from('provas_questoes')
        .select(`
          id,
          numero,
          tipo_questao,
          pergunta,
          alternativas:provas_alternativas(id, letra, texto, correta)
        `)
        .eq('prova_id', provaData.id)
        .order('numero');

      if (questoesError) throw questoesError;

      if (!questoesData || questoesData.length === 0) {
        toast.error('Nenhuma questão cadastrada para esta prova.');
        setLoading(false);
        return;
      }

      // Formatar questões com alternativas ordenadas
      const questoesFormatadas: Questao[] = questoesData.map((q: any) => ({
        id: q.id,
        numero: q.numero,
        tipo_questao: q.tipo_questao,
        pergunta: q.pergunta,
        alternativas: (q.alternativas || []).sort((a: Alternativa, b: Alternativa) => 
          a.letra.localeCompare(b.letra)
        )
      }));

      setQuestoes(questoesFormatadas);
      setStep('prova');
    } catch (error) {
      console.error('Erro na identificação:', error);
      toast.error('Erro ao verificar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponder = (questaoId: string, resposta: string) => {
    setRespostas(prev => ({ ...prev, [questaoId]: resposta }));
  };

  const handleEnviarProva = async () => {
    // Verificar se todas as questões foram respondidas
    const naoRespondidas = questoes.filter(q => !respostas[q.id]);
    if (naoRespondidas.length > 0) {
      toast.error(`Responda todas as questões. Faltam ${naoRespondidas.length} questão(ões).`);
      return;
    }

    setSubmitting(true);
    try {
      // Calcular nota baseado nas alternativas corretas já carregadas
      let acertos = 0;
      const respostasDetalhadas: Record<string, { resposta: string; correta: string; acertou: boolean }> = {};

      questoes.forEach(q => {
        const respostaUsuario = respostas[q.id];
        const alternativaCorreta = q.alternativas.find(a => a.correta);
        const letraCorreta = alternativaCorreta?.letra || '';
        const acertou = respostaUsuario === letraCorreta;
        if (acertou) acertos++;
        respostasDetalhadas[q.id] = {
          resposta: respostaUsuario,
          correta: letraCorreta,
          acertou
        };
      });

      const totalQuestoes = questoes.length;
      const nota = acertos;

      // Calcular resultado para pós-teste
      let resultadoProva: string | null = null;
      if (tipoProva === 'pos_teste') {
        if (acertos >= 10) resultadoProva = 'aprovado';
        else if (acertos >= 7) resultadoProva = 'aguardando';
        else resultadoProva = 'reprovado';
      }

      // ACUMULAR dados da prova (NÃO SALVAR AINDA)
      setDadosProvaAcumulados({
        nota,
        acertos,
        totalQuestoes,
        respostasDetalhadas,
        resultadoProva
      });

      setResultado({ nota, acertos, total: totalQuestoes });
      
      // Se for PRÉ-TESTE, salvar imediatamente (não tem outras etapas)
      if (tipoProva === 'pre_teste') {
        await salvarTudoNoFinal(nota, acertos, totalQuestoes, respostasDetalhadas, null, null, null, null);
        setStep('resultado');
        toast.success('Pré-Teste enviado com sucesso!');
        return;
      }

      // Se for PÓS-TESTE com nota < 7 (reprovado), salvar imediatamente
      if (tipoProva === 'pos_teste' && acertos < 7) {
        await salvarTudoNoFinal(nota, acertos, totalQuestoes, respostasDetalhadas, 'reprovado', null, null, null);
        setStep('resultado');
        toast.error('Nota insuficiente. Você pode refazer a prova.');
        return;
      }
      
      // Se for pós-teste e acertos entre 7 e 9, mostrar tela de reorientação
      if (tipoProva === 'pos_teste' && acertos >= 7 && acertos < 10) {
        // Preparar dados de reorientação
        const questoesIncorretas: QuestaoIncorreta[] = [];
        
        questoes.forEach(q => {
          const respostaUsuario = respostas[q.id];
          const alternativaCorreta = q.alternativas.find(a => a.correta);
          const alternativaSelecionada = q.alternativas.find(a => a.letra === respostaUsuario);
          
          if (respostaUsuario !== alternativaCorreta?.letra) {
            questoesIncorretas.push({
              questao_id: q.id,
              numero: q.numero,
              pergunta: q.pergunta,
              alternativa_selecionada: respostaUsuario,
              alternativa_selecionada_texto: alternativaSelecionada?.texto || '',
              alternativa_correta: alternativaCorreta?.letra || '',
              alternativa_correta_texto: alternativaCorreta?.texto || '',
              alternativas_erradas: q.alternativas
                .filter(a => !a.correta)
                .map(a => ({ letra: a.letra, texto: a.texto }))
            });
          }
        });

        // Só mostrar reorientação se houver questões incorretas
        if (questoesIncorretas.length > 0) {
          // Buscar texto de reorientação da empresa SST
          let textoReorientacao = '';
          try {
            const { data: turmaData } = await supabase
              .from('turmas_treinamento')
              .select('empresa_id')
              .eq('id', turmaId)
              .single();

            if (turmaData?.empresa_id) {
              const { data: declaracaoData } = await supabase
                .from('declaracoes_reorientacao')
                .select('texto')
                .eq('empresa_id', turmaData.empresa_id)
                .eq('ativo', true)
                .limit(1)
                .single();

              textoReorientacao = declaracaoData?.texto || '';
            }
          } catch (e) {
            console.log('Declaração de reorientação não encontrada');
          }

          setReorientacaoData({
            colaborador_nome: colaborador?.nome || '',
            colaborador_cpf: colaborador?.cpf || '',
            empresa_nome: turma?.cliente_nome || '',
            treinamento_nome: `${turma?.treinamento_norma} - ${turma?.treinamento_nome}`,
            data_treinamento: format(new Date(), 'yyyy-MM-dd'),
            nota,
            total_questoes: totalQuestoes,
            acertos,
            questoes_incorretas: questoesIncorretas,
            texto_reorientacao: textoReorientacao
          });

          setStep('reorientacao');
          toast.info('Por favor, revise as questões incorretas e assine a reorientação.');
          return;
        }
      }
      
      // Se for pós-teste com nota 10, ir para assinatura do certificado
      if (tipoProva === 'pos_teste' && acertos === 10) {
        setStep('assinatura_certificado');
        toast.success('Parabéns! Nota máxima! Agora assine seu certificado.');
        return;
      }
      
    } catch (error) {
      console.error('Erro ao processar prova:', error);
      toast.error('Erro ao processar prova. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Função para salvar TUDO no final (prova, reorientação, assinatura, auditoria)
  const salvarTudoNoFinal = async (
    nota: number,
    acertos: number,
    totalQuestoes: number,
    respostasDetalhadas: Record<string, any>,
    resultadoFinal: string | null,
    assinaturaReorientacaoFinal: string | null,
    assinaturaCertificadoFinal: string | null,
    avaliacaoReacao: any
  ) => {
    if (!turmaId || !colaborador || !turma) {
      throw new Error('Dados incompletos para salvar');
    }

    // 1. Para pós-teste, deletar prova anterior se existir
    if (tipoProva === 'pos_teste') {
      await supabase
        .from('turma_provas')
        .delete()
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaborador.id)
        .eq('tipo_prova', 'pos_teste');
    }

    // 2. Inserir nova prova
    const { data: provaInserida, error: insertError } = await supabase
      .from('turma_provas')
      .insert({
        turma_id: turmaId,
        colaborador_id: colaborador.id,
        tipo_prova: tipoProva,
        nota: nota,
        total_questoes: totalQuestoes,
        acertos: acertos,
        respostas: respostasDetalhadas,
        origem: 'qrcode'
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    const turmaProvaIdFinal = provaInserida?.id;

    // 3. Atualizar turma_colaboradores
    const updateField = tipoProva === 'pre_teste' ? 'nota_pre_teste' : 'nota_pos_teste';
    const updateData: Record<string, any> = { [updateField]: nota };
    
    if (tipoProva === 'pos_teste' && resultadoFinal) {
      updateData.resultado = resultadoFinal;
      if (assinaturaReorientacaoFinal) {
        updateData.reorientado = true;
      }
      if (assinaturaCertificadoFinal) {
        updateData.assinatura_certificado = assinaturaCertificadoFinal;
      }
    }

    await supabase
      .from('turma_colaboradores')
      .update(updateData)
      .eq('turma_id', turmaId)
      .eq('colaborador_id', colaborador.id);

    // 4. Se tiver reorientação, salvar
    if (assinaturaReorientacaoFinal && reorientacaoData && turmaProvaIdFinal) {
      let dataTreinamento = reorientacaoData.data_treinamento;
      try {
        const { data: turmaAulas } = await supabase
          .from('turmas_treinamento_aulas')
          .select('data')
          .eq('turma_id', turmaId)
          .order('data', { ascending: true })
          .limit(1);
        
        if (turmaAulas && turmaAulas.length > 0) {
          dataTreinamento = turmaAulas[0].data;
        }
      } catch (e) {
        console.log('Usando data atual para treinamento');
      }

      await (supabase as any)
        .from('reorientacoes_colaborador')
        .insert({
          turma_id: turmaId,
          colaborador_id: colaborador.id,
          turma_prova_id: turmaProvaIdFinal,
          colaborador_nome: reorientacaoData.colaborador_nome,
          colaborador_cpf: reorientacaoData.colaborador_cpf,
          empresa_nome: reorientacaoData.empresa_nome,
          treinamento_nome: reorientacaoData.treinamento_nome,
          data_treinamento: dataTreinamento,
          nota: reorientacaoData.nota,
          total_questoes: reorientacaoData.total_questoes,
          acertos: reorientacaoData.acertos,
          questoes_incorretas: reorientacaoData.questoes_incorretas,
          texto_reorientacao: reorientacaoData.texto_reorientacao,
          assinatura_digital: assinaturaReorientacaoFinal,
          assinado_em: new Date().toISOString()
        });
    }

    // 5. Registrar auditorias SEPARADAS para cada etapa
    const deviceInfo = await getDeviceInfo();
    
    const baseAuditData = {
      turma_id: turmaId,
      turma_codigo: turma.codigo_turma,
      empresa_id: turma.empresa_id,
      empresa_sst_cnpj: turma.empresa_sst_cnpj,
      empresa_sst_razao_social: turma.empresa_sst_razao_social,
      usuario_id: null,
      usuario_nome: colaborador.nome,
      usuario_role: 'colaborador',
      metodo_origem: 'qrcode',
      fonte: 'qrcode',
      colaborador_id: colaborador.id,
      colaborador_nome: colaborador.nome,
      colaborador_cpf: colaborador.cpf,
      cliente_id: turma.cliente_id,
      cliente_nome: turma.cliente_nome,
      cliente_cnpj: turma.cliente_cnpj,
      cliente_razao_social: turma.cliente_razao_social,
      treinamento_id: turma.treinamento_id,
      treinamento_nome: turma.treinamento_nome,
      treinamento_norma: turma.treinamento_norma,
      instrutor_id: turma.instrutor_id,
      instrutor_nome: turma.instrutor_nome,
      instrutor_email: turma.instrutor_email,
      instrutor_cpf: turma.instrutor_cpf,
      instrutor_telefone: turma.instrutor_telefone,
      instrutor_formacao: turma.instrutor_formacao,
      executado_por: 'colaborador',
      executado_por_nome: colaborador.nome,
      executado_por_id: colaborador.id,
      user_agent: deviceInfo.userAgent,
      dispositivo: deviceInfo.dispositivo,
      navegador: deviceInfo.navegador,
      sistema_operacional: deviceInfo.sistemaOperacional,
      ip_address: deviceInfo.ip
    };

    // LOG 1: Prova realizada
    await (supabase as any).from('turmas_auditoria').insert({
      ...baseAuditData,
      acao: 'criou',
      entidade: 'prova',
      descricao: `${tipoProva === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'} realizado via QR Code pelo colaborador ${colaborador.nome} (CPF: ${colaborador.cpf}). Nota: ${nota}/10. Acertos: ${acertos}/${totalQuestoes}.${resultadoFinal ? ` Resultado: ${resultadoFinal}.` : ''}`
    });

    // LOG 2: Reorientação assinada (se aplicável)
    if (assinaturaReorientacaoFinal && reorientacaoData) {
      await (supabase as any).from('turmas_auditoria').insert({
        ...baseAuditData,
        acao: 'criou',
        entidade: 'reorientacao',
        descricao: `Reorientação assinada via QR Code pelo colaborador ${colaborador.nome} (CPF: ${colaborador.cpf}). Nota: ${reorientacaoData.nota}/10. ${reorientacaoData.questoes_incorretas.length} questão(ões) incorreta(s) revisada(s) e assinada(s) digitalmente.`
      });
    }

    // LOG 3: Assinatura do certificado (se aplicável)
    if (assinaturaCertificadoFinal) {
      await (supabase as any).from('turmas_auditoria').insert({
        ...baseAuditData,
        acao: 'criou',
        entidade: 'assinatura_certificado',
        descricao: `Certificado assinado digitalmente via QR Code pelo colaborador ${colaborador.nome} (CPF: ${colaborador.cpf}). Assinatura coletada para emissão do certificado.`
      });
    }
  };

  // Função para guardar assinatura da reorientação (NÃO SALVA NO BANCO AINDA)
  const handleSaveReorientacao = async (signatureData: string) => {
    if (!reorientacaoData || !turmaId || !colaborador) {
      toast.error('Dados incompletos');
      return;
    }

    // Apenas guardar a assinatura no estado
    setAssinaturaReorientacao(signatureData);
    setSignatureDialogOpen(false);
    
    // Ir para assinatura do certificado
    setStep('assinatura_certificado');
    toast.success('Reorientação assinada! Agora assine seu certificado.');
  };

  // Função para guardar assinatura do certificado (NÃO SALVA NO BANCO AINDA)
  const handleSaveAssinaturaCertificado = async (signatureData: string) => {
    if (!turmaId || !colaborador) {
      toast.error('Dados incompletos');
      return;
    }

    // Apenas guardar a assinatura no estado
    setAssinaturaCertificado(signatureData);
    
    // Ir para avaliação de reação
    setStep('avaliacao_reacao');
    toast.success('Assinatura coletada! Agora responda a avaliação de reação.');
  };

  // Função para finalizar tudo após avaliação de reação
  const handleFinalizarTudo = async (avaliacaoRespostas?: any) => {
    if (!dadosProvaAcumulados || !turmaId || !colaborador || !turma) {
      toast.error('Dados incompletos para finalizar');
      return;
    }

    setSalvandoTudo(true);
    try {
      // Determinar resultado final
      let resultadoFinal = dadosProvaAcumulados.resultadoProva;
      if (assinaturaReorientacao) {
        resultadoFinal = 'aprovado'; // Se assinou reorientação, está aprovado
      }

      // Salvar tudo de uma vez
      await salvarTudoNoFinal(
        dadosProvaAcumulados.nota,
        dadosProvaAcumulados.acertos,
        dadosProvaAcumulados.totalQuestoes,
        dadosProvaAcumulados.respostasDetalhadas,
        resultadoFinal,
        assinaturaReorientacao,
        assinaturaCertificado,
        avaliacaoRespostas || avaliacaoReacaoRespostas
      );

      setStep('resultado');
      toast.success('Processo concluído com sucesso! Todos os dados foram salvos.');
    } catch (error: any) {
      console.error('Erro ao finalizar:', error);
      toast.error('Erro ao salvar dados. Tente novamente.');
    } finally {
      setSalvandoTudo(false);
    }
  };

  // Formatar CPF para exibição
  const formatCPFDisplay = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  if (loading && !turma) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Turma não encontrada</h2>
            <p className="text-muted-foreground">
              O link da prova é inválido ou a turma não existe.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <ClipboardList className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-xl">
              {turma.treinamento_norma} - {turma.treinamento_nome}
            </CardTitle>
            <CardDescription>
              Turma: {turma.codigo_turma} | {turma.cliente_nome}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Step: Identificação */}
        {step === 'identificacao' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Identificação
              </CardTitle>
              <CardDescription>
                Selecione o tipo de prova e informe seu CPF para iniciar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Tipo de Prova</Label>
                <RadioGroup
                  value={tipoProva}
                  onValueChange={(value) => setTipoProva(value as TipoProva)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pre_teste" id="pre_teste" />
                    <Label htmlFor="pre_teste" className="cursor-pointer">Pré-Teste</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pos_teste" id="pos_teste" />
                    <Label htmlFor="pos_teste" className="cursor-pointer">Pós-Teste</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleIdentificacao}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Iniciar Prova'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Prova */}
        {step === 'prova' && colaborador && (
          <>
            <Card className="mb-6 bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <User className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold text-lg">{colaborador.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {tipoProva === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'} - {questoes.length} questões
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {questoes.map((questao) => (
                <Card key={questao.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">
                      {questao.numero}. {questao.pergunta}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={respostas[questao.id] || ''}
                      onValueChange={(value) => handleResponder(questao.id, value)}
                      className="space-y-2"
                    >
                      {questao.alternativas.map((alt) => (
                        <div 
                          key={alt.id} 
                          className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            respostas[questao.id] === alt.letra 
                              ? 'bg-primary/10 border-primary' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleResponder(questao.id, alt.letra)}
                        >
                          <RadioGroupItem value={alt.letra} id={`${questao.id}-${alt.letra}`} />
                          <Label 
                            htmlFor={`${questao.id}-${alt.letra}`} 
                            className="cursor-pointer flex-1"
                          >
                            <span className="font-medium mr-2">{alt.letra})</span>
                            {alt.texto}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}

              <Card className="sticky bottom-4">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">
                      Respondidas: {Object.keys(respostas).length} de {questoes.length}
                    </span>
                    <span className={`text-sm font-medium ${
                      Object.keys(respostas).length === questoes.length 
                        ? 'text-green-600' 
                        : 'text-amber-600'
                    }`}>
                      {Object.keys(respostas).length === questoes.length 
                        ? 'Todas respondidas!' 
                        : `Faltam ${questoes.length - Object.keys(respostas).length}`
                      }
                    </span>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleEnviarProva}
                    disabled={submitting || Object.keys(respostas).length !== questoes.length}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Prova'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Step: Resultado */}
        {step === 'resultado' && resultado && (
          <Card>
            <CardContent className="pt-8 text-center">
              <CheckCircle className={`h-16 w-16 mx-auto mb-4 ${
                resultado.acertos >= 7 ? 'text-green-500' : 'text-amber-500'
              }`} />
              <h2 className="text-2xl font-bold mb-2">Prova Enviada!</h2>
              <p className="text-muted-foreground mb-6">{colaborador?.nome}</p>
              
              <div className="bg-muted rounded-lg p-6 mb-6">
                <p className="text-sm text-muted-foreground mb-1">Sua nota</p>
                <p className={`text-4xl font-bold ${
                  resultado.acertos >= 7 ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {resultado.acertos}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {resultado.acertos} de {resultado.total} questões corretas
                </p>
              </div>

              <p className={`text-sm ${resultado.acertos >= 7 ? 'text-green-600' : 'text-amber-600'}`}>
                {resultado.acertos >= 7 
                  ? '✓ Você atingiu a nota mínima de aprovação (7 acertos)' 
                  : '✗ Nota abaixo do mínimo para aprovação (7 acertos)'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step: Reorientação */}
        {step === 'reorientacao' && reorientacaoData && (
          <div className="space-y-6">
            {/* Card de Informações do Colaborador */}
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                  Reorientação Necessária
                </CardTitle>
                <CardDescription className="text-amber-600">
                  Você foi aprovado, mas precisa revisar algumas questões
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Colaborador</p>
                    <p className="font-medium">{reorientacaoData.colaborador_nome}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CPF</p>
                    <p className="font-medium">{formatCPFDisplay(reorientacaoData.colaborador_cpf)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Empresa</p>
                    <p className="font-medium">{reorientacaoData.empresa_nome}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Treinamento</p>
                    <p className="font-medium">{reorientacaoData.treinamento_nome}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">
                      {reorientacaoData.data_treinamento 
                        ? format(new Date(reorientacaoData.data_treinamento + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                        : format(new Date(), 'dd/MM/yyyy', { locale: ptBR })
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resultado</p>
                    <p className="font-medium text-amber-700">
                      {reorientacaoData.nota.toFixed(1)}% ({reorientacaoData.acertos}/{reorientacaoData.total_questoes} acertos)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Título de Reorientação */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-center">
                  📋 Termo de Reorientação
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Questões Incorretas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Questões Incorretas ({reorientacaoData.questoes_incorretas.length})
                </CardTitle>
                <CardDescription>
                  Revise as questões que você errou e entenda a resposta correta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {reorientacaoData.questoes_incorretas.map((questao, index) => (
                  <div key={questao.questao_id} className="border rounded-lg p-4 bg-slate-50">
                    <p className="font-medium mb-3">
                      {questao.numero}. {questao.pergunta}
                    </p>
                    
                    {/* Sua resposta (errada) */}
                    <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-red-600 font-medium mb-1">Sua resposta:</p>
                          <p className="text-sm text-red-700">
                            <span className="font-medium">{questao.alternativa_selecionada})</span> {questao.alternativa_selecionada_texto}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resposta correta */}
                    <div className="mb-3 p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-green-600 font-medium mb-1">Resposta correta:</p>
                          <p className="text-sm text-green-700">
                            <span className="font-medium">{questao.alternativa_correta})</span> {questao.alternativa_correta_texto}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Todas as alternativas erradas */}
                    <div className="p-3 rounded-lg bg-slate-100">
                      <p className="text-xs text-slate-600 font-medium mb-2">Alternativas incorretas:</p>
                      <div className="space-y-1">
                        {questao.alternativas_erradas.map((alt) => (
                          <p key={alt.letra} className={`text-xs text-slate-500 ${
                            alt.letra === questao.alternativa_selecionada ? 'font-medium text-red-500' : ''
                          }`}>
                            {alt.letra}) {alt.texto}
                            {alt.letra === questao.alternativa_selecionada && ' ← (sua escolha)'}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Texto de Reorientação da Empresa */}
            {reorientacaoData.texto_reorientacao && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Orientações da Empresa</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {reorientacaoData.texto_reorientacao}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botão de Assinatura */}
            <Card className="sticky bottom-4">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Ao assinar, você confirma que revisou todas as questões incorretas e compreendeu as respostas corretas.
                </p>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  size="lg"
                  onClick={() => setSignatureDialogOpen(true)}
                  disabled={savingReorientacao}
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Assinar Digitalmente
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Assinatura do Certificado */}
        {step === 'assinatura_certificado' && resultado && (
          <div className="space-y-6">
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="text-center pb-3">
                <div className="flex justify-center mb-2">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle className="text-green-700">Parabéns, você foi aprovado!</CardTitle>
                <CardDescription className="text-green-600">
                  Nota: {resultado.acertos} de {resultado.total} ({((resultado.acertos / resultado.total) * 100).toFixed(0)}%)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-primary" />
                  Assinatura para o Certificado
                </CardTitle>
                <CardDescription>
                  Assine abaixo para que sua assinatura apareça no certificado de conclusão
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Colaborador</p>
                      <p className="font-medium">{colaborador?.nome}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CPF</p>
                      <p className="font-medium">{formatCPFDisplay(colaborador?.cpf || '')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Treinamento</p>
                      <p className="font-medium">{turma?.treinamento_norma} - {turma?.treinamento_nome}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resultado</p>
                      <p className="font-medium text-green-600">Aprovado</p>
                    </div>
                  </div>
                </div>

                {savingAssinaturaCertificado ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Salvando assinatura...</p>
                  </div>
                ) : (
                  <SignaturePad 
                    onSave={handleSaveAssinaturaCertificado}
                    onCancel={() => {
                      // Pular assinatura e ir para avaliação de reação
                      setStep('avaliacao_reacao');
                      toast.info('Você pode assinar o certificado depois na aba Provas.');
                    }}
                    width={380}
                    height={180}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Avaliação de Reação */}
        {step === 'avaliacao_reacao' && turma && colaborador && (
          <div className="space-y-4">
            {salvandoTudo && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-blue-700 font-medium">Salvando todos os dados...</p>
                  <p className="text-sm text-blue-600">Por favor, aguarde. Não feche esta página.</p>
                </CardContent>
              </Card>
            )}
            <AvaliacaoReacaoForm
              turmaId={turma.id}
              colaboradorId={colaborador.id}
              treinamentoId={turma.treinamento_id}
              onComplete={() => handleFinalizarTudo()}
              onSkip={() => handleFinalizarTudo()}
              turmaInfo={{
                codigo_turma: turma.codigo_turma,
                empresa_id: turma.empresa_id,
                cliente_id: turma.cliente_id,
                cliente_nome: turma.cliente_nome,
                treinamento_nome: turma.treinamento_nome,
                treinamento_norma: turma.treinamento_norma,
                instrutor_id: turma.instrutor_id,
                instrutor_nome: turma.instrutor_nome
              }}
              colaboradorInfo={{
                nome: colaborador.nome,
                cpf: colaborador.cpf
              }}
              origem="qrcode"
            />
          </div>
        )}
      </div>

      {/* Dialog de Assinatura Digital */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-green-600" />
              Assinatura Digital
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Assine no campo abaixo para confirmar a reorientação
            </p>
            
            {savingReorientacao ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-2" />
                <p className="text-sm text-muted-foreground">Salvando reorientação...</p>
              </div>
            ) : (
              <SignaturePad 
                onSave={handleSaveReorientacao}
                onCancel={() => setSignatureDialogOpen(false)}
                width={380}
                height={180}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
