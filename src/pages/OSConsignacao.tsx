import { useState, useMemo, useEffect } from 'react';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { getFornecedores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/formatUtils';
import { setOnConsumoPecaConsignada } from '@/utils/pecasApi';
import {
  getLotesConsignacao, getLoteById, criarLoteConsignacao,
  confirmarDevolucaoItem, getValorConsumido,
  registrarConsumoPorPecaId, transferirItemConsignacao,
  gerarPagamentoParcial, confirmarPagamentoParcial, finalizarLote,
  editarLoteConsignacao,
  LoteConsignacao, ItemConsignacao, CriarLoteInput, PagamentoParcial,
} from '@/utils/consignacaoApi';
import { getNotasAssistencia, __pushNotaConsignacao } from '@/utils/solicitacaoPecasApi';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Eye, Trash2, Package, PackageCheck, Clock, DollarSign, Pencil,
  FileText, ArrowRightLeft, CheckCircle, AlertTriangle, ArrowLeft, Undo2, Truck,
  History, Lock, XCircle,
} from 'lucide-react';

type ViewMode = 'lista' | 'novo' | 'detalhamento';

interface EditItemState {
  id: string;
  descricao: string;
  modelo: string;
  quantidade: string;
  valorCusto: string;
  lojaDestinoId: string;
}

