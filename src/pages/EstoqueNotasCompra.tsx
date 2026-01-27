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
import { getNotasCompra, addNotaCompra } from '@/utils/estoqueApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { exportToCSV, formatCurrency, moedaMask, parseMoeda } from '@/utils/formatUtils';
import { Download, Plus, Eye, FileText, DollarSign, CheckCircle, Clock, Zap, X } from 'lucide-react';
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
    if (dataInicio && n.data < dataInicio) return false;
    if (dataFim && n.data > dataFim) return false;
    return true;
  });

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
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => {
                setFornecedorFilter('');
                setStatusFilter('todos');
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
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notasFiltradas.map(nota => (
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
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valorTotal)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={nota.status === 'Concluído' ? 'default' : 'destructive'}>
                      {nota.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/estoque/nota/${nota.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
      </div>
    </EstoqueLayout>
  );
}
