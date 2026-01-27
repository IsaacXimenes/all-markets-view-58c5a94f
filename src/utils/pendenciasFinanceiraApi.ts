// API para gerenciamento de pendências financeiras de notas de compra
import { NotaCompra, TimelineEntry, getNotasCompra, getNotaById, updateNota } from './estoqueApi';
import { addNotification } from './notificationsApi';

export interface PendenciaFinanceira {
  id: string; // PEND-NC-XXXXX
  notaId: string;
  fornecedor: string;
  // Valores
  valorTotal: number;
  valorConferido: number;
  valorPendente: number;
  // Status
  statusPagamento: 'Aguardando Conferência' | 'Pago' | 'Parcial';
  statusConferencia: 'Em Conferência' | 'Conferência Completa' | 'Discrepância Detectada';
  // Aparelhos
  aparelhosTotal: number;
  aparelhosConferidos: number;
  percentualConferencia: number;
  // Datas
  dataCriacao: string;
  dataVencimento: string;
  dataConferenciaCompleta?: string;
  dataPagamento?: string;
  // SLA
  slaAlerta: boolean;
  diasDecorridos: number;
  slaStatus: 'normal' | 'aviso' | 'critico';
  // Discrepâncias
  discrepancia?: boolean;
  motivoDiscrepancia?: string;
  acaoRecomendada?: 'Cobrar Fornecedor' | 'Cobrar Estoque';
  // Timeline
  timeline: TimelineEntry[];
  // Origem
  origem: 'Normal' | 'Urgência';
}

// Armazenamento em memória das pendências
let pendenciasFinanceiras: PendenciaFinanceira[] = [];
let pendenciaCounter = 0;

// Calcular dias decorridos e status do SLA
export const calcularSLAPendencia = (dataCriacao: string): { dias: number; status: 'normal' | 'aviso' | 'critico'; alerta: boolean } => {
  const dataInicio = new Date(dataCriacao);
  const hoje = new Date();
  const diffTime = Math.abs(hoje.getTime() - dataInicio.getTime());
  const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (dias >= 5) {
    return { dias, status: 'critico', alerta: true };
  } else if (dias >= 3) {
    return { dias, status: 'aviso', alerta: true };
  }
  return { dias, status: 'normal', alerta: false };
};

// Criar pendência financeira a partir de uma nota
export const criarPendenciaFinanceira = (nota: NotaCompra): PendenciaFinanceira => {
  pendenciaCounter++;
  const id = `PEND-${nota.id}`;
  
  const aparelhosTotal = nota.produtos.filter(p => p.tipoProduto !== 'Acessório').length || nota.produtos.length;
  const aparelhosConferidos = nota.produtos.filter(p => p.statusConferencia === 'Conferido').length;
  const percentualConferencia = aparelhosTotal > 0 ? Math.round((aparelhosConferidos / aparelhosTotal) * 100) : 0;
  const sla = calcularSLAPendencia(nota.data);
  
  // Usar valores da nota se disponíveis
  const valorConferido = nota.valorConferido ?? nota.produtos
    .filter(p => p.statusConferencia === 'Conferido')
    .reduce((acc, p) => acc + p.valorTotal, 0);
  
  const valorPendente = nota.valorTotal - valorConferido;
  
  // Determinar status de conferência
  let statusConferencia: PendenciaFinanceira['statusConferencia'] = 'Em Conferência';
  if (percentualConferencia === 100) {
    statusConferencia = nota.discrepancia ? 'Discrepância Detectada' : 'Conferência Completa';
  }
  
  const novaPendencia: PendenciaFinanceira = {
    id,
    notaId: nota.id,
    fornecedor: nota.fornecedor,
    valorTotal: nota.valorTotal,
    valorConferido,
    valorPendente,
    statusPagamento: 'Aguardando Conferência',
    statusConferencia,
    aparelhosTotal,
    aparelhosConferidos,
    percentualConferencia,
    dataCriacao: nota.data,
    dataVencimento: nota.dataVencimento || calcularDataVencimento(nota.data, 30),
    slaAlerta: sla.alerta,
    diasDecorridos: sla.dias,
    slaStatus: sla.status,
    timeline: nota.timeline || [{
      id: `TL-${nota.id}-001`,
      data: new Date().toISOString(),
      tipo: 'entrada',
      titulo: 'Pendência Criada',
      descricao: `Pendência financeira criada para nota ${nota.id} do fornecedor ${nota.fornecedor}`,
      responsavel: 'Sistema'
    }],
    origem: nota.origem || 'Normal'
  };
  
  pendenciasFinanceiras.push(novaPendencia);
  
  // Notificar Financeiro
  addNotification({
    type: 'nota_pendencia',
    title: 'Nova pendência financeira',
    description: `Nota ${nota.id} de ${nota.fornecedor} aguardando conferência - ${formatCurrency(nota.valorTotal)}`,
    targetUsers: ['financeiro', 'gestor']
  });
  
  return novaPendencia;
};

