# Validação de Senha no Primeiro Acesso - Estratégia e Implementação

## Visão Geral

Este documento detalha a estratégia e implementação do recurso de **troca obrigatória de senha no primeiro acesso**. O objetivo é garantir que todos os usuários criados administrativamente alterem a senha temporária fornecida antes de acessar o sistema.

---

## Problema

Quando um administrador cria um usuário no sistema:
1. Define email e senha temporária
2. Envia credenciais ao usuário
3. Usuário faz login com a senha temporária
4. **Problema**: Usuário continua usando a senha temporária indefinidamente

### Riscos de Segurança
- Senhas temporárias podem ser interceptadas
- Administrador conhece a senha do usuário
- Senhas temporárias geralmente são fracas
- Não há garantia de que o usuário alterou a senha

---

## Solução Proposta

### Fluxo de Primeiro Acesso

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CRIAÇÃO DO USUÁRIO (Admin)                                  │
│  - Admin cria usuário via Edge Function                         │
│  - Define senha_alterada = FALSE                                │
│  - Envia credenciais ao usuário                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. PRIMEIRO LOGIN (Usuário)                                    │
│  - Usuário faz login com email/senha temporária                 │
│  - Sistema verifica senha_alterada = FALSE                      │
│  - Redireciona para /alterar-senha (obrigatório)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. ALTERAÇÃO DE SENHA (Obrigatória)                            │
│  - Usuário define nova senha                                    │
│  - Confirma nova senha                                          │
│  - Sistema atualiza senha no auth.users                         │
│  - Sistema atualiza senha_alterada = TRUE                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. ACESSO LIBERADO                                             │
│  - Usuário é redirecionado para dashboard                       │
│  - Próximos logins não exigem troca de senha                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquitetura Técnica

### Opção de Armazenamento: `profiles.senha_alterada`

**Justificativa**: Usar a tabela `profiles` em vez de `auth.users.user_metadata` porque:
1. Controle total sobre o campo via SQL/RLS
2. Facilidade de consulta e atualização
3. Possibilidade de relatórios administrativos
4. Migração mais simples para usuários existentes

### Alteração na Tabela `profiles`

```sql
-- Adicionar coluna para controlar se a senha foi alterada
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS senha_alterada BOOLEAN DEFAULT FALSE;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.senha_alterada IS 
'Indica se o usuário alterou a senha temporária fornecida no primeiro acesso. FALSE = deve alterar, TRUE = já alterou.';
```

### Migração de Usuários Existentes

```sql
-- IMPORTANTE: Todos os usuários existentes terão senha_alterada = FALSE
-- Isso força TODOS a alterarem a senha na próxima vez que logarem

-- A coluna já é criada com DEFAULT FALSE, então:
-- - Usuários existentes: NULL → FALSE (precisam alterar)
-- - Novos usuários: FALSE (precisam alterar)

-- Se quiser definir explicitamente para todos:
UPDATE public.profiles 
SET senha_alterada = FALSE 
WHERE senha_alterada IS NULL;
```

---

## Implementação Detalhada

### 1. Migration SQL (Supabase)

```sql
-- Nome: add_senha_alterada_to_profiles
-- Descrição: Adiciona controle de troca de senha obrigatória no primeiro acesso

-- 1. Adicionar coluna
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS senha_alterada BOOLEAN DEFAULT FALSE;

-- 2. Atualizar usuários existentes (forçar troca de senha)
UPDATE public.profiles 
SET senha_alterada = FALSE 
WHERE senha_alterada IS NULL;

-- 3. Garantir que a coluna não aceita NULL
ALTER TABLE public.profiles 
ALTER COLUMN senha_alterada SET NOT NULL;

-- 4. Criar índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_senha_alterada 
ON public.profiles(senha_alterada) 
WHERE senha_alterada = FALSE;
```

