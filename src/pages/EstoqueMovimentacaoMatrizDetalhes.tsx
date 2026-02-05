import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Package, 
  Search,
  Undo2,
  Timer,
  Camera,
  History
} from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { 
  getMovimentacaoMatrizById,
  registrarRetornoItemMatriz,
  desfazerRetornoItemMatriz,
  verificarStatusMovimentacoesMatriz,
  conferirItensAutomaticamentePorVenda,
  MovimentacaoMatriz,
  MovimentacaoMatrizItem
} from '@/utils/estoqueApi';
import { formatIMEI } from '@/utils/imeiMask';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';

// Timer Regressivo
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
    <div className={`flex items-center gap-1 font-mono text-xl font-bold ${tempoRestante.cor}`}>
      <Timer className="h-5 w-5" />
      {tempoRestante.texto}
    </div>
  );
};

// Função para obter badge de status
const getStatusBadge = (status: MovimentacaoMatriz['statusMovimentacao']) => {
  switch (status) {
    case 'Pendente':
      return <Badge className="bg-yellow-500 gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
    case 'Atrasado':
      return <Badge variant="destructive" className="gap-1 animate-pulse"><AlertTriangle className="h-3 w-3" /> Atrasado</Badge>;
    case 'Finalizado - Dentro do Prazo':
      return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Dentro do Prazo</Badge>;
    case 'Finalizado - Atrasado':
      return <Badge className="bg-orange-500 gap-1"><CheckCircle className="h-3 w-3" /> Finalizado Atrasado</Badge>;
  }
};

export default function EstoqueMovimentacaoMatrizDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { obterNomeLoja, obterColaboradoresAtivos, obterNomeColaborador } = useCadastroStore();
  
  const [movimentacao, setMovimentacao] = useState<MovimentacaoMatriz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDevolucaoModal, setShowDevolucaoModal] = useState(false);
  const [imeiDevolucao, setImeiDevolucao] = useState('');
  const [responsavelDevolucao, setResponsavelDevolucao] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  
  const colaboradores = obterColaboradoresAtivos();
  
  // Carregar movimentação e verificar status + conferência automática
  useEffect(() => {
    if (id) {
      // Verificar status de todas as movimentações primeiro
      verificarStatusMovimentacoesMatriz();
      
      // Tentar conferir itens automaticamente por venda
      const { movimentacao: movAtualizada, itensConferidos } = 
        conferirItensAutomaticamentePorVenda(id, obterNomeColaborador);
      
      if (movAtualizada) {
        setMovimentacao(movAtualizada);
        
        // Mostrar toast se houver conferências automáticas
        if (itensConferidos.length > 0) {
          toast({
            title: 'Conferência Automática',
            description: `${itensConferidos.length} item(ns) conferido(s) automaticamente via vendas realizadas`,
          });
        }
      } else {
        const mov = getMovimentacaoMatrizById(id);
        setMovimentacao(mov);
      }
      
      setIsLoading(false);
    }
  }, [id]);
  
  // Separar itens por status (inclui status 'Vendido' como conferido)
  const itensRelacaoOriginal = movimentacao?.itens ?? [];
  const itensConferidos = itensRelacaoOriginal.filter(i => i.statusItem === 'Devolvido' || i.statusItem === 'Vendido');
  const itensPendentes = itensRelacaoOriginal.filter(i => i.statusItem === 'Enviado');

  const cloneMovimentacao = (mov: MovimentacaoMatriz): MovimentacaoMatriz => ({
    ...mov,
    itens: mov.itens.map(i => ({ ...i })),
    timeline: mov.timeline.map(t => ({ ...t })),
  });

  // Fechar modal e limpar campos
  const handleCloseModal = () => {
    setImeiDevolucao('');
    setResponsavelDevolucao('');
    setShowDevolucaoModal(false);
  };
  
  // Registrar devolução
  const handleRegistrarDevolucao = () => {
    if (!movimentacao || !imeiDevolucao) {
      toast({ title: 'Erro', description: 'Informe o IMEI do aparelho', variant: 'destructive' });
      return;
    }
    
    // Buscar item pelo IMEI
    const item = itensPendentes.find(i => i.imei === imeiDevolucao.replace(/\D/g, ''));
    if (!item) {
      toast({ title: 'Erro', description: 'IMEI não encontrado nos itens pendentes', variant: 'destructive' });
      return;
    }
    
    const resultado = registrarRetornoItemMatriz(
      movimentacao.id,
      item.aparelhoId,
      obterNomeColaborador(responsavelDevolucao) || 'Sistema'
    );
    
    if (resultado.sucesso) {
      toast({ title: 'Sucesso', description: 'Devolução registrada com sucesso' });
      setMovimentacao(cloneMovimentacao(resultado.movimentacao!));
      handleCloseModal();
    } else {
      toast({ title: 'Erro', description: resultado.mensagem, variant: 'destructive' });
    }
  };
  
  // Desfazer conferência
  const handleDesfazerConferencia = (aparelhoId: string) => {
    if (!movimentacao) return;
    
    const resultado = desfazerRetornoItemMatriz(
      movimentacao.id,
      aparelhoId,
      'Sistema'
    );
    
    if (resultado.sucesso) {
      toast({ title: 'Sucesso', description: 'Conferência desfeita - item retornou para Pendentes' });
      setMovimentacao(cloneMovimentacao(resultado.movimentacao!));
    } else {
      toast({ title: 'Erro', description: resultado.mensagem, variant: 'destructive' });
    }
  };

  // Verificar se movimentação está finalizada
  const isMovimentacaoFinalizada = movimentacao?.statusMovimentacao.startsWith('Finalizado');
  
  if (isLoading) {
    return (
      <EstoqueLayout title="Carregando...">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando movimentação...</p>
        </div>
      </EstoqueLayout>
    );
  }
  
  if (!movimentacao) {
    return (
      <EstoqueLayout title="Não encontrada">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Movimentação não encontrada (ID: {id})</p>
          <Button onClick={() => navigate('/estoque/movimentacoes-matriz')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </EstoqueLayout>
    );
  }
  
  return (
    <EstoqueLayout title={`Detalhes - ${movimentacao.id}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/estoque/movimentacoes-matriz')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">{movimentacao.id}</h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(movimentacao.dataHoraLancamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {!isMovimentacaoFinalizada && (
              <TimerRegressivo dataLimite={movimentacao.dataHoraLimiteRetorno} />
            )}
            {getStatusBadge(movimentacao.statusMovimentacao)}
          </div>
        </div>
        
        {/* Info da Movimentação */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Destino:</span>
                <p className="font-medium">{obterNomeLoja(movimentacao.lojaDestinoId)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Responsável:</span>
                <p className="font-medium">{movimentacao.responsavelLancamento}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total de Itens:</span>
                <p className="font-medium">{movimentacao.itens.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Prazo:</span>
                <p className="font-medium">
                  {format(new Date(movimentacao.dataHoraLimiteRetorno), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 3 Quadros de Conferência */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quadro 1: Relação Original */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Relação Original
                <Badge variant="secondary">{itensRelacaoOriginal.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {itensRelacaoOriginal.map(item => (
                    <div 
                      key={item.aparelhoId}
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.modelo}</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatIMEI(item.imei)}</p>
                        </div>
                        <Badge variant={
                          item.statusItem === 'Devolvido' ? 'default' :
                          item.statusItem === 'Vendido' ? 'secondary' :
                          'outline'
                        } className={item.statusItem === 'Devolvido' ? 'bg-green-600' : ''}>
                          {item.statusItem}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Quadro 2: Conferidos (Retornaram) */}
          <Card className="border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                Conferidos (Retornaram)
                <Badge className="bg-green-600">{itensConferidos.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isMovimentacaoFinalizada && itensPendentes.length > 0 && (
                <Button 
                  className="w-full mb-4 gap-2"
                  onClick={() => setShowDevolucaoModal(true)}
                >
                  <Search className="h-4 w-4" />
                  Registrar Devolução
                </Button>
              )}
              
              <ScrollArea className="h-[340px]">
                {itensConferidos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum item conferido</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {itensConferidos.map(item => (
                      <div 
                        key={item.aparelhoId}
                        className={`p-3 rounded-lg border ${
                          item.conferenciaAutomatica 
                            ? 'bg-blue-500/10 border-blue-500/30' 
                            : 'bg-green-500/10 border-green-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{item.modelo}</p>
                            <p className="text-xs text-muted-foreground font-mono">{formatIMEI(item.imei)}</p>
                            
                            {item.conferenciaAutomatica && item.vendaId && (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-xs text-blue-600">
                                  <strong>Venda:</strong> {item.vendaId}
                                </p>
                                <p className="text-xs text-blue-600">
                                  <strong>Vendedor:</strong> {item.vendedorNome}
                                </p>
                              </div>
                            )}
                            
                            {!item.conferenciaAutomatica && item.dataHoraRetorno && (
                              <p className="text-xs text-green-600 mt-1">
                                {format(new Date(item.dataHoraRetorno), "dd/MM HH:mm")} - {item.responsavelRetorno}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {item.conferenciaAutomatica ? (
                              <Badge className="bg-blue-600 text-xs">Venda Automática</Badge>
                            ) : (
                              <Badge className="bg-green-600 text-xs">Devolvido</Badge>
                            )}
                            {!isMovimentacaoFinalizada && !item.conferenciaAutomatica && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDesfazerConferencia(item.aparelhoId)}
                                className="text-destructive hover:text-destructive"
                                title="Desfazer Conferência"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Quadro 3: Pendentes de Retorno */}
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                Pendentes de Retorno
                <Badge className="bg-yellow-500">{itensPendentes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {itensPendentes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30 text-green-500" />
                    <p className="text-sm text-green-600">Todos os itens retornaram!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {itensPendentes.map(item => (
                      <div 
                        key={item.aparelhoId}
                        className="p-3 rounded-lg border bg-yellow-500/10 border-yellow-500/30"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{item.modelo}</p>
                            <p className="text-xs text-muted-foreground font-mono">{formatIMEI(item.imei)}</p>
                            <Badge variant="outline" className="mt-1 text-xs">{item.cor}</Badge>
                          </div>
                          <Clock className="h-4 w-4 text-yellow-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Quadro 4: Histórico de Ações */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de Ações
              <Badge variant="secondary">{movimentacao.timeline.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {movimentacao.timeline.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum registro</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {movimentacao.timeline.map(entry => (
                    <div 
                      key={entry.id}
                      className="flex gap-4 py-3 border-b last:border-0"
                    >
                      <div className="text-sm text-muted-foreground whitespace-nowrap min-w-[120px]">
                        {format(new Date(entry.data), "dd/MM/yyyy HH:mm")}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.titulo}</p>
                        <p className="text-xs text-muted-foreground">{entry.descricao}</p>
                        {entry.responsavel && (
                          <p className="text-xs text-primary mt-0.5">Por: {entry.responsavel}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Modal de Devolução */}
      <Dialog open={showDevolucaoModal} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Registrar Devolução
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>IMEI do Aparelho *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Informe ou escaneie o IMEI..."
                  value={imeiDevolucao}
                  onChange={(e) => setImeiDevolucao(formatIMEI(e.target.value))}
                  autoFocus
                  maxLength={18}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  type="button"
                  onClick={() => setShowScanner(true)}
                  title="Escanear IMEI"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Responsável pela Conferência</Label>
              <Select value={responsavelDevolucao} onValueChange={setResponsavelDevolucao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {colaboradores.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Lista de pendentes para referência */}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">Itens pendentes ({itensPendentes.length}):</p>
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {itensPendentes.map(item => (
                    <div 
                      key={item.aparelhoId}
                      className="p-2 text-sm bg-muted rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => setImeiDevolucao(formatIMEI(item.imei))}
                    >
                      <span className="font-medium">{item.modelo}</span>
                      <span className="text-muted-foreground ml-2 font-mono text-xs">{formatIMEI(item.imei)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Cancelar</Button>
            <Button onClick={handleRegistrarDevolucao}>Confirmar Devolução</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanner de Código de Barras */}
      <BarcodeScanner
        open={showScanner}
        onScan={(code) => {
          setImeiDevolucao(formatIMEI(code));
          setShowScanner(false);
        }}
        onClose={() => setShowScanner(false)}
      />
    </EstoqueLayout>
  );
}
