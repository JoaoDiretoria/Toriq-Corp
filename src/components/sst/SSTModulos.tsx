import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus } from 'lucide-react';
import { icons } from 'lucide-react';

interface Modulo {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  rota: string;
}

export function SSTModulos() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModulos = async () => {
      if (!empresaId) return;

      const { data, error } = await supabase
        .from('empresas_modulos')
        .select(`
          modulo_id,
          ativo,
          modulos (
            id,
            nome,
            descricao,
            icone,
            rota
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('ativo', true);

      if (error) {
        toast({
          title: "Erro ao carregar módulos",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const modulosAtivos = data
          ?.filter(item => item.modulos)
          .map(item => item.modulos as Modulo) || [];
        setModulos(modulosAtivos);
      }
      setLoading(false);
    };

    fetchModulos();
  }, [empresa?.id, toast]);

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Package;
    const Icon = icons[iconName as keyof typeof icons];
    return Icon || Package;
  };

  const handleSolicitarModulo = () => {
    toast({
      title: "Solicitação enviada",
      description: "Em breve entraremos em contato sobre novos módulos.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Módulos Ativos</h1>
        <Button onClick={handleSolicitarModulo}>
          <Plus className="h-4 w-4 mr-2" />
          Solicitar Novo Módulo
        </Button>
      </div>

      {modulos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum módulo ativo encontrado.
              <br />
              Entre em contato para ativar módulos para sua empresa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modulos.map((modulo) => {
            const Icon = getIcon(modulo.icone);
            return (
              <Card key={modulo.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{modulo.nome}</CardTitle>
                      <Badge variant="secondary" className="mt-1">Ativo</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {modulo.descricao || 'Sem descrição disponível'}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
