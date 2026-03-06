import { LogOut, GraduationCap, CalendarDays, FileCheck, Home, UserCircle, Headphones, CalendarX } from 'lucide-react';
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
import LogoPretaHorizontal from '/logo/logo-preta.png';

export type InstrutorSection = 'inicio' | 'gestao-turmas' | 'agenda' | 'indisponibilidade' | 'perfil' | 'suporte';

interface InstrutorSidebarProps {
  activeSection: InstrutorSection;
  onSectionChange: (section: InstrutorSection) => void;
}

const menuItems = [
  { id: 'inicio' as InstrutorSection, label: 'Início', icon: Home },
  { id: 'gestao-turmas' as InstrutorSection, label: 'Gestão de Turmas', icon: FileCheck },
  { id: 'agenda' as InstrutorSection, label: 'Agenda de Treinamentos', icon: CalendarDays },
  { id: 'indisponibilidade' as InstrutorSection, label: 'Solicitar Indisponibilidade', icon: CalendarX },
  { id: 'perfil' as InstrutorSection, label: 'Meu Perfil', icon: UserCircle },
  { id: 'suporte' as InstrutorSection, label: 'Suporte', icon: Headphones },
];

export function InstrutorSidebar({ activeSection, onSectionChange }: InstrutorSidebarProps) {
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
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">Portal do Instrutor</h2>
            <p className="text-sm text-muted-foreground truncate">{profile?.nome || 'Instrutor'}</p>
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
