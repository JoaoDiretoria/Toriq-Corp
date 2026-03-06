import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useEmpresaWhiteLabel } from '@/hooks/useWhiteLabel';
import { useAccessLog } from '@/hooks/useAccessLog';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Loader2, 
  FileCheck,
  Info,
  Users,
  Paperclip,
  ClipboardList,
  Star,
  PenTool,
  Calendar,
  Building2,
  GraduationCap,
  Plus,
  Upload,
  Trash2,
  QrCode,
  UserPlus,
  CheckSquare,
  Eye,
  Copy,
  Check,
  ExternalLink,
  UserCheck,
  Search,
  XCircle,
  Award,
  Download,
  CheckCircle,
  ListChecks,
  FileText,
  AlertTriangle,
  AlertCircle,
  Camera,
  ScanFace,
  MapPin,
  Clock,
  X,
  User,
  Building,
  ShieldAlert,
  Settings2,
  HardHat,
  Briefcase,
  UserCog,
  Save,
  HelpCircle,
  BookOpen,
  FileSpreadsheet,
  Settings,
  MoreVertical,
  UserMinus,
  CalendarX,
  Wrench,
  Replace,
  UserX
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { jsPDF } from 'jspdf';
import { addMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReorientacaoViewDialog } from '@/components/sst/ReorientacaoViewDialog';
import { TurmaDocumentacao } from '@/components/turma/TurmaDocumentacao';
import { ColaboradoresPendentesList } from '@/components/turma/ColaboradoresPendentesList';
import { FluxoPosTesteCompleto } from '@/components/turma/FluxoPosTesteCompleto';
import { SignaturePadSimple } from '@/components/ui/signature-pad-simple';
import { SignaturePad } from '@/components/ui/signature-pad';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import heic2any from 'heic2any';
import { AvaliacaoReacaoForm } from '@/components/avaliacao/AvaliacaoReacaoForm';
import { AvaliacaoReacaoResultados } from '@/components/avaliacao/AvaliacaoReacaoResultados';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { TurmaAuditoriaTab } from '@/components/turma/TurmaAuditoriaTab';
import { useGerenciarTurmaAuditoria } from '@/hooks/useGerenciarTurmaAuditoria';
import { useCurrentScreen } from '@/hooks/useCurrentScreen';
import { format, parseISO } from 'date-fns';
import { faceApiService } from '@/utils/facial-recognition';
import { ptBR } from 'date-fns/locale';

interface TurmaDetalhes {
  id: string;
  numero_turma: number;
  codigo_turma: string | null;
  cliente_nome: string;
  cliente_id: string;
  treinamento_nome: string;
  treinamento_norma: string;
  treinamento_id: string;
  tipo_treinamento: string;
  data_inicio: string;
  data_fim: string;
  instrutor_nome: string | null;
  instrutor_id: string | null;
  instrutor_formacao: string | null;
  quantidade_participantes: number;
  status: string;
  validado: boolean;
  carga_horaria_total?: number | null;
  aulas: Array<{
    data: string;
    hora_inicio: string;
    hora_fim: string;
  }>;
}

interface ColaboradorTurma {
  id: string;
  colaborador_id: string;
  nome: string;
  cpf: string;
  matricula: string | null;
  foto_url: string | null;
  data_treinamento: string;
  nota_pre_teste: number | null;
  nota_pos_teste: number | null;
  acertos_pre_teste: number | null;
  acertos_pos_teste: number | null;
  resultado: 'aprovado' | 'reprovado' | 'aguardando' | null;
  reorientado: boolean;
  presente: boolean;
  presencas: Record<string, boolean>; // presença por data da aula
  assinaturas: Record<string, string | null>; // assinatura por data da aula
  fotoValidacoes: Record<string, {
    foto_validacao: string | null;
    hora_validacao: string | null;
    similaridade_facial: number | null;
    dispositivo_captura: string | null;
    latitude_captura: number | null;
    longitude_captura: number | null;
    local_captura: string | null;
  } | null>; // dados de validação facial por data
  avaliacao_reacao_respondida: boolean;
  assinatura_certificado: string | null; // assinatura para o certificado
}

interface ColaboradorEmpresa {
  id: string;
  nome: string;
  cpf: string;
  matricula: string | null;
  foto_url: string | null;
  precisaTreinamento: boolean;
  jaNaTurma: boolean;
}

interface TreinamentoDetalhes {
  id: string;
  norma: string;
  nome: string;
  ch_formacao: number;
  ch_reciclagem: number;
  validade: string;
  ch_formacao_obrigatoria: boolean;
  ch_reciclagem_obrigatoria: boolean;
  conteudo_programatico: string | null;
  observacoes: string | null;
}

interface InstrutorDetalhes {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  formacao_academica: string | null;
  formacoes: Array<{
    id: string;
    nome: string;
    registro_tipo: string | null;
    registro_numero: string | null;
    registro_estado: string | null;
    anexo_url: string | null;
  }>;
  treinamento_documento_url: string | null;
  formacao_certificados: Array<{
    id: string;
    formacao_nome: string;
    registro_tipo: string | null;
    registro_numero: string | null;
    registro_estado: string | null;
  }>;
}

interface GerenciarTurmaProps {
  turmaIdProp?: string;
  isInstrutorMode?: boolean;
  readOnly?: boolean;
}

export default function GerenciarTurma({ turmaIdProp, isInstrutorMode = false, readOnly = false }: GerenciarTurmaProps) {
  const { turmaId: turmaIdParam } = useParams<{ turmaId: string }>();
  const turmaId = turmaIdProp || turmaIdParam;
  const navigate = useNavigate();
  const { empresa, profile, user, loading: authLoading } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { logView, logCreate, logUpdate, logDelete } = useAccessLog();
  const { setCurrentScreen } = useCurrentScreen();
  const auditoria = useGerenciarTurmaAuditoria();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  const { config: whiteLabelConfig } = useEmpresaWhiteLabel(empresaId);
  
  // Roles que podem editar: empresa_sst, instrutor, admin_vertical
  // cliente_final só pode visualizar (read-only)
  // Se o profile ainda não carregou, assume que pode editar (será verificado depois)
  const canEdit = !profile ? true : (profile.role === 'empresa_sst' || profile.role === 'instrutor' || profile.role === 'admin_vertical');
  const isReadOnly = readOnly || (profile && !canEdit) || profile?.role === 'cliente_final';
  
  // Estado para verificação de autorização (instrutor só pode ver suas turmas)
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  
  // Estado para verificar se a empresa cliente tem reconhecimento facial ativado
  const [reconhecimentoFacialAtivo, setReconhecimentoFacialAtivo] = useState(false);
  const [loadingReconhecimentoFacial, setLoadingReconhecimentoFacial] = useState(false);
  
  const [turma, setTurma] = useState<TurmaDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('geral');
  const [activeDocTitle, setActiveDocTitle] = useState<string | null>(null);
  
  // Detail views states (Geral tab)
  const [treinamentoDetalhes, setTreinamentoDetalhes] = useState<TreinamentoDetalhes | null>(null);
  const [instrutorDetalhes, setInstrutorDetalhes] = useState<InstrutorDetalhes | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  // Atualizar tela atual no contexto global (para o widget de suporte saber a aba ativa)
  useEffect(() => {
    const tabNames: Record<string, string> = {
      'geral': 'Aba Geral',
      'lista-presenca': 'Lista de Presença',
      'anexos': 'Anexos',
      'provas': 'Provas e Sinistros',
      'avaliacao': 'Avaliação de Reação',
      'avaliacao-reacao': 'Avaliação de Reação',
      'certificados': 'Certificados',
      'relatorio': 'Relatório',
      'categorizacao': 'Categorização Técnica',
      'categorizacao-tecnica': 'Categorização Técnica',
      'auditoria': 'Auditoria',
      'ajuda': 'Ajuda / Documentação',
    };
    const tabLabel = tabNames[activeTab] || activeTab;
    const codigoTurma = turma?.codigo_turma || '';
    let telaNome = codigoTurma
      ? `Turma ${codigoTurma} > ${tabLabel}`
      : `Gestão de Turma > ${tabLabel}`;
    if (activeTab === 'ajuda' && activeDocTitle) {
      telaNome += ` > ${activeDocTitle}`;
    }
    setCurrentScreen('gerenciar-turma', isInstrutorMode ? 'instrutor' : 'sst', telaNome);
  }, [activeTab, activeDocTitle, turma?.codigo_turma, setCurrentScreen, isInstrutorMode]);
  
  // Lista de Presença states
  const [colaboradoresTurma, setColaboradoresTurma] = useState<ColaboradorTurma[]>([]);
  const [colaboradoresEmpresa, setColaboradoresEmpresa] = useState<ColaboradorEmpresa[]>([]);
  const [loadingColaboradores, setLoadingColaboradores] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState('selecionar');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // Configurações da Lista de Presença
  const [apagarPresencaDialogOpen, setApagarPresencaDialogOpen] = useState(false);
  const [dataPresencaApagar, setDataPresencaApagar] = useState<string | null>(null);
  const [apagandoPresenca, setApagandoPresenca] = useState(false);
  const [removerColaboradorDialogOpen, setRemoverColaboradorDialogOpen] = useState(false);
  const [colaboradorParaRemover, setColaboradorParaRemover] = useState<ColaboradorTurma | null>(null);
  const [removendoColaborador, setRemovendoColaborador] = useState(false);
  
  // Novo colaborador form
  const [novoNome, setNovoNome] = useState('');
  const [novoCpf, setNovoCpf] = useState('');
  const [novaMatricula, setNovaMatricula] = useState('');
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [novaFotoPreview, setNovaFotoPreview] = useState<string | null>(null);
  const [salvandoColaborador, setSalvandoColaborador] = useState(false);

  // Provas states
  const [provas, setProvas] = useState<any[]>([]);
  const [loadingProvas, setLoadingProvas] = useState(false);
  const [qrCodeProvaUrl, setQrCodeProvaUrl] = useState('');
  const [provaSearchTerm, setProvaSearchTerm] = useState('');
  const [provaFilterTipo, setProvaFilterTipo] = useState<'todos' | 'pre_teste' | 'pos_teste'>('todos');
  const [provaViewerOpen, setProvaViewerOpen] = useState(false);
  const [provaViewerData, setProvaViewerData] = useState<any>(null);
  const [provaViewerQuestoes, setProvaViewerQuestoes] = useState<any[]>([]);
  const [loadingProvaViewer, setLoadingProvaViewer] = useState(false);
  const [provaViewerPage, setProvaViewerPage] = useState(0);
  const [provaViewerPages, setProvaViewerPages] = useState<{ start: number; end: number }[]>([]);
  const [generatingProvaPDF, setGeneratingProvaPDF] = useState(false);
  const provaViewerMeasureRef = useRef<HTMLDivElement>(null);
  const provaViewerHeaderRef = useRef<HTMLDivElement>(null);
  const provaViewerA4Ref = useRef<HTMLDivElement>(null);

  // Upload reorientação states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedColaboradorUpload, setSelectedColaboradorUpload] = useState<ColaboradorTurma | null>(null);

  // Visualização de reorientação states
  const [reorientacaoViewOpen, setReorientacaoViewOpen] = useState(false);
  const [selectedColaboradorReorientacao, setSelectedColaboradorReorientacao] = useState<ColaboradorTurma | null>(null);

  // Colaboradores pendentes de aprovação
  interface ColaboradorPendente {
    id: string;
    nome: string;
    cpf: string;
    created_at: string;
  }
  const [colaboradoresPendentes, setColaboradoresPendentes] = useState<ColaboradorPendente[]>([]);
  const [loadingPendentes, setLoadingPendentes] = useState(false);
  const [processandoAprovacao, setProcessandoAprovacao] = useState<string | null>(null);

  // Validação de certificados em lote
  const [validacaoDialogOpen, setValidacaoDialogOpen] = useState(false);
  const [validacaoTipo, setValidacaoTipo] = useState<'todos' | 'selecao' | 'exceto'>('todos');
  const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState<string[]>([]);
  const [validandoCertificados, setValidandoCertificados] = useState(false);
  const [certificadosValidados, setCertificadosValidados] = useState<string[]>([]);
  const [certificadosData, setCertificadosData] = useState<Record<string, { url: string; path: string }>>({});

  // Dialog de marcar presença via QR Code
  const [presencaDialogOpen, setPresencaDialogOpen] = useState(false);
  const [qrCodePresencaUrl, setQrCodePresencaUrl] = useState('');

  // Dialog de reorientação via instrutor
  const [reorientacaoInstrutorDialogOpen, setReorientacaoInstrutorDialogOpen] = useState(false);
  const [selectedColaboradorReorientacaoInstrutor, setSelectedColaboradorReorientacaoInstrutor] = useState<ColaboradorTurma | null>(null);
  const [questoesProva, setQuestoesProva] = useState<Array<{
    id: string;
    numero: number;
    pergunta: string;
    alternativas: Array<{ id: string; letra: string; texto: string; correta: boolean }>;
  }>>([]);
  const [questoesErradasSelecionadas, setQuestoesErradasSelecionadas] = useState<Array<{ questaoId: string; alternativaId: string }>>([]);
  const [loadingQuestoes, setLoadingQuestoes] = useState(false);
  const [showReorientacaoSignature, setShowReorientacaoSignature] = useState(false);
  const [savingReorientacao, setSavingReorientacao] = useState(false);
  const [assinaturaReorientacao, setAssinaturaReorientacao] = useState<string | null>(null);

  // Visualização de assinatura expandida
  const [assinaturaExpandida, setAssinaturaExpandida] = useState<string | null>(null);

  // Dialog de edição de colaborador
  const [editColaboradorDialogOpen, setEditColaboradorDialogOpen] = useState(false);
  const [editColaboradorData, setEditColaboradorData] = useState<{
    id: string;
    colaborador_id: string;
    nome: string;
    cpf: string;
    foto_url: string | null;
  } | null>(null);
  const [editColaboradorNome, setEditColaboradorNome] = useState('');
  const [editColaboradorCpf, setEditColaboradorCpf] = useState('');
  const [savingEditColaborador, setSavingEditColaborador] = useState(false);

  // Dialog de gabarito
  const [gabaritoDialogOpen, setGabaritoDialogOpen] = useState(false);
  const [gabaritoMode, setGabaritoMode] = useState<'completo' | 'resumido'>('resumido');
  const [gabaritoQuestoes, setGabaritoQuestoes] = useState<Array<{
    numero: number;
    pergunta: string;
    alternativas: Array<{ letra: string; texto: string; correta: boolean }>;
  }>>([]);
  const [loadingGabarito, setLoadingGabarito] = useState(false);

  // Dialog de registrar prova via instrutor
  const [registrarProvaDialogOpen, setRegistrarProvaDialogOpen] = useState(false);
  const [registrarProvaTipo, setRegistrarProvaTipo] = useState<'pre_teste' | 'pos_teste'>('pos_teste');
  const [registrarProvaColaboradorId, setRegistrarProvaColaboradorId] = useState<string>('');
  const [registrarProvaMode, setRegistrarProvaMode] = useState<'todas' | 'incorretas' | null>(null);
  const [fluxoPosTesteCompleto, setFluxoPosTesteCompleto] = useState(false); // Fluxo unificado pós-teste
  const [registrarProvaQuestoes, setRegistrarProvaQuestoes] = useState<Array<{
    id: string;
    numero: number;
    pergunta: string;
    alternativas: Array<{ id: string; letra: string; texto: string; correta: boolean }>;
  }>>([]);
  const [registrarProvaRespostas, setRegistrarProvaRespostas] = useState<Record<string, string>>({});
  const [registrarProvaIncorretas, setRegistrarProvaIncorretas] = useState<Array<{ questaoId: string; alternativaId: string }>>([]);
  const [loadingRegistrarProva, setLoadingRegistrarProva] = useState(false);
  const [savingRegistrarProva, setSavingRegistrarProva] = useState(false);
  const [colaboradoresSemProva, setColaboradoresSemProva] = useState<Array<{ id: string; colaborador_id: string; nome: string }>>([]);

  // Dialog de apagar prova
  const [apagarProvaDialogOpen, setApagarProvaDialogOpen] = useState(false);
  const [provaParaApagar, setProvaParaApagar] = useState<{
    id: string;
    tipo_prova: 'pre_teste' | 'pos_teste';
    colaborador_id: string;
    colaborador_nome: string;
  } | null>(null);
  const [apagarProvaOpcoes, setApagarProvaOpcoes] = useState({
    apagarReorientacao: false,
    apagarAvaliacaoReacao: false,
    apagarAssinaturaCertificado: false,
  });
  const [apagandoProva, setApagandoProva] = useState(false);
  const [provaTemDadosRelacionados, setProvaTemDadosRelacionados] = useState({
    temReorientacao: false,
    temAvaliacaoReacao: false,
    temAssinaturaCertificado: false,
  });
  const [apagarProvaEtapa, setApagarProvaEtapa] = useState<1 | 2>(1);
  const [apagarProvaMotivo, setApagarProvaMotivo] = useState<string>('');
  const [apagarProvaMotivoOutro, setApagarProvaMotivoOutro] = useState<string>('');
  const [apagarProvaConfirmacao, setApagarProvaConfirmacao] = useState<string>('');

  // Dialog de validação facial (fluxo unificado: facial + assinatura)
  const [facialDialogOpen, setFacialDialogOpen] = useState(false);
  const [selectedColaboradorFacial, setSelectedColaboradorFacial] = useState<{
    colaboradorTurmaId: string;
    colaboradorId: string;
    colaboradorNome: string;
    dataAula: string;
    fotoColaborador: string | null;
  } | null>(null);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [savingFacial, setSavingFacial] = useState(false);
  const [facialLogs, setFacialLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }>>([]);
  const [facialStep, setFacialStep] = useState<'camera' | 'captured' | 'processing' | 'authenticated' | 'signature' | 'saving' | 'success' | 'failed'>('camera');
  const [collectedSignature, setCollectedSignature] = useState<string | null>(null);
  const [facialSimilarity, setFacialSimilarity] = useState<number>(0);
  const [uploadingNewPhoto, setUploadingNewPhoto] = useState(false);
  const [captureMetadata, setCaptureMetadata] = useState<{
    deviceName: string;
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
    captureTime: string;
  } | null>(null);
  const newPhotoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Dialog para visualizar detalhes da validação facial
  const [facialDetailDialogOpen, setFacialDetailDialogOpen] = useState(false);
  const [selectedFacialDetail, setSelectedFacialDetail] = useState<{
    colaboradorNome: string;
    colaboradorCpf: string;
    fotoOriginal: string | null;
    fotoValidacao: string | null;
    assinatura: string | null;
    treinamentoNome: string;
    treinamentoNorma: string;
    dataValidacao: string;
    horaValidacao: string;
    deviceName: string | null;
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
    similaridade: number | null;
  } | null>(null);

  // Função para adicionar log de processamento facial
  const addFacialLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const time = format(new Date(), 'HH:mm:ss');
    setFacialLogs(prev => [...prev, { time, message, type }]);
  };

  // Dialog de assinatura do certificado
  const [assinaturaCertificadoDialogOpen, setAssinaturaCertificadoDialogOpen] = useState(false);
  const [selectedColaboradorCertificado, setSelectedColaboradorCertificado] = useState<{
    colaboradorTurmaId: string;
    colaboradorNome: string;
    assinaturaAtual: string | null;
  } | null>(null);
  const [savingAssinaturaCertificado, setSavingAssinaturaCertificado] = useState(false);

  // Estado para copiar link
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // ========== ESTADOS PARA ABA TI (apenas jhony@vtreinamentos.com.br) ==========
  const [tiDialogOpen, setTiDialogOpen] = useState(false);
  const [tiFerramentaAtiva, setTiFerramentaAtiva] = useState<'substituir-assinatura' | 'apagar-colaborador' | null>(null);
  
  // Substituir Assinatura
  const [tiAssinaturasOrigem, setTiAssinaturasOrigem] = useState<Array<{
    id: string;
    tipo: 'presenca' | 'reorientacao' | 'certificado';
    colaborador_nome: string;
    colaborador_id: string;
    data?: string;
    assinatura_url: string;
  }>>([]);
  const [tiAssinaturaOrigemSelecionada, setTiAssinaturaOrigemSelecionada] = useState<string | null>(null);
  const [tiAssinaturaDestinoSelecionada, setTiAssinaturaDestinoSelecionada] = useState<string | null>(null);
  const [tiLoadingAssinaturas, setTiLoadingAssinaturas] = useState(false);
  const [tiSubstituindoAssinatura, setTiSubstituindoAssinatura] = useState(false);
  const [tiFiltroTipoAssinatura, setTiFiltroTipoAssinatura] = useState<'todos' | 'presenca' | 'reorientacao' | 'certificado'>('todos');
  const [tiBuscaAssinatura, setTiBuscaAssinatura] = useState('');
  
  // Apagar Colaborador da Empresa
  const [tiColaboradoresEmpresa, setTiColaboradoresEmpresa] = useState<Array<{
    id: string;
    nome: string;
    cpf: string;
    empresa_nome: string;
    empresa_id: string;
  }>>([]);
  const [tiColaboradorSelecionado, setTiColaboradorSelecionado] = useState<string | null>(null);
  const [tiLoadingColaboradores, setTiLoadingColaboradores] = useState(false);
  const [tiApagandoColaborador, setTiApagandoColaborador] = useState(false);
  const [tiBuscaColaborador, setTiBuscaColaborador] = useState('');
  const [tiConfirmacaoApagar, setTiConfirmacaoApagar] = useState('');

  // Busca de colaboradores
  const [searchColaborador, setSearchColaborador] = useState('');

  // Upload de foto de colaborador no modal
  const fotoColaboradorInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFotoColaboradorId, setUploadingFotoColaboradorId] = useState<string | null>(null);
  
  // Câmera para foto de colaborador
  const [cameraFotoDialogOpen, setCameraFotoDialogOpen] = useState(false);
  const [cameraFotoColaboradorId, setCameraFotoColaboradorId] = useState<string | null>(null);
  const cameraFotoVideoRef = useRef<HTMLVideoElement>(null);
  const cameraFotoCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraFotoStreamRef = useRef<MediaStream | null>(null);
  const [cameraFotoReady, setCameraFotoReady] = useState(false);
  const [fotoOpcaoDialogOpen, setFotoOpcaoDialogOpen] = useState(false);
  const [fotoOpcaoColaboradorId, setFotoOpcaoColaboradorId] = useState<string | null>(null);

  // Anexos states
  interface AnexoItem {
    id: string;
    url: string;
    nome: string;
    tipo: 'lista_presenca' | 'galeria' | 'case' | 'avaliacao' | 'relatorio';
    created_at: string;
    descricao?: string;
    data_foto?: string;
    file_path?: string;
  }
  const [anexosListaPresenca, setAnexosListaPresenca] = useState<AnexoItem[]>([]);
  const [anexosGaleria, setAnexosGaleria] = useState<AnexoItem[]>([]);
  const [anexosCases, setAnexosCases] = useState<AnexoItem[]>([]);
  const [anexosAvaliacao, setAnexosAvaliacao] = useState<AnexoItem[]>([]);
  const [anexosRelatorio, setAnexosRelatorio] = useState<AnexoItem[]>([]);
  const [anexosRelatorioPresencas, setAnexosRelatorioPresencas] = useState<AnexoItem[]>([]);
  const [anexosRelatorioSinistros, setAnexosRelatorioSinistros] = useState<AnexoItem[]>([]);
  const [gerandoListaPresenca, setGerandoListaPresenca] = useState(false);
  
  // Dialog de upload de galeria
  const [uploadGaleriaDialogOpen, setUploadGaleriaDialogOpen] = useState(false);
  const [uploadGaleriaFile, setUploadGaleriaFile] = useState<File | null>(null);
  const [uploadGaleriaDescricao, setUploadGaleriaDescricao] = useState('');
  const [uploadGaleriaDataRegistro, setUploadGaleriaDataRegistro] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [uploadGaleriaLoading, setUploadGaleriaLoading] = useState(false);
  const [convertendoHeicId, setConvertendoHeicId] = useState<string | null>(null);
  
  // Dialog de compromisso profissional (antes de anexar foto)
  const [compromissoDialogOpen, setCompromissoDialogOpen] = useState(false);
  const [compromissoAceito, setCompromissoAceito] = useState(false);
  
  // Dialog de edição de foto da galeria (data e descrição)
  const [editarFotoDialogOpen, setEditarFotoDialogOpen] = useState(false);
  const [editarFotoAnexo, setEditarFotoAnexo] = useState<AnexoItem | null>(null);
  const [editarFotoNovaData, setEditarFotoNovaData] = useState('');
  const [editarFotoNovaDescricao, setEditarFotoNovaDescricao] = useState('');

  // Cases de sucesso states
  interface AvaliacaoReacaoItem {
    id: string;
    colaborador_id: string;
    colaborador_nome: string;
    sugestoes_comentarios: string;
    created_at: string;
    is_case_sucesso: boolean;
  }
  const [avaliacoesReacao, setAvaliacoesReacao] = useState<AvaliacaoReacaoItem[]>([]);
  const [casesSucessoIds, setCasesSucessoIds] = useState<string[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  // Estado para visualização de imagem expandida
  const [imagemExpandida, setImagemExpandida] = useState<string | null>(null);
  const [imagemExpandidaNome, setImagemExpandidaNome] = useState<string>('');

  // Estado para confirmação de exclusão de imagem
  const [deleteImagemDialogOpen, setDeleteImagemDialogOpen] = useState(false);
  const [deleteImagemAnexo, setDeleteImagemAnexo] = useState<AnexoItem | null>(null);
  const [deleteImagemTipo, setDeleteImagemTipo] = useState<'lista_presenca' | 'galeria' | 'case' | 'avaliacao' | 'relatorio'>('galeria');

  // Estado para download em lote de certificados
  const [downloadCertSelecionados, setDownloadCertSelecionados] = useState<string[]>([]);
  const [downloadingCerts, setDownloadingCerts] = useState(false);

  // Estado para download de documentos validados em ZIP (background)
  const [downloadDocsProgress, setDownloadDocsProgress] = useState<number | null>(null);
  const downloadDocsAbortRef = useRef<boolean>(false);

  // Sinistros states
  interface TipoSinistro {
    id: string;
    codigo: string;
    nome: string;
    descricao: string | null;
    acao_padrao: string;
  }
  interface SinistroColaborador {
    id: string;
    turma_colaborador_id: string;
    tipo_sinistro_id: string;
    tipo_sinistro?: TipoSinistro;
    acao: string;
    descricao: string | null;
    fotos: Array<{ id: string; foto_url: string; descricao: string | null; data_captura: string }>;
    created_at: string;
    registrado_por?: string;
    instrutor?: { nome: string; email?: string };
  }
  const [sinistroDialogOpen, setSinistroDialogOpen] = useState(false);
  const [tiposSinistro, setTiposSinistro] = useState<TipoSinistro[]>([]);
  const [sinistrosColaboradores, setSinistrosColaboradores] = useState<Record<string, SinistroColaborador[]>>({});
  const [sinistroColaboradorId, setSinistroColaboradorId] = useState<string>('');
  const [sinistroTipoId, setSinistroTipoId] = useState<string>('');
  const [sinistroAcao, setSinistroAcao] = useState<string>('reprovacao');
  const [sinistroDescricao, setSinistroDescricao] = useState<string>('');
  const [sinistroFotos, setSinistroFotos] = useState<Array<{ file?: File; preview: string; descricao: string; data_captura: string }>>([]);
  const [savingSinistro, setSavingSinistro] = useState(false);
  const [loadingSinistros, setLoadingSinistros] = useState(false);
  const sinistroFotoInputRef = useRef<HTMLInputElement>(null);
  const [subAbaProvasSinistros, setSubAbaProvasSinistros] = useState<'provas' | 'sinistros'>('provas');
  const [sinistroDetalheDialogOpen, setSinistroDetalheDialogOpen] = useState(false);
  const [selectedSinistroDetalhe, setSelectedSinistroDetalhe] = useState<{
    sinistro: SinistroColaborador;
    colaborador: ColaboradorTurma;
    instrutor?: { nome: string; email?: string };
  } | null>(null);

  // Ref para a tabela de presença
  const listaPresencaRef = useRef<HTMLDivElement>(null);

  // Estados para Categorização Técnica (apenas empresa_sst)
  interface TipoEspacoConfinado {
    id: string;
    nome: string;
  }
  interface TipoAtividade {
    id: string;
    nome: string;
  }
  interface ResponsavelTecnico {
    id: string;
    nome: string;
    cargo: string;
    sigla_conselho: string; // MTE, CREA, etc
    numero_registro: string;
    estado: string;
  }
  const [tiposEspacoConfinado, setTiposEspacoConfinado] = useState<TipoEspacoConfinado[]>([]);
  const [tiposAtividade, setTiposAtividade] = useState<TipoAtividade[]>([]);
  const [responsaveisTecnicos, setResponsaveisTecnicos] = useState<ResponsavelTecnico[]>([]);
  const [novoTipoEspaco, setNovoTipoEspaco] = useState('');
  const [novoTipoAtividade, setNovoTipoAtividade] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState({
    nome: '',
    cargo: '',
    sigla_conselho: '',
    numero_registro: '',
    estado: ''
  });
  const [loadingCategorizacao, setLoadingCategorizacao] = useState(false);
  const [savingCategorizacao, setSavingCategorizacao] = useState(false);

  // Dialog de validação digital
  const [validacaoDigitalDialogOpen, setValidacaoDigitalDialogOpen] = useState(false);
  const [validacaoDigitalUrl, setValidacaoDigitalUrl] = useState('');
  const [validacaoDigitalLoading, setValidacaoDigitalLoading] = useState(false);

  // Dialog de avaliação de reação
  const [avaliacaoReacaoDialogOpen, setAvaliacaoReacaoDialogOpen] = useState(false);
  const [selectedColaboradorAvaliacao, setSelectedColaboradorAvaliacao] = useState<ColaboradorTurma | null>(null);
  const [avaliacaoReacaoLoading, setAvaliacaoReacaoLoading] = useState(true);

  // Verificar autorização de acesso
  useEffect(() => {
    const checkAccess = async () => {
      // Se não tem turmaId, não pode verificar
      if (!turmaId) {
        setAccessChecked(true);
        setHasAccess(false);
        return;
      }
      
      // Se auth ainda está carregando, aguardar
      if (authLoading) {
        return;
      }
      
      // Se não está logado, negar acesso imediatamente
      if (!user) {
        setAccessChecked(true);
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }
      
      // Se profile ainda não carregou mas user existe, aguardar profile
      if (!profile) {
        return;
      }

      // Iniciar verificação
      setCheckingAccess(true);

      try {
        const db = supabase as any;
        
        // Buscar a turma para verificar instrutor_id e empresa_id
        const { data: turmaData, error } = await db
          .from('turmas_treinamento')
          .select('id, instrutor_id, empresa_id, cliente_id')
          .eq('id', turmaId)
          .single();

        if (error || !turmaData) {
          setHasAccess(false);
          setCheckingAccess(false);
          setAccessChecked(true);
          return;
        }

        // Admin pode acessar tudo
        if (profile.role === 'admin_vertical') {
          setHasAccess(true);
          setCheckingAccess(false);
          setAccessChecked(true);
          return;
        }

        // Empresa SST pode acessar turmas da sua empresa
        if (profile.role === 'empresa_sst' && profile.empresa_id === turmaData.empresa_id) {
          setHasAccess(true);
          setCheckingAccess(false);
          setAccessChecked(true);
          return;
        }

        // Instrutor só pode acessar suas próprias turmas
        if (profile.role === 'instrutor') {
          const { data: instrutor } = await db
            .from('instrutores')
            .select('id')
            .eq('user_id', profile.id)
            .single();

          if (instrutor && turmaData.instrutor_id === instrutor.id) {
            setHasAccess(true);
            setCheckingAccess(false);
            setAccessChecked(true);
            return;
          }
        }

        // Cliente final pode acessar turmas onde é o cliente
        if (profile.role === 'cliente_final') {
          // Buscar cliente vinculado ao profile
          const { data: cliente } = await db
            .from('clientes')
            .select('id')
            .eq('user_id', profile.id)
            .single();

          if (cliente && turmaData.cliente_id === cliente.id) {
            setHasAccess(true);
            setCheckingAccess(false);
            setAccessChecked(true);
            return;
          }
        }

        // Não tem acesso
        setHasAccess(false);
        setCheckingAccess(false);
        setAccessChecked(true);
      } catch (err) {
        console.error('Erro ao verificar acesso:', err);
        setHasAccess(false);
        setCheckingAccess(false);
        setAccessChecked(true);
      }
    };

    checkAccess();
  }, [turmaId, profile, user, authLoading]);

  useEffect(() => {
    // Carregar dados se tiver acesso
    // Para cliente_final, instrutor ou readOnly, não precisa de empresaId
    const isClienteFinal = profile?.role === 'cliente_final';
    if (turmaId && (empresaId || isInstrutorMode || isReadOnly || isClienteFinal) && hasAccess) {
      fetchTurmaDetalhes();
      fetchColaboradoresTurma();
      fetchProvas();
      generateQRCodeProva();
      fetchAnexos();
      verificarCertificadosValidados();
      fetchAvaliacoesReacao();
      fetchTiposSinistro();
      fetchSinistros();
    }
  }, [turmaId, empresaId, isInstrutorMode, isReadOnly, hasAccess, profile?.role]);

  // Atualizar certificados quando a janela receber foco (ao voltar de outra aba)
  useEffect(() => {
    const handleFocus = () => {
      if (turmaId) {
        verificarCertificadosValidados();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [turmaId]);

  useEffect(() => {
    if (dialogOpen && turma?.cliente_id) {
      fetchColaboradoresEmpresa();
      generateQRCode();
      fetchColaboradoresPendentes();
    }
  }, [dialogOpen, turma?.cliente_id]);

  // Verificar se a empresa cliente tem reconhecimento facial ativado
  const checkReconhecimentoFacial = async (clienteId: string) => {
    if (!clienteId || !empresaId) return;
    setLoadingReconhecimentoFacial(true);
    try {
      const db = supabase as any;
      
      // Buscar o cliente_empresa_id da tabela clientes_sst
      const { data: clienteData } = await db
        .from('clientes_sst')
        .select('cliente_empresa_id')
        .eq('id', clienteId)
        .single();
      
      if (!clienteData?.cliente_empresa_id) {
        setReconhecimentoFacialAtivo(false);
        return;
      }
      
      // Verificar configuração de reconhecimento facial
      const { data: configData } = await db
        .from('reconhecimento_facial_config')
        .select('ativo')
        .eq('empresa_sst_id', empresaId)
        .eq('cliente_empresa_id', clienteData.cliente_empresa_id)
        .maybeSingle();
      
      setReconhecimentoFacialAtivo(configData?.ativo || false);
    } catch (error) {
      console.error('Erro ao verificar reconhecimento facial:', error);
      setReconhecimentoFacialAtivo(false);
    } finally {
      setLoadingReconhecimentoFacial(false);
    }
  };

  // Verificar reconhecimento facial quando a turma for carregada
  useEffect(() => {
    if (turma?.cliente_id && empresaId) {
      checkReconhecimentoFacial(turma.cliente_id);
    }
  }, [turma?.cliente_id, empresaId]);

  const fetchTurmaDetalhes = async () => {
    if (!turmaId) return;
    // No modo instrutor ou readOnly, não precisa de empresaId
    if (!isInstrutorMode && !isReadOnly && !empresaId) return;

    try {
      // No modo instrutor, buscar dados separadamente para evitar problemas com RLS
      if (isInstrutorMode) {
        // Buscar turma básica
        const { data: turmaData, error: turmaError } = await (supabase as any)
          .from('turmas_treinamento')
          .select(`
            id,
            numero_turma,
            codigo_turma,
            cliente_id,
            treinamento_id,
            tipo_treinamento,
            instrutor_id,
            quantidade_participantes,
            status,
            validado,
            carga_horaria_total
          `)
          .eq('id', turmaId)
          .single();

        if (turmaError) throw turmaError;

        if (turmaData) {
          // Buscar cliente
          let clienteNome = '';
          if (turmaData.cliente_id) {
            const { data: clienteData } = await (supabase as any)
              .from('clientes_sst')
              .select('nome')
              .eq('id', turmaData.cliente_id)
              .single();
            if (clienteData) clienteNome = clienteData.nome || '';
          }

          // Buscar treinamento
          let treinamentoNome = '';
          let treinamentoNorma = '';
          if (turmaData.treinamento_id) {
            const { data: treinamentoData } = await (supabase as any)
              .from('catalogo_treinamentos')
              .select('nome, norma')
              .eq('id', turmaData.treinamento_id)
              .single();
            if (treinamentoData) {
              treinamentoNome = treinamentoData.nome || '';
              treinamentoNorma = treinamentoData.norma || '';
            }
          }

          // Buscar instrutor
          let instrutorNome = null;
          let instrutorFormacao = null;
          if (turmaData.instrutor_id) {
            const { data: instrutorData } = await (supabase as any)
              .from('instrutores')
              .select('nome')
              .eq('id', turmaData.instrutor_id)
              .single();
            if (instrutorData) instrutorNome = instrutorData.nome || null;

            // Buscar formação do instrutor vinculada ao treinamento
            if (turmaData.treinamento_id) {
              const { data: formacaoData } = await (supabase as any)
                .from('instrutor_formacao_treinamento')
                .select('formacao_id, instrutor_formacoes!inner(nome)')
                .eq('instrutor_id', turmaData.instrutor_id)
                .eq('treinamento_id', turmaData.treinamento_id)
                .limit(1);
              
              if (formacaoData && formacaoData.length > 0) {
                instrutorFormacao = formacaoData[0].instrutor_formacoes?.nome || null;
              }
            }
          }

          // Buscar aulas
          const { data: aulasData } = await (supabase as any)
            .from('turmas_treinamento_aulas')
            .select('data, hora_inicio, hora_fim')
            .eq('turma_id', turmaId)
            .order('data');

          const aulas = aulasData || [];
          const datasOrdenadas = aulas.map((a: any) => a.data).sort();
          const dataInicio = datasOrdenadas[0] || '';
          const dataFim = datasOrdenadas[datasOrdenadas.length - 1] || dataInicio;

          setTurma({
            id: turmaData.id,
            numero_turma: turmaData.numero_turma,
            codigo_turma: turmaData.codigo_turma || null,
            cliente_id: turmaData.cliente_id,
            cliente_nome: clienteNome,
            treinamento_id: turmaData.treinamento_id,
            treinamento_nome: treinamentoNome,
            treinamento_norma: treinamentoNorma,
            tipo_treinamento: turmaData.tipo_treinamento || 'Inicial',
            data_inicio: dataInicio,
            data_fim: dataFim,
            instrutor_nome: instrutorNome,
            instrutor_id: turmaData.instrutor_id || null,
            instrutor_formacao: instrutorFormacao,
            quantidade_participantes: turmaData.quantidade_participantes || 0,
            status: turmaData.status,
            validado: turmaData.validado || false,
            carga_horaria_total: turmaData.carga_horaria_total || null,
            aulas: aulas.map((a: any) => ({
              data: a.data,
              hora_inicio: a.hora_inicio,
              hora_fim: a.hora_fim
            }))
          });
        }
      } else {
        // Modo normal (empresa SST) ou readOnly (cliente)
        let query = (supabase as any)
          .from('turmas_treinamento')
          .select(`
            id,
            numero_turma,
            codigo_turma,
            cliente_id,
            treinamento_id,
            tipo_treinamento,
            instrutor_id,
            quantidade_participantes,
            status,
            validado,
            cliente:clientes_sst!turmas_treinamento_cliente_id_fkey(
              nome
            ),
            treinamento:catalogo_treinamentos!turmas_treinamento_treinamento_id_fkey(
              nome,
              norma
            ),
            instrutor:instrutores!turmas_treinamento_instrutor_id_fkey(
              nome
            ),
            carga_horaria_total,
            aulas:turmas_treinamento_aulas(
              data,
              hora_inicio,
              hora_fim
            ),
            categorizacao_tecnica
          `)
          .eq('id', turmaId);
        
        // Só filtrar por empresa_id se não for readOnly
        if (!isReadOnly && empresaId) {
          query = query.eq('empresa_id', empresaId);
        }
        
        const { data, error } = await query.single();

        if (error) throw error;

        if (data) {
          const aulas = data.aulas || [];
          const datasOrdenadas = aulas
            .map((a: any) => a.data)
            .sort((a: string, b: string) => a.localeCompare(b));
          
          const dataInicio = datasOrdenadas[0] || '';
          const dataFim = datasOrdenadas[datasOrdenadas.length - 1] || dataInicio;

          // Buscar formação do instrutor vinculada ao treinamento
          let instrutorFormacao = null;
          if (data.instrutor_id && data.treinamento_id) {
            const { data: formacaoData } = await (supabase as any)
              .from('instrutor_formacao_treinamento')
              .select('formacao_id, instrutor_formacoes!inner(nome)')
              .eq('instrutor_id', data.instrutor_id)
              .eq('treinamento_id', data.treinamento_id)
              .limit(1);
            
            if (formacaoData && formacaoData.length > 0) {
              instrutorFormacao = formacaoData[0].instrutor_formacoes?.nome || null;
            }
          }

          setTurma({
            id: data.id,
            numero_turma: data.numero_turma,
            codigo_turma: data.codigo_turma || null,
            cliente_id: data.cliente_id,
            cliente_nome: data.cliente?.nome || '',
            treinamento_id: data.treinamento_id,
            treinamento_nome: data.treinamento?.nome || '',
            treinamento_norma: data.treinamento?.norma || '',
            tipo_treinamento: data.tipo_treinamento || 'Inicial',
            data_inicio: dataInicio,
            data_fim: dataFim,
            instrutor_nome: data.instrutor?.nome || null,
            instrutor_id: data.instrutor_id || null,
            instrutor_formacao: instrutorFormacao,
            quantidade_participantes: data.quantidade_participantes || 0,
            status: data.status,
            validado: data.validado || false,
            carga_horaria_total: data.carga_horaria_total || null,
            aulas: aulas.map((a: any) => ({
              data: a.data,
              hora_inicio: a.hora_inicio,
              hora_fim: a.hora_fim
            }))
          });

          // Carregar categorização técnica se existir
          if (data.categorizacao_tecnica) {
            const cat = data.categorizacao_tecnica;
            if (cat.tipos_espaco_confinado) {
              setTiposEspacoConfinado(cat.tipos_espaco_confinado);
            }
            if (cat.tipos_atividade) {
              setTiposAtividade(cat.tipos_atividade);
            }
            if (cat.responsaveis_tecnicos) {
              setResponsaveisTecnicos(cat.responsaveis_tecnicos);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Erro ao buscar detalhes da turma:', error);
      toast.error('Erro ao carregar detalhes da turma');
    } finally {
      setLoading(false);
    }
  };

  // Verificar certificados já validados
  const verificarCertificadosValidados = async () => {
    if (!turmaId) return;
    
    const { data } = await (supabase as any)
      .from('colaboradores_certificados')
      .select('colaborador_id, arquivo_url, arquivo_path')
      .eq('turma_id', turmaId);
    
    if (data) {
      setCertificadosValidados(data.map((c: any) => c.colaborador_id));
      // Armazenar URLs dos certificados
      const certData: Record<string, { url: string; path: string }> = {};
      data.forEach((c: any) => {
        if (c.arquivo_url) {
          certData[c.colaborador_id] = { url: c.arquivo_url, path: c.arquivo_path || '' };
        }
      });
      setCertificadosData(certData);
    }
  };

  // Função para validar certificados em lote
  const handleValidarCertificadosLote = async () => {
    if (!turmaId || !turma) return;
    
    // Filtrar colaboradores aprovados SEM sinistro - colaboradores com sinistro NUNCA recebem certificado
    const aprovados = colaboradoresTurma.filter(c => 
      c.nota_pos_teste !== null && 
      c.nota_pos_teste >= 7 && 
      !sinistrosColaboradores[c.id]
    );
    
    // Determinar quais colaboradores validar (agora permite revalidar)
    let colaboradoresParaValidar: ColaboradorTurma[] = [];
    
    if (validacaoTipo === 'todos') {
      colaboradoresParaValidar = aprovados; // Permite revalidar todos
    } else if (validacaoTipo === 'selecao') {
      colaboradoresParaValidar = aprovados.filter(c => 
        colaboradoresSelecionados.includes(c.colaborador_id)
      );
    } else if (validacaoTipo === 'exceto') {
      colaboradoresParaValidar = aprovados.filter(c => 
        !colaboradoresSelecionados.includes(c.colaborador_id)
      );
    }

    if (colaboradoresParaValidar.length === 0) {
      toast.info('Nenhum certificado para validar');
      return;
    }

    setValidandoCertificados(true);
    let validados = 0;
    let erros = 0;

    // Buscar validade do treinamento no catálogo
    let validadeMeses = 12;
    if (turma.treinamento_id) {
      const { data: treinamentoData } = await (supabase as any)
        .from('catalogo_treinamentos')
        .select('validade')
        .eq('id', turma.treinamento_id)
        .single();
      if (treinamentoData?.validade) {
        const v = treinamentoData.validade.toLowerCase().trim();
        if (v === 'semestral') validadeMeses = 6;
        else if (v === 'anual') validadeMeses = 12;
        else if (v === 'bienal') validadeMeses = 24;
        else if (v === 'trienal') validadeMeses = 36;
        else if (v === 'quadrienal') validadeMeses = 48;
        else if (v === 'quinquenal') validadeMeses = 60;
      }
    }

    // Buscar data fim da turma (última aula) para calcular validade
    const { data: aulasData } = await (supabase as any)
      .from('turmas_treinamento_aulas')
      .select('data')
      .eq('turma_id', turmaId)
      .order('data', { ascending: false })
      .limit(1);
    const dataFimTurma = aulasData?.[0]?.data ? parseISO(aulasData[0].data) : new Date();

    for (const colaborador of colaboradoresParaValidar) {
      try {
        const dataEmissao = new Date();
        const dataValidade = addMonths(dataFimTurma, validadeMeses);

        // Verificar se já existe certificado para este colaborador/turma
        const { data: existingCert } = await (supabase as any)
          .from('colaboradores_certificados')
          .select('id')
          .eq('colaborador_id', colaborador.colaborador_id)
          .eq('turma_id', turmaId)
          .maybeSingle();

        if (existingCert) {
          // Atualizar o existente
          const { error: updateError } = await (supabase as any)
            .from('colaboradores_certificados')
            .update({
              nome: `Certificado NR-${turma.treinamento_norma} - ${turma.treinamento_nome}`,
              data_emissao: format(dataEmissao, 'yyyy-MM-dd'),
              data_validade: format(dataValidade, 'yyyy-MM-dd'),
              observacoes: `Tipo: ${turma.tipo_treinamento === 'reciclagem' ? 'Reciclagem' : 'Formação'} | Revalidado em lote em ${format(dataEmissao, 'dd/MM/yyyy HH:mm')}`
            })
            .eq('id', existingCert.id);

          if (updateError) throw updateError;
        } else {
          // Inserir novo
          const { error: insertError } = await (supabase as any)
            .from('colaboradores_certificados')
            .insert({
              colaborador_id: colaborador.colaborador_id,
              turma_id: turmaId,
              nome: `Certificado NR-${turma.treinamento_norma} - ${turma.treinamento_nome}`,
              data_emissao: format(dataEmissao, 'yyyy-MM-dd'),
              data_validade: format(dataValidade, 'yyyy-MM-dd'),
              observacoes: `Tipo: ${turma.tipo_treinamento === 'reciclagem' ? 'Reciclagem' : 'Formação'} | Validado em lote`
            });

          if (insertError) throw insertError;
        }
        validados++;
      } catch (error) {
        console.error('Erro ao validar certificado:', error);
        erros++;
      }
    }

    // Atualizar lista de certificados validados
    await verificarCertificadosValidados();
    
    // Registrar auditoria de validação em lote
    if (turma && validados > 0) {
      auditoria.registrarAuditoria({
        turmaId: turmaId!,
        turmaCodigo: turma.codigo_turma,
        acao: 'validou',
        entidade: 'certificado',
        descricao: `Validação em lote de ${validados} certificado(s). Tipo: ${validacaoTipo}. ${erros > 0 ? `Erros: ${erros}` : ''}`,
        clienteId: turma.cliente_id,
        clienteNome: turma.cliente_nome,
        treinamentoId: turma.treinamento_id,
        treinamentoNome: turma.treinamento_nome,
        treinamentoNorma: turma.treinamento_norma,
        valorNovo: `${validados} certificados validados`
      });
    }
    
    setValidandoCertificados(false);
    setValidacaoDialogOpen(false);
    setColaboradoresSelecionados([]);
    
    if (erros === 0) {
      toast.success(`${validados} certificado(s) validado(s) com sucesso!`);
    } else {
      toast.warning(`${validados} validado(s), ${erros} erro(s)`);
    }
  };

  const handleBaixarCertificadosLote = async () => {
    if (downloadCertSelecionados.length === 0) {
      toast.info('Selecione ao menos um certificado para baixar');
      return;
    }

    setDownloadingCerts(true);
    try {
      const colaboradoresComCert = colaboradoresTurma.filter(c => 
        downloadCertSelecionados.includes(c.colaborador_id) &&
        certificadosValidados.includes(c.colaborador_id) &&
        certificadosData[c.colaborador_id]?.url
      );

      if (colaboradoresComCert.length === 0) {
        toast.error('Nenhum certificado validado encontrado para download');
        return;
      }

      if (colaboradoresComCert.length === 1) {
        const colab = colaboradoresComCert[0];
        const response = await fetch(certificadosData[colab.colaborador_id].url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const nomeNormalizado = colab.nome
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        link.download = `certificado_${nomeNormalizado}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Certificado baixado!');
      } else {
        const zip = new JSZip();
        let baixados = 0;

        for (const colab of colaboradoresComCert) {
          try {
            const response = await fetch(certificadosData[colab.colaborador_id].url);
            const blob = await response.blob();
            const nomeNormalizado = colab.nome
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
            zip.file(`certificado_${nomeNormalizado}.pdf`, blob);
            baixados++;
          } catch (err) {
            console.error(`Erro ao baixar certificado de ${colab.nome}:`, err);
          }
        }

        if (baixados === 0) {
          toast.error('Não foi possível baixar nenhum certificado');
          return;
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        const turmaCode = turma?.codigo_turma || `turma_${turma?.numero_turma}`;
        link.download = `certificados_${turmaCode}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success(`${baixados} certificado(s) baixado(s) em ZIP!`);
        
        // Registrar auditoria de download em lote
        if (turma) {
          auditoria.auditarCertificado(
            turmaId!,
            turma.codigo_turma,
            'baixou',
            null,
            { id: turma.cliente_id, nome: turma.cliente_nome },
            { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
            `Download em lote de ${baixados} certificado(s) em ZIP`
          );
        }
      }

      setDownloadCertSelecionados([]);
    } catch (error) {
      console.error('Erro ao baixar certificados:', error);
      toast.error('Erro ao baixar certificados');
    } finally {
      setDownloadingCerts(false);
    }
  };

  // Função para baixar todos os documentos validados em ZIP (background)
  const handleBaixarDocumentosValidados = async () => {
    if (!turmaId || !turma) return;
    if (downloadDocsProgress !== null) {
      toast.info('Download já em andamento...');
      return;
    }

    // Coletar todos os itens para download
    const certsComURL = colaboradoresTurma.filter(c =>
      certificadosValidados.includes(c.colaborador_id) &&
      certificadosData[c.colaborador_id]?.url
    );
    const temRelatorio = anexosRelatorio.length > 0 && anexosRelatorio[0]?.url;
    const temRelatorioPresencas = anexosRelatorioPresencas.length > 0 && anexosRelatorioPresencas[0]?.url;
    const temRelatorioSinistros = anexosRelatorioSinistros.length > 0 && anexosRelatorioSinistros[0]?.url;
    const temListaPresenca = anexosListaPresenca.length > 0;
    const temFotos = anexosGaleria.length > 0;

    const totalItens = certsComURL.length + (temRelatorio ? 1 : 0) + (temRelatorioPresencas ? 1 : 0) + (temRelatorioSinistros ? 1 : 0) + anexosListaPresenca.length + anexosGaleria.length;

    if (totalItens === 0) {
      toast.info('Nenhum documento disponível para baixar');
      return;
    }

    downloadDocsAbortRef.current = false;
    setDownloadDocsProgress(0);
    
    const partes: string[] = [];
    if (certsComURL.length > 0) partes.push(`${certsComURL.length} certificado(s)`);
    if (temRelatorio) partes.push('relatório');
    if (temRelatorioPresencas) partes.push('relatório de presenças');
    if (temRelatorioSinistros) partes.push('relatório de sinistros');
    if (temListaPresenca) partes.push(`${anexosListaPresenca.length} lista(s) de presença`);
    if (temFotos) partes.push(`${anexosGaleria.length} foto(s)`);
    toast.info(`Processando em segundo plano: ${partes.join(', ')}...`);

    try {
      const zip = new JSZip();
      let processados = 0;

      const fetchAndAdd = async (url: string, path: string) => {
        try {
          const response = await fetch(url);
          if (!response.ok) return;
          const blob = await response.blob();
          zip.file(path, blob);
        } catch {
          // Continuar com os próximos
        }
      };

      // 1. Certificados validados
      for (const colab of certsComURL) {
        if (downloadDocsAbortRef.current) break;
        const url = certificadosData[colab.colaborador_id]?.url;
        if (!url) continue;

        const nomeNormalizado = colab.nome
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .toUpperCase();
        await fetchAndAdd(url, `Certificados/Certificado_${nomeNormalizado}_NR${turma.treinamento_norma}.pdf`);
        processados++;
        setDownloadDocsProgress(Math.round((processados / totalItens) * 95));
      }

      // 1b. QR Code de validação digital (dentro da pasta Certificados)
      if (certsComURL.length > 0 && !downloadDocsAbortRef.current) {
        try {
          const db = supabase as any;
          const { data: tokenData } = await db
            .from('validacao_digital_certificados')
            .select('token')
            .eq('turma_id', turmaId)
            .eq('ativo', true)
            .maybeSingle();

          if (tokenData?.token) {
            const baseUrl = window.location.origin;
            const validacaoUrl = `${baseUrl}/validacao-certificado/${tokenData.token}`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(validacaoUrl)}`;
            await fetchAndAdd(qrImageUrl, `Certificados/QR_Code_Validacao_Digital.png`);
          }
        } catch {
          // Não bloquear o download se falhar
        }
      }

      // 2. Relatório validado
      if (temRelatorio && !downloadDocsAbortRef.current) {
        await fetchAndAdd(anexosRelatorio[0].url, `Relatorio/Relatorio_${turma.codigo_turma || 'turma'}_NR${turma.treinamento_norma || ''}.pdf`);
        processados++;
        setDownloadDocsProgress(Math.round((processados / totalItens) * 95));
      }

      // 3. Relatório de presenças validado
      if (temRelatorioPresencas && !downloadDocsAbortRef.current) {
        await fetchAndAdd(anexosRelatorioPresencas[0].url, `Relatorio/Relatorio_Presencas_${turma.codigo_turma || 'turma'}_NR${turma.treinamento_norma || ''}.pdf`);
        processados++;
        setDownloadDocsProgress(Math.round((processados / totalItens) * 95));
      }

      // 4. Relatório de sinistros validado
      if (temRelatorioSinistros && !downloadDocsAbortRef.current) {
        await fetchAndAdd(anexosRelatorioSinistros[0].url, `Relatorio/Relatorio_Sinistros_${turma.codigo_turma || 'turma'}_NR${turma.treinamento_norma || ''}.pdf`);
        processados++;
        setDownloadDocsProgress(Math.round((processados / totalItens) * 95));
      }

      // 5. Lista de presença
      if (temListaPresenca && !downloadDocsAbortRef.current) {
        for (const anexo of anexosListaPresenca) {
          if (downloadDocsAbortRef.current) break;
          const ext = anexo.url.split('.').pop()?.split('?')[0] || 'png';
          await fetchAndAdd(anexo.url, `Lista_Presenca/${anexo.nome || `lista_presenca_${processados}`}.${ext}`);
          processados++;
          setDownloadDocsProgress(Math.round((processados / totalItens) * 95));
        }
      }

      // 4. Fotos da turma
      if (temFotos && !downloadDocsAbortRef.current) {
        for (let i = 0; i < anexosGaleria.length; i++) {
          if (downloadDocsAbortRef.current) break;
          const anexo = anexosGaleria[i];
          const ext = anexo.url.split('.').pop()?.split('?')[0] || 'jpg';
          await fetchAndAdd(anexo.url, `Fotos/${anexo.nome || `foto_${i + 1}`}.${ext}`);
          processados++;
          setDownloadDocsProgress(Math.round((processados / totalItens) * 95));
        }
      }

      if (downloadDocsAbortRef.current) {
        toast.info('Download cancelado');
        setDownloadDocsProgress(null);
        return;
      }

      // Gerar ZIP
      setDownloadDocsProgress(99);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Documentos_${turma.codigo_turma || 'turma'}_${turma.treinamento_norma ? 'NR' + turma.treinamento_norma : ''}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadDocsProgress(100);
      toast.success(`${processados} documento(s) baixado(s) com sucesso!`);
      
      // Registrar auditoria de download de documentos validados
      if (turma) {
        auditoria.registrarAuditoria({
          turmaId: turmaId!,
          turmaCodigo: turma.codigo_turma,
          acao: 'baixou',
          entidade: 'relatorio',
          descricao: `Download completo de documentos validados: ${partes.join(', ')}`,
          clienteId: turma.cliente_id,
          clienteNome: turma.cliente_nome,
          treinamentoId: turma.treinamento_id,
          treinamentoNome: turma.treinamento_nome,
          treinamentoNorma: turma.treinamento_norma,
          valorNovo: `${processados} documentos em ZIP`
        });
      }

      setTimeout(() => setDownloadDocsProgress(null), 2000);
    } catch (error) {
      console.error('Erro ao baixar documentos:', error);
      toast.error('Erro ao gerar arquivo ZIP');
      setDownloadDocsProgress(null);
    }
  };

  // Função para abrir o visualizador de certificados com todos os colaboradores
  const handleAbrirTodosCertificados = () => {
    if (!turmaId || !turma) return;

    // Aprovados SEM sinistro - colaboradores com sinistro não recebem certificado
    const aprovados = colaboradoresTurma.filter(c => 
      c.nota_pos_teste !== null && 
      c.nota_pos_teste >= 7 && 
      !sinistrosColaboradores[c.id]
    );
    
    if (aprovados.length === 0) {
      toast.info('Nenhum colaborador aprovado (sem sinistro) para gerar certificado');
      return;
    }

    // Criar lista de IDs dos colaboradores aprovados
    const colaboradoresIds = aprovados.map(c => c.colaborador_id).join(',');
    
    // Abrir uma única aba com todos os colaboradores
    const params = new URLSearchParams({
      turmaId: turma?.id || '',
      colaboradores: colaboradoresIds
    });
    window.open(`/certificado/visualizar?${params.toString()}`, '_blank');

    setValidacaoDialogOpen(false);
    toast.info(`Abrindo visualizador com ${aprovados.length} certificado(s). Use "Validar Todos" para validar automaticamente.`);
  };

  const fetchTreinamentoDetalhes = async () => {
    if (!turma?.treinamento_id) return;
    setLoadingDetalhes(true);
    try {
      const { data, error } = await supabase
        .from('catalogo_treinamentos')
        .select('id, norma, nome, ch_formacao, ch_reciclagem, validade, ch_formacao_obrigatoria, ch_reciclagem_obrigatoria, conteudo_programatico, observacoes')
        .eq('id', turma.treinamento_id)
        .single();
      if (error) throw error;
      setTreinamentoDetalhes(data as TreinamentoDetalhes);
    } catch (error) {
      console.error('Erro ao buscar detalhes do treinamento:', error);
      toast.error('Erro ao carregar detalhes do treinamento');
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const fetchInstrutorDetalhes = async () => {
    if (!turma?.instrutor_id) return;
    setLoadingDetalhes(true);
    try {
      // Buscar dados do instrutor
      const { data: instrutorData, error: instrutorError } = await (supabase as any)
        .from('instrutores')
        .select('id, nome, cpf_cnpj, email, telefone, formacao_academica')
        .eq('id', turma.instrutor_id)
        .single();
      if (instrutorError) throw instrutorError;

      // Buscar formações do instrutor
      const { data: formacoesData } = await (supabase as any)
        .from('instrutor_formacoes')
        .select('id, nome, registro_tipo, registro_numero, registro_estado, anexo_url')
        .eq('instrutor_id', turma.instrutor_id);

      // Buscar anexo do treinamento específico (tabela correta: instrutor_formacao_treinamento)
      const { data: treinamentoDocs } = await (supabase as any)
        .from('instrutor_formacao_treinamento')
        .select('anexo_url')
        .eq('instrutor_id', turma.instrutor_id)
        .eq('treinamento_id', turma.treinamento_id)
        .not('anexo_url', 'is', null)
        .limit(1);
      const treinamentoDoc = treinamentoDocs?.[0] || null;

      // Buscar formação-certificado vinculada ao treinamento
      const { data: formacaoCertificados } = await (supabase as any)
        .from('instrutor_formacoes_certificado')
        .select('id, formacao_nome, registro_tipo, registro_numero, registro_estado')
        .eq('instrutor_id', turma.instrutor_id);

      setInstrutorDetalhes({
        ...instrutorData,
        formacoes: formacoesData || [],
        treinamento_documento_url: treinamentoDoc?.anexo_url || null,
        formacao_certificados: formacaoCertificados || [],
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do instrutor:', error);
      toast.error('Erro ao carregar detalhes do instrutor');
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const fetchColaboradoresTurma = async () => {
    if (!turmaId) return;
    
    setLoadingColaboradores(true);
    try {
      const { data, error } = await (supabase as any)
        .from('turma_colaboradores')
        .select(`
          id,
          colaborador_id,
          presente,
          nota_pre_teste,
          nota_pos_teste,
          resultado,
          reorientado,
          avaliacao_reacao_respondida,
          assinatura_certificado,
          colaborador:colaboradores!turma_colaboradores_colaborador_id_fkey(
            nome,
            cpf,
            matricula,
            foto_url
          )
        `)
        .eq('turma_id', turmaId);

      if (error) throw error;

      // Buscar acertos das provas realizadas
      const { data: provasData } = await (supabase as any)
        .from('turma_provas')
        .select('colaborador_id, tipo_prova, acertos')
        .eq('turma_id', turmaId);

      // Mapear acertos por colaborador
      const acertosPorColaborador: Record<string, { pre: number | null; pos: number | null }> = {};
      (provasData || []).forEach((p: any) => {
        if (!acertosPorColaborador[p.colaborador_id]) {
          acertosPorColaborador[p.colaborador_id] = { pre: null, pos: null };
        }
        if (p.tipo_prova === 'pre_teste') {
          acertosPorColaborador[p.colaborador_id].pre = p.acertos;
        } else if (p.tipo_prova === 'pos_teste') {
          acertosPorColaborador[p.colaborador_id].pos = p.acertos;
        }
      });

      // Buscar presenças por colaborador (incluindo assinaturas e dados de validação facial)
      const { data: presencasData } = await (supabase as any)
        .from('turma_colaborador_presencas')
        .select('colaborador_turma_id, data_aula, presente, assinatura, foto_validacao, hora_validacao, similaridade_facial, dispositivo_captura, latitude_captura, longitude_captura, local_captura')
        .in('colaborador_turma_id', (data || []).map((c: any) => c.id));

      // Mapear presenças, assinaturas e validações faciais por colaborador_turma_id
      const presencasPorColaborador: Record<string, Record<string, boolean>> = {};
      const assinaturasPorColaborador: Record<string, Record<string, string | null>> = {};
      const fotoValidacoesPorColaborador: Record<string, Record<string, {
        foto_validacao: string | null;
        hora_validacao: string | null;
        similaridade_facial: number | null;
        dispositivo_captura: string | null;
        latitude_captura: number | null;
        longitude_captura: number | null;
        local_captura: string | null;
      } | null>> = {};
      
      (presencasData || []).forEach((p: any) => {
        if (!presencasPorColaborador[p.colaborador_turma_id]) {
          presencasPorColaborador[p.colaborador_turma_id] = {};
          assinaturasPorColaborador[p.colaborador_turma_id] = {};
          fotoValidacoesPorColaborador[p.colaborador_turma_id] = {};
        }
        presencasPorColaborador[p.colaborador_turma_id][p.data_aula] = p.presente;
        assinaturasPorColaborador[p.colaborador_turma_id][p.data_aula] = p.assinatura || null;
        fotoValidacoesPorColaborador[p.colaborador_turma_id][p.data_aula] = p.foto_validacao ? {
          foto_validacao: p.foto_validacao,
          hora_validacao: p.hora_validacao,
          similaridade_facial: p.similaridade_facial,
          dispositivo_captura: p.dispositivo_captura,
          latitude_captura: p.latitude_captura,
          longitude_captura: p.longitude_captura,
          local_captura: p.local_captura
        } : null;
      });

      const colaboradoresFormatados: ColaboradorTurma[] = (data || []).map((c: any) => ({
        id: c.id,
        colaborador_id: c.colaborador_id,
        nome: c.colaborador?.nome || '',
        cpf: c.colaborador?.cpf || '',
        matricula: c.colaborador?.matricula || null,
        foto_url: c.colaborador?.foto_url || null,
        data_treinamento: turma?.data_inicio || '',
        nota_pre_teste: c.nota_pre_teste,
        nota_pos_teste: c.nota_pos_teste,
        acertos_pre_teste: acertosPorColaborador[c.colaborador_id]?.pre ?? null,
        acertos_pos_teste: acertosPorColaborador[c.colaborador_id]?.pos ?? null,
        resultado: c.resultado,
        reorientado: c.reorientado || false,
        presente: c.presente || false,
        presencas: presencasPorColaborador[c.id] || {},
        assinaturas: assinaturasPorColaborador[c.id] || {},
        fotoValidacoes: fotoValidacoesPorColaborador[c.id] || {},
        avaliacao_reacao_respondida: c.avaliacao_reacao_respondida || false,
        assinatura_certificado: c.assinatura_certificado || null
      }));

      setColaboradoresTurma(colaboradoresFormatados);
    } catch (error: any) {
      console.error('Erro ao buscar colaboradores da turma:', error);
    } finally {
      setLoadingColaboradores(false);
    }
  };

  const fetchColaboradoresEmpresa = async () => {
    if (!turma?.cliente_id || !turma?.treinamento_id) return;
    
    try {
      // Primeiro, buscar o cliente_empresa_id da tabela clientes_sst
      const { data: clienteData, error: clienteError } = await (supabase as any)
        .from('clientes_sst')
        .select('cliente_empresa_id')
        .eq('id', turma.cliente_id)
        .single();

      if (clienteError) throw clienteError;
      
      const clienteEmpresaId = clienteData?.cliente_empresa_id;
      if (!clienteEmpresaId) {
        console.log('Cliente não possui empresa vinculada');
        setColaboradoresEmpresa([]);
        return;
      }

      // Buscar todos os colaboradores da empresa cliente com seus treinamentos vinculados
      const { data, error } = await (supabase as any)
        .from('colaboradores')
        .select(`
          id, 
          nome, 
          cpf, 
          matricula,
          foto_url,
          colaboradores_treinamentos!left(
            treinamento_id
          )
        `)
        .eq('empresa_id', clienteEmpresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      // Identificar colaboradores que já estão na turma
      const idsNaTurma = colaboradoresTurma.map(c => c.colaborador_id);
      
      // Mapear colaboradores com informação se precisam do treinamento
      const colaboradoresFormatados: ColaboradorEmpresa[] = (data || []).map((c: any) => {
        const treinamentosDoColaborador = c.colaboradores_treinamentos || [];
        const precisaTreinamento = treinamentosDoColaborador.some(
          (t: any) => t.treinamento_id === turma.treinamento_id
        );
        
        return {
          id: c.id,
          nome: c.nome,
          cpf: c.cpf || '',
          matricula: c.matricula,
          foto_url: c.foto_url || null,
          precisaTreinamento,
          jaNaTurma: idsNaTurma.includes(c.id)
        };
      });

      // Ordenar: primeiro os que precisam do treinamento, depois os demais
      colaboradoresFormatados.sort((a, b) => {
        if (a.precisaTreinamento && !b.precisaTreinamento) return -1;
        if (!a.precisaTreinamento && b.precisaTreinamento) return 1;
        return a.nome.localeCompare(b.nome);
      });

      setColaboradoresEmpresa(colaboradoresFormatados);
    } catch (error: any) {
      console.error('Erro ao buscar colaboradores da empresa:', error);
    }
  };

  const handleUploadFotoColaborador = async (colaboradorId: string, file: File) => {
    if (!file) return;
    setUploadingFotoColaboradorId(colaboradorId);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `colaboradores/${colaboradorId}/foto_perfil.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('colaborador-fotos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('colaborador-fotos')
        .getPublicUrl(filePath);

      const fotoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await (supabase as any)
        .from('colaboradores')
        .update({ foto_url: fotoUrl })
        .eq('id', colaboradorId);

      if (updateError) throw updateError;

      setColaboradoresEmpresa(prev => prev.map(c => 
        c.id === colaboradorId ? { ...c, foto_url: fotoUrl } : c
      ));
      // Atualizar também a lista de colaboradores da turma (para validação facial)
      setColaboradoresTurma(prev => prev.map(c => 
        c.colaborador_id === colaboradorId ? { ...c, foto_url: fotoUrl } : c
      ));
      toast.success('Foto atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao enviar foto. Tente novamente.');
    } finally {
      setUploadingFotoColaboradorId(null);
    }
  };

  // Funções para câmera de foto do colaborador
  const abrirCameraFotoColaborador = async (colaboradorId: string) => {
    setCameraFotoColaboradorId(colaboradorId);
    setCameraFotoDialogOpen(true);
    setCameraFotoReady(false);
    setFotoOpcaoDialogOpen(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      cameraFotoStreamRef.current = stream;
      
      // Aguardar o dialog renderizar o video element
      setTimeout(() => {
        if (cameraFotoVideoRef.current) {
          cameraFotoVideoRef.current.srcObject = stream;
          cameraFotoVideoRef.current.play();
          setCameraFotoReady(true);
        }
      }, 300);
    } catch (error: any) {
      console.error('Erro ao acessar câmera:', error);
      toast.error('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      setCameraFotoDialogOpen(false);
      setCameraFotoColaboradorId(null);
    }
  };

  const fecharCameraFotoColaborador = () => {
    if (cameraFotoStreamRef.current) {
      cameraFotoStreamRef.current.getTracks().forEach(track => track.stop());
      cameraFotoStreamRef.current = null;
    }
    setCameraFotoDialogOpen(false);
    setCameraFotoColaboradorId(null);
    setCameraFotoReady(false);
  };

  const capturarFotoColaborador = async () => {
    if (!cameraFotoVideoRef.current || !cameraFotoCanvasRef.current || !cameraFotoColaboradorId) return;
    
    const video = cameraFotoVideoRef.current;
    const canvas = cameraFotoCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob || !cameraFotoColaboradorId) return;
      const file = new File([blob], `foto_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      fecharCameraFotoColaborador();
      await handleUploadFotoColaborador(cameraFotoColaboradorId, file);
    }, 'image/jpeg', 0.85);
  };

  const abrirOpcoesFotoColaborador = (colaboradorId: string) => {
    setFotoOpcaoColaboradorId(colaboradorId);
    setFotoOpcaoDialogOpen(true);
  };

  const generateQRCode = () => {
    // Gera URL para cadastro via QR Code
    const baseUrl = window.location.origin;
    const qrUrl = `${baseUrl}/cadastro-turma/${turmaId}`;
    setQrCodeUrl(qrUrl);
  };

  const generateQRCodePresenca = () => {
    // Gera URL para marcar presença via QR Code
    const baseUrl = window.location.origin;
    const qrUrl = `${baseUrl}/presenca-turma/${turmaId}`;
    setQrCodePresencaUrl(qrUrl);
  };

  // Função para gerar/buscar token de validação digital
  const handleOpenValidacaoDigital = async () => {
    setValidacaoDigitalDialogOpen(true);
    setValidacaoDigitalLoading(true);
    try {
      const db = supabase as any;
      // Verificar se já existe um token ativo para esta turma
      const { data: existing } = await db
        .from('validacao_digital_certificados')
        .select('token')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .maybeSingle();

      if (existing?.token) {
        const baseUrl = window.location.origin;
        setValidacaoDigitalUrl(`${baseUrl}/validacao-certificado/${existing.token}`);
      } else {
        // Criar novo token
        const { data: newToken, error } = await db
          .from('validacao_digital_certificados')
          .insert({
            turma_id: turmaId,
            empresa_id: empresaId
          })
          .select('token')
          .single();

        if (error) throw error;
        const baseUrl = window.location.origin;
        setValidacaoDigitalUrl(`${baseUrl}/validacao-certificado/${newToken.token}`);
      }
    } catch (error: any) {
      console.error('Erro ao gerar validação digital:', error);
      toast.error('Erro ao gerar link de validação digital');
    } finally {
      setValidacaoDigitalLoading(false);
    }
  };

  // Função para abrir dialog de reorientação via instrutor
  const handleOpenReorientacaoInstrutor = async (colaborador: ColaboradorTurma) => {
    setSelectedColaboradorReorientacaoInstrutor(colaborador);
    setQuestoesErradasSelecionadas([]);
    setShowReorientacaoSignature(false);
    setAssinaturaReorientacao(null);
    setReorientacaoInstrutorDialogOpen(true);
    
    if (!turma?.treinamento_id || !turmaId) return;
    
    setLoadingQuestoes(true);
    try {
      // Buscar a prova pós-teste do colaborador para obter as respostas
      const { data: provaColaborador, error: provaColaboradorError } = await (supabase as any)
        .from('turma_provas')
        .select('id, respostas, acertos, total_questoes')
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaborador.colaborador_id)
        .eq('tipo_prova', 'pos_teste')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Buscar a prova pós-teste do treinamento (template)
      const { data: provaData, error: provaError } = await supabase
        .from('provas_treinamento')
        .select('id')
        .eq('treinamento_id', turma.treinamento_id)
        .eq('tipo', 'pos_teste')
        .eq('ativo', true)
        .single();

      if (provaError || !provaData) {
        toast.error('Nenhuma prova pós-teste encontrada para este treinamento');
        setLoadingQuestoes(false);
        return;
      }

      // Buscar questões da prova com alternativas
      const { data: questoesData, error: questoesError } = await supabase
        .from('provas_questoes')
        .select(`
          id,
          numero,
          pergunta,
          alternativas:provas_alternativas(id, letra, texto, correta)
        `)
        .eq('prova_id', provaData.id)
        .order('numero');

      if (questoesError) throw questoesError;

      if (questoesData) {
        const questoesFormatadas = questoesData.map((q: any) => ({
          id: q.id,
          numero: q.numero,
          pergunta: q.pergunta,
          alternativas: (q.alternativas || []).sort((a: any, b: any) => a.letra.localeCompare(b.letra))
        }));
        
        setQuestoesProva(questoesFormatadas);

        // Se o colaborador já fez a prova, buscar as questões incorretas automaticamente
        if (provaColaborador && provaColaborador.respostas) {
          const respostas = provaColaborador.respostas;
          const questoesIncorretas: Array<{ questaoId: string; alternativaId: string }> = [];

          // Percorrer as respostas e identificar as incorretas
          questoesFormatadas.forEach((questao: any) => {
            const resposta = respostas[questao.id];
            if (resposta && !resposta.acertou) {
              // Encontrar a alternativa que o colaborador marcou (incorreta)
              const alternativaMarcada = questao.alternativas.find(
                (a: any) => a.letra === resposta.resposta
              );
              if (alternativaMarcada) {
                questoesIncorretas.push({
                  questaoId: questao.id,
                  alternativaId: alternativaMarcada.id
                });
              }
            }
          });

          // Se encontrou questões incorretas, preencher automaticamente
          if (questoesIncorretas.length > 0) {
            setQuestoesErradasSelecionadas(questoesIncorretas);
          } else {
            // Se não encontrou nas respostas, criar slots vazios baseado na nota
            const maxErros = 10 - Math.floor(colaborador.nota_pos_teste || 0);
            const slots = Array(maxErros).fill(null).map(() => ({ questaoId: '', alternativaId: '' }));
            setQuestoesErradasSelecionadas(slots.length > 0 ? slots : [{ questaoId: '', alternativaId: '' }]);
          }
        } else {
          // Se não tem prova, criar slots vazios baseado na nota
          const maxErros = 10 - Math.floor(colaborador.nota_pos_teste || 0);
          const slots = Array(maxErros).fill(null).map(() => ({ questaoId: '', alternativaId: '' }));
          setQuestoesErradasSelecionadas(slots.length > 0 ? slots : [{ questaoId: '', alternativaId: '' }]);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar questões:', error);
      toast.error('Erro ao carregar questões da prova');
    } finally {
      setLoadingQuestoes(false);
    }
  };

  // Função para formatar CPF
  const formatCpfMask = (cpf: string) => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };

  // Função para renderizar observações com links clicáveis
  const renderObservacoesComLinks = (texto: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = texto.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {part.length > 60 ? part.substring(0, 60) + '...' : part}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Abrir dialog de edição de colaborador
  const handleOpenEditColaborador = (colaborador: ColaboradorTurma) => {
    setEditColaboradorData({
      id: colaborador.id,
      colaborador_id: colaborador.colaborador_id,
      nome: colaborador.nome,
      cpf: colaborador.cpf,
      foto_url: colaborador.foto_url || null
    });
    setEditColaboradorNome(colaborador.nome);
    // Formatar CPF ao abrir o dialog
    setEditColaboradorCpf(formatCpfMask(colaborador.cpf));
    setEditColaboradorDialogOpen(true);
  };

  // Salvar edição de colaborador
  const handleSaveEditColaborador = async () => {
    if (!editColaboradorData) return;
    
    // Validar campos
    if (!editColaboradorNome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!editColaboradorCpf.trim()) {
      toast.error('CPF é obrigatório');
      return;
    }

    // Limpar CPF (remover formatação)
    const cpfLimpo = editColaboradorCpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      toast.error('CPF deve ter 11 dígitos');
      return;
    }

    setSavingEditColaborador(true);
    try {
      // Atualizar na tabela colaboradores
      const { error } = await supabase
        .from('colaboradores')
        .update({
          nome: editColaboradorNome.trim(),
          cpf: cpfLimpo
        })
        .eq('id', editColaboradorData.colaborador_id);

      if (error) throw error;

      toast.success('Colaborador atualizado com sucesso!');
      
      // Registrar auditoria de edição
      if (turma && turmaId) {
        auditoria.auditarColaborador(
          turmaId,
          turma.codigo_turma,
          'atualizou',
          { id: editColaboradorData.colaborador_id, nome: editColaboradorNome.trim(), cpf: cpfLimpo },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'empresa',
          'Dados do colaborador editados',
          turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
          'usuario'
        );
      }
      
      setEditColaboradorDialogOpen(false);
      setEditColaboradorData(null);
      fetchColaboradoresTurma();
    } catch (error: any) {
      console.error('Erro ao atualizar colaborador:', error);
      toast.error('Erro ao atualizar colaborador');
    } finally {
      setSavingEditColaborador(false);
    }
  };

  // Adicionar questão errada
  const handleAddQuestaoErrada = () => {
    setQuestoesErradasSelecionadas(prev => [...prev, { questaoId: '', alternativaId: '' }]);
  };

  // Remover questão errada
  const handleRemoveQuestaoErrada = (index: number) => {
    setQuestoesErradasSelecionadas(prev => prev.filter((_, i) => i !== index));
  };

  // Atualizar questão errada selecionada
  const handleUpdateQuestaoErradaSelecionada = (index: number, field: 'questaoId' | 'alternativaId', value: string) => {
    setQuestoesErradasSelecionadas(prev => prev.map((q, i) => {
      if (i === index) {
        // Se mudou a questão, limpar a alternativa
        if (field === 'questaoId') {
          return { questaoId: value, alternativaId: '' };
        }
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  // Obter alternativas incorretas de uma questão
  const getAlternativasIncorretas = (questaoId: string) => {
    const questao = questoesProva.find(q => q.id === questaoId);
    if (!questao) return [];
    return questao.alternativas.filter(a => !a.correta);
  };

  // Calcular quantidade máxima de questões erradas baseado na nota
  const getMaxQuestoesErradas = (): number => {
    if (!selectedColaboradorReorientacaoInstrutor?.nota_pos_teste) return 0;
    // Nota é de 0 a 10, cada questão vale 1 ponto (10 questões)
    // Se nota = 7, errou 3 questões
    return 10 - Math.floor(selectedColaboradorReorientacaoInstrutor.nota_pos_teste);
  };

  // Verificar se questão já foi selecionada
  const isQuestaoJaSelecionada = (questaoId: string, currentIndex: number): boolean => {
    return questoesErradasSelecionadas.some((q, i) => i !== currentIndex && q.questaoId === questaoId);
  };

  // Salvar reorientação via instrutor
  const handleSaveReorientacaoInstrutor = async (signatureData: string) => {
    if (!selectedColaboradorReorientacaoInstrutor || !turmaId) return;

    setSavingReorientacao(true);
    try {
      // Buscar a prova pós-teste existente do colaborador
      const { data: provaExistente, error: provaError } = await (supabase as any)
        .from('turma_provas')
        .select('id, acertos, total_questoes, nota')
        .eq('turma_id', turmaId)
        .eq('colaborador_id', selectedColaboradorReorientacaoInstrutor.colaborador_id)
        .eq('tipo_prova', 'pos_teste')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (provaError || !provaExistente) {
        toast.error('Prova pós-teste não encontrada para este colaborador');
        setSavingReorientacao(false);
        return;
      }

      // Filtrar questões válidas (erradas)
      const questoesErradas = questoesErradasSelecionadas.filter(q => q.questaoId && q.alternativaId);
      
      // Usar dados da prova existente
      const totalQuestoes = provaExistente.total_questoes || 10;
      const acertos = provaExistente.acertos || (totalQuestoes - questoesErradas.length);
      const nota = provaExistente.nota || acertos;

      // Montar questões incorretas formatadas para reorientação
      const questoesIncorretasFormatadas = questoesErradas.map(q => {
        const questao = questoesProva.find(qp => qp.id === q.questaoId);
        const alternativa = questao?.alternativas.find(a => a.id === q.alternativaId);
        const alternativaCorreta = questao?.alternativas.find(a => a.correta);
        return {
          questao_id: q.questaoId,
          numero: questao?.numero || 0,
          pergunta: questao?.pergunta || '',
          alternativa_selecionada: alternativa?.letra || '',
          alternativa_selecionada_texto: alternativa?.texto || '',
          alternativa_correta: alternativaCorreta?.letra || '',
          alternativa_correta_texto: alternativaCorreta?.texto || ''
        };
      });

      // Inserir reorientação no banco usando o ID da prova pós-teste existente
      const { error: reorientacaoError } = await (supabase as any)
        .from('reorientacoes_colaborador')
        .insert({
          turma_id: turmaId,
          colaborador_id: selectedColaboradorReorientacaoInstrutor.colaborador_id,
          turma_prova_id: provaExistente.id,
          colaborador_nome: selectedColaboradorReorientacaoInstrutor.nome,
          colaborador_cpf: selectedColaboradorReorientacaoInstrutor.cpf || '',
          empresa_nome: turma?.cliente_nome || '',
          treinamento_nome: `${turma?.treinamento_norma || ''} - ${turma?.treinamento_nome || ''}`,
          data_treinamento: turma?.data_inicio || new Date().toISOString().split('T')[0],
          nota: nota,
          total_questoes: totalQuestoes,
          acertos: acertos,
          questoes_incorretas: questoesIncorretasFormatadas,
          assinatura_digital: signatureData,
          assinado_em: new Date().toISOString()
        });

      if (reorientacaoError) throw reorientacaoError;

      // Atualizar colaborador com status reorientado e aprovado
      const { error: updateError } = await (supabase as any)
        .from('turma_colaboradores')
        .update({ 
          reorientado: true,
          resultado: 'aprovado'
        })
        .eq('id', selectedColaboradorReorientacaoInstrutor.id);

      if (updateError) throw updateError;

      // Atualizar estado local
      setColaboradoresTurma(prev => prev.map(c => 
        c.id === selectedColaboradorReorientacaoInstrutor.id 
          ? { ...c, reorientado: true, resultado: 'aprovado' } 
          : c
      ));

      // Salvar assinatura para exibir
      setAssinaturaReorientacao(signatureData);
      toast.success('Reorientação salva com sucesso!');
      
      // Registrar auditoria de reorientação
      if (turma && turmaId) {
        auditoria.auditarReorientacao(
          turmaId,
          turma.codigo_turma,
          'criou',
          { id: selectedColaboradorReorientacaoInstrutor.colaborador_id, nome: selectedColaboradorReorientacaoInstrutor.nome, cpf: selectedColaboradorReorientacaoInstrutor.cpf },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'Reorientação registrada pelo instrutor com assinatura'
        );
      }
    } catch (error: any) {
      console.error('Erro ao salvar reorientação:', error);
      toast.error('Erro ao salvar reorientação');
    } finally {
      setSavingReorientacao(false);
    }
  };

  // Fechar dialog de reorientação
  const handleCloseReorientacaoDialog = () => {
    setReorientacaoInstrutorDialogOpen(false);
    setSelectedColaboradorReorientacaoInstrutor(null);
    setQuestoesErradasSelecionadas([]);
    setQuestoesProva([]);
    setShowReorientacaoSignature(false);
    setAssinaturaReorientacao(null);
  };

  // Buscar gabarito da prova
  const handleOpenGabarito = async () => {
    if (!turma?.treinamento_id) {
      toast.error('Treinamento não encontrado');
      return;
    }

    setGabaritoDialogOpen(true);
    setLoadingGabarito(true);

    try {
      // Buscar a prova pós-teste do treinamento
      const { data: provaData, error: provaError } = await supabase
        .from('provas_treinamento')
        .select('id')
        .eq('treinamento_id', turma.treinamento_id)
        .eq('tipo', 'pos_teste')
        .eq('ativo', true)
        .single();

      if (provaError || !provaData) {
        toast.error('Nenhuma prova pós-teste encontrada');
        setLoadingGabarito(false);
        return;
      }

      // Buscar questões da prova com alternativas
      const { data: questoesData, error: questoesError } = await supabase
        .from('provas_questoes')
        .select(`
          id,
          numero,
          pergunta,
          alternativas:provas_alternativas(id, letra, texto, correta)
        `)
        .eq('prova_id', provaData.id)
        .order('numero');

      if (questoesError) throw questoesError;

      if (questoesData) {
        setGabaritoQuestoes(questoesData.map((q: any) => ({
          numero: q.numero,
          pergunta: q.pergunta,
          alternativas: (q.alternativas || []).sort((a: any, b: any) => a.letra.localeCompare(b.letra))
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar gabarito:', error);
      toast.error('Erro ao carregar gabarito');
    } finally {
      setLoadingGabarito(false);
    }
  };

  const handleCopyLink = async (link: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(linkId);
      toast.success('Link copiado!');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  // Abrir dialog de registrar prova
  const handleOpenRegistrarProva = async () => {
    setRegistrarProvaDialogOpen(true);
    setRegistrarProvaMode(null);
    setRegistrarProvaColaboradorId('');
    setRegistrarProvaRespostas({});
    setRegistrarProvaIncorretas([]);
    setFluxoPosTesteCompleto(false);
    setLoadingRegistrarProva(true);

    // Buscar colaboradores que ainda não fizeram a prova do tipo padrão (pos_teste)
    await fetchColaboradoresSemProva(registrarProvaTipo);

    try {
      // Buscar questões da prova
      if (turma?.treinamento_id) {
        const { data: provaData } = await supabase
          .from('provas_treinamento')
          .select('id')
          .eq('treinamento_id', turma.treinamento_id)
          .eq('tipo', 'pos_teste')
          .eq('ativo', true)
          .single();

        if (provaData) {
          const { data: questoesData } = await supabase
            .from('provas_questoes')
            .select(`
              id,
              numero,
              pergunta,
              alternativas:provas_alternativas(id, letra, texto, correta)
            `)
            .eq('prova_id', provaData.id)
            .order('numero');

          if (questoesData) {
            setRegistrarProvaQuestoes(questoesData.map((q: any) => ({
              id: q.id,
              numero: q.numero,
              pergunta: q.pergunta,
              alternativas: (q.alternativas || []).sort((a: any, b: any) => a.letra.localeCompare(b.letra))
            })));
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar questões:', error);
    } finally {
      setLoadingRegistrarProva(false);
    }
  };

  // Buscar colaboradores que ainda não fizeram a prova do tipo selecionado
  const fetchColaboradoresSemProva = async (tipoProva: 'pre_teste' | 'pos_teste') => {
    if (!turmaId) return;

    try {
      // Buscar todos colaboradores da turma
      const { data: todosColaboradores } = await (supabase as any)
        .from('turma_colaboradores')
        .select('id, colaborador_id, colaboradores(nome)')
        .eq('turma_id', turmaId);

      // Buscar colaboradores que já fizeram a prova deste tipo com suas notas
      const { data: provasFeitas } = await supabase
        .from('turma_provas')
        .select('colaborador_id, acertos, nota')
        .eq('turma_id', turmaId)
        .eq('tipo_prova', tipoProva);

      // Para pré-teste: bloquear quem já fez
      // Para pós-teste: bloquear apenas quem já fez E tem nota >= 7
      const colaboradoresBloqueados = new Set<string>();
      
      (provasFeitas || []).forEach((p: any) => {
        if (tipoProva === 'pre_teste') {
          // Pré-teste: só pode fazer uma vez
          colaboradoresBloqueados.add(p.colaborador_id);
        } else {
          // Pós-teste: pode refazer se nota < 7
          const acertos = p.acertos ?? Math.floor(p.nota);
          if (acertos >= 7) {
            colaboradoresBloqueados.add(p.colaborador_id);
          }
        }
      });

      // Filtrar colaboradores disponíveis
      const semProva = (todosColaboradores || [])
        .filter((c: any) => !colaboradoresBloqueados.has(c.colaborador_id))
        .map((c: any) => ({
          id: c.id,
          colaborador_id: c.colaborador_id,
          nome: c.colaboradores?.nome || 'Sem nome'
        }));

      setColaboradoresSemProva(semProva);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
    }
  };

  // Salvar prova registrada pelo instrutor
  const handleSaveRegistrarProva = async () => {
    if (!turmaId || !registrarProvaColaboradorId) {
      toast.error('Selecione um colaborador');
      return;
    }

    setSavingRegistrarProva(true);
    try {
      const respostas: Record<string, { resposta: string; correta: string; acertou: boolean }> = {};
      let acertos = 0;
      const totalQuestoes = registrarProvaQuestoes.length;

      if (registrarProvaMode === 'todas') {
        // Modo todas: usar respostas selecionadas
        registrarProvaQuestoes.forEach(q => {
          const respostaSelecionada = registrarProvaRespostas[q.id];
          const alternativaCorreta = q.alternativas.find(a => a.correta);
          const acertou = respostaSelecionada === alternativaCorreta?.id;
          if (acertou) acertos++;

          const altSelecionada = q.alternativas.find(a => a.id === respostaSelecionada);
          respostas[q.id] = {
            resposta: altSelecionada?.letra || '',
            correta: alternativaCorreta?.letra || '',
            acertou
          };
        });
      } else {
        // Modo incorretas: questões não selecionadas são corretas
        const questoesErradas = new Set(registrarProvaIncorretas.map(i => i.questaoId));
        
        registrarProvaQuestoes.forEach(q => {
          const alternativaCorreta = q.alternativas.find(a => a.correta);
          
          if (questoesErradas.has(q.id)) {
            // Questão errada
            const incorreta = registrarProvaIncorretas.find(i => i.questaoId === q.id);
            const altErrada = q.alternativas.find(a => a.id === incorreta?.alternativaId);
            respostas[q.id] = {
              resposta: altErrada?.letra || '',
              correta: alternativaCorreta?.letra || '',
              acertou: false
            };
          } else {
            // Questão correta
            acertos++;
            respostas[q.id] = {
              resposta: alternativaCorreta?.letra || '',
              correta: alternativaCorreta?.letra || '',
              acertou: true
            };
          }
        });
      }

      // Nota = número de acertos (cada questão vale 1 ponto)
      const nota = acertos;

      // Para pós-teste, deletar prova anterior se existir (para substituir)
      if (registrarProvaTipo === 'pos_teste') {
        await (supabase as any)
          .from('turma_provas')
          .delete()
          .eq('turma_id', turmaId)
          .eq('colaborador_id', registrarProvaColaboradorId)
          .eq('tipo_prova', 'pos_teste');
      }

      // Inserir nova prova
      const { error } = await (supabase as any)
        .from('turma_provas')
        .insert({
          turma_id: turmaId,
          colaborador_id: registrarProvaColaboradorId,
          tipo_prova: registrarProvaTipo,
          nota: nota,
          total_questoes: totalQuestoes,
          acertos: acertos,
          respostas: respostas,
          origem: 'instrutor'
        });

      if (error) throw error;

      // Atualizar nota no turma_colaboradores
      const colaboradorTurma = colaboradoresTurma.find(c => c.colaborador_id === registrarProvaColaboradorId);
      if (colaboradorTurma) {
        const updateData: Record<string, any> = registrarProvaTipo === 'pre_teste' 
          ? { nota_pre_teste: nota }
          : { nota_pos_teste: nota };

        // Se for pós-teste, calcular resultado
        // Nota 10: Aprovado | Nota 7-9: Aguardando reorientação | Nota < 7: Reprovado
        if (registrarProvaTipo === 'pos_teste') {
          if (acertos === 10) {
            updateData.resultado = 'aprovado';
          } else if (acertos >= 7) {
            updateData.resultado = colaboradorTurma.reorientado ? 'aprovado' : 'aguardando';
          } else {
            updateData.resultado = 'reprovado';
          }
        }

        await (supabase as any)
          .from('turma_colaboradores')
          .update(updateData)
          .eq('id', colaboradorTurma.id);

        // Atualizar estado local
        setColaboradoresTurma(prev => prev.map(c => 
          c.id === colaboradorTurma.id 
            ? { ...c, ...updateData }
            : c
        ));
      }

      toast.success('Prova registrada com sucesso!');
      
      // Registrar auditoria de prova
      if (turma && colaboradorTurma) {
        auditoria.auditarProva(
          turmaId!,
          turma.codigo_turma,
          'criou',
          { id: registrarProvaColaboradorId, nome: colaboradorTurma.nome, cpf: colaboradorTurma.cpf },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          registrarProvaTipo,
          nota,
          registrarProvaTipo === 'pos_teste' ? (acertos === 10 ? 'aprovado' : acertos >= 7 ? 'aguardando' : 'reprovado') : null,
          `Acertos: ${acertos}/10. Questões erradas: ${questoesErradasSelecionadas.length}`,
          turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
          'usuario',
          undefined,
          'sistema'
        );
      }
      
      setRegistrarProvaDialogOpen(false);
      fetchProvas();
    } catch (error: any) {
      console.error('Erro ao salvar prova:', error);
      toast.error('Erro ao registrar prova');
    } finally {
      setSavingRegistrarProva(false);
    }
  };

  // Adicionar questão incorreta
  const handleAddRegistrarProvaIncorreta = () => {
    setRegistrarProvaIncorretas(prev => [...prev, { questaoId: '', alternativaId: '' }]);
  };

  // Remover questão incorreta
  const handleRemoveRegistrarProvaIncorreta = (index: number) => {
    setRegistrarProvaIncorretas(prev => prev.filter((_, i) => i !== index));
  };

  // Atualizar questão incorreta
  const handleUpdateRegistrarProvaIncorreta = (index: number, field: 'questaoId' | 'alternativaId', value: string) => {
    setRegistrarProvaIncorretas(prev => prev.map((item, i) => {
      if (i === index) {
        if (field === 'questaoId') {
          return { questaoId: value, alternativaId: '' };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const fetchColaboradoresPendentes = async () => {
    if (!turmaId) return;
    
    setLoadingPendentes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('colaboradores_temporarios')
        .select('id, nome, cpf, created_at')
        .eq('turma_id', turmaId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setColaboradoresPendentes(data || []);
    } catch (error) {
      console.error('Erro ao buscar colaboradores pendentes:', error);
    } finally {
      setLoadingPendentes(false);
    }
  };

  const handleAprovarColaborador = async (pendente: ColaboradorPendente) => {
    if (!turma || !turmaId) return;
    
    setProcessandoAprovacao(pendente.id);
    try {
      // 0. Buscar o cliente_empresa_id do cliente SST (empresa real do colaborador)
      const { data: clienteData, error: clienteError } = await (supabase as any)
        .from('clientes_sst')
        .select('cliente_empresa_id')
        .eq('id', turma.cliente_id)
        .single();

      if (clienteError || !clienteData?.cliente_empresa_id) {
        throw new Error('Não foi possível encontrar a empresa do cliente');
      }

      const empresaColaboradorId = clienteData.cliente_empresa_id;

      // 1. Verificar se já existe colaborador com esse CPF na empresa cliente
      const { data: colaboradorExistente } = await (supabase as any)
        .from('colaboradores')
        .select('id')
        .eq('empresa_id', empresaColaboradorId)
        .eq('cpf', pendente.cpf)
        .single();

      let colaboradorId: string;

      if (colaboradorExistente) {
        // Colaborador já existe, usar o ID existente
        colaboradorId = colaboradorExistente.id;
      } else {
        // 2. Criar novo colaborador na empresa cliente
        const { data: novoColaborador, error: erroColaborador } = await (supabase as any)
          .from('colaboradores')
          .insert({
            empresa_id: empresaColaboradorId,
            nome: pendente.nome,
            cpf: pendente.cpf,
            ativo: true
          })
          .select('id')
          .single();

        if (erroColaborador) throw erroColaborador;
        colaboradorId = novoColaborador.id;

        // 3. Adicionar treinamento ao colaborador
        await (supabase as any)
          .from('colaboradores_treinamentos')
          .insert({
            colaborador_id: colaboradorId,
            treinamento_id: turma.treinamento_id,
            status: 'pendente'
          });
      }

      // 4. Verificar se já está na turma
      const { data: jaNaTurma } = await (supabase as any)
        .from('turma_colaboradores')
        .select('id')
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorId)
        .single();

      if (!jaNaTurma) {
        // 4.1 Verificar conflito de DATAS com outras turmas
        const { data: aulasTurmaAtual } = await (supabase as any)
          .from('turmas_treinamento_aulas')
          .select('data')
          .eq('turma_id', turmaId);

        if (aulasTurmaAtual && aulasTurmaAtual.length > 0) {
          const datasTurmaAtual = aulasTurmaAtual.map((a: any) => a.data);
          
          // Buscar outras turmas do colaborador que não estão concluídas
          const { data: outrasTurmasColab } = await (supabase as any)
            .from('turma_colaboradores')
            .select('turma_id, turmas_treinamento!turma_colaboradores_turma_id_fkey(id, status, codigo_turma, turmas_treinamento_aulas(data))')
            .eq('colaborador_id', colaboradorId);

          for (const outraTurma of (outrasTurmasColab || [])) {
            if (outraTurma.turmas_treinamento?.status === 'concluido') continue;
            if (outraTurma.turma_id === turmaId) continue;
            
            const aulasOutraTurma = outraTurma.turmas_treinamento?.turmas_treinamento_aulas || [];
            
            for (const aulaOutra of aulasOutraTurma) {
              if (datasTurmaAtual.includes(aulaOutra.data)) {
                const dataConflito = new Date(aulaOutra.data + 'T12:00:00').toLocaleDateString('pt-BR');
                toast.error(`Conflito de agenda! ${pendente.nome} já está na turma "${outraTurma.turmas_treinamento?.codigo_turma || 'outra turma'}" no dia ${dataConflito}. Não é possível aprovar.`);
                setProcessandoAprovacao(null);
                return;
              }
            }
          }
        }

        // 5. Adicionar colaborador à turma
        await (supabase as any)
          .from('turma_colaboradores')
          .insert({
            turma_id: turmaId,
            colaborador_id: colaboradorId,
            presente: false
          });
      }

      // 6. Remover da tabela de temporários
      await (supabase as any)
        .from('colaboradores_temporarios')
        .delete()
        .eq('id', pendente.id);

      toast.success(`${pendente.nome} foi aprovado e adicionado à turma!`);
      
      // Registrar auditoria
      if (turma) {
        auditoria.auditarColaborador(
          turmaId!,
          turma.codigo_turma,
          'criou',
          { id: colaboradorId, nome: pendente.nome, cpf: pendente.cpf },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'qrcode',
          'Aprovado da lista de pendentes (cadastro via QR Code/formulário)',
          turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
          'usuario'
        );
      }
      
      // Atualizar listas
      fetchColaboradoresPendentes();
      fetchColaboradoresTurma();
    } catch (error: any) {
      console.error('Erro ao aprovar colaborador:', error);
      toast.error('Erro ao aprovar colaborador. Tente novamente.');
    } finally {
      setProcessandoAprovacao(null);
    }
  };

  const handleRecusarColaborador = async (pendente: ColaboradorPendente) => {
    setProcessandoAprovacao(pendente.id);
    try {
      // Remover da tabela de temporários
      await (supabase as any)
        .from('colaboradores_temporarios')
        .delete()
        .eq('id', pendente.id);

      toast.success(`Cadastro de ${pendente.nome} foi recusado.`);
      
      // Registrar auditoria de recusa
      if (turma && turmaId) {
        auditoria.auditarColaborador(
          turmaId,
          turma.codigo_turma,
          'rejeitou',
          { nome: pendente.nome, cpf: pendente.cpf },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'qrcode',
          'Cadastro pendente recusado (via QR Code/formulário)',
          turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
          'usuario'
        );
      }
      
      fetchColaboradoresPendentes();
    } catch (error) {
      console.error('Erro ao recusar colaborador:', error);
      toast.error('Erro ao recusar colaborador. Tente novamente.');
    } finally {
      setProcessandoAprovacao(null);
    }
  };

  const generateQRCodeProva = () => {
    // Gera URL para prova via QR Code
    const baseUrl = window.location.origin;
    const qrUrl = `${baseUrl}/prova-turma/${turmaId}`;
    setQrCodeProvaUrl(qrUrl);
  };

  const fetchProvas = async () => {
    if (!turmaId) return;
    
    setLoadingProvas(true);
    try {
      const { data, error } = await (supabase as any)
        .from('turma_provas')
        .select(`
          id,
          tipo_prova,
          nota,
          total_questoes,
          acertos,
          origem,
          created_at,
          respostas,
          colaborador:colaboradores(id, nome, cpf)
        `)
        .eq('turma_id', turmaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProvas(data || []);
      
      // Também atualizar a lista de colaboradores para sincronizar as notas
      fetchColaboradoresTurma();
    } catch (error: any) {
      console.error('Erro ao buscar provas:', error);
    } finally {
      setLoadingProvas(false);
    }
  };

  // Filtrar provas por busca e tipo
  const provasFiltradas = provas.filter(p => {
    const matchTipo = provaFilterTipo === 'todos' || p.tipo_prova === provaFilterTipo;
    if (!provaSearchTerm.trim()) return matchTipo;
    const term = provaSearchTerm.toLowerCase();
    const nome = (p.colaborador?.nome || '').toLowerCase();
    const cpf = (p.colaborador?.cpf || '').replace(/\D/g, '');
    const termClean = term.replace(/\D/g, '');
    return matchTipo && (nome.includes(term) || (termClean && cpf.includes(termClean)));
  });

  const handleViewProva = async (prova: any) => {
    setProvaViewerData(prova);
    setProvaViewerOpen(true);
    setProvaViewerPage(0);
    setLoadingProvaViewer(true);
    try {
      // Buscar prova template do treinamento para o tipo correto
      const { data: provaTemplate } = await supabase
        .from('provas_treinamento')
        .select('id')
        .eq('treinamento_id', turma?.treinamento_id)
        .eq('tipo', prova.tipo_prova)
        .single();

      if (!provaTemplate) {
        // Tentar o outro tipo se não encontrar
        const { data: provaTemplateFallback } = await supabase
          .from('provas_treinamento')
          .select('id')
          .eq('treinamento_id', turma?.treinamento_id)
          .single();
        if (!provaTemplateFallback) { setProvaViewerQuestoes([]); return; }
        const { data: questoes } = await supabase
          .from('provas_questoes')
          .select('id, numero, pergunta, tipo_questao, alternativas:provas_alternativas(id, letra, texto, correta)')
          .eq('prova_id', provaTemplateFallback.id)
          .order('numero');
        setProvaViewerQuestoes(questoes || []);
        return;
      }

      const { data: questoes } = await supabase
        .from('provas_questoes')
        .select('id, numero, pergunta, tipo_questao, alternativas:provas_alternativas(id, letra, texto, correta)')
        .eq('prova_id', provaTemplate.id)
        .order('numero');

      setProvaViewerQuestoes(questoes || []);
    } catch (err) {
      console.error('Erro ao buscar questões da prova:', err);
      setProvaViewerQuestoes([]);
    } finally {
      setLoadingProvaViewer(false);
    }
  };

  // Abrir dialog para apagar prova
  const handleOpenApagarProva = async (prova: any) => {
    const colaboradorId = prova.colaborador?.id;
    if (!colaboradorId || !turmaId) return;

    setProvaParaApagar({
      id: prova.id,
      tipo_prova: prova.tipo_prova,
      colaborador_id: colaboradorId,
      colaborador_nome: prova.colaborador?.nome || 'Colaborador',
    });

    // Reset opções e etapas
    setApagarProvaOpcoes({
      apagarReorientacao: false,
      apagarAvaliacaoReacao: false,
      apagarAssinaturaCertificado: false,
    });
    setApagarProvaEtapa(1);
    setApagarProvaMotivo('');
    setApagarProvaMotivoOutro('');
    setApagarProvaConfirmacao('');

    // Se for pós-teste, verificar dados relacionados
    if (prova.tipo_prova === 'pos_teste') {
      try {
        // Verificar reorientação
        const { data: reorientacao } = await (supabase as any)
          .from('reorientacoes_colaborador')
          .select('id')
          .eq('turma_id', turmaId)
          .eq('colaborador_id', colaboradorId)
          .limit(1);

        // Verificar avaliação de reação
        const { data: avaliacaoReacao } = await (supabase as any)
          .from('avaliacao_reacao_respostas')
          .select('id')
          .eq('turma_id', turmaId)
          .eq('colaborador_id', colaboradorId)
          .limit(1);

        // Verificar assinatura do certificado
        const { data: turmaColab } = await (supabase as any)
          .from('turma_colaboradores')
          .select('assinatura_certificado')
          .eq('turma_id', turmaId)
          .eq('colaborador_id', colaboradorId)
          .single();

        setProvaTemDadosRelacionados({
          temReorientacao: (reorientacao && reorientacao.length > 0) || false,
          temAvaliacaoReacao: (avaliacaoReacao && avaliacaoReacao.length > 0) || false,
          temAssinaturaCertificado: !!turmaColab?.assinatura_certificado,
        });
      } catch (error) {
        console.error('Erro ao verificar dados relacionados:', error);
        setProvaTemDadosRelacionados({
          temReorientacao: false,
          temAvaliacaoReacao: false,
          temAssinaturaCertificado: false,
        });
      }
    } else {
      setProvaTemDadosRelacionados({
        temReorientacao: false,
        temAvaliacaoReacao: false,
        temAssinaturaCertificado: false,
      });
    }

    setApagarProvaDialogOpen(true);
  };

  // Executar exclusão da prova
  const handleConfirmarApagarProva = async () => {
    if (!provaParaApagar || !turmaId) return;

    setApagandoProva(true);
    try {
      // 1. Apagar a prova
      const { error: provaError } = await (supabase as any)
        .from('turma_provas')
        .delete()
        .eq('id', provaParaApagar.id);

      if (provaError) throw provaError;

      // 2. Se for pós-teste, limpar nota no turma_colaboradores
      if (provaParaApagar.tipo_prova === 'pos_teste') {
        await (supabase as any)
          .from('turma_colaboradores')
          .update({ 
            nota_pos_teste: null,
            resultado: 'aguardando',
            reorientado: apagarProvaOpcoes.apagarReorientacao ? false : undefined,
          })
          .eq('turma_id', turmaId)
          .eq('colaborador_id', provaParaApagar.colaborador_id);

        // 3. Apagar reorientação se marcado
        if (apagarProvaOpcoes.apagarReorientacao) {
          await (supabase as any)
            .from('reorientacoes_colaborador')
            .delete()
            .eq('turma_id', turmaId)
            .eq('colaborador_id', provaParaApagar.colaborador_id);
        }

        // 4. Apagar avaliação de reação se marcado
        if (apagarProvaOpcoes.apagarAvaliacaoReacao) {
          await (supabase as any)
            .from('avaliacao_reacao_respostas')
            .delete()
            .eq('turma_id', turmaId)
            .eq('colaborador_id', provaParaApagar.colaborador_id);

          // Atualizar flag no turma_colaboradores
          await (supabase as any)
            .from('turma_colaboradores')
            .update({ avaliacao_reacao_respondida: false })
            .eq('turma_id', turmaId)
            .eq('colaborador_id', provaParaApagar.colaborador_id);
        }

        // 5. Apagar assinatura do certificado se marcado
        if (apagarProvaOpcoes.apagarAssinaturaCertificado) {
          await (supabase as any)
            .from('turma_colaboradores')
            .update({ assinatura_certificado: null })
            .eq('turma_id', turmaId)
            .eq('colaborador_id', provaParaApagar.colaborador_id);
        }
      } else {
        // Pré-teste: apenas limpar nota
        await (supabase as any)
          .from('turma_colaboradores')
          .update({ nota_pre_teste: null })
          .eq('turma_id', turmaId)
          .eq('colaborador_id', provaParaApagar.colaborador_id);
      }

      toast.success(`${provaParaApagar.tipo_prova === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'} apagado com sucesso!`);
      
      // Registrar auditoria de deleção de prova
      if (turma && turmaId) {
        auditoria.auditarProva(
          turmaId,
          turma.codigo_turma,
          'deletou',
          { id: provaParaApagar.colaborador_id, nome: provaParaApagar.colaborador_nome, cpf: '' },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          provaParaApagar.tipo_prova,
          provaParaApagar.nota,
          null,
          `Prova apagada${apagarProvaOpcoes.apagarAvaliacaoReacao ? ' + avaliação de reação' : ''}${apagarProvaOpcoes.apagarAssinaturaCertificado ? ' + assinatura certificado' : ''}`,
          turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
          'usuario',
          undefined,
          'sistema'
        );
      }
      
      setApagarProvaDialogOpen(false);
      setProvaParaApagar(null);
      fetchProvas();
      fetchColaboradoresTurma();
    } catch (error: any) {
      console.error('Erro ao apagar prova:', error);
      toast.error('Erro ao apagar prova: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setApagandoProva(false);
    }
  };

  // Medir alturas reais das questões e calcular paginação
  useEffect(() => {
    if (!provaViewerOpen || loadingProvaViewer || !provaViewerQuestoes.length) return;
    // Aguardar render do container oculto
    const timer = setTimeout(() => {
      const container = provaViewerMeasureRef.current;
      const headerEl = provaViewerHeaderRef.current;
      if (!container) return;

      const PAGE_H = 842;
      const PAD = 64; // 32px top + 32px bottom
      const FOOTER_H = 22;
      const MINI_HEADER_H = 24;
      const LABEL_H = 18; // "Questões X a Y"
      const GAP = 6;

      // Medir header real
      const headerH = headerEl ? headerEl.getBoundingClientRect().height + 10 : 200; // +10 marginBottom

      // Medir cada questão
      const questionEls = container.querySelectorAll('[data-question-measure]');
      const heights: number[] = [];
      questionEls.forEach((el) => {
        heights.push(el.getBoundingClientRect().height + GAP);
      });

      // Calcular páginas
      const availP1 = PAGE_H - PAD - headerH - FOOTER_H - LABEL_H;
      const availOther = PAGE_H - PAD - MINI_HEADER_H - FOOTER_H - LABEL_H;

      const pages: { start: number; end: number }[] = [];
      let idx = 0;
      while (idx < heights.length) {
        const avail = pages.length === 0 ? availP1 : availOther;
        let used = 0;
        let end = idx;
        while (end < heights.length && used + heights[end] <= avail) {
          used += heights[end];
          end++;
        }
        if (end === idx) end = idx + 1; // pelo menos 1
        pages.push({ start: idx, end });
        idx = end;
      }
      if (pages.length === 0) pages.push({ start: 0, end: 0 });

      setProvaViewerPages(pages);
    }, 50);
    return () => clearTimeout(timer);
  }, [provaViewerOpen, loadingProvaViewer, provaViewerQuestoes]);

  // Gerar PDF da prova - captura cada página A4 via html2canvas (idêntico à tela)
  const handleGerarProvaPDF = async () => {
    if (!provaViewerA4Ref.current || !provaViewerData || provaViewerPages.length === 0) return;
    setGeneratingProvaPDF(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [595, 842] });
      const originalPage = provaViewerPage;
      const totalPages = provaViewerPages.length;

      for (let i = 0; i < totalPages; i++) {
        setProvaViewerPage(i);
        // Aguardar render completo da página (imagens, fontes, layout)
        await new Promise(r => setTimeout(r, 300));

        const el = provaViewerA4Ref.current!;
        const canvas = await html2canvas(el, {
          scale: 1.5,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          width: el.offsetWidth,
          height: el.offsetHeight,
          scrollX: 0,
          scrollY: 0,
          logging: false,
          onclone: (clonedDoc: Document) => {
            // Forçar estilos computados no clone para garantir fidelidade
            const clonedEl = clonedDoc.querySelector('[data-prova-a4]');
            if (clonedEl) {
              (clonedEl as HTMLElement).style.boxShadow = 'none';
            }
          },
        });

        // Usar JPEG com qualidade reduzida para compactar o PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        if (i > 0) pdf.addPage([595, 842]);
        pdf.addImage(imgData, 'JPEG', 0, 0, 595, 842);
      }

      // Restaurar página original
      setProvaViewerPage(originalPage);

      const nomeColab = (provaViewerData.colaborador?.nome || 'colaborador')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const tipo = provaViewerData.tipo_prova === 'pre_teste' ? 'Pre_Teste' : 'Pos_Teste';
      pdf.save(`Prova_${tipo}_${nomeColab}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF da prova:', err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingProvaPDF(false);
    }
  };

  const handleAddColaboradorFromList = async (colaboradorId: string) => {
    if (!turmaId || !turma?.treinamento_id) return;

    try {
      // Verificar se o colaborador já está em outra turma para o mesmo treinamento (não concluída)
      const { data: turmasExistentes } = await (supabase as any)
        .from('turma_colaboradores')
        .select('turma_id, turmas_treinamento!turma_colaboradores_turma_id_fkey(id, treinamento_id, status, codigo_turma)')
        .eq('colaborador_id', colaboradorId);

      const turmaComMesmoTreinamento = (turmasExistentes || []).find((tc: any) => 
        tc.turmas_treinamento?.treinamento_id === turma.treinamento_id && 
        tc.turmas_treinamento?.status !== 'concluido' &&
        tc.turma_id !== turmaId
      );

      if (turmaComMesmoTreinamento) {
        toast.error(`Este colaborador já está na turma "${turmaComMesmoTreinamento.turmas_treinamento?.codigo_turma || 'em andamento'}" para este mesmo treinamento. Não é possível adicionar a outra turma do mesmo treinamento.`);
        return;
      }

      // Verificar se o colaborador tem certificado válido (não vencido) para este treinamento
      const { data: certificadoValido } = await (supabase as any)
        .from('colaboradores_certificados')
        .select('id, data_validade, turmas_treinamento!colaboradores_certificados_turma_id_fkey(status)')
        .eq('colaborador_id', colaboradorId)
        .eq('treinamento_id', turma.treinamento_id)
        .gte('data_validade', new Date().toISOString().split('T')[0])
        .single();

      if (certificadoValido && certificadoValido.turmas_treinamento?.status === 'concluido') {
        toast.error(`Este colaborador já possui um certificado válido para este treinamento (validade: ${new Date(certificadoValido.data_validade).toLocaleDateString('pt-BR')}). Só poderá fazer novamente após o vencimento.`);
        return;
      }

      // Verificar conflito de DATAS - buscar aulas desta turma
      const { data: aulasTurmaAtual } = await (supabase as any)
        .from('turmas_treinamento_aulas')
        .select('data')
        .eq('turma_id', turmaId);

      if (aulasTurmaAtual && aulasTurmaAtual.length > 0) {
        const datasTurmaAtual = aulasTurmaAtual.map((a: any) => a.data);
        
        // Buscar outras turmas do colaborador que não estão concluídas
        const { data: outrasTurmasColab } = await (supabase as any)
          .from('turma_colaboradores')
          .select('turma_id, turmas_treinamento!turma_colaboradores_turma_id_fkey(id, status, codigo_turma, turmas_treinamento_aulas(data))')
          .eq('colaborador_id', colaboradorId);

        for (const outraTurma of (outrasTurmasColab || [])) {
          if (outraTurma.turmas_treinamento?.status === 'concluido') continue;
          if (outraTurma.turma_id === turmaId) continue;
          
          const aulasOutraTurma = outraTurma.turmas_treinamento?.turmas_treinamento_aulas || [];
          
          for (const aulaOutra of aulasOutraTurma) {
            // Verificar se há qualquer data em comum (conflito de agenda)
            if (datasTurmaAtual.includes(aulaOutra.data)) {
              const dataConflito = new Date(aulaOutra.data + 'T12:00:00').toLocaleDateString('pt-BR');
              toast.error(`Conflito de agenda! Este colaborador já está na turma "${outraTurma.turmas_treinamento?.codigo_turma || 'outra turma'}" no dia ${dataConflito}. Não é possível adicionar colaboradores em turmas com datas conflitantes.`);
              return;
            }
          }
        }
      }

      const { error } = await (supabase as any)
        .from('turma_colaboradores')
        .insert({
          turma_id: turmaId,
          colaborador_id: colaboradorId,
          presente: false,
          reorientado: false
        });

      if (error) throw error;

      // Adicionar treinamento ao colaborador se ainda não tiver
      const { data: existingTreinamento } = await (supabase as any)
        .from('colaboradores_treinamentos')
        .select('id')
        .eq('colaborador_id', colaboradorId)
        .eq('treinamento_id', turma.treinamento_id)
        .single();

      if (!existingTreinamento) {
        await (supabase as any)
          .from('colaboradores_treinamentos')
          .insert({
            colaborador_id: colaboradorId,
            treinamento_id: turma.treinamento_id,
            status: 'pendente'
          });
      }

      toast.success('Colaborador adicionado à turma!');
      
      // Registrar auditoria
      const colaboradorInfo = colaboradoresEmpresa.find(c => c.id === colaboradorId);
      console.log('[Auditoria Debug] Adicionar colaborador:', { colaboradorInfo, turma: !!turma, turmaId, colaboradorId });
      if (colaboradorInfo && turma && turmaId) {
        auditoria.auditarColaborador(
          turmaId,
          turma.codigo_turma,
          'criou',
          { id: colaboradorId, nome: colaboradorInfo.nome, cpf: colaboradorInfo.cpf },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'empresa',
          'Adicionado da lista de colaboradores da empresa',
          turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
          'usuario'
        );
      }
      
      // Atualizar localmente para feedback imediato
      setColaboradoresEmpresa(prev => prev.map(c => 
        c.id === colaboradorId ? { ...c, jaNaTurma: true } : c
      ));
      
      // Recarregar dados do servidor
      fetchColaboradoresTurma();
    } catch (error: any) {
      console.error('Erro ao adicionar colaborador:', error);
      toast.error('Erro ao adicionar colaborador');
    }
  };

  // Handler para seleção de foto do novo colaborador
  const handleNovaFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNovaFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNovaFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateNovoColaborador = async () => {
    if (!turma?.cliente_id || !turmaId || !turma?.treinamento_id || !novoNome.trim() || !novoCpf.trim()) {
      toast.error('Preencha nome e CPF do colaborador');
      return;
    }

    setSalvandoColaborador(true);
    try {
      // Buscar o cliente_empresa_id do cliente SST (empresa real do colaborador)
      const { data: clienteData, error: clienteError } = await (supabase as any)
        .from('clientes_sst')
        .select('cliente_empresa_id')
        .eq('id', turma.cliente_id)
        .single();

      if (clienteError || !clienteData?.cliente_empresa_id) {
        throw new Error('Não foi possível encontrar a empresa do cliente');
      }

      const empresaColaboradorId = clienteData.cliente_empresa_id;
      const cpfLimpo = novoCpf.replace(/\D/g, '');

      // Verificar se já existe colaborador com esse CPF na empresa
      const { data: colaboradorExistente } = await (supabase as any)
        .from('colaboradores')
        .select('id')
        .eq('empresa_id', empresaColaboradorId)
        .eq('cpf', cpfLimpo)
        .single();

      let novoColaboradorId: string;

      if (colaboradorExistente) {
        // Colaborador já existe, usar o ID existente
        novoColaboradorId = colaboradorExistente.id;
      } else {
        // Criar o colaborador
        const { data: novoColaborador, error: errorColaborador } = await (supabase as any)
          .from('colaboradores')
          .insert({
            empresa_id: empresaColaboradorId,
            nome: novoNome.trim(),
            cpf: cpfLimpo,
            matricula: novaMatricula.trim() || null,
            ativo: true
          })
          .select('id')
          .single();

        if (errorColaborador) throw errorColaborador;
        novoColaboradorId = novoColaborador.id;
      }

      // Adicionar treinamento ao colaborador (apenas se for novo)
      if (!colaboradorExistente) {
        await (supabase as any)
          .from('colaboradores_treinamentos')
          .insert({
            colaborador_id: novoColaboradorId,
            treinamento_id: turma.treinamento_id,
            status: 'pendente'
          });
      }

      // Depois, adicionar à turma
      const { error: errorTurma } = await (supabase as any)
        .from('turma_colaboradores')
        .insert({
          turma_id: turmaId,
          colaborador_id: novoColaboradorId,
          presente: false,
          reorientado: false
        });

      if (errorTurma) throw errorTurma;

      // Upload da foto se foi selecionada
      if (novaFoto && !colaboradorExistente) {
        try {
          const fileExt = novaFoto.name.split('.').pop();
          const fileName = `${novoColaboradorId}.${fileExt}`;
          const filePath = `colaboradores/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('fotos')
            .upload(filePath, novaFoto, { upsert: true });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('fotos')
              .getPublicUrl(filePath);

            if (urlData?.publicUrl) {
              await (supabase as any)
                .from('colaboradores')
                .update({ foto_url: urlData.publicUrl })
                .eq('id', novoColaboradorId);
            }
          }
        } catch (fotoError) {
          console.error('Erro ao fazer upload da foto:', fotoError);
          // Não falha o cadastro por causa da foto
        }
      }

      toast.success('Colaborador criado e adicionado à turma!');
      
      // Registrar auditoria
      if (turma) {
        auditoria.auditarColaborador(
          turmaId,
          turma.codigo_turma,
          'criou',
          { id: novoColaboradorId, nome: novoNome.trim(), cpf: cpfLimpo },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'formulario',
          colaboradorExistente ? 'Colaborador existente adicionado à turma' : 'Novo colaborador cadastrado e adicionado à turma',
          turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
          'usuario'
        );
      }
      
      setNovoNome('');
      setNovoCpf('');
      setNovaMatricula('');
      setNovaFoto(null);
      setNovaFotoPreview(null);
      fetchColaboradoresTurma();
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Erro ao criar colaborador:', error);
      toast.error(error.message || 'Erro ao criar colaborador');
    } finally {
      setSalvandoColaborador(false);
    }
  };

  const handleToggleReorientado = async (colaboradorTurmaId: string, reorientado: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('turma_colaboradores')
        .update({ reorientado: !reorientado })
        .eq('id', colaboradorTurmaId);

      if (error) throw error;

      setColaboradoresTurma(prev => prev.map(c => 
        c.id === colaboradorTurmaId ? { ...c, reorientado: !reorientado } : c
      ));
      
      // Registrar auditoria de toggle reorientação
      const colab = colaboradoresTurma.find(c => c.id === colaboradorTurmaId);
      if (turma && turmaId && colab) {
        auditoria.auditarReorientacao(
          turmaId,
          turma.codigo_turma,
          !reorientado ? 'criou' : 'deletou',
          { id: colab.colaborador_id, nome: colab.nome, cpf: colab.cpf },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          !reorientado ? 'Marcado como reorientado' : 'Desmarcado reorientação'
        );
      }
    } catch (error: any) {
      console.error('Erro ao atualizar reorientado:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const handleOpenUploadReorientacao = (colaborador: ColaboradorTurma) => {
    setSelectedColaboradorUpload(colaborador);
    setUploadDialogOpen(true);
  };

  const handleUploadReorientacao = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedColaboradorUpload || !turmaId) return;

    setUploadingFile(true);
    try {
      // Upload do arquivo para o Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `reorientacao_${turmaId}_${selectedColaboradorUpload.colaborador_id}_${Date.now()}.${fileExt}`;
      const filePath = `reorientacoes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('treinamentos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Atualizar o colaborador como reorientado e aprovado
      const { error: updateError } = await (supabase as any)
        .from('turma_colaboradores')
        .update({ 
          reorientado: true,
          foto_reorientacao: filePath,
          resultado: 'aprovado'
        })
        .eq('id', selectedColaboradorUpload.id);

      if (updateError) throw updateError;

      // Atualizar estado local
      setColaboradoresTurma(prev => prev.map(c => 
        c.id === selectedColaboradorUpload.id ? { ...c, reorientado: true, resultado: 'aprovado' } : c
      ));

      toast.success('Foto de reorientação enviada com sucesso!');
      
      // Registrar auditoria de reorientação com foto
      if (turma && turmaId) {
        auditoria.auditarReorientacao(
          turmaId,
          turma.codigo_turma,
          'criou',
          { id: selectedColaboradorUpload.colaborador_id, nome: selectedColaboradorUpload.nome, cpf: selectedColaboradorUpload.cpf },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'Foto de reorientação enviada - colaborador aprovado'
        );
      }
      
      setUploadDialogOpen(false);
      setSelectedColaboradorUpload(null);
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar foto de reorientação');
    } finally {
      setUploadingFile(false);
    }
  };

  // Função para carregar anexos do banco de dados
  const fetchAnexos = async () => {
    if (!turmaId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('turma_anexos')
        .select('*')
        .eq('turma_id', turmaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const listaPresenca = data.filter((a: any) => a.tipo === 'lista_presenca').map((a: any) => ({
          id: a.id,
          url: a.url,
          nome: a.nome,
          tipo: a.tipo,
          created_at: a.created_at,
          file_path: a.file_path
        }));
        const galeria = data.filter((a: any) => a.tipo === 'galeria').map((a: any) => ({
          id: a.id,
          url: a.url,
          nome: a.nome,
          tipo: a.tipo,
          created_at: a.created_at,
          file_path: a.file_path,
          descricao: a.descricao,
          data_foto: a.data_foto
        }));
        const cases = data.filter((a: any) => a.tipo === 'case').map((a: any) => ({
          id: a.id,
          url: a.url,
          nome: a.nome,
          tipo: a.tipo,
          created_at: a.created_at,
          file_path: a.file_path
        }));
        const avaliacao = data.filter((a: any) => a.tipo === 'avaliacao').map((a: any) => ({
          id: a.id,
          url: a.url,
          nome: a.nome,
          tipo: a.tipo,
          created_at: a.created_at,
          file_path: a.file_path
        }));
        const relatorio = data.filter((a: any) => a.tipo === 'relatorio').map((a: any) => ({
          id: a.id,
          url: a.url,
          nome: a.nome,
          tipo: a.tipo,
          created_at: a.created_at,
          file_path: a.file_path
        }));

        const relatorioPresencas = data.filter((a: any) => a.tipo === 'relatorio_presencas').map((a: any) => ({
          id: a.id,
          url: a.url,
          nome: a.nome,
          tipo: a.tipo,
          created_at: a.created_at,
          file_path: a.file_path
        }));
        const relatorioSinistros = data.filter((a: any) => a.tipo === 'relatorio_sinistros').map((a: any) => ({
          id: a.id,
          url: a.url,
          nome: a.nome,
          tipo: a.tipo,
          created_at: a.created_at,
          file_path: a.file_path
        }));

        setAnexosListaPresenca(listaPresenca);
        setAnexosGaleria(galeria);
        setAnexosCases(cases);
        setAnexosAvaliacao(avaliacao);
        setAnexosRelatorio(relatorio);
        setAnexosRelatorioPresencas(relatorioPresencas);
        setAnexosRelatorioSinistros(relatorioSinistros);
      }
    } catch (error: any) {
      console.error('Erro ao carregar anexos:', error);
    }
  };

  // Funções de upload de anexos
  const MAX_GALERIA_FOTOS = 10;
  
  const handleUploadAnexo = async (
    event: React.ChangeEvent<HTMLInputElement>,
    tipo: 'lista_presenca' | 'galeria' | 'case' | 'avaliacao' | 'relatorio'
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !turmaId) return;

    // Verificar limite de 5 fotos para galeria
    if (tipo === 'galeria') {
      const espacoDisponivel = MAX_GALERIA_FOTOS - anexosGaleria.length;
      if (espacoDisponivel <= 0) {
        toast.error(`A galeria já possui o máximo de ${MAX_GALERIA_FOTOS} fotos.`);
        event.target.value = '';
        return;
      }
      if (files.length > espacoDisponivel) {
        toast.error(`Você só pode adicionar mais ${espacoDisponivel} foto(s). Máximo: ${MAX_GALERIA_FOTOS}`);
        event.target.value = '';
        return;
      }
    }

    for (const file of Array.from(files)) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${tipo}_${turmaId}_${Date.now()}.${fileExt}`;
        const filePath = `anexos/${turmaId}/${tipo}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('treinamentos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('treinamentos')
          .getPublicUrl(filePath);

        // Salvar no banco de dados
        const { data: anexoData, error: dbError } = await (supabase as any)
          .from('turma_anexos')
          .insert({
            turma_id: turmaId,
            tipo,
            nome: file.name,
            url: urlData.publicUrl,
            file_path: filePath
          })
          .select()
          .single();

        if (dbError) throw dbError;

        const novoAnexo: AnexoItem = {
          id: anexoData.id,
          url: anexoData.url,
          nome: anexoData.nome,
          tipo: anexoData.tipo,
          created_at: anexoData.created_at
        };

        // Adicionar ao estado correspondente
        switch (tipo) {
          case 'lista_presenca':
            setAnexosListaPresenca(prev => [...prev, novoAnexo]);
            break;
          case 'galeria':
            setAnexosGaleria(prev => [...prev, novoAnexo]);
            break;
          case 'case':
            setAnexosCases(prev => [...prev, novoAnexo]);
            break;
          case 'avaliacao':
            setAnexosAvaliacao(prev => [...prev, novoAnexo]);
            break;
          case 'relatorio':
            setAnexosRelatorio(prev => [...prev, novoAnexo]);
            break;
        }

        toast.success(`Arquivo "${file.name}" enviado com sucesso!`);
        
        // Registrar auditoria de upload de anexo
        if (turma) {
          auditoria.auditarAnexo(
            turmaId,
            turma.codigo_turma,
            'upload',
            file.name,
            tipo,
            { id: turma.cliente_id, nome: turma.cliente_nome },
            { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma }
          );
        }
      } catch (error: any) {
        console.error('Erro ao fazer upload:', error);
        toast.error(`Erro ao enviar "${file.name}"`);
      }
    }

    // Limpar input
    event.target.value = '';
  };

  const handleDeleteAnexo = async (
    anexo: AnexoItem,
    tipo: 'lista_presenca' | 'galeria' | 'case' | 'avaliacao' | 'relatorio'
  ) => {
    try {
      // Remover do banco de dados primeiro
      const { error: dbError } = await (supabase as any)
        .from('turma_anexos')
        .delete()
        .eq('id', anexo.id);

      if (dbError) throw dbError;

      // Extrair o path do arquivo da URL e remover do storage
      const urlParts = anexo.url.split('/treinamentos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('treinamentos').remove([filePath]);
      }

      // Remover do estado
      switch (tipo) {
        case 'lista_presenca':
          setAnexosListaPresenca(prev => prev.filter(a => a.id !== anexo.id));
          break;
        case 'galeria':
          setAnexosGaleria(prev => prev.filter(a => a.id !== anexo.id));
          break;
        case 'case':
          setAnexosCases(prev => prev.filter(a => a.id !== anexo.id));
          break;
        case 'avaliacao':
          setAnexosAvaliacao(prev => prev.filter(a => a.id !== anexo.id));
          break;
        case 'relatorio':
          setAnexosRelatorio(prev => prev.filter(a => a.id !== anexo.id));
          break;
      }

      toast.success('Arquivo excluído com sucesso!');
      
      // Registrar auditoria de deleção de anexo
      if (turma) {
        auditoria.auditarAnexo(
          turmaId!,
          turma.codigo_turma,
          'deletou',
          anexo.nome,
          tipo,
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma }
        );
      }
    } catch (error: any) {
      console.error('Erro ao excluir arquivo:', error);
      toast.error('Erro ao excluir arquivo');
    }
  };

  const handleDownloadAnexo = async (url: string, nome: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nome || 'imagem.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      window.open(url, '_blank');
    }
  };

  const handleConfirmDeleteAnexo = (
    anexo: AnexoItem,
    tipo: 'lista_presenca' | 'galeria' | 'case' | 'avaliacao' | 'relatorio'
  ) => {
    setDeleteImagemAnexo(anexo);
    setDeleteImagemTipo(tipo);
    setDeleteImagemDialogOpen(true);
  };

  // Função para upload de galeria com descrição obrigatória
  const handleUploadGaleria = async () => {
    if (!uploadGaleriaFile || !turmaId) return;
    
    if (!uploadGaleriaDescricao.trim()) {
      toast.error('A descrição é obrigatória');
      return;
    }

    setUploadGaleriaLoading(true);
    try {
      let fileToUpload: File | Blob = uploadGaleriaFile;
      let finalExt = uploadGaleriaFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      let contentType = uploadGaleriaFile.type;

      // Converter HEIC/HEIF para JPEG
      if (finalExt === 'heic' || finalExt === 'heif' || uploadGaleriaFile.type === 'image/heic' || uploadGaleriaFile.type === 'image/heif') {
        toast.info('Convertendo imagem HEIC para JPEG...');
        try {
          const convertedBlob = await heic2any({
            blob: uploadGaleriaFile,
            toType: 'image/jpeg',
            quality: 0.85
          });
          fileToUpload = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          finalExt = 'jpg';
          contentType = 'image/jpeg';
        } catch (conversionError) {
          console.error('Erro ao converter HEIC:', conversionError);
          toast.error('Erro ao converter imagem HEIC. Tente outro formato.');
          setUploadGaleriaLoading(false);
          return;
        }
      }

      const fileName = `galeria_${turmaId}_${Date.now()}.${finalExt}`;
      const filePath = `anexos/${turmaId}/galeria/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('treinamentos')
        .upload(filePath, fileToUpload, {
          contentType: contentType
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('treinamentos')
        .getPublicUrl(filePath);

      const { data: anexoData, error: dbError } = await (supabase as any)
        .from('turma_anexos')
        .insert({
          turma_id: turmaId,
          tipo: 'galeria',
          nome: uploadGaleriaDescricao.trim(),
          descricao: uploadGaleriaDescricao.trim(),
          data_foto: uploadGaleriaDataRegistro,
          url: urlData.publicUrl,
          file_path: filePath
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const novoAnexo: AnexoItem = {
        id: anexoData.id,
        url: anexoData.url,
        nome: anexoData.nome,
        tipo: 'galeria',
        created_at: anexoData.created_at,
        descricao: anexoData.descricao,
        data_foto: anexoData.data_foto,
        file_path: anexoData.file_path
      };

      setAnexosGaleria(prev => [...prev, novoAnexo]);
      setUploadGaleriaDialogOpen(false);
      setUploadGaleriaFile(null);
      setUploadGaleriaDescricao('');
      setUploadGaleriaDataRegistro(format(new Date(), 'yyyy-MM-dd'));
      toast.success('Foto adicionada à galeria!');
      
      // Registrar auditoria de foto na galeria
      if (turma && turmaId) {
        auditoria.auditarFoto(
          turmaId,
          turma.codigo_turma,
          'criou',
          null, // colaborador (não se aplica para foto de galeria)
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'galeria',
          `Descrição: ${uploadGaleriaDescricao.trim()}`
        );
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setUploadGaleriaLoading(false);
    }
  };

  // Função para converter HEIC existente para JPEG e substituir no bucket
  const handleConverterHeicParaJpeg = async (anexo: AnexoItem) => {
    if (!anexo.file_path) return;
    
    const isHeic = anexo.url.toLowerCase().includes('.heic') || anexo.url.toLowerCase().includes('.heif');
    if (!isHeic) {
      toast.info('Este arquivo não é HEIC');
      return;
    }

    setConvertendoHeicId(anexo.id);
    try {
      // Baixar o arquivo HEIC
      const response = await fetch(anexo.url);
      const heicBlob = await response.blob();

      // Converter para JPEG
      toast.info('Convertendo HEIC para JPEG...');
      const convertedBlob = await heic2any({
        blob: heicBlob,
        toType: 'image/jpeg',
        quality: 0.85
      });
      const jpegBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

      // Novo caminho com extensão .jpg
      const newFilePath = anexo.file_path.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');

      // Upload do arquivo convertido
      const { error: uploadError } = await supabase.storage
        .from('treinamentos')
        .upload(newFilePath, jpegBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obter URL pública do novo arquivo
      const { data: urlData } = supabase.storage
        .from('treinamentos')
        .getPublicUrl(newFilePath);

      // Atualizar o registro no banco
      const { error: updateError } = await (supabase as any)
        .from('turma_anexos')
        .update({
          url: urlData.publicUrl,
          file_path: newFilePath
        })
        .eq('id', anexo.id);

      if (updateError) throw updateError;

      // Deletar o arquivo HEIC original
      await supabase.storage
        .from('treinamentos')
        .remove([anexo.file_path]);

      // Atualizar estado local
      setAnexosGaleria(prev => prev.map(a => 
        a.id === anexo.id ? { ...a, url: urlData.publicUrl, file_path: newFilePath } : a
      ));

      toast.success('Imagem convertida para JPEG com sucesso!');
    } catch (error: any) {
      console.error('Erro ao converter HEIC:', error);
      toast.error('Erro ao converter imagem HEIC');
    } finally {
      setConvertendoHeicId(null);
    }
  };

  // Função para editar foto da galeria (data e descrição)
  const handleEditarFoto = async () => {
    if (!editarFotoAnexo) return;

    if (!editarFotoNovaDescricao.trim()) {
      toast.error('A descrição é obrigatória');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('turma_anexos')
        .update({ 
          data_foto: editarFotoNovaData,
          descricao: editarFotoNovaDescricao.trim(),
          nome: editarFotoNovaDescricao.trim()
        })
        .eq('id', editarFotoAnexo.id);

      if (error) throw error;

      setAnexosGaleria(prev => prev.map(a => 
        a.id === editarFotoAnexo.id ? { 
          ...a, 
          data_foto: editarFotoNovaData,
          descricao: editarFotoNovaDescricao.trim(),
          nome: editarFotoNovaDescricao.trim()
        } : a
      ));

      setEditarFotoDialogOpen(false);
      setEditarFotoAnexo(null);
      setEditarFotoNovaData('');
      setEditarFotoNovaDescricao('');
      toast.success('Foto atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar foto:', error);
      toast.error('Erro ao atualizar foto');
    }
  };

  // Função para buscar avaliações de reação e cases de sucesso
  const fetchAvaliacoesReacao = async () => {
    if (!turmaId) return;

    try {
      setLoadingCases(true);
      
      // Buscar avaliações de reação com comentários
      const { data: avaliacoes, error: avalError } = await (supabase as any)
        .from('avaliacao_reacao_respostas')
        .select(`
          id,
          colaborador_id,
          sugestoes_comentarios,
          created_at,
          colaboradores!inner(nome)
        `)
        .eq('turma_id', turmaId)
        .not('sugestoes_comentarios', 'is', null)
        .neq('sugestoes_comentarios', '')
        .order('created_at', { ascending: false });

      if (avalError) throw avalError;

      // Buscar cases de sucesso já selecionados
      const { data: cases, error: casesError } = await (supabase as any)
        .from('turma_cases_sucesso')
        .select('avaliacao_resposta_id')
        .eq('turma_id', turmaId);

      if (casesError) throw casesError;

      const casesIds = (cases || []).map((c: any) => c.avaliacao_resposta_id);
      setCasesSucessoIds(casesIds);

      // Mapear avaliações
      const avaliacoesFormatadas: AvaliacaoReacaoItem[] = (avaliacoes || []).map((a: any) => ({
        id: a.id,
        colaborador_id: a.colaborador_id,
        colaborador_nome: a.colaboradores?.nome || 'Colaborador',
        sugestoes_comentarios: a.sugestoes_comentarios,
        created_at: a.created_at,
        is_case_sucesso: casesIds.includes(a.id)
      }));

      setAvaliacoesReacao(avaliacoesFormatadas);
    } catch (error: any) {
      console.error('Erro ao buscar avaliações:', error);
    } finally {
      setLoadingCases(false);
    }
  };

  // Função para alternar case de sucesso
  const handleToggleCaseSucesso = async (avaliacaoId: string) => {
    if (!turmaId) return;

    const isCurrentlyCase = casesSucessoIds.includes(avaliacaoId);
    
    // Verificar limite de 5 cases
    if (!isCurrentlyCase && casesSucessoIds.length >= 5) {
      toast.error('Limite máximo de 5 cases de sucesso atingido');
      return;
    }

    try {
      if (isCurrentlyCase) {
        // Remover case
        const { error } = await (supabase as any)
          .from('turma_cases_sucesso')
          .delete()
          .eq('turma_id', turmaId)
          .eq('avaliacao_resposta_id', avaliacaoId);

        if (error) throw error;

        setCasesSucessoIds(prev => prev.filter(id => id !== avaliacaoId));
        setAvaliacoesReacao(prev => prev.map(a => 
          a.id === avaliacaoId ? { ...a, is_case_sucesso: false } : a
        ));
        toast.success('Case de sucesso removido');
      } else {
        // Adicionar case
        const { error } = await (supabase as any)
          .from('turma_cases_sucesso')
          .insert({
            turma_id: turmaId,
            avaliacao_resposta_id: avaliacaoId
          });

        if (error) throw error;

        setCasesSucessoIds(prev => [...prev, avaliacaoId]);
        setAvaliacoesReacao(prev => prev.map(a => 
          a.id === avaliacaoId ? { ...a, is_case_sucesso: true } : a
        ));
        toast.success('Case de sucesso adicionado');
      }
    } catch (error: any) {
      console.error('Erro ao atualizar case:', error);
      toast.error('Erro ao atualizar case de sucesso');
    }
  };

  // Funções de Sinistros
  const fetchTiposSinistro = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('tipos_sinistro')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setTiposSinistro(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar tipos de sinistro:', error);
    }
  };

  const fetchSinistros = async () => {
    if (!turmaId) return;

    setLoadingSinistros(true);
    try {
      const { data, error } = await (supabase as any)
        .from('sinistros_colaborador')
        .select(`
          id,
          turma_colaborador_id,
          tipo_sinistro_id,
          acao,
          descricao,
          created_at,
          registrado_por,
          tipos_sinistro(id, codigo, nome, descricao, acao_padrao),
          sinistro_fotos(id, foto_url, descricao, data_captura)
        `)
        .eq('turma_id', turmaId);

      if (error) throw error;

      // Buscar nomes dos instrutores que registraram
      const registradoPorIds = [...new Set((data || []).map((s: any) => s.registrado_por).filter(Boolean))];
      const instrutoresMap: Record<string, { nome: string; email?: string }> = {};
      
      if (registradoPorIds.length > 0) {
        const { data: profilesData } = await (supabase as any)
          .from('profiles')
          .select('id, nome, email')
          .in('id', registradoPorIds);
        
        (profilesData || []).forEach((p: any) => {
          instrutoresMap[p.id] = { nome: p.nome, email: p.email };
        });
      }

      // Agrupar sinistros por turma_colaborador_id
      const sinistrosAgrupados: Record<string, SinistroColaborador[]> = {};
      (data || []).forEach((s: any) => {
        const sinistro: SinistroColaborador = {
          id: s.id,
          turma_colaborador_id: s.turma_colaborador_id,
          tipo_sinistro_id: s.tipo_sinistro_id,
          tipo_sinistro: s.tipos_sinistro,
          acao: s.acao,
          descricao: s.descricao,
          fotos: s.sinistro_fotos || [],
          created_at: s.created_at,
          registrado_por: s.registrado_por,
          instrutor: s.registrado_por ? instrutoresMap[s.registrado_por] : undefined
        };
        if (!sinistrosAgrupados[s.turma_colaborador_id]) {
          sinistrosAgrupados[s.turma_colaborador_id] = [];
        }
        sinistrosAgrupados[s.turma_colaborador_id].push(sinistro);
      });

      setSinistrosColaboradores(sinistrosAgrupados);
    } catch (error: any) {
      console.error('Erro ao buscar sinistros:', error);
    } finally {
      setLoadingSinistros(false);
    }
  };

  const handleOpenSinistroDialog = () => {
    setSinistroColaboradorId('');
    setSinistroTipoId('');
    setSinistroAcao('reprovacao');
    setSinistroDescricao('');
    setSinistroFotos([]);
    setSinistroDialogOpen(true);
  };

  const handleAddSinistroFoto = (file: File) => {
    if (sinistroFotos.length >= 3) {
      toast.error('Máximo de 3 fotos permitidas');
      return;
    }

    const preview = URL.createObjectURL(file);
    setSinistroFotos(prev => [...prev, {
      file,
      preview,
      descricao: '',
      data_captura: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    }]);
  };

  const handleRemoveSinistroFoto = (index: number) => {
    setSinistroFotos(prev => {
      const newFotos = [...prev];
      if (newFotos[index].preview.startsWith('blob:')) {
        URL.revokeObjectURL(newFotos[index].preview);
      }
      newFotos.splice(index, 1);
      return newFotos;
    });
  };

  const handleSaveSinistro = async () => {
    if (!turmaId || !sinistroColaboradorId || !sinistroTipoId) {
      toast.error('Selecione o colaborador e o tipo de sinistro');
      return;
    }

    setSavingSinistro(true);
    try {
      // Inserir sinistro
      const { data: sinistroData, error: sinistroError } = await (supabase as any)
        .from('sinistros_colaborador')
        .insert({
          turma_colaborador_id: sinistroColaboradorId,
          turma_id: turmaId,
          tipo_sinistro_id: sinistroTipoId,
          acao: sinistroAcao,
          descricao: sinistroDescricao || null,
          registrado_por: profile?.id
        })
        .select()
        .single();

      if (sinistroError) throw sinistroError;

      // Upload das fotos
      for (let i = 0; i < sinistroFotos.length; i++) {
        const foto = sinistroFotos[i];
        if (foto.file) {
          const fileName = `${sinistroData.id}/${Date.now()}_${i}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('sinistro-fotos')
            .upload(fileName, foto.file, { contentType: 'image/jpeg' });

          if (uploadError) {
            console.error('Erro ao fazer upload da foto:', uploadError);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('sinistro-fotos')
            .getPublicUrl(fileName);

          // Inserir registro da foto
          await (supabase as any)
            .from('sinistro_fotos')
            .insert({
              sinistro_id: sinistroData.id,
              foto_url: urlData.publicUrl,
              descricao: foto.descricao || null,
              data_captura: foto.data_captura ? new Date(foto.data_captura).toISOString() : new Date().toISOString(),
              ordem: i
            });
        }
      }

      // Atualizar resultado do colaborador para reprovado
      const { error: updateError } = await (supabase as any)
        .from('turma_colaboradores')
        .update({ resultado: 'reprovado' })
        .eq('id', sinistroColaboradorId);

      if (updateError) throw updateError;

      // Atualizar estado local
      setColaboradoresTurma(prev => prev.map(c => 
        c.id === sinistroColaboradorId ? { ...c, resultado: 'reprovado' } : c
      ));

      toast.success('Sinistro registrado com sucesso');
      
      // Registrar auditoria de sinistro
      const colab = colaboradoresTurma.find(c => c.id === sinistroColaboradorId);
      const tipoSinistroNome = tiposSinistro.find(t => t.id === sinistroTipoId)?.nome || 'Não especificado';
      if (turma && turmaId && colab) {
        auditoria.registrarAuditoria({
          turmaId,
          turmaCodigo: turma.codigo_turma,
          acao: 'criou',
          entidade: 'sinistro',
          descricao: `Sinistro registrado: ${tipoSinistroNome}. Colaborador ${colab.nome} (CPF: ${colab.cpf}) reprovado automaticamente. Ação: ${sinistroAcao === 'reprovacao' ? 'Reprovação' : sinistroAcao}. ${sinistroDescricao ? `Descrição: ${sinistroDescricao}` : ''}`.trim(),
          colaboradorId: colab.colaborador_id,
          colaboradorNome: colab.nome,
          colaboradorCpf: colab.cpf,
          clienteId: turma.cliente_id,
          clienteNome: turma.cliente_nome,
          treinamentoId: turma.treinamento_id,
          treinamentoNome: turma.treinamento_nome,
          treinamentoNorma: turma.treinamento_norma,
          valorNovo: `Sinistro: ${tipoSinistroNome}`
        });
      }
      
      setSinistroDialogOpen(false);
      fetchSinistros();
    } catch (error: any) {
      console.error('Erro ao salvar sinistro:', error);
      toast.error('Erro ao registrar sinistro');
    } finally {
      setSavingSinistro(false);
    }
  };

  // Verificar se colaborador tem sinistro
  const colaboradorTemSinistro = (colaboradorTurmaId: string) => {
    return (sinistrosColaboradores[colaboradorTurmaId] || []).length > 0;
  };

  // Calcular resultado considerando sinistros
  const calcularResultadoComSinistro = (colaborador: ColaboradorTurma) => {
    const temSinistro = colaboradorTemSinistro(colaborador.id);
    const notaPos = colaborador.nota_pos_teste;

    if (temSinistro) {
      return 'reprovado'; // Sempre reprovado se tiver sinistro
    }

    if (notaPos === null) {
      return 'aguardando';
    }

    return notaPos >= 7 ? 'aprovado' : 'reprovado';
  };

  // Função para gerar lista de presença como imagem profissional
  const handleGerarListaPresenca = async () => {
    if (!turmaId || !turma) {
      toast.error('Não foi possível gerar a lista de presença');
      return;
    }

    setGerandoListaPresenca(true);
    try {
      // Criar elemento HTML temporário com tabela profissional
      const container = document.createElement('div');
      container.style.cssText = 'position: absolute; left: -9999px; top: 0; background: white; padding: 32px; width: 1200px; font-family: system-ui, -apple-system, sans-serif;';
      
      // Calcular resultado baseado na nota pós-teste e sinistros
      const calcularResultadoLocal = (colab: ColaboradorTurma) => {
        const temSinistro = (sinistrosColaboradores[colab.id] || []).length > 0;
        
        // Se tem sinistro, está reprovado por sinistro
        if (temSinistro) {
          return 'Reprovado (Sinistro)';
        }
        
        if (colab.nota_pos_teste === null) return 'Aguardando';
        return colab.nota_pos_teste >= 7 ? 'Aprovado' : 'Reprovado';
      };

      // Gerar colunas de datas para assinatura
      const colunasData = datasAulas.map(data => 
        `<th style="padding: 10px 6px; text-align: center; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; font-size: 11px; background: #f8fafc;">
          ${format(parseISO(data), 'dd/MM')}
        </th>`
      ).join('');

      // Gerar linhas de colaboradores
      const linhasColaboradores = colaboradoresTurma.map((colab, idx) => {
        // Células de assinatura com borda
        const presencasCells = datasAulas.map(data => {
          const temAssinatura = colab.assinaturas[data];
          return `<td style="padding: 4px; text-align: center; border: 1px solid #e5e7eb; vertical-align: middle;">
            <div style="width: 80px; height: 40px; border: 1px solid ${temAssinatura ? '#86efac' : '#e2e8f0'}; border-radius: 4px; background: ${temAssinatura ? '#f0fdf4' : '#fafafa'}; display: flex; align-items: center; justify-content: center; margin: 0 auto; overflow: hidden;">
              ${temAssinatura ? `<img src="${temAssinatura}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />` : ''}
            </div>
          </td>`;
        }).join('');

        const notaPre = colab.nota_pre_teste !== null ? Math.floor(colab.nota_pre_teste) : '-';
        const notaPos = colab.nota_pos_teste !== null ? Math.floor(colab.nota_pos_teste) : '-';
        const resultado = calcularResultadoLocal(colab);
        const reorientacao = colab.reorientado ? 'Sim' : 'Não';

        // Determinar texto e cor do resultado
        const resultadoTexto = resultado;
        const resultadoCor = resultado === 'Aprovado' ? '#16a34a' 
          : resultado.includes('Reprovado') ? '#dc2626' 
          : '#64748b';

        return `<tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
          <td style="padding: 8px; text-align: center; font-weight: 500; color: #64748b; border: 1px solid #e5e7eb;">${idx + 1}</td>
          <td style="padding: 8px 12px; font-weight: 500; color: #1e293b; border: 1px solid #e5e7eb;">${colab.nome}</td>
          <td style="padding: 8px; font-family: monospace; font-size: 11px; color: #475569; border: 1px solid #e5e7eb;">${formatCPF(colab.cpf)}</td>
          ${presencasCells}
          <td style="padding: 8px; text-align: center; font-weight: 600; border: 1px solid #e5e7eb; color: ${typeof notaPre === 'number' && notaPre >= 7 ? '#16a34a' : typeof notaPre === 'number' ? '#dc2626' : '#94a3b8'};">${notaPre}</td>
          <td style="padding: 8px; text-align: center; font-weight: 600; border: 1px solid #e5e7eb; color: ${typeof notaPos === 'number' && notaPos >= 7 ? '#16a34a' : typeof notaPos === 'number' ? '#dc2626' : '#94a3b8'};">${notaPos}</td>
          <td style="padding: 8px; text-align: center; font-weight: 500; border: 1px solid #e5e7eb; color: ${resultadoCor};">${resultadoTexto}</td>
          <td style="padding: 8px; text-align: center; font-weight: 500; border: 1px solid #e5e7eb; color: ${colab.reorientado ? '#16a34a' : '#64748b'};">${reorientacao}</td>
        </tr>`;
      }).join('');

      container.innerHTML = `
        <div style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
          <h1 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #1e293b;">Lista de Presença</h1>
          <div style="font-size: 12px; color: #64748b; line-height: 1.6;">
            <div><strong>Turma:</strong> ${turma.codigo_turma || `T${turma.numero_turma}`}</div>
            <div><strong>Treinamento:</strong> ${turma.treinamento_nome}</div>
            <div><strong>Empresa:</strong> ${turma.cliente_nome}</div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
          <thead>
            <tr>
              <th style="padding: 10px 6px; text-align: center; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; background: #f8fafc; width: 30px;">#</th>
              <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; background: #f8fafc; min-width: 160px;">Nome</th>
              <th style="padding: 10px 6px; text-align: center; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; background: #f8fafc; width: 100px;">CPF</th>
              ${colunasData}
              <th style="padding: 10px 6px; text-align: center; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; background: #f8fafc; width: 40px;">Pré</th>
              <th style="padding: 10px 6px; text-align: center; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; background: #f8fafc; width: 40px;">Pós</th>
              <th style="padding: 10px 6px; text-align: center; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; background: #f8fafc; width: 80px;">Resultado</th>
              <th style="padding: 10px 6px; text-align: center; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; background: #f8fafc; width: 60px;">Reorient.</th>
            </tr>
          </thead>
          <tbody>
            ${linhasColaboradores}
          </tbody>
        </table>
        <div style="margin-top: 12px; font-size: 10px; color: #94a3b8; text-align: right;">
          Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | Total: ${colaboradoresTurma.length} colaboradores
        </div>
      `;

      document.body.appendChild(container);

      // Capturar como canvas
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });

      document.body.removeChild(container);

      // Converter canvas para blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao converter canvas para blob'));
        }, 'image/png', 0.95);
      });

      // Fazer upload para o Supabase Storage
      const fileName = `lista_presenca_${turmaId}_${Date.now()}.png`;
      const filePath = `anexos/${turmaId}/lista_presenca/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('treinamentos')
        .upload(filePath, blob, {
          contentType: 'image/png'
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('treinamentos')
        .getPublicUrl(filePath);

      const nomeAnexo = `Lista de Presença - ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`;

      // Verificar se já existe uma lista de presença e deletar
      if (anexosListaPresenca.length > 0) {
        for (const anexoExistente of anexosListaPresenca) {
          // Deletar do storage
          if (anexoExistente.url) {
            const pathMatch = anexoExistente.url.match(/treinamentos\/(.+)$/);
            if (pathMatch) {
              await supabase.storage.from('treinamentos').remove([pathMatch[1]]);
            }
          }
          // Deletar do banco
          await (supabase as any).from('turma_anexos').delete().eq('id', anexoExistente.id);
        }
      }

      // Salvar no banco de dados
      const { data: anexoData, error: dbError } = await (supabase as any)
        .from('turma_anexos')
        .insert({
          turma_id: turmaId,
          tipo: 'lista_presenca',
          nome: nomeAnexo,
          url: urlData.publicUrl,
          file_path: filePath
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Substituir no estado (sobrescrever)
      const novoAnexo: AnexoItem = {
        id: anexoData.id,
        url: anexoData.url,
        nome: anexoData.nome,
        tipo: 'lista_presenca',
        created_at: anexoData.created_at
      };

      setAnexosListaPresenca([novoAnexo]);
      toast.success('Lista de presença gerada com sucesso!');
      
      // Registrar auditoria da geração de lista de presença
      if (turma) {
        auditoria.auditarListaPresenca(
          turmaId,
          turma.codigo_turma,
          'gerou',
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          `${colaboradoresTurma.length} colaborador(es)`
        );
      }
    } catch (error: any) {
      console.error('Erro ao gerar lista de presença:', error);
      toast.error('Erro ao gerar lista de presença');
    } finally {
      setGerandoListaPresenca(false);
    }
  };

  const handleOpenSignatureDialog = (colaboradorTurmaId: string, colaboradorId: string, colaboradorNome: string, dataAula: string, presenteAtual: boolean) => {
    // Verificar se reconhecimento facial está ativo para esta empresa cliente
    if (reconhecimentoFacialAtivo) {
      // Fluxo unificado: Abre direto a validação facial
      // Após validação facial aprovada, coleta assinatura
      // Presença só é salva após ambas etapas
      handleOpenFacialDialog(colaboradorTurmaId, colaboradorId, colaboradorNome, dataAula);
    } else {
      // Sem reconhecimento facial: apenas abre dialog de assinatura simples
      handleOpenSimpleSignatureDialog(colaboradorTurmaId, colaboradorId, colaboradorNome, dataAula);
    }
  };

  // Dialog de assinatura simples (sem reconhecimento facial)
  const [simpleSignatureDialogOpen, setSimpleSignatureDialogOpen] = useState(false);
  const [selectedColaboradorSimple, setSelectedColaboradorSimple] = useState<{
    colaboradorTurmaId: string;
    colaboradorId: string;
    colaboradorNome: string;
    dataAula: string;
  } | null>(null);
  const [simpleSignature, setSimpleSignature] = useState<string | null>(null);
  const [savingSimplePresenca, setSavingSimplePresenca] = useState(false);

  const handleOpenSimpleSignatureDialog = (colaboradorTurmaId: string, colaboradorId: string, colaboradorNome: string, dataAula: string) => {
    setSelectedColaboradorSimple({
      colaboradorTurmaId,
      colaboradorId,
      colaboradorNome,
      dataAula
    });
    setSimpleSignature(null);
    setSimpleSignatureDialogOpen(true);
  };

  const handleSaveSimplePresenca = async (signatureData?: string) => {
    const signature = signatureData || simpleSignature;
    if (!selectedColaboradorSimple || !signature) {
      toast.error('Por favor, assine para confirmar a presença');
      return;
    }

    setSavingSimplePresenca(true);
    try {
      const db = supabase as any;
      
      // Verificar se já existe registro de presença para esta data
      const { data: existingPresenca } = await db
        .from('turma_colaborador_presencas')
        .select('id')
        .eq('colaborador_turma_id', selectedColaboradorSimple.colaboradorTurmaId)
        .eq('data_aula', selectedColaboradorSimple.dataAula)
        .maybeSingle();

      if (existingPresenca) {
        // Atualizar
        const { error } = await db
          .from('turma_colaborador_presencas')
          .update({
            presente: true,
            assinatura: signature,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPresenca.id);
        if (error) throw error;
      } else {
        // Inserir
        const { error } = await db
          .from('turma_colaborador_presencas')
          .insert({
            colaborador_turma_id: selectedColaboradorSimple.colaboradorTurmaId,
            data_aula: selectedColaboradorSimple.dataAula,
            presente: true,
            assinatura: signature
          });
        if (error) throw error;
      }

      // Atualizar estado local
      setColaboradoresTurma(prev => prev.map(c => {
        if (c.id === selectedColaboradorSimple.colaboradorTurmaId) {
          return {
            ...c,
            presencas: { ...c.presencas, [selectedColaboradorSimple.dataAula]: true },
            assinaturas: { ...c.assinaturas, [selectedColaboradorSimple.dataAula]: signature }
          };
        }
        return c;
      }));

      toast.success('Presença registrada com sucesso!');
      
      // Registrar auditoria de presença com assinatura
      if (turma && selectedColaboradorSimple) {
        const colab = colaboradoresTurma.find(c => c.id === selectedColaboradorSimple.colaboradorTurmaId);
        if (colab) {
          auditoria.auditarPresenca(
            turmaId!,
            turma.codigo_turma,
            'criou',
            { id: colab.colaborador_id, nome: colab.nome, cpf: colab.cpf },
            { id: turma.cliente_id, nome: turma.cliente_nome },
            { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
            'assinatura',
            selectedColaboradorSimple.dataAula,
            'Assinatura coletada pelo sistema',
            turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
            'usuario'
          );
        }
      }
      
      setSimpleSignatureDialogOpen(false);
      setSelectedColaboradorSimple(null);
      setSimpleSignature(null);
    } catch (error: any) {
      console.error('Erro ao salvar presença:', error);
      toast.error('Erro ao salvar presença');
    } finally {
      setSavingSimplePresenca(false);
    }
  };

  // Função para abrir detalhes da validação facial
  const handleOpenFacialDetail = (
    colaborador: ColaboradorTurma, 
    dataAula: string, 
    fotoValidacao: ColaboradorTurma['fotoValidacoes'][string]
  ) => {
    if (!fotoValidacao || !turma) return;
    
    setSelectedFacialDetail({
      colaboradorNome: colaborador.nome,
      colaboradorCpf: colaborador.cpf,
      fotoOriginal: colaborador.foto_url,
      fotoValidacao: fotoValidacao.foto_validacao,
      assinatura: colaborador.assinaturas[dataAula] || null,
      treinamentoNome: turma.treinamento_nome,
      treinamentoNorma: turma.treinamento_norma,
      dataValidacao: dataAula,
      horaValidacao: fotoValidacao.hora_validacao || '',
      deviceName: fotoValidacao.dispositivo_captura,
      latitude: fotoValidacao.latitude_captura,
      longitude: fotoValidacao.longitude_captura,
      locationName: fotoValidacao.local_captura,
      similaridade: fotoValidacao.similaridade_facial
    });
    setFacialDetailDialogOpen(true);
  };

  // Funções para validação facial
  const handleOpenFacialDialog = async (colaboradorTurmaId: string, colaboradorId: string, colaboradorNome: string, dataAula: string) => {
    // Reset states
    setFacialLogs([]);
    setFacialStep('camera');
    setCapturedPhoto(null);
    setFacialSimilarity(0);
    
    // Buscar foto do colaborador
    const { data: colaboradorData } = await (supabase as any)
      .from('colaboradores')
      .select('foto_url')
      .eq('id', colaboradorId)
      .single();

    setSelectedColaboradorFacial({
      colaboradorTurmaId,
      colaboradorId,
      colaboradorNome,
      dataAula,
      fotoColaborador: colaboradorData?.foto_url || null
    });
    setFacialDialogOpen(true);
    
    // Iniciar câmera automaticamente após abrir dialog
    setTimeout(() => startCamera(), 200);
  };

  const startCamera = async () => {
    try {
      addFacialLog('Solicitando acesso à câmera...', 'info');
      
      // Solicitar localização em paralelo
      addFacialLog('Solicitando localização...', 'info');
      let latitude: number | null = null;
      let longitude: number | null = null;
      let locationName: string | null = null;
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        addFacialLog(`Localização obtida: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 'success');
        
        // Tentar obter nome da localização via reverse geocoding
        try {
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`
          );
          const geoData = await geoResponse.json();
          locationName = geoData.display_name?.split(',').slice(0, 3).join(',') || null;
          if (locationName) {
            addFacialLog(`Local: ${locationName}`, 'info');
          }
        } catch (e) {
          console.log('Não foi possível obter nome da localização');
        }
      } catch (geoError) {
        addFacialLog('Localização não disponível', 'warning');
      }
      
      // Obter stream da câmera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      streamRef.current = stream;
      
      // Obter nome do dispositivo de câmera
      const videoTrack = stream.getVideoTracks()[0];
      const deviceName = videoTrack?.label || 'Câmera desconhecida';
      addFacialLog(`Dispositivo: ${deviceName}`, 'info');
      
      // Salvar metadata
      setCaptureMetadata({
        deviceName,
        latitude,
        longitude,
        locationName,
        captureTime: new Date().toISOString()
      });
      
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().catch(console.error);
        };
      }
      setCapturingPhoto(true);
      setFacialStep('camera');
      addFacialLog('Câmera iniciada com sucesso', 'success');
      addFacialLog('Posicione o rosto e clique em Capturar', 'info');
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      addFacialLog('Erro ao acessar câmera. Verifique as permissões.', 'error');
      toast.error('Não foi possível acessar a câmera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCapturingPhoto(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    addFacialLog('Capturando imagem...', 'info');
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const photoData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoData);
      stopCamera();
      setFacialStep('captured');
      addFacialLog('Foto capturada - verifique e confirme', 'success');
    }
  };

  // Função para iniciar validação após confirmação
  const iniciarValidacao = async () => {
    if (!capturedPhoto) return;
    await processarValidacaoFacial(capturedPhoto);
  };

  // Função separada para processar validação facial
  const processarValidacaoFacial = async (photoData: string) => {
    if (!selectedColaboradorFacial) return;

    // Verificar se tem foto cadastrada
    if (!selectedColaboradorFacial.fotoColaborador) {
      addFacialLog('Colaborador não possui foto cadastrada', 'error');
      setFacialStep('failed');
      return;
    }

    setFacialStep('processing');
    addFacialLog('Iniciando autenticação facial...', 'info');

    try {
      // Usar o novo serviço de reconhecimento facial com face-api.js
      const result = await faceApiService.compareFaces(
        selectedColaboradorFacial.fotoColaborador,
        photoData,
        (logs) => {
          setFacialLogs(logs.map(log => ({
            time: log.time,
            message: log.message,
            type: log.type
          })));
        }
      );

      setFacialSimilarity(result.similarity);

      if (result.matched) {
        addFacialLog('=== AUTENTICAÇÃO REALIZADA COM SUCESSO ===', 'success');
        addFacialLog(`Similaridade: ${(result.similarity * 100).toFixed(1)}%`, 'success');
        setFacialStep('authenticated');
      } else {
        addFacialLog('=== AUTENTICAÇÃO FALHOU ===', 'error');
        addFacialLog(`Similaridade: ${(result.similarity * 100).toFixed(1)}% (distância: ${result.distance.toFixed(3)})`, 'error');
        if (result.error) {
          addFacialLog(result.error, 'warning');
        }
        setFacialStep('failed');
      }
    } catch (error: any) {
      console.error('Erro na validação facial:', error);
      addFacialLog(`Erro: ${error.message || 'Falha no processamento'}`, 'error');
      setFacialStep('failed');
    }
  };

  // Função para upload de nova foto do colaborador
  const handleUploadNewColaboradorPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedColaboradorFacial) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    setUploadingNewPhoto(true);
    addFacialLog('Processando nova foto do colaborador...', 'info');

    try {
      // Comprimir imagem
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > 400) {
              height = (height * 400) / width;
              width = 400;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas error')); return; }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Blob error'));
            }, 'image/jpeg', 0.8);
          };
          img.onerror = () => reject(new Error('Image load error'));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsDataURL(file);
      });

      addFacialLog('Imagem comprimida. Enviando para o servidor...', 'info');

      // Upload para storage
      const fileName = `colaboradores/${selectedColaboradorFacial.colaboradorId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('colaborador-fotos')
        .upload(fileName, compressedBlob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('colaborador-fotos')
        .getPublicUrl(fileName);

      // Atualizar colaborador no banco
      const { error: updateError } = await (supabase as any)
        .from('colaboradores')
        .update({ foto_url: urlData.publicUrl })
        .eq('id', selectedColaboradorFacial.colaboradorId);

      if (updateError) throw updateError;

      // Atualizar estado local
      setSelectedColaboradorFacial(prev => prev ? { ...prev, fotoColaborador: urlData.publicUrl } : null);
      
      addFacialLog('Foto do colaborador cadastrada com sucesso!', 'success');
      toast.success('Foto cadastrada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      addFacialLog('Erro ao cadastrar foto do colaborador', 'error');
      toast.error('Erro ao cadastrar foto');
    } finally {
      setUploadingNewPhoto(false);
      if (newPhotoInputRef.current) newPhotoInputRef.current.value = '';
    }
  };

  // Função para ir para coleta de assinatura após autenticação
  const handleGoToSignature = () => {
    addFacialLog('Colete a assinatura do colaborador', 'info');
    setFacialStep('signature');
  };

  // Função para salvar assinatura e registrar presença
  const handleSaveSignatureAndPresenca = async (signatureData: string) => {
    setCollectedSignature(signatureData);
    await handleSaveFacialPresenca(signatureData);
  };

  // Função para registrar presença após autenticação e assinatura
  const handleSaveFacialPresenca = async (signatureData?: string) => {
    if (!selectedColaboradorFacial || !capturedPhoto) return;

    setSavingFacial(true);
    setFacialStep('saving');
    addFacialLog('Registrando presença...', 'info');
    
    try {
      const { colaboradorTurmaId, dataAula } = selectedColaboradorFacial;

      addFacialLog('Enviando foto para servidor seguro...', 'info');

      // Converter base64 para blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      
      const fileSizeKB = Math.round(blob.size / 1024);
      addFacialLog(`Tamanho da imagem: ${fileSizeKB}KB`, 'info');

      // Upload da foto para o storage
      const fileName = `${turma?.id}/${colaboradorTurmaId}_${dataAula}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('presenca-fotos')
        .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) {
        addFacialLog('Erro no upload da imagem', 'error');
        throw uploadError;
      }
      
      addFacialLog('Imagem armazenada com sucesso', 'success');

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('presenca-fotos')
        .getPublicUrl(fileName);

      const fotoUrl = urlData.publicUrl;
      const horaValidacao = new Date().toISOString();

      addFacialLog('Registrando presença no banco de dados...', 'info');

      // Verificar se já existe registro de presença para este dia
      const { data: presencaExistente } = await (supabase as any)
        .from('turma_colaborador_presencas')
        .select('id')
        .eq('colaborador_turma_id', colaboradorTurmaId)
        .eq('data_aula', dataAula)
        .single();

      // Preparar dados com metadata e assinatura
      const presencaData = {
        presente: true,
        foto_validacao: fotoUrl,
        validado_facial: true,
        hora_validacao: horaValidacao,
        origem: 'facial',
        similaridade_facial: facialSimilarity,
        dispositivo_captura: captureMetadata?.deviceName || null,
        latitude_captura: captureMetadata?.latitude || null,
        longitude_captura: captureMetadata?.longitude || null,
        local_captura: captureMetadata?.locationName || null,
        assinatura: signatureData || collectedSignature || null,
        updated_at: horaValidacao
      };

      if (presencaExistente) {
        // Atualizar registro existente
        const { error } = await (supabase as any)
          .from('turma_colaborador_presencas')
          .update(presencaData)
          .eq('id', presencaExistente.id);

        if (error) throw error;
      } else {
        // Criar novo registro
        const { error } = await (supabase as any)
          .from('turma_colaborador_presencas')
          .insert({
            colaborador_turma_id: colaboradorTurmaId,
            data_aula: dataAula,
            ...presencaData
          });

        if (error) throw error;
      }
      
      addFacialLog('Presença registrada com sucesso!', 'success');

      // Atualizar estado local
      const signatureUsed = signatureData || collectedSignature || null;
      setColaboradoresTurma(prev => prev.map(c => {
        if (c.id === colaboradorTurmaId) {
          return {
            ...c,
            presencas: {
              ...c.presencas,
              [dataAula]: true
            },
            assinaturas: {
              ...c.assinaturas,
              [dataAula]: signatureUsed
            },
            fotoValidacoes: {
              ...c.fotoValidacoes,
              [dataAula]: {
                foto_validacao: fotoUrl,
                hora_validacao: horaValidacao,
                similaridade_facial: facialSimilarity,
                dispositivo_captura: captureMetadata?.deviceName || null,
                latitude_captura: captureMetadata?.latitude || null,
                longitude_captura: captureMetadata?.longitude || null,
                local_captura: captureMetadata?.locationName || null
              }
            }
          };
        }
        return c;
      }));

      setFacialStep('success');
      await new Promise(r => setTimeout(r, 1500)); // Show success state briefly
      
      setFacialDialogOpen(false);
      setSelectedColaboradorFacial(null);
      setCapturedPhoto(null);
      setCollectedSignature(null);
      setFacialLogs([]);
      setFacialStep('camera');
      setCaptureMetadata(null);
      toast.success('Presença validada via reconhecimento facial!');
      
      // Registrar auditoria de presença facial
      if (turma && selectedColaboradorFacial) {
        const colab = colaboradoresTurma.find(c => c.id === colaboradorTurmaId);
        if (colab) {
          auditoria.auditarPresenca(
            turmaId!,
            turma.codigo_turma,
            'criou',
            { id: colab.colaborador_id, nome: colab.nome, cpf: colab.cpf },
            { id: turma.cliente_id, nome: turma.cliente_nome },
            { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
            'facial',
            dataAula,
            `Similaridade: ${facialSimilarity}%. Local: ${captureMetadata?.locationName || 'N/A'}. Dispositivo: ${captureMetadata?.deviceName || 'N/A'}`,
            turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
            'usuario'
          );
        }
      }
    } catch (error: any) {
      console.error('Erro ao salvar presença facial:', error);
      addFacialLog(`Erro: ${error.message || 'Falha no processamento'}`, 'error');
      setFacialStep('error');
      toast.error('Erro ao salvar presença');
    } finally {
      setSavingFacial(false);
    }
  };

  // Cleanup da câmera ao fechar dialog
  useEffect(() => {
    if (!facialDialogOpen) {
      stopCamera();
      setCapturedPhoto(null);
    }
  }, [facialDialogOpen]);

  // Função para abrir dialog de assinatura do certificado
  const handleOpenAssinaturaCertificado = (colaborador: ColaboradorTurma) => {
    setSelectedColaboradorCertificado({
      colaboradorTurmaId: colaborador.id,
      colaboradorNome: colaborador.nome,
      assinaturaAtual: colaborador.assinatura_certificado
    });
    setAssinaturaCertificadoDialogOpen(true);
  };

  // Função para salvar assinatura do certificado
  const handleSaveAssinaturaCertificado = async (signatureData: string) => {
    if (!selectedColaboradorCertificado) return;

    setSavingAssinaturaCertificado(true);
    try {
      const { error } = await (supabase as any)
        .from('turma_colaboradores')
        .update({ assinatura_certificado: signatureData })
        .eq('id', selectedColaboradorCertificado.colaboradorTurmaId);

      if (error) throw error;

      // Atualizar estado local
      setColaboradoresTurma(prev => prev.map(c => {
        if (c.id === selectedColaboradorCertificado.colaboradorTurmaId) {
          return { ...c, assinatura_certificado: signatureData };
        }
        return c;
      }));

      setAssinaturaCertificadoDialogOpen(false);
      toast.success('Assinatura do certificado salva com sucesso!');
      
      // Registrar auditoria de assinatura de certificado
      const colab = colaboradoresTurma.find(c => c.id === selectedColaboradorCertificado.colaboradorTurmaId);
      if (turma && turmaId && colab) {
        auditoria.auditarAssinatura(
          turmaId,
          turma.codigo_turma,
          'criou',
          { id: colab.colaborador_id, nome: colab.nome, cpf: colab.cpf },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'certificado',
          'Assinatura do certificado coletada'
        );
      }
      
      setSelectedColaboradorCertificado(null);
    } catch (error: any) {
      console.error('Erro ao salvar assinatura do certificado:', error);
      toast.error('Erro ao salvar assinatura do certificado');
    } finally {
      setSavingAssinaturaCertificado(false);
    }
  };

  const handleUpdateNota = async (colaboradorTurmaId: string, tipo: 'pre' | 'pos', valor: string) => {
    const nota = valor === '' ? null : parseFloat(valor);
    
    // Validar nota (0 a 10)
    if (nota !== null && (isNaN(nota) || nota < 0 || nota > 10)) {
      return;
    }

    try {
      const updateData = tipo === 'pre' 
        ? { nota_pre_teste: nota }
        : { nota_pos_teste: nota };

      const { error } = await (supabase as any)
        .from('turma_colaboradores')
        .update(updateData)
        .eq('id', colaboradorTurmaId);

      if (error) throw error;

      // Atualizar estado local e calcular resultado
      setColaboradoresTurma(prev => prev.map(c => {
        if (c.id === colaboradorTurmaId) {
          const novaNotaPos = tipo === 'pos' ? nota : c.nota_pos_teste;
          let novoResultado = c.resultado;
          
          // NOVAS REGRAS DE NEGÓCIO:
          // - Nota = 10: Aprovado (não precisa de reorientação)
          // Regra de aprovação (apenas pós-teste):
          // - Nota 10: Aprovado direto
          // - Nota 7-9: Aguardando reorientação (aprovado após reorientação)
          // - Nota < 7: Reprovado
          if (novaNotaPos !== null) {
            if (novaNotaPos === 10) {
              novoResultado = 'aprovado';
            } else if (novaNotaPos >= 7) {
              novoResultado = c.reorientado ? 'aprovado' : 'aguardando';
            } else {
              novoResultado = 'reprovado';
            }
          }

          return {
            ...c,
            nota_pre_teste: tipo === 'pre' ? nota : c.nota_pre_teste,
            nota_pos_teste: novaNotaPos,
            resultado: novoResultado
          };
        }
        return c;
      }));

      // Atualizar resultado no banco se for pós-teste
      if (tipo === 'pos' && nota !== null) {
        const colaborador = colaboradoresTurma.find(c => c.id === colaboradorTurmaId);
        let resultado: string;
        
        if (nota === 10) {
          resultado = 'aprovado';
        } else if (nota >= 7) {
          resultado = colaborador?.reorientado ? 'aprovado' : 'aguardando';
        } else {
          resultado = 'reprovado';
        }
        
        await (supabase as any)
          .from('turma_colaboradores')
          .update({ resultado })
          .eq('id', colaboradorTurmaId);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar nota:', error);
      toast.error('Erro ao atualizar nota');
    }
  };

  // Função para verificar se colaborador pode ser reorientado
  const podeSerReorientado = (colaborador: ColaboradorTurma): boolean => {
    // Só pode ser reorientado se:
    // 1. Já fez o pós-teste (nota_pos_teste não é null)
    // 2. Nota está entre 7 e 9 (exclusive 10)
    // 3. Ainda não foi reorientado
    if (colaborador.nota_pos_teste === null) return false;
    if (colaborador.nota_pos_teste === 10) return false;
    if (colaborador.nota_pos_teste < 7) return false;
    if (colaborador.reorientado) return false;
    return true;
  };

  // Função para verificar se colaborador pode refazer a prova
  const podeRefazerProva = (colaborador: ColaboradorTurma): boolean => {
    // Só pode refazer se nota < 7
    if (colaborador.nota_pos_teste === null) return false;
    return colaborador.nota_pos_teste < 7;
  };

  // Obter datas das aulas ordenadas
  const datasAulas = turma?.aulas
    ?.map(a => a.data)
    .sort((a, b) => a.localeCompare(b)) || [];

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  // Função para exportar lista de presença para Excel
  const handleExportarListaPresenca = () => {
    if (colaboradoresTurma.length === 0) {
      toast.error('Não há colaboradores para exportar');
      return;
    }

    try {
      // Preparar dados para exportação
      const dadosExport = colaboradoresTurma.map((colaborador, index) => {
        // Calcular resultado considerando sinistros
        const calcularResultadoExport = () => {
          const temSinistro = (sinistrosColaboradores[colaborador.id] || []).length > 0;
          if (temSinistro) return 'Reprovado (Sinistro)';
          if (colaborador.nota_pos_teste === null) return 'Aguardando';
          return colaborador.nota_pos_teste >= 7 ? 'Aprovado' : 'Reprovado';
        };
        const resultado = calcularResultadoExport();

        // Criar objeto base
        const row: Record<string, string | number> = {
          '#': index + 1,
          'Nome': colaborador.nome,
          'CPF': formatCPF(colaborador.cpf),
        };

        // Adicionar coluna de presença para cada data de aula
        datasAulas.forEach(data => {
          const dataFormatada = format(parseISO(data), 'dd/MM');
          const temAssinatura = colaborador.assinaturas[data];
          row[dataFormatada] = temAssinatura ? 'Presente' : '-';
        });

        // Adicionar colunas finais
        row['Nota Pré-Teste'] = colaborador.nota_pre_teste ?? '-';
        row['Nota Pós-Teste'] = colaborador.nota_pos_teste ?? '-';
        row['Resultado'] = resultado;
        row['Reorientado'] = colaborador.reorientado ? 'Sim' : 'Não';

        return row;
      });

      // Criar workbook e worksheet
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Lista de Presença');

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 5 },   // #
        { wch: 40 },  // Nome
        { wch: 15 },  // CPF
        ...datasAulas.map(() => ({ wch: 10 })), // Colunas de datas
        { wch: 15 },  // Nota Pré-Teste
        { wch: 15 },  // Nota Pós-Teste
        { wch: 12 },  // Resultado
        { wch: 12 }   // Reorientado
      ];
      ws['!cols'] = colWidths;

      // Gerar nome do arquivo
      const codigoTurma = turma?.codigo_turma || turma?.numero_turma || id;
      const nomeArquivo = `lista_presenca_${codigoTurma}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      // Baixar arquivo
      XLSX.writeFile(wb, nomeArquivo);
      toast.success('Lista de presença exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar lista de presença');
    }
  };

  // Função para apagar presença de um colaborador em um dia específico
  const handleApagarPresencaDia = async () => {
    if (!dataPresencaApagar || !colaboradorParaRemover) return;
    
    setApagandoPresenca(true);
    try {
      // Deletar presença do colaborador no dia selecionado
      const { error } = await (supabase as any)
        .from('turma_colaborador_presencas')
        .delete()
        .eq('colaborador_turma_id', colaboradorParaRemover.id)
        .eq('data_aula', dataPresencaApagar);

      if (error) throw error;

      toast.success(`Presença de ${colaboradorParaRemover.nome} no dia ${format(parseISO(dataPresencaApagar), 'dd/MM/yyyy')} apagada com sucesso!`);
      
      // Registrar auditoria de remoção de presença
      if (turma && turmaId) {
        auditoria.auditarPresenca(
          turmaId,
          turma.codigo_turma,
          'deletou',
          { id: colaboradorParaRemover.colaborador_id, nome: colaboradorParaRemover.nome, cpf: colaboradorParaRemover.cpf },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'empresa',
          dataPresencaApagar,
          `Presença/assinatura removida do dia ${format(parseISO(dataPresencaApagar), 'dd/MM/yyyy')}`,
          turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
          'usuario'
        );
      }
      
      setApagarPresencaDialogOpen(false);
      setDataPresencaApagar(null);
      setColaboradorParaRemover(null);
      
      // Recarregar colaboradores para atualizar a lista
      fetchColaboradoresTurma();
    } catch (error) {
      console.error('Erro ao apagar presença:', error);
      toast.error('Erro ao apagar presença');
    } finally {
      setApagandoPresenca(false);
    }
  };

  // Função para remover colaborador da turma
  const handleRemoverColaboradorTurma = async () => {
    if (!colaboradorParaRemover || !turmaId) return;
    
    setRemovendoColaborador(true);
    try {
      // Primeiro, deletar presenças do colaborador
      await (supabase as any)
        .from('turma_colaborador_presencas')
        .delete()
        .eq('colaborador_turma_id', colaboradorParaRemover.id);

      // Deletar provas do colaborador
      await (supabase as any)
        .from('turma_provas')
        .delete()
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorParaRemover.colaborador_id);

      // Deletar avaliações de reação
      await (supabase as any)
        .from('avaliacoes_reacao')
        .delete()
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorParaRemover.colaborador_id);

      // Por fim, deletar o registro do colaborador na turma
      const { error } = await (supabase as any)
        .from('turma_colaboradores')
        .delete()
        .eq('id', colaboradorParaRemover.id);

      if (error) throw error;

      toast.success(`${colaboradorParaRemover.nome} removido da turma com sucesso!`);
      
      // Registrar auditoria
      if (turma) {
        auditoria.auditarColaborador(
          turmaId,
          turma.codigo_turma,
          'deletou',
          { id: colaboradorParaRemover.colaborador_id, nome: colaboradorParaRemover.nome, cpf: colaboradorParaRemover.cpf },
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          'empresa',
          'Colaborador removido da turma (presenças, provas e avaliações também removidas)',
          turma.instrutor_id ? { id: turma.instrutor_id, nome: turma.instrutor_nome || '' } : null,
          'usuario'
        );
      }
      
      setRemoverColaboradorDialogOpen(false);
      setColaboradorParaRemover(null);
      
      // Recarregar colaboradores
      fetchColaboradoresTurma();
    } catch (error) {
      console.error('Erro ao remover colaborador:', error);
      toast.error('Erro ao remover colaborador da turma');
    } finally {
      setRemovendoColaborador(false);
    }
  };

  const getResultadoBadge = (resultado: string | null) => {
    switch (resultado) {
      case 'aprovado':
        return <Badge className="bg-success/10 text-success">Aprovado</Badge>;
      case 'reprovado':
        return <Badge className="bg-destructive/10 text-destructive">Reprovado</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning">Aguardando</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendado':
        return <Badge className="bg-primary/10 text-primary">Agendado</Badge>;
      case 'em_andamento':
        return <Badge className="bg-warning/10 text-warning">Em Andamento</Badge>;
      case 'concluido':
        return <Badge className="bg-success/10 text-success">Concluído</Badge>;
      case 'cancelado':
        return <Badge className="bg-destructive/10 text-destructive">Cancelado</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
    }
  };

  // Verificar requisitos para finalizar turma
  const getFinalizacaoStatus = () => {
    // Colaboradores que devem receber certificado: aprovados SEM sinistro
    const aprovadosSemSinistro = colaboradoresTurma.filter(c => 
      c.resultado === 'aprovado' && !sinistrosColaboradores[c.id]
    );
    
    // Colaboradores com sinistro são automaticamente reprovados, não precisam de certificado
    const colaboradoresComSinistro = colaboradoresTurma.filter(c => sinistrosColaboradores[c.id]);
    
    // Para verificação de avaliação, considerar que colaboradores com sinistro já estão "avaliados" (reprovados)
    const todosAvaliados = colaboradoresTurma.length > 0 && colaboradoresTurma.every(c => 
      c.resultado === 'aprovado' || c.resultado === 'reprovado' || sinistrosColaboradores[c.id]
    );

    const requisitos = {
      todosAvaliados,
      todosComProva: colaboradoresTurma.length > 0 && colaboradoresTurma.every(c => c.nota_pos_teste !== null || sinistrosColaboradores[c.id]),
      todosComPresenca: colaboradoresTurma.length > 0 && colaboradoresTurma.every(c => {
        // Colaboradores com sinistro não precisam ter presença completa
        if (sinistrosColaboradores[c.id]) return true;
        const datasAulasArray = turma?.aulas.map(a => a.data) || [];
        return datasAulasArray.every(data => c.presencas[data] === true);
      }),
      todosAssinados: colaboradoresTurma.length > 0 && colaboradoresTurma.every(c => {
        // Colaboradores com sinistro não precisam ter assinatura completa
        if (sinistrosColaboradores[c.id]) return true;
        const datasAulasArray = turma?.aulas.map(a => a.data) || [];
        return datasAulasArray.every(data => c.assinaturas[data]);
      }),
      // Avaliação de reação obrigatória para todos (exceto sinistros)
      todosComAvaliacaoReacao: colaboradoresTurma.length > 0 && colaboradoresTurma.every(c => 
        c.avaliacao_reacao_respondida || sinistrosColaboradores[c.id]
      ),
      // Certificados só para aprovados SEM sinistro
      certificadosGerados: aprovadosSemSinistro.length === 0 || aprovadosSemSinistro.every(c => certificadosData[c.colaborador_id]?.url),
      anexosEnviados: anexosListaPresenca.length > 0,
      relatorioGerado: anexosRelatorio.length > 0
    };

    const pendencias: string[] = [];
    if (!requisitos.todosAvaliados) pendencias.push('Nem todos os colaboradores foram avaliados');
    if (!requisitos.todosComProva) pendencias.push('Nem todos os colaboradores fizeram a prova');
    if (!requisitos.todosComPresenca) pendencias.push('Nem todos os colaboradores têm presença registrada');
    if (!requisitos.todosAssinados) pendencias.push('Nem todos os colaboradores assinaram a lista de presença');
    if (!requisitos.todosComAvaliacaoReacao) pendencias.push('Nem todos os colaboradores responderam a avaliação de reação');
    if (!requisitos.certificadosGerados) pendencias.push('Certificados não foram gerados para todos os aprovados');
    if (!requisitos.anexosEnviados) pendencias.push('Lista de presença não foi anexada');
    if (!requisitos.relatorioGerado) pendencias.push('Relatório não foi gerado');

    const podeFinalizarTurma = Object.values(requisitos).every(v => v);

    return { requisitos, pendencias, podeFinalizarTurma, aprovadosSemSinistro, colaboradoresComSinistro };
  };

  const [finalizandoTurma, setFinalizandoTurma] = useState(false);
  const [finalizarTurmaDialogOpen, setFinalizarTurmaDialogOpen] = useState(false);

  const handleFinalizarTurma = async () => {
    setFinalizandoTurma(true);
    try {
      const { error } = await supabase
        .from('turmas_treinamento')
        .update({ status: 'concluido' })
        .eq('id', turmaId);

      if (error) throw error;

      setTurma(prev => prev ? { ...prev, status: 'concluido' } : null);
      setFinalizarTurmaDialogOpen(false);
      toast.success('Turma finalizada com sucesso!');
      
      // Registrar auditoria de finalização da turma
      if (turma) {
        auditoria.auditarTurma(
          turmaId!,
          turma.codigo_turma,
          'finalizou',
          { id: turma.cliente_id, nome: turma.cliente_nome },
          { id: turma.treinamento_id, nome: turma.treinamento_nome, norma: turma.treinamento_norma },
          turma.status,
          'concluido'
        );
      }
    } catch (error: any) {
      console.error('Erro ao finalizar turma:', error);
      toast.error('Erro ao finalizar turma: ' + error.message);
    } finally {
      setFinalizandoTurma(false);
    }
  };

  // Mostrar loading enquanto verifica acesso ou carrega dados
  // Se accessChecked é false, ainda está verificando acesso
  if (!accessChecked || checkingAccess || (hasAccess && loading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mostrar mensagem de acesso negado (só após verificação concluída)
  if (accessChecked && !hasAccess) {
    return <AccessDenied />;
  }

  if (!turma) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Turma não encontrada</p>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Barra de progresso flutuante para download de documentos (persiste entre abas) */}
      {downloadDocsProgress !== null && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur border-b shadow-sm px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">
                  {downloadDocsProgress < 99 ? 'Baixando certificados...' : downloadDocsProgress === 100 ? 'Download concluído!' : 'Gerando arquivo ZIP...'}
                </span>
                <span className="text-muted-foreground">{downloadDocsProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${downloadDocsProgress === 100 ? 'bg-success' : 'bg-primary'}`}
                  style={{ width: `${downloadDocsProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(isInstrutorMode ? '/instrutor' : '/sst?section=gestao-turmas', { replace: true })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-primary" />
              {turma.codigo_turma || `Turma ${turma.numero_turma}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              NR {turma.treinamento_norma} - {turma.treinamento_nome}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(turma.status)}
        </div>
      </div>

      {/* Informações Resumidas */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Empresa</p>
                <p className="text-sm font-medium">{turma.cliente_nome}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-sm font-medium">
                  {turma.data_inicio ? format(parseISO(turma.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                  {turma.data_fim && turma.data_fim !== turma.data_inicio && (
                    <span className="text-muted-foreground"> - {format(parseISO(turma.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Instrutor</p>
                <p className="text-sm font-medium">{turma.instrutor_nome || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Participantes</p>
                <p className="text-sm font-medium">{colaboradoresTurma.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        if (value !== 'ajuda') setActiveDocTitle(null);
        // Recarregar dados ao mudar de aba
        if (value === 'lista-presenca') {
          fetchColaboradoresTurma();
        } else if (value === 'provas') {
          fetchProvas();
        }
      }} className="w-full">
        <TabsList className="w-full grid grid-cols-11 h-auto p-1">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden md:inline">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="lista-presenca" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">Lista de Presença</span>
          </TabsTrigger>
          <TabsTrigger value="anexos" className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            <span className="hidden md:inline">Anexos</span>
          </TabsTrigger>
          <TabsTrigger value="provas" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden md:inline">Provas e Sinistros</span>
          </TabsTrigger>
          <TabsTrigger value="avaliacao-reacao" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden md:inline">Avaliação de Reação</span>
          </TabsTrigger>
          {/* Ocultar abas Certificados e Relatório para instrutores */}
          {profile?.role !== 'instrutor' && (
            <>
              <TabsTrigger value="certificados" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span className="hidden md:inline">Certificados</span>
              </TabsTrigger>
              <TabsTrigger value="relatorio" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden md:inline">Relatório</span>
              </TabsTrigger>
            </>
          )}
          {/* Aba Categorização Técnica - apenas para empresa_sst */}
          {(profile?.role === 'empresa_sst' || profile?.role === 'admin_vertical') && (
            <TabsTrigger value="categorizacao-tecnica" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden md:inline">Cat. Técnica</span>
            </TabsTrigger>
          )}
          {/* Aba Auditoria - apenas para empresa_sst e admin_vertical */}
          {(profile?.role === 'empresa_sst' || profile?.role === 'admin_vertical') && (
            <TabsTrigger value="auditoria" className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span className="hidden md:inline">Auditoria</span>
            </TabsTrigger>
          )}
          {/* Aba TI - APENAS para jhony@vtreinamentos.com.br */}
          {user?.email === 'jhony@vtreinamentos.com.br' && (
            <TabsTrigger value="ti" className="flex items-center gap-2 text-orange-600 data-[state=active]:text-orange-700">
              <Wrench className="h-4 w-4" />
              <span className="hidden md:inline">TI</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="ajuda" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden md:inline">Ajuda</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba Geral */}
        <TabsContent value="geral" className="mt-6">
          {/* Detail View: Treinamento */}
          {treinamentoDetalhes && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setTreinamentoDetalhes(null)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Informações sobre o Treinamento
                    </CardTitle>
                    <CardDescription>Dados completos da norma e do treinamento</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Norma Regulamentadora</p>
                      <p className="text-lg font-bold text-primary">NR {treinamentoDetalhes.norma}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Nome do Treinamento</p>
                      <p className="font-semibold text-base">{treinamentoDetalhes.nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Validade</p>
                      <p className="font-medium">{treinamentoDetalhes.validade}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Carga Horária - Formação</p>
                      <p className="font-medium">
                        {treinamentoDetalhes.ch_formacao}h
                        {treinamentoDetalhes.ch_formacao_obrigatoria && (
                          <span className="ml-2 text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">Obrigatória</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Carga Horária - Reciclagem</p>
                      <p className="font-medium">
                        {treinamentoDetalhes.ch_reciclagem}h
                        {treinamentoDetalhes.ch_reciclagem_obrigatoria && (
                          <span className="ml-2 text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">Obrigatória</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {treinamentoDetalhes.observacoes && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Observações do Treinamento</p>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                      {renderObservacoesComLinks(treinamentoDetalhes.observacoes)}
                    </div>
                  </div>
                )}

                {treinamentoDetalhes.conteudo_programatico && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Conteúdo Programático</p>
                    <div className="space-y-4">
                      {(() => {
                        try {
                          const parsed = JSON.parse(treinamentoDetalhes.conteudo_programatico);
                          if (Array.isArray(parsed)) {
                            return parsed.map((secao: any, idx: number) => (
                              <div key={idx} className="bg-muted/50 rounded-lg p-4">
                                {secao.titulo && (
                                  <p className="font-semibold text-sm text-foreground mb-2">{secao.titulo.trim()}</p>
                                )}
                                {secao.itens && (
                                  <ul className="space-y-1.5">
                                    {secao.itens.split(/;|\\n/).filter((item: string) => item.trim()).map((item: string, i: number) => (
                                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <span className="text-primary mt-1">•</span>
                                        <span>{item.trim()}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ));
                          }
                          return <div className="bg-muted/50 rounded-lg p-4 text-sm">{treinamentoDetalhes.conteudo_programatico}</div>;
                        } catch {
                          // Plain text fallback — split by ; or newlines
                          const items = treinamentoDetalhes.conteudo_programatico!.split(/;|\n/).filter((s: string) => s.trim());
                          if (items.length > 1) {
                            return (
                              <div className="bg-muted/50 rounded-lg p-4">
                                <ul className="space-y-1.5">
                                  {items.map((item: string, i: number) => (
                                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <span className="text-primary mt-1">•</span>
                                      <span>{item.trim()}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }
                          return <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">{treinamentoDetalhes.conteudo_programatico}</div>;
                        }
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detail View: Instrutor */}
          {instrutorDetalhes && !treinamentoDetalhes && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setInstrutorDetalhes(null)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Informações do Instrutor
                    </CardTitle>
                    <CardDescription>Dados, formações e documentos do instrutor</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Nome</p>
                      <p className="text-lg font-bold">{instrutorDetalhes.nome}</p>
                    </div>
                    {instrutorDetalhes.cpf_cnpj && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">CPF/CNPJ</p>
                        <p className="font-medium">{(() => {
                          const v = instrutorDetalhes.cpf_cnpj!.replace(/\D/g, '');
                          if (v.length === 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                          if (v.length === 14) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                          return instrutorDetalhes.cpf_cnpj;
                        })()}</p>
                      </div>
                    )}
                    {instrutorDetalhes.formacao_academica && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Formação Acadêmica</p>
                        <p className="font-medium">{instrutorDetalhes.formacao_academica}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {instrutorDetalhes.email && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">E-mail</p>
                        <p className="font-medium">{instrutorDetalhes.email}</p>
                      </div>
                    )}
                    {instrutorDetalhes.telefone && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Telefone</p>
                        <p className="font-medium">{(() => {
                          const v = instrutorDetalhes.telefone!.replace(/\D/g, '');
                          if (v.length === 11) return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                          if (v.length === 10) return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                          return instrutorDetalhes.telefone;
                        })()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Formação vinculada ao treinamento */}
                {turma.instrutor_formacao && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Formação Vinculada ao Treinamento</p>
                    <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-lg p-3">
                      <GraduationCap className="h-5 w-5 text-success" />
                      <p className="font-semibold text-success">{turma.instrutor_formacao}</p>
                    </div>
                  </div>
                )}

                {/* Formações do instrutor */}
                {instrutorDetalhes.formacoes.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Formações</p>
                    <div className="space-y-3">
                      {instrutorDetalhes.formacoes.map((formacao) => (
                        <div key={formacao.id} className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{formacao.nome}</p>
                            {formacao.registro_tipo && (
                              <p className="text-xs text-muted-foreground">
                                {formacao.registro_tipo} {formacao.registro_numero && `nº ${formacao.registro_numero}`} {formacao.registro_estado && `- ${formacao.registro_estado}`}
                              </p>
                            )}
                          </div>
                          {formacao.anexo_url && (
                            <a href={formacao.anexo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-md px-3 py-1.5 text-xs text-primary hover:bg-primary/20 transition-colors font-medium">
                              <Eye className="h-3.5 w-3.5" />
                              Visualizar Anexo
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certificados de formação */}
                {instrutorDetalhes.formacao_certificados.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Certificados de Formação</p>
                    <div className="space-y-3">
                      {instrutorDetalhes.formacao_certificados.map((cert) => (
                        <div key={cert.id} className="bg-muted/50 rounded-lg p-3">
                          <p className="font-medium text-sm">{cert.formacao_nome}</p>
                          {cert.registro_tipo && (
                            <p className="text-xs text-muted-foreground">
                              {cert.registro_tipo} {cert.registro_numero && `nº ${cert.registro_numero}`} {cert.registro_estado && `- ${cert.registro_estado}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documento do treinamento */}
                {instrutorDetalhes.treinamento_documento_url && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Anexo do Treinamento</p>
                    <a
                      href={instrutorDetalhes.treinamento_documento_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5 text-sm text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      Visualizar Documento do Treinamento
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Loading state */}
          {loadingDetalhes && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Carregando detalhes...</p>
              </CardContent>
            </Card>
          )}

          {/* Normal Geral view */}
          {!treinamentoDetalhes && !instrutorDetalhes && !loadingDetalhes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
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
                    <p className="text-sm text-muted-foreground">Código da Turma</p>
                    <p className="font-medium">{turma.codigo_turma || `Turma ${turma.numero_turma}`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Treinamento</p>
                    <button
                      onClick={() => { fetchTreinamentoDetalhes(); }}
                      className="font-medium text-primary hover:underline cursor-pointer text-left inline-flex items-center gap-1.5 group"
                    >
                      NR {turma.treinamento_norma} - {turma.treinamento_nome}
                      <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Treinamento</p>
                    <p className="font-medium">{turma.tipo_treinamento}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Empresa/Cliente</p>
                    <p className="font-medium">{turma.cliente_nome}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Instrutor</p>
                    {turma.instrutor_id ? (
                      <button
                        onClick={() => { fetchInstrutorDetalhes(); }}
                        className="font-medium text-primary hover:underline cursor-pointer text-left inline-flex items-center gap-1.5 group"
                      >
                        {turma.instrutor_nome || 'Não definido'}
                        <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ) : (
                      <p className="font-medium">{turma.instrutor_nome || 'Não definido'}</p>
                    )}
                  </div>
                  {turma.instrutor_formacao && (
                    <div>
                      <p className="text-sm text-muted-foreground">Formação do Instrutor</p>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-success" />
                        <p className="font-medium text-success">{turma.instrutor_formacao}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Quantidade de Participantes</p>
                    <p className="font-medium">{colaboradoresTurma.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(turma.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aulas Programadas</p>
                    <div className="mt-2 space-y-1">
                      {turma.aulas.length > 0 ? (
                        turma.aulas.map((aula, index) => (
                          <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                            {format(parseISO(aula.data), 'dd/MM/yyyy', { locale: ptBR })} - {aula.hora_inicio} às {aula.hora_fim}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma aula programada</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão Baixar Documentos Validados */}
              {(certificadosValidados.length > 0 || anexosRelatorio.length > 0 || anexosRelatorioPresencas.length > 0 || anexosRelatorioSinistros.length > 0 || anexosListaPresenca.length > 0 || anexosGaleria.length > 0) && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Baixar Documentos Validados</h3>
                      <p className="text-sm text-muted-foreground">
                        {[
                          certificadosValidados.length > 0 && `${certificadosValidados.length} certificado(s)`,
                          anexosRelatorio.length > 0 && 'relatório',
                          anexosRelatorioPresencas.length > 0 && 'relatório de presenças',
                          anexosRelatorioSinistros.length > 0 && 'relatório de sinistros',
                          anexosListaPresenca.length > 0 && `${anexosListaPresenca.length} lista(s) de presença`,
                          anexosGaleria.length > 0 && `${anexosGaleria.length} foto(s)`,
                        ].filter(Boolean).join(', ')} — download em ZIP
                      </p>
                    </div>
                    <Button
                      onClick={handleBaixarDocumentosValidados}
                      disabled={downloadDocsProgress !== null}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {downloadDocsProgress !== null ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {downloadDocsProgress}%
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar Documentos
                        </>
                      )}
                    </Button>
                  </div>
                  {downloadDocsProgress !== null && (
                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${downloadDocsProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {downloadDocsProgress < 99 ? 'Baixando certificados...' : downloadDocsProgress === 100 ? 'Concluído!' : 'Gerando arquivo ZIP...'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Botão Finalizar Turma - Apenas empresa_sst e admin_vertical podem finalizar */}
              {!isReadOnly && turma.status !== 'concluido' && !isInstrutorMode && (profile?.role === 'empresa_sst' || profile?.role === 'admin_vertical') && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Finalizar Turma</h3>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const { podeFinalizarTurma, pendencias } = getFinalizacaoStatus();
                          if (podeFinalizarTurma) {
                            return 'Todos os requisitos foram atendidos. A turma pode ser finalizada.';
                          }
                          return `Pendências: ${pendencias.length} item(ns) pendente(s)`;
                        })()}
                      </p>
                    </div>
                    <Button
                      onClick={() => setFinalizarTurmaDialogOpen(true)}
                      disabled={!getFinalizacaoStatus().podeFinalizarTurma}
                      className={getFinalizacaoStatus().podeFinalizarTurma 
                        ? "bg-success hover:bg-success/90" 
                        : "bg-muted cursor-not-allowed"
                      }
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Finalizar Turma
                    </Button>
                  </div>
                  
                  {/* Lista de pendências */}
                  {!getFinalizacaoStatus().podeFinalizarTurma && (
                    <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                      <h4 className="text-sm font-medium text-warning mb-2">Pendências para finalização:</h4>
                      <ul className="text-sm text-warning space-y-1">
                        {getFinalizacaoStatus().pendencias.map((pendencia, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-warning" />
                            {pendencia}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Turma já finalizada */}
              {turma.status === 'concluido' && (
                <div className="mt-6 pt-6 border-t">
                  <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-success" />
                    <div>
                      <h3 className="font-medium text-success">Turma Finalizada</h3>
                      <p className="text-sm text-success/80">Esta turma foi concluída com sucesso.</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Aba Lista de Presença */}
        <TabsContent value="lista-presenca" className="mt-6 space-y-4">
          {/* Header com ações */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-success" />
                Lista de Presença
              </h2>
              <p className="text-sm text-muted-foreground">
                {colaboradoresTurma.length} colaborador{colaboradoresTurma.length !== 1 ? 'es' : ''} na turma
              </p>
            </div>
            <div className="flex items-center gap-2">
              {colaboradoresTurma.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={handleExportarListaPresenca}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              )}
              {!isReadOnly && (
                <>
                  <Button 
                    variant="outline" 
                    className="border-success text-success hover:bg-success/5"
                    onClick={() => {
                      generateQRCodePresenca();
                      setPresencaDialogOpen(true);
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Marcar Presença
                  </Button>
                  <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </>
              )}
            </div>
          </div>

          {loadingColaboradores ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : colaboradoresTurma.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-4" />
                <p>Nenhum colaborador na turma</p>
                <p className="text-sm">Clique em "Adicionar" para incluir participantes</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Tabela de Lista de Presença */}
              <Card className="border-border">
                <div ref={listaPresencaRef} className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold text-foreground w-[40px]">#</TableHead>
                        <TableHead className="font-semibold text-foreground w-[200px]">Nome</TableHead>
                        <TableHead className="font-semibold text-foreground w-[130px]">CPF</TableHead>
                        {datasAulas.map((data) => (
                          <TableHead key={data} className="font-semibold text-foreground text-center w-[100px]">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs">{format(parseISO(data), 'dd/MM')}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">Assinatura</span>
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="font-semibold text-foreground text-center w-[60px]">Pré</TableHead>
                        <TableHead className="font-semibold text-foreground text-center w-[60px]">Pós</TableHead>
                        <TableHead className="font-semibold text-foreground text-center w-[100px]">Resultado</TableHead>
                        <TableHead className="font-semibold text-foreground text-center w-[80px]">Reorient.</TableHead>
                        {!isReadOnly && (
                          <TableHead className="font-semibold text-foreground text-center w-[60px]">Ações</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {colaboradoresTurma.map((colaborador, index) => {
                        const calcularResultado = () => {
                          if (colaborador.nota_pos_teste === null) return 'aguardando';
                          return colaborador.nota_pos_teste >= 7 ? 'aprovado' : 'reprovado';
                        };
                        const resultadoCalculado = colaborador.resultado || calcularResultado();
                        
                        return (
                          <TableRow key={colaborador.id} className="hover:bg-muted/50/50">
                            <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                            <TableCell>
                              <span className="font-medium text-foreground">{colaborador.nome}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground font-mono text-sm">
                              {formatCPF(colaborador.cpf)}
                            </TableCell>
                            {datasAulas.map((data) => {
                              const isHoje = data === format(new Date(), 'yyyy-MM-dd');
                              const presente = colaborador.presencas[data];
                              const temAssinatura = colaborador.assinaturas[data];
                              const fotoValidacao = colaborador.fotoValidacoes?.[data];
                              const temFotoValidacao = fotoValidacao?.foto_validacao;
                              const fotoColaborador = colaborador.foto_url;
                              const temPresencaCompleta = temFotoValidacao && temAssinatura;
                              
                              return (
                                <TableCell key={data} className="text-center p-2">
                                  {temPresencaCompleta ? (
                                    /* Miniatura com 3 imagens: foto cadastrada + foto validação + assinatura */
                                    <div
                                      className="group relative w-24 h-14 rounded-lg border-2 border-success/50 bg-gradient-to-r from-success/5 to-success/10 flex items-center justify-center overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:border-success transition-all"
                                      onClick={() => handleOpenFacialDetail(colaborador, data, fotoValidacao)}
                                      title="Ver detalhes da validação"
                                    >
                                      <div className="flex items-center gap-0.5 p-1">
                                        {/* Foto cadastrada */}
                                        <div className="w-7 h-10 rounded overflow-hidden border border-border bg-white flex-shrink-0">
                                          {fotoColaborador ? (
                                            <img src={fotoColaborador} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                              <Users className="w-3 h-3 text-muted-foreground/50" />
                                            </div>
                                          )}
                                        </div>
                                        {/* Foto validação */}
                                        <div className="w-7 h-10 rounded overflow-hidden border border-primary/20 bg-white flex-shrink-0">
                                          <img src={fotoValidacao.foto_validacao!} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        {/* Assinatura */}
                                        <div className="w-8 h-10 rounded overflow-hidden border border-success/20 bg-white flex-shrink-0">
                                          <img src={temAssinatura!} alt="" className="w-full h-full object-contain" />
                                        </div>
                                      </div>
                                      {/* Badge de check */}
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center shadow">
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      </div>
                                    </div>
                                  ) : temFotoValidacao ? (
                                    /* Apenas foto de validação */
                                    <div
                                      className="w-20 h-12 rounded-md border-2 border-primary/30 bg-primary/5 flex items-center justify-center overflow-hidden cursor-pointer"
                                      onClick={() => handleOpenFacialDetail(colaborador, data, fotoValidacao)}
                                      title="Ver detalhes da validação facial"
                                    >
                                      <img 
                                        src={fotoValidacao.foto_validacao!} 
                                        alt="" 
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : temAssinatura ? (
                                    /* Apenas assinatura */
                                    <div
                                      className="w-20 h-12 rounded-md border-2 border-success/30 bg-success/5 flex items-center justify-center overflow-hidden cursor-pointer"
                                      onClick={() => setAssinaturaExpandida(colaborador.assinaturas[data])}
                                      title="Ver comprovante de presença"
                                    >
                                      <img 
                                        src={colaborador.assinaturas[data]!} 
                                        alt="" 
                                        className="w-full h-full object-contain p-1"
                                      />
                                    </div>
                                  ) : presente && !isReadOnly ? (
                                    /* Presença registrada sem assinatura - permitir coletar */
                                    <div className="flex justify-center">
                                      <button
                                        onClick={() => handleOpenSignatureDialog(colaborador.id, colaborador.colaborador_id, colaborador.nome, data, false)}
                                        className="w-20 h-12 rounded-md border-2 border-dashed border-success/50 bg-success/5 hover:border-success hover:bg-success/10 flex items-center justify-center gap-1 transition-all"
                                        title="Coletar assinatura"
                                      >
                                        <PenTool className="w-4 h-4 text-success" />
                                        <span className="text-[10px] text-success font-medium">Assinar</span>
                                      </button>
                                    </div>
                                  ) : presente ? (
                                    /* Presença registrada sem assinatura - modo leitura */
                                    <div className="w-20 h-12 rounded-md border-2 border-success/50 bg-success/10 flex items-center justify-center">
                                      <Check className="w-5 h-5 text-success" />
                                    </div>
                                  ) : isReadOnly ? (
                                    /* Modo somente leitura sem presença */
                                    <div className="w-20 h-12 rounded-md border-2 border-border bg-muted/50 flex items-center justify-center">
                                      <span className="text-xs text-muted-foreground">-</span>
                                    </div>
                                  ) : (
                                    /* Botão para marcar presença */
                                    <div className="flex justify-center">
                                      <button
                                        onClick={() => handleOpenSignatureDialog(colaborador.id, colaborador.colaborador_id, colaborador.nome, data, presente || false)}
                                        className="w-20 h-12 rounded-md border-2 border-dashed border-warning/50 bg-warning/5 hover:border-warning hover:bg-warning/10 flex items-center justify-center gap-1 transition-all"
                                        title="Marcar presença com assinatura"
                                      >
                                        <PenTool className="w-4 h-4 text-warning" />
                                        <span className="text-[10px] text-warning font-medium">Assinar</span>
                                      </button>
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">
                              <span className={`font-semibold ${
                                colaborador.nota_pre_teste !== null 
                                  ? colaborador.nota_pre_teste >= 7 ? 'text-success' : 'text-destructive'
                                  : 'text-muted-foreground'
                              }`}>
                                {colaborador.nota_pre_teste !== null ? Math.floor(colaborador.nota_pre_teste) : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-semibold ${
                                colaborador.nota_pos_teste !== null 
                                  ? colaborador.nota_pos_teste >= 7 ? 'text-success' : 'text-destructive'
                                  : 'text-muted-foreground'
                              }`}>
                                {colaborador.nota_pos_teste !== null ? Math.floor(colaborador.nota_pos_teste) : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant="outline"
                                className={`text-xs font-medium ${
                                  resultadoCalculado === 'aprovado' 
                                    ? 'bg-success/5 text-success border-success/20' 
                                    : resultadoCalculado === 'reprovado'
                                      ? 'bg-destructive/5 text-destructive border-destructive/20'
                                      : 'bg-muted/50 text-muted-foreground border-border'
                                }`}
                              >
                                {resultadoCalculado === 'aprovado' ? 'Aprovado' : resultadoCalculado === 'reprovado' ? 'Reprovado' : 'Aguardando'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {colaborador.reorientado ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 px-2 text-xs text-success hover:text-success"
                                  onClick={() => {
                                    setSelectedColaboradorReorientacao(colaborador);
                                    setReorientacaoViewOpen(true);
                                  }}
                                  title="Ver reorientação"
                                >
                                  Sim
                                </Button>
                              ) : colaborador.nota_pos_teste === 10 ? (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              ) : podeSerReorientado(colaborador) ? (
                                isReadOnly ? (
                                  <span className="text-xs text-warning">Pendente</span>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-7 px-2 text-xs bg-warning/10 hover:bg-warning/20 text-warning"
                                    onClick={() => handleOpenReorientacaoInstrutor(colaborador)}
                                    title="Registrar reorientação"
                                  >
                                    Pendente
                                  </Button>
                                )
                              ) : podeRefazerProva(colaborador) ? (
                                <span className="text-xs text-destructive">Refazer</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            {!isReadOnly && (
                              <TableCell className="text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                    >
                                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleOpenEditColaborador(colaborador)}>
                                      <PenTool className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setColaboradorParaRemover(colaborador);
                                        setApagarPresencaDialogOpen(true);
                                      }}
                                    >
                                      <CalendarX className="h-4 w-4 mr-2" />
                                      Apagar Presença
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setColaboradorParaRemover(colaborador);
                                        setRemoverColaboradorDialogOpen(true);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <UserMinus className="h-4 w-4 mr-2" />
                                      Remover da Turma
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Legenda e Botão */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t">
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-success flex items-center justify-center">
                      <CheckSquare className="w-3 h-3 text-white" />
                    </div>
                    <span>Presente</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-warning/10 border-2 border-warning flex items-center justify-center">
                      <PenTool className="w-2.5 h-2.5 text-warning" />
                    </div>
                    <span>Marcar hoje</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-muted border border-border flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                    </div>
                    <span>Ausente</span>
                  </div>
                  <span className="text-muted-foreground/30">|</span>
                  <span>Média aprovação: <strong className="text-foreground">7.0</strong></span>
                </div>
                    {!isReadOnly && (() => {
                      // Colaboradores com sinistro não precisam cumprir requisitos
                      const colaboradoresSemSinistro = colaboradoresTurma.filter(c => 
                        !(sinistrosColaboradores[c.id] && sinistrosColaboradores[c.id].length > 0)
                      );
                      
                      // Verificar se todos os colaboradores (sem sinistro) têm presença registrada em todas as datas
                      const todosComPresenca = colaboradoresSemSinistro.length === 0 || (
                        datasAulas.length > 0 &&
                        colaboradoresSemSinistro.every(colaborador => 
                          datasAulas.every(data => {
                            const temAssinatura = colaborador.assinaturas[data];
                            const temFotoValidacao = colaborador.fotoValidacoes?.[data]?.foto_validacao;
                            return temAssinatura || temFotoValidacao;
                          })
                        )
                      );
                      
                      // Verificar se todos (sem sinistro) fizeram pré-teste
                      const todosFizeramPreTeste = colaboradoresSemSinistro.length === 0 ||
                        colaboradoresSemSinistro.every(c => c.nota_pre_teste !== null);
                      
                      // Verificar se todos (sem sinistro) fizeram pós-teste
                      const todosFizeramPosTeste = colaboradoresSemSinistro.length === 0 ||
                        colaboradoresSemSinistro.every(c => c.nota_pos_teste !== null);
                      
                      // Verificar se todos que precisam de reorientação foram reorientados (exceto sinistros)
                      const colaboradoresQuePrecisamReorientacao = colaboradoresSemSinistro.filter(c => 
                        c.nota_pos_teste !== null && c.nota_pos_teste < 7
                      );
                      const todosReorientados = colaboradoresQuePrecisamReorientacao.length === 0 ||
                        colaboradoresQuePrecisamReorientacao.every(c => c.reorientado);
                      
                      // Coletar pendências
                      const pendencias: string[] = [];
                      if (!todosComPresenca) pendencias.push('Todos devem registrar presença (assinatura + validação facial)');
                      if (!todosFizeramPreTeste) pendencias.push('Todos devem fazer o pré-teste');
                      if (!todosFizeramPosTeste) pendencias.push('Todos devem fazer o pós-teste');
                      if (!todosReorientados) pendencias.push('Colaboradores reprovados devem ser reorientados');
                      
                      if (pendencias.length > 0) {
                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-warning text-sm font-medium">
                              <AlertCircle className="w-4 h-4" />
                              <span>Pendências para gerar lista:</span>
                            </div>
                            <ul className="text-xs text-warning ml-6 list-disc">
                              {pendencias.map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="flex items-center gap-3">
                          {anexosListaPresenca.length > 0 && (
                            <Badge variant="secondary" className="bg-success/10 text-success">
                              <CheckSquare className="w-4 h-4 mr-1" />
                              Lista já gerada
                            </Badge>
                          )}
                          <Button 
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleGerarListaPresenca}
                            disabled={gerandoListaPresenca}
                          >
                            {gerandoListaPresenca ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Gerando...
                              </>
                            ) : anexosListaPresenca.length > 0 ? (
                              'Gerar novamente'
                            ) : (
                              'Gerar lista de presença'
                            )}
                          </Button>
                        </div>
                      );
                    })()}
              </div>
            </>
          )}
        </TabsContent>

        {/* Aba Anexos */}
        <TabsContent value="anexos" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-primary" />
                Anexos do Treinamento
              </CardTitle>
              <CardDescription>
                Gerencie a lista de presença, galeria de fotos e cases de sucesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            {/* Lista de presença */}
            <details className="group border rounded-lg" open>
              <summary className="flex items-center justify-between cursor-pointer p-4 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Lista de Presença</span>
                  {anexosListaPresenca.length > 0 && (
                    <Badge variant="secondary" className="bg-success/10 text-success text-xs">Salva</Badge>
                  )}
                </div>
              </summary>
              <div className="p-4 pt-0 border-t">
                {anexosListaPresenca.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p>Nenhuma lista de presença gerada ainda.</p>
                    <p className="text-xs text-muted-foreground mt-1">Gere a lista de presença na aba "Lista de Presença" quando todos os colaboradores tiverem registrado presença.</p>
                  </div>
                ) : (
                  <div className="flex gap-4 flex-wrap items-start">
                    {anexosListaPresenca.map((anexo) => (
                      <div key={anexo.id} className="relative">
                        <div className="relative w-48 h-32 bg-muted rounded-lg overflow-hidden border shadow-sm">
                          <ImageWithFallback 
                            src={anexo.url} 
                            alt={anexo.nome} 
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => {
                              setImagemExpandida(anexo.url);
                              setImagemExpandidaNome(anexo.nome);
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          {format(new Date(anexo.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>

            {/* Galeria */}
            <details className="group border rounded-lg">
              <summary className="flex items-center justify-between cursor-pointer p-4 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <Paperclip className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Galeria de Fotos</span>
                  <span className="text-xs text-muted-foreground">({anexosGaleria.length}/{MAX_GALERIA_FOTOS})</span>
                </div>
                {!isReadOnly && (anexosGaleria.length < MAX_GALERIA_FOTOS ? (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      setCompromissoAceito(false);
                      setCompromissoDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Foto
                  </Button>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium h-9 rounded-md px-3 bg-muted text-muted-foreground text-xs cursor-not-allowed">
                    Limite atingido ({MAX_GALERIA_FOTOS}/{MAX_GALERIA_FOTOS})
                  </span>
                ))}
              </summary>
              <div className="p-4 pt-0 border-t">
                {anexosGaleria.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    <Paperclip className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p>Nenhuma foto na galeria.</p>
                    <p className="text-xs text-muted-foreground mt-1">Adicione fotos do treinamento com descrição.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {anexosGaleria.map((anexo) => (
                      <div key={anexo.id} className="relative group/card">
                        <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border shadow-sm">
                          <div className="absolute top-1 right-1 flex items-center gap-1 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            {/* Botão para converter HEIC para JPEG */}
                            {!isReadOnly && (anexo.url.toLowerCase().includes('.heic') || anexo.url.toLowerCase().includes('.heif')) && (
                              <button
                                onClick={() => handleConverterHeicParaJpeg(anexo)}
                                className="bg-orange-500 rounded-full p-1 cursor-pointer hover:bg-orange-600"
                                title="Converter HEIC para JPEG"
                                disabled={convertendoHeicId === anexo.id}
                              >
                                {convertendoHeicId === anexo.id ? (
                                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                                ) : (
                                  <Camera className="w-3 h-3 text-white" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadAnexo(anexo.url, anexo.descricao || anexo.nome)}
                              className="bg-white rounded-full p-1 cursor-pointer hover:bg-primary/10"
                              title="Baixar"
                            >
                              <Download className="w-3 h-3 text-primary" />
                            </button>
                            {!isReadOnly && (
                              <button
                                onClick={() => handleConfirmDeleteAnexo(anexo, 'galeria')}
                                className="bg-white rounded-full p-1 cursor-pointer hover:bg-destructive/10"
                                title="Excluir"
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </button>
                            )}
                          </div>
                          <ImageWithFallback 
                            src={anexo.url} 
                            alt={anexo.descricao || anexo.nome} 
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => {
                              setImagemExpandida(anexo.url);
                              setImagemExpandidaNome(anexo.descricao || anexo.nome);
                            }}
                          />
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-foreground line-clamp-2">{anexo.descricao || anexo.nome}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {anexo.data_foto ? format(parseISO(anexo.data_foto), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                            </p>
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  setEditarFotoAnexo(anexo);
                                  setEditarFotoNovaData(anexo.data_foto || format(new Date(), 'yyyy-MM-dd'));
                                  setEditarFotoNovaDescricao(anexo.descricao || anexo.nome || '');
                                  setEditarFotoDialogOpen(true);
                                }}
                                className="text-xs text-primary hover:underline"
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>

            {/* Cases de sucesso */}
            <details className="group border rounded-lg">
              <summary className="flex items-center justify-between cursor-pointer p-4 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <Star className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium text-foreground">Cases de Sucesso</span>
                  <span className="text-xs text-muted-foreground">({casesSucessoIds.length}/5)</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Selecione das avaliações
                </Badge>
              </summary>
              <div className="p-4 pt-0 border-t">
                {loadingCases ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : avaliacoesReacao.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p>Nenhuma avaliação com comentário encontrada.</p>
                    <p className="text-xs text-muted-foreground mt-1">Os colaboradores precisam responder a avaliação de reação com comentários.</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      Selecione até 5 avaliações para destacar como cases de sucesso do treinamento:
                    </p>
                    {avaliacoesReacao.map((avaliacao) => (
                      <div 
                        key={avaliacao.id} 
                        className={`p-4 rounded-lg border transition-all ${
                          isReadOnly ? '' : 'cursor-pointer hover:shadow-md'
                        } ${
                          avaliacao.is_case_sucesso 
                            ? 'border-warning bg-warning/10 shadow-sm' 
                            : isReadOnly ? 'border-border' : 'border-border hover:border-warning/50 hover:bg-warning/5'
                        }`}
                        onClick={isReadOnly ? undefined : () => handleToggleCaseSucesso(avaliacao.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox visual */}
                          {!isReadOnly && (
                            <div className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                              avaliacao.is_case_sucesso 
                                ? 'bg-warning border-warning' 
                                : 'border-border hover:border-warning'
                            }`}>
                              {avaliacao.is_case_sucesso && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                          )}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            avaliacao.is_case_sucesso 
                              ? 'bg-warning text-white' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {avaliacao.colaborador_nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-foreground">{avaliacao.colaborador_nome}</p>
                              {avaliacao.is_case_sucesso && (
                                <Badge className="bg-warning text-warning-foreground text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Case de Sucesso
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{avaliacao.sugestoes_comentarios}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Provas e Sinistros */}
        <TabsContent value="provas" className="mt-6">
          {/* Sub-abas internas */}
          <div className="mb-6">
            <div className="flex border-b">
              <button
                onClick={() => setSubAbaProvasSinistros('provas')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  subAbaProvasSinistros === 'provas'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <ClipboardList className="h-4 w-4 inline-block mr-2" />
                Provas
              </button>
              <button
                onClick={() => setSubAbaProvasSinistros('sinistros')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  subAbaProvasSinistros === 'sinistros'
                    ? 'border-destructive text-destructive'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <AlertTriangle className="h-4 w-4 inline-block mr-2" />
                Sinistros
                {Object.keys(sinistrosColaboradores).length > 0 && (
                  <Badge className="ml-2 bg-destructive/10 text-destructive border-destructive/30">
                    {Object.values(sinistrosColaboradores).flat().length}
                  </Badge>
                )}
              </button>
            </div>
          </div>

          {/* Conteúdo da sub-aba Provas */}
          {subAbaProvasSinistros === 'provas' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* QR Code */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <QrCode className="h-5 w-5 text-primary" />
                    QR Code da Prova
                  </CardTitle>
                  <CardDescription>
                    Escaneie para realizar a prova
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-lg border shadow-sm mb-4">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCodeProvaUrl)}`}
                      alt="QR Code para prova"
                      className="w-44 h-44"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mb-2">
                    Os colaboradores podem escanear este QR Code para realizar o Pré-Teste ou Pós-Teste
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(qrCodeProvaUrl, '_blank')}
                  >
                    Abrir Link da Prova
                  </Button>
                </CardContent>
              </Card>

              {/* Tabela de Resultados */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        Resultados das Provas
                      </CardTitle>
                      <CardDescription>
                        Pré-Teste e Pós-Teste realizados
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isReadOnly && (
                        <>
                          <Button variant="default" size="sm" onClick={handleOpenRegistrarProva}>
                            <Plus className="h-4 w-4 mr-2" />
                            Registrar Prova
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleOpenGabarito}>
                            <FileCheck className="h-4 w-4 mr-2" />
                            Gabarito
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm" onClick={fetchProvas}>
                        <Loader2 className={`h-4 w-4 mr-2 ${loadingProvas ? 'animate-spin' : ''}`} />
                        Atualizar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Barra de busca e filtros */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou CPF..."
                        value={provaSearchTerm}
                        onChange={(e) => setProvaSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                    <Select value={provaFilterTipo} onValueChange={(v: any) => setProvaFilterTipo(v)}>
                      <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pre_teste">Pré-Teste</SelectItem>
                        <SelectItem value="pos_teste">Pós-Teste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {loadingProvas ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : provasFiltradas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mb-3 opacity-50" />
                      <p>{provas.length === 0 ? 'Nenhuma prova realizada ainda' : 'Nenhuma prova encontrada com os filtros'}</p>
                      <p className="text-sm">Os colaboradores podem escanear o QR Code para realizar as provas</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Colaborador</TableHead>
                            <TableHead>CPF</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-center">Nota</TableHead>
                            <TableHead className="text-center">Acertos</TableHead>
                            <TableHead>Origem</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {provasFiltradas.map((prova) => (
                            <TableRow key={prova.id}>
                              <TableCell className="font-medium">
                                {prova.colaborador?.nome || '-'}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm font-mono">
                                {prova.colaborador?.cpf ? formatCPF(prova.colaborador.cpf) : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={prova.tipo_prova === 'pre_teste' ? 'outline' : 'default'}>
                                  {prova.tipo_prova === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`font-semibold ${
                                  prova.acertos >= 7 ? 'text-success' : 'text-destructive'
                                }`}>
                                  {prova.acertos}
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground">
                                {prova.acertos}/{prova.total_questoes}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  prova.origem === 'instrutor' 
                                    ? 'bg-primary/10 text-primary border-primary/20' 
                                    : 'bg-muted/50 text-foreground border-border'
                                }>
                                  {prova.origem === 'instrutor' ? 'Instrutor' : 'QR Code'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {format(parseISO(prova.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => handleViewProva(prova)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Visualizar
                                  </Button>
                                  {!isReadOnly && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleOpenApagarProva(prova)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Apagar
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Conteúdo da sub-aba Sinistros */}
          {subAbaProvasSinistros === 'sinistros' && (
            <div className="space-y-6">
              {/* Card de Registro e Listagem de Sinistros */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Sinistros Registrados
                      </CardTitle>
                      <CardDescription>
                        Ocorrências que resultaram em reprovação de colaboradores
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isReadOnly && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={handleOpenSinistroDialog}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Registrar Sinistro
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchSinistros}
                        disabled={loadingSinistros}
                      >
                        <Loader2 className={`h-4 w-4 mr-2 ${loadingSinistros ? 'animate-spin' : ''}`} />
                        Atualizar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSinistros ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : Object.keys(sinistrosColaboradores).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">Nenhum sinistro registrado</p>
                      <p className="text-sm">Sinistros são ocorrências que resultam em reprovação automática do colaborador</p>
                      {!isReadOnly && (
                        <Button 
                          variant="outline" 
                          className="mt-4 border-destructive/30 text-destructive hover:bg-destructive/5"
                          onClick={handleOpenSinistroDialog}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Registrar Primeiro Sinistro
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-destructive/5">
                            <TableHead>Colaborador</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Registrado por</TableHead>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(sinistrosColaboradores).flatMap(([colaboradorTurmaId, sinistros]) => {
                            const colaborador = colaboradoresTurma.find(c => c.id === colaboradorTurmaId);
                            if (!colaborador) return [];
                            
                            return sinistros.map((sinistro) => (
                              <TableRow key={sinistro.id} className="hover:bg-destructive/5">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center text-white font-semibold text-xs">
                                      {colaborador.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-medium text-destructive">{colaborador.nome}</p>
                                      <p className="text-xs text-destructive/70">{formatCPF(colaborador.cpf)}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                                    {sinistro.tipo_sinistro?.nome || 'Sinistro'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {sinistro.instrutor?.nome || 'Não identificado'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {format(parseISO(sinistro.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive/30 text-destructive hover:bg-destructive/5"
                                    onClick={() => {
                                      setSelectedSinistroDetalhe({
                                        sinistro,
                                        colaborador,
                                        instrutor: sinistro.instrutor
                                      });
                                      setSinistroDetalheDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Detalhes
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ));
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Aba Avaliação de Reação */}
        <TabsContent value="avaliacao-reacao" className="mt-6">
          <div className="space-y-6">
            {/* Resultados Consolidados com Gráficos e Cards */}
            {turma && (
              <AvaliacaoReacaoResultados
                turmaId={turma.id}
                treinamentoId={turma.treinamento_id}
                totalColaboradores={colaboradoresTurma.filter(c => c.nota_pos_teste !== null && c.nota_pos_teste >= 7).length}
                colaboradores={colaboradoresTurma.map(c => ({
                  id: c.id,
                  nome: c.nome,
                  nota_pre_teste: c.nota_pre_teste,
                  nota_pos_teste: c.nota_pos_teste,
                  reorientado: c.reorientado
                }))}
                onRefresh={fetchColaboradoresTurma}
                onLoadingChange={setAvaliacaoReacaoLoading}
              />
            )}

            {/* Tabela de Colaboradores para Registrar Avaliações - só exibe quando gráficos carregaram */}
            {!avaliacaoReacaoLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Colaboradores - Registrar Avaliação
                </CardTitle>
                <CardDescription>
                  Registre a avaliação de reação dos participantes que ainda não responderam
                </CardDescription>
              </CardHeader>
              <CardContent>
                {colaboradoresTurma.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Star className="h-12 w-12 mb-4" />
                    <p>Nenhum colaborador na turma</p>
                    <p className="text-sm">Adicione colaboradores para registrar avaliações de reação</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Colaborador</TableHead>
                          <TableHead className="text-center">Pré-Teste</TableHead>
                          <TableHead className="text-center">Pós-Teste</TableHead>
                          <TableHead className="text-center">Reorientado</TableHead>
                          <TableHead className="text-center">Avaliação</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {colaboradoresTurma
                          .filter(c => c.nota_pos_teste !== null && c.nota_pos_teste >= 7)
                          .map((colaborador) => (
                          <TableRow key={colaborador.id}>
                            <TableCell className="font-medium">
                              {colaborador.nome}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold text-muted-foreground">
                                {colaborador.nota_pre_teste ?? '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-semibold ${
                                (colaborador.nota_pos_teste || 0) >= 7 ? 'text-success' : 'text-destructive'
                              }`}>
                                {colaborador.nota_pos_teste || '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {colaborador.nota_pos_teste === 10 ? (
                                <Badge variant="outline" className="bg-success/5 text-success border-success/20">
                                  N/A
                                </Badge>
                              ) : colaborador.reorientado ? (
                                <Badge variant="outline" className="bg-success/5 text-success border-success/20">
                                  Sim
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {colaborador.avaliacao_reacao_respondida ? (
                                <Badge variant="outline" className="bg-success/5 text-success border-success/20">
                                  Respondida
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!colaborador.avaliacao_reacao_respondida && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedColaboradorAvaliacao(colaborador);
                                    setAvaliacaoReacaoDialogOpen(true);
                                  }}
                                  disabled={
                                    colaborador.nota_pos_teste !== 10 && !colaborador.reorientado
                                  }
                                  title={
                                    colaborador.nota_pos_teste !== 10 && !colaborador.reorientado
                                      ? 'Colaborador precisa fazer reorientação primeiro'
                                      : 'Registrar avaliação de reação'
                                  }
                                >
                                  <Star className="h-4 w-4 mr-1" />
                                  Avaliar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {colaboradoresTurma.filter(c => c.nota_pos_teste !== null && c.nota_pos_teste >= 7).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Star className="h-10 w-10 mb-3 opacity-50" />
                        <p>Nenhum colaborador aprovado no pós-teste ainda</p>
                        <p className="text-sm">Colaboradores com nota ≥ 7 aparecerão aqui</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        </TabsContent>

        {/* Aba Certificados */}
        <TabsContent value="certificados" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-warning" />
                      Certificados dos Colaboradores
                    </CardTitle>
                    <CardDescription>
                      Visualize e baixe os certificados dos colaboradores aprovados (nota pós-teste ≥ 7)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {downloadCertSelecionados.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBaixarCertificadosLote}
                        disabled={downloadingCerts}
                        className="border-success text-success hover:bg-success/5"
                      >
                        {downloadingCerts ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Baixar {downloadCertSelecionados.length} selecionado(s)
                      </Button>
                    )}
                    {!isReadOnly && !isInstrutorMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenValidacaoDigital}
                        className="border-primary text-primary hover:bg-primary/5"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Validação Digital
                      </Button>
                    )}
                    {!isReadOnly && colaboradoresTurma.filter(c => c.nota_pos_teste !== null && c.nota_pos_teste >= 7).length > 0 && (
                      <Button
                        className={certificadosValidados.length > 0 
                          ? "bg-warning hover:bg-warning/90 text-warning-foreground"
                          : "bg-success hover:bg-success/90 text-white"
                        }
                        onClick={() => setValidacaoDialogOpen(true)}
                      >
                        <ListChecks className="h-4 w-4 mr-2" />
                        {certificadosValidados.length > 0 ? 'Revalidar Certificados' : 'Validar os Certificados'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {colaboradoresTurma.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Award className="h-12 w-12 mb-4" />
                    <p>Nenhum colaborador na turma</p>
                    <p className="text-sm">Adicione colaboradores para gerar certificados</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10">
                            <Checkbox
                              checked={
                                colaboradoresTurma.filter(c => 
                                  !colaboradorTemSinistro(c.id) &&
                                  c.nota_pos_teste !== null && c.nota_pos_teste >= 7 &&
                                  certificadosValidados.includes(c.colaborador_id) &&
                                  certificadosData[c.colaborador_id]?.url
                                ).length > 0 &&
                                colaboradoresTurma.filter(c => 
                                  !colaboradorTemSinistro(c.id) &&
                                  c.nota_pos_teste !== null && c.nota_pos_teste >= 7 &&
                                  certificadosValidados.includes(c.colaborador_id) &&
                                  certificadosData[c.colaborador_id]?.url
                                ).every(c => downloadCertSelecionados.includes(c.colaborador_id))
                              }
                              onCheckedChange={(checked) => {
                                const validados = colaboradoresTurma.filter(c => 
                                  !colaboradorTemSinistro(c.id) &&
                                  c.nota_pos_teste !== null && c.nota_pos_teste >= 7 &&
                                  certificadosValidados.includes(c.colaborador_id) &&
                                  certificadosData[c.colaborador_id]?.url
                                ).map(c => c.colaborador_id);
                                setDownloadCertSelecionados(checked ? validados : []);
                              }}
                            />
                          </TableHead>
                          <TableHead>Colaborador</TableHead>
                          <TableHead className="text-center">Pré-Teste</TableHead>
                          <TableHead className="text-center">Pós-Teste</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Assinatura</TableHead>
                          <TableHead className="text-center">Validado</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {colaboradoresTurma.map((colaborador) => {
                          const temSinistro = colaboradorTemSinistro(colaborador.id);
                          const aprovado = !temSinistro && colaborador.nota_pos_teste !== null && colaborador.nota_pos_teste >= 7;
                          const jaValidado = certificadosValidados.includes(colaborador.colaborador_id);
                          const temCertPDF = jaValidado && certificadosData[colaborador.colaborador_id]?.url;
                          return (
                            <TableRow key={colaborador.id}>
                              <TableCell>
                                <Checkbox
                                  checked={downloadCertSelecionados.includes(colaborador.colaborador_id)}
                                  disabled={!temCertPDF}
                                  onCheckedChange={(checked) => {
                                    setDownloadCertSelecionados(prev => 
                                      checked 
                                        ? [...prev, colaborador.colaborador_id]
                                        : prev.filter(id => id !== colaborador.colaborador_id)
                                    );
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs ${
                                    temSinistro 
                                      ? 'bg-gradient-to-br from-destructive to-destructive/80' 
                                      : 'bg-gradient-to-br from-warning to-warning/80'
                                  }`}>
                                    {colaborador.nome.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium flex items-center gap-2">
                                      {colaborador.nome}
                                      {temSinistro && (
                                        <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20 text-xs">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Sinistro
                                        </Badge>
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{formatCPF(colaborador.cpf)}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`font-semibold ${
                                  colaborador.nota_pre_teste !== null 
                                    ? colaborador.nota_pre_teste >= 7 ? 'text-success' : 'text-muted-foreground'
                                    : 'text-muted-foreground'
                                }`}>
                                  {colaborador.nota_pre_teste !== null ? Math.floor(colaborador.nota_pre_teste) : '-'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`font-semibold ${
                                  colaborador.nota_pos_teste !== null 
                                    ? colaborador.nota_pos_teste >= 7 ? 'text-success' : 'text-destructive'
                                    : 'text-muted-foreground'
                                }`}>
                                  {colaborador.nota_pos_teste !== null ? Math.floor(colaborador.nota_pos_teste) : '-'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {temSinistro ? (
                                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Reprovado (Sinistro)
                                  </Badge>
                                ) : aprovado ? (
                                  <Badge className="bg-success/10 text-success border-success/20">
                                    Aprovado
                                  </Badge>
                                ) : colaborador.nota_pos_teste !== null ? (
                                  <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20">
                                    Reprovado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
                                    Aguardando
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {aprovado ? (
                                  colaborador.assinatura_certificado ? (
                                    isReadOnly ? (
                                      <span className="text-xs text-success flex items-center justify-center gap-1">
                                        <Check className="h-3 w-3" />
                                        Assinado
                                      </span>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-success hover:text-success hover:bg-success/5"
                                        onClick={() => handleOpenAssinaturaCertificado(colaborador)}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Assinado
                                      </Button>
                                    )
                                  ) : (
                                    isReadOnly ? (
                                      <span className="text-xs text-warning">Pendente</span>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-warning border-warning/30 hover:bg-warning/5"
                                        onClick={() => handleOpenAssinaturaCertificado(colaborador)}
                                      >
                                        <PenTool className="h-4 w-4 mr-1" />
                                        Assinar
                                      </Button>
                                    )
                                  )
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {aprovado ? (
                                  jaValidado && certificadosData[colaborador.colaborador_id]?.url ? (
                                    <Badge className="bg-success/10 text-success border-success/20">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Sim
                                    </Badge>
                                  ) : jaValidado ? (
                                    <Badge variant="outline" className="bg-warning/5 text-warning border-warning/20">
                                      Pendente PDF
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
                                      Não
                                    </Badge>
                                  )
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {aprovado ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-warning/50 text-warning hover:bg-warning/5"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const params = new URLSearchParams({
                                          turmaId: turma?.id || '',
                                          colaboradorId: colaborador.colaborador_id,
                                          colaboradorTurmaId: colaborador.id
                                        });
                                        window.open(`/certificado/visualizar?${params.toString()}`, '_blank');
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      Visualizar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={jaValidado && certificadosData[colaborador.colaborador_id]?.url 
                                        ? "border-primary/50 text-primary hover:bg-primary/5"
                                        : "border-border text-muted-foreground cursor-not-allowed"
                                      }
                                      disabled={!jaValidado || !certificadosData[colaborador.colaborador_id]?.url}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (certificadosData[colaborador.colaborador_id]?.url) {
                                          window.open(certificadosData[colaborador.colaborador_id].url, '_blank');
                                        }
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      Ver Validado
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={jaValidado && certificadosData[colaborador.colaborador_id]?.url 
                                        ? "border-success/50 text-success hover:bg-success/5"
                                        : "border-border text-muted-foreground cursor-not-allowed"
                                      }
                                      disabled={!jaValidado || !certificadosData[colaborador.colaborador_id]?.url}
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (certificadosData[colaborador.colaborador_id]?.url) {
                                          try {
                                            const response = await fetch(certificadosData[colaborador.colaborador_id].url);
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            const nomeNormalizado = colaborador.nome
                                              .normalize('NFD')
                                              .replace(/[\u0300-\u036f]/g, '')
                                              .replace(/[^a-zA-Z0-9\s]/g, '')
                                              .replace(/\s+/g, '_');
                                            link.download = `certificado_${nomeNormalizado}.pdf`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          } catch (error) {
                                            console.error('Erro ao baixar:', error);
                                            toast.error('Erro ao baixar certificado');
                                          }
                                        }
                                      }}
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Baixar
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {colaborador.nota_pos_teste === null ? 'Aguardando prova' : 'Não aprovado'}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {colaboradoresTurma.filter(c => c.nota_pos_teste !== null && c.nota_pos_teste >= 7).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-t">
                        <Award className="h-10 w-10 mb-3 opacity-50" />
                        <p>Nenhum colaborador aprovado ainda</p>
                        <p className="text-sm">Colaboradores com nota pós-teste ≥ 7 poderão ter certificados gerados</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Aba Relatório */}
        <TabsContent value="relatorio" className="mt-6">
          <div className="space-y-6">
            {/* Header da seção */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <div className="bg-gradient-to-br from-primary to-primary/80 p-2 rounded-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  Relatórios da Turma
                </h2>
                <p className="text-muted-foreground mt-1">Visualize e exporte os relatórios completos do treinamento</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                  {turma?.codigo_turma || `#${turma?.numero_turma}`}
                </Badge>
                <Badge variant="outline" className={`${turma?.status === 'concluida' ? 'text-success border-success/30 bg-success/5' : 'text-warning border-warning/30 bg-warning/5'}`}>
                  {turma?.status || 'Em andamento'}
                </Badge>
              </div>
            </div>

            {/* Relatório Principal - Destaque */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-white shadow-lg overflow-hidden relative">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-primary to-primary/80 p-3 rounded-xl shadow-md">
                    <FileText className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-primary">Relatório Completo de Treinamento</CardTitle>
                    <CardDescription className="text-primary/70">Documento principal com todas as informações da turma</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-primary text-primary-foreground">Principal</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-primary/80 mb-5">
                  O relatório inclui todas as informações da turma, lista de presença, resultados das avaliações, 
                  certificados emitidos, fotos, documentos do instrutor e muito mais.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-card rounded-xl p-4 border border-primary/10 shadow-sm text-center">
                    <div className="text-2xl font-bold text-primary">{colaboradoresTurma.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Participantes</div>
                  </div>
                  <div className="bg-card rounded-xl p-4 border border-primary/10 shadow-sm text-center">
                    <div className="text-2xl font-bold text-primary">{turma?.carga_horaria_total ? `${turma.carga_horaria_total}h` : '-'}</div>
                    <div className="text-xs text-muted-foreground mt-1">Carga Horária</div>
                  </div>
                  <div className="bg-card rounded-xl p-4 border border-primary/10 shadow-sm text-center">
                    <div className="text-2xl font-bold text-primary">{turma?.aulas?.length || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">Dias de Aula</div>
                  </div>
                  <div className="bg-card rounded-xl p-4 border border-primary/10 shadow-sm text-center">
                    <div className="text-2xl font-bold text-success">{colaboradoresTurma.filter(c => c.resultado === 'aprovado').length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Aprovados</div>
                  </div>
                </div>
                <Button 
                  size="lg"
                  onClick={() => {
                    if (turmaId) {
                      window.open(`/relatorio/visualizar?turmaId=${turmaId}`, '_blank');
                    }
                  }}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md w-full md:w-auto"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Visualizar Relatório Completo
                </Button>
              </CardContent>
            </Card>

            {/* Grid de Relatórios Secundários */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Relatório de Presenças */}
              <Card className="border border-primary/20 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-primary to-primary/80 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">Relatório de Presenças</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Documentos comprobatórios: foto cadastrada, validação facial, assinatura digital por dia.
                      </p>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{colaboradoresTurma.length}</span>
                          <span className="text-muted-foreground">colaboradores</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{turma?.aulas?.length || 0}</span>
                          <span className="text-muted-foreground">dias</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          if (turmaId) {
                            window.open(`/relatorio/presencas?turmaId=${turmaId}`, '_blank');
                          }
                        }}
                        className="bg-primary hover:bg-primary/90 w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar Presenças
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Relatório de Sinistros */}
              <Card className={`border ${Object.keys(sinistrosColaboradores).length > 0 ? 'border-destructive/20 hover:border-destructive/30' : 'border-border hover:border-border'} hover:shadow-md transition-all cursor-pointer group`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`${Object.keys(sinistrosColaboradores).length > 0 ? 'bg-gradient-to-br from-destructive to-destructive/80' : 'bg-gradient-to-br from-muted-foreground/50 to-muted-foreground/30'} p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow`}>
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${Object.keys(sinistrosColaboradores).length > 0 ? 'text-destructive' : 'text-foreground'}`}>Relatório de Sinistros</h3>
                        {Object.keys(sinistrosColaboradores).length > 0 ? (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                            {Object.values(sinistrosColaboradores).flat().length} ocorrência{Object.values(sinistrosColaboradores).flat().length > 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success border-success/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sem ocorrências
                          </Badge>
                        )}
                      </div>
                      
                      {Object.keys(sinistrosColaboradores).length > 0 ? (
                        <>
                          <p className="text-sm text-destructive mb-4">
                            {Object.keys(sinistrosColaboradores).length} colaborador{Object.keys(sinistrosColaboradores).length > 1 ? 'es' : ''} afetado{Object.keys(sinistrosColaboradores).length > 1 ? 's' : ''} - reprovação automática aplicada.
                          </p>
                          <Button 
                            onClick={() => {
                              if (turmaId) {
                                window.open(`/relatorio/sinistros?turmaId=${turmaId}`, '_blank');
                              }
                            }}
                            className="bg-destructive hover:bg-destructive/90 w-full"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Visualizar Sinistros
                          </Button>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
                            <CheckCircle className="h-6 w-6 text-success" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Nenhum sinistro registrado nesta turma.
                          </p>
                          <p className="text-xs text-success font-medium mt-1">
                            Isso é uma boa notícia! ✓
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Relatório Validado */}
            {anexosRelatorio.length > 0 && (
              <Card className="border-2 border-success/20 bg-gradient-to-br from-success/5 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-success to-success/80 p-3 rounded-xl shadow-md">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-success">Relatório Validado</h3>
                        <Badge className="bg-success text-white">Aprovado</Badge>
                      </div>
                      <p className="text-sm text-success mt-1">
                        O relatório foi validado e está disponível para visualização e download.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="border-success/50 text-success hover:bg-success/5"
                        onClick={() => {
                          if (anexosRelatorio[0]?.url) {
                            window.open(anexosRelatorio[0].url, '_blank');
                          }
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </Button>
                      <Button 
                        className="bg-success hover:bg-success/90"
                        onClick={async () => {
                          if (anexosRelatorio[0]?.url) {
                            try {
                              const response = await fetch(anexosRelatorio[0].url);
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `relatorio_${turma?.codigo_turma || turma?.numero_turma}.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Erro ao baixar:', error);
                              toast.error('Erro ao baixar relatório');
                            }
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Aba Auditoria - apenas para empresa_sst e admin_vertical */}
        {(profile?.role === 'empresa_sst' || profile?.role === 'admin_vertical') && (
          <TabsContent value="auditoria" className="mt-6">
            <TurmaAuditoriaTab
              turmaId={turmaId!}
              turmaCodigo={turma?.codigo_turma || null}
              clienteNome={turma?.cliente_nome || ''}
              treinamentoNome={turma?.treinamento_nome || ''}
              treinamentoNorma={turma?.treinamento_norma || ''}
            />
          </TabsContent>
        )}

        {/* Aba Ajuda / Documentação */}
        <TabsContent value="ajuda" className="mt-6">
          <TurmaDocumentacao onDocChange={setActiveDocTitle} />
        </TabsContent>

        {/* Aba TI - APENAS para jhony@vtreinamentos.com.br */}
        {user?.email === 'jhony@vtreinamentos.com.br' && (
          <TabsContent value="ti" className="mt-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-lg">
                      <Wrench className="h-6 w-6 text-white" />
                    </div>
                    Ferramentas de TI
                  </h2>
                  <p className="text-muted-foreground mt-1">Ferramentas administrativas avançadas - uso restrito</p>
                </div>
              </div>

              {/* Cards de Ferramentas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Substituir Assinatura */}
                <Card className="border-orange-200 hover:border-orange-400 transition-colors cursor-pointer" onClick={() => {
                  setTiFerramentaAtiva('substituir-assinatura');
                  setTiDialogOpen(true);
                }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <Replace className="h-5 w-5" />
                      Substituir Assinatura
                    </CardTitle>
                    <CardDescription>
                      Copiar uma assinatura existente para outro local (presença, reorientação ou certificado)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Selecione uma assinatura de origem e substitua em um destino. Útil para corrigir assinaturas perdidas ou duplicar entre registros.
                    </p>
                  </CardContent>
                </Card>

                {/* Apagar Colaborador da Empresa */}
                <Card className="border-red-200 hover:border-red-400 transition-colors cursor-pointer" onClick={() => {
                  setTiFerramentaAtiva('apagar-colaborador');
                  setTiDialogOpen(true);
                }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <UserX className="h-5 w-5" />
                      Apagar Colaborador da Empresa
                    </CardTitle>
                    <CardDescription>
                      Remover permanentemente um colaborador do cadastro da empresa cliente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Remove o colaborador diretamente da tabela de colaboradores da empresa. Esta ação é irreversível.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Aviso de Segurança */}
              <Card className="border-yellow-300 bg-yellow-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Atenção: Ferramentas Administrativas</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Estas ferramentas realizam operações diretas no banco de dados. Use com cautela e apenas quando necessário.
                        Todas as ações são registradas no log de auditoria.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Aba Categorização Técnica - apenas para empresa_sst */}
        {(profile?.role === 'empresa_sst' || profile?.role === 'admin_vertical') && (
          <TabsContent value="categorizacao-tecnica" className="mt-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-2 rounded-lg">
                      <Settings2 className="h-6 w-6 text-white" />
                    </div>
                    Categorização Técnica
                  </h2>
                  <p className="text-muted-foreground mt-1">Defina os tipos de espaço confinado, atividades e responsáveis técnicos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tipo de Espaço Confinado */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <HardHat className="h-5 w-5 text-warning" />
                      Tipo de Espaço Confinado
                    </CardTitle>
                    <CardDescription>
                      Adicione os tipos de espaços confinados abordados no treinamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: Tanque de armazenamento, Silo, Vaso de pressão..."
                        value={novoTipoEspaco}
                        onChange={(e) => setNovoTipoEspaco(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && novoTipoEspaco.trim()) {
                            setTiposEspacoConfinado(prev => [...prev, { id: crypto.randomUUID(), nome: novoTipoEspaco.trim() }]);
                            setNovoTipoEspaco('');
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (novoTipoEspaco.trim()) {
                            setTiposEspacoConfinado(prev => [...prev, { id: crypto.randomUUID(), nome: novoTipoEspaco.trim() }]);
                            setNovoTipoEspaco('');
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {tiposEspacoConfinado.length > 0 && (
                      <div className="space-y-2">
                        {tiposEspacoConfinado.map((tipo) => (
                          <div key={tipo.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <span className="text-sm">{tipo.nome}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setTiposEspacoConfinado(prev => prev.filter(t => t.id !== tipo.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {tiposEspacoConfinado.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum tipo de espaço confinado adicionado
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Tipo de Atividade */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Tipo de Atividade
                    </CardTitle>
                    <CardDescription>
                      Adicione os tipos de atividades realizadas em espaços confinados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: Limpeza, Manutenção, Inspeção, Resgate..."
                        value={novoTipoAtividade}
                        onChange={(e) => setNovoTipoAtividade(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && novoTipoAtividade.trim()) {
                            setTiposAtividade(prev => [...prev, { id: crypto.randomUUID(), nome: novoTipoAtividade.trim() }]);
                            setNovoTipoAtividade('');
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (novoTipoAtividade.trim()) {
                            setTiposAtividade(prev => [...prev, { id: crypto.randomUUID(), nome: novoTipoAtividade.trim() }]);
                            setNovoTipoAtividade('');
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {tiposAtividade.length > 0 && (
                      <div className="space-y-2">
                        {tiposAtividade.map((tipo) => (
                          <div key={tipo.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <span className="text-sm">{tipo.nome}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setTiposAtividade(prev => prev.filter(t => t.id !== tipo.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {tiposAtividade.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum tipo de atividade adicionado
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Responsável Técnico */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserCog className="h-5 w-5 text-success" />
                    Responsável Técnico
                  </CardTitle>
                  <CardDescription>
                    Adicione os responsáveis técnicos pelos espaços confinados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <Input
                      placeholder="Nome completo"
                      value={novoResponsavel.nome}
                      onChange={(e) => setNovoResponsavel(prev => ({ ...prev, nome: e.target.value }))}
                    />
                    <Input
                      placeholder="Cargo"
                      value={novoResponsavel.cargo}
                      onChange={(e) => setNovoResponsavel(prev => ({ ...prev, cargo: e.target.value }))}
                    />
                    <Select
                      value={novoResponsavel.sigla_conselho}
                      onValueChange={(value) => setNovoResponsavel(prev => ({ ...prev, sigla_conselho: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Conselho" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTE">MTE</SelectItem>
                        <SelectItem value="CREA">CREA</SelectItem>
                        <SelectItem value="CRM">CRM</SelectItem>
                        <SelectItem value="COREN">COREN</SelectItem>
                        <SelectItem value="CFQ">CFQ</SelectItem>
                        <SelectItem value="CONFEA">CONFEA</SelectItem>
                        <SelectItem value="OUTRO">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Nº Registro"
                      value={novoResponsavel.numero_registro}
                      onChange={(e) => setNovoResponsavel(prev => ({ ...prev, numero_registro: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Select
                        value={novoResponsavel.estado}
                        onValueChange={(value) => setNovoResponsavel(prev => ({ ...prev, estado: value }))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (novoResponsavel.nome.trim() && novoResponsavel.cargo.trim()) {
                            setResponsaveisTecnicos(prev => [...prev, { 
                              id: crypto.randomUUID(), 
                              ...novoResponsavel 
                            }]);
                            setNovoResponsavel({
                              nome: '',
                              cargo: '',
                              sigla_conselho: '',
                              numero_registro: '',
                              estado: ''
                            });
                          } else {
                            toast.error('Preencha pelo menos nome e cargo');
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {responsaveisTecnicos.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Conselho</TableHead>
                            <TableHead>Nº Registro</TableHead>
                            <TableHead>UF</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {responsaveisTecnicos.map((resp) => (
                            <TableRow key={resp.id}>
                              <TableCell className="font-medium">{resp.nome}</TableCell>
                              <TableCell>{resp.cargo}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{resp.sigla_conselho || '-'}</Badge>
                              </TableCell>
                              <TableCell>{resp.numero_registro || '-'}</TableCell>
                              <TableCell>{resp.estado || '-'}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => setResponsaveisTecnicos(prev => prev.filter(r => r.id !== resp.id))}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {responsaveisTecnicos.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum responsável técnico adicionado
                    </p>
                  )}

                  {/* Texto do responsável */}
                  {responsaveisTecnicos.length > 0 && turma && (
                    <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
                      <p className="text-sm text-success">
                        <strong>Responsável{responsaveisTecnicos.length > 1 ? 'is' : ''} pelos espaços confinados da empresa {turma.cliente_nome}:</strong>
                      </p>
                      <ul className="mt-2 space-y-1">
                        {responsaveisTecnicos.map((resp) => (
                          <li key={resp.id} className="text-sm text-success/80">
                            • {resp.nome} - {resp.cargo}
                            {resp.sigla_conselho && ` (${resp.sigla_conselho}${resp.numero_registro ? ` nº ${resp.numero_registro}` : ''}${resp.estado ? `/${resp.estado}` : ''})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumo / Visualização */}
              {(tiposEspacoConfinado.length > 0 || tiposAtividade.length > 0 || responsaveisTecnicos.length > 0) && (
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                      <ListChecks className="h-5 w-5 text-primary" />
                      Resumo da Categorização Técnica
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Espaços Confinados */}
                      <div>
                        <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                          <HardHat className="h-4 w-4" />
                          Espaços Confinados ({tiposEspacoConfinado.length})
                        </h4>
                        {tiposEspacoConfinado.length > 0 ? (
                          <ul className="space-y-1">
                            {tiposEspacoConfinado.map((tipo) => (
                              <li key={tipo.id} className="text-sm text-primary/80">• {tipo.nome}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Nenhum definido</p>
                        )}
                      </div>

                      {/* Atividades */}
                      <div>
                        <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Atividades ({tiposAtividade.length})
                        </h4>
                        {tiposAtividade.length > 0 ? (
                          <ul className="space-y-1">
                            {tiposAtividade.map((tipo) => (
                              <li key={tipo.id} className="text-sm text-primary/80">• {tipo.nome}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Nenhuma definida</p>
                        )}
                      </div>

                      {/* Responsáveis */}
                      <div>
                        <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                          <UserCog className="h-4 w-4" />
                          Responsáveis ({responsaveisTecnicos.length})
                        </h4>
                        {responsaveisTecnicos.length > 0 ? (
                          <ul className="space-y-1">
                            {responsaveisTecnicos.map((resp) => (
                              <li key={resp.id} className="text-sm text-primary/80">
                                • {resp.nome} ({resp.cargo})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Nenhum definido</p>
                        )}
                      </div>
                    </div>

                    {/* Botão Salvar */}
                    <div className="mt-6 pt-4 border-t flex justify-end">
                      <Button
                        onClick={async () => {
                          if (!turmaId) return;
                          setSavingCategorizacao(true);
                          try {
                            const db = supabase as any;
                            
                            // Salvar categorização técnica
                            const { error } = await db
                              .from('turmas_treinamento')
                              .update({
                                categorizacao_tecnica: {
                                  tipos_espaco_confinado: tiposEspacoConfinado,
                                  tipos_atividade: tiposAtividade,
                                  responsaveis_tecnicos: responsaveisTecnicos
                                }
                              })
                              .eq('id', turmaId);
                            
                            if (error) throw error;
                            toast.success('Categorização técnica salva com sucesso!');
                          } catch (error) {
                            console.error('Erro ao salvar categorização:', error);
                            toast.error('Erro ao salvar categorização técnica');
                          } finally {
                            setSavingCategorizacao(false);
                          }
                        }}
                        disabled={savingCategorizacao}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {savingCategorizacao ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar Categorização
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog Adicionar Colaborador */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5 text-primary" />
              Adicionar Colaborador
            </DialogTitle>
            <DialogDescription>
              Escolha uma das opções abaixo para adicionar colaboradores à turma.
              <span className="block mt-1 text-xs text-warning">
                ⚠️ Colaboradores não podem estar em duas turmas do mesmo treinamento simultaneamente, nem em turmas com horários conflitantes.
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={dialogTab} onValueChange={setDialogTab} className="w-full flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-lg">
              <TabsTrigger value="selecionar" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs sm:text-sm">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Da Empresa</span>
                <span className="sm:hidden">Empresa</span>
              </TabsTrigger>
              <TabsTrigger value="qrcode" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs sm:text-sm">
                <QrCode className="h-4 w-4" />
                <span>QR Code</span>
              </TabsTrigger>
              <TabsTrigger value="cadastrar" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs sm:text-sm">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo</span>
                <span className="sm:hidden">Novo</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba Selecionar da Lista */}
            <TabsContent value="selecionar" className="mt-4 space-y-3 flex-1 overflow-hidden flex flex-col">
              {/* Barra de busca e info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar colaborador..."
                    value={searchColaborador}
                    onChange={(e) => setSearchColaborador(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-success/5 text-success border-success/20">
                    {colaboradoresEmpresa.filter(c => c.precisaTreinamento && !c.jaNaTurma).length} precisam do treinamento
                  </Badge>
                </div>
              </div>
              
              {/* Lista de colaboradores */}
              <div className="border rounded-lg overflow-hidden flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 sticky top-0 z-10">
                      <TableHead className="font-semibold text-foreground">Colaborador</TableHead>
                      <TableHead className="font-semibold text-foreground hidden sm:table-cell">Matrícula</TableHead>
                      <TableHead className="font-semibold text-foreground text-center w-[80px]">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colaboradoresEmpresa.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p className="font-medium">Nenhum colaborador encontrado</p>
                          <p className="text-sm">Cadastre colaboradores na empresa primeiro</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      colaboradoresEmpresa
                        .filter(c => 
                          searchColaborador === '' || 
                          c.nome.toLowerCase().includes(searchColaborador.toLowerCase()) ||
                          c.cpf?.includes(searchColaborador) ||
                          c.matricula?.toLowerCase().includes(searchColaborador.toLowerCase())
                        )
                        .map((colaborador) => (
                        <TableRow 
                          key={colaborador.id} 
                          className={`transition-colors ${
                            colaborador.precisaTreinamento && !colaborador.jaNaTurma 
                              ? 'bg-success/5 hover:bg-success/10' 
                              : colaborador.jaNaTurma 
                                ? 'bg-muted/50 opacity-60' 
                                : 'hover:bg-muted/50'
                          }`}
                        >
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="relative shrink-0">
                                {colaborador.foto_url ? (
                                  <img 
                                    src={colaborador.foto_url} 
                                    alt={colaborador.nome}
                                    className="w-8 h-8 rounded-full object-cover border border-border"
                                  />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs ${
                                    colaborador.precisaTreinamento && !colaborador.jaNaTurma 
                                      ? 'bg-gradient-to-br from-success to-success/80' 
                                      : 'bg-gradient-to-br from-muted-foreground/50 to-muted-foreground/30'
                                  }`}>
                                    {colaborador.nome.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                {uploadingFotoColaboradorId === colaborador.id ? (
                                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                    <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                                  </div>
                                ) : !colaborador.foto_url && (
                                  <button
                                    type="button"
                                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                                    title="Adicionar foto"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      abrirOpcoesFotoColaborador(colaborador.id);
                                    }}
                                  >
                                    <Plus className="h-2.5 w-2.5 text-white" />
                                  </button>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={`font-medium text-sm truncate ${colaborador.precisaTreinamento && !colaborador.jaNaTurma ? 'text-success' : 'text-foreground'}`}>
                                  {colaborador.nome}
                                </p>
                                <p className="text-xs text-muted-foreground">{colaborador.cpf ? formatCPF(colaborador.cpf) : '-'}</p>
                              </div>
                              {colaborador.jaNaTurma && (
                                <Badge variant="secondary" className="text-[10px] bg-muted shrink-0">Na turma</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{colaborador.matricula || '-'}</TableCell>
                          <TableCell className="text-center">
                            {colaborador.jaNaTurma ? (
                              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                                <Check className="h-4 w-4 text-success" />
                              </div>
                            ) : (
                              <Button 
                                variant={colaborador.precisaTreinamento ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleAddColaboradorFromList(colaborador.id)}
                                className={`h-8 w-8 p-0 ${colaborador.precisaTreinamento ? "bg-success hover:bg-success/90" : ""}`}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Aba QR Code */}
            <TabsContent value="qrcode" className="mt-4 flex-1 overflow-y-auto">
              <div className="space-y-5">
                {/* QR Code Section */}
                <div className="bg-gradient-to-br from-muted/50 to-muted rounded-xl p-6 border">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-center">
                      <h3 className="font-semibold text-foreground mb-1">Cadastro via QR Code</h3>
                      <p className="text-sm text-muted-foreground">
                        Colaboradores podem escanear para se cadastrar na turma
                      </p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border-2 border-border shadow-sm">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrCodeUrl}`}
                        alt="QR Code para cadastro"
                        className="w-44 h-44"
                      />
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="flex items-center gap-2 w-full max-w-xs">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleCopyLink(qrCodeUrl, 'cadastro')}
                      >
                        {copiedLink === 'cadastro' ? (
                          <>
                            <Check className="h-4 w-4 mr-1.5 text-success" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1.5" />
                            Copiar Link
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(qrCodeUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        Abrir Link
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="h-4 w-4 text-success" />
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-success">{colaboradoresTurma.length}</span> colaboradores na turma
                      </span>
                    </div>
                  </div>
                </div>

                {/* Colaboradores Pendentes de Aprovação */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-warning/5 border-b border-warning/20">
                    <h4 className="font-semibold text-sm flex items-center gap-2 text-warning">
                      <Users className="h-4 w-4" />
                      Pendentes de Aprovação
                    </h4>
                  </div>
                  <div className="p-3">
                    {turma && (
                      <ColaboradoresPendentesList
                        turmaId={turmaId!}
                        turmaClienteId={turma.cliente_id}
                        turmaTreinamentoId={turma.treinamento_id}
                        onColaboradorAprovado={fetchColaboradoresTurma}
                        reconhecimentoFacialAtivo={reconhecimentoFacialAtivo}
                      />
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Aba Cadastrar Novo */}
            <TabsContent value="cadastrar" className="mt-4 flex-1">
              <div className="bg-muted/50 rounded-xl p-5">
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Novo Colaborador</h3>
                  <p className="text-sm text-muted-foreground">Preencha os dados para cadastrar e adicionar à turma</p>
                </div>
                
                <div className="space-y-4 max-w-md mx-auto">
                  {/* Foto do colaborador - só exibir se reconhecimento facial estiver ativo */}
                  {reconhecimentoFacialAtivo && (
                  <div className="flex justify-center">
                    <div className="relative">
                      <div 
                        className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer"
                        onClick={() => document.getElementById('nova-foto-input')?.click()}
                      >
                        {novaFotoPreview ? (
                          <img src={novaFotoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <Camera className="h-6 w-6 text-muted-foreground mx-auto" />
                            <span className="text-xs text-muted-foreground mt-1 block">Adicionar foto</span>
                          </div>
                        )}
                      </div>
                      <input
                        id="nova-foto-input"
                        type="file"
                        accept="image/*"
                        onChange={handleNovaFotoChange}
                        className="hidden"
                      />
                      {novaFotoPreview && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNovaFoto(null);
                            setNovaFotoPreview(null);
                          }}
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="nome" className="text-xs font-medium text-muted-foreground">Nome Completo *</Label>
                    <Input 
                      id="nome"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder="Nome do colaborador"
                      className="h-9"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="cpf" className="text-xs font-medium text-muted-foreground">CPF *</Label>
                    <Input 
                      id="cpf"
                      value={novoCpf}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const limited = value.slice(0, 11);
                        let formatted = limited;
                        if (limited.length > 3) formatted = `${limited.slice(0, 3)}.${limited.slice(3)}`;
                        if (limited.length > 6) formatted = `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
                        if (limited.length > 9) formatted = `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
                        setNovoCpf(formatted);
                      }}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Fechar
            </Button>
            {dialogTab === 'cadastrar' && (
              <Button 
                onClick={handleCreateNovoColaborador}
                disabled={salvandoColaborador || !novoNome.trim() || !novoCpf.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                {salvandoColaborador ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar e Adicionar
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Upload Reorientação */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-success" />
              Upload de Foto de Reorientação
            </DialogTitle>
            <DialogDescription>
              {selectedColaboradorUpload && (
                <span>Enviar foto de reorientação para <strong>{selectedColaboradorUpload.nome}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-success transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadReorientacao}
                className="hidden"
                id="upload-reorientacao"
                disabled={uploadingFile}
              />
              <label 
                htmlFor="upload-reorientacao" 
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {uploadingFile ? (
                  <>
                    <Loader2 className="h-10 w-10 text-success animate-spin" />
                    <span className="text-sm text-muted-foreground">Enviando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para selecionar uma imagem</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG ou GIF</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={uploadingFile}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualização de imagem expandida */}
      <Dialog open={!!imagemExpandida} onOpenChange={(open) => !open && setImagemExpandida(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-sm font-medium text-muted-foreground">
                {imagemExpandidaNome}
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => imagemExpandida && handleDownloadAnexo(imagemExpandida, imagemExpandidaNome)}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </DialogHeader>
          <div className="flex items-center justify-center p-4 pt-0">
            {imagemExpandida && (
              <img 
                src={imagemExpandida} 
                alt={imagemExpandidaNome}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão de imagem */}
      <Dialog open={deleteImagemDialogOpen} onOpenChange={setDeleteImagemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Tem certeza que deseja apagar?
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p className="font-medium text-foreground">Esta é uma ação irreversível.</p>
              <p>A imagem <strong>"{deleteImagemAnexo?.descricao || deleteImagemAnexo?.nome}"</strong> será permanentemente removida do sistema.</p>
              <p className="text-sm">Se necessário, faça o download antes para ter um backup local.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            {deleteImagemAnexo && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleDownloadAnexo(deleteImagemAnexo.url, deleteImagemAnexo.descricao || deleteImagemAnexo.nome)}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar imagem antes de apagar
              </Button>
            )}
            <p className="text-sm text-center text-muted-foreground font-medium">Deseja seguir com a exclusão?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteImagemDialogOpen(false)}>
                Não
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (deleteImagemAnexo) {
                    await handleDeleteAnexo(deleteImagemAnexo, deleteImagemTipo);
                    setDeleteImagemDialogOpen(false);
                    setDeleteImagemAnexo(null);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Sim, apagar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Compromisso Profissional - antes de anexar foto */}
      <Dialog open={compromissoDialogOpen} onOpenChange={setCompromissoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          {/* Header fixo */}
          <div className="px-6 pt-6 pb-4 border-b bg-slate-900 rounded-t-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-lg tracking-wide">
                <div className="p-2 bg-warning rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87L13.637 3.59a1.914 1.914 0 0 0-3.274 0z"/><path d="M12 17h.01"/></svg>
                </div>
                <div>
                  <span className="block">Termo de Compromisso Profissional</span>
                  <span className="block text-xs font-normal text-slate-400 mt-0.5">Qualidade do Registro Fotográfico</span>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Conteúdo com scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ maxHeight: 'calc(85vh - 180px)' }}>
            <div className="bg-warning/10 border-l-4 border-warning rounded-r-lg p-4 space-y-2">
              <p className="text-[13px] text-foreground font-semibold leading-snug">
                Esta imagem será incluída no Relatório de Treinamento oficial destinado à empresa cliente <strong className="underline">{turma?.cliente_nome || 'do cliente'}</strong>.
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                O registro fotográfico é parte integrante da documentação e reflete diretamente o profissionalismo do(a) instrutor(a) <strong>{turma?.instrutor_nome || ''}</strong> e da empresa <strong>{empresa?.nome || 'de SST'}</strong>.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-800 px-4 py-2.5">
                <p className="text-[13px] font-semibold text-white tracking-wide">DIRETRIZES OBRIGATÓRIAS PARA A IMAGEM</p>
              </div>
              <div className="p-4 space-y-3 bg-white">
                {[
                  { n: 'I', text: <>Ser <strong>profissional e de alta qualidade</strong>, com boa iluminação e resolução adequada.</> },
                  { n: 'II', text: <>Estar <strong>bem enquadrada</strong>, focada no contexto do treinamento, sem cortes inadequados.</> },
                  { n: 'III', text: <>Refletir o <strong>treinamento em execução</strong>, demonstrando seriedade e comprometimento dos participantes.</> },
                  { n: 'IV', text: <><strong>Não conter adornos</strong>, filtros, emojis, marcas d'água ou qualquer elemento que comprometa a seriedade do documento.</> },
                  { n: 'V', text: <>Evidenciar o <strong>uso correto de EPIs</strong> (Equipamentos de Proteção Individual) sempre que aplicável ao treinamento.</> },
                  { n: 'VI', text: <>Transmitir <strong>credibilidade e profissionalismo</strong>, condizente com a imagem de <strong>{empresa?.nome || 'sua empresa'}</strong> perante o cliente.</> },
                ].map((item) => (
                  <div key={item.n} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[11px] font-bold text-slate-600">{item.n}</span>
                    <p className="text-[13px] text-slate-700 leading-relaxed pt-1">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-destructive/10 border-l-4 border-destructive rounded-r-lg p-3">
              <p className="text-[12px] text-destructive leading-relaxed">
                <strong>Atenção:</strong> Imagens inadequadas, de baixa qualidade ou que não atendam aos critérios acima comprometem a credibilidade do relatório e a reputação profissional de todos os envolvidos.
              </p>
            </div>
          </div>

          {/* Footer fixo */}
          <div className="px-6 py-4 border-t bg-slate-50 rounded-b-lg space-y-4">
            <div 
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${compromissoAceito ? 'border-slate-800 bg-slate-800/5' : 'border-slate-300 hover:border-slate-500'}`}
              onClick={() => setCompromissoAceito(!compromissoAceito)}
            >
              <Checkbox 
                id="compromisso-check"
                checked={compromissoAceito} 
                onCheckedChange={(checked) => setCompromissoAceito(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="compromisso-check" className="text-[13px] font-medium text-slate-800 cursor-pointer leading-relaxed">
                Declaro ter ciência integral das diretrizes acima e assumo o <strong>compromisso profissional</strong> de anexar exclusivamente imagens que atendam a todos os critérios de qualidade estabelecidos neste termo.
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCompromissoDialogOpen(false)} className="px-5">
                Cancelar
              </Button>
              <Button 
                disabled={!compromissoAceito}
                className="bg-slate-800 hover:bg-slate-700 text-white px-5"
                onClick={() => {
                  setCompromissoDialogOpen(false);
                  setUploadGaleriaDialogOpen(true);
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Anexar Imagem
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para upload de foto na galeria */}
      <Dialog open={uploadGaleriaDialogOpen} onOpenChange={setUploadGaleriaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Adicionar Foto à Galeria
            </DialogTitle>
            <DialogDescription>
              Adicione uma foto do treinamento com descrição obrigatória
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="galeria-foto">Foto *</Label>
              <Input
                id="galeria-foto"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setUploadGaleriaFile(file);
                }}
              />
              {uploadGaleriaFile && (
                <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                  <img 
                    src={URL.createObjectURL(uploadGaleriaFile)} 
                    alt="Preview" 
                    className="max-h-32 mx-auto rounded"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="galeria-descricao">Descrição *</Label>
              <Textarea
                id="galeria-descricao"
                placeholder="Ex: Colaboradores durante o treinamento prático"
                value={uploadGaleriaDescricao}
                onChange={(e) => setUploadGaleriaDescricao(e.target.value)}
                className="resize-y min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="galeria-data">Data do Registro</Label>
              <Input
                id="galeria-data"
                type="date"
                value={uploadGaleriaDataRegistro}
                onChange={(e) => setUploadGaleriaDataRegistro(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setUploadGaleriaDialogOpen(false);
              setUploadGaleriaFile(null);
              setUploadGaleriaDescricao('');
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUploadGaleria}
              disabled={!uploadGaleriaFile || !uploadGaleriaDescricao.trim() || uploadGaleriaLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {uploadGaleriaLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar foto da galeria */}
      <Dialog open={editarFotoDialogOpen} onOpenChange={setEditarFotoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Editar Foto
            </DialogTitle>
            <DialogDescription>
              Altere a descrição e a data de registro da foto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editarFotoAnexo && (
              <div className="flex justify-center">
                <img 
                  src={editarFotoAnexo.url} 
                  alt="Preview" 
                  className="max-h-32 rounded-lg border"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="editar-descricao">Descrição *</Label>
              <Textarea
                id="editar-descricao"
                placeholder="Descrição da foto"
                value={editarFotoNovaDescricao}
                onChange={(e) => setEditarFotoNovaDescricao(e.target.value)}
                className="resize-y min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editar-data">Data do Registro</Label>
              <Input
                id="editar-data"
                type="date"
                value={editarFotoNovaData}
                onChange={(e) => setEditarFotoNovaData(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditarFotoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditarFoto}
              disabled={!editarFotoNovaDescricao.trim()}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualização de reorientação */}
      {selectedColaboradorReorientacao && turmaId && (
        <ReorientacaoViewDialog
          open={reorientacaoViewOpen}
          onOpenChange={setReorientacaoViewOpen}
          turmaId={turmaId}
          colaboradorId={selectedColaboradorReorientacao.colaborador_id}
          colaboradorNome={selectedColaboradorReorientacao.nome}
        />
      )}

      {/* Dialog Marcar Presença via QR Code */}
      <Dialog open={presencaDialogOpen} onOpenChange={setPresencaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-success" />
              Marcar Presença
            </DialogTitle>
            <DialogDescription>
              Colaboradores escaneiam o QR Code para registrar presença com assinatura
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-gradient-to-br from-success/5 to-success/10 rounded-xl p-5">
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-xl border-2 border-success/20 shadow-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrCodePresencaUrl}`}
                    alt="QR Code para presença"
                    className="w-44 h-44"
                  />
                </div>

                {/* Botões de ação */}
                <div className="flex items-center gap-2 w-full">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCopyLink(qrCodePresencaUrl, 'presenca')}
                  >
                    {copiedLink === 'presenca' ? (
                      <>
                        <Check className="h-4 w-4 mr-1.5 text-success" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1.5" />
                        Copiar Link
                      </>
                    )}
                  </Button>
                  <Button 
                    size="sm"
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={() => window.open(qrCodePresencaUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Abrir Link
                  </Button>
                </div>
              </div>
            </div>

            {/* Datas de aula */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2 text-center">
                Datas de aula desta turma
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {datasAulas.map((data, index) => {
                  const isHoje = data === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className={`text-xs ${isHoje ? 'bg-success/10 text-success border-success/30 font-semibold' : 'bg-muted text-foreground border-border'}`}
                    >
                      {format(parseISO(data), 'dd/MM/yyyy')}
                      {isHoje && ' (Hoje)'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t">
            <Button variant="outline" className="w-full" onClick={() => setPresencaDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualização de assinatura expandida */}
      <Dialog open={!!assinaturaExpandida} onOpenChange={(open) => !open && setAssinaturaExpandida(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinatura do Colaborador</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {assinaturaExpandida && (
              <img 
                src={assinaturaExpandida} 
                alt="Assinatura"
                className="max-w-full border rounded-lg bg-white"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de validação facial - UI/UX Redesenhada */}
      <Dialog open={facialDialogOpen} onOpenChange={(open) => {
        if (!open) {
          stopCamera();
          setCapturedPhoto(null);
          setFacialLogs([]);
          setFacialStep('idle');
        }
        setFacialDialogOpen(open);
      }}>
        <DialogContent className="max-w-5xl max-h-[95vh] p-0">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ScanFace className="h-6 w-6" />
                </div>
                Registro de Presença
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/80">
                {selectedColaboradorFacial && (
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-white">{selectedColaboradorFacial.colaboradorNome}</span>
                    <span>•</span>
                    <span>{format(parseISO(selectedColaboradorFacial.dataAula), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Indicador de progresso */}
          <div className="px-6 py-3 bg-muted/50 border-b">
            <div className="flex items-center justify-center gap-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                facialStep === 'signature' || facialStep === 'saving' || facialStep === 'success'
                  ? 'bg-success/10 text-success'
                  : facialStep === 'authenticated'
                  ? 'bg-success text-white'
                  : 'bg-primary text-white'
              }`}>
                <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">1</div>
                Validação Facial
                {(facialStep === 'authenticated' || facialStep === 'signature' || facialStep === 'saving' || facialStep === 'success') && (
                  <CheckCircle className="h-4 w-4" />
                )}
              </div>
              <div className="w-8 h-0.5 bg-muted-foreground/30" />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                facialStep === 'signature'
                  ? 'bg-primary text-white'
                  : facialStep === 'saving' || facialStep === 'success'
                  ? 'bg-success text-white'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">2</div>
                Assinatura
                {(facialStep === 'saving' || facialStep === 'success') && (
                  <CheckCircle className="h-4 w-4" />
                )}
              </div>
            </div>
          </div>
          
          {/* Conteúdo principal */}
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
            {/* FLUXO 1: Colaborador SEM foto cadastrada - Cadastrar foto primeiro */}
            {!selectedColaboradorFacial?.fotoColaborador ? (
              <div className="space-y-6">
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <h4 className="font-medium text-warning">Foto não cadastrada</h4>
                      <p className="text-sm text-warning/80 mt-1">
                        Este colaborador ainda não possui foto cadastrada. Cadastre uma foto para poder realizar a validação facial.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Opção 1: Upload de arquivo */}
                  <div className="bg-card border-2 border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg text-foreground mb-2">Enviar Arquivo</h3>
                      <p className="text-sm text-muted-foreground mb-4">Selecione uma foto do seu computador</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={newPhotoInputRef}
                        onChange={handleUploadNewColaboradorPhoto}
                      />
                      <Button 
                        onClick={() => newPhotoInputRef.current?.click()}
                        disabled={uploadingNewPhoto}
                        className="w-full"
                        variant="outline"
                      >
                        {uploadingNewPhoto ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                        ) : (
                          <><Upload className="h-4 w-4 mr-2" /> Selecionar Arquivo</>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Opção 2: Tirar foto da câmera */}
                  <div className="bg-card border-2 border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                        <Camera className="h-8 w-8 text-success" />
                      </div>
                      <h3 className="font-semibold text-lg text-foreground mb-2">Tirar Foto</h3>
                      <p className="text-sm text-muted-foreground mb-4">Use a câmera para tirar uma foto agora</p>
                      
                      {/* Preview da câmera ou foto capturada */}
                      <div className="aspect-[4/3] bg-background rounded-lg mb-4 overflow-hidden relative">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className={`w-full h-full object-cover ${capturedPhoto ? 'hidden' : ''}`}
                        />
                        {capturedPhoto && (
                          <img 
                            src={capturedPhoto} 
                            alt="Foto capturada" 
                            className="w-full h-full object-cover"
                          />
                        )}
                        {!capturingPhoto && !capturedPhoto && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                          </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                      </div>

                      <div className="flex gap-2">
                        {!capturedPhoto ? (
                          <Button 
                            onClick={capturePhoto}
                            disabled={!capturingPhoto}
                            className="flex-1 bg-primary hover:bg-primary/90"
                          >
                            <Camera className="h-4 w-4 mr-2" /> Capturar
                          </Button>
                        ) : (
                          <>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setCapturedPhoto(null);
                                startCamera();
                              }}
                              className="flex-1"
                            >
                              <Camera className="h-4 w-4 mr-2" /> Nova Foto
                            </Button>
                            <Button 
                              onClick={async () => {
                                if (!capturedPhoto || !selectedColaboradorFacial) return;
                                
                                try {
                                  setUploadingNewPhoto(true);
                                  addFacialLog('Processando foto da câmera...', 'info');
                                  
                                  const response = await fetch(capturedPhoto);
                                  const blob = await response.blob();
                                  
                                  addFacialLog('Enviando foto para o servidor...', 'info');
                                  
                                  const fileName = `colaboradores/${selectedColaboradorFacial.colaboradorId}_${Date.now()}.jpg`;
                                  
                                  const { error: uploadError } = await supabase.storage
                                    .from('colaborador-fotos')
                                    .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
                                  
                                  if (uploadError) throw uploadError;
                                  
                                  const { data: urlData } = supabase.storage
                                    .from('colaborador-fotos')
                                    .getPublicUrl(fileName);
                                  
                                  addFacialLog('Atualizando cadastro do colaborador...', 'info');
                                  
                                  const { error: updateError } = await (supabase as any)
                                    .from('colaboradores')
                                    .update({ foto_url: urlData.publicUrl })
                                    .eq('id', selectedColaboradorFacial.colaboradorId);
                                  
                                  if (updateError) throw updateError;
                                  
                                  setSelectedColaboradorFacial(prev => prev ? {
                                    ...prev,
                                    fotoColaborador: urlData.publicUrl
                                  } : null);
                                  
                                  setColaboradoresTurma(prev => prev.map(c => 
                                    c.colaboradorId === selectedColaboradorFacial.colaboradorId 
                                      ? { ...c, fotoColaborador: urlData.publicUrl }
                                      : c
                                  ));
                                  
                                  // Limpar foto capturada e reiniciar câmera para validação
                                  setCapturedPhoto(null);
                                  startCamera();
                                  
                                  addFacialLog('Foto cadastrada com sucesso!', 'success');
                                  toast.success('Foto cadastrada! Agora tire outra foto para validar a presença.');
                                } catch (error: any) {
                                  console.error('Erro ao cadastrar foto:', error);
                                  addFacialLog(`Erro: ${error.message || 'Erro desconhecido'}`, 'error');
                                  toast.error('Erro ao cadastrar foto: ' + (error.message || 'Erro desconhecido'));
                                } finally {
                                  setUploadingNewPhoto(false);
                                }
                              }}
                              disabled={uploadingNewPhoto}
                              className="flex-1 bg-success hover:bg-success/90"
                            >
                              {uploadingNewPhoto ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                              ) : (
                                <><Check className="h-4 w-4 mr-2" /> Usar Esta Foto</>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : facialStep !== 'signature' ? (
              /* FLUXO 2: Colaborador COM foto - Validação Facial Normal */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna esquerda: Fotos */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Foto cadastrada */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-foreground">Foto Cadastrada</Label>
                        <Badge className="bg-success/10 text-success border-0">
                          <Check className="h-3 w-3 mr-1" /> OK
                        </Badge>
                      </div>
                      <div className="aspect-[3/4] bg-muted rounded-xl border-2 border-border flex items-center justify-center overflow-hidden shadow-sm">
                        <img 
                          src={selectedColaboradorFacial.fotoColaborador} 
                          alt="Foto cadastrada" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Câmera / Foto capturada */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-foreground">Câmera</Label>
                        {capturedPhoto && (
                          <Badge className="bg-primary/10 text-primary border-0">
                            <Check className="h-3 w-3 mr-1" /> Capturada
                          </Badge>
                        )}
                      </div>
                      <div className="aspect-[3/4] bg-background rounded-xl border-2 border-primary/50 flex items-center justify-center overflow-hidden relative shadow-lg">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className={`w-full h-full object-cover ${capturedPhoto ? 'hidden' : ''}`}
                        />
                        
                        {capturedPhoto && (
                          <img 
                            src={capturedPhoto} 
                            alt="Foto capturada" 
                            className="w-full h-full object-cover absolute inset-0"
                          />
                        )}
                        
                        {!capturingPhoto && !capturedPhoto && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
                              <p className="text-sm text-muted-foreground">Iniciando câmera...</p>
                            </div>
                          </div>
                        )}
                        
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Overlays de status */}
                        {facialStep === 'authenticated' && (
                          <div className="absolute inset-0 bg-gradient-to-t from-success to-success/80 flex flex-col items-center justify-center">
                            <CheckCircle className="h-16 w-16 text-white mb-3" />
                            <p className="text-white font-bold text-xl">Validado!</p>
                            <p className="text-success-foreground/80">{(facialSimilarity * 100).toFixed(0)}% similaridade</p>
                          </div>
                        )}
                        
                        {facialStep === 'failed' && (
                          <div className="absolute inset-0 bg-gradient-to-t from-destructive to-destructive/80 flex flex-col items-center justify-center">
                            <XCircle className="h-16 w-16 text-white mb-3" />
                            <p className="text-white font-bold text-xl">Não Reconhecido</p>
                            <p className="text-destructive-foreground/80">{(facialSimilarity * 100).toFixed(0)}% similaridade</p>
                          </div>
                        )}
                        
                        {facialStep === 'processing' && (
                          <div className="absolute inset-0 bg-primary/95 flex flex-col items-center justify-center">
                            <div className="relative">
                              <ScanFace className="h-16 w-16 text-white" />
                              <div className="absolute inset-0 animate-ping">
                                <ScanFace className="h-16 w-16 text-white/50" />
                              </div>
                            </div>
                            <p className="text-white font-bold mt-4">Analisando rosto...</p>
                          </div>
                        )}
                        
                        {(facialStep === 'saving' || facialStep === 'success') && (
                          <div className="absolute inset-0 bg-gradient-to-t from-success to-success/80 flex flex-col items-center justify-center">
                            {facialStep === 'saving' ? (
                              <><Loader2 className="h-16 w-16 text-white mb-3 animate-spin" />
                              <p className="text-white font-bold text-xl">Salvando...</p></>
                            ) : (
                              <><CheckCircle className="h-16 w-16 text-white mb-3" />
                              <p className="text-white font-bold text-xl">Presença Registrada!</p></>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões de ação da câmera */}
                  <div className="flex gap-3 relative z-50">
                    {facialStep === 'camera' && (
                      <Button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          capturePhoto();
                        }} 
                        className="flex-1 h-12 bg-primary hover:bg-primary/90 text-lg pointer-events-auto"
                        disabled={!capturingPhoto}
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        Capturar Foto
                      </Button>
                    )}
                    
                    {facialStep === 'captured' && (
                      <>
                        <Button 
                          variant="outline"
                          className="flex-1 h-12"
                          onClick={() => {
                            setCapturedPhoto(null);
                            setFacialStep('camera');
                            startCamera();
                          }}
                        >
                          <Camera className="h-5 w-5 mr-2" />
                          Nova Foto
                        </Button>
                        <Button 
                          onClick={iniciarValidacao} 
                          className="flex-1 h-12 bg-success hover:bg-success/90 text-lg"
                          disabled={!selectedColaboradorFacial?.fotoColaborador}
                        >
                          <ScanFace className="h-5 w-5 mr-2" />
                          Validar
                        </Button>
                      </>
                    )}
                    
                    {facialStep === 'processing' && (
                      <Button disabled className="flex-1 h-12 bg-primary">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processando...
                      </Button>
                    )}
                    
                    {facialStep === 'authenticated' && (
                      <Button 
                        onClick={handleGoToSignature} 
                        className="flex-1 h-12 bg-success hover:bg-success/90 text-lg"
                      >
                        <PenTool className="h-5 w-5 mr-2" />
                        Continuar para Assinatura
                      </Button>
                    )}
                    
                    {facialStep === 'failed' && (
                      <Button 
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={() => {
                          setCapturedPhoto(null);
                          setFacialStep('camera');
                          setFacialLogs([]);
                          startCamera();
                        }}
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        Tentar Novamente
                      </Button>
                    )}
                  </div>
                </div>

                {/* Coluna direita: Log e informações */}
                <div className="space-y-4">
                  {/* Dicas */}
                  {facialStep === 'camera' && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <p className="font-medium text-primary mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Dicas para melhor validação
                      </p>
                      <ul className="text-sm text-primary/80 space-y-1">
                        <li className="flex items-center gap-2"><Check className="h-3 w-3" /> Fique em local bem iluminado</li>
                        <li className="flex items-center gap-2"><Check className="h-3 w-3" /> Remova óculos, bonés ou máscaras</li>
                        <li className="flex items-center gap-2"><Check className="h-3 w-3" /> Centralize o rosto na câmera</li>
                        <li className="flex items-center gap-2"><Check className="h-3 w-3" /> Mantenha expressão neutra</li>
                      </ul>
                    </div>
                  )}

                  {/* Log de processamento */}
                  <div className="bg-background rounded-xl p-4 h-[280px] overflow-y-auto border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Log de Processamento</p>
                    {facialLogs.length === 0 ? (
                      <p className="text-muted-foreground text-center mt-20">Aguardando...</p>
                    ) : (
                      <div className="space-y-1 font-mono text-xs">
                        {facialLogs.map((log, idx) => (
                          <div key={idx} className={`flex gap-2 ${
                            log.type === 'success' ? 'text-success' :
                            log.type === 'error' ? 'text-destructive' :
                            log.type === 'warning' ? 'text-warning' :
                            'text-muted-foreground'
                          }`}>
                            <span className="text-muted-foreground">[{log.time}]</span>
                            <span>{log.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Info da turma */}
                  {selectedColaboradorFacial && turma && (
                    <div className="p-4 bg-muted/50 rounded-xl border space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{turma.treinamento_nome}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(parseISO(selectedColaboradorFacial.dataAula), "dd/MM/yyyy")} às {format(new Date(), "HH:mm")}</span>
                      </div>
                      {captureMetadata?.locationName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{captureMetadata.locationName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Etapa 2: Assinatura */
              <div className="space-y-4">
                {/* Sucesso da validação facial */}
                <div className="p-4 bg-success/5 rounded-xl border border-success/20 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-success">Validação Facial Aprovada</p>
                    <p className="text-sm text-success">
                      Similaridade: {(facialSimilarity * 100).toFixed(0)}%
                      {captureMetadata?.locationName && ` • ${captureMetadata.locationName}`}
                    </p>
                  </div>
                </div>

                {/* Área de assinatura */}
                <div className="bg-muted/50 rounded-xl p-6 border">
                  <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                    <PenTool className="h-5 w-5 text-primary" />
                    Assinatura do Colaborador
                  </Label>
                  <SignaturePadSimple
                    onSave={handleSaveSignatureAndPresenca}
                    onCancel={() => setFacialStep('authenticated')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-muted/50 border-t flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={() => {
                stopCamera();
                setCapturedPhoto(null);
                setFacialLogs([]);
                setFacialStep('camera');
                setCollectedSignature(null);
                setFacialDialogOpen(false);
              }}
              disabled={savingFacial}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            {selectedColaboradorFacial && turma && (
              <p className="text-sm text-muted-foreground">
                Turma {turma.codigo_turma || turma.numero_turma} • {turma.treinamento_norma}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhes da validação facial */}
      <Dialog open={facialDetailDialogOpen} onOpenChange={setFacialDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ScanFace className="h-5 w-5 text-success" />
              Detalhes da Validação Facial
            </DialogTitle>
          </DialogHeader>
          
          {selectedFacialDetail && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {/* Fotos lado a lado */}
              <div className="grid grid-cols-2 gap-4">
                {/* Foto Original */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Foto Cadastrada</Label>
                  <div className="aspect-square bg-muted rounded-lg border-2 border-border overflow-hidden">
                    {selectedFacialDetail.fotoOriginal ? (
                      <img 
                        src={selectedFacialDetail.fotoOriginal} 
                        alt="Foto cadastrada" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Camera className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Foto da Validação */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Foto da Validação</Label>
                  <div className="aspect-square bg-muted rounded-lg border-2 border-success/30 overflow-hidden">
                    {selectedFacialDetail.fotoValidacao ? (
                      <img 
                        src={selectedFacialDetail.fotoValidacao} 
                        alt="Foto da validação" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Camera className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Similaridade */}
              {selectedFacialDetail.similaridade !== null && (
                <div className="p-3 bg-success/5 rounded-lg border border-success/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-success">Similaridade Facial</span>
                    <span className="text-2xl font-bold text-success">
                      {(selectedFacialDetail.similaridade * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Informações do Colaborador */}
              <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Informações do Colaborador
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="ml-2 font-medium">{selectedFacialDetail.colaboradorNome}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPF:</span>
                    <span className="ml-2 font-mono">{formatCPF(selectedFacialDetail.colaboradorCpf)}</span>
                  </div>
                </div>
              </div>

              {/* Informações do Treinamento */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Treinamento
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-primary/80">Treinamento:</span>
                    <span className="ml-2 font-medium">{selectedFacialDetail.treinamentoNome}</span>
                  </div>
                  <div>
                    <span className="text-primary/80">Norma:</span>
                    <span className="ml-2 font-medium">{selectedFacialDetail.treinamentoNorma}</span>
                  </div>
                </div>
              </div>

              {/* Informações da Captura */}
              <div className="p-3 bg-warning/5 rounded-lg border border-warning/20 space-y-2">
                <h4 className="text-sm font-semibold text-warning flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Dados da Captura
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-warning/80">Data:</span>
                    <span className="ml-2 font-medium">
                      {format(parseISO(selectedFacialDetail.dataValidacao), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div>
                    <span className="text-warning/80">Hora:</span>
                    <span className="ml-2 font-medium">
                      {selectedFacialDetail.horaValidacao ? 
                        format(parseISO(selectedFacialDetail.horaValidacao), "HH:mm:ss") : '-'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-warning/80">Dispositivo:</span>
                    <span className="ml-2 font-medium">
                      {selectedFacialDetail.deviceName || 'Não informado'}
                    </span>
                  </div>
                  {(selectedFacialDetail.latitude && selectedFacialDetail.longitude) && (
                    <>
                      <div className="col-span-2">
                        <span className="text-warning/80">Coordenadas:</span>
                        <span className="ml-2 font-mono text-xs">
                          {selectedFacialDetail.latitude.toFixed(6)}, {selectedFacialDetail.longitude.toFixed(6)}
                        </span>
                      </div>
                      {selectedFacialDetail.locationName && (
                        <div className="col-span-2">
                          <span className="text-warning/80">Local:</span>
                          <span className="ml-2">{selectedFacialDetail.locationName}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Assinatura do Colaborador */}
              {selectedFacialDetail.assinatura && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Assinatura do Colaborador
                  </h4>
                  <div className="bg-white rounded border p-2">
                    <img 
                      src={selectedFacialDetail.assinatura} 
                      alt="Assinatura" 
                      className="max-h-24 mx-auto"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setFacialDetailDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de assinatura do certificado */}
      <Dialog open={assinaturaCertificadoDialogOpen} onOpenChange={setAssinaturaCertificadoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-success" />
              Assinatura para Certificado
            </DialogTitle>
            <DialogDescription>
              {selectedColaboradorCertificado?.colaboradorNome}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedColaboradorCertificado?.assinaturaAtual && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-2">Assinatura atual:</p>
                <img 
                  src={selectedColaboradorCertificado.assinaturaAtual} 
                  alt="Assinatura atual" 
                  className="max-h-20 mx-auto border rounded bg-white"
                />
              </div>
            )}
            {savingAssinaturaCertificado ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-success mb-2" />
                <p className="text-sm text-muted-foreground">Salvando assinatura...</p>
              </div>
            ) : (
              <SignaturePad
                onSave={handleSaveAssinaturaCertificado}
                onCancel={() => {
                  setAssinaturaCertificadoDialogOpen(false);
                  setSelectedColaboradorCertificado(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Reorientação via Instrutor - Igual ao fluxo do QR Code */}
      <Dialog open={reorientacaoInstrutorDialogOpen} onOpenChange={handleCloseReorientacaoDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-warning" />
              Reorientação - {selectedColaboradorReorientacaoInstrutor?.nome}
            </DialogTitle>
            <DialogDescription>
              Detalhes da reorientação após pós-teste
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4 flex-1 overflow-y-auto">
            {assinaturaReorientacao ? (
              // Exibir assinatura após salvar
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-success">Reorientação Registrada!</h3>
                  <p className="text-sm text-muted-foreground">Colaborador aprovado com sucesso</p>
                </div>
                <div className="border rounded-lg p-3 bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Assinatura do colaborador:</p>
                  <img 
                    src={assinaturaReorientacao} 
                    alt="Assinatura" 
                    className="max-h-24 mx-auto border rounded bg-white"
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={handleCloseReorientacaoDialog}
                >
                  Fechar
                </Button>
              </div>
            ) : loadingQuestoes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-warning" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando dados...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Card de Informações do Colaborador */}
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Colaborador</p>
                      <p className="font-medium">{selectedColaboradorReorientacaoInstrutor?.nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPF</p>
                      <p className="font-medium">{formatCPF(selectedColaboradorReorientacaoInstrutor?.cpf || '')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Empresa</p>
                      <p className="font-medium">{turma?.cliente_nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Treinamento</p>
                      <p className="font-medium">{turma?.treinamento_norma} - {turma?.treinamento_nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {turma?.data_inicio ? format(parseISO(turma.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Resultado</p>
                      <p className="font-medium text-warning">
                        {Math.floor(selectedColaboradorReorientacaoInstrutor?.nota_pos_teste || 0)}/10
                      </p>
                    </div>
                  </div>
                </div>

                {/* Título de Reorientação */}
                <div className="text-center py-2 border-b">
                  <h3 className="font-semibold text-lg">📋 Termo de Reorientação</h3>
                </div>

                {/* Questões Incorretas - Exibição somente leitura */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <h4 className="font-semibold text-destructive">
                      Questões Incorretas ({questoesErradasSelecionadas.filter(q => q.questaoId && q.alternativaId).length})
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Revise as questões que o colaborador errou e entenda a resposta correta
                  </p>

                  {questoesProva.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Nenhuma questão encontrada para este treinamento
                    </div>
                  ) : questoesErradasSelecionadas.filter(q => q.questaoId && q.alternativaId).length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Nenhuma questão incorreta encontrada na prova do colaborador
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questoesErradasSelecionadas.filter(q => q.questaoId && q.alternativaId).map((item, index) => {
                        const questao = questoesProva.find(q => q.id === item.questaoId);
                        const alternativaSelecionada = questao?.alternativas.find(a => a.id === item.alternativaId);
                        const alternativaCorreta = questao?.alternativas.find(a => a.correta);
                        
                        if (!questao || !alternativaSelecionada) return null;
                        
                        return (
                          <div key={index} className="border rounded-lg p-4 bg-muted/50">
                            {/* Pergunta */}
                            <p className="font-medium text-sm mb-3">
                              {questao.numero}. {questao.pergunta}
                            </p>

                            {/* Resposta do colaborador (errada) */}
                            <div className="mb-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                              <div className="flex items-start gap-2">
                                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-destructive font-medium mb-1">Resposta do colaborador:</p>
                                  <p className="text-sm text-destructive">
                                    <span className="font-medium">{alternativaSelecionada.letra})</span> {alternativaSelecionada.texto}
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
                                    <span className="font-medium">{alternativaCorreta?.letra})</span> {alternativaCorreta?.texto}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Assinatura */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Ao assinar, o colaborador confirma que revisou todas as questões incorretas e compreendeu as respostas corretas.
                  </p>
                  
                  <Label className="text-sm font-medium mb-2 block">Assinatura do Colaborador</Label>
                  <SignaturePad
                    onSave={handleSaveReorientacaoInstrutor}
                    onCancel={handleCloseReorientacaoDialog}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Gabarito */}
      <Dialog open={gabaritoDialogOpen} onOpenChange={setGabaritoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-success" />
              Gabarito da Prova
            </DialogTitle>
            <DialogDescription>
              {turma?.treinamento_norma} - {turma?.treinamento_nome}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 flex-1 overflow-hidden flex flex-col">
            {/* Seletor de modo */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={gabaritoMode === 'resumido' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGabaritoMode('resumido')}
              >
                Resumido
              </Button>
              <Button
                variant={gabaritoMode === 'completo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGabaritoMode('completo')}
              >
                Completo
              </Button>
            </div>

            {loadingGabarito ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-success" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando gabarito...</span>
              </div>
            ) : gabaritoQuestoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma questão encontrada para este treinamento
              </div>
            ) : gabaritoMode === 'resumido' ? (
              // Modo Resumido: número + letra correta
              <div className="overflow-y-auto flex-1">
                <div className="grid grid-cols-5 gap-2">
                  {gabaritoQuestoes.map((q) => {
                    const alternativaCorreta = q.alternativas.find(a => a.correta);
                    return (
                      <div 
                        key={q.numero} 
                        className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg"
                      >
                        <span className="font-semibold text-success">Q{q.numero}</span>
                        <span className="text-lg font-bold text-success">{alternativaCorreta?.letra || '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Modo Completo: questão + todas alternativas
              <div className="overflow-y-auto flex-1 space-y-4 pr-2">
                {gabaritoQuestoes.map((q) => (
                  <div key={q.numero} className="border rounded-lg p-4 bg-muted/50">
                    <p className="font-semibold text-foreground mb-3">
                      {q.numero}. {q.pergunta}
                    </p>
                    <div className="space-y-2">
                      {q.alternativas.map((alt) => (
                        <div 
                          key={alt.letra}
                          className={`p-2 rounded-md text-sm ${
                            alt.correta 
                              ? 'bg-success/10 border border-success/30 text-success font-medium' 
                              : 'bg-white border border-border text-muted-foreground'
                          }`}
                        >
                          <span className="font-semibold">{alt.letra})</span> {alt.texto}
                          {alt.correta && (
                            <span className="ml-2 text-xs bg-success text-white px-2 py-0.5 rounded">
                              CORRETA
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Registrar Prova */}
      <Dialog open={registrarProvaDialogOpen} onOpenChange={setRegistrarProvaDialogOpen}>
        <DialogContent 
          className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Registrar Prova
            </DialogTitle>
            <DialogDescription>
              Registrar prova manualmente para um colaborador
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 flex-1 overflow-y-auto space-y-4">
            {/* Seleção de tipo de prova */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Tipo de Prova</Label>
                <select
                  className="w-full p-2 border border-border rounded-md text-sm bg-background text-foreground"
                  value={registrarProvaTipo}
                  onChange={(e) => {
                    const tipo = e.target.value as 'pre_teste' | 'pos_teste';
                    setRegistrarProvaTipo(tipo);
                    setRegistrarProvaColaboradorId('');
                    fetchColaboradoresSemProva(tipo);
                  }}
                >
                  <option value="pre_teste">Pré-Teste</option>
                  <option value="pos_teste">Pós-Teste</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Colaborador</Label>
                <select
                  className="w-full p-2 border border-border rounded-md text-sm bg-background text-foreground"
                  value={registrarProvaColaboradorId}
                  onChange={(e) => setRegistrarProvaColaboradorId(e.target.value)}
                >
                  <option value="">Selecione um colaborador...</option>
                  {colaboradoresSemProva.map((c) => (
                    <option key={c.colaborador_id} value={c.colaborador_id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                {colaboradoresSemProva.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Todos os colaboradores já fizeram esta prova
                  </p>
                )}
              </div>
            </div>

            {/* Seleção de modo */}
            {registrarProvaColaboradorId && !registrarProvaMode && !fluxoPosTesteCompleto && (
              <div className="bg-muted/50 border rounded-lg p-4">
                <p className="text-sm font-medium mb-3">Como deseja registrar a prova?</p>
                <div className={`grid gap-3 ${registrarProvaTipo === 'pos_teste' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {/* Fluxo Completo - apenas para Pós-Teste */}
                  {registrarProvaTipo === 'pos_teste' && (
                    <Button
                      variant="default"
                      className="h-auto py-4 flex flex-col items-center gap-2 bg-primary"
                      onClick={() => setFluxoPosTesteCompleto(true)}
                    >
                      <Award className="h-6 w-6" />
                      <span className="font-medium">Fluxo Completo (Recomendado)</span>
                      <span className="text-xs opacity-80">Prova → Resultado → Reorientação → Assinatura → Avaliação</span>
                    </Button>
                  )}
                  <div className={`grid grid-cols-2 gap-3 ${registrarProvaTipo === 'pos_teste' ? 'mt-2' : ''}`}>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => setRegistrarProvaMode('todas')}
                    >
                      <ClipboardList className="h-6 w-6 text-primary" />
                      <span className="font-medium">Registrar Todas</span>
                      <span className="text-xs text-muted-foreground">Responder todas as questões</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => {
                        setRegistrarProvaMode('incorretas');
                        setRegistrarProvaIncorretas([]);
                      }}
                    >
                      <XCircle className="h-6 w-6 text-destructive" />
                      <span className="font-medium">Registrar Incorretas</span>
                      <span className="text-xs text-muted-foreground">Apenas as questões erradas</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Fluxo Completo do Pós-Teste */}
            {fluxoPosTesteCompleto && registrarProvaColaboradorId && turma && (
              <FluxoPosTesteCompleto
                turmaId={turmaId!}
                colaboradorId={registrarProvaColaboradorId}
                colaboradorNome={colaboradoresSemProva.find(c => c.colaborador_id === registrarProvaColaboradorId)?.nome || ''}
                colaboradorCpf={colaboradoresTurma.find(c => c.colaborador_id === registrarProvaColaboradorId)?.cpf || ''}
                treinamentoId={turma.treinamento_id}
                treinamentoNome={turma.treinamento_nome}
                treinamentoNorma={turma.treinamento_norma}
                clienteNome={turma.cliente_nome}
                dataInicio={turma.data_inicio}
                questoes={registrarProvaQuestoes}
                onComplete={() => {
                  setRegistrarProvaDialogOpen(false);
                  setFluxoPosTesteCompleto(false);
                  setRegistrarProvaColaboradorId('');
                  fetchColaboradoresTurma();
                  fetchProvas();
                }}
                onCancel={() => {
                  setFluxoPosTesteCompleto(false);
                }}
              />
            )}

            {/* Modo: Registrar Todas */}
            {registrarProvaMode === 'todas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Responda todas as questões:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRegistrarProvaMode(null)}
                  >
                    Voltar
                  </Button>
                </div>
                
                {loadingRegistrarProva ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {registrarProvaQuestoes.map((q) => (
                      <div key={q.id} className="border rounded-lg p-4 bg-white">
                        <p className="font-medium text-sm mb-3">
                          {q.numero}. {q.pergunta}
                        </p>
                        <div className="space-y-2">
                          {q.alternativas.map((alt) => (
                            <label
                              key={alt.id}
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm ${
                                registrarProvaRespostas[q.id] === alt.id
                                  ? 'bg-primary/10 border border-primary/30'
                                  : 'bg-muted/50 hover:bg-muted'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`questao-${q.id}`}
                                checked={registrarProvaRespostas[q.id] === alt.id}
                                onChange={() => setRegistrarProvaRespostas(prev => ({
                                  ...prev,
                                  [q.id]: alt.id
                                }))}
                                className="text-primary"
                              />
                              <span className="font-medium">{alt.letra})</span> {alt.texto}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Respondidas: {Object.keys(registrarProvaRespostas).length}/{registrarProvaQuestoes.length}
                  </p>
                  {registrarProvaQuestoes.length === 0 && (
                    <p className="text-xs text-destructive mb-2">
                      Não há questões cadastradas para este treinamento. Cadastre as questões primeiro.
                    </p>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleSaveRegistrarProva}
                    disabled={
                      savingRegistrarProva || 
                      registrarProvaQuestoes.length === 0 ||
                      Object.keys(registrarProvaRespostas).length !== registrarProvaQuestoes.length
                    }
                  >
                    {savingRegistrarProva ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Salvar Prova
                  </Button>
                </div>
              </div>
            )}

            {/* Modo: Registrar Incorretas */}
            {registrarProvaMode === 'incorretas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Selecione as questões incorretas:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRegistrarProvaMode(null)}
                  >
                    Voltar
                  </Button>
                </div>

                <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                  <p className="text-xs text-success">
                    As questões não selecionadas serão consideradas corretas automaticamente.
                  </p>
                </div>

                {loadingRegistrarProva ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registrarProvaIncorretas.map((item, index) => {
                      const questaoSelecionada = registrarProvaQuestoes.find(q => q.id === item.questaoId);
                      const alternativasIncorretas = questaoSelecionada?.alternativas.filter(a => !a.correta) || [];
                      
                      return (
                        <div key={index} className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-destructive mb-1 block">Questão</Label>
                              <select
                                className="w-full p-2 border border-border rounded-md text-sm bg-background text-foreground"
                                value={item.questaoId}
                                onChange={(e) => handleUpdateRegistrarProvaIncorreta(index, 'questaoId', e.target.value)}
                              >
                                <option value="">Selecione...</option>
                                {registrarProvaQuestoes.map((q) => {
                                  const jaSelecionada = registrarProvaIncorretas.some(
                                    (inc, i) => i !== index && inc.questaoId === q.id
                                  );
                                  return (
                                    <option 
                                      key={q.id} 
                                      value={q.id}
                                      disabled={jaSelecionada}
                                    >
                                      {q.numero}. {q.pergunta.substring(0, 40)}...
                                      {jaSelecionada ? ' (já selecionada)' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs text-destructive mb-1 block">Alternativa Incorreta</Label>
                              <select
                                className="w-full p-2 border border-border rounded-md text-sm bg-background text-foreground"
                                value={item.alternativaId}
                                onChange={(e) => handleUpdateRegistrarProvaIncorreta(index, 'alternativaId', e.target.value)}
                                disabled={!item.questaoId}
                              >
                                <option value="">Selecione...</option>
                                {alternativasIncorretas.map((alt) => (
                                  <option key={alt.id} value={alt.id}>
                                    {alt.letra}) {alt.texto.substring(0, 30)}...
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 mt-5"
                            onClick={() => handleRemoveRegistrarProvaIncorreta(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddRegistrarProvaIncorreta}
                      disabled={registrarProvaIncorretas.length >= registrarProvaQuestoes.length}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Incorreta
                    </Button>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Questões incorretas: {registrarProvaIncorretas.filter(i => i.questaoId && i.alternativaId).length} | 
                    Nota prevista: {registrarProvaQuestoes.length > 0 
                      ? ((registrarProvaQuestoes.length - registrarProvaIncorretas.filter(i => i.questaoId && i.alternativaId).length) / registrarProvaQuestoes.length * 10).toFixed(1)
                      : '0.0'
                    }
                  </p>
                  {registrarProvaQuestoes.length === 0 && (
                    <p className="text-xs text-destructive mb-2">
                      Não há questões cadastradas para este treinamento. Cadastre as questões primeiro.
                    </p>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleSaveRegistrarProva}
                    disabled={savingRegistrarProva || registrarProvaQuestoes.length === 0}
                  >
                    {savingRegistrarProva ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Salvar Prova
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Avaliação de Reação */}
      <Dialog open={avaliacaoReacaoDialogOpen} onOpenChange={setAvaliacaoReacaoDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Avaliação de Reação
            </DialogTitle>
            <DialogDescription>
              {selectedColaboradorAvaliacao?.nome} - Responda a avaliação de reação do treinamento
            </DialogDescription>
          </DialogHeader>
          
          {selectedColaboradorAvaliacao && turma && (
            <AvaliacaoReacaoForm
              turmaId={turma.id}
              colaboradorId={selectedColaboradorAvaliacao.colaborador_id}
              treinamentoId={turma.treinamento_id}
              onComplete={() => {
                setAvaliacaoReacaoDialogOpen(false);
                toast.success('Avaliação de reação registrada com sucesso!');
                fetchColaboradoresTurma();
              }}
              onSkip={() => {
                setAvaliacaoReacaoDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Registrar Sinistro */}
      <Dialog open={sinistroDialogOpen} onOpenChange={setSinistroDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Registrar Sinistro
            </DialogTitle>
            <DialogDescription>
              Registre uma ocorrência que resultará na reprovação do colaborador. Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Colaborador */}
            <div className="space-y-2">
              <Label htmlFor="sinistro-colaborador">Colaborador *</Label>
              <Select value={sinistroColaboradorId} onValueChange={setSinistroColaboradorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradoresTurma.map((colaborador) => (
                    <SelectItem key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome} - {formatCPF(colaborador.cpf)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Motivo/Tipo de Sinistro */}
            <div className="space-y-2">
              <Label htmlFor="sinistro-motivo">Motivo *</Label>
              <Select value={sinistroTipoId} onValueChange={setSinistroTipoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposSinistro.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sinistroTipoId && (
                <p className="text-xs text-muted-foreground mt-1">
                  {tiposSinistro.find(t => t.id === sinistroTipoId)?.descricao}
                </p>
              )}
            </div>

            {/* Ação */}
            <div className="space-y-2">
              <Label htmlFor="sinistro-acao">Ação</Label>
              <Select value={sinistroAcao} onValueChange={setSinistroAcao}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reprovacao">Reprovar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O colaborador será automaticamente reprovado ao registrar o sinistro
              </p>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="sinistro-descricao">Descrição *</Label>
              <Textarea
                id="sinistro-descricao"
                placeholder="Descreva detalhadamente o ocorrido, incluindo informações que corroboram o sinistro..."
                value={sinistroDescricao}
                onChange={(e) => setSinistroDescricao(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 20 caracteres. {sinistroDescricao.length}/20
              </p>
            </div>

            {/* Anexos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Anexos (até 3 fotos)</Label>
                <span className="text-xs text-muted-foreground">{sinistroFotos.length}/3</span>
              </div>
              
              {/* Lista de fotos */}
              {sinistroFotos.length > 0 && (
                <div className="space-y-3">
                  {sinistroFotos.map((foto, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-muted/50">
                      <div className="flex gap-3">
                        <div className="relative">
                          <img 
                            src={foto.preview} 
                            alt={`Anexo ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSinistroFoto(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <Label className="text-xs">Descrição da imagem</Label>
                            <Input
                              placeholder="Descreva o que a imagem mostra..."
                              value={foto.descricao}
                              onChange={(e) => {
                                const newFotos = [...sinistroFotos];
                                newFotos[index].descricao = e.target.value;
                                setSinistroFotos(newFotos);
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Data da foto</Label>
                            <Input
                              type="datetime-local"
                              value={foto.data_captura}
                              onChange={(e) => {
                                const newFotos = [...sinistroFotos];
                                newFotos[index].data_captura = e.target.value;
                                setSinistroFotos(newFotos);
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botão adicionar foto */}
              {sinistroFotos.length < 3 && (
                <div>
                  <input
                    ref={sinistroFotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAddSinistroFoto(file);
                      if (sinistroFotoInputRef.current) sinistroFotoInputRef.current.value = '';
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => sinistroFotoInputRef.current?.click()}
                    className="w-full border-dashed"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Adicionar Foto
                  </Button>
                </div>
              )}
            </div>

            {/* Aviso */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm text-destructive">
                  <p className="font-semibold mb-1">Atenção!</p>
                  <p>
                    Ao registrar este sinistro, o colaborador selecionado será 
                    automaticamente <strong>reprovado</strong> nesta turma, independentemente de suas notas nas provas.
                  </p>
                  <p className="mt-2">
                    Colaboradores reprovados por sinistro <strong>não poderão</strong> ter certificados gerados.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSinistroDialogOpen(false)} disabled={savingSinistro}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveSinistro} 
              disabled={savingSinistro || !sinistroColaboradorId || !sinistroTipoId || sinistroDescricao.length < 20}
              className="bg-destructive hover:bg-destructive/90"
            >
              {savingSinistro ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Registrar Sinistro
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Sinistro */}
      <Dialog open={sinistroDetalheDialogOpen} onOpenChange={setSinistroDetalheDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Detalhes do Sinistro
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre a ocorrência registrada
            </DialogDescription>
          </DialogHeader>

          {selectedSinistroDetalhe && (
            <div className="space-y-6 py-4">
              {/* Informações do Sinistro */}
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <h3 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Informações do Sinistro
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-destructive font-medium">Motivo:</span>
                    <p className="text-destructive font-semibold">{selectedSinistroDetalhe.sinistro.tipo_sinistro?.nome || 'Não especificado'}</p>
                  </div>
                  <div>
                    <span className="text-destructive font-medium">Ação:</span>
                    <p className="text-destructive font-semibold capitalize">{selectedSinistroDetalhe.sinistro.acao === 'reprovacao' ? 'Reprovação' : selectedSinistroDetalhe.sinistro.acao}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-destructive font-medium">Data/Hora do Registro:</span>
                    <p className="text-destructive">{format(parseISO(selectedSinistroDetalhe.sinistro.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
                {selectedSinistroDetalhe.sinistro.descricao && (
                  <div className="mt-4">
                    <span className="text-destructive font-medium">Descrição:</span>
                    <p className="text-destructive mt-1 bg-white rounded p-3 border border-destructive/20">
                      {selectedSinistroDetalhe.sinistro.descricao}
                    </p>
                  </div>
                )}
              </div>

              {/* Fotos do Sinistro */}
              {selectedSinistroDetalhe.sinistro.fotos && selectedSinistroDetalhe.sinistro.fotos.length > 0 && (
                <div className="bg-muted/50 border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Fotos Anexadas ({selectedSinistroDetalhe.sinistro.fotos.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedSinistroDetalhe.sinistro.fotos.map((foto, idx) => (
                      <div key={foto.id} className="space-y-2">
                        <img 
                          src={foto.foto_url} 
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                          onClick={() => {
                            setImagemExpandida(foto.foto_url);
                            setImagemExpandidaNome(foto.descricao || `Foto do sinistro ${idx + 1}`);
                          }}
                        />
                        {foto.descricao && (
                          <p className="text-xs text-muted-foreground">{foto.descricao}</p>
                        )}
                        {foto.data_captura && (
                          <p className="text-xs text-muted-foreground">
                            Capturada em: {format(parseISO(foto.data_captura), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detalhes do Colaborador */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Detalhes do Colaborador
                </h3>
                <div className="flex items-start gap-4">
                  {/* Foto do colaborador */}
                  {selectedSinistroDetalhe.colaborador.foto_url ? (
                    <img 
                      src={selectedSinistroDetalhe.colaborador.foto_url} 
                      alt={selectedSinistroDetalhe.colaborador.nome}
                      className="w-24 h-24 rounded-lg object-cover border-2 border-primary/30 cursor-pointer hover:opacity-80"
                      onClick={() => {
                        setImagemExpandida(selectedSinistroDetalhe.colaborador.foto_url!);
                        setImagemExpandidaNome(`Foto de ${selectedSinistroDetalhe.colaborador.nome}`);
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center text-white font-bold text-3xl">
                      {selectedSinistroDetalhe.colaborador.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-primary/80 font-medium">Nome:</span>
                      <p className="text-primary font-semibold">{selectedSinistroDetalhe.colaborador.nome}</p>
                    </div>
                    <div>
                      <span className="text-primary/80 font-medium">CPF:</span>
                      <p className="text-primary">{formatCPF(selectedSinistroDetalhe.colaborador.cpf)}</p>
                    </div>
                    <div>
                      <span className="text-primary/80 font-medium">Matrícula:</span>
                      <p className="text-primary">{selectedSinistroDetalhe.colaborador.matricula || '-'}</p>
                    </div>
                    <div>
                      <span className="text-primary/80 font-medium">Status:</span>
                      <Badge className="bg-destructive/10 text-destructive border-destructive/30">Reprovado por Sinistro</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalhes do Instrutor */}
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Registrado por (Instrutor)
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground font-medium">Nome:</span>
                    <p className="text-foreground font-semibold">{selectedSinistroDetalhe.instrutor?.nome || 'Não identificado'}</p>
                  </div>
                  {selectedSinistroDetalhe.instrutor?.email && (
                    <div>
                      <span className="text-muted-foreground font-medium">Email:</span>
                      <p className="text-foreground">{selectedSinistroDetalhe.instrutor.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detalhes da Turma */}
              {turma && (
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                  <h3 className="font-semibold text-warning mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Detalhes da Turma
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-warning/80 font-medium">Código:</span>
                      <p className="text-warning font-semibold">{turma.codigo_turma || `#${turma.numero_turma}`}</p>
                    </div>
                    <div>
                      <span className="text-warning/80 font-medium">Treinamento:</span>
                      <p className="text-warning">{turma.treinamento?.nome || '-'}</p>
                    </div>
                    <div>
                      <span className="text-warning/80 font-medium">Data Início:</span>
                      <p className="text-warning">{turma.data_inicio ? format(parseISO(turma.data_inicio), "dd/MM/yyyy", { locale: ptBR }) : '-'}</p>
                    </div>
                    <div>
                      <span className="text-warning/80 font-medium">Data Fim:</span>
                      <p className="text-warning">{turma.data_fim ? format(parseISO(turma.data_fim), "dd/MM/yyyy", { locale: ptBR }) : '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detalhes das Empresas */}
              <div className="grid grid-cols-2 gap-4">
                {/* Empresa SST */}
                {turma?.empresa && (
                  <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                    <h3 className="font-semibold text-success mb-3 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Empresa SST
                    </h3>
                    <div className="text-sm space-y-1">
                      <p className="text-success font-semibold">{turma.empresa.nome}</p>
                      {turma.empresa.cnpj && (
                        <p className="text-success text-xs">CNPJ: {turma.empresa.cnpj}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Empresa Cliente */}
                {turma?.cliente && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Empresa Cliente
                    </h3>
                    <div className="text-sm space-y-1">
                      <p className="text-primary font-semibold">{turma.cliente.nome}</p>
                      {turma.cliente.cnpj && (
                        <p className="text-primary/80 text-xs">CNPJ: {turma.cliente.cnpj}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setSinistroDetalheDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Validação de Certificados em Lote */}
      <Dialog open={validacaoDialogOpen} onOpenChange={setValidacaoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-success" />
              Validar Certificados
            </DialogTitle>
            <DialogDescription>
              Selecione como deseja validar os certificados dos colaboradores aprovados
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Tipo de validação */}
            <div className="space-y-2">
              <Label>Tipo de Validação</Label>
              <Select value={validacaoTipo} onValueChange={(v: 'todos' | 'selecao' | 'exceto') => setValidacaoTipo(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Validar Todos os Aprovados</SelectItem>
                  <SelectItem value="selecao">Validar Apenas Selecionados</SelectItem>
                  <SelectItem value="exceto">Validar Todos Exceto Selecionados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lista de colaboradores para seleção */}
            {(validacaoTipo === 'selecao' || validacaoTipo === 'exceto') && (
              <div className="space-y-2">
                <Label>
                  {validacaoTipo === 'selecao' 
                    ? 'Selecione os colaboradores para validar:' 
                    : 'Selecione os colaboradores para EXCLUIR da validação:'}
                </Label>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {colaboradoresTurma
                    .filter(c => c.nota_pos_teste !== null && c.nota_pos_teste >= 7 && !sinistrosColaboradores[c.id])
                    .map((colaborador) => {
                      const jaValidado = certificadosValidados.includes(colaborador.colaborador_id);
                      return (
                        <div 
                          key={colaborador.colaborador_id}
                          className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${jaValidado ? 'bg-success/5' : ''}`}
                        >
                          <Checkbox
                            checked={colaboradoresSelecionados.includes(colaborador.colaborador_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setColaboradoresSelecionados([...colaboradoresSelecionados, colaborador.colaborador_id]);
                              } else {
                                setColaboradoresSelecionados(colaboradoresSelecionados.filter(id => id !== colaborador.colaborador_id));
                              }
                            }}
                            disabled={jaValidado}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{colaborador.nome}</p>
                            <p className="text-xs text-muted-foreground">{formatCPF(colaborador.cpf)}</p>
                          </div>
                          {jaValidado && (
                            <Badge className="bg-success/10 text-success border-success/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Já validado
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Resumo */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Resumo:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Total de aprovados (sem sinistro): {colaboradoresTurma.filter(c => c.nota_pos_teste !== null && c.nota_pos_teste >= 7 && !sinistrosColaboradores[c.id]).length}</li>
                <li>• Já validados: {certificadosValidados.length}</li>
                <li>• Pendentes de validação: {colaboradoresTurma.filter(c => c.nota_pos_teste !== null && c.nota_pos_teste >= 7 && !sinistrosColaboradores[c.id] && !certificadosValidados.includes(c.colaborador_id)).length}</li>
                {validacaoTipo === 'selecao' && (
                  <li>• Selecionados para validar: {colaboradoresSelecionados.filter(id => !certificadosValidados.includes(id)).length}</li>
                )}
                {validacaoTipo === 'exceto' && (
                  <li>• Serão validados: {colaboradoresTurma.filter(c => c.nota_pos_teste !== null && c.nota_pos_teste >= 7 && !certificadosValidados.includes(c.colaborador_id) && !colaboradoresSelecionados.includes(c.colaborador_id)).length}</li>
                )}
              </ul>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-primary">
              <strong>Validar Certificados:</strong> Clique em "Abrir Todos os Certificados" para abrir cada certificado em uma nova aba. 
              Em cada aba, clique em "Validar" para gerar e salvar o PDF.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setValidacaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-success hover:bg-success/90 text-white"
              onClick={handleAbrirTodosCertificados}
            >
              <Eye className="h-4 w-4 mr-2" />
              Abrir Todos os Certificados
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Finalização da Turma */}
      <Dialog open={finalizarTurmaDialogOpen} onOpenChange={setFinalizarTurmaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="bg-success/10 rounded-full p-2">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              Finalizar Turma
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="bg-success/5 border border-success/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <h4 className="font-semibold text-success">Turma pronta para finalização!</h4>
                  <p className="text-sm text-success mt-1">
                    Todos os requisitos foram atendidos e a turma pode ser finalizada.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resumo da Turma
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Código:</span>
                  <span className="font-medium">{turma?.codigo_turma || `#${turma?.numero_turma}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participantes:</span>
                  <span className="font-medium">{colaboradoresTurma.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aprovados:</span>
                  <span className="font-medium text-success">{colaboradoresTurma.filter(c => c.resultado === 'aprovado').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Certificados:</span>
                  <span className="font-medium text-success">{Object.keys(certificadosData).length}</span>
                </div>
              </div>
            </div>

            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <h4 className="font-semibold text-warning">Atenção</h4>
                  <p className="text-sm text-warning/80 mt-1">
                    Após finalizar, o status da turma será alterado para <strong>"Concluído"</strong>. 
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setFinalizarTurmaDialogOpen(false)}
              disabled={finalizandoTurma}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-success hover:bg-success/90"
              onClick={handleFinalizarTurma}
              disabled={finalizandoTurma}
            >
              {finalizandoTurma ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Finalização
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de assinatura simples (sem reconhecimento facial) */}
      <Dialog open={simpleSignatureDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setSimpleSignature(null);
          setSelectedColaboradorSimple(null);
        }
        setSimpleSignatureDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Registrar Presença
            </DialogTitle>
            <DialogDescription>
              {selectedColaboradorSimple?.colaboradorNome} - {selectedColaboradorSimple?.dataAula ? format(parseISO(selectedColaboradorSimple.dataAula), "dd/MM/yyyy") : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Assine abaixo para confirmar a presença do colaborador nesta aula.
            </p>
            {savingSimplePresenca ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Salvando presença...</p>
              </div>
            ) : (
              <SignaturePad
                onSave={(signature) => {
                  handleSaveSimplePresenca(signature);
                }}
                onCancel={() => {
                  setSimpleSignatureDialogOpen(false);
                  setSelectedColaboradorSimple(null);
                  setSimpleSignature(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Validação Digital */}
      <Dialog open={validacaoDigitalDialogOpen} onOpenChange={setValidacaoDigitalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Validação Digital de Certificados
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code para validar digitalmente os certificados desta turma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {validacaoDigitalLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Gerando link de validação...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-xl border-2 border-primary/20 shadow-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(validacaoDigitalUrl)}`}
                    alt="QR Code de validação digital"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  O colaborador deve escanear este QR Code, informar seu CPF e data do treinamento, e responder perguntas de verificação para visualizar seu certificado.
                </p>
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCopyLink(validacaoDigitalUrl, 'validacao-digital')}
                  >
                    {copiedLink === 'validacao-digital' ? (
                      <>
                        <Check className="h-4 w-4 mr-1.5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1.5" />
                        Copiar Link
                      </>
                    )}
                  </Button>
                  <Button 
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(validacaoDigitalUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Abrir Link
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Visualizar Prova - Preview A4 paginado */}
      <Dialog open={provaViewerOpen} onOpenChange={setProvaViewerOpen}>
        <DialogContent className="max-w-[720px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-4 pb-2 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              Visualizar Prova
            </DialogTitle>
            <DialogDescription className="text-xs">
              {provaViewerData?.colaborador?.nome} — {provaViewerData?.tipo_prova === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'}
            </DialogDescription>
          </DialogHeader>

          {loadingProvaViewer ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : provaViewerData && (() => {
            const total = provaViewerQuestoes.length;
            const checkVF = (alts: any[]) => alts.length === 2 && alts.every((a: any) => ['V', 'F'].includes(a.letra));

            const pages = provaViewerPages.length > 0 ? provaViewerPages : [{ start: 0, end: total }];
            const totalViewerPages = pages.length;
            const currentSlice = pages[Math.min(provaViewerPage, pages.length - 1)];
            const sliceStart = currentSlice.start;
            const sliceEnd = currentSlice.end;
            const questoesPagina = provaViewerQuestoes.slice(sliceStart, sliceEnd);

            // Componente de questão reutilizável (usado tanto na medição quanto na exibição)
            const renderQuestao = (questao: any, measureAttr?: boolean) => {
              const resp = provaViewerData.respostas?.[questao.id];
              const acertou = resp?.acertou;
              const letraResp = resp?.resposta;
              const alts = (questao.alternativas || []).sort((a: any, b: any) => a.letra.localeCompare(b.letra));
              const vf = checkVF(alts);

              return (
                <div key={questao.id} {...(measureAttr ? { 'data-question-measure': true } : {})} style={{ border: `1px solid ${acertou ? '#bbf7d0' : '#fecaca'}`, borderRadius: '6px', marginBottom: '6px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', padding: '4px 6px', background: acertou ? '#f0fdf4' : '#fef2f2' }}>
                    <span style={{ fontSize: '8px', fontWeight: 700, borderRadius: '50%', width: '14px', height: '14px', minWidth: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0px',
                      background: acertou ? '#dcfce7' : '#fee2e2', color: acertou ? '#15803d' : '#b91c1c',
                    }}>{questao.numero}</span>
                    <span style={{ fontSize: '9px', fontWeight: 500, flex: 1, lineHeight: '14px' }}>{questao.pergunta}</span>
                    <span style={{ fontSize: '7px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', flexShrink: 0, whiteSpace: 'nowrap', height: '14px', lineHeight: '12px', display: 'flex', alignItems: 'center',
                      background: acertou ? '#dcfce7' : '#fee2e2', color: acertou ? '#15803d' : '#b91c1c',
                    }}>{acertou ? '✓ CORRETA' : '✗ ERRADA'}</span>
                  </div>
                  <div style={{ padding: '3px 6px 4px', display: 'flex', flexWrap: 'wrap', gap: vf ? '4px' : '2px', flexDirection: vf ? 'row' : 'column' }}>
                    {alts.map((alt: any) => {
                      const isResp = alt.letra === letraResp;
                      const isCor = alt.correta;
                      let bg = 'transparent', bc = '#e5e7eb', tc = '#374151';
                      if (isResp && isCor) { bg = '#f0fdf4'; bc = '#86efac'; tc = '#15803d'; }
                      else if (isResp && !isCor) { bg = '#fef2f2'; bc = '#fca5a5'; tc = '#b91c1c'; }
                      else if (isCor) { bg = '#f0fdf4'; bc = '#86efac'; tc = '#15803d'; }
                      return (
                        <div key={alt.id} style={{
                          display: 'flex', alignItems: 'center', gap: '3px', padding: vf ? '2px 8px' : '2px 6px',
                          borderRadius: '3px', fontSize: '9px', border: `1px solid ${bc}`, background: bg, color: tc,
                          flex: vf ? '1 1 45%' : undefined,
                        }}>
                          <strong style={{ width: '12px', textAlign: 'center' }}>{alt.letra})</strong>
                          <span style={{ flex: 1 }}>{alt.texto}</span>
                          {isResp && <span style={{ fontSize: '7px', fontWeight: 700, whiteSpace: 'nowrap' }}>{isCor ? '✓' : '✗ sua'}</span>}
                          {!isResp && isCor && <span style={{ fontSize: '7px', fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            };

            // Header reutilizável
            const logoSrc = whiteLabelConfig?.logoUrl || null;
            const renderHeader = (refProp?: React.Ref<HTMLDivElement>) => (
              <div ref={refProp} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', paddingBottom: '5px', borderBottom: '2px solid #ff7a00' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {logoSrc && <img src={logoSrc} alt="Logo" crossOrigin="anonymous" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ff7a00' }}>
                        {provaViewerData.tipo_prova === 'pre_teste' ? 'PRÉ-TESTE' : 'PÓS-TESTE'}
                      </div>
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>Avaliação de Conhecimento</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '8px', color: '#6b7280' }}>
                    <div style={{ fontWeight: 600, color: '#374151' }}>{format(parseISO(provaViewerData.created_at), "dd/MM/yyyy", { locale: ptBR })}</div>
                    <div>{format(parseISO(provaViewerData.created_at), "HH:mm", { locale: ptBR })}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 12px', fontSize: '8.5px', marginBottom: '6px', padding: '5px 8px', background: '#f9fafb', borderRadius: '5px', border: '1px solid #e5e7eb' }}>
                  <div><span style={{ color: '#6b7280' }}>Colaborador: </span><strong>{provaViewerData.colaborador?.nome || '-'}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>CPF: </span><span style={{ fontFamily: 'monospace' }}>{provaViewerData.colaborador?.cpf ? formatCPF(provaViewerData.colaborador.cpf) : '-'}</span></div>
                  <div><span style={{ color: '#6b7280' }}>Empresa Cliente: </span><strong>{turma?.cliente?.nome || turma?.cliente_nome || '-'}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>Empresa Prestadora: </span><strong>{turma?.empresa?.nome || empresa?.nome || '-'}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>Instrutor: </span>{turma?.instrutor_nome || '-'}</div>
                  <div><span style={{ color: '#6b7280' }}>Turma: </span>{turma?.codigo_turma || '-'}</div>
                  <div><span style={{ color: '#6b7280' }}>Treinamento: </span>{turma?.treinamento_nome || '-'}</div>
                  <div><span style={{ color: '#6b7280' }}>Origem: </span>{provaViewerData.origem === 'instrutor' ? 'Instrutor' : 'QR Code'}</div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '5px 10px', borderRadius: '5px',
                  border: `1px solid ${provaViewerData.acertos >= 7 ? '#bbf7d0' : '#fecaca'}`,
                  background: provaViewerData.acertos >= 7 ? '#f0fdf4' : '#fef2f2',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontSize: '8px', color: '#6b7280' }}>Nota:</span>
                    <strong style={{ fontSize: '16px', color: provaViewerData.acertos >= 7 ? '#16a34a' : '#dc2626', lineHeight: 1 }}>{provaViewerData.acertos}</strong>
                  </div>
                  <div style={{ width: '1px', height: '16px', background: provaViewerData.acertos >= 7 ? '#bbf7d0' : '#fecaca' }} />
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontSize: '8px', color: '#6b7280' }}>Acertos:</span>
                    <strong style={{ fontSize: '11px', color: '#374151' }}>{provaViewerData.acertos}/{provaViewerData.total_questoes}</strong>
                  </div>
                  <div style={{ width: '1px', height: '16px', background: provaViewerData.acertos >= 7 ? '#bbf7d0' : '#fecaca' }} />
                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.03em',
                    background: provaViewerData.acertos >= 7 ? '#dcfce7' : '#fee2e2',
                    color: provaViewerData.acertos >= 7 ? '#15803d' : '#b91c1c',
                  }}>{provaViewerData.acertos >= 7 ? 'APROVADO' : 'REPROVADO'}</span>
                </div>
              </div>
            );

            return (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Container oculto para medição - renderiza header e todas as questões com mesma largura A4 */}
                <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '523px', fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial', fontSize: '10px', lineHeight: '1.4', color: '#1f2937' }}>
                  {renderHeader(provaViewerHeaderRef)}
                  <div ref={provaViewerMeasureRef}>
                    {provaViewerQuestoes.map((q) => renderQuestao(q, true))}
                  </div>
                </div>

                {/* Navegação */}
                <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border-b flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setProvaViewerPage(p => Math.max(0, p - 1))} disabled={provaViewerPage === 0}>
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-[11px] font-medium">Página {provaViewerPage + 1} de {totalViewerPages}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setProvaViewerPage(p => Math.min(totalViewerPages - 1, p + 1))} disabled={provaViewerPage >= totalViewerPages - 1}>
                      <ArrowLeft className="h-3 w-3 rotate-180" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={handleGerarProvaPDF} disabled={generatingProvaPDF}>
                    {generatingProvaPDF ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                    {generatingProvaPDF ? 'Gerando...' : 'Salvar PDF'}
                  </Button>
                </div>

                {/* Página A4 */}
                <div className="flex-1 overflow-auto p-3 flex justify-center bg-muted/30">
                  <div ref={provaViewerA4Ref} data-prova-a4="true" className="bg-white flex-shrink-0 flex flex-col" style={{
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)',
                    width: '595px', height: '842px', padding: '32px 36px',
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
                    fontSize: '10px', lineHeight: '1.4', color: '#1f2937', boxSizing: 'border-box', overflow: 'hidden',
                  }}>
                    {/* Header - p1 only */}
                    {provaViewerPage === 0 && renderHeader()}

                    {/* Mini-header p2+ */}
                    {provaViewerPage > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', marginBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {logoSrc && <img src={logoSrc} alt="Logo" crossOrigin="anonymous" style={{ height: '18px', width: 'auto', objectFit: 'contain' }} />}
                          <span style={{ fontSize: '9px', fontWeight: 700, color: '#ff7a00' }}>
                            {provaViewerData.tipo_prova === 'pre_teste' ? 'PRÉ-TESTE' : 'PÓS-TESTE'} — {provaViewerData.colaborador?.nome}
                          </span>
                        </div>
                        <span style={{ fontSize: '8px', color: '#9ca3af' }}>
                          {format(parseISO(provaViewerData.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}

                    {/* Questões */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 700, marginBottom: '6px' }}>
                        Questões {sliceStart + 1} a {sliceEnd} de {total}
                      </div>
                      {questoesPagina.map((q) => renderQuestao(q, false))}
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: 'auto', paddingTop: '5px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7px', color: '#9ca3af' }}>
                      <span>Página {provaViewerPage + 1} de {totalViewerPages}</span>
                      <span style={{ textAlign: 'right' }}>
                        {turma?.empresa?.nome || empresa?.nome || ''}{turma?.empresa?.cnpj ? ` — CNPJ: ${turma.empresa.cnpj}` : empresa?.cnpj ? ` — CNPJ: ${empresa.cnpj}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Colaborador */}
      <Dialog open={editColaboradorDialogOpen} onOpenChange={setEditColaboradorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Editar Colaborador
            </DialogTitle>
            <DialogDescription>
              Altere os dados do colaborador
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Foto do colaborador - só exibir se reconhecimento facial estiver ativo */}
            {reconhecimentoFacialAtivo && (
              <>
                {editColaboradorData?.foto_url ? (
                  <div className="flex justify-center">
                    <div className="relative">
                      <img 
                        src={editColaboradorData.foto_url} 
                        alt="Foto do colaborador"
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                      />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-success rounded-full flex items-center justify-center border-2 border-white">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                      <User className="w-12 h-12 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={editColaboradorNome}
                onChange={(e) => setEditColaboradorNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cpf">CPF</Label>
              <Input
                id="edit-cpf"
                value={editColaboradorCpf}
                onChange={(e) => {
                  // Formatar CPF enquanto digita
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 11) {
                    const formatted = value
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    setEditColaboradorCpf(formatted);
                  }
                }}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditColaboradorDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEditColaborador}
              disabled={savingEditColaborador}
            >
              {savingEditColaborador ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para apagar presença de um colaborador em um dia */}
      <AlertDialog open={apagarPresencaDialogOpen} onOpenChange={(open) => {
        setApagarPresencaDialogOpen(open);
        if (!open) {
          setDataPresencaApagar(null);
          setColaboradorParaRemover(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarX className="h-5 w-5 text-warning" />
              Apagar Presença
            </AlertDialogTitle>
            <AlertDialogDescription>
              Selecione a data para apagar a presença de <strong>{colaboradorParaRemover?.nome}</strong>.
              Isso irá remover a assinatura e foto de validação deste dia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label htmlFor="data-apagar">Data da Aula</Label>
            <Select value={dataPresencaApagar || ''} onValueChange={setDataPresencaApagar}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione uma data" />
              </SelectTrigger>
              <SelectContent>
                {datasAulas.map((data) => (
                  <SelectItem key={data} value={data}>
                    {format(parseISO(data), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApagarPresencaDia}
              disabled={!dataPresencaApagar || apagandoPresenca}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {apagandoPresenca ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Apagando...
                </>
              ) : (
                <>
                  <CalendarX className="h-4 w-4 mr-2" />
                  Apagar Presença
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para remover colaborador da turma */}
      <AlertDialog open={removerColaboradorDialogOpen} onOpenChange={setRemoverColaboradorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-destructive" />
              Remover Colaborador da Turma
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{colaboradorParaRemover?.nome}</strong> desta turma?
              <br /><br />
              Esta ação irá remover:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Todas as presenças registradas</li>
                <li>Todas as provas realizadas</li>
                <li>Avaliações de reação</li>
                <li>Certificados gerados</li>
              </ul>
              <br />
              <strong className="text-destructive">Esta ação não pode ser desfeita.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setColaboradorParaRemover(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoverColaboradorTurma}
              disabled={removendoColaborador}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removendoColaborador ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remover da Turma
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para apagar prova */}
      <AlertDialog open={apagarProvaDialogOpen} onOpenChange={(open) => {
        setApagarProvaDialogOpen(open);
        if (!open) {
          setProvaParaApagar(null);
          setApagarProvaOpcoes({
            apagarReorientacao: false,
            apagarAvaliacaoReacao: false,
            apagarAssinaturaCertificado: false,
          });
          setApagarProvaEtapa(1);
          setApagarProvaMotivo('');
          setApagarProvaMotivoOutro('');
          setApagarProvaConfirmacao('');
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Apagar {provaParaApagar?.tipo_prova === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'}
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                Etapa {apagarProvaEtapa}/2
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {/* Etapa 1: Motivo e opções */}
                {apagarProvaEtapa === 1 && (
                  <>
                    <p>
                      Você está prestes a apagar o {provaParaApagar?.tipo_prova === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'} de <strong>{provaParaApagar?.colaborador_nome}</strong>.
                    </p>
                    
                    <div className="mt-4 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="motivo-apagar" className="text-sm font-medium text-foreground">
                          Motivo da exclusão <span className="text-destructive">*</span>
                        </Label>
                        <Select value={apagarProvaMotivo} onValueChange={setApagarProvaMotivo}>
                          <SelectTrigger id="motivo-apagar" className="w-full">
                            <SelectValue placeholder="Selecione o motivo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preencheu_com_erro">Preencheu com erro</SelectItem>
                            <SelectItem value="nao_assinou_certificado">Não assinou o certificado</SelectItem>
                            <SelectItem value="pos_teste_momento_errado">Fez o pós-teste no momento errado</SelectItem>
                            <SelectItem value="prova_duplicada">Prova duplicada</SelectItem>
                            <SelectItem value="colaborador_errado">Colaborador errado</SelectItem>
                            <SelectItem value="outro">Outro motivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {apagarProvaMotivo === 'outro' && (
                        <div className="space-y-2">
                          <Label htmlFor="motivo-outro" className="text-sm font-medium text-foreground">
                            Descreva o motivo <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            id="motivo-outro"
                            placeholder="Digite o motivo da exclusão..."
                            value={apagarProvaMotivoOutro}
                            onChange={(e) => setApagarProvaMotivoOutro(e.target.value)}
                            className="min-h-[80px]"
                          />
                        </div>
                      )}
                    </div>
                    
                    {provaParaApagar?.tipo_prova === 'pos_teste' && (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-medium text-foreground">
                          Deseja também apagar os dados relacionados?
                        </p>
                        
                        <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
                          {provaTemDadosRelacionados.temReorientacao && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="apagar-reorientacao"
                                checked={apagarProvaOpcoes.apagarReorientacao}
                                onCheckedChange={(checked) => 
                                  setApagarProvaOpcoes(prev => ({ ...prev, apagarReorientacao: !!checked }))
                                }
                              />
                              <label
                                htmlFor="apagar-reorientacao"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                Apagar Reorientação
                              </label>
                            </div>
                          )}
                          
                          {provaTemDadosRelacionados.temAvaliacaoReacao && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="apagar-avaliacao"
                                checked={apagarProvaOpcoes.apagarAvaliacaoReacao}
                                onCheckedChange={(checked) => 
                                  setApagarProvaOpcoes(prev => ({ ...prev, apagarAvaliacaoReacao: !!checked }))
                                }
                              />
                              <label
                                htmlFor="apagar-avaliacao"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                Apagar Avaliação de Reação
                              </label>
                            </div>
                          )}
                          
                          {provaTemDadosRelacionados.temAssinaturaCertificado && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="apagar-assinatura"
                                checked={apagarProvaOpcoes.apagarAssinaturaCertificado}
                                onCheckedChange={(checked) => 
                                  setApagarProvaOpcoes(prev => ({ ...prev, apagarAssinaturaCertificado: !!checked }))
                                }
                              />
                              <label
                                htmlFor="apagar-assinatura"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                Apagar Assinatura do Certificado
                              </label>
                            </div>
                          )}
                          
                          {!provaTemDadosRelacionados.temReorientacao && 
                           !provaTemDadosRelacionados.temAvaliacaoReacao && 
                           !provaTemDadosRelacionados.temAssinaturaCertificado && (
                            <p className="text-sm text-muted-foreground italic">
                              Nenhum dado relacionado encontrado.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Etapa 2: Confirmação */}
                {apagarProvaEtapa === 2 && (
                  <>
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="space-y-2">
                          <p className="font-medium text-destructive">Atenção! Esta ação é irreversível.</p>
                          <p className="text-sm">
                            Você está prestes a apagar o {provaParaApagar?.tipo_prova === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'} de <strong>{provaParaApagar?.colaborador_nome}</strong>.
                          </p>
                          {provaParaApagar?.tipo_prova === 'pos_teste' && (
                            <ul className="text-sm list-disc list-inside space-y-1 mt-2">
                              {apagarProvaOpcoes.apagarReorientacao && <li>A reorientação será apagada</li>}
                              {apagarProvaOpcoes.apagarAvaliacaoReacao && <li>A avaliação de reação será apagada</li>}
                              {apagarProvaOpcoes.apagarAssinaturaCertificado && <li>A assinatura do certificado será apagada</li>}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmacao-apagar" className="text-sm font-medium text-foreground">
                        Para confirmar, digite: <span className="font-mono bg-muted px-2 py-0.5 rounded text-destructive">tenho ciência e desejo apagar</span>
                      </Label>
                      <Input
                        id="confirmacao-apagar"
                        placeholder="Digite a frase de confirmação..."
                        value={apagarProvaConfirmacao}
                        onChange={(e) => setApagarProvaConfirmacao(e.target.value)}
                        onPaste={(e) => e.preventDefault()}
                        onDrop={(e) => e.preventDefault()}
                        autoComplete="off"
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        * Copiar e colar está desabilitado. Digite a frase manualmente.
                      </p>
                    </div>
                    
                    <p className="mt-4 text-sm text-muted-foreground">
                      Após apagar, o colaborador poderá refazer a prova.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            {apagarProvaEtapa === 1 ? (
              <>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <Button
                  onClick={() => setApagarProvaEtapa(2)}
                  disabled={!apagarProvaMotivo || (apagarProvaMotivo === 'outro' && !apagarProvaMotivoOutro.trim())}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Continuar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setApagarProvaEtapa(1)}>
                  Voltar
                </Button>
                <AlertDialogAction
                  onClick={handleConfirmarApagarProva}
                  disabled={apagandoProva || apagarProvaConfirmacao.toLowerCase().trim() !== 'tenho ciência e desejo apagar'}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {apagandoProva ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Apagando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Apagar Prova
                    </>
                  )}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de opções para foto do colaborador (Câmera ou Galeria) */}
      <Dialog open={fotoOpcaoDialogOpen} onOpenChange={(open) => {
        setFotoOpcaoDialogOpen(open);
        if (!open) setFotoOpcaoColaboradorId(null);
      }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Camera className="h-5 w-5 text-primary" />
              Adicionar Foto
            </DialogTitle>
            <DialogDescription>
              Escolha como deseja adicionar a foto do colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="default"
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                if (fotoOpcaoColaboradorId) {
                  abrirCameraFotoColaborador(fotoOpcaoColaboradorId);
                }
              }}
            >
              <Camera className="h-5 w-5" />
              Tirar Foto com a Câmera
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                setFotoOpcaoDialogOpen(false);
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (ev) => {
                  const file = (ev.target as HTMLInputElement).files?.[0];
                  if (file && fotoOpcaoColaboradorId) {
                    handleUploadFotoColaborador(fotoOpcaoColaboradorId, file);
                  }
                };
                input.click();
              }}
            >
              <Upload className="h-5 w-5" />
              Escolher da Galeria
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog da Câmera para foto do colaborador */}
      <Dialog open={cameraFotoDialogOpen} onOpenChange={(open) => {
        if (!open) fecharCameraFotoColaborador();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Camera className="h-5 w-5 text-primary" />
              Capturar Foto
            </DialogTitle>
            <DialogDescription>
              Posicione o rosto do colaborador na câmera e clique em capturar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <video 
                ref={cameraFotoVideoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
              />
              {!cameraFotoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <canvas ref={cameraFotoCanvasRef} className="hidden" />
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={fecharCameraFotoColaborador}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={capturarFotoColaborador}
                disabled={!cameraFotoReady}
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== DIALOG FERRAMENTAS TI - APENAS jhony@vtreinamentos.com.br ========== */}
      {user?.email === 'jhony@vtreinamentos.com.br' && (
        <Dialog open={tiDialogOpen} onOpenChange={(open) => {
          setTiDialogOpen(open);
          if (!open) {
            setTiFerramentaAtiva(null);
            setTiAssinaturaOrigemSelecionada(null);
            setTiAssinaturaDestinoSelecionada(null);
            setTiColaboradorSelecionado(null);
            setTiConfirmacaoApagar('');
            setTiBuscaColaborador('');
            setTiBuscaAssinatura('');
          }
        }}>
          <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-700">
                {tiFerramentaAtiva === 'substituir-assinatura' && (
                  <>
                    <Replace className="h-5 w-5" />
                    Substituir Assinatura
                  </>
                )}
                {tiFerramentaAtiva === 'apagar-colaborador' && (
                  <>
                    <UserX className="h-5 w-5 text-red-600" />
                    <span className="text-red-700">Apagar Colaborador da Empresa</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {tiFerramentaAtiva === 'substituir-assinatura' && 
                  'Selecione uma assinatura de origem e copie para um destino. A assinatura original será mantida.'}
                {tiFerramentaAtiva === 'apagar-colaborador' && 
                  'Remova permanentemente um colaborador do cadastro da empresa cliente. Esta ação é irreversível.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto">
              {/* FERRAMENTA: Substituir Assinatura */}
              {tiFerramentaAtiva === 'substituir-assinatura' && (
                <div className="space-y-6">
                  {/* Filtros */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome..."
                        value={tiBuscaAssinatura}
                        onChange={(e) => setTiBuscaAssinatura(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Select value={tiFiltroTipoAssinatura} onValueChange={(v: any) => setTiFiltroTipoAssinatura(v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os tipos</SelectItem>
                        <SelectItem value="presenca">Lista de Presença</SelectItem>
                        <SelectItem value="reorientacao">Reorientação</SelectItem>
                        <SelectItem value="certificado">Certificado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        if (!turmaId) return;
                        setTiLoadingAssinaturas(true);
                        try {
                          const assinaturas: typeof tiAssinaturasOrigem = [];
                          
                          // Buscar assinaturas de presença
                          const { data: presencas } = await supabase
                            .from('turma_colaborador_presencas')
                            .select(`
                              id,
                              assinatura,
                              data_aula,
                              turma_colaboradores!inner(
                                id,
                                colaboradores(id, nome)
                              )
                            `)
                            .eq('turma_colaboradores.turma_id', turmaId)
                            .not('assinatura', 'is', null);
                          
                          presencas?.forEach((p: any) => {
                            if (p.assinatura) {
                              assinaturas.push({
                                id: p.id,
                                tipo: 'presenca',
                                colaborador_nome: p.turma_colaboradores?.colaboradores?.nome || 'Desconhecido',
                                colaborador_id: p.turma_colaboradores?.colaboradores?.id || '',
                                data: p.data_aula,
                                assinatura_url: p.assinatura
                              });
                            }
                          });

                          // Buscar assinaturas de reorientação
                          const { data: reorientacoes } = await supabase
                            .from('reorientacoes_colaborador')
                            .select(`
                              id,
                              assinatura_digital,
                              created_at,
                              turma_colaboradores!inner(
                                id,
                                turma_id,
                                colaboradores(id, nome)
                              )
                            `)
                            .eq('turma_colaboradores.turma_id', turmaId)
                            .not('assinatura_digital', 'is', null);
                          
                          reorientacoes?.forEach((r: any) => {
                            if (r.assinatura_digital) {
                              assinaturas.push({
                                id: r.id,
                                tipo: 'reorientacao',
                                colaborador_nome: r.turma_colaboradores?.colaboradores?.nome || 'Desconhecido',
                                colaborador_id: r.turma_colaboradores?.colaboradores?.id || '',
                                data: r.created_at,
                                assinatura_url: r.assinatura_digital
                              });
                            }
                          });

                          // Buscar assinaturas de certificado
                          const { data: certificados } = await supabase
                            .from('turma_colaboradores')
                            .select(`
                              id,
                              assinatura_certificado,
                              colaboradores(id, nome)
                            `)
                            .eq('turma_id', turmaId)
                            .not('assinatura_certificado', 'is', null);
                          
                          certificados?.forEach((c: any) => {
                            if (c.assinatura_certificado) {
                              assinaturas.push({
                                id: c.id,
                                tipo: 'certificado',
                                colaborador_nome: c.colaboradores?.nome || 'Desconhecido',
                                colaborador_id: c.colaboradores?.id || '',
                                assinatura_url: c.assinatura_certificado
                              });
                            }
                          });

                          setTiAssinaturasOrigem(assinaturas);
                          toast.success(`${assinaturas.length} assinaturas encontradas`);
                        } catch (error) {
                          console.error('Erro ao carregar assinaturas:', error);
                          toast.error('Erro ao carregar assinaturas');
                        } finally {
                          setTiLoadingAssinaturas(false);
                        }
                      }}
                      disabled={tiLoadingAssinaturas}
                    >
                      {tiLoadingAssinaturas ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                      Carregar Assinaturas
                    </Button>
                  </div>

                  {/* Grid de seleção */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Coluna ORIGEM */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50">ORIGEM</Badge>
                        Selecione a assinatura de origem
                      </h3>
                      <div className="border rounded-lg max-h-[50vh] overflow-auto">
                        {tiAssinaturasOrigem
                          .filter(a => tiFiltroTipoAssinatura === 'todos' || a.tipo === tiFiltroTipoAssinatura)
                          .filter(a => !tiBuscaAssinatura || a.colaborador_nome.toLowerCase().includes(tiBuscaAssinatura.toLowerCase()))
                          .map((assinatura) => (
                          <div 
                            key={`origem-${assinatura.id}-${assinatura.tipo}`}
                            className={`p-3 border-b cursor-pointer hover:bg-muted/50 flex items-center gap-3 ${
                              tiAssinaturaOrigemSelecionada === `${assinatura.id}-${assinatura.tipo}` ? 'bg-blue-50 border-blue-300' : ''
                            }`}
                            onClick={() => setTiAssinaturaOrigemSelecionada(`${assinatura.id}-${assinatura.tipo}`)}
                          >
                            <div className="w-16 h-12 border rounded bg-white flex items-center justify-center overflow-hidden">
                              <img src={assinatura.assinatura_url} alt="Assinatura" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{assinatura.colaborador_nome}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {assinatura.tipo === 'presenca' && 'Presença'}
                                  {assinatura.tipo === 'reorientacao' && 'Reorientação'}
                                  {assinatura.tipo === 'certificado' && 'Certificado'}
                                </Badge>
                                {assinatura.data && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(assinatura.data), 'dd/MM/yyyy', { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {tiAssinaturaOrigemSelecionada === `${assinatura.id}-${assinatura.tipo}` && (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        ))}
                        {tiAssinaturasOrigem.length === 0 && (
                          <p className="p-4 text-center text-muted-foreground">
                            Clique em "Carregar Assinaturas" para listar
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Coluna DESTINO */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50">DESTINO</Badge>
                        Selecione onde aplicar
                      </h3>
                      <div className="border rounded-lg max-h-[50vh] overflow-auto">
                        {tiAssinaturasOrigem
                          .filter(a => tiFiltroTipoAssinatura === 'todos' || a.tipo === tiFiltroTipoAssinatura)
                          .filter(a => !tiBuscaAssinatura || a.colaborador_nome.toLowerCase().includes(tiBuscaAssinatura.toLowerCase()))
                          .map((assinatura) => (
                          <div 
                            key={`destino-${assinatura.id}-${assinatura.tipo}`}
                            className={`p-3 border-b cursor-pointer hover:bg-muted/50 flex items-center gap-3 ${
                              tiAssinaturaDestinoSelecionada === `${assinatura.id}-${assinatura.tipo}` ? 'bg-green-50 border-green-300' : ''
                            }`}
                            onClick={() => setTiAssinaturaDestinoSelecionada(`${assinatura.id}-${assinatura.tipo}`)}
                          >
                            <div className="w-16 h-12 border rounded bg-white flex items-center justify-center overflow-hidden">
                              {assinatura.assinatura_url ? (
                                <img src={assinatura.assinatura_url} alt="Assinatura" className="max-w-full max-h-full object-contain" />
                              ) : (
                                <span className="text-xs text-muted-foreground">Vazio</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{assinatura.colaborador_nome}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {assinatura.tipo === 'presenca' && 'Presença'}
                                  {assinatura.tipo === 'reorientacao' && 'Reorientação'}
                                  {assinatura.tipo === 'certificado' && 'Certificado'}
                                </Badge>
                                {assinatura.data && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(assinatura.data), 'dd/MM/yyyy', { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {tiAssinaturaDestinoSelecionada === `${assinatura.id}-${assinatura.tipo}` && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                        ))}
                        {tiAssinaturasOrigem.length === 0 && (
                          <p className="p-4 text-center text-muted-foreground">
                            Clique em "Carregar Assinaturas" para listar
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botão de Substituir */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setTiDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!tiAssinaturaOrigemSelecionada || !tiAssinaturaDestinoSelecionada) {
                          toast.error('Selecione origem e destino');
                          return;
                        }
                        
                        // Extrair ID e tipo corretamente (o tipo está após o último hífen)
                        const origemLastHyphen = tiAssinaturaOrigemSelecionada.lastIndexOf('-');
                        const origemId = tiAssinaturaOrigemSelecionada.substring(0, origemLastHyphen);
                        const origemTipo = tiAssinaturaOrigemSelecionada.substring(origemLastHyphen + 1);
                        
                        const destinoLastHyphen = tiAssinaturaDestinoSelecionada.lastIndexOf('-');
                        const destinoId = tiAssinaturaDestinoSelecionada.substring(0, destinoLastHyphen);
                        const destinoTipo = tiAssinaturaDestinoSelecionada.substring(destinoLastHyphen + 1);
                        
                        const origem = tiAssinaturasOrigem.find(a => a.id === origemId && a.tipo === origemTipo);
                        if (!origem) {
                          toast.error('Assinatura de origem não encontrada');
                          return;
                        }

                        setTiSubstituindoAssinatura(true);
                        try {
                          let updateResult;
                          
                          if (destinoTipo === 'presenca') {
                            updateResult = await supabase
                              .from('turma_colaborador_presencas')
                              .update({ assinatura: origem.assinatura_url })
                              .eq('id', destinoId);
                          } else if (destinoTipo === 'reorientacao') {
                            updateResult = await supabase
                              .from('reorientacoes_colaborador')
                              .update({ assinatura_digital: origem.assinatura_url })
                              .eq('id', destinoId);
                          } else if (destinoTipo === 'certificado') {
                            updateResult = await supabase
                              .from('turma_colaboradores')
                              .update({ assinatura_certificado: origem.assinatura_url })
                              .eq('id', destinoId);
                          }

                          if (updateResult?.error) throw updateResult.error;

                          // Log de auditoria
                          await logUpdate('ti_substituir_assinatura', destinoId, {
                            origem_id: origemId,
                            origem_tipo: origemTipo,
                            destino_id: destinoId,
                            destino_tipo: destinoTipo,
                            turma_id: turmaId
                          });

                          toast.success('Assinatura substituída com sucesso!');
                          setTiAssinaturaOrigemSelecionada(null);
                          setTiAssinaturaDestinoSelecionada(null);
                        } catch (error) {
                          console.error('Erro ao substituir assinatura:', error);
                          toast.error('Erro ao substituir assinatura');
                        } finally {
                          setTiSubstituindoAssinatura(false);
                        }
                      }}
                      disabled={!tiAssinaturaOrigemSelecionada || !tiAssinaturaDestinoSelecionada || tiSubstituindoAssinatura}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {tiSubstituindoAssinatura ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Substituindo...</>
                      ) : (
                        <><Replace className="h-4 w-4 mr-2" /> Substituir Assinatura</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* FERRAMENTA: Apagar Colaborador da Empresa */}
              {tiFerramentaAtiva === 'apagar-colaborador' && (
                <div className="space-y-6">
                  {/* Busca */}
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou CPF..."
                        value={tiBuscaColaborador}
                        onChange={(e) => setTiBuscaColaborador(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        if (!turmaId || !turma?.empresa_cliente_id) return;
                        setTiLoadingColaboradores(true);
                        try {
                          const { data, error } = await supabase
                            .from('colaboradores')
                            .select(`
                              id,
                              nome,
                              cpf,
                              empresa_id,
                              empresas(nome_fantasia)
                            `)
                            .eq('empresa_id', turma.empresa_cliente_id)
                            .order('nome');

                          if (error) throw error;

                          setTiColaboradoresEmpresa((data || []).map((c: any) => ({
                            id: c.id,
                            nome: c.nome,
                            cpf: c.cpf || '',
                            empresa_nome: c.empresas?.nome_fantasia || 'Empresa',
                            empresa_id: c.empresa_id
                          })));
                          
                          toast.success(`${data?.length || 0} colaboradores encontrados`);
                        } catch (error) {
                          console.error('Erro ao carregar colaboradores:', error);
                          toast.error('Erro ao carregar colaboradores');
                        } finally {
                          setTiLoadingColaboradores(false);
                        }
                      }}
                      disabled={tiLoadingColaboradores}
                    >
                      {tiLoadingColaboradores ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                      Carregar Colaboradores
                    </Button>
                  </div>

                  {/* Lista de colaboradores */}
                  <div className="border rounded-lg max-h-[40vh] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Empresa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tiColaboradoresEmpresa
                          .filter(c => 
                            !tiBuscaColaborador || 
                            c.nome.toLowerCase().includes(tiBuscaColaborador.toLowerCase()) ||
                            c.cpf.includes(tiBuscaColaborador)
                          )
                          .map((colaborador) => (
                          <TableRow 
                            key={colaborador.id}
                            className={`cursor-pointer ${tiColaboradorSelecionado === colaborador.id ? 'bg-red-50' : ''}`}
                            onClick={() => setTiColaboradorSelecionado(colaborador.id)}
                          >
                            <TableCell>
                              {tiColaboradorSelecionado === colaborador.id && (
                                <CheckCircle className="h-5 w-5 text-red-600" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{colaborador.nome}</TableCell>
                            <TableCell>{colaborador.cpf}</TableCell>
                            <TableCell>{colaborador.empresa_nome}</TableCell>
                          </TableRow>
                        ))}
                        {tiColaboradoresEmpresa.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Clique em "Carregar Colaboradores" para listar
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Confirmação */}
                  {tiColaboradorSelecionado && (
                    <Card className="border-red-300 bg-red-50">
                      <CardContent className="pt-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-800">Confirmar exclusão permanente</p>
                            <p className="text-sm text-red-700 mt-1">
                              Você está prestes a apagar permanentemente o colaborador <strong>{tiColaboradoresEmpresa.find(c => c.id === tiColaboradorSelecionado)?.nome}</strong> da empresa.
                              Esta ação é <strong>IRREVERSÍVEL</strong> e removerá todos os dados associados.
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-red-700">Digite "APAGAR PERMANENTEMENTE" para confirmar:</Label>
                          <Input
                            value={tiConfirmacaoApagar}
                            onChange={(e) => setTiConfirmacaoApagar(e.target.value)}
                            placeholder="APAGAR PERMANENTEMENTE"
                            className="mt-2 border-red-300"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Botões */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setTiDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (!tiColaboradorSelecionado || tiConfirmacaoApagar !== 'APAGAR PERMANENTEMENTE') {
                          toast.error('Confirmação inválida');
                          return;
                        }

                        const colaborador = tiColaboradoresEmpresa.find(c => c.id === tiColaboradorSelecionado);
                        if (!colaborador) return;

                        setTiApagandoColaborador(true);
                        try {
                          // Apagar colaborador (cascade vai remover dependências)
                          const { error } = await supabase
                            .from('colaboradores')
                            .delete()
                            .eq('id', tiColaboradorSelecionado);

                          if (error) throw error;

                          // Log de auditoria
                          await logDelete('colaboradores', tiColaboradorSelecionado, {
                            nome: colaborador.nome,
                            cpf: colaborador.cpf,
                            empresa_id: colaborador.empresa_id,
                            acao: 'ti_apagar_colaborador_empresa'
                          });

                          toast.success(`Colaborador ${colaborador.nome} apagado com sucesso`);
                          setTiColaboradoresEmpresa(prev => prev.filter(c => c.id !== tiColaboradorSelecionado));
                          setTiColaboradorSelecionado(null);
                          setTiConfirmacaoApagar('');
                        } catch (error) {
                          console.error('Erro ao apagar colaborador:', error);
                          toast.error('Erro ao apagar colaborador. Verifique se não há dependências.');
                        } finally {
                          setTiApagandoColaborador(false);
                        }
                      }}
                      disabled={!tiColaboradorSelecionado || tiConfirmacaoApagar !== 'APAGAR PERMANENTEMENTE' || tiApagandoColaborador}
                    >
                      {tiApagandoColaborador ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Apagando...</>
                      ) : (
                        <><Trash2 className="h-4 w-4 mr-2" /> Apagar Colaborador</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
