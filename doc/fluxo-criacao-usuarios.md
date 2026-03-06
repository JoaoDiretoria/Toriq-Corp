# Fluxo de Criação de Usuários - Vertical ON

## Visão Geral

O sistema Vertical ON utiliza uma arquitetura híbrida para criação de usuários, combinando:
1. **Supabase Auth** - Gerenciamento de autenticação (auth.users)
2. **Tabela profiles** - Dados de perfil e permissões do usuário
3. **Edge Function admin-create-user** - Criação administrativa de usuários
4. **Trigger handle_new_user** - Criação automática de profile

---

## Arquitetura de Autenticação

### Tabelas Envolvidas

| Tabela | Schema | Descrição |
|--------|--------|-----------|
| `auth.users` | auth | Usuários do Supabase Auth (email, senha, metadata) |
| `profiles` | public | Perfil do usuário (role, empresa_id, setor_id, grupo_acesso) |
| `empresas` | public | Empresas do sistema |
| `instrutores` | public | Instrutores vinculados a user_id |
| `empresas_parceiras` | public | Empresas parceiras com responsavel_id |
| `clientes_sst` | public | Clientes SST com cliente_empresa_id |

### Tipos de Usuário (Roles)

```typescript
type AppRole = 
  | 'admin_vertical'    // Administrador da plataforma Toriq
  | 'empresa_sst'       // Funcionário de empresa SST
  | 'cliente_final'     // Usuário de empresa cliente
  | 'empresa_parceira'  // Responsável de empresa parceira
  | 'instrutor'         // Instrutor de treinamentos
```

---

## Trigger: handle_new_user

Quando um usuário é criado no `auth.users`, o trigger `on_auth_user_created` executa automaticamente a função `handle_new_user`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, empresa_id, setor_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    'cliente_final'::app_role,  -- Role padrão
    NULL,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar profile para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
```

**Comportamento:**
- Cria automaticamente um registro em `profiles` com role `cliente_final`
- Usa o nome do metadata ou extrai do email
- Não define empresa_id (NULL)
- A Edge Function atualiza o profile após criação

---

## Edge Function: admin-create-user

### Localização
- **Slug**: `admin-create-user`
- **URL**: `https://xraggzqaddfiymqgrtha.supabase.co/functions/v1/admin-create-user`
- **JWT Verify**: `false` (usa validação manual)

### Permissões de Criação

| Quem Cria | Pode Criar | Restrições |
|-----------|------------|------------|
| `admin_vertical` | Todos os tipos | Sem restrições |
| `empresa_sst` | `empresa_sst`, `cliente_final`, `empresa_parceira`, `instrutor` | Apenas para sua empresa ou empresas vinculadas |
| `empresa_parceira` | `instrutor` | Apenas para a empresa SST vinculada |

### Fluxo de Execução

```
1. Recebe requisição com JWT no header Authorization
2. Valida JWT e obtém usuário atual
3. Verifica permissão do usuário (role)
4. Valida campos obrigatórios (email, password, nome, role)
5. Aplica validações específicas por role:
   - empresa_sst: verifica vínculos com clientes/parceiras
   - empresa_parceira: só pode criar instrutores
6. Verifica se email já existe
7. Cria usuário via adminClient.auth.admin.createUser()
8. Atualiza profile com role, empresa_id, setor_id, grupo_acesso, gestor_id
9. Retorna sucesso ou erro
```

### Parâmetros da Edge Function

```typescript
interface CreateUserRequest {
  email: string;           // Email do usuário (obrigatório)
  password: string;        // Senha (obrigatório)
  nome: string;            // Nome completo (obrigatório)
  role: AppRole;           // Tipo de usuário (obrigatório)
  empresa_id?: string;     // ID da empresa (obrigatório exceto admin_vertical)
  setor_id?: string;       // ID do setor (opcional)
  grupo_acesso?: string;   // 'administrador' | 'gestor' | 'colaborador' (opcional)
  gestor_id?: string;      // ID do gestor direto (opcional)
}
```

