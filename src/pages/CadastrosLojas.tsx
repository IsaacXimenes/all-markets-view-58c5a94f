import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getLojas, addLoja, updateLoja, deleteLoja, getColaboradores, Loja } from '@/utils/cadastrosApi';
import { exportToCSV } from '@/utils/formatUtils';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastrosLojas() {
  const { toast } = useToast();
  const [lojas, setLojas] = useState(getLojas());
  const [colaboradores] = useState(getColaboradores());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<Loja | null>(null);
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    cep: '',
    cidade: '',
    estado: '',
    responsavel: '',
    horarioFuncionamento: '',
    status: 'Ativo' as 'Ativo' | 'Inativo'
  });

  const resetForm = () => {
    setForm({
      nome: '',
      cnpj: '',
      endereco: '',
      telefone: '',
      cep: '',
      cidade: '',
      estado: '',
      responsavel: '',
      horarioFuncionamento: '',
      status: 'Ativo'
    });
    setEditingLoja(null);
  };

  const handleOpenDialog = (loja?: Loja) => {
    if (loja) {
      setEditingLoja(loja);
      setForm({
        nome: loja.nome,
        cnpj: loja.cnpj,
        endereco: loja.endereco,
        telefone: loja.telefone,
        cep: loja.cep,
        cidade: loja.cidade,
        estado: loja.estado,
        responsavel: loja.responsavel,
        horarioFuncionamento: loja.horarioFuncionamento,
        status: loja.status
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

    if (editingLoja) {
      updateLoja(editingLoja.id, form);
      toast({ title: 'Sucesso', description: 'Loja atualizada com sucesso' });
    } else {
      addLoja(form);
      toast({ title: 'Sucesso', description: 'Loja cadastrada com sucesso' });
    }

    setLojas(getLojas());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteLoja(id);
    setLojas(getLojas());
    toast({ title: 'Sucesso', description: 'Loja removida com sucesso' });
  };

  const handleExport = () => {
    exportToCSV(lojas, 'lojas.csv');
  };

  const getColaboradorNome = (id: string) => {
    const col = colaboradores.find(c => c.id === id);
    return col?.nome || '-';
  };

  return (
    <CadastrosLayout title="Cadastro de Lojas">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Loja
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
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lojas.map(loja => (
                <TableRow key={loja.id}>
                  <TableCell className="font-mono text-xs">{loja.id}</TableCell>
                  <TableCell className="font-medium">{loja.nome}</TableCell>
                  <TableCell className="text-xs">{loja.cnpj}</TableCell>
                  <TableCell>{loja.cidade}/{loja.estado}</TableCell>
                  <TableCell>{loja.telefone}</TableCell>
                  <TableCell>{getColaboradorNome(loja.responsavel)}</TableCell>
                  <TableCell>
                    <Badge variant={loja.status === 'Ativo' ? 'default' : 'secondary'}>
                      {loja.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(loja)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(loja.id)}>
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
            <DialogTitle>{editingLoja ? 'Editar Loja' : 'Nova Loja'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Loja *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CNPJ *</Label>
              <Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="99.999.999/9999-99" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Endereço Completo</Label>
              <Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
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
              <Label>Responsável</Label>
              <Select value={form.responsavel} onValueChange={v => setForm({ ...form, responsavel: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horário de Funcionamento</Label>
              <Input value={form.horarioFuncionamento} onChange={e => setForm({ ...form, horarioFuncionamento: e.target.value })} placeholder="09:00 - 18:00" />
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
