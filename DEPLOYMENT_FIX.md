# Correções para Erro 502 - Deploy Docker no EasyPanel

## Configuração do EasyPanel
- **Proprietário:** JoaoDiretoria
- **Repositório:** vertical-on-sistema-de-sst
- **Ramo:** main
- **Caminho de Build:** /
- **Construção:** Docker (docker build)
- **Porto:** 3001 (configurado no EasyPanel)

## Problemas Identificados e Corrigidos

### 1. **Dockerfile Stage 2 - Falta de `package.json`**
**Problema:** O estágio runtime tentava instalar `express` com `npm install express`, mas não tinha `package.json` disponível.

**Solução:**
- Adicionado `COPY package.json .` no Stage 2
- Alterado para `npm ci --only=production` (mais seguro e determinístico)
- Adicionado validação de build no Stage 1

### 2. **Dependência `express` não declarada**
**Problema:** `express` não estava listado em `package.json`, causando falha na instalação.

**Solução:**
- Adicionado `"express": "^4.18.2"` às dependências do `package.json`

### 3. **Falta de Health Check**
**Problema:** Docker não tinha forma de validar se o container estava saudável.

**Solução:**
- Adicionado `HEALTHCHECK` no Dockerfile que valida o endpoint `/health`

### 4. **Tratamento de Erros Inadequado**
**Problema:** Exceções não capturadas causavam crashes silenciosos.

**Solução:**
- Adicionado middleware de erro global em `server.js`
- Adicionados handlers para `uncaughtException` e `unhandledRejection`
- Adicionado error handler no servidor Express

### 5. **Validação de Dist Directory**
**Problema:** Se o build falhasse, o container ainda iniciaria sem os assets.

**Solução:**
- Adicionada verificação no `server.js` que faz exit(1) se `/dist` não existir
- Adicionada validação no Dockerfile após `bun run build`

### 6. **Fallback SPA Inseguro**
**Problema:** O fallback para `index.html` não validava se o arquivo existia.

**Solução:**
- Adicionada verificação de existência do arquivo antes de servir
- Melhorado tratamento de erros com verificação de `headersSent`

## Arquivos Modificados

### `Dockerfile`
- Stage 1: Adicionado `--frozen-lockfile` e validação de build
- Stage 2: Adicionado `COPY package.json`, alterado para `npm ci --only=production`
- Adicionado `HEALTHCHECK`

### `server.js`
- Adicionada validação de `/dist` na inicialização
- Adicionado middleware de erro global
- Adicionados handlers para exceções não capturadas
- Melhorado fallback SPA com validações

### `package.json`
- Adicionado `"express": "^4.18.2"` às dependências

### `.dockerignore` (novo arquivo)
- Criado para otimizar build Docker

## Configuração de Variáveis de Ambiente no EasyPanel

As seguintes variáveis devem estar configuradas no EasyPanel:

```
VITE_SUPABASE_PROJECT_ID=xraggzqaddfiymqgrtha
VITE_SUPABASE_PUBLISHABLE_KEY=<seu_token_aqui>
VITE_SUPABASE_URL=https://xraggzqaddfiymqgrtha.supabase.co
ESOCIAL_AMBIENTE=homologacao
CERT_PASSWORD=
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://core-vertical-on-sistema-de-sst.h2zufg.easypanel.host/
```

## Como Fazer Deploy Local para Testes

```bash
# Build com variáveis de ambiente
docker build \
  --build-arg VITE_SUPABASE_PROJECT_ID=xraggzqaddfiymqgrtha \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="seu_token_aqui" \
  --build-arg VITE_SUPABASE_URL="https://xraggzqaddfiymqgrtha.supabase.co" \
  -t vertical-on-sst:latest .

# Run com variáveis de ambiente
docker run -p 3001:3001 \
  -e PORT=3001 \
  -e NODE_ENV=production \
  -e ESOCIAL_AMBIENTE=homologacao \
  -e FRONTEND_URL="https://seu-dominio.easypanel.host/" \
  vertical-on-sst:latest
```

## Validação

1. **Health Check:** `curl http://localhost:3001/health`
2. **SPA:** `curl http://localhost:3001/` (deve retornar index.html)
3. **Logs:** Verifique os logs do container para mensagens de erro detalhadas
4. **Variáveis:** Confirme que as variáveis de ambiente estão sendo registradas nos logs

## Checklist de Deploy no EasyPanel

- [ ] Variáveis de ambiente configuradas corretamente
- [ ] `VITE_SUPABASE_*` passadas como build args
- [ ] `PORT=3001` configurado
- [ ] `NODE_ENV=production` configurado
- [ ] Health check retorna status 200
- [ ] SPA fallback funcionando em rotas não existentes
- [ ] Logs mostram inicialização correta do servidor
- [ ] Dist directory foi criado corretamente durante build

## Troubleshooting

**Erro 502 persistente:**
1. Verifique os logs do container no EasyPanel
2. Confirme que `/dist` foi criado durante o build
3. Valide que `index.html` existe em `/dist`
4. Teste o health check: `curl https://seu-dominio.easypanel.host/health`

**Build falhando:**
1. Verifique se `bun install` está funcionando
2. Confirme que `bun run build` gera `/dist`
3. Valide variáveis de ambiente Vite
