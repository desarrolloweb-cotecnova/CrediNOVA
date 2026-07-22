import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';

interface CosignerSectionProps {
  form: UseFormReturn<any>;
}

export default function CosignerSection({ form }: CosignerSectionProps) {
  const occupation = form.watch('cosignerOccupation');
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-balance">{"Sección B – Información del Deudor Solidario"}</h2>
        <p className="text-muted-foreground text-pretty">
          Complete la información del deudor solidario que respaldará el crédito educativo
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="cosignerFullName"
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
            name="cosignerDocumentType"
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
                    <SelectItem value="CE">CE</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cosignerDocumentNumber"
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
          name="cosignerDocumentExpeditionDate"
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
          name="cosignerBirthDate"
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
          name="cosignerGender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Género *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Femenino">Femenino</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cosignerMaritalStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado Civil *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Soltero">Soltero</SelectItem>
                  <SelectItem value="Casado">Casado</SelectItem>
                  <SelectItem value="Unión Libre">Unión Libre</SelectItem>
                  <SelectItem value="Divorciado">Divorciado</SelectItem>
                  <SelectItem value="Viudo">Viudo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cosignerDependents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personas a Cargo *</FormLabel>
              <FormControl>
                <Input {...field} type="number" min="0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cosignerEducationLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nivel de Estudios *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Primaria">Primaria</SelectItem>
                  <SelectItem value="Secundaria">Secundaria</SelectItem>
                  <SelectItem value="Técnica">Técnica</SelectItem>
                  <SelectItem value="Tecnológica">Tecnológica</SelectItem>
                  <SelectItem value="Universitaria">Universitaria</SelectItem>
                  <SelectItem value="Posgrado">Posgrado</SelectItem>
                  <SelectItem value="Ninguno">Ninguno</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="cosignerAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Dirección completa" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cosignerNeighborhood"
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
          name="cosignerCity"
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
          name="cosignerDepartment"
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
          name="cosignerPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Celular *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Número de celular" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cosignerEmail"
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
      </div>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-balance">Información Laboral</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="cosignerOccupation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ocupación *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Empleado">Empleado</SelectItem>
                    <SelectItem value="Pensionado">Pensionado</SelectItem>
                    <SelectItem value="Independiente">Independiente</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {occupation === 'Empleado' && (
            <>
              <FormField
                control={form.control}
                name="cosignerCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre de la empresa" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cosignerPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Cargo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cosignerContractType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Contrato *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Indefinido">Indefinido</SelectItem>
                        <SelectItem value="Fijo">Fijo</SelectItem>
                        <SelectItem value="Prestación de servicios">Prestación de servicios</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cosignerHireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Ingreso *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cosignerCompanyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección de la Empresa *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Dirección completa" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cosignerCompanyCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad de la Empresa *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ciudad" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cosignerCompanyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono de la Empresa *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Teléfono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="cosignerIncome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {occupation === 'Pensionado' ? 'Pensión *' : 
                   occupation === 'Empleado' ? 'Salario *' : 
                   'Ingresos *'}
                </FormLabel>
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
            name="cosignerMonthlyExpenses"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gastos Mensuales *</FormLabel>
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
        </div>
      </div>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-balance">Referencias</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="cosignerFamilyReferenceName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia Familiar - Nombre *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nombre completo" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cosignerFamilyReferencePhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia Familiar - Teléfono *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Teléfono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cosignerPersonalReferenceName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia Personal - Nombre *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nombre completo" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cosignerPersonalReferencePhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia Personal - Teléfono *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Teléfono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {occupation === 'Independiente' && (
            <>
              <FormField
                control={form.control}
                name="cosignerCommercialReferenceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia Comercial - Nombre o Razón Social *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre o razón social" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cosignerCommercialReferencePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia Comercial - Teléfono *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Teléfono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
