import { useState, useMemo } from 'react';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { getPecas, Peca, initializePecasWithLojaIds } from '@/utils/pecasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { Plus, ArrowRightLeft, Package, Eye, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

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
}

let movimentacoesPecas: MovimentacaoPeca[] = [];
let movPecaCounter = 1;

export default function OSMovimentacaoPecas() {
  const { toast } = useToast();
  const { obterLojasTipoLoja, obterNomeLoja, obterColaboradoresAtivos } = useCadastroStore();
  const lojas = obterLojasTipoLoja();
  const colaboradores = obterColaboradoresAtivos();

  useEffect(() => {
    const lojaIds = lojas.map(l => l.id);
    if (lojaIds.length > 0) {
      initializePecasWithLojaIds(lojaIds);
    }
  }, [lojas]);

  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoPeca[]>(movimentacoesPecas);
  const pecas = useMemo(() => getPecas().filter(p => p.status === 'Disponível' && p.quantidade > 0), [lojas]);

  // Filtros
  const [filtroOrigem, setFiltroOrigem] = useState('todas');
  const [filtroDestino, setFiltroDestino] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Modal nova movimentação
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    pecaId: '',
    quantidade: '1',
    destino: '',
    responsavel: '',
    motivo: ''
  });

  const pecaSelecionada = pecas.find(p => p.id === formData.pecaId);

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(m => {
      if (filtroOrigem !== 'todas' && m.origem !== filtroOrigem) return false;
      if (filtroDestino !== 'todas' && m.destino !== filtroDestino) return false;
      if (filtroStatus !== 'todos' && m.status !== filtroStatus) return false;
      return true;
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [movimentacoes, filtroOrigem, filtroDestino, filtroStatus]);

  const handleRegistrar = () => {
    if (!formData.pecaId || !formData.destino || !formData.responsavel || !formData.motivo.trim()) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const peca = pecas.find(p => p.id === formData.pecaId);
    if (!peca) return;

    const qtd = parseInt(formData.quantidade) || 1;
    if (qtd > peca.quantidade) {
      toast({ title: 'Erro', description: 'Quantidade indisponível em estoque', variant: 'destructive' });
      return;
    }

    const novaMov: MovimentacaoPeca = {
      id: `MOV-PEC-${String(movPecaCounter++).padStart(4, '0')}`,
      pecaId: peca.id,
      descricaoPeca: peca.descricao,
      modelo: peca.modelo,
      quantidade: qtd,
      origem: peca.lojaId,
      destino: formData.destino,
      responsavel: colaboradores.find(c => c.id === formData.responsavel)?.nome || formData.responsavel,
      motivo: formData.motivo,
      data: new Date().toISOString(),
      status: 'Pendente'
    };

    movimentacoesPecas.push(novaMov);
    setMovimentacoes([...movimentacoesPecas]);
    setDialogOpen(false);
    setFormData({ pecaId: '', quantidade: '1', destino: '', responsavel: '', motivo: '' });
    toast({ title: 'Movimentação registrada', description: `${novaMov.id} criada com sucesso` });
  };

  const handleConfirmarRecebimento = (id: string) => {
    const idx = movimentacoesPecas.findIndex(m => m.id === id);
    if (idx !== -1) {
      movimentacoesPecas[idx].status = 'Recebido';
      setMovimentacoes([...movimentacoesPecas]);
      toast({ title: 'Recebimento confirmado', description: `Movimentação ${id} confirmada` });
    }
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
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Origem</Label>
              <AutocompleteLoja
                value={filtroOrigem === 'todas' ? '' : filtroOrigem}
                onChange={(v) => setFiltroOrigem(v || 'todas')}
                placeholder="Todas"
              />
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <AutocompleteLoja
                value={filtroDestino === 'todas' ? '' : filtroDestino}
                onChange={(v) => setFiltroDestino(v || 'todas')}
                placeholder="Todos"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Recebido">Recebido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setFiltroOrigem('todas'); setFiltroDestino('todas'); setFiltroStatus('todos'); }}>
                <X className="h-4 w-4 mr-2" />
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
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Peça</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimentacoesFiltradas.map(mov => (
              <TableRow key={mov.id} className={mov.status === 'Pendente' ? 'bg-yellow-500/10' : ''}>
                <TableCell className="font-mono text-xs">{mov.id}</TableCell>
                <TableCell className="text-xs">{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="font-medium">{mov.descricaoPeca}</TableCell>
                <TableCell className="text-xs">{mov.modelo}</TableCell>
                <TableCell>{mov.quantidade}</TableCell>
                <TableCell className="text-xs">{obterNomeLoja(mov.origem)}</TableCell>
                <TableCell className="text-xs">{obterNomeLoja(mov.destino)}</TableCell>
                <TableCell className="text-xs">{mov.responsavel}</TableCell>
                <TableCell>
                  {mov.status === 'Pendente' 
                    ? <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>
                    : <Badge className="bg-green-500 hover:bg-green-600">Recebido</Badge>
                  }
                </TableCell>
                <TableCell>
                  {mov.status === 'Pendente' && (
                    <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleConfirmarRecebimento(mov.id)}>
                      Confirmar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {movimentacoesFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Nova Movimentação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Nova Movimentação de Peça
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Peça *</Label>
              <Select value={formData.pecaId} onValueChange={v => setFormData({ ...formData, pecaId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione uma peça..." /></SelectTrigger>
                <SelectContent>
                  {pecas.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.descricao} ({p.modelo}) - Qtd: {p.quantidade} - {obterNomeLoja(p.lojaId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pecaSelecionada && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Origem:</strong> {obterNomeLoja(pecaSelecionada.lojaId)}</p>
                <p><strong>Disponível:</strong> {pecaSelecionada.quantidade} unidades</p>
                <p><strong>Valor Custo:</strong> {formatCurrency(pecaSelecionada.valorCusto)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                max={pecaSelecionada?.quantidade || 1}
                value={formData.quantidade}
                onChange={e => setFormData({ ...formData, quantidade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Destino *</Label>
              <AutocompleteLoja
                value={formData.destino}
                onChange={v => setFormData({ ...formData, destino: v })}
                apenasLojasTipoLoja={true}
                placeholder="Selecione a loja destino..."
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <AutocompleteColaborador
                value={formData.responsavel}
                onChange={v => setFormData({ ...formData, responsavel: v })}
                placeholder="Selecione..."
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea
                value={formData.motivo}
                onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Motivo da movimentação..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegistrar}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
