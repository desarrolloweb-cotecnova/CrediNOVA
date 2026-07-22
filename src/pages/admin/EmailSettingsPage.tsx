import { useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Mail, Send, CheckCircle, XCircle, Loader2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  success: boolean;
  id?: string;
  error?: string;
  detail?: string;
  envStatus?: {
    hasApiKey: boolean;
    hasFromEmail: boolean;
    fromEmail?: string;
  };
}

export default function EmailSettingsPage() {
  usePageTitle('Configuración de Correo');
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  async function handleTestEmail() {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Ingrese un correo electrónico válido');
      return;
    }

    setIsTesting(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-email-test', {
        body: { to: testEmail },
      });

      if (error) {
        // Extraer el detalle real del error de la Edge Function
        let errDetail = error?.message || 'Error desconocido';
        try {
          const rawText = await error?.context?.text?.();
          if (rawText) {
            const parsed = JSON.parse(rawText);
            errDetail = parsed?.detail || parsed?.error || rawText;
          }
        } catch {
          // usar mensaje base
        }

        setLastResult({ success: false, error: 'Error al invocar la función', detail: errDetail });
        toast.error('Error al enviar correo de prueba');
      } else if (data?.success) {
        setLastResult({
          success: true,
          id: data.id,
          envStatus: data.envStatus,
        });
        toast.success('¡Correo de prueba enviado! Revisa tu bandeja de entrada.');
      } else {
        setLastResult({
          success: false,
          error: data?.error || 'Error desconocido',
          detail: data?.detail,
          envStatus: data?.envStatus,
        });
        toast.error('Error al enviar correo: ' + (data?.error || ''));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      setLastResult({ success: false, error: msg });
      toast.error('Error inesperado: ' + msg);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-2xl space-y-6">

        {/* Instrucciones */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm text-pretty">
            Para que el envío de correos funcione, asegúrese de haber configurado los secretos{' '}
            <strong>RESEND_API_KEY</strong> y <strong>RESEND_FROM_EMAIL</strong> en el panel de
            la plataforma (sección "Secrets / Variables de entorno").{' '}
            La API Key se obtiene en{' '}
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              resend.com/api-keys
            </a>.
          </AlertDescription>
        </Alert>

        {/* Panel de prueba de envío */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Enviar Correo de Prueba
            </CardTitle>
            <CardDescription className="text-pretty">
              Envía un correo de diagnóstico para verificar que la integración con Resend
              funciona correctamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Correo destino</Label>
              <div className="flex gap-2">
                <Input
                  id="test-email"
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTestEmail()}
                  disabled={isTesting}
                  className="flex-1"
                />
                <Button onClick={handleTestEmail} disabled={isTesting || !testEmail}>
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isTesting ? 'Enviando…' : 'Enviar prueba'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Se enviará un correo de prueba a esta dirección usando la configuración actual.
              </p>
            </div>

            {/* Resultado del último test */}
            {lastResult && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {lastResult.success ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        <span className="text-sm font-medium text-green-700">
                          Correo enviado exitosamente
                        </span>
                        {lastResult.id && (
                          <Badge variant="outline" className="ml-auto font-mono text-xs">
                            ID: {lastResult.id}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                        <span className="text-sm font-medium text-red-700">
                          Error al enviar
                        </span>
                      </>
                    )}
                  </div>

                  {/* Estado de variables de entorno */}
                  {lastResult.envStatus && (
                    <div className="rounded-md bg-muted/40 border border-border p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Estado de Secretos
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          {lastResult.envStatus.hasApiKey ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          )}
                          <span>
                            <span className="font-mono text-xs">RESEND_API_KEY</span>{' '}
                            {lastResult.envStatus.hasApiKey ? '— configurada ✓' : '— ¡NO configurada!'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {lastResult.envStatus.hasFromEmail ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          )}
                          <span>
                            <span className="font-mono text-xs">RESEND_FROM_EMAIL</span>{' '}
                            {lastResult.envStatus.hasFromEmail
                              ? `— ${lastResult.envStatus.fromEmail} ✓`
                              : '— usando valor por defecto'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detalle del error */}
                  {(lastResult.error || lastResult.detail) && (
                    <Alert variant="destructive" className="py-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs space-y-1">
                        {lastResult.error && (
                          <p><strong>Error:</strong> {lastResult.error}</p>
                        )}
                        {lastResult.detail && (
                          <p className="font-mono break-all">{lastResult.detail}</p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Guía de errores comunes */}
                  {!lastResult.success && lastResult.detail && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
                      <p className="font-semibold">Posibles causas:</p>
                      {lastResult.detail.includes('API key') || lastResult.detail.includes('401') ? (
                        <p>• La <strong>RESEND_API_KEY</strong> es incorrecta o fue revocada. Genera una nueva en resend.com/api-keys.</p>
                      ) : lastResult.detail.includes('domain') || lastResult.detail.includes('422') ? (
                        <p>• El dominio del remitente no está verificado en Resend. Verifica que <strong>cotecnova.edu.co</strong> aparezca como "Verified" en resend.com/domains.</p>
                      ) : lastResult.detail.includes('not found') || lastResult.detail.includes('404') ? (
                        <p>• La función Edge no fue desplegada correctamente. Intente guardar cambios.</p>
                      ) : (
                        <p>• Verifique los secretos <strong>RESEND_API_KEY</strong> y <strong>RESEND_FROM_EMAIL</strong> en la configuración de la plataforma.</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Referencia de eventos de correo */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Eventos de Notificación</CardTitle>
            <CardDescription className="text-pretty">
              Correos automáticos que envía el sistema según el evento. Solo se notifica a los destinatarios indicados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { evento: 'Borrador guardado',           destinatarios: 'Estudiante',          color: 'bg-muted text-muted-foreground' },
                { evento: 'Solicitud enviada',            destinatarios: 'Estudiante + Deudor', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
                { evento: 'En revisión',                  destinatarios: 'Ninguno',             color: 'bg-muted text-muted-foreground' },
                { evento: 'Requiere ajustes',             destinatarios: 'Estudiante',          color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
                { evento: 'Aprobado',                     destinatarios: 'Estudiante + Deudor', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
                { evento: 'Pendiente firma',              destinatarios: 'Ninguno',             color: 'bg-muted text-muted-foreground' },
                { evento: 'Matrícula autorizada',         destinatarios: 'Estudiante',          color: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
                { evento: 'Rechazado',                    destinatarios: 'Estudiante + Deudor', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
                { evento: 'Cancelado',                    destinatarios: 'Ninguno',             color: 'bg-muted text-muted-foreground' },
                { evento: 'Requiere aprobación rector',   destinatarios: 'Rector',              color: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300' },
              ].map((row) => (
                <div key={row.evento} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm">{row.evento}</span>
                  <Badge className={`${row.color} text-xs shrink-0`}>
                    {row.destinatarios}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
