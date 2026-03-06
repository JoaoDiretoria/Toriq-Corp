---
status: unfilled
generated: 2026-01-20
---

# Data Flow & Integrations

Explain how data enters, moves through, and exits the system, including interactions with external services.

## Module Dependencies
- **src\utils\facial-recognition\ImageProcessor.ts/** → `src\utils\facial-recognition\types.ts`
- **src\utils\facial-recognition\FacialRecognitionService.ts/** → `src\utils\facial-recognition\FaceDetector.ts`, `src\utils\facial-recognition\ImageProcessor.ts`, `src\utils\facial-recognition\types.ts`
- **src\utils\facial-recognition\FaceDetector.ts/** → `src\utils\facial-recognition\types.ts`
- **src\integrations\supabase\client.ts/** → `src\integrations\supabase\types.ts`
- **src\main.tsx/** → `src\App.tsx`, `src\index.css`
- **src\App.tsx/** → `src\components\parceira\ParceiraVisualizarTurma.tsx`, `src\components\shared\support\index.ts`, `src\pages\AdminDashboard.tsx`, `src\pages\AlterarSenha.tsx`, `src\pages\Auth.tsx`, `src\pages\ClienteDashboard.tsx`, `src\pages\Dashboard.tsx`, `src\pages\Index.tsx`, `src\pages\ModuloPage.tsx`, `src\pages\NotFound.tsx`, `src\pages\ParceiraDashboard.tsx`, `src\pages\ResetPassword.tsx`, `src\pages\SSTDashboard.tsx`, `src\pages\certificado\VisualizarCertificado.tsx`, `src\pages\cliente\ClienteVisualizarTurma.tsx`, `src\pages\instrutor\InstrutorDashboard.tsx`, `src\pages\instrutor\InstrutorGerenciarTurma.tsx`, `src\pages\modulos\AvaliacaoReacao.tsx`, `src\pages\modulos\ColaboradorDetalhes.tsx`, `src\pages\modulos\DetalhesTurma.tsx`, `src\pages\modulos\GerenciarTurma.tsx`, `src\pages\modulos\GestaoEPI.tsx`, `src\pages\modulos\GestaoTerceiros.tsx`, `src\pages\modulos\GestaoTreinamentos.tsx`, `src\pages\modulos\GestaoTurmas.tsx`, `src\pages\modulos\SaudeOcupacional.tsx`, `src\pages\public\CadastroColaboradorTurma.tsx`, `src\pages\public\CadastroInstrutor.tsx`, `src\pages\public\MarcarPresencaTurma.tsx`, `src\pages\public\PropostaWeb.tsx`, `src\pages\public\ProvaTurma.tsx`, `src\pages\relatorio\VisualizarRelatorio.tsx`, `src\pages\relatorio\VisualizarRelatorioPresencas.tsx`, `src\pages\relatorio\VisualizarRelatorioSinistros.tsx`, `src\pages\shared\SuporteTickets.tsx`
- **src\hooks\useTelaPermissoes.tsx/** → `src\hooks\use-toast.ts`, `src\hooks\usePermissoes.tsx`
- **src\hooks\useCardMovimentacoes.tsx/** → `src\hooks\useAuth.tsx`
- **src\components\turma\ColaboradoresPendentesList.tsx/** → `src\components\turma\ColaboradorPendenteCard.tsx`
- **src\components\sst\SSTNormasRegulamentadoras.tsx/** → `src\components\sst\NRDialog.tsx`, `src\components\sst\NRImportCSV.tsx`
- **src\components\sst\SSTCadastros.tsx/** → `src\components\sst\SSTClientes.tsx`
- **src\components\cliente\ClienteColaboradores.tsx/** → `src\components\cliente\ColaboradorDialog.tsx`, `src\components\cliente\ColaboradorImportCSV.tsx`
- **src\components\sst\toriq-corp\ToriqCorpMarketing.tsx/** → `src\components\sst\toriq-corp\SetorDashboard.tsx`
- **src\components\sst\toriq-corp\ToriqCorpContratos.tsx/** → `src\components\sst\toriq-corp\ElaborarContrato.tsx`
- **src\components\sst\toriq-corp\ToriqCorpContasPagar.tsx/** → `src\components\sst\toriq-corp\SSTContasPagar.tsx`
- **src\components\sst\toriq-corp\ToriqCorpConfiguracoes.tsx/** → `src\components\sst\toriq-corp\configuracoes\Automacoes.tsx`, `src\components\sst\toriq-corp\configuracoes\FunisFluxoTrabalho.tsx`
- **src\components\sst\toriq-corp\ToriqCorpComercial.tsx/** → `src\components\sst\toriq-corp\SetorDashboard.tsx`
- **src\components\sst\toriq-corp\ToriqCorpAdministrativo.tsx/** → `src\components\sst\toriq-corp\SetorDashboard.tsx`
- **src\components\sst\toriq-corp\FunilPage.tsx/** → `src\components\sst\toriq-corp\configuracoes\FunilConfigDialog.tsx`
- **src\components\shared\notifications\NotificationPopover.tsx/** → `src\components\shared\notifications\NotificationItem.tsx`

## Service Layer
- [`FacialRecognitionService`](src\utils\facial-recognition\FacialRecognitionService.ts#L17)

## High-level Flow

Summarize the primary pipeline from input to output. Reference diagrams or embed Mermaid definitions when available.

## Internal Movement

Describe how modules within `AGENTS.md`, `ANALISE_COMPLETA_SISTEMA.md`, `bun.lockb`, `components.json`, `DEPLOYMENT_FIX.md`, `doc`, `Dockerfile`, `docs`, `DOCUMENTACAO_SISTEMA_RELATORIOS.md`, `DOCUMENTACAO_SISTEMA.md`, `eslint.config.js`, `index.html`, `migration_quantidade_kit.sql`, `modelos-nao-alterar`, `nginx.conf`, `ngrok.exe`, `package-lock.json`, `package.json`, `plan.md`, `postcss.config.js`, `public`, `README.md`, `Relatório Esqueleto.docx`, `relatorio_GAL007-NR6_6 (1).pdf`, `server.cjs`, `server.js`, `sistema_relatorios.puml`, `src`, `supabase`, `tailwind.config.ts`, `tsconfig.app.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vite.config.ts.timestamp-1767519244335-55912be1b97238.mjs` collaborate (queues, events, RPC calls, shared databases).

## External Integrations

Document each integration with purpose, authentication, payload shapes, and retry strategy.

## Observability & Failure Modes

Describe metrics, traces, or logs that monitor the flow. Note backoff, dead-letter, or compensating actions when downstream systems fail.
