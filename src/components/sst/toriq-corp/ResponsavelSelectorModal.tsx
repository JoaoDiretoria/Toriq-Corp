import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, Check, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Responsavel {
  id: string;
  nome: string;
  email?: string | null;
  role?: string | null;
  grupo_acesso?: string | null;
}

interface ResponsavelSelectorModalProps {
  empresaId: string;
  selectedResponsavelId: string | null;
  selectedResponsavelNome?: string | null;
  onSelect: (responsavelId: string | null, responsavelNome?: string | null) => void;
  usuariosVisiveis?: string[]; // IDs de usuários que podem ser selecionados (baseado na hierarquia)
  isAdministrador?: boolean; // Se é admin, pode selecionar qualquer um
  currentUserId?: string; // ID do usuário atual para marcar "(Você)"
  disabled?: boolean; // Se o campo está desabilitado (para colaboradores)
  disabledText?: string; // Texto a mostrar quando desabilitado
  allowNone?: boolean; // Se permite selecionar "Nenhum"
  trigger?: React.ReactNode;
}

const ITEMS_PER_PAGE = 10;

export function ResponsavelSelectorModal({ 
  empresaId,
  selectedResponsavelId, 
  selectedResponsavelNome,
  onSelect,
  usuariosVisiveis = [],
  isAdministrador = false,
  currentUserId,
  disabled = false,
  disabledText,
  allowNone = true,
  trigger 
}: ResponsavelSelectorModalProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [displayNome, setDisplayNome] = useState<string | null>(selectedResponsavelNome || null);
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

  // Buscar responsáveis do banco em tempo real
  const fetchResponsaveis = useCallback(async () => {
    if (!empresaId || !open) return;

    setLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = (supabase as any)
        .from('profiles')
        .select('id, nome, email, role, grupo_acesso', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .eq('role', 'empresa_sst') // Apenas usuários da empresa SST (não instrutores/parceiros/clientes)
        .order('nome', { ascending: true });

      // Filtrar por usuários visíveis (baseado na hierarquia)
      // Se não é administrador e tem lista de usuários visíveis, filtrar
      if (!isAdministrador && usuariosVisiveis.length > 0) {
        query = query.in('id', usuariosVisiveis);
      }

      // Aplicar filtro de busca
      if (debouncedSearch.trim()) {
        const termo = debouncedSearch.trim();
        query = query.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`);
      }

      // Aplicar paginação
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar responsáveis:', error);
        return;
      }

      setResponsaveis(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Erro ao buscar responsáveis:', err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, open, currentPage, debouncedSearch, isAdministrador, usuariosVisiveis]);

  // Buscar quando modal abre ou parâmetros mudam
  useEffect(() => {
    fetchResponsaveis();
  }, [fetchResponsaveis]);

  // Buscar nome do responsável selecionado se não foi passado
  useEffect(() => {
    if (selectedResponsavelId && !displayNome) {
      (async () => {
        const { data } = await (supabase as any)
          .from('profiles')
          .select('nome')
          .eq('id', selectedResponsavelId)
          .single();
        if (data) {
          setDisplayNome(data.nome);
        }
      })();
    }
  }, [selectedResponsavelId, displayNome]);

  // Atualizar displayNome quando prop muda
  useEffect(() => {
    setDisplayNome(selectedResponsavelNome || null);
  }, [selectedResponsavelNome]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSelect = (responsavel: Responsavel | null) => {
    if (responsavel) {
      onSelect(responsavel.id, responsavel.nome);
      setDisplayNome(responsavel.nome);
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
    if (disabled) return;
    setOpen(isOpen);
    if (!isOpen) {
      setSearchTerm('');
      setDebouncedSearch('');
      setCurrentPage(1);
    }
  };

  // Se desabilitado, mostrar apenas texto
  if (disabled) {
    return (
      <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
        {disabledText || displayNome || 'Você'}
      </div>
    );
  }

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
            !selectedResponsavelId && "text-muted-foreground"
          )}>
            {displayNome ? (
              <>
                {displayNome}
                {currentUserId && selectedResponsavelId === currentUserId && (
                  <span className="text-muted-foreground ml-1">(Você)</span>
                )}
              </>
            ) : 'Nenhum'}
          </span>
          <User className="h-4 w-4 shrink-0 ml-2 text-primary/70" />
        </Button>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0 border-primary/20">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Selecionar Responsável
            </DialogTitle>
          </DialogHeader>

          {/* Campo de Busca */}
          <div className="px-4 py-3 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite para buscar por nome ou email..."
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

          {/* Lista de Responsáveis */}
          <ScrollArea className="flex-1 min-h-[300px]">
            <div className="p-2 space-y-1">
              {/* Opção Nenhum (apenas para administradores ou se permitido) */}
              {allowNone && isAdministrador && (
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                    "hover:bg-accent/80",
                    !selectedResponsavelId && "bg-primary/10 border border-primary/30 shadow-sm"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors",
                    !selectedResponsavelId ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}>
                    {!selectedResponsavelId && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="text-sm text-muted-foreground italic">Nenhum responsável</span>
                </button>
              )}

              {/* Lista de Responsáveis */}
              {!loading && responsaveis.length === 0 && debouncedSearch ? (
                <div className="py-8 text-center">
                  <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Nenhum responsável encontrado para "{debouncedSearch}"
                  </p>
                </div>
              ) : (
                responsaveis.map((responsavel) => (
                  <button
                    key={responsavel.id}
                    type="button"
                    onClick={() => handleSelect(responsavel)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      "hover:bg-accent/80",
                      selectedResponsavelId === responsavel.id && "bg-primary/10 border border-primary/30 shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors shrink-0",
                      selectedResponsavelId === responsavel.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                    )}>
                      {selectedResponsavelId === responsavel.id && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        <span>{responsavel.nome}</span>
                        {currentUserId && responsavel.id === currentUserId && (
                          <span className="text-muted-foreground font-normal">(Você)</span>
                        )}
                        {/* Badges de Role e Grupo de Acesso */}
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          {responsavel.grupo_acesso && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium",
                              responsavel.grupo_acesso === 'administrador' && "bg-red-500/20 text-red-400",
                              responsavel.grupo_acesso === 'gestor' && "bg-blue-500/20 text-blue-400",
                              responsavel.grupo_acesso === 'colaborador' && "bg-green-500/20 text-green-400"
                            )}>
                              {responsavel.grupo_acesso === 'administrador' ? 'Admin' : 
                               responsavel.grupo_acesso === 'gestor' ? 'Gestor' : 
                               responsavel.grupo_acesso === 'colaborador' ? 'Colab' : responsavel.grupo_acesso}
                            </span>
                          )}
                        </div>
                      </div>
                      {responsavel.email && (
                        <div className="text-xs text-muted-foreground truncate">
                          {responsavel.email}
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
              {totalCount.toLocaleString('pt-BR')} usuário{totalCount !== 1 ? 's' : ''}
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
