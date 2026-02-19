import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Smartphone,
  MapPin,
  Calendar,
  User,
  DollarSign,
  ShieldCheck,
  Wrench,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getProdutoPendenteById, 
  salvarParecerEstoque, 
  atualizarStatusProdutoPendente,
  ProdutoPendente,
  TimelineEntry,
  calcularSLA
} from '@/utils/osApi';
import { getOrdensServico } from '@/utils/assistenciaApi';
import { getColaboradores, getCargos } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/utils/formatUtils';

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function EstoqueProdutoPendenteDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { obterNomeLoja } = useCadastroStore();
  
  const [produto, setProduto] = useState<ProdutoPendente | null>(null);
  const [colaboradoresEstoque, setColaboradoresEstoque] = useState<{ id: string; nome: string }[]>([]);
  const [osVinculada, setOsVinculada] = useState<any>(null);
  
  // Usuário logado via authStore
  const user = useAuthStore((s) => s.user);
  const usuarioLogado = { 
    id: user?.colaborador?.id || 'COL-003', 
    nome: user?.colaborador?.nome || 'Carlos Estoque' 
  };

  // Form state
  const [parecerStatus, setParecerStatus] = useState<string>('');
  const [parecerObservacoes, setParecerObservacoes] = useState('');
  const [parecerResponsavel, setParecerResponsavel] = useState(usuarioLogado.nome);

  // Modal de confirmação dupla
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmResponsavel, setConfirmResponsavel] = useState('');
  
  // Corrigir data D+1: usar data local ao invés de toISOString que considera fuso horário
  const getDataLocal = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };
  const [confirmData, setConfirmData] = useState(getDataLocal());

  useEffect(() => {
    if (id) {
      const data = getProdutoPendenteById(id);
      setProduto(data);
      
      // Buscar OS vinculada ao produto (por IMEI e origemOS === 'Estoque')
      if (data) {
        const ordensServico = getOrdensServico();
        const os = ordensServico.find(o => 
          o.origemOS === 'Estoque' && (
            o.imeiAparelho === data.imei || 
            (o as any).produtoId === data.id
          )
        );
        setOsVinculada(os || null);
      }
    }

    // Carregar colaboradores com permissão de Estoque
    const colaboradores = getColaboradores();
    const cargos = getCargos();
    
    // Mapear IDs de cargos que têm permissão de Estoque
    const cargosComEstoque = cargos.filter(c => 
      c.permissoes.includes('Estoque') || c.permissoes.includes('Admin')
    ).map(c => c.id);
    
    // Filtrar colaboradores cujo cargo (ID) está na lista de cargos com permissão
    const colabsEstoque = colaboradores.filter(c => 
      cargosComEstoque.includes(c.cargo)
    );
    setColaboradoresEstoque(colabsEstoque);
    
    // Pré-preencher com usuário logado
    setParecerResponsavel(usuarioLogado.nome);
  }, [id]);

  const handleAbrirConfirmacao = () => {
    if (!id || !parecerStatus || !parecerResponsavel) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do parecer.",
        variant: "destructive"
      });
      return;
    }

    // Observação obrigatória ao encaminhar para assistência ou retrabalho
    if ((parecerStatus === 'Encaminhado para conferência da Assistência' || parecerStatus === 'Retrabalho - Devolver para Laboratório') && !parecerObservacoes.trim()) {
      toast({
        title: "Observação obrigatória",
        description: parecerStatus === 'Retrabalho - Devolver para Laboratório'
          ? "Informe o motivo da recusa para o retrabalho."
          : "Preencha a Observação com as tratativas que o técnico deve realizar.",
        variant: "destructive"
      });
      return;
    }
    
    setConfirmResponsavel(usuarioLogado.nome);
    setConfirmData(getDataLocal());
    setConfirmDialogOpen(true);
  };

  const handleConfirmarParecer = () => {
    if (!id || !confirmResponsavel) {
      toast({
        title: "Confirmação inválida",
        description: "Selecione o responsável.",
        variant: "destructive"
      });
      return;
    }

    setConfirmDialogOpen(false);

    // Fluxo de Validação pós-laboratório (Aprovar / Retrabalho)
    if (parecerStatus === 'Aparelho Aprovado - Retornar ao Estoque') {
      // Aprovar: somar custo assistência e deferir
      const resultado = salvarParecerEstoque(id, 'Produto revisado e deferido', parecerObservacoes, parecerResponsavel);
      if (resultado.produto) {
        // Sincronizar status da OS vinculada
        if (osVinculada) {
          const ordensServico = getOrdensServico();
          const os = ordensServico.find((o: any) => o.id === osVinculada.id);
          if (os) {
            os.status = 'Concluído';
            os.proximaAtuacao = '-';
            os.timeline.push({
              data: new Date().toISOString(),
              tipo: 'status',
              descricao: `Aparelho validado pelo Estoque. Serviço concluído.`,
              responsavel: parecerResponsavel
            });
          }
        }
        toast({
          title: "Aparelho aprovado!",
          description: `Produto ${id} aprovado e retornado ao estoque. Custo composto atualizado.`,
          className: "bg-green-500 text-white border-green-600"
        });
        navigate('/estoque/produtos-pendentes');
      }
      return;
    }

    if (parecerStatus === 'Retrabalho - Devolver para Laboratório') {
      // Retrabalho: atualizar status do produto pendente e da OS vinculada
      if (produto) {
        atualizarStatusProdutoPendente(produto.imei, 'Retrabalho - Recusado pelo Estoque', {
          osId: osVinculada?.id || 'N/A',
          resumo: `Recusado pelo Estoque: ${parecerObservacoes}`,
          tecnico: parecerResponsavel
        });

        // Atualizar a OS vinculada para retrabalho
        if (osVinculada) {
          const ordensServico = getOrdensServico();
          const os = ordensServico.find((o: any) => o.id === osVinculada.id);
          if (os) {
            os.status = 'Retrabalho - Recusado pelo Estoque';
            os.proximaAtuacao = 'Técnico';
            os.timeline.push({
              data: new Date().toISOString(),
              tipo: 'status',
              descricao: `Retrabalho solicitado pelo Estoque: ${parecerObservacoes}`,
              responsavel: parecerResponsavel
            });
          }
        }
      }
      toast({
        title: "Retrabalho solicitado",
        description: `Produto ${id} devolvido para o laboratório. Motivo: ${parecerObservacoes}`,
        variant: "destructive"
      });
      navigate('/estoque/produtos-pendentes');
      return;
    }

    // Fluxo padrão (análise inicial)
    const statusParecer = parecerStatus as 'Análise Realizada – Produto em ótimo estado' | 'Encaminhado para conferência da Assistência';
    
    const resultado = salvarParecerEstoque(id, statusParecer, parecerObservacoes, parecerResponsavel);

    if (resultado.produto) {
      if (resultado.migrado && statusParecer === 'Análise Realizada – Produto em ótimo estado') {
        toast({
          title: "Produto deferido!",
          description: `Produto ID ${id} deferido pelo Estoque – liberado para estoque`,
          className: "bg-green-500 text-white border-green-600"
        });
        navigate('/estoque/produtos-pendentes');
      } else {
        toast({
          title: "Parecer salvo!",
          description: `Produto ${id} encaminhado para Análise de Tratativas.`,
        });
        navigate('/os/analise-garantia');
      }
    }
  };

  const getTimelineIcon = (tipo: TimelineEntry['tipo']) => {
    switch (tipo) {
      case 'entrada':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'parecer_estoque':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'parecer_assistencia':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'despesa':
        return <DollarSign className="h-4 w-4 text-red-500" />;
      case 'liberacao':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const confirmacaoValida = confirmResponsavel && confirmData;

  if (!produto) {
    return (
      <EstoqueLayout title="Produto não encontrado">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Produto pendente não encontrado.</p>
          <Button className="mt-4" onClick={() => navigate('/estoque/produtos-pendentes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  const sla = calcularSLA(produto.dataEntrada);

  return (
    <EstoqueLayout title="Detalhes do Produto Pendente">
      <div className="space-y-6">
        {/* Header com botão voltar */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/estoque/produtos-pendentes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-bold">{produto.modelo}</h2>
            <p className="text-sm text-muted-foreground">IMEI: {produto.imei}</p>
          </div>
          <Badge variant="outline" className={
            produto.origemEntrada === 'Base de Troca' 
              ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 ml-auto'
              : 'bg-blue-500/10 text-blue-600 border-blue-500/30 ml-auto'
          }>
            {produto.origemEntrada}
          </Badge>
          {/* SLA Badge */}
          <Badge variant="outline" className={
            sla.cor === 'vermelho' ? 'bg-red-500/20 text-red-600 border-red-500/30' :
            sla.cor === 'amarelo' ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' :
            'bg-muted'
          }>
            SLA: {sla.dias} dias
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações do Produto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Informações do Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ID</Label>
                  <p className="font-mono">{produto.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IMEI</Label>
                  <p className="font-mono">{produto.imei}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Marca</Label>
                  <p>{produto.marca}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Modelo</Label>
                  <p>{produto.modelo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cor</Label>
                  <p>{produto.cor}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Condição</Label>
                  <Badge variant={produto.condicao === 'Novo' ? 'default' : 'secondary'}>
                    {produto.condicao}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Saúde Bateria</Label>
                  <p className={produto.saudeBateria < 80 ? 'text-red-500 font-medium' : ''}>
                    {produto.saudeBateria}%
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor de Custo (Original)</Label>
                  <p className="font-medium">{formatCurrency(produto.valorCustoOriginal)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Loja</Label>
                    <p>{obterNomeLoja(produto.loja)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Data Entrada</Label>
                    <p>{new Date(produto.dataEntrada).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              {produto.notaOuVendaId && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Referência</Label>
                    <p className="font-mono">{produto.notaOuVendaId}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quadro Parecer Estoque */}
          <Card className={produto.parecerEstoque ? 'border-green-500/30' : 'border-yellow-500/30'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Parecer Estoque
              </CardTitle>
              <CardDescription>
                {produto.parecerEstoque 
                  ? `Preenchido em ${formatDateTime(produto.parecerEstoque.data)}`
                  : 'Preencha o parecer para liberar ou encaminhar o produto'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Status do Parecer *</Label>
                    <Select value={parecerStatus} onValueChange={setParecerStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                       <SelectContent>
                        {produto.statusGeral === 'Serviço Concluído - Validar Aparelho' ? (
                          <>
                            <SelectItem value="Aparelho Aprovado - Retornar ao Estoque">
                              Aparelho Aprovado - Retornar ao Estoque
                            </SelectItem>
                            <SelectItem value="Retrabalho - Devolver para Laboratório">
                              Retrabalho - Devolver para Laboratório
                            </SelectItem>
                          </>
                        ) : produto.statusGeral === 'Retornado da Assistência' ? (
                          <SelectItem value="Produto revisado e deferido">
                            Produto revisado e deferido
                          </SelectItem>
                        ) : (
                          <>
                            <SelectItem value="Análise Realizada – Produto em ótimo estado">
                              Análise Realizada – Produto em ótimo estado
                            </SelectItem>
                            <SelectItem value="Encaminhado para conferência da Assistência">
                              Encaminhado para conferência da Assistência
                            </SelectItem>
                          </>
                        )}
                       </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Observações {(parecerStatus === 'Encaminhado para conferência da Assistência' || parecerStatus === 'Retrabalho - Devolver para Laboratório') && <span className="text-destructive">*</span>}
                    </Label>
                    <Textarea
                      placeholder={parecerStatus === 'Retrabalho - Devolver para Laboratório'
                        ? "Informe o motivo da recusa (obrigatório)..."
                        : parecerStatus === 'Encaminhado para conferência da Assistência' 
                        ? "Descreva as tratativas que o técnico deve realizar..." 
                        : "Descreva as observações sobre o produto..."}
                      value={parecerObservacoes}
                      onChange={(e) => setParecerObservacoes(e.target.value)}
                      rows={3}
                      className={(parecerStatus === 'Encaminhado para conferência da Assistência' || parecerStatus === 'Retrabalho - Devolver para Laboratório') && !parecerObservacoes.trim() ? 'border-destructive' : ''}
                    />
                    {parecerStatus === 'Retrabalho - Devolver para Laboratório' && (
                      <p className="text-xs text-destructive">Motivo obrigatório ao solicitar retrabalho</p>
                    )}
                    {parecerStatus === 'Encaminhado para conferência da Assistência' && (
                      <p className="text-xs text-destructive">Campo obrigatório ao encaminhar para assistência</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Responsável *</Label>
                    <Input
                      value={parecerResponsavel}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Usuário logado (campo bloqueado)</p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Data/Hora: {new Date().toLocaleString('pt-BR')} (automático)
                  </div>

                  <Button onClick={handleAbrirConfirmacao} className="w-full">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {produto.statusGeral === 'Serviço Concluído - Validar Aparelho' 
                      ? 'Validar Aparelho' 
                      : produto.statusGeral === 'Retornado da Assistência' 
                      ? 'Deferir Produto' 
                      : 'Salvar Parecer Estoque'}
                  </Button>
            </CardContent>
          </Card>
        </div>

        {/* Card Custo Composto + Resumo Técnico (aparece quando status = Validar Aparelho) */}
        {produto.statusGeral === 'Serviço Concluído - Validar Aparelho' && (
          <Card className="border-orange-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" />
                Serviço Concluído - Validação Pendente
              </CardTitle>
              <CardDescription>
                {osVinculada ? `OS Vinculada: ${osVinculada.id}` : 'Aguardando validação do gestor de estoque'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {osVinculada && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Resumo do Técnico</Label>
                    <p className="mt-1 p-3 rounded-lg bg-muted/50 text-sm">
                      {osVinculada.resumoConclusao || 'Sem resumo disponível'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Custo Peças/Insumos (OS)</Label>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(osVinculada.custoTotal || 0)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">OS ID</Label>
                      <p className="font-mono">{osVinculada.id}</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Peças Utilizadas */}
              {osVinculada?.pecas && osVinculada.pecas.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Peças Utilizadas</Label>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left p-2 text-xs text-muted-foreground font-medium">Descrição</th>
                            <th className="text-center p-2 text-xs text-muted-foreground font-medium">Qtd</th>
                            <th className="text-right p-2 text-xs text-muted-foreground font-medium">Valor</th>
                            <th className="text-left p-2 text-xs text-muted-foreground font-medium">Origem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {osVinculada.pecas.map((peca: any, idx: number) => (
                            <tr key={idx} className="border-t">
                              <td className="p-2">{peca.peca || peca.descricao || '-'}</td>
                              <td className="p-2 text-center">{peca.percentual || 1}</td>
                              <td className="p-2 text-right font-medium">{formatCurrency(peca.valorTotal || peca.valor || 0)}</td>
                              <td className="p-2">
                                <Badge variant="outline" className="text-xs">{peca.origem || 'Estoque'}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Valor de Entrada</p>
                  <p className="text-lg font-bold">{formatCurrency(produto.valorOrigem || produto.valorCustoOriginal)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Valor Original</p>
                  <p className="text-lg font-bold">{formatCurrency(produto.valorCustoOriginal)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Valor de Custo</p>
                  <p className="text-lg font-bold">{formatCurrency(produto.valorCusto || produto.valorCustoOriginal)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                  <p className="text-xs text-muted-foreground">Custo Assistência</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(produto.custoAssistencia || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Venda Recomendada</p>
                  <Badge variant="outline" className="mt-1 text-orange-600 border-orange-300">Pendente</Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Loja Atual</p>
                  <p className="text-sm font-bold">{obterNomeLoja(produto.loja)}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-xs text-muted-foreground">Custo Composto</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(produto.valorCustoOriginal + (produto.custoAssistencia || 0))}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline Completa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline do Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {produto.timeline.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                      {getTimelineIcon(entry.tipo)}
                    </div>
                    {index < produto.timeline.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{entry.titulo}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.data)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.descricao}</p>
                    {entry.responsavel && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.responsavel}
                      </p>
                    )}
                    {entry.valor && (
                      <p className="text-sm font-medium text-red-500 mt-1">
                        {formatCurrency(entry.valor)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Modal de Confirmação Dupla */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Confirmar Parecer
              </DialogTitle>
              <DialogDescription>
                Confirmar parecer "{parecerStatus}" para o produto ID {id}?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Responsável (Confirmar)</Label>
                <Input
                  value={confirmResponsavel}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Preenchido automaticamente (usuário logado)</p>
              </div>
              
              <div className="space-y-2">
                <Label>Data de Confirmação</Label>
                <Input 
                  type="date"
                  value={confirmData}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Preenchida automaticamente (data atual)</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmarParecer}
                disabled={!confirmacaoValida}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Parecer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EstoqueLayout>
  );
}
