/**
 * Serviço para buscar releases do GitHub automaticamente
 * 
 * Este serviço busca as releases do repositório GitHub e converte
 * para o formato de changelog do sistema.
 */

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
}

export interface ChangelogItem {
  type: 'feature' | 'fix' | 'improvement' | 'breaking';
  description: string;
}

export interface ParsedRelease {
  id: string;
  version: string;
  title: string;
  description: string;
  changelog: ChangelogItem[];
  releaseDate: string;
  url: string;
}

// Configuração do repositório - pode ser sobrescrita por variáveis de ambiente
const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER || 'JoaoDiretoria';
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || 'vertical-on-sistema-de-sst';

/**
 * Parseia o corpo da release do GitHub para extrair changelog estruturado
 * 
 * Formato esperado no corpo da release:
 * 
 * ## Descrição
 * Texto descritivo da atualização
 * 
 * ## Changelog
 * - [feature] Nova funcionalidade X
 * - [fix] Correção do bug Y
 * - [improvement] Melhoria na tela Z
 * - [breaking] Mudança importante
 * 
 * Ou formato simplificado:
 * - 🚀 Nova funcionalidade X
 * - 🐛 Correção do bug Y
 * - ⚡ Melhoria na tela Z
 * - ⚠️ Mudança importante
 */
function parseReleaseBody(body: string): { description: string; changelog: ChangelogItem[] } {
  if (!body) {
    return { description: '', changelog: [] };
  }

  const lines = body.split('\n').map(l => l.trim()).filter(l => l);
  const changelog: ChangelogItem[] = [];
  let description = '';
  let inChangelog = false;
  let inDescription = false;

  for (const line of lines) {
    // Detectar seções
    if (line.toLowerCase().includes('## descrição') || line.toLowerCase().includes('## description')) {
      inDescription = true;
      inChangelog = false;
      continue;
    }
    if (line.toLowerCase().includes('## changelog') || line.toLowerCase().includes('## mudanças') || line.toLowerCase().includes('## changes')) {
      inChangelog = true;
      inDescription = false;
      continue;
    }
    if (line.startsWith('## ')) {
      inDescription = false;
      inChangelog = false;
      continue;
    }

    // Processar linhas de changelog
    if (line.startsWith('-') || line.startsWith('*')) {
      const content = line.replace(/^[-*]\s*/, '').trim();
      
      // Detectar tipo pelo prefixo [type] ou emoji
      let type: ChangelogItem['type'] = 'improvement';
      let desc = content;

      // Formato [type]
      const typeMatch = content.match(/^\[(feature|fix|improvement|breaking|nova|correção|melhoria|importante)\]\s*/i);
      if (typeMatch) {
        const typeStr = typeMatch[1].toLowerCase();
        if (typeStr === 'feature' || typeStr === 'nova') type = 'feature';
        else if (typeStr === 'fix' || typeStr === 'correção') type = 'fix';
        else if (typeStr === 'improvement' || typeStr === 'melhoria') type = 'improvement';
        else if (typeStr === 'breaking' || typeStr === 'importante') type = 'breaking';
        desc = content.replace(typeMatch[0], '').trim();
      }
      // Formato emoji
      else if (content.startsWith('🚀') || content.startsWith('✨')) {
        type = 'feature';
        desc = content.replace(/^[🚀✨]\s*/, '').trim();
      }
      else if (content.startsWith('🐛') || content.startsWith('🔧')) {
        type = 'fix';
        desc = content.replace(/^[🐛🔧]\s*/, '').trim();
      }
      else if (content.startsWith('⚡') || content.startsWith('💡')) {
        type = 'improvement';
        desc = content.replace(/^[⚡💡]\s*/, '').trim();
      }
      else if (content.startsWith('⚠️') || content.startsWith('🔴')) {
        type = 'breaking';
        desc = content.replace(/^[⚠️🔴]\s*/, '').trim();
      }

      if (desc) {
        changelog.push({ type, description: desc });
      }
      inChangelog = true;
    }
    // Acumular descrição
    else if (inDescription || (!inChangelog && !line.startsWith('#'))) {
      if (description) description += ' ';
      description += line;
      inDescription = true;
    }
  }

  // Se não encontrou changelog estruturado, tentar extrair do corpo inteiro
  if (changelog.length === 0 && body) {
    // Pegar primeira linha não vazia como descrição se não tiver
    if (!description) {
      description = lines.find(l => !l.startsWith('#') && !l.startsWith('-')) || '';
    }
  }

  return { description: description.trim(), changelog };
}

/**
 * Busca as releases do GitHub
 * 
 * NOTA: Para repositórios privados, é necessário configurar VITE_GITHUB_TOKEN
 * com um Personal Access Token que tenha permissão de leitura no repositório.
 */
export async function fetchGitHubReleases(limit: number = 10): Promise<ParsedRelease[]> {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  
  // Se não tem token e o repo pode ser privado, não tenta buscar
  if (!token) {
    console.log('[GitHub Releases] Token não configurado. Para repositórios privados, configure VITE_GITHUB_TOKEN.');
    return [];
  }
  
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[GitHub Releases] Repositório não encontrado ou sem permissão. Verifique o token e as configurações.');
      } else if (response.status === 401) {
        console.log('[GitHub Releases] Token inválido ou expirado.');
      } else {
        console.error('[GitHub Releases] Erro:', response.status, response.statusText);
      }
      return [];
    }

    const releases: GitHubRelease[] = await response.json();
    
    // Filtrar releases publicadas (não draft, não prerelease)
    const publishedReleases = releases.filter(r => !r.draft && !r.prerelease);

    console.log(`[GitHub Releases] Encontradas ${publishedReleases.length} releases`);

    return publishedReleases.map(release => {
      const { description, changelog } = parseReleaseBody(release.body);
      
      return {
        id: `github-${release.id}`,
        version: release.tag_name.replace(/^v/, ''),
        title: release.name || `Versão ${release.tag_name}`,
        description,
        changelog,
        releaseDate: release.published_at,
        url: release.html_url
      };
    });
  } catch (error) {
    console.error('[GitHub Releases] Erro ao buscar:', error);
    return [];
  }
}

/**
 * Busca a release mais recente
 */
export async function fetchLatestRelease(): Promise<ParsedRelease | null> {
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(import.meta.env.VITE_GITHUB_TOKEN && {
          'Authorization': `token ${import.meta.env.VITE_GITHUB_TOKEN}`
        })
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Nenhuma release encontrada no repositório');
        return null;
      }
      console.error('Erro ao buscar latest release:', response.status);
      return null;
    }

    const release: GitHubRelease = await response.json();
    const { description, changelog } = parseReleaseBody(release.body);

    return {
      id: `github-${release.id}`,
      version: release.tag_name.replace(/^v/, ''),
      title: release.name || `Versão ${release.tag_name}`,
      description,
      changelog,
      releaseDate: release.published_at,
      url: release.html_url
    };
  } catch (error) {
    console.error('Erro ao buscar latest release:', error);
    return null;
  }
}

/**
 * Compara versões semver
 * Retorna: 1 se v1 > v2, -1 se v1 < v2, 0 se iguais
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number);
  const parts2 = v2.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
