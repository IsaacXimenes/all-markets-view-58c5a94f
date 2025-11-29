import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Printer } from 'lucide-react';
import { getProdutos } from '@/utils/estoqueApi';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';

export default function EstoqueProdutoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const produto = getProdutos().find(p => p.id === id);
  const [qrCode, setQrCode] = useState('');

  // Generate QR Code on mount
  useEffect(() => {
    if (produto) {
      QRCode.toDataURL(`PROD-${produto.id}-${produto.imei}`, { width: 200 })
        .then(url => setQrCode(url));
    }
  }, [produto]);

  if (!produto) {
    return (
      <EstoqueLayout title="Produto não encontrado">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Produto não encontrado</p>
          <Button onClick={() => navigate('/estoque/produtos')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Produtos
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  const handlePrintQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && qrCode) {
      printWindow.document.write(`
        <html>
          <head><title>QR Code - ${produto.id}</title></head>
          <body style="text-align: center; padding: 20px;">
            <h2>${produto.modelo}</h2>
            <p>ID: ${produto.id} | IMEI: ${produto.imei}</p>
            <img src="${qrCode}" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Mock histórico de preço de custo
  const historicoCusto = [
    { fornecedor: 'Apple Store São Paulo', data: '2024-12-15', valor: produto.valorCusto },
    { fornecedor: 'iPlace Distribuidor', data: '2024-11-20', valor: produto.valorCusto * 0.95 },
    { fornecedor: 'Tech Import Brasil', data: '2024-10-10', valor: produto.valorCusto * 0.92 }
  ];

  return (
    <EstoqueLayout title="Detalhes do Produto">
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/estoque/produtos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Produtos
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Imagem e QR Code */}
          <Card>
            <CardHeader>
              <CardTitle>Imagem do Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">Imagem do produto</span>
              </div>
              <Button variant="outline" className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Upload Imagem
              </Button>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">QR Code</h3>
                {qrCode ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                    <Button variant="outline" size="sm" onClick={handlePrintQRCode}>
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir QR Code
                    </Button>
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-muted rounded flex items-center justify-center mx-auto">
                    <span className="text-sm text-muted-foreground">Gerando QR Code...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações Gerais */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID Produto</p>
                  <p className="font-mono font-semibold">{produto.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IMEI</p>
                  <p className="font-mono font-semibold">{produto.imei}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-semibold">{produto.marca}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-semibold">{produto.modelo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cor</p>
                  <p className="font-semibold">{produto.cor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Condição</p>
                  <Badge variant={produto.tipo === 'Novo' ? 'default' : 'secondary'}>
                    {produto.tipo}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saúde da Bateria</p>
                  <p className={cn(
                    'font-semibold text-lg',
                    produto.saudeBateria < 70 ? 'text-destructive' :
                    produto.saudeBateria < 80 ? 'text-orange-500' :
                    produto.saudeBateria < 90 ? 'text-yellow-500' : 'text-green-500'
                  )}>
                    {produto.saudeBateria}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantidade</p>
                  <p className="font-semibold">{produto.quantidade}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Pareceres</h3>
                <p className="text-sm text-muted-foreground">
                  Produto em boas condições gerais. Testado e funcionando perfeitamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financeiro e Estoque */}
        <Card>
          <CardHeader>
            <CardTitle>Financeiro e Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor de Custo</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.valorCusto)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loja Atual</p>
                <p className="font-semibold">{produto.loja}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status de Conferência</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant={produto.estoqueConferido ? 'default' : 'destructive'}>
                    Estoque: {produto.estoqueConferido ? 'Conferido' : 'Pendente'}
                  </Badge>
                  <Badge variant={produto.assistenciaConferida ? 'default' : 'destructive'}>
                    Assistência: {produto.assistenciaConferida ? 'Conferida' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Preço de Custo */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Preço de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historicoCusto.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded">
                  <div>
                    <p className="font-semibold">{item.fornecedor}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <p className="text-lg font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </EstoqueLayout>
  );
}
