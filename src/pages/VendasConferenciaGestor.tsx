import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Eye, Download, Filter, X, Pencil, Check, XCircle, AlertTriangle, Clock, Undo2, CreditCard, Banknote, Smartphone, Wallet, ChevronRight, Lock, MessageSquare, ArrowLeftRight, Shield, Package } from 'lucide-react';
import { ComprovantePreview, ComprovanteBadgeSemAnexo } from '@/components/vendas/ComprovantePreview';
import { VendaResumoCompleto } from '@/components/vendas/VendaResumoCompleto';
import { useFluxoVendas } from '@/hooks/useFluxoVendas';
import { 
  aprovarGestor, 
  recusarGestor,
  enviarParaPagamentoDowngrade,
  getCorBadgeStatus,
  exportFluxoToCSV,
  VendaComFluxo,
  StatusVenda
} from '@/utils/fluxoVendasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { useCadastroStore } from '@/store/cadastroStore';
import { getContasFinanceiras } from '@/utils/cadastrosApi';
import { toast } from 'sonner';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';

// Mock do usuário logado (gestor)
const usuarioLogado = { id: 'COL-001', nome: 'João Gestor' };

// Interface para validação de pagamentos
interface ValidacaoPagamento {
  metodoPagamento: string;
  validadoGestor: boolean;
  dataValidacao?: string;
}

// Interface para observação do gestor
interface ObservacaoGestor {
  texto: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
}

