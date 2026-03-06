import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;
import { 
  Shield, 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  FileKey,
  Calendar,
  Building2,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Info,
  Pencil,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CertificadoInfo {
  cn: string;
  ou?: string;
  o?: string;
  serialNumber: string;
  validoDe: string;
  validoAte: string;
  emissor: string;
  expirado?: boolean;
}

interface CertificadoA1ConfigProps {
  empresaId: string;
}

export function CertificadoA1Config({ empresaId }: CertificadoA1ConfigProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [removing, setRemoving] = useState(false);
  
  const [certificadoConfigurado, setCertificadoConfigurado] = useState(false);
  const [certificadoInfo, setCertificadoInfo] = useState<CertificadoInfo | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const [arquivoPfx, setArquivoPfx] = useState<File | null>(null);
  const [senhaCertificado, setSenhaCertificado] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  
  const [validacaoResultado, setValidacaoResultado] = useState<{
    valido: boolean;
    mensagem: string;
    certificado?: CertificadoInfo;
    dica?: string;
  } | null>(null);

  const carregarCertificado = useCallback(async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const { data, error } = await db
        .from('empresas')
        .select('certificado_a1_cn, certificado_a1_emissor, certificado_a1_validade, certificado_a1_serial')
        .eq('id', empresaId)
        .single();
      
      if (error) throw error;
      
      if (data?.certificado_a1_cn) {
        setCertificadoConfigurado(true);
        const validade = data.certificado_a1_validade ? parseISO(data.certificado_a1_validade) : null;
        const expirado = validade ? validade < new Date() : false;
        
        setCertificadoInfo({
          cn: data.certificado_a1_cn,
          serialNumber: data.certificado_a1_serial || '',
          validoAte: data.certificado_a1_validade || '',
          validoDe: '',
          emissor: data.certificado_a1_emissor || '',
          expirado,
        });
      } else {
        setCertificadoConfigurado(false);
        setCertificadoInfo(null);
      }
    } catch (error: any) {
      console.error('Erro ao carregar certificado:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar informacoes do certificado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [empresaId, toast]);

  useEffect(() => {
    carregarCertificado();
  }, [carregarCertificado]);

  // Traduz erros técnicos em mensagens amigáveis para o usuário
  const traduzirErroCertificado = (erro: string): { titulo: string; descricao: string; dica?: string } => {
    const erroLower = erro.toLowerCase();
    
    if (erroLower.includes('mac could not be verified') || erroLower.includes('invalid password')) {
      return {
        titulo: 'Senha incorreta',
        descricao: 'A senha informada não corresponde ao certificado.',
        dica: 'Verifique se digitou a senha corretamente. A senha é fornecida pela Autoridade Certificadora no momento da emissão do certificado.'
      };
    }
    
    if (erroLower.includes('not a valid pkcs#12') || erroLower.includes('invalid pfx')) {
      return {
        titulo: 'Arquivo inválido',
        descricao: 'O arquivo selecionado não é um certificado digital válido.',
        dica: 'Certifique-se de selecionar um arquivo .pfx ou .p12 válido emitido por uma Autoridade Certificadora ICP-Brasil.'
      };
    }
    
    if (erroLower.includes('expired') || erroLower.includes('expirado')) {
      return {
        titulo: 'Certificado expirado',
        descricao: 'Este certificado já passou da data de validade.',
        dica: 'Entre em contato com sua Autoridade Certificadora para renovar o certificado.'
      };
    }
    
    if (erroLower.includes('corrupted') || erroLower.includes('corrompido')) {
      return {
        titulo: 'Arquivo corrompido',
        descricao: 'O arquivo do certificado está danificado.',
        dica: 'Tente baixar o certificado novamente ou entre em contato com a Autoridade Certificadora.'
      };
    }
    
    if (erroLower.includes('network') || erroLower.includes('fetch') || erroLower.includes('conexao')) {
      return {
        titulo: 'Erro de conexão',
        descricao: 'Não foi possível conectar ao servidor de validação.',
        dica: 'Verifique sua conexão com a internet e tente novamente.'
      };
    }
    
    if (erroLower.includes('backend') || erroLower.includes('configurado')) {
      return {
        titulo: 'Sistema não configurado',
        descricao: 'O servidor de validação não está configurado corretamente.',
        dica: 'Entre em contato com o suporte técnico.'
      };
    }
    
    // Erro genérico
    return {
      titulo: 'Erro ao validar certificado',
      descricao: erro || 'Ocorreu um erro inesperado.',
      dica: 'Verifique se o arquivo e a senha estão corretos. Se o problema persistir, entre em contato com o suporte.'
    };
  };

  const handleArquivoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pfx') && !file.name.toLowerCase().endsWith('.p12')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Selecione um arquivo de certificado digital (.pfx ou .p12)',
          variant: 'destructive',
        });
        return;
      }
      setArquivoPfx(file);
      setValidacaoResultado(null);
    }
  };

  const validarCertificado = async () => {
    if (!arquivoPfx || !senhaCertificado) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione o arquivo e informe a senha',
        variant: 'destructive',
      });
      return;
    }
    
    setValidating(true);
    setValidacaoResultado(null);
    
    try {
      const arrayBuffer = await arquivoPfx.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const esocialBackendUrl = import.meta.env.VITE_ESOCIAL_BACKEND_URL;
      if (!esocialBackendUrl || esocialBackendUrl.includes('seu-backend-esocial')) {
        toast({
          title: 'Backend nao configurado',
          description: 'URL do backend eSocial nao esta configurada',
          variant: 'destructive',
        });
        return;
      }
      
      const response = await fetch(`${esocialBackendUrl}/api/pdf/validate-certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pfxBase64: base64,
          senha: senhaCertificado,
        }),
      });
      
      const resultado = await response.json();
      
      if (resultado.success) {
        setValidacaoResultado({
          valido: resultado.valido,
          mensagem: resultado.mensagem,
          certificado: resultado.certificado,
        });
        
        if (resultado.valido) {
          toast({
            title: 'Certificado valido!',
            description: `CN: ${resultado.certificado.cn}`,
          });
        } else {
          toast({
            title: 'Certificado invalido',
            description: resultado.mensagem,
            variant: 'destructive',
          });
        }
      } else {
        const erroTraduzido = traduzirErroCertificado(resultado.error || '');
        setValidacaoResultado({
          valido: false,
          mensagem: erroTraduzido.descricao,
          dica: erroTraduzido.dica,
        });
        toast({
          title: erroTraduzido.titulo,
          description: erroTraduzido.descricao,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erro ao validar certificado:', error);
      const erroTraduzido = traduzirErroCertificado(error?.message || 'conexao');
      setValidacaoResultado({
        valido: false,
        mensagem: erroTraduzido.descricao,
        dica: erroTraduzido.dica,
      });
      toast({
        title: erroTraduzido.titulo,
        description: erroTraduzido.descricao,
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const salvarCertificado = async () => {
    if (!validacaoResultado?.valido || !validacaoResultado.certificado) {
      toast({
        title: 'Valide primeiro',
        description: 'Valide o certificado antes de salvar',
        variant: 'destructive',
      });
      return;
    }
    
    if (!arquivoPfx || !senhaCertificado) return;
    
    setSaving(true);
    try {
      const arrayBuffer = await arquivoPfx.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const cert = validacaoResultado.certificado;
      
      const { error } = await db
        .from('empresas')
        .update({
          certificado_a1_base64: base64,
          certificado_a1_senha: senhaCertificado,
          certificado_a1_cn: cert.cn,
          certificado_a1_emissor: cert.emissor,
          certificado_a1_validade: cert.validoAte,
          certificado_a1_serial: cert.serialNumber,
          certificado_a1_atualizado_em: new Date().toISOString(),
        })
        .eq('id', empresaId);
      
      if (error) throw error;
      
      toast({
        title: 'Certificado salvo!',
        description: 'Certificado A1 configurado com sucesso',
      });
      
      setArquivoPfx(null);
      setSenhaCertificado('');
      setValidacaoResultado(null);
      setModoEdicao(false);
      
      await carregarCertificado();
      
    } catch (error: any) {
      console.error('Erro ao salvar certificado:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel salvar o certificado',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const removerCertificado = async () => {
    if (!confirm('Tem certeza que deseja remover o certificado? Isso impedira a assinatura de documentos.')) {
      return;
    }
    
    setRemoving(true);
    try {
      const { error } = await db
        .from('empresas')
        .update({
          certificado_a1_base64: null,
          certificado_a1_senha: null,
          certificado_a1_cn: null,
          certificado_a1_emissor: null,
          certificado_a1_validade: null,
          certificado_a1_serial: null,
          certificado_a1_atualizado_em: null,
        })
        .eq('id', empresaId);
      
      if (error) throw error;
      
      toast({
        title: 'Certificado removido',
        description: 'Certificado A1 foi removido com sucesso',
      });
      
      setCertificadoConfigurado(false);
      setCertificadoInfo(null);
      
    } catch (error: any) {
      console.error('Erro ao remover certificado:', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel remover o certificado',
        variant: 'destructive',
      });
    } finally {
      setRemoving(false);
    }
  };

  const calcularDiasRestantes = (validoAte: string): number => {
    try {
      const validade = parseISO(validoAte);
      return differenceInDays(validade, new Date());
    } catch {
      return 0;
    }
  };

  const formatarData = (dataStr: string): string => {
    try {
      return format(parseISO(dataStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dataStr;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3">Carregando informacoes do certificado...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <CardTitle>Certificado Digital A1 (ICP-Brasil)</CardTitle>
                {certificadoConfigurado ? (
                  certificadoInfo?.expirado ? (
                    <Badge variant="destructive">Expirado</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Conectado</Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Desconectado</Badge>
                )}
              </div>
              <CardDescription>
                Configure o certificado digital para assinatura de documentos SST conforme Portaria 211/2019
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {certificadoConfigurado && !modoEdicao && expanded && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setModoEdicao(true); }}
                className="flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
            {expanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
      <CardContent className="space-y-6">
        {/* Informacao sobre ICP-Brasil */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Assinatura Digital Qualificada</AlertTitle>
          <AlertDescription>
            O certificado A1 ICP-Brasil garante validade juridica plena aos documentos assinados, 
            conforme MP 2.200-2/2001 e Portaria 211/2019. Certificados de treinamento SST 
            <strong> devem obrigatoriamente</strong> ser assinados digitalmente.
          </AlertDescription>
        </Alert>
        
        {/* Status do certificado atual */}
        {certificadoConfigurado && certificadoInfo && (
          <div className={`p-4 rounded-lg border-2 ${
            certificadoInfo.expirado 
              ? 'bg-red-50 border-red-200' 
              : calcularDiasRestantes(certificadoInfo.validoAte) <= 30
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {certificadoInfo.expirado ? (
                  <XCircle className="h-6 w-6 text-red-600 mt-1" />
                ) : calcularDiasRestantes(certificadoInfo.validoAte) <= 30 ? (
                  <AlertTriangle className="h-6 w-6 text-amber-600 mt-1" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                )}
                <div>
                  <h4 className="font-semibold text-lg">
                    {certificadoInfo.expirado ? 'Certificado Expirado' : 'Certificado Configurado'}
                  </h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><strong>Titular:</strong> {certificadoInfo.cn}</p>
                    <p><strong>Emissor:</strong> {certificadoInfo.emissor}</p>
                    <p><strong>Serial:</strong> {certificadoInfo.serialNumber?.substring(0, 20)}...</p>
                    <div className="flex items-center gap-2">
                      <span><strong>Validade:</strong>{' '}
                      {certificadoInfo.validoAte && formatarData(certificadoInfo.validoAte)}</span>
                      {!certificadoInfo.expirado && certificadoInfo.validoAte && (
                        <Badge 
                          variant={calcularDiasRestantes(certificadoInfo.validoAte) <= 30 ? 'destructive' : 'secondary'}
                        >
                          {calcularDiasRestantes(certificadoInfo.validoAte)} dias restantes
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={removerCertificado}
                disabled={removing}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="ml-2">Remover</span>
              </Button>
            </div>
            
            {certificadoInfo.expirado && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Acao necessaria</AlertTitle>
                <AlertDescription>
                  O certificado expirou e nao pode mais ser usado para assinatura. 
                  Por favor, faca upload de um novo certificado valido.
                </AlertDescription>
              </Alert>
            )}
            
            {!certificadoInfo.expirado && calcularDiasRestantes(certificadoInfo.validoAte) <= 30 && (
              <Alert className="mt-4 border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Atencao</AlertTitle>
                <AlertDescription className="text-amber-700">
                  O certificado vai expirar em breve. Providencie a renovacao para evitar interrupcoes.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {/* Formulario de upload - só mostra se não houver certificado ou em modo edição */}
        {(!certificadoConfigurado || modoEdicao) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <FileKey className="h-5 w-5" />
              {certificadoConfigurado ? 'Atualizar Certificado' : 'Configurar Certificado'}
            </h4>
            {modoEdicao && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setModoEdicao(false);
                  setArquivoPfx(null);
                  setSenhaCertificado('');
                  setValidacaoResultado(null);
                }}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            )}
          </div>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="arquivo-pfx">Arquivo do Certificado (.pfx ou .p12)</Label>
              <div className="mt-1.5">
                <Input
                  id="arquivo-pfx"
                  type="file"
                  accept=".pfx,.p12"
                  onChange={handleArquivoChange}
                  className="cursor-pointer"
                />
              </div>
              {arquivoPfx && (
                <p className="text-sm text-muted-foreground mt-1">
                  Arquivo selecionado: {arquivoPfx.name}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="senha-certificado">Senha do Certificado</Label>
              <div className="relative mt-1.5">
                <Input
                  id="senha-certificado"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senhaCertificado}
                  onChange={(e) => setSenhaCertificado(e.target.value)}
                  placeholder="Digite a senha do certificado"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Resultado da validacao */}
          {validacaoResultado && (
            <div className={`p-4 rounded-lg border-2 ${
              validacaoResultado.valido 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-start gap-3">
                {validacaoResultado.valido ? (
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${validacaoResultado.valido ? 'text-green-800' : 'text-red-800'}`}>
                    {validacaoResultado.valido ? 'Certificado válido!' : 'Falha ao ler certificado'}
                  </p>
                  <p className={`text-sm mt-1 ${validacaoResultado.valido ? 'text-green-700' : 'text-red-700'}`}>
                    {validacaoResultado.mensagem}
                  </p>
                  
                  {/* Dica para o usuário em caso de erro */}
                  {!validacaoResultado.valido && validacaoResultado.dica && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-800 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span><strong>Dica:</strong> {validacaoResultado.dica}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {validacaoResultado.certificado && (
                <div className="mt-4 p-3 bg-white/50 rounded-md border border-green-200">
                  <p className="text-sm font-medium text-green-800 mb-2">Informações do certificado:</p>
                  <div className="text-sm space-y-1 text-green-700">
                    <p><strong>Titular:</strong> {validacaoResultado.certificado.cn}</p>
                    <p><strong>Emissor:</strong> {validacaoResultado.certificado.emissor}</p>
                    <p><strong>Válido até:</strong> {formatarData(validacaoResultado.certificado.validoAte)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Botoes de acao */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={validarCertificado}
              disabled={!arquivoPfx || !senhaCertificado || validating}
            >
              {validating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Validando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Validar Certificado
                </>
              )}
            </Button>
            
            <Button
              onClick={salvarCertificado}
              disabled={!validacaoResultado?.valido || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Salvar Certificado
                </>
              )}
            </Button>
          </div>
        </div>
        )}
      </CardContent>
      )}
    </Card>
  );
}
