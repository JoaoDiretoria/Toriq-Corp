import { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X, Trash2, PlayCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useImportQueue } from '@/hooks/useImportQueue';

interface Empresa {
  id: string;
  nome: string;
  tipo: string;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  porte: string | null;
  site: string | null;
  linkedin: string | null;
  instagram: string | null;
}

interface EmpresasImportExportProps {
  empresas: Empresa[];
  onImportSuccess: () => void;
}

// Campos do template de importação
const TEMPLATE_COLUMNS = [
  { key: 'razao_social', label: 'Razão Social', required: true },
  { key: 'nome_fantasia', label: 'Nome Fantasia', required: false },
  { key: 'tipo', label: 'Tipo (sst ou lead)', required: true },
  { key: 'cnpj', label: 'CNPJ', required: false },
  { key: 'email', label: 'E-mail', required: false },
  { key: 'telefone', label: 'Telefone', required: false },
  { key: 'porte', label: 'Porte (MEI, ME, EPP, MEDIO, GRANDE)', required: false },
  { key: 'cep', label: 'CEP', required: false },
  { key: 'endereco', label: 'Endereço', required: false },
  { key: 'numero', label: 'Número', required: false },
  { key: 'complemento', label: 'Complemento', required: false },
  { key: 'bairro', label: 'Bairro', required: false },
  { key: 'cidade', label: 'Cidade', required: false },
  { key: 'estado', label: 'Estado (UF)', required: false },
  { key: 'site', label: 'Site', required: false },
  { key: 'linkedin', label: 'LinkedIn', required: false },
  { key: 'instagram', label: 'Instagram', required: false },
  { key: 'contato_nome', label: 'Contato - Nome', required: false },
  { key: 'contato_cargo', label: 'Contato - Cargo', required: false },
  { key: 'contato_email', label: 'Contato - E-mail', required: false },
  { key: 'contato_telefone', label: 'Contato - Telefone', required: false },
  { key: 'contato_linkedin', label: 'Contato - LinkedIn', required: false },
];

// Interface para dados validados
interface ValidatedRow {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
}

// Etapas do fluxo de importação
type ImportStep = 'upload' | 'enriching' | 'review' | 'importing' | 'complete';

