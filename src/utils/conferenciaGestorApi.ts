// API para Conferência de Vendas - Gestor
import { addNotification } from './notificationsApi';
import { getColaboradores, getCargos, getLojas, Colaborador, Cargo, Loja } from './cadastrosApi';

export type StatusConferencia = 'Conferência - Gestor' | 'Conferência - Financeiro' | 'Concluído';

export interface TimelineEvento {
  id: string;
  tipo: 'registro' | 'conferencia_gestor' | 'envio_financeiro' | 'finalizado';
  titulo: string;
  descricao: string;
  dataHora: string;
  responsavel?: string;
  observacao?: string;
}

export interface VendaConferencia {
  id: string;
  vendaId: string;
  dataRegistro: string;
  lojaId: string;
  lojaNome: string;
  vendedorId: string;
  vendedorNome: string;
  clienteNome: string;
  valorTotal: number;
  tipoVenda: 'Normal' | 'Digital' | 'Acessórios';
  status: StatusConferencia;
  slaDias: number;
  timeline: TimelineEvento[];
  gestorConferencia?: string;
  gestorNome?: string;
  observacaoGestor?: string;
  dataConferencia?: string;
  financeiroResponsavel?: string;
  financeiroNome?: string;
  dataFinalizacao?: string;
  // Dados completos da venda para exibição
  dadosVenda: {
    clienteCpf?: string;
    clienteTelefone?: string;
    clienteEmail?: string;
    clienteCidade?: string;
    origemVenda?: string;
    localRetirada?: string;
    tipoRetirada?: string;
    taxaEntrega?: number;
    itens?: any[];
    tradeIns?: any[];
    pagamentos?: any[];
    acessorios?: any[];
    subtotal: number;
    totalTradeIn: number;
    total: number;
    lucro: number;
    margem: number;
    observacoes?: string;
  };
}

