import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getColaboradores, addColaborador, updateColaborador, deleteColaborador, getCargos, getModelosPagamento, Colaborador, getCargoById, getModeloPagamentoById, getLojas, getLojaById } from '@/utils/cadastrosApi';
import { exportToCSV } from '@/utils/formatUtils';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastrosColaboradores() {
  const { toast } = useToast();
  const [colaboradores, setColaboradores] = useState(getColaboradores());
  const [cargos] = useState(getCargos());
  const [modelosPagamento] = useState(getModelosPagamento());
  const [lojas] = useState(getLojas().filter(l => l.status === 'Ativo'));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [form, setForm] = useState({
    cpf: '',
    nome: '',
    cargo: '',
    loja: '',
    dataAdmissao: '',
    dataInativacao: '',
    dataNascimento: '',
    email: '',
    telefone: '',
    modeloPagamento: '',
    salario: '',
    status: 'Ativo' as 'Ativo' | 'Inativo'
  });

  const resetForm = () => {
    setForm({
      cpf: '',
      nome: '',
      cargo: '',
      loja: '',
      dataAdmissao: '',
      dataInativacao: '',
      dataNascimento: '',
      email: '',
      telefone: '',
      modeloPagamento: '',
      salario: '',
      status: 'Ativo'
    });
    setEditingColaborador(null);
  };

  const handleOpenDialog = (colaborador?: Colaborador) => {
    if (colaborador) {
      setEditingColaborador(colaborador);
      setForm({
        cpf: colaborador.cpf,
        nome: colaborador.nome,
        cargo: colaborador.cargo,
        loja: colaborador.loja,
        dataAdmissao: colaborador.dataAdmissao,
        dataInativacao: colaborador.dataInativacao || '',
        dataNascimento: colaborador.dataNascimento || '',
        email: colaborador.email,
        telefone: colaborador.telefone,
        modeloPagamento: colaborador.modeloPagamento,
        salario: colaborador.salario?.toString() || '',
        status: colaborador.status
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.cpf || !form.cargo || !form.loja) {
      toast({ title: 'Erro', description: 'Nome, CPF, Cargo e Loja são obrigatórios', variant: 'destructive' });
      return;
    }

    const colaboradorData = {
      ...form,
      salario: form.salario ? parseFloat(form.salario) : undefined
    };

    if (editingColaborador) {
      updateColaborador(editingColaborador.id, colaboradorData);
      toast({ title: 'Sucesso', description: 'Colaborador atualizado com sucesso' });
    } else {
      addColaborador(colaboradorData);
      toast({ title: 'Sucesso', description: 'Colaborador cadastrado com sucesso' });
    }

    setColaboradores(getColaboradores());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteColaborador(id);
    setColaboradores(getColaboradores());
    toast({ title: 'Sucesso', description: 'Colaborador removido com sucesso' });
  };

  const handleExport = () => {
    exportToCSV(colaboradores, 'colaboradores.csv');
  };

  return (
    <CadastrosLayout title="Cadastro de Colaboradores">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Colaborador
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
                <TableHead>Loja</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead>Salário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradores.map(col => (
                <TableRow key={col.id}>
                  <TableCell className="font-mono text-xs">{col.id}</TableCell>
                  <TableCell className="font-medium">{col.nome}</TableCell>
                  <TableCell className="text-xs">{col.cpf}</TableCell>
                  <TableCell>{getLojaById(col.loja)?.nome || '-'}</TableCell>
                  <TableCell>{getCargoById(col.cargo)?.funcao || '-'}</TableCell>
                  <TableCell>{new Date(col.dataAdmissao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{col.salario ? `R$ ${col.salario.toLocaleString('pt-BR')}` : '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${col.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {col.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(col)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(col.id)}>
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
            <DialogTitle>{editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="999.999.999-99" />
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Loja *</Label>
              <Select value={form.loja} onValueChange={v => setForm({ ...form, loja: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Select value={form.cargo} onValueChange={v => setForm({ ...form, cargo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {cargos.map(cargo => (
                    <SelectItem key={cargo.id} value={cargo.id}>{cargo.funcao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Admissão</Label>
              <Input type="date" value={form.dataAdmissao} onChange={e => setForm({ ...form, dataAdmissao: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input type="date" value={form.dataNascimento} onChange={e => setForm({ ...form, dataNascimento: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Salário Base (R$)</Label>
              <Input type="number" value={form.salario} onChange={e => setForm({ ...form, salario: e.target.value })} placeholder="2500.00" />
            </div>
            <div className="space-y-2">
              <Label>Modelo de Pagamento</Label>
              <Select value={form.modeloPagamento} onValueChange={v => setForm({ ...form, modeloPagamento: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {modelosPagamento.map(mp => (
                    <SelectItem key={mp.id} value={mp.id}>{mp.modelo}</SelectItem>
                  ))}
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
