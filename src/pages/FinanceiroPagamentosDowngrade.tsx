import React, { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  ArrowDownCircle, Wallet, DollarSign, Eye, Check, Upload, 
  AlertTriangle, Clock, User, Store, Calendar, FileText, History, CheckCircle
} from 'lucide-react';

import { useCadastroStore } from '@/store/cadastroStore';
import { getContasFinanceiras, ContaFinanceira } from '@/utils/cadastrosApi';
import { useFluxoVendas } from '@/hooks/useFluxoVendas';
import { finalizarVendaDowngrade, VendaComFluxo } from '@/utils/fluxoVendasApi';
import { formatarMoeda } from '@/utils/formatUtils';

const formatCurrency = formatarMoeda;

export default function FinanceiroPagamentosDowngrade() {
  const { obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const [contasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  
  // Buscar vendas com status Pagamento Downgrade E finalizadas que eram downgrade
  const { vendas, recarregar } = useFluxoVendas({ 
    status: ['Pagamento Downgrade', 'Finalizado'],
    incluirHistorico: true 
  });
  
  // Separar vendas pendentes e finalizadas
  const vendasPendentes = useMemo(() => {
    return vendas.filter(v => v.statusFluxo === 'Pagamento Downgrade');
  }, [vendas]);
  
  const vendasFinalizadas = useMemo(() => {
    return vendas.filter(v => 
      v.statusFluxo === 'Finalizado' && 
      ((v as any).tipoOperacao === 'Downgrade' || (v as any).saldoDevolver)
    );
  }, [vendas]);
  
  // Filtros
  const [filtroData, setFiltroData] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  
  // Modal de execução
  const [showExecutarModal, setShowExecutarModal] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaComFluxo | null>(null);
  const [contaOrigem, setContaOrigem] = useState('');
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState('');
  
  // Modal de detalhes
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [vendaDetalhes, setVendaDetalhes] = useState<VendaComFluxo | null>(null);
  
  // Usuário logado (mockado)
  const usuarioLogado = {
    id: 'USR-FIN-001',
    nome: 'Financeiro Admin'
  };
  
  // Vendas filtradas (pendentes)
  const vendasFiltradasPendentes = useMemo(() => {
    return vendasPendentes.filter(venda => {
      if (filtroData && !venda.dataHora.startsWith(filtroData)) return false;
      if (filtroLoja && venda.lojaVenda !== filtroLoja) return false;
      if (filtroCliente && !venda.clienteNome.toLowerCase().includes(filtroCliente.toLowerCase())) return false;
      return true;
    });
  }, [vendasPendentes, filtroData, filtroLoja, filtroCliente]);
  
  // Vendas filtradas (histórico)
  const vendasFiltradasHistorico = useMemo(() => {
    return vendasFinalizadas.filter(venda => {
      if (filtroData && !venda.dataHora.startsWith(filtroData)) return false;
      if (filtroLoja && venda.lojaVenda !== filtroLoja) return false;
      if (filtroCliente && !venda.clienteNome.toLowerCase().includes(filtroCliente.toLowerCase())) return false;
      return true;
    });
  }, [vendasFinalizadas, filtroData, filtroLoja, filtroCliente]);
  
  // Totais
  const totais = useMemo(() => {
    const totalPendente = vendasFiltradasPendentes.reduce((acc, v) => acc + (v.saldoDevolver || 0), 0);
    const quantidadePendente = vendasFiltradasPendentes.length;
    const quantidadeFinalizada = vendasFiltradasHistorico.length;
    return { totalPendente, quantidadePendente, quantidadeFinalizada };
  }, [vendasFiltradasPendentes, vendasFiltradasHistorico]);
  
  // Calcular saldo a devolver
  const calcularSaldoDevolver = (venda: VendaComFluxo): number => {
    if (venda.saldoDevolver) return venda.saldoDevolver;
    const totalTradeIn = venda.tradeIns?.reduce((acc, t) => acc + t.valorCompraUsado, 0) || 0;
    const totalProdutos = venda.subtotal || 0;
    return totalTradeIn > totalProdutos ? totalTradeIn - totalProdutos : 0;
  };
  
  // Helper para obter nome da conta com loja
  const getContaNomeCompleto = (contaId: string): string => {
    const conta = contasFinanceiras.find(c => c.id === contaId);
    if (!conta) return 'Não informada';
    const lojaNome = conta.lojaVinculada ? obterNomeLoja(conta.lojaVinculada) : '';
    return lojaNome ? `${lojaNome} - ${conta.nome}` : conta.nome;
  };
  
  // Abrir modal de execução
  const handleAbrirExecutar = (venda: VendaComFluxo) => {
    setVendaSelecionada(venda);
    setContaOrigem('');
    setComprovante(null);
    setObservacoes('');
    setShowExecutarModal(true);
  };
  
  // Abrir modal de detalhes
  const handleAbrirDetalhes = (venda: VendaComFluxo) => {
    setVendaDetalhes(venda);
    setShowDetalhesModal(true);
  };
  
  // Executar pagamento PIX
  const handleExecutarPIX = () => {
    if (!vendaSelecionada) return;
    
    if (!contaOrigem) {
      toast({
        title: "Erro",
        description: "Selecione a conta de origem do pagamento",
        variant: "destructive"
      });
      return;
    }
    
    // Finalizar venda downgrade
    const resultado = finalizarVendaDowngrade(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome,
      contaOrigem,
      observacoes
    );
    
    if (resultado) {
      toast({
        title: "PIX executado com sucesso!",
        description: `Pagamento de ${formatCurrency(calcularSaldoDevolver(vendaSelecionada))} realizado. Produto migrado para Estoque Pendente.`
      });
      setShowExecutarModal(false);
      recarregar();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível executar o pagamento",
        variant: "destructive"
      });
    }
  };
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setComprovante(e.target.files[0]);
    }
  };
  
  // Visualizar anexo
  const handleVisualizarAnexo = () => {
    if (comprovante) {
      const url = URL.createObjectURL(comprovante);
      window.open(url, '_blank');
    }
  };

  // Render tabela de vendas
  const renderTabelaVendas = (listaVendas: VendaComFluxo[], isHistorico: boolean = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID Venda</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Loja</TableHead>
          <TableHead>Vendedor</TableHead>
          <TableHead className="text-right">Valor Produtos</TableHead>
          <TableHead className="text-right">Valor Trade-In</TableHead>
          <TableHead className="text-right">PIX {isHistorico ? 'Devolvido' : 'a Devolver'}</TableHead>
          {isHistorico && <TableHead>Conta Utilizada</TableHead>}
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listaVendas.map(venda => {
          const saldoDevolver = calcularSaldoDevolver(venda);
          const totalTradeIn = venda.tradeIns?.reduce((acc, t) => acc + t.valorCompraUsado, 0) || 0;
          const contaUsada = (venda as any).contaOrigemDowngrade;
          
          return (
            <TableRow 
              key={venda.id} 
              className={isHistorico ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{venda.id}</span>
                  <Badge variant={isHistorico ? 'default' : 'destructive'} className="text-xs">
                    {isHistorico ? 'FINALIZADO' : 'DOWNGRADE'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>{format(new Date(venda.dataHora), 'dd/MM/yyyy HH:mm')}</TableCell>
              <TableCell className="font-medium">{venda.clienteNome}</TableCell>
              <TableCell>{obterNomeLoja(venda.lojaVenda)}</TableCell>
              <TableCell>{obterNomeColaborador(venda.vendedor)}</TableCell>
              <TableCell className="text-right">{formatCurrency(venda.subtotal || 0)}</TableCell>
              <TableCell className="text-right text-green-600">
                {formatCurrency(totalTradeIn)}
              </TableCell>
              <TableCell className="text-right">
                <span className={`font-bold text-lg ${isHistorico ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(saldoDevolver)}
                </span>
              </TableCell>
              {isHistorico && (
                <TableCell>
                  <span className="text-sm">{getContaNomeCompleto(contaUsada || '')}</span>
                </TableCell>
              )}
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleAbrirDetalhes(venda)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!isHistorico && (
                    <Button 
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => handleAbrirExecutar(venda)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Executar PIX
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <FinanceiroLayout title="Pagamentos Downgrade">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <ArrowDownCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{totais.quantidadePendente}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total a Devolver</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totais.totalPendente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Finalizados</p>
                <p className="text-2xl font-bold text-green-600">{totais.quantidadeFinalizada}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contas Disponíveis</p>
                <p className="text-2xl font-bold">{contasFinanceiras.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Loja</label>
              <Select value={filtroLoja || 'all'} onValueChange={(v) => setFiltroLoja(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Cliente</label>
              <Input
                placeholder="Buscar por nome..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFiltroData('');
                  setFiltroLoja('');
                  setFiltroCliente('');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs: Pendentes e Histórico */}
      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendentes" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendentes ({vendasFiltradasPendentes.length})
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico ({vendasFiltradasHistorico.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5" />
                Vendas Aguardando Pagamento Downgrade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendasFiltradasPendentes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowDownCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma venda aguardando pagamento downgrade</p>
                </div>
              ) : (
                renderTabelaVendas(vendasFiltradasPendentes, false)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Pagamentos Downgrade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendasFiltradasHistorico.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum pagamento downgrade finalizado</p>
                </div>
              ) : (
                renderTabelaVendas(vendasFiltradasHistorico, true)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modal Executar PIX */}
      <Dialog open={showExecutarModal} onOpenChange={setShowExecutarModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-600" />
              Executar Pagamento PIX - Downgrade
            </DialogTitle>
          </DialogHeader>
          
          {vendaSelecionada && (
            <div className="space-y-4">
              {/* Resumo da venda */}
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-700 dark:text-red-300">
                    Venda #{vendaSelecionada.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium">{vendaSelecionada.clienteNome}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor a Devolver</p>
                    <p className="font-bold text-red-600 text-xl">
                      {formatCurrency(calcularSaldoDevolver(vendaSelecionada))}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Trade-ins que serão migrados para estoque */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium mb-2">Aparelhos a serem migrados para Estoque Pendente:</p>
                {vendaSelecionada.tradeIns?.map((trade, idx) => (
                  <div key={idx} className="text-sm flex justify-between">
                    <span>{trade.modelo}</span>
                    <span className="font-mono">{trade.imei}</span>
                  </div>
                ))}
              </div>
              
              {/* Conta de Origem - com Loja + Nome */}
              <div>
                <label className="text-sm font-medium">Conta de Origem *</label>
                <Select value={contaOrigem} onValueChange={setContaOrigem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta para débito" />
                  </SelectTrigger>
                  <SelectContent>
                    {contasFinanceiras.map(conta => {
                      const lojaNome = conta.lojaVinculada ? obterNomeLoja(conta.lojaVinculada) : '';
                      const nomeDisplay = lojaNome ? `${lojaNome} - ${conta.nome}` : conta.nome;
                      return (
                        <SelectItem key={conta.id} value={conta.id}>
                          {nomeDisplay} ({formatCurrency(conta.saldoAtual)})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Chave PIX do cliente */}
              {(vendaSelecionada as any).chavePix && (
                <div className="p-3 bg-muted rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Chave PIX do Cliente (registrado na venda)</p>
                  <p className="font-mono font-bold text-lg">{(vendaSelecionada as any).chavePix}</p>
                </div>
              )}
              
              {/* Comprovante */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Anexar Comprovante
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                </div>
                {comprovante && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="whitespace-nowrap">
                      <Upload className="h-3 w-3 mr-1" />
                      {comprovante.name}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleVisualizarAnexo}
                      className="h-8"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Observações */}
              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações sobre o pagamento..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecutarModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleExecutarPIX}
              className="bg-red-600 hover:bg-red-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal Detalhes */}
      <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda Downgrade</DialogTitle>
          </DialogHeader>
          
          {vendaDetalhes && (
            <div className="space-y-4">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">ID da Venda</p>
                    <p className="font-medium">{vendaDetalhes.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="font-medium">{format(new Date(vendaDetalhes.dataHora), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{vendaDetalhes.clienteNome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Loja</p>
                    <p className="font-medium">{obterNomeLoja(vendaDetalhes.lojaVenda)}</p>
                  </div>
                </div>
              </div>
              
              {/* Produtos vendidos */}
              <div>
                <h4 className="font-medium mb-2">Produtos Vendidos</h4>
                <div className="bg-muted rounded-lg p-3">
                  {vendaDetalhes.itens?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <span>{item.produto}</span>
                      <span>{formatCurrency(item.valorVenda)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium pt-2 border-t mt-2">
                    <span>Total Produtos</span>
                    <span>{formatCurrency(vendaDetalhes.subtotal || 0)}</span>
                  </div>
                </div>
              </div>
              
              {/* Trade-ins */}
              <div>
                <h4 className="font-medium mb-2">Aparelhos Recebidos (Base de Troca)</h4>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  {vendaDetalhes.tradeIns?.map((trade, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <div>
                        <span className="font-medium">{trade.modelo}</span>
                        <span className="text-muted-foreground ml-2">IMEI: {trade.imei}</span>
                      </div>
                      <span className="text-green-600">{formatCurrency(trade.valorCompraUsado)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium pt-2 border-t mt-2 text-green-600">
                    <span>Total Trade-In</span>
                    <span>
                      {formatCurrency(vendaDetalhes.tradeIns?.reduce((acc, t) => acc + t.valorCompraUsado, 0) || 0)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Saldo a devolver */}
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-red-700 dark:text-red-300">PIX a Devolver</span>
                  <span className="text-2xl font-bold text-red-600">
                    {formatCurrency(calcularSaldoDevolver(vendaDetalhes))}
                  </span>
                </div>
              </div>
              
              {/* Timeline */}
              {vendaDetalhes.timelineFluxo && vendaDetalhes.timelineFluxo.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Histórico</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {vendaDetalhes.timelineFluxo.map((evento, idx) => (
                      <div key={idx} className="text-sm p-2 bg-muted rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{evento.usuarioNome}</span>
                          <span className="text-muted-foreground">
                            {format(new Date(evento.dataHora), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{evento.descricao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetalhesModal(false)}>
              Fechar
            </Button>
            {vendaDetalhes && vendaDetalhes.statusFluxo === 'Pagamento Downgrade' && (
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setShowDetalhesModal(false);
                  handleAbrirExecutar(vendaDetalhes);
                }}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Executar PIX
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
