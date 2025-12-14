// Vendas API - Mock Data
import { generateProductId, registerProductId } from './idManager';

export interface ItemVenda {
  id: string;
  produtoId: string; // PROD-XXXX - ID único e persistente do produto
  produto: string;
  imei: string;
  categoria: string;
  quantidade: number;
  valorRecomendado: number;
  valorVenda: number;
  valorCusto: number;
  loja: string;
}

export interface ItemTradeIn {
  id: string;
  produtoId?: string; // PROD-XXXX - ID único gerado para o produto de trade-in
  modelo: string;
  descricao: string;
  imei: string;
  valorAbatimento: number;
  imeiValidado: boolean;
  condicao: 'Novo' | 'Semi-novo';
}

export interface Pagamento {
  id: string;
  meioPagamento: string;
  valor: number;
  contaDestino: string;
}

export interface Venda {
  id: string;
  numero: number;
  dataHora: string;
  lojaVenda: string;
  vendedor: string;
  clienteId: string;
  clienteNome: string;
  clienteCpf: string;
  clienteTelefone: string;
  clienteEmail: string;
  clienteCidade: string;
  origemVenda: string;
  localRetirada: string;
  tipoRetirada: 'Retirada Balcão' | 'Entrega' | 'Retirada em Outra Loja';
  taxaEntrega: number;
  itens: ItemVenda[];
  tradeIns: ItemTradeIn[];
  pagamentos: Pagamento[];
  subtotal: number;
  totalTradeIn: number;
  total: number;
  lucro: number;
  margem: number;
  observacoes: string;
  status: 'Concluída' | 'Cancelada' | 'Pendente';
}

export interface HistoricoCompraCliente {
  id: string;
  data: string;
  produto: string;
  valor: number;
}

