// Solicitação de Peças API - Mock Data
import { getOrdemServicoById, updateOrdemServico } from './assistenciaApi';
import { addDespesa } from './financeApi';
import { finalizarAcerto, confirmarPagamentoPorNotaId } from './consignacaoApi';
export interface SolicitacaoPeca {
  id: string;
  osId: string;
  peca: string;
  quantidade: number;
  justificativa: string;
  modeloImei: string;
  lojaSolicitante: string;
  dataSolicitacao: string;
  status: 'Pendente' | 'Aprovada' | 'Rejeitada' | 'Enviada' | 'Recebida' | 'Aguardando Aprovação' | 'Pagamento - Financeiro' | 'Pagamento Finalizado' | 'Aguardando Chegada' | 'Em Estoque' | 'Cancelada' | 'Devolvida ao Fornecedor' | 'Retida para Estoque' | 'Recusada pelo Financeiro';
  fornecedorId?: string;
  valorPeca?: number;
  responsavelCompra?: string;
  dataRecebimento?: string;
  dataEnvio?: string;
  motivoRejeicao?: string;
  contaOrigemPagamento?: string;
  dataPagamento?: string;
  formaPagamento?: 'Pix' | 'Dinheiro';
  origemPeca?: 'Fornecedor' | 'Estoque Assistência Thiago';
  observacao?: string;
  bancoDestinatario?: string;
  chavePix?: string;
  osCancelada?: boolean;
  motivoTratamento?: string;
  tratadaPor?: string;
  origemEntrada?: 'Balcao' | 'Garantia' | 'Estoque';
}

export interface LotePagamento {
  id: string;
  fornecedorId: string;
  solicitacaoIds: string[];
  valorTotal: number;
  dataCriacao: string;
  status: 'Pendente' | 'Concluido';
  responsavelFinanceiro?: string;
  formaPagamento?: string;
  contaPagamento?: string;
  dataConferencia?: string;
}

export interface DadosPagamentoEncaminhamento {
  formaPagamento: 'Pix' | 'Dinheiro';
  contaBancaria?: string;
  nomeRecebedor?: string;
  chavePix?: string;
  observacao: string;
}

export interface NotaAssistencia {
  id: string;
  solicitacaoId: string;
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
    osVinculada?: string;
  }[];
  responsavelFinanceiro?: string;
  formaPagamento?: string;
  contaPagamento?: string;
  dataConferencia?: string;
  loteId?: string;
  solicitacaoIds?: string[];
  // Dados de pagamento informados no encaminhamento
  formaPagamentoEncaminhamento?: string;
  contaBancariaEncaminhamento?: string;
  nomeRecebedor?: string;
  chavePixEncaminhamento?: string;
  observacaoEncaminhamento?: string;
  tipoConsignacao?: boolean;
}

// Helper to resolve origemEntrada from OS
const resolveOrigemEntrada = (osId: string): 'Balcao' | 'Garantia' | 'Estoque' | undefined => {
  const os = getOrdemServicoById(osId);
  if (!os?.origemOS) return undefined;
  if (os.origemOS === 'Garantia') return 'Garantia';
  if (os.origemOS === 'Estoque') return 'Estoque';
  return 'Balcao'; // Venda, Balcão -> Balcao
};

