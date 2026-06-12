import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/integrations/api/client';
import { Search, Building2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface Cliente {
  id: string;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  municipio: string;
  uf: string;
}

interface ClienteSearchPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  onSelect: (cliente: Cliente) => void;
  selectedId?: string;
}

const ITEMS_PER_PAGE = 10;

export function ClienteSearchPopup({ 
  open, 
  onOpenChange, 
  empresaId, 
  onSelect,
  selectedId 
}: ClienteSearchPopupProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const debouncedSearch = useDebounce(search, 300);

  const fetchClientes = useCallback(async () => {
    if (!empresaId) return;

    setLoading(true);
    try {
      // GET /sst/clientes — backend escopa por empresa_sst_id do token
      const todos = await api.get<any[]>('/sst/clientes').catch(() => [] as any[]);

      // Mapear para o shape esperado pela UI
      // NOTA (migração): os campos razao_social, municipio e uf vinham de um JOIN
      // com a tabela `empresas` (cliente_empresa_id) que o backend não expõe ainda.
      // cnpj vem diretamente de clientes_sst.cnpj; municipio/uf ficam vazios até
      // o endpoint retornar esses dados.
      let clientesFormatados: Cliente[] = (todos || []).map((c: any) => ({
        id: c.id,
        nome: c.nome,
        razao_social: undefined,
        cnpj: c.cnpj,
        municipio: '',
        uf: ''
      }));

      // Aplicar filtro de busca no cliente (o endpoint retorna todos sem filtro)
      if (debouncedSearch.trim()) {
        const termo = debouncedSearch.trim().toLowerCase();
        clientesFormatados = clientesFormatados.filter((c) =>
          c.nome.toLowerCase().includes(termo) ||
          (c.cnpj && c.cnpj.toLowerCase().includes(termo))
        );
      }

      // Ordenar clientes de A-Z pelo nome
      clientesFormatados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      // Calcular total e fatia de página
      const total = clientesFormatados.length;
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const paginados = clientesFormatados.slice(from, from + ITEMS_PER_PAGE);

      setClientes(paginados);
      setTotalCount(total);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, debouncedSearch, currentPage]);

  useEffect(() => {
    if (open) {
      fetchClientes();
    }
  }, [open, fetchClientes]);

  // Resetar página ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return '';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSelect = (cliente: Cliente) => {
    onSelect(cliente);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Buscar Cliente
          </DialogTitle>
        </DialogHeader>
        
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, razão social ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        
        {/* Lista de clientes */}
        <div className="flex-1 overflow-auto min-h-[300px] max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {clientes.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => handleSelect(cliente)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
                    selectedId === cliente.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-transparent'
                  }`}
                >
                  <div className="font-medium">{cliente.nome}</div>
                  {cliente.razao_social && cliente.razao_social !== cliente.nome && (
                    <div className="text-sm text-muted-foreground">{cliente.razao_social}</div>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    {cliente.cnpj && (
                      <span className="font-mono">{formatCNPJ(cliente.cnpj)}</span>
                    )}
                    {cliente.municipio && cliente.uf && (
                      <span>{cliente.municipio}/{cliente.uf}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {totalCount} cliente{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
