import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MfaGuard } from '@/components/auth/MfaGuard';
import CuentaPendientePage from '@/pages/CuentaPendientePage';

interface Props {
  children: React.ReactNode;
}

/**
 * Guard para rutas administrativas.
 *
 * Requiere, en orden:
 *   1. Sesión activa en Supabase (login con Google).
 *   2. Perfil en `internal_users` existente y activo.
 *   3. Segundo factor verificado (sesión en AAL2) — vía MfaGuard.
 *
 * Sin sesión → /admin/login. Cuenta pendiente de aprobación → pantalla
 * informativa (CuentaPendientePage), conservando la sesión y SIN exigir el
 * segundo factor: no tiene sentido pedir el 2FA a quien todavía no tiene acceso.
 * Se configura cuando el administrador activa la cuenta.
 */
export default function AdminProtectedRoute({ children }: Props) {
  const { user, profile, isActive, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Perfil inexistente (no provisionado) o inactivo → pendiente de activación.
  if (!profile || !isActive) {
    return <CuentaPendientePage />;
  }

  return <MfaGuard>{children}</MfaGuard>;
}