// Mock data
let solicitacoes: SolicitacaoPeca[] = [
  {
    id: 'SOL-020',
    osId: 'OS-2025-0020',
    peca: 'Bateria iPhone 13 Pro',
    quantidade: 1,
    justificativa: 'Bateria com saúde em 65%, cliente relatou desligamentos',
    modeloImei: '999888777666001',
    lojaSolicitante: 'db894e7d',
    dataSolicitacao: '2025-01-18T10:00:00',
    status: 'Pendente',
    origemEntrada: 'Balcao'
  },
  {
    id: 'SOL-001',
    osId: 'OS-2025-0007',
    peca: 'Display OLED iPhone 14 Pro',
    quantidade: 1,
    justificativa: 'Tela com burn-in severo, necessário troca urgente para garantia',
    modeloImei: '789012345678901',
    lojaSolicitante: '3ac7e00c',
    dataSolicitacao: '2025-01-11T10:00:00',
    status: 'Pendente',
    origemEntrada: 'Garantia'
  },
  {
    id: 'SOL-002',
    osId: 'OS-2025-0006',
    peca: 'Câmera Traseira iPhone 13',
    quantidade: 1,
    justificativa: 'Câmera com defeito de foco automático',
    modeloImei: '678901234567890',
    lojaSolicitante: 'db894e7d',
    dataSolicitacao: '2025-01-16T09:30:00',
    status: 'Pendente',
    origemEntrada: 'Balcao'
  },
  {
    id: 'SOL-003',
    osId: 'OS-2025-0003',
    peca: 'Bateria iPhone 12',
    quantidade: 2,
    justificativa: 'Reposição de estoque para assistências futuras',
    modeloImei: '345678901234567',
    lojaSolicitante: 'db894e7d',
    dataSolicitacao: '2025-01-13T14:00:00',
    status: 'Aprovada',
    fornecedorId: 'FORN-003',
    valorPeca: 180,
    responsavelCompra: 'COL-002',
    dataRecebimento: '2025-01-20',
    dataEnvio: '2025-01-21',
    origemEntrada: 'Estoque'
  },
  {
    id: 'SOL-004',
    osId: 'OS-2025-0004',
    peca: 'Conector de Carga USB-C',
    quantidade: 3,
    justificativa: 'Peça com alta demanda, reposição de estoque',
    modeloImei: '456789012345678',
    lojaSolicitante: '5b9446d5',
    dataSolicitacao: '2025-01-14T11:00:00',
    status: 'Aprovada',
    fornecedorId: 'FORN-003',
    valorPeca: 45,
    responsavelCompra: 'COL-002',
    dataRecebimento: '2025-01-20',
    dataEnvio: '2025-01-21',
    origemEntrada: 'Balcao'
  },
  {
    id: 'SOL-005',
    osId: 'OS-2025-0001',
    peca: 'Tela LCD iPhone 11',
    quantidade: 1,
    justificativa: 'Troca de tela para serviço de garantia',
    modeloImei: '123456789012345',
    lojaSolicitante: 'db894e7d',
    dataSolicitacao: '2025-01-10T11:00:00',
    status: 'Recebida',
    fornecedorId: 'FORN-005',
    valorPeca: 320,
    responsavelCompra: 'COL-002',
    dataRecebimento: '2025-01-15',
    dataEnvio: '2025-01-16',
    origemEntrada: 'Garantia'
  }
];

