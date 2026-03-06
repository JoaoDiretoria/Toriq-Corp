import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function Logout() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const doLogout = async () => {
      await signOut();
      navigate('/auth');
    };
    doLogout();
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Saindo...</p>
      </div>
    </div>
  );
}
