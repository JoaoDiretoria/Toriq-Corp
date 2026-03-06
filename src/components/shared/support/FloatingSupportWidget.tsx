import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Headphones, 
  X, 
  Minus, 
  GripVertical,
  Send,
  Paperclip,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Shield,
  Building2,
  MapPin,
  Camera,
  ImagePlus,
  Clipboard,
  Maximize2,
  ZoomIn,
  MousePointer,
  Crosshair
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { MODULOS_CONFIG, getTodasTelasPorModulo } from '@/config/modulosTelas';
import { useCurrentScreen } from '@/hooks/useCurrentScreen';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin_vertical: { label: 'Admin Vertical', color: 'bg-purple-100 text-purple-700' },
  empresa_sst: { label: 'Empresa SST', color: 'bg-blue-100 text-blue-700' },
  cliente_final: { label: 'Cliente', color: 'bg-green-100 text-green-700' },
  empresa_parceira: { label: 'Parceiro', color: 'bg-orange-100 text-orange-700' },
  instrutor: { label: 'Instrutor', color: 'bg-cyan-100 text-cyan-700' },
};

function detectModuloTelaFromPath(pathname: string): { modulo: string; tela: string; moduloNome: string; telaNome: string } {
  let moduloDetectado = '';
  let telaDetectada = '';
  let moduloNome = 'Não identificado';
  let telaNome = 'Não identificada';
  
  // Detectar baseado no path
  for (const modulo of MODULOS_CONFIG) {
    for (const tela of modulo.telas) {
      // Verificar se o path contém o ID da tela
      if (pathname.includes(tela.id) || pathname.includes(tela.id.replace(/-/g, ''))) {
        moduloDetectado = modulo.id;
        telaDetectada = tela.id;
        moduloNome = modulo.nome;
        telaNome = tela.nome;
        break;
      }
      // Verificar subTelas
      if (tela.subTelas) {
        for (const subTela of tela.subTelas) {
          if (pathname.includes(subTela.id) || pathname.includes(subTela.id.replace(/-/g, ''))) {
            moduloDetectado = modulo.id;
            telaDetectada = subTela.id;
            moduloNome = modulo.nome;
            telaNome = subTela.nome;
            break;
          }
        }
      }
    }
    if (moduloDetectado) break;
  }
  
  // Fallback: detectar pelo prefixo do path
  if (!moduloDetectado) {
    if (pathname.includes('/admin')) {
      moduloDetectado = 'admin';
      moduloNome = 'Painel Admin';
    } else if (pathname.includes('/sst')) {
      moduloDetectado = 'sst';
      moduloNome = 'Painel SST';
    } else if (pathname.includes('/cliente')) {
      moduloDetectado = 'cliente';
      moduloNome = 'Portal do Cliente';
    } else if (pathname.includes('/instrutor')) {
      moduloDetectado = 'instrutor';
      moduloNome = 'Portal do Instrutor';
    } else if (pathname.includes('/parceira')) {
      moduloDetectado = 'parceira';
      moduloNome = 'Portal Parceiro';
    }
  }
  
  return { modulo: moduloDetectado, tela: telaDetectada, moduloNome, telaNome };
}

interface FloatingSupportWidgetProps {
  className?: string;
}

const TIPOS = [
  { value: 'bug', label: 'Bug / Erro' },
  { value: 'duvida', label: 'Dúvida' },
  { value: 'sugestao', label: 'Sugestão' },
  { value: 'problema_tecnico', label: 'Problema Técnico' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'outro', label: 'Outro' },
];

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: 'text-slate-500' },
  { value: 'media', label: 'Média', color: 'text-blue-500' },
  { value: 'alta', label: 'Alta', color: 'text-orange-500' },
  { value: 'critica', label: 'Crítica', color: 'text-red-500' },
];

const IMPACTOS = [
  { value: 'nenhum', label: 'Nenhum impacto', desc: 'Não afeta a operação' },
  { value: 'baixo', label: 'Baixo impacto', desc: 'Tenho um workaround' },
  { value: 'medio', label: 'Médio impacto', desc: 'Afeta parcialmente' },
  { value: 'alto', label: 'Alto impacto', desc: 'Afeta muito a operação' },
  { value: 'critico', label: 'Crítico', desc: 'Empresa parada!' },
];

