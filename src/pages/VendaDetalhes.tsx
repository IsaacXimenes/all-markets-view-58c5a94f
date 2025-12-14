import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, ShoppingCart, User, Package, CreditCard, Truck, Clock, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { getVendaById, formatCurrency, Venda } from '@/utils/vendasApi';
import { getColaboradores, getLojas, getContasFinanceiras } from '@/utils/cadastrosApi';
import QRCode from 'qrcode';

export default function VendaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  const colaboradores = getColaboradores();
  const lojas = getLojas();
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

  const getColaboradorNome = (id: string) => {
    const col = colaboradores.find(c => c.id === id);
    return col?.nome || id;
  };

  const getLojaNome = (id: string) => {
    const loja = lojas.find(l => l.id === id);
    return loja?.nome || id;
  };

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
          <Button onClick={() => navigate('/vendas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Vendas
          </Button>
        </div>
      </PageLayout>
    );
  }

  const totais = calcularTotais(venda);
  const isPrejuizo = totais.lucro < 0;

  return (
    <PageLayout title={`Detalhes da Venda ${venda.id}`}>
      {/* Botões de ação */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => navigate('/vendas')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleImprimir}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir Recibo
        </Button>
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
                      <TableHead className="text-right">Valor Abatimento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venda.tradeIns.map(trade => (
                      <TableRow key={trade.id}>
                        <TableCell className="font-medium">{trade.modelo}</TableCell>
                        <TableCell className="text-muted-foreground">{trade.descricao}</TableCell>
                        <TableCell className="font-mono text-sm">{trade.imei}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">-{formatCurrency(trade.valorAbatimento)}</TableCell>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venda.pagamentos.map(pag => (
                    <TableRow key={pag.id}>
                      <TableCell className="font-medium">{pag.meioPagamento}</TableCell>
                      <TableCell>{getContaNome(pag.contaDestino)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(pag.valor)}</TableCell>
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
                  <span className={isPrejuizo ? 'text-destructive font-medium' : 'text-purple-600'}>
                    Margem %:
                  </span>
                  <span className={`font-medium ${isPrejuizo ? 'text-destructive' : 'text-purple-600'}`}>
                    {totais.margem.toFixed(2)}%
                  </span>
                </div>
                {isPrejuizo && (
                  <div className="bg-destructive/10 p-3 rounded-lg flex items-center gap-2 text-destructive mt-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium text-sm">Venda com prejuízo</span>
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
    </PageLayout>
  );
}
