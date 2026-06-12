# Esteira de migração do front (Fatia 5) — guia do executor

> **Objetivo:** trocar todo `supabase.from()/rpc()/channel()` do front pelo client
> REST do backend Python (`@/integrations/api/client`), **sem mudança visual**.
> Regra dura: o usuário não pode perceber a troca. O app roda nos dois mundos
> (Supabase + backend novo) até o cutover, então a migração é **incremental e
> arquivo-a-arquivo**.

## O padrão (copie isto)

```ts
// ANTES
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.from('fornecedores').select('*').eq('empresa_id', id);

// DEPOIS
import { api } from '@/integrations/api/client';
const data = await api.get<any[]>('/financeiro/cadastros/fornecedores').catch(() => [] as any[]);
```

Verbos: `api.get<T>(path, signal?)`, `api.post<T>(path, body?)`, `api.put`, `api.patch`, `api.del`.
Erros: lançam `ApiError` (status + detail). O client já manda o cookie httpOnly e
faz refresh automático em 401.

### Regras inegociáveis
1. **Só troque a camada de dados.** JSX, estilos, estados, textos, ordem dos
   elementos — **nada** muda. Diff ideal: imports + corpo das funções de fetch.
2. **Degrade graciosamente.** Onde não houver endpoint equivalente, use
   `.catch(() => [])` (ou `null`) para a UI renderizar igual ao "sem dados".
   Nunca deixe a tela quebrar (tela branca) por falta de endpoint.
3. **Tipagem `any` é aceitável** (o código atual já usa `(supabase as any)`).
   Não dependa do `schema.d.ts` — ele está **stale** (ver abaixo).
4. **O backend escopa por `empresa_id` do token.** Remova os `.eq('empresa_id', x)`
   — o servidor já filtra. Idem para a maioria dos filtros de tenant.
5. **Realtime sai.** `supabase.channel(...).subscribe()` → remova e deixe um
   comentário `// NOTA (migração): realtime removido — refetch/próximo load`.
   O backend não tem push; resolvido por polling/recarga manual até o cutover.
6. **RPCs viram endpoints** quando existir equivalente (ex.: `rpc('get_trending_blogs')`
   → `GET /blog/trending`); senão, degrade.
7. **Valide:** `npx tsc --noEmit` não pode ganhar **nenhum** erro novo
   (baseline atual = 0). Rode e confira o seu arquivo.
8. **Crie só / edite só o arquivo designado.** Não toque em arquivos de outros
   (evita conflito no fan-out paralelo).

## Mapa de endpoints (fonte da verdade = os routers, NÃO o schema.d.ts)

⚠️ **`src/integrations/api/schema.d.ts` está desatualizado** (gerado antes de
vários routers). Para regenerar (precisa do backend rodando em :8000):
`npm run gen:api`. Até lá, confira os paths reais nos routers de `apps/api/app/api/`.

Prefixos principais (todos sob a base `VITE_API_URL`):

