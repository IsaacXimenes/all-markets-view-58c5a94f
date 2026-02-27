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
  Eye, Clock, Package, Smartphone, Wrench, AlertTriangle, CheckCircle, Download, Filter, X, FileText, Bell
} from 'lucide-react';
import { FileUploadComprovante } from '@/components/estoque/FileUploadComprovante';
import { exportToCSV, formatCurrency } from '@/utils/formatUtils';
import { gerarNotaGarantiaPdf } from '@/utils/gerarNotaGarantiaPdf';
import { getVendas, addVenda } from '@/utils/vendasApi';
import { getOrdensServico } from '@/utils/assistenciaApi';
import {
  getGarantiasEmAndamento, getTratativas, updateTratativa, updateGarantia,
  addTimelineEntry, getContadoresGarantia, GarantiaItem, TratativaGarantia
} from '@/utils/garantiasApi';
import { Textarea } from '@/components/ui/textarea';
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
  const [fotoDevolucao, setFotoDevolucao] = useState('');
  const [fotoDevolucaoNome, setFotoDevolucaoNome] = useState('');
  
  
  // Montar dados da tabela
  // Obter todas as OS para verificar status "Serviço concluído"
  const ordensServico = useMemo(() => getOrdensServico(), []);

  const dadosTabela = useMemo(() => {
    return garantiasEmAndamento.map(garantia => {
      const tratativasGarantia = todasTratativas.filter(t => t.garantiaId === garantia.id && 
        t.status === 'Em Andamento');
      const ultimaTratativa = tratativasGarantia[tratativasGarantia.length - 1];
      const diasAberto = ultimaTratativa 
        ? differenceInDays(new Date(), new Date(ultimaTratativa.dataHora))
        : 0;
      
      // Verificar se a OS vinculada tem status "Serviço concluído"
      let servicoConcluido = false;
      if (ultimaTratativa?.osId) {
        const os = ordensServico.find(o => o.id === ultimaTratativa.osId);
        if (os && (os.status === 'Serviço concluído' || os.status === 'Finalizado')) {
          servicoConcluido = true;
        }
      }

      return {
        garantia,
        tratativa: ultimaTratativa,
        diasAberto,
        servicoConcluido
      };
    });
  }, [garantiasEmAndamento, todasTratativas, ordensServico]);

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
    }).sort((a, b) => {
      const dataA = a.tratativa?.dataHora ? new Date(a.tratativa.dataHora).getTime() : 0;
      const dataB = b.tratativa?.dataHora ? new Date(b.tratativa.dataHora).getTime() : 0;
      return dataB - dataA;
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
    
    // Validação de foto obrigatória
    if (!fotoDevolucao) {
      toast.error('É obrigatório anexar fotos do estado do aparelho na devolução');
      return;
    }
    
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
      descricao: `Aparelho emprestado ${tratativaSelecionada.aparelhoEmprestadoModelo} (IMEI: ${tratativaSelecionada.aparelhoEmprestadoImei}) devolvido. Fotos do estado registradas.`,
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
    setFotoDevolucao('');
    setFotoDevolucaoNome('');
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
                      dadosFiltrados.map(({ garantia, tratativa, diasAberto, servicoConcluido }) => (
                        <TableRow key={garantia.id} className={servicoConcluido ? 'bg-green-500/10' : diasAberto > 7 ? 'bg-red-500/10' : ''}>
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
                          <div className="flex flex-col gap-1">
                        <Badge variant="outline">
                              {tratativa?.tipo || '-'}
                            </Badge>
                            {servicoConcluido && (
                              <Badge className="bg-green-500 text-white hover:bg-green-600 text-[10px] gap-1">
                                <Bell className="h-3 w-3" />
                                Serviço Concluído - Chamar Cliente
                              </Badge>
                            )}
                          </div>
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
                            {tratativa?.tipo === 'Troca Direta' && tratativa?.status === 'Em Andamento' && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  const vendas = getVendas();
                                  let vendaGarantia = vendas.find(v => 
                                    v.origemVenda === 'Troca Garantia' && (
                                      v.observacoes?.includes(garantia.id) ||
                                      v.itens?.some(item => item.id === `ITEM-GAR-${garantia.id}`)
                                    )
                                  );
                                  // Se a venda não existe (aprovação anterior ao código), criar agora
                                  if (!vendaGarantia && tratativa) {
                                    vendaGarantia = addVenda({
                                      dataHora: new Date().toISOString(),
                                      lojaVenda: garantia.lojaVenda,
                                      vendedor: 'COL-001',
                                      clienteId: garantia.clienteId,
                                      clienteNome: garantia.clienteNome,
                                      clienteCpf: '',
                                      clienteTelefone: garantia.clienteTelefone || '',
                                      clienteEmail: garantia.clienteEmail || '',
                                      clienteCidade: '',
                                      origemVenda: 'Troca Garantia',
                                      localRetirada: garantia.lojaVenda,
                                      tipoRetirada: 'Retirada Balcão',
                                      taxaEntrega: 0,
                                      itens: [{
                                        id: `ITEM-GAR-${garantia.id}`,
                                        produtoId: tratativa.aparelhoTrocaId || '',
                                        produto: tratativa.aparelhoTrocaModelo || garantia.modelo,
                                        imei: tratativa.aparelhoTrocaImei || '',
                                        quantidade: 1,
                                        valorRecomendado: 0,
                                        valorCusto: 0,
                                        valorVenda: 0,
                                        categoria: 'Apple',
                                        loja: garantia.lojaVenda,
                                      }],
                                      tradeIns: [{
                                        id: `TI-GAR-${garantia.id}`,
                                        modelo: garantia.modelo,
                                        descricao: 'Entrada de Garantia',
                                        imei: garantia.imei,
                                        valorCompraUsado: 0,
                                        imeiValidado: true,
                                        condicao: 'Semi-novo',
                                      }],
                                      acessorios: [],
                                      pagamentos: [],
                                      subtotal: 0,
                                      totalTradeIn: 0,
                                      total: 0,
                                      lucro: 0,
                                      margem: 0,
                                      observacoes: `Troca Direta - Garantia ${garantia.id}. Aparelho defeituoso IMEI: ${garantia.imei}. Aparelho novo: ${tratativa.aparelhoTrocaModelo} IMEI: ${tratativa.aparelhoTrocaImei}.`,
                                      status: 'Concluída',
                                    });
                                  }
                                  if (vendaGarantia) {
                                    gerarNotaGarantiaPdf(vendaGarantia);
                                    toast.success('Nota de garantia gerada!');
                                  } else {
                                    toast.error('Erro ao gerar nota de garantia.');
                                  }
                                }}
                                title="Gerar Nota de Garantia"
                              >
                                <FileText className="h-4 w-4" />
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

              {/* Upload de fotos obrigatório na devolução */}
              <FileUploadComprovante
                label="Fotos do Estado do Aparelho na Devolução *"
                required
                value={fotoDevolucao}
                fileName={fotoDevolucaoNome}
                onFileChange={(data) => {
                  setFotoDevolucao(data.comprovante);
                  setFotoDevolucaoNome(data.comprovanteNome);
                }}
                acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                maxSizeMB={10}
              />
              <p className="text-xs text-muted-foreground">
                Registre o estado do aparelho no ato da devolução pelo cliente.
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
