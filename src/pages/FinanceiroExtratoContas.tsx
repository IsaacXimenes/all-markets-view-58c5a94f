import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Wallet, TrendingUp, TrendingDown, Calendar, ArrowUpCircle, 
  ArrowDownCircle, X, Building2, Landmark, Eye, ArrowLeftRight, Download
} from 'lucide-react';

import { getContasFinanceiras, ContaFinanceira } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { formatarMoeda } from '@/utils/formatUtils';
import { getVendasPorStatus } from '@/utils/fluxoVendasApi';
import { getDespesas } from '@/utils/financeApi';
import { getOrdensServico } from '@/utils/assistenciaApi';
import { getMovimentacoesEntreConta, addMovimentacaoEntreConta, addLogMovimentacao, MovimentacaoEntreConta } from '@/utils/movimentacoesEntreContasApi';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

const formatCurrency = formatarMoeda;

// Meses do ano
const meses = [
  { valor: 0, nome: 'Janeiro' },
  { valor: 1, nome: 'Fevereiro' },
  { valor: 2, nome: 'Março' },
  { valor: 3, nome: 'Abril' },
  { valor: 4, nome: 'Maio' },
  { valor: 5, nome: 'Junho' },
  { valor: 6, nome: 'Julho' },
  { valor: 7, nome: 'Agosto' },
  { valor: 8, nome: 'Setembro' },
  { valor: 9, nome: 'Outubro' },
  { valor: 10, nome: 'Novembro' },
  { valor: 11, nome: 'Dezembro' },
];

const anos = [2025, 2026, 2027];

interface Movimentacao {
  id: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data: string;
  contaId: string;
  vendaId?: string;
}

