import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  X, 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Users, 
  Shield, 
  Package,
  Loader2,
  UserPlus,
  Trash2,
  ChevronRight,
  Check,
  Settings,
  FolderPlus,
  User,
  Briefcase,
  CheckSquare,
  TrendingUp,
  FileSignature,
  ClipboardList,
  DollarSign,
  Wrench,
  Megaphone,
  HardHat,
  Receipt,
  Wallet,
  FileText,
  GraduationCap,
  CalendarDays,
  FileCheck,
  BookOpen,
  Grid3X3,
  ListChecks,
  UserCheck,
  Heart
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MODULOS_CONFIG, getModuloByNome, type TelaMódulo, type ModuloConfig } from '@/config/modulosTelas';

interface Empresa {
  id: string;
  nome: string;
  tipo: string;
  cnpj: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  created_at?: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: string;
  created_at: string;
}

interface Modulo {
  id: string;
  nome: string;
}

interface EmpresaModulo {
  modulo_id: string;
  ativo: boolean;
}

interface EmpresaModuloTela {
  modulo_id: string;
  tela_id: string;
  ativo: boolean;
}

interface Cliente {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
}

interface EmpresaDetalheProps {
  empresa: Empresa;
  onClose: () => void;
  onUpdate: () => void;
}

// Mapeamento de ícones
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'Building2': Building2,
  'User': User,
  'Settings': Settings,
  'FolderPlus': FolderPlus,
  'Briefcase': Briefcase,
  'CheckSquare': CheckSquare,
  'TrendingUp': TrendingUp,
  'FileSignature': FileSignature,
  'ClipboardList': ClipboardList,
  'DollarSign': DollarSign,
  'Wrench': Wrench,
  'Megaphone': Megaphone,
  'HardHat': HardHat,
  'Receipt': Receipt,
  'Wallet': Wallet,
  'FileText': FileText,
  'GraduationCap': GraduationCap,
  'CalendarDays': CalendarDays,
  'FileCheck': FileCheck,
  'BookOpen': BookOpen,
  'Grid3X3': Grid3X3,
  'Users': Users,
  'ListChecks': ListChecks,
  'UserCheck': UserCheck,
  'Building': Building2,
  'Heart': Heart,
  'Package': Package,
};

const getIcon = (iconName: string) => {
  return iconMap[iconName] || Package;
};

