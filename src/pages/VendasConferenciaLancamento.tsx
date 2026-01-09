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
import { Eye, Download, Filter, X, Pencil, Check, Clock, AlertTriangle } from 'lucide-react';
import { useFluxoVendas } from '@/hooks/useFluxoVendas';
import { 
  aprovarLancamento, 
  getCorBadgeStatus,
  exportFluxoToCSV,
  VendaComFluxo,
  StatusVenda
} from '@/utils/fluxoVendasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { getLojas, getColaboradores } from '@/utils/cadastrosApi';
import { toast } from 'sonner';

// Mock do usuário logado
const usuarioLogado = { id: 'COL-007', nome: 'Carlos Lançador' };

export default function VendasConferenciaLancamento() {
  const navigate = useNavigate();
  const { vendas, recarregar, contadores } = useFluxoVendas({
    status: ['Aguardando Conferência', 'Recusada - Gestor']
  });
  
  const lojas = getLojas();
  const colaboradores = getColaboradores();
  
  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  
  // Modal de aprovação
  const [modalAprovar, setModalAprovar] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaComFluxo | null>(null);

  // Filtrar vendas
  const vendasFiltradas = useMemo(() => {
    let resultado = [...vendas];

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

    // Ordenar: Recusadas primeiro, depois por data
    resultado.sort((a, b) => {
      if (a.statusFluxo === 'Recusada - Gestor' && b.statusFluxo !== 'Recusada - Gestor') return -1;
      if (a.statusFluxo !== 'Recusada - Gestor' && b.statusFluxo === 'Recusada - Gestor') return 1;
      return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
    });

    return resultado;
  }, [vendas, filtroDataInicio, filtroDataFim, filtroCliente, filtroStatus]);

  const limparFiltros = () => {
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroCliente('');
    setFiltroStatus('todos');
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
        {status}
      </Badge>
    );
  };

  const getRowClassName = (status: StatusVenda) => {
    if (status === 'Recusada - Gestor') {
      return 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50';
    }
    return 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50';
  };

  const getLojaNome = (lojaId: string) => {
    return lojas.find(l => l.id === lojaId)?.nome || lojaId;
  };

  const getVendedorNome = (vendedorId: string) => {
    return colaboradores.find(c => c.id === vendedorId)?.nome || vendedorId;
  };

  const pendentesCount = vendas.filter(v => v.statusFluxo === 'Aguardando Conferência').length;
  const recusadasCount = vendas.filter(v => v.statusFluxo === 'Recusada - Gestor').length;

  return (
    <VendasLayout title="Conferência - Lançamento de Vendas">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda encontrada para conferência de lançamento.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendasFiltradas.map(venda => (
                    <TableRow 
                      key={venda.id}
                      className={getRowClassName(venda.statusFluxo as StatusVenda)}
                    >
                      <TableCell className="font-medium">{venda.id}</TableCell>
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
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/vendas/editar-gestor/${venda.id}`)}
                            title="Editar venda"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleAbrirModalAprovar(venda)}
                            title="Aprovar lançamento"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
        </span>
      </div>

      {/* Modal de Aprovação */}
      <Dialog open={modalAprovar} onOpenChange={setModalAprovar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Lançamento</DialogTitle>
            <DialogDescription>
              Você está prestes a aprovar o lançamento da venda e enviá-la para conferência do gestor.
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
                <p>Ao aprovar, a venda será enviada para:</p>
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
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
