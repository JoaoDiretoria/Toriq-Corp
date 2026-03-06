import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw, Plus, Search, Package } from 'lucide-react';

export function ToriqEPIDevolucoes() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="h-6 w-6" />
            Devoluções de EPIs
          </h1>
          <p className="text-muted-foreground">
            Registro de devoluções e baixas de EPIs
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar devolução..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Devolução
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Devoluções</CardTitle>
          <CardDescription>Todas as devoluções e baixas de EPIs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma devolução registrada.</p>
            <p className="text-sm">Clique em "Registrar Devolução" para começar.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
