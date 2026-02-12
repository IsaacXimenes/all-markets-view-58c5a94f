import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getNotasAssistencia, 
  finalizarNotaAssistencia, 
  formatCurrency,
  NotaAssistencia,
  getSolicitacoesByOS
} from '@/utils/solicitacaoPecasApi';
import { getContasFinanceiras, getFornecedores } from '@/utils/cadastrosApi';
import { getOrdemServicoById, updateOrdemServico } from '@/utils/assistenciaApi';
import { Eye, Check, Download, Filter, X, FileText, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useCadastroStore } from '@/store/cadastroStore';
import { ResponsiveCardGrid, ResponsiveFilterGrid } from '@/components/ui/ResponsiveContainers';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { getStatusRowClass } from '@/utils/statusColors';

export default function FinanceiroNotasAssistencia() {
  const [notas, setNotas] = useState(getNotasAssistencia());
  const [notaSelecionada, setNotaSelecionada] = useState<NotaAssistencia | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { obterLojasAtivas, obterFinanceiros, obterNomeLoja } = useCadastroStore();
  
  const contasFinanceiras = getContasFinanceiras().filter(c => c.status === 'Ativo');
  const colaboradoresFinanceiros = obterFinanceiros();
  const fornecedoresList = getFornecedores();
  const lojas = obterLojasAtivas();
  
  const [contaPagamento, setContaPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [responsavelFinanceiro, setResponsavelFinanceiro] = useState('');

  // Filtros
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    fornecedor: 'todos',
    lojaSolicitante: 'todos',
    status: 'todos'
  });

  // Filtrar e ordenar notas
  const filteredNotas = useMemo(() => {
    let filtered = notas.filter(nota => {
      if (filters.dataInicio && nota.dataCriacao < filters.dataInicio) return false;
      if (filters.dataFim && nota.dataCriacao > filters.dataFim) return false;
      if (filters.fornecedor !== 'todos' && nota.fornecedor !== filters.fornecedor) return false;
      if (filters.lojaSolicitante !== 'todos' && nota.lojaSolicitante !== filters.lojaSolicitante) return false;
      if (filters.status !== 'todos' && nota.status !== filters.status) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (a.status === 'Pendente' && b.status !== 'Pendente') return -1;
      if (a.status !== 'Pendente' && b.status === 'Pendente') return 1;
      return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
    });
  }, [notas, filters]);

  const totalPendente = useMemo(() => {
    return filteredNotas
      .filter(n => n.status === 'Pendente')
      .reduce((acc, n) => acc + n.valorTotal, 0);
  }, [filteredNotas]);

  const getFornecedorNome = (fornId: string) => fornecedoresList.find(f => f.id === fornId)?.nome || fornId;

  const handleVerNota = (nota: NotaAssistencia) => {
    setNotaSelecionada(nota);
    setContaPagamento('');
    setFormaPagamento('');
    setResponsavelFinanceiro('');
    setDialogOpen(true);
  };

  const botaoDesabilitado = !contaPagamento || !formaPagamento || !responsavelFinanceiro;

  const handleFinalizarNota = () => {
    if (!notaSelecionada || botaoDesabilitado) return;

    const notaFinalizada = finalizarNotaAssistencia(notaSelecionada.id, {
      responsavelFinanceiro,
      formaPagamento,
      contaPagamento
    });
    
    if (notaFinalizada) {
      setNotas(getNotasAssistencia());
      setDialogOpen(false);
      
      toast.success(`✅ Nota ${notaFinalizada.id} liberada! Peças adicionadas ao estoque.`, {
        duration: 5000
      });
    }
  };

  const handleExport = () => {
    const dataToExport = filteredNotas.map(n => ({
      ID: n.id,
      Data: new Date(n.dataCriacao).toLocaleDateString('pt-BR'),
      'Lote': n.loteId,
      Fornecedor: getFornecedorNome(n.fornecedor),
      'Valor Total': formatCurrency(n.valorTotal),
      Status: n.status
    }));
    
    const csvContent = Object.keys(dataToExport[0] || {}).join(';') + '\n' +
      dataToExport.map(row => Object.values(row).join(';')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `notas-assistencia-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      fornecedor: 'todos',
      lojaSolicitante: 'todos',
      status: 'todos'
    });
  };

  // Estatísticas para os cards
  const estatisticas = useMemo(() => ({
    qtdNotas: filteredNotas.length,
    qtdPendentes: filteredNotas.filter(n => n.status === 'Pendente').length,
    qtdConferidas: filteredNotas.filter(n => n.status === 'Concluído').length,
    totalConferido: filteredNotas.filter(n => n.status === 'Concluído').reduce((acc, n) => acc + n.valorTotal, 0)
  }), [filteredNotas]);

  return (
    <FinanceiroLayout title="Notas Pendentes - Assistência">
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <ResponsiveCardGrid cols={4}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Qtd de Notas</p>
                  <p className="text-2xl font-bold">{estatisticas.qtdNotas}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground opacity-40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{estatisticas.qtdPendentes}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600 opacity-40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Conferidas</p>
                  <p className="text-2xl font-bold text-green-600">{estatisticas.qtdConferidas}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total Pendente</p>
                  <p className="text-2xl font-bold text-yellow-600 truncate">{formatCurrency(totalPendente)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-600 opacity-40 shrink-0" />
              </div>
            </CardContent>
          </Card>
        </ResponsiveCardGrid>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <ResponsiveFilterGrid cols={5}>
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fornecedor</Label>
                <AutocompleteFornecedor
                  value={filters.fornecedor === 'todos' ? '' : filters.fornecedor}
                  onChange={(v) => setFilters({ ...filters, fornecedor: v || 'todos' })}
                  placeholder="Todos"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Loja Solicitante</Label>
                <AutocompleteLoja
                  value={filters.lojaSolicitante === 'todos' ? '' : filters.lojaSolicitante}
                  onChange={(v) => setFilters({ ...filters, lojaSolicitante: v || 'todos' })}
                  placeholder="Todas"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Concluído">Conferido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ResponsiveFilterGrid>
            <div className="flex justify-end mt-3">
              <Button variant="outline" size="sm" onClick={handleLimpar}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Notas */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Notas de Assistência</CardTitle>
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
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Loja Solicitante</TableHead>
                    <TableHead>OS Vinculada</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhuma nota encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotas.map(nota => (
                      <TableRow 
                        key={nota.id}
                        className={getStatusRowClass(nota.status)}
                      >
                        <TableCell className="font-mono text-xs">{nota.id}</TableCell>
                        <TableCell>{new Date(nota.dataCriacao).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{getFornecedorNome(nota.fornecedor)}</TableCell>
                        <TableCell>{obterNomeLoja(nota.lojaSolicitante)}</TableCell>
                        <TableCell className="font-mono text-xs">{nota.osId || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Peças</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(nota.valorTotal)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={nota.status === 'Concluído' ? 'default' : 'destructive'}>
                            {nota.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {nota.status === 'Pendente' ? (
                            <Button size="sm" onClick={() => handleVerNota(nota)}>
                              <Check className="h-4 w-4 mr-1" />
                              Conferir
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleVerNota(nota)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {filteredNotas.filter(n => n.status === 'Pendente').length} nota(s) pendente(s)
              </span>
              <span className="text-lg font-bold">
                Total Pendente: {formatCurrency(totalPendente)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Conferir Nota {notaSelecionada?.id}</DialogTitle>
            </DialogHeader>
            
            {notaSelecionada && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>ID da Nota</Label>
                      <Input value={notaSelecionada.id} disabled />
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Input value={new Date(notaSelecionada.dataCriacao).toLocaleDateString('pt-BR')} disabled />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Lote</Label>
                      <Input value={notaSelecionada.loteId} disabled />
                    </div>
                    <div>
                      <Label>Fornecedor</Label>
                      <Input value={getFornecedorNome(notaSelecionada.fornecedor)} disabled />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Itens (Somente Leitura)</h3>
                    <div className="space-y-2 text-sm">
                      {notaSelecionada.itens.map((item, idx) => (
                        <div key={idx} className="p-3 bg-muted/30 rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{item.peca}</span>
                            <span>{formatCurrency(item.valorUnitario * item.quantidade)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Qtd: {item.quantidade} | Valor Unitário: {formatCurrency(item.valorUnitario)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {notaSelecionada.status === 'Pendente' && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3 text-primary">Seção "Pagamento" (Habilitada)</h3>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="contaPagamento">Conta de Pagamento *</Label>
                          <Select value={contaPagamento} onValueChange={setContaPagamento}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                            <SelectContent>
                              {contasFinanceiras.map(c => (
                                <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
                          <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pix">Pix</SelectItem>
                              <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                              <SelectItem value="Boleto">Boleto</SelectItem>
                              <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="responsavelFinanceiro">Responsável Financeiro *</Label>
                          <Select value={responsavelFinanceiro} onValueChange={setResponsavelFinanceiro}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o responsável" />
                            </SelectTrigger>
                            <SelectContent>
                              {colaboradoresFinanceiros.map(col => (
                                <SelectItem key={col.id} value={col.nome}>{col.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Valor Total</Label>
                          <Input 
                            value={formatCurrency(notaSelecionada.valorTotal)} 
                            disabled 
                            className="font-bold text-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {notaSelecionada.status === 'Concluído' && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">Informações de Pagamento</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-xs">Forma de Pagamento</Label>
                          <p className="font-medium">{notaSelecionada.formaPagamento}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Conta</Label>
                          <p className="font-medium">{notaSelecionada.contaPagamento}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Responsável</Label>
                          <p className="font-medium">{notaSelecionada.responsavelFinanceiro}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Fechar
              </Button>
              {notaSelecionada?.status === 'Pendente' && (
                <Button onClick={handleFinalizarNota} disabled={botaoDesabilitado}>
                  <Check className="h-4 w-4 mr-2" />
                  Finalizar Nota
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FinanceiroLayout>
  );
}
