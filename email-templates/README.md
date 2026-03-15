# Templates de Email TORIQ

Templates HTML personalizados para os emails de autenticação do Supabase, seguindo a identidade visual TORIQ.

## 🎨 Identidade Visual

- **Cor Primária:** `#16E17A` (Verde TORIQ)
- **Cor Secundária:** `#0B5D4A` (Verde escuro)
- **Background:** `#0a0a0a` (Preto)
- **Cards:** `#1a1a1a` (Cinza escuro)
- **Texto:** `#e5e5e5` (Branco suave)
- **Gradiente:** `linear-gradient(135deg, #16E17A 0%, #0B5D4A 100%)`

## 📧 Templates Disponíveis

### 1. Confirm Sign Up (`01-confirm-signup.html`)
Email enviado quando um novo usuário se cadastra na plataforma.
- **Variável Supabase:** `{{ .ConfirmationURL }}`
- **Expiração:** 24 horas

### 2. Invite User (`02-invite-user.html`)
Email enviado quando um usuário é convidado por um administrador.
- **Variável Supabase:** `{{ .ConfirmationURL }}`
- **Expiração:** 7 dias

### 3. Magic Link (`03-magic-link.html`)
Email enviado para login sem senha (passwordless).
- **Variável Supabase:** `{{ .ConfirmationURL }}`
- **Expiração:** 1 hora
- **Uso único:** Sim

### 4. Change Email Address (`04-change-email.html`)
Email enviado para confirmar alteração de endereço de email.
- **Variável Supabase:** `{{ .ConfirmationURL }}`
- **Expiração:** 24 horas

### 5. Reset Password (`05-reset-password.html`)
Email enviado quando o usuário solicita redefinição de senha.
- **Variável Supabase:** `{{ .ConfirmationURL }}`
- **Expiração:** 1 hora

### 6. Reauthentication (`06-reauthentication.html`)
Email enviado para confirmar identidade antes de ações sensíveis.
- **Variável Supabase:** `{{ .ConfirmationURL }}`
- **Expiração:** 15 minutos

## 🚀 Como Aplicar no Supabase

### Via Dashboard (Recomendado)

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Authentication** → **Email Templates**
4. Para cada template:
   - Clique no template correspondente
   - Copie o conteúdo do arquivo `.html`
   - Cole no editor do Supabase
   - Clique em **Save**

### Mapeamento Dashboard ↔ Arquivos

| Dashboard | Arquivo |
|-----------|---------|
| **Confirm sign up** | `01-confirm-signup.html` |
| **Invite user** | `02-invite-user.html` |
| **Magic link** | `03-magic-link.html` |
| **Change email address** | `04-change-email.html` |
| **Reset password** | `05-reset-password.html` |
| **Reauthentication** | `06-reauthentication.html` |

## ✨ Características dos Templates

- ✅ **Responsivos** - Funcionam em desktop e mobile
- ✅ **Dark Mode** - Design escuro moderno
- ✅ **Acessíveis** - Estrutura semântica com `role="presentation"`
- ✅ **Compatíveis** - Testados em Gmail, Outlook, Apple Mail
- ✅ **Seguros** - Inline CSS para máxima compatibilidade
- ✅ **Branded** - Identidade visual TORIQ consistente

## 🎯 Variáveis Supabase

Todos os templates usam a variável padrão do Supabase:

```
{{ .ConfirmationURL }}
```

Esta variável é automaticamente substituída pelo Supabase com o link correto para cada ação.

## 📝 Customização

Para personalizar os templates:

1. **Logo:** Atualmente usa texto "TORIQ". Para adicionar imagem:
   ```html
   <img src="https://seu-dominio.com/logo.png" alt="TORIQ" style="height: 40px;">
   ```

2. **Cores:** Altere as variáveis de cor no CSS inline:
   - `#16E17A` - Verde primário
   - `#0B5D4A` - Verde secundário
   - `#1a1a1a` - Background do card

3. **Textos:** Edite diretamente os parágrafos `<p>` em cada template

## 🔗 Links Úteis

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Dashboard TORIQ - Torq Corp](https://supabase.com/dashboard/project/bsvtgdtsbrjdwdnpirzb/auth/templates)
- [Dashboard TORIQ - Vertical on sst](https://supabase.com/dashboard/project/xraggzqaddfiymqgrtha/auth/templates)

## 📄 Licença

© 2026 TORIQ Corp. Todos os direitos reservados.
