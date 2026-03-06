import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, ClipboardCheck, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface OpcaoResposta {
  id: string;
  valor: number;
  texto: string;
}

interface Item {
  id: string;
  texto: string;
  ordem: number;
}

interface Categoria {
  id: string;
  nome: string;
  ordem: number;
  opcoes: OpcaoResposta[];
  itens: Item[];
}

interface Modelo {
  id: string;
  nome: string;
  descricao: string | null;
  campo_sugestoes: boolean;
  categorias: Categoria[];
}

interface AvaliacaoReacaoFormProps {
  turmaId: string;
  colaboradorId: string;
  treinamentoId: string;
  onComplete: () => void;
  onSkip?: () => void;
  // Props opcionais para auditoria (quando chamado via QR Code)
  turmaInfo?: {
    codigo_turma: string;
    empresa_id: string;
    cliente_id: string | null;
    cliente_nome: string;
    treinamento_nome: string;
    treinamento_norma: string;
    instrutor_id: string | null;
    instrutor_nome: string | null;
  };
  colaboradorInfo?: {
    nome: string;
    cpf: string;
  };
  origem?: 'sistema' | 'qrcode';
}

const db = supabase as any;

// Funções utilitárias para detecção de dispositivo
const detectOS = (userAgent: string): string => {
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Mac OS|Macintosh/i.test(userAgent)) return 'macOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Desconhecido';
};

const detectBrowser = (userAgent: string): string => {
  if (/Edg/i.test(userAgent)) return 'Edge';
  if (/OPR|Opera/i.test(userAgent)) return 'Opera';
  if (/Chrome/i.test(userAgent)) return 'Chrome';
  if (/Firefox/i.test(userAgent)) return 'Firefox';
  if (/Safari/i.test(userAgent)) return 'Safari';
  return 'Desconhecido';
};

const fetchPublicIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return data.ip || null;
    } catch {
      return null;
    }
  }
};

const getDeviceInfo = async () => {
  const userAgent = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
  const ip = await fetchPublicIP();
  
  return {
    userAgent,
    dispositivo: isMobile ? 'Mobile' : 'Desktop',
    navegador: detectBrowser(userAgent),
    sistemaOperacional: detectOS(userAgent),
    ip
  };
};

