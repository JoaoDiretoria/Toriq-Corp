/**
 * Face Recognition Service using face-api.js
 * 
 * Uses neural networks for accurate face detection and comparison.
 * Much more accurate than histogram-based comparison.
 */

import * as faceapi from 'face-api.js';

export interface FaceApiResult {
  success: boolean;
  matched: boolean;
  similarity: number;
  distance: number;
  threshold: number;
  referenceDetected: boolean;
  capturedDetected: boolean;
  processingTime: number;
  error?: string;
  logs: { time: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[];
}

class FaceApiService {
  private modelsLoaded = false;
  private modelsLoading = false;
  private logs: { time: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[] = [];
  
  // Distance threshold for face matching (lower = more strict)
  // 0.6 is the recommended threshold for face-api.js
  private readonly DISTANCE_THRESHOLD = 0.6;

  private addLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const time = new Date().toLocaleTimeString('pt-BR');
    this.logs.push({ time, message, type });
  }

  private clearLogs() {
    this.logs = [];
  }

  getLogs() {
    return [...this.logs];
  }

  /**
   * Load face-api.js models
   */
  async loadModels(): Promise<boolean> {
    if (this.modelsLoaded) return true;
    if (this.modelsLoading) {
      // Wait for models to finish loading
      while (this.modelsLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.modelsLoaded;
    }

    this.modelsLoading = true;
    
    try {
      const MODEL_URL = '/models';
      
      this.addLog('Carregando modelos de IA...', 'info');
      
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      
      this.modelsLoaded = true;
      this.addLog('Modelos carregados com sucesso!', 'success');
      return true;
    } catch (error: any) {
      this.addLog(`Erro ao carregar modelos: ${error.message}`, 'error');
      console.error('Error loading face-api models:', error);
      return false;
    } finally {
      this.modelsLoading = false;
    }
  }

  /**
   * Load image from URL or base64
   */
  private async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }

  /**
   * Detect face and get descriptor (128-dimensional embedding)
   */
  private async detectFace(image: HTMLImageElement): Promise<Float32Array | null> {
    const detection = await faceapi
      .detectSingleFace(image)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return detection?.descriptor || null;
  }

