/**
 * Gera public/sitemap.xml — COMPLETO (páginas estáticas + conteúdo dinâmico).
 *
 * Páginas estáticas: rotas públicas fixas do site.
 * Dinâmico: posts publicados do blog (GET /blog) e pesquisas públicas
 * (GET /pesquisas) — ambos endpoints públicos, sem auth.
 *
 * Roda no build (prebuild) e também sob demanda: `npm run gen:sitemap`.
 *
 * Config por env:
 *   SITE_URL         (default https://toriqcorp.com.br) — host onde o site é servido.
 *   SITEMAP_API_URL  (default https://api.toriqcorp.com.br) — API para o conteúdo dinâmico.
 *
 * Degrada com elegância: se a API estiver inacessível no build, gera o sitemap
 * só com as páginas estáticas (NÃO quebra o build) e avisa no log.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = (process.env.SITE_URL || 'https://toriqcorp.com.br').replace(/\/+$/, '');
const API_URL = (process.env.SITEMAP_API_URL || 'https://api.toriqcorp.com.br').replace(/\/+$/, '');

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'public', 'sitemap.xml');

const HOJE = new Date().toISOString().slice(0, 10);

// Páginas estáticas públicas (rota → prioridade/frequência).
const ESTATICAS = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/sobre-nos', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog', changefreq: 'daily', priority: '0.8' },
  { path: '/pesquisas', changefreq: 'weekly', priority: '0.7' },
  { path: '/newsletter', changefreq: 'monthly', priority: '0.5' },
  { path: '/trabalhe-conosco', changefreq: 'weekly', priority: '0.6' },
];

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]),
  );
}

function url({ path, lastmod, changefreq, priority }) {
  const partes = [`    <loc>${escapeXml(SITE_URL + path)}</loc>`];
  if (lastmod) partes.push(`    <lastmod>${lastmod.slice(0, 10)}</lastmod>`);
  if (changefreq) partes.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) partes.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${partes.join('\n')}\n  </url>`;
}

async function fetchJson(caminho) {
  try {
    const r = await fetch(`${API_URL}${caminho}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[sitemap] Aviso: falha ao buscar ${caminho} (${err.message}). Seguindo sem.`);
    return null; // null = erro (distinto de [] = sem itens)
  }
}

async function main() {
  const urls = ESTATICAS.map((e) => url({ ...e, lastmod: HOJE }));

  const posts = await fetchJson('/blog');
  if (posts) {
    for (const p of posts) {
      if (!p?.slug) continue;
      urls.push(url({ path: `/blog/${p.slug}`, lastmod: p.updated_at || p.created_at, changefreq: 'weekly', priority: '0.6' }));
    }
    console.log(`[sitemap] ${posts.length} post(s) do blog incluídos.`);
  }

  const pesquisas = await fetchJson('/pesquisas');
  if (pesquisas) {
    for (const q of pesquisas) {
      if (!q?.slug) continue;
      urls.push(url({ path: `/pesquisas/${q.slug}`, lastmod: q.updated_at || q.created_at, changefreq: 'weekly', priority: '0.5' }));
    }
    console.log(`[sitemap] ${pesquisas.length} pesquisa(s) incluídas.`);
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') +
    '\n</urlset>\n';

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, xml, 'utf8');
  console.log(`[sitemap] ${urls.length} URLs escritas em ${OUT} (site: ${SITE_URL}).`);
}

main().catch((err) => {
  // Nunca derruba o build por causa do sitemap.
  console.error('[sitemap] Erro inesperado, mas seguindo:', err);
  process.exit(0);
});
