import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X, Filter, Check, Clock, DollarSign, Tag, Layers, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProdutoServico {
  id: string;
  nome: string;
  codigo: string | null;
  preco: number | null;
  descricao: string | null;
  tipo: 'produto' | 'servico';
  carga_horaria: number | null;
  ch_formacao: number | null;
  ch_reciclagem: number | null;
  treinamento_id?: string | null;
  natureza_id?: string | null;
  classificacao_id?: string | null;
  forma_cobranca_id?: string | null;
  categoria?: {
    id: string;
    nome: string;
    cor: string;
  };
  classificacao?: {
    id: string;
    nome: string;
  };
  forma_cobranca?: {
    id: string;
    nome: string;
  };
  treinamento?: {
    id: string;
    nome: string;
    norma: string | null;
  };
}

interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

interface Classificacao {
  id: string;
  nome: string;
}

interface FormaCobranca {
  id: string;
  nome: string;
}

interface TreinamentoSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoServico[];
  categorias?: Categoria[];
  classificacoes?: Classificacao[];
  formasCobranca?: FormaCobranca[];
  onSelect: (produto: ProdutoServico) => void;
  selectedId?: string;
}

const fmtBRL = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Formatar NR com zero à esquerda (5 -> 05, 10 -> 10)
const formatNR = (norma: string | null | undefined): string => {
  if (!norma) return '';
  const num = parseInt(norma, 10);
  if (isNaN(num)) return `NR-${norma}`;
  return `NR-${num.toString().padStart(2, '0')}`;
};

// Extrair número da NR para ordenação
const getNRNumber = (norma: string | null | undefined): number => {
  if (!norma) return 999; // Sem NR vai pro final
  const num = parseInt(norma, 10);
  return isNaN(num) ? 999 : num;
};

