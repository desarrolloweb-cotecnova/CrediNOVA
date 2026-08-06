import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDateShort } from '@/lib/date';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Eye, Bell, Trash2, Layers, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/lib/supabase';
import { cn, formatCurrency } from '@/lib/utils';
import { APPLICATION_STATUS_ORDER, getStatusConfig } from '@/lib/application-status';

interface Application {
  id: string;
  application_code: string;
  draft_code: string | null;
  is_draft: boolean;
  student_full_name: string;
  student_document_number: string;
  student_program: string;
  semester_value: number;
  status: string;
  has_rector_pending: boolean;
  deletion_requested_at: string | null;
  created_at: string;
}

interface StatusTab {
  value: string;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  badgeClass: string;
  count: number;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle('Gestión de Solicitudes');

  useEffect(() => {
    loadApplications();
  }, []);

  // Resultado de la búsqueda por texto: base para los conteos de cada pestaña
  const searchedApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return applications;

    return applications.filter(app => {
      const code = app.is_draft ? app.draft_code : app.application_code;
      return (
        code?.toLowerCase().includes(query) ||
        app.student_full_name.toLowerCase().includes(query) ||
        app.student_document_number.includes(query)
      );
    });
  }, [applications, searchQuery]);

  // Pestañas por estado, con el icono y color de la Guía del Proceso y su conteo
  const statusTabs = useMemo<StatusTab[]>(() => {
    const counts = searchedApplications.reduce<Record<string, number>>((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    return [
      {
        value: 'todos',
        label: 'Todas',
        icon: Layers,
        iconClass: 'text-muted-foreground',
        badgeClass: 'bg-slate-600',
        count: searchedApplications.length,
      },
      {
        value: 'rector_pendiente',
        label: 'Requiere Rector',
        icon: Bell,
        iconClass: 'text-violet-600',
        badgeClass: 'bg-violet-600',
        count: searchedApplications.filter(app => app.has_rector_pending).length,
      },
      ...APPLICATION_STATUS_ORDER.map(status => {
        const config = getStatusConfig(status);
        return {
          value: status,
          label: config.label,
          icon: config.icon,
          iconClass: config.iconClass,
          badgeClass: config.badgeClass,
          count: counts[status] || 0,
        };
      }),
    ];
  }, [searchedApplications]);

  const filteredApplications = useMemo(() => {
    if (statusFilter === 'todos') return searchedApplications;
    if (statusFilter === 'rector_pendiente') return searchedApplications.filter(app => app.has_rector_pending);
    return searchedApplications.filter(app => app.status === statusFilter);
  }, [searchedApplications, statusFilter]);

  const activeTabLabel = statusTabs.find(tab => tab.value === statusFilter)?.label ?? '';

  async function loadApplications() {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Cargando solicitudes...');

      const { data, error: fetchError } = await supabase
        .from('applications')
        .select('id, application_code, draft_code, is_draft, student_full_name, student_document_number, student_program, semester_value, status, has_rector_pending, deletion_requested_at, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error al cargar solicitudes:', fetchError);
        throw fetchError;
      }

      console.log('✅ Solicitudes cargadas:', data?.length || 0);
      setApplications(data || []);
    } catch (err) {
      console.error('💥 Error al cargar solicitudes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al cargar solicitudes: ${errorMessage}`);
      toast.error('Error al cargar solicitudes');
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
            <p className="text-muted-foreground">Cargando solicitudes...</p>
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
            <Button onClick={loadApplications}>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-balance">Todas las Solicitudes</CardTitle>
              <CardDescription className="text-pretty">
                Busque y gestione las solicitudes de crédito educativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <Input
                    placeholder="Buscar por código, nombre o cédula..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="secondary" onClick={() => { setSearchQuery(''); setStatusFilter('todos'); }}>
                  <Search className="mr-2 h-4 w-4" />
                  Limpiar
                </Button>
              </div>

              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
                <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
                  {statusTabs.map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="h-auto gap-2 py-1.5 data-[state=active]:font-semibold"
                      >
                        <TabIcon className={cn('h-4 w-4 shrink-0', tab.iconClass)} />
                        <span className="text-pretty">{tab.label}</span>
                        <span
                          className={cn(
                            'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none',
                            tab.count > 0
                              ? `${tab.badgeClass} text-white`
                              : 'bg-muted-foreground/20 text-muted-foreground',
                          )}
                        >
                          {tab.count}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              {filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-2 text-pretty">
                    {searchQuery
                      ? 'No se encontraron solicitudes con ese criterio'
                      : statusFilter !== 'todos'
                        ? `No hay solicitudes en estado "${activeTabLabel}"`
                        : 'No hay solicitudes registradas'}
                  </p>
                  {searchQuery && (
                    <Button variant="link" onClick={() => setSearchQuery('')}>
                      Limpiar búsqueda
                    </Button>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-full overflow-x-auto bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Código</TableHead>
                        <TableHead className="whitespace-nowrap">Estudiante</TableHead>
                        <TableHead className="whitespace-nowrap">Documento</TableHead>
                        <TableHead className="whitespace-nowrap">Programa</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                        <TableHead className="whitespace-nowrap">Estado</TableHead>
                        <TableHead className="whitespace-nowrap">Alerta</TableHead>
                        <TableHead className="whitespace-nowrap">Fecha</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => {
                        const displayCode = app.is_draft ? app.draft_code : app.application_code;
                        const statusConfig = getStatusConfig(app.status);
                        const StatusIcon = statusConfig.icon;
                        return (
                          <TableRow key={app.id}>
                            <TableCell className="whitespace-nowrap font-medium">
                              {displayCode}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {app.student_full_name}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {app.student_document_number}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {app.student_program}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              {formatCurrency(app.semester_value)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={cn(statusConfig.badgeClass, 'text-white inline-flex items-center gap-1')}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {app.deletion_requested_at && (
                                <Badge className="bg-red-600 text-white inline-flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" />
                                  Pend. eliminación
                                </Badge>
                              )}
                              {!app.deletion_requested_at && app.has_rector_pending && (
                                <Badge className="bg-violet-600 text-white inline-flex items-center gap-1">
                                  <Bell className="w-3 h-3" />
                                  Requiere Rector
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDateShort(app.created_at)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link to={`/admin/solicitudes/${app.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
