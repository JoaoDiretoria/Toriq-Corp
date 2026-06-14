import { useState, useEffect, useCallback } from 'react';
import {
  vendasDisparoApi,
  type DisparoConfigUpdate,
} from '@/integrations/api/vendasDisparo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Server,
  Eye,
  EyeOff,
  CheckCircle2,
  Trash2,
  Mail,
  KeyRound,
} from 'lucide-react';

interface DisparoConfigProps {
  /** Disparado após salvar com sucesso (a página recarrega o status do provedor). */
  onSaved?: () => void;
}

interface FormState {
  email_remetente: string;
  email_remetente_nome: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_use_tls: boolean;
  email_rate_limit: string;
  dedup_dias: string;
}

const EMPTY_FORM: FormState = {
  email_remetente: '',
  email_remetente_nome: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_use_tls: true,
  email_rate_limit: '100',
  dedup_dias: '0',
};

export function DisparoConfig({ onSaved }: DisparoConfigProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Senha SMTP: setada no backend? máscara para exibição. Vazio no input =
  // "não alterar a senha existente".
  const [passwordSet, setPasswordSet] = useState(false);
  const [passwordMasked, setPasswordMasked] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await vendasDisparoApi.getConfig();
      setForm({
        email_remetente: cfg.email_remetente ?? '',
        email_remetente_nome: cfg.email_remetente_nome ?? '',
        smtp_host: cfg.smtp_host ?? '',
        smtp_port: cfg.smtp_port != null ? String(cfg.smtp_port) : '587',
        smtp_user: cfg.smtp_user ?? '',
        smtp_use_tls: cfg.smtp_use_tls ?? true,
        email_rate_limit:
          cfg.email_rate_limit != null ? String(cfg.email_rate_limit) : '100',
        dedup_dias: cfg.dedup_dias != null ? String(cfg.dedup_dias) : '0',
      });
      setPasswordSet(!!cfg.smtp_password_set);
      setPasswordMasked(cfg.smtp_password_masked ?? null);
      setPasswordInput('');
      setShowPassword(false);
    } catch (error) {
      console.error('[DisparoConfig] erro ao carregar config:', error);
      toast.error('Erro ao carregar a configuração de email');
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

  const handleClearPassword = async () => {
    setSaving(true);
    try {
      const cfg = await vendasDisparoApi.saveConfig({ clear_smtp_password: true });
      setPasswordSet(!!cfg.smtp_password_set);
      setPasswordMasked(cfg.smtp_password_masked ?? null);
      setPasswordInput('');
      toast.success('Senha SMTP removida');
      onSaved?.();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao remover senha');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.smtp_host.trim()) {
      toast.error('Informe o servidor SMTP (host)');
      return;
    }
    if (!form.email_remetente.trim()) {
      toast.error('Informe o e-mail remetente');
      return;
    }
    if (!passwordSet && !passwordInput.trim()) {
      toast.error('Informe a senha SMTP');
      return;
    }

    const payload: DisparoConfigUpdate = {
      email_provider: 'smtp',
      email_remetente: form.email_remetente.trim(),
      email_remetente_nome: form.email_remetente_nome.trim() || null,
      smtp_host: form.smtp_host.trim(),
      smtp_port: form.smtp_port ? Number(form.smtp_port) : null,
      smtp_user: form.smtp_user.trim() || null,
      smtp_use_tls: form.smtp_use_tls,
      email_rate_limit: form.email_rate_limit ? Number(form.email_rate_limit) : null,
      dedup_dias: form.dedup_dias !== '' ? Number(form.dedup_dias) : 0,
    };
    // Só envia a senha se o usuário digitou algo (vazio = manter a atual).
    if (passwordInput.trim()) payload.smtp_password = passwordInput.trim();

    setSaving(true);
    try {
      const cfg = await vendasDisparoApi.saveConfig(payload);
      setPasswordSet(!!cfg.smtp_password_set);
      setPasswordMasked(cfg.smtp_password_masked ?? null);
      setPasswordInput('');
      toast.success('Configuração de email salva com sucesso!');
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
          {Array.from({ length: 4 }).map((_, i) => (
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
          <Server className="h-5 w-5" />
          Provedor de Email (SMTP)
        </CardTitle>
        <CardDescription>
          Configure o servidor SMTP para habilitar o disparo de campanhas por
          e-mail. A senha é armazenada criptografada e nunca é exibida em claro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Remetente */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email-remetente" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              E-mail remetente *
            </Label>
            <Input
              id="email-remetente"
              type="email"
              value={form.email_remetente}
              onChange={(e) => updateField('email_remetente', e.target.value)}
              placeholder="contato@suaempresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-remetente-nome">Nome do remetente</Label>
            <Input
              id="email-remetente-nome"
              value={form.email_remetente_nome}
              onChange={(e) => updateField('email_remetente_nome', e.target.value)}
              placeholder="Equipe Toriq Corp"
            />
          </div>
        </div>

        <Separator />

        {/* Servidor SMTP */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="smtp-host">Servidor SMTP (host) *</Label>
            <Input
              id="smtp-host"
              value={form.smtp_host}
              onChange={(e) => updateField('smtp_host', e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-port">Porta</Label>
            <Input
              id="smtp-port"
              type="number"
              min={1}
              max={65535}
              value={form.smtp_port}
              onChange={(e) => updateField('smtp_port', e.target.value)}
              placeholder="587"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp-user">Usuário SMTP</Label>
          <Input
            id="smtp-user"
            value={form.smtp_user}
            onChange={(e) => updateField('smtp_user', e.target.value)}
            placeholder="contato@suaempresa.com"
            autoComplete="off"
          />
        </div>

        {/* Senha SMTP */}
        <div className="space-y-2">
          <Label htmlFor="smtp-password" className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            Senha SMTP {!passwordSet && '*'}
          </Label>

          {passwordSet && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Senha configurada
                {passwordMasked && (
                  <code className="text-xs font-mono text-foreground">{passwordMasked}</code>
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleClearPassword}
                disabled={saving}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            </div>
          )}

          <div className="relative">
            <Input
              id="smtp-password"
              type={showPassword ? 'text' : 'password'}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder={passwordSet ? '•••• (deixe em branco para manter)' : 'Senha ou app password'}
              className="pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Para Gmail/Google Workspace, use uma senha de app (não a senha da conta).
          </p>
        </div>

        <Separator />

        {/* TLS + rate limit */}
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div className="space-y-0.5">
              <Label htmlFor="smtp-tls" className="text-sm">Usar TLS (STARTTLS)</Label>
              <p className="text-xs text-muted-foreground">Recomendado para a porta 587</p>
            </div>
            <Switch
              id="smtp-tls"
              checked={form.smtp_use_tls}
              onCheckedChange={(v) => updateField('smtp_use_tls', v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate-limit">Rate limit (e-mails por rodada)</Label>
            <Input
              id="rate-limit"
              type="number"
              min={1}
              max={5000}
              value={form.email_rate_limit}
              onChange={(e) => updateField('email_rate_limit', e.target.value)}
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground">
              Quantos e-mails são enviados por execução do disparo.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dedup-dias">Dedup — não reenviar (dias)</Label>
            <Input
              id="dedup-dias"
              type="number"
              min={0}
              max={365}
              value={form.dedup_dias}
              onChange={(e) => updateField('dedup_dias', e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Não reenviar para um lead que já recebeu um disparo nos últimos N dias
              (vale e-mail e WhatsApp). 0 = desligado.
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
