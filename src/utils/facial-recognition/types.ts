/**
 * Types for Facial Recognition System
 */

export interface ProcessingLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  data?: any;
}

export interface ImageAnalysis {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  histogram: number[];
  colorHistogram: {
    red: number[];
    green: number[];
    blue: number[];
  };
  skinToneRatio: number;
  edgeStrength: number;
}

export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  faceRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye?: { x: number; y: number };
    rightEye?: { x: number; y: number };
    nose?: { x: number; y: number };
    mouth?: { x: number; y: number };
  };
  quality: {
    brightness: 'low' | 'ok' | 'high';
    blur: 'blurry' | 'ok' | 'sharp';
    faceSize: 'small' | 'ok' | 'large';
  };
  issues: string[];
}

export interface FacialValidationResult {
  success: boolean;
  similarity: number;
  threshold: number;
  matched: boolean;
  referenceAnalysis: ImageAnalysis | null;
  capturedAnalysis: ImageAnalysis | null;
  referenceFace: FaceDetectionResult | null;
  capturedFace: FaceDetectionResult | null;
  processingTime: number;
  logs: ProcessingLog[];
  errors: string[];
  warnings: string[];
}

export interface ComparisonMetrics {
  histogramSimilarity: number;
  colorSimilarity: number;
  skinToneSimilarity: number;
  structuralSimilarity: number;
  overallScore: number;
}
