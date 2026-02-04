import React, { useState, useEffect, useMemo } from 'react';
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
  Timer
} from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { 
  getMovimentacaoMatrizById,
  registrarRetornoItemMatriz,
  MovimentacaoMatriz,
  MovimentacaoMatrizItem
} from '@/utils/estoqueApi';
import { formatIMEI } from '@/utils/imeiMask';

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
  
  const colaboradores = obterColaboradoresAtivos();
  
  // Carregar movimentação
  useEffect(() => {
    if (id) {
      const mov = getMovimentacaoMatrizById(id);
      setMovimentacao(mov);
      setIsLoading(false);
    }
  }, [id]);
  
  // Separar itens por status
  const itensRelacaoOriginal = useMemo(() => movimentacao?.itens || [], [movimentacao]);
  const itensConferidos = useMemo(() => movimentacao?.itens.filter(i => i.statusItem === 'Devolvido') || [], [movimentacao]);
  const itensPendentes = useMemo(() => movimentacao?.itens.filter(i => i.statusItem === 'Enviado') || [], [movimentacao]);
  
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
      setMovimentacao(resultado.movimentacao!);
      setImeiDevolucao('');
      setShowDevolucaoModal(false);
    } else {
      toast({ title: 'Erro', description: resultado.mensagem, variant: 'destructive' });
    }
  };
  
  // Desfazer conferência (marcar como pendente novamente)
  const handleDesfazerConferencia = (aparelhoId: string) => {
    if (!movimentacao) return;
    
    // Por enquanto, apenas mostrar toast - função completa requer implementação no API
    toast({ 
      title: 'Ação não disponível', 
      description: 'Funcionalidade de desfazer conferência em desenvolvimento', 
      variant: 'destructive' 
    });
  };
  
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
            {movimentacao.statusMovimentacao !== 'Concluída' && (
              <TimerRegressivo dataLimite={movimentacao.dataHoraLimiteRetorno} />
            )}
            <Badge className={
              movimentacao.statusMovimentacao === 'Concluída' ? 'bg-green-600' :
              movimentacao.statusMovimentacao === 'Retorno Atrasado' ? 'bg-destructive' :
              'bg-yellow-500'
            }>
              {movimentacao.statusMovimentacao}
            </Badge>
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
              <ScrollArea className="h-[400px]">
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
                        className="p-3 rounded-lg border bg-green-500/10 border-green-500/30"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{item.modelo}</p>
                            <p className="text-xs text-muted-foreground font-mono">{formatIMEI(item.imei)}</p>
                            {item.dataHoraRetorno && (
                              <p className="text-xs text-green-600 mt-1">
                                {format(new Date(item.dataHoraRetorno), "dd/MM HH:mm")} - {item.responsavelRetorno}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDesfazerConferencia(item.aparelhoId)}
                            className="text-destructive hover:text-destructive"
                            title="Desfazer Conferência"
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
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
              {movimentacao.statusMovimentacao !== 'Concluída' && (
                <Button 
                  className="w-full mb-4 gap-2"
                  onClick={() => setShowDevolucaoModal(true)}
                  disabled={itensPendentes.length === 0}
                >
                  <Search className="h-4 w-4" />
                  Registrar Devolução
                </Button>
              )}
              
              <ScrollArea className="h-[340px]">
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
      </div>
      
      {/* Modal de Devolução */}
      <Dialog open={showDevolucaoModal} onOpenChange={setShowDevolucaoModal}>
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
              <Input
                placeholder="Informe ou escaneie o IMEI..."
                value={imeiDevolucao}
                onChange={(e) => setImeiDevolucao(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label>Responsável pela Conferência</Label>
              <Select value={responsavelDevolucao} onValueChange={setResponsavelDevolucao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
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
                      onClick={() => setImeiDevolucao(item.imei)}
                    >
                      <span className="font-medium">{item.modelo}</span>
                      <span className="text-muted-foreground ml-2 font-mono text-xs">{item.imei}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDevolucaoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegistrarDevolucao} disabled={!imeiDevolucao}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Registrar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EstoqueLayout>
  );
}