// Dados mockados - IDs PROD-XXXX únicos e consistentes com estoqueApi
let vendas: Venda[] = [
  {
    id: 'VEN-2025-0001',
    numero: 1,
    dataHora: '2025-01-15T10:30:00',
    lojaVenda: 'LOJA-001',
    vendedor: 'COL-004',
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    clienteCpf: '123.456.789-00',
    clienteTelefone: '(11) 99999-1111',
    clienteEmail: 'joao@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Loja Física',
    localRetirada: 'LOJA-001',
    tipoRetirada: 'Retirada Balcão',
    taxaEntrega: 0,
    itens: [
      {
        id: 'ITEM-001',
        produtoId: 'PROD-0010',
        produto: 'iPhone 15 Pro Max',
        imei: '352123456789012',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 15120.00,
        valorVenda: 14500.00,
        valorCusto: 7200.00,
        loja: 'Loja Centro'
      }
    ],
    tradeIns: [],
    pagamentos: [
      { id: 'PAG-001', meioPagamento: 'Pix', valor: 14500.00, contaDestino: 'CTA-001' }
    ],
    subtotal: 14500.00,
    totalTradeIn: 0,
    total: 14500.00,
    lucro: 7300.00,
    margem: 101.39,
    observacoes: '',
    status: 'Concluída'
  },
  {
    id: 'VEN-2025-0002',
    numero: 2,
    dataHora: '2025-01-16T14:15:00',
    lojaVenda: 'LOJA-002',
    vendedor: 'COL-004',
    clienteId: 'CLI-002',
    clienteNome: 'Maria Santos',
    clienteCpf: '234.567.890-11',
    clienteTelefone: '(11) 99999-2222',
    clienteEmail: 'maria@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'WhatsApp',
    localRetirada: 'LOJA-002',
    tipoRetirada: 'Entrega',
    taxaEntrega: 50.00,
    itens: [
      {
        id: 'ITEM-002',
        produtoId: 'PROD-0011',
        produto: 'iPhone 15 Pro',
        imei: '352123456789013',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 13440.00,
        valorVenda: 12800.00,
        valorCusto: 6400.00,
        loja: 'Loja Norte'
      }
    ],
    tradeIns: [
      {
        id: 'TRADE-001',
        produtoId: 'PROD-0006',
        modelo: 'iPhone 12',
        descricao: 'Tela em ótimo estado, bateria 75%',
        imei: '999888777666555',
        valorAbatimento: 1500.00,
        imeiValidado: true,
        condicao: 'Semi-novo'
      }
    ],
    pagamentos: [
      { id: 'PAG-002', meioPagamento: 'Cartão Crédito', valor: 8000.00, contaDestino: 'CTA-003' },
      { id: 'PAG-003', meioPagamento: 'Pix', valor: 3350.00, contaDestino: 'CTA-002' }
    ],
    subtotal: 12800.00,
    totalTradeIn: 1500.00,
    total: 11350.00,
    lucro: 4950.00,
    margem: 77.34,
    observacoes: 'Cliente VIP - desconto especial aplicado',
    status: 'Concluída'
  },
  {
    id: 'VEN-2025-0003',
    numero: 3,
    dataHora: '2025-01-17T09:45:00',
    lojaVenda: 'LOJA-004',
    vendedor: 'COL-004',
    clienteId: 'CLI-003',
    clienteNome: 'Pedro Oliveira',
    clienteCpf: '345.678.901-22',
    clienteTelefone: '(11) 99999-3333',
    clienteEmail: 'pedro@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Mercado Livre',
    localRetirada: 'LOJA-001',
    tipoRetirada: 'Retirada em Outra Loja',
    taxaEntrega: 0,
    itens: [
      {
        id: 'ITEM-003',
        produtoId: 'PROD-0012',
        produto: 'iPhone 14 Pro',
        imei: '352123456789014',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 6840.00,
        valorVenda: 6500.00,
        valorCusto: 3800.00,
        loja: 'Loja Shopping'
      }
    ],
    tradeIns: [],
    pagamentos: [
      { id: 'PAG-004', meioPagamento: 'Transferência', valor: 6500.00, contaDestino: 'CTA-003' }
    ],
    subtotal: 6500.00,
    totalTradeIn: 0,
    total: 6500.00,
    lucro: 2700.00,
    margem: 41.54,
    observacoes: 'Venda via Mercado Livre',
    status: 'Concluída'
  },
  {
    id: 'VEN-2025-0004',
    numero: 4,
    dataHora: '2025-01-18T16:20:00',
    lojaVenda: 'LOJA-003',
    vendedor: 'COL-004',
    clienteId: 'CLI-004',
    clienteNome: 'Ana Costa',
    clienteCpf: '456.789.012-33',
    clienteTelefone: '(11) 99999-4444',
    clienteEmail: 'ana@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Online',
    localRetirada: 'LOJA-003',
    tipoRetirada: 'Retirada Balcão',
    taxaEntrega: 0,
    itens: [
      {
        id: 'ITEM-004',
        produtoId: 'PROD-0014',
        produto: 'iPhone 15',
        imei: '352123456789016',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 10920.00,
        valorVenda: 10500.00,
        valorCusto: 5200.00,
        loja: 'Loja Sul'
      }
    ],
    tradeIns: [],
    pagamentos: [
      { id: 'PAG-005', meioPagamento: 'Cartão Débito', valor: 10500.00, contaDestino: 'CTA-005' }
    ],
    subtotal: 10500.00,
    totalTradeIn: 0,
    total: 10500.00,
    lucro: 5300.00,
    margem: 50.48,
    observacoes: '',
    status: 'Concluída'
  },
  {
    id: 'VEN-2025-0005',
    numero: 5,
    dataHora: '2025-01-19T11:00:00',
    lojaVenda: 'LOJA-005',
    vendedor: 'COL-004',
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    clienteCpf: '123.456.789-00',
    clienteTelefone: '(11) 99999-1111',
    clienteEmail: 'joao@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Indicação',
    localRetirada: 'LOJA-005',
    tipoRetirada: 'Retirada Balcão',
    taxaEntrega: 0,
    itens: [
      {
        id: 'ITEM-005',
        produtoId: 'PROD-0016',
        produto: 'iPhone 14 Plus',
        imei: '352123456789018',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 12180.00,
        valorVenda: 11500.00,
        valorCusto: 5800.00,
        loja: 'Loja Oeste'
      }
    ],
    tradeIns: [
      {
        id: 'TRADE-002',
        produtoId: 'PROD-0007',
        modelo: 'iPhone 11',
        descricao: 'Seminovo, funcionando perfeitamente',
        imei: '888777666555444',
        valorAbatimento: 1200.00,
        imeiValidado: true,
        condicao: 'Semi-novo'
      }
    ],
    pagamentos: [
      { id: 'PAG-006', meioPagamento: 'Dinheiro', valor: 10300.00, contaDestino: 'CTA-001' }
    ],
    subtotal: 11500.00,
    totalTradeIn: 1200.00,
    total: 10300.00,
    lucro: 4500.00,
    margem: 77.59,
    observacoes: 'Cliente retorno - segunda compra este mês',
    status: 'Concluída'
  },
  // Vendas com PREJUÍZO
  {
    id: 'VEN-2025-0006',
    numero: 6,
    dataHora: '2025-01-20T14:00:00',
    lojaVenda: 'LOJA-002',
    vendedor: 'COL-004',
    clienteId: 'CLI-003',
    clienteNome: 'Pedro Oliveira',
    clienteCpf: '345.678.901-22',
    clienteTelefone: '(11) 99999-3333',
    clienteEmail: 'pedro@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'WhatsApp',
    localRetirada: 'LOJA-002',
    tipoRetirada: 'Retirada Balcão',
    taxaEntrega: 0,
    itens: [
      {
        id: 'ITEM-006',
        produtoId: 'PROD-0020',
        produto: 'iPhone 14 Pro Max',
        imei: '352123456789022',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 8500.00,
        valorVenda: 5800.00,
        valorCusto: 6200.00,
        loja: 'Loja Norte'
      }
    ],
    tradeIns: [],
    pagamentos: [
      { id: 'PAG-007', meioPagamento: 'Pix', valor: 5800.00, contaDestino: 'CTA-002' }
    ],
    subtotal: 5800.00,
    totalTradeIn: 0,
    total: 5800.00,
    lucro: -400.00,
    margem: -6.45,
    observacoes: 'Venda promocional - cliente exigiu desconto alto',
    status: 'Concluída'
  },
  {
    id: 'VEN-2025-0007',
    numero: 7,
    dataHora: '2025-01-21T09:15:00',
    lojaVenda: 'LOJA-003',
    vendedor: 'COL-004',
    clienteId: 'CLI-004',
    clienteNome: 'Ana Costa',
    clienteCpf: '456.789.012-33',
    clienteTelefone: '(11) 99999-4444',
    clienteEmail: 'ana@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Mercado Livre',
    localRetirada: 'LOJA-003',
    tipoRetirada: 'Entrega',
    taxaEntrega: 50.00,
    itens: [
      {
        id: 'ITEM-007',
        produtoId: 'PROD-0021',
        produto: 'iPhone 13',
        imei: '352123456789023',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 5200.00,
        valorVenda: 3900.00,
        valorCusto: 4100.00,
        loja: 'Loja Sul'
      }
    ],
    tradeIns: [],
    pagamentos: [
      { id: 'PAG-008', meioPagamento: 'Cartão Crédito', valor: 3950.00, contaDestino: 'CTA-003' }
    ],
    subtotal: 3900.00,
    totalTradeIn: 0,
    total: 3950.00,
    lucro: -150.00,
    margem: -3.66,
    observacoes: 'Venda ML com taxa alta - prejuízo calculado',
    status: 'Concluída'
  }
];

