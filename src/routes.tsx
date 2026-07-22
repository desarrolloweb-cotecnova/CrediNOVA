import type { ReactNode } from 'react';
import { lazy } from 'react';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const NewApplicationPage = lazy(() => import('./pages/NewApplicationPage'));
const ConsultApplicationPage = lazy(() => import('./pages/ConsultApplicationPage'));
const ApplicationViewPage = lazy(() => import('./pages/ApplicationViewPage'));
const RecoverDraftPage = lazy(() => import('./pages/RecoverDraftPage'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminRegisterPage = lazy(() => import('./pages/admin/AdminRegisterPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminApplicationsPage = lazy(() => import('./pages/admin/AdminApplicationsPage'));
const AdminApplicationDetailPage = lazy(() => import('./pages/admin/AdminApplicationDetailPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const CreditStudyCostsPage = lazy(() => import('./pages/admin/CreditStudyCostsPage'));
const AcademicProgramsPage = lazy(() => import('./pages/admin/AcademicProgramsPage'));
const UsersManagementPage = lazy(() => import('./pages/admin/UsersManagementPage'));
const EmailSettingsPage = lazy(() => import('./pages/admin/EmailSettingsPage'));
const MonitoreoSupabasePage = lazy(() => import('./pages/admin/MonitoreoSupabasePage'));

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accesible sin autenticación. Las rutas sin este flag requieren sesión activa. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  // ── Rutas públicas ──────────────────────────────────────────────────────────
  { name: 'Inicio',               path: '/',                         element: <LandingPage />,               public: true },
  { name: 'Nueva Solicitud',      path: '/solicitud/nueva',          element: <NewApplicationPage />,        public: true },
  { name: 'Consultar Solicitud',  path: '/solicitud/consultar',      element: <ConsultApplicationPage />,    public: true },
  { name: 'Ver Solicitud',        path: '/solicitud/:codigo',        element: <ApplicationViewPage />,       public: true },
  { name: 'Recuperar Borrador',   path: '/solicitud/recuperar-borrador', element: <RecoverDraftPage />,      public: true },

  // ── Autenticación admin (públicas) ──────────────────────────────────────────
  { name: 'Login Administrativo', path: '/admin/login',     element: <AdminLoginPage />,    public: true },
  { name: 'Registro Interno',     path: '/admin/registro',  element: <AdminRegisterPage />, public: true },

  // ── Rutas protegidas (requieren sesión) ─────────────────────────────────────
  { name: 'Panel',                path: '/admin/dashboard',              element: <AdminDashboard /> },
  { name: 'Solicitudes',          path: '/admin/solicitudes',            element: <AdminApplicationsPage /> },
  { name: 'Detalle de Solicitud', path: '/admin/solicitudes/:id',        element: <AdminApplicationDetailPage /> },
  { name: 'Reportes',             path: '/admin/reportes',               element: <AdminReportsPage /> },
  { name: 'Costos de Estudio',    path: '/admin/costos-estudio',         element: <CreditStudyCostsPage /> },
  { name: 'Programas Académicos', path: '/admin/programas',              element: <AcademicProgramsPage /> },
  { name: 'Gestión de Usuarios',  path: '/admin/usuarios',               element: <UsersManagementPage /> },
  { name: 'Configuración Correo', path: '/admin/configuracion-correo',   element: <EmailSettingsPage /> },
  { name: 'Monitoreo Supabase',   path: '/admin/monitoreo-supabase',     element: <MonitoreoSupabasePage /> },
];
