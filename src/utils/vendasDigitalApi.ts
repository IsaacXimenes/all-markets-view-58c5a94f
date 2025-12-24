// Vendas Digital API - Pré-cadastro rápido e fila de pendentes
import { addNotification } from './notificationsApi';

export type VendaDigitalStatus = 
  | 'Pendente' 
  | 'Ajuste Solicitado' 
  | 'Em Finalização' 
  | 'Concluída Digital';

export interface TimelineEntry {
  id: string;
  data: string;
  acao: string;
  responsavel: string;
  responsavelId: string;
  detalhes?: string;
}

export interface VendaDigital {
  id: string;
  numero: number;
  dataHora: string;
  responsavelVendaId: string;
  responsavelVendaNome: string;
  clienteNome: string; // Nome livre no pré-cadastro
  clienteId?: string; // Preenchido na finalização
  valorTotal: number;
  status: VendaDigitalStatus;
  timeline: TimelineEntry[];
  finalizadorId?: string;
  finalizadorNome?: string;
  dataFinalizacao?: string;
  motivoAjuste?: string;
  // Dados completos (preenchidos na finalização)
  dadosCompletos?: {
    itens: any[];
    tradeIns: any[];
    pagamentos: any[];
    observacoes: string;
    origemVenda: string;
    localRetirada: string;
  };
}

// Mock de colaboradores com permissão Digital
export const colaboradoresDigital = [
  { id: 'COL-007', nome: 'Rafael Digital', cargo: 'CARGO-009', permissao: 'Digital' },
  { id: 'COL-008', nome: 'Camila Online', cargo: 'CARGO-009', permissao: 'Digital' },
  { id: 'COL-009', nome: 'Bruno Web', cargo: 'CARGO-009', permissao: 'Digital' },
];

export const colaboradoresFinalizador = [
  { id: 'COL-010', nome: 'Lucas Finalizador', cargo: 'CARGO-010', permissao: 'Finalizador Digital' },
  { id: 'COL-001', nome: 'Lucas Mendes', cargo: 'CARGO-001', permissao: 'Finalizador Digital' },
];

