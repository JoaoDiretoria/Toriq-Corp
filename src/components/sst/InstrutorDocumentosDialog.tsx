import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { isDocumentFile, convertDocumentToJpg, getFileExtension } from '@/utils/documentToImage';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Loader2, 
  Upload, 
  FileImage, 
  Check, 
  X, 
  Eye,
  GraduationCap,
  Award,
  AlertCircle,
  Plus,
  FileWarning,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FORMACOES_ACADEMICAS = [
  'Técnico(a) em Segurança do Trabalho',
  'Engenheiro de Segurança do Trabalho',
  'Engenheiro(a) Eletricista',
  'Engenheiro(a) Mecânico(a)',
  'Eletrotécnico(a)',
  'Enfermeiro(a)',
];

interface InstrutorDocumentosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instrutor: {
    id: string;
    nome: string;
  } | null;
  onSuccess?: () => void;
  empresaIdOverride?: string; // Para empresa parceira passar o empresa_sst_id
}

interface Formacao {
  id: string;
  instrutor_id: string;
  nome: string;
  documento_url: string | null;
  created_at: string;
}

interface Treinamento {
  id: string;
  instrutor_id: string;
  treinamento_id: string | null;
  treinamento_nome?: string;
  documento_url: string | null;
  created_at: string;
}

