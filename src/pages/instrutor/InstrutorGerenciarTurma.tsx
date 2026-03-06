import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import GerenciarTurma from '@/pages/modulos/GerenciarTurma';
import { AccessDenied } from '@/components/shared/AccessDenied';

const InstrutorGerenciarTurma = () => {
  const { turmaId } = useParams<{ turmaId: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!turmaId || !user || !profile) {
        setCheckingAccess(false);
        return;
      }

      try {
        const db = supabase as any;
        
        // Buscar a turma para verificar instrutor_id e empresa_id
        const { data: turma, error } = await db
          .from('turmas_treinamento')
          .select('id, instrutor_id, empresa_id')
          .eq('id', turmaId)
          .single();

        if (error || !turma) {
          setHasAccess(false);
          setCheckingAccess(false);
          return;
        }

        // Verificar se é o instrutor vinculado à turma
        if (profile.role === 'instrutor') {
          // Buscar o instrutor vinculado ao usuário
          const { data: instrutor } = await db
            .from('instrutores')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (instrutor && turma.instrutor_id === instrutor.id) {
            setHasAccess(true);
            setCheckingAccess(false);
            return;
          }
        }

        // Verificar se é a empresa SST que criou a turma
        if (profile.role === 'empresa_sst' && profile.empresa_id === turma.empresa_id) {
          setHasAccess(true);
          setCheckingAccess(false);
          return;
        }

        // Verificar se é admin_vertical (pode acessar tudo)
        if (profile.role === 'admin_vertical') {
          setHasAccess(true);
          setCheckingAccess(false);
          return;
        }

        // Não tem acesso
        setHasAccess(false);
        setCheckingAccess(false);
      } catch (err) {
        console.error('Erro ao verificar acesso:', err);
        setHasAccess(false);
        setCheckingAccess(false);
      }
    };

    if (!authLoading && user && profile) {
      checkAccess();
    } else if (!authLoading) {
      setCheckingAccess(false);
    }
  }, [turmaId, user, profile, authLoading]);

  // Mostrar loading enquanto verifica autenticação ou acesso
  if (authLoading || checkingAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirecionar para login se não estiver autenticado
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!turmaId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Turma não encontrada</p>
      </div>
    );
  }

  // Mostrar mensagem de acesso negado
  if (!hasAccess) {
    return <AccessDenied />;
  }

  return (
    <GerenciarTurma 
      turmaIdProp={turmaId} 
      isInstrutorMode={true}
    />
  );
};

export default InstrutorGerenciarTurma;
