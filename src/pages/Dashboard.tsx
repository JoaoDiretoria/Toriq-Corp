import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  LogOut,
  Settings,
  Building2,
  User,
  Plus,
  FileText,
  GraduationCap,
  BarChart3,
  Calendar,
  Bell,
  Package,
} from 'lucide-react';

interface Modulo {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string;
  rota: string;
}

const iconMap: Record<string, React.ElementType> = {
  FileText,
  GraduationCap,
  BarChart3,
  Calendar,
  Bell,
  Package,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, empresa, loading, signOut } = useAuth();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    // Redirect admin_vertical to admin dashboard
    if (!loading && profile?.role === 'admin_vertical') {
      navigate('/admin');
    }
    // Redirect empresa_sst to SST dashboard
    if (!loading && profile?.role === 'empresa_sst') {
      navigate('/sst');
    }
    // Redirect cliente_final to cliente dashboard
    if (!loading && profile?.role === 'cliente_final') {
      navigate('/cliente');
    }
    // Redirect empresa_parceira to parceira dashboard
    if (!loading && profile?.role === 'empresa_parceira') {
      navigate('/parceira');
    }
    // Redirect instrutor to instrutor dashboard
    if (!loading && (profile?.role as string) === 'instrutor') {
      navigate('/instrutor');
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    const fetchModulos = async () => {
      if (!profile?.empresa_id) {
        setLoadingModulos(false);
        return;
      }

      const { data, error } = await supabase
        .from('empresas_modulos')
        .select(`
          modulo_id,
          modulos (
            id,
            nome,
            descricao,
            icone,
            rota
          )
        `)
        .eq('empresa_id', profile.empresa_id)
        .eq('ativo', true);

      if (error) {
        console.error('Erro ao buscar módulos:', error);
        toast.error('Erro ao carregar módulos');
      } else if (data) {
        const modulosData = data
          .map((item: any) => item.modulos)
          .filter(Boolean) as Modulo[];
        setModulos(modulosData);
      }

      setLoadingModulos(false);
    };

    if (profile) {
      fetchModulos();
    }
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/auth');
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-card-foreground">Portal de Módulos</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {empresa && (
              <div className="hidden md:flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5">
                <Building2 className="h-4 w-4 text-accent-foreground" />
                <span className="text-sm font-medium text-accent-foreground">{empresa.nome}</span>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile?.nome ? getInitials(profile.nome) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.nome}</p>
                    <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Módulo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Olá, {profile?.nome?.split(' ')[0]}! 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            {empresa
              ? `Gerencie os módulos ativos da ${empresa.nome}`
              : 'Você ainda não está vinculado a nenhuma empresa'}
          </p>
        </div>

        {/* Mobile Company Badge */}
        {empresa && (
          <div className="mb-6 md:hidden">
            <div className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2">
              <Building2 className="h-4 w-4 text-accent-foreground" />
              <span className="text-sm font-medium text-accent-foreground">{empresa.nome}</span>
            </div>
          </div>
        )}

        {/* Modules Grid */}
        {loadingModulos ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border">
                <CardHeader>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <Skeleton className="h-6 w-3/4 mt-4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : modulos.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo) => {
              const IconComponent = iconMap[modulo.icone] || Package;
              return (
                <Link key={modulo.id} to={modulo.rota}>
                  <Card className="group cursor-pointer border-border transition-all duration-300 hover:border-primary hover:shadow-lg hover:-translate-y-1">
                    <CardHeader>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <CardTitle className="mt-4 text-card-foreground group-hover:text-primary transition-colors">
                        {modulo.nome}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {modulo.descricao || 'Sem descrição disponível'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="border-border border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                Nenhum módulo disponível
              </h3>
              <p className="mt-2 text-center text-muted-foreground max-w-sm">
                {empresa
                  ? 'Sua empresa ainda não possui módulos ativos. Entre em contato com o administrador.'
                  : 'Você precisa estar vinculado a uma empresa para ver os módulos.'}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
