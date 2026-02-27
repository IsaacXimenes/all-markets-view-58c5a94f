// Garantias API - Módulo completo de gerenciamento de garantias
import { format, addMonths, differenceInDays } from 'date-fns';
import { addOrdemServico } from './assistenciaApi';
import { updateProduto, addMovimentacao, Produto, getProdutoById } from './estoqueApi';
import { registrarEmprestimoGarantia, addTimelineEntry as addTimelineUnificada } from './timelineApi';
import { addProdutoPendente } from './osApi';
import { addVenda } from './vendasApi';

// ==================== HELPERS localStorage ====================

const loadFromStorage = <T>(key: string, defaultData: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn(`[GARANTIA] Erro ao carregar ${key} do localStorage:`, e);
  }
  return defaultData;
};

const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[GARANTIA] Erro ao salvar ${key} no localStorage:`, e);
  }
};

// ==================== INTERFACES ====================

export interface GarantiaItem {
  id: string;
  vendaId: string;
  itemVendaId: string;
  produtoId: string;
  imei: string;
  modelo: string;
  tipoGarantia: 'Garantia - Apple' | 'Garantia - Thiago Imports';
  mesesGarantia: number;
  dataInicioGarantia: string;
  dataFimGarantia: string;
  status: 'Ativa' | 'Expirada' | 'Em Tratativa' | 'Concluída';
  lojaVenda: string;
  vendedorId: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string;
  clienteEmail?: string;
}

export interface TratativaGarantia {
  id: string;
  garantiaId: string;
  tipo: 'Direcionado Apple' | 'Encaminhado Assistência' | 'Assistência + Empréstimo' | 'Troca Direta';
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  descricao: string;
  aparelhoEmprestadoId?: string;
  aparelhoEmprestadoModelo?: string;
  aparelhoEmprestadoImei?: string;
  aparelhoTrocaId?: string;
  aparelhoTrocaModelo?: string;
  aparelhoTrocaImei?: string;
  osId?: string;
  status: 'Em Andamento' | 'Concluído' | 'Aguardando Aprovação' | 'Aprovada' | 'Recusada';
}

export interface TimelineGarantia {
  id: string;
  garantiaId: string;
  dataHora: string;
  tipo: 'registro_venda' | 'abertura_garantia' | 'tratativa' | 'os_criada' | 'emprestimo' | 'devolucao' | 'troca' | 'conclusao';
  titulo: string;
  descricao: string;
  usuarioId: string;
  usuarioNome: string;
}

// Interface para Contatos Ativos (Garantias vencendo)
export interface ContatoAtivoGarantia {
  id: string;
  garantiaId?: string;
  dataLancamento: string;
  cliente: {
    id: string;
    nome: string;
    telefone: string;
    email: string;
  };
  aparelho: {
    modelo: string;
    imei: string;
    condicao?: 'Novo' | 'Seminovo';
  };
  logistica: {
    motoboyId: string;
    motoboyNome: string;
    dataEntregaPrevista: string;
    enderecoEntrega: string;
    observacoes: string;
  };
  garantiaEstendida?: {
    aderida: boolean;
    plano?: 'Um Ano' | 'Dois Anos' | 'Três Anos';
    planoId?: string;
    planoNome?: string;
    planoMeses?: number;
    valor?: number;
  };
  status: 'Pendente' | 'Garantia Criada' | 'Entregue';
  timeline: TimelineContatoAtivo[];
  autoGerado?: boolean;
}

export interface TimelineContatoAtivo {
  id: string;
  dataHora: string;
  tipo: 'criacao' | 'edicao' | 'garantia_criada' | 'entregue';
  descricao: string;
}

// Interface para Análise Garantia (OS)
export interface MetadadosEstoque {
  notaEntradaId?: string;
  produtoNotaId?: string;
  loteRevisaoId?: string;
  loteRevisaoItemId?: string;
  imeiAparelho?: string;
  modeloAparelho?: string;
  marcaAparelho?: string;
}

export interface RegistroAnaliseGarantia {
  id: string;
  origem: 'Garantia' | 'Estoque';
  origemId: string;
  clienteDescricao: string;
  dataChegada: string;
  status: 'Pendente' | 'Solicitação Aprovada' | 'Recusada';
  tecnicoId?: string;
  tecnicoNome?: string;
  dataAprovacao?: string;
  usuarioAprovacao?: string;
  observacao?: string;
  motivoRecusa?: string;
  dataRecusa?: string;
  metadata?: MetadadosEstoque;
}

// ==================== DADOS MOCKADOS (default para localStorage) ====================

const hoje = new Date();

const defaultContatosAtivos: ContatoAtivoGarantia[] = [
  {
    id: 'CTA-0001',
    dataLancamento: '2025-01-05T10:00:00',
    cliente: {
      id: 'CLI-001',
      nome: 'João Silva',
      telefone: '(11) 99999-1111',
      email: 'joao@email.com'
    },
    aparelho: {
      modelo: 'iPhone 15 Pro Max',
      imei: '352123456789012'
    },
    logistica: {
      motoboyId: 'COL-023',
      motoboyNome: 'João Silva Motoboy',
      dataEntregaPrevista: '2025-01-10',
      enderecoEntrega: 'Rua das Flores, 123 - Centro, São Paulo-SP',
      observacoes: 'Cliente solicita entrega no período da tarde'
    },
    garantiaEstendida: {
      aderida: true,
      plano: 'Um Ano'
    },
    status: 'Pendente',
    timeline: [
      { id: 'TLC-001', dataHora: '2025-01-05T10:00:00', tipo: 'criacao', descricao: 'Contato registrado' }
    ]
  }
];

const defaultRegistrosAnalise: RegistroAnaliseGarantia[] = [
  {
    id: 'RAG-0001',
    origem: 'Garantia',
    origemId: 'GAR-0003',
    clienteDescricao: 'Pedro Oliveira - iPhone 14 Pro',
    dataChegada: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Pendente'
  },
  {
    id: 'RAG-0002',
    origem: 'Estoque',
    origemId: 'PEC-0001',
    clienteDescricao: 'Tela LCD iPhone 14 Pro Max',
    dataChegada: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Pendente'
  }
];

const defaultGarantias: GarantiaItem[] = [
  {
    id: 'GAR-0001', vendaId: 'VEN-2025-0001', itemVendaId: 'ITEM-001', produtoId: 'PROD-0010',
    imei: '352123456789012', modelo: 'iPhone 15 Pro Max', tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12, dataInicioGarantia: '2025-03-15', dataFimGarantia: '2026-03-15',
    status: 'Ativa', lojaVenda: 'db894e7d', vendedorId: '6dcbc817',
    clienteId: 'CLI-001', clienteNome: 'João Silva', clienteTelefone: '(11) 99999-1111', clienteEmail: 'joao@email.com'
  },
  {
    id: 'GAR-0002', vendaId: 'VEN-2025-0002', itemVendaId: 'ITEM-002', produtoId: 'PROD-0011',
    imei: '352123456789013', modelo: 'iPhone 15 Pro', tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12, dataInicioGarantia: '2025-04-16', dataFimGarantia: '2026-04-10',
    status: 'Concluída', lojaVenda: '3ac7e00c', vendedorId: '143ac0c2',
    clienteId: 'CLI-002', clienteNome: 'Maria Santos', clienteTelefone: '(11) 99999-2222', clienteEmail: 'maria@email.com'
  },
  {
    id: 'GAR-0003', vendaId: 'VEN-2025-0003', itemVendaId: 'ITEM-003', produtoId: 'PROD-0012',
    imei: '352123456789014', modelo: 'iPhone 14 Pro', tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12, dataInicioGarantia: '2024-01-10',
    dataFimGarantia: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    status: 'Ativa', lojaVenda: '5b9446d5', vendedorId: '428d37c2',
    clienteId: 'CLI-003', clienteNome: 'Pedro Oliveira', clienteTelefone: '(11) 99999-3333', clienteEmail: 'pedro@email.com'
  },
  {
    id: 'GAR-0004', vendaId: 'VEN-2025-0004', itemVendaId: 'ITEM-004', produtoId: 'PROD-0014',
    imei: '352123456789016', modelo: 'iPhone 15', tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12, dataInicioGarantia: '2024-01-25',
    dataFimGarantia: format(new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    status: 'Ativa', lojaVenda: 'fcc78c1a', vendedorId: '4bfe3508',
    clienteId: 'CLI-004', clienteNome: 'Ana Costa', clienteTelefone: '(11) 99999-4444', clienteEmail: 'ana@email.com'
  },
  {
    id: 'GAR-0005', vendaId: 'VEN-2025-0005', itemVendaId: 'ITEM-005', produtoId: 'PROD-0016',
    imei: '352123456789018', modelo: 'iPhone 14 Plus', tipoGarantia: 'Garantia - Thiago Imports',
    mesesGarantia: 12, dataInicioGarantia: '2025-01-19', dataFimGarantia: '2025-12-15',
    status: 'Em Tratativa', lojaVenda: '0d06e7db', vendedorId: 'b106080f',
    clienteId: 'CLI-001', clienteNome: 'João Silva', clienteTelefone: '(11) 99999-1111', clienteEmail: 'joao@email.com'
  },
  {
    id: 'GAR-0006', vendaId: 'VEN-2024-0050', itemVendaId: 'ITEM-050', produtoId: 'PROD-0017',
    imei: '352123456789019', modelo: 'iPhone SE 2022', tipoGarantia: 'Garantia - Thiago Imports',
    mesesGarantia: 12, dataInicioGarantia: '2024-11-20', dataFimGarantia: '2025-11-20',
    status: 'Concluída', lojaVenda: '3ac7e00c', vendedorId: '1b9137c8',
    clienteId: 'CLI-005', clienteNome: 'Carlos Lima', clienteTelefone: '(11) 99999-5555', clienteEmail: 'carlos@email.com'
  },
  {
    id: 'GAR-0007', vendaId: 'VEN-2024-0060', itemVendaId: 'ITEM-060', produtoId: 'PROD-0018',
    imei: '352123456789020', modelo: 'iPhone 13 Pro', tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 6, dataInicioGarantia: '2024-12-05', dataFimGarantia: '2025-06-05',
    status: 'Em Tratativa', lojaVenda: 'fcc78c1a', vendedorId: '143ac0c2',
    clienteId: 'CLI-002', clienteNome: 'Maria Santos', clienteTelefone: '(11) 99999-2222', clienteEmail: 'maria@email.com'
  },
  {
    id: 'GAR-0008', vendaId: 'VEN-2024-0070', itemVendaId: 'ITEM-070', produtoId: 'PROD-0020',
    imei: '352123456789022', modelo: 'iPhone 14', tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 3, dataInicioGarantia: '2024-12-05', dataFimGarantia: '2025-03-05',
    status: 'Ativa', lojaVenda: 'db894e7d', vendedorId: '6dcbc817',
    clienteId: 'CLI-003', clienteNome: 'Pedro Oliveira', clienteTelefone: '(11) 99999-3333', clienteEmail: 'pedro@email.com'
  },
  {
    id: 'GAR-0009', vendaId: 'VEN-2024-0080', itemVendaId: 'ITEM-080', produtoId: 'PROD-0025',
    imei: '352123456789023', modelo: 'iPhone 16 Pro', tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12, dataInicioGarantia: '2024-01-10',
    dataFimGarantia: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    status: 'Ativa', lojaVenda: 'db894e7d', vendedorId: '6dcbc817',
    clienteId: 'CLI-001', clienteNome: 'João Silva', clienteTelefone: '(11) 99999-1111', clienteEmail: 'joao@email.com'
  },
  {
    id: 'GAR-0010', vendaId: 'VEN-2024-0081', itemVendaId: 'ITEM-081', produtoId: 'PROD-0026',
    imei: '352123456789024', modelo: 'iPhone 15 Plus', tipoGarantia: 'Garantia - Thiago Imports',
    mesesGarantia: 12, dataInicioGarantia: '2024-01-18',
    dataFimGarantia: format(new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    status: 'Ativa', lojaVenda: '3ac7e00c', vendedorId: '143ac0c2',
    clienteId: 'CLI-002', clienteNome: 'Maria Santos', clienteTelefone: '(11) 99999-2222', clienteEmail: 'maria@email.com'
  },
  {
    id: 'GAR-0011', vendaId: 'VEN-2024-0082', itemVendaId: 'ITEM-082', produtoId: 'PROD-0027',
    imei: '352123456789025', modelo: 'iPhone 14 Pro Max', tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12, dataInicioGarantia: '2024-01-01',
    dataFimGarantia: format(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    status: 'Expirada', lojaVenda: 'fcc78c1a', vendedorId: '428d37c2',
    clienteId: 'CLI-004', clienteNome: 'Ana Costa', clienteTelefone: '(11) 99999-4444', clienteEmail: 'ana@email.com'
  },
  {
    id: 'GAR-0012', vendaId: 'VEN-2024-0083', itemVendaId: 'ITEM-083', produtoId: 'PROD-0028',
    imei: '352123456789026', modelo: 'iPhone 13', tipoGarantia: 'Garantia - Thiago Imports',
    mesesGarantia: 12, dataInicioGarantia: '2023-12-01',
    dataFimGarantia: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    status: 'Expirada', lojaVenda: '5b9446d5', vendedorId: '4bfe3508',
    clienteId: 'CLI-005', clienteNome: 'Carlos Lima', clienteTelefone: '(11) 99999-5555', clienteEmail: 'carlos@email.com'
  }
];

const defaultTratativas: TratativaGarantia[] = [
  {
    id: 'TRAT-0001', garantiaId: 'GAR-0001', tipo: 'Direcionado Apple',
    dataHora: '2025-01-20T10:30:00', usuarioId: 'b467c728', usuarioNome: 'Anna Beatriz Borges',
    descricao: 'Cliente orientado a procurar Apple Store mais próxima para acionamento de garantia.',
    status: 'Concluído'
  },
  {
    id: 'TRAT-0002', garantiaId: 'GAR-0002', tipo: 'Direcionado Apple',
    dataHora: '2025-01-18T14:00:00', usuarioId: '7c1231ea', usuarioNome: 'Fernanda Gabrielle Silva de Lima',
    descricao: 'Problema na câmera. Cliente direcionado para Apple para reparo sob garantia.',
    status: 'Concluído'
  },
  {
    id: 'TRAT-0003', garantiaId: 'GAR-0006', tipo: 'Encaminhado Assistência',
    dataHora: '2024-12-10T09:00:00', usuarioId: 'b467c728', usuarioNome: 'Anna Beatriz Borges',
    descricao: 'Tela com manchas. Encaminhado para assistência técnica interna.',
    osId: 'OS-0050', status: 'Concluído'
  },
  {
    id: 'TRAT-0004', garantiaId: 'GAR-0007', tipo: 'Encaminhado Assistência',
    dataHora: '2025-01-02T11:30:00', usuarioId: '6dcbc817', usuarioNome: 'Caua Victor Costa dos Santos',
    descricao: 'Bateria não carrega corretamente. Em análise na assistência.',
    osId: 'OS-0051', status: 'Em Andamento'
  },
  {
    id: 'TRAT-0005', garantiaId: 'GAR-0005', tipo: 'Assistência + Empréstimo',
    dataHora: '2024-12-20T14:35:00', usuarioId: '7c1231ea', usuarioNome: 'Fernanda Gabrielle Silva de Lima',
    descricao: 'Problema no microfone. Cliente recebeu aparelho emprestado enquanto aguarda reparo.',
    aparelhoEmprestadoId: 'PROD-0100', aparelhoEmprestadoModelo: 'iPhone 13',
    aparelhoEmprestadoImei: '999000111222333', osId: 'OS-0052', status: 'Em Andamento'
  },
  {
    id: 'TRAT-0006', garantiaId: 'GAR-0006', tipo: 'Assistência + Empréstimo',
    dataHora: '2024-11-25T10:00:00', usuarioId: 'b467c728', usuarioNome: 'Anna Beatriz Borges',
    descricao: 'Alto-falante com ruído. Cliente utilizou aparelho emprestado por 5 dias.',
    aparelhoEmprestadoId: 'PROD-0101', aparelhoEmprestadoModelo: 'iPhone 12',
    aparelhoEmprestadoImei: '999000111222334', osId: 'OS-0053', status: 'Concluído'
  },
  {
    id: 'TRAT-0007', garantiaId: 'GAR-0002', tipo: 'Troca Direta',
    dataHora: '2025-01-22T16:00:00', usuarioId: '6dcbc817', usuarioNome: 'Caua Victor Costa dos Santos',
    descricao: 'Defeito de fabricação identificado. Realizada troca direta por novo aparelho.',
    aparelhoTrocaId: 'PROD-0102', aparelhoTrocaModelo: 'iPhone 15 Pro',
    aparelhoTrocaImei: '999000111222335', status: 'Concluído'
  },
  {
    id: 'TRAT-0008', garantiaId: 'GAR-0006', tipo: 'Troca Direta',
    dataHora: '2024-12-15T09:30:00', usuarioId: '7c1231ea', usuarioNome: 'Fernanda Gabrielle Silva de Lima',
    descricao: 'Problema recorrente após reparo. Cliente optou por troca direta.',
    aparelhoTrocaId: 'PROD-0103', aparelhoTrocaModelo: 'iPhone SE 2022',
    aparelhoTrocaImei: '999000111222336', status: 'Concluído'
  }
];

const defaultTimeline: TimelineGarantia[] = [
  {
    id: 'TL-0001', garantiaId: 'GAR-0005', dataHora: '2025-01-19T10:00:00',
    tipo: 'registro_venda', titulo: 'Venda registrada',
    descricao: 'Venda VEN-2025-0005 realizada com garantia Thiago Imports (12 meses)',
    usuarioId: 'b106080f', usuarioNome: 'Erick Guthemberg Ferreira da Silva'
  },
  {
    id: 'TL-0002', garantiaId: 'GAR-0005', dataHora: '2024-12-20T14:30:00',
    tipo: 'abertura_garantia', titulo: 'Garantia acionada',
    descricao: 'Cliente relatou problema no microfone durante ligações',
    usuarioId: '7c1231ea', usuarioNome: 'Fernanda Gabrielle Silva de Lima'
  },
  {
    id: 'TL-0003', garantiaId: 'GAR-0005', dataHora: '2024-12-20T14:35:00',
    tipo: 'tratativa', titulo: 'Tratativa: Assistência + Empréstimo',
    descricao: 'Definida tratativa com aparelho emprestado',
    usuarioId: '7c1231ea', usuarioNome: 'Fernanda Gabrielle Silva de Lima'
  },
  {
    id: 'TL-0004', garantiaId: 'GAR-0005', dataHora: '2024-12-20T14:35:00',
    tipo: 'os_criada', titulo: 'OS criada: OS-0052',
    descricao: 'Ordem de serviço criada para reparo do microfone',
    usuarioId: '7c1231ea', usuarioNome: 'Fernanda Gabrielle Silva de Lima'
  },
  {
    id: 'TL-0005', garantiaId: 'GAR-0005', dataHora: '2024-12-20T14:40:00',
    tipo: 'emprestimo', titulo: 'Aparelho emprestado',
    descricao: 'iPhone 13 (IMEI: 999000111222333) emprestado ao cliente',
    usuarioId: '7c1231ea', usuarioNome: 'Fernanda Gabrielle Silva de Lima'
  },
  {
    id: 'TL-0006', garantiaId: 'GAR-0006', dataHora: '2024-11-20T11:00:00',
    tipo: 'registro_venda', titulo: 'Venda registrada',
    descricao: 'Venda VEN-2024-0050 realizada com garantia Thiago Imports (12 meses)',
    usuarioId: '1b9137c8', usuarioNome: 'Evelyn Cordeiro de Oliveira'
  },
  {
    id: 'TL-0007', garantiaId: 'GAR-0006', dataHora: '2024-12-15T09:30:00',
    tipo: 'troca', titulo: 'Troca realizada',
    descricao: 'Aparelho trocado por iPhone SE 2022 (IMEI: 999000111222336)',
    usuarioId: '7c1231ea', usuarioNome: 'Fernanda Gabrielle Silva de Lima'
  },
  {
    id: 'TL-0008', garantiaId: 'GAR-0006', dataHora: '2024-12-15T09:35:00',
    tipo: 'conclusao', titulo: 'Garantia concluída',
    descricao: 'Tratativa finalizada com sucesso',
    usuarioId: '7c1231ea', usuarioNome: 'Fernanda Gabrielle Silva de Lima'
  }
];

// ==================== INICIALIZAÇÃO COM localStorage ====================

let garantias: GarantiaItem[] = loadFromStorage('garantias_data', defaultGarantias);
let tratativas: TratativaGarantia[] = loadFromStorage('tratativas_data', defaultTratativas);
let timeline: TimelineGarantia[] = loadFromStorage('timeline_garantia_data', defaultTimeline);
let contatosAtivos: ContatoAtivoGarantia[] = loadFromStorage('contatos_ativos_data', defaultContatosAtivos);
let registrosAnaliseGarantia: RegistroAnaliseGarantia[] = loadFromStorage('registros_analise_data', defaultRegistrosAnalise);

let garantiaCounter: number = loadFromStorage('garantia_counter', garantias.length);
let tratativaCounter: number = loadFromStorage('tratativa_counter', tratativas.length);
let timelineCounter: number = loadFromStorage('timeline_counter', timeline.length);
let contatoAtivoCounter: number = loadFromStorage('contato_ativo_counter', contatosAtivos.length);
let registroAnaliseCounter: number = loadFromStorage('registro_analise_counter', registrosAnaliseGarantia.length);

// ==================== FUNÇÕES CRUD ====================

// Garantias
export const getGarantias = (): GarantiaItem[] => {
  return [...garantias];
};

export const getGarantiaById = (id: string): GarantiaItem | undefined => {
  return garantias.find(g => g.id === id);
};

export const getGarantiasByVendaId = (vendaId: string): GarantiaItem[] => {
  return garantias.filter(g => g.vendaId === vendaId);
};

export const addGarantia = (garantia: Omit<GarantiaItem, 'id'>): GarantiaItem => {
  garantiaCounter++;
  const newGarantia: GarantiaItem = {
    ...garantia,
    id: `GAR-${String(garantiaCounter).padStart(4, '0')}`
  };
  garantias.push(newGarantia);
  saveToStorage('garantias_data', garantias);
  saveToStorage('garantia_counter', garantiaCounter);
  return newGarantia;
};

export const updateGarantia = (id: string, updates: Partial<GarantiaItem>): void => {
  const index = garantias.findIndex(g => g.id === id);
  if (index !== -1) {
    garantias[index] = { ...garantias[index], ...updates };
    saveToStorage('garantias_data', garantias);
  }
};

// Tratativas
export const getTratativas = (): TratativaGarantia[] => {
  return [...tratativas];
};

export const addTratativa = (tratativa: Omit<TratativaGarantia, 'id'>): TratativaGarantia => {
  tratativaCounter++;
  const newTratativa: TratativaGarantia = {
    ...tratativa,
    id: `TRAT-${String(tratativaCounter).padStart(4, '0')}`
  };
  tratativas.push(newTratativa);
  saveToStorage('tratativas_data', tratativas);
  saveToStorage('tratativa_counter', tratativaCounter);
  return newTratativa;
};

export const getTratativasByGarantiaId = (garantiaId: string): TratativaGarantia[] => {
  return tratativas.filter(t => t.garantiaId === garantiaId);
};

export const updateTratativa = (id: string, updates: Partial<TratativaGarantia>): void => {
  const index = tratativas.findIndex(t => t.id === id);
  if (index !== -1) {
    tratativas[index] = { ...tratativas[index], ...updates };
    saveToStorage('tratativas_data', tratativas);
  }
};

// Timeline
export const addTimelineEntry = (entry: Omit<TimelineGarantia, 'id'>): TimelineGarantia => {
  timelineCounter++;
  const newEntry: TimelineGarantia = {
    ...entry,
    id: `TL-${String(timelineCounter).padStart(4, '0')}`
  };
  timeline.push(newEntry);
  saveToStorage('timeline_garantia_data', timeline);
  saveToStorage('timeline_counter', timelineCounter);
  return newEntry;
};

export const getTimelineByGarantiaId = (garantiaId: string): TimelineGarantia[] => {
  return timeline.filter(t => t.garantiaId === garantiaId).sort((a, b) => 
    new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
  );
};

// ==================== CONSULTAS ESPECIAIS ====================

export const getGarantiasEmAndamento = (): GarantiaItem[] => {
  return garantias.filter(g => g.status === 'Em Tratativa');
};

export const getGarantiasExpirandoEm7Dias = (): GarantiaItem[] => {
  const hoje = new Date();
  return garantias.filter(g => {
    if (g.status !== 'Ativa') return false;
    const dataFim = new Date(g.dataFimGarantia);
    const dias = differenceInDays(dataFim, hoje);
    return dias >= 0 && dias <= 7;
  });
};

export const getGarantiasExpirandoEm30Dias = (): GarantiaItem[] => {
  const hoje = new Date();
  return garantias.filter(g => {
    if (g.status !== 'Ativa') return false;
    const dataFim = new Date(g.dataFimGarantia);
    const dias = differenceInDays(dataFim, hoje);
    return dias > 7 && dias <= 30;
  });
};

// Validação IMEI única
export const verificarGarantiaAtivaByIMEI = (imei: string): GarantiaItem | null => {
  const garantiaAtiva = garantias.find(g => 
    g.imei === imei && (g.status === 'Ativa' || g.status === 'Em Tratativa')
  );
  return garantiaAtiva || null;
};

export const getHistoricoGarantiasByIMEI = (imei: string): GarantiaItem[] => {
  return garantias.filter(g => g.imei === imei);
};

export const verificarTratativaAtivaByIMEI = (imei: string): { garantia: GarantiaItem; tratativa: TratativaGarantia } | null => {
  const garantia = garantias.find(g => g.imei === imei && g.status === 'Em Tratativa');
  if (!garantia) return null;
  const tratativaAtiva = tratativas.find(t => 
    t.garantiaId === garantia.id && t.status === 'Em Andamento'
  );
  if (tratativaAtiva) return { garantia, tratativa: tratativaAtiva };
  return null;
};

// Contadores para dashboard
export const getContadoresGarantia = () => {
  const emAndamento = garantias.filter(g => g.status === 'Em Tratativa').length;
  const aparelhosEmprestados = tratativas.filter(t => 
    t.status === 'Em Andamento' && t.aparelhoEmprestadoId
  ).length;
  const emAssistencia = tratativas.filter(t => 
    t.status === 'Em Andamento' && t.osId
  ).length;
  const maisde7Dias = tratativas.filter(t => {
    if (t.status !== 'Em Andamento') return false;
    const dias = differenceInDays(new Date(), new Date(t.dataHora));
    return dias > 7;
  }).length;
  const aguardandoAprovacao = tratativas.filter(t => t.status === 'Aguardando Aprovação').length;
  return { emAndamento, aparelhosEmprestados, emAssistencia, maisde7Dias, aguardandoAprovacao };
};

// Função para calcular status de expiração da garantia
export const calcularStatusExpiracao = (dataFimGarantia: string): {
  status: 'expirada' | 'urgente' | 'atencao' | 'ativa';
  diasRestantes: number;
  mensagem: string;
  cor: string;
} => {
  const hoje = new Date();
  const dataFim = new Date(dataFimGarantia);
  const dias = differenceInDays(dataFim, hoje);
  
  if (dias < 0) {
    return { status: 'expirada', diasRestantes: dias,
      mensagem: `Fora do período de garantia (expirou em ${format(dataFim, 'dd/MM/yyyy')})`, cor: 'destructive' };
  }
  if (dias <= 7) {
    return { status: 'urgente', diasRestantes: dias,
      mensagem: `URGENTE: Garantia expira em ${dias} dia${dias !== 1 ? 's' : ''}`, cor: 'warning' };
  }
  if (dias <= 30) {
    return { status: 'atencao', diasRestantes: dias,
      mensagem: `Atenção: Garantia expira em ${dias} dias`, cor: 'secondary' };
  }
  return { status: 'ativa', diasRestantes: dias,
    mensagem: `Garantia válida até ${format(dataFim, 'dd/MM/yyyy')}`, cor: 'success' };
};

// Export para CSV
export const exportGarantiasToCSV = (garantiasFiltradas: GarantiaItem[], filename: string) => {
  const headers = [
    'Data Venda', 'ID Garantia', 'IMEI', 'Modelo', 'Cliente', 
    'Resp. Garantia', 'Data Fim', 'Status', 'Tipo Tratativa', 'Data Tratativa'
  ];
  const rows = garantiasFiltradas.map(g => {
    const tratativasGarantia = getTratativasByGarantiaId(g.id);
    const ultimaTratativa = tratativasGarantia[tratativasGarantia.length - 1];
    return [
      format(new Date(g.dataInicioGarantia), 'dd/MM/yyyy'), g.id, g.imei, g.modelo, g.clienteNome,
      g.tipoGarantia, format(new Date(g.dataFimGarantia), 'dd/MM/yyyy'), g.status,
      ultimaTratativa?.tipo || '-', ultimaTratativa ? format(new Date(ultimaTratativa.dataHora), 'dd/MM/yyyy') : '-'
    ];
  });
  const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// ==================== CONTATOS ATIVOS ====================

export const getContatosAtivos = (): ContatoAtivoGarantia[] => {
  return [...contatosAtivos];
};

export const addContatoAtivo = (contato: Omit<ContatoAtivoGarantia, 'id' | 'timeline'>): ContatoAtivoGarantia => {
  contatoAtivoCounter++;
  const newContato: ContatoAtivoGarantia = {
    ...contato,
    id: `CTA-${String(contatoAtivoCounter).padStart(4, '0')}`,
    timeline: [{ id: `TLC-${Date.now()}`, dataHora: new Date().toISOString(), tipo: 'criacao', descricao: 'Contato registrado' }]
  };
  contatosAtivos.push(newContato);
  saveToStorage('contatos_ativos_data', contatosAtivos);
  saveToStorage('contato_ativo_counter', contatoAtivoCounter);
  return newContato;
};

export const updateContatoAtivo = (id: string, updates: Partial<ContatoAtivoGarantia>): void => {
  const index = contatosAtivos.findIndex(c => c.id === id);
  if (index !== -1) {
    contatosAtivos[index] = { ...contatosAtivos[index], ...updates };
    contatosAtivos[index].timeline.push({
      id: `TLC-${Date.now()}`,
      dataHora: new Date().toISOString(),
      tipo: 'edicao',
      descricao: 'Contato atualizado'
    });
    saveToStorage('contatos_ativos_data', contatosAtivos);
  }
};

// ==================== AUTOMAÇÃO DE CONTATOS ATIVOS ====================

export const verificarEGerarContatosAutomaticos = (): ContatoAtivoGarantia[] => {
  const garantiasExpirando = [...getGarantiasExpirandoEm7Dias(), ...getGarantiasExpirandoEm30Dias()];
  const novosContatos: ContatoAtivoGarantia[] = [];

  for (const garantia of garantiasExpirando) {
    // Verificar se já existe contato ativo para esta garantia
    const jaExiste = contatosAtivos.some(c => c.garantiaId === garantia.id);
    if (jaExiste) continue;

    contatoAtivoCounter++;
    const novoContato: ContatoAtivoGarantia = {
      id: `CTA-${String(contatoAtivoCounter).padStart(4, '0')}`,
      garantiaId: garantia.id,
      dataLancamento: new Date().toISOString(),
      cliente: {
        id: garantia.clienteId,
        nome: garantia.clienteNome,
        telefone: garantia.clienteTelefone || '',
        email: garantia.clienteEmail || ''
      },
      aparelho: {
        modelo: garantia.modelo,
        imei: garantia.imei
      },
      logistica: {
        motoboyId: '',
        motoboyNome: '',
        dataEntregaPrevista: '',
        enderecoEntrega: '',
        observacoes: `Contato gerado automaticamente - Garantia ${garantia.id} expira em ${format(new Date(garantia.dataFimGarantia), 'dd/MM/yyyy')}`
      },
      status: 'Pendente',
      timeline: [{ id: `TLC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, dataHora: new Date().toISOString(), tipo: 'criacao', descricao: 'Contato gerado automaticamente por garantia próxima do vencimento' }],
      autoGerado: true
    };
    contatosAtivos.push(novoContato);
    novosContatos.push(novoContato);
  }

  if (novosContatos.length > 0) {
    saveToStorage('contatos_ativos_data', contatosAtivos);
    saveToStorage('contato_ativo_counter', contatoAtivoCounter);
  }

  return novosContatos;
};

