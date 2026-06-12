import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { api } from '@/integrations/api/client';
import { 
  Search, 
  Building2, 
  Loader2,
  ScanFace,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface EmpresaCliente {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  reconhecimento_facial_ativo?: boolean;
}

interface ReconhecimentoFacialConfigProps {
  onBack?: () => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function ReconhecimentoFacialConfig({ onBack }: ReconhecimentoFacialConfigProps) {
  const { toast } = useToast();
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  
  const [allEmpresas, setAllEmpresas] = useState<EmpresaCliente[]>([]);
  const [empresasClientes, setEmpresasClientes] = useState<EmpresaCliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [activatingAll, setActivatingAll] = useState(false);
  const [deactivatingAll, setDeactivatingAll] = useState(false);

  // Fetch ALL clientes_sst via REST backend
  const loadEmpresasClientes = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      // Buscar clientes SST e configurações de reconhecimento facial em paralelo
      const [clientes, configs] = await Promise.all([
        api.get<any[]>('/sst/clientes').catch(() => [] as any[]),
        api.get<any[]>('/treinamentos/reconhecimento-facial-config').catch(() => [] as any[]),
      ]);

      // Montar mapa de config por cliente_empresa_id (= clientes_sst.id no novo modelo)
      const configMap: Record<string, boolean> = {};
      (configs || []).forEach((c: any) => {
        // cliente_empresa_id referencia o id do registro clientes_sst no novo backend
        configMap[c.cliente_empresa_id] = c.ativo;
      });

      // Mapear dados — ClienteOut: { id, nome, cnpj, ... }
      // nome_fantasia e razao_social colapsam em 'nome' no novo modelo
      const mapped: EmpresaCliente[] = (clientes || []).map((d: any) => ({
        id: d.id,
        nome_fantasia: d.nome || '',
        razao_social: '',
        cnpj: d.cnpj || '',
        reconhecimento_facial_ativo: configMap[d.id] || false,
      }));

      setAllEmpresas(mapped);
    } catch (e) {
      console.error('Erro ao carregar empresas clientes:', e);
      toast({ title: 'Erro ao carregar empresas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [empresaId, toast]);

  // Derive filtered + paginated list from allEmpresas
  const filteredEmpresas = useMemo(() => {
    if (!search.trim()) return allEmpresas;
    const s = search.toLowerCase();
    return allEmpresas.filter(e =>
      e.nome_fantasia.toLowerCase().includes(s) ||
      e.razao_social.toLowerCase().includes(s) ||
      e.cnpj.toLowerCase().includes(s)
    );
  }, [allEmpresas, search]);

  // Update page data whenever filter/page/pageSize changes
  useEffect(() => {
    setTotalCount(filteredEmpresas.length);
    const from = (currentPage - 1) * itemsPerPage;
    setEmpresasClientes(filteredEmpresas.slice(from, from + itemsPerPage));
  }, [filteredEmpresas, currentPage, itemsPerPage]);

  useEffect(() => {
    loadEmpresasClientes();
  }, [loadEmpresasClientes]);

  // Resetar página ao buscar ou mudar tamanho
  useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage]);

  const toggleReconhecimentoFacial = async (clienteEmpresaId: string, ativo: boolean) => {
    if (!empresaId) return;
    setSaving(clienteEmpresaId);
    try {
      // Buscar configuração existente para determinar se é create ou update
      const configs = await api.get<any[]>('/treinamentos/reconhecimento-facial-config').catch(() => [] as any[]);
      const existing = (configs || []).find((c: any) => c.cliente_empresa_id === clienteEmpresaId);

      if (existing) {
        // Atualizar configuração existente
        await api.put(`/treinamentos/reconhecimento-facial-config/${existing.id}`, { ativo });
      } else {
        // Criar nova configuração
        await api.post('/treinamentos/reconhecimento-facial-config', {
          cliente_empresa_id: clienteEmpresaId,
          ativo,
        });
      }

      // Atualizar estado local (allEmpresas drives everything)
      setAllEmpresas(prev =>
        prev.map(e =>
          e.id === clienteEmpresaId
            ? { ...e, reconhecimento_facial_ativo: ativo }
            : e
        )
      );

      toast({
        title: ativo ? 'Reconhecimento facial ativado' : 'Reconhecimento facial desativado',
        description: `Configuração atualizada com sucesso.`
      });
    } catch (e) {
      console.error('Erro ao atualizar configuração:', e);
      toast({ title: 'Erro ao atualizar configuração', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleActivateAll = async () => {
    if (!empresaId) return;
    setActivatingAll(true);
    try {
      // Buscar clientes e configs atuais em paralelo
      const [clientes, configs] = await Promise.all([
        api.get<any[]>('/sst/clientes').catch(() => [] as any[]),
        api.get<any[]>('/treinamentos/reconhecimento-facial-config').catch(() => [] as any[]),
      ]);

      if (!clientes || clientes.length === 0) {
        toast({ title: 'Nenhuma empresa cliente encontrada', variant: 'destructive' });
        return;
      }

      // Para cada cliente, criar ou atualizar configuração (loop client-side com Promise.all)
      const configMap: Record<string, any> = {};
      (configs || []).forEach((c: any) => { configMap[c.cliente_empresa_id] = c; });

      await Promise.all(clientes.map((cliente: any) => {
        const existing = configMap[cliente.id];
        if (existing) {
          return api.put(`/treinamentos/reconhecimento-facial-config/${existing.id}`, { ativo: true });
        } else {
          return api.post('/treinamentos/reconhecimento-facial-config', {
            cliente_empresa_id: cliente.id,
            ativo: true,
          });
        }
      }));

      toast({ title: 'Reconhecimento facial ativado para todas as empresas' });
      loadEmpresasClientes();
    } catch (e) {
      console.error('Erro ao ativar todos:', e);
      toast({ title: 'Erro ao ativar para todas as empresas', variant: 'destructive' });
    } finally {
      setActivatingAll(false);
    }
  };

  const handleDeactivateAll = async () => {
    if (!empresaId) return;
    setDeactivatingAll(true);
    try {
      // Buscar configs ativas e desativar cada uma (loop client-side com Promise.all)
      const configs = await api.get<any[]>('/treinamentos/reconhecimento-facial-config').catch(() => [] as any[]);
      const ativas = (configs || []).filter((c: any) => c.ativo);

      await Promise.all(ativas.map((c: any) =>
        api.put(`/treinamentos/reconhecimento-facial-config/${c.id}`, { ativo: false })
      ));

      toast({ title: 'Reconhecimento facial desativado para todas as empresas' });
      loadEmpresasClientes();
    } catch (e) {
      console.error('Erro ao desativar todos:', e);
      toast({ title: 'Erro ao desativar para todas as empresas', variant: 'destructive' });
    } finally {
      setDeactivatingAll(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  // Card stats from ALL data (not just current page)
  const totalEmpresas = allEmpresas.length;
  const activeCountAll = allEmpresas.filter(e => e.reconhecimento_facial_ativo).length;
  const inactiveCountAll = totalEmpresas - activeCountAll;

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return '-';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ScanFace className="h-5 w-5 text-primary" />
              Reconhecimento Facial
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure quais empresas clientes utilizarão reconhecimento facial para marcação de presença em treinamentos
            </p>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{totalEmpresas}</p>
                <p className="text-sm text-muted-foreground">Empresas Clientes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold text-success">{activeCountAll}</p>
                <p className="text-sm text-muted-foreground">Com Reconhecimento Ativo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <XCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{inactiveCountAll}</p>
                <p className="text-sm text-muted-foreground">Sem Reconhecimento</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleActivateAll}
            disabled={activatingAll || deactivatingAll}
          >
            {activatingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Ativar Todas
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDeactivateAll}
            disabled={activatingAll || deactivatingAll}
          >
            {deactivatingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Desativar Todas
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : empresasClientes.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? 'Nenhuma empresa encontrada com esse filtro' : 'Nenhuma empresa cliente vinculada'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Reconhecimento Facial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresasClientes.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{empresa.nome_fantasia || empresa.razao_social}</p>
                        {empresa.nome_fantasia && empresa.razao_social && (
                          <p className="text-sm text-muted-foreground">{empresa.razao_social}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCNPJ(empresa.cnpj)}
                    </TableCell>
                    <TableCell className="text-center">
                      {empresa.reconhecimento_facial_ativo ? (
                        <Badge className="bg-success/15 text-success hover:bg-success/15">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {saving === empresa.id && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <Switch
                          checked={empresa.reconhecimento_facial_ativo || false}
                          onCheckedChange={(checked) => toggleReconhecimentoFacial(empresa.id, checked)}
                          disabled={saving === empresa.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Mostrando {totalCount === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} empresas
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Linhas:</span>
            <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
