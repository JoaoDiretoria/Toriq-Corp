/**
 * Utilitário para converter a primeira página de PDF/DOCX para JPG
 * Funcionalidade experimental - recomendado enviar fotos diretamente
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker do PDF.js usando caminho do node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

/**
 * Verifica se o arquivo é um tipo que precisa de conversão
 */
export const isDocumentFile = (file: File): boolean => {
  const documentTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ];
  return documentTypes.includes(file.type);
};

/**
 * Verifica se o arquivo é um PDF
 */
export const isPdfFile = (file: File): boolean => {
  return file.type === 'application/pdf';
};

/**
 * Verifica se o arquivo é um DOCX
 */
export const isDocxFile = (file: File): boolean => {
  return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         file.type === 'application/msword';
};

/**
 * Converte a primeira página de um PDF para JPG
 */
export const convertPdfToJpg = async (file: File, quality: number = 0.85): Promise<File> => {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Pegar apenas a primeira página
      const page = await pdf.getPage(1);
      
      // Definir escala para boa qualidade (2x para melhor resolução)
      const scale = 2;
      const viewport = page.getViewport({ scale });
      
      // Criar canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Não foi possível criar contexto do canvas');
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Renderizar página no canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      // Converter canvas para blob JPG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Erro ao converter PDF para imagem'));
            return;
          }
          
          // Criar novo arquivo com extensão .jpg
          const newFileName = file.name.replace(/\.[^/.]+$/, '') + '_pagina1.jpg';
          const jpgFile = new File([blob], newFileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          resolve(jpgFile);
        },
        'image/jpeg',
        quality
      );
    } catch (error) {
      console.error('Erro ao converter PDF:', error);
      reject(new Error('Erro ao processar PDF. Verifique se o arquivo não está corrompido.'));
    }
  });
};

/**
 * Converte DOCX para JPG renderizando como HTML e capturando como imagem
 * Nota: Esta é uma implementação simplificada que captura apenas o texto básico
 */
export const convertDocxToJpg = async (file: File, quality: number = 0.85): Promise<File> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Importar mammoth dinamicamente para não aumentar bundle inicial
      const mammoth = await import('mammoth');
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;
      
      // Criar um elemento temporário para renderizar o HTML
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        padding: 40px;
        background: white;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
      `;
      container.innerHTML = html;
      document.body.appendChild(container);
      
      // Usar html2canvas para capturar
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        height: Math.min(container.scrollHeight, 1200), // Limitar altura (primeira "página")
      });
      
      // Remover container temporário
      document.body.removeChild(container);
      
      // Converter canvas para blob JPG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Erro ao converter DOCX para imagem'));
            return;
          }
          
          // Criar novo arquivo com extensão .jpg
          const newFileName = file.name.replace(/\.[^/.]+$/, '') + '_pagina1.jpg';
          const jpgFile = new File([blob], newFileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          resolve(jpgFile);
        },
        'image/jpeg',
        quality
      );
    } catch (error) {
      console.error('Erro ao converter DOCX:', error);
      reject(new Error('Erro ao processar DOCX. Verifique se o arquivo não está corrompido.'));
    }
  });
};

/**
 * Converte documento (PDF ou DOCX) para JPG
 * Retorna a primeira página como imagem
 */
export const convertDocumentToJpg = async (file: File): Promise<File> => {
  if (isPdfFile(file)) {
    return convertPdfToJpg(file);
  } else if (isDocxFile(file)) {
    return convertDocxToJpg(file);
  } else {
    throw new Error('Tipo de arquivo não suportado para conversão');
  }
};

/**
 * Verifica se o arquivo é uma imagem válida
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Obtém a extensão do arquivo
 */
export const getFileExtension = (file: File): string => {
  return file.name.split('.').pop()?.toLowerCase() || '';
};