// ==================== ANÁLISE GARANTIA ====================

export const getRegistrosAnaliseGarantia = (): RegistroAnaliseGarantia[] => {
  return [...registrosAnaliseGarantia];
};

export const aprovarAnaliseGarantia = (id: string, dados: { tecnicoId: string; tecnicoNome: string; dataAprovacao: string; usuarioAprovacao: string }): RegistroAnaliseGarantia | null => {
  const index = registrosAnaliseGarantia.findIndex(r => r.id === id);
  if (index !== -1) {
    registrosAnaliseGarantia[index] = { ...registrosAnaliseGarantia[index], status: 'Solicitação Aprovada', ...dados };
    saveToStorage('registros_analise_data', registrosAnaliseGarantia);
    return registrosAnaliseGarantia[index];
  }
  return null;
};

export const recusarAnaliseGarantia = (id: string, motivo: string): RegistroAnaliseGarantia | null => {
  const index = registrosAnaliseGarantia.findIndex(r => r.id === id);
  if (index !== -1) {
    registrosAnaliseGarantia[index] = {
      ...registrosAnaliseGarantia[index], status: 'Recusada',
      motivoRecusa: motivo, dataRecusa: new Date().toISOString()
    };
    saveToStorage('registros_analise_data', registrosAnaliseGarantia);
    return registrosAnaliseGarantia[index];
  }
  return null;
};

