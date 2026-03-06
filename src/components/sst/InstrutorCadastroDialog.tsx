import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useAccessLog } from '@/hooks/useAccessLog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Check, Eye, EyeOff, Upload, Trash2, Pencil, FileText } from 'lucide-react';
import { SignaturePad } from '@/components/ui/signature-pad';
import { cn } from '@/lib/utils';

interface FormDataState {
  currentStep: number;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  dataNascimento: string;
  criarAcesso: 'sim' | 'nao';
  informarVeiculo: 'sim' | 'nao';
  veiculo: string;
  placa: string;
  possuiEquipamentos: 'sim' | 'nao';
  cep: string;
  logradouro: string;
  bairro: string;
  numero: string;
  complemento: string;
  cidade: string;
  uf: string;
  formacaoAcademica: string;
  formacoesAcademicas: string[];
  treinamentosSelecionados: string[];
  formacaoTreinamentos: Record<string, string[]>;
  formacaoRegistros: Record<string, { registro_tipo: string; registro_numero: string; registro_estado: string; anexo_url?: string }>;
  assinaturaUrl: string;
  assinaturaTipo: 'upload' | 'desenho';
}

interface InstrutorCadastroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingInstrutor?: any;
  empresaParceiraId?: string | null;
  persistedFormData?: FormDataState | null;
  onFormDataChange?: (data: FormDataState | null) => void;
}

interface Treinamento {
  id: string;
  nome: string;
  norma: string;
}

const FORMACOES_ACADEMICAS = [
  'Técnico(a) em Segurança do Trabalho',
  'Engenheiro de Segurança do Trabalho',
  'Engenheiro(a) Eletricista',
  'Engenheiro(a) Mecânico(a)',
  'Eletrotécnico(a)',
  'Enfermeiro(a)',
];

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const TIPOS_REGISTRO = [
  { value: 'CREA', label: 'CREA - Conselho Regional de Engenharia' },
  { value: 'MTE', label: 'MTE - Ministério do Trabalho' },
  { value: 'CRM', label: 'CRM - Conselho Regional de Medicina' },
  { value: 'COREN', label: 'COREN - Conselho Regional de Enfermagem' },
  { value: 'CRQ', label: 'CRQ - Conselho Regional de Química' },
  { value: 'CFT', label: 'CFT - Conselho Federal dos Técnicos' },
  { value: 'OUTRO', label: 'Outro' },
];

interface FormacaoData {
  nome: string;
  registro_tipo: string;
  registro_numero: string;
  registro_estado: string;
  treinamentos: string[];
}

