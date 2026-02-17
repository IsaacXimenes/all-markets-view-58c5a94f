// API para gestão de Peças no Estoque

export interface MovimentacaoPeca {
  id: string;
  pecaId: string;
  tipo: 'Entrada' | 'Saída' | 'Reserva';
  quantidade: number;
  data: string;
  osId?: string;
  descricao: string;
}

let movimentacoesPecas: MovimentacaoPeca[] = [];
let nextMovId = 1;

export interface Peca {
  id: string;
  descricao: string;
  lojaId: string;
  modelo: string; // Modelo do celular compatível
  valorCusto: number;
  valorRecomendado: number;
  quantidade: number;
  dataEntrada: string;
  origem: 'Nota de Compra' | 'Manual' | 'Produto Thiago' | 'Solicitação' | 'Retirada de Peça';
  notaCompraId?: string;
  status: 'Disponível' | 'Reservada' | 'Utilizada';
}

// Mock de peças
// Os IDs de loja serão inicializados dinamicamente para corresponder aos UUIDs do CadastroStore
// A função initializePecasWithLojaIds deve ser chamada após o CadastroStore ser inicializado
let pecas: Peca[] = [];

// Dados base das peças (sem lojaId definido)
const pecasBase: Omit<Peca, 'lojaId'>[] = [
  {
    id: 'PEC-0001',
    descricao: 'Tela LCD iPhone 14 Pro Max',
    modelo: 'iPhone 14 Pro Max',
    valorCusto: 450.00,
    valorRecomendado: 650.00,
    quantidade: 3,
    dataEntrada: '2024-12-20T10:00:00',
    origem: 'Nota de Compra',
    notaCompraId: 'NC-001',
    status: 'Disponível'
  },
  {
    id: 'PEC-0002',
    descricao: 'Bateria iPhone 13',
    modelo: 'iPhone 13',
    valorCusto: 120.00,
    valorRecomendado: 200.00,
    quantidade: 5,
    dataEntrada: '2024-12-18T14:30:00',
    origem: 'Nota de Compra',
    notaCompraId: 'NC-001',
    status: 'Disponível'
  },
  {
    id: 'PEC-0003',
    descricao: 'Câmera Traseira iPhone 15',
    modelo: 'iPhone 15',
    valorCusto: 280.00,
    valorRecomendado: 400.00,
    quantidade: 2,
    dataEntrada: '2024-12-15T09:00:00',
    origem: 'Produto Thiago',
    status: 'Disponível'
  },
  {
    id: 'PEC-0004',
    descricao: 'Conector de Carga iPhone 12',
    modelo: 'iPhone 12',
    valorCusto: 80.00,
    valorRecomendado: 150.00,
    quantidade: 8,
    dataEntrada: '2024-12-10T11:00:00',
    origem: 'Nota de Compra',
    notaCompraId: 'NC-002',
    status: 'Disponível'
  },
  {
    id: 'PEC-0005',
    descricao: 'Alto-falante iPhone 14',
    modelo: 'iPhone 14',
    valorCusto: 55.00,
    valorRecomendado: 100.00,
    quantidade: 4,
    dataEntrada: '2024-12-05T16:00:00',
    origem: 'Solicitação',
    status: 'Disponível'
  }
];

// Função para inicializar peças com IDs de loja válidos do CadastroStore
export const initializePecasWithLojaIds = (lojaIds: string[]): void => {
  if (pecas.length > 0) return; // Já inicializado
  
  pecas = pecasBase.map((peca, index) => ({
    ...peca,
    lojaId: lojaIds[index % lojaIds.length] || lojaIds[0] || ''
  }));

  // Criar movimentações de entrada iniciais
  movimentacoesPecas = pecas.map((peca) => ({
    id: `MOV-${String(nextMovId++).padStart(4, '0')}`,
    pecaId: peca.id,
    tipo: 'Entrada' as const,
    quantidade: peca.quantidade,
    data: peca.dataEntrada,
    descricao: `Entrada inicial - ${peca.origem}${peca.notaCompraId ? ` (${peca.notaCompraId})` : ''}`
  }));
};

let nextPecaId = 6;

export const getPecas = (): Peca[] => {
  return [...pecas];
};

export const getPecaById = (id: string): Peca | undefined => {
  return pecas.find(p => p.id === id);
};

// Buscar peça por descrição (para integração com assistenciaApi)
export const getPecaByDescricao = (descricao: string): Peca | undefined => {
  const descricaoLower = descricao.toLowerCase();
  return pecas.find(p => p.descricao.toLowerCase().includes(descricaoLower));
};

