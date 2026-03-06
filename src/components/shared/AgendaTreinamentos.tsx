import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CalendarDays, 
  List, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Building2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  MapPin
} from 'lucide-react';

export interface AulaAgendada {
  id: string;
  data: string;
  inicio: string;
  fim: string;
  horas: number;
}

export interface TurmaAgenda {
  id: string;
  codigo_turma?: string;
  numero_turma?: number;
  cliente_nome: string;
  treinamento_nome: string;
  treinamento_norma?: string;
  tipo_treinamento?: string;
  horario?: string;
  local?: string;
  quantidade_participantes: number;
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
  aulas: AulaAgendada[];
  validado?: boolean;
}

interface AgendaTreinamentosProps {
  turmas: TurmaAgenda[];
  loading?: boolean;
  onTurmaClick?: (turma: TurmaAgenda) => void;
  showSearch?: boolean;
  title?: string;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function AgendaTreinamentos({ 
  turmas, 
  loading = false, 
  onTurmaClick,
  showSearch = true,
  title = 'Agenda de Treinamentos'
}: AgendaTreinamentosProps) {
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTurmas = turmas.filter(turma =>
    turma.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    turma.treinamento_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEnterTurma = (turma: TurmaAgenda): boolean => {
    // Turmas agendadas ou canceladas não podem ser acessadas
    if (turma.status === 'agendado' || turma.status === 'cancelado') {
      return false;
    }
    return true;
  };

  const getStatusBadge = (status: string, validado?: boolean) => {
    if (validado) {
      return (
        <Badge className="bg-success/10 text-success hover:bg-success/10">
          <CheckCircle className="h-3 w-3 mr-1" />
          Validado
        </Badge>
      );
    }
    
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      agendado: { label: 'Agendado', className: 'bg-info/10 text-info hover:bg-info/10', icon: Clock },
      em_andamento: { label: 'Em Andamento', className: 'bg-warning/10 text-warning hover:bg-warning/10', icon: Clock },
      concluido: { label: 'Concluído', className: 'bg-success/10 text-success hover:bg-success/10', icon: CheckCircle },
      cancelado: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive hover:bg-destructive/10', icon: XCircle }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground', icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Funções do calendário
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Preencher dias vazios no início (semana começa na segunda-feira)
  // getDay() retorna 0=Dom, 1=Seg... Convertemos para 0=Seg, 1=Ter...
  const startDay = monthStart.getDay();
  const adjustedStartDay = startDay === 0 ? 6 : startDay - 1; // Segunda = 0, Domingo = 6
  const emptyDays = Array(adjustedStartDay).fill(null);

  const getTurmasForDay = (date: Date) => {
    return filteredTurmas.filter(turma => 
      turma.aulas.some(aula => isSameDay(parseISO(aula.data), date))
    );
  };

  const getAulasForDay = (turma: TurmaAgenda, date: Date) => {
    return turma.aulas.filter(aula => isSameDay(parseISO(aula.data), date));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  // Turmas do mês atual para a lista
  const turmasDoMes = filteredTurmas.filter(turma =>
    turma.aulas.some(aula => {
      const aulaDate = parseISO(aula.data);
      return isSameMonth(aulaDate, currentDate);
    })
  );

  return (
    <div className="space-y-4">
      {/* Header com controles */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Navegação do mês */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                <Select 
                  value={String(currentDate.getMonth())} 
                  onValueChange={(v) => setCurrentDate(new Date(currentDate.getFullYear(), Number(v), 1))}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((mes, index) => (
                      <SelectItem key={index} value={String(index)}>{mes}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={String(currentDate.getFullYear())} 
                  onValueChange={(v) => setCurrentDate(new Date(Number(v), currentDate.getMonth(), 1))}
                >
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map((ano) => (
                      <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Busca e Toggle de visão */}
            <div className="flex items-center gap-3">
              {showSearch && (
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              <div className="flex border rounded-lg p-1 bg-muted/50">
                <Button
                  variant={viewMode === 'lista' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('lista')}
                  className="gap-1"
                >
                  <List className="h-4 w-4" />
                  Lista
                </Button>
                <Button
                  variant={viewMode === 'calendario' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendario')}
                  className="gap-1"
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendário
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo baseado na visão */}
      {viewMode === 'lista' ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              Treinamentos de {MESES[currentDate.getMonth()]} ({turmasDoMes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {turmasDoMes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum treinamento neste mês</p>
                <p className="text-sm">Não há treinamentos agendados para {MESES[currentDate.getMonth()]}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {turmasDoMes.map((turma) => {
                  const aulasDoMes = turma.aulas.filter(aula => 
                    isSameMonth(parseISO(aula.data), currentDate)
                  ).sort((a, b) => a.data.localeCompare(b.data));
                  
                  return (
                    <div 
                      key={turma.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        canEnterTurma(turma) && onTurmaClick 
                          ? 'hover:border-primary/30 cursor-pointer' 
                          : 'opacity-80'
                      }`}
                      onClick={() => canEnterTurma(turma) && onTurmaClick?.(turma)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground">{turma.treinamento_nome}</h4>
                            {getStatusBadge(turma.status, turma.validado)}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {turma.cliente_nome}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {turma.quantidade_participantes} participantes
                            </span>
                            {turma.horario && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {turma.horario}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {aulasDoMes.slice(0, 5).map((aula) => (
                            <Badge key={aula.id} variant="outline" className="bg-primary/5">
                              {format(parseISO(aula.data), 'dd/MM', { locale: ptBR })}
                            </Badge>
                          ))}
                          {aulasDoMes.length > 5 && (
                            <Badge variant="outline">+{aulasDoMes.length - 5}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {MESES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DIAS_SEMANA.map((dia) => (
                <div key={dia} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {dia}
                </div>
              ))}
            </div>

            {/* Grid do calendário */}
            <div className="grid grid-cols-7 gap-1">
              {/* Dias vazios no início */}
              {emptyDays.map((_, index) => (
                <div key={`empty-${index}`} className="min-h-[120px] bg-muted/30 rounded-lg" />
              ))}

              {/* Dias do mês */}
              {daysInMonth.map((day) => {
                const turmasNoDia = getTurmasForDay(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] p-2 border rounded-lg transition-colors ${
                      isToday ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {turmasNoDia.slice(0, 2).map((turma) => {
                        const aulasNoDia = getAulasForDay(turma, day);
                        const horario = aulasNoDia[0]?.inicio || '';
                        return (
                          <div
                            key={turma.id}
                            className={`text-[10px] p-1.5 rounded ${
                              canEnterTurma(turma) ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'
                            } ${
                              turma.status === 'concluido' ? 'bg-success/10 text-success border border-success/20' :
                              turma.status === 'em_andamento' ? 'bg-warning/10 text-warning border border-warning/20' :
                              turma.status === 'cancelado' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                              'bg-primary/10 text-primary border border-primary/20'
                            }`}
                            onClick={() => canEnterTurma(turma) && onTurmaClick?.(turma)}
                            title={`Turma #${turma.numero_turma || ''}\n${turma.treinamento_nome}\nEmpresa: ${turma.cliente_nome}\nHorário: ${horario || 'Não definido'}${!canEnterTurma(turma) ? '\n\n⚠️ Turma ainda não iniciou' : ''}`}
                          >
                            <div className="font-bold truncate">
                              {turma.treinamento_norma ? `NR ${turma.treinamento_norma}` : turma.treinamento_nome?.substring(0, 12)}
                            </div>
                            <div className="truncate text-[9px] opacity-80">
                              {turma.cliente_nome?.substring(0, 15)}
                            </div>
                            {horario && (
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                <span className="font-medium">{horario}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {turmasNoDia.length > 2 && (
                        <div className="text-[10px] text-muted-foreground text-center py-0.5 bg-muted rounded">
                          +{turmasNoDia.length - 2} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
