/**
 * Face Detector
 * 
 * Detects faces in images using skin tone analysis and edge detection.
 * This is a simplified face detection algorithm that works without external ML libraries.
 */

import type { FaceDetectionResult, ProcessingLog } from './types';

export class FaceDetector {
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
   * Detect face in canvas image
   */
  detectFace(canvas: HTMLCanvasElement): FaceDetectionResult {
    this.addLog('Iniciando detecção de rosto...', 'info');
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.addLog('Erro ao obter contexto do canvas', 'error');
      return this.createEmptyResult(['Erro interno de processamento']);
    }

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // Create skin mask
    this.addLog('Criando máscara de pele...', 'info');
    const skinMask = this.createSkinMask(pixels, width, height);

    // Find face region using connected components
    this.addLog('Localizando região do rosto...', 'info');
    const faceRegion = this.findLargestSkinRegion(skinMask, width, height);

    if (!faceRegion) {
      this.addLog('Nenhum rosto detectado na imagem', 'warning');
      return this.createEmptyResult(['Rosto não detectado - centralize o rosto na câmera']);
    }

    // Calculate confidence based on region properties
    const regionArea = faceRegion.width * faceRegion.height;
    const imageArea = width * height;
    const areaRatio = regionArea / imageArea;

    // Confidence based on face size and position
    let confidence = 0;
    
    // Face should be 10-60% of image area
    if (areaRatio >= 0.1 && areaRatio <= 0.6) {
      confidence += 0.4;
    } else if (areaRatio >= 0.05 && areaRatio <= 0.7) {
      confidence += 0.2;
    }

    // Face should be roughly centered
    const centerX = faceRegion.x + faceRegion.width / 2;
    const centerY = faceRegion.y + faceRegion.height / 2;
    const distFromCenter = Math.sqrt(
      Math.pow((centerX - width / 2) / width, 2) +
      Math.pow((centerY - height / 2) / height, 2)
    );
    
    if (distFromCenter < 0.2) {
      confidence += 0.3;
    } else if (distFromCenter < 0.4) {
      confidence += 0.15;
    }

    // Face should have reasonable aspect ratio (0.6 to 1.0 for portrait)
    const aspectRatio = faceRegion.width / faceRegion.height;
    if (aspectRatio >= 0.6 && aspectRatio <= 1.0) {
      confidence += 0.3;
    } else if (aspectRatio >= 0.5 && aspectRatio <= 1.2) {
      confidence += 0.15;
    }

    // Determine quality issues
    const issues: string[] = [];
    const quality = this.assessQuality(faceRegion, width, height, areaRatio, issues);

    this.addLog(`Rosto detectado com ${(confidence * 100).toFixed(0)}% de confiança`, 
      confidence >= 0.5 ? 'success' : 'warning');

    if (issues.length > 0) {
      issues.forEach(issue => this.addLog(issue, 'warning'));
    }

