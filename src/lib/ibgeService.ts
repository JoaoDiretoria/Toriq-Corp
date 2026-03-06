// Serviço para buscar estados e cidades do Brasil via API do IBGE

export interface Estado {
  id: number;
  sigla: string;
  nome: string;
}

export interface Cidade {
  id: number;
  nome: string;
}

// Cache para estados e cidades
const estadosCache: Estado[] = [];
const cidadesCache = new Map<string, Cidade[]>();

// Buscar todos os estados do Brasil
export async function getEstados(): Promise<Estado[]> {
  if (estadosCache.length > 0) {
    return estadosCache;
  }

  try {
    const response = await fetch(
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'
    );
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    const estados: Estado[] = data.map((estado: any) => ({
      id: estado.id,
      sigla: estado.sigla,
      nome: estado.nome,
    }));
    
    // Ordenar alfabeticamente por nome
    estados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    
    // Salvar no cache
    estadosCache.push(...estados);
    
    return estados;
  } catch (error) {
    console.error('Erro ao buscar estados:', error);
    // Retornar lista estática como fallback
    return getEstadosFallback();
  }
}

// Buscar cidades de um estado específico
export async function getCidadesPorEstado(uf: string): Promise<Cidade[]> {
  if (cidadesCache.has(uf)) {
    return cidadesCache.get(uf)!;
  }

  try {
    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
    );
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    const cidades: Cidade[] = data.map((cidade: any) => ({
      id: cidade.id,
      nome: cidade.nome,
    }));
    
    // Ordenar alfabeticamente por nome
    cidades.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    
    // Salvar no cache
    cidadesCache.set(uf, cidades);
    
    return cidades;
  } catch (error) {
    console.error(`Erro ao buscar cidades de ${uf}:`, error);
    return [];
  }
}

// Lista de estados como fallback caso a API falhe
function getEstadosFallback(): Estado[] {
  return [
    { id: 12, sigla: 'AC', nome: 'Acre' },
    { id: 27, sigla: 'AL', nome: 'Alagoas' },
    { id: 16, sigla: 'AP', nome: 'Amapá' },
    { id: 13, sigla: 'AM', nome: 'Amazonas' },
    { id: 29, sigla: 'BA', nome: 'Bahia' },
    { id: 23, sigla: 'CE', nome: 'Ceará' },
    { id: 53, sigla: 'DF', nome: 'Distrito Federal' },
    { id: 32, sigla: 'ES', nome: 'Espírito Santo' },
    { id: 52, sigla: 'GO', nome: 'Goiás' },
    { id: 21, sigla: 'MA', nome: 'Maranhão' },
    { id: 51, sigla: 'MT', nome: 'Mato Grosso' },
    { id: 50, sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { id: 31, sigla: 'MG', nome: 'Minas Gerais' },
    { id: 15, sigla: 'PA', nome: 'Pará' },
    { id: 25, sigla: 'PB', nome: 'Paraíba' },
    { id: 41, sigla: 'PR', nome: 'Paraná' },
    { id: 26, sigla: 'PE', nome: 'Pernambuco' },
    { id: 22, sigla: 'PI', nome: 'Piauí' },
    { id: 33, sigla: 'RJ', nome: 'Rio de Janeiro' },
    { id: 24, sigla: 'RN', nome: 'Rio Grande do Norte' },
    { id: 43, sigla: 'RS', nome: 'Rio Grande do Sul' },
    { id: 11, sigla: 'RO', nome: 'Rondônia' },
    { id: 14, sigla: 'RR', nome: 'Roraima' },
    { id: 42, sigla: 'SC', nome: 'Santa Catarina' },
    { id: 35, sigla: 'SP', nome: 'São Paulo' },
    { id: 28, sigla: 'SE', nome: 'Sergipe' },
    { id: 17, sigla: 'TO', nome: 'Tocantins' },
  ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
