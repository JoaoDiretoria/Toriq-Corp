import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Palette, Edit, Image } from 'lucide-react';

interface ConfiguracaoEmpresa {
  id: string;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  tema: string;
}

export function ClientePerfil() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfiguracaoEmpresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!empresa?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('configuracoes_empresa')
        .select('*')
        .eq('empresa_id', empresa.id)
        .maybeSingle();

      if (error) {
        toast({
          title: "Erro ao carregar configurações",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setConfig(data);
      }
      setLoading(false);
    };

    fetchConfig();
  }, [empresa?.id, toast]);

  const handleEditarDados = () => {
    toast({
      title: "Em breve",
      description: "A funcionalidade de edição estará disponível em breve.",
    });
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'vertical_on':
        return 'Toriq';
      case 'sst':
        return 'Empresa SST';
      case 'cliente_final':
        return 'Cliente Final';
      default:
        return tipo;
    }
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
        <h1 className="text-2xl font-bold">Perfil da Empresa</h1>
        <p className="text-muted-foreground">Informações e configurações da sua empresa</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dados da Empresa */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Dados da Empresa</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleEditarDados}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
            <CardDescription>Informações cadastrais da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {empresa ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{empresa.nome}</p>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{(empresa as any).cnpj || 'Não informado'}</p>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge variant="secondary">{getTipoLabel(empresa.tipo)}</Badge>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Empresa não vinculada</p>
            )}
          </CardContent>
        </Card>

        {/* Configurações de Aparência */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Aparência</CardTitle>
            </div>
            <CardDescription>Configurações visuais e whitelabel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Logo da Empresa</p>
                  {config.logo_url ? (
                    <img 
                      src={config.logo_url} 
                      alt="Logo da empresa" 
                      className="h-16 object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Image className="h-8 w-8" />
                      <span className="text-sm">Nenhuma logo definida</span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Cores do Tema</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: config.cor_primaria }}
                      />
                      <span className="text-sm">Primária</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: config.cor_secundaria }}
                      />
                      <span className="text-sm">Secundária</span>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tema</p>
                  <Badge variant="outline" className="capitalize">{config.tema}</Badge>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Nenhuma configuração de aparência definida.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Entre em contato com o suporte para personalizar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
