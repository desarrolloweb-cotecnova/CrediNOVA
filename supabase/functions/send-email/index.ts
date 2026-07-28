import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface EmailPayload {
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
  sectionLabel?: string;
  gestorNotes?: string;
  applicationAdminUrl?: string;
}

type EmailEvent =
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

// ── Colores y etiquetas por estado ────────────────────────────────────────────
const STATUS_CONFIG: Record<EmailEvent, { subject: string; badgeColor: string; badgeLabel: string }> = {
  borrador_guardado: {
    subject: 'Tu borrador de solicitud fue guardado – CrediNOVA',
    badgeColor: '#6b7280',
    badgeLabel: 'Borrador',
  },
  solicitud_enviada: {
    subject: 'Solicitud recibida – CrediNOVA',
    badgeColor: '#3b82f6',
    badgeLabel: 'En Revisión',
  },
  en_revision: {
    subject: 'Tu solicitud está en revisión – CrediNOVA',
    badgeColor: '#3b82f6',
    badgeLabel: 'En Revisión',
  },
  requiere_ajustes: {
    subject: 'Tu solicitud requiere ajustes – CrediNOVA',
    badgeColor: '#d97706',
    badgeLabel: 'Requiere Ajustes',
  },
  aprobado: {
    subject: '¡Tu crédito educativo fue aprobado! – CrediNOVA',
    badgeColor: '#16a34a',
    badgeLabel: 'Aprobado',
  },
  pendiente_firma: {
    subject: 'Acción requerida: firma tu pagaré – CrediNOVA',
    badgeColor: '#7c3aed',
    badgeLabel: 'Pendiente Firma',
  },
  matricula_autorizada: {
    subject: '¡Matrícula autorizada! – CrediNOVA',
    badgeColor: '#0f766e',
    badgeLabel: 'Matrícula Autorizada',
  },
  rechazado: {
    subject: 'Resultado de tu solicitud – CrediNOVA',
    badgeColor: '#dc2626',
    badgeLabel: 'Rechazado',
  },
  cancelado: {
    subject: 'Tu solicitud fue cancelada – CrediNOVA',
    badgeColor: '#881337',
    badgeLabel: 'Cancelado',
  },
  rector_required: {
    subject: 'Solicitud de crédito requiere su aprobación – CrediNOVA',
    badgeColor: '#7c3aed',
    badgeLabel: 'Aprobación Requerida',
  },
};

