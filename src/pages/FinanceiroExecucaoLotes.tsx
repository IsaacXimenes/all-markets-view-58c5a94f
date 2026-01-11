import { useState, useEffect, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  Upload,
  FileText,
  DollarSign
} from 'lucide-react';
import { 
  getLotesEnviados, 
  getPagamentosByLote,
  registrarPagamento,
  finalizarLote,
  LotePagamento,
  PagamentoLote
} from '@/utils/lotesPagamentoApi';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatUtils';

export default function FinanceiroExecucaoLotes() {
  const [lotes, setLotes] = useState<LotePagamento[]>([]);
  const [loteSelecionado, setLoteSelecionado] = useState<LotePagamento | null>(null);
  const [pagamentos, setPagamentos] = useState<PagamentoLote[]>([]);
  
  // Modal de pagamento
  const [showModalPagamento, setShowModalPagamento] = useState(false);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<PagamentoLote | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<'Pix' | 'Dinheiro'>('Pix');
  const [arquivoNF, setArquivoNF] = useState<File | null>(null);
  const [arquivoComprovante, setArquivoComprovante] = useState<File | null>(null);

  useEffect(() => {
    const lotesEnviados = getLotesEnviados();
    setLotes(lotesEnviados);
    
    if (lotesEnviados.length > 0 && !loteSelecionado) {
      setLoteSelecionado(lotesEnviados[0]);
    }
  }, []);

  useEffect(() => {
    if (loteSelecionado) {
      const pags = getPagamentosByLote(loteSelecionado.id);
      setPagamentos(pags);
    }
  }, [loteSelecionado]);

  const todosPagos = useMemo(() => {
    return pagamentos.length > 0 && pagamentos.every(p => p.status === 'Pago');
  }, [pagamentos]);

  const handleAbrirModalPagamento = (pagamento: PagamentoLote) => {
    setPagamentoSelecionado(pagamento);
    setFormaPagamento('Pix');
    setArquivoNF(null);
    setArquivoComprovante(null);
    setShowModalPagamento(true);
  };

  const handleRegistrarPagamento = () => {
    if (!pagamentoSelecionado) return;
    
    const sucesso = registrarPagamento(pagamentoSelecionado.id, {
      formaPagamento,
      comprovante: arquivoComprovante?.name,
      notaFiscal: arquivoNF?.name
    });
    
    if (sucesso) {
      toast.success('Pagamento registrado com sucesso!');
      setShowModalPagamento(false);
      
      // Recarregar pagamentos
      if (loteSelecionado) {
        const pags = getPagamentosByLote(loteSelecionado.id);
        setPagamentos(pags);
      }
    } else {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleFinalizarLote = () => {
    if (!loteSelecionado) return;
    
    const sucesso = finalizarLote(loteSelecionado.id, 'Financeiro');
    if (sucesso) {
      toast.success('Lote finalizado com sucesso!');
      
      // Recarregar lotes
      const lotesEnviados = getLotesEnviados();
      setLotes(lotesEnviados);
      setLoteSelecionado(lotesEnviados[0] || null);
    } else {
      toast.error('Erro ao finalizar lote');
    }
  };

  const stats = {
    totalLotes: lotes.length,
    totalPagamentos: pagamentos.length,
    pagamentosPendentes: pagamentos.filter(p => p.status === 'Pendente').length,
    valorTotal: pagamentos.reduce((acc, p) => acc + p.valorTotal, 0)
  };

  return (
    <FinanceiroLayout title="Execução de Lotes">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Lotes para Execução
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalLotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pagamentos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pagamentosPendentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Pagamentos Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalPagamentos - stats.pagamentosPendentes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.valorTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {lotes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum lote aguardando execução.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Lotes */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Lotes Recebidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lotes.map((lote) => (
                <div
                  key={lote.id}
                  onClick={() => setLoteSelecionado(lote)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    loteSelecionado?.id === lote.id
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium font-mono text-sm">{lote.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Enviado: {format(new Date(lote.dataEnvio || lote.dataAbertura), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <p className="font-bold text-primary">{formatCurrency(lote.totalValor)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Detalhes do Lote */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pagamentos por Fornecedor</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Lote: {loteSelecionado?.id}
                </p>
              </div>
              {todosPagos && (
                <Button onClick={handleFinalizarLote}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar Lote
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {pagamentos.map((pagamento) => (
                  <AccordionItem key={pagamento.id} value={pagamento.id} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          {pagamento.status === 'Pago' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                          <span className="font-medium">{pagamento.fornecedorNome}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold">{formatCurrency(pagamento.valorTotal)}</span>
                          <Badge variant={pagamento.status === 'Pago' ? 'default' : 'secondary'}>
                            {pagamento.status}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Quantidade de Solicitações</p>
                            <p className="font-medium">{pagamento.solicitacoes.length}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Valor Total</p>
                            <p className="font-medium text-primary">{formatCurrency(pagamento.valorTotal)}</p>
                          </div>
                          {pagamento.formaPagamento && (
                            <div>
                              <p className="text-muted-foreground">Forma de Pagamento</p>
                              <p className="font-medium">{pagamento.formaPagamento}</p>
                            </div>
                          )}
                          {pagamento.dataPagamento && (
                            <div>
                              <p className="text-muted-foreground">Data do Pagamento</p>
                              <p className="font-medium">
                                {format(new Date(pagamento.dataPagamento), 'dd/MM/yyyy HH:mm')}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {pagamento.status === 'Pendente' && (
                          <Button 
                            className="w-full" 
                            onClick={() => handleAbrirModalPagamento(pagamento)}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Registrar Pagamento
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Registro de Pagamento */}
      <Dialog open={showModalPagamento} onOpenChange={setShowModalPagamento}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          
          {pagamentoSelecionado && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{pagamentoSelecionado.fornecedorNome}</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {formatCurrency(pagamentoSelecionado.valorTotal)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select value={formaPagamento} onValueChange={(v) => setFormaPagamento(v as 'Pix' | 'Dinheiro')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nota Fiscal (PDF/XML)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.xml"
                    onChange={(e) => setArquivoNF(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {arquivoNF && (
                    <Badge variant="outline" className="text-xs">
                      {arquivoNF.name.substring(0, 20)}...
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comprovante de Pagamento</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setArquivoComprovante(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {arquivoComprovante && (
                    <Badge variant="outline" className="text-xs">
                      {arquivoComprovante.name.substring(0, 20)}...
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 OCR para leitura automática será implementado em versão futura
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModalPagamento(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegistrarPagamento}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
