import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileType, Download, FileText, Users, Package, TrendingUp } from 'lucide-react';

export function ToriqEPIRelatorios() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileType className="h-6 w-6" />
            Relatórios de EPI
          </h1>
          <p className="text-muted-foreground">
            Relatórios e análises do módulo de EPIs
          </p>
        </div>
      </div>

      {/* Relatórios Disponíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5" />
              Posição de Estoque
            </CardTitle>
            <CardDescription>Relatório completo do estoque atual</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Entregas por Colaborador
            </CardTitle>
            <CardDescription>Histórico de entregas por colaborador</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Fichas de EPI
            </CardTitle>
            <CardDescription>Fichas individuais para impressão</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Consumo Mensal
            </CardTitle>
            <CardDescription>Análise de consumo de EPIs por período</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5" />
              EPIs Vencidos/Vencendo
            </CardTitle>
            <CardDescription>Lista de EPIs próximos do vencimento</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Termo de Responsabilidade
            </CardTitle>
            <CardDescription>Modelo de termo para assinatura</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