---

## Fluxos por Tipo de Usuário

### 1. Empresa SST (Funcionários)

**Componente**: `SSTUsuarios.tsx`  
**Quem cria**: Admin da empresa SST  
**Fluxo**:

```
1. Admin acessa "Perfil da Empresa" > "Usuários"
2. Clica em "Novo Usuário"
3. Preenche: nome, email, senha, setor, grupo de acesso, gestor
4. Sistema chama Edge Function admin-create-user
5. Edge Function:
   - Cria usuário no auth.users
   - Trigger cria profile com role 'cliente_final'
   - Edge Function atualiza profile para role 'empresa_sst'
   - Define empresa_id, setor_id, grupo_acesso, gestor_id
6. Usuário pode fazer login
```

**Hierarquia de Acesso**:
- `administrador`: Acesso total à empresa
- `gestor`: Acesso próprio + subordinados
- `colaborador`: Apenas dados próprios

---

### 2. Cliente Final

**Componente**: `SSTClientes.tsx`  
**Quem cria**: Empresa SST  
**Fluxo**:

```
1. Empresa SST acessa "Perfil da Empresa" > "Clientes"
2. Cadastra ou edita um cliente
3. Na aba de usuários do cliente, clica "Criar Usuário"
4. Preenche: nome, email, senha
5. Sistema chama Edge Function admin-create-user
6. Edge Function:
   - Valida que cliente_empresa_id está vinculado à empresa SST
   - Cria usuário com role 'cliente_final'
   - Define empresa_id como cliente_empresa_id
7. Usuário acessa portal do cliente (/cliente)
```

**Validação**:
```sql
-- Verifica vínculo cliente-SST
SELECT id FROM clientes_sst 
WHERE empresa_sst_id = {empresa_sst_id} 
AND cliente_empresa_id = {empresa_id}
```

---

### 3. Empresa Parceira

**Componente**: `SSTEmpresasParceiras.tsx`  
**Quem cria**: Empresa SST  
**Fluxo**:

```
1. Empresa SST acessa "Toriq Training" > "Empresas Parceiras"
2. Cadastra nova empresa parceira
3. Define responsável (cria usuário ou seleciona existente)
4. Sistema chama Edge Function admin-create-user
5. Edge Function:
   - Valida vínculo parceira-SST
   - Cria usuário com role 'empresa_parceira'
   - Define empresa_id como parceira_empresa_id
6. Atualiza empresas_parceiras.responsavel_id
7. Usuário acessa portal da parceira (/parceira)
```

**Validação**:
```sql
-- Verifica vínculo parceira-SST
SELECT id FROM empresas_parceiras 
WHERE empresa_sst_id = {empresa_sst_id} 
AND parceira_empresa_id = {empresa_id}
```

---

### 4. Instrutor

**Componente**: `InstrutorCadastroDialog.tsx`  
**Quem cria**: Empresa SST ou Empresa Parceira  
**Fluxo**:

```
1. Acessa "Toriq Training" > "Instrutores"
2. Clica em "Novo Instrutor"
3. Preenche dados em 4 etapas:
   - Etapa 1: Informações pessoais (nome, CPF, email, senha)
   - Etapa 2: Endereço
   - Etapa 3: Formações e treinamentos
   - Etapa 4: Assinatura digital
4. Se "Criar acesso ao sistema" = Sim:
   - Sistema chama Edge Function admin-create-user
   - Cria usuário com role 'instrutor'
5. Cria registro na tabela instrutores com user_id
6. Usuário acessa portal do instrutor (/instrutor)
```

**Particularidades**:
- Instrutor pode ou não ter acesso ao sistema (user_id opcional)
- Empresa parceira só pode criar instrutores para a SST vinculada
- Instrutor fica vinculado à empresa_parceira_id se criado por parceira

**Validação para Empresa Parceira**:
```sql
-- Busca empresa SST vinculada
SELECT empresa_sst_id FROM empresas_parceiras 
WHERE parceira_empresa_id = {profile.empresa_id}
```

