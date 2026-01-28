import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { getNotasCompra, addNotaCompra, NotaCompra, verificarConferenciaNota } from '@/utils/estoqueApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { exportToCSV, formatCurrency, moedaMask, parseMoeda } from '@/utils/formatUtils';
import { Download, Plus, Eye, FileText, DollarSign, CheckCircle, Clock, Zap, X, BarChart } from 'lucide-react';
import { toast } from 'sonner';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { FileUploadComprovante } from '@/components/estoque/FileUploadComprovante';

// Função para gerar ID de urgência
const gerarIdUrgencia = () => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `URG-${year}-${timestamp}`;
};

export default function EstoqueNotasCompra() {
  const navigate = useNavigate();
  const [notas] = useState(getNotasCompra());
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [statusConferenciaFilter, setStatusConferenciaFilter] = useState<string>('todos');
  const [statusPagamentoFilter, setStatusPagamentoFilter] = useState<string>('todos');
  const fornecedores = getFornecedores();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showUrgenciaModal, setShowUrgenciaModal] = useState(false);
  const [urgenciaId, setUrgenciaId] = useState('');
  const [urgenciaForm, setUrgenciaForm] = useState({
    fornecedor: '',
    valorTotal: '',
    formaPagamento: '',
    observacoes: '',
    vendedorResponsavel: '',
    fotoComprovante: '',
    fotoComprovanteNome: '',
    fotoComprovantePreview: ''
  });
  
  // Estado para modal de progresso
  const [showProgressoModal, setShowProgressoModal] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaCompra | null>(null);

  // Helper para obter nome do fornecedor
  const getFornecedorNome = (fornecedorIdOuNome: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorIdOuNome);
    return fornecedor?.nome || fornecedorIdOuNome;
  };

  const notasFiltradas = notas.filter(n => {
    if (fornecedorFilter) {
      const fornecedorSelecionado = fornecedores.find(f => f.id === fornecedorFilter);
      if (fornecedorSelecionado && n.fornecedor !== fornecedorSelecionado.nome && n.fornecedor !== fornecedorFilter) {
        return false;
      }
    }
    if (statusFilter !== 'todos' && n.status !== statusFilter) return false;
    if (statusConferenciaFilter !== 'todos' && n.statusConferencia !== statusConferenciaFilter) return false;
    if (statusPagamentoFilter !== 'todos' && n.statusPagamento !== statusPagamentoFilter) return false;
    if (dataInicio && n.data < dataInicio) return false;
    if (dataFim && n.data > dataFim) return false;
    return true;
  });
  
  // Função para obter progresso da nota
  const getProgressoNota = (notaId: string) => {
    const conferencia = verificarConferenciaNota(notaId);
    return conferencia.percentual;
  };
  
  // Função para ver progresso
  const handleVerProgresso = (nota: NotaCompra) => {
    setNotaSelecionada(nota);
    setShowProgressoModal(true);
  };
  
  // Helper para cor do badge de conferência
  const getConferenciaBadgeClass = (status?: string) => {
    switch (status) {
      case 'Conferência Completa':
        return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'Discrepância Detectada':
        return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'Em Conferência':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'Finalizada com Pendência':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };
  
  // Helper para cor do badge de pagamento
  const getPagamentoBadgeClass = (status?: string) => {
    switch (status) {
      case 'Pago':
        return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'Parcialmente Pago':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      case 'Aguardando Conferência':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  // Cálculos para os cards
  const stats = useMemo(() => {
    const qtdNotas = notasFiltradas.length;
    const valorTotal = notasFiltradas.reduce((acc, n) => acc + n.valorTotal, 0);
    const valorConcluido = notasFiltradas.filter(n => n.status === 'Concluído').reduce((acc, n) => acc + n.valorTotal, 0);
    const valorPendente = notasFiltradas.filter(n => n.status === 'Pendente').reduce((acc, n) => acc + n.valorTotal, 0);
    return { qtdNotas, valorTotal, valorConcluido, valorPendente };
  }, [notasFiltradas]);

  const handleExport = () => {
    exportToCSV(notasFiltradas, 'notas-compra.csv');
  };

  return (
    <EstoqueLayout title="Notas de Compra">
      <div className="space-y-4">
        {/* Cards de Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qtd de Notas</p>
                  <p className="text-2xl font-bold">{stats.qtdNotas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</p>
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
                  <p className="text-sm text-muted-foreground">Valor Concluído</p>
                  <p className="text-2xl font-bold text-green-500">{formatCurrency(stats.valorConcluido)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Pendente</p>
                  <p className="text-2xl font-bold text-orange-500">{formatCurrency(stats.valorPendente)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="Data início"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-[150px]"
            />
            <Input
              type="date"
              placeholder="Data fim"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <div className="w-[250px]">
            <AutocompleteFornecedor
              value={fornecedorFilter}
              onChange={setFornecedorFilter}
              placeholder="Todos fornecedores"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusConferenciaFilter} onValueChange={setStatusConferenciaFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Conferência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Conferências</SelectItem>
              <SelectItem value="Em Conferência">Em Conferência</SelectItem>
              <SelectItem value="Conferência Completa">Conferência Completa</SelectItem>
              <SelectItem value="Discrepância Detectada">Discrepância</SelectItem>
              <SelectItem value="Finalizada com Pendência">Finalizada c/ Pendência</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusPagamentoFilter} onValueChange={setStatusPagamentoFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Pagamentos</SelectItem>
              <SelectItem value="Aguardando Conferência">Aguardando Conf.</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="Parcialmente Pago">Parcial</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => {
                setFornecedorFilter('');
                setStatusFilter('todos');
                setStatusConferenciaFilter('todos');
                setStatusPagamentoFilter('todos');
                setDataInicio('');
                setDataFim('');
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Limpar
            </Button>
            <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30" onClick={() => {
              setUrgenciaId(gerarIdUrgencia());
              setShowUrgenciaModal(true);
            }}>
              <Zap className="mr-2 h-4 w-4" />
              Lançamento Urgência
            </Button>

            <Button onClick={() => navigate('/estoque/nota/cadastrar')}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Nova Nota
            </Button>

            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nº Nota</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Valor Conferido</TableHead>
                <TableHead>Status Conf.</TableHead>
                <TableHead>Status Pag.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notasFiltradas.map(nota => {
                const progresso = getProgressoNota(nota.id);
                return (
                <TableRow 
                  key={nota.id}
                  className={
                    nota.status === 'Pendente' 
                      ? 'bg-red-500/10' 
                      : nota.status === 'Concluído' 
                        ? 'bg-green-500/10' 
                        : 'bg-blue-500/10'
                  }
                >
                  <TableCell>{new Date(nota.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-mono text-xs">{nota.numeroNota}</TableCell>
                  <TableCell>{nota.fornecedor}</TableCell>
                  <TableCell>
                    {formatCurrency(nota.valorTotal)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={progresso} className="w-16 h-2" />
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(nota.valorConferido || 0)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getConferenciaBadgeClass(nota.statusConferencia)}>
                      {nota.statusConferencia || 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getPagamentoBadgeClass(nota.statusPagamento)}>
                      {nota.statusPagamento || 'Aguardando'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={nota.status === 'Concluído' ? 'default' : 'destructive'}>
                      {nota.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleVerProgresso(nota)}
                        title="Ver Progresso"
                      >
                        <BarChart className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/estoque/nota/${nota.id}`)}
                        title="Ver Detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>

        {/* Modal de Lançamento Urgência */}
        <Dialog open={showUrgenciaModal} onOpenChange={setShowUrgenciaModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <Zap className="h-5 w-5" />
                Lançamento Urgência
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Cadastro básico para envio direto ao Financeiro. Os produtos serão inseridos após o pagamento.
              </p>
              <div className="space-y-3">
                <div>
                  <Label>ID</Label>
                  <Input
                    value={urgenciaId}
                    disabled
                    className="font-mono bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Gerado automaticamente</p>
                </div>
                <div>
                  <Label>Fornecedor *</Label>
                  <AutocompleteFornecedor
                    value={urgenciaForm.fornecedor}
                    onChange={(v) => setUrgenciaForm(prev => ({ ...prev, fornecedor: v }))}
                    placeholder="Selecione o fornecedor"
                  />
                </div>
                <div>
                  <Label>Valor Total (R$) *</Label>
                  <Input
                    value={urgenciaForm.valorTotal}
                    onChange={(e) => setUrgenciaForm(prev => ({ ...prev, valorTotal: moedaMask(e.target.value) }))}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <Label>Forma de Pagamento *</Label>
                  <Select value={urgenciaForm.formaPagamento} onValueChange={(v) => setUrgenciaForm(prev => ({ ...prev, formaPagamento: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Pix">Pix</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={urgenciaForm.observacoes}
                    onChange={(e) => setUrgenciaForm(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Motivo da urgência..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Vendedor Responsável *</Label>
                  <Input
                    value={urgenciaForm.vendedorResponsavel}
                    onChange={(e) => setUrgenciaForm(prev => ({ ...prev, vendedorResponsavel: e.target.value }))}
                    placeholder="Nome do vendedor que solicitou"
                  />
                </div>
                <FileUploadComprovante
                  label="Foto/Comprovante"
                  required
                  value={urgenciaForm.fotoComprovante}
                  fileName={urgenciaForm.fotoComprovanteNome}
                  onFileChange={(data) => setUrgenciaForm(prev => ({
                    ...prev,
                    fotoComprovante: data.comprovante,
                    fotoComprovanteNome: data.comprovanteNome,
                    fotoComprovantePreview: data.comprovantePreview
                  }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUrgenciaModal(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => {
                  if (!urgenciaForm.fornecedor || !urgenciaForm.valorTotal || !urgenciaForm.formaPagamento) {
                    toast.error('Preencha todos os campos obrigatórios');
                    return;
                  }
                  
                  if (!urgenciaForm.vendedorResponsavel) {
                    toast.error('Informe o vendedor responsável');
                    return;
                  }
                  
                  if (!urgenciaForm.fotoComprovante) {
                    toast.error('Foto/comprovante é obrigatório para notas de urgência');
                    return;
                  }
                  
                  // Criar nota de urgência no sistema
                  const valorNumerico = parseMoeda(urgenciaForm.valorTotal);
                  const novaNota = addNotaCompra({
                    data: new Date().toISOString().split('T')[0],
                    numeroNota: urgenciaId,
                    fornecedor: urgenciaForm.fornecedor,
                    valorTotal: valorNumerico,
                    origem: 'Urgência',
                    vendedorRegistro: urgenciaForm.vendedorResponsavel,
                    fotoComprovante: urgenciaForm.fotoComprovante,
                    produtos: [],
                    pagamento: {
                      formaPagamento: urgenciaForm.formaPagamento,
                      parcelas: 1,
                      valorParcela: valorNumerico,
                      dataVencimento: new Date().toISOString().split('T')[0]
                    }
                  });
                  
                  // Marcar como enviada para financeiro no localStorage
                  localStorage.setItem(`nota_status_${novaNota.id}`, 'Enviado para Financeiro');
                  
                  toast.success(`Nota de urgência ${novaNota.id} enviada para o Financeiro!`);
                  setShowUrgenciaModal(false);
                  setUrgenciaForm({ 
                    fornecedor: '', 
                    valorTotal: '', 
                    formaPagamento: '', 
                    observacoes: '', 
                    vendedorResponsavel: '', 
                    fotoComprovante: '',
                    fotoComprovanteNome: '',
                    fotoComprovantePreview: ''
                  });
                }}
              >
                <Zap className="mr-2 h-4 w-4" />
                Enviar para Financeiro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Progresso de Conferência */}
        <Dialog open={showProgressoModal} onOpenChange={setShowProgressoModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Progresso de Conferência - {notaSelecionada?.id}
              </DialogTitle>
            </DialogHeader>
            {notaSelecionada && (() => {
              const conferencia = verificarConferenciaNota(notaSelecionada.id);
              return (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span className="font-medium">{conferencia.percentual}%</span>
                    </div>
                    <Progress 
                      value={conferencia.percentual} 
                      className={`h-3 ${
                        conferencia.percentual === 100 
                          ? '[&>div]:bg-green-500' 
                          : conferencia.percentual >= 50 
                          ? '[&>div]:bg-blue-500' 
                          : '[&>div]:bg-yellow-500'
                      }`} 
                    />
                    <p className="text-center text-sm text-muted-foreground">
                      {conferencia.aparelhosConferidos}/{conferencia.aparelhosTotal} aparelhos conferidos
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/30 rounded">
                      <Label className="text-xs">Valor Total</Label>
                      <p className="font-semibold">{formatCurrency(notaSelecionada.valorTotal)}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded">
                      <Label className="text-xs">Valor Conferido</Label>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(notaSelecionada.valorConferido || 0)}
                      </p>
                    </div>
                  </div>

                  {conferencia.discrepancia && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                      <p className="text-sm font-medium text-red-600">⚠️ Discrepância Detectada</p>
                      <p className="text-xs text-muted-foreground">{conferencia.motivo}</p>
                    </div>
                  )}

                  {/* Timeline de validações */}
                  <div className="space-y-2">
                    <Label>Histórico de Validações</Label>
                    <div className="max-h-48 overflow-auto space-y-2">
                      {notaSelecionada.timeline && notaSelecionada.timeline.length > 0 ? (
                        notaSelecionada.timeline.map(entry => (
                          <div key={entry.id} className="border-l-2 border-primary/30 pl-3 py-2">
                            <p className="text-sm font-medium">{entry.titulo}</p>
                            <p className="text-xs text-muted-foreground">{entry.descricao}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(entry.data).toLocaleString('pt-BR')} - {entry.responsavel}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma validação registrada</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProgressoModal(false)}>
                Fechar
              </Button>
              <Button onClick={() => {
                setShowProgressoModal(false);
                navigate(`/estoque/nota/${notaSelecionada?.id}`);
              }}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalhes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EstoqueLayout>
  );
}
