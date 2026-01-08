// Solicitação de Peças API - Mock Data
import { getOrdemServicoById, updateOrdemServico } from './assistenciaApi';
export interface SolicitacaoPeca {
  id: string;
  osId: string;
  peca: string;
  quantidade: number;
  justificativa: string;
  modeloImei: string;
  lojaSolicitante: string;
  dataSolicitacao: string;
  status: 'Pendente' | 'Aprovada' | 'Rejeitada' | 'Enviada' | 'Recebida' | 'Aguardando Aprovação' | 'Pagamento - Financeiro' | 'Pagamento Finalizado' | 'Aguardando Chegada' | 'Em Estoque';
  fornecedorId?: string;
  valorPeca?: number;
  responsavelCompra?: string;
  dataRecebimento?: string;
  dataEnvio?: string;
  loteId?: string;
  motivoRejeicao?: string;
  contaOrigemPagamento?: string;
  dataPagamento?: string;
}

export interface LoteTimeline {
  data: string;
  tipo: 'criacao' | 'edicao' | 'envio';
  descricao: string;
  responsavel: string;
}

export interface LotePecas {
  id: string;
  fornecedorId: string;
  solicitacoes: string[];
  dataCriacao: string;
  status: 'Pendente' | 'Enviado' | 'Finalizado';
  valorTotal: number;
  notaId?: string;
  timeline?: LoteTimeline[];
}

export interface NotaAssistencia {
  id: string;
  loteId: string;
  fornecedor: string;
  lojaSolicitante: string;
  osId?: string;
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
  dataConferencia?: string;
}

// Mock data
let solicitacoes: SolicitacaoPeca[] = [
  // Solicitação vinculada à OS-2025-0020 (exemplo de fluxo completo)
  {
    id: 'SOL-020',
    osId: 'OS-2025-0020',
    peca: 'Bateria iPhone 13 Pro',
    quantidade: 1,
    justificativa: 'Bateria com saúde em 65%, cliente relatou desligamentos',
    modeloImei: '999888777666001',
    lojaSolicitante: 'LOJA-001',
    dataSolicitacao: '2025-01-18T10:00:00',
    status: 'Pendente'
  },
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
    valorTotal: 495,
    timeline: [
      { data: '2025-01-15T10:00:00', tipo: 'criacao', descricao: 'Lote criado', responsavel: 'Maria Santos' },
      { data: '2025-01-15T14:30:00', tipo: 'envio', descricao: 'Lote enviado ao fornecedor', responsavel: 'Maria Santos' }
    ]
  },
  {
    id: 'LOTE-002',
    fornecedorId: 'FORN-005',
    solicitacoes: ['SOL-005'],
    dataCriacao: '2025-01-12T14:00:00',
    status: 'Finalizado',
    valorTotal: 320,
    notaId: 'NOTA-ASS-001',
    timeline: [
      { data: '2025-01-12T14:00:00', tipo: 'criacao', descricao: 'Lote criado', responsavel: 'João Lima' },
      { data: '2025-01-13T09:00:00', tipo: 'envio', descricao: 'Lote enviado ao fornecedor', responsavel: 'João Lima' }
    ]
  }
];

