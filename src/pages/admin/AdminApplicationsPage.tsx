import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDateShort } from '@/lib/date';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Eye, Bell, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';

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
  cancelado: 'bg-rose-900',
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle('Gestión de Solicitudes');

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    // Filtrar aplicaciones cuando cambia la búsqueda o el filtro de estado
    let filtered = applications;

    // Filtro de estado
    if (statusFilter === 'rector_pendiente') {
      filtered = filtered.filter(app => app.has_rector_pending);
    } else if (statusFilter !== 'todos') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Filtro de búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => {
        const code = app.is_draft ? app.draft_code : app.application_code;
        return (
          code?.toLowerCase().includes(query) ||
          app.student_full_name.toLowerCase().includes(query) ||
          app.student_document_number.includes(query)
        );
      });
    }

    setFilteredApplications(filtered);
  }, [searchQuery, statusFilter, applications]);

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
      setFilteredApplications(data || []);
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
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 min-w-0">
                  <Input 
                    placeholder="Buscar por código, nombre o cédula..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="rector_pendiente">⚡ Requiere Rector</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="en_revision">En Revisión</SelectItem>
                    <SelectItem value="requiere_ajustes">Requiere Ajustes</SelectItem>
                    <SelectItem value="aprobado">Aprobado</SelectItem>
                    <SelectItem value="pendiente_firma">Pendiente Firma</SelectItem>
                    <SelectItem value="matricula_autorizada">Matrícula Autorizada</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                    <SelectItem value="cancelado">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="secondary" onClick={() => { setSearchQuery(''); setStatusFilter('todos'); }}>
                  <Search className="mr-2 h-4 w-4" />
                  Limpiar
                </Button>
              </div>

              {filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-2">
                    {searchQuery ? 'No se encontraron solicitudes con ese criterio' : 'No hay solicitudes registradas'}
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
                              <Badge className={STATUS_COLORS[app.status] || 'bg-gray-500'}>
                                {STATUS_LABELS[app.status] || app.status}
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