export const addPeca = (peca: Omit<Peca, 'id'>): Peca => {
  const newPeca: Peca = {
    ...peca,
    id: `PEC-${String(nextPecaId++).padStart(4, '0')}`
  };
  pecas.push(newPeca);

  // Registrar movimentação de entrada
  movimentacoesPecas.push({
    id: `MOV-${String(nextMovId++).padStart(4, '0')}`,
    pecaId: newPeca.id,
    tipo: 'Entrada',
    quantidade: newPeca.quantidade,
    data: newPeca.dataEntrada,
    descricao: `Entrada - ${newPeca.origem}`
  });

  return newPeca;
};

export const updatePeca = (id: string, updates: Partial<Peca>): Peca | null => {
  const index = pecas.findIndex(p => p.id === id);
  if (index === -1) return null;
  pecas[index] = { ...pecas[index], ...updates };
  return pecas[index];
};

export const deletePeca = (id: string): boolean => {
  const index = pecas.findIndex(p => p.id === id);
  if (index === -1) return false;
  pecas.splice(index, 1);
  return true;
};

// Dar baixa em peça do estoque (decrementar quantidade ou marcar como utilizada)
export const darBaixaPeca = (id: string, quantidade: number = 1, osId?: string): { sucesso: boolean; mensagem: string } => {
  const peca = pecas.find(p => p.id === id);
  
  if (!peca) {
    return { sucesso: false, mensagem: `Peça ${id} não encontrada no estoque` };
  }
  
  if (peca.status !== 'Disponível') {
    return { sucesso: false, mensagem: `Peça ${peca.descricao} não está disponível (status: ${peca.status})` };
  }
  
  if (peca.quantidade < quantidade) {
    return { sucesso: false, mensagem: `Quantidade insuficiente de ${peca.descricao}. Disponível: ${peca.quantidade}, Solicitado: ${quantidade}` };
  }
  
  // Decrementar quantidade
  peca.quantidade -= quantidade;
  
  // Se zerou, marcar como utilizada
  if (peca.quantidade === 0) {
    peca.status = 'Utilizada';
  }

  // Registrar movimentação de saída
  movimentacoesPecas.push({
    id: `MOV-${String(nextMovId++).padStart(4, '0')}`,
    pecaId: id,
    tipo: 'Saída',
    quantidade,
    data: new Date().toISOString(),
    osId,
    descricao: `Baixa para OS${osId ? ` ${osId}` : ''} - ${peca.descricao}`
  });
  
  return { sucesso: true, mensagem: `Baixa de ${quantidade} unidade(s) de ${peca.descricao} realizada com sucesso` };
};

// Buscar movimentações por peça
export const getMovimentacoesByPecaId = (pecaId: string): MovimentacaoPeca[] => {
  return movimentacoesPecas
    .filter(m => m.pecaId === pecaId)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
};

// Adicionar movimentação manual
export const addMovimentacaoPeca = (mov: Omit<MovimentacaoPeca, 'id'>): MovimentacaoPeca => {
  const newMov: MovimentacaoPeca = {
    ...mov,
    id: `MOV-${String(nextMovId++).padStart(4, '0')}`
  };
  movimentacoesPecas.push(newMov);
  return newMov;
};

// Reservar peça (para uso futuro se necessário)
export const reservarPeca = (id: string): boolean => {
  const peca = pecas.find(p => p.id === id);
  if (!peca || peca.status !== 'Disponível') return false;
  peca.status = 'Reservada';
  return true;
};

// Liberar reserva de peça
export const liberarReservaPeca = (id: string): boolean => {
  const peca = pecas.find(p => p.id === id);
  if (!peca || peca.status !== 'Reservada') return false;
  peca.status = 'Disponível';
  return true;
};

export const exportPecasToCSV = (data: Peca[], filename: string): void => {
  const headers = ['ID', 'Descrição', 'Loja', 'Modelo', 'Valor Custo', 'Valor Recomendado', 'Quantidade', 'Data Entrada', 'Origem', 'Status'];
  const rows = data.map(p => [
    p.id,
    p.descricao,
    p.lojaId,
    p.modelo,
    p.valorCusto.toFixed(2),
    p.valorRecomendado.toFixed(2),
    p.quantidade.toString(),
    new Date(p.dataEntrada).toLocaleDateString('pt-BR'),
    p.origem,
    p.status
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
