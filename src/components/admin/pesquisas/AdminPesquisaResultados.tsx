import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Download,
  Users,
  BarChart3,
  PieChart
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pesquisa {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  status: string;
  tipo: string;
  total_votos: number;
  created_at: string;
}

interface Opcao {
  id: string;
  texto: string;
  votos: number;
  ordem: number;
}

interface AdminPesquisaResultadosProps {
  pesquisa: Pesquisa;
  onBack: () => void;
}

export function AdminPesquisaResultados({ pesquisa, onBack }: AdminPesquisaResultadosProps) {
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVotos, setTotalVotos] = useState(pesquisa.total_votos);

  useEffect(() => {
    fetchResultados();
  }, [pesquisa.id]);

  const fetchResultados = async () => {
    setLoading(true);
    try {
      // Buscar opções com votos
      const { data: opcoesData } = await (supabase as any)
        .from('pesquisas_opcoes')
        .select('*')
        .eq('pesquisa_id', pesquisa.id)
        .order('ordem');

      if (opcoesData) {
        setOpcoes(opcoesData);
        const total = opcoesData.reduce((sum: number, o: Opcao) => sum + o.votos, 0);
        setTotalVotos(total);
      }
    } catch (error) {
      console.error('Erro ao buscar resultados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (votos: number) => {
    if (totalVotos === 0) return 0;
    return Math.round((votos / totalVotos) * 100);
  };

  const getBarColor = (index: number) => {
    const colors = [
      'bg-primary',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-cyan-500',
    ];
    return colors[index % colors.length];
  };

  const exportCSV = () => {
    const headers = ['Opção', 'Votos', 'Porcentagem'];
    const rows = opcoes.map(o => [
      o.texto,
      o.votos.toString(),
      `${getPercentage(o.votos)}%`
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-${pesquisa.slug}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{pesquisa.titulo}</h2>
          <p className="text-muted-foreground">
            Resultados da pesquisa
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalVotos}</p>
                <p className="text-sm text-muted-foreground">Total de Votos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{opcoes.length}</p>
                <p className="text-sm text-muted-foreground">Opções</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <PieChart className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {opcoes.length > 0 && totalVotos > 0
                    ? opcoes.reduce((max, o) => o.votos > max.votos ? o : max, opcoes[0]).texto.substring(0, 15) + '...'
                    : '-'
                  }
                </p>
                <p className="text-sm text-muted-foreground">Mais Votada</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Votos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando resultados...
            </div>
          ) : opcoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma opção cadastrada
            </div>
          ) : (
            <div className="space-y-6">
              {opcoes
                .sort((a, b) => b.votos - a.votos)
                .map((opcao, index) => {
                  const percentage = getPercentage(opcao.votos);
                  return (
                    <div key={opcao.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{opcao.texto}</span>
                        <span className="text-sm text-muted-foreground">
                          {opcao.votos} votos ({percentage}%)
                        </span>
                      </div>
                      <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                        <div 
                          className={`absolute inset-y-0 left-0 ${getBarColor(index)} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-medium text-white mix-blend-difference">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Pesquisa</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">{pesquisa.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd className="font-medium capitalize">{pesquisa.tipo.replace('_', ' ')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Criada em</dt>
              <dd className="font-medium">
                {format(new Date(pesquisa.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">URL</dt>
              <dd className="font-medium text-primary">
                /pesquisas/{pesquisa.slug}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
