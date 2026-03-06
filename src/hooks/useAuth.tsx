import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logAccess } from '@/lib/accessLog';
import { loadAndApplyWhiteLabelFromDB } from '@/hooks/useWhiteLabel';

// Gerar um token único para esta sessão do navegador
// Usando localStorage para persistir entre abas e recarregamentos
const generateSessionToken = () => {
  const existingToken = localStorage.getItem('vertical_session_token');
  if (existingToken) return existingToken;
  
  const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem('vertical_session_token', token);
  return token;
};

interface Profile {
  id: string;
  email: string;
  nome: string;
  role: 'admin_vertical' | 'empresa_sst' | 'cliente_final' | 'empresa_parceira' | 'instrutor';
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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionToken = useRef<string>(generateSessionToken());

  const fetchProfile = async (userId: string): Promise<boolean> => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return false;
    }

    if (profileData) {
      // Verificar se o usuário está ativo
      const profileAny = profileData as any;
      if (profileAny.ativo === false) {
        // Usuário desativado - fazer logout
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setEmpresa(null);
        return false;
      }

      let profileWithInstrutor = profileData as Profile;
      const role = profileData.role as string;

      // Se for instrutor, buscar o instrutor_id
      if (role === 'instrutor') {
        const { data: instrutorData, error: instrutorError } = await (supabase as any)
          .from('instrutores')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (instrutorData) {
          profileWithInstrutor = {
            ...profileWithInstrutor,
            instrutor_id: instrutorData.id
          };
        }
      }

      setProfile(profileWithInstrutor);

      if (profileData.empresa_id) {
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', profileData.empresa_id)
          .maybeSingle();

        if (empresaData) {
          setEmpresa(empresaData as Empresa);
        }

        // Carregar e aplicar white label da empresa SST pai
        // Isso garante que o tema seja aplicado automaticamente ao logar
        // Passa userId e role para busca correta (especialmente para instrutores)
        loadAndApplyWhiteLabelFromDB(
          profileData.empresa_id, 
          userId, 
          profileData.role
        ).catch(err => {
          console.error('Erro ao carregar white label:', err);
        });
      }
      return true;
    }
    return false;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Se o token expirou ou foi invalidado, limpar a sessão
        if (event === 'TOKEN_REFRESHED' && !session) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setEmpresa(null);
          setLoading(false);
          return;
        }

        // Se o usuário foi deslogado, limpar tudo
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setEmpresa(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setEmpresa(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Tratar erro de refresh_token_not_found
      if (error) {
        const isRefreshTokenError = 
          error.message?.includes('refresh_token_not_found') || 
          (error as any).code === 'refresh_token_not_found';
        
        // Se o erro for de token inválido, limpar localStorage
        if (isRefreshTokenError) {
          // Limpar todos os tokens do Supabase no localStorage
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
          setSession(null);
          setUser(null);
          setProfile(null);
          setEmpresa(null);
          setLoading(false);
          return;
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscription para monitorar desativação do profile em tempo real
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          const newData = payload.new as any;
          // Se o usuário foi desativado, fazer logout
          if (newData.ativo === false) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
            setEmpresa(null);
            // Redirecionar para login com mensagem
            window.location.href = '/auth?message=' + encodeURIComponent(newData.motivo_desativacao || 'Seu acesso foi desativado.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Polling para verificar se o módulo Toriq Training está ativo (para instrutores/parceiras/clientes)
  useEffect(() => {
    if (!user?.id || !profile) return;
    
    const role = profile.role as string;
    if (role !== 'instrutor' && role !== 'empresa_parceira' && role !== 'cliente_final') return;

    // Função para verificar se o módulo Toriq Training está ativo
    const verificarModuloAtivo = async () => {
      let empresaSstId: string | null = null;
      
      if (role === 'instrutor') {
        const { data: instrutorData } = await (supabase as any)
          .from('instrutores')
          .select('empresa_id')
          .eq('user_id', user.id)
          .maybeSingle();
        empresaSstId = instrutorData?.empresa_id;
      } else if (role === 'empresa_parceira') {
        const { data: parceiraData } = await (supabase as any)
          .from('empresas_parceiras')
          .select('empresa_sst_id')
          .eq('responsavel_id', user.id)
          .maybeSingle();
        empresaSstId = parceiraData?.empresa_sst_id;
      } else if (role === 'cliente_final') {
        // Buscar pela empresa do cliente (cliente_empresa_id)
        if (profile.empresa_id) {
          const { data: clienteData } = await (supabase as any)
            .from('clientes_sst')
            .select('empresa_sst_id')
            .eq('cliente_empresa_id', profile.empresa_id)
            .maybeSingle();
          empresaSstId = clienteData?.empresa_sst_id;
        }
      }
      
      if (!empresaSstId) return;
      
      // Verificar se o módulo Toriq Training está ativo
      const { data: moduloToriqTraining } = await (supabase as any)
        .from('modulos')
        .select('id')
        .eq('nome', 'Toriq Training')
        .maybeSingle();
      
      if (!moduloToriqTraining) return;
      
      const { data: moduloData } = await (supabase as any)
        .from('empresas_modulos')
        .select('id')
        .eq('empresa_id', empresaSstId)
        .eq('modulo_id', moduloToriqTraining.id)
        .eq('ativo', true)
        .maybeSingle();
      
      // Se o módulo não está ativo, fazer logout
      if (!moduloData) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setEmpresa(null);
        window.location.href = '/auth?message=' + encodeURIComponent('O módulo de treinamentos foi desativado. Entre em contato com o administrador.');
      }
    };

    // Verificar a cada 5 segundos se o módulo ainda está ativo
    const interval = setInterval(verificarModuloAtivo, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.id, profile?.role]);

  // Verificar se a sessão ainda é válida (não foi derrubada por outro login)
  useEffect(() => {
    if (!user?.id) {
      // Limpar intervalo se não há usuário
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
      return;
    }

    let isRedirecting = false;

    // Contador de falhas consecutivas para evitar logout por instabilidade de rede
    let falhasConsecutivas = 0;
    const MAX_FALHAS = 3;

    const verificarSessaoValida = async () => {
      // Evitar múltiplas execuções se já está redirecionando
      if (isRedirecting) return;
      
      // Se não tem token de sessão, tentar recuperar do localStorage
      if (!currentSessionToken.current) {
        const storedToken = localStorage.getItem('vertical_session_token');
        if (storedToken) {
          currentSessionToken.current = storedToken;
        } else {
          // Sem token, não verificar
          return;
        }
      }
      
      try {
        const { data, error } = await (supabase as any).rpc('verificar_sessao_valida', {
          p_user_id: user.id,
          p_session_token: currentSessionToken.current
        });

        // Se houve erro na RPC, ignorar (não deslogar por erro de rede)
        if (error) {
          console.warn('Erro ao verificar sessão (ignorando):', error.message);
          falhasConsecutivas++;
          // Só deslogar se tiver muitas falhas consecutivas
          if (falhasConsecutivas < MAX_FALHAS) {
            return;
          }
        } else {
          // Reset contador de falhas em caso de sucesso
          falhasConsecutivas = 0;
        }

        // Se a sessão foi explicitamente invalidada (data === false E não houve erro)
        // Também verificar se data é exatamente false (não null/undefined)
        if (data === false && !error) {
          isRedirecting = true;
          console.log('Sessão invalidada - outro login detectado');
          
          // Parar o intervalo imediatamente
          if (sessionCheckIntervalRef.current) {
            clearInterval(sessionCheckIntervalRef.current);
            sessionCheckIntervalRef.current = null;
          }
          
          // Limpar localStorage do token de sessão
          localStorage.removeItem('vertical_session_token');
          
          // Limpar todos os tokens do Supabase no localStorage
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) {
              localStorage.removeItem(key);
            }
          });
          
          // Limpar estado local primeiro
          setSession(null);
          setUser(null);
          setProfile(null);
          setEmpresa(null);
          
          // Forçar redirecionamento imediato (sem await no signOut)
          supabase.auth.signOut().finally(() => {
            window.location.href = '/auth?message=' + encodeURIComponent('Sua sessão foi encerrada porque outro login foi realizado com esta conta.');
          });
          
          // Fallback - redirecionar mesmo se signOut demorar
          setTimeout(() => {
            window.location.href = '/auth?message=' + encodeURIComponent('Sua sessão foi encerrada porque outro login foi realizado com esta conta.');
          }, 500);
        }
      } catch (err) {
        // Ignorar erros silenciosamente - não deslogar por erro de rede
        console.warn('Erro ao verificar sessão (catch):', err);
        falhasConsecutivas++;
      }
    };

    // Verificar a cada 60 segundos (aumentado de 30s para reduzir carga)
    sessionCheckIntervalRef.current = setInterval(verificarSessaoValida, 60000);

    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
  }, [user?.id]);

  // Verificar se existe sessão ativa para um email
  const checkActiveSession = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await (supabase as any).rpc('verificar_sessao_ativa_por_email', {
        p_email: email
      });
      return data === true;
    } catch (err) {
      console.error('Erro ao verificar sessão ativa:', err);
      return false;
    }
  };

  // Forçar invalidação de todas as sessões de um usuário
  const forceInvalidateSessions = async (email: string): Promise<void> => {
    try {
      await (supabase as any).rpc('invalidar_todas_sessoes_por_email', {
        p_email: email
      });
    } catch (err) {
      console.error('Erro ao invalidar sessões:', err);
    }
  };

  const signIn = async (email: string, password: string, captchaToken?: string, forceLogin?: boolean): Promise<{ error: Error | null; sessionConflict?: boolean }> => {
    // Se não é forceLogin, verificar se existe sessão ativa
    if (!forceLogin) {
      const hasActiveSession = await checkActiveSession(email);
      if (hasActiveSession) {
        return { error: null, sessionConflict: true };
      }
    } else {
      // Se é forceLogin, invalidar todas as sessões anteriores
      await forceInvalidateSessions(email);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    
    // Registrar log de login após sucesso
    if (!error && data.user) {
      // Buscar dados do profile para verificar se está ativo
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('nome, empresa_id, ativo, motivo_desativacao, role')
        .eq('id', data.user.id)
        .maybeSingle();
      
      // Verificar se o usuário está ativo (campo ativo do profile)
      if (profileData?.ativo === false) {
        // Usuário desativado - fazer logout e retornar erro
        await supabase.auth.signOut();
        const motivo = profileData.motivo_desativacao || 'Seu acesso foi desativado. Entre em contato com o administrador.';
        return { error: new Error(motivo) };
      }
      
      // Para instrutores, empresa_parceira e cliente_final: verificar se a empresa SST tem o módulo ativo
      const role = profileData?.role as string;
      if (role === 'instrutor' || role === 'empresa_parceira' || role === 'cliente_final') {
        // Buscar a empresa SST do instrutor/parceira/cliente através da tabela correspondente
        let empresaSstId: string | null = null;
        
        if (role === 'instrutor') {
          // Buscar empresa_id do instrutor na tabela instrutores
          const { data: instrutorData } = await (supabase as any)
            .from('instrutores')
            .select('empresa_id, ativo')
            .eq('user_id', data.user.id)
            .maybeSingle();
          
          // Verificar se o instrutor está ativo na página de instrutores
          if (instrutorData?.ativo === false) {
            await supabase.auth.signOut();
            return { error: new Error('Seu acesso de instrutor foi desativado. Entre em contato com a empresa.') };
          }
          
          empresaSstId = instrutorData?.empresa_id;
        } else if (role === 'empresa_parceira') {
          // Buscar empresa_sst_id da empresa parceira
          const { data: parceiraData } = await (supabase as any)
            .from('empresas_parceiras')
            .select('empresa_sst_id, ativo')
            .eq('responsavel_id', data.user.id)
            .maybeSingle();
          
          // Verificar se a empresa parceira está ativa
          if (parceiraData?.ativo === false) {
            await supabase.auth.signOut();
            return { error: new Error('Sua empresa parceira foi desativada. Entre em contato com a empresa SST.') };
          }
          
          empresaSstId = parceiraData?.empresa_sst_id;
        } else if (role === 'cliente_final') {
          // Buscar empresa_sst_id do cliente final usando cliente_empresa_id
          if (profileData?.empresa_id) {
            const { data: clienteData } = await (supabase as any)
              .from('clientes_sst')
              .select('empresa_sst_id')
              .eq('cliente_empresa_id', profileData.empresa_id)
              .maybeSingle();
            
            empresaSstId = clienteData?.empresa_sst_id;
          }
        }
        
        // Verificar se a empresa SST tem o módulo Toriq Training ativo
        if (empresaSstId) {
          // Buscar o ID do módulo Toriq Training primeiro
          const { data: moduloToriqTraining } = await (supabase as any)
            .from('modulos')
            .select('id')
            .eq('nome', 'Toriq Training')
            .maybeSingle();
          
          if (moduloToriqTraining) {
            // Verificar se existe o registro do módulo ativo para a empresa
            const { data: moduloAtivo } = await (supabase as any)
              .from('empresas_modulos')
              .select('id, ativo')
              .eq('empresa_id', empresaSstId)
              .eq('modulo_id', moduloToriqTraining.id)
              .maybeSingle();
            
            // Se não existe registro ou não está ativo, bloquear
            if (!moduloAtivo || moduloAtivo.ativo !== true) {
              await supabase.auth.signOut();
              return { error: new Error('O módulo de treinamentos não está ativo para esta empresa. Entre em contato com o administrador.') };
            }
          }
        }
      }
      
      if (profileData?.empresa_id) {
        logAccess(
          profileData.empresa_id,
          data.user.id,
          email,
          profileData.nome || null,
          {
            acao: 'login',
            modulo: 'Autenticação',
            pagina: 'Login',
            descricao: 'Usuário realizou login no sistema'
          }
        );
      }
      
      // Registrar sessão única - invalida sessões anteriores
      try {
        // Gerar novo token de sessão para este login
        const newSessionToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('vertical_session_token', newSessionToken);
        currentSessionToken.current = newSessionToken;
        
        await (supabase as any).rpc('registrar_sessao', {
          p_user_id: data.user.id,
          p_session_token: newSessionToken,
          p_dispositivo: navigator.platform || 'Desconhecido',
          p_navegador: navigator.userAgent,
          p_ip_address: null // IP será capturado pelo servidor se necessário
        });
      } catch (sessionError) {
        console.error('Erro ao registrar sessão:', sessionError);
        // Não bloquear login se falhar o registro de sessão
      }
    }
    
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Limpar white label ao fazer logout
    localStorage.removeItem('wl_config');
    localStorage.removeItem('wl_empresa_sst_id');
    
    // Registrar log de logout antes de sair
    if (profile?.empresa_id && user) {
      await logAccess(
        profile.empresa_id,
        user.id,
        user.email || null,
        profile.nome || null,
        {
          acao: 'logout',
          modulo: 'Autenticação',
          pagina: 'Logout',
          descricao: 'Usuário realizou logout do sistema'
        }
      );
    }
    
    await supabase.auth.signOut();
    setProfile(null);
    setEmpresa(null);
  };

  const resetPassword = async (email: string, captchaToken?: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
      captchaToken,
    });
    return { error: error as Error | null };
  };

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
