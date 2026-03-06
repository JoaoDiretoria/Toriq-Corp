import { useState, useEffect } from 'react';
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
import { RotateCcw, Calculator, Info } from 'lucide-react';

interface CalculadoraCustoMensalProps {
  onClose?: () => void;
  onSave?: (dados: DadosCustoMensal) => void;
  dadosSalvos?: DadosCustoMensal | null;
}

export interface DadosCustoMensal {
  custos: CustosConfig;
  taxas: TaxasConfig;
  config: ConfigMensal;
  resultados: {
    custoTotal: number;
    precoSugerido: number;
    lucroLiquido: number;
    margemEfetiva: number;
  };
}

interface CustosConfig {
  server: number;
  db: number;
  storage: number;
  security: number;
  support: number;
  updates: number;
  premium: number;
  incidents: number;
}

interface TaxasConfig {
  teamRate: number;
  taxRate: number;
  otherRate: number;
  commissionRate: number;
}

interface ConfigMensal {
  netMarginTarget: number;
  planName: string;
  manualPrice: number;
  mode: 'auto' | 'manual';
}

interface ResultRow {
  label: string;
  value: string;
  className?: string;
  subtext?: string;
  isSeparator?: boolean;
}

const defaultCustos: CustosConfig = {
  server: 0,
  db: 0,
  storage: 0,
  security: 0,
  support: 0,
  updates: 0,
  premium: 0,
  incidents: 0,
};

const defaultTaxas: TaxasConfig = {
  teamRate: 0,
  taxRate: 0,
  otherRate: 0,
  commissionRate: 0,
};

const defaultConfig: ConfigMensal = {
  netMarginTarget: 0,
  planName: 'TORIQ Care + Updates',
  manualPrice: 0,
  mode: 'auto',
};

