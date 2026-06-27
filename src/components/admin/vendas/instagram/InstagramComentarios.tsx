import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type Comentario } from '@/integrations/api/vendasInstagram';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageCircle, CheckCircle2, Send, AlertTriangle } from 'lucide-react';

export function InstagramComentarios() {
  const [items, setItems] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendasInstagramApi.listComentarios(100);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[InstagramComentarios] erro:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4"><MessageCircle className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-semibold">Nenhum comentário ainda</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Quando alguém comentar nos seus posts, os comentários e as respostas do agente aparecem aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>@usuário</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Resposta do agente</TableHead>
              <TableHead className="w-44">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.from_username ? `@${c.from_username}` : '—'}</TableCell>
                <TableCell className="max-w-xs truncate" title={c.texto ?? ''}>{c.texto || '—'}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground" title={c.resposta_texto ?? ''}>{c.resposta_texto || '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.respondido_publico && <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle2 className="h-3 w-3" />Público</Badge>}
                    {c.respondido_dm && <Badge className="bg-blue-600 hover:bg-blue-700 gap-1"><Send className="h-3 w-3" />DM</Badge>}
                    {c.erro && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Erro</Badge>}
                    {!c.respondido_publico && !c.respondido_dm && !c.erro && <Badge variant="secondary">Sem resposta</Badge>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
