/**
 * Utilidades de fecha SIN conversión de zona horaria.
 *
 * Problema: `new Date('2024-03-15')` es interpretado como UTC medianoche,
 * lo que en zonas UTC-5 muestra "14 de marzo" en lugar del 15.
 *
 * Solución: todas las funciones extraen los componentes directamente del
 * string ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss…) sin pasar por el
 * constructor Date(), eliminando la dependencia del navegador.
 */

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Extrae los componentes de fecha de un string ISO.
 * Funciona tanto con "YYYY-MM-DD" como con "YYYY-MM-DDTHH:mm:ss…"
 */
function extractDateParts(str: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const datePart = str.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Extrae los componentes de hora de un string ISO (parte antes de '+' o 'Z').
 * Devuelve null si no hay parte de hora.
 */
function extractTimeParts(str: string): { hour: number; minute: number; second: number } | null {
  if (!str || !str.includes('T')) return null;
  const timePart = str.split('T')[1];
  if (!timePart) return null;
  // Eliminar zona horaria (+00:00, -05:00, Z)
  const cleanTime = timePart.replace(/([+-]\d{2}:\d{2}|Z).*$/, '');
  const parts = cleanTime.split(':');
  if (parts.length < 2) return null;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  const second = parts[2] ? parseInt(parts[2], 10) : 0;
  if (isNaN(hour) || isNaN(minute)) return null;
  return { hour, minute, second };
}

/**
 * Formatea una fecha como "dd/MM/yyyy" sin conversión de zona horaria.
 * Acepta strings ISO: "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss…"
 * Devuelve "—" si el valor es nulo/vacío.
 */
export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—';
  const parts = extractDateParts(date);
  if (!parts) return date;
  const { year, month, day } = parts;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/**
 * Formatea una fecha como "d de mmmm de yyyy" (formato largo en español)
 * sin conversión de zona horaria.
 * Devuelve "—" si el valor es nulo/vacío.
 */
export function formatDateLong(date: string | null | undefined): string {
  if (!date) return '—';
  const parts = extractDateParts(date);
  if (!parts) return date;
  const { year, month, day } = parts;
  return `${day} de ${MESES_LARGOS[month - 1]} de ${year}`;
}

/**
 * Formatea una fecha como "d MMM yyyy" (ej: "15 mar 2024")
 * sin conversión de zona horaria.
 */
export function formatDateMedium(date: string | null | undefined): string {
  if (!date) return '—';
  const parts = extractDateParts(date);
  if (!parts) return date;
  const { year, month, day } = parts;
  return `${day} ${MESES_CORTOS[month - 1]} ${year}`;
}

/**
 * Formatea un timestamp ISO como "d MMM yyyy, HH:mm"
 * mostrando la hora tal como está almacenada en la BD (UTC),
 * sin conversión al huso horario del navegador.
 *
 * Ej: "2024-03-15T14:30:00+00:00" → "15 mar 2024, 14:30"
 */
export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  const dp = extractDateParts(date);
  const tp = extractTimeParts(date);
  if (!dp) return date;
  const datePart = `${dp.day} ${MESES_CORTOS[dp.month - 1]} ${dp.year}`;
  if (!tp) return datePart;
  return `${datePart}, ${String(tp.hour).padStart(2, '0')}:${String(tp.minute).padStart(2, '0')}`;
}

/**
 * Formatea un timestamp ISO como "d de mmmm de yyyy, HH:mm"
 * (formato largo con hora). Sin conversión de zona horaria.
 */
export function formatDateTimeLong(date: string | null | undefined): string {
  if (!date) return '—';
  const dp = extractDateParts(date);
  const tp = extractTimeParts(date);
  if (!dp) return date;
  const datePart = `${dp.day} de ${MESES_LARGOS[dp.month - 1]} de ${dp.year}`;
  if (!tp) return datePart;
  return `${datePart}, ${String(tp.hour).padStart(2, '0')}:${String(tp.minute).padStart(2, '0')}`;
}

/**
 * Calcula el día siguiente a un string YYYY-MM-DD y lo devuelve como YYYYMMDD.
 * Usado para generar DTEND en archivos .ics (sin Date UTC shift).
 */
export function nextDayICS(dateStr: string): string {
  const parts = extractDateParts(dateStr);
  if (!parts) return dateStr.replace(/-/g, '');
  // Usamos Date solo para calcular el día siguiente (operación aritmética pura)
  const d = new Date(parts.year, parts.month - 1, parts.day + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Devuelve "YYYYMMDD" de un string YYYY-MM-DD (para ICS DTSTART).
 */
export function toICSDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}