| Domínio | Prefixo | Router |
|---|---|---|
| Auth / sessão | `/auth/*` (login, me, refresh, register, change-password, first-access-password) | auth.py, admin_users.py |
| Gestão de usuários | `/admin/users`, `/admin/users/hierarquia` | admin_users.py |
| White label / módulos | `/white-label/*` (config, modulos, empresa-modulos, empresa-modulos-telas) | white_label.py |
| Permissões de setor | `/setores/{setor_id}/permissoes` | setor_permissoes.py |
| Empresas | `/empresas/*` | empresas.py |
| SST cadastros | `/sst/*` (clientes, colaboradores, cargos, setores, riscos, perigos, grupos/categorias-clientes) | sst_cadastros.py |
| SST saúde | `/sst/saude/*` (exames, profissionais) | sst_saude.py |
| SST EPI | `/sst/epi/*` | sst_epi.py |
| Financeiro cadastros | `/financeiro/cadastros/*` (fornecedores, centros-custo, contas-bancarias, planos, formas, condicoes) | financeiro_cadastros.py |
| Contas a pagar/receber | `/financeiro/contas-pagar/*`, `/financeiro/contas-receber/*` (kanban: colunas, mover, reorder, bootstrap) | contas_pagar.py, contas_receber.py |
| Funil comercial | `/funil/*` (funis, etapas, cards, etiquetas, atividades, orcamentos, propostas) | funil.py, funil_card_extras.py, funil_comercial.py |
| Kanbans legados | `/kanban/{prospeccao\|closer\|pos-venda\|cross-selling}/*` | kanbans_legados.py |
| Produtos/serviços | `/produtos/*` (catalogo, servicos, pacotes, planos, categorias, tipos, naturezas, classificacoes) | produtos.py |
| Contratos | `/contratos/*` (clausulas, modulos) | contratos.py |
| Modelos | `/modelos/*` (propostas, propostas-comerciais, atividades, clausulas, modulos) | modelos.py |
| Frota | `/frota/*` (veiculos, motoristas, manutencoes, custos, checklists, documentos, ocorrencias, utilizacoes) | frota.py |
| Agenda | `/agenda/*` (eventos, compartilhamentos, permissoes) | agenda.py |
| Notificações | `/notificacoes` (+ `/{id}/lida`, `/config`) | notificacoes.py |
| Suporte | `/suporte/*` (tickets, comentarios, anexos, sla-config) | suporte.py |
| Blog | `/blog/*` (posts, autores, categorias, newsletter/*, `/{id}/visualizacoes`, `/blog/trending`) | blog.py, rpcs.py |
| Pesquisas | `/pesquisas/*` (opcoes, votar, resultados) | pesquisas.py |
| Leads / landing | `/leads-landing/*` | leads_landing.py |
| Vagas | `/vagas/*` | vagas.py |
| Treinamentos | `/treinamentos/*`, `/instrutores/*` | treinamentos.py, instrutores.py |
| Equipamentos extras | `/equipamentos/*` | equipamentos_extras.py |
| Sistema | `/sistema/*` (access-logs, system-updates, import-queue, cbo, sla-config, google-oauth) | sistema.py |
| White-label resolver | `/white-label/me` | rpcs.py |
| Storage (RustFS) | `/storage/*` (upload, presigned, delete) | storage.py |

> Para o shape exato de cada endpoint, leia o router correspondente em
> `apps/api/app/api/<router>.py` (decoradores `@router.get/post/...` + response_model).

## Gotchas já descobertos
- **`empresa_id` some do front:** endpoints injetam o do token. Não envie.
- **Filtros `.eq('ativo', true)` / `.eq('grupo_acesso', x)`:** alguns endpoints
  devolvem tudo; reaplique o filtro **no cliente** (ver usePermissoes, useNotificacoes).
- **`.single()/.maybeSingle()`** viram um GET do recurso (ou pegar `[0]` da lista).
- **"Marcar todas"/bulk** sem endpoint → faça loop client-side com `Promise.all`.
- **admin_vertical + isolamento:** onde o backend escopa por empresa, o
  admin_vertical deixa de ver "tudo" e passa a ver só a própria empresa. É
  intencional (substitui o RLS). Registre no commit quando acontecer.

## Inventário (estado em 2026-06-12)

**Hooks compartilhados (keystones) — feitos:**
`useAuth` ✅ · `useModulosAtivos` ✅ · `usePermissoes` ✅ · `useEmpresaMode` ✅ ·
`useHierarquia` ✅ (endpoint `/admin/users/hierarquia` criado+testado) ·
`useNotificacoes` ✅

**Hooks restantes (cobertura parcial — decidir degradação):**
- `useWhiteLabel.tsx` + `services/whiteLabelService.ts` — cluster white-label;
  `useEmpresaWhiteLabel(empresaId)` usa rpc `get_empresa_sst_pai` + tabela direta.
  Há `/white-label/me` (resolve p/ usuário logado) e `/white-label/config`.
  Falta resolver por `empresaId` arbitrário (branding pré-login). **Decidir.**
- `useBlogAnalytics.ts` — `trackView` → `POST /blog/{id}/visualizacoes` ✅;
  `useTrendingBlogs` → `GET /blog/trending` ✅; **`useRecommendedBlogs` +
  `blog_user_preferences` não têm endpoint** → degradar p/ "posts recentes". **Decidir.**
- `useSystemUpdates.tsx` — backend tem `/sistema/system-updates/*` e o
  `register`. Mapear list + `user_update_views` (marcar visto).
- `useImportQueue.tsx` — backend tem `/sistema/import-queue/*`. Mapear.
- `useCardMovimentacoes.tsx` — ver `/funil/cards/{id}/atividades` ou tabela de
  movimentações.

**Telas/components (~120 arquivos `supabase.from`):** independentes na maioria —
candidatas ao fan-out paralelo (1 agent por arquivo) usando este guia. Agrupar
por domínio (financeiro, comercial/funil, SST cadastros, blog/newsletter/pesquisas,
admin, cliente) para consistência do mapeamento.

## Como rodar o backend local (para testar/gerar schema)
```
cd apps/api && uv run uvicorn app.main:app --reload --port 8000
# noutro terminal, na raiz:
npm run gen:api   # regenera src/integrations/api/schema.d.ts
```