let notasAssistencia: NotaAssistencia[] = [
  // Notas Pendentes
  {
    id: 'NOTA-ASS-002',
    loteId: 'LOTE-003',
    fornecedor: 'FORN-003',
    lojaSolicitante: 'Loja Centro',
    osId: 'OS-2025-0020',
    dataCriacao: '2025-01-18T10:00:00',
    valorTotal: 450,
    status: 'Pendente',
    itens: [
      { peca: 'Bateria iPhone 13 Pro', quantidade: 1, valorUnitario: 280 },
      { peca: 'Película de vidro', quantidade: 2, valorUnitario: 85 }
    ]
  },
  {
    id: 'NOTA-ASS-003',
    loteId: 'LOTE-004',
    fornecedor: 'FORN-005',
    lojaSolicitante: 'Loja Shopping',
    osId: 'OS-2025-0018',
    dataCriacao: '2025-01-17T14:30:00',
    valorTotal: 890,
    status: 'Pendente',
    itens: [
      { peca: 'Tela LCD iPhone 14', quantidade: 1, valorUnitario: 750 },
      { peca: 'Cola B7000', quantidade: 2, valorUnitario: 35 },
      { peca: 'Ferramentas Troca Tela', quantidade: 1, valorUnitario: 70 }
    ]
  },
  {
    id: 'NOTA-ASS-004',
    loteId: 'LOTE-005',
    fornecedor: 'FORN-001',
    lojaSolicitante: 'Loja Norte',
    osId: 'OS-2025-0015',
    dataCriacao: '2025-01-16T09:00:00',
    valorTotal: 1250,
    status: 'Pendente',
    itens: [
      { peca: 'Módulo Câmera iPhone 15 Pro', quantidade: 1, valorUnitario: 1100 },
      { peca: 'Flex Power', quantidade: 1, valorUnitario: 150 }
    ]
  },
  {
    id: 'NOTA-ASS-005',
    loteId: 'LOTE-006',
    fornecedor: 'FORN-002',
    lojaSolicitante: 'Loja Sul',
    osId: 'OS-2025-0012',
    dataCriacao: '2025-01-15T11:00:00',
    valorTotal: 320,
    status: 'Pendente',
    itens: [
      { peca: 'Conector de Carga iPhone 12', quantidade: 2, valorUnitario: 120 },
      { peca: 'Alto-falante auricular', quantidade: 1, valorUnitario: 80 }
    ]
  },
  {
    id: 'NOTA-ASS-006',
    loteId: 'LOTE-007',
    fornecedor: 'FORN-003',
    lojaSolicitante: 'Loja Oeste',
    osId: 'OS-2025-0010',
    dataCriacao: '2025-01-14T15:00:00',
    valorTotal: 580,
    status: 'Pendente',
    itens: [
      { peca: 'Bateria iPhone 14 Pro Max', quantidade: 1, valorUnitario: 380 },
      { peca: 'Adesivo bateria', quantidade: 2, valorUnitario: 25 },
      { peca: 'Parafusos Pentalobe', quantidade: 1, valorUnitario: 150 }
    ]
  },
  // Notas Finalizadas/Conferidas
  {
    id: 'NOTA-ASS-001',
    loteId: 'LOTE-002',
    fornecedor: 'FORN-005',
    lojaSolicitante: 'Loja Centro',
    osId: 'OS-2025-0005',
    dataCriacao: '2025-01-12T14:00:00',
    valorTotal: 320,
    status: 'Concluído',
    itens: [
      { peca: 'Tela LCD iPhone 11', quantidade: 1, valorUnitario: 320 }
    ],
    responsavelFinanceiro: 'Fernanda Lima',
    formaPagamento: 'Pix',
    contaPagamento: 'Conta Bancária Principal',
    dataConferencia: '2025-01-13'
  },
  {
    id: 'NOTA-ASS-007',
    loteId: 'LOTE-008',
    fornecedor: 'FORN-001',
    lojaSolicitante: 'Loja Shopping',
    osId: 'OS-2025-0003',
    dataCriacao: '2025-01-08T10:00:00',
    valorTotal: 420,
    status: 'Concluído',
    itens: [
      { peca: 'Bateria iPhone 11', quantidade: 2, valorUnitario: 180 },
      { peca: 'Adesivo bateria', quantidade: 2, valorUnitario: 30 }
    ],
    responsavelFinanceiro: 'Lucas Mendes',
    formaPagamento: 'Transferência Bancária',
    contaPagamento: 'Conta Digital Administrativo',
    dataConferencia: '2025-01-09'
  },
  {
    id: 'NOTA-ASS-008',
    loteId: 'LOTE-009',
    fornecedor: 'FORN-002',
    lojaSolicitante: 'Loja Norte',
    osId: 'OS-2025-0001',
    dataCriacao: '2025-01-05T09:00:00',
    valorTotal: 780,
    status: 'Concluído',
    itens: [
      { peca: 'Módulo câmera frontal iPhone 14', quantidade: 1, valorUnitario: 450 },
      { peca: 'Face ID Flex', quantidade: 1, valorUnitario: 330 }
    ],
    responsavelFinanceiro: 'Fernanda Lima',
    formaPagamento: 'Boleto',
    contaPagamento: 'Conta Bancária Principal',
    dataConferencia: '2025-01-07'
  }
];

