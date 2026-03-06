import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadSimpleProps {
  onSave: (signatureData: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function SignaturePadSimple({ 
  onSave, 
  onCancel,
  className
}: SignaturePadSimpleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const normalSize = { width: 600, height: 200 };

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <div className="flex flex-col">
        <div className={cn(
          "relative border-2 rounded-xl overflow-hidden bg-white shadow-inner",
          "border-slate-300",
          hasSignature && "border-green-400"
        )}>
          <canvas
            ref={canvasRef}
            width={normalSize.width}
            height={normalSize.height}
            className="cursor-crosshair w-full"
            style={{ aspectRatio: `${normalSize.width}/${normalSize.height}`, touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          
          {/* Linha guia */}
          <div className="absolute bottom-6 left-6 right-6 border-b-2 border-dashed border-slate-200 pointer-events-none" />
          
          {/* Indicador de área */}
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-300 text-lg font-medium">Assine aqui</p>
            </div>
          )}
        </div>
        
        <p className="text-xs text-slate-500 text-center mt-2">
          Use o mouse ou o dedo para assinar
        </p>

        <div className="flex justify-between items-center mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            className="gap-2"
          >
            <Eraser className="h-4 w-4" />
            Limpar
          </Button>
          
          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
              >
                Cancelar
              </Button>
            )}
            
            <Button
              type="button"
              size="sm"
              onClick={saveSignature}
              disabled={!hasSignature}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4" />
              Confirmar Assinatura
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
