/**
 * Facial Recognition Service
 * 
 * Main service for comparing faces between reference and captured images.
 * Uses histogram comparison, color analysis, and structural similarity.
 */

import { ImageProcessor } from './ImageProcessor';
import { FaceDetector } from './FaceDetector';
import type { 
  FacialValidationResult, 
  ProcessingLog, 
  ImageAnalysis,
  ComparisonMetrics 
} from './types';

export class FacialRecognitionService {
  private imageProcessor: ImageProcessor;
  private faceDetector: FaceDetector;
  private logs: ProcessingLog[] = [];
  private readonly SIMILARITY_THRESHOLD = 0.65; // 65% minimum similarity

  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.faceDetector = new FaceDetector();
  }

  private addLog(message: string, type: ProcessingLog['type'] = 'info', data?: any) {
    const time = new Date().toLocaleTimeString('pt-BR');
    this.logs.push({ time, message, type, data });
  }

  getLogs(): ProcessingLog[] {
    return [...this.logs];
  }

  getAllLogs(): ProcessingLog[] {
    return [
      ...this.logs,
      ...this.imageProcessor.getLogs(),
      ...this.faceDetector.getLogs(),
    ].sort((a, b) => a.time.localeCompare(b.time));
  }

  clearLogs() {
    this.logs = [];
    this.imageProcessor.clearLogs();
    this.faceDetector.clearLogs();
  }

  /**
   * Compare two face images and return validation result
   */
  async compareFaces(
    referenceImageSrc: string,
    capturedImageSrc: string,
    onLogUpdate?: (logs: ProcessingLog[]) => void
  ): Promise<FacialValidationResult> {
    const startTime = Date.now();
    this.clearLogs();

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Load reference image
      this.addLog('=== INICIANDO VALIDAÇÃO FACIAL ===', 'info');
      onLogUpdate?.(this.getAllLogs());

      this.addLog('Carregando foto de referência...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      let referenceImg: HTMLImageElement;
      try {
        referenceImg = await this.imageProcessor.loadImage(referenceImageSrc);
      } catch (e) {
        this.addLog('Erro ao carregar foto de referência', 'error');
        errors.push('Não foi possível carregar a foto cadastrada');
        return this.createFailedResult(errors, warnings, startTime);
      }
      onLogUpdate?.(this.getAllLogs());

      // Step 2: Load captured image
      this.addLog('Carregando foto capturada...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      let capturedImg: HTMLImageElement;
      try {
        capturedImg = await this.imageProcessor.loadImage(capturedImageSrc);
      } catch (e) {
        this.addLog('Erro ao carregar foto capturada', 'error');
        errors.push('Não foi possível carregar a foto capturada');
        return this.createFailedResult(errors, warnings, startTime);
      }
      onLogUpdate?.(this.getAllLogs());

      // Step 3: Process reference image
      this.addLog('Processando foto de referência...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      const referenceCanvas = this.imageProcessor.imageToCanvas(referenceImg, 200);
      const referenceAnalysis = this.imageProcessor.analyzeImage(referenceCanvas);
      onLogUpdate?.(this.getAllLogs());

      // Step 4: Detect face in reference
      this.addLog('Detectando rosto na foto de referência...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      const referenceFace = this.faceDetector.detectFace(referenceCanvas);
      onLogUpdate?.(this.getAllLogs());

      if (!referenceFace.detected) {
        warnings.push('Rosto não detectado claramente na foto cadastrada');
      }

      // Step 5: Process captured image
      this.addLog('Processando foto capturada...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      const capturedCanvas = this.imageProcessor.imageToCanvas(capturedImg, 200);
      const capturedAnalysis = this.imageProcessor.analyzeImage(capturedCanvas);
      onLogUpdate?.(this.getAllLogs());

      // Step 6: Check captured image quality
      this.addLog('Verificando qualidade da imagem capturada...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      const qualityCheck = this.imageProcessor.checkImageQuality(capturedAnalysis);
      if (!qualityCheck.ok) {
        qualityCheck.issues.forEach(issue => warnings.push(issue));
      }
      onLogUpdate?.(this.getAllLogs());

      // Step 7: Detect face in captured image
      this.addLog('Detectando rosto na foto capturada...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      const capturedFace = this.faceDetector.detectFace(capturedCanvas);
      onLogUpdate?.(this.getAllLogs());

      if (!capturedFace.detected) {
        this.addLog('Rosto não detectado na foto capturada', 'error');
        errors.push('Rosto não detectado - centralize o rosto na câmera');
        return this.createFailedResult(errors, warnings, startTime, referenceAnalysis, capturedAnalysis, referenceFace, capturedFace);
      }

      // Step 8: Compare faces
      this.addLog('=== COMPARANDO FACES ===', 'info');
      onLogUpdate?.(this.getAllLogs());

      this.addLog('Calculando similaridade de histograma...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      const metrics = this.calculateSimilarityMetrics(referenceAnalysis, capturedAnalysis);
      
      this.addLog(`Histograma: ${(metrics.histogramSimilarity * 100).toFixed(1)}%`, 
        metrics.histogramSimilarity >= 0.5 ? 'success' : 'warning');
      onLogUpdate?.(this.getAllLogs());

      this.addLog('Calculando similaridade de cor...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      this.addLog(`Cores: ${(metrics.colorSimilarity * 100).toFixed(1)}%`,
        metrics.colorSimilarity >= 0.5 ? 'success' : 'warning');
      onLogUpdate?.(this.getAllLogs());

      this.addLog('Calculando similaridade de tom de pele...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      this.addLog(`Tom de pele: ${(metrics.skinToneSimilarity * 100).toFixed(1)}%`,
        metrics.skinToneSimilarity >= 0.5 ? 'success' : 'warning');
      onLogUpdate?.(this.getAllLogs());

      this.addLog('Calculando similaridade estrutural...', 'info');
      onLogUpdate?.(this.getAllLogs());
      
      this.addLog(`Estrutura: ${(metrics.structuralSimilarity * 100).toFixed(1)}%`,
        metrics.structuralSimilarity >= 0.5 ? 'success' : 'warning');
      onLogUpdate?.(this.getAllLogs());

      // Calculate overall similarity with weighted average
      const similarity = metrics.overallScore;
      const matched = similarity >= this.SIMILARITY_THRESHOLD;

      this.addLog('=== RESULTADO ===', 'info');
      this.addLog(`Similaridade geral: ${(similarity * 100).toFixed(1)}%`, 
        matched ? 'success' : 'error');
      this.addLog(`Limiar mínimo: ${(this.SIMILARITY_THRESHOLD * 100).toFixed(0)}%`, 'info');
      this.addLog(matched ? '✓ FACES CORRESPONDEM' : '✗ FACES NÃO CORRESPONDEM', 
        matched ? 'success' : 'error');
      onLogUpdate?.(this.getAllLogs());

      const processingTime = Date.now() - startTime;
      this.addLog(`Tempo de processamento: ${processingTime}ms`, 'info');
      onLogUpdate?.(this.getAllLogs());

      return {
        success: true,
        similarity,
        threshold: this.SIMILARITY_THRESHOLD,
        matched,
        referenceAnalysis,
        capturedAnalysis,
        referenceFace,
        capturedFace,
        processingTime,
        logs: this.getAllLogs(),
        errors,
        warnings,
      };

    } catch (error: any) {
      this.addLog(`Erro inesperado: ${error.message}`, 'error');
      errors.push(`Erro no processamento: ${error.message}`);
      return this.createFailedResult(errors, warnings, startTime);
    }
  }

  /**
   * Calculate similarity metrics between two image analyses
   */
  private calculateSimilarityMetrics(ref: ImageAnalysis, cap: ImageAnalysis): ComparisonMetrics {
    // Histogram similarity using Bhattacharyya coefficient
    const histogramSimilarity = this.bhattacharyyaCoefficient(ref.histogram, cap.histogram);

    // Color histogram similarity
    const redSim = this.bhattacharyyaCoefficient(ref.colorHistogram.red, cap.colorHistogram.red);
    const greenSim = this.bhattacharyyaCoefficient(ref.colorHistogram.green, cap.colorHistogram.green);
    const blueSim = this.bhattacharyyaCoefficient(ref.colorHistogram.blue, cap.colorHistogram.blue);
    const colorSimilarity = (redSim + greenSim + blueSim) / 3;

    // Skin tone similarity
    const skinToneDiff = Math.abs(ref.skinToneRatio - cap.skinToneRatio);
    const skinToneSimilarity = Math.max(0, 1 - skinToneDiff * 5);

    // Structural similarity (based on edge strength and contrast)
    const contrastDiff = Math.abs(ref.contrast - cap.contrast) / Math.max(ref.contrast, cap.contrast, 1);
    const edgeDiff = Math.abs(ref.edgeStrength - cap.edgeStrength) / Math.max(ref.edgeStrength, cap.edgeStrength, 1);
    const structuralSimilarity = 1 - (contrastDiff + edgeDiff) / 2;

    // Weighted overall score
    const overallScore = 
      histogramSimilarity * 0.3 +
      colorSimilarity * 0.25 +
      skinToneSimilarity * 0.25 +
      structuralSimilarity * 0.2;

    return {
      histogramSimilarity,
      colorSimilarity,
      skinToneSimilarity,
      structuralSimilarity,
      overallScore,
    };
  }

  /**
   * Bhattacharyya coefficient for histogram comparison
   */
  private bhattacharyyaCoefficient(hist1: number[], hist2: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(hist1.length, hist2.length); i++) {
      sum += Math.sqrt(hist1[i] * hist2[i]);
    }
    return sum;
  }

  /**
   * Create failed result
   */
  private createFailedResult(
    errors: string[],
    warnings: string[],
    startTime: number,
    referenceAnalysis?: ImageAnalysis,
    capturedAnalysis?: ImageAnalysis,
    referenceFace?: any,
    capturedFace?: any
  ): FacialValidationResult {
    return {
      success: false,
      similarity: 0,
      threshold: this.SIMILARITY_THRESHOLD,
      matched: false,
      referenceAnalysis: referenceAnalysis || null,
      capturedAnalysis: capturedAnalysis || null,
      referenceFace: referenceFace || null,
      capturedFace: capturedFace || null,
      processingTime: Date.now() - startTime,
      logs: this.getAllLogs(),
      errors,
      warnings,
    };
  }
}

// Singleton instance for easy use
export const facialRecognition = new FacialRecognitionService();
