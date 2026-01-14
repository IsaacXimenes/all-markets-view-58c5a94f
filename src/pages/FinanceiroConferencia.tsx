import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Check, Download, Filter, X, Eye, Clock, CheckCircle2, Undo2, AlertCircle, CreditCard, Banknote, Smartphone, Wallet, ChevronRight } from 'lucide-react';
import { getContasFinanceiras, getColaboradores, getCargos, getLojas } from '@/utils/cadastrosApi';
import { useFluxoVendas } from '@/hooks/useFluxoVendas';
import { 
  finalizarVenda, 
  devolverFinanceiro,
  getCorBadgeStatus,
  exportFluxoToCSV,
  VendaComFluxo,
  StatusVenda
} from '@/utils/fluxoVendasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { toast } from 'sonner';

// Mock do usuário logado (financeiro)
const usuarioLogado = { id: 'COL-008', nome: 'Ana Financeiro' };

// Interface para validação de pagamentos
interface ValidacaoPagamento {
  metodoPagamento: string;
  validadoGestor: boolean;
  validadoFinanceiro: boolean;
  dataValidacaoGestor?: string;
  dataValidacaoFinanceiro?: string;
}

// Interface para situação da conferência
type SituacaoConferencia = 'Conferido' | `Pendente - ${string}`;