let notasAssistencia: NotaAssistencia[] = [
  {
    id: 'NOTA-ASS-002',
    solicitacaoId: 'SOL-020',
    fornecedor: 'FORN-003',
    lojaSolicitante: 'db894e7d',
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
    solicitacaoId: 'SOL-018',
    fornecedor: 'FORN-005',
    lojaSolicitante: '5b9446d5',
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
    solicitacaoId: 'SOL-015',
    fornecedor: 'FORN-001',
    lojaSolicitante: '3ac7e00c',
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
    solicitacaoId: 'SOL-012',
    fornecedor: 'FORN-002',
    lojaSolicitante: '5b9446d5',
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
    solicitacaoId: 'SOL-010',
    fornecedor: 'FORN-003',
    lojaSolicitante: '0d06e7db',
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
  {
    id: 'NOTA-ASS-001',
    solicitacaoId: 'SOL-005',
    fornecedor: 'FORN-005',
    lojaSolicitante: 'db894e7d',
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
    solicitacaoId: 'SOL-003',
    fornecedor: 'FORN-001',
    lojaSolicitante: '5b9446d5',
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
    solicitacaoId: 'SOL-001',
    fornecedor: 'FORN-002',
    lojaSolicitante: '3ac7e00c',
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

let lotesPagamento: LotePagamento[] = [];

let solicitacaoCounter = 21;
let notaAssistenciaCounter = 9;
let loteCounter = 1;

// Getters
export const getSolicitacoes = () => [...solicitacoes];
export const getSolicitacaoPendentes = () => solicitacoes.filter(s => s.status === 'Pendente');
export const getSolicitacoesByOS = (osId: string) => solicitacoes.filter(s => s.osId === osId);
export const getNotasAssistencia = () => [...notasAssistencia];
export const getNotasAssistenciaPendentes = () => notasAssistencia.filter(n => n.status === 'Pendente');
export const getLotesPagamento = () => [...lotesPagamento];
export const getSolicitacaoById = (id: string) => solicitacoes.find(s => s.id === id) || null;

// Helper para injetar nota de consignação (chamado pela consignacaoApi)
export const __pushNotaConsignacao = (nota: NotaAssistencia) => {
  notasAssistencia.push(nota);
};

// Actions
export const addSolicitacao = (data: Omit<SolicitacaoPeca, 'id' | 'dataSolicitacao' | 'status'>): SolicitacaoPeca => {
  const origemEntrada = data.origemEntrada || resolveOrigemEntrada(data.osId);
  const novaSolicitacao: SolicitacaoPeca = {
    ...data,
    id: `SOL-${String(solicitacaoCounter++).padStart(3, '0')}`,
    dataSolicitacao: new Date().toISOString(),
    status: 'Pendente',
    origemEntrada
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
  formaPagamento?: string;
  origemPeca?: string;
  observacao?: string;
  bancoDestinatario?: string;
  chavePix?: string;
}): SolicitacaoPeca | null => {
  const index = solicitacoes.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  solicitacoes[index] = {
    ...solicitacoes[index],
    ...dados,
    formaPagamento: dados.formaPagamento as 'Pix' | 'Dinheiro' | undefined,
    origemPeca: dados.origemPeca as 'Fornecedor' | 'Estoque Assistência Thiago' | undefined,
    status: 'Aprovada'
  };

  const osId = solicitacoes[index].osId;
  const os = getOrdemServicoById(osId);
  if (os) {
    updateOrdemServico(osId, {
      status: 'Aguardando Peça',
      proximaAtuacao: 'Gestor: Aprovar Peça',
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

export const rejeitarSolicitacao = (id: string, motivoRejeicao?: string): SolicitacaoPeca | null => {
  const index = solicitacoes.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  const solicitacao = solicitacoes[index];
  solicitacoes[index] = {
    ...solicitacao,
    status: 'Rejeitada',
    motivoRejeicao
  };
  
  const osId = solicitacao.osId;
  const os = getOrdemServicoById(osId);
  if (os) {
    updateOrdemServico(osId, {
      timeline: [...os.timeline, {
        data: new Date().toISOString(),
        tipo: 'peca',
        descricao: `Solicitação ${id} REJEITADA – ${solicitacao.peca} x ${solicitacao.quantidade} | Motivo: ${motivoRejeicao || 'Não informado'}`,
        responsavel: 'Gestora Matriz'
      }]
    });
  }
  
  return solicitacoes[index];
};

// ========== AÇÕES EM MASSA - Encaminhar para Financeiro ==========

export const encaminharParaFinanceiro = (solicitacaoIds: string[], usuarioNome: string, dadosPagamento?: DadosPagamentoEncaminhamento): NotaAssistencia[] => {
  const notasCriadas: NotaAssistencia[] = [];
  
  for (const solId of solicitacaoIds) {
    const idx = solicitacoes.findIndex(s => s.id === solId);
    if (idx === -1 || solicitacoes[idx].status !== 'Aprovada') continue;
    
    const sol = solicitacoes[idx];
    
    // Atualizar status da solicitação
    solicitacoes[idx] = { ...sol, status: 'Pagamento - Financeiro' };
    
    // Criar nota individual
    const novaNota: NotaAssistencia = {
      id: `NOTA-ASS-${String(notaAssistenciaCounter++).padStart(3, '0')}`,
      solicitacaoId: solId,
      fornecedor: sol.fornecedorId || '',
      lojaSolicitante: sol.lojaSolicitante,
      osId: sol.osId,
      dataCriacao: new Date().toISOString(),
      valorTotal: (sol.valorPeca || 0) * sol.quantidade,
      status: 'Pendente',
      itens: [{
        peca: sol.peca,
        quantidade: sol.quantidade,
        valorUnitario: sol.valorPeca || 0
      }],
      ...(dadosPagamento && {
        formaPagamentoEncaminhamento: dadosPagamento.formaPagamento,
        contaBancariaEncaminhamento: dadosPagamento.contaBancaria,
        nomeRecebedor: dadosPagamento.nomeRecebedor,
        chavePixEncaminhamento: dadosPagamento.chavePix,
        observacaoEncaminhamento: dadosPagamento.observacao
      })
    };
    notasAssistencia.push(novaNota);
    notasCriadas.push(novaNota);
    
    // Registrar na timeline da OS
    const os = getOrdemServicoById(sol.osId);
    if (os) {
      updateOrdemServico(sol.osId, {
        timeline: [...os.timeline, {
          data: new Date().toISOString(),
          tipo: 'peca',
          descricao: `Registro encaminhado para conferência financeira por ${usuarioNome} via ação em massa`,
          responsavel: usuarioNome
        }]
      });
    }
  }
  
  return notasCriadas;
};

// ========== Agrupar Solicitações para Pagamento (Lote) ==========

export const agruparParaPagamento = (solicitacaoIds: string[], usuarioNome: string, dadosPagamento?: DadosPagamentoEncaminhamento): { lote: LotePagamento; nota: NotaAssistencia } | null => {
  const sols = solicitacaoIds.map(id => solicitacoes.find(s => s.id === id)).filter(Boolean) as SolicitacaoPeca[];
  if (sols.length < 2) return null;
  
  // Validar mesmo fornecedor
  const fornecedorId = sols[0].fornecedorId;
  if (!fornecedorId || !sols.every(s => s.fornecedorId === fornecedorId)) return null;
  
  // Validar todas aprovadas
  if (!sols.every(s => s.status === 'Aprovada')) return null;
  
  const valorTotal = sols.reduce((acc, s) => acc + (s.valorPeca || 0) * s.quantidade, 0);
  
  // Criar lote
  const lote: LotePagamento = {
    id: `LOTE-${String(loteCounter++).padStart(3, '0')}`,
    fornecedorId,
    solicitacaoIds: sols.map(s => s.id),
    valorTotal,
    dataCriacao: new Date().toISOString(),
    status: 'Pendente'
  };
  lotesPagamento.push(lote);
  
  // Mudar status das solicitações
  for (const sol of sols) {
    const idx = solicitacoes.findIndex(s => s.id === sol.id);
    if (idx !== -1) {
      solicitacoes[idx] = { ...solicitacoes[idx], status: 'Pagamento - Financeiro' };
    }
  }
  
  // Criar nota única consolidada
  const nota: NotaAssistencia = {
    id: `NOTA-ASS-${String(notaAssistenciaCounter++).padStart(3, '0')}`,
    solicitacaoId: sols[0].id,
    solicitacaoIds: sols.map(s => s.id),
    loteId: lote.id,
    fornecedor: fornecedorId,
    lojaSolicitante: sols[0].lojaSolicitante,
    dataCriacao: new Date().toISOString(),
    valorTotal,
    status: 'Pendente',
    itens: sols.map(s => ({
      peca: s.peca,
      quantidade: s.quantidade,
      valorUnitario: s.valorPeca || 0
    })),
    ...(dadosPagamento && {
      formaPagamentoEncaminhamento: dadosPagamento.formaPagamento,
      contaBancariaEncaminhamento: dadosPagamento.contaBancaria,
      nomeRecebedor: dadosPagamento.nomeRecebedor,
      chavePixEncaminhamento: dadosPagamento.chavePix,
      observacaoEncaminhamento: dadosPagamento.observacao
    })
  };
  notasAssistencia.push(nota);
  
  // Timeline de cada OS
  for (const sol of sols) {
    const os = getOrdemServicoById(sol.osId);
    if (os) {
      updateOrdemServico(sol.osId, {
        timeline: [...os.timeline, {
          data: new Date().toISOString(),
          tipo: 'peca',
          descricao: `Solicitação agrupada no Lote ${lote.id} e encaminhada para conferência financeira por ${usuarioNome}`,
          responsavel: usuarioNome
        }]
      });
    }
  }
  
  return { lote, nota };
};

// ========== Finalizar Nota no Financeiro ==========

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
  
  // Determinar IDs de solicitações a processar (lote ou individual)
  const solIdsParaProcessar = nota.solicitacaoIds && nota.solicitacaoIds.length > 0
    ? nota.solicitacaoIds
    : nota.solicitacaoId ? [nota.solicitacaoId] : [];
  
  const isLote = !!nota.loteId;
  
  for (const solId of solIdsParaProcessar) {
    const solIdx = solicitacoes.findIndex(s => s.id === solId);
    if (solIdx !== -1) {
      solicitacoes[solIdx].status = 'Recebida';
      
      const osId = solicitacoes[solIdx].osId;
      const os = getOrdemServicoById(osId);
      if (os) {
        updateOrdemServico(osId, {
          status: 'Pagamento Concluído',
          proximaAtuacao: 'Técnico (Recebimento)',
          timeline: [...os.timeline, {
            data: new Date().toISOString(),
            tipo: 'peca',
            descricao: isLote
              ? `Pagamento confirmado via Lote ${nota.loteId} em ${new Date().toLocaleDateString('pt-BR')} - ${solicitacoes[solIdx].peca}`
              : `Pagamento concluído via nota ${notaId} - ${solicitacoes[solIdx].peca}. Aguardando confirmação de recebimento pelo técnico.`,
            responsavel: dados.responsavelFinanceiro
          }]
        });
      }
    }
  }

  // Atualizar lote se existir
  if (nota.loteId) {
    const loteIdx = lotesPagamento.findIndex(l => l.id === nota.loteId);
    if (loteIdx !== -1) {
      lotesPagamento[loteIdx] = {
        ...lotesPagamento[loteIdx],
        ...dados,
        status: 'Concluido',
        dataConferencia: new Date().toISOString().split('T')[0]
      };
    }
  }

  // Registrar despesa no financeiro
  const hoje = new Date().toISOString().split('T')[0];
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const mesAtual = `${meses[new Date().getMonth()]}-${new Date().getFullYear()}`;
  addDespesa({
    tipo: 'Variável',
    data: hoje,
    descricao: isLote 
      ? `Pagamento Lote ${nota.loteId} - Nota ${notaId}`
      : `Pagamento Nota Assistência ${notaId}`,
    valor: nota.valorTotal,
    competencia: mesAtual,
    conta: dados.contaPagamento,
    observacoes: isLote
      ? `Fornecedor: ${nota.fornecedor} | Lote: ${nota.loteId} | Solicitações: ${solIdsParaProcessar.join(', ')}`
      : `Fornecedor: ${nota.fornecedor} | Solicitação: ${nota.solicitacaoId}`,
    lojaId: nota.lojaSolicitante,
    status: 'Pago',
    categoria: 'Assistência',
    dataVencimento: hoje,
    dataPagamento: hoje,
    recorrente: false,
    periodicidade: null,
    pagoPor: dados.responsavelFinanceiro
  });
  // Se nota de consignação, confirmar pagamento parcial automaticamente
  if (nota.tipoConsignacao && nota.solicitacaoId) {
    confirmarPagamentoPorNotaId(
      nota.solicitacaoId,
      nota.id,
      dados.responsavelFinanceiro,
      undefined // comprovante será anexado separadamente se necessário
    );
  }
  
  return notasAssistencia[notaIndex];
};

export const cancelarSolicitacao = (id: string, observacao: string): SolicitacaoPeca | null => {
  const index = solicitacoes.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  const solicitacao = solicitacoes[index];
  solicitacoes[index] = {
    ...solicitacao,
    status: 'Cancelada',
    observacao
  };
  
  const osId = solicitacao.osId;
  const os = getOrdemServicoById(osId);
  if (os) {
    const outrasSolicitacoesAtivas = solicitacoes.filter(s => 
      s.osId === osId && 
      s.id !== id && 
      s.status !== 'Cancelada' && 
      s.status !== 'Rejeitada'
    );
    
    const updates: any = {
      timeline: [...os.timeline, {
        data: new Date().toISOString(),
        tipo: 'peca',
        descricao: `Solicitação ${id} CANCELADA – ${solicitacao.peca} | Obs: ${observacao}`,
        responsavel: 'Usuário Sistema'
      }]
    };
    
    if (outrasSolicitacoesAtivas.length === 0) {
      updates.status = 'Em serviço';
    }
    
    updateOrdemServico(osId, updates);
  }
  
  return solicitacoes[index];
};

export const calcularSLASolicitacao = (dataSolicitacao: string): number => {
  const data = new Date(dataSolicitacao);
  const hoje = new Date();
  const diffTime = Math.abs(hoje.getTime() - data.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export { formatCurrency } from '@/utils/formatUtils';

// ========== Desvincular Nota de Lote ==========

export const desvincularNotaDeLote = (solicitacaoId: string, motivo: string, responsavel: string): SolicitacaoPeca | null => {
  // Encontrar a solicitação
  const solIdx = solicitacoes.findIndex(s => s.id === solicitacaoId);
  if (solIdx === -1) return null;
  const sol = solicitacoes[solIdx];

  // Encontrar a nota que contém esta solicitação em um lote
  const notaIdx = notasAssistencia.findIndex(n => 
    n.loteId && n.solicitacaoIds?.includes(solicitacaoId) && n.status === 'Pendente'
  );
  if (notaIdx === -1) return null;
  const nota = notasAssistencia[notaIdx];
  const loteId = nota.loteId!;

  // Encontrar o lote
  const loteIdx = lotesPagamento.findIndex(l => l.id === loteId);
  if (loteIdx === -1) return null;
  const lote = lotesPagamento[loteIdx];
  if (lote.status !== 'Pendente') return null;

  // Remover solicitação do lote
  lote.solicitacaoIds = lote.solicitacaoIds.filter(id => id !== solicitacaoId);
  
  // Remover do array de solicitacaoIds da nota
  const novosSolIds = (nota.solicitacaoIds || []).filter(id => id !== solicitacaoId);
  
  // Remover item correspondente da nota
  const novaItens = nota.itens.filter(item => item.peca !== sol.peca);
  
  // Recalcular valor
  const novoValor = novaItens.reduce((acc, item) => acc + item.valorUnitario * item.quantidade, 0);

  if (novosSolIds.length <= 1) {
    // Se restou 0 ou 1 item, desmontar o lote
    if (novosSolIds.length === 1) {
      // Converter lote em nota individual
      notasAssistencia[notaIdx] = {
        ...nota,
        solicitacaoIds: novosSolIds,
        solicitacaoId: novosSolIds[0],
        loteId: undefined,
        itens: novaItens,
        valorTotal: novoValor
      };
    } else {
      // Lote ficou vazio, remover nota
      notasAssistencia.splice(notaIdx, 1);
    }
    // Remover lote
    lotesPagamento.splice(loteIdx, 1);
  } else {
    // Atualizar lote e nota
    lote.valorTotal = novoValor;
    lotesPagamento[loteIdx] = lote;
    notasAssistencia[notaIdx] = {
      ...nota,
      solicitacaoIds: novosSolIds,
      itens: novaItens,
      valorTotal: novoValor
    };
  }

  // Reverter status da solicitação para 'Aprovada'
  solicitacoes[solIdx] = { ...sol, status: 'Recusada pelo Financeiro' };

  // Registrar na timeline da OS
  const os = getOrdemServicoById(sol.osId);
  if (os) {
    updateOrdemServico(sol.osId, {
      timeline: [...os.timeline, {
        data: new Date().toISOString(),
        tipo: 'financeiro',
        descricao: `Nota removida do Lote ${loteId} pelo Financeiro em ${new Date().toLocaleString('pt-BR')} - Motivo: ${motivo}`,
        responsavel
      }]
    });
  }

  return solicitacoes[solIdx];
};

export const getLoteById = (loteId: string): LotePagamento | null => {
  return lotesPagamento.find(l => l.id === loteId) || null;
};

// Marcar solicitações ativas de uma OS cancelada
export const marcarSolicitacoesOSCancelada = (osId: string): void => {
  solicitacoes.forEach((sol, idx) => {
    if (sol.osId === osId && ['Pendente', 'Aprovada', 'Enviada', 'Recebida', 'Pagamento - Financeiro', 'Pagamento Finalizado', 'Aguardando Chegada', 'Em Estoque'].includes(sol.status)) {
      solicitacoes[idx] = { ...sol, osCancelada: true };
    }
  });
};

// Tratar peça de OS cancelada
export const tratarPecaOSCancelada = (
  id: string, 
  decisao: 'devolver' | 'reter', 
  motivo: string, 
  responsavel: string
): SolicitacaoPeca | null => {
  const index = solicitacoes.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  const sol = solicitacoes[index];
  if (!sol.osCancelada && sol.status !== 'Cancelada') return null;

  if (decisao === 'devolver') {
    solicitacoes[index] = {
      ...sol,
      status: 'Devolvida ao Fornecedor',
      motivoTratamento: motivo,
      tratadaPor: responsavel
    };
  } else {
    solicitacoes[index] = {
      ...sol,
      status: 'Retida para Estoque',
      motivoTratamento: motivo,
      tratadaPor: responsavel
    };
  }

  const os = getOrdemServicoById(sol.osId);
  if (os) {
    const descricaoTimeline = decisao === 'devolver'
      ? `Peça "${sol.peca}" devolvida ao fornecedor por ${responsavel} - Motivo: ${motivo}`
      : `Peça "${sol.peca}" retida para estoque próprio por ${responsavel} - Motivo: ${motivo}`;
    
    updateOrdemServico(sol.osId, {
      timeline: [...os.timeline, {
        data: new Date().toISOString(),
        tipo: 'peca',
        descricao: descricaoTimeline,
        responsavel
      }]
    });
  }

  return solicitacoes[index];
};

// Verificar se peça já foi paga (nota concluída)
export const isPecaPaga = (sol: SolicitacaoPeca): boolean => {
  if (sol.status === 'Recebida' || sol.status === 'Pagamento Finalizado') return true;
  // Check if there's a concluded nota for this solicitation
  const nota = notasAssistencia.find(n => n.solicitacaoId === sol.id && n.status === 'Concluído');
  if (nota) return true;
  return false;
};
