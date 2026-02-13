import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, CheckCircle, AlertTriangle, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getVendasDigitais, 
  calcularSLA, 
  formatCurrency,
  exportVendasDigitaisToCSV,
  VendaDigital
} from '@/utils/vendasDigitalApi';
import { useCadastroStore } from '@/store/cadastroStore';

export default function VendasPendentesDigitais() {
  const navigate = useNavigate();
  const { obterNomeColaborador } = useCadastroStore();
  const [vendas] = useState<VendaDigital[]>(getVendasDigitais());
  const [statusFiltro, setStatusFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Filtrar e ordenar por data/hora descendente (mais novo primeiro)
  const vendasFiltradas = useMemo(() => {
    return vendas
      .filter(v => {
        if (statusFiltro && v.status !== statusFiltro) return false;
        if (busca) {
          const termo = busca.toLowerCase();
          if (!v.id.toLowerCase().includes(termo) && 
              !v.clienteNome.toLowerCase().includes(termo)) return false;
        }
        if (dataInicio) {
          const data = new Date(v.dataHora);
          const inicio = new Date(dataInicio);
          if (data < inicio) return false;
        }
        if (dataFim) {
          const data = new Date(v.dataHora);
          const fim = new Date(dataFim);
          fim.setHours(23, 59, 59);
          if (data > fim) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [vendas, statusFiltro, busca, dataInicio, dataFim]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'Ajuste Solicitado':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Ajuste Solicitado</Badge>;
      case 'Em Finalização':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Em Finalização</Badge>;
      case 'Concluída Digital':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Concluída</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getSLAStyle = (dias: number) => {
    if (dias >= 3) return 'bg-destructive/20';
    if (dias >= 2) return 'bg-warning/20';
    return '';
  };

  const handleFinalizar = (vendaId: string) => {
    navigate(`/vendas/finalizar-digital/${vendaId}`);
  };

  const handleExportCSV = () => {
    exportVendasDigitaisToCSV(vendasFiltradas, 'vendas-digitais-pendentes.csv');
    toast.success('CSV exportado com sucesso');
  };

  return (
    <VendasLayout title="Pendentes Digitais">
      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID ou cliente..."
                  className="pl-10"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              placeholder="Data início"
            />
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              placeholder="Data fim"
            />
            <Select value={statusFiltro || 'all'} onValueChange={(v) => setStatusFiltro(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Ajuste Solicitado">Ajuste Solicitado</SelectItem>
                <SelectItem value="Em Finalização">Em Finalização</SelectItem>
                <SelectItem value="Concluída Digital">Concluída</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
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
                  <TableHead>Responsável</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-center">SLA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasFiltradas.map((venda) => {
                  const sla = calcularSLA(venda.dataHora);
                  return (
                    <TableRow key={venda.id} className={getSLAStyle(sla)}>
                      <TableCell className="font-mono text-xs">{venda.id}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(venda.dataHora).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{obterNomeColaborador(venda.responsavelVendaId) || venda.responsavelVendaNome}</TableCell>
                      <TableCell className="font-medium">{venda.clienteNome}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(venda.valorTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={sla >= 3 ? 'destructive' : sla >= 2 ? 'secondary' : 'outline'}>
                          {sla} {sla === 1 ? 'dia' : 'dias'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(venda.status)}</TableCell>
                      <TableCell>
                        {venda.status !== 'Concluída Digital' && venda.status !== 'Ajuste Solicitado' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleFinalizar(venda.id)}
                          >
                            Finalizar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {vendasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda digital encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </VendasLayout>
  );
}