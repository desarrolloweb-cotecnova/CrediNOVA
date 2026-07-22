import { supabase } from '@/lib/supabase';
import type { Application } from '@/types/application';

// ── Tipos ──────────────────────────────────────────────────────────────────────
export type EmailEvent =
  | 'borrador_guardado'
  | 'solicitud_enviada'
  | 'en_revision'
  | 'requiere_ajustes'
  | 'aprobado'
  | 'pendiente_firma'
  | 'matricula_autorizada'
  | 'rechazado'
  | 'cancelado'
  | 'rector_required';

interface SendEmailParams {
  event: EmailEvent;
  to: string;
  recipientName: string;
  recipientRole: 'estudiante' | 'deudor_solidario' | 'rector';
  applicationCode?: string;
  draftCode?: string;
  studentName?: string;
  program?: string;
  creditPlan?: string;
  semesterValue?: number;
  initialPayment?: number;
  financedAmount?: number;
  numberOfInstallments?: number;
  rejectionReason?: string;
  consultUrl?: string;
  // Campos exclusivos para notificación al rector
  sectionLabel?: string;
  gestorNotes?: string;
  applicationAdminUrl?: string;
}

// ── URL de consulta pública ────────────────────────────────────────────────────
const CONSULT_URL = `${window.location.origin}/solicitud/consultar`;

// ── Función principal ──────────────────────────────────────────────────────────
async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { ...params, consultUrl: CONSULT_URL },
    });

    if (error) {
      // Extraer el mensaje real del error de la Edge Function (incluye detail de Resend)
      let errDetail = error?.message || 'Error desconocido';
      try {
        const rawText = await error?.context?.text?.();
        if (rawText) {
          const parsed = JSON.parse(rawText);
          errDetail = parsed?.detail || parsed?.error || rawText;
        }
      } catch {
        // Si no se puede parsear, usar el mensaje base
      }
      console.error('[emailService] Error al enviar correo:', errDetail);
      const { toast } = await import('sonner');
      toast.warning(`⚠️ No se pudo enviar la notificación por correo: ${errDetail}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[emailService] Excepción al enviar correo:', err);
    return false;
  }
}

// ── Helpers públicos por evento ────────────────────────────────────────────────

/**
 * Correo cuando el estudiante guarda un borrador
 */
export async function notifyDraftSaved(params: {
  studentName: string;
  studentEmail: string;
  draftCode: string;
}): Promise<void> {
  await sendEmail({
    event: 'borrador_guardado',
    to: params.studentEmail,
    recipientName: params.studentName,
    recipientRole: 'estudiante',
    draftCode: params.draftCode,
  });
}

/**
 * Correos cuando se envía la solicitud (estudiante + deudor solidario)
 */
export async function notifyApplicationSubmitted(params: {
  studentName: string;
  studentEmail: string;
  cosignerName: string;
  cosignerEmail: string;
  applicationCode: string;
  program: string;
  creditPlan: string;
  semesterValue: number;
}): Promise<void> {
  // Correo al estudiante
  await sendEmail({
    event: 'solicitud_enviada',
    to: params.studentEmail,
    recipientName: params.studentName,
    recipientRole: 'estudiante',
    applicationCode: params.applicationCode,
    studentName: params.studentName,
    program: params.program,
    creditPlan: params.creditPlan,
    semesterValue: params.semesterValue,
  });

  // Correo al deudor solidario
  if (params.cosignerEmail) {
    await sendEmail({
      event: 'solicitud_enviada',
      to: params.cosignerEmail,
      recipientName: params.cosignerName,
      recipientRole: 'deudor_solidario',
      applicationCode: params.applicationCode,
      studentName: params.studentName,
      program: params.program,
      creditPlan: params.creditPlan,
      semesterValue: params.semesterValue,
    });
  }
}

/**
 * Destinatarios por evento de cambio de estado:
 *   'none'    → no se envía ningún correo
 *   'student' → solo al estudiante
 *   'both'    → estudiante + deudor solidario
 *
 * Configuración aprobada:
 *   en_revision          → Ninguno
 *   requiere_ajustes     → Solo Estudiante
 *   aprobado             → Estudiante + Deudor
 *   pendiente_firma      → Ninguno
 *   matricula_autorizada → Solo Estudiante
 *   rechazado            → Estudiante + Deudor
 *   cancelado            → Ninguno
 */
const EVENT_RECIPIENTS: Partial<Record<EmailEvent, 'none' | 'student' | 'both'>> = {
  en_revision:          'none',
  requiere_ajustes:     'student',
  aprobado:             'both',
  pendiente_firma:      'none',
  matricula_autorizada: 'student',
  rechazado:            'both',
  cancelado:            'none',
};

/**
 * Correos cuando cambia el estado de una solicitud (desde el admin).
 * La lógica de destinatarios se rige por EVENT_RECIPIENTS.
 */
export async function notifyStatusChange(
  application: Application,
  newStatus: string
): Promise<void> {
  const event = newStatus as EmailEvent;
  const recipients = EVENT_RECIPIENTS[event];

  // Si el evento no está en el mapa o es 'none', no se envía correo
  if (!recipients || recipients === 'none') return;

  const commonParams = {
    event,
    applicationCode: application.applicationCode,
    studentName: application.studentFullName,
    program: application.studentProgram,
    creditPlan: application.creditPlan,
    semesterValue: application.semesterValue,
    initialPayment: application.initialPayment,
    financedAmount: application.financedAmount,
    numberOfInstallments: application.numberOfInstallments,
    rejectionReason: application.rejectionReason,
  };

  // Siempre enviar al estudiante cuando recipients es 'student' o 'both'
  await sendEmail({
    ...commonParams,
    to: application.studentEmail,
    recipientName: application.studentFullName,
    recipientRole: 'estudiante',
  });

  // Enviar al deudor solidario solo cuando recipients es 'both'
  if (recipients === 'both' && application.cosignerEmail) {
    await sendEmail({
      ...commonParams,
      to: application.cosignerEmail,
      recipientName: application.cosignerFullName,
      recipientRole: 'deudor_solidario',
    });
  }
}

/**
 * Correo al rector cuando una sección requiere su aprobación
 */
export async function notifyRectorRequired(params: {
  applicationCode: string;
  studentName: string;
  program: string;
  sectionLabel: string;
  gestorNotes: string;
  applicationId: string;
}): Promise<void> {
  const adminUrl = `${window.location.origin}/admin/solicitudes/${params.applicationId}`;
  await sendEmail({
    event: 'rector_required',
    to: 'rector@cotecnova.edu.co',
    recipientName: 'Señor(a) Rector(a)',
    recipientRole: 'rector',
    applicationCode: params.applicationCode,
    studentName: params.studentName,
    program: params.program,
    sectionLabel: params.sectionLabel,
    gestorNotes: params.gestorNotes,
    applicationAdminUrl: adminUrl,
  });
}
