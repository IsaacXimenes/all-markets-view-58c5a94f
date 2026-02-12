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
  criarLote,
  enviarLote,
  getLotes,
  calcularSLASolicitacao,
  formatCurrency,
  SolicitacaoPeca,
  LotePecas,
  LoteTimeline,
  editarLote,
  getLoteById
} from '@/utils/solicitacaoPecasApi';
import { getFornecedores, addFornecedor } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { getOrdemServicoById, updateOrdemServico } from '@/utils/assistenciaApi';
import { Eye, Check, X, Package, Clock, AlertTriangle, Layers, Send, Plus, Edit, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OSSolicitacoesPecas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useUrlTabs('solicitacoes');
  const [solicitacoes, setSolicitacoes] = useState(getSolicitacoes());
  const [lotes, setLotes] = useState(getLotes());
  const { obterLojasTipoLoja, obterNomeLoja, obterColaboradoresAtivos } = useCadastroStore();
  const lojas = obterLojasTipoLoja();
  const fornecedores = getFornecedores().filter(f => f.status === 'Ativo');
  const colaboradores = obterColaboradoresAtivos();

  // Filtros
  const [filtroLoja, setFiltroLoja] = useState('todos');
  const [filtroPeca, setFiltroPeca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroNumeroOS, setFiltroNumeroOS] = useState('');

  // Modal aprovar com campos por peça
  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [solicitacoesSelecionadasAprovar, setSolicitacoesSelecionadasAprovar] = useState<SolicitacaoPeca[]>([]);
  const [fornecedoresPorPeca, setFornecedoresPorPeca] = useState<{[key: string]: { fornecedorId: string; valorPeca: string; formaPagamento: string; origemPeca: string; observacao: string }}>({});
  const [responsavelCompraGlobal, setResponsavelCompraGlobal] = useState('');
  const [dataRecebimentoGlobal, setDataRecebimentoGlobal] = useState('');
  
  // Modal de rejeição com motivo obrigatório
  const [rejeitarOpen, setRejeitarOpen] = useState(false);
  const [solicitacaoParaRejeitar, setSolicitacaoParaRejeitar] = useState<SolicitacaoPeca | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [dataEnvioGlobal, setDataEnvioGlobal] = useState('');

  // Modal ver/editar lote
  const [verLoteOpen, setVerLoteOpen] = useState(false);
  const [editarLoteOpen, setEditarLoteOpen] = useState(false);
  const [loteSelecionado, setLoteSelecionado] = useState<LotePecas | null>(null);
  const [editLoteValorTotal, setEditLoteValorTotal] = useState('');

  // Modal cancelar solicitação
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [solicitacaoParaCancelar, setSolicitacaoParaCancelar] = useState<SolicitacaoPeca | null>(null);
  const [observacaoCancelamento, setObservacaoCancelamento] = useState('');

  // Modal novo fornecedor
  const [novoFornecedorOpen, setNovoFornecedorOpen] = useState(false);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');

  // Seleção para lote
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  // Filtrar solicitações
  const solicitacoesFiltradas = useMemo(() => {
    return solicitacoes.filter(s => {
      if (filtroLoja !== 'todos' && s.lojaSolicitante !== filtroLoja) return false;
      if (filtroPeca && !s.peca.toLowerCase().includes(filtroPeca.toLowerCase())) return false;
      if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false;
      if (filtroNumeroOS && !s.osId.toLowerCase().includes(filtroNumeroOS.toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());
  }, [solicitacoes, filtroLoja, filtroPeca, filtroStatus, filtroNumeroOS]);

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
        return <Badge className="bg-purple-500 hover:bg-purple-600">Enviada</Badge>;
      case 'Recebida':
        return <Badge className="bg-green-500 hover:bg-green-600">Recebida</Badge>;
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
      [solicitacao.id]: { fornecedorId: '', valorPeca: '', formaPagamento: '', origemPeca: '', observacao: '' }
    });
    setResponsavelCompraGlobal('');
    setDataRecebimentoGlobal('');
    setDataEnvioGlobal('');
    setAprovarOpen(true);
  };

  const handleAbrirAprovarMultiplas = (solicitacoesIds: string[]) => {
    const selecionadas = solicitacoes.filter(s => solicitacoesIds.includes(s.id) && s.status === 'Pendente');
    if (selecionadas.length === 0) return;
    
    setSolicitacoesSelecionadasAprovar(selecionadas);
    const fornecedoresInit: {[key: string]: { fornecedorId: string; valorPeca: string; formaPagamento: string; origemPeca: string; observacao: string }} = {};
    selecionadas.forEach(s => {
      fornecedoresInit[s.id] = { fornecedorId: '', valorPeca: '', formaPagamento: '', origemPeca: '', observacao: '' };
    });
    setFornecedoresPorPeca(fornecedoresInit);
    setResponsavelCompraGlobal('');
    setDataRecebimentoGlobal('');
    setDataEnvioGlobal('');
    setAprovarOpen(true);
  };

  const handleAprovar = () => {
    // Validar campos obrigatórios
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
      if (!dados?.origemPeca) {
        toast({ title: 'Erro', description: `Selecione a origem da peça para: ${sol.peca}`, variant: 'destructive' });
        return;
      }
      if (!dados?.observacao.trim()) {
        toast({ title: 'Erro', description: `Preencha a observação para: ${sol.peca}`, variant: 'destructive' });
        return;
      }
    }

    // Aprovar cada solicitação
    for (const sol of solicitacoesSelecionadasAprovar) {
      const dados = fornecedoresPorPeca[sol.id];
      aprovarSolicitacao(sol.id, {
        fornecedorId: dados.fornecedorId,
        valorPeca: parseFloat(dados.valorPeca.replace(/\D/g, '')) / 100,
        responsavelCompra: responsavelCompraGlobal,
        dataRecebimento: dataRecebimentoGlobal,
        dataEnvio: dataEnvioGlobal,
        formaPagamento: dados.formaPagamento,
        origemPeca: dados.origemPeca,
        observacao: dados.observacao
      });

      // Timeline já é atualizada pela API aprovarSolicitacao()
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

  const handleSelecionarParaLote = (id: string, checked: boolean) => {
    if (checked) {
      setSelecionadas([...selecionadas, id]);
    } else {
      setSelecionadas(selecionadas.filter(s => s !== id));
    }
  };

  const handleVerLote = (lote: LotePecas) => {
    setLoteSelecionado(lote);
    setVerLoteOpen(true);
  };

  const handleEditarLote = (lote: LotePecas) => {
    setLoteSelecionado(lote);
    setEditLoteValorTotal(formatCurrencyInput(String(Math.round(lote.valorTotal * 100))));
    setEditarLoteOpen(true);
  };

  const handleSalvarEdicaoLote = () => {
    if (!loteSelecionado) return;
    const novoValor = parseFloat(editLoteValorTotal.replace(/\D/g, '')) / 100;
    const resultado = editarLote(loteSelecionado.id, { valorTotal: novoValor }, 'Usuário Sistema');
    if (resultado) {
      setLotes(getLotes());
      setEditarLoteOpen(false);
      toast({ title: 'Sucesso', description: 'Lote atualizado!' });
    }
  };

  const handleCriarLote = () => {
    if (selecionadas.length === 0) {
      toast({ title: 'Erro', description: 'Selecione ao menos uma solicitação aprovada', variant: 'destructive' });
      return;
    }

    // Agrupar por fornecedor
    const solicitacoesParaLote = solicitacoes.filter(s => selecionadas.includes(s.id) && s.status === 'Aprovada');
    const fornecedoresUnicos = [...new Set(solicitacoesParaLote.map(s => s.fornecedorId))];

    if (fornecedoresUnicos.length > 1) {
      toast({ title: 'Erro', description: 'Selecione apenas solicitações do mesmo fornecedor', variant: 'destructive' });
      return;
    }

    if (fornecedoresUnicos.length === 0 || !fornecedoresUnicos[0]) {
      toast({ title: 'Erro', description: 'Nenhuma solicitação aprovada selecionada', variant: 'destructive' });
      return;
    }

    const novoLote = criarLote(fornecedoresUnicos[0], selecionadas);
    if (novoLote) {
      setSolicitacoes(getSolicitacoes());
      setLotes(getLotes());
      setSelecionadas([]);
      toast({ title: 'Sucesso', description: `Lote ${novoLote.id} criado com ${selecionadas.length} solicitações!` });
    }
  };

  const handleEnviarLote = (loteId: string) => {
    const resultado = enviarLote(loteId);
    if (resultado) {
      setSolicitacoes(getSolicitacoes());
      setLotes(getLotes());
      toast({ title: 'Sucesso', description: `Lote ${loteId} enviado! Nota ${resultado.nota.id} criada no Financeiro.` });
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

  // Stats
  const totalPendentes = solicitacoes.filter(s => s.status === 'Pendente').length;
  const totalAprovadas = solicitacoes.filter(s => s.status === 'Aprovada').length;
  const totalEnviadas = solicitacoes.filter(s => s.status === 'Enviada').length;
  const totalRecebidas = solicitacoes.filter(s => s.status === 'Recebida').length;
  const lotesAtivos = lotes.filter(l => l.status === 'Pendente' || l.status === 'Enviado');

  return (
    <OSLayout title="Aprovações - Gestor">
      {/* Dashboard Cards */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{totalPendentes}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{totalAprovadas}</div>
              <div className="text-xs text-muted-foreground">Aprovadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{totalEnviadas}</div>
              <div className="text-xs text-muted-foreground">Enviadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{totalRecebidas}</div>
              <div className="text-xs text-muted-foreground">Recebidas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{lotesAtivos.length}</div>
              <div className="text-xs text-muted-foreground">Lotes</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
          <TabsTrigger value="lotes">Lotes ({lotesAtivos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes" className="space-y-4">
          {/* Filtros */}
          <Card>
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
                      <SelectItem value="Enviada">Enviada</SelectItem>
                      <SelectItem value="Recebida">Recebida</SelectItem>
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
                    }}
                    className="w-full"
                  >
                    Limpar Filtros
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleCriarLote} 
                    disabled={selecionadas.length === 0}
                    className="w-full"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Criar Lote ({selecionadas.length})
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
                  <TableHead>OS</TableHead>
                  <TableHead>Peça</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Valor</TableHead>
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
                      sol.status === 'Aprovada' && 'bg-blue-50 dark:bg-blue-900/10'
                    )}
                  >
                    <TableCell>
                      {sol.status === 'Aprovada' && !sol.loteId && (
                        <Checkbox 
                          checked={selecionadas.includes(sol.id)}
                          onCheckedChange={(checked) => handleSelecionarParaLote(sol.id, checked as boolean)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(sol.dataSolicitacao).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs">{getLojaNome(sol.lojaSolicitante)}</TableCell>
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
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {sol.justificativa}
                    </TableCell>
                    <TableCell>{getSLABadge(sol.dataSolicitacao)}</TableCell>
                    <TableCell>{getStatusBadge(sol.status)}</TableCell>
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/os/assistencia/${sol.osId}?from=solicitacoes`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {solicitacoesFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhuma solicitação encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="lotes" className="space-y-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Lote</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Qtd Solicitações</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotesAtivos.map(lote => (
                  <TableRow 
                    key={lote.id}
                    className={cn(
                      lote.status === 'Pendente' && 'bg-yellow-500/10',
                      lote.status === 'Enviado' && 'bg-purple-500/10'
                    )}
                  >
                    <TableCell className="font-mono text-xs">{lote.id}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(lote.dataCriacao).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{getFornecedorNome(lote.fornecedorId)}</TableCell>
                    <TableCell>{lote.solicitacoes.length}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(lote.valorTotal)}</TableCell>
                    <TableCell>
                      {lote.status === 'Pendente' && <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>}
                      {lote.status === 'Enviado' && <Badge className="bg-purple-500 hover:bg-purple-600">Enviado</Badge>}
                      {lote.status === 'Finalizado' && <Badge className="bg-green-500 hover:bg-green-600">Finalizado</Badge>}
                    </TableCell>
                    <TableCell>
                      {lote.status === 'Pendente' ? (
                        <div className="flex gap-1">
                          <Button 
                            size="sm"
                            onClick={() => handleEnviarLote(lote.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Lote
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleVerLote(lote)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 items-center">
                          <Badge variant="outline" className="text-purple-600 border-purple-300">Enviado ao Financeiro</Badge>
                          <Button variant="ghost" size="sm" onClick={() => handleVerLote(lote)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {lotesAtivos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum lote encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Aprovar - Com campos por peça */}
      <Dialog open={aprovarOpen} onOpenChange={setAprovarOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação ({solicitacoesSelecionadasAprovar.length} peça(s))</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Lista de peças com campos individuais */}
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

                {/* Novos campos obrigatórios */}
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
                    <Label className="text-xs">Origem da Peça *</Label>
                    <Select 
                      value={fornecedoresPorPeca[sol.id]?.origemPeca || ''} 
                      onValueChange={v => setFornecedoresPorPeca({
                        ...fornecedoresPorPeca, 
                        [sol.id]: { ...fornecedoresPorPeca[sol.id], origemPeca: v }
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                        <SelectItem value="Estoque Assistência Thiago">Estoque Assistência Thiago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

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

            {/* Campos globais */}
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label>Responsável pela Compra *</Label>
                <AutocompleteColaborador
                  value={responsavelCompraGlobal}
                  onChange={setResponsavelCompraGlobal}
                  placeholder="Selecione..."
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
    </OSLayout>
  );
}
