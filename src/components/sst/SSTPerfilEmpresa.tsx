import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, UsersRound, Package, Calendar, Mail, Phone, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface EmpresaInfo {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  tipo: string;
  created_at: string;
}

interface Stats {
  totalUsuarios: number;
  totalClientes: number;
  totalModulosAtivos: number;
}

export function SSTPerfilEmpresa() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const [empresaInfo, setEmpresaInfo] = useState<EmpresaInfo | null>(null);
  const [stats, setStats] = useState<Stats>({ totalUsuarios: 0, totalClientes: 0, totalModulosAtivos: 0 });
  const [loading, setLoading] = useState(true);

  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;

  useEffect(() => {
    const fetchEmpresaInfo = async () => {
      if (!empresaId) return;

      try {
        // Buscar informações da empresa
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', empresaId)
          .single();

        if (empresaError) throw empresaError;
        setEmpresaInfo(empresaData);

        // Buscar total de usuários
        const { count: usuariosCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresaId);

        // Buscar total de clientes
        const { count: clientesCount } = await supabase
          .from('clientes_sst')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_sst_id', empresaId);

        // Buscar total de módulos ativos
        const { count: modulosCount } = await supabase
          .from('empresas_modulos')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .eq('ativo', true);

        setStats({
          totalUsuarios: usuariosCount || 0,
          totalClientes: clientesCount || 0,
          totalModulosAtivos: modulosCount || 0,
        });
      } catch (error) {
        console.error('Erro ao buscar informações da empresa:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresaInfo();
  }, [empresaId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!empresaInfo) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Empresa não encontrada
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perfil da Empresa</h1>
        <p className="text-muted-foreground">Informações gerais e estatísticas da empresa</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
            <p className="text-xs text-muted-foreground">usuários cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground">clientes ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalModulosAtivos}</div>
            <p className="text-xs text-muted-foreground">módulos contratados</p>
          </CardContent>
        </Card>
      </div>

      {/* Informações da Empresa */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{empresaInfo.nome}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline">{empresaInfo.tipo === 'sst' ? 'Empresa SST' : empresaInfo.tipo}</Badge>
                {empresaInfo.cnpj && <span>CNPJ: {empresaInfo.cnpj}</span>}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {empresaInfo.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{empresaInfo.email}</span>
              </div>
            )}
            {empresaInfo.telefone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{empresaInfo.telefone}</span>
              </div>
            )}
            {(empresaInfo.endereco || empresaInfo.cidade || empresaInfo.estado) && (
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {[empresaInfo.endereco, empresaInfo.cidade, empresaInfo.estado, empresaInfo.cep]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Cadastrado em: {new Date(empresaInfo.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