### 2. Atualizar Trigger `handle_new_user`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    nome, 
    role, 
    empresa_id, 
    setor_id,
    senha_alterada  -- NOVO CAMPO
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    'cliente_final'::app_role,
    NULL,
    NULL,
    FALSE  -- Sempre FALSE para novos usuários
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar profile para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Atualizar Interface TypeScript

```typescript
// src/hooks/useAuth.tsx - Interface Profile
interface Profile {
  id: string;
  email: string;
  nome: string;
  role: 'admin_vertical' | 'empresa_sst' | 'cliente_final' | 'empresa_parceira' | 'instrutor';
  empresa_id: string | null;
  instrutor_id?: string | null;
  primeiro_acesso?: boolean;  // DEPRECATED - usar senha_alterada
  senha_alterada: boolean;    // NOVO CAMPO
  ativo?: boolean;
  motivo_desativacao?: string | null;
}
```

### 4. Verificação no Login (useAuth.tsx)

```typescript
// Dentro do signIn, após verificar usuário ativo:

// Verificar se precisa alterar senha
const { data: profileData } = await supabase
  .from('profiles')
  .select('senha_alterada')
  .eq('id', data.user.id)
  .single();

// Se senha_alterada = false, redirecionar após login
// O redirecionamento será feito no componente de dashboard
```

### 5. Verificação nos Dashboards

Cada dashboard deve verificar `profile.senha_alterada` e redirecionar:

```typescript
// Exemplo: SSTDashboard.tsx, ClienteDashboard.tsx, etc.

useEffect(() => {
  if (!loading && profile && user) {
    // Verificar se precisa alterar senha
    if (profile.senha_alterada === false) {
      navigate('/alterar-senha');
      return;
    }
    
    // ... resto da lógica de verificação de role
  }
}, [profile, loading, navigate, user]);
```

### 6. Página de Alteração de Senha (AlterarSenha.tsx)

```typescript
// Atualizar handleSubmit para usar profiles.senha_alterada

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validações...
  
  setLoading(true);
  try {
    // 1. Atualizar senha no Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: novaSenha
    });

    if (updateError) throw updateError;

    // 2. Atualizar senha_alterada no profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ senha_alterada: true })
      .eq('id', user.id);

    if (profileError) throw profileError;

    toast.success('Senha alterada com sucesso!');
    
    // 3. Redirecionar para dashboard apropriado
    redirectToDashboard(profile?.role);
    
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error);
    toast.error(error.message || 'Erro ao alterar senha');
  } finally {
    setLoading(false);
  }
};
```

### 7. Proteção de Rotas

Criar um componente de proteção para garantir que usuários sem senha alterada não acessem outras páginas:

```typescript
// src/components/auth/RequireSenhaAlterada.tsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface RequireSenhaAlteradaProps {
  children: React.ReactNode;
}

export function RequireSenhaAlterada({ children }: RequireSenhaAlteradaProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  // Se senha não foi alterada, redirecionar
  if (profile && profile.senha_alterada === false) {
    return <Navigate to="/alterar-senha" replace />;
  }

  return <>{children}</>;
}
```

### 8. Uso nas Rotas (App.tsx)

```typescript
// Proteger rotas que exigem senha alterada
<Route 
  path="/sst" 
  element={
    <RequireSenhaAlterada>
      <SSTDashboard />
    </RequireSenhaAlterada>
  } 
/>
```

---

## Impacto em Usuários Existentes

### Comportamento Esperado

| Cenário | senha_alterada | Ação |
|---------|----------------|------|
| Usuário existente (antes da feature) | `FALSE` (default) | Forçado a alterar senha |
| Novo usuário criado por admin | `FALSE` | Forçado a alterar senha |
| Usuário que já alterou senha | `TRUE` | Acesso normal |
| Auto-cadastro (signUp) | `TRUE`* | Acesso normal |

*Para auto-cadastro, o usuário define sua própria senha, então `senha_alterada` deve ser `TRUE`.

### Tratamento de Auto-Cadastro

