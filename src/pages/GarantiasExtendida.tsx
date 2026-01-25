import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Filter, Clock, AlertTriangle, CheckCircle2, X, Download, Star } from 'lucide-react';
import { format } from 'date-fns';
import { getGarantias } from '@/utils/garantiasApi';
import { getLojas } from '@/utils/cadastrosApi';
import { calcularTempoRestante, getTratativasComerciasByGarantiaId, getAdesoesPendentes } from '@/utils/garantiaExtendidaApi';
import { toast } from 'sonner';

export default function GarantiasExtendida() {
  const navigate = useNavigate();
  const garantias = getGarantias();
  const lojas = getLojas();
  const adesoesPendentes = getAdesoesPendentes();
  
  // Filtros
  const [filters, setFilters] = useState({
    cliente: '',
    dataInicio: '',
    dataFim: '',
    imei: '',
    loja: 'todas',
    status: 'todas'
  });
  
  const getLojaName = (id: string) => lojas.find(l => l.id === id)?.nome || id;
  
  // Filtrar garantias ativas ou expiradas recentemente (últimos 30 dias)
  const garantiasFiltradas = useMemo(() => {
    return garantias.filter(g => {
      const tempoRestante = calcularTempoRestante(g.dataFimGarantia);
      
      // Filtro por status
      if (filters.status === 'ativas' && tempoRestante.status === 'expirada') return false;
      if (filters.status === '7dias' && tempoRestante.status !== 'urgente') return false;
      if (filters.status === '30dias' && tempoRestante.status !== 'atencao') return false;
      if (filters.status === 'expiradas' && tempoRestante.status !== 'expirada') return false;
      
      // Filtro por cliente
      if (filters.cliente && !g.clienteNome.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
      
      // Filtro por IMEI
      if (filters.imei && !g.imei.includes(filters.imei)) return false;
      
      // Filtro por loja
      if (filters.loja !== 'todas' && g.lojaVenda !== filters.loja) return false;
      
      // Filtro por data de início
      if (filters.dataInicio) {
        const dataVenda = new Date(g.dataInicioGarantia);
        if (dataVenda < new Date(filters.dataInicio)) return false;
      }
      
      // Filtro por data fim
      if (filters.dataFim) {
        const dataVenda = new Date(g.dataInicioGarantia);
        const dataFimFiltro = new Date(filters.dataFim);
        dataFimFiltro.setHours(23, 59, 59);
        if (dataVenda > dataFimFiltro) return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Ordenar por urgência (expiradas primeiro, depois urgentes, depois atenção)
      const tempoA = calcularTempoRestante(a.dataFimGarantia);
      const tempoB = calcularTempoRestante(b.dataFimGarantia);
      return tempoA.dias - tempoB.dias;
    });
  }, [garantias, filters]);
  
  // Contadores
  const totalAtivas = garantias.filter(g => calcularTempoRestante(g.dataFimGarantia).status !== 'expirada').length;
  const expirando7Dias = garantias.filter(g => calcularTempoRestante(g.dataFimGarantia).status === 'urgente').length;
  const expirando30Dias = garantias.filter(g => calcularTempoRestante(g.dataFimGarantia).status === 'atencao').length;
  
  const handleLimparFiltros = () => {
    setFilters({
      cliente: '',
      dataInicio: '',
      dataFim: '',
      imei: '',
      loja: 'todas',
      status: 'todas'
    });
  };
  
  const handleExportar = () => {
    const dataExport = garantiasFiltradas.map(g => {
      const tempo = calcularTempoRestante(g.dataFimGarantia);
      return {
        'ID Venda': g.vendaId,
        'Data Venda': format(new Date(g.dataInicioGarantia), 'dd/MM/yyyy'),
        'Cliente': g.clienteNome,
        'IMEI': g.imei,
        'Modelo': g.modelo,
        'Resp. Garantia': g.tipoGarantia,
        'Data Fim Garantia': format(new Date(g.dataFimGarantia), 'dd/MM/yyyy'),
        'Tempo Restante': tempo.texto,
        'Status': tempo.status === 'expirada' ? 'Expirada' : 'Ativa'
      };
    });
    
    const headers = Object.keys(dataExport[0] || {}).join(',');
    const rows = dataExport.map(item => 
      Object.values(item).map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `garantias-extendida-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Dados exportados com sucesso!');
  };
  
  const getRowClassName = (dataFim: string) => {
    const tempo = calcularTempoRestante(dataFim);
    switch (tempo.status) {
      case 'expirada':
        return 'bg-gray-500/10 text-muted-foreground';
      case 'urgente':
        return 'bg-red-500/10';
      case 'atencao':
        return 'bg-yellow-500/10';
      default:
        return '';
    }
  };
  
  const getTempoRestanteBadge = (dataFim: string) => {
    const tempo = calcularTempoRestante(dataFim);
    switch (tempo.status) {
      case 'expirada':
        return <Badge variant="outline" className="bg-muted text-muted-foreground line-through">{tempo.texto}</Badge>;
      case 'urgente':
        return <Badge className="bg-red-500 text-white">{tempo.texto}</Badge>;
      case 'atencao':
        return <Badge className="bg-yellow-500 text-white">{tempo.texto}</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{tempo.texto}</Badge>;
    }
  };

  return (
    <GarantiasLayout title="Garantia Extendida">
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total com Garantia</p>
                  <p className="text-3xl font-bold">{totalAtivas}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expirando em 7 dias</p>
                  <p className="text-3xl font-bold text-red-600">{expirando7Dias}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expirando em 30 dias</p>
                  <p className="text-3xl font-bold text-yellow-600">{expirando30Dias}</p>
                </div>
                <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Adesões Pendentes</p>
                  <p className="text-3xl font-bold text-primary">{adesoesPendentes.length}</p>
                </div>
                <Star className="h-10 w-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <Label>Cliente</Label>
                <Input
                  placeholder="Buscar cliente..."
                  value={filters.cliente}
                  onChange={(e) => setFilters({ ...filters, cliente: e.target.value })}
                />
              </div>
              <div>
                <Label>Data Venda Início</Label>
                <Input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div>
                <Label>Data Venda Fim</Label>
                <Input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
              <div>
                <Label>IMEI</Label>
                <Input
                  placeholder="Buscar IMEI..."
                  value={filters.imei}
                  onChange={(e) => setFilters({ ...filters, imei: e.target.value })}
                />
              </div>
              <div>
                <Label>Loja</Label>
                <Select value={filters.loja} onValueChange={(v) => setFilters({ ...filters, loja: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {lojas.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="ativas">Ativas</SelectItem>
                    <SelectItem value="7dias">Expirando em 7 dias</SelectItem>
                    <SelectItem value="30dias">Expirando em 30 dias</SelectItem>
                    <SelectItem value="expiradas">Expiradas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleLimparFiltros}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button variant="outline" onClick={handleExportar}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Acompanhamento de Vencimentos ({garantiasFiltradas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Venda</TableHead>
                    <TableHead>Data Venda</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Resp. Garantia</TableHead>
                    <TableHead>Data Fim</TableHead>
                    <TableHead>Tempo Restante</TableHead>
                    <TableHead>Tratativas</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {garantiasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Nenhuma garantia encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    garantiasFiltradas.map((garantia) => {
                      const tratativas = getTratativasComerciasByGarantiaId(garantia.id);
                      return (
                        <TableRow 
                          key={garantia.id}
                          className={getRowClassName(garantia.dataFimGarantia)}
                        >
                          <TableCell className="font-medium">{garantia.vendaId}</TableCell>
                          <TableCell>{format(new Date(garantia.dataInicioGarantia), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{garantia.clienteNome}</TableCell>
                          <TableCell>{garantia.modelo}</TableCell>
                          <TableCell className="font-mono text-xs">{garantia.imei}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{garantia.tipoGarantia}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(garantia.dataFimGarantia), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{getTempoRestanteBadge(garantia.dataFimGarantia)}</TableCell>
                          <TableCell>
                            {tratativas.length > 0 ? (
                              <Badge variant="secondary">{tratativas.length}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/garantias/extendida/${garantia.id}`)}
                              title="Ver detalhes e tratativas"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {garantiasFiltradas.length} {garantiasFiltradas.length === 1 ? 'garantia encontrada' : 'garantias encontradas'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </GarantiasLayout>
  );
}
