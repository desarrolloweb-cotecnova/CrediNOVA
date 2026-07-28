/**
 * Validaciones y advertencias del formulario de solicitud.
 *
 * Se distinguen dos niveles:
 *
 *  - **Errores** (en el esquema zod): bloquean el envío. Son casos sin
 *    ambigüedad, como un número de recibo con letras o una fecha de pago futura.
 *  - **Advertencias** (`getApplicationWarnings`): no bloquean, pero se muestran
 *    antes de enviar para que el solicitante confirme. Son datos posibles pero
 *    sospechosos.
 *
 * Las reglas salen de errores reales detectados en las solicitudes migradas
 * desde la plataforma anterior; cada una indica el caso que la motivó.
 */

/** Un número de recibo válido son solo dígitos. */
export const RECEIPT_REGEX = /^\d+$/;

/** Fecha (YYYY-MM-DD) a medianoche UTC, o null si no es una fecha válida. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Hoy a medianoche UTC, para comparar contra fechas sin hora. */
export function today(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/** Años cumplidos entre una fecha y hoy. */
export function ageInYears(birth: Date, ref: Date = today()): number {
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const m = ref.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

/** Meses transcurridos desde una fecha hasta hoy (aproximado). */
export function monthsAgo(d: Date, ref: Date = today()): number {
  return (ref.getUTCFullYear() - d.getUTCFullYear()) * 12 + (ref.getUTCMonth() - d.getUTCMonth());
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

export interface ApplicationWarning {
  /** Campo al que apunta, para poder resaltarlo. */
  field: string;
  /** Sección del formulario, para orientar al solicitante. */
  section: string;
  message: string;
}

/** Datos que necesitan las advertencias (subconjunto del formulario). */
export interface WarningInput {
  creditStudyReceiptNumber?: string;
  creditStudyPaymentDate?: string;
  creditStudyAmount?: number;
  initialPaymentReceiptNumber?: string;
  initialPaymentDate?: string;
  initialPaymentAmount?: number;
  initialPayment?: number;
  semesterValue?: number;
  studentBirthDate?: string;
  cosignerBirthDate?: string;
  studentDocumentType?: string;
  /** Costo oficial del estudio de crédito para el año en curso, si se conoce. */
  officialCreditStudyCost?: number | null;
}

/**
 * Devuelve las advertencias aplicables. Ninguna impide enviar la solicitud.
 */
export function getApplicationWarnings(data: WarningInput): ApplicationWarning[] {
  const warnings: ApplicationWarning[] = [];
  const hoy = today();

  // ── Sección C: pago del estudio de crédito ──────────────────────────────
  //
  // Caso real: tres solicitudes migradas (LUXQWX, RHY2TJ, Z9WBPK) traían en el
  // valor del estudio de crédito el importe de la cuota inicial (477.311,
  // 1.193.277) en lugar del costo real del trámite. En dos de ellas el número
  // de recibo era además el mismo en ambas secciones.
  const costo = data.officialCreditStudyCost;
  if (costo && data.creditStudyAmount && data.creditStudyAmount !== costo) {
    warnings.push({
      field: 'creditStudyAmount',
      section: 'Sección C – Pago Estudio de Crédito',
      message:
        `El valor pagado (${money(data.creditStudyAmount)}) no coincide con el costo ` +
        `del estudio de crédito de este año (${money(costo)}). Verifique que no haya ` +
        `escrito por error el valor de la cuota inicial.`,
    });
  }

  if (
    data.creditStudyAmount &&
    data.initialPaymentAmount &&
    data.creditStudyAmount === data.initialPaymentAmount
  ) {
    warnings.push({
      field: 'creditStudyAmount',
      section: 'Sección C – Pago Estudio de Crédito',
      message:
        'El valor del estudio de crédito es idéntico al de la cuota inicial. ' +
        'Son dos pagos distintos: confirme que cada uno tenga su propio valor.',
    });
  }

  // Caso real: A7N2PP registró el pago con fecha 2016-06-30 en vez de 2026.
  for (const [campo, etiqueta, seccion] of [
    ['creditStudyPaymentDate', 'del estudio de crédito', 'Sección C – Pago Estudio de Crédito'],
    ['initialPaymentDate', 'de la cuota inicial', 'Sección E – Pago Cuota Inicial'],
  ] as const) {
    const d = parseDate(data[campo]);
    if (d) {
      const meses = monthsAgo(d, hoy);
      if (meses > 12) {
        const anios = Math.floor(meses / 12);
        warnings.push({
          field: campo,
          section: seccion,
          message:
            `La fecha de pago ${etiqueta} es de hace más de ${anios === 1 ? 'un año' : `${anios} años`}. ` +
            'Revise que el año esté bien escrito.',
        });
      }
    }
  }

  // ── Sección D/E: coherencia de los importes ─────────────────────────────
  if (data.semesterValue && data.initialPayment && data.initialPayment > data.semesterValue) {
    warnings.push({
      field: 'initialPayment',
      section: 'Sección D – Plan de Crédito',
      message:
        `La cuota inicial (${money(data.initialPayment)}) supera el valor del semestre ` +
        `(${money(data.semesterValue)}). Si es correcto, no quedaría saldo por financiar.`,
    });
  }

  // ── Edades ──────────────────────────────────────────────────────────────
  const nacEst = parseDate(data.studentBirthDate);
  if (nacEst) {
    const edad = ageInYears(nacEst, hoy);
    if (edad < 15 || edad > 70) {
      warnings.push({
        field: 'studentBirthDate',
        section: 'Sección A – Información del Estudiante',
        message: `La fecha de nacimiento indica ${edad} años. Verifique que sea correcta.`,
      });
    }
  }

  const nacDeudor = parseDate(data.cosignerBirthDate);
  if (nacDeudor) {
    const edad = ageInYears(nacDeudor, hoy);
    if (edad > 75) {
      warnings.push({
        field: 'cosignerBirthDate',
        section: 'Sección B – Deudor Solidario',
        message:
          `El deudor solidario tendría ${edad} años. Verifique la fecha de nacimiento; ` +
          'la edad puede afectar el estudio del crédito.',
      });
    }
  }

  return warnings;
}
