import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getTiposDesconto, addTipoDesconto, updateTipoDesconto, deleteTipoDesconto, TipoDesconto } from '@/utils/cadastrosApi';
import { exportToCSV } from '@/utils/formatUtils';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastrosTiposDesconto() {
  const { toast } = useToast();
  const [tipos, setTipos] = useState(getTiposDesconto());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoDesconto | null>(null);
  const [form, setForm] = useState({
    nome: '',
    desconto: 0,
    descricao: ''
  });

  const resetForm = () => {
    setForm({ nome: '', desconto: 0, descricao: '' });
    setEditingTipo(null);
  };

  const handleOpenDialog = (tipo?: TipoDesconto) => {
    if (tipo) {
      setEditingTipo(tipo);
      setForm({ nome: tipo.nome, desconto: tipo.desconto, descricao: tipo.descricao });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    if (editingTipo) {
      updateTipoDesconto(editingTipo.id, form);
      toast({ title: 'Sucesso', description: 'Tipo de desconto atualizado com sucesso' });
    } else {
      addTipoDesconto(form);
      toast({ title: 'Sucesso', description: 'Tipo de desconto cadastrado com sucesso' });
    }

    setTipos(getTiposDesconto());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteTipoDesconto(id);
    setTipos(getTiposDesconto());
    toast({ title: 'Sucesso', description: 'Tipo de desconto removido com sucesso' });
  };

  const handleExport = () => {
    exportToCSV(tipos, 'tipos-desconto.csv');
  };

  return (
    <CadastrosLayout title="Cadastro de Tipos de Desconto">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Tipo
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
                <TableHead>Nome</TableHead>
                <TableHead>Desconto (%)</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tipos.map(tipo => (
                <TableRow key={tipo.id}>
                  <TableCell className="font-mono text-xs">{tipo.id}</TableCell>
                  <TableCell className="font-medium">{tipo.nome}</TableCell>
                  <TableCell>{tipo.desconto}%</TableCell>
                  <TableCell className="max-w-[200px] truncate">{tipo.descricao}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(tipo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(tipo.id)}>
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
            <DialogTitle>{editingTipo ? 'Editar Tipo' : 'Novo Tipo de Desconto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Desconto *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Desconto (%)</Label>
              <Input type="number" min="0" max="100" value={form.desconto} onChange={e => setForm({ ...form, desconto: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
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
