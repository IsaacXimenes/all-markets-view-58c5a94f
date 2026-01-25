import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Eye, Clock, Package, Smartphone, Wrench, AlertTriangle, CheckCircle, Download, Filter, X
} from 'lucide-react';
import { exportToCSV, formatCurrency } from '@/utils/formatUtils';
import {
  getGarantiasEmAndamento, getTratativas, updateTratativa, updateGarantia,
  addTimelineEntry, getContadoresGarantia, GarantiaItem, TratativaGarantia
} from '@/utils/garantiasApi';
import { getClientes, getLojas } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { format, differenceInDays } from 'date-fns';

export default function GarantiasEmAndamento() {
  const navigate = useNavigate();
  const { obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  
  // Dados
  const garantiasEmAndamento = getGarantiasEmAndamento();
  const todasTratativas = getTratativas();
  const contadores = getContadoresGarantia();
  const clientes = getClientes();
  const lojas = getLojas();
  
  // Filtros
  const [filters, setFilters] = useState({
    cliente: '',
    status: 'todos',
    dataInicio: '',
    dataFim: '',
    aparelho: ''
  });
  
  // Modal devolução
  const [showDevolucaoModal, setShowDevolucaoModal] = useState(false);
  const [tratativaSelecionada, setTratativaSelecionada] = useState<TratativaGarantia | null>(null);
  const [garantiaParaDevolucao, setGarantiaParaDevolucao] = useState<GarantiaItem | null>(null);
  
  // Montar dados da tabela
  const dadosTabela = useMemo(() => {
    return garantiasEmAndamento.map(garantia => {
      const tratativas = todasTratativas.filter(t => t.garantiaId === garantia.id && t.status === 'Em Andamento');
      const ultimaTratativa = tratativas[tratativas.length - 1];
      const diasAberto = ultimaTratativa 
        ? differenceInDays(new Date(), new Date(ultimaTratativa.dataHora))
        : 0;
      
      return {
        garantia,
        tratativa: ultimaTratativa,
        diasAberto
      };
    });
  }, [garantiasEmAndamento, todasTratativas]);

  // Dados filtrados
  const dadosFiltrados = useMemo(() => {
    return dadosTabela.filter(({ garantia, tratativa, diasAberto }) => {
      // Filtro por cliente
      if (filters.cliente && !garantia.clienteNome.toLowerCase().includes(filters.cliente.toLowerCase())) {
        return false;
      }
      
      // Filtro por status/tipo tratativa
      if (filters.status !== 'todos') {
        if (filters.status === 'emprestimo' && !tratativa?.aparelhoEmprestadoId) return false;
        if (filters.status === 'assistencia' && !tratativa?.osId) return false;
        if (filters.status === 'mais7dias' && diasAberto <= 7) return false;
      }
      
      // Filtro por data
      if (filters.dataInicio && tratativa) {
        const dataTratativa = new Date(tratativa.dataHora);
        if (dataTratativa < new Date(filters.dataInicio)) return false;
      }
      if (filters.dataFim && tratativa) {
        const dataTratativa = new Date(tratativa.dataHora);
        const dataFimFiltro = new Date(filters.dataFim);
        dataFimFiltro.setHours(23, 59, 59);
        if (dataTratativa > dataFimFiltro) return false;
      }
      
      // Filtro por aparelho/modelo
      if (filters.aparelho && !garantia.modelo.toLowerCase().includes(filters.aparelho.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [dadosTabela, filters]);
  
  // Limpar filtros
  const handleLimparFiltros = () => {
    setFilters({
      cliente: '',
      status: 'todos',
      dataInicio: '',
      dataFim: '',
      aparelho: ''
    });
  };
  
  // Registrar devolução
  const handleDevolucao = () => {
    if (!tratativaSelecionada || !garantiaParaDevolucao) return;
    
    // Atualizar tratativa
    updateTratativa(tratativaSelecionada.id, { status: 'Concluído' });
    
    // Atualizar garantia
    updateGarantia(garantiaParaDevolucao.id, { status: 'Concluída' });
    
    // Adicionar timeline
    addTimelineEntry({
      garantiaId: garantiaParaDevolucao.id,
      dataHora: new Date().toISOString(),
      tipo: 'devolucao',
      titulo: 'Aparelho devolvido',
      descricao: `Aparelho emprestado ${tratativaSelecionada.aparelhoEmprestadoModelo} (IMEI: ${tratativaSelecionada.aparelhoEmprestadoImei}) devolvido`,
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema'
    });
    
    addTimelineEntry({
      garantiaId: garantiaParaDevolucao.id,
      dataHora: new Date().toISOString(),
      tipo: 'conclusao',
      titulo: 'Garantia concluída',
      descricao: 'Tratativa finalizada com sucesso',
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema'
    });
    
    toast.success('Devolução registrada com sucesso!');
    setShowDevolucaoModal(false);
    setTratativaSelecionada(null);
    setGarantiaParaDevolucao(null);
  };
  
  const abrirModalDevolucao = (garantia: GarantiaItem, tratativa: TratativaGarantia) => {
    setGarantiaParaDevolucao(garantia);
    setTratativaSelecionada(tratativa);
    setShowDevolucaoModal(true);
  };

  return (
    <GarantiasLayout title="Garantias Em Andamento">
      <div className="space-y-6">
        {/* Cards Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total em Andamento</p>
                  <p className="text-2xl font-bold">{contadores.emAndamento}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Smartphone className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aparelhos Emprestados</p>
                  <p className="text-2xl font-bold">{contadores.aparelhosEmprestados}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Wrench className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Em Assistência</p>
                  <p className="text-2xl font-bold">{contadores.emAssistencia}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">&gt; 7 dias sem resolução</p>
                  <p className="text-2xl font-bold">{contadores.maisde7Dias}</p>
                </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label>Cliente</Label>
                <Input
                  placeholder="Buscar cliente..."
                  value={filters.cliente}
                  onChange={(e) => setFilters({ ...filters, cliente: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="emprestimo">Com Empréstimo</SelectItem>
                    <SelectItem value="assistencia">Em Assistência</SelectItem>
                    <SelectItem value="mais7dias">Mais de 7 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
              <div>
                <Label>Aparelho</Label>
                <Input
                  placeholder="Modelo..."
                  value={filters.aparelho}
                  onChange={(e) => setFilters({ ...filters, aparelho: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleLimparFiltros}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
              <Button variant="outline" onClick={() => {
                const data = dadosFiltrados.map(({ garantia, tratativa, diasAberto }) => ({
                  ID: garantia.id,
                  'Data Abertura': tratativa ? format(new Date(tratativa.dataHora), 'dd/MM/yyyy') : '-',
                  Cliente: garantia.clienteNome,
                  Modelo: garantia.modelo,
                  IMEI: garantia.imei,
                  'Tipo Tratativa': tratativa?.tipo || '-',
                  Dias: diasAberto
                }));
                exportToCSV(data, `garantias_em_andamento_${format(new Date(), 'dd_MM_yyyy')}.csv`);
              }}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>
              Garantias em Andamento ({dadosFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data Abertura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Tipo Tratativa</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Nenhuma garantia em andamento
                      </TableCell>
                    </TableRow>
                  ) : (
                      dadosFiltrados.map(({ garantia, tratativa, diasAberto }) => (
                        <TableRow key={garantia.id} className={diasAberto > 7 ? 'bg-red-500/10' : ''}>
                          <TableCell className="font-medium">{garantia.id}</TableCell>
                          <TableCell>
                            {tratativa ? format(new Date(tratativa.dataHora), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell>{garantia.clienteNome}</TableCell>
                          <TableCell className="text-sm">{obterNomeLoja(garantia.lojaVenda)}</TableCell>
                          <TableCell className="text-sm">{obterNomeColaborador(garantia.vendedorId)}</TableCell>
                          <TableCell>{garantia.modelo}</TableCell>
                          <TableCell className="font-mono text-xs">{garantia.imei}</TableCell>
                          <TableCell>
                          <Badge variant="outline">{tratativa?.tipo || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={diasAberto > 7 ? 'destructive' : diasAberto > 3 ? 'secondary' : 'default'}>
                            {diasAberto} {diasAberto === 1 ? 'dia' : 'dias'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => navigate(`/garantias/${garantia.id}`)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {tratativa?.aparelhoEmprestadoId && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => abrirModalDevolucao(garantia, tratativa)}
                                title="Registrar devolução"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            )}
                            {tratativa?.osId && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  updateTratativa(tratativa.id, { status: 'Concluído' });
                                  updateGarantia(garantia.id, { status: 'Concluída' });
                                  toast.success('Garantia finalizada!');
                                }}
                                title="Finalizar"
                              >
                                <CheckCircle className="h-4 w-4" />
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
      </div>
      
      {/* Modal Devolução */}
      <Dialog open={showDevolucaoModal} onOpenChange={setShowDevolucaoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Devolução</DialogTitle>
            <DialogDescription>
              Confirme a devolução do aparelho emprestado
            </DialogDescription>
          </DialogHeader>
          
          {tratativaSelecionada && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Aparelho Emprestado</p>
                <p className="font-medium">{tratativaSelecionada.aparelhoEmprestadoModelo}</p>
                <p className="text-sm font-mono">{tratativaSelecionada.aparelhoEmprestadoImei}</p>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Ao confirmar, o aparelho será devolvido ao estoque e a tratativa será finalizada.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDevolucaoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDevolucao}>
              Confirmar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GarantiasLayout>
  );
}
