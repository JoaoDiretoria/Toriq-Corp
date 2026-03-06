import { supabase } from '@/integrations/supabase/client';

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

  const { data, error } = await (supabase as any)
    .from('cbo_ocupacoes')
    .select('id, codigo, codigo_formatado, descricao, grande_grupo, desc_grande_grupo')
    .or(`codigo.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`)
    .order('descricao')
    .limit(limit);

  if (error) {
    console.error('Erro ao buscar CBO:', error);
    return [];
  }

  return data || [];
}

// Buscar uma ocupação CBO específica pelo código
export async function getCBOByCodigo(codigo: string): Promise<CBOOcupacao | null> {
  if (!codigo) return null;

  const { data, error } = await (supabase as any)
    .from('cbo_ocupacoes')
    .select('id, codigo, codigo_formatado, descricao, grande_grupo, desc_grande_grupo')
    .eq('codigo', codigo)
    .single();

  if (error) {
    console.error('Erro ao buscar CBO por código:', error);
    return null;
  }

  return data;
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