const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function CalculadoraCustoMensal({ onClose, onSave, dadosSalvos }: CalculadoraCustoMensalProps) {
  const [custos, setCustos] = useState<CustosConfig>(dadosSalvos?.custos || defaultCustos);
  const [taxas, setTaxas] = useState<TaxasConfig>(dadosSalvos?.taxas || defaultTaxas);
  const [config, setConfig] = useState<ConfigMensal>(dadosSalvos?.config || defaultConfig);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [kpiCost, setKpiCost] = useState<string>('—');
  const [kpiCostNote, setKpiCostNote] = useState<string>('');
  const [kpiPrice, setKpiPrice] = useState<string>('—');
  const [kpiPriceNote, setKpiPriceNote] = useState<string>('');
  const [kpiProfit, setKpiProfit] = useState<string>('—');
  const [kpiProfitNote, setKpiProfitNote] = useState<string>('');
  const [kpiMargin, setKpiMargin] = useState<string>('—');
  const [kpiMarginNote, setKpiMarginNote] = useState<string>('');
  const [isSaved, setIsSaved] = useState(!!dadosSalvos);
  const [isEditing, setIsEditing] = useState(!dadosSalvos);

  const updateCustos = (field: keyof CustosConfig, value: number) => {
    setCustos(prev => ({ ...prev, [field]: value }));
  };

  const updateTaxas = (field: keyof TaxasConfig, value: number) => {
    setTaxas(prev => ({ ...prev, [field]: value }));
  };

  const updateConfig = (field: keyof ConfigMensal, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const resetDefaults = () => {
    setCustos(defaultCustos);
    setTaxas(defaultTaxas);
    setConfig(defaultConfig);
  };

  const calculate = () => {
    // Custo direto total
    const directCost = custos.server + custos.db + custos.storage + custos.security +
                       custos.support + custos.updates + custos.premium + custos.incidents;

    // Taxas (% sobre receita mensal)
    const teamRate = taxas.teamRate / 100;
    const taxRate = taxas.taxRate / 100;
    const otherRate = taxas.otherRate / 100;
    const commissionRate = taxas.commissionRate / 100;
    const totalRate = teamRate + taxRate + otherRate + commissionRate;

    // Margem líquida alvo
    const netMarginTarget = config.netMarginTarget / 100;

    // Preço recomendado (gross-up)
    const denom = 1 - (totalRate + netMarginTarget);
    const recommended = denom > 0 ? (directCost / denom) : Infinity;

    const price = (config.mode === 'manual' && config.manualPrice > 0) ? config.manualPrice : recommended;

    // Taxas em R$
    const teamFee = price * teamRate;
    const taxFee = price * taxRate;
    const otherFee = price * otherRate;
    const commissionFee = price * commissionRate;
    const feesTotal = teamFee + taxFee + otherFee + commissionFee;

    // Lucro líquido
    const netProfit = price - directCost - feesTotal;

    // Margem efetiva
    const effMargin = (price > 0) ? (netProfit / price) : 0;

    // Break-even
    const denomBE = 1 - totalRate;
    const breakEven = denomBE > 0 ? (directCost / denomBE) : Infinity;

    // Build results rows
    const rows: ResultRow[] = [];

    rows.push({ label: 'Plano', value: config.planName, className: 'font-bold' });
    rows.push({ label: '', value: '', isSeparator: true });

    rows.push({ label: 'Custo: Servidor/Hospedagem', value: formatBRL(custos.server) });
    rows.push({ label: 'Custo: Banco de dados', value: formatBRL(custos.db) });
    rows.push({ label: 'Custo: Armazenamento', value: formatBRL(custos.storage) });
    rows.push({ label: 'Custo: Backup/Security/Monitoramento', value: formatBRL(custos.security) });
    rows.push({ label: 'Custo: Suporte', value: formatBRL(custos.support) });
    rows.push({ label: 'Custo: Atualizações (reserva)', value: formatBRL(custos.updates) });
    rows.push({ label: 'Custo: Premium/Plantão', value: formatBRL(custos.premium) });
    rows.push({ label: 'Custo: Provisão de incidentes', value: formatBRL(custos.incidents) });
    rows.push({ label: 'Custo mensal total (direto)', value: formatBRL(directCost), className: 'font-bold text-primary' });
    rows.push({ label: '', value: '', isSeparator: true });

    rows.push({ 
      label: 'Taxas totais (%)', 
      value: `${(totalRate * 100).toFixed(1)}%`, 
      className: 'font-bold',
      subtext: `Time ${(teamRate * 100).toFixed(1)}% • Imposto ${(taxRate * 100).toFixed(1)}% • Outros ${(otherRate * 100).toFixed(1)}% • Comissão ${(commissionRate * 100).toFixed(1)}%`
    });
    rows.push({ label: 'Margem líquida desejada (%)', value: `${(netMarginTarget * 100).toFixed(1)}%`, className: 'font-bold' });
    rows.push({ label: '', value: '', isSeparator: true });

    rows.push({ 
      label: 'Preço mensal recomendado (automático)', 
      value: isFinite(recommended) ? formatBRL(recommended) : 'Inválido (taxas+margem >= 100%)', 
      className: 'font-bold text-primary' 
    });
    rows.push({ 
      label: 'Preço mensal mínimo (break-even)', 
      value: isFinite(breakEven) ? formatBRL(breakEven) : 'Inválido', 
      subtext: 'Lucro = 0 (sem margem)' 
    });
    rows.push({ label: '', value: '', isSeparator: true });

    rows.push({ 
      label: 'Preço mensal usado no cálculo', 
      value: isFinite(price) ? formatBRL(price) : 'Inválido', 
      className: 'font-bold',
      subtext: config.mode === 'manual' ? 'Preço informado' : 'Preço automático'
    });
    rows.push({ label: 'Taxa time (R$)', value: formatBRL(teamFee) });
    rows.push({ label: 'Impostos (R$)', value: formatBRL(taxFee) });
    rows.push({ label: 'Outros (R$)', value: formatBRL(otherFee) });
    rows.push({ label: 'Comissão (R$)', value: formatBRL(commissionFee) });
    rows.push({ label: 'Total de taxas (R$)', value: formatBRL(feesTotal), className: 'font-bold' });
    rows.push({ 
      label: 'Lucro líquido mensal (R$)', 
      value: formatBRL(netProfit), 
      className: netProfit >= 0 ? 'font-bold text-green-500' : 'font-bold text-red-500' 
    });
    rows.push({ 
      label: 'Margem líquida efetiva', 
      value: `${(effMargin * 100).toFixed(1)}%`, 
      className: effMargin >= 0 ? 'font-bold text-green-500' : 'font-bold text-red-500' 
    });

    setResults(rows);

    // KPIs
    setKpiCost(formatBRL(directCost));
    setKpiCostNote(`Infra: ${formatBRL(custos.server + custos.db + custos.storage + custos.security)} • Suporte+Updates: ${formatBRL(custos.support + custos.updates + custos.premium + custos.incidents)}`);

    setKpiPrice(isFinite(price) ? formatBRL(price) : 'Inválido');
    setKpiPriceNote(`Break-even: ${isFinite(breakEven) ? formatBRL(breakEven) : '—'} • Alvo: ${(netMarginTarget * 100).toFixed(1)}%`);

    setKpiProfit(formatBRL(netProfit));
    setKpiProfitNote(`Taxas: ${formatBRL(feesTotal)} • Custos: ${formatBRL(directCost)}`);

    setKpiMargin(`${(effMargin * 100).toFixed(1)}%`);
    setKpiMarginNote(`Meta: ${(netMarginTarget * 100).toFixed(1)}% • Taxas totais: ${(totalRate * 100).toFixed(1)}%`);

    return {
      custoTotal: directCost,
      precoSugerido: isFinite(price) ? price : 0,
      lucroLiquido: netProfit,
      margemEfetiva: effMargin * 100
    };
  };

  useEffect(() => {
    calculate();
  }, []);

  const handleSave = () => {
    const resultados = calculate();
    if (onSave) {
      onSave({
        custos,
        taxas,
        config,
        resultados
      });
      setIsSaved(true);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          TORIQ • Calculadora Pós-Licença (Custo Mensal x Quanto Cobrar)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Para clientes que já pagaram a licença vitalícia: calcule <strong>custo mensal real</strong> (infra + banco/armazenamento + suporte + atualizações)
          e defina quanto cobrar por mês para manter o sistema funcionando com previsibilidade.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
        {/* Coluna Esquerda - Formulário */}
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {/* Seção 1 - Custos Mensais Diretos */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">1</span>
                Custos Mensais Diretos por Cliente
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Hospedagem/Servidor (R$/mês)</Label>
                  <Input
                    type="number"
                    value={custos.server}
                    onChange={(e) => updateCustos('server', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Banco de dados (R$/mês)</Label>
                  <Input
                    type="number"
                    value={custos.db}
                    onChange={(e) => updateCustos('db', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Armazenamento (R$/mês)</Label>
                  <Input
                    type="number"
                    value={custos.storage}
                    onChange={(e) => updateCustos('storage', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Backups/Monitoramento/Security (R$/mês)</Label>
                  <Input
                    type="number"
                    value={custos.security}
                    onChange={(e) => updateCustos('security', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Seção 2 - Suporte e Atualizações */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">2</span>
                Suporte e Atualizações Vitalícias
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Suporte humano (R$/mês)</Label>
                  <Input
                    type="number"
                    value={custos.support}
                    onChange={(e) => updateCustos('support', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Atualizações (dev/roadmap) (R$/mês)</Label>
                  <Input
                    type="number"
                    value={custos.updates}
                    onChange={(e) => updateCustos('updates', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Suporte premium/plantão (R$/mês)</Label>
                  <Input
                    type="number"
                    value={custos.premium}
                    onChange={(e) => updateCustos('premium', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Provisão de incidentes (R$/mês)</Label>
                  <Input
                    type="number"
                    value={custos.incidents}
                    onChange={(e) => updateCustos('incidents', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Seção 3 - Overhead e Impostos */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">3</span>
                Overhead (Time/Admin) e Impostos
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Taxa do time/admin (%)</Label>
                  <Input
                    type="number"
                    value={taxas.teamRate}
                    onChange={(e) => updateTaxas('teamRate', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Imposto (%)</Label>
                  <Input
                    type="number"
                    value={taxas.taxRate}
                    onChange={(e) => updateTaxas('taxRate', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Outros (%) (gateway, cobrança, etc.)</Label>
                  <Input
                    type="number"
                    value={taxas.otherRate}
                    onChange={(e) => updateTaxas('otherRate', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Comissão pós-venda (%)</Label>
                  <Input
                    type="number"
                    value={taxas.commissionRate}
                    onChange={(e) => updateTaxas('commissionRate', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Seção 4 - Meta e Plano */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">4</span>
                Meta: Margem Líquida Mensal e Plano
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Margem líquida desejada (%)</Label>
                  <Input
                    type="number"
                    value={config.netMarginTarget}
                    onChange={(e) => updateConfig('netMarginTarget', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Nome do plano</Label>
                  <Input
                    type="text"
                    value={config.planName}
                    onChange={(e) => updateConfig('planName', e.target.value)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Simular preço mensal (R$)</Label>
                  <Input
                    type="number"
                    value={config.manualPrice}
                    onChange={(e) => updateConfig('manualPrice', parseFloat(e.target.value) || 0)}
                    className="h-8"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-xs">Modo</Label>
                  <Select 
                    value={config.mode} 
                    onValueChange={(v) => updateConfig('mode', v as 'auto' | 'manual')}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Calcular automaticamente</SelectItem>
                      <SelectItem value="manual">Testar preço informado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <Button onClick={calculate} className="flex-1" disabled={!isEditing}>
                <Calculator className="h-4 w-4 mr-2" />
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
                <Badge variant="outline" className="mb-1">Fórmula</Badge>
                <p><strong>Preço mensal recomendado</strong> (gross-up):</p>
                <code className="bg-muted px-1 rounded">Preço = CustoDireto / (1 - (taxas% + margem líquida%))</code>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Coluna Direita - Resultados */}
        <ScrollArea className="h-full">
          <div className="border rounded-lg p-4 bg-muted/30 flex flex-col">
            <h3 className="font-semibold text-sm mb-3">Resultado (Custo, Preço e Lucro Mensal)</h3>

            <table className="w-full text-sm mb-4">
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
                      <td colSpan={2} className="py-1 text-center text-muted-foreground">—</td>
                    </tr>
                  ) : (
                    <tr key={idx} className="border-b border-muted/30">
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

            {/* KPIs - Layout compacto em 2x2 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="border rounded-lg p-2 bg-muted/30">
              <div className="text-[10px] text-muted-foreground">Custo mensal total (direto)</div>
              <div className="text-sm font-bold text-primary mt-1">{kpiCost}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{kpiCostNote}</div>
            </div>
            <div className="border rounded-lg p-2 bg-muted/30">
              <div className="text-[10px] text-muted-foreground">Preço mensal sugerido</div>
              <div className="text-sm font-bold text-orange-500 mt-1">{kpiPrice}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{kpiPriceNote}</div>
            </div>
            <div className="border rounded-lg p-2 bg-muted/30">
              <div className="text-[10px] text-muted-foreground">Lucro líquido mensal</div>
              <div className="text-sm font-bold text-green-500 mt-1">{kpiProfit}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{kpiProfitNote}</div>
            </div>
            <div className="border rounded-lg p-2 bg-muted/30">
              <div className="text-[10px] text-muted-foreground">Margem líquida efetiva</div>
              <div className="text-sm font-bold text-purple-500 mt-1">{kpiMargin}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{kpiMarginNote}</div>
            </div>
          </div>

          {/* Hint */}
          <div className="mt-3 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
            <Badge variant="outline" className="mb-1">Dica</Badge>
            <p>Se o custo de suporte estiver alto, ajuste com: base de conhecimento + vídeos + SLA por plano (Básico/Pro/Premium).</p>
          </div>

          {/* Botões Salvar e Editar */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button 
              onClick={handleSave}
              className="flex-1"
              disabled={!isEditing}
            >
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
              Editar
            </Button>
          </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
