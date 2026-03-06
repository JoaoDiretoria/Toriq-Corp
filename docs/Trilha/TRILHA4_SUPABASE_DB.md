# Trilha 4 — Supabase/Database

## Objetivo
Reduzir erros de RLS/query e garantir cliente Supabase e políticas consistentes, sem encerramentos inesperados do servidor.

## Checklist
- [ ] Cliente Supabase: validar URLs/chaves; falhar cedo se faltarem
- [ ] Storage/browser: evitar acesso a `localStorage` fora do navegador
- [ ] Query `empresas_modulos`: colunas/índices corretos; RLS permitindo leitura esperada
- [ ] Tratamento de erro: mensagens claras (ex: "Permissão insuficiente / RLS")
- [ ] RLS: funções da migration `20260102_fix_all_rls_functions.sql` aplicadas e testadas
- [ ] Teste de acesso: roles principais conseguem leituras previstas
- [ ] Server.js: em erro de DB transitório, responder 503 (não `process.exit`)
- [ ] Captura de `unhandledRejection` categorizando erro (DB vs. código)

## Validação
- [ ] Queries principais retornam OK para roles esperadas
- [ ] Sem exit inesperado por erro de DB; logs categorizam permissões vs. infra
- [ ] Checklist de RLS verificado em staging

## Owners sugeridos
- Backend/DBA
