// Fluxo de Vendas API - Gerenciamento do fluxo de conferência em 4 etapas
// Fluxo: Lançamento Aprovada -> Conferência Gestor -> Conferência Financeiro -> Finalizado
import { Venda, getVendas, getVendaById, updateVenda as updateVendaBase } from './vendasApi';
import { migrarTradeInsParaPendentes } from './osApi';
import { enviarNotificacaoVenda, DadosVendaNotificacao } from './whatsappNotificacaoApi';
import { addDespesa } from './financeApi';
import { criarDividaFiado } from './fiadoApi';

// Novo tipo para status de venda no fluxo de conferência
export type StatusVenda = 
  | 'Aguardando Conferência'    // Após vendedor finalizar
  | 'Feito Sinal'               // Venda com sinal - produtos bloqueados
  | 'Conferência Gestor'        // Após lançador aprovar
  | 'Recusada - Gestor'         // Se gestor recusar
  | 'Conferência Financeiro'    // Após gestor aprovar
  | 'Conferência Fiado'         // Após gestor aprovar venda Fiado
  | 'Devolvido pelo Financeiro' // Se financeiro devolver
  | 'Pagamento Downgrade'       // Venda com saldo a devolver (troca > produtos)
  | 'Finalizado'                // Após financeiro finalizar
  | 'Cancelada';                // Se cancelada

// Interface de timeline
export interface TimelineVenda {
  id: string;
  dataHora: string;
  tipo: 'criacao' | 'edicao' | 'aprovacao_lancamento' | 'recusa_gestor' | 'aprovacao_gestor' | 'devolucao_financeiro' | 'aprovacao_financeiro' | 'finalizacao';
  usuarioId: string;
  usuarioNome: string;
  descricao: string;
  alteracoes?: {
    campo: string;
    valorAnterior: any;
    valorNovo: any;
  }[];
  motivo?: string; // Para recusas
}

// Interface de aprovação
export interface RegistroAprovacao {
  usuarioId: string;
  usuarioNome: string;
  dataHora: string;
  motivo?: string; // Obrigatório para recusas
}

// Interface estendida da venda com o novo fluxo
export interface VendaComFluxo extends Venda {
  statusFluxo?: StatusVenda;
  aprovacaoLancamento?: RegistroAprovacao;
  recebimentoGestor?: RegistroAprovacao; // Registro de quando o gestor recebeu a venda
  aprovacaoGestor?: RegistroAprovacao;
  recusaGestor?: RegistroAprovacao;
  devolucaoFinanceiro?: RegistroAprovacao;
  aprovacaoFinanceiro?: RegistroAprovacao;
  pagamentoDowngrade?: RegistroAprovacao & { contaOrigem?: string }; // Para pagamento downgrade
  timelineFluxo?: TimelineVenda[];
  bloqueadoParaEdicao?: boolean;
  tipoOperacao?: 'Upgrade' | 'Downgrade'; // Tipo de operação de troca
  saldoDevolver?: number; // Valor a devolver ao cliente em downgrade
  chavePix?: string; // Chave PIX para devolução em downgrade
  contaOrigemDowngrade?: string; // Conta usada para pagamento do downgrade
}

// Armazena o estado do fluxo no localStorage
const FLUXO_VENDAS_KEY = 'fluxo_vendas_data';

