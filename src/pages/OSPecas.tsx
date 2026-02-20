import { useState, useMemo } from 'react';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPecas, Peca, exportPecasToCSV, addPeca, initializePecasWithLojaIds, getMovimentacoesByPecaId, MovimentacaoPeca } from '@/utils/pecasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { getProdutosCadastro } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { getPecasCadastro } from '@/pages/CadastrosPecas';
import { Download, Eye, Plus, Package, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function OSPecas() {
  const { toast } = useToast();
  const { obterLojasTipoLoja, obterNomeLoja } = useCadastroStore();
  const lojas = obterLojasTipoLoja();
  
  // Inicializar peças com IDs válidos de loja
  useEffect(() => {
    const lojaIds = lojas.map(l => l.id);
    if (lojaIds.length > 0) {
      initializePecasWithLojaIds(lojaIds);
    }
  }, [lojas]);
  
  const [pecas, setPecas] = useState<Peca[]>(getPecas());
  const pecasCadastradas = getPecasCadastro();
  const produtosCadastrados = getProdutosCadastro();
  
  // Atualizar lista quando peças são inicializadas
  useEffect(() => {
    const lojaIds = lojas.map(l => l.id);
    if (lojaIds.length > 0) {
      initializePecasWithLojaIds(lojaIds);
      setPecas(getPecas());
    }
  }, [lojas]);

  // Filtros
  const [filtroData, setFiltroData] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('todos');
  const [filtroDescricao, setFiltroDescricao] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('todos');
  const [filtroModelo, setFiltroModelo] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [pecaSelecionada, setPecaSelecionada] = useState<Peca | null>(null);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [pecaHistorico, setPecaHistorico] = useState<Peca | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoPeca[]>([]);
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
      if (filtroOrigem !== 'todos' && p.origem !== filtroOrigem) return false;
      if (filtroModelo && !p.modelo.toLowerCase().includes(filtroModelo.toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime());
  }, [pecas, filtroData, filtroLoja, filtroDescricao, filtroOrigem, filtroModelo]);

  const getLojaNome = (lojaId: string) => {
    return obterNomeLoja(lojaId);
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
      case 'Produto Thiago':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Produto Thiago</Badge>;
      case 'Solicitação':
        return <Badge variant="outline" className="border-green-500 text-green-600">Solicitação</Badge>;
      case 'Retirada de Peça':
        return <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/30">Retirada de Peça</Badge>;
      case 'Consignacao':
        return <Badge variant="outline" className="border-violet-500 text-violet-600 bg-violet-50 dark:bg-violet-950/30 font-bold">CONSIGNADO</Badge>;
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

  const handleVerHistorico = (peca: Peca) => {
    setPecaHistorico(peca);
    setMovimentacoes(getMovimentacoesByPecaId(peca.id));
    setShowHistoricoModal(true);
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'Entrada':
        return <Badge className="bg-green-500 hover:bg-green-600">Entrada</Badge>;
      case 'Saída':
        return <Badge className="bg-red-500 hover:bg-red-600">Saída</Badge>;
      case 'Reserva':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Reserva</Badge>;
      default:
        return <Badge variant="secondary">{tipo}</Badge>;
    }
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
      origem: 'Produto Thiago',
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
  const valorNotasCompra = pecas.filter(p => p.origem === 'Nota de Compra').reduce((acc, p) => acc + (p.valorCusto * p.quantidade), 0);
  const valorRetiradaPecas = pecas.filter(p => p.origem === 'Retirada de Peça').reduce((acc, p) => acc + (p.valorCusto * p.quantidade), 0);

  return (
    <OSLayout title="Estoque - Assistência">
      {/* Dashboard Cards */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(valorNotasCompra)}</div>
              <div className="text-xs text-muted-foreground">Valor - Notas de Compra</div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(valorRetiradaPecas)}</div>
              <div className="text-xs text-muted-foreground">Valor - Retirada de Peças</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
              <AutocompleteLoja
                value={filtroLoja === 'todos' ? '' : filtroLoja}
                onChange={(v) => setFiltroLoja(v || 'todos')}
                apenasLojasTipoLoja={true}
                placeholder="Todas"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Buscar peça..."
                value={filtroDescricao}
                onChange={e => setFiltroDescricao(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="Nota de Compra">Nota de Compra</SelectItem>
                  <SelectItem value="Produto Thiago">Produto Thiago</SelectItem>
                  <SelectItem value="Solicitação">Solicitação</SelectItem>
                  <SelectItem value="Retirada de Peça">Retirada de Peça</SelectItem>
                  <SelectItem value="Consignacao">Consignado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                placeholder="Buscar modelo..."
                value={filtroModelo}
                onChange={e => setFiltroModelo(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button onClick={() => setShowNovaModal(true)} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Entrada Nova Peça
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
                <TableCell className="font-medium">
                  {peca.descricao}
                </TableCell>
                <TableCell className="text-xs">{getLojaNome(peca.lojaId)}</TableCell>
                <TableCell className="text-xs">{peca.modelo}</TableCell>
                <TableCell>{formatCurrency(peca.valorCusto)}</TableCell>
                <TableCell className="font-medium text-green-600">{formatCurrency(peca.valorRecomendado)}</TableCell>
                <TableCell>{peca.quantidade}</TableCell>
                <TableCell>{getOrigemBadge(peca.origem)}</TableCell>
                <TableCell>{getStatusBadge(peca.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleVerDetalhes(peca)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleVerHistorico(peca)} title="Histórico de Movimentação">
                      <History className="h-4 w-4" />
                    </Button>
                  </div>
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
                {pecaSelecionada.loteConsignacaoId && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Lote Consignação</Label>
                    <p className="font-mono font-medium text-violet-600">{pecaSelecionada.loteConsignacaoId}</p>
                  </div>
                )}
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
            <DialogTitle>Entrada Nova Peça</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Peça (Cadastrada) *</Label>
              <Select 
                value={novaPeca.descricao} 
                onValueChange={v => setNovaPeca({...novaPeca, descricao: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma peça cadastrada..." />
                </SelectTrigger>
                <SelectContent>
                  {pecasCadastradas.map(p => (
                    <SelectItem key={p.id} value={p.produto}>
                      {p.produto} ({p.marca} - {p.categoria})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Apenas peças cadastradas no sistema podem ser adicionadas
              </p>
            </div>
            <div className="space-y-2">
              <Label>Modelo Compatível *</Label>
              <Select 
                value={novaPeca.modelo} 
                onValueChange={v => setNovaPeca({...novaPeca, modelo: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {produtosCadastrados.map(p => (
                    <SelectItem key={p.id} value={p.produto}>
                      {p.produto} ({p.marca})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Apenas modelos cadastrados no sistema podem ser selecionados
              </p>
            </div>
            <div className="space-y-2">
              <Label>Loja *</Label>
              <AutocompleteLoja
                value={novaPeca.lojaId}
                onChange={v => setNovaPeca({...novaPeca, lojaId: v})}
                apenasLojasTipoLoja={true}
                placeholder="Selecione..."
              />
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

      {/* Modal Histórico de Movimentação */}
      <Dialog open={showHistoricoModal} onOpenChange={setShowHistoricoModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Movimentação
            </DialogTitle>
          </DialogHeader>
          {pecaHistorico && (
            <div className="space-y-4 flex-1 overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Peça</Label>
                  <p className="font-medium text-sm">{pecaHistorico.descricao}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Modelo</Label>
                  <p className="text-sm">{pecaHistorico.modelo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Loja</Label>
                  <p className="text-sm">{getLojaNome(pecaHistorico.lojaId)}</p>
                </div>
              </div>

              <div className="rounded-md border max-h-64 overflow-y-auto overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>OS/Referência</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map(mov => (
                      <TableRow key={mov.id}>
                        <TableCell className="text-xs">{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                        <TableCell className="font-medium">{mov.tipo === 'Saída' ? `-${mov.quantidade}` : `+${mov.quantidade}`}</TableCell>
                        <TableCell className="text-xs font-mono">{mov.osId || '-'}</TableCell>
                        <TableCell className="text-xs">{mov.descricao}</TableCell>
                      </TableRow>
                    ))}
                    {movimentacoes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          Nenhuma movimentação registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium">Quantidade disponível atual:</span>
                <span className="text-lg font-bold">{pecaHistorico.quantidade} unidades</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoricoModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
