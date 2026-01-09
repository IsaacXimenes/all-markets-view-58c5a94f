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
import { Eye, Download, Filter, X, Pencil } from 'lucide-react';
import { 
  getVendasConferencia, 
  exportConferenciaToCSV, 
  formatCurrency,
  VendaConferencia,
  StatusConferencia
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
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
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

    // Filtro por responsável
    if (filtroResponsavel !== 'todos') {
      resultado = resultado.filter(v => v.vendedorId === filtroResponsavel);
    }

    // Filtro por status
    if (filtroStatus !== 'todos') {
      resultado = resultado.filter(v => v.status === filtroStatus);
    }

    // Ordenação: Conferência - Gestor primeiro, depois Conferência - Financeiro, depois Concluído
    resultado.sort((a, b) => {
      const ordem: Record<StatusConferencia, number> = {
        'Conferência - Gestor': 0,
        'Conferência - Financeiro': 1,
        'Concluído': 2
      };
      if (ordem[a.status] !== ordem[b.status]) {
        return ordem[a.status] - ordem[b.status];
      }
      return new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime();
    });

    return resultado;
  }, [vendas, filtroDataInicio, filtroDataFim, filtroLoja, filtroResponsavel, filtroStatus]);

  // Contadores
  const pendentesGestor = vendas.filter(v => v.status === 'Conferência - Gestor').length;
  const pendentesFinanceiro = vendas.filter(v => v.status === 'Conferência - Financeiro').length;
  const concluidos = vendas.filter(v => v.status === 'Concluído').length;
  const urgentes = vendas.filter(v => v.status === 'Conferência - Gestor' && v.slaDias >= 3).length;

  const limparFiltros = () => {
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroLoja('todas');
    setFiltroResponsavel('todos');
    setFiltroStatus('todos');
  };

  const handleExportar = () => {
    const dataAtual = new Date().toISOString().split('T')[0];
    exportConferenciaToCSV(vendasFiltradas, `conferencia-vendas-gestor-${dataAtual}.csv`);
  };

  const getSLABadge = (dias: number, status: StatusConferencia) => {
    if (status !== 'Conferência - Gestor') return null;
    if (dias <= 1) return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">{dias} dia(s)</Badge>;
    if (dias === 2) return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">{dias} dias</Badge>;
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">{dias} dias</Badge>;
  };

  const getStatusBadge = (status: StatusConferencia) => {
    switch (status) {
      case 'Conferência - Gestor':
        return <Badge variant="destructive" className="whitespace-nowrap">Conferência - Gestor</Badge>;
      case 'Conferência - Financeiro':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white whitespace-nowrap">Conferência - Financeiro</Badge>;
      case 'Concluído':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap">Concluído</Badge>;
    }
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

  const getRowClassName = (status: StatusConferencia) => {
    switch (status) {
      case 'Conferência - Gestor':
        return 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50';
      case 'Conferência - Financeiro':
        return 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50';
      case 'Concluído':
        return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50';
    }
  };

  return (
    <VendasLayout title="Conferências de Vendas - Gestor">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Conferência - Gestor</p>
              <p className="text-3xl font-bold text-destructive">{pendentesGestor}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Urgentes (3+ dias)</p>
              <p className="text-3xl font-bold text-orange-600">{urgentes}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Conferência - Financeiro</p>
              <p className="text-3xl font-bold text-yellow-600">{pendentesFinanceiro}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Concluído</p>
              <p className="text-3xl font-bold text-green-600">{concluidos}</p>
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
              <label className="text-sm text-muted-foreground mb-1 block">Responsável pela Venda</label>
              <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
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
                  <SelectItem value="Conferência - Gestor">Conferência - Gestor</SelectItem>
                  <SelectItem value="Conferência - Financeiro">Conferência - Financeiro</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
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
                  <TableHead>Responsável pela Venda</TableHead>
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
                      className={getRowClassName(venda.status)}
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
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/vendas/conferencia-gestor/${venda.id}`)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {venda.status === 'Conferência - Gestor' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/vendas/editar-gestor/${venda.vendaId}`)}
                              title="Editar venda"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Rodapé com total */}
      <div className="mt-4 flex flex-wrap justify-between items-center text-sm text-muted-foreground gap-2">
        <span>Exibindo {vendasFiltradas.length} de {vendas.length} registros</span>
        <span className="flex flex-wrap gap-2">
          <span>Gestor: <strong className="text-destructive">{pendentesGestor}</strong></span>
          <span>|</span>
          <span>Financeiro: <strong className="text-yellow-600">{pendentesFinanceiro}</strong></span>
          <span>|</span>
          <span>Concluído: <strong className="text-green-600">{concluidos}</strong></span>
        </span>
      </div>
    </VendasLayout>
  );
}
