import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUserSync } from '@/services/auth';
import { supabase } from '@/lib/supabase';

interface Props {
  children: React.ReactNode;
}

/**
 * Guard para rutas administrativas.
 * Verifica que exista sesión activa en Supabase y perfil en internal_users.
 * Si no hay sesión, redirige a /admin/login.
 */
export default function AdminProtectedRoute({ children }: Props) {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      // 1. Verificación rápida por localStorage
      const cached = getCurrentUserSync();
      if (!cached) {
        if (!cancelled) setStatus('denied');
        return;
      }

      // 2. Verificación real de sesión Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setStatus('denied');
        return;
      }

      // 3. Confirmar que el perfil sigue activo en BD
      const { data: profile } = await supabase
        .from('internal_users')
        .select('is_active, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!cancelled) {
        setStatus(profile?.is_active ? 'ok' : 'denied');
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
