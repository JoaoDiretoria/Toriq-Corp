import React, { useState, useEffect, useRef } from 'react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  Printer, 
  Save, 
  X, 
  Building2, 
  User, 
  Calendar,
  Clock,
  Package,
  Target,
  TrendingUp,
  DollarSign,
  CreditCard,
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { generateCompactPDF, downloadPDF, PDF_PRESETS, PDF_CSS_RULES } from '@/utils/pdfUtils';

interface DadosOrcamento {
  modulos: Array<{
    id: string;
    nome: string;
    preco: number;
    selecionado: boolean;
  }>;
  taxas?: {
    teamRate: number;
    taxRate: number;
    commissionRate: number;
    otherRate: number;
    netMarginTarget: number;
    cashDiscount: number;
  };
  leasing?: {
    leaseRate: number;
    leaseMonths: number;
    leaseDown: number;
    leaseFinal: number;
    leaseMode: string;
    leaseMonthly: number;
    defaultRate: number;
  };
  resultados: {
    subtotal: number;
    desconto: number;
    precoCheio: number;
    precoAVista: number;
    precoLeasing: number;
    mensalidadeLeasing: number;
    valorLeasing?: number;
  };
}

interface DadosCustoMensal {
  inputs: {
    servidor: number;
    banco: number;
    armazenamento: number;
    suporte: number;
    atualizacoes: number;
    outros: number;
    margemLucro: number;
  };
  resultados: {
    custoTotal: number;
    precoSugerido: number;
    lucroLiquido: number;
  };
}

interface DadosComparacao {
  inputs: {
    precoSaasMensal: number;
    mesesUso: number;
  };
  resultados: {
    custoTotalSaas: number;
    custoTotalToriq: number;
    economia: number;
    diferencaMensal: number;
  };
}

interface DadosProposta {
  clienteNome: string;
  clienteContato: string;
  dataProposta: string;
  validadeDias: number;
  moduloNome: string;
  publicoAlvo: string;
  dores: string;
  resultadosEsperados: string;
  precoLicenca: number;
  descontoAVista: number;
  parcelas: number;
  implantacao: number;
  taxaLeasing: number;
  prazoLeasing: number;
  entradaLeasing: number;
  parcelaFinalLeasing: number;
  custoMensalSistema: number;
  proximosPassos: string;
}

interface PropostaComercialProps {
  cardId: string;
  cardNome: string;
  empresaNome?: string;
  contatoNome?: string;
  dadosOrcamento?: DadosOrcamento | null;
  dadosCustoMensal?: DadosCustoMensal | null;
  dadosComparacao?: DadosComparacao | null;
  propostaSalva?: DadosProposta | null;
  onSave: (dados: DadosProposta) => void;
  onSaveAtividade: (descricao: string, dados: DadosProposta, pdfBlob: Blob, pdfFileName: string) => void;
  onClose: () => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
};

