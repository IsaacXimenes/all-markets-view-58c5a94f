import { useState, useMemo } from 'react';
import { RHLayout } from '@/components/layout/RHLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Bike, DollarSign, Package, Clock, CheckCircle, X, TrendingUp } from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { 
  getRemuneracoes, 
  getEstatisticasMotoboys, 
  registrarPagamentoRemuneracao,
  formatCurrency,
  gerarCompetencias,
  getDetalheEntregasRemuneracao,
  RemuneracaoMotoboy,
  DetalheEntregaRemuneracao
} from '@/utils/motoboyApi';
import { toast } from 'sonner';
import { exportToCSV } from '@/utils/formatUtils';

export default function RHMotoboyRemuneracao() {
  const { obterColaboradoresAtivos } = useCadastroStore();
  const [remuneracoes, setRemuneracoes] = useState(getRemuneracoes());
  const stats = getEstatisticasMotoboys();
  const competencias = useMemo(() => gerarCompetencias(), []);

  // Filtrar apenas motoboys
  const motoboys = useMemo(() => {
    return obterColaboradoresAtivos().filter(c => 
      c.cargo?.toLowerCase().includes('motoboy') || 
      c.cargo?.toLowerCase().includes('entregador')
    );
  }, [obterColaboradoresAtivos]);

  // Drill-down modal
  const [modalDrilldownOpen, setModalDrilldownOpen] = useState(false);
  const [remuneracaoSelecionada, setRemuneracaoSelecionada] = useState<RemuneracaoMotoboy | null>(null);
  const [detalhesEntrega, setDetalhesEntrega] = useState<DetalheEntregaRemuneracao[]>([]);

  const handleAbrirDrilldown = (rem: RemuneracaoMotoboy) => {
    const detalhes = getDetalheEntregasRemuneracao(rem.motoboyId, rem.periodoInicio, rem.periodoFim);
    setDetalhesEntrega(detalhes);
    setRemuneracaoSelecionada(rem);
    setModalDrilldownOpen(true);
  };

  const [filters, setFilters] = useState({
    motoboyId: 'todos',
    competencia: 'todos',
    status: 'todos'
  });

  const remuneracoesFiltradas = useMemo(() => {
    let resultado = getRemuneracoes();
    
    if (filters.motoboyId !== 'todos') {
      resultado = resultado.filter(r => r.motoboyId === filters.motoboyId);
    }
    if (filters.competencia !== 'todos') {
      resultado = resultado.filter(r => r.competencia === filters.competencia);
    }
    if (filters.status !== 'todos') {
      resultado = resultado.filter(r => r.status === filters.status);
    }
    
    return resultado;
  }, [filters, remuneracoes]);

  const handlePagar = (id: string) => {
    if (registrarPagamentoRemuneracao(id)) {
      setRemuneracoes(getRemuneracoes());
      toast.success('Pagamento registrado com sucesso!');
    } else {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleLimpar = () => {
    setFilters({
      motoboyId: 'todos',
      competencia: 'todos',
      status: 'todos'
    });
  };

  const handleExport = () => {
    const dataToExport = remuneracoesFiltradas.map(r => ({
      ID: r.id,
      Motoboy: r.motoboyNome,
      Competência: r.competencia,
      'Período Início': new Date(r.periodoInicio).toLocaleDateString('pt-BR'),
      'Período Fim': new Date(r.periodoFim).toLocaleDateString('pt-BR'),
      'Qtd Demandas': r.qtdDemandas,
      'Valor Total': formatCurrency(r.valorTotal),
      Status: r.status,
      'Data Pagamento': r.dataPagamento ? new Date(r.dataPagamento).toLocaleDateString('pt-BR') : '-'
    }));
    
    exportToCSV(dataToExport, `remuneracao-motoboys-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Pago') {
      return <Badge className="bg-green-500/10 text-green-600 border-green-200">Pago</Badge>;
    }
    return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Pendente</Badge>;
  };

  return (
    <RHLayout title="Remuneração Motoboy">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bike className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Demandas no Mês</p>
                <p className="text-2xl font-bold">{stats.totalDemandasMes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.demandasPendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Mês</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.valorTotalMes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.valorPendentePagamento > 0 ? 'bg-orange-500/10' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Package className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">A Pagar</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.valorPendentePagamento)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Motoboy</Label>
              <Select value={filters.motoboyId} onValueChange={(v) => setFilters({...filters, motoboyId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {motoboys.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Competência</Label>
              <Select value={filters.competencia} onValueChange={(v) => setFilters({...filters, competencia: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="todos">Todas</SelectItem>
                  {competencias.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleLimpar}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Remunerações */}
      <Card>
        <CardHeader>
          <CardTitle>Remunerações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Motoboy</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Demandas</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remuneracoesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma remuneração encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  remuneracoesFiltradas.map(rem => (
                    <TableRow 
                      key={rem.id}
                      className={rem.status === 'Pendente' ? 'bg-yellow-500/5' : ''}
                    >
                      <TableCell className="font-mono text-xs">{rem.id}</TableCell>
                      <TableCell className="font-medium">{rem.motoboyNome}</TableCell>
                      <TableCell>{rem.competencia}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(rem.periodoInicio).toLocaleDateString('pt-BR')} - {new Date(rem.periodoFim).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{rem.qtdDemandas}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <button
                          type="button"
                          onClick={() => handleAbrirDrilldown(rem)}
                          className="text-primary underline cursor-pointer hover:text-primary/80 transition-colors"
                        >
                          {formatCurrency(rem.valorTotal)}
                        </button>
                      </TableCell>
                      <TableCell>{getStatusBadge(rem.status)}</TableCell>
                      <TableCell>
                        {rem.status === 'Pendente' ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handlePagar(rem.id)}
                            className="gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Pagar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Pago em {rem.dataPagamento ? new Date(rem.dataPagamento).toLocaleDateString('pt-BR') : '-'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Modal Drill-down Remuneração */}
      <Dialog open={modalDrilldownOpen} onOpenChange={setModalDrilldownOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detalhamento de Entregas e Remuneração
              {remuneracaoSelecionada && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {remuneracaoSelecionada.motoboyNome} — {remuneracaoSelecionada.competencia}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID da Venda</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-right">Valor da Entrega</TableHead>
                  <TableHead className="text-right">Valor da Venda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalhesEntrega.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma entrega encontrada no período
                    </TableCell>
                  </TableRow>
                ) : (
                  detalhesEntrega.map(d => (
                    <TableRow key={d.demandaId}>
                      <TableCell className="font-mono text-xs">{d.vendaId}</TableCell>
                      <TableCell>{d.vendedor}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate" title={d.produto}>{d.produto}</TableCell>
                      <TableCell className="text-sm">{d.localizacao}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(d.valorEntrega)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(d.valorVenda)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {detalhesEntrega.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Entregas:</span>
                <span className="text-xl font-bold">
                  {formatCurrency(detalhesEntrega.reduce((acc, d) => acc + d.valorEntrega, 0))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </RHLayout>
  );
}
