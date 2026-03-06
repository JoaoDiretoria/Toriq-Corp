---
status: pendente_aprovacao
generated: 2026-01-26
version: 2.0
revisado: 2026-01-26
---

# 📋 PLANEJAMENTO: Sistema White Label - Herança de Estilos por Empresa SST

> **⚠️ AGUARDANDO APROVAÇÃO** - Este planejamento precisa ser aprovado antes da implementação.

---

## ⚠️ PROBLEMAS CRÍTICOS IDENTIFICADOS

### 🔴 PROBLEMA 1: Função SQL `get_empresa_sst_pai` NÃO EXISTE

O código atual chama uma função RPC que **não foi criada** no banco:

```typescript
// whiteLabelService.ts:235 e useWhiteLabel.tsx:72
const { data: empresaSstId } = await supabase
  .rpc('get_empresa_sst_pai', { p_empresa_id: empresaId });
```

**Status:** ❌ Esta função não existe em nenhuma migration  
**Impacto:** O sistema de herança **NÃO FUNCIONA** atualmente  
**Solução:** Criar a função SQL antes de qualquer outra implementação

### 🟡 PROBLEMA 2: RLS de `white_label_config` é Restritiva Demais

A política atual só permite acesso à config da **própria empresa**:

```sql
-- Migration: 20260124_create_white_label_config_table.sql:116-123
CREATE POLICY "Usuarios podem ver config da sua empresa" 
ON public.white_label_config FOR SELECT USING (
    empresa_id IN (
        SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
);
```

**Problema:** Um `cliente_final` com `empresa_id = X` **NÃO consegue** ler a config da sua `empresa_sst_id = Y`  
**Impacto:** Herança de estilos **BLOQUEADA** pela RLS  
**Solução:** Ajustar RLS para permitir leitura da config da empresa SST pai

### � DESCOBERTA: Herança via Tabelas de Relacionamento

A arquitetura atual usa **tabelas de relacionamento** para vincular empresas:

| Tipo de Usuário | Tabela de Vínculo | Campo da SST |
|-----------------|-------------------|--------------|
| `cliente_final` | `clientes_sst` | `empresa_sst_id` |
| `empresa_parceira` | `empresas_parceiras` | `empresa_sst_id` |
| `instrutor` | `instrutores` | via `empresa_parceira_id` ou direto |

**Implicação:** A função `get_empresa_sst_pai` precisa consultar essas tabelas para descobrir a SST pai.

---

## 📋 PLANO DE CORREÇÃO (Ordem de Execução)

### ETAPA 1: Criar Função SQL `get_empresa_sst_pai` ⚠️ CRÍTICO

```sql
-- Função que retorna a empresa SST pai para herança de white label
CREATE OR REPLACE FUNCTION public.get_empresa_sst_pai(p_empresa_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo tipo_empresa;
  v_empresa_sst_id UUID;
BEGIN
  -- Buscar tipo da empresa
  SELECT tipo INTO v_tipo FROM empresas WHERE id = p_empresa_id;
  
  -- Se é vertical_on (Toriq), não tem SST pai
  IF v_tipo = 'vertical_on' THEN
    RETURN NULL;
  END IF;
  
  -- Se é empresa_sst, ela mesma é a SST
  IF v_tipo = 'sst' THEN
    RETURN p_empresa_id;
  END IF;
  
  -- Se é cliente_final, buscar via clientes_sst
  IF v_tipo = 'cliente_final' THEN
    SELECT empresa_sst_id INTO v_empresa_sst_id
    FROM clientes_sst
    WHERE cliente_empresa_id = p_empresa_id
    LIMIT 1;
    RETURN v_empresa_sst_id;
  END IF;
  
  -- Se é empresa_parceira, buscar via empresas_parceiras
  IF v_tipo = 'empresa_parceira' THEN
    SELECT empresa_sst_id INTO v_empresa_sst_id
    FROM empresas_parceiras
    WHERE parceira_empresa_id = p_empresa_id
    LIMIT 1;
    RETURN v_empresa_sst_id;
  END IF;
  
  -- Fallback: sem SST pai
  RETURN NULL;
END;
$$;
```

### ETAPA 2: Ajustar RLS de `white_label_config` ⚠️ CRÍTICO

