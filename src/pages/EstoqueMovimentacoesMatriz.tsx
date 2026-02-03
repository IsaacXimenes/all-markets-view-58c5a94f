import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ResponsiveTableContainer, ResponsiveFilterGrid } from '@/components/ui/ResponsiveContainers';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Edit,
  Search,
  Package,
  Timer,
  Download
} from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { 
  getMovimentacoesMatriz,
  registrarRetornoItemMatriz,
  MovimentacaoMatriz,
  MovimentacaoMatrizItem
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  
  // Estados da tabela e filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoMatriz[]>([]);
  
  // Estados de detalhes/conferência
  const [movimentacaoSelecionada, setMovimentacaoSelecionada] = useState<MovimentacaoMatriz | null>(null);
  const [isDetalheDialogOpen, setIsDetalheDialogOpen] = useState(false);
  const [isConferenciaMode, setIsConferenciaMode] = useState(false);
  const [buscaConferencia, setBuscaConferencia] = useState('');
  const [responsavelConferencia, setResponsavelConferencia] = useState('');
  
  // Refresh
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Carregar movimentações
  useEffect(() => {
    setMovimentacoes(getMovimentacoesMatriz());
  }, [refreshKey]);
  
  // Filtrar movimentações
  const movimentacoesFiltradas = useMemo(() => {
    let resultado = movimentacoes;
    if (filtroStatus) {
      resultado = resultado.filter(m => m.statusMovimentacao === filtroStatus);
    }
    return resultado;
  }, [movimentacoes, filtroStatus]);
  
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
      obterNomeColaborador(responsavelConferencia) || 'Sistema'
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
        return <Badge className="gap-1 bg-green-600 hover:bg-green-600"><CheckCircle className="h-3 w-3" /> Concluída</Badge>;
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
        return <Badge className="bg-green-600 hover:bg-green-600">Devolvido</Badge>;
      case 'Vendido':
        return <Badge className="bg-blue-600 hover:bg-blue-600">Vendido</Badge>;
    }
  };
  
  // Cor da linha baseada no status - vermelho se tem pendência (Aguardando ou Atrasado)
  const getRowStatusClass = (mov: MovimentacaoMatriz) => {
    const temPendencia = mov.itens.some(i => i.statusItem === 'Enviado');
    
    if (mov.statusMovimentacao === 'Concluída') {
      return 'bg-green-500/10';
    }
    
    // Se tem pendência (itens não devolvidos), linha vermelha
    if (temPendencia) {
      return 'bg-red-500/10';
    }
    
    return '';
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
                <Button onClick={() => navigate('/estoque/movimentacoes-matriz/nova')} className="gap-2">
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
                    <TableRow key={mov.id} className={getRowStatusClass(mov)}>
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
                            <span className="text-green-600 font-medium">Finalizado</span>
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
                      <Badge className="gap-1 bg-green-600 hover:bg-green-600">
                        <CheckCircle className="h-3 w-3" />
                        {movimentacaoSelecionada.itens.filter(i => i.statusItem === 'Devolvido').length} Devolvido(s)
                      </Badge>
                      {movimentacaoSelecionada.itens.filter(i => i.statusItem === 'Vendido').length > 0 && (
                        <Badge className="gap-1 bg-blue-600 hover:bg-blue-600">
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
                                      ? 'bg-green-500/10 border-green-600/30' 
                                      : 'bg-blue-500/10 border-blue-600/30'
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
                                      {isDevolvido && <CheckCircle className="h-4 w-4 text-green-600" />}
                                      {isVendido && <Package className="h-4 w-4 text-blue-600" />}
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
    </EstoqueLayout>
  );
}
