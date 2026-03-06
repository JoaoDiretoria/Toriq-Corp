import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Building2, 
  MapPin, 
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Phone,
  Mail,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  BookTemplate,
  FolderOpen,
  Trash2,
  ImagePlus,
  Upload,
  RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ItemOrcamento {
  id: string;
  treinamentoId: string;
  treinamentoNome: string;
  tipo: 'formacao' | 'reciclagem';
  cargaHoraria: number;
  precoUnitario: number;
  quantidade: number;
  // Campos adicionais
  norma?: string;
  natureza?: string;
  categoria?: string;
  classificacao?: string;
  formaCobranca?: string;
}

interface DescontoPlano {
  tipo: 'percentual' | 'valor';
  valor: number;
  valorDesconto: number;
  totalComDesconto: number;
}

interface DadosCalculadora {
  empresa?: string;
  cidadeDestino?: string;
  estadoOrigem?: string;
  cidadeOrigem?: string;
  km?: number;
  itensPorPlano?: Record<'OURO' | 'PRATA' | 'BRONZE', ItemOrcamento[]>;
  totais?: {
    ouro: number;
    prata: number;
    bronze: number;
  };
  descontos?: {
    ouro: DescontoPlano;
    prata: DescontoPlano;
    bronze: DescontoPlano;
  };
}

interface ClienteInfo {
  nome?: string;
  razaoSocial?: string;
  cnpj?: string;
  cidade?: string;
  contato?: string;
  email?: string;
  telefone?: string;
}

interface EmpresaSSTInfo {
  nome?: string;
  razaoSocial?: string;
  cnpj?: string;
  telefone?: string;
  logoUrl?: string;
}

interface VendedorInfo {
  nome?: string;
  email?: string;
  telefone?: string;
}

interface PropostaComercialEditorProps {
  onClose: () => void;
  dadosCalculadora?: DadosCalculadora | null;
  clienteNome?: string;
  clienteCidade?: string;
  clienteContato?: string;
  clienteInfo?: ClienteInfo;
  empresaSSTInfo?: EmpresaSSTInfo;
  vendedorInfo?: VendedorInfo;
  cardId?: string;
  tipoOrcamento?: 'treinamento_normativo' | 'servicos_sst' | 'vertical365';
  propostaExistente?: any; // Proposta já salva (readonly mode)
  onSaveProposta?: (propostaId: string) => void;
}

const PLANOS = ['OURO', 'PRATA', 'BRONZE'] as const;
type Plano = typeof PLANOS[number];

const PLAN_COLORS: Record<Plano, string> = {
  OURO: '#f6b100',
  PRATA: '#94a3b8',
  BRONZE: '#d18b4c'
};

const fmtBRL = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const parseDateBR = (isoDate: string) => {
  try {
    const d = isoDate ? new Date(isoDate + "T12:00:00") : new Date();
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
  } catch { return "—"; }
};

const parseDateTimeBR = () => {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
  } catch { return "—"; }
};

// Gerar identificador único para proposta: SIGLA + ANOMESDIAHRMNS
const gerarIdentificadorProposta = (nomeEmpresa: string): string => {
  const now = new Date();
  const sigla = nomeEmpresa
    .split(' ')
    .filter(p => p.length > 2)
    .slice(0, 3)
    .map(p => p[0].toUpperCase())
    .join('') || 'PRO';
  
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');
  const hr = String(now.getHours()).padStart(2, '0');
  const mn = String(now.getMinutes()).padStart(2, '0');
  const sg = String(now.getSeconds()).padStart(2, '0');
  
  return `${sigla}${ano}${mes}${dia}${hr}${mn}${sg}`;
};

// Máscaras de formatação
const maskCNPJ = (value: string) => {
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  let masked = cleaned;
  if (cleaned.length > 2) masked = cleaned.slice(0, 2) + '.' + cleaned.slice(2);
  if (cleaned.length > 5) masked = cleaned.slice(0, 2) + '.' + cleaned.slice(2, 5) + '.' + cleaned.slice(5);
  if (cleaned.length > 8) masked = cleaned.slice(0, 2) + '.' + cleaned.slice(2, 5) + '.' + cleaned.slice(5, 8) + '/' + cleaned.slice(8);
  if (cleaned.length > 12) masked = cleaned.slice(0, 2) + '.' + cleaned.slice(2, 5) + '.' + cleaned.slice(5, 8) + '/' + cleaned.slice(8, 12) + '-' + cleaned.slice(12);
  return masked;
};

const maskPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  let masked = cleaned;
  if (cleaned.length > 0) masked = '(' + cleaned;
  if (cleaned.length > 2) masked = '(' + cleaned.slice(0, 2) + ') ' + cleaned.slice(2);
  if (cleaned.length > 7) masked = '(' + cleaned.slice(0, 2) + ') ' + cleaned.slice(2, 7) + '-' + cleaned.slice(7);
  return masked;
};

