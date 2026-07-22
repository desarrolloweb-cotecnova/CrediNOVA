import * as React from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrency, parseCurrency } from '@/lib/currency';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number;
  onChange?: (value: number) => void;
}

/**
 * Input especializado para valores de moneda colombiana
 * Muestra formato $X.XXX.XXX,XX mientras mantiene valor numérico
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onBlur, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);

    // Actualizar display cuando cambia el valor externo
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value !== undefined && value !== null ? formatCurrency(value) : '');
      }
    }, [value, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Mostrar solo el número sin formato al enfocar
      if (value !== undefined && value !== null && value !== 0) {
        setDisplayValue(value.toString());
      } else {
        setDisplayValue('');
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Formatear al perder el foco
      const numericValue = parseCurrency(displayValue);
      setDisplayValue(formatCurrency(numericValue));
      
      if (onBlur) {
        onBlur(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Solo permitir dígitos enteros (sin punto ni coma — sin decimales)
      const cleaned = inputValue.replace(/[^\d]/g, '');
      setDisplayValue(cleaned);
      
      // Notificar el valor numérico entero
      if (onChange) {
        const numericValue = parseCurrency(cleaned);
        onChange(numericValue);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="$0"
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
