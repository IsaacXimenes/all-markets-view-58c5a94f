import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssistenciaLayout } from '@/components/layout/AssistenciaLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getRetiradasPecas, 
  getEstatisticasRetiradas,
  calcularSomaPecas,
  RetiradaPecas 
} from '@/utils/retiradaPecasApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { formatCurrency } from '@/utils/formatUtils';
import { formatIMEI } from '@/utils/imeiMask';
import { 
  Eye, 
  Download, 
  Scissors, 
  Clock, 
  Wrench, 
  CheckCircle, 
  XCircle,
  Package,
  TrendingDown,
  Edit,
  X
} from 'lucide-react';
import { ResponsiveCardGrid, ResponsiveFilterGrid } from '@/components/ui/ResponsiveContainers';

export default function AssistRetiradaPecas() {
  const navigate = useNavigate();
  const { obterNomeLoja } = useCadastroStore();
  
  const [retiradas, setRetiradas] = useState<RetiradaPecas[]>([]);
  const [stats, setStats] = useState(getEstatisticasRetiradas());
  
  // Filtros
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroLoja, setFiltroLoja] = useState('todas');
  const [filtroImei, setFiltroImei] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    setRetiradas(getRetiradasPecas());
    setStats(getEstatisticasRetiradas());
  };

  const retiradasFiltradas = retiradas.filter(r => {
    if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false;
    if (filtroLoja !== 'todas' && r.lojaId !== filtroLoja) return false;
    if (filtroImei && !r.imeiOriginal.includes(filtroImei.replace(/\D/g, ''))) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente Assistência':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>;
      case 'Em Desmonte':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
          <Wrench className="h-3 w-3 mr-1" />
          Em Desmonte
        </Badge>;
      case 'Concluída':
        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Concluída
        </Badge>;
      case 'Cancelada':
        return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelada
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleExport = () => {
    const csvData = retiradasFiltradas.map(r => ({
      'ID': r.id,
      'IMEI': r.imeiOriginal,
      'Modelo': r.modeloOriginal,
      'Cor': r.corOriginal,
      'Valor Custo': formatCurrency(r.valorCustoAparelho),
      'Loja': obterNomeLoja(r.lojaId),
      'Data Solicitação': new Date(r.dataSolicitacao).toLocaleDateString('pt-BR'),
      'Responsável': r.responsavelSolicitacao,
      'Status': r.status,
      'Técnico': r.tecnicoResponsavel || '-',
      'Qtd Peças': r.pecasRetiradas.length
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'retiradas-pecas.csv';
    link.click();
  };

  return (
    <AssistenciaLayout title="Retirada de Peças">
      <div className="space-y-6">
        {/* Dashboard Cards */}
        <ResponsiveCardGrid cols={6}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold">{stats.pendentes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Wrench className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Em Desmonte</p>
                  <p className="text-2xl font-bold">{stats.emDesmonte}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                  <p className="text-2xl font-bold">{stats.concluidas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Canceladas</p>
                  <p className="text-2xl font-bold">{stats.canceladas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor em Peças</p>
                  <p className="text-xl font-bold truncate" title={formatCurrency(stats.valorTotalPecasGeradas)}>
                    {formatCurrency(stats.valorTotalPecasGeradas)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Prejuízo</p>
                  <p className="text-xl font-bold truncate text-red-600" title={formatCurrency(
                    retiradas
                      .filter(r => r.status === 'Concluída')
                      .reduce((acc, r) => {
                        const somaPecas = calcularSomaPecas(r.id);
                        const prejuizo = r.valorCustoAparelho - somaPecas;
                        return acc + (prejuizo > 0 ? prejuizo : 0);
                      }, 0)
                  )}>
                    {formatCurrency(
                      retiradas
                        .filter(r => r.status === 'Concluída')
                        .reduce((acc, r) => {
                          const somaPecas = calcularSomaPecas(r.id);
                          const prejuizo = r.valorCustoAparelho - somaPecas;
                          return acc + (prejuizo > 0 ? prejuizo : 0);
                        }, 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </ResponsiveCardGrid>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <ResponsiveFilterGrid cols={4}>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Pendente Assistência">Pendente</SelectItem>
                    <SelectItem value="Em Desmonte">Em Desmonte</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Loja</Label>
                <AutocompleteLoja
                  value={filtroLoja === 'todas' ? '' : filtroLoja}
                  onChange={(v) => setFiltroLoja(v || 'todas')}
                  placeholder="Todas"
                />
              </div>

              <div className="space-y-2">
                <Label>IMEI</Label>
                <Input
                  placeholder="Buscar por IMEI..."
                  value={filtroImei}
                  onChange={(e) => setFiltroImei(e.target.value)}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => {
                  setFiltroStatus('todos');
                  setFiltroLoja('todas');
                  setFiltroImei('');
                }} title="Limpar Filtros">
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </ResponsiveFilterGrid>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Data Solicitação</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Valor Custo</TableHead>
                    <TableHead>Valor Total Peças</TableHead>
                    <TableHead>Prejuízo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retiradasFiltradas.map(retirada => (
                    <TableRow key={retirada.id}>
                      <TableCell className="font-mono text-xs">{retirada.id}</TableCell>
                      <TableCell className="font-mono text-xs">{formatIMEI(retirada.imeiOriginal)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{retirada.modeloOriginal}</p>
                          <p className="text-xs text-muted-foreground">{retirada.corOriginal}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{obterNomeLoja(retirada.lojaId)}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(retirada.dataSolicitacao).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-sm">{retirada.responsavelSolicitacao}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(retirada.valorCustoAparelho)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(retirada.pecasRetiradas.reduce((acc, p) => acc + (p.valorCustoPeca * p.quantidade), 0))}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const totalPecas = retirada.pecasRetiradas.reduce((acc, p) => acc + (p.valorCustoPeca * p.quantidade), 0);
                          const prejuizo = retirada.valorCustoAparelho - totalPecas;
                          return prejuizo > 0.01 ? (
                            <span className="font-medium text-red-600">-{formatCurrency(prejuizo)}</span>
                          ) : (
                            <span className="font-medium text-green-600">{formatCurrency(0)}</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>{getStatusBadge(retirada.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/os/retirada-pecas/${retirada.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(retirada.status === 'Pendente Assistência' || retirada.status === 'Em Desmonte') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/os/retirada-pecas/${retirada.id}?editar=true`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {retiradasFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        <Scissors className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>Nenhuma solicitação de retirada encontrada</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AssistenciaLayout>
  );
}
