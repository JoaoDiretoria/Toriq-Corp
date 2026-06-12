# Mapa de Migração do Front (Fatia 5) — Supabase → API própria

> Gerado por 4 agentes de reconhecimento (read-only) sobre os 136 arquivos com `supabase.from()`.
> Branch `feature/migracao-backend-python`. NÃO altera o front — é só o blueprint.

## TL;DR — a descoberta

O backend novo tem 484 rotas, mas elas cobrem o **CRUD básico**. O front usa **muito mais
tabela e subsistema** do que o backend expõe hoje. Migrar o front não é só trocar `.from()` por
`api.get()` — há **~50 tabelas sem endpoint** e **4 subsistemas inteiros** que ainda não existem
no backend novo. Isso reshape o roadmap: boa parte da Fatia 5 é, na verdade, **completar o backend**.

Ponto positivo: **quase nenhuma `.rpc()`** nos componentes (só 4 RPCs reais, nos hooks) — a maior
parte da lógica é orquestração de queries no front, o que facilita.

## 4 subsistemas transversais que faltam no backend (maior trabalho)

1. **Storage/upload (RustFS S3).** ~12 buckets em uso (`blog-images`, `logos-empresas`,
   `certificados`, `certificados-colaboradores`, `atividades-anexos`, `frota-documentos`,
   `documentos`, `colaborador-fotos`, `tickets-anexos`, `aso-files`, `sinistro_fotos`, logos
   white-label). O front espera `getPublicUrl().publicUrl` (string). Precisa de endpoint de
   upload + retorno de URL pública equivalente.
2. **Realtime → push.** 4 pontos dependem de `.channel()` (postgres_changes): `FunilKanban`
   (cards), `useNotificacoes` (sino global), `useModulosAtivos`, `SuporteTickets`. Sem
   WebSocket/SSE ou polling equivalente, esses ficam estáticos (quebra a invisibilidade).
3. **Gestão de usuários (admin).** Edge functions `admin-create-user/update/delete/reset-password`
   mutam `auth.users`. Precisam virar endpoints `/admin/*` ou `/auth/*` no backend novo.
4. **Auth avançado.** reset de senha por email, troca de senha logado, validar senha atual,
   fluxo de recovery-token, captcha Turnstile, gate `senha_alterada`, conflito de sessão
   (sessão única), + integração Google Meet/Agenda (OAuth tokens, criar reunião, enviar convite).

## GAPS de tabela (sem endpoint hoje) — agrupados por prioridade

**P1 — destravam MUITAS telas (alta prioridade):**
`empresas`, `empresas_modulos`, `empresas_modulos_telas`, `modulos`, `setores` (CRUD por empresa),
`cargos`, `profiles` (listagem/gestão), `setor_permissoes`. → base de `usePermissoes`/`useModulosAtivos`
/dashboards (gate de toda a UI). **Regra legada crítica:** lista de permissão vazia = libera tudo
(preservar; não retornar 404 quando vazio).

**P2 — clientes/empresa/contatos:**
`empresa_contatos`, `cliente_contatos`, `empresas_parceiras`, `instrutores`,
`instrutor_datas_indisponiveis`, `categorias_clientes_empresa`, `origens_contato`,
`unidades_clientes`, `configuracoes_empresa`/`empresa_configuracoes`/`informacoes_empresa`,
`reconhecimento_facial_config`.

**P3 — funil/comercial avançado:**
`automacoes`(+`automacoes_execucoes`), `funis_configuracoes`, `funil_negocio_configuracoes`,
`funil_card_anexos`, `atividades_unificadas`, `comercial_funil` (legada), `propostas_comerciais_*`
(treinamentos/servicos_sst/vertical365), `*_card_movimentacoes` (histórico).

**P4 — financeiro/EPI/saúde:**
`financeiro_contas` (legada), `contas_pagar_atividades`(+anexos), `contas_pagar_movimentacoes`,
`modelos_atividade`, `equipamentos_movimentacoes_historico`, `equipamentos_modelos_atividade`,
`certificados`, `colaboradores_certificados`.

**P5 — plataforma/conteúdo:**
`access_logs`, `system_updates`(+`user_update_views`), `import_queue`, `cbo_ocupacoes`,
`google_oauth_tokens`, `blog_visualizacoes`, `blog_user_preferences`, `tickets_sla_config`,
`agenda_permissoes`, `agenda_compartilhamentos`.

**P6 — públicos (sem auth):**
`leads_landing`, `vagas`, `candidaturas`, `newsletter_inscricoes`, `pesquisas_votos`,
`pesquisas_opcoes`.

**Bloqueado (Treinamentos/Sinistros — precisa modelar tabelas):**
`turmas`, `turma_colaboradores`, `turmas_treinamento`(+`aulas`), `treinamentos`,
`catalogo_treinamentos`, `colaboradores`, `colaboradores_treinamentos`(+`datas`),
`sinistros_colaborador`, `sinistro_fotos`, `tipos_sinistro`, `terceiros`.

## RPCs a portar para Python (só 4 nos componentes + as de sessão do useAuth)
- `get_empresa_sst_pai` / `get_empresa_sst_pai_by_user` — hierarquia do tema White Label.
- `register_app_update` — changelog/novidades.
- `get_trending_blogs` — analytics do blog.
- (auth) `registrar_sessao` / `verificar_sessao_valida` / `verificar_sessao_ativa_por_email` /
  `invalidar_todas_sessoes_por_email` — sessão única (adiado, decisão do usuário).

## Contratos de "invisibilidade" (a API DEVE entregar igual, senão a tela muda)
- **JOINs aninhados** no shape do PostgREST: `setor:setores(nome)`, `modulos(...)`,
  `usuario:profiles(nome)`, `categoria/autor` no blog, `equipamentos_kit_itens(...)`,
  `frota_veiculos(placa,marca,modelo)`, `empresas:cliente_empresa_id(...)`. Endpoints específicos
  precisam embutir o objeto, não só o id.
- **White Label:** API devolve snake_case; o front converte (`dbToFrontend`, ~20 campos de
  cor/tipografia). Sem config → comportamento de "tema padrão" (hoje erro `PGRST116`/null).
- **`maybeSingle` vs `single`:** 404-silencioso (null) ≠ erro.
- **Filtros padrão:** `empresa_id`/`empresa_sst_id` + `ativo=true` + `order('nome'|created_at)`.
- **Tenant duplo:** `clientes_sst` usa `empresa_sst_id` (não `empresa_id`).
- **Storage:** devolver URL pública string equivalente a `getPublicUrl().publicUrl`.

## Sequência recomendada
1. **Onda P1 (backend, paralelizável):** empresas/modulos/setores/cargos/profiles-list/permissões
   — destrava a maioria das telas e os hooks centrais (`usePermissoes`, `useModulosAtivos`).
2. **Subsistema de Storage** (upload RustFS + URL pública) — destrava todas as telas com anexo/foto.
3. **Auth avançado core** (change-password, senha_alterada gate, admin-create-user) — destrava
   gestão de usuários e o fluxo de primeiro acesso.
4. **Ondas P2–P6 (backend, paralelas)** + migração incremental das telas correspondentes.
5. **Realtime** (push de notificações/kanban/tickets) — por último, com polling como ponte.
