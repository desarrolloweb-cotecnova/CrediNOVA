import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getDraftByCode } from '@/services/applications';

interface StartApplicationDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function StartApplicationDialog({
  open,
  onClose,
}: StartApplicationDialogProps) {
  const navigate = useNavigate();
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  const handleNewApplication = () => {
    onClose();
    navigate('/solicitud/nueva');
  };

  const handleRecoverDraft = async () => {
    if (!recoveryCode.trim()) {
      toast.error('Por favor ingrese un código de recuperación');
      return;
    }

    setIsRecovering(true);
    
    try {
      const code = recoveryCode.trim().toUpperCase();
      
      // Obtener el borrador desde la base de datos
      const result = await getDraftByCode(code);
      
      if (!result.success || !result.draft) {
        toast.error('No se encontró un borrador con ese código');
        setIsRecovering(false);
        return;
      }

      // Verificar que no esté cancelado
      if (result.draft.status === 'cancelado') {
        toast.error('Este borrador ha sido cancelado y no puede ser recuperado');
        setIsRecovering(false);
        return;
      }

      // Guardar los datos del borrador en sessionStorage
      sessionStorage.setItem('draftData', JSON.stringify(result.draft));
      sessionStorage.setItem('draftCode', code);
      sessionStorage.setItem('draftCurrentStep', String(result.draft.draft_current_step || 1));

      toast.success('Borrador recuperado exitosamente');
      
      // Cerrar el diálogo y navegar al formulario
      onClose();
      navigate('/solicitud/nueva');
    } catch (error) {
      console.error('Error al recuperar borrador:', error);
      toast.error('Error al recuperar el borrador');
      setIsRecovering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-balance">Solicitud de Crédito Educativo</DialogTitle>
          <DialogDescription className="text-pretty">
            Elija una opción para continuar con su solicitud
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Opción 1: Nueva Solicitud */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Nueva Solicitud</h3>
            <p className="text-sm text-muted-foreground text-pretty">
              Inicie una nueva solicitud de crédito educativo desde cero
            </p>
            <Button 
              onClick={handleNewApplication} 
              className="w-full"
              size="lg"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Iniciar Nueva Solicitud
            </Button>
          </div>

          {/* Separador */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O
              </span>
            </div>
          </div>

          {/* Opción 2: Recuperar Borrador */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Recuperar Borrador</h3>
            <p className="text-sm text-muted-foreground text-pretty">
              Si ya tiene un código de borrador, ingréselo para continuar su solicitud
            </p>
            <div className="space-y-2">
              <Label htmlFor="recovery-code">Código de Recuperación</Label>
              <Input
                id="recovery-code"
                placeholder="Ej: A3K7M9"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono text-center text-lg tracking-wider"
              />
            </div>
            <Button 
              onClick={handleRecoverDraft}
              variant="outline"
              className="w-full"
              size="lg"
              disabled={isRecovering || !recoveryCode.trim()}
            >
              {isRecovering ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Recuperando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-5 w-5" />
                  Recuperar Borrador
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
