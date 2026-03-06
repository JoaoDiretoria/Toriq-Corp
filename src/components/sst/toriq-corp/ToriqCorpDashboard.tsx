import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissoes } from '@/hooks/usePermissoes';
import { 
  Briefcase, DollarSign, CheckSquare, FileSignature,
  Car, HardHat, Building, Target
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ToriqCorpDashboardProps {
  onNavigate: (section: string) => void;
}

export function ToriqCorpDashboard({ onNavigate }: ToriqCorpDashboardProps) {
  const { podeVisualizar } = usePermissoes();

  // Definição dos cards com suas telas correspondentes
  const cards = [
    { id: 'toriq-corp-tarefas', nome: 'Tarefas', descricao: 'Gerenciar tarefas', icon: CheckSquare },
    { id: 'toriq-corp-financeiro', nome: 'Financeiro', descricao: 'Contas e fluxo', icon: DollarSign },
    { id: 'toriq-corp-contratos', nome: 'Contratos', descricao: 'Gestão de contratos', icon: FileSignature },
    { id: 'toriq-corp-setores', nome: 'Setores', descricao: 'Áreas da empresa', icon: Building },
    { id: 'toriq-corp-controle-frota', nome: 'Frota', descricao: 'Controle de veículos', icon: Car },
    { id: 'toriq-corp-controle-equipamentos', nome: 'Equipamentos', descricao: 'Controle de equipamentos', icon: HardHat },
  ];

  // Filtra apenas os cards que o usuário tem permissão para visualizar
  const cardsVisiveis = cards.filter(card => podeVisualizar(card.id));

  // Botões do header - apenas os que o usuário pode ver
  const podeTarefas = podeVisualizar('toriq-corp-tarefas');
  const podeFinanceiro = podeVisualizar('toriq-corp-financeiro');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card text-card-foreground rounded-2xl p-6 border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Briefcase className="h-8 w-8" />
              Toriq Corp
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestão Empresarial • {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-3">
            {podeTarefas && (
              <Button 
                variant="secondary" 
                className="bg-primary hover:bg-primary/90 text-white border-none"
                onClick={() => onNavigate('toriq-corp-tarefas')}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Tarefas
              </Button>
            )}
            {podeFinanceiro && (
              <Button 
                variant="secondary"
                className="bg-primary hover:bg-primary/90 text-white border-none"
                onClick={() => onNavigate('toriq-corp-financeiro')}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Financeiro
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Acesso Rápido - Cards de Navegação */}
      {cardsVisiveis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Acesso Rápido
            </CardTitle>
            <CardDescription>Navegue para as principais áreas do Toriq Corp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {cardsVisiveis.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className="bg-primary hover:bg-primary/90 rounded-xl p-5 text-primary-foreground cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                    onClick={() => onNavigate(card.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{card.nome}</h3>
                        <p className="text-sm text-white/80">{card.descricao}</p>
                      </div>
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
