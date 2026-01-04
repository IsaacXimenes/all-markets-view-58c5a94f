import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Edit, Plus, Trash2, CreditCard } from 'lucide-react';
import { 
  getMaquinasCartao, 
  addMaquinaCartao, 
  updateMaquinaCartao, 
  deleteMaquinaCartao, 
  getLojas, 
  getContasFinanceiras,
  getLojaById,
  getContaFinanceiraById,
  MaquinaCartao 
} from '@/utils/cadastrosApi';
import { exportToCSV } from '@/utils/formatUtils';
import { toast } from 'sonner';

export default function CadastrosMaquinas() {
  const [maquinas, setMaquinas] = useState(getMaquinasCartao());
  const lojas = getLojas().filter(l => l.status === 'Ativo');
  const contasFinanceiras = getContasFinanceiras().filter(c => c.status === 'Ativo');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState<MaquinaCartao | null>(null);

  const [form, setForm] = useState({
    nome: '',
    cnpjVinculado: '',
    contaOrigem: '',
    status: 'Ativo' as MaquinaCartao['status']
  });

  const resetForm = () => {
    setForm({
      nome: '',
      cnpjVinculado: '',
      contaOrigem: '',
      status: 'Ativo'
    });
    setEditingMaquina(null);
  };

  const handleOpenDialog = (maquina?: MaquinaCartao) => {
    if (maquina) {
      setEditingMaquina(maquina);
      setForm({
        nome: maquina.nome,
        cnpjVinculado: maquina.cnpjVinculado,
        contaOrigem: maquina.contaOrigem,
        status: maquina.status
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.cnpjVinculado || !form.contaOrigem) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const maquinaData = {
      nome: form.nome,
      cnpjVinculado: form.cnpjVinculado,
      contaOrigem: form.contaOrigem,
      status: form.status
    };

    if (editingMaquina) {
      updateMaquinaCartao(editingMaquina.id, maquinaData);
      toast.success('Máquina atualizada com sucesso!');
    } else {
      const novaMaquina = addMaquinaCartao(maquinaData);
      toast.success(`Máquina criada: ${novaMaquina.id}`);
    }

    setMaquinas(getMaquinasCartao());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta máquina?')) {
      deleteMaquinaCartao(id);
      setMaquinas(getMaquinasCartao());
      toast.success('Máquina excluída com sucesso!');
    }
  };

  const handleExport = () => {
    const data = maquinas.map(m => {
      const loja = getLojaById(m.cnpjVinculado);
      const conta = getContaFinanceiraById(m.contaOrigem);
      return {
        ID: m.id,
        Nome: m.nome,
        'Loja Vinculada': loja?.nome || m.cnpjVinculado,
        'CNPJ': loja?.cnpj || '-',
        'Conta de Origem': conta?.nome || m.contaOrigem,
        Status: m.status
      };
    });
    exportToCSV(data, `maquinas-cartao-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Máquinas exportadas com sucesso!');
  };

  return (
    <CadastrosLayout title="Cadastro de Máquinas de Cartão">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Máquinas de Cartão Cadastradas
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Máquina
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingMaquina ? 'Editar Máquina' : 'Nova Máquina de Cartão'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <Label>Nome da Máquina *</Label>
                      <Input
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        placeholder="Ex: Máquina Stone Matriz"
                      />
                    </div>
                    <div>
                      <Label>Loja Vinculada (CNPJ) *</Label>
                      <Select value={form.cnpjVinculado} onValueChange={(value) => setForm({ ...form, cnpjVinculado: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a loja..." />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>
                              {loja.nome} - {loja.cnpj}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Conta de Origem *</Label>
                      <Select value={form.contaOrigem} onValueChange={(value) => setForm({ ...form, contaOrigem: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a conta..." />
                        </SelectTrigger>
                        <SelectContent>
                          {contasFinanceiras.map(conta => (
                            <SelectItem key={conta.id} value={conta.id}>
                              {conta.nome} - {conta.banco || conta.tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status *</Label>
                      <Select value={form.status} onValueChange={(value: MaquinaCartao['status']) => setForm({ ...form, status: value })}>
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
                      Salvar Máquina
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
                  <TableHead>Nome da Máquina</TableHead>
                  <TableHead>Loja Vinculada</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Conta de Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maquinas.map((maquina) => {
                  const loja = getLojaById(maquina.cnpjVinculado);
                  const conta = getContaFinanceiraById(maquina.contaOrigem);
                  return (
                    <TableRow key={maquina.id}>
                      <TableCell className="font-mono text-xs">{maquina.id}</TableCell>
                      <TableCell className="font-medium">{maquina.nome}</TableCell>
                      <TableCell>{loja?.nome || maquina.cnpjVinculado}</TableCell>
                      <TableCell className="font-mono text-xs">{loja?.cnpj || '-'}</TableCell>
                      <TableCell>{conta?.nome || maquina.contaOrigem}</TableCell>
                      <TableCell>
                        <Badge variant={maquina.status === 'Ativo' ? 'default' : 'secondary'}>
                          {maquina.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(maquina)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(maquina.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {maquinas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma máquina cadastrada.
            </div>
          )}
        </CardContent>
      </Card>
    </CadastrosLayout>
  );
}