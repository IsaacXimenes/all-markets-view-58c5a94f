import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ComprovantePreview } from '@/components/vendas/ComprovantePreview';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { getOrdensServico, getOrdemServicoById, updateOrdemServico, formatCurrency, OrdemServico } from '@/utils/assistenciaApi';
import { getClientes, getContasFinanceiras } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { Eye, Download, Filter, X, Check, XCircle, Clock, DollarSign, CreditCard, Banknote, Smartphone, Wallet, Lock, MessageSquare, Paperclip } from 'lucide-react';
import { ComprovanteBadgeSemAnexo } from '@/components/vendas/ComprovantePreview';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency as formatCurrencyUtil } from '@/utils/formatUtils';

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

export default function OSConferenciaGestor() {
  const navigate = useNavigate();
  const [ordensServico, setOrdensServico] = useState(getOrdensServico());
  const clientes = getClientes();
  const contasFinanceiras = getContasFinanceiras();
  const { obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const user = useAuthStore((s) => s.user);

  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('todas');
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Painel lateral
  const [osSelecionada, setOsSelecionada] = useState<OrdemServico | null>(null);
  const [validacoesPagamento, setValidacoesPagamento] = useState<ValidacaoPagamento[]>([]);
  const [observacaoGestor, setObservacaoGestor] = useState('');

  // Modal recusa
  const [modalRecusar, setModalRecusar] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const recarregar = () => setOrdensServico(getOrdensServico());

  // Filtrar OSs para conferência (pendente, aguardando financeiro, liquidado)
  const osConferencia = useMemo(() => {
    let resultado = ordensServico.filter(os => {
      return (os.status === 'Conferência do Gestor' && os.proximaAtuacao === 'Gestor') ||
             (os.status === 'Aguardando Financeiro' && os.proximaAtuacao === 'Financeiro') ||
             os.status === 'Liquidado';
    });

    if (filtroDataInicio) {
      resultado = resultado.filter(os => new Date(os.dataHora) >= new Date(filtroDataInicio));
    }
    if (filtroDataFim) {
      const dataFim = new Date(filtroDataFim);
      dataFim.setHours(23, 59, 59);
      resultado = resultado.filter(os => new Date(os.dataHora) <= dataFim);
    }
    if (filtroLoja !== 'todas') {
      resultado = resultado.filter(os => os.lojaId === filtroLoja);
    }
    if (filtroTecnico !== 'todos') {
      resultado = resultado.filter(os => os.tecnicoId === filtroTecnico);
    }
    if (filtroStatus !== 'todos') {
      resultado = resultado.filter(os => os.status === filtroStatus);
    }

    resultado.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());

    return resultado;
  }, [ordensServico, filtroDataInicio, filtroDataFim, filtroLoja, filtroTecnico, filtroStatus]);

  // Somatórios por método de pagamento
  const somatorioPagamentos = useMemo(() => {
    const totais = {
      pendente: { cartaoCredito: 0, cartaoDebito: 0, pix: 0, dinheiro: 0, boleto: 0 },
      conferido: { cartaoCredito: 0, cartaoDebito: 0, pix: 0, dinheiro: 0, boleto: 0 }
    };

    osConferencia.forEach(os => {
      const isPendente = os.status === 'Conferência do Gestor';
      const target = isPendente ? totais.pendente : totais.conferido;

      os.pagamentos?.forEach(pag => {
        const meio = pag.meio.toLowerCase();
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
  }, [osConferencia]);

  // Contadores
  const pendentes = osConferencia.filter(os => os.status === 'Conferência do Gestor').length;
  const aguardandoFinanceiro = osConferencia.filter(os => os.status === 'Aguardando Financeiro').length;
  const liquidadas = osConferencia.filter(os => os.status === 'Liquidado').length;

  const limparFiltros = () => {
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroLoja('todas');
    setFiltroTecnico('todos');
    setFiltroStatus('todos');
  };

  const handleExportar = () => {
    const csvContent = osConferencia.map(os => {
      const cliente = clientes.find(c => c.id === os.clienteId);
      const totalPago = os.pagamentos.reduce((acc, p) => acc + p.valor, 0);
      return [os.id, format(new Date(os.dataHora), 'dd/MM/yyyy'), cliente?.nome || '-', obterNomeLoja(os.lojaId), obterNomeColaborador(os.tecnicoId), os.valorCustoTecnico || 0, os.valorVendaTecnico || 0, totalPago, os.status].join(';');
    });
    const header = 'Nº OS;Data;Cliente;Loja;Técnico;V.Custo;V.Venda;Total Pago;Status';
    const blob = new Blob([header + '\n' + csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conferencia-gestor-assistencia-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Dados exportados com sucesso!');
  };

  const handleAbrirPainelLateral = (os: OrdemServico) => {
    const fresh = getOrdemServicoById(os.id);
    setOsSelecionada(fresh || os);

    const metodos = (fresh || os).pagamentos?.map(p => p.meio) || [];
    const metodosUnicos = [...new Set(metodos)];

    const storedValidacoes = localStorage.getItem(`validacao_pagamentos_os_${os.id}`);
    const existingValidacoes = storedValidacoes ? JSON.parse(storedValidacoes) : [];

    const validacoes = metodosUnicos.map(metodo => {
      const existing = existingValidacoes.find((v: ValidacaoPagamento) => v.metodoPagamento === metodo);
      return {
        metodoPagamento: metodo,
        validadoGestor: existing?.validadoGestor || false,
        dataValidacao: existing?.dataValidacao
      };
    });

    setValidacoesPagamento(validacoes);
    setObservacaoGestor('');
    setMotivoRecusa('');
  };

  const handleFecharPainelLateral = () => {
    setOsSelecionada(null);
    setValidacoesPagamento([]);
    setObservacaoGestor('');
    setMotivoRecusa('');
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

  const handleAprovar = () => {
    if (!osSelecionada) return;

    const naoValidados = validacoesPagamento.filter(v => !v.validadoGestor);
    if (naoValidados.length > 0) {
      toast.error('Todos os métodos de pagamento devem ser validados antes de conferir.');
      return;
    }

    // Salvar validações
    localStorage.setItem(
      `validacao_pagamentos_os_${osSelecionada.id}`,
      JSON.stringify(validacoesPagamento)
    );

    // Salvar observação
    if (observacaoGestor.trim()) {
      const obsGestor: ObservacaoGestor = {
        texto: observacaoGestor.trim(),
        dataHora: new Date().toISOString(),
        usuarioId: user?.colaborador?.id || 'gestor',
        usuarioNome: user?.colaborador?.nome || 'Gestor'
      };
      localStorage.setItem(
        `observacao_gestor_os_${osSelecionada.id}`,
        JSON.stringify(obsGestor)
      );
    }

    updateOrdemServico(osSelecionada.id, {
      status: 'Aguardando Financeiro',
      proximaAtuacao: 'Financeiro',
      timeline: [...osSelecionada.timeline, {
        data: new Date().toISOString(),
        tipo: 'aprovacao',
        descricao: 'Conferência aprovada pelo gestor. Enviada para o financeiro.',
        responsavel: user?.colaborador?.nome || 'Gestor'
      }]
    });
    toast.success(`OS ${osSelecionada.id} aprovada! Enviada para o financeiro.`);
    handleFecharPainelLateral();
    recarregar();
  };

  const handleRecusar = () => {
    if (!osSelecionada || !motivoRecusa.trim()) {
      toast.error('Informe o motivo da recusa.');
      return;
    }
    updateOrdemServico(osSelecionada.id, {
      status: 'Serviço concluído' as any,
      proximaAtuacao: 'Atendente',
      timeline: [...osSelecionada.timeline, {
        data: new Date().toISOString(),
        tipo: 'rejeicao',
        descricao: `Conferência recusada pelo gestor. Motivo: ${motivoRecusa}`,
        responsavel: user?.colaborador?.nome || 'Gestor'
      }]
    });
    toast.success(`OS ${osSelecionada.id} recusada. Devolvida para o atendente.`);
    setModalRecusar(false);
    handleFecharPainelLateral();
    recarregar();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Conferência do Gestor':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Pendente Conferência</Badge>;
      case 'Aguardando Financeiro':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Aguardando Financeiro</Badge>;
      case 'Liquidado':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Liquidado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRowClassName = (status: string) => {
    switch (status) {
      case 'Conferência do Gestor':
        return 'bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50';
      case 'Aguardando Financeiro':
        return 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50';
      case 'Liquidado':
        return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50';
      default:
        return '';
    }
  };

  const podeAprovar = (os: OrdemServico) => {
    return os.status === 'Conferência do Gestor' && os.proximaAtuacao === 'Gestor';
  };

  return (
    <OSLayout title="Conferência Gestor - Assistência">
      <div className="flex flex-col xl:flex-row gap-4 xl:gap-6">
        {/* Painel Principal */}
        <div className={`transition-all ${osSelecionada ? 'w-full xl:flex-1 xl:mr-[480px]' : 'w-full'}`}>
          {/* Cards Pendentes - vermelho */}
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

          {/* Cards Conferidos - verde */}
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

          {/* Cards de contadores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-orange-500 opacity-70" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pendente Conferência</p>
                    <p className="text-3xl font-bold text-orange-600">{pendentes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-blue-500 opacity-70" />
                  <div>
                    <p className="text-sm text-muted-foreground">Aguardando Financeiro</p>
                    <p className="text-3xl font-bold text-blue-600">{aguardandoFinanceiro}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Check className="h-8 w-8 text-green-500 opacity-70" />
                  <div>
                    <p className="text-sm text-muted-foreground">Liquidadas</p>
                    <p className="text-3xl font-bold text-green-600">{liquidadas}</p>
                  </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data Início</label>
                  <Input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data Fim</label>
                  <Input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
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
                  <label className="text-sm text-muted-foreground mb-1 block">Técnico</label>
                  <AutocompleteColaborador
                    value={filtroTecnico === 'todos' ? '' : filtroTecnico}
                    onChange={(v) => setFiltroTecnico(v || 'todos')}
                    placeholder="Todos"
                    filtrarPorTipo="tecnicos"
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
                      <SelectItem value="Pendente de Pagamento">Pendente Conferência</SelectItem>
                      <SelectItem value="Aguardando Financeiro">Aguardando Financeiro</SelectItem>
                      <SelectItem value="Liquidado">Liquidado</SelectItem>
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
                      <TableHead>Nº OS</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>V. Custo</TableHead>
                      <TableHead>V. Venda</TableHead>
                      <TableHead>Total Pago</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Anexo</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {osConferencia.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          Nenhuma OS para conferência
                        </TableCell>
                      </TableRow>
                    ) : (
                      osConferencia.map(os => {
                        const cliente = clientes.find(c => c.id === os.clienteId);
                        const totalPago = os.pagamentos.reduce((acc, p) => acc + p.valor, 0);
                        return (
                          <TableRow
                            key={os.id}
                            className={cn(
                              'cursor-pointer',
                              getRowClassName(os.status),
                              osSelecionada?.id === os.id && 'ring-2 ring-primary'
                            )}
                            onClick={() => handleAbrirPainelLateral(os)}
                          >
                            <TableCell className="font-mono text-xs font-medium">{os.id}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(os.dataHora), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate">{cliente?.nome || '-'}</TableCell>
                            <TableCell className="text-xs">{obterNomeLoja(os.lojaId)}</TableCell>
                            <TableCell className="text-xs">{obterNomeColaborador(os.tecnicoId)}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(os.valorCustoTecnico || 0)}</TableCell>
                            <TableCell className="text-sm font-medium">{formatCurrency(os.valorVendaTecnico || 0)}</TableCell>
                            <TableCell className="text-sm font-medium">{formatCurrency(totalPago)}</TableCell>
                            <TableCell>{getStatusBadge(os.status)}</TableCell>
                            <TableCell>
                              {os.pagamentos?.some(p => p.comprovante) ? (
                                <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700 text-xs">
                                  <Paperclip className="h-3 w-3 mr-1" /> Contém Anexo
                                </Badge>
                              ) : (
                                <ComprovanteBadgeSemAnexo />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="sm" onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/os/assistencia/${os.id}`);
                                }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {podeAprovar(os) && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleAbrirPainelLateral(os); }}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Conferir
                                  </Button>
                                )}
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
            <span>Exibindo {osConferencia.length} registros</span>
            <span className="flex flex-wrap gap-2">
              <span>Pendente: <strong className="text-orange-600">{pendentes}</strong></span>
              <span>|</span>
              <span>Financeiro: <strong className="text-blue-600">{aguardandoFinanceiro}</strong></span>
              <span>|</span>
              <span>Liquidado: <strong className="text-green-600">{liquidadas}</strong></span>
            </span>
          </div>
        </div>

        {/* Painel Lateral - Fixed full-height (modelo Vendas) */}
        {osSelecionada && (
          <div className="w-full xl:w-[480px] xl:min-w-[460px] xl:max-w-[520px] xl:fixed xl:right-0 xl:top-0 xl:bottom-0 h-fit xl:h-screen flex-shrink-0 xl:z-30">
            <Card className="xl:h-full xl:rounded-none xl:border-l xl:border-t-0 xl:border-b-0 xl:border-r-0 overflow-y-auto">
              <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Detalhes da OS</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleFecharPainelLateral}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Info básica */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Nº OS</p>
                    <p className="font-medium">{osSelecionada.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Data</p>
                    <p className="font-medium">{format(new Date(osSelecionada.dataHora), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cliente</p>
                    <p className="font-medium truncate">{clientes.find(c => c.id === osSelecionada.clienteId)?.nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Loja</p>
                    <p className="font-medium truncate">{obterNomeLoja(osSelecionada.lojaId)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Técnico</p>
                    <p className="font-medium truncate">{obterNomeColaborador(osSelecionada.tecnicoId)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Modelo</p>
                    <p className="font-medium truncate">{osSelecionada.modeloAparelho || '-'}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex justify-center">
                  {getStatusBadge(osSelecionada.status)}
                </div>

                {/* Resumo da conclusão */}
                {osSelecionada.resumoConclusao && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm font-medium mb-1">Resumo da Conclusão do Técnico</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{osSelecionada.resumoConclusao}</p>
                  </div>
                )}

                {/* Valores */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Valor Custo</p>
                      <p className="text-lg font-bold">{formatCurrency(osSelecionada.valorCustoTecnico || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 dark:border-green-800">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Valor Venda</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(osSelecionada.valorVendaTecnico || 0)}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Pagamentos Registrados</h4>
                  {osSelecionada.pagamentos.length > 0 ? (
                    <div className="space-y-2">
                      {osSelecionada.pagamentos.map((pag, i) => {
                        const contaDestino = pag.contaDestino 
                          ? contasFinanceiras.find(c => c.id === pag.contaDestino)
                          : null;
                        const isImage = pag.comprovante?.startsWith('data:image/');
                        const isPdf = pag.comprovante?.startsWith('data:application/pdf');
                        return (
                          <div key={i} className="text-xs p-2 bg-muted/50 rounded space-y-2">
                            <div className="flex justify-between">
                              <span>{pag.meio}</span>
                              <span className="font-medium">{formatCurrency(pag.valor)}</span>
                            </div>
                            {contaDestino && (
                              <div className="text-muted-foreground">
                                Conta: <span className="font-medium text-foreground">{contaDestino.nome}</span>
                              </div>
                            )}
                            {pag.comprovante && (
                              <ComprovantePreview
                                comprovante={pag.comprovante}
                                comprovanteNome={pag.comprovanteNome || 'Comprovante'}
                                size="md"
                              />
                            )}
                            {!pag.comprovante && (
                              <span className="text-muted-foreground italic">Sem comprovante anexado</span>
                            )}
                          </div>
                        );
                      })}
                      <div className="flex justify-between p-2 bg-muted rounded font-bold text-sm">
                        <span>Total</span>
                        <span>{formatCurrency(osSelecionada.pagamentos.reduce((a, p) => a + p.valor, 0))}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
                  )}
                </div>

                {/* Validação de Métodos de Pagamento - Checkboxes */}
                {validacoesPagamento.length > 0 && podeAprovar(osSelecionada) && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 text-sm mb-3">
                      Validação de Métodos de Pagamento
                    </h4>
                    <div className="space-y-2">
                      {validacoesPagamento.map((validacao, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Checkbox
                            id={`os-pagamento-${idx}`}
                            checked={validacao.validadoGestor}
                            onCheckedChange={() => handleToggleValidacao(validacao.metodoPagamento)}
                          />
                          <Label
                            htmlFor={`os-pagamento-${idx}`}
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
                {podeAprovar(osSelecionada) && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold text-sm">Observação para o Financeiro</Label>
                    </div>
                    <Textarea
                      placeholder="Adicione observações sobre esta conferência para o financeiro..."
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

                {/* Botões de ação */}
                {podeAprovar(osSelecionada) && (
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleAprovar}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Conferir
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => { setMotivoRecusa(''); setModalRecusar(true); }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Recusar
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={handleFecharPainelLateral}>
                      Voltar
                    </Button>
                  </div>
                )}

                {/* Se não pode aprovar (já conferido ou liquidado) */}
                {!podeAprovar(osSelecionada) && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-center">
                    <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Esta OS não pode ser editada neste momento.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: {osSelecionada.status}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal recusa */}
      <Dialog open={modalRecusar} onOpenChange={setModalRecusar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Recusar Conferência
            </DialogTitle>
            <DialogDescription>
              Ao recusar, a OS será devolvida para o atendente corrigir.
            </DialogDescription>
          </DialogHeader>
          {osSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Nº OS</p>
                  <p className="font-medium">{osSelecionada.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{clientes.find(c => c.id === osSelecionada.clienteId)?.nome || '-'}</p>
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
            <Button variant="outline" onClick={() => setModalRecusar(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRecusar} disabled={!motivoRecusa.trim()}>
              <XCircle className="h-4 w-4 mr-2" />
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