// Obter dados do fluxo do localStorage
const getFluxoData = (): Record<string, Partial<VendaComFluxo>> => {
  try {
    const data = localStorage.getItem(FLUXO_VENDAS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Salvar dados do fluxo no localStorage
const saveFluxoData = (data: Record<string, Partial<VendaComFluxo>>) => {
  localStorage.setItem(FLUXO_VENDAS_KEY, JSON.stringify(data));
};

// Obter venda com dados do fluxo
export const getVendaComFluxo = (vendaId: string): VendaComFluxo | null => {
  const venda = getVendaById(vendaId);
  if (!venda) return null;

  const fluxoData = getFluxoData();
  const dadosFluxo = fluxoData[vendaId] || {};

  // Prioridade: dadosFluxo.statusFluxo > venda.statusAtual > 'Finalizado'
  const statusFluxo = dadosFluxo.statusFluxo || 
    (venda as any).statusAtual || 
    'Finalizado';

  return {
    ...venda,
    statusFluxo: statusFluxo as StatusVenda,
    aprovacaoLancamento: dadosFluxo.aprovacaoLancamento,
    recebimentoGestor: dadosFluxo.recebimentoGestor,
    aprovacaoGestor: dadosFluxo.aprovacaoGestor,
    recusaGestor: dadosFluxo.recusaGestor,
    devolucaoFinanceiro: dadosFluxo.devolucaoFinanceiro,
    aprovacaoFinanceiro: dadosFluxo.aprovacaoFinanceiro,
    pagamentoDowngrade: dadosFluxo.pagamentoDowngrade,
    timelineFluxo: dadosFluxo.timelineFluxo || (venda as any).timeline || [],
    bloqueadoParaEdicao: dadosFluxo.bloqueadoParaEdicao || (venda as any).bloqueadoParaEdicao || false,
    tipoOperacao: dadosFluxo.tipoOperacao || (venda as any).tipoOperacao,
    saldoDevolver: dadosFluxo.saldoDevolver || (venda as any).saldoDevolver || 0
  };
};

// Obter todas as vendas com dados do fluxo
export const getVendasComFluxo = (): VendaComFluxo[] => {
  const vendas = getVendas();
  const fluxoData = getFluxoData();

  return vendas.map(venda => {
    const dadosFluxo = fluxoData[venda.id] || {};
    
    // Prioridade: dadosFluxo.statusFluxo > venda.statusAtual > 'Finalizado'
    const statusFluxo = dadosFluxo.statusFluxo || 
      (venda as any).statusAtual || 
      'Finalizado';
    
    return {
      ...venda,
      statusFluxo: statusFluxo as StatusVenda,
      aprovacaoLancamento: dadosFluxo.aprovacaoLancamento,
      aprovacaoGestor: dadosFluxo.aprovacaoGestor,
      recusaGestor: dadosFluxo.recusaGestor,
      devolucaoFinanceiro: dadosFluxo.devolucaoFinanceiro,
      aprovacaoFinanceiro: dadosFluxo.aprovacaoFinanceiro,
      timelineFluxo: dadosFluxo.timelineFluxo || (venda as any).timeline || [],
      bloqueadoParaEdicao: dadosFluxo.bloqueadoParaEdicao || (venda as any).bloqueadoParaEdicao || false
    };
  });
};

// Obter vendas por status
export const getVendasPorStatus = (status: StatusVenda | StatusVenda[]): VendaComFluxo[] => {
  const vendas = getVendasComFluxo();
  const statusArray = Array.isArray(status) ? status : [status];
  return vendas.filter(v => statusArray.includes(v.statusFluxo as StatusVenda));
};

// Inicializar venda no fluxo (quando finaliza venda)
export const inicializarVendaNoFluxo = (
  vendaId: string,
  vendedorId: string,
  vendedorNome: string,
  statusInicial?: StatusVenda
): VendaComFluxo | null => {
  const venda = getVendaById(vendaId);
  if (!venda) return null;

  const fluxoData = getFluxoData();
  
  // Determinar status baseado na venda (se tem sinal, usa "Feito Sinal")
  const status: StatusVenda = statusInicial || 
    (venda as any).statusAtual || 
    'Aguardando Conferência';
  
  const isSinal = status === 'Feito Sinal';
  
  const timelineInicial: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'criacao',
    usuarioId: vendedorId,
    usuarioNome: vendedorNome,
    descricao: isSinal 
      ? `Venda com sinal criada por ${vendedorNome}. Produtos bloqueados aguardando pagamento restante.`
      : `Venda criada por ${vendedorNome}. Aguardando conferência do lançador.`
  };

  // Preservar tipo de operação e saldo a devolver da venda
  const vendaAny = venda as any;
  
  fluxoData[vendaId] = {
    statusFluxo: status,
    timelineFluxo: [timelineInicial],
    bloqueadoParaEdicao: false,
    tipoOperacao: vendaAny.tipoOperacao, // Persistir tipo de operação (Upgrade/Downgrade)
    saldoDevolver: vendaAny.saldoDevolver || 0 // Persistir saldo a devolver
  };

  saveFluxoData(fluxoData);
  return getVendaComFluxo(vendaId);
};

// Aprovar lançamento (Lançador -> Gestor)
// CORREÇÃO: Se não existir dadosFluxo mas a venda tiver statusAtual válido, cria automaticamente
export const aprovarLancamento = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  let dadosFluxo = fluxoData[vendaId];
  
  // Se não existir dadosFluxo, verificar se a venda tem statusAtual válido e criar automaticamente
  if (!dadosFluxo) {
    const venda = getVendaById(vendaId);
    if (venda) {
      const vendaAny = venda as any;
      const statusAtual = vendaAny.statusAtual;
      
      // Aceitar vendas que estão aguardando conferência ou foram recusadas pelo gestor
      if (statusAtual === 'Aguardando Conferência' || statusAtual === 'Recusada - Gestor') {
        // Criar registro de fluxo automaticamente (retrocompatibilidade)
        dadosFluxo = {
          statusFluxo: statusAtual as StatusVenda,
          timelineFluxo: vendaAny.timeline || [],
          bloqueadoParaEdicao: vendaAny.bloqueadoParaEdicao || false
        };
        fluxoData[vendaId] = dadosFluxo;
        console.log(`[Fluxo Vendas] Registro de fluxo criado automaticamente para venda ${vendaId}`);
      } else {
        console.log(`[Fluxo Vendas] Venda ${vendaId} com statusAtual inválido: ${statusAtual}`);
        return null;
      }
    } else {
      console.log(`[Fluxo Vendas] Venda ${vendaId} não encontrada`);
      return null;
    }
  }
  
  // Validar status permitido
  if (dadosFluxo.statusFluxo !== 'Aguardando Conferência' && dadosFluxo.statusFluxo !== 'Recusada - Gestor') {
    console.log(`[Fluxo Vendas] Status inválido para aprovar: ${dadosFluxo.statusFluxo}`);
    return null;
  }

  const novaTimeline: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'aprovacao_lancamento',
    usuarioId,
    usuarioNome,
    descricao: `Lançamento aprovado por ${usuarioNome}. Enviado para conferência do gestor.`
  };

  fluxoData[vendaId] = {
    ...dadosFluxo,
    statusFluxo: 'Conferência Gestor',
    aprovacaoLancamento: {
      usuarioId,
      usuarioNome,
      dataHora: new Date().toISOString()
    },
    // Registrar o recebimento pelo gestor (mesmo usuário/hora do envio)
    recebimentoGestor: {
      usuarioId,
      usuarioNome,
      dataHora: new Date().toISOString()
    },
    timelineFluxo: [...(dadosFluxo.timelineFluxo || []), novaTimeline]
  };

  saveFluxoData(fluxoData);
  return getVendaComFluxo(vendaId);
};

