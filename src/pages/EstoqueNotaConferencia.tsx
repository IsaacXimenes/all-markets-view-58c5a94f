import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ArrowLeft, 
  Check, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  Save,
  Layers,
  Undo2,
  Send,
  Wrench,
  AlertTriangle,
  ShieldCheck,
  Coins
} from 'lucide-react';
import { 
  getNotaEntradaById, 
  finalizarConferencia, 
  explodirProdutoNota,
  recolherProdutoNota,
  migrarProdutosConferidosPorCategoria,
  enviarDiretoAoFinanceiro,
  verificarImeiUnicoSistema,
  processarTriagemIndividualizada,
  TriagemProduto,
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
  const [showCentralDecisao, setShowCentralDecisao] = useState(false);
  
  // Estado para triagem individualizada (caminho por produto)
  const [triagemProdutos, setTriagemProdutos] = useState<Record<string, 'verde' | 'amarelo' | null>>({});
  const [motivosDefeito, setMotivosDefeito] = useState<Record<string, string>>({});
  const [modalMotivoOpen, setModalMotivoOpen] = useState(false);
  const [produtoMotivoId, setProdutoMotivoId] = useState<string | null>(null);
  
  // Estado local para rastrear produtos marcados como conferidos (antes de salvar)
  const [produtosConferidos, setProdutosConferidos] = useState<Set<string>>(new Set());
  
  // Estado para campos editáveis inline (IMEI, Cor, Categoria) dos itens explodidos
  const [camposEditaveis, setCamposEditaveis] = useState<Record<string, { imei: string; cor: string; categoria: string }>>({});
  
  // Estado para validação de IMEI duplicado
  const [imeiDuplicado, setImeiDuplicado] = useState<Record<string, string | null>>({});
  const [imeiDebounceTimers, setImeiDebounceTimers] = useState<Record<string, NodeJS.Timeout>>({});
  
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
    
    // Validação assíncrona de IMEI com debounce
    if (campo === 'imei' && valor && valor.replace(/[^0-9]/g, '').length >= 10) {
      // Limpar timer anterior
      if (imeiDebounceTimers[produtoId]) {
        clearTimeout(imeiDebounceTimers[produtoId]);
      }
      const timer = setTimeout(() => {
        const resultado = verificarImeiUnicoSistema(valor, nota?.id);
        if (resultado.duplicado) {
          setImeiDuplicado(prev => ({ ...prev, [produtoId]: resultado.localExistente || 'Outro local' }));
        } else {
          setImeiDuplicado(prev => ({ ...prev, [produtoId]: null }));
        }
      }, 500);
      setImeiDebounceTimers(prev => ({ ...prev, [produtoId]: timer }));
    } else if (campo === 'imei') {
      setImeiDuplicado(prev => ({ ...prev, [produtoId]: null }));
    }
  };
  
  // Verificar se algum IMEI está duplicado
  const temImeiDuplicado = useMemo(() => {
    return Object.values(imeiDuplicado).some(v => v !== null && v !== undefined);
  }, [imeiDuplicado]);

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

  // Recolher itens explodidos de volta em uma linha agrupada
  const handleRecolherItens = (produtoId: string) => {
    if (!nota) return;
    
    // Extrair prefixo original do ID (ex: PROD-NE-2026-00001-001 de PROD-NE-2026-00001-001-U001)
    const prefixo = produtoId.replace(/-U\d{3}$/, '');
    
    const resultado = recolherProdutoNota(nota.id, prefixo, 'Carlos Estoque');
    if (resultado) {
      setNota(resultado);
      // Reinicializar campos editáveis
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
      const jaConferidos = new Set(
        resultado.produtos
          .filter(p => p.statusConferencia === 'Conferido')
          .map(p => p.id)
      );
      setProdutosConferidos(jaConferidos);
      toast.success('Itens recolhidos de volta em linha agrupada');
    } else {
      toast.error('Não é possível recolher: itens já conferidos não podem ser recolhidos');
    }
  };

  // Verificar se um item é explodido (tem sufixo -UXXX)
  const isItemExplodido = (produtoId: string): boolean => {
    return /-U\d{3}$/.test(produtoId);
  };
  // Verificar se todos os aparelhos têm IMEI preenchido
  const todosIMEIsPreenchidos = useMemo(() => {
    if (!nota) return false;
    return nota.produtos
      .filter(p => p.tipoProduto === 'Aparelho')
      .every(p => p.imei && p.imei.trim() !== '');
  }, [nota]);

  // Salvar conferência - só aqui que confirma tudo
  const handleSalvarConferencia = () => {
    if (!nota) return;
    
    if (produtosConferidos.size === 0) {
      toast.error('Marque pelo menos um produto como conferido');
      return;
    }
    
    // Bloquear se houver IMEI duplicado
    if (temImeiDuplicado) {
      toast.error('Existem IMEIs duplicados. Corrija antes de salvar a conferência.');
      return;
    }

    // Antes de salvar, atualizar os campos editáveis nos produtos da nota
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
      
      // Verificar se finalizou 100% - mostrar Central de Decisão
      if (resultado.qtdConferida === resultado.qtdCadastrada && resultado.qtdCadastrada > 0) {
        // Buscar nota original para a migração
        const notaOriginal = getNotaEntradaById(resultado.id);
        if (notaOriginal) {
          const migracaoResult = migrarProdutosConferidosPorCategoria(notaOriginal, 'Carlos Estoque');
          
          const partes: string[] = [];
          if (migracaoResult.novos > 0) partes.push(`${migracaoResult.novos} novo(s) → Estoque`);
          if (migracaoResult.seminovos > 0) partes.push(`${migracaoResult.seminovos} seminovo(s) → Aparelhos Pendentes`);
          
          if (partes.length > 0) {
            toast.success('Produtos migrados com sucesso!', {
              description: partes.join(' | ') + ' (Destino: Estoque - SIA)'
            });
          }
        }
        
        toast.success('Conferência 100% concluída!');
        // Mostrar Central de Decisão em vez de navegar diretamente
        setShowCentralDecisao(true);
      }
    } else {
      toast.error('Erro ao salvar conferência');
    }
  };

  // Helpers para triagem individualizada
  const todosTriados = useMemo(() => {
    if (!nota) return false;
    return nota.produtos.every(p => triagemProdutos[p.id] === 'verde' || triagemProdutos[p.id] === 'amarelo');
  }, [nota, triagemProdutos]);

  const qtdVerdes = useMemo(() => Object.values(triagemProdutos).filter(v => v === 'verde').length, [triagemProdutos]);
  const qtdAmarelos = useMemo(() => Object.values(triagemProdutos).filter(v => v === 'amarelo').length, [triagemProdutos]);

  const handleAtribuirCaminho = (produtoId: string, caminho: 'verde' | 'amarelo') => {
    // Blindagem: Produto Novo nunca pode ir para caminho amarelo (defeito)
    if (caminho === 'amarelo') {
      const produto = nota?.produtos.find(p => p.id === produtoId);
      if (produto?.categoria === 'Novo') {
        toast.error('Produto Novo não pode ser reportado como defeito.');
        return;
      }
      // Abrir modal para motivo do defeito
      setProdutoMotivoId(produtoId);
      setModalMotivoOpen(true);
    } else {
      setTriagemProdutos(prev => ({ ...prev, [produtoId]: 'verde' }));
      setMotivosDefeito(prev => { const n = { ...prev }; delete n[produtoId]; return n; });
    }
  };

  const handleConfirmarMotivo = () => {
    if (!produtoMotivoId) return;
    const motivo = motivosDefeito[produtoMotivoId];
    if (!motivo?.trim()) {
      toast.error('Informe o motivo do defeito');
      return;
    }
    setTriagemProdutos(prev => ({ ...prev, [produtoMotivoId]: 'amarelo' }));
    setModalMotivoOpen(false);
    setProdutoMotivoId(null);
  };

  const handleRemoverTriagem = (produtoId: string) => {
    setTriagemProdutos(prev => { const n = { ...prev }; delete n[produtoId]; return n; });
    setMotivosDefeito(prev => { const n = { ...prev }; delete n[produtoId]; return n; });
  };

  const handleMarcarTodosVerde = () => {
    if (!nota) return;
    const novaTriagem: Record<string, 'verde'> = {};
    nota.produtos.forEach(p => { novaTriagem[p.id] = 'verde'; });
    setTriagemProdutos(novaTriagem);
    setMotivosDefeito({});
  };

  // Finalizar triagem individualizada
  const handleFinalizarTriagem = () => {
    if (!nota || !todosTriados) return;
    if (!todosIMEIsPreenchidos) {
      toast.error('Todos os aparelhos devem ter o IMEI preenchido');
      return;
    }
    // Validação final: nenhum produto Novo pode estar no caminho amarelo
    const novosNoAmarelo = nota.produtos.filter(p => p.categoria === 'Novo' && triagemProdutos[p.id] === 'amarelo');
    if (novosNoAmarelo.length > 0) {
      toast.error('Produtos com categoria "Novo" não podem ser encaminhados como defeito.');
      return;
    }

    const triagens: TriagemProduto[] = Object.entries(triagemProdutos).map(([produtoId, caminho]) => ({
      produtoId,
      caminho: caminho!,
      motivoDefeito: motivosDefeito[produtoId]
    }));

    const resultado = processarTriagemIndividualizada(nota.id, triagens, 'Carlos Estoque');
    if (!resultado) {
      toast.error('Erro ao processar triagem');
      return;
    }

    // Feedback
    if (resultado.produtosVerdes.length > 0) {
      toast.success(`${resultado.produtosVerdes.length} produto(s) → Financeiro (disponíveis para venda)`);
    }
    if (resultado.produtosAmarelos.length > 0) {
      toast.success(`${resultado.produtosAmarelos.length} produto(s) → Assistência (Lote ${resultado.loteRevisaoId})`);
    }
    if (resultado.creditoGerado) {
      toast.success(`Vale-Crédito gerado: ${formatCurrency(resultado.creditoGerado.valor)} para ${nota.fornecedor}`, {
        icon: <Coins className="h-4 w-4" />,
        duration: 6000
      });
    }

    navigate('/estoque/notas-pendencias');
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
                            <TooltipProvider>
                              <Tooltip open={!!imeiDuplicado[produto.id]}>
                                <TooltipTrigger asChild>
                                  <div>
                                    <InputComMascara
                                      mascara="imei"
                                      value={campos.imei}
                                      onChange={(formatted, raw) => atualizarCampoEditavel(produto.id, 'imei', String(raw))}
                                      className={`w-40 ${imeiDuplicado[produto.id] ? 'border-destructive ring-destructive/30 ring-2' : ''}`}
                                      placeholder="00-000000-000000-0"
                                    />
                                  </div>
                                </TooltipTrigger>
                                {imeiDuplicado[produto.id] && (
                                  <TooltipContent className="bg-destructive text-destructive-foreground">
                                    IMEI já cadastrado em: {imeiDuplicado[produto.id]}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
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
                            {/* Botão Recolher para itens explodidos */}
                            {isItemExplodido(produto.id) && produto.statusConferencia !== 'Conferido' && !produtosConferidos.has(produto.id) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleRecolherItens(produto.id)}
                                title="Recolher unidades de volta"
                              >
                                <Undo2 className="h-4 w-4 text-muted-foreground" />
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
                                disabled={(precisaCampos && !camposOk) || !!imeiDuplicado[produto.id]}
                                title={imeiDuplicado[produto.id] ? 'IMEI duplicado - corrija antes de conferir' : precisaCampos && !camposOk ? 'Preencha IMEI, Cor e Categoria primeiro' : 'Marcar como conferido'}
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

        {/* Central de Decisão - Triagem Individualizada */}
        {showCentralDecisao && nota && (
          <Card className="border-2 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Central de Decisão — Triagem Individualizada
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Conferência 100% concluída. Atribua o caminho de cada produto individualmente.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!todosIMEIsPreenchidos && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive font-medium">
                    Existem aparelhos sem IMEI preenchido. Preencha todos os IMEIs antes de prosseguir.
                  </p>
                </div>
              )}

              {/* Ação rápida: marcar todos como verde */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-500/50 text-green-700 hover:bg-green-500/10"
                  onClick={handleMarcarTodosVerde}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Marcar Todos como OK (Verde)
                </Button>
                <span className="text-xs text-muted-foreground">
                  {qtdVerdes > 0 || qtdAmarelos > 0 ? (
                    <>
                      <span className="text-green-600 font-medium">{qtdVerdes} verde(s)</span>
                      {qtdAmarelos > 0 && <> · <span className="text-yellow-600 font-medium">{qtdAmarelos} amarelo(s)</span></>}
                    </>
                  ) : 'Nenhum produto triado'}
                </span>
              </div>

              {/* Tabela de triagem */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead className="text-center">Caminho</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nota.produtos.map(produto => {
                      const caminho = triagemProdutos[produto.id];
                      return (
                        <TableRow key={produto.id} className={
                          caminho === 'verde' ? 'bg-green-500/5' :
                          caminho === 'amarelo' ? 'bg-yellow-500/5' : ''
                        }>
                          <TableCell className="font-medium">
                            {produto.marca} {produto.modelo}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {produto.imei ? formatIMEI(produto.imei) : '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(produto.custoTotal)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant={caminho === 'verde' ? 'default' : 'outline'}
                                className={caminho === 'verde' ? 'bg-green-600 hover:bg-green-700 text-white h-7 px-2' : 'border-green-500/40 text-green-700 h-7 px-2 hover:bg-green-500/10'}
                                onClick={() => handleAtribuirCaminho(produto.id, 'verde')}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                OK
                              </Button>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        size="sm"
                                        variant={caminho === 'amarelo' ? 'default' : 'outline'}
                                        className={caminho === 'amarelo' ? 'bg-yellow-600 hover:bg-yellow-700 text-white h-7 px-2' : 'border-yellow-500/40 text-yellow-700 h-7 px-2 hover:bg-yellow-500/10'}
                                        onClick={() => handleAtribuirCaminho(produto.id, 'amarelo')}
                                        disabled={produto.categoria === 'Novo'}
                                      >
                                        <Wrench className="h-3 w-3 mr-1" />
                                        Defeito
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {produto.categoria === 'Novo' && (
                                    <TooltipContent>Produto Novo não pode ser reportado como defeito</TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                              {caminho && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleRemoverTriagem(produto.id)}
                                >
                                  <Undo2 className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {caminho === 'amarelo' ? motivosDefeito[produto.id] || '' : caminho === 'verde' ? 'Lote OK' : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Resumo e botão finalizar */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {todosTriados ? (
                    <span className="text-primary font-medium">✓ Todos os produtos triados</span>
                  ) : (
                    <span>{nota.produtos.length - qtdVerdes - qtdAmarelos} produto(s) ainda sem caminho</span>
                  )}
                </div>
                <Button
                  size="lg"
                  disabled={!todosTriados || !todosIMEIsPreenchidos || temImeiDuplicado}
                  onClick={handleFinalizarTriagem}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar Triagem ({qtdVerdes}V / {qtdAmarelos}A)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de motivo do defeito */}
        <Dialog open={modalMotivoOpen} onOpenChange={setModalMotivoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-yellow-600" />
                Motivo do Defeito
              </DialogTitle>
            </DialogHeader>
            {produtoMotivoId && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Descreva o defeito do produto: <strong>{nota?.produtos.find(p => p.id === produtoMotivoId)?.marca} {nota?.produtos.find(p => p.id === produtoMotivoId)?.modelo}</strong>
                </p>
                <Textarea
                  value={motivosDefeito[produtoMotivoId] || ''}
                  onChange={(e) => setMotivosDefeito(prev => ({ ...prev, [produtoMotivoId]: e.target.value }))}
                  placeholder="Ex: Display com manchas, bateria inflada, câmera com defeito..."
                  rows={3}
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setModalMotivoOpen(false); setProdutoMotivoId(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmarMotivo} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                Confirmar Defeito
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                          evento.acao.includes('Pagamento') ? 'bg-blue-500' :
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
