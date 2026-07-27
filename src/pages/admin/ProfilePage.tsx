// Página "Mi Perfil" — datos de la cuenta y edición del nombre.
//
// El acceso es exclusivamente con Google, así que aquí no hay gestión de
// contraseñas: el correo y las credenciales las administra Google. El rol y el
// estado los asigna un administrador; el usuario solo puede cambiar su nombre.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, ShieldCheck, Save, CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDateLong } from '@/lib/date';
import { usePageTitle } from '@/hooks/usePageTitle';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  rector: 'Rector',
  gestor: 'Gestor',
};

export default function ProfilePage() {
  usePageTitle('Mi Perfil');
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [saving, setSaving] = useState(false);

  // El perfil llega de forma asíncrona; sincroniza el campo cuando aparece.
  useEffect(() => {
    if (profile?.fullName) setFullName(profile.fullName);
  }, [profile?.fullName]);

  const dirty = fullName.trim() !== (profile?.fullName ?? '').trim();

  const handleSave = async () => {
    const nombre = fullName.trim();
    if (!nombre) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    setSaving(true);
    try {
      // Función acotada: solo cambia el nombre de la propia fila (migración 00035).
      const { error } = await supabase.rpc('update_my_full_name', {
        new_full_name: nombre,
      });
      if (error) throw error;
      await refreshProfile();
      toast.success('Perfil actualizado correctamente');
    } catch (err) {
      toast.error('No se pudo actualizar el perfil', {
        description: (err as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6 p-6 md:p-8">
        {/* Encabezado */}
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
            <h1 className="text-2xl font-bold text-balance">Mi Perfil</h1>
            <p className="text-muted-foreground text-sm text-pretty">
              Consulta los datos de tu cuenta y actualiza tu nombre
            </p>
          </div>
        </div>

        {/* Datos de la cuenta (solo lectura) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Datos de la cuenta
            </CardTitle>
            <CardDescription>
              Gestionados por el administrador y por tu cuenta institucional de Google
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Correo institucional</Label>
              <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/50 px-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{profile?.email ?? '—'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Inicias sesión con Google; el correo no puede modificarse aquí.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Rol en el sistema</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/50 px-3">
                  <Badge variant="secondary" className="text-xs">
                    {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? '—'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Lo asigna un administrador</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Estado</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3">
                  <Badge
                    className={
                      profile?.isActive
                        ? 'bg-emerald-600 hover:bg-emerald-600 text-xs'
                        : 'bg-muted-foreground hover:bg-muted-foreground text-xs'
                    }
                  >
                    {profile?.isActive ? 'Activa' : 'Pendiente'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Cuenta creada</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/50 px-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{formatDateLong(profile?.createdAt ?? null)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Última actualización</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/50 px-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{formatDateLong(profile?.updatedAt ?? null)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información personal (editable) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Información personal
            </CardTitle>
            <CardDescription>Así aparece tu nombre en el sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="full-name" className="text-sm font-normal">
                Nombre completo
              </Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre y apellido"
                maxLength={120}
              />
            </div>
            <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
