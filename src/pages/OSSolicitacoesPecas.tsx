import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUrlTabs } from '@/hooks/useUrlTabs';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getSolicitacoes, 
  aprovarSolicitacao, 
  rejeitarSolicitacao,
  cancelarSolicitacao,
  encaminharParaFinanceiro,
  agruparParaPagamento,
  calcularSLASolicitacao,
  formatCurrency,
  SolicitacaoPeca,
  tratarPecaOSCancelada,
  isPecaPaga
} from '@/utils/solicitacaoPecasApi';
import { getFornecedores, addFornecedor } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { useAuthStore } from '@/store/authStore';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { getOrdemServicoById, updateOrdemServico } from '@/utils/assistenciaApi';
import { Eye, Check, X, Package, Clock, AlertTriangle, Send, Plus, Edit, History, DollarSign, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function OSSolicitacoesPecas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState(getSolicitacoes());
  const { obterLojasTipoLoja, obterNomeLoja, obterColaboradoresAtivos } = useCadastroStore();
  const user = useAuthStore(state => state.user);
  const lojas = obterLojasTipoLoja();
  const fornecedores = getFornecedores().filter(f => f.status === 'Ativo');
  const colaboradores = obterColaboradoresAtivos();

  // Filtros
  const [filtroLoja, setFiltroLoja] = useState('todos');
  const [filtroPeca, setFiltroPeca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroNumeroOS, setFiltroNumeroOS] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('todos');

  // Modal aprovar com campos por peça
  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [solicitacoesSelecionadasAprovar, setSolicitacoesSelecionadasAprovar] = useState<SolicitacaoPeca[]>([]);
  const [fornecedoresPorPeca, setFornecedoresPorPeca] = useState<{[key: string]: { fornecedorId: string; valorPeca: string; formaPagamento: string; origemPeca: string; observacao: string; bancoDestinatario: string; chavePix: string }}>({});
  const [responsavelCompraGlobal, setResponsavelCompraGlobal] = useState('');
  const [dataRecebimentoGlobal, setDataRecebimentoGlobal] = useState('');
  const [dataEnvioGlobal, setDataEnvioGlobal] = useState('');
  
  // Modal de rejeição com motivo obrigatório
  const [rejeitarOpen, setRejeitarOpen] = useState(false);
  const [solicitacaoParaRejeitar, setSolicitacaoParaRejeitar] = useState<SolicitacaoPeca | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  // Modal cancelar solicitação
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [solicitacaoParaCancelar, setSolicitacaoParaCancelar] = useState<SolicitacaoPeca | null>(null);
  const [observacaoCancelamento, setObservacaoCancelamento] = useState('');

  // Modal novo fornecedor
  const [novoFornecedorOpen, setNovoFornecedorOpen] = useState(false);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');

  // Seleção para encaminhar em massa com trava de fornecedor
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [fornecedorTravado, setFornecedorTravado] = useState<string | null>(null);

  // Modal detalhamento solicitação
  const [detalheSolicitacaoOpen, setDetalheSolicitacaoOpen] = useState(false);
  const [detalheSolicitacao, setDetalheSolicitacao] = useState<SolicitacaoPeca | null>(null);

  // Modal tratar peça de OS cancelada
  const [tratarPecaOpen, setTratarPecaOpen] = useState(false);
  const [solicitacaoParaTratar, setSolicitacaoParaTratar] = useState<SolicitacaoPeca | null>(null);
  const [motivoTratamento, setMotivoTratamento] = useState('');

  // Modal confirmação encaminhar
  const [confirmEncaminharOpen, setConfirmEncaminharOpen] = useState(false);

  // Modal confirmação agrupar
  const [confirmAgruparOpen, setConfirmAgruparOpen] = useState(false);

  // Filtrar solicitações
  const solicitacoesFiltradas = useMemo(() => {
    return solicitacoes.filter(s => {
      if (filtroLoja !== 'todos' && s.lojaSolicitante !== filtroLoja) return false;
      if (filtroPeca && !s.peca.toLowerCase().includes(filtroPeca.toLowerCase())) return false;
      if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false;
      if (filtroNumeroOS && !s.osId.toLowerCase().includes(filtroNumeroOS.toLowerCase())) return false;
      if (filtroOrigem !== 'todos') {
        const origem = s.origemEntrada || (() => {
          const os = getOrdemServicoById(s.osId);
          if (!os?.origemOS) return 'Balcao';
          if (os.origemOS === 'Garantia') return 'Garantia';
          if (os.origemOS === 'Estoque') return 'Estoque';
          return 'Balcao';
        })();
        if (origem !== filtroOrigem) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());
  }, [solicitacoes, filtroLoja, filtroPeca, filtroStatus, filtroNumeroOS, filtroOrigem]);

  const getLojaNome = (lojaId: string) => obterNomeLoja(lojaId);
  const getFornecedorNome = (fornId: string) => fornecedores.find(f => f.id === fornId)?.nome || fornId;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
      case 'Aprovada':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Aprovada</Badge>;
      case 'Rejeitada':
        return <Badge className="bg-red-500 hover:bg-red-600">Rejeitada</Badge>;
      case 'Cancelada':
        return <Badge className="bg-gray-500 hover:bg-gray-600">Cancelada</Badge>;
      case 'Enviada':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Enviada</Badge>;
      case 'Pagamento - Financeiro':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Pagamento - Financeiro</Badge>;
      case 'Recebida':
        return <Badge className="bg-green-500 hover:bg-green-600">Recebida</Badge>;
      case 'Devolvida ao Fornecedor':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Devolvida ao Fornecedor</Badge>;
      case 'Retida para Estoque':
        return <Badge className="bg-emerald-700 hover:bg-emerald-800">Retida para Estoque</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSLABadge = (dataSolicitacao: string) => {
    const dias = calcularSLASolicitacao(dataSolicitacao);
    if (dias >= 7) {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {dias} dias
        </span>
      );
    } else if (dias >= 4) {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {dias} dias
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 inline-flex items-center gap-1">
        {dias} dias
      </span>
    );
  };

  const handleAbrirAprovar = (solicitacao: SolicitacaoPeca) => {
    setSolicitacoesSelecionadasAprovar([solicitacao]);
    setFornecedoresPorPeca({
      [solicitacao.id]: { fornecedorId: '', valorPeca: '', formaPagamento: '', origemPeca: 'Fornecedor', observacao: '', bancoDestinatario: '', chavePix: '' }
    });
    setResponsavelCompraGlobal(user?.colaborador?.id || '');
    setDataRecebimentoGlobal('');
    setDataEnvioGlobal('');
    setAprovarOpen(true);
  };

  const handleAbrirAprovarMultiplas = (solicitacoesIds: string[]) => {
    const selecionadas = solicitacoes.filter(s => solicitacoesIds.includes(s.id) && s.status === 'Pendente');
    if (selecionadas.length === 0) return;
    
    setSolicitacoesSelecionadasAprovar(selecionadas);
    const fornecedoresInit: {[key: string]: { fornecedorId: string; valorPeca: string; formaPagamento: string; origemPeca: string; observacao: string; bancoDestinatario: string; chavePix: string }} = {};
    selecionadas.forEach(s => {
      fornecedoresInit[s.id] = { fornecedorId: '', valorPeca: '', formaPagamento: '', origemPeca: 'Fornecedor', observacao: '', bancoDestinatario: '', chavePix: '' };
    });
    setFornecedoresPorPeca(fornecedoresInit);
    setResponsavelCompraGlobal(user?.colaborador?.id || '');
    setDataRecebimentoGlobal('');
    setDataEnvioGlobal('');
    setAprovarOpen(true);
  };

  const handleAprovar = () => {
    if (!responsavelCompraGlobal) {
      toast({ title: 'Erro', description: 'Selecione o responsável pela compra', variant: 'destructive' });
      return;
    }
    
    for (const sol of solicitacoesSelecionadasAprovar) {
      const dados = fornecedoresPorPeca[sol.id];
      if (!dados?.fornecedorId || !dados?.valorPeca) {
        toast({ title: 'Erro', description: `Preencha fornecedor e valor para: ${sol.peca}`, variant: 'destructive' });
        return;
      }
      if (!dados?.formaPagamento) {
        toast({ title: 'Erro', description: `Selecione a forma de pagamento para: ${sol.peca}`, variant: 'destructive' });
        return;
      }
      if (!dados?.observacao.trim()) {
        toast({ title: 'Erro', description: `Preencha a observação para: ${sol.peca}`, variant: 'destructive' });
        return;
      }
    }

    for (const sol of solicitacoesSelecionadasAprovar) {
      const dados = fornecedoresPorPeca[sol.id];
      aprovarSolicitacao(sol.id, {
        fornecedorId: dados.fornecedorId,
        valorPeca: parseFloat(dados.valorPeca.replace(/\D/g, '')) / 100,
        responsavelCompra: responsavelCompraGlobal,
        dataRecebimento: dataRecebimentoGlobal,
        dataEnvio: dataEnvioGlobal,
        formaPagamento: dados.formaPagamento,
        origemPeca: 'Fornecedor',
        observacao: dados.observacao,
        bancoDestinatario: dados.bancoDestinatario,
        chavePix: dados.chavePix
      });
    }

    setSolicitacoes(getSolicitacoes());
    setAprovarOpen(false);
    toast({ title: 'Sucesso', description: `${solicitacoesSelecionadasAprovar.length} solicitação(ões) aprovada(s)!` });
  };

  const handleAbrirRejeitar = (solicitacao: SolicitacaoPeca) => {
    setSolicitacaoParaRejeitar(solicitacao);
    setMotivoRejeicao('');
    setRejeitarOpen(true);
  };
  
  const handleConfirmarRejeicao = () => {
    if (!solicitacaoParaRejeitar) return;
    
    if (!motivoRejeicao.trim()) {
      toast({ title: 'Erro', description: 'Informe o motivo da rejeição', variant: 'destructive' });
      return;
    }
    
    const resultado = rejeitarSolicitacao(solicitacaoParaRejeitar.id, motivoRejeicao);
    if (resultado) {
      setSolicitacoes(getSolicitacoes());
      setRejeitarOpen(false);
      setSolicitacaoParaRejeitar(null);
      setMotivoRejeicao('');
      toast({ title: 'Solicitação rejeitada', description: `${solicitacaoParaRejeitar.peca} foi rejeitada. A OS foi atualizada.` });
    }
  };

  const handleSelecionarParaEncaminhar = (id: string, checked: boolean) => {
    const sol = solicitacoes.find(s => s.id === id);
    if (!sol || sol.status !== 'Aprovada') return;

    if (checked) {
      // Trava de fornecedor
      if (fornecedorTravado && sol.fornecedorId !== fornecedorTravado) {
        toast({ title: 'Atenção', description: 'Para agrupar pagamentos, selecione apenas solicitações do mesmo fornecedor.', variant: 'destructive' });
        return;
      }
      const novasSelecionadas = [...selecionadas, id];
      setSelecionadas(novasSelecionadas);
      if (!fornecedorTravado && sol.fornecedorId) {
        setFornecedorTravado(sol.fornecedorId);
      }
    } else {
      const novasSelecionadas = selecionadas.filter(s => s !== id);
      setSelecionadas(novasSelecionadas);
      if (novasSelecionadas.length === 0) {
        setFornecedorTravado(null);
      }
    }
  };

  const handleEncaminharSelecionados = () => {
    if (selecionadas.length === 0) {
      toast({ title: 'Erro', description: 'Selecione ao menos uma solicitação aprovada', variant: 'destructive' });
      return;
    }
    if (selecionadas.length >= 2) {
      setConfirmAgruparOpen(true);
    } else {
      setConfirmEncaminharOpen(true);
    }
  };

  const handleConfirmarEncaminhamento = () => {
    const nomeUsuario = user?.colaborador?.nome || 'Gestor';
    const notasCriadas = encaminharParaFinanceiro(selecionadas, nomeUsuario);
    
    setSolicitacoes(getSolicitacoes());
    setSelecionadas([]);
    setFornecedorTravado(null);
    setConfirmEncaminharOpen(false);
    toast({ 
      title: 'Sucesso', 
      description: `${notasCriadas.length} solicitação(ões) encaminhada(s) para o Financeiro!` 
    });
  };

  const handleConfirmarAgrupamento = () => {
    const nomeUsuario = user?.colaborador?.nome || 'Gestor';
    const resultado = agruparParaPagamento(selecionadas, nomeUsuario);
    
    if (resultado) {
      setSolicitacoes(getSolicitacoes());
      setSelecionadas([]);
      setFornecedorTravado(null);
      setConfirmAgruparOpen(false);
      toast({ 
        title: 'Lote Criado', 
        description: `${resultado.lote.id} com ${selecionadas.length} solicitações agrupadas (${formatCurrency(resultado.lote.valorTotal)}) encaminhado ao Financeiro!` 
      });
    } else {
      toast({ title: 'Erro', description: 'Falha ao agrupar. Verifique se todas são do mesmo fornecedor e estão aprovadas.', variant: 'destructive' });
    }
  };

  const handleAdicionarFornecedor = () => {
    if (!novoFornecedorNome.trim()) return;
    addFornecedor({
      nome: novoFornecedorNome,
      cnpj: '',
      telefone: '',
      endereco: '',
      responsavel: '',
      status: 'Ativo'
    });
    setNovoFornecedorNome('');
    setNovoFornecedorOpen(false);
    toast({ title: 'Sucesso', description: `Fornecedor ${novoFornecedorNome} adicionado!` });
  };

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Helper para resolver origem
  const getOrigem = (sol: SolicitacaoPeca): string => {
    if (sol.origemEntrada) return sol.origemEntrada;
    const os = getOrdemServicoById(sol.osId);
    if (!os?.origemOS) return 'Balcao';
    if (os.origemOS === 'Garantia') return 'Garantia';
    if (os.origemOS === 'Estoque') return 'Estoque';
    return 'Balcao';
  };

  // Stats - dinâmicos conforme filtro
  const totalPendentes = solicitacoesFiltradas.filter(s => s.status === 'Pendente').length;
  const totalAprovadas = solicitacoesFiltradas.filter(s => s.status === 'Aprovada').length;
  const totalEnviadas = solicitacoesFiltradas.filter(s => s.status === 'Enviada' || s.status === 'Pagamento - Financeiro').length;
  const totalRecebidas = solicitacoesFiltradas.filter(s => s.status === 'Recebida').length;

  // Montantes por origem - dinâmicos conforme filtro
  const montantesPorOrigem = useMemo(() => {
    const statusAprovados = ['Aprovada', 'Pagamento - Financeiro', 'Recebida', 'Pagamento Finalizado', 'Devolvida ao Fornecedor', 'Retida para Estoque'];
    const origens: ('Balcao' | 'Garantia' | 'Estoque')[] = ['Balcao', 'Garantia', 'Estoque'];

    const result = origens.map(origem => {
      const solsOrigem = solicitacoesFiltradas.filter(s => getOrigem(s) === origem);
      const aprovado = solsOrigem.filter(s => statusAprovados.includes(s.status))
        .reduce((acc, s) => acc + (s.valorPeca || 0) * s.quantidade, 0);
      const pago = solsOrigem.filter(s => isPecaPaga(s))
        .reduce((acc, s) => acc + (s.valorPeca || 0) * s.quantidade, 0);
      return { origem, aprovado, pago };
    });
    return result;
  }, [solicitacoesFiltradas]);

  // Fluxo de caixa - dinâmico conforme filtro
  const fluxoCaixa = useMemo(() => {
    const aguardando = solicitacoesFiltradas.filter(s => s.status === 'Aprovada' || s.status === 'Pagamento - Financeiro');
    const pagos = solicitacoesFiltradas.filter(s => isPecaPaga(s));
    return {
      aguardandoQtd: aguardando.length,
      aguardandoValor: aguardando.reduce((acc, s) => acc + (s.valorPeca || 0) * s.quantidade, 0),
      pagoQtd: pagos.length,
      pagoValor: pagos.reduce((acc, s) => acc + (s.valorPeca || 0) * s.quantidade, 0),
    };
  }, [solicitacoesFiltradas]);

  // Valor total das selecionadas
  const valorSelecionadas = solicitacoes
    .filter(s => selecionadas.includes(s.id))
    .reduce((acc, s) => acc + (s.valorPeca || 0) * s.quantidade, 0);

  const getOrigemBadge = (sol: SolicitacaoPeca) => {
    const origem = sol.origemEntrada || (() => {
      const os = getOrdemServicoById(sol.osId);
      if (!os?.origemOS) return 'Balcao';
      if (os.origemOS === 'Garantia') return 'Garantia';
      if (os.origemOS === 'Estoque') return 'Estoque';
      return 'Balcao';
    })();
    switch (origem) {
      case 'Garantia': return <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px]">Garantia</Badge>;
      case 'Estoque': return <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-[10px]">Estoque</Badge>;
      default: return <Badge className="bg-gray-500 hover:bg-gray-600 text-white text-[10px]">Balcão</Badge>;
    }
  };

  const origemLabels: Record<string, string> = { 'Balcao': 'Balcão', 'Garantia': 'Garantia', 'Estoque': 'Estoque' };

  return (
    <OSLayout title="Aprovações - Gestor">
      {/* Dashboard Cards */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        {/* Linha 1 - Contadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-yellow-600">{totalPendentes}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-blue-600">{totalAprovadas}</div>
              <div className="text-xs text-muted-foreground">Aprovadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-purple-600">{totalEnviadas}</div>
              <div className="text-xs text-muted-foreground">Financeiro</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-600">{totalRecebidas}</div>
              <div className="text-xs text-muted-foreground">Recebidas</div>
            </CardContent>
          </Card>
        </div>

        {/* Linha 2 - Montantes por Origem */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {montantesPorOrigem.map(m => (
            <Card key={m.origem}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Peças - {origemLabels[m.origem]}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Aprovado</p>
                    <p className="text-sm font-bold text-blue-600">{formatCurrency(m.aprovado)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Pago</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(m.pago)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Linha 3 - Fluxo de Caixa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-orange-200 dark:border-orange-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-semibold">Aguardando Pagamento</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-bold text-orange-600">{fluxoCaixa.aguardandoQtd}</span>
                <span className="text-sm text-muted-foreground">solicitações</span>
                <span className="text-sm font-semibold text-orange-600 ml-auto">{formatCurrency(fluxoCaixa.aguardandoValor)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm font-semibold">Pagamento Realizado</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-bold text-green-600">{fluxoCaixa.pagoQtd}</span>
                <span className="text-sm text-muted-foreground">solicitações</span>
                <span className="text-sm font-semibold text-green-600 ml-auto">{formatCurrency(fluxoCaixa.pagoValor)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Loja Solicitante</Label>
              <AutocompleteLoja
                value={filtroLoja === 'todos' ? '' : filtroLoja}
                onChange={(v) => setFiltroLoja(v || 'todos')}
                apenasLojasTipoLoja={true}
                placeholder="Todas"
              />
            </div>
            <div className="space-y-2">
              <Label>Número da OS</Label>
              <Input
                placeholder="Buscar OS..."
                value={filtroNumeroOS}
                onChange={e => setFiltroNumeroOS(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Peça</Label>
              <Input
                placeholder="Buscar peça..."
                value={filtroPeca}
                onChange={e => setFiltroPeca(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Aprovada">Aprovada</SelectItem>
                  <SelectItem value="Pagamento - Financeiro">Pagamento - Financeiro</SelectItem>
                  <SelectItem value="Enviada">Enviada</SelectItem>
                  <SelectItem value="Recebida">Recebida</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                  <SelectItem value="Devolvida ao Fornecedor">Devolvida ao Fornecedor</SelectItem>
                  <SelectItem value="Retida para Estoque">Retida para Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="Balcao">Balcão</SelectItem>
                  <SelectItem value="Garantia">Garantia</SelectItem>
                  <SelectItem value="Estoque">Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFiltroLoja('todos');
                  setFiltroNumeroOS('');
                  setFiltroPeca('');
                  setFiltroStatus('todos');
                  setFiltroOrigem('todos');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleEncaminharSelecionados} 
                disabled={selecionadas.length === 0}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {selecionadas.length >= 2 
                  ? `Agrupar para Pagamento (${selecionadas.length})` 
                  : `Encaminhar Selecionados (${selecionadas.length})`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Peça</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Justificativa</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitacoesFiltradas.map(sol => (
              <TableRow 
                key={sol.id}
                className={cn(
                  sol.status === 'Pendente' && 'bg-yellow-50 dark:bg-yellow-900/10',
                  sol.status === 'Aprovada' && 'bg-blue-50 dark:bg-blue-900/10',
                  (sol.osCancelada || sol.status === 'Cancelada') && sol.status !== 'Devolvida ao Fornecedor' && sol.status !== 'Retida para Estoque' && 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500'
                )}
              >
                <TableCell>
                  {sol.status === 'Aprovada' && (
                    <Checkbox 
                      checked={selecionadas.includes(sol.id)}
                      disabled={!!fornecedorTravado && sol.fornecedorId !== fornecedorTravado}
                      onCheckedChange={(checked) => handleSelecionarParaEncaminhar(sol.id, checked as boolean)}
                    />
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {new Date(sol.dataSolicitacao).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-xs">{getLojaNome(sol.lojaSolicitante)}</TableCell>
                <TableCell>{getOrigemBadge(sol)}</TableCell>
                <TableCell>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs font-mono"
                    onClick={() => navigate(`/os/assistencia/${sol.osId}?from=solicitacoes`)}
                  >
                    {sol.osId}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{sol.peca}</TableCell>
                <TableCell>{sol.quantidade}</TableCell>
                <TableCell className="text-sm">
                  {sol.valorPeca ? formatCurrency(sol.valorPeca) : '-'}
                </TableCell>
                <TableCell className="text-xs">
                  {sol.fornecedorId ? getFornecedorNome(sol.fornecedorId) : '-'}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                  {sol.justificativa}
                </TableCell>
                <TableCell>{getSLABadge(sol.dataSolicitacao)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {getStatusBadge(sol.status)}
                    {(sol.osCancelada || sol.status === 'Cancelada') && sol.status !== 'Devolvida ao Fornecedor' && sol.status !== 'Retida para Estoque' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                        <AlertTriangle className="h-3 w-3" />
                        {sol.status === 'Cancelada' ? 'Solicitação Cancelada' : 'OS Cancelada'}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {sol.status === 'Pendente' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-green-600"
                          onClick={() => handleAbrirAprovar(sol)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleAbrirRejeitar(sol)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {(sol.status === 'Pendente' || sol.status === 'Aprovada') && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-600"
                        onClick={() => {
                          setSolicitacaoParaCancelar(sol);
                          setObservacaoCancelamento('');
                          setCancelarOpen(true);
                        }}
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {(sol.osCancelada || sol.status === 'Cancelada') && sol.status !== 'Devolvida ao Fornecedor' && sol.status !== 'Retida para Estoque' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-orange-600"
                        onClick={() => {
                          setSolicitacaoParaTratar(sol);
                          setMotivoTratamento('');
                          setTratarPecaOpen(true);
                        }}
                        title="Tratar Peça Cancelada"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setDetalheSolicitacao(sol);
                        setDetalheSolicitacaoOpen(true);
                      }}
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {solicitacoesFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  Nenhuma solicitação encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Confirmar Encaminhamento */}
      <Dialog open={confirmEncaminharOpen} onOpenChange={setConfirmEncaminharOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Encaminhamento para Financeiro</DialogTitle>
            <DialogDescription>
              Você está prestes a encaminhar {selecionadas.length} solicitação(ões) aprovada(s) para conferência financeira.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total de solicitações:</span>
                <strong>{selecionadas.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Valor total:</span>
                <strong className="text-primary">{formatCurrency(valorSelecionadas)}</strong>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Cada registro será processado individualmente e encaminhado para conferência no Financeiro.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEncaminharOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarEncaminhamento}>
              <Send className="h-4 w-4 mr-2" />
              Confirmar Encaminhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Agrupamento */}
      <Dialog open={confirmAgruparOpen} onOpenChange={setConfirmAgruparOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Agrupar para Pagamento
            </DialogTitle>
            <DialogDescription>
              Você está agrupando {selecionadas.length} solicitações do mesmo fornecedor em um único lote de pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Fornecedor:</span>
                <strong className="text-sm">{fornecedorTravado ? getFornecedorNome(fornecedorTravado) : '-'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total de solicitações:</span>
                <strong className="text-sm">{selecionadas.length}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Valor total consolidado:</span>
                <strong className="text-sm text-primary">{formatCurrency(valorSelecionadas)}</strong>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Detalhamento das peças:</p>
              {solicitacoes.filter(s => selecionadas.includes(s.id)).map(sol => (
                <div key={sol.id} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                  <div>
                    <span className="font-medium">{sol.peca}</span>
                    <span className="text-muted-foreground ml-2">({sol.osId})</span>
                  </div>
                  <span className="font-semibold">{formatCurrency((sol.valorPeca || 0) * sol.quantidade)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Um único lote será criado e encaminhado ao Financeiro para pagamento consolidado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAgruparOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarAgrupamento}>
              <Package className="h-4 w-4 mr-2" />
              Confirmar Agrupamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={aprovarOpen} onOpenChange={setAprovarOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação ({solicitacoesSelecionadasAprovar.length} peça(s))</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {solicitacoesSelecionadasAprovar.map((sol, idx) => (
              <div key={sol.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sol.peca}</p>
                    <p className="text-sm text-muted-foreground">
                      OS: {sol.osId} | Qtd: {sol.quantidade}
                    </p>
                  </div>
                  <Badge variant="secondary">Peça {idx + 1}</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fornecedor *</Label>
                    <AutocompleteFornecedor
                      value={fornecedoresPorPeca[sol.id]?.fornecedorId || ''}
                      onChange={v => setFornecedoresPorPeca({
                        ...fornecedoresPorPeca, 
                        [sol.id]: { ...fornecedoresPorPeca[sol.id], fornecedorId: v }
                      })}
                      placeholder="Selecione..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor (R$) *</Label>
                    <Input
                      value={fornecedoresPorPeca[sol.id]?.valorPeca || ''}
                      onChange={e => setFornecedoresPorPeca({
                        ...fornecedoresPorPeca,
                        [sol.id]: { ...fornecedoresPorPeca[sol.id], valorPeca: formatCurrencyInput(e.target.value) }
                      })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Forma de Pagamento *</Label>
                    <Select 
                      value={fornecedoresPorPeca[sol.id]?.formaPagamento || ''} 
                      onValueChange={v => setFornecedoresPorPeca({
                        ...fornecedoresPorPeca, 
                        [sol.id]: { ...fornecedoresPorPeca[sol.id], formaPagamento: v }
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pix">Pix</SelectItem>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Origem da Peça</Label>
                    <Input value="Fornecedor" disabled className="bg-muted text-sm" />
                  </div>
                </div>

                {fornecedoresPorPeca[sol.id]?.formaPagamento === 'Pix' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Banco do Destinatário</Label>
                      <Input
                        value={fornecedoresPorPeca[sol.id]?.bancoDestinatario || ''}
                        onChange={e => setFornecedoresPorPeca({
                          ...fornecedoresPorPeca,
                          [sol.id]: { ...fornecedoresPorPeca[sol.id], bancoDestinatario: e.target.value }
                        })}
                        placeholder="Ex: Nubank, Itaú..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Chave Pix</Label>
                      <Input
                        value={fornecedoresPorPeca[sol.id]?.chavePix || ''}
                        onChange={e => setFornecedoresPorPeca({
                          ...fornecedoresPorPeca,
                          [sol.id]: { ...fornecedoresPorPeca[sol.id], chavePix: e.target.value }
                        })}
                        placeholder="CPF, e-mail, telefone..."
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Observação *</Label>
                  <Input
                    value={fornecedoresPorPeca[sol.id]?.observacao || ''}
                    onChange={e => setFornecedoresPorPeca({
                      ...fornecedoresPorPeca,
                      [sol.id]: { ...fornecedoresPorPeca[sol.id], observacao: e.target.value }
                    })}
                    placeholder="Observações sobre a aprovação da peça..."
                  />
                </div>
              </div>
            ))}

            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label>Responsável pela Compra *</Label>
                <Input
                  value={user?.colaborador?.nome || 'Não identificado'}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Recebimento</Label>
                  <Input
                    type="date"
                    value={dataRecebimentoGlobal}
                    onChange={e => setDataRecebimentoGlobal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Envio Loja</Label>
                  <Input
                    type="date"
                    value={dataEnvioGlobal}
                    onChange={e => setDataEnvioGlobal(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAprovarOpen(false)}>Cancelar</Button>
            <Button onClick={handleAprovar}>
              <Check className="h-4 w-4 mr-2" />
              Aprovar {solicitacoesSelecionadasAprovar.length} Peça(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Fornecedor */}
      <Dialog open={novoFornecedorOpen} onOpenChange={setNovoFornecedorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Fornecedor</Label>
              <Input
                value={novoFornecedorNome}
                onChange={e => setNovoFornecedorNome(e.target.value)}
                placeholder="Nome do fornecedor..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoFornecedorOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdicionarFornecedor}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Rejeição */}
      <Dialog open={rejeitarOpen} onOpenChange={setRejeitarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              {solicitacaoParaRejeitar && (
                <>Você está rejeitando a solicitação de <strong>{solicitacaoParaRejeitar.peca}</strong> (OS: {solicitacaoParaRejeitar.osId})</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da Rejeição *</Label>
              <Textarea
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                placeholder="Informe o motivo da rejeição..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Esta informação será registrada na timeline da OS.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejeitarOpen(false); setSolicitacaoParaRejeitar(null); }}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmarRejeicao}
              disabled={!motivoRejeicao.trim()}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Cancelar Solicitação */}
      <Dialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-700">Cancelar Solicitação</DialogTitle>
            <DialogDescription>
              {solicitacaoParaCancelar && (
                <>Você está cancelando a solicitação de <strong>{solicitacaoParaCancelar.peca}</strong> (OS: {solicitacaoParaCancelar.osId})</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Observação *</Label>
              <Textarea
                value={observacaoCancelamento}
                onChange={(e) => setObservacaoCancelamento(e.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Campo obrigatório. A informação será registrada na timeline da OS.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelarOpen(false); setSolicitacaoParaCancelar(null); }}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (!solicitacaoParaCancelar) return;
                if (!observacaoCancelamento.trim()) {
                  toast({ title: 'Erro', description: 'Informe a observação do cancelamento', variant: 'destructive' });
                  return;
                }
                cancelarSolicitacao(solicitacaoParaCancelar.id, observacaoCancelamento);
                setSolicitacoes(getSolicitacoes());
                setCancelarOpen(false);
                setSolicitacaoParaCancelar(null);
                toast({ title: 'Solicitação cancelada', description: `${solicitacaoParaCancelar.peca} foi cancelada.` });
              }}
              disabled={!observacaoCancelamento.trim()}
            >
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhamento da Solicitação */}
      <Dialog open={detalheSolicitacaoOpen} onOpenChange={setDetalheSolicitacaoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>Informações completas da solicitação de peça</DialogDescription>
          </DialogHeader>
          {detalheSolicitacao && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Peça:</span>
                  <p className="font-medium">{detalheSolicitacao.peca}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantidade:</span>
                  <p className="font-medium">{detalheSolicitacao.quantidade}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">OS:</span>
                  <p className="font-mono font-medium">{detalheSolicitacao.osId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">{getStatusBadge(detalheSolicitacao.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Solicitação:</span>
                  <p className="font-medium">{new Date(detalheSolicitacao.dataSolicitacao).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Loja:</span>
                  <p className="font-medium">{getLojaNome(detalheSolicitacao.lojaSolicitante)}</p>
                </div>
              </div>
              
              <div>
                <span className="text-muted-foreground">Justificativa:</span>
                <p>{detalheSolicitacao.justificativa}</p>
              </div>

              {detalheSolicitacao.fornecedorId && (
                <div className="border-t pt-3 space-y-2">
                  <p className="font-medium text-muted-foreground">Dados da Aprovação</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground">Fornecedor:</span>
                      <p className="font-medium">{getFornecedorNome(detalheSolicitacao.fornecedorId)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor:</span>
                      <p className="font-medium">{detalheSolicitacao.valorPeca ? formatCurrency(detalheSolicitacao.valorPeca) : '-'}</p>
                    </div>
                    {detalheSolicitacao.formaPagamento && (
                      <div>
                        <span className="text-muted-foreground">Forma de Pagamento:</span>
                        <p className="font-medium">{detalheSolicitacao.formaPagamento}</p>
                      </div>
                    )}
                    {detalheSolicitacao.bancoDestinatario && (
                      <div>
                        <span className="text-muted-foreground">Banco:</span>
                        <p className="font-medium">{detalheSolicitacao.bancoDestinatario}</p>
                      </div>
                    )}
                    {detalheSolicitacao.chavePix && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Chave Pix:</span>
                        <p className="font-medium">{detalheSolicitacao.chavePix}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detalheSolicitacao.observacao && (
                <div className="border-t pt-3">
                  <span className="text-muted-foreground">Observação do Gestor:</span>
                  <p>{detalheSolicitacao.observacao}</p>
                </div>
              )}

              {detalheSolicitacao.motivoTratamento && (
                <div className="border-t pt-3 space-y-2">
                  <p className="font-medium text-muted-foreground">Tratamento de OS Cancelada</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground">Decisão:</span>
                      <div className="mt-1">{getStatusBadge(detalheSolicitacao.status)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Responsável:</span>
                      <p className="font-medium">{detalheSolicitacao.tratadaPor}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Motivo:</span>
                    <p>{detalheSolicitacao.motivoTratamento}</p>
                  </div>
                </div>
              )}

              {(detalheSolicitacao.osCancelada || detalheSolicitacao.status === 'Cancelada') && detalheSolicitacao.status !== 'Devolvida ao Fornecedor' && detalheSolicitacao.status !== 'Retida para Estoque' && (
                <div className="border-t pt-3">
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => {
                      setDetalheSolicitacaoOpen(false);
                      setSolicitacaoParaTratar(detalheSolicitacao);
                      setMotivoTratamento('');
                      setTratarPecaOpen(true);
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {detalheSolicitacao.status === 'Cancelada' ? 'Tratar Peça de Solicitação Cancelada' : 'Tratar Peça de OS Cancelada'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Tratar Peça de OS Cancelada */}
      <Dialog open={tratarPecaOpen} onOpenChange={setTratarPecaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-orange-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {solicitacaoParaTratar?.status === 'Cancelada' ? 'Tratar Peça de Solicitação Cancelada' : 'Tratar Peça de OS Cancelada'}
            </DialogTitle>
            <DialogDescription>
              {solicitacaoParaTratar && (
                <>Peça: <strong>{solicitacaoParaTratar.peca}</strong> | OS: <strong>{solicitacaoParaTratar.osId}</strong> | Valor: {solicitacaoParaTratar.valorPeca ? formatCurrency(solicitacaoParaTratar.valorPeca) : 'N/A'}</>
              )}
            </DialogDescription>
          </DialogHeader>
          {solicitacaoParaTratar && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Motivo da Decisão *</Label>
                <Textarea
                  value={motivoTratamento}
                  onChange={(e) => setMotivoTratamento(e.target.value)}
                  placeholder="Descreva o motivo da decisão (mínimo 10 caracteres)..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Campo obrigatório. Será registrado na timeline da OS e da solicitação.</p>
              </div>

              <div className="flex flex-col gap-3">
                {(() => {
                  const paga = isPecaPaga(solicitacaoParaTratar);
                  return (
                    <div className="relative group">
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={motivoTratamento.trim().length < 10 || paga}
                        onClick={() => {
                          const nomeGestor = user?.colaborador?.nome || 'Gestor';
                          tratarPecaOSCancelada(solicitacaoParaTratar.id, 'devolver', motivoTratamento, nomeGestor);
                          setSolicitacoes(getSolicitacoes());
                          setTratarPecaOpen(false);
                          toast({ title: 'Peça devolvida ao fornecedor', description: `${solicitacaoParaTratar.peca} marcada como devolvida.` });
                        }}
                      >
                        Devolver ao Fornecedor
                      </Button>
                      {paga && (
                        <p className="text-xs text-red-500 mt-1">Peça já paga, não pode ser devolvida ao fornecedor. Opte por reter para estoque.</p>
                      )}
                    </div>
                  );
                })()}

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={motivoTratamento.trim().length < 10}
                  onClick={() => {
                    const nomeGestor = user?.colaborador?.nome || 'Gestor';
                    tratarPecaOSCancelada(solicitacaoParaTratar.id, 'reter', motivoTratamento, nomeGestor);
                    setSolicitacoes(getSolicitacoes());
                    setTratarPecaOpen(false);
                    toast({ title: 'Peça retida para estoque', description: `${solicitacaoParaTratar.peca} retida para estoque próprio.` });
                  }}
                >
                  Reter para Estoque Próprio
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
