# Contexto Ativo

**Última atualização:** 14/06/2026 16:45
**Projeto Supabase:** `bsvtgdtsbrjdwdnpirzb` (Torq Corp - us-east-2 - ACTIVE_HEALTHY)

## Stack Técnico
| Categoria | Tecnologias |
|-----------|-------------|
| **Frontend** | React + TypeScript, Vite, TailwindCSS |
| **Backend** | Supabase (PostgreSQL 17.6, Edge Functions) |
| **Package Manager** | Bun |
| **Containerização** | Docker |
| **Total Arquivos** | 532 (251 .tsx, 190 .sql, 27 .ts) |

## Arquitetura do Código
| Camada | Símbolos | Descrição |
|--------|----------|-----------|
| Config | 5 | Configurações e constantes (`src/config/`) |
| Services | 29 | Lógica de negócio (`src/lib/`, `src/utils/`) |
| Components | 212 | UI e views (`src/components/`, `src/pages/`) |
| Utils | 26 | Helpers compartilhados |
| Repositories | 3 | Acesso a dados |

## Banco de Dados Supabase
**Total: 186 tabelas** no schema `public`. Principais domínios:

| Domínio | Tabelas | Exemplos |
|---------|---------|----------|
| **Colaboradores/RH** | ~15 | `colaboradores` (60 cols), `cargos`, `setores` |
| **Treinamentos** | ~20 | `turmas_treinamento`, `catalogo_treinamentos`, `provas_*` |
| **EPI/Equipamentos** | ~15 | `cadastro_epis`, `estoque_epis`, `entregas_epis` |
| **Financeiro** | ~20 | `contas_pagar`, `contas_receber`, `contratos` |
| **CRM/Funis** | ~25 | `funil_cards`, `prospeccao_*`, `closer_*`, `pos_venda_*` |
| **SST/Clientes** | ~10 | `clientes_sst`, `unidades_clientes`, `empresas` |
| **Suporte** | ~5 | `tickets_suporte`, `notificacoes` |

## Status Atual
✅ **Fases 1-15 aplicadas com sucesso** (Segurança + Performance)

