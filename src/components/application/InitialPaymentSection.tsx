import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';

interface InitialPaymentSectionProps {
  form: UseFormReturn<any>;
}

export default function InitialPaymentSection({ form }: InitialPaymentSectionProps) {
  const initialPayment = form.watch('initialPayment');
  const selectedPlan = form.watch('creditPlan');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-balance">Sección E – Pago Cuota Inicial</h2>
        <p className="text-muted-foreground text-pretty">
          Genere y pague la cuota inicial mediante PSE, luego registre los datos del comprobante
        </p>
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">Cuota Inicial a Pagar</p>
        <p className="text-2xl font-semibold">
          {new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
          }).format(initialPayment || 0)}
        </p>
        <p className="text-xs text-muted-foreground">
          Plan seleccionado: {selectedPlan || 'No seleccionado'}
        </p>
      </div>

      <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
        <div>
          <h3 className="font-semibold text-lg mb-1">Generar y Registrar Pago</h3>
          <p className="text-sm text-muted-foreground">
            Haga clic en el botón para generar el recibo de pago mediante PSE. Una vez realizado el pago, 
            registre los datos del comprobante a continuación.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => window.open('https://www.recibo.appcotecnova.es/', '_blank', 'noopener,noreferrer')}
          className="w-full sm:w-auto"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Generar Recibo Pago - PSE
        </Button>

        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="initialPaymentReceiptNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Recibo *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Número de recibo" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="initialPaymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Pago *</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="initialPaymentAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Pagado *</FormLabel>
                <FormControl>
                  <CurrencyInput 
                    value={field.value} 
                    onChange={field.onChange}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Debe ser igual o superior a la cuota inicial: {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0,
                  }).format(initialPayment || 0)}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-pretty">
          <strong>Importante:</strong> Asegúrese de completar el pago antes de continuar. 
          El número de recibo y la fecha de pago son necesarios para procesar su solicitud.
        </p>
      </div>
    </div>
  );
}
