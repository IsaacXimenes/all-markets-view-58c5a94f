import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  Check, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  Save,
  Layers
} from 'lucide-react';
import { 
  getNotaEntradaById, 
  finalizarConferencia, 
  explodirProdutoNota,
  NotaEntrada,
  ProdutoNotaEntrada,
  podeRealizarAcao,
  TimelineNotaEntrada
} from '@/utils/notaEntradaFluxoApi';
import { getCores } from '@/utils/coresApi';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatUtils';
import { formatIMEI } from '@/utils/imeiMask';
import { InputComMascara } from '@/components/ui/InputComMascara';

export default function EstoqueNotaConferencia() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [nota, setNota] = useState<NotaEntrada | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(true);
  
  // Estado local para rastrear produtos marcados como conferidos (antes de salvar)
  const [produtosConferidos, setProdutosConferidos] = useState<Set<string>>(new Set());
  
  // Estado para campos editáveis inline (IMEI, Cor, Categoria) dos itens explodidos
  const [camposEditaveis, setCamposEditaveis] = useState<Record<string, { imei: string; cor: string; categoria: string }>>({});
  
  const coresCadastradas = useMemo(() => getCores(), []);
  const coresAtivas = useMemo(() => coresCadastradas.filter(c => c.status === 'Ativo'), [coresCadastradas]);

  useEffect(() => {
    if (id) {
      const notaData = getNotaEntradaById(id);
      setNota(notaData);
      
      // Inicializar com produtos já conferidos
      if (notaData) {
        const jaConferidos = new Set(
          notaData.produtos
            .filter(p => p.statusConferencia === 'Conferido')
            .map(p => p.id)
        );
        setProdutosConferidos(jaConferidos);
        
        // Inicializar campos editáveis para itens que precisam preenchimento
        const campos: Record<string, { imei: string; cor: string; categoria: string }> = {};
        notaData.produtos.forEach(p => {
          if (p.statusConferencia !== 'Conferido') {
            campos[p.id] = {
              imei: p.imei || '',
              cor: p.cor || '',
              categoria: p.categoria || ''
            };
          }
        });
        setCamposEditaveis(campos);
      }
      
      setIsLoading(false);
    }
  }, [id]);

  const progressoConferencia = useMemo(() => {
    if (!nota) return { conferidos: 0, total: 0, percentual: 0 };
    const total = nota.produtos.reduce((acc, p) => acc + p.quantidade, 0);
    const conferidos = Array.from(produtosConferidos).reduce((acc, pid) => {
      const p = nota.produtos.find(pr => pr.id === pid);
      return acc + (p?.quantidade || 0);
    }, 0);
    const percentual = total > 0 ? Math.round((conferidos / total) * 100) : 0;
    return { conferidos, total, percentual };
  }, [nota, produtosConferidos]);

  const getCorHex = (corNome: string) => {
    const cor = coresCadastradas.find(c => c.nome === corNome);
    return cor?.hexadecimal || '#888888';
  };

  // Verificar se um item precisa de campos preenchidos antes de poder ser conferido
  const itemPrecisaCampos = (produto: ProdutoNotaEntrada): boolean => {
    return produto.quantidade === 1 && produto.tipoProduto === 'Aparelho' && (!produto.imei || !produto.cor || !produto.categoria);
  };

  // Verificar se os campos editáveis do item estão preenchidos
  const camposPreenchidos = (produtoId: string, produto: ProdutoNotaEntrada): boolean => {
    if (!itemPrecisaCampos(produto)) return true;
    const campos = camposEditaveis[produtoId];
    if (!campos) return false;
    return !!(campos.imei && campos.cor && campos.categoria);
  };

  const atualizarCampoEditavel = (produtoId: string, campo: 'imei' | 'cor' | 'categoria', valor: string) => {
    setCamposEditaveis(prev => ({
      ...prev,
      [produtoId]: {
        ...prev[produtoId],
        [campo]: valor
      }
    }));
  };

  // Toggle local de conferência (não salva ainda)
  const handleToggleConferido = (produtoId: string) => {
    setProdutosConferidos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(produtoId)) {
        newSet.delete(produtoId);
      } else {
        newSet.add(produtoId);
      }
      return newSet;
    });
  };

  // Explodir item agrupado em unidades individuais
  const handleExplodirItem = (produtoId: string) => {
    if (!nota) return;
    
    const resultado = explodirProdutoNota(nota.id, produtoId, 'Carlos Estoque');
    if (resultado) {
      setNota(resultado);
      // Reinicializar campos editáveis para novos itens
      const campos: Record<string, { imei: string; cor: string; categoria: string }> = {};
      resultado.produtos.forEach(p => {
        if (p.statusConferencia !== 'Conferido') {
          campos[p.id] = {
            imei: p.imei || '',
            cor: p.cor || '',
            categoria: p.categoria || ''
          };
        }
      });
      setCamposEditaveis(campos);
      // Reset conferidos set since products changed
      const jaConferidos = new Set(
        resultado.produtos
          .filter(p => p.statusConferencia === 'Conferido')
          .map(p => p.id)
      );
      setProdutosConferidos(jaConferidos);
      toast.success('Item explodido em unidades individuais para conferência');
    } else {
      toast.error('Erro ao explodir item');
    }
  };

  // Salvar conferência - só aqui que confirma tudo
  const handleSalvarConferencia = () => {
    if (!nota) return;
    
    if (produtosConferidos.size === 0) {
      toast.error('Marque pelo menos um produto como conferido');
      return;
    }

    // Antes de salvar, atualizar os campos editáveis nos produtos da nota
    // (isso é feito in-memory antes de chamar finalizarConferencia)
    const notaAtual = getNotaEntradaById(nota.id);
    if (notaAtual) {
      for (const [produtoId, campos] of Object.entries(camposEditaveis)) {
        const produto = notaAtual.produtos.find(p => p.id === produtoId);
        if (produto && produtosConferidos.has(produtoId)) {
          if (campos.imei) produto.imei = campos.imei;
          if (campos.cor) produto.cor = campos.cor;
          if (campos.categoria) produto.categoria = campos.categoria as 'Novo' | 'Seminovo';
        }
      }
    }
    
    const produtosIds = Array.from(produtosConferidos);
    const resultado = finalizarConferencia(nota.id, produtosIds, 'Carlos Estoque');
    
    if (resultado) {
      setNota(resultado);
      toast.success(`${produtosIds.length} produto(s) conferido(s) com sucesso!`);
      
      // Verificar se finalizou 100%
      if (resultado.qtdConferida === resultado.qtdCadastrada) {
        toast.success('Conferência 100% concluída!', {
          description: resultado.tipoPagamento === 'Pagamento Pos' 
            ? 'Nota enviada para pagamento no Financeiro' 
            : 'Status da nota atualizado'
        });
        navigate('/estoque/notas-pendencias');
      }
    } else {
      toast.error('Erro ao salvar conferência');
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <EstoqueLayout title="Carregando...">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando nota...</p>
        </div>
      </EstoqueLayout>
    );
  }

  if (!nota) {
    return (
      <EstoqueLayout title="Nota não encontrada">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Nota não encontrada (ID: {id})</p>
          <Button onClick={() => navigate('/estoque/notas-pendencias')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Pendências
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  if (!podeRealizarAcao(nota, 'conferir', 'Estoque')) {
    return (
      <EstoqueLayout title="Ação não permitida">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Não é possível realizar conferência nesta nota (Status: {nota.status})
          </p>
          <Button onClick={() => navigate('/estoque/notas-pendencias')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Pendências
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  return (
    <EstoqueLayout title={`Conferência - ${nota.numeroNota}`}>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/estoque/notas-pendencias')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Pendências
        </Button>

        {/* Header com progresso */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Conferência de Produtos
                  <Badge variant="outline">{nota.status}</Badge>
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  {nota.fornecedor} • {nota.tipoPagamento}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Progresso</p>
                <p className="text-2xl font-bold">
                  {progressoConferencia.conferidos}/{progressoConferencia.total}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Conferência</span>
                <span className="font-medium">{progressoConferencia.percentual}%</span>
              </div>
              <Progress value={progressoConferencia.percentual} className="h-3" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Qtd Informada</p>
                <p className="text-xl font-bold">{nota.qtdInformada}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Qtd Cadastrada</p>
                <p className="text-xl font-bold text-blue-600">{nota.qtdCadastrada}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Qtd Conferida</p>
                <p className="text-xl font-bold text-green-600">{nota.qtdConferida}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Produtos */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos para Conferir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Custo Unit.</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nota.produtos.map(produto => {
                    const precisaCampos = itemPrecisaCampos(produto);
                    const camposOk = camposPreenchidos(produto.id, produto);
                    const campos = camposEditaveis[produto.id];
                    
                    return (
                      <TableRow 
                        key={produto.id}
                        className={produto.statusConferencia === 'Conferido' ? 'bg-primary/10' : ''}
                      >
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {produto.tipoProduto}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{produto.marca}</TableCell>
                        <TableCell className="font-medium">{produto.modelo}</TableCell>
                        {/* IMEI - editável se precisa preenchimento */}
                        <TableCell className="font-mono text-xs">
                          {produto.statusConferencia === 'Conferido' ? (
                            produto.imei ? formatIMEI(produto.imei) : '-'
                          ) : precisaCampos && campos ? (
                            <InputComMascara
                              mascara="imei"
                              value={campos.imei}
                              onChange={(formatted, raw) => atualizarCampoEditavel(produto.id, 'imei', String(raw))}
                              className="w-40"
                              placeholder="00-000000-000000-0"
                            />
                          ) : (
                            produto.imei ? formatIMEI(produto.imei) : '-'
                          )}
                        </TableCell>
                        {/* Cor - editável se precisa preenchimento */}
                        <TableCell>
                          {produto.statusConferencia === 'Conferido' ? (
                            produto.cor ? (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full border border-border" 
                                  style={{ backgroundColor: getCorHex(produto.cor) }}
                                />
                                <span className="text-sm">{produto.cor}</span>
                              </div>
                            ) : '-'
                          ) : precisaCampos && campos ? (
                            <Select
                              value={campos.cor || 'selecione_cor'}
                              onValueChange={(v) => atualizarCampoEditavel(produto.id, 'cor', v === 'selecione_cor' ? '' : v)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Cor" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="selecione_cor">Selecione</SelectItem>
                                {coresAtivas.map(cor => (
                                  <SelectItem key={cor.id} value={cor.nome}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: cor.hexadecimal }} />
                                      {cor.nome}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            produto.cor ? (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full border border-border" 
                                  style={{ backgroundColor: getCorHex(produto.cor) }}
                                />
                                <span className="text-sm">{produto.cor}</span>
                              </div>
                            ) : '-'
                          )}
                        </TableCell>
                        {/* Categoria - editável se precisa preenchimento */}
                        <TableCell>
                          {produto.statusConferencia === 'Conferido' ? (
                            <Badge variant={produto.categoria === 'Novo' ? 'default' : 'secondary'} className="text-xs">
                              {produto.categoria || '-'}
                            </Badge>
                          ) : precisaCampos && campos ? (
                            <Select
                              value={campos.categoria || 'selecione_cat'}
                              onValueChange={(v) => atualizarCampoEditavel(produto.id, 'categoria', v === 'selecione_cat' ? '' : v)}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="Cat" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="selecione_cat">Selecione</SelectItem>
                                <SelectItem value="Novo">Novo</SelectItem>
                                <SelectItem value="Seminovo">Seminovo</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={produto.categoria === 'Novo' ? 'default' : 'secondary'} className="text-xs">
                              {produto.categoria || '-'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{produto.quantidade}</TableCell>
                        <TableCell>{formatCurrency(produto.custoUnitario)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(produto.custoTotal)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Botão Explodir para itens agrupados */}
                            {produto.quantidade > 1 && produto.statusConferencia !== 'Conferido' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleExplodirItem(produto.id)}
                                title="Gerar unidades individuais"
                              >
                                <Layers className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                            {/* Botão Conferir */}
                            {produto.statusConferencia === 'Conferido' ? (
                              <CheckCircle className="h-6 w-6 text-primary mx-auto" />
                            ) : produtosConferidos.has(produto.id) ? (
                              <Button
                                size="icon"
                                variant="default"
                                className="h-8 w-8"
                                onClick={() => handleToggleConferido(produto.id)}
                              >
                                <Check className="h-5 w-5" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-primary/20"
                                onClick={() => handleToggleConferido(produto.id)}
                                disabled={precisaCampos && !camposOk}
                                title={precisaCampos && !camposOk ? 'Preencha IMEI, Cor e Categoria primeiro' : 'Marcar como conferido'}
                              >
                                <Check className="h-5 w-5 text-primary" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {/* Botão Salvar Conferência */}
            <div className="flex justify-end mt-6 pt-4 border-t">
              <Button 
                onClick={handleSalvarConferencia} 
                size="lg"
                disabled={produtosConferidos.size === 0 || produtosConferidos.size === nota.produtos.filter(p => p.statusConferencia === 'Conferido').length}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Conferência ({progressoConferencia.conferidos}/{progressoConferencia.total})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline da Nota
                  </CardTitle>
                  {timelineOpen ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {nota.timeline.slice().reverse().map((evento, index) => (
                    <div key={evento.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          evento.statusNovo === 'Finalizada' ? 'bg-primary' :
                          evento.statusNovo === 'Com Divergencia' ? 'bg-destructive' :
                          evento.acao.includes('conferido') ? 'bg-green-500' :
                          evento.acao.includes('Pagamento') ? 'bg-purple-500' :
                          'bg-blue-500'
                        }`} />
                        {index < nota.timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-sm">{evento.acao}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(evento.dataHora)} • {evento.usuario}
                        </p>
                        {evento.detalhes && (
                          <p className="text-xs text-muted-foreground mt-1">{evento.detalhes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </EstoqueLayout>
  );
}