### Atualizações recentes (23/01/2026 13:07)
- Tema TORIQ aplicado em telas principais: paleta verde (primary #16E17A, secondary #0B5D4A), contraste ajustado em `index.css`.
- Logos: AdminSidebar e Auth exibem logotipo preto horizontal (`/IDTORIQCOMPLETA/LOGO PNG/PRETA-HORIZONTAL.png`).
- Botões com texto branco invisível corrigidos: Dashboard (Novo Lead), AdminServicos (Novo Serviço), AdminColaboradores (Novo Colaborador) com primário sólido.
- Gradiente primário migrado para verde (primary→secondary) em `index.css`.

### Atualizações recentes (23/01/2026 13:22)
- Sidebar: ícones agora herdam a cor do texto nos estados inativo/hover/ativo (`SidebarMenuButton`/`SidebarMenuSubButton`).
- Auth: link para voltar à landing (`/`) adicionado; logo ampliada para `h-24`.
- Landing (Index): removido card de paleta e textos do hero; aplicado vídeo de fundo `LOGO2.mp4` com overlay; altura do hero aumentada (`min-h-[70vh]`/`80vh`).

### Funcionalidade Implementada - Sistema de Notificação de Atualizações
| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useSystemUpdates.tsx` | Hook para buscar atualizações pendentes e marcar como vistas |
| `src/components/shared/UpdateNotificationPopup.tsx` | Popup global com changelog |
| `src/App.tsx` | Integração do popup global |
| `supabase/migrations/20260122221600_create_system_updates_notification.sql` | Migration das tabelas |

**Tabelas criadas:**
- `system_updates` - Armazena versões e changelog
- `user_update_views` - Rastreia quais usuários já viram cada atualização

### Resumo das Fases
| Fase | Tipo | Descrição | Status |
|------|------|-----------|--------|
| 1-2 | Segurança | RLS + Functions corrigidas | ✅ |
| 3-4 | Segurança | Policies restritivas + admin_vertical | ✅ |
| 5 | Segurança | View INVOKER + colaboradores_treinamentos_datas | ✅ |
| 6 | Performance | ~100 índices em FKs | ✅ |
| 7 | Performance | ~832 policies otimizadas (auth_rls_initplan) | ✅ |
| 8 | Performance | ~70 índices removidos + ~28 FKs recriados | ✅ |
| 9 | Performance | ~35 policies consolidadas (multiple_permissive) | ✅ |
| 10 | Seg+Perf | 2 policies corrigidas + 9 índices em FKs | ✅ |
| 11 | Performance | ~62 policies consolidadas (174→112 duplicadas) | ✅ |
| 12 | Performance | ~39 policies consolidadas (112→73 duplicadas) | ✅ |
| 13 | Segurança | Corrigir policies "always true" (14→1 issues) | ✅ |
| 14 | Performance | **ZERO Multiple Permissive Policies** (174→0) | ✅ |
| 15 | Performance | Remover policies Admin duplicadas | ✅ |

### Issues Restantes - APENAS CONFIG
- **Segurança (1 WARN):**
  - 1 config Auth (Leaked Password Protection) - **habilitar no Dashboard Supabase**
- **Performance (INFO only - não impactam):**
  - Unused Indexes - Índices necessários para FKs, ainda não usados pelo sistema
  - auth_db_connections_absolute - Config opcional no Dashboard
- **Multiple Permissive Policies: ZERO** ✅
- **RLS Security Issues: ZERO** ✅

## Arquivos/Migrations Aplicadas (Fases 11-15)
- Múltiplas migrations aplicadas via MCP para consolidar ~200+ policies
- Índices criados/recriados para FKs (~150)

### Assinatura Digital ICP-Brasil (17/02/2026)
| Componente | Descrição | Status |
|-----------|-----------|--------|
| `backend-esocial/services/pdfSignatureService.ts` | Assina PDF com certificado A1 (node-forge + @signpdf) | ✅ |
| `backend-esocial/routes/pdfSignatureRoutes.ts` | Endpoints: `/pdf/sign`, `/pdf/validate-certificate`, `/pdf/certificate-info/:empresaId` | ✅ |
| `src/services/pdfSignatureService.ts` | Cliente frontend que chama o backend | ✅ |
| `src/components/sst/CertificadoA1Config.tsx` | UI para configurar certificado A1 (colapsável + badge status) | ✅ |
| `src/components/sst/SSTConfiguracoes.tsx` | Seções gov.br e eSocial colapsáveis com chevron e badge | ✅ |
| `src/pages/certificado/VisualizarCertificado.tsx` | Assinatura individual + **lote** + badge ICP-Brasil | ✅ |
| `src/pages/public/ValidacaoDigitalCertificado.tsx` | Badge ICP-Brasil na página pública | ✅ |
| Edge function `validacao-digital-certificado` | **PENDENTE**: adicionar `observacoes` ao SELECT | ⏳ |

### Refatoração: Cliente Detalhes - Dialog → Página (23/02/2026)
| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `src/components/sst/ClienteDetalhesDialog.tsx` | Refatorado: conteúdo extraído em `ClienteDetalhesContent` (export), wrapper `ClienteDetalhesDialog` mantido para compatibilidade | ✅ |
| `src/pages/sst/ClienteDetalhesPage.tsx` | Nova página dedicada que busca cliente por ID e renderiza `ClienteDetalhesContent` | ✅ |
| `src/App.tsx` | Rota `/sst/cliente/:clienteId` adicionada | ✅ |
| `src/components/sst/SSTClientes.tsx` | Click no nome da empresa agora navega para página ao invés de abrir dialog | ✅ |

### Sistema de Agenda com Compartilhamento (15/03/2026)
| Componente | Descrição | Status |
|-----------|-----------|--------|
| `supabase/migrations/20260315_create_agenda_system.sql` | Tabelas `agenda_eventos` + `agenda_compartilhamentos` com RLS completo | ✅ |
| `src/components/shared/Agenda.tsx` | Componente completo: vis. Mês/Semana/Dia/Lista, criar/editar/excluir evento, compartilhar com colaboradores, filtros | ✅ |
| `src/components/sst/SSTSidebar.tsx` | Item "Agenda" adicionado em "Perfil da Empresa" + QuickSearch | ✅ |
| `src/components/admin/AdminSidebar.tsx` | Item "Agenda" adicionado após "Tarefas" | ✅ |
| `src/pages/SSTDashboard.tsx` | Case `agenda` renderiza `<Agenda />` | ✅ |
| `src/pages/AdminDashboard.tsx` | Case `agenda` renderiza `<Agenda modoAdmin={true} />` (admin vê tudo) | ✅ |

**Regras de visibilidade da Agenda:**
- `privado` — só o criador vê
- `compartilhado` — criador seleciona colaboradores individualmente
- `empresa` — todos da empresa veem
- Admin (`empresa_sst`, `admin_vertical`, `cliente_final` sem setor) vê todos os eventos da empresa

### Correções da sessão (14/06/2026)
| Arquivo/Banco | Correção | Status |
|---------------|----------|--------|
| `apps/api/app/core/config.py` | Corrigido erro de indentação (`IndentationError`) na variável `sentry_api_token` que impedia a API de iniciar | ✅ |
| `apps/api/uv.lock` | Corrigidas dependências duplicadas do `sentry-sdk` que impediam a compilação do backend com `uv sync` | ✅ |
| `src/components/admin/AdminSentryPanel.tsx` | Corrigidos erros de sintaxe JSX que quebravam o build (tags fechadas incorretamente, como `</CardTitle>CardTitle>`) | ✅ |
| `profiles` RLS | Policy `profiles_update_own` — authenticated atualiza próprio perfil | ✅ |
| `empresas` RLS | Policy `empresas_select_all_authenticated` — usuário vê empresa do próprio profile | ✅ |
| `src/pages/Auth.tsx` | `cliente_final` redireciona para `/sst` ao invés de `/cliente` | ✅ |
| `src/pages/Dashboard.tsx` | `cliente_final` redireciona para `/sst` ao invés de `/cliente` | ✅ |
| `src/pages/SSTDashboard.tsx` | Guard e `canAccess` agora aceitam `cliente_final` | ✅ |
| `src/hooks/usePermissoes.tsx` | `cliente_final` sem `setor_id` tratado como `isAdmin=true` | ✅ |
| `src/components/sst/SSTSidebar.tsx` | Header mostra "Minha Empresa" para `cliente_final` | ✅ |
| `modulos` (banco) | Módulo "Toriq Corp" criado (id: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`) | ✅ |
| `empresas_modulos` (banco) | Toriq Corp ativado para empresa `93f2c26c` (Lucas Silva de Franca) | ✅ |
| `supabase/functions/admin-create-user` | Domínio corrigido para `toriqcorp.com.br`, verificação email via `profiles` | ✅ v2 |
| `supabase/functions/admin-update-user` | Domínio corrigido para `toriqcorp.com.br` | ✅ v2 |
| `src/pages/AlterarSenha.tsx` | Logout após alterar senha + redirect para `/auth` | ✅ |
| Vertical SST — `modulos` banco | Rotas de Toriq Corp e Toriq Training → `https://toriqcorp.com.br/sst` | ✅ |
| `email-templates/` | 6 templates HTML criados com identidade TORIQ Corp | ✅ |

## Próximo Passo
- [ ] Confirmar URL correta do módulo Toriq EPI no Vertical SST (`/modulos/gestao-epi` ainda relativa)
- [ ] Atualizar edge function `validacao-digital-certificado` no Supabase para retornar campo `observacoes`
- [ ] Testar fluxo completo de assinatura ICP-Brasil (individual + lote)
- [ ] Habilitar "Leaked Password Protection" no Dashboard Supabase
- [ ] Configurar SMTP para projeto `xraggzqaddfiymqgrtha` (Vertical SST) no Dashboard Supabase

## Documentação de Testes
- `docs/issues supabase/ROTEIRO_TESTES_DETALHADO.md` - Roteiro completo e executável (v2.0)
