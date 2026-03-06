import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Building2, 
  Shield, 
  Calendar, 
  Clock, 
  Edit,
  Key,
  UserCircle,
  Briefcase,
  MapPin,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmpresaCompleta {
  id: string;
  nome: string;
  tipo: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

export function ClienteMeuPerfil() {
  const { user, profile, empresa } = useAuth();
  const { toast } = useToast();
  const [empresaCompleta, setEmpresaCompleta] = useState<EmpresaCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [ultimoAcesso, setUltimoAcesso] = useState<string | null>(null);

  useEffect(() => {
    const fetchDados = async () => {
      if (!empresa?.id) {
        setLoading(false);
        return;
      }

      try {
        // Buscar dados completos da empresa
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', empresa.id)
          .single();

        if (empresaError) throw empresaError;
        setEmpresaCompleta(empresaData);

        // Simular último acesso (poderia vir de uma tabela de logs)
        setUltimoAcesso(new Date().toISOString());
      } catch (error: any) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: "Erro ao carregar dados",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [empresa?.id, toast]);

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      'admin_vertical': { label: 'Administrador Toriq', color: 'bg-primary/10 text-primary' },
      'empresa_sst': { label: 'Empresa SST', color: 'bg-primary/10 text-primary' },
      'cliente_final': { label: 'Cliente', color: 'bg-success/10 text-success' },
      'empresa_parceira': { label: 'Empresa Parceira', color: 'bg-warning/10 text-warning' },
      'instrutor': { label: 'Instrutor', color: 'bg-warning/10 text-warning' },
    };
    return roles[role] || { label: role, color: 'bg-muted text-muted-foreground' };
  };

  const getTipoEmpresaLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      'vertical_on': 'Toriq',
      'sst': 'Empresa SST',
      'cliente_final': 'Cliente Final',
      'empresa_parceira': 'Empresa Parceira',
    };
    return tipos[tipo] || tipo;
  };

  const handleAlterarSenha = () => {
    toast({
      title: "Em breve",
      description: "A funcionalidade de alteração de senha estará disponível em breve.",
    });
  };

  const handleEditarPerfil = () => {
    toast({
      title: "Em breve",
      description: "A funcionalidade de edição de perfil estará disponível em breve.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const roleInfo = getRoleLabel(profile?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCircle className="h-7 w-7 text-primary" />
            Meu Perfil
          </h1>
          <p className="text-muted-foreground">Visualize e gerencie suas informações pessoais</p>
        </div>
        <Button variant="outline" onClick={handleEditarPerfil}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Perfil
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usuário</p>
                <p className="font-semibold truncate max-w-[120px]" title={profile?.nome}>
                  {profile?.nome?.split(' ')[0] || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-primary">Empresa</p>
                <p className="font-semibold text-primary truncate max-w-[120px]" title={empresa?.nome}>
                  {empresa?.nome?.split(' ')[0] || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-success">Perfil</p>
                <p className="font-semibold text-success">
                  {getRoleLabel(profile?.role || '').label.split(' ')[0]}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-lg">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-warning">Último Acesso</p>
                <p className="font-semibold text-warning">
                  {ultimoAcesso ? format(new Date(ultimoAcesso), 'dd/MM', { locale: ptBR }) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Informações do Usuário */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {profile?.nome ? getInitials(profile.nome) : <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{profile?.nome || 'Usuário'}</CardTitle>
                  <CardDescription>{profile?.email}</CardDescription>
                </div>
              </div>
              <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Nome Completo</p>
                  <p className="font-medium">{profile?.nome || 'Não informado'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="font-medium">{profile?.email || user?.email || 'Não informado'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Acesso</p>
                  <p className="font-medium">{roleInfo.label}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Membro desde</p>
                  <p className="font-medium">
                    {user?.created_at 
                      ? format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : 'Não disponível'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <Button variant="outline" className="w-full" onClick={handleAlterarSenha}>
              <Key className="h-4 w-4 mr-2" />
              Alterar Senha
            </Button>
          </CardContent>
        </Card>

        {/* Informações da Empresa */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Empresa Vinculada</CardTitle>
            </div>
            <CardDescription>Informações da empresa que você está vinculado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {empresaCompleta ? (
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nome da Empresa</p>
                    <p className="font-medium">{empresaCompleta.nome}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <Badge variant="secondary">{getTipoEmpresaLabel(empresaCompleta.tipo)}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">CNPJ</p>
                    <p className="font-medium">{empresaCompleta.cnpj || 'Não informado'}</p>
                  </div>
                </div>

                {empresaCompleta.email && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail da Empresa</p>
                      <p className="font-medium">{empresaCompleta.email}</p>
                    </div>
                  </div>
                )}

                {empresaCompleta.telefone && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{empresaCompleta.telefone}</p>
                    </div>
                  </div>
                )}

                {(empresaCompleta.cidade || empresaCompleta.estado) && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Localização</p>
                      <p className="font-medium">
                        {[empresaCompleta.cidade, empresaCompleta.estado].filter(Boolean).join(' - ')}
                      </p>
                    </div>
                  </div>
                )}

                {empresaCompleta.endereco && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Endereço Completo</p>
                      <p className="font-medium text-sm">
                        {[
                          empresaCompleta.endereco,
                          empresaCompleta.numero,
                          empresaCompleta.bairro,
                          empresaCompleta.cidade,
                          empresaCompleta.estado,
                          empresaCompleta.cep
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Você não está vinculado a nenhuma empresa.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Entre em contato com o administrador para vincular sua conta.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informações de Segurança */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Segurança da Conta</CardTitle>
          </div>
          <CardDescription>Informações sobre a segurança da sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-success/10 rounded-full">
                <Mail className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium">E-mail Verificado</p>
                <p className="text-sm text-muted-foreground">
                  {user?.email_confirmed_at ? 'Sim' : 'Pendente'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Autenticação</p>
                <p className="text-sm text-muted-foreground">E-mail e Senha</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-warning/10 rounded-full">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium">Última Atualização</p>
                <p className="text-sm text-muted-foreground">
                  {user?.updated_at 
                    ? format(new Date(user.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
