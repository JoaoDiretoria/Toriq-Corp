import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EvolutionConfig } from './EvolutionConfig';
import { EvolutionInstancias } from './EvolutionInstancias';

/**
 * Tela raiz do canal WhatsApp via Evolution API.
 *
 * - super admin (admin_vertical): vê "Servidor" (config global) + "Instâncias".
 * - empresa (cliente_torq/cliente_final): vê apenas "Instâncias".
 *
 * Reaproveitada tanto no AdminDashboard quanto no SSTDashboard.
 */
export function EvolutionApi() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'admin_vertical';

  if (!isSuperAdmin) {
    return (
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">WhatsApp (Evolution API)</h2>
        <p className="text-sm text-muted-foreground">
          Conecte e gerencie seus números de WhatsApp.
        </p>
        <div className="pt-4">
          <EvolutionInstancias />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">WhatsApp (Evolution API)</h2>
        <p className="text-sm text-muted-foreground">
          Servidor global e instâncias de WhatsApp.
        </p>
      </div>
      <Tabs defaultValue="instancias">
        <TabsList>
          <TabsTrigger value="instancias">Instâncias</TabsTrigger>
          <TabsTrigger value="servidor">Servidor</TabsTrigger>
        </TabsList>
        <TabsContent value="instancias" className="pt-4">
          <EvolutionInstancias />
        </TabsContent>
        <TabsContent value="servidor" className="pt-4">
          <EvolutionConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
