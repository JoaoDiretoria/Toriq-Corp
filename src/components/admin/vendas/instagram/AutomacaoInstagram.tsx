import { useState, useEffect, useCallback } from 'react';
import { vendasInstagramApi, type InstagramStats } from '@/integrations/api/vendasInstagram';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Instagram, MessageCircle, Image as ImageIcon, Zap, Settings2,
  CheckCircle2, AlertTriangle, Users, Send,
} from 'lucide-react';
import { InstagramComentarios } from './InstagramComentarios';
import { InstagramPosts } from './InstagramPosts';
import { InstagramGatilhos } from './InstagramGatilhos';
import { InstagramConexao } from './InstagramConexao';

export function AutomacaoInstagram() {
  const [tab, setTab] = useState('comentarios');
  const [stats, setStats] = useState<InstagramStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [conectado, setConectado] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try { setStats(await vendasInstagramApi.getStats()); }
    catch { setStats(null); }
    finally { setLoadingStats(false); }
  }, []);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const cfg = await vendasInstagramApi.getConfig();
      setConectado(!!cfg.instagram_user_id && cfg.instagram_token_set);
    } catch { setConectado(false); }
    finally { setLoadingConfig(false); }
  }, []);

  useEffect(() => { fetchStats(); fetchConfig(); }, [fetchStats, fetchConfig]);

  // Se descobriu que não está conectado, abre na aba Conexão (nudge).
  useEffect(() => {
    if (!loadingConfig && !conectado) setTab('conexao');
  }, [loadingConfig, conectado]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Instagram className="h-6 w-6" />Automação Instagram</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Responda comentários automaticamente com IA (público e direct), no estilo ManyChat.
          </p>
        </div>
        {loadingConfig ? <Skeleton className="h-6 w-32" /> : conectado ? (
          <Badge className="bg-green-600 hover:bg-green-700 gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Conectado</Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Não conectado</Badge>
        )}
      </div>

      {!loadingConfig && !conectado && (
        <Card className="border-amber-300/60 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/20">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 shrink-0"><AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Instagram não conectado</p>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">Conecte sua conta profissional para começar a receber e responder comentários.</p>
              </div>
            </div>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0" onClick={() => setTab('conexao')}>
              <Settings2 className="h-4 w-4 mr-2" />Conectar agora
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Comentários" value={stats?.comentarios ?? 0} icon={MessageCircle} loading={loadingStats} />
        <StatCard label="Respondidos" value={stats?.respondidos ?? 0} icon={Send} iconClass="text-green-500" loading={loadingStats} />
        <StatCard label="Leads gerados" value={stats?.leads ?? 0} icon={Users} loading={loadingStats} />
        <StatCard label="Erros" value={stats?.erros ?? 0} icon={AlertTriangle} iconClass="text-amber-500" loading={loadingStats} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="comentarios" className="gap-2"><MessageCircle className="h-4 w-4" />Comentários</TabsTrigger>
          <TabsTrigger value="posts" className="gap-2"><ImageIcon className="h-4 w-4" />Posts</TabsTrigger>
          <TabsTrigger value="gatilhos" className="gap-2"><Zap className="h-4 w-4" />Gatilhos</TabsTrigger>
          <TabsTrigger value="conexao" className="gap-2"><Settings2 className="h-4 w-4" />Conexão</TabsTrigger>
        </TabsList>
        <TabsContent value="comentarios" className="mt-4"><InstagramComentarios /></TabsContent>
        <TabsContent value="posts" className="mt-4"><InstagramPosts onGoToConexao={() => setTab('conexao')} /></TabsContent>
        <TabsContent value="gatilhos" className="mt-4"><InstagramGatilhos /></TabsContent>
        <TabsContent value="conexao" className="mt-4"><InstagramConexao onSaved={() => { fetchConfig(); fetchStats(); }} /></TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, iconClass, loading }: { label: string; value: number | string; icon: any; iconClass?: string; loading: boolean; }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold tabular-nums">{value}</p>}
        </div>
        <Icon className={`h-5 w-5 shrink-0 ${iconClass ?? 'text-muted-foreground'}`} />
      </CardContent>
    </Card>
  );
}
