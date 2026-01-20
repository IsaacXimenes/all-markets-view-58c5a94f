// Vendas API - Mock Data
import { generateProductId, registerProductId } from './idManager';
import { addProdutoPendente } from './osApi';
import { getProdutos, updateProduto, addMovimentacao } from './estoqueApi';
import { subtrairEstoqueAcessorio, VendaAcessorio } from './acessoriosApi';
import { criarPagamentosDeVenda } from './financeApi';
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
  valorCompraUsado: number; // Renomeado de valorAbatimento para clareza
  imeiValidado: boolean;
  condicao: 'Novo' | 'Semi-novo';
}

export interface Pagamento {
  id: string;
  meioPagamento: string;
  valor: number;
  contaDestino: string;
  parcelas?: number;        // Número de parcelas (1-18, obrigatório para cartão crédito)
  valorParcela?: number;    // Valor por parcela (valor / parcelas)
  descricao?: string;       // Campo livre opcional
  // Campos específicos para Fiado
  isFiado?: boolean;
  fiadoDataBase?: number;   // Dia do mês para vencimento (1-31)
  fiadoNumeroParcelas?: number; // Número de parcelas do fiado (1-10)
  // Campos para taxas de cartão
  taxaCartao?: number;      // Valor da taxa calculada
  valorComTaxa?: number;    // Valor total com taxa incluída
  maquinaId?: string;       // ID da máquina de cartão utilizada
}

export interface TimelineEdicaoVenda {
  id: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  tipo: 'edicao_gestor';
  alteracoes: {
    campo: string;
    valorAnterior: any;
    valorNovo: any;
  }[];
  descricao: string;
}

// Novo tipo para status do fluxo de vendas
export type StatusVenda = 
  | 'Aguardando Conferência'
  | 'Conferência Gestor'
  | 'Recusada - Gestor'
  | 'Conferência Financeiro'
  | 'Devolvido pelo Financeiro'
  | 'Finalizado'
  | 'Cancelada';

// Interface de aprovação
export interface RegistroAprovacao {
  usuarioId: string;
  usuarioNome: string;
  dataHora: string;
  motivo?: string;
}

// Interface de timeline do fluxo
export interface TimelineVenda {
  id: string;
  dataHora: string;
  tipo: 'criacao' | 'edicao' | 'aprovacao_lancamento' | 'recusa_gestor' | 'aprovacao_gestor' | 'devolucao_financeiro' | 'aprovacao_financeiro' | 'finalizacao';
  usuarioId: string;
  usuarioNome: string;
  descricao: string;
  alteracoes?: {
    campo: string;
    valorAnterior: any;
    valorNovo: any;
  }[];
  motivo?: string;
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
  motoboyId?: string;
  itens: ItemVenda[];
  tradeIns: ItemTradeIn[];
  acessorios?: VendaAcessorio[];
  pagamentos: Pagamento[];
  subtotal: number;
  totalTradeIn: number;
  total: number;
  lucro: number;
  margem: number;
  observacoes: string;
  status: 'Concluída' | 'Cancelada' | 'Pendente';
  motivoCancelamento?: string;
  comissaoVendedor?: number;
  timelineEdicoes?: TimelineEdicaoVenda[];
  
  // Campos do novo fluxo de vendas
  statusAtual?: StatusVenda;
  aprovacaoLancamento?: RegistroAprovacao;
  aprovacaoGestor?: RegistroAprovacao;
  recusaGestor?: RegistroAprovacao;
  devolucaoFinanceiro?: RegistroAprovacao;
  aprovacaoFinanceiro?: RegistroAprovacao;
  timeline?: TimelineVenda[];
  bloqueadoParaEdicao?: boolean;
  
  // Campos específicos para Sinal
  valorSinal?: number;
  valorPendenteSinal?: number;
  dataSinal?: string;
  observacaoSinal?: string;
}

export interface HistoricoCompraCliente {
  id: string;
  data: string;
  produto: string;
  valor: number;
}

// IDs reais das lojas e colaboradores do useCadastroStore (JSON mockado)
const LOJAS_VENDA = {
  JK_SHOPPING: 'db894e7d',
  MATRIZ: '3ac7e00c', 
  ONLINE: 'fcc78c1a',
  SHOPPING_SUL: '5b9446d5',
  AGUAS_LINDAS: '0d06e7db',
};

