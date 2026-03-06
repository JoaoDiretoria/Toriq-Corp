# Deploy da Edge Function: admin-delete-empresa

## Via Dashboard do Supabase

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione o projeto `prfrwdpncgtokhxnkbyl`
3. Vá em **Edge Functions** no menu lateral
4. Clique em **New function**
5. Nome: `admin-delete-empresa`
6. Cole o conteúdo do arquivo `index.ts`
7. Clique em **Deploy**

## Via Supabase CLI (Windows)

```powershell
# Instalar Supabase CLI via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Login no Supabase
supabase login

# Deploy da função
cd c:\Users\lukas\Desktop\vertical-on-sistema-de-sst
supabase functions deploy admin-delete-empresa --project-ref prfrwdpncgtokhxnkbyl
```

## Funcionalidade

Esta edge function permite que administradores (role `admin_vertical`) excluam empresas junto com:
- Todos os usuários vinculados (deletados do `auth.users`)
- Todos os dados relacionados (via CASCADE nas FKs)

## Segurança

- Apenas usuários com role `admin_vertical` podem executar
- A empresa `vertical_on` não pode ser excluída
- Requer JWT válido no header Authorization