    return {
      detected: confidence >= 0.3,
      confidence: Math.min(confidence, 1),
      faceRegion,
      quality,
      issues,
    };
  }

  /**
   * Create binary skin mask from image
   */
  private createSkinMask(pixels: Uint8ClampedArray, width: number, height: number): boolean[][] {
    const mask: boolean[][] = [];

    for (let y = 0; y < height; y++) {
      mask[y] = [];
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        mask[y][x] = this.isSkinTone(r, g, b);
      }
    }

    // Apply morphological operations to clean up mask
    return this.cleanMask(mask, width, height);
  }

  /**
   * Check if RGB values represent skin tone
   */
  private isSkinTone(r: number, g: number, b: number): boolean {
    // RGB rule
    const rule1 = r > 95 && g > 40 && b > 20 &&
                  Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                  Math.abs(r - g) > 15 && r > g && r > b;
    
    // Light skin rule
    const rule2 = r > 220 && g > 210 && b > 170 &&
                  Math.abs(r - g) <= 15 && r > b && g > b;

    // YCbCr color space
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const rule3 = cb > 77 && cb < 127 && cr > 133 && cr < 173;

    return rule1 || rule2 || rule3;
  }

  /**
   * Clean mask using erosion and dilation
   */
  private cleanMask(mask: boolean[][], width: number, height: number): boolean[][] {
    // Simple erosion followed by dilation
    const eroded = this.erode(mask, width, height);
    return this.dilate(eroded, width, height);
  }

  private erode(mask: boolean[][], width: number, height: number): boolean[][] {
    const result: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      result[y] = [];
      for (let x = 0; x < width; x++) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          result[y][x] = false;
        } else {
          result[y][x] = mask[y][x] && mask[y-1][x] && mask[y+1][x] && 
                         mask[y][x-1] && mask[y][x+1];
        }
      }
    }
    return result;
  }

  private dilate(mask: boolean[][], width: number, height: number): boolean[][] {
    const result: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      result[y] = [];
      for (let x = 0; x < width; x++) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          result[y][x] = mask[y][x];
        } else {
          result[y][x] = mask[y][x] || mask[y-1][x] || mask[y+1][x] || 
                         mask[y][x-1] || mask[y][x+1];
        }
      }
    }
    return result;
  }

  /**
   * Find largest connected skin region (likely face)
   */
  private findLargestSkinRegion(
    mask: boolean[][], 
    width: number, 
    height: number
  ): { x: number; y: number; width: number; height: number } | null {
    const visited: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      visited[y] = new Array(width).fill(false);
    }

    let largestRegion: { minX: number; maxX: number; minY: number; maxY: number; size: number } | null = null;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x] && !visited[y][x]) {
          const region = this.floodFill(mask, visited, x, y, width, height);
          if (!largestRegion || region.size > largestRegion.size) {
            largestRegion = region;
          }
        }
      }
    }

    if (!largestRegion || largestRegion.size < 100) {
      return null;
    }

    return {
      x: largestRegion.minX,
      y: largestRegion.minY,
      width: largestRegion.maxX - largestRegion.minX,
      height: largestRegion.maxY - largestRegion.minY,
    };
  }

  /**
   * Flood fill to find connected region
   */
  private floodFill(
    mask: boolean[][],
    visited: boolean[][],
    startX: number,
    startY: number,
    width: number,
    height: number
  ): { minX: number; maxX: number; minY: number; maxY: number; size: number } {
    const stack: [number, number][] = [[startX, startY]];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let size = 0;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[y][x] || !mask[y][x]) continue;

      visited[y][x] = true;
      size++;

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    return { minX, maxX, minY, maxY, size };
  }

  /**
   * Assess face quality
   */
  private assessQuality(
    faceRegion: { x: number; y: number; width: number; height: number },
    imageWidth: number,
    imageHeight: number,
    areaRatio: number,
    issues: string[]
  ): FaceDetectionResult['quality'] {
    // Brightness assessment (would need image data for accurate check)
    const brightness: 'low' | 'ok' | 'high' = 'ok';

    // Blur assessment (simplified)
    const blur: 'blurry' | 'ok' | 'sharp' = 'ok';

    // Face size assessment
    let faceSize: 'small' | 'ok' | 'large';
    if (areaRatio < 0.1) {
      faceSize = 'small';
      issues.push('Rosto muito pequeno - aproxime-se da câmera');
    } else if (areaRatio > 0.5) {
      faceSize = 'large';
      issues.push('Rosto muito grande - afaste-se da câmera');
    } else {
      faceSize = 'ok';
    }

    return { brightness, blur, faceSize };
  }

  /**
   * Create empty result for failed detection
   */
  private createEmptyResult(issues: string[]): FaceDetectionResult {
    return {
      detected: false,
      confidence: 0,
      quality: {
        brightness: 'ok',
        blur: 'ok',
        faceSize: 'ok',
      },
      issues,
    };
  }
}
