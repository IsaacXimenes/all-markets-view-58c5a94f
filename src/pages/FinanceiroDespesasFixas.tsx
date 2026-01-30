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
import { InputComMascara } from '@/components/ui/InputComMascara';
import { formatCurrency, exportToCSV, parseMoeda } from '@/utils/formatUtils';

export default function FinanceiroDespesasFixas() {
  const [despesas, setDespesas] = useState(getDespesas());
  const contasFinanceiras = getContasFinanceiras().filter(c => c.status === 'Ativo');

  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    competencia: '',
    conta: '',
    recorrencia: '',
    observacoes: ''
  });

  const despesasFixas = useMemo(() => despesas.filter(d => d.tipo === 'Fixa'), [despesas]);
  const totalFixas = useMemo(() => despesasFixas.reduce((acc, d) => acc + d.valor, 0), [despesasFixas]);

  const handleLancar = () => {
    if (!form.descricao || !form.valor || !form.competencia || !form.conta || !form.recorrencia) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const novaDespesa = addDespesa({
      tipo: 'Fixa',
      descricao: form.descricao,
      valor: parseMoeda(form.valor),
      data: new Date().toISOString().split('T')[0], // Data atual correta
      competencia: form.competencia,
      conta: form.conta,
      observacoes: `${form.recorrencia} - ${form.observacoes}`
    });

    setDespesas(getDespesas());
    toast.success(`Despesa Fixa lançada: ${novaDespesa.id}`);
    setForm({
      descricao: '',
      valor: '',
      data: new Date().toISOString().split('T')[0],
      competencia: '',
      conta: '',
      recorrencia: '',
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
    const data = despesasFixas.map(d => ({
      ID: d.id,
      Data: d.data,
      Descrição: d.descricao,
      Valor: formatCurrency(d.valor),
      Competência: d.competencia,
      Conta: d.conta,
      Observações: d.observacoes || ''
    }));
    exportToCSV(data, `despesas-fixas-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Despesas Fixas exportadas!');
  };

  return (
    <FinanceiroLayout title="Lançar Despesas Fixas">
      <div className="space-y-6">
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-400">Nova Despesa Fixa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Descrição *</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: Aluguel, Energia..."
                />
              </div>
              <div>
                <Label>Valor (R$) *</Label>
                <InputComMascara
                  mascara="moeda"
                  value={form.valor}
                  onChange={(valor) => setForm({ ...form, valor })}
                  placeholder="R$ 0,00"
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
              <div>
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
              <div>
                <Label>Recorrência *</Label>
                <Select value={form.recorrencia} onValueChange={(value) => setForm({ ...form, recorrencia: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
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
                competencia: '', conta: '', recorrencia: '', observacoes: ''
              })}>
                Cancelar
              </Button>
              <Button onClick={handleLancar} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Lançar Despesa Fixa
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Despesas Fixas Lançadas</CardTitle>
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
                  {despesasFixas.map(d => (
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
              <span className="text-lg font-bold">Total: {formatCurrency(totalFixas)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </FinanceiroLayout>
  );
}
