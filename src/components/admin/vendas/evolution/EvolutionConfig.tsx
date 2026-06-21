import { useState, useEffect, useCallback } from 'react';
import {
  vendasEvolutionApi,
  type ServidorPublic,
} from '@/integrations/api/vendasEvolution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * Config do servidor Evolution (GLOBAL — só super admin / admin_vertical).
 *
 * base_url + api_key (criptografada, nunca volta em claro) + webhook_base_url
 * (URL pública do TORIQ que a Evolution chama) + limite padrão de instâncias.
 */
export function EvolutionConfig({ onSaved }: { onSaved?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [baseUrl, setBaseUrl] = useState('');
  const [webhookBaseUrl, setWebhookBaseUrl] = useState('');
  const [limite, setLimite] = useState<number>(1);
  const [ativo, setAtivo] = useState(true);

  const [keySet, setKeySet] = useState(false);
  const [keyMasked, setKeyMasked] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');

  const aplicar = useCallback((cfg: ServidorPublic) => {
    setBaseUrl(cfg.base_url ?? '');
    setWebhookBaseUrl(cfg.webhook_base_url ?? '');
    setLimite(cfg.limite_padrao_instancias ?? 1);
    setAtivo(cfg.ativo ?? true);
    setKeySet(!!cfg.api_key_set);
    setKeyMasked(cfg.api_key_masked ?? null);
  }, []);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      aplicar(await vendasEvolutionApi.getServidor());
    } catch (err) {
      console.error('[EvolutionConfig] erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, [aplicar]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const cfg = await vendasEvolutionApi.saveServidor({
        base_url: baseUrl.trim() || null,
        webhook_base_url: webhookBaseUrl.trim() || null,
        limite_padrao_instancias: limite,
        ativo,
        // vazio = mantém a atual
        api_key: keyInput.trim() || undefined,
      });
      aplicar(cfg);
      setKeyInput('');
      toast.success('Servidor Evolution salvo');
      onSaved?.();
    } catch (error) {
      toast.error(
        (error as Error)?.message || 'Erro ao salvar o servidor Evolution',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-2 h-4 w-80" />
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
        <CardTitle>Servidor Evolution (global)</CardTitle>
        <CardDescription>
          Conexão única com a Evolution API da sua VPS. Visível apenas para o
          super admin. A API key é guardada criptografada e nunca volta em claro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="evo-base-url">Base URL</Label>
          <Input
            id="evo-base-url"
            placeholder="https://evo.suavps.com.br"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="evo-webhook-url">Webhook base URL (público do TORIQ)</Label>
          <Input
            id="evo-webhook-url"
            placeholder="https://api.seudominio.com.br"
            value={webhookBaseUrl}
            onChange={(e) => setWebhookBaseUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="evo-api-key">
            API key global{keySet ? ` (atual: ${keyMasked ?? '••••'})` : ''}
          </Label>
          <Input
            id="evo-api-key"
            type="password"
            placeholder={keySet ? 'Deixe vazio para manter a atual' : 'Cole a API key'}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="evo-limite">Limite padrão de instâncias por empresa</Label>
          <Input
            id="evo-limite"
            type="number"
            min={1}
            value={limite}
            onChange={(e) => setLimite(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="evo-ativo">Servidor ativo</Label>
          <Switch id="evo-ativo" checked={ativo} onCheckedChange={setAtivo} />
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar servidor
        </Button>
      </CardContent>
    </Card>
  );
}
