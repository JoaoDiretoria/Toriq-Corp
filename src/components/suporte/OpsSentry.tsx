import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { opsApi, type SentryStatusOut } from '@/integrations/api/ops';
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

export function OpsSentry() {
  const [data, setData] = useState<SentryStatusOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      setData(await opsApi.sentry());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar status do Sentry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  if (loading) return <div className="animate-pulse text-muted-foreground">Carregando...</div>;
  if (erro) return <div className="text-destructive">{erro}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data.configurado ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          )}
          <Badge variant={data.configurado ? 'default' : 'secondary'}>
            {data.configurado ? 'Sentry configurado' : 'Sentry não configurado'}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={carregar}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status do Sentry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 py-2">
            <span className="text-sm font-medium">Configurado</span>
            <span className="text-sm text-muted-foreground">{data.configurado ? 'Sim' : 'Não'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 py-2">
            <span className="text-sm font-medium">Ambiente</span>
            <span className="text-sm text-muted-foreground">{data.environment}</span>
          </div>
          {data.url && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Projeto</span>
              <a
                href={data.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Abrir no Sentry
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {!data.configurado && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              O monitoramento de erros via Sentry não está ativo. Para ativá-lo, defina a
              variável de ambiente <code className="font-mono font-semibold">SENTRY_DSN</code> no
              servidor e reinicie a aplicação. Opcionalmente, configure também{' '}
              <code className="font-mono font-semibold">SENTRY_ORG</code> e{' '}
              <code className="font-mono font-semibold">SENTRY_PROJECT</code> para habilitar o
              link direto ao painel do projeto.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