// Recusar (Gestor)
export const recusarGestor = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string,
  motivo: string
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  const dadosFluxo = fluxoData[vendaId];
  
  if (!dadosFluxo || dadosFluxo.statusFluxo !== 'Conferência Gestor' && dadosFluxo.statusFluxo !== 'Devolvido pelo Financeiro') {
    return null;
  }

  const novaTimeline: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'recusa_gestor',
    usuarioId,
    usuarioNome,
    descricao: `Recusado pelo gestor ${usuarioNome}. Motivo: ${motivo}`,
    motivo
  };

  fluxoData[vendaId] = {
    ...dadosFluxo,
    statusFluxo: 'Recusada - Gestor',
    recusaGestor: {
      usuarioId,
      usuarioNome,
      dataHora: new Date().toISOString(),
      motivo
    },
    timelineFluxo: [...(dadosFluxo.timelineFluxo || []), novaTimeline]
  };

  saveFluxoData(fluxoData);
  return getVendaComFluxo(vendaId);
};

// Aprovar (Gestor -> Financeiro ou Fiado)
export const aprovarGestor = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  const dadosFluxo = fluxoData[vendaId];
  
  if (!dadosFluxo || (dadosFluxo.statusFluxo !== 'Conferência Gestor' && dadosFluxo.statusFluxo !== 'Devolvido pelo Financeiro')) {
    return null;
  }

  // Detectar se a venda tem pagamento Fiado
  const venda = getVendaById(vendaId);
  const isFiado = venda?.pagamentos?.some((p: any) => p.isFiado) || false;
  const proximoStatus: StatusVenda = isFiado ? 'Conferência Fiado' : 'Conferência Financeiro';
  const descricaoDestino = isFiado ? 'conferência fiado' : 'conferência financeira';

  const novaTimeline: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'aprovacao_gestor',
    usuarioId,
    usuarioNome,
    descricao: `Aprovado pelo gestor ${usuarioNome}. Enviado para ${descricaoDestino}.`
  };

  fluxoData[vendaId] = {
    ...dadosFluxo,
    statusFluxo: proximoStatus,
    aprovacaoGestor: {
      usuarioId,
      usuarioNome,
      dataHora: new Date().toISOString()
    },
    timelineFluxo: [...(dadosFluxo.timelineFluxo || []), novaTimeline]
  };

  saveFluxoData(fluxoData);
  return getVendaComFluxo(vendaId);
};

