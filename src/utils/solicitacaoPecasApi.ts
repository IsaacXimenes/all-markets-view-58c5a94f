// Solicitação de Peças API - Mock Data

export interface SolicitacaoPeca {
  id: string;
  osId: string;
  peca: string;
  quantidade: number;
  justificativa: string;
  modeloImei: string;
  lojaSolicitante: string;
  dataSolicitacao: string;
  status: 'Pendente' | 'Aprovada' | 'Rejeitada' | 'Enviada' | 'Recebida';
  fornecedorId?: string;
  valorPeca?: number;
  responsavelCompra?: string;
  dataRecebimento?: string;
  dataEnvio?: string;
  loteId?: string;
}

export interface LotePecas {
  id: string;
  fornecedorId: string;
  solicitacoes: string[];
  dataCriacao: string;
  status: 'Pendente' | 'Enviado' | 'Finalizado';
  valorTotal: number;
  notaId?: string;
}

export interface NotaAssistencia {
  id: string;
  loteId: string;
  fornecedor: string;
  dataCriacao: string;
  valorTotal: number;
  status: 'Pendente' | 'Concluído';
  itens: {
    peca: string;
    quantidade: number;
    valorUnitario: number;
  }[];
  responsavelFinanceiro?: string;
  formaPagamento?: string;
  contaPagamento?: string;
}

// Mock data
let solicitacoes: SolicitacaoPeca[] = [
  {
    id: 'SOL-001',
    osId: 'OS-2025-0007',
    peca: 'Display OLED iPhone 14 Pro',
    quantidade: 1,
    justificativa: 'Tela com burn-in severo, necessário troca urgente para garantia',
    modeloImei: '789012345678901',
    lojaSolicitante: 'LOJA-002',
    dataSolicitacao: '2025-01-11T10:00:00',
    status: 'Pendente'
  },
  {
    id: 'SOL-002',
    osId: 'OS-2025-0006',
    peca: 'Câmera Traseira iPhone 13',
    quantidade: 1,
    justificativa: 'Câmera com defeito de foco automático',
    modeloImei: '678901234567890',
    lojaSolicitante: 'LOJA-001',
    dataSolicitacao: '2025-01-16T09:30:00',
    status: 'Pendente'
  },
  {
    id: 'SOL-003',
    osId: 'OS-2025-0003',
    peca: 'Bateria iPhone 12',
    quantidade: 2,
    justificativa: 'Reposição de estoque para assistências futuras',
    modeloImei: '345678901234567',
    lojaSolicitante: 'LOJA-001',
    dataSolicitacao: '2025-01-13T14:00:00',
    status: 'Aprovada',
    fornecedorId: 'FORN-003',
    valorPeca: 180,
    responsavelCompra: 'COL-002',
    dataRecebimento: '2025-01-20',
    dataEnvio: '2025-01-21',
    loteId: 'LOTE-001'
  },
  {
    id: 'SOL-004',
    osId: 'OS-2025-0004',
    peca: 'Conector de Carga USB-C',
    quantidade: 3,
    justificativa: 'Peça com alta demanda, reposição de estoque',
    modeloImei: '456789012345678',
    lojaSolicitante: 'LOJA-003',
    dataSolicitacao: '2025-01-14T11:00:00',
    status: 'Aprovada',
    fornecedorId: 'FORN-003',
    valorPeca: 45,
    responsavelCompra: 'COL-002',
    dataRecebimento: '2025-01-20',
    dataEnvio: '2025-01-21',
    loteId: 'LOTE-001'
  },
  {
    id: 'SOL-005',
    osId: 'OS-2025-0001',
    peca: 'Tela LCD iPhone 11',
    quantidade: 1,
    justificativa: 'Troca de tela para serviço de garantia',
    modeloImei: '123456789012345',
    lojaSolicitante: 'LOJA-001',
    dataSolicitacao: '2025-01-10T11:00:00',
    status: 'Recebida',
    fornecedorId: 'FORN-005',
    valorPeca: 320,
    responsavelCompra: 'COL-002',
    dataRecebimento: '2025-01-15',
    dataEnvio: '2025-01-16',
    loteId: 'LOTE-002'
  }
];

let lotes: LotePecas[] = [
  {
    id: 'LOTE-001',
    fornecedorId: 'FORN-003',
    solicitacoes: ['SOL-003', 'SOL-004'],
    dataCriacao: '2025-01-15T10:00:00',
    status: 'Enviado',
    valorTotal: 495
  },
  {
    id: 'LOTE-002',
    fornecedorId: 'FORN-005',
    solicitacoes: ['SOL-005'],
    dataCriacao: '2025-01-12T14:00:00',
    status: 'Finalizado',
    valorTotal: 320,
    notaId: 'NOTA-ASS-001'
  }
];

let notasAssistencia: NotaAssistencia[] = [
  {
    id: 'NOTA-ASS-001',
    loteId: 'LOTE-002',
    fornecedor: 'FORN-005',
    dataCriacao: '2025-01-12T14:00:00',
    valorTotal: 320,
    status: 'Concluído',
    itens: [
      { peca: 'Tela LCD iPhone 11', quantidade: 1, valorUnitario: 320 }
    ],
    responsavelFinanceiro: 'Ana Costa',
    formaPagamento: 'Pix',
    contaPagamento: 'Conta Principal'
  }
];

let solicitacaoCounter = 6;
let loteCounter = 3;
let notaAssistenciaCounter = 2;