  /**
   * Compare two faces and return similarity result
   */
  async compareFaces(
    referenceImageSrc: string,
    capturedImageSrc: string,
    onLogUpdate?: (logs: typeof this.logs) => void
  ): Promise<FaceApiResult> {
    const startTime = Date.now();
    this.clearLogs();

    try {
      // Step 1: Load models
      this.addLog('=== INICIANDO VALIDAÇÃO FACIAL (IA) ===', 'info');
      onLogUpdate?.(this.getLogs());

      const modelsReady = await this.loadModels();
      if (!modelsReady) {
        return this.createErrorResult('Falha ao carregar modelos de IA', startTime);
      }
      onLogUpdate?.(this.getLogs());

      // Step 2: Load reference image
      this.addLog('Carregando foto de referência...', 'info');
      onLogUpdate?.(this.getLogs());
      
      let referenceImg: HTMLImageElement;
      try {
        referenceImg = await this.loadImage(referenceImageSrc);
        this.addLog('Foto de referência carregada', 'success');
      } catch (e) {
        this.addLog('Erro ao carregar foto de referência', 'error');
        return this.createErrorResult('Não foi possível carregar a foto cadastrada', startTime);
      }
      onLogUpdate?.(this.getLogs());

      // Step 3: Load captured image
      this.addLog('Carregando foto capturada...', 'info');
      onLogUpdate?.(this.getLogs());
      
      let capturedImg: HTMLImageElement;
      try {
        capturedImg = await this.loadImage(capturedImageSrc);
        this.addLog('Foto capturada carregada', 'success');
      } catch (e) {
        this.addLog('Erro ao carregar foto capturada', 'error');
        return this.createErrorResult('Não foi possível carregar a foto capturada', startTime);
      }
      onLogUpdate?.(this.getLogs());

      // Step 4: Detect face in reference image
      this.addLog('Detectando rosto na foto de referência...', 'info');
      onLogUpdate?.(this.getLogs());
      
      const referenceDescriptor = await this.detectFace(referenceImg);
      if (!referenceDescriptor) {
        this.addLog('Rosto não detectado na foto de referência', 'error');
        return {
          success: false,
          matched: false,
          similarity: 0,
          distance: 1,
          threshold: this.DISTANCE_THRESHOLD,
          referenceDetected: false,
          capturedDetected: false,
          processingTime: Date.now() - startTime,
          error: 'Rosto não detectado na foto cadastrada',
          logs: this.getLogs(),
        };
      }
      this.addLog('Rosto detectado na foto de referência ✓', 'success');
      onLogUpdate?.(this.getLogs());

      // Step 5: Detect face in captured image
      this.addLog('Detectando rosto na foto capturada...', 'info');
      onLogUpdate?.(this.getLogs());
      
      const capturedDescriptor = await this.detectFace(capturedImg);
      if (!capturedDescriptor) {
        this.addLog('Rosto não detectado na foto capturada', 'error');
        return {
          success: false,
          matched: false,
          similarity: 0,
          distance: 1,
          threshold: this.DISTANCE_THRESHOLD,
          referenceDetected: true,
          capturedDetected: false,
          processingTime: Date.now() - startTime,
          error: 'Rosto não detectado - centralize o rosto na câmera',
          logs: this.getLogs(),
        };
      }
      this.addLog('Rosto detectado na foto capturada ✓', 'success');
      onLogUpdate?.(this.getLogs());

      // Step 6: Compare face descriptors
      this.addLog('=== COMPARANDO FACES ===', 'info');
      onLogUpdate?.(this.getLogs());
      
      // Calculate Euclidean distance between descriptors
      const distance = faceapi.euclideanDistance(referenceDescriptor, capturedDescriptor);
      
      // Convert distance to similarity (0-1 scale)
      // Distance of 0 = 100% similar, Distance of 1+ = 0% similar
      const similarity = Math.max(0, 1 - distance);
      const matched = distance <= this.DISTANCE_THRESHOLD;

      this.addLog(`Distância euclidiana: ${distance.toFixed(3)}`, distance <= this.DISTANCE_THRESHOLD ? 'success' : 'warning');
      this.addLog(`Similaridade: ${(similarity * 100).toFixed(1)}%`, matched ? 'success' : 'warning');
      this.addLog(`Limiar máximo de distância: ${this.DISTANCE_THRESHOLD}`, 'info');
      onLogUpdate?.(this.getLogs());

      // Step 7: Result
      this.addLog('=== RESULTADO ===', 'info');
      if (matched) {
        this.addLog('✓ FACES CORRESPONDEM - Mesma pessoa identificada!', 'success');
      } else {
        this.addLog('✗ FACES NÃO CORRESPONDEM', 'error');
      }
      
      const processingTime = Date.now() - startTime;
      this.addLog(`Tempo de processamento: ${processingTime}ms`, 'info');
      onLogUpdate?.(this.getLogs());

      return {
        success: true,
        matched,
        similarity,
        distance,
        threshold: this.DISTANCE_THRESHOLD,
        referenceDetected: true,
        capturedDetected: true,
        processingTime,
        logs: this.getLogs(),
      };

    } catch (error: any) {
      this.addLog(`Erro inesperado: ${error.message}`, 'error');
      console.error('Face comparison error:', error);
      return this.createErrorResult(error.message, startTime);
    }
  }

  private createErrorResult(error: string, startTime: number): FaceApiResult {
    return {
      success: false,
      matched: false,
      similarity: 0,
      distance: 1,
      threshold: this.DISTANCE_THRESHOLD,
      referenceDetected: false,
      capturedDetected: false,
      processingTime: Date.now() - startTime,
      error,
      logs: this.getLogs(),
    };
  }
}

// Singleton instance
export const faceApiService = new FaceApiService();
