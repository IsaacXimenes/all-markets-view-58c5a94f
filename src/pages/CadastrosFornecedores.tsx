import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getFornecedores, addFornecedor, updateFornecedor, deleteFornecedor, exportToCSV, Fornecedor } from '@/utils/cadastrosApi';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastrosFornecedores() {
  const { toast } = useToast();
  const [fornecedores, setFornecedores] = useState(getFornecedores());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    responsavel: '',
    telefone: '',
    status: 'Ativo' as 'Ativo' | 'Inativo',
    ultimaCompra: ''
  });

  const resetForm = () => {
    setForm({
      nome: '',
      cnpj: '',
      endereco: '',
      responsavel: '',
      telefone: '',
      status: 'Ativo',
      ultimaCompra: ''
    });
    setEditingFornecedor(null);
  };

  const handleOpenDialog = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setForm({
        nome: fornecedor.nome,
        cnpj: fornecedor.cnpj,
        endereco: fornecedor.endereco,
        responsavel: fornecedor.responsavel,
        telefone: fornecedor.telefone,
        status: fornecedor.status,
        ultimaCompra: fornecedor.ultimaCompra || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.cnpj) {
      toast({ title: 'Erro', description: 'Nome e CNPJ são obrigatórios', variant: 'destructive' });
      return;
    }

    if (editingFornecedor) {
      updateFornecedor(editingFornecedor.id, form);
      toast({ title: 'Sucesso', description: 'Fornecedor atualizado com sucesso' });
    } else {
      addFornecedor(form);
      toast({ title: 'Sucesso', description: 'Fornecedor cadastrado com sucesso' });
    }

    setFornecedores(getFornecedores());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteFornecedor(id);
    setFornecedores(getFornecedores());
    toast({ title: 'Sucesso', description: 'Fornecedor removido com sucesso' });
  };

  const handleExport = () => {
    exportToCSV(fornecedores, 'fornecedores.csv');
  };

  return (
    <CadastrosLayout title="Cadastro de Fornecedores">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
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
                <TableHead>CNPJ</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Última Compra</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedores.map(forn => (
                <TableRow key={forn.id}>
                  <TableCell className="font-mono text-xs">{forn.id}</TableCell>
                  <TableCell className="font-medium">{forn.nome}</TableCell>
                  <TableCell className="text-xs">{forn.cnpj}</TableCell>
                  <TableCell>{forn.responsavel}</TableCell>
                  <TableCell>{forn.telefone}</TableCell>
                  <TableCell>{forn.ultimaCompra ? new Date(forn.ultimaCompra).toLocaleDateString('pt-BR') : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={forn.status === 'Ativo' ? 'default' : 'secondary'}>
                      {forn.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(forn)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(forn.id)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CNPJ *</Label>
              <Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="99.999.999/9999-99" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
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
