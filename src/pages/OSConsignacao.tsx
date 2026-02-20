import { useState, useMemo, useEffect } from 'react';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { getFornecedores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/formatUtils';
import { setOnConsumoPecaConsignada } from '@/utils/pecasApi';
import {
  getLotesConsignacao, getLoteById, criarLoteConsignacao, iniciarAcertoContas,
  confirmarDevolucaoItem, gerarLoteFinanceiro, getValorConsumido, finalizarAcerto,
  registrarConsumoPorPecaId, transferirItemConsignacao,
  LoteConsignacao, ItemConsignacao, CriarLoteInput,
} from '@/utils/consignacaoApi';
import { getNotasAssistencia, __pushNotaConsignacao } from '@/utils/solicitacaoPecasApi';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Eye, Trash2, Package, PackageCheck, Clock, DollarSign,
  FileText, ArrowRightLeft, CheckCircle, AlertTriangle, ArrowLeft, Undo2, Truck,
} from 'lucide-react';

type ViewMode = 'lista' | 'novo' | 'dossie' | 'acerto';

export default function OSConsignacao() {
  const { toast } = useToast();
  const { obterNomeLoja, obterLojasTipoLoja } = useCadastroStore();
  const user = useAuthStore(state => state.user);
  const fornecedores = getFornecedores();
  const lojas = obterLojasTipoLoja();

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

  // Acerto state
  const [acertoFormaPagamento, setAcertoFormaPagamento] = useState('');
  const [acertoContaBancaria, setAcertoContaBancaria] = useState('');
  const [acertoNomeRecebedor, setAcertoNomeRecebedor] = useState('');
  const [acertoChavePix, setAcertoChavePix] = useState('');
  const [acertoObservacao, setAcertoObservacao] = useState('');
  const [confirmacoesDevolucao, setConfirmacoesDevolucao] = useState<Record<string, { usuario: string; dataHora: string }>>({});

  const refreshLotes = () => setLotes(getLotesConsignacao());

  const getFornecedorNome = (id: string) => fornecedores.find(f => f.id === id)?.nome || id;

  const voltar = () => {
    setViewMode('lista');
    setLoteSelecionado(null);
    refreshLotes();
  };

  // Filtros
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroData, setFiltroData] = useState('');

  // Stats (5 indicadores consolidados)
  const stats = useMemo(() => {
    const valorTotal = lotes.reduce((acc, l) =>
      acc + l.itens.reduce((a, i) => a + i.valorCusto * i.quantidadeOriginal, 0), 0);
    const valorUsado = lotes.reduce((acc, l) => acc + getValorConsumido(l), 0);
    const totalProdutos = lotes.reduce((acc, l) =>
      acc + l.itens.reduce((a, i) => a + i.quantidadeOriginal, 0), 0);
    const totalConsumidos = lotes.reduce((acc, l) =>
      acc + l.itens.filter(i => i.status === 'Consumido').reduce((a, i) => a + i.quantidadeOriginal, 0), 0);
    const disponiveis = lotes.reduce((acc, l) =>
      acc + l.itens.filter(i => i.status === 'Disponivel').reduce((a, i) => a + i.quantidade, 0), 0);
    return { valorTotal, valorUsado, totalProdutos, totalConsumidos, disponiveis };
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
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'Disponivel': return <Badge className="bg-green-500/15 text-green-600 border border-green-300">Disponível</Badge>;
      case 'Consumido': return <Badge className="bg-red-500/15 text-red-600 border border-red-300">Consumido</Badge>;
      case 'Devolvido': return <Badge className="bg-gray-500/15 text-gray-600 border border-gray-300">Devolvido</Badge>;
      case 'Em Acerto': return <Badge className="bg-yellow-500/15 text-yellow-600 border border-yellow-300">Em Acerto</Badge>;
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

  const handleVerDossie = (lote: LoteConsignacao) => {
    setLoteSelecionado(getLoteById(lote.id) || lote);
    setViewMode('dossie');
  };

  const handleIniciarAcerto = (lote: LoteConsignacao) => {
    setLoteSelecionado(getLoteById(lote.id) || lote);
    setAcertoFormaPagamento('');
    setAcertoContaBancaria('');
    setAcertoNomeRecebedor('');
    setAcertoChavePix('');
    setAcertoObservacao('');
    setViewMode('acerto');
  };

  const handleConfirmarAcerto = () => {
    if (!loteSelecionado) return;

    // Injetar timeline consolidada antes do acerto
    const loteAtual = getLoteById(loteSelecionado.id);
    if (loteAtual) {
      const consumos = loteAtual.timeline.filter(t => t.tipo === 'consumo');
      const transferencias = loteAtual.timeline.filter(t => t.tipo === 'transferencia');
      const devolucoes = loteAtual.timeline.filter(t => t.tipo === 'devolucao');

      const linhas: string[] = [];
      if (consumos.length > 0) linhas.push(`${consumos.length} consumo(s) registrado(s)`);
      if (transferencias.length > 0) linhas.push(`${transferencias.length} transferência(s) entre lojas`);
      if (devolucoes.length > 0) linhas.push(`${devolucoes.length} devolução(ões)`);

      if (linhas.length > 0) {
        loteAtual.timeline.push({
          data: new Date().toISOString(),
          tipo: 'acerto',
          descricao: `Resumo de fechamento: ${linhas.join(', ')}.`,
          responsavel: user?.colaborador?.nome || 'Sistema',
        });
      }
    }

    iniciarAcertoContas(loteSelecionado.id, user?.colaborador?.nome || 'Sistema');
    
    const nota = gerarLoteFinanceiro(loteSelecionado.id, {
      formaPagamento: acertoFormaPagamento,
      contaBancaria: acertoContaBancaria,
      nomeRecebedor: acertoNomeRecebedor,
      chavePix: acertoChavePix,
      observacao: acertoObservacao,
    });

    if (nota) {
      __pushNotaConsignacao(nota);
    }

    toast({ title: 'Acerto iniciado', description: `Lote ${loteSelecionado.id} em acerto. Nota financeira gerada.` });
    voltar();
  };

  const handleConfirmarDevolucao = (loteId: string, itemId: string) => {
    confirmarDevolucaoItem(loteId, itemId, user?.colaborador?.nome || 'Sistema');
    setLoteSelecionado(getLoteById(loteId) || null);
    refreshLotes();
    toast({ title: 'Devolvido', description: 'Item devolvido. Registro mantido no histórico do estoque.' });
  };

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  // ==================== VIEW: DOSSIÊ ====================
  if (viewMode === 'dossie' && loteSelecionado) {
    return (
      <OSLayout title="Consignação" icon={PackageCheck}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={voltar}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dossiê do Lote {loteSelecionado.id}
            </h2>
            {getStatusBadge(loteSelecionado.status)}
          </div>

          {/* Cabeçalho */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Fornecedor</Label>
                  <p className="font-medium">{getFornecedorNome(loteSelecionado.fornecedorId)}</p>
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

          <Tabs defaultValue="inventario">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inventario">Inventário</TabsTrigger>
              <TabsTrigger value="devolucao">Devolução</TabsTrigger>
            </TabsList>

            <TabsContent value="inventario">
              <Card>
                <CardContent className="p-0">
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
                        {loteSelecionado.itens.map(item => (
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

            <TabsContent value="devolucao">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {loteSelecionado.itens.filter(i => i.status !== 'Consumido').map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{item.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantidade} un. restante(s) • {obterNomeLoja(item.lojaAtualId)}
                          </p>
                          {item.status === 'Devolvido' && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Devolvido por {item.devolvidoPor} em {new Date(item.dataDevolucao!).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                        {getItemStatusBadge(item.status)}
                      </div>
                    ))}
                    {loteSelecionado.itens.filter(i => i.status !== 'Consumido').length === 0 && (
                      <p className="text-center text-muted-foreground py-4">Todas as peças foram consumidas</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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

  // ==================== VIEW: ACERTO DE CONTAS ====================
  if (viewMode === 'acerto' && loteSelecionado) {
    return (
      <OSLayout title="Consignação" icon={PackageCheck}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={voltar}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              Acerto de Contas - {loteSelecionado.id}
            </h2>
            {getStatusBadge(loteSelecionado.status)}
          </div>

          {/* Resumo Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              title="Itens Consumidos"
              value={loteSelecionado.itens.filter(i => i.status === 'Consumido' || i.quantidade < i.quantidadeOriginal).length}
              icon={<Package className="h-5 w-5" />}
              valueClassName="text-destructive"
            />
            <StatsCard
              title="Valor a Pagar"
              value={formatCurrency(getValorConsumido(loteSelecionado))}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <StatsCard
              title="Sobras"
              value={loteSelecionado.itens.filter(i => i.status === 'Disponivel' && i.quantidade > 0).length}
              icon={<Undo2 className="h-5 w-5" />}
              valueClassName="text-success"
            />
            <StatsCard
              title="Fornecedor"
              value={getFornecedorNome(loteSelecionado.fornecedorId)}
              icon={<Truck className="h-5 w-5" />}
            />
          </div>

          {/* Peças Usadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Peças Usadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peça</TableHead>
                      <TableHead>Qtd Consumida</TableHead>
                      <TableHead>Valor de Custo</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const itensUsados = loteSelecionado.itens.filter(i => i.status === 'Consumido' || i.quantidade < i.quantidadeOriginal);
                      if (itensUsados.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Nenhuma peça usada</TableCell>
                          </TableRow>
                        );
                      }
                      const totalCusto = itensUsados.reduce((acc, item) => {
                        const qtdConsumida = item.quantidadeOriginal - item.quantidade || item.quantidadeOriginal;
                        return acc + item.valorCusto * qtdConsumida;
                      }, 0);
                      return (
                        <>
                          {itensUsados.map(item => {
                            const qtdConsumida = item.quantidadeOriginal - item.quantidade || item.quantidadeOriginal;
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium text-sm">{item.descricao}</TableCell>
                                <TableCell className="text-sm">{qtdConsumida}</TableCell>
                                <TableCell className="text-sm font-semibold">{formatCurrency(item.valorCusto * qtdConsumida)}</TableCell>
                                <TableCell className="text-sm">{obterNomeLoja(item.lojaAtualId)}</TableCell>
                                <TableCell className="font-mono text-sm">{item.osVinculada || '-'}</TableCell>
                                <TableCell className="text-sm">{item.tecnicoConsumo || '-'}</TableCell>
                                <TableCell className="text-sm">{item.dataConsumo ? new Date(item.dataConsumo).toLocaleDateString('pt-BR') : '-'}</TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell className="text-sm">Total</TableCell>
                            <TableCell className="text-sm">-</TableCell>
                            <TableCell className="text-sm font-bold text-destructive">{formatCurrency(totalCusto)}</TableCell>
                            <TableCell colSpan={4} className="text-sm">-</TableCell>
                          </TableRow>
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Sobras para devolução */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sobras para Devolução</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peça</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Valor de Custo</TableHead>
                      <TableHead>Confirmação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loteSelecionado.itens.filter(i => i.status === 'Disponivel' && i.quantidade > 0).map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">{item.descricao}</TableCell>
                        <TableCell className="text-sm">{obterNomeLoja(item.lojaAtualId)}</TableCell>
                        <TableCell className="text-sm">{item.quantidade}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(item.valorCusto * item.quantidade)}</TableCell>
                        <TableCell>
                          {confirmacoesDevolucao[item.id] ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Checkbox checked={true} onCheckedChange={() => {
                                  const updated = { ...confirmacoesDevolucao };
                                  delete updated[item.id];
                                  setConfirmacoesDevolucao(updated);
                                }} />
                                <span className="text-xs text-green-600 font-medium">Confirmado</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {confirmacoesDevolucao[item.id].usuario} • {confirmacoesDevolucao[item.id].dataHora}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Checkbox checked={false} onCheckedChange={() => {
                                setConfirmacoesDevolucao(prev => ({
                                  ...prev,
                                  [item.id]: {
                                    usuario: user?.colaborador?.nome || 'Sistema',
                                    dataHora: new Date().toLocaleString('pt-BR'),
                                  }
                                }));
                              }} />
                              <span className="text-xs text-muted-foreground">Confirmar devolução</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {loteSelecionado.itens.filter(i => i.status === 'Disponivel' && i.quantidade > 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Nenhuma sobra para devolução</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Dados de pagamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Forma de Pagamento *</Label>
                  <Select value={acertoFormaPagamento} onValueChange={setAcertoFormaPagamento}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {acertoFormaPagamento === 'Pix' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Conta Bancária</Label>
                      <Input value={acertoContaBancaria} onChange={e => setAcertoContaBancaria(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Nome do Recebedor</Label>
                      <Input value={acertoNomeRecebedor} onChange={e => setAcertoNomeRecebedor(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Chave Pix</Label>
                      <Input value={acertoChavePix} onChange={e => setAcertoChavePix(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Observação *</Label>
                <Textarea value={acertoObservacao} onChange={e => setAcertoObservacao(e.target.value)} placeholder="Observações sobre o acerto..." rows={3} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={voltar}>Cancelar</Button>
                <Button onClick={handleConfirmarAcerto} disabled={!acertoFormaPagamento || !acertoObservacao}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Gerar Lote Financeiro
                </Button>
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
          title="Valor Usado"
          value={formatCurrency(stats.valorUsado)}
          icon={<DollarSign className="h-5 w-5" />}
          valueClassName="text-destructive"
        />
        <StatsCard
          title="Total de Produtos"
          value={stats.totalProdutos}
          icon={<Package className="h-5 w-5" />}
        />
        <StatsCard
          title="Total Consumidos"
          value={stats.totalConsumidos}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatsCard
          title="Disponíveis"
          value={stats.disponiveis}
          icon={<PackageCheck className="h-5 w-5" />}
          valueClassName="text-green-600"
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
              <SelectItem value="Em Acerto">Em Acerto</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="Devolvido">Devolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Data</Label>
          <Input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button variant="outline" size="sm" onClick={() => setViewMode('novo')} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lote
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
                const consumidos = lote.itens.filter(i => i.status === 'Consumido').length;
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
                        <Button variant="ghost" size="sm" onClick={() => handleVerDossie(lote)} title="Ver Dossiê">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {lote.status === 'Aberto' && (
                          <Button variant="ghost" size="sm" onClick={() => handleIniciarAcerto(lote)} title="Iniciar Acerto">
                            <DollarSign className="h-4 w-4 text-yellow-600" />
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
    </OSLayout>
  );
}
