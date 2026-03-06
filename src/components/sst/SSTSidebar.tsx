import React, { useState, useEffect } from 'react';
import { Users, LogOut, Package, Shield, Heart, GraduationCap, Building2, FileText, BookOpen, Grid3X3, UserCheck, Building, ChevronDown, Settings, User, Building as BuildingIcon, UsersRound, ClipboardList, CalendarDays, FileCheck, ListChecks, FileType, Briefcase, TrendingUp, DollarSign, Wrench, Megaphone, GitBranch, CheckSquare, FileSignature, HardHat, FolderPlus, Receipt, Wallet, Car, Eye, Headphones, LayoutDashboard, PanelLeftClose, PanelLeft, Search } from 'lucide-react';
import { NotificationPopover } from '@/components/shared/notifications';
import { QuickSearch, useQuickSearch, TelaItem } from '@/components/shared/QuickSearch';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useToast } from '@/hooks/use-toast';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useModulosAtivos } from '@/hooks/useModulosAtivos';
import { useEmpresaWhiteLabel } from '@/hooks/useWhiteLabel';
import { supabase } from '@/integrations/supabase/client';
import LogoPretaHorizontal from '/logo/logo-preta.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Modulo {
  id: string;
  nome: string;
  icone: string | null;
  rota: string;
}

interface SSTSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  modulosAtivos: Modulo[];
  loadingModulos: boolean;
}

// Mapeamento de ícones por nome
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'Shield': Shield,
  'Heart': Heart,
  'GraduationCap': GraduationCap,
  'Building2': Building2,
  'Package': Package,
};

const getIcon = (iconName: string | null) => {
  if (!iconName) return Package;
  return iconMap[iconName] || Package;
};

interface Funil {
  id: string;
  nome: string;
  setor_id: string;
  tipo: 'negocio' | 'fluxo_trabalho';
}

interface Setor {
  id: string;
  nome: string;
}

// Mapeamento de setores para suas seções
const SETOR_SECTION_MAP: Record<string, string> = {
  'Financeiro': 'toriq-corp-financeiro',
};

// Setores fixos que já têm páginas dedicadas (apenas Financeiro)
const SETORES_FIXOS = ['Financeiro'];

