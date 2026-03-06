/**
 * Facial Recognition Utilities
 * 
 * Este módulo fornece funções para reconhecimento facial.
 * Usa face-api.js com redes neurais para detecção e comparação precisa de faces.
 */

// Novo serviço com face-api.js (recomendado)
export { faceApiService, type FaceApiResult } from './FaceApiService';

// Serviço legado (mantido para compatibilidade)
export { FacialRecognitionService } from './FacialRecognitionService';
export { ImageProcessor } from './ImageProcessor';
export { FaceDetector } from './FaceDetector';
export type { 
  FacialValidationResult, 
  ProcessingLog, 
  ImageAnalysis,
  FaceDetectionResult 
} from './types';
