// API para Garantia Extendida - Tratativas Comerciais e Adesões
import { format, differenceInDays, addMonths } from 'date-fns';
import { addNotification } from './notificationsApi';

export type ResultadoContato = 'Interessado' | 'Sem interesse' | 'Sem resposta' | 'Agendou retorno';
export type TipoTratativaComercial = 'Contato Realizado' | 'Adesão Silver' | 'Adesão Gold';
export type StatusAdesao = 'Pendente Financeiro' | 'Concluída' | 'Cancelada';

export interface TratativaComercial {
  id: string;
  garantiaId: string;
  vendaId: string;
  tipo: TipoTratativaComercial;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  descricao?: string;
  resultadoContato?: ResultadoContato;
  // Dados de adesão
  planoId?: string;
  planoNome?: string;
  valorPlano?: number;
  mesesPlano?: number;
  novaDataFimGarantia?: string;
  statusAdesao?: StatusAdesao;
  // Pagamento
  pagamento?: {
    meioPagamento: string;
    maquinaId?: string;
    maquinaNome?: string;
    contaDestinoId?: string;
    contaDestinoNome?: string;
    valor: number;
    parcelas?: number;
  };
  // Confirmação dupla
  confirmacao1?: {
    responsavelId: string;
    responsavelNome: string;
    dataHora: string;
  };
  confirmacao2?: {
    responsavelId: string;
    responsavelNome: string;
    dataHora: string;
    observacao?: string;
  };
  vendaConferenciaId?: string;
}

// Dados mockados
let tratativasComerciais: TratativaComercial[] = [
  // Contatos realizados
  {
    id: 'TC-0001',
    garantiaId: 'GAR-0003',
    vendaId: 'VEN-2025-0003',
    tipo: 'Contato Realizado',
    dataHora: '2026-01-02T10:00:00',
    usuarioId: 'COL-001',
    usuarioNome: 'Lucas Mendes',
    descricao: 'Entramos em contato para informar sobre a garantia expirando em breve.',
    resultadoContato: 'Interessado'
  },
  {
    id: 'TC-0002',
    garantiaId: 'GAR-0004',
    vendaId: 'VEN-2025-0004',
    tipo: 'Contato Realizado',
    dataHora: '2026-01-03T14:30:00',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima',
    descricao: 'Cliente não atendeu a ligação.',
    resultadoContato: 'Sem resposta'
  },
  {
    id: 'TC-0003',
    garantiaId: 'GAR-0008',
    vendaId: 'VEN-2024-0070',
    tipo: 'Contato Realizado',
    dataHora: '2026-01-04T09:15:00',
    usuarioId: 'COL-003',
    usuarioNome: 'Roberto Alves',
    descricao: 'Cliente informou que não tem interesse em renovar no momento.',
    resultadoContato: 'Sem interesse'
  },
  // Adesão Silver pendente
  {
    id: 'TC-0004',
    garantiaId: 'GAR-0003',
    vendaId: 'VEN-2025-0003',
    tipo: 'Adesão Silver',
    dataHora: '2026-01-05T11:00:00',
    usuarioId: 'COL-001',
    usuarioNome: 'Lucas Mendes',
    descricao: 'Cliente decidiu aderir ao plano Silver.',
    planoId: 'PLAN-001',
    planoNome: 'Silver',
    valorPlano: 219.90,
    mesesPlano: 6,
    novaDataFimGarantia: format(addMonths(new Date(), 6), 'yyyy-MM-dd'),
    statusAdesao: 'Pendente Financeiro',
    pagamento: {
      meioPagamento: 'Pix',
      contaDestinoId: 'CTA-002', // Bradesco Thiago Eduardo - Matriz
      contaDestinoNome: 'Bradesco Thiago Eduardo',
      valor: 219.90
    },
    confirmacao1: {
      responsavelId: 'COL-001',
      responsavelNome: 'Lucas Mendes',
      dataHora: '2026-01-05T11:05:00'
    },
    confirmacao2: {
      responsavelId: 'COL-001',
      responsavelNome: 'Lucas Mendes',
      dataHora: '2026-01-05T11:06:00',
      observacao: 'Cliente realizou pagamento via Pix'
    },
    vendaConferenciaId: 'CONF-EXT-001'
  },
  // Adesão Gold concluída
  {
    id: 'TC-0005',
    garantiaId: 'GAR-0008',
    vendaId: 'VEN-2024-0070',
    tipo: 'Adesão Gold',
    dataHora: '2026-01-04T15:00:00',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima',
    descricao: 'Cliente optou pelo plano Gold após ligação comercial.',
    planoId: 'PLAN-005',
    planoNome: 'Gold',
    valorPlano: 349.90,
    mesesPlano: 12,
    novaDataFimGarantia: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    statusAdesao: 'Concluída',
    pagamento: {
      meioPagamento: 'Cartão Crédito',
      maquinaId: 'MAQ-001',
      maquinaNome: 'Stone Matriz',
      contaDestinoId: 'CTA-002', // Bradesco Thiago Eduardo - Matriz
      contaDestinoNome: 'Bradesco Thiago Eduardo',
      valor: 349.90,
      parcelas: 3
    },
    confirmacao1: {
      responsavelId: 'COL-002',
      responsavelNome: 'Fernanda Lima',
      dataHora: '2026-01-04T15:10:00'
    },
    confirmacao2: {
      responsavelId: 'COL-002',
      responsavelNome: 'Fernanda Lima',
      dataHora: '2026-01-04T15:12:00',
      observacao: 'Pagamento parcelado em 3x'
    },
    vendaConferenciaId: 'CONF-EXT-002'
  }
];

