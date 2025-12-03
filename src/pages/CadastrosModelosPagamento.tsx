import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getModelosPagamento, addModeloPagamento, updateModeloPagamento, deleteModeloPagamento, exportToCSV, ModeloPagamento } from '@/utils/cadastrosApi';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastrosModelosPagamento() {
  const { toast } = useToast();
  const [modelos, setModelos] = useState(getModelosPagamento());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloPagamento | null>(null);
  const [form, setForm] = useState({ modelo: '' });

  const resetForm = () => {
    setForm({ modelo: '' });
    setEditingModelo(null);
  };

  const handleOpenDialog = (modelo?: ModeloPagamento) => {
    if (modelo) {
      setEditingModelo(modelo);
      setForm({ modelo: modelo.modelo });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.modelo) {
      toast({ title: 'Erro', description: 'Modelo é obrigatório', variant: 'destructive' });
      return;
    }

    if (editingModelo) {
      updateModeloPagamento(editingModelo.id, form);
      toast({ title: 'Sucesso', description: 'Modelo atualizado com sucesso' });
    } else {
      addModeloPagamento(form);
      toast({ title: 'Sucesso', description: 'Modelo cadastrado com sucesso' });
    }

    setModelos(getModelosPagamento());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteModeloPagamento(id);
    setModelos(getModelosPagamento());
    toast({ title: 'Sucesso', description: 'Modelo removido com sucesso' });
  };

  const handleExport = () => {
    exportToCSV(modelos, 'modelos-pagamento.csv');
  };

  return (
    <CadastrosLayout title="Cadastro de Modelos de Pagamento">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Modelo
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Modelo de Pagamento</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelos.map(modelo => (
                <TableRow key={modelo.id}>
                  <TableCell className="font-mono text-xs">{modelo.id}</TableCell>
                  <TableCell className="font-medium">{modelo.modelo}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(modelo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(modelo.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModelo ? 'Editar Modelo' : 'Novo Modelo de Pagamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Modelo de Pagamento *</Label>
              <Input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CadastrosLayout>
  );
}
