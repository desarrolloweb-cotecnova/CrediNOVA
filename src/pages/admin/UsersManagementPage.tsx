import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Plus, Pencil, Trash2, UserPlus, Users,
  ShieldCheck, ShieldOff, Shield, KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { getCurrentUserSync } from '@/services/auth';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserMfa,
  type InternalUser,
  type CreateUserData,
  type UpdateUserData,
} from '@/services/users';

// ── Constantes ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'outline';
  description: string;
  permissions: string[];
}> = {
  admin: {
    label: 'Administrador',
    variant: 'secondary',
    description: 'Acceso total al sistema. Gestiona usuarios, configuración y todos los módulos.',
    permissions: [
      'Ver y gestionar todas las solicitudes',
      'Gestionar usuarios y permisos',
      'Acceder a reportes y estadísticas',
      'Configurar costos, programas y correo',
      'Monitoreo del sistema',
    ],
  },
  rector: {
    label: 'Rector',
    variant: 'default',
    description: 'Puede aprobar o rechazar solicitudes de eliminación y revisar solicitudes.',
    permissions: [
      'Ver y gestionar todas las solicitudes',
      'Aprobar o rechazar eliminaciones',
      'Acceder a reportes y estadísticas',
      'Ver configuración (lectura)',
    ],
  },
  gestor: {
    label: 'Gestor',
    variant: 'outline',
    description: 'Gestiona solicitudes de crédito: revisión, aprobación y seguimiento.',
    permissions: [
      'Ver y procesar solicitudes de crédito',
      'Actualizar estados de solicitudes',
      'Acceder a reportes',
    ],
  },
};

function getRoleLabel(role: string) { return ROLE_CONFIG[role]?.label ?? role; }
function getRoleVariant(role: string) { return ROLE_CONFIG[role]?.variant ?? 'outline'; }

// ── Componente principal ──────────────────────────────────────────────────────

