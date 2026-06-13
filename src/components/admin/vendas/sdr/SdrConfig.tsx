import { useState, useEffect, useCallback } from 'react';
import {
  vendasSdrApi,
  type SdrConfigUpdate,
} from '@/integrations/api/vendasSdr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  Bot,
  Eye,
  EyeOff,
  CheckCircle2,
  Trash2,
  KeyRound,
  Sparkles,
  Target,
  ScrollText,
  ListChecks,
} from 'lucide-react';

interface SdrConfigProps {
  /** Disparado após salvar com sucesso (a página recarrega o status do agente). */
  onSaved?: () => void;
}

interface FormState {
  provider: string;
  modelo: string;
  persona: string;
  objetivo: string;
  prompt_sistema: string;
  diretrizes: string;
  prompt_qualificacao: string;
  temperatura: number;
  ativo: boolean;
}

const EMPTY_FORM: FormState = {
  provider: 'anthropic',
  modelo: 'claude-sonnet-4-6',
  persona: '',
  objetivo: '',
  prompt_sistema: '',
  diretrizes: '',
  prompt_qualificacao: '',
  temperatura: 0.7,
  ativo: false,
};

// Modelos sugeridos (o backend aceita texto livre; estes são atalhos comuns).
const MODELOS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-haiku-4-6', label: 'Claude Haiku 4.6' },
];

