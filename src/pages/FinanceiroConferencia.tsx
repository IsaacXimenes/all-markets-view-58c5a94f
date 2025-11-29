import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Download, Filter, X } from 'lucide-react';
import { getPagamentos, getContas, conferirPagamento, exportToCSV, Pagamento } from '@/utils/financeApi';
import { toast } from 'sonner';

export default function FinanceiroConferencia() {
  const [pagamentos, setPagamentos] = useState(getPagamentos());
  const contas = getContas();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [meioPagamentoSelecionado, setMeioPagamentoSelecionado] = useState('');
  const [parcelas, setParcelas] = useState('');
  
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    conta: 'todas',
    meioPagamento: 'todos',
    palavraChave: ''
  });

  const handleAbrirConferencia = (pagamento: Pagamento) => {
    setPagamentoSelecionado(pagamento);
    setContaSelecionada('');
    setMeioPagamentoSelecionado('');
    setParcelas('');
    setDialogOpen(true);
  };

  const handleConferir = () => {
    if (!contaSelecionada || !meioPagamentoSelecionado) {
      toast.error('Selecione a conta e meio de pagamento');
      return;
    }

    if ((meioPagamentoSelecionado === 'Cartão Crédito' || meioPagamentoSelecionado === 'Boleto') && !parcelas) {
      toast.error('Informe o número de parcelas');
      return;
    }

    if (pagamentoSelecionado && conferirPagamento(pagamentoSelecionado.id)) {
      setPagamentos(getPagamentos());
      setDialogOpen(false);
      toast.success('Pagamento conferido com sucesso!');
    }
  };

  const mostrarCampoParcelas = meioPagamentoSelecionado === 'Cartão Crédito' || meioPagamentoSelecionado === 'Boleto';

  const filteredPagamentos = useMemo(() => {
    return pagamentos.filter(pag => {
      if (filters.dataInicio && pag.data < filters.dataInicio) return false;
      if (filters.dataFim && pag.data > filters.dataFim) return false;
      if (filters.conta !== 'todas' && pag.conta !== filters.conta) return false;
      if (filters.meioPagamento !== 'todos' && pag.meioPagamento !== filters.meioPagamento) return false;
      if (filters.palavraChave && !pag.descricao.toLowerCase().includes(filters.palavraChave.toLowerCase())) return false;
      return true;
    });
  }, [pagamentos, filters]);

  const totalPendente = useMemo(() => {
    return filteredPagamentos
      .filter(p => p.status === 'Pendente')
      .reduce((acc, p) => acc + p.valor, 0);
  }, [filteredPagamentos]);

  const handleExport = () => {
    const dataToExport = filteredPagamentos.map(p => ({
      ID: p.id,
      Data: p.data,
      Descrição: p.descricao,
      Valor: `R$ ${p.valor.toFixed(2)}`,
      'Meio Pagamento': p.meioPagamento,
      Conta: p.conta,
      Loja: p.loja,
      Status: p.status
    }));
    exportToCSV(dataToExport, `conferencia-contas-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      conta: 'todas',
      meioPagamento: 'todos',
      palavraChave: ''
    });
  };

  return (
    <FinanceiroLayout title="Conferência de Contas">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <Label htmlFor="conta">Conta</Label>
                <Select value={filters.conta} onValueChange={(value) => setFilters({ ...filters, conta: value })}>
                  <SelectTrigger id="conta">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {contas.map(c => (
                      <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="meioPagamento">Meio de Pagamento</Label>
                <Select value={filters.meioPagamento} onValueChange={(value) => setFilters({ ...filters, meioPagamento: value })}>
                  <SelectTrigger id="meioPagamento">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                    <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="palavraChave">Palavra-chave</Label>
                <Input
                  id="palavraChave"
                  placeholder="Buscar..."
                  value={filters.palavraChave}
                  onChange={(e) => setFilters({ ...filters, palavraChave: e.target.value })}
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
              <CardTitle>Pagamentos Pendentes de Conferência</CardTitle>
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
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Meio Pagto</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPagamentos.map((pag) => (
                    <TableRow key={pag.id}>
                      <TableCell className="font-mono text-xs">{pag.id}</TableCell>
                      <TableCell>{new Date(pag.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{pag.descricao}</TableCell>
                      <TableCell className="font-semibold">R$ {pag.valor.toFixed(2)}</TableCell>
                      <TableCell>{pag.meioPagamento}</TableCell>
                      <TableCell className="text-xs">{pag.conta}</TableCell>
                      <TableCell>{pag.loja}</TableCell>
                      <TableCell>
                        <Badge variant={pag.status === 'Conferido' ? 'default' : 'secondary'}>
                          {pag.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pag.status === 'Pendente' && (
                          <Button size="sm" onClick={() => handleAbrirConferencia(pag)}>
                            <Check className="h-4 w-4 mr-1" />
                            Conferir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {filteredPagamentos.filter(p => p.status === 'Pendente').length} pagamento(s) pendente(s)
              </span>
              <span className="text-lg font-bold">
                Total Pendente: R$ {totalPendente.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conferir Pagamento</DialogTitle>
            </DialogHeader>
            {pagamentoSelecionado && (
              <div className="space-y-4">
                <div>
                  <Label>Descrição</Label>
                  <Input value={pagamentoSelecionado.descricao} disabled />
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input 
                    value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamentoSelecionado.valor)} 
                    disabled 
                  />
                </div>
                <div>
                  <Label htmlFor="conta">Conta *</Label>
                  <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                    <SelectTrigger id="conta">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map(c => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="meioPagamento">Meio de Pagamento *</Label>
                  <Select value={meioPagamentoSelecionado} onValueChange={setMeioPagamentoSelecionado}>
                    <SelectTrigger id="meioPagamento">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                      <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {mostrarCampoParcelas && (
                  <div>
                    <Label htmlFor="parcelas">Nº de Parcelas *</Label>
                    <Input 
                      id="parcelas"
                      type="number"
                      min="1"
                      value={parcelas}
                      onChange={(e) => setParcelas(e.target.value)}
                      placeholder="Ex: 3"
                    />
                    {mostrarCampoParcelas && !parcelas && (
                      <p className="text-sm text-destructive mt-1">Informe o número de parcelas</p>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleConferir}
                    disabled={!contaSelecionada || !meioPagamentoSelecionado || (mostrarCampoParcelas && !parcelas)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Conferir
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
