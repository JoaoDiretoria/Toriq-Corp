import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, Mail, Phone, MessageSquare, Video, MapPin, 
  CheckCircle2, FileCheck, Clock, User, Calendar, Paperclip,
  Download, Eye, ExternalLink, CheckSquare, Square
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  texto: string;
  concluido: boolean;
}

interface Atividade {
  id: string;
  card_id: string;
  usuario_id: string | null;
  tipo: string;
  descricao: string | null;
  dados_anteriores: any;
  dados_novos: any;
  responsavel_id: string | null;
  prazo: string | null;
  horario: string | null;
  anexos: { nome: string; url: string; tipo: string }[] | null;
  checklist_items: ChecklistItem[] | null;
  membros_ids: string[] | null;
  created_at: string;
  status: 'a_realizar' | 'programada' | 'pendente' | 'concluida';
  data_conclusao?: string | null;
  usuario?: {
    nome: string;
  };
  responsavel?: {
    nome: string;
  };
}

interface AtividadePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atividade: Atividade | null;
  onUpdateChecklist?: (atividadeId: string, checklistItems: ChecklistItem[]) => void;
  onMarkComplete?: (atividadeId: string) => void;
}

const TIPOS_ATIVIDADE = [
  { id: 'tarefa', label: 'Tarefa', icon: FileText, cor: 'bg-gray-100 text-gray-700' },
  { id: 'email', label: 'E-mail', icon: Mail, cor: 'bg-blue-100 text-blue-700' },
  { id: 'ligacao', label: 'Ligação', icon: Phone, cor: 'bg-green-100 text-green-700' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, cor: 'bg-emerald-100 text-emerald-700' },
  { id: 'reuniao', label: 'Reunião', icon: Video, cor: 'bg-purple-100 text-purple-700' },
  { id: 'visita', label: 'Visita', icon: MapPin, cor: 'bg-orange-100 text-orange-700' },
  { id: 'checklist', label: 'Checklist', icon: CheckCircle2, cor: 'bg-yellow-100 text-yellow-700' },
  { id: 'status_contrato', label: 'Status do Contrato', icon: FileCheck, cor: 'bg-cyan-100 text-cyan-700' },
  { id: 'nota', label: 'Nota', icon: FileText, cor: 'bg-slate-100 text-slate-700' },
];

const STATUS_LABELS: Record<string, { label: string; cor: string }> = {
  'a_realizar': { label: 'A Realizar', cor: 'bg-gray-100 text-gray-700' },
  'programada': { label: 'Programada', cor: 'bg-blue-100 text-blue-700' },
  'pendente': { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-700' },
  'concluida': { label: 'Concluída', cor: 'bg-green-100 text-green-700' },
};

export function AtividadePopup({ 
  open, 
  onOpenChange, 
  atividade,
  onUpdateChecklist,
  onMarkComplete
}: AtividadePopupProps) {
  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>([]);

  if (!atividade) return null;

  const tipoInfo = TIPOS_ATIVIDADE.find(t => t.id === atividade.tipo) || TIPOS_ATIVIDADE[0];
  const TipoIcon = tipoInfo.icon;
  const statusInfo = STATUS_LABELS[atividade.status] || STATUS_LABELS['a_realizar'];

  const handleChecklistToggle = (itemId: string) => {
    const currentChecklist = atividade.checklist_items || [];
    const updatedChecklist = currentChecklist.map(item => 
      item.id === itemId ? { ...item, concluido: !item.concluido } : item
    );
    
    if (onUpdateChecklist) {
      onUpdateChecklist(atividade.id, updatedChecklist);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getFileIcon = (tipo: string) => {
    if (tipo.includes('image')) return '🖼️';
    if (tipo.includes('pdf')) return '📄';
    if (tipo.includes('word') || tipo.includes('document')) return '📝';
    if (tipo.includes('excel') || tipo.includes('spreadsheet')) return '📊';
    return '📎';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${tipoInfo.cor}`}>
              <TipoIcon className="h-5 w-5" />
            </div>
            <span>{tipoInfo.label}</span>
            <Badge className={statusInfo.cor}>{statusInfo.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            Detalhes da atividade
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Descrição */}
          {atividade.descricao && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Descrição</label>
              <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                {atividade.descricao}
              </p>
            </div>
          )}

          {/* Informações */}
          <div className="grid grid-cols-2 gap-4">
            {/* Criado em */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Criado em
              </label>
              <p className="text-sm">{formatDate(atividade.created_at)}</p>
            </div>

            {/* Criado por */}
            {atividade.usuario?.nome && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Criado por
                </label>
                <p className="text-sm">{atividade.usuario.nome}</p>
              </div>
            )}

            {/* Prazo */}
            {atividade.prazo && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Prazo
                </label>
                <p className="text-sm">{formatDateOnly(atividade.prazo)}</p>
              </div>
            )}

            {/* Horário */}
            {atividade.horario && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Horário
                </label>
                <p className="text-sm">{atividade.horario}</p>
              </div>
            )}

            {/* Responsável */}
            {atividade.responsavel?.nome && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Responsável
                </label>
                <p className="text-sm">{atividade.responsavel.nome}</p>
              </div>
            )}

            {/* Data de conclusão */}
            {atividade.data_conclusao && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Concluído em
                </label>
                <p className="text-sm">{formatDate(atividade.data_conclusao)}</p>
              </div>
            )}
          </div>

          {/* Checklist */}
          {atividade.checklist_items && atividade.checklist_items.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CheckSquare className="h-4 w-4" /> Checklist
              </label>
              <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                {atividade.checklist_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={item.concluido}
                      onCheckedChange={() => handleChecklistToggle(item.id)}
                      disabled={atividade.status === 'concluida'}
                    />
                    <span className={`text-sm ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>
                      {item.texto}
                    </span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground mt-2">
                  {atividade.checklist_items.filter(i => i.concluido).length} de {atividade.checklist_items.length} concluídos
                </div>
              </div>
            </div>
          )}

          {/* Anexos */}
          {atividade.anexos && atividade.anexos.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-4 w-4" /> Anexos ({atividade.anexos.length})
              </label>
              <div className="space-y-2">
                {atividade.anexos.map((anexo, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">{getFileIcon(anexo.tipo)}</span>
                      <span className="text-sm truncate">{anexo.nome}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(anexo.url, '_blank')}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Download"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(anexo.url);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = anexo.nome;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            console.error('Erro ao fazer download:', error);
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dados do Status do Contrato */}
          {atividade.tipo === 'status_contrato' && atividade.dados_novos && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status do Contrato</label>
              <div className="bg-muted/30 p-3 rounded-lg">
                <Badge variant="outline">{atividade.dados_novos.status_label || atividade.dados_novos.status}</Badge>
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          {atividade.status !== 'concluida' && onMarkComplete && (
            <Button 
              variant="outline" 
              onClick={() => {
                onMarkComplete(atividade.id);
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marcar como Concluída
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