async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function FloatingSupportWidget({ className }: FloatingSupportWidgetProps) {
  const { profile, user, loading } = useAuth();
  const location = useLocation();
  const { screenInfo } = useCurrentScreen();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'se' | 'sw' | null>(null);
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 20, y: 100 };
    return {
      x: Math.max(0, (window.innerWidth - 380) / 2),
      y: Math.max(0, (window.innerHeight - 550) / 2),
    };
  });
  const [size, setSize] = useState({ width: 380, height: 550 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Estado para posição do botão flutuante (quando fechado)
  const DEFAULT_BUTTON_POSITION = { x: typeof window !== 'undefined' ? window.innerWidth - 140 : 500, y: typeof window !== 'undefined' ? window.innerHeight - 70 : 500 };
  const [buttonPosition, setButtonPosition] = useState(DEFAULT_BUTTON_POSITION);
  const [isButtonDragging, setIsButtonDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const buttonDragOffsetRef = useRef({ x: 0, y: 0 });
  const lastClickTimeRef = useRef(0);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Estado do Element Picker
  const [isPickingElement, setIsPickingElement] = useState(false);
  const [capturedElement, setCapturedElement] = useState<{
    screenshot: string;
    selector: string;
    componentName: string;
    tagName: string;
    dimensions: string;
    text: string;
  } | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  
  // Ref para rastrear o usuário anterior (detectar logout)
  const previousUserRef = useRef<string | null>(null);
  
  // Tamanhos mínimos e máximos
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 400;
  const MAX_WIDTH = 600;
  const MAX_HEIGHT = 800;
  
  // Determinar módulo baseado no role do usuário (mais simples e confiável)
  const detectedLocation = useMemo(() => {
    const role = profile?.role || '';
    
    // Mapear role para módulo
    const roleToModulo: Record<string, { modulo: string; moduloNome: string }> = {
      'instrutor': { modulo: 'portal_instrutor', moduloNome: 'Portal do Instrutor' },
      'empresa_parceira': { modulo: 'portal_parceiro', moduloNome: 'Portal Parceiro' },
      'cliente_final': { modulo: 'portal_cliente', moduloNome: 'Portal do Cliente' },
      'admin_vertical': { modulo: 'admin', moduloNome: 'Painel Admin' },
      'empresa_sst': { modulo: 'painel_sst', moduloNome: 'Painel SST' },
    };
    
    const moduloInfo = roleToModulo[role] || { modulo: '', moduloNome: 'Não identificado' };
    
    // Usar tela do contexto se disponível, senão detectar pelo path
    let telaNome = screenInfo.telaNome || 'Não identificada';
    let telaId = screenInfo.telaId || '';
    
    // Se não tem tela do contexto, tentar detectar pelo path
    if (!telaId) {
      const pathDetected = detectModuloTelaFromPath(location.pathname);
      telaNome = pathDetected.telaNome;
      telaId = pathDetected.tela;
    }
    
    return {
      modulo: moduloInfo.modulo,
      tela: telaId,
      moduloNome: moduloInfo.moduloNome,
      telaNome: telaNome,
    };
  }, [profile?.role, screenInfo, location.pathname]);
  
  const [form, setForm] = useState({
    tipo: '',
    prioridade: 'media',
    impacto_operacional: 'nenhum',
    titulo: '',
    descricao: '',
  });

  // Role info
  const roleInfo = useMemo(() => {
    const role = profile?.role || '';
    return ROLE_LABELS[role] || { label: role, color: 'bg-gray-100 text-gray-700' };
  }, [profile?.role]);
  
  const [anexos, setAnexos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  
  // Refs para drag fluido (evita re-renders durante movimento)
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef<'se' | 'sw' | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  // Refs para controle de drag vs click
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const DRAG_THRESHOLD = 5; // pixels mínimos para considerar como drag

  // Handlers para arrastar o botão flutuante (quando fechado)
  const handleButtonMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Guardar posição inicial do mouse
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
    
    setIsButtonDragging(true);
    
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      buttonDragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  const handleButtonMouseMove = useCallback((e: MouseEvent) => {
    if (!isButtonDragging) return;
    
    e.preventDefault();
    
    // Verificar se moveu o suficiente para ser considerado drag
    const deltaX = Math.abs(e.clientX - dragStartPosRef.current.x);
    const deltaY = Math.abs(e.clientY - dragStartPosRef.current.y);
    
    if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
      hasDraggedRef.current = true;
    }
    
    // Só mover se passou do threshold
    if (!hasDraggedRef.current) return;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      const newX = e.clientX - buttonDragOffsetRef.current.x;
      const newY = e.clientY - buttonDragOffsetRef.current.y;
      
      const buttonWidth = buttonRef.current?.offsetWidth || 120;
      const buttonHeight = buttonRef.current?.offsetHeight || 48;
      
      const maxX = window.innerWidth - buttonWidth;
      const maxY = window.innerHeight - buttonHeight;
      
      setButtonPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    });
  }, [isButtonDragging]);

  const handleButtonMouseUp = useCallback((e: MouseEvent) => {
    if (isButtonDragging) {
      // Se arrastou, não abrir o widget
      const wasDragging = isButtonDragging;
      setIsButtonDragging(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Só abrir se não arrastou (movimento mínimo)
      return wasDragging;
    }
    return false;
  }, [isButtonDragging]);

  // Effect para listeners do botão
  useEffect(() => {
    if (isButtonDragging) {
      window.addEventListener('mousemove', handleButtonMouseMove);
      window.addEventListener('mouseup', (e) => {
        handleButtonMouseUp(e);
        setIsButtonDragging(false);
      });
      return () => {
        window.removeEventListener('mousemove', handleButtonMouseMove);
        window.removeEventListener('mouseup', handleButtonMouseUp as any);
      };
    }
  }, [isButtonDragging, handleButtonMouseMove, handleButtonMouseUp]);

  // Atualizar posição padrão quando a janela redimensiona
  useEffect(() => {
    const handleResize = () => {
      setButtonPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 140),
        y: Math.min(prev.y, window.innerHeight - 70),
      }));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    e.preventDefault();
    
    // Cancelar frame anterior se existir
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Usar requestAnimationFrame para movimento suave
    animationFrameRef.current = requestAnimationFrame(() => {
      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;
      
      const maxX = window.innerWidth - (widgetRef.current?.offsetWidth || 400);
      const maxY = window.innerHeight - (widgetRef.current?.offsetHeight || 500);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    isResizingRef.current = null;
    setIsDragging(false);
    setIsResizing(null);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Handler de redimensionamento
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    
    e.preventDefault();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      const rect = widgetRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      if (isResizingRef.current === 'se') {
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - rect.left));
        const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, e.clientY - rect.top));
        setSize({ width: newWidth, height: newHeight });
      } else if (isResizingRef.current === 'sw') {
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, rect.right - e.clientX));
        const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, e.clientY - rect.top));
        const newX = e.clientX;
        setSize({ width: newWidth, height: newHeight });
        setPosition(prev => ({ ...prev, x: Math.max(0, newX) }));
      }
    });
  }, [MIN_WIDTH, MIN_HEIGHT, MAX_WIDTH, MAX_HEIGHT]);

  const handleResizeStart = useCallback((corner: 'se' | 'sw') => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = corner;
    setIsResizing(corner);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleResizeMove, handleMouseUp]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImageFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addImageFiles = (files: File[]) => {
    const remaining = 3 - anexos.length;
    
    if (remaining <= 0) {
      toast.error('Limite de 3 imagens atingido');
      return;
    }
    
    if (files.length > remaining) {
      toast.error(`Você pode adicionar no máximo ${remaining} imagem(ns)`);
    }
    
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0 && files.length > 0) {
      toast.error('Apenas imagens são permitidas');
      return;
    }
    
    setAnexos(prev => [...prev, ...validFiles.slice(0, remaining)]);
  };

  // Handler para paste de imagem (Ctrl+V)
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!isOpen || isMinimized) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }
    
    if (imageFiles.length > 0) {
      e.preventDefault();
      addImageFiles(imageFiles);
      toast.success('Imagem colada!');
    }
  }, [isOpen, isMinimized, anexos.length]);

  // Element Picker - helpers
  const getElementSelector = (el: HTMLElement): string => {
    const parts: string[] = [];
    let current: HTMLElement | null = el;
    for (let i = 0; i < 3 && current && current !== document.body; i++) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c.trim() && !c.startsWith('hover:') && !c.startsWith('data-')).slice(0, 2);
        if (classes.length > 0) selector += `.${classes.join('.')}`;
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    return parts.join(' > ');
  };

  const getComponentName = (el: HTMLElement): string => {
    let current: HTMLElement | null = el;
    while (current) {
      const name = current.getAttribute('data-component-name');
      if (name) return name;
      current = current.parentElement;
    }
    return '';
  };

  const startElementPicker = useCallback(() => {
    setIsPickingElement(true);
    setIsMinimized(true);

    // Criar highlight (pointer-events: none, só visual)
    const highlight = document.createElement('div');
    highlight.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #f97316;background:rgba(249,115,22,0.1);z-index:999998;transition:all 0.05s ease;display:none;border-radius:4px;';
    document.body.appendChild(highlight);
    highlightRef.current = highlight;

    // Criar label flutuante (pointer-events: none)
    const label = document.createElement('div');
    label.style.cssText = 'position:fixed;pointer-events:none;z-index:999998;background:#f97316;color:white;font-size:11px;padding:2px 8px;border-radius:4px;font-family:monospace;white-space:nowrap;display:none;';
    document.body.appendChild(label);

    // Criar barra de instrução no topo
    const bar = document.createElement('div');
    bar.setAttribute('data-support-widget', '');
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#f97316;color:white;text-align:center;padding:8px 16px;font-size:13px;font-weight:600;font-family:system-ui;display:flex;align-items:center;justify-content:center;gap:8px;';
    bar.innerHTML = '<span>🎯 Clique no elemento com problema</span><button id="cancel-picker" style="background:rgba(0,0,0,0.2);border:none;color:white;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Cancelar (Esc)</button>';
    document.body.appendChild(bar);

    // Mudar cursor globalmente
    document.documentElement.style.cursor = 'crosshair';
    const styleTag = document.createElement('style');
    styleTag.textContent = '* { cursor: crosshair !important; }';
    document.head.appendChild(styleTag);

    let hoveredElement: HTMLElement | null = null;

    const handleMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target.closest('[data-support-widget]')) {
        highlight.style.display = 'none';
        label.style.display = 'none';
        hoveredElement = null;
        return;
      }
      hoveredElement = target;
      const rect = target.getBoundingClientRect();
      highlight.style.display = 'block';
      highlight.style.left = rect.left + 'px';
      highlight.style.top = rect.top + 'px';
      highlight.style.width = rect.width + 'px';
      highlight.style.height = rect.height + 'px';

      const tagName = target.tagName.toLowerCase();
      const compName = getComponentName(target);
      label.textContent = compName ? `<${compName}> ${tagName}` : tagName;
      label.style.display = 'block';
      label.style.left = rect.left + 'px';
      label.style.top = Math.max(0, rect.top - 24) + 'px';
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', handleMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKey, true);
      highlight.remove();
      label.remove();
      bar.remove();
      styleTag.remove();
      document.documentElement.style.cursor = '';
      highlightRef.current = null;
      setIsPickingElement(false);
      setIsMinimized(false);
    };

    const handleClick = async (e: MouseEvent) => {
      const clickTarget = e.target as HTMLElement;
      // Ignorar cliques na barra de instrução
      if (clickTarget.closest('[data-support-widget]')) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (!hoveredElement) { cleanup(); return; }

      const target = hoveredElement;
      const rect = target.getBoundingClientRect();

      // Esconder highlight antes de capturar
      highlight.style.display = 'none';
      label.style.display = 'none';
      bar.style.display = 'none';

      // Capturar screenshot do elemento via html2canvas
      let screenshotUrl = '';
      try {
        const html2canvas = (await import('html2canvas')).default;
        // Capturar área ao redor do elemento com margem
        const margin = 20;
        const canvas = await html2canvas(document.body, {
          x: Math.max(0, rect.left - margin),
          y: Math.max(0, rect.top + window.scrollY - margin),
          width: Math.min(rect.width + margin * 2, window.innerWidth),
          height: Math.min(rect.height + margin * 2, window.innerHeight),
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
        });
        screenshotUrl = canvas.toDataURL('image/jpeg', 0.8);

        // Adicionar como anexo
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `elemento-${Date.now()}.jpg`, { type: 'image/jpeg' });
            addImageFiles([file]);
          }
        }, 'image/jpeg', 0.8);
      } catch (err) {
        console.error('Erro ao capturar elemento:', err);
      }

      const selector = getElementSelector(target);
      const compName = getComponentName(target);
      const textContent = (target.textContent || '').trim().substring(0, 100);

      setCapturedElement({
        screenshot: screenshotUrl,
        selector,
        componentName: compName,
        tagName: target.tagName.toLowerCase(),
        dimensions: `${Math.round(rect.width)}×${Math.round(rect.height)}px`,
        text: textContent,
      });

      // Adicionar info do elemento na descrição
      setForm(f => ({
        ...f,
        descricao: f.descricao + (f.descricao ? '\n\n' : '') +
          `📍 Elemento selecionado:\n` +
          `• Componente: ${compName || 'N/A'}\n` +
          `• Seletor: ${selector}\n` +
          `• Tag: <${target.tagName.toLowerCase()}>\n` +
          `• Tamanho: ${Math.round(rect.width)}×${Math.round(rect.height)}px\n` +
          (textContent ? `• Texto: "${textContent.substring(0, 60)}${textContent.length > 60 ? '...' : ''}"` : ''),
      }));

      toast.success('Elemento capturado!');
      cleanup();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        toast.info('Seleção de elemento cancelada');
      }
    };

    const cancelBtn = bar.querySelector('#cancel-picker');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        cleanup();
        toast.info('Seleção de elemento cancelada');
      });
    }

    document.addEventListener('mousemove', handleMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKey, true);
  }, []);

  // Estado para ocultar widget durante captura
  const [isCapturing, setIsCapturing] = useState(false);

  // Captura de tela
  const handleScreenCapture = async () => {
    try {
      // Ocultar widget antes de iniciar captura
      setIsCapturing(true);
      
      // Usar a API de captura de tela do navegador
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'window' } as any,
        audio: false,
      });
      
      // Aguardar o diálogo de seleção fechar completamente
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const video = document.createElement('video');
      video.srcObject = stream;
      
      // Aguardar o vídeo estar pronto
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve());
        };
      });
      
      // Aguardar mais um pouco para garantir que o frame está limpo
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Criar canvas e capturar frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        stream.getTracks().forEach(track => track.stop());
        setIsCapturing(false);
        throw new Error('Não foi possível criar contexto do canvas');
      }
      
      ctx.drawImage(video, 0, 0);
      stream.getTracks().forEach(track => track.stop());
      
      // Mostrar widget novamente
      setIsCapturing(false);
      
      // Converter para blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
          addImageFiles([file]);
          toast.success('Screenshot capturado!');
        }
      }, 'image/png');
    } catch (error: any) {
      setIsCapturing(false);
      if (error.name !== 'AbortError') {
        console.error('Erro ao capturar tela:', error);
        toast.error('Não foi possível capturar a tela');
      }
    }
  };

  // Adicionar listener de paste quando o widget está aberto
  useEffect(() => {
    if (isOpen && !isMinimized) {
      document.addEventListener('paste', handlePaste);
      return () => {
        document.removeEventListener('paste', handlePaste);
      };
    }
  }, [isOpen, isMinimized, handlePaste]);




  const removeAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = useCallback(() => {
    setForm({
      tipo: '',
      prioridade: 'media',
      impacto_operacional: 'nenhum',
      titulo: '',
      descricao: '',
    });
    setAnexos([]);
    setSubmitted(false);
    setPreviewImage(null);
    setCapturedElement(null);
  }, []);

  // Resetar tudo quando usuário faz logout ou muda
  useEffect(() => {
    const currentUserId = user?.id || null;
    
    // Detectar logout: tinha usuário antes e agora não tem
    if (previousUserRef.current && !currentUserId) {
      // Logout detectado - resetar tudo
      setIsOpen(false);
      setIsMinimized(false);
      resetForm();
    }
    
    // Atualizar ref do usuário anterior
    previousUserRef.current = currentUserId;
  }, [user?.id, resetForm]);

  // Resetar form quando a página recarrega (novo mount do componente)
  useEffect(() => {
    resetForm();
  }, []);

  const handleSubmit = async () => {
    if (!form.tipo || !form.titulo || !form.descricao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    if (!profile || !user) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Determinar destino do ticket baseado na role do solicitante
      // admin_vertical -> não faz sentido abrir ticket (é quem recebe)
      // empresa_sst -> vai para admin global (empresa_destino_id = NULL)
      // instrutor -> vai para empresa SST que criou o instrutor (tabela instrutores)
      // cliente_final -> vai para empresa SST que criou o cliente (profile.empresa_id aponta para empresa cliente, precisa buscar empresa_sst_id)
      // empresa_parceira -> vai para empresa SST que criou a parceira
      let empresaDestinoId: string | null = null;
      
      if (profile.role === 'empresa_sst') {
        // Empresa SST -> ticket vai para admin global (Toriq)
        empresaDestinoId = null;
      } else if (profile.role === 'instrutor') {
        // Instrutor -> buscar empresa na tabela instrutores e verificar se é SST ou parceira
        const { data: instrutor } = await (supabase as any)
          .from('instrutores')
          .select('empresa_id')
          .eq('user_id', user.id)
          .single();
        
        if (instrutor?.empresa_id) {
          // Verificar se a empresa é SST ou parceira
          const { data: empresa } = await (supabase as any)
            .from('empresas')
            .select('tipo')
            .eq('id', instrutor.empresa_id)
            .single();
          
          if (empresa?.tipo === 'empresa_parceira') {
            // Se instrutor é de empresa parceira, ticket vai para a parceira
            empresaDestinoId = instrutor.empresa_id;
          } else {
            // Se instrutor é de empresa SST, ticket vai para a SST
            empresaDestinoId = instrutor.empresa_id;
          }
        }
      } else if (profile.role === 'cliente_final') {
        // Cliente final -> buscar empresa SST na tabela clientes_sst usando cliente_empresa_id
        if (profile.empresa_id) {
          const { data: clienteSst, error: clienteError } = await (supabase as any)
            .from('clientes_sst')
            .select('empresa_sst_id')
            .eq('cliente_empresa_id', profile.empresa_id)
            .maybeSingle();
          
          if (clienteError) {
            console.error('Erro ao buscar empresa SST do cliente:', clienteError);
          }
          
          empresaDestinoId = clienteSst?.empresa_sst_id || null;
          console.log('[Ticket] Cliente final - empresa_id:', profile.empresa_id, '-> empresa_sst_id:', empresaDestinoId);
        }
      } else if (profile.role === 'empresa_parceira') {
        // Empresa parceira -> buscar empresa SST na tabela empresas_parceiras usando parceira_empresa_id
        if (profile.empresa_id) {
          const { data: parceiraSst } = await (supabase as any)
            .from('empresas_parceiras')
            .select('empresa_sst_id')
            .eq('parceira_empresa_id', profile.empresa_id)
            .single();
          empresaDestinoId = parceiraSst?.empresa_sst_id || null;
        }
      }
      
      // Criar ticket
      const { data: ticket, error: ticketError } = await (supabase as any)
        .from('tickets_suporte')
        .insert({
          solicitante_id: user.id,
          solicitante_nome: profile.nome || user.email,
          solicitante_email: user.email,
          empresa_solicitante_id: profile.empresa_id,
          empresa_destino_id: empresaDestinoId,
          role_solicitante: profile.role,
          tipo: form.tipo,
          modulo: detectedLocation.modulo || null,
          tela: detectedLocation.tela || null,
          prioridade: form.prioridade,
          impacto_operacional: form.impacto_operacional,
          titulo: form.titulo,
          descricao: form.descricao,
          tela_origem: location.pathname,
          url_origem: window.location.href,
          navegador: navigator.userAgent,
        })
        .select()
        .single();
      
      if (ticketError) throw ticketError;
      
      // Upload de anexos
      if (anexos.length > 0 && ticket) {
        for (const file of anexos) {
          try {
            const compressed = await compressImage(file);
            const fileName = `${ticket.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('tickets-anexos')
              .upload(fileName, compressed, {
                contentType: 'image/jpeg',
              });
            
            if (uploadError) {
              console.error('Erro ao fazer upload:', uploadError);
              continue;
            }
            
            const { data: { publicUrl } } = supabase.storage
              .from('tickets-anexos')
              .getPublicUrl(fileName);
            
            await (supabase as any)
              .from('tickets_suporte_anexos')
              .insert({
                ticket_id: ticket.id,
                nome_arquivo: file.name,
                url: publicUrl,
                tamanho_bytes: compressed.size,
                tipo_mime: 'image/jpeg',
              });
          } catch (err) {
            console.error('Erro ao processar anexo:', err);
          }
        }
      }
      
      setSubmitted(true);
      toast.success('Ticket enviado com sucesso!');
      
      setTimeout(() => {
        resetForm();
        setIsMinimized(true);
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast.error('Erro ao enviar ticket. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  // Não renderizar se não estiver logado ou ainda carregando
  if (loading || !user || !profile) {
    return null;
  }

  // Se está capturando, ocultar completamente o widget
  if (isCapturing) {
    return null;
  }

  if (!isOpen) {
    return createPortal(
      <button
        ref={buttonRef}
        data-support-widget
        onPointerDownCapture={(e) => e.stopPropagation()}
        onMouseDown={handleButtonMouseDown}
        onClick={(e) => {
          e.preventDefault();
          
          // Se arrastou, não fazer nada
          if (hasDraggedRef.current) {
            hasDraggedRef.current = false;
            return;
          }
          
          // Se já tem um timeout pendente, é double-click
          if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            // Double-click: resetar posição
            setButtonPosition({
              x: window.innerWidth - 140,
              y: window.innerHeight - 70
            });
            return;
          }
          
          // Primeiro clique: aguardar para ver se vem segundo
          clickTimeoutRef.current = setTimeout(() => {
            clickTimeoutRef.current = null;
            // Clique simples: abrir widget centralizado
            setPosition({
              x: Math.max(0, (window.innerWidth - size.width) / 2),
              y: Math.max(0, (window.innerHeight - size.height) / 2),
            });
            setIsOpen(true);
          }, 300); // 300ms para detectar double-click
        }}
        className={cn(
          'fixed z-[99999] pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'hover:shadow-xl hover:shadow-primary/25',
          isButtonDragging && hasDraggedRef.current ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-105',
          'transition-shadow duration-200',
          'select-none',
          className
        )}
        style={{ 
          left: buttonPosition.x, 
          top: buttonPosition.y,
          transition: isButtonDragging ? 'none' : 'transform 0.2s',
          isolation: 'isolate'
        }}
        title="Clique para abrir • Arraste para mover • Duplo clique para resetar"
      >
        <Headphones className="h-5 w-5" />
        <span className="font-medium">Suporte</span>
      </button>,
      document.body
    );
  }

  return createPortal(
    <>
    {/* Modal de preview de imagem */}
    {previewImage && (
      <div 
        className="fixed inset-0 z-[2147483647] bg-black/80 flex items-center justify-center p-4"
        onClick={() => setPreviewImage(null)}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="relative max-w-[90vw] max-h-[90vh]">
          <img 
            src={previewImage} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => setPreviewImage(null)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    )}
    
    <div
      ref={widgetRef}
      data-support-widget
      className={cn(
        'fixed bg-background border rounded-xl shadow-2xl overflow-hidden flex flex-col',
        (isDragging || isResizing) && 'select-none !transition-none',
        isDragging && 'cursor-grabbing',
        !isDragging && !isResizing && 'transition-[width,height] duration-200',
      )}
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? 300 : size.width,
        height: isMinimized ? 'auto' : size.height,
        minWidth: MIN_WIDTH,
        minHeight: isMinimized ? 'auto' : MIN_HEIGHT,
        zIndex: 2147483647,
        pointerEvents: 'auto',
        isolation: 'isolate',
      }}
      onWheelCapture={(e) => e.stopPropagation()}
      onKeyDownCapture={(e) => e.stopPropagation()}
      onKeyUpCapture={(e) => e.stopPropagation()}
    >
      {/* Header arrastável */}
      <div
        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e); }}
        className={cn(
          'flex items-center justify-between px-4 py-3',
          'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
          'cursor-grab',
          isDragging && 'cursor-grabbing'
        )}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 opacity-50" />
          <Headphones className="h-5 w-5" />
          <span className="font-semibold">Solicitar Suporte</span>
        </div>
        <div className="flex items-center gap-1" data-no-drag>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      {!isMinimized && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 overflow-y-auto flex-1 space-y-0">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-4 animate-in zoom-in-50 duration-300">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Ticket Enviado!</h3>
              <p className="text-sm text-muted-foreground max-w-[260px]">
                Sua solicitação foi recebida. Acompanhe o status na tela de tickets.
              </p>
            </div>
          ) : (
            <>
              {/* Seção: Contexto (colapsado visualmente) */}
              <div className="space-y-3 pb-3">
                {/* Solicitante + Localização lado a lado compacto */}
                <div className="flex gap-2">
                  <div className="flex-1 p-2.5 bg-muted/40 rounded-lg border border-border/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Solicitante</span>
                    </div>
                    <p className="text-xs font-medium truncate">{profile?.nome || 'Usuário'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="flex-1 p-2.5 bg-muted/40 rounded-lg border border-border/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Localização</span>
                    </div>
                    <p className="text-xs font-medium truncate">{detectedLocation.moduloNome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{detectedLocation.telaNome}</p>
                  </div>
                </div>

                <Badge className={cn('text-[10px] w-fit', roleInfo.color)}>
                  {roleInfo.label}
                </Badge>
              </div>

              <div className="border-t border-border/50" />

              {/* Seção: Classificação */}
              <div className="space-y-3 py-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tipo do Problema <span className="text-destructive">*</span></Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 2147483647 }}>
                      {TIPOS.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Prioridade</Label>
                    <Select value={form.prioridade} onValueChange={(v) => setForm(f => ({ ...f, prioridade: v }))}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ zIndex: 2147483647 }}>
                        {PRIORIDADES.map(p => (
                          <SelectItem key={p.value} value={p.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn('w-2 h-2 rounded-full', {
                                'bg-slate-400': p.value === 'baixa',
                                'bg-blue-500': p.value === 'media',
                                'bg-orange-500': p.value === 'alta',
                                'bg-red-500': p.value === 'critica',
                              })} />
                              <span>{p.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Impacto</Label>
                    <Select value={form.impacto_operacional} onValueChange={(v) => setForm(f => ({ ...f, impacto_operacional: v }))}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ zIndex: 2147483647 }}>
                        {IMPACTOS.map(i => (
                          <SelectItem key={i.value} value={i.value}>
                            <div className="flex flex-col">
                              <span className="text-sm">{i.label}</span>
                              <span className="text-[10px] text-muted-foreground">{i.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50" />

              {/* Seção: Detalhes */}
              <div className="space-y-3 py-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Título <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Ex: Botão de salvar não funciona"
                    value={form.titulo}
                    onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Descrição <span className="text-destructive">*</span></Label>
                  <Textarea
                    placeholder="Descreva o problema com detalhes. O que aconteceu? O que deveria acontecer?"
                    value={form.descricao}
                    onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
                    className="min-h-[80px] resize-y text-sm leading-relaxed"
                  />
                </div>
              </div>

              <div className="border-t border-border/50" />

              {/* Seção: Evidências */}
              <div className="space-y-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Evidências</span>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded-full">{anexos.length}/3 imagens</span>
                </div>

                {/* Element Picker */}
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-lg border-2 border-dashed transition-all text-left',
                    capturedElement
                      ? 'border-orange-300 bg-orange-50/50'
                      : 'border-muted-foreground/20 hover:border-orange-300 hover:bg-orange-50/30'
                  )}
                  onClick={startElementPicker}
                  disabled={isPickingElement}
                >
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                    capturedElement ? 'bg-orange-100' : 'bg-muted'
                  )}>
                    <Crosshair className={cn('h-4 w-4', capturedElement ? 'text-orange-600' : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium', capturedElement ? 'text-orange-700' : 'text-foreground')}>
                      {capturedElement ? 'Elemento Selecionado' : 'Selecionar Elemento'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {capturedElement
                        ? `${capturedElement.componentName || capturedElement.tagName} - ${capturedElement.dimensions}`
                        : 'Clique para apontar o elemento com problema na tela'}
                    </p>
                  </div>
                  {capturedElement && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCapturedElement(null); }}
                      className="flex-shrink-0 p-1 rounded hover:bg-orange-200/50 text-orange-400 hover:text-orange-600 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </button>

                {/* Captured Element Details */}
                {capturedElement && capturedElement.componentName && (
                  <div className="px-3 py-2 bg-orange-50 rounded-md border border-orange-100">
                    <div className="flex items-center gap-2 text-[11px]">
                      <MousePointer className="h-3 w-3 text-orange-500 flex-shrink-0" />
                      <span className="text-orange-700 font-mono truncate">{capturedElement.selector}</span>
                    </div>
                  </div>
                )}

                {/* Thumbnails dos anexos */}
                {anexos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {anexos.map((file, index) => (
                      <div
                        key={index}
                        className="relative group w-14 h-14 rounded-lg overflow-hidden border-2 border-border/50 hover:border-primary/50 cursor-pointer transition-colors"
                        onClick={() => setPreviewImage(URL.createObjectURL(file))}
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPreviewImage(URL.createObjectURL(file)); }}
                            className="p-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                          >
                            <ZoomIn className="h-3 w-3 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeAnexo(index); }}
                            className="p-1 rounded-full bg-white/20 hover:bg-red-500/80 transition-colors"
                          >
                            <Trash2 className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Botões de adicionar imagem */}
                {anexos.length < 3 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                      Imagem
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={handleScreenCapture}
                    >
                      <Camera className="h-3.5 w-3.5 mr-1.5" />
                      Screenshot
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clipboard className="h-3 w-3 flex-shrink-0" />
                  <span>Use <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Ctrl+V</kbd> para colar imagens da área de transferência</span>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </>
          )}
          </div>

          {/* Botão Enviar fixo no rodapé */}
          {!submitted && (
            <div className="p-3 border-t bg-background/95 backdrop-blur-sm">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !form.tipo || !form.titulo || !form.descricao}
                className="w-full h-10 font-medium shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Ticket
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Footer minimizado */}
      {isMinimized && (
        <div className="px-4 py-2.5 bg-muted/20 border-t text-center">
          <p className="text-[11px] text-muted-foreground">
            Clique em <Minus className="h-3 w-3 inline align-text-bottom" /> para expandir
          </p>
        </div>
      )}

      {/* Handles de redimensionamento */}
      {!isMinimized && (
        <>
          {/* Canto inferior esquerdo */}
          <div
            onMouseDown={handleResizeStart('sw')}
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize group"
          >
            <div className="absolute bottom-1 left-1 w-2 h-2 border-l-2 border-b-2 border-muted-foreground/30 group-hover:border-primary transition-colors" />
          </div>
          {/* Canto inferior direito */}
          <div
            onMouseDown={handleResizeStart('se')}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group"
          >
            <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-muted-foreground/30 group-hover:border-primary transition-colors" />
          </div>
        </>
      )}
    </div>
    </>,
    document.body
  );
}
