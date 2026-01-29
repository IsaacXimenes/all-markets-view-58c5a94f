import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Check, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { 
  getNotaEntradaById, 
  finalizarConferencia, 
  NotaEntrada,
  ProdutoNotaEntrada,
  podeRealizarAcao,
  TimelineNotaEntrada
} from '@/utils/notaEntradaFluxoApi';
import { getCores } from '@/utils/coresApi';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatUtils';
import { formatIMEI } from '@/utils/imeiMask';
import { Save } from 'lucide-react';

export default function EstoqueNotaConferencia() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [nota, setNota] = useState<NotaEntrada | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(true);
  
  // Estado local para rastrear produtos marcados como conferidos (antes de salvar)
  const [produtosConferidos, setProdutosConferidos] = useState<Set<string>>(new Set());
  
  const coresCadastradas = useMemo(() => getCores(), []);

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
      }
      
      setIsLoading(false);
    }
  }, [id]);

  const progressoConferencia = useMemo(() => {
    if (!nota) return { conferidos: 0, total: 0, percentual: 0 };
    const total = nota.produtos.length;
    const conferidos = produtosConferidos.size;
    const percentual = total > 0 ? Math.round((conferidos / total) * 100) : 0;
    return { conferidos, total, percentual };
  }, [nota, produtosConferidos]);

  const getCorHex = (corNome: string) => {
    const cor = coresCadastradas.find(c => c.nome === corNome);
    return cor?.hexadecimal || '#888888';
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

  // Salvar conferência - só aqui que confirma tudo
  const handleSalvarConferencia = () => {
    if (!nota) return;
    
    if (produtosConferidos.size === 0) {
      toast.error('Marque pelo menos um produto como conferido');
      return;
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

        {/* Tabela de Produtos - Layout igual ao cadastro */}
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
                    <TableHead className="text-center">Conferir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nota.produtos.map(produto => (
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
                      <TableCell className="font-mono text-xs">
                        {produto.imei ? formatIMEI(produto.imei) : '-'}
                      </TableCell>
                      <TableCell>
                        {produto.cor ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full border border-border" 
                              style={{ backgroundColor: getCorHex(produto.cor) }}
                            />
                            <span className="text-sm">{produto.cor}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={produto.categoria === 'Novo' ? 'default' : 'secondary'} className="text-xs">
                          {produto.categoria || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{produto.quantidade}</TableCell>
                      <TableCell>{formatCurrency(produto.custoUnitario)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(produto.custoTotal)}</TableCell>
                      <TableCell className="text-center">
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
                          >
                            <Check className="h-5 w-5 text-primary" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
