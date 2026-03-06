# 🎨 Proposta de Redesign - Sistema Vertical SST

## Visão Geral
Redesign completo com foco em aparência **tecnológica e premium**, mantendo funcionalidade e fluxos existentes.

---

# PARTE A: DIREÇÕES VISUAIS

## 1. 🌙 Dark Tech (Recomendada)

**Conceito:** Interface escura sofisticada com acentos vibrantes, inspirada em dashboards de fintechs e SaaS modernos como Linear, Vercel e Raycast.

**Características:**
- Background escuro com gradientes sutis
- Acentos em laranja/âmbar (identidade Vertical) + cyan para contraste
- Bordas sutis com opacidade
- Efeitos de glow em elementos interativos
- Hierarquia clara através de superfícies em diferentes níveis de cinza

**Prós:**
- ✅ Aparência premium e moderna instantânea
- ✅ Reduz fadiga visual em uso prolongado
- ✅ Destaca dados e métricas importantes
- ✅ Tendência atual em SaaS B2B
- ✅ Excelente contraste para KPIs e gráficos

**Contras:**
- ⚠️ Pode parecer "pesado" para alguns usuários
- ⚠️ Requer cuidado com acessibilidade de cores
- ⚠️ Impressão de documentos pode ser afetada

---

## 2. 🔮 Glass + Neon

**Conceito:** Glassmorphism com efeitos de blur, bordas luminosas e acentos neon. Inspirado em interfaces futuristas e apps como Figma e Notion.

**Características:**
- Fundos com blur (backdrop-filter)
- Bordas com gradientes luminosos
- Efeitos de brilho em hover
- Cores neon (cyan, magenta, verde)
- Camadas translúcidas sobrepostas

**Prós:**
- ✅ Visual extremamente moderno e diferenciado
- ✅ Sensação de profundidade e dimensão
- ✅ Impressiona na primeira impressão
- ✅ Flexível para light/dark mode

**Contras:**
- ⚠️ Performance pode ser afetada (blur é pesado)
- ⚠️ Pode distrair do conteúdo principal
- ⚠️ Difícil manter consistência em todas as telas
- ⚠️ Pode parecer "datado" rapidamente

---

## 3. ☀️ Light Premium Tech

**Conceito:** Interface clara e limpa com toques premium através de sombras refinadas, tipografia elegante e micro-animações. Inspirado em Stripe, Linear (light mode) e Apple.

**Características:**
- Fundo branco/off-white com superfícies em tons de cinza claro
- Sombras suaves e multicamadas
- Tipografia Inter/SF Pro com pesos variados
- Acentos coloridos pontuais
- Espaçamento generoso

**Prós:**
- ✅ Familiar e fácil de usar
- ✅ Excelente legibilidade
- ✅ Profissional e corporativo
- ✅ Boa performance

**Contras:**
- ⚠️ Menos impactante visualmente
- ⚠️ Pode parecer "genérico"
- ⚠️ Não transmite "tech" tão fortemente

---

## 📊 Recomendação: **Dark Tech**

Motivos:
1. Impacto visual imediato ao abrir o sistema
2. Alinha com tendências de SaaS premium (Linear, Vercel, Raycast)
3. Destaca métricas e dados importantes
4. Mantém a identidade laranja da Vertical como acento
5. Diferencia o produto no mercado de SST (geralmente conservador)

---

# PARTE B: DESIGN SYSTEM - DARK TECH

## 🎨 Paleta de Cores

### Backgrounds
| Token | Valor | Uso |
|-------|-------|-----|
| `--bg-base` | `#09090b` | Fundo principal (zinc-950) |
| `--bg-elevated` | `#18181b` | Superfícies elevadas (zinc-900) |
| `--bg-surface` | `#27272a` | Cards, modais (zinc-800) |
| `--bg-muted` | `#3f3f46` | Áreas secundárias (zinc-700) |

### Bordas
| Token | Valor | Uso |
|-------|-------|-----|
| `--border-default` | `rgba(255,255,255,0.08)` | Bordas padrão |
| `--border-subtle` | `rgba(255,255,255,0.04)` | Bordas sutis |
| `--border-strong` | `rgba(255,255,255,0.16)` | Bordas destacadas |

