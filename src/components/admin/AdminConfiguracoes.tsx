import { Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminConfiguracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configurações Gerais
        </h1>
        <p className="text-muted-foreground">
          Gerencie as configurações gerais do sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações do Sistema</CardTitle>
          <CardDescription>
            Funcionalidade em desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            As configurações gerais do sistema serão implementadas em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
