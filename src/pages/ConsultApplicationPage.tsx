import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { LOGO_URL } from '@/lib/assets';

const consultSchema = z.object({
  applicationCode: z.string().min(1, 'Ingrese el código de solicitud'),
  studentDocument: z.string().min(1, 'Ingrese el número de cédula'),
});

type ConsultFormData = z.infer<typeof consultSchema>;

export default function ConsultApplicationPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ConsultFormData>({
    resolver: zodResolver(consultSchema),
    defaultValues: {
      applicationCode: '',
      studentDocument: '',
    },
  });

  const onSubmit = async (data: ConsultFormData) => {
    setIsLoading(true);
    try {
      // Navegar a la vista de solicitud
      navigate(`/solicitud/${data.applicationCode}?document=${data.studentDocument}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al consultar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center gap-3">
            <img 
              src={LOGO_URL} 
              alt="CrediNOVA" 
              className="h-12 md:h-16 w-auto"
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-6 py-12 md:py-24">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl text-balance">Consultar Solicitud</CardTitle>
              <CardDescription className="text-base text-pretty">
                Ingrese el código de 6 caracteres y el número de cédula del estudiante para consultar el estado de su crédito educativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="applicationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Solicitud (6 caracteres)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="A3K7M9" 
                            className="text-lg uppercase font-mono"
                            maxLength={6}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="studentDocument"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Cédula del Estudiante</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="1234567890" 
                            className="text-lg"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    <Search className="mr-2 h-5 w-5" />
                    {isLoading ? 'Consultando...' : 'Consultar Solicitud'}
                  </Button>
                </form>
              </Form>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center text-pretty">
                  ¿No tiene un código de solicitud?{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={() => navigate('/solicitud/nueva')}
                  >
                    Crear nueva solicitud
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
