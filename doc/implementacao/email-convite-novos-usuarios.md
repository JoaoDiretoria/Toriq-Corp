# Implementação: Email de Convite para Novos Usuários

## Data: 26/01/2026

---

## 1. Objetivo

Quando um novo usuário for criado no sistema, ele deve:
1. **Receber um email de convite** com link para definir sua senha
2. **Ao clicar no link**, ser redirecionado para a tela de alteração de senha
3. **Após definir a senha**, ser redirecionado para seu dashboard

### Fluxo Desejado

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Admin cria novo usuário                                     │
│     - Não define senha (ou senha temporária)                    │
│     - Sistema envia email de convite                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Usuário recebe email                                        │
│     - Template bonito com logo Toriq                            │
│     - Botão "Definir Minha Senha"                               │
│     - Link expira em 24h                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Usuário clica no link                                       │
│     - Redirecionado para /alterar-senha                         │
│     - Já autenticado via token do email                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Usuário define nova senha                                   │
│     - Validação: 8+ chars, maiúscula, minúscula, número, especial│
│     - Atualiza senha_alterada = true                            │
│     - Redirecionado para dashboard                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Análise do Estado Atual

### Configuração Supabase (Já Configurado)
- **SMTP Provider**: Brevo (smtp-relay.brevo.com:587)
- **Sender Email**: suporte@toriq.com.br
- **Sender Name**: Toriq

### Edge Function: admin-create-user
- Atualmente usa `adminClient.auth.admin.createUser()` com `email_confirm: true`
- Cria usuário com senha definida pelo admin
- Não envia email de convite

### Template de Email Existente
- `public/email-templates/reset-password.html` - Template bonito para reset de senha
- Variáveis: `{{logo_url}}`, `{{user_name}}`, `{{user_email}}`, `{{reset_link}}`, `{{expiry_time}}`

### Sistema de Primeiro Acesso
- Campo `senha_alterada` na tabela `profiles`
- Componente `RequireSenhaAlterada` protege rotas
- Página `/alterar-senha` para definir nova senha

---

## 3. Opções de Implementação

### Opção A: Usar `inviteUserByEmail()` do Supabase ✅ RECOMENDADA

**Vantagens:**
- Método nativo do Supabase
- Envia email automaticamente
- Token de convite gerenciado pelo Supabase
- Usuário não precisa de senha inicial

**Desvantagens:**
- Precisa configurar template de invite no Supabase Dashboard

**Fluxo:**
```typescript
// Em vez de createUser com senha
const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
  data: { nome },
  redirectTo: 'https://app.toriq.com.br/alterar-senha'
});
```

### Opção B: Criar usuário + Enviar email de recovery

**Vantagens:**
- Usa template de recovery já existente
- Mais controle sobre o processo

**Desvantagens:**
- Dois passos (criar + enviar email)
- Precisa gerar link de recovery manualmente

---

## 4. Plano de Implementação (Opção A)

### 4.1 Configurar Template de Invite no Supabase Dashboard

**Localização**: Supabase Dashboard > Authentication > Email Templates > Invite User

**Template HTML** (baseado no reset-password.html):
- Adaptar título para "Bem-vindo ao Toriq"
- Adaptar mensagem para convite
- Usar variáveis do Supabase: `{{ .ConfirmationURL }}`, `{{ .Email }}`

### 4.2 Atualizar Edge Function admin-create-user

**Mudanças:**
1. Remover parâmetro `password` (opcional agora)
2. Usar `inviteUserByEmail()` em vez de `createUser()`
3. Adicionar parâmetro `send_invite: boolean` (default: true)
4. Se `send_invite = false`, usar `createUser()` com senha

```typescript
// Novo fluxo
if (send_invite !== false) {
  // Convite por email (sem senha)
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: `${siteUrl}/alterar-senha`
  });
} else {
  // Criação direta com senha (comportamento atual)
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome }
  });
}
```

### 4.3 Atualizar Frontends

**Componentes a atualizar:**
- `SSTUsuarios.tsx` - Remover campo senha, adicionar checkbox "Enviar convite por email"
- `SSTClientes.tsx` - Idem
- `SSTEmpresasParceiras.tsx` - Idem
- `InstrutorCadastroDialog.tsx` - Idem
- `AdminUsuarios.tsx` - Idem

### 4.4 Atualizar Página AlterarSenha

**Mudanças:**
- Detectar se usuário veio de link de convite (token na URL)
- Adaptar mensagem para "Defina sua senha" em vez de "Altere sua senha"

---

## 5. Template de Email para Convite

### Variáveis Supabase Disponíveis
- `{{ .ConfirmationURL }}` - URL completa de confirmação
- `{{ .Token }}` - Token OTP (6 dígitos)
- `{{ .TokenHash }}` - Hash do token
- `{{ .SiteURL }}` - URL do site
- `{{ .Email }}` - Email do usuário

