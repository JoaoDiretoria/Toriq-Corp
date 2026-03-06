import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { usePermissoes } from '@/hooks/usePermissoes';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, Briefcase, 
  Package, Heart, ArrowRight,
  Building2, FileText, Loader2, Settings, FolderPlus, Headphones
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Modulo {
  id: string;
  nome: string;
  icone: string | null;
  rota: string;
}

interface SSTDashboardGeralProps {
  onNavigate: (section: string) => void;
  modulosAtivos: Modulo[];
}

const CORES_MODULOS: Record<string, { bg: string; hover: string }> = {
  'Toriq Corp': { bg: 'bg-primary', hover: 'hover:bg-primary/90' },
  'Saúde Ocupacional': { bg: 'bg-primary', hover: 'hover:bg-primary/90' },
  'Gestão de Terceiros': { bg: 'bg-primary', hover: 'hover:bg-primary/90' },
};

export function SSTDashboardGeral({ onNavigate, modulosAtivos }: SSTDashboardGeralProps) {
  const { profile, empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const { moduloVisivel, podeVisualizar } = usePermissoes();
  const empresaId = empresaMode?.empresaId || empresa?.id;

  const [loading, setLoading] = useState(true);
  const [totalClientes, setTotalClientes] = useState(0);

  useEffect(() => {
    if (empresaId) {
      loadDashboardData();
    }
  }, [empresaId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Buscar clientes da empresa SST (tabela clientes_sst)
      const { count, error } = await supabase
        .from('clientes_sst')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_sst_id', empresaId);

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        setTotalClientes(0);
      } else {
        setTotalClientes(count || 0);
      }

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setTotalClientes(0);
    } finally {
      setLoading(false);
    }
  };

  const getModuloIcon = (nome: string) => {
    const map: Record<string, any> = {
      'Toriq Corp': Briefcase,
      'Saúde Ocupacional': Heart,
      'Gestão de Terceiros': Users,
      'Gestão de Documentos': FileText,
    };
    return map[nome] || Package;
  };

  const getModuloDashboard = (nome: string) => {
    const map: Record<string, string> = {
      'Toriq Corp': 'toriq-corp-dashboard',
      'Saúde Ocupacional': 'clientes',
      'Gestão de Terceiros': 'clientes',
    };
    return map[nome] || 'clientes';
  };

  const getModuloCores = (nome: string) => {
    return CORES_MODULOS[nome] || { bg: 'bg-primary', hover: 'hover:bg-primary/90' };
  };

  // Verifica se o usuário tem permissão para acessar o módulo
  const usuarioTemPermissaoModulo = (nomeModulo: string): boolean => {
    // Mapear nome do módulo para o ID usado no sistema de permissões
    const moduloIdMap: Record<string, string> = {
      'Toriq Corp': 'toriq_corp',
    };
    
    const moduloId = moduloIdMap[nomeModulo];
    if (!moduloId) return true; // Se não está mapeado, permite (comportamento legado)
    
    return moduloVisivel(moduloId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com saudação */}
      <div className="bg-card text-card-foreground rounded-2xl p-6 border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Olá, {profile?.nome?.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              {empresa?.nome}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              className="bg-primary hover:bg-primary/90 text-white border-none"
              onClick={() => onNavigate('clientes')}
            >
              <Users className="h-4 w-4 mr-2" />
              Ver Clientes
            </Button>
          </div>
        </div>
      </div>

      {/* Navegação Rápida - filtrada por permissões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Navegação Rápida
          </CardTitle>
          <CardDescription>Acesse rapidamente as principais áreas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {podeVisualizar('cadastros') && (
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-2 border-2 border-border bg-background hover:bg-primary/5 hover:border-primary transition-all"
                onClick={() => onNavigate('clientes')}
              >
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm text-foreground">Clientes</span>
                <span className="text-xs text-muted-foreground">{totalClientes} cadastrados</span>
              </Button>
            )}
            {podeVisualizar('cadastros') && (
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-2 border-2 border-border bg-background hover:bg-primary/5 hover:border-primary transition-all"
                onClick={() => onNavigate('cadastros')}
              >
                <FolderPlus className="h-5 w-5 text-primary" />
                <span className="text-sm text-foreground">Cadastros</span>
              </Button>
            )}
            {podeVisualizar('configuracoes') && (
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-2 border-2 border-border bg-background hover:bg-primary/5 hover:border-primary transition-all"
                onClick={() => onNavigate('configuracoes')}
              >
                <Settings className="h-5 w-5 text-primary" />
                <span className="text-sm text-foreground">Configurações</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              className="h-auto py-3 flex flex-col items-center gap-2 border-2 border-border bg-background hover:bg-primary/5 hover:border-primary transition-all"
              onClick={() => onNavigate('suporte')}
            >
              <Headphones className="h-5 w-5 text-primary" />
              <span className="text-sm text-foreground">Suporte</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Módulos Ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seus Módulos
          </CardTitle>
          <CardDescription>Clique para acessar cada módulo contratado</CardDescription>
        </CardHeader>
        <CardContent>
          {modulosAtivos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modulosAtivos
                .filter((modulo, index, self) => {
                  // Filtrar duplicados - se tiver "Toriq Corp" e outro com nome similar, manter apenas um
                  const isDuplicate = self.findIndex(m => 
                    getModuloDashboard(m.nome) === getModuloDashboard(modulo.nome)
                  ) !== index;
                  return !isDuplicate;
                })
                .filter(modulo => usuarioTemPermissaoModulo(modulo.nome))
                .map((modulo) => {
                const Icon = getModuloIcon(modulo.nome);
                const cores = getModuloCores(modulo.nome);
                return (
                  <div
                    key={modulo.id}
                    className={`${cores.bg} ${cores.hover} rounded-xl p-5 text-white cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]`}
                    onClick={() => onNavigate(getModuloDashboard(modulo.nome))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{modulo.nome}</h3>
                          <p className="text-sm text-white/80">Clique para acessar</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum módulo ativo</p>
              <p className="text-sm">Entre em contato para contratar módulos</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