export const encaminharParaAnaliseGarantia = (
  origemId: string, origem: 'Garantia' | 'Estoque', descricao: string, 
  observacao?: string, metadata?: MetadadosEstoque
): void => {
  registroAnaliseCounter++;
  registrosAnaliseGarantia.push({
    id: `RAG-${String(registroAnaliseCounter).padStart(4, '0')}`,
    origem, origemId, clienteDescricao: descricao,
    dataChegada: new Date().toISOString(), status: 'Pendente', observacao, metadata
  });
  saveToStorage('registros_analise_data', registrosAnaliseGarantia);
  saveToStorage('registro_analise_counter', registroAnaliseCounter);
};

// ==================== FLUXO DE APROVAÇÃO DE TRATATIVAS ====================

export const aprovarTratativa = (
  id: string, gestorId: string, gestorNome: string
): { sucesso: boolean; erro?: string } => {
  const index = tratativas.findIndex(t => t.id === id);
  if (index === -1) return { sucesso: false, erro: 'Tratativa não encontrada' };

  const tratativa = tratativas[index];
  if (tratativa.status !== 'Aguardando Aprovação') {
    return { sucesso: false, erro: 'Tratativa não está aguardando aprovação' };
  }

  const garantia = getGarantiaById(tratativa.garantiaId);
  if (!garantia) return { sucesso: false, erro: 'Garantia não encontrada' };

  try {
    const agora = new Date().toISOString();

    // Executar ações de estoque que estavam pendentes
    if (tratativa.tipo === 'Assistência + Empréstimo' && tratativa.aparelhoEmprestadoId) {
      updateProduto(tratativa.aparelhoEmprestadoId, {
        statusEmprestimo: 'Empréstimo - Assistência',
        emprestimoGarantiaId: garantia.id,
        emprestimoClienteId: garantia.clienteId,
        emprestimoClienteNome: garantia.clienteNome,
        emprestimoOsId: tratativa.osId,
        emprestimoDataHora: agora,
      });
      addMovimentacao({
        data: agora, produto: tratativa.aparelhoEmprestadoModelo || '', imei: tratativa.aparelhoEmprestadoImei || '',
        quantidade: 1, origem: garantia.lojaVenda, destino: 'Empréstimo - Garantia',
        responsavel: gestorNome, motivo: `Empréstimo aprovado garantia ${garantia.id}`
      });
    }

    if (tratativa.tipo === 'Troca Direta' && tratativa.aparelhoTrocaId) {
      // 1. Marcar aparelho novo como "Troca - Garantia" e dar baixa
      const aparelhoTroca = getProdutoById(tratativa.aparelhoTrocaId);
      updateProduto(tratativa.aparelhoTrocaId, { 
        bloqueadoEmTrocaGarantiaId: garantia.id,
        quantidade: 0 
      });
      addMovimentacao({
        data: agora, produto: tratativa.aparelhoTrocaModelo || '', imei: tratativa.aparelhoTrocaImei || '',
        quantidade: 1, origem: garantia.lojaVenda, destino: 'Troca - Garantia',
        responsavel: gestorNome, motivo: `Troca aprovada garantia ${garantia.id}`
      });

      // 2. Registrar aparelho defeituoso do cliente em Aparelhos Pendentes
      addProdutoPendente({
        imei: garantia.imei,
        marca: 'Apple',
        modelo: garantia.modelo,
        cor: aparelhoTroca?.cor || '-',
        tipo: 'Seminovo',
        condicao: 'Semi-novo',
        origemEntrada: 'Garantia',
        notaOuVendaId: `GAR-${garantia.id}`,
        valorCusto: 0,
        valorOrigem: 0,
        saudeBateria: 0,
        loja: garantia.lojaVenda,
        dataEntrada: agora.split('T')[0],
        motivoAssistencia: `Defeito relatado na Garantia ID #${garantia.id}`,
      } as any, true);

      // 3. Gerar Nota de Venda (modelo garantia) com custo e lucro zerados
      addVenda({
        dataHora: agora,
        lojaVenda: garantia.lojaVenda,
        vendedor: gestorId,
        clienteId: garantia.clienteId,
        clienteNome: garantia.clienteNome,
        clienteCpf: '',
        clienteTelefone: garantia.clienteTelefone || '',
        clienteEmail: garantia.clienteEmail || '',
        clienteCidade: '',
        origemVenda: 'Troca Garantia',
        localRetirada: garantia.lojaVenda,
        tipoRetirada: 'Retirada Balcão',
        taxaEntrega: 0,
        itens: [{
          id: `ITEM-GAR-${garantia.id}`,
          produtoId: tratativa.aparelhoTrocaId,
          produto: tratativa.aparelhoTrocaModelo || '',
          imei: tratativa.aparelhoTrocaImei || '',
          quantidade: 1,
          valorRecomendado: 0,
          valorCusto: 0,
          valorVenda: 0,
          categoria: 'Apple',
          loja: garantia.lojaVenda,
        }],
        tradeIns: [{
          id: `TI-GAR-${garantia.id}`,
          modelo: garantia.modelo,
          descricao: 'Entrada de Garantia',
          imei: garantia.imei,
          valorCompraUsado: 0,
          imeiValidado: true,
          condicao: 'Semi-novo',
        }],
        acessorios: [],
        pagamentos: [],
        subtotal: 0,
        totalTradeIn: 0,
        total: 0,
        lucro: 0,
        margem: 0,
        observacoes: `Troca Direta - Garantia ${garantia.id}. Aparelho defeituoso IMEI: ${garantia.imei}. Aparelho novo: ${tratativa.aparelhoTrocaModelo} IMEI: ${tratativa.aparelhoTrocaImei}.`,
        status: 'Concluída',
      });

      // 4. Timeline - aparelho em análise
      encaminharParaAnaliseGarantia(
        garantia.id, 'Garantia',
        `${garantia.clienteNome} - ${garantia.modelo} (IMEI: ${garantia.imei}) - Troca Direta`
      );

      addTimelineEntry({
        garantiaId: garantia.id, dataHora: agora, tipo: 'troca',
        titulo: 'Nota de Venda Garantia Gerada',
        descricao: `Nota de venda com custo zerado gerada. Aparelho defeituoso (IMEI: ${garantia.imei}) encaminhado para Aparelhos Pendentes.`,
        usuarioId: gestorId, usuarioNome: gestorNome
      });
    }

    // Atualizar status
    tratativas[index] = { ...tratativas[index], status: 'Em Andamento' };
    saveToStorage('tratativas_data', tratativas);

    // Timeline
    addTimelineEntry({
      garantiaId: garantia.id, dataHora: agora, tipo: 'tratativa',
      titulo: 'Tratativa Aprovada pelo Gestor',
      descricao: `Tratativa ${tratativa.tipo} aprovada por ${gestorNome}. Ações de estoque executadas.`,
      usuarioId: gestorId, usuarioNome: gestorNome
    });

    // Timeline unificada
    addTimelineUnificada({
      entidadeId: garantia.id, entidadeTipo: 'Garantia', dataHora: agora,
      tipo: 'aprovacao_tratativa', titulo: 'Tratativa Aprovada',
      descricao: `Tratativa ${tratativa.tipo} da garantia ${garantia.id} aprovada por ${gestorNome}`,
      usuarioId: gestorId, usuarioNome: gestorNome
    });

    return { sucesso: true };
  } catch (error) {
    console.error('[GARANTIA] Erro ao aprovar tratativa:', error);
    return { sucesso: false, erro: 'Erro ao aprovar tratativa' };
  }
};

