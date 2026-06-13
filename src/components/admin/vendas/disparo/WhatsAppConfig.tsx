import { useState, useEffect, useCallback } from 'react';
import {
  vendasWhatsappApi,
  type WhatsAppConfigUpdate,
} from '@/integrations/api/vendasWhatsapp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  Trash2,
  KeyRound,
  Phone,
  Building2,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface WhatsAppConfigProps {
  /** Disparado após salvar com sucesso (a página recarrega o status do canal). */
  onSaved?: () => void;
}

interface FormState {
  whatsapp_waba_id: string;
  whatsapp_phone_id: string;
  whatsapp_verify_token: string;
  whatsapp_rate_limit: string;
}

const EMPTY_FORM: FormState = {
  whatsapp_waba_id: '',
  whatsapp_phone_id: '',
  whatsapp_verify_token: '',
  whatsapp_rate_limit: '80',
};

export function WhatsAppConfig({ onSaved }: WhatsAppConfigProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Token permanente: setado no backend? Vazio no input = "não alterar".
  const [tokenSet, setTokenSet] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);

  // App secret: idem (usado para validar a assinatura HMAC do webhook).
  const [secretSet, setSecretSet] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await vendasWhatsappApi.getConfig();
      setForm({
        whatsapp_waba_id: cfg.whatsapp_waba_id ?? '',
        whatsapp_phone_id: cfg.whatsapp_phone_id ?? '',
        whatsapp_verify_token: cfg.whatsapp_verify_token ?? '',
        whatsapp_rate_limit:
          cfg.whatsapp_rate_limit != null ? String(cfg.whatsapp_rate_limit) : '80',
      });
      setTokenSet(!!cfg.whatsapp_token_set);
      setSecretSet(!!cfg.whatsapp_app_secret_set);
      setTokenInput('');
      setSecretInput('');
      setShowToken(false);
      setShowSecret(false);
    } catch (error) {
      console.error('[WhatsAppConfig] erro ao carregar config:', error);
      toast.error('Erro ao carregar a configuração do WhatsApp');
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

  const handleClearToken = async () => {
    setSaving(true);
    try {
      const cfg = await vendasWhatsappApi.saveConfig({ clear_whatsapp_token: true });
      setTokenSet(!!cfg.whatsapp_token_set);
      setTokenInput('');
      toast.success('Token permanente removido');
      onSaved?.();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao remover token');
    } finally {
      setSaving(false);
    }
  };

  const handleClearSecret = async () => {
    setSaving(true);
    try {
      const cfg = await vendasWhatsappApi.saveConfig({ clear_whatsapp_app_secret: true });
      setSecretSet(!!cfg.whatsapp_app_secret_set);
      setSecretInput('');
      toast.success('App secret removido');
      onSaved?.();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao remover app secret');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.whatsapp_phone_id.trim()) {
      toast.error('Informe o Phone Number ID');
      return;
    }
    if (!form.whatsapp_waba_id.trim()) {
      toast.error('Informe o WABA ID');
      return;
    }
    if (!tokenSet && !tokenInput.trim()) {
      toast.error('Informe o token permanente');
      return;
    }
    if (!secretSet && !secretInput.trim()) {
      toast.error('Informe o app secret (necessário para validar o webhook)');
      return;
    }

    const payload: WhatsAppConfigUpdate = {
      whatsapp_phone_id: form.whatsapp_phone_id.trim(),
      whatsapp_waba_id: form.whatsapp_waba_id.trim(),
      whatsapp_verify_token: form.whatsapp_verify_token.trim() || null,
      whatsapp_rate_limit: form.whatsapp_rate_limit
        ? Number(form.whatsapp_rate_limit)
        : null,
    };
    // Token e app secret só vão se o usuário digitou (vazio = manter o atual).
    if (tokenInput.trim()) payload.whatsapp_token = tokenInput.trim();
    if (secretInput.trim()) payload.whatsapp_app_secret = secretInput.trim();

    setSaving(true);
    try {
      const cfg = await vendasWhatsappApi.saveConfig(payload);
      setTokenSet(!!cfg.whatsapp_token_set);
      setSecretSet(!!cfg.whatsapp_app_secret_set);
      setTokenInput('');
      setSecretInput('');
      toast.success('Configuração do WhatsApp salva com sucesso!');
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          WhatsApp (API oficial Meta)
        </CardTitle>
        <CardDescription>
          Configure a Cloud API do WhatsApp (Meta) para disparar campanhas e
          receber respostas. O token permanente e o app secret são armazenados
          criptografados e nunca exibidos em claro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Aviso de compliance Meta */}
        <div className="flex items-start gap-3 rounded-md border border-blue-300/60 bg-blue-50 px-3 py-3 dark:border-blue-800/60 dark:bg-blue-950/20">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1 text-xs text-blue-900/90 dark:text-blue-200/90">
            <p className="font-semibold">Regras da Meta</p>
            <p>
              Mensagens de marketing exigem um <strong>template aprovado</strong> pela
              Meta (informe o nome do template no editor de templates). Mensagem
              livre (texto) só pode ser enviada dentro da janela de 24h após o
              lead responder.
            </p>
          </div>
        </div>

        {/* Identificadores */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wa-waba-id" className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              WABA ID *
            </Label>
            <Input
              id="wa-waba-id"
              value={form.whatsapp_waba_id}
              onChange={(e) => updateField('whatsapp_waba_id', e.target.value)}
              placeholder="123456789012345"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              ID da conta do WhatsApp Business (WhatsApp Business Account).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-phone-id" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Phone Number ID *
            </Label>
            <Input
              id="wa-phone-id"
              value={form.whatsapp_phone_id}
              onChange={(e) => updateField('whatsapp_phone_id', e.target.value)}
              placeholder="987654321098765"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              ID do número de telefone usado para enviar mensagens.
            </p>
          </div>
        </div>

        <Separator />

        {/* Token permanente */}
        <div className="space-y-2">
          <Label htmlFor="wa-token" className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            Token permanente {!tokenSet && '*'}
          </Label>

          {tokenSet && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Token configurado
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleClearToken}
                disabled={saving}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            </div>
          )}

          <div className="relative">
            <Input
              id="wa-token"
              type={showToken ? 'text' : 'password'}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={
                tokenSet ? '•••• (deixe em branco para manter)' : 'Token permanente da System User'
              }
              className="pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use um token permanente de um System User com permissão na WABA (não
            um token temporário).
          </p>
        </div>

        {/* App secret */}
        <div className="space-y-2">
          <Label htmlFor="wa-secret" className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            App Secret {!secretSet && '*'}
          </Label>

          {secretSet && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                App secret configurado
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleClearSecret}
                disabled={saving}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            </div>
          )}

          <div className="relative">
            <Input
              id="wa-secret"
              type={showSecret ? 'text' : 'password'}
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder={
                secretSet ? '•••• (deixe em branco para manter)' : 'App secret do app Meta'
              }
              className="pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showSecret ? 'Ocultar app secret' : 'Mostrar app secret'}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Usado para validar a assinatura (HMAC SHA-256) dos webhooks recebidos
            da Meta.
          </p>
        </div>

        <Separator />

        {/* Verify token + rate limit */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wa-verify-token">Verify token (webhook)</Label>
            <Input
              id="wa-verify-token"
              value={form.whatsapp_verify_token}
              onChange={(e) => updateField('whatsapp_verify_token', e.target.value)}
              placeholder="token-de-verificacao-do-webhook"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Defina o mesmo valor no painel da Meta ao configurar o webhook.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-rate-limit">Rate limit (mensagens por rodada)</Label>
            <Input
              id="wa-rate-limit"
              type="number"
              min={1}
              max={5000}
              value={form.whatsapp_rate_limit}
              onChange={(e) => updateField('whatsapp_rate_limit', e.target.value)}
              placeholder="80"
            />
            <p className="text-xs text-muted-foreground">
              Quantas mensagens são enviadas por execução do disparo.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar configuração
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
