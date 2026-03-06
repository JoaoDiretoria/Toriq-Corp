import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileType, Plus, Pencil, Trash2, Loader2, Eye, Upload, Download,
  ChevronDown, ChevronUp, Copy, X, FileText, Layers, Maximize2, Minimize2
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface Treinamento {
  id: string;
  nome: string;
  norma: string;
}

interface Moldura {
  id: string;
  nome: string;
  url: string;
}

interface PaginaCertificado {
  id?: string;
  numero: number;
  nome: string;
  conteudo: string;
  moldura_url?: string;
}

interface ModeloRelatorio {
  id: string;
  nome: string;
  tipo: 'certificado';
  selecao_treinamento: 'todos' | 'individual' | 'todos_exceto';
  largura: number;
  altura: number;
  moldura_url?: string;
  ativo: boolean;
  created_at: string;
  treinamentos?: { treinamento_id: string }[];
  paginas?: PaginaCertificado[];
}

interface TemplateModelo {
  id: string;
  nome: string;
  descricao: string;
  tamanho: string;
  orientacao: 'portrait' | 'landscape';
  paginas: { nome: string; conteudo: string }[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const TAMANHOS_PAGINA = [
  { id: 'a4', nome: 'A4', largura: 794, altura: 1123 },
  { id: 'a3', nome: 'A3', largura: 1123, altura: 1587 },
  { id: 'a5', nome: 'A5', largura: 559, altura: 794 },
  { id: 'letter', nome: 'Carta (Letter)', largura: 816, altura: 1056 },
  { id: 'legal', nome: 'Ofício (Legal)', largura: 816, altura: 1344 },
];

const VARIAVEIS_CERTIFICADO = [
  { codigo: '{LOGO_EMPRESA}', descricao: 'Logo da empresa' },
  { codigo: '{COLABORADOR_NOME}', descricao: 'Nome do colaborador' },
  { codigo: '{COLABORADOR_CPF}', descricao: 'CPF do colaborador' },
  { codigo: '{COLABORADOR_EMPRESA}', descricao: 'Empresa do colaborador' },
  { codigo: '{COLABORADOR_LOCAL}', descricao: 'Local/Endereço' },
  { codigo: '{COLABORADOR_ASSINATURA}', descricao: 'Assinatura do colaborador (imagem)' },
  { codigo: '{TREINAMENTO_NOME}', descricao: 'Nome do treinamento' },
  { codigo: '{TREINAMENTO_NR}', descricao: 'Norma regulamentadora' },
  { codigo: '{TREINAMENTO_CH}', descricao: 'Carga horária' },
  { codigo: '{TREINAMENTO_DATA}', descricao: 'Data do treinamento' },
  { codigo: '{TREINAMENTO_CP}', descricao: 'Conteúdo programático' },
  { codigo: '{TREINAMENTO_VALIDADE}', descricao: 'Data de validade' },
  { codigo: '{TURMA_TIPO}', descricao: 'Tipo: Inicial (Formação), Periódico (Reciclagem), Eventual' },
  { codigo: '{TURMA_CODIGO}', descricao: 'Código da turma' },
  { codigo: '{INSTRUTOR_NOME}', descricao: 'Nome do instrutor' },
  { codigo: '{DATA_ATUAL}', descricao: 'Data atual' },
  { codigo: '{QRCODE_VALIDACAO}', descricao: 'QR Code de validação' },
  { codigo: '{ASSINATURAS}', descricao: 'Bloco de assinaturas (Responsável Técnico + Instrutor)' },
  { codigo: '{ASSINATURA_RESPONSAVEL_TECNICO}', descricao: 'Assinatura do Responsável Técnico da empresa SST' },
  { codigo: '{ASSINATURA_INSTRUTOR}', descricao: 'Assinatura do Instrutor' },
  { codigo: '{EMPRESA_SST_NOME}', descricao: 'Nome da empresa SST' },
  { codigo: '{EMPRESA_SST_CNPJ}', descricao: 'CNPJ da empresa SST' },
  { codigo: '{EMPRESA_SST_ENDERECO}', descricao: 'Endereço completo da empresa SST' },
  { codigo: '{CATEGORIZACAO_TECNICA}', descricao: 'Categorização técnica: tipos de espaço, atividades e responsáveis' },
];

const TEMPLATE_FRENTE = `<div style="box-sizing: border-box; width: 100%; height: 100%; padding: 60px 80px; font-family: Georgia, 'Times New Roman', serif; position: relative;">
  <div style="position: absolute; top: 50px; right: 80px; z-index: 2;">
    <div style="max-width: 140px;">{LOGO_EMPRESA}</div>
  </div>
  <div style="position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
    <div style="margin-bottom: 24px;">
      <div style="font-size: 20px; letter-spacing: 5px; color: #333; text-transform: uppercase; font-weight: 500;">Certificamos que</div>
      <div style="margin-top: 16px; font-size: 30px; font-weight: 700; letter-spacing: 1px; color: #111;">{COLABORADOR_NOME}</div>
      <div style="margin-top: 8px; font-size: 13px; color: #555;">CPF: {COLABORADOR_CPF}</div>
    </div>
    <div style="width: 88%; max-width: 820px; font-size: 15px; color: #2f2f2f; line-height: 1.75; margin: 10px 0 28px 0;">
      Colaborador(a) da empresa <b>{COLABORADOR_EMPRESA}</b> concluiu o Treinamento "<b>{TREINAMENTO_NOME}</b>", de acordo com a Norma <b>{TREINAMENTO_NR}</b> do MTE, com carga horária de <b>{TREINAMENTO_CH} horas</b>, obtendo aproveitamento satisfatório, conforme registro no verso deste.
    </div>
    <div style="display: flex; gap: 36px; justify-content: center; flex-wrap: wrap; margin-bottom: 28px;">
      <div style="font-size: 13px; color: #333;"><b>Data:</b> {TREINAMENTO_DATA}</div>
      <div style="font-size: 13px; color: #333;"><b>Local:</b> {COLABORADOR_LOCAL}</div>
    </div>
    <div style="width: 88%; margin-top: 16px;">{ASSINATURAS}</div>
  </div>
</div>`;

const TEMPLATE_VERSO = `<div style="box-sizing: border-box; width: 100%; height: 100%; padding: 60px 80px; font-family: Arial, Helvetica, sans-serif; position: relative;">
  <div style="position: absolute; top: 50px; right: 80px; z-index: 2;">
    <div style="max-width: 140px;">{LOGO_EMPRESA}</div>
  </div>
  <div style="position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column;">
    <div style="text-align: center; margin-top: 20px; margin-bottom: 20px;">
      <div style="font-size: 20px; font-weight: 700; letter-spacing: 3px; color: #222; text-transform: uppercase;">Conteúdo Programático</div>
    </div>
    <div style="flex: 1; padding: 20px; overflow: hidden;">
      <div style="font-size: 13px; color: #333; line-height: 1.7;">{TREINAMENTO_CP}</div>
    </div>
    <div style="margin-top: 20px; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px;">
      <div style="min-width: 45%; text-align: center;">
        <div style="min-height: 50px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 4px;">{COLABORADOR_ASSINATURA}</div>
        <div style="width: 220px; border-bottom: 1px solid #333; margin: 0 auto 8px auto;"></div>
        <div style="font-size: 13px; font-weight: 700; color: #222; margin: 0;">{COLABORADOR_NOME}</div>
        <div style="font-size: 11px; color: #555; margin-top: 3px;">CPF: {COLABORADOR_CPF}</div>
      </div>
      <div style="text-align: right; max-width: 280px;">
        <div style="font-size: 12px; color: #333; margin: 0; font-weight: 600;">Validade: {TREINAMENTO_VALIDADE}</div>
        <div style="font-size: 12px; color: #333; margin-top: 8px; font-weight: 600;">{EMPRESA_SST_NOME}</div>
        <div style="font-size: 10px; color: #555; margin-top: 2px;">CNPJ: {EMPRESA_SST_CNPJ}</div>
        <div style="font-size: 10px; color: #555; margin-top: 4px; line-height: 1.4;">{EMPRESA_SST_ENDERECO}</div>
      </div>
    </div>
  </div>
</div>`;

const TEMPLATES_PRONTOS: TemplateModelo[] = [
  {
    id: 'modelo-1',
    nome: 'Modelo Padrão',
    descricao: 'Certificado profissional com moldura dourada',
    tamanho: 'a4',
    orientacao: 'landscape',
    paginas: [
      { nome: 'Frente', conteudo: TEMPLATE_FRENTE },
      { nome: 'Verso', conteudo: TEMPLATE_VERSO },
    ],
  },
];

// ============================================================================
// COMPONENTE
// ============================================================================

export function SSTModeloRelatorio() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();

  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modelos, setModelos] = useState<ModeloRelatorio[]>([]);
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [molduras, setMolduras] = useState<Moldura[]>([]);
  const [logoEmpresa, setLogoEmpresa] = useState<string>('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modeloToDelete, setModeloToDelete] = useState<ModeloRelatorio | null>(null);
  const [editingModelo, setEditingModelo] = useState<ModeloRelatorio | null>(null);

  const [formNome, setFormNome] = useState('');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formSelecaoTreinamento, setFormSelecaoTreinamento] = useState<'todos' | 'individual' | 'todos_exceto'>('todos');
  const [formTreinamentosSelecionados, setFormTreinamentosSelecionados] = useState<string[]>([]);
  const [formFonteModelo, setFormFonteModelo] = useState<'pronto' | 'personalizado'>('pronto');
  const [formTemplateSelecionado, setFormTemplateSelecionado] = useState<string>('modelo-1');
  const [formTamanho, setFormTamanho] = useState<string>('a4');
  const [formOrientacao, setFormOrientacao] = useState<'portrait' | 'landscape'>('landscape');
  const [formLargura, setFormLargura] = useState<number>(1123);
  const [formAltura, setFormAltura] = useState<number>(794);
  const [formMolduraUrl, setFormMolduraUrl] = useState<string>('');
  const [formPaginas, setFormPaginas] = useState<PaginaCertificado[]>([]);
  const [paginaAtiva, setPaginaAtiva] = useState<number>(0);
  const [variaveisOpen, setVariaveisOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(30);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [uploadingMoldura, setUploadingMoldura] = useState(false);

  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});

  useEffect(() => {
    if (empresaId) {
      fetchModelos();
      fetchTreinamentos();
      fetchMolduras();
      fetchLogoEmpresa();
    }
  }, [empresaId]);

  useEffect(() => {
    const tamanhoSelecionado = TAMANHOS_PAGINA.find(t => t.id === formTamanho);
    if (tamanhoSelecionado) {
      if (formOrientacao === 'landscape') {
        setFormLargura(tamanhoSelecionado.altura);
        setFormAltura(tamanhoSelecionado.largura);
      } else {
        setFormLargura(tamanhoSelecionado.largura);
        setFormAltura(tamanhoSelecionado.altura);
      }
    }
  }, [formTamanho, formOrientacao]);

  const fetchModelos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('modelo_relatorios')
        .select(`*, treinamentos:modelo_relatorio_treinamentos(treinamento_id), paginas:modelo_relatorio_paginas(*)`)
        .eq('empresa_id', empresaId)
        .eq('tipo', 'certificado')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModelos(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar modelos:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os modelos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTreinamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogo_treinamentos')
        .select('id, nome, norma')
        .eq('empresa_id', empresaId)
        .order('norma')
        .order('nome');

      if (error) throw error;
      // Ordenar por NR (numérico) e depois por nome A-Z
      const ordenados = (data || []).sort((a, b) => {
        const nrA = parseInt(a.norma) || 0;
        const nrB = parseInt(b.norma) || 0;
        if (nrA !== nrB) return nrA - nrB;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
      setTreinamentos(ordenados);
    } catch (error: any) {
      console.error('Erro ao buscar treinamentos:', error);
    }
  };

  const fetchMolduras = async () => {
    try {
      const { data, error } = await supabase
        .from('modelo_relatorio_molduras')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');

      if (error) throw error;
      setMolduras(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar molduras:', error);
    }
  };

  const fetchLogoEmpresa = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('logo_url')
        .eq('id', empresaId)
        .single();

      if (error) throw error;
      setLogoEmpresa(data?.logo_url || '');
    } catch (error: any) {
      console.error('Erro ao buscar logo:', error);
    }
  };

  const resetForm = () => {
    setFormNome('');
    setFormAtivo(true);
    setFormSelecaoTreinamento('todos');
    setFormTreinamentosSelecionados([]);
    setFormFonteModelo('pronto');
    setFormTemplateSelecionado('modelo-1');
    setFormTamanho('a4');
    setFormOrientacao('landscape');
    setFormMolduraUrl('');
    setFormPaginas([]);
    setPaginaAtiva(0);
    setVariaveisOpen(false);
    setEditingModelo(null);
  };

  const aplicarTemplate = (templateId: string) => {
    const template = TEMPLATES_PRONTOS.find(t => t.id === templateId);
    if (template) {
      setFormTamanho(template.tamanho);
      setFormOrientacao(template.orientacao);
      setFormPaginas(template.paginas.map((p, idx) => ({
        numero: idx + 1,
        nome: p.nome,
        conteudo: p.conteudo,
      })));
      setPaginaAtiva(0);
    }
  };

  const openNewDialog = () => {
    resetForm();
    aplicarTemplate('modelo-1');
    setDialogOpen(true);
  };

  const openEditDialog = (modelo: ModeloRelatorio) => {
    setEditingModelo(modelo);
    setFormNome(modelo.nome);
    setFormAtivo(modelo.ativo);
    setFormSelecaoTreinamento(modelo.selecao_treinamento);
    setFormTreinamentosSelecionados(modelo.treinamentos?.map(t => t.treinamento_id) || []);
    setFormFonteModelo('personalizado');
    setFormMolduraUrl(modelo.moldura_url || '');
    
    const tamanho = TAMANHOS_PAGINA.find(t => 
      (t.largura === modelo.largura && t.altura === modelo.altura) ||
      (t.altura === modelo.largura && t.largura === modelo.altura)
    );
    if (tamanho) {
      setFormTamanho(tamanho.id);
      setFormOrientacao(modelo.largura > modelo.altura ? 'landscape' : 'portrait');
    }
    setFormLargura(modelo.largura);
    setFormAltura(modelo.altura);
    
    setFormPaginas(modelo.paginas?.sort((a, b) => a.numero - b.numero) || []);
    setPaginaAtiva(0);
    setDialogOpen(true);
  };

  const toggleTreinamento = (treinamentoId: string) => {
    if (formTreinamentosSelecionados.includes(treinamentoId)) {
      setFormTreinamentosSelecionados(formTreinamentosSelecionados.filter(id => id !== treinamentoId));
    } else {
      setFormTreinamentosSelecionados([...formTreinamentosSelecionados, treinamentoId]);
    }
  };

  const addPagina = () => {
    const novaPagina: PaginaCertificado = {
      numero: formPaginas.length + 1,
      nome: `Página ${formPaginas.length + 1}`,
      conteudo: '',
    };
    setFormPaginas([...formPaginas, novaPagina]);
    setPaginaAtiva(formPaginas.length);
  };

  const removePagina = (index: number) => {
    if (formPaginas.length <= 1) {
      toast({ title: 'Aviso', description: 'O certificado deve ter pelo menos uma página.', variant: 'destructive' });
      return;
    }
    const newPaginas = formPaginas.filter((_, i) => i !== index).map((p, i) => ({ ...p, numero: i + 1 }));
    setFormPaginas(newPaginas);
    if (paginaAtiva >= newPaginas.length) {
      setPaginaAtiva(Math.max(0, newPaginas.length - 1));
    }
  };

  const updatePagina = (index: number, field: keyof PaginaCertificado, value: any) => {
    if (index < 0 || index >= formPaginas.length) return;
    const newPaginas = [...formPaginas];
    newPaginas[index] = { ...newPaginas[index], [field]: value };
    setFormPaginas(newPaginas);
  };

  const inserirVariavel = (codigo: string) => {
    const textarea = textareaRefs.current[paginaAtiva];
    if (textarea && paginaAtiva < formPaginas.length) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const conteudo = formPaginas[paginaAtiva].conteudo;
      const novoConteudo = conteudo.substring(0, start) + codigo + conteudo.substring(end);
      updatePagina(paginaAtiva, 'conteudo', novoConteudo);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + codigo.length, start + codigo.length);
      }, 0);
    }
    toast({ title: 'Variável inserida', description: `${codigo} foi adicionada.` });
  };

  const substituirVariaveisPreview = (html: string): string => {
    const logoHtml = logoEmpresa 
      ? `<img src="${logoEmpresa}" alt="Logo" style="max-height:60px;max-width:150px;object-fit:contain;" />`
      : '<div style="padding:8px 16px;background:#f5f5f5;border:1px dashed #ccc;border-radius:4px;font-size:11px;color:#888;">[Logo]</div>';

    const assinaturaResponsavelHtml = `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;min-width:240px;">
      <div style="height:60px;width:180px;"></div>
      <div style="width:200px;border-bottom:1px solid #333;margin:6px 0;"></div>
      <p style="margin:0;font-weight:bold;font-size:13px;line-height:1.3;">João Carlos Silva</p>
      <p style="margin:2px 0 0 0;font-size:11px;color:#444;line-height:1.3;">Responsável Técnico</p>
      <p style="margin:2px 0 0 0;font-size:11px;color:#555;line-height:1.3;">Engenheiro de Segurança do Trabalho</p>
      <p style="margin:2px 0 0 0;font-size:10px;color:#666;line-height:1.3;">CREA nº 123456/SP</p>
    </div>`;

    const assinaturaInstrutorHtml = `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;min-width:240px;">
      <div style="height:60px;width:180px;"></div>
      <div style="width:200px;border-bottom:1px solid #333;margin:6px 0;"></div>
      <p style="margin:0;font-weight:bold;font-size:13px;line-height:1.3;">Maria Santos</p>
      <p style="margin:2px 0 0 0;font-size:11px;color:#444;line-height:1.3;">Instrutor</p>
      <p style="margin:2px 0 0 0;font-size:11px;color:#555;line-height:1.3;">Técnico de Segurança do Trabalho</p>
    </div>`;

    const assinaturasHtml = `<div style="display:flex;justify-content:center;align-items:flex-start;width:100%;gap:60px;flex-wrap:wrap;">${assinaturaResponsavelHtml}${assinaturaInstrutorHtml}</div>`;

    return html
      .replace(/{LOGO_EMPRESA}/g, logoHtml)
      .replace(/{COLABORADOR_NOME}/g, 'João da Silva')
      .replace(/{COLABORADOR_CPF}/g, '123.456.789-00')
      .replace(/{COLABORADOR_EMPRESA}/g, 'Empresa ABC Ltda')
      .replace(/{COLABORADOR_LOCAL}/g, 'Rua das Flores, 123 - São Paulo/SP')
      .replace(/{COLABORADOR_ASSINATURA}/g, '<div style="width:150px;height:40px;background:#f5f5f5;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:10px;color:#888;">[Assinatura]</div>')
      .replace(/{TREINAMENTO_NOME}/g, 'Trabalho em Altura')
      .replace(/{TREINAMENTO_NR}/g, 'NR-35')
      .replace(/{TREINAMENTO_CH}/g, '8')
      .replace(/{TREINAMENTO_DATA}/g, '18/12/2025')
      .replace(/{TREINAMENTO_CP}/g, '1. Introdução à NR-35<br/>2. Análise de Risco<br/>3. Equipamentos de Proteção<br/>4. Procedimentos de Emergência')
      .replace(/{TREINAMENTO_VALIDADE}/g, '18/12/2027')
      .replace(/{TURMA_TIPO}/g, 'Periódico (Reciclagem)')
      .replace(/{TURMA_CODIGO}/g, 'TRM001-NR35')
      .replace(/{INSTRUTOR_NOME}/g, 'Maria Santos')
      .replace(/{DATA_ATUAL}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/{QRCODE_VALIDACAO}/g, '<div style="width:80px;height:80px;background:#f0f0f0;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:10px;">[QR]</div>')
      .replace(/{ASSINATURAS}/g, assinaturasHtml)
      .replace(/{ASSINATURA_RESPONSAVEL_TECNICO}/g, assinaturaResponsavelHtml)
      .replace(/{ASSINATURA_INSTRUTOR}/g, assinaturaInstrutorHtml)
      .replace(/{EMPRESA_SST_NOME}/g, 'Empresa SST Exemplo')
      .replace(/{EMPRESA_SST_CNPJ}/g, '12.345.678/0001-90')
      .replace(/{EMPRESA_SST_ENDERECO}/g, 'Av. Principal, 1000 - Centro - São Paulo/SP')
      .replace(/{CATEGORIZACAO_TECNICA}/g, `<div style="box-sizing: border-box; border: 1px solid #000; padding: 10px 14px; margin: 8px 0; font-family: 'Times New Roman', Times, serif; font-size: 11px; line-height: 1.5; max-width: 100%;">
        <div style="margin-bottom: 10px;"><strong>Tipo de Espaço Confinado:</strong> Reatores e casa de bombas.</div>
        <div style="margin-bottom: 10px;"><strong>Tipo de trabalho:</strong> Limpeza e Manutenção.</div>
        <div style="border-top: 1px solid #000; padding-top: 10px; text-align: center; line-height: 1.4;">
          <div style="font-weight: bold; font-size: 11px;">Leandro Fernando Flor de Ávila</div>
          <div style="font-size: 11px;">Técnico de Segurança do Trabalho</div>
          <div style="font-size: 11px;">MTE Nº 0107276/SP</div>
          <div style="margin-top: 4px; font-size: 11px;">Responsável pelos Espaços Confinados da<br/>Pro Nova Indústria e Comércio ltda.</div>
        </div>
      </div>`);
  };

  const handleUploadMoldura = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingMoldura(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${empresaId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('molduras').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('molduras').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { data: molduraData, error: molduraError } = await supabase
        .from('modelo_relatorio_molduras')
        .insert({ empresa_id: empresaId, nome: file.name, url: publicUrl })
        .select()
        .single();

      if (molduraError) throw molduraError;

      setMolduras([...molduras, molduraData]);
      // Definir a moldura na página ativa
      if (paginaAtiva < formPaginas.length) {
        updatePagina(paginaAtiva, 'moldura_url', publicUrl);
      }
      toast({ title: 'Sucesso', description: 'Moldura carregada!' });
    } catch (error: any) {
      console.error('Erro upload:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar a moldura.', variant: 'destructive' });
    } finally {
      setUploadingMoldura(false);
    }
  };

  const handleSave = async () => {
    if (!formNome.trim()) {
      toast({ title: 'Erro', description: 'Nome do modelo é obrigatório.', variant: 'destructive' });
      return;
    }

    if (formSelecaoTreinamento !== 'todos' && formTreinamentosSelecionados.length === 0) {
      toast({ title: 'Erro', description: 'Selecione pelo menos um treinamento.', variant: 'destructive' });
      return;
    }

    if (formPaginas.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos uma página.', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);

      const modeloData = {
        empresa_id: empresaId,
        nome: formNome.trim(),
        tipo: 'certificado' as const,
        selecao_treinamento: formSelecaoTreinamento,
        largura: formLargura,
        altura: formAltura,
        moldura_url: null, // Moldura agora é por página
        ativo: formAtivo,
      };

      let modeloId: string;

      if (editingModelo) {
        const { error } = await supabase.from('modelo_relatorios').update(modeloData).eq('id', editingModelo.id);
        if (error) throw error;
        modeloId = editingModelo.id;

        await supabase.from('modelo_relatorio_treinamentos').delete().eq('modelo_id', modeloId);
        await supabase.from('modelo_relatorio_paginas').delete().eq('modelo_id', modeloId);
      } else {
        const { data, error } = await supabase.from('modelo_relatorios').insert(modeloData).select().single();
        if (error) throw error;
        modeloId = data.id;
      }

      if (formSelecaoTreinamento !== 'todos' && formTreinamentosSelecionados.length > 0) {
        const treinamentosData = formTreinamentosSelecionados.map(tid => ({ modelo_id: modeloId, treinamento_id: tid }));
        const { error: tError } = await supabase.from('modelo_relatorio_treinamentos').insert(treinamentosData);
        if (tError) throw tError;
      }

      const paginasData = formPaginas.map((pagina, index) => ({
        modelo_id: modeloId,
        numero: index + 1,
        nome: pagina.nome,
        conteudo: pagina.conteudo,
        moldura_url: pagina.moldura_url || null,
      }));

      const { error: pgError } = await supabase.from('modelo_relatorio_paginas').insert(paginasData);
      if (pgError) throw pgError;

      toast({ title: 'Sucesso', description: editingModelo ? 'Modelo atualizado!' : 'Modelo criado!' });
      setDialogOpen(false);
      resetForm();
      fetchModelos();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: error?.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!modeloToDelete) return;

    try {
      const { error } = await supabase.from('modelo_relatorios').delete().eq('id', modeloToDelete.id);
      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Modelo excluído!' });
      setDeleteDialogOpen(false);
      setModeloToDelete(null);
      fetchModelos();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const getSelecaoLabel = (selecao: string) => {
    switch (selecao) {
      case 'todos': return 'Todos os treinamentos';
      case 'individual': return 'Treinamentos selecionados';
      case 'todos_exceto': return 'Todos exceto selecionados';
      default: return selecao;
    }
  };

  const handleDuplicate = async (modelo: ModeloRelatorio) => {
    try {
      setSaving(true);
      
      const modeloData = {
        empresa_id: empresaId,
        nome: `${modelo.nome} (Cópia)`,
        tipo: 'certificado' as const,
        selecao_treinamento: modelo.selecao_treinamento,
        largura: modelo.largura,
        altura: modelo.altura,
        moldura_url: modelo.moldura_url || null,
        ativo: modelo.ativo,
      };

      const { data: novoModelo, error } = await supabase
        .from('modelo_relatorios')
        .insert(modeloData)
        .select()
        .single();

      if (error) throw error;

      // Duplicar treinamentos vinculados
      if (modelo.treinamentos && modelo.treinamentos.length > 0) {
        const treinamentosData = modelo.treinamentos.map(t => ({
          modelo_id: novoModelo.id,
          treinamento_id: t.treinamento_id
        }));
        await supabase.from('modelo_relatorio_treinamentos').insert(treinamentosData);
      }

      // Duplicar páginas
      if (modelo.paginas && modelo.paginas.length > 0) {
        const paginasData = modelo.paginas.map(p => ({
          modelo_id: novoModelo.id,
          numero: p.numero,
          nome: p.nome,
          conteudo: p.conteudo,
          moldura_url: p.moldura_url || null,
        }));
        await supabase.from('modelo_relatorio_paginas').insert(paginasData);
      }

      toast({ title: 'Sucesso', description: 'Modelo duplicado com sucesso!' });
      fetchModelos();
    } catch (error: any) {
      console.error('Erro ao duplicar:', error);
      toast({ title: 'Erro', description: 'Não foi possível duplicar o modelo.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Exportar modelo para JSON
  const handleExportModelo = (modelo: ModeloRelatorio) => {
    const exportData = {
      nome: modelo.nome,
      tipo: modelo.tipo,
      selecao_treinamento: modelo.selecao_treinamento,
      largura: modelo.largura,
      altura: modelo.altura,
      ativo: modelo.ativo,
      paginas: modelo.paginas?.map(p => ({
        numero: p.numero,
        nome: p.nome,
        conteudo: p.conteudo,
        moldura_url: p.moldura_url || null,
      })) || [],
      exportado_em: new Date().toISOString(),
      versao: '1.0',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo-certificado-${modelo.nome.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: 'Sucesso', description: 'Modelo exportado com sucesso!' });
  };

  // Importar modelo de JSON
  const handleImportModelo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !empresaId) return;

    try {
      setSaving(true);
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validar estrutura básica
      if (!importData.nome || !importData.paginas || !Array.isArray(importData.paginas)) {
        throw new Error('Arquivo inválido. Estrutura do modelo não reconhecida.');
      }

      // Criar modelo
      const modeloData = {
        empresa_id: empresaId,
        nome: `${importData.nome} (Importado)`,
        tipo: 'certificado' as const,
        selecao_treinamento: importData.selecao_treinamento || 'todos',
        largura: importData.largura || 1123,
        altura: importData.altura || 794,
        moldura_url: null,
        ativo: importData.ativo ?? true,
      };

      const { data: novoModelo, error } = await supabase
        .from('modelo_relatorios')
        .insert(modeloData)
        .select()
        .single();

      if (error) throw error;

      // Inserir páginas
      if (importData.paginas.length > 0) {
        const paginasData = importData.paginas.map((p: any, index: number) => ({
          modelo_id: novoModelo.id,
          numero: p.numero || index + 1,
          nome: p.nome || `Página ${index + 1}`,
          conteudo: p.conteudo || '',
          moldura_url: null, // Não importar moldura_url pois é específica da empresa
        }));
        await supabase.from('modelo_relatorio_paginas').insert(paginasData);
      }

      toast({ title: 'Sucesso', description: 'Modelo importado com sucesso!' });
      fetchModelos();
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast({ 
        title: 'Erro', 
        description: error?.message || 'Não foi possível importar o modelo.', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileType className="h-6 w-6 text-primary" />
            Modelo de Certificado
          </h1>
          <p className="text-muted-foreground">Gerencie os modelos de certificados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => document.getElementById('import-modelo-input')?.click()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Importar Modelo
          </Button>
          <input
            id="import-modelo-input"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportModelo}
          />
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Modelo
          </Button>
        </div>
      </div>

      {/* Seção de Molduras */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-orange-600" />
                Molduras para Certificados
              </CardTitle>
              <CardDescription>Gerencie as molduras disponíveis para os certificados</CardDescription>
            </div>
            <Button variant="outline" onClick={() => document.getElementById('moldura-upload-input')?.click()} disabled={uploadingMoldura}>
              {uploadingMoldura ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Adicionar Moldura
            </Button>
            <input
              id="moldura-upload-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !empresaId) return;
                
                setUploadingMoldura(true);
                try {
                  const fileExt = file.name.split('.').pop();
                  const fileName = `${empresaId}/molduras/${Date.now()}.${fileExt}`;
                  
                  const { error: uploadError } = await supabase.storage
                    .from('empresa-assets')
                    .upload(fileName, file);
                  
                  if (uploadError) throw uploadError;
                  
                  const { data: urlData } = supabase.storage.from('empresa-assets').getPublicUrl(fileName);
                  
                  // Detectar orientação da imagem
                  const img = new Image();
                  img.onload = async () => {
                    const orientacao = img.width > img.height ? 'Horizontal' : 'Vertical';
                    const nome = `Moldura ${orientacao} - ${new Date().toLocaleDateString('pt-BR')}`;
                    
                    const { error: insertError } = await supabase
                      .from('modelo_relatorio_molduras')
                      .insert({ empresa_id: empresaId, nome, url: urlData.publicUrl });
                    
                    if (insertError) throw insertError;
                    
                    toast({ title: 'Sucesso', description: 'Moldura adicionada!' });
                    fetchMolduras();
                  };
                  img.src = URL.createObjectURL(file);
                } catch (error: any) {
                  console.error('Erro ao fazer upload:', error);
                  toast({ title: 'Erro', description: 'Não foi possível enviar a moldura.', variant: 'destructive' });
                } finally {
                  setUploadingMoldura(false);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {molduras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Layers className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">Nenhuma moldura cadastrada</p>
              <p className="text-xs mt-1">Clique em "Adicionar Moldura" para enviar</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {molduras.map((moldura) => (
                <div key={moldura.id} className="relative group border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                  <div className="aspect-[297/210] relative">
                    <img src={moldura.url} alt={moldura.nome} className="w-full h-full object-contain" />
                  </div>
                  <div className="p-2 border-t">
                    <p className="text-xs font-medium truncate">{moldura.nome}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                    onClick={async () => {
                      try {
                        const { error } = await supabase.from('modelo_relatorio_molduras').delete().eq('id', moldura.id);
                        if (error) throw error;
                        toast({ title: 'Sucesso', description: 'Moldura excluída!' });
                        fetchMolduras();
                      } catch (error: any) {
                        toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Modelos Cadastrados</CardTitle>
            <CardDescription>Lista de modelos de certificado</CardDescription>
          </CardHeader>
          <CardContent>
            {modelos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileType className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum modelo cadastrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Treinamentos</TableHead>
                    <TableHead>Páginas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.map((modelo) => (
                    <TableRow key={modelo.id}>
                      <TableCell className="font-medium">{modelo.nome}</TableCell>
                      <TableCell>{getSelecaoLabel(modelo.selecao_treinamento)}</TableCell>
                      <TableCell>{modelo.paginas?.length || 0}</TableCell>
                      <TableCell>
                        <Badge variant={modelo.ativo ? 'default' : 'secondary'}>
                          {modelo.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleExportModelo(modelo)} title="Exportar modelo">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDuplicate(modelo)} title="Duplicar modelo" disabled={saving}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(modelo)} title="Editar modelo">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setModeloToDelete(modelo); setDeleteDialogOpen(true); }} title="Excluir modelo">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingModelo ? 'Editar Modelo' : 'Cadastrar Modelo'}</DialogTitle>
            <DialogDescription>Configure o modelo de certificado</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-2">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Informações</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input value={formNome} onChange={(e) => setFormNome(e.target.value)} placeholder="Ex: Certificado NR-35" />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center gap-2 h-10">
                        <Switch checked={formAtivo} onCheckedChange={setFormAtivo} />
                        <span className="text-sm">{formAtivo ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Treinamentos *</h3>
                  <Select value={formSelecaoTreinamento} onValueChange={(v: any) => setFormSelecaoTreinamento(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os treinamentos</SelectItem>
                      <SelectItem value="individual">Selecionar treinamentos</SelectItem>
                      <SelectItem value="todos_exceto">Todos exceto selecionados</SelectItem>
                    </SelectContent>
                  </Select>

                  {formSelecaoTreinamento !== 'todos' && (
                    <ScrollArea className="h-32 border rounded-md p-3">
                      <div className="space-y-2">
                        {treinamentos.map((t) => (
                          <div key={t.id} className="flex items-center space-x-2">
                            <Checkbox id={t.id} checked={formTreinamentosSelecionados.includes(t.id)} onCheckedChange={() => toggleTreinamento(t.id)} />
                            <label htmlFor={t.id} className="text-sm cursor-pointer">NR-{t.norma} - {t.nome}</label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {!editingModelo && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Fonte do Conteúdo</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`border-2 rounded-lg p-4 cursor-pointer ${formFonteModelo === 'pronto' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
                        onClick={() => { setFormFonteModelo('pronto'); aplicarTemplate(formTemplateSelecionado); }}>
                        <div className="flex items-center gap-2 mb-1"><Layers className="h-4 w-4 text-primary" /><span className="font-medium text-sm">Modelo Pronto</span></div>
                        <p className="text-xs text-muted-foreground">Usar template do sistema</p>
                      </div>
                      <div className={`border-2 rounded-lg p-4 cursor-pointer ${formFonteModelo === 'personalizado' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
                        onClick={() => { setFormFonteModelo('personalizado'); if (formPaginas.length === 0) setFormPaginas([{ numero: 1, nome: 'Página 1', conteudo: '' }]); }}>
                        <div className="flex items-center gap-2 mb-1"><Pencil className="h-4 w-4 text-primary" /><span className="font-medium text-sm">Personalizado</span></div>
                        <p className="text-xs text-muted-foreground">Criar do zero</p>
                      </div>
                    </div>

                    {formFonteModelo === 'pronto' && (
                      <Select value={formTemplateSelecionado} onValueChange={(v) => { setFormTemplateSelecionado(v); aplicarTemplate(v); }}>
                        <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                        <SelectContent>
                          {TEMPLATES_PRONTOS.map((t) => (<SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-semibold">Configurações</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tamanho</Label>
                      <Select value={formTamanho} onValueChange={setFormTamanho}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TAMANHOS_PAGINA.map((t) => (<SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Orientação</Label>
                      <Select value={formOrientacao} onValueChange={(v: any) => setFormOrientacao(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Vertical</SelectItem>
                          <SelectItem value="landscape">Horizontal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">Dimensões: {formLargura}px × {formAltura}px</div>
                </div>

                <Collapsible open={variaveisOpen} onOpenChange={setVariaveisOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between" size="sm">
                      <span className="flex items-center gap-2"><Copy className="h-4 w-4" />Variáveis</span>
                      {variaveisOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid grid-cols-1 gap-1 p-2 border rounded-md bg-muted/30 max-h-40 overflow-y-auto">
                      {VARIAVEIS_CERTIFICADO.map((v) => (
                        <div key={v.codigo} className="flex items-center justify-between p-2 bg-white rounded border hover:bg-primary/5 cursor-pointer text-xs" onClick={() => inserirVariavel(v.codigo)} title={v.descricao}>
                          <code className="font-mono text-primary">{v.codigo}</code>
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Páginas</h3>
                  <Button variant="outline" size="sm" onClick={addPagina}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
                </div>

                {formPaginas.length > 0 ? (
                  <>
                    <div className="flex gap-1 flex-wrap">
                      {formPaginas.map((pagina, idx) => (
                        <div key={idx} className={`flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer text-sm ${paginaAtiva === idx ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`} onClick={() => setPaginaAtiva(idx)}>
                          {pagina.nome || `Página ${idx + 1}`}
                          {formPaginas.length > 1 && <X className="h-3 w-3 hover:text-destructive" onClick={(e) => { e.stopPropagation(); removePagina(idx); }} />}
                        </div>
                      ))}
                    </div>

                    {paginaAtiva < formPaginas.length && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Nome da Página</Label>
                          <Input value={formPaginas[paginaAtiva]?.nome || ''} onChange={(e) => updatePagina(paginaAtiva, 'nome', e.target.value)} placeholder="Ex: Frente" />
                        </div>

                        <div className="space-y-2">
                          <Label>Moldura da Página</Label>
                          <div className="flex gap-2">
                            <Select 
                              value={formPaginas[paginaAtiva]?.moldura_url || 'none'} 
                              onValueChange={(v) => updatePagina(paginaAtiva, 'moldura_url', v === 'none' ? '' : v)}
                            >
                              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione uma moldura" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem moldura</SelectItem>
                                {molduras.map((m) => (<SelectItem key={m.id} value={m.url}>{m.nome}</SelectItem>))}
                              </SelectContent>
                            </Select>
                            <div className="relative">
                              <input type="file" accept="image/*" onChange={handleUploadMoldura} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploadingMoldura} />
                              <Button variant="outline" disabled={uploadingMoldura} title="Enviar nova moldura">
                                {uploadingMoldura ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>HTML/CSS</Label>
                          <Textarea ref={(el) => { textareaRefs.current[paginaAtiva] = el; }} value={formPaginas[paginaAtiva]?.conteudo || ''} onChange={(e) => updatePagina(paginaAtiva, 'conteudo', e.target.value)} placeholder="Digite o HTML..." className="font-mono text-xs min-h-[180px]" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2"><Eye className="h-4 w-4" />Preview</Label>
                            <div className="flex items-center gap-2">
                              <Select value={String(previewZoom)} onValueChange={(v) => setPreviewZoom(Number(v))}>
                                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="30">30%</SelectItem>
                                  <SelectItem value="50">50%</SelectItem>
                                  <SelectItem value="70">70%</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewFullscreen(true)} title="Ver em tela cheia">
                                <Maximize2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="border rounded-lg p-4 bg-muted/50 overflow-auto max-h-[400px]">
                            <div className="flex justify-center">
                              <div className="shadow-lg relative overflow-hidden" style={{ width: `${formLargura * (previewZoom / 100)}px`, height: `${formAltura * (previewZoom / 100)}px`, backgroundImage: formPaginas[paginaAtiva]?.moldura_url ? `url(${formPaginas[paginaAtiva].moldura_url})` : 'none', backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundColor: '#fff' }}>
                                <div style={{ width: `${formLargura}px`, height: `${formAltura}px`, transform: `scale(${previewZoom / 100})`, transformOrigin: 'top left', position: 'relative', zIndex: 1 }} dangerouslySetInnerHTML={{ __html: substituirVariaveisPreview(formPaginas[paginaAtiva]?.conteudo || '') }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 border rounded-md bg-muted/20">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma página</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={addPagina}><Plus className="h-4 w-4 mr-1" />Criar Página</Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formNome.trim() || formPaginas.length === 0}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingModelo ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Preview Tela Cheia */}
      <Dialog open={previewFullscreen} onOpenChange={setPreviewFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview - {formPaginas[paginaAtiva]?.nome || `Página ${paginaAtiva + 1}`}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setPreviewFullscreen(false)}>
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="p-6 overflow-auto flex items-center justify-center bg-muted/30" style={{ maxHeight: 'calc(95vh - 80px)' }}>
            <div className="shadow-2xl relative overflow-hidden" style={{ width: `${formLargura}px`, height: `${formAltura}px`, backgroundImage: formPaginas[paginaAtiva]?.moldura_url ? `url(${formPaginas[paginaAtiva].moldura_url})` : 'none', backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundColor: '#fff', transform: 'scale(0.8)', transformOrigin: 'center' }}>
              <div style={{ width: `${formLargura}px`, height: `${formAltura}px`, position: 'relative', zIndex: 1 }} dangerouslySetInnerHTML={{ __html: substituirVariaveisPreview(formPaginas[paginaAtiva]?.conteudo || '') }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Modelo</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir "{modeloToDelete?.nome}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
