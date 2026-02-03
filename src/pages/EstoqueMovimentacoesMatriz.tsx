import React, { useState, useEffect, useMemo } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResponsiveTableContainer, ResponsiveFilterGrid } from '@/components/ui/ResponsiveContainers';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Building, 
  Plus, 
  X, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Edit,
  Search,
  ArrowRight,
  Package,
  Timer,
  Download
} from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { 
  getMovimentacoesMatriz,
  getMovimentacaoMatrizById,
  criarMovimentacaoMatriz,
  registrarRetornoItemMatriz,
  getProdutosDisponivelMatriz,
  getMatrizLojaId,
  getEstoqueSiaId,
  MovimentacaoMatriz,
  MovimentacaoMatrizItem,
  Produto
} from '@/utils/estoqueApi';
import { getStatusRowClass } from '@/utils/statusColors';

// Componente Timer
const TimerRegressivo = ({ dataLimite }: { dataLimite: string }) => {
  const [tempoRestante, setTempoRestante] = useState({ texto: '', cor: '', expirado: false });

  useEffect(() => {
    const calcular = () => {
      const agora = new Date();
      const limite = new Date(dataLimite);
      const diff = limite.getTime() - agora.getTime();

      if (diff <= 0) {
        return { expirado: true, texto: 'Expirado', cor: 'text-destructive animate-pulse' };
      }

      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diff % (1000 * 60)) / 1000);

      let cor = 'text-green-500';
      if (horas < 1) cor = 'text-destructive';
      else if (horas < 4) cor = 'text-yellow-500';

      return {
        expirado: false,
        texto: `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`,
        cor
      };
    };

    setTempoRestante(calcular());
    const interval = setInterval(() => setTempoRestante(calcular()), 1000);
    return () => clearInterval(interval);
  }, [dataLimite]);

  return (
    <div className={`flex items-center gap-1 font-mono font-medium ${tempoRestante.cor}`}>
      <Timer className="h-4 w-4" />
      {tempoRestante.texto}
    </div>
  );
};