export default function OSConsignacao() {
  const { toast } = useToast();
  const { obterNomeLoja, obterLojasPorTipo } = useCadastroStore();
  const user = useAuthStore(state => state.user);
  const fornecedores = getFornecedores();
  const lojas = obterLojasPorTipo('Assistência');

  const [lotes, setLotes] = useState<LoteConsignacao[]>(getLotesConsignacao());
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [loteSelecionado, setLoteSelecionado] = useState<LoteConsignacao | null>(null);

  // Registrar callback de consumo
  useEffect(() => {
    setOnConsumoPecaConsignada(registrarConsumoPorPecaId);
  }, []);

  // Novo lote state
  const [novoFornecedor, setNovoFornecedor] = useState('');
  const [novoItens, setNovoItens] = useState<{ descricao: string; modelo: string; quantidade: string; valorCusto: string; lojaDestinoId: string }[]>([
    { descricao: '', modelo: '', quantidade: '1', valorCusto: '', lojaDestinoId: '' },
  ]);

  // Pagamento parcial state
  const [itensSelecionadosPagamento, setItensSelecionadosPagamento] = useState<string[]>([]);
  const [pagFormaPagamento, setPagFormaPagamento] = useState('');
  const [pagContaBancaria, setPagContaBancaria] = useState('');
  const [pagNomeRecebedor, setPagNomeRecebedor] = useState('');
  const [pagChavePix, setPagChavePix] = useState('');
  const [pagObservacao, setPagObservacao] = useState('');

  // Finalizar lote state
  const [finFormaPagamento, setFinFormaPagamento] = useState('');
  const [finContaBancaria, setFinContaBancaria] = useState('');
  const [finNomeRecebedor, setFinNomeRecebedor] = useState('');
  const [finChavePix, setFinChavePix] = useState('');
  const [finObservacao, setFinObservacao] = useState('');

  const refreshLotes = () => setLotes(getLotesConsignacao());

  const getFornecedorNome = (id: string) => fornecedores.find(f => f.id === id)?.nome || id;

  const voltar = () => {
    setViewMode('lista');
    setLoteSelecionado(null);
    setItensSelecionadosPagamento([]);
    refreshLotes();
  };

  // Filtros
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroData, setFiltroData] = useState('');

  // Stats (5 novos indicadores)
  const stats = useMemo(() => {
    const valorTotal = lotes.reduce((acc, l) =>
      acc + l.itens.reduce((a, i) => a + i.valorCusto * i.quantidadeOriginal, 0), 0);
    const totalPago = lotes.reduce((acc, l) =>
      acc + (l.pagamentosParciais || []).filter(p => p.status === 'Pago').reduce((a, p) => a + p.valor, 0), 0);
    const aPagar = lotes.reduce((acc, l) =>
      acc + l.itens.filter(i => i.status === 'Consumido' || i.status === 'Em Pagamento')
        .reduce((a, i) => a + (i.quantidadeOriginal - i.quantidade || i.quantidadeOriginal) * i.valorCusto, 0), 0);
    const saldoDisponivel = lotes.reduce((acc, l) =>
      acc + l.itens.filter(i => i.status === 'Disponivel').reduce((a, i) => a + i.quantidade * i.valorCusto, 0), 0);
    const totalDevolucoes = lotes.reduce((acc, l) =>
      acc + l.itens.filter(i => i.status === 'Devolvido').reduce((a, i) => a + i.quantidadeOriginal * i.valorCusto, 0), 0);
    return { valorTotal, totalPago, aPagar, saldoDisponivel, totalDevolucoes };
  }, [lotes]);

  // Lotes filtrados
  const lotesFiltrados = useMemo(() => {
    return lotes.filter(l => {
      if (filtroFornecedor && l.fornecedorId !== filtroFornecedor) return false;
      if (filtroStatus && filtroStatus !== 'all' && l.status !== filtroStatus) return false;
      if (filtroData && !l.dataCriacao.startsWith(filtroData)) return false;
      return true;
    });
  }, [lotes, filtroFornecedor, filtroStatus, filtroData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aberto': return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Aberto</Badge>;
      case 'Em Acerto': return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Em Acerto</Badge>;
      case 'Pago': return <Badge className="bg-green-500 hover:bg-green-600 text-white">Pago</Badge>;
      case 'Devolvido': return <Badge className="bg-gray-500 hover:bg-gray-600 text-white">Devolvido</Badge>;
      case 'Concluido': return <Badge className="bg-purple-700 hover:bg-purple-800 text-white">Concluído</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'Disponivel': return <Badge className="bg-green-500/15 text-green-600 border border-green-300">Disponível</Badge>;
      case 'Consumido': return <Badge className="bg-red-500/15 text-red-600 border border-red-300">Consumido</Badge>;
      case 'Devolvido': return <Badge className="bg-gray-500/15 text-gray-600 border border-gray-300">Devolvido</Badge>;
      case 'Em Acerto': return <Badge className="bg-yellow-500/15 text-yellow-600 border border-yellow-300">Em Acerto</Badge>;
      case 'Em Pagamento': return <Badge className="bg-amber-500/15 text-amber-600 border border-amber-300">Em Pagamento</Badge>;
      case 'Pago': return <Badge className="bg-emerald-700/15 text-emerald-700 border border-emerald-400">Pago</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Novo lote handlers
  const addItemRow = () => setNovoItens([...novoItens, { descricao: '', modelo: '', quantidade: '1', valorCusto: '', lojaDestinoId: '' }]);
  const removeItemRow = (idx: number) => setNovoItens(novoItens.filter((_, i) => i !== idx));
  const updateItemRow = (idx: number, field: string, value: string) => {
    const updated = [...novoItens];
    (updated[idx] as any)[field] = value;
    setNovoItens(updated);
  };

  const valorTotalNovo = novoItens.reduce((acc, item) => {
    const val = parseFloat(item.valorCusto.replace(/\D/g, '')) / 100 || 0;
    const qty = parseInt(item.quantidade) || 0;
    return acc + val * qty;
  }, 0);

  const handleCriarLote = () => {
    if (!novoFornecedor) {
      toast({ title: 'Erro', description: 'Selecione um fornecedor', variant: 'destructive' });
      return;
    }
    const itensValidos = novoItens.filter(i => i.descricao && i.lojaDestinoId && i.valorCusto);
    if (itensValidos.length === 0) {
      toast({ title: 'Erro', description: 'Adicione ao menos um item válido', variant: 'destructive' });
      return;
    }

    const input: CriarLoteInput = {
      fornecedorId: novoFornecedor,
      responsavel: user?.colaborador?.nome || 'Sistema',
      itens: itensValidos.map(i => ({
        descricao: i.descricao,
        modelo: i.modelo,
        quantidade: parseInt(i.quantidade) || 1,
        valorCusto: parseFloat(i.valorCusto.replace(/\D/g, '')) / 100,
        lojaDestinoId: i.lojaDestinoId,
      })),
    };

    const lote = criarLoteConsignacao(input);
    setNovoFornecedor('');
    setNovoItens([{ descricao: '', modelo: '', quantidade: '1', valorCusto: '', lojaDestinoId: '' }]);
    toast({ title: 'Lote criado', description: `${lote.id} cadastrado com ${lote.itens.length} item(s)` });
    voltar();
  };

  // readOnly mode for detalhamento (Eye) vs edit (Pencil)
  const [detalhamentoReadOnly, setDetalhamentoReadOnly] = useState(false);

  const handleVerDetalhamento = (lote: LoteConsignacao, readOnly: boolean = false) => {
    setLoteSelecionado(getLoteById(lote.id) || lote);
    setItensSelecionadosPagamento([]);
    setDetalhamentoReadOnly(readOnly);
    setViewMode('detalhamento');
  };

  const handleGerarPagamentoParcial = () => {
    if (!loteSelecionado || itensSelecionadosPagamento.length === 0 || !pagFormaPagamento) return;

    const result = gerarPagamentoParcial(
      loteSelecionado.id,
      itensSelecionadosPagamento,
      {
        formaPagamento: pagFormaPagamento,
        contaBancaria: pagContaBancaria,
        nomeRecebedor: pagNomeRecebedor,
        chavePix: pagChavePix,
        observacao: pagObservacao,
      },
      __pushNotaConsignacao
    );

    if (result) {
      toast({ title: 'Pagamento parcial gerado', description: `Nota ${result.notaFinanceiraId} criada - ${formatCurrency(result.valor)}` });
      setItensSelecionadosPagamento([]);
      setPagFormaPagamento('');
      setPagContaBancaria('');
      setPagNomeRecebedor('');
      setPagChavePix('');
      setPagObservacao('');
      setLoteSelecionado(getLoteById(loteSelecionado.id) || null);
      refreshLotes();
    }
  };

  const handleConfirmarPagamento = (pagamentoId: string) => {
    if (!loteSelecionado) return;
    confirmarPagamentoParcial(loteSelecionado.id, pagamentoId, user?.colaborador?.nome || 'Sistema');
    setLoteSelecionado(getLoteById(loteSelecionado.id) || null);
    refreshLotes();
    toast({ title: 'Pagamento confirmado', description: 'Status atualizado para Pago.' });
  };

  const handleFinalizarLote = () => {
    if (!loteSelecionado) return;

    const result = finalizarLote(
      loteSelecionado.id,
      user?.colaborador?.nome || 'Sistema',
      {
        formaPagamento: finFormaPagamento,
        contaBancaria: finContaBancaria,
        nomeRecebedor: finNomeRecebedor,
        chavePix: finChavePix,
        observacao: finObservacao,
      },
      __pushNotaConsignacao
    );

    if (result) {
      toast({ title: 'Lote finalizado', description: `${loteSelecionado.id} concluído. Devoluções confirmadas.` });
      setFinFormaPagamento('');
      setFinContaBancaria('');
      setFinNomeRecebedor('');
      setFinChavePix('');
      setFinObservacao('');
      voltar();
    }
  };

  // Devolução state for 2-step confirmation
  const [devolucaoItemId, setDevolucaoItemId] = useState<string | null>(null);
  const [devolucaoLoteId, setDevolucaoLoteId] = useState<string | null>(null);
  const [showDevolucaoDialog, setShowDevolucaoDialog] = useState(false);

  const handleConfirmarDevolucao = () => {
    if (!devolucaoLoteId || !devolucaoItemId) return;
    confirmarDevolucaoItem(devolucaoLoteId, devolucaoItemId, user?.colaborador?.nome || 'Sistema');
    setLoteSelecionado(getLoteById(devolucaoLoteId) || null);
    refreshLotes();
    setShowDevolucaoDialog(false);
    setDevolucaoItemId(null);
    setDevolucaoLoteId(null);
    toast({ title: 'Devolvido', description: 'Item devolvido. Registro mantido no histórico do estoque.' });
  };

  // Edit mode state
  const [editItens, setEditItens] = useState<EditItemState[]>([]);
  const [editFornecedor, setEditFornecedor] = useState('');
  const [editItensRemovidos, setEditItensRemovidos] = useState<string[]>([]);
  const [editNovosItens, setEditNovosItens] = useState<EditItemState[]>([]);

  const iniciarEdicao = (lote: LoteConsignacao) => {
    setEditFornecedor(lote.fornecedorId);
    setEditItens(lote.itens.filter(i => i.status === 'Disponivel').map(i => ({
      id: i.id,
      descricao: i.descricao,
      modelo: i.modelo,
      quantidade: String(i.quantidade),
      valorCusto: i.valorCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      lojaDestinoId: i.lojaAtualId,
    })));
    setEditItensRemovidos([]);
    setEditNovosItens([]);
  };

  const handleVerDetalhamentoEdit = (lote: LoteConsignacao) => {
    const loteAtual = getLoteById(lote.id) || lote;
    setLoteSelecionado(loteAtual);
    setItensSelecionadosPagamento([]);
    setDetalhamentoReadOnly(false);
    iniciarEdicao(loteAtual);
    setViewMode('detalhamento');
  };

  const addEditNovoItem = () => {
    setEditNovosItens([...editNovosItens, { id: `new-${Date.now()}`, descricao: '', modelo: '', quantidade: '1', valorCusto: '', lojaDestinoId: '' }]);
  };

  const removeEditNovoItem = (idx: number) => setEditNovosItens(editNovosItens.filter((_, i) => i !== idx));

  const updateEditItem = (id: string, field: string, value: string) => {
    setEditItens(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateEditNovoItem = (idx: number, field: string, value: string) => {
    const updated = [...editNovosItens];
    (updated[idx] as any)[field] = value;
    setEditNovosItens(updated);
  };

  const marcarItemParaRemover = (itemId: string) => {
    setEditItensRemovidos(prev => [...prev, itemId]);
    setEditItens(prev => prev.filter(i => i.id !== itemId));
  };

  const handleSalvarEdicao = () => {
    if (!loteSelecionado) return;

    const parseVal = (v: string) => {
      const numbers = v.replace(/\D/g, '');
      return parseInt(numbers || '0') / 100;
    };

    const itensEditados = editItens.map(i => ({
      id: i.id,
      descricao: i.descricao,
      modelo: i.modelo,
      quantidade: parseInt(i.quantidade) || 1,
      valorCusto: parseVal(i.valorCusto),
      lojaDestinoId: i.lojaDestinoId,
    }));

    const novosItensValidos = editNovosItens.filter(i => i.descricao && i.lojaDestinoId && i.valorCusto).map(i => ({
      descricao: i.descricao,
      modelo: i.modelo,
      quantidade: parseInt(i.quantidade) || 1,
      valorCusto: parseVal(i.valorCusto),
      lojaDestinoId: i.lojaDestinoId,
    }));

    const result = editarLoteConsignacao(loteSelecionado.id, {
      fornecedorId: editFornecedor !== loteSelecionado.fornecedorId ? editFornecedor : undefined,
      itens: itensEditados,
      novosItens: novosItensValidos.length > 0 ? novosItensValidos : undefined,
      itensRemovidos: editItensRemovidos.length > 0 ? editItensRemovidos : undefined,
    }, user?.colaborador?.nome || 'Sistema');

    if (result) {
      toast({ title: 'Lote atualizado', description: 'As alterações foram salvas com sucesso.' });
      setLoteSelecionado(getLoteById(loteSelecionado.id) || null);
      refreshLotes();
    }
  };

  // Inventory filters state
  const [filtroInventarioStatus, setFiltroInventarioStatus] = useState('todos');
  const [filtroInventarioLoja, setFiltroInventarioLoja] = useState('todos');
  const [filtroInventarioBusca, setFiltroInventarioBusca] = useState('');

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const toggleItemSelecionado = (itemId: string) => {
    setItensSelecionadosPagamento(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  // ==================== VIEW: NOVO LOTE ====================
  if (viewMode === 'novo') {
    return (
      <OSLayout title="Consignação" icon={PackageCheck}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={voltar}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Novo Lote de Consignação
            </h2>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor *</Label>
                  <AutocompleteFornecedor value={novoFornecedor} onChange={setNovoFornecedor} placeholder="Selecione..." />
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input value={user?.colaborador?.nome || 'Sistema'} disabled className="bg-muted" />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Itens do Lote</h3>
                  <Button variant="outline" size="sm" onClick={addItemRow}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {novoItens.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end p-3 bg-muted/30 rounded-lg">
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs">Descrição *</Label>
                        <Input value={item.descricao} onChange={e => updateItemRow(idx, 'descricao', e.target.value)} placeholder="Ex: Tela LCD iPhone 14" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Modelo</Label>
                        <Input value={item.modelo} onChange={e => updateItemRow(idx, 'modelo', e.target.value)} placeholder="iPhone 14" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qtd</Label>
                        <Input type="number" min="1" value={item.quantidade} onChange={e => updateItemRow(idx, 'quantidade', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor Custo *</Label>
                        <Input value={item.valorCusto} onChange={e => updateItemRow(idx, 'valorCusto', formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
                      </div>
                      <div className="flex items-end gap-1">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Loja *</Label>
                          <AutocompleteLoja value={item.lojaDestinoId} onChange={v => updateItemRow(idx, 'lojaDestinoId', v)} filtrarPorTipo="Assistência" placeholder="Loja" />
                        </div>
                        {novoItens.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeItemRow(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-muted rounded-lg flex justify-between items-center">
                  <span className="font-medium">Valor Total do Lote:</span>
                  <span className="text-lg font-bold">{formatCurrency(valorTotalNovo)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={voltar}>Cancelar</Button>
                <Button onClick={handleCriarLote}>
                  <PackageCheck className="h-4 w-4 mr-2" />
                  Cadastrar Lote
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </OSLayout>
    );
  }

   // ==================== VIEW: DETALHAMENTO ====================
  if (viewMode === 'detalhamento' && loteSelecionado) {
    const itensConsumidos = loteSelecionado.itens.filter(i => ['Consumido', 'Em Pagamento', 'Pago'].includes(i.status));
    const sobras = loteSelecionado.itens.filter(i => i.status === 'Disponivel');
    const consumidosRemanescentes = loteSelecionado.itens.filter(i => i.status === 'Consumido');
    const temConsumidos = itensConsumidos.length > 0;
    const loteAberto = loteSelecionado.status === 'Aberto';
    const loteConcluido = loteSelecionado.status === 'Concluido';

    const valorSobras = sobras.reduce((a, i) => a + i.quantidade * i.valorCusto, 0);
    const valorConsumidosRemanescentes = consumidosRemanescentes.reduce((a, i) => {
      const qtd = i.quantidadeOriginal - i.quantidade || i.quantidadeOriginal;
      return a + i.valorCusto * qtd;
    }, 0);

    return (
      <OSLayout title="Consignação" icon={PackageCheck}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={voltar}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {detalhamentoReadOnly ? 'Detalhamento' : 'Edição'} do Lote {loteSelecionado.id}
            </h2>
            {detalhamentoReadOnly && <Badge variant="secondary">Somente Leitura</Badge>}
            {!detalhamentoReadOnly && <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Modo Edição</Badge>}
            {getStatusBadge(loteSelecionado.status)}
          </div>

          {/* Cabeçalho */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Fornecedor</Label>
                  {!detalhamentoReadOnly ? (
                    <AutocompleteFornecedor value={editFornecedor} onChange={setEditFornecedor} placeholder="Selecione..." />
                  ) : (
                    <p className="font-medium">{getFornecedorNome(loteSelecionado.fornecedorId)}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Criação</Label>
                  <p>{new Date(loteSelecionado.dataCriacao).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Responsável</Label>
                  <p>{loteSelecionado.responsavelCadastro}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor Consumido</Label>
                  <p className="font-bold text-red-600">{formatCurrency(getValorConsumido(loteSelecionado))}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor Total</Label>
                  <p className="font-bold">{formatCurrency(loteSelecionado.itens.reduce((a, i) => a + i.valorCusto * i.quantidadeOriginal, 0))}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edição de Itens (apenas no modo edição) */}
          {!detalhamentoReadOnly && loteAberto && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Editar Itens do Lote
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addEditNovoItem}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Item
                    </Button>
                    <Button size="sm" onClick={handleSalvarEdicao}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Salvar Alterações
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editItens.length === 0 && editNovosItens.length === 0 && (
                  <p className="text-center py-4 text-muted-foreground">Nenhum item disponível para edição</p>
                )}
                {editItens.map(item => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end p-3 bg-muted/30 rounded-lg">
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input value={item.descricao} onChange={e => updateEditItem(item.id, 'descricao', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Modelo</Label>
                      <Input value={item.modelo} onChange={e => updateEditItem(item.id, 'modelo', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input type="number" min="1" value={item.quantidade} onChange={e => updateEditItem(item.id, 'quantidade', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Custo</Label>
                      <Input value={item.valorCusto} onChange={e => updateEditItem(item.id, 'valorCusto', formatCurrencyInput(e.target.value))} />
                    </div>
                    <div className="flex items-end gap-1">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Loja</Label>
                        <AutocompleteLoja value={item.lojaDestinoId} onChange={v => updateEditItem(item.id, 'lojaDestinoId', v)} filtrarPorTipo="Assistência" placeholder="Loja" />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => marcarItemParaRemover(item.id)} title="Remover item">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {/* Novos itens */}
                {editNovosItens.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end p-3 bg-green-50/50 dark:bg-green-950/10 rounded-lg border border-dashed border-green-300 dark:border-green-800">
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Descrição *</Label>
                      <Input value={item.descricao} onChange={e => updateEditNovoItem(idx, 'descricao', e.target.value)} placeholder="Ex: Tela LCD iPhone 14" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Modelo</Label>
                      <Input value={item.modelo} onChange={e => updateEditNovoItem(idx, 'modelo', e.target.value)} placeholder="iPhone 14" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input type="number" min="1" value={item.quantidade} onChange={e => updateEditNovoItem(idx, 'quantidade', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Custo *</Label>
                      <Input value={item.valorCusto} onChange={e => updateEditNovoItem(idx, 'valorCusto', formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
                    </div>
                    <div className="flex items-end gap-1">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Loja *</Label>
                        <AutocompleteLoja value={item.lojaDestinoId} onChange={v => updateEditNovoItem(idx, 'lojaDestinoId', v)} filtrarPorTipo="Assistência" placeholder="Loja" />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeEditNovoItem(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {editItensRemovidos.length > 0 && (
                  <p className="text-xs text-destructive">{editItensRemovidos.length} item(ns) marcado(s) para remoção</p>
                )}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="inventario">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inventario">Inventário</TabsTrigger>
              <TabsTrigger value="pecas-usadas">Peças Usadas</TabsTrigger>
              <TabsTrigger value="historico-pagamentos">Histórico de Pagamentos</TabsTrigger>
            </TabsList>

            {/* Inventário */}
            <TabsContent value="inventario">
              <Card>
                <CardContent className="p-4 space-y-4">
                  {/* Filtros do Inventário */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select value={filtroInventarioStatus} onValueChange={setFiltroInventarioStatus}>
                        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="Disponivel">Disponível</SelectItem>
                          <SelectItem value="Consumido">Consumido</SelectItem>
                          <SelectItem value="Devolvido">Devolvido</SelectItem>
                          <SelectItem value="Em Pagamento">Em Pagamento</SelectItem>
                          <SelectItem value="Pago">Pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Loja</Label>
                      <AutocompleteLoja value={filtroInventarioLoja === 'todos' ? '' : filtroInventarioLoja} onChange={(v) => setFiltroInventarioLoja(v || 'todos')} filtrarPorTipo="Assistência" placeholder="Todas" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Busca</Label>
                      <Input placeholder="Descrição ou modelo..." value={filtroInventarioBusca} onChange={e => setFiltroInventarioBusca(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="sm" onClick={() => { setFiltroInventarioStatus('todos'); setFiltroInventarioLoja('todos'); setFiltroInventarioBusca(''); }}>
                        <XCircle className="h-4 w-4 mr-1" /> Limpar
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Modelo</TableHead>
                          <TableHead>Qtd Orig.</TableHead>
                          <TableHead>Qtd Atual</TableHead>
                          <TableHead>Valor Unit.</TableHead>
                          <TableHead>Loja</TableHead>
                          <TableHead>OS</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loteSelecionado.itens.filter(item => {
                          if (filtroInventarioStatus !== 'todos' && item.status !== filtroInventarioStatus) return false;
                          if (filtroInventarioLoja !== 'todos' && item.lojaAtualId !== filtroInventarioLoja) return false;
                          if (filtroInventarioBusca) {
                            const t = filtroInventarioBusca.toLowerCase();
                            if (!item.descricao.toLowerCase().includes(t) && !item.modelo.toLowerCase().includes(t)) return false;
                          }
                          return true;
                        }).map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">{item.id}</TableCell>
                            <TableCell className="font-medium">{item.descricao}</TableCell>
                            <TableCell className="text-xs">{item.modelo}</TableCell>
                            <TableCell>{item.quantidadeOriginal}</TableCell>
                            <TableCell className="font-bold">{item.quantidade}</TableCell>
                            <TableCell>{formatCurrency(item.valorCusto)}</TableCell>
                            <TableCell className="text-xs">{obterNomeLoja(item.lojaAtualId)}</TableCell>
                            <TableCell className="font-mono text-xs">{item.osVinculada || '-'}</TableCell>
                            <TableCell>{getItemStatusBadge(item.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Peças Usadas com seleção para pagamento parcial */}
            <TabsContent value="pecas-usadas">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Peças Consumidas</CardTitle>
                    {!loteConcluido && !detalhamentoReadOnly && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" disabled={itensSelecionadosPagamento.length === 0}>
                            <DollarSign className="h-4 w-4 mr-1" />
                            Gerar Pagamento Parcial{itensSelecionadosPagamento.length > 0 ? ` (${itensSelecionadosPagamento.length})` : ''}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Dados de Pagamento Parcial</AlertDialogTitle>
                            <AlertDialogDescription>
                              Informe os dados para gerar o pagamento parcial de {itensSelecionadosPagamento.length} item(ns).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Forma de Pagamento *</Label>
                              <Select value={pagFormaPagamento} onValueChange={setPagFormaPagamento}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pix">Pix</SelectItem>
                                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {pagFormaPagamento === 'Pix' && (
                              <>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Conta Bancária</Label>
                                  <Input value={pagContaBancaria} onChange={e => setPagContaBancaria(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Nome do Recebedor</Label>
                                  <Input value={pagNomeRecebedor} onChange={e => setPagNomeRecebedor(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Chave Pix</Label>
                                  <Input value={pagChavePix} onChange={e => setPagChavePix(e.target.value)} />
                                </div>
                              </>
                            )}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Observação</Label>
                              <Textarea value={pagObservacao} onChange={e => setPagObservacao(e.target.value)} rows={2} />
                            </div>
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleGerarPagamentoParcial} disabled={!pagFormaPagamento}>
                              Confirmar Pagamento Parcial
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {!loteConcluido && <TableHead className="w-10"></TableHead>}
                          <TableHead>Peça</TableHead>
                          <TableHead>Qtd Consumida</TableHead>
                          <TableHead>Valor de Custo</TableHead>
                          <TableHead>Loja</TableHead>
                          <TableHead>OS</TableHead>
                          <TableHead>Técnico</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensConsumidos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={loteConcluido ? 8 : 9} className="text-center py-4 text-muted-foreground">
                              Nenhuma peça consumida
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {itensConsumidos.map(item => {
                              const qtdConsumida = item.quantidadeOriginal - item.quantidade || item.quantidadeOriginal;
                              return (
                                <TableRow key={item.id}>
                                  {!loteConcluido && (
                                    <TableCell>
                                      {item.status === 'Consumido' ? (
                                        <Checkbox
                                          checked={itensSelecionadosPagamento.includes(item.id)}
                                          onCheckedChange={() => toggleItemSelecionado(item.id)}
                                        />
                                      ) : null}
                                    </TableCell>
                                  )}
                                  <TableCell className="font-medium text-sm">{item.descricao}</TableCell>
                                  <TableCell className="text-sm">{qtdConsumida}</TableCell>
                                  <TableCell className="text-sm font-semibold">{formatCurrency(item.valorCusto * qtdConsumida)}</TableCell>
                                  <TableCell className="text-sm">{obterNomeLoja(item.lojaAtualId)}</TableCell>
                                  <TableCell className="font-mono text-sm">{item.osVinculada || '-'}</TableCell>
                                  <TableCell className="text-sm">{item.tecnicoConsumo || '-'}</TableCell>
                                  <TableCell className="text-sm">{item.dataConsumo ? new Date(item.dataConsumo).toLocaleDateString('pt-BR') : '-'}</TableCell>
                                  <TableCell>{getItemStatusBadge(item.status)}</TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-muted/50 font-bold">
                              {!loteConcluido && <TableCell />}
                              <TableCell className="text-sm">Total</TableCell>
                              <TableCell className="text-sm">-</TableCell>
                              <TableCell className="text-sm font-bold text-destructive">
                                {formatCurrency(itensConsumidos.reduce((a, i) => {
                                  const qtd = i.quantidadeOriginal - i.quantidade || i.quantidadeOriginal;
                                  return a + i.valorCusto * qtd;
                                }, 0))}
                              </TableCell>
                              <TableCell colSpan={loteConcluido ? 5 : 6} className="text-sm">-</TableCell>
                            </TableRow>
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Histórico de Pagamentos */}
            <TabsContent value="historico-pagamentos">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Pagamentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(loteSelecionado.pagamentosParciais || []).length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Nenhum pagamento parcial gerado</p>
                  ) : (
                    loteSelecionado.pagamentosParciais.map(pag => (
                      <div key={pag.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">{pag.notaFinanceiraId}</span>
                            {pag.status === 'Pendente' ? (
                              <Badge className="bg-amber-500/15 text-amber-600 border border-amber-300">Pendente</Badge>
                            ) : (
                              <Badge className="bg-emerald-700/15 text-emerald-700 border border-emerald-400">Pago</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(pag.data).toLocaleString('pt-BR')} • {pag.itensIds.length} item(ns)
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">{formatCurrency(pag.valor)}</span>
                          {pag.status === 'Pendente' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Confirmar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Confirmar o pagamento da nota <strong>{pag.notaFinanceiraId}</strong> no valor de <strong>{formatCurrency(pag.valor)}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleConfirmarPagamento(pag.id)}>
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Botão Finalizar Lote */}
          {loteAberto && temConsumidos && !detalhamentoReadOnly && (
            <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Finalizar Lote e Confirmar Devoluções
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {consumidosRemanescentes.length > 0 && `${consumidosRemanescentes.length} peça(s) consumida(s) remanescente(s) serão pagas (${formatCurrency(valorConsumidosRemanescentes)}). `}
                      {sobras.length > 0 && `${sobras.length} sobra(s) serão devolvidas (${formatCurrency(valorSobras)}).`}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Lock className="h-4 w-4 mr-2" />
                        Finalizar Lote
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Finalizar Lote e Confirmar Devoluções</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-3">
                            <p>Esta ação é irreversível. Ao confirmar:</p>
                            {consumidosRemanescentes.length > 0 && (
                              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                <p className="font-medium text-red-700 dark:text-red-400">Peças a pagar ({consumidosRemanescentes.length}):</p>
                                <ul className="text-xs mt-1 space-y-0.5">
                                  {consumidosRemanescentes.map(i => (
                                    <li key={i.id}>• {i.descricao} - {formatCurrency(i.valorCusto * (i.quantidadeOriginal - i.quantidade || i.quantidadeOriginal))}</li>
                                  ))}
                                </ul>
                                <p className="font-bold mt-1 text-red-700 dark:text-red-400">Total: {formatCurrency(valorConsumidosRemanescentes)}</p>
                              </div>
                            )}
                            {sobras.length > 0 && (
                              <div className="p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                                <p className="font-medium">Sobras a devolver ({sobras.length}):</p>
                                <ul className="text-xs mt-1 space-y-0.5">
                                  {sobras.map(i => (
                                    <li key={i.id}>• {i.descricao} ({i.quantidade} un.)</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="space-y-3 pt-2 border-t">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Forma de Pagamento *</Label>
                                <Select value={finFormaPagamento} onValueChange={setFinFormaPagamento}>
                                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Pix">Pix</SelectItem>
                                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {finFormaPagamento === 'Pix' && (
                                <>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium">Conta Bancária</Label>
                                    <Input value={finContaBancaria} onChange={e => setFinContaBancaria(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium">Nome do Recebedor</Label>
                                    <Input value={finNomeRecebedor} onChange={e => setFinNomeRecebedor(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium">Chave Pix</Label>
                                    <Input value={finChavePix} onChange={e => setFinChavePix(e.target.value)} />
                                  </div>
                                </>
                              )}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Observação</Label>
                                <Textarea value={finObservacao} onChange={e => setFinObservacao(e.target.value)} rows={2} />
                              </div>
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleFinalizarLote} disabled={!finFormaPagamento}>
                          Confirmar Finalização
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline fixa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {loteSelecionado.timeline.map((entry, idx) => (
                  <div key={idx} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {entry.tipo === 'entrada' && <Package className="h-4 w-4 text-blue-500" />}
                      {entry.tipo === 'consumo' && <CheckCircle className="h-4 w-4 text-red-500" />}
                      {entry.tipo === 'transferencia' && <ArrowRightLeft className="h-4 w-4 text-purple-500" />}
                      {entry.tipo === 'acerto' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      {entry.tipo === 'devolucao' && <PackageCheck className="h-4 w-4 text-gray-500" />}
                      {entry.tipo === 'pagamento' && <DollarSign className="h-4 w-4 text-green-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{entry.descricao}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span>{new Date(entry.data).toLocaleString('pt-BR')}</span>
                        <span>• {entry.responsavel}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </OSLayout>
    );
  }

  // ==================== VIEW: LISTA (padrão) ====================
  return (
    <OSLayout title="Consignação" icon={PackageCheck}>
      {/* Dashboard Cards - 5 indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatsCard
          title="Valor Total"
          value={formatCurrency(stats.valorTotal)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatsCard
          title="Total Já Pago"
          value={formatCurrency(stats.totalPago)}
          icon={<CheckCircle className="h-5 w-5" />}
          valueClassName="text-green-600"
        />
        <StatsCard
          title="A Pagar (Pendente)"
          value={formatCurrency(stats.aPagar)}
          icon={<Clock className="h-5 w-5" />}
          valueClassName="text-destructive"
        />
        <StatsCard
          title="Saldo Disponível"
          value={formatCurrency(stats.saldoDisponivel)}
          icon={<Package className="h-5 w-5" />}
          valueClassName="text-blue-600"
        />
        <StatsCard
          title="Total Devoluções"
          value={formatCurrency(stats.totalDevolucoes)}
          icon={<Undo2 className="h-5 w-5" />}
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Fornecedor</Label>
          <AutocompleteFornecedor value={filtroFornecedor} onChange={setFiltroFornecedor} placeholder="Todos" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Aberto">Aberto</SelectItem>
              <SelectItem value="Concluido">Concluído</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="Devolvido">Devolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Data</Label>
          <Input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button size="sm" onClick={() => setViewMode('novo')} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lote
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setFiltroFornecedor(''); setFiltroStatus(''); setFiltroData(''); }} title="Limpar Filtros">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabela de Lotes */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Data Recebimento</TableHead>
              <TableHead>Total Itens</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Valor Usado</TableHead>
              <TableHead>Consumidos</TableHead>
              <TableHead>Disponíveis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhum lote de consignação encontrado
                </TableCell>
              </TableRow>
            ) : (
              lotesFiltrados.map(lote => {
                const consumidos = lote.itens.filter(i => ['Consumido', 'Em Pagamento', 'Pago'].includes(i.status)).length;
                const disponiveis = lote.itens.filter(i => i.status === 'Disponivel').length;
                const valorTotal = lote.itens.reduce((a, i) => a + i.valorCusto * i.quantidadeOriginal, 0);
                const valorUsado = getValorConsumido(lote);
                return (
                  <TableRow key={lote.id}>
                    <TableCell className="font-mono text-xs font-medium">{lote.id}</TableCell>
                    <TableCell>{getFornecedorNome(lote.fornecedorId)}</TableCell>
                    <TableCell className="text-xs">{new Date(lote.dataCriacao).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{lote.itens.length}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(valorTotal)}</TableCell>
                    <TableCell className="font-semibold text-destructive">{formatCurrency(valorUsado)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 text-red-600">{consumidos}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-600">{disponiveis}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(lote.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleVerDetalhamento(lote, true)} title="Detalhamento (somente leitura)">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {lote.status === 'Aberto' && (
                          <Button variant="ghost" size="sm" onClick={() => handleVerDetalhamentoEdit(lote)} title="Editar Lote">
                            <Pencil className="h-4 w-4" />
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

      {/* AlertDialog for 2-step devolução confirmation */}
      <AlertDialog open={showDevolucaoDialog} onOpenChange={setShowDevolucaoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Devolução de Item</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                if (!devolucaoLoteId || !devolucaoItemId) return 'Item não encontrado.';
                const lote = getLoteById(devolucaoLoteId);
                const item = lote?.itens.find(i => i.id === devolucaoItemId);
                return item ? (
                  <>
                    Confirmar a devolução de <strong>{item.descricao}</strong> ({item.quantidade} un.)?
                    <br /><br />
                    <span className="text-destructive font-medium">Esta ação é irreversível.</span> O item será marcado como devolvido ao fornecedor e removido do estoque ativo.
                    <br /><br />
                    <span className="text-xs text-muted-foreground">Responsável: {user?.colaborador?.nome || 'Sistema'} • {new Date().toLocaleString('pt-BR')}</span>
                  </>
                ) : 'Item não encontrado.';
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirmarDevolucao}>
              Confirmar Devolução
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OSLayout>
  );
}
