import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  getPendencias, 
  PendenciaFinanceira, 
  finalizarPagamentoPendencia,
  getPendenciaPorNota
} from '@/utils/pendenciasFinanceiraApi';
import { getContasFinanceiras, getFornecedores } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { formatCurrency } from '@/utils/formatUtils';
import { FileUploadComprovante } from '@/components/estoque/FileUploadComprovante';
import { 
  Eye, 
  CreditCard, 
  Download, 
  Filter, 
  X, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle,
  FileText,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

export default function FinanceiroNotasPendencias() {
  const [pendencias, setPendencias] = useState<PendenciaFinanceira[]>(getPendencias());
  const [pendenciaSelecionada, setPendenciaSelecionada] = useState<PendenciaFinanceira | null>(null);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogPagamento, setDialogPagamento] = useState(false);
  
  const { obterFinanceiros } = useCadastroStore();
  const contasFinanceiras = getContasFinanceiras().filter(c => c.status === 'Ativo');
  const fornecedoresList = getFornecedores();
  const colaboradoresFinanceiros = obterFinanceiros();
  
  // Filtros
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    fornecedor: 'todos',
    statusPagamento: 'todos',
    statusConferencia: 'todos',
    palavraChave: ''
  });
  
  // Form de pagamento
  const [pagamentoForm, setPagamentoForm] = useState({
    contaPagamento: '',
    formaPagamento: '',
    parcelas: '1',
    dataVencimento: '',
    comprovante: '',
    comprovanteNome: '',
    comprovantePreview: '',
    observacoes: '',
    responsavel: ''
  });

  // Filtrar pendências
  const pendenciasFiltradas = useMemo(() => {
    let filtered = pendencias.filter(p => {
      if (filters.dataInicio && p.dataCriacao < filters.dataInicio) return false;
      if (filters.dataFim && p.dataCriacao > filters.dataFim) return false;
      if (filters.fornecedor !== 'todos' && p.fornecedor !== filters.fornecedor) return false;
      if (filters.statusPagamento !== 'todos' && p.statusPagamento !== filters.statusPagamento) return false;
      if (filters.statusConferencia !== 'todos' && p.statusConferencia !== filters.statusConferencia) return false;
      if (filters.palavraChave && 
          !p.notaId.toLowerCase().includes(filters.palavraChave.toLowerCase()) &&
          !p.fornecedor.toLowerCase().includes(filters.palavraChave.toLowerCase())) return false;
      return true;
    });

    // Ordenar: SLA crítico primeiro, depois por data
    return filtered.sort((a, b) => {
      // Prioridade: alertas SLA primeiro
      if (a.slaStatus === 'critico' && b.slaStatus !== 'critico') return -1;
      if (a.slaStatus !== 'critico' && b.slaStatus === 'critico') return 1;
      if (a.slaStatus === 'aviso' && b.slaStatus === 'normal') return -1;
      if (a.slaStatus === 'normal' && b.slaStatus === 'aviso') return 1;
      // Depois por status de pagamento (não pagos primeiro)
      if (a.statusPagamento !== 'Pago' && b.statusPagamento === 'Pago') return -1;
      if (a.statusPagamento === 'Pago' && b.statusPagamento !== 'Pago') return 1;
      // Por fim, por data
      return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
    });
  }, [pendencias, filters]);

  // Cards de resumo
  const resumo = useMemo(() => {
    const total = pendenciasFiltradas.length;
    const valorPendente = pendenciasFiltradas
      .filter(p => p.statusPagamento !== 'Pago')
      .reduce((acc, p) => acc + p.valorPendente, 0);
    const valorConferido = pendenciasFiltradas.reduce((acc, p) => acc + p.valorConferido, 0);
    const alertasSLA = pendenciasFiltradas.filter(p => p.slaAlerta && p.statusPagamento !== 'Pago').length;
    
    return { total, valorPendente, valorConferido, alertasSLA };
  }, [pendenciasFiltradas]);

  const getSLABadge = (pendencia: PendenciaFinanceira) => {
    if (pendencia.statusPagamento === 'Pago') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600">Pago</Badge>;
    }
    
    switch (pendencia.slaStatus) {
      case 'critico':
        return (
          <div className="flex items-center gap-1 bg-red-500/20 text-red-600 px-2 py-1 rounded text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            {pendencia.diasDecorridos}d
          </div>
        );
      case 'aviso':
        return (
          <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded text-xs font-medium">
            <AlertTriangle className="h-3 w-3" />
            {pendencia.diasDecorridos}d
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Clock className="h-3 w-3" />
            {pendencia.diasDecorridos}d
          </div>
        );
    }
  };

  const getStatusPagamentoBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Pago</Badge>;
      case 'Parcial':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Parcial</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Aguardando</Badge>;
    }
  };

  const getStatusConferenciaBadge = (status: string) => {
    switch (status) {
      case 'Conferência Completa':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Completa</Badge>;
      case 'Discrepância Detectada':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Discrepância</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Em Conf.</Badge>;
    }
  };

  const getRowClass = (pendencia: PendenciaFinanceira) => {
    if (pendencia.statusPagamento === 'Pago') return 'bg-green-500/10';
    if (pendencia.slaStatus === 'critico') return 'bg-red-500/10';
    if (pendencia.slaStatus === 'aviso') return 'bg-yellow-500/10';
    if (pendencia.statusConferencia === 'Discrepância Detectada') return 'bg-orange-500/10';
    return '';
  };

  const handleVerDetalhes = (pendencia: PendenciaFinanceira) => {
    setPendenciaSelecionada(pendencia);
    setDialogDetalhes(true);
  };

  const handleAbrirPagamento = (pendencia: PendenciaFinanceira) => {
    setPendenciaSelecionada(pendencia);
    setPagamentoForm({
      contaPagamento: '',
      formaPagamento: '',
      parcelas: '1',
      dataVencimento: '',
      comprovante: '',
      comprovanteNome: '',
      comprovantePreview: '',
      observacoes: '',
      responsavel: ''
    });
    setDialogPagamento(true);
  };

  const handleFinalizarPagamento = () => {
    if (!pendenciaSelecionada) return;
    
    if (!pagamentoForm.contaPagamento || !pagamentoForm.formaPagamento || !pagamentoForm.responsavel) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const resultado = finalizarPagamentoPendencia(pendenciaSelecionada.notaId, {
      formaPagamento: pagamentoForm.formaPagamento,
      parcelas: parseInt(pagamentoForm.parcelas),
      contaPagamento: pagamentoForm.contaPagamento,
      comprovante: pagamentoForm.comprovante,
      dataVencimento: pagamentoForm.dataVencimento,
      observacoes: pagamentoForm.observacoes,
      responsavel: pagamentoForm.responsavel
    });

    if (resultado) {
      toast.success(`Pagamento da nota ${pendenciaSelecionada.notaId} confirmado!`);
      setPendencias(getPendencias());
      setDialogPagamento(false);
      setDialogDetalhes(false);
    } else {
      toast.error('Erro ao processar pagamento');
    }
  };

  const handleExport = () => {
    const dataToExport = pendenciasFiltradas.map(p => ({
      'Nº Nota': p.notaId,
      Fornecedor: p.fornecedor,
      'Valor Total': formatCurrency(p.valorTotal),
      'Valor Conferido': formatCurrency(p.valorConferido),
      'Valor Pendente': formatCurrency(p.valorPendente),
      '% Conferência': `${p.percentualConferencia}%`,
      'Status Pagamento': p.statusPagamento,
      'Status Conferência': p.statusConferencia,
      'Dias Decorridos': p.diasDecorridos,
      SLA: p.slaStatus
    }));
    
    const csvContent = Object.keys(dataToExport[0] || {}).join(';') + '\n' +
      dataToExport.map(row => Object.values(row).join(';')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pendencias-financeiras-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      fornecedor: 'todos',
      statusPagamento: 'todos',
      statusConferencia: 'todos',
      palavraChave: ''
    });
  };

  const mostrarCampoParcelas = pagamentoForm.formaPagamento === 'Cartão de Crédito' || pagamentoForm.formaPagamento === 'Boleto';

  return (
    <FinanceiroLayout title="Notas - Pendências">
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pendências</p>
                  <p className="text-2xl font-bold">{resumo.total}</p>
                </div>
                <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Pendente</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(resumo.valorPendente)}</p>
                </div>
                <DollarSign className="h-10 w-10 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Conferido</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(resumo.valorConferido)}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas SLA</p>
                  <p className="text-2xl font-bold text-red-600">{resumo.alertasSLA}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
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
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Select value={filters.fornecedor} onValueChange={(value) => setFilters({ ...filters, fornecedor: value })}>
                  <SelectTrigger id="fornecedor">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {fornecedoresList.map(f => (
                      <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="statusPagamento">Status Pagamento</Label>
                <Select value={filters.statusPagamento} onValueChange={(value) => setFilters({ ...filters, statusPagamento: value })}>
                  <SelectTrigger id="statusPagamento">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Aguardando Conferência">Aguardando</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="statusConferencia">Status Conferência</Label>
                <Select value={filters.statusConferencia} onValueChange={(value) => setFilters({ ...filters, statusConferencia: value })}>
                  <SelectTrigger id="statusConferencia">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Em Conferência">Em Conferência</SelectItem>
                    <SelectItem value="Conferência Completa">Completa</SelectItem>
                    <SelectItem value="Discrepância Detectada">Discrepância</SelectItem>
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
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={handleLimpar}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Pendências */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Pendências Financeiras</CardTitle>
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
                    <TableHead>Nº Nota</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Conferido</TableHead>
                    <TableHead>% Conf.</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Conferência</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendenciasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma pendência encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendenciasFiltradas.map(pendencia => (
                      <TableRow key={pendencia.id} className={getRowClass(pendencia)}>
                        <TableCell className="font-mono text-xs">{pendencia.notaId}</TableCell>
                        <TableCell>{pendencia.fornecedor}</TableCell>
                        <TableCell>{formatCurrency(pendencia.valorTotal)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pendencia.percentualConferencia} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(pendencia.valorConferido)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            pendencia.percentualConferencia === 100 
                              ? 'bg-green-500/10 text-green-600' 
                              : pendencia.percentualConferencia >= 50 
                                ? 'bg-blue-500/10 text-blue-600'
                                : 'bg-yellow-500/10 text-yellow-600'
                          }>
                            {pendencia.percentualConferencia}%
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusPagamentoBadge(pendencia.statusPagamento)}</TableCell>
                        <TableCell>{getStatusConferenciaBadge(pendencia.statusConferencia)}</TableCell>
                        <TableCell>{getSLABadge(pendencia)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleVerDetalhes(pendencia)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {pendencia.statusPagamento !== 'Pago' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleAbrirPagamento(pendencia)}
                              >
                                <CreditCard className="h-4 w-4" />
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
          </CardContent>
        </Card>

        {/* Modal de Detalhes */}
        <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalhes - Nota {pendenciaSelecionada?.notaId}
              </DialogTitle>
            </DialogHeader>
            
            {pendenciaSelecionada && (
              <div className="space-y-6">
                {/* Informações Gerais */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Fornecedor</p>
                    <p className="font-medium">{pendenciaSelecionada.fornecedor}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Data Entrada</p>
                    <p className="font-medium">{new Date(pendenciaSelecionada.dataCriacao).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Dias Decorridos</p>
                    <p className="font-medium">{pendenciaSelecionada.diasDecorridos} dias</p>
                  </div>
                </div>

                {/* Valores */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-3">Valores</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">{formatCurrency(pendenciaSelecionada.valorTotal)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Conferido:</span>
                      <span className="font-medium">{formatCurrency(pendenciaSelecionada.valorConferido)} ({pendenciaSelecionada.percentualConferencia}%)</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Pendente:</span>
                      <span className="font-medium">{formatCurrency(pendenciaSelecionada.valorPendente)}</span>
                    </div>
                    <Progress value={pendenciaSelecionada.percentualConferencia} className="h-3 mt-2" />
                  </div>
                </div>

                {/* Aparelhos */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-3">
                    Aparelhos ({pendenciaSelecionada.aparelhosConferidos}/{pendenciaSelecionada.aparelhosTotal} conferidos)
                  </h4>
                  <Progress 
                    value={(pendenciaSelecionada.aparelhosConferidos / pendenciaSelecionada.aparelhosTotal) * 100} 
                    className="h-2" 
                  />
                </div>

                {/* Timeline */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-3">Timeline</h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {pendenciaSelecionada.timeline.map((entry, idx) => (
                      <div key={entry.id} className="flex gap-3 text-sm">
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                        <div>
                          <p className="text-muted-foreground">
                            {new Date(entry.data).toLocaleDateString('pt-BR')} {new Date(entry.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="font-medium">{entry.titulo}</p>
                          <p className="text-muted-foreground">{entry.descricao}</p>
                          {entry.responsavel && (
                            <p className="text-xs text-muted-foreground">Por: {entry.responsavel}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogDetalhes(false)}>
                Fechar
              </Button>
              {pendenciaSelecionada?.statusPagamento !== 'Pago' && (
                <Button onClick={() => handleAbrirPagamento(pendenciaSelecionada!)}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Finalizar Pagamento
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Pagamento */}
        <Dialog open={dialogPagamento} onOpenChange={setDialogPagamento}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Finalizar Pagamento - {pendenciaSelecionada?.notaId}
              </DialogTitle>
            </DialogHeader>
            
            {pendenciaSelecionada && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-xl font-bold">{formatCurrency(pendenciaSelecionada.valorTotal)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Status Conferência: {pendenciaSelecionada.percentualConferencia}% conferido
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Conta de Pagamento *</Label>
                    <Select 
                      value={pagamentoForm.contaPagamento} 
                      onValueChange={(v) => setPagamentoForm(prev => ({ ...prev, contaPagamento: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {contasFinanceiras.map(conta => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {conta.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Forma de Pagamento *</Label>
                    <Select 
                      value={pagamentoForm.formaPagamento} 
                      onValueChange={(v) => setPagamentoForm(prev => ({ ...prev, formaPagamento: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
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

                  {mostrarCampoParcelas && (
                    <div>
                      <Label>Parcelas</Label>
                      <Select 
                        value={pagamentoForm.parcelas} 
                        onValueChange={(v) => setPagamentoForm(prev => ({ ...prev, parcelas: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                            <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Data de Vencimento</Label>
                    <Input
                      type="date"
                      value={pagamentoForm.dataVencimento}
                      onChange={(e) => setPagamentoForm(prev => ({ ...prev, dataVencimento: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Responsável Financeiro *</Label>
                    <Select 
                      value={pagamentoForm.responsavel} 
                      onValueChange={(v) => setPagamentoForm(prev => ({ ...prev, responsavel: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradoresFinanceiros.map(colab => (
                          <SelectItem key={colab.id} value={colab.nome}>
                            {colab.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <FileUploadComprovante
                    label="Comprovante"
                    value={pagamentoForm.comprovante}
                    fileName={pagamentoForm.comprovanteNome}
                    onFileChange={(data) => setPagamentoForm(prev => ({
                      ...prev,
                      comprovante: data.comprovante,
                      comprovanteNome: data.comprovanteNome,
                      comprovantePreview: data.comprovantePreview
                    }))}
                  />

                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={pagamentoForm.observacoes}
                      onChange={(e) => setPagamentoForm(prev => ({ ...prev, observacoes: e.target.value }))}
                      placeholder="Observações adicionais..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogPagamento(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleFinalizarPagamento}
                disabled={!pagamentoForm.contaPagamento || !pagamentoForm.formaPagamento || !pagamentoForm.responsavel}
              >
                Confirmar Pagamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FinanceiroLayout>
  );
}
