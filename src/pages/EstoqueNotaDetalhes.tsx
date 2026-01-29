import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  FileText, 
  User, 
  Warehouse, 
  Landmark,
  AlertTriangle,
  CheckCircle,
  Plus,
  ClipboardCheck
} from 'lucide-react';
import { 
  getNotaEntradaById, 
  NotaEntrada,
  NotaEntradaStatus,
  AtuacaoAtual,
  TipoPagamentoNota,
  TimelineNotaEntrada,
  ProdutoNotaEntrada
} from '@/utils/notaEntradaFluxoApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatUtils';

// Helper para obter nome do fornecedor a partir do ID
const obterNomeFornecedor = (idOuNome: string): string => {
  if (!idOuNome.startsWith('FORN-')) {
    return idOuNome;
  }
  const fornecedores = getFornecedores();
  const fornecedor = fornecedores.find(f => f.id === idOuNome);
  return fornecedor?.nome || idOuNome;
};

export default function EstoqueNotaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [nota, setNota] = useState<NotaEntrada | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [produtosOpen, setProdutosOpen] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const notaEncontrada = getNotaEntradaById(id);
    setNota(notaEncontrada);
    setIsLoading(false);
  }, [id]);

  // Calcular progresso de conferência
  const progressoConferencia = useMemo(() => {
    if (!nota) return { conferidos: 0, total: 0, percentual: 0 };
    const total = nota.qtdInformada;
    const conferidos = nota.qtdConferida;
    const percentual = total > 0 ? Math.round((conferidos / total) * 100) : 0;
    return { conferidos, total, percentual };
  }, [nota]);

  if (isLoading) {
    return (
      <EstoqueLayout title="Carregando...">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando detalhes da nota...</p>
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
            Voltar para Notas
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  const getStatusBadge = (status: NotaEntradaStatus) => {
    const statusConfig: Record<NotaEntradaStatus, { bg: string; text: string; label: string }> = {
      'Criada': { bg: 'bg-secondary', text: 'text-secondary-foreground', label: 'Criada' },
      'Aguardando Pagamento Inicial': { bg: 'bg-primary/10', text: 'text-primary', label: 'Aguard. Pag. Inicial' },
      'Pagamento Parcial Realizado': { bg: 'bg-primary/20', text: 'text-primary', label: 'Pag. Parcial' },
      'Pagamento Concluido': { bg: 'bg-primary/30', text: 'text-primary', label: 'Pago' },
      'Aguardando Conferencia': { bg: 'bg-accent', text: 'text-accent-foreground', label: 'Aguard. Conf.' },
      'Conferencia Parcial': { bg: 'bg-accent', text: 'text-accent-foreground', label: 'Conf. Parcial' },
      'Conferencia Concluida': { bg: 'bg-primary/40', text: 'text-primary', label: 'Conf. Concluída' },
      'Aguardando Pagamento Final': { bg: 'bg-primary/10', text: 'text-primary', label: 'Aguard. Pag. Final' },
      'Com Divergencia': { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Divergência' },
      'Finalizada': { bg: 'bg-primary', text: 'text-primary-foreground', label: 'Finalizada' }
    };
    
    const config = statusConfig[status] || { bg: 'bg-muted', text: 'text-muted-foreground', label: status };
    
    return (
      <Badge variant="outline" className={`${config.bg} ${config.text}`}>
        {config.label}
      </Badge>
    );
  };

  const getTipoPagamentoBadge = (tipo: TipoPagamentoNota) => {
    switch (tipo) {
      case 'Pagamento 100% Antecipado':
        return <Badge variant="outline" className="bg-primary/10 text-primary">100% Antecipado</Badge>;
      case 'Pagamento Parcial':
        return <Badge variant="outline" className="bg-accent text-accent-foreground">Parcial</Badge>;
      case 'Pagamento Pos':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Pós</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const getAtuacaoBadge = (atuacao: AtuacaoAtual) => {
    switch (atuacao) {
      case 'Estoque':
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
            <Warehouse className="h-3 w-3" />
            Estoque
          </Badge>
        );
      case 'Financeiro':
        return (
          <Badge className="bg-accent text-accent-foreground gap-1">
            <Landmark className="h-3 w-3" />
            Financeiro
          </Badge>
        );
      case 'Encerrado':
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Encerrado
          </Badge>
        );
      default:
        return <Badge variant="outline">{atuacao}</Badge>;
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

  const podeEditar = nota.atuacaoAtual === 'Estoque';

  return (
    <EstoqueLayout title={`Detalhes da Nota ${nota.numeroNota}`}>
      <div className="space-y-6">
        {/* Header com navegação e ações */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/estoque/notas-pendencias')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Notas Pendências
          </Button>
          
          <div className="flex gap-2">
            {podeEditar && nota.qtdCadastrada < nota.qtdInformada && (
              <Button onClick={() => navigate(`/estoque/nota/${nota.id}/cadastrar-produtos`)}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Produtos
              </Button>
            )}
            {podeEditar && nota.qtdCadastrada > 0 && (
              <Button onClick={() => navigate(`/estoque/nota/${nota.id}/conferencia`)}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Conferir Produtos
              </Button>
            )}
          </div>
        </div>

        {/* Cards de informações principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(nota.status)}</div>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Atuação Atual</p>
                  <div className="mt-1">{getAtuacaoBadge(nota.atuacaoAtual)}</div>
                </div>
                {nota.atuacaoAtual === 'Estoque' ? (
                  <Warehouse className="h-8 w-8 text-primary opacity-50" />
                ) : (
                  <Landmark className="h-8 w-8 text-accent-foreground opacity-50" />
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Pagamento</p>
                  <div className="mt-1">{getTipoPagamentoBadge(nota.tipoPagamento)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Progresso Conferência</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={progressoConferencia.percentual} className="w-20 h-2" />
                    <span className="text-sm font-medium">{progressoConferencia.percentual}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {progressoConferencia.conferidos} / {progressoConferencia.total} itens
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas ativos */}
        {nota.alertas.filter(a => !a.resolvido).length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Alertas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {nota.alertas.filter(a => !a.resolvido).map(alerta => (
                  <div key={alerta.id} className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {alerta.mensagem}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações detalhadas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Nota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Número da Nota</p>
                <p className="font-mono font-medium">{nota.numeroNota}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fornecedor</p>
                <p className="font-medium">{obterNomeFornecedor(nota.fornecedor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Criação</p>
                <p className="font-medium">{formatDateTime(nota.dataCriacao)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="font-medium text-lg">{formatCurrency(nota.valorTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Pago</p>
                <p className="font-medium text-primary">{formatCurrency(nota.valorPago)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Pendente</p>
                <p className="font-medium text-destructive">{formatCurrency(nota.valorPendente)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Qtd Informada</p>
                <p className="font-medium">{nota.qtdInformada}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Qtd Cadastrada</p>
                <p className="font-medium">{nota.qtdCadastrada}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Qtd Conferida</p>
                <p className="font-medium">{nota.qtdConferida}</p>
              </div>
              {nota.responsavelCriacao && (
                <div>
                  <p className="text-sm text-muted-foreground">Responsável Criação</p>
                  <p className="font-medium">{nota.responsavelCriacao}</p>
                </div>
              )}
              {nota.observacoes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{nota.observacoes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Produtos cadastrados */}
        <Collapsible open={produtosOpen} onOpenChange={setProdutosOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <CardTitle className="flex items-center gap-2">
                    Produtos ({nota.produtos.length})
                  </CardTitle>
                  {produtosOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                {nota.produtos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum produto cadastrado ainda.</p>
                    {podeEditar && (
                      <Button 
                        className="mt-4" 
                        onClick={() => navigate(`/estoque/nota/${nota.id}/cadastrar-produtos`)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Cadastrar Produtos
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>IMEI</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Custo Unit.</TableHead>
                        <TableHead>Status Rec.</TableHead>
                        <TableHead>Status Conf.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nota.produtos.map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                          <TableCell>{produto.tipoProduto}</TableCell>
                          <TableCell>{produto.marca}</TableCell>
                          <TableCell>{produto.modelo}</TableCell>
                          <TableCell className="font-mono text-xs">{produto.imei || '-'}</TableCell>
                          <TableCell>{produto.quantidade}</TableCell>
                          <TableCell>{formatCurrency(produto.custoUnitario)}</TableCell>
                          <TableCell>
                            <Badge variant={produto.statusRecebimento === 'Recebido' ? 'default' : 'secondary'}>
                              {produto.statusRecebimento}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={produto.statusConferencia === 'Conferido' ? 'default' : 'outline'}>
                              {produto.statusConferencia}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Timeline */}
        <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline ({nota.timeline.length})
                  </CardTitle>
                  {timelineOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                {nota.timeline.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhum evento registrado.</p>
                ) : (
                  <div className="space-y-4">
                    {[...nota.timeline].reverse().map((entry) => (
                      <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="flex-shrink-0 mt-1">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{entry.usuario}</span>
                            <Badge variant="outline" className="text-xs">{entry.perfil}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(entry.dataHora)}
                            </span>
                          </div>
                          <p className="text-sm">{entry.acao}</p>
                          {entry.detalhes && (
                            <p className="text-sm text-muted-foreground mt-1">{entry.detalhes}</p>
                          )}
                          {entry.impactoFinanceiro !== undefined && entry.impactoFinanceiro > 0 && (
                            <p className="text-sm text-primary mt-1">
                              Impacto financeiro: {formatCurrency(entry.impactoFinanceiro)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{entry.statusAnterior}</span>
                            <span>→</span>
                            <span className="font-medium">{entry.statusNovo}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Pagamentos */}
        {nota.pagamentos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nota.pagamentos.map((pag, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{formatDateTime(pag.data)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {pag.tipo === 'inicial' ? 'Inicial' : pag.tipo === 'parcial' ? 'Parcial' : 'Final'}
                        </Badge>
                      </TableCell>
                      <TableCell>{pag.formaPagamento}</TableCell>
                      <TableCell className="text-primary font-medium">{formatCurrency(pag.valor)}</TableCell>
                      <TableCell>{pag.responsavel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </EstoqueLayout>
  );
}
