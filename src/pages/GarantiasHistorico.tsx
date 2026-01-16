import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Download, X } from 'lucide-react';
import { 
  getGarantias, getTratativasByGarantiaId, exportGarantiasToCSV
} from '@/utils/garantiasApi';
import { getLojas } from '@/utils/cadastrosApi';
import { format } from 'date-fns';

export default function GarantiasHistorico() {
  const navigate = useNavigate();
  const lojas = getLojas();
  const garantias = getGarantias();
  
  // Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [lojaFiltro, setLojaFiltro] = useState('');
  const [tipoTratativaFiltro, setTipoTratativaFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  
  // Helpers
  const getLojaName = (id: string) => lojas.find(l => l.id === id)?.nome || id;
  
  // Filtrar garantias
  const garantiasFiltradas = useMemo(() => {
    return garantias.filter(g => {
      // Filtrar por status (apenas concluídas e expiradas no histórico)
      if (statusFiltro) {
        if (g.status !== statusFiltro) return false;
      }
      
      // Filtrar por loja
      if (lojaFiltro && g.lojaVenda !== lojaFiltro) return false;
      
      // Filtrar por data
      if (dataInicio) {
        const data = new Date(g.dataInicioGarantia);
        if (data < new Date(dataInicio)) return false;
      }
      if (dataFim) {
        const data = new Date(g.dataInicioGarantia);
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59);
        if (data > fim) return false;
      }
      
      // Filtrar por tipo tratativa
      if (tipoTratativaFiltro) {
        const tratativas = getTratativasByGarantiaId(g.id);
        const temTipo = tratativas.some(t => t.tipo === tipoTratativaFiltro);
        if (!temTipo) return false;
      }
      
      return true;
    });
  }, [garantias, dataInicio, dataFim, lojaFiltro, tipoTratativaFiltro, statusFiltro]);
  
  // Limpar Filtros
  const handleLimparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setLojaFiltro('');
    setTipoTratativaFiltro('');
    setStatusFiltro('');
  };

  const temFiltroAtivo = dataInicio || dataFim || lojaFiltro || tipoTratativaFiltro || statusFiltro;

  // Exportar CSV
  const handleExport = () => {
    exportGarantiasToCSV(garantiasFiltradas, `garantias-historico-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  return (
    <GarantiasLayout title="Histórico de Garantias">
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input 
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input 
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div>
                <Label>Loja</Label>
                <Select value={lojaFiltro || 'all'} onValueChange={(v) => setLojaFiltro(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Lojas</SelectItem>
                    {lojas.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo Tratativa</Label>
                <Select value={tipoTratativaFiltro || 'all'} onValueChange={(v) => setTipoTratativaFiltro(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Direcionado Apple">Direcionado Apple</SelectItem>
                    <SelectItem value="Encaminhado Assistência">Encaminhado Assistência</SelectItem>
                    <SelectItem value="Assistência + Empréstimo">Assistência + Empréstimo</SelectItem>
                    <SelectItem value="Troca Direta">Troca Direta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusFiltro || 'all'} onValueChange={(v) => setStatusFiltro(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Ativa">Ativa</SelectItem>
                    <SelectItem value="Em Tratativa">Em Tratativa</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Expirada">Expirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                {temFiltroAtivo && (
                  <Button onClick={handleLimparFiltros} variant="ghost" size="icon" title="Limpar filtros">
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button onClick={handleExport} variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Exportar CSV
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
                    <TableHead>ID</TableHead>
                    <TableHead>Data Venda</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Resp. Garantia</TableHead>
                    <TableHead>Data Fim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tratativa</TableHead>
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
                    garantiasFiltradas.map(garantia => {
                      const tratativas = getTratativasByGarantiaId(garantia.id);
                      const ultimaTratativa = tratativas[tratativas.length - 1];
                      
                      return (
                        <TableRow key={garantia.id}>
                          <TableCell className="font-medium">{garantia.id}</TableCell>
                          <TableCell>{format(new Date(garantia.dataInicioGarantia), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{garantia.clienteNome}</TableCell>
                          <TableCell>{garantia.modelo}</TableCell>
                          <TableCell className="font-mono text-xs">{garantia.imei}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{garantia.tipoGarantia.replace('Garantia - ', '')}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(garantia.dataFimGarantia), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                garantia.status === 'Concluída' ? 'default' :
                                garantia.status === 'Ativa' ? 'secondary' :
                                garantia.status === 'Expirada' ? 'destructive' :
                                'outline'
                              }
                            >
                              {garantia.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ultimaTratativa ? (
                              <Badge variant="outline">{ultimaTratativa.tipo}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => navigate(`/garantias/${garantia.id}`)}
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
          </CardContent>
        </Card>
        
        {/* Totalizador */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-6">
              <div>
                <span className="text-sm text-muted-foreground">Total de registros:</span>
                <span className="ml-2 font-bold">{garantiasFiltradas.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </GarantiasLayout>
  );
}
