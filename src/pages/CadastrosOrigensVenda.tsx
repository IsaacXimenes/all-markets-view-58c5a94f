import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getOrigensVenda, addOrigemVenda, updateOrigemVenda, deleteOrigemVenda, exportToCSV, OrigemVenda } from '@/utils/cadastrosApi';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastrosOrigensVenda() {
  const { toast } = useToast();
  const [origens, setOrigens] = useState(getOrigensVenda());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrigem, setEditingOrigem] = useState<OrigemVenda | null>(null);
  const [form, setForm] = useState({
    origem: '',
    status: 'Ativo' as 'Ativo' | 'Inativo'
  });

  const resetForm = () => {
    setForm({ origem: '', status: 'Ativo' });
    setEditingOrigem(null);
  };

  const handleOpenDialog = (origem?: OrigemVenda) => {
    if (origem) {
      setEditingOrigem(origem);
      setForm({ origem: origem.origem, status: origem.status });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.origem) {
      toast({ title: 'Erro', description: 'Origem é obrigatória', variant: 'destructive' });
      return;
    }

    if (editingOrigem) {
      updateOrigemVenda(editingOrigem.id, form);
      toast({ title: 'Sucesso', description: 'Origem atualizada com sucesso' });
    } else {
      addOrigemVenda(form);
      toast({ title: 'Sucesso', description: 'Origem cadastrada com sucesso' });
    }

    setOrigens(getOrigensVenda());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteOrigemVenda(id);
    setOrigens(getOrigensVenda());
    toast({ title: 'Sucesso', description: 'Origem removida com sucesso' });
  };

  const handleExport = () => {
    exportToCSV(origens, 'origens-venda.csv');
  };

  return (
    <CadastrosLayout title="Cadastro de Origens de Venda">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Origem
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
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {origens.map(origem => (
                <TableRow key={origem.id}>
                  <TableCell className="font-mono text-xs">{origem.id}</TableCell>
                  <TableCell className="font-medium">{origem.origem}</TableCell>
                  <TableCell>
                    <Badge variant={origem.status === 'Ativo' ? 'default' : 'secondary'}>
                      {origem.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(origem)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(origem.id)}>
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
            <DialogTitle>{editingOrigem ? 'Editar Origem' : 'Nova Origem'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Origem *</Label>
              <Input value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as 'Ativo' | 'Inativo' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
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
