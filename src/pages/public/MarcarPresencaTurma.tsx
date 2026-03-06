import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle, GraduationCap, Building2, Calendar, UserCheck, Camera, RotateCcw, ScanFace } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SignaturePad } from '@/components/ui/signature-pad';
import { faceApiService } from '@/utils/facial-recognition';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TurmaInfo {
  id: string;
  codigo_turma: string;
  treinamento_id: string;
  treinamento_nome: string;
  treinamento_norma: string;
  cliente_id: string | null;
  cliente_nome: string;
  cliente_cnpj: string | null;
  cliente_razao_social: string | null;
  datas_aulas: string[];
  empresa_sst_id: string;
  empresa_sst_cnpj: string | null;
  empresa_sst_razao_social: string | null;
  cliente_empresa_id: string | null;
  instrutor_id: string | null;
  instrutor_nome: string | null;
  instrutor_email: string | null;
  instrutor_cpf: string | null;
  instrutor_telefone: string | null;
  instrutor_formacao: string | null;
}

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

interface ColaboradorTurma {
  id: string;
  colaborador_id: string;
  nome: string;
  cpf: string;
  foto_url?: string | null;
}

export default function MarcarPresencaTurma() {
  const { turmaId } = useParams<{ turmaId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [turma, setTurma] = useState<TurmaInfo | null>(null);
  const [step, setStep] = useState<'cpf' | 'assinatura' | 'facial' | 'sucesso'>('cpf');
  
  // Form states
  const [cpf, setCpf] = useState('');
  const [colaboradorEncontrado, setColaboradorEncontrado] = useState<ColaboradorTurma | null>(null);
  const [dataPresenca, setDataPresenca] = useState<string | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [collectedSignature, setCollectedSignature] = useState<string | null>(null);
  
  // Facial validation states
  const [showFacialDialog, setShowFacialDialog] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facialStep, setFacialStep] = useState<'camera' | 'comparing' | 'saving'>('camera');
  const [facialSimilarity, setFacialSimilarity] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Estado para verificar se reconhecimento facial está ativo para esta empresa cliente
  const [reconhecimentoFacialAtivo, setReconhecimentoFacialAtivo] = useState(false);
  const [loadingReconhecimentoFacial, setLoadingReconhecimentoFacial] = useState(false);

  useEffect(() => {
    if (turmaId) {
      fetchTurmaInfo();
    }
  }, [turmaId]);

  const fetchTurmaInfo = async () => {
    try {
      // Buscar turma com joins
      const { data: turmaData, error: turmaError } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          codigo_turma,
          cliente_id,
          treinamento_id,
          empresa_id,
          instrutor_id,
          catalogo_treinamentos!turmas_treinamento_treinamento_id_fkey(
            nome,
            norma
          ),
          clientes_sst!turmas_treinamento_cliente_id_fkey(
            nome,
            cliente_empresa_id
          ),
          turmas_treinamento_aulas(
            data
          )
        `)
        .eq('id', turmaId)
        .single();

      if (turmaError) {
        console.error('Erro ao buscar turma:', turmaError);
        setTurma(null);
        return;
      }

      if (!turmaData) {
        setTurma(null);
        return;
      }

      // Pegar todas as datas das aulas
      const aulas = turmaData.turmas_treinamento_aulas || [];
      const datasAulas = aulas
        .map((a: any) => a.data)
        .filter((d: any) => d)
        .sort((a: string, b: string) => a.localeCompare(b));

      const empresaSstId = turmaData.empresa_id;
      
      // Buscar cliente_empresa_id separadamente (evita problemas de RLS)
      let clienteEmpresaId: string | null = null;
      if (turmaData.cliente_id) {
        const { data: clienteSstData } = await (supabase as any)
          .from('clientes_sst')
          .select('cliente_empresa_id')
          .eq('id', turmaData.cliente_id)
          .single();
        clienteEmpresaId = clienteSstData?.cliente_empresa_id || null;
      }

      // Buscar dados da empresa SST (CNPJ e razão social)
      let empresaSstCnpj: string | null = null;
      let empresaSstRazaoSocial: string | null = null;
      if (empresaSstId) {
        const { data: empresaSstData } = await (supabase as any)
          .from('empresas')
          .select('cnpj, razao_social')
          .eq('id', empresaSstId)
          .single();
        empresaSstCnpj = empresaSstData?.cnpj || null;
        empresaSstRazaoSocial = empresaSstData?.razao_social || null;
      }

      // Buscar dados da empresa cliente (CNPJ e razão social)
      let clienteCnpj: string | null = null;
      let clienteRazaoSocial: string | null = null;
      if (clienteEmpresaId) {
        const { data: clienteEmpresaData } = await (supabase as any)
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
      if (turmaData.instrutor_id) {
        const { data: instrutorData } = await (supabase as any)
          .from('instrutores')
          .select('nome, email, cpf_cnpj, telefone, formacao_academica')
          .eq('id', turmaData.instrutor_id)
          .single();
        instrutorNome = instrutorData?.nome || null;
        instrutorEmail = instrutorData?.email || null;
        instrutorCpf = instrutorData?.cpf_cnpj || null;
        instrutorTelefone = instrutorData?.telefone || null;
        instrutorFormacao = instrutorData?.formacao_academica || null;
      }

      setTurma({
        id: turmaData.id,
        codigo_turma: turmaData.codigo_turma || '',
        treinamento_id: turmaData.treinamento_id,
        treinamento_nome: turmaData.catalogo_treinamentos?.nome || '',
        treinamento_norma: turmaData.catalogo_treinamentos?.norma || '',
        cliente_id: turmaData.cliente_id,
        cliente_nome: turmaData.clientes_sst?.nome || '',
        cliente_cnpj: clienteCnpj,
        cliente_razao_social: clienteRazaoSocial,
        datas_aulas: datasAulas,
        empresa_sst_id: empresaSstId,
        empresa_sst_cnpj: empresaSstCnpj,
        empresa_sst_razao_social: empresaSstRazaoSocial,
        cliente_empresa_id: clienteEmpresaId,
        instrutor_id: turmaData.instrutor_id,
        instrutor_nome: instrutorNome,
        instrutor_email: instrutorEmail,
        instrutor_cpf: instrutorCpf,
        instrutor_telefone: instrutorTelefone,
        instrutor_formacao: instrutorFormacao
      });

      // Verificar se reconhecimento facial está ativo para esta empresa cliente
      if (empresaSstId && clienteEmpresaId) {
        setLoadingReconhecimentoFacial(true);
        try {
          const { data: configData } = await (supabase as any)
            .from('reconhecimento_facial_config')
            .select('ativo')
            .eq('empresa_sst_id', empresaSstId)
            .eq('cliente_empresa_id', clienteEmpresaId)
            .maybeSingle();
          
          setReconhecimentoFacialAtivo(configData?.ativo || false);
        } catch (e) {
          console.error('Erro ao verificar reconhecimento facial:', e);
          setReconhecimentoFacialAtivo(false);
        } finally {
          setLoadingReconhecimentoFacial(false);
        }
      } else {
        setReconhecimentoFacialAtivo(false);
      }
    } catch (error) {
      console.error('Erro ao carregar turma:', error);
      setTurma(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const limited = cleaned.slice(0, 11);
    
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleBuscarColaborador = async () => {
    if (!turma || !turmaId) return;
    
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      toast.error('CPF inválido. Digite um CPF com 11 dígitos.');
      return;
    }

    setSubmitting(true);
    try {
      // Buscar colaborador na turma pelo CPF
      const { data: colaboradoresTurma, error } = await (supabase as any)
        .from('turma_colaboradores')
        .select(`
          id,
          colaborador_id,
          colaboradores!turma_colaboradores_colaborador_id_fkey(
            nome,
            cpf,
            foto_url
          )
        `)
        .eq('turma_id', turmaId);

      if (error) throw error;

      // Encontrar colaborador com o CPF informado
      const colaboradorEncontrado = colaboradoresTurma?.find((tc: any) => {
        const cpfColaborador = tc.colaboradores?.cpf?.replace(/\D/g, '');
        return cpfColaborador === cpfLimpo;
      });

      if (!colaboradorEncontrado) {
        toast.error('CPF não encontrado nesta turma. Verifique se você está cadastrado.');
        return;
      }

      // Validar se a data atual é uma data de aula
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const dataAulaHoje = turma.datas_aulas.find(d => d === hoje);

      if (!dataAulaHoje) {
        toast.error(`Hoje (${format(new Date(), 'dd/MM/yyyy')}) não é uma data de aula desta turma.`);
        return;
      }

      // Verificar se já marcou presença hoje
      const { data: presencaExistente } = await (supabase as any)
        .from('turma_colaborador_presencas')
        .select('id, presente, assinatura')
        .eq('colaborador_turma_id', colaboradorEncontrado.id)
        .eq('data_aula', hoje)
        .single();

      if (presencaExistente?.presente && presencaExistente?.assinatura) {
        toast.info('Você já marcou presença hoje!');
        setStep('sucesso');
        return;
      }

      setColaboradorEncontrado({
        id: colaboradorEncontrado.id,
        colaborador_id: colaboradorEncontrado.colaborador_id,
        nome: colaboradorEncontrado.colaboradores?.nome || '',
        cpf: colaboradorEncontrado.colaboradores?.cpf || '',
        foto_url: colaboradorEncontrado.colaboradores?.foto_url || null
      });
      setDataPresenca(hoje);
      setShowSignatureDialog(true);

    } catch (error) {
      console.error('Erro ao buscar colaborador:', error);
      toast.error('Erro ao buscar colaborador. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSignature = async (signatureData: string) => {
    if (!colaboradorEncontrado || !dataPresenca) return;

    // Se reconhecimento facial NÃO está ativo, salvar presença diretamente com assinatura
    if (!reconhecimentoFacialAtivo) {
      setSubmitting(true);
      try {
        // Verificar se já existe registro de presença para este dia
        const { data: presencaExistente } = await (supabase as any)
          .from('turma_colaborador_presencas')
          .select('id')
          .eq('colaborador_turma_id', colaboradorEncontrado.id)
          .eq('data_aula', dataPresenca)
          .single();

        const presencaData = {
          presente: true,
          assinatura: signatureData,
          origem: 'qrcode',
          updated_at: new Date().toISOString()
        };

        if (presencaExistente) {
          const { error } = await (supabase as any)
            .from('turma_colaborador_presencas')
            .update(presencaData)
            .eq('id', presencaExistente.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any)
            .from('turma_colaborador_presencas')
            .insert({
              colaborador_turma_id: colaboradorEncontrado.id,
              data_aula: dataPresenca,
              ...presencaData
            });
          if (error) throw error;
        }

        // Registrar auditoria da presença via QR Code
        if (turma) {
          // Obter informações do dispositivo fora do try-catch para garantir que não falhe
          const deviceInfo = await getDeviceInfo().catch(() => ({
            userAgent: navigator.userAgent || 'Unknown',
            dispositivo: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
            navegador: 'Desconhecido',
            sistemaOperacional: 'Desconhecido',
            ip: null
          }));
          
          try {
            const { error: auditError } = await (supabase as any).from('turmas_auditoria').insert({
              turma_id: turmaId,
              turma_codigo: turma.codigo_turma,
              empresa_id: turma.empresa_sst_id,
              empresa_sst_cnpj: turma.empresa_sst_cnpj,
              empresa_sst_razao_social: turma.empresa_sst_razao_social,
              usuario_id: null,
              usuario_nome: colaboradorEncontrado.nome,
              usuario_role: 'colaborador',
              acao: 'criou',
              entidade: 'presenca',
              descricao: `Presença registrada via QR Code pelo colaborador ${colaboradorEncontrado.nome} (CPF: ${colaboradorEncontrado.cpf}). Data: ${dataPresenca}. Método: Assinatura digital.`,
              metodo_origem: 'qrcode',
              fonte: 'qrcode',
              colaborador_id: colaboradorEncontrado.colaborador_id,
              colaborador_nome: colaboradorEncontrado.nome,
              colaborador_cpf: colaboradorEncontrado.cpf,
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
              executado_por_nome: colaboradorEncontrado.nome,
              executado_por_id: colaboradorEncontrado.colaborador_id,
              user_agent: deviceInfo.userAgent,
              dispositivo: deviceInfo.dispositivo,
              navegador: deviceInfo.navegador,
              sistema_operacional: deviceInfo.sistemaOperacional,
              ip_address: deviceInfo.ip
            });
            
            if (auditError) {
              console.error('Erro ao registrar auditoria de presença:', auditError);
            }
          } catch (auditError) {
            console.error('Erro ao registrar auditoria de presença:', auditError);
          }
        }

        setShowSignatureDialog(false);
        setStep('sucesso');
        toast.success('Presença registrada com sucesso!');
      } catch (error) {
        console.error('Erro ao salvar presença:', error);
        toast.error('Erro ao salvar presença. Tente novamente.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Se reconhecimento facial ESTÁ ativo, seguir fluxo normal
    // Guardar assinatura temporariamente (não salva no banco ainda)
    setCollectedSignature(signatureData);
    setShowSignatureDialog(false);
    toast.info('Assinatura coletada! Agora faça a validação facial.');
    
    // Abrir dialog de validação facial
    setTimeout(() => {
      setFacialStep('camera');
      setCapturedPhoto(null);
      setShowFacialDialog(true);
      startCamera();
    }, 300);
  };

  // Funções de câmera e validação facial
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      toast.error('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const photoData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoData);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleFacialValidation = async () => {
    if (!capturedPhoto || !colaboradorEncontrado || !collectedSignature || !dataPresenca) return;

    setFacialStep('comparing');
    
    try {
      // Comparar faces se houver foto cadastrada
      let similarity = 0;
      let facialValidated = false;
      
      if (colaboradorEncontrado.foto_url) {
        try {
          const result = await faceApiService.compareFaces(
            colaboradorEncontrado.foto_url,
            capturedPhoto
          );
          similarity = result.similarity;
          setFacialSimilarity(similarity);
          
          if (!result.matched) {
            // Se falhou a validação facial, perguntar se quer continuar mesmo assim
            const errorMsg = result.error || `Similaridade: ${(similarity * 100).toFixed(1)}%`;
            toast.error(`Validação facial não confirmada. ${errorMsg}`);
            setFacialStep('camera');
            retakePhoto();
            return;
          }
          facialValidated = true;
        } catch (facialError: any) {
          console.error('Erro na validação facial:', facialError);
          // Se der erro na validação facial, continuar sem validação (foto será salva mesmo assim)
          toast.warning('Validação facial indisponível. Continuando com registro da foto.');
          facialValidated = false;
        }
      }

      setFacialStep('saving');

      // Upload da foto para o storage
      let fotoUrl = '';
      try {
        const response = await fetch(capturedPhoto);
        const blob = await response.blob();
        const fileName = `${turma?.id}/${colaboradorEncontrado.id}_${dataPresenca}_${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('presenca-fotos')
          .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          // Se falhar o upload, salvar a foto como base64 diretamente
          fotoUrl = capturedPhoto;
        } else {
          // Obter URL pública
          const { data: urlData } = supabase.storage
            .from('presenca-fotos')
            .getPublicUrl(fileName);
          fotoUrl = urlData.publicUrl;
        }
      } catch (uploadErr) {
        console.error('Erro no upload da foto:', uploadErr);
        // Fallback: salvar base64 diretamente
        fotoUrl = capturedPhoto;
      }

      const horaValidacao = new Date().toISOString();

      // Verificar se já existe registro de presença para este dia
      const { data: presencaExistente } = await (supabase as any)
        .from('turma_colaborador_presencas')
        .select('id')
        .eq('colaborador_turma_id', colaboradorEncontrado.id)
        .eq('data_aula', dataPresenca)
        .single();

      const presencaData = {
        presente: true,
        assinatura: collectedSignature,
        foto_validacao: fotoUrl,
        validado_facial: facialValidated,
        hora_validacao: horaValidacao,
        origem: 'qrcode',
        similaridade_facial: similarity,
        updated_at: horaValidacao
      };

      if (presencaExistente) {
        const { error } = await (supabase as any)
          .from('turma_colaborador_presencas')
          .update(presencaData)
          .eq('id', presencaExistente.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('turma_colaborador_presencas')
          .insert({
            colaborador_turma_id: colaboradorEncontrado.id,
            data_aula: dataPresenca,
            ...presencaData
          });
        if (error) throw error;
      }

      // Registrar auditoria da presença via QR Code com reconhecimento facial
      if (turma) {
        // Obter informações do dispositivo fora do try-catch para garantir que não falhe
        const deviceInfo = await getDeviceInfo().catch(() => ({
          userAgent: navigator.userAgent || 'Unknown',
          dispositivo: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
          navegador: 'Desconhecido',
          sistemaOperacional: 'Desconhecido',
          ip: null
        }));
        
        try {
          const { error: auditError } = await (supabase as any).from('turmas_auditoria').insert({
            turma_id: turmaId,
            turma_codigo: turma.codigo_turma,
            empresa_id: turma.empresa_sst_id,
            empresa_sst_cnpj: turma.empresa_sst_cnpj,
            empresa_sst_razao_social: turma.empresa_sst_razao_social,
            usuario_id: null,
            usuario_nome: colaboradorEncontrado.nome,
            usuario_role: 'colaborador',
            acao: 'criou',
            entidade: 'presenca',
            descricao: `Presença registrada via QR Code pelo colaborador ${colaboradorEncontrado.nome} (CPF: ${colaboradorEncontrado.cpf}). Data: ${dataPresenca}. Método: Assinatura digital + Reconhecimento facial (${facialValidated ? 'validado' : 'não validado'}, similaridade: ${(similarity * 100).toFixed(1)}%).`,
            metodo_origem: 'qrcode',
            fonte: 'qrcode',
            colaborador_id: colaboradorEncontrado.colaborador_id,
            colaborador_nome: colaboradorEncontrado.nome,
            colaborador_cpf: colaboradorEncontrado.cpf,
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
            executado_por_nome: colaboradorEncontrado.nome,
            executado_por_id: colaboradorEncontrado.colaborador_id,
            user_agent: deviceInfo.userAgent,
            dispositivo: deviceInfo.dispositivo,
            navegador: deviceInfo.navegador,
            sistema_operacional: deviceInfo.sistemaOperacional,
            ip_address: deviceInfo.ip
          });
          
          if (auditError) {
            console.error('Erro ao registrar auditoria de presença facial:', auditError);
          }
        } catch (auditError) {
          console.error('Erro ao registrar auditoria de presença facial:', auditError);
        }
      }

      setShowFacialDialog(false);
      setStep('sucesso');
      toast.success('Presença registrada com sucesso!');

    } catch (error) {
      console.error('Erro na validação facial:', error);
      toast.error('Erro ao validar. Tente novamente.');
      setFacialStep('camera');
    }
  };

  // Cleanup da câmera ao fechar dialog
  useEffect(() => {
    if (!showFacialDialog) {
      stopCamera();
    }
  }, [showFacialDialog, stopCamera]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando informações da turma...</p>
          </CardContent>
        </Card>
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
            <p className="text-muted-foreground">O link de presença é inválido ou a turma não existe.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'sucesso') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Presença Registrada!</h2>
            <p className="text-muted-foreground mb-4">
              Sua presença foi registrada com sucesso para o dia {dataPresenca ? format(parseISO(dataPresenca), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}.
            </p>
            {colaboradorEncontrado && (
              <p className="text-sm text-muted-foreground">
                Colaborador: <span className="font-medium">{colaboradorEncontrado.nome}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Marcar Presença</CardTitle>
          <CardDescription>
            Digite seu CPF para registrar sua presença na turma
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Informações da Turma */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{turma.treinamento_norma}</span>
              <span className="text-muted-foreground">- {turma.treinamento_nome}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="text-muted-foreground">{turma.cliente_nome}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-muted-foreground">
                Hoje: {format(new Date(), "dd/MM/yyyy")}
              </span>
            </div>
          </div>

          {/* Formulário CPF */}
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={handleCpfChange}
              maxLength={14}
            />
          </div>

          <Button 
            className="w-full bg-green-600 hover:bg-green-700" 
            onClick={handleBuscarColaborador}
            disabled={submitting || cpf.replace(/\D/g, '').length !== 11}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Verificar e Marcar Presença
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Dialog de Assinatura */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Etapa 1: Assinatura Digital</DialogTitle>
            <DialogDescription>
              {colaboradorEncontrado?.nome}, assine abaixo para iniciar o registro de presença.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <SignaturePad
              onSave={handleSaveSignature}
              width={350}
              height={200}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Validação Facial */}
      <Dialog open={showFacialDialog} onOpenChange={(open) => {
        if (!open) {
          stopCamera();
          // Se fechar sem completar, limpar assinatura coletada
          setCollectedSignature(null);
        }
        setShowFacialDialog(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanFace className="h-5 w-5 text-blue-600" />
              Etapa 2: Validação Facial
            </DialogTitle>
            <DialogDescription>
              {colaboradorEncontrado?.nome}, tire uma foto do seu rosto para confirmar sua identidade.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Área de câmera/foto */}
            <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-[4/3]">
              {!capturedPhoto ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Guia de posicionamento */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-40 border-2 border-dashed border-white/50 rounded-full" />
                  </div>
                </>
              ) : (
                <img 
                  src={capturedPhoto} 
                  alt="Foto capturada" 
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Status overlay */}
              {facialStep === 'comparing' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <span className="text-sm">Comparando faces...</span>
                </div>
              )}
              {facialStep === 'saving' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <span className="text-sm">Salvando presença...</span>
                </div>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2">
              {!capturedPhoto ? (
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={capturePhoto}
                  disabled={!cameraStream}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar Foto
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={retakePhoto}
                    disabled={facialStep !== 'camera'}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Nova Foto
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleFacialValidation}
                    disabled={facialStep !== 'camera'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar
                  </Button>
                </>
              )}
            </div>

            {/* Aviso */}
            <p className="text-xs text-center text-muted-foreground">
              Posicione seu rosto dentro do círculo e mantenha boa iluminação.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
