import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  FileText, 
  User, 
  Warehouse, 
  Landmark,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  ClipboardCheck,
  Wrench,
  CreditCard,
  RotateCcw
} from 'lucide-react';
import { 
  NotaEntrada,
  NotaEntradaStatus,
  AtuacaoAtual,
  TipoPagamentoNota,
  getCreditosByFornecedor,
  getNotaEntradaById,
  conferirProdutoSimples,
} from '@/utils/notaEntradaFluxoApi';
import { getLoteRevisaoByNotaId, calcularAbatimento, criarLoteRevisao, encaminharLoteParaAssistencia, reconciliarLoteComOS, atualizarItemRevisao, sincronizarNotaComLote, registrarEventoTecnicoNaNota } from '@/utils/loteRevisaoApi';
import { LoteRevisaoResumo } from '@/components/estoque/LoteRevisaoResumo';
import { getFornecedores } from '@/utils/cadastrosApi';
import { getOrdemServicoById, updateOrdemServico } from '@/utils/assistenciaApi';
import { getProdutoByIMEI, atualizarCustoAssistencia, updateProduto } from '@/utils/estoqueApi';
import { formatCurrency } from '@/utils/formatUtils';
import { formatIMEI } from '@/utils/imeiMask';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const obterNomeFornecedor = (idOuNome: string): string => {
  if (!idOuNome.startsWith('FORN-')) {
    return idOuNome;
  }
  const fornecedores = getFornecedores();
  const fornecedor = fornecedores.find(f => f.id === idOuNome);
  return fornecedor?.nome || idOuNome;
};

interface NotaDetalhesContentProps {
  nota: NotaEntrada;
  showActions?: boolean;
}

