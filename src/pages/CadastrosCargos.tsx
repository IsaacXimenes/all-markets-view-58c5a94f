import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getCargos, addCargo, updateCargo, deleteCargo, Cargo } from '@/utils/cadastrosApi';
import { exportToCSV } from '@/utils/formatUtils';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PERMISSOES_DISPONIVEIS = ['Financeiro', 'Estoque', 'Vendas', 'Assistência', 'Cadastros', 'Relatórios', 'Admin'];

export default function CadastrosCargos() {
  const { toast } = useToast();
  const [cargos, setCargos] = useState(getCargos());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const [form, setForm] = useState({
    funcao: '',
    permissoes: [] as string[]
  });

  const resetForm = () => {
    setForm({ funcao: '', permissoes: [] });
    setEditingCargo(null);
  };

  const handleOpenDialog = (cargo?: Cargo) => {
    if (cargo) {
      setEditingCargo(cargo);
      setForm({ funcao: cargo.funcao, permissoes: [...cargo.permissoes] });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handlePermissaoChange = (permissao: string, checked: boolean) => {
    if (checked) {
      setForm({ ...form, permissoes: [...form.permissoes, permissao] });
    } else {
      setForm({ ...form, permissoes: form.permissoes.filter(p => p !== permissao) });
    }
  };

  const handleSave = () => {
    if (!form.funcao) {
      toast({ title: 'Erro', description: 'Função é obrigatória', variant: 'destructive' });
      return;
    }

    if (editingCargo) {
      updateCargo(editingCargo.id, form);
      toast({ title: 'Sucesso', description: 'Cargo atualizado com sucesso' });
    } else {
      addCargo(form);
      toast({ title: 'Sucesso', description: 'Cargo cadastrado com sucesso' });
    }

    setCargos(getCargos());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteCargo(id);
    setCargos(getCargos());
    toast({ title: 'Sucesso', description: 'Cargo removido com sucesso' });
  };

  const handleExport = () => {
    exportToCSV(cargos.map(c => ({ ...c, permissoes: c.permissoes.join('; ') })), 'cargos.csv');
  };

  return (
    <CadastrosLayout title="Cadastro de Cargos">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cargo
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
                <TableHead>Função</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargos.map(cargo => (
                <TableRow key={cargo.id}>
                  <TableCell className="font-mono text-xs">{cargo.id}</TableCell>
                  <TableCell className="font-medium">{cargo.funcao}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {cargo.permissoes.map(p => (
                        <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(cargo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cargo.id)}>
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
            <DialogTitle>{editingCargo ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Função *</Label>
              <Input value={form.funcao} onChange={e => setForm({ ...form, funcao: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSOES_DISPONIVEIS.map(permissao => (
                  <div key={permissao} className="flex items-center space-x-2">
                    <Checkbox
                      id={permissao}
                      checked={form.permissoes.includes(permissao)}
                      onCheckedChange={(checked) => handlePermissaoChange(permissao, checked as boolean)}
                    />
                    <label htmlFor={permissao} className="text-sm">{permissao}</label>
                  </div>
                ))}
              </div>
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
