import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, LayoutDashboard, FileText, ArrowDownCircle, ArrowUpCircle, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToriqCorpFinanceiroProps {
  onNavigate?: (section: string) => void;
}

const menuItems = [
  { id: 'toriq-corp-financeiro-dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Visão geral financeira' },
  { id: 'toriq-corp-financeiro-cadastros', label: 'Cadastros', icon: FileText, description: 'Plano de contas, formas de cobrança' },
  { id: 'toriq-corp-contas-receber', label: 'Contas a Receber', icon: ArrowDownCircle, description: 'Gestão de recebíveis' },
  { id: 'toriq-corp-contas-pagar', label: 'Contas a Pagar', icon: ArrowUpCircle, description: 'Gestão de pagamentos' },
  { id: 'toriq-corp-fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp, description: 'Movimentações financeiras' },
  { id: 'toriq-corp-dre', label: 'DRE', icon: FileSpreadsheet, description: 'Demonstrativo de Resultados' },
];

export function ToriqCorpFinanceiro({ onNavigate }: ToriqCorpFinanceiroProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <DollarSign className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Gestão financeira da empresa SST</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((item) => (
          <Card 
            key={item.id} 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => onNavigate?.(item.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <item.icon className="h-5 w-5 text-primary" />
                {item.label}
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Acessar →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