export default function UsersManagementPage() {
  usePageTitle('Gestión de Usuarios');
  const navigate = useNavigate();
  const [isLoading, setIsLoading]       = useState(true);
  const [users, setUsers]               = useState<InternalUser[]>([]);
  const [showCreate, setShowCreate]     = useState(false);
  const [showEdit, setShowEdit]         = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const [showResetMfa, setShowResetMfa] = useState(false);
  const [selected, setSelected]         = useState<InternalUser | null>(null);
  const [isSaving, setIsSaving]         = useState(false);

  const [createForm, setCreateForm] = useState<CreateUserData>({
    email: '', full_name: '', role: 'gestor', password: '',
  });

  const [editForm, setEditForm] = useState<UpdateUserData & { email: string }>({
    full_name: '', email: '', role: 'gestor', is_active: true,
  });

  useEffect(() => {
    // Verificar rol directamente desde localStorage (sync, sin llamada a BD)
    const currentUser = getCurrentUserSync();
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'rector') {
      toast.error('Acceso restringido. Solo el Administrador puede gestionar usuarios.');
      navigate('/admin/dashboard');
      return;
    }
    loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);
    const { data, error } = await getAllUsers();
    if (error) { toast.error('Error al cargar usuarios'); }
    else { setUsers(data ?? []); }
    setIsLoading(false);
  }

  // ── Crear ─────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!createForm.email || !createForm.full_name || !createForm.password) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }
    if (createForm.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setIsSaving(true);
    const { error } = await createUser(createForm);
    setIsSaving(false);
    if (error) { toast.error(error.message || 'Error al crear usuario'); return; }
    toast.success('Usuario creado correctamente');
    setShowCreate(false);
    setCreateForm({ email: '', full_name: '', role: 'gestor', password: '' });
    loadUsers();
  }

  // ── Editar ────────────────────────────────────────────────────────────────

  function openEdit(user: InternalUser) {
    setSelected(user);
    setEditForm({ full_name: user.full_name, email: user.email, role: user.role, is_active: user.is_active });
    setShowEdit(true);
  }

  async function handleUpdate() {
    if (!selected || !editForm.full_name || !editForm.email) {
      toast.error('El nombre y el correo son obligatorios');
      return;
    }
    setIsSaving(true);
    const { error } = await updateUser(selected.id, editForm);
    setIsSaving(false);
    if (error) { toast.error(error.message || 'Error al actualizar usuario'); return; }
    toast.success('Usuario actualizado correctamente');
    setShowEdit(false);
    setSelected(null);
    loadUsers();
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  function openDelete(user: InternalUser) {
    setSelected(user);
    setShowDelete(true);
  }

  async function handleDelete() {
    if (!selected) return;
    setIsSaving(true);
    const { error } = await deleteUser(selected.id);
    setIsSaving(false);
    if (error) { toast.error('Error al eliminar usuario'); return; }
    toast.success('Usuario eliminado');
    setShowDelete(false);
    setSelected(null);
    loadUsers();
  }

  // ── Restablecer verificación en dos pasos ─────────────────────────────────

  function openResetMfa(user: InternalUser) {
    setSelected(user);
    setShowResetMfa(true);
  }

  async function handleResetMfa() {
    if (!selected) return;
    setIsSaving(true);
    const { success, removedFactors, error } = await resetUserMfa(selected.id);
    setIsSaving(false);
    if (!success) {
      toast.error(error?.message || 'No se pudo restablecer la verificación en dos pasos');
      return;
    }
    toast.success(
      removedFactors && removedFactors > 0
        ? 'Verificación en dos pasos restablecida'
        : 'El usuario no tenía verificación en dos pasos configurada',
      { description: `${selected.full_name} deberá configurarla en su próximo inicio de sesión.` },
    );
    setShowResetMfa(false);
    setSelected(null);
  }

  // ── Contadores ────────────────────────────────────────────────────────────

  const totalActive   = users.filter((u) => u.is_active).length;
  const totalInactive = users.filter((u) => !u.is_active).length;

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
        {/* ── Acción crear ──── */}
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)} className="shrink-0">
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo usuario
          </Button>
        </div>

        {/* ── Resumen ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total',     value: users.length,  icon: Users },
            { label: 'Activos',   value: totalActive,   icon: ShieldCheck },
            { label: 'Inactivos', value: totalInactive, icon: ShieldOff },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="h-full">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-2xl font-semibold">{value}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabla de usuarios ───────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-balance">
              Usuarios del sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {users.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm space-y-2">
                <Users className="h-8 w-8 mx-auto opacity-30" />
                <p>No hay usuarios registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-6 font-medium text-muted-foreground whitespace-nowrap">Nombre</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Correo electrónico</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Rol</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                      <th className="py-3 px-6 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-6 whitespace-nowrap font-medium">{user.full_name}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">{user.email}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant={getRoleVariant(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            user.is_active ? 'text-green-700' : 'text-muted-foreground'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              user.is_active ? 'bg-green-600' : 'bg-muted-foreground'
                            }`} />
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-6 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(user)}
                              title="Editar usuario"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => openResetMfa(user)}
                              title="Restablecer verificación en dos pasos"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => openDelete(user)}
                              title="Eliminar usuario"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Permisos por Rol ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Permisos por Rol
            </h2>
            <p className="text-sm text-muted-foreground">
              Referencia de accesos disponibles según el rol asignado a cada usuario.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG[string]][]).map(([roleKey, cfg]) => (
              <Card key={roleKey} className="h-full flex flex-col">
                <CardHeader className="pb-2 pt-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{cfg.label}</CardTitle>
                    <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground text-pretty leading-relaxed">
                    {cfg.description}
                  </p>
                </CardHeader>
                <CardContent className="flex-1 pb-5">
                  <ul className="space-y-1.5">
                    {cfg.permissions.map((perm) => (
                      <li key={perm} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* ── Diálogo: Crear usuario ──────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={(open) => {
        setShowCreate(open);
        if (!open) setCreateForm({ email: '', full_name: '', role: 'gestor', password: '' });
      }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">Crear nuevo usuario</DialogTitle>
            <DialogDescription>
              Complete los datos del nuevo usuario interno de CrediNOVA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-name" className="text-sm font-normal">Nombre completo *</Label>
              <Input
                id="c-name"
                placeholder="Ej. María González"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-email" className="text-sm font-normal">Correo electrónico *</Label>
              <Input
                id="c-email"
                type="email"
                placeholder="usuario@cotecnova.edu.co"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-role" className="text-sm font-normal">Rol *</Label>
              <Select
                value={createForm.role}
                onValueChange={(v: 'admin' | 'gestor' | 'rector') =>
                  setCreateForm({ ...createForm, role: v })
                }
              >
                <SelectTrigger id="c-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="rector">Rector</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="c-password" className="text-sm font-normal">Contraseña *</Label>
              <Input
                id="c-password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando…</> : <><Plus className="h-4 w-4 mr-2" />Crear usuario</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: Editar usuario ─────────────────────────────────────────── */}
      <Dialog open={showEdit} onOpenChange={(open) => { setShowEdit(open); if (!open) setSelected(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">Editar usuario</DialogTitle>
            <DialogDescription>
              Modifique el nombre, correo, rol o estado del usuario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-name" className="text-sm font-normal">Nombre completo *</Label>
              <Input
                id="e-name"
                placeholder="Nombre completo"
                value={editForm.full_name ?? ''}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-email" className="text-sm font-normal">Correo electrónico *</Label>
              <Input
                id="e-email"
                type="email"
                placeholder="usuario@cotecnova.edu.co"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Cambiar el correo actualizará también las credenciales de acceso del usuario.
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="e-role" className="text-sm font-normal">Rol</Label>
                <Select
                  value={editForm.role ?? 'gestor'}
                  onValueChange={(v: 'admin' | 'gestor' | 'rector') =>
                    setEditForm({ ...editForm, role: v })
                  }
                >
                  <SelectTrigger id="e-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="rector">Rector</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e-status" className="text-sm font-normal">Estado</Label>
                <Select
                  value={editForm.is_active ? 'active' : 'inactive'}
                  onValueChange={(v) => setEditForm({ ...editForm, is_active: v === 'active' })}
                >
                  <SelectTrigger id="e-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEdit(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</> : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: Eliminar usuario ───────────────────────────────────────── */}
      <Dialog open={showDelete} onOpenChange={(open) => { setShowDelete(open); if (!open) setSelected(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-balance">Eliminar usuario</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El usuario perderá acceso al sistema.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="py-2">
              <div className="rounded-md border border-border p-4 space-y-1 bg-muted/30">
                <p className="font-medium text-sm">{selected.full_name}</p>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
                <Badge variant={getRoleVariant(selected.role)} className="mt-1">
                  {getRoleLabel(selected.role)}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Eliminando…</> : 'Eliminar usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: Restablecer verificación en dos pasos ──────────────────── */}
      <Dialog open={showResetMfa} onOpenChange={(open) => { setShowResetMfa(open); if (!open) setSelected(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-balance">Restablecer verificación en dos pasos</DialogTitle>
            <DialogDescription className="text-pretty">
              Úsalo cuando el usuario haya perdido el teléfono o el acceso a Google
              Authenticator.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="py-2 space-y-3">
              <div className="rounded-md border border-border p-4 space-y-1 bg-muted/30">
                <p className="font-medium text-sm">{selected.full_name}</p>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
                <Badge variant={getRoleVariant(selected.role)} className="mt-1">
                  {getRoleLabel(selected.role)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground text-pretty">
                Se eliminará su segundo factor y se cerrarán sus sesiones abiertas.
                La próxima vez que inicie sesión deberá escanear un código QR nuevo.
                Su cuenta, su rol y sus datos no se ven afectados.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResetMfa(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleResetMfa} disabled={isSaving}>
              {isSaving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Restableciendo…</>
                : <><KeyRound className="h-4 w-4 mr-2" />Restablecer</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

