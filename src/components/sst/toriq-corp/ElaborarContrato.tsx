import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, RotateCcw, Copy, FileDown, Plus, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Edit, FileSignature, Check, Loader2, RefreshCw, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Clausula { id?: string; numero: number; titulo: string; conteudo: string; ordem: number; editando?: boolean; }
interface ServicoContrato { id?: string; nome: string; descricao: string; quantidade: number; precoUnitario: number; subtotal: number; tipo?: string; }
interface ElaborarContratoProps { contrato?: any; modelo?: any; tipo: 'cliente' | 'parceiro'; onClose: () => void; }

// Tipos de orçamento baseados no Gerador de Proposta
type TipoOrcamento = 'planos' | 'padrao' | 'recorrencia' | 'produto' | 'servico' | 'personalizado';

const CLAUSULAS_PADRAO: Clausula[] = [
  { numero: 1, titulo: 'OBJETO DO CONTRATO', conteudo: '1.1. O presente contrato tem como objeto a concessão de LICENÇA VITALÍCIA DE USO, não exclusiva, intransferível e onerosa, do(s) sistema(s) modular(es) descrito(s) no ANEXO I.\n\n1.2. A licença concedida permite à LICENCIADA utilizar o sistema para fins internos e/ou comerciais.', ordem: 0 },
  { numero: 2, titulo: 'NATUREZA DA LICENÇA', conteudo: '2.1. A licença concedida é vitalícia, válida por tempo indeterminado.\n\n2.2. A licença não implica:\n• cessão de propriedade intelectual;\n• acesso ao código-fonte;\n• direito de revenda ou sublicenciamento.', ordem: 1 },
  { numero: 3, titulo: 'MODELO WHITE LABEL', conteudo: '3.1. Quando contratado em modelo White Label, a LICENCIADA poderá:\n• utilizar sua própria marca e identidade visual;\n• comercializar o sistema como solução própria.', ordem: 2 },
  { numero: 4, titulo: 'IMPLEMENTAÇÃO E ENTREGA', conteudo: '4.1. A implementação seguirá o escopo descrito no ANEXO I, incluindo:\n• parametrização;\n• configuração inicial;\n• treinamento da equipe.', ordem: 3 },
  { numero: 5, titulo: 'REMUNERAÇÃO', conteudo: '5.1. Os valores referentes à licença, forma de pagamento e taxas estão descritos no ANEXO II deste contrato.', ordem: 4 }
];


