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
import { Download, Upload, FileSpreadsheet, FileText, Loader2, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Cliente {
  id: string;
  nome: string;
  sigla: string | null;
  cnpj: string | null;
  responsavel: string | null;
  responsavel_id: string | null;
  responsavel_profile?: { id: string; nome: string; email: string } | null;
  email: string | null;
  telefone: string | null;
  tipo_inscricao?: string | null;
  numero_inscricao_esocial?: string | null;
  cnae?: string | null;
  cnae_atividade?: string | null;
  grau_risco?: string | null;
  porte_empresa?: string | null;
  categoria_id?: string | null;
  cliente_empresa?: {
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
  } | null;
}

interface Categoria {
  id: string;
  nome: string;
  cor?: string | null;
  ativo: boolean;
}

interface OrigemContato {
  id: string;
  nome: string;
  cor?: string | null;
  ativo: boolean;
}

interface ClienteContato {
  id: string;
  cliente_id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  linkedin: string | null;
  principal: boolean;
}

interface ClientesImportExportProps {
  clientes: Cliente[];
  empresaId: string;
  usuarios: { id: string; nome: string; email: string }[];
  categorias: Categoria[];
  origensContato?: OrigemContato[];
  onImportSuccess: () => void;
}

// Campos do template de importação
const TEMPLATE_COLUMNS = [
  { key: 'razao_social', label: 'Razão Social', required: true },
  { key: 'nome_fantasia', label: 'Nome Fantasia', required: false },
  { key: 'sigla', label: 'Sigla', required: false },
  { key: 'cnpj', label: 'CNPJ', required: false },
  { key: 'email', label: 'E-mail', required: false },
  { key: 'telefone', label: 'Telefone', required: false },
  { key: 'tipo_inscricao', label: 'Tipo Inscrição (1=CNPJ, 2=CPF, 3=CAEPF, 4=CNO, 5=CGC, 6=CEI)', required: false },
  { key: 'numero_inscricao_esocial', label: 'Número Inscrição eSocial', required: false },
  { key: 'cnae', label: 'CNAE', required: false },
  { key: 'cnae_atividade', label: 'Atividade CNAE', required: false },
  { key: 'grau_risco', label: 'Grau de Risco (1, 2, 3 ou 4)', required: false },
  { key: 'porte_empresa', label: 'Porte (MEI, ME, EPP, MEDIO, GRANDE)', required: false },
  { key: 'cep', label: 'CEP', required: false },
  { key: 'endereco', label: 'Endereço', required: false },
  { key: 'numero', label: 'Número', required: false },
  { key: 'complemento', label: 'Complemento', required: false },
  { key: 'bairro', label: 'Bairro', required: false },
  { key: 'cidade', label: 'Cidade', required: false },
  { key: 'estado', label: 'Estado (UF)', required: false },
  { key: 'categoria', label: 'Categoria', required: false },
  { key: 'origem_contato', label: 'Origem do Contato', required: false },
  { key: 'responsavel', label: 'Responsável (nome do usuário SST)', required: false },
  { key: 'admin_nome', label: 'Nome do Administrador', required: false },
  { key: 'admin_email', label: 'E-mail do Administrador', required: false },
  { key: 'contato_nome', label: 'Contato - Nome', required: false },
  { key: 'contato_cargo', label: 'Contato - Cargo', required: false },
  { key: 'contato_email', label: 'Contato - E-mail', required: false },
  { key: 'contato_telefone', label: 'Contato - Telefone', required: false },
  { key: 'contato_linkedin', label: 'Contato - LinkedIn', required: false },
];

// Função para gerar sigla automaticamente a partir do nome (máx 3 caracteres)
const gerarSiglaAutomatica = (nome: string): string => {
  if (!nome) return '';
  // Remover palavras comuns
  const palavrasIgnoradas = ['de', 'da', 'do', 'das', 'dos', 'e', 'ltda', 'me', 'epp', 'eireli', 's/a', 'sa', 'ss'];
  const palavras = nome.split(/\s+/).filter(p => !palavrasIgnoradas.includes(p.toLowerCase()));
  
  if (palavras.length === 1) {
    // Se só tem uma palavra, pegar as 3 primeiras letras
    return palavras[0].substring(0, 3).toUpperCase();
  }
  
  // Pegar a primeira letra de cada palavra (máx 3 para caber no campo)
  return palavras.slice(0, 3).map(p => p[0]).join('').toUpperCase();
};

// Interface para dados validados
interface ValidatedRow {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
  responsavelId: string | null;
  responsavelNome: string | null;
  categoriaId: string | null;
  origemContatoId: string | null;
  siglaGerada: string | null;
}

// Etapas do fluxo de importação
type ImportStep = 'upload' | 'enriching' | 'review' | 'importing' | 'complete';

export function ClientesImportExport({ clientes, empresaId, usuarios, categorias, origensContato = [], onImportSuccess }: ClientesImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('xlsx');
  
  // Estados do novo fluxo de importação
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
  const [showNomeFantasiaModal, setShowNomeFantasiaModal] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Calcular estatísticas
  const stats = useMemo(() => {
    const total = validatedData.length;
    const withErrors = validatedData.filter(r => r.errors.length > 0).length;
    const valid = total - withErrors;
    // Contar registros válidos sem Nome Fantasia
    const withoutNomeFantasia = validatedData.filter(r => 
      r.errors.length === 0 && 
      !r.data['Nome Fantasia']?.toString().trim() &&
      r.data['Razão Social']?.toString().trim()
    ).length;
    return { total, withErrors, valid, withoutNomeFantasia };
  }, [validatedData]);

  // Dados filtrados baseado no tipo de filtro selecionado
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

  // Função para atualizar campo de uma linha
  const handleUpdateRowData = (rowNumber: number, field: string, value: string) => {
    setValidatedData(prev => prev.map(row => {
      if (row.rowNumber === rowNumber) {
        const newData = { ...row.data, [field]: value };
        // Revalidar a linha após edição
        return revalidateRow({ ...row, data: newData });
      }
      return row;
    }));
  };

  // Função para excluir uma linha
  const handleDeleteRow = (rowNumber: number) => {
    setValidatedData(prev => {
      const newData = prev.filter(row => row.rowNumber !== rowNumber);
      // Se a página atual ficar vazia, voltar para a anterior
      const newTotalPages = Math.ceil(
        (filterType === 'errors' ? newData.filter(r => r.errors.length > 0).length : filterType === 'valid' ? newData.filter(r => r.errors.length === 0).length : newData.length) / ITEMS_PER_PAGE
      );
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
      return newData;
    });
    toast({
      title: 'Linha removida',
      description: `Linha ${rowNumber} foi removida da importação.`,
    });
  };

  // Função para revalidar uma linha após edição
  const revalidateRow = (row: ValidatedRow): ValidatedRow => {
    const errors: string[] = [];
    const data = row.data;
    
    // Validar Razão Social obrigatória
    const razaoSocial = data['Razão Social']?.toString().trim();
    if (!razaoSocial) {
      errors.push('Razão Social é obrigatória');
    }

    // Validar responsável
    const responsavelNome = data['Responsável (nome do usuário SST)']?.toString().trim();
    let responsavelId: string | null = null;
    let responsavelNomeFinal: string | null = null;
    
    if (responsavelNome) {
      const usuarioEncontrado = usuarios.find(u => 
        u.nome.toLowerCase() === responsavelNome.toLowerCase()
      );
      if (usuarioEncontrado) {
        responsavelId = usuarioEncontrado.id;
        responsavelNomeFinal = usuarioEncontrado.nome;
      } else {
        const nomesDisponiveis = usuarios.map(u => u.nome).slice(0, 3).join(', ');
        errors.push(`Responsável "${responsavelNome}" não encontrado. Disponíveis: ${nomesDisponiveis}...`);
      }
    }

    // Validar categoria
    const categoriaNome = data['Categoria']?.toString().trim();
    let categoriaId: string | null = null;
    
    if (categoriaNome) {
      const categoriaEncontrada = categorias.find(c => 
        c.nome.toLowerCase() === categoriaNome.toLowerCase() && c.ativo
      );
      if (categoriaEncontrada) {
        categoriaId = categoriaEncontrada.id;
      } else {
        const categoriasDisponiveis = categorias.filter(c => c.ativo).map(c => c.nome).slice(0, 3).join(', ');
        errors.push(`Categoria "${categoriaNome}" não encontrada. Disponíveis: ${categoriasDisponiveis}...`);
      }
    }

    // Validar origem do contato
    const origemContatoNome = data['Origem do Contato']?.toString().trim();
    let origemContatoId: string | null = null;
    
    if (origemContatoNome) {
      const origemEncontrada = origensContato.find(o => 
        o.nome.toLowerCase() === origemContatoNome.toLowerCase() && o.ativo
      );
      if (origemEncontrada) {
        origemContatoId = origemEncontrada.id;
      } else {
        const origensDisponiveis = origensContato.filter(o => o.ativo).map(o => o.nome).slice(0, 3).join(', ');
        errors.push(`Origem do Contato "${origemContatoNome}" não encontrada. Disponíveis: ${origensDisponiveis}...`);
      }
    }

    // Validar email do admin
    const adminEmail = data['E-mail do Administrador']?.toString().trim();
    const adminNome = data['Nome do Administrador']?.toString().trim();
    if (adminEmail && !adminNome) {
      errors.push('Nome do Administrador é obrigatório quando e-mail é informado');
    }
    if (adminNome && !adminEmail) {
      errors.push('E-mail do Administrador é obrigatório quando nome é informado');
    }

    // Gerar sigla
    const siglaFornecida = data['Sigla']?.toString().trim();
    const siglaGerada = (siglaFornecida || gerarSiglaAutomatica(razaoSocial || '')).substring(0, 3);

    return {
      ...row,
      errors,
      responsavelId,
      responsavelNome: responsavelNomeFinal,
      categoriaId,
      origemContatoId,
      siglaGerada,
    };
  };

  // Função para buscar dados do CNPJ via BrasilAPI diretamente
  const buscarDadosCnpj = async (cnpj: string): Promise<Record<string, any> | null> => {
    try {
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) {
        console.warn(`CNPJ inválido (${cnpjLimpo.length} dígitos): ${cnpj}`);
        return null;
      }

      console.log(`Buscando CNPJ na BrasilAPI: ${cnpjLimpo}`);
      
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      
      if (response.status === 429) {
        console.warn('Limite de consultas atingido na BrasilAPI');
        return null;
      }
      
      if (response.status === 404) {
        console.warn('CNPJ não encontrado na BrasilAPI');
        return null;
      }
      
      if (!response.ok) {
        console.warn('Erro na BrasilAPI:', response.status);
        return null;
      }
      
      const data = await response.json();

      if (data?.razao_social) {
        console.log(`CNPJ encontrado: ${data.razao_social}`);
        
        // Mapear porte da API BrasilAPI para o formato do sistema
        // BrasilAPI: codigo_porte (1=ME, 3=EPP, 5=Demais), porte (string)
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
        
        // Formatar CNAE
        const cnaeFormatado = data.cnae_fiscal 
          ? `${data.cnae_fiscal.toString().slice(0, 4)}-${data.cnae_fiscal.toString().slice(4, 5)}/${data.cnae_fiscal.toString().slice(5)}`
          : '';
        
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
          cnae: cnaeFormatado,
          cnae_atividade: data.cnae_fiscal_descricao || '',
          porte_empresa: porteEmpresa,
        };
      }
      
      console.warn('CNPJ não retornou razao_social:', data);
      return null;
    } catch (error: any) {
      // Melhor log para erros de rede (CORS, timeout, etc.)
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
      console.warn(`Erro ao buscar CNPJ (${cnpj}): ${errorMessage}`);
      // Não logar como error para não poluir o console - é esperado falhar em alguns casos
      return null;
    }
  };

  // Função para buscar dados do CEP via API
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
      console.error('Erro ao buscar CEP:', error);
      return null;
    }
  };

  // Função para enriquecer dados de uma linha
  const enriquecerLinha = async (row: Record<string, any>): Promise<Record<string, any>> => {
    const enrichedRow = { ...row };
    
    // Verificar se tem CNPJ - sempre buscar dados da API para preencher campos vazios
    const cnpj = row['CNPJ']?.toString().trim();
    
    if (cnpj) {
      const dadosCnpj = await buscarDadosCnpj(cnpj);
      if (dadosCnpj) {
        // Preencher apenas campos vazios com dados da API
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
        if (!row['CNAE']?.toString().trim() && dadosCnpj.cnae) {
          enrichedRow['CNAE'] = dadosCnpj.cnae;
        }
        if (!row['Atividade CNAE']?.toString().trim() && dadosCnpj.cnae_atividade) {
          enrichedRow['Atividade CNAE'] = dadosCnpj.cnae_atividade;
        }
        if (!row['Porte (MEI, ME, EPP, MEDIO, GRANDE)']?.toString().trim() && dadosCnpj.porte_empresa) {
          enrichedRow['Porte (MEI, ME, EPP, MEDIO, GRANDE)'] = dadosCnpj.porte_empresa;
        }
      }
    }
    
    // Verificar se precisa buscar dados do CEP (se ainda não tem endereço completo)
    const cep = enrichedRow['CEP']?.toString().trim();
    const temEnderecoAgora = enrichedRow['Endereço']?.toString().trim();
    const temCidadeAgora = enrichedRow['Cidade']?.toString().trim();
    
    if (cep && (!temEnderecoAgora || !temCidadeAgora)) {
      const dadosCep = await buscarDadosCep(cep);
      if (dadosCep) {
        if (!temEnderecoAgora && dadosCep.endereco) {
          enrichedRow['Endereço'] = dadosCep.endereco;
        }
        if (!enrichedRow['Bairro']?.toString().trim() && dadosCep.bairro) {
          enrichedRow['Bairro'] = dadosCep.bairro;
        }
        if (!temCidadeAgora && dadosCep.cidade) {
          enrichedRow['Cidade'] = dadosCep.cidade;
        }
        if (!enrichedRow['Estado (UF)']?.toString().trim() && dadosCep.estado) {
          enrichedRow['Estado (UF)'] = dadosCep.estado;
        }
      }
    }
    
    return enrichedRow;
  };

  // Exportar clientes
  const handleExport = async () => {
    // Buscar contatos de todos os clientes
    const clienteIds = clientes.map(c => c.id);
    const { data: todosContatos } = await (supabase as any)
      .from('cliente_contatos')
      .select('*')
      .in('cliente_id', clienteIds)
      .order('principal', { ascending: false });

    // Agrupar contatos por cliente
    const contatosPorCliente: Record<string, ClienteContato[]> = {};
    (todosContatos || []).forEach((contato: any) => {
      if (!contatosPorCliente[contato.cliente_id]) {
        contatosPorCliente[contato.cliente_id] = [];
      }
      contatosPorCliente[contato.cliente_id].push(contato);
    });

    const data = clientes.map(cliente => {
      const categoria = categorias.find(c => c.id === cliente.categoria_id);
      const origemContato = origensContato.find(o => o.id === (cliente as any).origem_contato_id);
      const contatos = contatosPorCliente[cliente.id] || [];
      // Pegar apenas o contato principal (primeiro da lista, já ordenada por principal desc)
      const contatoPrincipal = contatos[0];

      return {
        'Razão Social': cliente.nome || '',
        'Nome Fantasia': (cliente as any).cliente_empresa?.nome_fantasia || '',
        'Sigla': cliente.sigla || '',
        'CNPJ': cliente.cnpj || '',
        'E-mail': cliente.email || '',
        'Telefone': cliente.telefone || '',
        'Tipo Inscrição': cliente.tipo_inscricao || '',
        'Número Inscrição eSocial': cliente.numero_inscricao_esocial || '',
        'CNAE': cliente.cnae || '',
        'Atividade CNAE': cliente.cnae_atividade || '',
        'Grau de Risco': cliente.grau_risco || '',
        'Porte': cliente.porte_empresa || '',
        'CEP': cliente.cliente_empresa?.cep || '',
        'Endereço': cliente.cliente_empresa?.endereco || '',
        'Número': cliente.cliente_empresa?.numero || '',
        'Complemento': cliente.cliente_empresa?.complemento || '',
        'Bairro': cliente.cliente_empresa?.bairro || '',
        'Cidade': cliente.cliente_empresa?.cidade || '',
        'Estado': cliente.cliente_empresa?.estado || '',
        'Categoria': categoria?.nome || '',
        'Origem do Contato': origemContato?.nome || '',
        'Responsável': cliente.responsavel_profile?.nome || cliente.responsavel || '',
        'Contato - Nome': contatoPrincipal?.nome || '',
        'Contato - Cargo': contatoPrincipal?.cargo || '',
        'Contato - E-mail': contatoPrincipal?.email || '',
        'Contato - Telefone': contatoPrincipal?.telefone || '',
        'Contato - LinkedIn': contatoPrincipal?.linkedin || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

    // Ajustar largura das colunas
    const colWidths = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
    ws['!cols'] = colWidths;

    const fileName = `clientes_${new Date().toISOString().split('T')[0]}`;
    
    if (exportFormat === 'xlsx') {
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
      XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
    }

    toast({
      title: 'Exportação concluída',
      description: `${clientes.length} cliente(s) exportado(s) com sucesso.`,
    });
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

    // Adicionar linha de exemplo
    const exampleRow: Record<string, string> = {
      'Razão Social': 'Empresa Exemplo LTDA',
      'Nome Fantasia': 'Exemplo',
      'Sigla': 'EXE',
      'CNPJ': '00.000.000/0001-00',
      'E-mail': 'contato@empresa.com',
      'Telefone': '(11) 99999-9999',
      'Tipo Inscrição (1=CNPJ, 2=CPF, 3=CAEPF, 4=CNO, 5=CGC, 6=CEI)': '1',
      'Número Inscrição eSocial': '00.000.000/0001-00',
      'CNAE': '6201-5/00',
      'Atividade CNAE': 'Desenvolvimento de programas de computador',
      'Grau de Risco (1, 2, 3 ou 4)': '1',
      'Porte (MEI, ME, EPP, MEDIO, GRANDE)': 'ME',
      'CEP': '01310-100',
      'Endereço': 'Av. Paulista',
      'Número': '1000',
      'Complemento': 'Sala 101',
      'Bairro': 'Bela Vista',
      'Cidade': 'São Paulo',
      'Estado (UF)': 'SP',
      'Categoria': '',
      'Responsável (nome do usuário SST)': '',
      'Nome do Administrador': '',
      'E-mail do Administrador': '',
      'Contato - Nome': 'João Silva',
      'Contato - Cargo': 'Gerente de RH',
      'Contato - E-mail': 'joao@empresa.com',
      'Contato - Telefone': '(11) 99999-8888',
      'Contato - LinkedIn': 'https://linkedin.com/in/joaosilva',
    };
    templateData.push(exampleRow);

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Ajustar largura das colunas
    const colWidths = TEMPLATE_COLUMNS.map(col => ({ wch: Math.max(col.label.length, 20) }));
    ws['!cols'] = colWidths;

    if (exportFormat === 'xlsx') {
      XLSX.writeFile(wb, 'template_importacao_clientes.xlsx');
    } else {
      XLSX.writeFile(wb, 'template_importacao_clientes.csv', { bookType: 'csv' });
    }

    toast({
      title: 'Template baixado',
      description: 'Preencha o template e importe os clientes.',
    });
  };

  // Validar arquivo sem inserir - apenas carrega, enriquece e valida
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
        toast({
          title: 'Arquivo vazio',
          description: 'O arquivo não contém dados para importar.',
          variant: 'destructive',
        });
        return;
      }

      // Remover linha de exemplo se existir - aceitar linhas com CNPJ mesmo sem razão social
      const dataToImport = jsonData.filter(row => 
        (row['Razão Social'] && row['Razão Social'] !== 'Empresa Exemplo LTDA') ||
        row['CNPJ']?.toString().trim()
      );

      if (dataToImport.length === 0) {
        toast({
          title: 'Nenhum dado válido',
          description: 'Remova a linha de exemplo e adicione seus dados.',
          variant: 'destructive',
        });
        return;
      }

      // Iniciar etapa de enriquecimento
      setImportStep('enriching');
      setEnrichingProgress(0);
      setEnrichingStatus('Iniciando busca de dados...');

      // Enriquecer dados um a um
      const enrichedData: Record<string, any>[] = [];
      for (let i = 0; i < dataToImport.length; i++) {
        const row = dataToImport[i];
        const cnpj = row['CNPJ']?.toString().trim();
        const cep = row['CEP']?.toString().trim();
        
        setEnrichingStatus(`Processando linha ${i + 1} de ${dataToImport.length}${cnpj ? ` - CNPJ: ${cnpj}` : ''}${cep ? ` - CEP: ${cep}` : ''}`);
        
        // Enriquecer a linha com dados das APIs
        const enrichedRow = await enriquecerLinha(row);
        enrichedData.push(enrichedRow);
        
        setEnrichingProgress(Math.round(((i + 1) / dataToImport.length) * 100));
        
        // Pequeno delay para não sobrecarregar as APIs
        if (i < dataToImport.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setEnrichingStatus('Validando dados...');

      // Buscar CNPJs existentes APENAS dos clientes da mesma empresa SST
      // Uma empresa pode ser cliente de múltiplas empresas SST, então só validamos duplicados dentro da mesma empresa SST
      const { data: clientesExistentes } = await supabase
        .from('clientes_sst')
        .select('cnpj')
        .eq('empresa_sst_id', empresaId)
        .not('cnpj', 'is', null);
      
      const cnpjsExistentes = new Set(clientesExistentes?.map(c => c.cnpj?.replace(/\D/g, '')) || []);

      // Validar cada linha enriquecida
      const validated: ValidatedRow[] = enrichedData.map((row, index) => {
        const rowNumber = index + 2; // +2 porque linha 1 é cabeçalho
        const errors: string[] = [];
        
        const razaoSocial = row['Razão Social']?.toString().trim();
        if (!razaoSocial) {
          errors.push('Razão Social é obrigatória (não foi possível obter da API)');
        }

        // Validar CNPJ duplicado (apenas dentro da mesma empresa SST)
        const cnpj = row['CNPJ']?.toString().trim();
        if (cnpj) {
          const cnpjLimpo = cnpj.replace(/\D/g, '');
          if (cnpjsExistentes.has(cnpjLimpo)) {
            errors.push(`CNPJ ${cnpj} já cadastrado como cliente da sua empresa`);
          }
          // Adicionar ao set para detectar duplicados no próprio arquivo
          cnpjsExistentes.add(cnpjLimpo);
        }

        // Validar responsável
        const responsavelNome = row['Responsável (nome do usuário SST)']?.toString().trim();
        let responsavelId: string | null = null;
        let responsavelNomeFinal: string | null = null;
        
        if (responsavelNome) {
          const usuarioEncontrado = usuarios.find(u => 
            u.nome.toLowerCase() === responsavelNome.toLowerCase()
          );
          if (usuarioEncontrado) {
            responsavelId = usuarioEncontrado.id;
            responsavelNomeFinal = usuarioEncontrado.nome;
          } else {
            const nomesDisponiveis = usuarios.map(u => u.nome).slice(0, 5).join(', ');
            errors.push(`Responsável "${responsavelNome}" não encontrado. Usuários disponíveis: ${nomesDisponiveis}${usuarios.length > 5 ? '...' : ''}`);
          }
        }

        // Validar categoria (pelo nome exato)
        const categoriaNome = row['Categoria']?.toString().trim();
        let categoriaId: string | null = null;
        
        if (categoriaNome) {
          const categoriaEncontrada = categorias.find(c => 
            c.nome.toLowerCase() === categoriaNome.toLowerCase() && c.ativo
          );
          if (categoriaEncontrada) {
            categoriaId = categoriaEncontrada.id;
          } else {
            const categoriasDisponiveis = categorias.filter(c => c.ativo).map(c => c.nome).slice(0, 5).join(', ');
            errors.push(`Categoria "${categoriaNome}" não encontrada. Categorias disponíveis: ${categoriasDisponiveis}${categorias.length > 5 ? '...' : ''}`);
          }
        }

        // Validar origem do contato (pelo nome exato)
        const origemContatoNome = row['Origem do Contato']?.toString().trim();
        let origemContatoId: string | null = null;
        
        if (origemContatoNome) {
          const origemEncontrada = origensContato.find(o => 
            o.nome.toLowerCase() === origemContatoNome.toLowerCase() && o.ativo
          );
          if (origemEncontrada) {
            origemContatoId = origemEncontrada.id;
          } else {
            const origensDisponiveis = origensContato.filter(o => o.ativo).map(o => o.nome).slice(0, 5).join(', ');
            errors.push(`Origem do Contato "${origemContatoNome}" não encontrada. Origens disponíveis: ${origensDisponiveis}${origensContato.length > 5 ? '...' : ''}`);
          }
        }

        // Gerar sigla automaticamente se não fornecida (máx 3 caracteres)
        const siglaFornecida = row['Sigla']?.toString().trim();
        const siglaGerada = (siglaFornecida || gerarSiglaAutomatica(razaoSocial || '')).substring(0, 3);

        // Validar email do admin
        const adminEmail = row['E-mail do Administrador']?.toString().trim();
        const adminNome = row['Nome do Administrador']?.toString().trim();
        if (adminEmail && !adminNome) {
          errors.push('Nome do Administrador é obrigatório quando e-mail é informado');
        }
        if (adminNome && !adminEmail) {
          errors.push('E-mail do Administrador é obrigatório quando nome é informado');
        }

        return {
          rowNumber,
          data: row,
          errors,
          responsavelId,
          responsavelNome: responsavelNomeFinal,
          categoriaId,
          origemContatoId,
          siglaGerada,
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
  };

  // Função para preencher Nome Fantasia com Razão Social nos registros que não têm
  const fillNomeFantasiaWithRazaoSocial = () => {
    setValidatedData(prev => prev.map(row => {
      if (
        row.errors.length === 0 &&
        !row.data['Nome Fantasia']?.toString().trim() &&
        row.data['Razão Social']?.toString().trim()
      ) {
        return {
          ...row,
          data: {
            ...row.data,
            'Nome Fantasia': row.data['Razão Social']
          }
        };
      }
      return row;
    }));
    setShowNomeFantasiaModal(false);
    toast({
      title: 'Nome Fantasia preenchido',
      description: `${stats.withoutNomeFantasia} registro(s) atualizado(s) com a Razão Social.`,
    });
  };

  // Verificar se deve mostrar modal de Nome Fantasia antes de importar
  const handleClickConfirmImport = () => {
    if (stats.withErrors > 0) {
      toast({
        title: 'Corrija os erros primeiro',
        description: 'Não é possível importar enquanto houver erros de validação.',
        variant: 'destructive',
      });
      return;
    }

    // Se há registros sem Nome Fantasia, mostrar modal
    if (stats.withoutNomeFantasia > 0) {
      setShowNomeFantasiaModal(true);
      return;
    }

    // Caso contrário, prosseguir com importação
    handleConfirmImport();
  };

  // Executar importação após revisão
  const handleConfirmImport = async () => {
    setShowNomeFantasiaModal(false);
    setImportStep('importing');
    setImporting(true);
    setImportProgress(0);

    const results = { success: 0, errors: [] as { row: number; error: string }[] };
    const createdEmpresas: string[] = []; // Para rollback em caso de erro

    try {
      for (let i = 0; i < validatedData.length; i++) {
        const { rowNumber, data: row, responsavelId, responsavelNome, categoriaId, origemContatoId, siglaGerada } = validatedData[i];
        
        setImportProgress(Math.round(((i + 1) / validatedData.length) * 100));

        const razaoSocial = row['Razão Social']?.toString().trim();
        const nomeFantasia = row['Nome Fantasia']?.toString().trim() || null;

        // Criar empresa
        const empresaData = {
          nome: razaoSocial,
          razao_social: razaoSocial,
          nome_fantasia: nomeFantasia,
          tipo: 'cliente_final' as const,
          cnpj: row['CNPJ']?.toString().trim() || null,
          email: row['E-mail']?.toString().trim() || null,
          telefone: row['Telefone']?.toString().trim() || null,
          cep: row['CEP']?.toString().trim() || null,
          endereco: row['Endereço']?.toString().trim() || null,
          numero: row['Número']?.toString().trim() || null,
          complemento: row['Complemento']?.toString().trim() || null,
          bairro: row['Bairro']?.toString().trim() || null,
          cidade: row['Cidade']?.toString().trim() || null,
          estado: row['Estado (UF)']?.toString().trim() || null,
        };

        const { data: empresaCriada, error: empresaError } = await supabase
          .from('empresas')
          .insert(empresaData)
          .select()
          .single();

        if (empresaError) {
          // Rollback: deletar todas as empresas criadas
          for (const empId of createdEmpresas) {
            await supabase.from('clientes_sst').delete().eq('cliente_empresa_id', empId);
            await supabase.from('empresas').delete().eq('id', empId);
          }
          throw new Error(`Linha ${rowNumber}: Erro ao criar empresa - ${empresaError.message}`);
        }

        createdEmpresas.push(empresaCriada.id);

        // Criar registro em clientes_sst
        const cnpjValue = row['CNPJ']?.toString().trim() || null;
        const tipoInscricao = row['Tipo Inscrição (1=CNPJ, 2=CPF, 3=CAEPF, 4=CNO, 5=CGC, 6=CEI)']?.toString().trim() || '1';
        // Se não tiver número de inscrição eSocial mas tiver CNPJ e tipo for CNPJ (1), usar o CNPJ como número
        const numeroInscricaoEsocial = row['Número Inscrição eSocial']?.toString().trim() || (tipoInscricao === '1' && cnpjValue ? cnpjValue : null);
        
        const clienteData = {
          empresa_sst_id: empresaId,
          cliente_empresa_id: empresaCriada.id,
          nome: razaoSocial,
          sigla: siglaGerada || null,
          cnpj: cnpjValue,
          email: row['E-mail']?.toString().trim() || null,
          telefone: row['Telefone']?.toString().trim() || null,
          tipo_inscricao: tipoInscricao,
          numero_inscricao_esocial: numeroInscricaoEsocial,
          cnae: row['CNAE']?.toString().trim() || null,
          cnae_atividade: row['Atividade CNAE']?.toString().trim() || null,
          grau_risco: row['Grau de Risco (1, 2, 3 ou 4)']?.toString().trim() || null,
          porte_empresa: row['Porte (MEI, ME, EPP, MEDIO, GRANDE)']?.toString().trim() || null,
          responsavel_id: responsavelId,
          responsavel: responsavelNome,
          categoria_id: categoriaId,
          origem_contato_id: origemContatoId,
        };

        const { data: clienteCriado, error: clienteError } = await supabase
          .from('clientes_sst')
          .insert(clienteData)
          .select()
          .single();

        if (clienteError) {
          // Rollback: deletar todas as empresas criadas
          for (const empId of createdEmpresas) {
            await supabase.from('clientes_sst').delete().eq('cliente_empresa_id', empId);
            await supabase.from('empresas').delete().eq('id', empId);
          }
          throw new Error(`Linha ${rowNumber}: Erro ao criar cliente - ${clienteError.message}`);
        }

        // Criar contato principal se informado
        const contatoNome = row['Contato - Nome']?.toString().trim();
        if (contatoNome) {
          await (supabase as any)
            .from('cliente_contatos')
            .insert({
              cliente_id: clienteCriado.id,
              nome: contatoNome,
              cargo: row['Contato - Cargo']?.toString().trim() || null,
              email: row['Contato - E-mail']?.toString().trim() || null,
              telefone: row['Contato - Telefone']?.toString().trim() || null,
              linkedin: row['Contato - LinkedIn']?.toString().trim() || null,
              principal: true,
            });
        }

        // Criar usuário admin se informado (não faz rollback se falhar)
        const adminNome = row['Nome do Administrador']?.toString().trim();
        const adminEmail = row['E-mail do Administrador']?.toString().trim();
        
        if (adminNome && adminEmail) {
          try {
            await supabase.functions.invoke('admin-create-user', {
              body: {
                email: adminEmail,
                nome: adminNome,
                role: 'cliente_final',
                empresa_id: empresaCriada.id,
                send_invite: true,
              },
            });
          } catch (e: any) {
            console.warn(`Aviso: Erro ao criar admin para ${razaoSocial}:`, e?.message || e);
          }
        }

        results.success++;
      }

      setImportResults(results);
      setImportStep('complete');
      onImportSuccess();

      toast({
        title: 'Importação concluída com sucesso!',
        description: `${results.success} cliente(s) importado(s).`,
      });

    } catch (error: any) {
      toast({
        title: 'Erro na importação',
        description: error.message || 'Ocorreu um erro. Nenhum dado foi importado.',
        variant: 'destructive',
      });
      setImportStep('review');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Clientes</DialogTitle>
            <DialogDescription>
              Escolha o formato para exportar a lista de clientes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Formato do arquivo</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'xlsx')}>
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
              Serão exportados {clientes.length} cliente(s).
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={clientes.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Importação */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        if (!importing) {
          setImportDialogOpen(open);
          if (!open) {
            resetImportState();
          }
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {importStep === 'upload' && 'Importar Clientes'}
              {importStep === 'review' && 'Revisar Dados'}
              {importStep === 'importing' && 'Importando...'}
              {importStep === 'complete' && 'Importação Concluída'}
            </DialogTitle>
            <DialogDescription>
              {importStep === 'upload' && 'Importe clientes a partir de um arquivo CSV ou Excel.'}
              {importStep === 'review' && 'Revise os dados antes de confirmar a importação.'}
              {importStep === 'importing' && 'Aguarde enquanto os dados são importados.'}
              {importStep === 'complete' && 'Todos os clientes foram importados com sucesso.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4 py-4">
            {/* Etapa 1: Upload */}
            {importStep === 'upload' && (
              <>
                <div className="space-y-2">
                  <Label>1. Baixe o template</Label>
                  <div className="flex gap-2">
                    <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'xlsx')}>
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
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
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
              </>
            )}

            {/* Etapa de Enriquecimento */}
            {importStep === 'enriching' && (
              <div className="space-y-6 py-8">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Buscando dados das empresas...</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Consultando APIs de CNPJ e CEP para preencher dados faltantes
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{enrichingStatus}</span>
                    <span>{enrichingProgress}%</span>
                  </div>
                  <Progress value={enrichingProgress} className="h-2" />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Aguarde:</strong> Os dados estão sendo buscados automaticamente. 
                    Campos vazios serão preenchidos com informações da Receita Federal e ViaCEP.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Etapa 2: Revisão */}
            {importStep === 'review' && (
              <>
                {/* Cards de filtro clicáveis */}
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => { setFilterType('all'); setCurrentPage(1); }}
                    className={`rounded-lg p-4 text-center transition-all cursor-pointer border-2 ${
                      filterType === 'all' 
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/20' 
                        : 'bg-muted/50 border-transparent hover:bg-muted/70'
                    }`}
                  >
                    <p className={`text-2xl font-bold ${filterType === 'all' ? 'text-primary' : ''}`}>{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total de registros</p>
                  </button>
                  <button
                    onClick={() => { setFilterType('valid'); setCurrentPage(1); }}
                    className={`rounded-lg p-4 text-center transition-all cursor-pointer border-2 ${
                      filterType === 'valid' 
                        ? 'bg-green-500/20 border-green-500 ring-2 ring-green-500/20' 
                        : 'bg-green-500/10 border-transparent hover:bg-green-500/20'
                    }`}
                  >
                    <p className="text-2xl font-bold text-green-500">{stats.valid}</p>
                    <p className="text-sm text-muted-foreground">Válidos</p>
                  </button>
                  <button
                    onClick={() => { setFilterType('errors'); setCurrentPage(1); }}
                    className={`rounded-lg p-4 text-center transition-all cursor-pointer border-2 ${
                      filterType === 'errors' 
                        ? 'bg-destructive/20 border-destructive ring-2 ring-destructive/20' 
                        : stats.withErrors > 0 ? 'bg-destructive/10 border-transparent hover:bg-destructive/20' : 'bg-muted/50 border-transparent'
                    }`}
                    disabled={stats.withErrors === 0}
                  >
                    <p className={`text-2xl font-bold ${stats.withErrors > 0 ? 'text-destructive' : ''}`}>{stats.withErrors}</p>
                    <p className="text-sm text-muted-foreground">Com erros</p>
                  </button>
                </div>

                {/* Alerta de erros */}
                {stats.withErrors > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Corrija os erros antes de importar.</strong> Clique no card "Com erros" para filtrar apenas as linhas com problema.
                      Você pode editar os campos diretamente na tabela abaixo.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Indicador de filtro ativo */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Exibindo {filteredData.length} de {stats.total} registro(s)
                    {filterType === 'valid' && ' (apenas válidos)'}
                    {filterType === 'errors' && ' (apenas com erros)'}
                  </span>
                </div>

                {/* Tabela de dados - todas as colunas */}
                <div className="border rounded-lg overflow-auto max-h-[350px]">
                    <Table style={{ minWidth: '3000px' }}>
                        <TableHeader className="sticky top-0 z-20" style={{ backgroundColor: 'hsl(var(--muted))' }}>
                          <TableRow style={{ backgroundColor: 'hsl(var(--muted))' }}>
                            <TableHead style={{ width: 48, minWidth: 48, left: 0, backgroundColor: 'hsl(var(--muted))' }} className="sticky z-30 border-r p-2"></TableHead>
                            <TableHead style={{ width: 64, minWidth: 64, left: 48, backgroundColor: 'hsl(var(--muted))' }} className="sticky z-30 border-r p-2 text-center">Linha</TableHead>
                            <TableHead style={{ width: 72, minWidth: 72, left: 112, backgroundColor: 'hsl(var(--muted))' }} className="sticky z-30 border-r p-2 text-center">Status</TableHead>
                            <TableHead className="min-w-[200px]">Razão Social</TableHead>
                            <TableHead className="min-w-[180px]">Nome Fantasia</TableHead>
                            <TableHead className="min-w-[80px]">Sigla</TableHead>
                            <TableHead className="min-w-[150px]">CNPJ</TableHead>
                            <TableHead className="min-w-[180px]">E-mail</TableHead>
                            <TableHead className="min-w-[130px]">Telefone</TableHead>
                            <TableHead className="min-w-[80px]">Tipo Insc.</TableHead>
                            <TableHead className="min-w-[150px]">Nº Insc. eSocial</TableHead>
                            <TableHead className="min-w-[100px]">CNAE</TableHead>
                            <TableHead className="min-w-[200px]">Atividade CNAE</TableHead>
                            <TableHead className="min-w-[80px]">Grau Risco</TableHead>
                            <TableHead className="min-w-[80px]">Porte</TableHead>
                            <TableHead className="min-w-[100px]">CEP</TableHead>
                            <TableHead className="min-w-[200px]">Endereço</TableHead>
                            <TableHead className="min-w-[80px]">Número</TableHead>
                            <TableHead className="min-w-[120px]">Complemento</TableHead>
                            <TableHead className="min-w-[120px]">Bairro</TableHead>
                            <TableHead className="min-w-[120px]">Cidade</TableHead>
                            <TableHead className="min-w-[60px]">UF</TableHead>
                            <TableHead className="min-w-[120px]">Categoria</TableHead>
                            <TableHead className="min-w-[150px]">Origem Contato</TableHead>
                            <TableHead className="min-w-[150px]">Responsável</TableHead>
                            <TableHead className="min-w-[150px]">Admin Nome</TableHead>
                            <TableHead className="min-w-[180px]">Admin E-mail</TableHead>
                            <TableHead className="min-w-[150px]">Contato Nome</TableHead>
                            <TableHead className="min-w-[120px]">Contato Cargo</TableHead>
                            <TableHead className="min-w-[180px]">Contato E-mail</TableHead>
                            <TableHead className="min-w-[130px]">Contato Tel</TableHead>
                            <TableHead className="min-w-[180px]">Contato LinkedIn</TableHead>
                            <TableHead className="min-w-[200px]">Erros</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.map((row) => (
                            <TableRow 
                              key={row.rowNumber} 
                              className={row.errors.length > 0 ? 'bg-destructive/10' : ''}
                            >
                              <TableCell style={{ width: 48, minWidth: 48, left: 0, backgroundColor: row.errors.length > 0 ? '#2d1f1f' : 'hsl(var(--background))' }} className="sticky z-10 p-1 border-r">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteRow(row.rowNumber)}
                                  title="Excluir linha"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                              <TableCell style={{ width: 64, minWidth: 64, left: 48, backgroundColor: row.errors.length > 0 ? '#2d1f1f' : 'hsl(var(--background))' }} className="font-mono text-sm sticky z-10 border-r text-center">{row.rowNumber}</TableCell>
                              <TableCell style={{ width: 72, minWidth: 72, left: 112, backgroundColor: row.errors.length > 0 ? '#2d1f1f' : 'hsl(var(--background))' }} className="sticky z-10 border-r text-center">
                                {row.errors.length > 0 ? (
                                  <Badge variant="destructive" className="text-xs">Erro</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">OK</Badge>
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
                                <Input
                                  value={row.data['Sigla'] || row.siglaGerada || ''}
                                  onChange={(e) => handleUpdateRowData(row.rowNumber, 'Sigla', e.target.value)}
                                  className="h-8 text-sm"
                                  maxLength={3}
                                />
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
                                <Input
                                  value={row.data['Tipo Inscrição (1=CNPJ, 2=CPF, 3=CAEPF, 4=CNO, 5=CGC, 6=CEI)'] || ''}
                                  onChange={(e) => handleUpdateRowData(row.rowNumber, 'Tipo Inscrição (1=CNPJ, 2=CPF, 3=CAEPF, 4=CNO, 5=CGC, 6=CEI)', e.target.value)}
                                  className="h-8 text-sm w-16"
                                  placeholder="1-6"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={row.data['Número Inscrição eSocial'] || ''}
                                  onChange={(e) => handleUpdateRowData(row.rowNumber, 'Número Inscrição eSocial', e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={row.data['CNAE'] || ''}
                                  onChange={(e) => handleUpdateRowData(row.rowNumber, 'CNAE', e.target.value)}
                                  className="h-8 text-sm w-24"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={row.data['Atividade CNAE'] || ''}
                                  onChange={(e) => handleUpdateRowData(row.rowNumber, 'Atividade CNAE', e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Select
                                  value={row.data['Grau de Risco (1, 2, 3 ou 4)'] || ''}
                                  onValueChange={(value) => handleUpdateRowData(row.rowNumber, 'Grau de Risco (1, 2, 3 ou 4)', value === '_empty_' ? '' : value)}
                                >
                                  <SelectTrigger className="h-8 text-sm w-16">
                                    <SelectValue placeholder="-">{row.data['Grau de Risco (1, 2, 3 ou 4)'] || ''}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_empty_">&nbsp;</SelectItem>
                                    <SelectItem value="1">1</SelectItem>
                                    <SelectItem value="2">2</SelectItem>
                                    <SelectItem value="3">3</SelectItem>
                                    <SelectItem value="4">4</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="p-1">
                                <Select
                                  value={row.data['Porte (MEI, ME, EPP, MEDIO, GRANDE)'] || ''}
                                  onValueChange={(value) => handleUpdateRowData(row.rowNumber, 'Porte (MEI, ME, EPP, MEDIO, GRANDE)', value === '_empty_' ? '' : value)}
                                >
                                  <SelectTrigger className="h-8 text-sm w-20">
                                    <SelectValue placeholder="-">{row.data['Porte (MEI, ME, EPP, MEDIO, GRANDE)'] || ''}</SelectValue>
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
                                  onChange={(e) => handleUpdateRowData(row.rowNumber, 'Estado (UF)', e.target.value)}
                                  className="h-8 text-sm w-14"
                                  maxLength={2}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Select
                                  value={row.data['Categoria'] || ''}
                                  onValueChange={(value) => handleUpdateRowData(row.rowNumber, 'Categoria', value === '_empty_' ? '' : value)}
                                >
                                  <SelectTrigger className="h-8 text-sm min-w-[120px]">
                                    <SelectValue placeholder="-">{row.data['Categoria'] || ''}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_empty_">&nbsp;</SelectItem>
                                    {categorias.filter(c => c.ativo).map((cat) => (
                                      <SelectItem key={cat.id} value={cat.nome}>{cat.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="p-1">
                                <Select
                                  value={row.data['Origem do Contato'] || ''}
                                  onValueChange={(value) => handleUpdateRowData(row.rowNumber, 'Origem do Contato', value === '_empty_' ? '' : value)}
                                >
                                  <SelectTrigger className="h-8 text-sm min-w-[130px]">
                                    <SelectValue placeholder="-">{row.data['Origem do Contato'] || ''}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_empty_">&nbsp;</SelectItem>
                                    {(origensContato || []).filter(o => o.ativo).map((origem) => (
                                      <SelectItem key={origem.id} value={origem.nome}>{origem.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="p-1">
                                <Select
                                  value={row.data['Responsável (nome do usuário SST)'] || ''}
                                  onValueChange={(value) => handleUpdateRowData(row.rowNumber, 'Responsável (nome do usuário SST)', value === '_empty_' ? '' : value)}
                                >
                                  <SelectTrigger className="h-8 text-sm min-w-[130px]">
                                    <SelectValue placeholder="-">{row.data['Responsável (nome do usuário SST)'] || ''}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_empty_">&nbsp;</SelectItem>
                                    {usuarios.map((usuario) => (
                                      <SelectItem key={usuario.id} value={usuario.nome}>{usuario.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={row.data['Nome do Administrador'] || ''}
                                  onChange={(e) => handleUpdateRowData(row.rowNumber, 'Nome do Administrador', e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={row.data['E-mail do Administrador'] || ''}
                                  onChange={(e) => handleUpdateRowData(row.rowNumber, 'E-mail do Administrador', e.target.value)}
                                  className="h-8 text-sm"
                                  type="email"
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
                        ))}
                      </TableBody>
                    </Table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de {filteredData.length}
                      {filterType === 'errors' && ` (apenas erros)`}
                      {filterType === 'valid' && ` (apenas válidos)`}
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
                      <span className="text-sm">
                        Página {currentPage} de {totalPages}
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
              </>
            )}

            {/* Etapa 3: Importando */}
            {importStep === 'importing' && (
              <div className="space-y-4 py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-center text-muted-foreground">Importando clientes...</p>
                <Progress value={importProgress} />
                <p className="text-center text-sm text-muted-foreground">{importProgress}%</p>
                <p className="text-center text-xs text-muted-foreground">
                  Não feche esta janela. Se ocorrer um erro, todos os dados serão revertidos.
                </p>
              </div>
            )}

            {/* Etapa 4: Concluído */}
            {importStep === 'complete' && importResults && (
              <div className="space-y-4 py-8 text-center">
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
                <div>
                  <p className="text-xl font-semibold text-green-600">
                    {importResults.success} cliente(s) importado(s) com sucesso!
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Todos os dados foram salvos no sistema.
                  </p>
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
                  Cancelar e Enviar Outro
                </Button>
                <Button 
                  onClick={handleClickConfirmImport} 
                  disabled={stats.withErrors > 0}
                  className={stats.withErrors > 0 ? 'opacity-50' : ''}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Confirmar Importação ({stats.valid} registros)
                </Button>
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

      {/* Modal para preencher Nome Fantasia com Razão Social */}
      <Dialog open={showNomeFantasiaModal} onOpenChange={setShowNomeFantasiaModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nome Fantasia não preenchido</DialogTitle>
            <DialogDescription>
              Foram encontrados <strong>{stats.withoutNomeFantasia}</strong> registro(s) sem Nome Fantasia preenchido.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Deseja usar a <strong>Razão Social</strong> como Nome Fantasia para esses registros?
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Isso preencherá automaticamente o campo Nome Fantasia com o valor da Razão Social para os registros que não possuem esse dado.
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowNomeFantasiaModal(false); handleConfirmImport(); }}>
              Não, importar assim mesmo
            </Button>
            <Button onClick={fillNomeFantasiaWithRazaoSocial}>
              Sim, preencher e revisar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
