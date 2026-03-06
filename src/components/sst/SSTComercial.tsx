import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, User, ArrowRight } from 'lucide-react';

interface Lead {
  id: string;
  nome_lead: string;
  email: string | null;
  telefone: string | null;
  etapa: string;
  valor_estimado: number | null;
  observacoes: string | null;
}

const etapas = [
  { id: 'lead', label: 'Lead', color: 'bg-blue-500' },
  { id: 'contato', label: 'Contato', color: 'bg-yellow-500' },
  { id: 'proposta', label: 'Proposta', color: 'bg-purple-500' },
  { id: 'fechamento', label: 'Fechamento', color: 'bg-green-500' },
];

export function SSTComercial() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome_lead: '',
    email: '',
    telefone: '',
    etapa: 'lead',
    valor_estimado: '',
    observacoes: '',
  });

  const fetchLeads = async () => {
    if (!empresa?.id) return;

    const { data, error } = await supabase
      .from('comercial_funil')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar leads",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [empresa?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa?.id) return;

    const { error } = await supabase
      .from('comercial_funil')
      .insert({
        empresa_id: empresa.id,
        nome_lead: formData.nome_lead,
        email: formData.email || null,
        telefone: formData.telefone || null,
        etapa: formData.etapa,
        valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
        observacoes: formData.observacoes || null,
      });

    if (error) {
      toast({
        title: "Erro ao cadastrar lead",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Lead cadastrado",
        description: "O lead foi adicionado com sucesso.",
      });
      setDialogOpen(false);
      setFormData({
        nome_lead: '',
        email: '',
        telefone: '',
        etapa: 'lead',
        valor_estimado: '',
        observacoes: '',
      });
      fetchLeads();
    }
  };

  const handleChangeEtapa = async (leadId: string, novaEtapa: string) => {
    const { error } = await supabase
      .from('comercial_funil')
      .update({ etapa: novaEtapa })
      .eq('id', leadId);

    if (error) {
      toast({
        title: "Erro ao atualizar etapa",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Etapa atualizada",
        description: "O lead foi movido para a nova etapa.",
      });
      fetchLeads();
    }
  };

  const getLeadsByEtapa = (etapa: string) => leads.filter(lead => lead.etapa === etapa);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Comercial</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_lead">Nome do Lead *</Label>
                <Input
                  id="nome_lead"
                  value={formData.nome_lead}
                  onChange={(e) => setFormData({ ...formData, nome_lead: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="etapa">Etapa</Label>
                  <Select
                    value={formData.etapa}
                    onValueChange={(value) => setFormData({ ...formData, etapa: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {etapas.map(etapa => (
                        <SelectItem key={etapa.id} value={etapa.id}>
                          {etapa.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_estimado">Valor Estimado (R$)</Label>
                  <Input
                    id="valor_estimado"
                    type="number"
                    step="0.01"
                    value={formData.valor_estimado}
                    onChange={(e) => setFormData({ ...formData, valor_estimado: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {etapas.map((etapa) => (
          <Card key={etapa.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{etapa.label}</CardTitle>
                <Badge variant="secondary">{getLeadsByEtapa(etapa.id).length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {getLeadsByEtapa(etapa.id).map((lead) => (
                <div
                  key={lead.id}
                  className="p-3 bg-muted rounded-lg space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{lead.nome_lead}</span>
                  </div>
                  {lead.valor_estimado && (
                    <p className="text-sm text-muted-foreground">
                      R$ {lead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                  {etapa.id !== 'fechamento' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-xs"
                      onClick={() => {
                        const currentIndex = etapas.findIndex(e => e.id === etapa.id);
                        const nextEtapa = etapas[currentIndex + 1];
                        if (nextEtapa) {
                          handleChangeEtapa(lead.id, nextEtapa.id);
                        }
                      }}
                    >
                      Avançar <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              ))}
              {getLeadsByEtapa(etapa.id).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum lead
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