export default function FinanceiroConferencia() {
  const navigate = useNavigate();
  const { vendas, recarregar } = useFluxoVendas({
    status: ['Conferência Financeiro', 'Finalizado']
  });
  
  const contasFinanceiras = getContasFinanceiras();
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  const lojas = getLojas();
  
  // Modais e estados
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaComFluxo | null>(null);
  const [modalDevolver, setModalDevolver] = useState(false);
  const [motivoDevolucao, setMotivoDevolucao] = useState('');
  const [validacoesPagamento, setValidacoesPagamento] = useState<ValidacaoPagamento[]>([]);
  
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    loja: 'todas',
    status: 'todos',
    contaDestino: 'todas'
  });

  // Filtrar colaboradores com permissão "Financeiro"
  const colaboradoresFinanceiros = useMemo(() => {
    const cargosComPermissaoFinanceiro = cargos
      .filter(c => c.permissoes.includes('Financeiro'))
      .map(c => c.id);
    return colaboradores.filter(col => cargosComPermissaoFinanceiro.includes(col.cargo));
  }, [colaboradores, cargos]);

  // Calcular situação de conferência de uma venda
  const getSituacaoConferencia = (venda: VendaComFluxo): SituacaoConferencia => {
    const storedValidacoes = localStorage.getItem(`validacao_pagamentos_financeiro_${venda.id}`);
    if (!storedValidacoes) {
      // Verificar validações do gestor
      const gestorValidacoes = localStorage.getItem(`validacao_pagamentos_${venda.id}`);
      if (gestorValidacoes) {
        const validacoes = JSON.parse(gestorValidacoes);
        const naoValidados = validacoes.filter((v: any) => !v.validadoGestor);
        if (naoValidados.length > 0) {
          return `Pendente - ${naoValidados[0].metodoPagamento}`;
        }
      }
      // Se não tem validações salvas, verificar pagamentos
      const metodos = venda.pagamentos?.map(p => p.meioPagamento) || [];
      if (metodos.length > 0) {
        return `Pendente - ${metodos[0]}`;
      }
      return 'Conferido';
    }
    
    const validacoes = JSON.parse(storedValidacoes);
    const naoValidados = validacoes.filter((v: ValidacaoPagamento) => !v.validadoFinanceiro);
    
    if (naoValidados.length === 0) return 'Conferido';
    return `Pendente - ${naoValidados[0].metodoPagamento}`;
  };

  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      if (filters.dataInicio && new Date(v.dataHora) < new Date(filters.dataInicio)) return false;
      if (filters.dataFim) {
        const dataFim = new Date(filters.dataFim);
        dataFim.setHours(23, 59, 59);
        if (new Date(v.dataHora) > dataFim) return false;
      }
      if (filters.loja !== 'todas' && v.lojaVenda !== filters.loja) return false;
      if (filters.status !== 'todos' && v.statusFluxo !== filters.status) return false;
      return true;
    }).sort((a, b) => {
      if (a.statusFluxo === 'Conferência Financeiro' && b.statusFluxo === 'Finalizado') return -1;
      if (a.statusFluxo === 'Finalizado' && b.statusFluxo === 'Conferência Financeiro') return 1;
      return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
    });
  }, [vendas, filters]);

  // Calcular somatórios por método de pagamento
  const somatorioPagamentos = useMemo(() => {
    const totais = {
      cartaoCredito: 0,
      cartaoDebito: 0,
      pix: 0,
      dinheiro: 0
    };

    filteredVendas.forEach(venda => {
      venda.pagamentos?.forEach(pag => {
        const meio = pag.meioPagamento.toLowerCase();
        if (meio.includes('crédito') || meio.includes('credito')) {
          totais.cartaoCredito += pag.valor;
        } else if (meio.includes('débito') || meio.includes('debito')) {
          totais.cartaoDebito += pag.valor;
        } else if (meio.includes('pix')) {
          totais.pix += pag.valor;
        } else if (meio.includes('dinheiro')) {
          totais.dinheiro += pag.valor;
        }
      });
    });

    return totais;
  }, [filteredVendas]);

  // Calcular valor pendente (vendas com checkboxes não validados)
  const valorPendente = useMemo(() => {
    return filteredVendas
      .filter(v => v.statusFluxo === 'Conferência Financeiro')
      .filter(v => getSituacaoConferencia(v) !== 'Conferido')
      .reduce((acc, v) => acc + v.total, 0);
  }, [filteredVendas]);

  const pendentes = vendas.filter(v => v.statusFluxo === 'Conferência Financeiro').length;
  const finalizados = vendas.filter(v => v.statusFluxo === 'Finalizado').length;
  const totalPendente = vendas
    .filter(v => v.statusFluxo === 'Conferência Financeiro')
    .reduce((acc, v) => acc + v.total, 0);

  const handleSelecionarVenda = (venda: VendaComFluxo) => {
    setVendaSelecionada(venda);
    
    // Carregar validações do gestor e do financeiro
    const gestorValidacoes = localStorage.getItem(`validacao_pagamentos_${venda.id}`);
    const financeiroValidacoes = localStorage.getItem(`validacao_pagamentos_financeiro_${venda.id}`);
    
    const metodos = venda.pagamentos?.map(p => p.meioPagamento) || [];
    const metodosUnicos = [...new Set(metodos)];
    
    const gestorData = gestorValidacoes ? JSON.parse(gestorValidacoes) : [];
    const financeiroData = financeiroValidacoes ? JSON.parse(financeiroValidacoes) : [];
    
    const validacoes = metodosUnicos.map(metodo => {
      const gestor = gestorData.find((v: any) => v.metodoPagamento === metodo);
      const financeiro = financeiroData.find((v: any) => v.metodoPagamento === metodo);
      return {
        metodoPagamento: metodo,
        validadoGestor: gestor?.validadoGestor || false,
        validadoFinanceiro: financeiro?.validadoFinanceiro || false,
        dataValidacaoGestor: gestor?.dataValidacao,
        dataValidacaoFinanceiro: financeiro?.dataValidacaoFinanceiro
      };
    });
    
    setValidacoesPagamento(validacoes);
  };

  const handleToggleValidacaoFinanceiro = (metodo: string) => {
    const novasValidacoes = validacoesPagamento.map(v => 
      v.metodoPagamento === metodo 
        ? { ...v, validadoFinanceiro: !v.validadoFinanceiro, dataValidacaoFinanceiro: new Date().toISOString() }
        : v
    );
    
    setValidacoesPagamento(novasValidacoes);
    
    // Salvar imediatamente no localStorage para atualização em tempo real da coluna Situação
    if (vendaSelecionada) {
      localStorage.setItem(
        `validacao_pagamentos_financeiro_${vendaSelecionada.id}`,
        JSON.stringify(novasValidacoes)
      );
    }
  };

  const handleSalvarValidacoes = () => {
    if (!vendaSelecionada) return;
    
    localStorage.setItem(
      `validacao_pagamentos_financeiro_${vendaSelecionada.id}`,
      JSON.stringify(validacoesPagamento)
    );
    
    toast.success('Validações salvas com sucesso!');
    recarregar();
  };

  const handleAbrirModalDevolver = () => {
    setMotivoDevolucao('');
    setModalDevolver(true);
  };

  const handleFinalizar = () => {
    if (!vendaSelecionada) return;

    // Salvar validações antes de finalizar
    localStorage.setItem(
      `validacao_pagamentos_financeiro_${vendaSelecionada.id}`,
      JSON.stringify(validacoesPagamento)
    );

    const resultado = finalizarVenda(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome
    );

    if (resultado) {
      toast.success(`Venda ${vendaSelecionada.id} finalizada com sucesso!`);
      setVendaSelecionada(null);
      setValidacoesPagamento([]);
      recarregar();
    } else {
      toast.error('Erro ao finalizar venda.');
    }
  };

  const handleDevolver = () => {
    if (!vendaSelecionada || !motivoDevolucao.trim()) {
      toast.error('Por favor, informe o motivo da devolução.');
      return;
    }

    const resultado = devolverFinanceiro(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome,
      motivoDevolucao.trim()
    );

    if (resultado) {
      toast.success(`Venda ${vendaSelecionada.id} devolvida para o gestor.`);
      setModalDevolver(false);
      setVendaSelecionada(null);
      setMotivoDevolucao('');
      setValidacoesPagamento([]);
      recarregar();
    } else {
      toast.error('Erro ao devolver venda.');
    }
  };

  const handleExport = () => {
    const dataAtual = new Date().toISOString().split('T')[0];
    exportFluxoToCSV(filteredVendas, `conferencia-financeiro-${dataAtual}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({ dataInicio: '', dataFim: '', loja: 'todas', status: 'todos', contaDestino: 'todas' });
  };

  const getStatusBadge = (status: StatusVenda) => {
    const cores = getCorBadgeStatus(status);
    return (
      <Badge variant="outline" className={`${cores.bg} ${cores.text} ${cores.border} whitespace-nowrap dark:bg-opacity-20`}>
        {status}
      </Badge>
    );
  };

  const getSituacaoBadge = (situacao: SituacaoConferencia) => {
    if (situacao === 'Conferido') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Conferido</Badge>;
    }
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">{situacao}</Badge>;
  };

  const getRowClassName = (venda: VendaComFluxo) => {
    const situacao = getSituacaoConferencia(venda);
    if (venda.statusFluxo === 'Finalizado') {
      return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100';
    }
    if (situacao !== 'Conferido') {
      return 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100';
    }
    return 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100';
  };

  const getLojaNome = (lojaId: string) => lojas.find(l => l.id === lojaId)?.nome || lojaId;
  const getVendedorNome = (vendedorId: string) => colaboradores.find(c => c.id === vendedorId)?.nome || vendedorId;

  return (
    <FinanceiroLayout title="Conferência de Contas - Vendas">
      <div className="flex gap-6">
        {/* Painel Principal - Tabela */}
        <div className={`flex-1 ${vendaSelecionada ? 'w-2/3' : 'w-full'} transition-all`}>
          {/* Cards de somatório por método de pagamento */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-blue-600 opacity-70" />
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Cartão Crédito</p>
                    <p className="text-lg font-bold text-blue-800 dark:text-blue-200">{formatCurrency(somatorioPagamentos.cartaoCredito)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-green-600 opacity-70" />
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-300">Cartão Débito</p>
                    <p className="text-lg font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.cartaoDebito)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/50 dark:to-teal-900/30 border-teal-200 dark:border-teal-800">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-6 w-6 text-teal-600 opacity-70" />
                  <div>
                    <p className="text-xs text-teal-700 dark:text-teal-300">Pix</p>
                    <p className="text-lg font-bold text-teal-800 dark:text-teal-200">{formatCurrency(somatorioPagamentos.pix)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Banknote className="h-6 w-6 text-amber-600 opacity-70" />
                  <div>
                    <p className="text-xs text-amber-700 dark:text-amber-300">Dinheiro</p>
                    <p className="text-lg font-bold text-amber-800 dark:text-amber-200">{formatCurrency(somatorioPagamentos.dinheiro)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Valor Pendente */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-red-600 opacity-70" />
                  <div>
                    <p className="text-xs text-red-700 dark:text-red-300">Valor Pendente</p>
                    <p className="text-lg font-bold text-red-800 dark:text-red-200">{formatCurrency(valorPendente)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                    <p className="text-sm text-muted-foreground">Finalizados</p>
                    <p className="text-3xl font-bold text-green-600">{finalizados}</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pendente</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPendente)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filtros</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div><Label>Data Início</Label><Input type="date" value={filters.dataInicio} onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })} /></div>
                <div><Label>Data Fim</Label><Input type="date" value={filters.dataFim} onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })} /></div>
                <div><Label>Loja</Label><Select value={filters.loja} onValueChange={(value) => setFilters({ ...filters, loja: value })}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Status</Label><Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="Conferência Financeiro">Conferência Financeiro</SelectItem><SelectItem value="Finalizado">Finalizado</SelectItem></SelectContent></Select></div>
                <div className="flex items-end gap-2"><Button variant="outline" onClick={handleLimpar}><X className="h-4 w-4 mr-1" />Limpar</Button><Button onClick={handleExport} variant="secondary"><Download className="h-4 w-4 mr-1" />CSV</Button></div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela com coluna Situação */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Venda</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada</TableCell></TableRow>
                  ) : filteredVendas.map(venda => (
                    <TableRow 
                      key={venda.id} 
                      className={`${getRowClassName(venda)} ${vendaSelecionada?.id === venda.id ? 'ring-2 ring-primary' : ''} cursor-pointer`}
                      onClick={() => handleSelecionarVenda(venda)}
                    >
                      <TableCell className="font-medium">{venda.id}</TableCell>
                      <TableCell>{new Date(venda.dataHora).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{getLojaNome(venda.lojaVenda)}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{venda.clienteNome}</TableCell>
                      <TableCell>{getVendedorNome(venda.vendedor)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(venda.total)}</TableCell>
                      <TableCell>{getSituacaoBadge(getSituacaoConferencia(venda))}</TableCell>
                      <TableCell>{getStatusBadge(venda.statusFluxo as StatusVenda)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSelecionarVenda(venda); }}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Detalhes - Lateral */}
        {vendaSelecionada && (
          <div className="w-[400px] sticky top-4 h-fit">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Detalhes da Venda</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => { setVendaSelecionada(null); setValidacoesPagamento([]); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info da venda */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">ID</p>
                    <p className="font-medium">{vendaSelecionada.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cliente</p>
                    <p className="font-medium truncate">{vendaSelecionada.clienteNome}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Valor Total</p>
                    <p className="font-medium text-lg">{formatCurrency(vendaSelecionada.total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Lucro</p>
                    <p className={`font-medium ${vendaSelecionada.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(vendaSelecionada.lucro)}
                    </p>
                  </div>
                </div>

                {/* Itens da venda */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Itens da Venda</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {vendaSelecionada.itens?.map((item, idx) => (
                      <div key={idx} className="text-xs p-2 bg-muted/50 rounded flex justify-between">
                        <span className="truncate flex-1">{item.produto}</span>
                        <span className="font-medium ml-2">{formatCurrency(item.valorVenda)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumo de pagamento */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Resumo de Pagamento</h4>
                  <div className="space-y-1">
                    {vendaSelecionada.pagamentos?.map((pag, idx) => (
                      <div key={idx} className="text-xs p-2 bg-muted/50 rounded flex justify-between">
                        <span>{pag.meioPagamento}</span>
                        <span className="font-medium">{formatCurrency(pag.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validação de Pagamentos */}
                {validacoesPagamento.length > 0 && vendaSelecionada.statusFluxo === 'Conferência Financeiro' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 text-sm mb-2">
                      Validação de Métodos de Pagamento
                    </h4>
                    <div className="space-y-2">
                      {validacoesPagamento.map((validacao, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Checkbox
                            id={`fin-pagamento-${idx}`}
                            checked={validacao.validadoFinanceiro}
                            onCheckedChange={() => handleToggleValidacaoFinanceiro(validacao.metodoPagamento)}
                          />
                          <Label 
                            htmlFor={`fin-pagamento-${idx}`}
                            className="flex-1 cursor-pointer font-normal text-sm"
                          >
                            {validacao.metodoPagamento}
                          </Label>
                          {validacao.validadoGestor && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                              Gestor ✓
                            </Badge>
                          )}
                          {validacao.validadoFinanceiro && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                    <Button 
                      onClick={handleSalvarValidacoes} 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-3"
                    >
                      Salvar Validações
                    </Button>
                  </div>
                )}

                {/* Ações */}
                {vendaSelecionada.statusFluxo === 'Conferência Financeiro' && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleAbrirModalDevolver}
                    >
                      <Undo2 className="h-4 w-4 mr-1" />
                      Devolver
                    </Button>
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleFinalizar}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Finalizar
                    </Button>
                  </div>
                )}

                {vendaSelecionada.statusFluxo === 'Finalizado' && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      Venda Finalizada
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal Devolver */}
      <Dialog open={modalDevolver} onOpenChange={setModalDevolver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-purple-600">Devolver para Gestor</DialogTitle>
            <DialogDescription>A venda será devolvida ao gestor para correção.</DialogDescription>
          </DialogHeader>
          {vendaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div><p className="text-sm text-muted-foreground">ID</p><p className="font-medium">{vendaSelecionada.id}</p></div>
                <div><p className="text-sm text-muted-foreground">Valor</p><p className="font-medium">{formatCurrency(vendaSelecionada.total)}</p></div>
              </div>
              <div><Label>Motivo da Devolução *</Label><Textarea placeholder="Descreva o motivo..." value={motivoDevolucao} onChange={(e) => setMotivoDevolucao(e.target.value)} rows={3} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDevolver(false)}>Cancelar</Button>
            <Button variant="secondary" onClick={handleDevolver} disabled={!motivoDevolucao.trim()}><Undo2 className="h-4 w-4 mr-2" />Confirmar Devolução</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
