import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Printer, Save, Clock } from 'lucide-react';
import { getProdutos, updateProduto, Produto } from '@/utils/estoqueApi';
import { getColaboradores } from '@/utils/cadastrosApi';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import QRCode from 'qrcode';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface Parecer {
  id: string;
  tipo: 'estoque' | 'assistencia';
  status: string;
  texto: string;
  responsavel: string;
  data: string;
}

export default function EstoqueProdutoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [qrCode, setQrCode] = useState('');
  const colaboradores = getColaboradores();

  // Estado dos pareceres
  const [parecerEstoque, setParecerEstoque] = useState({
    status: '',
    texto: '',
    responsavel: ''
  });
  
  const [parecerAssistencia, setParecerAssistencia] = useState({
    status: '',
    texto: '',
    responsavel: ''
  });

  // Histórico de pareceres (mockado)
  const [historicoParecederes, setHistoricoParecederes] = useState<Parecer[]>([
    {
      id: '1',
      tipo: 'estoque',
      status: 'Conferido',
      texto: 'Produto conferido e em perfeito estado.',
      responsavel: 'Lucas Mendes',
      data: '2025-01-15T10:30:00'
    },
    {
      id: '2',
      tipo: 'assistencia',
      status: 'Conferência Realizada',
      texto: 'Bateria testada, funcionamento normal.',
      responsavel: 'Roberto Alves',
      data: '2025-01-16T14:20:00'
    }
  ]);

  useEffect(() => {
    const produtoEncontrado = getProdutos().find(p => p.id === id);
    if (produtoEncontrado) {
      setProduto(produtoEncontrado);
    }
  }, [id]);

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

  const handleSalvarParecerEstoque = () => {
    if (!parecerEstoque.status || !parecerEstoque.responsavel) {
      toast.error('Preencha o status e responsável');
      return;
    }

    const novoParecer: Parecer = {
      id: String(Date.now()),
      tipo: 'estoque',
      status: parecerEstoque.status,
      texto: parecerEstoque.texto,
      responsavel: parecerEstoque.responsavel,
      data: new Date().toISOString()
    };

    setHistoricoParecederes([novoParecer, ...historicoParecederes]);

    // Atualizar status do produto
    const estoqueConferido = parecerEstoque.status === 'Conferido';
    const produtoAtualizado = updateProduto(produto.id, { estoqueConferido });
    if (produtoAtualizado) {
      setProduto(produtoAtualizado);
    }

    toast.success('Parecer Estoque salvo com sucesso!');
    setParecerEstoque({ status: '', texto: '', responsavel: '' });
  };

  const handleSalvarParecerAssistencia = () => {
    if (!parecerAssistencia.status || !parecerAssistencia.responsavel) {
      toast.error('Preencha o status e responsável');
      return;
    }

    const novoParecer: Parecer = {
      id: String(Date.now()),
      tipo: 'assistencia',
      status: parecerAssistencia.status,
      texto: parecerAssistencia.texto,
      responsavel: parecerAssistencia.responsavel,
      data: new Date().toISOString()
    };

    setHistoricoParecederes([novoParecer, ...historicoParecederes]);

    // Atualizar status do produto
    const assistenciaConferida = parecerAssistencia.status === 'Conferência Realizada' || parecerAssistencia.status === 'Devolvido ao estoque';
    const produtoAtualizado = updateProduto(produto.id, { assistenciaConferida });
    if (produtoAtualizado) {
      setProduto(produtoAtualizado);
    }

    toast.success('Parecer Assistência salvo com sucesso!');
    setParecerAssistencia({ status: '', texto: '', responsavel: '' });
  };

  // Mock histórico de preço de custo
  const historicoCusto = produto.historicoCusto || [
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
            </CardContent>
          </Card>
        </div>

        {/* Financeiro e Estoque */}
        <Card>
          <CardHeader>
            <CardTitle>Financeiro e Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor de Custo</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(produto.valorCusto)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Venda Recomendada</p>
                {produto.vendaRecomendada ? (
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(produto.vendaRecomendada)}
                  </p>
                ) : (
                  <p className="text-lg text-destructive">Pendente (preencher)</p>
                )}
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

        {/* Pareceres - Dois blocos ao mesmo tempo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Parecer Estoque */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
              <CardTitle className="text-blue-700 dark:text-blue-400">Parecer Estoque</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label>Status *</Label>
                <Select value={parecerEstoque.status} onValueChange={(v) => setParecerEstoque({ ...parecerEstoque, status: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Enviado Para assistência">Enviado Para assistência</SelectItem>
                    <SelectItem value="Conferido">Conferido</SelectItem>
                    <SelectItem value="Enviado para Assistência (2)">Enviado para Assistência (2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea 
                  value={parecerEstoque.texto}
                  onChange={(e) => setParecerEstoque({ ...parecerEstoque, texto: e.target.value })}
                  placeholder="Descreva o parecer..."
                />
              </div>
              <div>
                <Label>Responsável *</Label>
                <Select value={parecerEstoque.responsavel} onValueChange={(v) => setParecerEstoque({ ...parecerEstoque, responsavel: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map(col => (
                      <SelectItem key={col.id} value={col.nome}>{col.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSalvarParecerEstoque} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Salvar Parecer Estoque
              </Button>
            </CardContent>
          </Card>

          {/* Parecer Assistência */}
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="bg-orange-50 dark:bg-orange-950/20">
              <CardTitle className="text-orange-700 dark:text-orange-400">Parecer Assistência</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label>Status *</Label>
                <Select value={parecerAssistencia.status} onValueChange={(v) => setParecerAssistencia({ ...parecerAssistencia, status: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conferência Realizada">Conferência Realizada</SelectItem>
                    <SelectItem value="Devolvido ao estoque">Devolvido ao estoque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea 
                  value={parecerAssistencia.texto}
                  onChange={(e) => setParecerAssistencia({ ...parecerAssistencia, texto: e.target.value })}
                  placeholder="Descreva o parecer..."
                />
              </div>
              <div>
                <Label>Responsável *</Label>
                <Select value={parecerAssistencia.responsavel} onValueChange={(v) => setParecerAssistencia({ ...parecerAssistencia, responsavel: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map(col => (
                      <SelectItem key={col.id} value={col.nome}>{col.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSalvarParecerAssistencia} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Salvar Parecer Assistência
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Timeline de Pareceres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Tratativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historicoParecederes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhuma tratativa registrada</p>
              ) : (
                historicoParecederes.map((parecer) => (
                  <div 
                    key={parecer.id} 
                    className={cn(
                      "p-4 rounded-lg border-l-4",
                      parecer.tipo === 'estoque' 
                        ? "bg-blue-50 dark:bg-blue-950/20 border-blue-500" 
                        : "bg-orange-50 dark:bg-orange-950/20 border-orange-500"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Badge variant={parecer.tipo === 'estoque' ? 'default' : 'secondary'}>
                          {parecer.tipo === 'estoque' ? 'Estoque' : 'Assistência'}
                        </Badge>
                        <span className="ml-2 font-semibold">{parecer.status}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(parecer.data).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {parecer.texto && (
                      <p className="text-sm mb-2">{parecer.texto}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Responsável: <span className="font-medium">{parecer.responsavel}</span>
                    </p>
                  </div>
                ))
              )}
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
                    {formatCurrency(item.valor)}
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
