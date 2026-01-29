import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  conferirProduto, 
  NotaEntrada,
  ProdutoNotaEntrada,
  podeRealizarAcao,
  TimelineNotaEntrada
} from '@/utils/notaEntradaFluxoApi';
import { getCores } from '@/utils/coresApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { toast } from 'sonner';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { formatCurrency } from '@/utils/formatUtils';

export default function EstoqueNotaConferencia() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [nota, setNota] = useState<NotaEntrada | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(true);
  
  // Estado de conferência do produto selecionado
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoNotaEntrada | null>(null);
  const [conferenciaDados, setConferenciaDados] = useState({
    imei: '',
    cor: '',
    categoria: '' as 'Novo' | 'Seminovo' | '',
    capacidade: '',
    percentualBateria: 100
  });
  
  const coresCadastradas = getCores();
  const colaboradores = useCadastroStore(state => state.colaboradores.filter(c => c.ativo));

  useEffect(() => {
    if (id) {
      const notaData = getNotaEntradaById(id);
      setNota(notaData);
      setIsLoading(false);
    }
  }, [id]);

  const progressoConferencia = useMemo(() => {
    if (!nota) return { conferidos: 0, total: 0, percentual: 0 };
    const total = nota.produtos.length;
    const conferidos = nota.produtos.filter(p => p.statusConferencia === 'Conferido').length;
    const percentual = total > 0 ? Math.round((conferidos / total) * 100) : 0;
    return { conferidos, total, percentual };
  }, [nota]);

  const handleSelecionarProduto = (produto: ProdutoNotaEntrada) => {
    if (produto.statusConferencia === 'Conferido') {
      toast.info('Este produto já foi conferido');
      return;
    }
    setProdutoSelecionado(produto);
    setConferenciaDados({
      imei: '',
      cor: '',
      categoria: '',
      capacidade: '',
      percentualBateria: 100
    });
  };

  const handleConferir = () => {
    if (!nota || !produtoSelecionado) return;
    
    // Validações
    if (produtoSelecionado.tipoProduto === 'Aparelho' && !conferenciaDados.imei) {
      toast.error('IMEI é obrigatório para aparelhos');
      return;
    }
    if (!conferenciaDados.cor) {
      toast.error('Cor é obrigatória');
      return;
    }
    if (!conferenciaDados.categoria) {
      toast.error('Categoria é obrigatória');
      return;
    }
    
    const resultado = conferirProduto(nota.id, produtoSelecionado.id, {
      imei: conferenciaDados.imei || undefined,
      cor: conferenciaDados.cor,
      categoria: conferenciaDados.categoria as 'Novo' | 'Seminovo',
      capacidade: conferenciaDados.capacidade || undefined,
      percentualBateria: conferenciaDados.percentualBateria,
      responsavel: 'Carlos Estoque'
    });
    
    if (resultado) {
      toast.success(`Produto conferido: ${produtoSelecionado.modelo}`);
      setNota(resultado);
      setProdutoSelecionado(null);
      
      // Verificar se finalizou conferência
      const novoProgresso = resultado.produtos.filter(p => p.statusConferencia === 'Conferido').length;
      if (novoProgresso === resultado.produtos.length) {
        toast.success('Conferência concluída! Nota atualizada.', {
          description: resultado.tipoPagamento === 'Pos' 
            ? 'Enviada para pagamento no Financeiro' 
            : 'Status atualizado'
        });
      }
    } else {
      toast.error('Erro ao conferir produto');
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Produtos */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Produtos para Conferir</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nota.produtos.map(produto => (
                      <TableRow 
                        key={produto.id}
                        className={
                          produto.statusConferencia === 'Conferido' 
                            ? 'bg-primary/10' 
                            : produtoSelecionado?.id === produto.id 
                              ? 'bg-accent'
                              : ''
                        }
                      >
                        <TableCell>
                          {produto.statusConferencia === 'Conferido' ? (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          ) : (
                            <Clock className="h-5 w-5 text-warning" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{produto.modelo}</TableCell>
                        <TableCell>{produto.marca}</TableCell>
                        <TableCell>{formatCurrency(produto.custoTotal)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {produto.imei || '-'}
                        </TableCell>
                        <TableCell>
                          {produto.statusConferencia === 'Pendente' && (
                            <Button
                              size="sm"
                              variant={produtoSelecionado?.id === produto.id ? 'default' : 'outline'}
                              onClick={() => handleSelecionarProduto(produto)}
                            >
                              Conferir
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Painel de Conferência */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {produtoSelecionado 
                    ? `Conferir: ${produtoSelecionado.modelo}` 
                    : 'Selecione um produto'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {produtoSelecionado ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Marca</Label>
                      <p className="font-medium">{produtoSelecionado.marca}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Modelo</Label>
                      <p className="font-medium">{produtoSelecionado.modelo}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Custo</Label>
                      <p className="font-medium">{formatCurrency(produtoSelecionado.custoTotal)}</p>
                    </div>
                    
                    <Separator />
                    
                    {/* Campos de conferência */}
                    {produtoSelecionado.tipoProduto === 'Aparelho' && (
                      <div>
                        <Label htmlFor="imei">IMEI *</Label>
                        <InputComMascara
                          mascara="imei"
                          value={conferenciaDados.imei}
                          onChange={(formatted, raw) => setConferenciaDados({
                            ...conferenciaDados,
                            imei: String(raw)
                          })}
                          placeholder="00-000000-000000-0"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="cor">Cor *</Label>
                      <Select 
                        value={conferenciaDados.cor}
                        onValueChange={(value) => setConferenciaDados({
                          ...conferenciaDados,
                          cor: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a cor" />
                        </SelectTrigger>
                        <SelectContent>
                          {coresCadastradas.map(c => (
                            <SelectItem key={c.id} value={c.nome}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full border" 
                                  style={{ backgroundColor: c.hexadecimal }}
                                />
                                {c.nome}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="categoria">Categoria *</Label>
                      <Select 
                        value={conferenciaDados.categoria}
                        onValueChange={(value) => setConferenciaDados({
                          ...conferenciaDados,
                          categoria: value as 'Novo' | 'Seminovo'
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Novo">Novo</SelectItem>
                          <SelectItem value="Seminovo">Seminovo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {produtoSelecionado.tipoProduto === 'Aparelho' && (
                      <>
                        <div>
                          <Label htmlFor="capacidade">Capacidade</Label>
                          <Select 
                            value={conferenciaDados.capacidade}
                            onValueChange={(value) => setConferenciaDados({
                              ...conferenciaDados,
                              capacidade: value
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="64 GB">64 GB</SelectItem>
                              <SelectItem value="128 GB">128 GB</SelectItem>
                              <SelectItem value="256 GB">256 GB</SelectItem>
                              <SelectItem value="512 GB">512 GB</SelectItem>
                              <SelectItem value="1 TB">1 TB</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="bateria">% Bateria</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={conferenciaDados.percentualBateria}
                            onChange={(e) => setConferenciaDados({
                              ...conferenciaDados,
                              percentualBateria: parseInt(e.target.value) || 0
                            })}
                          />
                        </div>
                      </>
                    )}
                    
                    <Button onClick={handleConferir} className="w-full" size="lg">
                      <Check className="mr-2 h-4 w-4" />
                      Confirmar Conferência
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Clique em "Conferir" em um produto da lista para iniciar a conferência</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Timeline */}
        <Card>
          <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline da Nota
                  </CardTitle>
                  {timelineOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {nota.timeline.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nenhum evento registrado</p>
                  ) : (
                    nota.timeline.slice().reverse().map((entry, idx) => (
                      <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            entry.statusNovo === 'Finalizada' ? 'bg-primary' :
                            entry.statusNovo === 'Com Divergencia' ? 'bg-destructive' :
                            'bg-primary/70'
                          }`} />
                          {idx < nota.timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{entry.acao}</p>
                              <p className="text-sm text-muted-foreground">
                                {entry.usuario} ({entry.perfil})
                              </p>
                              {entry.detalhes && (
                                <p className="text-sm mt-1">{entry.detalhes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(entry.dataHora)}
                              </p>
                              {entry.impactoFinanceiro && (
                                <p className="text-sm font-medium text-primary">
                                  {formatCurrency(entry.impactoFinanceiro)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </EstoqueLayout>
  );
}
