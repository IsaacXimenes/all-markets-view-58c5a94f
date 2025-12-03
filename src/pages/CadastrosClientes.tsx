import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getClientes, addCliente, updateCliente, deleteCliente, exportToCSV, Cliente } from '@/utils/cadastrosApi';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastrosClientes() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState(getClientes());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    status: 'Ativo' as 'Ativo' | 'Inativo'
  });

  const resetForm = () => {
    setForm({
      nome: '',
      cpf: '',
      telefone: '',
      dataNascimento: '',
      email: '',
      cep: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      status: 'Ativo'
    });
    setEditingCliente(null);
  };

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setForm({ ...cliente });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.cpf) {
      toast({ title: 'Erro', description: 'Nome e CPF são obrigatórios', variant: 'destructive' });
      return;
    }

    if (editingCliente) {
      updateCliente(editingCliente.id, form);
      toast({ title: 'Sucesso', description: 'Cliente atualizado com sucesso' });
    } else {
      addCliente(form);
      toast({ title: 'Sucesso', description: 'Cliente cadastrado com sucesso' });
    }

    setClientes(getClientes());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteCliente(id);
    setClientes(getClientes());
    toast({ title: 'Sucesso', description: 'Cliente removido com sucesso' });
  };

  const handleExport = () => {
    exportToCSV(clientes, 'clientes.csv');
  };

  return (
    <CadastrosLayout title="Cadastro de Clientes">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
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
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map(cliente => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-mono text-xs">{cliente.id}</TableCell>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell className="text-xs">{cliente.cpf}</TableCell>
                  <TableCell>{cliente.telefone}</TableCell>
                  <TableCell className="text-xs">{cliente.email}</TableCell>
                  <TableCell>{cliente.cidade}/{cliente.estado}</TableCell>
                  <TableCell>
                    <Badge variant={cliente.status === 'Ativo' ? 'default' : 'secondary'}>
                      {cliente.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(cliente)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cliente.id)}>
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
            <DialogTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="999.999.999-99" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input type="date" value={form.dataNascimento} onChange={e => setForm({ ...form, dataNascimento: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} maxLength={2} />
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
