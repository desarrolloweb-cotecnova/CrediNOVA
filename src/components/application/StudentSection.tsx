import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import { getAcademicPrograms } from '@/services/config';
import type { AcademicProgram } from '@/types/application';

interface StudentSectionProps {
  form: UseFormReturn<any>;
}

export default function StudentSection({ form }: StudentSectionProps) {
  const studentWorks = form.watch('studentWorks');
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  useEffect(() => {
    async function loadPrograms() {
      try {
        const data = await getAcademicPrograms(true);
        setPrograms(data);
      } catch (error) {
        console.error('Error al cargar programas:', error);
      } finally {
        setLoadingPrograms(false);
      }
    }
    loadPrograms();
  }, []);

  const handleProgramChange = (programName: string) => {
    form.setValue('studentProgram', programName);
    
    // Encontrar el programa seleccionado y actualizar el valor del semestre
    const selectedProgram = programs.find(p => p.name === programName);
    if (selectedProgram) {
      form.setValue('semesterValue', selectedProgram.tuitionAmount);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-balance">{"Sección A – Información del Estudiante"}</h2>
        <p className="text-muted-foreground text-pretty">
          Complete la información del estudiante que recibirá el crédito educativo
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="studentFullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Nombre completo"
                  className="uppercase"
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="studentDocumentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo Doc. *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CC">CC</SelectItem>
                    <SelectItem value="TI">TI</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="studentDocumentNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Número" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="studentDocumentExpeditionDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de Expedición *</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentBirthDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de Nacimiento *</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Número de teléfono" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico *</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="correo@ejemplo.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección de Residencia *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Dirección completa" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentNeighborhood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Barrio *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Barrio" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentCity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ciudad" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentDepartment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departamento *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Departamento" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentProgram"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Programa en el que se Matricula *</FormLabel>
              <Select onValueChange={handleProgramChange} defaultValue={field.value} disabled={loadingPrograms}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingPrograms ? "Cargando..." : "Seleccione un programa"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.name}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentSemester"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Semestre *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: 1, 2, 3..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentShift"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jornada *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Diurna">Diurna</SelectItem>
                  <SelectItem value="Nocturna">Nocturna</SelectItem>
                  <SelectItem value="Sabatina">Sabatina</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentRelationshipToCosigner"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relación con el Deudor Solidario *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: Hijo, Sobrino, etc." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="studentWorks"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>¿El estudiante trabaja actualmente?</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {studentWorks && (
          <div className="grid md:grid-cols-2 gap-6 pl-6 border-l-2 border-primary/20">
            <FormField
              control={form.control}
              name="studentCompanyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Empresa</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre de la empresa" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="studentSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salario</FormLabel>
                  <FormControl>
                    <CurrencyInput 
                      value={field.value} 
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="studentCompanyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección de la Empresa</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Dirección" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="studentCompanyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono de la Empresa</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Teléfono" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
