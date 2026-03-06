import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
import ParceiraDashboard from "./pages/ParceiraDashboard";
import ModuloPage from "./pages/ModuloPage";
import GestaoEPI from "./pages/modulos/GestaoEPI";
import SaudeOcupacional from "./pages/modulos/SaudeOcupacional";
import GestaoTreinamentos from "./pages/modulos/GestaoTreinamentos";
import GestaoTerceiros from "./pages/modulos/GestaoTerceiros";
import GestaoTurmas from "./pages/modulos/GestaoTurmas";
import DetalhesTurma from "./pages/modulos/DetalhesTurma";
import GerenciarTurma from "./pages/modulos/GerenciarTurma";
import AvaliacaoReacao from "./pages/modulos/AvaliacaoReacao";
import ColaboradorDetalhes from "./pages/modulos/ColaboradorDetalhes";
import ClienteDetalhesPage from "./pages/sst/ClienteDetalhesPage";
import ResetPassword from "./pages/ResetPassword";
import AlterarSenha from "./pages/AlterarSenha";
import Logout from "./pages/Logout";
import ProvaTurma from "./pages/public/ProvaTurma";
import CadastroColaboradorTurma from "./pages/public/CadastroColaboradorTurma";
import MarcarPresencaTurma from "./pages/public/MarcarPresencaTurma";
import InstrutorDashboard from "./pages/instrutor/InstrutorDashboard";
import InstrutorGerenciarTurma from "./pages/instrutor/InstrutorGerenciarTurma";
import VisualizarCertificado from "./pages/certificado/VisualizarCertificado";
import VisualizarRelatorio from "./pages/relatorio/VisualizarRelatorio";
import VisualizarRelatorioPresencas from "./pages/relatorio/VisualizarRelatorioPresencas";
import VisualizarRelatorioSinistros from "./pages/relatorio/VisualizarRelatorioSinistros";
import VisualizarRelatorioAuditoria from "./pages/relatorio/VisualizarRelatorioAuditoria";
import PropostaWeb from "./pages/public/PropostaWeb";
import CadastroInstrutor from "./pages/public/CadastroInstrutor";
import ValidacaoDigitalCertificado from "./pages/public/ValidacaoDigitalCertificado";
import BlogList from "./pages/public/BlogList";
import BlogPost from "./pages/public/BlogPost";
import PesquisasList from "./pages/public/PesquisasList";
import PesquisaVotar from "./pages/public/PesquisaVotar";
import Newsletter from "./pages/public/Newsletter";
import TrabalheConosco from "./pages/public/TrabalheConosco";
import ClienteVisualizarTurma from "./pages/cliente/ClienteVisualizarTurma";
import { ParceiraVisualizarTurma } from "./components/parceira/ParceiraVisualizarTurma";
import NotFound from "./pages/NotFound";
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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
            <Route path="/alterar-senha" element={<AlterarSenha />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/sair" element={<Logout />} />
            <Route path="/dashboard" element={<RequireSenhaAlterada><Dashboard /></RequireSenhaAlterada>} />
            <Route path="/admin" element={<RequireSenhaAlterada><AdminDashboard /></RequireSenhaAlterada>} />
            <Route path="/sst" element={<RequireSenhaAlterada><SSTDashboard /></RequireSenhaAlterada>} />
            <Route path="/cliente" element={<RequireSenhaAlterada><ClienteDashboard /></RequireSenhaAlterada>} />
            <Route path="/parceira" element={<RequireSenhaAlterada><ParceiraDashboard /></RequireSenhaAlterada>} />
            <Route path="/modulos/:moduloSlug" element={<RequireSenhaAlterada><ModuloPage /></RequireSenhaAlterada>} />
            <Route path="/modulos/gestao-epi" element={<RequireSenhaAlterada><GestaoEPI /></RequireSenhaAlterada>} />
            <Route path="/modulos/saude-ocupacional" element={<RequireSenhaAlterada><SaudeOcupacional /></RequireSenhaAlterada>} />
            <Route path="/modulos/treinamentos" element={<RequireSenhaAlterada><GestaoTreinamentos /></RequireSenhaAlterada>} />
            <Route path="/modulos/gestao-turmas" element={<RequireSenhaAlterada><GestaoTurmas /></RequireSenhaAlterada>} />
            <Route path="/modulos/gestao-turmas/:turmaId" element={<RequireSenhaAlterada><GerenciarTurma /></RequireSenhaAlterada>} />
            <Route path="/modulos/avaliacao-reacao" element={<RequireSenhaAlterada><AvaliacaoReacao /></RequireSenhaAlterada>} />
            <Route path="/modulos/terceiros" element={<RequireSenhaAlterada><GestaoTerceiros /></RequireSenhaAlterada>} />
            <Route path="/colaborador/:colaboradorId" element={<RequireSenhaAlterada><ColaboradorDetalhes /></RequireSenhaAlterada>} />
            <Route path="/sst/cliente/:clienteId" element={<RequireSenhaAlterada><ClienteDetalhesPage /></RequireSenhaAlterada>} />
            {/* Rotas Públicas */}
            <Route path="/prova-turma/:turmaId" element={<ProvaTurma />} />
            <Route path="/cadastro-turma/:turmaId" element={<CadastroColaboradorTurma />} />
            <Route path="/presenca-turma/:turmaId" element={<MarcarPresencaTurma />} />
            {/* Rotas do Instrutor */}
            <Route path="/instrutor" element={<RequireSenhaAlterada><InstrutorDashboard /></RequireSenhaAlterada>} />
            <Route path="/instrutor/turma/:turmaId" element={<RequireSenhaAlterada><InstrutorGerenciarTurma /></RequireSenhaAlterada>} />
            {/* Rota do Cliente - Visualizar Turma */}
            <Route path="/cliente/turma/:turmaId" element={<RequireSenhaAlterada><ClienteVisualizarTurma /></RequireSenhaAlterada>} />
            {/* Rota da Empresa Parceira - Visualizar Turma */}
            <Route path="/parceira/turmas/:turmaId" element={<RequireSenhaAlterada><ParceiraVisualizarTurma /></RequireSenhaAlterada>} />
            {/* Rota de Certificado */}
            <Route path="/certificado/visualizar" element={<VisualizarCertificado />} />
            {/* Rota de Relatório */}
            <Route path="/relatorio/visualizar" element={<VisualizarRelatorio />} />
            <Route path="/relatorio/presencas" element={<VisualizarRelatorioPresencas />} />
            <Route path="/relatorio/sinistros" element={<VisualizarRelatorioSinistros />} />
            <Route path="/relatorio/auditoria" element={<VisualizarRelatorioAuditoria />} />
            {/* Rota de Proposta Web */}
            <Route path="/proposta/:propostaId" element={<PropostaWeb />} />
            {/* Rota de Validação Digital de Certificado */}
            <Route path="/validacao-certificado/:token" element={<ValidacaoDigitalCertificado />} />
            {/* Rota de Cadastro de Instrutor */}
            <Route path="/cadastro-instrutor/:token" element={<CadastroInstrutor />} />
            {/* Rota de Suporte */}
            <Route path="/suporte" element={<SuporteTickets />} />
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
  </QueryClientProvider>
);

export default App;
