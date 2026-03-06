import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, BarChart3, Info, FileDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ValoresOrcamento {
  precoCheio?: number;
  precoAVista?: number;
  valorLeasing?: number;
  mensalidadeLeasing?: number;
  prazoLeasing?: number;
}

interface ComparadorEconomiaProps {
  onClose?: () => void;
  onSave?: (dados: DadosComparacao) => void;
  onSavePDF?: (pdfBlob: Blob, fileName: string) => void;
  dadosSalvos?: DadosComparacao | null;
  valorLicencaVitalicia?: number;
  precoMensalPosLicenca?: number;
  valoresOrcamento?: ValoresOrcamento;
}

export interface DadosComparacao {
  toriq: ToriqConfig;
  saas: SaasConfig;
  resultados: {
    totalToriq: number;
    totalSaas: number;
    economia: number;
    diferencaMensal: number;
  };
}

interface ToriqConfig {
  license: number;
  setup: number;
  postYears: number;
  horizonYears: number;
  monthlyPostCost: number;
}

interface SaasConfig {
  monthly: number;
  setup: number;
  annualIncrease: number;
  useIncrease: boolean;
  years: number;
}

interface ResultRow {
  label: string;
  value: string;
  className?: string;
  subtext?: string;
  isSeparator?: boolean;
}

const defaultToriq: ToriqConfig = {
  license: 0,
  setup: 0,
  postYears: 0,
  horizonYears: 0,
  monthlyPostCost: 0,
};

const defaultSaas: SaasConfig = {
  monthly: 0,
  setup: 0,
  annualIncrease: 0,
  useIncrease: false,
  years: 0,
};

