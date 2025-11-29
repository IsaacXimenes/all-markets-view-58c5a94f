import { useState } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getMovimentacoes, getLojas, exportToCSV, addMovimentacao } from '@/utils/estoqueApi';
import { Download, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function EstoqueMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState(getMovimentacoes());
  const [origemFilter, setOrigemFilter] = useState<string>('todas');
  const [destinoFilter, setDestinoFilter] = useState<string>('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const movimentacoesFiltradas = movimentacoes.filter(m => {
    if (origemFilter !== 'todas' && m.origem !== origemFilter) return false;
    if (destinoFilter !== 'todas' && m.destino !== destinoFilter) return false;
    return true;
  });

  const handleExport = () => {
    exportToCSV(movimentacoesFiltradas, 'movimentacoes-estoque.csv');
  };

  const handleRegistrarMovimentacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const novaMovimentacao = addMovimentacao({
      data: formData.get('data') as string,
      produto: formData.get('produto') as string,
      imei: formData.get('imei') as string,
      quantidade: parseInt(formData.get('quantidade') as string),
      origem: formData.get('origem') as string,
      destino: formData.get('destino') as string,
      responsavel: formData.get('responsavel') as string,
      motivo: formData.get('motivo') as string
    });

    setMovimentacoes([...movimentacoes, novaMovimentacao]);
    setDialogOpen(false);
    toast({
      title: 'Movimentação registrada',
      description: `Movimentação ${novaMovimentacao.id} registrada com sucesso`,
    });
  };

  return (
    <EstoqueLayout title="Movimentações">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as origens</SelectItem>
              {getLojas().map(loja => (
                <SelectItem key={loja} value={loja}>{loja}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={destinoFilter} onValueChange={setDestinoFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Destino" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os destinos</SelectItem>
              {getLojas().map(loja => (
                <SelectItem key={loja} value={loja}>{loja}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Nova Movimentação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Registrar Movimentação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRegistrarMovimentacao} className="space-y-4">
                  <div>
                    <Label htmlFor="data">Data</Label>
                    <Input id="data" name="data" type="date" required />
                  </div>

                  <div>
                    <Label htmlFor="produto">Produto</Label>
                    <Input id="produto" name="produto" required />
                  </div>

                  <div>
                    <Label htmlFor="imei">IMEI</Label>
                    <Input id="imei" name="imei" required />
                  </div>

                  <div>
                    <Label htmlFor="quantidade">Quantidade</Label>
                    <Input id="quantidade" name="quantidade" type="number" defaultValue="1" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origem">Origem</Label>
                      <Select name="origem" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {getLojas().map(loja => (
                            <SelectItem key={loja} value={loja}>{loja}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="destino">Destino</Label>
                      <Select name="destino" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {getLojas().map(loja => (
                            <SelectItem key={loja} value={loja}>{loja}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="responsavel">Responsável</Label>
                    <Input id="responsavel" name="responsavel" required />
                  </div>

                  <div>
                    <Label htmlFor="motivo">Motivo</Label>
                    <Input id="motivo" name="motivo" required />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Registrar</Button>
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
                <TableHead>ID</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoesFiltradas.map(mov => (
                <TableRow key={mov.id}>
                  <TableCell className="font-mono text-xs">{mov.id}</TableCell>
                  <TableCell>{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{mov.produto}</TableCell>
                  <TableCell className="font-mono text-xs">{mov.imei}</TableCell>
                  <TableCell>{mov.quantidade}</TableCell>
                  <TableCell>{mov.origem}</TableCell>
                  <TableCell>{mov.destino}</TableCell>
                  <TableCell>{mov.responsavel}</TableCell>
                  <TableCell>{mov.motivo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </EstoqueLayout>
  );
}