// Atualizar pendência quando Estoque valida aparelhos
export const atualizarPendencia = (
  notaId: string, 
  dados: { 
    valorConferido?: number; 
    aparelhosConferidos?: number; 
    statusConferencia?: PendenciaFinanceira['statusConferencia'];
    responsavel?: string;
    aparelhoInfo?: { modelo: string; imei: string; valor: number };
  }
): PendenciaFinanceira | null => {
  const index = pendenciasFinanceiras.findIndex(p => p.notaId === notaId);
  if (index === -1) return null;
  
  const pendencia = pendenciasFinanceiras[index];
  
  if (dados.valorConferido !== undefined) {
    pendencia.valorConferido = dados.valorConferido;
    pendencia.valorPendente = pendencia.valorTotal - dados.valorConferido;
  }
  
  if (dados.aparelhosConferidos !== undefined) {
    pendencia.aparelhosConferidos = dados.aparelhosConferidos;
    pendencia.percentualConferencia = Math.round((dados.aparelhosConferidos / pendencia.aparelhosTotal) * 100);
  }
  
  if (dados.statusConferencia) {
    pendencia.statusConferencia = dados.statusConferencia;
    
    if (dados.statusConferencia === 'Conferência Completa') {
      pendencia.dataConferenciaCompleta = new Date().toISOString();
      
      // Notificar que está pronta para pagamento
      addNotification({
        type: 'conferencia_completa',
        title: 'Nota pronta para pagamento',
        description: `Nota ${notaId} com 100% dos aparelhos conferidos - ${formatCurrency(pendencia.valorTotal)}`,
        targetUsers: ['financeiro']
      });
    }
    
    if (dados.statusConferencia === 'Discrepância Detectada') {
      pendencia.discrepancia = true;
      addNotification({
        type: 'discrepancia',
        title: 'Discrepância detectada',
        description: `Nota ${notaId} apresenta discrepância de valores. Verifique imediatamente.`,
        targetUsers: ['financeiro', 'gestor']
      });
    }
  }
  
  // Atualizar SLA
  const sla = calcularSLAPendencia(pendencia.dataCriacao);
  pendencia.diasDecorridos = sla.dias;
  pendencia.slaStatus = sla.status;
  pendencia.slaAlerta = sla.alerta;
  
  // Adicionar timeline com detalhes do aparelho validado
  if (dados.responsavel) {
    const descricao = dados.aparelhoInfo 
      ? `${dados.aparelhoInfo.modelo} (IMEI: ${dados.aparelhoInfo.imei}) conferido - ${formatCurrency(dados.aparelhoInfo.valor)}. Progresso: ${pendencia.aparelhosConferidos}/${pendencia.aparelhosTotal} (${pendencia.percentualConferencia}%)`
      : `${pendencia.aparelhosConferidos}/${pendencia.aparelhosTotal} aparelhos conferidos (${pendencia.percentualConferencia}%)`;
    
    const newTimelineEntry: TimelineEntry = {
      id: `TL-${notaId}-${String(pendencia.timeline.length + 1).padStart(3, '0')}`,
      data: new Date().toISOString(),
      tipo: 'validacao',
      titulo: 'Aparelho Validado',
      descricao,
      responsavel: dados.responsavel
    };
    pendencia.timeline.unshift(newTimelineEntry);
    
    // Notificar Financeiro sobre progresso (a cada aparelho validado)
    addNotification({
      type: 'aparelho_validado',
      title: `Progresso de conferência - ${notaId}`,
      description: `${pendencia.aparelhosConferidos}/${pendencia.aparelhosTotal} aparelhos validados (${pendencia.percentualConferencia}%)`,
      targetUsers: ['financeiro']
    });
  }
  
  pendenciasFinanceiras[index] = pendencia;
  return pendencia;
};