### Template Adaptado (para Supabase Dashboard)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Toriq</title>
  <style>
    /* Estilos do reset-password.html */
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <img src="https://app.toriq.com.br/logo-toriq-white.png" alt="Toriq" class="logo">
      </div>
      
      <div class="email-body">
        <p class="greeting">Olá!</p>
        <h1 class="title">Bem-vindo ao Toriq</h1>
        
        <p class="message">
          Você foi convidado para acessar a plataforma Toriq com o email <strong>{{ .Email }}</strong>.
        </p>
        
        <p class="message">
          Clique no botão abaixo para definir sua senha e começar a usar o sistema.
        </p>
        
        <div class="button-container">
          <a href="{{ .ConfirmationURL }}" class="button">Definir Minha Senha</a>
        </div>
        
        <div class="expiry-info">
          <div class="icon">⏱️</div>
          <p>Este link expira em <strong>24 horas</strong></p>
        </div>
        
        <div class="divider"></div>
        
        <div class="link-section">
          <p class="link-label">Ou copie e cole este link no seu navegador:</p>
          <span class="link-url">{{ .ConfirmationURL }}</span>
        </div>
      </div>
      
      <div class="email-footer">
        <p class="footer-text">
          Este é um e-mail automático enviado pelo sistema Toriq.<br>
          Por favor, não responda a esta mensagem.
        </p>
        <p class="copyright">© 2026 Toriq • Todos os direitos reservados</p>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## 6. Checklist de Implementação

### Fase 1: Configuração Supabase
- [ ] Acessar Supabase Dashboard > Authentication > Email Templates
- [ ] Configurar template "Invite User" com HTML customizado
- [ ] Configurar "Site URL" para https://app.toriq.com.br
- [ ] Configurar "Redirect URLs" para incluir /alterar-senha

### Fase 2: Edge Function
- [ ] Atualizar `admin-create-user/index.ts`
- [ ] Adicionar parâmetro `send_invite`
- [ ] Implementar lógica de `inviteUserByEmail()`
- [ ] Manter compatibilidade com `createUser()` quando `send_invite = false`
- [ ] Deploy da Edge Function

### Fase 3: Frontend
- [ ] Atualizar `SSTUsuarios.tsx` - remover senha obrigatória
- [ ] Atualizar `SSTClientes.tsx`
- [ ] Atualizar `SSTEmpresasParceiras.tsx`
- [ ] Atualizar `InstrutorCadastroDialog.tsx`
- [ ] Atualizar `AdminUsuarios.tsx`
- [ ] Adicionar opção "Enviar convite por email" vs "Definir senha manualmente"

### Fase 4: Página AlterarSenha
- [ ] Detectar tipo de acesso (convite vs reset vs primeiro acesso)
- [ ] Adaptar mensagens conforme contexto
- [ ] Garantir que token de convite funciona corretamente

### Fase 5: Testes
- [ ] Testar criação de usuário com convite
- [ ] Testar recebimento de email
- [ ] Testar clique no link
- [ ] Testar definição de senha
- [ ] Testar redirecionamento para dashboard

---

## 7. Considerações de Segurança

1. **Token de convite expira em 24h** (configurável no Supabase)
2. **Link único** - Cada convite gera um token único
3. **HTTPS obrigatório** - Links sempre com https://
4. **Validação de senha forte** - Já implementada em AlterarSenha.tsx

---

## 8. Rollback

Se necessário reverter:
1. Edge Function: Reverter para usar apenas `createUser()` com senha
2. Frontend: Restaurar campo de senha obrigatório
3. Não há mudanças no banco de dados

---

## 9. Status da Implementação

| Etapa | Status | Observações |
|-------|--------|-------------|
| Análise | ✅ Concluído | Documentação criada |
| Template de Email | ✅ Concluído | `public/email-templates/invite-user.html` |
| Edge Function | ✅ Concluído | Atualizado com suporte a `send_invite` |
| Configuração Supabase Dashboard | ⏳ Pendente | Copiar template para Email Templates |
| Frontend | ⏳ Pendente | Atualizar formulários (opcional) |
| Testes | ⏳ Pendente | - |

---

## 10. Arquivos Modificados

1. `supabase/functions/admin-create-user/index.ts` - Adicionado suporte a `send_invite`
2. `public/email-templates/invite-user.html` - Template de email de convite
3. `doc/implementacao/email-convite-novos-usuarios.md` - Esta documentação

---

## 11. Como Usar

### Enviar convite por email (novo comportamento)
```typescript
const { data, error } = await supabase.functions.invoke('admin-create-user', {
  body: {
    email: 'usuario@email.com',
    nome: 'Nome do Usuário',
    role: 'empresa_sst',
    empresa_id: 'uuid-da-empresa',
    send_invite: true  // <-- Envia email de convite
  }
});
```

### Criar com senha (comportamento anterior)
```typescript
const { data, error } = await supabase.functions.invoke('admin-create-user', {
  body: {
    email: 'usuario@email.com',
    password: 'SenhaSegura123!',
    nome: 'Nome do Usuário',
    role: 'empresa_sst',
    empresa_id: 'uuid-da-empresa'
    // send_invite não informado = usa senha
  }
});
```

---

## 12. Próximos Passos (Manual)

1. **Configurar template no Supabase Dashboard**:
   - Acessar: Authentication > Email Templates > Invite User
   - Copiar conteúdo de `public/email-templates/invite-user.html`
   - Salvar

2. **Configurar Site URL**:
   - Acessar: Authentication > URL Configuration
   - Site URL: `https://app.toriq.com.br`
   - Redirect URLs: adicionar `https://app.toriq.com.br/alterar-senha`

3. **Deploy da Edge Function**:
   ```bash
   supabase functions deploy admin-create-user
   ```

---

*Documento criado em 26/01/2026*
*Implementação concluída em 26/01/2026*
