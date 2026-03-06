import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Building2, 
  User,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  Briefcase,
  BookTemplate,
  FolderOpen,
  Trash2 as Trash2Icon,
  RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TreinamentoIncluso {
  id: string;
  treinamentoId: string;
  treinamento: string;
  tipo: 'formacao' | 'reciclagem';
  ch: string;
  planoOuro: number;
  quantidadeTurma: number;
  colaboradoresPorTurma?: number;
  valor: number;
}

interface DadosOrcamentoVertical365 {
  treinamentos?: TreinamentoIncluso[];
  valorGestaoAnual?: number;
  valorImplantacaoSistema?: number;
  desconto?: number;
  planoSelecionado?: 'bronze' | 'prata' | 'ouro';
  totais?: {
    totalTreinamentos: number;
    totalGestaoSistema: number;
    valorDesconto: number;
    totalComDesconto: number;
    planoVertical365: number;
    valorGestaoAnual: number;
    valorImplantacaoSistema: number;
    totalAnual: number;
    valorMensal: number;
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

interface PropostaComercialVertical365EditorProps {
  onClose: () => void;
  dadosOrcamento?: DadosOrcamentoVertical365 | null;
  clienteNome?: string;
  clienteCidade?: string;
  clienteInfo?: ClienteInfo;
  cardId?: string;
  propostaExistente?: any;
  onSaveProposta?: (propostaId: string) => void;
}

type ModoExibicao = 'anual' | 'mensal' | 'detalhado';

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

const gerarIdentificadorProposta = (nomeEmpresa: string): string => {
  const now = new Date();
  const sigla = nomeEmpresa
    .split(' ')
    .filter(p => p.length > 2)
    .slice(0, 3)
    .map(p => p[0].toUpperCase())
    .join('') || 'V365';
  
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');
  const hr = String(now.getHours()).padStart(2, '0');
  const mn = String(now.getMinutes()).padStart(2, '0');
  const sg = String(now.getSeconds()).padStart(2, '0');
  
  return `${sigla}${ano}${mes}${dia}${hr}${mn}${sg}`;
};

const maskCNPJ = (value: string) => {
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  let masked = cleaned;
  if (cleaned.length > 2) masked = cleaned.slice(0, 2) + '.' + cleaned.slice(2);
  if (cleaned.length > 5) masked = masked.slice(0, 6) + '.' + cleaned.slice(5);
  if (cleaned.length > 8) masked = masked.slice(0, 10) + '/' + cleaned.slice(8);
  if (cleaned.length > 12) masked = masked.slice(0, 15) + '-' + cleaned.slice(12);
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

export function PropostaComercialVertical365Editor({
  onClose,
  dadosOrcamento,
  clienteNome = '',
  clienteCidade = '',
  clienteInfo,
  cardId,
  propostaExistente,
  onSaveProposta
}: PropostaComercialVertical365EditorProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [salvandoProposta, setSalvandoProposta] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [statusProposta, setStatusProposta] = useState<'aguardando' | 'aprovada' | 'rejeitada'>(propostaExistente?.status || 'aguardando');
  const [propostaId, setPropostaId] = useState<string | null>(propostaExistente?.id || null);
  const [modoExibicao, setModoExibicao] = useState<ModoExibicao>(propostaExistente?.modo_exibicao_valores || 'mensal');
  const { user, empresa } = useAuth();
  const empresaId = empresa?.id;
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [identificadorProposta, setIdentificadorProposta] = useState(propostaExistente?.identificador || '');
  const [empresaSST, setEmpresaSST] = useState({
    nome: empresa?.nome || '',
    razaoSocial: '',
    cnpj: '',
    telefone: ''
  });
  const [vendedor, setVendedor] = useState({
    nome: user?.user_metadata?.nome || '',
    email: user?.email || '',
    telefone: ''
  });
  const [fetchingCnpj, setFetchingCnpj] = useState(false);

  // Estado para modelos/templates
  const [showSaveModelDialog, setShowSaveModelDialog] = useState(false);
  const [showLoadModelDialog, setShowLoadModelDialog] = useState(false);
  const [modelName, setModelName] = useState('');
  const [savingModel, setSavingModel] = useState(false);
  const [modelos, setModelos] = useState<any[]>([]);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [activeModelName, setActiveModelName] = useState<string>('');
  const [updatingModel, setUpdatingModel] = useState(false);
  const modelSnapshotRef = useRef<string | null>(null);

  const pe = propostaExistente;

  const [formData, setFormData] = useState({
    clienteEmpresa: pe?.cliente_empresa ?? (clienteNome || clienteInfo?.nome || ''),
    clienteRazaoSocial: pe?.cliente_razao_social ?? clienteInfo?.razaoSocial ?? '',
    clienteCnpj: pe?.cliente_cnpj ?? clienteInfo?.cnpj ?? '',
    clienteEmail: pe?.cliente_email ?? clienteInfo?.email ?? '',
    clienteTelefone: pe?.cliente_telefone ?? clienteInfo?.telefone ?? '',
    clienteEndereco: pe?.cliente_endereco ?? '',
    clienteBairro: pe?.cliente_bairro ?? '',
    clienteCidade: pe?.cliente_cidade ?? (clienteCidade || clienteInfo?.cidade || ''),
    clienteUf: pe?.cliente_uf ?? '',
    clienteCep: pe?.cliente_cep ?? '',
    clienteDistancia: pe?.cliente_distancia?.toString() ?? '',
    dataProposta: pe?.data_proposta ?? todayISO(),
    validadeDias: pe?.validade_dias?.toString() ?? '10',
    
    titulo: pe?.titulo ?? 'Proposta Comercial • Vertical 365',
    tituloModulo: pe?.titulo_modulo ?? '1) Módulo escolhido',
    tituloDores: pe?.titulo_dores ?? '2) Dores que resolvemos',
    tituloSolucoes: pe?.titulo_solucoes ?? '3) O que você ganha',
    tituloDiferenciais: pe?.titulo_diferenciais ?? '4) Diferenciais',
    tituloInvestimento: pe?.titulo_investimento ?? '5) Investimento',
    tituloPagamento: pe?.titulo_pagamento ?? '6) Condições de pagamento',
    tituloInfos: pe?.titulo_infos ?? '7) Informações adicionais',
    tituloPassos: pe?.titulo_passos ?? '8) Próximos passos',
    
    descricao: pe?.descricao ?? 'Plano anual de treinamentos normativos com gestão completa via sistema, certificação e documentação.',
    modulo: pe?.modulo ?? 'Vertical 365 • Gestão de Treinamentos',
    publico: pe?.publico ?? 'Empresas com SST / RH',
    dores: pe?.dores ?? `- Falta de controle de vencimentos e reciclagens
- Dificuldade em manter conformidade com NRs
- Custos elevados com treinamentos avulsos
- Retrabalho com documentação e evidências`,
    solucoes: pe?.solucoes ?? `- Plano anual com treinamentos inclusos
- Gestão centralizada via sistema
- Certificados com validade e rastreabilidade
- Economia em relação a treinamentos avulsos`,
    diferenciais: pe?.diferenciais ?? `- Pacote anual com valor fixo mensal
- Sistema de gestão de treinamentos incluso
- Implantação e suporte técnico
- Flexibilidade na escolha dos treinamentos
- Instrutores certificados`,
    pagamento: pe?.pagamento ?? `- À vista: desconto a combinar
- Parcelamento: até 12x
- Faturamento mensal`,
    infos: pe?.infos ?? `- Treinamentos conforme demanda da empresa
- Agendamento conforme disponibilidade
- Material didático incluso`,
    passos: pe?.passos ?? `1) Aprovação da proposta e assinatura do contrato
2) Implantação do sistema de gestão
3) Definição do cronograma anual
4) Execução dos treinamentos
5) Entrega de evidências e certificados`
  });
  
  useEffect(() => {
    const loadEmpresaData = async () => {
      if (!empresaId) return;
      try {
        const { data: empresaData } = await (supabase as any).from('empresas').select('nome, razao_social, cnpj, telefone').eq('id', empresaId).single();
        if (empresaData) {
          setEmpresaSST({ nome: empresaData.nome || '', razaoSocial: empresaData.razao_social || '', cnpj: empresaData.cnpj || '', telefone: empresaData.telefone || '' });
          if (!propostaExistente) setIdentificadorProposta(gerarIdentificadorProposta(empresaData.nome || 'V365'));
        }
        const { data: whiteLabelData } = await (supabase as any).from('white_label_config').select('logo_url').eq('empresa_id', empresaId).single();
        if (whiteLabelData?.logo_url) setLogoUrl(whiteLabelData.logo_url);
        if (user?.id) {
          const { data: profileData } = await (supabase as any).from('profiles').select('nome, email, telefone').eq('id', user.id).single();
          const profilePhone = profileData?.telefone || '';
          let phone = profilePhone;
          if (!phone) {
            const { data: colaboradorData } = await (supabase as any).from('colaboradores').select('telefone').eq('email', user.email).eq('empresa_id', empresaId).single();
            phone = colaboradorData?.telefone || '';
          }
          setVendedor({ nome: profileData?.nome || user?.user_metadata?.nome || '', email: profileData?.email || user?.email || '', telefone: phone });
        }
      } catch (error) { console.error('Erro ao carregar dados da empresa:', error); }
    };
    loadEmpresaData();
  }, [empresaId, user]);

  const handleEmpresaCnpjChange = async (raw: string) => {
    setEmpresaSST(prev => ({ ...prev, cnpj: raw }));
    if (raw.length !== 14) return;
    setFetchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
      if (!res.ok) throw new Error('CNPJ não encontrado');
      const data = await res.json();
      setEmpresaSST(prev => ({
        ...prev,
        nome: data.nome_fantasia || data.razao_social || prev.nome,
        razaoSocial: data.razao_social || prev.razaoSocial,
        telefone: (data.ddd_telefone_1 || '').replace(/\D/g, '') || prev.telefone,
      }));
      toast.success('Dados da empresa atualizados via CNPJ!');
    } catch (err: any) {
      console.error('Erro ao buscar CNPJ:', err);
      toast.error('CNPJ não encontrado na base da Receita Federal');
    } finally { setFetchingCnpj(false); }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const linesToArray = (text: string): string[] => {
    return text.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.replace(/^(\-|\•|\*|\d+[\)\.\-])\s*/, '').trim())
      .filter(Boolean);
  };

  const totalPages = 3;

  const handleGerarPDF = async () => {
    if (!previewRef.current) return;
    
    setGerandoPDF(true);
    const originalPage = currentPage;
    
    try {
      const nomeArquivo = identificadorProposta 
        ? `proposta_vertical365_${identificadorProposta}` 
        : `proposta_vertical365_${formData.clienteEmpresa.replace(/\s+/g, '_').substring(0, 30)}_${new Date().toISOString().slice(0, 10)}`;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = 210;
      const pdfHeight = 297;
      
      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        setCurrentPage(pageNum);
        await new Promise(resolve => setTimeout(resolve, 350));
        
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

  const handleSalvarProposta = async () => {
    if (!empresaId || !identificadorProposta) {
      toast.error('Dados incompletos para salvar a proposta');
      return;
    }
    
    setSalvandoProposta(true);
    
    try {
      const valorTotal = dadosOrcamento?.totais?.totalComDesconto || 0;
      
      const propostaData = {
        empresa_id: empresaId,
        card_id: cardId || null,
        identificador: identificadorProposta,
        status: statusProposta,
        modo_exibicao_valores: modoExibicao,
        
        cliente_empresa: formData.clienteEmpresa,
        cliente_razao_social: formData.clienteRazaoSocial,
        cliente_cnpj: formData.clienteCnpj,
        cliente_email: formData.clienteEmail,
        cliente_telefone: formData.clienteTelefone,
        cliente_endereco: formData.clienteEndereco,
        cliente_bairro: formData.clienteBairro,
        cliente_cidade: formData.clienteCidade,
        cliente_uf: formData.clienteUf,
        cliente_cep: formData.clienteCep,
        cliente_distancia: formData.clienteDistancia ? parseInt(formData.clienteDistancia) : null,
        
        data_proposta: formData.dataProposta,
        validade_dias: parseInt(formData.validadeDias) || 10,
        
        titulo: formData.titulo,
        titulo_modulo: formData.tituloModulo,
        titulo_dores: formData.tituloDores,
        titulo_solucoes: formData.tituloSolucoes,
        titulo_diferenciais: formData.tituloDiferenciais,
        titulo_investimento: formData.tituloInvestimento,
        titulo_pagamento: formData.tituloPagamento,
        titulo_infos: formData.tituloInfos,
        titulo_passos: formData.tituloPassos,
        
        descricao: formData.descricao,
        modulo: formData.modulo,
        publico: formData.publico,
        dores: formData.dores,
        solucoes: formData.solucoes,
        diferenciais: formData.diferenciais,
        pagamento: formData.pagamento,
        infos: formData.infos,
        passos: formData.passos,
        
        dados_orcamento: dadosOrcamento || {},
        valor_total: valorTotal,
        
        created_by: user?.id,
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (propostaId) {
        const { data, error } = await (supabase as any)
          .from('propostas_comerciais_vertical365')
          .update(propostaData)
          .eq('id', propostaId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        toast.success('Proposta atualizada com sucesso!');
      } else {
        const { data, error } = await (supabase as any)
          .from('propostas_comerciais_vertical365')
          .insert(propostaData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        setPropostaId(result.id);
        toast.success('Proposta salva com sucesso!');
      }
      
    } catch (error: any) {
      console.error('Erro ao salvar proposta:', error);
      toast.error(error.message || 'Erro ao salvar proposta. Tente novamente.');
    } finally {
      setSalvandoProposta(false);
    }
  };

  // ---- Funções de Modelos/Templates ----
  const templateFields365 = ['titulo', 'tituloModulo', 'tituloDores', 'tituloSolucoes', 'tituloDiferenciais', 'tituloInvestimento', 'tituloPagamento', 'tituloInfos', 'tituloPassos', 'descricao', 'modulo', 'publico', 'dores', 'solucoes', 'diferenciais', 'pagamento', 'infos', 'passos'] as const;
  const fieldToColumn365: Record<string, string> = {
    titulo: 'titulo', tituloModulo: 'titulo_modulo', tituloDores: 'titulo_dores', tituloSolucoes: 'titulo_solucoes',
    tituloDiferenciais: 'titulo_diferenciais', tituloInvestimento: 'titulo_investimento', tituloPagamento: 'titulo_pagamento',
    tituloInfos: 'titulo_infos', tituloPassos: 'titulo_passos', descricao: 'descricao', modulo: 'modulo', publico: 'publico',
    dores: 'dores', solucoes: 'solucoes', diferenciais: 'diferenciais', pagamento: 'pagamento', infos: 'infos', passos: 'passos',
  };

  const handleSaveModel = async () => {
    if (!empresaId || !modelName.trim()) { toast.error('Informe um nome para o modelo'); return; }
    setSavingModel(true);
    try {
      const data: Record<string, any> = { empresa_id: empresaId, nome: modelName.trim(), tipo_orcamento: 'vertical365', created_by: user?.id };
      templateFields365.forEach(f => { data[fieldToColumn365[f]] = formData[f]; });
      const { error } = await (supabase as any).from('modelos_proposta_comercial').insert(data);
      if (error) throw error;
      toast.success('Modelo salvo com sucesso!');
      setShowSaveModelDialog(false);
      setModelName('');
    } catch (error: any) { console.error('Erro ao salvar modelo:', error); toast.error('Erro ao salvar modelo'); } finally { setSavingModel(false); }
  };

  const handleLoadModelos = async () => {
    if (!empresaId) return;
    setShowLoadModelDialog(true);
    setLoadingModelos(true);
    try {
      const { data, error } = await (supabase as any).from('modelos_proposta_comercial').select('*').eq('empresa_id', empresaId).eq('tipo_orcamento', 'vertical365').order('created_at', { ascending: false });
      if (error) throw error;
      setModelos(data || []);
    } catch (error: any) { console.error('Erro ao carregar modelos:', error); toast.error('Erro ao carregar modelos'); } finally { setLoadingModelos(false); }
  };

  const handleApplyModel = (modelo: any) => {
    setFormData(prev => {
      const updated = { ...prev };
      templateFields365.forEach(f => {
        const col = fieldToColumn365[f];
        if (modelo[col] != null) (updated as any)[f] = modelo[col];
      });
      modelSnapshotRef.current = JSON.stringify(updated);
      return updated;
    });
    setActiveModelId(modelo.id);
    setActiveModelName(modelo.nome);
    setShowLoadModelDialog(false);
    toast.success(`Modelo "${modelo.nome}" aplicado!`);
  };

  const handleUpdateModel = async () => {
    if (!activeModelId) return;
    setUpdatingModel(true);
    try {
      const data: Record<string, any> = {};
      templateFields365.forEach(f => { data[fieldToColumn365[f]] = formData[f]; });
      const { error } = await (supabase as any).from('modelos_proposta_comercial').update(data).eq('id', activeModelId);
      if (error) throw error;
      modelSnapshotRef.current = JSON.stringify(formData);
      toast.success(`Modelo "${activeModelName}" atualizado com sucesso!`);
    } catch (error: any) { console.error('Erro ao atualizar modelo:', error); toast.error(error.message || 'Erro ao atualizar modelo'); } finally { setUpdatingModel(false); }
  };

  const formModified = activeModelId && modelSnapshotRef.current
    ? JSON.stringify(formData) !== modelSnapshotRef.current
    : false;

  const handleDeleteModel = async (id: string) => {
    setDeletingModelId(id);
    try {
      const { error } = await (supabase as any).from('modelos_proposta_comercial').delete().eq('id', id);
      if (error) throw error;
      setModelos(prev => prev.filter(m => m.id !== id));
      toast.success('Modelo excluído');
    } catch (error: any) { toast.error('Erro ao excluir modelo'); } finally { setDeletingModelId(null); }
  };

  const treinamentosValidos = dadosOrcamento?.treinamentos?.filter(t => t.treinamentoId) || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              Proposta Comercial • Vertical 365
            </h2>
            <p className="text-xs text-muted-foreground">
              Edite à esquerda • Visualize à direita • Baixe em PDF
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Status:</Label>
            <Select value={statusProposta} onValueChange={(v) => setStatusProposta(v as typeof statusProposta)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aguardando">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Aguardando
                  </span>
                </SelectItem>
                <SelectItem value="aprovada">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Aprovada
                  </span>
                </SelectItem>
                <SelectItem value="rejeitada">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Rejeitada
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleLoadModelos}>
            <FolderOpen className="h-3 w-3" />
            Usar Modelo
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSaveModelDialog(true)}>
            <BookTemplate className="h-3 w-3" />
            Salvar Modelo
          </Button>
          {activeModelId && formModified && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-orange-400 text-orange-600 hover:bg-orange-50" onClick={handleUpdateModel} disabled={updatingModel}>
              {updatingModel ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Atualizar Modelo
            </Button>
          )}
          {activeModelId && !formModified && (
            <span className="text-[10px] text-muted-foreground italic">Modelo: {activeModelName}</span>
          )}
          
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
          
          <Button 
            variant="default"
            size="sm"
            onClick={handleGerarPDF}
            disabled={gerandoPDF}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            {gerandoPDF ? 'Gerando...' : 'Baixar PDF'}
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Editor (Esquerda) */}
        <ScrollArea className="h-full border-r">
          <div className="p-4 space-y-4">
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
                  <Input value={maskCNPJ(formData.clienteCnpj)} onChange={(e) => handleInputChange('clienteCnpj', e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="00.000.000/0000-00" className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome Fantasia</Label>
                    <Input value={formData.clienteEmpresa} onChange={(e) => handleInputChange('clienteEmpresa', e.target.value)} placeholder="Nome fantasia" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Razão Social</Label>
                    <Input value={formData.clienteRazaoSocial} onChange={(e) => handleInputChange('clienteRazaoSocial', e.target.value)} placeholder="Razão social" className="h-8 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={formData.clienteEmail} onChange={(e) => handleInputChange('clienteEmail', e.target.value)} placeholder="email@empresa.com" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input value={maskPhone(formData.clienteTelefone)} onChange={(e) => handleInputChange('clienteTelefone', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="(00) 00000-0000" className="h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Endereço</Label>
                  <Input value={formData.clienteEndereco} onChange={(e) => handleInputChange('clienteEndereco', e.target.value)} placeholder="Rua, número, complemento" className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Bairro</Label>
                    <Input value={formData.clienteBairro} onChange={(e) => handleInputChange('clienteBairro', e.target.value)} placeholder="Bairro" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Cidade</Label>
                    <Input value={formData.clienteCidade} onChange={(e) => handleInputChange('clienteCidade', e.target.value)} placeholder="Cidade" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">UF</Label>
                    <Input value={formData.clienteUf} onChange={(e) => handleInputChange('clienteUf', e.target.value)} placeholder="SP" className="h-8 text-sm" maxLength={2} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">CEP</Label>
                    <Input value={formData.clienteCep} onChange={(e) => handleInputChange('clienteCep', e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="00000-000" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Distância (km)</Label>
                    <Input value={formData.clienteDistancia} onChange={(e) => handleInputChange('clienteDistancia', e.target.value)} placeholder="Ex.: 330" className="h-8 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data da proposta</Label>
                    <Input type="date" value={formData.dataProposta} onChange={(e) => handleInputChange('dataProposta', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Validade (dias)</Label>
                    <Input value={formData.validadeDias} onChange={(e) => handleInputChange('validadeDias', e.target.value)} placeholder="Ex.: 10" className="h-8 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Empresa */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">CNPJ {fetchingCnpj && <span className="text-orange-500 ml-1">(buscando...)</span>}</Label>
                  <Input 
                    value={maskCNPJ(empresaSST.cnpj)}
                    onChange={(e) => handleEmpresaCnpjChange(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    placeholder="00.000.000/0000-00"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome Fantasia</Label>
                    <Input value={empresaSST.nome} onChange={(e) => setEmpresaSST(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome da empresa" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Razão Social</Label>
                    <Input value={empresaSST.razaoSocial} onChange={(e) => setEmpresaSST(prev => ({ ...prev, razaoSocial: e.target.value }))} placeholder="Razão social" className="h-8 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendedor */}
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
                  <Input value={vendedor.nome} onChange={(e) => setVendedor(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome do vendedor" className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={vendedor.email} onChange={(e) => setVendedor(prev => ({ ...prev, email: e.target.value }))} placeholder="email@empresa.com" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input value={maskPhone(vendedor.telefone)} onChange={(e) => setVendedor(prev => ({ ...prev, telefone: e.target.value.replace(/\D/g, '').slice(0, 11) }))} placeholder="(00) 00000-0000" className="h-8 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Modo de Exibição */}
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                  <Sparkles className="h-4 w-4" />
                  Modo de Exibição dos Valores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={modoExibicao} onValueChange={(v) => setModoExibicao(v as ModoExibicao)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">
                      <div className="flex flex-col">
                        <span className="font-medium">Valor Mensal (12x)</span>
                        <span className="text-xs text-muted-foreground">Exibe o valor dividido em 12 parcelas</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="anual">
                      <div className="flex flex-col">
                        <span className="font-medium">Valor Anual Total</span>
                        <span className="text-xs text-muted-foreground">Exibe o valor total do pacote anual</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="detalhado">
                      <div className="flex flex-col">
                        <span className="font-medium">Detalhado</span>
                        <span className="text-xs text-muted-foreground">Exibe treinamentos + gestão + implantação</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Personalização */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Personalização
                </CardTitle>
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
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Módulo/Serviço</Label>
                    <Input 
                      value={formData.modulo}
                      onChange={(e) => handleInputChange('modulo', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Para quem é</Label>
                    <Input 
                      value={formData.publico}
                      onChange={(e) => handleInputChange('publico', e.target.value)}
                      className="h-8 text-sm"
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
                    <Label className="text-xs">Título Informações</Label>
                    <Input 
                      value={formData.tituloInfos}
                      onChange={(e) => handleInputChange('tituloInfos', e.target.value)}
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
                <p className="text-xs text-muted-foreground font-medium">Conteúdos das seções</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{formData.tituloDores} (uma por linha)</Label>
                    <Textarea 
                      value={formData.dores}
                      onChange={(e) => handleInputChange('dores', e.target.value)}
                      className="text-sm min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{formData.tituloSolucoes} (uma por linha)</Label>
                    <Textarea 
                      value={formData.solucoes}
                      onChange={(e) => handleInputChange('solucoes', e.target.value)}
                      className="text-sm min-h-[80px]"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{formData.tituloDiferenciais} (uma por linha)</Label>
                  <Textarea 
                    value={formData.diferenciais}
                    onChange={(e) => handleInputChange('diferenciais', e.target.value)}
                    className="text-sm min-h-[80px]"
                  />
                </div>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{formData.tituloPagamento}</Label>
                    <Textarea 
                      value={formData.pagamento}
                      onChange={(e) => handleInputChange('pagamento', e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{formData.tituloInfos}</Label>
                    <Textarea 
                      value={formData.infos}
                      onChange={(e) => handleInputChange('infos', e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{formData.tituloPassos}</Label>
                  <Textarea 
                    value={formData.passos}
                    onChange={(e) => handleInputChange('passos', e.target.value)}
                    className="text-sm min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Preview (Direita) */}
        <div className="h-full min-h-0 flex flex-col bg-muted/50">
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

          <div className="flex-1 min-h-0 overflow-auto p-4 flex justify-center items-start">
            <div 
              ref={previewRef}
              className="bg-white shadow-2xl flex-shrink-0"
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
              {/* PÁGINA 1 */}
              {currentPage === 0 && (
                <div className="h-full flex flex-col">
                  <div className="border-b border-gray-200 pb-3 mb-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3">
                        {logoUrl && (
                          <img 
                            src={logoUrl} 
                            alt="Logo" 
                            className="h-10 w-auto object-contain"
                            crossOrigin="anonymous"
                          />
                        )}
                        <div>
                          <h1 className="text-lg font-bold" style={{ color: '#22c55e' }}>
                            {formData.titulo || 'Proposta Comercial'}
                          </h1>
                          {formData.descricao?.trim() && (
                            <p className="text-[10px] opacity-70 max-w-[300px]">
                              {formData.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-[10px]">
                        {identificadorProposta && (
                          <div className="font-mono text-[8px] opacity-50 mb-1">#{identificadorProposta}</div>
                        )}
                        <div className="font-semibold">{parseDateBR(formData.dataProposta)}</div>
                        <div className="opacity-60">Validade: {formData.validadeDias || '10'} dias</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-gray-200">
                    <div className="text-[9px] space-y-0.5">
                      <h4 className="font-bold text-[10px] mb-1" style={{ color: '#22c55e' }}>Cliente</h4>
                      <div><span className="opacity-60">Nome:</span> {formData.clienteEmpresa || '—'}</div>
                      {formData.clienteRazaoSocial && <div><span className="opacity-60">Razão Social:</span> {formData.clienteRazaoSocial}</div>}
                      {formData.clienteCnpj && <div><span className="opacity-60">CNPJ:</span> {maskCNPJ(formData.clienteCnpj)}</div>}
                      {formData.clienteEmail && <div><span className="opacity-60">Email:</span> {formData.clienteEmail}</div>}
                      {formData.clienteTelefone && <div><span className="opacity-60">Tel:</span> {maskPhone(formData.clienteTelefone)}</div>}
                      {(formData.clienteEndereco || formData.clienteCidade) && <div><span className="opacity-60">End:</span> {[formData.clienteEndereco, formData.clienteBairro, formData.clienteCidade, formData.clienteUf].filter(Boolean).join(', ')}</div>}
                    </div>
                    <div className="text-[9px] space-y-0.5">
                      <h4 className="font-bold text-[10px] mb-1" style={{ color: '#22c55e' }}>Empresa</h4>
                      <div><span className="opacity-60">Nome Fantasia:</span> {empresaSST.nome || '—'}</div>
                      {empresaSST.cnpj && <div><span className="opacity-60">CNPJ:</span> {maskCNPJ(empresaSST.cnpj)}</div>}
                    </div>
                    <div className="text-[9px] space-y-0.5">
                      <h4 className="font-bold text-[10px] mb-1" style={{ color: '#22c55e' }}>Vendedor</h4>
                      <div><span className="opacity-60">Nome:</span> {vendedor.nome || '—'}</div>
                      {vendedor.email && <div><span className="opacity-60">Email:</span> {vendedor.email}</div>}
                      {vendedor.telefone && <div><span className="opacity-60">Tel:</span> {maskPhone(vendedor.telefone)}</div>}
                    </div>
                  </div>

                  {formData.modulo?.trim() && (
                    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                      <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloModulo}</h3>
                      <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">
                        <li><strong>{formData.modulo}</strong></li>
                        {formData.publico?.trim() && <li>Indicado para: {formData.publico}</li>}
                      </ul>
                    </div>
                  )}

                  {(linesToArray(formData.dores).length > 0 || linesToArray(formData.solucoes).length > 0) && (
                    <div className="grid grid-cols-1 gap-3 mb-3">
                      {linesToArray(formData.dores).length > 0 && (
                        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                          <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloDores}</h3>
                          <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">
                            {linesToArray(formData.dores).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {linesToArray(formData.solucoes).length > 0 && (
                        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                          <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloSolucoes}</h3>
                          <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">
                            {linesToArray(formData.solucoes).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {linesToArray(formData.diferenciais).length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex-1">
                      <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloDiferenciais}</h3>
                      <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">
                        {linesToArray(formData.diferenciais).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-gray-200 flex justify-between items-end text-[8px] opacity-50">
                    <span>Página 1 de {totalPages}</span>
                    <div className="text-right">
                      <div className="font-medium">{empresaSST.nome || 'Empresa'}</div>
                      {empresaSST.cnpj && <div>CNPJ: {maskCNPJ(empresaSST.cnpj)}</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* PÁGINA 2 - INVESTIMENTO */}
              {currentPage === 1 && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center pb-3 mb-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      {logoUrl && <img src={logoUrl} alt="Logo" className="h-6 w-auto" crossOrigin="anonymous" />}
                      <span className="font-bold text-sm" style={{ color: '#22c55e' }}>{formData.titulo}</span>
                    </div>
                    <span className="text-[9px] opacity-60">{parseDateBR(formData.dataProposta)}</span>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex-1 overflow-hidden">
                    <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-3">{formData.tituloInvestimento}</h3>
                    
                    {/* Modo Mensal */}
                    {modoExibicao === 'mensal' && (
                      <div className="space-y-4">
                        <div className="text-center py-6 border border-green-500/30 rounded-xl bg-green-950/20">
                          <p className="text-[10px] opacity-60 mb-2">Plano Vertical 365</p>
                          <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>
                            {fmtBRL(dadosOrcamento?.totais?.planoVertical365 || 0)}
                          </p>
                          <p className="text-[10px] opacity-60 mt-1">por mês (12x)</p>
                          {Number(dadosOrcamento?.desconto) > 0 && (
                            <p className="text-[9px] text-green-400 mt-2">
                              Desconto de {dadosOrcamento?.desconto}% aplicado
                            </p>
                          )}
                        </div>
                        <div className="text-[10px] opacity-70 space-y-1">
                          <p><strong>Incluso no plano:</strong></p>
                          <ul className="list-disc list-inside pl-2">
                            <li>{treinamentosValidos.length} treinamentos normativos</li>
                            <li>Gestão de treinamentos via sistema</li>
                            <li>Implantação e suporte técnico</li>
                            <li>Certificados e documentação</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Modo Anual */}
                    {modoExibicao === 'anual' && (
                      <div className="space-y-4">
                        <div className="text-center py-6 border border-green-500/30 rounded-xl bg-green-950/20">
                          <p className="text-[10px] opacity-60 mb-2">Investimento Anual Total</p>
                          <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>
                            {fmtBRL(dadosOrcamento?.totais?.totalComDesconto || 0)}
                          </p>
                          {Number(dadosOrcamento?.desconto) > 0 && (
                            <p className="text-[9px] text-green-400 mt-2">
                              Desconto de {dadosOrcamento?.desconto}% aplicado
                            </p>
                          )}
                        </div>
                        <div className="text-[10px] opacity-70 space-y-1">
                          <p><strong>Incluso no plano:</strong></p>
                          <ul className="list-disc list-inside pl-2">
                            <li>{treinamentosValidos.length} treinamentos normativos</li>
                            <li>Gestão de treinamentos via sistema</li>
                            <li>Implantação e suporte técnico</li>
                            <li>Certificados e documentação</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Modo Detalhado */}
                    {modoExibicao === 'detalhado' && (
                      <div className="space-y-3">
                        {/* Treinamentos */}
                        {treinamentosValidos.length > 0 && (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 p-2 text-[10px] font-bold flex justify-between">
                              <span>Treinamentos Inclusos</span>
                              <span style={{ color: '#22c55e' }}>{fmtBRL(dadosOrcamento?.totais?.totalTreinamentos || 0)}</span>
                            </div>
                            <table className="w-full text-[9px]">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left p-1 opacity-60">Treinamento</th>
                                  <th className="text-center p-1 opacity-60">CH</th>
                                  <th className="text-center p-1 opacity-60">Colaboradores por Turma</th>
                                  <th className="text-center p-1 opacity-60">Qtd</th>
                                  <th className="text-right p-1 opacity-60">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {treinamentosValidos.slice(0, 8).map((t, idx) => (
                                  <tr key={idx} className="border-b border-white/5">
                                    <td className="p-1 truncate max-w-[200px]">{t.treinamento}</td>
                                    <td className="text-center p-1">{t.ch}</td>
                                    <td className="text-center p-1">até {t.colaboradoresPorTurma || 30}</td>
                                    <td className="text-center p-1">{t.quantidadeTurma}</td>
                                    <td className="text-right p-1">{fmtBRL(t.valor)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Gestão e Implantação */}
                        <div className="border border-gray-200 rounded-lg p-2 space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span>Gestão de Treinamentos (Anual)</span>
                            <span>{fmtBRL(dadosOrcamento?.totais?.valorGestaoAnual || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Implantação do Sistema</span>
                            <span>{fmtBRL(dadosOrcamento?.totais?.valorImplantacaoSistema || 0)}</span>
                          </div>
                          {Number(dadosOrcamento?.desconto) > 0 && (
                            <div className="flex justify-between text-red-400">
                              <span>Desconto ({dadosOrcamento?.desconto}%)</span>
                              <span>- {fmtBRL(dadosOrcamento?.totais?.valorDesconto || 0)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold pt-1 border-t border-gray-200" style={{ color: '#22c55e' }}>
                            <span>Total Anual</span>
                            <span>{fmtBRL(dadosOrcamento?.totais?.totalComDesconto || 0)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-[11px]" style={{ color: '#22c55e' }}>
                            <span>Plano Vertical 365 (mensal)</span>
                            <span>{fmtBRL(dadosOrcamento?.totais?.planoVertical365 || 0)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-200 flex justify-between items-end text-[8px] opacity-50">
                    <span>Página 2 de {totalPages}</span>
                    <div className="text-right">
                      <div className="font-medium">{empresaSST.nome || 'Empresa'}</div>
                      {empresaSST.cnpj && <div>CNPJ: {maskCNPJ(empresaSST.cnpj)}</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* PÁGINA 3 - CONDIÇÕES */}
              {currentPage === 2 && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center pb-3 mb-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      {logoUrl && <img src={logoUrl} alt="Logo" className="h-6 w-auto" crossOrigin="anonymous" />}
                      <span className="font-bold text-sm" style={{ color: '#22c55e' }}>{formData.titulo}</span>
                    </div>
                    <span className="text-[9px] opacity-60">{parseDateBR(formData.dataProposta)}</span>
                  </div>

                  {(linesToArray(formData.pagamento).length > 0 || linesToArray(formData.infos).length > 0) && (
                    <div className="grid grid-cols-1 gap-3 mb-3">
                      {linesToArray(formData.pagamento).length > 0 && (
                        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                          <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloPagamento}</h3>
                          <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">
                            {linesToArray(formData.pagamento).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {linesToArray(formData.infos).length > 0 && (
                        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                          <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloInfos}</h3>
                          <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">
                            {linesToArray(formData.infos).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {linesToArray(formData.passos).length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                      <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloPassos}</h3>
                      <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">
                        {linesToArray(formData.passos).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-gray-200 flex justify-between items-end text-[8px] opacity-50">
                    <div>
                      <span>Página {totalPages} de {totalPages}</span>
                      <span className="mx-2">•</span>
                      <span>Gerado em {parseDateTimeBR()}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{empresaSST.nome || 'Empresa'}</div>
                      {empresaSST.cnpj && <div>CNPJ: {maskCNPJ(empresaSST.cnpj)}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Salvar Modelo */}
      <Dialog open={showSaveModelDialog} onOpenChange={setShowSaveModelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookTemplate className="h-5 w-5 text-primary" />
              Salvar como Modelo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do modelo</Label>
              <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Ex.: Proposta V365 Padrão" className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">O modelo salva apenas os textos da proposta (títulos, descrições, seções). Dados do cliente e orçamento não são incluídos.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveModelDialog(false)}>Cancelar</Button>
              <Button onClick={handleSaveModel} disabled={savingModel || !modelName.trim()}>
                {savingModel ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Modelo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Carregar Modelo */}
      <Dialog open={showLoadModelDialog} onOpenChange={setShowLoadModelDialog}>
        <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-5 w-5 text-primary" />
              Modelos Salvos
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {loadingModelos ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : modelos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Nenhum modelo salvo para Vertical 365</div>
            ) : (
              <div className="space-y-2">
                {modelos.map((modelo) => (
                  <div key={modelo.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 cursor-pointer" onClick={() => handleApplyModel(modelo)}>
                      <div className="font-medium text-sm">{modelo.nome}</div>
                      <div className="text-xs text-muted-foreground">{modelo.titulo || 'Sem título'} • {new Date(modelo.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteModel(modelo.id)} disabled={deletingModelId === modelo.id}>
                      {deletingModelId === modelo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