export function SdrConfig({ onSaved }: SdrConfigProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // api_key: setada no backend? máscara para exibição. Vazio no input =
  // "não alterar a chave existente".
  const [keySet, setKeySet] = useState(false);
  const [keyMasked, setKeyMasked] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await vendasSdrApi.getConfig();
      setForm({
        provider: cfg.provider ?? 'anthropic',
        modelo: cfg.modelo ?? 'claude-sonnet-4-6',
        persona: cfg.persona ?? '',
        objetivo: cfg.objetivo ?? '',
        prompt_sistema: cfg.prompt_sistema ?? '',
        diretrizes: cfg.diretrizes ?? '',
        prompt_qualificacao: cfg.prompt_qualificacao ?? '',
        temperatura: cfg.temperatura != null ? Number(cfg.temperatura) : 0.7,
        ativo: cfg.ativo ?? false,
      });
      setKeySet(!!cfg.api_key_set);
      setKeyMasked(cfg.api_key_masked ?? null);
      setKeyInput('');
      setShowKey(false);
    } catch (error) {
      console.error('[SdrConfig] erro ao carregar config:', error);
      toast.error('Erro ao carregar a configuração do agente');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearKey = async () => {
    setSaving(true);
    try {
      const cfg = await vendasSdrApi.saveConfig({ clear_api_key: true });
      setKeySet(!!cfg.api_key_set);
      setKeyMasked(cfg.api_key_masked ?? null);
      setKeyInput('');
      toast.success('Chave de API removida');
      onSaved?.();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao remover a chave');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!keySet && !keyInput.trim()) {
      toast.error('Informe a chave de API do provedor');
      return;
    }

    const payload: SdrConfigUpdate = {
      provider: form.provider.trim() || 'anthropic',
      modelo: form.modelo.trim() || null,
      persona: form.persona.trim() || null,
      objetivo: form.objetivo.trim() || null,
      prompt_sistema: form.prompt_sistema.trim() || null,
      diretrizes: form.diretrizes.trim() || null,
      prompt_qualificacao: form.prompt_qualificacao.trim() || null,
      temperatura: form.temperatura,
      ativo: form.ativo,
    };
    // Só envia a chave se o usuário digitou algo (vazio = manter a atual).
    if (keyInput.trim()) payload.api_key = keyInput.trim();

    setSaving(true);
    try {
      const cfg = await vendasSdrApi.saveConfig(payload);
      setKeySet(!!cfg.api_key_set);
      setKeyMasked(cfg.api_key_masked ?? null);
      setKeyInput('');
      toast.success('Configuração do agente salva com sucesso!');
      onSaved?.();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Provedor / credenciais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Provedor de IA
          </CardTitle>
          <CardDescription>
            Configure o provedor e o modelo do agente SDR. A chave de API é
            armazenada criptografada e nunca é exibida em claro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sdr-provider">Provedor</Label>
              <Select
                value={form.provider}
                onValueChange={(v) => updateField('provider', v)}
              >
                <SelectTrigger id="sdr-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sdr-modelo">Modelo</Label>
              <Select
                value={form.modelo}
                onValueChange={(v) => updateField('modelo', v)}
              >
                <SelectTrigger id="sdr-modelo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                  {/* Se a config tiver um modelo fora da lista, ainda o exibe. */}
                  {!MODELOS.some((m) => m.value === form.modelo) && form.modelo && (
                    <SelectItem value={form.modelo}>{form.modelo}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chave de API */}
          <div className="space-y-2">
            <Label htmlFor="sdr-api-key" className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              Chave de API {!keySet && '*'}
            </Label>

            {keySet && (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Chave configurada
                  {keyMasked && (
                    <code className="text-xs font-mono text-foreground">{keyMasked}</code>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleClearKey}
                  disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remover
                </Button>
              </div>
            )}

            <div className="relative">
              <Input
                id="sdr-api-key"
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={keySet ? '•••• (deixe em branco para manter)' : 'sk-ant-...'}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              A chave fica criptografada em repouso e nunca volta em claro para o navegador.
            </p>
          </div>

          <Separator />

          {/* Temperatura */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Temperatura</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {form.temperatura.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[form.temperatura]}
              onValueChange={(v) => updateField('temperatura', v[0] ?? 0.7)}
            />
            <p className="text-xs text-muted-foreground">
              Mais baixa = respostas mais previsíveis; mais alta = mais criativas.
            </p>
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div className="space-y-0.5">
              <Label htmlFor="sdr-ativo" className="text-sm">Agente ativo</Label>
              <p className="text-xs text-muted-foreground">
                Habilita a qualificação e a geração de respostas pelo SDR.
              </p>
            </div>
            <Switch
              id="sdr-ativo"
              checked={form.ativo}
              onCheckedChange={(v) => updateField('ativo', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Prompts dinâmicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Prompts do agente
          </CardTitle>
          <CardDescription>
            Defina a persona, o objetivo e os prompts que orientam como o agente
            qualifica e conversa com os leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sdr-persona" className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                Persona
              </Label>
              <Input
                id="sdr-persona"
                value={form.persona}
                onChange={(e) => updateField('persona', e.target.value)}
                placeholder="Ex: SDR experiente da Toriq Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sdr-objetivo" className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Objetivo
              </Label>
              <Input
                id="sdr-objetivo"
                value={form.objetivo}
                onChange={(e) => updateField('objetivo', e.target.value)}
                placeholder="Ex: agendar uma reunião de diagnóstico"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sdr-prompt-sistema" className="flex items-center gap-1.5">
              <ScrollText className="h-3.5 w-3.5" />
              Prompt de sistema
            </Label>
            <Textarea
              id="sdr-prompt-sistema"
              value={form.prompt_sistema}
              onChange={(e) => updateField('prompt_sistema', e.target.value)}
              placeholder="Instruções gerais de comportamento do agente. Se vazio, usa persona + objetivo."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sdr-diretrizes" className="flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              Diretrizes
            </Label>
            <Textarea
              id="sdr-diretrizes"
              value={form.diretrizes}
              onChange={(e) => updateField('diretrizes', e.target.value)}
              placeholder="Regras de tom, do/don't, restrições. Ex: seja cordial, nunca prometa preços."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sdr-prompt-qualificacao" className="flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              Prompt de qualificação
            </Label>
            <Textarea
              id="sdr-prompt-qualificacao"
              value={form.prompt_qualificacao}
              onChange={(e) => updateField('prompt_qualificacao', e.target.value)}
              placeholder="Critérios para classificar o lead em quente/morno/frio/desqualificado. Se vazio, usa um padrão."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              O agente responde com um JSON (score 0-100, status e notas) ao qualificar.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar configuração
        </Button>
      </div>
    </div>
  );
}
