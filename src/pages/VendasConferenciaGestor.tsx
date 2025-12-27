import { useState, useEffect, useMemo } from 'react';
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
import { Eye, Download, Filter, X, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { 
  getVendasConferencia, 
  exportConferenciaToCSV, 
  formatCurrency,
  VendaConferencia 
} from '@/utils/conferenciaGestorApi';
import { getLojas, getColaboradores } from '@/utils/cadastrosApi';

export default function VendasConferenciaGestor() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState<VendaConferencia[]>([]);
  const [lojas, setLojas] = useState<{ id: string; nome: string }[]>([]);
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string }[]>([]);
  
  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('todas');
  const [filtroVendedor, setFiltroVendedor] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  useEffect(() => {
    setVendas(getVendasConferencia());
    setLojas(getLojas().map(l => ({ id: l.id, nome: l.nome })));
    setColaboradores(getColaboradores().map(c => ({ id: c.id, nome: c.nome })));
  }, []);

  // Filtrar e ordenar vendas
  const vendasFiltradas = useMemo(() => {
    let resultado = [...vendas];

    // Filtro por data
    if (filtroDataInicio) {
      resultado = resultado.filter(v => 
        new Date(v.dataRegistro) >= new Date(filtroDataInicio)
      );
    }
    if (filtroDataFim) {
      const dataFim = new Date(filtroDataFim);
      dataFim.setHours(23, 59, 59);
      resultado = resultado.filter(v => 
        new Date(v.dataRegistro) <= dataFim
      );
    }

    // Filtro por loja
    if (filtroLoja !== 'todas') {
      resultado = resultado.filter(v => v.lojaId === filtroLoja);
    }

    // Filtro por vendedor
    if (filtroVendedor !== 'todos') {
      resultado = resultado.filter(v => v.vendedorId === filtroVendedor);
    }

    // Filtro por status
    if (filtroStatus !== 'todos') {
      resultado = resultado.filter(v => v.status === filtroStatus);
    }

    // Ordenação: pendentes primeiro (mais recente), depois conferidas
    resultado.sort((a, b) => {
      if (a.status === 'Em Conferência' && b.status !== 'Em Conferência') return -1;
      if (a.status !== 'Em Conferência' && b.status === 'Em Conferência') return 1;
      return new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime();
    });

    return resultado;
  }, [vendas, filtroDataInicio, filtroDataFim, filtroLoja, filtroVendedor, filtroStatus]);

  // Contadores
  const pendentes = vendas.filter(v => v.status === 'Em Conferência').length;
  const conferidas = vendas.filter(v => v.status === 'Conferida pelo Gestor').length;
  const urgentes = vendas.filter(v => v.status === 'Em Conferência' && v.slaDias >= 3).length;

  const limparFiltros = () => {
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroLoja('todas');
    setFiltroVendedor('todos');
    setFiltroStatus('todos');
  };

  const handleExportar = () => {
    const dataAtual = new Date().toISOString().split('T')[0];
    exportConferenciaToCSV(vendasFiltradas, `conferencia-vendas-gestor-${dataAtual}.csv`);
  };

  // Cor do SLA
  const getSLAColor = (dias: number, status: string) => {
    if (status !== 'Em Conferência') return 'text-muted-foreground';
    if (dias <= 1) return 'text-green-600 dark:text-green-400';
    if (dias === 2) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSLABadge = (dias: number, status: string) => {
    if (status !== 'Em Conferência') return null;
    if (dias <= 1) return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">{dias} dia(s)</Badge>;
    if (dias === 2) return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">{dias} dias</Badge>;
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">{dias} dias</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Em Conferência') {
      return <Badge variant="destructive" className="whitespace-nowrap">Em Conferência</Badge>;
    }
    return <Badge variant="default" className="bg-green-600 hover:bg-green-700 whitespace-nowrap">Conferida</Badge>;
  };

  const getTipoVendaBadge = (tipo: string) => {
    switch (tipo) {
      case 'Digital':
        return <Badge variant="outline" className="text-blue-600 border-blue-300 dark:text-blue-400">Digital</Badge>;
      case 'Acessórios':
        return <Badge variant="outline" className="text-purple-600 border-purple-300 dark:text-purple-400">Acessórios</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  return (
    <VendasLayout title="Conferências de Vendas - Gestor">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold text-destructive">{pendentes}</p>
              </div>
              <Clock className="h-10 w-10 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Urgentes (3+ dias)</p>
                <p className="text-3xl font-bold text-orange-600">{urgentes}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conferidas</p>
                <p className="text-3xl font-bold text-green-600">{conferidas}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
              <label className="text-sm text-muted-foreground mb-1 block">Loja</label>
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as lojas</SelectItem>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Vendedor</label>
              <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {colaboradores.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Em Conferência">Em Conferência</SelectItem>
                  <SelectItem value="Conferida pelo Gestor">Conferida pelo Gestor</SelectItem>
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
                  <TableHead>Responsável</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-center">SLA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda encontrada com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendasFiltradas.map(venda => (
                    <TableRow 
                      key={venda.id}
                      className={venda.status === 'Em Conferência' 
                        ? 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50' 
                        : ''
                      }
                    >
                      <TableCell className="font-medium">{venda.vendaId}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(venda.dataRegistro).toLocaleDateString('pt-BR')}
                        <span className="text-muted-foreground ml-1">
                          {new Date(venda.dataRegistro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={venda.lojaNome}>
                        {venda.lojaNome}
                      </TableCell>
                      <TableCell>{venda.vendedorNome}</TableCell>
                      <TableCell className="max-w-[120px] truncate" title={venda.clienteNome}>
                        {venda.clienteNome}
                      </TableCell>
                      <TableCell>{getTipoVendaBadge(venda.tipoVenda)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(venda.valorTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getSLABadge(venda.slaDias, venda.status)}
                      </TableCell>
                      <TableCell>{getStatusBadge(venda.status)}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/vendas/conferencia-gestor/${venda.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rodapé com total */}
      <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
        <span>Exibindo {vendasFiltradas.length} de {vendas.length} registros</span>
        <span>
          Total pendentes: <strong className="text-destructive">{pendentes}</strong> | 
          Conferidas: <strong className="text-green-600">{conferidas}</strong>
        </span>
      </div>
    </VendasLayout>
  );
}
