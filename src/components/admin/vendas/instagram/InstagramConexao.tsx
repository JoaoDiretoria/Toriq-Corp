import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type InstagramConfigUpdate } from '@/integrations/api/vendasInstagram';
import { API_URL } from '@/integrations/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckCircle2, Trash2, Copy, KeyRound } from 'lucide-react';

export function InstagramConexao({ onSaved }: { onSaved?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  const [tokenSet, setTokenSet] = useState(false);
  const [tokenMasked, setTokenMasked] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');

  const [appSecretSet, setAppSecretSet] = useState(false);
  const [appSecretInput, setAppSecretInput] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await vendasInstagramApi.getConfig();
      setUserId(cfg.instagram_user_id ?? '');
      setUsername(cfg.instagram_username ?? '');
      setVerifyToken(cfg.instagram_verify_token ?? '');
      setTokenSet(cfg.instagram_token_set);
      setTokenMasked(cfg.instagram_token_masked ?? null);
      setAppSecretSet(cfg.instagram_app_secret_set);
      setTokenInput(''); setAppSecretInput('');
    } catch (err) { console.error('[InstagramConexao] erro:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const webhookUrl = `${API_URL}/vendas/instagram/webhook`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: InstagramConfigUpdate = {
        instagram_user_id: userId.trim() || null,
        instagram_username: username.trim() || null,
        instagram_verify_token: verifyToken.trim() || null,
      };
      if (tokenInput.trim()) payload.instagram_token = tokenInput.trim();
      if (appSecretInput.trim()) payload.instagram_app_secret = appSecretInput.trim();
      await vendasInstagramApi.saveConfig(payload);
      toast.success('Conexão salva');
      await fetchConfig();
      onSaved?.();
    } catch (err: any) { toast.error(err?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleClearToken = async () => {
    setSaving(true);
    try { await vendasInstagramApi.saveConfig({ clear_instagram_token: true }); await fetchConfig(); onSaved?.(); toast.success('Token removido'); }
    catch (err: any) { toast.error(err?.message || 'Erro'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  return (
    <Card>
      <CardContent className="space-y-5 py-5 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="ig-uid">IG User ID (conta profissional)</Label>
          <Input id="ig-uid" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="17841400000000000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ig-user">@usuário (exibição)</Label>
          <Input id="ig-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="minhaempresa" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ig-vt">Verify token (handshake do webhook)</Label>
          <Input id="ig-vt" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="um segredo qualquer que você define" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ig-token" className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />Token de acesso {!tokenSet && '*'}</Label>
          {tokenSet && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-green-600" />Token configurado{tokenMasked && <code className="text-xs font-mono text-foreground">{tokenMasked}</code>}</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleClearToken} disabled={saving}><Trash2 className="h-3.5 w-3.5 mr-1" />Remover</Button>
            </div>
          )}
          <Input id="ig-token" type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder={tokenSet ? '•••• (deixe em branco para manter)' : 'token de acesso da Página/Instagram'} autoComplete="new-password" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ig-secret" className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />App secret (valida assinatura do webhook) {!appSecretSet && '*'}</Label>
          {appSecretSet && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />App secret configurado</p>}
          <Input id="ig-secret" type="password" value={appSecretInput} onChange={(e) => setAppSecretInput(e.target.value)} placeholder={appSecretSet ? '•••• (deixe em branco para manter)' : 'app secret do app da Meta'} autoComplete="new-password" />
        </div>

        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Label className="text-xs">URL do webhook (cole no painel da Meta)</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-xs font-mono">{webhookUrl}</code>
            <Button type="button" variant="outline" size="sm" className="h-7 shrink-0" onClick={() => { navigator.clipboard?.writeText(webhookUrl); toast.success('URL copiada'); }}><Copy className="h-3.5 w-3.5 mr-1" />Copiar</Button>
          </div>
          <p className="text-xs text-muted-foreground">No app da Meta, assine o campo <strong>comments</strong> e use este Verify Token. Segredos ficam criptografados e nunca voltam em claro.</p>
        </div>

        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar conexão'}</Button>
      </CardContent>
    </Card>
  );
}