let tratativaCounter = tratativasComerciais.length;

// ==================== FUNÇÕES CRUD ====================

export const getTratativasComerciais = (): TratativaComercial[] => {
  return [...tratativasComerciais];
};

export const getTratativasComerciasByGarantiaId = (garantiaId: string): TratativaComercial[] => {
  return tratativasComerciais.filter(t => t.garantiaId === garantiaId);
};

export const addTratativaComercial = (tratativa: Omit<TratativaComercial, 'id'>): TratativaComercial => {
  tratativaCounter++;
  const novaTratativa: TratativaComercial = {
    ...tratativa,
    id: `TC-${String(tratativaCounter).padStart(4, '0')}`
  };
  tratativasComerciais.push(novaTratativa);
  return novaTratativa;
};

export const updateTratativaComercial = (id: string, updates: Partial<TratativaComercial>): void => {
  const index = tratativasComerciais.findIndex(t => t.id === id);
  if (index !== -1) {
    tratativasComerciais[index] = { ...tratativasComerciais[index], ...updates };
  }
};

// ==================== UTILITÁRIOS ====================

export const calcularTempoRestante = (dataFim: string): { texto: string; dias: number; status: 'normal' | 'atencao' | 'urgente' | 'expirada' } => {
  const hoje = new Date();
  const fim = new Date(dataFim);
  const diffDias = differenceInDays(fim, hoje);
  
  if (diffDias < 0) {
    return { texto: 'Expirada', dias: diffDias, status: 'expirada' };
  }
  
  const meses = Math.floor(diffDias / 30);
  const dias = diffDias % 30;
  
  let texto = '';
  if (meses > 0) {
    texto = `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    if (dias > 0) {
      texto += ` e ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
    }
  } else {
    texto = `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }
  
  let status: 'normal' | 'atencao' | 'urgente' | 'expirada' = 'normal';
  if (diffDias <= 7) {
    status = 'urgente';
  } else if (diffDias <= 30) {
    status = 'atencao';
  }
  
  return { texto, dias: diffDias, status };
};

export const podeRenovar = (dataFimGarantia: string): boolean => {
  const hoje = new Date();
  const fim = new Date(dataFimGarantia);
  return fim < hoje; // Somente pode renovar após expirar
};

export const getAdesoesPendentes = (): TratativaComercial[] => {
  return tratativasComerciais.filter(t => 
    (t.tipo === 'Adesão Silver' || t.tipo === 'Adesão Gold') && 
    t.statusAdesao === 'Pendente Financeiro'
  );
};

export const getAdesoesConcluidas = (): TratativaComercial[] => {
  return tratativasComerciais.filter(t => 
    (t.tipo === 'Adesão Silver' || t.tipo === 'Adesão Gold') && 
    t.statusAdesao === 'Concluída'
  );
};

// Notificar financeiro sobre nova adesão
export const notificarFinanceiroAdesao = (tratativa: TratativaComercial): void => {
  addNotification({
    type: 'garantia_extendida',
    title: `Nova adesão ${tratativa.planoNome}`,
    description: `Adesão ao plano ${tratativa.planoNome} - R$ ${tratativa.valorPlano?.toFixed(2)} aguardando conferência`,
    targetUsers: ['COL-006'] // Financeiro
  });
};

export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
