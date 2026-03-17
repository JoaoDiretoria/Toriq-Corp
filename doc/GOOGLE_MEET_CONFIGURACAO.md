# Manual de Configuração: Integração Google Meet

> Guia passo a passo para configurar o Google OAuth e habilitar a criação de reuniões Google Meet diretamente pelo sistema TORIQ Corp.

---

## Pré-requisitos

- Conta Google (Gmail pessoal ou Google Workspace)
- Acesso ao [Google Cloud Console](https://console.cloud.google.com)
- Acesso de administrador ao sistema TORIQ Corp

---

## ETAPA 1 — Criar um projeto no Google Cloud Console

1. Acesse **[https://console.cloud.google.com](https://console.cloud.google.com)**
2. No canto superior esquerdo, clique no seletor de projetos → **"Novo Projeto"**
3. Dê um nome (ex: `TORIQ Corp`) e clique em **"Criar"**
4. Aguarde o projeto ser criado e selecione-o

---

## ETAPA 2 — Habilitar as APIs necessárias

No menu lateral, vá em **"APIs e Serviços" → "Biblioteca"** e ative as 3 APIs abaixo:

### 2.1 — Google Calendar API
1. Pesquise por `Google Calendar API`
2. Clique no resultado → **"Ativar"**

### 2.2 — Google Meet API
1. Pesquise por `Google Meet API`
2. Clique no resultado → **"Ativar"**

> ⚠️ **Importante:** Sem esta API ativada, as reuniões criadas exigirão que o organizador esteja presente para liberar os participantes.

### 2.3 — People API (ou Identity API)
1. Pesquise por `People API`
2. Clique no resultado → **"Ativar"**

---

## ETAPA 3 — Configurar a Tela de Consentimento OAuth

1. No menu lateral, vá em **"APIs e Serviços" → "Tela de consentimento OAuth"**
2. Selecione o tipo de usuário:
   - **"Externo"** → se for uma conta Gmail pessoal ou atender clientes fora do seu domínio
   - **"Interno"** → se todos os usuários forem do mesmo Google Workspace
3. Clique em **"Criar"**
4. Preencha os campos obrigatórios:
   - **Nome do app:** `TORIQ Corp`
   - **Email de suporte:** seu email
   - **Email do desenvolvedor:** seu email
5. Clique em **"Salvar e continuar"**

### 3.1 — Adicionar os Escopos (Permissões)

Na tela seguinte, clique em **"Adicionar ou remover escopos"** e adicione:

| Escopo | Finalidade |
|--------|-----------|
| `.../auth/calendar.events` | Criar eventos no Google Calendar |
| `.../auth/userinfo.email` | Identificar o email da conta |
| `.../auth/meetings.space.created` | Criar salas Meet com acesso aberto |

6. Clique em **"Atualizar"** → **"Salvar e continuar"**

### 3.2 — Adicionar Usuários de Teste (somente se "Externo")

Se você escolheu "Externo" e o app ainda não foi publicado:

1. Na seção **"Usuários de teste"**, clique em **"+ Adicionar usuários"**
2. Adicione o email da conta Google que será usada para conectar o Meet
3. Clique em **"Salvar e continuar"**

---

## ETAPA 4 — Criar as Credenciais OAuth

1. No menu lateral, vá em **"APIs e Serviços" → "Credenciais"**
2. Clique em **"+ Criar credenciais" → "ID do cliente OAuth"**
3. Selecione o tipo: **"Aplicativo da Web"**
4. Dê um nome (ex: `TORIQ Corp Web`)
5. Em **"URIs de redirecionamento autorizados"**, adicione:
   ```
   https://bsvtgdtsbrjdwdnpirzb.supabase.co/functions/v1/google-meet-callback
   ```
6. Clique em **"Criar"**
7. Uma janela aparecerá com o **Client ID** e o **Client Secret** — **copie os dois valores**

---

## ETAPA 5 — Configurar as Variáveis de Ambiente no Supabase

1. Acesse **[https://supabase.com/dashboard](https://supabase.com/dashboard)**
2. Selecione o projeto **Torq Corp**
3. No menu lateral, vá em **"Edge Functions" → "Manage secrets"** (ou "Settings → Edge Functions")
4. Adicione as seguintes variáveis:

| Nome da variável | Valor |
|-----------------|-------|
| `GOOGLE_CLIENT_ID` | O Client ID copiado na Etapa 4 |
| `GOOGLE_CLIENT_SECRET` | O Client Secret copiado na Etapa 4 |

5. Salve as alterações

---

## ETAPA 6 — Conectar o Google Meet no Sistema

1. No sistema TORIQ Corp, acesse **Configurações → Integrações**
2. Na seção **Google Meet**, clique em **"Conectar Google Meet"**
3. Uma janela do Google abrirá pedindo permissão
4. Selecione a conta Google que terá os encontros vinculados
5. Revise as permissões solicitadas e clique em **"Permitir"**
6. Após autorizar, volte ao sistema e clique em **"Recarregar status"**
7. O status deve aparecer como **"Conectado"** com o email da conta

---

## ETAPA 7 — Verificar o funcionamento

1. Na **Agenda**, crie um novo evento
2. No formulário do evento, clique em **"Gerar link Meet"**
3. O link deve ser gerado com a mensagem:
   > *"Qualquer convidado pode entrar diretamente, sem precisar do host."*
4. Teste abrindo o link em uma aba anônima — deve entrar diretamente na sala

---

## Solução de Problemas

### ❌ Ainda pede para "aguardar o organizador"

**Causa A:** Google Meet API não foi ativada (Etapa 2.2)
- Volte ao Google Cloud Console e ative a **Google Meet API**
- Depois, desconecte e reconecte o Google Meet no sistema

**Causa B:** Conta Google Workspace com "host management" ativado
- Acesse o **Google Workspace Admin** ([admin.google.com](https://admin.google.com))
- Vá em **Apps → Google Workspace → Google Meet → Configurações de segurança do Meet**
- Desative **"Gerenciamento de host"** (Host Management)

---

### ❌ Erro "Token Google expirado"

- Acesse **Configurações → Integrações → Google Meet**
- Clique em **"Desconectar"** e depois **"Conectar Google Meet"** novamente

---

### ❌ Reconexão não resolve o problema

Verifique se o escopo `meetings.space.created` foi concedido:
1. Ao conectar, a janela do Google deve listar 3 permissões:
   - Gerenciar eventos do Google Calendar
   - Ver seu endereço de email
   - Criar e gerenciar reuniões do Meet
2. Se aparecer menos de 3, o escopo não foi solicitado corretamente — fale com o suporte técnico

---

### ❌ Janela de autorização do Google mostra "App não verificado"

Isso é normal para apps em desenvolvimento. Clique em **"Avançado" → "Acessar TORIQ Corp (não seguro)"**. Para remover esse aviso em produção, publique o app na tela de consentimento OAuth (Etapa 3).

---

## Resumo rápido das APIs necessárias

| API | Link direto |
|-----|------------|
| Google Calendar API | [Ativar](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) |
| Google Meet API | [Ativar](https://console.cloud.google.com/apis/library/meet.googleapis.com) |
| People API | [Ativar](https://console.cloud.google.com/apis/library/people.googleapis.com) |

---

*Documento gerado para o sistema TORIQ Corp — Integração Google Meet v3*
