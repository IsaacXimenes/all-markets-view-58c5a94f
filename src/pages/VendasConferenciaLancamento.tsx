import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Eye, Download, Filter, X, Pencil, Check, Clock, AlertTriangle, CreditCard, Wallet, Smartphone, Banknote, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { ComprovantePreview, ComprovanteBadgeSemAnexo } from '@/components/vendas/ComprovantePreview';
import { useFluxoVendas } from '@/hooks/useFluxoVendas';
import { 
  aprovarLancamento, 
  getCorBadgeStatus,
  exportFluxoToCSV,
  VendaComFluxo,
  StatusVenda
} from '@/utils/fluxoVendasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { useCadastroStore } from '@/store/cadastroStore';
import { toast } from 'sonner';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';

// Mock do usuário logado
const usuarioLogado = { id: 'COL-007', nome: 'Carlos Lançador', cargo: 'Vendedor' };

export default function VendasConferenciaLancamento() {
  const navigate = useNavigate();
  const { obterLojasAtivas, obterColaboradoresAtivos, obterVendedores, obterGestores, obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  // Incluir histórico para manter vendas na tela após aprovação
  const { vendas, recarregar, contadores } = useFluxoVendas({
    status: ['Aguardando Conferência', 'Recusada - Gestor', 'Feito Sinal'],
    incluirHistorico: true // Manter vendas mesmo após aprovação
  });
  
  const lojas = obterLojasAtivas();
  const colaboradores = obterColaboradoresAtivos();
  
  // Verificar se usuário é gestor ou financeiro
  const isGestorOuFinanceiro = useMemo(() => {
    const colaborador = colaboradores.find(c => c.id === usuarioLogado.id);
    if (!colaborador) return false;
    // Usando as flags do novo modelo
    return colaborador.eh_gestor;
  }, [colaboradores]);
  
  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroVendedor, setFiltroVendedor] = useState('todos');
  
  // Modal de aprovação
  const [modalAprovar, setModalAprovar] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaComFluxo | null>(null);

  // Vendedores disponíveis para filtro (usando a flag eh_vendedor)
  const vendedoresDisponiveis = useMemo(() => {
    return colaboradores.filter(col => col.eh_vendedor);
  }, [colaboradores]);

  // Filtrar vendas
  const vendasFiltradas = useMemo(() => {
    let resultado = [...vendas];

    // Filtro por vendedor (opcional - permite ver todas ou filtrar por vendedor específico)
    if (filtroVendedor !== 'todos') {
      resultado = resultado.filter(v => v.vendedor === filtroVendedor);
    }

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
    if (filtroCliente) {
      resultado = resultado.filter(v => 
        v.clienteNome.toLowerCase().includes(filtroCliente.toLowerCase())
      );
    }
    if (filtroStatus !== 'todos') {
      resultado = resultado.filter(v => v.statusFluxo === filtroStatus);
    }

    // Ordenar: Feito Sinal primeiro, depois Recusadas, depois por data
    resultado.sort((a, b) => {
      const ordem: Record<string, number> = {
        'Feito Sinal': 0,
        'Recusada - Gestor': 1,
        'Aguardando Conferência': 2
      };
      const ordemA = ordem[a.statusFluxo || ''] ?? 3;
      const ordemB = ordem[b.statusFluxo || ''] ?? 3;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
    });

    return resultado;
  }, [vendas, filtroDataInicio, filtroDataFim, filtroCliente, filtroStatus, filtroVendedor, isGestorOuFinanceiro]);

  // Calcular somatórios por método de pagamento - DINÂMICO baseado nas vendas filtradas
  // Separado por Pendente (Aguardando Conferência, Recusada - Gestor, Feito Sinal) e Conferido (aprovado/enviado para gestor)
  const somatorioPagamentos = useMemo(() => {
    const totais = {
      pendente: {
        cartaoCredito: 0,
        cartaoDebito: 0,
        pix: 0,
        dinheiro: 0,
        sinal: 0,
        boleto: 0
      },
      conferido: {
        cartaoCredito: 0,
        cartaoDebito: 0,
        pix: 0,
        dinheiro: 0,
        sinal: 0,
        boleto: 0
      }
    };

    vendasFiltradas.forEach(venda => {
      const isPendente = venda.statusFluxo === 'Aguardando Conferência' || 
                         venda.statusFluxo === 'Recusada - Gestor' || 
                         venda.statusFluxo === 'Feito Sinal';
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
        } else if (meio.includes('sinal')) {
          target.sinal += pag.valor;
        } else if (meio.includes('boleto') || meio.includes('crediário') || meio.includes('crediario')) {
          target.boleto += pag.valor;
        }
      });
    });

    return totais;
  }, [vendasFiltradas]);

  const limparFiltros = () => {
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroCliente('');
    setFiltroStatus('todos');
    if (isGestorOuFinanceiro) {
      setFiltroVendedor('todos');
    }
  };

  const handleExportar = () => {
    const dataAtual = new Date().toISOString().split('T')[0];
    exportFluxoToCSV(vendasFiltradas, `conferencia-lancamento-${dataAtual}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleAbrirModalAprovar = (venda: VendaComFluxo) => {
    setVendaSelecionada(venda);
    setModalAprovar(true);
  };

  const handleAprovarLancamento = () => {
    if (!vendaSelecionada) return;

    const resultado = aprovarLancamento(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome
    );

    if (resultado) {
      toast.success(`Lançamento da venda ${vendaSelecionada.id} aprovado! Enviado para Conferência do Gestor.`);
      setModalAprovar(false);
      setVendaSelecionada(null);
      recarregar();
    } else {
      toast.error('Erro ao aprovar lançamento. Verifique o status da venda.');
    }
  };

  const getStatusBadge = (status: StatusVenda) => {
    const cores = getCorBadgeStatus(status);
    return (
      <Badge 
        variant="outline" 
        className={`${cores.bg} ${cores.text} ${cores.border} whitespace-nowrap dark:bg-opacity-20`}
      >
        {status === 'Feito Sinal' && <AlertCircle className="h-3 w-3 mr-1" />}
        {status}
      </Badge>
    );
  };

  // Verificar se tem pagamento Sinal
  const temPagamentoSinal = (venda: VendaComFluxo) => {
    return venda.pagamentos?.some(p => p.meioPagamento.toLowerCase().includes('sinal')) || 
           venda.statusFluxo === 'Feito Sinal' ||
           venda.valorSinal !== undefined;
  };

  // Calcular valor pendente do sinal
  const calcularValorPendenteSinal = (venda: VendaComFluxo) => {
    if (venda.valorPendenteSinal !== undefined) {
      return venda.valorPendenteSinal;
    }
    const pagamentoSinal = venda.pagamentos?.find(p => p.meioPagamento.toLowerCase().includes('sinal'));
    if (pagamentoSinal) {
      return venda.total - pagamentoSinal.valor;
    }
    return null;
  };

  const getRowClassName = (status: StatusVenda, venda: VendaComFluxo) => {
    // Linha âmbar para vendas com Sinal (Fiado)
    if (temPagamentoSinal(venda) || status === 'Feito Sinal') {
      return 'bg-amber-500/10';
    }
    if (status === 'Recusada - Gestor') {
      return 'bg-red-500/10';
    }
    return 'bg-blue-500/10';
  };

  const getLojaNome = (lojaId: string) => {
    return lojas.find(l => l.id === lojaId)?.nome || lojaId;
  };

  const getVendedorNome = (vendedorId: string) => {
    return colaboradores.find(c => c.id === vendedorId)?.nome || vendedorId;
  };

  const pendentesCount = vendas.filter(v => v.statusFluxo === 'Aguardando Conferência').length;
  const recusadasCount = vendas.filter(v => v.statusFluxo === 'Recusada - Gestor').length;
  const sinalCount = vendas.filter(v => v.statusFluxo === 'Feito Sinal').length;

  return (
    <VendasLayout title="Conferência - Lançamento de Vendas">
      {/* Cards Pendente - vermelho */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
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

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 opacity-70" />
              <div>
                <p className="text-xs text-red-700 dark:text-red-300">Pendente - Sinal</p>
                <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.sinal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Conferido - verde */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
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

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-green-600 opacity-70" />
              <div>
                <p className="text-xs text-green-700 dark:text-green-300">Conferido - Sinal</p>
                <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.sinal)}</p>
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
              <Clock className="h-8 w-8 text-blue-500 opacity-70" />
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Conferência</p>
                <p className="text-3xl font-bold text-blue-600">{pendentesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-70" />
              <div>
                <p className="text-sm text-muted-foreground">Recusadas pelo Gestor</p>
                <p className="text-3xl font-bold text-red-600">{recusadasCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600 opacity-70" />
              <div>
                <p className="text-sm text-muted-foreground">Feito Sinal</p>
                <p className="text-3xl font-bold text-red-600">{sinalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total para Análise</p>
              <p className="text-3xl font-bold">{vendas.length}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
              <label className="text-sm text-muted-foreground mb-1 block">Cliente</label>
              <Input 
                placeholder="Buscar por cliente..." 
                value={filtroCliente} 
                onChange={e => setFiltroCliente(e.target.value)} 
              />
            </div>
            {/* Filtro de Vendedor - só aparece para gestores */}
            {isGestorOuFinanceiro && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Filtrar por Vendedor</label>
                <AutocompleteColaborador
                  value={filtroVendedor === 'todos' ? '' : filtroVendedor}
                  onChange={(v) => setFiltroVendedor(v || 'todos')}
                  placeholder="Todos os Vendedores"
                  filtrarPorTipo="vendedoresEGestores"
                />
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Aguardando Conferência">Aguardando Conferência</SelectItem>
                  <SelectItem value="Recusada - Gestor">Recusada - Gestor</SelectItem>
                  <SelectItem value="Feito Sinal">Feito Sinal</SelectItem>
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
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Valor Pendente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda encontrada para conferência de lançamento.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendasFiltradas.map(venda => {
                    const valorPendente = calcularValorPendenteSinal(venda);
                    const isSinal = temPagamentoSinal(venda);
                    
                    return (
                      <TableRow 
                        key={venda.id}
                        className={getRowClassName(venda.statusFluxo as StatusVenda, venda)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {venda.id}
                            {(venda as any).tipoOperacao === 'Downgrade' && (venda as any).saldoDevolver > 0 && (
                              <Badge className="bg-orange-500 text-white text-xs">
                                <ArrowLeftRight className="h-3 w-3 mr-1" />
                                DOWNGRADE
                              </Badge>
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
                        <TableCell className="text-right">
                          {isSinal && valorPendente !== null ? (
                            <span className="font-medium text-red-600">
                              {formatCurrency(valorPendente)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(venda.statusFluxo as StatusVenda)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/vendas/${venda.id}`)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {venda.statusFluxo !== 'Finalizado' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/vendas/editar/${venda.id}`)}
                                title="Editar venda"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {(() => {
                              // Função para verificar se venda pode ser aprovada
                              const podeAprovarVenda = () => {
                                // Se for Feito Sinal, verificar se pagamentos completam o valor
                                if (venda.statusFluxo === 'Feito Sinal') {
                                  const totalPagamentos = venda.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0;
                                  return totalPagamentos >= venda.total;
                                }
                                
                                // Para outros status, manter lógica atual
                                return venda.statusFluxo !== 'Conferência Gestor' && 
                                       venda.statusFluxo !== 'Conferência Financeiro' && 
                                       venda.statusFluxo !== 'Finalizado';
                              };

                              return podeAprovarVenda() ? (
                                <Button 
                                  size="sm"
                                  onClick={() => handleAbrirModalAprovar(venda)}
                                  title="Aprovar lançamento"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Conferir
                                </Button>
                              ) : null;
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
          <span>Aguardando: <strong className="text-blue-600">{pendentesCount}</strong></span>
          <span>|</span>
          <span>Recusadas: <strong className="text-red-600">{recusadasCount}</strong></span>
          <span>|</span>
          <span>Sinal: <strong className="text-red-600">{sinalCount}</strong></span>
        </span>
      </div>

      {/* Modal de Aprovação */}
      <Dialog open={modalAprovar} onOpenChange={setModalAprovar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferir Lançamento</DialogTitle>
            <DialogDescription>
              Você está prestes a conferir o lançamento da venda e enviá-la para conferência do gestor.
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
                  <p className="font-medium text-lg">{formatCurrency(vendaSelecionada.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {new Date(vendaSelecionada.dataHora).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Comprovantes de Pagamento */}
              {vendaSelecionada.pagamentos && vendaSelecionada.pagamentos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Comprovantes de Pagamento:</p>
                  <div className="space-y-2">
                    {vendaSelecionada.pagamentos.map((pag, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pag.meioPagamento}</span>
                          <span className="text-muted-foreground">{formatCurrency(pag.valor)}</span>
                        </div>
                        <div>
                          {pag.comprovante ? (
                            <ComprovantePreview comprovante={pag.comprovante} comprovanteNome={pag.comprovanteNome} />
                          ) : (
                            <ComprovanteBadgeSemAnexo />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exibir chave PIX para Downgrade */}
              {(vendaSelecionada as any).tipoOperacao === 'Downgrade' && (vendaSelecionada as any).chavePix && (
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-300">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                    Chave PIX para Devolução:
                  </p>
                  <p className="font-mono text-lg font-bold text-orange-800 dark:text-orange-200">
                    {(vendaSelecionada as any).chavePix}
                  </p>
                </div>
              )}

              {vendaSelecionada.statusFluxo === 'Recusada - Gestor' && vendaSelecionada.recusaGestor && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                    Motivo da Recusa Anterior:
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {vendaSelecionada.recusaGestor.motivo}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recusado por {vendaSelecionada.recusaGestor.usuarioNome} em{' '}
                    {new Date(vendaSelecionada.recusaGestor.dataHora).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p>Ao conferir, a venda será enviada para:</p>
                <p className="font-medium text-foreground mt-1">📋 Conferência do Gestor</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAprovar(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAprovarLancamento} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Confirmar Conferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