export function InstrutorDocumentosDialog({
  open,
  onOpenChange,
  instrutor,
  onSuccess,
  empresaIdOverride,
}: InstrutorDocumentosDialogProps) {
  const { profile } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const defaultEmpresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : profile?.empresa_id;
  const empresaId = empresaIdOverride || defaultEmpresaId;

  const [loading, setLoading] = useState(true);
  const [formacoes, setFormacoes] = useState<Formacao[]>([]);
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [uploadingFormacao, setUploadingFormacao] = useState<string | null>(null);
  const [uploadingTreinamento, setUploadingTreinamento] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('formacoes');

  // Estados para adicionar nova formação
  const [showAddFormacao, setShowAddFormacao] = useState(false);
  const [novaFormacao, setNovaFormacao] = useState('');
  const [savingFormacao, setSavingFormacao] = useState(false);

  const formacaoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const treinamentoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Estados para confirmação de upload de documento (PDF/DOCX)
  const [documentConfirmOpen, setDocumentConfirmOpen] = useState(false);
  const [pendingDocumentFile, setPendingDocumentFile] = useState<File | null>(null);
  const [pendingDocumentType, setPendingDocumentType] = useState<'formacao' | 'treinamento' | null>(null);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const [convertingDocument, setConvertingDocument] = useState(false);

  useEffect(() => {
    if (open && instrutor) {
      fetchDocumentos();
      // Reset estados ao abrir
      setShowAddFormacao(false);
      setNovaFormacao('');
      setActiveTab('formacoes');
    }
  }, [open, instrutor]);

  const fetchDocumentos = async () => {
    if (!instrutor) return;

    setLoading(true);
    try {
      const db = supabase as any;
      
      // Buscar formações (inclui anexo_url)
      const { data: formacoesData, error: formacoesError } = await db
        .from('instrutor_formacoes')
        .select('id, instrutor_id, nome, documento_url, anexo_url, created_at')
        .eq('instrutor_id', instrutor.id)
        .order('nome');

      if (formacoesError) throw formacoesError;
      
      // Mapear para usar anexo_url como documento_url se disponível
      const mappedFormacoes = (formacoesData || []).map((f: any) => ({
        ...f,
        documento_url: f.anexo_url || f.documento_url
      }));
      setFormacoes(mappedFormacoes);

      // Buscar APENAS treinamentos vinculados a formações (da tabela instrutor_formacao_treinamento)
      // Não usar mais a tabela instrutor_treinamentos que tem dados órfãos
      const { data: vinculosData, error: vinculosError } = await db
        .from('instrutor_formacao_treinamento')
        .select('id, treinamento_id, anexo_url, catalogo_treinamentos (id, nome, norma)')
        .eq('instrutor_id', instrutor.id);

      if (vinculosError) throw vinculosError;

      // Mapear vínculos como treinamentos (apenas os que estão vinculados a formações)
      const mappedTreinamentos = (vinculosData || []).map((v: any) => ({
        id: v.id,
        instrutor_id: instrutor.id,
        treinamento_id: v.treinamento_id,
        treinamento_nome: v.catalogo_treinamentos?.nome || 'Treinamento não encontrado',
        treinamento_norma: v.catalogo_treinamentos?.norma || '',
        documento_url: v.anexo_url
      }));
      
      // Ordenar por norma
      mappedTreinamentos.sort((a: any, b: any) => {
        const numA = parseInt(a.treinamento_norma?.replace(/\D/g, '') || '999');
        const numB = parseInt(b.treinamento_norma?.replace(/\D/g, '') || '999');
        return numA - numB;
      });
      
      setTreinamentos(mappedTreinamentos);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File, allowDocuments: boolean = true): boolean => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const documentTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    
    const validTypes = allowDocuments ? [...imageTypes, ...documentTypes] : imageTypes;
    
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Formatos aceitos: JPEG, PNG, PDF ou DOCX.');
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB para documentos
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return false;
    }

    return true;
  };

  // Processar arquivo - se for documento, pedir confirmação
  const processFile = async (file: File, type: 'formacao' | 'treinamento', id: string) => {
    if (!validateFile(file)) return;

    // Se for documento (PDF/DOCX), pedir confirmação
    if (isDocumentFile(file)) {
      setPendingDocumentFile(file);
      setPendingDocumentType(type);
      setPendingDocumentId(id);
      setDocumentConfirmOpen(true);
      return;
    }

    // Se for imagem, fazer upload direto
    if (type === 'formacao') {
      await uploadFormacaoDocumento(id, file);
    } else {
      await uploadTreinamentoDocumento(id, file);
    }
  };

  // Confirmar e processar documento (PDF/DOCX)
  const handleConfirmDocumentUpload = async () => {
    if (!pendingDocumentFile || !pendingDocumentType || !pendingDocumentId) return;

    setConvertingDocument(true);
    try {
      // Converter documento para JPG
      const jpgFile = await convertDocumentToJpg(pendingDocumentFile);
      
      // Fazer upload do JPG convertido
      if (pendingDocumentType === 'formacao') {
        await uploadFormacaoDocumento(pendingDocumentId, jpgFile);
      } else {
        await uploadTreinamentoDocumento(pendingDocumentId, jpgFile);
      }
      
      toast.success('Documento convertido e enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao converter documento:', error);
      toast.error('Erro ao converter documento. Tente enviar como foto.');
    } finally {
      setConvertingDocument(false);
      setDocumentConfirmOpen(false);
      setPendingDocumentFile(null);
      setPendingDocumentType(null);
      setPendingDocumentId(null);
    }
  };

  // Cancelar upload de documento
  const handleCancelDocumentUpload = () => {
    setDocumentConfirmOpen(false);
    setPendingDocumentFile(null);
    setPendingDocumentType(null);
    setPendingDocumentId(null);
  };

  const uploadFormacaoDocumento = async (formacaoId: string, file: File) => {
    if (!validateFile(file)) return;
    if (!instrutor) {
      toast.error('Instrutor não encontrado');
      return;
    }
    if (!empresaId) {
      toast.error('Empresa não identificada. Tente recarregar a página.');
      return;
    }

    setUploadingFormacao(formacaoId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${empresaId}/instrutores/${instrutor.id}/formacoes/${formacaoId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('instrutor-documentos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('instrutor-documentos')
        .getPublicUrl(fileName);

      const db = supabase as any;
      const { error: updateError } = await db
        .from('instrutor_formacoes')
        .update({ anexo_url: urlData.publicUrl })
        .eq('id', formacaoId);

      if (updateError) throw updateError;

      toast.success('Documento da formação enviado com sucesso!');
      fetchDocumentos();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar documento');
    } finally {
      setUploadingFormacao(null);
    }
  };

  const uploadTreinamentoDocumento = async (vinculoId: string, file: File) => {
    if (!validateFile(file)) return;
    if (!instrutor) {
      toast.error('Instrutor não encontrado');
      return;
    }
    if (!empresaId) {
      toast.error('Empresa não identificada. Tente recarregar a página.');
      return;
    }

    setUploadingTreinamento(vinculoId);
    try {
      const db = supabase as any;
      const fileExt = file.name.split('.').pop();
      const fileName = `${empresaId}/instrutores/${instrutor.id}/treinamentos/${vinculoId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('instrutor-documentos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('instrutor-documentos')
        .getPublicUrl(fileName);

      // Atualizar anexo_url na tabela instrutor_formacao_treinamento (não mais instrutor_treinamentos)
      const { error: updateError } = await db
        .from('instrutor_formacao_treinamento')
        .update({ anexo_url: urlData.publicUrl })
        .eq('id', vinculoId);

      if (updateError) throw updateError;

      toast.success('Documento de proficiência enviado com sucesso!');
      fetchDocumentos();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar documento');
    } finally {
      setUploadingTreinamento(null);
    }
  };

  const handleFormacaoFileChange = (formacaoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, 'formacao', formacaoId);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const handleTreinamentoFileChange = (treinamentoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, 'treinamento', treinamentoId);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const openDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const handleAddFormacao = async () => {
    if (!novaFormacao.trim() || !instrutor) {
      toast.error('Digite o nome da formação');
      return;
    }

    setSavingFormacao(true);
    try {
      const { error } = await supabase
        .from('instrutor_formacoes')
        .insert({
          instrutor_id: instrutor.id,
          nome: novaFormacao.trim(),
        });

      if (error) throw error;

      // Atualizar contador de formações no instrutor
      await supabase
        .from('instrutores')
        .update({ formacoes_count: (formacoes.length + 1) })
        .eq('id', instrutor.id);

      toast.success('Formação cadastrada com sucesso!');
      setNovaFormacao('');
      setShowAddFormacao(false);
      fetchDocumentos();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao cadastrar formação:', error);
      toast.error('Erro ao cadastrar formação');
    } finally {
      setSavingFormacao(false);
    }
  };

  if (!instrutor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Documentos Comprobatórios
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Instrutor: <span className="font-medium">{instrutor.nome}</span>
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="formacoes" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Formações Acadêmicas
              </TabsTrigger>
              <TabsTrigger value="treinamentos" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Treinamentos que ministra
              </TabsTrigger>
            </TabsList>

            {/* Tab Formações Acadêmicas */}
            <TabsContent value="formacoes" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="bg-muted/50 p-3 rounded-lg flex-1 mr-3">
                    <p className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Faça upload do diploma ou carteirinha do conselho com registro profissional para comprovar a formação acadêmica. Formatos aceitos: JPEG, PNG, PDF ou DOCX (máx. 10MB). Recomendamos enviar como foto para melhor qualidade.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowAddFormacao(!showAddFormacao)}
                    className="bg-primary hover:bg-primary/90 flex-shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Formação
                  </Button>
                </div>

                {/* Formulário para adicionar nova formação */}
                {showAddFormacao && (
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                    <Label>Formação Acadêmica</Label>
                    <div className="flex gap-2">
                      <Select value={novaFormacao} onValueChange={setNovaFormacao}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione a formação acadêmica" />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMACOES_ACADEMICAS
                            .filter(f => !formacoes.some(existente => existente.nome === f))
                            .map((formacao) => (
                              <SelectItem key={formacao} value={formacao}>
                                {formacao}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleAddFormacao}
                        disabled={savingFormacao || !novaFormacao.trim()}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {savingFormacao ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Salvar'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddFormacao(false);
                          setNovaFormacao('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {formacoes.length === 0 && !showAddFormacao ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma formação acadêmica cadastrada para este instrutor.</p>
                    <p className="text-sm">Clique em "Adicionar Formação" para cadastrar.</p>
                  </div>
                ) : formacoes.length > 0 ? (
                  <div className="space-y-3">
                    {formacoes.map((formacao) => (
                      <div
                        key={formacao.id}
                        className={cn(
                          "flex items-center justify-between p-4 border rounded-lg transition-colors",
                          formacao.documento_url 
                            ? "bg-success/5 border-success/20" 
                            : "bg-warning/5 border-warning/20"
                        )}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{formacao.nome}</p>
                          <p className="text-sm">
                            {formacao.documento_url ? (
                              <span className="flex items-center gap-1.5 text-success">
                                <span className="w-2 h-2 rounded-full bg-success"></span>
                                Documento enviado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-warning">
                                <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                                Documento pendente
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {formacao.documento_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDocument(formacao.documento_url!)}
                              className="border-success/30 text-success hover:bg-success/10"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Visualizar
                            </Button>
                          )}

                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf,.docx,image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            ref={(el) => (formacaoInputRefs.current[formacao.id] = el)}
                            onChange={(e) => handleFormacaoFileChange(formacao.id, e)}
                          />
                          <Button
                            variant={formacao.documento_url ? "outline" : "default"}
                            size="sm"
                            onClick={() => formacaoInputRefs.current[formacao.id]?.click()}
                            disabled={uploadingFormacao === formacao.id}
                            className={cn(
                              formacao.documento_url 
                                ? "border-border" 
                                : "bg-primary hover:bg-primary/90"
                            )}
                          >
                            {uploadingFormacao === formacao.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <FileImage className="h-4 w-4 mr-1" />
                                {formacao.documento_url ? 'Substituir' : 'Upload'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </TabsContent>

            {/* Tab Treinamentos */}
            <TabsContent value="treinamentos" className="mt-4">
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Faça upload de documentos que comprovem a proficiência do instrutor para ministrar os treinamentos (certificados, carteira de trabalho com experiência, declarações, etc.). Formatos aceitos: JPEG, PNG, PDF ou DOCX (máx. 10MB). Recomendamos enviar como foto para melhor qualidade.
                  </p>
                  <p className="text-xs text-primary mt-2 flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Os treinamentos são vinculados às formações. Para adicionar novos treinamentos, edite o instrutor e vincule-os a uma formação.
                  </p>
                </div>

                {treinamentos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum treinamento vinculado às formações deste instrutor.</p>
                    <p className="text-sm">Edite o instrutor para vincular treinamentos às formações.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {treinamentos.map((treinamento) => (
                      <div
                        key={treinamento.id}
                        className={cn(
                          "flex items-center justify-between p-4 border rounded-lg transition-colors",
                          treinamento.documento_url 
                            ? "bg-success/5 border-success/20" 
                            : "bg-warning/5 border-warning/20"
                        )}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{treinamento.treinamento_nome}</p>
                          <p className="text-sm">
                            {treinamento.documento_url ? (
                              <span className="flex items-center gap-1.5 text-success">
                                <span className="w-2 h-2 rounded-full bg-success"></span>
                                Comprovante enviado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-warning">
                                <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                                Comprovante pendente
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {treinamento.documento_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDocument(treinamento.documento_url!)}
                              className="border-success/30 text-success hover:bg-success/10"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Visualizar
                            </Button>
                          )}

                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf,.docx,image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            ref={(el) => (treinamentoInputRefs.current[treinamento.id] = el)}
                            onChange={(e) => handleTreinamentoFileChange(treinamento.id, e)}
                          />
                          <Button
                            variant={treinamento.documento_url ? "outline" : "default"}
                            size="sm"
                            onClick={() => treinamentoInputRefs.current[treinamento.id]?.click()}
                            disabled={uploadingTreinamento === treinamento.id}
                            className={cn(
                              treinamento.documento_url 
                                ? "border-border" 
                                : "bg-primary hover:bg-primary/90"
                            )}
                          >
                            {uploadingTreinamento === treinamento.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <FileImage className="h-4 w-4 mr-1" />
                                {treinamento.documento_url ? 'Substituir' : 'Upload'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>

      {/* Dialog de confirmação para upload de PDF/DOCX */}
      <AlertDialog open={documentConfirmOpen} onOpenChange={setDocumentConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <FileWarning className="h-5 w-5" />
              Funcionalidade Experimental
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está enviando um arquivo <strong>{pendingDocumentFile ? getFileExtension(pendingDocumentFile).toUpperCase() : ''}</strong>.
              </p>
              <p>
                Vamos extrair apenas a <strong>primeira página</strong> do documento e convertê-la para imagem (JPG) como comprovante.
              </p>
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-3">
                <p className="text-sm flex items-start gap-2">
                  <ImageIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-warning" />
                  <span>
                    <strong>Recomendação:</strong> Para melhor qualidade, envie como <strong>imagem digital</strong> (JPG/PNG) ou <strong>documento escaneado</strong> em formato de imagem.
                  </span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Tem certeza que deseja continuar com o envio do {pendingDocumentFile ? getFileExtension(pendingDocumentFile).toUpperCase() : 'documento'}?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDocumentUpload} disabled={convertingDocument}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDocumentUpload}
              disabled={convertingDocument}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              {convertingDocument ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Convertendo...
                </>
              ) : (
                'Sim, enviar mesmo assim'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
