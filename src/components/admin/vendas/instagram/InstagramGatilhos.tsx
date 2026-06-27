import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type Gatilho, type GatilhoInput } from '@/integrations/api/vendasInstagram';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Zap, Plus, Pencil, Trash2 } from 'lucide-react';

const EMPTY: GatilhoInput = {
  palavra_chave: '', ativo: true, responder_publico: true, responder_dm: false,
  instrucao_ia: '', resposta_publica_fixa: '',
};

export function InstagramGatilhos() {
  const [items, setItems] = useState<Gatilho[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Gatilho | null>(null);
  const [form, setForm] = useState<GatilhoInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try { const d = await vendasInstagramApi.listGatilhos(); setItems(Array.isArray(d) ? d : []); }
    catch { toast.error('Erro ao carregar gatilhos'); setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (g: Gatilho) => {
    setEditing(g);
    setForm({
      palavra_chave: g.palavra_chave ?? '', ativo: g.ativo,
      responder_publico: g.responder_publico, responder_dm: g.responder_dm,
      instrucao_ia: g.instrucao_ia ?? '', resposta_publica_fixa: g.resposta_publica_fixa ?? '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await vendasInstagramApi.updateGatilho(editing.id, form);
      else await vendasInstagramApi.createGatilho(form);
      toast.success(editing ? 'Gatilho atualizado' : 'Gatilho criado');
      setOpen(false);
      fetchItems();
    } catch (err: any) { toast.error(err?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (g: Gatilho) => {
    if (!confirm(`Remover o gatilho "${g.palavra_chave || 'qualquer comentário'}"?`)) return;
    try { await vendasInstagramApi.deleteGatilho(g.id); toast.success('Gatilho removido'); fetchItems(); }
    catch (err: any) { toast.error(err?.message || 'Erro ao remover'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">A palavra-chave dispara a resposta; deixe vazio para responder <strong>qualquer comentário</strong>.</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo gatilho</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4"><Zap className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-semibold">Nenhum gatilho</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">Crie um gatilho para o agente responder comentários automaticamente.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((g) => (
            <Card key={g.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{g.palavra_chave || 'Qualquer comentário'}</span>
                    {g.ativo ? <Badge className="bg-green-600 hover:bg-green-700">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                    {g.responder_publico && <Badge variant="outline">Público</Badge>}
                    {g.responder_dm && <Badge variant="outline">DM</Badge>}
                  </div>
                  {g.instrucao_ia && <p className="text-xs text-muted-foreground mt-1 truncate">IA: {g.instrucao_ia}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(g)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar gatilho' : 'Novo gatilho'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="g-kw">Palavra-chave</Label>
              <Input id="g-kw" value={form.palavra_chave ?? ''} onChange={(e) => setForm((f) => ({ ...f, palavra_chave: e.target.value }))} placeholder="ex.: PREÇO (vazio = qualquer comentário)" />
            </div>
            <div className="flex items-center justify-between"><Label htmlFor="g-pub">Responder publicamente</Label><Switch id="g-pub" checked={!!form.responder_publico} onCheckedChange={(v) => setForm((f) => ({ ...f, responder_publico: v }))} /></div>
            <div className="flex items-center justify-between"><Label htmlFor="g-dm">Mandar DM (comment-to-DM)</Label><Switch id="g-dm" checked={!!form.responder_dm} onCheckedChange={(v) => setForm((f) => ({ ...f, responder_dm: v }))} /></div>
            <div className="space-y-2">
              <Label htmlFor="g-ia">Instrução para a IA (opcional)</Label>
              <Textarea id="g-ia" value={form.instrucao_ia ?? ''} onChange={(e) => setForm((f) => ({ ...f, instrucao_ia: e.target.value }))} placeholder="ex.: ofereça a tabela de preços e peça o WhatsApp" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-fixa">Resposta pública fixa (opcional)</Label>
              <Input id="g-fixa" value={form.resposta_publica_fixa ?? ''} onChange={(e) => setForm((f) => ({ ...f, resposta_publica_fixa: e.target.value }))} placeholder="ex.: te chamei no direct! 📩 (vazio = IA escreve)" />
            </div>
            <div className="flex items-center justify-between"><Label htmlFor="g-ativo">Ativo</Label><Switch id="g-ativo" checked={!!form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