export function NotaDetalhesContent({ nota, showActions = true }: NotaDetalhesContentProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [produtosOpen, setProdutosOpen] = useState(true);
  const [assistenciaOpen, setAssistenciaOpen] = useState(true);

  // Modal de encaminhamento para assistência
  const [modalAssistOpen, setModalAssistOpen] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState<Record<string, boolean>>({});
  const [motivosPorItem, setMotivosPorItem] = useState<Record<string, string>>({});

  // Modal de recusa de item assistência
  const [modalRecusaOpen, setModalRecusaOpen] = useState(false);
  const [itemRecusa, setItemRecusa] = useState<{ itemId: string; osId: string; modelo: string; imei?: string } | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  // Forçar re-render após ações
  const [refreshKey, setRefreshKey] = useState(0);

  const progressoConferencia = useMemo(() => {
    const total = nota.qtdInformada;
    const conferidos = nota.qtdConferida;
    const percentual = total > 0 ? Math.round((conferidos / total) * 100) : 0;
    return { conferidos, total, percentual };
  }, [nota]);

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

  // Produtos elegíveis para encaminhamento (com IMEI, não já encaminhados)
  const loteExistente = getLoteRevisaoByNotaId(nota.id);

  // Reconciliação retroativa ao abrir detalhes da nota
  const reconciliacaoExecutada = useRef(false);
  useEffect(() => {
    if (reconciliacaoExecutada.current) return;
    if (loteExistente && loteExistente.status !== 'Finalizado') {
      const responsavel = user?.colaborador?.nome || user?.username || 'Sistema';
      const reconciliou = reconciliarLoteComOS(loteExistente.id, responsavel);
      if (reconciliou) {
        console.log('[NotaDetalhes] Reconciliação retroativa executada para lote', loteExistente.id);
      }
      reconciliacaoExecutada.current = true;
    }
  }, [loteExistente, user]);

  const produtosElegiveis = useMemo(() => {
    const idsJaEncaminhados = loteExistente?.itens.map(i => i.produtoNotaId) || [];
    return nota.produtos.filter(p => 
      p.tipoProduto === 'Aparelho' && 
      p.imei && 
      p.categoria !== 'Novo' &&
      !idsJaEncaminhados.includes(p.id)
    );
  }, [nota.produtos, loteExistente]);

  const abrirModalEncaminhamento = () => {
    setItensSelecionados({});
    setMotivosPorItem({});
    setModalAssistOpen(true);
  };

  const toggleItemSelecionado = (produtoId: string) => {
    setItensSelecionados(prev => ({ ...prev, [produtoId]: !prev[produtoId] }));
  };

  const handleConfirmarEncaminhamento = () => {
    const selecionados = produtosElegiveis.filter(p => itensSelecionados[p.id]);
    if (selecionados.length === 0) {
      toast.error('Selecione ao menos um aparelho');
      return;
    }

    // Validar motivos
    for (const p of selecionados) {
      if (!motivosPorItem[p.id]?.trim()) {
        toast.error(`Informe o motivo para ${p.marca} ${p.modelo}`);
        return;
      }
    }

    const responsavel = user?.colaborador?.nome || user?.username || 'Sistema';

    const itensLote = selecionados.map(p => ({
      produtoNotaId: p.id,
      marca: p.marca,
      modelo: p.modelo,
      imei: p.imei || undefined,
      motivoAssistencia: motivosPorItem[p.id],
      responsavelRegistro: responsavel,
      dataRegistro: new Date().toISOString()
    }));

    const lote = criarLoteRevisao(nota.id, itensLote, responsavel);
    if (lote) {
      encaminharLoteParaAssistencia(lote.id, responsavel);
      const notaRef = getNotaEntradaById(nota.id);
      if (notaRef) {
        notaRef.loteRevisaoId = lote.id;
      }
      toast.success(`${selecionados.length} aparelho(s) encaminhado(s) para Análise de Tratativas`);
      setModalAssistOpen(false);
    } else {
      toast.error('Erro ao criar lote de revisão');
    }
  };
  // ===== HANDLERS DE CONFERIR / RECUSAR =====

  const handleConferirItem = (item: any, loteId: string) => {
    if (!item.osId) return;
    const osFresh = getOrdemServicoById(item.osId);
    if (!osFresh) return;

    const nomeResponsavel = user?.colaborador?.nome || user?.username || 'Gestor (Estoque)';
    const custoReparo = osFresh.valorCustoTecnico || 0;

    // Atualizar custo no produto do estoque
    if (osFresh.imeiAparelho) {
      const produto = getProdutoByIMEI(osFresh.imeiAparelho);
      if (produto) {
        atualizarCustoAssistencia(produto.id, osFresh.id, custoReparo);
        updateProduto(produto.id, { statusEmprestimo: null, emprestimoOsId: undefined });
      }
    }

    // Atualizar OS para Liquidado
    updateOrdemServico(item.osId, {
      status: 'Liquidado' as any,
      proximaAtuacao: '-',
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'validacao_financeiro',
        descricao: `Aparelho aprovado pelo Estoque. Custo: R$ ${custoReparo.toFixed(2)} incorporado.`,
        responsavel: nomeResponsavel
      }]
    });

    // Atualizar item do lote para Concluido
    atualizarItemRevisao(loteId, item.id, { statusReparo: 'Concluido', custoReparo });

    // Registrar evento na timeline da nota
    registrarEventoTecnicoNaNota(loteId, item.osId, 'retorno', nomeResponsavel);
    registrarEventoTecnicoNaNota(loteId, item.osId, 'abatimento', nomeResponsavel, { custo: custoReparo });

    // Sincronizar nota
    sincronizarNotaComLote(loteId, nomeResponsavel);

    toast.success(`Aparelho ${item.modelo} aprovado! Custo de R$ ${custoReparo.toFixed(2)} incorporado.`);
    setRefreshKey(k => k + 1);
  };

  const handleAbrirRecusa = (item: any) => {
    setItemRecusa({ itemId: item.id, osId: item.osId, modelo: item.modelo, imei: item.imei });
    setMotivoRecusa('');
    setModalRecusaOpen(true);
  };

  const handleConfirmarRecusa = () => {
    if (!itemRecusa?.osId) return;
    if (!motivoRecusa.trim()) {
      toast.error('Informe o motivo da recusa.');
      return;
    }

    const osFresh = getOrdemServicoById(itemRecusa.osId);
    if (!osFresh) return;

    const nomeResponsavel = user?.colaborador?.nome || user?.username || 'Gestor (Estoque)';
    const loteRevisao = getLoteRevisaoByNotaId(nota.id);

    // Devolver OS para retrabalho
    updateOrdemServico(itemRecusa.osId, {
      status: 'Retrabalho - Recusado pelo Estoque' as any,
      proximaAtuacao: 'Técnico',
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'status',
        descricao: `🔄 Retrabalho solicitado por ${nomeResponsavel} - Motivo: ${motivoRecusa}`,
        responsavel: nomeResponsavel,
        motivo: motivoRecusa
      }]
    });

    // Reverter item do lote para Em Andamento
    if (loteRevisao) {
      atualizarItemRevisao(loteRevisao.id, itemRecusa.itemId, { statusReparo: 'Em Andamento', custoReparo: 0 });
    }

    toast.success(`OS ${itemRecusa.osId} devolvida para retrabalho.`);
    setModalRecusaOpen(false);
    setItemRecusa(null);
    setMotivoRecusa('');
    setRefreshKey(k => k + 1);
  };

  // Handler para conferir produto direto (não encaminhado para assistência)
  const handleConferirProdutoDireto = (produtoId: string) => {
    const nomeResponsavel = user?.colaborador?.nome || user?.username || 'Estoque';
    const resultado = conferirProdutoSimples(nota.id, produtoId, nomeResponsavel);
    if (resultado) {
      toast.success('Produto conferido com sucesso!');
      setRefreshKey(k => k + 1);
    } else {
      toast.error('Erro ao conferir produto.');
    }
  };

  // IDs dos produtos encaminhados para assistência
  const idsEncaminhados = useMemo(() => {
    return new Set(loteExistente?.itens.map(i => i.produtoNotaId) || []);
  }, [loteExistente]);

  return (
    <div className="space-y-6">
      {/* Ações do estoque (condicionais) */}
      {showActions && (
        <div className="flex gap-2 justify-end flex-wrap">
          {podeEditar && nota.qtdCadastrada < nota.qtdInformada && (
            <Button onClick={() => navigate(`/estoque/nota/${nota.id}/cadastrar-produtos`)}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Produtos
            </Button>
          )}
          {podeEditar && produtosElegiveis.length > 0 && !loteExistente && (
            <Button variant="outline" onClick={abrirModalEncaminhamento} className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10">
              <Wrench className="mr-2 h-4 w-4" />
              Encaminhar para Assistência
            </Button>
          )}
        </div>
      )}

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
              {(nota.valorAbatimento || 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  (com abatimento de {formatCurrency(nota.valorAbatimento || 0)})
                </p>
              )}
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
                  {showActions && podeEditar && (
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
                      {showActions && <TableHead className="text-right">Ação</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nota.produtos.map((produto) => {
                      const encaminhadoAssist = idsEncaminhados.has(produto.id);
                      const podeConferir = showActions && produto.statusConferencia !== 'Conferido' && !encaminhadoAssist;
                      return (
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
                          {showActions && (
                            <TableCell className="text-right">
                              {podeConferir ? (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 gap-1 h-7 text-xs"
                                  onClick={() => handleConferirProdutoDireto(produto.id)}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Conferir
                                </Button>
                              ) : encaminhadoAssist && produto.statusConferencia !== 'Conferido' ? (
                                <span className="text-xs text-muted-foreground">Via Assistência</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Seção Assistência Técnica */}
      {(() => {
        const loteRevisao = getLoteRevisaoByNotaId(nota.id);
        if (!loteRevisao) return null;
        const abatimento = calcularAbatimento(loteRevisao.id);
        const creditos = nota.tipoPagamento === 'Pagamento 100% Antecipado' 
          ? getCreditosByFornecedor(nota.fornecedor) 
          : [];
        const creditosNota = creditos.filter(c => c.origem === nota.id);

        return (
          <Collapsible open={assistenciaOpen} onOpenChange={setAssistenciaOpen}>
            <Card className="border-primary/30">
              <CardHeader>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-primary" />
                      Assistência Técnica — Lote {loteRevisao.id}
                    </CardTitle>
                    {assistenciaOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {/* Resumo financeiro */}
                  {abatimento && (
                    <LoteRevisaoResumo
                      valorOriginalNota={abatimento.valorNota}
                      custoTotalReparos={abatimento.custoReparos}
                      valorLiquidoSugerido={abatimento.valorLiquido}
                      percentualReparo={abatimento.percentualReparo}
                    />
                  )}

                  {/* Tabela de itens */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Marca</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>IMEI</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Status Reparo</TableHead>
                        <TableHead>Custo Reparo</TableHead>
                        <TableHead>Parecer</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loteRevisao.itens.map(item => {
                        const os = item.osId ? getOrdemServicoById(item.osId) : null;
                        const parecer = os?.resumoConclusao || os?.conclusaoServico || (item.statusReparo === 'Concluido' ? 'Sem parecer' : 'Aguardando');
                        const podeValidar = os?.status === 'Serviço Concluído - Validar Aparelho';
                        return (
                          <TableRow key={item.id}>
                            <TableCell>{item.marca}</TableCell>
                            <TableCell>{item.modelo}</TableCell>
                            <TableCell className="font-mono text-xs">{item.imei || '-'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{item.motivoAssistencia}</TableCell>
                            <TableCell>
                              <Badge variant={item.statusReparo === 'Concluido' ? 'default' : item.statusReparo === 'Em Andamento' ? 'secondary' : 'outline'}>
                                {item.statusReparo}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.custoReparo > 0 ? formatCurrency(item.custoReparo) : '-'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={parecer}>
                              {parecer}
                            </TableCell>
                            <TableCell className="text-right">
                              {podeValidar ? (
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 gap-1 h-7 text-xs"
                                    onClick={() => handleConferirItem(item, loteRevisao.id)}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Conferir
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1 h-7 text-xs"
                                    onClick={() => handleAbrirRecusa(item)}
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Recusar
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Card de crédito para notas 100% Antecipadas */}
                  {nota.tipoPagamento === 'Pagamento 100% Antecipado' && creditosNota.length > 0 && (
                    <Card className="border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          Créditos Gerados ao Fornecedor
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {creditosNota.map(credito => (
                            <div key={credito.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div>
                                <p className="text-sm font-medium">{credito.descricao}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(credito.dataGeracao).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary">{formatCurrency(credito.valor)}</span>
                                <Badge variant={credito.utilizado ? 'secondary' : 'default'}>
                                  {credito.utilizado ? 'Utilizado' : 'Disponível'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })()}



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

      {/* Modal de Encaminhamento para Assistência */}
      <Dialog open={modalAssistOpen} onOpenChange={setModalAssistOpen}>
        <DialogContent className="max-w-2xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-500" />
              Encaminhar Aparelhos para Assistência
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              Selecione os aparelhos que precisam ser encaminhados e informe o motivo individualmente.
            </p>

            {produtosElegiveis.map(produto => (
              <div key={produto.id} className={`p-4 rounded-lg border ${itensSelecionados[produto.id] ? 'border-orange-500/50 bg-orange-500/5' : 'border-border'}`}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={!!itensSelecionados[produto.id]}
                    onCheckedChange={() => toggleItemSelecionado(produto.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{produto.marca} {produto.modelo}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        IMEI: {produto.imei ? formatIMEI(produto.imei) : '-'}
                      </span>
                    </div>
                    {itensSelecionados[produto.id] && (
                      <div>
                        <Label className="text-xs">Motivo do encaminhamento *</Label>
                        <Textarea
                          value={motivosPorItem[produto.id] || ''}
                          onChange={(e) => setMotivosPorItem(prev => ({ ...prev, [produto.id]: e.target.value }))}
                          placeholder="Descreva o defeito ou motivo..."
                          rows={2}
                          className="resize-none mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setModalAssistOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarEncaminhamento}
              className="bg-orange-500 hover:bg-orange-600 text-white border-none"
            >
              <Wrench className="mr-2 h-4 w-4" />
              Confirmar Encaminhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Recusa */}
      <Dialog open={modalRecusaOpen} onOpenChange={setModalRecusaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Solicitar Retrabalho — {itemRecusa?.modelo || ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
              <div>
                <Label className="text-xs text-muted-foreground">Modelo</Label>
                <p className="font-medium text-sm">{itemRecusa?.modelo || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">IMEI</Label>
                <p className="font-medium text-sm font-mono">{itemRecusa?.imei ? formatIMEI(itemRecusa.imei) : '-'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo da Recusa *</Label>
              <Textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Descreva o motivo pelo qual o serviço não está satisfatório..."
                rows={4}
                className={cn(!motivoRecusa && 'border-destructive')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRecusaOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmarRecusa} className="gap-1">
              <RotateCcw className="h-4 w-4" />
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
