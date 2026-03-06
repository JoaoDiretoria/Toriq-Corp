# Trilha 1 — Build/Deploy

## Objetivo
Evitar falhas de dist, garantir healthcheck estável e logs claros no startup, sem exits inesperados.

## Checklist
- [ ] Build: `bun install` + `bun run build` finalizam sem erro
- [ ] Dist: diretório `dist` existe e contém assets esperados (lista/log)
- [ ] Vars: VITE_SUPABASE_* exigidas validadas em build/deploy
- [ ] Runtime: imagem `node:20-alpine` compatível com deps nativas
- [ ] Copy: `dist`, `server.js`, `package.json` copiados no runtime
- [ ] npm ci: somente produção, sem pacotes dev
- [ ] Healthcheck: timeout adequado; retorna 200 em cold start
- [ ] Startup: se faltar `dist/index.html`, responder 503 (não sair com exit 1)
- [ ] Logs de startup: NODE_ENV, PORT, FRONTEND_URL, existência de dist/index
- [ ] Observabilidade: uptime/mem no `/health`; níveis de log info/error
- [ ] Sem `process.exit` inesperado no startup/health

## Validação
- [ ] `docker build` e `docker run` passam; healthcheck verde
- [ ] Acesso web entrega SPA (fallback index.html ok)
- [ ] Sem exits em ambiente de staging/produção nas primeiras 24h

## Owners sugeridos
- DevOps/Backend
''  