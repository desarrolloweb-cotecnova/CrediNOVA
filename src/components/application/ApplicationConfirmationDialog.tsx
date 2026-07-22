import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Printer, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ApplicationConfirmationDialogProps {
  open: boolean;
  applicationCode: string;
  onClose: () => void;
}

export default function ApplicationConfirmationDialog({
  open,
  applicationCode,
  onClose,
}: ApplicationConfirmationDialogProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(applicationCode);
    toast.success('Código copiado al portapapeles');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-balance">
            ¡Solicitud Enviada Exitosamente!
          </DialogTitle>
          <DialogDescription className="text-center text-pretty">
            Su solicitud de crédito educativo ha sido registrada correctamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Código de Solicitud */}
          <div className="bg-muted/50 rounded-lg p-6 space-y-3">
            <p className="text-sm font-medium text-center">
              Código de Solicitud
            </p>
            <div className="bg-background border-2 border-primary rounded-lg p-4">
              <p className="text-3xl font-bold text-center tracking-wider font-mono text-primary">
                {applicationCode}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>

          {/* Información Importante */}
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
              ⚠️ Importante: Guarde este código
            </p>
            <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1 list-disc list-inside">
              <li>Use este código para consultar el estado de su solicitud</li>
              <li>Guárdelo en un lugar seguro</li>
              <li>Se recomienda imprimirlo o tomar una captura de pantalla</li>
            </ul>
          </div>

          {/* Próximos Pasos */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Próximos Pasos:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Su solicitud será revisada por nuestro equipo</li>
              <li>Recibirá una respuesta en un plazo de 3 a 5 días hábiles</li>
              <li>Puede consultar el estado en cualquier momento con su código</li>
            </ol>
          </div>

          {/* Botón de acción */}
          <div className="flex flex-col gap-3">
            <Button onClick={onClose} className="w-full">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
