import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Printer, Clock, Package, Wrench, CheckCircle, AlertCircle, DollarSign, AlertTriangle, Scissors, Video, Trash2, Film } from 'lucide-react';
import { getProdutos, Produto, TimelineEntry } from '@/utils/estoqueApi';
import { getHistoricoGarantiasByIMEI } from '@/utils/garantiasApi';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { formatIMEI } from '@/utils/imeiMask';
import { ModalRetiradaPecas } from '@/components/estoque/ModalRetiradaPecas';
import { verificarDisponibilidadeRetirada } from '@/utils/retiradaPecasApi';
import { ImagemTemporaria } from '@/components/estoque/ImagensTemporarias';
import { CarrosselImagensProduto } from '@/components/estoque/CarrosselImagensProduto';
import { ListaImagensAnexadas } from '@/components/estoque/ListaImagensAnexadas';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface VideoAnexo {
  id: string;
  nome: string;
  blobUrl: string;
  tamanho: number;
  dataUpload: string;
  responsavel: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function EstoqueProdutoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [showModalRetirada, setShowModalRetirada] = useState(false);
  const [imagensTemporarias, setImagensTemporarias] = useState<ImagemTemporaria[]>([]);
  const imagensRef = useRef<ImagemTemporaria[]>([]);
  const [videosAnexados, setVideosAnexados] = useState<VideoAnexo[]>([]);
  const videosRef = useRef<VideoAnexo[]>([]);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const ehEstoquistaOuGestor = (user?.colaborador as any)?.eh_estoquista || (user?.colaborador as any)?.eh_gestor || (user?.colaborador?.cargo && user.colaborador.cargo.toLowerCase().includes('gestor'));
 
  // Keep refs in sync for cleanup
  useEffect(() => {
    imagensRef.current = imagensTemporarias;
  }, [imagensTemporarias]);
  useEffect(() => {
    videosRef.current = videosAnexados;
  }, [videosAnexados]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      imagensRef.current.forEach(img => URL.revokeObjectURL(img.blobUrl));
      videosRef.current.forEach(vid => URL.revokeObjectURL(vid.blobUrl));
    };
  }, []);
 
  const handleRemoveImagem = useCallback((id: string) => {
    setImagensTemporarias(prev => prev.filter(img => img.id !== id));
  }, []);

  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`Arquivo "${file.name}" excede o limite de 50MB.`);
        continue;
      }
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['mp4', 'mov', 'webm'].includes(ext || '')) {
        toast.error(`Formato "${ext}" não suportado. Use MP4, MOV ou WebM.`);
        continue;
      }
      const blobUrl = URL.createObjectURL(file);
      const novoVideo: VideoAnexo = {
        id: `VID-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        nome: file.name,
        blobUrl,
        tamanho: file.size,
        dataUpload: new Date().toISOString(),
        responsavel: user?.colaborador?.nome || 'Usuário',
      };
      setVideosAnexados(prev => [...prev, novoVideo]);
      toast.success(`Vídeo "${file.name}" anexado com sucesso!`);
    }
    if (videoInputRef.current) videoInputRef.current.value = '';
  }, [user]);

  const handleRemoveVideo = useCallback((id: string) => {
    setVideosAnexados(prev => {
      const vid = prev.find(v => v.id === id);
      if (vid) URL.revokeObjectURL(vid.blobUrl);
      return prev.filter(v => v.id !== id);
    });
  }, []);

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
  
  // Verificar disponibilidade para retirada de peças
  const disponibilidadeRetirada = produto ? verificarDisponibilidadeRetirada(produto.id) : { disponivel: false };

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

  // Função para obter ícone baseado no tipo de timeline
  const getTimelineIcon = (tipo: TimelineEntry['tipo']) => {
    switch (tipo) {
      case 'entrada':
        return <Package className="h-4 w-4" />;
      case 'parecer_estoque':
        return <CheckCircle className="h-4 w-4" />;
      case 'parecer_assistencia':
        return <Wrench className="h-4 w-4" />;
      case 'despesa':
        return <DollarSign className="h-4 w-4" />;
      case 'liberacao':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Função para obter cor do tipo de timeline
  const getTimelineColor = (tipo: TimelineEntry['tipo']) => {
    switch (tipo) {
      case 'entrada':
        return 'bg-gray-50 dark:bg-gray-950/20 border-gray-500';
      case 'parecer_estoque':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-500';
      case 'parecer_assistencia':
        return 'bg-orange-50 dark:bg-orange-950/20 border-orange-500';
      case 'despesa':
        return 'bg-red-50 dark:bg-red-950/20 border-red-500';
      case 'liberacao':
        return 'bg-green-50 dark:bg-green-950/20 border-green-500';
      default:
        return 'bg-muted/30 border-muted';
    }
  };

  // Função para obter label do tipo de timeline
  const getTimelineLabel = (tipo: TimelineEntry['tipo']) => {
    switch (tipo) {
      case 'entrada':
        return 'Entrada';
      case 'parecer_estoque':
        return 'Parecer Estoque';
      case 'parecer_assistencia':
        return 'Parecer Assistência';
      case 'despesa':
        return 'Despesa';
      case 'liberacao':
        return 'Liberação';
      default:
        return tipo;
    }
  };

  // Mock histórico de preço de custo
  const historicoCusto = produto.historicoCusto || [
    { fornecedor: 'Apple Store São Paulo', data: '2024-12-15', valor: produto.valorCusto },
    { fornecedor: 'iPlace Distribuidor', data: '2024-11-20', valor: produto.valorCusto * 0.95 },
    { fornecedor: 'Tech Import Brasil', data: '2024-10-10', valor: produto.valorCusto * 0.92 }
  ];

  // Timeline ordenada por data (mais recente primeiro)
  const timelineOrdenada = produto.timeline 
    ? [...produto.timeline].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    : [];

  return (
    <EstoqueLayout title="Detalhes do Produto">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/estoque/produtos')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Produtos
          </Button>
          
          {disponibilidadeRetirada.disponivel && (
            <Button 
              variant="outline" 
              className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              onClick={() => setShowModalRetirada(true)}
            >
              <Scissors className="mr-2 h-4 w-4" />
              Retirada de Peças
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Imagem e QR Code */}
          <Card>
            <CardHeader>
             <CardTitle className="flex items-center justify-between">
               Imagem do Produto
               {imagensTemporarias.length > 0 && (
                 <span className="text-sm font-normal text-muted-foreground">
                   ({imagensTemporarias.length})
                 </span>
               )}
             </CardTitle>
            </CardHeader>
             <CardContent className="space-y-4">
              <CarrosselImagensProduto
                imagens={imagensTemporarias}
                onImagensChange={setImagensTemporarias}
              />

              {/* Botão de anexar vídeo dentro do card de imagem */}
              <div className="flex flex-col gap-2">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/mov,video/quicktime,video/webm"
                  multiple
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} className="w-full">
                  <Video className="mr-2 h-4 w-4" />
                  Anexar Vídeo (MP4/MOV, max 50MB)
                </Button>
                {videosAnexados.length > 0 && (
                  <div className="space-y-2">
                    {videosAnexados.map(vid => (
                      <div key={vid.id} className="border rounded-lg p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{vid.nome}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(vid.tamanho / (1024 * 1024)).toFixed(1)} MB · {vid.responsavel}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveVideo(vid.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                        <video src={vid.blobUrl} controls className="w-full max-h-[200px] rounded bg-black" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                  <p className="font-mono font-semibold">{formatIMEI(produto.imei)}</p>
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
                
                {/* Badge de Retirada de Peças */}
                {produto.statusRetiradaPecas && produto.statusRetiradaPecas !== 'Cancelada' && (
                  <div className="col-span-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        produto.statusRetiradaPecas === 'Pendente Assistência' && 'bg-orange-100 text-orange-700 border-orange-300',
                        produto.statusRetiradaPecas === 'Em Desmonte' && 'bg-blue-100 text-blue-700 border-blue-300',
                        produto.statusRetiradaPecas === 'Concluída' && 'bg-gray-100 text-gray-700 border-gray-300'
                      )}
                    >
                      <Scissors className="h-3 w-3 mr-1" />
                      Retirada de Peças: {produto.statusRetiradaPecas === 'Concluída' ? 'Desmontado' : produto.statusRetiradaPecas}
                    </Badge>
                  </div>
                )}
                
                {/* Badge de Garantia Acionada */}
                {(() => {
                  const garantiasAcionadas = getHistoricoGarantiasByIMEI(produto.imei);
                  if (garantiasAcionadas.length > 0) {
                    return (
                      <div className="col-span-2">
                        <Badge 
                          variant="outline" 
                          className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Teve Garantia Acionada ({garantiasAcionadas.length}x)
                        </Badge>
                      </div>
                    );
                  }
                  return null;
                })()}
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor de Custo</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(produto.valorCusto)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Assistência</p>
                {produto.custoAssistencia ? (
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(produto.custoAssistencia)}
                  </p>
                ) : (
                  <p className="text-lg text-muted-foreground">-</p>
                )}
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

        {/* Timeline de Tratativas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Tratativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timelineOrdenada.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Produto sem histórico de tratativas</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Produtos novos ou que entraram diretamente no estoque não possuem tratativas registradas.
                  </p>
                </div>
              ) : (
                timelineOrdenada.map((entry) => (
                  <div 
                    key={entry.id} 
                    className={cn(
                      "p-4 rounded-lg border-l-4",
                      getTimelineColor(entry.tipo)
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {getTimelineIcon(entry.tipo)}
                        <Badge variant={
                          entry.tipo === 'liberacao' ? 'default' :
                          entry.tipo === 'parecer_estoque' ? 'default' :
                          entry.tipo === 'parecer_assistencia' ? 'secondary' :
                          entry.tipo === 'despesa' ? 'destructive' :
                          'outline'
                        }>
                          {getTimelineLabel(entry.tipo)}
                        </Badge>
                        <span className="font-semibold">{entry.titulo}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.data).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{entry.descricao}</p>
                    <div className="flex justify-between items-center">
                      {entry.responsavel && (
                        <p className="text-xs text-muted-foreground">
                          Responsável: <span className="font-medium">{entry.responsavel}</span>
                        </p>
                      )}
                      {entry.valor && (
                        <p className="text-sm font-semibold text-destructive">
                          {formatCurrency(entry.valor)}
                        </p>
                      )}
                    </div>
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

        {/* Lista de Imagens Anexadas */}
        <ListaImagensAnexadas
          imagens={imagensTemporarias}
          onRemove={handleRemoveImagem}
        />

      </div>
      
      {/* Modal Retirada de Peças */}
      <ModalRetiradaPecas
        open={showModalRetirada}
        onOpenChange={setShowModalRetirada}
        produto={produto}
        onSuccess={() => {
          setShowModalRetirada(false);
          navigate('/estoque/produtos');
        }}
      />
    </EstoqueLayout>
  );
}