export const recusarTratativa = (
  id: string, gestorId: string, gestorNome: string, motivo: string
): { sucesso: boolean; erro?: string } => {
  const index = tratativas.findIndex(t => t.id === id);
  if (index === -1) return { sucesso: false, erro: 'Tratativa não encontrada' };

  const tratativa = tratativas[index];
  if (tratativa.status !== 'Aguardando Aprovação') {
    return { sucesso: false, erro: 'Tratativa não está aguardando aprovação' };
  }

  const garantia = getGarantiaById(tratativa.garantiaId);

  tratativas[index] = { ...tratativas[index], status: 'Recusada' };
  saveToStorage('tratativas_data', tratativas);

  if (garantia) {
    // Reverter status da garantia se não há outras tratativas ativas
    const outrasTratativas = tratativas.filter(t => t.garantiaId === garantia.id && t.status === 'Em Andamento');
    if (outrasTratativas.length === 0) {
      updateGarantia(garantia.id, { status: 'Ativa' });
    }

    addTimelineEntry({
      garantiaId: garantia.id, dataHora: new Date().toISOString(), tipo: 'tratativa',
      titulo: 'Tratativa Recusada pelo Gestor',
      descricao: `Tratativa ${tratativa.tipo} recusada por ${gestorNome}. Motivo: ${motivo}`,
      usuarioId: gestorId, usuarioNome: gestorNome
    });

    addTimelineUnificada({
      entidadeId: garantia.id, entidadeTipo: 'Garantia', dataHora: new Date().toISOString(),
      tipo: 'recusa_tratativa', titulo: 'Tratativa Recusada',
      descricao: `Tratativa ${tratativa.tipo} da garantia ${garantia.id} recusada. Motivo: ${motivo}`,
      usuarioId: gestorId, usuarioNome: gestorNome
    });
  }

  return { sucesso: true };
};