```sql
-- Permitir que usuários vejam a config da sua empresa SST pai
DROP POLICY IF EXISTS "Usuarios podem ver config da sua empresa" ON white_label_config;

CREATE POLICY "Usuarios podem ver config da empresa SST pai" 
ON public.white_label_config FOR SELECT USING (
    -- Admin vertical vê tudo
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin_vertical')
    OR
    -- Usuário vê config da sua empresa SST pai
    empresa_id = get_empresa_sst_pai(
        (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
);
```

### ETAPA 3: Validar Implementação

- [ ] Testar com usuário `empresa_sst` → deve ver própria config
- [ ] Testar com usuário `cliente_final` → deve ver config da SST pai
- [ ] Testar com usuário `empresa_parceira` → deve ver config da SST pai
- [ ] Testar com usuário `admin_vertical` → deve ver todas as configs
- [ ] Testar isolamento entre SSTs diferentes

---

## ⚠️ REGRAS DE SEGURANÇA (NÃO VIOLAR)

1. **RLS Existente**: Não alterar políticas de outras tabelas
2. **SECURITY DEFINER**: Usar em funções que precisam bypassar RLS
3. **search_path**: Sempre definir `SET search_path = public`
4. **Performance**: Usar `(SELECT auth.uid())` em vez de `auth.uid()` direto
5. **Isolamento**: Garantir que empresa A nunca veja dados de empresa B

---

## 1. Visão Geral do Sistema

### 1.1 Objetivo Principal
Permitir que **Empresas SST** configurem estilos visuais personalizados (cores, tipografia, logo) que são **automaticamente herdados** por todos os seus acessos vinculados:
- ✅ Instrutores
- ✅ Empresas Parceiras  
- ✅ Clientes Finais

### 1.2 Fluxo Principal de Herança

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HIERARQUIA DE HERANÇA WHITE LABEL                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐                                                   │
│   │   EMPRESA SST       │  ◄── CONFIGURA o White Label                      │
│   │   (tipo: empresa_sst)│      via SSTDashboard > Configurações > Aparência│
│   └──────────┬──────────┘                                                   │
│              │                                                              │
│              │ HERDA ESTILOS PARA:                                          │
│              │                                                              │
│   ┌──────────┼──────────────────────────────────────────────┐               │
│   │          │                                              │               │
│   │          ▼                                              │               │
│   │   ┌─────────────────┐                                   │               │
│   │   │   INSTRUTOR     │  ◄── Herda via empresa_sst_id     │               │
│   │   │   (tipo: instrutor)                                 │               │
│   │   └─────────────────┘                                   │               │
│   │                                                         │               │
│   │          ▼                                              │               │
│   │   ┌─────────────────┐                                   │               │
│   │   │ EMPRESA PARCEIRA│  ◄── Herda via empresa_sst_id     │               │
│   │   │ (tipo: empresa_parceira)                            │               │
│   │   └─────────────────┘                                   │               │
│   │                                                         │               │
│   │          ▼                                              │               │
│   │   ┌─────────────────┐                                   │               │
│   │   │ CLIENTE FINAL   │  ◄── Herda via empresa_sst_id     │               │
│   │   │ (tipo: cliente_final)                               │               │
│   │   └─────────────────┘                                   │               │
│   │                                                         │               │
│   └─────────────────────────────────────────────────────────┘               │
│                                                                             │
│   ⚠️ EXCEÇÃO: admin_vertical (Toriq) NÃO herda - usa tema padrão            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura Técnica Atual

### 2.1 Componentes do Sistema

| Componente | Arquivo | Responsabilidade |
|------------|---------|------------------|
| **WhiteLabelConfig** | `src/components/sst/WhiteLabelConfig.tsx` | UI de configuração (1600+ linhas) |
| **WhiteLabelProvider** | `src/components/shared/WhiteLabelProvider.tsx` | Provider reativo que detecta login |
| **useWhiteLabel** | `src/hooks/useWhiteLabel.tsx` | Hook de aplicação de estilos |
| **whiteLabelService** | `src/services/whiteLabelService.ts` | Serviço centralizado (NOVO) |
| **whiteLabel types** | `src/types/whiteLabel.ts` | Tipos TypeScript (NOVO) |
| **colorUtils** | `src/utils/colorUtils.ts` | Conversão HEX/HSL (NOVO) |