// Calcular SLA em dias
const calcularSLA = (dataRegistro: string): number => {
  const agora = new Date();
  const registro = new Date(dataRegistro);
  const diffTime = Math.abs(agora.getTime() - registro.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Dados mockados com vendas variadas - 5 "Conferência - Gestor", 3 "Conferência - Financeiro", 2 "Concluído"
let vendasConferencia: VendaConferencia[] = [
  // 5 Vendas "Conferência - Gestor" com SLA variando
  {
    id: 'CONF-001',
    vendaId: 'VEN-2025-0008',
    dataRegistro: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(), // Hoje (0 dias)
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports Centro',
    vendedorId: 'COL-004',
    vendedorNome: 'Juliana Costa',
    clienteNome: 'Ricardo Mendes',
    valorTotal: 15800.00,
    tipoVenda: 'Normal',
    status: 'Conferência - Gestor',
    slaDias: 0,
    timeline: [
      {
        id: 'TL-001',
        tipo: 'registro',
        titulo: 'Venda Registrada',
        descricao: 'Venda registrada pelo vendedor',
        dataHora: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Juliana Costa'
      }
    ],
    dadosVenda: {
      clienteCpf: '789.123.456-00',
      clienteTelefone: '(11) 99999-8888',
      clienteEmail: 'ricardo@email.com',
      clienteCidade: 'São Paulo',
      origemVenda: 'Loja Física',
      localRetirada: 'LOJA-001',
      tipoRetirada: 'Retirada Balcão',
      taxaEntrega: 0,
      itens: [
        { produto: 'iPhone 15 Pro Max', imei: '352123456789100', valorVenda: 15800.00, valorCusto: 7500.00 }
      ],
      tradeIns: [],
      pagamentos: [
        { meioPagamento: 'Pix', valor: 15800.00 }
      ],
      subtotal: 15800.00,
      totalTradeIn: 0,
      total: 15800.00,
      lucro: 8300.00,
      margem: 110.67,
      observacoes: 'Cliente novo, primeira compra'
    }
  },
  {
    id: 'CONF-002',
    vendaId: 'VEN-2025-0009',
    dataRegistro: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia
    lojaId: 'LOJA-002',
    lojaNome: 'Thiago Imports Norte',
    vendedorId: 'COL-003',
    vendedorNome: 'Roberto Alves',
    clienteNome: 'Fernanda Lima',
    valorTotal: 8900.00,
    tipoVenda: 'Digital',
    status: 'Conferência - Gestor',
    slaDias: 1,
    timeline: [
      {
        id: 'TL-002',
        tipo: 'registro',
        titulo: 'Venda Digital Registrada',
        descricao: 'Venda digital enviada para finalização',
        dataHora: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Roberto Alves'
      }
    ],
    dadosVenda: {
      clienteCpf: '456.789.123-11',
      clienteTelefone: '(11) 99999-7777',
      clienteEmail: 'fernanda@email.com',
      clienteCidade: 'Guarulhos',
      origemVenda: 'WhatsApp',
      localRetirada: 'LOJA-002',
      tipoRetirada: 'Entrega',
      taxaEntrega: 50.00,
      itens: [
        { produto: 'iPhone 14 Pro', imei: '352123456789101', valorVenda: 8900.00, valorCusto: 4200.00 }
      ],
      tradeIns: [],
      pagamentos: [
        { meioPagamento: 'Cartão Crédito', valor: 8950.00 }
      ],
      subtotal: 8900.00,
      totalTradeIn: 0,
      total: 8950.00,
      lucro: 4700.00,
      margem: 111.90,
      observacoes: 'Venda via WhatsApp'
    }
  },
  {
    id: 'CONF-003',
    vendaId: 'VEN-2025-0010',
    dataRegistro: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias
    lojaId: 'LOJA-003',
    lojaNome: 'Thiago Imports Sul',
    vendedorId: 'COL-004',
    vendedorNome: 'Juliana Costa',
    clienteNome: 'Bruno Santos',
    valorTotal: 2350.00,
    tipoVenda: 'Acessórios',
    status: 'Conferência - Gestor',
    slaDias: 2,
    timeline: [
      {
        id: 'TL-003',
        tipo: 'registro',
        titulo: 'Venda de Acessórios Registrada',
        descricao: 'Venda de acessórios registrada',
        dataHora: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Juliana Costa'
      }
    ],
    dadosVenda: {
      clienteCpf: '321.654.987-22',
      clienteTelefone: '(11) 99999-6666',
      clienteEmail: 'bruno@email.com',
      clienteCidade: 'São Paulo',
      origemVenda: 'Loja Física',
      localRetirada: 'LOJA-003',
      tipoRetirada: 'Retirada Balcão',
      taxaEntrega: 0,
      acessorios: [
        { nome: 'AirPods Pro 2', quantidade: 1, valorUnitario: 1800.00 },
        { nome: 'Case iPhone 15', quantidade: 2, valorUnitario: 150.00 },
        { nome: 'Cabo Lightning', quantidade: 2, valorUnitario: 75.00 }
      ],
      subtotal: 2350.00,
      totalTradeIn: 0,
      total: 2350.00,
      lucro: 850.00,
      margem: 56.67,
      observacoes: 'Compra de acessórios diversos'
    }
  },
  {
    id: 'CONF-004',
    vendaId: 'VEN-2025-0011',
    dataRegistro: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias - URGENTE
    lojaId: 'LOJA-004',
    lojaNome: 'Thiago Imports Shopping',
    vendedorId: 'COL-001',
    vendedorNome: 'Lucas Mendes',
    clienteNome: 'Carla Oliveira',
    valorTotal: 22500.00,
    tipoVenda: 'Normal',
    status: 'Conferência - Gestor',
    slaDias: 3,
    timeline: [
      {
        id: 'TL-004',
        tipo: 'registro',
        titulo: 'Venda Registrada',
        descricao: 'Venda de alto valor registrada',
        dataHora: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Lucas Mendes'
      }
    ],
    dadosVenda: {
      clienteCpf: '654.321.987-33',
      clienteTelefone: '(11) 99999-5555',
      clienteEmail: 'carla@email.com',
      clienteCidade: 'Osasco',
      origemVenda: 'Online',
      localRetirada: 'LOJA-004',
      tipoRetirada: 'Retirada Balcão',
      taxaEntrega: 0,
      itens: [
        { produto: 'iPhone 15 Pro Max 256GB', imei: '352123456789102', valorVenda: 16500.00, valorCusto: 8000.00 },
        { produto: 'Apple Watch Ultra 2', imei: '352123456789103', valorVenda: 6000.00, valorCusto: 3200.00 }
      ],
      tradeIns: [],
      pagamentos: [
        { meioPagamento: 'Cartão Crédito', valor: 15000.00 },
        { meioPagamento: 'Pix', valor: 7500.00 }
      ],
      subtotal: 22500.00,
      totalTradeIn: 0,
      total: 22500.00,
      lucro: 11300.00,
      margem: 100.89,
      observacoes: 'Venda grande - cliente empresarial'
    }
  },
  {
    id: 'CONF-005',
    vendaId: 'VEN-2025-0012',
    dataRegistro: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 dias - MUITO URGENTE
    lojaId: 'LOJA-005',
    lojaNome: 'Thiago Imports Oeste',
    vendedorId: 'COL-005',
    vendedorNome: 'Marcos Silva',
    clienteNome: 'Paulo Ferreira',
    valorTotal: 11200.00,
    tipoVenda: 'Normal',
    status: 'Conferência - Gestor',
    slaDias: 5,
    timeline: [
      {
        id: 'TL-005',
        tipo: 'registro',
        titulo: 'Venda Registrada',
        descricao: 'Venda com trade-in registrada',
        dataHora: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Marcos Silva'
      }
    ],
    dadosVenda: {
      clienteCpf: '987.654.321-44',
      clienteTelefone: '(11) 99999-4444',
      clienteEmail: 'paulo@email.com',
      clienteCidade: 'São Paulo',
      origemVenda: 'Indicação',
      localRetirada: 'LOJA-005',
      tipoRetirada: 'Retirada Balcão',
      taxaEntrega: 0,
      itens: [
        { produto: 'iPhone 15 Pro', imei: '352123456789104', valorVenda: 13200.00, valorCusto: 6500.00 }
      ],
      tradeIns: [
        { modelo: 'iPhone 12', imei: '888777666555444', valorAbatimento: 2000.00 }
      ],
      pagamentos: [
        { meioPagamento: 'Pix', valor: 11200.00 }
      ],
      subtotal: 13200.00,
      totalTradeIn: 2000.00,
      total: 11200.00,
      lucro: 4700.00,
      margem: 72.31,
      observacoes: 'Cliente por indicação - trade-in de iPhone 12'
    }
  },
  // 3 Vendas "Conferência - Financeiro"
  {
    id: 'CONF-006',
    vendaId: 'VEN-2025-0013',
    dataRegistro: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports Centro',
    vendedorId: 'COL-004',
    vendedorNome: 'Juliana Costa',
    clienteNome: 'Amanda Rodrigues',
    valorTotal: 9800.00,
    tipoVenda: 'Normal',
    status: 'Conferência - Financeiro',
    slaDias: 0,
    gestorConferencia: 'COL-001',
    gestorNome: 'Lucas Mendes',
    observacaoGestor: 'Valores conferidos, documentação em ordem.',
    dataConferencia: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      {
        id: 'TL-006-1',
        tipo: 'registro',
        titulo: 'Venda Registrada',
        descricao: 'Venda registrada pelo vendedor',
        dataHora: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Juliana Costa'
      },
      {
        id: 'TL-006-2',
        tipo: 'conferencia_gestor',
        titulo: 'Conferência do Gestor',
        descricao: 'Venda validada pelo gestor',
        dataHora: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Lucas Mendes',
        observacao: 'Valores conferidos, documentação em ordem.'
      },
      {
        id: 'TL-006-3',
        tipo: 'envio_financeiro',
        titulo: 'Enviada ao Financeiro',
        descricao: 'Venda migrada para conferência financeira',
        dataHora: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    dadosVenda: {
      clienteCpf: '111.222.333-55',
      clienteTelefone: '(11) 99999-3333',
      clienteEmail: 'amanda@email.com',
      clienteCidade: 'São Paulo',
      origemVenda: 'Loja Física',
      localRetirada: 'LOJA-001',
      tipoRetirada: 'Retirada Balcão',
      taxaEntrega: 0,
      itens: [
        { produto: 'iPhone 14', imei: '352123456789105', valorVenda: 9800.00, valorCusto: 4800.00 }
      ],
      subtotal: 9800.00,
      totalTradeIn: 0,
      total: 9800.00,
      lucro: 5000.00,
      margem: 104.17
    }
  },
  {
    id: 'CONF-007',
    vendaId: 'VEN-2025-0014',
    dataRegistro: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: 'LOJA-002',
    lojaNome: 'Thiago Imports Norte',
    vendedorId: 'COL-003',
    vendedorNome: 'Roberto Alves',
    clienteNome: 'Diego Martins',
    valorTotal: 5600.00,
    tipoVenda: 'Digital',
    status: 'Conferência - Financeiro',
    slaDias: 0,
    gestorConferencia: 'COL-002',
    gestorNome: 'Fernanda Lima',
    observacaoGestor: 'Conferido. Pagamento confirmado no sistema.',
    dataConferencia: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      {
        id: 'TL-007-1',
        tipo: 'registro',
        titulo: 'Venda Digital Registrada',
        descricao: 'Venda digital enviada para finalização',
        dataHora: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Roberto Alves'
      },
      {
        id: 'TL-007-2',
        tipo: 'conferencia_gestor',
        titulo: 'Conferência do Gestor',
        descricao: 'Venda validada pelo gestor',
        dataHora: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Fernanda Lima',
        observacao: 'Conferido. Pagamento confirmado no sistema.'
      },
      {
        id: 'TL-007-3',
        tipo: 'envio_financeiro',
        titulo: 'Enviada ao Financeiro',
        descricao: 'Venda migrada para conferência financeira',
        dataHora: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    dadosVenda: {
      clienteCpf: '222.333.444-66',
      clienteTelefone: '(11) 99999-2222',
      clienteEmail: 'diego@email.com',
      clienteCidade: 'Guarulhos',
      origemVenda: 'WhatsApp',
      subtotal: 5600.00,
      totalTradeIn: 0,
      total: 5600.00,
      lucro: 2800.00,
      margem: 100.00
    }
  },
  {
    id: 'CONF-008',
    vendaId: 'VEN-2025-0015',
    dataRegistro: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: 'LOJA-003',
    lojaNome: 'Thiago Imports Sul',
    vendedorId: 'COL-005',
    vendedorNome: 'Marcos Silva',
    clienteNome: 'Letícia Souza',
    valorTotal: 3200.00,
    tipoVenda: 'Acessórios',
    status: 'Conferência - Financeiro',
    slaDias: 0,
    gestorConferencia: 'COL-001',
    gestorNome: 'Lucas Mendes',
    observacaoGestor: '',
    dataConferencia: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      {
        id: 'TL-008-1',
        tipo: 'registro',
        titulo: 'Venda de Acessórios Registrada',
        descricao: 'Venda de acessórios registrada',
        dataHora: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Marcos Silva'
      },
      {
        id: 'TL-008-2',
        tipo: 'conferencia_gestor',
        titulo: 'Conferência do Gestor',
        descricao: 'Venda validada pelo gestor',
        dataHora: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Lucas Mendes'
      },
      {
        id: 'TL-008-3',
        tipo: 'envio_financeiro',
        titulo: 'Enviada ao Financeiro',
        descricao: 'Venda migrada para conferência financeira',
        dataHora: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    dadosVenda: {
      clienteCpf: '333.444.555-77',
      clienteTelefone: '(11) 99999-1111',
      clienteEmail: 'leticia@email.com',
      clienteCidade: 'São Paulo',
      origemVenda: 'Loja Física',
      acessorios: [
        { nome: 'AirPods 3', quantidade: 1, valorUnitario: 1700.00 },
        { nome: 'MagSafe Charger', quantidade: 2, valorUnitario: 400.00 },
        { nome: 'Case MagSafe', quantidade: 2, valorUnitario: 350.00 }
      ],
      subtotal: 3200.00,
      totalTradeIn: 0,
      total: 3200.00,
      lucro: 1100.00,
      margem: 52.38
    }
  },
  // 2 Vendas "Concluído" com timeline completa
  {
    id: 'CONF-009',
    vendaId: 'VEN-2025-0016',
    dataRegistro: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: 'LOJA-004',
    lojaNome: 'Thiago Imports Shopping',
    vendedorId: 'COL-004',
    vendedorNome: 'Juliana Costa',
    clienteNome: 'Rafael Costa',
    valorTotal: 18500.00,
    tipoVenda: 'Normal',
    status: 'Concluído',
    slaDias: 0,
    gestorConferencia: 'COL-002',
    gestorNome: 'Fernanda Lima',
    observacaoGestor: 'Venda conferida. Cliente VIP.',
    dataConferencia: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    financeiroResponsavel: 'COL-006',
    financeiroNome: 'Carlos Eduardo',
    dataFinalizacao: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      {
        id: 'TL-009-1',
        tipo: 'registro',
        titulo: 'Venda Registrada',
        descricao: 'Venda de alto valor registrada',
        dataHora: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Juliana Costa'
      },
      {
        id: 'TL-009-2',
        tipo: 'conferencia_gestor',
        titulo: 'Conferência do Gestor',
        descricao: 'Venda validada pelo gestor',
        dataHora: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Fernanda Lima',
        observacao: 'Venda conferida. Cliente VIP.'
      },
      {
        id: 'TL-009-3',
        tipo: 'envio_financeiro',
        titulo: 'Enviada ao Financeiro',
        descricao: 'Venda migrada para conferência financeira',
        dataHora: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'TL-009-4',
        tipo: 'finalizado',
        titulo: 'Concluído',
        descricao: 'Venda finalizada pelo financeiro',
        dataHora: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Carlos Eduardo'
      }
    ],
    dadosVenda: {
      clienteCpf: '444.555.666-88',
      clienteTelefone: '(11) 99999-0000',
      clienteEmail: 'rafael@email.com',
      clienteCidade: 'São Paulo',
      origemVenda: 'Online',
      itens: [
        { produto: 'iPhone 15 Pro Max 512GB', imei: '352123456789106', valorVenda: 18500.00, valorCusto: 9000.00 }
      ],
      subtotal: 18500.00,
      totalTradeIn: 0,
      total: 18500.00,
      lucro: 9500.00,
      margem: 105.56
    }
  },
  {
    id: 'CONF-010',
    vendaId: 'VEN-2025-0017',
    dataRegistro: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: 'LOJA-005',
    lojaNome: 'Thiago Imports Oeste',
    vendedorId: 'COL-001',
    vendedorNome: 'Lucas Mendes',
    clienteNome: 'Gabriela Pereira',
    valorTotal: 7200.00,
    tipoVenda: 'Normal',
    status: 'Concluído',
    slaDias: 0,
    gestorConferencia: 'COL-001',
    gestorNome: 'Lucas Mendes',
    observacaoGestor: 'Trade-in verificado presencialmente.',
    dataConferencia: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    financeiroResponsavel: 'COL-006',
    financeiroNome: 'Carlos Eduardo',
    dataFinalizacao: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      {
        id: 'TL-010-1',
        tipo: 'registro',
        titulo: 'Venda Registrada',
        descricao: 'Venda com trade-in registrada',
        dataHora: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Lucas Mendes'
      },
      {
        id: 'TL-010-2',
        tipo: 'conferencia_gestor',
        titulo: 'Conferência do Gestor',
        descricao: 'Venda validada pelo gestor',
        dataHora: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Lucas Mendes',
        observacao: 'Trade-in verificado presencialmente.'
      },
      {
        id: 'TL-010-3',
        tipo: 'envio_financeiro',
        titulo: 'Enviada ao Financeiro',
        descricao: 'Venda migrada para conferência financeira',
        dataHora: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'TL-010-4',
        tipo: 'finalizado',
        titulo: 'Concluído',
        descricao: 'Venda finalizada pelo financeiro',
        dataHora: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel: 'Carlos Eduardo'
      }
    ],
    dadosVenda: {
      clienteCpf: '555.666.777-99',
      clienteTelefone: '(11) 98888-9999',
      clienteEmail: 'gabriela@email.com',
      clienteCidade: 'São Paulo',
      origemVenda: 'Indicação',
      itens: [
        { produto: 'iPhone 14 Plus', imei: '352123456789107', valorVenda: 10200.00, valorCusto: 5000.00 }
      ],
      tradeIns: [
        { modelo: 'iPhone 11', imei: '777666555444333', valorAbatimento: 3000.00 }
      ],
      subtotal: 10200.00,
      totalTradeIn: 3000.00,
      total: 7200.00,
      lucro: 2200.00,
      margem: 44.00
    }
  }
];

let conferenciaCounter = vendasConferencia.length;

// Funções da API
export const getVendasConferencia = (): VendaConferencia[] => {
  // Atualiza SLA antes de retornar
  return vendasConferencia.map(v => ({
    ...v,
    slaDias: v.status === 'Conferência - Gestor' ? calcularSLA(v.dataRegistro) : v.slaDias
  }));
};

export const getVendaConferenciaById = (id: string): VendaConferencia | null => {
  const venda = vendasConferencia.find(v => v.id === id);
  if (venda && venda.status === 'Conferência - Gestor') {
    venda.slaDias = calcularSLA(venda.dataRegistro);
  }
  return venda || null;
};

// Buscar status de conferência por vendaId
export const getStatusConferenciaByVendaId = (vendaId: string): StatusConferencia | null => {
  const venda = vendasConferencia.find(v => v.vendaId === vendaId);
  return venda?.status || null;
};

export const validarVendaGestor = (
  id: string,
  gestorId: string,
  gestorNome: string,
  observacao: string
): VendaConferencia | null => {
  const index = vendasConferencia.findIndex(v => v.id === id);
  if (index === -1) return null;

  const agora = new Date().toISOString();
  
  // Adicionar eventos na timeline
  const timelineConferencia: TimelineEvento = {
    id: `TL-${id}-CONF`,
    tipo: 'conferencia_gestor',
    titulo: 'Conferência do Gestor',
    descricao: 'Venda validada pelo gestor',
    dataHora: agora,
    responsavel: gestorNome,
    observacao: observacao || undefined
  };

  const timelineFinanceiro: TimelineEvento = {
    id: `TL-${id}-FIN`,
    tipo: 'envio_financeiro',
    titulo: 'Enviada ao Financeiro',
    descricao: 'Venda migrada para conferência financeira',
    dataHora: agora
  };

  vendasConferencia[index] = {
    ...vendasConferencia[index],
    status: 'Conferência - Financeiro',
    gestorConferencia: gestorId,
    gestorNome: gestorNome,
    observacaoGestor: observacao,
    dataConferencia: agora,
    slaDias: 0,
    timeline: [
      ...vendasConferencia[index].timeline,
      timelineConferencia,
      timelineFinanceiro
    ]
  };

  return vendasConferencia[index];
};

// Finalizar venda no financeiro
export const finalizarVendaFinanceiro = (
  id: string,
  responsavelId: string,
  responsavelNome: string
): VendaConferencia | null => {
  const index = vendasConferencia.findIndex(v => v.id === id);
  if (index === -1) return null;

  const agora = new Date().toISOString();
  
  const timelineFinalizado: TimelineEvento = {
    id: `TL-${id}-FINAL`,
    tipo: 'finalizado',
    titulo: 'Concluído',
    descricao: 'Venda finalizada pelo financeiro',
    dataHora: agora,
    responsavel: responsavelNome
  };

  vendasConferencia[index] = {
    ...vendasConferencia[index],
    status: 'Concluído',
    financeiroResponsavel: responsavelId,
    financeiroNome: responsavelNome,
    dataFinalizacao: agora,
    timeline: [
      ...vendasConferencia[index].timeline,
      timelineFinalizado
    ]
  };

  return vendasConferencia[index];
};

export const adicionarVendaParaConferencia = (
  vendaId: string,
  lojaId: string,
  lojaNome: string,
  vendedorId: string,
  vendedorNome: string,
  clienteNome: string,
  valorTotal: number,
  tipoVenda: 'Normal' | 'Digital' | 'Acessórios',
  dadosVenda: VendaConferencia['dadosVenda']
): VendaConferencia => {
  conferenciaCounter++;
  const agora = new Date().toISOString();
  
  const novaConferencia: VendaConferencia = {
    id: `CONF-${String(conferenciaCounter).padStart(3, '0')}`,
    vendaId,
    dataRegistro: agora,
    lojaId,
    lojaNome,
    vendedorId,
    vendedorNome,
    clienteNome,
    valorTotal,
    tipoVenda,
    status: 'Conferência - Gestor',
    slaDias: 0,
    timeline: [
      {
        id: `TL-${conferenciaCounter}-REG`,
        tipo: 'registro',
        titulo: tipoVenda === 'Digital' 
          ? 'Venda Digital Registrada' 
          : tipoVenda === 'Acessórios' 
            ? 'Venda de Acessórios Registrada' 
            : 'Venda Registrada',
        descricao: `Venda ${tipoVenda.toLowerCase()} registrada pelo vendedor`,
        dataHora: agora,
        responsavel: vendedorNome
      }
    ],
    dadosVenda
  };

  vendasConferencia.unshift(novaConferencia);

  // Enviar notificação para gestores
  notificarGestores(novaConferencia);

  return novaConferencia;
};

// Notificar gestores sobre nova venda
const notificarGestores = (venda: VendaConferencia) => {
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  
  // Encontrar colaboradores com permissão "Gestor"
  const gestores = colaboradores.filter(col => {
    const cargo = cargos.find(c => c.id === col.cargo);
    return cargo?.permissoes.includes('Gestor');
  });

  const gestorIds = gestores.map(g => g.id);
  
  addNotification({
    type: 'venda_conferencia',
    title: `Nova venda ${venda.vendaId} pendente de conferência`,
    description: `${venda.clienteNome} - ${formatCurrency(venda.valorTotal)} - Aguardando validação do gestor`,
    targetUsers: gestorIds.length > 0 ? gestorIds : ['COL-001', 'COL-002'] // Fallback se não houver gestores
  });
};

// Verificar se usuário tem permissão de gestor
export const temPermissaoGestor = (colaboradorId?: string): boolean => {
  if (!colaboradorId) {
    // Mock: retorna true para teste
    return true;
  }
  
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  
  const colaborador = colaboradores.find(c => c.id === colaboradorId);
  if (!colaborador) return false;
  
  const cargo = cargos.find(c => c.id === colaborador.cargo);
  return cargo?.permissoes.includes('Gestor') || false;
};

// Obter gestores para select
export const getGestores = (): Colaborador[] => {
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  
  return colaboradores.filter(col => {
    const cargo = cargos.find(c => c.id === col.cargo);
    return cargo?.permissoes.includes('Gestor');
  });
};

// Formatação de moeda
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Exportar CSV
export const exportConferenciaToCSV = (data: VendaConferencia[], filename: string) => {
  if (data.length === 0) return;
  
  const csvData = data.map(v => ({
    'ID Conferência': v.id,
    'ID Venda': v.vendaId,
    'Data Registro': new Date(v.dataRegistro).toLocaleString('pt-BR'),
    'Loja': v.lojaNome,
    'Responsável Venda': v.vendedorNome,
    'Cliente': v.clienteNome,
    'Valor Total': v.valorTotal,
    'Tipo Venda': v.tipoVenda,
    'Status': v.status,
    'SLA (dias)': v.slaDias,
    'Gestor Conferência': v.gestorNome || '-',
    'Data Conferência': v.dataConferencia ? new Date(v.dataConferencia).toLocaleString('pt-BR') : '-',
    'Observação Gestor': v.observacaoGestor || '-',
    'Financeiro Responsável': v.financeiroNome || '-',
    'Data Finalização': v.dataFinalizacao ? new Date(v.dataFinalizacao).toLocaleString('pt-BR') : '-'
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
