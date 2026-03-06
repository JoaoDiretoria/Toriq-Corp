import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Clock, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Config {
  id: string;
  frequencia_diaria: number;
  horarios_disparo: string[];
  ativo: boolean;
}

interface Props {
  onBack: () => void;
}

export default function AdminNewsletterConfig({ onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [frequencia, setFrequencia] = useState(1);
  const [horarios, setHorarios] = useState<string[]>(['09:00']);
  const [ativo, setAtivo] = useState(true);
  const [novoHorario, setNovoHorario] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('newsletter_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig(data);
        setFrequencia(data.frequencia_diaria);
        setHorarios(data.horarios_disparo || ['09:00']);
        setAtivo(data.ativo);
      }
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        frequencia_diaria: frequencia,
        horarios_disparo: horarios,
        ativo,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        const { error } = await (supabase as any)
          .from('newsletter_config')
          .update(data)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('newsletter_config')
          .insert(data);

        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso');
      onBack();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const addHorario = () => {
    if (!novoHorario) return;
    if (horarios.includes(novoHorario)) {
      toast.error('Este horário já foi adicionado');
      return;
    }
    setHorarios([...horarios, novoHorario].sort());
    setNovoHorario('');
  };

  const removeHorario = (horario: string) => {
    if (horarios.length === 1) {
      toast.error('É necessário ter pelo menos um horário');
      return;
    }
    setHorarios(horarios.filter(h => h !== horario));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Configurações da Newsletter</h2>
            <p className="text-muted-foreground">
              Configure a frequência e horários de disparo automático
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-2xl">
        <div className="bg-card border rounded-lg p-6 space-y-6">
          {/* Ativo */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Disparo Automático</Label>
              <p className="text-sm text-muted-foreground">
                Ativar envio automático de newsletters agendadas
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          <div className="border-t pt-6">
            {/* Frequência */}
            <div className="space-y-2 mb-6">
              <Label>Frequência Diária</Label>
              <Select value={String(frequencia)} onValueChange={(v) => setFrequencia(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 vez ao dia</SelectItem>
                  <SelectItem value="2">2 vezes ao dia</SelectItem>
                  <SelectItem value="3">3 vezes ao dia</SelectItem>
                  <SelectItem value="4">4 vezes ao dia</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Quantas vezes por dia a newsletter será enviada
              </p>
            </div>

            {/* Horários */}
            <div className="space-y-4">
              <Label>Horários de Disparo</Label>
              
              <div className="flex flex-wrap gap-2">
                {horarios.map((horario) => (
                  <div
                    key={horario}
                    className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full"
                  >
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{horario}</span>
                    <button
                      onClick={() => removeHorario(horario)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  type="time"
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  className="w-40"
                />
                <Button variant="outline" onClick={addHorario} disabled={!novoHorario}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Newsletters agendadas serão enviadas nestes horários
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="border-t pt-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Como funciona?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Conteúdos com status "Agendado" serão enviados automaticamente</li>
                <li>• O sistema verifica os horários configurados e envia as newsletters pendentes</li>
                <li>• Cada conteúdo é enviado apenas uma vez</li>
                <li>• Você pode enviar manualmente a qualquer momento</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
