import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  Mail, 
  Phone, 
  MessageSquare, 
  Video, 
  MapPin, 
  Pencil, 
  ListChecks,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  Paperclip,
  Trash2,
  Edit2,
  AlertTriangle,
  Plus,
  X,
  Save
} from 'lucide-react';

interface Atividade {
  id: string;
  card_id: string;
  tipo: string;
  descricao: string;
  prazo: string | null;
  horario: string | null;
  status: 'a_realizar' | 'programada' | 'pendente' | 'concluida';
  created_at: string;
  usuario_id: string | null;
  usuario?: { nome: string } | null;
  responsavel_id?: string | null;
  responsavel?: { nome: string } | null;
  anexo_url?: string | null;
  anexo_nome?: string | null;
}

interface ChecklistItem {
  texto: string;
  concluido: boolean;
}

interface ChecklistData {
  texto: string;
  itens: ChecklistItem[];
}

interface AtividadeDetalheModalProps {
  atividade: Atividade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarcarConcluida?: (atividade: Atividade) => void;
  onToggleChecklistItem?: (atividadeId: string, itemIndex: number) => void;
  onDeleteAtividade?: (atividadeId: string) => void;
  onEditAtividade?: (atividadeId: string, dados: { descricao: string; prazo?: string | null; horario?: string | null }) => void;
  initialEditMode?: boolean;
  onInitialEditModeHandled?: () => void;
}

