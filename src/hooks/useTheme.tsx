import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  /** Define o "dono" da preferência (id do usuário logado, ou 'guest'). */
  setScope: (scope: string) => void;
}

const KEY_PREFIX = 'toriq-theme';
const keyFor = (scope: string) => `${KEY_PREFIX}:${scope}`;

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readTheme(scope: string): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(keyFor(scope));
  if (stored === 'light' || stored === 'dark') return stored;
  // Sem preferência salva para este usuário → respeita o SO (senão light).
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Antes do login, a preferência é a do 'guest' (por dispositivo).
  const [scope, setScopeState] = useState<string>('guest');
  const [theme, setThemeState] = useState<Theme>(() => readTheme('guest'));

  // Ao trocar de usuário (login/logout/troca), carrega a preferência DAQUELE
  // usuário. É isto que torna o dark mode individual: o usuário B nunca herda
  // a escolha do usuário A, mesmo no mesmo navegador.
  useEffect(() => {
    setThemeState(readTheme(scope));
  }, [scope]);

  // Aplica a classe .dark sempre que o tema muda (sem persistir aqui).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Persistência é por usuário e SÓ em ação explícita (toggle/set).
  const persist = (next: Theme) => {
    try {
      window.localStorage.setItem(keyFor(scope), next);
    } catch {
      /* localStorage indisponível — ignora */
    }
  };

  const setTheme = (next: Theme) => {
    persist(next);
    setThemeState(next);
  };

  const toggleTheme = () =>
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      persist(next);
      return next;
    });

  const setScope = useCallback((s: string) => setScopeState(s || 'guest'), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, setScope }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>');
  return ctx;
}

/**
 * Liga a preferência de tema ao usuário logado: cada usuário tem a sua
 * (chave `toriq-theme:<userId>` no localStorage). Deve ficar DENTRO do
 * AuthProvider. Sem isto, o tema seria apenas por-dispositivo e dois usuários
 * no mesmo navegador compartilhariam a escolha.
 */
export function ThemeUserBridge() {
  const { setScope } = useTheme();
  const { user } = useAuth();
  const userId = user?.id ?? 'guest';
  useEffect(() => {
    setScope(userId);
  }, [userId, setScope]);
  return null;
}
