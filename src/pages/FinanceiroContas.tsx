import { useState } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Download, Edit, Plus, Trash2 } from 'lucide-react';
import { getContas, getLojas, addConta, updateConta, deleteConta, Conta } from '@/utils/financeApi';
import { exportToCSV } from '@/utils/formatUtils';
import { toast } from 'sonner';

export default function FinanceiroContas() {
  const [contas, setContas] = useState(getContas());
  const lojas = getLojas();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<Conta | null>(null);

  const [form, setForm] = useState({
    nome: '',
    tipo: 'Caixa' as Conta['tipo'],
    lojaVinculada: '',
    banco: '',
    agencia: '',
    conta: '',
    cnpj: '',
    saldoAtual: ''
  });

  const resetForm = () => {
    setForm({
      nome: '',
      tipo: 'Caixa',
      lojaVinculada: '',
      banco: '',
      agencia: '',
      conta: '',
      cnpj: '',
      saldoAtual: ''
    });
    setEditingConta(null);
  };

  const handleOpenDialog = (conta?: Conta) => {
    if (conta) {
      setEditingConta(conta);
      setForm({
        nome: conta.nome,
        tipo: conta.tipo,
        lojaVinculada: conta.lojaVinculada,
        banco: conta.banco || '',
        agencia: conta.agencia || '',
        conta: conta.conta || '',
        cnpj: conta.cnpj || '',
        saldoAtual: conta.saldoAtual.toString()
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.tipo || !form.lojaVinculada || !form.saldoAtual) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const contaData = {
      nome: form.nome,
      tipo: form.tipo,
      lojaVinculada: form.lojaVinculada,
      banco: form.banco,
      agencia: form.agencia,
      conta: form.conta,
      cnpj: form.cnpj,
      saldoAtual: parseFloat(form.saldoAtual)
    };

    if (editingConta) {
      updateConta(editingConta.id, contaData);
      toast.success('Conta atualizada com sucesso!');
    } else {
      const novaConta = addConta(contaData);
      toast.success(`Conta criada: ${novaConta.id}`);
    }

    setContas(getContas());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (deleteConta(id)) {
      setContas(getContas());
      toast.success('Conta excluída com sucesso!');
    }
  };

  const handleExport = () => {
    const data = contas.map(c => ({
      ID: c.id,
      Nome: c.nome,
      Tipo: c.tipo,
      'Loja Vinculada': c.lojaVinculada,
      Banco: c.banco || '',
      Agência: c.agencia || '',
      Conta: c.conta || '',
      CNPJ: c.cnpj || '',
      'Saldo Atual': `R$ ${c.saldoAtual.toFixed(2)}`
    }));
    exportToCSV(data, `contas-financeiras-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Contas exportadas com sucesso!');
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  return (
    <FinanceiroLayout title="Configurar Contas Financeiras">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Contas Cadastradas</CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Conta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingConta ? 'Editar Conta' : 'Nova Conta Financeira'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome da Conta *</Label>
                      <Input
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        placeholder="Ex: Caixa Loja Centro"
                      />
                    </div>
                    <div>
                      <Label>Tipo *</Label>
                      <Select value={form.tipo} onValueChange={(value: Conta['tipo']) => setForm({ ...form, tipo: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Caixa">Caixa</SelectItem>
                          <SelectItem value="Pix">Pix</SelectItem>
                          <SelectItem value="Conta Bancária">Conta Bancária</SelectItem>
                          <SelectItem value="Conta Digital">Conta Digital</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Loja Vinculada *</Label>
                      <Select value={form.lojaVinculada} onValueChange={(value) => setForm({ ...form, lojaVinculada: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja} value={loja}>{loja}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Banco</Label>
                      <Input
                        value={form.banco}
                        onChange={(e) => setForm({ ...form, banco: e.target.value })}
                        placeholder="Ex: Banco do Brasil"
                      />
                    </div>
                    <div>
                      <Label>Agência (com dígito)</Label>
                      <Input
                        value={form.agencia}
                        onChange={(e) => setForm({ ...form, agencia: e.target.value })}
                        placeholder="Ex: 1234-5"
                      />
                    </div>
                    <div>
                      <Label>Conta (com dígito)</Label>
                      <Input
                        value={form.conta}
                        onChange={(e) => setForm({ ...form, conta: e.target.value })}
                        placeholder="Ex: 98765-4"
                      />
                    </div>
                    <div>
                      <Label>CNPJ</Label>
                      <Input
                        value={form.cnpj}
                        onChange={(e) => setForm({ ...form, cnpj: formatCNPJ(e.target.value) })}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                    </div>
                    <div>
                      <Label>Saldo Inicial (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.saldoAtual}
                        onChange={(e) => setForm({ ...form, saldoAtual: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                      Salvar Conta
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome da Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Loja Vinculada</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Saldo Atual</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-mono text-xs">{conta.id}</TableCell>
                    <TableCell className="font-medium">{conta.nome}</TableCell>
                    <TableCell>{conta.tipo}</TableCell>
                    <TableCell>{conta.lojaVinculada}</TableCell>
                    <TableCell>{conta.banco || '-'}</TableCell>
                    <TableCell>{conta.agencia || '-'}</TableCell>
                    <TableCell>{conta.conta || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{conta.cnpj || '-'}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      R$ {conta.saldoAtual.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(conta)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(conta.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </FinanceiroLayout>
  );
}
