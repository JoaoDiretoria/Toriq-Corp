import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Eraser, Check, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadFullscreenProps {
  onSave: (signatureData: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function SignaturePadFullscreen({ 
  onSave, 
  onCancel,
  className
}: SignaturePadFullscreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenReady, setFullscreenReady] = useState(false);

  // Tamanho fixo para o canvas normal
  const normalSize = { width: 600, height: 250 };

  const initCanvas = useCallback((canvas: HTMLCanvasElement | null, lineWidth: number = 3) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    initCanvas(canvasRef.current, 3);
  }, [initCanvas]);

  // Quando entra em fullscreen, aguarda o canvas estar pronto e copia o conteúdo
  useEffect(() => {
    if (isFullscreen) {
      // Aguarda um frame para o canvas estar no DOM
      const timer = setTimeout(() => {
        if (fullscreenCanvasRef.current && canvasRef.current) {
          const fsCanvas = fullscreenCanvasRef.current;
          const fsCtx = fsCanvas.getContext('2d');
          if (fsCtx) {
            // Limpa e configura
            fsCtx.fillStyle = '#ffffff';
            fsCtx.fillRect(0, 0, fsCanvas.width, fsCanvas.height);
            // Copia conteúdo do canvas normal
            fsCtx.drawImage(canvasRef.current, 0, 0, fsCanvas.width, fsCanvas.height);
            fsCtx.strokeStyle = '#1e293b';
            fsCtx.lineWidth = 5;
            fsCtx.lineCap = 'round';
            fsCtx.lineJoin = 'round';
          }
          setFullscreenReady(true);
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setFullscreenReady(false);
    }
  }, [isFullscreen]);

  // Quando sai do fullscreen, copia o conteúdo de volta
  const handleMinimize = () => {
    if (fullscreenCanvasRef.current && canvasRef.current) {
      const normalCanvas = canvasRef.current;
      const normalCtx = normalCanvas.getContext('2d');
      if (normalCtx) {
        normalCtx.fillStyle = '#ffffff';
        normalCtx.fillRect(0, 0, normalCanvas.width, normalCanvas.height);
        normalCtx.drawImage(fullscreenCanvasRef.current, 0, 0, normalCanvas.width, normalCanvas.height);
        normalCtx.strokeStyle = '#1e293b';
        normalCtx.lineWidth = 3;
        normalCtx.lineCap = 'round';
        normalCtx.lineJoin = 'round';
      }
    }
    setIsFullscreen(false);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement | null) => {
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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement | null) => {
    e.preventDefault();
    e.stopPropagation();
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Garante que o contexto está configurado
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = isFullscreen ? 5 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDrawing) return;

    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsDrawing(false);
  };

  const clearSignature = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Limpa ambos os canvas
    [canvasRef.current, fullscreenCanvasRef.current].forEach(canvas => {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    });
    setHasSignature(false);
  };

  const saveSignature = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Usa o canvas que está ativo
    const canvas = isFullscreen ? fullscreenCanvasRef.current : canvasRef.current;
    if (!canvas || !hasSignature) return;

    const signatureData = canvas.toDataURL('image/png');
    if (isFullscreen) {
      setIsFullscreen(false);
    }
    onSave(signatureData);
  };

  const handleExpand = () => {
    setIsFullscreen(true);
  };

  // Renderiza o modo fullscreen usando Portal + mantém o componente normal oculto
  const fullscreenPortal = isFullscreen ? createPortal(
    <div 
      className="fixed inset-0 bg-slate-900 flex flex-col"
      style={{ 
        width: '100vw', 
        height: '100vh',
        top: 0,
        left: 0,
        zIndex: 99999,
        position: 'fixed'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shrink-0">
        <h3 className="text-xl font-semibold text-white">✍️ Assinatura em Tela Cheia</h3>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={clearSignature}
            className="gap-2 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            <Eraser className="h-5 w-5" />
            Limpar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleMinimize}
            className="gap-2 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            <Minimize2 className="h-5 w-5" />
            Minimizar
          </Button>
        </div>
      </div>

      {/* Área do Canvas - ocupa todo o espaço restante */}
      <div className="flex-1 p-4 flex flex-col min-h-0">
        <div className="flex-1 relative bg-white rounded-2xl overflow-hidden shadow-2xl border-4 border-blue-500">
          <canvas
            ref={fullscreenCanvasRef}
            width={1920}
            height={1080}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            style={{ touchAction: 'none' }}
            onMouseDown={(e) => startDrawing(e, fullscreenCanvasRef.current)}
            onMouseMove={(e) => draw(e, fullscreenCanvasRef.current)}
            onMouseUp={(e) => stopDrawing(e)}
            onMouseLeave={(e) => stopDrawing(e)}
            onTouchStart={(e) => startDrawing(e, fullscreenCanvasRef.current)}
            onTouchMove={(e) => draw(e, fullscreenCanvasRef.current)}
            onTouchEnd={(e) => stopDrawing(e)}
          />
          
          {/* Linha guia */}
          <div className="absolute bottom-16 left-16 right-16 border-b-4 border-dashed border-slate-300 pointer-events-none" />
          
          {/* Indicador */}
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-300 text-4xl font-medium">Assine aqui</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-t border-slate-700 shrink-0">
        <p className="text-slate-400">Use o mouse ou o dedo para assinar</p>
        <Button
          type="button"
          size="lg"
          onClick={saveSignature}
          disabled={!hasSignature}
          className="gap-2 bg-green-600 hover:bg-green-700 text-lg px-8"
        >
          <Check className="h-5 w-5" />
          Confirmar Assinatura
        </Button>
      </div>
    </div>,
    document.body
  ) : null;

  // Modo normal - sempre renderizado (oculto quando fullscreen)
  return (
    <>
      {fullscreenPortal}
      <div ref={containerRef} className={cn("w-full", className)} style={{ display: isFullscreen ? 'none' : 'block' }}>
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
              onMouseDown={(e) => startDrawing(e, canvasRef.current)}
              onMouseMove={(e) => draw(e, canvasRef.current)}
              onMouseUp={(e) => stopDrawing(e)}
              onMouseLeave={(e) => stopDrawing(e)}
              onTouchStart={(e) => startDrawing(e, canvasRef.current)}
              onTouchMove={(e) => draw(e, canvasRef.current)}
              onTouchEnd={(e) => stopDrawing(e)}
            />
            
            {/* Linha guia */}
            <div className="absolute bottom-8 left-8 right-8 border-b-2 border-dashed border-slate-200 pointer-events-none" />
            
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

          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-2">
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
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExpand}
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                Expandir
              </Button>
            </div>
            
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
    </>
  );
}
