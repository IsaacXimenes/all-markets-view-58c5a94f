import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssistenciaLayout } from '@/components/layout/AssistenciaLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Eye, DollarSign, CreditCard, FileText, Clock, Check, X, Package, AlertTriangle, Layers } from 'lucide-react';
import { getOrdensServico, updateOrdemServico, OrdemServico, formatCurrency } from '@/utils/assistenciaApi';
import { getClientes } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { formatIMEI } from '@/utils/imeiMask';
import { useUrlTabs } from '@/hooks/useUrlTabs';
import { PagamentoQuadro } from '@/components/vendas/PagamentoQuadro';
import { Pagamento } from '@/utils/vendasApi';
import { 
  getSolicitacoes, aprovarSolicitacao, rejeitarSolicitacao,
  calcularSLASolicitacao, formatCurrency as formatCurrencySol,
  SolicitacaoPeca
} from '@/utils/solicitacaoPecasApi';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function OSAreaGestor() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useUrlTabs('tratativas');
  const [ordensServico, setOrdensServico] = useState(getOrdensServico());
  const [solicitacoes, setSolicitacoes] = useState(getSolicitacoes());
  const clientes = getClientes();
  const { obterNomeLoja, obterNomeColaborador } = useCadastroStore();

  // Modal de pagamento
  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [osSelecionada, setOsSelecionada] = useState<OrdemServico | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  // Solicitações pendentes
  const solicitacoesPendentes = useMemo(() => {
    return solicitacoes
      .filter(s => s.status === 'Pendente')
      .sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());
  }, [solicitacoes]);

  // Filtrar OS concluídas
  const osConcluidas = useMemo(() => {
    return ordensServico
      .filter(os => os.status === 'Serviço concluído')
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [ordensServico]);

  const getClienteNome = (clienteId: string) => {
    return clientes.find(c => c.id === clienteId)?.nome || '-';
  };

  const getIMEI = (os: OrdemServico) => {
    if (os.imeiAparelho) return formatIMEI(os.imeiAparelho);
    const pecaComIMEI = os.pecas.find(p => p.imei);
    return pecaComIMEI?.imei ? formatIMEI(pecaComIMEI.imei) : '-';
  };

  const handleAbrirPagamento = (os: OrdemServico) => {
    setOsSelecionada(os);
    setPagamentos(os.pagamentos?.map(p => ({
      id: p.id,
      meioPagamento: p.meio || (p as any).meioPagamento || '',
      valor: p.valor,
      contaDestino: (p as any).contaDestino || '',
      parcelas: p.parcelas,
      taxaCartao: (p as any).taxaCartao || 0,
    })) || []);
    setPagamentoOpen(true);
  };

  const handleConfirmarPagamento = () => {
    if (!osSelecionada) return;
    if (pagamentos.length === 0) {
      toast.error('Adicione ao menos um pagamento');
      return;
    }

    const totalPagamentos = pagamentos.reduce((acc, p) => acc + p.valor, 0);

    // Atualizar OS com pagamentos e status
    updateOrdemServico(osSelecionada.id, {
      pagamentos: pagamentos.map(p => ({
        id: p.id,
        meio: p.meioPagamento,
        valor: p.valor,
        parcelas: p.parcelas,
      })),
      status: 'Pagamento - Financeiro',
      valorTotal: totalPagamentos,
      timeline: [
        ...osSelecionada.timeline,
        {
          data: new Date().toISOString(),
          tipo: 'pagamento' as const,
          descricao: `Pagamento registrado pelo gestor - ${formatCurrency(totalPagamentos)}`,
          responsavel: 'Gestor'
        },
        {
          data: new Date().toISOString(),
          tipo: 'status' as const,
          descricao: 'Status alterado para Pagamento - Financeiro',
          responsavel: 'Gestor'
        }
      ]
    });

    // Refresh data
    setOrdensServico(getOrdensServico());
    setPagamentoOpen(false);
    setOsSelecionada(null);
    setPagamentos([]);
    toast.success('Pagamento registrado! OS encaminhada para conferência financeira.');
  };

  // Stats
  const totalConcluidas = osConcluidas.length;
  const valorTotalConcluidas = osConcluidas.reduce((acc, os) => acc + os.valorTotal, 0);

  return (
    <AssistenciaLayout title="Área do Gestor">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tratativas">Tratativas</TabsTrigger>
          <TabsTrigger value="aprovacoes">Aprovações de Solicitações</TabsTrigger>
        </TabsList>

        {/* Sub-aba Tratativas */}
        <TabsContent value="tratativas" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <FileText className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">OS Concluídas</p>
                    <p className="text-2xl font-bold text-green-600">{totalConcluidas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-xl font-bold">{formatCurrency(valorTotalConcluidas)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aguardando Pagamento</p>
                    <p className="text-2xl font-bold text-yellow-600">{totalConcluidas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de OS Concluídas */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OS</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {osConcluidas.map(os => (
                  <TableRow key={os.id}>
                    <TableCell className="font-mono text-xs font-medium">{os.id}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(os.dataHora), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{getClienteNome(os.clienteId)}</TableCell>
                    <TableCell>{os.modeloAparelho || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{getIMEI(os)}</TableCell>
                    <TableCell className="text-xs">{obterNomeLoja(os.lojaId)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(os.valorTotal)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          title="Detalhes"
                          onClick={() => navigate(`/os/assistencia/${os.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          title="Registrar Pagamento"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleAbrirPagamento(os)}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {osConcluidas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma OS concluída aguardando pagamento
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Sub-aba Aprovações */}
        <TabsContent value="aprovacoes" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-600">{solicitacoesPendentes.length}</p>
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
                    <p className="text-sm text-muted-foreground">Total Solicitações</p>
                    <p className="text-2xl font-bold">{solicitacoes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Peça</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoesPendentes.map(sol => {
                  const dias = calcularSLASolicitacao(sol.dataSolicitacao);
                  return (
                    <TableRow key={sol.id}>
                      <TableCell className="font-mono text-xs">{sol.id}</TableCell>
                      <TableCell className="font-mono text-xs">{sol.osId}</TableCell>
                      <TableCell className="font-medium">{sol.peca}</TableCell>
                      <TableCell>{sol.quantidade}</TableCell>
                      <TableCell className="text-xs">{obterNomeLoja(sol.lojaSolicitante)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 ${
                          dias >= 7 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          dias >= 4 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                          {dias} dias
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Ver detalhes completos"
                            onClick={() => navigate('/os/solicitacoes-pecas')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {solicitacoesPendentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma solicitação pendente de aprovação
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/os/solicitacoes-pecas')}>
              <Layers className="h-4 w-4 mr-2" />
              Ver Todas as Solicitações e Lotes
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Registrar Pagamento */}
      <Dialog open={pagamentoOpen} onOpenChange={setPagamentoOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Registrar Pagamento - {osSelecionada?.id}
            </DialogTitle>
          </DialogHeader>

          {osSelecionada && (
            <div className="space-y-6">
              {/* Resumo da OS */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resumo da OS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>
                      <p className="font-medium">{getClienteNome(osSelecionada.clienteId)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Modelo:</span>
                      <p className="font-medium">{osSelecionada.modeloAparelho || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IMEI:</span>
                      <p className="font-mono text-xs">{getIMEI(osSelecionada)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Loja:</span>
                      <p className="font-medium">{obterNomeLoja(osSelecionada.lojaId)}</p>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Peças/Serviços */}
                  <div>
                    <span className="text-muted-foreground font-medium">Peças / Serviços:</span>
                    <div className="mt-1 space-y-1">
                      {osSelecionada.pecas.map(p => (
                        <div key={p.id} className="flex justify-between text-xs">
                          <span>{p.peca}</span>
                          <span className="font-medium">{formatCurrency(p.valorTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(osSelecionada.pecas.reduce((acc, p) => acc + p.valorTotal, 0))}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quadro de Pagamentos */}
              <PagamentoQuadro
                valorTotalProdutos={osSelecionada.pecas.reduce((acc, p) => acc + p.valorTotal, 0)}
                custoTotalProdutos={osSelecionada.custoTotal}
                lojaVendaId={osSelecionada.lojaId}
                onPagamentosChange={setPagamentos}
                pagamentosIniciais={pagamentos}
                ocultarCards={true}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPagamentoOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarPagamento}>
              <DollarSign className="h-4 w-4 mr-2" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AssistenciaLayout>
  );
}
