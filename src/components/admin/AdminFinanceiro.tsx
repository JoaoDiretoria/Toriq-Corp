import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DollarSign, Plus, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conta {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  empresa_id: string | null;
}

interface Empresa {
  id: string;
  nome: string;
}

export function AdminFinanceiro() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    tipo: 'pagar',
    descricao: '',
    valor: '',
    vencimento: '',
    status: 'pendente',
    empresa_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [contasRes, empresasRes] = await Promise.all([
      supabase.from('financeiro_contas').select('*').order('vencimento'),
      supabase.from('empresas').select('id, nome').order('nome'),
    ]);

    if (contasRes.error) {
      console.error(contasRes.error);
    } else {
      setContas(contasRes.data || []);
    }

    if (!empresasRes.error) {
      setEmpresas(empresasRes.data || []);
    }

    setLoading(false);
  };

  const getEmpresaNome = (empresaId: string | null) => {
    if (!empresaId) return '-';
    const empresa = empresas.find((e) => e.id === empresaId);
    return empresa?.nome || '-';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-chart-4 text-card">Pago</Badge>;
      case 'pendente':
        return <Badge variant="outline" className="border-chart-2 text-chart-2">Pendente</Badge>;
      case 'cancelado':
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoIcon = (tipo: string) => {
    if (tipo === 'receber') {
      return <ArrowUpCircle className="h-4 w-4 text-chart-4" />;
    }
    return <ArrowDownCircle className="h-4 w-4 text-destructive" />;
  };

  const filteredContas = contas.filter((conta) => {
    if (filterEmpresa !== 'all' && conta.empresa_id !== filterEmpresa) return false;
    if (filterStatus !== 'all' && conta.status !== filterStatus) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao.trim() || !formData.valor || !formData.vencimento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('financeiro_contas').insert({
      tipo: formData.tipo,
      descricao: formData.descricao.trim(),
      valor: parseFloat(formData.valor),
      vencimento: formData.vencimento,
      status: formData.status,
      empresa_id: formData.empresa_id || null,
    });

    if (error) {
      console.error(error);
      toast.error('Erro ao cadastrar conta');
    } else {
      toast.success('Conta cadastrada com sucesso!');
      setFormData({
        tipo: 'pagar',
        descricao: '',
        valor: '',
        vencimento: '',
        status: 'pendente',
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
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Contas Financeiras
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Empresa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma conta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredContas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTipoIcon(conta.tipo)}
                        <span className="capitalize">{conta.tipo === 'pagar' ? 'A Pagar' : 'A Receber'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{conta.descricao}</TableCell>
                    <TableCell>
                      R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(conta.vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(conta.status)}</TableCell>
                    <TableCell>{getEmpresaNome(conta.empresa_id)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para nova conta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Conta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagar">A Pagar</SelectItem>
                    <SelectItem value="receber">A Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da conta"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$) *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vencimento">Vencimento *</Label>
                <Input
                  id="vencimento"
                  type="date"
                  value={formData.vencimento}
                  onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_id">Empresa</Label>
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
