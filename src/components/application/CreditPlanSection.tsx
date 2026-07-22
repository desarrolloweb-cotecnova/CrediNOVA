import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';

interface CreditPlanSectionProps {
  form: UseFormReturn<any>;
}

export default function CreditPlanSection({ form }: CreditPlanSectionProps) {
  const selectedPlan = form.watch('creditPlan');
  const semesterValue = form.watch('semesterValue');
  const studentProgram = form.watch('studentProgram');
  
  // Cuota inicial sugerida según el plan (siempre entero)
  const suggestedInitialPayment = Math.trunc(
    selectedPlan === '50/50' ? semesterValue * 0.5 : semesterValue * 0.2
  );
  
  // Prellenar initialPayment con el valor sugerido cada vez que cambia el plan o el valor del semestre
  useEffect(() => {
    if (selectedPlan && semesterValue > 0) {
      form.setValue('initialPayment', suggestedInitialPayment);
    }
  }, [selectedPlan, semesterValue, suggestedInitialPayment, form]);
  
  // Número máximo de cuotas según el plan
  const maxInstallments = selectedPlan === '50/50' ? 2 : 3;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-balance">Sección D – Selección Plan Crédito Educativo</h2>
        <p className="text-muted-foreground text-pretty">
          Seleccione el plan de crédito que mejor se adapte a sus necesidades
        </p>
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">Programa Seleccionado</p>
        <p className="text-lg font-semibold">{studentProgram || 'No seleccionado'}</p>
        {semesterValue > 0 && (
          <p className="text-sm text-muted-foreground">
            Valor de matrícula: {new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
            }).format(semesterValue)}
          </p>
        )}
      </div>

      <FormField
        control={form.control}
        name="semesterValue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Valor del Semestre *</FormLabel>
            <FormControl>
              <CurrencyInput 
                value={field.value} 
                onChange={field.onChange}
                disabled={true}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Este valor se establece automáticamente según el programa seleccionado
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="creditPlan"
        render={({ field }) => (
          <FormItem className="space-y-4">
            <FormLabel>Plan de Crédito *</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="grid md:grid-cols-2 gap-4"
              >
                <FormItem>
                  <FormControl>
                    <RadioGroupItem value="50/50" id="plan-5050" className="peer sr-only" />
                  </FormControl>
                  <FormLabel htmlFor="plan-5050" className="cursor-pointer">
                    <Card className={`h-full transition-all ${selectedPlan === '50/50' ? 'border-primary border-2 bg-primary/5' : 'hover:border-primary/50'}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="text-xl text-balance">Plan 50/50</CardTitle>
                          {selectedPlan === '50/50' && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <CardDescription>Corto Plazo</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-pretty">Cuota inicial del <strong>50%</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-pretty">Máximo <strong>2 cuotas</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-pretty"><strong>Sin intereses</strong></span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </FormLabel>
                </FormItem>

                <FormItem>
                  <FormControl>
                    <RadioGroupItem value="20/80" id="plan-2080" className="peer sr-only" />
                  </FormControl>
                  <FormLabel htmlFor="plan-2080" className="cursor-pointer">
                    <Card className={`h-full transition-all ${selectedPlan === '20/80' ? 'border-secondary border-2 bg-secondary/5' : 'hover:border-secondary/50'}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="text-xl text-balance">Plan 20/80</CardTitle>
                          {selectedPlan === '20/80' && (
                            <CheckCircle className="h-5 w-5 text-secondary" />
                          )}
                        </div>
                        <CardDescription>Mediano Plazo</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                            <span className="text-pretty">Cuota inicial del <strong>20%</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                            <span className="text-pretty">Máximo <strong>3 cuotas</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                            <span className="text-pretty">Con tasa de interés</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Campo para confirmar cuota inicial */}
      {selectedPlan && (
        <>
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
            <h3 className="font-semibold text-lg">Detalles del Plan</h3>
          
          <FormField
            control={form.control}
            name="initialPayment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuota Inicial *</FormLabel>
                <FormControl>
                  <CurrencyInput 
                    value={field.value} 
                    onChange={field.onChange}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Valor sugerido ({selectedPlan === '50/50' ? '50%' : '20%'}): {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0,
                  }).format(suggestedInitialPayment)}. Puede ingresar un valor igual o mayor.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numberOfInstallments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Cuotas *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                    className="flex gap-4"
                  >
                    {[...Array(maxInstallments)].map((_, index) => {
                      const installmentNumber = index + 1;
                      return (
                        <FormItem key={installmentNumber} className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={installmentNumber.toString()} id={`installments-${installmentNumber}`} />
                          </FormControl>
                          <FormLabel htmlFor={`installments-${installmentNumber}`} className="font-normal cursor-pointer">
                            {installmentNumber} {installmentNumber === 1 ? 'cuota' : 'cuotas'}
                          </FormLabel>
                        </FormItem>
                      );
                    })}
                  </RadioGroup>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Máximo {maxInstallments} cuotas para el plan {selectedPlan}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentDayOfMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Día de Pago Mensual *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                    className="flex gap-4"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="1" id="day-1" />
                      </FormControl>
                      <FormLabel htmlFor="day-1" className="font-normal cursor-pointer">
                        1ro de cada mes
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="15" id="day-15" />
                      </FormControl>
                      <FormLabel htmlFor="day-15" className="font-normal cursor-pointer">
                        15 de cada mes
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        </>
      )}
    </div>
  );
}
