---
status: active
generated: 2026-01-26
agents:
  - type: "refactoring-specialist"
    role: "Refatorar código existente para melhor organização e manutenibilidade"
  - type: "frontend-specialist"
    role: "Implementar melhorias na UI de configuração White Label"
  - type: "performance-optimizer"
    role: "Otimizar carregamento e aplicação de estilos CSS"
phases:
  - id: "phase-1"
    name: "Análise e Planejamento"
    prevc: "P"
  - id: "phase-2"
    name: "Refatoração do Core"
    prevc: "E"
  - id: "phase-3"
    name: "Validação e Testes"
    prevc: "V"
---

# Plano de Refatoração do Sistema White Label

> Refatoração e melhorias no sistema White Label para configuração e aplicação de estilos globais por empresa SST, incluindo herança automática para acessos herdeiros (clientes, parceiros, instrutores).

## Task Snapshot
- **Primary goal:** Refatorar o sistema White Label para melhor organização, performance e manutenibilidade
- **Success signal:** Sistema aplicando estilos corretamente com código mais limpo e tipado
- **Key references:**
  - `src/hooks/useWhiteLabel.tsx` - Hook principal de aplicação de estilos
  - `src/components/sst/WhiteLabelConfig.tsx` - Componente de configuração (1600+ linhas)
  - `src/components/shared/WhiteLabelProvider.tsx` - Provider reativo

## Codebase Context

### Arquitetura Atual
```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO WHITE LABEL                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CONFIGURAÇÃO (Empresa SST)                                  │
│     SSTDashboard → SSTConfiguracoes → WhiteLabelConfig          │
│     └── handleSaveToDatabase() → white_label_config table       │
│                                                                 │
│  2. HERANÇA (Login de usuário)                                  │
│     WhiteLabelProvider detecta empresa                          │
│     └── loadAndApplyWhiteLabelFromDB(empresaId)                 │
│         ├── RPC: get_empresa_sst_pai(empresaId)                 │
│         ├── SELECT * FROM white_label_config                    │
│         ├── localStorage.setItem('wl_config')                   │
│         └── applyWhiteLabelConfig(config)                       │
│                                                                 │
│  3. APLICAÇÃO CSS                                               │
│     applyWhiteLabelConfig()                                     │
│     ├── hexToHSL() - Conversão de cores                         │
│     ├── formatHSL() - Formatação para CSS                       │
│     └── root.style.setProperty() - Aplicação no DOM             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Problemas Identificados

1. **Arquivo muito grande**: `WhiteLabelConfig.tsx` tem 1600+ linhas
2. **Tipos duplicados**: Interface `WhiteLabelConfig` definida em múltiplos lugares
3. **Conversão snake_case/camelCase**: Feita manualmente em vários pontos
4. **Falta de constantes centralizadas**: CSS variables espalhadas pelo código
5. **Console.logs em produção**: Muitos logs de debug deixados no código
6. **Tipagem fraca**: Uso de `(supabase as any)` em várias queries

## Plano de Refatoração

### Fase 1: Criar Tipos e Constantes Centralizadas

**Arquivo:** `src/types/whiteLabel.ts`

```typescript
// Tipos centralizados para o sistema White Label
export interface WhiteLabelConfig {
  // Identidade
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  faviconUrl?: string;
  
  // Cores principais
  bgColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  textColor?: string;
  mutedColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  
  // Cores de estado
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
  infoColor?: string;
  
  // Tipografia
  fontBody?: string;
  fontHeading?: string;
  baseFontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  
  // Layout
  radius?: number;
  density?: number;
}

// Mapeamento snake_case (DB) <-> camelCase (Frontend)
export const DB_TO_FRONTEND_MAP = {
  bg_color: 'bgColor',
  surface_color: 'surfaceColor',
  // ... etc
} as const;
```

### Fase 2: Extrair Utilitários de Cor

**Arquivo:** `src/utils/colorUtils.ts`

```typescript
// Funções de conversão de cores
export function hexToHSL(hex: string): HSLColor | null;
export function formatHSL(hsl: HSLColor): string;
export function lightenColor(hsl: HSLColor, amount: number): HSLColor;
```

### Fase 3: Criar Serviço de White Label

**Arquivo:** `src/services/whiteLabelService.ts`

```typescript
// Centralizar lógica de negócio
export const whiteLabelService = {
  async loadConfig(empresaId: string): Promise<WhiteLabelConfig | null>;
  async saveConfig(empresaId: string, config: WhiteLabelConfig): Promise<void>;
  applyToDOM(config: WhiteLabelConfig): void;
  clearFromDOM(): void;
  cacheConfig(config: WhiteLabelConfig): void;
  getCachedConfig(): WhiteLabelConfig | null;
};
```

### Fase 4: Dividir WhiteLabelConfig.tsx

Dividir o componente de 1600+ linhas em:

1. `WhiteLabelConfig/index.tsx` - Componente principal (orquestrador)
2. `WhiteLabelConfig/BrandingSection.tsx` - Seção de branding
3. `WhiteLabelConfig/ColorsSection.tsx` - Seção de cores
4. `WhiteLabelConfig/TypographySection.tsx` - Seção de tipografia
5. `WhiteLabelConfig/KanbanSection.tsx` - Seção de configuração Kanban
6. `WhiteLabelConfig/PreviewPanel.tsx` - Painel de preview
7. `WhiteLabelConfig/hooks/useWhiteLabelForm.ts` - Hook de formulário
8. `WhiteLabelConfig/constants.ts` - Valores padrão e opções

### Fase 5: Refatorar useWhiteLabel.tsx

- Remover console.logs de debug
- Usar tipos centralizados
- Extrair constantes de CSS variables
- Melhorar tratamento de erros
## Implementação

### Checklist de Tarefas

- [x] **Fase 1**: Criar `src/types/whiteLabel.ts` com tipos centralizados
- [x] **Fase 2**: Criar `src/utils/colorUtils.ts` com funções de conversão
- [x] **Fase 3**: Criar `src/services/whiteLabelService.ts` com lógica centralizada
- [x] **Fase 4**: Refatorar `useWhiteLabel.tsx` para usar novos módulos
- [x] **Fase 5**: Atualizar `WhiteLabelProvider.tsx` para usar serviço
- [x] **Fase 6**: Limpar console.logs e melhorar tipagem

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/types/whiteLabel.ts` | Criar | Tipos e interfaces centralizadas |
| `src/utils/colorUtils.ts` | Criar | Funções de conversão de cores |
| `src/services/whiteLabelService.ts` | Criar | Serviço centralizado |
| `src/hooks/useWhiteLabel.tsx` | Modificar | Usar novos módulos |
| `src/components/shared/WhiteLabelProvider.tsx` | Modificar | Usar serviço |

## Rollback

Se necessário reverter, os arquivos originais estão preservados no git. Basta:
```bash
git checkout HEAD~1 -- src/hooks/useWhiteLabel.tsx
git checkout HEAD~1 -- src/components/shared/WhiteLabelProvider.tsx
```
