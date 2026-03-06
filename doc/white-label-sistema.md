# Sistema White Label - Documentação Técnica

## Visão Geral

O sistema White Label permite que cada **Empresa SST** personalize a aparência visual do sistema para ela e todos os acessos que ela criou (clientes, parceiros, instrutores).

## Hierarquia de Estilos

```
┌─────────────────────────────────────────────────────────────────┐
│                    VERTICAL ON (Toriq)                          │
│                    → Tema padrão (sem white label)              │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Empresa SST A │     │ Empresa SST B │     │ Empresa SST C │
│ (Tema A)      │     │ (Tema B)      │     │ (Tema padrão) │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │
        ▼                     ▼
┌───────────────┐     ┌───────────────┐
│ Herdam Tema A │     │ Herdam Tema B │
│ • Clientes    │     │ • Clientes    │
│ • Parceiros   │     │ • Parceiros   │
│ • Instrutores │     │ • Instrutores │
└───────────────┘     └───────────────┘
```

## Regras de Negócio

### 1. Isolamento de Estilos
- Cada empresa SST tem seu próprio estilo **isolado**
- O estilo de uma empresa SST **NÃO vaza** para outras empresas SST
- Empresas SST sem configuração usam o tema padrão

### 2. Herança em Cascata
- **Empresa SST**: Define e configura seu próprio estilo
- **Cliente Final**: Herda o estilo da empresa SST que o criou
- **Empresa Parceira**: Herda o estilo da empresa SST que a vinculou
- **Instrutor**: Herda o estilo da empresa SST ou parceira que o criou

### 3. Carregamento Automático
- Ao fazer login, o sistema carrega automaticamente o estilo da empresa SST pai
- O estilo é aplicado antes de renderizar a interface
- Se não houver estilo configurado, usa o tema padrão

## Arquitetura Técnica

### Tabelas Envolvidas

```sql
-- Configuração white label (uma por empresa SST)
white_label_config
├── empresa_id (FK → empresas.id)
├── logo_url, favicon_url
├── primary_color, secondary_color, ...
└── font_body, font_heading, ...

-- Relacionamentos para herança
clientes_sst
├── empresa_sst_id (empresa SST pai)
└── cliente_empresa_id (empresa cliente)

empresas_parceiras
├── empresa_sst_id (empresa SST pai)
└── parceira_empresa_id (empresa parceira)

instrutores
├── empresa_id (empresa SST ou parceira)
└── empresa_parceira_id (se vinculado a parceira)
```

### Função de Hierarquia

```sql
-- Função que retorna a empresa SST pai de qualquer empresa
get_empresa_sst_pai(p_empresa_id UUID) → UUID

-- Lógica:
-- 1. Se tipo = 'vertical_on' → NULL (tema padrão)
-- 2. Se tipo = 'sst' → retorna a própria empresa
-- 3. Se tipo = 'cliente_final' → busca em clientes_sst.empresa_sst_id
-- 4. Se tipo = 'empresa_parceira' → busca em empresas_parceiras.empresa_sst_id
```

### Hooks React

```typescript
// Hook para buscar config da empresa SST pai
useEmpresaWhiteLabel(empresaId) → { config, loading }

// Hook para aplicar estilos CSS
useWhiteLabel() → { applyConfig, resetConfig }

// Função para carregar e aplicar config completa do banco
loadAndApplyWhiteLabelFromDB(empresaId) → Promise<void>
```

## Fluxo de Carregamento

```
1. Usuário faz login
   ↓
2. AuthProvider carrega profile e empresa
   ↓
3. App.tsx detecta empresa_id do usuário
   ↓
4. Chama get_empresa_sst_pai(empresa_id)
   ↓
5. Se retornar empresa SST:
   → Busca white_label_config dessa empresa
   → Aplica estilos via CSS variables
   ↓
6. Se retornar NULL:
   → Usa tema padrão (não aplica nada)
   ↓
7. Interface renderiza com o tema correto
```

## Componentes que Usam White Label

- **SSTSidebar**: Logo da empresa
- **Toda a aplicação**: Cores, fontes, bordas via CSS variables
- **WhiteLabelConfig**: Interface de configuração (só empresa SST)

## CSS Variables Aplicadas

```css
/* Cores principais */
--background, --foreground
--primary, --secondary, --accent
--card, --popover, --border

/* Sidebar */
--sidebar-background, --sidebar-foreground
--sidebar-primary, --sidebar-accent, --sidebar-border

/* Estados */
--success, --warning, --destructive, --info

/* Tipografia */
--font-body, --font-heading
--font-size-base, --font-weight-base, --line-height-base

/* Layout */
--radius
```

## Segurança

- Apenas empresas do tipo `sst` podem configurar white label
- A configuração é vinculada ao `empresa_id` da empresa SST
- RLS garante que cada empresa só acessa sua própria configuração
- Empresas filhas (clientes, parceiros) só leem, não escrevem
