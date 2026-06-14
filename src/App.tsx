import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider, ThemeUserBridge } from "@/hooks/useTheme";
import { EmpresaModeProvider } from "@/hooks/useEmpresaMode";
import { ModulosAtivosProvider } from "@/hooks/useModulosAtivos";
import { CurrentScreenProvider } from "@/hooks/useCurrentScreen";
import { loadAndApplyWhiteLabelConfig } from "@/hooks/useWhiteLabel";
import { WhiteLabelProvider } from "@/components/shared/WhiteLabelProvider";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import SobreNos from "./pages/SobreNos";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SSTDashboard from "./pages/SSTDashboard";
import ClienteDashboard from "./pages/ClienteDashboard";
import ModuloPage from "./pages/ModuloPage";
import SaudeOcupacional from "./pages/modulos/SaudeOcupacional";
import GestaoTerceiros from "./pages/modulos/GestaoTerceiros";
import ColaboradorDetalhes from "./pages/modulos/ColaboradorDetalhes";
import ClienteDetalhesPage from "./pages/sst/ClienteDetalhesPage";
import ResetPassword from "./pages/ResetPassword";
import DefinirSenha from "./pages/DefinirSenha";
import EsqueciSenha from "./pages/EsqueciSenha";
import AlterarSenha from "./pages/AlterarSenha";
import Logout from "./pages/Logout";
import PropostaWeb from "./pages/public/PropostaWeb";
import BlogList from "./pages/public/BlogList";
import BlogPost from "./pages/public/BlogPost";
import PesquisasList from "./pages/public/PesquisasList";
import PesquisaVotar from "./pages/public/PesquisaVotar";
import Newsletter from "./pages/public/Newsletter";
import TrabalheConosco from "./pages/public/TrabalheConosco";
import NotFound from "./pages/NotFound";
import ApiTest from "./pages/dev/ApiTest";
import SuporteTickets from "./pages/shared/SuporteTickets";
import { FloatingSupportWidget } from "./components/shared/support";
import { UpdateNotificationPopup } from "./components/shared/UpdateNotificationPopup";
import { RequireSenhaAlterada } from "./components/auth/RequireSenhaAlterada";
import { ImportQueueProvider } from "./hooks/useImportQueue";
import { ImportProgressPopup } from "./components/shared/ImportProgressPopup";

const queryClient = new QueryClient();

// Aplicar configurações White Label ao iniciar o app
loadAndApplyWhiteLabelConfig();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeUserBridge />
          <WhiteLabelProvider>
          <EmpresaModeProvider>
          <ModulosAtivosProvider>
          <CurrentScreenProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/sobre-nos" element={<SobreNos />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/pesquisas" element={<PesquisasList />} />
            <Route path="/pesquisas/:slug" element={<PesquisaVotar />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/trabalhe-conosco" element={<TrabalheConosco />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/definir-senha" element={<DefinirSenha />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/alterar-senha" element={<AlterarSenha />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/sair" element={<Logout />} />
            <Route path="/dashboard" element={<RequireSenhaAlterada><Dashboard /></RequireSenhaAlterada>} />
            <Route path="/admin" element={<RequireSenhaAlterada><AdminDashboard /></RequireSenhaAlterada>} />
            <Route path="/toriqcorp" element={<RequireSenhaAlterada><SSTDashboard /></RequireSenhaAlterada>} />
            <Route path="/sst" element={<Navigate to="/toriqcorp" replace />} />
            <Route path="/cliente" element={<RequireSenhaAlterada><ClienteDashboard /></RequireSenhaAlterada>} />
            <Route path="/modulos/:moduloSlug" element={<RequireSenhaAlterada><ModuloPage /></RequireSenhaAlterada>} />
            <Route path="/modulos/saude-ocupacional" element={<RequireSenhaAlterada><SaudeOcupacional /></RequireSenhaAlterada>} />
            <Route path="/modulos/terceiros" element={<RequireSenhaAlterada><GestaoTerceiros /></RequireSenhaAlterada>} />
            <Route path="/colaborador/:colaboradorId" element={<RequireSenhaAlterada><ColaboradorDetalhes /></RequireSenhaAlterada>} />
            <Route path="/toriqcorp/cliente/:clienteId" element={<RequireSenhaAlterada><ClienteDetalhesPage /></RequireSenhaAlterada>} />
            <Route path="/sst/cliente/:clienteId" element={<Navigate to="/toriqcorp/cliente/:clienteId" replace />} />
            {/* Rota de Proposta Web */}
            <Route path="/proposta/:propostaId" element={<PropostaWeb />} />
            {/* Rota de Suporte */}
            <Route path="/suporte" element={<SuporteTickets />} />
            {/* Piloto da migração (Fatia 5) — front ↔ backend Python.
                Só existe em DEV: removido do build de produção, invisível ao usuário. */}
            {import.meta.env.DEV && <Route path="/_api-test" element={<ApiTest />} />}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingSupportWidget />
          <UpdateNotificationPopup />
          <ImportQueueProvider>
            <ImportProgressPopup />
          </ImportQueueProvider>
          </CurrentScreenProvider>
          </ModulosAtivosProvider>
          </EmpresaModeProvider>
          </WhiteLabelProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
