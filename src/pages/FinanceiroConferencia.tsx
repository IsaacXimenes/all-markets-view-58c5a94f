import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Check, Download, Filter, X, Clock, CheckCircle2, Undo2, AlertCircle, CreditCard, Banknote, Smartphone, Wallet, ChevronRight, Lock, MessageSquare, XCircle, Save, Building2, History, UserCheck, Calendar, User, CheckCircle, FileText, Timer } from 'lucide-react';
import { getContasFinanceiras } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useFluxoVendas } from '@/hooks/useFluxoVendas';
import { 
  finalizarVenda, 
  devolverFinanceiro,
  getCorBadgeStatus,
  exportFluxoToCSV,
  VendaComFluxo,
  StatusVenda
} from '@/utils/fluxoVendasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { toast } from 'sonner';

// Mock do usuário logado (financeiro)
const usuarioLogado = { id: 'COL-008', nome: 'Ana Financeiro' };

// Interface para linha da tabela (dividida por método de pagamento)
interface LinhaConferencia {
  vendaId: string;
  venda: VendaComFluxo;
  metodoPagamento: string;
  valor: number;
  contaDestinoId: string;
  contaDestinoNome: string;
  conferido: boolean;
  conferidoPor?: string;
  dataConferencia?: string;
  tempoSLA?: string;
  slaHoras?: number;
}

// Função para calcular SLA em formato legível
const calcularSLA = (dataEntradaFinanceiro: string | undefined, statusFluxo: string): { texto: string; horas: number } => {
  if (!dataEntradaFinanceiro) return { texto: '-', horas: 0 };
  
  const dataInicio = new Date(dataEntradaFinanceiro);
  const dataFim = statusFluxo === 'Finalizado' 
    ? new Date() // Para finalizados, usamos agora (poderia ser a data de finalização)
    : new Date();
  
  const diffMs = dataFim.getTime() - dataInicio.getTime();
  const diffHoras = diffMs / (1000 * 60 * 60);
  const diffMinutos = (diffMs % (1000 * 60 * 60)) / (1000 * 60);
  
  if (diffHoras >= 24) {
    const dias = Math.floor(diffHoras / 24);
    const horasRestantes = Math.floor(diffHoras % 24);
    return { 
      texto: `${dias} Dia${dias > 1 ? 's' : ''} e ${horasRestantes}h`, 
      horas: diffHoras 
    };
  }
  
  return { 
    texto: `${Math.floor(diffHoras)}h ${Math.floor(diffMinutos)}m`, 
    horas: diffHoras 
  };
};

// Interface para histórico de conferências
interface HistoricoConferencia {
  metodoPagamento: string;
  contaDestino: string;
  valor: number;
  conferidoPor: string;
  dataHora: string;
}

// Interface para validação de pagamentos
interface ValidacaoPagamento {
  metodoPagamento: string;
  validadoGestor: boolean;
  validadoFinanceiro: boolean;
  dataValidacaoGestor?: string;
  dataValidacaoFinanceiro?: string;
  conferidoPor?: string;
  contaDestinoId?: string;
}

// Interface para situação da conferência
type SituacaoConferencia = 'Conferido' | `Pendente - ${string}`;

// Interface para observações
interface Observacao {
  texto: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
}

// Interface para aprovação do gestor
interface AprovacaoGestor {
  aprovadoPor: string;
  nomeGestor: string;
  dataAprovacao: string;
}

