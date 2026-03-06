/**
 * Configuração de Versão do App
 * 
 * ============================================================================
 * SISTEMA AUTOMÁTICO DE RELEASES (RECOMENDADO)
 * ============================================================================
 * 
 * O sistema agora busca automaticamente as releases do GitHub!
 * 
 * COMO CRIAR UMA NOVA RELEASE:
 * 
 * 1. Vá em: https://github.com/JoaoDiretoria/vertical-on-sistema-de-sst/releases/new
 * 2. Crie uma nova tag (ex: v1.3.0)
 * 3. Preencha o título da release
 * 4. No corpo da release, use o formato:
 * 
 *    ## Descrição
 *    Texto descritivo da atualização
 *    
 *    ## Changelog
 *    - [feature] Nova funcionalidade X
 *    - [fix] Correção do bug Y
 *    - [improvement] Melhoria na tela Z
 *    - [breaking] Mudança importante
 * 
 *    OU use emojis:
 *    - 🚀 Nova funcionalidade X
 *    - 🐛 Correção do bug Y
 *    - ⚡ Melhoria na tela Z
 *    - ⚠️ Mudança importante
 * 
 * 5. Publique a release
 * 6. O popup aparecerá automaticamente para todos os usuários!
 * 
 * VARIÁVEIS DE AMBIENTE (opcionais):
 * - VITE_GITHUB_OWNER: Dono do repositório (padrão: JoaoDiretoria)
 * - VITE_GITHUB_REPO: Nome do repositório (padrão: vertical-on-sistema-de-sst)
 * - VITE_GITHUB_TOKEN: Token para aumentar rate limit (opcional)
 * 
 * ============================================================================
 */

export interface ChangelogItem {
  type: 'feature' | 'fix' | 'improvement' | 'breaking';
  description: string;
}

export interface AppVersionConfig {
  version: string;
  title: string;
  description: string;
  changelog: ChangelogItem[];
  releaseDate: string;
}

// Esta configuração é usada apenas como fallback se não houver releases no GitHub
export const APP_VERSION: AppVersionConfig = {
  version: '1.3.0',
  title: 'Sistema de Releases Automático',
  description: 'Agora as atualizações são sincronizadas automaticamente do GitHub.',
  releaseDate: new Date().toISOString(),
  changelog: [
    { type: 'feature', description: 'Releases do GitHub são sincronizadas automaticamente' },
    { type: 'improvement', description: 'Não é mais necessário editar código para criar notificações' },
  ],
};
