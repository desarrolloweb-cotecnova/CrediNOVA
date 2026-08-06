import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { formatDateShort, formatDateLong, nextDayICS, toICSDate } from '@/lib/date';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, Clock, AlertCircle, FileText, Download, Mail, Printer, Camera, CalendarDays, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { getApplicationByCodeAndDocument } from '@/services/applications';
import type { Application } from '@/types/application';
import { LOGO_URL } from '@/lib/assets';

const STATUS_CONFIG = {
  en_revision: { label: 'En Revisión', color: 'bg-blue-500', icon: Clock },
  requiere_ajustes: { label: 'Requiere Ajustes', color: 'bg-yellow-500', icon: AlertCircle },
  aprobado: { label: 'Aprobado', color: 'bg-green-500', icon: CheckCircle },
  pendiente_firma: { label: 'Pendiente Firma de Garantías', color: 'bg-purple-500', icon: FileText },
  matricula_autorizada: { label: 'Matrícula Autorizada', color: 'bg-primary', icon: CheckCircle },
  rechazado: { label: 'Rechazado', color: 'bg-red-500', icon: AlertCircle },
};

export default function ApplicationViewPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [searchParams] = useSearchParams();
  const documentNumber = searchParams.get('document');
  const isNew = searchParams.get('new') === 'true';

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplication();
  }, [codigo, documentNumber]);

  const loadApplication = async () => {
    if (!codigo || !documentNumber) {
      setError('Faltan parámetros de consulta');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await getApplicationByCodeAndDocument(codigo, documentNumber);

    if (result.success && result.application) {
      setApplication(result.application);
    } else {
      setError(result.error || 'No se encontró la solicitud');
    }

    setIsLoading(false);
  };

  // ── Genera y descarga un archivo .ics con todas las cuotas de amortización ──
  function handleDownloadICS() {
    if (!application?.amortizationSchedule?.length) return;

    const escape = (s: string) => s.replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
    const toICSDate = (dateStr: string) => dateStr.replace(/-/g, '');

    const events = application.amortizationSchedule.map((row) => {
      const dateStart = toICSDate(row.dueDate);
      // DTEND es el día siguiente para eventos de un día completo
      const dateEnd = nextDayICS(row.dueDate);

      const title = `Cuota #${row.installmentNumber} – Crédito Educativo CrediNOVA`;
      const desc = escape(
        `Pago cuota #${row.installmentNumber} de tu crédito educativo.\\n` +
        `Valor: $${row.amount.toLocaleString('es-CO')}\\n` +
        `Código solicitud: ${application.applicationCode}\\n` +
        `Recuerda pagar en la fecha indicada para evitar sanciones del 10%.`
      );

      return [
        'BEGIN:VEVENT',
        `UID:cuota-${row.installmentNumber}-${application.applicationCode}@credinova`,
        `DTSTART;VALUE=DATE:${dateStart}`,
        `DTEND;VALUE=DATE:${dateEnd}`,
        `SUMMARY:${escape(title)}`,
        `DESCRIPTION:${desc}`,
        'BEGIN:VALARM',
        'TRIGGER:-P2D',
        'ACTION:DISPLAY',
        `DESCRIPTION:Recuerda: Cuota #${row.installmentNumber} vence mañana`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n');
    });

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CrediNOVA//Credito Educativo//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cuotas_Credito_${application.applicationCode}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo de calendario descargado — ábralo para agregar los eventos');
  }

  // ── Abre Google Calendar con un evento por cuota (una pestaña) ──
  function handleGoogleCalendar() {
    if (!application?.amortizationSchedule?.length) return;
    const row = application.amortizationSchedule[0];
    // Abre el primer evento; el usuario puede repetir para los demás desde el .ics
    const title = encodeURIComponent(`Cuota #${row.installmentNumber} – Crédito Educativo CrediNOVA`);
    const details = encodeURIComponent(
      `Valor: $${row.amount.toLocaleString('es-CO')}\nCódigo: ${application.applicationCode}`
    );
    const start = row.dueDate.replace(/-/g, '');
    const end = nextDayICS(row.dueDate);
    window.open(
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`,
      '_blank', 'noopener,noreferrer'
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="border-b border-border bg-background">
          <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
            <img 
              src={LOGO_URL} 
              alt="CrediNOVA" 
              className="h-12 md:h-16 w-auto"
            />
          </div>
        </header>
        <div className="container mx-auto px-4 md:px-6 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-balance">Solicitud No Encontrada</CardTitle>
              <CardDescription className="text-pretty">{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/solicitud/consultar">
                <Button>Volver a Consultar</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[application.status as keyof typeof STATUS_CONFIG];
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
          <img 
            src={LOGO_URL} 
            alt="CrediNOVA" 
            className="h-12 md:h-16 w-auto"
          />
        </div>
      </header>
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Success Message for New Applications */}
          {isNew && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-2 text-balance">¡Solicitud Creada Exitosamente!</h3>
                    <p className="text-sm text-pretty mb-4">
                      Su código de solicitud es: <strong className="text-primary">{application.applicationCode}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground text-pretty">
                      Guarde este código para consultar el estado de su solicitud. También hemos enviado esta información 
                      a los correos electrónicos registrados.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl mb-2 text-balance">
                    Solicitud {application.applicationCode}
                  </CardTitle>
                  <CardDescription className="text-base text-pretty">
                    {application.studentFullName} - {application.studentProgram}
                  </CardDescription>
                </div>
                <Badge className={`${statusConfig?.color} text-white shrink-0`}>
                  <StatusIcon className="mr-2 h-4 w-4" />
                  {statusConfig?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Estado: En Revisión */}
              {application.status === 'en_revision' && (
                <div className="space-y-4">
                  <p className="text-pretty">
                    Su solicitud está siendo revisada por nuestro equipo. La respuesta será dada en un plazo de 3 a 5 días hábiles.
                  </p>
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-sm text-muted-foreground text-pretty">
                      Para conocer el estado de su proceso, vuelva a consultar usando su código de solicitud y su número de cédula.
                    </p>
                  </div>
                </div>
              )}

              {/* Estado: Requiere Ajustes */}
              {application.status === 'requiere_ajustes' && application.rejectionReason && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                    <h4 className="font-semibold mb-2 text-balance">Motivo de Ajuste:</h4>
                    <p className="text-sm text-pretty">{application.rejectionReason}</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-pretty">
                    Por favor, corrija la información indicada y vuelva a enviar su solicitud.
                  </p>
                  <Button onClick={() => {}}>Editar Solicitud</Button>
                </div>
              )}

              {/* Estado: Aprobado */}
              {application.status === 'aprobado' && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                    <h4 className="font-semibold mb-2 text-balance">¡Felicitaciones! Su crédito educativo ha sido aprobado</h4>
                    <p className="text-sm text-pretty">
                      Plan aprobado: <strong>{application.creditPlan}</strong>
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-4 rounded-md">
                      <p className="text-sm text-muted-foreground mb-1">Valor del Semestre</p>
                      <p className="text-lg font-semibold">
                        ${application.semesterValue?.toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-md">
                      <p className="text-sm text-muted-foreground mb-1">Cuota Inicial</p>
                      <p className="text-lg font-semibold">
                        ${application.initialPayment?.toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-md">
                      <p className="text-sm text-muted-foreground mb-1">Saldo Financiado</p>
                      <p className="text-lg font-semibold">
                        {application.semesterValue != null && application.initialPayment != null
                          ? `$${(application.semesterValue - application.initialPayment).toLocaleString('es-CO')}`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Tabla de amortización de cuotas */}
                  {application.amortizationSchedule && application.amortizationSchedule.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-balance">Tabla de Cuotas a Pagar</h4>
                            <p className="text-sm text-muted-foreground text-pretty">
                              {application.numberOfInstallments} cuota{application.numberOfInstallments !== 1 ? 's' : ''} — día de pago: {application.paymentDayOfMonth} de cada mes
                            </p>
                          </div>
                        </div>

                      </div>

                      <div className="overflow-x-auto rounded-md border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border">
                              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cuota</th>
                              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha de Pago</th>
                              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {application.amortizationSchedule.map((row) => {
                              const fecha = row.dueDate
                                ? formatDateLong(row.dueDate)
                                : '—';
                              return (
                                <tr key={row.installmentNumber} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                                    #{row.installmentNumber}
                                  </td>
                                  <td className="px-4 py-2.5 whitespace-nowrap">{fecha}</td>
                                  <td className="px-4 py-2.5 text-right whitespace-nowrap font-medium">
                                    ${row.amount.toLocaleString('es-CO')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border bg-muted/20">
                              <td colSpan={2} className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">
                                Total financiado
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap font-semibold">
                                ${application.amortizationSchedule
                                    .reduce((s, r) => s + (r.amount || 0), 0)
                                    .toLocaleString('es-CO')}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Invitación a tomar nota / imprimir + agregar al calendario */}
                      <div className="space-y-3">
                        {/* Mensaje tomar nota */}
                        <div className="flex items-start gap-3 border border-border rounded-md p-4 bg-muted/10 print:border-0">
                          <Printer className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 print:hidden" />
                          <p className="text-sm text-pretty text-muted-foreground">
                            <strong className="text-foreground">Le recomendamos tomar nota o imprimir esta pantalla</strong> para tener presente las fechas y los valores de cada cuota de su crédito educativo. Recuerde que el pago debe realizarse a más tardar en la fecha indicada para evitar sanciones.
                          </p>
                        </div>

                        {/* Agregar al calendario */}
                        <div className="border border-border rounded-md p-4 space-y-3 print:hidden">
                          <div className="flex items-center gap-3">
                            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                            <h4 className="font-semibold text-balance">Agregue sus fechas de pago al calendario</h4>
                          </div>
                          <p className="text-xs text-muted-foreground text-pretty">
                            Descargue el archivo de calendario para agregar automáticamente todas las cuotas con recordatorio.
                            En iPhone se abre directamente en <strong>Calendario</strong>.
                            Para <strong>Google Calendar</strong> también puede importar el mismo archivo desde
                            <em> Configuración → Importar</em>.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {/* .ics — funciona en iPhone y Google Calendar */}
                            <Button
                              size="sm"
                              onClick={handleDownloadICS}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <CalendarDays className="h-4 w-4 mr-2" />
                              iPhone / Apple Calendar
                            </Button>
                            {/* Google Calendar — abre el primer evento como ejemplo */}
                            <Button
                              size="sm"
                              onClick={handleGoogleCalendar}
                              className="bg-[#4285F4] hover:bg-[#3367D6] text-white"
                            >
                              <CalendarDays className="h-4 w-4 mr-2" />
                              Google Calendar
                            </Button>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-muted/50 p-4 rounded-md space-y-2">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                      <h4 className="font-semibold text-balance">Recordatorios Importantes:</h4>
                    </div>
                    <ul className="text-sm space-y-1 list-disc list-inside text-pretty">
                      <li>{"Si las cuotas NO se cancelan en la fecha de pago, se aplica sanción del 10%"}</li>
                      <li>Deserción pasadas 2 semanas: se debe cancelar la totalidad del crédito educativo</li>
                    </ul>
                  </div>

                  {/* Alerta: Próximo paso - Firma de garantías */}
                  <div className="border border-border rounded-md p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <h4 className="font-semibold text-balance">Próximo Paso: Firma de Garantías</h4>
                        <p className="text-sm text-pretty">
                          El siguiente paso en su proceso es la <strong>firma electrónica del pagaré y demás documentos del crédito</strong>.
                          Estará atento a su correo electrónico, pues recibirá un mensaje para firmar estos documentos.
                        </p>
                        <p className="text-sm text-pretty">
                          El correo de invitación para la firma electrónica es enviado por <strong>ZapSign</strong>.
                          Si no lo encuentra en su bandeja de entrada, <strong>revise la carpeta de SPAM</strong>.
                        </p>
                        <p className="text-sm text-muted-foreground text-pretty">
                          La firma electrónica debe ser completada tanto por el <strong>Estudiante</strong> como por el <strong>Deudor Solidario</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Estado: Pendiente Firma */}
              {application.status === 'pendiente_firma' && (
                <div className="space-y-6">

                  {/* Aviso principal: revisar correo */}
                  <div className="flex items-start gap-3 border border-purple-200 bg-purple-50 dark:bg-purple-950/20 rounded-md p-4">
                    <Mail className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-balance">
                        Revise su correo electrónico
                      </h4>
                      <p className="text-sm text-pretty text-purple-800 dark:text-purple-200">
                        Le hemos enviado un correo de parte de <strong>ZapSign</strong> con el enlace para
                        firmar electrónicamente el pagaré y demás documentos de su crédito educativo.
                      </p>
                      <p className="text-sm text-pretty text-purple-700 dark:text-purple-300">
                        Si no lo encuentra en su bandeja de entrada, <strong>revise la carpeta de SPAM o Correo No Deseado</strong>.
                        La firma debe ser completada tanto por el <strong>Estudiante</strong> como por el <strong>Deudor Solidario</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Preparación para el proceso de firma */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-balance">Prepárese para el proceso de firma</h4>
                    <p className="text-sm text-muted-foreground text-pretty">
                      ZapSign le solicitará capturar una foto de su documento de identidad y una selfie para
                      verificar su identidad. Siga estas recomendaciones para completar el proceso sin inconvenientes.
                    </p>

                    {/* Recomendaciones: Foto del documento */}
                    <div className="border border-border rounded-md p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <h5 className="font-semibold text-base">{"Recomendaciones para la foto del ID"}</h5>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="text-sm text-pretty min-w-0">
                            <strong>Visibilidad total:</strong>{' '}
                            Asegúrate de que los cuatro bordes del documento sean visibles y estén dentro del marco.
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="text-sm text-pretty min-w-0">
                            <strong>Evita reflejos:</strong>{' '}
                            Coloca el documento sobre una superficie plana o sostenlo firmemente en tu mano,
                            pero cuida que la luz del flash o lámparas no generen brillos que tapen los datos o la fotografía.
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="text-sm text-pretty min-w-0">
                            <strong>Nitidez:</strong>{' '}
                            Evita fotos borrosas. El texto, tu número de identificación y tu foto física deben ser perfectamente legibles.
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="text-sm text-pretty min-w-0">
                            <strong>Ambos lados:</strong>{' '}
                            El sistema te pedirá capturar tanto el anverso (frente) como el reverso de tu documento.
                          </div>
                        </li>
                      </ul>
                    </div>

                    {/* Recomendaciones: Selfie */}
                    <div className="border border-border rounded-md p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-primary shrink-0" />
                        <h5 className="font-semibold text-base">Recomendaciones para la selfie</h5>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="text-sm text-pretty min-w-0">
                            <strong>Buena iluminación:</strong>{' '}
                            Ubícate de frente a una ventana o en un lugar donde recibas luz natural directamente en tu rostro.
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="text-sm text-pretty min-w-0">
                            <strong>Sin accesorios:</strong>{' '}
                            Retira gafas, gorros, tapabocas o audífonos.
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="text-sm text-pretty min-w-0">
                            <strong>Posición y postura:</strong>{' '}
                            Mantén el teléfono a la altura de tus ojos y centra tu rostro en el óvalo que aparece en pantalla.
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>

                </div>
              )}

              {/* Estado: Matrícula Autorizada */}
              {application.status === 'matricula_autorizada' && (
                <div className="space-y-6">
                  <div className="bg-primary/10 border border-primary p-6 rounded-md text-center">
                    <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h3 className="text-2xl font-semibold mb-2 text-balance">¡Proceso Completado!</h3>
                    <p className="text-pretty">{"Su matrícula financiera ha sido autorizada. Puede dirigirse a la Oficina de Registro y Control Académico para proceder con el proceso de Matrícula Académica."}</p>
                  </div>

                </div>
              )}
            </CardContent>
          </Card>

          {/* Application Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-balance">Información Completa de la Solicitud</CardTitle>
              <CardDescription>Todos los datos registrados en el formulario</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Sección A: Datos del Estudiante */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-balance">
                    Sección A – Información del Estudiante
                  </h3>
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Nombre Completo</dt>
                      <dd className="font-medium">{application.studentFullName || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Tipo de Documento</dt>
                      <dd className="font-medium">{application.studentDocumentType || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Número de Documento</dt>
                      <dd className="font-medium">{application.studentDocumentNumber || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Fecha de Expedición</dt>
                      <dd className="font-medium">
                        {application.studentDocumentExpeditionDate 
                          ? formatDateShort(application.studentDocumentExpeditionDate)
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Fecha de Nacimiento</dt>
                      <dd className="font-medium">
                        {application.studentBirthDate 
                          ? formatDateShort(application.studentBirthDate)
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Teléfono</dt>
                      <dd className="font-medium">{application.studentPhone || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Email</dt>
                      <dd className="font-medium">{application.studentEmail || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Dirección</dt>
                      <dd className="font-medium">{application.studentAddress || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Barrio</dt>
                      <dd className="font-medium">{application.studentNeighborhood || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Ciudad</dt>
                      <dd className="font-medium">{application.studentCity || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Departamento</dt>
                      <dd className="font-medium">{application.studentDepartment || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Programa Académico</dt>
                      <dd className="font-medium">{application.studentProgram || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Semestre</dt>
                      <dd className="font-medium">{application.studentSemester || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Jornada</dt>
                      <dd className="font-medium">{application.studentShift || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">¿Trabaja Actualmente?</dt>
                      <dd className="font-medium">{application.studentWorks ? 'Sí' : 'No'}</dd>
                    </div>
                    {application.studentWorks && (
                      <>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Empresa</dt>
                          <dd className="font-medium">{application.studentCompanyName || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Salario</dt>
                          <dd className="font-medium">
                            {application.studentSalary 
                              ? `$${Number(application.studentSalary).toLocaleString('es-CO')}`
                              : 'N/A'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Dirección de la Empresa</dt>
                          <dd className="font-medium">{application.studentCompanyAddress || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Teléfono de la Empresa</dt>
                          <dd className="font-medium">{application.studentCompanyPhone || 'N/A'}</dd>
                        </div>
                      </>
                    )}
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Parentesco con Deudor Solidario</dt>
                      <dd className="font-medium">{application.studentRelationshipToCosigner || 'N/A'}</dd>
                    </div>
                  </div>
                </div>

                {/* Sección B: Datos del Deudor Solidario */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-balance">
                    Sección B – Información del Deudor Solidario
                  </h3>
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Nombre Completo</dt>
                      <dd className="font-medium">{application.cosignerFullName || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Tipo de Documento</dt>
                      <dd className="font-medium">{application.cosignerDocumentType || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Número de Documento</dt>
                      <dd className="font-medium">{application.cosignerDocumentNumber || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Fecha de Expedición</dt>
                      <dd className="font-medium">
                        {application.cosignerDocumentExpeditionDate 
                          ? formatDateShort(application.cosignerDocumentExpeditionDate)
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Fecha de Nacimiento</dt>
                      <dd className="font-medium">
                        {application.cosignerBirthDate 
                          ? formatDateShort(application.cosignerBirthDate)
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Género</dt>
                      <dd className="font-medium">{application.cosignerGender || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Estado Civil</dt>
                      <dd className="font-medium">{application.cosignerMaritalStatus || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Número de Dependientes</dt>
                      <dd className="font-medium">{application.cosignerDependents ?? 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Dirección</dt>
                      <dd className="font-medium">{application.cosignerAddress || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Barrio</dt>
                      <dd className="font-medium">{application.cosignerNeighborhood || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Ciudad</dt>
                      <dd className="font-medium">{application.cosignerCity || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Departamento</dt>
                      <dd className="font-medium">{application.cosignerDepartment || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Nivel de Educación</dt>
                      <dd className="font-medium">{application.cosignerEducationLevel || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Teléfono</dt>
                      <dd className="font-medium">{application.cosignerPhone || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Email</dt>
                      <dd className="font-medium">{application.cosignerEmail || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Ocupación</dt>
                      <dd className="font-medium">{application.cosignerOccupation || 'N/A'}</dd>
                    </div>

                    {/* Información del Cónyuge si está casado */}
                    {application.cosignerMaritalStatus === 'Casado(a)' && (
                      <>
                        <div className="md:col-span-2 mt-4">
                          <h4 className="font-semibold mb-3 text-balance">Información del Cónyuge</h4>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Nombre del Cónyuge</dt>
                          <dd className="font-medium">{application.cosignerSpouseName || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Empresa del Cónyuge</dt>
                          <dd className="font-medium">{application.cosignerSpouseCompany || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Dirección Empresa del Cónyuge</dt>
                          <dd className="font-medium">{application.cosignerSpouseCompanyAddress || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Teléfono Empresa del Cónyuge</dt>
                          <dd className="font-medium">{application.cosignerSpouseCompanyPhone || 'N/A'}</dd>
                        </div>
                      </>
                    )}

                    {/* Información Laboral */}
                    <div className="md:col-span-2 mt-4">
                      <h4 className="font-semibold mb-3 text-balance">Información Laboral</h4>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Empresa</dt>
                      <dd className="font-medium">{application.cosignerCompany || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Dirección de la Empresa</dt>
                      <dd className="font-medium">{application.cosignerCompanyAddress || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Cargo</dt>
                      <dd className="font-medium">{application.cosignerPosition || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Teléfono Empresa</dt>
                      <dd className="font-medium">{application.cosignerCompanyPhone || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Extensión</dt>
                      <dd className="font-medium">{application.cosignerCompanyExtension || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Ciudad de la Empresa</dt>
                      <dd className="font-medium">{application.cosignerCompanyCity || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Tipo de Contrato</dt>
                      <dd className="font-medium">{application.cosignerContractType || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Fecha de Vinculación</dt>
                      <dd className="font-medium">
                        {application.cosignerHireDate 
                          ? formatDateShort(application.cosignerHireDate)
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Ingresos Mensuales</dt>
                      <dd className="font-medium">
                        {application.cosignerIncome 
                          ? `$${Number(application.cosignerIncome).toLocaleString('es-CO')}`
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground mb-1">Gastos Mensuales</dt>
                      <dd className="font-medium">
                        {application.cosignerMonthlyExpenses 
                          ? `$${Number(application.cosignerMonthlyExpenses).toLocaleString('es-CO')}`
                          : 'N/A'}
                      </dd>
                    </div>
                  </div>
                </div>

                <Separator />
                <div>
                  <p className="text-sm font-semibold mb-3">Referencias</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Referencia Familiar</p>
                      <p className="text-base">{application.cosignerFamilyReferenceName || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Tel: {application.cosignerFamilyReferencePhone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Referencia Personal</p>
                      <p className="text-base">{application.cosignerPersonalReferenceName || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Tel: {application.cosignerPersonalReferencePhone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Referencia Comercial</p>
                      <p className="text-base">{application.cosignerCommercialReferenceName || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Tel: {application.cosignerCommercialReferencePhone || 'N/A'}</p>
                    </div>
                  </div>

                  {application.cosignerOccupation === 'Independiente' && (
                    <>
                      <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Referencias Comerciales (Independiente)</p>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Principal Proveedor</p>
                            <p className="text-base">{application.cosignerMainSupplierName || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">Tel: {application.cosignerMainSupplierPhone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Principal Cliente</p>
                            <p className="text-base">{application.cosignerMainClientName || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">Tel: {application.cosignerMainClientPhone || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección C: Pago Estudio de Crédito Educativo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-balance">Sección C – Pago Estudio de Crédito Educativo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Número de Recibo</dt>
                  <dd className="font-medium">{application.creditStudyReceiptNumber || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Fecha de Pago</dt>
                  <dd className="font-medium">
                    {application.creditStudyPaymentDate 
                      ? formatDateShort(application.creditStudyPaymentDate)
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Valor Pagado</dt>
                  <dd className="font-medium">
                    {application.creditStudyAmount 
                      ? `$${Number(application.creditStudyAmount).toLocaleString('es-CO')}`
                      : 'N/A'}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección D: Selección Plan Crédito Educativo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-balance">Sección D – Selección Plan Crédito Educativo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Plan</dt>
                  <dd className="font-medium">{application.creditPlan || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Valor del Semestre</dt>
                  <dd className="font-medium">
                    {application.semesterValue 
                      ? `$${Number(application.semesterValue).toLocaleString('es-CO')}`
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Cuota Inicial</dt>
                  <dd className="font-medium">
                    {application.initialPayment 
                      ? `$${Number(application.initialPayment).toLocaleString('es-CO')}`
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Saldo a Financiar</dt>
                  <dd className="font-medium">
                    {application.financedAmount 
                      ? `$${Number(application.financedAmount).toLocaleString('es-CO')}`
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Número de Cuotas</dt>
                  <dd className="font-medium">{application.numberOfInstallments ?? 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Día de Pago</dt>
                  <dd className="font-medium">{application.paymentDayOfMonth ?? 'N/A'}</dd>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección E: Pago Cuota Inicial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-balance">Sección E – Pago Cuota Inicial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Número de Recibo</dt>
                  <dd className="font-medium">{application.initialPaymentReceiptNumber || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Fecha de Pago</dt>
                  <dd className="font-medium">
                    {application.initialPaymentDate 
                      ? formatDateShort(application.initialPaymentDate)
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Valor Pagado</dt>
                  <dd className="font-medium">
                    {application.initialPaymentAmount 
                      ? `$${Number(application.initialPaymentAmount).toLocaleString('es-CO')}`
                      : 'N/A'}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección F: Autorizaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-balance">Sección F – Autorizaciones y Declaraciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Autorización del Estudiante</dt>
                  <dd className="font-medium">
                    {application.studentAuthorizationAccepted ? (
                      <span className="text-green-600 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Aceptada
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No aceptada</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Autorización del Deudor Solidario</dt>
                  <dd className="font-medium">
                    {application.cosignerAuthorizationAccepted ? (
                      <span className="text-green-600 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Aceptada
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No aceptada</span>
                    )}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-balance">Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Fecha de Creación</dt>
                  <dd className="font-medium">
                    {application.createdAt 
                      ? new Date(application.createdAt).toLocaleString('es-CO')
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Última Actualización</dt>
                  <dd className="font-medium">
                    {application.updatedAt 
                      ? new Date(application.updatedAt).toLocaleString('es-CO')
                      : 'N/A'}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
