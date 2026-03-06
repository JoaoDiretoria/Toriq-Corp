/**
 * Utilitários para conversão e manipulação de cores
 * 
 * Funções para converter cores entre formatos (HEX, HSL)
 * usadas pelo sistema White Label.
 */

import type { HSLColor } from '@/types/whiteLabel';

/**
 * Converte uma cor hexadecimal para HSL
 * @param hex - Cor em formato hexadecimal (#RRGGBB ou RRGGBB)
 * @returns Objeto HSL ou null se inválido
 */
export function hexToHSL(hex: string): HSLColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Formata um objeto HSL para string CSS (sem hsl())
 * @param hsl - Objeto com valores h, s, l
 * @returns String no formato "H S% L%"
 */
export function formatHSL(hsl: HSLColor): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Clareia uma cor HSL
 * @param hsl - Cor original
 * @param amount - Quantidade para clarear (0-100)
 * @returns Nova cor HSL mais clara
 */
export function lightenColor(hsl: HSLColor, amount: number): HSLColor {
  return {
    ...hsl,
    l: Math.min(hsl.l + amount, 100),
  };
}

/**
 * Escurece uma cor HSL
 * @param hsl - Cor original
 * @param amount - Quantidade para escurecer (0-100)
 * @returns Nova cor HSL mais escura
 */
export function darkenColor(hsl: HSLColor, amount: number): HSLColor {
  return {
    ...hsl,
    l: Math.max(hsl.l - amount, 0),
  };
}

/**
 * Converte HSL para string CSS completa
 * @param hsl - Objeto HSL
 * @returns String no formato "hsl(H, S%, L%)"
 */
export function hslToCSS(hsl: HSLColor): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

/**
 * Converte HSL de volta para HEX
 * @param hsl - Objeto HSL
 * @returns String hexadecimal (#RRGGBB)
 */
export function hslToHex(hsl: HSLColor): string {
  const { h, s, l } = hsl;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Valida se uma string é uma cor hexadecimal válida
 * @param hex - String para validar
 * @returns true se for uma cor hex válida
 */
export function isValidHex(hex: string): boolean {
  return /^#?([a-f\d]{3}|[a-f\d]{6})$/i.test(hex);
}

/**
 * Normaliza uma cor hex para o formato #RRGGBB
 * @param hex - Cor hex em qualquer formato
 * @returns Cor normalizada ou null se inválida
 */
export function normalizeHex(hex: string): string | null {
  if (!isValidHex(hex)) return null;
  
  let normalized = hex.startsWith('#') ? hex : `#${hex}`;
  
  // Expande formato curto (#RGB -> #RRGGBB)
  if (normalized.length === 4) {
    normalized = `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }
  
  return normalized.toUpperCase();
}