// ── Utilidades de formato ─────────────────────────────────────────────────────
function formatCOP(value?: number): string {
  if (!value) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

// ── Generador de contenido del correo por evento ──────────────────────────────
function buildEmailBody(payload: EmailPayload): string {
  const {
    event,
    recipientName,
    recipientRole,
    applicationCode,
    draftCode,
    studentName,
    program,
    creditPlan,
    semesterValue,
    initialPayment,
    financedAmount,
    numberOfInstallments,
    rejectionReason,
    consultUrl,
    sectionLabel,
    gestorNotes,
    applicationAdminUrl,
  } = payload;

  const isStudent = recipientRole === 'estudiante';
  const appUrl = consultUrl || 'https://credinova.cotecnova.edu.co/solicitud/consultar';
  const config = STATUS_CONFIG[event];

  // ── Bloque de información de la solicitud (reutilizable) ──────────────────
  const infoBlock = applicationCode
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background: #f8f9fb; border-radius: 8px; overflow: hidden;">
        <tr><td style="padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${applicationCode ? `<tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Código de solicitud</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px; text-align: right;">${applicationCode}</td></tr>` : ''}
            ${studentName && !isStudent ? `<tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Estudiante</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px; text-align: right;">${studentName}</td></tr>` : ''}
            ${program ? `<tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Programa</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px; text-align: right;">${program}</td></tr>` : ''}
            ${creditPlan ? `<tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Plan de crédito</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px; text-align: right;">Plan ${creditPlan}</td></tr>` : ''}
            ${semesterValue ? `<tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Valor semestre</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px; text-align: right;">${formatCOP(semesterValue)}</td></tr>` : ''}
          </table>
        </td></tr>
      </table>`
    : '';

  // ── Plan de pagos (solo para aprobado) ────────────────────────────────────
  const paymentBlock = event === 'aprobado' && (initialPayment || financedAmount)
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; overflow: hidden;">
        <tr><td style="padding: 16px 20px; border-bottom: 1px solid #bbf7d0;">
          <p style="margin: 0; font-weight: 600; font-size: 13px; color: #166534;">Plan de Pagos Aprobado</p>
        </td></tr>
        <tr><td style="padding: 16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${initialPayment ? `<tr><td style="padding: 3px 0; color: #374151; font-size: 13px;">Cuota inicial</td><td style="padding: 3px 0; font-weight: 700; font-size: 14px; text-align: right; color: #166534;">${formatCOP(initialPayment)}</td></tr>` : ''}
            ${financedAmount ? `<tr><td style="padding: 3px 0; color: #374151; font-size: 13px;">Monto financiado</td><td style="padding: 3px 0; font-weight: 600; font-size: 13px; text-align: right;">${formatCOP(financedAmount)}</td></tr>` : ''}
            ${numberOfInstallments ? `<tr><td style="padding: 3px 0; color: #374151; font-size: 13px;">Número de cuotas</td><td style="padding: 3px 0; font-weight: 600; font-size: 13px; text-align: right;">${numberOfInstallments} cuotas mensuales</td></tr>` : ''}
          </table>
        </td></tr>
      </table>`
    : '';

  // ── Mensaje principal por evento ──────────────────────────────────────────
  let mainContent = '';

  switch (event) {
    case 'borrador_guardado':
      mainContent = `
        <p style="margin: 0 0 12px; color: #374151;">Hola <strong>${recipientName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #374151;">Tu borrador de solicitud de crédito educativo fue guardado exitosamente.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
          <tr><td style="padding: 16px 20px;">
            <p style="margin: 0 0 6px; font-weight: 600; font-size: 13px; color: #1e40af;">Código de Recuperación</p>
            <p style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #1d4ed8; font-family: monospace;">${draftCode}</p>
            <p style="margin: 8px 0 0; font-size: 12px; color: #3b82f6;">Guarda este código. Lo necesitarás para continuar tu solicitud.</p>
          </td></tr>
        </table>
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Para continuar donde lo dejaste, haz clic en "Recuperar Borrador" en la página principal e ingresa el código anterior junto con tu número de documento.</p>`;
      break;

    case 'solicitud_enviada':
      mainContent = `
        <p style="margin: 0 0 12px; color: #374151;">Hola <strong>${recipientName}</strong>,</p>
        ${isStudent
          ? `<p style="margin: 0 0 16px; color: #374151;">Tu solicitud de crédito educativo fue recibida y está siendo evaluada por nuestro equipo.</p>`
          : `<p style="margin: 0 0 16px; color: #374151;">Has sido registrado como <strong>deudor solidario</strong> en la solicitud de crédito educativo del estudiante <strong>${studentName}</strong>.</p>`
        }
        ${infoBlock}
        <p style="margin: 0 0 8px; color: #374151; font-size: 13px;">⏱ El proceso de revisión toma entre <strong>3 a 5 días hábiles</strong>. Te notificaremos cuando haya una actualización.</p>`;
      break;

    case 'en_revision':
      mainContent = `
        <p style="margin: 0 0 12px; color: #374151;">Hola <strong>${recipientName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #374151;">Tu solicitud de crédito educativo está siendo revisada por nuestro equipo.</p>
        ${infoBlock}
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">No necesitas hacer nada en este momento. Te avisaremos tan pronto tengamos una respuesta.</p>`;
      break;

    case 'requiere_ajustes':
      mainContent = `
        <p style="margin: 0 0 12px; color: #374151;">Hola <strong>${recipientName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #374151;">Revisamos tu solicitud y necesitamos que realices algunos ajustes o correcciones en la información.</p>
        ${infoBlock}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
          <tr><td style="padding: 14px 18px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">📋 Comunícate con la oficina de Crédito y Cartera de Cotecnova para conocer el detalle de los ajustes requeridos e indicar las correcciones necesarias.</p>
          </td></tr>
        </table>`;
      break;

    case 'aprobado':
      mainContent = `
        <p style="margin: 0 0 12px; color: #374151;">Hola <strong>${recipientName}</strong>,</p>
        ${isStudent
          ? `<p style="margin: 0 0 16px; color: #374151;">¡Excelentes noticias! Tu solicitud de crédito educativo fue <strong>aprobada</strong>.</p>`
          : `<p style="margin: 0 0 16px; color: #374151;">La solicitud de crédito educativo de <strong>${studentName}</strong>, en la que participas como deudor solidario, fue <strong>aprobada</strong>.</p>`
        }
        ${infoBlock}
        ${paymentBlock}
        ${isStudent ? `<p style="margin: 0 0 8px; color: #374151; font-size: 13px;"><strong>Próximo paso:</strong> Realiza el pago de la cuota inicial y notifícalo en la oficina de Crédito y Cartera. Luego recibirás el enlace para la firma digital del pagaré.</p>` : ''}`;
      break;

    case 'pendiente_firma':
      mainContent = `
        <p style="margin: 0 0 12px; color: #374151;">Hola <strong>${recipientName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #374151;">El pago de la cuota inicial fue registrado. El siguiente paso es la <strong>firma digital</strong> del pagaré y garantías.</p>
        ${infoBlock}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px;">
          <tr><td style="padding: 16px 20px;">
            <p style="margin: 0 0 8px; font-weight: 600; font-size: 13px; color: #6b21a8;">Instrucciones para la firma digital (ZapSign)</p>
            <ul style="margin: 0; padding-left: 18px; color: #374151; font-size: 13px; line-height: 1.8;">
              <li>Recibirás un enlace de firma por el canal habilitado por la oficina de crédito.</li>
              <li>Ten lista una foto de tu cédula por <strong>ambas caras</strong>.</li>
              <li>Prepara una <strong>selfie</strong> sosteniendo tu cédula frente a tu cara.</li>
              <li>Asegúrate de tener buena iluminación al tomar las fotos.</li>
              <li>El proceso es completamente digital; no necesitas presentarte.</li>
            </ul>
          </td></tr>
        </table>`;
      break;

    case 'matricula_autorizada':
      mainContent = `
        <p style="margin: 0 0 12px; color: #374151;">Hola <strong>${recipientName}</strong>,</p>
        ${isStudent
          ? `<p style="margin: 0 0 16px; color: #374151;">🎉 ¡Todo listo! Las garantías han sido firmadas y tu matrícula ha sido <strong>autorizada</strong>.</p>
             <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
               <tr><td style="padding: 14px 18px;">
                 <p style="margin: 0; font-size: 13px; color: #166534;"><strong>Próximo paso:</strong> Preséntate en la oficina de Registro y Admisiones con tu documento de identidad para formalizar tu matrícula.</p>
               </td></tr>
             </table>`
          : `<p style="margin: 0 0 16px; color: #374151;">El proceso de crédito educativo de <strong>${studentName}</strong> ha sido completado y la matrícula fue <strong>autorizada</strong>. No necesitas realizar ninguna acción adicional.</p>`
        }
        ${infoBlock}`;
      break;

    case 'rechazado':
      mainContent = `
        <p style="margin: 0 0 12px; color: #374151;">Hola <strong>${recipientName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #374151;">Luego de evaluar la solicitud de crédito educativo, lamentamos informarte que <strong>no fue posible aprobarla</strong> en esta oportunidad.</p>
        ${infoBlock}
        ${rejectionReason ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
          <tr><td style="padding: 14px 18px;">
            <p style="margin: 0 0 4px; font-weight: 600; font-size: 13px; color: #991b1b;">Motivo</p>
            <p style="margin: 0; font-size: 13px; color: #374151;">${rejectionReason}</p>
          </td></tr>
        </table>` : ''}
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Si tienes preguntas, comunícate con la oficina de Crédito y Cartera de Cotecnova. También puedes explorar otras opciones de financiación como <strong>Valcredit</strong> o <strong>ICETEX</strong>.</p>`;
      break;

    case 'cancelado':
      mainContent = `
        <p style="margin: 0 0 12px; color: #374151;">Hola <strong>${recipientName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #374151;">Tu solicitud de crédito educativo ha sido <strong>cancelada</strong>.</p>
        ${infoBlock}
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Si crees que esto fue un error, comunícate con la oficina de Crédito y Cartera de Cotecnova.</p>`;
      break;

    case 'rector_required':
      mainContent = `
        <p style="margin: 0 0 12px; color: #374151;">Estimado(a) <strong>${recipientName}</strong>,</p>
        <p style="margin: 0 0 16px; color: #374151;">Una sección de la siguiente solicitud de crédito educativo requiere <strong>su aprobación</strong> para continuar con el proceso.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background: #f8f9fb; border-radius: 8px; overflow: hidden;">
          <tr><td style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${applicationCode ? `<tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Código de solicitud</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px; text-align: right;">${applicationCode}</td></tr>` : ''}
              ${studentName ? `<tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Estudiante</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px; text-align: right;">${studentName}</td></tr>` : ''}
              ${program ? `<tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Programa</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px; text-align: right;">${program}</td></tr>` : ''}
            </table>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px;">
          <tr><td style="padding: 16px 20px; border-bottom: 1px solid #e9d5ff;">
            <p style="margin: 0; font-weight: 600; font-size: 13px; color: #6b21a8;">Sección que Requiere Aprobación</p>
          </td></tr>
          <tr><td style="padding: 16px 20px;">
            <p style="margin: 0 0 8px; font-weight: 600; font-size: 14px; color: #374151;">${sectionLabel || 'Sección sin identificar'}</p>
            ${gestorNotes ? `<p style="margin: 0; font-size: 13px; color: #6b7280; font-style: italic;">"${gestorNotes}"</p>` : ''}
          </td></tr>
        </table>
        <p style="margin: 0 0 8px; color: #374151; font-size: 13px;">Ingrese al panel administrativo de CrediNOVA para revisar la solicitud completa y tomar su decisión.</p>
        ${applicationAdminUrl ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 0;">
          <tr><td align="center">
            <a href="${applicationAdminUrl}" style="display: inline-block; background: #6d28d9; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
              Revisar Solicitud en el Panel
            </a>
          </td></tr>
        </table>` : ''}`;
      break;
  }

  // ── Botón de consulta ─────────────────────────────────────────────────────
  const consultBtn = applicationCode
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 0;">
        <tr>
          <td align="center">
            <a href="${appUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
              Consultar mi Solicitud
            </a>
          </td>
        </tr>
      </table>`
    : '';

  // ── Plantilla HTML completa ───────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.subject}</title>
</head>
<body style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">

          <!-- Encabezado con logo -->
          <tr>
            <td style="background: #ffffff; padding: 28px 32px 20px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 0.2px;"><span style="color: #006134;">Credi</span><span style="color: #F06C14;">NOVA</span></span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background: ${config.badgeColor}; color: #ffffff; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;">${config.badgeLabel}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding: 28px 32px;">
              ${mainContent}
              ${consultBtn}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8f9fb; padding: 20px 32px; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #9ca3af; text-align: center;">
                Corporación de Estudios Tecnológicos del Norte del Valle – Cotecnova
              </p>
              <p style="margin: 0; font-size: 11px; color: #d1d5db; text-align: center;">
                Este correo es generado automáticamente. Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Handler principal ─────────────────────────────────────────────────────────
/**
 * Construye un `from` válido para Resend a partir del secret RESEND_FROM_EMAIL.
 *
 * Resend rechaza el envío (422 validation_error) si el campo no tiene la forma
 * `correo@dominio` o `Nombre <correo@dominio>`. Dos casos lo rompían:
 *
 *  1. El secret ya venía como `Nombre <correo@dominio>`: al anteponerle otro
 *     nombre quedaba `X <Nombre <correo@dominio>>`, que es inválido.
 *  2. El nombre visible llevaba un guion largo «–» (U+2013). Un display name
 *     sin comillas debe ser ASCII; si no, hay que entrecomillarlo.
 *
 * Aquí se respeta el valor si ya trae nombre, y si es solo un correo se le
 * antepone un nombre entrecomillado y en ASCII.
 */
function buildFrom(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '"CrediNOVA - Cotecnova" <onboarding@resend.dev>';
  // Ya viene como «Nombre <correo@dominio>»: usarlo tal cual.
  if (/<[^<>@\s]+@[^<>@\s]+>\s*$/.test(v)) return v;
  // Solo el correo: anteponer un nombre visible entrecomillado (ASCII).
  return `"CrediNOVA - Cotecnova" <${v}>`;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();

    const { event, to, recipientName } = payload;

    if (!event || !to || !recipientName) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: event, to, recipientName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'creditoycartera@cotecnova.edu.co';
    const FROM_ADDRESS = buildFrom(FROM_EMAIL);
    // Nunca registrar el remitente completo: si el secret estuviera mal puesto
    // (p. ej. con la clave API), acabaría en los logs. Solo se traza si es un
    // correo bien formado y su dominio.
    {
      const m = /<?([^<>@\s]+)@([^<>@\s]+?)>?\s*$/.exec(FROM_ADDRESS);
      console.log('[from] ¿remitente con formato de correo?:', Boolean(m), '| dominio:', m ? m[2] : '(sin @)');
    }

    if (!RESEND_API_KEY) {
      console.error('[send-email] RESEND_API_KEY no configurada');
      return new Response(
        JSON.stringify({ error: 'API key de Resend no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = STATUS_CONFIG[event];
    const htmlBody = buildEmailBody(payload);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject: config.subject,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error('[send-email] Error de Resend:', errText);
      return new Response(
        JSON.stringify({ error: 'Error al enviar correo', detail: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendData = await resendResponse.json();
    console.log(`[send-email] Correo enviado OK → ${event} → ${to} → id: ${resendData.id}`);

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-email] Excepción:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