const VENDEDORES = {
  CAUA_VICTOR: '6dcbc817',      // Vendedor - JK Shopping
  ANTONIO_SOUSA: '143ac0c2',    // Vendedor - Online  
  ERICK_GUTHEMBERG: 'b106080f', // Vendedor - Águas Lindas
  ELIDA_FRANCA: '4bfe3508',     // Vendedor - Assistência SIA
};

// Dados mockados - IDs PROD-XXXX únicos e consistentes com estoqueApi
let vendas: Venda[] = [
  {
    id: 'VEN-2025-0001',
    numero: 1,
    dataHora: '2025-01-15T10:30:00',
    lojaVenda: LOJAS_VENDA.JK_SHOPPING,
    vendedor: VENDEDORES.CAUA_VICTOR,
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    clienteCpf: '123.456.789-00',
    clienteTelefone: '(11) 99999-1111',
    clienteEmail: 'joao@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Loja Física',
    localRetirada: LOJAS_VENDA.JK_SHOPPING,
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
        loja: LOJAS_VENDA.JK_SHOPPING
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
    lojaVenda: LOJAS_VENDA.MATRIZ,
    vendedor: VENDEDORES.ANTONIO_SOUSA,
    clienteId: 'CLI-002',
    clienteNome: 'Maria Santos',
    clienteCpf: '234.567.890-11',
    clienteTelefone: '(11) 99999-2222',
    clienteEmail: 'maria@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'WhatsApp',
    localRetirada: LOJAS_VENDA.MATRIZ,
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
        loja: LOJAS_VENDA.MATRIZ
      }
    ],
    tradeIns: [
      {
        id: 'TRADE-001',
        produtoId: 'PROD-0006',
        modelo: 'iPhone 12',
        descricao: 'Tela em ótimo estado, bateria 75%',
        imei: '999888777666555',
        valorCompraUsado: 1500.00,
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
    lojaVenda: LOJAS_VENDA.SHOPPING_SUL,
    vendedor: VENDEDORES.ERICK_GUTHEMBERG,
    clienteId: 'CLI-003',
    clienteNome: 'Pedro Oliveira',
    clienteCpf: '345.678.901-22',
    clienteTelefone: '(11) 99999-3333',
    clienteEmail: 'pedro@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Mercado Livre',
    localRetirada: LOJAS_VENDA.JK_SHOPPING,
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
        loja: LOJAS_VENDA.SHOPPING_SUL
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
    lojaVenda: LOJAS_VENDA.ONLINE,
    vendedor: VENDEDORES.ANTONIO_SOUSA,
    clienteId: 'CLI-004',
    clienteNome: 'Ana Costa',
    clienteCpf: '456.789.012-33',
    clienteTelefone: '(11) 99999-4444',
    clienteEmail: 'ana@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Online',
    localRetirada: LOJAS_VENDA.ONLINE,
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
        loja: LOJAS_VENDA.ONLINE
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
    lojaVenda: LOJAS_VENDA.AGUAS_LINDAS,
    vendedor: VENDEDORES.ERICK_GUTHEMBERG,
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    clienteCpf: '123.456.789-00',
    clienteTelefone: '(11) 99999-1111',
    clienteEmail: 'joao@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Indicação',
    localRetirada: LOJAS_VENDA.AGUAS_LINDAS,
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
        loja: LOJAS_VENDA.AGUAS_LINDAS
      }
    ],
    tradeIns: [
      {
        id: 'TRADE-002',
        produtoId: 'PROD-0007',
        modelo: 'iPhone 11',
        descricao: 'Seminovo, funcionando perfeitamente',
        imei: '888777666555444',
        valorCompraUsado: 1200.00,
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
    lojaVenda: LOJAS_VENDA.MATRIZ,
    vendedor: VENDEDORES.CAUA_VICTOR,
    clienteId: 'CLI-003',
    clienteNome: 'Pedro Oliveira',
    clienteCpf: '345.678.901-22',
    clienteTelefone: '(11) 99999-3333',
    clienteEmail: 'pedro@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'WhatsApp',
    localRetirada: LOJAS_VENDA.MATRIZ,
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
        loja: LOJAS_VENDA.MATRIZ
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
    lojaVenda: LOJAS_VENDA.ONLINE,
    vendedor: VENDEDORES.ANTONIO_SOUSA,
    clienteId: 'CLI-004',
    clienteNome: 'Ana Costa',
    clienteCpf: '456.789.012-33',
    clienteTelefone: '(11) 99999-4444',
    clienteEmail: 'ana@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Mercado Livre',
    localRetirada: LOJAS_VENDA.ONLINE,
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
        loja: LOJAS_VENDA.ONLINE
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
  },
  // ========== VENDAS FIADO ==========
  {
    id: 'VEN-2025-0050',
    numero: 50,
    dataHora: '2024-12-01T14:30:00',
    lojaVenda: LOJAS_VENDA.JK_SHOPPING,
    vendedor: VENDEDORES.CAUA_VICTOR,
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    clienteCpf: '123.456.789-00',
    clienteTelefone: '(11) 99999-1111',
    clienteEmail: 'joao@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Loja Física',
    localRetirada: LOJAS_VENDA.JK_SHOPPING,
    tipoRetirada: 'Retirada Balcão',
    taxaEntrega: 0,
    itens: [
      {
        id: 'ITEM-050',
        produtoId: 'PROD-0050',
        produto: 'iPhone 14',
        imei: '352123456789050',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 5500.00,
        valorVenda: 5000.00,
        valorCusto: 2800.00,
        loja: LOJAS_VENDA.JK_SHOPPING
      }
    ],
    tradeIns: [],
    pagamentos: [
      { 
        id: 'PAG-050', 
        meioPagamento: 'Fiado', 
        valor: 1500.00, 
        contaDestino: 'Caixa Principal',
        isFiado: true,
        fiadoDataBase: 5,
        fiadoNumeroParcelas: 3
      }
    ],
    subtotal: 5000.00,
    totalTradeIn: 0,
    total: 1500.00,
    lucro: 2200.00,
    margem: 78.57,
    observacoes: 'Venda parcelada no Fiado - 3x de R$ 500,00',
    status: 'Concluída'
  },
  {
    id: 'VEN-2025-0055',
    numero: 55,
    dataHora: '2024-12-15T10:00:00',
    lojaVenda: LOJAS_VENDA.MATRIZ,
    vendedor: VENDEDORES.ANTONIO_SOUSA,
    clienteId: 'CLI-005',
    clienteNome: 'Carlos Oliveira',
    clienteCpf: '567.890.123-44',
    clienteTelefone: '(11) 99999-5555',
    clienteEmail: 'carlos@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'WhatsApp',
    localRetirada: LOJAS_VENDA.MATRIZ,
    tipoRetirada: 'Retirada Balcão',
    taxaEntrega: 0,
    itens: [
      {
        id: 'ITEM-055',
        produtoId: 'PROD-0055',
        produto: 'iPhone 15',
        imei: '352123456789055',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 7500.00,
        valorVenda: 7000.00,
        valorCusto: 4200.00,
        loja: LOJAS_VENDA.MATRIZ
      }
    ],
    tradeIns: [],
    pagamentos: [
      { 
        id: 'PAG-055', 
        meioPagamento: 'Fiado', 
        valor: 2000.00, 
        contaDestino: 'Caixa Loja Norte',
        isFiado: true,
        fiadoDataBase: 10,
        fiadoNumeroParcelas: 5
      }
    ],
    subtotal: 7000.00,
    totalTradeIn: 0,
    total: 2000.00,
    lucro: 2800.00,
    margem: 66.67,
    observacoes: 'Venda parcelada no Fiado - 5x de R$ 400,00',
    status: 'Concluída'
  },
  {
    id: 'VEN-2025-0060',
    numero: 60,
    dataHora: '2025-01-02T16:45:00',
    lojaVenda: LOJAS_VENDA.ONLINE,
    vendedor: VENDEDORES.ANTONIO_SOUSA,
    clienteId: 'CLI-006',
    clienteNome: 'Ana Paula Ferreira',
    clienteCpf: '678.901.234-55',
    clienteTelefone: '(11) 99999-6666',
    clienteEmail: 'anapaula@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Indicação',
    localRetirada: LOJAS_VENDA.ONLINE,
    tipoRetirada: 'Retirada Balcão',
    taxaEntrega: 0,
    itens: [
      {
        id: 'ITEM-060',
        produtoId: 'PROD-0060',
        produto: 'iPhone 13 Pro',
        imei: '352123456789060',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 5200.00,
        valorVenda: 4800.00,
        valorCusto: 2600.00,
        loja: LOJAS_VENDA.ONLINE
      }
    ],
    tradeIns: [],
    pagamentos: [
      { 
        id: 'PAG-060', 
        meioPagamento: 'Fiado', 
        valor: 1500.00, 
        contaDestino: 'Caixa Loja Sul',
        isFiado: true,
        fiadoDataBase: 8,
        fiadoNumeroParcelas: 2
      }
    ],
    subtotal: 4800.00,
    totalTradeIn: 0,
    total: 1500.00,
    lucro: 2200.00,
    margem: 84.62,
    observacoes: 'Venda parcelada no Fiado - 2x de R$ 750,00',
    status: 'Concluída'
  },
  {
    id: 'VEN-2025-0062',
    numero: 62,
    dataHora: '2025-01-05T11:20:00',
    lojaVenda: LOJAS_VENDA.JK_SHOPPING,
    vendedor: VENDEDORES.CAUA_VICTOR,
    clienteId: 'CLI-007',
    clienteNome: 'Roberto Mendes',
    clienteCpf: '789.012.345-66',
    clienteTelefone: '(11) 99999-7777',
    clienteEmail: 'roberto@email.com',
    clienteCidade: 'São Paulo',
    origemVenda: 'Loja Física',
    localRetirada: LOJAS_VENDA.JK_SHOPPING,
    tipoRetirada: 'Retirada Balcão',
    taxaEntrega: 0,
    itens: [
      {
        id: 'ITEM-062',
        produtoId: 'PROD-0062',
        produto: 'iPhone 12 Pro Max',
        imei: '352123456789062',
        categoria: 'iPhone',
        quantidade: 1,
        valorRecomendado: 4500.00,
        valorVenda: 4200.00,
        valorCusto: 2100.00,
        loja: LOJAS_VENDA.JK_SHOPPING
      }
    ],
    tradeIns: [],
    pagamentos: [
      { 
        id: 'PAG-062', 
        meioPagamento: 'Fiado', 
        valor: 1300.00, 
        contaDestino: 'Caixa Principal',
        isFiado: true,
        fiadoDataBase: 11,
        fiadoNumeroParcelas: 4
      }
    ],
    subtotal: 4200.00,
    totalTradeIn: 0,
    total: 1300.00,
    lucro: 2100.00,
    margem: 100.00,
    observacoes: 'Venda parcelada no Fiado - 4x de R$ 325,00',
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

// Extrai marca do modelo para produtos de Trade-In
const extrairMarca = (modelo: string): string => {
  const modeloLower = modelo.toLowerCase();
  if (modeloLower.includes('iphone') || modeloLower.includes('apple')) return 'Apple';
  if (modeloLower.includes('samsung') || modeloLower.includes('galaxy')) return 'Samsung';
  if (modeloLower.includes('motorola') || modeloLower.includes('moto')) return 'Motorola';
  if (modeloLower.includes('xiaomi') || modeloLower.includes('redmi') || modeloLower.includes('poco')) return 'Xiaomi';
  if (modeloLower.includes('huawei')) return 'Huawei';
  if (modeloLower.includes('lg')) return 'LG';
  return 'Outra';
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
  
  // ========== INTEGRAÇÃO: Redução de Estoque de Aparelhos ==========
  // Para cada item vendido, marcar produto como "Vendido" e registrar movimentação
  venda.itens.forEach(item => {
    const produto = getProdutos().find(p => p.id === item.produtoId);
    if (produto) {
      // Marcar produto como vendido (status diferente ou remover do estoque ativo)
      updateProduto(item.produtoId, { 
        statusNota: 'Concluído',
        quantidade: 0 // Marca como sem estoque
      });
      
      // Registrar movimentação de saída
      addMovimentacao({
        data: new Date().toISOString().split('T')[0],
        produto: produto.modelo,
        imei: produto.imei,
        quantidade: 1,
        origem: produto.loja,
        destino: 'Vendido',
        responsavel: 'Sistema de Vendas',
        motivo: `Venda ${newId} - Cliente: ${venda.clienteNome}`
      });
    }
  });
  
  // ========== INTEGRAÇÃO: Redução de Estoque de Acessórios ==========
  if (venda.acessorios && venda.acessorios.length > 0) {
    venda.acessorios.forEach(acessorio => {
      subtrairEstoqueAcessorio(acessorio.acessorioId, acessorio.quantidade);
    });
  }
  
  // ========== INTEGRAÇÃO: Trade-In - Migração Após Finalização Financeira ==========
  // IMPORTANTE: Trade-ins NÃO são criados aqui como produtos pendentes.
  // A migração para "Aparelhos Pendentes - Estoque" ocorre APENAS após a 
  // aprovação financeira, através da função migrarTradeInsParaPendentes() 
  // chamada em fluxoVendasApi.ts → finalizarVenda()
  // Isso evita duplicação e garante que só entram no estoque após confirmação de pagamento.
  if (tradeInsComIds.length > 0) {
    console.log(`[VENDAS] ${tradeInsComIds.length} trade-in(s) serão migrados para pendentes após aprovação financeira.`);
  }
  
  // ========== INTEGRAÇÃO: Criar Pagamentos no Financeiro ==========
  if (venda.pagamentos && venda.pagamentos.length > 0) {
    try {
      criarPagamentosDeVenda({
        id: newId,
        clienteNome: venda.clienteNome,
        valorTotal: venda.total,
        lojaVenda: venda.lojaVenda,
        pagamentos: venda.pagamentos.map(p => ({
          meio: p.meioPagamento as any,
          valor: p.valor,
          contaId: p.contaDestino
        }))
      });
      console.log(`[VENDAS] Pagamentos registrados no financeiro para venda ${newId}`);
    } catch (error) {
      console.error(`[VENDAS] Erro ao registrar pagamentos no financeiro:`, error);
    }
  }
  
  return newVenda;
};

// Função para cancelar uma venda
export const cancelarVenda = (id: string, motivo: string): Venda | null => {
  const venda = vendas.find(v => v.id === id);
  if (!venda) return null;
  
  if (venda.status === 'Cancelada') {
    console.warn(`Venda ${id} já está cancelada`);
    return venda;
  }
  
  // Reverter estoque dos produtos vendidos
  venda.itens.forEach(item => {
    const produto = getProdutos().find(p => p.id === item.produtoId);
    if (produto) {
      updateProduto(item.produtoId, { quantidade: 1 });
      
      // Registrar movimentação de retorno
      addMovimentacao({
        data: new Date().toISOString().split('T')[0],
        produto: produto.modelo,
        imei: produto.imei,
        quantidade: 1,
        origem: 'Cancelamento de Venda',
        destino: produto.loja,
        responsavel: 'Sistema',
        motivo: `Cancelamento da venda ${id}: ${motivo}`
      });
    }
  });
  
  // Atualizar status da venda
  venda.status = 'Cancelada';
  venda.motivoCancelamento = motivo;
  
  return venda;
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

// Registrar edição de venda pelo gestor
export const registrarEdicaoVenda = (
  vendaId: string,
  usuarioId: string,
  usuarioNome: string,
  alteracoes: { campo: string; valorAnterior: any; valorNovo: any }[]
): void => {
  const venda = vendas.find(v => v.id === vendaId);
  if (!venda) return;

  // Gerar descrição legível
  const descricao = alteracoes.map(a => {
    const valorAnt = typeof a.valorAnterior === 'number' 
      ? `R$ ${a.valorAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
      : a.valorAnterior;
    const valorNov = typeof a.valorNovo === 'number' 
      ? `R$ ${a.valorNovo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
      : a.valorNovo;
    return `${a.campo}: ${valorAnt} → ${valorNov}`;
  }).join('; ');

  const novaEdicao: TimelineEdicaoVenda = {
    id: `EDIT-${Date.now()}`,
    dataHora: new Date().toISOString(),
    usuarioId,
    usuarioNome,
    tipo: 'edicao_gestor',
    alteracoes,
    descricao
  };

  if (!venda.timelineEdicoes) {
    venda.timelineEdicoes = [];
  }
  venda.timelineEdicoes.push(novaEdicao);
};

// Atualizar venda (para edição pelo gestor)
export const updateVenda = (vendaId: string, updates: Partial<Venda>): Venda | null => {
  const index = vendas.findIndex(v => v.id === vendaId);
  if (index === -1) return null;
  
  vendas[index] = { ...vendas[index], ...updates };
  return vendas[index];
};

// formatCurrency removido - usar import { formatCurrency } from '@/utils/formatUtils'
export { formatCurrency } from '@/utils/formatUtils';

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