// Getters
export const getSolicitacoes = () => [...solicitacoes];
export const getSolicitacaoPendentes = () => solicitacoes.filter(s => s.status === 'Pendente');
export const getSolicitacoesByOS = (osId: string) => solicitacoes.filter(s => s.osId === osId);
export const getLotes = () => [...lotes];
export const getLotesPendentes = () => lotes.filter(l => l.status === 'Pendente');
export const getNotasAssistencia = () => [...notasAssistencia];
export const getNotasAssistenciaPendentes = () => notasAssistencia.filter(n => n.status === 'Pendente');

// Actions
export const addSolicitacao = (data: Omit<SolicitacaoPeca, 'id' | 'dataSolicitacao' | 'status'>): SolicitacaoPeca => {
  const novaSolicitacao: SolicitacaoPeca = {
    ...data,
    id: `SOL-${String(solicitacaoCounter++).padStart(3, '0')}`,
    dataSolicitacao: new Date().toISOString(),
    status: 'Pendente'
  };
  solicitacoes.push(novaSolicitacao);
  return novaSolicitacao;
};

export const aprovarSolicitacao = (id: string, dados: {
  fornecedorId: string;
  valorPeca: number;
  responsavelCompra: string;
  dataRecebimento: string;
  dataEnvio: string;
}): SolicitacaoPeca | null => {
  const index = solicitacoes.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  solicitacoes[index] = {
    ...solicitacoes[index],
    ...dados,
    status: 'Aprovada'
  };
  return solicitacoes[index];
};

export const rejeitarSolicitacao = (id: string): SolicitacaoPeca | null => {
  const index = solicitacoes.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  solicitacoes[index] = {
    ...solicitacoes[index],
    status: 'Rejeitada'
  };
  return solicitacoes[index];
};

export const criarLote = (fornecedorId: string, solicitacaoIds: string[]): LotePecas | null => {
  const solicitacoesDoLote = solicitacoes.filter(s => 
    solicitacaoIds.includes(s.id) && 
    s.status === 'Aprovada' && 
    s.fornecedorId === fornecedorId
  );
  
  if (solicitacoesDoLote.length === 0) return null;
  
  const valorTotal = solicitacoesDoLote.reduce((acc, s) => acc + (s.valorPeca || 0) * s.quantidade, 0);
  
  const novoLote: LotePecas = {
    id: `LOTE-${String(loteCounter++).padStart(3, '0')}`,
    fornecedorId,
    solicitacoes: solicitacaoIds,
    dataCriacao: new Date().toISOString(),
    status: 'Pendente',
    valorTotal
  };
  
  // Atualizar loteId nas solicitações
  solicitacaoIds.forEach(id => {
    const idx = solicitacoes.findIndex(s => s.id === id);
    if (idx !== -1) {
      solicitacoes[idx].loteId = novoLote.id;
    }
  });
  
  lotes.push(novoLote);
  return novoLote;
};

export const enviarLote = (loteId: string): { lote: LotePecas; nota: NotaAssistencia } | null => {
  const loteIndex = lotes.findIndex(l => l.id === loteId);
  if (loteIndex === -1) return null;
  
  const lote = lotes[loteIndex];
  const solicitacoesDoLote = solicitacoes.filter(s => lote.solicitacoes.includes(s.id));
  
  // Criar nota de assistência
  const novaNota: NotaAssistencia = {
    id: `NOTA-ASS-${String(notaAssistenciaCounter++).padStart(3, '0')}`,
    loteId,
    fornecedor: lote.fornecedorId,
    dataCriacao: new Date().toISOString(),
    valorTotal: lote.valorTotal,
    status: 'Pendente',
    itens: solicitacoesDoLote.map(s => ({
      peca: s.peca,
      quantidade: s.quantidade,
      valorUnitario: s.valorPeca || 0
    }))
  };
  
  // Atualizar lote
  lotes[loteIndex] = {
    ...lote,
    status: 'Enviado',
    notaId: novaNota.id
  };
  
  // Atualizar status das solicitações
  solicitacoesDoLote.forEach(s => {
    const idx = solicitacoes.findIndex(sol => sol.id === s.id);
    if (idx !== -1) {
      solicitacoes[idx].status = 'Enviada';
    }
  });
  
  notasAssistencia.push(novaNota);
  return { lote: lotes[loteIndex], nota: novaNota };
};

export const finalizarNotaAssistencia = (notaId: string, dados: {
  responsavelFinanceiro: string;
  formaPagamento: string;
  contaPagamento: string;
}): NotaAssistencia | null => {
  const notaIndex = notasAssistencia.findIndex(n => n.id === notaId);
  if (notaIndex === -1) return null;
  
  const nota = notasAssistencia[notaIndex];
  notasAssistencia[notaIndex] = {
    ...nota,
    ...dados,
    status: 'Concluído'
  };
  
  // Atualizar lote
  const loteIndex = lotes.findIndex(l => l.notaId === notaId);
  if (loteIndex !== -1) {
    lotes[loteIndex].status = 'Finalizado';
    
    // Atualizar solicitações para "Recebida"
    lotes[loteIndex].solicitacoes.forEach(solId => {
      const idx = solicitacoes.findIndex(s => s.id === solId);
      if (idx !== -1) {
        solicitacoes[idx].status = 'Recebida';
      }
    });
  }
  
  return notasAssistencia[notaIndex];
};

export const calcularSLASolicitacao = (dataSolicitacao: string): number => {
  const data = new Date(dataSolicitacao);
  const hoje = new Date();
  const diffTime = Math.abs(hoje.getTime() - data.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};
