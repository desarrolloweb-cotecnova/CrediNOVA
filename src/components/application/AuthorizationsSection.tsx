import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthorizationsSectionProps {
  form: UseFormReturn<any>;
}

// El PDF vive en el bucket `public-documents` del proyecto Supabase configurado
// en VITE_SUPABASE_URL (hay que subirlo al migrar de proyecto; ver guía §4).
const PDF_URL = supabase.storage
  .from('public-documents')
  .getPublicUrl('autorizaciones-credito-educativo.pdf').data.publicUrl;

export default function AuthorizationsSection({ form }: AuthorizationsSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-balance">Sección F – Autorizaciones y Declaraciones</h2>
        <p className="text-muted-foreground text-pretty">
          Lea cuidadosamente el documento completo de autorizaciones y declaraciones
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg text-balance">Documento de Autorizaciones y Declaraciones</CardTitle>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => window.open(PDF_URL, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir en nueva pestaña
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full border border-border rounded-md overflow-hidden bg-muted/30">
            <iframe
              src={PDF_URL}
              className="w-full h-[600px] md:h-[700px]"
              title="Autorizaciones y Declaraciones - Crédito Educativo"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-pretty">
            Por favor, lea detenidamente todo el contenido del documento antes de aceptar las autorizaciones.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="studentAuthorizationAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-base">
                  Acepto las autorizaciones y declaraciones como <strong>Estudiante</strong>
                </FormLabel>
                <p className="text-sm text-muted-foreground text-pretty">
                  Al marcar esta casilla, confirmo que he leído y acepto todas las autorizaciones y declaraciones anteriores
                </p>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cosignerAuthorizationAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-base">
                  Acepto las autorizaciones y declaraciones como <strong>Deudor Solidario</strong>
                </FormLabel>
                <p className="text-sm text-muted-foreground text-pretty">
                  Al marcar esta casilla, confirmo que he leído y acepto todas las autorizaciones y declaraciones anteriores
                </p>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
