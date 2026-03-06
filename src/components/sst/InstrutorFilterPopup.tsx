import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface InstrutorFiltro {
  id: string;
  nome: string;
  cpf: string | null;
  formacoes: string[];
}

interface InstrutorFilterPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  onSelect: (instrutorId: string, instrutorNome: string) => void;
  selectedId?: string;
}

const ITEMS_PER_PAGE = 10;

export function InstrutorFilterPopup({ 
  open, 
  onOpenChange, 
  empresaId, 
  onSelect,
  selectedId 
}: InstrutorFilterPopupProps) {
  const [instrutores, setInstrutores] = useState<InstrutorFiltro[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Estado temporário para seleção (só aplica quando clicar em Filtrar)
  const [tempSelectedId, setTempSelectedId] = useState<string>(selectedId || 'todos');
  const [tempSelectedNome, setTempSelectedNome] = useState<string>('Todos');
  
  const debouncedSearch = useDebounce(search, 300);
  
  // Sincronizar estado temporário quando o popup abre
  useEffect(() => {
    if (open) {
      setTempSelectedId(selectedId || 'todos');
      // Definir nome baseado no ID
      if (selectedId === 'todos' || !selectedId) {
        setTempSelectedNome('Todos');
      } else if (selectedId === 'com') {
        setTempSelectedNome('Com Instrutor');
      } else if (selectedId === 'sem') {
        setTempSelectedNome('Sem Instrutor');
      }
    }
  }, [open, selectedId]);

  const fetchInstrutores = useCallback(async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const db = supabase as any;
      
      // Buscar instrutores que estão vinculados a turmas da empresa
      // Primeiro, buscar IDs únicos de instrutores das turmas
      const { data: turmasData } = await db
        .from('turmas_treinamento')
        .select('instrutor_id')
        .eq('empresa_id', empresaId)
        .not('instrutor_id', 'is', null);
      
      const instrutorIdsFromTurmas = [...new Set((turmasData || []).map((t: any) => t.instrutor_id))];
      
      if (instrutorIdsFromTurmas.length === 0) {
        setInstrutores([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      
      // Buscar dados dos instrutores
      let query = db
        .from('instrutores')
        .select(`
          id, 
          nome,
          cpf_cnpj,
          instrutor_formacoes(nome)
        `)
        .in('id', instrutorIdsFromTurmas)
        .eq('ativo', true);
      
      // Aplicar busca se houver termo
      if (debouncedSearch.trim()) {
        const searchTerm = debouncedSearch.trim().toLowerCase();
        // Buscar por nome ou CPF
        query = query.or(`nome.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`);
      }
      
      // Ordenar por nome A-Z
      query = query.order('nome', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Formatar instrutores
      let instrutoresFormatados: InstrutorFiltro[] = (data || []).map((i: any) => ({
        id: i.id,
        nome: i.nome,
        cpf: i.cpf_cnpj,
        formacoes: (i.instrutor_formacoes || []).map((f: any) => f.nome).filter(Boolean)
      }));
      
      // Se tem busca por formação, filtrar também
      if (debouncedSearch.trim()) {
        const searchTerm = debouncedSearch.trim().toLowerCase();
        instrutoresFormatados = instrutoresFormatados.filter(i => 
          i.nome.toLowerCase().includes(searchTerm) ||
          (i.cpf && i.cpf.includes(searchTerm)) ||
          i.formacoes.some(f => f.toLowerCase().includes(searchTerm))
        );
      }
      
      // Ordenar de A-Z
      instrutoresFormatados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      
      setTotalCount(instrutoresFormatados.length);
      
      // Aplicar paginação
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE;
      setInstrutores(instrutoresFormatados.slice(from, to));
      
    } catch (error) {
      console.error('Erro ao buscar instrutores:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, debouncedSearch, currentPage]);

  useEffect(() => {
    if (open) {
      fetchInstrutores();
    }
  }, [open, fetchInstrutores]);

  // Resetar página ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cpf;
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Seleção temporária (não aplica ainda)
  const handleSelect = (instrutor: InstrutorFiltro) => {
    setTempSelectedId(instrutor.id);
    setTempSelectedNome(instrutor.nome);
  };

  const handleSelectTodos = () => {
    setTempSelectedId('todos');
    setTempSelectedNome('Todos');
  };

  const handleSelectComInstrutor = () => {
    setTempSelectedId('com');
    setTempSelectedNome('Com Instrutor');
  };

  const handleSelectSemInstrutor = () => {
    setTempSelectedId('sem');
    setTempSelectedNome('Sem Instrutor');
  };
  
  // Aplicar filtro (botão Filtrar)
  const handleAplicarFiltro = () => {
    onSelect(tempSelectedId, tempSelectedNome);
    onOpenChange(false);
  };
  
  // Resetar filtro (botão Resetar)
  const handleResetarFiltro = () => {
    setTempSelectedId('todos');
    setTempSelectedNome('Todos');
    onSelect('todos', 'Todos');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Filtrar por Instrutor
          </DialogTitle>
        </DialogHeader>
        
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou formação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        
        {/* Opções rápidas */}
        <div className="space-y-1 border-b pb-3">
          {/* Opção "Todos" */}
          <button
            onClick={handleSelectTodos}
            className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
              tempSelectedId === 'todos' || !tempSelectedId
                ? 'border-primary bg-primary/5' 
                : 'border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">Todos</div>
              {(tempSelectedId === 'todos' || !tempSelectedId) && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </button>
          
          {/* Opção "Com Instrutor" */}
          <button
            onClick={handleSelectComInstrutor}
            className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
              tempSelectedId === 'com'
                ? 'border-primary bg-primary/5' 
                : 'border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">Com Instrutor</div>
              {tempSelectedId === 'com' && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">Turmas que possuem instrutor vinculado</div>
          </button>
          
          {/* Opção "Sem Instrutor" */}
          <button
            onClick={handleSelectSemInstrutor}
            className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
              tempSelectedId === 'sem'
                ? 'border-primary bg-primary/5' 
                : 'border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">Sem Instrutor</div>
              {tempSelectedId === 'sem' && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">Turmas sem instrutor vinculado</div>
          </button>
        </div>
        
        {/* Lista de instrutores específicos */}
        <div className="text-xs text-muted-foreground font-medium pt-2">Filtrar por instrutor específico:</div>
        <div className="flex-1 overflow-auto min-h-[250px] max-h-[350px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : instrutores.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? 'Nenhum instrutor encontrado' : 'Nenhum instrutor vinculado a turmas'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {instrutores.map((instrutor) => (
                <button
                  key={instrutor.id}
                  onClick={() => handleSelect(instrutor)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
                    tempSelectedId === instrutor.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{instrutor.nome}</div>
                    {tempSelectedId === instrutor.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    {instrutor.cpf && (
                      <span className="font-mono">{formatCPF(instrutor.cpf)}</span>
                    )}
                  </div>
                  {instrutor.formacoes.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      Formações: {instrutor.formacoes.slice(0, 3).join(', ')}
                      {instrutor.formacoes.length > 3 && ` +${instrutor.formacoes.length - 3}`}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {totalCount} instrutor{totalCount !== 1 ? 'es' : ''} encontrado{totalCount !== 1 ? 's' : ''}
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
        
        {/* Botões de ação */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t mt-2">
          <Button
            variant="outline"
            onClick={handleResetarFiltro}
          >
            Resetar
          </Button>
          <Button
            onClick={handleAplicarFiltro}
            className="bg-primary hover:bg-primary/90"
          >
            Aplicar Filtro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
