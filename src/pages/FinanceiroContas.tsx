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
import { Badge } from '@/components/ui/badge';
import { getContasFinanceiras, addContaFinanceira, updateContaFinanceira, deleteContaFinanceira, ContaFinanceira } from '@/utils/cadastrosApi';
import { exportToCSV } from '@/utils/formatUtils';
import { toast } from 'sonner';
import { useCadastroStore } from '@/store/cadastroStore';

export default function FinanceiroContas() {
  const [contas, setContas] = useState(getContasFinanceiras());
  const { obterLojasAtivas, obterNomeLoja } = useCadastroStore();
  const lojas = obterLojasAtivas();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFinanceira | null>(null);

  const [form, setForm] = useState({
    nome: '',
    tipo: 'Conta Bancária' as ContaFinanceira['tipo'],
    lojaVinculada: '',
    banco: '',
    agencia: '',
    conta: '',
    cnpj: '',
    saldoInicial: '',
    saldoAtual: '',
    status: 'Ativo' as ContaFinanceira['status'],
    statusMaquina: 'Própria' as ContaFinanceira['statusMaquina'],
    notaFiscal: true
  });

  const resetForm = () => {
    setForm({
      nome: '',
      tipo: 'Conta Bancária',
      lojaVinculada: '',
      banco: '',
      agencia: '',
      conta: '',
      cnpj: '',
      saldoInicial: '',
      saldoAtual: '',
      status: 'Ativo',
      statusMaquina: 'Própria',
      notaFiscal: true
    });
    setEditingConta(null);
  };

  const handleOpenDialog = (conta?: ContaFinanceira) => {
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
        saldoInicial: conta.saldoInicial.toString(),
        saldoAtual: conta.saldoAtual.toString(),
        status: conta.status,
        statusMaquina: conta.statusMaquina,
        notaFiscal: conta.notaFiscal
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleStatusMaquinaChange = (value: 'Terceirizada' | 'Própria') => {
    setForm({ 
      ...form, 
      statusMaquina: value,
      notaFiscal: value === 'Própria'
    });
  };

  const handleSave = () => {
    if (!form.nome || !form.tipo || !form.lojaVinculada) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const contaData: Omit<ContaFinanceira, 'id'> = {
      nome: form.nome,
      tipo: form.tipo,
      lojaVinculada: form.lojaVinculada,
      banco: form.banco,
      agencia: form.agencia,
      conta: form.conta,
      cnpj: form.cnpj,
      saldoInicial: parseFloat(form.saldoInicial) || 0,
      saldoAtual: parseFloat(form.saldoAtual) || 0,
      status: form.status,
      statusMaquina: form.statusMaquina,
      notaFiscal: form.notaFiscal
    };

    if (editingConta) {
      updateContaFinanceira(editingConta.id, contaData);
      toast.success('Conta atualizada com sucesso!');
    } else {
      const novaConta = addContaFinanceira(contaData);
      toast.success(`Conta criada: ${novaConta.id}`);
    }

    setContas(getContasFinanceiras());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteContaFinanceira(id);
    setContas(getContasFinanceiras());
    toast.success('Conta excluída com sucesso!');
  };

  const handleExport = () => {
    const data = contas.map(c => ({
      ID: c.id,
      Loja: obterNomeLoja(c.lojaVinculada),
      'Nome da Conta': c.nome,
      Tipo: c.tipo || '-',
      CNPJ: c.cnpj || '',
      'Valor Inicial': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldoInicial || 0),
      'Status Máquina': c.statusMaquina,
      'Nota Fiscal': c.notaFiscal ? 'Sim' : 'Não',
      Status: c.status
    }));
    exportToCSV(data, `contas-financeiras-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Contas exportadas com sucesso!');
  };

  const moedaMask = (value: number): string => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseMoeda = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
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
            <CardTitle>Contas Cadastradas ({contas.length})</CardTitle>
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
                        placeholder="Ex: Santander (Unicred)"
                      />
                    </div>
                    <div>
                      <Label>Loja Vinculada *</Label>
                      <Select value={form.lojaVinculada} onValueChange={(value) => setForm({ ...form, lojaVinculada: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo *</Label>
                      <Select value={form.tipo} onValueChange={(value: ContaFinanceira['tipo']) => setForm({ ...form, tipo: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Conta Bancária">Conta Bancária</SelectItem>
                          <SelectItem value="Conta Digital">Conta Digital</SelectItem>
                          <SelectItem value="Caixa">Caixa</SelectItem>
                          <SelectItem value="Pix">Pix</SelectItem>
                          <SelectItem value="Cartão">Cartão</SelectItem>
                          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valor Inicial</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <Input
                          type="text"
                          className="pl-10"
                          value={form.saldoInicial ? moedaMask(parseFloat(form.saldoInicial) || 0) : ''}
                          onChange={(e) => {
                            const valor = parseMoeda(e.target.value);
                            setForm({ ...form, saldoInicial: valor.toString() });
                          }}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Banco</Label>
                      <Input
                        value={form.banco}
                        onChange={(e) => setForm({ ...form, banco: e.target.value })}
                        placeholder="Ex: Santander, Bradesco..."
                      />
                    </div>
                    <div>
                      <Label>CNPJ *</Label>
                      <Input
                        value={form.cnpj}
                        onChange={(e) => setForm({ ...form, cnpj: formatCNPJ(e.target.value) })}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                    </div>
                    <div>
                      <Label>Status da Máquina *</Label>
                      <Select 
                        value={form.statusMaquina} 
                        onValueChange={(value: 'Terceirizada' | 'Própria') => handleStatusMaquinaChange(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Própria">Própria</SelectItem>
                          <SelectItem value="Terceirizada">Terceirizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nota Fiscal</Label>
                      <Input
                        value={form.notaFiscal ? 'Sim' : 'Não'}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Automático: Sim se Status Máquina = Própria
                      </p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(value: 'Ativo' | 'Inativo') => setForm({ ...form, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
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
                  <TableHead>Loja</TableHead>
                  <TableHead>Nome da Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-right">Valor Inicial</TableHead>
                  <TableHead>Status Máquina</TableHead>
                  <TableHead>Nota Fiscal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-mono text-xs">{conta.id}</TableCell>
                    <TableCell>{obterNomeLoja(conta.lojaVinculada)}</TableCell>
                    <TableCell className="font-medium">{conta.nome}</TableCell>
                    <TableCell className="text-sm">{conta.tipo || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{conta.cnpj || '-'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.saldoInicial || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={conta.statusMaquina === 'Própria' ? 'default' : 'secondary'}>
                        {conta.statusMaquina}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={conta.notaFiscal ? 'default' : 'outline'}>
                        {conta.notaFiscal ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={conta.status === 'Ativo' ? 'default' : 'destructive'}>
                        {conta.status}
                      </Badge>
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
