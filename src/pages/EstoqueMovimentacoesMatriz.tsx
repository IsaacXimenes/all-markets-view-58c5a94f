import React, { useState, useEffect, useMemo } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Timer
} from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { 
  getMovimentacoesMatriz,
  getMovimentacaoMatrizById,
  criarMovimentacaoMatriz,
  registrarRetornoItemMatriz,
  getProdutosDisponivelMatriz,
  getMatrizLojaId,
  MovimentacaoMatriz,
  MovimentacaoMatrizItem,
  Produto
} from '@/utils/estoqueApi';

// Componente Timer
const TimerRegressivo = ({ dataLimite }: { dataLimite: string }) => {
  const [tempoRestante, setTempoRestante] = useState({ texto: '', cor: '', expirado: false });

  useEffect(() => {
    const calcular = () => {
      const agora = new Date();
      const limite = new Date(dataLimite);
      const diff = limite.getTime() - agora.getTime();

      if (diff <= 0) {
        return { expirado: true, texto: '00:00:00', cor: 'text-destructive animate-pulse' };
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
    <div className={`flex items-center gap-2 font-mono text-lg font-bold ${tempoRestante.cor}`}>
      <Timer className="h-5 w-5" />
      {tempoRestante.texto}
    </div>
  );
};

export default function EstoqueMovimentacoesMatriz() {
  const { toast } = useToast();
  const { obterLojasTipoLoja, obterNomeLoja, obterColaboradoresAtivos, obterNomeColaborador } = useCadastroStore();
  
  // Estados do formulário de lançamento
  const [lojaDestinoId, setLojaDestinoId] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [itensParaEnviar, setItensParaEnviar] = useState<Array<{ aparelhoId: string; imei: string; modelo: string; cor: string }>>([]);
  const [responsavelLancamento, setResponsavelLancamento] = useState('');
  
  // Estados de movimentações
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoMatriz[]>([]);
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
  
  // Obter lojas (excluindo Matriz)
  const matrizId = getMatrizLojaId();
  const lojasDestino = useMemo(() => 
    obterLojasTipoLoja().filter(l => l.id !== matrizId),
    [obterLojasTipoLoja, matrizId]
  );
  
  // Produtos disponíveis na Matriz
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
  
  // Gerar dados do cabeçalho automático
  const cabecalhoMovimentacao = useMemo(() => {
    const agora = new Date();
    const nextId = `MM-${format(agora, 'yyyyMMdd')}-XXXX`;
    return {
      id: nextId,
      dataHora: format(agora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      responsavel: obterNomeColaborador(responsavelLancamento) || 'Selecione o responsável'
    };
  }, [responsavelLancamento, obterNomeColaborador]);
  
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
    if (!lojaDestinoId) {
      toast({ title: 'Erro', description: 'Selecione a loja de destino', variant: 'destructive' });
      return;
    }
    if (!responsavelLancamento) {
      toast({ title: 'Erro', description: 'Selecione o responsável pelo lançamento', variant: 'destructive' });
      return;
    }
    if (itensParaEnviar.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos um aparelho', variant: 'destructive' });
      return;
    }
    
    const novaMovimentacao = criarMovimentacaoMatriz({
      lojaDestinoId,
      responsavelLancamento: obterNomeColaborador(responsavelLancamento),
      itens: itensParaEnviar
    });
    
    toast({ 
      title: 'Sucesso', 
      description: `Movimentação ${novaMovimentacao.id} registrada com ${itensParaEnviar.length} aparelho(s)` 
    });
    
    // Limpar formulário
    setLojaDestinoId('');
    setItensParaEnviar([]);
    setResponsavelLancamento('');
    setRefreshKey(prev => prev + 1);
  };
  
  // Abrir detalhes da movimentação
  const handleAbrirDetalhes = (mov: MovimentacaoMatriz) => {
    setMovimentacaoSelecionada(mov);
    setIsConferenciaMode(false);
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
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Aguardando Retorno</Badge>;
      case 'Concluída':
        return <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Concluída</Badge>;
      case 'Retorno Atrasado':
        return <Badge variant="destructive" className="gap-1 animate-pulse"><AlertTriangle className="h-3 w-3" /> Retorno Atrasado</Badge>;
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

  return (
    <EstoqueLayout title="Estoque - Movimentações - Matriz">
      <div className="space-y-6">
        {/* QUADRO 1: Cabeçalho da Movimentação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5" />
              Cabeçalho da Movimentação (Automático)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">ID Movimentação</Label>
                <p className="font-mono font-medium">{cabecalhoMovimentacao.id}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Data/Hora Lançamento</Label>
                <p className="font-medium">{cabecalhoMovimentacao.dataHora}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Responsável</Label>
                <p className="font-medium">{cabecalhoMovimentacao.responsavel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* QUADRO 2: Lançamento de Aparelhos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Lançamento de Aparelhos (Saída da Matriz)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loja de Destino</Label>
                <Select value={lojaDestinoId} onValueChange={setLojaDestinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojasDestino.map(loja => (
                      <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            
            <div className="space-y-2">
              <Label>Buscar Aparelho (IMEI ou Modelo)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="pl-10"
                    placeholder="Digite o IMEI ou modelo..."
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Lista de produtos encontrados */}
              {buscaProduto && produtosDisponiveis.length > 0 && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {produtosDisponiveis.slice(0, 5).map(produto => (
                    <div 
                      key={produto.id}
                      className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleAdicionarProduto(produto)}
                    >
                      <div>
                        <p className="font-medium text-sm">{produto.modelo} - {produto.cor}</p>
                        <p className="text-xs text-muted-foreground font-mono">{produto.imei}</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {buscaProduto && produtosDisponiveis.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum aparelho encontrado na Matriz</p>
              )}
            </div>
            
            {/* Lista de itens a enviar */}
            {itensParaEnviar.length > 0 && (
              <div className="space-y-2">
                <Label>Aparelhos Selecionados ({itensParaEnviar.length})</Label>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IMEI</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Cor</TableHead>
                        <TableHead className="text-center w-20">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensParaEnviar.map(item => (
                        <TableRow key={item.aparelhoId}>
                          <TableCell className="font-mono text-xs">{item.imei}</TableCell>
                          <TableCell>{item.modelo}</TableCell>
                          <TableCell>{item.cor}</TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive"
                              onClick={() => handleRemoverProduto(item.aparelhoId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                onClick={handleRegistrarLancamento}
                disabled={!lojaDestinoId || !responsavelLancamento || itensParaEnviar.length === 0}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Registrar Lançamento
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* QUADRO 3: Aparelhos em Retorno */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Aparelhos em Retorno (Conferência)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {movimentacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma movimentação registrada</p>
                <p className="text-sm">Registre um lançamento acima para iniciar o controle</p>
              </div>
            ) : (
              <div className="space-y-4">
                {movimentacoes.map(mov => {
                  const itensEnviados = mov.itens.filter(i => i.statusItem === 'Enviado').length;
                  const itensDevolvidos = mov.itens.filter(i => i.statusItem === 'Devolvido').length;
                  const itensVendidos = mov.itens.filter(i => i.statusItem === 'Vendido').length;
                  
                  return (
                    <Card key={mov.id} className={mov.statusMovimentacao === 'Retorno Atrasado' ? 'border-destructive' : ''}>
                      <CardContent className="pt-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium">{mov.id}</span>
                              {getStatusBadge(mov.statusMovimentacao)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Destino: <span className="font-medium text-foreground">{obterNomeLoja(mov.lojaDestinoId)}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Lançado em {format(new Date(mov.dataHoraLancamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por {mov.responsavelLancamento}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {mov.statusMovimentacao !== 'Concluída' && (
                              <TimerRegressivo dataLimite={mov.dataHoraLimiteRetorno} />
                            )}
                            <div className="text-sm text-right">
                              <p>Total: {mov.itens.length}</p>
                              <p className="text-muted-foreground">
                                {itensEnviados > 0 && <span className="text-yellow-500">{itensEnviados} enviado(s)</span>}
                                {itensDevolvidos > 0 && <span className="text-green-500 ml-2">{itensDevolvidos} devolvido(s)</span>}
                                {itensVendidos > 0 && <span className="text-blue-500 ml-2">{itensVendidos} vendido(s)</span>}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAbrirDetalhes(mov)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Detalhar
                            </Button>
                            {mov.statusMovimentacao !== 'Concluída' && (
                              <Button 
                                size="sm"
                                onClick={() => {
                                  handleAbrirDetalhes(mov);
                                  setIsConferenciaMode(true);
                                }}
                                className="gap-1"
                              >
                                <Edit className="h-4 w-4" />
                                Conferir
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
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
                        <span className="text-muted-foreground">Timer:</span>
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
                
                {/* Filtro para conferência */}
                {isConferenciaMode && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="pl-10"
                      placeholder="Filtrar por IMEI ou Modelo..."
                      value={buscaConferencia}
                      onChange={(e) => setBuscaConferencia(e.target.value)}
                    />
                  </div>
                )}
                
                {/* Lista de itens */}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IMEI</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Cor</TableHead>
                        <TableHead>Status</TableHead>
                        {isConferenciaMode && <TableHead className="text-center">Ação</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensFiltradosConferencia.map(item => (
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
                          {isConferenciaMode && (
                            <TableCell className="text-center">
                              {item.statusItem === 'Enviado' ? (
                                <Button 
                                  size="sm"
                                  onClick={() => handleRegistrarRetorno(item.aparelhoId)}
                                  className="gap-1"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Devolvido
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
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
    </EstoqueLayout>
  );
}
