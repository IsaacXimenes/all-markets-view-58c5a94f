import { useState, useMemo } from 'react';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getPecas, Peca, exportPecasToCSV, addPeca } from '@/utils/pecasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { getLojas } from '@/utils/cadastrosApi';
import { Download, Eye, Plus, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function OSPecas() {
  const { toast } = useToast();
  const [pecas, setPecas] = useState<Peca[]>(getPecas());
  const lojas = getLojas();

  // Filtros
  const [filtroData, setFiltroData] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('todos');
  const [filtroDescricao, setFiltroDescricao] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [pecaSelecionada, setPecaSelecionada] = useState<Peca | null>(null);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [novaPeca, setNovaPeca] = useState({
    descricao: '',
    lojaId: '',
    modelo: '',
    valorCusto: '',
    valorRecomendado: '',
    quantidade: '1'
  });

  const pecasFiltradas = useMemo(() => {
    return pecas.filter(p => {
      if (filtroData) {
        const dataPeca = new Date(p.dataEntrada).toISOString().split('T')[0];
        if (dataPeca < filtroData) return false;
      }
      if (filtroLoja !== 'todos' && p.lojaId !== filtroLoja) return false;
      if (filtroDescricao && !p.descricao.toLowerCase().includes(filtroDescricao.toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime());
  }, [pecas, filtroData, filtroLoja, filtroDescricao]);

  const getLojaNome = (lojaId: string) => {
    return lojas.find(l => l.id === lojaId)?.nome || lojaId;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Disponível':
        return <Badge className="bg-green-500 hover:bg-green-600">Disponível</Badge>;
      case 'Reservada':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Reservada</Badge>;
      case 'Utilizada':
        return <Badge className="bg-gray-500 hover:bg-gray-600">Utilizada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOrigemBadge = (origem: string) => {
    switch (origem) {
      case 'Nota de Compra':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Nota de Compra</Badge>;
      case 'Manual':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">Manual</Badge>;
      case 'Solicitação':
        return <Badge variant="outline" className="border-green-500 text-green-600">Solicitação</Badge>;
      default:
        return <Badge variant="outline">{origem}</Badge>;
    }
  };

  const handleExport = () => {
    exportPecasToCSV(pecasFiltradas, 'pecas-assistencia.csv');
    toast({ title: 'Sucesso', description: 'CSV exportado com sucesso!' });
  };

  const handleVerDetalhes = (peca: Peca) => {
    setPecaSelecionada(peca);
    setShowModal(true);
  };

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAdicionarPeca = () => {
    if (!novaPeca.descricao || !novaPeca.lojaId || !novaPeca.modelo || !novaPeca.valorCusto) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const nova = addPeca({
      descricao: novaPeca.descricao,
      lojaId: novaPeca.lojaId,
      modelo: novaPeca.modelo,
      valorCusto: parseFloat(novaPeca.valorCusto.replace(/\D/g, '')) / 100,
      valorRecomendado: parseFloat(novaPeca.valorRecomendado.replace(/\D/g, '')) / 100 || 0,
      quantidade: parseInt(novaPeca.quantidade) || 1,
      dataEntrada: new Date().toISOString(),
      origem: 'Manual',
      status: 'Disponível'
    });

    setPecas(getPecas());
    setShowNovaModal(false);
    setNovaPeca({ descricao: '', lojaId: '', modelo: '', valorCusto: '', valorRecomendado: '', quantidade: '1' });
    toast({ title: 'Sucesso', description: `Peça ${nova.id} adicionada ao estoque!` });
  };

  // Stats
  const totalPecas = pecasFiltradas.reduce((acc, p) => acc + p.quantidade, 0);
  const valorTotalCusto = pecasFiltradas.reduce((acc, p) => acc + (p.valorCusto * p.quantidade), 0);
  const pecasDisponiveis = pecasFiltradas.filter(p => p.status === 'Disponível').length;

  return (
    <OSLayout title="Peças">
      {/* Dashboard Cards */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{pecasFiltradas.length}</div>
              <div className="text-xs text-muted-foreground">Tipos de Peças</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{totalPecas}</div>
              <div className="text-xs text-muted-foreground">Quantidade Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{pecasDisponiveis}</div>
              <div className="text-xs text-muted-foreground">Disponíveis</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{formatCurrency(valorTotalCusto)}</div>
              <div className="text-xs text-muted-foreground">Valor em Estoque</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Data Entrada</Label>
              <Input
                type="date"
                value={filtroData}
                onChange={e => setFiltroData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Loja</Label>
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {lojas.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Buscar peça..."
                value={filtroDescricao}
                onChange={e => setFiltroDescricao(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button onClick={() => setShowNovaModal(true)} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Nova Peça
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Valor Custo</TableHead>
              <TableHead>Valor Recomendado</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pecasFiltradas.map(peca => (
              <TableRow key={peca.id}>
                <TableCell className="font-mono text-xs">{peca.id}</TableCell>
                <TableCell className="font-medium">{peca.descricao}</TableCell>
                <TableCell className="text-xs">{getLojaNome(peca.lojaId)}</TableCell>
                <TableCell className="text-xs">{peca.modelo}</TableCell>
                <TableCell>{formatCurrency(peca.valorCusto)}</TableCell>
                <TableCell className="font-medium text-green-600">{formatCurrency(peca.valorRecomendado)}</TableCell>
                <TableCell>{peca.quantidade}</TableCell>
                <TableCell>{getOrigemBadge(peca.origem)}</TableCell>
                <TableCell>{getStatusBadge(peca.status)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleVerDetalhes(peca)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {pecasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhuma peça encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Detalhes */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhes da Peça
            </DialogTitle>
          </DialogHeader>
          {pecaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">ID</Label>
                  <p className="font-mono">{pecaSelecionada.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(pecaSelecionada.status)}</div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Descrição</Label>
                  <p className="font-medium">{pecaSelecionada.descricao}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Modelo Compatível</Label>
                  <p>{pecaSelecionada.modelo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Loja</Label>
                  <p>{getLojaNome(pecaSelecionada.lojaId)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor de Custo</Label>
                  <p>{formatCurrency(pecaSelecionada.valorCusto)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor Recomendado</Label>
                  <p className="font-medium text-green-600">{formatCurrency(pecaSelecionada.valorRecomendado)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Quantidade</Label>
                  <p className="font-bold text-lg">{pecaSelecionada.quantidade}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Entrada</Label>
                  <p>{new Date(pecaSelecionada.dataEntrada).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  <div className="mt-1">{getOrigemBadge(pecaSelecionada.origem)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Peça */}
      <Dialog open={showNovaModal} onOpenChange={setShowNovaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Peça</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={novaPeca.descricao}
                onChange={e => setNovaPeca({...novaPeca, descricao: e.target.value})}
                placeholder="Ex: Tela LCD iPhone 14"
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo Compatível *</Label>
              <Input
                value={novaPeca.modelo}
                onChange={e => setNovaPeca({...novaPeca, modelo: e.target.value})}
                placeholder="Ex: iPhone 14 Pro Max"
              />
            </div>
            <div className="space-y-2">
              <Label>Loja *</Label>
              <Select value={novaPeca.lojaId} onValueChange={v => setNovaPeca({...novaPeca, lojaId: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {lojas.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor de Custo *</Label>
                <Input
                  value={novaPeca.valorCusto}
                  onChange={e => setNovaPeca({...novaPeca, valorCusto: formatCurrencyInput(e.target.value)})}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Recomendado</Label>
                <Input
                  value={novaPeca.valorRecomendado}
                  onChange={e => setNovaPeca({...novaPeca, valorRecomendado: formatCurrencyInput(e.target.value)})}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={novaPeca.quantidade}
                onChange={e => setNovaPeca({...novaPeca, quantidade: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaModal(false)}>Cancelar</Button>
            <Button onClick={handleAdicionarPeca}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Peça
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
