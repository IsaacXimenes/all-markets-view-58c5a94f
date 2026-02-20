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
  getSolicitacoesByOS,
  getSolicitacaoById
} from '@/utils/solicitacaoPecasApi';
import { getContasFinanceiras, getFornecedores } from '@/utils/cadastrosApi';
import { getOrdemServicoById, updateOrdemServico } from '@/utils/assistenciaApi';
import { Eye, Check, Download, Filter, X, FileText, Clock, CheckCircle, DollarSign, Package, PackageCheck } from 'lucide-react';
import { FileUploadComprovante } from '@/components/estoque/FileUploadComprovante';
import { toast } from 'sonner';
import { useCadastroStore } from '@/store/cadastroStore';
import { ResponsiveCardGrid, ResponsiveFilterGrid } from '@/components/ui/ResponsiveContainers';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { useAuthStore } from '@/store/authStore';

export default function FinanceiroNotasAssistencia() {
  const [notas, setNotas] = useState(getNotasAssistencia());
  const [notaSelecionada, setNotaSelecionada] = useState<NotaAssistencia | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { obterLojasAtivas, obterFinanceiros, obterNomeLoja, obterColaboradorById } = useCadastroStore();
  const user = useAuthStore(state => state.user);
  
  const contasFinanceiras = getContasFinanceiras().filter(c => c.status === 'Ativo');
  const colaboradoresFinanceiros = obterFinanceiros();
  const fornecedoresList = getFornecedores();
  const lojas = obterLojasAtivas();
  
  const [contaPagamento, setContaPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [responsavelFinanceiro, setResponsavelFinanceiro] = useState(user?.colaborador?.nome || '');
  const [comprovante, setComprovante] = useState('');
  const [comprovanteNome, setComprovanteNome] = useState('');

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
    setResponsavelFinanceiro(user?.colaborador?.nome || '');
    setComprovante('');
    setComprovanteNome('');
    setDialogOpen(true);
  };

  const botaoDesabilitado = !contaPagamento || !formaPagamento || !responsavelFinanceiro || !comprovante;

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
      'Solicitação': n.solicitacaoId,
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
                  <p className="text-xs text-secondary-foreground">Qtd de Notas</p>
                  <p className="text-2xl font-bold text-foreground">{estatisticas.qtdNotas}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground opacity-40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-secondary-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-primary">{estatisticas.qtdPendentes}</p>
                </div>
                <Clock className="h-8 w-8 text-primary opacity-40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-secondary-foreground">Conferidas</p>
                  <p className="text-2xl font-bold text-success">{estatisticas.qtdConferidas}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success opacity-40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-secondary-foreground">Total Pendente</p>
                  <p className="text-2xl font-bold text-primary truncate">{formatCurrency(totalPendente)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary opacity-40 shrink-0" />
              </div>
            </CardContent>
          </Card>
        </ResponsiveCardGrid>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <ResponsiveFilterGrid cols={5}>
              <div className="space-y-1">
                <Label className="text-xs text-secondary-foreground">Data Início</Label>
                <Input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-secondary-foreground">Data Fim</Label>
                <Input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-secondary-foreground">Fornecedor</Label>
                <AutocompleteFornecedor
                  value={filters.fornecedor === 'todos' ? '' : filters.fornecedor}
                  onChange={(v) => setFilters({ ...filters, fornecedor: v || 'todos' })}
                  placeholder="Todos"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-secondary-foreground">Loja Solicitante</Label>
                <AutocompleteLoja
                  value={filters.lojaSolicitante === 'todos' ? '' : filters.lojaSolicitante}
                  onChange={(v) => setFilters({ ...filters, lojaSolicitante: v || 'todos' })}
                  placeholder="Todas"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-secondary-foreground">Status</Label>
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
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Loja Solicitante</TableHead>
                    <TableHead>OS Vinculada</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Nenhuma nota encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotas.map(nota => {
                      const dias = Math.ceil((new Date().getTime() - new Date(nota.dataCriacao).getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <TableRow 
                          key={nota.id}
                          className="bg-card hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                              <Clock className="h-3 w-3" />
                              {new Date(nota.dataCriacao).toLocaleString('pt-BR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{nota.id}</TableCell>
                          <TableCell>{getFornecedorNome(nota.fornecedor)}</TableCell>
                          <TableCell>{obterNomeLoja(nota.lojaSolicitante)}</TableCell>
                          <TableCell className="font-mono text-xs">{nota.osId || '-'}</TableCell>
                          <TableCell>
                            {nota.tipoConsignacao ? (
                              <Badge className="bg-violet-500/15 text-violet-600 border border-violet-300 dark:border-violet-700 inline-flex items-center gap-1">
                                <PackageCheck className="h-3 w-3" />
                                Consignação
                              </Badge>
                            ) : nota.loteId ? (
                              <Badge className="bg-indigo-500/15 text-indigo-600 border border-indigo-300 dark:border-indigo-700 inline-flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                Lote Agrupado
                              </Badge>
                            ) : (
                              <Badge variant="outline">Peças</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-right">
                            {formatCurrency(nota.valorTotal)}
                          </TableCell>
                          <TableCell>
                            {nota.status === 'Concluído' ? (
                              <Badge className="bg-success/15 text-success border border-success/30">
                                {nota.status}
                              </Badge>
                            ) : (
                              <Badge className="bg-primary/15 text-warning border border-primary/30">
                                {nota.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              dias >= 7 ? 'bg-destructive/10 text-destructive' :
                              dias >= 5 ? 'bg-primary/15 text-warning' :
                              'bg-muted text-muted-foreground'
                            }>
                              {dias}d
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {filteredNotas.filter(n => n.status === 'Pendente').length} nota(s) pendente(s)
              </span>
              <span className="text-lg font-bold text-foreground">
                Total Pendente: {formatCurrency(totalPendente)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {notaSelecionada?.loteId && <Package className="h-5 w-5 text-indigo-600" />}
                Conferir Nota {notaSelecionada?.id}
                {notaSelecionada?.loteId && (
                  <Badge className="bg-indigo-500/15 text-indigo-600 border border-indigo-300 ml-2">
                    {notaSelecionada.loteId}
                  </Badge>
                )}
              </DialogTitle>
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
                      <Label>{notaSelecionada.loteId ? 'Lote' : 'Solicitação'}</Label>
                      <Input value={notaSelecionada.loteId || notaSelecionada.solicitacaoId} disabled />
                    </div>
                    <div>
                      <Label>Fornecedor</Label>
                      <Input value={getFornecedorNome(notaSelecionada.fornecedor)} disabled />
                    </div>
                  </div>

                  {/* Detalhamento do Lote - Tabela individual */}
                  {notaSelecionada.loteId && notaSelecionada.solicitacaoIds && notaSelecionada.solicitacaoIds.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Detalhamento do Lote ({notaSelecionada.solicitacaoIds.length} solicitações)
                      </h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Data Solicitação</TableHead>
                              <TableHead className="text-xs">ID OS</TableHead>
                              <TableHead className="text-xs">Peça</TableHead>
                              <TableHead className="text-xs">Qtd</TableHead>
                              <TableHead className="text-xs text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {notaSelecionada.solicitacaoIds.map(solId => {
                              const sol = getSolicitacaoById(solId);
                              if (!sol) return null;
                              return (
                                <TableRow key={solId}>
                                  <TableCell className="text-xs">{new Date(sol.dataSolicitacao).toLocaleDateString('pt-BR')}</TableCell>
                                  <TableCell className="font-mono text-xs">{sol.osId}</TableCell>
                                  <TableCell className="text-sm">{sol.peca}</TableCell>
                                  <TableCell className="text-sm">{sol.quantidade}</TableCell>
                                  <TableCell className="text-sm font-semibold text-right">{formatCurrency((sol.valorPeca || 0) * sol.quantidade)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

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

                  {/* Dados de Pagamento Informados no Encaminhamento */}
                  {(notaSelecionada.formaPagamentoEncaminhamento || notaSelecionada.observacaoEncaminhamento) && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <DollarSign className="h-4 w-4" />
                        Dados de Pagamento Informados
                      </h3>
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground">Forma de Pagamento</span>
                            <p className="font-medium">{notaSelecionada.formaPagamentoEncaminhamento || '-'}</p>
                          </div>
                          {notaSelecionada.formaPagamentoEncaminhamento === 'Pix' && (
                            <>
                              <div>
                                <span className="text-xs text-muted-foreground">Conta Bancária</span>
                                <p className="font-medium">{notaSelecionada.contaBancariaEncaminhamento || '-'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Nome do Recebedor</span>
                                <p className="font-medium">{notaSelecionada.nomeRecebedor || '-'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Chave Pix</span>
                                <p className="font-medium font-mono text-xs">{notaSelecionada.chavePixEncaminhamento || '-'}</p>
                              </div>
                            </>
                          )}
                        </div>
                        {notaSelecionada.observacaoEncaminhamento && (
                          <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                            <span className="text-xs text-muted-foreground">Observação</span>
                            <p className="text-sm">{notaSelecionada.observacaoEncaminhamento}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {notaSelecionada.status === 'Pendente' && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3 text-primary">Seção "Pagamento" (Habilitada)</h3>
                      
                      {/* Dados Pix das solicitações */}
                      {notaSelecionada.osId && (() => {
                        const solicitacoesOS = getSolicitacoesByOS(notaSelecionada.osId!);
                        const solicitacoesComPix = solicitacoesOS.filter(s => s.formaPagamento === 'Pix' && (s.bancoDestinatario || s.chavePix));
                        if (solicitacoesComPix.length === 0) return null;
                        return (
                          <div className="mb-4 space-y-2">
                            {solicitacoesComPix.map(sol => (
                              <div key={sol.id} className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Dados Pix — {sol.peca}</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-xs text-muted-foreground">Banco do Destinatário</span>
                                    <p className="font-medium">{sol.bancoDestinatario || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs text-muted-foreground">Chave Pix</span>
                                    <p className="font-medium font-mono text-xs">{sol.chavePix || '-'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      
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
                          <Input
                            value={user?.colaborador?.nome || 'Não identificado'}
                            disabled
                            className="bg-muted"
                          />
                        </div>

                        <div>
                          <Label>Comprovante *</Label>
                          <FileUploadComprovante
                            label="Comprovante de Pagamento"
                            required
                            value={comprovante}
                            fileName={comprovanteNome}
                            onFileChange={(data) => {
                              setComprovante(data.comprovante);
                              setComprovanteNome(data.comprovanteNome);
                            }}
                          />
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
                    <>
                      {(notaSelecionada.formaPagamentoEncaminhamento || notaSelecionada.observacaoEncaminhamento) && (
                        <div className="border-t pt-4">
                          <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                            <DollarSign className="h-4 w-4" />
                            Dados de Pagamento Informados
                          </h3>
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-xs text-muted-foreground">Forma de Pagamento</span>
                                <p className="font-medium">{notaSelecionada.formaPagamentoEncaminhamento || '-'}</p>
                              </div>
                              {notaSelecionada.formaPagamentoEncaminhamento === 'Pix' && (
                                <>
                                  <div>
                                    <span className="text-xs text-muted-foreground">Conta Bancária</span>
                                    <p className="font-medium">{notaSelecionada.contaBancariaEncaminhamento || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs text-muted-foreground">Nome do Recebedor</span>
                                    <p className="font-medium">{notaSelecionada.nomeRecebedor || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs text-muted-foreground">Chave Pix</span>
                                    <p className="font-medium font-mono text-xs">{notaSelecionada.chavePixEncaminhamento || '-'}</p>
                                  </div>
                                </>
                              )}
                            </div>
                            {notaSelecionada.observacaoEncaminhamento && (
                              <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                                <span className="text-xs text-muted-foreground">Observação</span>
                                <p className="text-sm">{notaSelecionada.observacaoEncaminhamento}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
                    </>
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
