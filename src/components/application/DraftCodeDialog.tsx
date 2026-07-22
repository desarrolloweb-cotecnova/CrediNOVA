import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface DraftCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftCode: string;
  studentDocument: string;
}

export default function DraftCodeDialog({ open, onOpenChange, draftCode, studentDocument }: DraftCodeDialogProps) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(draftCode);
    toast.success('Código copiado al portapapeles');
  };

  const handleClose = () => {
    onOpenChange(false);
    // No redirigir - permitir que el usuario continúe llenando el formulario
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-center text-balance">Borrador Guardado Exitosamente</DialogTitle>
          <DialogDescription className="text-center text-pretty">
            Su progreso ha sido guardado. Puede continuar llenando el formulario o cerrar y regresar más tarde.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-center">Código de Recuperación</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-mono font-bold tracking-wider text-center">
                {draftCode}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Información Importante</p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Guarde este código en un lugar seguro</li>
              <li>Necesitará este código y su número de cédula ({studentDocument}) para continuar más tarde</li>
              <li>Puede continuar llenando el formulario ahora mismo</li>
              <li>El borrador se actualizará cada vez que presione "Guardar Borrador"</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleClose} className="w-full">
            Continuar Llenando el Formulario
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
