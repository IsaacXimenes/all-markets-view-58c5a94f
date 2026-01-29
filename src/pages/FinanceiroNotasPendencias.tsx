import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  getNotasParaFinanceiro, 
  converterNotaParaPendencia,
  registrarPagamento,
  PendenciaFinanceiraConvertida
} from '@/utils/notaEntradaFluxoApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/formatUtils';
import { ModalDetalhePendencia, PendenciaModalData } from '@/components/estoque/ModalDetalhePendencia';
import { ModalFinalizarPagamento, DadosPagamento, PendenciaPagamentoData } from '@/components/estoque/ModalFinalizarPagamento';
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
  DollarSign,
  Warehouse,
  Landmark,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

export default function FinanceiroNotasPendencias() {
  // Consumir novo sistema de notas
  const carregarPendencias = () => {
    const notas = getNotasParaFinanceiro();
    return notas.map(converterNotaParaPendencia);
  };

  const [pendencias, setPendencias] = useState<PendenciaFinanceiraConvertida[]>(carregarPendencias());
  const [pendenciaSelecionada, setPendenciaSelecionada] = useState<PendenciaFinanceiraConvertida | null>(null);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogPagamento, setDialogPagamento] = useState(false);
  
  const fornecedoresList = getFornecedores();
  
  // Filtros
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    fornecedor: 'todos',
    statusPagamento: 'todos',
    tipoPagamento: 'todos',
    atuacaoAtual: 'todos',
    palavraChave: ''
  });

  // Filtrar pendências
  const pendenciasFiltradas = useMemo(() => {
    let filtered = pendencias.filter(p => {
      if (filters.dataInicio && p.dataCriacao < filters.dataInicio) return false;
      if (filters.dataFim && p.dataCriacao > filters.dataFim) return false;
      if (filters.fornecedor !== 'todos' && p.fornecedor !== filters.fornecedor) return false;
      if (filters.statusPagamento !== 'todos' && p.statusPagamento !== filters.statusPagamento) return false;
      if (filters.tipoPagamento !== 'todos' && p.tipoPagamento !== filters.tipoPagamento) return false;
      if (filters.atuacaoAtual !== 'todos' && p.atuacaoAtual !== filters.atuacaoAtual) return false;
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
    const aguardandoFinanceiro = pendenciasFiltradas.filter(p => p.atuacaoAtual === 'Financeiro').length;
    
    return { total, valorPendente, valorConferido, alertasSLA, aguardandoFinanceiro };
  }, [pendenciasFiltradas]);

  const getSLABadge = (pendencia: PendenciaFinanceiraConvertida) => {
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

  const getTipoPagamentoBadge = (tipo: string) => {
    switch (tipo) {
      case 'Pagamento 100% Antecipado':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">100% Antec.</Badge>;
      case 'Pagamento Parcial':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Parcial</Badge>;
      case 'Pagamento Pos':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Pós</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const getAtuacaoAtualBadge = (atuacao: string) => {
    switch (atuacao) {
      case 'Financeiro':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <Landmark className="h-3 w-3 mr-1" />
            Financeiro
          </Badge>
        );
      case 'Estoque':
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">
            <Warehouse className="h-3 w-3 mr-1" />
            Estoque
          </Badge>
        );
      case 'Encerrado':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Encerrado
          </Badge>
        );
      default:
        return <Badge variant="outline">{atuacao}</Badge>;
    }
  };

  const getRowClass = (pendencia: PendenciaFinanceiraConvertida) => {
    if (pendencia.statusPagamento === 'Pago') return 'bg-green-500/10';
    if (pendencia.slaStatus === 'critico') return 'bg-red-500/10';
    if (pendencia.slaStatus === 'aviso') return 'bg-yellow-500/10';
    if (pendencia.atuacaoAtual === 'Financeiro') return 'bg-blue-500/10';
    return '';
  };

  const handleVerDetalhes = (pendencia: PendenciaFinanceiraConvertida) => {
    setPendenciaSelecionada(pendencia);
    setDialogDetalhes(true);
  };

  const handleAbrirPagamento = (pendencia: PendenciaFinanceiraConvertida) => {
    setPendenciaSelecionada(pendencia);
    setDialogPagamento(true);
  };

  const handleFinalizarPagamento = (dados: DadosPagamento) => {
    if (!pendenciaSelecionada) return;
    
    // Usar novo sistema de pagamento
    const resultado = registrarPagamento(pendenciaSelecionada.notaId, {
      valor: pendenciaSelecionada.valorPendente,
      formaPagamento: dados.formaPagamento,
      contaPagamento: dados.contaPagamento,
      comprovante: dados.comprovante,
      responsavel: dados.responsavel || 'Usuário Financeiro',
      tipo: pendenciaSelecionada.valorPago > 0 ? 'final' : 'inicial'
    });

    if (resultado) {
      toast.success(`Pagamento da nota ${pendenciaSelecionada.notaId} confirmado!`);
      // Recarregar dados do novo sistema
      setPendencias(carregarPendencias());
      setDialogPagamento(false);
      setDialogDetalhes(false);
    } else {
      toast.error('Erro ao processar pagamento. Verifique se a nota está no status correto.');
    }
  };

  const handleExport = () => {
    const dataToExport = pendenciasFiltradas.map(p => ({
      'Nº Nota': p.notaId,
      Fornecedor: p.fornecedor,
      'Tipo Pagamento': p.tipoPagamento,
      'Atuação Atual': p.atuacaoAtual,
      'Valor Total': formatCurrency(p.valorTotal),
      'Valor Pago': formatCurrency(p.valorPago),
      'Valor Pendente': formatCurrency(p.valorPendente),
      'Qtd Informada': p.qtdInformada,
      'Qtd Cadastrada': p.qtdCadastrada,
      'Qtd Conferida': p.qtdConferida,
      '% Conferência': `${p.percentualConferencia}%`,
      'Status Pagamento': p.statusPagamento,
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
      tipoPagamento: 'todos',
      atuacaoAtual: 'todos',
      palavraChave: ''
    });
  };

  // Converter para formato compatível com modal existente
  const pendenciaParaModalDetalhes: PendenciaModalData | null = pendenciaSelecionada ? {
    id: pendenciaSelecionada.id,
    notaId: pendenciaSelecionada.notaId,
    fornecedor: pendenciaSelecionada.fornecedor,
    valorTotal: pendenciaSelecionada.valorTotal,
    valorConferido: pendenciaSelecionada.valorConferido,
    valorPendente: pendenciaSelecionada.valorPendente,
    percentualConferencia: pendenciaSelecionada.percentualConferencia,
    statusPagamento: pendenciaSelecionada.statusPagamento,
    statusConferencia: pendenciaSelecionada.statusConferencia,
    dataCriacao: pendenciaSelecionada.dataCriacao,
    diasDecorridos: pendenciaSelecionada.diasDecorridos,
    slaStatus: pendenciaSelecionada.slaStatus,
    slaAlerta: pendenciaSelecionada.slaAlerta,
    aparelhosTotal: pendenciaSelecionada.qtdInformada,
    aparelhosConferidos: pendenciaSelecionada.qtdConferida,
    timeline: pendenciaSelecionada.timeline.map(t => ({
      id: t.id,
      dataHora: t.dataHora,
      acao: t.acao,
      usuario: t.usuario,
      detalhes: t.detalhes
    })),
    produtos: []
  } : null;

  const pendenciaParaModalPagamento: PendenciaPagamentoData | null = pendenciaSelecionada ? {
    id: pendenciaSelecionada.id,
    notaId: pendenciaSelecionada.notaId,
    valorTotal: pendenciaSelecionada.valorTotal,
    valorPendente: pendenciaSelecionada.valorPendente,
    percentualConferencia: pendenciaSelecionada.percentualConferencia,
    qtdInformada: pendenciaSelecionada.qtdInformada,
    qtdConferida: pendenciaSelecionada.qtdConferida
  } : null;

  return (
    <FinanceiroLayout title="Notas - Pendências">
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <p className="text-sm text-muted-foreground">Aguardando Financeiro</p>
                  <p className="text-2xl font-bold text-blue-600">{resumo.aguardandoFinanceiro}</p>
                </div>
                <Landmark className="h-10 w-10 text-blue-500 opacity-50" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
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
                <Label htmlFor="tipoPagamento">Tipo Pagamento</Label>
                <Select value={filters.tipoPagamento} onValueChange={(value) => setFilters({ ...filters, tipoPagamento: value })}>
                  <SelectTrigger id="tipoPagamento">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Pagamento Pos">Pós-Conferência</SelectItem>
                    <SelectItem value="Pagamento Parcial">Parcial</SelectItem>
                    <SelectItem value="Pagamento 100% Antecipado">100% Antecipado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="atuacaoAtual">Atuação Atual</Label>
                <Select value={filters.atuacaoAtual} onValueChange={(value) => setFilters({ ...filters, atuacaoAtual: value })}>
                  <SelectTrigger id="atuacaoAtual">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Estoque">Estoque</SelectItem>
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
                    <SelectItem value="Aguardando">Aguardando</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
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
                    <TableHead>Tipo Pag.</TableHead>
                    <TableHead>Atuação</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>% Conf.</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendenciasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Nenhuma pendência encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendenciasFiltradas.map(pendencia => (
                      <TableRow key={pendencia.id} className={getRowClass(pendencia)}>
                        <TableCell className="font-mono text-xs">{pendencia.notaId}</TableCell>
                        <TableCell>{pendencia.fornecedor}</TableCell>
                        <TableCell>{getTipoPagamentoBadge(pendencia.tipoPagamento)}</TableCell>
                        <TableCell>{getAtuacaoAtualBadge(pendencia.atuacaoAtual)}</TableCell>
                        <TableCell>{formatCurrency(pendencia.valorTotal)}</TableCell>
                        <TableCell>{formatCurrency(pendencia.valorPago)}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {pendencia.qtdCadastrada}/{pendencia.qtdInformada}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pendencia.percentualConferencia} className="w-12 h-2" />
                            <Badge variant="outline" className={
                              pendencia.percentualConferencia === 100 
                                ? 'bg-green-500/10 text-green-600' 
                                : pendencia.percentualConferencia >= 50 
                                  ? 'bg-blue-500/10 text-blue-600'
                                  : 'bg-yellow-500/10 text-yellow-600'
                            }>
                              {pendencia.percentualConferencia}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusPagamentoBadge(pendencia.statusPagamento)}</TableCell>
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
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className={pendencia.podeEditar 
                                          ? "text-green-600 hover:text-green-700" 
                                          : "text-gray-400 cursor-not-allowed"
                                        }
                                        onClick={() => pendencia.podeEditar && handleAbrirPagamento(pendencia)}
                                        disabled={!pendencia.podeEditar}
                                      >
                                        {pendencia.podeEditar ? (
                                          <CreditCard className="h-4 w-4" />
                                        ) : (
                                          <Lock className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {!pendencia.podeEditar && (
                                    <TooltipContent>
                                      <p>Atuação atual: {pendencia.atuacaoAtual}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {pendencia.atuacaoAtual === 'Estoque' 
                                          ? 'Aguardando cadastro/conferência do Estoque'
                                          : 'Nota encerrada'
                                        }
                                      </p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
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

        {/* Modal de Detalhes - Usando componente reutilizável */}
        <ModalDetalhePendencia
          pendencia={pendenciaParaModalDetalhes}
          open={dialogDetalhes}
          onClose={() => setDialogDetalhes(false)}
          showPaymentButton={pendenciaSelecionada?.podeEditar && pendenciaSelecionada?.statusPagamento !== 'Pago'}
          onPayment={() => {
            setDialogDetalhes(false);
            setDialogPagamento(true);
          }}
        />

        {/* Modal de Pagamento - Usando componente reutilizável */}
        <ModalFinalizarPagamento
          pendencia={pendenciaParaModalPagamento}
          open={dialogPagamento}
          onClose={() => setDialogPagamento(false)}
          onConfirm={handleFinalizarPagamento}
        />
      </div>
    </FinanceiroLayout>
  );
}
