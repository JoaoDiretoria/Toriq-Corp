import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Activity, Database, Server, Headphones, Users, Bug, ScrollText,
  LogOut, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export type OpsSection =
  | 'visao-geral' | 'banco' | 'redis' | 'tickets' | 'usuarios' | 'sentry' | 'auditoria';

interface NavItem { id: OpsSection; label: string; icon: LucideIcon; }

const NAV_ITEMS: NavItem[] = [
  { id: 'visao-geral', label: 'Visão Geral', icon: Activity },
  { id: 'banco', label: 'Banco de Dados', icon: Database },
  { id: 'redis', label: 'Redis & Filas', icon: Server },
  { id: 'tickets', label: 'Tickets', icon: Headphones },
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'sentry', label: 'Sentry / Erros', icon: Bug },
  { id: 'auditoria', label: 'Auditoria', icon: ScrollText },
];

interface Props {
  activeSection: OpsSection;
  onSectionChange: (s: OpsSection) => void;
}

export function SuporteSidebar({ activeSection, onSectionChange }: Props) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/auth');
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <img
          src="/IDTORIQCOMPLETA/LOGO%20PNG/PRETA-HORIZONTAL.png"
          alt="TORIQ"
          className="h-9 w-auto shrink-0"
        />
        <span className="mt-2 text-xs font-medium text-muted-foreground">Suporte · Ops</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id)}
                    isActive={activeSection === item.id}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
