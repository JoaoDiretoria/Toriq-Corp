import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type Post, type ComentarioIG } from '@/integrations/api/vendasInstagram';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageCircle, Send } from 'lucide-react';

export function InstagramPostDetalhe({ post, open, onOpenChange }: {
  post: Post | null; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const [comments, setComments] = useState<ComentarioIG[]>([]);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [modes, setModes] = useState<Record<string, { publico: boolean; dm: boolean }>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const fetchComments = useCallback(async () => {
    if (!post) return;
    setLoading(true);
    try {
      const data = await vendasInstagramApi.listComentariosPost(post.id);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[InstagramPostDetalhe] erro:', err);
      toast.error('Erro ao carregar comentários');
      setComments([]);
    } finally { setLoading(false); }
  }, [post]);

  useEffect(() => { if (open && post) fetchComments(); }, [open, post, fetchComments]);

  const modeOf = (id: string) => modes[id] ?? { publico: true, dm: false };

  const responder = async (id: string) => {
    const texto = (drafts[id] || '').trim();
    if (!texto) return;
    const m = modeOf(id);
    if (!m.publico && !m.dm) { toast.error('Escolha público ou DM'); return; }
    setSending(id);
    try {
      await vendasInstagramApi.responderComentario(id, { texto, publico: m.publico, dm: m.dm });
      setDone((d) => ({ ...d, [id]: true }));
      toast.success('Resposta enviada');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao responder';
      toast.error(msg);
    }
    finally { setSending(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" />Comentários do post</DialogTitle></DialogHeader>
        {post?.caption && <p className="text-sm text-muted-foreground line-clamp-2">{post.caption}</p>}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum comentário neste post.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => {
              const id = c.id as string;
              const m = modeOf(id);
              return (
                <div key={id} className="rounded-md border p-3 space-y-2">
                  <div className="text-sm"><span className="font-medium">@{c.username || '—'}</span> <span className="text-muted-foreground">{c.text}</span></div>
                  {done[id] ? (
                    <Badge className="bg-green-600 hover:bg-green-700 gap-1"><Send className="h-3 w-3" />Respondido</Badge>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input value={drafts[id] || ''} onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))} placeholder="Responder…" className="flex-1" />
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={m.publico ? 'default' : 'outline'} onClick={() => setModes((s) => ({ ...s, [id]: { ...m, publico: !m.publico } }))}>Público</Button>
                        <Button type="button" size="sm" variant={m.dm ? 'default' : 'outline'} onClick={() => setModes((s) => ({ ...s, [id]: { ...m, dm: !m.dm } }))}>DM</Button>
                        <Button type="button" size="sm" onClick={() => responder(id)} disabled={sending === id}><Send className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