export default function FinanceiroConferencia() {
  const navigate = useNavigate();
  const { obterLojasAtivas, obterColaboradoresAtivos, obterFinanceiros, obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const { vendas, recarregar } = useFluxoVendas({
    status: ['Conferência Financeiro', 'Finalizado']
  });
  
  const contasFinanceiras = getContasFinanceiras();
  const colaboradores = obterColaboradoresAtivos();
  const lojas = obterLojasAtivas();
  
  // Modais e estados
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaComFluxo | null>(null);
  const [modalRejeitar, setModalRejeitar] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [validacoesPagamento, setValidacoesPagamento] = useState<ValidacaoPagamento[]>([]);
  
  // Modal de confirmação de conferência
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [metodoConfirmando, setMetodoConfirmando] = useState<ValidacaoPagamento | null>(null);
  const [contaDestinoConfirmacao, setContaDestinoConfirmacao] = useState('');
  
  // Novos estados para funcionalidades adicionais
  const [observacaoFinanceiro, setObservacaoFinanceiro] = useState('');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [observacaoGestorCarregada, setObservacaoGestorCarregada] = useState<Observacao | null>(null);
  const [aprovacaoGestor, setAprovacaoGestor] = useState<AprovacaoGestor | null>(null);
  const [historicoConferencias, setHistoricoConferencias] = useState<HistoricoConferencia[]>([]);
  const [dataFinalizacao, setDataFinalizacao] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    loja: 'todas',
    status: 'todos',
    contaOrigem: 'todas',
    situacao: 'todas',
    metodoPagamento: 'todos' // NOVO: Filtro por método de pagamento
  });

  // Filtrar colaboradores com permissão "Financeiro" (usando a flag do cargo)
  const colaboradoresFinanceiros = useMemo(() => {
    return colaboradores.filter(col => 
      col.cargo.toLowerCase().includes('financeiro') || col.eh_gestor
    );
  }, [colaboradores]);

  // Calcular situação de conferência de uma venda
  const getSituacaoConferencia = (venda: VendaComFluxo): SituacaoConferencia => {
    if (venda.statusFluxo === 'Finalizado') return 'Conferido';
    
    const storedValidacoes = localStorage.getItem(`validacao_pagamentos_financeiro_${venda.id}`);
    if (!storedValidacoes) {
      const metodos = venda.pagamentos?.map(p => p.meioPagamento) || [];
      if (metodos.length > 0) {
        return `Pendente - ${metodos[0]}`;
      }
      return 'Conferido';
    }
    
    const validacoes = JSON.parse(storedValidacoes);
    const naoValidados = validacoes.filter((v: ValidacaoPagamento) => !v.validadoFinanceiro);
    
    if (naoValidados.length === 0) return 'Conferido';
    return `Pendente - ${naoValidados[0].metodoPagamento}`;
  };

  // Obter conta de origem de uma venda (mock - usando lojaVenda como referência)
  const getContaOrigem = (venda: VendaComFluxo) => {
    const contaOrigem = contasFinanceiras.find(c => c.lojaVinculada === venda.lojaVenda);
    return contaOrigem || null;
  };

  // Criar linhas da tabela divididas por método de pagamento
  const linhasConferencia = useMemo((): LinhaConferencia[] => {
    const linhas: LinhaConferencia[] = [];
    
    vendas.forEach(venda => {
      const storedValidacoes = localStorage.getItem(`validacao_pagamentos_financeiro_${venda.id}`);
      const validacoesFinanceiro: ValidacaoPagamento[] = storedValidacoes ? JSON.parse(storedValidacoes) : [];
      const contaOrigem = getContaOrigem(venda);
      
      // Calcular SLA baseado na entrada em Conferência Financeiro
      const dataEntradaFinanceiro = venda.timeline?.find(t => 
        t.descricao?.includes('Conferência Financeiro') || t.tipo === 'aprovacao_gestor'
      )?.dataHora;
      const slaResult = calcularSLA(dataEntradaFinanceiro, venda.statusFluxo);
      
      venda.pagamentos?.forEach(pag => {
        const validacao = validacoesFinanceiro.find(v => v.metodoPagamento === pag.meioPagamento);
        const contaDestinoId = validacao?.contaDestinoId || contaOrigem?.id || '';
        const contaDestino = contasFinanceiras.find(c => c.id === contaDestinoId);
        
        linhas.push({
          vendaId: venda.id,
          venda,
          metodoPagamento: pag.meioPagamento,
          valor: pag.valor,
          contaDestinoId,
          contaDestinoNome: contaDestino?.nome || 'Não informada',
          conferido: validacao?.validadoFinanceiro || venda.statusFluxo === 'Finalizado',
          conferidoPor: validacao?.conferidoPor,
          dataConferencia: validacao?.dataValidacaoFinanceiro,
          tempoSLA: slaResult.texto,
          slaHoras: slaResult.horas
        });
      });
    });
    
    return linhas;
  }, [vendas, contasFinanceiras]);

  // Filtrar linhas
  const filteredLinhas = useMemo(() => {
    return linhasConferencia.filter(linha => {
      const venda = linha.venda;
      
      if (filters.dataInicio && new Date(venda.dataHora) < new Date(filters.dataInicio)) return false;
      if (filters.dataFim) {
        const dataFim = new Date(filters.dataFim);
        dataFim.setHours(23, 59, 59);
        if (new Date(venda.dataHora) > dataFim) return false;
      }
      if (filters.loja !== 'todas' && venda.lojaVenda !== filters.loja) return false;
      if (filters.status !== 'todos' && venda.statusFluxo !== filters.status) return false;
      
      // Filtro por conta de origem
      if (filters.contaOrigem !== 'todas') {
        const contaOrigem = getContaOrigem(venda);
        if (!contaOrigem || contaOrigem.id !== filters.contaOrigem) return false;
      }
      
      // Filtro por método de pagamento
      if (filters.metodoPagamento !== 'todos') {
        const metodoLower = linha.metodoPagamento.toLowerCase();
        if (filters.metodoPagamento === 'dinheiro' && !metodoLower.includes('dinheiro')) return false;
        if (filters.metodoPagamento === 'pix' && !metodoLower.includes('pix')) return false;
        if (filters.metodoPagamento === 'credito' && !(metodoLower.includes('crédito') || metodoLower.includes('credito'))) return false;
        if (filters.metodoPagamento === 'debito' && !(metodoLower.includes('débito') || metodoLower.includes('debito'))) return false;
        if (filters.metodoPagamento === 'boleto' && !(metodoLower.includes('boleto') || metodoLower.includes('crediário'))) return false;
      }
      
      // Filtro por situação
      if (filters.situacao !== 'todas') {
        if (filters.situacao === 'conferido' && !linha.conferido) return false;
        if (filters.situacao === 'pendente' && linha.conferido) return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Pendentes primeiro, depois por data
      if (a.conferido !== b.conferido) return a.conferido ? 1 : -1;
      return new Date(b.venda.dataHora).getTime() - new Date(a.venda.dataHora).getTime();
    });
  }, [linhasConferencia, filters, contasFinanceiras]);

  // Calcular somatórios dinâmicos baseados no filtro de método
  const somatorioPagamentos = useMemo(() => {
    const totais = {
      pendente: { cartaoCredito: 0, cartaoDebito: 0, pix: 0, dinheiro: 0, boleto: 0 },
      conferido: { cartaoCredito: 0, cartaoDebito: 0, pix: 0, dinheiro: 0, boleto: 0 }
    };

    filteredLinhas.forEach(linha => {
      const meio = linha.metodoPagamento.toLowerCase();
      const target = linha.conferido ? totais.conferido : totais.pendente;
      
      if (meio.includes('crédito') || meio.includes('credito')) {
        target.cartaoCredito += linha.valor;
      } else if (meio.includes('débito') || meio.includes('debito')) {
        target.cartaoDebito += linha.valor;
      } else if (meio.includes('pix')) {
        target.pix += linha.valor;
      } else if (meio.includes('dinheiro')) {
        target.dinheiro += linha.valor;
      } else if (meio.includes('boleto') || meio.includes('crediário')) {
        target.boleto += linha.valor;
      }
    });

    return totais;
  }, [filteredLinhas]);

  // Verificar se deve mostrar cards específicos baseado no filtro
  const mostrarCardsPorFiltro = useMemo(() => {
    if (filters.metodoPagamento === 'todos') {
      return { credito: true, debito: true, pix: true, dinheiro: true, boleto: true };
    }
    return {
      credito: filters.metodoPagamento === 'credito',
      debito: filters.metodoPagamento === 'debito',
      pix: filters.metodoPagamento === 'pix',
      dinheiro: filters.metodoPagamento === 'dinheiro',
      boleto: filters.metodoPagamento === 'boleto'
    };
  }, [filters.metodoPagamento]);

  const contadoresDinamicos = useMemo(() => {
    // Obter vendas únicas das linhas filtradas
    const vendasFiltradasIds = [...new Set(filteredLinhas.map(l => l.vendaId))];
    const vendasFiltradas = vendasFiltradasIds.map(id => 
      filteredLinhas.find(l => l.vendaId === id)!.venda
    );
    
    return {
      pendentes: vendasFiltradas.filter(v => v.statusFluxo === 'Conferência Financeiro').length,
      finalizados: vendasFiltradas.filter(v => v.statusFluxo === 'Finalizado').length,
      totalPendente: filteredLinhas.filter(l => !l.conferido).reduce((acc, l) => acc + l.valor, 0)
    };
  }, [filteredLinhas]);

  const { pendentes, finalizados, totalPendente } = contadoresDinamicos;

  const handleSelecionarVenda = (venda: VendaComFluxo) => {
    setVendaSelecionada(venda);
    
    // Carregar validações do gestor e do financeiro
    const gestorValidacoes = localStorage.getItem(`validacao_pagamentos_${venda.id}`);
    const financeiroValidacoes = localStorage.getItem(`validacao_pagamentos_financeiro_${venda.id}`);
    
    const metodos = venda.pagamentos?.map(p => p.meioPagamento) || [];
    const metodosUnicos = [...new Set(metodos)];
    
    const gestorData = gestorValidacoes ? JSON.parse(gestorValidacoes) : [];
    const financeiroData: ValidacaoPagamento[] = financeiroValidacoes ? JSON.parse(financeiroValidacoes) : [];
    
    const validacoes = metodosUnicos.map(metodo => {
      const gestor = gestorData.find((v: any) => v.metodoPagamento === metodo);
      const financeiro = financeiroData.find(v => v.metodoPagamento === metodo);
      return {
        metodoPagamento: metodo,
        validadoGestor: gestor?.validadoGestor || false,
        validadoFinanceiro: financeiro?.validadoFinanceiro || false,
        dataValidacaoGestor: gestor?.dataValidacao,
        dataValidacaoFinanceiro: financeiro?.dataValidacaoFinanceiro,
        conferidoPor: financeiro?.conferidoPor,
        contaDestinoId: financeiro?.contaDestinoId
      };
    });
    
    setValidacoesPagamento(validacoes);
    
    // Carregar aprovação do gestor
    const storedAprovacao = localStorage.getItem(`aprovacao_gestor_${venda.id}`);
    if (storedAprovacao) {
      setAprovacaoGestor(JSON.parse(storedAprovacao));
    } else {
      // Tentar carregar do timeline
      const timelineEvento = venda.timeline?.find(t => t.tipo === 'aprovacao_gestor' || t.descricao?.includes('Gestor'));
      if (timelineEvento) {
        setAprovacaoGestor({
          aprovadoPor: timelineEvento.usuarioId || '',
          nomeGestor: timelineEvento.usuarioNome || '',
          dataAprovacao: timelineEvento.dataHora || ''
        });
      } else {
        setAprovacaoGestor(null);
      }
    }
    
    // Carregar histórico de conferências
    const storedHistorico = localStorage.getItem(`historico_conferencias_${venda.id}`);
    if (storedHistorico) {
      setHistoricoConferencias(JSON.parse(storedHistorico));
    } else {
      // Construir histórico a partir das validações
      const historico: HistoricoConferencia[] = financeiroData
        .filter(v => v.validadoFinanceiro)
        .map(v => {
          const contaDestino = contasFinanceiras.find(c => c.id === v.contaDestinoId);
          const pagamento = venda.pagamentos?.find(p => p.meioPagamento === v.metodoPagamento);
          return {
            metodoPagamento: v.metodoPagamento,
            contaDestino: contaDestino?.nome || 'Não informada',
            valor: pagamento?.valor || 0,
            conferidoPor: v.conferidoPor || 'Sistema',
            dataHora: v.dataValidacaoFinanceiro || ''
          };
        });
      setHistoricoConferencias(historico);
    }
    
    // Carregar data de finalização
    const storedFinalizacao = localStorage.getItem(`data_finalizacao_${venda.id}`);
    if (storedFinalizacao) {
      setDataFinalizacao(storedFinalizacao);
    } else if (venda.statusFluxo === 'Finalizado') {
      const finalizacaoEvento = venda.timeline?.find(t => t.tipo === 'finalizacao');
      setDataFinalizacao(finalizacaoEvento?.dataHora || null);
    } else {
      setDataFinalizacao(null);
    }
    
    // Carregar observação do gestor
    const storedObsGestor = localStorage.getItem(`observacao_gestor_${venda.id}`);
    if (storedObsGestor) {
      setObservacaoGestorCarregada(JSON.parse(storedObsGestor));
    } else {
      setObservacaoGestorCarregada(null);
    }
    
    // Carregar observação do financeiro
    const storedObsFinanceiro = localStorage.getItem(`observacao_financeiro_${venda.id}`);
    if (storedObsFinanceiro) {
      const obs: Observacao = JSON.parse(storedObsFinanceiro);
      setObservacaoFinanceiro(obs.texto);
    } else {
      setObservacaoFinanceiro('');
    }
    
    // Carregar conta de destino (default: conta de origem)
    const storedContaDestino = localStorage.getItem(`conta_destino_${venda.id}`);
    if (storedContaDestino) {
      setContaDestinoId(storedContaDestino);
    } else {
      const contaOrigem = getContaOrigem(venda);
      setContaDestinoId(contaOrigem?.id || '');
    }
  };

  const handleFecharPainel = () => {
    setVendaSelecionada(null);
    setValidacoesPagamento([]);
    setObservacaoFinanceiro('');
    setObservacaoGestorCarregada(null);
    setAprovacaoGestor(null);
    setHistoricoConferencias([]);
    setDataFinalizacao(null);
    setContaDestinoId('');
  };

  // Abrir modal de confirmação ao clicar no checkbox
  const handleAbrirModalConfirmacao = (validacao: ValidacaoPagamento) => {
    if (validacao.validadoFinanceiro) {
      // Se já está conferido, apenas desmarcar
      handleConfirmarConferencia(validacao.metodoPagamento, false);
      return;
    }
    
    setMetodoConfirmando(validacao);
    setContaDestinoConfirmacao(validacao.contaDestinoId || contaDestinoId || '');
    setModalConfirmacao(true);
  };

  // Confirmar conferência no modal
  const handleConfirmarConferenciaModal = () => {
    if (!metodoConfirmando || !contaDestinoConfirmacao) {
      toast.error('Selecione uma conta de destino');
      return;
    }
    
    handleConfirmarConferencia(metodoConfirmando.metodoPagamento, true, contaDestinoConfirmacao);
    setModalConfirmacao(false);
    setMetodoConfirmando(null);
    setContaDestinoConfirmacao('');
  };

  const handleConfirmarConferencia = (metodo: string, confirmar: boolean, contaDestinoIdParam?: string) => {
    const novasValidacoes = validacoesPagamento.map(v => 
      v.metodoPagamento === metodo 
        ? { 
            ...v, 
            validadoFinanceiro: confirmar, 
            dataValidacaoFinanceiro: confirmar ? new Date().toISOString() : undefined,
            conferidoPor: confirmar ? usuarioLogado.nome : undefined,
            contaDestinoId: confirmar ? (contaDestinoIdParam || contaDestinoId) : undefined
          }
        : v
    );
    
    setValidacoesPagamento(novasValidacoes);
    
    // Salvar no localStorage
    if (vendaSelecionada) {
      localStorage.setItem(
        `validacao_pagamentos_financeiro_${vendaSelecionada.id}`,
        JSON.stringify(novasValidacoes)
      );
      
      // Atualizar histórico de conferências
      if (confirmar) {
        const contaDestino = contasFinanceiras.find(c => c.id === (contaDestinoIdParam || contaDestinoId));
        const pagamento = vendaSelecionada.pagamentos?.find(p => p.meioPagamento === metodo);
        
        const novaConferencia: HistoricoConferencia = {
          metodoPagamento: metodo,
          contaDestino: contaDestino?.nome || 'Não informada',
          valor: pagamento?.valor || 0,
          conferidoPor: usuarioLogado.nome,
          dataHora: new Date().toISOString()
        };
        
        const novoHistorico = [...historicoConferencias.filter(h => h.metodoPagamento !== metodo), novaConferencia];
        setHistoricoConferencias(novoHistorico);
        localStorage.setItem(`historico_conferencias_${vendaSelecionada.id}`, JSON.stringify(novoHistorico));
        
        toast.success(`Conferência de ${metodo} registrada com sucesso!`);
      } else {
        const novoHistorico = historicoConferencias.filter(h => h.metodoPagamento !== metodo);
        setHistoricoConferencias(novoHistorico);
        localStorage.setItem(`historico_conferencias_${vendaSelecionada.id}`, JSON.stringify(novoHistorico));
      }
      
      // Verificar se todos os métodos foram conferidos para registrar data de finalização
      const todosConferidos = novasValidacoes.every(v => v.validadoFinanceiro);
      if (todosConferidos && confirmar) {
        const dataFinal = new Date().toISOString();
        setDataFinalizacao(dataFinal);
        localStorage.setItem(`data_finalizacao_${vendaSelecionada.id}`, dataFinal);
      }
    }
    
    recarregar();
  };

  const handleSalvarSemFinalizar = () => {
    if (!vendaSelecionada) return;
    
    // Salvar validações
    localStorage.setItem(
      `validacao_pagamentos_financeiro_${vendaSelecionada.id}`,
      JSON.stringify(validacoesPagamento)
    );
    
    // Salvar observação do financeiro
    if (observacaoFinanceiro.trim()) {
      const obsFinanceiro: Observacao = {
        texto: observacaoFinanceiro.trim(),
        dataHora: new Date().toISOString(),
        usuarioId: usuarioLogado.id,
        usuarioNome: usuarioLogado.nome
      };
      localStorage.setItem(
        `observacao_financeiro_${vendaSelecionada.id}`,
        JSON.stringify(obsFinanceiro)
      );
    }
    
    // Salvar conta de destino
    if (contaDestinoId) {
      localStorage.setItem(`conta_destino_${vendaSelecionada.id}`, contaDestinoId);
    }
    
    toast.success('Validações e observações salvas com sucesso!');
    recarregar();
  };

  const handleFinalizar = () => {
    if (!vendaSelecionada) return;

    // Validar se todos os checkboxes estão marcados
    const naoValidados = validacoesPagamento.filter(v => !v.validadoFinanceiro);
    if (naoValidados.length > 0) {
      toast.error('Não é possível finalizar com pendências. Todos os métodos de pagamento devem ser validados.');
      return;
    }

    // Salvar validações antes de finalizar
    localStorage.setItem(
      `validacao_pagamentos_financeiro_${vendaSelecionada.id}`,
      JSON.stringify(validacoesPagamento)
    );

    // Salvar observação do financeiro
    if (observacaoFinanceiro.trim()) {
      const obsFinanceiro: Observacao = {
        texto: observacaoFinanceiro.trim(),
        dataHora: new Date().toISOString(),
        usuarioId: usuarioLogado.id,
        usuarioNome: usuarioLogado.nome
      };
      localStorage.setItem(
        `observacao_financeiro_${vendaSelecionada.id}`,
        JSON.stringify(obsFinanceiro)
      );
    }

    // Registrar data de finalização
    const dataFinal = new Date().toISOString();
    localStorage.setItem(`data_finalizacao_${vendaSelecionada.id}`, dataFinal);

    const resultado = finalizarVenda(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome
    );

    if (resultado) {
      toast.success(`Venda ${vendaSelecionada.id} finalizada com sucesso!`);
      handleFecharPainel();
      recarregar();
    } else {
      toast.error('Erro ao finalizar venda.');
    }
  };

  const handleAbrirModalRejeitar = () => {
    setMotivoRejeicao('');
    setModalRejeitar(true);
  };

  const handleRejeitar = () => {
    if (!vendaSelecionada || !motivoRejeicao.trim()) {
      toast.error('Por favor, informe o motivo da rejeição.');
      return;
    }

    const rejeicaoFinanceiro = {
      motivo: motivoRejeicao.trim(),
      dataHora: new Date().toISOString(),
      usuarioId: usuarioLogado.id,
      usuarioNome: usuarioLogado.nome
    };
    localStorage.setItem(
      `rejeicao_financeiro_${vendaSelecionada.id}`,
      JSON.stringify(rejeicaoFinanceiro)
    );

    const resultado = devolverFinanceiro(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome,
      motivoRejeicao.trim()
    );

    if (resultado) {
      toast.success(`Conferência da venda ${vendaSelecionada.id} recusada.`);
      setModalRejeitar(false);
      handleFecharPainel();
      recarregar();
    } else {
      toast.error('Erro ao rejeitar venda.');
    }
  };

  const handleExport = () => {
    const dataAtual = new Date().toISOString().split('T')[0];
    const vendaIds = [...new Set(filteredLinhas.map(l => l.vendaId))];
    const vendasExport = vendas.filter(v => vendaIds.includes(v.id));
    exportFluxoToCSV(vendasExport, `conferencia-financeiro-${dataAtual}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({ dataInicio: '', dataFim: '', loja: 'todas', status: 'todos', contaOrigem: 'todas', situacao: 'todas', metodoPagamento: 'todos' });
  };

  const getStatusBadge = (status: StatusVenda) => {
    const cores = getCorBadgeStatus(status);
    return (
      <Badge variant="outline" className={`${cores.bg} ${cores.text} ${cores.border} whitespace-nowrap dark:bg-opacity-20`}>
        {status}
      </Badge>
    );
  };

  const getSituacaoBadge = (conferido: boolean) => {
    if (conferido) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Conferido</Badge>;
    }
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Pendente</Badge>;
  };

  const getRowClassName = (linha: LinhaConferencia) => {
    if (linha.conferido) {
      return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100';
    }
    return 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100';
  };

  const getLojaNome = (lojaId: string) => lojas.find(l => l.id === lojaId)?.nome || lojaId;
  const getVendedorNome = (vendedorId: string) => colaboradores.find(c => c.id === vendedorId)?.nome || vendedorId;
  const getContaNome = (contaId: string) => contasFinanceiras.find(c => c.id === contaId)?.nome || 'Não informada';

  // Calcular valor exibido baseado no filtro de método
  const getValorExibido = (linha: LinhaConferencia) => {
    return linha.valor;
  };

  return (
    <FinanceiroLayout title="Conferência de Contas - Vendas">
      <div className="flex gap-6">
        {/* Painel Principal - Tabela (70%) */}
        <div className={`transition-all ${vendaSelecionada ? 'w-[70%]' : 'w-full'}`}>
          {/* Cards Pendente vs Conferido por método - Dinâmicos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Pendentes */}
            {mostrarCardsPorFiltro.credito && (
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-red-600 opacity-70" />
                    <div>
                      <p className="text-xs text-red-700 dark:text-red-300">Pendente - Crédito</p>
                      <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.cartaoCredito)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {mostrarCardsPorFiltro.debito && (
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-red-600 opacity-70" />
                    <div>
                      <p className="text-xs text-red-700 dark:text-red-300">Pendente - Débito</p>
                      <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.cartaoDebito)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {mostrarCardsPorFiltro.pix && (
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-red-600 opacity-70" />
                    <div>
                      <p className="text-xs text-red-700 dark:text-red-300">Pendente - Pix</p>
                      <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.pix)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {mostrarCardsPorFiltro.dinheiro && (
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-red-600 opacity-70" />
                    <div>
                      <p className="text-xs text-red-700 dark:text-red-300">Pendente - Dinheiro</p>
                      <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.dinheiro)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {mostrarCardsPorFiltro.boleto && (
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-red-600 opacity-70" />
                    <div>
                      <p className="text-xs text-red-700 dark:text-red-300">Pendente - Boleto</p>
                      <p className="text-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(somatorioPagamentos.pendente.boleto)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {mostrarCardsPorFiltro.credito && (
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-green-600 opacity-70" />
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300">Conferido - Crédito</p>
                      <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.cartaoCredito)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {mostrarCardsPorFiltro.debito && (
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-green-600 opacity-70" />
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300">Conferido - Débito</p>
                      <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.cartaoDebito)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {mostrarCardsPorFiltro.pix && (
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-green-600 opacity-70" />
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300">Conferido - Pix</p>
                      <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.pix)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {mostrarCardsPorFiltro.dinheiro && (
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-green-600 opacity-70" />
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300">Conferido - Dinheiro</p>
                      <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.dinheiro)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {mostrarCardsPorFiltro.boleto && (
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600 opacity-70" />
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300">Conferido - Boleto</p>
                      <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(somatorioPagamentos.conferido.boleto)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas Pendentes</p>
                    <p className="text-3xl font-bold text-yellow-600">{pendentes}</p>
                  </div>
                  <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas Finalizadas</p>
                    <p className="text-3xl font-bold text-green-600">{finalizados}</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Lançamentos Pendentes</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPendente)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
                <div>
                  <Label>Data Início</Label>
                  <Input type="date" value={filters.dataInicio} onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })} />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input type="date" value={filters.dataFim} onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })} />
                </div>
                <div>
                  <Label>Loja</Label>
                  <Select value={filters.loja} onValueChange={(value) => setFilters({ ...filters, loja: value })}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="Conferência Financeiro">Conferência Financeiro</SelectItem>
                      <SelectItem value="Finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Método de Pagamento</Label>
                  <Select value={filters.metodoPagamento} onValueChange={(value) => setFilters({ ...filters, metodoPagamento: value })}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Métodos</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="debito">Cartão de Débito</SelectItem>
                      <SelectItem value="boleto">Boleto/Crediário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Conta de Origem</Label>
                  <Select value={filters.contaOrigem} onValueChange={(value) => setFilters({ ...filters, contaOrigem: value })}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Contas</SelectItem>
                      {contasFinanceiras.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Situação</Label>
                  <Select value={filters.situacao} onValueChange={(value) => setFilters({ ...filters, situacao: value })}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Situações</SelectItem>
                      <SelectItem value="conferido">Conferido</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={handleLimpar} className="flex-1">
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                  <Button onClick={handleExport} variant="secondary">
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela com lançamentos divididos por método */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Venda</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Timer className="h-4 w-4" />
                          SLA
                        </div>
                      </TableHead>
                      <TableHead>Método Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Conta Destino</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLinhas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhum lançamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : filteredLinhas.map((linha, idx) => (
                      <TableRow 
                        key={`${linha.vendaId}-${linha.metodoPagamento}-${idx}`} 
                        className={`${getRowClassName(linha)} ${vendaSelecionada?.id === linha.vendaId ? 'ring-2 ring-primary' : ''} cursor-pointer`}
                        onClick={() => handleSelecionarVenda(linha.venda)}
                      >
                        <TableCell className="font-medium">{linha.vendaId}</TableCell>
                        <TableCell>{new Date(linha.venda.dataHora).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            linha.slaHoras && linha.slaHoras >= 24 
                              ? 'bg-destructive/20 text-destructive' 
                              : linha.slaHoras && linha.slaHoras >= 12 
                                ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' 
                                : 'bg-muted text-muted-foreground'
                          }`}>
                            <Timer className="h-3 w-3" />
                            {linha.tempoSLA || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {linha.metodoPagamento}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(getValorExibido(linha))}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{linha.contaDestinoNome}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getSituacaoBadge(linha.conferido)}</TableCell>
                        <TableCell>{getStatusBadge(linha.venda.statusFluxo as StatusVenda)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSelecionarVenda(linha.venda); }}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel Lateral (30%) */}
        {vendaSelecionada && (
          <div className="w-[30%] sticky top-4 h-fit min-w-[350px]">
            <Card className="max-h-[calc(100vh-120px)] overflow-y-auto">
              <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Detalhes da Venda</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleFecharPainel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Info da venda */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">ID</p>
                    <p className="font-medium">{vendaSelecionada.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cliente</p>
                    <p className="font-medium truncate">{vendaSelecionada.clienteNome}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Valor Total</p>
                    <p className="font-medium text-lg">{formatCurrency(vendaSelecionada.total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Lucro</p>
                    <p className={`font-medium ${vendaSelecionada.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(vendaSelecionada.lucro)}
                    </p>
                  </div>
                </div>

                {/* Aprovação do Gestor */}
                {aprovacaoGestor && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-4 w-4 text-blue-600" />
                      <Label className="font-semibold text-sm text-blue-700 dark:text-blue-400">Aprovação do Gestor</Label>
                    </div>
                    <p className="text-sm">
                      Aprovado por <span className="font-medium">{aprovacaoGestor.nomeGestor}</span>
                    </p>
                    {aprovacaoGestor.dataAprovacao && (
                      <p className="text-xs text-muted-foreground mt-1">
                        em {new Date(aprovacaoGestor.dataAprovacao).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}

                {/* Itens da venda */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Itens da Venda</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {vendaSelecionada.itens?.map((item, idx) => (
                      <div key={idx} className="text-xs p-2 bg-muted/50 rounded flex justify-between">
                        <span className="truncate flex-1">{item.produto}</span>
                        <span className="font-medium ml-2">{formatCurrency(item.valorVenda)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validação de Pagamentos com Checkbox */}
                {validacoesPagamento.length > 0 && vendaSelecionada.statusFluxo === 'Conferência Financeiro' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 text-sm mb-2">
                      Validação de Métodos de Pagamento
                    </h4>
                    <div className="space-y-2">
                      {validacoesPagamento.map((validacao, idx) => {
                        const pagamento = vendaSelecionada.pagamentos?.find(p => p.meioPagamento === validacao.metodoPagamento);
                        return (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-white/50 dark:bg-black/20 rounded">
                            <Checkbox
                              id={`fin-pagamento-${idx}`}
                              checked={validacao.validadoFinanceiro}
                              onCheckedChange={() => handleAbrirModalConfirmacao(validacao)}
                            />
                            <div className="flex-1">
                              <Label 
                                htmlFor={`fin-pagamento-${idx}`}
                                className="cursor-pointer font-normal text-sm"
                              >
                                {validacao.metodoPagamento}
                              </Label>
                              {pagamento && (
                                <p className="text-xs text-muted-foreground">{formatCurrency(pagamento.valor)}</p>
                              )}
                            </div>
                            {validacao.validadoGestor && (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                                Gestor ✓
                              </Badge>
                            )}
                            {validacao.validadoFinanceiro && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Rastreabilidade - Recebimento pelo Gestor */}
                {vendaSelecionada.recebimentoGestor && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <Label className="font-semibold text-sm text-blue-700 dark:text-blue-400">Recebido pelo Gestor</Label>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      {vendaSelecionada.recebimentoGestor.usuarioNome}
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                      em {new Date(vendaSelecionada.recebimentoGestor.dataHora).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}

                {/* Rastreabilidade - Aprovação pelo Gestor */}
                {vendaSelecionada.aprovacaoGestor && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <Label className="font-semibold text-sm text-green-700 dark:text-green-400">Aprovado pelo Gestor</Label>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      {vendaSelecionada.aprovacaoGestor.usuarioNome}
                    </p>
                    <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                      em {new Date(vendaSelecionada.aprovacaoGestor.dataHora).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}

                {/* Observação do Gestor (Apenas Leitura) */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-semibold text-sm">Observação do Gestor</Label>
                  </div>
                  {observacaoGestorCarregada ? (
                    <div>
                      <p className="text-sm text-muted-foreground">{observacaoGestorCarregada.texto}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Por {observacaoGestorCarregada.usuarioNome} em {new Date(observacaoGestorCarregada.dataHora).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma observação do gestor</p>
                  )}
                </div>

                {/* Observação do Financeiro (Editável) */}
                {vendaSelecionada.statusFluxo === 'Conferência Financeiro' && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold text-sm">Observação do Financeiro</Label>
                    </div>
                    <Textarea
                      placeholder="Adicione observações sobre esta conferência..."
                      value={observacaoFinanceiro}
                      onChange={(e) => setObservacaoFinanceiro(e.target.value.slice(0, 1000))}
                      rows={3}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {observacaoFinanceiro.length}/1000 caracteres
                    </p>
                  </div>
                )}

                {/* Histórico de Conferências */}
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-semibold text-sm">Histórico de Conferências</Label>
                  </div>
                  {historicoConferencias.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {historicoConferencias.map((hist, idx) => (
                        <div key={idx} className="text-xs p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{hist.metodoPagamento}</span>
                            <span className="font-semibold text-green-600">{formatCurrency(hist.valor)}</span>
                          </div>
                          <p className="text-muted-foreground">{hist.contaDestino}</p>
                          <p className="text-muted-foreground">
                            Por {hist.conferidoPor} em {new Date(hist.dataHora).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma conferência realizada</p>
                  )}
                </div>

                {/* Data de Finalização */}
                {dataFinalizacao && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <div>
                        <Label className="font-semibold text-sm text-green-700 dark:text-green-400">Finalizado em</Label>
                        <p className="text-sm">{new Date(dataFinalizacao).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ações */}
                {vendaSelecionada.statusFluxo === 'Conferência Financeiro' && (
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleSalvarSemFinalizar}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleFinalizar}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Finalizar
                      </Button>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={handleAbrirModalRejeitar}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={handleFecharPainel}
                    >
                      Voltar
                    </Button>
                  </div>
                )}

                {vendaSelecionada.statusFluxo === 'Finalizado' && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      Venda Finalizada
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal Confirmação de Conferência */}
      <Dialog open={modalConfirmacao} onOpenChange={setModalConfirmacao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
              Confirmar Conferência de Pagamento
            </DialogTitle>
            <DialogDescription>
              Confirme os dados da conferência abaixo.
            </DialogDescription>
          </DialogHeader>
          {metodoConfirmando && vendaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                  <p className="font-medium">{metodoConfirmando.metodoPagamento}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium">
                    {formatCurrency(
                      vendaSelecionada.pagamentos?.find(p => p.meioPagamento === metodoConfirmando.metodoPagamento)?.valor || 0
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conferido por</p>
                  <p className="font-medium">{usuarioLogado.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">{new Date().toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div>
                <Label>Conta de Destino *</Label>
                <Select value={contaDestinoConfirmacao} onValueChange={setContaDestinoConfirmacao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {contasFinanceiras.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConfirmacao(false)}>Cancelar</Button>
            <Button 
              onClick={handleConfirmarConferenciaModal} 
              disabled={!contaDestinoConfirmacao}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar Conferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rejeitar */}
      <Dialog open={modalRejeitar} onOpenChange={setModalRejeitar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Rejeitar Conferência
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja rejeitar esta conferência? A venda será devolvida ao gestor.
            </DialogDescription>
          </DialogHeader>
          {vendaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-medium">{vendaSelecionada.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium">{formatCurrency(vendaSelecionada.total)}</p>
                </div>
              </div>
              <div>
                <Label>Motivo da Rejeição *</Label>
                <Textarea 
                  placeholder="Descreva o motivo da rejeição..." 
                  value={motivoRejeicao} 
                  onChange={(e) => setMotivoRejeicao(e.target.value)} 
                  rows={3} 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRejeitar(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={handleRejeitar} 
              disabled={!motivoRejeicao.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
