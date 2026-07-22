import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ExternalLink } from 'lucide-react';

interface CreditStudySectionProps {
  form: UseFormReturn<any>;
  onSaveDraft?: () => void;
}

export default function CreditStudySection({ form, onSaveDraft }: CreditStudySectionProps) {
  const handleGenerateReceipt = () => {
    window.open('https://www.recibo.appcotecnova.es/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-balance">Sección C – Pago Estudio de Crédito Educativo</h2>
        <p className="text-muted-foreground text-pretty">
          Ingrese los datos del recibo de pago del estudio de crédito
        </p>
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">Generar Recibo de Pago</p>
        <p className="text-sm text-muted-foreground text-pretty">
          Antes de continuar, debe generar y pagar el recibo del estudio de crédito mediante PSE.
        </p>
        <Button 
          type="button"
          variant="secondary"
          onClick={handleGenerateReceipt}
          className="w-full sm:w-auto"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Generar Recibo Pago - PSE
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="creditStudyReceiptNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Recibo de Pago *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Número de recibo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="creditStudyPaymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de Consignación *</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="creditStudyAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Pagado *</FormLabel>
              <FormControl>
                <CurrencyInput 
                  value={field.value} 
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {onSaveDraft && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">¿Necesita tiempo para realizar el pago?</p>
          <p className="text-sm text-amber-700 dark:text-amber-300 text-pretty">
            Puede guardar su progreso y continuar más tarde. Se generará un código de recuperación que podrá usar junto con su número de cédula para retomar la solicitud.
          </p>
          <Button 
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            className="w-full sm:w-auto border-secondary text-secondary hover:bg-secondary/10"
          >
            Guardar y Continuar Después
          </Button>
        </div>
      )}
    </div>
  );
}
