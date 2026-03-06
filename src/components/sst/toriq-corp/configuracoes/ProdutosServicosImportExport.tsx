import { useState, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Upload, 
  FileText,
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Categoria {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
}

interface TipoProduto {
  id: string;
  nome: string;
  ativo: boolean;
}

interface FormaCobranca {
  id: string;
  nome: string;
  periodicidade: string;
  ativo: boolean;
}

interface Natureza {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface Classificacao {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface Produto {
  id: string;
  nome: string;
  codigo: string | null;
  preco: number | null;
  descricao: string | null;
  tipo: 'produto' | 'servico';
  forma_cobranca_id: string | null;
  forma_cobranca_obj?: FormaCobranca;
  ativo: boolean;
  categoria_id: string | null;
  categoria?: Categoria;
  tipo_produto_id?: string | null;
  tipo_produto?: TipoProduto;
  natureza_id?: string | null;
  natureza?: Natureza;
  classificacao_id?: string | null;
  classificacao?: Classificacao;
}

interface ValidatedRow {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
  categoriaId: string | null;
  tipoId: string | null;
  formaCobrancaId: string | null;
  naturezaId: string | null;
  classificacaoId: string | null;
  treinamentoId: string | null;
}

type ImportStep = 'upload' | 'review' | 'importing' | 'complete';

interface Treinamento {
  id: string;
  nome: string;
  norma: string | null;
  ch_formacao: number | null;
  ch_reciclagem: number | null;
}

interface ProdutosServicosImportExportProps {
  produtos: Produto[];
  categorias: Categoria[];
  tipos: TipoProduto[];
  formasCobranca: FormaCobranca[];
  naturezas: Natureza[];
  classificacoes: Classificacao[];
  treinamentos: Treinamento[];
  empresaId: string;
  onImportSuccess: () => void;
}

export function ProdutosServicosImportExport({
  produtos,
  categorias,
  tipos,
  formasCobranca,
  naturezas,
  classificacoes,
  treinamentos,
  empresaId,
  onImportSuccess,
}: ProdutosServicosImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export states
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

  // Import states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [validatedData, setValidatedData] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Template columns
  const templateColumns = [
    'Nome *',
    'Preço',
    'Natureza (Produto/Serviço)',
    'Tipo',
    'Classificação',
    'Categoria',
    'Forma de Cobrança',
    'Descrição',
  ];

  // Stats
  const stats = useMemo(() => {
    const total = validatedData.length;
    const withErrors = validatedData.filter(r => r.errors.length > 0).length;
    const valid = total - withErrors;
    return { total, withErrors, valid };
  }, [validatedData]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return validatedData.slice(start, start + itemsPerPage);
  }, [validatedData, currentPage]);

  const totalPages = Math.ceil(validatedData.length / itemsPerPage);

  // Download template
  const handleDownloadTemplate = () => {
    const exampleRow = [
      'Consultoria SST',
      '500,00',
      'Serviço',
      tipos.length > 0 ? tipos[0].nome : 'Consultoria',
      classificacoes.length > 0 ? classificacoes[0].nome : 'Padrão',
      categorias.length > 0 ? categorias[0].nome : 'Geral',
      formasCobranca.length > 0 ? formasCobranca[0].nome : 'Mensal',
      'Consultoria em Segurança do Trabalho',
    ];

    if (exportFormat === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([templateColumns, exampleRow]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos e Serviços');
      ws['!cols'] = templateColumns.map(() => ({ wch: 20 }));
      XLSX.writeFile(wb, 'template_produtos_servicos.xlsx');
    } else {
      const csvContent = [templateColumns.join(';'), exampleRow.join(';')].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'template_produtos_servicos.csv';
      link.click();
    }
    toast({ title: 'Template baixado com sucesso!' });
  };

  // Export products
  const handleExport = () => {
    if (produtos.length === 0) {
      toast({
        title: 'Nenhum produto para exportar',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'Nome',
      'Código',
      'Preço',
      'Natureza',
      'Tipo',
      'Classificação',
      'Categoria',
      'Forma de Cobrança',
      'Descrição',
      'Status',
    ];

    const rows = produtos.map(p => {
      const tipo = tipos.find(t => t.id === p.tipo_produto_id);
      const classificacao = classificacoes.find(c => c.id === p.classificacao_id);
      return [
        p.nome || '',
        p.codigo || '',
        p.preco?.toFixed(2).replace('.', ',') || '',
        p.tipo === 'produto' ? 'Produto' : 'Serviço',
        tipo?.nome || '',
        classificacao?.nome || '',
        p.categoria?.nome || '',
        p.forma_cobranca_obj?.nome || '',
        p.descricao || '',
        p.ativo ? 'Ativo' : 'Inativo',
      ];
    });

    const fileName = `produtos_servicos_${new Date().toISOString().split('T')[0]}`;

    if (exportFormat === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos e Serviços');
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      link.click();
    }

    setExportDialogOpen(false);
    toast({ title: 'Exportação realizada com sucesso!' });
  };

  // Process file
  const handleProcessFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast({
          title: 'Arquivo vazio',
          description: 'O arquivo não contém dados para importar.',
          variant: 'destructive',
        });
        return;
      }

      const headers = jsonData[0].map((h: any) => h?.toString().trim().toUpperCase() || '');
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));

      // Map headers
      const headerMap: Record<string, number> = {};
      headers.forEach((h, i) => {
        if (h.includes('NOME')) headerMap['nome'] = i;
        if (h.includes('PREÇO') || h.includes('PRECO')) headerMap['preco'] = i;
        if (h.includes('NATUREZA')) headerMap['natureza'] = i;
        if (h.includes('TIPO') && !h.includes('CLASSIF') && !h.includes('NATUREZA')) headerMap['tipo'] = i;
        if (h.includes('CLASSIF')) headerMap['classificacao'] = i;
        if (h.includes('CATEGORIA')) headerMap['categoria'] = i;
        if (h.includes('FORMA') || h.includes('COBRANÇA') || h.includes('COBRANCA')) headerMap['forma_cobranca'] = i;
        if (h.includes('DESCRIÇÃO') || h.includes('DESCRICAO')) headerMap['descricao'] = i;
      });

      // Validate rows
      const validated: ValidatedRow[] = rows.map((row, index) => {
        const rowNumber = index + 2;
        const errors: string[] = [];

        const getValue = (key: string) => {
          const idx = headerMap[key];
          return idx !== undefined ? row[idx]?.toString().trim() || '' : '';
        };

        const nome = getValue('nome');
        const precoStr = getValue('preco');
        const naturezaStr = getValue('natureza');
        const tipoStr = getValue('tipo');
        const classificacaoStr = getValue('classificacao');
        const categoriaStr = getValue('categoria');
        const formaCobrancaStr = getValue('forma_cobranca');
        const descricao = getValue('descricao');

        // Validar nome (obrigatório)
        if (!nome) {
          errors.push('Nome é obrigatório');
        }

        // Validar preço
        let preco: number | null = null;
        if (precoStr) {
          const precoLimpo = precoStr.replace(/[^\d,.-]/g, '').replace(',', '.');
          preco = parseFloat(precoLimpo);
          if (isNaN(preco)) {
            errors.push(`Preço inválido: "${precoStr}"`);
            preco = null;
          }
        }

        // Validar natureza (produto/serviço)
        let natureza: 'produto' | 'servico' = 'servico';
        if (naturezaStr) {
          const naturezaLower = naturezaStr.toLowerCase();
          if (naturezaLower.includes('produto')) {
            natureza = 'produto';
          } else if (naturezaLower.includes('servi')) {
            natureza = 'servico';
          }
        }

        // Validar tipo de produto
        let tipoId: string | null = null;
        let ehTipoTreinamento = false;
        if (tipoStr) {
          const tipoEncontrado = tipos.find(t => 
            t.nome.toLowerCase() === tipoStr.toLowerCase() && t.ativo
          );
          if (tipoEncontrado) {
            tipoId = tipoEncontrado.id;
            ehTipoTreinamento = tipoEncontrado.nome.toLowerCase().includes('treinamento');
          } else {
            const tiposDisponiveis = tipos.filter(t => t.ativo).map(t => t.nome).slice(0, 5).join(', ');
            errors.push(`Tipo "${tipoStr}" não encontrado. Disponíveis: ${tiposDisponiveis}${tipos.length > 5 ? '...' : ''}`);
          }
        }

        // Se tipo for treinamento, buscar treinamento pelo nome
        let treinamentoId: string | null = null;
        if (ehTipoTreinamento && nome && treinamentos.length > 0) {
          // Buscar por nome exato ou parcial
          const nomeLower = nome.toLowerCase().trim();
          const treinamentoEncontrado = treinamentos.find(t => {
            const tNomeLower = t.nome.toLowerCase().trim();
            const nomeComNorma = t.norma ? `${t.norma} - ${t.nome}`.toLowerCase() : tNomeLower;
            const nomeComNormaInverso = t.norma ? `${t.nome} - ${t.norma}`.toLowerCase() : tNomeLower;
            
            // Busca exata
            if (tNomeLower === nomeLower) return true;
            if (nomeComNorma === nomeLower) return true;
            if (nomeComNormaInverso === nomeLower) return true;
            
            // Busca parcial - nome do Excel contém nome do treinamento ou vice-versa
            if (tNomeLower.includes(nomeLower) || nomeLower.includes(tNomeLower)) return true;
            
            return false;
          });
          
          if (treinamentoEncontrado) {
            treinamentoId = treinamentoEncontrado.id;
          }
          // Não adiciona erro se não encontrar - apenas não vincula ao catálogo
        }

        // Validar classificação
        let classificacaoId: string | null = null;
        if (classificacaoStr) {
          const classificacaoEncontrada = classificacoes.find(c => 
            c.nome.toLowerCase() === classificacaoStr.toLowerCase() && c.ativo
          );
          if (classificacaoEncontrada) {
            classificacaoId = classificacaoEncontrada.id;
          } else {
            const classificacoesDisponiveis = classificacoes.filter(c => c.ativo).map(c => c.nome).slice(0, 5).join(', ');
            errors.push(`Classificação "${classificacaoStr}" não encontrada. Disponíveis: ${classificacoesDisponiveis}${classificacoes.length > 5 ? '...' : ''}`);
          }
        }

        // Validar categoria
        let categoriaId: string | null = null;
        if (categoriaStr) {
          const categoriaEncontrada = categorias.find(c => 
            c.nome.toLowerCase() === categoriaStr.toLowerCase() && c.ativo
          );
          if (categoriaEncontrada) {
            categoriaId = categoriaEncontrada.id;
          } else {
            const categoriasDisponiveis = categorias.filter(c => c.ativo).map(c => c.nome).slice(0, 5).join(', ');
            errors.push(`Categoria "${categoriaStr}" não encontrada. Disponíveis: ${categoriasDisponiveis}${categorias.length > 5 ? '...' : ''}`);
          }
        }

        // Validar forma de cobrança
        let formaCobrancaId: string | null = null;
        if (formaCobrancaStr) {
          const formaEncontrada = formasCobranca.find(f => 
            f.nome.toLowerCase() === formaCobrancaStr.toLowerCase() && f.ativo
          );
          if (formaEncontrada) {
            formaCobrancaId = formaEncontrada.id;
          } else {
            const formasDisponiveis = formasCobranca.filter(f => f.ativo).map(f => f.nome).slice(0, 5).join(', ');
            errors.push(`Forma de Cobrança "${formaCobrancaStr}" não encontrada. Disponíveis: ${formasDisponiveis}${formasCobranca.length > 5 ? '...' : ''}`);
          }
        }

        return {
          rowNumber,
          data: {
            nome,
            preco,
            natureza,
            tipo: tipoStr,
            classificacao: classificacaoStr,
            categoria: categoriaStr,
            forma_cobranca: formaCobrancaStr,
            descricao,
            ativo: true, // Sempre ativo na criação
          },
          errors,
          categoriaId,
          tipoId,
          formaCobrancaId,
          naturezaId: null,
          classificacaoId,
          treinamentoId,
        };
      });

      setValidatedData(validated);
      setImportStep('review');
      setCurrentPage(1);

    } catch (error: any) {
      toast({
        title: 'Erro ao processar arquivo',
        description: error.message || 'Não foi possível ler o arquivo.',
        variant: 'destructive',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Gerar código automático baseado no tipo e timestamp
  const gerarCodigoAutomatico = (tipo: 'produto' | 'servico', index: number) => {
    const prefixo = tipo === 'produto' ? 'PROD' : 'SERV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const sequencial = (index + 1).toString().padStart(3, '0');
    return `${prefixo}-${timestamp}-${sequencial}`;
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (stats.withErrors > 0) {
      toast({
        title: 'Existem erros na importação',
        description: 'Corrija os erros antes de continuar.',
        variant: 'destructive',
      });
      return;
    }

    setImportStep('importing');
    setImporting(true);
    setImportProgress(0);

    const results = { success: 0, errors: [] as { row: number; error: string }[] };

    try {
      for (let i = 0; i < validatedData.length; i++) {
        const { rowNumber, data, categoriaId, tipoId, formaCobrancaId, classificacaoId, treinamentoId } = validatedData[i];
        
        setImportProgress(Math.round(((i + 1) / validatedData.length) * 100));

        // Gerar código automático
        const codigo = gerarCodigoAutomatico(data.natureza, i);

        const produtoData = {
          empresa_id: empresaId,
          nome: data.nome,
          codigo: codigo,
          preco: data.preco,
          tipo: data.natureza,
          tipo_id: tipoId,
          categoria_id: categoriaId,
          forma_cobranca_id: formaCobrancaId,
          classificacao_id: classificacaoId,
          treinamento_id: treinamentoId,
          descricao: data.descricao || null,
          ativo: true, // Sempre ativo na criação
        };

        const { error } = await (supabase as any)
          .from('produtos_servicos')
          .insert(produtoData);

        if (error) {
          results.errors.push({ row: rowNumber, error: error.message });
        } else {
          results.success++;
        }
      }

      setImportStep('complete');

      if (results.errors.length > 0) {
        toast({
          title: `Importação parcial: ${results.success} de ${validatedData.length}`,
          description: `${results.errors.length} erros encontrados.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Importação concluída!',
          description: `${results.success} produtos/serviços importados com sucesso.`,
        });
      }

      onImportSuccess();

    } catch (error: any) {
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  // Reset import
  const resetImport = () => {
    setImportStep('upload');
    setValidatedData([]);
    setImportProgress(0);
    setCurrentPage(1);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setImportDialogOpen(false);
    resetImport();
  };

  return (
    <>
      {/* Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Produtos e Serviços</DialogTitle>
            <DialogDescription>
              Escolha o formato para exportar a lista de produtos e serviços.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Formato do arquivo</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'xlsx' | 'csv')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel (.xlsx)
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      CSV (.csv)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              Serão exportados {produtos.length} produto(s)/serviço(s).
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={produtos.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        if (!importing) {
          setImportDialogOpen(open);
          if (!open) {
            resetImport();
          }
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {importStep === 'upload' && 'Importar Produtos e Serviços'}
              {importStep === 'review' && 'Revisar Dados'}
              {importStep === 'importing' && 'Importando...'}
              {importStep === 'complete' && 'Importação Concluída'}
            </DialogTitle>
            <DialogDescription>
              {importStep === 'upload' && 'Importe produtos e serviços a partir de um arquivo CSV ou Excel.'}
              {importStep === 'review' && 'Revise os dados antes de confirmar a importação.'}
              {importStep === 'importing' && 'Aguarde enquanto os dados são importados.'}
              {importStep === 'complete' && 'Todos os produtos/serviços foram importados com sucesso.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4 py-4">
            {/* Upload Step */}
            {importStep === 'upload' && (
              <>
                <div className="space-y-2">
                  <Label>1. Baixe o template</Label>
                  <div className="flex gap-2">
                    <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'xlsx' | 'csv')}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Template
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O template inclui uma linha de exemplo que será ignorada na importação.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>2. Preencha e envie o arquivo</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleProcessFile}
                      className="hidden"
                    />
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Arraste um arquivo ou clique para selecionar
                    </p>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      Selecionar Arquivo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Formatos aceitos: .xlsx, .xls, .csv
                    </p>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importante:</strong> Os dados serão validados antes da importação. 
                    Se houver erros, você precisará corrigir o arquivo e enviar novamente.
                  </AlertDescription>
                </Alert>

                {/* Mostrar cadastros disponíveis */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <h5 className="font-medium mb-2">Tipos ({tipos.filter(t => t.ativo).length})</h5>
                    <div className="text-muted-foreground max-h-20 overflow-y-auto text-xs">
                      {tipos.filter(t => t.ativo).length > 0 
                        ? tipos.filter(t => t.ativo).map(t => t.nome).join(', ')
                        : <span className="text-yellow-500">Nenhum cadastrado</span>
                      }
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <h5 className="font-medium mb-2">Classificações ({classificacoes.filter(c => c.ativo).length})</h5>
                    <div className="text-muted-foreground max-h-20 overflow-y-auto text-xs">
                      {classificacoes.filter(c => c.ativo).length > 0 
                        ? classificacoes.filter(c => c.ativo).map(c => c.nome).join(', ')
                        : <span className="text-yellow-500">Nenhuma cadastrada</span>
                      }
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <h5 className="font-medium mb-2">Categorias ({categorias.filter(c => c.ativo).length})</h5>
                    <div className="text-muted-foreground max-h-20 overflow-y-auto text-xs">
                      {categorias.filter(c => c.ativo).length > 0 
                        ? categorias.filter(c => c.ativo).map(c => c.nome).join(', ')
                        : <span className="text-yellow-500">Nenhuma cadastrada</span>
                      }
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <h5 className="font-medium mb-2">Formas de Cobrança ({formasCobranca.filter(f => f.ativo).length})</h5>
                    <div className="text-muted-foreground max-h-20 overflow-y-auto text-xs">
                      {formasCobranca.filter(f => f.ativo).length > 0 
                        ? formasCobranca.filter(f => f.ativo).map(f => f.nome).join(', ')
                        : <span className="text-yellow-500">Nenhuma cadastrada</span>
                      }
                    </div>
                  </div>
                  {treinamentos.length > 0 && (
                    <div className="bg-blue-500/10 p-3 rounded-lg col-span-2">
                      <h5 className="font-medium mb-2 text-blue-400">Treinamentos ({treinamentos.length})</h5>
                      <div className="text-muted-foreground max-h-20 overflow-y-auto text-xs">
                        {treinamentos.map(t => t.nome).join(', ')}
                      </div>
                      <p className="text-xs text-blue-400 mt-2">
                        💡 Se o Tipo for "Treinamento", coloque o nome do treinamento na coluna Nome
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

          {/* Review Step */}
          {importStep === 'review' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total de registros</p>
                </div>
                <div className="bg-green-500/10 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-500">{stats.valid}</p>
                  <p className="text-sm text-muted-foreground">Válidos</p>
                </div>
                <div className="bg-red-500/10 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-500">{stats.withErrors}</p>
                  <p className="text-sm text-muted-foreground">Com erros</p>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Natureza</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Forma Cobrança</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((row) => (
                      <TableRow key={row.rowNumber} className={row.errors.length > 0 ? 'bg-red-500/5' : ''}>
                        <TableCell>
                          {row.errors.length > 0 ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.data.nome || '-'}
                          {row.errors.length > 0 && (
                            <div className="text-xs text-red-500 mt-1">
                              {row.errors.map((err, i) => (
                                <div key={i}>• {err}</div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.data.preco != null ? `R$ ${row.data.preco.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.data.natureza === 'produto' ? 'default' : 'secondary'}>
                            {row.data.natureza === 'produto' ? 'Produto' : 'Serviço'}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.data.tipo || '-'}</TableCell>
                        <TableCell>{row.data.classificacao || '-'}</TableCell>
                        <TableCell>{row.data.categoria || '-'}</TableCell>
                        <TableCell>{row.data.forma_cobranca || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, validatedData.length)} de {validatedData.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3 py-1 text-sm">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={resetImport}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmImport}
                  disabled={stats.withErrors > 0 || stats.valid === 0}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {stats.valid} registro(s)
                </Button>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {importStep === 'importing' && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <p className="text-lg font-medium mb-4">Importando produtos e serviços...</p>
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">{importProgress}%</p>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {importStep === 'complete' && (
            <div className="space-y-6 py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <p className="text-lg font-medium">Importação concluída!</p>
                <p className="text-muted-foreground">
                  Os produtos e serviços foram importados com sucesso.
                </p>
              </div>
              <Button onClick={handleCloseDialog}>
                Fechar
              </Button>
            </div>
          )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
