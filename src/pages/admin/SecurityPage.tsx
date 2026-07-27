// Página "Verificación en dos pasos" — gestión del segundo factor (TOTP).
// Réplica de la SeguridadPage de CampusNOVA: muestra el estado del 2FA y
// permite reconfigurarlo cuando se cambia de teléfono.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MfaEnrollCard } from '@/components/auth/MfaEnrollCard';
import { listVerifiedTotpFactors, unenrollTotp } from '@/lib/mfa';
import { usePageTitle } from '@/hooks/usePageTitle';

type View = 'loading' | 'active' | 'configure';

export default function SecurityPage() {
  usePageTitle('Verificación en dos pasos');
  const navigate = useNavigate();
  const [view, setView] = useState<View>('loading');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const factors = await listVerifiedTotpFactors();
      setView(factors.length > 0 ? 'active' : 'configure');
    } catch {
      setView('configure');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const reconfigure = async () => {
    setConfirmOpen(false);
    setBusy(true);
    try {
      // Se eliminan los factores verificados para poder enrolar el dispositivo
      // nuevo. La sesión actual ya está en AAL2, así que no se pierde el acceso.
      const factors = await listVerifiedTotpFactors();
      for (const f of factors) await unenrollTotp(f.id);
      setView('configure');
    } catch (err) {
      toast.error('No se pudo reconfigurar', { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-balance flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Verificación en dos pasos
            </h1>
            <p className="text-muted-foreground text-sm text-pretty">
              Añade una capa extra de seguridad con Google Authenticator
            </p>
          </div>
        </div>

        {view === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        )}

        {view === 'active' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Estado</CardTitle>
                <Badge className="bg-emerald-600 hover:bg-emerald-600">Activa</Badge>
              </div>
              <CardDescription className="text-pretty">
                Tu cuenta está protegida con verificación en dos pasos. Se te pide un
                código de Google Authenticator al iniciar sesión.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground text-pretty">
                ¿Cambiaste de teléfono o perdiste el acceso a la app? Reconfigura la
                verificación para escanear un código QR nuevo.
              </p>
              <Button variant="outline" onClick={() => setConfirmOpen(true)} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reconfigurar (nuevo dispositivo)
              </Button>
            </CardContent>
          </Card>
        )}

        {view === 'configure' && (
          <MfaEnrollCard
            onEnrolled={() => {
              toast.success('Verificación en dos pasos activada');
              refresh();
            }}
          />
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reconfigurar la verificación en dos pasos?</AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              Se desvinculará el dispositivo actual y tendrás que escanear un código QR
              nuevo con Google Authenticator. Si no completas la configuración, en el
              próximo inicio de sesión se te pedirá hacerlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={reconfigure}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