// Função para formatar número no padrão brasileiro (input)
const formatNumberBR = (value: number): string => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Função para parsear número do padrão brasileiro
const parseNumberBR = (value: string): number => {
  // Remove pontos de milhar e substitui vírgula por ponto
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export function PropostaComercial({
  cardId,
  cardNome,
  empresaNome,
  contatoNome,
  dadosOrcamento,
  dadosCustoMensal,
  dadosComparacao,
  propostaSalva,
  onSave,
  onSaveAtividade,
  onClose
}: PropostaComercialProps) {
  const printRef = useRef<HTMLDivElement>(null);
  
  // Estado do formulário
  const [formData, setFormData] = useState<DadosProposta>({
    clienteNome: propostaSalva?.clienteNome || empresaNome || '',
    clienteContato: propostaSalva?.clienteContato || contatoNome || '',
    dataProposta: propostaSalva?.dataProposta || format(new Date(), 'yyyy-MM-dd'),
    validadeDias: propostaSalva?.validadeDias || 10,
    moduloNome: propostaSalva?.moduloNome || 'TORIQ SST • Gestão de Treinamentos + Documentos',
    publicoAlvo: propostaSalva?.publicoAlvo || 'Empresa de SST (White Label)',
    dores: propostaSalva?.dores || '- Perda de controle de prazos e reciclagens\n- Falta de rastreabilidade e evidências\n- Muito retrabalho com planilhas\n- Risco jurídico e fiscalizações',
    resultadosEsperados: propostaSalva?.resultadosEsperados || '- Centralização e padronização de processos\n- Redução de retrabalho e erros\n- Evidências prontas para auditoria\n- Ganho de produtividade do time',
    precoLicenca: Math.round((propostaSalva?.precoLicenca || dadosOrcamento?.resultados?.precoCheio || 0) * 100) / 100,
    descontoAVista: propostaSalva?.descontoAVista || dadosOrcamento?.taxas?.cashDiscount || 0,
    parcelas: propostaSalva?.parcelas || 3,
    implantacao: propostaSalva?.implantacao || 0,
    taxaLeasing: propostaSalva?.taxaLeasing || dadosOrcamento?.leasing?.leaseRate || 0,
    prazoLeasing: propostaSalva?.prazoLeasing || dadosOrcamento?.leasing?.leaseMonths || 0,
    entradaLeasing: propostaSalva?.entradaLeasing || dadosOrcamento?.leasing?.leaseDown || 0,
    parcelaFinalLeasing: propostaSalva?.parcelaFinalLeasing || dadosOrcamento?.leasing?.leaseFinal || 0,
    custoMensalSistema: Math.round((propostaSalva?.custoMensalSistema || dadosCustoMensal?.resultados?.precoSugerido || 0) * 100) / 100,
    proximosPassos: propostaSalva?.proximosPassos || '1) Aprovação da proposta e assinatura do contrato.\n2) Kickoff de implantação e definição do cronograma.\n3) Implantação + treinamento + entrega operacional.\n4) Início do pós-licença conforme a forma de pagamento escolhida.'
  });

  // Cálculos
  const calcularValores = () => {
    const precoLicenca = formData.precoLicenca;
    const descontoAVista = formData.descontoAVista / 100;
    const parcelas = formData.parcelas;
    const taxaLeasing = formData.taxaLeasing / 100;
    const prazoLeasing = formData.prazoLeasing;
    const entradaLeasing = formData.entradaLeasing;
    const parcelaFinalLeasing = formData.parcelaFinalLeasing;

    // À vista
    const precoAVista = precoLicenca * (1 - descontoAVista);

    // Parcelado
    const valorParcela = precoLicenca / parcelas;

    // Leasing
    const totalLeasing = precoLicenca * (1 + taxaLeasing);
    const restanteLeasing = Math.max(0, totalLeasing - entradaLeasing - parcelaFinalLeasing);
    const parcelaMensalLeasing = restanteLeasing / prazoLeasing;
    const totalNominalLeasing = entradaLeasing + (parcelaMensalLeasing * prazoLeasing) + parcelaFinalLeasing;

    // Mensalidade pós-licença (agora é um único campo)
    const mensalidadePosLicenca = formData.custoMensalSistema;

    // Data de validade
    const dataValidade = addDays(new Date(formData.dataProposta), formData.validadeDias);

    return {
      precoAVista,
      valorParcela,
      totalLeasing,
      parcelaMensalLeasing,
      totalNominalLeasing,
      mensalidadePosLicenca,
      dataValidade
    };
  };

  const valores = calcularValores();

  const handleInputChange = (field: keyof DadosProposta, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Função para gerar HTML formatado para PDF A4
  const generatePDFHTML = (): string => {
    const dataFormatada = format(new Date(formData.dataProposta), 'dd/MM/yyyy');
    const validadeFormatada = format(valores.dataValidade, 'dd/MM/yyyy');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Proposta Comercial - ${formData.clienteNome || cardNome}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 15mm 20mm 15mm;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11px;
            line-height: 1.5;
            color: #1a1a1a;
            background: white;
          }
          
          .page {
            width: 100%;
            min-height: 100%;
            padding: 0;
          }
          
          /* Evitar quebra de página dentro de elementos */
          .no-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Forçar quebra de página antes */
          .page-break-before {
            page-break-before: always;
            break-before: always;
          }
          
          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 12px;
            border-bottom: 2px solid #2fae6b;
            margin-bottom: 16px;
          }
          
          .logo-container {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .logo {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            background: linear-gradient(180deg, #2fae6b 0%, rgba(47,174,107,0.6) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 900;
            font-size: 16px;
          }
          
          .brand h1 {
            font-size: 16px;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 4px;
          }
          
          .brand p {
            font-size: 10px;
            color: #666;
          }
          
          .meta {
            text-align: right;
            font-size: 10px;
            color: #666;
          }
          
          .meta div {
            margin-bottom: 3px;
          }
          
          .meta b {
            color: #1a1a1a;
          }
          
          /* Badges */
          .badges {
            display: flex;
            gap: 8px;
            margin-bottom: 14px;
          }
          
          .badge {
            padding: 3px 10px;
            border-radius: 999px;
            border: 1px solid #e0e0e0;
            font-size: 10px;
            color: #666;
            background: #fafafa;
          }
          
          /* Sections */
          .section {
            margin-bottom: 16px;
          }
          
          .section-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #2fae6b;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e5e5e5;
          }
          
          .section p, .section li {
            font-size: 11px;
            color: #444;
          }
          
          .section ul {
            margin-left: 16px;
            margin-top: 4px;
          }
          
          .section li {
            margin-bottom: 3px;
          }
          
          .intro-text {
            font-size: 11px;
            color: #555;
            margin-bottom: 14px;
            line-height: 1.6;
          }
          
          .intro-text b {
            color: #1a1a1a;
          }
          
          /* Divider */
          hr {
            border: none;
            border-top: 1px solid #e5e5e5;
            margin: 14px 0;
          }
          
          /* Table */
          .investment-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            overflow: hidden;
            margin: 10px 0;
            font-size: 10px;
          }
          
          .investment-table th {
            background: #f5f5f5;
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            font-size: 9px;
            color: #555;
            border-bottom: 1px solid #e0e0e0;
          }
          
          .investment-table td {
            padding: 10px;
            border-bottom: 1px solid #e5e5e5;
            vertical-align: top;
          }
          
          .investment-table tr:last-child td {
            border-bottom: none;
          }
          
          .highlight {
            color: #2fae6b;
            font-weight: 700;
          }
          
          .muted {
            color: #888;
            font-size: 9px;
          }
          
          /* KPI Grid */
          .kpi-grid {
            display: flex;
            gap: 12px;
            margin: 14px 0;
          }
          
          .kpi-box {
            flex: 1;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 12px;
            background: #fafafa;
          }
          
          .kpi-label {
            font-size: 9px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          
          .kpi-value {
            font-size: 18px;
            font-weight: 900;
            color: #2fae6b;
            margin-top: 4px;
          }
          
          .kpi-desc {
            font-size: 9px;
            color: #888;
            margin-top: 4px;
          }
          
          /* Steps */
          .steps {
            margin-top: 8px;
          }
          
          .step {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
            font-size: 11px;
            color: #444;
          }
          
          .step-icon {
            color: #2fae6b;
            font-weight: bold;
          }
          
          /* Footer note */
          .footer-note {
            font-size: 9px;
            color: #888;
            margin-top: 12px;
            padding: 10px;
            background: #f9f9f9;
            border-radius: 6px;
            border-left: 3px solid #2fae6b;
          }
          
          .footer-note b {
            color: #555;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header no-break">
            <div class="logo-container">
              <div class="logo">TQ</div>
              <div class="brand">
                <h1>Proposta Comercial • TORIQ White Label</h1>
                <p>Sistemas modulares, com entrega profissional, previsibilidade e opção de <b>compra vitalícia</b> ou <b>leasing/consórcio</b>.</p>
              </div>
            </div>
            <div class="meta">
              <div>Cliente: <b>${formData.clienteNome || '—'}</b></div>
              <div>Responsável: <b>${formData.clienteContato || '—'}</b></div>
              <div>Data: <b>${dataFormatada}</b></div>
              <div>Validade: <b>${validadeFormatada}</b></div>
            </div>
          </div>
          
          <!-- Badges -->
          <div class="badges no-break">
            <span class="badge">TORIQ</span>
            <span class="badge">White Label</span>
            <span class="badge">Licença Vitalícia</span>
          </div>
          
          <!-- Intro -->
          <p class="intro-text no-break">
            A <b>TORIQ</b> desenvolve sistemas web modulares com foco em <b>governança</b>, <b>rastreabilidade</b> e <b>produtividade</b>.
            Nosso modelo permite que sua empresa tenha <b>um ativo digital próprio</b> (licença vitalícia), com um pós-licença enxuto
            para manter o sistema funcionando com segurança, suporte e atualizações.
          </p>
          
          <hr>
          
          <!-- 1) Módulo -->
          <div class="section no-break">
            <div class="section-title">1) Módulo escolhido</div>
            <p><b>${formData.moduloNome}</b></p>
            <p><span class="muted">Indicado para:</span> ${formData.publicoAlvo}</p>
          </div>
          
          <hr>
          
          <!-- 2) Dores -->
          <div class="section no-break">
            <div class="section-title">2) Dores que resolvemos</div>
            <ul>
              ${bulletsToList(formData.dores).map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          
          <!-- 3) Resultados -->
          <div class="section no-break">
            <div class="section-title">3) O que você ganha com isso</div>
            <ul>
              ${bulletsToList(formData.resultadosEsperados).map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          
          <hr>
          
          <!-- 4) Investimento -->
          <div class="section no-break">
            <div class="section-title">4) Investimento e etapas</div>
            
            <table class="investment-table">
              <thead>
                <tr>
                  <th style="width: 20%">Forma</th>
                  <th style="width: 40%">Etapa 1 — Licença</th>
                  <th style="width: 40%">Etapa 2 — Pós-licença</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>À vista</b><br><span class="muted">(com desconto)</span></td>
                  <td>
                    Licença vitalícia: <span class="highlight">${formatCurrency(valores.precoAVista)}</span><br>
                    <span class="muted">Desconto aplicado: ${formData.descontoAVista}%</span><br>
                    <span class="muted">${formData.implantacao > 0 ? `Implantação: ${formatCurrency(formData.implantacao)}` : 'Implantação: sob definição'}</span>
                  </td>
                  <td>
                    Mensalidade: <span class="highlight">${formatCurrency(valores.mensalidadePosLicenca)}</span><br>
                    <span class="muted">Inicia no mês seguinte à contratação.</span>
                  </td>
                </tr>
                <tr>
                  <td><b>Até ${formData.parcelas}x</b></td>
                  <td>
                    Licença vitalícia: <span class="highlight">${formData.parcelas}x de ${formatCurrency(valores.valorParcela)}</span><br>
                    <span class="muted">Total: ${formatCurrency(formData.precoLicenca)}</span><br>
                    <span class="muted">${formData.implantacao > 0 ? `Implantação: ${formatCurrency(formData.implantacao)}` : 'Implantação: sob definição'}</span>
                  </td>
                  <td>
                    Mensalidade: <span class="highlight">${formatCurrency(valores.mensalidadePosLicenca)}</span><br>
                    <span class="muted">Inicia no mês seguinte à contratação.</span>
                  </td>
                </tr>
                <tr>
                  <td><b>Leasing</b><br><span class="muted">/ Consórcio</span></td>
                  <td>
                    Total financiado: <span class="highlight">${formatCurrency(valores.totalLeasing)}</span><br>
                    <span class="muted">Taxa: ${formData.taxaLeasing}% • Entrada: ${formatCurrency(formData.entradaLeasing)} • Final: ${formatCurrency(formData.parcelaFinalLeasing)}</span><br>
                    <span class="highlight">${formData.prazoLeasing}x de ${formatCurrency(valores.parcelaMensalLeasing)}</span><br>
                    <span class="muted">Total nominal: ${formatCurrency(valores.totalNominalLeasing)}</span>
                  </td>
                  <td>
                    Mensalidade: <span class="highlight">${formatCurrency(valores.mensalidadePosLicenca)}</span><br>
                    <span class="muted">Inicia após quitação do leasing.</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- KPIs -->
          <div class="kpi-grid no-break">
            <div class="kpi-box">
              <div class="kpi-label">Mensalidade pós-licença TORIQ</div>
              <div class="kpi-value">${formatCurrency(valores.mensalidadePosLicenca)}</div>
              <div class="kpi-desc">Infra + banco + armazenamento + suporte + updates</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">Regra do pós-licença</div>
              <div class="kpi-desc" style="margin-top: 8px;">
                <b>À vista/3x:</b> inicia no mês seguinte.<br>
                <b>Leasing:</b> inicia após quitação.
              </div>
            </div>
          </div>
          
          <div class="footer-note no-break">
            <b>Observação importante:</b> A licença é vitalícia. O pós-licença é o custo necessário para manter o sistema rodando
            (infraestrutura, banco de dados, segurança, suporte e pacote de atualizações).
          </div>
          
          <hr>
          
          <!-- 5) Próximos passos -->
          <div class="section no-break">
            <div class="section-title">5) Próximos passos</div>
            <div class="steps">
              ${formData.proximosPassos.split('\n').filter(linha => linha.trim()).map(passo => 
                `<div class="step"><span class="step-icon">✓</span> ${passo.trim()}</div>`
              ).join('')}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Função para gerar o PDF como Blob usando utilitário global compactado
  const generatePDFBlob = async (): Promise<{ blob: Blob; fileName: string } | null> => {
    try {
      // Gerar nome do arquivo
      const dataFormatada = format(new Date(), 'dd-MM-yyyy');
      const nomeCliente = (formData.clienteNome || cardNome).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const fileName = `proposta_${nomeCliente}_${dataFormatada}`;

      // Usar utilitário global para gerar PDF compactado
      const result = await generateCompactPDF(generatePDFHTML(), {
        fileName,
        ...PDF_PRESETS.proposta // Usa preset de proposta comercial
      });

      if (!result) {
        toast.error('Erro ao gerar PDF');
        return null;
      }

      return result;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
      return null;
    }
  };

  const handleSave = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Salvar dados da proposta no card
      onSave(formData);
      
      // Gerar PDF
      const pdfResult = await generatePDFBlob();
      if (!pdfResult) {
        setIsGeneratingPDF(false);
        return;
      }

      // Criar atividade de proposta no card com PDF anexo
      const descricao = `Proposta comercial gerada para ${formData.clienteNome || cardNome}. Valor: ${formatCurrency(formData.precoLicenca)} (Licença Vitalícia). Custo mensal pós-licença: ${formatCurrency(formData.custoMensalSistema)}.`;
      onSaveAtividade(descricao, formData, pdfResult.blob, pdfResult.fileName);
      
      toast.success('Proposta salva e registrada como atividade com PDF anexo!');
    } catch (error) {
      console.error('Erro ao salvar proposta:', error);
      toast.error('Erro ao salvar proposta');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const pdfResult = await generatePDFBlob();
      if (!pdfResult) {
        setIsGeneratingPDF(false);
        return;
      }

      // Criar link de download
      const url = URL.createObjectURL(pdfResult.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfResult.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast.error('Erro ao baixar PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const bulletsToList = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map(l => l.replace(/^[-•]\s?/, ''));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-auto">
      <div className="max-w-[1200px] mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Proposta Comercial</h1>
              <p className="text-sm text-muted-foreground">Gere e personalize a proposta para {cardNome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </>
              )}
            </Button>
            <Button onClick={handleSave} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Proposta
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={isGeneratingPDF}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" ref={printRef}>
          {/* Formulário - Lado Esquerdo */}
          <div className="space-y-6 print:hidden">
            {/* Dados do Cliente */}
            <div className="bg-card border rounded-xl p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Dados do Cliente
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Empresa (cliente)</Label>
                  <Input
                    value={formData.clienteNome}
                    onChange={(e) => handleInputChange('clienteNome', e.target.value)}
                    placeholder="Ex.: Metalúrgica Alfa Ltda"
                  />
                </div>
                <div>
                  <Label className="text-xs">Contato / Cargo</Label>
                  <Input
                    value={formData.clienteContato}
                    onChange={(e) => handleInputChange('clienteContato', e.target.value)}
                    placeholder="Ex.: Maria • RH / SST"
                  />
                </div>
                <div>
                  <Label className="text-xs">Data da Proposta</Label>
                  <Input
                    type="date"
                    value={formData.dataProposta}
                    onChange={(e) => handleInputChange('dataProposta', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Validade (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.validadeDias}
                    onChange={(e) => handleInputChange('validadeDias', parseInt(e.target.value) || 10)}
                  />
                </div>
              </div>
            </div>

            {/* Módulo e Público */}
            <div className="bg-card border rounded-xl p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Módulo e Público
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Módulo TORIQ escolhido</Label>
                  <Input
                    value={formData.moduloNome}
                    onChange={(e) => handleInputChange('moduloNome', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Para quem é</Label>
                  <Select 
                    value={formData.publicoAlvo} 
                    onValueChange={(v) => handleInputChange('publicoAlvo', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Empresa de SST (White Label)">Empresa de SST (White Label)</SelectItem>
                      <SelectItem value="Empresa (consumidor final)">Empresa (consumidor final)</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Problemas/Dores que resolve</Label>
                  <Textarea
                    value={formData.dores}
                    onChange={(e) => handleInputChange('dores', e.target.value)}
                    placeholder="- Perda de controle de prazos..."
                    rows={4}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Resultados esperados</Label>
                  <Textarea
                    value={formData.resultadosEsperados}
                    onChange={(e) => handleInputChange('resultadosEsperados', e.target.value)}
                    placeholder="- Centralização e padronização..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Investimento - Licença Vitalícia */}
            <div className="bg-card border rounded-xl p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Investimento • Licença Vitalícia
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Preço da licença vitalícia (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="text"
                      className="pl-10 text-lg font-semibold"
                      value={formatNumberBR(formData.precoLicenca)}
                      onChange={(e) => handleInputChange('precoLicenca', parseNumberBR(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Desconto à vista (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    step={0.5}
                    value={formData.descontoAVista}
                    onChange={(e) => handleInputChange('descontoAVista', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Parcelamento (até 3x)</Label>
                  <Select 
                    value={String(formData.parcelas)} 
                    onValueChange={(v) => handleInputChange('parcelas', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="3">3x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Implantação TORIQ (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={formData.implantacao}
                    onChange={(e) => handleInputChange('implantacao', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Regra: comprando <b>à vista</b> ou em <b>até 3x</b>, a mensalidade de suporte/infra inicia no mês seguinte à contratação.
              </p>
            </div>

            {/* Pós-licença */}
            <div className="bg-card border rounded-xl p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Pós-licença • Mensalidade
              </h2>
              <div>
                <Label className="text-xs">Custo mensal do sistema (R$/mês)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    type="text"
                    className="pl-10 text-lg font-semibold"
                    value={formatNumberBR(formData.custoMensalSistema)}
                    onChange={(e) => handleInputChange('custoMensalSistema', parseNumberBR(e.target.value))}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Valor puxado da calculadora de Custo Mensal Pós-Licença. Inclui infra, banco, armazenamento, suporte e atualizações.
                </p>
              </div>
            </div>

            {/* Leasing */}
            <div className="bg-card border rounded-xl p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Investimento • Leasing/Consórcio
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Taxa de leasing (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    step={0.1}
                    value={formData.taxaLeasing}
                    onChange={(e) => handleInputChange('taxaLeasing', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Prazo do leasing (meses)</Label>
                  <Input
                    type="number"
                    min={6}
                    value={formData.prazoLeasing}
                    onChange={(e) => handleInputChange('prazoLeasing', parseInt(e.target.value) || 24)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Entrada (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.entradaLeasing}
                    onChange={(e) => handleInputChange('entradaLeasing', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Lance/Parcela final (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.parcelaFinalLeasing}
                    onChange={(e) => handleInputChange('parcelaFinalLeasing', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Regra: no <b>leasing</b>, a mensalidade de suporte/infra inicia apenas <b>após</b> a quitação do leasing.
              </p>
            </div>

            {/* Próximos Passos */}
            <div className="bg-card border rounded-xl p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Próximos Passos
              </h2>
              <div>
                <Label className="text-xs">Instruções para o cliente (uma por linha)</Label>
                <Textarea
                  className="mt-1 min-h-[120px] text-sm"
                  placeholder="1) Aprovação da proposta...&#10;2) Kickoff de implantação...&#10;3) Implantação + treinamento..."
                  value={formData.proximosPassos}
                  onChange={(e) => handleInputChange('proximosPassos', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Cada linha será exibida como um passo na proposta. Use numeração para organizar.
                </p>
              </div>
            </div>
          </div>

          {/* Visualização da Proposta - Lado Direito */}
          <div id="proposta-preview" className="bg-card border rounded-xl p-6 print:bg-white print:border-gray-300 print:p-8">
            {/* Header da Proposta */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-primary to-primary/50 flex items-center justify-center text-white font-black text-sm">
                  TQ
                </div>
                <div>
                  <h1 className="text-lg font-bold">Proposta Comercial • TORIQ White Label</h1>
                  <p className="text-xs text-muted-foreground">
                    Sistemas modulares, com entrega profissional, previsibilidade e opção de <b>compra vitalícia</b> ou <b>leasing/consórcio</b>.
                  </p>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <div className="text-muted-foreground">Cliente: <b className="text-foreground">{formData.clienteNome || '—'}</b></div>
                <div className="text-muted-foreground">Responsável: <b className="text-foreground">{formData.clienteContato || '—'}</b></div>
                <div className="text-muted-foreground">Data: <b className="text-foreground">{format(new Date(formData.dataProposta), 'dd/MM/yyyy', { locale: ptBR })}</b></div>
                <div className="text-muted-foreground">Validade: <b className="text-foreground">{format(valores.dataValidade, 'dd/MM/yyyy', { locale: ptBR })}</b></div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2 mb-4">
              <Badge variant="outline">TORIQ</Badge>
              <Badge variant="outline">White Label</Badge>
              <Badge variant="outline">Licença Vitalícia</Badge>
            </div>

            {/* Descrição */}
            <p className="text-xs text-muted-foreground mb-4">
              A <b>TORIQ</b> desenvolve sistemas web modulares com foco em <b>governança</b>, <b>rastreabilidade</b> e <b>produtividade</b>.
              Nosso modelo permite que sua empresa tenha <b>um ativo digital próprio</b> (licença vitalícia), com um pós-licença enxuto
              para manter o sistema funcionando com segurança, suporte e atualizações.
            </p>

            <Separator className="my-4" />

            {/* 1) Módulo escolhido */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">1) Módulo escolhido</h2>
              <p className="text-sm">
                <b>{formData.moduloNome}</b><br />
                <span className="text-muted-foreground">Indicado para:</span> {formData.publicoAlvo}
              </p>
            </div>

            <Separator className="my-4" />

            {/* 2) Dores */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">2) Dores que resolvemos</h2>
              <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                {bulletsToList(formData.dores).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {/* 3) Resultados */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">3) O que você ganha com isso</h2>
              <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                {bulletsToList(formData.resultadosEsperados).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <Separator className="my-4" />

            {/* 4) Investimento */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">4) Investimento e etapas</h2>
              
              {/* Tabela de Investimento */}
              <div className="border rounded-lg overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-semibold uppercase text-[10px] tracking-wide">Forma</th>
                      <th className="text-left p-2 font-semibold uppercase text-[10px] tracking-wide">Etapa 1 — Licença</th>
                      <th className="text-left p-2 font-semibold uppercase text-[10px] tracking-wide">Etapa 2 — Pós-licença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* À Vista */}
                    <tr className="border-t">
                      <td className="p-2 font-medium">À vista (com desconto)</td>
                      <td className="p-2">
                        Licença vitalícia: <b className="text-primary">{formatCurrency(valores.precoAVista)}</b><br />
                        <span className="text-muted-foreground">Desconto aplicado: {formData.descontoAVista}%</span><br />
                        <span className="text-muted-foreground">
                          {formData.implantacao > 0 
                            ? `Implantação: ${formatCurrency(formData.implantacao)}` 
                            : 'Implantação: sob definição'}
                        </span>
                      </td>
                      <td className="p-2">
                        Mensalidade pós-licença: <b className="text-primary">{formatCurrency(valores.mensalidadePosLicenca)}</b><br />
                        <span className="text-muted-foreground">Inicia no mês seguinte à contratação.</span>
                      </td>
                    </tr>
                    {/* Até 3x */}
                    <tr className="border-t">
                      <td className="p-2 font-medium">Até 3x</td>
                      <td className="p-2">
                        Licença vitalícia: <b className="text-primary">{formData.parcelas}x de {formatCurrency(valores.valorParcela)}</b><br />
                        <span className="text-muted-foreground">Total: {formatCurrency(formData.precoLicenca)}</span><br />
                        <span className="text-muted-foreground">
                          {formData.implantacao > 0 
                            ? `Implantação: ${formatCurrency(formData.implantacao)}` 
                            : 'Implantação: sob definição'}
                        </span>
                      </td>
                      <td className="p-2">
                        Mensalidade pós-licença: <b className="text-primary">{formatCurrency(valores.mensalidadePosLicenca)}</b><br />
                        <span className="text-muted-foreground">Inicia no mês seguinte à contratação.</span>
                      </td>
                    </tr>
                    {/* Leasing */}
                    <tr className="border-t">
                      <td className="p-2 font-medium">Leasing / Consórcio</td>
                      <td className="p-2">
                        Total financiado (licença + taxa): <b className="text-primary">{formatCurrency(valores.totalLeasing)}</b><br />
                        <span className="text-muted-foreground">Taxa de leasing: {formData.taxaLeasing}%</span><br />
                        <span className="text-muted-foreground">Entrada: {formatCurrency(formData.entradaLeasing)} • Final: {formatCurrency(formData.parcelaFinalLeasing)}</span><br />
                        <b className="text-primary">{formData.prazoLeasing}x de {formatCurrency(valores.parcelaMensalLeasing)}</b><br />
                        <span className="text-muted-foreground">Total nominal: {formatCurrency(valores.totalNominalLeasing)}</span>
                      </td>
                      <td className="p-2">
                        Mensalidade pós-licença: <b className="text-primary">{formatCurrency(valores.mensalidadePosLicenca)}</b><br />
                        <span className="text-muted-foreground">Inicia após quitação do leasing.</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="border rounded-lg p-3 bg-muted/30">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Mensalidade pós-licença TORIQ</div>
                  <div className="text-xl font-black text-primary mt-1">{formatCurrency(valores.mensalidadePosLicenca)}</div>
                  <div className="text-[10px] text-muted-foreground">Infra + banco + armazenamento + suporte + updates</div>
                </div>
                <div className="border rounded-lg p-3 bg-muted/30">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Regra do pós-licença</div>
                  <div className="text-xs mt-1"><b>À vista/3x:</b> inicia no mês seguinte.</div>
                  <div className="text-xs"><b>Leasing:</b> inicia após quitação.</div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground mt-3">
                <b>Observação importante:</b> A licença é vitalícia. O pós-licença é o custo necessário para manter o sistema rodando
                (infraestrutura, banco de dados, segurança, suporte e pacote de atualizações).
              </p>
            </div>

            <Separator className="my-4" />

            {/* 5) Próximos passos */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">5) Próximos passos</h2>
              <div className="text-xs space-y-1 text-muted-foreground">
                {formData.proximosPassos.split('\n').filter(linha => linha.trim()).map((passo, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                    <span>{passo.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para impressão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          [class*="print:"] {
            visibility: visible;
          }
          .bg-card {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

export default PropostaComercial;
