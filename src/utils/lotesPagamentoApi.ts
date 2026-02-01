// API para Lotes de Pagamento de Peças

export interface TimelineLote {
  id: string;
  dataHora: string;
  tipo: 'criacao' | 'adicao' | 'alerta_parado' | 'envio' | 'pagamento' | 'finalizacao';
  descricao: string;
  usuarioNome: string;
}

export interface LotePagamento {
  id: string;
  dataAbertura: string;
  dataEnvio?: string;
  dataFinalizacao?: string;
  status: 'Aberto' | 'Enviado' | 'Finalizado';
  solicitacoes: string[]; // IDs das solicitações
  responsavelId: string;
  responsavelNome: string;
  totalValor: number;
  timeline: TimelineLote[];
}

export interface PagamentoLote {
  id: string;
  loteId: string;
  fornecedorId: string;
  fornecedorNome: string;
  solicitacoes: string[];
  valorTotal: number;
  formaPagamento?: 'Pix' | 'Dinheiro';
  comprovante?: string;
  notaFiscal?: string;
  dataPagamento?: string;
  status: 'Pendente' | 'Pago';
}

// Dados mockados - UUIDs reais do useCadastroStore
// Colaboradores: b467c728 (Anna Beatriz - Gestor), 428d37c2 (Bruno Alves - Gestor)
let lotes: LotePagamento[] = [
  {
    id: 'LOTE-2025-0001',
    dataAbertura: '2025-01-06T08:00:00',
    status: 'Aberto',
    solicitacoes: ['SOL-001', 'SOL-002'],
    responsavelId: 'b467c728', // Anna Beatriz Borges
    responsavelNome: 'Anna Beatriz Borges',
    totalValor: 350.00,
    timeline: [
      {
        id: 'TL-LOTE-001',
        dataHora: '2025-01-06T08:00:00',
        tipo: 'criacao',
        descricao: 'Lote criado automaticamente para semana 01/2025',
        usuarioNome: 'Sistema'
      }
    ]
  }
];

let pagamentos: PagamentoLote[] = [
  {
    id: 'PAG-001',
    loteId: 'LOTE-2025-0001',
    fornecedorId: 'FORN-001',
    fornecedorNome: 'TechSupply Peças',
    solicitacoes: ['SOL-001'],
    valorTotal: 150.00,
    status: 'Pendente'
  },
  {
    id: 'PAG-002',
    loteId: 'LOTE-2025-0001',
    fornecedorId: 'FORN-002',
    fornecedorNome: 'FastCell Distribuição',
    solicitacoes: ['SOL-002'],
    valorTotal: 200.00,
    status: 'Pendente'
  }
];

// Funções de API
export const getLotes = (): LotePagamento[] => {
  return [...lotes];
};

export const getLotesAbertos = (): LotePagamento[] => {
  return lotes.filter(l => l.status === 'Aberto');
};

export const getLotesEnviados = (): LotePagamento[] => {
  return lotes.filter(l => l.status === 'Enviado');
};

export const getLoteById = (id: string): LotePagamento | null => {
  return lotes.find(l => l.id === id) || null;
};

export const criarLote = (responsavelId: string, responsavelNome: string): LotePagamento => {
  const novoLote: LotePagamento = {
    id: `LOTE-${new Date().getFullYear()}-${String(lotes.length + 1).padStart(4, '0')}`,
    dataAbertura: new Date().toISOString(),
    status: 'Aberto',
    solicitacoes: [],
    responsavelId,
    responsavelNome,
    totalValor: 0,
    timeline: [
      {
        id: `TL-${Date.now()}`,
        dataHora: new Date().toISOString(),
        tipo: 'criacao',
        descricao: 'Lote criado',
        usuarioNome: responsavelNome
      }
    ]
  };
  lotes.push(novoLote);
  return novoLote;
};

export const adicionarSolicitacaoAoLote = (loteId: string, solicitacaoId: string, valor: number, usuarioNome: string): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Aberto') return false;
  
  if (!lote.solicitacoes.includes(solicitacaoId)) {
    lote.solicitacoes.push(solicitacaoId);
    lote.totalValor += valor;
    lote.timeline.push({
      id: `TL-${Date.now()}`,
      dataHora: new Date().toISOString(),
      tipo: 'adicao',
      descricao: `Solicitação ${solicitacaoId} adicionada ao lote`,
      usuarioNome
    });
  }
  return true;
};

export const enviarLoteParaFinanceiro = (loteId: string, usuarioNome: string): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Aberto') return false;
  
  lote.status = 'Enviado';
  lote.dataEnvio = new Date().toISOString();
  lote.timeline.push({
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'envio',
    descricao: 'Lote enviado para o Financeiro',
    usuarioNome
  });
  return true;
};

export const finalizarLote = (loteId: string, usuarioNome: string): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Enviado') return false;
  
  lote.status = 'Finalizado';
  lote.dataFinalizacao = new Date().toISOString();
  lote.timeline.push({
    id: `TL-${Date.now()}`,
    dataHora: new Date().toISOString(),
    tipo: 'finalizacao',
    descricao: 'Lote finalizado',
    usuarioNome
  });
  return true;
};

// Funções para Pagamentos
export const getPagamentosByLote = (loteId: string): PagamentoLote[] => {
  return pagamentos.filter(p => p.loteId === loteId);
};

export const getPagamentoById = (id: string): PagamentoLote | null => {
  return pagamentos.find(p => p.id === id) || null;
};

export const registrarPagamento = (
  pagamentoId: string, 
  dados: { formaPagamento: 'Pix' | 'Dinheiro'; comprovante?: string; notaFiscal?: string }
): boolean => {
  const pagamento = pagamentos.find(p => p.id === pagamentoId);
  if (!pagamento) return false;
  
  pagamento.formaPagamento = dados.formaPagamento;
  pagamento.comprovante = dados.comprovante;
  pagamento.notaFiscal = dados.notaFiscal;
  pagamento.dataPagamento = new Date().toISOString();
  pagamento.status = 'Pago';
  
  // Adicionar timeline ao lote
  const lote = lotes.find(l => l.id === pagamento.loteId);
  if (lote) {
    lote.timeline.push({
      id: `TL-${Date.now()}`,
      dataHora: new Date().toISOString(),
      tipo: 'pagamento',
      descricao: `Pagamento registrado para ${pagamento.fornecedorNome} - ${dados.formaPagamento}`,
      usuarioNome: 'Financeiro'
    });
  }
  
  return true;
};

export const criarPagamentoLote = (pagamento: Omit<PagamentoLote, 'id'>): PagamentoLote => {
  const novoPagamento: PagamentoLote = {
    ...pagamento,
    id: `PAG-${String(pagamentos.length + 1).padStart(3, '0')}`
  };
  pagamentos.push(novoPagamento);
  return novoPagamento;
};

// Verificar itens parados (> 7 dias sem envio)
export const verificarItensParados = (): string[] => {
  const loteAberto = lotes.find(l => l.status === 'Aberto');
  if (!loteAberto) return [];
  
  const dataAbertura = new Date(loteAberto.dataAbertura);
  const hoje = new Date();
  const diffDias = Math.ceil((hoje.getTime() - dataAbertura.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDias > 7) {
    return loteAberto.solicitacoes;
  }
  return [];
};

// Obter ou criar lote atual da semana
export const getOuCriarLoteAtual = (responsavelId: string, responsavelNome: string): LotePagamento => {
  const loteAberto = lotes.find(l => l.status === 'Aberto');
  if (loteAberto) return loteAberto;
  
  return criarLote(responsavelId, responsavelNome);
};
