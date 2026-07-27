import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { LOGO_URL } from '@/lib/assets';

export default function AdminLoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithGoogle, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Aviso por dominio no permitido. Las cuentas pendientes de aprobación ya no
  // se expulsan aquí: conservan la sesión y ven CuentaPendientePage.
  useEffect(() => {
    if (searchParams.get('error') === 'domain') {
      toast.error('Solo se permite el acceso con cuentas @cotecnova.edu.co.');
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
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardContent className="flex flex-col items-center gap-6 p-8 md:p-10">
          <img src={LOGO_URL} alt="CrediNOVA" className="h-20 w-auto" />

          <p className="text-center text-muted-foreground text-pretty">
            Sistema de gestión de solicitudes de crédito educativo de COTECNOVA.
          </p>

          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || authLoading}
          >
            {googleLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirigiendo a Google…</>
              : 'Iniciar sesión con Google'}
          </Button>

          <p className="text-center text-sm text-muted-foreground text-pretty">
            El acceso está restringido a correos @cotecnova.edu.co y requiere
            verificación en dos pasos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
