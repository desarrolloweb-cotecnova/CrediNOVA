/**
 * Utilidades para formateo de moneda colombiana
 */

/**
 * Formatea un número como moneda colombiana (COP)
 * @param value - Valor numérico a formatear
 * @param includeDecimals - Si se deben incluir decimales (por defecto false — solo enteros)
 * @returns String formateado como $X.XXX.XXX
 */
export function formatCurrency(value: number | undefined | null, includeDecimals = false): string {
  if (value === undefined || value === null || isNaN(value)) {
    return includeDecimals ? '$0,00' : '$0';
  }

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });

  return formatter.format(value);
}

/**
 * Parsea un string de moneda a número entero (sin decimales)
 * @param value - String con formato de moneda
 * @returns Número entero parseado
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  
  // Remover símbolos de moneda, puntos de miles y coma decimal
  const cleaned = value
    .replace(/[$\s]/g, '') // Remover $ y espacios
    .replace(/\./g, '')    // Remover puntos de miles
    .replace(/,/g, '.');   // Reemplazar coma decimal por punto

  const parsed = parseFloat(cleaned);
  // Siempre retornar entero
  return isNaN(parsed) ? 0 : Math.trunc(parsed);
}

/**
 * Formatea un input mientras el usuario escribe
 * @param value - Valor actual del input
 * @returns Valor formateado para mostrar
 */
export function formatCurrencyInput(value: string): string {
  const numericValue = parseCurrency(value);
  if (numericValue === 0 && value !== '0') return value;
  return formatCurrency(numericValue);
}
