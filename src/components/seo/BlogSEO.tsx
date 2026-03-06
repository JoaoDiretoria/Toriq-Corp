import { Helmet } from 'react-helmet-async';

interface BlogSEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  tags?: string[];
  section?: string;
}

export function BlogSEO({
  title = 'Blog TORIQ - Conteúdos sobre SST e Gestão',
  description = 'Artigos, dicas e novidades sobre Saúde e Segurança do Trabalho, gestão empresarial e tecnologia.',
  image = 'https://toriq.com.br/og-blog.jpg',
  url = 'https://toriq.com.br/blog',
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  tags = [],
  section,
}: BlogSEOProps) {
  const siteName = 'TORIQ';
  const twitterHandle = '@toriq';
  
  const structuredData = type === 'article' ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: image,
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: 'https://toriq.com.br/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    keywords: tags.join(', '),
    articleSection: section,
  } : {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: title,
    description: description,
    url: url,
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: 'https://toriq.com.br/logo.png',
      },
    },
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={tags.length > 0 ? tags.join(', ') : 'SST, Segurança do Trabalho, Saúde Ocupacional, Gestão, TORIQ'} />
      <link rel="canonical" href={url} />
      
      {/* Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="pt_BR" />
      
      {/* Article specific OG tags */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && section && (
        <meta property="article:section" content={section} />
      )}
      {type === 'article' && tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:creator" content={twitterHandle} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Structured Data / JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}

interface BlogListSEOProps {
  page?: number;
  categoria?: string;
  searchQuery?: string;
}

export function BlogListSEO({ page = 1, categoria, searchQuery }: BlogListSEOProps) {
  let title = 'Blog TORIQ - Conteúdos sobre SST e Gestão';
  let description = 'Artigos, dicas e novidades sobre Saúde e Segurança do Trabalho, gestão empresarial e tecnologia.';
  let url = 'https://toriq.com.br/blog';

  if (categoria) {
    title = `${categoria} - Blog TORIQ`;
    description = `Artigos sobre ${categoria} no Blog TORIQ. Conteúdos especializados em SST e gestão empresarial.`;
    url = `https://toriq.com.br/blog?categoria=${encodeURIComponent(categoria)}`;
  }

  if (searchQuery) {
    title = `Busca: ${searchQuery} - Blog TORIQ`;
    description = `Resultados da busca por "${searchQuery}" no Blog TORIQ.`;
    url = `https://toriq.com.br/blog?q=${encodeURIComponent(searchQuery)}`;
  }

  if (page > 1) {
    title = `${title} - Página ${page}`;
    url = `${url}${url.includes('?') ? '&' : '?'}page=${page}`;
  }

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://toriq.com.br',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://toriq.com.br/blog',
      },
      ...(categoria ? [{
        '@type': 'ListItem',
        position: 3,
        name: categoria,
        item: url,
      }] : []),
    ],
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      
      <meta name="robots" content="index, follow" />
      
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content="TORIQ" />
      
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      
      {/* Pagination hints for search engines */}
      {page > 1 && (
        <link rel="prev" href={`https://toriq.com.br/blog?page=${page - 1}`} />
      )}
      <link rel="next" href={`https://toriq.com.br/blog?page=${page + 1}`} />
      
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbData)}
      </script>
    </Helmet>
  );
}
