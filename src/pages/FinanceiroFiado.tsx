import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadComprovante } from '@/components/estoque/FileUploadComprovante';
import { InputComMascara } from '@/components/ui/InputComMascara';
import {
  Download, Filter, X, Eye, DollarSign, CheckCircle2, Clock,
  FileText, CalendarDays, AlertTriangle, Plus, MessageSquare, Check
} from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { useFluxoVendas } from '@/hooks/useFluxoVendas';
import { finalizarVendaFiado, getCorBadgeStatus, VendaComFluxo } from '@/utils/fluxoVendasApi';
import { formatCurrency as formatCurrencyUtil } from '@/utils/formatUtils';
import {
  getDividasFiado,
  getPagamentosDivida,
  getAnotacoesDivida,
  getValorPagoDivida,
  getSaldoDevedor,
  getProgressoDivida,
  registrarPagamentoFiado,
  registrarAnotacaoFiado,
  getEstatisticasFiado,
  formatCurrency,
  DividaFiado,
  PagamentoFiado,
  AnotacaoFiado
} from '@/utils/fiadoApi';
import { toast } from 'sonner';

export default function FinanceiroFiado() {
  const { obterLojasAtivas, obterNomeLoja } = useCadastroStore();
  const { user } = useAuthStore();
  const lojas = obterLojasAtivas();

  const [dividas, setDividas] = useState<DividaFiado[]>(getDividasFiado());
  const [filters, setFilters] = useState({ cliente: '', loja: 'todas', situacao: 'todos', recorrencia: 'todas', competencia: 'todas', dataInicio: '', dataFim: '' });
  const [filtroRapido, setFiltroRapido] = useState<string | null>(null);

  // Modal de pagamento
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false);
  const [dividaSelecionada, setDividaSelecionada] = useState<DividaFiado | null>(null);
  const [valorPagamento, setValorPagamento] = useState<number>(0);
  const [comprovante, setComprovante] = useState('');
  const [comprovanteNome, setComprovanteNome] = useState('');

  // Modal detalhes (histórico + agenda)
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [dividaDetalhes, setDividaDetalhes] = useState<DividaFiado | null>(null);

  // Modal agenda standalone
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [dividaAgenda, setDividaAgenda] = useState<DividaFiado | null>(null);

  // Nova anotação
  const [novaAnotacaoModalOpen, setNovaAnotacaoModalOpen] = useState(false);
  const [novaAnotacaoTexto, setNovaAnotacaoTexto] = useState('');
  const [novaAnotacaoImportante, setNovaAnotacaoImportante] = useState(false);
  const [anotacaoDividaId, setAnotacaoDividaId] = useState('');

  // Vendas pendentes de conferência Fiado
  const { vendas: vendasPendentes, recarregar: recarregarVendas } = useFluxoVendas({
    status: 'Conferência Fiado'
  });

  const recarregar = () => setDividas(getDividasFiado());

  const filteredDividas = useMemo(() => {
    let resultado = dividas.filter(d => {
      if (filters.cliente && !d.clienteNome.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
      if (filters.loja !== 'todas' && d.lojaId !== filters.loja) return false;
      if (filters.situacao !== 'todos' && d.situacao !== filters.situacao) return false;
      if (filters.recorrencia !== 'todas' && d.tipoRecorrencia !== filters.recorrencia) return false;
      if (filters.competencia !== 'todas' && d.inicioCompetencia !== filters.competencia) return false;
      if (filters.dataInicio) {
        const dataLanc = new Date(d.dataCriacao).toISOString().split('T')[0];
        if (dataLanc < filters.dataInicio) return false;
      }
      if (filters.dataFim) {
        const dataLanc = new Date(d.dataCriacao).toISOString().split('T')[0];
        if (dataLanc > filters.dataFim) return false;
      }
      return true;
    });

    if (filtroRapido === 'em_aberto') {
      resultado = resultado.filter(d => d.situacao === 'Em Aberto');
    } else if (filtroRapido === 'quitados') {
      resultado = resultado.filter(d => d.situacao === 'Quitado');
    } else if (filtroRapido === 'com_alerta') {
      resultado = resultado.filter(d => d.temAnotacaoImportante);
    }

    return resultado;
  }, [dividas, filters, filtroRapido]);

  const stats = useMemo(() => getEstatisticasFiado(), [dividas]);

  // --- Handlers ---

  const handleAbrirPagamento = (divida: DividaFiado) => {
    setDividaSelecionada(divida);
    setValorPagamento(0);
    setComprovante('');
    setComprovanteNome('');
    setPagamentoModalOpen(true);
  };

  const handleConfirmarPagamento = () => {
    if (!dividaSelecionada) return;
    if (valorPagamento <= 0) {
      toast.error('Informe um valor de pagamento válido');
      return;
    }

    const saldo = getSaldoDevedor(dividaSelecionada);
    if (valorPagamento > saldo + 0.01) {
      toast.error(`Valor excede o saldo devedor de ${formatCurrency(saldo)}`);
      return;
    }

    const responsavel = user?.colaborador?.nome || 'Responsável';
    const resultado = registrarPagamentoFiado(
      dividaSelecionada.id,
      valorPagamento,
      responsavel,
      comprovante || undefined,
      comprovanteNome || undefined
    );

    if (resultado) {
      recarregar();
      setPagamentoModalOpen(false);
      toast.success('Pagamento registrado com sucesso!');
    }
  };

  const handleAbrirDetalhes = (divida: DividaFiado) => {
    setDividaDetalhes(divida);
    setDetalhesModalOpen(true);
  };

  const handleAbrirAgenda = (divida: DividaFiado) => {
    setDividaAgenda(divida);
    setAgendaModalOpen(true);
  };

  const handleAbrirNovaAnotacao = (dividaId: string) => {
    setAnotacaoDividaId(dividaId);
    setNovaAnotacaoTexto('');
    setNovaAnotacaoImportante(false);
    setNovaAnotacaoModalOpen(true);
  };

  const handleSalvarAnotacao = () => {
    if (!novaAnotacaoTexto.trim()) {
      toast.error('Informe a observação');
      return;
    }
    const usuario = user?.colaborador?.nome || 'Usuário';
    registrarAnotacaoFiado(anotacaoDividaId, usuario, novaAnotacaoTexto.trim(), novaAnotacaoImportante);
    recarregar();
    setNovaAnotacaoModalOpen(false);
    toast.success('Anotação registrada!');
  };

  const handleLimpar = () => {
    setFilters({ cliente: '', loja: 'todas', situacao: 'todos', recorrencia: 'todas', competencia: 'todas', dataInicio: '', dataFim: '' });
    setFiltroRapido(null);
  };

  const handleExport = () => {
    const dataToExport = filteredDividas.map(d => ({
      'ID Venda': d.vendaId,
      'Data Lançamento': new Date(d.dataCriacao).toLocaleDateString('pt-BR'),
      'Cliente': d.clienteNome,
      'Valor Final': formatCurrency(d.valorFinal),
      'Valor Pago': formatCurrency(getValorPagoDivida(d.id)),
      'Saldo Devedor': formatCurrency(getSaldoDevedor(d)),
      'Progresso': `${Math.round(getProgressoDivida(d))}%`,
      'Recorrência': d.tipoRecorrencia,
      'Qtd. Vezes': `${d.qtdVezes}x`,
      'Início Competência': d.inicioCompetencia,
      'Situação': d.situacao
    }));

    if (dataToExport.length === 0) { toast.error('Nenhum dado para exportar'); return; }
    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(item =>
      Object.values(item).map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fiado-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Dados exportados com sucesso!');
  };

  const historicoPagamentos = useMemo(() => {
    if (!dividaDetalhes) return [];
    return getPagamentosDivida(dividaDetalhes.id);
  }, [dividaDetalhes, dividas]);

  const anotacoesDetalhes = useMemo(() => {
    if (!dividaDetalhes) return [];
    return getAnotacoesDivida(dividaDetalhes.id);
  }, [dividaDetalhes, dividas]);

  const anotacoesAgenda = useMemo(() => {
    if (!dividaAgenda) return [];
    return getAnotacoesDivida(dividaAgenda.id);
  }, [dividaAgenda, dividas]);

  return (
    <FinanceiroLayout title="Conferências - Fiado">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Aberto</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.totalEmAberto}</p>
                <p className="text-sm text-yellow-600">{formatCurrency(stats.valorTotalEmAberto)}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quitadas</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalQuitadas}</p>
                <p className="text-sm text-green-600">{formatCurrency(stats.valorTotalQuitado)}</p>
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
                <p className="text-2xl font-bold">{formatCurrency(stats.saldoDevedor)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inadimplência</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.saldoDevedor)}</p>
                <p className="text-xs text-muted-foreground">vs Total: {formatCurrency(stats.valorTotalEmAberto)}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendas Pendentes de Conferência Fiado */}
      {vendasPendentes.length > 0 && (
        <Card className="mb-6 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Clock className="h-5 w-5" />
              Vendas Pendentes de Conferência ({vendasPendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full" type="always">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Venda</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasPendentes.map((venda: VendaComFluxo) => (
                    <TableRow key={venda.id} className="bg-blue-500/10 hover:bg-blue-500/20">
                      <TableCell className="font-mono text-xs">{venda.id}</TableCell>
                      <TableCell>{new Date(venda.dataHora).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="font-medium">{venda.clienteNome}</TableCell>
                      <TableCell>{obterNomeLoja(venda.lojaVenda)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrencyUtil(venda.total || 0)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => {
                            const resultado = finalizarVendaFiado(
                              venda.id,
                              user?.colaborador?.id || 'USR-001',
                              user?.colaborador?.nome || 'Usuário'
                            );
                            if (resultado) {
                              toast.success(`Venda ${venda.id} finalizada! Dívida criada automaticamente.`);
                              recarregar();
                              recarregarVendas();
                            } else {
                              toast.error('Erro ao finalizar venda Fiado.');
                            }
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" /> Finalizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" className="h-4" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant={filtroRapido === 'em_aberto' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroRapido(filtroRapido === 'em_aberto' ? null : 'em_aberto')}
        >
          <Clock className="h-4 w-4 mr-1" /> Em Aberto
        </Button>
        <Button
          variant={filtroRapido === 'quitados' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroRapido(filtroRapido === 'quitados' ? null : 'quitados')}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" /> Quitados
        </Button>
        <Button
          variant={filtroRapido === 'com_alerta' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroRapido(filtroRapido === 'com_alerta' ? null : 'com_alerta')}
        >
          <AlertTriangle className="h-4 w-4 mr-1" /> Com Alerta
        </Button>
      </div>

      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  placeholder="Buscar cliente..."
                  value={filters.cliente}
                  onChange={(e) => setFilters({ ...filters, cliente: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="loja">Loja</Label>
                <Select value={filters.loja} onValueChange={(v) => setFilters({ ...filters, loja: v })}>
                  <SelectTrigger id="loja"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="situacao">Situação</Label>
                <Select value={filters.situacao} onValueChange={(v) => setFilters({ ...filters, situacao: v })}>
                  <SelectTrigger id="situacao"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Em Aberto">Em Aberto</SelectItem>
                    <SelectItem value="Quitado">Quitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="recorrencia">Recorrência</Label>
                <Select value={filters.recorrencia} onValueChange={(v) => setFilters({ ...filters, recorrencia: v })}>
                  <SelectTrigger id="recorrencia"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="competencia">Competência</Label>
                <Select value={filters.competencia} onValueChange={(v) => setFilters({ ...filters, competencia: v })}>
                  <SelectTrigger id="competencia"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {[...new Set(dividas.map(d => d.inicioCompetencia))].sort().map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <div className="flex items-end">
                <Button variant="outline" onClick={handleLimpar} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela principal */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Dívidas - Fiado</CardTitle>
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full" type="always">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Venda</TableHead>
                    <TableHead>Data Lançamento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor Final</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                    <TableHead className="text-right">Saldo Devedor</TableHead>
                    <TableHead className="w-[160px]">Progresso</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead className="text-center">Qtd. Vezes</TableHead>
                    <TableHead>Início Competência</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDividas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        Nenhuma dívida de fiado encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDividas.map(divida => {
                      const valorPago = getValorPagoDivida(divida.id);
                      const saldo = getSaldoDevedor(divida);
                      const progresso = getProgressoDivida(divida);
                      const isQuitado = divida.situacao === 'Quitado';

                      return (
                        <TableRow
                          key={divida.id}
                          className={isQuitado
                            ? 'bg-green-500/10 hover:bg-green-500/20'
                            : 'bg-yellow-500/10 hover:bg-yellow-500/20'}
                        >
                          <TableCell className="font-mono text-xs">{divida.vendaId}</TableCell>
                          <TableCell>{new Date(divida.dataCriacao).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              {divida.temAnotacaoImportante && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              {divida.clienteNome}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(divida.valorFinal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(valorPago)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {isQuitado
                              ? <Badge className="bg-green-600 hover:bg-green-700 text-white">Quitado</Badge>
                              : formatCurrency(saldo)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={progresso} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(progresso)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{divida.tipoRecorrencia}</TableCell>
                          <TableCell className="text-center">{divida.qtdVezes}x</TableCell>
                          <TableCell>{divida.inicioCompetencia}</TableCell>
                          <TableCell>
                            {isQuitado
                              ? <Badge className="bg-green-600 hover:bg-green-700 text-white">Quitado</Badge>
                              : <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Em Aberto</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleAbrirDetalhes(divida)} title="Ver detalhes">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!isQuitado && (
                                <Button variant="ghost" size="icon" onClick={() => handleAbrirPagamento(divida)} title="Registrar pagamento">
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleAbrirAgenda(divida)} title="Agenda eletrônica">
                                <CalendarDays className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" className="h-4" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Modal Registrar Pagamento */}
      <Dialog open={pagamentoModalOpen} onOpenChange={setPagamentoModalOpen}>
        <DialogContent className="max-w-2xl !flex !flex-col">
          <DialogHeader>
            <DialogTitle>Registrar Novo Pagamento</DialogTitle>
            {dividaSelecionada && (
              <p className="text-sm text-muted-foreground">
                {dividaSelecionada.clienteNome} — Saldo devedor: <span className="font-semibold">{formatCurrency(getSaldoDevedor(dividaSelecionada))}</span>
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data/Hora</Label>
                <Input value={new Date().toLocaleString('pt-BR')} readOnly className="bg-muted cursor-not-allowed" />
              </div>
              <div>
                <Label>Responsável</Label>
                <Input value={user?.colaborador?.nome || 'Não identificado'} readOnly className="bg-muted cursor-not-allowed" />
              </div>
            </div>
            <div>
              <Label>Valor de Pagamento *</Label>
              <InputComMascara
                mascara="moeda"
                value={valorPagamento}
                onChange={(_, raw) => setValorPagamento(typeof raw === 'number' ? raw : 0)}
                placeholder="0,00"
              />
            </div>
            <FileUploadComprovante
              label="Anexo (Comprovante)"
              value={comprovante}
              fileName={comprovanteNome}
              onFileChange={(data) => {
                setComprovante(data.comprovante);
                setComprovanteNome(data.comprovanteNome);
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagamentoModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarPagamento}>Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes (Histórico + Agenda) */}
      <Dialog open={detalhesModalOpen} onOpenChange={setDetalhesModalOpen}>
        <DialogContent className="max-w-4xl !flex !flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Detalhes da Dívida</DialogTitle>
            {dividaDetalhes && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>ID Venda:</strong> {dividaDetalhes.vendaId} | <strong>Cliente:</strong> {dividaDetalhes.clienteNome} | <strong>Loja:</strong> {dividaDetalhes.lojaNome}</p>
                <p><strong>Valor Final:</strong> {formatCurrency(dividaDetalhes.valorFinal)} | <strong>Saldo Devedor:</strong> {formatCurrency(getSaldoDevedor(dividaDetalhes))} | <strong>Situação:</strong> {dividaDetalhes.situacao}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={getProgressoDivida(dividaDetalhes)} className="h-3 flex-1" />
                  <span className="text-xs font-medium">{Math.round(getProgressoDivida(dividaDetalhes))}%</span>
                </div>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Histórico de Pagamentos */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Histórico de Pagamentos
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data do Pagamento</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Anexo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoPagamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        Nenhum pagamento registrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    historicoPagamentos.map(pgt => (
                      <TableRow key={pgt.id}>
                        <TableCell>{new Date(pgt.dataPagamento).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(pgt.valor)}</TableCell>
                        <TableCell>{pgt.responsavel}</TableCell>
                        <TableCell>
                          {pgt.comprovanteNome ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { if (pgt.comprovanteBase64) window.open(pgt.comprovanteBase64, '_blank'); }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {pgt.comprovanteNome}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Agenda Eletrônica */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Agenda Eletrônica
                </h3>
                {dividaDetalhes && (
                  <Button size="sm" variant="outline" onClick={() => handleAbrirNovaAnotacao(dividaDetalhes.id)}>
                    <Plus className="h-4 w-4 mr-1" /> Nova Anotação
                  </Button>
                )}
              </div>
              {anotacoesDetalhes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma anotação registrada</p>
              ) : (
                <div className="space-y-3">
                  {anotacoesDetalhes.map(ano => (
                    <div key={ano.id} className={`p-3 rounded-lg border ${ano.importante ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'bg-muted/50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(ano.dataHora).toLocaleString('pt-BR')}</span>
                          <span>•</span>
                          <span>{ano.usuario}</span>
                        </div>
                        {ano.importante && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Importante
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{ano.observacao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalhesModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Agenda Eletrônica Standalone */}
      <Dialog open={agendaModalOpen} onOpenChange={setAgendaModalOpen}>
        <DialogContent className="max-w-3xl !flex !flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Agenda Eletrônica
            </DialogTitle>
            {dividaAgenda && (
              <p className="text-sm text-muted-foreground">
                {dividaAgenda.clienteNome} — {dividaAgenda.vendaId}
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            {dividaAgenda && (
              <Button size="sm" onClick={() => handleAbrirNovaAnotacao(dividaAgenda.id)}>
                <Plus className="h-4 w-4 mr-1" /> Registrar Nova Anotação
              </Button>
            )}
            {anotacoesAgenda.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma anotação registrada</p>
            ) : (
              <div className="space-y-3">
                {anotacoesAgenda.map(ano => (
                  <div key={ano.id} className={`p-3 rounded-lg border ${ano.importante ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(ano.dataHora).toLocaleString('pt-BR')}</span>
                        <span>•</span>
                        <span>{ano.usuario}</span>
                      </div>
                      {ano.importante && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Importante
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{ano.observacao}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgendaModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Anotação */}
      <Dialog open={novaAnotacaoModalOpen} onOpenChange={setNovaAnotacaoModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Anotação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data/Hora</Label>
                <Input value={new Date().toLocaleString('pt-BR')} readOnly className="bg-muted cursor-not-allowed" />
              </div>
              <div>
                <Label>Usuário</Label>
                <Input value={user?.colaborador?.nome || 'Não identificado'} readOnly className="bg-muted cursor-not-allowed" />
              </div>
            </div>
            <div>
              <Label>Observação *</Label>
              <Textarea
                value={novaAnotacaoTexto}
                onChange={(e) => setNovaAnotacaoTexto(e.target.value)}
                placeholder="Digite a anotação..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={novaAnotacaoImportante}
                onCheckedChange={(v) => setNovaAnotacaoImportante(!!v)}
              />
              <Label className="cursor-pointer flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Marcar como Importante
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaAnotacaoModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarAnotacao}>Salvar Anotação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
