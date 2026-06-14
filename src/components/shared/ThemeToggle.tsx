import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

/**
 * Botão de alternância de tema (claro/escuro).
 * Usa os tokens semânticos do design system — funciona em qualquer superfície.
 * `iconOnly` renderiza só o ícone (para sidebars recolhidas).
 */
export function ThemeToggle({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Ativar tema claro' : 'Ativar tema escuro';

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${className ?? ''}`}
        onClick={toggleTheme}
        aria-label={label}
        title={label}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={`w-full justify-start ${className ?? ''}`}
      onClick={toggleTheme}
      aria-label={label}
    >
      {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
      {isDark ? 'Tema claro' : 'Tema escuro'}
    </Button>
  );
}
