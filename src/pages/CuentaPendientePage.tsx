// Aviso mostrado a los usuarios que iniciaron sesión pero cuya cuenta todavía
// no ha sido aprobada por un administrador (internal_users.is_active = false).
// Réplica del mensaje "Tu cuenta está pendiente" de CampusNOVA/DocuNOVA.
//
// A diferencia del comportamiento anterior (expulsar al login con ?inactivo=1),
// aquí el usuario conserva la sesión y ve una explicación de qué falta. El
// segundo factor NO se exige mientras la cuenta esté pendiente.
import { Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { LOGO_URL } from '@/lib/assets';

export default function CuentaPendientePage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <img src={LOGO_URL} alt="CrediNOVA" className="h-14 w-auto" />

          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
            <Clock className="h-8 w-8 text-secondary" />
          </div>

          <h1 className="text-2xl font-bold text-foreground text-balance">
            Tu cuenta está pendiente
          </h1>

          <p className="text-pretty text-muted-foreground">
            Tu cuenta institucional se registró correctamente, pero todavía debe
            ser aprobada por el administrador antes de que puedas acceder a
            CrediNOVA.
          </p>

          <div className="w-full rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground text-pretty">
            El administrador revisará tu registro y te asignará un rol. Cuando tu
            cuenta esté activa podrás iniciar sesión con normalidad y configurar
            la verificación en dos pasos.
          </div>

          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
