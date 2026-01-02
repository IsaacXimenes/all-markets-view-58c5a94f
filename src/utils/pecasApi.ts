// API para gestão de Peças no Estoque

export interface Peca {
  id: string;
  descricao: string;
  lojaId: string;
  modelo: string; // Modelo do celular compatível
  valorCusto: number;
  valorRecomendado: number;
  quantidade: number;
  dataEntrada: string;
  origem: 'Nota de Compra' | 'Manual' | 'Solicitação';
  notaCompraId?: string;
  status: 'Disponível' | 'Reservada' | 'Utilizada';
}

// Mock de peças
let pecas: Peca[] = [
  {
    id: 'PEC-0001',
    descricao: 'Tela LCD iPhone 14 Pro Max',
    lojaId: 'LOJA-001',
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
    lojaId: 'LOJA-001',
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
    lojaId: 'LOJA-002',
    modelo: 'iPhone 15',
    valorCusto: 280.00,
    valorRecomendado: 400.00,
    quantidade: 2,
    dataEntrada: '2024-12-15T09:00:00',
    origem: 'Manual',
    status: 'Disponível'
  },
  {
    id: 'PEC-0004',
    descricao: 'Conector de Carga iPhone 12',
    lojaId: 'LOJA-001',
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
    lojaId: 'LOJA-002',
    modelo: 'iPhone 14',
    valorCusto: 55.00,
    valorRecomendado: 100.00,
    quantidade: 4,
    dataEntrada: '2024-12-05T16:00:00',
    origem: 'Solicitação',
    status: 'Disponível'
  }
];

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
