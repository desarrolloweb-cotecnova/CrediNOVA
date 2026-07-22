import { useState, useRef } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { getApplicationsForReport, type ReportFilters, type ReportRow } from '@/services/applications';
import { formatCurrency } from '@/lib/utils';

// ── Constantes ──────────────────────────────────────────────────────────

const ALL_STATUSES: { value: string; label: string }[] = [
  { value: 'en_revision', label: 'En Revisión' },
  { value: 'requiere_ajustes', label: 'Requiere Ajustes' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'pendiente_firma', label: 'Pendiente Firma' },
  { value: 'matricula_autorizada', label: 'Matrícula Autorizada' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'borrador', label: 'Borrador' },
];

const ALL_PLANS: { value: string; label: string }[] = [
  { value: '50/50', label: 'Plan 50/50' },
  { value: '20/80', label: 'Plan 20/80' },
];

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

const STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  en_revision: 'En Revisión',
  requiere_ajustes: 'Requiere Ajustes',
  aprobado: 'Aprobado',
  pendiente_firma: 'Pendiente Firma',
  matricula_autorizada: 'Matrícula Autorizada',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

import { formatDateShort, formatDateLong } from '@/lib/date';

function formatDate(iso?: string | null): string {
  return formatDateShort(iso ?? null);
}

// ── Componente principal ─────────────────────────────────────────────────

