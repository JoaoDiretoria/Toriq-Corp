/**
 * Tipos centralizados para o sistema White Label
 * 
 * Este arquivo contém todas as interfaces e tipos relacionados
 * à configuração de estilos personalizados por empresa SST.
 */

// Tipo para cores HSL
export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

// Configuração de cores do White Label
export interface WhiteLabelColors {
  bgColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  textColor?: string;
  mutedColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  linkColor?: string;
  iconColor?: string;
  badgeBg?: string;
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
  infoColor?: string;
  buttonBg?: string;
  buttonText?: string;
  buttonHover?: string;
  buttonDisabled?: string;
  loginBg?: string;
}

// Configuração de tipografia
export interface WhiteLabelTypography {
  fontBody?: string;
  fontHeading?: string;
  baseFontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
}

// Configuração de layout
export interface WhiteLabelLayout {
  density?: number;
  radius?: number;
  cardShadow?: number;
}

// Configuração de identidade/branding
export interface WhiteLabelBranding {
  title?: string;
  subtitle?: string;
  subject?: string;
  domain?: string;
  logoUrl?: string;
  faviconUrl?: string;
  loginImageUrl?: string;
  aboutText?: string;
  emailFooter?: string;
  emptyTone?: string;
}

// Configuração do Kanban
export interface WhiteLabelKanban {
  colHeaderBg?: string;
  colHeaderText?: string;
  colBorder?: string;
  colShadow?: string;
  colWidth?: number;
  colAutoWidth?: boolean;
  cardBg?: string;
  cardBorder?: string;
  cardStripe?: string;
  stripeMode?: number;
  cardCompact?: boolean;
  blockedColor?: string;
  fTitle?: boolean;
  fSubtitle?: boolean;
  fId?: boolean;
  fTags?: boolean;
  fAssignee?: boolean;
  fDate?: boolean;
  fSla?: boolean;
  fPriority?: boolean;
  fPoints?: boolean;
  fLabels?: boolean;
  labelRequired?: boolean;
  labelLimit?: number;
  labelPalette?: string;
  avatarShape?: string;
  avatarSize?: number;
  avatarPhoto?: boolean;
  aMove?: boolean;
  aDone?: boolean;
  aComment?: boolean;
  aAssign?: boolean;
}

// Configuração completa do White Label (usado no hook de aplicação)
export interface WhiteLabelConfig extends WhiteLabelColors, WhiteLabelTypography, WhiteLabelLayout {
  logoUrl?: string;
  title?: string;
  subtitle?: string;
  [key: string]: any;
}

// Configuração completa para o formulário de edição
export interface WhiteLabelFormConfig extends 
  WhiteLabelColors, 
  WhiteLabelTypography, 
  WhiteLabelLayout, 
  WhiteLabelBranding, 
  WhiteLabelKanban {}

// Dados do banco de dados (snake_case)
export interface WhiteLabelDBRecord {
  id: string;
  empresa_id: string;
  created_at?: string;
  updated_at?: string;
  // Branding
  title?: string;
  subtitle?: string;
  subject?: string;
  domain?: string;
  logo_url?: string;
  favicon_url?: string;
  login_image_url?: string;
  about_text?: string;
  email_footer?: string;
  empty_tone?: string;
  // Cores
  bg_color?: string;
  surface_color?: string;
  border_color?: string;
  text_color?: string;
  muted_color?: string;
  primary_color?: string;
  secondary_color?: string;
  link_color?: string;
  icon_color?: string;
  badge_bg?: string;
  success_color?: string;
  warning_color?: string;
  error_color?: string;
  info_color?: string;
  button_bg?: string;
  button_text?: string;
  button_hover?: string;
  button_disabled?: string;
  login_bg?: string;
  // Tipografia
  font_body?: string;
  font_heading?: string;
  base_font_size?: number;
  font_weight?: number;
  line_height?: number;
  // Layout
  density?: number;
  radius?: number;
  card_shadow?: number;
  // Kanban
  col_header_bg?: string;
  col_header_text?: string;
  col_border?: string;
  col_shadow?: string;
  col_width?: number;
  col_auto_width?: boolean;
  card_bg?: string;
  card_border?: string;
  card_stripe?: string;
  stripe_mode?: number;
  card_compact?: boolean;
  blocked_color?: string;
  f_title?: boolean;
  f_subtitle?: boolean;
  f_id?: boolean;
  f_tags?: boolean;
  f_assignee?: boolean;
  f_date?: boolean;
  f_sla?: boolean;
  f_priority?: boolean;
  f_points?: boolean;
  f_labels?: boolean;
  label_required?: boolean;
  label_limit?: number;
  label_palette?: string;
  avatar_shape?: string;
  avatar_size?: number;
  avatar_photo?: boolean;
  a_move?: boolean;
  a_done?: boolean;
  a_comment?: boolean;
  a_assign?: boolean;
}

// Constantes de CSS Variables
export const CSS_VARIABLES = {
  // Background
  BACKGROUND: '--background',
  CARD: '--card',
  POPOVER: '--popover',
  
  // Borders
  BORDER: '--border',
  INPUT: '--input',
  
  // Text
  FOREGROUND: '--foreground',
  CARD_FOREGROUND: '--card-foreground',
  POPOVER_FOREGROUND: '--popover-foreground',
  MUTED: '--muted',
  MUTED_FOREGROUND: '--muted-foreground',
  
  // Primary/Secondary
  PRIMARY: '--primary',
  SECONDARY: '--secondary',
  ACCENT: '--accent',
  RING: '--ring',
  
  // Sidebar
  SIDEBAR_BACKGROUND: '--sidebar-background',
  SIDEBAR_FOREGROUND: '--sidebar-foreground',
  SIDEBAR_PRIMARY: '--sidebar-primary',
  SIDEBAR_RING: '--sidebar-ring',
  SIDEBAR_ACCENT: '--sidebar-accent',
  SIDEBAR_ACCENT_FOREGROUND: '--sidebar-accent-foreground',
  SIDEBAR_BORDER: '--sidebar-border',
  
  // States
  SUCCESS: '--success',
  WARNING: '--warning',
  DESTRUCTIVE: '--destructive',
  INFO: '--info',
  
  // Layout
  RADIUS: '--radius',
  
  // Typography
  FONT_BODY: '--font-body',
  FONT_HEADING: '--font-heading',
  FONT_SIZE_BASE: '--font-size-base',
  FONT_WEIGHT_BASE: '--font-weight-base',
  LINE_HEIGHT_BASE: '--line-height-base',
} as const;

// Chaves do localStorage
export const STORAGE_KEYS = {
  CONFIG: 'wl_config',
  EMPRESA_SST_ID: 'wl_empresa_sst_id',
} as const;
