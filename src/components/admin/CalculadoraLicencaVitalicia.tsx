import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { RotateCcw, Calculator, Info, Plus, Trash2, Package, Save, Edit, Loader2 } from 'lucide-react';

// ID fixo da empresa Toriq
const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

interface Servico {
  id: string;
  nome: string;
  preco: number | null;
  categoria: string | null;
}

interface CalculadoraLicencaVitaliciaProps {
  onClose?: () => void;
  onSave?: (dados: DadosOrcamento) => void;
  dadosSalvos?: DadosOrcamento | null;
}

export interface DadosOrcamento {
  modulos: Modulo[];
  taxas: TaxasConfig;
  leasing: LeasingConfig;
  resultados: {
    precoCheio: number;
    precoAVista: number;
    precoLeasing: number;
    mensalidadeLeasing: number;
  };
}

interface Modulo {
  id: string;
  nome: string;
  servicoId: string;
  complexidade: string;
  implCost: number;
  moduleCOGS: number;
  cac: number;
  targetMarginFixed: number;
  precoBase: number;
}

interface TaxasConfig {
  teamRate: number;
  taxRate: number;
  commissionRate: number;
  otherRate: number;
  netMarginTarget: number;
  cashDiscount: number;
}

interface LeasingConfig {
  leaseRate: number;
  leaseMonths: number;
  leaseDown: number;
  leaseFinal: number;
  leaseMode: string;
  leaseMonthly: number;
  defaultRate: number;
}

interface ResultRow {
  label: string;
  value: string;
  isSeparator?: boolean;
  className?: string;
  subtext?: string;
}

const createDefaultModulo = (id?: string, servico?: Servico): Modulo => ({
  id: id || crypto.randomUUID(),
  nome: servico?.nome || '',
  servicoId: servico?.id || '',
  complexidade: servico?.categoria || 'Médio',
  implCost: servico?.preco || 0,
  moduleCOGS: 0,
  cac: 0,
  targetMarginFixed: 0,
  precoBase: 0,
});

const defaultTaxas: TaxasConfig = {
  teamRate: 0,
  taxRate: 0,
  commissionRate: 0,
  otherRate: 0,
  netMarginTarget: 0,
  cashDiscount: 0,
};

const defaultLeasing: LeasingConfig = {
  leaseRate: 0,
  leaseMonths: 0,
  leaseDown: 0,
  leaseFinal: 0,
  leaseMode: 'calc',
  leaseMonthly: 0,
  defaultRate: 0,
};


const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const clamp = (x: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, x));
};