export function TreinamentoSelectorModal({
  open,
  onOpenChange,
  produtos,
  categorias = [],
  classificacoes = [],
  formasCobranca = [],
  onSelect,
  selectedId,
}: TreinamentoSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtros
  const [filtroNatureza, setFiltroNatureza] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [filtroClassificacao, setFiltroClassificacao] = useState<string>('todos');
  const [filtroFormaCobranca, setFiltroFormaCobranca] = useState<string>('todos');
  const [filtroNorma, setFiltroNorma] = useState<string>('todos');

  // Extrair categorias únicas dos produtos se não fornecidas
  const categoriasUnicas = useMemo(() => {
    if (categorias.length > 0) return categorias;
    const cats = new Map<string, Categoria>();
    produtos.forEach(p => {
      if (p.categoria) {
        cats.set(p.categoria.id, p.categoria);
      }
    });
    return Array.from(cats.values());
  }, [produtos, categorias]);

  // Extrair classificações únicas dos produtos se não fornecidas
  const classificacoesUnicas = useMemo(() => {
    if (classificacoes.length > 0) return classificacoes;
    const cls = new Map<string, Classificacao>();
    produtos.forEach(p => {
      if (p.classificacao) {
        cls.set(p.classificacao.id, p.classificacao);
      }
    });
    return Array.from(cls.values());
  }, [produtos, classificacoes]);

  // Extrair formas de cobrança únicas dos produtos se não fornecidas
  const formasCobrancaUnicas = useMemo(() => {
    if (formasCobranca.length > 0) return formasCobranca;
    const fcs = new Map<string, FormaCobranca>();
    produtos.forEach(p => {
      if (p.forma_cobranca) {
        fcs.set(p.forma_cobranca.id, p.forma_cobranca);
      }
    });
    return Array.from(fcs.values());
  }, [produtos, formasCobranca]);

  // Extrair normas únicas dos produtos e ordenar numericamente
  const normasUnicas = useMemo(() => {
    const normas = new Set<string>();
    produtos.forEach(p => {
      if (p.treinamento?.norma) {
        normas.add(p.treinamento.norma);
      }
    });
    return Array.from(normas).sort((a, b) => getNRNumber(a) - getNRNumber(b));
  }, [produtos]);

  // Filtrar e ordenar produtos
  const produtosFiltrados = useMemo(() => {
    const filtered = produtos.filter(p => {
      // Filtro de busca por texto (inclui norma)
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        p.nome.toLowerCase().includes(searchLower) ||
        (p.codigo && p.codigo.toLowerCase().includes(searchLower)) ||
        (p.descricao && p.descricao.toLowerCase().includes(searchLower)) ||
        (p.categoria?.nome && p.categoria.nome.toLowerCase().includes(searchLower)) ||
        (p.treinamento?.norma && p.treinamento.norma.toLowerCase().includes(searchLower));

      // Filtro de natureza (produto/serviço)
      const matchNatureza = filtroNatureza === 'todos' || p.tipo === filtroNatureza;

      // Filtro de categoria
      const matchCategoria = filtroCategoria === 'todos' || p.categoria?.id === filtroCategoria;

      // Filtro de classificação
      const matchClassificacao = filtroClassificacao === 'todos' || p.classificacao_id === filtroClassificacao;

      // Filtro de forma de cobrança
      const matchFormaCobranca = filtroFormaCobranca === 'todos' || p.forma_cobranca_id === filtroFormaCobranca;

      // Filtro de norma
      const matchNorma = filtroNorma === 'todos' || p.treinamento?.norma === filtroNorma;

      return matchSearch && matchNatureza && matchCategoria && matchClassificacao && matchFormaCobranca && matchNorma;
    });

    // Ordenar por NR (numérico) + Nome (A-Z)
    return filtered.sort((a, b) => {
      const nrA = getNRNumber(a.treinamento?.norma);
      const nrB = getNRNumber(b.treinamento?.norma);
      if (nrA !== nrB) return nrA - nrB;
      return a.nome.localeCompare(b.nome);
    });
  }, [produtos, searchTerm, filtroNatureza, filtroCategoria, filtroClassificacao, filtroFormaCobranca, filtroNorma]);

  // Limpar filtros
  const limparFiltros = () => {
    setSearchTerm('');
    setFiltroNatureza('todos');
    setFiltroCategoria('todos');
    setFiltroClassificacao('todos');
    setFiltroFormaCobranca('todos');
    setFiltroNorma('todos');
  };

  // Contar filtros ativos
  const filtrosAtivos = [
    filtroNatureza !== 'todos',
    filtroCategoria !== 'todos',
    filtroClassificacao !== 'todos',
    filtroFormaCobranca !== 'todos',
    filtroNorma !== 'todos',
  ].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Selecionar Treinamento / Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Barra de busca e filtros */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="h-4 w-4" />
                {filtrosAtivos > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {filtrosAtivos}
                  </span>
                )}
              </Button>
            </div>

            {/* Filtros expandidos */}
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-muted/30 rounded-lg border">
                <div className="space-y-1">
                  <Label className="text-xs">NR / Norma</Label>
                  <Select value={filtroNorma} onValueChange={setFiltroNorma}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {normasUnicas.map(norma => (
                        <SelectItem key={norma} value={norma}>{formatNR(norma)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Natureza</Label>
                  <Select value={filtroNatureza} onValueChange={setFiltroNatureza}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="produto">Produto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {categoriasUnicas.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.cor }} />
                            {cat.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Classificação</Label>
                  <Select value={filtroClassificacao} onValueChange={setFiltroClassificacao}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {classificacoesUnicas.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Forma de Cobrança</Label>
                  <Select value={filtroFormaCobranca} onValueChange={setFiltroFormaCobranca}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {formasCobrancaUnicas.map(fc => (
                        <SelectItem key={fc.id} value={fc.id}>{fc.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filtrosAtivos > 0 && (
                  <div className="col-span-full">
                    <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-xs">
                      <X className="h-3 w-3 mr-1" />
                      Limpar filtros ({filtrosAtivos})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contador de resultados */}
          <div className="text-sm text-muted-foreground">
            {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'resultado' : 'resultados'} encontrado{produtosFiltrados.length !== 1 ? 's' : ''}
          </div>

          {/* Lista de produtos */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6" style={{ maxHeight: 'calc(85vh - 280px)' }}>
            <div className="space-y-2 pb-4">
              {produtosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum treinamento encontrado</p>
                  <p className="text-xs mt-1">Tente ajustar os filtros ou termo de busca</p>
                </div>
              ) : (
                produtosFiltrados.map(produto => {
                  const isSelected = produto.id === selectedId;
                  
                  return (
                    <Card 
                      key={produto.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isSelected 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "hover:border-primary/50"
                      )}
                      onClick={() => {
                        onSelect(produto);
                        onOpenChange(false);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* NR + Nome */}
                            <div className="flex items-center gap-2 mb-1">
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                              <h4 className="font-medium text-sm truncate">
                                {produto.treinamento?.norma && (
                                  <span className="text-primary font-bold">{formatNR(produto.treinamento.norma)} - </span>
                                )}
                                {produto.nome}
                              </h4>
                            </div>

                            {/* Badges de informação */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {/* NR Badge */}
                              {produto.treinamento?.norma && (
                                <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
                                  {formatNR(produto.treinamento.norma)}
                                </Badge>
                              )}

                              {/* Natureza */}
                              <Badge variant={produto.tipo === 'servico' ? 'secondary' : 'default'} className="text-[10px]">
                                {produto.tipo === 'servico' ? 'Serviço' : 'Produto'}
                              </Badge>

                              {/* Categoria */}
                              {produto.categoria && (
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px]"
                                  style={{ borderColor: produto.categoria.cor, color: produto.categoria.cor }}
                                >
                                  <Tag className="h-2.5 w-2.5 mr-1" />
                                  {produto.categoria.nome}
                                </Badge>
                              )}

                              {/* Classificação */}
                              {produto.classificacao && (
                                <Badge variant="outline" className="text-[10px]">
                                  <Layers className="h-2.5 w-2.5 mr-1" />
                                  {produto.classificacao.nome}
                                </Badge>
                              )}

                              {/* Forma de cobrança */}
                              {produto.forma_cobranca && (
                                <Badge variant="outline" className="text-[10px]">
                                  <DollarSign className="h-2.5 w-2.5 mr-1" />
                                  {produto.forma_cobranca.nome}
                                </Badge>
                              )}
                            </div>

                            {/* Descrição */}
                            {produto.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {produto.descricao}
                              </p>
                            )}
                          </div>

                          {/* Informações de preço e carga horária */}
                          <div className="text-right flex-shrink-0 space-y-1">
                            {produto.preco != null && produto.preco > 0 && (
                              <div className="text-sm font-bold text-primary">
                                {fmtBRL(produto.preco)}
                              </div>
                            )}
                            
                            <div className="flex flex-col gap-0.5">
                              {produto.ch_formacao != null && produto.ch_formacao > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>Formação: {produto.ch_formacao}h</span>
                                </div>
                              )}
                              {produto.ch_reciclagem != null && produto.ch_reciclagem > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>Reciclagem: {produto.ch_reciclagem}h</span>
                                </div>
                              )}
                              {!produto.ch_formacao && !produto.ch_reciclagem && produto.carga_horaria != null && produto.carga_horaria > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{produto.carga_horaria}h</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
