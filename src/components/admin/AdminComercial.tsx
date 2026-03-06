import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TrendingUp, Plus, Loader2, UserPlus, Phone, Mail, DollarSign } from 'lucide-react';

interface Lead {
  id: string;
  nome_lead: string;
  email: string | null;
  telefone: string | null;
  etapa: string;
  valor_estimado: number | null;
  observacoes: string | null;
  empresa_id: string | null;
}

interface Empresa {
  id: string;
  nome: string;
}

const etapas = [
  { id: 'lead', label: 'Lead', color: 'bg-chart-1' },
  { id: 'contato', label: 'Contato', color: 'bg-chart-2' },
  { id: 'proposta', label: 'Proposta', color: 'bg-chart-3' },
  { id: 'fechamento', label: 'Fechamento', color: 'bg-chart-4' },
];

export function AdminComercial() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome_lead: '',
    email: '',
    telefone: '',
    etapa: 'lead',
    valor_estimado: '',
    observacoes: '',
    empresa_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [leadsRes, empresasRes] = await Promise.all([
      supabase.from('comercial_funil').select('*').order('created_at', { ascending: false }),
      supabase.from('empresas').select('id, nome').order('nome'),
    ]);

    if (leadsRes.error) {
      console.error(leadsRes.error);
    } else {
      setLeads(leadsRes.data || []);
    }

    if (!empresasRes.error) {
      setEmpresas(empresasRes.data || []);
    }

    setLoading(false);
  };

  const getLeadsByEtapa = (etapa: string) => {
    return leads.filter((lead) => lead.etapa === etapa);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_lead.trim()) {
      toast.error('Nome do lead é obrigatório');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('comercial_funil').insert({
      nome_lead: formData.nome_lead.trim(),
      email: formData.email.trim() || null,
      telefone: formData.telefone.trim() || null,
      etapa: formData.etapa,
      valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
      observacoes: formData.observacoes.trim() || null,
      empresa_id: formData.empresa_id || null,
    });

    if (error) {
      console.error(error);
      toast.error('Erro ao cadastrar lead');
    } else {
      toast.success('Lead cadastrado com sucesso!');
      setFormData({
        nome_lead: '',
        email: '',
        telefone: '',
        etapa: 'lead',
        valor_estimado: '',
        observacoes: '',
        empresa_id: '',
      });
      setDialogOpen(false);
      fetchData();
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Funil - CLOSER
        </h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {/* Cards por etapa */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {etapas.map((etapa) => {
          const etapaLeads = getLeadsByEtapa(etapa.id);
          return (
            <Card key={etapa.id} className="overflow-hidden">
              <CardHeader className={`${etapa.color} py-3`}>
                <CardTitle className="text-sm font-medium text-card">
                  {etapa.label} ({etapaLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                {etapaLeads.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum lead nesta etapa
                  </p>
                ) : (
                  etapaLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-lg border border-border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm text-card-foreground">{lead.nome_lead}</span>
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                      )}
                      {lead.telefone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {lead.telefone}
                        </div>
                      )}
                      {lead.valor_estimado && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          R$ {lead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para novo lead */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_lead">Nome *</Label>
              <Input
                id="nome_lead"
                value={formData.nome_lead}
                onChange={(e) => setFormData({ ...formData, nome_lead: e.target.value })}
                placeholder="Nome do lead"
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
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
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
                    {etapas.map((etapa) => (
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
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_id">Empresa Vinculada</Label>
              <Select
                value={formData.empresa_id}
                onValueChange={(value) => setFormData({ ...formData, empresa_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações sobre o lead..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
