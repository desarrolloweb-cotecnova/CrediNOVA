import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { getAcademicPrograms, createAcademicProgram, updateAcademicProgram, deleteAcademicProgram } from '@/services/config';
import { CurrencyInput } from '@/components/ui/currency-input';
import AdminLayout from '@/components/layouts/AdminLayout';
import type { AcademicProgram } from '@/types/application';

export default function AcademicProgramsPage() {
  usePageTitle('Programas Académicos');
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<AcademicProgram | null>(null);
  const [formData, setFormData] = useState({ name: '', tuitionAmount: 0, isActive: true });

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    try {
      const data = await getAcademicPrograms(false);
      setPrograms(data);
    } catch (error) {
      toast.error('Error al cargar los programas');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingProgram(null);
    setFormData({ name: '', tuitionAmount: 0, isActive: true });
    setDialogOpen(true);
  }

  function handleEdit(program: AcademicProgram) {
    setEditingProgram(program);
    setFormData({ name: program.name, tuitionAmount: program.tuitionAmount, isActive: program.isActive });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error('El nombre del programa es requerido');
      return;
    }

    try {
      if (editingProgram) {
        await updateAcademicProgram(editingProgram.id, formData);
        toast.success('Programa actualizado correctamente');
      } else {
        await createAcademicProgram(formData.name, formData.tuitionAmount, formData.isActive);
        toast.success('Programa creado correctamente');
      }
      setDialogOpen(false);
      loadPrograms();
    } catch (error) {
      toast.error('Error al guardar el programa');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Está seguro de eliminar este programa?')) return;
    
    try {
      await deleteAcademicProgram(id);
      toast.success('Programa eliminado correctamente');
      loadPrograms();
    } catch (error) {
      toast.error('Error al eliminar el programa');
    }
  }

  async function handleToggleActive(program: AcademicProgram) {
    try {
      await updateAcademicProgram(program.id, { isActive: !program.isActive });
      toast.success(`Programa ${!program.isActive ? 'activado' : 'desactivado'} correctamente`);
      loadPrograms();
    } catch (error) {
      toast.error('Error al actualizar el programa');
    }
  }

  return (
    <AdminLayout>
      <div className="bg-muted/30 min-h-full">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="flex justify-end mb-6">
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Programas Registrados</CardTitle>
          <CardDescription>Lista de programas académicos con sus valores de matrícula</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : programs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay programas registrados</p>
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
              <Table className="[&>div]:max-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Programa</TableHead>
                    <TableHead className="whitespace-nowrap">Valor Matrícula</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell className="whitespace-nowrap font-medium">{program.name}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 2,
                        }).format(program.tuitionAmount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={program.isActive}
                            onCheckedChange={() => handleToggleActive(program)}
                          />
                          <span className="text-sm">{program.isActive ? 'Activo' : 'Inactivo'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(program)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(program.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProgram ? 'Editar Programa' : 'Agregar Programa'}</DialogTitle>
            <DialogDescription>
              {editingProgram ? 'Modifique los datos del programa académico' : 'Ingrese los datos del nuevo programa académico'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Programa</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Contaduría Pública"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tuitionAmount">Valor de la Matrícula</Label>
              <CurrencyInput
                id="tuitionAmount"
                value={formData.tuitionAmount}
                onChange={(value) => setFormData({ ...formData, tuitionAmount: value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Programa activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </AdminLayout>
  );
}
