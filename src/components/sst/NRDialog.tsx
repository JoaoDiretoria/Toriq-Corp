import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


interface NormaRegulamentadora {
  id: string;
  empresa_id: string;
  nr: string;
  descricao: string | null;
  termo?: string | null;
  numero_documento?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface NRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  norma: NormaRegulamentadora | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const NRDialog = ({
  open,
  onOpenChange,
  norma,
  onSuccess,
  onCancel,
}: NRDialogProps) => {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nr: '',
    descricao: '',
    termo: '',
    numero_documento: '',
  });

  useEffect(() => {
    if (norma) {
      setFormData({
        nr: norma.nr,
        descricao: norma.descricao || '',
        termo: norma.termo || '',
        numero_documento: norma.numero_documento || '',
      });
    } else {
      setFormData({
        nr: '',
        descricao: '',
        termo: '',
        numero_documento: '',
      });
    }
  }, [norma, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaId) {
      toast({
        title: 'Erro',
        description: 'Empresa não identificada.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.nr.trim()) {
      toast({
        title: 'Erro',
        description: 'O número da NR é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (norma) {
        // Update
        const { error } = await supabase
          .from('normas_regulamentadoras')
          .update({
            nr: formData.nr.trim(),
            descricao: formData.descricao.trim() || null,
            termo: formData.termo || null,
            numero_documento: formData.numero_documento.trim() || null,
          })
          .eq('id', norma.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'NR atualizada com sucesso.',
        });
      } else {
        // Insert
        const { error } = await supabase.from('normas_regulamentadoras').insert({
          empresa_id: empresaId,
          nr: formData.nr.trim(),
          descricao: formData.descricao.trim() || null,
          termo: formData.termo || null,
          numero_documento: formData.numero_documento.trim() || null,
        });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: 'Erro',
              description: 'Esta NR já está cadastrada.',
              variant: 'destructive',
            });
            return;
          }
          throw error;
        }

        toast({
          title: 'Sucesso',
          description: 'NR cadastrada com sucesso.',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar NR:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a NR.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{norma ? 'Editar NR' : 'Nova NR'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nr">Número da NR *</Label>
            <Input
              id="nr"
              placeholder="Ex: 05, 10, 33"
              value={formData.nr}
              onChange={(e) => setFormData({ ...formData, nr: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Nome da NR"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="termo">Termo</Label>
            <Select
              value={formData.termo}
              onValueChange={(value) => setFormData({ ...formData, termo: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o termo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Portaria">Portaria</SelectItem>
                <SelectItem value="NBR">NBR</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_documento">Número da Portaria/NBR/IT</Label>
            <Input
              id="numero_documento"
              placeholder="Número do documento"
              value={formData.numero_documento}
              onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
