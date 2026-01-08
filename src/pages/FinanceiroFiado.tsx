import { useState, useMemo, useEffect } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, Download, Filter, X, AlertTriangle, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { getContasFinanceiras, getColaboradores, getCargos, getLojas } from '@/utils/cadastrosApi';
import { 
  getParcelasFiado, 
  pagarParcelaFiado, 
  getDiasParaVencimento,
  formatCurrency,
  ParcelaFiado,
  getEstatisticasFiado
} from '@/utils/fiadoApi';
import { toast } from 'sonner';

export default function FinanceiroFiado() {
  const [parcelas, setParcelas] = useState<ParcelaFiado[]>([]);
  const contasFinanceiras = getContasFinanceiras();
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  const lojas = getLojas();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<ParcelaFiado | null>(null);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('');
  const [observacao, setObservacao] = useState('');
  
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    loja: 'todas',
    status: 'todos',
    cliente: ''
  });

  useEffect(() => {
    recarregarParcelas();
  }, []);

  const recarregarParcelas = () => {
    setParcelas(getParcelasFiado());
  };

  // Filtrar colaboradores com permissão "Financeiro"
  const colaboradoresFinanceiros = useMemo(() => {
    const cargosComPermissaoFinanceiro = cargos
      .filter(c => c.permissoes.includes('Financeiro'))
      .map(c => c.id);
    
    return colaboradores.filter(col => cargosComPermissaoFinanceiro.includes(col.cargo));
  }, [colaboradores, cargos]);

  const handleAbrirPagamento = (parcela: ParcelaFiado) => {
    setParcelaSelecionada(parcela);
    setContaSelecionada('');
    setResponsavelSelecionado('');
    setObservacao('');
    setDialogOpen(true);
  };

  const handlePagar = () => {
    if (!contaSelecionada || !responsavelSelecionado) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (parcelaSelecionada) {
      const responsavel = colaboradoresFinanceiros.find(c => c.id === responsavelSelecionado);
      const resultado = pagarParcelaFiado(
        parcelaSelecionada.id,
        contaSelecionada,
        responsavel?.nome || 'Responsável',
        observacao
      );

      if (resultado) {
        recarregarParcelas();
        setDialogOpen(false);
        toast.success(`Parcela ${parcelaSelecionada.numeroParcela}/${parcelaSelecionada.totalParcelas} paga com sucesso!`);
      }
    }
  };

  const filteredParcelas = useMemo(() => {
    const filtered = parcelas.filter(p => {
      if (filters.dataInicio && new Date(p.dataVencimento) < new Date(filters.dataInicio)) return false;
      if (filters.dataFim) {
        const dataFim = new Date(filters.dataFim);
        dataFim.setHours(23, 59, 59);
        if (new Date(p.dataVencimento) > dataFim) return false;
      }
      if (filters.loja !== 'todas' && p.lojaId !== filters.loja) return false;
      if (filters.status !== 'todos' && p.status !== filters.status) return false;
      if (filters.cliente && !p.clienteNome.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
      return true;
    });

    // Ordenar por vendaId primeiro, depois por numeroParcela
    return filtered.sort((a, b) => {
      // Primeiro ordena por vendaId
      const vendaCompare = a.vendaId.localeCompare(b.vendaId);
      if (vendaCompare !== 0) return vendaCompare;
      // Dentro da mesma venda, ordena por número da parcela
      return a.numeroParcela - b.numeroParcela;
    });
  }, [parcelas, filters]);

  // Agrupar parcelas por vendaId para visualização
  const parcelasAgrupadas = useMemo(() => {
    const grupos: { vendaId: string; parcelas: ParcelaFiado[]; isFirst: boolean }[] = [];
    let currentVendaId = '';
    
    filteredParcelas.forEach((parcela, index) => {
      const isFirst = parcela.vendaId !== currentVendaId;
      if (isFirst) {
        currentVendaId = parcela.vendaId;
      }
      grupos.push({ vendaId: parcela.vendaId, parcelas: [parcela], isFirst });
    });
    
    return grupos;
  }, [filteredParcelas]);

  // Verificar se é a primeira parcela de um grupo para estilização
  const getGroupIndex = (vendaId: string): number => {
    const uniqueVendas = [...new Set(filteredParcelas.map(p => p.vendaId))];
    return uniqueVendas.indexOf(vendaId);
  };

  const stats = getEstatisticasFiado();

  const handleExport = () => {
    const dataToExport = filteredParcelas.map(p => ({
      'ID': p.id,
      'Venda': p.vendaId,
      'Cliente': p.clienteNome,
      'Loja': p.lojaNome,
      'Parcela': `${p.numeroParcela}/${p.totalParcelas}`,
      'Valor': formatCurrency(p.valorParcela),
      'Vencimento': new Date(p.dataVencimento).toLocaleDateString('pt-BR'),
      'Status': p.status,
      'Data Pagamento': p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString('pt-BR') : '-',
      'Conta Destino': p.contaDestino || '-'
    }));

    const headers = Object.keys(dataToExport[0] || {}).join(',');
    const rows = dataToExport.map(item => 
      Object.values(item).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `fiado-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      loja: 'todas',
      status: 'todos',
      cliente: ''
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Vencido':
        return <Badge className="bg-red-600 hover:bg-red-700 text-white">Vencido</Badge>;
      case 'Pendente':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pendente</Badge>;
      case 'Pago':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">Pago</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRowClassName = (status: string) => {
    switch (status) {
      case 'Vencido':
        return 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50';
      case 'Pendente':
        return 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50';
      case 'Pago':
        return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50';
      default:
        return '';
    }
  };

  const getDiasDisplay = (parcela: ParcelaFiado) => {
    if (parcela.status === 'Pago') return null;
    
    const dias = getDiasParaVencimento(parcela.dataVencimento);
    
    if (dias < 0) {
      return (
        <span className="flex items-center gap-1 text-red-600 font-medium">
          <AlertTriangle className="h-4 w-4" />
          {Math.abs(dias)} dias atraso
        </span>
      );
    } else if (dias === 0) {
      return (
        <span className="flex items-center gap-1 text-orange-600 font-medium">
          <Clock className="h-4 w-4" />
          Vence hoje
        </span>
      );
    } else if (dias <= 7) {
      return (
        <span className="flex items-center gap-1 text-yellow-600">
          <Calendar className="h-4 w-4" />
          {dias} dias
        </span>
      );
    } else {
      return (
        <span className="text-muted-foreground">
          {dias} dias
        </span>
      );
    }
  };

  return (
    <FinanceiroLayout title="Conferências - Fiado">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-3xl font-bold text-red-600">{stats.totalVencidas}</p>
                <p className="text-sm text-red-600">{formatCurrency(stats.valorVencido)}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.totalPendentes}</p>
                <p className="text-sm text-yellow-600">{formatCurrency(stats.valorPendente)}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pagas</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalPagas}</p>
                <p className="text-sm text-green-600">{formatCurrency(stats.valorRecebido)}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total a Receber</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.valorPendente + stats.valorVencido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="dataInicio">Data Vencimento Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dataFim">Data Vencimento Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="loja">Loja</Label>
                <Select value={filters.loja} onValueChange={(value) => setFilters({ ...filters, loja: value })}>
                  <SelectTrigger id="loja">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {lojas.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  placeholder="Buscar cliente..."
                  value={filters.cliente}
                  onChange={(e) => setFilters({ ...filters, cliente: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={handleLimpar} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Parcelas de Fiado</CardTitle>
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Venda</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-center">Parcela</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Dias p/ Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParcelas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma parcela de fiado encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredParcelas.map((parcela, index) => {
                      const isFirstOfGroup = index === 0 || filteredParcelas[index - 1].vendaId !== parcela.vendaId;
                      const groupIndex = getGroupIndex(parcela.vendaId);
                      const isEvenGroup = groupIndex % 2 === 0;
                      
                      return (
                        <TableRow 
                          key={parcela.id}
                          className={`
                            ${getRowClassName(parcela.status)}
                            ${isFirstOfGroup ? 'border-t-2 border-t-primary/30' : ''}
                            ${isEvenGroup ? 'bg-opacity-100' : 'bg-muted/20'}
                          `}
                        >
                          <TableCell className={`font-medium ${isFirstOfGroup ? '' : 'text-muted-foreground/60'}`}>
                            {isFirstOfGroup ? (
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-6 rounded-full bg-primary"></div>
                                {parcela.vendaId}
                              </div>
                            ) : (
                              <span className="pl-3 text-xs">↳</span>
                            )}
                          </TableCell>
                          <TableCell className={isFirstOfGroup ? '' : 'text-muted-foreground/70'}>
                            {isFirstOfGroup ? parcela.clienteNome : ''}
                          </TableCell>
                          <TableCell className={isFirstOfGroup ? '' : 'text-muted-foreground/70'}>
                            {isFirstOfGroup ? parcela.lojaNome : ''}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={parcela.numeroParcela === 1 ? 'border-primary' : ''}>
                              {parcela.numeroParcela}/{parcela.totalParcelas}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(parcela.valorParcela)}
                          </TableCell>
                          <TableCell>
                            {new Date(parcela.dataVencimento).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {getDiasDisplay(parcela)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(parcela.status)}
                          </TableCell>
                          <TableCell>
                            {parcela.status !== 'Pago' && (
                              <Button size="sm" onClick={() => handleAbrirPagamento(parcela)}>
                                <Check className="h-4 w-4 mr-1" />
                                Pagar
                              </Button>
                            )}
                            {parcela.status === 'Pago' && (
                              <span className="text-sm text-muted-foreground">
                                {parcela.dataPagamento 
                                  ? new Date(parcela.dataPagamento).toLocaleDateString('pt-BR')
                                  : '-'}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {filteredParcelas.filter(p => p.status !== 'Pago').length} parcela(s) pendente(s)
              </span>
              <span className="text-lg font-bold">
                Total a Receber: {formatCurrency(stats.valorPendente + stats.valorVencido)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pagamento - Parcela {parcelaSelecionada?.numeroParcela}/{parcelaSelecionada?.totalParcelas}</DialogTitle>
            </DialogHeader>
            {parcelaSelecionada && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{parcelaSelecionada.clienteNome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                    <p className="font-medium">{formatCurrency(parcelaSelecionada.valorParcela)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Venda</p>
                    <p className="font-medium">{parcelaSelecionada.vendaId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vencimento</p>
                    <p className="font-medium">
                      {new Date(parcelaSelecionada.dataVencimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                
                {parcelaSelecionada.status === 'Vencido' && (
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Esta parcela está vencida há {Math.abs(getDiasParaVencimento(parcelaSelecionada.dataVencimento))} dias</span>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="contaPagamento">Conta de Destino *</Label>
                  <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                    <SelectTrigger id="contaPagamento">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasFinanceiras.filter(c => c.status === 'Ativo').map(c => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="responsavel">Responsável pelo Recebimento *</Label>
                  <Select value={responsavelSelecionado} onValueChange={setResponsavelSelecionado}>
                    <SelectTrigger id="responsavel">
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradoresFinanceiros.map(col => (
                        <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {colaboradoresFinanceiros.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">Nenhum colaborador com permissão financeira</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="observacao">Observação (opcional)</Label>
                  <Textarea
                    id="observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Observações sobre o pagamento..."
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handlePagar}
                    disabled={!contaSelecionada || !responsavelSelecionado}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Confirmar Pagamento
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FinanceiroLayout>
  );
}
