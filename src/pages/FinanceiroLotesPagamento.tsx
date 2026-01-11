import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Send, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  History,
  Eye
} from 'lucide-react';
import { 
  getLotes,
  getLotesAbertos, 
  getLoteById, 
  enviarLoteParaFinanceiro,
  verificarItensParados,
  LotePagamento
} from '@/utils/lotesPagamentoApi';
import { getSolicitacoes, SolicitacaoPeca } from '@/utils/solicitacaoPecasApi';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatUtils';

export default function FinanceiroLotesPagamento() {
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<LotePagamento[]>([]);
  const [loteAtual, setLoteAtual] = useState<LotePagamento | null>(null);
  const [solicitacoesAprovadas, setSolicitacoesAprovadas] = useState<SolicitacaoPeca[]>([]);
  const [alertasParados, setAlertasParados] = useState<string[]>([]);
  const [showConfirmEnvio, setShowConfirmEnvio] = useState(false);

  useEffect(() => {
    const todosLotes = getLotes();
    setLotes(todosLotes);
    
    const lotesAbertos = getLotesAbertos();
    if (lotesAbertos.length > 0) {
      setLoteAtual(lotesAbertos[0]);
    }
    
    // Buscar solicitações aprovadas não pagas
    const solicitacoes = getSolicitacoes();
    const aprovadas = solicitacoes.filter(s => s.status === 'Aprovada');
    setSolicitacoesAprovadas(aprovadas);
    
    // Verificar itens parados
    setAlertasParados(verificarItensParados());
  }, []);

  const solicitacoesNoLote = useMemo(() => {
    if (!loteAtual) return [];
    const solicitacoes = getSolicitacoes();
    return solicitacoes.filter(s => loteAtual.solicitacoes.includes(s.id));
  }, [loteAtual]);

  const handleEnviarLote = () => {
    if (!loteAtual) return;
    
    const sucesso = enviarLoteParaFinanceiro(loteAtual.id, 'Gestor Principal');
    if (sucesso) {
      toast.success('Lote enviado para o Financeiro!');
      setShowConfirmEnvio(false);
      // Recarregar dados
      const todosLotes = getLotes();
      setLotes(todosLotes);
      setLoteAtual(null);
    } else {
      toast.error('Erro ao enviar lote');
    }
  };

  const stats = {
    lotesAbertos: lotes.filter(l => l.status === 'Aberto').length,
    lotesEnviados: lotes.filter(l => l.status === 'Enviado').length,
    lotesFinalizados: lotes.filter(l => l.status === 'Finalizado').length,
    totalValorPendente: lotes
      .filter(l => l.status === 'Aberto' || l.status === 'Enviado')
      .reduce((acc, l) => acc + l.totalValor, 0)
  };

  const getStatusBadge = (status: LotePagamento['status']) => {
    switch (status) {
      case 'Aberto':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Aberto</Badge>;
      case 'Enviado':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Enviado</Badge>;
      case 'Finalizado':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Finalizado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <FinanceiroLayout title="Lotes de Pagamento">
      {/* Alerta de Itens Parados */}
      {alertasParados.length > 0 && (
        <Card className="border-orange-500 bg-orange-500/10 mb-6">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <div>
              <p className="font-medium text-orange-700 dark:text-orange-400">
                Atenção: {alertasParados.length} itens estão no lote há mais de 7 dias
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-300">
                Considere enviar o lote para o financeiro para evitar atrasos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Lotes Abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lotesAbertos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.lotesEnviados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Finalizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.lotesFinalizados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalValorPendente)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="atual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="atual">Lote Atual</TabsTrigger>
          <TabsTrigger value="historico">Histórico de Lotes</TabsTrigger>
        </TabsList>

        <TabsContent value="atual">
          {loteAtual ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {loteAtual.id}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aberto em: {format(new Date(loteAtual.dataAbertura), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total do Lote</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(loteAtual.totalValor)}</p>
                  </div>
                  <Button onClick={() => setShowConfirmEnvio(true)} disabled={solicitacoesNoLote.length === 0}>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar para Financeiro
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Solicitação</TableHead>
                      <TableHead>Peça</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Data Aprovação</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitacoesNoLote.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma solicitação no lote atual
                        </TableCell>
                      </TableRow>
                    ) : (
                      solicitacoesNoLote.map((sol) => (
                        <TableRow 
                          key={sol.id}
                          className={alertasParados.includes(sol.id) ? 'bg-orange-500/10' : ''}
                        >
                          <TableCell className="font-mono text-xs">
                            {sol.id}
                            {alertasParados.includes(sol.id) && (
                              <AlertTriangle className="h-4 w-4 text-orange-500 inline ml-2" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{sol.peca}</TableCell>
                          <TableCell className="font-mono text-xs">{sol.osId}</TableCell>
                          <TableCell>{sol.fornecedorId || '-'}</TableCell>
                          <TableCell>
                            {sol.dataSolicitacao ? format(new Date(sol.dataSolicitacao), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(sol.valorPeca || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum lote aberto no momento.</p>
                <p className="text-sm">Um novo lote será criado automaticamente quando houver solicitações aprovadas.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Lotes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Lote</TableHead>
                    <TableHead>Data Abertura</TableHead>
                    <TableHead>Data Envio</TableHead>
                    <TableHead>Qtd. Solicitações</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="font-mono text-xs font-medium">{lote.id}</TableCell>
                      <TableCell>{format(new Date(lote.dataAbertura), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {lote.dataEnvio ? format(new Date(lote.dataEnvio), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>{lote.solicitacoes.length}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(lote.totalValor)}</TableCell>
                      <TableCell>{getStatusBadge(lote.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/financeiro/lote/${lote.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Confirmação de Envio */}
      <Dialog open={showConfirmEnvio} onOpenChange={setShowConfirmEnvio}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Envio do Lote</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Tem certeza que deseja enviar o lote <strong>{loteAtual?.id}</strong> para o Financeiro?
            </p>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Total de solicitações:</span>
                <strong>{solicitacoesNoLote.length}</strong>
              </div>
              <div className="flex justify-between mt-2">
                <span>Valor total:</span>
                <strong className="text-primary">{formatCurrency(loteAtual?.totalValor || 0)}</strong>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmEnvio(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnviarLote}>
              <Send className="h-4 w-4 mr-2" />
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