export function EmpresasImportExport({ empresas, onImportSuccess }: EmpresasImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('xlsx');
  
  // Hook de importação em background
  const { startImport } = useImportQueue();
  
  // Estados do fluxo de importação
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [validatedData, setValidatedData] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: { row: number; error: string }[];
  } | null>(null);
  const [enrichingProgress, setEnrichingProgress] = useState(0);
  const [enrichingStatus, setEnrichingStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'valid' | 'errors'>('all');
  const [isDragging, setIsDragging] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Calcular estatísticas
  const stats = useMemo(() => {
    const total = validatedData.length;
    const withErrors = validatedData.filter(r => r.errors.length > 0).length;
    const valid = total - withErrors;
    return { total, withErrors, valid };
  }, [validatedData]);

  // Dados filtrados
  const filteredData = useMemo(() => {
    if (filterType === 'errors') {
      return validatedData.filter(r => r.errors.length > 0);
    }
    if (filterType === 'valid') {
      return validatedData.filter(r => r.errors.length === 0);
    }
    return validatedData;
  }, [validatedData, filterType]);

  // Dados paginados
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  // Reset do estado de importação
  const resetImportState = () => {
    setImportStep('upload');
    setValidatedData([]);
    setImportProgress(0);
    setImportResults(null);
    setCurrentPage(1);
    setEnrichingProgress(0);
    setEnrichingStatus('');
    setFilterType('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handlers de drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        toast.error('Formato de arquivo inválido. Use .xlsx, .xls ou .csv');
        return;
      }

      // Criar um evento fake para reutilizar handleFileSelect
      const fakeEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileSelect(fakeEvent);
    }
  };

  // Função para atualizar campo de uma linha
  const handleUpdateRowData = (rowNumber: number, field: string, value: string) => {
    setValidatedData(prev => prev.map(row => {
      if (row.rowNumber === rowNumber) {
        const newData = { ...row.data, [field]: value };
        return revalidateRow({ ...row, data: newData });
      }
      return row;
    }));
  };

  // Função para excluir uma linha
  const handleDeleteRow = (rowNumber: number) => {
    setValidatedData(prev => {
      const newData = prev.filter(row => row.rowNumber !== rowNumber);
      const newTotalPages = Math.ceil(
        (filterType === 'errors' ? newData.filter(r => r.errors.length > 0).length : filterType === 'valid' ? newData.filter(r => r.errors.length === 0).length : newData.length) / ITEMS_PER_PAGE
      );
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
      return newData;
    });
    toast.success(`Linha ${rowNumber} removida`);
  };

  // Função para revalidar uma linha após edição
  const revalidateRow = (row: ValidatedRow): ValidatedRow => {
    const errors: string[] = [];
    const data = row.data;
    
    // Verificar se houve erro na busca do CNPJ
    const cnpj = data['CNPJ']?.toString().trim();
    const cnpjErro = data['_cnpj_erro'] === true;
    
    if (cnpjErro && cnpj) {
      errors.push('CNPJ inválido ou não encontrado na Receita Federal');
    }
    
    // Validar Razão Social obrigatória
    const razaoSocial = data['Razão Social']?.toString().trim();
    if (!razaoSocial) {
      // Mensagem diferente se tinha CNPJ com erro
      if (cnpjErro) {
        errors.push('Preencha a Razão Social manualmente (CNPJ não retornou dados)');
      } else {
        errors.push('Razão Social é obrigatória');
      }
    }

    // Validar Tipo obrigatório
    const tipo = data['Tipo (sst ou lead)']?.toString().trim().toLowerCase();
    if (!tipo) {
      errors.push('Tipo é obrigatório (sst ou lead)');
    } else if (!['sst', 'lead'].includes(tipo)) {
      errors.push('Tipo deve ser "sst" ou "lead"');
    }

    // Validar Porte
    const porte = data['Porte (MEI, ME, EPP, MEDIO, GRANDE)']?.toString().trim().toUpperCase();
    if (porte && !['MEI', 'ME', 'EPP', 'MEDIO', 'GRANDE'].includes(porte)) {
      errors.push('Porte inválido. Use: MEI, ME, EPP, MEDIO ou GRANDE');
    }

    // Validar Estado
    const estado = data['Estado (UF)']?.toString().trim().toUpperCase();
    const estadosValidos = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    if (estado && !estadosValidos.includes(estado)) {
      errors.push('Estado (UF) inválido');
    }

    return { ...row, errors };
  };

  // Função para buscar dados do CNPJ via BrasilAPI
  const buscarDadosCnpj = async (cnpj: string): Promise<Record<string, any> | null> => {
    try {
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) return null;

      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      
      if (!response.ok) return null;
      
      const data = await response.json();

      if (data?.razao_social) {
        let porteEmpresa = '';
        const codigoPorte = data.codigo_porte;
        const porteDescricao = data.porte?.toUpperCase() || '';
        const isMei = data.opcao_pelo_mei === true;
        
        if (isMei) {
          porteEmpresa = 'MEI';
        } else if (codigoPorte === 1 || porteDescricao.includes('MICRO')) {
          porteEmpresa = 'ME';
        } else if (codigoPorte === 3 || porteDescricao.includes('PEQUENO')) {
          porteEmpresa = 'EPP';
        } else if (codigoPorte === 5) {
          const capitalSocial = data.capital_social || 0;
          porteEmpresa = capitalSocial > 300000000 ? 'GRANDE' : 'MEDIO';
        }
        
        return {
          razao_social: data.razao_social,
          nome_fantasia: data.nome_fantasia || '',
          telefone: data.ddd_telefone_1 || '',
          email: data.email?.toLowerCase() || '',
          cep: data.cep || '',
          endereco: data.logradouro || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.municipio || '',
          estado: data.uf || '',
          porte_empresa: porteEmpresa,
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Função para buscar dados do CEP
  const buscarDadosCep = async (cep: string): Promise<Record<string, any> | null> => {
    try {
      const cepLimpo = cep.replace(/\D/g, '');
      if (cepLimpo.length !== 8) return null;

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) return null;

      return {
        endereco: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      };
    } catch (error) {
      return null;
    }
  };

  // Função para enriquecer dados de uma linha
  const enriquecerLinha = async (row: Record<string, any>): Promise<Record<string, any>> => {
    const enrichedRow = { ...row };
    
    const cnpj = row['CNPJ']?.toString().trim();
    
    if (cnpj) {
      const dadosCnpj = await buscarDadosCnpj(cnpj);
      if (dadosCnpj) {
        // Marcar que CNPJ foi validado com sucesso
        enrichedRow['_cnpj_valido'] = true;
        enrichedRow['_cnpj_erro'] = false;
        if (!row['Razão Social']?.toString().trim() && dadosCnpj.razao_social) {
          enrichedRow['Razão Social'] = dadosCnpj.razao_social;
        }
        if (!row['Nome Fantasia']?.toString().trim() && dadosCnpj.nome_fantasia) {
          enrichedRow['Nome Fantasia'] = dadosCnpj.nome_fantasia;
        }
        if (!row['Telefone']?.toString().trim() && dadosCnpj.telefone) {
          enrichedRow['Telefone'] = dadosCnpj.telefone;
        }
        if (!row['E-mail']?.toString().trim() && dadosCnpj.email) {
          enrichedRow['E-mail'] = dadosCnpj.email;
        }
        if (!row['CEP']?.toString().trim() && dadosCnpj.cep) {
          enrichedRow['CEP'] = dadosCnpj.cep;
        }
        if (!row['Endereço']?.toString().trim() && dadosCnpj.endereco) {
          enrichedRow['Endereço'] = dadosCnpj.endereco;
        }
        if (!row['Número']?.toString().trim() && dadosCnpj.numero) {
          enrichedRow['Número'] = dadosCnpj.numero;
        }
        if (!row['Complemento']?.toString().trim() && dadosCnpj.complemento) {
          enrichedRow['Complemento'] = dadosCnpj.complemento;
        }
        if (!row['Bairro']?.toString().trim() && dadosCnpj.bairro) {
          enrichedRow['Bairro'] = dadosCnpj.bairro;
        }
        if (!row['Cidade']?.toString().trim() && dadosCnpj.cidade) {
          enrichedRow['Cidade'] = dadosCnpj.cidade;
        }
        if (!row['Estado (UF)']?.toString().trim() && dadosCnpj.estado) {
          enrichedRow['Estado (UF)'] = dadosCnpj.estado;
        }
        if (!row['Porte (MEI, ME, EPP, MEDIO, GRANDE)']?.toString().trim() && dadosCnpj.porte_empresa) {
          enrichedRow['Porte (MEI, ME, EPP, MEDIO, GRANDE)'] = dadosCnpj.porte_empresa;
        }
      } else {
        // CNPJ foi informado mas não retornou dados da API (CNPJ inválido ou não encontrado)
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        if (cnpjLimpo.length === 14) {
          enrichedRow['_cnpj_erro'] = true;
          enrichedRow['_cnpj_valido'] = false;
        }
      }
    }
    
    const cep = enrichedRow['CEP']?.toString().trim();
    const temEndereco = enrichedRow['Endereço']?.toString().trim();
    const temCidade = enrichedRow['Cidade']?.toString().trim();
    
    if (cep && (!temEndereco || !temCidade)) {
      const dadosCep = await buscarDadosCep(cep);
      if (dadosCep) {
        if (!temEndereco && dadosCep.endereco) {
          enrichedRow['Endereço'] = dadosCep.endereco;
        }
        if (!enrichedRow['Bairro']?.toString().trim() && dadosCep.bairro) {
          enrichedRow['Bairro'] = dadosCep.bairro;
        }
        if (!temCidade && dadosCep.cidade) {
          enrichedRow['Cidade'] = dadosCep.cidade;
        }
        if (!enrichedRow['Estado (UF)']?.toString().trim() && dadosCep.estado) {
          enrichedRow['Estado (UF)'] = dadosCep.estado;
        }
      }
    }
    
    return enrichedRow;
  };

  // Exportar empresas
  const handleExport = async () => {
    const data = empresas.map(empresa => ({
      'Razão Social': empresa.razao_social || empresa.nome || '',
      'Nome Fantasia': empresa.nome_fantasia || '',
      'Tipo (sst ou lead)': empresa.tipo || '',
      'CNPJ': empresa.cnpj || '',
      'E-mail': empresa.email || '',
      'Telefone': empresa.telefone || '',
      'Porte (MEI, ME, EPP, MEDIO, GRANDE)': empresa.porte || '',
      'CEP': empresa.cep || '',
      'Endereço': empresa.endereco || '',
      'Número': empresa.numero || '',
      'Complemento': empresa.complemento || '',
      'Bairro': empresa.bairro || '',
      'Cidade': empresa.cidade || '',
      'Estado (UF)': empresa.estado || '',
      'Site': empresa.site || '',
      'LinkedIn': empresa.linkedin || '',
      'Instagram': empresa.instagram || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');

    const colWidths = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
    ws['!cols'] = colWidths;

    const fileName = `empresas_${new Date().toISOString().split('T')[0]}`;
    
    if (exportFormat === 'xlsx') {
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
      XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
    }

    toast.success(`${empresas.length} empresa(s) exportada(s) com sucesso`);
    setExportDialogOpen(false);
  };

  // Baixar template de importação
  const handleDownloadTemplate = () => {
    const templateData = [
      TEMPLATE_COLUMNS.reduce((acc, col) => {
        acc[col.label] = '';
        return acc;
      }, {} as Record<string, string>),
    ];

    const exampleRow: Record<string, string> = {
      'Razão Social': 'Empresa Exemplo LTDA',
      'Nome Fantasia': 'Exemplo',
      'Tipo (sst ou lead)': 'sst',
      'CNPJ': '00.000.000/0001-00',
      'E-mail': 'contato@empresa.com',
      'Telefone': '(11) 99999-9999',
      'Porte (MEI, ME, EPP, MEDIO, GRANDE)': 'ME',
      'CEP': '01310-100',
      'Endereço': 'Av. Paulista',
      'Número': '1000',
      'Complemento': 'Sala 101',
      'Bairro': 'Bela Vista',
      'Cidade': 'São Paulo',
      'Estado (UF)': 'SP',
      'Site': 'https://empresa.com.br',
      'LinkedIn': 'https://linkedin.com/company/empresa',
      'Instagram': 'https://instagram.com/empresa',
      'Contato - Nome': 'João Silva',
      'Contato - Cargo': 'Gerente Comercial',
      'Contato - E-mail': 'joao@empresa.com',
      'Contato - Telefone': '(11) 99999-8888',
      'Contato - LinkedIn': 'https://linkedin.com/in/joaosilva',
    };
    templateData.push(exampleRow);

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    const colWidths = TEMPLATE_COLUMNS.map(col => ({ wch: Math.max(col.label.length, 20) }));
    ws['!cols'] = colWidths;

    if (exportFormat === 'xlsx') {
      XLSX.writeFile(wb, 'template_importacao_empresas.xlsx');
    } else {
      XLSX.writeFile(wb, 'template_importacao_empresas.csv', { bookType: 'csv' });
    }

    toast.success('Template baixado');
  };

  // Validar arquivo
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (jsonData.length === 0) {
        toast.error('O arquivo não contém dados para importar');
        return;
      }

      const dataToImport = jsonData.filter(row => 
        (row['Razão Social'] && row['Razão Social'] !== 'Empresa Exemplo LTDA') ||
        row['CNPJ']?.toString().trim()
      );

      if (dataToImport.length === 0) {
        toast.error('Nenhum dado válido encontrado');
        return;
      }

      setImportStep('enriching');
      setEnrichingProgress(0);
      setEnrichingStatus('Iniciando busca de dados...');

      const enrichedData: Record<string, any>[] = [];
      for (let i = 0; i < dataToImport.length; i++) {
        const row = dataToImport[i];
        const cnpj = row['CNPJ']?.toString().trim();
        
        setEnrichingStatus(`Processando linha ${i + 1} de ${dataToImport.length}${cnpj ? ` - CNPJ: ${cnpj}` : ''}`);
        
        const enrichedRow = await enriquecerLinha(row);
        enrichedData.push(enrichedRow);
        
        setEnrichingProgress(Math.round(((i + 1) / dataToImport.length) * 100));
        
        if (i < dataToImport.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Validar dados
      const validated: ValidatedRow[] = enrichedData.map((row, index) => {
        const validatedRow: ValidatedRow = {
          rowNumber: index + 2,
          data: row,
          errors: [],
        };
        return revalidateRow(validatedRow);
      });

      setValidatedData(validated);
      setImportStep('review');
      setEnrichingStatus('');

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo');
      resetImportState();
    }
  };

  // Confirmar importação
  const handleConfirmImport = async () => {
    const validRows = validatedData.filter(r => r.errors.length === 0);
    
    if (validRows.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }

    setImportStep('importing');
    setImportProgress(0);

    const results = { success: 0, errors: [] as { row: number; error: string }[] };

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      try {
        const tipo = row.data['Tipo (sst ou lead)']?.toString().trim().toLowerCase();
        const razaoSocial = row.data['Razão Social']?.toString().trim();
        
        const empresaData = {
          nome: razaoSocial,
          razao_social: razaoSocial,
          nome_fantasia: row.data['Nome Fantasia']?.toString().trim() || null,
          tipo: tipo,
          cnpj: row.data['CNPJ']?.toString().trim() || null,
          email: row.data['E-mail']?.toString().trim() || null,
          telefone: row.data['Telefone']?.toString().trim() || null,
          porte: row.data['Porte (MEI, ME, EPP, MEDIO, GRANDE)']?.toString().trim().toUpperCase() || null,
          cep: row.data['CEP']?.toString().trim() || null,
          endereco: row.data['Endereço']?.toString().trim() || null,
          numero: row.data['Número']?.toString().trim() || null,
          complemento: row.data['Complemento']?.toString().trim() || null,
          bairro: row.data['Bairro']?.toString().trim() || null,
          cidade: row.data['Cidade']?.toString().trim() || null,
          estado: row.data['Estado (UF)']?.toString().trim().toUpperCase() || null,
          site: row.data['Site']?.toString().trim() || null,
          linkedin: row.data['LinkedIn']?.toString().trim() || null,
          instagram: row.data['Instagram']?.toString().trim() || null,
        };

        const { data: empresaInserida, error } = await supabase
          .from('empresas')
          .insert(empresaData as any)
          .select('id')
          .single();

        if (error) throw error;

        // Inserir contato se houver dados
        const contatoNome = row.data['Contato - Nome']?.toString().trim();
        if (contatoNome && empresaInserida?.id) {
          const contatoData = {
            empresa_id: empresaInserida.id,
            nome: contatoNome,
            cargo: row.data['Contato - Cargo']?.toString().trim() || null,
            email: row.data['Contato - E-mail']?.toString().trim() || null,
            telefone: row.data['Contato - Telefone']?.toString().trim() || null,
            linkedin: row.data['Contato - LinkedIn']?.toString().trim() || null,
            principal: true,
          };

          await supabase
            .from('empresa_contatos')
            .insert(contatoData as any);
        }

        results.success++;
      } catch (error: any) {
        results.errors.push({
          row: row.rowNumber,
          error: error.message || 'Erro desconhecido',
        });
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImportResults(results);
    setImportStep('complete');

    if (results.success > 0) {
      onImportSuccess();
    }
  };

  return (
    <>
      {/* Botões de Exportar e Importar */}
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

      {/* Dialog de Exportação */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Empresas
            </DialogTitle>
            <DialogDescription>
              Exporte a lista de empresas para um arquivo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Formato do arquivo</Label>
              <Select value={exportFormat} onValueChange={(v: 'csv' | 'xlsx') => setExportFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Serão exportadas <strong>{empresas.length}</strong> empresa(s).
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Importação */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) resetImportState();
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Empresas
            </DialogTitle>
            <DialogDescription>
              Importe empresas a partir de um arquivo Excel ou CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            {/* Etapa 1: Upload */}
            {importStep === 'upload' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Formato do template</Label>
                  <Select value={exportFormat} onValueChange={(v: 'csv' | 'xlsx') => setExportFormat(v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Baixar Template
                </Button>

                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragging 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-lg font-medium">
                    {isDragging ? 'Solte o arquivo aqui' : 'Clique para selecionar o arquivo'}
                  </p>
                  <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
                  <p className="text-xs text-muted-foreground mt-2">Formatos aceitos: .xlsx, .xls, .csv</p>
                </div>
              </div>
            )}

            {/* Etapa 2: Enriquecendo */}
            {importStep === 'enriching' && (
              <div className="space-y-4 py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-center text-muted-foreground">Buscando dados complementares...</p>
                <Progress value={enrichingProgress} />
                <p className="text-center text-sm text-muted-foreground">{enrichingStatus}</p>
              </div>
            )}

            {/* Etapa 3: Revisão */}
            {importStep === 'review' && (
              <>
                {/* Cards de filtro */}
                <div className="flex items-center gap-3 mb-4">
                  <Badge 
                    variant={filterType === 'all' ? 'default' : 'outline'} 
                    className={`cursor-pointer px-4 py-2 text-sm ${filterType === 'all' ? '' : 'hover:bg-muted'}`}
                    onClick={() => { setFilterType('all'); setCurrentPage(1); }}
                  >
                    Total: {stats.total}
                  </Badge>
                  <Badge 
                    variant={filterType === 'valid' ? 'default' : 'outline'} 
                    className={`cursor-pointer px-4 py-2 text-sm ${filterType === 'valid' ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-600 hover:bg-green-50'}`}
                    onClick={() => { setFilterType('valid'); setCurrentPage(1); }}
                  >
                    Válidos: {stats.valid}
                  </Badge>
                  {stats.withErrors > 0 && (
                    <Badge 
                      variant={filterType === 'errors' ? 'destructive' : 'outline'} 
                      className={`cursor-pointer px-4 py-2 text-sm ${filterType === 'errors' ? '' : 'text-destructive border-destructive hover:bg-red-50'}`}
                      onClick={() => { setFilterType('errors'); setCurrentPage(1); }}
                    >
                      Com erros: {stats.withErrors}
                    </Badge>
                  )}
                </div>

                {stats.withErrors > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Corrija os erros antes de importar.</strong> Clique no card "Com erros" para filtrar. Você pode editar os campos diretamente na tabela.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Tabela de dados - todas as colunas editáveis */}
                <div className="border rounded-lg overflow-auto max-h-[400px] bg-card">
                  <Table style={{ minWidth: '2400px' }}>
                    <TableHeader className="sticky top-0 z-20" style={{ backgroundColor: 'hsl(var(--card))' }}>
                      <TableRow style={{ backgroundColor: 'hsl(var(--card))' }}>
                        <TableHead style={{ position: 'sticky', left: 0, zIndex: 30, backgroundColor: 'hsl(var(--card))', width: 40, minWidth: 40 }} className="p-1 border-r"></TableHead>
                        <TableHead style={{ position: 'sticky', left: 40, zIndex: 30, backgroundColor: 'hsl(var(--card))', width: 50, minWidth: 50 }} className="p-2 border-r text-center text-xs font-medium">Linha</TableHead>
                        <TableHead style={{ position: 'sticky', left: 90, zIndex: 30, backgroundColor: 'hsl(var(--card))', width: 60, minWidth: 60 }} className="p-2 border-r text-center text-xs font-medium">Status</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[200px] p-2 text-xs font-medium">Razão Social *</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[180px] p-2 text-xs font-medium">Nome Fantasia</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[90px] p-2 text-xs font-medium">Tipo *</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[150px] p-2 text-xs font-medium">CNPJ</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[180px] p-2 text-xs font-medium">E-mail</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[130px] p-2 text-xs font-medium">Telefone</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[90px] p-2 text-xs font-medium">Porte</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[100px] p-2 text-xs font-medium">CEP</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[180px] p-2 text-xs font-medium">Endereço</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[70px] p-2 text-xs font-medium">Nº</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[100px] p-2 text-xs font-medium">Compl.</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[120px] p-2 text-xs font-medium">Bairro</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[120px] p-2 text-xs font-medium">Cidade</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[50px] p-2 text-xs font-medium">UF</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[140px] p-2 text-xs font-medium">Site</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[140px] p-2 text-xs font-medium">LinkedIn</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[140px] p-2 text-xs font-medium">Instagram</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[150px] p-2 text-xs font-medium">Contato Nome</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[120px] p-2 text-xs font-medium">Contato Cargo</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[180px] p-2 text-xs font-medium">Contato E-mail</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[130px] p-2 text-xs font-medium">Contato Tel</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[150px] p-2 text-xs font-medium">Contato LinkedIn</TableHead>
                        <TableHead style={{ backgroundColor: 'hsl(var(--card))' }} className="min-w-[250px] p-2 text-xs font-medium">Erros</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((row) => {
                        const hasError = row.errors.length > 0;
                        const rowBg = hasError ? '#3b1c1c' : 'hsl(var(--card))';
                        const stickyBg = hasError ? '#4a2020' : 'hsl(var(--card))';
                        return (
                        <TableRow key={row.rowNumber} style={{ backgroundColor: rowBg }}>
                          <TableCell style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: stickyBg, width: 40, minWidth: 40 }} className="p-1 border-r">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteRow(row.rowNumber)}
                              title="Excluir linha"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                          <TableCell style={{ position: 'sticky', left: 40, zIndex: 10, backgroundColor: stickyBg, width: 50, minWidth: 50 }} className="p-2 border-r text-center font-mono text-xs">{row.rowNumber}</TableCell>
                          <TableCell style={{ position: 'sticky', left: 90, zIndex: 10, backgroundColor: stickyBg, width: 60, minWidth: 60 }} className="p-1 border-r text-center">
                            {hasError ? (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Erro</Badge>
                            ) : (
                              <Badge className="text-[10px] px-1.5 py-0 bg-green-600">OK</Badge>
                            )}
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Razão Social'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Razão Social', e.target.value)}
                              className={`h-8 text-sm ${!row.data['Razão Social'] ? 'border-destructive' : ''}`}
                              placeholder="Obrigatório"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Nome Fantasia'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Nome Fantasia', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Select
                              value={row.data['Tipo (sst ou lead)']?.toLowerCase() || ''}
                              onValueChange={(v) => handleUpdateRowData(row.rowNumber, 'Tipo (sst ou lead)', v)}
                            >
                              <SelectTrigger className={`h-8 text-sm w-24 ${!row.data['Tipo (sst ou lead)'] ? 'border-destructive' : ''}`}>
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sst">SST</SelectItem>
                                <SelectItem value="lead">Lead</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['CNPJ'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'CNPJ', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['E-mail'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'E-mail', e.target.value)}
                              className="h-8 text-sm"
                              type="email"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Telefone'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Telefone', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Select
                              value={row.data['Porte (MEI, ME, EPP, MEDIO, GRANDE)'] || ''}
                              onValueChange={(v) => handleUpdateRowData(row.rowNumber, 'Porte (MEI, ME, EPP, MEDIO, GRANDE)', v === '_empty_' ? '' : v)}
                            >
                              <SelectTrigger className="h-8 text-sm w-24">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_empty_">&nbsp;</SelectItem>
                                <SelectItem value="MEI">MEI</SelectItem>
                                <SelectItem value="ME">ME</SelectItem>
                                <SelectItem value="EPP">EPP</SelectItem>
                                <SelectItem value="MEDIO">MÉDIO</SelectItem>
                                <SelectItem value="GRANDE">GRANDE</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['CEP'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'CEP', e.target.value)}
                              className="h-8 text-sm w-24"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Endereço'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Endereço', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Número'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Número', e.target.value)}
                              className="h-8 text-sm w-16"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Complemento'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Complemento', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Bairro'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Bairro', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Cidade'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Cidade', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Estado (UF)'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Estado (UF)', e.target.value.toUpperCase())}
                              className="h-8 text-sm w-14"
                              maxLength={2}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Site'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Site', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['LinkedIn'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'LinkedIn', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Instagram'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Instagram', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Contato - Nome'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Contato - Nome', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Contato - Cargo'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Contato - Cargo', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Contato - E-mail'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Contato - E-mail', e.target.value)}
                              className="h-8 text-sm"
                              type="email"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Contato - Telefone'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Contato - Telefone', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={row.data['Contato - LinkedIn'] || ''}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'Contato - LinkedIn', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            {row.errors.length > 0 && (
                              <div className="text-xs text-destructive">
                                {row.errors.map((err, idx) => (
                                  <div key={idx}>• {err}</div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de {filteredData.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">Página {currentPage} de {totalPages}</span>
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
              </>
            )}

            {/* Etapa 4: Importando */}
            {importStep === 'importing' && (
              <div className="space-y-4 py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-center text-muted-foreground">Importando empresas...</p>
                <Progress value={importProgress} />
                <p className="text-center text-sm text-muted-foreground">{importProgress}%</p>
              </div>
            )}

            {/* Etapa 5: Concluído */}
            {importStep === 'complete' && importResults && (
              <div className="space-y-4 py-8 text-center">
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
                <div>
                  <p className="text-xl font-semibold text-green-600">
                    {importResults.success} empresa(s) importada(s) com sucesso!
                  </p>
                  {importResults.errors.length > 0 && (
                    <p className="text-sm text-destructive mt-2">
                      {importResults.errors.length} erro(s) durante a importação.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            {importStep === 'upload' && (
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                Cancelar
              </Button>
            )}

            {importStep === 'review' && (
              <div className="flex gap-2 w-full justify-between">
                <Button variant="outline" onClick={resetImportState}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <div className="flex gap-2">
                  {stats.valid >= 50 && (
                    <Button 
                      variant="secondary"
                      onClick={async () => {
                        const validRows = validatedData.filter(r => r.errors.length === 0);
                        const dataToImport = validRows.map(r => r.data);
                        
                        // Pegar empresa_id do primeiro registro ou usar um ID genérico
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) {
                          toast.error('Usuário não autenticado');
                          return;
                        }
                        
                        // Buscar empresa do usuário
                        const { data: profile } = await supabase
                          .from('profiles')
                          .select('empresa_id')
                          .eq('id', user.id)
                          .single();
                        
                        if (!profile?.empresa_id) {
                          toast.error('Empresa não encontrada');
                          return;
                        }
                        
                        await startImport(profile.empresa_id, 'empresas', dataToImport);
                        setImportDialogOpen(false);
                        resetImportState();
                        toast.success('Importação iniciada em segundo plano! Você pode acompanhar o progresso no canto inferior direito.');
                      }}
                      disabled={stats.valid === 0}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Importar em Background
                    </Button>
                  )}
                  <Button 
                    onClick={handleConfirmImport} 
                    disabled={stats.withErrors > 0 || stats.valid === 0}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Agora ({stats.valid})
                  </Button>
                </div>
              </div>
            )}

            {importStep === 'complete' && (
              <Button onClick={() => {
                setImportDialogOpen(false);
                resetImportState();
              }}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
