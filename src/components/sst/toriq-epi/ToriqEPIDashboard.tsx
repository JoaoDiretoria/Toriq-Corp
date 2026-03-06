import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissoes } from '@/hooks/usePermissoes';
import { Shield, Package, ClipboardList, FileText, RotateCcw, BarChart3, Target } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ToriqEPIDashboardProps {
  onNavigate?: (section: string) => void;
}

export function ToriqEPIDashboard({ onNavigate }: ToriqEPIDashboardProps) {
  const { podeVisualizar } = usePermissoes();

  const handleNavigate = (section: string) => {
    if (onNavigate) {
      onNavigate(section);
    }
  };

  // Definição dos cards com suas telas correspondentes
  const cards = [
    { id: 'toriq-epi-catalogo', nome: 'Catálogo', descricao: 'EPIs cadastrados', icon: Package },
    { id: 'toriq-epi-estoque', nome: 'Estoque', descricao: 'Controle de estoque', icon: BarChart3 },
    { id: 'toriq-epi-entregas', nome: 'Entregas', descricao: 'Registro de entregas', icon: ClipboardList },
    { id: 'toriq-epi-ficha', nome: 'Ficha de EPI', descricao: 'Fichas individuais', icon: FileText },
    { id: 'toriq-epi-devolucoes', nome: 'Devoluções', descricao: 'Controle de devoluções', icon: RotateCcw },
    { id: 'toriq-epi-relatorios', nome: 'Relatórios', descricao: 'Relatórios e análises', icon: BarChart3 },
  ];

  // Filtra apenas os cards que o usuário tem permissão para visualizar
  const cardsVisiveis = cards.filter(card => podeVisualizar(card.id));

  // Botões do header - apenas os que o usuário pode ver
  const podeCatalogo = podeVisualizar('toriq-epi-catalogo');
  const podeEntregas = podeVisualizar('toriq-epi-entregas');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900 text-white rounded-2xl p-6 border border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Toriq EPI
            </h1>
            <p className="text-gray-400 mt-1">
              Gestão de Equipamentos de Proteção Individual • {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-3">
            {podeCatalogo && (
              <Button 
                variant="secondary" 
                className="bg-primary hover:bg-primary/90 text-white border-none"
                onClick={() => handleNavigate('toriq-epi-catalogo')}
              >
                <Package className="h-4 w-4 mr-2" />
                Catálogo
              </Button>
            )}
            {podeEntregas && (
              <Button 
                variant="secondary"
                className="bg-primary hover:bg-primary/90 text-white border-none"
                onClick={() => handleNavigate('toriq-epi-entregas')}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Entregas
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
            <CardDescription>Navegue para as principais áreas do Toriq EPI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {cardsVisiveis.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className="bg-green-700 hover:bg-green-800 rounded-xl p-5 text-white cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                    onClick={() => handleNavigate(card.id)}
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