let solicitacaoCounter = 21;
let loteCounter = 10;
let notaAssistenciaCounter = 9;

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

  // Atualizar status da OS correspondente para "Em Análise"
  const osId = solicitacoes[index].osId;
  const os = getOrdemServicoById(osId);
  if (os) {
    updateOrdemServico(osId, {
      status: 'Em Análise',
      timeline: [...os.timeline, {
        data: new Date().toISOString(),
        tipo: 'peca',
        descricao: `Solicitação ${id} aprovada pela gestora da matriz`,
        responsavel: dados.responsavelCompra
      }]
    });
  }

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
    valorTotal,
    timeline: [
      {
        data: new Date().toISOString(),
        tipo: 'criacao',
        descricao: 'Lote criado',
        responsavel: 'Usuário Sistema'
      }
    ]
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

export const editarLote = (loteId: string, dados: { valorTotal?: number; solicitacoes?: string[] }, responsavel: string): LotePecas | null => {
  const loteIndex = lotes.findIndex(l => l.id === loteId);
  if (loteIndex === -1 || lotes[loteIndex].status !== 'Pendente') return null;
  
  const lote = lotes[loteIndex];
  const alteracoes: string[] = [];
  
  if (dados.valorTotal !== undefined && dados.valorTotal !== lote.valorTotal) {
    alteracoes.push(`Valor alterado de R$ ${lote.valorTotal.toFixed(2)} para R$ ${dados.valorTotal.toFixed(2)}`);
  }
  if (dados.solicitacoes && dados.solicitacoes.length !== lote.solicitacoes.length) {
    alteracoes.push(`Solicitações alteradas de ${lote.solicitacoes.length} para ${dados.solicitacoes.length} itens`);
  }
  
  const novaTimeline: LoteTimeline = {
    data: new Date().toISOString(),
    tipo: 'edicao',
    descricao: alteracoes.join('; ') || 'Lote editado',
    responsavel
  };
  
  lotes[loteIndex] = {
    ...lote,
    ...dados,
    timeline: [...(lote.timeline || []), novaTimeline]
  };
  
  return lotes[loteIndex];
};

export const getLoteById = (loteId: string): LotePecas | null => {
  return lotes.find(l => l.id === loteId) || null;
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
    lojaSolicitante: solicitacoesDoLote[0]?.lojaSolicitante || 'Loja Centro',
    osId: solicitacoesDoLote[0]?.osId,
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
    notaId: novaNota.id,
    timeline: [...(lote.timeline || []), {
      data: new Date().toISOString(),
      tipo: 'envio',
      descricao: `Lote enviado ao fornecedor - Nota ${novaNota.id} criada`,
      responsavel: 'Usuário Sistema'
    }]
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
    status: 'Concluído',
    dataConferencia: new Date().toISOString().split('T')[0]
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
        
        // Atualizar OS correspondente para "Peça Recebida"
        const osId = solicitacoes[idx].osId;
        const os = getOrdemServicoById(osId);
        if (os) {
          updateOrdemServico(osId, {
            status: 'Peça Recebida',
            timeline: [...os.timeline, {
              data: new Date().toISOString(),
              tipo: 'peca',
              descricao: `Peça recebida via nota ${notaId} - ${solicitacoes[idx].peca}`,
              responsavel: dados.responsavelFinanceiro
            }]
          });
        }
      }
    });
  }

  // Também atualizar OS se a nota tiver osId diretamente
  if (nota.osId) {
    const os = getOrdemServicoById(nota.osId);
    if (os && os.status !== 'Peça Recebida') {
      updateOrdemServico(nota.osId, {
        status: 'Peça Recebida',
        timeline: [...os.timeline, {
          data: new Date().toISOString(),
          tipo: 'peca',
          descricao: `Peça recebida via nota ${notaId}`,
          responsavel: dados.responsavelFinanceiro
        }]
      });
    }
  }
  
  return notasAssistencia[notaIndex];
};

export const calcularSLASolicitacao = (dataSolicitacao: string): number => {
  const data = new Date(dataSolicitacao);
  const hoje = new Date();
  const diffTime = Math.abs(hoje.getTime() - data.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// formatCurrency removido - usar import { formatCurrency } from '@/utils/formatUtils'
export { formatCurrency } from '@/utils/formatUtils';
