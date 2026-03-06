import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Search, X, Calendar, User, Tag, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsavelSelectorModal } from './ResponsavelSelectorModal';

export type TipoFiltroData = 'criacao' | 'previsao' | 'atividade';

export interface FunilFiltersProps {
  etapas: Array<{ id: string; nome: string; cor: string }>;
  responsaveis: Array<{ id: string; nome: string }>;
  etiquetas?: Array<{ id: string; nome: string; cor: string }>;
  searchTerm: string;
  filterEtapa: string;
  filterResponsavel: string;
  filterResponsavelNome?: string | null;
  filterPrioridade: string;
  filterDataInicio: Date | undefined;
  filterDataFim: Date | undefined;
  filterTipoData: TipoFiltroData;
  filterEtiqueta?: string;
  onSearchChange: (value: string) => void;
  onEtapaChange: (value: string) => void;
  onResponsavelChange: (value: string, nome?: string | null) => void;
  onPrioridadeChange: (value: string) => void;
  // Props para o modal de responsável
  empresaId?: string;
  usuariosVisiveis?: string[];
  isAdministrador?: boolean;
  currentUserId?: string;
  onDataInicioChange: (value: Date | undefined) => void;
  onDataFimChange: (value: Date | undefined) => void;
  onTipoDataChange: (value: TipoFiltroData) => void;
  onEtiquetaChange?: (value: string) => void;
  onClearFilters: () => void;
  totalCards: number;
  filteredCount: number;
  showEtiquetas?: boolean;
  compact?: boolean;
  responsaveisVisiveisIds?: string[];
}

