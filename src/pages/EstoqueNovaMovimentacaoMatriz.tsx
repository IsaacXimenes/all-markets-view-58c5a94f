import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Building, 
  Plus, 
  X, 
  ArrowRight,
  Package,
  Search,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { 
  criarMovimentacaoMatriz,
  getProdutosDisponivelMatriz,
  getMatrizLojaId,
  getEstoqueSiaId,
  Produto
} from '@/utils/estoqueApi';

export default function EstoqueNovaMovimentacaoMatriz() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { obterNomeLoja, obterColaboradoresAtivos, obterNomeColaborador } = useCadastroStore();
  
  // IDs fixos para origem e destino
  const estoqueSiaId = getEstoqueSiaId();
  const matrizId = getMatrizLojaId();
  
  // Estados do formulário
  const [buscaProduto, setBuscaProduto] = useState('');
  const [itensParaEnviar, setItensParaEnviar] = useState<Array<{ aparelhoId: string; imei: string; modelo: string; cor: string }>>([]);
  const [responsavelLancamento, setResponsavelLancamento] = useState('');
  const [isModalSelecionarOpen, setIsModalSelecionarOpen] = useState(false);
  
  // Produtos disponíveis no Estoque - SIA
  const produtosDisponiveis = useMemo(() => {
    const disponiveis = getProdutosDisponivelMatriz();
    if (!buscaProduto) return disponiveis;
    
    const termo = buscaProduto.toLowerCase();
    return disponiveis.filter(p => 
      p.imei.toLowerCase().includes(termo) ||
      p.modelo.toLowerCase().includes(termo)
    );
  }, [buscaProduto]);
  
  // Colaboradores para responsável
  const colaboradores = obterColaboradoresAtivos();
  
  // Nomes das lojas fixas
  const nomeOrigem = obterNomeLoja(estoqueSiaId) || 'Estoque - SIA';
  const nomeDestino = obterNomeLoja(matrizId) || 'Loja - Matriz';
  
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
    
    // Voltar para lista
    navigate('/estoque/movimentacoes-matriz');
  };
  
  // Limpar formulário
  const handleLimparFormulario = () => {
    setItensParaEnviar([]);
    setResponsavelLancamento('');
    setBuscaProduto('');
  };

  // Calcular limite de retorno para exibição
  const calcularLimiteRetorno = () => {
    const agora = new Date();
    const limite = new Date(agora);
    limite.setHours(22, 0, 0, 0);
    if (agora.getHours() >= 22) {
      limite.setDate(limite.getDate() + 1);
    }
    return limite;
  };

  const limiteRetorno = calcularLimiteRetorno();
  const limiteFormatado = limiteRetorno.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ' às 22:00';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/estoque/movimentacoes-matriz')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Nova Movimentação - Matriz
              </h1>
              <p className="text-sm text-muted-foreground">
                Registrar envio de aparelhos do Estoque SIA para a Loja Matriz
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Prazo de retorno: <strong className="text-foreground">{limiteFormatado}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Formulário */}
          <div className="lg:col-span-2 space-y-6">
            {/* Origem e Destino */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados da Movimentação</CardTitle>
              </CardHeader>
              <CardContent>
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
                    <Label>Responsável pelo Lançamento *</Label>
                    <Select value={responsavelLancamento} onValueChange={setResponsavelLancamento}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        {colaboradores.map(col => (
                          <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seleção de Aparelhos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Selecionar Aparelhos</CardTitle>
                <Button 
                  variant="outline"
                  className="gap-2"
                  onClick={() => setIsModalSelecionarOpen(true)}
                >
                  <Search className="h-4 w-4" />
                  Buscar Aparelho no Estoque
                  {produtosDisponiveis.length > 0 && (
                    <Badge variant="secondary">{produtosDisponiveis.length}</Badge>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {itensParaEnviar.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhum aparelho selecionado</p>
                    <p className="text-sm">Clique em "Buscar Aparelho no Estoque" para adicionar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itensParaEnviar.map(item => (
                      <div 
                        key={item.aparelhoId}
                        className="flex items-center justify-between p-4 border rounded-lg bg-primary/5"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.modelo}</p>
                            <Badge variant="outline">{item.cor}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-mono mt-1">IMEI: {item.imei}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoverProduto(item.aparelhoId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita - Resumo */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Resumo do Lançamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Origem:</span>
                    <span className="font-medium">{nomeOrigem}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Destino:</span>
                    <span className="font-medium">{nomeDestino}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Responsável:</span>
                    <span className="font-medium">
                      {responsavelLancamento 
                        ? obterNomeColaborador(responsavelLancamento) 
                        : '-'
                      }
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total de aparelhos:</span>
                    <Badge variant="secondary" className="text-base">{itensParaEnviar.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prazo de retorno:</span>
                    <span className="font-medium text-yellow-600">{limiteFormatado}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button 
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleRegistrarLancamento}
                    disabled={!responsavelLancamento || itensParaEnviar.length === 0}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Registrar Lançamento
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleLimparFormulario}
                    >
                      Limpar
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate('/estoque/movimentacoes-matriz')}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setItensParaEnviar([])}
                  >
                    Limpar Seleção
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setIsModalSelecionarOpen(false)}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