---

## Funções SQL de Suporte

### Funções de Consulta

| Função | Descrição |
|--------|-----------|
| `get_user_empresa_id(user_id)` | Retorna empresa_id do usuário |
| `get_user_role(user_id)` | Retorna role do usuário |
| `get_my_profile_data()` | Retorna dados do usuário autenticado |
| `get_instrutor_id_for_user(user_id)` | Retorna instrutor_id se for instrutor |

### Funções de Permissão

| Função | Descrição |
|--------|-----------|
| `can_view_profile(target_id)` | Verifica se pode visualizar perfil |
| `can_update_profile(target_id)` | Verifica se pode editar perfil |
| `can_delete_profile(target_id)` | Verifica se pode excluir perfil |
| `update_profile_safe(...)` | Atualiza perfil com validação de permissão |

---

## Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRIAÇÃO DE USUÁRIO                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                               │
│  - SSTUsuarios.tsx (funcionários SST)                          │
│  - SSTClientes.tsx (clientes finais)                           │
│  - SSTEmpresasParceiras.tsx (responsáveis parceiras)           │
│  - InstrutorCadastroDialog.tsx (instrutores)                   │
│  - AdminUsuarios.tsx (admin Toriq)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ supabase.functions.invoke('admin-create-user')
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Edge Function: admin-create-user                               │
│  1. Valida JWT do usuário                                       │
│  2. Verifica permissões (role)                                  │
│  3. Valida vínculos (cliente/parceira)                          │
│  4. Chama adminClient.auth.admin.createUser()                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Auth (auth.users)                                     │
│  - Cria registro de autenticação                                │
│  - Dispara trigger on_auth_user_created                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Trigger: handle_new_user                                       │
│  - Cria registro em profiles                                    │
│  - Role padrão: cliente_final                                   │
│  - empresa_id: NULL                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Edge Function: admin-create-user (continuação)                 │
│  - Atualiza profile com role correto                            │
│  - Define empresa_id, setor_id, grupo_acesso, gestor_id         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Usuário Criado!                                                │
│  - Pode fazer login                                             │
│  - Redirecionado para dashboard correto                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Redirecionamento por Role

Após login, o usuário é redirecionado automaticamente:

| Role | Rota | Dashboard |
|------|------|-----------|
| `admin_vertical` | `/admin` | AdminDashboard |
| `empresa_sst` | `/sst` | SSTDashboard |
| `cliente_final` | `/cliente` | ClienteDashboard |
| `empresa_parceira` | `/parceira` | ParceiraDashboard |
| `instrutor` | `/instrutor` | InstrutorDashboard |

---

## Validações de Segurança

### No Login (useAuth.tsx)

1. **Usuário ativo**: Verifica `profiles.ativo = true`
2. **Instrutor ativo**: Verifica `instrutores.ativo = true`
3. **Parceira ativa**: Verifica `empresas_parceiras.ativo = true`
4. **Módulo ativo**: Para instrutor/parceira/cliente, verifica se Toriq Training está ativo

### Na Criação (Edge Function)

1. **JWT válido**: Usuário deve estar autenticado
2. **Role permitido**: Verifica se pode criar o tipo de usuário
3. **Vínculo válido**: Verifica relação empresa-cliente ou empresa-parceira
4. **Email único**: Verifica se email não existe

---

## Considerações Importantes

1. **Não usa supabase.auth.signUp() para criação administrativa**
   - signUp() é apenas para auto-cadastro (página de login)
   - Criação administrativa usa Edge Function com Service Role Key

2. **Trigger é fallback**
   - O trigger `handle_new_user` cria profile com dados mínimos
   - A Edge Function atualiza com dados completos

3. **Hierarquia de permissões**
   - Administrador > Gestor > Colaborador
   - Implementada via `useHierarquia.tsx` e RLS policies

4. **Sessão única**
   - Sistema permite apenas uma sessão ativa por usuário
   - Novo login invalida sessões anteriores

---

*Documentação atualizada em Janeiro/2026*
