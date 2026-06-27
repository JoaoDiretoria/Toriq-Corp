import { useState } from 'react';
import { vendasInstagramApi } from '@/integrations/api/vendasInstagram';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

export function InstagramPublicar({ open, onOpenChange, onPublicado }: {
  open: boolean; onOpenChange: (v: boolean) => void; onPublicado?: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  const reset = () => { setFiles([]); setCaption(''); };

  const submit = async () => {
    if (files.length === 0) { toast.error('Escolha ao menos 1 mídia'); return; }
    setSending(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      form.append('caption', caption);
      await vendasInstagramApi.publicar(form);
      toast.success('Publicação enviada — acompanhe o status');
      reset();
      onOpenChange(false);
      onPublicado?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao publicar';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />Publicar post
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ig-files">Mídias (1 = foto/reel · 2+ = carrossel)</Label>
            <input
              id="ig-files"
              type="file"
              accept="image/jpeg,image/png,video/mp4,video/quicktime"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">{files.length} arquivo(s) selecionado(s)</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ig-cap">Legenda</Label>
            <Textarea
              id="ig-cap"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Escreva a legenda…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={sending}>
            {sending ? 'Enviando…' : 'Publicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
