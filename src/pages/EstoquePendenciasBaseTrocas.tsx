import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ResponsiveCardGrid, ResponsiveFilterGrid, ResponsiveTableContainer } from '@/components/ui/ResponsiveContainers';
import { toast } from 'sonner';
import { 
  Package, Search, Clock, AlertTriangle, CheckCircle2, 
  Camera, FileText, Eye, ArrowRight, Upload, X, Image, Lock, Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { 
  getTradeInsPendentes,
  getTradeInsPendentesAguardando, 
  TradeInPendente, 
  calcularSLA,
  registrarRecebimento,
  getEstatisticasBaseTrocas,
  SLAInfo,
  SLAFaixa,
  migrarParaProdutosPendentes
} from '@/utils/baseTrocasPendentesApi';
import { AnexoTemporario } from '@/components/estoque/BufferAnexos';
import { formatarMoeda, formatDateTime } from '@/utils/formatUtils';
import { displayIMEI } from '@/utils/imeiMask';
import { cn } from '@/lib/utils';

export default function EstoquePendenciasBaseTrocas() {
  const navigate = useNavigate();
  const { obterNomeLoja, obterNomeColaborador, obterLojasAtivas, obterColaboradoresAtivos } = useCadastroStore();
  const { user } = useAuthStore();
  
  const [tradeIns, setTradeIns] = useState<TradeInPendente[]>(getTradeInsPendentes());
  const [buscaIMEI, setBuscaIMEI] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroSLA, setFiltroSLA] = useState('');
  
  const lojas = useMemo(() => obterLojasAtivas(), []);
  const colaboradores = useMemo(() => obterColaboradoresAtivos(), []);
  
  // Modal de recebimento
  const [showRecebimentoModal, setShowRecebimentoModal] = useState(false);
  const [tradeInSelecionado, setTradeInSelecionado] = useState<TradeInPendente | null>(null);
  const [fotosRecebimento, setFotosRecebimento] = useState<AnexoTemporario[]>([]);
  const [observacoesRecebimento, setObservacoesRecebimento] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estatísticas
  const estatisticas = useMemo(() => getEstatisticasBaseTrocas(), [tradeIns]);

  // Atualizar SLA em tempo real
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  // Filtrar trade-ins
  const tradeInsFiltrados = useMemo(() => {
    return tradeIns.filter(t => {
      if (buscaIMEI) {
        const termo = buscaIMEI.replace(/-/g, '').toLowerCase();
        if (!t.tradeIn.imei.replace(/-/g, '').toLowerCase().includes(termo)) return false;
      }
      if (filtroLoja && filtroLoja !== 'all' && t.lojaVenda !== filtroLoja) return false;
      if (filtroVendedor && filtroVendedor !== 'all' && t.vendedorId !== filtroVendedor) return false;
      if (filtroSLA && filtroSLA !== 'all') {
        const faixa = t.status === 'Recebido' ? t.slaFaixaCongelada : calcularSLA(t.dataVenda).faixa;
        if (faixa !== filtroSLA) return false;
      }
      return true;
    });
  }, [tradeIns, buscaIMEI, filtroLoja, filtroVendedor, filtroSLA]);

  // Exportar CSV
  const handleExportarCSV = () => {
    const headers = ['Modelo', 'IMEI', 'Cliente', 'ID Venda', 'Loja', 'Data/Hora', 'Vendedor', 'Valor', 'SLA', 'Status'];
    const rows = tradeInsFiltrados.map(t => {
      const sla = t.status === 'Recebido' ? (t.slaCongelado || '-') : calcularSLA(t.dataVenda).texto;
      return [
        t.tradeIn.modelo,
        t.tradeIn.imei,
        t.clienteNome,
        t.vendaId,
        obterNomeLoja(t.lojaVenda),
        formatDateTime(t.dataVenda),
        t.vendedorNome || obterNomeColaborador(t.vendedorId),
        formatarMoeda(t.tradeIn.valorCompraUsado),
        sla,
        t.status === 'Recebido' ? 'Finalizado' : 'Aguardando'
      ];
    });
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `base-trocas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Dados exportados com sucesso!');
  };

  // Abrir modal de recebimento
  const handleAbrirRecebimento = (tradeIn: TradeInPendente) => {
    setTradeInSelecionado(tradeIn);
    if (tradeIn.status === 'Recebido') {
      setFotosRecebimento(tradeIn.fotosRecebimento || []);
      setObservacoesRecebimento(tradeIn.observacoesRecebimento || '');
    } else {
      setFotosRecebimento([]);
      setObservacoesRecebimento('');
    }
    setShowRecebimentoModal(true);
  };

  // Upload de fotos de recebimento
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const novasFotos: AnexoTemporario[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} excede 5MB`);
        continue;
      }

      const dataUrl = await readFileAsDataURL(file);
      novasFotos.push({
        id: `foto-rec-${Date.now()}-${i}`,
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        dataUrl
      });
    }

    setFotosRecebimento([...fotosRecebimento, ...novasFotos]);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRemoverFoto = (id: string) => {
    setFotosRecebimento(fotosRecebimento.filter(f => f.id !== id));
  };

  // Confirmar recebimento
  const handleConfirmarRecebimento = async () => {
    if (!tradeInSelecionado) return;
    
    if (fotosRecebimento.length === 0) {
      toast.error('Adicione pelo menos uma foto do estado de recebimento');
      return;
    }

    setIsLoading(true);

    try {
      const resultado = registrarRecebimento(tradeInSelecionado.id, {
        fotosRecebimento,
        responsavelRecebimentoId: user?.colaborador?.id || 'COL-001',
        responsavelRecebimentoNome: user?.colaborador?.nome || 'Sistema',
        observacoesRecebimento
      });

      if (resultado) {
        // Migrar para Produtos Pendentes (inicia SLA de Tratativas)
        const produtoMigrado = migrarParaProdutosPendentes(tradeInSelecionado.id);
        
        if (produtoMigrado) {
          toast.success('Recebimento registrado com sucesso!', {
            description: `Aparelho migrado para Produtos Pendentes (${produtoMigrado.id}). SLA de Tratativas iniciado.`
          });
        } else {
          toast.error('Erro ao migrar aparelho para Produtos Pendentes');
        }
        
        // Atualizar lista (mantém todos, incluindo finalizados)
        setTradeIns(getTradeInsPendentes());
        setShowRecebimentoModal(false);
        
        // Redirecionar para Produtos Pendentes
        navigate('/estoque/produtos-pendentes');
      } else {
        toast.error('Erro ao registrar recebimento');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Componente de SLA com animação (para itens aguardando)
  const SLABadge = ({ tradeIn }: { tradeIn: TradeInPendente }) => {
    if (tradeIn.status === 'Recebido') {
      // SLA congelado
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <Lock className="h-3.5 w-3.5" />
          <span>{tradeIn.slaCongelado || '-'}</span>
        </div>
      );
    }

    const sla = calcularSLA(tradeIn.dataVenda);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
          sla.nivel === 'critico' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
          sla.nivel === 'atencao' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
          sla.nivel === 'normal' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        <span>{sla.faixa}</span>
        {sla.nivel === 'critico' && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <EstoqueLayout title="Pendências - Base de Trocas">
      {/* Cards de Estatísticas */}
      <ResponsiveCardGrid cols={4} className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aguardando</p>
                <p className="text-2xl font-bold">{estatisticas.aguardando}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recebidos</p>
                <p className="text-2xl font-bold">{estatisticas.recebidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Aguardando</p>
                <p className="text-2xl font-bold">{formatarMoeda(estatisticas.valorTotalAguardando)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <AlertTriangle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média SLA</p>
                <p className="text-2xl font-bold">{estatisticas.mediaTempoSLA.toFixed(1)} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </ResponsiveCardGrid>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <ResponsiveFilterGrid cols={5}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar IMEI..."
                value={buscaIMEI}
                onChange={(e) => setBuscaIMEI(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroLoja} onValueChange={setFiltroLoja}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Lojas</SelectItem>
                {lojas.map(loja => (
                  <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Vendedores</SelectItem>
                {colaboradores.map(col => (
                  <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroSLA} onValueChange={setFiltroSLA}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar SLA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="0-24 horas">0-24 horas</SelectItem>
                <SelectItem value="24-48 horas">24-48 horas</SelectItem>
                <SelectItem value="48-72 horas">48-72 horas</SelectItem>
                <SelectItem value="72+ horas">72+ horas</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setBuscaIMEI(''); setFiltroLoja(''); setFiltroVendedor(''); setFiltroSLA(''); }}>
                Limpar
              </Button>
              <Button variant="outline" onClick={handleExportarCSV} className="gap-1.5">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </ResponsiveFilterGrid>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <ResponsiveTableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-20 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Produto</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>ID Venda</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>SLA Devolução</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradeInsFiltrados.map((tradeIn) => (
                  <TableRow 
                    key={tradeIn.id}
                    className={cn(
                      tradeIn.status === 'Recebido' && 'bg-green-500/10'
                    )}
                  >
                    <TableCell className="font-medium sticky left-0 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{tradeIn.tradeIn.modelo}</TableCell>
                    <TableCell className="font-mono text-sm">{displayIMEI(tradeIn.tradeIn.imei)}</TableCell>
                    <TableCell>{tradeIn.clienteNome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tradeIn.vendaId}</Badge>
                    </TableCell>
                    <TableCell>{obterNomeLoja(tradeIn.lojaVenda)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(tradeIn.dataVenda)}
                    </TableCell>
                    <TableCell>{tradeIn.vendedorNome || obterNomeColaborador(tradeIn.vendedorId)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatarMoeda(tradeIn.tradeIn.valorCompraUsado)}
                    </TableCell>
                    <TableCell>
                      <SLABadge tradeIn={tradeIn} />
                    </TableCell>
                    <TableCell>
                      {tradeIn.status === 'Recebido' ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Finalizado
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Aguardando
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {tradeIn.status === 'Aguardando Devolução' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleAbrirRecebimento(tradeIn)}
                          className="gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Registrar Recebimento
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAbrirRecebimento(tradeIn)}
                          className="gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Detalhes
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {tradeInsFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Nenhum registro de trade-in encontrado</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        </CardContent>
      </Card>

      {/* Modal de Recebimento */}
      <Dialog open={showRecebimentoModal} onOpenChange={setShowRecebimentoModal}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] !flex !flex-col overflow-hidden p-0">
          <DialogHeader className="flex-shrink-0 p-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {tradeInSelecionado?.status === 'Recebido' ? 'Detalhes do Recebimento' : 'Registrar Recebimento'}
            </DialogTitle>
          </DialogHeader>
          
          {tradeInSelecionado && (
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-6 pb-4">
                {/* Info do Trade-In */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Dados do Aparelho</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Modelo:</span>
                      <p className="font-medium">{tradeInSelecionado.tradeIn.modelo}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IMEI:</span>
                      <p className="font-mono">{displayIMEI(tradeInSelecionado.tradeIn.imei)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>
                      <p className="font-medium">{tradeInSelecionado.clienteNome}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor Trade-In:</span>
                      <p className="font-medium text-green-600">
                        {formatarMoeda(tradeInSelecionado.tradeIn.valorCompraUsado)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Descrição Original:</span>
                      <p>{tradeInSelecionado.tradeIn.descricao || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Fotos Originais */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Fotos Originais (Momento da Venda)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tradeInSelecionado.fotosAparelho && tradeInSelecionado.fotosAparelho.length > 0 ? (
                      <Carousel className="w-full max-w-md mx-auto">
                        <CarouselContent>
                          {tradeInSelecionado.fotosAparelho.map((foto) => (
                            <CarouselItem key={foto.id}>
                              <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                                <img
                                  src={foto.dataUrl}
                                  alt={foto.nome}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                                  {foto.nome}
                                </div>
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        {tradeInSelecionado.fotosAparelho.length > 1 && (
                          <>
                            <CarouselPrevious />
                            <CarouselNext />
                          </>
                        )}
                      </Carousel>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma foto original registrada
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Separator />

                {/* Info adicional para itens finalizados */}
                {tradeInSelecionado.status === 'Recebido' && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Informações do Recebimento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Data do Recebimento:</span>
                        <p className="font-medium">{tradeInSelecionado.dataRecebimento ? formatDateTime(tradeInSelecionado.dataRecebimento) : '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Responsável:</span>
                        <p className="font-medium">{tradeInSelecionado.responsavelRecebimentoNome || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SLA Congelado:</span>
                        <p className="font-medium">{tradeInSelecionado.slaCongelado || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Faixa SLA:</span>
                        <p className="font-medium">{tradeInSelecionado.slaFaixaCongelada || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fotos de Recebimento */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {tradeInSelecionado.status === 'Recebido' ? (
                        <Camera className="h-4 w-4" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Fotos do Recebimento {tradeInSelecionado.status !== 'Recebido' && '*'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Upload apenas para itens aguardando */}
                    {tradeInSelecionado.status !== 'Recebido' && (
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <Button type="button" variant="outline" className="gap-2" asChild>
                            <span>
                              <Camera className="h-4 w-4" />
                              Adicionar Fotos
                            </span>
                          </Button>
                        </label>
                        <span className="text-xs text-muted-foreground">
                          Máx. 5MB por foto
                        </span>
                      </div>
                    )}

                    {fotosRecebimento.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {fotosRecebimento.map((foto) => (
                          <div key={foto.id} className="relative group">
                            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                              <img
                                src={foto.dataUrl}
                                alt={foto.nome}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {tradeInSelecionado.status !== 'Recebido' && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoverFoto(foto.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                        <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          {tradeInSelecionado.status === 'Recebido'
                            ? 'Nenhuma foto de recebimento registrada'
                            : 'Adicione fotos do estado atual do aparelho'}
                        </p>
                      </div>
                    )}

                    {tradeInSelecionado.status !== 'Recebido' && fotosRecebimento.length === 0 && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          É obrigatório anexar pelo menos uma foto do estado de recebimento para comparação.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Observações */}
                <div>
                  <label className="text-sm font-medium">Observações do Recebimento</label>
                  {tradeInSelecionado.status === 'Recebido' ? (
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {observacoesRecebimento || 'Nenhuma observação registrada.'}
                    </p>
                  ) : (
                    <textarea
                      value={observacoesRecebimento}
                      onChange={(e) => setObservacoesRecebimento(e.target.value)}
                      placeholder="Descreva o estado do aparelho ao receber..."
                      className="mt-2 w-full min-h-[100px] px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t bg-background">
            <Button variant="outline" onClick={() => setShowRecebimentoModal(false)}>
              {tradeInSelecionado?.status === 'Recebido' ? 'Fechar' : 'Cancelar'}
            </Button>
            {tradeInSelecionado?.status !== 'Recebido' && (
              <Button 
                onClick={handleConfirmarRecebimento}
                disabled={isLoading || fotosRecebimento.length === 0}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                {isLoading ? 'Processando...' : 'Confirmar Recebimento'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EstoqueLayout>
  );
}
