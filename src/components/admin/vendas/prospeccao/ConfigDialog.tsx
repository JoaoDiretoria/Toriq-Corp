import { useState, useEffect, useCallback } from 'react';
import {
  prospeccaoApi,
  type ProspeccaoConfigUpdate,
} from '@/integrations/api/vendasProspeccao';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  Settings2,
  Trash2,
  Globe,
  Facebook,
  Instagram,
  Linkedin,
} from 'lucide-react';

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Disparado após salvar com sucesso (a página recarrega o estado da config). */
  onSaved?: () => void;
}

// Plataformas com actor configurável. Os defaults vêm do backend (config.actors);
// deixamos o campo vazio para usar o padrão e só enviamos overrides preenchidos.
const PLATAFORMAS_ACTOR: { key: string; label: string; icon: typeof Globe; placeholder: string }[] = [
  { key: 'google', label: 'Google Maps', icon: Globe, placeholder: 'compass~crawler-google-places' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'apify~facebook-pages-scraper' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'apify~instagram-scraper' },
  { key: 'instagram_followers', label: 'Instagram — Seguidores', icon: Instagram, placeholder: 'apify~instagram-follower-scraper' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'bebity~linkedin-premium-actor' },
];

export function ConfigDialog({ open, onOpenChange, onSaved }: ConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [tokenSet, setTokenSet] = useState(false);
  const [tokenMasked, setTokenMasked] = useState<string | null>(null);
  // Token digitado pelo usuário (vazio = não alterar o token existente).
  const [tokenInput, setTokenInput] = useState('');
  // Overrides de actors por plataforma.
  const [actors, setActors] = useState<Record<string, string>>({});
  const [cacheDias, setCacheDias] = useState('0');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await prospeccaoApi.getConfig();
      setTokenSet(!!cfg.apify_token_set);
      setTokenMasked(cfg.apify_token_masked ?? null);
      setActors(cfg.actors ?? {});
      setCacheDias(cfg.cache_dias != null ? String(cfg.cache_dias) : '0');
      setTokenInput('');
      setShowToken(false);
    } catch (error) {
      console.error('[ConfigDialog] erro ao carregar config:', error);
      toast.error('Erro ao carregar a configuração');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchConfig();
  }, [open, fetchConfig]);

  const handleClearToken = async () => {
    setSaving(true);
    try {
      const cfg = await prospeccaoApi.saveConfig({ clear_apify_token: true });
      setTokenSet(!!cfg.apify_token_set);
      setTokenMasked(cfg.apify_token_masked ?? null);
      setTokenInput('');
      toast.success('Token do Apify removido');
      onSaved?.();
    } catch (error: any) {
      console.error('[ConfigDialog] erro ao remover token:', error);
      toast.error(error?.message || 'Erro ao remover token');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    // Sem token configurado e sem input novo: exige um token.
    if (!tokenSet && !tokenInput.trim()) {
      toast.error('Informe o token do Apify');
      return;
    }

    const payload: ProspeccaoConfigUpdate = {};
    if (tokenInput.trim()) payload.apify_token = tokenInput.trim();

    // Só envia actors com override preenchido (campos vazios usam o default).
    const cleanActors: Record<string, string> = {};
    for (const [k, v] of Object.entries(actors)) {
      if (v && v.trim()) cleanActors[k] = v.trim();
    }
    if (Object.keys(cleanActors).length > 0) payload.actors = cleanActors;
    payload.cache_dias = cacheDias !== '' ? Number(cacheDias) : 0;

    if (Object.keys(payload).length === 0) {
      toast.info('Nenhuma alteração para salvar');
      return;
    }

    setSaving(true);
    try {
      const cfg = await prospeccaoApi.saveConfig(payload);
      setTokenSet(!!cfg.apify_token_set);
      setTokenMasked(cfg.apify_token_masked ?? null);
      setActors(cfg.actors ?? {});
      setTokenInput('');
      toast.success('Configuração salva com sucesso!');
      onSaved?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[ConfigDialog] erro ao salvar:', error);
      toast.error(error?.message || 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuração do Apify
          </DialogTitle>
          <DialogDescription>
            Conecte seu token do Apify para habilitar a captação de leads.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Token */}
            <div className="space-y-2">
              <Label htmlFor="apify-token" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Token do Apify
              </Label>

              {tokenSet && (
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Token configurado
                    {tokenMasked && (
                      <code className="text-xs font-mono text-foreground">{tokenMasked}</code>
                    )}
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
                  id="apify-token"
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={tokenSet ? '•••• (deixe em branco para manter)' : 'apify_api_...'}
                  className="pr-10"
                  autoComplete="off"
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
                Encontre seu token em console.apify.com → Settings → Integrations
              </p>
            </div>

            {/* Cache de prospecção */}
            <div className="space-y-1.5">
              <Label htmlFor="cache-dias" className="text-xs font-medium">
                Cache de busca (dias)
              </Label>
              <Input
                id="cache-dias"
                type="number"
                min={0}
                max={90}
                value={cacheDias}
                onChange={(e) => setCacheDias(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Reutiliza os resultados de uma busca idêntica feita nos últimos N dias,
                economizando Compute Units do Apify. 0 = sempre buscar do zero.
              </p>
            </div>

            <Separator />

            {/* Actors avançados (opcional) */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-medium hover:text-primary"
              >
                <span className="flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" />
                  Actors personalizados (avançado)
                </span>
                <span className="text-xs text-muted-foreground">
                  {showAdvanced ? 'Ocultar' : 'Mostrar'}
                </span>
              </button>

              {showAdvanced && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para usar o actor padrão de cada plataforma. Use o formato{' '}
                    <code className="font-mono">org~actor</code>.
                  </p>
                  {PLATAFORMAS_ACTOR.map(({ key, label, icon: Icon, placeholder }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {label}
                      </Label>
                      <Input
                        value={actors[key] ?? ''}
                        onChange={(e) =>
                          setActors((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={placeholder}
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
