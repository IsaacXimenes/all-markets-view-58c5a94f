import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Printer, ShoppingCart, User, Package, CreditCard, Truck, Clock, DollarSign, TrendingUp, AlertTriangle, Shield, History, Pencil, Wrench, FileText, Image, Download, Check, X } from 'lucide-react';
import { aprovarLancamento } from '@/utils/fluxoVendasApi';
import { gerarNotaGarantiaPdf } from '@/utils/gerarNotaGarantiaPdf';
import { getVendaById, formatCurrency, Venda, ItemTradeIn, AnexoTradeIn } from '@/utils/vendasApi';
import { getContasFinanceiras } from '@/utils/cadastrosApi';
import { ComprovantePreview, ComprovanteBadgeSemAnexo } from '@/components/vendas/ComprovantePreview';
import { useCadastroStore } from '@/store/cadastroStore';
import { getGarantiasByVendaId, calcularStatusExpiracao } from '@/utils/garantiasApi';
import { calcularComissaoVenda, getComissaoColaborador } from '@/utils/comissoesApi';
import { format, addMonths } from 'date-fns';
import QRCode from 'qrcode';
import { toast } from 'sonner';

export default function VendaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const modoConferencia = (location.state as any)?.modoConferencia === true;
  const { obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // Estado para modal de anexos do Trade-In
  const [anexosModal, setAnexosModal] = useState<{
    open: boolean;
    tipo: 'termo' | 'fotos';
    tradeIn: ItemTradeIn | null;
  }>({ open: false, tipo: 'fotos', tradeIn: null });
  const [fotoSelecionadaIndex, setFotoSelecionadaIndex] = useState(0);
  
  const contasFinanceiras = getContasFinanceiras();

  useEffect(() => {
    if (id) {
      const vendaData = getVendaById(id);
      setVenda(vendaData);
      
      if (vendaData) {
        generateQRCode(vendaData);
      }
    }
  }, [id]);

  const generateQRCode = async (vendaData: Venda) => {
    const qrData = JSON.stringify({
      id: vendaData.id,
      valor: vendaData.total,
      cliente: vendaData.clienteNome,
      data: vendaData.dataHora
    });
    
    try {
      const url = await QRCode.toDataURL(qrData);
      setQrCodeUrl(url);
    } catch (err) {
      console.error(err);
    }
  };

  const getColaboradorNome = (colId: string) => obterNomeColaborador(colId);
  const getLojaNome = (lojaId: string) => obterNomeLoja(lojaId);

  const getContaNome = (id: string) => {
    const conta = contasFinanceiras.find(c => c.id === id);
    return conta?.nome || id;
  };

  // Cálculos corretos
  const calcularTotais = (venda: Venda) => {
    const valorCusto = venda.itens.reduce((acc, item) => acc + item.valorCusto * item.quantidade, 0);
    const valorRecomendado = venda.itens.reduce((acc, item) => acc + item.valorRecomendado * item.quantidade, 0);
    const valorVenda = venda.total;
    const lucro = valorVenda - valorCusto;
    const margem = valorCusto > 0 ? ((lucro / valorCusto) * 100) : 0;
    
    return { valorCusto, valorRecomendado, valorVenda, lucro, margem };
  };

  const handleImprimir = () => {
    window.print();
  };

  if (!venda) {
    return (
      <PageLayout title="Venda não encontrada">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">A venda solicitada não foi encontrada.</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </PageLayout>
    );
  }

  const totais = calcularTotais(venda);
  const isPrejuizo = totais.lucro < 0;

  // Check if sale is Fiado
  const isFiadoVenda = venda.pagamentos.some(p => p.isFiado === true);

  return (
    <PageLayout title={`Detalhes da Venda ${venda.id}`}>
      {/* Botões de ação */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          {modoConferencia && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-sm px-3 py-1">
              Modo Conferência
            </Badge>
          )}
          {!modoConferencia && isFiadoVenda ? (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-sm px-3 py-1">
              <CreditCard className="h-4 w-4 mr-1" />
              Fiado
            </Badge>
          ) : !modoConferencia ? (
            <Badge variant="outline" className="text-sm px-3 py-1">
              Normal
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {modoConferencia && (
            <>
              <Button 
                variant="outline" 
                onClick={() => navigate(-1)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  const resultado = aprovarLancamento(
                    venda.id,
                    'COL-007',
                    'Carlos Lançador'
                  );
                  if (resultado) {
                    toast.success(`Lançamento da venda ${venda.id} aprovado! Enviado para Conferência do Gestor.`);
                    navigate(-1);
                  } else {
                    toast.error('Erro ao aprovar lançamento.');
                  }
                }}
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar Conferência
              </Button>
            </>
          )}
          {!modoConferencia && (
            <>
              <Button variant="outline" onClick={() => gerarNotaGarantiaPdf(venda)}>
                <FileText className="h-4 w-4 mr-2" />
                Gerar Nota de Garantia
              </Button>
              <Button onClick={handleImprimir}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Recibo
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline da Venda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline da Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data/Hora Registro</p>
                    <p className="font-medium">{new Date(venda.dataHora).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendedor</p>
                    <p className="font-medium">{getColaboradorNome(venda.vendedor)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Loja</p>
                    <p className="font-medium">{getLojaNome(venda.lojaVenda)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{venda.clienteNome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-medium">{venda.clienteCpf}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{venda.clienteTelefone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  <p className="font-medium">{venda.clienteEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cidade</p>
                  <p className="font-medium">{venda.clienteCidade}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Origem da Venda</p>
                  <Badge variant="outline">{venda.origemVenda}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Produtos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produtos ({venda.itens.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Recomendado</TableHead>
                    <TableHead className="text-right">Vendido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venda.itens.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.produto}</p>
                          <p className="text-sm text-muted-foreground">{item.categoria}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.imei}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorCusto)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(item.valorRecomendado)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.valorVenda)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Base de Troca */}
          {venda.tradeIns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Base de Troca ({venda.tradeIns.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Status Entrega</TableHead>
                      <TableHead>Anexos</TableHead>
                      <TableHead className="text-right">Valor de Compra Usado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venda.tradeIns.map(trade => (
                      <TableRow key={trade.id}>
                        <TableCell className="font-medium">{trade.modelo}</TableCell>
                        <TableCell className="text-muted-foreground">{trade.descricao}</TableCell>
                        <TableCell className="font-mono text-sm">{trade.imei}</TableCell>
                        <TableCell>
                          {trade.tipoEntrega === 'Com o Cliente' ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Com o Cliente
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <Check className="h-3 w-3 mr-1" />
                              Entregue no Ato
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {trade.tipoEntrega === 'Com o Cliente' ? (
                            <div className="flex items-center gap-2">
                              {trade.termoResponsabilidade && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8"
                                  onClick={() => setAnexosModal({ open: true, tipo: 'termo', tradeIn: trade })}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Termo
                                </Button>
                              )}
                              {trade.fotosAparelho && trade.fotosAparelho.length > 0 && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    setFotoSelecionadaIndex(0);
                                    setAnexosModal({ open: true, tipo: 'fotos', tradeIn: trade });
                                  }}
                                >
                                  <Image className="h-4 w-4 mr-1" />
                                  {trade.fotosAparelho.length} Foto(s)
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">-{formatCurrency(trade.valorCompraUsado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Pagamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pagamentos ({venda.pagamentos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meio de Pagamento</TableHead>
                    <TableHead>Conta de Destino</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Comprovante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venda.pagamentos.map(pag => (
                    <TableRow key={pag.id}>
                      <TableCell className="font-medium">{pag.meioPagamento}</TableCell>
                      <TableCell>{getContaNome(pag.contaDestino)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(pag.valor)}</TableCell>
                      <TableCell>
                        {pag.comprovante 
                          ? <ComprovantePreview comprovante={pag.comprovante} comprovanteNome={pag.comprovanteNome} />
                          : <ComprovanteBadgeSemAnexo />
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Logística */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Logística
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Retirada</p>
                  <Badge>{venda.tipoRetirada}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Local de Retirada</p>
                  <p className="font-medium">{getLojaNome(venda.localRetirada)}</p>
                </div>
                {venda.taxaEntrega > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Entrega</p>
                    <p className="font-medium">{formatCurrency(venda.taxaEntrega)}</p>
                  </div>
                )}
              </div>
              {venda.observacoes && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{venda.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Garantia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Garantia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {venda.itens.map(item => {
                  const garantias = getGarantiasByVendaId(venda.id);
                  const garantiaItem = garantias.find(g => g.imei === item.imei);
                  
                  // Se não tem garantia registrada, calcular baseado na venda
                  const dataVenda = new Date(venda.dataHora);
                  const tipoGarantia = garantiaItem?.tipoGarantia || 'Garantia - Apple';
                  const dataFimGarantia = garantiaItem?.dataFimGarantia || format(addMonths(dataVenda, 12), 'yyyy-MM-dd');
                  const statusExp = calcularStatusExpiracao(dataFimGarantia);
                  
                  const getBadgeClass = () => {
                    switch (statusExp.status) {
                      case 'expirada':
                        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                      case 'urgente':
                        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
                      case 'atencao':
                        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
                      default:
                        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                    }
                  };
                  
                  return (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{item.produto}</p>
                        <p className="text-sm text-muted-foreground">IMEI: {item.imei}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant="outline" className={getBadgeClass()}>
                          {tipoGarantia}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          Válida até: {format(new Date(dataFimGarantia), 'dd/MM/yyyy')}
                        </p>
                        {statusExp.status !== 'ativa' && (
                          <p className={`text-xs ${
                            statusExp.status === 'expirada' ? 'text-red-600' :
                            statusExp.status === 'urgente' ? 'text-orange-600' :
                            'text-yellow-600'
                          }`}>
                            {statusExp.mensagem}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <Button 
                onClick={() => navigate(`/garantias/nova?vendaId=${venda.id}`)} 
                className="w-full mt-4 gap-2"
              >
                <Shield className="h-4 w-4" />
                Acionar Garantia
              </Button>
            </CardContent>
          </Card>

          {/* Timeline Completa */}
          {venda.timeline && venda.timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Timeline Completa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {venda.timeline.map((evento) => {
                    const getIconeETema = () => {
                      switch (evento.tipo) {
                        case 'criacao':
                          return { 
                            icon: <ShoppingCart className="h-4 w-4" />, 
                            bgColor: 'bg-green-500/10', 
                            textColor: 'text-green-600',
                            borderColor: 'border-green-500'
                          };
                        case 'edicao':
                          return { 
                            icon: <Pencil className="h-4 w-4" />, 
                            bgColor: 'bg-blue-500/10', 
                            textColor: 'text-blue-600',
                            borderColor: 'border-blue-500'
                          };
                        case 'aprovacao_lancamento':
                          return { 
                            icon: <Clock className="h-4 w-4" />, 
                            bgColor: 'bg-blue-500/10', 
                            textColor: 'text-blue-600',
                            borderColor: 'border-blue-500'
                          };
                        case 'recusa_gestor':
                          return { 
                            icon: <AlertTriangle className="h-4 w-4" />, 
                            bgColor: 'bg-red-500/10', 
                            textColor: 'text-red-600',
                            borderColor: 'border-red-500'
                          };
                        case 'aprovacao_gestor':
                          return { 
                            icon: <Shield className="h-4 w-4" />, 
                            bgColor: 'bg-blue-500/10', 
                            textColor: 'text-blue-600',
                            borderColor: 'border-blue-500'
                          };
                        case 'devolucao_financeiro':
                          return { 
                            icon: <AlertTriangle className="h-4 w-4" />, 
                            bgColor: 'bg-orange-500/10', 
                            textColor: 'text-orange-600',
                            borderColor: 'border-orange-500'
                          };
                        case 'aprovacao_financeiro':
                        case 'finalizacao':
                          return { 
                            icon: <DollarSign className="h-4 w-4" />, 
                            bgColor: 'bg-emerald-500/10', 
                            textColor: 'text-emerald-600',
                            borderColor: 'border-emerald-500'
                          };
                        default:
                          return { 
                            icon: <Clock className="h-4 w-4" />, 
                            bgColor: 'bg-muted', 
                            textColor: 'text-muted-foreground',
                            borderColor: 'border-muted'
                          };
                      }
                    };

                    const tema = getIconeETema();

                    return (
                      <div key={evento.id} className={`border-l-2 ${tema.borderColor} pl-4 pb-4`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-8 w-8 rounded-full ${tema.bgColor} flex items-center justify-center ${tema.textColor}`}>
                            {tema.icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(evento.dataHora), 'dd/MM/yyyy HH:mm')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {evento.usuarioNome}
                            </p>
                          </div>
                        </div>
                        <div className="ml-10 space-y-2">
                          <p className={`text-sm font-medium ${tema.textColor}`}>
                            {evento.descricao}
                          </p>
                          
                          {/* Mostrar alterações se houver */}
                          {evento.alteracoes && evento.alteracoes.length > 0 && (
                            <div className="space-y-1 mt-2">
                              {evento.alteracoes.map((alt, idx) => (
                                <div key={idx} className="bg-muted/50 rounded-lg p-2 text-sm">
                                  <span className="font-medium">{alt.campo}:</span>{' '}
                                  <span className="text-red-500 line-through">
                                    {typeof alt.valorAnterior === 'number' 
                                      ? formatCurrency(alt.valorAnterior) 
                                      : String(alt.valorAnterior)}
                                  </span>
                                  {' → '}
                                  <span className="text-green-600 font-medium">
                                    {typeof alt.valorNovo === 'number' 
                                      ? formatCurrency(alt.valorNovo) 
                                      : String(alt.valorNovo)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Mostrar motivo se houver */}
                          {evento.motivo && (
                            <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded-lg text-sm">
                              <span className="font-medium text-red-600">Motivo:</span>{' '}
                              <span className="text-red-700 dark:text-red-400">{evento.motivo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline de Edições (legado) */}
          {venda.timelineEdicoes && venda.timelineEdicoes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5" />
                  Edições do Gestor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {venda.timelineEdicoes.map((edicao) => (
                    <div key={edicao.id} className="border-l-2 border-primary pl-4 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Pencil className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(edicao.dataHora), 'dd/MM/yyyy HH:mm')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Gestor: {edicao.usuarioNome}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 ml-10">
                        {edicao.alteracoes.map((alt, idx) => (
                          <div key={idx} className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm font-medium text-primary mb-1">
                              {alt.campo}
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-red-500 line-through">
                                {typeof alt.valorAnterior === 'number' 
                                  ? formatCurrency(alt.valorAnterior) 
                                  : String(alt.valorAnterior)}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-green-600 font-medium">
                                {typeof alt.valorNovo === 'number' 
                                  ? formatCurrency(alt.valorNovo) 
                                  : String(alt.valorNovo)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {edicao.descricao && (
                          <p className="text-xs text-muted-foreground italic mt-2">
                            {edicao.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna Lateral - Resumo Financeiro */}
        <div className="space-y-6">
          {/* Resumo Financeiro */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor de Custo:</span>
                  <span className="font-medium">{formatCurrency(totais.valorCusto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Recomendado:</span>
                  <span className="font-medium">{formatCurrency(totais.valorRecomendado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal Produtos:</span>
                  <span className="font-medium">{formatCurrency(venda.subtotal)}</span>
                </div>
                {venda.totalTradeIn > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>(-) Base de Troca:</span>
                    <span className="font-medium">-{formatCurrency(venda.totalTradeIn)}</span>
                  </div>
                )}
                {venda.taxaEntrega > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">(+) Taxa de Entrega:</span>
                    <span className="font-medium">{formatCurrency(venda.taxaEntrega)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Valor de Venda:</span>
                  <span className="font-bold">{formatCurrency(totais.valorVenda)}</span>
                </div>
                <Separator />
                <div className={`flex justify-between ${isPrejuizo ? 'bg-destructive/10 p-2 rounded-lg' : ''}`}>
                  <span className={isPrejuizo ? 'text-destructive font-medium' : 'text-blue-600'}>
                    {isPrejuizo && <AlertTriangle className="h-4 w-4 inline mr-1" />}
                    Lucro:
                  </span>
                  <span className={`font-medium ${isPrejuizo ? 'text-destructive' : 'text-blue-600'}`}>
                    {formatCurrency(totais.lucro)}
                  </span>
                </div>
                <div className={`flex justify-between ${isPrejuizo ? 'bg-destructive/10 p-2 rounded-lg' : ''}`}>
                  <span className={isPrejuizo ? 'text-destructive font-medium' : 'text-blue-600'}>
                    Margem %:
                  </span>
                  <span className={`font-medium ${isPrejuizo ? 'text-destructive' : 'text-blue-600'}`}>
                    {totais.margem.toFixed(2)}%
                  </span>
                </div>
                {isPrejuizo && (
                  <div className="bg-destructive/10 p-3 rounded-lg flex items-center gap-2 text-destructive mt-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium text-sm">Venda com prejuízo</span>
                  </div>
                )}
                
                {/* Comissão do Vendedor */}
                {totais.lucro > 0 && (
                  <div className="bg-orange-100 dark:bg-orange-950/30 p-3 rounded-lg mt-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-orange-600 font-medium">Comissão do Vendedor</span>
                        <p className="text-xs text-muted-foreground">
                          ({getComissaoColaborador(venda.vendedor).comissao}% do lucro)
                        </p>
                      </div>
                      <span className="font-bold text-orange-600">
                        {formatCurrency(venda.comissaoVendedor || calcularComissaoVenda(venda.vendedor, totais.lucro))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status da Venda</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge 
                variant={venda.status === 'Concluída' ? 'default' : venda.status === 'Cancelada' ? 'destructive' : 'secondary'}
                className="text-lg px-4 py-2"
              >
                {venda.status}
              </Badge>
            </CardContent>
          </Card>

          {/* QR Code para Recibo */}
          <Card className="print:block">
            <CardHeader>
              <CardTitle>Recibo Digital</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {qrCodeUrl && (
                <div>
                  <img src={qrCodeUrl} alt="QR Code" className="mx-auto w-40 h-40" />
                  <p className="text-xs text-muted-foreground mt-2">Escaneie para verificar</p>
                </div>
              )}
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Thiago Imports</p>
                <p>CNPJ: 12.345.678/0001-01</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Área de impressão oculta */}
      <div className="hidden print:block mt-8">
        <div className="text-center border-b pb-4 mb-4">
          <h2 className="text-2xl font-bold">Thiago Imports</h2>
          <p className="text-sm">CNPJ: 12.345.678/0001-01</p>
        </div>
        <div className="space-y-2 text-sm">
          <p><strong>Venda:</strong> {venda.id}</p>
          <p><strong>Data:</strong> {new Date(venda.dataHora).toLocaleString('pt-BR')}</p>
          <p><strong>Cliente:</strong> {venda.clienteNome} - CPF: {venda.clienteCpf}</p>
          <p><strong>Vendedor:</strong> {getColaboradorNome(venda.vendedor)}</p>
          <p><strong>Loja:</strong> {getLojaNome(venda.lojaVenda)}</p>
        </div>
        <div className="my-4 border-t border-b py-2">
          <p className="font-bold">Itens:</p>
          {venda.itens.map(item => (
            <div key={item.id} className="flex justify-between">
              <span>{item.produto}</span>
              <span>{formatCurrency(item.valorVenda)}</span>
            </div>
          ))}
        </div>
        <div className="text-right">
          <p><strong>Total:</strong> {formatCurrency(venda.total)}</p>
        </div>
      </div>

      {/* Modal de Visualização de Anexos do Trade-In */}
      <Dialog 
        open={anexosModal.open} 
        onOpenChange={(open) => setAnexosModal(prev => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {anexosModal.tipo === 'termo' ? (
                <>
                  <FileText className="h-5 w-5" />
                  Termo de Responsabilidade
                </>
              ) : (
                <>
                  <Image className="h-5 w-5" />
                  Fotos do Aparelho ({anexosModal.tradeIn?.fotosAparelho?.length || 0})
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {anexosModal.tipo === 'termo' && anexosModal.tradeIn?.termoResponsabilidade && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{anexosModal.tradeIn.termoResponsabilidade.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {(anexosModal.tradeIn.termoResponsabilidade.tamanho / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = anexosModal.tradeIn!.termoResponsabilidade!.dataUrl;
                      link.download = anexosModal.tradeIn!.termoResponsabilidade!.nome;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                </div>
                
                {anexosModal.tradeIn.termoResponsabilidade.tipo.startsWith('image/') && (
                  <div className="flex justify-center">
                    <img 
                      src={anexosModal.tradeIn.termoResponsabilidade.dataUrl} 
                      alt="Termo de Responsabilidade"
                      className="max-w-full max-h-[400px] object-contain rounded-lg border"
                    />
                  </div>
                )}
                
                {anexosModal.tradeIn.termoResponsabilidade.tipo === 'application/pdf' && (
                  <div className="flex flex-col items-center gap-4 p-8 bg-muted/30 rounded-lg">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <p className="text-muted-foreground">Documento PDF - clique em Baixar para visualizar</p>
                  </div>
                )}
              </div>
            )}
            
            {anexosModal.tipo === 'fotos' && anexosModal.tradeIn?.fotosAparelho && (
              <div className="space-y-4">
                {/* Imagem principal */}
                <div className="flex justify-center bg-muted/30 rounded-lg p-4">
                  <img 
                    src={anexosModal.tradeIn.fotosAparelho[fotoSelecionadaIndex]?.dataUrl} 
                    alt={`Foto ${fotoSelecionadaIndex + 1}`}
                    className="max-w-full max-h-[350px] object-contain rounded-lg"
                  />
                </div>
                
                {/* Miniaturas */}
                {anexosModal.tradeIn.fotosAparelho.length > 1 && (
                  <div className="flex gap-2 justify-center overflow-x-auto pb-2">
                    {anexosModal.tradeIn.fotosAparelho.map((foto, index) => (
                      <button
                        key={foto.id}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          index === fotoSelecionadaIndex 
                            ? 'border-primary ring-2 ring-primary/30' 
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                        onClick={() => setFotoSelecionadaIndex(index)}
                      >
                        <img 
                          src={foto.dataUrl} 
                          alt={`Miniatura ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Info da foto selecionada */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-sm">
                      {anexosModal.tradeIn.fotosAparelho[fotoSelecionadaIndex]?.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Foto {fotoSelecionadaIndex + 1} de {anexosModal.tradeIn.fotosAparelho.length}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const foto = anexosModal.tradeIn!.fotosAparelho![fotoSelecionadaIndex];
                      const link = document.createElement('a');
                      link.href = foto.dataUrl;
                      link.download = foto.nome;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Trade-In:</span> {anexosModal.tradeIn?.modelo}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setAnexosModal(prev => ({ ...prev, open: false }))}
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
