/**
 * Utilitários globais para geração de PDFs a partir de HTML
 * 
 * Regras implementadas:
 * 1. Compactação automática do PDF para reduzir tamanho
 * 2. Evitar quebras de página no meio de elementos
 * 3. Formatação consistente para documentos A4
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFGenerationOptions {
  /** Nome do arquivo sem extensão */
  fileName: string;
  /** Qualidade da imagem (0.1 a 1.0) - menor = mais compacto */
  imageQuality?: number;
  /** Escala de renderização (1 a 3) - menor = mais compacto */
  scale?: number;
  /** Formato da imagem ('JPEG' para compactação, 'PNG' para qualidade) */
  imageFormat?: 'JPEG' | 'PNG';
  /** Margem em mm */
  margin?: number;
  /** Orientação do documento */
  orientation?: 'portrait' | 'landscape';
}

export interface PDFResult {
  blob: Blob;
  fileName: string;
}

/**
 * CSS global para evitar quebras de página em documentos PDF
 * Adicione estas classes aos elementos HTML que não devem ser quebrados
 */
export const PDF_CSS_RULES = `
  /* Evitar quebra de página dentro de elementos */
  .pdf-no-break, .no-break {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  
  /* Forçar quebra de página antes */
  .pdf-page-break-before, .page-break-before {
    page-break-before: always !important;
    break-before: always !important;
  }
  
  /* Forçar quebra de página depois */
  .pdf-page-break-after, .page-break-after {
    page-break-after: always !important;
    break-after: always !important;
  }
  
  /* Manter elemento junto com o próximo (evita órfãos) */
  .pdf-keep-together {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  
  /* Evitar que títulos fiquem sozinhos no final da página */
  h1, h2, h3, h4, h5, h6, .section-title {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  
  /* Evitar quebra em tabelas */
  table, tr, .table-row {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  
  /* Evitar quebra em cards e boxes */
  .card, .box, .kpi-box, .investment-table {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  
  /* Evitar quebra em listas */
  ul, ol, li {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  
  /* Evitar quebra em parágrafos curtos */
  p {
    orphans: 3;
    widows: 3;
  }
`;

/**
 * Gera um PDF compactado a partir de conteúdo HTML
 * 
 * @param htmlContent - Conteúdo HTML completo do documento
 * @param options - Opções de geração do PDF
 * @returns Promise com o Blob do PDF e nome do arquivo
 */
export async function generateCompactPDF(
  htmlContent: string,
  options: PDFGenerationOptions
): Promise<PDFResult | null> {
  const {
    fileName,
    imageQuality = 0.7, // Qualidade reduzida para compactação
    scale = 1.5, // Escala menor para compactação
    imageFormat = 'JPEG', // JPEG é mais compacto que PNG
    margin = 10,
    orientation = 'portrait'
  } = options;

  try {
    // Criar iframe oculto para renderizar o HTML
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.error('Erro ao criar iframe para PDF');
      document.body.removeChild(iframe);
      return null;
    }

    // Injetar CSS de regras de quebra de página no HTML
    const htmlWithPDFRules = injectPDFCSSRules(htmlContent);

    // Escrever HTML formatado
    iframeDoc.open();
    iframeDoc.write(htmlWithPDFRules);
    iframeDoc.close();

    // Aguardar renderização completa
    await new Promise(resolve => setTimeout(resolve, 300));

    // Capturar como canvas com configurações otimizadas
    const canvas = await html2canvas(iframeDoc.body, {
      scale: scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels at 96 DPI
      windowWidth: 794,
      // Otimizações para performance
      imageTimeout: 15000,
      removeContainer: true
    });

    // Remover iframe
    document.body.removeChild(iframe);

    // Criar PDF A4
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4',
      compress: true // Habilitar compressão interna do jsPDF
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = pdfWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Usar JPEG com qualidade reduzida para compactação
    const imgData = canvas.toDataURL(`image/${imageFormat.toLowerCase()}`, imageQuality);

    // Se o conteúdo cabe em uma página
    if (imgHeight <= pdfHeight - (margin * 2)) {
      pdf.addImage(imgData, imageFormat, margin, margin, imgWidth, imgHeight, undefined, 'FAST');
    } else {
      // Múltiplas páginas com tratamento inteligente
      const pageContentHeight = pdfHeight - (margin * 2);
      const totalPages = Math.ceil(imgHeight / pageContentHeight);
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        const yOffset = -(page * pageContentHeight);
        pdf.addImage(imgData, imageFormat, margin, margin + yOffset, imgWidth, imgHeight, undefined, 'FAST');
      }
    }

    // Gerar nome do arquivo com extensão
    const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

    // Retornar como Blob
    const blob = pdf.output('blob');
    
    return { blob, fileName: finalFileName };
  } catch (error) {
    console.error('Erro ao gerar PDF compactado:', error);
    return null;
  }
}

/**
 * Injeta as regras CSS de quebra de página no HTML
 */
function injectPDFCSSRules(htmlContent: string): string {
  // Verificar se já tem tag <style> no <head>
  if (htmlContent.includes('</head>')) {
    return htmlContent.replace('</head>', `<style>${PDF_CSS_RULES}</style></head>`);
  }
  
  // Se não tem head, adicionar no início do body
  if (htmlContent.includes('<body')) {
    return htmlContent.replace(/<body([^>]*)>/, `<body$1><style>${PDF_CSS_RULES}</style>`);
  }
  
  // Fallback: adicionar no início
  return `<style>${PDF_CSS_RULES}</style>${htmlContent}`;
}

/**
 * Baixa um PDF diretamente no navegador
 */
export function downloadPDF(pdfResult: PDFResult): void {
  const url = URL.createObjectURL(pdfResult.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = pdfResult.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Configurações padrão para diferentes tipos de documentos
 */
export const PDF_PRESETS = {
  /** Proposta comercial - qualidade média, boa compactação */
  proposta: {
    imageQuality: 0.7,
    scale: 1.5,
    imageFormat: 'JPEG' as const,
    margin: 10
  },
  /** Relatório - qualidade alta */
  relatorio: {
    imageQuality: 0.85,
    scale: 2,
    imageFormat: 'JPEG' as const,
    margin: 15
  },
  /** Documento simples - máxima compactação */
  simples: {
    imageQuality: 0.6,
    scale: 1.2,
    imageFormat: 'JPEG' as const,
    margin: 10
  },
  /** Documento com gráficos - qualidade alta */
  graficos: {
    imageQuality: 0.9,
    scale: 2,
    imageFormat: 'PNG' as const,
    margin: 10
  }
};