// ==================== ORQUESTRADOR ATÔMICO DE TRATATIVA ====================

export interface ProcessarTratativaRequest {
  garantiaId: string;
  tipo: TratativaGarantia['tipo'];
  descricao: string;
  usuarioId: string;
  usuarioNome: string;
  aparelhoSelecionado?: Produto | null;
}

export const processarTratativaGarantia = (dados: ProcessarTratativaRequest): { sucesso: boolean; osId?: string; erro?: string } => {
  const garantia = getGarantiaById(dados.garantiaId);
  if (!garantia) return { sucesso: false, erro: 'Garantia não encontrada' };

  // Validação de status - impedir tratativa em garantias expiradas/concluídas
  if (garantia.status === 'Expirada') {
    return { sucesso: false, erro: 'Não é possível abrir tratativa para garantia expirada' };
  }
  if (garantia.status === 'Concluída') {
    return { sucesso: false, erro: 'Não é possível abrir tratativa para garantia concluída' };
  }

  try {
    let osId: string | undefined;
    const agora = new Date().toISOString();

    // 1. Criar OS automática (Assistência ou Assistência + Empréstimo)
    if (dados.tipo === 'Encaminhado Assistência' || dados.tipo === 'Assistência + Empréstimo') {
      const observacaoEmprestimo = dados.tipo === 'Assistência + Empréstimo' && dados.aparelhoSelecionado
        ? `\n[EMPRÉSTIMO] Cliente com aparelho emprestado: ${dados.aparelhoSelecionado.modelo} (IMEI: ${dados.aparelhoSelecionado.imei})`
        : '';

      const statusOS = 'Aguardando Análise' as const;

      const novaOS = addOrdemServico({
        dataHora: agora, clienteId: garantia.clienteId, setor: 'GARANTIA',
        tecnicoId: '', lojaId: garantia.lojaVenda, status: statusOS,
        proximaAtuacao: 'Técnico: Avaliar/Executar', pecas: [], pagamentos: [],
        descricao: `${dados.descricao}${observacaoEmprestimo}`,
        timeline: [{ data: agora, tipo: 'registro', descricao: `OS criada automaticamente via Garantia ${garantia.id}`, responsavel: dados.usuarioNome }],
        valorTotal: 0, custoTotal: 0, origemOS: 'Garantia', garantiaId: garantia.id,
        modeloAparelho: garantia.modelo, imeiAparelho: garantia.imei,
      });
      osId = novaOS.id;

      addTimelineEntry({
        garantiaId: garantia.id, dataHora: agora, tipo: 'os_criada',
        titulo: `OS criada: ${osId}`,
        descricao: `Ordem de serviço ${osId} criada automaticamente para reparo`,
        usuarioId: dados.usuarioId, usuarioNome: dados.usuarioNome
      });

      addTimelineUnificada({
        entidadeId: garantia.id, entidadeTipo: 'Garantia', dataHora: agora,
        tipo: 'os_criada', titulo: `OS ${osId} criada via Garantia`,
        descricao: `OS ${osId} criada automaticamente para garantia ${garantia.id}`,
        usuarioId: dados.usuarioId, usuarioNome: dados.usuarioNome
      });

      if (dados.tipo === 'Assistência + Empréstimo') {
        encaminharParaAnaliseGarantia(
          garantia.id, 'Garantia',
          `${garantia.clienteNome} - ${garantia.modelo} (IMEI: ${garantia.imei}) - Assistência + Empréstimo`
        );
      }
    }

    // 2. Executar ações de estoque imediatamente (sem aprovação)
    if (dados.tipo === 'Assistência + Empréstimo' && dados.aparelhoSelecionado) {
      updateProduto(dados.aparelhoSelecionado.id, {
        statusEmprestimo: 'Empréstimo - Assistência',
        emprestimoGarantiaId: garantia.id,
        emprestimoClienteId: garantia.clienteId,
        emprestimoClienteNome: garantia.clienteNome,
        emprestimoOsId: osId,
        emprestimoDataHora: agora,
      });
      addMovimentacao({
        data: agora, produto: dados.aparelhoSelecionado.modelo, imei: dados.aparelhoSelecionado.imei,
        quantidade: 1, origem: garantia.lojaVenda, destino: 'Empréstimo - Garantia',
        responsavel: dados.usuarioNome, motivo: `Empréstimo garantia ${garantia.id}`
      });

      addTimelineEntry({
        garantiaId: garantia.id, dataHora: agora, tipo: 'emprestimo',
        titulo: 'Aparelho emprestado',
        descricao: `${dados.aparelhoSelecionado.modelo} (IMEI: ${dados.aparelhoSelecionado.imei}) emprestado ao cliente`,
        usuarioId: dados.usuarioId, usuarioNome: dados.usuarioNome
      });
    }

    if (dados.tipo === 'Troca Direta' && dados.aparelhoSelecionado) {
      // 1. Marcar aparelho novo como "Troca - Garantia" e dar baixa
      updateProduto(dados.aparelhoSelecionado.id, { 
        bloqueadoEmTrocaGarantiaId: garantia.id,
        quantidade: 0 
      });
      addMovimentacao({
        data: agora, produto: dados.aparelhoSelecionado.modelo, imei: dados.aparelhoSelecionado.imei,
        quantidade: 1, origem: garantia.lojaVenda, destino: 'Troca - Garantia',
        responsavel: dados.usuarioNome, motivo: `Troca direta garantia ${garantia.id}`
      });

      // 2. Registrar aparelho defeituoso do cliente em Aparelhos Pendentes
      addProdutoPendente({
        imei: garantia.imei,
        marca: 'Apple',
        modelo: garantia.modelo,
        cor: dados.aparelhoSelecionado.cor || '-',
        tipo: 'Seminovo',
        condicao: 'Semi-novo',
        origemEntrada: 'Garantia',
        notaOuVendaId: `GAR-${garantia.id}`,
        valorCusto: 0,
        valorOrigem: 0,
        saudeBateria: 0,
        loja: garantia.lojaVenda,
        dataEntrada: agora.split('T')[0],
        motivoAssistencia: `Defeito relatado na Garantia ID #${garantia.id}`,
      } as any, true);

      // 3. Gerar Nota de Venda (modelo garantia) com custo e lucro zerados
      addVenda({
        dataHora: agora,
        lojaVenda: garantia.lojaVenda,
        vendedor: dados.usuarioId,
        clienteId: garantia.clienteId,
        clienteNome: garantia.clienteNome,
        clienteCpf: '',
        clienteTelefone: garantia.clienteTelefone || '',
        clienteEmail: garantia.clienteEmail || '',
        clienteCidade: '',
        origemVenda: 'Troca Garantia',
        localRetirada: garantia.lojaVenda,
        tipoRetirada: 'Retirada Balcão',
        taxaEntrega: 0,
        itens: [{
          id: `ITEM-GAR-${garantia.id}`,
          produtoId: dados.aparelhoSelecionado.id,
          produto: dados.aparelhoSelecionado.modelo,
          imei: dados.aparelhoSelecionado.imei,
          quantidade: 1,
          valorRecomendado: 0,
          valorCusto: 0,
          valorVenda: 0,
          categoria: 'Apple',
          loja: garantia.lojaVenda,
        }],
        tradeIns: [{
          id: `TI-GAR-${garantia.id}`,
          modelo: garantia.modelo,
          descricao: 'Entrada de Garantia',
          imei: garantia.imei,
          valorCompraUsado: 0,
          imeiValidado: true,
          condicao: 'Semi-novo',
        }],
        acessorios: [],
        pagamentos: [],
        subtotal: 0,
        totalTradeIn: 0,
        total: 0,
        lucro: 0,
        margem: 0,
        observacoes: `Troca Direta - Garantia ${garantia.id}. Aparelho defeituoso IMEI: ${garantia.imei}. Aparelho novo: ${dados.aparelhoSelecionado.modelo} IMEI: ${dados.aparelhoSelecionado.imei}.`,
        status: 'Concluída',
      });

      // 4. Encaminhar para análise
      encaminharParaAnaliseGarantia(
        garantia.id, 'Garantia',
        `${garantia.clienteNome} - ${garantia.modelo} (IMEI: ${garantia.imei}) - Troca Direta`
      );

      addTimelineEntry({
        garantiaId: garantia.id, dataHora: agora, tipo: 'troca',
        titulo: 'Nota de Venda Garantia Gerada',
        descricao: `Nota de venda com custo zerado gerada. Aparelho defeituoso (IMEI: ${garantia.imei}) encaminhado para Aparelhos Pendentes.`,
        usuarioId: dados.usuarioId, usuarioNome: dados.usuarioNome
      });
    }

    // 3. Registrar tratativa — todas com status 'Em Andamento'
    const novaTratativa = addTratativa({
      garantiaId: garantia.id, tipo: dados.tipo, dataHora: agora,
      usuarioId: dados.usuarioId, usuarioNome: dados.usuarioNome,
      descricao: dados.descricao,
      aparelhoEmprestadoId: dados.tipo === 'Assistência + Empréstimo' ? dados.aparelhoSelecionado?.id : undefined,
      aparelhoEmprestadoModelo: dados.tipo === 'Assistência + Empréstimo' ? dados.aparelhoSelecionado?.modelo : undefined,
      aparelhoEmprestadoImei: dados.tipo === 'Assistência + Empréstimo' ? dados.aparelhoSelecionado?.imei : undefined,
      aparelhoTrocaId: dados.tipo === 'Troca Direta' ? dados.aparelhoSelecionado?.id : undefined,
      aparelhoTrocaModelo: dados.tipo === 'Troca Direta' ? dados.aparelhoSelecionado?.modelo : undefined,
      aparelhoTrocaImei: dados.tipo === 'Troca Direta' ? dados.aparelhoSelecionado?.imei : undefined,
      osId: osId,
      status: 'Em Andamento'
    });

    // 4. Timeline genérica
    if (dados.tipo === 'Direcionado Apple') {
      addTimelineEntry({
        garantiaId: garantia.id, dataHora: agora, tipo: 'tratativa',
        titulo: 'Cliente Direcionado para Apple', descricao: dados.descricao,
        usuarioId: dados.usuarioId, usuarioNome: dados.usuarioNome
      });
    }

    // 5. Atualizar status da garantia
    updateGarantia(garantia.id, { status: 'Em Tratativa' });

    // Timeline unificada
    addTimelineUnificada({
      entidadeId: garantia.id, entidadeTipo: 'Garantia', dataHora: agora,
      tipo: 'tratativa_registrada', titulo: `Tratativa: ${dados.tipo}`,
      descricao: `Tratativa registrada para garantia ${garantia.id}. Ações de estoque executadas.`,
      usuarioId: dados.usuarioId, usuarioNome: dados.usuarioNome
    });

    return { sucesso: true, osId };
  } catch (error) {
    console.error('[GARANTIA] Erro ao processar tratativa:', error);
    return { sucesso: false, erro: 'Erro ao processar tratativa. Nenhuma alteração foi salva.' };
  }
};
