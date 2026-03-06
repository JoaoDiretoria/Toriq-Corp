import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Download, FileText, Building2, User, CheckCircle2, Sparkles, Briefcase,
  ChevronLeft, ChevronRight, Save, Loader2, Clock, Users, Layers, Package,
  BookTemplate, FolderOpen, Trash2 as Trash2Icon, RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';


// Item do orçamento - apenas custo técnico base (sem deslocamento, encargos ou margem por item)
interface ItemOrcamento {
  id: string;
  produtoId: string | null;
  nome: string;
  modoElaboracao: string;
  quantidade: number;
  custoTotalBase: number;
  horasTecnicas: number;
  custoHoraTecnica: number;
  numColaboradores: number;
  custoColaborador: number;
  qtdSetores: number;
  custoSetor: number;
  qtdCargos: number;
  custoCargo: number;
  grauRisco: number;
  periodoMeses: number;
  nomePacote: string;
  custoPacote: number;
  tipoTreinamento?: 'formacao' | 'reciclagem' | '';
  cargaHoraria?: number;
  colaboradoresPorTurma?: number;
  norma?: string;
  categoria?: string;
}

// Custos globais de deslocamento e diárias
interface CustosGlobais {
  km: number;
  custoKm: number;
  noitesHotel: number;
  custoNoite: number;
  diasAlimentacao: number;
  custoDiaAlimentacao: number;
  pedagio: number;
}

// Encargos e taxas globais
interface EncargosGlobais {
  comissaoPct: number;
  impostoPct: number;
  taxaAdminPct: number;
}

// Precificação global
interface PrecificacaoGlobal {
  modoPrecificacao: 'margin' | 'markup';
  margemPct: number;
  markupPct: number;
}

interface DadosOrcamento {
  itens?: ItemOrcamento[];
  comissaoPct?: number;
  impostoPct?: number;
  taxaAdminPct?: number;
  modoPrecificacao?: 'margin' | 'markup';
  margemPct?: number;
  markupPct?: number;
  descontoTipo?: 'percentual' | 'valor';
  descontoValor?: number;
  desconto?: {
    tipo: 'percentual' | 'valor';
    valor: number;
    valorDesconto: number;
    totalComDesconto: number;
  };
  totais?: {
    custoBase: number;
    totalEncargos: number;
    custoTotal: number;
    precoTotal: number;
    lucro: number;
    margemReal: number;
    markupReal: number;
    valorDesconto?: number;
    precoComDesconto?: number;
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

interface PropostaComercialServicosSSTEditorProps {
  onClose: () => void;
  dadosOrcamento?: DadosOrcamento | null;
  clienteNome?: string;
  clienteCidade?: string;
  clienteInfo?: ClienteInfo;
  cardId?: string;
  onSaveProposta?: (propostaId: string) => void;
  propostaExistente?: any;
}


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
  const sigla = nomeEmpresa.split(' ').filter(p => p.length > 2).slice(0, 3).map(p => p[0].toUpperCase()).join('') || 'SST';
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

// Calcular custo técnico base do item (apenas custo do modo × quantidade, SEM deslocamento)
const calcularCustoTecnicoItem = (item: ItemOrcamento): number => {
  let custoModo = 0;
  switch (item.modoElaboracao) {
    case 'custo_total': custoModo = item.custoTotalBase * item.quantidade; break;
    case 'hora_tecnica': custoModo = item.horasTecnicas * item.custoHoraTecnica * item.quantidade; break;
    case 'colaborador': custoModo = item.numColaboradores * item.custoColaborador * item.quantidade; break;
    case 'cargos_risco': custoModo = ((item.qtdSetores * item.custoSetor) + (item.qtdCargos * item.custoCargo)) * item.grauRisco * item.quantidade; break;
    case 'pacotes': custoModo = item.custoPacote * item.quantidade * item.periodoMeses; break;
  }
  return custoModo;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Calcular valor final proporcional do item para exibição no relatório
// Peso do item = Custo técnico do item ÷ Custo Base Total
// Valor final do item = Preço Final × Peso do item
const calcularValorFinalProporcionalItem = (
  item: ItemOrcamento, 
  custoTecnicoTotal: number, 
  precoFinal: number
): { valorTotal: number; valorUnitario: number } => {
  const custoTecnicoItem = calcularCustoTecnicoItem(item);
  
  // Se não há custo técnico total, retorna 0
  if (custoTecnicoTotal <= 0) {
    return { valorTotal: 0, valorUnitario: 0 };
  }
  
  // Peso do item dentro do custo base total
  const pesoItem = custoTecnicoItem / custoTecnicoTotal;
  
  // Valor final do item = Preço Final × Peso do item
  const valorTotal = precoFinal * pesoItem;
  
  // Valor unitário = Valor final do item ÷ Quantidade
  const valorUnitario = item.quantidade > 0 ? valorTotal / item.quantidade : 0;
  
  return { 
    valorTotal: Number.isFinite(valorTotal) ? valorTotal : 0, 
    valorUnitario: Number.isFinite(valorUnitario) ? valorUnitario : 0 
  };
};

export function PropostaComercialServicosSSTEditor({ onClose, dadosOrcamento, clienteNome = '', clienteCidade = '', clienteInfo, cardId, onSaveProposta, propostaExistente }: PropostaComercialServicosSSTEditorProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.7);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [salvandoProposta, setSalvandoProposta] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [statusProposta, setStatusProposta] = useState<'aguardando' | 'aprovada' | 'rejeitada'>(propostaExistente?.status || 'aguardando');
  const [propostaId, setPropostaId] = useState<string | null>(propostaExistente?.id || null);
    const { user, empresa } = useAuth();
  const empresaId = empresa?.id;
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [identificadorProposta, setIdentificadorProposta] = useState(propostaExistente?.identificador || '');
  const [empresaSST, setEmpresaSST] = useState({ nome: empresa?.nome || '', razaoSocial: '', cnpj: '', telefone: '' });
  const [vendedor, setVendedor] = useState({ nome: user?.user_metadata?.nome || '', email: user?.email || '', telefone: '' });

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
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [produtosMap, setProdutosMap] = useState<Record<string, { norma: string | null; categoria: string | null }>>({});

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
    titulo: pe?.titulo ?? 'Proposta Comercial • Serviços de SST',
    tituloServicos: pe?.titulo_servicos ?? '1) Serviços oferecidos',
    tituloDores: pe?.titulo_dores ?? '2) Dores que resolvemos',
    tituloSolucoes: pe?.titulo_solucoes ?? '3) O que você ganha',
    tituloDiferenciais: pe?.titulo_diferenciais ?? '4) Diferenciais',
    tituloInvestimento: pe?.titulo_investimento ?? '5) Investimento',
    tituloPagamento: pe?.titulo_pagamento ?? '6) Condições de pagamento',
    tituloInfos: pe?.titulo_infos ?? '7) Informações adicionais',
    tituloPassos: pe?.titulo_passos ?? '8) Próximos passos',
    descricao: pe?.descricao ?? 'Proposta de serviços de Segurança e Saúde no Trabalho com entrega profissional e documentação completa.',
    servicos: pe?.servicos ?? 'Serviços de SST • Consultoria Especializada',
    publico: pe?.publico ?? 'Empresas que precisam de conformidade com NRs',
    dores: pe?.dores ?? '- Falta de conformidade com normas regulamentadoras\n- Riscos de autuações e multas trabalhistas\n- Dificuldade em manter documentação atualizada\n- Ausência de gestão de riscos ocupacionais',
    solucoes: pe?.solucoes ?? '- Conformidade total com legislação vigente\n- Documentação técnica completa e atualizada\n- Redução de riscos de acidentes e doenças\n- Suporte técnico especializado contínuo',
    diferenciais: pe?.diferenciais ?? '- Equipe técnica qualificada e experiente\n- Atendimento personalizado às necessidades\n- Documentação digital organizada\n- Acompanhamento e suporte contínuo\n- Preços competitivos e transparentes',
    pagamento: pe?.pagamento ?? '- À vista: desconto a combinar\n- Parcelamento: até 3x no cartão\n- Faturamento: a combinar',
    infos: pe?.infos ?? '- Agendamento conforme disponibilidade\n- Valores podem variar por complexidade\n- Inclui documentação técnica',
    passos: pe?.passos ?? '1) Aprovação da proposta e assinatura do contrato\n2) Levantamento de informações e diagnóstico\n3) Execução dos serviços contratados\n4) Entrega de documentação e relatórios'
  });
  