// Devolver (Financeiro -> Gestor)
export const devolverFinanceiro = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string,
  motivo: string
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  const dadosFluxo = fluxoData[vendaId];
  
  if (!dadosFluxo || dadosFluxo.statusFluxo !== 'Conferência Financeiro') {
    return null;
  }

  const novaTimeline: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'devolucao_financeiro',
    usuarioId,
    usuarioNome,
    descricao: `Devolvido pelo financeiro ${usuarioNome}. Motivo: ${motivo}`,
    motivo
  };

  fluxoData[vendaId] = {
    ...dadosFluxo,
    statusFluxo: 'Devolvido pelo Financeiro',
    devolucaoFinanceiro: {
      usuarioId,
      usuarioNome,
      dataHora: new Date().toISOString(),
      motivo
    },
    timelineFluxo: [...(dadosFluxo.timelineFluxo || []), novaTimeline]
  };

  saveFluxoData(fluxoData);
  return getVendaComFluxo(vendaId);
};

// Finalizar (Financeiro) - Após finalizar, migra trade-ins para Aparelhos Pendentes Estoque
export const finalizarVenda = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  let dadosFluxo = fluxoData[vendaId];
  
  // Se não tem dados no fluxo, verificar se a venda tem statusAtual diretamente
  if (!dadosFluxo) {
    const venda = getVendaById(vendaId);
    if (venda && (venda as any).statusAtual === 'Conferência Financeiro') {
      // Inicializar dados de fluxo para venda mockada
      dadosFluxo = {
        statusFluxo: 'Conferência Financeiro',
        timelineFluxo: (venda as any).timeline || [],
        bloqueadoParaEdicao: false
      };
      fluxoData[vendaId] = dadosFluxo;
    } else {
      return null;
    }
  }
  
  if (dadosFluxo.statusFluxo !== 'Conferência Financeiro') {
    return null;
  }

  // Buscar a venda para obter trade-ins
  const venda = getVendaById(vendaId);
  
  const novaTimeline: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'finalizacao',
    usuarioId,
    usuarioNome,
    descricao: `Venda finalizada por ${usuarioNome}. Venda bloqueada para edições.`
  };

  fluxoData[vendaId] = {
    ...dadosFluxo,
    statusFluxo: 'Finalizado',
    aprovacaoFinanceiro: {
      usuarioId,
      usuarioNome,
      dataHora: new Date().toISOString()
    },
    timelineFluxo: [...(dadosFluxo.timelineFluxo || []), novaTimeline],
    bloqueadoParaEdicao: true
  };

  // Manter a venda base consistente com o fluxo (ajuda telas que dependem de statusAtual)
  updateVendaBase(vendaId, {
    statusAtual: 'Finalizado',
    bloqueadoParaEdicao: true
  });

  saveFluxoData(fluxoData);
  
  // MIGRAÇÃO AUTOMÁTICA: Após pagamento financeiro, trade-ins vão para Aparelhos Pendentes - Estoque
  if (venda && venda.tradeIns && venda.tradeIns.length > 0) {
    migrarTradeInsParaPendentes(venda.tradeIns, vendaId, venda.lojaVenda, usuarioNome);
    console.log(`[Fluxo Vendas] ${venda.tradeIns.length} trade-in(s) migrado(s) para Aparelhos Pendentes - Estoque`);
  }

  // NOTIFICAÇÃO WHATSAPP: Disparar após finalização bem-sucedida
  try {
    if (venda) {
      const formaPrincipal = venda.pagamentos && venda.pagamentos.length > 0
        ? venda.pagamentos[0].meioPagamento || 'Não informado'
        : 'Não informado';
      const dadosNotif: DadosVendaNotificacao = {
        id_venda: vendaId,
        loja: venda.lojaVenda || '',
        vendedor: venda.vendedor || '',
        cliente: venda.clienteNome || '',
        valor: (venda.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        forma_pagamento: formaPrincipal,
      };
      enviarNotificacaoVenda(dadosNotif);
    }
  } catch (err) {
    console.error('[WhatsApp] Falha ao disparar notificação (não bloqueante):', err);
  }
  
  return getVendaComFluxo(vendaId);
};