export function InstrutorCadastroDialog({
  open,
  onOpenChange,
  onSuccess,
  editingInstrutor,
  empresaParceiraId,
  persistedFormData,
  onFormDataChange,
}: InstrutorCadastroDialogProps) {
  const { empresa, profile } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { logCreate, logUpdate } = useAccessLog();
  const [empresaSstId, setEmpresaSstId] = useState<string | null>(null);
  
  // Buscar empresa_sst_id quando for empresa parceira
  useEffect(() => {
    const fetchEmpresaSstId = async () => {
      if (empresaParceiraId) {
        const { data } = await supabase
          .from('empresas_parceiras')
          .select('empresa_sst_id')
          .eq('id', empresaParceiraId)
          .single();
        if (data) {
          setEmpresaSstId(data.empresa_sst_id);
        }
      }
    };
    fetchEmpresaSstId();
  }, [empresaParceiraId]);
  
  // Usar empresaSstId para empresa parceira, ou profile.empresa_id como fallback
  const empresaIdBase = isInEmpresaMode && empresaMode ? empresaMode.empresaId : (profile?.empresa_id || empresa?.id);
  const empresaId = empresaParceiraId ? empresaSstId : empresaIdBase;

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [treinamentosDisponiveis, setTreinamentosDisponiveis] = useState<Treinamento[]>([]);
  const [formacoesCustom, setFormacoesCustom] = useState<string[]>([]);
  const [novaFormacao, setNovaFormacao] = useState('');
  const [showNovaFormacaoInput, setShowNovaFormacaoInput] = useState(false);
  const [editandoFormacao, setEditandoFormacao] = useState<string | null>(null);
  const [novoNomeFormacao, setNovoNomeFormacao] = useState('');

  // Form data - Etapa 1: Informações Pessoais
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [criarAcesso, setCriarAcesso] = useState<'sim' | 'nao'>('nao');
  const [resetandoSenha, setResetandoSenha] = useState(false);
  const [dataNascimento, setDataNascimento] = useState('');
  const [informarVeiculo, setInformarVeiculo] = useState<'sim' | 'nao'>('nao');
  const [veiculo, setVeiculo] = useState('');
  const [placa, setPlaca] = useState('');
  
  // Equipamentos próprios
  const [possuiEquipamentos, setPossuiEquipamentos] = useState<'sim' | 'nao'>('nao');
  const [equipamentosPorTreinamento, setEquipamentosPorTreinamento] = useState<Record<string, { nome: string; quantidade: number }[]>>({});
  const [treinamentoEquipamentoSelecionado, setTreinamentoEquipamentoSelecionado] = useState<string>('');
  const [novoEquipamentoNome, setNovoEquipamentoNome] = useState('');
  const [novoEquipamentoQtd, setNovoEquipamentoQtd] = useState(1);

  // Form data - Etapa 2: Endereço
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  // Form data - Etapa 3: Informações Profissionais
  const [formacaoAcademica, setFormacaoAcademica] = useState('');
  const [formacoesAcademicas, setFormacoesAcademicas] = useState<string[]>([]); // Múltiplas formações
  const [treinamentosSelecionados, setTreinamentosSelecionados] = useState<string[]>([]);
  // Relacionamento formação -> treinamentos: { "Técnico em Segurança": ["treinamento-id-1", "treinamento-id-2"] }
  const [formacaoTreinamentos, setFormacaoTreinamentos] = useState<Record<string, string[]>>({});
  const [formacaoSelecionada, setFormacaoSelecionada] = useState<string | null>(null);
  // Flag para indicar se os dados de formações/vínculos foram carregados (evita perda de anexos)
  const [dadosFormacoesCarregados, setDadosFormacoesCarregados] = useState(false);
  // Dados de registro por formação: { "Técnico em Segurança": { registro_tipo, registro_numero, registro_estado, anexo_url } }
  const [formacaoRegistros, setFormacaoRegistros] = useState<Record<string, { registro_tipo: string; registro_numero: string; registro_estado: string; anexo_url?: string }>>({});

  // Form data - Etapa 4: Assinatura Digital
  const [assinaturaUrl, setAssinaturaUrl] = useState('');
  const [assinaturaTipo, setAssinaturaTipo] = useState<'upload' | 'desenho'>('upload');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [uploadingAssinatura, setUploadingAssinatura] = useState(false);

  // Funções de formatação (definidas antes dos useEffects)
  const formatCpfValue = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const formatTelefoneValue = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      if (numbers.length <= 10) {
        return numbers
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2');
      }
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const formatCepValue = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d)/, '$1-$2');
  };

  const fetchInstrutorTreinamentos = async (instrutorId: string) => {
    try {
      const { data, error } = await supabase
        .from('instrutor_treinamentos')
        .select('treinamento_id')
        .eq('instrutor_id', instrutorId);
      
      if (error) throw error;
      
      const treinamentoIds = (data || []).map((item: any) => item.treinamento_id);
      setTreinamentosSelecionados(treinamentoIds);
    } catch (error) {
      console.error('Erro ao carregar treinamentos do instrutor:', error);
    }
  };

  const fetchInstrutorFormacoes = async (instrutorId: string) => {
    try {
      const db = supabase as any;
      
      // Buscar formações com dados de registro e anexo
      const { data, error } = await db
        .from('instrutor_formacoes')
        .select('id, nome, registro_tipo, registro_numero, registro_estado, anexo_url')
        .eq('instrutor_id', instrutorId);
      
      if (error) throw error;
      
      const formacoes = (data || []).map((item: any) => item.nome);
      setFormacoesAcademicas(formacoes);

      // Carregar dados de registro por formação (incluindo anexo)
      const registrosMap: Record<string, { registro_tipo: string; registro_numero: string; registro_estado: string; anexo_url?: string }> = {};
      (data || []).forEach((item: any) => {
        registrosMap[item.nome] = {
          registro_tipo: item.registro_tipo || '',
          registro_numero: item.registro_numero || '',
          registro_estado: item.registro_estado || '',
          anexo_url: item.anexo_url || '',
        };
      });
      setFormacaoRegistros(registrosMap);

      // Buscar vínculos formação-treinamento com anexos
      const { data: vinculos } = await db
        .from('instrutor_formacao_treinamento')
        .select('formacao_id, treinamento_id, anexo_url')
        .eq('instrutor_id', instrutorId);

      if (vinculos && data) {
        const formacaoTreinamentosMap: Record<string, string[]> = {};
        
        vinculos.forEach((v: any) => {
          const formacao = data.find((f: any) => f.id === v.formacao_id);
          if (formacao) {
            if (!formacaoTreinamentosMap[formacao.nome]) {
              formacaoTreinamentosMap[formacao.nome] = [];
            }
            formacaoTreinamentosMap[formacao.nome].push(v.treinamento_id);
          }
        });
        
        setFormacaoTreinamentos(formacaoTreinamentosMap);
      }
      
      // Marcar que os dados foram carregados com sucesso
      setDadosFormacoesCarregados(true);
    } catch (error) {
      console.error('Erro ao carregar formações do instrutor:', error);
      setDadosFormacoesCarregados(false);
    }
  };

  const fetchInstrutorEquipamentos = async (instrutorId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('instrutor_equipamentos')
        .select('treinamento_id, equipamento_nome, quantidade')
        .eq('instrutor_id', instrutorId);

      if (error) throw error;

      // Agrupar por treinamento
      const equipamentosMap: Record<string, { nome: string; quantidade: number }[]> = {};
      (data || []).forEach((item: any) => {
        if (!equipamentosMap[item.treinamento_id]) {
          equipamentosMap[item.treinamento_id] = [];
        }
        equipamentosMap[item.treinamento_id].push({
          nome: item.equipamento_nome,
          quantidade: item.quantidade,
        });
      });
      setEquipamentosPorTreinamento(equipamentosMap);
    } catch (error) {
      console.error('Erro ao carregar equipamentos do instrutor:', error);
    }
  };

  useEffect(() => {
    if (open && empresaId) {
      fetchTreinamentos();
    }
  }, [open, empresaId]);

  useEffect(() => {
    if (editingInstrutor && open) {
      // Preencher dados para edição
      setNome(editingInstrutor.nome || '');
      setCpf(formatCpfValue(editingInstrutor.cpf_cnpj || ''));
      setEmail(editingInstrutor.email || '');
      setTelefone(formatTelefoneValue(editingInstrutor.telefone || ''));
      setDataNascimento(editingInstrutor.data_nascimento || '');
      setInformarVeiculo(editingInstrutor.veiculo ? 'sim' : 'nao');
      setVeiculo(editingInstrutor.veiculo || '');
      setPlaca(editingInstrutor.placa || '');
      setPossuiEquipamentos(editingInstrutor.possui_equipamentos_proprios ? 'sim' : 'nao');
      // Carregar equipamentos do instrutor
      if (editingInstrutor.possui_equipamentos_proprios) {
        fetchInstrutorEquipamentos(editingInstrutor.id);
      }
      setCep(formatCepValue(editingInstrutor.cep || ''));
      setLogradouro(editingInstrutor.logradouro || '');
      setBairro(editingInstrutor.bairro || '');
      setNumero(editingInstrutor.numero || '');
      setComplemento(editingInstrutor.complemento || '');
      setCidade(editingInstrutor.cidade || '');
      setUf(editingInstrutor.uf || '');
      setFormacaoAcademica(editingInstrutor.formacao_academica || '');
      // Resetar campos de acesso - verificar se já tem acesso
      setCriarAcesso('nao');
      setSenha('');
      setConfirmarSenha('');
      
      // Carregar treinamentos e formações associados ao instrutor
      fetchInstrutorTreinamentos(editingInstrutor.id);
      fetchInstrutorFormacoes(editingInstrutor.id);
      // Carregar assinatura
      setAssinaturaUrl(editingInstrutor.assinatura_url || '');
      setAssinaturaTipo(editingInstrutor.assinatura_tipo || 'upload');
    } else if (!editingInstrutor && open) {
      resetForm();
    }
  }, [editingInstrutor, open]);

  // Restaurar dados persistidos quando abrir o dialog (apenas para novo cadastro)
  useEffect(() => {
    if (open && !editingInstrutor && persistedFormData) {
      setCurrentStep(persistedFormData.currentStep);
      setNome(persistedFormData.nome);
      setCpf(persistedFormData.cpf);
      setTelefone(persistedFormData.telefone);
      setEmail(persistedFormData.email);
      setDataNascimento(persistedFormData.dataNascimento);
      setCriarAcesso(persistedFormData.criarAcesso);
      setInformarVeiculo(persistedFormData.informarVeiculo);
      setVeiculo(persistedFormData.veiculo);
      setPlaca(persistedFormData.placa);
      setPossuiEquipamentos(persistedFormData.possuiEquipamentos);
      setCep(persistedFormData.cep);
      setLogradouro(persistedFormData.logradouro);
      setBairro(persistedFormData.bairro);
      setNumero(persistedFormData.numero);
      setComplemento(persistedFormData.complemento);
      setCidade(persistedFormData.cidade);
      setUf(persistedFormData.uf);
      setFormacaoAcademica(persistedFormData.formacaoAcademica);
      setFormacoesAcademicas(persistedFormData.formacoesAcademicas);
      setTreinamentosSelecionados(persistedFormData.treinamentosSelecionados);
      setFormacaoTreinamentos(persistedFormData.formacaoTreinamentos);
      setFormacaoRegistros(persistedFormData.formacaoRegistros);
      setAssinaturaUrl(persistedFormData.assinaturaUrl);
      setAssinaturaTipo(persistedFormData.assinaturaTipo);
    }
  }, [open, editingInstrutor, persistedFormData]);

  // Ref estável para o callback de persistência (evita loop infinito de re-render)
  const onFormDataChangeRef = useRef(onFormDataChange);
  useEffect(() => { onFormDataChangeRef.current = onFormDataChange; }, [onFormDataChange]);

  // Notificar mudanças no form para persistência (apenas para novo cadastro)
  useEffect(() => {
    if (!editingInstrutor && onFormDataChangeRef.current) {
      const formData: FormDataState = {
        currentStep,
        nome,
        cpf,
        telefone,
        email,
        dataNascimento,
        criarAcesso,
        informarVeiculo,
        veiculo,
        placa,
        possuiEquipamentos,
        cep,
        logradouro,
        bairro,
        numero,
        complemento,
        cidade,
        uf,
        formacaoAcademica,
        formacoesAcademicas,
        treinamentosSelecionados,
        formacaoTreinamentos,
        formacaoRegistros,
        assinaturaUrl,
        assinaturaTipo,
      };
      onFormDataChangeRef.current(formData);
    }
  }, [
    currentStep, nome, cpf, telefone, email, dataNascimento, criarAcesso,
    informarVeiculo, veiculo, placa, possuiEquipamentos, cep, logradouro,
    bairro, numero, complemento, cidade, uf, formacaoAcademica,
    formacoesAcademicas, treinamentosSelecionados, formacaoTreinamentos,
    formacaoRegistros, assinaturaUrl, assinaturaTipo, editingInstrutor
  ]);

  // Resetar criarAcesso quando email for removido
  useEffect(() => {
    if (!email.trim() && criarAcesso === 'sim') {
      setCriarAcesso('nao');
    }
  }, [email, criarAcesso]);

  const resetForm = () => {
    setCurrentStep(1);
    setNome('');
    setCpf('');
    setTelefone('');
    setEmail('');
    setSenha('');
    setConfirmarSenha('');
    setShowSenha(false);
    setShowConfirmarSenha(false);
    setCriarAcesso('nao');
    setDataNascimento('');
    setInformarVeiculo('nao');
    setVeiculo('');
    setPlaca('');
    setPossuiEquipamentos('nao');
    setEquipamentosPorTreinamento({});
    setTreinamentoEquipamentoSelecionado('');
    setNovoEquipamentoNome('');
    setNovoEquipamentoQtd(1);
    setCep('');
    setLogradouro('');
    setBairro('');
    setNumero('');
    setComplemento('');
    setCidade('');
    setUf('');
    setFormacaoAcademica('');
    setFormacoesAcademicas([]);
    setTreinamentosSelecionados([]);
    setFormacaoTreinamentos({});
    setFormacaoSelecionada(null);
    setDadosFormacoesCarregados(false);
    setNovaFormacao('');
    setShowNovaFormacaoInput(false);
    setFormacaoRegistros({});
    setAssinaturaUrl('');
    setAssinaturaTipo('upload');
    setShowSignaturePad(false);
  };

  const fetchTreinamentos = async () => {
    if (!empresaId) return;

    try {
      const { data, error } = await supabase
        .from('catalogo_treinamentos')
        .select('id, nome, norma')
        .eq('empresa_id', empresaId);

      if (error) throw error;
      
      const treinamentos = (data || []).map((item: any) => ({
        id: item.id as string,
        nome: item.nome as string,
        norma: item.norma as string,
      }));
      
      // Ordenar por número da NR (extrair número da string "NR-XX")
      treinamentos.sort((a, b) => {
        const numA = parseInt(a.norma.replace(/\D/g, '')) || 999;
        const numB = parseInt(b.norma.replace(/\D/g, '')) || 999;
        if (numA !== numB) return numA - numB;
        return a.nome.localeCompare(b.nome);
      });
      
      setTreinamentosDisponiveis(treinamentos);
    } catch (error) {
      console.error('Erro ao buscar treinamentos:', error);
    }
  };

  const buscarCep = async (cepValue: string) => {
    const cepLimpo = cepValue.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setLogradouro(data.logradouro || '');
      setBairro(data.bairro || '');
      setCidade(data.localidade || '');
      setUf(data.uf || '');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const validateStep1 = () => {
    if (!nome.trim()) {
      toast.error('Nome completo é obrigatório');
      return false;
    }
    if (!cpf.trim()) {
      toast.error('CPF é obrigatório');
      return false;
    }
    if (!telefone.trim()) {
      toast.error('Telefone é obrigatório');
      return false;
    }
    // Validar senha se criar acesso estiver habilitado (novo ou edição sem acesso)
    if (criarAcesso === 'sim') {
      // Email é obrigatório para criar acesso
      if (!email.trim()) {
        toast.error('E-mail é obrigatório para criar acesso ao sistema');
        return false;
      }
      // Se for edição e já tem user_id, não precisa de senha
      const jaTemAcesso = editingInstrutor?.user_id;
      if (!jaTemAcesso) {
        if (!senha.trim()) {
          toast.error('Senha é obrigatória para criar acesso');
          return false;
        }
        if (senha.length < 6) {
          toast.error('Senha deve ter no mínimo 6 caracteres');
          return false;
        }
        if (senha !== confirmarSenha) {
          toast.error('As senhas não conferem');
          return false;
        }
      }
    }
    if (informarVeiculo === 'sim' && !veiculo.trim()) {
      toast.error('Informações do veículo são obrigatórias');
      return false;
    }
    if (informarVeiculo === 'sim' && !placa.trim()) {
      toast.error('Placa do veículo é obrigatória');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!cep.trim()) {
      toast.error('CEP é obrigatório');
      return false;
    }
    if (!logradouro.trim()) {
      toast.error('Logradouro é obrigatório');
      return false;
    }
    if (!bairro.trim()) {
      toast.error('Bairro é obrigatório');
      return false;
    }
    if (!numero.trim()) {
      toast.error('Número é obrigatório');
      return false;
    }
    if (!cidade.trim()) {
      toast.error('Cidade é obrigatória');
      return false;
    }
    if (!uf.trim()) {
      toast.error('UF é obrigatório');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddFormacao = () => {
    if (novaFormacao.trim() && !formacoesCustom.includes(novaFormacao.trim())) {
      setFormacoesCustom([...formacoesCustom, novaFormacao.trim()]);
      setFormacaoAcademica(novaFormacao.trim());
      setNovaFormacao('');
      setShowNovaFormacaoInput(false);
    }
  };

  const handleResetSenha = async () => {
    if (!editingInstrutor?.email) return;

    setResetandoSenha(true);
    try {
      // Usar Edge Function para evitar problema de CAPTCHA
      const { data: response, error } = await supabase.functions.invoke('admin-update-user', {
        body: {
          action: 'generate_password_reset',
          targetEmail: editingInstrutor.email,
          redirectTo: `${window.location.origin}/reset-password`,
        }
      });

      if (error) {
        toast.error('Erro ao enviar email de reset: ' + error.message);
      } else if (response?.error) {
        toast.error('Erro ao enviar email de reset: ' + response.error);
      } else {
        toast.success('Email de reset de senha enviado para: ' + editingInstrutor.email);
      }
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      toast.error('Erro ao resetar senha');
    } finally {
      setResetandoSenha(false);
    }
  };

  const handleSave = async () => {
    if (!empresaId) {
      console.error('[InstrutorCadastroDialog] empresaId é null/undefined', {
        empresaId,
        empresaIdBase,
        empresaParceiraId,
        empresaSstId,
        profileEmpresaId: profile?.empresa_id,
        empresaAuthId: empresa?.id,
      });
      toast.error('Erro: Empresa não identificada. Recarregue a página.');
      return;
    }

    console.log('[InstrutorCadastroDialog] Salvando instrutor com empresaId:', empresaId);

    setSaving(true);
    try {
      let userId: string | null = null;

      // Se criar acesso estiver habilitado e instrutor ainda não tem acesso, criar usuário via Edge Function
      const jaTemAcesso = editingInstrutor?.user_id;
      if (criarAcesso === 'sim' && !jaTemAcesso) {
        // Verificar se há sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast.error('Sessão expirada. Por favor, faça login novamente.');
          setSaving(false);
          return;
        }

        // Criar usuário via Edge Function admin-create-user (evita problema de captcha)
        console.log('[InstrutorCadastroDialog] Criando usuário via admin-create-user...');
        
        const { data: adminResponse, error: adminError } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: email.trim(),
            password: senha,
            nome: nome.trim(),
            role: 'instrutor',
            empresa_id: empresaId,
            send_invite: true, // Envia email de convite para o usuário definir sua senha
          }
        });

        console.log('[InstrutorCadastroDialog] Resposta admin-create-user:', adminResponse);

        if (adminError) {
          console.error('[InstrutorCadastroDialog] Erro na Edge Function:', adminError);
          toast.error('Erro ao criar acesso: ' + adminError.message);
          setSaving(false);
          return;
        }

        if (adminResponse?.error) {
          console.error('[InstrutorCadastroDialog] Erro retornado pela Edge Function:', adminResponse.error);
          if (adminResponse.error.includes('already registered') || adminResponse.error.includes('already exists') || adminResponse.error.includes('já está cadastrado')) {
            toast.error('Este e-mail já está cadastrado no sistema');
          } else {
            toast.error('Erro ao criar acesso: ' + adminResponse.error);
          }
          setSaving(false);
          return;
        }

        userId = adminResponse?.user?.id || null;
        
        if (!userId) {
          console.warn('[InstrutorCadastroDialog] Usuário criado mas ID não retornado');
        } else {
          console.log('[InstrutorCadastroDialog] Usuário criado com sucesso:', userId);
        }
      }

      // Todos os campos do instrutor
      const instrutorData: any = {
        empresa_id: empresaId,
        nome: nome.trim(),
        cpf_cnpj: cpf.replace(/\D/g, ''),
        email: email.trim(),
        telefone: telefone.replace(/\D/g, '') || null,
        data_nascimento: dataNascimento || null,
        veiculo: informarVeiculo === 'sim' ? veiculo.trim() : null,
        placa: informarVeiculo === 'sim' ? placa.trim().toUpperCase() : null,
        possui_equipamentos_proprios: possuiEquipamentos === 'sim',
        cep: cep.replace(/\D/g, '') || null,
        logradouro: logradouro.trim() || null,
        bairro: bairro.trim() || null,
        numero: numero.trim() || null,
        complemento: complemento.trim() || null,
        cidade: cidade.trim() || null,
        uf: uf.trim() || null,
        formacao_academica: formacaoAcademica || null,
        ativo: true,
        treinamentos_count: treinamentosSelecionados.length,
        assinatura_url: assinaturaUrl || null,
        assinatura_tipo: assinaturaTipo,
      };

      // Adicionar user_id se foi criado
      if (userId) {
        instrutorData.user_id = userId;
      }

      // Adicionar empresa_parceira_id se fornecido
      if (empresaParceiraId) {
        instrutorData.empresa_parceira_id = empresaParceiraId;
      }

      let instrutorId: string;

      if (editingInstrutor) {
        // Se o email mudou e o instrutor tem acesso (user_id), atualizar no auth também
        if (editingInstrutor.user_id && editingInstrutor.email !== email.trim()) {
          console.log('[InstrutorCadastroDialog] Email alterado, atualizando no auth...');
          
          const { data: updateResponse, error: updateError } = await supabase.functions.invoke('admin-update-user', {
            body: {
              userId: editingInstrutor.user_id,
              email: email.trim(),
            }
          });

          if (updateError) {
            console.error('[InstrutorCadastroDialog] Erro ao atualizar email no auth:', updateError);
            toast.error('Erro ao atualizar email: ' + updateError.message);
            setSaving(false);
            return;
          }

          if (updateResponse?.error) {
            console.error('[InstrutorCadastroDialog] Erro retornado pela Edge Function:', updateResponse.error);
            toast.error('Erro ao atualizar email: ' + updateResponse.error);
            setSaving(false);
            return;
          }

          console.log('[InstrutorCadastroDialog] Email atualizado com sucesso no auth');
          if (updateResponse?.emailConfirmationSent) {
            toast.info('Um email de confirmação foi enviado para o novo endereço.');
          }
        }

        const { error } = await supabase
          .from('instrutores')
          .update(instrutorData)
          .eq('id', editingInstrutor.id);

        if (error) throw error;
        instrutorId = editingInstrutor.id;

        // Smart diff para instrutor_treinamentos: preservar registros existentes e seus anexos
        const { data: treinamentosExistentes } = await supabase
          .from('instrutor_treinamentos')
          .select('id, treinamento_id, documento_url')
          .eq('instrutor_id', instrutorId);

        const idsExistentes = (treinamentosExistentes || []).map((t: any) => t.treinamento_id);
        const idsNovos = treinamentosSelecionados;

        // Deletar apenas os treinamentos que foram REMOVIDOS (e seus anexos do storage)
        const idsParaRemover = idsExistentes.filter((id: string) => !idsNovos.includes(id));
        if (idsParaRemover.length > 0) {
          // Coletar anexos dos treinamentos removidos para deletar do storage
          const removidos = (treinamentosExistentes || []).filter((t: any) => idsParaRemover.includes(t.treinamento_id));
          const anexosRemovidos = removidos.map((t: any) => t.documento_url).filter(Boolean);
          if (anexosRemovidos.length > 0) {
            const filePaths = anexosRemovidos
              .map((url: string) => { const match = url.match(/\/storage\/v1\/object\/public\/([^?]+)/); return match ? match[1] : null; })
              .filter(Boolean) as string[];
            if (filePaths.length > 0) {
              const bucketFiles: Record<string, string[]> = {};
              filePaths.forEach((path: string) => { const [bucket, ...rest] = path.split('/'); if (!bucketFiles[bucket]) bucketFiles[bucket] = []; bucketFiles[bucket].push(rest.join('/')); });
              for (const [bucket, files] of Object.entries(bucketFiles)) {
                await supabase.storage.from(bucket).remove(files);
              }
            }
          }
          await supabase
            .from('instrutor_treinamentos')
            .delete()
            .eq('instrutor_id', instrutorId)
            .in('treinamento_id', idsParaRemover);
        }

        // Inserir apenas os treinamentos NOVOS (que não existiam antes)
        const idsParaInserir = idsNovos.filter((id: string) => !idsExistentes.includes(id));
        if (idsParaInserir.length > 0) {
          const treinamentosInsert = idsParaInserir.map((treinamentoId: string) => ({
            instrutor_id: instrutorId,
            treinamento_id: treinamentoId,
          }));
          const { error: treinamentosError } = await supabase
            .from('instrutor_treinamentos')
            .insert(treinamentosInsert);
          if (treinamentosError) {
            console.error('Erro ao salvar treinamentos:', treinamentosError);
          }
        }
      } else {
        const { data, error } = await supabase
          .from('instrutores')
          .insert(instrutorData)
          .select('id')
          .single();

        if (error) throw error;
        instrutorId = data.id;
      }

      // Inserir treinamentos selecionados (apenas para NOVO cadastro — edição já tratou acima)
      if (!editingInstrutor && treinamentosSelecionados.length > 0) {
        const treinamentosInsert = treinamentosSelecionados.map(treinamentoId => ({
          instrutor_id: instrutorId,
          treinamento_id: treinamentoId,
        }));

        const { error: treinamentosError } = await supabase
          .from('instrutor_treinamentos')
          .insert(treinamentosInsert);

        if (treinamentosError) {
          console.error('Erro ao salvar treinamentos:', treinamentosError);
        }
      }

      // Gerenciar formações acadêmicas na tabela instrutor_formacoes
      if (editingInstrutor) {
        // PROTEÇÃO CRÍTICA: Se os dados de formações não foram carregados, NÃO modificar vínculos
        // Isso evita perda acidental de anexos quando o usuário salva antes dos dados carregarem
        if (!dadosFormacoesCarregados) {
          console.warn('[InstrutorCadastro] Dados de formações não foram carregados. Vínculos não serão modificados para evitar perda de anexos.');
          toast.info('Dados de formações ainda carregando. Apenas dados básicos foram salvos.');
        } else {
        // Smart diff: preservar registros existentes e seus anexos (documento_url, anexo_url)
        const { data: formacoesExistentes } = await (supabase as any)
          .from('instrutor_formacoes')
          .select('id, nome, documento_url, anexo_url')
          .eq('instrutor_id', instrutorId);

        const nomesExistentes = (formacoesExistentes || []).map((f: any) => f.nome);
        const nomesNovos = formacoesAcademicas;

        // Deletar apenas formações que foram REMOVIDAS
        // IMPORTANTE: Verificar se há vínculos com anexos antes de deletar
        const nomesParaRemover = nomesExistentes.filter((nome: string) => !nomesNovos.includes(nome));
        if (nomesParaRemover.length > 0) {
          const removidas = (formacoesExistentes || []).filter((f: any) => nomesParaRemover.includes(f.nome));
          const idsParaRemover = removidas.map((f: any) => f.id);
          
          // Verificar se há vínculos com anexos que seriam perdidos
          const { data: vinculosComAnexo } = await (supabase as any)
            .from('instrutor_formacao_treinamento')
            .select('id, anexo_url')
            .in('formacao_id', idsParaRemover)
            .not('anexo_url', 'is', null);
          
          if (vinculosComAnexo && vinculosComAnexo.length > 0) {
            // Há anexos que seriam perdidos - NÃO deletar, apenas alertar
            console.warn(`[InstrutorCadastro] ${vinculosComAnexo.length} vínculos com anexos seriam perdidos. Formações não serão removidas.`);
            toast.warning(`Não foi possível remover ${removidas.length} formação(ões) pois possuem documentos anexados. Remova os documentos primeiro se desejar excluir.`);
          } else {
            // Sem anexos - pode deletar normalmente
            const anexosRemovidos: string[] = [];
            removidas.forEach((f: any) => {
              if (f.documento_url) anexosRemovidos.push(f.documento_url);
              if (f.anexo_url) anexosRemovidos.push(f.anexo_url);
            });
            if (anexosRemovidos.length > 0) {
              const filePaths = anexosRemovidos
                .map((url: string) => { const match = url.match(/\/storage\/v1\/object\/public\/([^?]+)/); return match ? match[1] : null; })
                .filter(Boolean) as string[];
              if (filePaths.length > 0) {
                const bucketFiles: Record<string, string[]> = {};
                filePaths.forEach((path: string) => { const [bucket, ...rest] = path.split('/'); if (!bucketFiles[bucket]) bucketFiles[bucket] = []; bucketFiles[bucket].push(rest.join('/')); });
                for (const [bucket, files] of Object.entries(bucketFiles)) {
                  await supabase.storage.from(bucket).remove(files);
                }
              }
            }
            // Deletar vínculos formação-treinamento das formações removidas
            await (supabase as any).from('instrutor_formacao_treinamento').delete().in('formacao_id', idsParaRemover);
            // Deletar as formações removidas
            await (supabase as any).from('instrutor_formacoes').delete().in('id', idsParaRemover);
          }
        }

        // Atualizar metadados das formações que CONTINUAM (sem tocar em documento_url/anexo_url)
        const formacoesParaAtualizar = (formacoesExistentes || []).filter((f: any) => nomesNovos.includes(f.nome));
        for (const formacaoDb of formacoesParaAtualizar) {
          const registro = formacaoRegistros[formacaoDb.nome] || { registro_tipo: '', registro_numero: '', registro_estado: '' };
          await (supabase as any)
            .from('instrutor_formacoes')
            .update({
              registro_tipo: registro.registro_tipo || null,
              registro_numero: registro.registro_numero || null,
              registro_estado: registro.registro_estado || null,
            })
            .eq('id', formacaoDb.id);
        }

        // Inserir apenas formações NOVAS
        const nomesParaInserir = nomesNovos.filter((nome: string) => !nomesExistentes.includes(nome));
        let formacoesNovasData: any[] = [];
        if (nomesParaInserir.length > 0) {
          const formacoesInsert = nomesParaInserir.map((formacao: string) => {
            const registro = formacaoRegistros[formacao] || { registro_tipo: '', registro_numero: '', registro_estado: '' };
            return {
              instrutor_id: instrutorId,
              nome: formacao,
              registro_tipo: registro.registro_tipo || null,
              registro_numero: registro.registro_numero || null,
              registro_estado: registro.registro_estado || null,
            };
          });
          const { data, error: formacaoError } = await (supabase as any)
            .from('instrutor_formacoes')
            .insert(formacoesInsert)
            .select('id, nome');
          if (formacaoError) {
            console.error('Erro ao salvar formações:', formacaoError);
          }
          formacoesNovasData = data || [];
        }

        // Smart diff para vínculos formação-treinamento: preservar anexo_url existentes
        const todasFormacoes = [
          ...formacoesParaAtualizar.map((f: any) => ({ id: f.id, nome: f.nome })),
          ...formacoesNovasData.map((f: any) => ({ id: f.id, nome: f.nome })),
        ];

        if (todasFormacoes.length > 0) {
          // Buscar vínculos existentes (que não foram deletados junto com formações removidas)
          const { data: vinculosExistentes } = await (supabase as any)
            .from('instrutor_formacao_treinamento')
            .select('id, formacao_id, treinamento_id, anexo_url')
            .eq('instrutor_id', instrutorId);

          // Criar set de vínculos existentes para comparação rápida (formacao_id+treinamento_id)
          const vinculosExistentesSet = new Set(
            (vinculosExistentes || []).map((v: any) => `${v.formacao_id}::${v.treinamento_id}`)
          );

          // Criar set de vínculos desejados
          const vinculosDesejadosSet = new Set<string>();
          todasFormacoes.forEach((formacaoDb: any) => {
            const treinamentosVinculados = formacaoTreinamentos[formacaoDb.nome] || [];
            treinamentosVinculados.forEach((treinamentoId: string) => {
              vinculosDesejadosSet.add(`${formacaoDb.id}::${treinamentoId}`);
            });
          });

          // Deletar vínculos que foram REMOVIDOS
          // IMPORTANTE: Não deletar vínculos que têm anexos - preservar documentos
          const vinculosParaRemover = (vinculosExistentes || []).filter(
            (v: any) => !vinculosDesejadosSet.has(`${v.formacao_id}::${v.treinamento_id}`)
          );
          if (vinculosParaRemover.length > 0) {
            // Separar vínculos COM e SEM anexo
            const vinculosComAnexo = vinculosParaRemover.filter((v: any) => v.anexo_url && v.anexo_url !== '');
            const vinculosSemAnexo = vinculosParaRemover.filter((v: any) => !v.anexo_url || v.anexo_url === '');
            
            // Alertar sobre vínculos com anexo que não serão removidos
            if (vinculosComAnexo.length > 0) {
              console.warn(`[InstrutorCadastro] ${vinculosComAnexo.length} vínculos com anexos não serão removidos para preservar documentos.`);
              toast.warning(`${vinculosComAnexo.length} treinamento(s) com documentos anexados não foram removidos. Remova os documentos primeiro se desejar excluir.`);
            }
            
            // Deletar apenas vínculos SEM anexo
            if (vinculosSemAnexo.length > 0) {
              const idsRemover = vinculosSemAnexo.map((v: any) => v.id);
              await (supabase as any).from('instrutor_formacao_treinamento').delete().in('id', idsRemover);
            }
          }

          // Inserir apenas vínculos NOVOS (que não existiam antes) — preserva os existentes com anexo_url
          const vinculosParaInserir: { instrutor_id: string; formacao_id: string; treinamento_id: string }[] = [];
          todasFormacoes.forEach((formacaoDb: any) => {
            const treinamentosVinculados = formacaoTreinamentos[formacaoDb.nome] || [];
            treinamentosVinculados.forEach((treinamentoId: string) => {
              const chave = `${formacaoDb.id}::${treinamentoId}`;
              if (!vinculosExistentesSet.has(chave)) {
                vinculosParaInserir.push({
                  instrutor_id: instrutorId,
                  formacao_id: formacaoDb.id,
                  treinamento_id: treinamentoId,
                });
              }
            });
          });

          if (vinculosParaInserir.length > 0) {
            const { error: vinculoError } = await (supabase as any)
              .from('instrutor_formacao_treinamento')
              .insert(vinculosParaInserir);
            if (vinculoError) {
              console.error('Erro ao salvar vínculos formação-treinamento:', vinculoError);
            }
          }
        }
        } // Fim do else (dadosFormacoesCarregados)
      } else {
        // NOVO cadastro: inserir todas as formações
        if (formacoesAcademicas.length > 0) {
          const formacoesInsert = formacoesAcademicas.map(formacao => {
            const registro = formacaoRegistros[formacao] || { registro_tipo: '', registro_numero: '', registro_estado: '' };
            return {
              instrutor_id: instrutorId,
              nome: formacao,
              registro_tipo: registro.registro_tipo || null,
              registro_numero: registro.registro_numero || null,
              registro_estado: registro.registro_estado || null,
            };
          });

          const { data: formacoesData, error: formacaoError } = await (supabase as any)
            .from('instrutor_formacoes')
            .insert(formacoesInsert)
            .select('id, nome');

          if (formacaoError) {
            console.error('Erro ao salvar formações:', formacaoError);
          }

          // Salvar vínculos formação-treinamento
          if (formacoesData && Object.keys(formacaoTreinamentos).length > 0) {
            const vinculos: { instrutor_id: string; formacao_id: string; treinamento_id: string }[] = [];
            formacoesData.forEach((formacaoDb: any) => {
              const treinamentosVinculados = formacaoTreinamentos[formacaoDb.nome] || [];
              treinamentosVinculados.forEach(treinamentoId => {
                vinculos.push({
                  instrutor_id: instrutorId,
                  formacao_id: formacaoDb.id,
                  treinamento_id: treinamentoId,
                });
              });
            });

            if (vinculos.length > 0) {
              const { error: vinculoError } = await (supabase as any)
                .from('instrutor_formacao_treinamento')
                .insert(vinculos);
              if (vinculoError) {
                console.error('Erro ao salvar vínculos formação-treinamento:', vinculoError);
              }
            }
          }
        }
      }

      // Salvar equipamentos próprios do instrutor
      if (possuiEquipamentos === 'sim') {
        const db = supabase as any;
        
        // Remover equipamentos antigos se estiver editando
        if (editingInstrutor) {
          await db
            .from('instrutor_equipamentos')
            .delete()
            .eq('instrutor_id', instrutorId);
        }

        // Inserir novos equipamentos
        const equipamentosInsert: { instrutor_id: string; treinamento_id: string; equipamento_nome: string; quantidade: number }[] = [];
        
        Object.entries(equipamentosPorTreinamento).forEach(([treinamentoId, equipamentos]) => {
          equipamentos.forEach(equip => {
            equipamentosInsert.push({
              instrutor_id: instrutorId,
              treinamento_id: treinamentoId,
              equipamento_nome: equip.nome,
              quantidade: equip.quantidade,
            });
          });
        });

        if (equipamentosInsert.length > 0) {
          const { error: equipError } = await db
            .from('instrutor_equipamentos')
            .insert(equipamentosInsert);

          if (equipError) {
            console.error('Erro ao salvar equipamentos:', equipError);
          }
        }
      } else if (editingInstrutor) {
        // Se desmarcou equipamentos, remover todos
        await (supabase as any)
          .from('instrutor_equipamentos')
          .delete()
          .eq('instrutor_id', instrutorId);
      }

      toast.success(editingInstrutor ? 'Instrutor atualizado com sucesso!' : 'Instrutor cadastrado com sucesso!');
      if (editingInstrutor) {
        logUpdate('Instrutores', 'Gestão de Instrutores', `Atualizou instrutor: ${nome}`, { id: editingInstrutor.id, nome });
      } else {
        logCreate('Instrutores', 'Gestão de Instrutores', `Cadastrou instrutor: ${nome}`, { nome, cpf });
      }
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('[InstrutorCadastroDialog] Erro ao salvar instrutor:', error);
      console.error('[InstrutorCadastroDialog] Detalhes do erro:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      if (error.code === '23505') {
        toast.error('Já existe um instrutor com este CPF');
      } else if (error.code === '42501') {
        toast.error('Erro de permissão: Você não tem autorização para cadastrar instrutores.');
      } else {
        toast.error('Erro ao salvar instrutor: ' + (error.message || 'Erro desconhecido'));
      }
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, label: 'Informações Pessoais' },
    { number: 2, label: 'Endereço' },
    { number: 3, label: 'Informações Profissionais' },
    { number: 4, label: 'Assinatura Digital' },
  ];

  const allFormacoes = [...FORMACOES_ACADEMICAS, ...formacoesCustom];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {editingInstrutor ? 'Editar Instrutor' : 'Cadastrar Instrutor'}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center py-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => {
                  // Na edição, permite ir para qualquer etapa
                  // No cadastro, só permite ir para etapas anteriores ou a atual
                  if (editingInstrutor || step.number <= currentStep) {
                    setCurrentStep(step.number);
                  }
                }}
                title={editingInstrutor ? `Ir para ${step.label}` : (step.number <= currentStep ? `Ir para ${step.label}` : 'Complete as etapas anteriores')}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                    currentStep >= step.number
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground',
                    (editingInstrutor || step.number <= currentStep) && 'group-hover:scale-110 group-hover:shadow-md'
                  )}
                >
                  {currentStep > step.number ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1 text-center max-w-[80px]',
                    currentStep >= step.number ? 'text-primary font-medium' : 'text-muted-foreground',
                    (editingInstrutor || step.number <= currentStep) && 'group-hover:text-primary'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-16 h-0.5 mx-2 mb-5',
                    currentStep > step.number ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Etapa 1: Informações Pessoais */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                placeholder="Digite o nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfValue(e.target.value))}
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(formatTelefoneValue(e.target.value))}
                  maxLength={15}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
            </div>

            {/* Opção de criar acesso ao sistema - mostrar se não tem acesso ainda */}
            {(!editingInstrutor || !editingInstrutor.user_id) && (
              <div className="space-y-2 p-4 border rounded-lg bg-primary/5">
                <Label className="text-primary font-medium">
                  {editingInstrutor ? 'Criar acesso ao sistema para este instrutor?' : 'Criar acesso ao sistema para o instrutor?'}
                </Label>
                <p className="text-sm text-primary/80 mb-2">
                  Se habilitado, o instrutor poderá fazer login e gerenciar as turmas que está atrelado.
                </p>
                {!email.trim() && (
                  <p className="text-sm text-amber-600 mb-2">
                    ⚠️ Para criar acesso ao sistema, é necessário informar o e-mail do instrutor.
                  </p>
                )}
                <RadioGroup
                  value={!email.trim() ? 'nao' : criarAcesso}
                  onValueChange={(value) => {
                    if (!email.trim() && value === 'sim') {
                      toast.error('Informe o e-mail do instrutor para criar acesso ao sistema');
                      return;
                    }
                    setCriarAcesso(value as 'sim' | 'nao');
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="acesso-sim" disabled={!email.trim()} />
                    <Label htmlFor="acesso-sim" className={`cursor-pointer ${!email.trim() ? 'text-muted-foreground' : ''}`}>Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="acesso-nao" />
                    <Label htmlFor="acesso-nao" className="cursor-pointer">Não</Label>
                  </div>
                </RadioGroup>

                {criarAcesso === 'sim' && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="senha">Senha *</Label>
                      <div className="relative">
                        <Input
                          id="senha"
                          type={showSenha ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSenha(!showSenha)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                      <div className="relative">
                        <Input
                          id="confirmarSenha"
                          type={showConfirmarSenha ? 'text' : 'password'}
                          placeholder="Confirme a senha"
                          value={confirmarSenha}
                          onChange={(e) => setConfirmarSenha(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mostrar que já tem acesso */}
            {editingInstrutor?.user_id && (
              <div className="p-4 border rounded-lg bg-success/5 border-success/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-success" />
                      <Label className="text-success font-medium">Este instrutor já possui acesso ao sistema</Label>
                    </div>
                    <p className="text-sm text-success mt-1">
                      O instrutor pode fazer login com o e-mail: {editingInstrutor.email}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetSenha}
                    disabled={resetandoSenha}
                    className="text-primary border-primary/30 hover:bg-primary/5"
                  >
                    {resetandoSenha ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    Resetar Senha
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Deseja informar o veículo?</Label>
              <RadioGroup
                value={informarVeiculo}
                onValueChange={(value) => setInformarVeiculo(value as 'sim' | 'nao')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="veiculo-sim" />
                  <Label htmlFor="veiculo-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="veiculo-nao" />
                  <Label htmlFor="veiculo-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {informarVeiculo === 'sim' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="veiculo">Veículo *</Label>
                  <Textarea
                    id="veiculo"
                    placeholder="Descreva informações sobre o veículo"
                    value={veiculo}
                    onChange={(e) => setVeiculo(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="placa">Placa *</Label>
                  <Input
                    id="placa"
                    placeholder="Digite a placa"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                    maxLength={8}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Possui equipamentos próprios?</Label>
              <RadioGroup
                value={possuiEquipamentos}
                onValueChange={(value) => setPossuiEquipamentos(value as 'sim' | 'nao')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="equipamentos-sim" />
                  <Label htmlFor="equipamentos-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="equipamentos-nao" />
                  <Label htmlFor="equipamentos-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {possuiEquipamentos === 'sim' && (
              <div className="space-y-4 p-4 border rounded-lg bg-secondary/10 border-secondary/20">
                <p className="text-sm font-medium text-secondary-foreground">
                  Informe os equipamentos que o instrutor possui para cada treinamento
                </p>
                
                {/* Seleção de treinamento */}
                <div className="space-y-2">
                  <Label className="text-secondary-foreground">Selecione o treinamento</Label>
                  <Select 
                    value={treinamentoEquipamentoSelecionado} 
                    onValueChange={setTreinamentoEquipamentoSelecionado}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione um treinamento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {treinamentosDisponiveis.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          NR-{t.norma} - {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Adicionar equipamento */}
                {treinamentoEquipamentoSelecionado && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-secondary-foreground">Nome do equipamento</Label>
                        <Input
                          placeholder="Ex: Multímetro, EPI, etc."
                          value={novoEquipamentoNome}
                          onChange={(e) => setNovoEquipamentoNome(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-xs text-secondary-foreground">Qtd</Label>
                        <Input
                          type="number"
                          min={1}
                          value={novoEquipamentoQtd}
                          onChange={(e) => setNovoEquipamentoQtd(parseInt(e.target.value) || 1)}
                          className="bg-background"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (novoEquipamentoNome.trim()) {
                              setEquipamentosPorTreinamento(prev => {
                                const current = prev[treinamentoEquipamentoSelecionado] || [];
                                return {
                                  ...prev,
                                  [treinamentoEquipamentoSelecionado]: [
                                    ...current,
                                    { nome: novoEquipamentoNome.trim(), quantidade: novoEquipamentoQtd }
                                  ]
                                };
                              });
                              setNovoEquipamentoNome('');
                              setNovoEquipamentoQtd(1);
                            }
                          }}
                          disabled={!novoEquipamentoNome.trim()}
                          className="bg-secondary hover:bg-secondary/80"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Lista de equipamentos do treinamento selecionado */}
                    {(equipamentosPorTreinamento[treinamentoEquipamentoSelecionado] || []).length > 0 && (
                      <div className="bg-background rounded border border-secondary/20 p-2">
                        <p className="text-xs text-secondary-foreground mb-2">Equipamentos cadastrados:</p>
                        <div className="space-y-1">
                          {equipamentosPorTreinamento[treinamentoEquipamentoSelecionado].map((equip, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-secondary/10 px-2 py-1 rounded text-sm">
                              <span>{equip.nome} <span className="text-secondary-foreground">(x{equip.quantidade})</span></span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEquipamentosPorTreinamento(prev => ({
                                    ...prev,
                                    [treinamentoEquipamentoSelecionado]: prev[treinamentoEquipamentoSelecionado].filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Resumo de todos os equipamentos cadastrados */}
                {Object.keys(equipamentosPorTreinamento).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-secondary/20">
                    <p className="text-xs font-medium text-secondary-foreground mb-2">Resumo de equipamentos por treinamento:</p>
                    <div className="space-y-2">
                      {Object.entries(equipamentosPorTreinamento).map(([treinamentoId, equipamentos]) => {
                        if (equipamentos.length === 0) return null;
                        const treinamento = treinamentosDisponiveis.find(t => t.id === treinamentoId);
                        return (
                          <div key={treinamentoId} className="bg-background rounded p-2 text-xs">
                            <p className="font-medium text-secondary-foreground">NR-{treinamento?.norma} - {treinamento?.nome}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {equipamentos.map((eq, i) => (
                                <span key={i} className="bg-secondary/10 text-secondary-foreground px-2 py-0.5 rounded">
                                  {eq.nome} (x{eq.quantidade})
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Etapa 2: Endereço */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => {
                      const formatted = formatCepValue(e.target.value);
                      setCep(formatted);
                      if (formatted.replace(/\D/g, '').length === 8) {
                        buscarCep(formatted);
                      }
                    }}
                    maxLength={9}
                  />
                  {loadingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logradouro">Logradouro *</Label>
                <Input
                  id="logradouro"
                  placeholder="Digite o logradouro"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  disabled={loadingCep}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  placeholder="Digite o bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  disabled={loadingCep}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Nº *</Label>
                <Input
                  id="numero"
                  placeholder="Nº"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  placeholder="Complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  placeholder="Digite a cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  disabled={loadingCep}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF *</Label>
                <Select value={uf} onValueChange={setUf} disabled={loadingCep}>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 3: Informações Profissionais */}
        {currentStep === 3 && (
          <div className="space-y-5">
            {/* Header da seção */}
            <div className="bg-gradient-to-r from-primary/5 to-success/5 p-4 rounded-lg border border-primary/10">
              <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Formações e Treinamentos
              </h3>
              <p className="text-sm text-primary/80 mt-1">
                Configure as formações acadêmicas e vincule os treinamentos que o instrutor está habilitado a ministrar.
              </p>
            </div>

            {/* Adicionar nova formação - Card destacado */}
            <div className="border-2 border-dashed border-success/30 rounded-lg p-4 bg-success/5">
              <p className="text-sm font-medium text-success mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Formação
              </p>
              <div className="flex gap-2">
                <Select value={novaFormacao} onValueChange={setNovaFormacao}>
                  <SelectTrigger className="flex-1 bg-background">
                    <SelectValue placeholder="Selecione uma formação acadêmica..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allFormacoes
                      .filter(f => !formacoesAcademicas.includes(f))
                      .map((formacao) => (
                        <SelectItem key={formacao} value={formacao}>{formacao}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button"
                  onClick={() => {
                    if (novaFormacao && !formacoesAcademicas.includes(novaFormacao)) {
                      setFormacoesAcademicas([...formacoesAcademicas, novaFormacao]);
                      if (!formacaoAcademica) setFormacaoAcademica(novaFormacao);
                      setFormacaoSelecionada(novaFormacao);
                      setNovaFormacao('');
                    }
                  }}
                  disabled={!novaFormacao}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {/* Formação personalizada */}
              {!showNovaFormacaoInput ? (
                <button
                  type="button"
                  onClick={() => setShowNovaFormacaoInput(true)}
                  className="text-sm text-success hover:text-success/80 mt-2 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Ou adicione uma formação personalizada
                </button>
              ) : (
                <div className="flex gap-2 mt-3">
                  <Input
                    placeholder="Digite o nome da formação personalizada"
                    className="bg-background"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        if (value && !formacoesAcademicas.includes(value)) {
                          setFormacoesAcademicas([...formacoesAcademicas, value]);
                          if (!formacaoAcademica) setFormacaoAcademica(value);
                          if (!FORMACOES_ACADEMICAS.includes(value) && !formacoesCustom.includes(value)) {
                            setFormacoesCustom([...formacoesCustom, value]);
                          }
                          setFormacaoSelecionada(value);
                          e.currentTarget.value = '';
                          setShowNovaFormacaoInput(false);
                        }
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      const value = input?.value?.trim();
                      if (value && !formacoesAcademicas.includes(value)) {
                        setFormacoesAcademicas([...formacoesAcademicas, value]);
                        if (!formacaoAcademica) setFormacaoAcademica(value);
                        if (!FORMACOES_ACADEMICAS.includes(value) && !formacoesCustom.includes(value)) {
                          setFormacoesCustom([...formacoesCustom, value]);
                        }
                        setFormacaoSelecionada(value);
                        input.value = '';
                      }
                      setShowNovaFormacaoInput(false);
                    }}
                  >
                    OK
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowNovaFormacaoInput(false)}>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>

            {/* Lista de formações cadastradas */}
            {formacoesAcademicas.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {formacoesAcademicas.length} formação(ões) cadastrada(s)
                </p>
                
                {formacoesAcademicas.map((formacao, index) => {
                  const isExpanded = formacaoSelecionada === formacao;
                  const registro = formacaoRegistros[formacao] || { registro_tipo: '', registro_numero: '', registro_estado: '', anexo_url: '' };
                  const treinamentosVinculados = formacaoTreinamentos[formacao] || [];
                  
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "border rounded-xl overflow-hidden transition-all duration-200",
                        isExpanded ? "border-primary shadow-md" : "border-border hover:border-border/80"
                      )}
                    >
                      {/* Header da formação */}
                      <div 
                        className={cn(
                          "p-4 cursor-pointer transition-colors",
                          isExpanded ? "bg-primary/5" : "bg-card hover:bg-muted/50"
                        )}
                        onClick={() => setFormacaoSelecionada(isExpanded ? null : formacao)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              isExpanded ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                            )}>
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold">{formacao}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {registro.registro_tipo && (
                                  <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">
                                    {registro.registro_tipo} {registro.registro_numero} {registro.registro_estado && `- ${registro.registro_estado}`}
                                  </span>
                                )}
                                {registro.anexo_url && (
                                  <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Anexo
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {treinamentosVinculados.length} treinamento(s)
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditandoFormacao(formacao);
                                setNovoNomeFormacao(formacao);
                              }}
                              className="h-8 w-8 p-0 text-primary hover:text-primary/80 hover:bg-primary/5"
                              title="Editar nome da formação"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormacoesAcademicas(prev => prev.filter((_, i) => i !== index));
                                setFormacaoTreinamentos(prev => {
                                  const newMap = { ...prev };
                                  delete newMap[formacao];
                                  return newMap;
                                });
                                setFormacaoRegistros(prev => {
                                  const newMap = { ...prev };
                                  delete newMap[formacao];
                                  return newMap;
                                });
                                if (formacaoSelecionada === formacao) setFormacaoSelecionada(null);
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <div className={cn(
                              "transition-transform duration-200",
                              isExpanded ? "rotate-180" : ""
                            )}>
                              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        {/* Preview dos treinamentos quando fechado */}
                        {!isExpanded && treinamentosVinculados.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3 ml-13">
                            {treinamentosVinculados.slice(0, 4).map(tid => {
                              const t = treinamentosDisponiveis.find(tr => tr.id === tid);
                              return t ? (
                                <span key={tid} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                                  {t.norma}
                                </span>
                              ) : null;
                            })}
                            {treinamentosVinculados.length > 4 && (
                              <span className="text-xs text-muted-foreground">+{treinamentosVinculados.length - 4} mais</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Conteúdo expandido */}
                      {isExpanded && (
                        <div className="border-t border-primary/20 bg-card p-4 space-y-5">
                          {/* Seção 1: Registro Profissional */}
                          <div className="bg-warning/5 rounded-lg p-4 border border-warning/20">
                            <h4 className="text-sm font-semibold text-warning mb-3 flex items-center gap-2">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              Registro Profissional
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs text-warning">Tipo de Registro</Label>
                                <Select 
                                  value={registro.registro_tipo} 
                                  onValueChange={(value) => {
                                    setFormacaoRegistros(prev => ({
                                      ...prev,
                                      [formacao]: { ...prev[formacao], registro_tipo: value }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="mt-1 bg-background">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIPOS_REGISTRO.map(tipo => (
                                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-warning">Número do Registro</Label>
                                <Input 
                                  className="mt-1 bg-background"
                                  placeholder="Ex: 123456"
                                  value={registro.registro_numero}
                                  onChange={(e) => {
                                    setFormacaoRegistros(prev => ({
                                      ...prev,
                                      [formacao]: { ...prev[formacao], registro_numero: e.target.value }
                                    }));
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-warning">Estado (UF)</Label>
                                <Select 
                                  value={registro.registro_estado} 
                                  onValueChange={(value) => {
                                    setFormacaoRegistros(prev => ({
                                      ...prev,
                                      [formacao]: { ...prev[formacao], registro_estado: value }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="mt-1 bg-background">
                                    <SelectValue placeholder="UF" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ESTADOS_BR.map(estado => (
                                      <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            {/* Anexo da formação */}
                            {registro.anexo_url && (
                              <div className="mt-3 pt-3 border-t border-warning/20">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-success" />
                                  <a 
                                    href={registro.anexo_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-success hover:underline"
                                  >
                                    Ver anexo da formação
                                  </a>
                                  <span className="text-xs text-success">(enviado pelo instrutor)</span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Seção 2: Treinamentos Vinculados */}
                          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                            <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                              Treinamentos Vinculados
                              <span className="text-xs font-normal text-primary ml-auto">
                                {treinamentosVinculados.length} selecionado(s)
                              </span>
                            </h4>
                            
                            {/* Treinamentos selecionados */}
                            {treinamentosVinculados.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-primary/20">
                                {treinamentosVinculados.map(tid => {
                                  const t = treinamentosDisponiveis.find(tr => tr.id === tid);
                                  return t ? (
                                    <span 
                                      key={tid} 
                                      className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full"
                                    >
                                      {t.norma} - {t.nome}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFormacaoTreinamentos(prev => ({
                                            ...prev,
                                            [formacao]: prev[formacao].filter(id => id !== tid)
                                          }));
                                        }}
                                        className="ml-1 hover:bg-primary/80 rounded-full p-0.5"
                                      >
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                            
                            {/* Lista de treinamentos disponíveis */}
                            <div className="max-h-48 overflow-y-auto bg-background rounded border border-primary/10">
                              {treinamentosDisponiveis.map(t => {
                                const isSelected = treinamentosVinculados.includes(t.id);
                                return (
                                  <label 
                                    key={t.id} 
                                    className={cn(
                                      "flex items-center gap-3 p-2.5 cursor-pointer border-b border-border last:border-0 transition-colors",
                                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        setFormacaoTreinamentos(prev => {
                                          const current = prev[formacao] || [];
                                          if (e.target.checked) {
                                            return { ...prev, [formacao]: [...current, t.id] };
                                          } else {
                                            return { ...prev, [formacao]: current.filter(id => id !== t.id) };
                                          }
                                        });
                                        if (e.target.checked && !treinamentosSelecionados.includes(t.id)) {
                                          setTreinamentosSelecionados(prev => [...prev, t.id]);
                                        }
                                      }}
                                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <span className={cn(
                                      "text-xs font-medium px-2 py-0.5 rounded",
                                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}>
                                      {t.norma}
                                    </span>
                                    <span className="text-sm">{t.nome}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">Nenhuma formação cadastrada ainda</p>
                <p className="text-sm text-slate-400 mt-1">Use o campo acima para adicionar formações</p>
              </div>
            )}

            {/* Resumo de treinamentos */}
            {(() => {
              const allTreinamentos = new Set<string>();
              Object.values(formacaoTreinamentos).forEach(tids => tids.forEach(tid => allTreinamentos.add(tid)));
              const treinamentosArray = Array.from(allTreinamentos);
              
              if (treinamentosArray.length === 0) return null;
              
              return (
                <div className="bg-gradient-to-r from-warning/5 to-warning/10 rounded-lg p-4 border border-warning/20">
                  <h4 className="text-sm font-semibold text-warning mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Resumo: {treinamentosArray.length} treinamento(s) que o instrutor ministra
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {treinamentosArray.map(tid => {
                      const t = treinamentosDisponiveis.find(tr => tr.id === tid);
                      return t ? (
                        <span key={tid} className="text-xs bg-background text-warning px-2 py-1 rounded border border-warning/20">
                          {t.norma} - {t.nome}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Etapa 4: Assinatura Digital */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Assinatura Digital</Label>
              <p className="text-sm text-muted-foreground">
                Escolha como deseja adicionar a assinatura do instrutor. A assinatura será usada nos certificados emitidos.
              </p>
              
              {/* Preview da assinatura atual */}
              {assinaturaUrl && (
                <div className="p-4 border rounded-lg bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Assinatura atual:</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAssinaturaUrl('');
                        setAssinaturaTipo('upload');
                      }}
                      className="h-7 px-2 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                  <div className="flex justify-center p-4 bg-background border rounded">
                    <img 
                      src={assinaturaUrl} 
                      alt="Assinatura" 
                      className="max-h-32 object-contain"
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    ({assinaturaTipo === 'desenho' ? 'Assinatura desenhada' : 'Imagem enviada'})
                  </p>
                </div>
              )}

              {/* Opções para adicionar/alterar assinatura */}
              {!assinaturaUrl && !showSignaturePad && (
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className="p-6 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors text-center"
                    onClick={() => setShowSignaturePad(true)}
                  >
                    <Pencil className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="font-medium">Desenhar Assinatura</p>
                    <p className="text-xs text-muted-foreground mt-1">Use o mouse ou toque para assinar</p>
                  </div>
                  <label className="p-6 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="font-medium">Enviar Imagem</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG ou JPG (máx. 2MB)</p>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                          toast.error('Apenas arquivos PNG ou JPG são permitidos');
                          return;
                        }
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error('O arquivo deve ter no máximo 2MB');
                          return;
                        }
                        
                        setUploadingAssinatura(true);
                        try {
                          const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
                          const fileName = `assinatura_${Date.now()}.${ext}`;
                          const { data, error } = await supabase.storage
                            .from('instrutor-assinaturas')
                            .upload(fileName, file, { contentType: file.type });
                          
                          if (error) throw error;
                          
                          const { data: urlData } = supabase.storage
                            .from('instrutor-assinaturas')
                            .getPublicUrl(fileName);
                          
                          setAssinaturaUrl(urlData.publicUrl);
                          setAssinaturaTipo('upload');
                          toast.success('Assinatura enviada com sucesso!');
                        } catch (error: any) {
                          console.error('Erro ao enviar assinatura:', error);
                          toast.error('Erro ao enviar assinatura');
                        } finally {
                          setUploadingAssinatura(false);
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Pad de assinatura */}
              {showSignaturePad && !assinaturaUrl && (
                <div className="p-4 border rounded-lg bg-background">
                  <SignaturePad
                    onSave={async (signatureData) => {
                      setUploadingAssinatura(true);
                      try {
                        // Converter base64 para blob
                        const response = await fetch(signatureData);
                        const blob = await response.blob();
                        const fileName = `assinatura_desenho_${Date.now()}.png`;
                        
                        const { data, error } = await supabase.storage
                          .from('instrutor-assinaturas')
                          .upload(fileName, blob, { contentType: 'image/png' });
                        
                        if (error) throw error;
                        
                        const { data: urlData } = supabase.storage
                          .from('instrutor-assinaturas')
                          .getPublicUrl(fileName);
                        
                        setAssinaturaUrl(urlData.publicUrl);
                        setAssinaturaTipo('desenho');
                        setShowSignaturePad(false);
                        toast.success('Assinatura salva com sucesso!');
                      } catch (error: any) {
                        console.error('Erro ao salvar assinatura:', error);
                        toast.error('Erro ao salvar assinatura');
                      } finally {
                        setUploadingAssinatura(false);
                      }
                    }}
                    onCancel={() => setShowSignaturePad(false)}
                  />
                </div>
              )}

              {uploadingAssinatura && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Salvando assinatura...</span>
                </div>
              )}

              {/* Botões para alterar assinatura existente */}
              {assinaturaUrl && (
                <div className="flex gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAssinaturaUrl('');
                      setShowSignaturePad(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Redesenhar Assinatura
                  </Button>
                  <label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Trocar Assinatura
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                          toast.error('Apenas arquivos PNG ou JPG são permitidos');
                          return;
                        }
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error('O arquivo deve ter no máximo 2MB');
                          return;
                        }
                        
                        setUploadingAssinatura(true);
                        try {
                          const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
                          const fileName = `assinatura_${Date.now()}.${ext}`;
                          const { data, error } = await supabase.storage
                            .from('instrutor-assinaturas')
                            .upload(fileName, file, { contentType: file.type });
                          
                          if (error) throw error;
                          
                          const { data: urlData } = supabase.storage
                            .from('instrutor-assinaturas')
                            .getPublicUrl(fileName);
                          
                          setAssinaturaUrl(urlData.publicUrl);
                          setAssinaturaTipo('upload');
                          toast.success('Assinatura atualizada com sucesso!');
                        } catch (error: any) {
                          console.error('Erro ao enviar assinatura:', error);
                          toast.error('Erro ao enviar assinatura');
                        } finally {
                          setUploadingAssinatura(false);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer com botões */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={saving}
              >
                Voltar
              </Button>
            )}
          </div>

          {currentStep < 4 ? (
            <Button onClick={handleNext} className="bg-primary hover:bg-primary/90">
              Avançar
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving || uploadingAssinatura}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingInstrutor ? 'Atualizar Informações' : 'Cadastrar Instrutor'
              )}
            </Button>
          )}
        </div>

        {/* Dialog para editar nome da formação */}
        {editandoFormacao && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setEditandoFormacao(null)}>
            <div className="bg-background rounded-lg p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Editar Nome da Formação</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="novoNomeFormacao">Nome da Formação</Label>
                  <Input
                    id="novoNomeFormacao"
                    value={novoNomeFormacao}
                    onChange={(e) => setNovoNomeFormacao(e.target.value)}
                    placeholder="Digite o novo nome da formação"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditandoFormacao(null)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (novoNomeFormacao.trim() && novoNomeFormacao !== editandoFormacao) {
                        // Atualizar nome na lista de formações
                        setFormacoesAcademicas(prev => prev.map(f => f === editandoFormacao ? novoNomeFormacao.trim() : f));
                        
                        // Atualizar referências em formacaoTreinamentos
                        setFormacaoTreinamentos(prev => {
                          const newMap = { ...prev };
                          if (newMap[editandoFormacao]) {
                            newMap[novoNomeFormacao.trim()] = newMap[editandoFormacao];
                            delete newMap[editandoFormacao];
                          }
                          return newMap;
                        });
                        
                        // Atualizar referências em formacaoRegistros
                        setFormacaoRegistros(prev => {
                          const newMap = { ...prev };
                          if (newMap[editandoFormacao]) {
                            newMap[novoNomeFormacao.trim()] = newMap[editandoFormacao];
                            delete newMap[editandoFormacao];
                          }
                          return newMap;
                        });
                        
                        // Atualizar formação selecionada se necessário
                        if (formacaoSelecionada === editandoFormacao) {
                          setFormacaoSelecionada(novoNomeFormacao.trim());
                        }
                        
                        // Atualizar formacaoAcademica se necessário
                        if (formacaoAcademica === editandoFormacao) {
                          setFormacaoAcademica(novoNomeFormacao.trim());
                        }
                        
                        toast.success('Nome da formação atualizado!');
                      }
                      setEditandoFormacao(null);
                      setNovoNomeFormacao('');
                    }}
                    disabled={!novoNomeFormacao.trim()}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
