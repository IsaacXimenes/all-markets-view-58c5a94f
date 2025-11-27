import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Plus, Trash2 } from 'lucide-react';
import { getDespesas, getContas, addDespesa, deleteDespesa, exportToCSV } from '@/utils/financeApi';
import { toast } from 'sonner';

export default function FinanceiroLancarDespesa() {
  const [despesas, setDespesas] = useState(getDespesas());
  const contas = getContas();

  const [formFixa, setFormFixa] = useState({
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    competencia: '',
    conta: '',
    observacoes: ''
  });

  const [formVariavel, setFormVariavel] = useState({
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    competencia: '',
    conta: '',
    observacoes: ''
  });

  const despesasFixas = useMemo(() => despesas.filter(d => d.tipo === 'Fixa'), [despesas]);
  const despesasVariaveis = useMemo(() => despesas.filter(d => d.tipo === 'Variável'), [despesas]);

  const totalFixas = useMemo(() => despesasFixas.reduce((acc, d) => acc + d.valor, 0), [despesasFixas]);
  const totalVariaveis = useMemo(() => despesasVariaveis.reduce((acc, d) => acc + d.valor, 0), [despesasVariaveis]);
  const saldoProjetado = useMemo(() => {
    const totalContas = contas.reduce((acc, c) => acc + c.saldoAtual, 0);
    return totalContas - totalFixas - totalVariaveis;
  }, [contas, totalFixas, totalVariaveis]);

  const handleLancarFixa = () => {
    if (!formFixa.descricao || !formFixa.valor || !formFixa.competencia || !formFixa.conta) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const novaDespesa = addDespesa({
      tipo: 'Fixa',
      descricao: formFixa.descricao,
      valor: parseFloat(formFixa.valor),
      data: formFixa.data,
      competencia: formFixa.competencia,
      conta: formFixa.conta,
      observacoes: formFixa.observacoes
    });

    setDespesas(getDespesas());
    toast.success(`Despesa Fixa lançada: ${novaDespesa.id}`);
    setFormFixa({
      descricao: '',
      valor: '',
      data: new Date().toISOString().split('T')[0],
      competencia: '',
      conta: '',
      observacoes: ''
    });
  };

  const handleLancarVariavel = () => {
    if (!formVariavel.descricao || !formVariavel.valor || !formVariavel.competencia || !formVariavel.conta) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const novaDespesa = addDespesa({
      tipo: 'Variável',
      descricao: formVariavel.descricao,
      valor: parseFloat(formVariavel.valor),
      data: formVariavel.data,
      competencia: formVariavel.competencia,
      conta: formVariavel.conta,
      observacoes: formVariavel.observacoes
    });

    setDespesas(getDespesas());
    toast.success(`Despesa Variável lançada: ${novaDespesa.id}`);
    setFormVariavel({
      descricao: '',
      valor: '',
      data: new Date().toISOString().split('T')[0],
      competencia: '',
      conta: '',
      observacoes: ''
    });
  };

  const handleDelete = (id: string) => {
    if (deleteDespesa(id)) {
      setDespesas(getDespesas());
      toast.success('Despesa excluída');
    }
  };

  const handleExportFixas = () => {
    const data = despesasFixas.map(d => ({
      ID: d.id,
      Data: d.data,
      Descrição: d.descricao,
      Valor: `R$ ${d.valor.toFixed(2)}`,
      Competência: d.competencia,
      Conta: d.conta,
      Observações: d.observacoes || ''
    }));
    exportToCSV(data, `despesas-fixas-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Despesas Fixas exportadas!');
  };

  const handleExportVariaveis = () => {
    const data = despesasVariaveis.map(d => ({
      ID: d.id,
      Data: d.data,
      Descrição: d.descricao,
      Valor: `R$ ${d.valor.toFixed(2)}`,
      Competência: d.competencia,
      Conta: d.conta,
      Observações: d.observacoes || ''
    }));
    exportToCSV(data, `despesas-variaveis-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Despesas Variáveis exportadas!');
  };

  return (
    <FinanceiroLayout title="Lançar Despesa">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Despesas Fixas</div>
              <div className="text-2xl font-bold text-blue-600">R$ {totalFixas.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Despesas Variáveis</div>
              <div className="text-2xl font-bold text-orange-600">R$ {totalVariaveis.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Saldo Projetado</div>
              <div className={`text-2xl font-bold ${saldoProjetado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {saldoProjetado.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Despesas Fixas */}
          <div className="space-y-4">
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-blue-700 dark:text-blue-400">Lançar Despesas Fixas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Descrição *</Label>
                  <Input
                    value={formFixa.descricao}
                    onChange={(e) => setFormFixa({ ...formFixa, descricao: e.target.value })}
                    placeholder="Ex: Aluguel, Energia..."
                  />
                </div>
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formFixa.valor}
                    onChange={(e) => setFormFixa({ ...formFixa, valor: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label>Data de Lançamento *</Label>
                  <Input
                    type="date"
                    value={formFixa.data}
                    onChange={(e) => setFormFixa({ ...formFixa, data: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Competência *</Label>
                  <Input
                    value={formFixa.competencia}
                    onChange={(e) => setFormFixa({ ...formFixa, competencia: e.target.value })}
                    placeholder="Ex: JAN-2025"
                  />
                </div>
                <div>
                  <Label>Conta de Origem *</Label>
                  <Select value={formFixa.conta} onValueChange={(value) => setFormFixa({ ...formFixa, conta: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map(c => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formFixa.observacoes}
                    onChange={(e) => setFormFixa({ ...formFixa, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setFormFixa({
                    descricao: '', valor: '', data: new Date().toISOString().split('T')[0],
                    competencia: '', conta: '', observacoes: ''
                  })}>
                    Cancelar
                  </Button>
                  <Button onClick={handleLancarFixa} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Lançar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Despesas Fixas Lançadas</CardTitle>
                <Button size="sm" variant="outline" onClick={handleExportFixas}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {despesasFixas.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.id}</TableCell>
                          <TableCell>{d.descricao}</TableCell>
                          <TableCell className="font-semibold">R$ {d.valor.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 pt-4 border-t text-right font-bold">
                  Total: R$ {totalFixas.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Despesas Variáveis */}
          <div className="space-y-4">
            <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-orange-700 dark:text-orange-400">Lançar Despesa Variável</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Descrição *</Label>
                  <Input
                    value={formVariavel.descricao}
                    onChange={(e) => setFormVariavel({ ...formVariavel, descricao: e.target.value })}
                    placeholder="Ex: Compra de estoque..."
                  />
                </div>
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formVariavel.valor}
                    onChange={(e) => setFormVariavel({ ...formVariavel, valor: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label>Data de Lançamento *</Label>
                  <Input
                    type="date"
                    value={formVariavel.data}
                    onChange={(e) => setFormVariavel({ ...formVariavel, data: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Competência *</Label>
                  <Input
                    value={formVariavel.competencia}
                    onChange={(e) => setFormVariavel({ ...formVariavel, competencia: e.target.value })}
                    placeholder="Ex: JAN-2025"
                  />
                </div>
                <div>
                  <Label>Conta de Origem *</Label>
                  <Select value={formVariavel.conta} onValueChange={(value) => setFormVariavel({ ...formVariavel, conta: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map(c => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formVariavel.observacoes}
                    onChange={(e) => setFormVariavel({ ...formVariavel, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setFormVariavel({
                    descricao: '', valor: '', data: new Date().toISOString().split('T')[0],
                    competencia: '', conta: '', observacoes: ''
                  })}>
                    Cancelar
                  </Button>
                  <Button onClick={handleLancarVariavel} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Lançar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Despesas Variáveis Lançadas</CardTitle>
                <Button size="sm" variant="outline" onClick={handleExportVariaveis}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {despesasVariaveis.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.id}</TableCell>
                          <TableCell>{d.descricao}</TableCell>
                          <TableCell className="font-semibold">R$ {d.valor.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 pt-4 border-t text-right font-bold">
                  Total: R$ {totalVariaveis.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </FinanceiroLayout>
  );
}
