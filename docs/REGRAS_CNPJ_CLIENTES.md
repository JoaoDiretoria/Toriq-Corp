# Regras de Validação de CNPJ para Clientes SST

## Visão Geral

Este documento descreve as regras de negócio para validação de CNPJ no cadastro de clientes no sistema Vertical ON.

## Regras de Negócio

### 1. Uma empresa pode ser cliente de múltiplas empresas SST

Uma mesma empresa (identificada pelo CNPJ) pode ser cliente de diferentes empresas de SST simultaneamente. Isso é um cenário comum no mercado, onde uma empresa pode contratar serviços de SST de diferentes fornecedores para diferentes unidades ou serviços.

**Exemplo:**
- Empresa "ABC Ltda" (CNPJ: 12.345.678/0001-00) pode ser cliente da:
  - Empresa SST "Segurança Total"
  - Empresa SST "Saúde Ocupacional Brasil"

### 2. Uma empresa parceira pode ser parceira de múltiplas empresas SST

O mesmo princípio se aplica às empresas parceiras. Uma empresa parceira pode prestar serviços para diferentes empresas SST.

### 3. Validação de CNPJ duplicado

A validação de CNPJ duplicado é feita **apenas dentro do escopo da mesma empresa SST**:

- ✅ **Permitido**: Mesmo CNPJ cadastrado em empresas SST diferentes
- ❌ **Não permitido**: Mesmo CNPJ cadastrado duas vezes na mesma empresa SST

### 4. Isolamento de dados (RLS)

As políticas de Row Level Security (RLS) garantem que:

- Cada empresa SST só pode ver e gerenciar seus próprios clientes
- Não há vazamento de informações entre empresas SST
- O usuário não deve saber se um CNPJ existe em outra empresa SST

## Implementação Técnica

### Tabela `clientes_sst`

```sql
-- Estrutura relevante
CREATE TABLE clientes_sst (
  id UUID PRIMARY KEY,
  empresa_sst_id UUID NOT NULL REFERENCES empresas(id),
  cnpj TEXT,
  nome TEXT NOT NULL,
  -- outros campos...
);

-- Não há constraint UNIQUE global no CNPJ
-- A unicidade é validada no código, por empresa_sst_id
```

### Políticas RLS

```sql
-- INSERT: Permite inserir apenas para sua própria empresa SST
CREATE POLICY clientes_sst_insert_policy ON clientes_sst
FOR INSERT WITH CHECK (
  empresa_sst_id = get_user_empresa_id(auth.uid())
);

-- SELECT: Permite ver apenas clientes da sua empresa SST
CREATE POLICY clientes_sst_select_policy ON clientes_sst
FOR SELECT USING (
  empresa_sst_id = get_user_empresa_id(auth.uid())
  OR cliente_empresa_id = get_user_empresa_id(auth.uid())
);
```

### Validação no Frontend

#### Cadastro Manual (`SSTClientes.tsx`)

```typescript
// Verificar se CNPJ já existe APENAS entre os clientes da mesma empresa SST
if (cnpjValue) {
  const { data: existingCliente } = await supabase
    .from('clientes_sst')
    .select('id, nome')
    .eq('empresa_sst_id', empresaId)  // Filtro por empresa SST
    .eq('cnpj', cnpjValue)
    .maybeSingle();
  
  if (existingCliente) {
    // Erro: CNPJ já cadastrado nesta empresa SST
  }
}
```

#### Importação CSV/Excel (`ClientesImportExport.tsx`)

```typescript
// Buscar CNPJs existentes APENAS dos clientes da mesma empresa SST
const { data: clientesExistentes } = await supabase
  .from('clientes_sst')
  .select('cnpj')
  .eq('empresa_sst_id', empresaId)  // Filtro por empresa SST
  .not('cnpj', 'is', null);

const cnpjsExistentes = new Set(
  clientesExistentes?.map(c => c.cnpj?.replace(/\D/g, '')) || []
);
```

