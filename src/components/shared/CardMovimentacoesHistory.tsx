import { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowRight, 
  ArrowRightLeft, 
  Plus, 
  Pencil, 
  Loader2,
  History
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCardMovimentacoes, CardMovimentacao } from '@/hooks/useCardMovimentacoes';

interface CardMovimentacoesHistoryProps {
  cardId: string;
  cardTipo: 'funil' | 'prospeccao' | 'closer' | 'pos_venda' | 'cross_selling' | 'contas_receber';
  origemCardId?: string;
  origemKanban?: string;
  closerCardId?: string;
  className?: string;
  maxHeight?: string;
}

const TIPO_ICONS: Record<string, any> = {
  criacao: Plus,
  mudanca_coluna: ArrowRightLeft,
  mudanca_etapa: ArrowRightLeft,
  mudanca_kanban: ArrowRight,
  encaminhamento: ArrowRight,
  edicao: Pencil,
};

const TIPO_COLORS: Record<string, string> = {
  criacao: 'bg-teal-100 text-teal-700',
  mudanca_coluna: 'bg-indigo-100 text-indigo-700',
  mudanca_etapa: 'bg-indigo-100 text-indigo-700',
  mudanca_kanban: 'bg-purple-100 text-purple-700',
  encaminhamento: 'bg-purple-100 text-purple-700',
  edicao: 'bg-gray-100 text-gray-700',
};

export function CardMovimentacoesHistory({ 
  cardId, 
  cardTipo, 
  origemCardId,
  origemKanban,
  closerCardId,
  className = '',
  maxHeight = '300px'
}: CardMovimentacoesHistoryProps) {
  const { movimentacoes, loading, fetchMovimentacoes, fetchMovimentacoesContasReceber } = useCardMovimentacoes();

  useEffect(() => {
    if (cardId) {
      // Para Contas a Receber, usar função especial que busca toda a cadeia
      if (cardTipo === 'contas_receber') {
        fetchMovimentacoesContasReceber(cardId, closerCardId, origemCardId, origemKanban);
      } else {
        fetchMovimentacoes(cardId, cardTipo, origemCardId, origemKanban);
      }
    }
  }, [cardId, cardTipo, origemCardId, origemKanban, closerCardId, fetchMovimentacoes, fetchMovimentacoesContasReceber]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (movimentacoes.length === 0) {
    return (
      <div className={`text-center py-4 text-muted-foreground text-sm ${className}`}>
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhuma movimentação registrada</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-y-auto pr-1 ${className}`} style={{ maxHeight }}>
      {/* Linha vertical de conexão */}
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
      
      <div className="space-y-3">
        {movimentacoes.map((mov) => (
          <MovimentacaoItem key={mov.id} movimentacao={mov} />
        ))}
      </div>
    </div>
  );
}

interface MovimentacaoItemProps {
  movimentacao: CardMovimentacao;
}

function MovimentacaoItem({ movimentacao: mov }: MovimentacaoItemProps) {
  const Icon = TIPO_ICONS[mov.tipo] || ArrowRightLeft;
  const colorClass = TIPO_COLORS[mov.tipo] || TIPO_COLORS.edicao;

  const kanbanMudou = mov.kanban_origem && mov.kanban_destino && mov.kanban_origem !== mov.kanban_destino;
  
  // Determinar o funil onde a movimentação ocorreu
  const funilMovimentacao = mov.kanban_destino || mov.kanban_origem || 'Desconhecido';

  return (
    <div className="relative flex gap-3 pl-1">
      {/* Indicador */}
      <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon className="h-3 w-3" />
      </div>
      
      {/* Conteúdo */}
      <div className="flex-1 min-w-0 pb-3">
        {/* Linha 1: Descrição */}
        <p className="text-sm">{mov.descricao}</p>
        
        {/* Linha 2: Funil + Colunas */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Badge do Funil - sempre visível */}
          {kanbanMudou ? (
            <>
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                {mov.kanban_origem}
              </Badge>
              <ArrowRight className="h-3 w-3 text-purple-500" />
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                {mov.kanban_destino}
              </Badge>
            </>
          ) : (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
              {funilMovimentacao}
            </Badge>
          )}
          
          {/* Colunas de origem e destino */}
          {mov.coluna_origem_nome && (
            <Badge variant="outline" className="text-xs">
              {mov.coluna_origem_nome}
            </Badge>
          )}
          {mov.coluna_origem_nome && mov.coluna_destino_nome && (
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          )}
          {mov.coluna_destino_nome && (
            <Badge variant="outline" className="text-xs">
              {mov.coluna_destino_nome}
            </Badge>
          )}
        </div>
        
        {/* Linha 3: Data/hora e usuário */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="font-medium">
            {format(new Date(mov.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
          {mov.usuario?.nome && (
            <>
              <span>•</span>
              <span>Por: {mov.usuario.nome}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CardMovimentacoesHistory;
