import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { authApi, type MeOut } from '@/integrations/api/auth';
import { ApiError } from '@/integrations/api/client';
import { loadAndApplyWhiteLabelFromDB } from '@/hooks/useWhiteLabel';

/**
 * Autenticação via backend próprio (JWT em cookie httpOnly).
 *
 * Migração Fatia 5: este hook deixou de usar `supabase.auth`. A interface
 * pública (signIn/signUp/signOut/resetPassword/user/profile/empresa/loading…)
 * foi PRESERVADA para não quebrar os consumidores.
 *
 * Funcionalidades adiadas (decisão do projeto) — hoje são stubs:
 *  - Sessão única / conflito de sessão (signIn nunca retorna sessionConflict).
 *  - Reset de senha por email (resetPassword retorna mensagem de indisponível).
 *  - Polling de módulo ativo / realtime de desativação de perfil.
 * Serão religados quando o backend tiver suporte (email/captcha/realtime).
 */

interface AuthUser {
  id: string;
  email: string | null;
  // Campos opcionais que alguns consumidores ainda leem (vinham do User do
  // Supabase). Ficam indefinidos com o backend novo até o ticket de telas (#5)
  // trocar esses usos por dados do `profile`.
  user_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  email_confirmed_at?: string;
}

interface AuthSession {
  access_token?: string;
}

interface Profile {
  id: string;
  email: string;
  nome: string;
  role: 'admin_vertical' | 'cliente_torq' | 'cliente_final' | 'empresa_parceira' | 'instrutor' | 'suporte';
  empresa_id: string | null;
  instrutor_id?: string | null;
  primeiro_acesso?: boolean;
  senha_alterada: boolean;
  ativo?: boolean;
  motivo_desativacao?: string | null;
  created_at?: string;
  setor_id?: string | null;
  grupo_acesso?: 'administrador' | 'gestor' | 'colaborador' | null;
}

interface Empresa {
  id: string;
  nome: string;
  tipo: 'vertical_on' | 'sst' | 'cliente_final' | 'empresa_parceira';
  cidade?: string | null;
  estado?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  empresa: Empresa | null;
  loading: boolean;
  signIn: (email: string, password: string, captchaToken?: string, forceLogin?: boolean) => Promise<{ error: Error | null; sessionConflict?: boolean }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, captchaToken?: string) => Promise<{ error: Error | null }>;
  checkActiveSession: (email: string) => Promise<boolean>;
  forceInvalidateSessions: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapProfile(me: MeOut): Profile | null {
  if (!me.profile) return null;
  const p = me.profile;
  return {
    id: p.id,
    email: p.email ?? me.user.email ?? '',
    nome: p.nome ?? '',
    role: (p.role as Profile['role']),
    empresa_id: p.empresa_id ?? null,
    primeiro_acesso: p.primeiro_acesso ?? undefined,
    senha_alterada: p.senha_alterada ?? false,
    ativo: p.ativo ?? undefined,
    motivo_desativacao: p.motivo_desativacao ?? null,
    setor_id: p.setor_id ?? null,
    grupo_acesso: (p.grupo_acesso as Profile['grupo_acesso']) ?? null,
  };
}

function mapEmpresa(me: MeOut): Empresa | null {
  if (!me.empresa) return null;
  const e = me.empresa;
  return {
    id: e.id,
    nome: e.nome,
    tipo: (e.tipo as Empresa['tipo']),
    cidade: e.cidade ?? null,
    estado: e.estado ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setEmpresa(null);
  }, []);

  // Carrega/restaura a sessão atual a partir do cookie httpOnly (GET /auth/me).
  const loadSession = useCallback(async (): Promise<boolean> => {
    try {
      const me = await authApi.me();
      const prof = mapProfile(me);

      // Perfil desativado → desloga.
      if (prof && prof.ativo === false) {
        await authApi.logout().catch(() => {});
        clearAuth();
        return false;
      }

      setUser({ id: me.user.id, email: me.user.email });
      setSession({});
      setProfile(prof);
      const emp = mapEmpresa(me);
      setEmpresa(emp);

      // White label da empresa (ainda via camada legada; migra no ticket de telas).
      if (prof?.empresa_id) {
        loadAndApplyWhiteLabelFromDB(prof.empresa_id, me.user.id, prof.role).catch((err) => {
          console.error('Erro ao carregar white label:', err);
        });
      }
      return true;
    } catch (err) {
      // 401 = não autenticado (normal); demais erros também limpam o estado.
      if (!(err instanceof ApiError) || err.status === 401) {
        clearAuth();
      }
      return false;
    }
  }, [clearAuth]);

  useEffect(() => {
    loadSession().finally(() => setLoading(false));
  }, [loadSession]);

  const signIn = async (
    email: string,
    password: string,
    captchaToken?: string,
    _forceLogin?: boolean,
  ): Promise<{ error: Error | null; sessionConflict?: boolean }> => {
    // captchaToken é enviado ao backend (validado quando TURNSTILE_SECRET_KEY
    // estiver configurada). forceLogin: aceito para compatibilidade — sessão
    // única foi adiada → nunca há sessionConflict.
    try {
      await authApi.login(email, password, captchaToken);
      const ok = await loadSession();
      if (!ok) {
        return { error: new Error('Não foi possível carregar a sessão.') };
      }
      return { error: null };
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return { error: new Error('Credenciais inválidas.') };
      }
      if (err instanceof ApiError && err.status === 403) {
        // 403 pode ser "usuário inativo" ou "captcha inválido" — usa a mensagem do backend.
        return { error: new Error(err.message || 'Acesso negado.') };
      }
      return { error: err instanceof Error ? err : new Error('Erro ao fazer login.') };
    }
  };

  const signUp = async (
    _email: string,
    _password: string,
    _nome: string,
  ): Promise<{ error: Error | null }> => {
    // Cadastro self-service não está disponível — usuários são criados por um
    // administrador (POST /admin/users). Mantido na interface por compatibilidade.
    return { error: new Error('Cadastro self-service indisponível. Solicite acesso ao administrador.') };
  };

  const signOut = async (): Promise<void> => {
    localStorage.removeItem('wl_config');
    localStorage.removeItem('wl_empresa_sst_id');
    try {
      await authApi.logout();
    } finally {
      clearAuth();
    }
  };

  const resetPassword = async (
    email: string,
    _captchaToken?: string,
  ): Promise<{ error: Error | null }> => {
    // Dispara o email de redefinição via Resend. O backend SEMPRE responde 204
    // (não revela se o email existe) — então só falha em erro de rede.
    try {
      await authApi.esqueciSenha(email);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Falha ao solicitar redefinição') };
    }
  };

  // Stubs de sessão única (adiada).
  const checkActiveSession = async (_email: string): Promise<boolean> => false;
  const forceInvalidateSessions = async (_email: string): Promise<void> => {};

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        empresa,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        checkActiveSession,
        forceInvalidateSessions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
