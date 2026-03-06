import { LogOut, Users, Building, Briefcase, ClipboardList, UserCircle, GraduationCap, FileText, ShieldCheck, Headphones, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEmpresaWhiteLabel } from '@/hooks/useWhiteLabel';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import type { ClienteSection } from '@/pages/ClienteDashboard';

interface ClienteSidebarProps {
  activeSection: ClienteSection;
  onSectionChange: (section: ClienteSection) => void;
}

const menuItems = [
  { id: 'meu-perfil' as ClienteSection, label: 'Meu Perfil', icon: UserCircle },
  { id: 'setores' as ClienteSection, label: 'Setores', icon: Building },
  { id: 'cargos' as ClienteSection, label: 'Cargos', icon: Briefcase },
  { id: 'colaboradores' as ClienteSection, label: 'Colaboradores', icon: Users },
  { id: 'controle-validade' as ClienteSection, label: 'Controle de Validade', icon: ShieldCheck },
  { id: 'turmas' as ClienteSection, label: 'Turmas', icon: GraduationCap },
  { id: 'relatorios-certificados' as ClienteSection, label: 'Relatórios e Certificados', icon: FileText },
  { id: 'solicitacao-treinamento' as ClienteSection, label: 'Solicitação de Treinamento', icon: ClipboardList },
  { id: 'suporte' as ClienteSection, label: 'Suporte', icon: Headphones },
];

export function ClienteSidebar({ activeSection, onSectionChange }: ClienteSidebarProps) {
  const { profile, empresa, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { config: whiteLabelConfig } = useEmpresaWhiteLabel(empresa?.id);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate('/auth');
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          {whiteLabelConfig?.logoUrl ? (
            <img 
              src={whiteLabelConfig.logoUrl} 
              alt="Logo" 
              className="h-10 w-auto object-contain" 
            />
          ) : (
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Meu Portal</h2>
            <p className="text-sm text-muted-foreground truncate max-w-[160px]" title={empresa?.nome || 'Empresa não vinculada'}>{empresa?.nome || 'Empresa não vinculada'}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id)}
                    isActive={activeSection === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-4">
        <Button variant="outline" className="w-full" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