export function SSTSidebar({ activeSection, onSectionChange, modulosAtivos, loadingModulos }: SSTSidebarProps) {
  const { profile, empresa, signOut } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || empresa?.id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { podeVisualizar, moduloVisivel, telaLiberada, isAdmin, loading: loadingPermissoes, permissoes } = usePermissoes();
  const { isModuloAtivo, loading: loadingModulosGlobal } = useModulosAtivos();
  const { config: whiteLabelConfig } = useEmpresaWhiteLabel(empresaId);
  const quickSearch = useQuickSearch();

  const [funis, setFunis] = useState<Funil[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);

  // Debug: verificar permissões carregadas
  useEffect(() => {
    if (!loadingPermissoes) {
      console.log('[Sidebar] profile.setor_id:', profile?.setor_id, 'grupo_acesso:', profile?.grupo_acesso);
      console.log('[Sidebar] isAdmin:', isAdmin, 'permissoes:', permissoes?.length);
      console.log('[Sidebar] podeVisualizar toriq-corp-setores:', podeVisualizar('toriq-corp-setores'));
    }
  }, [loadingPermissoes, profile, isAdmin, permissoes, podeVisualizar]);

  useEffect(() => {
    if (empresaId) {
      loadFunisESetores();
    }
  }, [empresaId]);

  // Recarregar setores quando sair das configurações (pode ter excluído/editado setores)
  useEffect(() => {
    if (empresaId && activeSection !== 'configuracoes' && activeSection !== 'toriq-corp-configuracoes') {
      loadFunisESetores();
    }
  }, [activeSection, empresaId]);

  // Listener para atualizar sidebar quando setores são criados/excluídos
  useEffect(() => {
    const handleSetoresUpdate = () => {
      if (empresaId) {
        loadFunisESetores();
      }
    };

    window.addEventListener('setores-updated', handleSetoresUpdate);
    return () => window.removeEventListener('setores-updated', handleSetoresUpdate);
  }, [empresaId]);

  const loadFunisESetores = async () => {
    try {
      const [funisRes, setoresRes] = await Promise.all([
        (supabase as any)
          .from('funis')
          .select('id, nome, setor_id, tipo')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('ordem'),
        (supabase as any)
          .from('setores')
          .select('id, nome')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('nome')
      ]);

      if (funisRes.data) setFunis(funisRes.data);
      if (setoresRes.data) setSetores(setoresRes.data);
    } catch (error) {
      console.error('Erro ao carregar funis e setores:', error);
    }
  };

  const getFunisPorSetor = (setorId: string) => {
    return funis.filter(f => f.setor_id === setorId);
  };

  const getSetorByNome = (nome: string) => {
    return setores.find(s => s.nome.toLowerCase() === nome.toLowerCase());
  };

  // Obter todos os setores exceto Financeiro (que tem página dedicada)
  const getSetoresDinamicos = () => {
    return setores.filter(s => s.nome.toLowerCase() !== 'financeiro');
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate('/auth');
  };

  // Mapeamento de nomes de módulos da tabela para IDs usados no código
  const MODULO_NOME_PARA_ID: Record<string, string> = {
    'Toriq Training': 'toriq_train',
    'Gestão de Treinamentos': 'toriq_train',
    'Toriq Corp': 'toriq_corp',
    'Toriq EPI': 'gestao_epi',
    'Gestão de EPI': 'gestao_epi',
    'Toriq EPI - Gestão Completa': 'gestao_epi',
    'Saúde Ocupacional': 'saude_ocupacional',
    'Gestão de Terceiros': 'gestao_terceiros',
    'Gestão de Documentos': 'gestao_documentos',
  };

  // Verifica se o módulo está contratado pela empresa (usa estado global com realtime)
  const moduloContratado = (moduloId: string): boolean => {
    // Perfil da empresa é sempre visível
    if (moduloId === 'perfil_empresa') return true;
    
    // Usa o estado global que tem realtime subscription
    return isModuloAtivo(moduloId);
  };

  // Combina verificação de módulo contratado + permissões do usuário
  const moduloVisivelEContratado = (moduloId: string): boolean => {
    return moduloContratado(moduloId) && moduloVisivel(moduloId);
  };

  // Verifica se uma tela específica está visível (liberada para empresa + permissões do usuário)
  const telaVisivel = (telaId: string): boolean => {
    return telaLiberada(telaId) && podeVisualizar(telaId);
  };

  // Verifica se o módulo tem pelo menos uma tela visível
  // Para admin, sempre retorna true (tem acesso a todas as telas)
  const moduloTemTelasVisiveis = (telasDoModulo: string[]): boolean => {
    if (isAdmin) return true;
    return telasDoModulo.some(telaId => telaVisivel(telaId));
  };

  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Aguardar carregamento das permissões e módulos antes de renderizar o menu
  const isLoading = loadingPermissoes || loadingModulosGlobal;

  // Gerar lista de telas para o QuickSearch
  const getQuickSearchTelas = (): TelaItem[] => {
    const telas: TelaItem[] = [];
    
    // Perfil da Empresa
    if (moduloVisivelEContratado('perfil_empresa')) {
      telas.push({ id: 'dashboard-geral', nome: 'Dashboard Geral', icone: 'TrendingUp', categoria: 'Perfil da Empresa' });
      if (telaVisivel('meu-perfil')) telas.push({ id: 'meu-perfil', nome: 'Meu Perfil', icone: 'User', categoria: 'Perfil da Empresa' });
      if (telaVisivel('cadastros')) telas.push({ id: 'cadastros', nome: 'Cadastro', icone: 'FolderPlus', categoria: 'Perfil da Empresa' });
      telas.push({ id: 'suporte', nome: 'Suporte', icone: 'Headphones', categoria: 'Perfil da Empresa' });
    }
    
    // Toriq Corp
    if (moduloVisivelEContratado('toriq_corp')) {
      telas.push({ id: 'toriq-corp-dashboard', nome: 'Dashboard Corp', icone: 'TrendingUp', categoria: 'Toriq Corp' });
      if (telaVisivel('toriq-corp-tarefas')) telas.push({ id: 'toriq-corp-tarefas', nome: 'Tarefas', icone: 'CheckSquare', categoria: 'Toriq Corp' });
      if (telaVisivel('toriq-corp-contratos')) telas.push({ id: 'toriq-corp-contratos', nome: 'Contratos', icone: 'FileSignature', categoria: 'Toriq Corp' });
      if (telaVisivel('toriq-corp-setores')) telas.push({ id: 'toriq-corp-setores', nome: 'Setores', icone: 'Building', categoria: 'Toriq Corp' });
      if (telaVisivel('toriq-corp-financeiro')) {
        telas.push({ id: 'toriq-corp-financeiro', nome: 'Financeiro', icone: 'DollarSign', categoria: 'Toriq Corp' });
        telas.push({ id: 'toriq-corp-financeiro-dashboard', nome: 'Dashboard Financeiro', icone: 'TrendingUp', categoria: 'Toriq Corp > Financeiro' });
        telas.push({ id: 'toriq-corp-financeiro-cadastros', nome: 'Cadastros Financeiros', icone: 'ClipboardList', categoria: 'Toriq Corp > Financeiro' });
        telas.push({ id: 'toriq-corp-contas-receber', nome: 'Contas a Receber', icone: 'Receipt', categoria: 'Toriq Corp > Financeiro' });
        telas.push({ id: 'toriq-corp-contas-pagar', nome: 'Contas a Pagar', icone: 'Receipt', categoria: 'Toriq Corp > Financeiro' });
        telas.push({ id: 'toriq-corp-fluxo-caixa', nome: 'Fluxo de Caixa', icone: 'Wallet', categoria: 'Toriq Corp > Financeiro' });
        telas.push({ id: 'toriq-corp-dre', nome: 'DRE', icone: 'FileText', categoria: 'Toriq Corp > Financeiro' });
      }
      if (telaVisivel('toriq-corp-controle-frota')) telas.push({ id: 'toriq-corp-controle-frota', nome: 'Controle da Frota', icone: 'Car', categoria: 'Toriq Corp' });
      if (telaVisivel('toriq-corp-controle-equipamentos')) telas.push({ id: 'toriq-corp-controle-equipamentos', nome: 'Controle de Equipamentos', icone: 'HardHat', categoria: 'Toriq Corp' });
      if (telaVisivel('toriq-corp-configuracoes')) telas.push({ id: 'toriq-corp-configuracoes', nome: 'Configurações Corp', icone: 'Settings', categoria: 'Toriq Corp' });
      
      // Funis dinâmicos por setor
      for (const setor of setores) {
        const funisDoSetor = getFunisPorSetor(setor.id);
        for (const funil of funisDoSetor) {
          telas.push({ 
            id: `funil-${funil.id}`, 
            nome: funil.nome, 
            icone: 'GitBranch', 
            categoria: `Toriq Corp > ${setor.nome}`,
            descricao: funil.tipo === 'negocio' ? 'Funil de Negócio' : 'Fluxo de Trabalho'
          });
        }
      }
    }
    
    // Toriq Training
    if (moduloVisivelEContratado('toriq_train')) {
      telas.push({ id: 'toriq-training-dashboard', nome: 'Dashboard Training', icone: 'TrendingUp', categoria: 'Toriq Training' });
      if (telaVisivel('solicitacoes-treinamentos')) telas.push({ id: 'solicitacoes-treinamentos', nome: 'Solicitação de Treinamento', icone: 'ClipboardList', categoria: 'Toriq Training' });
      if (telaVisivel('agenda-treinamentos')) telas.push({ id: 'agenda-treinamentos', nome: 'Agenda de Treinamentos', icone: 'CalendarDays', categoria: 'Toriq Training' });
      if (telaVisivel('gestao-turmas')) telas.push({ id: 'gestao-turmas', nome: 'Gestão de Turmas', icone: 'FileCheck', categoria: 'Toriq Training' });
      if (telaVisivel('nr')) telas.push({ id: 'nr', nome: 'NR', icone: 'FileText', categoria: 'Toriq Training > Cadastros' });
      if (telaVisivel('catalogo-treinamentos')) telas.push({ id: 'catalogo-treinamentos', nome: 'Treinamentos', icone: 'BookOpen', categoria: 'Toriq Training > Cadastros' });
      if (telaVisivel('matriz-treinamentos')) telas.push({ id: 'matriz-treinamentos', nome: 'Matriz de Treinamentos', icone: 'Grid3X3', categoria: 'Toriq Training > Cadastros' });
      if (telaVisivel('grupos-homogeneos')) telas.push({ id: 'grupos-homogeneos', nome: 'Grupo Homogêneo', icone: 'Users', categoria: 'Toriq Training > Cadastros' });
      if (telaVisivel('declaracao-reorientacao')) telas.push({ id: 'declaracao-reorientacao', nome: 'Declaração de Reorientação', icone: 'FileText', categoria: 'Toriq Training > Cadastros' });
      if (telaVisivel('modelo-relatorio')) telas.push({ id: 'modelo-relatorio', nome: 'Modelo Relatório', icone: 'FileType', categoria: 'Toriq Training > Cadastros' });
      if (telaVisivel('avaliacao-reacao')) telas.push({ id: 'avaliacao-reacao', nome: 'Avaliação de Reação', icone: 'ClipboardList', categoria: 'Toriq Training > Cadastros' });
      if (telaVisivel('provas')) telas.push({ id: 'provas', nome: 'Provas', icone: 'ListChecks', categoria: 'Toriq Training > Cadastros' });
      if (telaVisivel('instrutores')) telas.push({ id: 'instrutores', nome: 'Instrutores', icone: 'UserCheck', categoria: 'Toriq Training > Cadastros' });
      if (telaVisivel('empresas-parceiras')) telas.push({ id: 'empresas-parceiras', nome: 'Empresas Parceiras', icone: 'Building', categoria: 'Toriq Training > Cadastros' });
    }
    
    // Toriq EPI
    if (moduloVisivelEContratado('gestao_epi')) {
      if (telaVisivel('toriq-epi-dashboard')) telas.push({ id: 'toriq-epi-dashboard', nome: 'Dashboard EPI', icone: 'TrendingUp', categoria: 'Toriq EPI' });
      if (telaVisivel('toriq-epi-catalogo')) telas.push({ id: 'toriq-epi-catalogo', nome: 'Cadastro de EPI', icone: 'Package', categoria: 'Toriq EPI' });
      if (telaVisivel('toriq-epi-estoque')) telas.push({ id: 'toriq-epi-estoque', nome: 'Estoque', icone: 'ClipboardList', categoria: 'Toriq EPI' });
      if (telaVisivel('toriq-epi-entregas')) telas.push({ id: 'toriq-epi-entregas', nome: 'Entregas', icone: 'FileCheck', categoria: 'Toriq EPI' });
      if (telaVisivel('toriq-epi-ficha')) telas.push({ id: 'toriq-epi-ficha', nome: 'Ficha de EPI', icone: 'FileText', categoria: 'Toriq EPI' });
      if (telaVisivel('toriq-epi-devolucoes')) telas.push({ id: 'toriq-epi-devolucoes', nome: 'Devoluções', icone: 'UsersRound', categoria: 'Toriq EPI' });
      if (telaVisivel('toriq-epi-relatorios')) telas.push({ id: 'toriq-epi-relatorios', nome: 'Relatórios', icone: 'FileText', categoria: 'Toriq EPI' });
    }
    
    // Configurações - só mostra se o usuário tem acesso à tela de configurações
    if (telaVisivel('configuracoes')) {
      telas.push({ id: 'configuracoes', nome: 'Configurações', icone: 'Settings', categoria: 'Sistema', descricao: 'Todas as configurações' });
      telas.push({ id: 'configuracoes-geral', nome: 'Config: Geral', icone: 'Settings', categoria: 'Configurações', descricao: 'Informações básicas' });
      telas.push({ id: 'configuracoes-notificacoes', nome: 'Config: Notificações', icone: 'Bell', categoria: 'Configurações', descricao: 'Alertas e notificações' });
      telas.push({ id: 'configuracoes-seguranca', nome: 'Config: Segurança', icone: 'Shield', categoria: 'Configurações', descricao: 'Autenticação e segurança' });
      telas.push({ id: 'configuracoes-aparencia', nome: 'Config: Aparência', icone: 'Palette', categoria: 'Configurações', descricao: 'Personalização visual' });
      telas.push({ id: 'configuracoes-integracao', nome: 'Config: Integrações', icone: 'Zap', categoria: 'Configurações', descricao: 'Sistemas externos' });
      telas.push({ id: 'configuracoes-atalhos', nome: 'Config: Atalhos do Sistema', icone: 'Keyboard', categoria: 'Configurações', descricao: 'Atalhos de teclado' });
      telas.push({ id: 'configuracoes-documentos', nome: 'Config: Documentos', icone: 'FileText', categoria: 'Configurações', descricao: 'Modelos de documentos' });
      telas.push({ id: 'configuracoes-setores', nome: 'Config: Setores', icone: 'Layers', categoria: 'Configurações', descricao: 'Departamentos da empresa' });
      telas.push({ id: 'configuracoes-acessos', nome: 'Config: Controle de Acessos', icone: 'Key', categoria: 'Configurações', descricao: 'Permissões por setor' });
      telas.push({ id: 'configuracoes-categorias', nome: 'Config: Categorias', icone: 'Tags', categoria: 'Configurações', descricao: 'Categorias de clientes' });
      telas.push({ id: 'configuracoes-origens', nome: 'Config: Origens de Contato', icone: 'Globe', categoria: 'Configurações', descricao: 'Origens dos clientes' });
      telas.push({ id: 'configuracoes-produtos', nome: 'Config: Produtos e Serviços', icone: 'Package', categoria: 'Configurações', descricao: 'Cadastro de produtos' });
      telas.push({ id: 'configuracoes-usuarios', nome: 'Config: Usuários', icone: 'UsersRound', categoria: 'Configurações', descricao: 'Gestão de usuários' });
    }
    
    return telas;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
        <div className={`flex ${isCollapsed ? 'flex-col items-center gap-1' : 'flex-col gap-2'}`}>
          {isCollapsed ? (
            <>
              <div className="flex items-center justify-center w-full h-8 mb-1">
                <img 
                  src={whiteLabelConfig?.logoUrl || LogoPretaHorizontal} 
                  alt="Logo" 
                  className="h-6 w-6 object-contain" 
                />
              </div>
              <div 
                className="flex items-center justify-center w-full h-8 rounded-md hover:bg-sidebar-accent cursor-pointer text-muted-foreground hover:text-foreground" 
                onClick={quickSearch.open} 
                title="Buscar telas (Alt+S)"
              >
                <Search className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-center w-full">
                <NotificationPopover 
                  compact
                  onNotificacaoClick={(notificacao) => {
                    if (notificacao.tela) {
                      onSectionChange(notificacao.tela);
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex w-full items-center justify-between">
                <img 
                  src={whiteLabelConfig?.logoUrl || LogoPretaHorizontal} 
                  alt="Logo" 
                  className="h-10 w-auto object-contain" 
                />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={quickSearch.open}
                    className="relative h-9 w-9 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105 text-primary"
                    title="Buscar telas (Alt+S)"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                  <NotificationPopover 
                    onNotificacaoClick={(notificacao) => {
                      if (notificacao.tela) {
                        onSectionChange(notificacao.tela);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">Painel SST</h2>
                <p className="text-sm text-muted-foreground">{empresa?.nome || 'Empresa não vinculada'}</p>
                <p className="text-xs text-muted-foreground">{profile?.nome}</p>
              </div>
            </>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* ========== PRIMEIRO BOTÃO: Perfil da Empresa (sempre primeiro) ========== */}
              {moduloVisivelEContratado('perfil_empresa') && (
                <Collapsible defaultOpen className="group/collapsible-perfil">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        className="cursor-pointer"
                        onClick={() => onSectionChange('dashboard-geral')}
                      >
                        <Building2 className="h-4 w-4" />
                        <span>Perfil da Empresa</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible-perfil:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* Dashboard Geral - Primeiro item */}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => onSectionChange('dashboard-geral')}
                            isActive={activeSection === 'dashboard-geral'}
                            className="cursor-pointer"
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            <span>Dashboard</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {/* Meu Perfil */}
                        {telaVisivel('meu-perfil') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('meu-perfil')}
                              isActive={activeSection === 'meu-perfil'}
                              className="cursor-pointer"
                            >
                              <User className="h-4 w-4" />
                              <span>Meu Perfil</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Cadastro */}
                        {telaVisivel('cadastros') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('cadastros')}
                              isActive={activeSection === 'cadastros'}
                              className="cursor-pointer"
                            >
                              <FolderPlus className="h-4 w-4" />
                              <span>Cadastro</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Configurações */}
                        {telaVisivel('configuracoes') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('configuracoes')}
                              isActive={activeSection === 'configuracoes'}
                              className="cursor-pointer"
                            >
                              <Settings className="h-4 w-4" />
                              <span>Configurações</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Suporte - sempre visível */}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => onSectionChange('suporte')}
                            isActive={activeSection === 'suporte'}
                            className="cursor-pointer"
                          >
                            <Headphones className="h-4 w-4" />
                            <span>Suporte</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* ========== MÓDULO TORIQ CORP ========== */}
              {moduloVisivelEContratado('toriq_corp') && moduloTemTelasVisiveis([
                'toriq-corp-tarefas', 'toriq-corp-contratos', 'toriq-corp-setores',
                'toriq-corp-financeiro', 'toriq-corp-controle-frota',
                'toriq-corp-controle-equipamentos', 'toriq-corp-configuracoes'
              ]) && (
                <Collapsible defaultOpen className="group/collapsible-corp">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        className="cursor-pointer"
                        onClick={() => onSectionChange('toriq-corp-dashboard')}
                      >
                        <Briefcase className="h-4 w-4" />
                        <span>Toriq Corp</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible-corp:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* Dashboard - Primeiro item do Toriq Corp */}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => onSectionChange('toriq-corp-dashboard')}
                            isActive={activeSection === 'toriq-corp-dashboard'}
                            className="cursor-pointer"
                          >
                            <TrendingUp className="h-4 w-4" />
                            <span>Dashboard</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {/* Tarefas */}
                        {telaVisivel('toriq-corp-tarefas') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-corp-tarefas')}
                              isActive={activeSection === 'toriq-corp-tarefas'}
                              className="cursor-pointer"
                            >
                              <CheckSquare className="h-4 w-4" />
                              <span>Tarefas</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                                                {/* Contratos */}
                        {telaVisivel('toriq-corp-contratos') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-corp-contratos')}
                              isActive={activeSection === 'toriq-corp-contratos'}
                              className="cursor-pointer"
                            >
                              <FileSignature className="h-4 w-4" />
                              <span>Contratos</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                                                {/* Financeiro com toggle */}
                        {telaVisivel('toriq-corp-financeiro') && (
                          <Collapsible className="group/financeiro">
                            <SidebarMenuSubItem>
                              <div className="flex items-center w-full">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('toriq-corp-financeiro')}
                                  isActive={activeSection.startsWith('toriq-corp-financeiro') || activeSection === 'toriq-corp-contas-receber' || activeSection === 'toriq-corp-contas-pagar' || activeSection === 'toriq-corp-fluxo-caixa' || activeSection === 'toriq-corp-dre'}
                                  className="cursor-pointer flex-1"
                                >
                                  <DollarSign className="h-4 w-4" />
                                  <span>Financeiro</span>
                                </SidebarMenuSubButton>
                                <CollapsibleTrigger asChild>
                                  <button className="p-1 hover:bg-muted rounded">
                                    <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/financeiro:rotate-180" />
                                  </button>
                                </CollapsibleTrigger>
                              </div>
                            </SidebarMenuSubItem>
                            <CollapsibleContent>
                              {/* Dashboard Financeiro - submenu do Financeiro */}
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('toriq-corp-financeiro-dashboard')}
                                  isActive={activeSection === 'toriq-corp-financeiro-dashboard'}
                                  className="cursor-pointer text-xs"
                                >
                                  <TrendingUp className="h-3 w-3" />
                                  <span>Dashboard</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {/* Cadastros Financeiros - submenu do Financeiro */}
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('toriq-corp-financeiro-cadastros')}
                                  isActive={activeSection === 'toriq-corp-financeiro-cadastros'}
                                  className="cursor-pointer text-xs"
                                >
                                  <ClipboardList className="h-3 w-3" />
                                  <span>Cadastros</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {/* Contas a Receber - submenu do Financeiro */}
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('toriq-corp-contas-receber')}
                                  isActive={activeSection === 'toriq-corp-contas-receber'}
                                  className="cursor-pointer text-xs"
                                >
                                  <Receipt className="h-3 w-3" />
                                  <span>Contas a Receber</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {/* Contas a Pagar - submenu do Financeiro */}
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('toriq-corp-contas-pagar')}
                                  isActive={activeSection === 'toriq-corp-contas-pagar'}
                                  className="cursor-pointer text-xs"
                                >
                                  <Receipt className="h-3 w-3" />
                                  <span>Contas a Pagar</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {/* Fluxo de Caixa - submenu do Financeiro */}
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('toriq-corp-fluxo-caixa')}
                                  isActive={activeSection === 'toriq-corp-fluxo-caixa'}
                                  className="cursor-pointer text-xs"
                                >
                                  <Wallet className="h-3 w-3" />
                                  <span>Fluxo de Caixa</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {/* DRE - submenu do Financeiro */}
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('toriq-corp-dre')}
                                  isActive={activeSection === 'toriq-corp-dre'}
                                  className="cursor-pointer text-xs"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>DRE</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {getSetorByNome('Financeiro') && getFunisPorSetor(getSetorByNome('Financeiro')!.id).map(funil => (
                                <SidebarMenuSubItem key={funil.id} className="pl-4">
                                  <SidebarMenuSubButton
                                    onClick={() => onSectionChange(`funil-${funil.id}`)}
                                    isActive={activeSection === `funil-${funil.id}`}
                                    className="cursor-pointer text-xs"
                                  >
                                    <GitBranch className="h-3 w-3" />
                                    <span className="truncate">{funil.nome}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                        {/* Setores - Grupo fixo com toggle - Só exibe se a tela toriq-corp-setores estiver visível */}
                        {telaVisivel('toriq-corp-setores') && (
                        <Collapsible className="group/setores">
                            <SidebarMenuSubItem>
                              <div className="flex items-center w-full">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('toriq-corp-setores')}
                                  isActive={activeSection === 'toriq-corp-setores' || activeSection.startsWith('setor-') || getSetoresDinamicos().some(s => getFunisPorSetor(s.id).some(f => activeSection === `funil-${f.id}`))}
                                  className="cursor-pointer flex-1"
                                >
                                  <Building className="h-4 w-4" />
                                  <span>Setores</span>
                                </SidebarMenuSubButton>
                                <CollapsibleTrigger asChild>
                                  <button className="p-1 hover:bg-muted rounded">
                                    <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/setores:rotate-180" />
                                  </button>
                                </CollapsibleTrigger>
                              </div>
                            </SidebarMenuSubItem>
                            <CollapsibleContent>
                              {getSetoresDinamicos()
                                .filter(setor => telaVisivel(`setor-${setor.id}`))
                                .map(setor => {
                                const funisDoSetor = getFunisPorSetor(setor.id);
                                const temFunis = funisDoSetor.length > 0;
                                
                                return (
                                  <Collapsible key={setor.id} className="group/setor-interno">
                                    <SidebarMenuSubItem className="pl-4">
                                      <div className="flex items-center w-full">
                                        <SidebarMenuSubButton
                                          onClick={() => onSectionChange(`setor-${setor.id}`)}
                                          isActive={activeSection === `setor-${setor.id}` || funisDoSetor.some(f => activeSection === `funil-${f.id}`)}
                                          className="cursor-pointer flex-1 text-xs"
                                        >
                                          <Briefcase className="h-3 w-3" />
                                          <span>{setor.nome}</span>
                                        </SidebarMenuSubButton>
                                        {temFunis && (
                                          <CollapsibleTrigger asChild>
                                            <button className="p-1 hover:bg-muted rounded">
                                              <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/setor-interno:rotate-180" />
                                            </button>
                                          </CollapsibleTrigger>
                                        )}
                                      </div>
                                    </SidebarMenuSubItem>
                                    {temFunis && (
                                      <CollapsibleContent>
                                        {funisDoSetor.map(funil => (
                                          <SidebarMenuSubItem key={funil.id} className="pl-8">
                                            <SidebarMenuSubButton
                                              onClick={() => onSectionChange(`funil-${funil.id}`)}
                                              isActive={activeSection === `funil-${funil.id}`}
                                              className="cursor-pointer text-xs"
                                            >
                                              <GitBranch className="h-3 w-3" />
                                              <span className="truncate">{funil.nome}</span>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        ))}
                                      </CollapsibleContent>
                                    )}
                                  </Collapsible>
                                );
                              })}
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                        {/* Controle da Frota */}
                        {telaVisivel('toriq-corp-controle-frota') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-corp-controle-frota')}
                              isActive={activeSection === 'toriq-corp-controle-frota'}
                              className="cursor-pointer"
                            >
                              <Car className="h-4 w-4" />
                              <span>Controle da Frota</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Controle de Equipamentos */}
                        {telaVisivel('toriq-corp-controle-equipamentos') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-corp-controle-equipamentos')}
                              isActive={activeSection === 'toriq-corp-controle-equipamentos'}
                              className="cursor-pointer"
                            >
                              <HardHat className="h-4 w-4" />
                              <span>Controle de Equipamentos</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Configurações */}
                        {telaVisivel('toriq-corp-configuracoes') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-corp-configuracoes')}
                              isActive={activeSection === 'toriq-corp-configuracoes'}
                              className="cursor-pointer"
                            >
                              <Settings className="h-4 w-4" />
                              <span>Configurações</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* ========== BOTÕES DO MEIO: Toriq Training ========== */}
              {moduloVisivelEContratado('toriq_train') && moduloTemTelasVisiveis([
                'toriq-training-dashboard', 'agenda-treinamentos', 'gestao-turmas', 'solicitacoes-treinamentos', 'nr',
                'catalogo-treinamentos', 'matriz-treinamentos', 'grupos-homogeneos', 'provas',
                'avaliacao-reacao', 'declaracao-reorientacao', 'modelo-relatorio', 'instrutores', 'empresas-parceiras'
              ]) && (
                <Collapsible defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        className="cursor-pointer"
                        onClick={() => onSectionChange('toriq-training-dashboard')}
                      >
                        <GraduationCap className="h-4 w-4" />
                        <span>Toriq Training</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* === DASHBOARD (PRIMEIRO ITEM) === */}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => onSectionChange('toriq-training-dashboard')}
                            isActive={activeSection === 'toriq-training-dashboard'}
                            className="cursor-pointer"
                          >
                            <TrendingUp className="h-4 w-4" />
                            <span>Dashboard</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {/* === SOLICITAÇÃO DE TREINAMENTO === */}
                        {telaVisivel('solicitacoes-treinamentos') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('solicitacoes-treinamentos')}
                              isActive={activeSection === 'solicitacoes-treinamentos'}
                              className="cursor-pointer"
                            >
                              <ClipboardList className="h-4 w-4" />
                              <span>Solicitação de Treinamento</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* === AGENDA DE TREINAMENTOS === */}
                        {telaVisivel('agenda-treinamentos') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('agenda-treinamentos')}
                              isActive={activeSection === 'agenda-treinamentos'}
                              className="cursor-pointer"
                            >
                              <CalendarDays className="h-4 w-4" />
                              <span>Agenda de Treinamentos</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* === GESTÃO DE TURMAS === */}
                        {telaVisivel('gestao-turmas') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('gestao-turmas')}
                              isActive={activeSection === 'gestao-turmas'}
                              className="cursor-pointer"
                            >
                              <FileCheck className="h-4 w-4" />
                              <span>Gestão de Turmas</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* === CADASTROS (GRUPO COLAPSÁVEL) === */}
                        {/* Só mostra se pelo menos uma tela de cadastro estiver visível */}
                        {(telaVisivel('nr') || telaVisivel('catalogo-treinamentos') || telaVisivel('matriz-treinamentos') || 
                          telaVisivel('grupos-homogeneos') || telaVisivel('declaracao-reorientacao') || telaVisivel('modelo-relatorio') || 
                          telaVisivel('avaliacao-reacao') || telaVisivel('provas') || telaVisivel('instrutores') || telaVisivel('empresas-parceiras')) && (
                        <Collapsible className="group/cadastros-training">
                          <SidebarMenuSubItem>
                            <div className="flex items-center w-full">
                              <CollapsibleTrigger asChild>
                                <SidebarMenuSubButton
                                  className="cursor-pointer flex-1"
                                  isActive={
                                    activeSection === 'nr' ||
                                    activeSection === 'catalogo-treinamentos' ||
                                    activeSection === 'matriz-treinamentos' ||
                                    activeSection === 'grupos-homogeneos' ||
                                    activeSection === 'declaracao-reorientacao' ||
                                    activeSection === 'modelo-relatorio' ||
                                    activeSection === 'avaliacao-reacao' ||
                                    activeSection === 'provas' ||
                                    activeSection === 'instrutores' ||
                                    activeSection === 'empresas-parceiras'
                                  }
                                >
                                  <FolderPlus className="h-4 w-4" />
                                  <span>Cadastros</span>
                                  <ChevronDown className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/cadastros-training:rotate-180" />
                                </SidebarMenuSubButton>
                              </CollapsibleTrigger>
                            </div>
                          </SidebarMenuSubItem>
                          <CollapsibleContent>
                            {/* NR */}
                            {telaVisivel('nr') && (
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('nr')}
                                  isActive={activeSection === 'nr'}
                                  className="cursor-pointer text-xs"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>NR</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                            {/* Treinamentos */}
                            {telaVisivel('catalogo-treinamentos') && (
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('catalogo-treinamentos')}
                                  isActive={activeSection === 'catalogo-treinamentos'}
                                  className="cursor-pointer text-xs"
                                >
                                  <BookOpen className="h-3 w-3" />
                                  <span>Treinamentos</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                            {/* Matriz de Treinamentos */}
                            {telaVisivel('matriz-treinamentos') && (
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('matriz-treinamentos')}
                                  isActive={activeSection === 'matriz-treinamentos'}
                                  className="cursor-pointer text-xs"
                                >
                                  <Grid3X3 className="h-3 w-3" />
                                  <span>Matriz de Treinamentos</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                            {/* Grupos Homogêneos */}
                            {telaVisivel('grupos-homogeneos') && (
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('grupos-homogeneos')}
                                  isActive={activeSection === 'grupos-homogeneos'}
                                  className="cursor-pointer text-xs"
                                >
                                  <Users className="h-3 w-3" />
                                  <span>Grupo Homogêneo</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                            {/* Declaração de Reorientação */}
                            {telaVisivel('declaracao-reorientacao') && (
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('declaracao-reorientacao')}
                                  isActive={activeSection === 'declaracao-reorientacao'}
                                  className="cursor-pointer text-xs"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>Declaração de Reorientação</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                            {/* Modelo Relatório */}
                            {telaVisivel('modelo-relatorio') && (
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('modelo-relatorio')}
                                  isActive={activeSection === 'modelo-relatorio'}
                                  className="cursor-pointer text-xs"
                                >
                                  <FileType className="h-3 w-3" />
                                  <span>Modelo Relatório</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                            {/* Avaliação de Reação */}
                            {telaVisivel('avaliacao-reacao') && (
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('avaliacao-reacao')}
                                  isActive={activeSection === 'avaliacao-reacao'}
                                  className="cursor-pointer text-xs"
                                >
                                  <ClipboardList className="h-3 w-3" />
                                  <span>Avaliação de Reação</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                            {/* Provas */}
                            {telaVisivel('provas') && (
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('provas')}
                                  isActive={activeSection === 'provas'}
                                  className="cursor-pointer text-xs"
                                >
                                  <ListChecks className="h-3 w-3" />
                                  <span>Provas</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                            {/* Instrutores */}
                            {telaVisivel('instrutores') && (
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('instrutores')}
                                  isActive={activeSection === 'instrutores'}
                                  className="cursor-pointer text-xs"
                                >
                                  <UserCheck className="h-3 w-3" />
                                  <span>Instrutores</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                            {/* Empresas Parceiras */}
                            {telaVisivel('empresas-parceiras') && (
                              <SidebarMenuSubItem className="pl-4">
                                <SidebarMenuSubButton
                                  onClick={() => onSectionChange('empresas-parceiras')}
                                  isActive={activeSection === 'empresas-parceiras'}
                                  className="cursor-pointer text-xs"
                                >
                                  <Building className="h-3 w-3" />
                                  <span>Empresas Parceiras</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* ========== MÓDULO TORIQ EPI ========== */}
              {moduloVisivelEContratado('gestao_epi') && moduloTemTelasVisiveis([
                'toriq-epi-dashboard', 'toriq-epi-catalogo', 'toriq-epi-estoque',
                'toriq-epi-entregas', 'toriq-epi-ficha', 'toriq-epi-devolucoes', 'toriq-epi-relatorios'
              ]) && (
                <Collapsible defaultOpen className="group/collapsible-epi">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        className="cursor-pointer"
                        onClick={() => onSectionChange('toriq-epi-dashboard')}
                      >
                        <Shield className="h-4 w-4" />
                        <span>Toriq EPI</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible-epi:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* Dashboard EPI */}
                        {telaVisivel('toriq-epi-dashboard') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-epi-dashboard')}
                              isActive={activeSection === 'toriq-epi-dashboard'}
                              className="cursor-pointer"
                            >
                              <TrendingUp className="h-4 w-4" />
                              <span>Dashboard</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Catálogo de EPIs */}
                        {telaVisivel('toriq-epi-catalogo') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-epi-catalogo')}
                              isActive={activeSection === 'toriq-epi-catalogo'}
                              className="cursor-pointer"
                            >
                              <Package className="h-4 w-4" />
                              <span>Cadastro de EPI</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Estoque */}
                        {telaVisivel('toriq-epi-estoque') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-epi-estoque')}
                              isActive={activeSection === 'toriq-epi-estoque'}
                              className="cursor-pointer"
                            >
                              <ClipboardList className="h-4 w-4" />
                              <span>Estoque</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Entregas */}
                        {telaVisivel('toriq-epi-entregas') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-epi-entregas')}
                              isActive={activeSection === 'toriq-epi-entregas'}
                              className="cursor-pointer"
                            >
                              <FileCheck className="h-4 w-4" />
                              <span>Entregas</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Ficha de EPI */}
                        {telaVisivel('toriq-epi-ficha') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-epi-ficha')}
                              isActive={activeSection === 'toriq-epi-ficha'}
                              className="cursor-pointer"
                            >
                              <FileText className="h-4 w-4" />
                              <span>Ficha de EPI</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Devoluções */}
                        {telaVisivel('toriq-epi-devolucoes') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-epi-devolucoes')}
                              isActive={activeSection === 'toriq-epi-devolucoes'}
                              className="cursor-pointer"
                            >
                              <UsersRound className="h-4 w-4" />
                              <span>Devoluções</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        {/* Relatórios */}
                        {telaVisivel('toriq-epi-relatorios') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange('toriq-epi-relatorios')}
                              isActive={activeSection === 'toriq-epi-relatorios'}
                              className="cursor-pointer"
                            >
                              <FileType className="h-4 w-4" />
                              <span>Relatórios</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-2">
        {/* Controles quando expandido */}
        {!isCollapsed && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-end px-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8"
                title="Recolher menu"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        )}
        {/* Controles quando recolhido - ícones empilhados e centralizados */}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8"
              title="Expandir menu"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="h-8 w-8"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
      
      {/* Quick Search Modal */}
      <QuickSearch 
        isOpen={quickSearch.isOpen}
        onClose={quickSearch.close}
        onNavigate={onSectionChange}
        telas={getQuickSearchTelas()}
      />
    </Sidebar>
  );
}
