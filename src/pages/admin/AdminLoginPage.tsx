import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { LOGO_URL } from '@/lib/assets';
import { SESSION_EXPIRED_PARAM, SESSION_MAX_HOURS } from '@/lib/session-policy';

/** Logo de Google (multicolor) para el botón de inicio de sesión. */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithGoogle, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Avisos por parámetros de URL (cuenta inactiva o dominio no permitido).
  useEffect(() => {
    if (searchParams.get('inactivo') === '1') {
      toast.warning('Tu cuenta aún no ha sido activada. Contacta al administrador.');
    }
    if (searchParams.get('error') === 'domain') {
      toast.error('Solo se permite el acceso con cuentas @cotecnova.edu.co.');
    }
    if (searchParams.get(SESSION_EXPIRED_PARAM) === '1') {
      toast.info(
        `Tu sesión caducó. Por seguridad dura como máximo ${SESSION_MAX_HOURS} ` +
        'horas, así que hay que iniciar sesión de nuevo cada día.',
        { duration: 10000 },
      );
    }
  }, [searchParams]);

  // Si ya hay sesión, ir al panel (el flujo de MFA se resuelve en /auth/callback
  // y en el guard de rutas protegidas).
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error('No se pudo iniciar sesión con Google. Intenta de nuevo.');
      setGoogleLoading(false);
    }
    // Si no hay error, Supabase redirige automáticamente a Google.
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + título */}
        <div className="text-center mb-8 space-y-3">
          <img src={LOGO_URL} alt="CrediNOVA" className="h-16 w-auto mx-auto" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance">
              Acceso Administrativo
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-pretty">
              Ingrese con su cuenta institucional para continuar
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium text-balance">Iniciar sesión</CardTitle>
            <CardDescription className="text-pretty">
              Acceso exclusivo para el personal de COTECNOVA
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              type="button"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || authLoading}
            >
              {googleLoading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirigiendo a Google…</>
                : <><GoogleGlyph />Iniciar sesión con Google</>}
            </Button>
            <p className="text-center text-xs text-muted-foreground text-pretty">
              El acceso está restringido a correos @cotecnova.edu.co y requiere
              verificación en dos pasos (Google Authenticator).
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground text-pretty">
          Si no tiene acceso, comuníquese con el administrador del sistema.
        </p>
      </div>
    </div>
  );
}
