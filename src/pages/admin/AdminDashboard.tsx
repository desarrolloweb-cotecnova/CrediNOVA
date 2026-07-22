import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDateShort } from '@/lib/date';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, Users, CheckCircle, Loader2, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';

interface DashboardStats {
  totalApplications: number;
  drafts: number;
  inReview: number;
  approved: number;
  totalApprovedAmount: number;
  rectorPending: number;
}

interface RecentApplication {
  id: string;
  application_code: string;
  student_full_name: string;
  student_program: string;
  semester_value: number;
  status: string;
  has_rector_pending: boolean;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  en_revision: 'En Revisión',
  requiere_ajustes: 'Requiere Ajustes',
  aprobado: 'Aprobado',
  pendiente_firma: 'Pendiente Firma',
  matricula_autorizada: 'Matrícula Autorizada',
  rechazado: 'Rechazado',
  cancelado: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  borrador: 'bg-zinc-500',
  en_revision: 'bg-blue-500',
  requiere_ajustes: 'bg-yellow-500',
  aprobado: 'bg-green-500',
  pendiente_firma: 'bg-purple-500',
  matricula_autorizada: 'bg-primary',
  rechazado: 'bg-red-500',
  cancelado: 'bg-red-800',
};

export default function AdminDashboard() {
  usePageTitle('Panel');
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    drafts: 0,
    inReview: 0,
    approved: 0,
    totalApprovedAmount: 0,
    rectorPending: 0,
  });
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Cargando datos del dashboard...');

      // Obtener todas las solicitudes (incluyendo borradores)
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('status, semester_value, created_at, is_draft, has_rector_pending');

      if (appsError) {
        console.error('❌ Error al obtener aplicaciones:', appsError);
        throw appsError;
      }

      // Calcular estadísticas
      const finalizedApps = applications?.filter(app => !app.is_draft) || [];
      const totalApplications = finalizedApps.length;
      const drafts = applications?.filter(app => app.status === 'borrador').length || 0;
      const inReview = finalizedApps.filter(app => app.status === 'en_revision').length || 0;
      const rectorPending = finalizedApps.filter(app => app.has_rector_pending).length || 0;
      const approved = finalizedApps.filter(app => 
        app.status === 'aprobado' || 
        app.status === 'pendiente_firma' || 
        app.status === 'matricula_autorizada'
      ).length || 0;
      
      const totalApprovedAmount = finalizedApps
        .filter(app => 
          app.status === 'aprobado' || 
          app.status === 'pendiente_firma' || 
          app.status === 'matricula_autorizada'
        )
        .reduce((sum, app) => sum + (app.semester_value || 0), 0) || 0;

      setStats({
        totalApplications,
        drafts,
        inReview,
        approved,
        totalApprovedAmount,
        rectorPending,
      });

      // Obtener solicitudes recientes
      const { data: recent, error: recentError } = await supabase
        .from('applications')
        .select('id, application_code, student_full_name, student_program, semester_value, status, has_rector_pending, created_at')
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentError) {
        console.error('❌ Error al obtener solicitudes recientes:', recentError);
        throw recentError;
      }

      setRecentApplications(recent || []);
    } catch (error) {
      console.error('💥 Error al cargar datos del dashboard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(`Error al cargar datos: ${errorMessage}`);
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando datos del dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-6 mb-4">
              <p className="text-red-900 dark:text-red-100 font-semibold mb-2">Error al cargar datos</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <Button onClick={loadDashboardData}>
              Reintentar
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-muted/30 min-h-full">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Solicitudes</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalApplications}</div>
                <p className="text-xs text-muted-foreground">Solicitudes finalizadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Borradores</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.drafts}</div>
                <p className="text-xs text-muted-foreground">En progreso</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Revisión</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inReview}</div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </CardContent>
            </Card>

            <Card className={stats.rectorPending > 0 ? 'border-violet-400' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requieren Rector</CardTitle>
                <Bell className={`h-4 w-4 ${stats.rectorPending > 0 ? 'text-violet-600' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.rectorPending > 0 ? 'text-violet-600' : ''}`}>
                  {stats.rectorPending}
                </div>
                <p className="text-xs text-muted-foreground">Pendientes de aprobación rector</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.approved}</div>
                <p className="text-xs text-muted-foreground">Total aprobadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Aprobado</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalApprovedAmount)}
                </div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-balance">Solicitudes Recientes</CardTitle>
              <CardDescription className="text-pretty">
                Últimas solicitudes de crédito educativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentApplications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay solicitudes registradas
                </p>
              ) : (
                <div className="w-full max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Código</TableHead>
                        <TableHead className="whitespace-nowrap">Estudiante</TableHead>
                        <TableHead className="whitespace-nowrap">Programa</TableHead>
                        <TableHead className="whitespace-nowrap">Valor</TableHead>
                        <TableHead className="whitespace-nowrap">Estado</TableHead>
                        <TableHead className="whitespace-nowrap">Alerta</TableHead>
                        <TableHead className="whitespace-nowrap">Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="whitespace-nowrap font-mono">
                            <Link 
                              to={`/admin/solicitudes/${app.id}`}
                              className="text-primary hover:underline"
                            >
                              {app.application_code}
                            </Link>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{app.student_full_name}</TableCell>
                          <TableCell className="whitespace-nowrap">{app.student_program || 'N/A'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(app.semester_value || 0)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className={STATUS_COLORS[app.status] || 'bg-gray-500'}>
                              {STATUS_LABELS[app.status] || app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {app.has_rector_pending && (
                              <Badge className="bg-violet-600 text-white inline-flex items-center gap-1">
                                <Bell className="w-3 h-3" />
                                Rector
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDateShort(app.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
