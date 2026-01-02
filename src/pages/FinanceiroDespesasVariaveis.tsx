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
import { getDespesas, addDespesa, deleteDespesa } from '@/utils/financeApi';
import { getContasFinanceiras } from '@/utils/cadastrosApi';
import { toast } from 'sonner';

import { formatCurrency, exportToCSV } from '@/utils/formatUtils';

export default function FinanceiroDespesasVariaveis() {
  const [despesas, setDespesas] = useState(getDespesas());
  const contasFinanceiras = getContasFinanceiras().filter(c => c.status === 'Ativo');

  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    competencia: '',
    conta: '',
    observacoes: ''
  });

  const despesasVariaveis = useMemo(() => despesas.filter(d => d.tipo === 'Variável'), [despesas]);
  const totalVariaveis = useMemo(() => despesasVariaveis.reduce((acc, d) => acc + d.valor, 0), [despesasVariaveis]);

  const handleLancar = () => {
    if (!form.descricao || !form.valor || !form.competencia || !form.conta) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const novaDespesa = addDespesa({
      tipo: 'Variável',
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      data: form.data,
      competencia: form.competencia,
      conta: form.conta,
      observacoes: form.observacoes
    });

    setDespesas(getDespesas());
    toast.success(`Despesa Variável lançada: ${novaDespesa.id}`);
    setForm({
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

  const handleExport = () => {
    const data = despesasVariaveis.map(d => ({
      ID: d.id,
      Data: d.data,
      Descrição: d.descricao,
      Valor: formatCurrency(d.valor),
      Competência: d.competencia,
      Conta: d.conta,
      Observações: d.observacoes || ''
    }));
    exportToCSV(data, `despesas-variaveis-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Despesas Variáveis exportadas!');
  };

  return (
    <FinanceiroLayout title="Lançar Despesas Variáveis">
      <div className="space-y-6">
        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="text-orange-700 dark:text-orange-400">Nova Despesa Variável</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Descrição *</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: Compra de estoque..."
                />
              </div>
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Data de Lançamento *</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                />
              </div>
              <div>
                <Label>Competência *</Label>
                <Input
                  value={form.competencia}
                  onChange={(e) => setForm({ ...form, competencia: e.target.value })}
                  placeholder="Ex: JAN-2025"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Conta de Origem *</Label>
                <Select value={form.conta} onValueChange={(value) => setForm({ ...form, conta: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contasFinanceiras.map(c => (
                      <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Observações adicionais..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setForm({
                descricao: '', valor: '', data: new Date().toISOString().split('T')[0],
                competencia: '', conta: '', observacoes: ''
              })}>
                Cancelar
              </Button>
              <Button onClick={handleLancar} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Lançar Despesa Variável
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Despesas Variáveis Lançadas</CardTitle>
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesasVariaveis.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.id}</TableCell>
                      <TableCell>{new Date(d.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{d.descricao}</TableCell>
                      <TableCell className="text-xs">{d.conta}</TableCell>
                      <TableCell>{d.competencia}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(d.valor)}</TableCell>
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
            <div className="mt-4 pt-4 border-t text-right">
              <span className="text-lg font-bold">Total: {formatCurrency(totalVariaveis)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </FinanceiroLayout>
  );
}
