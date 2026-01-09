// Fluxo de Vendas API - Gerenciamento do fluxo de conferência em 4 etapas
import { Venda, getVendas, getVendaById, updateVenda as updateVendaBase } from './vendasApi';

// Novo tipo para status de venda no fluxo de conferência
export type StatusVenda = 
  | 'Aguardando Conferência'    // Após vendedor finalizar
  | 'Conferência Gestor'        // Após lançador aprovar
  | 'Recusada - Gestor'         // Se gestor recusar
  | 'Conferência Financeiro'    // Após gestor aprovar
  | 'Devolvido pelo Financeiro' // Se financeiro devolver
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
  aprovacaoGestor?: RegistroAprovacao;
  recusaGestor?: RegistroAprovacao;
  devolucaoFinanceiro?: RegistroAprovacao;
  aprovacaoFinanceiro?: RegistroAprovacao;
  timelineFluxo?: TimelineVenda[];
  bloqueadoParaEdicao?: boolean;
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

  return {
    ...venda,
    statusFluxo: dadosFluxo.statusFluxo || 'Finalizado',
    aprovacaoLancamento: dadosFluxo.aprovacaoLancamento,
    aprovacaoGestor: dadosFluxo.aprovacaoGestor,
    recusaGestor: dadosFluxo.recusaGestor,
    devolucaoFinanceiro: dadosFluxo.devolucaoFinanceiro,
    aprovacaoFinanceiro: dadosFluxo.aprovacaoFinanceiro,
    timelineFluxo: dadosFluxo.timelineFluxo || [],
    bloqueadoParaEdicao: dadosFluxo.bloqueadoParaEdicao || false
  };
};

// Obter todas as vendas com dados do fluxo
export const getVendasComFluxo = (): VendaComFluxo[] => {
  const vendas = getVendas();
  const fluxoData = getFluxoData();

  return vendas.map(venda => {
    const dadosFluxo = fluxoData[venda.id] || {};
    return {
      ...venda,
      statusFluxo: dadosFluxo.statusFluxo || 'Finalizado',
      aprovacaoLancamento: dadosFluxo.aprovacaoLancamento,
      aprovacaoGestor: dadosFluxo.aprovacaoGestor,
      recusaGestor: dadosFluxo.recusaGestor,
      devolucaoFinanceiro: dadosFluxo.devolucaoFinanceiro,
      aprovacaoFinanceiro: dadosFluxo.aprovacaoFinanceiro,
      timelineFluxo: dadosFluxo.timelineFluxo || [],
      bloqueadoParaEdicao: dadosFluxo.bloqueadoParaEdicao || false
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
  vendedorNome: string
): VendaComFluxo | null => {
  const venda = getVendaById(vendaId);
  if (!venda) return null;

  const fluxoData = getFluxoData();
  
  const timelineInicial: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'criacao',
    usuarioId: vendedorId,
    usuarioNome: vendedorNome,
    descricao: `Venda criada por ${vendedorNome}. Aguardando conferência do lançador.`
  };

  fluxoData[vendaId] = {
    statusFluxo: 'Aguardando Conferência',
    timelineFluxo: [timelineInicial],
    bloqueadoParaEdicao: false
  };

  saveFluxoData(fluxoData);
  return getVendaComFluxo(vendaId);
};

// Aprovar lançamento (Lançador -> Gestor)
export const aprovarLancamento = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  const dadosFluxo = fluxoData[vendaId];
  
  if (!dadosFluxo || dadosFluxo.statusFluxo !== 'Aguardando Conferência' && dadosFluxo.statusFluxo !== 'Recusada - Gestor') {
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

// Aprovar (Gestor -> Financeiro)
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

  const novaTimeline: TimelineVenda = {
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'aprovacao_gestor',
    usuarioId,
    usuarioNome,
    descricao: `Aprovado pelo gestor ${usuarioNome}. Enviado para conferência financeira.`
  };

  fluxoData[vendaId] = {
    ...dadosFluxo,
    statusFluxo: 'Conferência Financeiro',
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

// Finalizar (Financeiro)
export const finalizarVenda = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string
): VendaComFluxo | null => {
  const fluxoData = getFluxoData();
  const dadosFluxo = fluxoData[vendaId];
  
  if (!dadosFluxo || dadosFluxo.statusFluxo !== 'Conferência Financeiro') {
    return null;
  }

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

  saveFluxoData(fluxoData);
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
    case 'Conferência Gestor':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    case 'Recusada - Gestor':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    case 'Conferência Financeiro':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    case 'Devolvido pelo Financeiro':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'Finalizado':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    case 'Cancelada':
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
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
