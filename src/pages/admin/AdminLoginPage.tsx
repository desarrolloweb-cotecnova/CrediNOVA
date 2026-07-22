import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { login, setCurrentUser } from '@/services/auth';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await login(data);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        toast.success('Sesión iniciada correctamente');
        navigate('/admin/dashboard');
      } else {
        toast.error(result.error || 'Credenciales inválidas');
      }
    } catch {
      toast.error('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo + título */}
        <div className="text-center mb-8 space-y-3">
          <img
            src="/images/brand/credinova-logo.svg"
            alt="CrediNOVA"
            className="h-16 w-auto mx-auto"
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance">
              Acceso Administrativo
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-pretty">
              Ingrese sus credenciales para continuar
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium text-balance">Iniciar sesión</CardTitle>
            <CardDescription className="text-pretty">
              Solo para usuarios registrados por el administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Correo electrónico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="usuario@cotecnova.edu.co"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                  {isLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando sesión…</>
                    : <><LogIn className="mr-2 h-4 w-4" />Iniciar sesión</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground text-pretty">
          Si no tiene acceso, comuníquese con el administrador del sistema.
        </p>
      </div>
    </div>
  );
}
