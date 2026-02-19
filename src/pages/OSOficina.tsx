import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getOrdensServico, getOrdemServicoById, updateOrdemServico, calcularSLADias, formatCurrency, OrdemServico } from '@/utils/assistenciaApi';
import { getClientes } from '@/utils/cadastrosApi';
import { addSolicitacao, getSolicitacoesByOS, cancelarSolicitacao, isPecaPaga, SolicitacaoPeca } from '@/utils/solicitacaoPecasApi';
import { addPeca, addMovimentacaoPeca } from '@/utils/pecasApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { formatIMEI } from '@/utils/imeiMask';
import { Eye, Play, CheckCircle, Clock, Wrench, AlertTriangle, Package, Plus, ShoppingCart, MessageSquare, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { addNotification } from '@/utils/notificationsApi';

export default function OSOficina() {
  const navigate = useNavigate();
  const [ordensServico, setOrdensServico] = useState(getOrdensServico());
  const clientes = getClientes();
  const { obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const user = useAuthStore((s) => s.user);

  // IDs de OS finalizadas nesta sessão (para manter visíveis)
  const [osFinalizadas, setOsFinalizadas] = useState<Set<string>>(new Set());

  // Modal de Finalização
  const [finalizarModal, setFinalizarModal] = useState(false);
  const [osParaFinalizar, setOsParaFinalizar] = useState<OrdemServico | null>(null);
  const [conclusaoServico, setConclusaoServico] = useState('');
  const [resumoConclusao, setResumoConclusao] = useState('');
  const [valorCustoFormatado, setValorCustoFormatado] = useState('');
  const [valorCustoRaw, setValorCustoRaw] = useState<number>(0);
  const [valorVendaFormatado, setValorVendaFormatado] = useState('');
  const [valorVendaRaw, setValorVendaRaw] = useState<number>(0);
  const [valorServicoFormatado, setValorServicoFormatado] = useState('');
  const [valorServicoRaw, setValorServicoRaw] = useState<number>(0);

  // Modal de Solicitar Peça
  const [solicitarPecaModal, setSolicitarPecaModal] = useState(false);
  const [osParaSolicitar, setOsParaSolicitar] = useState<OrdemServico | null>(null);
  const [solPeca, setSolPeca] = useState('');
  const [solQuantidade, setSolQuantidade] = useState(1);
  const [solJustificativa, setSolJustificativa] = useState('');
  const [solicitacoesOS, setSolicitacoesOS] = useState<any[]>([]);

  // Modal de Peça Não Utilizada
  const [pecaNaoUtilizadaModal, setPecaNaoUtilizadaModal] = useState(false);
  const [osParaGerenciarPeca, setOsParaGerenciarPeca] = useState<OrdemServico | null>(null);
  const [solicitacoesParaGerenciar, setSolicitacoesParaGerenciar] = useState<SolicitacaoPeca[]>([]);
  const [justificativaNaoUso, setJustificativaNaoUso] = useState('');
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<SolicitacaoPeca | null>(null);

  // Filtrar OSs onde proximaAtuacao contém "Técnico" OU recém-finalizadas
  const osTecnico = useMemo(() => {
    const statusHistorico = ['Serviço concluído', 'Pendente de Pagamento', 'Aguardando Financeiro', 'Liquidado', 'Conferência do Gestor'];
    const statusPecas = ['Solicitação de Peça', 'Aguardando Peça', 'Peça Recebida', 'Pagamento Concluído'];
    return ordensServico.filter(os => {
      const atuacao = os.proximaAtuacao || '';
      const isTecnico = atuacao === 'Técnico' || 
             atuacao === 'Técnico (Recebimento)' || 
             atuacao === 'Técnico: Avaliar/Executar';
      const isRecentFinalizada = osFinalizadas.has(os.id);
      const isHistorico = statusHistorico.includes(os.status);
      const isPecaPendente = statusPecas.includes(os.status);
      const isRetrabalho = os.status === 'Retrabalho - Recusado pelo Estoque';
      const isValidarAparelho = os.status === 'Serviço Concluído - Validar Aparelho' && os.origemOS === 'Estoque';
      return isTecnico || isRecentFinalizada || isHistorico || isPecaPendente || isRetrabalho || isValidarAparelho;
    }).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [ordensServico, osFinalizadas]);

  // Stats
  const aguardandoCheckin = osTecnico.filter(os => os.status === 'Aguardando Análise' || os.status === 'Em Aberto').length;
  const emServico = osTecnico.filter(os => os.status === 'Em serviço').length;
  const aguardandoPeca = osTecnico.filter(os => 
    os.proximaAtuacao === 'Técnico (Recebimento)' || os.status === 'Peça Recebida' || os.status === 'Solicitação de Peça'
  ).length;

  const recarregar = () => setOrdensServico(getOrdensServico());

  const handleAssumir = (os: OrdemServico) => {
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    updateOrdemServico(os.id, {
      status: 'Em serviço',
      proximaAtuacao: 'Técnico',
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'status',
        descricao: 'OS assumida pelo técnico',
        responsavel: user?.colaborador?.nome || 'Técnico'
      }]
    });
    toast.success(`OS ${os.id} assumida com sucesso!`);
    recarregar();
  };

  const handleConfirmarRecebimento = (os: OrdemServico) => {
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    updateOrdemServico(os.id, {
      status: 'Em serviço',
      proximaAtuacao: 'Técnico',
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'peca',
        descricao: 'Recebimento de peça confirmado pelo técnico',
        responsavel: user?.colaborador?.nome || 'Técnico'
      }]
    });
    toast.success(`Recebimento confirmado para OS ${os.id}!`);
    recarregar();
  };

  const handleAbrirFinalizar = (os: OrdemServico) => {
    // Trava de finalização: verificar solicitações pendentes
    const solicitacoesOS = getSolicitacoesByOS(os.id);
    const pendentes = solicitacoesOS.filter(s => 
      ['Pendente', 'Aprovada', 'Enviada', 'Aguardando Chegada', 'Pagamento - Financeiro', 'Aguardando Aprovação'].includes(s.status)
    );
    if (pendentes.length > 0) {
      toast.error('Existem solicitações de peças pendentes. Confirme o recebimento ou gerencie como "Não Utilizada" antes de finalizar.');
      return;
    }

    setOsParaFinalizar(os);
    setConclusaoServico(os.conclusaoServico || '');
    setResumoConclusao(os.resumoConclusao || '');
    setValorCustoRaw(os.valorCustoTecnico || 0);
    setValorCustoFormatado(os.valorCustoTecnico ? String(os.valorCustoTecnico) : '');
    setValorVendaRaw(os.valorVendaTecnico || 0);
    setValorVendaFormatado(os.valorVendaTecnico ? String(os.valorVendaTecnico) : '');
    setValorServicoRaw(os.valorServico || 0);
    setValorServicoFormatado(os.valorServico ? String(os.valorServico) : '');
    setFinalizarModal(true);
  };

  const handleFinalizar = () => {
    if (!osParaFinalizar) return;
    if (!conclusaoServico.trim()) {
      toast.error('Preencha a Conclusão do Serviço para finalizar.');
      return;
    }
    if (!resumoConclusao.trim()) {
      toast.error('Preencha o Resumo da Conclusão para finalizar.');
      return;
    }
    if (!valorCustoRaw || valorCustoRaw <= 0) {
      toast.error('Informe o Valor de Custo (deve ser maior que 0).');
      return;
    }

    const isOrigemEstoque = osParaFinalizar.origemOS === 'Estoque';
    const valorServicoFinal = isOrigemEstoque ? 0 : valorServicoRaw;
    const valorVendaCalculado = valorCustoRaw + valorServicoFinal;

    if (!isOrigemEstoque && valorVendaCalculado <= 0) {
      toast.error('O Valor a ser cobrado deve ser maior que 0.');
      return;
    }

    // Fresh fetch para evitar dados obsoletos
    const osFresh = getOrdemServicoById(osParaFinalizar.id);
    if (!osFresh) return;

    const novoStatus = isOrigemEstoque ? 'Serviço Concluído - Validar Aparelho' : 'Serviço concluído';
    const novaAtuacao = isOrigemEstoque ? 'Gestor (Estoque)' : 'Atendente';
    const descMsg = isOrigemEstoque 
      ? `Serviço finalizado pelo técnico (Origem: Estoque). Conclusão: ${conclusaoServico}. Custo peças: R$ ${valorCustoRaw.toFixed(2)}. Resumo: ${resumoConclusao}. Encaminhado para validação do Gestor de Estoque.`
      : `Serviço finalizado pelo técnico. Conclusão: ${conclusaoServico}. Custo: R$ ${valorCustoRaw.toFixed(2)}, Venda: R$ ${valorVendaCalculado.toFixed(2)}. Resumo: ${resumoConclusao}`;

    updateOrdemServico(osParaFinalizar.id, {
      status: novoStatus as any,
      proximaAtuacao: novaAtuacao as any,
      conclusaoServico,
      resumoConclusao,
      valorCustoTecnico: valorCustoRaw,
      valorVendaTecnico: valorVendaCalculado,
      valorServico: valorServicoFinal,
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'conclusao_servico',
        descricao: descMsg,
        responsavel: user?.colaborador?.nome || 'Técnico'
      }]
    });

    // Manter a OS visível na tela
    setOsFinalizadas(prev => new Set(prev).add(osParaFinalizar.id));

    const toastMsg = isOrigemEstoque 
      ? `Serviço da OS ${osParaFinalizar.id} finalizado! Encaminhada para validação do Gestor de Estoque.`
      : `Serviço da OS ${osParaFinalizar.id} finalizado! Encaminhada para pagamento na aba Nova Assistência.`;
    toast.success(toastMsg);
    setFinalizarModal(false);
    setOsParaFinalizar(null);
    recarregar();
  };

  // Solicitar Peça - acessível pelo botão dentro do modal de finalização ou detalhes
  const handleAbrirSolicitarPeca = (os: OrdemServico) => {
    setOsParaSolicitar(os);
    setSolPeca('');
    setSolQuantidade(1);
    setSolJustificativa('');
    setSolicitacoesOS(getSolicitacoesByOS(os.id));
    setSolicitarPecaModal(true);
  };

  const handleEnviarSolicitacao = () => {
    if (!osParaSolicitar) return;
    if (!solPeca.trim()) {
      toast.error('Informe o nome da peça.');
      return;
    }
    if (!solJustificativa.trim()) {
      toast.error('Informe a justificativa.');
      return;
    }

    const novaSol = addSolicitacao({
      osId: osParaSolicitar.id,
      peca: solPeca,
      quantidade: solQuantidade,
      justificativa: solJustificativa,
      modeloImei: osParaSolicitar.imeiAparelho || '',
      lojaSolicitante: osParaSolicitar.lojaId
    });

    // Atualizar OS com status de solicitação
    const osAtualizada = getOrdemServicoById(osParaSolicitar.id);
    if (osAtualizada) {
      updateOrdemServico(osParaSolicitar.id, {
        status: 'Solicitação de Peça',
        proximaAtuacao: 'Gestor (Suprimentos)',
        timeline: [...osAtualizada.timeline, {
          data: new Date().toISOString(),
          tipo: 'peca',
          descricao: `Técnico solicitou peça: ${solPeca} x${solQuantidade} – ${solJustificativa}`,
          responsavel: user?.colaborador?.nome || 'Técnico'
        }]
      });
    }

    // Notificação
    try {
      addNotification({
        type: 'assistencia',
        title: `Solicitação de Peça – ${osParaSolicitar.id}`,
        description: `${solPeca} x${solQuantidade} solicitada pelo técnico`,
        targetUsers: []
      });
    } catch {}

    toast.success(`Solicitação ${novaSol.id} enviada para aprovação do gestor!`);
    
    // Atualizar lista local
    setSolicitacoesOS(getSolicitacoesByOS(osParaSolicitar.id));
    setSolPeca('');
    setSolQuantidade(1);
    setSolJustificativa('');
    recarregar();
  };

  // Gerenciar Peça Não Utilizada
  const handleAbrirGerenciarPeca = (os: OrdemServico) => {
    setOsParaGerenciarPeca(os);
    const statusFinais = ['Cancelada', 'Rejeitada', 'Devolvida ao Fornecedor', 'Retida para Estoque'];
    const sols = getSolicitacoesByOS(os.id).filter(s => 
      !statusFinais.includes(s.status)
    );
    setSolicitacoesParaGerenciar(sols);
    setJustificativaNaoUso('');
    setSolicitacaoSelecionada(null);
    setPecaNaoUtilizadaModal(true);
  };

  const handleMarcarNaoUtilizada = () => {
    if (!solicitacaoSelecionada || !osParaGerenciarPeca) return;
    if (!justificativaNaoUso.trim()) {
      toast.error('Informe a justificativa para a não utilização.');
      return;
    }

    const statusFinais = ['Cancelada', 'Rejeitada', 'Devolvida ao Fornecedor', 'Retida para Estoque'];
    if (statusFinais.includes(solicitacaoSelecionada.status)) {
      toast.error('Esta solicitação já teve seu ciclo encerrado.');
      return;
    }

    const statusNaoPagos = ['Pendente', 'Aprovada', 'Enviada', 'Aguardando Aprovação', 'Solicitação de Peça'];
    const paga = isPecaPaga(solicitacaoSelecionada);

    if (statusNaoPagos.includes(solicitacaoSelecionada.status)) {
      // Cenário A: Peça NÃO Paga - Cancelar
      cancelarSolicitacao(solicitacaoSelecionada.id, justificativaNaoUso);
      toast.success(`Solicitação ${solicitacaoSelecionada.id} cancelada com sucesso.`);
    } else if (paga) {
      // Cenário B: Peça JÁ PAGA - Entrada no estoque
      const osFresh = getOrdemServicoById(osParaGerenciarPeca.id);
      if (!osFresh) return;

      // Criar entrada no estoque
      const novaPeca = addPeca({
        descricao: solicitacaoSelecionada.peca,
        lojaId: osParaGerenciarPeca.lojaId,
        modelo: solicitacaoSelecionada.modeloImei || 'N/A',
        valorCusto: solicitacaoSelecionada.valorPeca || 0,
        valorRecomendado: solicitacaoSelecionada.valorPeca || 0,
        quantidade: solicitacaoSelecionada.quantidade,
        dataEntrada: new Date().toISOString(),
        origem: 'Solicitação Cancelada',
        status: 'Disponível'
      });

      // Registrar movimentação
      addMovimentacaoPeca({
        pecaId: novaPeca.id,
        tipo: 'Entrada',
        quantidade: solicitacaoSelecionada.quantidade,
        data: new Date().toISOString(),
        osId: osParaGerenciarPeca.id,
        descricao: `Peça de solicitação cancelada ${solicitacaoSelecionada.id} (OS ${osParaGerenciarPeca.id}) - Fornecedor: ${solicitacaoSelecionada.fornecedorId || 'N/A'} - Motivo: ${justificativaNaoUso}`
      });

      // Recalcular valores da OS
      const valorPeca = solicitacaoSelecionada.valorPeca || 0;
      const novoValorCusto = Math.max(0, (osFresh.valorCustoTecnico || 0) - valorPeca);
      const novoValorVenda = Math.max(0, (osFresh.valorVendaTecnico || 0) - valorPeca);

      // Cancelar a solicitação
      cancelarSolicitacao(solicitacaoSelecionada.id, justificativaNaoUso);

      // Atualizar OS
      const osFresh2 = getOrdemServicoById(osParaGerenciarPeca.id);
      if (osFresh2) {
        updateOrdemServico(osParaGerenciarPeca.id, {
          status: 'Em serviço',
          proximaAtuacao: 'Técnico',
          valorCustoTecnico: novoValorCusto,
          valorVendaTecnico: novoValorVenda,
          timeline: [...osFresh2.timeline, {
            data: new Date().toISOString(),
            tipo: 'peca',
            descricao: `Peça ${solicitacaoSelecionada.peca} (Paga) não utilizada na OS. Item incorporado ao estoque da loja como 'Disponível'. Motivo: ${justificativaNaoUso}`,
            responsavel: user?.colaborador?.nome || 'Técnico'
          }]
        });
      }

      toast.success(`Peça ${solicitacaoSelecionada.peca} incorporada ao estoque. Valores da OS recalculados.`);
    }

    if (!paga && !statusNaoPagos.includes(solicitacaoSelecionada.status)) {
      // Status intermediário (ex: 'Pagamento - Financeiro') - não permite incorporar
      toast.error('Esta peça ainda não teve o pagamento concluído. Aguarde a finalização pelo financeiro.');
      return;
    }

    // Atualizar lista e fechar
    const statusFinaisPos = ['Cancelada', 'Rejeitada', 'Devolvida ao Fornecedor', 'Retida para Estoque'];
    const solsAtualizadas = getSolicitacoesByOS(osParaGerenciarPeca.id).filter(s => 
      !statusFinaisPos.includes(s.status)
    );
    setSolicitacoesParaGerenciar(solsAtualizadas);
    setSolicitacaoSelecionada(null);
    setJustificativaNaoUso('');
    recarregar();

    if (solsAtualizadas.length === 0) {
      setPecaNaoUtilizadaModal(false);
    }
  };

  const getStatusBadge = (os: OrdemServico) => {
    const status = os.status;
    if (status === 'Retrabalho - Recusado pelo Estoque') {
      return <Badge className="bg-red-600 hover:bg-red-700">🔄 Retrabalho</Badge>;
    }
    if (status === 'Serviço Concluído - Validar Aparelho') {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Validar Aparelho</Badge>;
    }
    if (status === 'Aguardando Análise' || status === 'Em Aberto') {
      return <Badge className="bg-slate-500 hover:bg-slate-600">Aguardando Check-in</Badge>;
    }
    if (status === 'Em serviço') {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Em Serviço</Badge>;
    }
    if (status === 'Solicitação de Peça') {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Aguardando Peça</Badge>;
    }
    if (os.proximaAtuacao === 'Técnico (Recebimento)' || status === 'Peça Recebida' || status === 'Pagamento Concluído') {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600">Pagamento Realizado</Badge>;
    }
    if (status === 'Serviço concluído') {
      return <Badge className="bg-green-500 hover:bg-green-600">Serviço Concluído</Badge>;
    }
    if (status === 'Aguardando Pagamento') {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Aguardando Pagamento</Badge>;
    }
    if (status === 'Pendente de Pagamento') {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Pendente de Pagamento</Badge>;
    }
    if (status === 'Aguardando Financeiro') {
      return <Badge className="bg-blue-600 hover:bg-blue-700">Aguardando Financeiro</Badge>;
    }
    if (status === 'Liquidado') {
      return <Badge className="bg-green-700 hover:bg-green-800">Liquidado</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getAcoes = (os: OrdemServico) => {
    const status = os.status;
    const atuacao = os.proximaAtuacao || '';

    // OS já finalizada pelo técnico - sem ações
    if (status === 'Serviço concluído' || status === 'Pendente de Pagamento' || status === 'Aguardando Financeiro' || status === 'Liquidado' || status === 'Aguardando Pagamento') {
      return null;
    }

    // Aguardando check-in
    if (status === 'Aguardando Análise' || status === 'Em Aberto') {
      return (
        <Button size="sm" onClick={() => handleAssumir(os)} className="gap-1">
          <Play className="h-3.5 w-3.5" />
          Assumir
        </Button>
      );
    }

    // Peça recebida / Pagamento concluído - confirmar recebimento + gerenciar peça
    if (atuacao === 'Técnico (Recebimento)' || 
        atuacao === 'Técnico: Avaliar/Executar' || 
        status === 'Peça Recebida' || 
        status === 'Pagamento Concluído') {
      const statusFinaisBtn = ['Cancelada', 'Rejeitada', 'Devolvida ao Fornecedor', 'Retida para Estoque'];
      const solicitacoesOS = getSolicitacoesByOS(os.id).filter(s => 
        !statusFinaisBtn.includes(s.status)
      );
      return (
        <div className="flex gap-1">
          {solicitacoesOS.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => handleAbrirGerenciarPeca(os)} title="Gerenciar Peça Não Utilizada" className="gap-1">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleConfirmarRecebimento(os)} className="gap-1">
            <Package className="h-3.5 w-3.5" />
            Confirmar Recebimento
          </Button>
        </div>
      );
    }

    // Em serviço ou Retrabalho - finalizar + gerenciar peça
    if (status === 'Em serviço' || status === 'Retrabalho - Recusado pelo Estoque') {
      const statusFinaisBtn2 = ['Cancelada', 'Rejeitada', 'Devolvida ao Fornecedor', 'Retida para Estoque'];
      const solicitacoesOS = getSolicitacoesByOS(os.id).filter(s => 
        !statusFinaisBtn2.includes(s.status)
      );
      return (
        <div className="flex gap-1">
          {solicitacoesOS.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => handleAbrirGerenciarPeca(os)} title="Gerenciar Peça Não Utilizada" className="gap-1">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" onClick={() => handleAbrirFinalizar(os)} className="gap-1 bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-3.5 w-3.5" />
            Finalizar Serviço
          </Button>
        </div>
      );
    }

    return null;
  };

  const getStatusSolicitacao = (status: string) => {
    switch (status) {
      case 'Pendente': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400">Pendente</Badge>;
      case 'Aprovada': return <Badge className="bg-blue-500">Aprovada</Badge>;
      case 'Rejeitada': return <Badge variant="destructive">Rejeitada</Badge>;
      case 'Cancelada': return <Badge variant="secondary">Cancelada</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <OSLayout title="Serviços">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/10">
                <Clock className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Check-in</p>
                <p className="text-2xl font-bold">{aguardandoCheckin}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Wrench className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em Serviço</p>
                <p className="text-2xl font-bold text-blue-600">{emServico}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Package className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Peça</p>
                <p className="text-2xl font-bold text-emerald-600">{aguardandoPeca}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OS</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {osTecnico.map(os => {
                  const cliente = clientes.find(c => c.id === os.clienteId);
                  const slaDias = calcularSLADias(os.dataHora);
                  return (
                    <TableRow key={os.id} className={cn(
                      os.status === 'Serviço concluído' && 'bg-green-500/10',
                      os.status === 'Pendente de Pagamento' && 'bg-blue-500/10',
                      os.status === 'Aguardando Financeiro' && 'bg-blue-500/10',
                      os.status === 'Liquidado' && 'bg-green-500/10',
                      os.status === 'Aguardando Pagamento' && 'bg-amber-500/10',
                    )}>
                      <TableCell className="font-mono text-xs font-medium">{os.id}</TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(os.dataHora), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{cliente?.nome || '-'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-1">
                          {os.modeloAparelho || '-'}
                          {os.observacaoOrigem && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400" title={os.observacaoOrigem}>
                              <MessageSquare className="h-3 w-3" />
                              Obs. Estoque
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{obterNomeLoja(os.lojaId)}</TableCell>
                      <TableCell className="text-xs">{obterNomeColaborador(os.tecnicoId)}</TableCell>
                      <TableCell>{getStatusBadge(os)}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1',
                          slaDias >= 5 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          slaDias >= 3 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : ''
                        )}>
                          {slaDias >= 5 && <AlertTriangle className="h-3 w-3" />}
                          {slaDias} dias
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/os/assistencia/${os.id}`)}
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {getAcoes(os)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {osTecnico.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhuma OS aguardando ação do técnico
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Finalizar */}
      <Dialog open={finalizarModal} onOpenChange={setFinalizarModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Finalizar Serviço - {osParaFinalizar?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Informações do Aparelho */}
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
              <div>
                <Label className="text-xs text-muted-foreground">Modelo do Aparelho</Label>
                <p className="font-medium text-sm">{osParaFinalizar?.modeloAparelho || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">IMEI</Label>
                <p className="font-medium text-sm font-mono">{formatIMEI(osParaFinalizar?.imeiAparelho || '')}</p>
              </div>
            </div>

            {/* Observação de Origem (do Estoque) */}
            {osParaFinalizar?.observacaoOrigem && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Observação do Estoque
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">{osParaFinalizar.observacaoOrigem}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Conclusão do Serviço *</Label>
              <Textarea
                value={conclusaoServico}
                onChange={(e) => setConclusaoServico(e.target.value)}
                placeholder="Descreva a conclusão técnica do reparo realizado..."
                rows={3}
                className={cn(!conclusaoServico && 'border-destructive')}
              />
            </div>
            <div className="space-y-2">
              <Label>Resumo da Conclusão *</Label>
              <Textarea
                value={resumoConclusao}
                onChange={(e) => setResumoConclusao(e.target.value)}
                placeholder="Descreva o serviço realizado, peças utilizadas e resultado..."
                rows={4}
                className={cn(!resumoConclusao && 'border-destructive')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor de Custo (R$) *</Label>
                <InputComMascara
                  mascara="moeda"
                  value={valorCustoRaw}
                  onChange={(formatted, raw) => {
                    setValorCustoFormatado(formatted);
                    setValorCustoRaw(typeof raw === 'number' ? raw : 0);
                  }}
                  placeholder="0,00"
                  className={cn(!valorCustoRaw && 'border-destructive')}
                />
                <p className="text-xs text-muted-foreground">Custo de peças/insumos</p>
              </div>
              <div className="space-y-2">
                <Label>Valor do serviço (R$)</Label>
                <InputComMascara
                  mascara="moeda"
                  value={osParaFinalizar?.origemOS === 'Estoque' ? 0 : valorServicoRaw}
                  onChange={(formatted, raw) => {
                    if (osParaFinalizar?.origemOS !== 'Estoque') {
                      setValorServicoFormatado(formatted);
                      setValorServicoRaw(typeof raw === 'number' ? raw : 0);
                    }
                  }}
                  placeholder="0,00"
                  disabled={osParaFinalizar?.origemOS === 'Estoque'}
                  className={osParaFinalizar?.origemOS === 'Estoque' ? 'bg-muted' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  {osParaFinalizar?.origemOS === 'Estoque' ? 'Mão de obra zerada (Origem: Estoque)' : 'Valor da mão de obra'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Valor a ser cobrado (R$)</Label>
                <InputComMascara
                  mascara="moeda"
                  value={valorCustoRaw + valorServicoRaw}
                  onChange={() => {}}
                  placeholder="0,00"
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Custo + Serviço (calculado automaticamente)</p>
              </div>
            </div>

            {/* Botão de Solicitar Peça dentro do modal */}
            {osParaFinalizar?.status === 'Em serviço' && (
              <div className="border-t pt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setFinalizarModal(false);
                    handleAbrirSolicitarPeca(osParaFinalizar);
                  }} 
                  className="gap-2 w-full"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Solicitar Peça (abre modal separado)
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizarModal(false)}>Cancelar</Button>
            <Button onClick={handleFinalizar} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizar Serviço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Solicitar Peça */}
      <Dialog open={solicitarPecaModal} onOpenChange={setSolicitarPecaModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Solicitar Peça – OS {osParaSolicitar?.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Info da OS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Modelo</span>
                <p className="font-medium">{osParaSolicitar?.modeloAparelho || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">IMEI</span>
                <p className="font-medium font-mono text-xs">{osParaSolicitar?.imeiAparelho || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Loja</span>
                <p className="font-medium">{osParaSolicitar ? obterNomeLoja(osParaSolicitar.lojaId) : '-'}</p>
              </div>
            </div>

            {/* Solicitações existentes */}
            {solicitacoesOS.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Solicitações anteriores ({solicitacoesOS.length})</p>
                <div className="space-y-2">
                  {solicitacoesOS.map(sol => (
                    <div key={sol.id} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground">{sol.id}</span>
                        <span className="font-medium">{sol.peca}</span>
                        <span className="text-muted-foreground">x{sol.quantidade}</span>
                      </div>
                      {getStatusSolicitacao(sol.status)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulário de nova solicitação */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Solicitação
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Peça *</Label>
                  <Input
                    value={solPeca}
                    onChange={(e) => setSolPeca(e.target.value)}
                    placeholder="Nome da peça"
                    className={cn(!solPeca && solPeca !== '' && 'border-destructive')}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    value={solQuantidade}
                    onChange={(e) => setSolQuantidade(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs">Justificativa *</Label>
                  <Input
                    value={solJustificativa}
                    onChange={(e) => setSolJustificativa(e.target.value)}
                    placeholder="Motivo da solicitação"
                    className={cn(!solJustificativa && solJustificativa !== '' && 'border-destructive')}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSolicitarPecaModal(false)}>
              Fechar
            </Button>
            <Button onClick={handleEnviarSolicitacao} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gerenciar Peça Não Utilizada */}
      <Dialog open={pecaNaoUtilizadaModal} onOpenChange={setPecaNaoUtilizadaModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5" />
              Gerenciar Peça Não Utilizada – OS {osParaGerenciarPeca?.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Info da OS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Modelo</span>
                <p className="font-medium">{osParaGerenciarPeca?.modeloAparelho || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">IMEI</span>
                <p className="font-medium font-mono text-xs">{osParaGerenciarPeca?.imeiAparelho || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Loja</span>
                <p className="font-medium">{osParaGerenciarPeca ? obterNomeLoja(osParaGerenciarPeca.lojaId) : '-'}</p>
              </div>
            </div>

            {/* Lista de solicitações */}
            {solicitacoesParaGerenciar.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma solicitação ativa para esta OS.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Solicitações Ativas ({solicitacoesParaGerenciar.length})</p>
                {solicitacoesParaGerenciar.map(sol => {
                  const paga = isPecaPaga(sol);
                  const statusNaoPagos = ['Pendente', 'Aprovada', 'Enviada', 'Aguardando Aprovação'];
                  const isNaoPaga = statusNaoPagos.includes(sol.status);
                  const isAguardandoPagamento = !paga && !isNaoPaga;
                  const isSelected = solicitacaoSelecionada?.id === sol.id;
                  return (
                    <div
                      key={sol.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                      )}
                      onClick={() => {
                        setSolicitacaoSelecionada(isSelected ? null : sol);
                        setJustificativaNaoUso('');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted-foreground">{sol.id}</span>
                          <span className="font-medium text-sm">{sol.peca}</span>
                          <span className="text-muted-foreground text-xs">x{sol.quantidade}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {paga && sol.valorPeca && (
                            <span className="text-xs font-medium text-green-600">{formatCurrency(sol.valorPeca * sol.quantidade)}</span>
                          )}
                          <Badge variant={paga ? 'default' : 'outline'} className={cn(
                            'text-xs',
                            paga ? 'bg-green-600' : isAguardandoPagamento ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-gray-50 text-gray-600 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400'
                          )}>
                            {paga ? 'Paga' : isAguardandoPagamento ? 'Aguardando Pagamento' : 'Não Paga'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{sol.status}</Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Justificativa e ação */}
            {solicitacaoSelecionada && (
              <div className="border-t pt-4 space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                    {['Pendente', 'Aprovada', 'Enviada', 'Aguardando Aprovação'].includes(solicitacaoSelecionada.status)
                      ? '⚠️ Esta peça será CANCELADA (não paga).'
                      : isPecaPaga(solicitacaoSelecionada)
                        ? '📦 Esta peça será INCORPORADA AO ESTOQUE da loja (já paga). O valor será subtraído da OS.'
                        : '⏳ Pagamento ainda em andamento. Não é possível incorporar ao estoque até a conclusão do pagamento.'
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Justificativa *</Label>
                  <Textarea
                    value={justificativaNaoUso}
                    onChange={(e) => setJustificativaNaoUso(e.target.value)}
                    placeholder="Informe o motivo da não utilização da peça..."
                    rows={3}
                    className={cn(!justificativaNaoUso.trim() && 'border-destructive')}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPecaNaoUtilizadaModal(false)}>
              Fechar
            </Button>
            {solicitacaoSelecionada && (() => {
              const isNaoPaga = ['Pendente', 'Aprovada', 'Enviada', 'Aguardando Aprovação'].includes(solicitacaoSelecionada.status);
              const paga = isPecaPaga(solicitacaoSelecionada);
              const aguardandoPgto = !paga && !isNaoPaga;
              return (
                <Button
                  onClick={handleMarcarNaoUtilizada}
                  disabled={!justificativaNaoUso.trim() || aguardandoPgto}
                  variant="destructive"
                  className="gap-2"
                >
                  <Undo2 className="h-4 w-4" />
                  {isNaoPaga ? 'Cancelar Solicitação' : 'Marcar Não Utilizada'}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </OSLayout>
  );
}