const TIPOS_ATIVIDADE = [
  { id: 'tarefa', label: 'Tarefa', icon: FileText, cor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { id: 'email', label: 'E-mail', icon: Mail, cor: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { id: 'ligacao', label: 'Ligação', icon: Phone, cor: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, cor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  { id: 'reuniao', label: 'Reunião', icon: Video, cor: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { id: 'visita', label: 'Visita', icon: MapPin, cor: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  { id: 'nota', label: 'Nota', icon: Pencil, cor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  { id: 'checklist', label: 'Checklist', icon: ListChecks, cor: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
];

const STATUS_ATIVIDADE = {
  'a_realizar': { label: 'A Realizar', cor: 'bg-gray-100 text-gray-700', icon: AlertCircle },
  'programada': { label: 'Programada', cor: 'bg-blue-100 text-blue-700', icon: Clock },
  'pendente': { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  'concluida': { label: 'Concluída', cor: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

function parseChecklistData(descricao: string): ChecklistData | null {
  try {
    const data = JSON.parse(descricao);
    if (data && data.itens && Array.isArray(data.itens)) {
      return data as ChecklistData;
    }
  } catch {
    // Not a checklist JSON
  }
  return null;
}

export function AtividadeDetalheModal({ 
  atividade, 
  open, 
  onOpenChange,
  onMarcarConcluida,
  onToggleChecklistItem,
  onDeleteAtividade,
  onEditAtividade,
  initialEditMode,
  onInitialEditModeHandled
}: AtividadeDetalheModalProps) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [editDescricao, setEditDescricao] = useState('');
  const [editPrazo, setEditPrazo] = useState('');
  const [editHorario, setEditHorario] = useState('');
  const [editChecklistItems, setEditChecklistItems] = useState<ChecklistItem[]>([]);
  const [novoEditChecklistItem, setNovoEditChecklistItem] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Auto-enter edit mode when initialEditMode prop is set
  useEffect(() => {
    if (open && initialEditMode && atividade && atividade.status !== 'concluida') {
      const isChk = atividade.tipo === 'checklist';
      const chkData = isChk ? parseChecklistData(atividade.descricao) : null;
      if (isChk && chkData) {
        setEditDescricao(chkData.texto);
        setEditChecklistItems(chkData.itens.map(i => ({ ...i })));
      } else {
        setEditDescricao(atividade.descricao);
        setEditChecklistItems([]);
      }
      setNovoEditChecklistItem('');
      setEditPrazo(atividade.prazo || '');
      setEditHorario(atividade.horario || '');
      setEditMode(true);
      setConfirmDelete(false);
      if (onInitialEditModeHandled) onInitialEditModeHandled();
    }
  }, [open, initialEditMode, atividade]);

  if (!atividade) return null;

  const tipoInfo = TIPOS_ATIVIDADE.find(t => t.id === atividade.tipo) || TIPOS_ATIVIDADE[0];
  const TipoIcon = tipoInfo.icon;
  const statusInfo = STATUS_ATIVIDADE[atividade.status] || STATUS_ATIVIDADE['a_realizar'];
  const StatusIcon = statusInfo.icon;
  const isChecklist = atividade.tipo === 'checklist';
  const checklistData = isChecklist ? parseChecklistData(atividade.descricao) : null;

  const formatarData = (data: string | null) => {
    if (!data) return null;
    try {
      return format(new Date(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const formatarDataHora = (data: string) => {
    try {
      return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const isAtrasada = () => {
    if (!atividade.prazo || atividade.status === 'concluida') return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prazo = new Date(atividade.prazo);
    prazo.setHours(0, 0, 0, 0);
    return prazo < hoje;
  };

  const todosCompletos = checklistData 
    ? checklistData.itens.every(item => item.concluido) 
    : true;

  const totalItens = checklistData?.itens.length || 0;
  const itensCompletos = checklistData?.itens.filter(i => i.concluido).length || 0;

  const handleMarcarConcluida = () => {
    if (isChecklist && checklistData && !todosCompletos) {
      toast({
        title: 'Itens pendentes',
        description: `Conclua todos os itens do checklist antes de finalizar a atividade. (${itensCompletos}/${totalItens} concluídos)`,
        variant: 'destructive',
        duration: 5000
      });
      return;
    }
    if (onMarcarConcluida) {
      onMarcarConcluida(atividade);
    }
  };

  const handleStartEdit = () => {
    if (isChecklist && checklistData) {
      setEditDescricao(checklistData.texto);
      setEditChecklistItems(checklistData.itens.map(i => ({ ...i })));
    } else {
      setEditDescricao(atividade.descricao);
      setEditChecklistItems([]);
    }
    setNovoEditChecklistItem('');
    setEditPrazo(atividade.prazo || '');
    setEditHorario(atividade.horario || '');
    setEditMode(true);
    setConfirmDelete(false);
  };

  const handleSaveEdit = () => {
    if (!onEditAtividade) return;
    
    let descricaoFinal = editDescricao;
    if (isChecklist) {
      descricaoFinal = JSON.stringify({
        texto: editDescricao,
        itens: editChecklistItems
      });
    }
    
    onEditAtividade(atividade.id, {
      descricao: descricaoFinal,
      prazo: editPrazo || null,
      horario: editHorario || null
    });
    setEditMode(false);
  };

  const handleAddEditChecklistItem = () => {
    const texto = novoEditChecklistItem.trim();
    if (!texto) return;
    setEditChecklistItems(prev => [...prev, { texto, concluido: false }]);
    setNovoEditChecklistItem('');
  };

  const handleRemoveEditChecklistItem = (index: number) => {
    setEditChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditChecklistItemText = (index: number, novoTexto: string) => {
    setEditChecklistItems(prev => prev.map((item, i) => 
      i === index ? { ...item, texto: novoTexto } : item
    ));
  };

  const handleDelete = () => {
    if (!onDeleteAtividade) return;
    onDeleteAtividade(atividade.id);
    onOpenChange(false);
    setConfirmDelete(false);
  };

  const descricaoDisplay = isChecklist && checklistData 
    ? checklistData.texto 
    : atividade.descricao;

  return (
    <Dialog open={open} onOpenChange={(o) => { 
      if (!o) { setEditMode(false); setConfirmDelete(false); }
      onOpenChange(o); 
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${tipoInfo.cor}`}>
              <TipoIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {tipoInfo.label}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={statusInfo.cor}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
                {isAtrasada() && (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    Atrasada
                  </Badge>
                )}
              </div>
            </div>
            {/* Edit / Delete buttons */}
            {atividade.status !== 'concluida' && (
              <div className="flex items-center gap-1">
                {onEditAtividade && !editMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                    onClick={handleStartEdit}
                    title="Editar atividade"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {onDeleteAtividade && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    title="Excluir atividade"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Confirm Delete Banner */}
        {confirmDelete && (
          <div className="px-6 py-3 bg-destructive/10 border-b flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>Tem certeza que deseja excluir esta atividade?</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Excluir
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <div className="space-y-5">
            {/* Descrição */}
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                  <Textarea
                    value={editDescricao}
                    onChange={(e) => setEditDescricao(e.target.value)}
                    className="min-h-[80px] mt-1"
                    placeholder="Descrição da atividade..."
                  />
                </div>

                {/* Checklist items editor */}
                {isChecklist && (
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      <ListChecks className="h-4 w-4 text-amber-600" />
                      <Label className="text-sm font-medium">Itens do Checklist</Label>
                    </div>

                    {editChecklistItems.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {editChecklistItems.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                            <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${item.concluido ? 'text-green-500' : 'text-muted-foreground'}`} />
                            <Input
                              value={item.texto}
                              onChange={(e) => handleEditChecklistItemText(index, e.target.value)}
                              className="h-7 text-sm flex-1"
                              placeholder="Texto do item..."
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                              onClick={() => handleRemoveEditChecklistItem(index)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Adicionar item..."
                        value={novoEditChecklistItem}
                        onChange={(e) => setNovoEditChecklistItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEditChecklistItem();
                          }
                        }}
                        className="flex-1 h-9 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={handleAddEditChecklistItem}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Prazo</Label>
                    <Input
                      type="date"
                      value={editPrazo ? editPrazo.split('T')[0] : ''}
                      onChange={(e) => setEditPrazo(e.target.value)}
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Horário</Label>
                    <Input
                      type="text"
                      placeholder="HH:MM"
                      maxLength={5}
                      value={editHorario}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d:]/g, '');
                        if (value.length === 2 && !value.includes(':') && e.target.value.length > (editHorario?.length || 0)) {
                          value = value + ':';
                        }
                        if (value.length <= 5) setEditHorario(value);
                      }}
                      className="h-9 mt-1"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Save className="h-3 w-3 mr-1" />
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Descrição
                </h4>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {descricaoDisplay || 'Sem descrição'}
                </p>
              </div>
            )}

            {/* Checklist Todo Items */}
            {isChecklist && checklistData && checklistData.itens.length > 0 && !editMode && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4" />
                    Itens do Checklist
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {itensCompletos}/{totalItens}
                  </Badge>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${todosCompletos ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${totalItens > 0 ? (itensCompletos / totalItens) * 100 : 0}%` }}
                  />
                </div>

                <div className="space-y-1.5">
                  {checklistData.itens.map((item, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                        item.concluido 
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                          : 'bg-card border-border hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={item.concluido}
                        onCheckedChange={() => {
                          if (onToggleChecklistItem) {
                            onToggleChecklistItem(atividade.id, index);
                          }
                        }}
                        disabled={atividade.status === 'concluida'}
                        className="h-5 w-5"
                      />
                      <span className={`text-sm flex-1 ${
                        item.concluido 
                          ? 'line-through text-muted-foreground' 
                          : ''
                      }`}>
                        {item.texto}
                      </span>
                      {item.concluido && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                {todosCompletos && atividade.status !== 'concluida' && (
                  <div className="mt-3 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Todos os itens foram concluídos!
                  </div>
                )}
              </div>
            )}

            {/* Prazo e Horário */}
            {!editMode && (atividade.prazo || atividade.horario) && (
              <div className="grid grid-cols-2 gap-4">
                {atividade.prazo && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Prazo
                    </h4>
                    <p className={`text-sm font-medium ${isAtrasada() ? 'text-destructive' : ''}`}>
                      {formatarData(atividade.prazo)}
                    </p>
                  </div>
                )}
                {atividade.horario && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Horário
                    </h4>
                    <p className="text-sm font-medium">{atividade.horario}</p>
                  </div>
                )}
              </div>
            )}

            {/* Responsável e Criador */}
            <div className="grid grid-cols-2 gap-4">
              {atividade.responsavel && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    Responsável
                  </h4>
                  <p className="text-sm font-medium">{atividade.responsavel.nome}</p>
                </div>
              )}
              {atividade.usuario && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    Criado por
                  </h4>
                  <p className="text-sm font-medium">{atividade.usuario.nome}</p>
                </div>
              )}
            </div>

            {/* Anexo */}
            {atividade.anexo_url && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4" />
                  Anexo
                </h4>
                <a 
                  href={atividade.anexo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline bg-primary/10 px-3 py-2 rounded-lg"
                >
                  <FileText className="h-4 w-4" />
                  {atividade.anexo_nome || 'Ver anexo'}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Data de Criação */}
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Criado em {formatarDataHora(atividade.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer com ações */}
        {atividade.status !== 'concluida' && onMarcarConcluida && !editMode && (
          <div className="px-6 py-4 border-t bg-muted/30">
            <Button 
              onClick={handleMarcarConcluida}
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar como Concluída
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
