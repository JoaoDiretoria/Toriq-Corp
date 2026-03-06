import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Building2, Check, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Cliente {
  id: string;
  nome: string;
  cnpj?: string | null;
}

interface ClienteSelectorModalProps {
  empresaId: string;
  selectedClienteId: string | null;
  selectedClienteNome?: string | null;
  onSelect: (clienteId: string | null, clienteNome?: string | null) => void;
  trigger?: React.ReactNode;
}

const ITEMS_PER_PAGE = 10;

export function ClienteSelectorModal({ 
  empresaId,
  selectedClienteId, 
  selectedClienteNome,
  onSelect,
  trigger 
}: ClienteSelectorModalProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [displayNome, setDisplayNome] = useState<string | null>(selectedClienteNome || null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce da busca - 300ms
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  // Buscar clientes do banco em tempo real
  const fetchClientes = useCallback(async () => {
    if (!empresaId || !open) return;

    setLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = (supabase as any)
        .from('clientes_sst')
        .select('id, nome, cnpj', { count: 'exact' })
        .eq('empresa_sst_id', empresaId)
        .order('nome', { ascending: true });

      // Aplicar filtro de busca
      if (debouncedSearch.trim()) {
        const termo = debouncedSearch.trim();
        const termoLimpo = termo.replace(/[.\-\/]/g, '');
        
        // Busca por nome OU cnpj
        query = query.or(`nome.ilike.%${termo}%,cnpj.ilike.%${termo}%,cnpj.ilike.%${termoLimpo}%`);
      }

      // Aplicar paginação
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        return;
      }

      setClientes(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, open, currentPage, debouncedSearch]);

  // Buscar quando modal abre ou parâmetros mudam
  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Buscar nome do cliente selecionado se não foi passado
  useEffect(() => {
    if (selectedClienteId && !displayNome) {
      (async () => {
        const { data } = await (supabase as any)
          .from('clientes_sst')
          .select('nome')
          .eq('id', selectedClienteId)
          .single();
        if (data) {
          setDisplayNome(data.nome);
        }
      })();
    }
  }, [selectedClienteId, displayNome]);

  // Atualizar displayNome quando prop muda
  useEffect(() => {
    setDisplayNome(selectedClienteNome || null);
  }, [selectedClienteNome]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSelect = (cliente: Cliente | null) => {
    if (cliente) {
      onSelect(cliente.id, cliente.nome);
      setDisplayNome(cliente.nome);
    } else {
      onSelect(null, null);
      setDisplayNome(null);
    }
    setOpen(false);
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchTerm('');
      setDebouncedSearch('');
      setCurrentPage(1);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between h-10 px-3 font-normal border-border hover:border-primary/50 transition-colors overflow-hidden"
          onClick={() => setOpen(true)}
        >
          <span className={cn(
            "truncate min-w-0",
            !selectedClienteId && "text-muted-foreground"
          )}>
            {displayNome || 'Nenhum'}
          </span>
          <Building2 className="h-4 w-4 shrink-0 ml-2 text-primary/70" />
        </Button>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0 border-primary/20">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Selecionar Cliente
            </DialogTitle>
          </DialogHeader>

          {/* Campo de Busca */}
          <div className="px-4 py-3 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite para buscar por razão social ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 bg-background border-border focus:border-primary"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {loading && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Buscando...
              </div>
            )}
          </div>

          {/* Lista de Clientes */}
          <ScrollArea className="flex-1 min-h-[300px]">
            <div className="p-2 space-y-1">
              {/* Opção Nenhum */}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                  "hover:bg-accent/80",
                  !selectedClienteId && "bg-primary/10 border border-primary/30 shadow-sm"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors",
                  !selectedClienteId ? "border-primary bg-primary" : "border-muted-foreground/30"
                )}>
                  {!selectedClienteId && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className="text-sm text-muted-foreground italic">Nenhum cliente</span>
              </button>

              {/* Lista de Clientes */}
              {!loading && clientes.length === 0 && debouncedSearch ? (
                <div className="py-8 text-center">
                  <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Nenhum cliente encontrado para "{debouncedSearch}"
                  </p>
                </div>
              ) : (
                clientes.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => handleSelect(cliente)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      "hover:bg-accent/80",
                      selectedClienteId === cliente.id && "bg-primary/10 border border-primary/30 shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors shrink-0",
                      selectedClienteId === cliente.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                    )}>
                      {selectedClienteId === cliente.id && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {cliente.nome}
                      </div>
                      {cliente.cnpj && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {cliente.cnpj}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
            <span className="text-xs text-muted-foreground">
              {totalCount.toLocaleString('pt-BR')} cliente{totalCount !== 1 ? 's' : ''}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs px-2 min-w-[70px] text-center font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