### Texto
| Token | Valor | Uso |
|-------|-------|-----|
| `--text-primary` | `#fafafa` | Texto principal (zinc-50) |
| `--text-secondary` | `#a1a1aa` | Texto secundário (zinc-400) |
| `--text-muted` | `#71717a` | Texto desabilitado (zinc-500) |
| `--text-inverse` | `#09090b` | Texto em fundos claros |

### Cores de Marca
| Token | Valor | Uso |
|-------|-------|-----|
| `--primary` | `#f97316` | Laranja principal (orange-500) |
| `--primary-hover` | `#ea580c` | Hover (orange-600) |
| `--primary-glow` | `rgba(249,115,22,0.25)` | Glow effect |
| `--secondary` | `#06b6d4` | Cyan para contraste (cyan-500) |
| `--secondary-glow` | `rgba(6,182,212,0.25)` | Glow effect |

### Estados
| Token | Valor | Uso |
|-------|-------|-----|
| `--success` | `#22c55e` | Sucesso (green-500) |
| `--success-bg` | `rgba(34,197,94,0.15)` | Background sucesso |
| `--warning` | `#eab308` | Alerta (yellow-500) |
| `--warning-bg` | `rgba(234,179,8,0.15)` | Background alerta |
| `--error` | `#ef4444` | Erro (red-500) |
| `--error-bg` | `rgba(239,68,68,0.15)` | Background erro |
| `--info` | `#3b82f6` | Info (blue-500) |
| `--info-bg` | `rgba(59,130,246,0.15)` | Background info |

### Temperatura de Leads
| Token | Valor | Uso |
|-------|-------|-----|
| `--temp-frio` | `#3b82f6` | Lead frio (blue) |
| `--temp-morno` | `#eab308` | Lead morno (yellow) |
| `--temp-quente` | `#ef4444` | Lead quente (red) |

---

## 📝 Tipografia

### Família
- **Principal:** Inter (Google Fonts)
- **Monospace:** JetBrains Mono (para códigos/IDs)

### Escala de Tamanhos
| Token | Tamanho | Line Height | Uso |
|-------|---------|-------------|-----|
| `--text-xs` | 11px | 16px | Labels pequenos, badges |
| `--text-sm` | 13px | 20px | Texto secundário, tabelas |
| `--text-base` | 14px | 22px | Texto padrão |
| `--text-md` | 15px | 24px | Texto destacado |
| `--text-lg` | 18px | 28px | Subtítulos |
| `--text-xl` | 20px | 28px | Títulos de seção |
| `--text-2xl` | 24px | 32px | Títulos de página |
| `--text-3xl` | 30px | 36px | Headlines |
| `--text-4xl` | 36px | 40px | KPIs grandes |

### Pesos
| Token | Peso | Uso |
|-------|------|-----|
| `--font-normal` | 400 | Texto corrido |
| `--font-medium` | 500 | Labels, botões |
| `--font-semibold` | 600 | Títulos, destaques |
| `--font-bold` | 700 | Headlines, KPIs |

---

## 📐 Grid & Spacing

### Escala Base (4px)
```
--space-0: 0px
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-20: 80px
```

### Border Radius
| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | 4px | Badges, tags |
| `--radius-md` | 6px | Inputs, botões pequenos |
| `--radius-lg` | 8px | Cards, botões |
| `--radius-xl` | 12px | Modais, painéis |
| `--radius-2xl` | 16px | Containers grandes |
| `--radius-full` | 9999px | Avatares, pills |

