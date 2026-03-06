import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Check, X, Download, FileText, ThumbsUp, ThumbsDown, 
  MessageSquare, Loader2, Building, Phone, Mail, Globe,
  CreditCard, Award, Target, Sparkles, DollarSign, ArrowRight,
  Play, Calendar, User
} from 'lucide-react';

interface Block {
  id: string;
  type: string;
  data: any;
  style: any;
}

interface SharedProposal {
  id: string;
  title: string;
  blocks: Block[];
  header?: any;
  sharedAt: string;
  status: 'pendente' | 'aprovada' | 'reprovada';
  clienteResposta: string | null;
  clienteComentario: string;
}

export default function PropostaWeb() {
  const { propostaId } = useParams<{ propostaId: string }>();
  const [proposal, setProposal] = useState<SharedProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'aprovar' | 'reprovar' | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (propostaId) {
      loadProposal();
    }
  }, [propostaId]);

  const loadProposal = () => {
    try {
      const sharedProposals = JSON.parse(localStorage.getItem('sharedProposals') || '{}');
      const found = sharedProposals[propostaId || ''];
      
      if (found) {
        setProposal(found);
        setComentario(found.clienteComentario || '');
      } else {
        setError('Proposta não encontrada ou link expirado.');
      }
    } catch (err) {
      setError('Erro ao carregar a proposta.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (type: 'aprovar' | 'reprovar') => {
    setFeedbackType(type);
    setFeedbackOpen(true);
  };

  const submitFeedback = () => {
    if (!proposal || !feedbackType) return;

    const sharedProposals = JSON.parse(localStorage.getItem('sharedProposals') || '{}');
    sharedProposals[proposal.id] = {
      ...proposal,
      status: feedbackType === 'aprovar' ? 'aprovada' : 'reprovada',
      clienteResposta: new Date().toISOString(),
      clienteComentario: comentario
    };
    localStorage.setItem('sharedProposals', JSON.stringify(sharedProposals));

    setProposal(sharedProposals[proposal.id]);
    setFeedbackOpen(false);

    toast({
      title: feedbackType === 'aprovar' ? 'Proposta Aprovada!' : 'Proposta Reprovada',
      description: feedbackType === 'aprovar' 
        ? 'Obrigado! Entraremos em contato em breve.' 
        : 'Agradecemos seu feedback. Entraremos em contato.'
    });
  };

  const generatePDF = async () => {
    if (!contentRef.current) return;
    
    setGeneratingPdf(true);
    try {
      const element = contentRef.current;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pageContentHeight = pdfHeight - (margin * 2);
      const totalPages = Math.ceil(imgHeight / pageContentHeight);
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        const yPosition = margin - (page * pageContentHeight);
        
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          yPosition,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
      }
      
      const fileName = `${proposal?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'proposta'}.pdf`;
      pdf.save(fileName);
      
      toast({ title: 'PDF baixado!', description: 'O arquivo foi salvo com sucesso.' });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const renderBlockContent = (block: Block) => {
    const d = block.data;
    
    switch (block.type) {
      case 'cabecalho':
        return (
          <div 
            className="relative p-6 rounded-lg text-white min-h-[100px]" 
            style={{ 
              backgroundColor: d.bgColor || '#1a1a2e',
              backgroundImage: d.bgImage ? `url(${d.bgImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent rounded-lg" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {d.logoUrl && (
                  <img src={d.logoUrl} alt="Logo" className="h-16 w-16 object-contain bg-white rounded-lg p-2" />
                )}
                <div>
                  <h1 className="text-xl font-bold">{d.nomeEmpresa || 'Empresa'}</h1>
                  <p className="text-sm text-white/80">{d.slogan || ''}</p>
                </div>
              </div>
              <div className="text-right text-sm text-white/80">
                {d.telefone && <p className="flex items-center gap-1 justify-end"><Phone className="h-3 w-3" />{d.telefone}</p>}
                {d.email && <p className="flex items-center gap-1 justify-end"><Mail className="h-3 w-3" />{d.email}</p>}
                {d.website && <p className="flex items-center gap-1 justify-end"><Globe className="h-3 w-3" />{d.website}</p>}
              </div>
            </div>
          </div>
        );

      case 'hero':
        return (
          <div className="text-center py-6">
            <h2 className="text-2xl font-bold mb-2">{d.titulo || 'Título'}</h2>
            <p className="text-muted-foreground">{d.subtitulo || ''}</p>
          </div>
        );

      case 'dores_solucoes':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {d.tituloProblemas || 'Problemas'}
                </h3>
                <ul className="space-y-1 text-sm">
                  {(d.problemas || []).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <X className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h3 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {d.tituloSolucoes || 'Soluções'}
                </h3>
                <ul className="space-y-1 text-sm">
                  {(d.solucoes || []).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case 'diferenciais':
        return (
          <div>
            <h3 className="font-bold mb-3">{d.titulo || 'Nossos Diferenciais'}</h3>
            <div className="grid grid-cols-3 gap-3">
              {(d.itens || []).map((item: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-3 text-center">
                    <Award className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <p className="font-medium text-sm">{item.titulo || item}</p>
                    {item.descricao && <p className="text-xs text-muted-foreground mt-1">{item.descricao}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'precos':
        const formato = d.formato || 'planos';
        
        if (formato === 'planos') {
          return (
            <div>
              <h3 className="font-bold mb-3">{d.titulo || 'Investimento'}</h3>
              <div className="grid grid-cols-3 gap-3">
                {(d.planos || []).map((plano: any, i: number) => (
                  <Card key={i} className={plano.recomendado ? 'border-purple-400 ring-2 ring-purple-200' : ''}>
                    <CardContent className="p-4 text-center">
                      {plano.recomendado && <Badge className="mb-2 bg-purple-600">Recomendado</Badge>}
                      <h4 className="font-bold">{plano.nome}</h4>
                      <p className="text-2xl font-bold text-purple-600 my-2">
                        R$ {(plano.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <ul className="text-sm space-y-1 text-left">
                        {(plano.itens || []).map((item: string, j: number) => (
                          <li key={j} className="flex items-start gap-1">
                            <Check className="h-3 w-3 text-green-500 shrink-0 mt-1" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        }
        
        return (
          <div>
            <h3 className="font-bold mb-3">{d.titulo || 'Investimento'}</h3>
            <Card>
              <CardContent className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Item</th>
                      <th className="text-right p-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(d.itens || []).map((item: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{item.nome || item}</td>
                        <td className="p-2 text-right">
                          R$ {(item.precoUnitario || item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        );

      case 'pagamento':
        return (
          <div>
            <h3 className="font-bold mb-3">{d.titulo || 'Condições de Pagamento'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Formas de Pagamento
                  </h4>
                  <ul className="text-sm space-y-1">
                    {(d.itens || []).map((item: string, i: number) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Garantias
                  </h4>
                  <ul className="text-sm space-y-1">
                    {(d.garantias || []).map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-1">
                        <Check className="h-3 w-3 text-green-500 shrink-0 mt-1" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="text-center py-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <h3 className="text-xl font-bold mb-2">{d.titulo || 'Próximos Passos'}</h3>
            <p className="text-muted-foreground mb-4">{d.texto || ''}</p>
          </div>
        );

      case 'texto':
        return (
          <div>
            {d.titulo && <h3 className="font-bold mb-2">{d.titulo}</h3>}
            <p className="text-sm whitespace-pre-wrap">{d.texto || ''}</p>
          </div>
        );

      case 'imagem':
        return (
          <div className="text-center">
            {d.src && <img src={d.src} alt={d.legenda || 'Imagem'} className="max-w-full mx-auto rounded-lg" />}
            {d.legenda && <p className="text-sm text-muted-foreground mt-2">{d.legenda}</p>}
          </div>
        );

      case 'tabela':
        return (
          <div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  {(d.colunas || []).map((col: string, i: number) => (
                    <th key={i} className="border p-2 text-left">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(d.linhas || []).map((row: string[], i: number) => (
                  <tr key={i}>
                    {row.map((cell: string, j: number) => (
                      <td key={j} className="border p-2">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'rodape':
        return (
          <div 
            className="p-4 rounded-lg text-white text-center" 
            style={{ backgroundColor: d.bgColor || '#1a1a2e' }}
          >
            <div className="flex items-center justify-center gap-4 mb-2">
              {d.logoUrl && <img src={d.logoUrl} alt="Logo" className="h-8 w-8 object-contain bg-white rounded p-1" />}
              <span className="font-bold">{d.companyName || ''}</span>
            </div>
            <div className="text-sm text-white/80 space-y-1">
              {d.endereco && <p>{d.endereco}</p>}
              <p>
                {d.telefone && <span>{d.telefone}</span>}
                {d.telefone && d.email && <span> | </span>}
                {d.email && <span>{d.email}</span>}
              </p>
              {d.website && <p>{d.website}</p>}
            </div>
            {d.textoLegal && <p className="text-xs text-white/60 mt-2">{d.textoLegal}</p>}
          </div>
        );

      case 'separador':
        return <Separator className="my-4" />;

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-muted-foreground">Carregando proposta...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-bold mb-2">Proposta não encontrada</h1>
            <p className="text-muted-foreground">{error || 'O link pode estar incorreto ou a proposta foi removida.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header fixo */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-purple-600" />
            <div>
              <h1 className="font-bold text-sm">{proposal.title}</h1>
              <p className="text-xs text-muted-foreground">
                Compartilhada em {new Date(proposal.sharedAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {proposal.status === 'pendente' ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => handleFeedback('reprovar')}
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  Reprovar
                </Button>
                <Button 
                  size="sm" 
                  className="text-xs bg-green-600 hover:bg-green-700"
                  onClick={() => handleFeedback('aprovar')}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Aprovar
                </Button>
              </>
            ) : (
              <Badge 
                className={proposal.status === 'aprovada' ? 'bg-green-600' : 'bg-red-600'}
              >
                {proposal.status === 'aprovada' ? 'Aprovada' : 'Reprovada'}
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={generatePDF}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo da proposta */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div 
          ref={contentRef}
          className="bg-white shadow-lg rounded-lg overflow-hidden"
          style={{ padding: '40px' }}
        >
          <div className="space-y-6">
            {proposal.blocks.map((block) => (
              <div key={block.id}>
                {renderBlockContent(block)}
              </div>
            ))}
          </div>
        </div>

        {/* Área de comentários se já respondeu */}
        {proposal.status !== 'pendente' && proposal.clienteComentario && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Seu comentário
              </h3>
              <p className="text-sm text-muted-foreground">{proposal.clienteComentario}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Feedback */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {feedbackType === 'aprovar' ? (
                <>
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                  Aprovar Proposta
                </>
              ) : (
                <>
                  <ThumbsDown className="h-5 w-5 text-red-600" />
                  Reprovar Proposta
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {feedbackType === 'aprovar' 
                ? 'Ao aprovar, você confirma o interesse em prosseguir com esta proposta.'
                : 'Por favor, nos conte o motivo para podermos melhorar nossa oferta.'}
            </p>
            <div>
              <label className="text-sm font-medium">Comentário (opcional)</label>
              <Textarea 
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder={feedbackType === 'aprovar' 
                  ? 'Alguma observação ou solicitação especial?'
                  : 'O que podemos melhorar?'}
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setFeedbackOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                className={`flex-1 ${feedbackType === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={submitFeedback}
              >
                {feedbackType === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Reprovação'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