export default function AdminReportsPage() {
  usePageTitle('Reportes');
  // Filtros
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Resultados
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // ── Helpers de filtros ──────────────────────────────────────────────

  function toggleStatus(value: string) {
    setSelectedStatuses((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  function togglePlan(value: string) {
    setSelectedPlans((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  }

  function resetFilters() {
    setSelectedStatuses([]);
    setSelectedPlans([]);
    setDateFrom('');
    setDateTo('');
    setRows([]);
    setHasQueried(false);
  }

  // ── Consultar reporte ───────────────────────────────────────────────

  async function handleGenerate() {
    setIsLoading(true);
    try {
      const filters: ReportFilters = {
        statuses: selectedStatuses,
        plans: selectedPlans,
        dateFrom,
        dateTo,
      };
      const { data, error } = await getApplicationsForReport(filters);
      if (error) {
        toast.error(error);
        return;
      }
      setRows(data);
      setHasQueried(true);
      if (data.length === 0) {
        toast.info('No se encontraron solicitudes con los filtros seleccionados');
      }
    } finally {
      setIsLoading(false);
    }
  }

  // ── Exportar Excel ──────────────────────────────────────────────────

  function handleExportExcel() {
    if (rows.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const wsData = rows.map((r, i) => ({
      '#': i + 1,
      Código: r.applicationCode,
      'Nombre Estudiante': r.studentFullName,
      'Documento Estudiante': r.studentDocumentNumber,
      Email: r.studentEmail,
      Teléfono: r.studentPhone,
      Programa: r.studentProgram,
      Semestre: r.studentSemester,
      Plan: r.creditPlan,
      'Valor Semestre': r.semesterValue,
      'Cuota Inicial': r.initialPayment ?? '',
      'Monto Financiado': r.financedAmount ?? '',
      'N° Cuotas': r.numberOfInstallments ?? '',
      Estado: STATUS_LABELS[r.status] ?? r.status,
      'Nombre Deudor Solidario': r.cosignerFullName,
      'Documento Deudor Solidario': r.cosignerDocumentNumber,
      'Teléfono Deudor Solidario': r.cosignerPhone,
      'Fecha Solicitud': formatDate(r.createdAt),
      'Fecha Pago Inicial': formatDate(r.initialPaymentDate),
      'Fecha Firmas': formatDate(r.guaranteesSignedDate),
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

    // Ancho de columnas automático
    const colWidths = Object.keys(wsData[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        ...wsData.map((r) => String((r as Record<string, unknown>)[key] ?? '').length)
      ) + 2,
    }));
    ws['!cols'] = colWidths;

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Reporte_CrediNOVA_${dateStr}.xlsx`);
    toast.success('Archivo Excel descargado correctamente');
  }

  // ── Imprimir ────────────────────────────────────────────────────────

  function handlePrint() {
    if (rows.length === 0) {
      toast.error('No hay datos para imprimir');
      return;
    }
    window.print();
  }

  // ── Resumen rápido ──────────────────────────────────────────────────

  const totalFinanciado = rows.reduce((s, r) => s + (r.financedAmount ?? 0), 0);
  const totalSemestre = rows.reduce((s, r) => s + (r.semesterValue ?? 0), 0);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      {/* Área visible en pantalla */}
      <div className="p-6 md:p-8 space-y-6 no-print">
        {/* Acciones de exportar */}
        {hasQueried && rows.length > 0 && (
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        )}

        {/* Panel de filtros */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Filtros</CardTitle>
            <CardDescription className="text-pretty">
              Seleccione los criterios para generar el reporte. Sin filtros se muestran todas las solicitudes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fila: Estados + Planes */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Estados */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Estado</p>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                  {ALL_STATUSES.map((s) => (
                    <div key={s.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`status-${s.value}`}
                        checked={selectedStatuses.includes(s.value)}
                        onCheckedChange={() => toggleStatus(s.value)}
                      />
                      <Label
                        htmlFor={`status-${s.value}`}
                        className="text-sm font-normal cursor-pointer leading-none"
                      >
                        {s.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Planes + Rango de fecha */}
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Plan de Crédito</p>
                  <div className="flex flex-col gap-y-2.5">
                    {ALL_PLANS.map((p) => (
                      <div key={p.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`plan-${p.value}`}
                          checked={selectedPlans.includes(p.value)}
                          onCheckedChange={() => togglePlan(p.value)}
                        />
                        <Label
                          htmlFor={`plan-${p.value}`}
                          className="text-sm font-normal cursor-pointer leading-none"
                        >
                          {p.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium">Rango de Fecha de Solicitud</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="date-from" className="text-xs text-muted-foreground font-normal">
                        Desde
                      </Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        max={dateTo || undefined}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="date-to" className="text-xs text-muted-foreground font-normal">
                        Hasta
                      </Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        min={dateFrom || undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3 flex-wrap pt-2">
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando...</>
                ) : (
                  <><BarChart3 className="h-4 w-4 mr-2" />Generar Reporte</>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {hasQueried && (
          <>
            {/* Tarjetas resumen */}
            {rows.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Solicitudes</p>
                    <p className="text-2xl font-semibold mt-1">{rows.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan 50/50</p>
                    <p className="text-2xl font-semibold mt-1">{rows.filter((r) => r.creditPlan === '50/50').length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Valor Semestre</p>
                    <p className="text-2xl font-semibold mt-1">{formatCurrency(totalSemestre)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Financiado</p>
                    <p className="text-2xl font-semibold mt-1">{formatCurrency(totalFinanciado)}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabla de resultados */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base font-semibold text-balance">
                      Resultados del Reporte
                    </CardTitle>
                    <CardDescription className="text-pretty">
                      {rows.length} solicitud{rows.length !== 1 ? 'es' : ''} encontrada{rows.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  {rows.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir
                      </Button>
                      <Button size="sm" onClick={handleExportExcel}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Excel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {rows.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground text-sm">
                    No se encontraron solicitudes con los filtros seleccionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap pl-6">#</TableHead>
                          <TableHead className="whitespace-nowrap">Código</TableHead>
                          <TableHead className="whitespace-nowrap">Estudiante</TableHead>
                          <TableHead className="whitespace-nowrap">Documento</TableHead>
                          <TableHead className="whitespace-nowrap">Programa</TableHead>
                          <TableHead className="whitespace-nowrap">Semestre</TableHead>
                          <TableHead className="whitespace-nowrap">Plan</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Valor Semestre</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Cuota Inicial</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Financiado</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Cuotas</TableHead>
                          <TableHead className="whitespace-nowrap">Estado</TableHead>
                          <TableHead className="whitespace-nowrap">Fecha Solicitud</TableHead>
                          <TableHead className="whitespace-nowrap pr-6">Deudor Solidario</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row, i) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-muted-foreground pl-6 whitespace-nowrap">{i + 1}</TableCell>
                            <TableCell className="font-mono text-xs whitespace-nowrap">{row.applicationCode}</TableCell>
                            <TableCell className="whitespace-nowrap font-medium">{row.studentFullName}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm">{row.studentDocumentNumber}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm max-w-[160px] truncate" title={row.studentProgram}>{row.studentProgram}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm">{row.studentSemester}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline" className="text-xs">{row.creditPlan}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm">{formatCurrency(row.semesterValue)}</TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm">
                              {row.initialPayment ? formatCurrency(row.initialPayment) : '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm">
                              {row.financedAmount ? formatCurrency(row.financedAmount) : '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm">
                              {row.numberOfInstallments ?? '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${STATUS_COLORS[row.status] ?? 'bg-muted'}`}>
                                {STATUS_LABELS[row.status] ?? row.status}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">{formatDate(row.createdAt)}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm pr-6">{row.cosignerFullName || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Versión imprimible ───────────────────────────────────────────── */}
      <div className="print-only" ref={printRef}>
        {/* Encabezado institucional */}
        <div className="print-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="https://miaoda-conversation-file.s3cdn.medo.dev/user-8u8uo5llzbwg/app-bia2hvw84flt/20260522/logocotecnova.png"
              alt="Cotecnova"
              style={{ height: '40px', width: 'auto' }}
            />
            <div>
              <h1>CrediNOVA – Reporte de Solicitudes</h1>
              <p>
                Corporación de Estudios Tecnológicos del Norte del Valle &nbsp;·&nbsp;
                Generado el {formatDateLong(new Date().toISOString())}
                {selectedStatuses.length > 0 && ` · Estados: ${selectedStatuses.map((s) => STATUS_LABELS[s] ?? s).join(', ')}`}
                {selectedPlans.length > 0 && ` · Planes: ${selectedPlans.join(', ')}`}
                {(dateFrom || dateTo) && ` · Período: ${dateFrom || '—'} a ${dateTo || '—'}`}
              </p>
            </div>
          </div>
          <div className="print-summary">
            <span>{rows.length} solicitud{rows.length !== 1 ? 'es' : ''}</span>
            <span>Val. semestre: {formatCurrency(totalSemestre)}</span>
            <span>Total financiado: {formatCurrency(totalFinanciado)}</span>
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Código</th>
              <th>Estudiante</th>
              <th>Documento</th>
              <th>Programa</th>
              <th>Sem.</th>
              <th>Plan</th>
              <th>Valor Semestre</th>
              <th>Cuota Inicial</th>
              <th>Financiado</th>
              <th>Cuotas</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Deudor Solidario</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td>{i + 1}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '6.5pt' }}>{row.applicationCode}</td>
                <td>{row.studentFullName}</td>
                <td>{row.studentDocumentNumber}</td>
                <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.studentProgram}</td>
                <td style={{ textAlign: 'center' }}>{row.studentSemester}</td>
                <td style={{ textAlign: 'center' }}>{row.creditPlan}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(row.semesterValue)}</td>
                <td style={{ textAlign: 'right' }}>{row.initialPayment ? formatCurrency(row.initialPayment) : '—'}</td>
                <td style={{ textAlign: 'right' }}>{row.financedAmount ? formatCurrency(row.financedAmount) : '—'}</td>
                <td style={{ textAlign: 'center' }}>{row.numberOfInstallments ?? '—'}</td>
                <td>{STATUS_LABELS[row.status] ?? row.status}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.createdAt)}</td>
                <td>{row.cosignerFullName || '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} style={{ textAlign: 'right', fontWeight: 700 }}>Totales</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(totalSemestre)}</td>
              <td style={{ fontWeight: 700 }}>—</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(totalFinanciado)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>

        {/* Pie de página */}
        <div style={{ marginTop: '1.5rem', paddingTop: '0.5rem', borderTop: '1px solid #ccc', fontSize: '7pt', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
          <span>CrediNOVA – Documento generado automáticamente. No requiere firma.</span>
          <span>Página 1</span>
        </div>
      </div>
    </AdminLayout>
  );
}
