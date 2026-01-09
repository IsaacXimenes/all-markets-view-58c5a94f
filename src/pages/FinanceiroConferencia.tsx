import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Check, Download, Filter, X, Eye, Clock, CheckCircle2, Undo2 } from 'lucide-react';
import { getContasFinanceiras, getColaboradores, getCargos, getLojas } from '@/utils/cadastrosApi';
import { useFluxoVendas } from '@/hooks/useFluxoVendas';
import { 
  finalizarVenda, 
  devolverFinanceiro,
  getCorBadgeStatus,
  exportFluxoToCSV,
  VendaComFluxo,
  StatusVenda
} from '@/utils/fluxoVendasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { toast } from 'sonner';

// Mock do usuário logado (financeiro)
const usuarioLogado = { id: 'COL-008', nome: 'Ana Financeiro' };

export default function FinanceiroConferencia() {
  const navigate = useNavigate();
  const { vendas, recarregar } = useFluxoVendas({
    status: ['Conferência Financeiro', 'Finalizado']
  });
  
  const contasFinanceiras = getContasFinanceiras();
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  const lojas = getLojas();
  
  // Modais
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [modalDevolver, setModalDevolver] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaComFluxo | null>(null);
  const [motivoDevolucao, setMotivoDevolucao] = useState('');
  
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    loja: 'todas',
    status: 'todos',
    contaDestino: 'todas'
  });

  // Filtrar colaboradores com permissão "Financeiro"
  const colaboradoresFinanceiros = useMemo(() => {
    const cargosComPermissaoFinanceiro = cargos
      .filter(c => c.permissoes.includes('Financeiro'))
      .map(c => c.id);
    return colaboradores.filter(col => cargosComPermissaoFinanceiro.includes(col.cargo));
  }, [colaboradores, cargos]);

  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      if (filters.dataInicio && new Date(v.dataHora) < new Date(filters.dataInicio)) return false;
      if (filters.dataFim) {
        const dataFim = new Date(filters.dataFim);
        dataFim.setHours(23, 59, 59);
        if (new Date(v.dataHora) > dataFim) return false;
      }
      if (filters.loja !== 'todas' && v.lojaVenda !== filters.loja) return false;
      if (filters.status !== 'todos' && v.statusFluxo !== filters.status) return false;
      return true;
    }).sort((a, b) => {
      if (a.statusFluxo === 'Conferência Financeiro' && b.statusFluxo === 'Finalizado') return -1;
      if (a.statusFluxo === 'Finalizado' && b.statusFluxo === 'Conferência Financeiro') return 1;
      return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
    });
  }, [vendas, filters]);

  const pendentes = vendas.filter(v => v.statusFluxo === 'Conferência Financeiro').length;
  const finalizados = vendas.filter(v => v.statusFluxo === 'Finalizado').length;
  const totalPendente = vendas
    .filter(v => v.statusFluxo === 'Conferência Financeiro')
    .reduce((acc, v) => acc + v.total, 0);

  const handleAbrirModalFinalizar = (venda: VendaComFluxo) => {
    setVendaSelecionada(venda);
    setModalFinalizar(true);
  };

  const handleAbrirModalDevolver = (venda: VendaComFluxo) => {
    setVendaSelecionada(venda);
    setMotivoDevolucao('');
    setModalDevolver(true);
  };

  const handleFinalizar = () => {
    if (!vendaSelecionada) return;

    const resultado = finalizarVenda(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome
    );

    if (resultado) {
      toast.success(`Venda ${vendaSelecionada.id} finalizada com sucesso!`);
      setModalFinalizar(false);
      setVendaSelecionada(null);
      recarregar();
    } else {
      toast.error('Erro ao finalizar venda.');
    }
  };

  const handleDevolver = () => {
    if (!vendaSelecionada || !motivoDevolucao.trim()) {
      toast.error('Por favor, informe o motivo da devolução.');
      return;
    }

    const resultado = devolverFinanceiro(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome,
      motivoDevolucao.trim()
    );

    if (resultado) {
      toast.success(`Venda ${vendaSelecionada.id} devolvida para o gestor.`);
      setModalDevolver(false);
      setVendaSelecionada(null);
      setMotivoDevolucao('');
      recarregar();
    } else {
      toast.error('Erro ao devolver venda.');
    }
  };

  const handleExport = () => {
    const dataAtual = new Date().toISOString().split('T')[0];
    exportFluxoToCSV(filteredVendas, `conferencia-financeiro-${dataAtual}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({ dataInicio: '', dataFim: '', loja: 'todas', status: 'todos', contaDestino: 'todas' });
  };

  const getStatusBadge = (status: StatusVenda) => {
    const cores = getCorBadgeStatus(status);
    return (
      <Badge variant="outline" className={`${cores.bg} ${cores.text} ${cores.border} whitespace-nowrap dark:bg-opacity-20`}>
        {status}
      </Badge>
    );
  };

  const getRowClassName = (status: StatusVenda) => {
    if (status === 'Conferência Financeiro') return 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100';
    if (status === 'Finalizado') return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100';
    return '';
  };

  const getLojaNome = (lojaId: string) => lojas.find(l => l.id === lojaId)?.nome || lojaId;
  const getVendedorNome = (vendedorId: string) => colaboradores.find(c => c.id === vendedorId)?.nome || vendedorId;

  return (
    <FinanceiroLayout title="Conferência de Contas - Vendas">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">{pendentes}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Finalizados</p>
                <p className="text-3xl font-bold text-green-600">{finalizados}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Pendente</p>
              <p className="text-2xl font-bold">{formatCurrency(totalPendente)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div><Label>Data Início</Label><Input type="date" value={filters.dataInicio} onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })} /></div>
            <div><Label>Data Fim</Label><Input type="date" value={filters.dataFim} onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })} /></div>
            <div><Label>Loja</Label><Select value={filters.loja} onValueChange={(value) => setFilters({ ...filters, loja: value })}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="Conferência Financeiro">Conferência Financeiro</SelectItem><SelectItem value="Finalizado">Finalizado</SelectItem></SelectContent></Select></div>
            <div className="flex items-end gap-2"><Button variant="outline" onClick={handleLimpar}><X className="h-4 w-4 mr-1" />Limpar</Button><Button onClick={handleExport} variant="secondary"><Download className="h-4 w-4 mr-1" />CSV</Button></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Venda</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendas.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada</TableCell></TableRow>
              ) : filteredVendas.map(venda => (
                <TableRow key={venda.id} className={getRowClassName(venda.statusFluxo as StatusVenda)}>
                  <TableCell className="font-medium">{venda.id}</TableCell>
                  <TableCell>{new Date(venda.dataHora).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{getLojaNome(venda.lojaVenda)}</TableCell>
                  <TableCell>{venda.clienteNome}</TableCell>
                  <TableCell>{getVendedorNome(venda.vendedor)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(venda.total)}</TableCell>
                  <TableCell>{getStatusBadge(venda.statusFluxo as StatusVenda)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/vendas/${venda.id}`)}><Eye className="h-4 w-4" /></Button>
                      {venda.statusFluxo === 'Conferência Financeiro' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleAbrirModalDevolver(venda)}><Undo2 className="h-4 w-4 mr-1" />Devolver</Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAbrirModalFinalizar(venda)}><Check className="h-4 w-4 mr-1" />Finalizar</Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Finalizar */}
      <Dialog open={modalFinalizar} onOpenChange={setModalFinalizar}>
        <DialogContent>
          <DialogHeader><DialogTitle>Finalizar Venda</DialogTitle><DialogDescription>A venda será finalizada e bloqueada para edições.</DialogDescription></DialogHeader>
          {vendaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div><p className="text-sm text-muted-foreground">ID</p><p className="font-medium">{vendaSelecionada.id}</p></div>
                <div><p className="text-sm text-muted-foreground">Cliente</p><p className="font-medium">{vendaSelecionada.clienteNome}</p></div>
                <div><p className="text-sm text-muted-foreground">Valor</p><p className="font-medium text-lg">{formatCurrency(vendaSelecionada.total)}</p></div>
                <div><p className="text-sm text-muted-foreground">Lucro</p><p className={`font-medium ${vendaSelecionada.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(vendaSelecionada.lucro)}</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalFinalizar(false)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleFinalizar}><Check className="h-4 w-4 mr-2" />Confirmar Finalização</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Devolver */}
      <Dialog open={modalDevolver} onOpenChange={setModalDevolver}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-purple-600">Devolver para Gestor</DialogTitle><DialogDescription>A venda será devolvida ao gestor para correção.</DialogDescription></DialogHeader>
          {vendaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div><p className="text-sm text-muted-foreground">ID</p><p className="font-medium">{vendaSelecionada.id}</p></div>
                <div><p className="text-sm text-muted-foreground">Valor</p><p className="font-medium">{formatCurrency(vendaSelecionada.total)}</p></div>
              </div>
              <div><Label>Motivo da Devolução *</Label><Textarea placeholder="Descreva o motivo..." value={motivoDevolucao} onChange={(e) => setMotivoDevolucao(e.target.value)} rows={3} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDevolver(false)}>Cancelar</Button>
            <Button variant="secondary" onClick={handleDevolver} disabled={!motivoDevolucao.trim()}><Undo2 className="h-4 w-4 mr-2" />Confirmar Devolução</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