  useEffect(() => {
    const loadEmpresaData = async () => {
      if (!empresaId) return;
      try {
        const { data: empresaData } = await (supabase as any).from('empresas').select('nome, razao_social, cnpj, telefone').eq('id', empresaId).single();
        if (empresaData) {
          setEmpresaSST({ nome: empresaData.nome || '', razaoSocial: empresaData.razao_social || '', cnpj: empresaData.cnpj || '', telefone: empresaData.telefone || '' });
          if (!propostaExistente) setIdentificadorProposta(gerarIdentificadorProposta(empresaData.nome || 'SST'));
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

  // Fetch products to get norma for each item (norma is in catalogo_treinamentos)
  useEffect(() => {
    const loadProdutos = async () => {
      if (!empresaId) return;
      try {
        const { data } = await (supabase as any)
          .from('produtos_servicos')
          .select('id, norma, categoria:categoria_id(nome), catalogo:treinamento_id(norma)')
          .eq('empresa_id', empresaId);
        if (data) {
          const map: Record<string, { norma: string | null; categoria: string | null }> = {};
          data.forEach((p: any) => {
            // Format norma as "NR-XX" if it's just a number
            let normaVal = p.norma || p.catalogo?.norma || null;
            if (normaVal && !normaVal.toString().toLowerCase().startsWith('nr')) {
              normaVal = `NR-${normaVal.toString().padStart(2, '0')}`;
            }
            map[p.id] = { norma: normaVal, categoria: p.categoria?.nome || null };
          });
          setProdutosMap(map);
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      }
    };
    loadProdutos();
  }, [empresaId]);

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
    } finally {
      setFetchingCnpj(false);
    }
  };

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    const updateScale = () => {
      const containerW = container.clientWidth - 32; // subtract padding
      const containerH = container.clientHeight - 32;
      const scaleW = containerW / 595;
      const scaleH = containerH / 842;
      setPreviewScale(Math.min(scaleW, scaleH, 1));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const handleInputChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));
  const linesToArray = (text: string): string[] => text.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.replace(/^(\-|\•|\*|\d+[\)\.\-])\s*/, '').trim()).filter(Boolean);

  const itensOrcamento = dadosOrcamento?.itens || [];
  const totaisOrcamento = dadosOrcamento?.totais;

  // ============ DYNAMIC PAGINATION SYSTEM ============
  // All content flows as blocks. Pages are created on demand.
  // Each block has an estimated height. When a page fills up, content flows to next page.
  
  const PAGE_HEIGHT = 720; // Total usable height per page (A4 minus margins)
  const HEADER_HEIGHT = 35; // Page header (logo, title, date)
  const FOOTER_HEIGHT = 25; // Page footer
  const SECTION_TITLE_HEIGHT = 25; // Section title (e.g., "5) INVESTIMENTO")
  const TABLE_HEADER_HEIGHT = 18; // Table column headers
  const ROW_HEIGHT = 16; // Base row height
  const ROW_MULTILINE_HEIGHT = 24; // Row with wrapped text
  const DISCOUNT_ROW_HEIGHT = 22;
  const CLOSING_SECTION_HEIGHT = 50; // Each closing section (pagamento, infos, passos)
  
  // Estimate row height based on name length
  const getRowHeight = (item: typeof itensOrcamento[0]) => {
    const produtoInfo = item.produtoId ? produtosMap[item.produtoId] : null;
    const norma = produtoInfo?.norma || (item as any).norma || '';
    const nomeServico = item.nomePacote || item.nome || 'Serviço';
    const fullName = norma ? `${norma} - ${nomeServico}` : nomeServico;
    return fullName.length > 45 ? ROW_MULTILINE_HEIGHT : ROW_HEIGHT;
  };

  // Calculate closing sections height
  const pagamentoHeight = linesToArray(formData.pagamento).length > 0 ? CLOSING_SECTION_HEIGHT : 0;
  const infosHeight = linesToArray(formData.infos).length > 0 ? CLOSING_SECTION_HEIGHT : 0;
  const passosHeight = linesToArray(formData.passos).length > 0 ? CLOSING_SECTION_HEIGHT : 0;
  const totalClosingHeight = pagamentoHeight + infosHeight + passosHeight;

  // Build page content dynamically
  type PageContent = {
    type: 'intro' | 'items' | 'closing';
    itemsRange?: { start: number; end: number; isFirst: boolean; isLast: boolean };
    includeClosing?: boolean;
    closingSections?: ('pagamento' | 'infos' | 'passos')[];
  };
  
  const pages: PageContent[] = [];
  
  // Page 0 is always intro
  pages.push({ type: 'intro' });
  
  // Build item pages with potential closing sections on last page
  if (itensOrcamento.length > 0) {
    let currentIdx = 0;
    let isFirstItemPage = true;
    
    while (currentIdx < itensOrcamento.length) {
      let availableHeight = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;
      
      // First item page needs section title
      if (isFirstItemPage) {
        availableHeight -= SECTION_TITLE_HEIGHT;
      }
      
      // Always need table header
      availableHeight -= TABLE_HEADER_HEIGHT;
      
      const startIdx = currentIdx;
      let usedHeight = 0;
      
      // Add items until page is full
      while (currentIdx < itensOrcamento.length) {
        const rowHeight = getRowHeight(itensOrcamento[currentIdx]);
        if (usedHeight + rowHeight > availableHeight && currentIdx > startIdx) {
          break;
        }
        usedHeight += rowHeight;
        currentIdx++;
      }
      
      const isLastItemPage = currentIdx >= itensOrcamento.length;
      const remainingHeight = availableHeight - usedHeight;
      
      // Check if closing sections fit on this page
      let includeClosing = false;
      let closingSections: ('pagamento' | 'infos' | 'passos')[] = [];
      
      if (isLastItemPage) {
        // Add discount row height if applicable
        const discountHeight = dadosOrcamento?.desconto?.valor ? DISCOUNT_ROW_HEIGHT : 0;
        const spaceAfterItems = remainingHeight - discountHeight;
        
        // Try to fit closing sections
        if (spaceAfterItems >= totalClosingHeight) {
          includeClosing = true;
          if (pagamentoHeight > 0) closingSections.push('pagamento');
          if (infosHeight > 0) closingSections.push('infos');
          if (passosHeight > 0) closingSections.push('passos');
        }
      }
      
      pages.push({
        type: 'items',
        itemsRange: { start: startIdx, end: currentIdx, isFirst: isFirstItemPage, isLast: isLastItemPage },
        includeClosing,
        closingSections
      });
      
      isFirstItemPage = false;
    }
    
    // If closing sections didn't fit on last items page, add separate closing page
    const lastPage = pages[pages.length - 1];
    if (lastPage.type === 'items' && !lastPage.includeClosing && totalClosingHeight > 0) {
      const sections: ('pagamento' | 'infos' | 'passos')[] = [];
      if (pagamentoHeight > 0) sections.push('pagamento');
      if (infosHeight > 0) sections.push('infos');
      if (passosHeight > 0) sections.push('passos');
      pages.push({ type: 'closing', closingSections: sections });
    }
  } else {
    // No items, just add closing page if there's content
    if (totalClosingHeight > 0) {
      const sections: ('pagamento' | 'infos' | 'passos')[] = [];
      if (pagamentoHeight > 0) sections.push('pagamento');
      if (infosHeight > 0) sections.push('infos');
      if (passosHeight > 0) sections.push('passos');
      pages.push({ type: 'closing', closingSections: sections });
    }
  }
  
  const totalPages = pages.length;

  const handleGerarPDF = async () => {
    if (!previewRef.current) return;
    setGerandoPDF(true);
    const originalPage = currentPage;
    const originalScale = previewScale;
    setPreviewScale(1);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const nomeArquivo = identificadorProposta ? `proposta_sst_${identificadorProposta}` : `proposta_servicos_sst_${formData.clienteEmpresa.replace(/\s+/g, '_').substring(0, 30)}_${new Date().toISOString().slice(0, 10)}`;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        setCurrentPage(pageNum);
        await new Promise(resolve => setTimeout(resolve, 350));
        if (!previewRef.current) continue;
        const canvas = await html2canvas(previewRef.current, { scale: 2.5, useCORS: true, logging: false, backgroundColor: '#ffffff', width: 595, height: 842 });
        const imgData = canvas.toDataURL('image/png', 1.0);
        if (pageNum > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }
      setCurrentPage(originalPage);
      setPreviewScale(originalScale);
      pdf.save(`${nomeArquivo}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) { console.error('Erro ao gerar PDF:', error); toast.error('Erro ao gerar PDF. Tente novamente.'); setCurrentPage(originalPage); setPreviewScale(originalScale); } finally { setGerandoPDF(false); }
  };

  const handleSalvarProposta = async () => {
    if (!empresaId || !identificadorProposta) { toast.error('Dados incompletos para salvar a proposta'); return; }
    setSalvandoProposta(true);
    try {
      const propostaData = {
        empresa_id: empresaId, card_id: cardId || null, identificador: identificadorProposta, status: statusProposta,
        cliente_empresa: formData.clienteEmpresa, cliente_razao_social: formData.clienteRazaoSocial, cliente_cnpj: formData.clienteCnpj,
        cliente_email: formData.clienteEmail, cliente_telefone: formData.clienteTelefone,
        cliente_endereco: formData.clienteEndereco, cliente_bairro: formData.clienteBairro, cliente_cidade: formData.clienteCidade,
        cliente_uf: formData.clienteUf, cliente_cep: formData.clienteCep, cliente_distancia: parseFloat(formData.clienteDistancia) || null,
        data_proposta: formData.dataProposta, validade_dias: parseInt(formData.validadeDias) || 10,
        titulo: formData.titulo, titulo_servicos: formData.tituloServicos, titulo_dores: formData.tituloDores, titulo_solucoes: formData.tituloSolucoes,
        titulo_diferenciais: formData.tituloDiferenciais, titulo_investimento: formData.tituloInvestimento, titulo_pagamento: formData.tituloPagamento,
        titulo_infos: formData.tituloInfos, titulo_passos: formData.tituloPassos, descricao: formData.descricao, servicos: formData.servicos, publico: formData.publico,
        dores: formData.dores, solucoes: formData.solucoes, diferenciais: formData.diferenciais, pagamento: formData.pagamento, infos: formData.infos, passos: formData.passos,
        dados_orcamento: dadosOrcamento || {}, valor_total: totaisOrcamento?.precoTotal || 0, created_by: user?.id, updated_at: new Date().toISOString()
      };
      if (propostaId) {
        const { error } = await (supabase as any).from('propostas_comerciais_servicos_sst').update(propostaData).eq('id', propostaId);
        if (error) throw error;
        toast.success('Proposta atualizada com sucesso!');
        onSaveProposta?.(propostaId);
      } else {
        const { data, error } = await (supabase as any).from('propostas_comerciais_servicos_sst').insert(propostaData).select().single();
        if (error) throw error;
        setPropostaId(data.id);
        toast.success('Proposta salva com sucesso!');
        onSaveProposta?.(data.id);
      }
    } catch (error: any) { console.error('Erro ao salvar proposta:', error); toast.error(error.message || 'Erro ao salvar proposta.'); } finally { setSalvandoProposta(false); }
  };

  // ---- Funções de Modelos/Templates ----
  const templateFieldsSST = ['titulo', 'tituloServicos', 'tituloDores', 'tituloSolucoes', 'tituloDiferenciais', 'tituloInvestimento', 'tituloPagamento', 'tituloInfos', 'tituloPassos', 'descricao', 'servicos', 'publico', 'dores', 'solucoes', 'diferenciais', 'pagamento', 'infos', 'passos'] as const;
  const fieldToColumnSST: Record<string, string> = {
    titulo: 'titulo', tituloServicos: 'titulo_modulo', tituloDores: 'titulo_dores', tituloSolucoes: 'titulo_solucoes',
    tituloDiferenciais: 'titulo_diferenciais', tituloInvestimento: 'titulo_investimento', tituloPagamento: 'titulo_pagamento',
    tituloInfos: 'titulo_infos', tituloPassos: 'titulo_passos', descricao: 'descricao', servicos: 'modulo', publico: 'publico',
    dores: 'dores', solucoes: 'solucoes', diferenciais: 'diferenciais', pagamento: 'pagamento', infos: 'infos', passos: 'passos',
  };

  const handleSaveModel = async () => {
    if (!empresaId || !modelName.trim()) { toast.error('Informe um nome para o modelo'); return; }
    setSavingModel(true);
    try {
      const data: Record<string, any> = { empresa_id: empresaId, nome: modelName.trim(), tipo_orcamento: 'servicos_sst', created_by: user?.id };
      templateFieldsSST.forEach(f => { data[fieldToColumnSST[f]] = formData[f]; });
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
      const { data, error } = await (supabase as any).from('modelos_proposta_comercial').select('*').eq('empresa_id', empresaId).eq('tipo_orcamento', 'servicos_sst').order('created_at', { ascending: false });
      if (error) throw error;
      setModelos(data || []);
    } catch (error: any) { console.error('Erro ao carregar modelos:', error); toast.error('Erro ao carregar modelos'); } finally { setLoadingModelos(false); }
  };

  const handleApplyModel = (modelo: any) => {
    setFormData(prev => {
      const updated = { ...prev };
      templateFieldsSST.forEach(f => {
        const col = fieldToColumnSST[f];
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
    if (!activeModelId || !empresaId) return;
    setUpdatingModel(true);
    try {
      const data: Record<string, any> = {};
      templateFieldsSST.forEach(f => { data[fieldToColumnSST[f]] = formData[f]; });
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

  // Calcular custo técnico total de todos os itens (para cálculo proporcional)
  const custoTecnicoTotalItens = itensOrcamento.reduce((acc, item) => acc + calcularCustoTecnicoItem(item), 0);
  
  // Preço final do orçamento (antes do desconto) - usado para cálculo proporcional
  const precoFinalOrcamento = totaisOrcamento?.precoTotal || 0;

  const renderTabelaItens = (items: typeof itensOrcamento, globalStartIdx: number) => {
    if (!items.length) return null;
    return (
      <table className="w-full text-[6px] border-collapse">
        <thead>
          <tr className="border-b border-gray-300 bg-gray-50">
            <th className="px-0.5 py-0.5 uppercase opacity-60 font-bold text-center whitespace-nowrap border border-gray-200">#</th>
            <th className="px-0.5 py-0.5 uppercase opacity-60 font-bold text-left border border-gray-200">Serviço</th>
            <th className="px-0.5 py-0.5 uppercase opacity-60 font-bold text-center whitespace-nowrap border border-gray-200">Tipo</th>
            <th className="px-0.5 py-0.5 uppercase opacity-60 font-bold text-center whitespace-nowrap border border-gray-200">Categoria</th>
            <th className="px-0.5 py-0.5 uppercase opacity-60 font-bold text-center whitespace-nowrap border border-gray-200">Carga Horária</th>
            <th className="px-0.5 py-0.5 uppercase opacity-60 font-bold text-center whitespace-nowrap border border-gray-200">Colaboradores por Turma</th>
            <th className="px-0.5 py-0.5 uppercase opacity-60 font-bold text-center whitespace-nowrap border border-gray-200">Valor Unitário</th>
            <th className="px-0.5 py-0.5 uppercase opacity-60 font-bold text-center whitespace-nowrap border border-gray-200">Quantidade</th>
            <th className="px-0.5 py-0.5 uppercase opacity-60 font-bold text-center whitespace-nowrap border border-gray-200">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const { valorTotal, valorUnitario } = calcularValorFinalProporcionalItem(item, custoTecnicoTotalItens, precoFinalOrcamento);
            const tipo = item.tipoTreinamento === 'formacao' ? 'Formação' : item.tipoTreinamento === 'reciclagem' ? 'Reciclagem' : '-';
            const produtoInfo = item.produtoId ? produtosMap[item.produtoId] : null;
            const norma = produtoInfo?.norma || (item as any).norma || '';
            const categoria = produtoInfo?.categoria || (item as any).categoria || '-';
            const nomeServico = item.nomePacote || item.nome || 'Serviço';
            const nomeComNR = norma ? `${norma} - ${nomeServico}` : nomeServico;
            return (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="text-center px-0.5 py-0.5 font-mono align-middle border border-gray-100">{globalStartIdx + idx + 1}</td>
                <td className="px-0.5 py-0.5 align-middle border border-gray-100 leading-tight" style={{ wordBreak: 'break-word', maxWidth: '120px' }}>{nomeComNR}</td>
                <td className="text-center px-0.5 py-0.5 opacity-70 whitespace-nowrap align-middle border border-gray-100">{tipo}</td>
                <td className="text-center px-0.5 py-0.5 opacity-70 whitespace-nowrap align-middle border border-gray-100">{categoria}</td>
                <td className="text-center px-0.5 py-0.5 font-mono whitespace-nowrap align-middle border border-gray-100">{item.cargaHoraria ? `${item.cargaHoraria}h` : '-'}</td>
                <td className="text-center px-0.5 py-0.5 font-mono whitespace-nowrap align-middle border border-gray-100">{item.colaboradoresPorTurma || 30}</td>
                <td className="text-center px-0.5 py-0.5 font-bold whitespace-nowrap align-middle border border-gray-100" style={{ color: '#f97316' }}>{fmtBRL(valorUnitario)}</td>
                <td className="text-center px-0.5 py-0.5 font-mono align-middle border border-gray-100">{item.quantidade}</td>
                <td className="text-center px-0.5 py-0.5 font-bold whitespace-nowrap align-middle border border-gray-100" style={{ color: '#f97316' }}>{fmtBRL(valorTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-orange-500" />Proposta Comercial - Serviços SST</h2>
            <p className="text-xs text-muted-foreground">Edite à esquerda • Visualize à direita • Baixe em PDF</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Status:</Label>
            <Select value={statusProposta} onValueChange={(v) => setStatusProposta(v as typeof statusProposta)}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aguardando"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" />Aguardando</span></SelectItem>
                <SelectItem value="aprovada"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" />Aprovada</span></SelectItem>
                <SelectItem value="rejeitada"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" />Rejeitada</span></SelectItem>
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
            <Badge variant="outline" className="h-7 text-xs gap-1 border-green-400 text-green-600 bg-green-50 px-2">
              <CheckCircle2 className="h-3 w-3" />
              {activeModelName}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleSalvarProposta} disabled={salvandoProposta} className="gap-2">
            {salvandoProposta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{salvandoProposta ? 'Salvando...' : (propostaId ? 'Atualizar' : 'Salvar')}
          </Button>
          <Button variant="default" size="sm" onClick={handleGerarPDF} disabled={gerandoPDF} className="gap-2 bg-orange-500 hover:bg-orange-600">
            <Download className="h-4 w-4" />{gerandoPDF ? 'Gerando...' : 'Baixar PDF'}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0">
        <ScrollArea className="h-full border-r">
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Dados do Cliente</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">CNPJ</Label>
                  <Input value={maskCNPJ(formData.clienteCnpj)} onChange={(e) => handleInputChange('clienteCnpj', e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="00.000.000/0000-00" className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Nome Fantasia</Label><Input value={formData.clienteEmpresa} onChange={(e) => handleInputChange('clienteEmpresa', e.target.value)} placeholder="Nome fantasia" className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Razão Social</Label><Input value={formData.clienteRazaoSocial} onChange={(e) => handleInputChange('clienteRazaoSocial', e.target.value)} placeholder="Razão social" className="h-8 text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Email</Label><Input value={formData.clienteEmail} onChange={(e) => handleInputChange('clienteEmail', e.target.value)} placeholder="email@empresa.com" className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Telefone</Label><Input value={maskPhone(formData.clienteTelefone)} onChange={(e) => handleInputChange('clienteTelefone', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="(00) 00000-0000" className="h-8 text-sm" /></div>
                </div>
                <div>
                  <Label className="text-xs">Endereço</Label>
                  <Input value={formData.clienteEndereco} onChange={(e) => handleInputChange('clienteEndereco', e.target.value)} placeholder="Rua, número, complemento" className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Bairro</Label><Input value={formData.clienteBairro} onChange={(e) => handleInputChange('clienteBairro', e.target.value)} placeholder="Bairro" className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Cidade</Label><Input value={formData.clienteCidade} onChange={(e) => handleInputChange('clienteCidade', e.target.value)} placeholder="Cidade" className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">UF</Label><Input value={formData.clienteUf} onChange={(e) => handleInputChange('clienteUf', e.target.value)} placeholder="SP" className="h-8 text-sm" maxLength={2} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">CEP</Label><Input value={formData.clienteCep} onChange={(e) => handleInputChange('clienteCep', e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="00000-000" className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Distância (km)</Label><Input value={formData.clienteDistancia} onChange={(e) => handleInputChange('clienteDistancia', e.target.value)} placeholder="Ex.: 330" className="h-8 text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Data da proposta</Label><Input type="date" value={formData.dataProposta} onChange={(e) => handleInputChange('dataProposta', e.target.value)} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Validade (dias)</Label><Input value={formData.validadeDias} onChange={(e) => handleInputChange('validadeDias', e.target.value)} placeholder="Ex.: 10" className="h-8 text-sm" /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4" />Empresa SST (Emitente)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Nome</Label><Input value={empresaSST.nome} onChange={(e) => setEmpresaSST(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome da empresa" className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Razão Social</Label><Input value={empresaSST.razaoSocial} onChange={(e) => setEmpresaSST(prev => ({ ...prev, razaoSocial: e.target.value }))} placeholder="Razão social" className="h-8 text-sm" /></div>
                </div>
                <div><Label className="text-xs">CNPJ {fetchingCnpj && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</Label><Input value={maskCNPJ(empresaSST.cnpj)} onChange={(e) => handleEmpresaCnpjChange(e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="00.000.000/0000-00" className="h-8 text-sm" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" />Vendedor / Responsável</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Nome</Label><Input value={vendedor.nome} onChange={(e) => setVendedor(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome do vendedor" className="h-8 text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Email</Label><Input value={vendedor.email} onChange={(e) => setVendedor(prev => ({ ...prev, email: e.target.value }))} placeholder="email@empresa.com" className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Telefone</Label><Input value={maskPhone(vendedor.telefone)} onChange={(e) => setVendedor(prev => ({ ...prev, telefone: e.target.value.replace(/\D/g, '').slice(0, 11) }))} placeholder="(00) 00000-0000" className="h-8 text-sm" /></div>
                </div>
              </CardContent>
            </Card>

            
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" />Personalização</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Título da proposta</Label><Input value={formData.titulo} onChange={(e) => handleInputChange('titulo', e.target.value)} className="h-8 text-sm" /></div>
                <div><Label className="text-xs">Descrição curta</Label><Textarea value={formData.descricao} onChange={(e) => handleInputChange('descricao', e.target.value)} className="text-sm min-h-[60px]" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Serviços</Label><Input value={formData.servicos} onChange={(e) => handleInputChange('servicos', e.target.value)} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Para quem é</Label><Input value={formData.publico} onChange={(e) => handleInputChange('publico', e.target.value)} className="h-8 text-sm" /></div>
                </div>
                <Separator className="my-2" /><p className="text-xs text-muted-foreground font-medium">Títulos das seções (editáveis)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Título Serviços</Label><Input value={formData.tituloServicos} onChange={(e) => handleInputChange('tituloServicos', e.target.value)} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Título Dores</Label><Input value={formData.tituloDores} onChange={(e) => handleInputChange('tituloDores', e.target.value)} className="h-8 text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Título Soluções</Label><Input value={formData.tituloSolucoes} onChange={(e) => handleInputChange('tituloSolucoes', e.target.value)} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Título Diferenciais</Label><Input value={formData.tituloDiferenciais} onChange={(e) => handleInputChange('tituloDiferenciais', e.target.value)} className="h-8 text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Título Investimento</Label><Input value={formData.tituloInvestimento} onChange={(e) => handleInputChange('tituloInvestimento', e.target.value)} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Título Pagamento</Label><Input value={formData.tituloPagamento} onChange={(e) => handleInputChange('tituloPagamento', e.target.value)} className="h-8 text-sm" /></div>
                </div>
                <div><Label className="text-xs">Título Próximos Passos</Label><Input value={formData.tituloPassos} onChange={(e) => handleInputChange('tituloPassos', e.target.value)} className="h-8 text-sm" /></div>
                <Separator className="my-2" /><p className="text-xs text-muted-foreground font-medium">Conteúdos das seções</p>
                <div><Label className="text-xs">{formData.tituloDores} (uma por linha)</Label><Textarea value={formData.dores} onChange={(e) => handleInputChange('dores', e.target.value)} className="text-sm min-h-[80px]" /></div>
                <div><Label className="text-xs">{formData.tituloSolucoes} (uma por linha)</Label><Textarea value={formData.solucoes} onChange={(e) => handleInputChange('solucoes', e.target.value)} className="text-sm min-h-[80px]" /></div>
                <div><Label className="text-xs">{formData.tituloDiferenciais} (uma por linha)</Label><Textarea value={formData.diferenciais} onChange={(e) => handleInputChange('diferenciais', e.target.value)} className="text-sm min-h-[80px]" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Condições & Informações</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">{formData.tituloPagamento}</Label><Textarea value={formData.pagamento} onChange={(e) => handleInputChange('pagamento', e.target.value)} className="text-sm min-h-[60px]" /></div>
                <div><Label className="text-xs">{formData.tituloInfos}</Label><Textarea value={formData.infos} onChange={(e) => handleInputChange('infos', e.target.value)} className="text-sm min-h-[60px]" /></div>
                <div><Label className="text-xs">{formData.tituloPassos}</Label><Textarea value={formData.passos} onChange={(e) => handleInputChange('passos', e.target.value)} className="text-sm min-h-[80px]" /></div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="h-full min-h-0 flex flex-col bg-muted/50">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted">
            <span className="text-xs text-muted-foreground">Preview A4</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-xs font-medium min-w-[80px] text-center text-foreground">Página {currentPage + 1} de {totalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          <div ref={previewContainerRef} className="flex-1 min-h-0 overflow-auto p-4 flex justify-center items-start">
            <div style={{ width: '595px', height: '842px', transform: `scale(${previewScale})`, transformOrigin: 'top center', flexShrink: 0 }}>
              <div ref={previewRef} className="bg-white shadow-2xl" style={{ width: '595px', height: '842px', padding: '40px', color: '#1f2937', fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial', fontSize: '11px', lineHeight: '1.4', boxSizing: 'border-box', overflow: 'hidden' }}>
              {currentPage === 0 && (
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="border-b border-gray-200 pb-3 mb-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3">
                        {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" crossOrigin="anonymous" />}
                        <div>
                          <h1 className="text-lg font-bold" style={{ color: '#f97316' }}>{formData.titulo || 'Proposta Comercial'}</h1>
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
                  {/* Dados Cliente / Empresa / Vendedor */}
                  <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-gray-200">
                    <div className="text-[9px] space-y-0.5">
                      <h4 className="font-bold text-[10px] mb-1" style={{ color: '#f97316' }}>Cliente</h4>
                      <div><span className="opacity-60">Nome:</span> {formData.clienteEmpresa || '—'}</div>
                      {formData.clienteRazaoSocial && <div><span className="opacity-60">Razão Social:</span> {formData.clienteRazaoSocial}</div>}
                      {formData.clienteCnpj && <div><span className="opacity-60">CNPJ:</span> {maskCNPJ(formData.clienteCnpj)}</div>}
                      {formData.clienteEmail && <div><span className="opacity-60">Email:</span> {formData.clienteEmail}</div>}
                      {formData.clienteTelefone && <div><span className="opacity-60">Tel:</span> {maskPhone(formData.clienteTelefone)}</div>}
                      {(formData.clienteEndereco || formData.clienteCidade) && <div><span className="opacity-60">End:</span> {[formData.clienteEndereco, formData.clienteBairro, formData.clienteCidade, formData.clienteUf].filter(Boolean).join(', ')}</div>}
                    </div>
                    <div className="text-[9px] space-y-0.5">
                      <h4 className="font-bold text-[10px] mb-1" style={{ color: '#f97316' }}>Empresa SST</h4>
                      <div><span className="opacity-60">Nome Fantasia:</span> {empresaSST.nome || '—'}</div>
                      {empresaSST.cnpj && <div><span className="opacity-60">CNPJ:</span> {maskCNPJ(empresaSST.cnpj)}</div>}
                    </div>
                    <div className="text-[9px] space-y-0.5">
                      <h4 className="font-bold text-[10px] mb-1" style={{ color: '#f97316' }}>Vendedor</h4>
                      <div><span className="opacity-60">Nome:</span> {vendedor.nome || '—'}</div>
                      {vendedor.email && <div><span className="opacity-60">Email:</span> {vendedor.email}</div>}
                      {vendedor.telefone && <div><span className="opacity-60">Tel:</span> {maskPhone(vendedor.telefone)}</div>}
                    </div>
                  </div>
                  {/* Seções de conteúdo — blocos verticais, só renderiza se tiver conteúdo */}
                  {(formData.servicos || formData.publico) && (
                    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                      <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloServicos}</h3>
                      <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">
                        {formData.servicos && <li><strong>{formData.servicos}</strong></li>}
                        {formData.publico && <li>Indicado para: {formData.publico}</li>}
                      </ul>
                    </div>
                  )}
                  {linesToArray(formData.diferenciais).length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                      <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloDiferenciais}</h3>
                      <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">{linesToArray(formData.diferenciais).map((item, i) => <li key={i}>{item}</li>)}</ul>
                    </div>
                  )}
                  {linesToArray(formData.dores).length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                      <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloDores}</h3>
                      <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">{linesToArray(formData.dores).map((item, i) => <li key={i}>{item}</li>)}</ul>
                    </div>
                  )}
                  {linesToArray(formData.solucoes).length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 mb-3">
                      <h3 className="text-[9px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloSolucoes}</h3>
                      <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-80">{linesToArray(formData.solucoes).map((item, i) => <li key={i}>{item}</li>)}</ul>
                    </div>
                  )}
                  {/* Footer */}
                  <div className="mt-auto pt-3 border-t border-gray-200 flex justify-between items-end text-[8px] opacity-50">
                    <span>Página 1 de {totalPages}</span>
                    <div className="text-right"><div className="font-medium">{empresaSST.nome || 'Empresa SST'}</div>{empresaSST.cnpj && <div>CNPJ: {empresaSST.cnpj}</div>}</div>
                  </div>
                </div>
              )}

              {/* Dynamic page rendering based on pages array */}
              {currentPage > 0 && (() => {
                const pageData = pages[currentPage];
                if (!pageData) return null;
                
                // Render closing sections helper
                const renderClosingSections = (sections: ('pagamento' | 'infos' | 'passos')[]) => (
                  <>
                    {sections.includes('pagamento') && linesToArray(formData.pagamento).length > 0 && (
                      <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 mb-2">
                        <h3 className="text-[8px] uppercase tracking-wider opacity-60 mb-1">{formData.tituloPagamento}</h3>
                        <ul className="list-disc list-inside text-[9px] space-y-0.5 opacity-80">{linesToArray(formData.pagamento).map((item, i) => <li key={i}>{item}</li>)}</ul>
                      </div>
                    )}
                    {sections.includes('infos') && linesToArray(formData.infos).length > 0 && (
                      <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 mb-2">
                        <h3 className="text-[8px] uppercase tracking-wider opacity-60 mb-1">{formData.tituloInfos}</h3>
                        <ul className="list-disc list-inside text-[9px] space-y-0.5 opacity-80">{linesToArray(formData.infos).map((item, i) => <li key={i}>{item}</li>)}</ul>
                      </div>
                    )}
                    {sections.includes('passos') && linesToArray(formData.passos).length > 0 && (
                      <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 mb-2">
                        <h3 className="text-[8px] uppercase tracking-wider opacity-60 mb-1">{formData.tituloPassos}</h3>
                        <ul className="list-disc list-inside text-[9px] space-y-0.5 opacity-80">{linesToArray(formData.passos).map((item, i) => <li key={i}>{item}</li>)}</ul>
                      </div>
                    )}
                  </>
                );

                // Items page (with optional closing sections)
                if (pageData.type === 'items' && pageData.itemsRange) {
                  const { start, end, isFirst, isLast } = pageData.itemsRange;
                  const pageItems = itensOrcamento.slice(start, end);
                  
                  return (
                    <div className="h-full flex flex-col">
                      <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-200 flex-shrink-0">
                        <div className="flex items-center gap-2">{logoUrl && <img src={logoUrl} alt="Logo" className="h-5 w-auto" crossOrigin="anonymous" />}<span className="font-bold text-xs" style={{ color: '#f97316' }}>{formData.titulo}</span></div>
                        <span className="text-[8px] opacity-60">{parseDateBR(formData.dataProposta)}</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {isFirst && (
                          <h3 className="text-[8px] uppercase tracking-wider opacity-60 mb-2">{formData.tituloInvestimento}</h3>
                        )}
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white mb-2" style={{ borderColor: '#f9731640' }}>
                          <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 bg-gray-100">
                            <div className="flex items-center gap-1 font-bold text-[8px]">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f97316' }} />
                              {isFirst ? 'Serviços' : 'Serviços (continuação)'}
                            </div>
                            <div className="text-[8px]">
                              {isFirst ? (
                                <><span className="opacity-60">Total: </span><span className="font-bold" style={{ color: '#f97316' }}>{fmtBRL(dadosOrcamento?.desconto?.valor ? dadosOrcamento.desconto.totalComDesconto : (totaisOrcamento?.precoTotal || 0))}</span></>
                              ) : (
                                <span className="opacity-60">Itens {start + 1}-{end} de {itensOrcamento.length}</span>
                              )}
                            </div>
                          </div>
                          {renderTabelaItens(pageItems, start)}
                          {/* Resumo no fim da tabela - última página de itens */}
                          {isLast && (
                            <div className="bg-gray-100 border-t border-gray-300 px-2 py-1.5">
                              <div className="flex justify-end items-center gap-4 text-[8px]">
                                {dadosOrcamento?.desconto && dadosOrcamento.desconto.valor > 0 ? (
                                  <>
                                    <div><span className="text-gray-600">Subtotal: </span><span className="font-medium">{fmtBRL(totaisOrcamento?.precoTotal || 0)}</span></div>
                                    <div><span className="text-green-700">Desconto ({dadosOrcamento.desconto.tipo === 'percentual' ? `${dadosOrcamento.desconto.valor}%` : 'Fixo'}): </span><span className="text-green-700 font-bold">-{fmtBRL(dadosOrcamento.desconto.valorDesconto)}</span></div>
                                    <div><span className="font-bold">Total: </span><span className="font-bold" style={{ color: '#f97316' }}>{fmtBRL(dadosOrcamento.desconto.totalComDesconto)}</span></div>
                                  </>
                                ) : (
                                  <div><span className="font-bold">Total: </span><span className="font-bold" style={{ color: '#f97316' }}>{fmtBRL(totaisOrcamento?.precoTotal || 0)}</span></div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Closing sections on same page if they fit */}
                        {pageData.includeClosing && pageData.closingSections && renderClosingSections(pageData.closingSections)}
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between items-end text-[7px] opacity-50 flex-shrink-0">
                        <div><span>Página {currentPage + 1} de {totalPages}</span><span className="mx-1">•</span><span>Gerado em {parseDateTimeBR()}</span></div>
                        <div className="text-right"><div className="font-medium">{empresaSST.nome || 'Empresa SST'}</div>{empresaSST.cnpj && <div>CNPJ: {empresaSST.cnpj}</div>}</div>
                      </div>
                    </div>
                  );
                }
                
                // Closing page (separate page for closing sections)
                if (pageData.type === 'closing' && pageData.closingSections) {
                  return (
                    <div className="h-full flex flex-col">
                      <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-200 flex-shrink-0">
                        <div className="flex items-center gap-2">{logoUrl && <img src={logoUrl} alt="Logo" className="h-5 w-auto" crossOrigin="anonymous" />}<span className="font-bold text-xs" style={{ color: '#f97316' }}>{formData.titulo}</span></div>
                        <span className="text-[8px] opacity-60">{parseDateBR(formData.dataProposta)}</span>
                      </div>
                      <div className="flex-1">
                        {renderClosingSections(pageData.closingSections)}
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between items-end text-[7px] opacity-50 flex-shrink-0">
                        <div><span>Página {currentPage + 1} de {totalPages}</span><span className="mx-1">•</span><span>Gerado em {parseDateTimeBR()}</span></div>
                        <div className="text-right"><div className="font-medium">{empresaSST.nome || 'Empresa SST'}</div>{empresaSST.cnpj && <div>CNPJ: {empresaSST.cnpj}</div>}</div>
                      </div>
                    </div>
                  );
                }
                
                return null;
              })()}

              </div>
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
              <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Ex.: Proposta SST Padrão" className="mt-1" />
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
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : modelos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookTemplate className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhum modelo salvo</p>
                <p className="text-xs mt-1">Crie um modelo usando o botão "Salvar Modelo"</p>
              </div>
            ) : (
              <div className="space-y-2">
                {modelos.map((modelo) => (
                  <Card key={modelo.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{modelo.nome}</p>
                          <p className="text-xs text-muted-foreground">{modelo.titulo || 'Sem título'}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleApplyModel(modelo)}>Aplicar</Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteModel(modelo.id)} disabled={deletingModelId === modelo.id}>
                            {deletingModelId === modelo.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2Icon className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