const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function ComparadorEconomia({ onClose, onSave, onSavePDF, dadosSalvos, valorLicencaVitalicia, precoMensalPosLicenca, valoresOrcamento }: ComparadorEconomiaProps) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);
  
  // Determinar tipo inicial baseado nos valores disponíveis
  const getInitialTipoValor = (): string => {
    if (valoresOrcamento?.precoCheio && valoresOrcamento.precoCheio > 0) return 'precoCheio';
    if (valoresOrcamento?.precoAVista && valoresOrcamento.precoAVista > 0) return 'aVista';
    if (valoresOrcamento?.valorLeasing && valoresOrcamento.valorLeasing > 0) return 'leasing';
    return 'precoCheio';
  };
  
  const [tipoValorLicenca, setTipoValorLicenca] = useState<string>(getInitialTipoValor());
  
  const getInitialToriq = (): ToriqConfig => {
    if (dadosSalvos?.toriq) return dadosSalvos.toriq;
    // Usar o valor do precoCheio como padrão inicial
    const licenseValue = valoresOrcamento?.precoCheio || valorLicencaVitalicia || defaultToriq.license;
    return {
      ...defaultToriq,
      license: Math.round(licenseValue * 100) / 100,
      monthlyPostCost: precoMensalPosLicenca ? Math.round(precoMensalPosLicenca * 100) / 100 : defaultToriq.monthlyPostCost
    };
  };

  const [toriq, setToriq] = useState<ToriqConfig>(getInitialToriq());
  const [saas, setSaas] = useState<SaasConfig>(dadosSalvos?.saas || defaultSaas);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [kpiToriq, setKpiToriq] = useState<string>('—');
  const [kpiToriqNote, setKpiToriqNote] = useState<string>('');
  const [kpiSaas, setKpiSaas] = useState<string>('—');
  const [kpiSaasNote, setKpiSaasNote] = useState<string>('');
  const [kpiSavings, setKpiSavings] = useState<string>('—');
  const [kpiSavingsNote, setKpiSavingsNote] = useState<string>('');
  const [kpiMonthlyDiff, setKpiMonthlyDiff] = useState<string>('—');
  const [kpiMonthlyDiffNote, setKpiMonthlyDiffNote] = useState<string>('');
  const [isSaved, setIsSaved] = useState(!!dadosSalvos);
  const [isEditing, setIsEditing] = useState(!dadosSalvos);

  // Atualizar valor da licença quando o tipo selecionado mudar
  const handleTipoValorChange = (tipo: string) => {
    setTipoValorLicenca(tipo);
    if (tipo === 'precoCheio' && valoresOrcamento?.precoCheio) {
      setToriq(prev => ({ ...prev, license: valoresOrcamento.precoCheio! }));
    } else if (tipo === 'aVista' && valoresOrcamento?.precoAVista) {
      setToriq(prev => ({ ...prev, license: valoresOrcamento.precoAVista! }));
    } else if (tipo === 'leasing' && valoresOrcamento?.valorLeasing) {
      setToriq(prev => ({ ...prev, license: valoresOrcamento.valorLeasing! }));
    }
  };

  useEffect(() => {
    if (!dadosSalvos) {
      setToriq(prev => ({
        ...prev,
        license: valorLicencaVitalicia ? Math.round(valorLicencaVitalicia * 100) / 100 : prev.license,
        monthlyPostCost: precoMensalPosLicenca ? Math.round(precoMensalPosLicenca * 100) / 100 : prev.monthlyPostCost
      }));
    }
  }, [valorLicencaVitalicia, precoMensalPosLicenca, dadosSalvos]);

  const updateToriq = (field: keyof ToriqConfig, value: number) => {
    setToriq(prev => ({ ...prev, [field]: value }));
  };

  const updateSaas = (field: keyof SaasConfig, value: number | boolean) => {
    setSaas(prev => ({ ...prev, [field]: value }));
  };

  const resetDefaults = () => {
    setToriq({
      ...defaultToriq,
      license: valorLicencaVitalicia || defaultToriq.license
    });
    setSaas(defaultSaas);
  };

  const calculate = () => {
    // Horizon em anos
    const horizonYears = Math.max(1, toriq.horizonYears);
    const horizonMonths = horizonYears * 12;

    // Pós-licença em meses (convertido de anos)
    const postMonths = toriq.postYears * 12;

    // TORIQ: custo mensal pós-licença
    const toriqMonthly = toriq.monthlyPostCost;

    // Total TORIQ no horizonte: licença + setup + (pós por X meses)
    const toriqPostTotal = toriqMonthly * postMonths;
    const toriqTotal = toriq.license + toriq.setup + toriqPostTotal;

    // SaaS (mensalidade + setup) — com ou sem reajuste
    const saasAnnualIncrease = saas.annualIncrease / 100;

    // Anos convertidos para meses
    const saasMonths = Math.max(1, saas.years * 12);

    let saasTotal = saas.setup;
    if (!saas.useIncrease) {
      saasTotal += saas.monthly * saasMonths;
    } else {
      // Simula mensalidade por ano, com reajuste anual.
      const fullYears = Math.floor(saasMonths / 12);
      const remainder = saasMonths % 12;

      for (let y = 0; y < fullYears; y++) {
        const monthlyY = saas.monthly * Math.pow(1 + saasAnnualIncrease, y);
        saasTotal += monthlyY * 12;
      }
      if (remainder > 0) {
        const monthlyLast = saas.monthly * Math.pow(1 + saasAnnualIncrease, fullYears);
        saasTotal += monthlyLast * remainder;
      }
    }

    // Comparativo
    const savings = saasTotal - toriqTotal; // positivo = TORIQ mais barato

    // Build results rows
    const rows: ResultRow[] = [];

    rows.push({ label: 'Comparação total (anos / meses)', value: `${horizonYears} anos (${horizonMonths} meses)`, className: 'font-bold' });
    rows.push({ label: '', value: '', isSeparator: true });

    rows.push({ label: 'TORIQ: Licença vitalícia', value: formatBRL(toriq.license), className: 'font-bold text-primary' });
    rows.push({ label: 'TORIQ: Implantação (opcional)', value: formatBRL(toriq.setup) });
    rows.push({ label: 'TORIQ: Pós-licença (anos)', value: `${toriq.postYears} anos (${postMonths} meses)`, className: 'font-bold' });
    rows.push({ label: 'TORIQ: Custo mensal pós-licença', value: formatBRL(toriqMonthly), className: 'font-bold' });
    rows.push({ 
      label: 'TORIQ: Total do pós-licença', 
      value: formatBRL(toriqPostTotal),
      subtext: `${formatBRL(toriqMonthly)} × ${postMonths} meses`
    });
    rows.push({ label: 'TORIQ: TOTAL no horizonte', value: formatBRL(toriqTotal), className: 'font-bold text-blue-500' });
    rows.push({ label: '', value: '', isSeparator: true });

    rows.push({ label: 'SaaS: Mensalidade inicial', value: formatBRL(saas.monthly), className: 'font-bold' });
    rows.push({ label: 'SaaS: Implantação (opcional)', value: formatBRL(saas.setup) });
    rows.push({ 
      label: 'SaaS: Comparação total (anos)', 
      value: `${saas.years} anos (${saasMonths} meses)`, 
      className: 'font-bold'
    });
    rows.push({ 
      label: 'SaaS: Reajuste anual', 
      value: saas.useIncrease ? `${saas.annualIncrease.toFixed(1)}% (ligado)` : '0% (desligado)',
      className: 'font-bold'
    });
    rows.push({ label: 'SaaS: TOTAL no horizonte', value: formatBRL(saasTotal), className: 'font-bold text-orange-500' });
    rows.push({ label: '', value: '', isSeparator: true });

    rows.push({ 
      label: 'Economia (SaaS − TORIQ)', 
      value: formatBRL(savings), 
      className: savings >= 0 ? 'font-bold text-green-500' : 'font-bold text-red-500' 
    });
    rows.push({ 
      label: 'Leitura', 
      value: savings >= 0 
        ? 'No horizonte, TORIQ custa menos e gera previsibilidade (ativo + manutenção controlada).'
        : 'No cenário, o SaaS ficou mais barato. Ajuste: valor da licença, anos do pós, ou mensalidade do SaaS.',
      className: savings >= 0 ? 'text-green-500' : 'text-yellow-500'
    });

    setResults(rows);

    // KPIs
    setKpiToriq(formatBRL(toriqTotal));
    setKpiToriqNote(`Licença ${formatBRL(toriq.license)} + Pós ${formatBRL(toriqPostTotal)} + Setup ${formatBRL(toriq.setup)}`);

    setKpiSaas(formatBRL(saasTotal));
    setKpiSaasNote(`Mensalidades + Setup ${formatBRL(saas.setup)} ${saas.useIncrease ? `• reajuste ${saas.annualIncrease.toFixed(1)}%/ano` : ''}`);

    setKpiSavings(formatBRL(savings));
    setKpiSavingsNote(savings >= 0 ? 'TORIQ mais econômico no horizonte' : 'SaaS mais econômico no horizonte');

    // diferença mensal média (aprox)
    const toriqMonthlyAvg = (postMonths > 0) ? (toriqPostTotal / postMonths) : 0;
    const saasMonthlyAvg = (saasMonths > 0) ? ((saasTotal - saas.setup) / saasMonths) : 0;
    const monthlyDiff = saasMonthlyAvg - toriqMonthlyAvg;

    setKpiMonthlyDiff(formatBRL(monthlyDiff));
    setKpiMonthlyDiffNote(`SaaS médio: ${formatBRL(saasMonthlyAvg)} • TORIQ pós médio: ${formatBRL(toriqMonthlyAvg)}`);

    return {
      totalToriq: toriqTotal,
      totalSaas: saasTotal,
      economia: savings,
      diferencaMensal: monthlyDiff
    };
  };

  useEffect(() => {
    calculate();
  }, []);

  const handleSave = async () => {
    const resultados = calculate();
    if (onSave) {
      onSave({
        toriq,
        saas,
        resultados
      });
      setIsSaved(true);
      setIsEditing(false);
      
      // Gerar PDF automaticamente e fazer upload (igual ao botão "Salvar em PDF")
      if (onSavePDF) {
        await handleSavePDFInternal();
      }
    }
  };
  
  // Função interna para gerar PDF (usada por handleSave e handleSavePDF)
  const generatePDFBlob = async (): Promise<{ blob: Blob; fileName: string } | null> => {
    if (!resultadosRef.current) return null;
    
    try {
      // Criar um container temporário para o PDF com layout vertical (portrait)
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '210mm'; // A4 portrait width
      tempContainer.style.padding = '12mm';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      document.body.appendChild(tempContainer);
      
      // Criar HTML otimizado para PDF vertical (apenas resultados)
      tempContainer.innerHTML = `
        <div style="width: 100%;">
          <!-- Header -->
          <div style="margin-bottom: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px;">
            <h1 style="font-size: 18px; font-weight: bold; color: #1e40af; margin: 0;">
              📊 TORIQ • Comparador de Custo em ${toriq.horizonYears} anos
            </h1>
            <p style="font-size: 10px; color: #6b7280; margin-top: 6px;">
              <strong>TORIQ (Licença Vitalícia + Pós-licença)</strong> vs <strong>SaaS convencional (Mensalidade + Implantação)</strong>
            </p>
          </div>
          
          <!-- KPIs em grid 2x2 -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
            <!-- Total TORIQ -->
            <div style="border: 1px solid #93c5fd; border-radius: 6px; padding: 10px; background: #eff6ff;">
              <div style="font-size: 9px; color: #6b7280;">Total TORIQ no horizonte</div>
              <div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-top: 2px;">${kpiToriq}</div>
              <div style="font-size: 8px; color: #6b7280; margin-top: 2px;">${kpiToriqNote}</div>
            </div>
            <!-- Total SaaS -->
            <div style="border: 1px solid #fdba74; border-radius: 6px; padding: 10px; background: #fff7ed;">
              <div style="font-size: 9px; color: #6b7280;">Total SaaS no horizonte</div>
              <div style="font-size: 18px; font-weight: bold; color: #ea580c; margin-top: 2px;">${kpiSaas}</div>
              <div style="font-size: 8px; color: #6b7280; margin-top: 2px;">${kpiSaasNote}</div>
            </div>
            <!-- Economia -->
            <div style="border: 1px solid #86efac; border-radius: 6px; padding: 10px; background: #f0fdf4;">
              <div style="font-size: 9px; color: #6b7280;">Economia (SaaS − TORIQ)</div>
              <div style="font-size: 18px; font-weight: bold; color: #16a34a; margin-top: 2px;">${kpiSavings}</div>
              <div style="font-size: 8px; color: #6b7280; margin-top: 2px;">${kpiSavingsNote}</div>
            </div>
            <!-- Diferença Mensal -->
            <div style="border: 1px solid #c4b5fd; border-radius: 6px; padding: 10px; background: #faf5ff;">
              <div style="font-size: 9px; color: #6b7280;">Diferença mensal média</div>
              <div style="font-size: 18px; font-weight: bold; color: #7c3aed; margin-top: 2px;">${kpiMonthlyDiff}</div>
              <div style="font-size: 8px; color: #6b7280; margin-top: 2px;">${kpiMonthlyDiffNote}</div>
            </div>
          </div>
          
          <!-- Tabela de Resultados -->
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #fafafa; margin-bottom: 16px;">
            <h3 style="font-size: 12px; font-weight: 600; margin: 0 0 10px 0; color: #374151;">Detalhamento</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #d1d5db;">
                  <th style="text-align: left; padding: 6px 4px; color: #6b7280; font-weight: 500;">Item</th>
                  <th style="text-align: right; padding: 6px 4px; color: #6b7280; font-weight: 500;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${results.map(row => 
                  row.isSeparator 
                    ? `<tr><td colspan="2" style="padding: 3px; text-align: center; color: #9ca3af;">—</td></tr>`
                    : `<tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 5px 4px;">${row.label}</td>
                        <td style="padding: 5px 4px; text-align: right;">
                          <span style="${row.className?.includes('text-green') ? 'color: #16a34a; font-weight: 600;' : row.className?.includes('text-orange') ? 'color: #ea580c; font-weight: 600;' : row.className?.includes('text-blue') ? 'color: #2563eb; font-weight: 600;' : ''}">${row.value}</span>
                          ${row.subtext ? `<div style="font-size: 8px; color: #9ca3af; margin-top: 1px;">${row.subtext}</div>` : ''}
                        </td>
                      </tr>`
                ).join('')}
              </tbody>
            </table>
          </div>
          
          <!-- Interpretação -->
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; background: #fafafa; margin-bottom: 16px;">
            <h4 style="font-size: 11px; font-weight: 600; margin: 0 0 6px 0;">
              ℹ️ Interpretação
            </h4>
            <p style="font-size: 10px; color: #6b7280; margin: 0; line-height: 1.4;">
              Se a economia for positiva, o modelo TORIQ fica <strong style="color: #16a34a;">mais barato</strong> no horizonte de ${toriq.horizonYears} anos.
              Se for negativa, ou o SaaS está barato, ou o pós-licença TORIQ está caro para o cenário.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 8px; color: #9ca3af; margin: 0;">
              Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • TORIQ - Sistema de SST
            </p>
          </div>
        </div>
      `;
      
      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Capturar como canvas com compressão
      const canvas = await html2canvas(tempContainer, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight
      });
      
      // Remover container temporário
      document.body.removeChild(tempContainer);
      
      // Criar PDF em portrait A4 com compressão
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Usar JPEG com qualidade 0.7 para compactação
      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      
      // Posicionar no topo com margem
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
      
      const fileName = `comparador-economia-${new Date().toISOString().split('T')[0]}.pdf`;
      
      return { blob: pdf.output('blob'), fileName };
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      return null;
    }
  };
  
  // Função interna para salvar PDF (chamada por handleSave)
  const handleSavePDFInternal = async () => {
    const result = await generatePDFBlob();
    if (result && onSavePDF) {
      onSavePDF(result.blob, result.fileName);
    }
  };

  const handleSavePDF = async () => {
    const result = await generatePDFBlob();
    if (!result) return;
    
    if (onSavePDF) {
      onSavePDF(result.blob, result.fileName);
    } else {
      // Download direto se não houver callback
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          TORIQ • Comparador de Custo em 5 anos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Compara: <strong>TORIQ (Licença Vitalícia + Pós-licença por X meses)</strong> vs <strong>SaaS convencional (Mensalidade + Implantação opcional)</strong>.
          Mostra o total em 5 anos e a <strong>economia do modelo TORIQ</strong>.
        </p>
      </div>

      <div ref={pdfRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
        {/* Coluna Esquerda - Formulário */}
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {/* Seção 1 - TORIQ Licença Vitalícia */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-xs">1</span>
                TORIQ — Licença Vitalícia
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Valor da licença vitalícia (R$)</Label>
                  {valoresOrcamento && (valoresOrcamento.precoCheio || valoresOrcamento.precoAVista || valoresOrcamento.valorLeasing) ? (
                    <div className="space-y-1">
                      <Select
                        value={tipoValorLicenca}
                        onValueChange={handleTipoValorChange}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecione o tipo de valor" />
                        </SelectTrigger>
                        <SelectContent>
                          {valoresOrcamento.precoCheio && valoresOrcamento.precoCheio > 0 && (
                            <SelectItem value="precoCheio">
                              Valor Cheio (3x) — {formatBRL(valoresOrcamento.precoCheio)}
                            </SelectItem>
                          )}
                          {valoresOrcamento.precoAVista && valoresOrcamento.precoAVista > 0 && (
                            <SelectItem value="aVista">
                              À Vista (c/ desc.) — {formatBRL(valoresOrcamento.precoAVista)}
                            </SelectItem>
                          )}
                          {valoresOrcamento.valorLeasing && valoresOrcamento.valorLeasing > 0 && (
                            <SelectItem value="leasing">
                              Leasing — {formatBRL(valoresOrcamento.valorLeasing)}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-green-600">Valor: {formatBRL(toriq.license)}</p>
                    </div>
                  ) : (
                    <>
                      <Input
                        type="number"
                        value={toriq.license}
                        onChange={(e) => updateToriq('license', parseFloat(e.target.value) || 0)}
                        className="h-8"
                        disabled={!isEditing}
                      />
                      {valorLicencaVitalicia && (
                        <p className="text-[10px] text-green-600 mt-0.5">Valor importado do orçamento</p>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Implantação TORIQ (R$) (opcional)</Label>
                  <Input
                    type="number"
                    value={toriq.setup}
                    onChange={(e) => updateToriq('setup', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Comparação total (anos)</Label>
                  <Input
                    type="number"
                    value={toriq.horizonYears}
                    onChange={(e) => updateToriq('horizonYears', parseInt(e.target.value) || 1)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">= {toriq.horizonYears * 12} meses</p>
                </div>
              </div>
            </div>

            {/* Seção 2 - TORIQ Custos Mensais Pós-Licença */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-xs">2</span>
                TORIQ — Custos/Serviços pós-licença
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Preço mensal (R$/mês)</Label>
                  <Input
                    type="number"
                    value={toriq.monthlyPostCost}
                    onChange={(e) => updateToriq('monthlyPostCost', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                  {precoMensalPosLicenca && (
                    <p className="text-[10px] text-green-600 mt-0.5">Valor importado do custo mensal</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Pós-licença (anos)</Label>
                  <Input
                    type="number"
                    value={toriq.postYears}
                    onChange={(e) => updateToriq('postYears', parseInt(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">= {toriq.postYears * 12} meses</p>
                </div>
                <div>
                  <Label className="text-xs">Total pós-licença</Label>
                  <div className="h-8 flex items-center px-3 bg-muted/50 rounded-md border text-sm font-semibold text-blue-600">
                    {formatBRL(toriq.monthlyPostCost * toriq.postYears * 12)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatBRL(toriq.monthlyPostCost)} × {toriq.postYears * 12} meses</p>
                </div>
              </div>

              <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <div>
                  <Badge variant="outline" className="mb-1">Nota</Badge>
                  <p>Custo mensal que o cliente paga no pós-licença (hospedagem, suporte, atualizações, etc).</p>
                </div>
              </div>
            </div>

            {/* Seção 3 - SaaS Convencional */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded text-xs">3</span>
                SaaS Convencional — Mensalidade + Implantação
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Mensalidade SaaS (R$/mês)</Label>
                  <Input
                    type="number"
                    value={saas.monthly}
                    onChange={(e) => updateSaas('monthly', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Implantação do SaaS (R$) (opcional)</Label>
                  <Input
                    type="number"
                    value={saas.setup}
                    onChange={(e) => updateSaas('setup', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Aumento anual do SaaS (%)</Label>
                  <Input
                    type="number"
                    value={saas.annualIncrease}
                    onChange={(e) => updateSaas('annualIncrease', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Considerar reajuste anual?</Label>
                  <Select 
                    value={saas.useIncrease ? 'yes' : 'no'} 
                    onValueChange={(v) => updateSaas('useIncrease', v === 'yes')}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Sim</SelectItem>
                      <SelectItem value="no">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Comparação total em anos (SaaS)</Label>
                  <Input
                    type="number"
                    value={saas.years}
                    onChange={(e) => updateSaas('years', parseInt(e.target.value) || 1)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Observação</Label>
                  <p className="text-[10px] text-muted-foreground mt-1">Por padrão: 5 anos = 60 meses. Você pode simular cancelamento antes reduzindo os meses.</p>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <Button onClick={calculate} className="flex-1" disabled={!isEditing}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Calcular
              </Button>
              <Button variant="outline" onClick={resetDefaults} className="flex-1" disabled={!isEditing}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            {/* Hint */}
            <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground flex items-start gap-2">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                <Badge variant="outline" className="mb-1">Como o SaaS é calculado</Badge>
                <p>Se "reajuste anual" estiver ligado, a mensalidade sobe ano a ano no horizonte (simulação de reajuste). Se desligado, é mensalidade fixa × meses.</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Coluna Direita - Resultados */}
        <ScrollArea className="h-full">
          <div ref={resultadosRef} className="space-y-3">
            {/* Tabela de Resultados Compacta */}
            <div className="border rounded-lg p-3 bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 px-2 text-xs text-muted-foreground uppercase">Item</th>
                    <th className="text-right py-1.5 px-2 text-xs text-muted-foreground uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    row.isSeparator ? (
                      <tr key={idx}>
                        <td colSpan={2} className="py-0.5 text-center text-muted-foreground text-xs">—</td>
                      </tr>
                    ) : (
                      <tr key={idx} className="border-b border-muted/20">
                        <td className="py-1.5 px-2 text-xs">{row.label}</td>
                        <td className="py-1.5 px-2 text-right">
                          <span className={`text-xs ${row.className || ''}`}>{row.value}</span>
                          {row.subtext && (
                            <div className="text-[9px] text-muted-foreground mt-0.5">{row.subtext}</div>
                          )}
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>

            {/* KPIs Principais - Layout 2x2 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="border rounded-lg p-3 bg-blue-500/5 border-blue-500/20">
                <div className="text-[10px] text-muted-foreground">Total TORIQ no horizonte</div>
                <div className="text-lg font-bold text-blue-600 mt-1">{kpiToriq}</div>
                <div className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{kpiToriqNote}</div>
              </div>
              <div className="border rounded-lg p-3 bg-orange-500/5 border-orange-500/20">
                <div className="text-[10px] text-muted-foreground">Total SaaS no horizonte</div>
                <div className="text-lg font-bold text-orange-600 mt-1">{kpiSaas}</div>
                <div className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{kpiSaasNote}</div>
              </div>
              <div className="border rounded-lg p-3 bg-green-500/5 border-green-500/20">
                <div className="text-[10px] text-muted-foreground">Economia (SaaS − TORIQ)</div>
                <div className="text-lg font-bold text-green-600 mt-1">{kpiSavings}</div>
                <div className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{kpiSavingsNote}</div>
              </div>
              <div className="border rounded-lg p-3 bg-purple-500/5 border-purple-500/20">
                <div className="text-[10px] text-muted-foreground">Diferença mensal média</div>
                <div className="text-lg font-bold text-purple-600 mt-1">{kpiMonthlyDiff}</div>
                <div className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{kpiMonthlyDiffNote}</div>
              </div>
            </div>

            {/* Interpretação */}
            <div className="border rounded-lg p-3 bg-card">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Interpretação
              </h4>
              <p className="text-xs text-muted-foreground">
                Se a economia for positiva, o modelo TORIQ fica <strong className="text-green-600">mais barato</strong> no horizonte. 
                Se for negativa, ou o SaaS está barato, ou o pós-licença TORIQ está caro para o cenário.
              </p>
            </div>

            {/* Botões Salvar, PDF e Editar */}
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleSave}
                className="flex-1"
                disabled={!isEditing}
              >
                {isSaved && !isEditing ? 'Salvo!' : 'Salvar'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSavePDF}
                className="flex-1"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Salvar em PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(true);
                  setIsSaved(false);
                }}
                className="flex-1"
                disabled={isEditing}
              >
                Editar
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