// Registrar edição na timeline
export const registrarEdicaoFluxo = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string,
  alteracoes: { campo: string; valorAnterior: any; valorNovo: any }[]
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  const dadosFluxo = fluxoData[vendaId];
  
  if (!dadosFluxo || dadosFluxo.bloqueadoParaEdicao) {
    return null;
  }

  const descricaoAlteracoes = alteracoes.map(a => {
    const valorAnt = typeof a.valorAnterior === 'number' 
      ? `R$ ${a.valorAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
      : String(a.valorAnterior);
    const valorNov = typeof a.valorNovo === 'number' 
      ? `R$ ${a.valorNovo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
      : String(a.valorNovo);
    return `${a.campo}: ${valorAnt} → ${valorNov}`;
  }).join('; ');

  const novaTimeline: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'edicao',
    usuarioId,
    usuarioNome,
    descricao: `Editado por ${usuarioNome}. ${descricaoAlteracoes}`,
    alteracoes
  };

  fluxoData[vendaId] = {
    ...dadosFluxo,
    timelineFluxo: [...(dadosFluxo.timelineFluxo || []), novaTimeline]
  };

  saveFluxoData(fluxoData);
  return getVendaComFluxo(vendaId);
};

// Validar se venda pode ser editada
export const podeEditarVenda = (venda: VendaComFluxo): boolean => {
  return !venda.bloqueadoParaEdicao && venda.statusFluxo !== 'Finalizado';
};

// Validar se venda pode ser recusada pelo gestor
export const podeRecusarVenda = (venda: VendaComFluxo): boolean => {
  return venda.statusFluxo === 'Conferência Gestor' || venda.statusFluxo === 'Devolvido pelo Financeiro';
};

// Validar se venda pode ser devolvida pelo financeiro
export const podeDevolverVenda = (venda: VendaComFluxo): boolean => {
  return venda.statusFluxo === 'Conferência Financeiro';
};

// Validar se venda pode ser aprovada pelo lançador
export const podeAprovarLancamento = (venda: VendaComFluxo): boolean => {
  return venda.statusFluxo === 'Aguardando Conferência' || venda.statusFluxo === 'Recusada - Gestor';
};

// Validar se venda pode ser aprovada pelo gestor
export const podeAprovarGestor = (venda: VendaComFluxo): boolean => {
  return venda.statusFluxo === 'Conferência Gestor' || venda.statusFluxo === 'Devolvido pelo Financeiro';
};

// Validar se venda pode ser finalizada pelo financeiro
export const podeFinalizarVenda = (venda: VendaComFluxo): boolean => {
  return venda.statusFluxo === 'Conferência Financeiro';
};

