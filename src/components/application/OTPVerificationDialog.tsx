import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface OTPVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentEmail: string;
  cosignerEmail: string;
  onVerified: (studentOTP: string, cosignerOTP: string) => void;
}

export default function OTPVerificationDialog({
  open,
  onOpenChange,
  studentEmail,
  cosignerEmail,
  onVerified,
}: OTPVerificationDialogProps) {
  const [studentOTP, setStudentOTP] = useState('');
  const [cosignerOTP, setCosignerOTP] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpsSent, setOtpsSent] = useState(false);

  useEffect(() => {
    if (open && !otpsSent) {
      sendOTPs();
    }
  }, [open]);

  const sendOTPs = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          studentEmail,
          cosignerEmail,
        },
      });

      if (error) {
        const errorMsg = await error?.context?.text();
        toast.error(errorMsg || 'Error al enviar códigos OTP');
        return;
      }

      if (data?.success) {
        toast.success('Códigos OTP enviados a los correos electrónicos');
        setOtpsSent(true);
      } else {
        toast.error('Error al enviar códigos OTP');
      }
    } catch (error) {
      console.error('Error al enviar OTPs:', error);
      toast.error('Error al enviar códigos OTP');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!studentOTP || !cosignerOTP) {
      toast.error('Por favor ingrese ambos códigos OTP');
      return;
    }

    if (studentOTP.length !== 6 || cosignerOTP.length !== 6) {
      toast.error('Los códigos OTP deben tener 6 dígitos');
      return;
    }

    setIsVerifying(true);
    onVerified(studentOTP, cosignerOTP);
  };

  const handleResend = () => {
    setOtpsSent(false);
    setStudentOTP('');
    setCosignerOTP('');
    sendOTPs();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-balance">Verificación por Correo Electrónico</DialogTitle>
          <DialogDescription className="text-pretty">
            Hemos enviado códigos de verificación de 6 dígitos a los correos del estudiante y del deudor solidario. 
            Los códigos tienen una vigencia de 15 minutos.
          </DialogDescription>
        </DialogHeader>

        {isSending ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Enviando códigos OTP...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="student-otp">Código del Estudiante</Label>
              <Input
                id="student-otp"
                value={studentOTP}
                onChange={(e) => setStudentOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Enviado a: {studentEmail}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cosigner-otp">Código del Deudor Solidario</Label>
              <Input
                id="cosigner-otp"
                value={cosignerOTP}
                onChange={(e) => setCosignerOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Enviado a: {cosignerEmail}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleVerify}
                disabled={isVerifying || !studentOTP || !cosignerOTP}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar Códigos'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleResend}
                disabled={isSending}
                className="w-full"
              >
                Reenviar Códigos
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
