import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { ComprovantePreview } from '@/components/vendas/ComprovantePreview';
import { FileUploadComprovante } from '@/components/estoque/FileUploadComprovante';
import { 
  getOrdemServicoById, 
  formatCurrency, 
  calcularSLADias,
  OrdemServico,
  updateOrdemServico
} from '@/utils/assistenciaApi';
import { atualizarStatusProdutoPendente } from '@/utils/osApi';
import { getLoteRevisaoById, atualizarItemRevisao, finalizarLoteComLogisticaReversa, ResultadoItemRevisao, sincronizarNotaComLote, registrarEventoTecnicoNaNota } from '@/utils/loteRevisaoApi';
import { marcarProdutoRetornoAssistencia } from '@/utils/estoqueApi';
import { getClientes, getFornecedores } from '@/utils/cadastrosApi';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { getSolicitacoesByOS, addSolicitacao, SolicitacaoPeca } from '@/utils/solicitacaoPecasApi';
import { getPecas } from '@/utils/pecasApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { ArrowLeft, FileText, Clock, AlertTriangle, User, Wrench, MapPin, Calendar, CreditCard, Save, Edit, Package, Plus, Trash2, CheckCircle, ImageIcon, DollarSign, ShieldCheck, Smartphone, Timer } from 'lucide-react';
import { formatarTempo, calcularTempoLiquido } from '@/components/assistencia/CronometroOS';
import { formatIMEI } from '@/utils/imeiMask';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { PagamentoQuadro } from '@/components/vendas/PagamentoQuadro';
import { Pagamento as PagamentoVendaType } from '@/utils/vendasApi';