// Histórico de compras por cliente (mockado)
const historicoComprasCliente: Record<string, HistoricoCompraCliente[]> = {
  'CLI-001': [
    { id: 'HC-001', data: '2024-12-15', produto: 'AirPods Pro 2', valor: 2499.00 },
    { id: 'HC-002', data: '2024-11-20', produto: 'Capa iPhone 15', valor: 299.00 },
    { id: 'HC-003', data: '2024-10-05', produto: 'iPhone 14', valor: 5990.00 }
  ],
  'CLI-002': [
    { id: 'HC-004', data: '2024-11-10', produto: 'Apple Watch Series 9', valor: 4799.00 },
    { id: 'HC-005', data: '2024-09-25', produto: 'MacBook Air M2', valor: 11999.00 },
    { id: 'HC-006', data: '2024-08-12', produto: 'iPad Pro 11"', valor: 8999.00 }
  ],
  'CLI-003': [
    { id: 'HC-007', data: '2024-10-30', produto: 'AirPods 3', valor: 1699.00 },
    { id: 'HC-008', data: '2024-07-18', produto: 'MagSafe Charger', valor: 399.00 }
  ],
  'CLI-004': [
    { id: 'HC-009', data: '2024-12-01', produto: 'iPhone 13 Mini', valor: 4299.00 }
  ],
  'CLI-005': []
};

let vendaCounter = vendas.length;

// Funções de API
export const getVendas = (): Venda[] => {
  return [...vendas];
};

export const getVendaById = (id: string): Venda | null => {
  return vendas.find(v => v.id === id) || null;
};

export const addVenda = (venda: Omit<Venda, 'id' | 'numero'>): Venda => {
  vendaCounter++;
  const year = new Date().getFullYear();
  const newId = `VEN-${year}-${String(vendaCounter).padStart(4, '0')}`;
  
  // Gerar IDs para trade-ins que ainda não têm
  const tradeInsComIds = venda.tradeIns.map(ti => {
    if (!ti.produtoId) {
      ti.produtoId = generateProductId();
    }
    return ti;
  });
  
  const newVenda: Venda = {
    ...venda,
    id: newId,
    numero: vendaCounter,
    tradeIns: tradeInsComIds
  };
  vendas.push(newVenda);
  return newVenda;
};

export const getHistoricoComprasCliente = (clienteId: string): HistoricoCompraCliente[] => {
  return historicoComprasCliente[clienteId] || [];
};

export const getNextVendaNumber = (): { id: string; numero: number } => {
  const year = new Date().getFullYear();
  const nextNum = vendaCounter + 1;
  return {
    id: `VEN-${year}-${String(nextNum).padStart(4, '0')}`,
    numero: nextNum
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const exportVendasToCSV = (data: Venda[], filename: string) => {
  if (data.length === 0) return;
  
  const csvData = data.map(v => ({
    'ID': v.id,
    'Data/Hora': new Date(v.dataHora).toLocaleString('pt-BR'),
    'Loja': v.lojaVenda,
    'Vendedor': v.vendedor,
    'Cliente': v.clienteNome,
    'CPF': v.clienteCpf,
    'Origem': v.origemVenda,
    'Subtotal': v.subtotal,
    'Base de Troca': v.totalTradeIn,
    'Total': v.total,
    'Lucro': v.lucro,
    'Margem %': v.margem.toFixed(2),
    'Status': v.status
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
