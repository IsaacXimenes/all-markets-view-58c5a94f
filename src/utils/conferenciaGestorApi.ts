// API para Conferência de Vendas - Gestor
import { addNotification } from './notificationsApi';
import { getColaboradores, getCargos, getLojas, Colaborador, Cargo, Loja } from './cadastrosApi';
import { formatCurrency } from './formatUtils';

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
  contaDestino?: string;
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

const calcularSLA = (dataRegistro: string): number => {
  const agora = new Date();
  const registro = new Date(dataRegistro);
  const diffTime = Math.abs(agora.getTime() - registro.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Dados mockados: 4 "Conferência - Gestor", 3 "Conferência - Financeiro", 3 "Concluído"
// UUIDs reais do useCadastroStore:
// Lojas: db894e7d (JK Shopping), 3ac7e00c (Matriz), 5b9446d5 (Shopping Sul), fcc78c1a (Online), 0d06e7db (Águas Lindas)
// Colaboradores: b467c728 (Anna Beatriz), 143ac0c2 (Antonio Sousa), 428d37c2 (Bruno Alves), 6dcbc817 (Caua Victor), 9812948d (Gustavo)
let vendasConferencia: VendaConferencia[] = [
  // 4 Vendas "Conferência - Gestor"
  {
    id: 'CONF-001',
    vendaId: 'VEN-0001',
    dataRegistro: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: 'db894e7d', // Loja - JK Shopping
    lojaNome: 'Loja - JK Shopping',
    vendedorId: '6dcbc817', // Caua Victor Costa dos Santos
    vendedorNome: 'Caua Victor Costa dos Santos',
    clienteNome: 'Ricardo Mendes',
    valorTotal: 15800.00,
    tipoVenda: 'Normal',
    status: 'Conferência - Gestor',
    slaDias: 0,
    timeline: [
      { id: 'TL-001', tipo: 'registro', titulo: 'Venda Registrada', descricao: 'Venda registrada pelo vendedor', dataHora: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Caua Victor Costa dos Santos' }
    ],
    dadosVenda: {
      clienteCpf: '789.123.456-00', clienteTelefone: '(11) 99999-8888', clienteEmail: 'ricardo@email.com', clienteCidade: 'São Paulo', origemVenda: 'Loja Física',
      itens: [{ produto: 'iPhone 15 Pro Max', imei: '352123456789100', valorVenda: 15800.00, valorCusto: 7500.00 }],
      pagamentos: [{ meioPagamento: 'Pix', valor: 15800.00 }],
      subtotal: 15800.00, totalTradeIn: 0, total: 15800.00, lucro: 8300.00, margem: 110.67
    }
  },
  {
    id: 'CONF-002',
    vendaId: 'VEN-0002',
    dataRegistro: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: '3ac7e00c', // Loja - Matriz
    lojaNome: 'Loja - Matriz',
    vendedorId: '143ac0c2', // Antonio Sousa Silva
    vendedorNome: 'Antonio Sousa Silva',
    clienteNome: 'Fernanda Lima',
    valorTotal: 8900.00,
    tipoVenda: 'Digital',
    status: 'Conferência - Gestor',
    slaDias: 1,
    timeline: [
      { id: 'TL-002', tipo: 'registro', titulo: 'Venda Digital Registrada', descricao: 'Venda digital enviada para finalização', dataHora: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Antonio Sousa Silva' }
    ],
    dadosVenda: {
      clienteCpf: '456.789.123-11', clienteTelefone: '(11) 99999-7777', clienteEmail: 'fernanda@email.com', clienteCidade: 'Guarulhos', origemVenda: 'WhatsApp',
      itens: [{ produto: 'iPhone 14 Pro', imei: '352123456789101', valorVenda: 8900.00, valorCusto: 4200.00 }],
      pagamentos: [{ meioPagamento: 'Cartão Crédito', valor: 8900.00 }],
      subtotal: 8900.00, totalTradeIn: 0, total: 8900.00, lucro: 4700.00, margem: 111.90
    }
  },
  {
    id: 'CONF-003',
    vendaId: 'VEN-0003',
    dataRegistro: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: '5b9446d5', // Loja - Shopping Sul
    lojaNome: 'Loja - Shopping Sul',
    vendedorId: '9812948d', // Gustavo de Souza dos Santos
    vendedorNome: 'Gustavo de Souza dos Santos',
    clienteNome: 'Bruno Santos',
    valorTotal: 2350.00,
    tipoVenda: 'Acessórios',
    status: 'Conferência - Gestor',
    slaDias: 2,
    timeline: [
      { id: 'TL-003', tipo: 'registro', titulo: 'Venda de Acessórios Registrada', descricao: 'Venda de acessórios registrada', dataHora: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Gustavo de Souza dos Santos' }
    ],
    dadosVenda: {
      clienteCpf: '321.654.987-22', clienteTelefone: '(11) 99999-6666', clienteEmail: 'bruno@email.com', clienteCidade: 'São Paulo', origemVenda: 'Loja Física',
      acessorios: [{ nome: 'AirPods Pro 2', quantidade: 1, valorUnitario: 1800.00 }, { nome: 'Case iPhone 15', quantidade: 2, valorUnitario: 150.00 }, { nome: 'Cabo Lightning', quantidade: 2, valorUnitario: 75.00 }],
      subtotal: 2350.00, totalTradeIn: 0, total: 2350.00, lucro: 850.00, margem: 56.67
    }
  },
  {
    id: 'CONF-004',
    vendaId: 'VEN-0004',
    dataRegistro: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: '0d06e7db', // Loja - Águas Lindas Shopping
    lojaNome: 'Loja - Águas Lindas Shopping',
    vendedorId: 'b106080f', // Erick Guthemberg Ferreira da Silva
    vendedorNome: 'Erick Guthemberg Ferreira da Silva',
    clienteNome: 'Carla Oliveira',
    valorTotal: 22500.00,
    tipoVenda: 'Normal',
    status: 'Conferência - Gestor',
    slaDias: 4,
    timeline: [
      { id: 'TL-004', tipo: 'registro', titulo: 'Venda Registrada', descricao: 'Venda de alto valor registrada', dataHora: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Erick Guthemberg Ferreira da Silva' }
    ],
    dadosVenda: {
      clienteCpf: '654.321.987-33', clienteTelefone: '(11) 99999-5555', clienteEmail: 'carla@email.com', clienteCidade: 'Osasco', origemVenda: 'Online',
      itens: [{ produto: 'iPhone 15 Pro Max 256GB', imei: '352123456789102', valorVenda: 16500.00, valorCusto: 8000.00 }, { produto: 'Apple Watch Ultra 2', imei: '352123456789103', valorVenda: 6000.00, valorCusto: 3200.00 }],
      pagamentos: [{ meioPagamento: 'Cartão Crédito', valor: 15000.00 }, { meioPagamento: 'Pix', valor: 7500.00 }],
      subtotal: 22500.00, totalTradeIn: 0, total: 22500.00, lucro: 11300.00, margem: 100.89
    }
  },
  // 3 Vendas "Conferência - Financeiro"
  {
    id: 'CONF-005',
    vendaId: 'VEN-0005',
    dataRegistro: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: 'db894e7d', // Loja - JK Shopping
    lojaNome: 'Loja - JK Shopping',
    vendedorId: '6dcbc817', // Caua Victor Costa dos Santos
    vendedorNome: 'Caua Victor Costa dos Santos',
    clienteNome: 'Amanda Rodrigues',
    valorTotal: 9800.00,
    tipoVenda: 'Normal',
    status: 'Conferência - Financeiro',
    slaDias: 0,
    gestorConferencia: 'b467c728', // Anna Beatriz Borges
    gestorNome: 'Anna Beatriz Borges',
    observacaoGestor: 'Valores conferidos, documentação em ordem.',
    dataConferencia: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { id: 'TL-005-1', tipo: 'registro', titulo: 'Venda Registrada', descricao: 'Venda registrada pelo vendedor', dataHora: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Caua Victor Costa dos Santos' },
      { id: 'TL-005-2', tipo: 'conferencia_gestor', titulo: 'Conferência do Gestor', descricao: 'Venda validada pelo gestor', dataHora: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Anna Beatriz Borges', observacao: 'Valores conferidos, documentação em ordem.' },
      { id: 'TL-005-3', tipo: 'envio_financeiro', titulo: 'Enviada ao Financeiro', descricao: 'Venda migrada para conferência financeira', dataHora: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    dadosVenda: {
      clienteCpf: '111.222.333-55', clienteTelefone: '(11) 99999-3333', clienteEmail: 'amanda@email.com', clienteCidade: 'São Paulo', origemVenda: 'Loja Física',
      itens: [{ produto: 'iPhone 14', imei: '352123456789105', valorVenda: 9800.00, valorCusto: 4800.00 }],
      subtotal: 9800.00, totalTradeIn: 0, total: 9800.00, lucro: 5000.00, margem: 104.17
    }
  },
  {
    id: 'CONF-006',
    vendaId: 'VEN-0006',
    dataRegistro: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: '3ac7e00c', // Loja - Matriz
    lojaNome: 'Loja - Matriz',
    vendedorId: '143ac0c2', // Antonio Sousa Silva
    vendedorNome: 'Antonio Sousa Silva',
    clienteNome: 'Diego Martins',
    valorTotal: 5600.00,
    tipoVenda: 'Digital',
    status: 'Conferência - Financeiro',
    slaDias: 0,
    gestorConferencia: '428d37c2', // Bruno Alves Peres
    gestorNome: 'Bruno Alves Peres',
    observacaoGestor: 'Conferido. Pagamento confirmado no sistema.',
    dataConferencia: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { id: 'TL-006-1', tipo: 'registro', titulo: 'Venda Digital Registrada', descricao: 'Venda digital enviada para finalização', dataHora: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Antonio Sousa Silva' },
      { id: 'TL-006-2', tipo: 'conferencia_gestor', titulo: 'Conferência do Gestor', descricao: 'Venda validada pelo gestor', dataHora: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Bruno Alves Peres', observacao: 'Conferido. Pagamento confirmado no sistema.' },
      { id: 'TL-006-3', tipo: 'envio_financeiro', titulo: 'Enviada ao Financeiro', descricao: 'Venda migrada para conferência financeira', dataHora: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    dadosVenda: {
      clienteCpf: '222.333.444-66', clienteTelefone: '(11) 99999-2222', clienteEmail: 'diego@email.com', clienteCidade: 'Guarulhos', origemVenda: 'WhatsApp',
      subtotal: 5600.00, totalTradeIn: 0, total: 5600.00, lucro: 2800.00, margem: 100.00
    }
  },
  {
    id: 'CONF-007',
    vendaId: 'VEN-0007',
    dataRegistro: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: '5b9446d5', // Loja - Shopping Sul
    lojaNome: 'Loja - Shopping Sul',
    vendedorId: '9812948d', // Gustavo de Souza dos Santos
    vendedorNome: 'Gustavo de Souza dos Santos',
    clienteNome: 'Letícia Souza',
    valorTotal: 3200.00,
    tipoVenda: 'Acessórios',
    status: 'Conferência - Financeiro',
    slaDias: 0,
    gestorConferencia: 'b467c728', // Anna Beatriz Borges
    gestorNome: 'Anna Beatriz Borges',
    observacaoGestor: '',
    dataConferencia: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { id: 'TL-007-1', tipo: 'registro', titulo: 'Venda de Acessórios Registrada', descricao: 'Venda de acessórios registrada', dataHora: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Gustavo de Souza dos Santos' },
      { id: 'TL-007-2', tipo: 'conferencia_gestor', titulo: 'Conferência do Gestor', descricao: 'Venda validada pelo gestor', dataHora: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Anna Beatriz Borges' },
      { id: 'TL-007-3', tipo: 'envio_financeiro', titulo: 'Enviada ao Financeiro', descricao: 'Venda migrada para conferência financeira', dataHora: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    dadosVenda: {
      clienteCpf: '333.444.555-77', clienteTelefone: '(11) 99999-1111', clienteEmail: 'leticia@email.com', clienteCidade: 'São Paulo', origemVenda: 'Loja Física',
      acessorios: [{ nome: 'AirPods 3', quantidade: 1, valorUnitario: 1700.00 }, { nome: 'MagSafe Charger', quantidade: 2, valorUnitario: 400.00 }, { nome: 'Case MagSafe', quantidade: 2, valorUnitario: 350.00 }],
      subtotal: 3200.00, totalTradeIn: 0, total: 3200.00, lucro: 1100.00, margem: 52.38
    }
  },
  // 3 Vendas "Concluído"
  {
    id: 'CONF-008',
    vendaId: 'VEN-0008',
    dataRegistro: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: '0d06e7db', // Loja - Águas Lindas Shopping
    lojaNome: 'Loja - Águas Lindas Shopping',
    vendedorId: '6dcbc817', // Caua Victor Costa dos Santos
    vendedorNome: 'Caua Victor Costa dos Santos',
    clienteNome: 'Rafael Costa',
    valorTotal: 18500.00,
    tipoVenda: 'Normal',
    status: 'Concluído',
    slaDias: 0,
    gestorConferencia: '428d37c2', // Bruno Alves Peres
    gestorNome: 'Bruno Alves Peres',
    observacaoGestor: 'Venda conferida. Cliente VIP.',
    dataConferencia: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    financeiroResponsavel: '7c1231ea', // Fernanda Gabrielle (Financeiro)
    financeiroNome: 'Fernanda Gabrielle Silva de Lima',
    dataFinalizacao: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { id: 'TL-008-1', tipo: 'registro', titulo: 'Venda Registrada', descricao: 'Venda de alto valor registrada', dataHora: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Caua Victor Costa dos Santos' },
      { id: 'TL-008-2', tipo: 'conferencia_gestor', titulo: 'Conferência do Gestor', descricao: 'Venda validada pelo gestor', dataHora: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Bruno Alves Peres', observacao: 'Venda conferida. Cliente VIP.' },
      { id: 'TL-008-3', tipo: 'envio_financeiro', titulo: 'Enviada ao Financeiro', descricao: 'Venda migrada para conferência financeira', dataHora: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'TL-008-4', tipo: 'finalizado', titulo: 'Concluído', descricao: 'Venda finalizada pelo financeiro', dataHora: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Fernanda Gabrielle' }
    ],
    dadosVenda: {
      clienteCpf: '444.555.666-88', clienteTelefone: '(11) 99999-0000', clienteEmail: 'rafael@email.com', clienteCidade: 'São Paulo', origemVenda: 'Online',
      itens: [{ produto: 'iPhone 15 Pro Max 512GB', imei: '352123456789106', valorVenda: 18500.00, valorCusto: 9000.00 }],
      subtotal: 18500.00, totalTradeIn: 0, total: 18500.00, lucro: 9500.00, margem: 105.56
    }
  },
  {
    id: 'CONF-009',
    vendaId: 'VEN-0009',
    dataRegistro: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: 'fcc78c1a', // Loja - Online
    lojaNome: 'Loja - Online',
    vendedorId: '143ac0c2', // Antonio Sousa Silva
    vendedorNome: 'Antonio Sousa Silva',
    clienteNome: 'Gabriela Pereira',
    valorTotal: 7200.00,
    tipoVenda: 'Normal',
    status: 'Concluído',
    slaDias: 0,
    gestorConferencia: 'b467c728', // Anna Beatriz Borges
    gestorNome: 'Anna Beatriz Borges',
    observacaoGestor: 'Trade-in verificado presencialmente.',
    dataConferencia: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    financeiroResponsavel: '7c1231ea', // Fernanda Gabrielle (Financeiro)
    financeiroNome: 'Fernanda Gabrielle Silva de Lima',
    dataFinalizacao: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { id: 'TL-009-1', tipo: 'registro', titulo: 'Venda Registrada', descricao: 'Venda com trade-in registrada', dataHora: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Antonio Sousa Silva' },
      { id: 'TL-009-2', tipo: 'conferencia_gestor', titulo: 'Conferência do Gestor', descricao: 'Venda validada pelo gestor', dataHora: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Anna Beatriz Borges', observacao: 'Trade-in verificado presencialmente.' },
      { id: 'TL-009-3', tipo: 'envio_financeiro', titulo: 'Enviada ao Financeiro', descricao: 'Venda migrada para conferência financeira', dataHora: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'TL-009-4', tipo: 'finalizado', titulo: 'Concluído', descricao: 'Venda finalizada pelo financeiro', dataHora: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Fernanda Gabrielle' }
    ],
    dadosVenda: {
      clienteCpf: '555.666.777-99', clienteTelefone: '(11) 98888-9999', clienteEmail: 'gabriela@email.com', clienteCidade: 'São Paulo', origemVenda: 'Indicação',
      itens: [{ produto: 'iPhone 14 Plus', imei: '352123456789107', valorVenda: 10200.00, valorCusto: 5000.00 }],
      tradeIns: [{ modelo: 'iPhone 11', imei: '777666555444333', valorAbatimento: 3000.00 }],
      subtotal: 10200.00, totalTradeIn: 3000.00, total: 7200.00, lucro: 2200.00, margem: 44.00
    }
  },
  {
    id: 'CONF-010',
    vendaId: 'VEN-0010',
    dataRegistro: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    lojaId: 'db894e7d', // Loja - JK Shopping
    lojaNome: 'Loja - JK Shopping',
    vendedorId: '9812948d', // Gustavo de Souza dos Santos
    vendedorNome: 'Gustavo de Souza dos Santos',
    clienteNome: 'Marina Oliveira',
    valorTotal: 12500.00,
    tipoVenda: 'Normal',
    status: 'Concluído',
    slaDias: 0,
    gestorConferencia: '428d37c2', // Bruno Alves Peres
    gestorNome: 'Bruno Alves Peres',
    observacaoGestor: 'Documentação completa. Aprovado.',
    dataConferencia: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    financeiroResponsavel: '7c1231ea', // Fernanda Gabrielle (Financeiro)
    financeiroNome: 'Fernanda Gabrielle Silva de Lima',
    dataFinalizacao: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    timeline: [
      { id: 'TL-010-1', tipo: 'registro', titulo: 'Venda Registrada', descricao: 'Venda registrada pelo vendedor', dataHora: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Gustavo de Souza dos Santos' },
      { id: 'TL-010-2', tipo: 'conferencia_gestor', titulo: 'Conferência do Gestor', descricao: 'Venda validada pelo gestor', dataHora: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Bruno Alves Peres', observacao: 'Documentação completa. Aprovado.' },
      { id: 'TL-010-3', tipo: 'envio_financeiro', titulo: 'Enviada ao Financeiro', descricao: 'Venda migrada para conferência financeira', dataHora: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'TL-010-4', tipo: 'finalizado', titulo: 'Concluído', descricao: 'Venda finalizada pelo financeiro', dataHora: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), responsavel: 'Fernanda Gabrielle' }
    ],
    dadosVenda: {
      clienteCpf: '666.777.888-00', clienteTelefone: '(11) 97777-8888', clienteEmail: 'marina@email.com', clienteCidade: 'São Paulo', origemVenda: 'Loja Física',
      itens: [{ produto: 'iPhone 14 Pro Max', imei: '352123456789108', valorVenda: 12500.00, valorCusto: 6000.00 }],
      subtotal: 12500.00, totalTradeIn: 0, total: 12500.00, lucro: 6500.00, margem: 108.33
    }
  }
];

let conferenciaCounter = vendasConferencia.length;

export const getVendasConferencia = (): VendaConferencia[] => {
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

export const getStatusConferenciaByVendaId = (vendaId: string): StatusConferencia | null => {
  const venda = vendasConferencia.find(v => v.vendaId === vendaId);
  return venda?.status || null;
};

export const getVendasPorStatus = (status: StatusConferencia): VendaConferencia[] => {
  return vendasConferencia.filter(v => v.status === status).map(v => ({
    ...v,
    slaDias: v.status === 'Conferência - Gestor' ? calcularSLA(v.dataRegistro) : v.slaDias
  }));
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
    timeline: [...vendasConferencia[index].timeline, timelineConferencia, timelineFinanceiro]
  };

  addNotification({
    type: 'venda_conferencia',
    title: `Venda ${vendasConferencia[index].vendaId} conferida pelo Gestor`,
    description: `${gestorNome} validou a venda - Enviada ao Financeiro`,
    targetUsers: ['COL-006']
  });

  return vendasConferencia[index];
};

export const finalizarVendaFinanceiro = (
  id: string,
  responsavelId: string,
  responsavelNome: string,
  contaDestino: string
): VendaConferencia | null => {
  const index = vendasConferencia.findIndex(v => v.id === id);
  if (index === -1) return null;

  const agora = new Date().toISOString();
  
  const timelineFinalizado: TimelineEvento = {
    id: `TL-${id}-FINAL`,
    tipo: 'finalizado',
    titulo: 'Concluído',
    descricao: `Venda finalizada pelo financeiro. Conta: ${contaDestino}`,
    dataHora: agora,
    responsavel: responsavelNome
  };

  vendasConferencia[index] = {
    ...vendasConferencia[index],
    status: 'Concluído',
    financeiroResponsavel: responsavelId,
    financeiroNome: responsavelNome,
    contaDestino: contaDestino,
    dataFinalizacao: agora,
    timeline: [...vendasConferencia[index].timeline, timelineFinalizado]
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
        titulo: tipoVenda === 'Digital' ? 'Venda Digital Registrada' : tipoVenda === 'Acessórios' ? 'Venda de Acessórios Registrada' : 'Venda Registrada',
        descricao: `Venda ${tipoVenda.toLowerCase()} registrada pelo vendedor`,
        dataHora: agora,
        responsavel: vendedorNome
      }
    ],
    dadosVenda
  };

  vendasConferencia.unshift(novaConferencia);
  notificarGestores(novaConferencia);

  return novaConferencia;
};

const notificarGestores = (venda: VendaConferencia) => {
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  
  const gestores = colaboradores.filter(col => {
    const cargo = cargos.find(c => c.id === col.cargo);
    return cargo?.permissoes.includes('Gestor');
  });

  const gestorIds = gestores.map(g => g.id);
  
  addNotification({
    type: 'venda_conferencia',
    title: `Nova venda ${venda.vendaId} pendente de conferência`,
    description: `${venda.clienteNome} - ${formatCurrency(venda.valorTotal)} - Aguardando validação do gestor`,
    targetUsers: gestorIds.length > 0 ? gestorIds : ['COL-001', 'COL-002']
  });
};

export const temPermissaoGestor = (colaboradorId?: string): boolean => {
  if (!colaboradorId) return true;
  
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  
  const colaborador = colaboradores.find(c => c.id === colaboradorId);
  if (!colaborador) return false;
  
  const cargo = cargos.find(c => c.id === colaborador.cargo);
  return cargo?.permissoes.includes('Gestor') || false;
};

export const getGestores = (): Colaborador[] => {
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  
  return colaboradores.filter(col => {
    const cargo = cargos.find(c => c.id === col.cargo);
    return cargo?.permissoes.includes('Gestor');
  });
};

// formatCurrency removido - usar import { formatCurrency } from '@/utils/formatUtils'
export { formatCurrency } from '@/utils/formatUtils';

export const exportConferenciaToCSV = (data: VendaConferencia[], filename: string) => {
  if (data.length === 0) return;
  
  const csvData = data.map(v => ({
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
