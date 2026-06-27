import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type Post, type Publicacao } from '@/integrations/api/vendasInstagram';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon, MessageCircle, ExternalLink, Link2Off, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { InstagramPostDetalhe } from './InstagramPostDetalhe';
import { InstagramPublicar } from './InstagramPublicar';

export function InstagramPosts({ onGoToConexao }: { onGoToConexao?: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [naoConectado, setNaoConectado] = useState(false);
  const [sel, setSel] = useState<Post | null>(null);
  const [pubOpen, setPubOpen] = useState(false);
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setNaoConectado(false);
    try {
      const data = await vendasInstagramApi.listPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      // 400 = não conectado; demais = erro genérico.
      const apiErr = err as { status?: number };
      if (apiErr?.status === 400) setNaoConectado(true);
      console.error('[InstagramPosts] erro:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPublicacoes = useCallback(async () => {
    try {
      const data = await vendasInstagramApi.listPublicacoes();
      setPublicacoes(Array.isArray(data) ? data : []);
    } catch {
      setPublicacoes([]);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchPublicacoes();
  }, [fetchPosts, fetchPublicacoes]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (naoConectado) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Link2Off className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Instagram não conectado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
            Conecte sua conta na aba Conexão para ver suas postagens aqui.
          </p>
          {onGoToConexao && <Button onClick={onGoToConexao}>Ir para Conexão</Button>}
        </CardContent>
      </Card>
    );
  }

  const statusBadge = (status: string) => {
    if (status === 'publicado') return <Badge variant="default" className="bg-green-600 text-white">publicado</Badge>;
    if (status === 'erro') return <Badge variant="destructive">erro</Badge>;
    return <Badge variant="secondary">processando</Badge>;
  };

  return (
    <>
      {/* Lista de publicações criadas pelo dashboard */}
      {publicacoes.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Publicações enviadas pelo dashboard</h3>
            <Button size="sm" variant="ghost" onClick={fetchPublicacoes}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />Atualizar
            </Button>
          </div>
          <div className="space-y-2">
            {publicacoes.map((pub) => (
              <div key={pub.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {statusBadge(pub.status)}
                    <span className="text-xs text-muted-foreground font-medium">{pub.tipo}</span>
                    {pub.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(pub.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                  {pub.caption && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{pub.caption}</p>
                  )}
                  {pub.erro && (
                    <p className="flex items-center gap-1 text-xs text-destructive mt-0.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />{pub.erro}
                    </p>
                  )}
                </div>
                {pub.ig_media_id && (
                  <span className="text-xs text-muted-foreground shrink-0">ID: {pub.ig_media_id}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cabeçalho da grid de posts */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Suas postagens</h3>
        <Button size="sm" onClick={() => setPubOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Publicar post
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum post encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Publique algo no Instagram para vê-lo aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {posts.map((p) => (
            <Card
              key={p.id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 transition"
              onClick={() => setSel(p)}
            >
              {p.media_url ? (
                <img
                  src={p.media_url}
                  alt={p.caption ?? 'post'}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-square w-full bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <CardContent className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {p.caption || '—'}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5" />{p.comments_count ?? 0}
                  </span>
                  {p.permalink && (
                    <a
                      href={p.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />Abrir
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InstagramPostDetalhe post={sel} open={!!sel} onOpenChange={(v) => !v && setSel(null)} />
      <InstagramPublicar open={pubOpen} onOpenChange={setPubOpen} onPublicado={fetchPublicacoes} />
    </>
  );
}
