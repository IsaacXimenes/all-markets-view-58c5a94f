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
import { FileUploadComprovante } from '@/components/estoque/FileUploadComprovante';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { Download, Filter, X, Eye, DollarSign, CheckCircle2, Clock, FileText } from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import {
  getDividasFiado,
  getPagamentosDivida,
  getValorPagoDivida,
  getSaldoDevedor,
  getProgressoDivida,
  registrarPagamentoFiado,
  getEstatisticasFiado,
  formatCurrency,
  DividaFiado,
  PagamentoFiado
} from '@/utils/fiadoApi';
import { toast } from 'sonner';

export default function FinanceiroFiado() {
  const { obterLojasAtivas } = useCadastroStore();
  const { user } = useAuthStore();
  const lojas = obterLojasAtivas();

  const [dividas, setDividas] = useState<DividaFiado[]>(getDividasFiado());
  const [filters, setFilters] = useState({ cliente: '', loja: 'todas', situacao: 'todos' });

  // Modal de pagamento
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false);
  const [dividaSelecionada, setDividaSelecionada] = useState<DividaFiado | null>(null);
  const [valorPagamento, setValorPagamento] = useState<number>(0);
  const [comprovante, setComprovante] = useState('');
  const [comprovanteNome, setComprovanteNome] = useState('');

  // Histórico
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [dividaHistorico, setDividaHistorico] = useState<DividaFiado | null>(null);

  const recarregar = () => setDividas(getDividasFiado());

  const filteredDividas = useMemo(() => {
    return dividas.filter(d => {
      if (filters.cliente && !d.clienteNome.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
      if (filters.loja !== 'todas' && d.lojaId !== filters.loja) return false;
      if (filters.situacao !== 'todos' && d.situacao !== filters.situacao) return false;
      return true;
    });
  }, [dividas, filters]);

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

  const handleAbrirHistorico = (divida: DividaFiado) => {
    setDividaHistorico(divida);
    setHistoricoModalOpen(true);
  };

  const handleLimpar = () => setFilters({ cliente: '', loja: 'todas', situacao: 'todos' });

  const handleExport = () => {
    const dataToExport = filteredDividas.map(d => ({
      'Venda': d.vendaId,
      'Cliente': d.clienteNome,
      'Loja': d.lojaNome,
      'Valor Final': formatCurrency(d.valorFinal),
      'Valor Pago': formatCurrency(getValorPagoDivida(d.id)),
      'Saldo Devedor': formatCurrency(getSaldoDevedor(d)),
      'Progresso': `${Math.round(getProgressoDivida(d))}%`,
      'Qtd. Vezes': `${d.qtdVezes}x`,
      'Início Competência': d.inicioCompetencia,
      'Situação': d.situacao
    }));

    const headers = Object.keys(dataToExport[0] || {}).join(',');
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
    if (!dividaHistorico) return [];
    return getPagamentosDivida(dividaHistorico.id);
  }, [dividaHistorico, dividas]);

  return (
    <FinanceiroLayout title="Conferências - Fiado">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor Final</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                    <TableHead className="text-right">Saldo Devedor</TableHead>
                    <TableHead className="w-[160px]">Progresso</TableHead>
                    <TableHead className="text-center">Qtd. Vezes</TableHead>
                    <TableHead>Início Competência</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDividas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                          <TableCell className="font-medium">{divida.clienteNome}</TableCell>
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
                          <TableCell className="text-center">{divida.qtdVezes}x</TableCell>
                          <TableCell>{divida.inicioCompetencia}</TableCell>
                          <TableCell>
                            {isQuitado
                              ? <Badge className="bg-green-600 hover:bg-green-700 text-white">Quitado</Badge>
                              : <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Em Aberto</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleAbrirHistorico(divida)} title="Ver histórico">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!isQuitado && (
                                <Button variant="ghost" size="icon" onClick={() => handleAbrirPagamento(divida)} title="Registrar pagamento">
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
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

      {/* Modal Histórico de Pagamentos */}
      <Dialog open={historicoModalOpen} onOpenChange={setHistoricoModalOpen}>
        <DialogContent className="max-w-3xl !flex !flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Histórico de Pagamentos</DialogTitle>
            {dividaHistorico && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Cliente:</strong> {dividaHistorico.clienteNome} | <strong>Venda:</strong> {dividaHistorico.vendaId}</p>
                <p><strong>Valor Final:</strong> {formatCurrency(dividaHistorico.valorFinal)} | <strong>Saldo Devedor:</strong> {formatCurrency(getSaldoDevedor(dividaHistorico))}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={getProgressoDivida(dividaHistorico)} className="h-3 flex-1" />
                  <span className="text-xs font-medium">{Math.round(getProgressoDivida(dividaHistorico))}%</span>
                </div>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
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
                            onClick={() => {
                              if (pgt.comprovanteBase64) {
                                window.open(pgt.comprovanteBase64, '_blank');
                              }
                            }}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoricoModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
