/**
 * Image Processor
 * 
 * Handles image loading, preprocessing, and analysis for facial recognition.
 */

import type { ImageAnalysis, ProcessingLog } from './types';

export class ImageProcessor {
  private logs: ProcessingLog[] = [];

  private addLog(message: string, type: ProcessingLog['type'] = 'info', data?: any) {
    const time = new Date().toLocaleTimeString('pt-BR');
    this.logs.push({ time, message, type, data });
  }

  getLogs(): ProcessingLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  /**
   * Load image from URL or base64 string
   */
  async loadImage(src: string): Promise<HTMLImageElement> {
    this.addLog('Carregando imagem...', 'info');
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        this.addLog(`Imagem carregada: ${img.width}x${img.height}px`, 'success');
        resolve(img);
      };
      
      img.onerror = () => {
        this.addLog('Erro ao carregar imagem', 'error');
        reject(new Error('Falha ao carregar imagem'));
      };
      
      img.src = src;
    });
  }

  /**
   * Convert image to canvas for pixel manipulation
   */
  imageToCanvas(img: HTMLImageElement, maxSize: number = 256): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    // Resize to max size while maintaining aspect ratio
    if (width > height && width > maxSize) {
      height = (height * maxSize) / width;
      width = maxSize;
    } else if (height > maxSize) {
      width = (width * maxSize) / height;
      height = maxSize;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
    }

    this.addLog(`Imagem redimensionada para ${Math.round(width)}x${Math.round(height)}px`, 'info');
    return canvas;
  }

  /**
   * Analyze image and extract features
   */
  analyzeImage(canvas: HTMLCanvasElement): ImageAnalysis {
    this.addLog('Analisando características da imagem...', 'info');
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Não foi possível obter contexto do canvas');
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Calculate brightness
    let totalBrightness = 0;
    const histogram = new Array(256).fill(0);
    const redHistogram = new Array(256).fill(0);
    const greenHistogram = new Array(256).fill(0);
    const blueHistogram = new Array(256).fill(0);
    
    let skinPixels = 0;
    const totalPixels = pixels.length / 4;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      // Grayscale value
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      totalBrightness += gray;
      histogram[gray]++;

      // Color histograms
      redHistogram[r]++;
      greenHistogram[g]++;
      blueHistogram[b]++;

      // Skin tone detection (simplified)
      if (this.isSkinTone(r, g, b)) {
        skinPixels++;
      }
    }

    const brightness = totalBrightness / totalPixels;
    const skinToneRatio = skinPixels / totalPixels;

    // Calculate contrast (standard deviation of brightness)
    let varianceSum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      varianceSum += Math.pow(gray - brightness, 2);
    }
    const contrast = Math.sqrt(varianceSum / totalPixels);

    // Calculate edge strength using Sobel operator
    const edgeStrength = this.calculateEdgeStrength(ctx, canvas.width, canvas.height);

    // Normalize histograms
    const normalizedHistogram = histogram.map(v => v / totalPixels);
    const normalizedRed = redHistogram.map(v => v / totalPixels);
    const normalizedGreen = greenHistogram.map(v => v / totalPixels);
    const normalizedBlue = blueHistogram.map(v => v / totalPixels);

    const analysis: ImageAnalysis = {
      width: canvas.width,
      height: canvas.height,
      brightness: Math.round(brightness * 100) / 100,
      contrast: Math.round(contrast * 100) / 100,
      histogram: normalizedHistogram,
      colorHistogram: {
        red: normalizedRed,
        green: normalizedGreen,
        blue: normalizedBlue,
      },
      skinToneRatio: Math.round(skinToneRatio * 1000) / 1000,
      edgeStrength: Math.round(edgeStrength * 100) / 100,
    };

    this.addLog(`Brilho: ${analysis.brightness.toFixed(1)}, Contraste: ${analysis.contrast.toFixed(1)}`, 'info');
    this.addLog(`Proporção de pele detectada: ${(analysis.skinToneRatio * 100).toFixed(1)}%`, 'info');

    return analysis;
  }

  /**
   * Check if RGB values represent skin tone
   */
  private isSkinTone(r: number, g: number, b: number): boolean {
    // Multiple skin tone detection rules
    const rule1 = r > 95 && g > 40 && b > 20 &&
                  Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                  Math.abs(r - g) > 15 && r > g && r > b;
    
    const rule2 = r > 220 && g > 210 && b > 170 &&
                  Math.abs(r - g) <= 15 && r > b && g > b;

    // YCbCr color space check
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    
    const rule3 = y > 80 && cb > 77 && cb < 127 && cr > 133 && cr < 173;

    return rule1 || rule2 || rule3;
  }

  /**
   * Calculate edge strength using Sobel operator
   */
  private calculateEdgeStrength(ctx: CanvasRenderingContext2D, width: number, height: number): number {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    let totalEdge = 0;
    let count = 0;

    // Sobel kernels
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
            gx += gray * sobelX[ky + 1][kx + 1];
            gy += gray * sobelY[ky + 1][kx + 1];
          }
        }

        totalEdge += Math.sqrt(gx * gx + gy * gy);
        count++;
      }
    }

    return totalEdge / count;
  }

  /**
   * Check image quality for facial recognition
   */
  checkImageQuality(analysis: ImageAnalysis): { ok: boolean; issues: string[] } {
    const issues: string[] = [];

    if (analysis.brightness < 50) {
      issues.push('Imagem muito escura - procure um local mais iluminado');
    } else if (analysis.brightness > 200) {
      issues.push('Imagem muito clara - evite luz direta na câmera');
    }

    if (analysis.contrast < 20) {
      issues.push('Baixo contraste - melhore a iluminação');
    }

    if (analysis.skinToneRatio < 0.05) {
      issues.push('Rosto não detectado claramente - centralize o rosto na câmera');
    } else if (analysis.skinToneRatio > 0.6) {
      issues.push('Rosto muito próximo - afaste-se um pouco da câmera');
    }

    if (analysis.edgeStrength < 10) {
      issues.push('Imagem borrada - mantenha a câmera estável');
    }

    if (issues.length > 0) {
      issues.forEach(issue => this.addLog(issue, 'warning'));
    } else {
      this.addLog('Qualidade da imagem OK', 'success');
    }

    return { ok: issues.length === 0, issues };
  }
}
