import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Search, GraduationCap, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface Treinamento {
  id: string;
  nome: string;
  norma: string;
  ch_formacao: number;
  ch_reciclagem: number;
  ch_formacao_obrigatoria: boolean;
  ch_reciclagem_obrigatoria: boolean;
}

interface TreinamentoSearchPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  onSelect: (treinamento: Treinamento) => void;
  selectedId?: string;
}

const ITEMS_PER_PAGE = 10;

export function TreinamentoSearchPopup({ 
  open, 
  onOpenChange, 
  empresaId, 
  onSelect,
  selectedId 
}: TreinamentoSearchPopupProps) {
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const debouncedSearch = useDebounce(search, 300);

  const fetchTreinamentos = useCallback(async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const db = supabase as any;
      
      // Calcular offset
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      // Query base
      let query = db
        .from('catalogo_treinamentos')
        .select('id, nome, norma, ch_formacao, ch_reciclagem, ch_formacao_obrigatoria, ch_reciclagem_obrigatoria', { count: 'exact' })
        .eq('empresa_id', empresaId);
      
      // Aplicar busca se houver termo
      if (debouncedSearch.trim()) {
        query = query.or(`nome.ilike.%${debouncedSearch}%,norma.ilike.%${debouncedSearch}%`);
      }
      
      // Ordenar e paginar
      query = query.order('norma', { ascending: true }).order('nome', { ascending: true }).range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Ordenar numericamente por NR
      const treinamentosFormatados: Treinamento[] = (data || []).map((t: any) => ({
        id: t.id,
        nome: t.nome,
        norma: t.norma,
        ch_formacao: t.ch_formacao || 0,
        ch_reciclagem: t.ch_reciclagem || 0,
        ch_formacao_obrigatoria: t.ch_formacao_obrigatoria || false,
        ch_reciclagem_obrigatoria: t.ch_reciclagem_obrigatoria || false
      }));
      
      // Ordenar numericamente por NR
      treinamentosFormatados.sort((a, b) => {
        const numA = parseInt(a.norma, 10) || 0;
        const numB = parseInt(b.norma, 10) || 0;
        if (numA !== numB) return numA - numB;
        return a.nome.localeCompare(b.nome);
      });
      
      setTreinamentos(treinamentosFormatados);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar treinamentos:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, debouncedSearch, currentPage]);

  useEffect(() => {
    if (open) {
      fetchTreinamentos();
    }
  }, [open, fetchTreinamentos]);

  // Resetar página ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSelect = (treinamento: Treinamento) => {
    onSelect(treinamento);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Buscar Treinamento
          </DialogTitle>
        </DialogHeader>
        
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou NR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        
        {/* Lista de treinamentos */}
        <div className="flex-1 overflow-auto min-h-[300px] max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : treinamentos.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? 'Nenhum treinamento encontrado' : 'Nenhum treinamento cadastrado'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {treinamentos.map((treinamento) => (
                <button
                  key={treinamento.id}
                  onClick={() => handleSelect(treinamento)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
                    selectedId === treinamento.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded">
                      NR {treinamento.norma}
                    </span>
                    <span className="font-medium">{treinamento.nome}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Formação: {treinamento.ch_formacao}h</span>
                    <span>Reciclagem: {treinamento.ch_reciclagem}h</span>
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
              {totalCount} treinamento{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
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
