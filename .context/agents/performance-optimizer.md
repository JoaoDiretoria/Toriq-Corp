---
name: Performance Optimizer
description: Identify performance bottlenecks
status: unfilled
generated: 2026-01-20
---

# Performance Optimizer Agent Playbook

## Mission
Describe how the performance optimizer agent supports the team and when to engage it.

## Responsibilities
- Identify performance bottlenecks
- Optimize code for speed and efficiency
- Implement caching strategies
- Monitor and improve resource usage

## Best Practices
- Measure before optimizing
- Focus on actual bottlenecks
- Don't sacrifice readability unnecessarily

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Agent knowledge base: [AGENTS.md](../../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Repository Starting Points
- `doc/` — TODO: Describe the purpose of this directory.
- `docs/` — TODO: Describe the purpose of this directory.
- `modelos-nao-alterar/` — TODO: Describe the purpose of this directory.
- `public/` — TODO: Describe the purpose of this directory.
- `src/` — TODO: Describe the purpose of this directory.
- `supabase/` — TODO: Describe the purpose of this directory.

## Key Files
**Entry Points:**
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

**Pattern Implementations:**
- Service Layer: [`FacialRecognitionService`](src\utils\facial-recognition\FacialRecognitionService.ts), [`FaceApiService`](src\utils\facial-recognition\FaceApiService.ts)

**Service Files:**
- [`FacialRecognitionService`](src\utils\facial-recognition\FacialRecognitionService.ts#L17)

## Architecture Context

### Config
Configuration and constants
- **Directories**: `.`, `src\config`
- **Symbols**: 5 total
- **Key exports**: [`TelaMódulo`](src\config\modulosTelas.ts#L11), [`ModuloConfig`](src\config\modulosTelas.ts#L19), [`getTodasTelasPorModulo`](src\config\modulosTelas.ts#L139), [`getIdsTelasPorModulo`](src\config\modulosTelas.ts#L156), [`getModuloByNome`](src\config\modulosTelas.ts#L161)

### Utils
Shared utilities and helpers
- **Directories**: `src\utils`, `src\lib`, `src\utils\facial-recognition`, `src\components\shared\support`, `src\components\shared\notifications`, `src\pages\shared`, `src\components\shared`
- **Symbols**: 26 total
- **Key exports**: [`PDFGenerationOptions`](src\utils\pdfUtils.ts#L13), [`PDFResult`](src\utils\pdfUtils.ts#L28), [`generateCompactPDF`](src\utils\pdfUtils.ts#L100), [`downloadPDF`](src\utils\pdfUtils.ts#L227), [`cn`](src\lib\utils.ts#L4), [`ProcessingLog`](src\utils\facial-recognition\types.ts#L5), [`ImageAnalysis`](src\utils\facial-recognition\types.ts#L12), [`FaceDetectionResult`](src\utils\facial-recognition\types.ts#L27), [`FacialValidationResult`](src\utils\facial-recognition\types.ts#L50), [`ComparisonMetrics`](src\utils\facial-recognition\types.ts#L65), [`ImageProcessor`](src\utils\facial-recognition\ImageProcessor.ts#L9), [`FaceDetector`](src\utils\facial-recognition\FaceDetector.ts#L10), [`CardMovimentacoesHistory`](src\components\shared\CardMovimentacoesHistory.tsx#L43), [`AlterarSenhaDialog`](src\components\shared\AlterarSenhaDialog.tsx#L25), [`AulaAgendada`](src\components\shared\AgendaTreinamentos.tsx#L25), [`TurmaAgenda`](src\components\shared\AgendaTreinamentos.tsx#L33), [`NotificationItem`](src\components\shared\notifications\NotificationItem.tsx#L92)

### Services
Business logic and orchestration
- **Directories**: `src\lib`, `src\utils\facial-recognition`
- **Symbols**: 29 total
- **Key exports**: [`Estado`](src\lib\ibgeService.ts#L3), [`Cidade`](src\lib\ibgeService.ts#L9), [`getEstados`](src\lib\ibgeService.ts#L19), [`getCidadesPorEstado`](src\lib\ibgeService.ts#L56), [`DistanceResult`](src\lib\googleMapsService.ts#L6), [`clearDistanceCache`](src\lib\googleMapsService.ts#L103), [`getCacheStats`](src\lib\googleMapsService.ts#L112), [`calculateDistance`](src\lib\googleMapsService.ts#L195), [`DistanceProgressCallback`](src\lib\googleMapsService.ts#L239), [`calculateDistancesFromInstructors`](src\lib\googleMapsService.ts#L243), [`formatDistance`](src\lib\googleMapsService.ts#L333), [`CBOOcupacao`](src\lib\cboService.ts#L3), [`searchCBO`](src\lib\cboService.ts#L13), [`getCBOByCodigo`](src\lib\cboService.ts#L34), [`FacialRecognitionService`](src\utils\facial-recognition\FacialRecognitionService.ts#L17), [`FaceApiResult`](src\utils\facial-recognition\FaceApiService.ts#L10)

### Components
UI components and views
- **Directories**: `src\components\ui`, `src\components\sst\toriq-training`, `src\components\sst\toriq-epi`, `src\components\sst\toriq-corp`, `src\pages`, `src\hooks`, `src\components`, `src\pages\relatorio`, `src\pages\public`, `src\pages\modulos`, `src\pages\instrutor`, `src\pages\cliente`, `src\pages\certificado`, `src\components\turma`, `src\components\sst`, `src\components\parceira`, `src\components\instrutor`, `src\components\cliente`, `src\components\avaliacao`, `src\components\admin`, `src\components\sst\cadastros`, `src\components\sst\toriq-corp\configuracoes`
- **Symbols**: 210 total
- **Key exports**: [`ClienteSection`](src\pages\ClienteDashboard.tsx#L23), [`AlterarSenha`](src\pages\AlterarSenha.tsx#L12), [`CurrentScreenProvider`](src\hooks\useCurrentScreen.tsx#L30), [`useCurrentScreen`](src\hooks\useCurrentScreen.tsx#L187), [`DetalhesTurma`](src\pages\modulos\DetalhesTurma.tsx#L53), [`Toaster`](src\components\ui\toaster.tsx#L4), [`TextareaProps`](src\components\ui\textarea.tsx#L5), [`ChartConfig`](src\components\ui\chart.tsx#L9), [`CalendarProps`](src\components\ui\calendar.tsx#L15), [`ButtonProps`](src\components\ui\button.tsx#L33), [`BadgeProps`](src\components\ui\badge.tsx#L23), [`SSTPerfilEmpresa`](src\components\sst\SSTPerfilEmpresa.tsx#L30), [`SSTCadastros`](src\components\sst\SSTCadastros.tsx#L4), [`ParceiraSidebar`](src\components\parceira\ParceiraSidebar.tsx#L26), [`ParceiraAgenda`](src\components\parceira\ParceiraAgenda.tsx#L7), [`InstrutorSection`](src\components\instrutor\InstrutorSidebar.tsx#L19), [`InstrutorSidebar`](src\components\instrutor\InstrutorSidebar.tsx#L35), [`InstrutorAgendaTreinamentos`](src\components\instrutor\InstrutorAgendaTreinamentos.tsx#L11), [`ClienteSidebar`](src\components\cliente\ClienteSidebar.tsx#L37), [`Setor`](src\components\cliente\ClienteSetores.tsx#L40), [`ClienteFinanceiro`](src\components\cliente\ClienteFinanceiro.tsx#L34), [`Colaborador`](src\components\cliente\ClienteColaboradores.tsx#L33), [`Cargo`](src\components\cliente\ClienteCargos.tsx#L40), [`EmpresaModeBanner`](src\components\admin\EmpresaModeBanner.tsx#L6), [`DadosCustoMensal`](src\components\admin\CalculadoraCustoMensal.tsx#L22), [`AdminSidebar`](src\components\admin\AdminSidebar.tsx#L62), [`AdminConfiguracoes`](src\components\admin\AdminConfiguracoes.tsx#L4), [`ToriqEPIRelatorios`](src\components\sst\toriq-epi\ToriqEPIRelatorios.tsx#L5), [`ToriqEPIFicha`](src\components\sst\toriq-epi\ToriqEPIFicha.tsx#L7), [`ToriqEPIDevolucoes`](src\components\sst\toriq-epi\ToriqEPIDevolucoes.tsx#L7), [`ToriqCorpTecnico`](src\components\sst\toriq-corp\ToriqCorpTecnico.tsx#L4), [`ToriqCorpMarketing`](src\components\sst\toriq-corp\ToriqCorpMarketing.tsx#L8), [`ToriqCorpFinanceiroCadastros`](src\components\sst\toriq-corp\ToriqCorpFinanceiroCadastros.tsx#L3), [`ToriqCorpContratos`](src\components\sst\toriq-corp\ToriqCorpContratos.tsx#L50), [`ToriqCorpContasReceber`](src\components\sst\toriq-corp\ToriqCorpContasReceber.tsx#L3), [`ToriqCorpContasPagar`](src\components\sst\toriq-corp\ToriqCorpContasPagar.tsx#L3), [`ToriqCorpComercial`](src\components\sst\toriq-corp\ToriqCorpComercial.tsx#L8), [`ToriqCorpAdministrativo`](src\components\sst\toriq-corp\ToriqCorpAdministrativo.tsx#L8)

### Repositories
Data access and persistence
- **Directories**: `src\components\sst`
- **Symbols**: 3 total
## Key Symbols for This Agent
- [`isCacheExpired`](src\lib\googleMapsService.ts#L24) (function)
- [`loadCacheFromStorage`](src\lib\googleMapsService.ts#L31) (function)
- [`saveCacheToStorage`](src\lib\googleMapsService.ts#L54) (function)
- [`clearOldCaches`](src\lib\googleMapsService.ts#L71) (function)
- [`saveGeocodeCache`](src\lib\googleMapsService.ts#L93) (function)
- [`saveDistanceCache`](src\lib\googleMapsService.ts#L98) (function)
- [`clearDistanceCache`](src\lib\googleMapsService.ts#L103) (function)
- [`getCacheStats`](src\lib\googleMapsService.ts#L112) (function)

## Documentation Touchpoints
- [Documentation Index](../docs/README.md)
- [Project Overview](../docs/project-overview.md)
- [Architecture Notes](../docs/architecture.md)
- [Development Workflow](../docs/development-workflow.md)
- [Testing Strategy](../docs/testing-strategy.md)
- [Glossary & Domain Concepts](../docs/glossary.md)
- [Data Flow & Integrations](../docs/data-flow.md)
- [Security & Compliance Notes](../docs/security.md)
- [Tooling & Productivity Guide](../docs/tooling.md)

## Collaboration Checklist

1. Confirm assumptions with issue reporters or maintainers.
2. Review open pull requests affecting this area.
3. Update the relevant doc section listed above.
4. Capture learnings back in [docs/README.md](../docs/README.md).

## Hand-off Notes

Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes its work.