### 2.2 Tabelas do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `white_label_config` | Armazena configurações visuais por empresa |
| `empresas` | Contém `tipo` e `empresa_sst_id` para hierarquia |

### 2.3 Função SQL de Herança

```sql
-- Função: get_empresa_sst_pai(p_empresa_id)
-- Retorna: UUID da empresa SST pai para herança de estilos
-- Lógica:
--   1. Se empresa é tipo 'empresa_sst' → retorna ela mesma
--   2. Se empresa tem empresa_sst_id → retorna empresa_sst_id
--   3. Se empresa é 'admin_vertical' → retorna NULL (tema padrão)
```

---

## 3. Fluxo Detalhado de Configuração

### 3.1 Empresa SST Configura White Label

```
PASSO 1: Navegação
├── SSTDashboard.tsx:425
│   └── activeSection === 'configuracoes'
│       └── Renderiza SSTConfiguracoes

PASSO 2: Tela de Configuração
├── SSTConfiguracoes.tsx:62
│   └── Menu lateral "Aparência"
│       └── Renderiza WhiteLabelConfig

PASSO 3: Salvamento
├── WhiteLabelConfig.tsx:406 (handleSaveToDatabase)
│   ├── Prepara dataToSave com todas as configurações
│   ├── WhiteLabelConfig.tsx:486 → supabase.update('white_label_config')
│   └── WhiteLabelConfig.tsx:507 → applyConfig() imediato

PASSO 4: Aplicação CSS
├── whiteLabelService.ts:applyWhiteLabelConfig()
│   ├── hexToHSL() → Converte cores
│   ├── formatHSL() → Formata para CSS
│   └── root.style.setProperty() → Aplica no DOM
```

### 3.2 Usuário Herdeiro Faz Login

```
PASSO 1: Login
├── AuthProvider carrega empresa do usuário
│   └── useAuth.tsx:63

PASSO 2: WhiteLabelProvider Detecta
├── WhiteLabelProvider.tsx:20-22
│   └── useEffect detecta empresa?.id

PASSO 3: Carrega Config do Banco
├── whiteLabelService.ts:loadAndApplyFromDB(empresaId)
│   ├── RPC: get_empresa_sst_pai(empresaId) → Busca SST pai
│   ├── SELECT * FROM white_label_config WHERE empresa_id = sst_pai
│   └── Se encontrou → aplica; Se não → tema padrão

PASSO 4: Cache e Aplicação
├── cacheConfig() → localStorage.setItem('wl_config')
└── applyWhiteLabelConfig() → CSS variables no DOM
```

---

## 4. Escopo de Utilização

### 4.1 Onde o White Label é Aplicado

| Tela/Componente | Aplica White Label? | Observação |
|-----------------|---------------------|------------|
| **Login** | ❌ NÃO | Usa tema padrão Toriq |
| **SSTDashboard** | ✅ SIM | Empresa SST vê seu próprio tema |
| **ClienteDashboard** | ✅ SIM | Herda tema da SST pai |
| **ParceiraDashboard** | ✅ SIM | Herda tema da SST pai |
| **InstrutorDashboard** | ✅ SIM | Herda tema da SST pai |
| **AdminDashboard** | ❌ NÃO | Toriq usa tema padrão |
| **Sidebar** | ✅ SIM | Cores via CSS variables |
| **Cards/Buttons** | ✅ SIM | Cores via CSS variables |
| **Relatórios PDF** | ⚠️ PARCIAL | Usa logo se configurado |

### 4.2 CSS Variables Aplicadas

```css
/* Background */
--background, --card, --popover

/* Texto */
--foreground, --card-foreground, --muted-foreground

/* Cores principais */
--primary, --secondary, --accent, --ring

/* Sidebar */
--sidebar-background, --sidebar-foreground, --sidebar-primary

/* Estados */
--success, --warning, --destructive, --info

/* Layout */
--radius

/* Tipografia */
--font-body, --font-heading, --font-size-base
```

---

## 5. Regras de Isolamento (Segurança)

### 5.1 Regras de Acesso

