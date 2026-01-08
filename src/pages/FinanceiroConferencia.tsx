import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Download, Filter, X, Eye, Clock, CheckCircle2 } from 'lucide-react';
import { getContasFinanceiras, getColaboradores, getCargos, getLojas } from '@/utils/cadastrosApi';
import { 
  getVendasConferencia, 
  finalizarVendaFinanceiro, 
  formatCurrency, 
  VendaConferencia,
  StatusConferencia 
} from '@/utils/conferenciaGestorApi';
import { toast } from 'sonner';

export default function FinanceiroConferencia() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState<VendaConferencia[]>([]);
  const contasFinanceiras = getContasFinanceiras();
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  const lojas = getLojas();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaConferencia | null>(null);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('');
  
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    loja: 'todas',
    status: 'todos',
    contaDestino: 'todas'
  });

  useEffect(() => {
    const todasVendas = getVendasConferencia();
    // Filtrar apenas vendas que passaram pelo gestor (Conferência - Financeiro ou Concluído)
    const vendasFinanceiro = todasVendas.filter(v => 
      v.status === 'Conferência - Financeiro' || v.status === 'Concluído'
    );
    setVendas(vendasFinanceiro);
  }, []);

  const recarregarVendas = () => {
    const todasVendas = getVendasConferencia();
    const vendasFinanceiro = todasVendas.filter(v => 
      v.status === 'Conferência - Financeiro' || v.status === 'Concluído'
    );
    setVendas(vendasFinanceiro);
  };

  // Filtrar colaboradores com permissão "Financeiro"
  const colaboradoresFinanceiros = useMemo(() => {
    const cargosComPermissaoFinanceiro = cargos
      .filter(c => c.permissoes.includes('Financeiro'))
      .map(c => c.id);
    
    return colaboradores.filter(col => cargosComPermissaoFinanceiro.includes(col.cargo));
  }, [colaboradores, cargos]);

  const handleAbrirConferencia = (venda: VendaConferencia) => {
    setVendaSelecionada(venda);
    setContaSelecionada('');
    setResponsavelSelecionado('');
    setDialogOpen(true);
  };

  const handleConferir = () => {
    if (!contaSelecionada || !responsavelSelecionado) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (vendaSelecionada) {
      const responsavel = colaboradoresFinanceiros.find(c => c.id === responsavelSelecionado);
      const resultado = finalizarVendaFinanceiro(
        vendaSelecionada.id,
        responsavelSelecionado,
        responsavel?.nome || 'Responsável',
        contaSelecionada
      );

      if (resultado) {
        recarregarVendas();
        setDialogOpen(false);
        toast.success(`Venda ${vendaSelecionada.vendaId} finalizada com sucesso!`);
      }
    }
  };

  const botaoDesabilitado = !contaSelecionada || !responsavelSelecionado;

  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      if (filters.dataInicio && new Date(v.dataRegistro) < new Date(filters.dataInicio)) return false;
      if (filters.dataFim) {
        const dataFim = new Date(filters.dataFim);
        dataFim.setHours(23, 59, 59);
        if (new Date(v.dataRegistro) > dataFim) return false;
      }
      if (filters.loja !== 'todas' && v.lojaId !== filters.loja) return false;
      if (filters.status !== 'todos' && v.status !== filters.status) return false;
      if (filters.contaDestino !== 'todas' && v.contaDestino !== filters.contaDestino) return false;
      return true;
    }).sort((a, b) => {
      // Pendentes primeiro
      if (a.status === 'Conferência - Financeiro' && b.status === 'Concluído') return -1;
      if (a.status === 'Concluído' && b.status === 'Conferência - Financeiro') return 1;
      return new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime();
    });
  }, [vendas, filters]);

  const pendentes = vendas.filter(v => v.status === 'Conferência - Financeiro').length;
  const concluidos = vendas.filter(v => v.status === 'Concluído').length;
  const totalPendente = vendas
    .filter(v => v.status === 'Conferência - Financeiro')
    .reduce((acc, v) => acc + v.valorTotal, 0);

  const handleExport = () => {
    const dataToExport = filteredVendas.map(v => ({
      'ID Venda': v.vendaId,
      'Data': new Date(v.dataRegistro).toLocaleDateString('pt-BR'),
      'Loja': v.lojaNome,
      'Cliente': v.clienteNome,
      'Valor': formatCurrency(v.valorTotal),
      'Status': v.status,
      'Gestor': v.gestorNome || '-',
      'Data Conferência Gestor': v.dataConferencia ? new Date(v.dataConferencia).toLocaleDateString('pt-BR') : '-',
      'Conta Destino': v.contaDestino || '-',
      'Responsável Financeiro': v.financeiroNome || '-'
    }));

    const headers = Object.keys(dataToExport[0]).join(',');
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
    link.setAttribute('download', `conferencia-financeiro-${new Date().toISOString().split('T')[0]}.csv`);
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
      contaDestino: 'todas'
    });
  };

  const getStatusBadge = (status: StatusConferencia) => {
    switch (status) {
      case 'Conferência - Financeiro':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white whitespace-nowrap">Conferência - Financeiro</Badge>;
      case 'Concluído':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap">Concluído</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRowClassName = (status: StatusConferencia) => {
    switch (status) {
      case 'Conferência - Financeiro':
        return 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50';
      case 'Concluído':
        return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50';
      default:
        return '';
    }
  };

  return (
    <FinanceiroLayout title="Conferência de Contas - Vendas">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">{pendentes}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídos</p>
                <p className="text-3xl font-bold text-green-600">{concluidos}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pendente</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPendente)}</p>
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
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dataFim">Data Fim</Label>
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
                    <SelectItem value="Conferência - Financeiro">Conferência - Financeiro</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="contaDestino">Conta de Destino</Label>
                <Select value={filters.contaDestino} onValueChange={(value) => setFilters({ ...filters, contaDestino: value })}>
                  <SelectTrigger id="contaDestino">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {contasFinanceiras.map(c => (
                      <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <CardTitle>Vendas para Conferência Financeira</CardTitle>
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
                    <TableHead>Data</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Responsável Venda</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conta Destino</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendas.map((venda) => (
                      <TableRow 
                        key={venda.id}
                        className={getRowClassName(venda.status)}
                      >
                        <TableCell className="font-medium">{venda.vendaId}</TableCell>
                        <TableCell>{new Date(venda.dataRegistro).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{venda.lojaNome}</TableCell>
                        <TableCell>{venda.clienteNome}</TableCell>
                        <TableCell>{venda.vendedorNome}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(venda.valorTotal)}</TableCell>
                        <TableCell>
                          <Badge variant={venda.dadosVenda.origemVenda?.includes('Garantia Extendida') ? 'secondary' : 'outline'}>
                            {venda.dadosVenda.origemVenda?.includes('Garantia Extendida') 
                              ? venda.dadosVenda.origemVenda 
                              : 'Venda Normal'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{venda.gestorNome || '-'}</TableCell>
                        <TableCell>
                          {getStatusBadge(venda.status)}
                        </TableCell>
                        <TableCell>
                          {venda.contaDestino ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {venda.contaDestino}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => navigate(`/vendas/conferencia-gestor/${venda.id}`)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {venda.status === 'Conferência - Financeiro' && (
                              <Button size="sm" onClick={() => handleAbrirConferencia(venda)}>
                                <Check className="h-4 w-4 mr-1" />
                                Finalizar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {filteredVendas.filter(v => v.status === 'Conferência - Financeiro').length} venda(s) pendente(s)
              </span>
              <span className="text-lg font-bold">
                Total Pendente: {formatCurrency(totalPendente)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalizar Conferência - {vendaSelecionada?.vendaId}</DialogTitle>
            </DialogHeader>
            {vendaSelecionada && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{vendaSelecionada.clienteNome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-medium">{formatCurrency(vendaSelecionada.valorTotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gestor que conferiu</p>
                    <p className="font-medium">{vendaSelecionada.gestorNome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data conferência gestor</p>
                    <p className="font-medium">
                      {vendaSelecionada.dataConferencia 
                        ? new Date(vendaSelecionada.dataConferencia).toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="contaConferencia">Conta de Destino *</Label>
                  <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                    <SelectTrigger id="contaConferencia">
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
                  <Label htmlFor="responsavel">Responsável pela Conferência *</Label>
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleConferir}
                    disabled={botaoDesabilitado}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Finalizar Conferência
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FinanceiroLayout>
  );
}