// Componente para renderizar markdown no preview A4
function MarkdownContent({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div className={`prose-sm max-w-none ${className}`} style={{ fontSize: 'inherit', lineHeight: 'inherit' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p style={{ margin: '2px 0' }}>{children}</p>,
          ul: ({ children }) => <ul style={{ listStyleType: 'disc', paddingLeft: '16px', margin: '2px 0' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ listStyleType: 'decimal', paddingLeft: '16px', margin: '2px 0' }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: '1px 0' }}>{children}</li>,
          strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          h1: ({ children }) => <p style={{ fontWeight: 700, fontSize: '1.1em', margin: '4px 0 2px' }}>{children}</p>,
          h2: ({ children }) => <p style={{ fontWeight: 700, fontSize: '1.05em', margin: '4px 0 2px' }}>{children}</p>,
          h3: ({ children }) => <p style={{ fontWeight: 700, margin: '3px 0 1px' }}>{children}</p>,
          img: ({ src, alt }) => (
            <img src={src} alt={alt || ''} style={{ display: 'block', maxWidth: '100%', maxHeight: '580px', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: '4px', margin: '4px auto' }} crossOrigin="anonymous" />
          ),
          a: ({ href, children }) => <a href={href} style={{ color: '#ff7a00', textDecoration: 'underline' }}>{children}</a>,
          blockquote: ({ children }) => <blockquote style={{ borderLeft: '2px solid #ff7a00', paddingLeft: '8px', margin: '4px 0', opacity: 0.8 }}>{children}</blockquote>,
          table: ({ children }) => (
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0', fontSize: 'inherit' }}>{children}</table>
          ),
          thead: ({ children }) => (
            <thead style={{ backgroundColor: '#f3f4f6' }}>{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>{children}</tr>
          ),
          th: ({ children }) => (
            <th style={{ padding: '3px 6px', textAlign: 'left', fontWeight: 700, fontSize: '0.9em', borderBottom: '2px solid #d1d5db', whiteSpace: 'nowrap' }}>{children}</th>
          ),
          td: ({ children }) => (
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function PropostaComercialEditor({
  onClose,
  dadosCalculadora,
  clienteNome = '',
  clienteCidade = '',
  clienteContato = '',
  clienteInfo,
  empresaSSTInfo,
  vendedorInfo,
  cardId,
  tipoOrcamento = 'treinamento_normativo',
  propostaExistente,
  onSaveProposta
}: PropostaComercialEditorProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef<HTMLDivElement>(null);
  const [streamH, setStreamH] = useState(0);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [salvandoProposta, setSalvandoProposta] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<Set<Plano>>(new Set(['OURO', 'PRATA', 'BRONZE']));
  const [currentPage, setCurrentPage] = useState(0);
  const [statusProposta, setStatusProposta] = useState<'aguardando' | 'aprovada' | 'rejeitada'>('aguardando');
  const [propostaId, setPropostaId] = useState<string | null>(propostaExistente?.id || null);
  const [propostaSalva, setPropostaSalva] = useState(false);
  
  // Modo somente leitura - apenas após salvar uma NOVA proposta (não quando visualiza existente)
  const isReadOnly = propostaSalva && !propostaExistente;
  const { user, empresa } = useAuth();
  const empresaId = empresa?.id;
  
  // Estado para dados carregados
  const [logoUrl, setLogoUrl] = useState<string | null>(empresaSSTInfo?.logoUrl || null);
  const [identificadorProposta, setIdentificadorProposta] = useState('');
  const [empresaSST, setEmpresaSST] = useState({
    nome: empresaSSTInfo?.nome || empresa?.nome || '',
    razaoSocial: empresaSSTInfo?.razaoSocial || '',
    cnpj: empresaSSTInfo?.cnpj || '',
    telefone: empresaSSTInfo?.telefone || '',
    endereco: '',
    bairro: '',
    cidade: '',
    cep: '',
    uf: ''
  });
  const [vendedor, setVendedor] = useState({
    nome: vendedorInfo?.nome || user?.user_metadata?.nome || '',
    email: vendedorInfo?.email || user?.email || '',
    telefone: vendedorInfo?.telefone || ''
  });

  // Estado para modelos/templates
  const [showSaveModelDialog, setShowSaveModelDialog] = useState(false);
  const [showLoadModelDialog, setShowLoadModelDialog] = useState(false);
  const [modelName, setModelName] = useState('');
  const [savingModel, setSavingModel] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelos, setModelos] = useState<any[]>([]);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [activeModelName, setActiveModelName] = useState<string>('');
  const [updatingModel, setUpdatingModel] = useState(false);
  const modelSnapshotRef = useRef<string | null>(null);

  // Estado para imagens inline
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estado do formulário - TODOS os títulos e conteúdos são editáveis
  const [formData, setFormData] = useState({
    // Dados do Cliente
    clienteEmpresa: dadosCalculadora?.empresa || clienteNome || clienteInfo?.nome || '',
    clienteRazaoSocial: clienteInfo?.razaoSocial || '',
    clienteCnpj: clienteInfo?.cnpj || '',
    clienteContato: clienteContato || clienteInfo?.contato || '',
    clienteEmail: clienteInfo?.email || '',
    clienteTelefone: clienteInfo?.telefone || '',
    clienteEndereco: '',
    clienteBairro: '',
    clienteCidade: dadosCalculadora?.cidadeDestino || clienteCidade || clienteInfo?.cidade || '',
    clienteCep: '',
    clienteUf: '',
    clienteDistancia: dadosCalculadora?.km?.toString() || '',
    dataProposta: todayISO(),
    validadeDias: '10',
    
    // Títulos editáveis
    titulo: 'Proposta Comercial • Treinamentos NR',
    tituloModulo: '1) Módulo escolhido',
    tituloDores: '2) Dores que resolvemos',
    tituloSolucoes: '3) O que você ganha',
    tituloDiferenciais: '4) Diferenciais',
    tituloInvestimento: '5) Investimento',
    tituloPagamento: '6) Condições de pagamento',
    tituloPassos: '7) Próximos passos',
    
    // Conteúdos
    descricao: 'Proposta de treinamentos normativos com entrega profissional, certificação e documentação completa.',
    modulo: 'Treinamentos NR • In Company',
    publico: 'Empresas com SST / RH',
    dores: `- Perda de controle de prazos e reciclagens
- Falta de rastreabilidade e evidências
- Retrabalho com planilhas e documentos
- Dificuldade em manter conformidade com NRs`,
    solucoes: `- Centralização e padronização de processos
- Evidências prontas para auditoria
- Certificados com validade e rastreabilidade
- Ganho de produtividade do time`,
    diferenciais: `- Conteúdo atualizado conforme legislação vigente
- Instrutores experientes e certificados
- Certificados + checklist + lista de presença
- Organização por turmas e cronograma
- Suporte técnico especializado`,
    pagamento: `- À vista: desconto a combinar
- Parcelamento: até 3x no cartão
- Faturamento: a combinar`,
    passos: `1) Aprovação da proposta e assinatura do contrato
2) Definição de cronograma e local
3) Execução / realização dos treinamentos
4) Entrega de evidências e certificados`
  });
  
  // Carregar dados da empresa SST e vendedor
  useEffect(() => {
    const loadEmpresaData = async () => {
      if (!empresaId) return;
      
      try {
        // Buscar dados da empresa SST (incluindo telefone)
        const { data: empresaData } = await (supabase as any)
          .from('empresas')
          .select('nome, nome_fantasia, razao_social, cnpj, telefone, endereco, numero, complemento, bairro, cidade, cep, estado')
          .eq('id', empresaId)
          .single();
        
        if (empresaData) {
          const endParts = [empresaData.endereco, empresaData.numero, empresaData.complemento].filter(Boolean);
          setEmpresaSST({
            nome: empresaData.nome_fantasia || empresaData.nome || '',
            razaoSocial: empresaData.razao_social || '',
            cnpj: empresaData.cnpj || '',
            telefone: empresaData.telefone || '',
            endereco: endParts.join(', '),
            bairro: empresaData.bairro || '',
            cidade: empresaData.cidade || '',
            cep: empresaData.cep || '',
            uf: empresaData.estado || ''
          });
          
          // Gerar identificador da proposta com base na empresa SST
          setIdentificadorProposta(gerarIdentificadorProposta(empresaData.nome || 'Proposta'));
        }
        
        // Buscar logo do white label
        const { data: whiteLabelData } = await (supabase as any)
          .from('white_label_config')
          .select('logo_url')
          .eq('empresa_id', empresaId)
          .single();
        
        if (whiteLabelData?.logo_url) {
          setLogoUrl(whiteLabelData.logo_url);
        }
        
        // Buscar dados do vendedor (usuário logado)
        if (user?.id) {
          // Primeiro buscar do profile
          const { data: profileData } = await (supabase as any)
            .from('profiles')
            .select('nome, email, telefone')
            .eq('id', user.id)
            .single();
          
          setVendedor({
            nome: profileData?.nome || user?.user_metadata?.nome || '',
            email: profileData?.email || user?.email || '',
            telefone: profileData?.telefone || ''
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
      }
    };
    
    loadEmpresaData();
  }, [empresaId, user]);

  // Atualizar dados quando receber da calculadora
  useEffect(() => {
    if (dadosCalculadora) {
      setFormData(prev => ({
        ...prev,
        clienteEmpresa: dadosCalculadora.empresa || prev.clienteEmpresa,
        clienteCidade: dadosCalculadora.cidadeDestino || prev.clienteCidade,
        clienteDistancia: dadosCalculadora.km?.toString() || prev.clienteDistancia,
      }));
    }
  }, [dadosCalculadora]);

  // Carregar dados da proposta existente
  useEffect(() => {
    if (propostaExistente) {
      // Definir identificador da proposta existente
      setIdentificadorProposta(propostaExistente.identificador || '');
      setStatusProposta(propostaExistente.status || 'aguardando');
      
      // Carregar planos selecionados
      if (propostaExistente.planos_selecionados) {
        setSelectedPlans(new Set(propostaExistente.planos_selecionados as Plano[]));
      }
      
      // Carregar dados do formulário - usar ?? para manter strings vazias salvas
      setFormData(prev => ({
        ...prev,
        clienteEmpresa: propostaExistente.cliente_empresa ?? prev.clienteEmpresa,
        clienteRazaoSocial: propostaExistente.cliente_razao_social ?? prev.clienteRazaoSocial,
        clienteCnpj: propostaExistente.cliente_cnpj ?? prev.clienteCnpj,
        clienteContato: propostaExistente.cliente_contato ?? prev.clienteContato,
        clienteEmail: propostaExistente.cliente_email ?? prev.clienteEmail,
        clienteTelefone: propostaExistente.cliente_telefone ?? prev.clienteTelefone,
        clienteCidade: propostaExistente.cliente_cidade ?? prev.clienteCidade,
        clienteDistancia: propostaExistente.cliente_distancia?.toString() ?? prev.clienteDistancia,
        dataProposta: propostaExistente.data_proposta ?? prev.dataProposta,
        validadeDias: propostaExistente.validade_dias?.toString() ?? prev.validadeDias,
        
        // Títulos
        titulo: propostaExistente.titulo ?? prev.titulo,
        tituloModulo: propostaExistente.titulo_modulo ?? prev.tituloModulo,
        tituloDores: propostaExistente.titulo_dores ?? prev.tituloDores,
        tituloSolucoes: propostaExistente.titulo_solucoes ?? prev.tituloSolucoes,
        tituloDiferenciais: propostaExistente.titulo_diferenciais ?? prev.tituloDiferenciais,
        tituloInvestimento: propostaExistente.titulo_investimento ?? prev.tituloInvestimento,
        tituloPagamento: propostaExistente.titulo_pagamento ?? prev.tituloPagamento,
        tituloPassos: propostaExistente.titulo_passos ?? prev.tituloPassos,
        
        // Conteúdos
        descricao: propostaExistente.descricao ?? prev.descricao,
        modulo: propostaExistente.modulo ?? prev.modulo,
        publico: propostaExistente.publico ?? prev.publico,
        dores: propostaExistente.dores ?? prev.dores,
        solucoes: propostaExistente.solucoes ?? prev.solucoes,
        diferenciais: propostaExistente.diferenciais ?? prev.diferenciais,
        pagamento: propostaExistente.pagamento ?? prev.pagamento,
        passos: propostaExistente.passos ?? prev.passos,
      }));
    }
  }, [propostaExistente]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Buscar dados do CNPJ via API pública
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const fetchCnpjData = async (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return;
    setFetchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);
      if (!res.ok) throw new Error('CNPJ não encontrado');
      const data = await res.json();
      const endParts = [data.logradouro, data.numero, data.complemento].filter(Boolean);
      setEmpresaSST(prev => ({
        ...prev,
        nome: data.nome_fantasia || data.razao_social || prev.nome,
        razaoSocial: data.razao_social || prev.razaoSocial,
        endereco: endParts.join(', '),
        bairro: data.bairro || '',
        cidade: data.municipio || '',
        cep: data.cep?.replace(/\D/g, '') || '',
        uf: data.uf || '',
        telefone: data.ddd_telefone_1?.replace(/\D/g, '') || prev.telefone,
      }));
      toast.success('Dados do CNPJ preenchidos!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar CNPJ');
    } finally {
      setFetchingCnpj(false);
    }
  };

  // Derivar se o formulário foi modificado comparando com snapshot do modelo
  const formModified = activeModelId && modelSnapshotRef.current
    ? JSON.stringify(formData) !== modelSnapshotRef.current
    : false;

  // ---- Funções de Modelos/Templates ----
  const templateFields = [
    'titulo', 'tituloModulo', 'tituloDores', 'tituloSolucoes', 'tituloDiferenciais',
    'tituloInvestimento', 'tituloPagamento', 'tituloPassos',
    'descricao', 'modulo', 'publico', 'dores', 'solucoes', 'diferenciais',
    'pagamento', 'passos'
  ] as const;

  const fieldToColumn: Record<string, string> = {
    titulo: 'titulo', tituloModulo: 'titulo_modulo', tituloDores: 'titulo_dores',
    tituloSolucoes: 'titulo_solucoes', tituloDiferenciais: 'titulo_diferenciais',
    tituloInvestimento: 'titulo_investimento', tituloPagamento: 'titulo_pagamento',
    tituloPassos: 'titulo_passos',
    descricao: 'descricao', modulo: 'modulo', publico: 'publico',
    dores: 'dores', solucoes: 'solucoes', diferenciais: 'diferenciais',
    pagamento: 'pagamento', passos: 'passos'
  };

  const handleSaveModel = async () => {
    if (!modelName.trim() || !empresaId) return;
    setSavingModel(true);
    try {
      const data: Record<string, any> = {
        empresa_id: empresaId,
        nome: modelName.trim(),
        tipo_orcamento: tipoOrcamento,
        planos_selecionados: Array.from(selectedPlans),
        created_by: user?.id,
      };
      templateFields.forEach(f => { data[fieldToColumn[f]] = formData[f]; });

      const { error } = await (supabase as any)
        .from('modelos_proposta_comercial')
        .insert(data);
      if (error) throw error;

      toast.success(`Modelo "${modelName.trim()}" salvo com sucesso!`);
      setShowSaveModelDialog(false);
      setModelName('');
    } catch (err: any) {
      console.error('Erro ao salvar modelo:', err);
      toast.error(err.message || 'Erro ao salvar modelo');
    } finally {
      setSavingModel(false);
    }
  };

  const handleUpdateModel = async () => {
    if (!activeModelId || !empresaId) return;
    setUpdatingModel(true);
    try {
      const data: Record<string, any> = {
        tipo_orcamento: tipoOrcamento,
        planos_selecionados: Array.from(selectedPlans),
      };
      templateFields.forEach(f => { data[fieldToColumn[f]] = formData[f]; });

      const { error } = await (supabase as any)
        .from('modelos_proposta_comercial')
        .update(data)
        .eq('id', activeModelId);
      if (error) throw error;

      modelSnapshotRef.current = JSON.stringify(formData);
      toast.success(`Modelo "${activeModelName}" atualizado com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao atualizar modelo:', err);
      toast.error(err.message || 'Erro ao atualizar modelo');
    } finally {
      setUpdatingModel(false);
    }
  };

  const handleLoadModels = async () => {
    if (!empresaId) return;
    setLoadingModels(true);
    setShowLoadModelDialog(true);
    try {
      const { data, error } = await (supabase as any)
        .from('modelos_proposta_comercial')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setModelos(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar modelos:', err);
      toast.error('Erro ao carregar modelos');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleApplyModel = (modelo: any) => {
    setFormData(prev => {
      const updated = { ...prev };
      templateFields.forEach(f => {
        const col = fieldToColumn[f];
        if (modelo[col] != null) {
          (updated as any)[f] = modelo[col];
        }
      });
      // Salvar snapshot do estado aplicado para detectar modificações
      modelSnapshotRef.current = JSON.stringify(updated);
      return updated;
    });
    // Restaurar planos selecionados do modelo
    if (modelo.planos_selecionados && Array.isArray(modelo.planos_selecionados) && modelo.planos_selecionados.length > 0) {
      setSelectedPlans(new Set(modelo.planos_selecionados as Plano[]));
    }
    setActiveModelId(modelo.id);
    setActiveModelName(modelo.nome);
    setCurrentPage(0);
    setShowLoadModelDialog(false);
    toast.success(`Modelo "${modelo.nome}" aplicado!`);
  };

  // Comprimir imagem e fazer upload para Supabase Storage
  const compressAndUploadImage = useCallback(async (file: File, targetField: string) => {
    if (!empresaId) return;
    setUploadingImage(true);
    try {
      // Comprimir imagem usando canvas
      const img = new Image();
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = dataUrl;
      });

      const canvas = document.createElement('canvas');
      const MAX_W = 800;
      const scale = img.width > MAX_W ? MAX_W / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.75);
      });

      // Upload para Supabase Storage
      const fileName = `propostas/imagens/${empresaId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const { error: uploadError } = await (supabase as any).storage
        .from('prospeccao-anexos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = (supabase as any).storage
        .from('prospeccao-anexos')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Não foi possível obter URL pública');

      // Inserir markdown de imagem no campo
      const markdownImg = `\n![imagem](${publicUrl})\n`;
      setFormData(prev => ({
        ...prev,
        [targetField]: prev[targetField as keyof typeof prev] + markdownImg
      }));
      toast.success('Imagem enviada!');
    } catch (err: any) {
      console.error('Erro ao enviar imagem:', err);
      toast.error(err.message || 'Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
    }
  }, [empresaId]);

  const handleDeleteModel = async (id: string) => {
    setDeletingModelId(id);
    try {
      const { error } = await (supabase as any)
        .from('modelos_proposta_comercial')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setModelos(prev => prev.filter(m => m.id !== id));
      toast.success('Modelo excluído');
    } catch (err: any) {
      toast.error('Erro ao excluir modelo');
    } finally {
      setDeletingModelId(null);
    }
  };

  // Exportar modelo como JSON
  const handleExportModel = () => {
    const templateData: Record<string, any> = {
      _type: 'proposta_comercial_modelo',
      _version: 1,
      planos_selecionados: Array.from(selectedPlans),
    };
    templateFields.forEach(f => { templateData[f] = formData[f as keyof typeof formData]; });
    
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo_proposta_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Modelo exportado!');
  };

  // Importar modelo de JSON
  const handleImportModel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data._type !== 'proposta_comercial_modelo') {
          toast.error('Arquivo inválido — não é um modelo de proposta');
          return;
        }
        setFormData(prev => {
          const updated = { ...prev };
          templateFields.forEach(f => {
            if (data[f] != null) {
              (updated as any)[f] = data[f];
            }
          });
          return updated;
        });
        if (data.planos_selecionados && Array.isArray(data.planos_selecionados) && data.planos_selecionados.length > 0) {
          setSelectedPlans(new Set(data.planos_selecionados as Plano[]));
        }
        toast.success('Modelo importado!');
      } catch {
        toast.error('Erro ao ler arquivo JSON');
      }
    };
    reader.readAsText(file);
  };

  const handleGerarPDF = async () => {
    if (!previewRef.current) return;
    
    setGerandoPDF(true);
    const originalPage = currentPage;
    
    try {
      const nomeArquivo = identificadorProposta 
        ? `proposta_${identificadorProposta}` 
        : `proposta_comercial_${formData.clienteEmpresa.replace(/\s+/g, '_').substring(0, 30)}_${new Date().toISOString().slice(0, 10)}`;
      
      const totalPagesForPDF = totalPages;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = 210;
      const pdfHeight = 297;
      
      for (let pageNum = 0; pageNum < totalPagesForPDF; pageNum++) {
        setCurrentPage(pageNum);
        
        // Aguardar renderização
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!previewRef.current) continue;
        
        const canvas = await html2canvas(previewRef.current, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 595,
          height: 842,
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        if (pageNum > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      setCurrentPage(originalPage);
      
      pdf.save(`${nomeArquivo}.pdf`);
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
      setCurrentPage(originalPage);
    } finally {
      setGerandoPDF(false);
    }
  };

  // Salvar proposta no banco de dados
  const handleSalvarProposta = async () => {
    if (!empresaId || !identificadorProposta) {
      toast.error('Dados incompletos para salvar a proposta');
      return;
    }
    
    setSalvandoProposta(true);
    
    try {
      // Calcular valor total dos planos selecionados
      const valorTotal = planosFiltrados.reduce((acc, p) => acc + p.total, 0);
      
      const propostaData = {
        empresa_id: empresaId,
        card_id: cardId || null,
        identificador: identificadorProposta,
        status: statusProposta,
        tipo_orcamento: tipoOrcamento,
        
        // Dados do cliente
        cliente_empresa: formData.clienteEmpresa,
        cliente_razao_social: formData.clienteRazaoSocial,
        cliente_cnpj: formData.clienteCnpj,
        cliente_contato: formData.clienteContato,
        cliente_email: formData.clienteEmail,
        cliente_telefone: formData.clienteTelefone,
        cliente_cidade: formData.clienteCidade,
        cliente_endereco: formData.clienteEndereco || null,
        cliente_bairro: formData.clienteBairro || null,
        cliente_cep: formData.clienteCep || null,
        cliente_uf: formData.clienteUf || null,
        cliente_distancia: formData.clienteDistancia ? parseInt(formData.clienteDistancia) : null,
        
        // Dados da empresa
        empresa_endereco: [empresaSST.endereco, empresaSST.bairro].filter(Boolean).join(', ') || null,
        empresa_cidade: empresaSST.cidade || null,
        empresa_cep: empresaSST.cep || null,
        empresa_uf: empresaSST.uf || null,
        
        // Dados da proposta
        data_proposta: formData.dataProposta,
        validade_dias: parseInt(formData.validadeDias) || 10,
        
        // Títulos
        titulo: formData.titulo,
        titulo_modulo: formData.tituloModulo,
        titulo_dores: formData.tituloDores,
        titulo_solucoes: formData.tituloSolucoes,
        titulo_diferenciais: formData.tituloDiferenciais,
        titulo_investimento: formData.tituloInvestimento,
        titulo_pagamento: formData.tituloPagamento,
        titulo_passos: formData.tituloPassos,
        
        // Conteúdos
        descricao: formData.descricao,
        modulo: formData.modulo,
        publico: formData.publico,
        dores: formData.dores,
        solucoes: formData.solucoes,
        diferenciais: formData.diferenciais,
        pagamento: formData.pagamento,
        passos: formData.passos,
        
        // Planos e calculadora
        planos_selecionados: Array.from(selectedPlans),
        dados_calculadora: dadosCalculadora || {},
        valor_total: valorTotal,
        
        modelo_nome: activeModelName || null,
        created_by: user?.id,
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (propostaId) {
        // Atualizar proposta existente
        const { data, error } = await (supabase as any)
          .from('propostas_comerciais_treinamentos')
          .update(propostaData)
          .eq('id', propostaId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        toast.success('Proposta atualizada com sucesso!');
      } else {
        // Criar nova proposta
        const { data, error } = await (supabase as any)
          .from('propostas_comerciais_treinamentos')
          .insert(propostaData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        setPropostaId(result.id);
        setPropostaSalva(true); // Bloquear edição após salvar nova proposta
        toast.success('Proposta salva com sucesso!');
        
        // Chamar callback se existir
        if (onSaveProposta) {
          onSaveProposta(result.id);
        }
      }
      
    } catch (error: any) {
      console.error('Erro ao salvar proposta:', error);
      toast.error(error.message || 'Erro ao salvar proposta. Tente novamente.');
    } finally {
      setSalvandoProposta(false);
    }
  };

  // Toggle seleção de plano
  const togglePlan = (plano: Plano) => {
    setSelectedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(plano)) {
        if (newSet.size > 1) newSet.delete(plano); // Manter pelo menos 1 selecionado
      } else {
        newSet.add(plano);
      }
      return newSet;
    });
  };

  // Obter planos filtrados baseado na seleção múltipla
  const getPlanosFiltrados = () => {
    if (!dadosCalculadora?.itensPorPlano) return [];
    
    const planos = PLANOS.map(plano => {
      const planoKey = plano.toLowerCase() as 'ouro' | 'prata' | 'bronze';
      const total = dadosCalculadora.totais?.[planoKey] || 0;
      const desconto = dadosCalculadora.descontos?.[planoKey];
      
      return {
        codigo: plano,
        nome: `Plano ${plano}`,
        itens: dadosCalculadora.itensPorPlano?.[plano] || [],
        total,
        desconto: desconto ? {
          tipo: desconto.tipo,
          valor: desconto.valor,
          valorDesconto: desconto.valorDesconto || 0,
          totalComDesconto: desconto.totalComDesconto || total
        } : null
      };
    }).filter(p => p.itens.length > 0 && p.itens.some(i => i.treinamentoId) && selectedPlans.has(p.codigo));

    return planos;
  };

  const planosFiltrados = getPlanosFiltrados();
  
  // Altura útil por página para conteúdo contínuo (842 - 80 padding - ~30 footer)
  const PAGE_H = 692;
  // Altura do mini-header nas páginas 2+ (~40px)
  const MINI_HEADER_H = 40;
  // Buffer para evitar cortar texto na borda da página (meia linha ≈ 8px)
  const CLIP_BUFFER = 8;

  // Empurrar elementos que cruzam limites de página para a próxima página
  const pushElementsAcrossPageBreaks = (container: HTMLElement) => {
    // Selecionar imagens, linhas de tabela e elementos de bloco
    const elements = container.querySelectorAll('img, tr, li, p, h1, h2, h3, h4, h5, h6, div.plan-block');
    // Resetar margins anteriores (exceto filhos de blocos atômicos)
    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.closest('.section-pagamento') || htmlEl.closest('.section-proximos-passos')) return;
      htmlEl.style.marginTop = '';
    });
    // Calcular limites de página (com buffer para não cortar texto)
    const containerTop = container.getBoundingClientRect().top;
    const pageBoundaries: number[] = [PAGE_H - CLIP_BUFFER];
    const pageContent = PAGE_H - MINI_HEADER_H;
    for (let i = 1; i < 50; i++) pageBoundaries.push(PAGE_H + i * pageContent - CLIP_BUFFER);

    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      // Não empurrar filhos de blocos atômicos (Pagamento e Próximos Passos)
      if (htmlEl.closest('.section-pagamento') || htmlEl.closest('.section-proximos-passos')) return;
      const rect = htmlEl.getBoundingClientRect();
      const elTop = rect.top - containerTop;
      const elBottom = elTop + rect.height;

      for (const boundary of pageBoundaries) {
        if (elTop < boundary && elBottom > boundary) {
          const push = boundary - elTop + CLIP_BUFFER + 4;
          htmlEl.style.marginTop = `${push}px`;
          break;
        }
      }
    });

    // Forçar "Próximos Passos" a sempre começar em nova página
    const passosEl = container.querySelector('.section-proximos-passos') as HTMLElement;
    if (passosEl) {
      passosEl.style.marginTop = '';
      const cTop = container.getBoundingClientRect().top;
      const elTop = passosEl.getBoundingClientRect().top - cTop;
      // Find the next boundary AFTER the element's current position
      for (const boundary of pageBoundaries) {
        if (boundary > elTop + 15) {
          // Element is in the middle of a page — push it to the next boundary
          const push = boundary - elTop + CLIP_BUFFER + 4;
          passosEl.style.marginTop = `${push}px`;
          break;
        }
      }
    }
  };

  // Medir altura do stream unificado (com debounce para evitar loop infinito)
  const lastStreamH = useRef(0);
  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    const measure = () => {
      pushElementsAcrossPageBreaks(el);
      const h = el.scrollHeight;
      // Só atualizar se mudou significativamente (>5px) para evitar oscilação
      if (Math.abs(h - lastStreamH.current) > 5) {
        lastStreamH.current = h;
        setStreamH(h);
      }
    };
    const t = setTimeout(measure, 300);
    const ro = new ResizeObserver(() => setTimeout(measure, 100));
    ro.observe(el);
    return () => { clearTimeout(t); ro.disconnect(); };
  });

  // Aplicar push no conteúdo visível após mudança de página
  useEffect(() => {
    const t = setTimeout(() => {
      if (visibleRef.current) pushElementsAcrossPageBreaks(visibleRef.current);
    }, 50);
    return () => clearTimeout(t);
  }, [currentPage]);

  // Calcular páginas de um stream contínuo
  const MIN_CONTENT_THRESHOLD = 30; // px mínimo para justificar uma nova página
  const calcPages = (totalH: number) => {
    if (totalH <= 0) return 1;
    if (totalH <= PAGE_H) return 1;
    let pages = 1;
    let consumed = PAGE_H;
    const pageContent = PAGE_H - MINI_HEADER_H;
    while (consumed + MIN_CONTENT_THRESHOLD < totalH) {
      pages++;
      consumed += pageContent;
    }
    return pages;
  };

  const totalPages = calcPages(streamH);

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Proposta Comercial
            </h2>
            <p className="text-xs text-muted-foreground">
              Edite à esquerda • Visualize à direita • Baixe em PDF
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status da Proposta */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Status:</Label>
            <Select value={statusProposta} onValueChange={(v) => setStatusProposta(v as typeof statusProposta)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aguardando">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    Aguardando
                  </span>
                </SelectItem>
                <SelectItem value="aprovada">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Aprovada
                  </span>
                </SelectItem>
                <SelectItem value="rejeitada">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    Rejeitada
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Botão Salvar */}
          <Button 
            variant="outline"
            size="sm"
            onClick={handleSalvarProposta}
            disabled={salvandoProposta}
            className="gap-2"
          >
            {salvandoProposta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {salvandoProposta ? 'Salvando...' : (propostaId ? 'Atualizar' : 'Salvar')}
          </Button>
          
          {/* Botão Baixar PDF */}
          <Button 
            variant="default"
            size="sm"
            onClick={handleGerarPDF}
            disabled={gerandoPDF}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            {gerandoPDF ? 'Gerando...' : 'Baixar PDF'}
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal - Editor + Preview */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Editor (Esquerda) */}
        <div className="overflow-y-auto border-r">
          <div className="p-4 space-y-4 pb-16">
            {/* Dados do Cliente */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Dados do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">CNPJ</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={maskCNPJ(formData.clienteCnpj)}
                      onChange={(e) => handleInputChange('clienteCnpj', e.target.value.replace(/\D/g, '').slice(0, 14))}
                      placeholder="00.000.000/0000-00"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome Fantasia</Label>
                    <Input 
                      value={formData.clienteEmpresa}
                      onChange={(e) => handleInputChange('clienteEmpresa', e.target.value)}
                      placeholder="Nome fantasia"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Razão Social</Label>
                    <Input 
                      value={formData.clienteRazaoSocial}
                      onChange={(e) => handleInputChange('clienteRazaoSocial', e.target.value)}
                      placeholder="Razão social"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input 
                      value={formData.clienteEmail}
                      onChange={(e) => handleInputChange('clienteEmail', e.target.value)}
                      placeholder="email@empresa.com"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input 
                      value={maskPhone(formData.clienteTelefone)}
                      onChange={(e) => handleInputChange('clienteTelefone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="(00) 00000-0000"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Endereço</Label>
                  <Input 
                    value={formData.clienteEndereco}
                    onChange={(e) => handleInputChange('clienteEndereco', e.target.value)}
                    placeholder="Rua, número, complemento"
                    className="h-8 text-sm"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Bairro</Label>
                    <Input 
                      value={formData.clienteBairro}
                      onChange={(e) => handleInputChange('clienteBairro', e.target.value)}
                      placeholder="Bairro"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cidade</Label>
                    <Input 
                      value={formData.clienteCidade}
                      onChange={(e) => handleInputChange('clienteCidade', e.target.value)}
                      placeholder="Cidade"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">UF</Label>
                    <Input 
                      value={formData.clienteUf}
                      onChange={(e) => handleInputChange('clienteUf', e.target.value)}
                      placeholder="SP"
                      className="h-8 text-sm"
                      maxLength={2}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">CEP</Label>
                    <Input 
                      value={formData.clienteCep}
                      onChange={(e) => handleInputChange('clienteCep', e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="00000-000"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Distância (km)</Label>
                    <Input 
                      value={formData.clienteDistancia}
                      onChange={(e) => handleInputChange('clienteDistancia', e.target.value)}
                      placeholder="Ex.: 330"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data da proposta</Label>
                    <Input 
                      type="date"
                      value={formData.dataProposta}
                      onChange={(e) => handleInputChange('dataProposta', e.target.value)}
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Validade (dias)</Label>
                    <Input 
                      value={formData.validadeDias}
                      onChange={(e) => handleInputChange('validadeDias', e.target.value)}
                      placeholder="Ex.: 10"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados da Empresa */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome Fantasia</Label>
                    <Input 
                      value={empresaSST.nome}
                      onChange={(e) => setEmpresaSST(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Nome fantasia"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Razão Social</Label>
                    <Input 
                      value={empresaSST.razaoSocial}
                      onChange={(e) => setEmpresaSST(prev => ({ ...prev, razaoSocial: e.target.value }))}
                      placeholder="Razão social"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">CNPJ</Label>
                  <Input 
                    value={maskCNPJ(empresaSST.cnpj)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
                      setEmpresaSST(prev => ({ ...prev, cnpj: raw }));
                      if (raw.length === 14) fetchCnpjData(raw);
                    }}
                    placeholder="00.000.000/0000-00"
                    className="h-8 text-sm"
                  />
                  {fetchingCnpj && <Loader2 className="h-4 w-4 animate-spin mt-1 flex-shrink-0" />}
                </div>
                <div>
                  <Label className="text-xs">Endereço</Label>
                  <Input 
                    value={empresaSST.endereco}
                    onChange={(e) => setEmpresaSST(prev => ({ ...prev, endereco: e.target.value }))}
                    placeholder="Rua, número, complemento"
                    className="h-8 text-sm"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Bairro</Label>
                    <Input 
                      value={empresaSST.bairro}
                      onChange={(e) => setEmpresaSST(prev => ({ ...prev, bairro: e.target.value }))}
                      placeholder="Bairro"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cidade</Label>
                    <Input 
                      value={empresaSST.cidade}
                      onChange={(e) => setEmpresaSST(prev => ({ ...prev, cidade: e.target.value }))}
                      placeholder="Cidade"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">UF</Label>
                    <Input 
                      value={empresaSST.uf}
                      onChange={(e) => setEmpresaSST(prev => ({ ...prev, uf: e.target.value }))}
                      placeholder="SP"
                      className="h-8 text-sm"
                      maxLength={2}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados do Vendedor */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Vendedor / Responsável
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input 
                    value={vendedor.nome}
                    onChange={(e) => setVendedor(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome do vendedor"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input 
                      value={vendedor.email}
                      onChange={(e) => setVendedor(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@empresa.com"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input 
                      value={maskPhone(vendedor.telefone)}
                      onChange={(e) => setVendedor(prev => ({ ...prev, telefone: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                      placeholder="(00) 00000-0000"
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personalização */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Personalização
                  </CardTitle>
                  <div className="flex gap-1 flex-wrap justify-end">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImportModel(file);
                          e.target.value = '';
                        }}
                      />
                      <span className="inline-flex items-center gap-1 h-7 px-2 text-xs border rounded-md hover:bg-accent transition-colors">
                        <Upload className="h-3 w-3" />
                        Importar
                      </span>
                    </label>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExportModel}>
                      <Download className="h-3 w-3" />
                      Exportar
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleLoadModels}>
                      <FolderOpen className="h-3 w-3" />
                      Usar Modelo
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSaveModelDialog(true)}>
                      <BookTemplate className="h-3 w-3" />
                      Salvar Modelo
                    </Button>
                    {activeModelId && formModified && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                        onClick={handleUpdateModel}
                        disabled={updatingModel}
                      >
                        {updatingModel ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {updatingModel ? 'Atualizando...' : 'Atualizar Proposta'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Título da proposta</Label>
                  <Input 
                    value={formData.titulo}
                    onChange={(e) => handleInputChange('titulo', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Descrição curta</Label>
                  <Textarea 
                    value={formData.descricao}
                    onChange={(e) => handleInputChange('descricao', e.target.value)}
                    className="text-sm min-h-[60px]"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Módulo/Serviço</Label>
                    <Input 
                      value={formData.modulo}
                      onChange={(e) => handleInputChange('modulo', e.target.value)}
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Para quem é</Label>
                    <Input 
                      value={formData.publico}
                      onChange={(e) => handleInputChange('publico', e.target.value)}
                      className="h-8 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground font-medium">Títulos das seções (editáveis)</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Título Módulo</Label>
                    <Input 
                      value={formData.tituloModulo}
                      onChange={(e) => handleInputChange('tituloModulo', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Título Dores</Label>
                    <Input 
                      value={formData.tituloDores}
                      onChange={(e) => handleInputChange('tituloDores', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Título Soluções</Label>
                    <Input 
                      value={formData.tituloSolucoes}
                      onChange={(e) => handleInputChange('tituloSolucoes', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Título Diferenciais</Label>
                    <Input 
                      value={formData.tituloDiferenciais}
                      onChange={(e) => handleInputChange('tituloDiferenciais', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Título Investimento</Label>
                    <Input 
                      value={formData.tituloInvestimento}
                      onChange={(e) => handleInputChange('tituloInvestimento', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Título Pagamento</Label>
                    <Input 
                      value={formData.tituloPagamento}
                      onChange={(e) => handleInputChange('tituloPagamento', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Título Próximos Passos</Label>
                    <Input 
                      value={formData.tituloPassos}
                      onChange={(e) => handleInputChange('tituloPassos', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground font-medium">Conteúdos das seções <span className="opacity-60">(suporta **markdown**)</span></p>
                
                {(() => {
                  const allMarkdownFields = ['dores', 'solucoes', 'diferenciais', 'pagamento', 'passos'] as const;
                  const hasImageInProposal = allMarkdownFields.some(f => (formData[f as keyof typeof formData] as string).includes('!['));
                  return [
                    { field: 'dores', label: formData.tituloDores },
                    { field: 'solucoes', label: formData.tituloSolucoes },
                    { field: 'diferenciais', label: formData.tituloDiferenciais },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">{label}</Label>
                        {!hasImageInProposal && (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingImage || isReadOnly}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) compressAndUploadImage(file, field);
                                e.target.value = '';
                              }}
                            />
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                              <ImagePlus className="h-3 w-3" />
                              Imagem
                            </span>
                          </label>
                        )}
                      </div>
                      <Textarea 
                        value={formData[field as keyof typeof formData]}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        className="text-sm min-h-[80px] font-mono"
                        placeholder="Suporta markdown: **negrito**, *itálico*, - lista"
                        disabled={isReadOnly}
                      />
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            {/* Condições */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Condições & Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const allMarkdownFields = ['dores', 'solucoes', 'diferenciais', 'pagamento', 'passos'] as const;
                  const hasImageInProposal = allMarkdownFields.some(f => (formData[f as keyof typeof formData] as string).includes('!['));
                  return [
                    { field: 'pagamento', label: formData.tituloPagamento, minH: '60px' },
                    { field: 'passos', label: formData.tituloPassos, minH: '80px' },
                  ].map(({ field, label, minH }) => (
                    <div key={field}>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">{label}</Label>
                        {!hasImageInProposal && (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingImage || isReadOnly}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) compressAndUploadImage(file, field);
                                e.target.value = '';
                              }}
                            />
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                              <ImagePlus className="h-3 w-3" />
                              Imagem
                            </span>
                          </label>
                        )}
                      </div>
                      <Textarea 
                        value={formData[field as keyof typeof formData]}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        className="text-sm font-mono"
                        style={{ minHeight: minH }}
                        placeholder="Suporta markdown: **negrito**, *itálico*, - lista"
                        disabled={isReadOnly}
                      />
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            {/* Filtro de Planos - Seleção Múltipla */}
            {dadosCalculadora?.itensPorPlano && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Planos na proposta</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">Selecione os planos que deseja incluir:</p>
                  <div className="flex gap-2 flex-wrap">
                    {PLANOS.map(plano => {
                      const isSelected = selectedPlans.has(plano);
                      const hasData = dadosCalculadora?.itensPorPlano?.[plano]?.some(i => i.treinamentoId);
                      return (
                        <Badge 
                          key={plano}
                          variant={isSelected ? 'default' : 'outline'}
                          className={cn("cursor-pointer transition-all", !hasData && "opacity-50")}
                          style={isSelected ? { backgroundColor: PLAN_COLORS[plano], color: plano === 'OURO' ? '#000' : '#fff' } : {}}
                          onClick={() => hasData && togglePlan(plano)}
                        >
                          {isSelected ? '✓ ' : ''}{plano}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Preview (Direita) - Visualização em páginas A4 */}
        <div className="h-full flex flex-col bg-muted/50 min-h-0">
          {/* Navegação de páginas */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted">
            <span className="text-xs text-muted-foreground">Preview A4</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium min-w-[80px] text-center text-foreground">
                Página {currentPage + 1} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Container oculto para medir stream unificado — FORA do A4 */}
          <div
            ref={streamRef}
            style={{
              position: 'absolute', left: '-9999px', top: 0, width: '515px', pointerEvents: 'none',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
              fontSize: '11px', lineHeight: '1.4', color: '#1f2937'
            }}
          >
            {/* INTRO */}
            <div className="border-b border-gray-200 pb-3 mb-3">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3">
                  {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" crossOrigin="anonymous" />}
                  <div>
                    <h1 className="text-lg font-bold" style={{ color: '#ff7a00' }}>{formData.titulo || 'Proposta Comercial'}</h1>
                    {formData.descricao && <p className="text-[10px] opacity-70 max-w-[300px]">{formData.descricao}</p>}
                  </div>
                </div>
                <div className="text-right text-[10px]">
                  {identificadorProposta && <div className="font-mono text-[8px] opacity-50 mb-1">#{identificadorProposta}</div>}
                  <div className="font-semibold">{parseDateBR(formData.dataProposta)}</div>
                  <div className="opacity-60">Validade: {formData.validadeDias || '10'} dias</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-gray-200">
              <div className="text-[9px] space-y-0.5">
                <h4 className="font-bold text-[10px] mb-1" style={{ color: '#ff7a00' }}>Cliente</h4>
                <div><span className="opacity-60">Nome Fantasia:</span> {formData.clienteEmpresa || '—'}</div>
                {formData.clienteRazaoSocial && <div><span className="opacity-60">Razão Social:</span> {formData.clienteRazaoSocial}</div>}
                {formData.clienteCnpj && <div><span className="opacity-60">CNPJ:</span> {maskCNPJ(formData.clienteCnpj)}</div>}
                {formData.clienteEmail && <div><span className="opacity-60">Email:</span> {formData.clienteEmail}</div>}
                {formData.clienteTelefone && <div><span className="opacity-60">Tel:</span> {maskPhone(formData.clienteTelefone)}</div>}
                {(formData.clienteEndereco || formData.clienteCidade) && <div><span className="opacity-60">End:</span> {[formData.clienteEndereco, formData.clienteBairro, formData.clienteCidade, formData.clienteUf].filter(Boolean).join(', ')}</div>}
              </div>
              <div className="text-[9px] space-y-0.5">
                <h4 className="font-bold text-[10px] mb-1" style={{ color: '#ff7a00' }}>Empresa</h4>
                <div><span className="opacity-60">Nome Fantasia:</span> {empresaSST.nome || '—'}</div>
                {empresaSST.cnpj && <div><span className="opacity-60">CNPJ:</span> {maskCNPJ(empresaSST.cnpj)}</div>}
              </div>
              <div className="text-[9px] space-y-0.5">
                <h4 className="font-bold text-[10px] mb-1" style={{ color: '#ff7a00' }}>Vendedor</h4>
                <div><span className="opacity-60">Nome:</span> {vendedor.nome || '—'}</div>
                {vendedor.email && <div><span className="opacity-60">Email:</span> {vendedor.email}</div>}
                {vendedor.telefone && <div><span className="opacity-60">Tel:</span> {maskPhone(vendedor.telefone)}</div>}
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
              <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloDiferenciais}</h3>
              <MarkdownContent content={formData.diferenciais} className="text-[10px] opacity-80" />
            </div>
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
              <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloSolucoes}</h3>
              <MarkdownContent content={formData.solucoes} className="text-[10px] opacity-80" />
            </div>
            {/* INVESTIMENTO — inline */}
            {planosFiltrados.length > 0 && (
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-3">{formData.tituloInvestimento}</h3>
                <div className="space-y-3">
                  {planosFiltrados.map(plano => {
                    const temDesconto = plano.desconto && plano.desconto.valor > 0;
                    return (
                      <div key={plano.codigo} className="plan-block border rounded-xl overflow-hidden" style={{ borderColor: `${PLAN_COLORS[plano.codigo as Plano]}40` }}>
                        <div className="flex items-center justify-between p-2 border-b border-dashed border-white/10 bg-gray-100">
                          <div className="flex items-center gap-2 font-bold text-[10px]">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PLAN_COLORS[plano.codigo as Plano] }} />
                            {plano.nome}
                          </div>
                          <div className="text-[10px]">
                            <span className="opacity-60">Total: </span>
                            <span className="font-bold" style={{ color: '#ff7a00' }}>{fmtBRL(temDesconto ? plano.desconto!.totalComDesconto : plano.total)}</span>
                          </div>
                        </div>
                        <table className="w-full text-[7px]">
                          <thead>
                            <tr className="border-b border-gray-300">
                              <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">#</th>
                              <th className="text-left p-1 uppercase opacity-60 font-bold">Treinamento</th>
                              <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">Categoria</th>
                              <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">Tipo</th>
                              <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">CH</th>
                              <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">Colaboradores por Turma</th>
                              <th className="text-right p-1 uppercase opacity-60 font-bold whitespace-nowrap">Preço</th>
                              <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">Qtd</th>
                              <th className="text-right p-1 uppercase opacity-60 font-bold whitespace-nowrap">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plano.itens.filter(it => it.treinamentoId).map((item, idx) => (
                              <tr key={item.id} className="border-b border-gray-200">
                                <td className="text-center p-1 font-mono align-middle">{idx + 1}</td>
                                <td className="p-1 align-middle">{item.treinamentoNome || 'Serviço'}</td>
                                <td className="text-center p-1 opacity-70 whitespace-nowrap align-middle">{item.categoria || '-'}</td>
                                <td className="text-center p-1 opacity-70 whitespace-nowrap align-middle">{item.tipo === 'formacao' ? 'Formação' : 'Reciclagem'}</td>
                                <td className="text-center p-1 font-mono whitespace-nowrap align-middle">{item.cargaHoraria}h</td>
                                <td className="text-center p-1 font-mono align-middle">Até {(item as any).colaboradoresPorTurma || 30}</td>
                                <td className="text-right p-1 font-bold whitespace-nowrap align-middle" style={{ color: '#ff7a00' }}>{fmtBRL(item.precoUnitario)}</td>
                                <td className="text-center p-1 font-mono align-middle">{item.quantidade}</td>
                                <td className="text-right p-1 font-bold whitespace-nowrap align-middle" style={{ color: '#ff7a00' }}>{fmtBRL(item.precoUnitario * item.quantidade)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* Linha de desconto no FIM da tabela */}
                        {temDesconto && (
                          <div className="bg-green-50 border-t border-green-200 px-2 py-1.5">
                            <div className="flex justify-between items-center text-[8px]">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">{fmtBRL(plano.total)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-700 font-medium">
                                  Desconto ({plano.desconto!.tipo === 'percentual' ? `${plano.desconto!.valor}%` : 'Fixo'}):
                                </span>
                                <span className="text-green-700 font-bold">-{fmtBRL(plano.desconto!.valorDesconto)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-800 font-bold">Total com Desconto:</span>
                                <span className="font-bold" style={{ color: '#ff7a00' }}>{fmtBRL(plano.desconto!.totalComDesconto)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* PAGAMENTO — junto com investimento na mesma página */}
            <div className="section-pagamento border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
              <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloPagamento}</h3>
              <MarkdownContent content={formData.pagamento} className="text-[10px] opacity-80" />
            </div>
            {/* PRÓXIMOS PASSOS — sempre em página dedicada */}
            <div className="section-proximos-passos border border-gray-200 rounded-xl p-3 bg-gray-50">
              <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloPassos}</h3>
              <MarkdownContent content={formData.passos} className="text-[10px] opacity-80" />
            </div>
          </div>

          {/* Container da página A4 - proporção exata 210x297mm */}
          <div className="flex-1 min-h-0 overflow-auto p-4 flex justify-center items-start">
            <div 
              ref={previewRef}
              className="bg-white shadow-2xl flex-shrink-0 relative"
              style={{
                width: '595px',
                height: '842px',
                padding: '40px',
                color: '#1f2937',
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
                fontSize: '11px',
                lineHeight: '1.4',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              {/* FLUXO CONTÍNUO UNIFICADO com translateY */}
              {(() => {
                const sp = currentPage;
                let offsetY = 0;
                if (sp > 0) {
                  offsetY = PAGE_H;
                  for (let i = 1; i < sp; i++) offsetY += PAGE_H - MINI_HEADER_H;
                }
                const contentH = (sp === 0 ? PAGE_H : PAGE_H - MINI_HEADER_H) - CLIP_BUFFER;
                const isLast = sp === totalPages - 1;

                return (
                  <div className="h-full flex flex-col">
                    {sp > 0 && (
                      <div className="flex justify-between items-center pb-3 mb-3 border-b border-gray-200 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" crossOrigin="anonymous" />}
                          <span className="font-bold text-sm" style={{ color: '#ff7a00' }}>{formData.titulo}</span>
                        </div>
                        <span className="text-[9px] opacity-60">{parseDateBR(formData.dataProposta)}</span>
                      </div>
                    )}
                    <div className="flex-1 overflow-hidden" style={{ maxHeight: `${contentH}px` }}>
                      <div ref={visibleRef} style={{ transform: `translateY(-${offsetY}px)` }}>
                        {/* INTRO */}
                        <div className="border-b border-gray-200 pb-3 mb-3">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-start gap-3">
                              {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" crossOrigin="anonymous" />}
                              <div>
                                <h1 className="text-lg font-bold" style={{ color: '#ff7a00' }}>{formData.titulo || 'Proposta Comercial'}</h1>
                                {formData.descricao && <p className="text-[10px] opacity-70 max-w-[300px]">{formData.descricao}</p>}
                              </div>
                            </div>
                            <div className="text-right text-[10px]">
                              {identificadorProposta && <div className="font-mono text-[8px] opacity-50 mb-1">#{identificadorProposta}</div>}
                              <div className="font-semibold">{parseDateBR(formData.dataProposta)}</div>
                              <div className="opacity-60">Validade: {formData.validadeDias || '10'} dias</div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-gray-200">
                          <div className="text-[9px] space-y-0.5">
                            <h4 className="font-bold text-[10px] mb-1" style={{ color: '#ff7a00' }}>Cliente</h4>
                            <div><span className="opacity-60">Nome Fantasia:</span> {formData.clienteEmpresa || '—'}</div>
                            {formData.clienteRazaoSocial && <div><span className="opacity-60">Razão Social:</span> {formData.clienteRazaoSocial}</div>}
                            {formData.clienteCnpj && <div><span className="opacity-60">CNPJ:</span> {maskCNPJ(formData.clienteCnpj)}</div>}
                            {formData.clienteEmail && <div><span className="opacity-60">Email:</span> {formData.clienteEmail}</div>}
                            {formData.clienteTelefone && <div><span className="opacity-60">Tel:</span> {maskPhone(formData.clienteTelefone)}</div>}
                            {(formData.clienteEndereco || formData.clienteCidade) && <div><span className="opacity-60">End:</span> {[formData.clienteEndereco, formData.clienteBairro, formData.clienteCidade, formData.clienteUf].filter(Boolean).join(', ')}</div>}
                          </div>
                          <div className="text-[9px] space-y-0.5">
                            <h4 className="font-bold text-[10px] mb-1" style={{ color: '#ff7a00' }}>Empresa</h4>
                            <div><span className="opacity-60">Nome Fantasia:</span> {empresaSST.nome || '—'}</div>
                            {empresaSST.cnpj && <div><span className="opacity-60">CNPJ:</span> {maskCNPJ(empresaSST.cnpj)}</div>}
                          </div>
                          <div className="text-[9px] space-y-0.5">
                            <h4 className="font-bold text-[10px] mb-1" style={{ color: '#ff7a00' }}>Vendedor</h4>
                            <div><span className="opacity-60">Nome:</span> {vendedor.nome || '—'}</div>
                            {vendedor.email && <div><span className="opacity-60">Email:</span> {vendedor.email}</div>}
                            {vendedor.telefone && <div><span className="opacity-60">Tel:</span> {maskPhone(vendedor.telefone)}</div>}
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                          <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloDiferenciais}</h3>
                          <MarkdownContent content={formData.diferenciais} className="text-[10px] opacity-80" />
                        </div>
                        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                          <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloSolucoes}</h3>
                          <MarkdownContent content={formData.solucoes} className="text-[10px] opacity-80" />
                        </div>
                        {/* INVESTIMENTO — inline */}
                        {planosFiltrados.length > 0 && (
                          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                            <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-3">{formData.tituloInvestimento}</h3>
                            <div className="space-y-3">
                              {planosFiltrados.map(plano => {
                                const temDesconto = plano.desconto && plano.desconto.valor > 0;
                                return (
                                  <div key={plano.codigo} className="plan-block border rounded-xl overflow-hidden" style={{ borderColor: `${PLAN_COLORS[plano.codigo as Plano]}40` }}>
                                    <div className="flex items-center justify-between p-2 border-b border-dashed border-white/10 bg-gray-100">
                                      <div className="flex items-center gap-2 font-bold text-[10px]">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PLAN_COLORS[plano.codigo as Plano] }} />
                                        {plano.nome}
                                      </div>
                                      <div className="text-[10px]">
                                        <span className="opacity-60">Total: </span>
                                        <span className="font-bold" style={{ color: '#ff7a00' }}>{fmtBRL(temDesconto ? plano.desconto!.totalComDesconto : plano.total)}</span>
                                      </div>
                                    </div>
                                    <table className="w-full text-[7px]">
                                      <thead>
                                        <tr className="border-b border-gray-300">
                                          <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">#</th>
                                          <th className="text-left p-1 uppercase opacity-60 font-bold">Treinamento</th>
                                          <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">Categoria</th>
                                          <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">Tipo</th>
                                          <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">CH</th>
                                          <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">Colaboradores por Turma</th>
                                          <th className="text-right p-1 uppercase opacity-60 font-bold whitespace-nowrap">Preço</th>
                                          <th className="text-center p-1 uppercase opacity-60 font-bold whitespace-nowrap">Qtd</th>
                                          <th className="text-right p-1 uppercase opacity-60 font-bold whitespace-nowrap">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {plano.itens.filter(it => it.treinamentoId).map((item, idx) => (
                                          <tr key={item.id} className="border-b border-gray-200">
                                            <td className="text-center p-1 font-mono align-middle">{idx + 1}</td>
                                            <td className="p-1 align-middle">{item.treinamentoNome || 'Serviço'}</td>
                                            <td className="text-center p-1 opacity-70 whitespace-nowrap align-middle">{item.categoria || '-'}</td>
                                            <td className="text-center p-1 opacity-70 whitespace-nowrap align-middle">{item.tipo === 'formacao' ? 'Formação' : 'Reciclagem'}</td>
                                            <td className="text-center p-1 font-mono whitespace-nowrap align-middle">{item.cargaHoraria}h</td>
                                            <td className="text-center p-1 font-mono align-middle">Até {(item as any).colaboradoresPorTurma || 30}</td>
                                            <td className="text-right p-1 font-bold whitespace-nowrap align-middle" style={{ color: '#ff7a00' }}>{fmtBRL(item.precoUnitario)}</td>
                                            <td className="text-center p-1 font-mono align-middle">{item.quantidade}</td>
                                            <td className="text-right p-1 font-bold whitespace-nowrap align-middle" style={{ color: '#ff7a00' }}>{fmtBRL(item.precoUnitario * item.quantidade)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {/* Linha de desconto no FIM da tabela */}
                                    {temDesconto && (
                                      <div className="bg-green-50 border-t border-green-200 px-2 py-1.5">
                                        <div className="flex justify-between items-center text-[8px]">
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-600">Subtotal:</span>
                                            <span className="font-medium">{fmtBRL(plano.total)}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-green-700 font-medium">
                                              Desconto ({plano.desconto!.tipo === 'percentual' ? `${plano.desconto!.valor}%` : 'Fixo'}):
                                            </span>
                                            <span className="text-green-700 font-bold">-{fmtBRL(plano.desconto!.valorDesconto)}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-800 font-bold">Total com Desconto:</span>
                                            <span className="font-bold" style={{ color: '#ff7a00' }}>{fmtBRL(plano.desconto!.totalComDesconto)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* PAGAMENTO — junto com investimento na mesma página */}
                        <div className="section-pagamento border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                          <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloPagamento}</h3>
                          <MarkdownContent content={formData.pagamento} className="text-[10px] opacity-80" />
                        </div>
                        {/* PRÓXIMOS PASSOS — sempre em página dedicada */}
                        <div className="section-proximos-passos border border-gray-200 rounded-xl p-3 bg-gray-50">
                          <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloPassos}</h3>
                          <MarkdownContent content={formData.passos} className="text-[10px] opacity-80" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto pt-3 border-t border-gray-200 flex justify-between items-end text-[8px] opacity-50 flex-shrink-0">
                      <div>
                        <span>Página {sp + 1} de {totalPages}</span>
                        {isLast && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Gerado em {parseDateTimeBR()}</span>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{empresaSST.nome || 'Empresa'}</div>
                        {empresaSST.cnpj && <div>CNPJ: {maskCNPJ(empresaSST.cnpj)}</div>}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog: Salvar Modelo */}
      <Dialog open={showSaveModelDialog} onOpenChange={setShowSaveModelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookTemplate className="h-5 w-5 text-primary" />
              Salvar como Modelo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Salve a estrutura atual (títulos, textos e conteúdos) como um modelo reutilizável. 
              Dados do cliente não são incluídos.
            </p>
            <div>
              <Label className="text-sm">Nome do modelo</Label>
              <Input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Ex: Treinamentos NR padrão"
                className="mt-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveModel()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSaveModelDialog(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveModel}
                disabled={!modelName.trim() || savingModel}
                className="gap-2"
              >
                {savingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingModel ? 'Salvando...' : 'Salvar Modelo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Usar Modelo */}
      <Dialog open={showLoadModelDialog} onOpenChange={setShowLoadModelDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-5 w-5 text-primary" />
              Modelos Salvos
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-4">
              Selecione um modelo para aplicar. Os textos e títulos serão substituídos.
            </p>
            {loadingModels ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : modelos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookTemplate className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhum modelo salvo</p>
                <p className="text-xs mt-1">Crie um modelo usando o botão "Salvar Modelo"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {modelos.map((modelo) => (
                  <div
                    key={modelo.id}
                    className="group border rounded-lg p-3 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer relative"
                    onClick={() => handleApplyModel(modelo)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate">{modelo.nome}</h4>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {modelo.titulo || 'Sem título'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(modelo.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModel(modelo.id);
                        }}
                        disabled={deletingModelId === modelo.id}
                      >
                        {deletingModelId === modelo.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {modelo.modulo && (
                        <Badge variant="secondary" className="text-[10px] h-5">{modelo.modulo}</Badge>
                      )}
                      {modelo.publico && (
                        <Badge variant="outline" className="text-[10px] h-5">{modelo.publico}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
