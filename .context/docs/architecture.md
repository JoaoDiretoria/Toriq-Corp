---
status: unfilled
generated: 2026-01-20
---

# Architecture Notes

Describe how the system is assembled and why the current design exists.

## System Architecture Overview

Summarize the top-level topology (monolith, modular service, microservices) and deployment model. Highlight how requests traverse the system and where control pivots between layers.

## Architectural Layers
### Config
Configuration and constants
- **Directories**: `.`, `src\config`
- **Symbols**: 5 total, 5 exported
- **Key exports**:
  - [`TelaMódulo`](src\config\modulosTelas.ts#L11) (interface)
  - [`ModuloConfig`](src\config\modulosTelas.ts#L19) (interface)
  - [`getTodasTelasPorModulo`](src\config\modulosTelas.ts#L139) (function)
  - [`getIdsTelasPorModulo`](src\config\modulosTelas.ts#L156) (function)
  - [`getModuloByNome`](src\config\modulosTelas.ts#L161) (function)

### Utils
Shared utilities and helpers
- **Directories**: `src\utils`, `src\lib`, `src\utils\facial-recognition`, `src\components\shared\support`, `src\components\shared\notifications`, `src\pages\shared`, `src\components\shared`
- **Symbols**: 26 total, 17 exported → depends on: Services, Components
- **Key exports**:
  - [`PDFGenerationOptions`](src\utils\pdfUtils.ts#L13) (interface)
  - [`PDFResult`](src\utils\pdfUtils.ts#L28) (interface)
  - [`generateCompactPDF`](src\utils\pdfUtils.ts#L100) (function)
  - [`downloadPDF`](src\utils\pdfUtils.ts#L227) (function)
  - [`cn`](src\lib\utils.ts#L4) (function)
  - [`ProcessingLog`](src\utils\facial-recognition\types.ts#L5) (interface)
  - [`ImageAnalysis`](src\utils\facial-recognition\types.ts#L12) (interface)
  - [`FaceDetectionResult`](src\utils\facial-recognition\types.ts#L27) (interface)
  - [`FacialValidationResult`](src\utils\facial-recognition\types.ts#L50) (interface)
  - [`ComparisonMetrics`](src\utils\facial-recognition\types.ts#L65) (interface)
  - [`ImageProcessor`](src\utils\facial-recognition\ImageProcessor.ts#L9) (class)
  - [`FaceDetector`](src\utils\facial-recognition\FaceDetector.ts#L10) (class)
  - [`CardMovimentacoesHistory`](src\components\shared\CardMovimentacoesHistory.tsx#L43) (function)
  - [`AlterarSenhaDialog`](src\components\shared\AlterarSenhaDialog.tsx#L25) (function)
  - [`AulaAgendada`](src\components\shared\AgendaTreinamentos.tsx#L25) (interface)
  - [`TurmaAgenda`](src\components\shared\AgendaTreinamentos.tsx#L33) (interface)
  - [`NotificationItem`](src\components\shared\notifications\NotificationItem.tsx#L92) (function)

### Services
Business logic and orchestration
- **Directories**: `src\lib`, `src\utils\facial-recognition`
- **Symbols**: 29 total, 16 exported
- **Key exports**:
  - [`Estado`](src\lib\ibgeService.ts#L3) (interface)
  - [`Cidade`](src\lib\ibgeService.ts#L9) (interface)
  - [`getEstados`](src\lib\ibgeService.ts#L19) (function)
  - [`getCidadesPorEstado`](src\lib\ibgeService.ts#L56) (function)
  - [`DistanceResult`](src\lib\googleMapsService.ts#L6) (interface)
  - [`clearDistanceCache`](src\lib\googleMapsService.ts#L103) (function)
  - [`getCacheStats`](src\lib\googleMapsService.ts#L112) (function)
  - [`calculateDistance`](src\lib\googleMapsService.ts#L195) (function)
  - [`DistanceProgressCallback`](src\lib\googleMapsService.ts#L239) (type)
  - [`calculateDistancesFromInstructors`](src\lib\googleMapsService.ts#L243) (function)
  - [`formatDistance`](src\lib\googleMapsService.ts#L333) (function)
  - [`CBOOcupacao`](src\lib\cboService.ts#L3) (interface)
  - [`searchCBO`](src\lib\cboService.ts#L13) (function)
  - [`getCBOByCodigo`](src\lib\cboService.ts#L34) (function)
  - [`FacialRecognitionService`](src\utils\facial-recognition\FacialRecognitionService.ts#L17) (class)
  - [`FaceApiResult`](src\utils\facial-recognition\FaceApiService.ts#L10) (interface)

### Components
UI components and views
- **Directories**: `src\components\ui`, `src\components\sst\toriq-training`, `src\components\sst\toriq-epi`, `src\components\sst\toriq-corp`, `src\pages`, `src\hooks`, `src\components`, `src\pages\relatorio`, `src\pages\public`, `src\pages\modulos`, `src\pages\instrutor`, `src\pages\cliente`, `src\pages\certificado`, `src\components\turma`, `src\components\sst`, `src\components\parceira`, `src\components\instrutor`, `src\components\cliente`, `src\components\avaliacao`, `src\components\admin`, `src\components\sst\cadastros`, `src\components\sst\toriq-corp\configuracoes`
- **Symbols**: 210 total, 38 exported → depends on: Repositories
- **Key exports**:
  - [`ClienteSection`](src\pages\ClienteDashboard.tsx#L23) (type)
  - [`AlterarSenha`](src\pages\AlterarSenha.tsx#L12) (function)
  - [`CurrentScreenProvider`](src\hooks\useCurrentScreen.tsx#L30) (function)
  - [`useCurrentScreen`](src\hooks\useCurrentScreen.tsx#L187) (function)
  - [`DetalhesTurma`](src\pages\modulos\DetalhesTurma.tsx#L53) (function)
  - [`Toaster`](src\components\ui\toaster.tsx#L4) (function)
  - [`TextareaProps`](src\components\ui\textarea.tsx#L5) (interface)
  - [`ChartConfig`](src\components\ui\chart.tsx#L9) (type)
  - [`CalendarProps`](src\components\ui\calendar.tsx#L15) (type)
  - [`ButtonProps`](src\components\ui\button.tsx#L33) (interface)
  - [`BadgeProps`](src\components\ui\badge.tsx#L23) (interface)
  - [`SSTPerfilEmpresa`](src\components\sst\SSTPerfilEmpresa.tsx#L30) (function)
  - [`SSTCadastros`](src\components\sst\SSTCadastros.tsx#L4) (function)
  - [`ParceiraSidebar`](src\components\parceira\ParceiraSidebar.tsx#L26) (function)
  - [`ParceiraAgenda`](src\components\parceira\ParceiraAgenda.tsx#L7) (function)
  - [`InstrutorSection`](src\components\instrutor\InstrutorSidebar.tsx#L19) (type)
  - [`InstrutorSidebar`](src\components\instrutor\InstrutorSidebar.tsx#L35) (function)
  - [`InstrutorAgendaTreinamentos`](src\components\instrutor\InstrutorAgendaTreinamentos.tsx#L11) (function)
  - [`ClienteSidebar`](src\components\cliente\ClienteSidebar.tsx#L37) (function)
  - [`Setor`](src\components\cliente\ClienteSetores.tsx#L40) (interface)
  - [`ClienteFinanceiro`](src\components\cliente\ClienteFinanceiro.tsx#L34) (function)
  - [`Colaborador`](src\components\cliente\ClienteColaboradores.tsx#L33) (interface)
  - [`Cargo`](src\components\cliente\ClienteCargos.tsx#L40) (interface)
  - [`EmpresaModeBanner`](src\components\admin\EmpresaModeBanner.tsx#L6) (function)
  - [`DadosCustoMensal`](src\components\admin\CalculadoraCustoMensal.tsx#L22) (interface)
  - [`AdminSidebar`](src\components\admin\AdminSidebar.tsx#L62) (function)
  - [`AdminConfiguracoes`](src\components\admin\AdminConfiguracoes.tsx#L4) (function)
  - [`ToriqEPIRelatorios`](src\components\sst\toriq-epi\ToriqEPIRelatorios.tsx#L5) (function)
  - [`ToriqEPIFicha`](src\components\sst\toriq-epi\ToriqEPIFicha.tsx#L7) (function)
  - [`ToriqEPIDevolucoes`](src\components\sst\toriq-epi\ToriqEPIDevolucoes.tsx#L7) (function)
  - [`ToriqCorpTecnico`](src\components\sst\toriq-corp\ToriqCorpTecnico.tsx#L4) (function)
  - [`ToriqCorpMarketing`](src\components\sst\toriq-corp\ToriqCorpMarketing.tsx#L8) (function)
  - [`ToriqCorpFinanceiroCadastros`](src\components\sst\toriq-corp\ToriqCorpFinanceiroCadastros.tsx#L3) (function)
  - [`ToriqCorpContratos`](src\components\sst\toriq-corp\ToriqCorpContratos.tsx#L50) (function)
  - [`ToriqCorpContasReceber`](src\components\sst\toriq-corp\ToriqCorpContasReceber.tsx#L3) (function)
  - [`ToriqCorpContasPagar`](src\components\sst\toriq-corp\ToriqCorpContasPagar.tsx#L3) (function)
  - [`ToriqCorpComercial`](src\components\sst\toriq-corp\ToriqCorpComercial.tsx#L8) (function)
  - [`ToriqCorpAdministrativo`](src\components\sst\toriq-corp\ToriqCorpAdministrativo.tsx#L8) (function)

### Repositories
Data access and persistence
- **Directories**: `src\components\sst`
- **Symbols**: 3 total, 0 exported


## Detected Design Patterns
| Pattern | Confidence | Locations | Description |
|---------|------------|-----------|-------------|
| Service Layer | 85% | `FacialRecognitionService` ([FacialRecognitionService.ts](src\utils\facial-recognition\FacialRecognitionService.ts)), `FaceApiService` ([FaceApiService.ts](src\utils\facial-recognition\FaceApiService.ts)) | Encapsulates business logic in service classes |

## Entry Points
- [`..\..\AppData\Local\Programs\Windsurf\supabase\functions\gerar-contas-recorrentes\index.ts`](..\..\AppData\Local\Programs\Windsurf\supabase\functions\gerar-contas-recorrentes\index.ts)
- [`..\..\AppData\Local\Programs\Windsurf\supabase\functions\admin-create-user\index.ts`](..\..\AppData\Local\Programs\Windsurf\supabase\functions\admin-create-user\index.ts)
- [`..\..\AppData\Local\Programs\Windsurf\src\utils\facial-recognition\index.ts`](..\..\AppData\Local\Programs\Windsurf\src\utils\facial-recognition\index.ts)
- [`..\..\AppData\Local\Programs\Windsurf\src\components\sst\toriq-training\index.ts`](..\..\AppData\Local\Programs\Windsurf\src\components\sst\toriq-training\index.ts)
- [`..\..\AppData\Local\Programs\Windsurf\src\components\sst\toriq-epi\index.ts`](..\..\AppData\Local\Programs\Windsurf\src\components\sst\toriq-epi\index.ts)
- [`..\..\AppData\Local\Programs\Windsurf\src\components\sst\toriq-corp\index.ts`](..\..\AppData\Local\Programs\Windsurf\src\components\sst\toriq-corp\index.ts)
- [`..\..\AppData\Local\Programs\Windsurf\src\components\shared\support\index.ts`](..\..\AppData\Local\Programs\Windsurf\src\components\shared\support\index.ts)
- [`..\..\AppData\Local\Programs\Windsurf\src\components\shared\notifications\index.ts`](..\..\AppData\Local\Programs\Windsurf\src\components\shared\notifications\index.ts)
- [`..\..\AppData\Local\Programs\Windsurf\src\main.tsx`](..\..\AppData\Local\Programs\Windsurf\src\main.tsx)
- [`..\..\AppData\Local\Programs\Windsurf\server.js`](..\..\AppData\Local\Programs\Windsurf\server.js)

## Public API
| Symbol | Type | Location |
| --- | --- | --- |
| [`AdminConfiguracoes`](src\components\admin\AdminConfiguracoes.tsx#L4) | function | src\components\admin\AdminConfiguracoes.tsx:4 |
| [`AdminSidebar`](src\components\admin\AdminSidebar.tsx#L62) | function | src\components\admin\AdminSidebar.tsx:62 |
| [`AlterarSenha`](src\pages\AlterarSenha.tsx#L12) | function | src\pages\AlterarSenha.tsx:12 |
| [`AlterarSenhaDialog`](src\components\shared\AlterarSenhaDialog.tsx#L25) | function | src\components\shared\AlterarSenhaDialog.tsx:25 |
| [`applyWhiteLabelConfig`](src\hooks\useWhiteLabel.tsx#L59) | function | src\hooks\useWhiteLabel.tsx:59 |
| [`AulaAgendada`](src\components\shared\AgendaTreinamentos.tsx#L25) | interface | src\components\shared\AgendaTreinamentos.tsx:25 |
| [`AuthProvider`](src\hooks\useAuth.tsx#L38) | function | src\hooks\useAuth.tsx:38 |
| [`BadgeProps`](src\components\ui\badge.tsx#L23) | interface | src\components\ui\badge.tsx:23 |
| [`ButtonProps`](src\components\ui\button.tsx#L33) | interface | src\components\ui\button.tsx:33 |
| [`calculateDistance`](src\lib\googleMapsService.ts#L195) | function | src\lib\googleMapsService.ts:195 |
| [`calculateDistancesFromInstructors`](src\lib\googleMapsService.ts#L243) | function | src\lib\googleMapsService.ts:243 |
| [`CalendarProps`](src\components\ui\calendar.tsx#L15) | type | src\components\ui\calendar.tsx:15 |
| [`CardMovimentacao`](src\hooks\useCardMovimentacoes.tsx#L5) | interface | src\hooks\useCardMovimentacoes.tsx:5 |
| [`CardMovimentacoesHistory`](src\components\shared\CardMovimentacoesHistory.tsx#L43) | function | src\components\shared\CardMovimentacoesHistory.tsx:43 |
| [`Cargo`](src\components\cliente\ClienteCargos.tsx#L40) | interface | src\components\cliente\ClienteCargos.tsx:40 |
| [`CBOOcupacao`](src\lib\cboService.ts#L3) | interface | src\lib\cboService.ts:3 |
| [`ChartConfig`](src\components\ui\chart.tsx#L9) | type | src\components\ui\chart.tsx:9 |
| [`Cidade`](src\lib\ibgeService.ts#L9) | interface | src\lib\ibgeService.ts:9 |
| [`clearDistanceCache`](src\lib\googleMapsService.ts#L103) | function | src\lib\googleMapsService.ts:103 |
| [`ClienteFinanceiro`](src\components\cliente\ClienteFinanceiro.tsx#L34) | function | src\components\cliente\ClienteFinanceiro.tsx:34 |
| [`ClienteSection`](src\pages\ClienteDashboard.tsx#L23) | type | src\pages\ClienteDashboard.tsx:23 |
| [`ClienteSidebar`](src\components\cliente\ClienteSidebar.tsx#L37) | function | src\components\cliente\ClienteSidebar.tsx:37 |
| [`cn`](src\lib\utils.ts#L4) | function | src\lib\utils.ts:4 |
| [`Colaborador`](src\components\cliente\ClienteColaboradores.tsx#L33) | interface | src\components\cliente\ClienteColaboradores.tsx:33 |
| [`ComparisonMetrics`](src\utils\facial-recognition\types.ts#L65) | interface | src\utils\facial-recognition\types.ts:65 |
| [`CurrentScreenProvider`](src\hooks\useCurrentScreen.tsx#L30) | function | src\hooks\useCurrentScreen.tsx:30 |
| [`DadosCustoMensal`](src\components\admin\CalculadoraCustoMensal.tsx#L22) | interface | src\components\admin\CalculadoraCustoMensal.tsx:22 |
| [`DetalhesTurma`](src\pages\modulos\DetalhesTurma.tsx#L53) | function | src\pages\modulos\DetalhesTurma.tsx:53 |
| [`DistanceProgressCallback`](src\lib\googleMapsService.ts#L239) | type | src\lib\googleMapsService.ts:239 |
| [`DistanceResult`](src\lib\googleMapsService.ts#L6) | interface | src\lib\googleMapsService.ts:6 |
| [`downloadPDF`](src\utils\pdfUtils.ts#L227) | function | src\utils\pdfUtils.ts:227 |
| [`EmpresaModeBanner`](src\components\admin\EmpresaModeBanner.tsx#L6) | function | src\components\admin\EmpresaModeBanner.tsx:6 |
| [`EmpresaModeProvider`](src\hooks\useEmpresaMode.tsx#L21) | function | src\hooks\useEmpresaMode.tsx:21 |
| [`Estado`](src\lib\ibgeService.ts#L3) | interface | src\lib\ibgeService.ts:3 |
| [`FaceApiResult`](src\utils\facial-recognition\FaceApiService.ts#L10) | interface | src\utils\facial-recognition\FaceApiService.ts:10 |
| [`FaceDetectionResult`](src\utils\facial-recognition\types.ts#L27) | interface | src\utils\facial-recognition\types.ts:27 |
| [`FaceDetector`](src\utils\facial-recognition\FaceDetector.ts#L10) | class | src\utils\facial-recognition\FaceDetector.ts:10 |
| [`FacialRecognitionService`](src\utils\facial-recognition\FacialRecognitionService.ts#L17) | class | src\utils\facial-recognition\FacialRecognitionService.ts:17 |
| [`FacialValidationResult`](src\utils\facial-recognition\types.ts#L50) | interface | src\utils\facial-recognition\types.ts:50 |
| [`formatDistance`](src\lib\googleMapsService.ts#L333) | function | src\lib\googleMapsService.ts:333 |
| [`generateCompactPDF`](src\utils\pdfUtils.ts#L100) | function | src\utils\pdfUtils.ts:100 |
| [`getCacheStats`](src\lib\googleMapsService.ts#L112) | function | src\lib\googleMapsService.ts:112 |
| [`getCBOByCodigo`](src\lib\cboService.ts#L34) | function | src\lib\cboService.ts:34 |
| [`getCidadesPorEstado`](src\lib\ibgeService.ts#L56) | function | src\lib\ibgeService.ts:56 |
| [`getEstados`](src\lib\ibgeService.ts#L19) | function | src\lib\ibgeService.ts:19 |
| [`getIdsTelasPorModulo`](src\config\modulosTelas.ts#L156) | function | src\config\modulosTelas.ts:156 |
| [`getModuloByNome`](src\config\modulosTelas.ts#L161) | function | src\config\modulosTelas.ts:161 |
| [`getTodasTelasPorModulo`](src\config\modulosTelas.ts#L139) | function | src\config\modulosTelas.ts:139 |
| [`GrupoAcesso`](src\hooks\useHierarquia.tsx#L5) | type | src\hooks\useHierarquia.tsx:5 |
| [`ImageAnalysis`](src\utils\facial-recognition\types.ts#L12) | interface | src\utils\facial-recognition\types.ts:12 |
| [`ImageProcessor`](src\utils\facial-recognition\ImageProcessor.ts#L9) | class | src\utils\facial-recognition\ImageProcessor.ts:9 |
| [`InstrutorAgendaTreinamentos`](src\components\instrutor\InstrutorAgendaTreinamentos.tsx#L11) | function | src\components\instrutor\InstrutorAgendaTreinamentos.tsx:11 |
| [`InstrutorSection`](src\components\instrutor\InstrutorSidebar.tsx#L19) | type | src\components\instrutor\InstrutorSidebar.tsx:19 |
| [`InstrutorSidebar`](src\components\instrutor\InstrutorSidebar.tsx#L35) | function | src\components\instrutor\InstrutorSidebar.tsx:35 |
| [`KanbanTipo`](src\hooks\useCardMovimentacoes.tsx#L24) | type | src\hooks\useCardMovimentacoes.tsx:24 |
| [`loadAndApplyWhiteLabelConfig`](src\hooks\useWhiteLabel.tsx#L133) | function | src\hooks\useWhiteLabel.tsx:133 |
| [`ModuloConfig`](src\config\modulosTelas.ts#L19) | interface | src\config\modulosTelas.ts:19 |
| [`ModulosAtivosProvider`](src\hooks\useModulosAtivos.tsx#L38) | function | src\hooks\useModulosAtivos.tsx:38 |
| [`Notificacao`](src\hooks\useNotificacoes.tsx#L6) | interface | src\hooks\useNotificacoes.tsx:6 |
| [`NotificationItem`](src\components\shared\notifications\NotificationItem.tsx#L92) | function | src\components\shared\notifications\NotificationItem.tsx:92 |
| [`ParceiraAgenda`](src\components\parceira\ParceiraAgenda.tsx#L7) | function | src\components\parceira\ParceiraAgenda.tsx:7 |
| [`ParceiraSidebar`](src\components\parceira\ParceiraSidebar.tsx#L26) | function | src\components\parceira\ParceiraSidebar.tsx:26 |
| [`PDFGenerationOptions`](src\utils\pdfUtils.ts#L13) | interface | src\utils\pdfUtils.ts:13 |
| [`PDFResult`](src\utils\pdfUtils.ts#L28) | interface | src\utils\pdfUtils.ts:28 |
| [`PermissaoBadge`](src\hooks\useTelaPermissoes.tsx#L112) | function | src\hooks\useTelaPermissoes.tsx:112 |
| [`ProcessingLog`](src\utils\facial-recognition\types.ts#L5) | interface | src\utils\facial-recognition\types.ts:5 |
| [`searchCBO`](src\lib\cboService.ts#L13) | function | src\lib\cboService.ts:13 |
| [`Setor`](src\components\cliente\ClienteSetores.tsx#L40) | interface | src\components\cliente\ClienteSetores.tsx:40 |
| [`SSTCadastros`](src\components\sst\SSTCadastros.tsx#L4) | function | src\components\sst\SSTCadastros.tsx:4 |
| [`SSTPerfilEmpresa`](src\components\sst\SSTPerfilEmpresa.tsx#L30) | function | src\components\sst\SSTPerfilEmpresa.tsx:30 |
| [`TelaMódulo`](src\config\modulosTelas.ts#L11) | interface | src\config\modulosTelas.ts:11 |
| [`TextareaProps`](src\components\ui\textarea.tsx#L5) | interface | src\components\ui\textarea.tsx:5 |
| [`Toaster`](src\components\ui\toaster.tsx#L4) | function | src\components\ui\toaster.tsx:4 |
| [`ToriqCorpAdministrativo`](src\components\sst\toriq-corp\ToriqCorpAdministrativo.tsx#L8) | function | src\components\sst\toriq-corp\ToriqCorpAdministrativo.tsx:8 |
| [`ToriqCorpComercial`](src\components\sst\toriq-corp\ToriqCorpComercial.tsx#L8) | function | src\components\sst\toriq-corp\ToriqCorpComercial.tsx:8 |
| [`ToriqCorpContasPagar`](src\components\sst\toriq-corp\ToriqCorpContasPagar.tsx#L3) | function | src\components\sst\toriq-corp\ToriqCorpContasPagar.tsx:3 |
| [`ToriqCorpContasReceber`](src\components\sst\toriq-corp\ToriqCorpContasReceber.tsx#L3) | function | src\components\sst\toriq-corp\ToriqCorpContasReceber.tsx:3 |
| [`ToriqCorpContratos`](src\components\sst\toriq-corp\ToriqCorpContratos.tsx#L50) | function | src\components\sst\toriq-corp\ToriqCorpContratos.tsx:50 |
| [`ToriqCorpFinanceiroCadastros`](src\components\sst\toriq-corp\ToriqCorpFinanceiroCadastros.tsx#L3) | function | src\components\sst\toriq-corp\ToriqCorpFinanceiroCadastros.tsx:3 |
| [`ToriqCorpMarketing`](src\components\sst\toriq-corp\ToriqCorpMarketing.tsx#L8) | function | src\components\sst\toriq-corp\ToriqCorpMarketing.tsx:8 |
| [`ToriqCorpTecnico`](src\components\sst\toriq-corp\ToriqCorpTecnico.tsx#L4) | function | src\components\sst\toriq-corp\ToriqCorpTecnico.tsx:4 |
| [`ToriqEPIDevolucoes`](src\components\sst\toriq-epi\ToriqEPIDevolucoes.tsx#L7) | function | src\components\sst\toriq-epi\ToriqEPIDevolucoes.tsx:7 |
| [`ToriqEPIFicha`](src\components\sst\toriq-epi\ToriqEPIFicha.tsx#L7) | function | src\components\sst\toriq-epi\ToriqEPIFicha.tsx:7 |
| [`ToriqEPIRelatorios`](src\components\sst\toriq-epi\ToriqEPIRelatorios.tsx#L5) | function | src\components\sst\toriq-epi\ToriqEPIRelatorios.tsx:5 |
| [`TurmaAgenda`](src\components\shared\AgendaTreinamentos.tsx#L33) | interface | src\components\shared\AgendaTreinamentos.tsx:33 |
| [`useAuth`](src\hooks\useAuth.tsx#L471) | function | src\hooks\useAuth.tsx:471 |
| [`useCardMovimentacoes`](src\hooks\useCardMovimentacoes.tsx#L61) | function | src\hooks\useCardMovimentacoes.tsx:61 |
| [`useCurrentScreen`](src\hooks\useCurrentScreen.tsx#L187) | function | src\hooks\useCurrentScreen.tsx:187 |
| [`useEmpresaEfetiva`](src\hooks\useEmpresaMode.tsx#L70) | function | src\hooks\useEmpresaMode.tsx:70 |
| [`useEmpresaMode`](src\hooks\useEmpresaMode.tsx#L61) | function | src\hooks\useEmpresaMode.tsx:61 |
| [`useHierarquia`](src\hooks\useHierarquia.tsx#L35) | function | src\hooks\useHierarquia.tsx:35 |
| [`useIsMobile`](src\hooks\use-mobile.tsx#L5) | function | src\hooks\use-mobile.tsx:5 |
| [`useModulosAtivos`](src\hooks\useModulosAtivos.tsx#L150) | function | src\hooks\useModulosAtivos.tsx:150 |
| [`useNotificacoes`](src\hooks\useNotificacoes.tsx#L35) | function | src\hooks\useNotificacoes.tsx:35 |
| [`usePermissoes`](src\hooks\usePermissoes.tsx#L95) | function | src\hooks\usePermissoes.tsx:95 |
| [`useTelaPermissoes`](src\hooks\useTelaPermissoes.tsx#L38) | function | src\hooks\useTelaPermissoes.tsx:38 |
| [`useWhiteLabel`](src\hooks\useWhiteLabel.tsx#L146) | function | src\hooks\useWhiteLabel.tsx:146 |

## Internal System Boundaries

Document seams between domains, bounded contexts, or service ownership. Note data ownership, synchronization strategies, and shared contract enforcement.

## External Service Dependencies

List SaaS platforms, third-party APIs, or infrastructure services the system relies on. Describe authentication methods, rate limits, and failure considerations for each dependency.

## Key Decisions & Trade-offs

Summarize architectural decisions, experiments, or ADR outcomes that shape the current design. Reference supporting documents and explain why selected approaches won over alternatives.

## Diagrams

Link architectural diagrams or add mermaid definitions here.

## Risks & Constraints

Document performance constraints, scaling considerations, or external system assumptions.

## Top Directories Snapshot
- `AGENTS.md/` — approximately 1 files
- `ANALISE_COMPLETA_SISTEMA.md/` — approximately 1 files
- `bun.lockb/` — approximately 1 files
- `components.json/` — approximately 1 files
- `DEPLOYMENT_FIX.md/` — approximately 1 files
- `doc/` — approximately 10 files
- `Dockerfile/` — approximately 1 files
- `docs/` — approximately 8 files
- `DOCUMENTACAO_SISTEMA_RELATORIOS.md/` — approximately 1 files
- `DOCUMENTACAO_SISTEMA.md/` — approximately 1 files
- `eslint.config.js/` — approximately 1 files
- `index.html/` — approximately 1 files
- `migration_quantidade_kit.sql/` — approximately 1 files
- `modelos-nao-alterar/` — approximately 5 files
- `nginx.conf/` — approximately 1 files
- `ngrok.exe/` — approximately 1 files
- `package-lock.json/` — approximately 1 files
- `package.json/` — approximately 1 files
- `plan.md/` — approximately 1 files
- `postcss.config.js/` — approximately 1 files
- `public/` — approximately 11 files
- `README.md/` — approximately 1 files
- `Relatório Esqueleto.docx/` — approximately 1 files
- `relatorio_GAL007-NR6_6 (1).pdf/` — approximately 1 files
- `server.cjs/` — approximately 1 files
- `server.js/` — approximately 1 files
- `sistema_relatorios.puml/` — approximately 1 files
- `src/` — approximately 277 files
- `supabase/` — approximately 192 files
- `tailwind.config.ts/` — approximately 1 files
- `tsconfig.app.json/` — approximately 1 files
- `tsconfig.json/` — approximately 1 files
- `tsconfig.node.json/` — approximately 1 files
- `vite.config.ts/` — approximately 1 files
- `vite.config.ts.timestamp-1767519244335-55912be1b97238.mjs/` — approximately 1 files

## Related Resources

- [Project Overview](./project-overview.md)
- Update [agents/README.md](../agents/README.md) when architecture changes.