Se o sistema permitir auto-cadastro (signUp na página de login), a senha já é definida pelo próprio usuário:

```typescript
// src/hooks/useAuth.tsx - signUp

const signUp = async (email: string, password: string, nome: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: { nome },
    },
  });

  if (!error && data.user) {
    // Atualizar senha_alterada = TRUE pois usuário definiu própria senha
    await supabase
      .from('profiles')
      .update({ senha_alterada: true })
      .eq('id', data.user.id);
  }

  return { error };
};
```

---

## Considerações de Segurança

### 1. Página de Alteração de Senha

- Não permitir navegação para outras páginas enquanto `senha_alterada = FALSE`
- Não mostrar menu/sidebar na página de alteração
- Não permitir logout sem alterar (opcional)

### 2. Validação de Senha

```typescript
// Requisitos mínimos de senha
const validarSenha = (senha: string): { valido: boolean; mensagem?: string } => {
  if (senha.length < 6) {
    return { valido: false, mensagem: 'Mínimo 6 caracteres' };
  }
  // Adicionar mais regras conforme necessário:
  // - Letra maiúscula
  // - Letra minúscula
  // - Número
  // - Caractere especial
  return { valido: true };
};
```

### 3. Prevenção de Bypass

- Verificar `senha_alterada` no backend (RLS policies)
- Não confiar apenas no frontend para redirecionamento

```sql
-- Exemplo de RLS que bloqueia acesso se senha não foi alterada
-- (Opcional - pode ser muito restritivo)

CREATE POLICY "Bloquear acesso se senha não alterada"
ON public.alguma_tabela
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND senha_alterada = TRUE
  )
);
```

---

## Testes

### Cenários de Teste

| # | Cenário | Resultado Esperado |
|---|---------|-------------------|
| 1 | Admin cria usuário novo | `senha_alterada = FALSE` |
| 2 | Usuário novo faz login | Redirecionado para /alterar-senha |
| 3 | Usuário tenta acessar /sst sem alterar senha | Redirecionado para /alterar-senha |
| 4 | Usuário altera senha | `senha_alterada = TRUE`, acesso liberado |
| 5 | Usuário existente (migração) faz login | Redirecionado para /alterar-senha |
| 6 | Usuário que já alterou senha faz login | Acesso normal ao dashboard |
| 7 | Auto-cadastro | `senha_alterada = TRUE` automaticamente |

### Comandos de Teste (SQL)

```sql
-- Verificar usuários que precisam alterar senha
SELECT id, email, nome, role, senha_alterada 
FROM profiles 
WHERE senha_alterada = FALSE;

-- Simular migração: forçar todos a alterarem
UPDATE profiles SET senha_alterada = FALSE;

-- Verificar após alteração
SELECT id, email, senha_alterada FROM profiles WHERE id = 'user-uuid';
```

---

## Rollback

Se necessário reverter a feature:

```sql
-- 1. Marcar todos como já alterados (desativa a feature)
UPDATE profiles SET senha_alterada = TRUE;

-- 2. Ou remover a coluna completamente
ALTER TABLE profiles DROP COLUMN IF EXISTS senha_alterada;
```

---

## Cronograma de Implementação

### Fase 1: Backend (Supabase)
1. [ ] Criar migration para adicionar coluna `senha_alterada`
2. [ ] Atualizar trigger `handle_new_user`
3. [ ] Testar criação de novos usuários

### Fase 2: Frontend
1. [ ] Atualizar interface `Profile` em `useAuth.tsx`
2. [ ] Atualizar `AlterarSenha.tsx` para usar `senha_alterada`
3. [ ] Adicionar verificação em todos os dashboards
4. [ ] Criar componente `RequireSenhaAlterada`
5. [ ] Proteger rotas no `App.tsx`

### Fase 3: Testes
1. [ ] Testar criação de usuário novo
2. [ ] Testar login de usuário existente (migração)
3. [ ] Testar fluxo completo de alteração
4. [ ] Testar proteção de rotas

