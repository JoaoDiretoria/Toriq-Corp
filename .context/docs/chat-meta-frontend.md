# Chat Meta no Super Admin

## Objetivo

Disponibilizar um inbox isolado para o número oficial da Toriq usando a WhatsApp
Cloud API da Meta. O módulo aparece em **Admin > Gestão Empresa TORIQ > Chat
WhatsApp** e não reutiliza a configuração de disparos, Evolution API ou o CRM
legado.

## Estrutura do frontend

- `src/components/admin/chat/AdminChatMeta.tsx`: shell do módulo, status da conta
  e troca entre Inbox e Configurações.
- `src/components/admin/chat/ConectarWhatsapp.tsx`: Embedded Signup, status da
  WABA e desconexão com preservação do histórico.
- `src/components/admin/chat/ChatInbox.tsx`: busca e paginação de conversas,
  histórico, não lidas, polling e envio dentro da janela de 24 horas.
- `src/integrations/api/chat.ts`: cliente tipado do backend NestJS em
  `/api/chat/*`, incluindo o envelope `{ data, error }`.

## Variáveis de build

```env
VITE_CHAT_API_URL=https://chat-api.exemplo.com
VITE_META_APP_ID=
VITE_META_CONFIG_ID=
VITE_META_API_VERSION=v25.0
```

O `Dockerfile` expõe as quatro variáveis como build args. O App ID e o Config ID
são identificadores públicos do SDK; o App Secret e o token permanente devem
existir somente no backend.

## Ponte de autenticação obrigatória

O frontend principal autentica no FastAPI com JWT próprio em cookie HTTP-only.
O backend NestJS do Chat, no estado atual, aceita apenas JWT Supabase no header
`Authorization`. Portanto, publicar as duas aplicações sem uma ponte resulta em
`401`, mesmo com o usuário logado no Super Admin.

A ativação em produção precisa escolher uma destas abordagens no servidor:

1. encaminhar `/api/chat/*` pelo FastAPI, validando o cookie atual e propagando
   uma identidade interna assinada ao NestJS; ou
2. adaptar o guard do NestJS para validar diretamente a sessão atual, sem expor
   o access token ao JavaScript.

Não adicionar token de serviço, App Secret ou bearer fixo em variável `VITE_*`:
qualquer valor Vite fica público no bundle do navegador.

## Checklist de ativação

1. Fechar a ponte de autenticação entre FastAPI e NestJS.
2. Publicar o backend Chat com `META_APP_ID`, `META_APP_SECRET`,
   `META_WEBHOOK_VERIFY_TOKEN`, `META_API_VERSION` e `A1_ENCRYPTION_KEY`.
3. Configurar os build args do frontend listados acima.
4. Cadastrar o domínio do frontend e o callback `/api/chat/webhook` no app Meta.
5. Entrar como `admin_vertical`, conectar a WABA e receber uma mensagem real.
6. Responder dentro da janela de 24 horas e conferir os status enviada, entregue
   e lida.

## Validação local realizada

- Build Vite de produção.
- ESLint focado nos arquivos do módulo.
- Preview com API mock local, sem credenciais ou dados reais.
- Desktop e viewport móvel (390 x 844).
- Abertura e retorno da conversa, envio, status e bloqueio fora das 24 horas.