export default function EstoqueMovimentacoesMatriz() {
  const { toast } = useToast();
  const { obterNomeLoja, obterColaboradoresAtivos, obterNomeColaborador } = useCadastroStore();
  
  // IDs fixos para origem e destino
  const estoqueSiaId = getEstoqueSiaId();
  const matrizId = getMatrizLojaId();
  
  // Estados do modal nova movimentação
  const [isNovaMovimentacaoOpen, setIsNovaMovimentacaoOpen] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [itensParaEnviar, setItensParaEnviar] = useState<Array<{ aparelhoId: string; imei: string; modelo: string; cor: string }>>([]);
  const [responsavelLancamento, setResponsavelLancamento] = useState('');
  const [isModalSelecionarOpen, setIsModalSelecionarOpen] = useState(false);
  
  // Estados da tabela e filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoMatriz[]>([]);
  
  // Estados de detalhes/conferência
  const [movimentacaoSelecionada, setMovimentacaoSelecionada] = useState<MovimentacaoMatriz | null>(null);
  const [isDetalheDialogOpen, setIsDetalheDialogOpen] = useState(false);
  const [isConferenciaMode, setIsConferenciaMode] = useState(false);
  const [buscaConferencia, setBuscaConferencia] = useState('');
  
  // Refresh
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Carregar movimentações
  useEffect(() => {
    setMovimentacoes(getMovimentacoesMatriz());
  }, [refreshKey]);
  
  // Produtos disponíveis no Estoque - SIA
  const produtosDisponiveis = useMemo(() => {
    const disponiveis = getProdutosDisponivelMatriz();
    if (!buscaProduto) return disponiveis;
    
    const termo = buscaProduto.toLowerCase();
    return disponiveis.filter(p => 
      p.imei.toLowerCase().includes(termo) ||
      p.modelo.toLowerCase().includes(termo)
    );
  }, [buscaProduto, refreshKey]);
  
  // Colaboradores para responsável
  const colaboradores = obterColaboradoresAtivos();
  
  // Nomes das lojas fixas
  const nomeOrigem = obterNomeLoja(estoqueSiaId) || 'Estoque - SIA';
  const nomeDestino = obterNomeLoja(matrizId) || 'Loja - Matriz';
  
  // Filtrar movimentações
  const movimentacoesFiltradas = useMemo(() => {
    let resultado = movimentacoes;
    if (filtroStatus) {
      resultado = resultado.filter(m => m.statusMovimentacao === filtroStatus);
    }
    return resultado;
  }, [movimentacoes, filtroStatus]);
  
  // Adicionar produto à lista
  const handleAdicionarProduto = (produto: Produto) => {
    if (itensParaEnviar.some(i => i.aparelhoId === produto.id)) {
      toast({ title: 'Atenção', description: 'Produto já adicionado à lista', variant: 'destructive' });
      return;
    }
    
    setItensParaEnviar(prev => [...prev, {
      aparelhoId: produto.id,
      imei: produto.imei,
      modelo: produto.modelo,
      cor: produto.cor
    }]);
    setBuscaProduto('');
  };
  
  // Remover produto da lista
  const handleRemoverProduto = (aparelhoId: string) => {
    setItensParaEnviar(prev => prev.filter(i => i.aparelhoId !== aparelhoId));
  };
  
  // Registrar lançamento
  const handleRegistrarLancamento = () => {
    if (!responsavelLancamento) {
      toast({ title: 'Erro', description: 'Selecione o responsável pelo lançamento', variant: 'destructive' });
      return;
    }
    if (itensParaEnviar.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos um aparelho', variant: 'destructive' });
      return;
    }
    
    const novaMovimentacao = criarMovimentacaoMatriz({
      lojaDestinoId: matrizId,
      responsavelLancamento: obterNomeColaborador(responsavelLancamento),
      itens: itensParaEnviar
    });
    
    toast({ 
      title: 'Sucesso', 
      description: `Movimentação ${novaMovimentacao.id} registrada com ${itensParaEnviar.length} aparelho(s)` 
    });
    
    // Limpar formulário e fechar modal
    setItensParaEnviar([]);
    setResponsavelLancamento('');
    setIsNovaMovimentacaoOpen(false);
    setRefreshKey(prev => prev + 1);
  };
  
  // Abrir detalhes da movimentação
  const handleAbrirDetalhes = (mov: MovimentacaoMatriz, conferir: boolean = false) => {
    setMovimentacaoSelecionada(mov);
    setIsConferenciaMode(conferir);
    setIsDetalheDialogOpen(true);
  };
  
  // Registrar retorno de item
  const handleRegistrarRetorno = (aparelhoId: string) => {
    if (!movimentacaoSelecionada) return;
    
    const resultado = registrarRetornoItemMatriz(
      movimentacaoSelecionada.id,
      aparelhoId,
      obterNomeColaborador(responsavelLancamento) || 'Sistema'
    );
    
    if (resultado.sucesso) {
      toast({ title: 'Sucesso', description: 'Retorno registrado' });
      if (resultado.movimentacao) {
        setMovimentacaoSelecionada(resultado.movimentacao);
      }
      setRefreshKey(prev => prev + 1);
    } else {
      toast({ title: 'Erro', description: resultado.mensagem, variant: 'destructive' });
    }
  };
  
  // Badge de status
  const getStatusBadge = (status: MovimentacaoMatriz['statusMovimentacao']) => {
    switch (status) {
      case 'Aguardando Retorno':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Aguardando</Badge>;
      case 'Concluída':
        return <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Concluída</Badge>;
      case 'Retorno Atrasado':
        return <Badge variant="destructive" className="gap-1 animate-pulse"><AlertTriangle className="h-3 w-3" /> Atrasado</Badge>;
    }
  };
  
  // Badge de status do item
  const getStatusItemBadge = (status: MovimentacaoMatrizItem['statusItem']) => {
    switch (status) {
      case 'Enviado':
        return <Badge variant="outline">Enviado</Badge>;
      case 'Devolvido':
        return <Badge className="bg-green-500">Devolvido</Badge>;
      case 'Vendido':
        return <Badge className="bg-blue-500">Vendido</Badge>;
    }
  };
  
  // Cor da linha baseada no status
  const getRowStatusClass = (status: MovimentacaoMatriz['statusMovimentacao']) => {
    switch (status) {
      case 'Aguardando Retorno':
        return 'bg-yellow-500/10';
      case 'Concluída':
        return 'bg-green-500/10';
      case 'Retorno Atrasado':
        return 'bg-red-500/10';
      default:
        return '';
    }
  };
  
  // Itens filtrados para conferência
  const itensFiltradosConferencia = useMemo(() => {
    if (!movimentacaoSelecionada) return [];
    if (!buscaConferencia) return movimentacaoSelecionada.itens;
    
    const termo = buscaConferencia.toLowerCase();
    return movimentacaoSelecionada.itens.filter(i =>
      i.imei.toLowerCase().includes(termo) ||
      i.modelo.toLowerCase().includes(termo)
    );
  }, [movimentacaoSelecionada, buscaConferencia]);
  
  // Limpar filtros
  const handleLimparFiltros = () => {
    setFiltroStatus('');
  };
  
  // Limpar formulário de nova movimentação
  const handleLimparNovaMovimentacao = () => {
    setItensParaEnviar([]);
    setResponsavelLancamento('');
    setBuscaProduto('');
  };

  return (
    <EstoqueLayout title="Estoque - Movimentações - Matriz">
      <div className="space-y-4">
        {/* Barra de filtros */}
        <Card>
          <CardContent className="pt-4">
            <ResponsiveFilterGrid cols={4}>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aguardando Retorno">Aguardando Retorno</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Retorno Atrasado">Retorno Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={handleLimparFiltros}>
                  Limpar
                </Button>
              </div>
              
              <div className="col-span-full flex justify-end gap-2 sm:col-span-2">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button onClick={() => setIsNovaMovimentacaoOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Movimentação
                </Button>
              </div>
            </ResponsiveFilterGrid>
          </CardContent>
        </Card>
        
        {/* Tabela de Movimentações */}
        <ResponsiveTableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Data/Hora Lançamento</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Aparelhos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timer (até 22:00)</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma movimentação encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                movimentacoesFiltradas.map(mov => {
                  const itensEnviados = mov.itens.filter(i => i.statusItem === 'Enviado').length;
                  const itensDevolvidos = mov.itens.filter(i => i.statusItem === 'Devolvido').length;
                  const itensVendidos = mov.itens.filter(i => i.statusItem === 'Vendido').length;
                  
                  return (
                    <TableRow key={mov.id} className={getRowStatusClass(mov.statusMovimentacao)}>
                      <TableCell className="font-mono font-medium">{mov.id}</TableCell>
                      <TableCell>
                        {format(new Date(mov.dataHoraLancamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{mov.responsavelLancamento}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{mov.itens.length} itens</p>
                          <p className="text-muted-foreground text-xs">
                            {itensEnviados > 0 && <span className="text-yellow-600">{itensEnviados} pend.</span>}
                            {itensDevolvidos > 0 && <span className="text-green-600 ml-1">{itensDevolvidos} dev.</span>}
                            {itensVendidos > 0 && <span className="text-blue-600 ml-1">{itensVendidos} vend.</span>}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(mov.statusMovimentacao)}</TableCell>
                      <TableCell>
                        {mov.statusMovimentacao === 'Concluída' ? (
                          <span className="text-muted-foreground">--</span>
                        ) : (
                          <TimerRegressivo dataLimite={mov.dataHoraLimiteRetorno} />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleAbrirDetalhes(mov, false)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {mov.statusMovimentacao !== 'Concluída' && (
                            <Button 
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAbrirDetalhes(mov, true)}
                              title="Conferir"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ResponsiveTableContainer>
      </div>
      
      {/* Modal Nova Movimentação */}
      <Dialog open={isNovaMovimentacaoOpen} onOpenChange={setIsNovaMovimentacaoOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Nova Movimentação - Estoque SIA → Loja Matriz
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Origem e Destino fixos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Origem (Fixo)</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center">
                    <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">{nomeOrigem}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Destino (Fixo)</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center">
                    <ArrowRight className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">{nomeDestino}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Responsável pelo Lançamento</Label>
                  <Select value={responsavelLancamento} onValueChange={setResponsavelLancamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradores.map(col => (
                        <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              {/* Selecionar aparelhos */}
              <div className="space-y-2">
                <Label>Selecionar Aparelhos do Estoque - SIA</Label>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setIsModalSelecionarOpen(true)}
                >
                  <Search className="h-4 w-4" />
                  Buscar Aparelho no Estoque
                  {produtosDisponiveis.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">{produtosDisponiveis.length} disponíveis</Badge>
                  )}
                </Button>
              </div>
              
              {/* Lista de itens selecionados */}
              {itensParaEnviar.length > 0 && (
                <div className="space-y-2">
                  <Label>Aparelhos Selecionados ({itensParaEnviar.length})</Label>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {itensParaEnviar.map(item => (
                        <div 
                          key={item.aparelhoId}
                          className="flex items-center justify-between p-3 border rounded-md bg-primary/5"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.modelo}</p>
                              <Badge variant="outline">{item.cor}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">IMEI: {item.imei}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive"
                            onClick={() => handleRemoverProduto(item.aparelhoId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsNovaMovimentacaoOpen(false); handleLimparNovaMovimentacao(); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRegistrarLancamento}
              disabled={!responsavelLancamento || itensParaEnviar.length === 0}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Registrar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Detalhes/Conferência */}
      <Dialog open={isDetalheDialogOpen} onOpenChange={setIsDetalheDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isConferenciaMode ? (
                <>
                  <Edit className="h-5 w-5" />
                  Conferir Retorno - {movimentacaoSelecionada?.id}
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5" />
                  Detalhes - {movimentacaoSelecionada?.id}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {movimentacaoSelecionada && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {/* Info da movimentação */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div className="mt-1">{getStatusBadge(movimentacaoSelecionada.statusMovimentacao)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Destino:</span>
                        <p className="font-medium">{obterNomeLoja(movimentacaoSelecionada.lojaDestinoId)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Responsável:</span>
                        <p className="font-medium">{movimentacaoSelecionada.responsavelLancamento}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prazo (até 22:00):</span>
                        <div className="mt-1">
                          {movimentacaoSelecionada.statusMovimentacao !== 'Concluída' ? (
                            <TimerRegressivo dataLimite={movimentacaoSelecionada.dataHoraLimiteRetorno} />
                          ) : (
                            <span className="text-green-500 font-medium">Finalizado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Modo Conferência - Formato de Lista */}
                {isConferenciaMode ? (
                  <div className="space-y-4">
                    {/* Filtro para conferência */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        className="pl-10"
                        placeholder="Filtrar por IMEI ou Modelo..."
                        value={buscaConferencia}
                        onChange={(e) => setBuscaConferencia(e.target.value)}
                      />
                    </div>
                    
                    {/* Resumo de status */}
                    <div className="flex items-center gap-4 p-3 rounded-md bg-muted/50">
                      <span className="text-sm font-medium">Resumo:</span>
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {movimentacaoSelecionada.itens.filter(i => i.statusItem === 'Enviado').length} Pendente(s)
                      </Badge>
                      <Badge className="gap-1 bg-green-500">
                        <CheckCircle className="h-3 w-3" />
                        {movimentacaoSelecionada.itens.filter(i => i.statusItem === 'Devolvido').length} Devolvido(s)
                      </Badge>
                      {movimentacaoSelecionada.itens.filter(i => i.statusItem === 'Vendido').length > 0 && (
                        <Badge className="gap-1 bg-blue-500">
                          {movimentacaoSelecionada.itens.filter(i => i.statusItem === 'Vendido').length} Vendido(s)
                        </Badge>
                      )}
                    </div>
                    
                    {/* Lista de aparelhos */}
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-2">
                        {itensFiltradosConferencia
                          .sort((a, b) => {
                            const ordem = { 'Enviado': 0, 'Devolvido': 1, 'Vendido': 2 };
                            return ordem[a.statusItem] - ordem[b.statusItem];
                          })
                          .map(item => {
                            const isPendente = item.statusItem === 'Enviado';
                            const isDevolvido = item.statusItem === 'Devolvido';
                            const isVendido = item.statusItem === 'Vendido';
                            
                            return (
                              <div 
                                key={item.aparelhoId}
                                className={`flex items-center justify-between p-3 border rounded-md transition-colors ${
                                  isPendente 
                                    ? 'bg-destructive/10 border-destructive/50 ring-1 ring-destructive/30' 
                                    : isDevolvido 
                                      ? 'bg-green-500/10 border-green-500/30' 
                                      : 'bg-blue-500/10 border-blue-500/30'
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{item.modelo}</p>
                                    <Badge variant="outline">{item.cor}</Badge>
                                    {getStatusItemBadge(item.statusItem)}
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono">IMEI: {item.imei}</span>
                                    {item.dataHoraRetorno && (
                                      <span>Devolvido em {format(new Date(item.dataHoraRetorno), "dd/MM 'às' HH:mm")}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isPendente ? (
                                    <Button 
                                      size="sm"
                                      onClick={() => handleRegistrarRetorno(item.aparelhoId)}
                                      className="gap-1"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Confirmar Devolução
                                    </Button>
                                  ) : (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      {isDevolvido && <CheckCircle className="h-4 w-4 text-green-500" />}
                                      {isVendido && <Package className="h-4 w-4 text-blue-500" />}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  // Modo Visualização - Tabela simples
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IMEI</TableHead>
                          <TableHead>Modelo</TableHead>
                          <TableHead>Cor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimentacaoSelecionada.itens.map(item => (
                          <TableRow key={item.aparelhoId}>
                            <TableCell className="font-mono text-xs">{item.imei}</TableCell>
                            <TableCell>{item.modelo}</TableCell>
                            <TableCell>{item.cor}</TableCell>
                            <TableCell>
                              {getStatusItemBadge(item.statusItem)}
                              {item.dataHoraRetorno && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(item.dataHoraRetorno), 'dd/MM HH:mm')}
                                </p>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {/* Timeline */}
                <div className="space-y-2">
                  <Label>Timeline</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {movimentacaoSelecionada.timeline.map(entry => (
                      <div key={entry.id} className="flex gap-3 text-sm border-l-2 border-muted pl-3 py-1">
                        <span className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.data), 'dd/MM HH:mm')}
                        </span>
                        <div>
                          <p className="font-medium">{entry.titulo}</p>
                          <p className="text-muted-foreground">{entry.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetalheDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal Selecionar Aparelhos */}
      <Dialog open={isModalSelecionarOpen} onOpenChange={setIsModalSelecionarOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Selecionar Aparelhos - {nomeOrigem}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-10"
                placeholder="Buscar por IMEI ou modelo..."
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
              />
            </div>
            
            {/* Lista de produtos */}
            <ScrollArea className="h-[400px]">
              {produtosDisponiveis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum aparelho disponível no {nomeOrigem}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {produtosDisponiveis.map(produto => {
                    const jaSelecionado = itensParaEnviar.some(i => i.aparelhoId === produto.id);
                    return (
                      <div 
                        key={produto.id}
                        className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${
                          jaSelecionado 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => !jaSelecionado && handleAdicionarProduto(produto)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{produto.marca} {produto.modelo}</p>
                            <Badge variant="outline">{produto.cor}</Badge>
                            <Badge variant={produto.tipo === 'Novo' ? 'default' : 'secondary'}>
                              {produto.tipo}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="font-mono">IMEI: {produto.imei}</span>
                            <span>Custo: R$ {produto.valorCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span>Bateria: {produto.saudeBateria}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {jaSelecionado ? (
                            <Badge className="bg-primary">Selecionado</Badge>
                          ) : (
                            <Button size="sm" variant="ghost">
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            
            {/* Resumo dos selecionados */}
            {itensParaEnviar.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  {itensParaEnviar.length} aparelho(s) selecionado(s)
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setItensParaEnviar([])}
                >
                  Limpar Seleção
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsModalSelecionarOpen(false); setBuscaProduto(''); }}>
              Cancelar
            </Button>
            <Button onClick={() => { setIsModalSelecionarOpen(false); setBuscaProduto(''); }}>
              Confirmar Seleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EstoqueLayout>
  );
}
