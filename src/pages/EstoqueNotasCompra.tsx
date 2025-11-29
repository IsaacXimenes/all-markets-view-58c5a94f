import { useState } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getNotasCompra, getFornecedores, exportToCSV, addNotaCompra } from '@/utils/estoqueApi';
import { Download, Plus, Eye } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function EstoqueNotasCompra() {
  const [notas, setNotas] = useState(getNotasCompra());
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const notasFiltradas = notas.filter(n => {
    if (fornecedorFilter !== 'todos' && n.fornecedor !== fornecedorFilter) return false;
    if (statusFilter !== 'todos' && n.status !== statusFilter) return false;
    if (dataInicio && n.data < dataInicio) return false;
    if (dataFim && n.data > dataFim) return false;
    return true;
  });

  const handleExport = () => {
    exportToCSV(notasFiltradas, 'notas-compra.csv');
  };

  const handleCadastrarNota = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const novaNota = addNotaCompra({
      data: formData.get('data') as string,
      numeroNota: formData.get('numeroNota') as string,
      fornecedor: formData.get('fornecedor') as string,
      valorTotal: parseFloat(formData.get('valorTotal') as string),
      produtos: [
        {
          marca: formData.get('marca') as string,
          modelo: formData.get('modelo') as string,
          cor: formData.get('cor') as string,
          imei: formData.get('imei') as string,
          tipo: formData.get('tipo') as 'Novo' | 'Seminovo',
          quantidade: parseInt(formData.get('quantidade') as string),
          valorUnitario: parseFloat(formData.get('valorUnitario') as string),
          valorTotal: parseFloat(formData.get('valorTotal') as string),
          saudeBateria: parseInt(formData.get('saudeBateria') as string)
        }
      ]
    });

    setNotas([...notas, novaNota]);
    setDialogOpen(false);
    toast({
      title: 'Nota cadastrada',
      description: `Nota ${novaNota.id} cadastrada com sucesso. Status: Pendente (aguardando Financeiro)`,
    });
  };

  return (
    <EstoqueLayout title="Notas de Compra">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="Data início"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-[150px]"
            />
            <Input
              type="date"
              placeholder="Data fim"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos fornecedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos fornecedores</SelectItem>
              {getFornecedores().map(fornecedor => (
                <SelectItem key={fornecedor} value={fornecedor}>{fornecedor}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Nova Nota
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cadastrar Nova Nota de Compra</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCadastrarNota} className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="numeroNota">Nº da Nota</Label>
                        <Input id="numeroNota" name="numeroNota" required />
                      </div>
                      <div>
                        <Label htmlFor="data">Data de Entrada</Label>
                        <Input id="data" name="data" type="date" required />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="fornecedor">Fornecedor</Label>
                      <Select name="fornecedor" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFornecedores().map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">Produto</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="marca">Marca</Label>
                          <Input id="marca" name="marca" defaultValue="Apple" required />
                        </div>
                        <div>
                          <Label htmlFor="modelo">Modelo</Label>
                          <Input id="modelo" name="modelo" required />
                        </div>
                        <div>
                          <Label htmlFor="cor">Cor</Label>
                          <Input id="cor" name="cor" required />
                        </div>
                        <div>
                          <Label htmlFor="imei">IMEI</Label>
                          <Input id="imei" name="imei" required />
                        </div>
                        <div>
                          <Label htmlFor="tipo">Tipo</Label>
                          <Select name="tipo" required>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Novo">Novo</SelectItem>
                              <SelectItem value="Seminovo">Seminovo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="quantidade">Quantidade</Label>
                          <Input id="quantidade" name="quantidade" type="number" defaultValue="1" required />
                        </div>
                        <div>
                          <Label htmlFor="valorUnitario">Valor Unitário</Label>
                          <Input id="valorUnitario" name="valorUnitario" type="number" step="0.01" required />
                        </div>
                        <div>
                          <Label htmlFor="saudeBateria">Saúde Bateria (%)</Label>
                          <Input id="saudeBateria" name="saudeBateria" type="number" defaultValue="100" required />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="valorTotal">Valor Total da Nota</Label>
                      <Input id="valorTotal" name="valorTotal" type="number" step="0.01" required />
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h3 className="font-semibold mb-2 text-muted-foreground">Seção "Pagamento"</h3>
                      <p className="text-sm text-muted-foreground">Preenchido pelo Financeiro</p>
                      <div className="space-y-2 mt-2 opacity-50">
                        <Input placeholder="Forma de Pagamento" disabled />
                        <Input placeholder="Parcelas" disabled />
                        <Input placeholder="Responsável Financeiro" disabled />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Salvar Nota</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nº Nota</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notasFiltradas.map(nota => (
                <TableRow key={nota.id}>
                  <TableCell>{new Date(nota.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-mono text-xs">{nota.numeroNota}</TableCell>
                  <TableCell>{nota.fornecedor}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valorTotal)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={nota.status === 'Concluído' ? 'default' : 'destructive'}>
                      {nota.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </EstoqueLayout>
  );
}
