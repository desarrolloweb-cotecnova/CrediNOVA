import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createUser } from '@/services/users';

// ── Esquema con restricción de dominio ───────────────────────────────────────

const registerSchema = z.object({
  full_name: z.string().min(2, 'Nombre requerido (mínimo 2 caracteres)'),
  email: z
    .string()
    .email('Email inválido')
    .refine((e) => e.toLowerCase().endsWith('@cotecnova.edu.co'), {
      message: 'Solo se permiten correos @cotecnova.edu.co',
    }),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// ── Página ────────────────────────────────────────────────────────────────────

export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { error } = await createUser({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
      });
      if (error) {
        toast.error(error.message || 'Error al crear usuario');
        return;
      }
      toast.success(`Usuario ${data.full_name} creado correctamente`);
      form.reset();
      navigate('/admin/login');
    } catch {
      toast.error('Error al crear el usuario');
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
            src="https://miaoda-conversation-file.s3cdn.medo.dev/user-8u8uo5llzbwg/20260509/file-bia1hxjy835s.png"
            alt="CrediNOVA"
            className="h-16 w-auto mx-auto"
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance">
              Registro de Usuario
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-pretty">
              Acceso restringido — solo personal de COTECNOVA
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium text-balance">Nuevo usuario interno</CardTitle>
            <CardDescription className="text-pretty">
              El correo debe pertenecer al dominio <span className="font-medium text-foreground">@cotecnova.edu.co</span>.
              El rol será asignado por el administrador desde el panel de usuarios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Nombre completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. María González" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Correo institucional *</FormLabel>
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

                <Separator />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Contraseña *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Confirmar contraseña *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Repita la contraseña" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando…</>
                    : <><UserPlus className="mr-2 h-4 w-4" />Crear cuenta</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio de sesión
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground text-pretty">
          Esta página es de acceso restringido. No comparta esta URL.
        </p>
      </div>
    </div>
  );
}