// Obter cor do badge por status
export const getCorBadgeStatus = (status: StatusVenda): { bg: string; text: string; border: string } => {
  switch (status) {
    case 'Aguardando Conferência':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'Feito Sinal':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    case 'Conferência Gestor':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    case 'Recusada - Gestor':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    case 'Conferência Financeiro':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    case 'Conferência Fiado':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'Devolvido pelo Financeiro':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'Pagamento Downgrade':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    case 'Finalizado':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    case 'Cancelada':
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
};

// Finalizar venda Downgrade (Financeiro executa PIX e finaliza)
export const finalizarVendaDowngrade = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string,
  contaOrigem: string,
  observacoes?: string
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  const dadosFluxo = fluxoData[vendaId];
  
  if (!dadosFluxo || dadosFluxo.statusFluxo !== 'Pagamento Downgrade') {
    console.log(`[Fluxo Vendas] Venda ${vendaId} não está em Pagamento Downgrade`);
    return null;
  }

  // Buscar a venda para obter trade-ins
  const venda = getVendaById(vendaId);
  
  const novaTimeline: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'finalizacao',
    usuarioId,
    usuarioNome,
    descricao: `Pagamento PIX Downgrade executado por ${usuarioNome}. Conta: ${contaOrigem}${observacoes ? `. Obs: ${observacoes}` : ''}`
  };

  const saldoDevolver = dadosFluxo.saldoDevolver || 0;

  fluxoData[vendaId] = {
    ...dadosFluxo,
    statusFluxo: 'Finalizado',
    tipoOperacao: 'Downgrade',
    saldoDevolver,
    contaOrigemDowngrade: contaOrigem,
    pagamentoDowngrade: {
      usuarioId,
      usuarioNome,
      dataHora: new Date().toISOString(),
      contaOrigem,
      motivo: observacoes
    },
    timelineFluxo: [...(dadosFluxo.timelineFluxo || []), novaTimeline],
    bloqueadoParaEdicao: true
  };

  saveFluxoData(fluxoData);

  // Registrar saída financeira no extrato
  if (saldoDevolver > 0) {
    const hoje = new Date();
    const competencia = hoje.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('. de ', '-').replace('.', '').toUpperCase();
    const mesAbrev = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const comp = `${mesAbrev[hoje.getMonth()]}-${hoje.getFullYear()}`;
    
    addDespesa({
      tipo: 'Variável',
      data: hoje.toISOString().split('T')[0],
      descricao: `Pagamento PIX Downgrade - Venda ${vendaId}`,
      valor: saldoDevolver,
      competencia: comp,
      conta: contaOrigem,
      observacoes: observacoes || '',
      lojaId: venda?.lojaVenda || '',
      status: 'Pago',
      categoria: 'Downgrade',
      dataVencimento: hoje.toISOString().split('T')[0],
      dataPagamento: hoje.toISOString().split('T')[0],
      recorrente: false,
      periodicidade: null,
      pagoPor: usuarioNome
    });
    console.log(`[Fluxo Vendas - Downgrade] Despesa de R$ ${saldoDevolver} registrada na conta ${contaOrigem}`);
  }
  
  // MIGRAÇÃO AUTOMÁTICA: Após pagamento PIX, trade-ins vão para Aparelhos Pendentes - Estoque
  if (venda && venda.tradeIns && venda.tradeIns.length > 0) {
    migrarTradeInsParaPendentes(venda.tradeIns, vendaId, venda.lojaVenda, usuarioNome);
    console.log(`[Fluxo Vendas - Downgrade] ${venda.tradeIns.length} trade-in(s) migrado(s) para Aparelhos Pendentes - Estoque`);
  }
  
  return getVendaComFluxo(vendaId);
};