export function CalculadoraLicencaVitalicia({ onClose, onSave, dadosSalvos }: CalculadoraLicencaVitaliciaProps) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [taxas, setTaxas] = useState<TaxasConfig>(defaultTaxas);
  const [leasing, setLeasing] = useState<LeasingConfig>(defaultLeasing);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [kpiFinal, setKpiFinal] = useState<string>('—');
  const [kpiFinalNote, setKpiFinalNote] = useState<string>('');
  const [kpiAVista, setKpiAVista] = useState<string>('—');
  const [kpiAVistaNota, setKpiAVistaNota] = useState<string>('');
  const [kpiLeasing, setKpiLeasing] = useState<string>('—');
  const [kpiLeasingNota, setKpiLeasingNota] = useState<string>('');
  const [isSaved, setIsSaved] = useState(!!dadosSalvos);
  const [calculatedData, setCalculatedData] = useState<DadosOrcamento | null>(dadosSalvos || null);
  const [isEditing, setIsEditing] = useState(true);

  // Buscar serviços da Toriq e carregar dados salvos
  useEffect(() => {
    const fetchServicos = async () => {
      setLoadingServicos(true);
      try {
        const { data, error } = await (supabase as any)
          .from('servicos')
          .select('id, nome, preco, categoria')
          .eq('empresa_id', TORIQ_EMPRESA_ID)
          .eq('ativo', true)
          .order('nome');
        
        if (error) throw error;
        setServicos((data || []) as Servico[]);
        
        // Se há dados salvos, carregar eles; senão criar módulo inicial
        if (dadosSalvos) {
          setModulos(dadosSalvos.modulos);
          setTaxas(dadosSalvos.taxas);
          setLeasing(dadosSalvos.leasing);
        } else if (data && data.length > 0) {
          setModulos([createDefaultModulo(undefined, data[0])]);
        } else {
          setModulos([createDefaultModulo()]);
        }
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        if (dadosSalvos) {
          setModulos(dadosSalvos.modulos);
          setTaxas(dadosSalvos.taxas);
          setLeasing(dadosSalvos.leasing);
        } else {
          setModulos([createDefaultModulo()]);
        }
      } finally {
        setLoadingServicos(false);
      }
    };
    fetchServicos();
  }, [dadosSalvos]);

  const addModulo = () => {
    const firstServico = servicos.length > 0 ? servicos[0] : undefined;
    setModulos(prev => [...prev, createDefaultModulo(undefined, firstServico)]);
  };

  const removeModulo = (id: string) => {
    if (modulos.length > 1) {
      setModulos(prev => prev.filter(m => m.id !== id));
    }
  };

  const updateModulo = (id: string, field: keyof Modulo, value: string | number) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const updateTaxas = (field: keyof TaxasConfig, value: number) => {
    setTaxas(prev => ({ ...prev, [field]: value }));
  };

  const updateLeasing = (field: keyof LeasingConfig, value: string | number) => {
    setLeasing(prev => ({ ...prev, [field]: value }));
  };

  const resetDefaults = () => {
    setModulos([createDefaultModulo()]);
    setTaxas(defaultTaxas);
    setLeasing(defaultLeasing);
  };

  const calculate = () => {
    // Calcular base total de todos os módulos
    let baseTotal = 0;
    const modulosDetalhes: { nome: string; complexidade: string; baseModulo: number; subtotal: number }[] = [];

    modulos.forEach(modulo => {
      const basePerModule = modulo.precoBase > 0
        ? modulo.precoBase
        : (modulo.implCost + modulo.moduleCOGS + modulo.cac + modulo.targetMarginFixed);
      baseTotal += basePerModule;
      modulosDetalhes.push({
        nome: modulo.nome,
        complexidade: modulo.complexidade,
        baseModulo: basePerModule,
        subtotal: basePerModule
      });
    });

    // Rates (convert to decimal)
    const teamRate = taxas.teamRate / 100;
    const taxRate = taxas.taxRate / 100;
    const commissionRate = taxas.commissionRate / 100;
    const otherRate = taxas.otherRate / 100;
    const totalRate = teamRate + taxRate + commissionRate + otherRate;

    const netMarginTarget = taxas.netMarginTarget / 100;

    // Price full (with net margin target)
    const denomFull = 1 - (totalRate + netMarginTarget);
    const fullPrice = denomFull > 0 ? (baseTotal / denomFull) : Infinity;

    // Break-even revenue (no loss)
    const denomBE = 1 - totalRate;
    const breakEvenRevenue = denomBE > 0 ? (baseTotal / denomBE) : Infinity;

    // Max discount without loss
    let maxDiscount = 0;
    if (isFinite(fullPrice) && fullPrice > 0 && isFinite(breakEvenRevenue)) {
      maxDiscount = 1 - (breakEvenRevenue / fullPrice);
      maxDiscount = clamp(maxDiscount, 0, 0.95);
    } else {
      maxDiscount = NaN;
    }

    // Fees helper
    const fees = (rev: number) => {
      const team = rev * teamRate;
      const tax = rev * taxRate;
      const commission = rev * commissionRate;
      const other = rev * otherRate;
      return { team, tax, commission, other, total: team + tax + commission + other };
    };

    // Full profit
    const feeFull = fees(fullPrice);
    const netProfitFull = fullPrice - baseTotal - feeFull.total;

    // Cash simulation
    const cashDiscount = taxas.cashDiscount / 100;
    const cashRevenue = fullPrice * (1 - cashDiscount);
    const feeCash = fees(cashRevenue);
    const netProfitCash = cashRevenue - baseTotal - feeCash.total;

    // Leasing / Consórcio
    const leaseRateDecimal = leasing.leaseRate / 100;
    const leaseMonths = Math.max(1, leasing.leaseMonths);
    const defaultRate = leasing.defaultRate / 100;

    const leaseTotal = fullPrice * (1 + leaseRateDecimal);

    let leaseMonthly: number;
    if (leasing.leaseMode === 'fixed') {
      leaseMonthly = leasing.leaseMonthly;
    } else {
      const remaining = Math.max(0, leaseTotal - leasing.leaseDown - leasing.leaseFinal);
      leaseMonthly = remaining / leaseMonths;
      updateLeasing('leaseMonthly', parseFloat(leaseMonthly.toFixed(2)));
    }

    const leaseRevenueNominal = leasing.leaseDown + (leaseMonthly * leaseMonths) + leasing.leaseFinal;
    const leaseRevenueExpected = leaseRevenueNominal * (1 - defaultRate);

    const feeLease = fees(leaseRevenueExpected);
    const netProfitLease = leaseRevenueExpected - baseTotal - feeLease.total;
    const leaseProfitPerMonth = netProfitLease / leaseMonths;

    const safeCashPrice = breakEvenRevenue;
    const maxDiscountPct = isFinite(maxDiscount) ? (maxDiscount * 100) : NaN;

    // Build results rows
    const rows: ResultRow[] = [];
    
    // Módulos adicionados
    rows.push({ label: 'MÓDULOS ADICIONADOS', value: `${modulos.length} módulo(s)`, className: 'font-bold text-primary' });
    modulosDetalhes.forEach((m, idx) => {
      rows.push({ 
        label: `${idx + 1}. ${m.nome}`, 
        value: formatBRL(m.subtotal), 
        subtext: `${m.complexidade} • ${formatBRL(m.baseModulo)}` 
      });
    });
    rows.push({ label: '', value: '', isSeparator: true });
    
    rows.push({ label: 'Base total (soma dos módulos)', value: formatBRL(baseTotal), className: 'font-bold' });
    rows.push({ label: '', value: '', isSeparator: true });
    rows.push({ label: 'Taxas totais (%)', value: `${(totalRate * 100).toFixed(1)}%`, subtext: `Time ${(teamRate * 100).toFixed(1)}% • Imposto ${(taxRate * 100).toFixed(1)}% • Comissão ${(commissionRate * 100).toFixed(1)}% • Outros ${(otherRate * 100).toFixed(1)}%` });
    rows.push({ label: 'Margem líquida desejada (%)', value: `${(netMarginTarget * 100).toFixed(1)}%` });
    rows.push({ label: '', value: '', isSeparator: true });
    rows.push({ label: 'Preço cheio (calculado)', value: isFinite(fullPrice) ? formatBRL(fullPrice) : 'Inválido (taxas+margem >= 100%)', className: 'font-bold text-primary' });
    rows.push({ label: 'Taxas no preço cheio (R$)', value: formatBRL(feeFull.total), subtext: `Time ${formatBRL(feeFull.team)} • Imposto ${formatBRL(feeFull.tax)} • Comissão ${formatBRL(feeFull.commission)} • Outros ${formatBRL(feeFull.other)}` });
    rows.push({ label: 'Lucro líquido no preço cheio (R$)', value: formatBRL(netProfitFull), className: netProfitFull >= 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold' });
    rows.push({ label: '', value: '', isSeparator: true });
    rows.push({ label: 'À vista "seguro" (sem prejuízo)', value: isFinite(safeCashPrice) ? formatBRL(safeCashPrice) : 'Inválido', subtext: 'Break-even (lucro = 0)' });
    rows.push({ label: 'Desconto máximo sem prejuízo', value: isFinite(maxDiscount) ? `${maxDiscountPct.toFixed(2)}%` : 'Inválido' });
    rows.push({ label: '', value: '', isSeparator: true });
    rows.push({ label: 'Simulação: desconto à vista informado', value: `${(cashDiscount * 100).toFixed(1)}%` });
    rows.push({ label: 'Receita à vista (com desconto)', value: isFinite(cashRevenue) ? formatBRL(cashRevenue) : 'Inválido' });
    rows.push({ label: 'Taxas à vista (R$)', value: formatBRL(feeCash.total) });
    rows.push({ 
      label: 'Lucro líquido à vista (R$)', 
      value: formatBRL(netProfitCash), 
      className: netProfitCash >= 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold',
      subtext: isFinite(maxDiscount) && cashDiscount > maxDiscount ? '⚠ Desconto acima do máximo sem prejuízo' : 'OK'
    });
    rows.push({ label: '', value: '', isSeparator: true });
    rows.push({ label: 'Leasing: taxa (%)', value: `${(leaseRateDecimal * 100).toFixed(1)}%`, subtext: 'Acréscimo sobre o preço cheio' });
    rows.push({ label: 'Leasing: total do consórcio (calculado)', value: isFinite(leaseTotal) ? formatBRL(leaseTotal) : 'Inválido', subtext: 'Preço cheio × (1 + taxa leasing)' });
    rows.push({ label: 'Leasing: prazo (meses)', value: String(leaseMonths) });
    rows.push({ label: 'Leasing: entrada / final', value: `${formatBRL(leasing.leaseDown)} / ${formatBRL(leasing.leaseFinal)}` });
    rows.push({ label: 'Leasing: mensalidade', value: formatBRL(leaseMonthly), subtext: leasing.leaseMode === 'fixed' ? 'Mensalidade fixa' : 'Mensalidade calculada' });
    rows.push({ label: 'Leasing: receita nominal', value: formatBRL(leaseRevenueNominal), subtext: 'Entrada + mensalidades + final' });
    rows.push({ label: 'Leasing: receita esperada', value: formatBRL(leaseRevenueExpected), subtext: `Inadimplência: ${(defaultRate * 100).toFixed(1)}%` });
    rows.push({ label: 'Leasing: taxas sobre receita esperada', value: formatBRL(feeLease.total), subtext: `Time ${formatBRL(feeLease.team)} • Imposto ${formatBRL(feeLease.tax)} • Comissão ${formatBRL(feeLease.commission)} • Outros ${formatBRL(feeLease.other)}` });
    rows.push({ label: 'Leasing: lucro líquido (no formato)', value: formatBRL(netProfitLease), className: netProfitLease >= 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold', subtext: `≈ ${formatBRL(leaseProfitPerMonth)} / mês` });

    setResults(rows);
    setKpiFinal(isFinite(fullPrice) ? formatBRL(fullPrice) : 'Inválido');
    setKpiFinalNote(`Base: ${formatBRL(baseTotal)} • Taxas: ${(totalRate * 100).toFixed(1)}% • Margem alvo: ${(netMarginTarget * 100).toFixed(1)}%`);
    setKpiAVista(isFinite(cashRevenue) ? formatBRL(cashRevenue) : 'Inválido');
    setKpiAVistaNota(`Desconto: ${(cashDiscount * 100).toFixed(1)}% • Lucro: ${formatBRL(netProfitCash)}`);
    setKpiLeasing(isFinite(leaseTotal) ? formatBRL(leaseTotal) : 'Inválido');
    setKpiLeasingNota(`Mensalidade: ${formatBRL(leaseMonthly)} • ${leaseMonths}x`);
    
    // Salvar dados calculados
    const dados: DadosOrcamento = {
      modulos,
      taxas,
      leasing,
      resultados: {
        precoCheio: isFinite(fullPrice) ? fullPrice : 0,
        precoAVista: isFinite(cashRevenue) ? cashRevenue : 0,
        precoLeasing: isFinite(leaseTotal) ? leaseTotal : 0,
        mensalidadeLeasing: leaseMonthly
      }
    };
    setCalculatedData(dados);
    return dados;
  };

  useEffect(() => {
    calculate();
  }, []);

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          TORIQ • Calculadora (Preço + À Vista + Leasing/Consórcio)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Defina <strong>Margem Líquida Desejada (%)</strong>. A calculadora calcula automaticamente: <strong>preço final cheio</strong>, <strong>à vista "seguro"</strong>, <strong>desconto máximo sem prejuízo</strong> e o <strong>Leasing/Consórcio</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
        {/* Coluna Esquerda - Formulário */}
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {/* Seção 1 - Módulos */}
            <div className="border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">1</span>
                  Módulos
                  <Badge variant="secondary" className="ml-2">{modulos.length}</Badge>
                </h3>
                <Button variant="outline" size="sm" onClick={addModulo} className="h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Módulo
                </Button>
              </div>
              
              <div className="space-y-3">
                {modulos.map((modulo, index) => (
                  <div key={modulo.id} className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Módulo {index + 1}</span>
                      </div>
                      {modulos.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeModulo(modulo.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs">Nome do Módulo (Serviço)</Label>
                        {loadingServicos ? (
                          <div className="h-8 flex items-center justify-center bg-muted rounded">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          <Select 
                            value={modulo.servicoId} 
                            onValueChange={(v) => {
                              const servicoInfo = servicos.find(s => s.id === v);
                              if (servicoInfo) {
                                updateModulo(modulo.id, 'servicoId', v);
                                updateModulo(modulo.id, 'nome', servicoInfo.nome);
                                updateModulo(modulo.id, 'complexidade', servicoInfo.categoria || 'Médio');
                                updateModulo(modulo.id, 'implCost', servicoInfo.preco || 0);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Selecione um serviço" />
                            </SelectTrigger>
                            <SelectContent>
                              {servicos.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.nome} {s.preco ? `(${formatBRL(s.preco)})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Custo implantação (R$)</Label>
                        <Input
                          type="number"
                          value={modulo.implCost}
                          onChange={(e) => updateModulo(modulo.id, 'implCost', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">COGS (R$)</Label>
                        <Input
                          type="number"
                          value={modulo.moduleCOGS}
                          onChange={(e) => updateModulo(modulo.id, 'moduleCOGS', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">CAC (R$)</Label>
                        <Input
                          type="number"
                          value={modulo.cac}
                          onChange={(e) => updateModulo(modulo.id, 'cac', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Margem fixa (R$)</Label>
                        <Input
                          type="number"
                          value={modulo.targetMarginFixed}
                          onChange={(e) => updateModulo(modulo.id, 'targetMarginFixed', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Preço base (R$)</Label>
                        <Input
                          type="number"
                          value={modulo.precoBase}
                          onChange={(e) => updateModulo(modulo.id, 'precoBase', parseFloat(e.target.value) || 0)}
                          className="h-8"
                          placeholder="0 = auto (implantação + COGS + CAC + margem)"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Se <code className="bg-muted px-1 rounded">Preço base</code> for 0, a base vira <strong>(implantação + COGS + CAC + margem fixa)</strong>. O valor total é a soma de todos os módulos.</span>
              </div>
            </div>

            {/* Seção 2 - Taxas e Meta de Margem */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">2</span>
                Taxas (%) e Meta de Margem Líquida
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Taxa do time (%)</Label>
                  <Input
                    type="number"
                    value={taxas.teamRate}
                    onChange={(e) => updateTaxas('teamRate', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Imposto (%)</Label>
                  <Input
                    type="number"
                    value={taxas.taxRate}
                    onChange={(e) => updateTaxas('taxRate', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Comissão (%) (SDR/Closer)</Label>
                  <Input
                    type="number"
                    value={taxas.commissionRate}
                    onChange={(e) => updateTaxas('commissionRate', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Outros (%)</Label>
                  <Input
                    type="number"
                    value={taxas.otherRate}
                    onChange={(e) => updateTaxas('otherRate', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Margem líquida desejada (%)</Label>
                  <Input
                    type="number"
                    value={taxas.netMarginTarget}
                    onChange={(e) => updateTaxas('netMarginTarget', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Desconto à vista (%)</Label>
                  <Input
                    type="number"
                    value={taxas.cashDiscount}
                    onChange={(e) => updateTaxas('cashDiscount', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3 - Leasing / Consórcio */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">3</span>
                Leasing / Consórcio (Licença Vitalícia Parcelada)
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Taxa de leasing (%)</Label>
                  <Input
                    type="number"
                    value={leasing.leaseRate}
                    onChange={(e) => updateLeasing('leaseRate', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Prazo (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={leasing.leaseMonths}
                    onChange={(e) => updateLeasing('leaseMonths', parseInt(e.target.value) || 1)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Entrada (R$)</Label>
                  <Input
                    type="number"
                    value={leasing.leaseDown}
                    onChange={(e) => updateLeasing('leaseDown', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Lance/Parcela final (R$)</Label>
                  <Input
                    type="number"
                    value={leasing.leaseFinal}
                    onChange={(e) => updateLeasing('leaseFinal', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Modo de mensalidade</Label>
                  <Select value={leasing.leaseMode} onValueChange={(v) => updateLeasing('leaseMode', v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calc">Calcular mensalidade</SelectItem>
                      <SelectItem value="fixed">Mensalidade fixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Mensalidade (R$) {leasing.leaseMode === 'fixed' && '(fixa)'}</Label>
                  <Input
                    type="number"
                    value={leasing.leaseMonthly}
                    onChange={(e) => updateLeasing('leaseMonthly', parseFloat(e.target.value) || 0)}
                    disabled={leasing.leaseMode === 'calc'}
                    className="h-9"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Inadimplência esperada (%)</Label>
                  <Input
                    type="number"
                    value={leasing.defaultRate}
                    onChange={(e) => updateLeasing('defaultRate', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <Button onClick={calculate} className="flex-1">
                <Calculator className="h-4 w-4 mr-2" />
                Calcular
              </Button>
              <Button variant="outline" onClick={resetDefaults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            {/* Fórmulas */}
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
              <Badge variant="outline" className="mb-2">Fórmulas</Badge>
              <div className="space-y-1">
                <p><strong>Preço Cheio:</strong> <code className="bg-muted px-1 rounded">Base / (1 - (taxas + margem alvo))</code></p>
                <p><strong>À vista seguro:</strong> <code className="bg-muted px-1 rounded">Base / (1 - taxas)</code></p>
                <p><strong>Desconto máximo:</strong> <code className="bg-muted px-1 rounded">1 - (À vista seguro / Preço cheio)</code></p>
                <p><strong>Total consórcio:</strong> <code className="bg-muted px-1 rounded">Preço cheio × (1 + taxa leasing)</code></p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Coluna Direita - Resultados */}
        <div className="border rounded-lg p-4 bg-card flex flex-col overflow-hidden">
          <h3 className="font-semibold text-sm mb-3">Resultado (Preço, À Vista e Leasing)</h3>
          
          <ScrollArea className="flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground uppercase">Item</th>
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground uppercase">Valor</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  row.isSeparator ? (
                    <tr key={idx}>
                      <td colSpan={2} className="text-center text-muted-foreground py-1">—</td>
                    </tr>
                  ) : (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2 px-2 text-xs">{row.label}</td>
                      <td className="py-2 px-2">
                        <span className={`font-semibold text-xs ${row.className || ''}`}>{row.value}</span>
                        {row.subtext && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">{row.subtext}</div>
                        )}
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </ScrollArea>

          {/* KPIs - Layout compacto em 3 colunas */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
            <div className="border rounded-lg p-2 bg-muted/30">
              <div className="text-[10px] text-muted-foreground">Preço cheio (com margem líquida alvo)</div>
              <div className="text-sm font-bold text-primary mt-1">{kpiFinal}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{kpiFinalNote}</div>
            </div>
            <div className="border rounded-lg p-2 bg-muted/30">
              <div className="text-[10px] text-muted-foreground">Valor do Leasing</div>
              <div className="text-sm font-bold text-orange-500 mt-1">{kpiLeasing}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{kpiLeasingNota}</div>
            </div>
            <div className="border rounded-lg p-2 bg-muted/30">
              <div className="text-[10px] text-muted-foreground">À Vista (com desconto)</div>
              <div className="text-sm font-bold text-green-500 mt-1">{kpiAVista}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{kpiAVistaNota}</div>
            </div>
          </div>

          {/* Hint */}
          <div className="mt-3 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
            <Badge variant="outline" className="mb-1">Leitura rápida</Badge>
            <p>Se o desconto à vista estiver acima do "desconto máximo", a venda à vista vira negativa. No leasing, a "taxa de leasing" aumenta o total financiado e tende a proteger a margem.</p>
          </div>

          {/* Botões Salvar e Editar */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button 
              onClick={() => {
                const data = calculate();
                if (data && onSave) {
                  onSave(data);
                  setIsSaved(true);
                  setIsEditing(false);
                }
              }}
              className="flex-1"
              disabled={!isEditing}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaved && !isEditing ? 'Salvo!' : 'Salvar'}
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
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
