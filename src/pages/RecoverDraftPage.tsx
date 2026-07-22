import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getDraftByCode } from '@/services/applications';
import { FileSearch } from 'lucide-react';

export default function RecoverDraftPage() {
  const [draftCode, setDraftCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRecover() {
    if (!draftCode.trim()) {
      toast.error('Por favor ingrese el código de recuperación');
      return;
    }

    setLoading(true);
    try {
      const result = await getDraftByCode(draftCode.trim().toUpperCase());
      
      if (result.success && result.draft) {
        // Verificar si el borrador está cancelado
        if (result.draft.status === 'cancelado') {
          toast.error('Este borrador fue cancelado por un gestor y no puede continuarse.');
          setLoading(false);
          return;
        }
        
        // Guardar el borrador en sessionStorage para cargarlo en el formulario
        sessionStorage.setItem('draftData', JSON.stringify(result.draft));
        sessionStorage.setItem('draftCode', draftCode.trim().toUpperCase());
        
        const step = result.draft.draft_current_step || 1;
        const totalSteps = 7;
        toast.success(`Borrador ${draftCode.trim().toUpperCase()} cargado. Continuando en el paso ${step} de ${totalSteps}.`);
        navigate('/new-application');
      } else {
        toast.error(result.error || 'Código de borrador no encontrado');
      }
    } catch (error) {
      toast.error('Error al recuperar el borrador');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileSearch className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl text-balance">Recuperar Borrador</CardTitle>
          <CardDescription className="text-pretty">
            Ingrese el código de 6 caracteres que recibió al guardar su solicitud como borrador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="draftCode">Código de Recuperación (6 caracteres)</Label>
            <Input
              id="draftCode"
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value.toUpperCase())}
              placeholder="A3K7M9"
              maxLength={6}
              className="text-center text-lg font-mono tracking-wider uppercase"
            />
            <p className="text-xs text-muted-foreground">
              El código consta de 6 caracteres alfanuméricos
            </p>
          </div>

          <Button 
            onClick={handleRecover} 
            disabled={loading || !draftCode.trim()}
            className="w-full"
          >
            {loading ? 'Recuperando...' : 'Recuperar Borrador'}
          </Button>

          <div className="text-center">
            <Button 
              variant="link" 
              onClick={() => navigate('/')}
            >
              Volver al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
