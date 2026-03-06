import * as React from "react";
import { cn } from "@/lib/utils";
import { FileImage, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import heic2any from "heic2any";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
  showDownloadOnError?: boolean;
}

const HEIC_EXTENSIONS = ['.heic', '.heif'];

function isHeicFile(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return HEIC_EXTENSIONS.some(ext => lowerUrl.includes(ext));
}

export function ImageWithFallback({ 
  src, 
  alt, 
  className, 
  fallbackClassName,
  showDownloadOnError = true,
  onClick,
  ...props 
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [convertedSrc, setConvertedSrc] = React.useState<string | null>(null);
  const [isConverting, setIsConverting] = React.useState(false);
  const isHeic = isHeicFile(src || '');

  React.useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setConvertedSrc(null);

    if (isHeic && src) {
      convertHeicToJpeg(src);
    }
  }, [src, isHeic]);

  const convertHeicToJpeg = async (heicUrl: string) => {
    setIsConverting(true);
    try {
      const response = await fetch(heicUrl);
      const blob = await response.blob();
      
      const convertedBlob = await heic2any({
        blob,
        toType: "image/jpeg",
        quality: 0.8
      });

      const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      const objectUrl = URL.createObjectURL(resultBlob);
      setConvertedSrc(objectUrl);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao converter HEIC:', error);
      setHasError(true);
      setIsLoading(false);
    } finally {
      setIsConverting(false);
    }
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (src) {
      window.open(src, '_blank');
    }
  };

  // Se está convertendo HEIC, mostrar loading
  if (isConverting) {
    return (
      <div 
        className={cn(
          "flex flex-col items-center justify-center bg-muted/50 text-muted-foreground",
          fallbackClassName || className
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <p className="text-xs text-center px-2">Convertendo HEIC...</p>
      </div>
    );
  }

  // Se teve erro e não conseguiu converter, mostrar fallback
  if (hasError) {
    return (
      <div 
        className={cn(
          "flex flex-col items-center justify-center bg-muted/50 text-muted-foreground",
          fallbackClassName || className
        )}
        onClick={onClick}
      >
        <FileImage className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-xs text-center px-2">Imagem indisponível</p>
        {showDownloadOnError && src && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs"
            onClick={handleDownload}
          >
            <Download className="h-3 w-3 mr-1" />
            Baixar
          </Button>
        )}
      </div>
    );
  }

  const imageSrc = isHeic ? convertedSrc : src;

  // Se é HEIC e ainda não converteu, mostrar loading
  if (isHeic && !convertedSrc) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted/30 animate-pulse",
          className
        )}
      >
        <FileImage className="h-6 w-6 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <>
      {isLoading && !isHeic && (
        <div 
          className={cn(
            "flex items-center justify-center bg-muted/30 animate-pulse",
            className
          )}
        >
          <FileImage className="h-6 w-6 text-muted-foreground/30" />
        </div>
      )}
      <img
        src={imageSrc || ''}
        alt={alt}
        className={cn(className, isLoading && !isHeic && "hidden")}
        onError={handleError}
        onLoad={handleLoad}
        onClick={onClick}
        {...props}
      />
    </>
  );
}
