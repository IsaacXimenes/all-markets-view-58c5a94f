import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Eye, 
  Pencil, 
  Clock, 
  CheckCircle, 
  Filter, 
  Download, 
  ClipboardList,
  Shield,
  Package,
  ArrowRightLeft,
  User
} from 'lucide-react';
import { getOrdensServico, calcularSLADias, formatCurrency, exportOSToCSV, OrdemServico } from '@/utils/assistenciaApi';
import { getClientes, getLojas, getColaboradoresByPermissao } from '@/utils/cadastrosApi';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatIMEI } from '@/utils/imeiMask';

export default function OSHistoricoAssistencia() {
  const navigate = useNavigate();
  const [ordensServico] = useState(getOrdensServico());
  const clientes = getClientes();
  const lojas = getLojas();
  const tecnicos = getColaboradoresByPermissao('Assistência');

  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCliente, setFiltroCliente] = useState('');

  // Determinar origem da OS
  const getOrigemOS = (os: OrdemServico): 'Garantia' | 'Estoque' | 'Trade-In' | 'Balcão' => {
    if ((os as any).origemGarantiaId) return 'Garantia';
    if ((os as any).origemProdutoId) return 'Estoque';
    if ((os as any).origemVendaId && os.setor === 'TROCA') return 'Trade-In';
    if (os.setor === 'GARANTIA') return 'Garantia';
    return 'Balcão';
  };

  const ordensFiltradas = useMemo(() => {
    return ordensServico.filter(os => {
      // Filtro por data início
      if (filtroDataInicio) {
        const dataOS = new Date(os.dataHora).toISOString().split('T')[0];
        if (dataOS < filtroDataInicio) return false;
      }

      // Filtro por data fim
      if (filtroDataFim) {
        const dataOS = new Date(os.dataHora).toISOString().split('T')[0];
        if (dataOS > filtroDataFim) return false;
      }

      // Filtro por origem
      if (filtroOrigem && filtroOrigem !== 'todas') {
        if (getOrigemOS(os) !== filtroOrigem) return false;
      }

      // Filtro por status
      if (filtroStatus && filtroStatus !== 'todos') {
        if (os.status !== filtroStatus) return false;
      }

      // Filtro por cliente
      if (filtroCliente) {
        const cliente = clientes.find(c => c.id === os.clienteId);
        if (!cliente?.nome.toLowerCase().includes(filtroCliente.toLowerCase())) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [ordensServico, filtroDataInicio, filtroDataFim, filtroOrigem, filtroStatus, filtroCliente, clientes]);

  const getClienteNome = (clienteId: string) => {
    return clientes.find(c => c.id === clienteId)?.nome || '-';
  };

  const getLojaNome = (lojaId: string) => {
    return lojas.find(l => l.id === lojaId)?.nome || '-';
  };

  const getTecnicoNome = (tecnicoId: string) => {
    return tecnicos.find(t => t.id === tecnicoId)?.nome || '-';
  };

  const getOrigemBadge = (origem: string) => {
    switch (origem) {
      case 'Garantia':
        return (
          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 gap-1">
            <Shield className="h-3 w-3" />
            Garantia
          </Badge>
        );
      case 'Estoque':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1">
            <Package className="h-3 w-3" />
            Estoque
          </Badge>
        );
      case 'Trade-In':
        return (
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1">
            <ArrowRightLeft className="h-3 w-3" />
            Trade-In
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/30 gap-1">
            <User className="h-3 w-3" />
            Balcão
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Serviço concluído':
        return <Badge className="bg-green-500 hover:bg-green-600">Concluído</Badge>;
      case 'Em serviço':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Em serviço</Badge>;
      case 'Aguardando Peça':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Aguardando Peça</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getIMEI = (os: OrdemServico) => {
    const pecaComIMEI = os.pecas.find(p => p.imei);
    return pecaComIMEI?.imei ? formatIMEI(pecaComIMEI.imei) : '-';
  };

  const handleExport = () => {
    exportOSToCSV(ordensFiltradas, 'historico-assistencia.csv');
  };

  const handleLimparFiltros = () => {
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroOrigem('todas');
    setFiltroStatus('todos');
    setFiltroCliente('');
  };

  // Stats
  const stats = {
    total: ordensFiltradas.length,
    garantia: ordensFiltradas.filter(os => getOrigemOS(os) === 'Garantia').length,
    estoque: ordensFiltradas.filter(os => getOrigemOS(os) === 'Estoque').length,
    tradeIn: ordensFiltradas.filter(os => getOrigemOS(os) === 'Trade-In').length,
    balcao: ordensFiltradas.filter(os => getOrigemOS(os) === 'Balcão').length
  };

  return (
    <OSLayout title="Histórico de Assistência">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-500" />
              Garantia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.garantia}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.estoque}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-orange-500" />
              Trade-In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.tradeIn}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              Balcão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.balcao}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={e => setFiltroDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={e => setFiltroDataFim(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Garantia">Garantia</SelectItem>
                  <SelectItem value="Estoque">Estoque</SelectItem>
                  <SelectItem value="Trade-In">Trade-In</SelectItem>
                  <SelectItem value="Balcão">Balcão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Serviço concluído">Concluído</SelectItem>
                  <SelectItem value="Em serviço">Em serviço</SelectItem>
                  <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                placeholder="Buscar cliente..."
                value={filtroCliente}
                onChange={e => setFiltroCliente(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleLimparFiltros} className="flex-1">
                Limpar
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OS</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordensFiltradas.map(os => (
                  <TableRow key={os.id}>
                    <TableCell className="font-mono text-xs font-medium">{os.id}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(os.dataHora), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{getOrigemBadge(getOrigemOS(os))}</TableCell>
                    <TableCell>{getClienteNome(os.clienteId)}</TableCell>
                    <TableCell className="font-mono text-xs">{getIMEI(os)}</TableCell>
                    <TableCell>{getTecnicoNome(os.tecnicoId)}</TableCell>
                    <TableCell className="text-xs">{getLojaNome(os.lojaId)}</TableCell>
                    <TableCell>{getStatusBadge(os.status)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(os.valorTotal)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/os/assistencia/editar/${os.id}`)}
                          title="Editar OS"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/os/assistencia/${os.id}`)}
                          title="Ver Detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {ordensFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhuma ordem de serviço encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </OSLayout>
  );
}
