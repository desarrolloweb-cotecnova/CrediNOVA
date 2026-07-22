import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { getCreditStudyCosts, createCreditStudyCost, updateCreditStudyCost, deleteCreditStudyCost } from '@/services/config';
import { CurrencyInput } from '@/components/ui/currency-input';
import AdminLayout from '@/components/layouts/AdminLayout';
import type { CreditStudyCost } from '@/types/application';

export default function CreditStudyCostsPage() {
  usePageTitle('Costos de Estudio');
  const [costs, setCosts] = useState<CreditStudyCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<CreditStudyCost | null>(null);
  const [formData, setFormData] = useState({ year: new Date().getFullYear(), amount: 0 });

  useEffect(() => {
    loadCosts();
  }, []);

  async function loadCosts() {
    try {
      const data = await getCreditStudyCosts();
      setCosts(data);
    } catch (error) {
      toast.error('Error al cargar los costos');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingCost(null);
    setFormData({ year: new Date().getFullYear(), amount: 0 });
    setDialogOpen(true);
  }

  function handleEdit(cost: CreditStudyCost) {
    setEditingCost(cost);
    setFormData({ year: cost.year, amount: cost.amount });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingCost) {
        await updateCreditStudyCost(editingCost.id, formData.amount);
        toast.success('Costo actualizado correctamente');
      } else {
        await createCreditStudyCost(formData.year, formData.amount);
        toast.success('Costo creado correctamente');
      }
      setDialogOpen(false);
      loadCosts();
    } catch (error) {
      toast.error('Error al guardar el costo');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Está seguro de eliminar este costo?')) return;
    
    try {
      await deleteCreditStudyCost(id);
      toast.success('Costo eliminado correctamente');
      loadCosts();
    } catch (error) {
      toast.error('Error al eliminar el costo');
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
              <CardTitle>Costos Registrados</CardTitle>
              <CardDescription>Lista de valores del estudio de crédito educativo por año</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : costs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay costos registrados</p>
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
              <Table className="[&>div]:max-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Año</TableHead>
                    <TableHead className="whitespace-nowrap">Valor</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell className="whitespace-nowrap font-medium">{cost.year}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 2,
                        }).format(cost.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(cost)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(cost.id)}>
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
            <DialogTitle>{editingCost ? 'Editar Costo' : 'Agregar Costo'}</DialogTitle>
            <DialogDescription>
              {editingCost ? 'Modifique el valor del estudio de crédito educativo' : 'Ingrese el año y el valor del estudio de crédito educativo'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="year">Año</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                disabled={!!editingCost}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <CurrencyInput
                id="amount"
                value={formData.amount}
                onChange={(value) => setFormData({ ...formData, amount: value })}
              />
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
