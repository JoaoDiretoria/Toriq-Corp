import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  X, 
  ArrowRight,
  Keyboard,
  Building2,
  Briefcase,
  GraduationCap,
  Shield,
  Settings,
  User,
  FolderPlus,
  CheckSquare,
  FileSignature,
  Building,
  DollarSign,
  TrendingUp,
  ClipboardList,
  Receipt,
  Wallet,
  FileText,
  CalendarDays,
  FileCheck,
  BookOpen,
  Grid3X3,
  Users,
  ListChecks,
  UserCheck,
  Package,
  HardHat,
  Car,
  UsersRound,
  Headphones,
  GitBranch,
  Palette,
  Bell,
  Key,
  Layers,
  Tags,
  Zap,
  FileType,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapeamento de ícones
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2, User, Settings, FolderPlus, Briefcase, CheckSquare, TrendingUp,
  FileSignature, ClipboardList, DollarSign, Receipt, Wallet, FileText,
  GraduationCap, CalendarDays, FileCheck, BookOpen, Grid3X3, Users, ListChecks,
  UserCheck, Building, Shield, Package, HardHat, Car, UsersRound, Headphones,
  GitBranch, Palette, Bell, Key, Layers, Tags, Zap, FileType, Search, Globe, Keyboard
};

export interface TelaItem {
  id: string;
  nome: string;
  icone: string;
  categoria: string;
  descricao?: string;
}

interface QuickSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (telaId: string) => void;
  telas?: TelaItem[];
}

// Atalhos padrão do sistema
export const DEFAULT_SHORTCUTS = {
  quickSearch: { key: 's', alt: true, ctrl: false, label: 'Busca Rápida' },
};

// Carregar atalhos do localStorage
export const getShortcuts = () => {
  try {
    const saved = localStorage.getItem('system-shortcuts');
    return saved ? { ...DEFAULT_SHORTCUTS, ...JSON.parse(saved) } : DEFAULT_SHORTCUTS;
  } catch {
    return DEFAULT_SHORTCUTS;
  }
};

// Salvar atalhos no localStorage
export const saveShortcuts = (shortcuts: typeof DEFAULT_SHORTCUTS) => {
  localStorage.setItem('system-shortcuts', JSON.stringify(shortcuts));
};

export function QuickSearch({ isOpen, onClose, onNavigate, telas = [] }: QuickSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Carregar buscas recentes
  useEffect(() => {
    try {
      const saved = localStorage.getItem('quick-search-recent');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  // Focar input ao abrir
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filtrar telas
  const filteredTelas = telas.filter(tela => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tela.nome.toLowerCase().includes(term) ||
      tela.categoria.toLowerCase().includes(term) ||
      tela.id.toLowerCase().includes(term) ||
      (tela.descricao && tela.descricao.toLowerCase().includes(term))
    );
  });

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredTelas.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredTelas[selectedIndex]) {
            handleSelect(filteredTelas[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredTelas, onClose]);

  // Scroll para item selecionado
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = (tela: TelaItem) => {
    // Salvar nas buscas recentes
    const newRecent = [tela.id, ...recentSearches.filter(r => r !== tela.id)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('quick-search-recent', JSON.stringify(newRecent));
    
    onNavigate(tela.id);
    onClose();
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || FileText;
    return Icon;
  };

  // Criar/reutilizar container dedicado no final do body para ficar acima de tudo
  const portalContainer = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let el = document.getElementById('quick-search-portal') as HTMLDivElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'quick-search-portal';
      el.style.position = 'relative';
      el.style.zIndex = '2147483647';
      document.body.appendChild(el);
    }
    // Garantir que está sempre no final do body
    if (el.parentElement && el !== el.parentElement.lastElementChild) {
      document.body.appendChild(el);
    }
    portalContainer.current = el;
    return () => {};
  }, [isOpen]);

  if (!isOpen) return null;

  const shortcuts = getShortcuts();

  return createPortal(
    <div 
      className="fixed inset-0 flex items-start justify-center pt-[15vh]"
      style={{ zIndex: 2147483647, isolation: 'isolate' }}
      onClick={onClose}
    >
      {/* Backdrop com blur */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* Modal de Busca */}
      <div 
        className="relative w-full max-w-2xl mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header com Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Buscar telas, módulos..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-base"
            autoComplete="off"
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-xs text-muted-foreground">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Lista de Resultados */}
        <div 
          ref={listRef}
          className="max-h-[400px] overflow-y-auto scrollbar-always-visible"
        >
          {filteredTelas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">Nenhuma tela encontrada</p>
              <p className="text-xs mt-1">Tente buscar por outro termo</p>
            </div>
          ) : (
            <div className="py-2">
              {/* Seção de Resultados */}
              <div className="px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {searchTerm ? `${filteredTelas.length} resultado${filteredTelas.length !== 1 ? 's' : ''}` : 'Telas Disponíveis'}
                </span>
              </div>
              
              {filteredTelas.map((tela, index) => {
                const Icon = getIcon(tela.icone);
                const isSelected = index === selectedIndex;
                
                return (
                  <div
                    key={tela.id}
                    data-index={index}
                    onClick={() => handleSelect(tela)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer transition-all duration-150",
                      isSelected 
                        ? "bg-primary/10 border border-primary/20" 
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    {/* Ícone */}
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                      isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium truncate",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {tela.nome}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">
                          {tela.categoria}
                        </span>
                        {tela.descricao && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {tela.descricao}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Ação */}
                    {isSelected && (
                      <div className="flex items-center gap-2 text-primary">
                        <span className="text-xs">Abrir</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer com Atalhos */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-[10px]">↑</kbd>
              <kbd className="inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-[10px]">↓</kbd>
              <span>navegar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-[10px]">Enter</kbd>
              <span>abrir</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-[10px]">Esc</kbd>
              <span>fechar</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Keyboard className="h-3.5 w-3.5" />
            <span>Alt+S para buscar</span>
          </div>
        </div>
      </div>
    </div>,
    portalContainer.current || document.body
  );
}

// Hook para usar o QuickSearch globalmente
export function useQuickSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcuts = getShortcuts();
      const qs = shortcuts.quickSearch;
      
      // Verificar se o atalho corresponde
      const altMatch = qs.alt ? e.altKey : !e.altKey;
      const ctrlMatch = qs.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const keyMatch = e.key.toLowerCase() === qs.key.toLowerCase();
      
      if (altMatch && ctrlMatch && keyMatch) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(prev => !prev);
      }
    };

    // Usar capture para garantir que o evento seja capturado antes de outros handlers
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
