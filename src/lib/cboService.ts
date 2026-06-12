import { api } from '@/integrations/api/client';

export interface CBOOcupacao {
  id: number;
  codigo: string;
  codigo_formatado: string;
  descricao: string;
  grande_grupo: number | null;
  desc_grande_grupo: string | null;
}

// Buscar ocupações CBO com filtro de texto
export async function searchCBO(searchTerm: string, limit: number = 50): Promise<CBOOcupacao[]> {
  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  const data = await api.get<CBOOcupacao[]>(
    `/sistema/cbo?q=${encodeURIComponent(searchTerm)}&limit=${limit}`
  ).catch(() => [] as CBOOcupacao[]);

  // reaplica ordenação por descricao (backend ordena por codigo)
  return (data || []).slice().sort((a, b) => a.descricao.localeCompare(b.descricao));
}

// Buscar uma ocupação CBO específica pelo código
export async function getCBOByCodigo(codigo: string): Promise<CBOOcupacao | null> {
  if (!codigo) return null;

  const data = await api.get<CBOOcupacao[]>(
    `/sistema/cbo?q=${encodeURIComponent(codigo)}&limit=50`
  ).catch(() => [] as CBOOcupacao[]);

  // filtra pelo código exato (equivalente ao .eq('codigo', codigo).single())
  return (data || []).find((o) => o.codigo === codigo) ?? null;
}

// Dados CBO mais comuns para pré-carregar (ocupações frequentes em SST)
export const CBO_COMUNS = [
  { codigo: '514320', descricao: 'Faxineiro' },
  { codigo: '411010', descricao: 'Auxiliar de escritório' },
  { codigo: '521110', descricao: 'Vendedor de comércio varejista' },
  { codigo: '782510', descricao: 'Motorista de caminhão' },
  { codigo: '715210', descricao: 'Pedreiro' },
  { codigo: '724110', descricao: 'Eletricista de instalações' },
  { codigo: '862120', descricao: 'Operador de caldeira' },
  { codigo: '992225', descricao: 'Trabalhador de manutenção de edificações' },
  { codigo: '513205', descricao: 'Cozinheiro geral' },
  { codigo: '422105', descricao: 'Recepcionista' },
];