const PRIORIDADES = [
  { value: 'todas', label: 'Todas' },
  { value: 'baixa', label: 'Baixa', color: 'bg-gray-500' },
  { value: 'media', label: 'Média', color: 'bg-blue-500' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-500' },
  { value: 'urgente', label: 'Urgente', color: 'bg-destructive' },
];

const TIPOS_DATA = [
  { value: 'criacao', label: 'Criação' },
  { value: 'previsao', label: 'Previsão' },
  { value: 'atividade', label: 'Atividade' },
];

export function FunilFilters({
  etapas,
  responsaveis,
  etiquetas = [],
  searchTerm,
  filterEtapa,
  filterResponsavel,
  filterResponsavelNome,
  filterPrioridade,
  filterDataInicio,
  filterDataFim,
  filterEtiqueta = 'todas',
  filterTipoData,
  onSearchChange,
  onEtapaChange,
  onResponsavelChange,
  onPrioridadeChange,
  onDataInicioChange,
  onDataFimChange,
  onTipoDataChange,
  onEtiquetaChange,
  onClearFilters,
  totalCards,
  filteredCount,
  showEtiquetas = true,
  empresaId,
  usuariosVisiveis = [],
  isAdministrador = false,
  currentUserId,
}: FunilFiltersProps) {
  const hasActiveFilters = 
    searchTerm !== '' ||
    filterEtapa !== 'todas' ||
    filterResponsavel !== 'todos' ||
    filterPrioridade !== 'todas' ||
    filterDataInicio !== undefined ||
    filterDataFim !== undefined ||
    (filterEtiqueta !== 'todas' && showEtiquetas);

  return (
    <div className="mb-3 border rounded-lg bg-card p-3">
      {/* Linha única com todos os filtros inline */}
      <div className="flex items-end gap-2 flex-wrap">
        {/* Busca */}
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground mb-0.5">Buscar</span>
          <div className="relative w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Título, cliente..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => onSearchChange('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Contador */}
        <Badge variant={hasActiveFilters ? 'default' : 'secondary'} className="h-8 text-xs self-end">
          {filteredCount === totalCards ? `${totalCards} cards` : `${filteredCount} de ${totalCards}`}
        </Badge>

        {/* Separador */}
        <div className="h-8 w-px bg-border self-end" />

        {/* Etapa */}
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground mb-0.5">Etapa</span>
          <Select value={filterEtapa} onValueChange={onEtapaChange}>
            <SelectTrigger className="h-8 w-auto min-w-[120px] max-w-[280px] text-xs">
              <Layers className="h-3 w-3 mr-1.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate"><SelectValue placeholder="Etapa" /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas etapas</SelectItem>
              {etapas.map((etapa) => (
                <SelectItem key={etapa.id} value={etapa.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: etapa.cor }} />
                    {etapa.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Responsável - Usando Modal com paginação e busca */}
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground mb-0.5">Responsável</span>
          {empresaId ? (
            <ResponsavelSelectorModal
              empresaId={empresaId}
              selectedResponsavelId={filterResponsavel === 'todos' || filterResponsavel === 'sem_responsavel' ? null : filterResponsavel}
              selectedResponsavelNome={filterResponsavelNome}
              onSelect={(id, nome) => {
                if (id === null) {
                  onResponsavelChange('todos', null);
                } else {
                  onResponsavelChange(id, nome);
                }
              }}
              usuariosVisiveis={usuariosVisiveis}
              isAdministrador={isAdministrador}
              currentUserId={currentUserId}
              allowNone={true}
              trigger={
                <Button variant="outline" className="h-8 w-auto min-w-[100px] max-w-[180px] text-xs justify-between px-2">
                  <User className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">
                    {filterResponsavel === 'todos' ? 'Todos' : 
                     filterResponsavel === 'sem_responsavel' ? 'Sem responsável' : 
                     filterResponsavelNome || 'Selecionar'}
                  </span>
                </Button>
              }
            />
          ) : (
            <Select value={filterResponsavel} onValueChange={(v) => onResponsavelChange(v, null)}>
              <SelectTrigger className="h-8 w-auto min-w-[100px] max-w-[160px] text-xs">
                <User className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sem_responsavel">Sem responsável</SelectItem>
                {responsaveis.map((resp) => (
                  <SelectItem key={resp.id} value={resp.id}>{resp.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Prioridade */}
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground mb-0.5">Prioridade</span>
          <Select value={filterPrioridade} onValueChange={onPrioridadeChange}>
            <SelectTrigger className="h-8 w-auto min-w-[90px] text-xs">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              {PRIORIDADES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2">
                    {p.color && <div className={`w-2 h-2 rounded-full ${p.color}`} />}
                    {p.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Separador */}
        <div className="h-8 w-px bg-border self-end" />

        {/* Tipo de Data */}
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground mb-0.5">Tipo Data</span>
          <Select value={filterTipoData} onValueChange={(v) => onTipoDataChange(v as TipoFiltroData)}>
            <SelectTrigger className="h-8 w-auto min-w-[90px] text-xs">
              <Calendar className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DATA.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Data Início */}
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground mb-0.5">Data Início</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`h-8 w-[110px] text-xs justify-start ${!filterDataInicio && 'text-muted-foreground'}`}>
                {filterDataInicio ? format(filterDataInicio, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
              </Button>
            </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent mode="single" selected={filterDataInicio} onSelect={onDataInicioChange} locale={ptBR} />
            {filterDataInicio && (
              <div className="p-2 border-t">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => onDataInicioChange(undefined)}>Limpar</Button>
              </div>
            )}
          </PopoverContent>
          </Popover>
        </div>

        {/* Data Fim */}
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground mb-0.5">Data Fim</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`h-8 w-[110px] text-xs justify-start ${!filterDataFim && 'text-muted-foreground'}`}>
                {filterDataFim ? format(filterDataFim, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={filterDataFim} onSelect={onDataFimChange} locale={ptBR} />
              {filterDataFim && (
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => onDataFimChange(undefined)}>Limpar</Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Etiqueta */}
        {showEtiquetas && etiquetas.length > 0 && onEtiquetaChange && (
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground mb-0.5">Etiqueta</span>
            <Select value={filterEtiqueta} onValueChange={onEtiquetaChange}>
              <SelectTrigger className="h-8 w-auto min-w-[100px] max-w-[150px] text-xs">
                <Tag className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="Etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="sem_etiqueta">Sem etiqueta</SelectItem>
                {etiquetas.map((etiqueta) => (
                  <SelectItem key={etiqueta.id} value={etiqueta.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: etiqueta.cor }} />
                      {etiqueta.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Limpar */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}

// Hook para gerenciar estado dos filtros
export function useFunilFilters(responsaveisVisiveisIds?: string[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('todas');
  const [filterResponsavel, setFilterResponsavel] = useState('todos');
  const [filterResponsavelNome, setFilterResponsavelNome] = useState<string | null>(null);
  const [filterPrioridade, setFilterPrioridade] = useState('todas');
  const [filterDataInicio, setFilterDataInicio] = useState<Date | undefined>(undefined);
  const [filterDataFim, setFilterDataFim] = useState<Date | undefined>(undefined);
  const [filterTipoData, setFilterTipoData] = useState<TipoFiltroData>('criacao');
  const [filterEtiqueta, setFilterEtiqueta] = useState('todas');
  
  const clearFilters = () => {
    setSearchTerm('');
    setFilterEtapa('todas');
    setFilterResponsavel('todos');
    setFilterResponsavelNome(null);
    setFilterPrioridade('todas');
    setFilterDataInicio(undefined);
    setFilterDataFim(undefined);
    setFilterTipoData('criacao');
    setFilterEtiqueta('todas');
  };
  
  // Função para filtrar cards
  const filterCards = <T extends {
    titulo: string;
    cliente?: { nome: string } | null;
    etapa_id: string;
    responsavel_id: string | null;
    prioridade: string;
    data_previsao: string | null;
    created_at?: string | null;
    atividades?: Array<{ prazo: string | null }>;
    etiquetas?: Array<{ id: string }>;
  }>(cards: T[], idsResponsaveisVisiveis?: string[]): T[] => {
    return cards.filter(card => {
      // Filtro de busca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTitulo = card.titulo.toLowerCase().includes(term);
        const matchesCliente = card.cliente?.nome?.toLowerCase().includes(term);
        if (!matchesTitulo && !matchesCliente) return false;
      }
      
      // Filtro por etapa
      if (filterEtapa !== 'todas' && card.etapa_id !== filterEtapa) {
        return false;
      }
      
      // Filtro por responsável
      if (filterResponsavel !== 'todos') {
        if (filterResponsavel === 'sem_responsavel' && card.responsavel_id) {
          return false;
        }
        if (filterResponsavel !== 'sem_responsavel' && card.responsavel_id !== filterResponsavel) {
          return false;
        }
      } else if (idsResponsaveisVisiveis && idsResponsaveisVisiveis.length > 0) {
        // Quando "Todos" está selecionado, filtrar apenas pelos responsáveis visíveis pela hierarquia
        // Inclui cards sem responsável ou com responsável na lista de visíveis
        if (card.responsavel_id && !idsResponsaveisVisiveis.includes(card.responsavel_id)) {
          return false;
        }
      }
      
      // Filtro por prioridade
      if (filterPrioridade !== 'todas' && card.prioridade !== filterPrioridade) {
        return false;
      }
      
      // Filtro por data (baseado no tipo selecionado)
      if (filterDataInicio || filterDataFim) {
        let dateToCheck: Date | null = null;
        
        if (filterTipoData === 'criacao') {
          // Filtrar por data de criação do card
          if (card.created_at) {
            dateToCheck = new Date(card.created_at);
          }
        } else if (filterTipoData === 'previsao') {
          // Filtrar por data de previsão do card
          if (card.data_previsao) {
            dateToCheck = new Date(card.data_previsao);
          }
        } else if (filterTipoData === 'atividade') {
          // Filtrar por cards que têm atividades no período
          if (card.atividades && card.atividades.length > 0) {
            const hasAtividadeNoPeriodo = card.atividades.some(ativ => {
              if (!ativ.prazo) return false;
              const ativDate = new Date(ativ.prazo);
              const afterStart = !filterDataInicio || ativDate >= filterDataInicio;
              const beforeEnd = !filterDataFim || ativDate <= filterDataFim;
              return afterStart && beforeEnd;
            });
            if (!hasAtividadeNoPeriodo) return false;
            // Se encontrou atividade no período, passa no filtro de data
            dateToCheck = null; // Não precisa verificar mais
          }
        }
        
        // Verificar data (exceto para atividades que já foram verificadas)
        if (filterTipoData !== 'atividade' || !card.atividades?.length) {
          if (!dateToCheck) return false;
          if (filterDataInicio && dateToCheck < filterDataInicio) return false;
          if (filterDataFim && dateToCheck > filterDataFim) return false;
        }
      }
      
      // Filtro por etiqueta
      if (filterEtiqueta !== 'todas') {
        if (filterEtiqueta === 'sem_etiqueta') {
          if (card.etiquetas && card.etiquetas.length > 0) return false;
        } else {
          if (!card.etiquetas?.some(e => e.id === filterEtiqueta)) return false;
        }
      }
      
      return true;
    });
  };
  
  return {
    // Estados
    searchTerm,
    filterEtapa,
    filterResponsavel,
    filterResponsavelNome,
    filterPrioridade,
    filterDataInicio,
    filterDataFim,
    filterTipoData,
    filterEtiqueta,
    
    // Setters
    setSearchTerm,
    setFilterEtapa,
    setFilterResponsavel,
    setFilterResponsavelNome,
    setFilterPrioridade,
    setFilterDataInicio,
    setFilterDataFim,
    setFilterTipoData,
    setFilterEtiqueta,
    
    // Ações
    clearFilters,
    filterCards,
  };
}