export function EmpresaDetalhe({ empresa, onClose, onUpdate }: EmpresaDetalheProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  // Módulos do banco de dados (com UUIDs reais)
  const [modulosDoBanco, setModulosDoBanco] = useState<Modulo[]>([]);
  // Mapa de módulos ativos: UUID do banco -> ativo
  const [modulosAtivosMap, setModulosAtivosMap] = useState<Record<string, boolean>>({});
  const [empresaModulosTelas, setEmpresaModulosTelas] = useState<EmpresaModuloTela[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  
  // Estado para o dialog de seleção de telas
  const [telasDialogOpen, setTelasDialogOpen] = useState(false);
  const [moduloSelecionado, setModuloSelecionado] = useState<{ dbModulo: Modulo; config: ModuloConfig } | null>(null);
  const [telasSelecionadas, setTelasSelecionadas] = useState<string[]>([]);
  const [savingTelas, setSavingTelas] = useState(false);

  useEffect(() => {
    fetchData();
  }, [empresa.id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsuarios(),
      fetchClientes(),
      fetchModulosDoBanco(),
      fetchModulosAtivos(),
      fetchEmpresaModulosTelas()
    ]);
    setLoading(false);
  };

  const fetchUsuarios = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, role, created_at')
      .eq('empresa_id', empresa.id)
      .order('nome');

    if (!error && data) {
      setUsuarios(data);
    }
  };

  const fetchClientes = async () => {
    if (empresa.tipo !== 'sst') return;
    
    const { data, error } = await supabase
      .from('clientes_sst')
      .select('id, nome, cnpj, email')
      .eq('empresa_sst_id', empresa.id)
      .order('nome');

    if (!error && data) {
      setClientes(data);
    }
  };

  // Buscar módulos do banco de dados (UUIDs reais)
  const fetchModulosDoBanco = async () => {
    const { data, error } = await supabase
      .from('modulos')
      .select('id, nome')
      .order('nome');

    if (!error && data) {
      setModulosDoBanco(data);
    }
  };

  // Carregar módulos ativos da empresa (usa o UUID do módulo como chave)
  const fetchModulosAtivos = async () => {
    const { data, error } = await supabase
      .from('empresas_modulos')
      .select('modulo_id, ativo')
      .eq('empresa_id', empresa.id);

    if (!error && data) {
      const ativos: Record<string, boolean> = {};
      data.forEach(em => {
        ativos[em.modulo_id] = em.ativo;
      });
      setModulosAtivosMap(ativos);
    }
  };

  const fetchEmpresaModulosTelas = async () => {
    const { data, error } = await (supabase as any)
      .from('empresas_modulos_telas')
      .select('modulo_id, tela_id, ativo')
      .eq('empresa_id', empresa.id);

    if (!error && data) {
      setEmpresaModulosTelas(data);
    }
  };

  // Obter módulo do banco pelo nome
  const getModuloDoBancoPorNome = (nome: string): Modulo | undefined => {
    return modulosDoBanco.find(m => m.nome === nome);
  };

  // Abrir dialog de seleção de telas ao clicar no módulo
  const handleModuloClick = (config: ModuloConfig, dbModulo: Modulo) => {
    setModuloSelecionado({ dbModulo, config });
    
    // Carregar telas já selecionadas para este módulo (usando UUID do banco)
    const telasDoModulo = empresaModulosTelas
      .filter(t => t.modulo_id === dbModulo.id && t.ativo)
      .map(t => t.tela_id);
    
    // Se não tem telas configuradas mas o módulo está ativo, selecionar todas por padrão
    if (telasDoModulo.length === 0 && isModuloAtivo(dbModulo.id)) {
      const todasTelas: string[] = [];
      config.telas.forEach(tela => {
        todasTelas.push(tela.id);
        if (tela.subTelas) {
          tela.subTelas.forEach(sub => todasTelas.push(sub.id));
        }
      });
      setTelasSelecionadas(todasTelas);
    } else {
      setTelasSelecionadas(telasDoModulo);
    }
    
    setTelasDialogOpen(true);
  };

  // Toggle de tela individual
  const toggleTela = (telaId: string) => {
    setTelasSelecionadas(prev => {
      if (prev.includes(telaId)) {
        return prev.filter(id => id !== telaId);
      }
      return [...prev, telaId];
    });
  };

  // Selecionar/deselecionar todas as telas
  const toggleTodasTelas = () => {
    if (!moduloSelecionado) return;
    
    const todasTelas: string[] = [];
    moduloSelecionado.config.telas.forEach(tela => {
      todasTelas.push(tela.id);
      if (tela.subTelas) {
        tela.subTelas.forEach(sub => todasTelas.push(sub.id));
      }
    });
    
    if (telasSelecionadas.length === todasTelas.length) {
      setTelasSelecionadas([]);
    } else {
      setTelasSelecionadas(todasTelas);
    }
  };

  // Salvar telas selecionadas
  const saveTelasModulo = async () => {
    if (!moduloSelecionado) return;
    
    const { dbModulo } = moduloSelecionado;
    
    setSavingTelas(true);
    
    try {
      // Deletar telas existentes deste módulo para esta empresa
      await (supabase as any)
        .from('empresas_modulos_telas')
        .delete()
        .eq('empresa_id', empresa.id)
        .eq('modulo_id', dbModulo.id);
      
      // Se tem telas selecionadas, inserir e ativar o módulo
      if (telasSelecionadas.length > 0) {
        // Inserir telas selecionadas
        const telasParaInserir = telasSelecionadas.map(telaId => ({
          empresa_id: empresa.id,
          modulo_id: dbModulo.id,
          tela_id: telaId,
          ativo: true
        }));
        
        const { error: telasError } = await (supabase as any)
          .from('empresas_modulos_telas')
          .insert(telasParaInserir);
        
        if (telasError) throw telasError;
        
        // Garantir que o módulo está ativo
        if (!isModuloAtivo(dbModulo.id)) {
          setModulosAtivosMap(prev => ({ ...prev, [dbModulo.id]: true }));
        }
      } else {
        // Se não tem telas, desativar o módulo
        setModulosAtivosMap(prev => ({ ...prev, [dbModulo.id]: false }));
      }
      
      // Recarregar dados
      await fetchEmpresaModulosTelas();
      
      toast.success('Permissões de telas atualizadas!');
      setTelasDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar telas:', error);
      toast.error('Erro ao salvar permissões de telas');
    } finally {
      setSavingTelas(false);
    }
  };

  // Contar telas ativas de um módulo (apenas telas que existem no MODULOS_CONFIG)
  const contarTelasAtivas = (moduloId: string, config: ModuloConfig): number => {
    // Obter lista de IDs de telas válidas do config
    const telasValidas: string[] = [];
    config.telas.forEach(tela => {
      telasValidas.push(tela.id);
      if (tela.subTelas) {
        tela.subTelas.forEach(sub => telasValidas.push(sub.id));
      }
    });
    
    // Contar apenas telas ativas que existem no config
    return empresaModulosTelas.filter(t => 
      t.modulo_id === moduloId && 
      t.ativo && 
      telasValidas.includes(t.tela_id)
    ).length;
  };

  const isModuloAtivo = (moduloId: string) => {
    return modulosAtivosMap[moduloId] ?? false;
  };

  const toggleModulo = async (moduloId: string) => {
    const novoEstado = !modulosAtivosMap[moduloId];
    
    // Atualizar estado local imediatamente
    setModulosAtivosMap(prev => ({
      ...prev,
      [moduloId]: novoEstado
    }));

    // Salvar no banco automaticamente
    try {
      if (novoEstado) {
        // Ativar módulo - inserir ou atualizar
        const { error } = await supabase
          .from('empresas_modulos')
          .upsert({
            empresa_id: empresa.id,
            modulo_id: moduloId,
            ativo: true
          }, { onConflict: 'empresa_id,modulo_id' });
        
        if (error) throw error;

        // Buscar configuração do módulo para inserir todas as telas como ativas
        const dbModulo = modulosDoBanco.find(m => m.id === moduloId);
        if (dbModulo) {
          const configModulo = MODULOS_CONFIG.find(c => c.nome === dbModulo.nome);
          if (configModulo) {
            // Coletar todas as telas do módulo (incluindo subtelas)
            const todasTelas: string[] = [];
            configModulo.telas.forEach(tela => {
              todasTelas.push(tela.id);
              if (tela.subTelas) {
                tela.subTelas.forEach(sub => todasTelas.push(sub.id));
              }
            });

            // Inserir todas as telas como ativas (upsert para evitar duplicatas)
            if (todasTelas.length > 0) {
              const telasParaInserir = todasTelas.map(telaId => ({
                empresa_id: empresa.id,
                modulo_id: moduloId,
                tela_id: telaId,
                ativo: true
              }));

              await (supabase as any)
                .from('empresas_modulos_telas')
                .upsert(telasParaInserir, { onConflict: 'empresa_id,modulo_id,tela_id' });
            }
          }
        }

        toast.success('Módulo ativado com todas as telas!');
      } else {
        // Desativar módulo - remover da tabela
        const { error } = await supabase
          .from('empresas_modulos')
          .delete()
          .eq('empresa_id', empresa.id)
          .eq('modulo_id', moduloId);
        
        if (error) throw error;

        // Também desativar todas as telas deste módulo
        await (supabase as any)
          .from('empresas_modulos_telas')
          .delete()
          .eq('empresa_id', empresa.id)
          .eq('modulo_id', moduloId);

        toast.success('Módulo desativado!');
      }
      
      // Recarregar telas da empresa
      await fetchEmpresaModulosTelas();
      onUpdate();
    } catch (error) {
      console.error('Erro ao alternar módulo:', error);
      // Reverter estado local em caso de erro
      setModulosAtivosMap(prev => ({
        ...prev,
        [moduloId]: !novoEstado
      }));
      toast.error('Erro ao salvar alteração do módulo');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeletingUser(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      toast.success('Usuário removido com sucesso!');
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
      fetchUsuarios();
    } catch (error: any) {
      toast.error('Erro ao remover usuário: ' + error.message);
    } finally {
      setDeletingUser(false);
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'sst':
        return <Badge variant="default">SST</Badge>;
      case 'vertical_on':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Toriq</Badge>;
      case 'empresa_parceira':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Empresa Parceira</Badge>;
      default:
        return <Badge variant="secondary">Cliente Final</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin_vertical':
        return <Badge className="bg-purple-500">Admin Toriq</Badge>;
      case 'empresa_sst':
        return <Badge variant="default">SST</Badge>;
      case 'empresa_parceira':
        return <Badge className="bg-orange-500">Parceira</Badge>;
      default:
        return <Badge variant="secondary">Cliente</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getEnderecoCompleto = () => {
    const parts = [];
    if (empresa.endereco) parts.push(empresa.endereco);
    if (empresa.numero) parts.push(empresa.numero);
    if (empresa.complemento) parts.push(empresa.complemento);
    
    const linha1 = parts.join(', ');
    
    const parts2 = [];
    if (empresa.bairro) parts2.push(empresa.bairro);
    if (empresa.cidade && empresa.estado) {
      parts2.push(`${empresa.cidade}/${empresa.estado}`);
    }
    if (empresa.cep) parts2.push(`CEP: ${empresa.cep}`);
    
    const linha2 = parts2.join(' - ');
    
    return { linha1, linha2 };
  };

  const endereco = getEnderecoCompleto();

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-4 md:inset-8 lg:inset-12 z-50 bg-background border rounded-lg shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">{empresa.nome}</h2>
              <p className="text-sm text-muted-foreground">CNPJ: {empresa.cnpj || 'Não informado'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getTipoBadge(empresa.tipo)}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content with Tabs */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="visao-geral" className="w-full">
              <TabsList className="w-full justify-start mb-4 bg-muted/50">
                <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
                <TabsTrigger value="usuarios">Usuários</TabsTrigger>
                <TabsTrigger value="modulos">Módulos</TabsTrigger>
              </TabsList>

              {/* Visão Geral */}
              <TabsContent value="visao-geral" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações da Empresa */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Informações da Empresa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {empresa.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{empresa.email}</span>
                        </div>
                      )}
                      {empresa.telefone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{empresa.telefone}</span>
                        </div>
                      )}
                      {empresa.created_at && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Cadastro: {formatDate(empresa.created_at)}</span>
                        </div>
                      )}
                      
                      {(endereco.linha1 || endereco.linha2) && (
                        <>
                          <Separator className="my-2" />
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              {endereco.linha1 && <p>{endereco.linha1}</p>}
                              {endereco.linha2 && <p className="text-muted-foreground">{endereco.linha2}</p>}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Estatísticas */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">📊 Estatísticas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                            <Users className="h-4 w-4" />
                            Usuários
                          </div>
                          <p className="text-2xl font-bold">{usuarios.length}</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                            <Shield className="h-4 w-4" />
                            Admins
                          </div>
                          <p className="text-2xl font-bold">
                            {usuarios.filter(u => u.role === 'admin_vertical' || u.role === 'empresa_sst').length}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                            <Package className="h-4 w-4" />
                            Módulos
                          </div>
                          <p className="text-2xl font-bold">
                            {Object.values(modulosAtivosMap).filter(Boolean).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Atividade Recente */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Atividade Recente</CardTitle>
                    <p className="text-sm text-muted-foreground">Últimas movimentações na empresa</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma atividade registrada ainda
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Usuários */}
              <TabsContent value="usuarios">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Usuários ({usuarios.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {usuarios.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum usuário cadastrado para esta empresa
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Perfil</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usuarios.map((usuario) => (
                            <TableRow key={usuario.id}>
                              <TableCell className="font-medium">{usuario.nome}</TableCell>
                              <TableCell>{usuario.email}</TableCell>
                              <TableCell>{getRoleBadge(usuario.role)}</TableCell>
                              <TableCell>{formatDate(usuario.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setUserToDelete(usuario);
                                    setDeleteUserDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Módulos */}
              <TabsContent value="modulos">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Módulos Disponíveis
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ative ou desative módulos e configure quais telas a empresa terá acesso
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {MODULOS_CONFIG.filter(m => m.id !== 'perfil_empresa').map((config) => {
                        // Buscar módulo correspondente no banco de dados
                        const dbModulo = getModuloDoBancoPorNome(config.nome);
                        if (!dbModulo) return null; // Módulo não existe no banco
                        
                        const totalTelas = config.telas.reduce((acc, t) => acc + 1 + (t.subTelas?.length || 0), 0);
                        const telasAtivas = contarTelasAtivas(dbModulo.id, config);
                        const ativo = isModuloAtivo(dbModulo.id);
                        
                        return (
                          <div 
                            key={dbModulo.id} 
                            className={`border rounded-lg transition-all ${ativo ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20 opacity-75'}`}
                          >
                            {/* Header do módulo com toggle */}
                            <div className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-lg ${ativo ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                  {(() => {
                                    const IconComponent = getIcon(config.icone);
                                    return <IconComponent className="h-5 w-5" />;
                                  })()}
                                </div>
                                <div>
                                  <p className={`font-semibold ${ativo ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {config.nome}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {ativo 
                                      ? (telasAtivas > 0 ? `${telasAtivas} de ${totalTelas} telas liberadas` : 'Todas as telas liberadas')
                                      : 'Módulo desativado - sem acesso'
                                    }
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {/* Badge de status */}
                                {ativo ? (
                                  <Badge variant="default" className="bg-green-500/15 text-green-600 border-green-300 hover:bg-green-500/20">
                                    <Check className="h-3 w-3 mr-1" />
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                    Inativo
                                  </Badge>
                                )}
                                
                                {/* Toggle rápido */}
                                <Switch
                                  checked={ativo}
                                  onCheckedChange={() => toggleModulo(dbModulo.id)}
                                  className="data-[state=checked]:bg-primary"
                                />
                              </div>
                            </div>
                            
                            {/* Área de configuração de telas - só aparece se ativo */}
                            {ativo && (
                              <div className="px-4 pb-4 pt-0">
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Settings className="h-4 w-4" />
                                    <span>
                                      {telasAtivas > 0 
                                        ? `${telasAtivas} tela(s) selecionada(s)` 
                                        : 'Nenhuma restrição - todas as telas visíveis'
                                      }
                                    </span>
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleModuloClick(config, dbModulo)}
                                    className="gap-2"
                                  >
                                    <Settings className="h-4 w-4" />
                                    Configurar Telas
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {MODULOS_CONFIG.filter(m => m.id !== 'perfil_empresa').length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Nenhum módulo disponível
                        </p>
                      )}
                    </div>
                    
                    <Separator className="my-6" />
                    
                    <div className="flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        As alterações são salvas automaticamente ao ativar/desativar módulos
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário <strong>{userToDelete?.nome}</strong>?
              <br /><br />
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              disabled={deletingUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Seleção de Telas do Módulo */}
      <Dialog open={telasDialogOpen} onOpenChange={setTelasDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {moduloSelecionado && (() => {
                const IconComponent = getIcon(moduloSelecionado.config.icone);
                return <IconComponent className="h-5 w-5 text-primary" />;
              })()}
              {moduloSelecionado?.config.nome}
            </DialogTitle>
            <DialogDescription>
              Selecione as telas que esta empresa terá acesso dentro deste módulo.
              Usuários da empresa só verão as telas selecionadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-between py-2 border-b flex-shrink-0">
            <p className="text-sm text-muted-foreground">
              {telasSelecionadas.length} tela(s) selecionada(s)
            </p>
            <Button variant="outline" size="sm" onClick={toggleTodasTelas}>
              {moduloSelecionado && telasSelecionadas.length === moduloSelecionado.config.telas.reduce((acc, t) => acc + 1 + (t.subTelas?.length || 0), 0) 
                ? 'Desmarcar Todas' 
                : 'Selecionar Todas'}
            </Button>
          </div>
          
          <div className="flex-1 min-h-0 overflow-y-auto pr-4">
            <div className="space-y-2 py-2">
              {moduloSelecionado?.config.telas.map((tela) => {
                const IconComponent = getIcon(tela.icone);
                const temSubTelas = tela.subTelas && tela.subTelas.length > 0;
                
                return (
                  <div key={tela.id}>
                    {/* Tela principal */}
                    <div 
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${telasSelecionadas.includes(tela.id) ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
                      onClick={() => toggleTela(tela.id)}
                    >
                      <Checkbox 
                        checked={telasSelecionadas.includes(tela.id)}
                        onCheckedChange={() => toggleTela(tela.id)}
                      />
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{tela.nome}</p>
                        {tela.descricao && (
                          <p className="text-xs text-muted-foreground">{tela.descricao}</p>
                        )}
                      </div>
                      {telasSelecionadas.includes(tela.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    
                    {/* Sub-telas */}
                    {temSubTelas && (
                      <div className="ml-6 mt-1 space-y-1">
                        {tela.subTelas?.map((subTela) => {
                          const SubIconComponent = getIcon(subTela.icone);
                          return (
                            <div 
                              key={subTela.id}
                              className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${telasSelecionadas.includes(subTela.id) ? 'border-primary/50 bg-primary/5' : 'border-border/50'}`}
                              onClick={() => toggleTela(subTela.id)}
                            >
                              <Checkbox 
                                checked={telasSelecionadas.includes(subTela.id)}
                                onCheckedChange={() => toggleTela(subTela.id)}
                              />
                              <SubIconComponent className="h-3 w-3 text-muted-foreground" />
                              <p className="text-xs font-medium flex-1">{subTela.nome}</p>
                              {telasSelecionadas.includes(subTela.id) && (
                                <Check className="h-3 w-3 text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4 flex-shrink-0">
            <Button variant="outline" onClick={() => setTelasDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveTelasModulo} disabled={savingTelas}>
              {savingTelas && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
