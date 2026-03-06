import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import { format } from 'date-fns';

interface Conta {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
}

export function ClienteFinanceiro() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  useEffect(() => {
    const fetchContas = async () => {
      if (!empresa?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('financeiro_contas')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('vencimento', { ascending: true });

      if (error) {
        toast({
          title: "Erro ao carregar contas",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setContas(data || []);
      }
      setLoading(false);
    };

    fetchContas();
  }, [empresa?.id, toast]);

  const filteredContas = contas.filter(conta =>
    statusFilter === 'todos' || conta.status === statusFilter
  );

  const totalPagar = contas
    .filter(c => c.tipo === 'pagar' && c.status === 'pendente')
    .reduce((acc, c) => acc + c.valor, 0);

  const totalReceber = contas
    .filter(c => c.tipo === 'receber' && c.status === 'pendente')
    .reduce((acc, c) => acc + c.valor, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline">Pendente</Badge>;
      case 'pago':
        return <Badge className="bg-green-500 hover:bg-green-600">Pago</Badge>;
      case 'atrasado':
        return <Badge variant="destructive">Atrasado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Acompanhe suas contas a pagar e receber</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              R$ {totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">Contas pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">
              R$ {totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">Valores pendentes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Minhas Contas
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {filteredContas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma conta encontrada
              </p>
            ) : (
              filteredContas.map((conta) => (
                <div key={conta.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{conta.descricao}</p>
                      <Badge variant={conta.tipo === 'pagar' ? 'destructive' : 'default'} className="mt-1">
                        {conta.tipo === 'pagar' ? 'A Pagar' : 'A Receber'}
                      </Badge>
                    </div>
                    {getStatusBadge(conta.status)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Vence: {format(new Date(conta.vencimento), 'dd/MM/yyyy')}
                    </span>
                    <span className="font-semibold">
                      R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma conta encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContas.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell>
                        <Badge variant={conta.tipo === 'pagar' ? 'destructive' : 'default'}>
                          {conta.tipo === 'pagar' ? 'A Pagar' : 'A Receber'}
                        </Badge>
                      </TableCell>
                      <TableCell>{conta.descricao}</TableCell>
                      <TableCell>
                        R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(conta.vencimento), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{getStatusBadge(conta.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
