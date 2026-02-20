import { useState, useMemo, useEffect } from 'react';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { useAuthStore } from '@/store/authStore';
import { getPecas, getPecaById, updatePeca, Peca, initializePecasWithLojaIds } from '@/utils/pecasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { Plus, Package, Search, X, CheckCircle, Clock, Eye, Edit, ArrowRight, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ResponsiveTableContainer } from '@/components/ui/ResponsiveContainers';
import { Separator } from '@/components/ui/separator';

interface MovimentacaoPeca {
  id: string;
  pecaId: string;
  descricaoPeca: string;
  modelo: string;
  quantidade: number;
  origem: string;
  destino: string;
  responsavel: string;
  motivo: string;
  data: string;
  status: 'Pendente' | 'Recebido';
  dataRecebimento?: string;
  responsavelRecebimento?: string;
}

let movimentacoesPecas: MovimentacaoPeca[] = [];
let movPecaCounter = 1;

export default function OSMovimentacaoPecas() {
  const { toast } = useToast();
  const { obterLojasTipoLoja, obterNomeLoja, obterColaboradoresAtivos } = useCadastroStore();
  const user = useAuthStore(state => state.user);
  const lojas = obterLojasTipoLoja();
  const colaboradores = obterColaboradoresAtivos();

  useEffect(() => {
    const lojaIds = lojas.map(l => l.id);
    if (lojaIds.length > 0) {
      initializePecasWithLojaIds(lojaIds);
    }
  }, [lojas]);

  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoPeca[]>(movimentacoesPecas);
  const pecas = useMemo(() => getPecas().filter(p => p.status === 'Disponível' && p.quantidade > 0 && p.statusMovimentacao !== 'Em movimentação'), [lojas, movimentacoes]);

  // Filtros
  const [filtroOrigem, setFiltroOrigem] = useState('todas');
  const [filtroDestino, setFiltroDestino] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Modal nova movimentação
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pecaSelecionada, setPecaSelecionada] = useState<Peca | null>(null);
  const [formData, setFormData] = useState({
    quantidade: '1',
    destino: '',
    responsavel: user?.colaborador?.id || '',
    motivo: '',
    data: '',
  });

  // Modal de busca de peça
  const [showPecaModal, setShowPecaModal] = useState(false);
  const [buscaPeca, setBuscaPeca] = useState('');
  const [buscaLojaModal, setBuscaLojaModal] = useState<string>('todas');

  // AlertDialog de confirmação de recebimento
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [movParaConfirmar, setMovParaConfirmar] = useState<MovimentacaoPeca | null>(null);

  // Modal de timeline (Eye)
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [movTimeline, setMovTimeline] = useState<MovimentacaoPeca | null>(null);

  // Modal de edição
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [movParaEditar, setMovParaEditar] = useState<MovimentacaoPeca | null>(null);
  const [editForm, setEditForm] = useState({ destino: '', motivo: '' });

  const pecasFiltradas = useMemo(() => {
    let resultado = pecas;
    if (buscaLojaModal !== 'todas') {
      resultado = resultado.filter(p => p.lojaId === buscaLojaModal);
    }
    if (buscaPeca) {
      const busca = buscaPeca.toLowerCase();
      resultado = resultado.filter(p =>
        p.descricao.toLowerCase().includes(busca) ||
        p.modelo.toLowerCase().includes(busca) ||
        p.id.toLowerCase().includes(busca)
      );
    }
    return resultado;
  }, [pecas, buscaPeca, buscaLojaModal]);

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(m => {
      if (filtroOrigem !== 'todas' && m.origem !== filtroOrigem) return false;
      if (filtroDestino !== 'todas' && m.destino !== filtroDestino) return false;
      if (filtroStatus !== 'todos' && m.status !== filtroStatus) return false;
      return true;
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [movimentacoes, filtroOrigem, filtroDestino, filtroStatus]);

  const handleSelecionarPeca = (peca: Peca) => {
    setPecaSelecionada(peca);
    setShowPecaModal(false);
    setBuscaPeca('');
    setBuscaLojaModal('todas');
  };

  const resetForm = () => {
    setPecaSelecionada(null);
    setFormData({ quantidade: '1', destino: '', responsavel: user?.colaborador?.id || '', motivo: '', data: '' });
  };

  const handleRegistrar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!pecaSelecionada) {
      toast({ title: 'Erro', description: 'Selecione uma peça', variant: 'destructive' });
      return;
    }
    if (!formData.destino) {
      toast({ title: 'Erro', description: 'Selecione o destino', variant: 'destructive' });
      return;
    }
    if (!formData.motivo.trim()) {
      toast({ title: 'Erro', description: 'Informe o motivo da movimentação', variant: 'destructive' });
      return;
    }

    const qtd = parseInt(formData.quantidade) || 1;
    if (qtd > pecaSelecionada.quantidade) {
      toast({ title: 'Erro', description: 'Quantidade indisponível em estoque', variant: 'destructive' });
      return;
    }

    if (pecaSelecionada.lojaId === formData.destino) {
      toast({ title: 'Erro', description: 'Origem e destino não podem ser iguais', variant: 'destructive' });
      return;
    }

    const movId = `MOV-PEC-${String(movPecaCounter++).padStart(4, '0')}`;

    // Marcar peça como "Em movimentação"
    updatePeca(pecaSelecionada.id, {
      statusMovimentacao: 'Em movimentação',
      movimentacaoPecaId: movId,
    });

    const novaMov: MovimentacaoPeca = {
      id: movId,
      pecaId: pecaSelecionada.id,
      descricaoPeca: pecaSelecionada.descricao,
      modelo: pecaSelecionada.modelo,
      quantidade: qtd,
      origem: pecaSelecionada.lojaId,
      destino: formData.destino,
      responsavel: user?.colaborador?.nome || 'Não identificado',
      motivo: formData.motivo,
      data: formData.data ? new Date(formData.data).toISOString() : new Date().toISOString(),
      status: 'Pendente'
    };

    movimentacoesPecas.push(novaMov);
    setMovimentacoes([...movimentacoesPecas]);
    setDialogOpen(false);
    resetForm();
    toast({ title: 'Movimentação registrada', description: `${novaMov.id} - Peça marcada como "Em movimentação"` });
  };

  // Abrir AlertDialog de confirmação
  const handleAbrirConfirmacao = (mov: MovimentacaoPeca) => {
    setMovParaConfirmar(mov);
    setConfirmDialogOpen(true);
  };

  // Confirmar recebimento com responsável auto-preenchido
  const handleConfirmarRecebimento = () => {
    if (!movParaConfirmar) return;

    const idx = movimentacoesPecas.findIndex(m => m.id === movParaConfirmar.id);
    if (idx !== -1) {
      movimentacoesPecas[idx].status = 'Recebido';
      movimentacoesPecas[idx].dataRecebimento = new Date().toISOString();
      movimentacoesPecas[idx].responsavelRecebimento = user?.colaborador?.nome || 'Não identificado';

      // Atualizar lojaId da peça para o destino e limpar bloqueio
      updatePeca(movParaConfirmar.pecaId, {
        lojaId: movParaConfirmar.destino,
        statusMovimentacao: null,
        movimentacaoPecaId: undefined,
      });

      setMovimentacoes([...movimentacoesPecas]);
      toast({ title: 'Recebimento confirmado', description: `Peça transferida para ${obterNomeLoja(movParaConfirmar.destino)}` });
    }

    setConfirmDialogOpen(false);
    setMovParaConfirmar(null);
  };

  // Abrir timeline
  const handleAbrirTimeline = (mov: MovimentacaoPeca) => {
    setMovTimeline(mov);
    setTimelineDialogOpen(true);
  };

  // Abrir edição
  const handleAbrirEdicao = (mov: MovimentacaoPeca) => {
    setMovParaEditar(mov);
    setEditForm({ destino: mov.destino, motivo: mov.motivo });
    setEditDialogOpen(true);
  };

  const handleSalvarEdicao = () => {
    if (!movParaEditar) return;
    if (!editForm.destino || !editForm.motivo.trim()) {
      toast({ title: 'Erro', description: 'Preencha destino e motivo', variant: 'destructive' });
      return;
    }
    if (movParaEditar.origem === editForm.destino) {
      toast({ title: 'Erro', description: 'Origem e destino não podem ser iguais', variant: 'destructive' });
      return;
    }

    const idx = movimentacoesPecas.findIndex(m => m.id === movParaEditar.id);
    if (idx !== -1) {
      movimentacoesPecas[idx].destino = editForm.destino;
      movimentacoesPecas[idx].motivo = editForm.motivo;
      setMovimentacoes([...movimentacoesPecas]);
      toast({ title: 'Movimentação atualizada' });
    }
    setEditDialogOpen(false);
    setMovParaEditar(null);
  };

  const pendentes = movimentacoes.filter(m => m.status === 'Pendente').length;
  const recebidas = movimentacoes.filter(m => m.status === 'Recebido').length;

  return (
    <OSLayout title="Movimentação - Peças">
      {/* Stats */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{movimentacoes.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{pendentes}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{recebidas}</div>
              <div className="text-xs text-muted-foreground">Recebidas</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Origem</Label>
              <AutocompleteLoja
                value={filtroOrigem === 'todas' ? '' : filtroOrigem}
                onChange={(v) => setFiltroOrigem(v || 'todas')}
                placeholder="Todas as origens"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Destino</Label>
              <AutocompleteLoja
                value={filtroDestino === 'todas' ? '' : filtroDestino}
                onChange={(v) => setFiltroDestino(v || 'todas')}
                placeholder="Todos os destinos"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Recebido">Recebido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => { setFiltroOrigem('todas'); setFiltroDestino('todas'); setFiltroStatus('todos'); }}
              >
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
            <div className="flex items-end">
              <Button onClick={() => setDialogOpen(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Nova Movimentação
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <ResponsiveTableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-20 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Peça</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimentacoesFiltradas.map(mov => (
              <TableRow key={mov.id} className={cn(
                mov.status === 'Pendente' && 'bg-yellow-500/10',
                mov.status === 'Recebido' && 'bg-green-500/10'
              )}>
                <TableCell className="sticky left-0 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="font-medium">{mov.descricaoPeca}</div>
                  {mov.status === 'Pendente' && (
                    <Badge variant="outline" className="text-[10px] mt-1 border-yellow-500 text-yellow-600">
                      Em movimentação
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{mov.id}</TableCell>
                <TableCell className="text-xs">{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-xs">{mov.modelo}</TableCell>
                <TableCell>{mov.quantidade}</TableCell>
                <TableCell className="text-xs">{obterNomeLoja(mov.origem)}</TableCell>
                <TableCell className="text-xs">{obterNomeLoja(mov.destino)}</TableCell>
                <TableCell className="text-xs">{mov.responsavel}</TableCell>
                <TableCell>
                  {mov.status === 'Recebido' ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">Recebido</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">Pendente</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title={mov.motivo}>{mov.motivo}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Visualizar timeline"
                      onClick={() => handleAbrirTimeline(mov)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {mov.status === 'Pendente' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          title="Editar movimentação"
                          onClick={() => handleAbrirEdicao(mov)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleAbrirConfirmacao(mov)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {movimentacoesFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ResponsiveTableContainer>

      {/* Modal Nova Movimentação */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Movimentação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegistrar} className="space-y-4">
            <div>
              <Label>Peça *</Label>
              {pecaSelecionada ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{pecaSelecionada.descricao}</p>
                    <p className="text-sm text-muted-foreground">
                      Modelo: {pecaSelecionada.modelo} | Qtd: {pecaSelecionada.quantidade} | Loja: {obterNomeLoja(pecaSelecionada.lojaId)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Custo: {formatCurrency(pecaSelecionada.valorCusto)} | Recomendado: {formatCurrency(pecaSelecionada.valorRecomendado)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPecaSelecionada(null);
                      setFormData(prev => ({ ...prev, quantidade: '1' }));
                    }}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowPecaModal(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar Peça no Estoque
                </Button>
              )}
            </div>

            <div>
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                max={pecaSelecionada?.quantidade || 1}
                value={formData.quantidade}
                onChange={e => setFormData(prev => ({ ...prev, quantidade: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="responsavel">Responsável *</Label>
              <Input
                value={user?.colaborador?.nome || 'Não identificado'}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="data">Data da Movimentação</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se não informado, será usada a data atual
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="origem">Origem</Label>
                <Input
                  value={pecaSelecionada ? obterNomeLoja(pecaSelecionada.lojaId) : ''}
                  disabled
                  placeholder="Selecione uma peça"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Preenchido automaticamente
                </p>
              </div>
              <div>
                <Label htmlFor="destino">Destino *</Label>
                <AutocompleteLoja
                  value={formData.destino}
                  onChange={(v) => setFormData(prev => ({ ...prev, destino: v }))}
                  placeholder="Selecione o destino"
                  apenasLojasTipoLoja={true}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="motivo">Motivo *</Label>
              <Textarea
                id="motivo"
                value={formData.motivo}
                onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Informe o motivo da movimentação"
                rows={3}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!pecaSelecionada}>Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Busca de Peça */}
      <Dialog open={showPecaModal} onOpenChange={setShowPecaModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Buscar Peça no Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por descrição, modelo ou ID..."
                value={buscaPeca}
                onChange={(e) => setBuscaPeca(e.target.value)}
                className="flex-1"
              />
              <Select value={buscaLojaModal} onValueChange={setBuscaLojaModal}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as lojas</SelectItem>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peça</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pecasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma peça disponível encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    pecasFiltradas.map(peca => (
                      <TableRow key={peca.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{peca.descricao}</TableCell>
                        <TableCell className="text-sm">{peca.modelo}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{peca.quantidade}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatCurrency(peca.valorCusto)}</TableCell>
                        <TableCell className="text-sm">{obterNomeLoja(peca.lojaId)}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleSelecionarPeca(peca)}>
                            Selecionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-muted-foreground">
              Exibindo {pecasFiltradas.length} de {pecas.length} peças disponíveis
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Recebimento */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Recebimento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Confirma o recebimento da peça na loja de destino? Esta ação irá transferir a peça fisicamente.</p>
                {movParaConfirmar && (
                  <div className="rounded-md border p-3 space-y-2 text-sm">
                    <div><span className="font-medium">Peça:</span> {movParaConfirmar.descricaoPeca}</div>
                    <div><span className="font-medium">Quantidade:</span> {movParaConfirmar.quantidade}</div>
                    <div><span className="font-medium">Origem:</span> {obterNomeLoja(movParaConfirmar.origem)}</div>
                    <div><span className="font-medium">Destino:</span> {obterNomeLoja(movParaConfirmar.destino)}</div>
                    <Separator />
                    <div><span className="font-medium">Responsável pelo recebimento:</span></div>
                    <Input
                      value={user?.colaborador?.nome || 'Não identificado'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarRecebimento} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Recebimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Timeline */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Timeline - {movTimeline?.id}</DialogTitle>
          </DialogHeader>
          {movTimeline && (
            <div className="space-y-4">
              {/* Etapa 1: Envio */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div className="w-0.5 flex-1 bg-border mt-1" />
                </div>
                <div className="pb-4">
                  <p className="font-medium text-sm">Envio Registrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(movTimeline.data).toLocaleDateString('pt-BR')} às {new Date(movTimeline.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="mt-2 text-xs space-y-1 bg-muted/50 rounded-md p-2">
                    <div><span className="font-medium">Peça:</span> {movTimeline.descricaoPeca}</div>
                    <div><span className="font-medium">Modelo:</span> {movTimeline.modelo}</div>
                    <div><span className="font-medium">Quantidade:</span> {movTimeline.quantidade}</div>
                    <div><span className="font-medium">Origem:</span> {obterNomeLoja(movTimeline.origem)}</div>
                    <div><span className="font-medium">Destino:</span> {obterNomeLoja(movTimeline.destino)}</div>
                    <div><span className="font-medium">Responsável:</span> {movTimeline.responsavel}</div>
                  </div>
                </div>
              </div>

              {/* Etapa 2: Recebimento */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    movTimeline.status === 'Recebido'
                      ? "bg-green-600 text-white"
                      : "bg-muted text-muted-foreground border-2 border-dashed border-muted-foreground/40"
                  )}>
                    {movTimeline.status === 'Recebido' ? <CheckCircle className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {movTimeline.status === 'Recebido' ? 'Recebimento Confirmado' : 'Aguardando Recebimento'}
                  </p>
                  {movTimeline.status === 'Recebido' ? (
                    <>
                      <p className="text-xs text-muted-foreground mt-1">
                        {movTimeline.dataRecebimento && new Date(movTimeline.dataRecebimento).toLocaleDateString('pt-BR')} às {movTimeline.dataRecebimento && new Date(movTimeline.dataRecebimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="mt-2 text-xs bg-green-500/10 rounded-md p-2">
                        <div><span className="font-medium">Responsável:</span> {movTimeline.responsavelRecebimento}</div>
                        <div><span className="font-medium">Destino confirmado:</span> {obterNomeLoja(movTimeline.destino)}</div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-yellow-600 mt-1">Pendente de confirmação</p>
                  )}
                </div>
              </div>

              {/* Motivo */}
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Motivo da movimentação</p>
                <p className="text-sm">{movTimeline.motivo}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Edição de Movimentação Pendente */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Movimentação - {movParaEditar?.id}</DialogTitle>
          </DialogHeader>
          {movParaEditar && (
            <div className="space-y-4">
              <div>
                <Label>Peça</Label>
                <Input value={movParaEditar.descricaoPeca} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Origem</Label>
                <Input value={obterNomeLoja(movParaEditar.origem)} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Destino *</Label>
                <AutocompleteLoja
                  value={editForm.destino}
                  onChange={(v) => setEditForm(prev => ({ ...prev, destino: v }))}
                  placeholder="Selecione o destino"
                  apenasLojasTipoLoja={true}
                />
              </div>
              <div>
                <Label>Motivo *</Label>
                <Textarea
                  value={editForm.motivo}
                  onChange={(e) => setEditForm(prev => ({ ...prev, motivo: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSalvarEdicao}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