// Enviar venda para Pagamento Downgrade (após gestor aprovar venda com saldo a devolver)
export const enviarParaPagamentoDowngrade = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string,
  saldoDevolver: number
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  const dadosFluxo = fluxoData[vendaId];
  
  if (!dadosFluxo || (dadosFluxo.statusFluxo !== 'Conferência Gestor' && dadosFluxo.statusFluxo !== 'Devolvido pelo Financeiro')) {
    return null;
  }

  const novaTimeline: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'aprovacao_gestor',
    usuarioId,
    usuarioNome,
    descricao: `Aprovado pelo gestor ${usuarioNome}. Enviado para Pagamento Downgrade. Valor a devolver: R$ ${saldoDevolver.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  };

  fluxoData[vendaId] = {
    ...dadosFluxo,
    statusFluxo: 'Pagamento Downgrade',
    saldoDevolver,
    aprovacaoGestor: {
      usuarioId,
      usuarioNome,
      dataHora: new Date().toISOString()
    },
    timelineFluxo: [...(dadosFluxo.timelineFluxo || []), novaTimeline]
  };

  saveFluxoData(fluxoData);
  return getVendaComFluxo(vendaId);
};

// Finalizar venda Fiado (Conferência Fiado -> Finalizado + cria dívida)
export const finalizarVendaFiado = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  const dadosFluxo = fluxoData[vendaId];
  
  if (!dadosFluxo || dadosFluxo.statusFluxo !== 'Conferência Fiado') {
    console.log(`[Fluxo Vendas] Venda ${vendaId} não está em Conferência Fiado`);
    return null;
  }

  const venda = getVendaById(vendaId);
  if (!venda) return null;

  const novaTimeline: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'finalizacao',
    usuarioId,
    usuarioNome,
    descricao: `Venda Fiado finalizada por ${usuarioNome}. Dívida criada automaticamente.`
  };

  fluxoData[vendaId] = {
    ...dadosFluxo,
    statusFluxo: 'Finalizado',
    aprovacaoFinanceiro: {
      usuarioId,
      usuarioNome,
      dataHora: new Date().toISOString()
    },
    timelineFluxo: [...(dadosFluxo.timelineFluxo || []), novaTimeline],
    bloqueadoParaEdicao: true
  };

  updateVendaBase(vendaId, {
    statusAtual: 'Finalizado',
    bloqueadoParaEdicao: true
  });

  saveFluxoData(fluxoData);

  // Criar dívida automaticamente
  const pagFiado = venda.pagamentos?.find((p: any) => p.isFiado);
  if (pagFiado) {
    criarDividaFiado(
      vendaId,
      (venda as any).clienteId || '',
      venda.clienteNome || '',
      (venda as any).lojaId || venda.lojaVenda || '',
      venda.lojaVenda || '',
      pagFiado.valor || venda.total || 0,
      (pagFiado as any).qtdVezes || 1,
      (pagFiado as any).tipoRecorrencia || 'Mensal'
    );
    console.log(`[Fluxo Vendas - Fiado] Dívida criada para venda ${vendaId}`);
  }

  // Migrar trade-ins
  if (venda.tradeIns && venda.tradeIns.length > 0) {
    migrarTradeInsParaPendentes(venda.tradeIns, vendaId, venda.lojaVenda, usuarioNome);
    console.log(`[Fluxo Vendas - Fiado] ${venda.tradeIns.length} trade-in(s) migrado(s)`);
  }

  return getVendaComFluxo(vendaId);
};

// Exportar para CSV
export const exportFluxoToCSV = (data: VendaComFluxo[], filename: string) => {
  if (data.length === 0) return;
  
  const csvData = data.map(v => ({
    'ID': v.id,
    'Data/Hora': new Date(v.dataHora).toLocaleString('pt-BR'),
    'Cliente': v.clienteNome,
    'Valor Total': v.total,
    'Status Fluxo': v.statusFluxo || 'N/A',
    'Tipo Operação': v.tipoOperacao || 'Upgrade',
    'Saldo Devolver': v.saldoDevolver || 0,
    'Lançador': v.aprovacaoLancamento?.usuarioNome || '-',
    'Data Lançamento': v.aprovacaoLancamento?.dataHora ? new Date(v.aprovacaoLancamento.dataHora).toLocaleString('pt-BR') : '-',
    'Gestor': v.aprovacaoGestor?.usuarioNome || '-',
    'Data Gestor': v.aprovacaoGestor?.dataHora ? new Date(v.aprovacaoGestor.dataHora).toLocaleString('pt-BR') : '-',
    'Financeiro': v.aprovacaoFinanceiro?.usuarioNome || '-',
    'Data Financeiro': v.aprovacaoFinanceiro?.dataHora ? new Date(v.aprovacaoFinanceiro.dataHora).toLocaleString('pt-BR') : '-'
  }));
  
  const headers = Object.keys(csvData[0]).join(',');
  const rows = csvData.map(item => 
    Object.values(item).map(value => 
      typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    ).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