export default function FinanceiroExtratoContas() {
  const { obterNomeLoja, obterLojasAtivas } = useCadastroStore();
  const user = useAuthStore((s) => s.user);
  const [contasFinanceiras, setContasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  const [movimentacoesEntreConta, setMovimentacoesEntreConta] = useState<MovimentacaoEntreConta[]>(getMovimentacoesEntreConta());
  const lojas = obterLojasAtivas();
  
  // Estados para filtro de período
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());
  const [filtroLoja, setFiltroLoja] = useState<string>('todas');
  
  // Modal de detalhes
  const [contaSelecionada, setContaSelecionada] = useState<ContaFinanceira | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);

  // Modal de movimentação entre contas
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [movForm, setMovForm] = useState({
    contaOrigemId: '',
    contaDestinoId: '',
    valor: 0,
    dataHora: new Date().toISOString().slice(0, 16),
    observacao: '',
  });

  // Calcular movimentações por conta
  const { movimentacoesPorConta, entradasPorConta, saidasPorConta } = useMemo(() => {
    const movimentacoes: Record<string, Movimentacao[]> = {};
    const entradas: Record<string, number> = {};
    const saidas: Record<string, number> = {};
    
    // Inicializar
    contasFinanceiras.forEach(conta => {
      movimentacoes[conta.id] = [];
      entradas[conta.id] = 0;
      saidas[conta.id] = 0;
    });
    
    // Processar vendas finalizadas (entradas)
    try {
      const vendasFinalizadas = getVendasPorStatus('Finalizado');
      
      vendasFinalizadas.forEach(venda => {
        const dataFinalizacaoRaw = localStorage.getItem(`data_finalizacao_${venda.id}`);
        if (!dataFinalizacaoRaw) return;
        
        const dataFinalizacao = new Date(dataFinalizacaoRaw);
        const mesVenda = dataFinalizacao.getMonth();
        const anoVenda = dataFinalizacao.getFullYear();
        
        if (mesVenda !== mesSelecionado || anoVenda !== anoSelecionado) return;
        
        // Buscar validações de pagamentos
        const validacaoRaw = localStorage.getItem(`validacao_pagamentos_financeiro_${venda.id}`);
        
        if (validacaoRaw) {
          const validacoes = JSON.parse(validacaoRaw);
          
          validacoes.forEach((validacao: any) => {
            if (!validacao.validadoFinanceiro) return;
            
            const pagamentoVenda = venda.pagamentos?.find((p: any) => p.meioPagamento === validacao.metodoPagamento);
            const contaId = validacao.contaDestinoId || pagamentoVenda?.contaDestino;
            const valor = pagamentoVenda?.valor || 0;
            
            if (contaId && valor > 0) {
              entradas[contaId] = (entradas[contaId] || 0) + valor;
              
              if (!movimentacoes[contaId]) movimentacoes[contaId] = [];
              movimentacoes[contaId].push({
                id: `${venda.id}-${validacao.metodoPagamento}`,
                tipo: 'entrada',
                descricao: `Venda #${venda.id} - ${validacao.metodoPagamento}`,
                valor,
                data: dataFinalizacaoRaw,
                contaId,
                vendaId: venda.id
              });
            }
          });
        }
      });
    } catch (e) {
      console.error('[ExtratoContas] Erro ao processar vendas:', e);
    }
    
    // Processar OS de assistência liquidadas (entradas)
    try {
      const todasOS = getOrdensServico();
      const osLiquidadas = todasOS.filter(os => os.status === 'Liquidado');
      
      osLiquidadas.forEach(os => {
        const dataFinalizacaoRaw = localStorage.getItem(`data_finalizacao_${os.id}`);
        if (!dataFinalizacaoRaw) return;
        
        const dataFinalizacao = new Date(dataFinalizacaoRaw);
        const mesOS = dataFinalizacao.getMonth();
        const anoOS = dataFinalizacao.getFullYear();
        
        if (mesOS !== mesSelecionado || anoOS !== anoSelecionado) return;
        
        const validacaoRaw = localStorage.getItem(`validacao_pagamentos_financeiro_${os.id}`);
        
        if (validacaoRaw) {
          const validacoes = JSON.parse(validacaoRaw);
          
          validacoes.forEach((validacao: any) => {
            if (!validacao.validadoFinanceiro) return;
            
            const pagamentoOS = os.pagamentos?.find((p: any) => p.meio === validacao.metodoPagamento);
            const contaId = validacao.contaDestinoId || pagamentoOS?.contaDestino;
            const valor = pagamentoOS?.valor || 0;
            
            if (contaId && valor > 0) {
              entradas[contaId] = (entradas[contaId] || 0) + valor;
              
              if (!movimentacoes[contaId]) movimentacoes[contaId] = [];
              movimentacoes[contaId].push({
                id: `${os.id}-${validacao.metodoPagamento}`,
                tipo: 'entrada',
                descricao: `Assistência #${os.id} - ${validacao.metodoPagamento}`,
                valor,
                data: dataFinalizacaoRaw,
                contaId,
                vendaId: os.id
              });
            }
          });
        }
      });
    } catch (e) {
      console.error('[ExtratoContas] Erro ao processar OS assistência:', e);
    }
    
    // Processar despesas (saídas)
    try {
      const despesas = getDespesas();
      
      despesas.forEach(despesa => {
        const dataDespesa = new Date(despesa.data);
        const mesDespesa = dataDespesa.getMonth();
        const anoDespesa = dataDespesa.getFullYear();
        
        if (mesDespesa !== mesSelecionado || anoDespesa !== anoSelecionado) return;
        
        // Encontrar conta pelo nome
        const contaEncontrada = contasFinanceiras.find(c => c.nome === despesa.conta || c.id === despesa.conta);
        const contaId = contaEncontrada?.id;
        
        if (contaId) {
          saidas[contaId] = (saidas[contaId] || 0) + despesa.valor;
          
          if (!movimentacoes[contaId]) movimentacoes[contaId] = [];
          movimentacoes[contaId].push({
            id: despesa.id,
            tipo: 'saida',
            descricao: `Despesa: ${despesa.descricao}`,
            valor: despesa.valor,
            data: despesa.data,
            contaId
          });
        }
      });
    } catch (e) {
      console.error('[ExtratoContas] Erro ao processar despesas:', e);
    }
    
    // Processar movimentações entre contas
    try {
      movimentacoesEntreConta.forEach(mov => {
        const dataMov = new Date(mov.dataHora);
        const mesMov = dataMov.getMonth();
        const anoMov = dataMov.getFullYear();
        
        if (mesMov !== mesSelecionado || anoMov !== anoSelecionado) return;
        
        // Saída da conta de origem
        if (mov.contaOrigemId) {
          saidas[mov.contaOrigemId] = (saidas[mov.contaOrigemId] || 0) + mov.valor;
          if (!movimentacoes[mov.contaOrigemId]) movimentacoes[mov.contaOrigemId] = [];
          movimentacoes[mov.contaOrigemId].push({
            id: `${mov.id}-saida`,
            tipo: 'saida',
            descricao: `Transferência para ${contasFinanceiras.find(c => c.id === mov.contaDestinoId)?.nome || mov.contaDestinoId}${mov.observacao ? ` - ${mov.observacao}` : ''}`,
            valor: mov.valor,
            data: mov.dataHora,
            contaId: mov.contaOrigemId,
          });
        }
        
        // Entrada na conta de destino
        if (mov.contaDestinoId) {
          entradas[mov.contaDestinoId] = (entradas[mov.contaDestinoId] || 0) + mov.valor;
          if (!movimentacoes[mov.contaDestinoId]) movimentacoes[mov.contaDestinoId] = [];
          movimentacoes[mov.contaDestinoId].push({
            id: `${mov.id}-entrada`,
            tipo: 'entrada',
            descricao: `Transferência de ${contasFinanceiras.find(c => c.id === mov.contaOrigemId)?.nome || mov.contaOrigemId}${mov.observacao ? ` - ${mov.observacao}` : ''}`,
            valor: mov.valor,
            data: mov.dataHora,
            contaId: mov.contaDestinoId,
          });
        }
      });
    } catch (e) {
      console.error('[ExtratoContas] Erro ao processar movimentações entre contas:', e);
    }
    
    return { 
      movimentacoesPorConta: movimentacoes, 
      entradasPorConta: entradas, 
      saidasPorConta: saidas 
    };
  }, [contasFinanceiras, mesSelecionado, anoSelecionado, movimentacoesEntreConta]);

  // Filtrar contas por loja
  const contasFiltradas = useMemo(() => {
    if (filtroLoja === 'todas') return contasFinanceiras;
    return contasFinanceiras.filter(c => c.lojaVinculada === filtroLoja);
  }, [contasFinanceiras, filtroLoja]);

  // IDs das contas de assistência segregadas
  const CONTAS_ASSISTENCIA_SEGREGADAS = ['CTA-011', 'CTA-012', 'CTA-013', 'CTA-014'];
  // IDs das contas de dinheiro por loja (não inclui Dinheiro-Geral CTA-020 nem Águas Lindas CTA-017)
  const CONTAS_DINHEIRO_SEGREGADAS = ['CTA-015', 'CTA-016', 'CTA-017', 'CTA-018', 'CTA-019'];

  // Separar contas em 3 seções
  const { contasPrincipais, contasSegregadas, contasTerceirizadas, totais } = useMemo(() => {
    const ativas = contasFiltradas.filter(c => c.status === 'Ativo');
    
    const terceirizadas = ativas.filter(c => c.statusMaquina === 'Terceirizada');
    
    const segregadas = ativas.filter(c => 
      CONTAS_ASSISTENCIA_SEGREGADAS.includes(c.id) || CONTAS_DINHEIRO_SEGREGADAS.includes(c.id)
    );
    const segregadasIds = new Set(segregadas.map(c => c.id));
    const terceirizadasIds = new Set(terceirizadas.map(c => c.id));
    
    const principais = ativas.filter(c => !segregadasIds.has(c.id) && !terceirizadasIds.has(c.id));
    
    // Ordenar principais na ordem desejada por loja
    const ordemLojas = ['0d06e7db', 'db894e7d', '3ac7e00c', 'fcc78c1a', '5b9446d5'];
    const ordemContasPrincipais = [
      // Águas Lindas
      'CTA-007', 'CTA-008', 'CTA-017',
      // JK Shopping
      'CTA-005', 'CTA-006',
      // Matriz
      'CTA-001', 'CTA-002',
      // Online
      'CTA-003', 'CTA-004',
      // Shopping Sul
      'CTA-009', 'CTA-010',
      // Gerais
      'CTA-020', 'CTA-021',
    ];
    principais.sort((a, b) => {
      const idxA = ordemContasPrincipais.indexOf(a.id);
      const idxB = ordemContasPrincipais.indexOf(b.id);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    // Ordenar segregadas: assistência primeiro, depois dinheiro
    const ordemSegregadas = [
      'CTA-014', 'CTA-012', 'CTA-013', 'CTA-011',
      'CTA-015', 'CTA-019', 'CTA-018', 'CTA-016',
    ];
    segregadas.sort((a, b) => {
      const idxA = ordemSegregadas.indexOf(a.id);
      const idxB = ordemSegregadas.indexOf(b.id);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
    
    const totalEntradas = Object.values(entradasPorConta).reduce((acc, v) => acc + v, 0);
    const totalSaidas = Object.values(saidasPorConta).reduce((acc, v) => acc + v, 0);
    
    return {
      contasPrincipais: principais,
      contasSegregadas: segregadas,
      contasTerceirizadas: terceirizadas,
      totais: { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas }
    };
  }, [contasFiltradas, entradasPorConta, saidasPorConta]);

  const mesNome = meses.find(m => m.valor === mesSelecionado)?.nome || '';

  const contasAtivas = contasFinanceiras.filter(c => c.status === 'Ativo');

  const handleConfirmarMovimentacao = () => {
    if (!movForm.contaOrigemId || !movForm.contaDestinoId || movForm.valor <= 0) {
      toast.error('Preencha todos os campos obrigatórios (Conta de Origem, Destino e Valor > 0).');
      return;
    }
    if (movForm.contaOrigemId === movForm.contaDestinoId) {
      toast.error('Conta de Origem e Destino não podem ser iguais.');
      return;
    }

    const nova = addMovimentacaoEntreConta({
      contaOrigemId: movForm.contaOrigemId,
      contaDestinoId: movForm.contaDestinoId,
      valor: movForm.valor,
      dataHora: new Date(movForm.dataHora).toISOString(),
      observacao: movForm.observacao,
      usuarioId: user?.colaborador?.id || 'USR-SISTEMA',
      usuarioNome: user?.colaborador?.nome || user?.username || 'Sistema',
    });

    addLogMovimentacao(nova);
    setMovimentacoesEntreConta(getMovimentacoesEntreConta());
    setShowMovimentacaoModal(false);
    setMovForm({ contaOrigemId: '', contaDestinoId: '', valor: 0, dataHora: new Date().toISOString().slice(0, 16), observacao: '' });
    toast.success('Movimentação realizada com sucesso!');
  };


  // Abrir detalhes de uma conta
  const handleAbrirDetalhes = (conta: ContaFinanceira) => {
    setContaSelecionada(conta);
    setShowDetalhesModal(true);
  };

  // Render card de conta
  const renderContaCard = (conta: ContaFinanceira) => {
    const entradas = entradasPorConta[conta.id] || 0;
    const saidas = saidasPorConta[conta.id] || 0;
    const maxValor = Math.max(entradas, saidas, 1);
    const percentualEntrada = (entradas / maxValor) * 100;
    const percentualSaida = (saidas / maxValor) * 100;
    
    return (
      <Card 
        key={conta.id} 
        className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
        onClick={() => handleAbrirDetalhes(conta)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="truncate">{conta.nome}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{obterNomeLoja(conta.lojaVinculada)}</span>
          </div>
          <div className="mt-2 p-2 bg-muted/50 rounded-lg">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Saldo da Conta:</p>
            <span className={`text-lg font-bold ${(conta.saldoInicial || 0) + entradas - saidas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency((conta.saldoInicial || 0) + entradas - saidas)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Linha de Entrada (Verde) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-green-600">
                <ArrowUpCircle className="h-4 w-4" />
                <span>Entradas</span>
              </div>
              <span className="font-bold text-green-600">{formatCurrency(entradas)}</span>
            </div>
            <Progress 
              value={percentualEntrada} 
              className="h-2 [&>div]:bg-green-500"
            />
          </div>
          
          {/* Linha de Saída (Vermelha) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-red-600">
                <ArrowDownCircle className="h-4 w-4" />
                <span>Saídas</span>
              </div>
              <span className="font-bold text-red-600">{formatCurrency(saidas)}</span>
            </div>
            <Progress 
              value={percentualSaida} 
              className="h-2 [&>div]:bg-red-500"
            />
          </div>
          
        </CardContent>
      </Card>
    );
  };

  return (
    <FinanceiroLayout title="Extrato por Conta">
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Período:</span>
              </div>
              
              <Select value={mesSelecionado.toString()} onValueChange={(v) => setMesSelecionado(parseInt(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(m => (
                    <SelectItem key={m.valor} value={m.valor.toString()}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={anoSelecionado.toString()} onValueChange={(v) => setAnoSelecionado(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map(a => (
                    <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Loja:</span>
              </div>
              
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas as Lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Lojas</SelectItem>
                  {lojas.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => {
                  // Exportar CSV com movimentações individuais
                  const todasMovimentacoes: any[] = [];
                  contasFiltradas.forEach(conta => {
                    const movs = movimentacoesPorConta[conta.id] || [];
                    movs.forEach(mov => {
                      todasMovimentacoes.push({
                        Conta: conta.nome,
                        Loja: obterNomeLoja(conta.lojaVinculada),
                        Tipo: mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
                        Descrição: mov.descricao,
                        Valor: mov.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        Data: new Date(mov.data).toLocaleDateString('pt-BR'),
                      });
                    });
                  });
                  
                  if (todasMovimentacoes.length === 0) {
                    toast.error('Nenhuma movimentação para exportar no período selecionado');
                    return;
                  }
                  
                  const csvContent = Object.keys(todasMovimentacoes[0]).join(';') + '\n' +
                    todasMovimentacoes.map(row => Object.values(row).join(';')).join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `extrato-contas-${mesNome.toLowerCase()}-${anoSelecionado}.csv`;
                  link.click();
                  toast.success('Extrato exportado com sucesso!');
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button onClick={() => setShowMovimentacaoModal(true)}>
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Nova Movimentação
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo Geral */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Entradas</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totais.totalEntradas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Saídas</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totais.totalSaidas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={totais.saldo >= 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${totais.saldo >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                  <Wallet className={`h-6 w-6 ${totais.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo do Período</p>
                  <p className={`text-2xl font-bold ${totais.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(totais.saldo)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção: Contas Principais */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold">Contas Principais</h2>
            <Badge variant="secondary">{contasPrincipais.length}</Badge>
          </div>
          
          {contasPrincipais.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma conta principal encontrada
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {contasPrincipais.map(renderContaCard)}
            </div>
          )}
        </div>

        {/* Seção: Contas Segregadas (Assistência + Dinheiro) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold">Contas Segregadas</h2>
            <Badge variant="secondary">{contasSegregadas.length}</Badge>
          </div>
          
          {contasSegregadas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma conta segregada encontrada
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {contasSegregadas.map(renderContaCard)}
            </div>
          )}
        </div>

        {/* Seção: Contas Terceirizadas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold">Contas Terceirizadas</h2>
            <Badge variant="secondary">{contasTerceirizadas.length}</Badge>
          </div>
          
          {contasTerceirizadas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma conta terceirizada encontrada
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {contasTerceirizadas.map(renderContaCard)}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes da Conta */}
      <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Extrato: {contaSelecionada?.nome}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowDetalhesModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {contaSelecionada && (
            <div className="space-y-4">
              {/* Resumo da conta */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Entradas</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(entradasPorConta[contaSelecionada.id] || 0)}
                  </p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Saídas</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(saidasPorConta[contaSelecionada.id] || 0)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className={`text-xl font-bold ${
                    (entradasPorConta[contaSelecionada.id] || 0) - (saidasPorConta[contaSelecionada.id] || 0) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(
                      (entradasPorConta[contaSelecionada.id] || 0) - (saidasPorConta[contaSelecionada.id] || 0)
                    )}
                  </p>
                </div>
              </div>
              
              {/* Tabela de movimentações */}
              <div>
                <h4 className="font-medium mb-2">Movimentações em {mesNome}/{anoSelecionado}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(movimentacoesPorConta[contaSelecionada.id] || [])
                      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                      .map((mov) => (
                        <TableRow 
                          key={mov.id}
                          className={mov.tipo === 'entrada' ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}
                        >
                          <TableCell>{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>{mov.descricao}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={mov.tipo === 'entrada' 
                                ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                                : 'bg-red-500/10 text-red-600 border-red-500/30'
                              }
                            >
                              {mov.tipo === 'entrada' ? (
                                <><ArrowUpCircle className="h-3 w-3 mr-1" /> Entrada</>
                              ) : (
                                <><ArrowDownCircle className="h-3 w-3 mr-1" /> Saída</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                            {mov.tipo === 'entrada' ? '+' : '-'}{formatCurrency(mov.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    {(movimentacoesPorConta[contaSelecionada.id] || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhuma movimentação no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Movimentação entre Contas */}
      <Dialog open={showMovimentacaoModal} onOpenChange={setShowMovimentacaoModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Nova Movimentação entre Contas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Conta de Origem *</Label>
              <Select value={movForm.contaOrigemId} onValueChange={v => setMovForm({ ...movForm, contaOrigemId: v })}>
                <SelectTrigger className={!movForm.contaOrigemId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione a conta de origem" />
                </SelectTrigger>
                <SelectContent>
                  {contasAtivas.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome} ({obterNomeLoja(c.lojaVinculada)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta de Destino *</Label>
              <Select value={movForm.contaDestinoId} onValueChange={v => setMovForm({ ...movForm, contaDestinoId: v })}>
                <SelectTrigger className={!movForm.contaDestinoId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione a conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {contasAtivas.filter(c => c.id !== movForm.contaOrigemId).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome} ({obterNomeLoja(c.lojaVinculada)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor *</Label>
              <InputComMascara
                mascara="moeda"
                value={movForm.valor}
                onChange={(_, rawValue) => setMovForm({ ...movForm, valor: rawValue as number })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data/Hora</Label>
              <Input
                type="datetime-local"
                value={movForm.dataHora}
                onChange={e => setMovForm({ ...movForm, dataHora: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Observação / Motivo</Label>
              <Textarea
                value={movForm.observacao}
                onChange={e => setMovForm({ ...movForm, observacao: e.target.value })}
                placeholder="Ex: Sangria, Suprimento, Depósito..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovimentacaoModal(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarMovimentacao}>Confirmar Movimentação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
