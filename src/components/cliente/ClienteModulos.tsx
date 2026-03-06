import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight } from 'lucide-react';
import { icons } from 'lucide-react';

interface Modulo {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  rota: string;
}

export function ClienteModulos() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModulos = async () => {
      if (!empresa?.id) {
        setLoading(false);
        return;
      }

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
        .eq('empresa_id', empresa.id)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Módulos</h1>
        <p className="text-muted-foreground">Acesse os módulos contratados pela sua empresa</p>
      </div>

      {modulos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum módulo ativo</h3>
            <p className="text-muted-foreground text-center mt-2">
              Sua empresa ainda não possui módulos ativos.
              <br />
              Entre em contato com o suporte para mais informações.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((modulo) => {
            const Icon = getIcon(modulo.icone);
            return (
              <Card key={modulo.id} className="hover:shadow-md transition-all hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{modulo.nome}</CardTitle>
                      <Badge variant="secondary" className="mt-1">Ativo</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="line-clamp-2">
                    {modulo.descricao || 'Sem descrição disponível'}
                  </CardDescription>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(modulo.rota)}
                  >
                    Ver mais
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
