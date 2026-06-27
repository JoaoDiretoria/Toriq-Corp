import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type Post } from '@/integrations/api/vendasInstagram';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon, MessageCircle, ExternalLink, Link2Off } from 'lucide-react';
import { InstagramPostDetalhe } from './InstagramPostDetalhe';

export function InstagramPosts({ onGoToConexao }: { onGoToConexao?: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [naoConectado, setNaoConectado] = useState(false);
  const [sel, setSel] = useState<Post | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setNaoConectado(false);
    try {
      const data = await vendasInstagramApi.listPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // 400 = não conectado; demais = erro genérico.
      if (err?.status === 400) setNaoConectado(true);
      console.error('[InstagramPosts] erro:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  if (loading) {
    return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full" />)}</div>;
  }

  if (naoConectado) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4"><Link2Off className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-semibold">Instagram não conectado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">Conecte sua conta na aba Conexão para ver suas postagens aqui.</p>
          {onGoToConexao && <Button onClick={onGoToConexao}>Ir para Conexão</Button>}
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-semibold">Nenhum post encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">Publique algo no Instagram para vê-lo aqui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {posts.map((p) => (
          <Card key={p.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 transition" onClick={() => setSel(p)}>
            {p.media_url ? (
              <img src={p.media_url} alt={p.caption ?? 'post'} className="aspect-square w-full object-cover" loading="lazy" />
            ) : (
              <div className="aspect-square w-full bg-muted flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
            )}
            <CardContent className="p-3 space-y-2">
              <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{p.caption || '—'}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground"><MessageCircle className="h-3.5 w-3.5" />{p.comments_count ?? 0}</span>
                {p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-3.5 w-3.5" />Abrir</a>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <InstagramPostDetalhe post={sel} open={!!sel} onOpenChange={(v) => !v && setSel(null)} />
    </>
  );
}
