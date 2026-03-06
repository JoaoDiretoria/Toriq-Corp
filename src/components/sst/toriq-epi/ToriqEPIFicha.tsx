import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search, Printer, Users } from 'lucide-react';

export function ToriqEPIFicha() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Ficha de EPI
          </h1>
          <p className="text-muted-foreground">
            Ficha individual de controle de EPIs por colaborador
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Ficha
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle>Fichas de EPI</CardTitle>
          <CardDescription>Selecione um colaborador para visualizar sua ficha de EPI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecione um colaborador para visualizar sua ficha.</p>
            <p className="text-sm">A ficha mostra todo o histórico de EPIs do colaborador.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