export default function VendasConferenciaGestor() {
  const navigate = useNavigate();
  const { obterLojasAtivas, obterColaboradoresAtivos, obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const { vendas, recarregar } = useFluxoVendas({
    status: ['Conferência Gestor', 'Devolvido pelo Financeiro', 'Conferência Financeiro', 'Pagamento Downgrade', 'Finalizado']
  });
  
  const lojas = obterLojasAtivas();
  const colaboradores = obterColaboradoresAtivos();
  
  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('todas');
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroContaDestino, setFiltroContaDestino] = useState('todas');
  const [contasFinanceiras] = useState(() => getContasFinanceiras());
  
  // Modal de recusa
  const [modalRecusar, setModalRecusar] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  
  // Painel lateral
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaComFluxo | null>(null);
  const [validacoesPagamento, setValidacoesPagamento] = useState<ValidacaoPagamento[]>([]);
  const [observacaoGestor, setObservacaoGestor] = useState('');

  // Filtrar vendas
  const vendasFiltradas = useMemo(() => {
    let resultado = [...vendas];

    if (filtroDataInicio) {
      resultado = resultado.filter(v => 
        new Date(v.dataHora) >= new Date(filtroDataInicio)
      );
    }
    if (filtroDataFim) {
      const dataFim = new Date(filtroDataFim);
      dataFim.setHours(23, 59, 59);
      resultado = resultado.filter(v => 
        new Date(v.dataHora) <= dataFim
      );
    }
    if (filtroLoja !== 'todas') {
      resultado = resultado.filter(v => v.lojaVenda === filtroLoja);
    }
    if (filtroResponsavel !== 'todos') {
      resultado = resultado.filter(v => v.vendedor === filtroResponsavel);
    }
    if (filtroStatus !== 'todos') {
      resultado = resultado.filter(v => v.statusFluxo === filtroStatus);
    }
    
    // Filtro por conta destino
    if (filtroContaDestino !== 'todas') {
      resultado = resultado.filter(v => 
        v.pagamentos?.some(p => p.contaDestino === filtroContaDestino)
      );
    }

    // Ordenação: Pendentes primeiro
    resultado.sort((a, b) => {
      const ordem: Record<string, number> = {
        'Conferência Gestor': 0,
        'Devolvido pelo Financeiro': 1,
        'Conferência Financeiro': 2,
        'Finalizado': 3
      };
      const ordemA = ordem[a.statusFluxo || ''] ?? 4;
      const ordemB = ordem[b.statusFluxo || ''] ?? 4;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
    });

    return resultado;
  }, [vendas, filtroDataInicio, filtroDataFim, filtroLoja, filtroResponsavel, filtroStatus, filtroContaDestino]);

  // Calcular somatórios por método de pagamento - DINÂMICO baseado nas vendas filtradas
  // Separado por Pendente (Conferência Gestor, Devolvido pelo Financeiro) e Conferido (Conferência Financeiro, Finalizado)
  const somatorioPagamentos = useMemo(() => {
    const totais = {
      pendente: {
        cartaoCredito: 0,
        cartaoDebito: 0,
        pix: 0,
        dinheiro: 0,
        boleto: 0
      },
      conferido: {
        cartaoCredito: 0,
        cartaoDebito: 0,
        pix: 0,
        dinheiro: 0,
        boleto: 0
      }
    };

    vendasFiltradas.forEach(venda => {
      const isPendente = venda.statusFluxo === 'Conferência Gestor' || venda.statusFluxo === 'Devolvido pelo Financeiro';
      const target = isPendente ? totais.pendente : totais.conferido;
      
      venda.pagamentos?.forEach(pag => {
        const meio = pag.meioPagamento.toLowerCase();
        if (meio.includes('crédito') || meio.includes('credito')) {
          target.cartaoCredito += pag.valor;
        } else if (meio.includes('débito') || meio.includes('debito')) {
          target.cartaoDebito += pag.valor;
        } else if (meio.includes('pix')) {
          target.pix += pag.valor;
        } else if (meio.includes('dinheiro')) {
          target.dinheiro += pag.valor;
        } else if (meio.includes('boleto') || meio.includes('crediário') || meio.includes('crediario')) {
          target.boleto += pag.valor;
        }
      });
    });

    return totais;
  }, [vendasFiltradas]);

  // Contadores
  const conferenciaGestorCount = vendas.filter(v => v.statusFluxo === 'Conferência Gestor').length;
  const devolvidoFinanceiroCount = vendas.filter(v => v.statusFluxo === 'Devolvido pelo Financeiro').length;
  const conferenciaFinanceiroCount = vendas.filter(v => v.statusFluxo === 'Conferência Financeiro').length;
  const finalizadoCount = vendas.filter(v => v.statusFluxo === 'Finalizado').length;

  const limparFiltros = () => {
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroLoja('todas');
    setFiltroResponsavel('todos');
    setFiltroStatus('todos');
    setFiltroContaDestino('todas');
  };

  const handleExportar = () => {
    const dataAtual = new Date().toISOString().split('T')[0];
    exportFluxoToCSV(vendasFiltradas, `conferencia-gestor-${dataAtual}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleAbrirPainelLateral = (venda: VendaComFluxo) => {
    setVendaSelecionada(venda);
    
    // Extrair métodos de pagamento únicos da venda
    const metodos = venda.pagamentos?.map(p => p.meioPagamento) || [];
    const metodosUnicos = [...new Set(metodos)];
    
    // Carregar validações existentes do localStorage
    const storedValidacoes = localStorage.getItem(`validacao_pagamentos_${venda.id}`);
    const existingValidacoes = storedValidacoes ? JSON.parse(storedValidacoes) : [];
    
    // Criar array de validações com estado atual
    const validacoes = metodosUnicos.map(metodo => {
      const existing = existingValidacoes.find((v: ValidacaoPagamento) => v.metodoPagamento === metodo);
      return {
        metodoPagamento: metodo,
        validadoGestor: existing?.validadoGestor || false,
        dataValidacao: existing?.dataValidacao
      };
    });
    
    setValidacoesPagamento(validacoes);
    
    // SEMPRE iniciar observação vazia para nova conferência
    // Não carregar observação do localStorage para evitar cache
    setObservacaoGestor('');
    setMotivoRecusa('');
  };

  const handleFecharPainelLateral = () => {
    setVendaSelecionada(null);
    setValidacoesPagamento([]);
    setObservacaoGestor(''); // Limpar observação ao fechar
    setMotivoRecusa(''); // Limpar motivo de recusa
  };

  const handleAbrirModalRecusar = () => {
    setMotivoRecusa('');
    setModalRecusar(true);
  };

  const handleToggleValidacao = (metodo: string) => {
    setValidacoesPagamento(prev => 
      prev.map(v => 
        v.metodoPagamento === metodo 
          ? { ...v, validadoGestor: !v.validadoGestor, dataValidacao: new Date().toISOString() }
          : v
      )
    );
  };

  const handleFinalizarAprovacao = () => {
    if (!vendaSelecionada) return;

    // Para vendas Downgrade, não há validação de pagamentos
    const isDowngrade = (vendaSelecionada as any).tipoOperacao === 'Downgrade' && 
                        (vendaSelecionada as any).saldoDevolver > 0;
    
    // Validar se todos os checkboxes estão marcados (apenas para vendas normais)
    if (!isDowngrade) {
      const naoValidados = validacoesPagamento.filter(v => !v.validadoGestor);
      if (naoValidados.length > 0) {
        toast.error('Todos os métodos de pagamento devem ser validados antes de finalizar.');
        return;
      }

      // Salvar validações de pagamento
      localStorage.setItem(
        `validacao_pagamentos_${vendaSelecionada.id}`,
        JSON.stringify(validacoesPagamento)
      );
    }

    // Salvar observação do gestor
    if (observacaoGestor.trim()) {
      const obsGestor: ObservacaoGestor = {
        texto: observacaoGestor.trim(),
        dataHora: new Date().toISOString(),
        usuarioId: usuarioLogado.id,
        usuarioNome: usuarioLogado.nome
      };
      localStorage.setItem(
        `observacao_gestor_${vendaSelecionada.id}`,
        JSON.stringify(obsGestor)
      );
    }

    // Se for Downgrade, enviar para Pagamento Downgrade
    if (isDowngrade) {
      const resultado = enviarParaPagamentoDowngrade(
        vendaSelecionada.id,
        usuarioLogado.id,
        usuarioLogado.nome,
        (vendaSelecionada as any).saldoDevolver
      );

      if (resultado) {
        toast.success(`Venda DOWNGRADE ${vendaSelecionada.id} aprovada! Enviada para Pagamento Downgrade.`);
        handleFecharPainelLateral();
        recarregar();
      } else {
        toast.error('Erro ao aprovar venda. Verifique o status.');
      }
    } else {
      // Fluxo normal: enviar para Conferência Financeiro (ou Fiado se aplicável)
      const resultado = aprovarGestor(
        vendaSelecionada.id,
        usuarioLogado.id,
        usuarioLogado.nome
      );

      if (resultado) {
        const isFiado = vendaSelecionada.pagamentos?.some((p: any) => p.isFiado) || false;
        const destino = isFiado ? 'Conferência - Fiado' : 'Conferência Financeira';
        toast.success(`Venda ${vendaSelecionada.id} aprovada! Enviada para ${destino}.`);
        handleFecharPainelLateral();
        recarregar();
      } else {
        toast.error('Erro ao aprovar venda. Verifique o status.');
      }
    }
  };

  const handleRecusarGestor = () => {
    if (!vendaSelecionada || !motivoRecusa.trim()) {
      toast.error('Por favor, informe o motivo da recusa.');
      return;
    }

    const resultado = recusarGestor(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome,
      motivoRecusa.trim()
    );

    if (resultado) {
      toast.success(`Venda ${vendaSelecionada.id} recusada. Devolvida para lançamento.`);
      setModalRecusar(false);
      handleFecharPainelLateral();
      recarregar();
    } else {
      toast.error('Erro ao recusar venda. Verifique o status.');
    }
  };

  const getStatusBadge = (status: StatusVenda) => {
    const cores = getCorBadgeStatus(status);
    return (
      <Badge 
        variant="outline" 
        className={`${cores.bg} ${cores.text} ${cores.border} whitespace-nowrap dark:bg-opacity-20`}
      >
        {status}
      </Badge>
    );
  };

  const getRowClassName = (status: StatusVenda) => {
    switch (status) {
      case 'Conferência Gestor':
        return 'bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50';
      case 'Devolvido pelo Financeiro':
        return 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50';
      case 'Conferência Financeiro':
        return 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50';
      case 'Finalizado':
        return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50';
      default:
        return '';
    }
  };

  const getLojaNome = (lojaId: string) => {
    return lojas.find(l => l.id === lojaId)?.nome || lojaId;
  };

  const getVendedorNome = (vendedorId: string) => {
    return colaboradores.find(c => c.id === vendedorId)?.nome || vendedorId;
  };

  const podeAprovarOuRecusar = (status: StatusVenda) => {
    return status === 'Conferência Gestor' || status === 'Devolvido pelo Financeiro';
  };

  return (
    <VendasLayout title="Conferência de Vendas - Gestor">
      <div className="flex flex-col xl:flex-row gap-4 xl:gap-6">
        {/* Painel Principal - Tabela */}
        <div className={`transition-all ${vendaSelecionada ? 'w-full xl:flex-1 xl:mr-[480px]' : 'w-full'}`}>
          {/* Cards de somatório por método de pagamento - DINÂMICO */}
          {/* Cards Pendente - vermelho */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
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

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-600 opacity-70" />
                  <div>
                    <p className="text-xs text-red-700 dark:text-red-300">Pendente - Boleto</p>
                    <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.boleto)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cards Conferido - verde */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600 opacity-70" />
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-300">Conferido - Boleto</p>
                    <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.boleto)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cards de resumo de status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-orange-500 opacity-70" />
                  <div>
                    <p className="text-sm text-muted-foreground">Conferência Gestor</p>
                    <p className="text-3xl font-bold text-orange-600">{conferenciaGestorCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Undo2 className="h-8 w-8 text-blue-500 opacity-70" />
                  <div>
                    <p className="text-sm text-muted-foreground">Devolvido Financeiro</p>
                    <p className="text-3xl font-bold text-blue-600">{devolvidoFinanceiroCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Conferência Financeiro</p>
                  <p className="text-3xl font-bold text-yellow-600">{conferenciaFinanceiroCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Finalizado</p>
                  <p className="text-3xl font-bold text-green-600">{finalizadoCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data Início</label>
                  <Input 
                    type="date" 
                    value={filtroDataInicio} 
                    onChange={e => setFiltroDataInicio(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data Fim</label>
                  <Input 
                    type="date" 
                    value={filtroDataFim} 
                    onChange={e => setFiltroDataFim(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Loja</label>
                  <AutocompleteLoja
                    value={filtroLoja === 'todas' ? '' : filtroLoja}
                    onChange={(v) => setFiltroLoja(v || 'todas')}
                    placeholder="Todas as lojas"
                    apenasLojasTipoLoja={true}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Responsável pela Venda</label>
                  <AutocompleteColaborador
                    value={filtroResponsavel === 'todos' ? '' : filtroResponsavel}
                    onChange={(v) => setFiltroResponsavel(v || 'todos')}
                    placeholder="Todos"
                    filtrarPorTipo="vendedoresEGestores"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="Conferência Gestor">Conferência Gestor</SelectItem>
                      <SelectItem value="Devolvido pelo Financeiro">Devolvido pelo Financeiro</SelectItem>
                      <SelectItem value="Conferência Financeiro">Conferência Financeiro</SelectItem>
                      <SelectItem value="Finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Conta Destino</label>
                  <Select value={filtroContaDestino} onValueChange={setFiltroContaDestino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as Contas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Contas</SelectItem>
                      {contasFinanceiras.filter(c => c.status === 'Ativo').map(conta => {
                        const lojaNome = conta.lojaVinculada ? obterNomeLoja(conta.lojaVinculada) : '';
                        return (
                          <SelectItem key={conta.id} value={conta.id}>
                            {lojaNome ? `${lojaNome} - ${conta.nome}` : conta.nome}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={limparFiltros} className="flex-1">
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                  <Button onClick={handleExportar} variant="secondary">
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Venda</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Comprovante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhuma venda encontrada com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendasFiltradas.map(venda => (
                        <TableRow 
                          key={venda.id}
                          className={`${getRowClassName(venda.statusFluxo as StatusVenda)} ${vendaSelecionada?.id === venda.id ? 'ring-2 ring-primary' : ''} cursor-pointer`}
                          onClick={() => handleAbrirPainelLateral(venda)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {venda.id}
                              {(venda as any).tipoOperacao === 'Downgrade' && (venda as any).saldoDevolver > 0 && (
                                <Badge variant="destructive" className="text-xs">DOWNGRADE</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(venda.dataHora).toLocaleDateString('pt-BR')}
                            <span className="text-muted-foreground ml-1">
                              {new Date(venda.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {getLojaNome(venda.lojaVenda)}
                          </TableCell>
                          <TableCell>{getVendedorNome(venda.vendedor)}</TableCell>
                          <TableCell className="max-w-[120px] truncate" title={venda.clienteNome}>
                            {venda.clienteNome}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(venda.total)}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const pag = venda.pagamentos?.find(p => p.comprovante);
                              return pag?.comprovante 
                                ? <ComprovantePreview comprovante={pag.comprovante} comprovanteNome={pag.comprovanteNome} />
                                : <ComprovanteBadgeSemAnexo />;
                            })()}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(venda.statusFluxo as StatusVenda)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); navigate(`/vendas/${venda.id}`); }}
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {podeAprovarOuRecusar(venda.statusFluxo as StatusVenda) && (
                                <Button 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleAbrirPainelLateral(venda); }}
                                  title="Conferir"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Conferir
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

          {/* Rodapé */}
          <div className="mt-4 flex flex-wrap justify-between items-center text-sm text-muted-foreground gap-2">
            <span>Exibindo {vendasFiltradas.length} de {vendas.length} registros</span>
            <span className="flex flex-wrap gap-2">
              <span>Gestor: <strong className="text-orange-600">{conferenciaGestorCount}</strong></span>
              <span>|</span>
              <span>Devolvido: <strong className="text-blue-600">{devolvidoFinanceiroCount}</strong></span>
              <span>|</span>
              <span>Financeiro: <strong className="text-yellow-600">{conferenciaFinanceiroCount}</strong></span>
              <span>|</span>
              <span>Finalizado: <strong className="text-green-600">{finalizadoCount}</strong></span>
            </span>
          </div>
        </div>

        {/* Painel Lateral - Fixed full-height (modelo Financeiro) */}
        {vendaSelecionada && (
          <div className="w-full xl:w-[480px] xl:min-w-[460px] xl:max-w-[520px] xl:fixed xl:right-0 xl:top-0 xl:bottom-0 h-fit xl:h-screen flex-shrink-0 xl:z-30">
            <Card className="xl:h-full xl:rounded-none xl:border-l xl:border-t-0 xl:border-b-0 xl:border-r-0 overflow-y-auto">
              <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Detalhes da Venda</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleFecharPainelLateral}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Resumo completo padronizado */}
                <VendaResumoCompleto venda={vendaSelecionada} readOnly showCustos={true} />

                {/* Validação de Pagamentos - Checkboxes */}
                {validacoesPagamento.length > 0 && podeAprovarOuRecusar(vendaSelecionada.statusFluxo as StatusVenda) && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 text-sm mb-3">
                      Validação de Métodos de Pagamento
                    </h4>
                    <div className="space-y-2">
                      {validacoesPagamento.map((validacao, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Checkbox
                            id={`gestor-pagamento-${idx}`}
                            checked={validacao.validadoGestor}
                            onCheckedChange={() => handleToggleValidacao(validacao.metodoPagamento)}
                          />
                          <Label 
                            htmlFor={`gestor-pagamento-${idx}`}
                            className="flex-1 cursor-pointer font-normal text-sm"
                          >
                            {validacao.metodoPagamento}
                          </Label>
                          {validacao.validadoGestor && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campo de Observação do Gestor */}
                {podeAprovarOuRecusar(vendaSelecionada.statusFluxo as StatusVenda) && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold text-sm">Observação para o Financeiro</Label>
                    </div>
                    <Textarea
                      placeholder="Adicione observações sobre esta conferência para o financeiro (ex: cliente solicitou parcelamento especial, pagamento em duas etapas, etc)"
                      value={observacaoGestor}
                      onChange={(e) => setObservacaoGestor(e.target.value.slice(0, 1000))}
                      rows={3}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {observacaoGestor.length}/1000 caracteres
                    </p>
                  </div>
                )}

                {/* Aviso se devolvido pelo financeiro */}
                {vendaSelecionada.statusFluxo === 'Devolvido pelo Financeiro' && vendaSelecionada.devolucaoFinanceiro && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                      Motivo da Devolução pelo Financeiro:
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      {vendaSelecionada.devolucaoFinanceiro.motivo}
                    </p>
                  </div>
                )}

                {/* Botões de ação */}
                {podeAprovarOuRecusar(vendaSelecionada.statusFluxo as StatusVenda) && (
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleFinalizarAprovacao}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Conferir
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => navigate(`/vendas/editar/${vendaSelecionada.id}`)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={handleAbrirModalRecusar}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Recusar
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={handleFecharPainelLateral}
                    >
                      Voltar
                    </Button>
                  </div>
                )}

                {/* Se não pode aprovar (já aprovado ou finalizado) */}
                {!podeAprovarOuRecusar(vendaSelecionada.statusFluxo as StatusVenda) && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-center">
                    <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Esta venda não pode ser editada neste momento.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: {vendaSelecionada.statusFluxo}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal de Recusa */}
      <Dialog open={modalRecusar} onOpenChange={setModalRecusar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Recusar Venda
            </DialogTitle>
            <DialogDescription>
              Ao recusar, a venda será devolvida para o lançador corrigir.
            </DialogDescription>
          </DialogHeader>
          
          {vendaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">ID Venda</p>
                  <p className="font-medium">{vendaSelecionada.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{vendaSelecionada.clienteNome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium">{formatCurrency(vendaSelecionada.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status Atual</p>
                  <p className="font-medium">{vendaSelecionada.statusFluxo}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="motivoRecusa" className="text-sm font-medium">
                  Motivo da Recusa <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="motivoRecusa"
                  placeholder="Descreva o motivo da recusa..."
                  value={motivoRecusa}
                  onChange={(e) => setMotivoRecusa(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRecusar(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRecusarGestor}
              disabled={!motivoRecusa.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
