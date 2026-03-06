# Trilha 2 — Autenticação

## Objetivo
Estabilizar refresh, limpeza de tokens inválidos e redirecionamentos por role, sem erros não tratados.

## Checklist
- [ ] Refresh: tratar `refresh_token_not_found` silencioso; logar apenas erros reais
- [ ] Limpeza: remover todos os `sb-*-auth-token` ao detectar sessão expirada
- [ ] Estado: reset de `user/session/profile/empresa/loading` após erro de sessão
- [ ] Profile fetch: retry leve (1x) e toast amigável em falha
- [ ] Falha de profile: opcional signOut para evitar UI quebrada
- [ ] Role routing: redirects estáveis por role; evitar loops
- [ ] Sem empresa: não chamar `fetchModulos` sem `empresa_id`
- [ ] Telemetria: eventos de login/logout com empresa/role
- [ ] Métricas: tempo médio de login, taxa de falha por causa (refresh/credencial/rede)

## Validação
- [ ] Fluxos login/logout/refresh executados sem erros não tratados
- [ ] Redirecionamentos corretos por role
- [ ] Nenhum 401/403 inesperado após login normal

## Owners sugeridos
- Front/Auth
