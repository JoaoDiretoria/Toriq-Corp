import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { 
  ChevronDown, 
  ChevronRight, 
  Save, 
  RotateCcw, 
  Download, 
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

// Valores padrão da configuração White Label
const DEFAULTS: WhiteLabelConfigData = {
  // Identidade
  title: 'Título do Sistema',
  subtitle: 'Subtítulo / tagline do cliente',
  subject: 'Assunto padrão',
  domain: 'https://cliente.seudominio.com',

  // Tipografia e layout
  fontBody: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  fontHeading: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  baseFontSize: 14,
  fontWeight: 400,
  lineHeight: 1.45,
  density: 1,
  radius: 14,
  cardShadow: 0.18,

  // Cores globais
  bgColor: '#f6f7fb',
  surfaceColor: '#ffffff',
  borderColor: '#d5d7dc',
  textColor: '#101828',
  mutedColor: '#5c6779',
  primaryColor: '#2563eb',
  secondaryColor: '#7c3aed',
  linkColor: '#2563eb',
  iconColor: '#101828',
  badgeBg: '#eef2ff',

  // Estados
  successColor: '#16a34a',
  warningColor: '#f59e0b',
  errorColor: '#ef4444',
  infoColor: '#0ea5e9',

  // Botões
  buttonBg: '#2563eb',
  buttonText: '#ffffff',
  buttonHover: '#1d4ed8',
  buttonDisabled: '#aab4c4',

  // Comunicação
  emptyTone: 'neutro',
  loginBg: '#0b1220',
  aboutText: 'Este sistema é uma solução white label configurável para o cliente.',
  emailFooter: '© Cliente • Todos os direitos reservados',

  // Arquivos (base64 para preview)
  logoDataUrl: '',
  faviconDataUrl: '',
  loginImageDataUrl: '',

  // Kanban - Colunas
  colHeaderBg: '#101828',
  colHeaderText: '#ffffff',
  colBorder: '#d5d7dc',
  colShadow: '#000000',
  colWidth: 320,
  colAutoWidth: 0,

  // Kanban - Cards
  cardBg: '#ffffff',
  cardBorder: '#d5d7dc',
  cardStripe: '#2563eb',
  stripeMode: 1,
  cardCompact: 0,
  blockedColor: '#ef4444',

  // Kanban - Campos visíveis
  fTitle: true,
  fSubtitle: true,
  fId: true,
  fTags: true,
  fAssignee: true,
  fDate: true,
  fSla: true,
  fPriority: true,
  fPoints: false,
  fLabels: true,

  // Kanban - Labels
  labelRequired: 0,
  labelLimit: 3,
  labelPalette: 'Bug, Urgente, Cliente',

  // Kanban - Avatares
  avatarShape: '999px',
  avatarSize: 26,
  avatarPhoto: 1,

  // Kanban - Ações rápidas
  aMove: true,
  aDone: true,
  aComment: true,
  aAssign: true
};

interface WhiteLabelConfigData {
  title: string;
  subtitle: string;
  subject: string;
  domain: string;
  fontBody: string;
  fontHeading: string;
  baseFontSize: number;
  fontWeight: number;
  lineHeight: number;
  density: number;
  radius: number;
  cardShadow: number;
  bgColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  primaryColor: string;
  secondaryColor: string;
  linkColor: string;
  iconColor: string;
  badgeBg: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
  buttonBg: string;
  buttonText: string;
  buttonHover: string;
  buttonDisabled: string;
  emptyTone: string;
  loginBg: string;
  aboutText: string;
  emailFooter: string;
  logoDataUrl: string;
  faviconDataUrl: string;
  loginImageDataUrl: string;
  colHeaderBg: string;
  colHeaderText: string;
  colBorder: string;
  colShadow: string;
  colWidth: number;
  colAutoWidth: number;
  cardBg: string;
  cardBorder: string;
  cardStripe: string;
  stripeMode: number;
  cardCompact: number;
  blockedColor: string;
  fTitle: boolean;
  fSubtitle: boolean;
  fId: boolean;
  fTags: boolean;
  fAssignee: boolean;
  fDate: boolean;
  fSla: boolean;
  fPriority: boolean;
  fPoints: boolean;
  fLabels: boolean;
  labelRequired: number;
  labelLimit: number;
  labelPalette: string;
  avatarShape: string;
  avatarSize: number;
  avatarPhoto: number;
  aMove: boolean;
  aDone: boolean;
  aComment: boolean;
  aAssign: boolean;
}

const FONT_OPTIONS = [
  { value: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', label: 'Inter / System UI' },
  { value: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', label: 'System UI' },
  { value: 'Roboto, system-ui, -apple-system, Segoe UI, Arial, sans-serif', label: 'Roboto' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: "Georgia, 'Times New Roman', Times, serif", label: 'Georgia' },
  { value: "'Trebuchet MS', system-ui, sans-serif", label: 'Trebuchet' },
];

// Componente de seção colapsável - FORA do componente principal para evitar re-renderização
const Section = ({ id, title, badge, children, expandedSections, toggleSection }: { 
  id: string; 
  title: string; 
  badge?: string; 
  children: React.ReactNode;
  expandedSections: string[];
  toggleSection: (section: string) => void;
}) => (
  <Collapsible open={expandedSections.includes(id)} onOpenChange={() => toggleSection(id)}>
    <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg border transition-colors">
      <div className="flex items-center gap-2">
        {expandedSections.includes(id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-semibold text-sm">{title}</span>
      </div>
      {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
    </CollapsibleTrigger>
    <CollapsibleContent className="pt-4 pb-2 px-1">
      {children}
    </CollapsibleContent>
  </Collapsible>
);

// Componente de campo de cor - FORA do componente principal para evitar re-renderização
const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="flex gap-2">
      <Input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-9 p-1 cursor-pointer"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-9 text-xs font-mono"
      />
    </div>
  </div>
);

export function WhiteLabelConfig() {
  const { toast } = useToast();
  const { applyConfig, resetConfig } = useWhiteLabel();
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const [config, setConfig] = useState<WhiteLabelConfigData>(DEFAULTS);
  const [configId, setConfigId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['branding', 'kanban-colunas', 'kanban-cards']);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Usar empresa_id do modo empresa quando ativo, senão usar do contexto de auth
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;

  // Carregar configuração do banco de dados
  useEffect(() => {
    if (empresaId) {
      loadConfigFromDatabase();
    }
  }, [empresaId]);

  const loadConfigFromDatabase = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('white_label_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setConfigId(data.id);
        setConfig({
          title: data.title || DEFAULTS.title,
          subtitle: data.subtitle || DEFAULTS.subtitle,
          subject: data.subject || DEFAULTS.subject,
          domain: data.domain || DEFAULTS.domain,
          fontBody: data.font_body || DEFAULTS.fontBody,
          fontHeading: data.font_heading || DEFAULTS.fontHeading,
          baseFontSize: data.base_font_size || DEFAULTS.baseFontSize,
          fontWeight: data.font_weight || DEFAULTS.fontWeight,
          lineHeight: data.line_height || DEFAULTS.lineHeight,
          density: data.density || DEFAULTS.density,
          radius: data.radius || DEFAULTS.radius,
          cardShadow: data.card_shadow || DEFAULTS.cardShadow,
          bgColor: data.bg_color || DEFAULTS.bgColor,
          surfaceColor: data.surface_color || DEFAULTS.surfaceColor,
          borderColor: data.border_color || DEFAULTS.borderColor,
          textColor: data.text_color || DEFAULTS.textColor,
          mutedColor: data.muted_color || DEFAULTS.mutedColor,
          primaryColor: data.primary_color || DEFAULTS.primaryColor,
          secondaryColor: data.secondary_color || DEFAULTS.secondaryColor,
          linkColor: data.link_color || DEFAULTS.linkColor,
          iconColor: data.icon_color || DEFAULTS.iconColor,
          badgeBg: data.badge_bg || DEFAULTS.badgeBg,
          successColor: data.success_color || DEFAULTS.successColor,
          warningColor: data.warning_color || DEFAULTS.warningColor,
          errorColor: data.error_color || DEFAULTS.errorColor,
          infoColor: data.info_color || DEFAULTS.infoColor,
          buttonBg: data.button_bg || DEFAULTS.buttonBg,
          buttonText: data.button_text || DEFAULTS.buttonText,
          buttonHover: data.button_hover || DEFAULTS.buttonHover,
          buttonDisabled: data.button_disabled || DEFAULTS.buttonDisabled,
          emptyTone: data.empty_tone || DEFAULTS.emptyTone,
          loginBg: data.login_bg || DEFAULTS.loginBg,
          aboutText: data.about_text || DEFAULTS.aboutText,
          emailFooter: data.email_footer || DEFAULTS.emailFooter,
          logoDataUrl: data.logo_url || '',
          faviconDataUrl: data.favicon_url || '',
          loginImageDataUrl: data.login_image_url || '',
          colHeaderBg: data.col_header_bg || DEFAULTS.colHeaderBg,
          colHeaderText: data.col_header_text || DEFAULTS.colHeaderText,
          colBorder: data.col_border || DEFAULTS.colBorder,
          colShadow: data.col_shadow || DEFAULTS.colShadow,
          colWidth: data.col_width || DEFAULTS.colWidth,
          colAutoWidth: data.col_auto_width ? 1 : 0,
          cardBg: data.card_bg || DEFAULTS.cardBg,
          cardBorder: data.card_border || DEFAULTS.cardBorder,
          cardStripe: data.card_stripe || DEFAULTS.cardStripe,
          stripeMode: data.stripe_mode ?? DEFAULTS.stripeMode,
          cardCompact: data.card_compact ? 1 : 0,
          blockedColor: data.blocked_color || DEFAULTS.blockedColor,
          fTitle: data.f_title ?? DEFAULTS.fTitle,
          fSubtitle: data.f_subtitle ?? DEFAULTS.fSubtitle,
          fId: data.f_id ?? DEFAULTS.fId,
          fTags: data.f_tags ?? DEFAULTS.fTags,
          fAssignee: data.f_assignee ?? DEFAULTS.fAssignee,
          fDate: data.f_date ?? DEFAULTS.fDate,
          fSla: data.f_sla ?? DEFAULTS.fSla,
          fPriority: data.f_priority ?? DEFAULTS.fPriority,
          fPoints: data.f_points ?? DEFAULTS.fPoints,
          fLabels: data.f_labels ?? DEFAULTS.fLabels,
          labelRequired: data.label_required ? 1 : 0,
          labelLimit: data.label_limit || DEFAULTS.labelLimit,
          labelPalette: data.label_palette || DEFAULTS.labelPalette,
          avatarShape: data.avatar_shape || DEFAULTS.avatarShape,
          avatarSize: data.avatar_size || DEFAULTS.avatarSize,
          avatarPhoto: data.avatar_photo ? 1 : 0,
          aMove: data.a_move ?? DEFAULTS.aMove,
          aDone: data.a_done ?? DEFAULTS.aDone,
          aComment: data.a_comment ?? DEFAULTS.aComment,
          aAssign: data.a_assign ?? DEFAULTS.aAssign,
        });
        setIsSaved(true);
        // Aplicar configurações ao carregar
        applyConfig({
          bgColor: data.bg_color,
          surfaceColor: data.surface_color,
          borderColor: data.border_color,
          textColor: data.text_color,
          mutedColor: data.muted_color,
          primaryColor: data.primary_color,
          secondaryColor: data.secondary_color,
          radius: data.radius,
        });
      } else {
        setConfig(DEFAULTS);
        setIsSaved(false);
      }
    } catch (error: any) {
      console.error('Erro ao carregar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = <K extends keyof WhiteLabelConfigData>(key: K, value: WhiteLabelConfigData[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleSaveToDatabase = async () => {
    if (!empresaId) return;

    setSaving(true);
    try {
      const dataToSave = {
        empresa_id: empresaId,
        title: config.title,
        subtitle: config.subtitle,
        subject: config.subject,
        domain: config.domain,
        font_body: config.fontBody,
        font_heading: config.fontHeading,
        base_font_size: config.baseFontSize,
        font_weight: config.fontWeight,
        line_height: config.lineHeight,
        density: config.density,
        radius: config.radius,
        card_shadow: config.cardShadow,
        bg_color: config.bgColor,
        surface_color: config.surfaceColor,
        border_color: config.borderColor,
        text_color: config.textColor,
        muted_color: config.mutedColor,
        primary_color: config.primaryColor,
        secondary_color: config.secondaryColor,
        link_color: config.linkColor,
        icon_color: config.iconColor,
        badge_bg: config.badgeBg,
        success_color: config.successColor,
        warning_color: config.warningColor,
        error_color: config.errorColor,
        info_color: config.infoColor,
        button_bg: config.buttonBg,
        button_text: config.buttonText,
        button_hover: config.buttonHover,
        button_disabled: config.buttonDisabled,
        empty_tone: config.emptyTone,
        login_bg: config.loginBg,
        about_text: config.aboutText,
        email_footer: config.emailFooter,
        logo_url: config.logoDataUrl,
        favicon_url: config.faviconDataUrl,
        login_image_url: config.loginImageDataUrl,
        col_header_bg: config.colHeaderBg,
        col_header_text: config.colHeaderText,
        col_border: config.colBorder,
        col_shadow: config.colShadow,
        col_width: config.colWidth,
        col_auto_width: config.colAutoWidth === 1,
        card_bg: config.cardBg,
        card_border: config.cardBorder,
        card_stripe: config.cardStripe,
        stripe_mode: config.stripeMode,
        card_compact: config.cardCompact === 1,
        blocked_color: config.blockedColor,
        f_title: config.fTitle,
        f_subtitle: config.fSubtitle,
        f_id: config.fId,
        f_tags: config.fTags,
        f_assignee: config.fAssignee,
        f_date: config.fDate,
        f_sla: config.fSla,
        f_priority: config.fPriority,
        f_points: config.fPoints,
        f_labels: config.fLabels,
        label_required: config.labelRequired === 1,
        label_limit: config.labelLimit,
        label_palette: config.labelPalette,
        avatar_shape: config.avatarShape,
        avatar_size: config.avatarSize,
        avatar_photo: config.avatarPhoto === 1,
        a_move: config.aMove,
        a_done: config.aDone,
        a_comment: config.aComment,
        a_assign: config.aAssign,
      };

      if (configId) {
        // Update
        const { error } = await (supabase as any)
          .from('white_label_config')
          .update(dataToSave)
          .eq('id', configId);

        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await (supabase as any)
          .from('white_label_config')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setConfigId(data.id);
        }
      }

      // Aplicar as cores ao sistema
      applyConfig(config);
      setIsSaved(true);
      toast({ title: 'Configurações salvas', description: 'As configurações foram salvas e aplicadas ao sistema.' });
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!empresaId) return;

    setSaving(true);
    try {
      if (configId) {
        const { error } = await (supabase as any)
          .from('white_label_config')
          .delete()
          .eq('id', configId);

        if (error) throw error;
      }

      resetConfig(); // Resetar as cores do sistema
      setConfig(DEFAULTS);
      setConfigId(null);
      setIsSaved(false);
      toast({ title: 'Configurações restauradas', description: 'As configurações foram restauradas para o padrão.' });
    } catch (error: any) {
      console.error('Erro ao restaurar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível restaurar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'white-label-config.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Exportado', description: 'Arquivo JSON baixado com sucesso.' });
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        setConfig({ ...DEFAULTS, ...parsed });
        setIsSaved(false);
        toast({ title: 'Importado', description: 'Configurações importadas com sucesso.' });
      } catch (err) {
        toast({ title: 'Erro', description: 'JSON inválido. Verifique o arquivo.', variant: 'destructive' });
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleFileUpload = async (key: 'logoDataUrl' | 'faviconDataUrl' | 'loginImageDataUrl', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaId) return;

    // Validar tipo de arquivo
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/x-icon'].includes(file.type)) {
      toast({
        title: 'Erro',
        description: 'Apenas arquivos de imagem são permitidos.',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'O arquivo deve ter no máximo 2MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploadingImage(key);
    try {
      const fileExt = file.name.split('.').pop();
      const typePrefix = key.replace('DataUrl', '');
      const fileName = `white-label/${typePrefix}_${empresaId}_${Date.now()}.${fileExt}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('treinamentos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('treinamentos')
        .getPublicUrl(fileName);

      updateConfig(key, urlData.publicUrl);

      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a imagem.',
        variant: 'destructive'
      });
    } finally {
      setUploadingImage(null);
      e.target.value = '';
    }
  };

  const clearFile = (key: 'logoDataUrl' | 'faviconDataUrl' | 'loginImageDataUrl') => {
    updateConfig(key, '');
  };

  const getEmptyText = () => {
    const map: Record<string, string> = {
      neutro: 'Exemplo de texto para ver tipografia, cores e hierarquia.',
      amigavel: 'Tudo pronto por aqui 🙂 Ajuste as opções e deixe com a cara do cliente!',
      direto: 'Ajuste as opções para aplicar o padrão do cliente.'
    };
    return map[config.emptyTone] || map.neutro;
  };

  const getDensityLabel = () => {
    if (config.density === 0.85) return 'Compacto';
    if (config.density === 1.15) return 'Confortável';
    return 'Normal';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-220px)]">
      {/* Painel de Configuração */}
      <div className="flex flex-col min-h-0">
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Parâmetros</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Configure branding, cores e opções do sistema</p>
              </div>
              <Badge variant={isSaved ? 'default' : 'secondary'}>
                {isSaved ? 'Salvo' : 'Não salvo'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Branding e tema (global) */}
            <Section id="branding" title="Branding e tema (global)" badge="Global" expandedSections={expandedSections} toggleSection={toggleSection}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nome do sistema (título)</Label>
                    <Input
                      value={config.title}
                      onChange={(e) => updateConfig('title', e.target.value)}
                      placeholder="Ex.: Meu Sistema"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Subtítulo (tagline)</Label>
                    <Input
                      value={config.subtitle}
                      onChange={(e) => updateConfig('subtitle', e.target.value)}
                      placeholder="Ex.: Gestão completa para sua empresa"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Assunto padrão (e-mail/notificações)</Label>
                    <Input
                      value={config.subject}
                      onChange={(e) => updateConfig('subject', e.target.value)}
                      placeholder="Ex.: Notificação do Meu Sistema"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Domínio/URL do cliente</Label>
                    <Input
                      value={config.domain}
                      onChange={(e) => updateConfig('domain', e.target.value)}
                      placeholder="https://cliente.seudominio.com"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Fonte do corpo</Label>
                      <Select value={config.fontBody} onValueChange={(v) => updateConfig('fontBody', v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Fonte de títulos</Label>
                      <Select value={config.fontHeading} onValueChange={(v) => updateConfig('fontHeading', v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tamanho base (px)</Label>
                    <Input
                      type="number"
                      min={12}
                      max={20}
                      value={config.baseFontSize}
                      onChange={(e) => updateConfig('baseFontSize', Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Peso padrão</Label>
                    <Select value={String(config.fontWeight)} onValueChange={(v) => updateConfig('fontWeight', Number(v))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="400">400 (Normal)</SelectItem>
                        <SelectItem value="500">500 (Medium)</SelectItem>
                        <SelectItem value="600">600 (Semibold)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Line-height</Label>
                    <Input
                      type="number"
                      min={1.1}
                      max={2}
                      step={0.05}
                      value={config.lineHeight}
                      onChange={(e) => updateConfig('lineHeight', Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Densidade</Label>
                    <Select value={String(config.density)} onValueChange={(v) => updateConfig('density', Number(v))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.85">Compacto</SelectItem>
                        <SelectItem value="1">Normal</SelectItem>
                        <SelectItem value="1.15">Confortável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Raio de borda (px)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={32}
                      value={config.radius}
                      onChange={(e) => updateConfig('radius', Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Sombra (intensidade)</Label>
                    <Select value={String(config.cardShadow)} onValueChange={(v) => updateConfig('cardShadow', Number(v))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.10">Leve</SelectItem>
                        <SelectItem value="0.18">Média</SelectItem>
                        <SelectItem value="0.28">Forte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium mb-3">Cores do Sistema</p>
                  <div className="grid grid-cols-3 gap-3">
                    <ColorField label="Cor de fundo" value={config.bgColor} onChange={(v) => updateConfig('bgColor', v)} />
                    <ColorField label="Cor de superfície" value={config.surfaceColor} onChange={(v) => updateConfig('surfaceColor', v)} />
                    <ColorField label="Cor de borda" value={config.borderColor} onChange={(v) => updateConfig('borderColor', v)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <ColorField label="Cor do texto" value={config.textColor} onChange={(v) => updateConfig('textColor', v)} />
                    <ColorField label="Texto secundário" value={config.mutedColor} onChange={(v) => updateConfig('mutedColor', v)} />
                    <ColorField label="Cor de links" value={config.linkColor} onChange={(v) => updateConfig('linkColor', v)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <ColorField label="Cor primária" value={config.primaryColor} onChange={(v) => updateConfig('primaryColor', v)} />
                    <ColorField label="Cor secundária" value={config.secondaryColor} onChange={(v) => updateConfig('secondaryColor', v)} />
                    <ColorField label="Cor de ícones" value={config.iconColor} onChange={(v) => updateConfig('iconColor', v)} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium mb-3">Cores de Estado</p>
                  <div className="grid grid-cols-4 gap-3">
                    <ColorField label="Sucesso" value={config.successColor} onChange={(v) => updateConfig('successColor', v)} />
                    <ColorField label="Alerta" value={config.warningColor} onChange={(v) => updateConfig('warningColor', v)} />
                    <ColorField label="Erro" value={config.errorColor} onChange={(v) => updateConfig('errorColor', v)} />
                    <ColorField label="Info" value={config.infoColor} onChange={(v) => updateConfig('infoColor', v)} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium mb-3">Botões</p>
                  <div className="grid grid-cols-4 gap-3">
                    <ColorField label="Fundo" value={config.buttonBg} onChange={(v) => updateConfig('buttonBg', v)} />
                    <ColorField label="Texto" value={config.buttonText} onChange={(v) => updateConfig('buttonText', v)} />
                    <ColorField label="Hover" value={config.buttonHover} onChange={(v) => updateConfig('buttonHover', v)} />
                    <ColorField label="Desabilitado" value={config.buttonDisabled} onChange={(v) => updateConfig('buttonDisabled', v)} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium mb-3">Logos e Imagens</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Logo principal (topbar/menu)</Label>
                      <div className="flex gap-2">
                        <Input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('logoDataUrl', e)}
                          className="flex-1 h-9 text-xs"
                        />
                        <Button variant="destructive" size="sm" onClick={() => clearFile('logoDataUrl')} disabled={!config.logoDataUrl}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Logo reduzida (favicon/ícone)</Label>
                      <div className="flex gap-2">
                        <Input
                          ref={faviconInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('faviconDataUrl', e)}
                          className="flex-1 h-9 text-xs"
                        />
                        <Button variant="destructive" size="sm" onClick={() => clearFile('faviconDataUrl')} disabled={!config.faviconDataUrl}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Tela de login (cor de fundo)</Label>
                      <ColorField label="" value={config.loginBg} onChange={(v) => updateConfig('loginBg', v)} />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium mb-3">Comunicação</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Tom de mensagens/empty states</Label>
                      <Select value={config.emptyTone} onValueChange={(v) => updateConfig('emptyTone', v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="neutro">Neutro</SelectItem>
                          <SelectItem value="amigavel">Amigável</SelectItem>
                          <SelectItem value="direto">Direto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Página "Sobre" (texto)</Label>
                      <Textarea
                        value={config.aboutText}
                        onChange={(e) => updateConfig('aboutText', e.target.value)}
                        placeholder="Ex.: Este sistema é uma solução white label..."
                        rows={3}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Template de e-mail (rodapé)</Label>
                      <Textarea
                        value={config.emailFooter}
                        onChange={(e) => updateConfig('emailFooter', e.target.value)}
                        placeholder="Ex.: © Cliente • Todos os direitos reservados"
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* Kanban: colunas */}
            <Section id="kanban-colunas" title="Kanban: aparência das colunas" badge="Kanban" expandedSections={expandedSections} toggleSection={toggleSection}>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <ColorField label="Header da coluna (fundo)" value={config.colHeaderBg} onChange={(v) => updateConfig('colHeaderBg', v)} />
                  <ColorField label="Header da coluna (texto)" value={config.colHeaderText} onChange={(v) => updateConfig('colHeaderText', v)} />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Largura (px)</Label>
                    <Input
                      type="number"
                      min={220}
                      max={520}
                      step={10}
                      value={config.colWidth}
                      onChange={(e) => updateConfig('colWidth', Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <ColorField label="Borda da coluna" value={config.colBorder} onChange={(v) => updateConfig('colBorder', v)} />
                  <ColorField label="Sombra da coluna" value={config.colShadow} onChange={(v) => updateConfig('colShadow', v)} />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Largura automática</Label>
                    <Select value={String(config.colAutoWidth)} onValueChange={(v) => updateConfig('colAutoWidth', Number(v))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Não (usar px)</SelectItem>
                        <SelectItem value="1">Sim (auto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Section>

            {/* Kanban: cards */}
            <Section id="kanban-cards" title="Kanban: cards, labels, avatares e ações" badge="Kanban" expandedSections={expandedSections} toggleSection={toggleSection}>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <ColorField label="Cor do card" value={config.cardBg} onChange={(v) => updateConfig('cardBg', v)} />
                  <ColorField label="Borda do card" value={config.cardBorder} onChange={(v) => updateConfig('cardBorder', v)} />
                  <ColorField label="Cor por status/prioridade" value={config.cardStripe} onChange={(v) => updateConfig('cardStripe', v)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Indicador visual</Label>
                    <Select value={String(config.stripeMode)} onValueChange={(v) => updateConfig('stripeMode', Number(v))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Faixa lateral (stripe)</SelectItem>
                        <SelectItem value="0">Borda esquerda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Densidade do card</Label>
                    <Select value={String(config.cardCompact)} onValueChange={(v) => updateConfig('cardCompact', Number(v))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Detalhado (metadados)</SelectItem>
                        <SelectItem value="1">Compacto (só título)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <ColorField label="Card bloqueado (cor)" value={config.blockedColor} onChange={(v) => updateConfig('blockedColor', v)} />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium">Campos visíveis no card</p>
                      <p className="text-xs text-muted-foreground">Marque o que aparece no "tile" do Kanban</p>
                    </div>
                    <Badge variant="outline" className="text-xs">Visibilidade</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'fTitle', label: 'Título' },
                      { key: 'fSubtitle', label: 'Subtítulo' },
                      { key: 'fId', label: 'ID' },
                      { key: 'fTags', label: 'Tags' },
                      { key: 'fAssignee', label: 'Responsável' },
                      { key: 'fDate', label: 'Data' },
                      { key: 'fSla', label: 'SLA' },
                      { key: 'fPriority', label: 'Prioridade' },
                      { key: 'fPoints', label: 'Pontos' },
                      { key: 'fLabels', label: 'Labels/Badges' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between p-2 border rounded-lg">
                        <span className="text-xs">{label}</span>
                        <Checkbox
                          checked={config[key as keyof WhiteLabelConfigData] as boolean}
                          onCheckedChange={(checked) => updateConfig(key as keyof WhiteLabelConfigData, !!checked as any)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium mb-3">Labels</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Label obrigatória</Label>
                      <Select value={String(config.labelRequired)} onValueChange={(v) => updateConfig('labelRequired', Number(v))}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Não</SelectItem>
                          <SelectItem value="1">Sim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Limite de labels por card</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={config.labelLimit}
                        onChange={(e) => updateConfig('labelLimit', Number(e.target.value))}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Paleta/Nomes das labels (CSV)</Label>
                      <Input
                        value={config.labelPalette}
                        onChange={(e) => updateConfig('labelPalette', e.target.value)}
                        placeholder="Ex.: Bug, Urgente, Cliente"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium mb-3">Avatares</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Avatar</Label>
                      <Select value={config.avatarShape} onValueChange={(v) => updateConfig('avatarShape', v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="999px">Círculo</SelectItem>
                          <SelectItem value="10px">Quadrado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Tamanho do avatar (px)</Label>
                      <Input
                        type="number"
                        min={18}
                        max={40}
                        value={config.avatarSize}
                        onChange={(e) => updateConfig('avatarSize', Number(e.target.value))}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Foto ou iniciais</Label>
                      <Select value={String(config.avatarPhoto)} onValueChange={(v) => updateConfig('avatarPhoto', Number(v))}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Foto</SelectItem>
                          <SelectItem value="0">Iniciais</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium">Ações rápidas no card</p>
                      <p className="text-xs text-muted-foreground">Botões/atalhos disponíveis no tile</p>
                    </div>
                    <Badge variant="outline" className="text-xs">Ações</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'aMove', label: 'Mover' },
                      { key: 'aDone', label: 'Concluir' },
                      { key: 'aComment', label: 'Comentar' },
                      { key: 'aAssign', label: 'Atribuir' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between p-2 border rounded-lg">
                        <span className="text-xs">{label}</span>
                        <Checkbox
                          checked={config[key as keyof WhiteLabelConfigData] as boolean}
                          onCheckedChange={(checked) => updateConfig(key as keyof WhiteLabelConfigData, !!checked as any)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* Ações */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button onClick={handleSaveToDatabase} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Configurações
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Restaurar padrão
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleExportJson} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar JSON
              </Button>
              <Button variant="outline" onClick={() => importInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" />
                Importar JSON
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportJson}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div className="flex flex-col min-h-0">
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="text-lg">Pré-visualização</CardTitle>
            <p className="text-xs text-muted-foreground">Simulação de tela + Kanban com o tema aplicado</p>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 min-h-0">
            <div 
              className="rounded-xl overflow-hidden border shadow-lg"
              style={{
                fontFamily: config.fontBody,
                fontSize: `${config.baseFontSize}px`,
                fontWeight: config.fontWeight,
                lineHeight: config.lineHeight,
                background: config.bgColor,
                color: config.textColor,
                ['--wl-density' as any]: config.density,
                ['--wl-radius' as any]: `${config.radius}px`,
              }}
            >
              {/* Topbar */}
              <div 
                className="flex items-center gap-3 p-3 border-b"
                style={{ 
                  background: config.surfaceColor,
                  borderColor: config.borderColor
                }}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden border"
                  style={{ borderColor: config.borderColor, background: `${config.textColor}08` }}
                >
                  {config.logoDataUrl ? (
                    <img src={config.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="h-4 w-4" style={{ color: config.mutedColor }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold truncate" style={{ fontFamily: config.fontHeading }}>
                    {config.title}
                  </h2>
                  <p className="text-xs truncate" style={{ color: config.mutedColor }}>
                    {config.subtitle}
                  </p>
                </div>
                <div 
                  className="text-xs px-3 py-1.5 rounded-full border"
                  style={{ 
                    borderColor: config.borderColor,
                    color: config.mutedColor,
                    background: `${config.textColor}03`
                  }}
                >
                  {config.domain}
                </div>
              </div>

              {/* Content */}
              <div className="p-4" style={{ padding: `calc(16px * ${config.density})` }}>
                {/* Hero */}
                <div 
                  className="rounded-xl p-4 mb-4 border"
                  style={{ 
                    background: `linear-gradient(180deg, ${config.primaryColor}18, ${config.primaryColor}00)`,
                    borderColor: `${config.primaryColor}30`,
                    borderRadius: `calc(${config.radius}px + 2px)`
                  }}
                >
                  <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: config.fontHeading }}>
                    Bem-vindo 👋
                  </h1>
                  <p className="text-sm mb-3" style={{ color: config.mutedColor }}>
                    {getEmptyText()}
                  </p>
                  <div 
                    className="inline-flex gap-2 items-center text-xs px-3 py-1.5 rounded-lg border border-dashed"
                    style={{ 
                      borderColor: `${config.textColor}22`,
                      background: `${config.surfaceColor}99`
                    }}
                  >
                    <span style={{ color: config.mutedColor }}>Assunto:</span>
                    <b style={{ fontFamily: config.fontHeading }}>{config.subject}</b>
                  </div>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div 
                    className="p-3 rounded-xl border"
                    style={{ 
                      background: config.surfaceColor,
                      borderColor: config.borderColor,
                      borderRadius: `${config.radius}px`
                    }}
                  >
                    <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: config.fontHeading }}>
                      Componentes gerais
                    </h3>
                    <p className="text-xs mb-3" style={{ color: config.mutedColor }}>
                      Exemplo de texto com <b style={{ color: config.textColor }}>cor do texto</b> e{' '}
                      <a href="#" style={{ color: config.linkColor, textDecoration: 'none', borderBottom: `1px solid ${config.linkColor}50` }}>links</a>.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button 
                        className="px-3 py-2 text-xs rounded-lg"
                        style={{ 
                          background: config.buttonBg,
                          color: config.buttonText,
                          borderRadius: `calc(${config.radius}px - 2px)`
                        }}
                      >
                        Botão primário
                      </button>
                      <button 
                        className="px-3 py-2 text-xs rounded-lg border"
                        style={{ 
                          background: `${config.textColor}06`,
                          color: config.textColor,
                          borderColor: config.borderColor,
                          borderRadius: `calc(${config.radius}px - 2px)`
                        }}
                      >
                        Secundário
                      </button>
                    </div>
                  </div>
                  <div 
                    className="p-3 rounded-xl border"
                    style={{ 
                      background: config.surfaceColor,
                      borderColor: config.borderColor,
                      borderRadius: `${config.radius}px`
                    }}
                  >
                    <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: config.fontHeading }}>
                      Resumo
                    </h3>
                    <p className="text-xs" style={{ color: config.mutedColor }}>
                      Raio: <b style={{ color: config.textColor }}>{config.radius}px</b> • Densidade: <b style={{ color: config.textColor }}>{getDensityLabel()}</b>
                    </p>
                  </div>
                </div>

                {/* Kanban Preview */}
                <div 
                  className="p-3 rounded-xl border"
                  style={{ 
                    borderColor: config.borderColor,
                    borderRadius: `${config.radius}px`,
                    background: `${config.surfaceColor}55`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ fontFamily: config.fontHeading }}>
                      Kanban (prévia)
                    </h3>
                    <span className="text-xs" style={{ color: config.mutedColor }}>
                      Colunas • Cards • Labels
                    </span>
                  </div>

                  <div 
                    className="flex gap-3 overflow-auto pb-2"
                    style={{ ['--col-width' as any]: config.colAutoWidth ? 'auto' : `${config.colWidth}px` }}
                  >
                    {/* Coluna 1 */}
                    <div 
                      className="flex-shrink-0 rounded-xl border overflow-hidden"
                      style={{ 
                        width: config.colAutoWidth ? '200px' : `${Math.min(config.colWidth, 200)}px`,
                        borderColor: config.colBorder,
                        background: config.surfaceColor,
                        boxShadow: `0 8px 20px ${config.colShadow}15`
                      }}
                    >
                      <div 
                        className="px-3 py-2 flex items-center justify-between text-xs"
                        style={{ 
                          background: config.colHeaderBg,
                          color: config.colHeaderText,
                          fontFamily: config.fontHeading
                        }}
                      >
                        <span>A Fazer</span>
                        <span style={{ opacity: 0.85 }}>2</span>
                      </div>
                      <div className="p-2 space-y-2">
                        {/* Card 1 */}
                        <div 
                          className="p-2 rounded-lg border relative overflow-hidden"
                          style={{ 
                            background: config.cardBg,
                            borderColor: config.cardBorder,
                            borderRadius: `calc(${config.radius}px - 2px)`,
                            borderLeft: config.stripeMode === 0 ? `4px solid ${config.cardStripe}` : undefined
                          }}
                        >
                          {config.stripeMode === 1 && (
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-1"
                              style={{ background: config.cardStripe }}
                            />
                          )}
                          <div className="text-xs font-medium mb-1" style={{ fontFamily: config.fontHeading }}>
                            {config.fId && <span style={{ color: config.mutedColor }}>#123 </span>}
                            {config.fTitle && 'Ajustar tela'}
                          </div>
                          {config.fSubtitle && config.cardCompact === 0 && (
                            <div className="text-xs mb-2" style={{ color: config.mutedColor }}>
                              Aplicar imagem do cliente
                            </div>
                          )}
                          {config.cardCompact === 0 && (
                            <div className="flex flex-wrap gap-1">
                              {config.fTags && (
                                <span 
                                  className="text-xs px-1.5 py-0.5 rounded-full border"
                                  style={{ 
                                    borderColor: config.borderColor,
                                    background: `${config.textColor}04`
                                  }}
                                >
                                  <span 
                                    className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                                    style={{ background: config.primaryColor }}
                                  />
                                  UI
                                </span>
                              )}
                              {config.fLabels && (
                                <span 
                                  className="text-xs px-1.5 py-0.5 rounded-full border"
                                  style={{ 
                                    borderColor: config.borderColor,
                                    background: `${config.textColor}04`
                                  }}
                                >
                                  <span 
                                    className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                                    style={{ background: config.secondaryColor }}
                                  />
                                  Urgente
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card 2 - Bloqueado */}
                        <div 
                          className="p-2 rounded-lg border relative overflow-hidden"
                          style={{ 
                            background: config.cardBg,
                            borderColor: `${config.blockedColor}70`,
                            borderRadius: `calc(${config.radius}px - 2px)`,
                            boxShadow: `0 0 0 2px ${config.blockedColor}25`
                          }}
                        >
                          <div className="text-xs font-medium mb-1" style={{ fontFamily: config.fontHeading }}>
                            {config.fId && <span style={{ color: config.mutedColor }}>#124 </span>}
                            {config.fTitle && 'Integração'}
                          </div>
                          <div 
                            className="text-xs px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 border"
                            style={{ 
                              borderColor: `${config.blockedColor}50`,
                              background: `${config.blockedColor}15`,
                              color: config.blockedColor
                            }}
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: config.blockedColor }}
                            />
                            Bloqueado
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coluna 2 */}
                    <div 
                      className="flex-shrink-0 rounded-xl border overflow-hidden"
                      style={{ 
                        width: config.colAutoWidth ? '200px' : `${Math.min(config.colWidth, 200)}px`,
                        borderColor: config.colBorder,
                        background: config.surfaceColor,
                        boxShadow: `0 8px 20px ${config.colShadow}15`
                      }}
                    >
                      <div 
                        className="px-3 py-2 flex items-center justify-between text-xs"
                        style={{ 
                          background: config.colHeaderBg,
                          color: config.colHeaderText,
                          fontFamily: config.fontHeading
                        }}
                      >
                        <span>Em Progresso</span>
                        <span style={{ opacity: 0.85 }}>1</span>
                      </div>
                      <div className="p-2">
                        <div 
                          className="p-2 rounded-lg border relative overflow-hidden"
                          style={{ 
                            background: config.cardBg,
                            borderColor: config.cardBorder,
                            borderRadius: `calc(${config.radius}px - 2px)`,
                            borderLeft: config.stripeMode === 0 ? `4px solid ${config.cardStripe}` : undefined
                          }}
                        >
                          {config.stripeMode === 1 && (
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-1"
                              style={{ background: config.cardStripe }}
                            />
                          )}
                          <div className="text-xs font-medium" style={{ fontFamily: config.fontHeading }}>
                            {config.fId && <span style={{ color: config.mutedColor }}>#200 </span>}
                            {config.fTitle && 'Refinar paleta'}
                          </div>
                          {config.fAssignee && config.cardCompact === 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <div 
                                className="w-5 h-5 rounded-full flex items-center justify-center text-xs border"
                                style={{ 
                                  borderRadius: config.avatarShape,
                                  width: `${Math.min(config.avatarSize, 20)}px`,
                                  height: `${Math.min(config.avatarSize, 20)}px`,
                                  background: `${config.textColor}08`,
                                  borderColor: config.borderColor,
                                  color: config.mutedColor
                                }}
                              >
                                AP
                              </div>
                              <span className="text-xs" style={{ color: config.mutedColor }}>Ana</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Coluna 3 */}
                    <div 
                      className="flex-shrink-0 rounded-xl border overflow-hidden"
                      style={{ 
                        width: config.colAutoWidth ? '200px' : `${Math.min(config.colWidth, 200)}px`,
                        borderColor: config.colBorder,
                        background: config.surfaceColor,
                        boxShadow: `0 8px 20px ${config.colShadow}15`
                      }}
                    >
                      <div 
                        className="px-3 py-2 flex items-center justify-between text-xs"
                        style={{ 
                          background: config.colHeaderBg,
                          color: config.colHeaderText,
                          fontFamily: config.fontHeading
                        }}
                      >
                        <span>Concluído</span>
                        <span style={{ opacity: 0.85 }}>0</span>
                      </div>
                      <div className="p-2">
                        <div className="text-xs p-2" style={{ color: config.mutedColor }}>
                          Empty state do Kanban
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div 
                className="px-4 py-3 text-xs border-t"
                style={{ 
                  borderColor: config.borderColor,
                  color: `${config.textColor}88`,
                  background: `${config.surfaceColor}88`
                }}
              >
                <span style={{ color: `${config.textColor}BB`, fontWeight: 600, fontFamily: config.fontHeading }}>
                  {config.title}
                </span>
                {' '}• prévia do padrão do cliente (global + Kanban)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