export function AvaliacaoReacaoForm({ 
  turmaId, 
  colaboradorId, 
  treinamentoId,
  onComplete,
  onSkip,
  turmaInfo,
  colaboradorInfo,
  origem = 'sistema'
}: AvaliacaoReacaoFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [sugestoes, setSugestoes] = useState('');

  useEffect(() => {
    fetchModeloAvaliacao();
  }, [treinamentoId]);

  const fetchModeloAvaliacao = async () => {
    try {
      setLoading(true);
      
      // Buscar modelo de avaliação vinculado ao treinamento
      const { data: modeloTreinamento, error: mtError } = await db
        .from('avaliacao_reacao_modelo_treinamentos')
        .select('modelo_id')
        .eq('treinamento_id', treinamentoId)
        .limit(1)
        .single();

      if (mtError || !modeloTreinamento) {
        console.log('Nenhum modelo de avaliação vinculado a este treinamento');
        setModelo(null);
        setLoading(false);
        return;
      }

      // Buscar dados do modelo
      const { data: modeloData, error: modeloError } = await db
        .from('avaliacao_reacao_modelos')
        .select('id, nome, descricao, campo_sugestoes')
        .eq('id', modeloTreinamento.modelo_id)
        .eq('ativo', true)
        .single();

      if (modeloError || !modeloData) {
        console.log('Modelo de avaliação não encontrado ou inativo');
        setModelo(null);
        setLoading(false);
        return;
      }

      // Buscar categorias do modelo
      const { data: categoriasData, error: categoriasError } = await db
        .from('avaliacao_reacao_categorias')
        .select('id, nome, ordem')
        .eq('modelo_id', modeloData.id)
        .order('ordem');

      if (categoriasError) throw categoriasError;

      const categorias: Categoria[] = [];

      for (const cat of categoriasData || []) {
        // Buscar opções de resposta
        const { data: opcoesData } = await db
          .from('avaliacao_reacao_opcoes_resposta')
          .select('id, valor, texto')
          .eq('categoria_id', cat.id)
          .order('valor');

        // Buscar itens
        const { data: itensData } = await db
          .from('avaliacao_reacao_itens')
          .select('id, texto, ordem')
          .eq('categoria_id', cat.id)
          .order('ordem');

        categorias.push({
          ...cat,
          opcoes: opcoesData || [],
          itens: itensData || []
        });
      }

      setModelo({
        ...modeloData,
        categorias
      });

    } catch (error) {
      console.error('Erro ao buscar modelo de avaliação:', error);
      toast.error('Erro ao carregar avaliação de reação');
    } finally {
      setLoading(false);
    }
  };

  const handleRespostaChange = (itemId: string, valor: number) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: valor
    }));
  };

  const handleSubmit = async () => {
    if (!modelo) return;

    // Validar se todas as perguntas foram respondidas
    const todosItens = modelo.categorias.flatMap(cat => cat.itens);
    const itensNaoRespondidos = todosItens.filter(item => !respostas[item.id]);

    if (itensNaoRespondidos.length > 0) {
      toast.error(`Por favor, responda todas as ${todosItens.length} perguntas da avaliação`);
      return;
    }

    setSaving(true);
    try {
      // Salvar respostas
      const { error } = await db
        .from('avaliacao_reacao_respostas')
        .insert({
          turma_id: turmaId,
          colaborador_id: colaboradorId,
          modelo_id: modelo.id,
          respostas: respostas,
          sugestoes_comentarios: sugestoes || null
        });

      if (error) throw error;

      // Atualizar flag no turma_colaboradores
      await db
        .from('turma_colaboradores')
        .update({ avaliacao_reacao_respondida: true })
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorId);

      // Registrar auditoria da avaliação de reação
      if (turmaInfo && colaboradorInfo) {
        try {
          const deviceInfo = await getDeviceInfo();
          const totalPerguntas = modelo.categorias.flatMap(cat => cat.itens).length;
          
          await db.from('turmas_auditoria').insert({
            turma_id: turmaId,
            turma_codigo: turmaInfo.codigo_turma,
            empresa_id: turmaInfo.empresa_id,
            usuario_id: null,
            usuario_nome: colaboradorInfo.nome,
            usuario_role: 'colaborador',
            acao: 'criou',
            entidade: 'avaliacao_reacao',
            descricao: `Avaliação de reação respondida via ${origem === 'qrcode' ? 'QR Code' : 'Sistema'} pelo colaborador ${colaboradorInfo.nome} (CPF: ${colaboradorInfo.cpf}). Modelo: ${modelo.nome}. Total de perguntas: ${totalPerguntas}.${sugestoes ? ' Incluiu sugestões/comentários.' : ''}`,
            metodo_origem: origem,
            fonte: origem,
            colaborador_id: colaboradorId,
            colaborador_nome: colaboradorInfo.nome,
            colaborador_cpf: colaboradorInfo.cpf,
            cliente_id: turmaInfo.cliente_id,
            cliente_nome: turmaInfo.cliente_nome,
            treinamento_id: treinamentoId,
            treinamento_nome: turmaInfo.treinamento_nome,
            treinamento_norma: turmaInfo.treinamento_norma,
            instrutor_id: turmaInfo.instrutor_id,
            instrutor_nome: turmaInfo.instrutor_nome,
            executado_por: 'colaborador',
            executado_por_nome: colaboradorInfo.nome,
            executado_por_id: colaboradorId,
            user_agent: deviceInfo.userAgent,
            dispositivo: deviceInfo.dispositivo,
            navegador: deviceInfo.navegador,
            sistema_operacional: deviceInfo.sistemaOperacional,
            ip_address: deviceInfo.ip
          });
        } catch (auditError) {
          console.error('Erro ao registrar auditoria de avaliação de reação:', auditError);
        }
      }

      toast.success('Avaliação de reação enviada com sucesso!');
      onComplete();
    } catch (error: any) {
      console.error('Erro ao salvar avaliação:', error);
      if (error.code === '23505') {
        toast.error('Você já respondeu esta avaliação');
        onComplete();
      } else {
        toast.error('Erro ao enviar avaliação');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!modelo) {
    // Não há modelo de avaliação vinculado - pular etapa
    if (onSkip) {
      return (
        <Card>
          <CardContent className="pt-6 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Não há avaliação de reação configurada para este treinamento.
            </p>
            <Button onClick={onSkip}>
              Continuar
            </Button>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const todosItens = modelo.categorias.flatMap(cat => cat.itens);
  const respondidos = Object.keys(respostas).length;
  const progresso = todosItens.length > 0 ? Math.round((respondidos / todosItens.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <ClipboardCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle>{modelo.nome}</CardTitle>
          {modelo.descricao && (
            <CardDescription>{modelo.descricao}</CardDescription>
          )}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Progresso</span>
              <span>{respondidos}/{todosItens.length} respondidas</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {modelo.categorias.map((categoria) => (
        <Card key={categoria.id}>
          <CardHeader>
            <CardTitle className="text-lg">{categoria.nome}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Itens/Perguntas */}
            {categoria.itens.map((item, index) => (
              <div key={item.id} className="space-y-3">
                <Label className="text-sm font-medium">
                  {index + 1}. {item.texto}
                </Label>
                <RadioGroup
                  value={respostas[item.id]?.toString() || ''}
                  onValueChange={(value) => handleRespostaChange(item.id, parseInt(value))}
                  className="flex flex-wrap gap-4"
                >
                  {categoria.opcoes.map((opcao) => (
                    <div key={opcao.id} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={opcao.valor.toString()} 
                        id={`${item.id}-${opcao.valor}`}
                      />
                      <Label 
                        htmlFor={`${item.id}-${opcao.valor}`}
                        className="cursor-pointer text-sm"
                      >
                        {opcao.texto}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Campo de Sugestões e Comentários */}
      {modelo.campo_sugestoes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Sugestões e Comentários
            </CardTitle>
            <CardDescription>
              Deixe suas sugestões, críticas ou comentários sobre o treinamento (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={sugestoes}
              onChange={(e) => setSugestoes(e.target.value)}
              placeholder="Digite aqui suas sugestões e comentários..."
              rows={4}
            />
          </CardContent>
        </Card>
      )}

      {/* Botão de Enviar */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSubmit} 
          disabled={saving}
          size="lg"
          className="w-full max-w-md"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Enviar Avaliação
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