export function ElaborarContrato({ contrato, modelo, tipo, onClose }: ElaborarContratoProps) {
  const { empresa, profile } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || empresa?.id;
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [streamH, setStreamH] = useState(0);
  const PAGE_W = 595;
  const PAGE_H = 842;
  const PAGE_PAD = 40;
  const FOOTER_H = 24;
  const USABLE_H = PAGE_H - PAGE_PAD * 2 - FOOTER_H;
  const [sigPad, setSigPad] = useState(0); // padding to push signature to its own page
  const [activeTab, setActiveTab] = useState('cliente');
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [parceiros, setParceiros] = useState<any[]>([]);
  const [instrutores, setInstrutores] = useState<any[]>([]);

  const [contratoData, setContratoData] = useState({
    numero: '', tipo, titulo_contrato: 'CONTRATO DE LICENÇA VITALÍCIA DE USO DE SOFTWARE', razao_social: '', cnpj: '', telefone: '', endereco: '', cidade: '', estado: '', cep: '', email: '', representante_legal: '', bairro: '', complemento: '', numero_endereco: '',
    valor_implantacao: 2000, valor_mensal: 450, valor_avista: 19565.22, texto_avista: 'Condição especial à vista',
    valor_3x: 21739.13, texto_3x: '3x de R$ 7.246,38', valor_leasing: 27173.91, texto_leasing: 'Leasing em parcelas',
    forma_pagamento: 'avista', meio_pagamento: 'pix', observacao_comercial: '', validade_dias: 10, data_validade: '', foro: '', observacoes_adicionais: '',
    criado_por: profile?.nome || '', assinante_nome: '', assinante_cpf: '', assinado: false, status: 'rascunho',
    cliente_id: '', parceiro_id: '', instrutor_id: '', modelo_id: ''
  });

  const [clausulas, setClausulas] = useState<Clausula[]>(CLAUSULAS_PADRAO);
  const [servicos, setServicos] = useState<ServicoContrato[]>([]);
  const [novaClausula, setNovaClausula] = useState({ titulo: '', conteudo: '' });
  const [showNovaClausula, setShowNovaClausula] = useState(false);
  const [loadingServicos, setLoadingServicos] = useState(false);
  const [propostaEncontrada, setPropostaEncontrada] = useState<any>(null);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  
  // Estados para valores do orçamento
  const [tipoOrcamento, setTipoOrcamento] = useState<TipoOrcamento>('padrao');
  const [valoresOrcamento, setValoresOrcamento] = useState({
    // Padrão
    subtotal: 0,
    desconto: 0,
    total: 0,
    // Recorrência
    planoNome: '',
    periodicidade: 'Mensal',
    vigencia: '12 meses',
    reajuste: 'IPCA anual',
    cancelamento: '30 dias de aviso',
    subtotalMensal: 0,
    descontoMensal: 0,
    totalMensal: 0,
    // Produto
    frete: 0,
    impostos: 0,
    // Serviço (projeto)
    totalHoras: 0,
    prazoEntrega: '',
    formaPagamentoProjeto: '50% início + 50% entrega',
    // Condições gerais
    condicaoPagamento: 'boleto/PIX',
    vencimento: 'todo dia 10',
    validadeProposta: '7 dias',
    implantacaoAParte: false
  });

  useEffect(() => { loadDependencies(); if (contrato) loadContrato(); else generateNumero(); }, []);

  // Measure hidden stream height and compute signature padding
  useEffect(() => {
    if (!hiddenRef.current) return;
    // First pass: measure without sigPad to find where signature lands
    const sigEl = hiddenRef.current.querySelector('[data-block="assinaturas"]') as HTMLElement;
    if (sigEl) {
      // offsetTop is relative to offsetParent — use it for reliable measurement
      const sigTop = sigEl.offsetTop;
      const posInPage = sigTop % USABLE_H;
      const newPad = posInPage > 0 ? (USABLE_H - posInPage) : 0;
      if (Math.abs(newPad - sigPad) > 2) {
        setSigPad(newPad);
        return; // will re-run after sigPad state update
      }
    } else if (sigPad !== 0) {
      setSigPad(0);
      return;
    }
    // Second pass: measure total height with sigPad applied
    setStreamH(hiddenRef.current.scrollHeight);
  }, [clausulas, servicos, contratoData, sigPad, USABLE_H]);

  // Also observe resize changes
  useEffect(() => {
    if (!hiddenRef.current) return;
    const ro = new ResizeObserver(() => {
      if (hiddenRef.current) setStreamH(hiddenRef.current.scrollHeight);
    });
    ro.observe(hiddenRef.current);
    return () => ro.disconnect();
  }, []);

  const totalPages = Math.max(1, Math.ceil(streamH / USABLE_H));

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  const loadDependencies = async () => {
    const [c, p, i] = await Promise.all([
      (supabase as any).from('clientes_sst').select('id, nome, cnpj, email, telefone, responsavel, cliente_empresa_id, empresas:cliente_empresa_id(endereco, numero, complemento, bairro, cidade, estado, cep)').eq('empresa_sst_id', empresaId),
      (supabase as any).from('empresas_parceiras').select('id, nome, cnpj, email, telefone, endereco, cidade, estado, cep').eq('empresa_sst_id', empresaId),
      (supabase as any).from('instrutores').select('id, nome, cpf_cnpj, email, telefone, endereco, bairro, cidade, estado, cep').eq('empresa_id', empresaId)
    ]);
    if (c.data) setClientes(c.data);
    if (p.data) setParceiros(p.data);
    if (i.data) setInstrutores(i.data);
  };

  const generateNumero = async () => {
    const ano = new Date().getFullYear();
    const { data } = await (supabase as any).from('contratos').select('numero').eq('empresa_id', empresaId).like('numero', `TQ-${ano}-%`).order('numero', { ascending: false }).limit(1);
    let n = 1;
    if (data?.length) n = parseInt(data[0].numero.split('-')[2]) + 1;
    setContratoData(prev => ({ ...prev, numero: `TQ-${ano}-${String(n).padStart(4, '0')}` }));
  };

  const loadContrato = async () => {
    setContratoData({ ...contrato, valor_implantacao: parseFloat(contrato.valor_implantacao) || 0, valor_mensal: parseFloat(contrato.valor_mensal) || 0, valor_avista: parseFloat(contrato.valor_avista) || 0, valor_3x: parseFloat(contrato.valor_3x) || 0, valor_leasing: parseFloat(contrato.valor_leasing) || 0 });
    const { data: cl } = await (supabase as any).from('contrato_clausulas').select('*').eq('contrato_id', contrato.id).order('ordem');
    if (cl?.length) setClausulas(cl);
    const { data: mo } = await (supabase as any).from('contrato_servicos').select('*').eq('contrato_id', contrato.id).order('ordem');
    if (mo?.length) setServicos(mo.map((s: any) => ({ nome: s.nome, descricao: s.descricao || '', quantidade: s.quantidade || 1, precoUnitario: s.preco_unitario || 0, subtotal: s.subtotal || 0, tipo: s.tipo })));
  };

  // Função para carregar serviços da última proposta aceita do cliente
  const loadServicosFromProposta = async (clienteId: string) => {
    if (!clienteId) return;
    setLoadingServicos(true);
    try {
      // Buscar o card do funil relacionado ao cliente com status aceito/ganho
      const { data: cards } = await (supabase as any)
        .from('funil_cards')
        .select('id, titulo, valor, status_negocio, orcamento_treinamento, orcamento_vertical365, orcamento_servicos_sst')
        .eq('cliente_id', clienteId)
        .in('status_negocio', ['aceito', 'ganho'])
        .order('updated_at', { ascending: false })
        .limit(1);

      if (cards && cards.length > 0) {
        const card = cards[0];
        setPropostaEncontrada({ id: card.id, numero: card.titulo, status: card.status_negocio });
        
        // Buscar orçamento detalhado do card
        const { data: orcamento } = await (supabase as any)
          .from('funil_card_orcamentos')
          .select('*')
          .eq('card_id', card.id)
          .maybeSingle();

        const servicosCarregados: ServicoContrato[] = [];

        // Processar orçamento de treinamento (itens por plano)
        if (orcamento) {
          // Usar itens do plano selecionado ou ouro como padrão
          const itens = orcamento.itens_ouro || orcamento.itens_prata || orcamento.itens_bronze || [];
          itens.forEach((item: any) => {
            if (item.nome || item.treinamento) {
              servicosCarregados.push({
                nome: item.nome || item.treinamento || 'Serviço',
                descricao: item.descricao || `CH: ${item.ch || item.cargaHoraria || '-'}h`,
                quantidade: item.quantidade || 1,
                precoUnitario: item.precoUnitario || item.preco || 0,
                subtotal: (item.precoUnitario || item.preco || 0) * (item.quantidade || 1),
                tipo: 'Treinamento'
              });
            }
          });

          // Atualizar valores do orçamento
          setValoresOrcamento(prev => ({
            ...prev,
            subtotal: orcamento.total_ouro || orcamento.total_prata || orcamento.total_bronze || 0,
            total: orcamento.total_ouro || orcamento.total_prata || orcamento.total_bronze || 0
          }));
        }

        // Processar orçamento de serviços SST do card
        if (card.orcamento_servicos_sst) {
          const orcSST = typeof card.orcamento_servicos_sst === 'string' 
            ? JSON.parse(card.orcamento_servicos_sst) 
            : card.orcamento_servicos_sst;
          
          if (orcSST.itens) {
            orcSST.itens.forEach((item: any) => {
              servicosCarregados.push({
                nome: item.nome || item.servico || 'Serviço SST',
                descricao: item.descricao || '',
                quantidade: item.quantidade || 1,
                precoUnitario: item.valor || item.preco || 0,
                subtotal: (item.valor || item.preco || 0) * (item.quantidade || 1),
                tipo: 'Serviço SST'
              });
            });
          }
        }

        // Processar orçamento Vertical365 do card
        if (card.orcamento_vertical365) {
          const orcV365 = typeof card.orcamento_vertical365 === 'string' 
            ? JSON.parse(card.orcamento_vertical365) 
            : card.orcamento_vertical365;
          
          if (orcV365.plano) {
            servicosCarregados.push({
              nome: `Vertical 365 - Plano ${orcV365.plano}`,
              descricao: orcV365.descricao || 'Sistema de gestão SST',
              quantidade: 1,
              precoUnitario: orcV365.valor || 0,
              subtotal: orcV365.valor || 0,
              tipo: 'Software'
            });
          }
        }

        if (servicosCarregados.length > 0) {
          setServicos(servicosCarregados);
          // Atualizar valor total do contrato
          const totalServicos = servicosCarregados.reduce((acc, s) => acc + s.subtotal, 0);
          setContratoData(prev => ({ ...prev, valor_avista: totalServicos }));
          toast({ title: `${servicosCarregados.length} serviço(s) carregado(s) da proposta` });
        } else {
          toast({ title: 'Nenhum serviço encontrado na proposta', variant: 'destructive' });
        }
      } else {
        setPropostaEncontrada(null);
        toast({ title: 'Nenhuma proposta aceita encontrada para este cliente', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      toast({ title: 'Erro ao carregar serviços da proposta', variant: 'destructive' });
    } finally {
      setLoadingServicos(false);
    }
  };

  const handleClienteChange = (id: string) => { 
    const c = clientes.find(x => x.id === id); 
    if (c) {
      const emp = c.empresas;
      setContratoData(prev => ({ 
        ...prev, 
        cliente_id: id, 
        razao_social: c.nome, 
        cnpj: c.cnpj || '', 
        email: c.email || '', 
        telefone: c.telefone || '',
        representante_legal: c.responsavel || '',
        endereco: emp?.endereco || '',
        numero_endereco: emp?.numero || '',
        complemento: emp?.complemento || '',
        bairro: emp?.bairro || '',
        cidade: emp?.cidade || '',
        estado: emp?.estado || '',
        cep: emp?.cep || ''
      }));
    }
  };
  const handleParceiroChange = (id: string) => { 
    const p = parceiros.find(x => x.id === id); 
    if (p) setContratoData(prev => ({ 
      ...prev, 
      parceiro_id: id, 
      razao_social: p.nome, 
      cnpj: p.cnpj || '', 
      email: p.email || '', 
      telefone: p.telefone || '',
      endereco: p.endereco || '',
      cidade: p.cidade || '',
      estado: p.estado || '',
      cep: p.cep || ''
    })); 
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { empresa_id: empresaId, ...contratoData, cliente_id: contratoData.cliente_id || null, parceiro_id: contratoData.parceiro_id || null, instrutor_id: contratoData.instrutor_id || null, modelo_id: contratoData.modelo_id || null };
      let id = contrato?.id;
      if (id) {
        await (supabase as any).from('contratos').update(payload).eq('id', id);
        await (supabase as any).from('contrato_clausulas').delete().eq('contrato_id', id);
        await (supabase as any).from('contrato_modulos').delete().eq('contrato_id', id);
      } else {
        const { data } = await (supabase as any).from('contratos').insert(payload).select().single();
        id = data.id;
      }
      if (clausulas.length) await (supabase as any).from('contrato_clausulas').insert(clausulas.map((c, i) => ({ contrato_id: id, numero: c.numero, titulo: c.titulo, conteudo: c.conteudo, ordem: i })));
      if (servicos.length) await (supabase as any).from('contrato_servicos').insert(servicos.map((s, i) => ({ contrato_id: id, nome: s.nome, descricao: s.descricao, quantidade: s.quantidade, preco_unitario: s.precoUnitario, subtotal: s.subtotal, tipo: s.tipo, ordem: i })));
      toast({ title: 'Contrato salvo com sucesso' });
      onClose();
    } catch (e) { console.error(e); toast({ title: 'Erro ao salvar', variant: 'destructive' }); }
    setSaving(false);
  };

  const handleCopyText = () => { if (previewRef.current) { navigator.clipboard.writeText(previewRef.current.innerText); toast({ title: 'Texto copiado' }); } };

  const handleGeneratePDF = async () => {
    if (!previewRef.current) return;
    setGerandoPDF(true);
    const savedPage = currentPage;
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');

      for (let i = 0; i < totalPages; i++) {
        setCurrentPage(i);
        await new Promise(r => setTimeout(r, 350));
        if (!previewRef.current) continue;
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(previewRef.current, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: PAGE_W,
          height: PAGE_H,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      setCurrentPage(savedPage);
      pdf.save(`contrato_${contratoData.numero}.pdf`);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
      setCurrentPage(savedPage);
    } finally {
      setGerandoPDF(false);
    }
  };

  const addClausula = () => { if (!novaClausula.titulo) return; setClausulas([...clausulas, { numero: clausulas.length + 1, titulo: novaClausula.titulo, conteudo: novaClausula.conteudo, ordem: clausulas.length }]); setNovaClausula({ titulo: '', conteudo: '' }); setShowNovaClausula(false); };
  const removeClausula = (i: number) => setClausulas(clausulas.filter((_, idx) => idx !== i).map((c, idx) => ({ ...c, numero: idx + 1, ordem: idx })));
  const moveClausula = (i: number, dir: 'up' | 'down') => { const ni = dir === 'up' ? i - 1 : i + 1; if (ni < 0 || ni >= clausulas.length) return; const arr = [...clausulas]; [arr[i], arr[ni]] = [arr[ni], arr[i]]; setClausulas(arr.map((c, idx) => ({ ...c, numero: idx + 1, ordem: idx }))); };
  const updateClausula = (i: number, f: string, v: any) => { const arr = [...clausulas]; arr[i] = { ...arr[i], [f]: v }; setClausulas(arr); };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const getValor = () => contratoData.forma_pagamento === 'avista' ? contratoData.valor_avista : contratoData.forma_pagamento === '3x' ? contratoData.valor_3x : contratoData.valor_leasing;
  const getValidade = () => { 
    if (contratoData.data_validade) return contratoData.data_validade;
    const d = new Date(); d.setDate(d.getDate() + contratoData.validade_dias); return d.toLocaleDateString('pt-BR'); 
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h2 className="text-lg font-semibold flex items-center gap-2"><FileSignature className="h-5 w-5" />Elaborar Contrato</h2><p className="text-sm text-muted-foreground">{tipo === 'cliente' ? 'Licença Vitalícia Modular' : 'Contrato com Parceiro'} • {empresa?.nome}</p></div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{contratoData.status}</Badge>
          <span className="text-sm text-muted-foreground">{contratoData.numero}</span>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button variant="default" size="sm" onClick={handleGeneratePDF} disabled={gerandoPDF} className="gap-2 bg-orange-500 hover:bg-orange-600">
            <Download className="h-4 w-4" />{gerandoPDF ? 'Gerando...' : 'Baixar PDF'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[400px] border-r flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b px-4 h-auto py-2 bg-transparent">
              <TabsTrigger value="cliente" className="text-xs">Cliente</TabsTrigger>
              <TabsTrigger value="clausulas" className="text-xs">Cláusulas</TabsTrigger>
              <TabsTrigger value="servicos" className="text-xs">Serviços</TabsTrigger>
              <TabsTrigger value="valores" className="text-xs">Valores</TabsTrigger>
              <TabsTrigger value="info" className="text-xs">Info. Gerais</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1"><div className="p-4">
              <TabsContent value="cliente" className="mt-0 space-y-4">
                {tipo === 'cliente' ? (
                  <div><Label>Selecionar Cliente</Label><Select value={contratoData.cliente_id} onValueChange={handleClienteChange}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
                ) : (
                  <div><Label>Selecionar Parceiro</Label><Select value={contratoData.parceiro_id} onValueChange={handleParceiroChange}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{parceiros.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select></div>
                )}
                <div><Label>Razão Social</Label><Input value={contratoData.razao_social} onChange={e => setContratoData({ ...contratoData, razao_social: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>CNPJ</Label><Input value={contratoData.cnpj} onChange={e => setContratoData({ ...contratoData, cnpj: e.target.value })} /></div>
                  <div><Label>Telefone</Label><Input value={contratoData.telefone} onChange={e => setContratoData({ ...contratoData, telefone: e.target.value })} /></div>
                </div>
                <div><Label>Endereço</Label><Input value={contratoData.endereco} onChange={e => setContratoData({ ...contratoData, endereco: e.target.value })} placeholder="Rua, Avenida..." /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Número</Label><Input value={contratoData.numero_endereco} onChange={e => setContratoData({ ...contratoData, numero_endereco: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Complemento</Label><Input value={contratoData.complemento} onChange={e => setContratoData({ ...contratoData, complemento: e.target.value })} placeholder="Sala, Andar..." /></div>
                </div>
                <div><Label>Bairro</Label><Input value={contratoData.bairro} onChange={e => setContratoData({ ...contratoData, bairro: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Cidade</Label><Input value={contratoData.cidade} onChange={e => setContratoData({ ...contratoData, cidade: e.target.value })} /></div>
                  <div><Label>Estado</Label><Input value={contratoData.estado} onChange={e => setContratoData({ ...contratoData, estado: e.target.value })} maxLength={2} placeholder="UF" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>CEP</Label><Input value={contratoData.cep} onChange={e => setContratoData({ ...contratoData, cep: e.target.value })} /></div>
                  <div><Label>Email</Label><Input value={contratoData.email} onChange={e => setContratoData({ ...contratoData, email: e.target.value })} /></div>
                </div>
                <div><Label>Representante Legal</Label><Input value={contratoData.representante_legal} onChange={e => setContratoData({ ...contratoData, representante_legal: e.target.value })} /></div>
              </TabsContent>

              <TabsContent value="clausulas" className="mt-0 space-y-4">
                <div className="flex gap-2"><Button size="sm" onClick={() => setShowNovaClausula(true)}><Plus className="h-4 w-4 mr-1" />Nova Cláusula</Button><Button size="sm" variant="outline" onClick={() => setClausulas(CLAUSULAS_PADRAO)}><RotateCcw className="h-4 w-4 mr-1" />Restaurar</Button></div>
                <p className="text-xs text-muted-foreground">Edite as cláusulas. Use as setas para reordenar.</p>
                {showNovaClausula && <Card className="p-3 space-y-2"><Input placeholder="Título" value={novaClausula.titulo} onChange={e => setNovaClausula({ ...novaClausula, titulo: e.target.value })} /><Textarea placeholder="Conteúdo" value={novaClausula.conteudo} onChange={e => setNovaClausula({ ...novaClausula, conteudo: e.target.value })} /><div className="flex gap-2"><Button size="sm" onClick={addClausula}>Adicionar</Button><Button size="sm" variant="outline" onClick={() => setShowNovaClausula(false)}>Cancelar</Button></div></Card>}
                <div className="space-y-2">{clausulas.map((c, i) => (
                  <Card key={i} className="p-3"><div className="flex items-start gap-2">
                    <div className="flex flex-col gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveClausula(i, 'up')} disabled={i === 0}><ChevronUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveClausula(i, 'down')} disabled={i === clausulas.length - 1}><ChevronDown className="h-4 w-4" /></Button></div>
                    <div className="flex-1">{c.editando ? (<div className="space-y-2"><Input value={c.titulo} onChange={e => updateClausula(i, 'titulo', e.target.value)} /><Textarea value={c.conteudo} onChange={e => updateClausula(i, 'conteudo', e.target.value)} rows={3} /><Button size="sm" onClick={() => updateClausula(i, 'editando', false)}><Check className="h-4 w-4 mr-1" />Concluir</Button></div>) : (<><div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">Cláusula {c.numero}</span><span className="font-semibold text-sm">{c.titulo}</span></div><p className="text-xs text-muted-foreground line-clamp-2">{c.conteudo.substring(0, 80)}...</p></>)}</div>
                    <div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateClausula(i, 'editando', !c.editando)}><Edit className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeClausula(i)}><Trash2 className="h-3 w-3" /></Button></div>
                  </div></Card>
                ))}</div>
              </TabsContent>

              <TabsContent value="servicos" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Serviços contratados conforme proposta comercial.</p>
                  {contratoData.cliente_id && (
                    <Button size="sm" variant="outline" onClick={() => loadServicosFromProposta(contratoData.cliente_id)} disabled={loadingServicos}>
                      {loadingServicos ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      Carregar da Proposta
                    </Button>
                  )}
                </div>
                {propostaEncontrada && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <p className="font-medium text-green-800">Proposta encontrada: {propostaEncontrada.numero || propostaEncontrada.id}</p>
                    <p className="text-green-600 text-xs">Status: {propostaEncontrada.status || 'aceita'}</p>
                  </div>
                )}
                {servicos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum serviço adicionado.</p>
                    <p className="text-xs mt-1">Selecione um cliente e clique em "Carregar da Proposta"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {servicos.map((s, i) => (
                      <Card key={i} className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm">{s.nome}</h4>
                              {s.tipo && <Badge variant="outline" className="text-2xs">{s.tipo}</Badge>}
                            </div>
                            {s.descricao && <p className="text-xs text-muted-foreground mt-1">{s.descricao}</p>}
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              <span>Qtd: <strong>{s.quantidade}</strong></span>
                              <span>Unitário: <strong>{formatCurrency(s.precoUnitario)}</strong></span>
                              <span>Subtotal: <strong className="text-green-600">{formatCurrency(s.subtotal)}</strong></span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setServicos(servicos.filter((_, idx) => idx !== i))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total dos Serviços:</span>
                        <span className="text-green-600">{formatCurrency(servicos.reduce((acc, s) => acc + s.subtotal, 0))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="valores" className="mt-0 space-y-4">
                <div>
                  <Label>Tipo de Orçamento</Label>
                  <Select value={tipoOrcamento} onValueChange={(v: TipoOrcamento) => setTipoOrcamento(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padrao">Padrão</SelectItem>
                      <SelectItem value="planos">Planos</SelectItem>
                      <SelectItem value="recorrencia">Recorrência</SelectItem>
                      <SelectItem value="produto">Produto</SelectItem>
                      <SelectItem value="servico">Serviço (Projeto)</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Valores Padrão */}
                {tipoOrcamento === 'padrao' && (
                  <div className="space-y-3 border rounded-lg p-3">
                    <h4 className="font-semibold text-sm">Valores Padrão</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Subtotal (R$)</Label><Input type="number" value={valoresOrcamento.subtotal} onChange={e => setValoresOrcamento({ ...valoresOrcamento, subtotal: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label className="text-xs">Desconto (R$)</Label><Input type="number" value={valoresOrcamento.desconto} onChange={e => setValoresOrcamento({ ...valoresOrcamento, desconto: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(valoresOrcamento.subtotal - valoresOrcamento.desconto)}</span>
                    </div>
                  </div>
                )}

                {/* Recorrência */}
                {tipoOrcamento === 'recorrencia' && (
                  <div className="space-y-3 border rounded-lg p-3">
                    <h4 className="font-semibold text-sm">Resumo do Plano</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Nome do Plano</Label><Input value={valoresOrcamento.planoNome} onChange={e => setValoresOrcamento({ ...valoresOrcamento, planoNome: e.target.value })} placeholder="Ex: Suporte Premium" /></div>
                      <div><Label className="text-xs">Periodicidade</Label>
                        <Select value={valoresOrcamento.periodicidade} onValueChange={v => setValoresOrcamento({ ...valoresOrcamento, periodicidade: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mensal">Mensal</SelectItem>
                            <SelectItem value="Trimestral">Trimestral</SelectItem>
                            <SelectItem value="Semestral">Semestral</SelectItem>
                            <SelectItem value="Anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Vigência Mínima</Label><Input value={valoresOrcamento.vigencia} onChange={e => setValoresOrcamento({ ...valoresOrcamento, vigencia: e.target.value })} placeholder="Ex: 12 meses" /></div>
                      <div><Label className="text-xs">Reajuste</Label><Input value={valoresOrcamento.reajuste} onChange={e => setValoresOrcamento({ ...valoresOrcamento, reajuste: e.target.value })} placeholder="Ex: IPCA anual" /></div>
                    </div>
                    <div><Label className="text-xs">Cancelamento</Label><Input value={valoresOrcamento.cancelamento} onChange={e => setValoresOrcamento({ ...valoresOrcamento, cancelamento: e.target.value })} placeholder="Ex: 30 dias de aviso" /></div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div><Label className="text-xs">Subtotal Mensal (R$)</Label><Input type="number" value={valoresOrcamento.subtotalMensal} onChange={e => setValoresOrcamento({ ...valoresOrcamento, subtotalMensal: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label className="text-xs">Desconto Mensal (R$)</Label><Input type="number" value={valoresOrcamento.descontoMensal} onChange={e => setValoresOrcamento({ ...valoresOrcamento, descontoMensal: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Mensal:</span>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(valoresOrcamento.subtotalMensal - valoresOrcamento.descontoMensal)}</span>
                    </div>
                  </div>
                )}

                {/* Produto */}
                {tipoOrcamento === 'produto' && (
                  <div className="space-y-3 border rounded-lg p-3">
                    <h4 className="font-semibold text-sm">Totais de Produto</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Subtotal (R$)</Label><Input type="number" value={valoresOrcamento.subtotal} onChange={e => setValoresOrcamento({ ...valoresOrcamento, subtotal: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label className="text-xs">Frete (R$)</Label><Input type="number" value={valoresOrcamento.frete} onChange={e => setValoresOrcamento({ ...valoresOrcamento, frete: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Impostos (R$)</Label><Input type="number" value={valoresOrcamento.impostos} onChange={e => setValoresOrcamento({ ...valoresOrcamento, impostos: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label className="text-xs">Desconto (R$)</Label><Input type="number" value={valoresOrcamento.desconto} onChange={e => setValoresOrcamento({ ...valoresOrcamento, desconto: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(valoresOrcamento.subtotal + valoresOrcamento.frete + valoresOrcamento.impostos - valoresOrcamento.desconto)}</span>
                    </div>
                  </div>
                )}

                {/* Serviço (Projeto) */}
                {tipoOrcamento === 'servico' && (
                  <div className="space-y-3 border rounded-lg p-3">
                    <h4 className="font-semibold text-sm">Fechamento do Projeto</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Total de Horas</Label><Input type="number" value={valoresOrcamento.totalHoras} onChange={e => setValoresOrcamento({ ...valoresOrcamento, totalHoras: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label className="text-xs">Subtotal (R$)</Label><Input type="number" value={valoresOrcamento.subtotal} onChange={e => setValoresOrcamento({ ...valoresOrcamento, subtotal: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div><Label className="text-xs">Desconto (R$)</Label><Input type="number" value={valoresOrcamento.desconto} onChange={e => setValoresOrcamento({ ...valoresOrcamento, desconto: parseFloat(e.target.value) || 0 })} /></div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total do Projeto:</span>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(valoresOrcamento.subtotal - valoresOrcamento.desconto)}</span>
                    </div>
                    <div className="pt-2 border-t space-y-2">
                      <h5 className="font-medium text-xs text-muted-foreground">Condições</h5>
                      <div><Label className="text-xs">Prazo de Entrega</Label><Input value={valoresOrcamento.prazoEntrega} onChange={e => setValoresOrcamento({ ...valoresOrcamento, prazoEntrega: e.target.value })} placeholder="Ex: 2 semanas (após kick-off)" /></div>
                      <div><Label className="text-xs">Forma de Pagamento</Label><Input value={valoresOrcamento.formaPagamentoProjeto} onChange={e => setValoresOrcamento({ ...valoresOrcamento, formaPagamentoProjeto: e.target.value })} placeholder="Ex: 50% início + 50% entrega" /></div>
                    </div>
                  </div>
                )}

                {/* Condições Gerais de Pagamento */}
                <div className="space-y-3 border rounded-lg p-3">
                  <h4 className="font-semibold text-sm">Condições de Pagamento</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Meio de Pagamento</Label>
                      <Select value={contratoData.meio_pagamento} onValueChange={v => setContratoData({ ...contratoData, meio_pagamento: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="cartao">Cartão</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Vencimento</Label><Input value={valoresOrcamento.vencimento} onChange={e => setValoresOrcamento({ ...valoresOrcamento, vencimento: e.target.value })} placeholder="Ex: todo dia 10" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Validade da Proposta</Label><Input value={valoresOrcamento.validadeProposta} onChange={e => setValoresOrcamento({ ...valoresOrcamento, validadeProposta: e.target.value })} placeholder="Ex: 7 dias" /></div>
                    <div className="flex items-center gap-2 pt-5">
                      <Checkbox checked={valoresOrcamento.implantacaoAParte} onCheckedChange={c => setValoresOrcamento({ ...valoresOrcamento, implantacaoAParte: !!c })} />
                      <span className="text-xs">Implantação cobrada à parte</span>
                    </div>
                  </div>
                </div>

                {/* Valores Legados - Apenas para tipos Planos e Personalizado */}
                {(tipoOrcamento === 'planos' || tipoOrcamento === 'personalizado') && (
                  <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                    <h4 className="font-semibold text-sm text-muted-foreground">Valores do Contrato</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Implantação (R$)</Label><Input type="number" value={contratoData.valor_implantacao} onChange={e => setContratoData({ ...contratoData, valor_implantacao: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label className="text-xs">Mensal (R$)</Label><Input type="number" value={contratoData.valor_mensal} onChange={e => setContratoData({ ...contratoData, valor_mensal: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div><Label className="text-xs">Valor Total (R$)</Label><Input type="number" value={contratoData.valor_avista} onChange={e => setContratoData({ ...contratoData, valor_avista: parseFloat(e.target.value) || 0 })} /></div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="info" className="mt-0 space-y-4">
                <div><Label>Título do Contrato</Label><Input value={contratoData.titulo_contrato} onChange={e => setContratoData({ ...contratoData, titulo_contrato: e.target.value })} placeholder="Ex: CONTRATO DE LICENÇA VITALÍCIA DE USO DE SOFTWARE" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Nº Contrato</Label><Input value={contratoData.numero} disabled className="bg-muted" /></div>
                  <div><Label>Status</Label><Select value={contratoData.status} onValueChange={v => setContratoData({ ...contratoData, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rascunho">Rascunho</SelectItem><SelectItem value="enviado">Enviado</SelectItem><SelectItem value="assinado">Assinado</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Validade (dias)</Label><Input type="number" value={contratoData.validade_dias} onChange={e => setContratoData({ ...contratoData, validade_dias: parseInt(e.target.value) || 10, data_validade: '' })} /></div>
                  <div><Label>Data de Validade</Label><Input type="date" value={contratoData.data_validade ? contratoData.data_validade.split('/').reverse().join('-') : ''} onChange={e => { const d = e.target.value; if (d) { const [y, m, day] = d.split('-'); setContratoData({ ...contratoData, data_validade: `${day}/${m}/${y}` }); } else { setContratoData({ ...contratoData, data_validade: '' }); } }} /></div>
                </div>
                <div><Label>Criado por</Label><Input value={contratoData.criado_por} onChange={e => setContratoData({ ...contratoData, criado_por: e.target.value })} /></div>
                <div><Label>Foro</Label><Input value={contratoData.foro} onChange={e => setContratoData({ ...contratoData, foro: e.target.value })} placeholder="Comarca de..." /></div>
              </TabsContent>
            </div></ScrollArea>
          </Tabs>
          <div className="p-4 border-t flex gap-2"><Button variant="outline" className="flex-1" onClick={handleCopyText}><Copy className="h-4 w-4 mr-2" />Copiar Texto</Button></div>
        </div>

        <div className="flex-1 bg-muted/30 flex flex-col overflow-hidden">
          {/* Page navigation bar - like Proposta Comercial */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted">
            <span className="text-xs text-muted-foreground">Preview A4</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-xs font-medium min-w-[80px] text-center text-foreground">Página {currentPage + 1} de {totalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span>Cliente: <strong>{contratoData.razao_social || '-'}</strong></span>
              <span>Valor: <strong className="text-green-600">{formatCurrency(getValor())}</strong></span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-4 flex justify-center items-start">

          {/* Hidden measurement container */}
          <div style={{ visibility: 'hidden', position: 'absolute', left: 0, top: 0, width: `${PAGE_W - PAGE_PAD * 2}px`, overflow: 'hidden', height: 0, pointerEvents: 'none' }}>
            <div ref={hiddenRef} style={{ width: '100%', position: 'relative' }}>
              <div className="text-center mb-8"><h1 className="text-xl font-bold text-gray-800 mb-4">{contratoData.titulo_contrato}</h1><p className="text-sm text-gray-600">CONTRATO Nº: <span className="text-orange-500 font-semibold">{contratoData.numero}</span></p><p className="text-sm text-gray-600 mt-2">Emissão: {new Date().toLocaleDateString('pt-BR')} | Validade: <span className="text-orange-500">{getValidade()}</span> | <span className="text-orange-500">{contratoData.status}</span></p></div>
              <div className="border-l-4 border-orange-500 pl-4 mb-6">
                <h2 className="text-orange-500 font-bold mb-3">PARTES CONTRATANTES</h2>
                <p className="text-sm text-gray-700 mb-2"><strong>LICENCIANTE:</strong> {empresa?.nome}, doravante denominada LICENCIANTE.</p>
                <p className="text-sm text-gray-700"><strong>LICENCIADA:</strong> {contratoData.razao_social || 'Empresa'}, CNPJ {contratoData.cnpj || '___'}, representada por {contratoData.representante_legal || '___'}. Contato: {contratoData.email}{contratoData.telefone ? ` • ${contratoData.telefone}` : ''}.</p>
                {(contratoData.endereco || contratoData.cidade) && (
                  <p className="text-sm text-gray-700 mt-1"><strong>Endereço:</strong> {[contratoData.endereco, contratoData.numero_endereco, contratoData.complemento, contratoData.bairro].filter(Boolean).join(', ')}{contratoData.cidade ? ` - ${contratoData.cidade}` : ''}{contratoData.estado ? `/${contratoData.estado}` : ''}{contratoData.cep ? ` - CEP: ${contratoData.cep}` : ''}</p>
                )}
              </div>
              {clausulas.map(c => (<div key={c.numero} className="mb-6"><h3 className="text-orange-500 font-bold mb-2">CLÁUSULA {c.numero} — {c.titulo}</h3><div className="text-sm text-gray-700 whitespace-pre-line">{c.conteudo}</div></div>))}
              {servicos.length > 0 && <div className="mb-6"><h3 className="text-orange-500 font-bold mb-4">ANEXO I — SERVIÇOS CONTRATADOS</h3>
                <table className="w-full text-sm border-collapse">
                  <thead><tr className="bg-gray-100"><th className="border p-2 text-left">Serviço</th><th className="border p-2 text-center w-16">Qtd</th><th className="border p-2 text-right w-28">Unitário</th><th className="border p-2 text-right w-28">Subtotal</th></tr></thead>
                  <tbody>{servicos.map((s, i) => (<tr key={i}><td className="border p-2"><strong>{s.nome}</strong>{s.descricao && <p className="text-xs text-gray-500">{s.descricao}</p>}</td><td className="border p-2 text-center">{s.quantidade}</td><td className="border p-2 text-right">{formatCurrency(s.precoUnitario)}</td><td className="border p-2 text-right font-semibold">{formatCurrency(s.subtotal)}</td></tr>))}</tbody>
                  <tfoot><tr className="bg-gray-50 font-bold"><td colSpan={3} className="border p-2 text-right">TOTAL:</td><td className="border p-2 text-right text-green-600">{formatCurrency(servicos.reduce((acc, s) => acc + s.subtotal, 0))}</td></tr></tfoot>
                </table>
              </div>}
              <div className="mb-6"><h3 className="text-orange-500 font-bold mb-4">ANEXO II — VALORES</h3><p className="text-sm"><strong>Implantação:</strong> {formatCurrency(contratoData.valor_implantacao)} | <strong>Mensal:</strong> {formatCurrency(contratoData.valor_mensal)}</p><p className="text-sm"><strong>Pagamento:</strong> {contratoData.forma_pagamento === 'avista' ? `À vista - ${formatCurrency(contratoData.valor_avista)}` : contratoData.forma_pagamento === '3x' ? `3x - ${formatCurrency(contratoData.valor_3x)}` : `Leasing - ${formatCurrency(contratoData.valor_leasing)}`} via {contratoData.meio_pagamento.toUpperCase()}</p></div>
              {contratoData.foro && <p className="text-sm text-gray-700 mb-6"><strong>Foro:</strong> {contratoData.foro}</p>}
              {/* Spacer to push signature to its own page */}
              {sigPad > 0 && <div style={{ height: `${sigPad}px` }} />}
              <div data-block="assinaturas" className="pt-8 border-t grid grid-cols-2 gap-8">
                <div className="text-center"><div className="border-b border-gray-400 mb-2 h-16"></div><p className="text-sm font-semibold">LICENCIANTE</p></div>
                <div className="text-center"><div className="border-b border-gray-400 mb-2 h-16"></div><p className="text-sm font-semibold">LICENCIADA</p></div>
              </div>
            </div>
          </div>

          {/* Visible A4 page — continuous flow with translateY */}
          <div ref={previewRef} className="bg-white shadow-2xl" style={{ width: `${PAGE_W}px`, height: `${PAGE_H}px`, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ padding: `${PAGE_PAD}px`, height: `${USABLE_H}px`, overflow: 'hidden', boxSizing: 'content-box' }}>
              <div style={{ transform: `translateY(-${currentPage * USABLE_H}px)` }}>
                <div className="text-center mb-8"><h1 className="text-xl font-bold text-gray-800 mb-4">{contratoData.titulo_contrato}</h1><p className="text-sm text-gray-600">CONTRATO Nº: <span className="text-orange-500 font-semibold">{contratoData.numero}</span></p><p className="text-sm text-gray-600 mt-2">Emissão: {new Date().toLocaleDateString('pt-BR')} | Validade: <span className="text-orange-500">{getValidade()}</span> | <span className="text-orange-500">{contratoData.status}</span></p></div>
                <div className="border-l-4 border-orange-500 pl-4 mb-6">
                  <h2 className="text-orange-500 font-bold mb-3">PARTES CONTRATANTES</h2>
                  <p className="text-sm text-gray-700 mb-2"><strong>LICENCIANTE:</strong> {empresa?.nome}, doravante denominada LICENCIANTE.</p>
                  <p className="text-sm text-gray-700"><strong>LICENCIADA:</strong> {contratoData.razao_social || 'Empresa'}, CNPJ {contratoData.cnpj || '___'}, representada por {contratoData.representante_legal || '___'}. Contato: {contratoData.email}{contratoData.telefone ? ` • ${contratoData.telefone}` : ''}.</p>
                  {(contratoData.endereco || contratoData.cidade) && (
                    <p className="text-sm text-gray-700 mt-1"><strong>Endereço:</strong> {[contratoData.endereco, contratoData.numero_endereco, contratoData.complemento, contratoData.bairro].filter(Boolean).join(', ')}{contratoData.cidade ? ` - ${contratoData.cidade}` : ''}{contratoData.estado ? `/${contratoData.estado}` : ''}{contratoData.cep ? ` - CEP: ${contratoData.cep}` : ''}</p>
                  )}
                </div>
                {clausulas.map(c => (<div key={c.numero} className="mb-6"><h3 className="text-orange-500 font-bold mb-2">CLÁUSULA {c.numero} — {c.titulo}</h3><div className="text-sm text-gray-700 whitespace-pre-line">{c.conteudo}</div></div>))}
                {servicos.length > 0 && <div className="mb-6"><h3 className="text-orange-500 font-bold mb-4">ANEXO I — SERVIÇOS CONTRATADOS</h3>
                  <table className="w-full text-sm border-collapse">
                    <thead><tr className="bg-gray-100"><th className="border p-2 text-left">Serviço</th><th className="border p-2 text-center w-16">Qtd</th><th className="border p-2 text-right w-28">Unitário</th><th className="border p-2 text-right w-28">Subtotal</th></tr></thead>
                    <tbody>{servicos.map((s, i) => (<tr key={i}><td className="border p-2"><strong>{s.nome}</strong>{s.descricao && <p className="text-xs text-gray-500">{s.descricao}</p>}</td><td className="border p-2 text-center">{s.quantidade}</td><td className="border p-2 text-right">{formatCurrency(s.precoUnitario)}</td><td className="border p-2 text-right font-semibold">{formatCurrency(s.subtotal)}</td></tr>))}</tbody>
                    <tfoot><tr className="bg-gray-50 font-bold"><td colSpan={3} className="border p-2 text-right">TOTAL:</td><td className="border p-2 text-right text-green-600">{formatCurrency(servicos.reduce((acc, s) => acc + s.subtotal, 0))}</td></tr></tfoot>
                  </table>
                </div>}
                <div className="mb-6"><h3 className="text-orange-500 font-bold mb-4">ANEXO II — VALORES</h3><p className="text-sm"><strong>Implantação:</strong> {formatCurrency(contratoData.valor_implantacao)} | <strong>Mensal:</strong> {formatCurrency(contratoData.valor_mensal)}</p><p className="text-sm"><strong>Pagamento:</strong> {contratoData.forma_pagamento === 'avista' ? `À vista - ${formatCurrency(contratoData.valor_avista)}` : contratoData.forma_pagamento === '3x' ? `3x - ${formatCurrency(contratoData.valor_3x)}` : `Leasing - ${formatCurrency(contratoData.valor_leasing)}`} via {contratoData.meio_pagamento.toUpperCase()}</p></div>
                {contratoData.foro && <p className="text-sm text-gray-700 mb-6"><strong>Foro:</strong> {contratoData.foro}</p>}
                {/* Spacer to push signature to its own page */}
                {sigPad > 0 && <div style={{ height: `${sigPad}px` }} />}
                <div className="pt-8 border-t grid grid-cols-2 gap-8"><div className="text-center"><div className="border-b border-gray-400 mb-2 h-16"></div><p className="text-sm font-semibold">LICENCIANTE</p></div><div className="text-center"><div className="border-b border-gray-400 mb-2 h-16"></div><p className="text-sm font-semibold">LICENCIADA</p></div></div>
              </div>
            </div>
            {/* Page footer */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-10 pb-3 text-[8px] text-gray-400">
              <span>Contrato {contratoData.numero}</span>
              <span>Página {currentPage + 1} de {totalPages}</span>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ElaborarContrato;
