import { useState, useMemo, useEffect, useCallback } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  getNotasParaFinanceiro, 
  registrarPagamento,
  rejeitarNota,
  NotaEntrada,
  podeEditarNota
} from '@/utils/notaEntradaFluxoApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/formatUtils';
import { TabelaNotasPendencias } from '@/components/estoque/TabelaNotasPendencias';
import { ModalFinalizarPagamento, DadosPagamento, PendenciaPagamentoData } from '@/components/estoque/ModalFinalizarPagamento';
import { NotaDetalhesContent } from '@/components/estoque/NotaDetalhesContent';
import { 
  Download, 
  Filter, 
  X, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  DollarSign,
  Landmark,
  Archive,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

export default function FinanceiroNotasPendencias() {
  const [notas, setNotas] = useState<NotaEntrada[]>(getNotasParaFinanceiro());
  const [notaSelecionada, setNotaSelecionada] = useState<NotaEntrada | null>(null);
  
  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [modoDetalhes, setModoDetalhes] = useState(false);
  
  // Rejeição
  const [dialogRejeicao, setDialogRejeicao] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [observacaoRejeicao, setObservacaoRejeicao] = useState('');
  
  const fornecedoresList = getFornecedores();

  // Auto-refresh ao ganhar foco da janela
  const refreshData = useCallback(() => {
    setNotas(getNotasParaFinanceiro());
  }, []);

  useEffect(() => {
    const handleFocus = () => refreshData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshData]);
  
  // Filtros
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    fornecedor: 'todos',
    tipoPagamento: 'todos',
    atuacaoAtual: 'todos',
    palavraChave: ''
  });

  // Filtrar notas
  const notasFiltradas = useMemo(() => {
    let filtered = notas.filter(n => {
      if (filters.dataInicio && n.data < filters.dataInicio) return false;
      if (filters.dataFim && n.data > filters.dataFim) return false;
      if (filters.fornecedor !== 'todos' && n.fornecedor !== filters.fornecedor) return false;
      if (filters.tipoPagamento !== 'todos' && n.tipoPagamento !== filters.tipoPagamento) return false;
      if (filters.atuacaoAtual !== 'todos' && n.atuacaoAtual !== filters.atuacaoAtual) return false;
      if (filters.palavraChave && 
          !n.numeroNota.toLowerCase().includes(filters.palavraChave.toLowerCase()) &&
          !n.fornecedor.toLowerCase().includes(filters.palavraChave.toLowerCase())) return false;
      return true;
    });

    // Ordenar: registros mais recentes primeiro (por dataCriacao)
    return filtered.sort((a, b) => {
      return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
    });
  }, [notas, filters]);

  const calcularDiasDecorridos = (data: string): number => {
    const dataInicio = new Date(data);
    const hoje = new Date();
    return Math.ceil((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Cards de resumo
  const resumo = useMemo(() => {
    const total = notasFiltradas.length;
    const aguardandoFinanceiro = notasFiltradas.filter(n => n.atuacaoAtual === 'Financeiro').length;
    const finalizadas = notasFiltradas.filter(n => n.status === 'Finalizada' || n.atuacaoAtual === 'Encerrado').length;
    const valorPendente = notasFiltradas.filter(n => n.atuacaoAtual !== 'Encerrado').reduce((acc, n) => acc + n.valorPendente, 0);
    const valorConferido = notasFiltradas.reduce((acc, n) => acc + n.valorConferido, 0);
    const alertasSLA = notasFiltradas.filter(n => {
      const dias = calcularDiasDecorridos(n.data);
      return dias >= 5 && n.atuacaoAtual !== 'Encerrado';
    }).length;
    
    return { total, aguardandoFinanceiro, finalizadas, valorPendente, valorConferido, alertasSLA };
  }, [notasFiltradas]);

  const handleVerDetalhes = (nota: NotaEntrada) => {
    setNotaSelecionada(nota);
    setModoDetalhes(true);
  };

  const handleAbrirPagamento = (nota: NotaEntrada) => {
    setNotaSelecionada(nota);
    setDialogPagamento(true);
  };

  const handleAbrirRejeicao = (nota: NotaEntrada) => {
    setNotaSelecionada(nota);
    setMotivoRejeicao('');
    setObservacaoRejeicao('');
    setDialogRejeicao(true);
  };

  const handleConfirmarRejeicao = () => {
    if (!notaSelecionada) return;
    if (!motivoRejeicao) {
      toast.error('Selecione o motivo da recusa');
      return;
    }
    if (!observacaoRejeicao.trim()) {
      toast.error('Informe a observação da recusa');
      return;
    }
    
    const resultado = rejeitarNota(notaSelecionada.id, motivoRejeicao, observacaoRejeicao, 'Usuário Financeiro');
    if (resultado) {
      toast.success(`Nota ${notaSelecionada.numeroNota} rejeitada e devolvida ao Estoque`);
      setNotas(getNotasParaFinanceiro());
      setDialogRejeicao(false);
    } else {
      toast.error('Erro ao rejeitar nota. Verifique se a atuação está no Financeiro.');
    }
  };

  const handleFinalizarPagamento = (dados: DadosPagamento) => {
    if (!notaSelecionada) return;
    
    // Usar valor editado pelo usuário (para parcial) ou o valor pendente total
    const valorPagar = dados.valorPagamento ?? notaSelecionada.valorPendente;
    
    // Determinar tipo do pagamento
    let tipoPag: 'inicial' | 'parcial' | 'final' = 'inicial';
    if (notaSelecionada.valorPago > 0) {
      // Tolerância de R$ 0,01
      const saldoAposPagamento = notaSelecionada.valorPendente - valorPagar;
      tipoPag = Math.abs(saldoAposPagamento) <= 0.01 ? 'final' : 'parcial';
    }
    
    const resultado = registrarPagamento(notaSelecionada.id, {
      valor: valorPagar,
      formaPagamento: dados.formaPagamento,
      contaPagamento: dados.contaPagamento,
      comprovante: dados.comprovante,
      responsavel: dados.responsavel || 'Usuário Financeiro',
      tipo: tipoPag
    });

    if (resultado) {
      toast.success(`Pagamento de ${formatCurrency(valorPagar)} da nota ${notaSelecionada.id} confirmado!`);
      setNotas(getNotasParaFinanceiro());
      setDialogPagamento(false);
      
    } else {
      toast.error('Erro ao processar pagamento. Verifique se a nota está no status correto.');
    }
  };

  const handleExport = () => {
    const dataToExport = notasFiltradas.map(n => ({
      'Nº Nota': n.numeroNota,
      Fornecedor: n.fornecedor,
      'Tipo Pagamento': n.tipoPagamento,
      'Atuação Atual': n.atuacaoAtual,
      Status: n.status,
      'Qtd Informada': n.qtdInformada,
      'Qtd Cadastrada': n.qtdCadastrada,
      'Qtd Conferida': n.qtdConferida,
      'Valor Total': formatCurrency(n.valorTotal),
      'Valor Pago': formatCurrency(n.valorPago),
      'Valor Pendente': formatCurrency(n.valorPendente),
      'Dias Decorridos': calcularDiasDecorridos(n.data)
    }));
    
    const csvContent = Object.keys(dataToExport[0] || {}).join(';') + '\n' +
      dataToExport.map(row => Object.values(row).join(';')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `notas-pendencias-financeiro-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      fornecedor: 'todos',
      tipoPagamento: 'todos',
      atuacaoAtual: 'todos',
      palavraChave: ''
    });
  };

  const handleRefresh = () => {
    setNotas(getNotasParaFinanceiro());
    toast.success('Dados atualizados!');
  };


  const notaParaModalPagamento: PendenciaPagamentoData | null = notaSelecionada ? {
    id: notaSelecionada.id,
    notaId: notaSelecionada.id,
    valorTotal: notaSelecionada.valorTotal,
    valorPendente: notaSelecionada.valorPendente,
    percentualConferencia: notaSelecionada.qtdCadastrada > 0 
      ? Math.round((notaSelecionada.qtdConferida / notaSelecionada.qtdCadastrada) * 100) 
      : 0,
    qtdInformada: notaSelecionada.qtdInformada,
    qtdConferida: notaSelecionada.qtdConferida,
    tipoPagamento: notaSelecionada.tipoPagamento,
    valorPago: notaSelecionada.valorPago
  } : null;

  return (
    <FinanceiroLayout title={modoDetalhes && notaSelecionada ? `Detalhes da Nota ${notaSelecionada.numeroNota}` : "Notas - Pendências"}>
      {modoDetalhes && notaSelecionada ? (
        <div className="space-y-6">
          <div className="flex justify-start">
            <Button variant="ghost" onClick={() => setModoDetalhes(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Notas Pendências
            </Button>
          </div>
          <NotaDetalhesContent nota={notaSelecionada} showActions={false} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Notas</p>
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
                    <p className="text-2xl font-bold text-primary">{resumo.aguardandoFinanceiro}</p>
                  </div>
                  <Landmark className="h-10 w-10 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Finalizadas</p>
                    <p className="text-2xl font-bold text-primary">{resumo.finalizadas}</p>
                  </div>
                  <Archive className="h-10 w-10 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Pendente</p>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(resumo.valorPendente)}</p>
                  </div>
                  <DollarSign className="h-10 w-10 text-destructive opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Conferido</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(resumo.valorConferido)}</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Alertas SLA</p>
                    <p className="text-2xl font-bold text-destructive">{resumo.alertasSLA}</p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-destructive opacity-50" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                      <SelectItem value="Pagamento 100% Antecipado">100% Antecipado</SelectItem>
                      <SelectItem value="Pagamento Parcial">Parcial</SelectItem>
                      <SelectItem value="Pagamento Pos">Pós</SelectItem>
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
                      <SelectItem value="Encerrado">Encerrado (Histórico)</SelectItem>
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

          {/* Tabela de Notas */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Notas Pendentes</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleRefresh} variant="outline">
                    Atualizar
                  </Button>
                  <Button onClick={handleExport} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TabelaNotasPendencias 
                notas={notasFiltradas}
                modulo="Financeiro"
                onVerDetalhes={handleVerDetalhes}
                onPagar={handleAbrirPagamento}
                onRejeitar={handleAbrirRejeicao}
              />
            </CardContent>
          </Card>
        </div>
      )}
      <ModalFinalizarPagamento
        pendencia={notaParaModalPagamento}
        open={dialogPagamento}
        onClose={() => setDialogPagamento(false)}
        onConfirm={handleFinalizarPagamento}
      />

      {/* Modal de Rejeição */}
      <Dialog open={dialogRejeicao} onOpenChange={setDialogRejeicao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Nota {notaSelecionada?.numeroNota}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Motivo da Recusa *</Label>
              <Select value={motivoRejeicao} onValueChange={setMotivoRejeicao}>
                <SelectTrigger className={!motivoRejeicao ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o motivo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dados incorretos">Dados incorretos</SelectItem>
                  <SelectItem value="Valor divergente">Valor divergente</SelectItem>
                  <SelectItem value="Fornecedor inválido">Fornecedor inválido</SelectItem>
                  <SelectItem value="Documentação insuficiente">Documentação insuficiente</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observação *</Label>
              <Textarea
                value={observacaoRejeicao}
                onChange={e => setObservacaoRejeicao(e.target.value)}
                placeholder="Descreva o motivo da recusa..."
                className={!observacaoRejeicao.trim() ? 'border-destructive' : ''}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRejeicao(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmarRejeicao}>Confirmar Recusa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
