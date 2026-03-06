import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Briefcase,
  GraduationCap,
  Users,
  DollarSign,
  HardHat,
  Car,
  Settings,
  Activity,
  Heart,
  Wrench,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notificacao } from '@/hooks/useNotificacoes';

interface NotificationItemProps {
  notificacao: Notificacao;
  onClick?: (notificacao: Notificacao) => void;
  onMarcarLida?: (id: string) => void;
}

const tipoIcones = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const categoriaIcones: Record<string, any> = {
  comercial: Briefcase,
  treinamento: GraduationCap,
  cadastro: Users,
  financeiro: DollarSign,
  epi: HardHat,
  frota: Car,
  sistema: Settings,
  atividade: Activity,
  saude: Heart,
  tecnico: Wrench,
  equipamento: Wrench,
};

const tipoCores = {
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    dot: 'bg-blue-500',
  },
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
    dot: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    dot: 'bg-amber-500',
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-100',
    dot: 'bg-red-500',
  },
};

const categoriaCores: Record<string, string> = {
  comercial: 'bg-purple-50 text-purple-700',
  treinamento: 'bg-blue-50 text-blue-700',
  cadastro: 'bg-slate-50 text-slate-700',
  financeiro: 'bg-emerald-50 text-emerald-700',
  epi: 'bg-orange-50 text-orange-700',
  frota: 'bg-cyan-50 text-cyan-700',
  sistema: 'bg-gray-50 text-gray-700',
  atividade: 'bg-pink-50 text-pink-700',
  saude: 'bg-rose-50 text-rose-700',
  tecnico: 'bg-indigo-50 text-indigo-700',
  equipamento: 'bg-teal-50 text-teal-700',
};

export function NotificationItem({ notificacao, onClick, onMarcarLida }: NotificationItemProps) {
  const cores = tipoCores[notificacao.tipo] || tipoCores.info;
  const CategoriaIcone = categoriaIcones[notificacao.categoria] || Bell;
  const categoriaCor = categoriaCores[notificacao.categoria] || categoriaCores.sistema;

  const handleClick = () => {
    if (onClick) {
      onClick(notificacao);
    }
    if (!notificacao.lida && onMarcarLida) {
      onMarcarLida(notificacao.id);
    }
  };

  const handleMarcarLida = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarcarLida) {
      onMarcarLida(notificacao.id);
    }
  };

  const tempoRelativo = formatDistanceToNow(new Date(notificacao.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex gap-3 p-4 cursor-pointer transition-colors duration-200 bg-white',
        'hover:bg-gray-50 border-b border-gray-100'
      )}
    >
      {/* Ícone da categoria */}
      <div className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
        cores.bg
      )}>
        <CategoriaIcone className={cn('h-5 w-5', cores.text)} />
        
        {/* Indicador de não lida */}
        {!notificacao.lida && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white',
            'bg-primary'
          )} />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Título e ação */}
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm leading-tight',
            !notificacao.lida ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
          )}>
            {notificacao.titulo}
          </p>
          
          {/* Botão marcar como lida */}
          {!notificacao.lida && (
            <button
              onClick={handleMarcarLida}
              className={cn(
                'opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all',
                'hover:bg-primary/10 text-muted-foreground hover:text-primary'
              )}
              title="Marcar como lida"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mensagem */}
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {notificacao.mensagem}
        </p>

        {/* Metadados */}
        <div className="flex items-center gap-2 pt-1">
          {/* Badge da categoria */}
          <span className={cn(
            'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
            categoriaCor
          )}>
            {notificacao.categoria}
          </span>
          
          {/* Tempo */}
          <span className="text-[10px] text-gray-500">
            {tempoRelativo}
          </span>
          
          {/* Usuário */}
          {notificacao.usuario_nome && notificacao.usuario_nome !== 'Sistema' && (
            <>
              <span className="text-[10px] text-gray-400">•</span>
              <span className="text-[10px] text-gray-500 truncate max-w-[100px]">
                {notificacao.usuario_nome}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