## Mensagens de Erro

### Mensagem Correta
> "CNPJ já cadastrado como cliente da sua empresa"

### Mensagem Incorreta (não usar)
> ~~"CNPJ já existe no sistema"~~ (vazamento de informação)

## Fluxo de Validação

```
┌─────────────────────────────────────────────────────────┐
│                    Cadastro de Cliente                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Usuário informa CNPJ                        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│   Buscar CNPJ na tabela clientes_sst                    │
│   WHERE empresa_sst_id = empresa_do_usuario             │
└─────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────┐     ┌─────────────────────────────┐
│   CNPJ encontrado   │     │   CNPJ não encontrado       │
│   (na mesma empresa)│     │   (pode cadastrar)          │
└─────────────────────┘     └─────────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────┐     ┌─────────────────────────────┐
│   Erro: "CNPJ já    │     │   Prosseguir com cadastro   │
│   cadastrado como   │     │                             │
│   cliente da sua    │     │                             │
│   empresa"          │     │                             │
└─────────────────────┘     └─────────────────────────────┘
```

## Segurança - Row Level Security (RLS)

### Princípio de Segurança

**O banco de dados NÃO pode confiar no cliente.** Todas as políticas RLS devem garantir isolamento de dados independente do código frontend.

### Tabela `empresas` - Política SELECT

A política de SELECT da tabela `empresas` foi corrigida para **NÃO permitir leitura global**:

```sql
CREATE POLICY empresas_select ON empresas
FOR SELECT TO authenticated
USING (
  -- Admin Vertical pode ver todas
  role = 'admin_vertical'
  OR
  -- Usuário pode ver sua própria empresa
  id = empresa_id_do_usuario
  OR
  -- Empresa SST pode ver seus clientes e parceiras
  (role = 'empresa_sst' AND id IN (clientes + parceiras))
  OR
  -- Cliente final pode ver a empresa SST que é cliente
  (role = 'cliente_final' AND id IN (empresas_sst_que_é_cliente))
  OR
  -- Empresa parceira pode ver as empresas SST que é parceira
  (role = 'empresa_parceira' AND id IN (empresas_sst_parceiras))
  OR
  -- Instrutor pode ver as empresas que trabalha
  (role = 'instrutor' AND id IN (empresas_que_trabalha))
);
```

### Tabela `clientes_sst` - Política SELECT

```sql
CREATE POLICY clientes_sst_select_policy ON clientes_sst
FOR SELECT USING (
  role = 'admin_vertical'
  OR empresa_sst_id = empresa_id_do_usuario  -- SST vê seus clientes
  OR cliente_empresa_id = empresa_id_do_usuario  -- Cliente vê seu cadastro
);
```

### Por que isso é importante?

1. **Atacante com token roubado**: Mesmo com acesso autenticado, não consegue listar dados de outras empresas
2. **Vazamento de informações**: Nenhuma empresa SST sabe que outra existe
3. **Isolamento total**: CNPJs de clientes de uma empresa SST são invisíveis para outras

### Validações no Frontend

As validações no frontend **NÃO devem depender de acesso global**:

```typescript
// ❌ ERRADO - Depende de acesso global (vulnerável)
const { data } = await supabase
  .from('empresas')
  .select('cnpj')
  .not('cnpj', 'is', null);

// ✅ CORRETO - Busca apenas dados que o usuário tem acesso
const { data } = await supabase
  .from('clientes_sst')
  .select('cnpj')
  .eq('empresa_sst_id', empresaId)
  .not('cnpj', 'is', null);
```

## Histórico de Alterações

| Data       | Descrição                                                    |
|------------|--------------------------------------------------------------|
| 2026-01-28 | Correção RLS tabela empresas - removido SELECT global        |
| 2026-01-28 | Correção da validação de CNPJ para escopo por empresa SST    |
| 2026-01-28 | Documentação inicial criada                                  |
