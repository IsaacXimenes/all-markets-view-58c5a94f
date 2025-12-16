import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getOrdensServico, calcularSLADias, formatCurrency, exportOSToCSV, OrdemServico } from '@/utils/assistenciaApi';
import { getClientes, getLojas, getColaboradoresByPermissao } from '@/utils/cadastrosApi';
import { Plus, Eye, FileText, Download, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OSAssistencia() {
  const navigate = useNavigate();
  const [ordensServico, setOrdensServico] = useState(getOrdensServico());
  const clientes = getClientes();
  const lojas = getLojas();
  const tecnicos = getColaboradoresByPermissao('Assistência');

  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroIMEI, setFiltroIMEI] = useState('');
  const [filtroTecnico, setFiltroTecnico] = useState('todos');

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

      // Filtro por IMEI
      if (filtroIMEI) {
        const hasIMEI = os.pecas.some(p => p.imei?.includes(filtroIMEI));
        if (!hasIMEI) return false;
      }

      // Filtro por técnico
      if (filtroTecnico && filtroTecnico !== 'todos') {
        if (os.tecnicoId !== filtroTecnico) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [ordensServico, filtroDataInicio, filtroDataFim, filtroIMEI, filtroTecnico]);

  const getClienteNome = (clienteId: string) => {
    return clientes.find(c => c.id === clienteId)?.nome || '-';
  };

  const getLojaNome = (lojaId: string) => {
    return lojas.find(l => l.id === lojaId)?.nome || '-';
  };

  const getTecnicoNome = (tecnicoId: string) => {
    return tecnicos.find(t => t.id === tecnicoId)?.nome || '-';
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

  const getSLADisplay = (dataHora: string) => {
    const dias = calcularSLADias(dataHora);
    let bgClass = '';
    let icon = null;

    if (dias >= 5) {
      bgClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      icon = <AlertTriangle className="h-3 w-3" />;
    } else if (dias >= 3) {
      bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      icon = <Clock className="h-3 w-3" />;
    }

    return (
      <span className={cn('px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1', bgClass)}>
        {icon}
        {dias} dias
      </span>
    );
  };

  const getSetorBadge = (setor: string) => {
    switch (setor) {
      case 'GARANTIA':
        return <Badge variant="outline" className="border-green-500 text-green-600">Garantia</Badge>;
      case 'ASSISTÊNCIA':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Assistência</Badge>;
      case 'TROCA':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">Troca</Badge>;
      default:
        return <Badge variant="outline">{setor}</Badge>;
    }
  };

  const handleExport = () => {
    exportOSToCSV(ordensFiltradas, 'ordens-servico.csv');
  };

  const getIMEI = (os: OrdemServico) => {
    const pecaComIMEI = os.pecas.find(p => p.imei);
    return pecaComIMEI?.imei || '-';
  };

  // Stats
  const totalOS = ordensFiltradas.length;
  const osConcluidas = ordensFiltradas.filter(os => os.status === 'Serviço concluído').length;
  const osEmAndamento = ordensFiltradas.filter(os => os.status === 'Em serviço').length;
  const osAguardando = ordensFiltradas.filter(os => os.status === 'Aguardando Peça').length;
  const valorTotal = ordensFiltradas.reduce((acc, os) => acc + os.valorTotal, 0);

  return (
    <OSLayout title="Assistência">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalOS}</div>
            <div className="text-xs text-muted-foreground">Total de OS</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{osConcluidas}</div>
            <div className="text-xs text-muted-foreground">Concluídas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{osEmAndamento}</div>
            <div className="text-xs text-muted-foreground">Em Serviço</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{osAguardando}</div>
            <div className="text-xs text-muted-foreground">Aguardando Peça</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatCurrency(valorTotal)}</div>
            <div className="text-xs text-muted-foreground">Valor Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Label>IMEI</Label>
              <Input
                placeholder="Buscar por IMEI..."
                value={filtroIMEI}
                onChange={e => setFiltroIMEI(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Técnico</Label>
              <Select value={filtroTecnico} onValueChange={setFiltroTecnico}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {tecnicos.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-between items-center mb-4">
        <Button onClick={() => navigate('/os/assistencia/nova')}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Assistência
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Tabela */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº OS</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordensFiltradas.map(os => (
              <TableRow key={os.id}>
                <TableCell className="font-mono text-xs font-medium">{os.id}</TableCell>
                <TableCell className="text-xs">
                  {new Date(os.dataHora).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>{getClienteNome(os.clienteId)}</TableCell>
                <TableCell className="font-mono text-xs">{getIMEI(os)}</TableCell>
                <TableCell>{getSetorBadge(os.setor)}</TableCell>
                <TableCell>{getTecnicoNome(os.tecnicoId)}</TableCell>
                <TableCell className="text-xs">{getLojaNome(os.lojaId)}</TableCell>
                <TableCell>{getStatusBadge(os.status)}</TableCell>
                <TableCell>{getSLADisplay(os.dataHora)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(os.valorTotal)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/os/assistencia/${os.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        // Gerar recibo PDF simulado
                        alert(`Recibo da OS ${os.id} gerado com sucesso!`);
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {ordensFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Nenhuma ordem de serviço encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </OSLayout>
  );
}
