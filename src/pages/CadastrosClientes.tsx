import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getClientes, addCliente, updateCliente, deleteCliente, exportToCSV, Cliente, getClienteByCpf, calcularTipoPessoa } from '@/utils/cadastrosApi';
import { Plus, Pencil, Trash2, Download, Crown, User, UserPlus } from 'lucide-react';
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
    status: 'Ativo' as 'Ativo' | 'Inativo',
    origemCliente: 'Venda' as 'Assistência' | 'Venda'
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
      status: 'Ativo',
      origemCliente: 'Venda'
    });
    setEditingCliente(null);
  };

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setForm({ 
        nome: cliente.nome,
        cpf: cliente.cpf,
        telefone: cliente.telefone,
        dataNascimento: cliente.dataNascimento,
        email: cliente.email,
        cep: cliente.cep,
        endereco: cliente.endereco,
        numero: cliente.numero,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        estado: cliente.estado,
        status: cliente.status,
        origemCliente: cliente.origemCliente
      });
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

    // Validar se CPF já existe e está inativo (bloqueio)
    if (!editingCliente) {
      const clienteExistente = getClienteByCpf(form.cpf);
      if (clienteExistente && clienteExistente.status === 'Inativo') {
        toast({ 
          title: 'Cliente Bloqueado', 
          description: 'Este CPF pertence a um cliente inativo. Não é permitido cadastrar novamente.', 
          variant: 'destructive' 
        });
        return;
      }
    }

    if (editingCliente) {
      updateCliente(editingCliente.id, {
        ...form,
        idsCompras: editingCliente.idsCompras
      });
      toast({ title: 'Sucesso', description: 'Cliente atualizado com sucesso' });
    } else {
      addCliente({
        ...form,
        idsCompras: [],
        origemCliente: form.origemCliente
      });
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
    const dataExport = clientes.map(c => ({
      ID: c.id,
      Nome: c.nome,
      'CPF/CNPJ': c.cpf,
      TipoPessoa: c.tipoPessoa,
      Telefone: c.telefone,
      Email: c.email,
      Cidade: c.cidade,
      Estado: c.estado,
      Status: c.status,
      Origem: c.origemCliente,
      TipoCliente: c.tipoCliente,
      NumCompras: c.idsCompras.length,
      IDsCompras: c.idsCompras.join('; ')
    }));
    exportToCSV(dataExport, 'clientes.csv');
  };

  const getTipoPessoaBadge = (tipoPessoa: string) => {
    if (tipoPessoa === 'Pessoa Jurídica') {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Pessoa Jurídica</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600">Pessoa Física</Badge>;
  };

  // Formatar CPF/CNPJ dinamicamente
  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const getTipoClienteBadge = (tipo: string) => {
    switch (tipo) {
      case 'VIP':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Crown className="h-3 w-3 mr-1" />VIP</Badge>;
      case 'Normal':
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Normal</Badge>;
      default:
        return <Badge variant="outline"><UserPlus className="h-3 w-3 mr-1" />Novo</Badge>;
    }
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

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Tipo Pessoa</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Tipo Cliente</TableHead>
                <TableHead>IDs Compras</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map(cliente => (
                <TableRow key={cliente.id} className={cliente.status === 'Inativo' ? 'opacity-50' : ''}>
                  <TableCell className="font-mono text-xs">{cliente.id}</TableCell>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell className="text-xs">{cliente.cpf}</TableCell>
                  <TableCell>{getTipoPessoaBadge(cliente.tipoPessoa)}</TableCell>
                  <TableCell>{cliente.telefone}</TableCell>
                  <TableCell className="text-xs">{cliente.email}</TableCell>
                  <TableCell>{cliente.cidade}/{cliente.estado}</TableCell>
                  <TableCell>
                    <Badge variant={cliente.origemCliente === 'Venda' ? 'default' : 'secondary'}>
                      {cliente.origemCliente}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getTipoClienteBadge(cliente.tipoCliente)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate text-xs text-muted-foreground" title={cliente.idsCompras.join(', ')}>
                      {cliente.idsCompras.length > 0 ? cliente.idsCompras.join(', ') : '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cliente.status === 'Ativo' ? 'default' : 'destructive'}>
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
              <Label>CPF/CNPJ *</Label>
              <Input 
                value={form.cpf} 
                onChange={e => setForm({ ...form, cpf: formatCpfCnpj(e.target.value) })} 
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
              <p className="text-xs text-muted-foreground">
                {(form.cpf.replace(/\D/g, '').length || 0) <= 11 ? 'CPF - Pessoa Física' : 'CNPJ - Pessoa Jurídica'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pessoa</Label>
              <div className="pt-2">
                {getTipoPessoaBadge(calcularTipoPessoa(form.cpf))}
              </div>
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
              <Label>Origem do Cliente</Label>
              <Select value={form.origemCliente} onValueChange={v => setForm({ ...form, origemCliente: v as 'Assistência' | 'Venda' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Venda">Venda</SelectItem>
                  <SelectItem value="Assistência">Assistência</SelectItem>
                </SelectContent>
              </Select>
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
            
            {editingCliente && (
              <>
                <div className="space-y-2">
                  <Label>Tipo de Cliente (automático)</Label>
                  <div className="pt-2">
                    {getTipoClienteBadge(editingCliente.tipoCliente)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>IDs das Compras</Label>
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    {editingCliente.idsCompras.length > 0 
                      ? editingCliente.idsCompras.join(', ') 
                      : 'Nenhuma compra registrada'}
                  </div>
                </div>
              </>
            )}
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