| Tipo de Usuário | Pode Configurar? | Herda De |
|-----------------|------------------|----------|
| `admin_vertical` | ❌ NÃO | Tema padrão |
| `empresa_sst` | ✅ SIM | Própria config |
| `cliente_final` | ❌ NÃO | Sua empresa_sst_id |
| `empresa_parceira` | ❌ NÃO | Sua empresa_sst_id |
| `instrutor` | ❌ NÃO | Sua empresa_sst_id |

### 5.2 Isolamento Entre Empresas SST

```
EMPRESA SST "A"                    EMPRESA SST "B"
├── Cor primária: #2563eb          ├── Cor primária: #dc2626
├── Logo: logo-a.png               ├── Logo: logo-b.png
│                                  │
├── Cliente A1 (herda A)           ├── Cliente B1 (herda B)
├── Cliente A2 (herda A)           ├── Cliente B2 (herda B)
├── Instrutor A1 (herda A)         ├── Instrutor B1 (herda B)
└── Parceira A1 (herda A)          └── Parceira B1 (herda B)

⚠️ NUNCA: Cliente A1 vê tema de B ou vice-versa
```

---

## 6. Checklist de Implementação

### 6.1 Já Implementado ✅

- [x] Tabela `white_label_config` no banco
- [x] Função SQL `get_empresa_sst_pai()`
- [x] Componente `WhiteLabelConfig.tsx` (configuração)
- [x] Provider `WhiteLabelProvider.tsx` (detecção de login)
- [x] Hook `useWhiteLabel.tsx` (aplicação)
- [x] Serviço `whiteLabelService.ts` (lógica centralizada)
- [x] Tipos `whiteLabel.ts` (TypeScript)
- [x] Utils `colorUtils.ts` (conversão de cores)

### 6.2 Pendente de Validação ⏳

- [ ] Testar herança para `instrutor`
- [ ] Testar herança para `empresa_parceira`
- [ ] Testar herança para `cliente_final`
- [ ] Validar isolamento entre empresas SST diferentes
- [ ] Testar logout/login com troca de empresa
- [ ] Validar que `admin_vertical` não herda nenhum tema

### 6.3 Melhorias Futuras 📋

- [ ] Dividir `WhiteLabelConfig.tsx` em componentes menores
- [ ] Adicionar preview em tempo real na configuração
- [ ] Permitir temas dark/light por empresa
- [ ] Cache de configuração no service worker

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Vazamento de tema entre empresas | Baixa | Alto | RLS no banco + validação no frontend |
| Performance com muitas CSS vars | Média | Baixo | Aplicar apenas vars necessárias |
| Cache desatualizado após mudança | Média | Médio | Limpar cache no logout |
| Tema não aplicado após login | Baixa | Médio | Fallback para tema padrão |

---

## 8. Aprovação

### Resumo das Ações Necessárias

| # | Ação | Tipo | Risco |
|---|------|------|-------|
| 1 | Criar função SQL `get_empresa_sst_pai` | Migration | 🟢 Baixo (nova função) |
| 2 | Ajustar RLS SELECT de `white_label_config` | Migration | 🟡 Médio (altera policy) |
| 3 | Manter RLS INSERT/UPDATE/DELETE inalteradas | - | 🟢 Nenhum |
| 4 | Testar herança para cada tipo de usuário | Validação | - |

### Checklist de Aprovação

- [ ] **Função SQL**: Aprovar criação de `get_empresa_sst_pai`
- [ ] **RLS SELECT**: Aprovar alteração para permitir herança
- [ ] **RLS INSERT/UPDATE/DELETE**: Confirmar que NÃO serão alteradas (somente SST pode editar)
- [ ] **Isolamento**: Confirmar que empresa A nunca verá tema de empresa B
- [ ] **Rollback**: Entendido como reverter se necessário

### Comando de Rollback (se necessário)

```sql
-- Reverter RLS
DROP POLICY IF EXISTS "Usuarios podem ver config da empresa SST pai" ON white_label_config;
CREATE POLICY "Usuarios podem ver config da sua empresa" ON white_label_config
FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
);

-- Remover função
DROP FUNCTION IF EXISTS get_empresa_sst_pai(UUID);
```

---

**Responda "APROVADO" para iniciar a implementação.**

**Responda "AJUSTAR" + comentários se precisar de mudanças.**
