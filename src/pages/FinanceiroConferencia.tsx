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
import { Check, Download, Filter, X, Clock, CheckCircle2, Undo2, AlertCircle, CreditCard, Banknote, Smartphone, Wallet, ChevronRight, Lock, MessageSquare, XCircle, Save, Building2 } from 'lucide-react';
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

// Interface para observações
interface Observacao {
  texto: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
}

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
  const [modalRejeitar, setModalRejeitar] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [validacoesPagamento, setValidacoesPagamento] = useState<ValidacaoPagamento[]>([]);
  
  // Novos estados para funcionalidades adicionais
  const [observacaoFinanceiro, setObservacaoFinanceiro] = useState('');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [observacaoGestorCarregada, setObservacaoGestorCarregada] = useState<Observacao | null>(null);
  
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    loja: 'todas',
    status: 'todos',
    contaOrigem: 'todas',
    situacao: 'todas'
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
    if (venda.statusFluxo === 'Finalizado') return 'Conferido';
    
    const storedValidacoes = localStorage.getItem(`validacao_pagamentos_financeiro_${venda.id}`);
    if (!storedValidacoes) {
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

  // Obter conta de origem de uma venda (mock - usando lojaVenda como referência)
  const getContaOrigem = (venda: VendaComFluxo) => {
    // Buscar conta associada à loja da venda
    const contaOrigem = contasFinanceiras.find(c => c.lojaVinculada === venda.lojaVenda);
    return contaOrigem || null;
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
      
      // Filtro por conta de origem
      if (filters.contaOrigem !== 'todas') {
        const contaOrigem = getContaOrigem(v);
        if (!contaOrigem || contaOrigem.id !== filters.contaOrigem) return false;
      }
      
      // Filtro por situação
      if (filters.situacao !== 'todas') {
        const situacao = getSituacaoConferencia(v);
        if (filters.situacao === 'conferido' && situacao !== 'Conferido') return false;
        if (filters.situacao === 'pendente' && situacao === 'Conferido') return false;
        if (filters.situacao.startsWith('pendente-')) {
          const metodoFiltro = filters.situacao.replace('pendente-', '');
          if (!situacao.toLowerCase().includes(metodoFiltro)) return false;
        }
      }
      
      return true;
    }).sort((a, b) => {
      if (a.statusFluxo === 'Conferência Financeiro' && b.statusFluxo === 'Finalizado') return -1;
      if (a.statusFluxo === 'Finalizado' && b.statusFluxo === 'Conferência Financeiro') return 1;
      return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
    });
  }, [vendas, filters, contasFinanceiras]);

  // Calcular somatórios por método de pagamento - PENDENTE vs CONFERIDO
  const somatorioPagamentos = useMemo(() => {
    const totais = {
      pendente: { cartaoCredito: 0, cartaoDebito: 0, pix: 0, dinheiro: 0 },
      conferido: { cartaoCredito: 0, cartaoDebito: 0, pix: 0, dinheiro: 0 }
    };

    filteredVendas.forEach(venda => {
      const storedValidacoes = localStorage.getItem(`validacao_pagamentos_financeiro_${venda.id}`);
      const validacoesFinanceiro = storedValidacoes ? JSON.parse(storedValidacoes) : [];
      
      venda.pagamentos?.forEach(pag => {
        const meio = pag.meioPagamento.toLowerCase();
        const validacao = validacoesFinanceiro.find((v: ValidacaoPagamento) => v.metodoPagamento === pag.meioPagamento);
        const isConferido = validacao?.validadoFinanceiro || venda.statusFluxo === 'Finalizado';
        
        const target = isConferido ? totais.conferido : totais.pendente;
        
        if (meio.includes('crédito') || meio.includes('credito')) {
          target.cartaoCredito += pag.valor;
        } else if (meio.includes('débito') || meio.includes('debito')) {
          target.cartaoDebito += pag.valor;
        } else if (meio.includes('pix')) {
          target.pix += pag.valor;
        } else if (meio.includes('dinheiro')) {
          target.dinheiro += pag.valor;
        }
      });
    });

    return totais;
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
    
    // Carregar observação do gestor
    const storedObsGestor = localStorage.getItem(`observacao_gestor_${venda.id}`);
    if (storedObsGestor) {
      setObservacaoGestorCarregada(JSON.parse(storedObsGestor));
    } else {
      setObservacaoGestorCarregada(null);
    }
    
    // Carregar observação do financeiro
    const storedObsFinanceiro = localStorage.getItem(`observacao_financeiro_${venda.id}`);
    if (storedObsFinanceiro) {
      const obs: Observacao = JSON.parse(storedObsFinanceiro);
      setObservacaoFinanceiro(obs.texto);
    } else {
      setObservacaoFinanceiro('');
    }
    
    // Carregar conta de destino (default: conta de origem)
    const storedContaDestino = localStorage.getItem(`conta_destino_${venda.id}`);
    if (storedContaDestino) {
      setContaDestinoId(storedContaDestino);
    } else {
      const contaOrigem = getContaOrigem(venda);
      setContaDestinoId(contaOrigem?.id || '');
    }
  };

  const handleFecharPainel = () => {
    setVendaSelecionada(null);
    setValidacoesPagamento([]);
    setObservacaoFinanceiro('');
    setObservacaoGestorCarregada(null);
    setContaDestinoId('');
  };

  const handleToggleValidacaoFinanceiro = (metodo: string) => {
    const novasValidacoes = validacoesPagamento.map(v => 
      v.metodoPagamento === metodo 
        ? { ...v, validadoFinanceiro: !v.validadoFinanceiro, dataValidacaoFinanceiro: new Date().toISOString() }
        : v
    );
    
    setValidacoesPagamento(novasValidacoes);
    
    // Salvar imediatamente no localStorage para atualização em tempo real
    if (vendaSelecionada) {
      localStorage.setItem(
        `validacao_pagamentos_financeiro_${vendaSelecionada.id}`,
        JSON.stringify(novasValidacoes)
      );
    }
  };

  const handleSalvarSemFinalizar = () => {
    if (!vendaSelecionada) return;
    
    // Salvar validações
    localStorage.setItem(
      `validacao_pagamentos_financeiro_${vendaSelecionada.id}`,
      JSON.stringify(validacoesPagamento)
    );
    
    // Salvar observação do financeiro
    if (observacaoFinanceiro.trim()) {
      const obsFinanceiro: Observacao = {
        texto: observacaoFinanceiro.trim(),
        dataHora: new Date().toISOString(),
        usuarioId: usuarioLogado.id,
        usuarioNome: usuarioLogado.nome
      };
      localStorage.setItem(
        `observacao_financeiro_${vendaSelecionada.id}`,
        JSON.stringify(obsFinanceiro)
      );
    }
    
    // Salvar conta de destino
    if (contaDestinoId) {
      localStorage.setItem(`conta_destino_${vendaSelecionada.id}`, contaDestinoId);
    }
    
    toast.success('Validações e observações salvas com sucesso!');
    recarregar();
  };

  const handleFinalizar = () => {
    if (!vendaSelecionada) return;

    // Validar se todos os checkboxes estão marcados
    const naoValidados = validacoesPagamento.filter(v => !v.validadoFinanceiro);
    if (naoValidados.length > 0) {
      toast.error('Não é possível finalizar com pendências. Todos os métodos de pagamento devem ser validados.');
      return;
    }

    // Validar se conta de destino foi selecionada
    if (!contaDestinoId) {
      toast.error('Por favor, selecione uma conta de destino.');
      return;
    }

    // Salvar validações antes de finalizar
    localStorage.setItem(
      `validacao_pagamentos_financeiro_${vendaSelecionada.id}`,
      JSON.stringify(validacoesPagamento)
    );

    // Salvar observação do financeiro
    if (observacaoFinanceiro.trim()) {
      const obsFinanceiro: Observacao = {
        texto: observacaoFinanceiro.trim(),
        dataHora: new Date().toISOString(),
        usuarioId: usuarioLogado.id,
        usuarioNome: usuarioLogado.nome
      };
      localStorage.setItem(
        `observacao_financeiro_${vendaSelecionada.id}`,
        JSON.stringify(obsFinanceiro)
      );
    }

    // Salvar conta de destino
    localStorage.setItem(`conta_destino_${vendaSelecionada.id}`, contaDestinoId);

    const resultado = finalizarVenda(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome
    );

    if (resultado) {
      toast.success(`Venda ${vendaSelecionada.id} finalizada com sucesso!`);
      handleFecharPainel();
      recarregar();
    } else {
      toast.error('Erro ao finalizar venda.');
    }
  };

  const handleAbrirModalRejeitar = () => {
    setMotivoRejeicao('');
    setModalRejeitar(true);
  };

  const handleRejeitar = () => {
    if (!vendaSelecionada || !motivoRejeicao.trim()) {
      toast.error('Por favor, informe o motivo da rejeição.');
      return;
    }

    // Salvar rejeição com observação
    const rejeicaoFinanceiro = {
      motivo: motivoRejeicao.trim(),
      dataHora: new Date().toISOString(),
      usuarioId: usuarioLogado.id,
      usuarioNome: usuarioLogado.nome
    };
    localStorage.setItem(
      `rejeicao_financeiro_${vendaSelecionada.id}`,
      JSON.stringify(rejeicaoFinanceiro)
    );

    const resultado = devolverFinanceiro(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome,
      motivoRejeicao.trim()
    );

    if (resultado) {
      toast.success(`Conferência da venda ${vendaSelecionada.id} recusada.`);
      setModalRejeitar(false);
      handleFecharPainel();
      recarregar();
    } else {
      toast.error('Erro ao rejeitar venda.');
    }
  };

  const handleExport = () => {
    const dataAtual = new Date().toISOString().split('T')[0];
    exportFluxoToCSV(filteredVendas, `conferencia-financeiro-${dataAtual}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({ dataInicio: '', dataFim: '', loja: 'todas', status: 'todos', contaOrigem: 'todas', situacao: 'todas' });
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
  const getContaNome = (contaId: string) => contasFinanceiras.find(c => c.id === contaId)?.nome || 'Não informada';

  return (
    <FinanceiroLayout title="Conferência de Contas - Vendas">
      <div className="flex gap-6">
        {/* Painel Principal - Tabela (70%) */}
        <div className={`transition-all ${vendaSelecionada ? 'w-[70%]' : 'w-full'}`}>
          {/* Cards Pendente vs Conferido por método */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Pendentes */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-600 opacity-70" />
                  <div>
                    <p className="text-xs text-red-700 dark:text-red-300">Pendente - Crédito</p>
                    <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.cartaoCredito)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-red-600 opacity-70" />
                  <div>
                    <p className="text-xs text-red-700 dark:text-red-300">Pendente - Débito</p>
                    <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.cartaoDebito)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-red-600 opacity-70" />
                  <div>
                    <p className="text-xs text-red-700 dark:text-red-300">Pendente - Pix</p>
                    <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.pix)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-red-600 opacity-70" />
                  <div>
                    <p className="text-xs text-red-700 dark:text-red-300">Pendente - Dinheiro</p>
                    <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.dinheiro)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Conferidos */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600 opacity-70" />
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-300">Conferido - Crédito</p>
                    <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.cartaoCredito)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-green-600 opacity-70" />
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-300">Conferido - Débito</p>
                    <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.cartaoDebito)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-600 opacity-70" />
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-300">Conferido - Pix</p>
                    <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.pix)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-green-600 opacity-70" />
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-300">Conferido - Dinheiro</p>
                    <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.dinheiro)}</p>
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
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                <div>
                  <Label>Data Início</Label>
                  <Input type="date" value={filters.dataInicio} onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })} />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input type="date" value={filters.dataFim} onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })} />
                </div>
                <div>
                  <Label>Loja</Label>
                  <Select value={filters.loja} onValueChange={(value) => setFilters({ ...filters, loja: value })}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="Conferência Financeiro">Conferência Financeiro</SelectItem>
                      <SelectItem value="Finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Conta de Origem</Label>
                  <Select value={filters.contaOrigem} onValueChange={(value) => setFilters({ ...filters, contaOrigem: value })}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Contas</SelectItem>
                      {contasFinanceiras.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Situação</Label>
                  <Select value={filters.situacao} onValueChange={(value) => setFilters({ ...filters, situacao: value })}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Situações</SelectItem>
                      <SelectItem value="conferido">Conferido</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pendente-crédito">Pendente - Cartão de Crédito</SelectItem>
                      <SelectItem value="pendente-débito">Pendente - Cartão de Débito</SelectItem>
                      <SelectItem value="pendente-pix">Pendente - Pix</SelectItem>
                      <SelectItem value="pendente-dinheiro">Pendente - Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={handleLimpar} className="flex-1">
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                  <Button onClick={handleExport} variant="secondary">
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela com coluna Conta de Origem e Situação */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Venda</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Conta de Origem</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhuma venda encontrada
                        </TableCell>
                      </TableRow>
                    ) : filteredVendas.map(venda => {
                      const contaOrigem = getContaOrigem(venda);
                      return (
                        <TableRow 
                          key={venda.id} 
                          className={`${getRowClassName(venda)} ${vendaSelecionada?.id === venda.id ? 'ring-2 ring-primary' : ''} cursor-pointer`}
                          onClick={() => handleSelecionarVenda(venda)}
                        >
                          <TableCell className="font-medium">{venda.id}</TableCell>
                          <TableCell>{new Date(venda.dataHora).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="max-w-[120px] truncate">{venda.clienteNome}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(venda.total)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{contaOrigem?.nome || 'Não informada'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getSituacaoBadge(getSituacaoConferencia(venda))}</TableCell>
                          <TableCell>{getStatusBadge(venda.statusFluxo as StatusVenda)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSelecionarVenda(venda); }}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel Lateral (30%) */}
        {vendaSelecionada && (
          <div className="w-[30%] sticky top-4 h-fit min-w-[350px]">
            <Card className="max-h-[calc(100vh-120px)] overflow-y-auto">
              <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Detalhes da Venda</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleFecharPainel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
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
                  <h4 className="font-semibold text-sm mb-2">Pagamentos</h4>
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
                  </div>
                )}

                {/* Observação do Gestor (Apenas Leitura) */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-semibold text-sm">Observação do Gestor</Label>
                  </div>
                  {observacaoGestorCarregada ? (
                    <div>
                      <p className="text-sm text-muted-foreground">{observacaoGestorCarregada.texto}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Por {observacaoGestorCarregada.usuarioNome} em {new Date(observacaoGestorCarregada.dataHora).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma observação do gestor</p>
                  )}
                </div>

                {/* Observação do Financeiro (Editável) */}
                {vendaSelecionada.statusFluxo === 'Conferência Financeiro' && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold text-sm">Observação do Financeiro</Label>
                    </div>
                    <Textarea
                      placeholder="Adicione observações sobre esta conferência (ex: pagamento confirmado, aguardando comprovante, etc)"
                      value={observacaoFinanceiro}
                      onChange={(e) => setObservacaoFinanceiro(e.target.value.slice(0, 1000))}
                      rows={3}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {observacaoFinanceiro.length}/1000 caracteres
                    </p>
                  </div>
                )}

                {/* Campo Conta de Destino */}
                {vendaSelecionada.statusFluxo === 'Conferência Financeiro' && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold text-sm">Conta de Destino *</Label>
                    </div>
                    <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta de destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {contasFinanceiras.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confirme a conta para onde o pagamento será destinado
                    </p>
                  </div>
                )}

                {/* Ações */}
                {vendaSelecionada.statusFluxo === 'Conferência Financeiro' && (
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleSalvarSemFinalizar}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleFinalizar}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Finalizar
                      </Button>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={handleAbrirModalRejeitar}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={handleFecharPainel}
                    >
                      Voltar
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

      {/* Modal Rejeitar */}
      <Dialog open={modalRejeitar} onOpenChange={setModalRejeitar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Rejeitar Conferência
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja rejeitar esta conferência? A venda será devolvida ao gestor.
            </DialogDescription>
          </DialogHeader>
          {vendaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-medium">{vendaSelecionada.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium">{formatCurrency(vendaSelecionada.total)}</p>
                </div>
              </div>
              <div>
                <Label>Motivo da Rejeição *</Label>
                <Textarea 
                  placeholder="Descreva o motivo da rejeição..." 
                  value={motivoRejeicao} 
                  onChange={(e) => setMotivoRejeicao(e.target.value)} 
                  rows={3} 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRejeitar(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={handleRejeitar} 
              disabled={!motivoRejeicao.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