// Finalizar pagamento de uma nota
export const finalizarPagamentoPendencia = (
  notaId: string, 
  pagamento: {
    formaPagamento: string;
    parcelas: number;
    contaPagamento: string;
    comprovante?: string;
    dataVencimento?: string;
    observacoes?: string;
    responsavel: string;
  }
): PendenciaFinanceira | null => {
  const index = pendenciasFinanceiras.findIndex(p => p.notaId === notaId);
  if (index === -1) return null;
  
  const pendencia = pendenciasFinanceiras[index];
  
  pendencia.statusPagamento = 'Pago';
  pendencia.dataPagamento = new Date().toISOString();
  
  // Adicionar timeline de pagamento
  const newTimelineEntry: TimelineEntry = {
    id: `TL-${notaId}-${String(pendencia.timeline.length + 1).padStart(3, '0')}`,
    data: new Date().toISOString(),
    tipo: 'pagamento',
    titulo: 'Pagamento Confirmado',
    descricao: `Pagamento de ${formatCurrency(pendencia.valorTotal)} realizado via ${pagamento.formaPagamento}. ${pagamento.observacoes || ''}`,
    responsavel: pagamento.responsavel,
    valor: pendencia.valorTotal,
    comprovante: pagamento.comprovante
  };
  pendencia.timeline.unshift(newTimelineEntry);
  
  pendenciasFinanceiras[index] = pendencia;
  
  // Atualizar nota original
  const nota = getNotaById(notaId);
  if (nota) {
    updateNota(notaId, {
      status: 'Concluído',
      statusPagamento: 'Pago',
      pagamento: {
        formaPagamento: pagamento.formaPagamento,
        parcelas: pagamento.parcelas,
        valorParcela: pendencia.valorTotal / pagamento.parcelas,
        dataVencimento: pagamento.dataVencimento || new Date().toISOString().split('T')[0],
        comprovante: pagamento.comprovante,
        contaPagamento: pagamento.contaPagamento
      },
      responsavelFinanceiro: pagamento.responsavel
    });
  }
  
  // Notificar Estoque
  addNotification({
    type: 'pagamento_confirmado',
    title: 'Pagamento confirmado',
    description: `Nota ${notaId} paga com sucesso - ${formatCurrency(pendencia.valorTotal)}`,
    targetUsers: ['estoque']
  });
  
  return pendencia;
};

// Obter todas as pendências
export const getPendencias = (): PendenciaFinanceira[] => {
  // Atualizar SLA de todas as pendências
  return pendenciasFinanceiras.map(p => {
    const sla = calcularSLAPendencia(p.dataCriacao);
    return { ...p, diasDecorridos: sla.dias, slaStatus: sla.status, slaAlerta: sla.alerta };
  });
};

// Obter pendência por nota
export const getPendenciaPorNota = (notaId: string): PendenciaFinanceira | null => {
  const pendencia = pendenciasFinanceiras.find(p => p.notaId === notaId);
  if (!pendencia) return null;
  
  const sla = calcularSLAPendencia(pendencia.dataCriacao);
  return { ...pendencia, diasDecorridos: sla.dias, slaStatus: sla.status, slaAlerta: sla.alerta };
};

// Verificar SLA de todas as pendências e gerar alertas
export const verificarSLAPendencias = (): void => {
  pendenciasFinanceiras.forEach(pendencia => {
    if (pendencia.statusPagamento === 'Pago') return;
    
    const sla = calcularSLAPendencia(pendencia.dataCriacao);
    
    if (sla.status === 'critico' && !pendencia.slaAlerta) {
      addNotification({
        type: 'sla_critico',
        title: 'SLA Crítico!',
        description: `Nota ${pendencia.notaId} está há ${sla.dias} dias sem pagamento`,
        targetUsers: ['financeiro', 'gestor']
      });
      
      // Adicionar timeline de alerta
      const newTimelineEntry: TimelineEntry = {
        id: `TL-${pendencia.notaId}-${String(pendencia.timeline.length + 1).padStart(3, '0')}`,
        data: new Date().toISOString(),
        tipo: 'alerta_sla',
        titulo: 'Alerta SLA Crítico',
        descricao: `${sla.dias} dias desde a criação da pendência`,
        responsavel: 'Sistema'
      };
      pendencia.timeline.unshift(newTimelineEntry);
    }
  });
};

// Inicializar pendências a partir das notas existentes
export const inicializarPendenciasDeNotas = (): void => {
  const notas = getNotasCompra();
  
  notas.forEach(nota => {
    // Criar pendência apenas para notas pendentes ou enviadas para financeiro
    const storedStatus = localStorage.getItem(`nota_status_${nota.id}`);
    if (nota.status === 'Pendente' || storedStatus === 'Enviado para Financeiro') {
      // Verificar se já existe pendência
      if (!pendenciasFinanceiras.find(p => p.notaId === nota.id)) {
        criarPendenciaFinanceira(nota);
      }
    }
  });
};

// Helpers
const calcularDataVencimento = (dataBase: string, dias: number): string => {
  const data = new Date(dataBase);
  data.setDate(data.getDate() + dias);
  return data.toISOString().split('T')[0];
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Inicializar ao carregar o módulo
inicializarPendenciasDeNotas();
