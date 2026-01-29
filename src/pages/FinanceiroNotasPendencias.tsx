import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getNotasParaFinanceiro, 
  registrarPagamento,
  NotaEntrada,
  podeEditarNota
} from '@/utils/notaEntradaFluxoApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/formatUtils';
import { TabelaNotasPendencias } from '@/components/estoque/TabelaNotasPendencias';
import { ModalDetalhePendencia, PendenciaModalData } from '@/components/estoque/ModalDetalhePendencia';
import { ModalFinalizarPagamento, DadosPagamento, PendenciaPagamentoData } from '@/components/estoque/ModalFinalizarPagamento';
import { 
  Download, 
  Filter, 
  X, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  DollarSign,
  Landmark
} from 'lucide-react';
import { toast } from 'sonner';

export default function FinanceiroNotasPendencias() {
  const navigate = useNavigate();
  
  // Consumir novo sistema de notas diretamente
  const [notas, setNotas] = useState<NotaEntrada[]>(getNotasParaFinanceiro());
  const [notaSelecionada, setNotaSelecionada] = useState<NotaEntrada | null>(null);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogPagamento, setDialogPagamento] = useState(false);
  
  const fornecedoresList = getFornecedores();
  
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
    const valorPendente = notasFiltradas.reduce((acc, n) => acc + n.valorPendente, 0);
    const valorConferido = notasFiltradas.reduce((acc, n) => acc + n.valorConferido, 0);
    const alertasSLA = notasFiltradas.filter(n => {
      const dias = calcularDiasDecorridos(n.data);
      return dias >= 5 && n.atuacaoAtual !== 'Encerrado';
    }).length;
    
    return { total, aguardandoFinanceiro, valorPendente, valorConferido, alertasSLA };
  }, [notasFiltradas]);

  const handleVerDetalhes = (nota: NotaEntrada) => {
    setNotaSelecionada(nota);
    setDialogDetalhes(true);
  };

  const handleAbrirPagamento = (nota: NotaEntrada) => {
    setNotaSelecionada(nota);
    setDialogPagamento(true);
  };

  const handleFinalizarPagamento = (dados: DadosPagamento) => {
    if (!notaSelecionada) return;
    
    // Usar novo sistema de pagamento
    const resultado = registrarPagamento(notaSelecionada.id, {
      valor: notaSelecionada.valorPendente,
      formaPagamento: dados.formaPagamento,
      contaPagamento: dados.contaPagamento,
      comprovante: dados.comprovante,
      responsavel: dados.responsavel || 'Usuário Financeiro',
      tipo: notaSelecionada.valorPago > 0 ? 'final' : 'inicial'
    });

    if (resultado) {
      toast.success(`Pagamento da nota ${notaSelecionada.id} confirmado!`);
      // Recarregar dados
      setNotas(getNotasParaFinanceiro());
      setDialogPagamento(false);
      setDialogDetalhes(false);
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

  // Converter para formato compatível com modal existente
  const notaParaModalDetalhes: PendenciaModalData | null = notaSelecionada ? {
    id: notaSelecionada.id,
    notaId: notaSelecionada.id,
    fornecedor: notaSelecionada.fornecedor,
    valorTotal: notaSelecionada.valorTotal,
    valorConferido: notaSelecionada.valorConferido,
    valorPendente: notaSelecionada.valorPendente,
    percentualConferencia: notaSelecionada.qtdInformada > 0 
      ? Math.round((notaSelecionada.qtdConferida / notaSelecionada.qtdInformada) * 100) 
      : 0,
    statusPagamento: notaSelecionada.valorPago >= notaSelecionada.valorTotal ? 'Pago' : 
                      notaSelecionada.valorPago > 0 ? 'Parcial' : 'Aguardando',
    statusConferencia: notaSelecionada.status,
    dataCriacao: notaSelecionada.dataCriacao.split('T')[0],
    diasDecorridos: calcularDiasDecorridos(notaSelecionada.data),
    slaStatus: calcularDiasDecorridos(notaSelecionada.data) >= 7 ? 'critico' :
               calcularDiasDecorridos(notaSelecionada.data) >= 5 ? 'aviso' : 'normal',
    slaAlerta: calcularDiasDecorridos(notaSelecionada.data) >= 5,
    aparelhosTotal: notaSelecionada.qtdInformada,
    aparelhosConferidos: notaSelecionada.qtdConferida,
    timeline: notaSelecionada.timeline.map(t => ({
      id: t.id,
      dataHora: t.dataHora,
      acao: t.acao,
      usuario: t.usuario,
      detalhes: t.detalhes
    })),
    produtos: []
  } : null;

  const notaParaModalPagamento: PendenciaPagamentoData | null = notaSelecionada ? {
    id: notaSelecionada.id,
    notaId: notaSelecionada.id,
    valorTotal: notaSelecionada.valorTotal,
    valorPendente: notaSelecionada.valorPendente,
    percentualConferencia: notaSelecionada.qtdInformada > 0 
      ? Math.round((notaSelecionada.qtdConferida / notaSelecionada.qtdInformada) * 100) 
      : 0,
    qtdInformada: notaSelecionada.qtdInformada,
    qtdConferida: notaSelecionada.qtdConferida
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

        {/* Tabela de Notas - Usando componente reutilizável */}
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
            />
          </CardContent>
        </Card>

        {/* Modal de Detalhes */}
        <ModalDetalhePendencia
          pendencia={notaParaModalDetalhes}
          open={dialogDetalhes}
          onClose={() => setDialogDetalhes(false)}
          showPaymentButton={notaSelecionada ? podeEditarNota(notaSelecionada, 'Financeiro') && notaSelecionada.valorPago < notaSelecionada.valorTotal : false}
          onPayment={() => {
            setDialogDetalhes(false);
            setDialogPagamento(true);
          }}
        />

        {/* Modal de Pagamento */}
        <ModalFinalizarPagamento
          pendencia={notaParaModalPagamento}
          open={dialogPagamento}
          onClose={() => setDialogPagamento(false)}
          onConfirm={handleFinalizarPagamento}
        />
      </div>
    </FinanceiroLayout>
  );
}