### Sombras
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.4);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.4);
--shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
--shadow-glow-primary: 0 0 20px rgba(249,115,22,0.3);
--shadow-glow-secondary: 0 0 20px rgba(6,182,212,0.3);
```

---

## 🧩 Componentes

### Botões

**Primary Button**
```
Background: linear-gradient(135deg, var(--primary), #dc5a0a)
Border: none
Text: white, font-medium
Padding: 10px 16px
Border-radius: var(--radius-lg)
Shadow: var(--shadow-md)
Hover: brightness(1.1), shadow-glow-primary
Active: scale(0.98)
Transition: all 150ms ease
```

**Secondary Button**
```
Background: var(--bg-surface)
Border: 1px solid var(--border-strong)
Text: var(--text-primary), font-medium
Hover: background var(--bg-muted), border-color var(--primary)
```

**Ghost Button**
```
Background: transparent
Border: none
Text: var(--text-secondary)
Hover: background rgba(255,255,255,0.05), text var(--text-primary)
```

**Danger Button**
```
Background: var(--error-bg)
Border: 1px solid rgba(239,68,68,0.3)
Text: var(--error)
Hover: background var(--error), text white
```

### Inputs

```
Background: var(--bg-base)
Border: 1px solid var(--border-default)
Border-radius: var(--radius-md)
Padding: 10px 12px
Text: var(--text-primary)
Placeholder: var(--text-muted)

Focus:
  Border-color: var(--primary)
  Box-shadow: 0 0 0 3px var(--primary-glow)
  
Error:
  Border-color: var(--error)
  Box-shadow: 0 0 0 3px var(--error-bg)
```

### Badges

**Status Badge**
```
Padding: 2px 8px
Border-radius: var(--radius-full)
Font-size: var(--text-xs)
Font-weight: var(--font-medium)

Variants:
- Success: bg var(--success-bg), text var(--success), border 1px solid rgba(34,197,94,0.3)
- Warning: bg var(--warning-bg), text var(--warning), border 1px solid rgba(234,179,8,0.3)
- Error: bg var(--error-bg), text var(--error), border 1px solid rgba(239,68,68,0.3)
- Info: bg var(--info-bg), text var(--info), border 1px solid rgba(59,130,246,0.3)
- Neutral: bg var(--bg-muted), text var(--text-secondary)
```

### Cards

```
Background: var(--bg-elevated)
Border: 1px solid var(--border-default)
Border-radius: var(--radius-xl)
Padding: var(--space-6)
Shadow: var(--shadow-md)

Hover (interactive):
  Border-color: var(--border-strong)
  Transform: translateY(-2px)
  Shadow: var(--shadow-lg)
```

### Kanban Column

```
Background: var(--bg-elevated)
Border: 1px solid var(--border-default)
Border-radius: var(--radius-xl)
Min-width: 320px
Max-height: calc(100vh - 200px)

Header:
  Padding: var(--space-4)
  Border-bottom: 1px solid var(--border-subtle)
  Display: flex, justify-between, align-center
  
  Title:
    Font-size: var(--text-md)
    Font-weight: var(--font-semibold)
    
  Count Badge:
    Background: var(--bg-muted)
    Padding: 2px 8px
    Border-radius: var(--radius-full)
    Font-size: var(--text-xs)

Body:
  Padding: var(--space-3)
  Overflow-y: auto
  Gap: var(--space-3)
```

### Kanban Card

```
Background: var(--bg-surface)
Border: 1px solid var(--border-default)
Border-radius: var(--radius-lg)
Padding: var(--space-4)
Cursor: pointer

Hover:
  Border-color: var(--primary)
  Box-shadow: 0 0 0 1px var(--primary-glow)

Dragging:
  Opacity: 0.9
  Transform: rotate(3deg)
  Box-shadow: var(--shadow-xl)

Temperature Indicator (left border):
  Width: 3px
  Border-radius: var(--radius-full) 0 0 var(--radius-full)
  Background: var(--temp-{frio|morno|quente})
```

### Tabelas

```
Background: var(--bg-elevated)
Border: 1px solid var(--border-default)
Border-radius: var(--radius-xl)
Overflow: hidden

Header:
  Background: var(--bg-surface)
  Border-bottom: 1px solid var(--border-default)
  
  Cell:
    Padding: var(--space-3) var(--space-4)
    Font-size: var(--text-xs)
    Font-weight: var(--font-semibold)
    Text-transform: uppercase
    Letter-spacing: 0.05em
    Color: var(--text-muted)

Body Row:
  Border-bottom: 1px solid var(--border-subtle)
  Transition: background 150ms
  
  Hover:
    Background: rgba(255,255,255,0.02)
    
  Cell:
    Padding: var(--space-3) var(--space-4)
    Font-size: var(--text-sm)
    Color: var(--text-primary)
```

### Sidebar

```
Background: var(--bg-base)
Border-right: 1px solid var(--border-default)
Width: 260px

Header:
  Padding: var(--space-4)
  Border-bottom: 1px solid var(--border-subtle)
  
  Logo Area:
    Display: flex, gap var(--space-3)
    
    Icon Container:
      Width: 40px
      Height: 40px
      Background: linear-gradient(135deg, var(--primary), #dc5a0a)
      Border-radius: var(--radius-lg)
      Display: flex, center
      
    Title:
      Font-size: var(--text-sm)
      Font-weight: var(--font-semibold)
      
    Subtitle:
      Font-size: var(--text-xs)
      Color: var(--text-muted)

Menu Item:
  Padding: var(--space-2) var(--space-3)
  Border-radius: var(--radius-md)
  Font-size: var(--text-sm)
  Color: var(--text-secondary)
  Transition: all 150ms
  
  Hover:
    Background: rgba(255,255,255,0.05)
    Color: var(--text-primary)
    
  Active:
    Background: var(--primary-glow)
    Color: var(--primary)
    Font-weight: var(--font-medium)
```

---

# PARTE C: ESPECIFICAÇÃO DE TELAS

## 1. 🏠 Dashboard Inicial (Nova Tela)

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR │                    MAIN CONTENT                        │
│         │ ┌─────────────────────────────────────────────────────┐│
│ [Logo]  │ │ Header: "Bom dia, João" + Data/Hora                 ││
│         │ │ Subtítulo: "Aqui está o resumo do seu dia"          ││
│ ─────── │ └─────────────────────────────────────────────────────┘│
│         │                                                        │
│ Menu    │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ Items   │ │ KPI Card │ │ KPI Card │ │ KPI Card │ │ KPI Card │   │
│         │ │ Leads    │ │ Ativid.  │ │ Conversão│ │ Pendentes│   │
│         │ │ Novos    │ │ Hoje     │ │ Mês      │ │ Follow-up│   │
│         │ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│         │                                                        │
│         │ ┌─────────────────────────┐ ┌─────────────────────────┐│
│         │ │    ATALHOS RÁPIDOS      │ │   ATIVIDADE RECENTE     ││
│         │ │                         │ │                         ││
│         │ │ [+ Novo Lead]           │ │ • João moveu "Empresa X"││
│         │ │ [📊 Ver Kanban]         │ │   para Qualificação     ││
│         │ │ [📋 Empresas]           │ │   há 5 min              ││
│         │ │ [📈 Relatórios]         │ │                         ││
│         │ │                         │ │ • Maria registrou nota  ││
│         │ └─────────────────────────┘ │   em "Lead Y"           ││
│         │                             │   há 15 min             ││
│         │ ┌─────────────────────────┐ │                         ││
│         │ │   PIPELINE RESUMIDO     │ │ • Sistema: 3 follow-ups ││
│         │ │   (mini kanban visual)  │ │   pendentes para hoje   ││
│         │ │                         │ └─────────────────────────┘│
│         │ │ [===][====][==][=]      │                            │
│         │ │  12    8    5   3       │                            │
│         │ └─────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### KPI Cards
Cada card contém:
- **Ícone** (em círculo com background gradiente)
- **Valor grande** (font-4xl, font-bold)
- **Label** (text-sm, text-muted)
- **Variação** (badge com seta ↑↓ e porcentagem)
- **Sparkline** (mini gráfico de tendência)

Exemplo:
```
┌────────────────────────┐
│ 🎯                     │
│                   +12% │
│ 47                 ↑   │
│ Leads Novos           │
│ ▁▂▃▅▆▇ (sparkline)    │
└────────────────────────┘
```

### Atalhos Rápidos
Grid 2x2 de botões grandes:
- Background: var(--bg-surface)
- Border: 1px dashed var(--border-strong)
- Hover: border-solid, border-color var(--primary)
- Ícone grande + texto

### Atividade Recente
Lista com:
- Avatar do usuário (ou ícone do sistema)
- Descrição da ação
- Timestamp relativo ("há 5 min")
- Indicador de tipo (cor na lateral)

### Pipeline Resumido
Barra horizontal segmentada mostrando:
- Proporção de leads por etapa
- Cores correspondentes às colunas do Kanban
- Números abaixo de cada segmento
- Clicável para ir ao Kanban

---

## 2. 📋 Kanban "SDR – Prospecção"

### Layout Atualizado
```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR │                    KANBAN BOARD                        │
│         │ ┌─────────────────────────────────────────────────────┐│
│         │ │ Header                                              ││
│         │ │ [🎯 SDR - Prospecção]        [🔍 Buscar] [+ Lead]   ││
│         │ │ "Gerencie seus leads"         [Filtros] [⚙️]        ││
│         │ └─────────────────────────────────────────────────────┘│
│         │                                                        │
│         │ ┌─────────────────────────────────────────────────────┐│
│         │ │ Stats Bar (horizontal)                              ││
│         │ │ Total: 47 leads │ Novos: 12 │ Em progresso: 28 │... ││
│         │ └─────────────────────────────────────────────────────┘│
│         │                                                        │
│         │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│         │ │ NOVO   │ │CONTATO │ │QUALIF. │ │PROPOSTA│ │FECHADO ││
│         │ │ LEAD   │ │INICIAL │ │        │ │ENVIADA │ │/GANHO  ││
│         │ │ (12)   │ │ (8)    │ │ (15)   │ │ (7)    │ │ (5)    ││
│         │ │────────│ │────────│ │────────│ │────────│ │────────││
│         │ │ [Card] │ │ [Card] │ │ [Card] │ │ [Card] │ │ [Card] ││
│         │ │ [Card] │ │ [Card] │ │ [Card] │ │        │ │        ││
│         │ │ [Card] │ │        │ │ [Card] │ │        │ │        ││
│         │ │  ...   │ │        │ │  ...   │ │        │ │        ││
│         │ │        │ │        │ │        │ │        │ │        ││
│         │ │[+Lead] │ │[+Lead] │ │[+Lead] │ │[+Lead] │ │[+Lead] ││
│         │ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Header Redesenhado
- Título com ícone (🎯 ou Target icon)
- Subtítulo em text-muted
- Barra de busca com ícone integrado
- Botão primário "+ Novo Lead" com glow
- Dropdown de filtros (temperatura, responsável, data)
- Botão de configurações (⚙️)

### Stats Bar
Barra horizontal com métricas rápidas:
- Background: var(--bg-surface)
- Separadores verticais sutis
- Cada métrica: número + label
- Hover mostra tooltip com detalhes

### Colunas Kanban
- Header com cor de destaque (borda superior colorida)
- Contador de cards em badge
- Menu de opções (⋮)
- Área de scroll suave
- Botão "+ Adicionar Lead" no footer (ghost style)
- Drop zone visual quando arrastando

### Cards Kanban Redesenhados
```
┌─────────────────────────────────────┐
│ 🔵│ Empresa ABC Ltda           ⋮   │
│   │ João Silva                      │
│   │────────────────────────────────│
│   │ 📧 joao@empresa.com            │
│   │ 📱 (11) 99999-9999             │
│   │────────────────────────────────│
│   │ 🏷️ Indicação  📅 há 2 dias     │
│   │                                 │
│   │ [👤 Avatar] Responsável: Maria  │
└─────────────────────────────────────┘

Legenda:
🔵 = Indicador de temperatura (borda lateral)
⋮ = Menu de ações
```

Elementos do card:
1. **Borda lateral colorida** (temperatura)
2. **Título** (nome do lead/empresa) - font-medium
3. **Contato principal** - text-sm, text-muted
4. **Dados de contato** - ícones + texto
5. **Tags** - origem, data de criação
6. **Responsável** - avatar pequeno + nome

---

## 3. 🏢 Lista "Empresas" (Tabela)

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR │                    EMPRESAS                            │
│         │ ┌─────────────────────────────────────────────────────┐│
│         │ │ Header                                              ││
│         │ │ [🏢 Empresas]              [🔍 Buscar empresas...]  ││
│         │ │ "Gerencie as empresas"     [Filtros] [+ Empresa]    ││
│         │ └─────────────────────────────────────────────────────┘│
│         │                                                        │
│         │ ┌─────────────────────────────────────────────────────┐│
│         │ │ Tabs: [Todas] [Ativas] [Inativas] [Pendentes]       ││
│         │ └─────────────────────────────────────────────────────┘│
│         │                                                        │
│         │ ┌─────────────────────────────────────────────────────┐│
│         │ │ TABLE                                               ││
│         │ │─────────────────────────────────────────────────────││
│         │ │ □ │ EMPRESA      │ CNPJ       │ STATUS │ AÇÕES     ││
│         │ │─────────────────────────────────────────────────────││
│         │ │ □ │ [Logo] ABC   │ 00.000/0001│ ● Ativa│ [👁][✏️][🗑]││
│         │ │ □ │ [Logo] XYZ   │ 11.111/0001│ ○ Pend.│ [👁][✏️][🗑]││
│         │ │ □ │ [Logo] 123   │ 22.222/0001│ ● Ativa│ [👁][✏️][🗑]││
│         │ │─────────────────────────────────────────────────────││
│         │ │ Mostrando 1-10 de 47          [◀][1][2][3][▶]       ││
│         │ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Elementos da Tabela

**Header da Tabela:**
- Checkbox para seleção em massa
- Colunas com sorting (clicável)
- Ícone de ordenação (↑↓)

**Linhas:**
- Hover com background sutil
- Checkbox de seleção
- Avatar/Logo da empresa (placeholder se não tiver)
- Nome em font-medium
- CNPJ formatado
- Status com badge colorido
- Ações em botões icon-only com tooltip

**Paginação:**
- Info "Mostrando X-Y de Z"
- Botões de navegação
- Seletor de itens por página

**Ações em Massa:**
- Aparece quando items selecionados
- "X selecionados" + botões de ação

---

# PARTE D: TOKENS CSS/TAILWIND

## CSS Variables (globals.css)

```css
@layer base {
  :root {
    /* === DARK TECH THEME === */
    
    /* Backgrounds */
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    
    --bg-base: 240 10% 3.9%;
    --bg-elevated: 240 5.9% 10%;
    --bg-surface: 240 3.7% 15.9%;
    --bg-muted: 240 3.7% 25%;
    
    /* Cards & Popovers */
    --card: 240 5.9% 10%;
    --card-foreground: 0 0% 98%;
    --popover: 240 5.9% 10%;
    --popover-foreground: 0 0% 98%;
    
    /* Primary - Orange */
    --primary: 24.6 95% 53.1%;
    --primary-foreground: 0 0% 100%;
    --primary-glow: 24.6 95% 53.1% / 0.25;
    
    /* Secondary - Cyan */
    --secondary: 187.9 85.7% 53.3%;
    --secondary-foreground: 240 10% 3.9%;
    --secondary-glow: 187.9 85.7% 53.3% / 0.25;
    
    /* Muted */
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    
    /* Accent */
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    
    /* Destructive */
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    
    /* Borders */
    --border: 240 3.7% 15.9%;
    --border-subtle: 0 0% 100% / 0.04;
    --border-default: 0 0% 100% / 0.08;
    --border-strong: 0 0% 100% / 0.16;
    
    /* Inputs & Rings */
    --input: 240 3.7% 15.9%;
    --ring: 24.6 95% 53.1%;
    
    /* Radius */
    --radius: 0.5rem;
    --radius-sm: 0.25rem;
    --radius-md: 0.375rem;
    --radius-lg: 0.5rem;
    --radius-xl: 0.75rem;
    --radius-2xl: 1rem;
    
    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.4);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.4);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
    --shadow-glow-primary: 0 0 20px hsl(var(--primary) / 0.3);
    --shadow-glow-secondary: 0 0 20px hsl(var(--secondary) / 0.3);
    
    /* Status Colors */
    --success: 142.1 76.2% 36.3%;
    --success-bg: 142.1 76.2% 36.3% / 0.15;
    --warning: 47.9 95.8% 53.1%;
    --warning-bg: 47.9 95.8% 53.1% / 0.15;
    --error: 0 84.2% 60.2%;
    --error-bg: 0 84.2% 60.2% / 0.15;
    --info: 217.2 91.2% 59.8%;
    --info-bg: 217.2 91.2% 59.8% / 0.15;
    
    /* Temperature */
    --temp-frio: 217.2 91.2% 59.8%;
    --temp-morno: 47.9 95.8% 53.1%;
    --temp-quente: 0 84.2% 60.2%;
    
    /* Sidebar */
    --sidebar-background: 240 10% 3.9%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 24.6 95% 53.1%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 0 0% 100% / 0.08;
    --sidebar-ring: 24.6 95% 53.1%;
  }
}

/* === CUSTOM UTILITIES === */
@layer utilities {
  .glow-primary {
    box-shadow: var(--shadow-glow-primary);
  }
  
  .glow-secondary {
    box-shadow: var(--shadow-glow-secondary);
  }
  
  .border-gradient {
    border: 1px solid transparent;
    background: linear-gradient(var(--bg-surface), var(--bg-surface)) padding-box,
                linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary))) border-box;
  }
  
  .text-gradient {
    background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .animate-glow {
    animation: glow 2s ease-in-out infinite alternate;
  }
  
  @keyframes glow {
    from {
      box-shadow: 0 0 10px hsl(var(--primary) / 0.2);
    }
    to {
      box-shadow: 0 0 20px hsl(var(--primary) / 0.4);
    }
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
}
```

## Tailwind Config Extension (tailwind.config.ts)

```typescript
import type { Config } from "tailwindcss";

export default {
  // ... existing config
  theme: {
    extend: {
      colors: {
        // Status
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        error: "hsl(var(--error))",
        info: "hsl(var(--info))",
        
        // Temperature
        "temp-frio": "hsl(var(--temp-frio))",
        "temp-morno": "hsl(var(--temp-morno))",
        "temp-quente": "hsl(var(--temp-quente))",
        
        // Surfaces
        "bg-base": "hsl(var(--bg-base))",
        "bg-elevated": "hsl(var(--bg-elevated))",
        "bg-surface": "hsl(var(--bg-surface))",
        "bg-muted": "hsl(var(--bg-muted))",
      },
      
      borderColor: {
        subtle: "hsl(var(--border-subtle))",
        default: "hsl(var(--border-default))",
        strong: "hsl(var(--border-strong))",
      },
      
      boxShadow: {
        "glow-primary": "var(--shadow-glow-primary)",
        "glow-secondary": "var(--shadow-glow-secondary)",
      },
      
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],    // 11px
        xs: ["0.8125rem", { lineHeight: "1.25rem" }],    // 13px
        sm: ["0.875rem", { lineHeight: "1.375rem" }],    // 14px
        base: ["0.9375rem", { lineHeight: "1.5rem" }],   // 15px
        lg: ["1.125rem", { lineHeight: "1.75rem" }],     // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }],      // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }],       // 24px
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],  // 30px
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],    // 36px
      },
      
      animation: {
        "glow": "glow 2s ease-in-out infinite alternate",
        "float": "float 3s ease-in-out infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 10px hsl(var(--primary) / 0.2)" },
          "100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
      
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
      },
      
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
} satisfies Config;
```

---

# PRÓXIMOS PASSOS

1. **Aprovar direção visual** - Confirmar se Dark Tech é a escolha
2. **Aplicar tokens** - Atualizar globals.css e tailwind.config.ts
3. **Refatorar componentes** - Sidebar, Cards, Tabelas
4. **Criar Dashboard** - Nova tela inicial com KPIs
5. **Testar responsividade** - Garantir funcionamento em tablets
6. **Microinterações** - Adicionar animações sutis

---

*Documento gerado em 19/12/2024*
*Versão 1.0*
