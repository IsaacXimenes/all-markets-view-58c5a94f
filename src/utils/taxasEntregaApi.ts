// API para Taxas de Entrega (Delivery Fees)

export interface LogAlteracao {
  id: string;
  data: string;
  usuarioId: string;
  usuarioNome: string;
  valorAnterior: number;
  valorNovo: number;
  acao: 'criacao' | 'edicao' | 'status';
}

export interface TaxaEntrega {
  id: string;
  local: string;
  valor: number;
  status: 'Ativo' | 'Inativo';
  dataCriacao: string;
  dataAtualizacao: string;
  logs: LogAlteracao[];
}

const STORAGE_KEY = 'taxas_entrega';

// Dados mockados iniciais
// Dados mockados iniciais - ordenados alfabeticamente com IDs sequenciais
const taxasIniciais: TaxaEntrega[] = [
  { id: 'TX-001', local: 'Águas Claras', valor: 40.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-002', local: 'Asa Norte', valor: 30.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-003', local: 'Asa Sul', valor: 30.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-004', local: 'Ceilândia', valor: 50.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-005', local: 'Cruzeiro', valor: 25.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-006', local: 'Gama', valor: 55.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-007', local: 'Guará I', valor: 35.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-008', local: 'Guará II', valor: 35.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-009', local: 'Lago Norte', valor: 40.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-010', local: 'Lago Sul', valor: 40.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-011', local: 'Noroeste', valor: 30.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-012', local: 'Núcleo Bandeirante', valor: 45.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-013', local: 'Octogonal', valor: 30.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-014', local: 'Park Sul', valor: 35.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-015', local: 'Planaltina', valor: 60.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-016', local: 'Recanto das Emas', valor: 60.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-017', local: 'Riacho Fundo I', valor: 50.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-018', local: 'Riacho Fundo II', valor: 55.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-019', local: 'Samambaia', valor: 55.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-020', local: 'Santa Maria', valor: 60.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-021', local: 'SIA', valor: 35.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-022', local: 'Sobradinho', valor: 50.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-023', local: 'Sudoeste', valor: 25.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-024', local: 'Taguatinga', valor: 45.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] },
  { id: 'TX-025', local: 'Vicente Pires', valor: 45.00, status: 'Ativo', dataCriacao: '2024-01-01', dataAtualizacao: '2024-01-01', logs: [] }
];

// Inicializar storage
const initStorage = (): TaxaEntrega[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taxasIniciais));
    return taxasIniciais;
  }
  return JSON.parse(stored);
};

// Gerar ID único
const gerarId = (): string => {
  const taxas = getTaxasEntrega();
  const maxNum = taxas.reduce((max, t) => {
    const num = parseInt(t.id.replace('TX-', ''));
    return num > max ? num : max;
  }, 0);
  return `TX-${String(maxNum + 1).padStart(3, '0')}`;
};

// CRUD Operations
export const getTaxasEntrega = (): TaxaEntrega[] => {
  return initStorage();
};

export const getTaxasEntregaAtivas = (): TaxaEntrega[] => {
  return getTaxasEntrega().filter(t => t.status === 'Ativo');
};

export const getTaxaEntregaById = (id: string): TaxaEntrega | undefined => {
  return getTaxasEntrega().find(t => t.id === id);
};

export const getTaxaEntregaByLocal = (local: string): TaxaEntrega | undefined => {
  return getTaxasEntrega().find(t => t.local.toLowerCase() === local.toLowerCase());
};

export const addTaxaEntrega = (
  local: string, 
  valor: number, 
  usuarioId: string, 
  usuarioNome: string
): TaxaEntrega => {
  const taxas = getTaxasEntrega();
  const agora = new Date().toISOString();
  
  const novaTaxa: TaxaEntrega = {
    id: gerarId(),
    local,
    valor,
    status: 'Ativo',
    dataCriacao: agora,
    dataAtualizacao: agora,
    logs: [{
      id: `LOG-${Date.now()}`,
      data: agora,
      usuarioId,
      usuarioNome,
      valorAnterior: 0,
      valorNovo: valor,
      acao: 'criacao'
    }]
  };
  
  taxas.push(novaTaxa);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(taxas));
  
  return novaTaxa;
};

export const updateTaxaEntrega = (
  id: string,
  valor: number,
  usuarioId: string,
  usuarioNome: string
): TaxaEntrega | null => {
  const taxas = getTaxasEntrega();
  const index = taxas.findIndex(t => t.id === id);
  
  if (index === -1) return null;
  
  const taxa = taxas[index];
  const agora = new Date().toISOString();
  
  const log: LogAlteracao = {
    id: `LOG-${Date.now()}`,
    data: agora,
    usuarioId,
    usuarioNome,
    valorAnterior: taxa.valor,
    valorNovo: valor,
    acao: 'edicao'
  };
  
  taxa.valor = valor;
  taxa.dataAtualizacao = agora;
  taxa.logs.push(log);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(taxas));
  
  return taxa;
};

export const toggleStatusTaxaEntrega = (
  id: string,
  usuarioId: string,
  usuarioNome: string
): TaxaEntrega | null => {
  const taxas = getTaxasEntrega();
  const index = taxas.findIndex(t => t.id === id);
  
  if (index === -1) return null;
  
  const taxa = taxas[index];
  const agora = new Date().toISOString();
  
  const log: LogAlteracao = {
    id: `LOG-${Date.now()}`,
    data: agora,
    usuarioId,
    usuarioNome,
    valorAnterior: taxa.valor,
    valorNovo: taxa.valor,
    acao: 'status'
  };
  
  taxa.status = taxa.status === 'Ativo' ? 'Inativo' : 'Ativo';
  taxa.dataAtualizacao = agora;
  taxa.logs.push(log);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(taxas));
  
  return taxa;
};

export const updateTaxaLocal = (
  id: string,
  local: string
): TaxaEntrega | null => {
  const taxas = getTaxasEntrega();
  const index = taxas.findIndex(t => t.id === id);
  
  if (index === -1) return null;
  
  taxas[index].local = local;
  taxas[index].dataAtualizacao = new Date().toISOString();
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(taxas));
  
  return taxas[index];
};

export const deleteTaxaEntrega = (id: string): boolean => {
  const taxas = getTaxasEntrega();
  const filtradas = taxas.filter(t => t.id !== id);
  
  if (filtradas.length === taxas.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtradas));
  return true;
};
