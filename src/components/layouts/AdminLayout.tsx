import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  FileText,
  Settings,
  DollarSign,
  GraduationCap,
  Menu,
  LogOut,
  User,
  Users,
  BarChart3,
  Mail,
  Server,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SessionExpiryNotice } from '@/components/common/SessionExpiryNotice';
import { getCurrentUserSync, logout } from '@/services/auth';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/** Mapeo de roles internos a etiquetas en español */
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  rector: 'Rector',
  gestor: 'Gestor',
  colaborador: 'Colaborador',
};

/** Genera las iniciales (máx 2 caracteres) de un nombre completo */
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

/* ─────────────────────────────────────────────────────────────
   Layout principal del panel de administración CrediNOVA
   ───────────────────────────────────────────────────────────── */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}

/* ─────────────────────────────────────────────────────────────
   Layout interno: consume el contexto y renderiza header + sidebar
   ───────────────────────────────────────────────────────────── */
function AdminLayoutInner({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const currentUser = getCurrentUserSync();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'rector';

  /** Título derivado directamente de la ruta actual — siempre sincronizado, sin estado */
  const PAGE_TITLES: Record<string, string> = {
    '/admin/dashboard':           'Panel',
    '/admin/solicitudes':         'Gestión de Solicitudes',
    '/admin/reportes':            'Reportes',
    '/admin/costos-estudio':      'Costos de Estudio',
    '/admin/programas':           'Programas Académicos',
    '/admin/configuracion-correo':'Configuración de Correo',
    '/admin/usuarios':            'Gestión de Usuarios',
    '/admin/monitoreo-supabase':  'Monitoreo Supabase',
  };
  const title =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/admin/solicitudes/') ? 'Detalle de Solicitud' : 'Panel CrediNOVA');
  const navigation = [
    { name: 'Panel', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Solicitudes', href: '/admin/solicitudes', icon: FileText },
    { name: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
    {
      name: 'Configuración',
      icon: Settings,
      children: [
        { name: 'Costos de Estudio', href: '/admin/costos-estudio', icon: DollarSign },
        { name: 'Programas Académicos', href: '/admin/programas', icon: GraduationCap },
        { name: 'Correo Electrónico', href: '/admin/configuracion-correo', icon: Mail },
        ...(isAdmin ? [{ name: 'Usuarios y Permisos', href: '/admin/usuarios', icon: Users }] : []),
        { name: 'Monitoreo Supabase', href: '/admin/monitoreo-supabase', icon: Server },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
    toast.success('Sesión cerrada correctamente');
  };

  const handleChangePassword = async () => {
    if (!passwords.new || !passwords.confirm || !passwords.current) {
      toast.error('Por favor complete todos los campos');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwords.new.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('No se pudo obtener el usuario actual');
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.current,
      });
      if (signInError) {
        toast.error('La contraseña actual es incorrecta');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: passwords.new });
      if (updateError) {
        toast.error(updateError.message || 'Error al cambiar la contraseña');
        return;
      }
      toast.success('Contraseña cambiada correctamente');
      setChangePasswordOpen(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch {
      toast.error('Error inesperado al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        if (item.children) {
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground">
                <item.icon className="h-5 w-5" />
                {item.name}
              </div>
              <div className="ml-8 space-y-1">
                {item.children.map((child) => {
                  const isActive = location.pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      to={child.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <child.icon className="h-4 w-4" />
                      {child.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen w-full">

      {/* ── Sidebar Desktop (fijo) ────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 border-r border-border bg-background z-40 overflow-y-auto">
        <div className="p-6 border-b border-border shrink-0">
          <img
            src="/images/brand/credinova-logo.svg"
            alt="CrediNOVA Logo"
            className="h-12 w-auto"
          />
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLinks />
        </nav>
      </aside>

      {/* ── Header Desktop (fijo, a la derecha del sidebar) ─────── */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 h-16 border-b border-border bg-background z-30 items-center px-6 gap-4">
        {/* Título de página */}
        <div className="flex-1 min-w-0 flex items-center">
          <h1 className="text-base font-semibold leading-tight truncate text-foreground">
            {title}
          </h1>
        </div>
        {/* Perfil (derecha) */}
        <div className="shrink-0">
          <ProfileDropdown
            currentUser={currentUser}
            onOpenProfile={() => setChangePasswordOpen(true)}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* ── Header Mobile (fijo) ──────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-background z-40 flex items-center px-4 gap-3">
        {/* Logo */}
        <img
          src="/images/brand/credinova-logo.svg"
          alt="CrediNOVA Logo"
          className="h-8 w-auto shrink-0"
        />
        {/* Título de página (móvil) */}
        <span className="flex-1 min-w-0 text-sm font-semibold truncate text-foreground">
          {title}
        </span>
        {/* Acciones derecha */}
        <div className="flex items-center gap-1 shrink-0">
          <ProfileDropdown
            currentUser={currentUser}
            onOpenProfile={() => setChangePasswordOpen(true)}
            onLogout={handleLogout}
            compact
          />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b border-border">
                <img
                  src="/images/brand/credinova-logo.svg"
                  alt="CrediNOVA Logo"
                  className="h-12 w-auto"
                />
              </div>
              <nav className="p-4 space-y-2">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ── Contenido Principal ───────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col lg:ml-64 lg:pt-16 pt-14">
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* ── Diálogo Cambiar Contraseña ─────────────────────────── */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Ingrese su contraseña actual y la nueva contraseña
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Componente ProfileDropdown
   ───────────────────────────────────────────────────────────── */
interface ProfileDropdownProps {
  currentUser: ReturnType<typeof getCurrentUserSync>;
  onOpenProfile: () => void;
  onLogout: () => void;
  compact?: boolean;
}

function ProfileDropdown({ currentUser, onOpenProfile, onLogout, compact = false }: ProfileDropdownProps) {
  const name = currentUser?.fullName || 'Usuario';
  const email = currentUser?.email || '';
  const role = currentUser?.role || '';
  const initials = getInitials(name);
  const roleLabel = ROLE_LABELS[role] || role;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
          {/* Avatar circular */}
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
            {initials}
          </div>
          {!compact && (
            <>
              <span className="text-sm font-medium max-w-[120px] truncate hidden xl:block">{name}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden xl:block" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Info usuario */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{name}</p>
            <p className="text-xs text-muted-foreground leading-tight truncate mt-0.5">{email}</p>
            {roleLabel && (
              <Badge variant="secondary" className="mt-2 text-xs">
                {roleLabel}
              </Badge>
            )}
          </div>
        </div>

        <SessionExpiryNotice className="px-4 pb-3" />

        {/* Acciones */}
        <div className="py-1">
          <DropdownMenuItem onClick={onOpenProfile} className="gap-2 px-4 py-2.5">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Mi Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onLogout}
            className="gap-2 px-4 py-2.5 text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