### Fase 4: Deploy
1. [ ] Aplicar migration em produção
2. [ ] Deploy do frontend
3. [ ] Monitorar logs de erro
4. [ ] Comunicar usuários sobre a mudança

---

## Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/xxx_add_senha_alterada.sql` | Nova migration |
| `src/hooks/useAuth.tsx` | Interface Profile, signUp |
| `src/pages/AlterarSenha.tsx` | Atualizar para usar profiles |
| `src/pages/sst/SSTDashboard.tsx` | Verificação de senha_alterada |
| `src/pages/cliente/ClienteDashboard.tsx` | Verificação de senha_alterada |
| `src/pages/parceira/ParceiraDashboard.tsx` | Verificação de senha_alterada |
| `src/pages/instrutor/InstrutorDashboard.tsx` | Verificação de senha_alterada |
| `src/pages/admin/AdminDashboard.tsx` | Verificação de senha_alterada |
| `src/components/auth/RequireSenhaAlterada.tsx` | Novo componente |
| `src/App.tsx` | Proteção de rotas |
| `src/integrations/supabase/types.ts` | Atualizar tipos |

---

## Notas Importantes

1. **Campo existente `primeiro_acesso`**: A tabela já possui um campo `primeiro_acesso` (boolean, default false). Podemos:
   - **Opção A**: Renomear para `senha_alterada` e inverter a lógica
   - **Opção B**: Criar novo campo `senha_alterada` e depreciar `primeiro_acesso`
   - **Recomendação**: Opção B para evitar quebrar código existente

2. **User Metadata vs Profile**: O código atual usa `user.user_metadata?.primeiro_acesso`. A nova implementação deve usar `profile.senha_alterada` para consistência.

3. **Migração obrigatória**: Ao implementar, TODOS os usuários existentes serão forçados a alterar a senha, pois o valor padrão é `FALSE`.

---

## Status da Implementação

### ✅ Implementado em 26/01/2026

| Item | Status | Detalhes |
|------|--------|----------|
| Migration SQL | ✅ Concluído | Coluna `senha_alterada` adicionada à tabela `profiles` |
| Trigger `handle_new_user` | ✅ Atualizado | Novos usuários criados com `senha_alterada = FALSE` |
| Interface `Profile` | ✅ Atualizada | Campo `senha_alterada: boolean` adicionado |
| `AlterarSenha.tsx` | ✅ Atualizado | Atualiza `profiles.senha_alterada = TRUE` após troca |
| Componente `RequireSenhaAlterada` | ✅ Criado | Proteção global de rotas |
| `App.tsx` | ✅ Atualizado | Todas as rotas protegidas envolvidas pelo componente |
| Edge Function `admin-create-user` | ✅ Atualizada | Define `senha_alterada = FALSE` explicitamente |
| Remoção de código legado | ✅ Concluído | Removido check de `primeiro_acesso` do `InstrutorDashboard` |

### Impacto nos Usuários Existentes

- **Total de usuários**: 24
- **Precisam alterar senha**: 24 (100%)
- **Já alteraram**: 0

Todos os 24 usuários existentes serão obrigados a alterar a senha no próximo login.

### Arquivos Modificados

1. `src/hooks/useAuth.tsx` - Interface Profile atualizada
2. `src/pages/AlterarSenha.tsx` - Atualiza `senha_alterada` no profile
3. `src/components/auth/RequireSenhaAlterada.tsx` - **NOVO** componente de proteção
4. `src/App.tsx` - Rotas protegidas com `RequireSenhaAlterada`
5. `src/pages/instrutor/InstrutorDashboard.tsx` - Removido check legado

### Migrations Aplicadas (Supabase)

1. `add_senha_alterada_to_profiles` - Adiciona coluna e índice
2. `update_handle_new_user_with_senha_alterada` - Atualiza trigger

---

*Documentação criada em Janeiro/2026*
*Implementação concluída em 26/01/2026*