// Calcula dias desde registro
export const calcularSLA = (dataHora: string): number => {
  const data = new Date(dataHora);
  const hoje = new Date();
  const diffTime = Math.abs(hoje.getTime() - data.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Mock data - 5 pré-cadastros (3 pendentes, 1 ajuste, 1 finalizada)
let vendasDigitais: VendaDigital[] = [
  {
    id: 'VEN-DIG-2025-0001',
    numero: 1,
    dataHora: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(), // hoje
    responsavelVendaId: 'COL-007',
    responsavelVendaNome: 'Rafael Digital',
    clienteNome: 'Carlos Mendes',
    valorTotal: 8500.00,
    status: 'Pendente',
    timeline: [
      {
        id: 'TL-001',
        data: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(),
        acao: 'Pré-cadastro enviado',
        responsavel: 'Rafael Digital',
        responsavelId: 'COL-007'
      }
    ]
  },
  {
    id: 'VEN-DIG-2025-0002',
    numero: 2,
    dataHora: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia (amarelo)
    responsavelVendaId: 'COL-008',
    responsavelVendaNome: 'Camila Online',
    clienteNome: 'Patricia Lima',
    valorTotal: 12300.00,
    status: 'Pendente',
    timeline: [
      {
        id: 'TL-002',
        data: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        acao: 'Pré-cadastro enviado',
        responsavel: 'Camila Online',
        responsavelId: 'COL-008'
      }
    ]
  },
  {
    id: 'VEN-DIG-2025-0003',
    numero: 3,
    dataHora: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias (vermelho)
    responsavelVendaId: 'COL-009',
    responsavelVendaNome: 'Bruno Web',
    clienteNome: 'Fernando Souza',
    valorTotal: 5200.00,
    status: 'Pendente',
    timeline: [
      {
        id: 'TL-003',
        data: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        acao: 'Pré-cadastro enviado',
        responsavel: 'Bruno Web',
        responsavelId: 'COL-009'
      }
    ]
  },
  {
    id: 'VEN-DIG-2025-0004',
    numero: 4,
    dataHora: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias
    responsavelVendaId: 'COL-007',
    responsavelVendaNome: 'Rafael Digital',
    clienteNome: 'Amanda Torres',
    valorTotal: 9800.00,
    status: 'Ajuste Solicitado',
    motivoAjuste: 'Valor do produto incorreto. Favor verificar preço atualizado no sistema.',
    timeline: [
      {
        id: 'TL-004',
        data: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        acao: 'Pré-cadastro enviado',
        responsavel: 'Rafael Digital',
        responsavelId: 'COL-007'
      },
      {
        id: 'TL-005',
        data: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        acao: 'Ajuste solicitado',
        responsavel: 'Lucas Finalizador',
        responsavelId: 'COL-010',
        detalhes: 'Valor do produto incorreto. Favor verificar preço atualizado no sistema.'
      }
    ]
  },
  {
    id: 'VEN-DIG-2025-0005',
    numero: 5,
    dataHora: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    responsavelVendaId: 'COL-008',
    responsavelVendaNome: 'Camila Online',
    clienteNome: 'Roberto Almeida',
    clienteId: 'CLI-001',
    valorTotal: 14500.00,
    status: 'Concluída Digital',
    finalizadorId: 'COL-010',
    finalizadorNome: 'Lucas Finalizador',
    dataFinalizacao: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      {
        id: 'TL-006',
        data: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        acao: 'Pré-cadastro enviado',
        responsavel: 'Camila Online',
        responsavelId: 'COL-008'
      },
      {
        id: 'TL-007',
        data: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        acao: 'Venda finalizada',
        responsavel: 'Lucas Finalizador',
        responsavelId: 'COL-010'
      }
    ],
    dadosCompletos: {
      itens: [],
      tradeIns: [],
      pagamentos: [],
      observacoes: 'Venda digital finalizada com sucesso',
      origemVenda: 'Online',
      localRetirada: 'LOJA-001'
    }
  }
];

let vendaDigitalCounter = 5;
let timelineCounter = 10;

// Funções de API
export const getVendasDigitais = (): VendaDigital[] => {
  return [...vendasDigitais];
};

export const getVendaDigitalById = (id: string): VendaDigital | null => {
  return vendasDigitais.find(v => v.id === id) || null;
};

export const getVendasDigitaisPendentes = (): VendaDigital[] => {
  return vendasDigitais.filter(v => 
    v.status === 'Pendente' || v.status === 'Ajuste Solicitado' || v.status === 'Em Finalização'
  );
};

export const criarPreCadastro = (
  responsavelVendaId: string,
  responsavelVendaNome: string,
  clienteNome: string,
  valorTotal: number
): VendaDigital => {
  vendaDigitalCounter++;
  const year = new Date().getFullYear();
  const now = new Date().toISOString();
  
  const novaVenda: VendaDigital = {
    id: `VEN-DIG-${year}-${String(vendaDigitalCounter).padStart(4, '0')}`,
    numero: vendaDigitalCounter,
    dataHora: now,
    responsavelVendaId,
    responsavelVendaNome,
    clienteNome,
    valorTotal,
    status: 'Pendente',
    timeline: [
      {
        id: `TL-${String(++timelineCounter).padStart(3, '0')}`,
        data: now,
        acao: 'Pré-cadastro enviado',
        responsavel: responsavelVendaNome,
        responsavelId: responsavelVendaId
      }
    ]
  };
  
  vendasDigitais.push(novaVenda);
  
  // Notificar finalizadores
  addNotification({
    type: 'venda_digital',
    title: 'Novo pré-cadastro digital',
    description: `${novaVenda.id} - ${clienteNome} - R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    targetUsers: colaboradoresFinalizador.map(c => c.id)
  });
  
  return novaVenda;
};

export const solicitarAjuste = (
  vendaId: string,
  finalizadorId: string,
  finalizadorNome: string,
  motivo: string
): VendaDigital | null => {
  const index = vendasDigitais.findIndex(v => v.id === vendaId);
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  
  vendasDigitais[index] = {
    ...vendasDigitais[index],
    status: 'Ajuste Solicitado',
    motivoAjuste: motivo,
    timeline: [
      ...vendasDigitais[index].timeline,
      {
        id: `TL-${String(++timelineCounter).padStart(3, '0')}`,
        data: now,
        acao: 'Ajuste solicitado',
        responsavel: finalizadorNome,
        responsavelId: finalizadorId,
        detalhes: motivo
      }
    ]
  };
  
  // Notificar vendedor digital
  addNotification({
    type: 'ajuste_venda',
    title: 'Ajuste solicitado',
    description: `Venda ${vendaId} – motivo: ${motivo.substring(0, 50)}...`,
    targetUsers: [vendasDigitais[index].responsavelVendaId]
  });
  
  return vendasDigitais[index];
};

export const finalizarVendaDigital = (
  vendaId: string,
  finalizadorId: string,
  finalizadorNome: string,
  clienteId: string,
  dadosCompletos: VendaDigital['dadosCompletos']
): VendaDigital | null => {
  const index = vendasDigitais.findIndex(v => v.id === vendaId);
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  
  vendasDigitais[index] = {
    ...vendasDigitais[index],
    status: 'Concluída Digital',
    clienteId,
    finalizadorId,
    finalizadorNome,
    dataFinalizacao: now,
    dadosCompletos,
    timeline: [
      ...vendasDigitais[index].timeline,
      {
        id: `TL-${String(++timelineCounter).padStart(3, '0')}`,
        data: now,
        acao: 'Venda finalizada',
        responsavel: finalizadorNome,
        responsavelId: finalizadorId
      }
    ]
  };
  
  // Notificar vendedor digital
  addNotification({
    type: 'venda_finalizada',
    title: 'Venda digital finalizada',
    description: `${vendaId} foi finalizada por ${finalizadorNome}`,
    targetUsers: [vendasDigitais[index].responsavelVendaId]
  });
  
  return vendasDigitais[index];
};

export const getColaboradoresDigital = () => [...colaboradoresDigital];
export const getColaboradoresFinalizador = () => [...colaboradoresFinalizador];

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const exportVendasDigitaisToCSV = (data: VendaDigital[], filename: string) => {
  if (data.length === 0) return;
  
  const csvData = data.map(v => ({
    'ID': v.id,
    'Data/Hora': new Date(v.dataHora).toLocaleString('pt-BR'),
    'Responsável Venda': v.responsavelVendaNome,
    'Cliente': v.clienteNome,
    'Valor Total': v.valorTotal,
    'Status': v.status,
    'SLA (dias)': calcularSLA(v.dataHora),
    'Finalizador': v.finalizadorNome || '-',
    'Data Finalização': v.dataFinalizacao ? new Date(v.dataFinalizacao).toLocaleString('pt-BR') : '-'
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

// Verifica se colaborador tem permissão Digital
export const temPermissaoDigital = (colaboradorId: string): boolean => {
  return colaboradoresDigital.some(c => c.id === colaboradorId);
};

// Verifica se colaborador tem permissão Finalizador
export const temPermissaoFinalizador = (colaboradorId: string): boolean => {
  return colaboradoresFinalizador.some(c => c.id === colaboradorId);
};
