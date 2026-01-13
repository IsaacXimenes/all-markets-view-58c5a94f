import { useState } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getMovimentacoes, addMovimentacao } from '@/utils/estoqueApi';
import { getLojas, getLojaById, getColaboradores } from '@/utils/cadastrosApi';
import { exportToCSV } from '@/utils/formatUtils';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';
import { InputComMascara } from '@/components/ui/InputComMascara';
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

  const lojas = getLojas().filter(l => l.status === 'Ativo');
  const colaboradores = getColaboradores().filter(c => c.status === 'Ativo');

  // Form state
  const [formData, setFormData] = useState({
    data: '',
    produto: '',
    imei: '',
    quantidade: '1',
    origem: '',
    destino: '',
    responsavel: '',
    motivo: ''
  });

  const getLojaNome = (lojaIdOuNome: string) => {
    // Primeiro tenta buscar por ID
    const lojaPorId = getLojaById(lojaIdOuNome);
    if (lojaPorId) return lojaPorId.nome;
    // Se não encontrar, retorna o valor original (pode ser um nome legado)
    return lojaIdOuNome;
  };

  const movimentacoesFiltradas = movimentacoes.filter(m => {
    if (origemFilter !== 'todas' && m.origem !== origemFilter) return false;
    if (destinoFilter !== 'todas' && m.destino !== destinoFilter) return false;
    return true;
  });

  const handleExport = () => {
    const dataToExport = movimentacoesFiltradas.map(m => ({
      ...m,
      imei: formatIMEI(m.imei),
      data: new Date(m.data).toLocaleDateString('pt-BR'),
      origem: getLojaNome(m.origem),
      destino: getLojaNome(m.destino)
    }));
    exportToCSV(dataToExport, 'movimentacoes-estoque.csv');
  };

  const handleIMEIChange = (formatted: string, raw: string | number) => {
    setFormData(prev => ({ ...prev, imei: String(raw) }));
  };

  const handleRegistrarMovimentacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.responsavel) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione um responsável',
        variant: 'destructive'
      });
      return;
    }

    const novaMovimentacao = addMovimentacao({
      data: formData.data,
      produto: formData.produto,
      imei: formData.imei,
      quantidade: parseInt(formData.quantidade),
      origem: formData.origem,
      destino: formData.destino,
      responsavel: colaboradores.find(c => c.id === formData.responsavel)?.nome || formData.responsavel,
      motivo: formData.motivo
    });

    setMovimentacoes([...movimentacoes, novaMovimentacao]);
    setDialogOpen(false);
    setFormData({
      data: '',
      produto: '',
      imei: '',
      quantidade: '1',
      origem: '',
      destino: '',
      responsavel: '',
      motivo: ''
    });
    toast({
      title: 'Movimentação registrada',
      description: `Movimentação ${novaMovimentacao.id} registrada com sucesso`,
    });
  };

  return (
    <EstoqueLayout title="Movimentações - Aparelhos">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as origens</SelectItem>
              {lojas.map(loja => (
                <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={destinoFilter} onValueChange={setDestinoFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Destino" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os destinos</SelectItem>
              {lojas.map(loja => (
                <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
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
                    <Label htmlFor="data">Data *</Label>
                    <Input 
                      id="data" 
                      type="date" 
                      value={formData.data}
                      onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                      required 
                    />
                  </div>

                  <div>
                    <Label htmlFor="produto">Produto *</Label>
                    <Input 
                      id="produto"
                      value={formData.produto}
                      onChange={(e) => setFormData(prev => ({ ...prev, produto: e.target.value }))}
                      required 
                    />
                  </div>

                  <div>
                    <Label htmlFor="imei">IMEI *</Label>
                    <InputComMascara
                      mascara="imei"
                      value={formData.imei}
                      onChange={handleIMEIChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="quantidade">Quantidade *</Label>
                    <Input 
                      id="quantidade" 
                      type="number" 
                      value={formData.quantidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantidade: e.target.value }))}
                      min="1"
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origem">Origem *</Label>
                      <Select 
                        value={formData.origem}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, origem: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="destino">Destino *</Label>
                      <Select 
                        value={formData.destino}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, destino: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="responsavel">Responsável *</Label>
                    <Select 
                      value={formData.responsavel}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, responsavel: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradores.map(col => (
                          <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="motivo">Motivo *</Label>
                    <Input 
                      id="motivo"
                      value={formData.motivo}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                      required 
                    />
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
                  <TableCell className="font-mono text-xs">{formatIMEI(mov.imei)}</TableCell>
                  <TableCell>{mov.quantidade}</TableCell>
                  <TableCell>{getLojaNome(mov.origem)}</TableCell>
                  <TableCell>{getLojaNome(mov.destino)}</TableCell>
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