export default function OSAssistenciaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [os, setOS] = useState<OrdemServico | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [solicitacoesOS, setSolicitacoesOS] = useState<SolicitacaoPeca[]>([]);

  // Editable fields
  const [editClienteId, setEditClienteId] = useState('');
  const [editLojaId, setEditLojaId] = useState('');
  const [editTecnicoId, setEditTecnicoId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editSetor, setEditSetor] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editPecas, setEditPecas] = useState<OrdemServico['pecas']>([]);
  const [editPagamentosQuadro, setEditPagamentosQuadro] = useState<PagamentoVendaType[]>([]);

  // Campos Etapa 2 - Avaliação Técnica
  const [valorCustoTecnico, setValorCustoTecnico] = useState<number>(0);
  const [valorVendaTecnico, setValorVendaTecnico] = useState<number>(0);
  const [valorServico, setValorServico] = useState<number>(0);

  // Solicitação de peças form
  const [novaSolPeca, setNovaSolPeca] = useState('');
  const [novaSolQtd, setNovaSolQtd] = useState(1);
  const [novaSolJustificativa, setNovaSolJustificativa] = useState('');

  // Dupla confirmação - Solicitação de peça
  const [modalConfirmarSolDetalhes, setModalConfirmarSolDetalhes] = useState(false);
  const [checkConfirmarSolDetalhes, setCheckConfirmarSolDetalhes] = useState(false);

  // Dupla confirmação
  const [modalConfirmarPagamento, setModalConfirmarPagamento] = useState(false);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);
  const [checkPagamento, setCheckPagamento] = useState(false);
  const [modalConfirmarRecebimento, setModalConfirmarRecebimento] = useState(false);
  const [recebimentoConfirmado, setRecebimentoConfirmado] = useState(false);
  const [checkRecebimento, setCheckRecebimento] = useState(false);
  const [modalConfirmarFinalizacao, setModalConfirmarFinalizacao] = useState(false);
  const [finalizacaoConfirmada, setFinalizacaoConfirmada] = useState(false);
  const [checkFinalizacao, setCheckFinalizacao] = useState(false);
  const [resumoConclusao, setResumoConclusao] = useState('');
  const [evidenciaComprovante, setEvidenciaComprovante] = useState('');
  const [evidenciaNome, setEvidenciaNome] = useState('');

  const { user } = useAuthStore();

  const pecasEstoque = getPecas();

  const clientes = getClientes();
  const { obterLojasPorTipo, obterTecnicos, obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const lojas = obterLojasPorTipo('Assistência');
  const tecnicos = obterTecnicos();
  const fornecedores = getFornecedores();

  useEffect(() => {
    if (id) {
      const ordem = getOrdemServicoById(id);
      setOS(ordem || null);
      if (ordem) {
        setEditClienteId(ordem.clienteId);
        setEditLojaId(ordem.lojaId);
        setEditTecnicoId(ordem.tecnicoId);
        setEditStatus(ordem.status);
        setEditSetor(ordem.setor);
        setEditDescricao(ordem.descricao || '');
        setEditPecas([...ordem.pecas]);
        setEditPagamentosQuadro(ordem.pagamentos.map(p => ({
          id: p.id,
          meioPagamento: p.meio,
          valor: p.valor,
          contaDestino: (p as any).contaDestino || '',
          parcelas: p.parcelas || 1,
          comprovante: (p as any).comprovante || '',
          comprovanteNome: (p as any).comprovanteNome || '',
        })));
        setValorCustoTecnico(ordem.valorCustoTecnico || 0);
        setValorVendaTecnico(ordem.valorVendaTecnico || 0);
        setValorServico(ordem.valorServico || 0);
      }
      const solicitacoes = getSolicitacoesByOS(id);
      setSolicitacoesOS(solicitacoes);
    }
  }, [id]);

  useEffect(() => {
    if (os) {
      QRCode.toDataURL(`OS:${os.id}|VALOR:${os.valorTotal}|DATA:${os.dataHora}`)
        .then(url => setQrCodeUrl(url))
        .catch(console.error);
    }
  }, [os]);

  const canEdit = os && os.status !== 'Serviço concluído' && os.status !== 'Cancelada';

  const handleSaveChanges = () => {
    if (!os) return;
    
    // Ler OS mais recente do store para preservar dados atualizados por outras operações
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    
    const valorTotal = editPecas.reduce((acc, p) => acc + p.valorTotal, 0);
    const pagamentosConvertidos = editPagamentosQuadro.map(p => ({
      id: p.id,
      meio: p.meioPagamento,
      valor: p.valor,
      parcelas: p.parcelas
    }));
    // Preservar peças originais se editPecas estiver vazio mas OS já tinha peças
    const pecasParaSalvar = editPecas.length > 0 ? editPecas : (osFresh.pecas.length > 0 ? osFresh.pecas : editPecas);
    
    // Determinar proximaAtuacao com base no status editado
    let proximaAtuacao = osFresh.proximaAtuacao;
    if (editStatus === 'Solicitação de Peça') {
      proximaAtuacao = 'Gestor (Suprimentos)';
    } else if (editStatus === 'Em serviço') {
      proximaAtuacao = 'Técnico';
    }
    
    updateOrdemServico(os.id, {
      clienteId: editClienteId,
      lojaId: editLojaId,
      tecnicoId: editTecnicoId,
      status: editStatus as any,
      proximaAtuacao,
      setor: editSetor as 'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA',
      descricao: editDescricao,
      pecas: pecasParaSalvar,
      pagamentos: pagamentosConvertidos,
      valorTotal,
      // Preservar campos existentes da versão mais recente do store
      timeline: osFresh.timeline,
      valorCustoTecnico: osFresh.valorCustoTecnico,
      valorVendaTecnico: osFresh.valorVendaTecnico,
      observacaoOrigem: osFresh.observacaoOrigem,
      origemOS: osFresh.origemOS,
      garantiaId: osFresh.garantiaId,
      modeloAparelho: osFresh.modeloAparelho,
      imeiAparelho: osFresh.imeiAparelho,
      resumoConclusao: osFresh.resumoConclusao,
      fotosEntrada: osFresh.fotosEntrada,
    });
    
    // Refresh OS data and re-sync edit states
    const updatedOS = getOrdemServicoById(os.id);
    setOS(updatedOS || null);
    if (updatedOS) {
      setEditPecas([...updatedOS.pecas]);
      setEditClienteId(updatedOS.clienteId);
      setEditLojaId(updatedOS.lojaId);
      setEditTecnicoId(updatedOS.tecnicoId);
      setEditStatus(updatedOS.status);
      setEditSetor(updatedOS.setor);
      setEditDescricao(updatedOS.descricao || '');
      setValorCustoTecnico(updatedOS.valorCustoTecnico || 0);
      setValorVendaTecnico(updatedOS.valorVendaTecnico || 0);
      setValorServico(updatedOS.valorServico || 0);
      setEditPagamentosQuadro(updatedOS.pagamentos.map(p => ({
        id: p.id,
        meioPagamento: p.meio,
        valor: p.valor,
        contaDestino: (p as any).contaDestino || '',
        parcelas: p.parcelas || 1,
        comprovante: (p as any).comprovante || '',
        comprovanteNome: (p as any).comprovanteNome || '',
      })));
    }
    // Recarregar solicitações
    if (os.id) {
      setSolicitacoesOS(getSolicitacoesByOS(os.id));
    }
    setIsEditing(false);
    toast.success('Alterações salvas com sucesso!');
  };

  const handleVoltar = () => {
    const from = searchParams.get('from');
    if (from === 'solicitacoes') {
      navigate('/os/solicitacoes-pecas');
    } else {
      navigate('/os/assistencia');
    }
  };

  if (!os) {
    return (
      <PageLayout title="OS não encontrada">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Ordem de serviço não encontrada.</p>
          <Button onClick={handleVoltar}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </PageLayout>
    );
  }

  const cliente = clientes.find(c => c.id === (isEditing ? editClienteId : os.clienteId));
  const loja = lojas.find(l => l.id === (isEditing ? editLojaId : os.lojaId));
  const tecnico = tecnicos.find(t => t.id === (isEditing ? editTecnicoId : os.tecnicoId));
  const slaDias = calcularSLADias(os.dataHora);

  const getLojaNome = (lojaId: string) => obterNomeLoja(lojaId);
  const getTecnicoNome = (tecnicoId: string) => obterNomeColaborador(tecnicoId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Em Aberto':
        return <Badge className="bg-slate-500 hover:bg-slate-600">Em Aberto</Badge>;
      case 'Aguardando Análise':
        return <Badge className="bg-slate-500 hover:bg-slate-600">Aguardando Análise</Badge>;
      case 'Serviço concluído':
        return <Badge className="bg-green-500 hover:bg-green-600">Serviço Concluído</Badge>;
      case 'Em serviço':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Em serviço</Badge>;
      case 'Aguardando Peça':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Aguardando Peça</Badge>;
      case 'Solicitação Enviada':
      case 'Solicitação de Peça':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Solicitação de Peça</Badge>;
      case 'Em Análise':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Em Análise</Badge>;
      case 'Aguardando Aprovação do Gestor':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Aguardando Aprovação</Badge>;
      case 'Rejeitado pelo Gestor':
        return <Badge className="bg-red-500 hover:bg-red-600">Rejeitado</Badge>;
      case 'Pagamento - Financeiro':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Pagamento - Financeiro</Badge>;
      case 'Pagamento Finalizado':
        return <Badge className="bg-teal-500 hover:bg-teal-600">Pagamento Finalizado</Badge>;
      case 'Pagamento Concluído':
        return <Badge className="bg-teal-500 hover:bg-teal-600">Pagamento Concluído</Badge>;
      case 'Aguardando Chegada da Peça':
        return <Badge className="bg-cyan-500 hover:bg-cyan-600">Aguardando Chegada</Badge>;
      case 'Peça Recebida':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Peça Recebida</Badge>;
      case 'Peça em Estoque / Aguardando Reparo':
        return <Badge className="bg-lime-500 hover:bg-lime-600">Aguardando Reparo</Badge>;
      case 'Aguardando Recebimento':
        return <Badge className="bg-cyan-500 hover:bg-cyan-600">Aguardando Recebimento</Badge>;
      case 'Em Execução':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Em Execução</Badge>;
      case 'Aguardando Pagamento':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Aguardando Pagamento</Badge>;
      case 'Aguardando Conferência':
      case 'Pendente de Pagamento':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Pendente de Pagamento</Badge>;
      case 'Conferência do Gestor':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Conferência do Gestor</Badge>;
      case 'Concluído':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Concluído</Badge>;
      case 'Finalizado':
        return <Badge className="bg-emerald-700 hover:bg-emerald-800">Finalizado</Badge>;
      case 'Aguardando Financeiro':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Aguardando Financeiro</Badge>;
      case 'Liquidado':
        return <Badge className="bg-green-700 hover:bg-green-800">Liquidado</Badge>;
      case 'Serviço Concluído - Validar Aparelho':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Validar Aparelho</Badge>;
      case 'Retrabalho - Recusado pelo Estoque':
        return <Badge className="bg-red-600 hover:bg-red-700">🔄 Retrabalho</Badge>;
      case 'Recusada pelo Técnico':
        return <Badge variant="destructive">Recusada pelo Técnico</Badge>;
      case 'Cancelada':
        return <Badge className="bg-red-700 hover:bg-red-800">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleConcluirServicoClick = () => {
    if (!os) return;
    const isEstoque = os.origemOS === 'Estoque';
    const valorServicoFinal = isEstoque ? 0 : valorServico;
    const valorVendaCalculado = valorCustoTecnico + valorServicoFinal;
    if (!valorCustoTecnico) {
      toast.error('Preencha o Valor de Custo antes de concluir o serviço.');
      return;
    }
    if (!isEstoque && valorVendaCalculado <= 0) {
      toast.error('O Valor a ser cobrado deve ser maior que 0.');
      return;
    }
    setCheckFinalizacao(false);
    setModalConfirmarFinalizacao(true);
  };

  const handleConfirmarFinalizacao = () => {
    if (!os) return;
    if (!resumoConclusao.trim()) {
      toast.error('Preencha o Resumo da Conclusão antes de finalizar.');
      return;
    }
    const isEstoque = os.origemOS === 'Estoque';
    const valorServicoFinal = isEstoque ? 0 : valorServico;
    const valorVendaCalculado = valorCustoTecnico + valorServicoFinal;
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    
    const novoStatus = isEstoque ? 'Serviço Concluído - Validar Aparelho' : 'Serviço concluído';
    const novaAtuacao = isEstoque ? 'Gestor (Estoque)' : 'Atendente';
    const descMsg = isEstoque
      ? `Serviço finalizado pelo técnico (Origem: Estoque). Custo peças: R$ ${valorCustoTecnico.toFixed(2)}. Encaminhado para validação do Gestor de Estoque.`
      : `Serviço finalizado pelo técnico. Custo: R$ ${valorCustoTecnico.toFixed(2)}, Venda: R$ ${valorVendaCalculado.toFixed(2)}`;

    const responsavelNome = user?.colaborador?.nome || tecnico?.nome || 'Técnico';

    updateOrdemServico(os.id, {
      status: novoStatus as any,
      proximaAtuacao: novaAtuacao as any,
      valorCustoTecnico,
      valorVendaTecnico: valorVendaCalculado,
      valorServico: valorServicoFinal,
      resumoConclusao,
      pecas: osFresh.pecas,
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'conclusao_servico',
        descricao: descMsg,
        responsavel: responsavelNome
      }]
    });
    // Sincronizar com Aparelhos Pendentes no Estoque
    if (isEstoque && osFresh.imeiAparelho) {
      atualizarStatusProdutoPendente(osFresh.imeiAparelho, 'Serviço Concluído - Validar Aparelho', {
        osId: os.id,
        resumo: resumoConclusao,
        custoPecas: valorCustoTecnico,
        tecnico: responsavelNome
      });
    }
    // Sincronizar lote de revisão com estoque (OS individual)
    if (osFresh.loteRevisaoId && osFresh.loteRevisaoItemId) {
      // Marcar produto como retornado da assistência
      if (osFresh.imeiAparelho) {
        marcarProdutoRetornoAssistencia(osFresh.imeiAparelho);
      }
      // Atualizar custo e status do item no lote
      atualizarItemRevisao(osFresh.loteRevisaoId, osFresh.loteRevisaoItemId, {
        custoReparo: valorCustoTecnico,
        statusReparo: 'Concluido'
      });

      // Registrar eventos técnicos na timeline da nota
      registrarEventoTecnicoNaNota(osFresh.loteRevisaoId, os.id, 'finalizacao', responsavelNome, {
        resumo: resumoConclusao,
        custo: valorCustoTecnico
      });

      // Sincronizar nota com abatimento parcial (acumula conforme itens concluem)
      sincronizarNotaComLote(osFresh.loteRevisaoId, responsavelNome);

      // Verificar se TODOS os itens do lote estão concluídos
      const lote = getLoteRevisaoById(osFresh.loteRevisaoId);
      if (lote) {
        const allDone = lote.itens.every(i => i.statusReparo === 'Concluido');
        if (allDone) {
          const resultados: ResultadoItemRevisao[] = lote.itens.map(i => ({
            itemId: i.id,
            resultado: 'Consertado' as const
          }));
          finalizarLoteComLogisticaReversa(osFresh.loteRevisaoId, resultados, responsavelNome);
        }
      }
    }
    setEditStatus(novoStatus);
    const updatedOS = getOrdemServicoById(os.id);
    setOS(updatedOS || null);
    setFinalizacaoConfirmada(true);
    setModalConfirmarFinalizacao(false);
    setCheckFinalizacao(false);
    const toastMsg = isEstoque
      ? 'Serviço finalizado! Encaminhado para validação do Gestor de Estoque.'
      : 'Serviço finalizado! Aguardando pagamento do atendente.';
    toast.success(toastMsg);
  };

  const handleSalvarPagamentoVendedor = () => {
    if (!os) return;
    // Ler OS mais recente do store
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    if (!osFresh.valorCustoTecnico || !osFresh.valorVendaTecnico) {
      toast.error('O técnico precisa preencher os campos de Valor de Custo e Valor a ser cobrado antes do registro de pagamento.');
      return;
    }
    const pagamentosConvertidos = editPagamentosQuadro.map(p => ({
      id: p.id,
      meio: p.meioPagamento,
      valor: p.valor,
      parcelas: p.parcelas,
      comprovante: p.comprovante,
      comprovanteNome: p.comprovanteNome,
      contaDestino: p.contaDestino,
    }));
    const valorTotal = editPagamentosQuadro.reduce((acc, p) => acc + p.valor, 0);
    updateOrdemServico(os.id, {
      pagamentos: pagamentosConvertidos,
      valorTotal,
      status: 'Conferência do Gestor' as any,
      proximaAtuacao: 'Gestor',
      pecas: osFresh.pecas, // Preservar peças
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'pagamento',
        descricao: `Pagamento registrado por ${user?.colaborador?.nome || user?.username || 'Vendedor'}: R$ ${valorTotal.toFixed(2)}`,
        responsavel: user?.colaborador?.nome || user?.username || 'Vendedor'
      }]
    });
    const updatedOS = getOrdemServicoById(os.id);
    setOS(updatedOS || null);
    toast.success('Pagamento registrado! Enviado para conferência do gestor.');
  };

  const handleValidarFinanceiro = () => {
    if (!os) return;
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    updateOrdemServico(os.id, {
      status: 'Liquidado' as any,
      proximaAtuacao: '-',
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'validacao_financeiro',
        descricao: 'Lançamento validado pelo financeiro. OS liquidada.',
        responsavel: 'Financeiro'
      }]
    });
    const updatedOS = getOrdemServicoById(os.id);
    setOS(updatedOS || null);
    toast.success('Lançamento validado! OS liquidada com sucesso.');
  };

  const getSetorBadge = (setor: string) => {
    switch (setor) {
      case 'GARANTIA':
        return <Badge variant="outline" className="border-green-500 text-green-600">Garantia</Badge>;
      case 'ASSISTÊNCIA':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Assistência</Badge>;
      case 'TROCA':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Troca</Badge>;
      default:
        return <Badge variant="outline">{setor}</Badge>;
    }
  };

  const getSLADisplay = () => {
    let bgClass = '';
    let icon = null;

    if (slaDias >= 5) {
      bgClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      icon = <AlertTriangle className="h-4 w-4" />;
    } else if (slaDias >= 3) {
      bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      icon = <Clock className="h-4 w-4" />;
    }

    return (
      <span className={cn('px-3 py-1 rounded text-sm font-medium inline-flex items-center gap-2', bgClass)}>
        {icon}
        {slaDias} dias
      </span>
    );
  };

  const handleGerarRecibo = () => {
    const content = `
===========================================
           RECIBO DE SERVIÇO
===========================================

Nº OS: ${os.id}
Data: ${new Date(os.dataHora).toLocaleString('pt-BR')}
Setor: ${os.setor}
Status: ${os.status}

-------------------------------------------
CLIENTE
-------------------------------------------
Nome: ${cliente?.nome || '-'}
CPF/CNPJ: ${cliente?.cpf || '-'}
Telefone: ${cliente?.telefone || '-'}

-------------------------------------------
TÉCNICO / LOJA
-------------------------------------------
Técnico: ${tecnico?.nome || '-'}
Loja: ${loja?.nome || '-'}

-------------------------------------------
PEÇAS / SERVIÇOS
-------------------------------------------
${os.pecas.map(p => `${p.peca} - ${formatCurrency(p.valorTotal)}`).join('\n')}

-------------------------------------------
PAGAMENTOS
-------------------------------------------
${os.pagamentos.map(p => `${p.meio} - ${formatCurrency(p.valor)}`).join('\n')}

-------------------------------------------
TOTAL: ${formatCurrency(os.valorTotal)}
-------------------------------------------

${os.descricao ? `\nDescrição:\n${os.descricao}` : ''}

===========================================
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${os.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout title={`Detalhes da OS ${os.id}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleVoltar}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{os.id}</h2>
              <p className="text-sm text-muted-foreground">
                {new Date(os.dataHora).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {getStatusBadge(isEditing ? editStatus : os.status)}
            {getSetorBadge(isEditing ? editSetor : os.setor)}
            {getSLADisplay()}
            {canEdit && !isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar OS
              </Button>
            )}
            {isEditing && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveChanges}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </>
            )}
            <Button onClick={handleGerarRecibo}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Recibo
            </Button>
          </div>
        </div>

        {canEdit && !isEditing && (
          <div className="bg-blue-100 dark:bg-blue-950/30 p-3 rounded-lg text-blue-700 dark:text-blue-300 text-sm flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Esta OS ainda pode ser editada. Clique em "Editar OS" para fazer alterações.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações do Aparelho */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Informações do Aparelho
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Modelo do Aparelho</p>
                    <p className="font-medium">{os.modeloAparelho || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">IMEI</p>
                    <p className="font-medium font-mono">{formatIMEI(os.imeiAparelho || '')}</p>
                  </div>
                </div>
                {/* Tempo de Bancada */}
                {os.cronometro?.iniciadoEm && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <Timer className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Tempo de Bancada</p>
                        <p className="text-2xl font-mono font-bold">{formatarTempo(calcularTempoLiquido(os.cronometro))}</p>
                      </div>
                      {os.cronometro.editadoPor && (
                        <span className="text-[10px] text-muted-foreground italic">Editado por {os.cronometro.editadoPor}</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Cliente</label>
                      <Select value={editClienteId} onValueChange={setEditClienteId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nome} - {c.cpf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {cliente && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                          <p className="font-medium">{cliente.cpf}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Telefone</p>
                          <p className="font-medium">{cliente.telefone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">E-mail</p>
                          <p className="font-medium">{cliente.email || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{cliente?.nome || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                      <p className="font-medium">{cliente?.cpf || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{cliente?.telefone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="font-medium">{cliente?.email || '-'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Peças/Serviços */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Peças / Serviços
                  </span>
                  {isEditing && (
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditPecas([...editPecas, {
                        id: `PECA-${Date.now()}`,
                        peca: '',
                        imei: '',
                        valor: 0,
                        percentual: 0,
                        valorTotal: 0,
                        unidadeServico: '',
                        pecaNoEstoque: false,
                        pecaDeFornecedor: false,
                        servicoTerceirizado: false
                      }]);
                    }}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    {editPecas.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma peça/serviço adicionada. Clique em "Adicionar" para incluir.</p>
                    )}
                    {editPecas.map((peca, index) => (
                      <div key={index} className="p-3 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Item {index + 1}</span>
                          <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => {
                            setEditPecas(editPecas.filter((_, i) => i !== index));
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Origem da Peça</label>
                            <Select
                              value={peca.pecaNoEstoque ? 'estoque' : peca.pecaDeFornecedor ? 'fornecedor' : peca.servicoTerceirizado ? 'terceirizado' : 'nenhum'}
                              onValueChange={(val) => {
                                const updated = [...editPecas];
                                updated[index] = {
                                  ...updated[index],
                                  pecaNoEstoque: val === 'estoque',
                                  pecaDeFornecedor: val === 'fornecedor',
                                  servicoTerceirizado: val === 'terceirizado',
                                };
                                setEditPecas(updated);
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nenhum">Nenhum</SelectItem>
                                <SelectItem value="estoque">Peça no estoque</SelectItem>
                                <SelectItem value="fornecedor">Fornecedor</SelectItem>
                                <SelectItem value="terceirizado">Serviço Terceirizado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Descrição *</label>
                            {peca.pecaNoEstoque ? (
                              <Select
                                value={peca.peca}
                                onValueChange={(value) => {
                                  const updated = [...editPecas];
                                  updated[index] = { ...updated[index], peca: value };
                                  setEditPecas(updated);
                                }}
                              >
                                <SelectTrigger className={cn(!peca.peca && 'border-destructive')}>
                                  <SelectValue placeholder="Selecione a peça do estoque" />
                                </SelectTrigger>
                                <SelectContent>
                                {peca.peca && !pecasEstoque.some(p => p.descricao === peca.peca && p.status === 'Disponível' && p.quantidade > 0) && (
                                  <SelectItem value={peca.peca}>{peca.peca} (salvo anteriormente)</SelectItem>
                                )}
                                {pecasEstoque
                                    .filter(p => p.status === 'Disponível' && p.quantidade > 0)
                                    .map(p => (
                                       <SelectItem key={p.id} value={p.descricao}>
                                         <div className="flex items-center gap-2 flex-wrap">
                                           <span className="font-medium">{p.descricao}</span>
                                           <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                                             {obterNomeLoja(p.lojaId)}
                                           </Badge>
                                           <Badge className={cn(
                                             "text-xs",
                                             p.quantidade > 3 
                                               ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" 
                                               : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                           )}>
                                             {p.quantidade} un.
                                           </Badge>
                                         </div>
                                       </SelectItem>
                                     ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={peca.peca}
                                onChange={(e) => {
                                  const updated = [...editPecas];
                                  updated[index] = { ...updated[index], peca: e.target.value };
                                  setEditPecas(updated);
                                }}
                                placeholder="Descrição da peça/serviço"
                                className={cn(!peca.peca && 'border-destructive')}
                              />
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Valor (R$)</label>
                            <Input
                              type="number"
                              value={peca.valor || ''}
                              onChange={(e) => {
                                const valor = parseFloat(e.target.value) || 0;
                                const updated = [...editPecas];
                                const valorTotal = valor - (valor * (updated[index].percentual / 100));
                                updated[index] = { ...updated[index], valor, valorTotal };
                                setEditPecas(updated);
                              }}
                              placeholder="0,00"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Desconto (%)</label>
                            <Input
                              type="number"
                              value={peca.percentual || ''}
                              onChange={(e) => {
                                const percentual = parseFloat(e.target.value) || 0;
                                const updated = [...editPecas];
                                const valorTotal = updated[index].valor - (updated[index].valor * (percentual / 100));
                                updated[index] = { ...updated[index], percentual, valorTotal };
                                setEditPecas(updated);
                              }}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end text-sm">
                          <span className="font-medium">Valor Total: {formatCurrency(peca.valorTotal)}</span>
                        </div>

                        {peca.pecaDeFornecedor && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                            <div>
                              <label className="text-xs text-muted-foreground">Fornecedor</label>
                              <AutocompleteFornecedor
                                value={peca.fornecedorId || ''}
                                onChange={(v) => {
                                  const updated = [...editPecas];
                                  updated[index] = { ...updated[index], fornecedorId: v };
                                  setEditPecas(updated);
                                }}
                                placeholder="Selecione o fornecedor..."
                              />
                            </div>
                          </div>
                        )}

                        {peca.servicoTerceirizado && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
                            <div>
                              <label className="text-xs text-muted-foreground">Descrição do Serviço Terceirizado</label>
                              <Input
                                value={peca.descricaoTerceirizado || ''}
                                onChange={(e) => {
                                  const updated = [...editPecas];
                                  updated[index] = { ...updated[index], descricaoTerceirizado: e.target.value };
                                  setEditPecas(updated);
                                }}
                                placeholder="Descreva o serviço..."
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Fornecedor do Serviço</label>
                              <AutocompleteFornecedor
                                value={peca.fornecedorId || ''}
                                onChange={(v) => {
                                  const updated = [...editPecas];
                                  updated[index] = { ...updated[index], fornecedorId: v };
                                  setEditPecas(updated);
                                }}
                                placeholder="Selecione..."
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Nome Resp. Fornecedor *</label>
                              <Input
                                value={(peca as any).nomeRespFornecedor || ''}
                                onChange={(e) => {
                                  const updated = [...editPecas];
                                  updated[index] = { ...updated[index], nomeRespFornecedor: e.target.value } as any;
                                  setEditPecas(updated);
                                }}
                                placeholder="Nome do responsável..."
                                className={cn(!(peca as any).nomeRespFornecedor && 'border-destructive')}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {os.pecas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma peça/serviço registrada.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>IMEI</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Desconto</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Origem</TableHead>
                            <TableHead>Origem da Peça</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {os.pecas.map((peca, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{peca.peca}</TableCell>
                              <TableCell className="font-mono text-xs">{peca.imei || '-'}</TableCell>
                              <TableCell>{formatCurrency(peca.valor)}</TableCell>
                              <TableCell>{peca.percentual}%</TableCell>
                              <TableCell className="font-medium">{formatCurrency(peca.valorTotal)}</TableCell>
                              <TableCell>
                                {peca.pecaNoEstoque && (
                                  <Badge variant="outline" className="mr-1 cursor-pointer hover:bg-primary/10" onClick={() => navigate('/os/pecas')}>Estoque</Badge>
                                )}
                                {peca.pecaDeFornecedor && (
                                  <Badge variant="outline">{fornecedores.find(f => f.id === peca.fornecedorId)?.nome || 'Fornecedor'}</Badge>
                                )}
                                {peca.servicoTerceirizado && <Badge variant="secondary">Terceirizado</Badge>}
                              </TableCell>
                              <TableCell>
                                {peca.origemPeca && (
                                  <Badge className={
                                    peca.origemPeca === 'Consignado' ? 'bg-violet-500/15 text-violet-700 border-violet-500/30 hover:bg-violet-500/20' :
                                    peca.origemPeca === 'Estoque Thiago' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20' :
                                    peca.origemPeca === 'Retirada de Pecas' ? 'bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/20' :
                                    peca.origemPeca === 'Fornecedor' ? 'bg-blue-500/15 text-blue-700 border-blue-500/30 hover:bg-blue-500/20' :
                                    'bg-muted text-muted-foreground border-muted'
                                  } variant="outline">
                                    {peca.origemPeca}
                                  </Badge>
                                )}
                                {peca.origemServico && (
                                  <Badge variant="secondary" className="ml-1 text-[10px]">{peca.origemServico}</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Solicitações de Peças - sempre visível */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Solicitações de Peças
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {solicitacoesOS.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Peça</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Justificativa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitacoesOS.map((sol) => (
                        <TableRow key={sol.id}>
                          <TableCell className="font-medium">{sol.peca}</TableCell>
                          <TableCell>{sol.quantidade}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{sol.justificativa}</TableCell>
                          <TableCell>
                            {(() => {
                              switch (sol.status) {
                                case 'Pendente': return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
                                case 'Aprovada': return <Badge className="bg-green-500 hover:bg-green-600">Aprovada</Badge>;
                                case 'Rejeitada': return <Badge className="bg-red-500 hover:bg-red-600">Rejeitada</Badge>;
                                case 'Enviada': return <Badge className="bg-blue-500 hover:bg-blue-600">Enviada</Badge>;
                                case 'Recebida': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Recebida</Badge>;
                                case 'Cancelada': return <Badge className="bg-gray-500 hover:bg-gray-600">Cancelada</Badge>;
                                default: return <Badge variant="secondary">{sol.status}</Badge>;
                              }
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(sol.dataSolicitacao).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Nenhuma solicitação registrada.</p>
                )}

                {/* Formulário para nova solicitação */}
                {isEditing && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-medium">Nova Solicitação de Peça</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Peça *</label>
                        <Input
                          value={novaSolPeca}
                          onChange={(e) => setNovaSolPeca(e.target.value)}
                          placeholder="Nome da peça"
                          className={cn(!novaSolPeca && 'border-destructive')}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Quantidade</label>
                        <Input
                          type="number"
                          min={1}
                          value={novaSolQtd}
                          onChange={(e) => setNovaSolQtd(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Justificativa *</label>
                        <Input
                          value={novaSolJustificativa}
                          onChange={(e) => setNovaSolJustificativa(e.target.value)}
                          placeholder="Justificativa"
                          className={cn(!novaSolJustificativa && 'border-destructive')}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => {
                        setNovaSolPeca('');
                        setNovaSolQtd(1);
                        setNovaSolJustificativa('');
                      }}>
                        Cancelar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        if (!novaSolPeca.trim() || !novaSolJustificativa.trim()) {
                          toast.error('Preencha peça e justificativa');
                          return;
                        }
                        setCheckConfirmarSolDetalhes(false);
                        setModalConfirmarSolDetalhes(true);
                      }}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Solicitação
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botão Confirmar Recebimento - visível quando status é Solicitação de Peça */}
            {(os.status === 'Solicitação de Peça' || os.status === 'Aguardando Peça' || os.status === 'Solicitação Enviada') && (
              <Card className="border-yellow-500/50 bg-yellow-50/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-700">Peça solicitada — aguardando recebimento</span>
                    </div>
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={recebimentoConfirmado}
                      onClick={() => {
                        setCheckRecebimento(false);
                        setModalConfirmarRecebimento(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {recebimentoConfirmado ? 'Recebimento Confirmado' : 'Confirmar Recebimento'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Avaliação Técnica - Etapa 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Avaliação Técnica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Valor de Custo (R$)</label>
                    <InputComMascara
                      mascara="moeda"
                      value={valorCustoTecnico}
                      onChange={(formatted, raw) => setValorCustoTecnico(typeof raw === 'number' ? raw : 0)}
                      placeholder="0,00"
                      disabled={os.proximaAtuacao !== 'Técnico: Avaliar/Executar' && os.proximaAtuacao !== 'Técnico' && !!os.valorCustoTecnico}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Custo de peças/insumos utilizados</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Valor do serviço (R$)</label>
                    <InputComMascara
                      mascara="moeda"
                      value={os.origemOS === 'Estoque' ? 0 : valorServico}
                      onChange={(formatted, raw) => {
                        if (os.origemOS !== 'Estoque') {
                          setValorServico(typeof raw === 'number' ? raw : 0);
                        }
                      }}
                      placeholder="0,00"
                      disabled={os.origemOS === 'Estoque' || (os.proximaAtuacao !== 'Técnico: Avaliar/Executar' && os.proximaAtuacao !== 'Técnico' && !!os.valorServico)}
                      className={os.origemOS === 'Estoque' ? 'bg-muted' : ''}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {os.origemOS === 'Estoque' ? 'Mão de obra zerada (Origem: Estoque)' : 'Valor da mão de obra'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Valor a ser cobrado (R$)</label>
                    <InputComMascara
                      mascara="moeda"
                      value={valorCustoTecnico + valorServico}
                      onChange={() => {}}
                      placeholder="0,00"
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Custo + Serviço (calculado automaticamente)</p>
                  </div>
                </div>
                {(os.proximaAtuacao === 'Técnico: Avaliar/Executar' || os.proximaAtuacao === 'Técnico') && os.status !== 'Finalizado' && os.status !== 'Liquidado' && os.status !== 'Serviço concluído' && (
                  <Button 
                    onClick={handleConcluirServicoClick} 
                    className="w-full"
                    disabled={finalizacaoConfirmada}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {finalizacaoConfirmada ? 'Serviço Finalizado' : 'Finalizar Serviço'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Pagamentos - Etapa 3 (Vendedor) - Oculto para Origem: Estoque */}
            {os.origemOS !== 'Estoque' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(os.proximaAtuacao === 'Vendedor: Registrar Pagamento' || os.proximaAtuacao === 'Gestor/Vendedor' || (os.proximaAtuacao === 'Atendente' && (os.status === 'Aguardando Pagamento' || os.status === 'Serviço concluído')) || searchParams.get('pagamento') === 'true') ? (
                  (!os.valorCustoTecnico || !os.valorVendaTecnico) ? (
                    <div className="bg-destructive/10 p-4 rounded-lg text-destructive text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      O técnico precisa preencher os campos de Valor de Custo e Valor a ser cobrado antes do registro de pagamento.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <PagamentoQuadro
                        valorTotalProdutos={os.valorVendaTecnico || 0}
                        custoTotalProdutos={os.valorCustoTecnico || 0}
                        lojaVendaId={os.lojaId}
                        onPagamentosChange={setEditPagamentosQuadro}
                        pagamentosIniciais={editPagamentosQuadro}
                        ocultarCards={true}
                        apenasContasAssistencia={true}
                      />
                      <Button 
                        onClick={() => { setCheckPagamento(false); setModalConfirmarPagamento(true); }} 
                        className="w-full"
                        disabled={pagamentoConfirmado}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {pagamentoConfirmado ? 'Pagamento Registrado' : 'Registrar Pagamento'}
                      </Button>
                    </div>
                  )
                ) : os.proximaAtuacao === 'Financeiro: Conferir Lançamento' || os.proximaAtuacao === 'Financeiro' || os.proximaAtuacao === 'Concluído' || os.proximaAtuacao === '-' ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Meio de Pagamento</TableHead>
                          <TableHead>Parcelas</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Comprovante</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {os.pagamentos.map((pag, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{pag.meio}</TableCell>
                            <TableCell>{pag.parcelas || '-'}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(pag.valor)}</TableCell>
                            <TableCell>
                              <ComprovantePreview comprovante={(pag as any).comprovante} comprovanteNome={(pag as any).comprovanteNome} />
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="font-bold">Total</TableCell>
                          <TableCell className="font-bold text-lg">{formatCurrency(os.valorTotal)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    {(os.proximaAtuacao === 'Financeiro: Conferir Lançamento' || os.proximaAtuacao === 'Financeiro') && (
                      <Button onClick={handleValidarFinanceiro} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Validar Lançamento (Financeiro)
                      </Button>
                    )}
                  </>
                ) : isEditing ? (
                  <PagamentoQuadro
                    valorTotalProdutos={editPecas.reduce((acc, p) => acc + p.valorTotal, 0)}
                    custoTotalProdutos={0}
                    lojaVendaId={editLojaId}
                    onPagamentosChange={setEditPagamentosQuadro}
                    pagamentosIniciais={editPagamentosQuadro}
                    ocultarCards={true}
                    apenasContasAssistencia={true}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Meio de Pagamento</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Comprovante</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {os.pagamentos.map((pag, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{pag.meio}</TableCell>
                          <TableCell>{pag.parcelas || '-'}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(pag.valor)}</TableCell>
                          <TableCell>
                            <ComprovantePreview comprovante={(pag as any).comprovante} comprovanteNome={(pag as any).comprovanteNome} />
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={3} className="font-bold">Total</TableCell>
                        <TableCell className="font-bold text-lg">{formatCurrency(os.valorTotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            )}

            {/* Observação do Estoque */}
            {os.observacaoOrigem && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Observação do Estoque – Tratativas para o Técnico
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{os.observacaoOrigem}</p>
              </div>
            )}

            {/* Tratativa Individual por Aparelho - Lote de Revisão */}
            {os.loteRevisaoId && os.itensLoteRevisao && os.itensLoteRevisao.length > 0 && (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Tratativa Individual — Lote {os.loteRevisaoId} ({os.itensLoteRevisao.length} aparelhos)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {os.itensLoteRevisao.map((item, idx) => (
                    <div key={item.itemId} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">{idx + 1}</Badge>
                          <div>
                            <p className="font-medium">{item.marca} {item.modelo}</p>
                            {item.imei && <p className="text-xs text-muted-foreground font-mono">IMEI: {formatIMEI(item.imei)}</p>}
                          </div>
                        </div>
                        <Badge className={
                          item.statusReparo === 'Concluido' ? 'bg-green-500 hover:bg-green-600' :
                          item.statusReparo === 'Em Andamento' ? 'bg-blue-500 hover:bg-blue-600' :
                          'bg-yellow-500 hover:bg-yellow-600'
                        }>
                          {item.statusReparo}
                        </Badge>
                      </div>
                      <div className="bg-muted/50 p-3 rounded">
                        <p className="text-xs text-muted-foreground mb-1">Motivo (informado pelo estoque):</p>
                        <p className="text-sm">{item.motivoAssistencia}</p>
                      </div>
                      {isEditing && item.statusReparo !== 'Concluido' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Parecer Técnico</label>
                            <Textarea
                              value={item.parecerTecnico || ''}
                              onChange={(e) => {
                                const updated = [...(os.itensLoteRevisao || [])];
                                updated[idx] = { ...updated[idx], parecerTecnico: e.target.value };
                                updateOrdemServico(os.id, { itensLoteRevisao: updated } as any);
                                const refreshed = getOrdemServicoById(os.id);
                                if (refreshed) setOS(refreshed);
                              }}
                              rows={2}
                              placeholder="Descreva o diagnóstico e serviço realizado..."
                            />
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Custo Reparo (R$)</label>
                              <Input
                                type="number"
                                value={item.custoReparo || ''}
                                onChange={(e) => {
                                  const custo = parseFloat(e.target.value) || 0;
                                  const updated = [...(os.itensLoteRevisao || [])];
                                  updated[idx] = { ...updated[idx], custoReparo: custo };
                                  updateOrdemServico(os.id, { itensLoteRevisao: updated } as any);
                                  // Sync with loteRevisaoApi
                                  if (os.loteRevisaoId) {
                                    atualizarItemRevisao(os.loteRevisaoId, item.itemId, { custoReparo: custo, statusReparo: 'Em Andamento' });
                                  }
                                  const refreshed = getOrdemServicoById(os.id);
                                  if (refreshed) setOS(refreshed);
                                }}
                                placeholder="0,00"
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                const updated = [...(os.itensLoteRevisao || [])];
                                updated[idx] = { ...updated[idx], statusReparo: 'Concluido' };
                                const osFresh = getOrdemServicoById(os.id);
                                if (!osFresh) return;
                                updateOrdemServico(os.id, {
                                  itensLoteRevisao: updated,
                                  timeline: [...osFresh.timeline, {
                                    data: new Date().toISOString(),
                                    tipo: 'peca',
                                    descricao: `Tratativa concluída: ${item.marca} ${item.modelo}${item.imei ? ` (IMEI: ${item.imei})` : ''} — Custo: R$ ${item.custoReparo.toFixed(2)}`,
                                    responsavel: user?.colaborador?.nome || 'Técnico'
                                  }]
                                } as any);
                                // Sync with loteRevisaoApi
                                if (os.loteRevisaoId) {
                                  atualizarItemRevisao(os.loteRevisaoId, item.itemId, { custoReparo: item.custoReparo, statusReparo: 'Concluido' });
                                }
                                // Mark product return to stock
                                if (item.imei) {
                                  marcarProdutoRetornoAssistencia(item.imei);
                                }
                                const refreshed = getOrdemServicoById(os.id);
                                if (refreshed) setOS(refreshed);
                                toast.success(`Tratativa do ${item.marca} ${item.modelo} concluída!`);

                                // Check if all items are done - auto finalize lote
                                const allDone = updated.every(i => i.statusReparo === 'Concluido');
                                if (allDone && os.loteRevisaoId) {
                                  const resultados: ResultadoItemRevisao[] = updated.map(i => ({
                                    itemId: i.itemId,
                                    resultado: 'Consertado' as const
                                  }));
                                  finalizarLoteComLogisticaReversa(os.loteRevisaoId, resultados, user?.colaborador?.nome || 'Técnico');
                                  toast.success('Todos os aparelhos tratados! Lote de revisão finalizado e estoque atualizado.');
                                }
                              }}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Concluir Tratativa
                            </Button>
                          </div>
                        </div>
                      )}
                      {item.parecerTecnico && !isEditing && (
                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded">
                          <p className="text-xs text-muted-foreground mb-1">Parecer Técnico:</p>
                          <p className="text-sm">{item.parecerTecnico}</p>
                          {item.custoReparo > 0 && <p className="text-sm font-medium mt-1">Custo: {formatCurrency(item.custoReparo)}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Descrição */}
            <Card>
              <CardHeader>
                <CardTitle>Descrição Detalhada</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea 
                    value={editDescricao}
                    onChange={(e) => setEditDescricao(e.target.value)}
                    placeholder="Descrição detalhada do serviço..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{os.descricao || 'Nenhuma descrição.'}</p>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline da OS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Fotos de Entrada */}
                  {os.fotosEntrada && os.fotosEntrada.length > 0 && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Fotos de Entrada ({os.fotosEntrada.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {os.fotosEntrada.map((foto, i) => (
                          <img key={i} src={foto} alt={`Foto entrada ${i + 1}`} className="w-20 h-20 object-cover rounded-md border" />
                        ))}
                      </div>
                    </div>
                  )}
                  {os.timeline.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          item.tipo === 'conclusao_servico' ? 'bg-green-500' :
                          item.tipo === 'pagamento' ? 'bg-amber-500' :
                          item.tipo === 'validacao_financeiro' ? 'bg-emerald-600' :
                          'bg-primary'
                        )} />
                        {index < os.timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium capitalize">{item.tipo.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">{item.descricao}</p>
                        {item.fotos && item.fotos.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.fotos.map((foto, i) => (
                              <img key={i} src={foto} alt={`Foto ${i + 1}`} className="w-16 h-16 object-cover rounded border" />
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.data).toLocaleString('pt-BR')} - {item.responsavel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Info Rápida */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">Loja</label>
                      <AutocompleteLoja
                        value={editLojaId}
                        onChange={setEditLojaId}
                        filtrarPorTipo="Assistência"
                        placeholder="Selecione a loja"
                      />
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs text-muted-foreground">Técnico Responsável</label>
                      <Select value={editTecnicoId} onValueChange={setEditTecnicoId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o técnico" />
                        </SelectTrigger>
                        <SelectContent>
                          {tecnicos.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs text-muted-foreground">Setor</label>
                      <Select value={editSetor} onValueChange={setEditSetor}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GARANTIA">Garantia</SelectItem>
                          <SelectItem value="ASSISTÊNCIA">Assistência</SelectItem>
                          <SelectItem value="TROCA">Troca</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs text-muted-foreground">Status</label>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Em Aberto">Em Aberto</SelectItem>
                          <SelectItem value="Em serviço">Em serviço</SelectItem>
                          <SelectItem value="Em Execução">Em Execução</SelectItem>
                          <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                          <SelectItem value="Solicitação Enviada">Solicitação Enviada</SelectItem>
                          <SelectItem value="Em Análise">Em Análise</SelectItem>
                          <SelectItem value="Peça Recebida">Peça Recebida</SelectItem>
                          <SelectItem value="Pagamento Concluído">Pagamento Concluído</SelectItem>
                          <SelectItem value="Serviço concluído">Serviço concluído</SelectItem>
                          <SelectItem value="Aguardando Conferência">Aguardando Conferência</SelectItem>
                          <SelectItem value="Finalizado">Finalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">SLA</p>
                      <div className="mt-1">{getSLADisplay()}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Loja</p>
                      <p className="font-medium">{loja?.nome || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Técnico Responsável</p>
                      <p className="font-medium">{tecnico?.nome || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Setor</p>
                      <div className="mt-1">{getSetorBadge(os.setor)}</div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(os.status)}</div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Próxima Atuação</p>
                      <div className="mt-1">
                        {os.proximaAtuacao ? (
                          <Badge className={cn(
                            os.proximaAtuacao === 'Técnico: Avaliar/Executar' ? 'bg-blue-500 hover:bg-blue-600' :
                            os.proximaAtuacao === 'Vendedor: Registrar Pagamento' ? 'bg-amber-500 hover:bg-amber-600' :
                            os.proximaAtuacao === 'Financeiro: Conferir Lançamento' ? 'bg-blue-500 hover:bg-blue-600' :
                            os.proximaAtuacao === 'Gestor: Aprovar Peça' ? 'bg-orange-500 hover:bg-orange-600' :
                            os.proximaAtuacao === 'Logística: Enviar Peça' ? 'bg-cyan-500 hover:bg-cyan-600' :
                            'bg-emerald-600 hover:bg-emerald-700'
                          )}>
                            {os.proximaAtuacao}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">SLA</p>
                      <div className="mt-1">{getSLADisplay()}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code da OS" className="w-40 h-40" />
                )}
              </CardContent>
            </Card>

            {/* Resumo Financeiro */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Peças/Serviços</span>
                  <span className="font-medium">{formatCurrency(os.pecas.reduce((acc, p) => acc + p.valorTotal, 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Pagamentos</span>
                  <span className="font-medium">{formatCurrency(os.pagamentos.reduce((acc, p) => acc + p.valor, 0))}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Valor Total</span>
                  <span className="font-bold text-primary">{formatCurrency(os.valorTotal)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Modal Dupla Confirmação - Registrar Pagamento */}
      <AlertDialog open={modalConfirmarPagamento} onOpenChange={setModalConfirmarPagamento}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Registro de Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme o registro de pagamento para a OS <strong>#{os.id}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Responsável</label>
                <Input value={user?.colaborador?.nome || user?.username || '-'} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data/Hora</label>
                <Input value={new Date().toLocaleString('pt-BR')} disabled className="bg-muted" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox checked={checkPagamento} onCheckedChange={(v) => setCheckPagamento(!!v)} />
              <label className="text-sm">Confirmo que os dados de pagamento estão corretos</label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCheckPagamento(false)}>Cancelar</AlertDialogCancel>
            <Button
              disabled={!checkPagamento}
              onClick={() => {
                handleSalvarPagamentoVendedor();
                setPagamentoConfirmado(true);
                setModalConfirmarPagamento(false);
                setCheckPagamento(false);
              }}
            >
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Dupla Confirmação - Confirmar Recebimento */}
      <AlertDialog open={modalConfirmarRecebimento} onOpenChange={setModalConfirmarRecebimento}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Recebimento de Peça</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme o recebimento da peça para a OS <strong>#{os.id}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Responsável</label>
                <Input value={user?.colaborador?.nome || user?.username || '-'} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data/Hora</label>
                <Input value={new Date().toLocaleString('pt-BR')} disabled className="bg-muted" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox checked={checkRecebimento} onCheckedChange={(v) => setCheckRecebimento(!!v)} />
              <label className="text-sm">Confirmo o recebimento físico da peça</label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCheckRecebimento(false)}>Cancelar</AlertDialogCancel>
            <Button
              disabled={!checkRecebimento}
              onClick={() => {
                const osFresh = getOrdemServicoById(os.id);
                if (!osFresh) return;
                const nomeResponsavel = user?.colaborador?.nome || user?.username || 'Técnico';
                updateOrdemServico(os.id, {
                  status: 'Em serviço' as any,
                  proximaAtuacao: 'Técnico',
                  timeline: [...osFresh.timeline, {
                    data: new Date().toISOString(),
                    tipo: 'peca',
                    descricao: `Recebimento de peça confirmado por ${nomeResponsavel}. OS retornou para serviço.`,
                    responsavel: nomeResponsavel
                  }]
                });
                setEditStatus('Em serviço');
                const updatedOS = getOrdemServicoById(os.id);
                if (updatedOS) setOS(updatedOS);
                setRecebimentoConfirmado(true);
                setModalConfirmarRecebimento(false);
                setCheckRecebimento(false);
                toast.success('Recebimento confirmado! OS retornou para Em serviço.');
              }}
            >
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Dupla Confirmação - Finalizar Serviço */}
      <AlertDialog open={modalConfirmarFinalizacao} onOpenChange={setModalConfirmarFinalizacao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Finalização do Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme a finalização do serviço para a OS <strong>#{os.id}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Responsável</label>
                <p className="text-sm font-medium">{user?.colaborador?.nome || tecnico?.nome || 'Técnico'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data/Hora</label>
                <p className="text-sm font-medium">{new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Valor Custo</label>
                <p className="text-sm font-medium">R$ {valorCustoTecnico.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Valor a Cobrar</label>
                <p className="text-sm font-medium">R$ {(valorCustoTecnico + valorServico).toFixed(2)}</p>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Resumo da Conclusão *</label>
              <Textarea
                value={resumoConclusao}
                onChange={(e) => setResumoConclusao(e.target.value)}
                placeholder="Descreva o serviço realizado, peças utilizadas e resultado..."
                rows={3}
                className={cn("mt-1", !resumoConclusao.trim() && "border-destructive")}
              />
            </div>
            <div>
              <FileUploadComprovante
                label="Anexar Evidências do Serviço (opcional)"
                value={evidenciaComprovante}
                fileName={evidenciaNome}
                onFileChange={({ comprovante, comprovanteNome }) => {
                  setEvidenciaComprovante(comprovante);
                  setEvidenciaNome(comprovanteNome);
                }}
                acceptedTypes={['image/jpeg', 'image/png', 'image/webp', 'application/pdf']}
                maxSizeMB={10}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="check-finalizacao"
                checked={checkFinalizacao}
                onCheckedChange={(v) => setCheckFinalizacao(v === true)}
              />
              <label htmlFor="check-finalizacao" className="text-sm">
                Confirmo a finalização do serviço da OS <strong>#{os.id}</strong>
              </label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCheckFinalizacao(false)}>Cancelar</AlertDialogCancel>
            <Button
              disabled={!checkFinalizacao}
              onClick={handleConfirmarFinalizacao}
            >
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Modal Dupla Confirmação - Adicionar Solicitação */}
      <Dialog open={modalConfirmarSolDetalhes} onOpenChange={setModalConfirmarSolDetalhes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Confirmar Solicitação de Peça
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 rounded-md p-4 space-y-2 text-sm">
              <p><strong>Peça:</strong> {novaSolPeca}</p>
              <p><strong>Quantidade:</strong> {novaSolQtd}</p>
              <p><strong>Justificativa:</strong> {novaSolJustificativa}</p>
            </div>
            <div className="flex items-center gap-2 border rounded-md p-3 bg-muted/30">
              <Checkbox
                checked={checkConfirmarSolDetalhes}
                onCheckedChange={(checked) => setCheckConfirmarSolDetalhes(checked as boolean)}
              />
              <label className="text-sm cursor-pointer">
                Confirmo que os dados da solicitação estão corretos e desejo adicionar esta peça
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConfirmarSolDetalhes(false)}>Cancelar</Button>
            <Button
              disabled={!checkConfirmarSolDetalhes}
              onClick={() => {
                if (!checkConfirmarSolDetalhes) return;
                addSolicitacao({
                  osId: os!.id,
                  peca: novaSolPeca,
                  quantidade: novaSolQtd,
                  justificativa: novaSolJustificativa,
                  modeloImei: os!.pecas[0]?.imei || '',
                  lojaSolicitante: os!.lojaId
                });
                updateOrdemServico(os!.id, {
                  status: 'Solicitação de Peça' as any,
                  proximaAtuacao: 'Gestor (Suprimentos)',
                  timeline: [...os!.timeline, {
                    data: new Date().toISOString(),
                    tipo: 'peca',
                    descricao: `Solicitação de peça: ${novaSolPeca} x${novaSolQtd} – ${novaSolJustificativa}`,
                    responsavel: 'Atendente'
                  }]
                });
                setEditStatus('Solicitação de Peça');
                const updatedOS = getOrdemServicoById(os!.id);
                if (updatedOS) setOS(updatedOS);
                setSolicitacoesOS(getSolicitacoesByOS(os!.id));
                setNovaSolPeca('');
                setNovaSolQtd(1);
                setNovaSolJustificativa('');
                setModalConfirmarSolDetalhes(false);
                toast.success('Solicitação adicionada! Status atualizado para Aguardando Peça.');
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Confirmar e Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}