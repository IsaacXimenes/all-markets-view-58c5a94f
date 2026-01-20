// Tipos
import { initializeProductIds, registerProductId, generateProductId, isProductIdRegistered } from './idManager';

export interface HistoricoValorRecomendado {
  data: string;
  usuario: string;
  valorAntigo: number | null;
  valorNovo: number;
}

// Interface de timeline importada/compatível com osApi
export interface TimelineEntry {
  id: string;
  data: string;
  tipo: 'entrada' | 'parecer_estoque' | 'parecer_assistencia' | 'despesa' | 'liberacao';
  titulo: string;
  descricao: string;
  responsavel?: string;
  valor?: number;
}

export interface Produto {
  id: string;
  imei: string;
  imagem?: string;
  marca: string;
  modelo: string;
  cor: string;
  tipo: 'Novo' | 'Seminovo';
  quantidade: number;
  valorCusto: number;
  valorVendaSugerido: number;
  vendaRecomendada?: number;
  saudeBateria: number;
  loja: string;
  estoqueConferido: boolean;
  assistenciaConferida: boolean;
  condicao: string;
  pareceres?: string;
  historicoCusto: { data: string; fornecedor: string; valor: number }[];
  historicoValorRecomendado: HistoricoValorRecomendado[];
  statusNota: 'Pendente' | 'Concluído';
  origemEntrada: 'Base de Troca' | 'Fornecedor' | 'Emprestado - Garantia' | 'NEGOCIADO';
  timeline?: TimelineEntry[]; // Timeline de tratativas (pareceres estoque/assistência)
  custoAssistencia?: number; // Soma das peças/serviços de assistência
  bloqueadoEmVendaId?: string; // ID da venda quando produto está bloqueado (sinal)
  statusMovimentacao?: 'Em movimentação' | null; // Status quando produto está em trânsito
  movimentacaoId?: string; // ID da movimentação ativa
}

export interface NotaCompra {
  id: string;
  data: string;
  numeroNota: string;
  fornecedor: string;
  valorTotal: number;
  status: 'Pendente' | 'Concluído';
  origem?: 'Normal' | 'Urgência';
  statusUrgencia?: 'Aguardando Financeiro' | 'Pago - Aguardando Produtos' | 'Produtos Inseridos' | 'Concluído';
  dataPagamentoFinanceiro?: string;
  produtos: {
    marca: string;
    modelo: string;
    cor: string;
    imei: string;
    tipo: 'Novo' | 'Seminovo';
    tipoProduto?: 'Aparelho' | 'Acessório';
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    saudeBateria: number;
  }[];
  pagamento?: {
    formaPagamento: string;
    parcelas: number;
    valorParcela: number;
    dataVencimento: string;
  };
  responsavelFinanceiro?: string;
}

export interface Movimentacao {
  id: string;
  data: string;
  produto: string;
  imei: string;
  quantidade: number;
  origem: string;
  destino: string;
  responsavel: string;
  motivo: string;
  status?: 'Pendente' | 'Recebido'; // Status da movimentação
  dataRecebimento?: string; // Data/hora da confirmação
  responsavelRecebimento?: string; // Quem confirmou
}

// Dados mockados - IDs das lojas do useCadastroStore (JSON mockado)
// Lojas tipo "Loja" para vincular produtos disponíveis para venda
const LOJAS_IDS = {
  JK_SHOPPING: 'db894e7d',      // Loja - JK Shopping
  MATRIZ: '3ac7e00c',            // Loja - Matriz
  ONLINE: 'fcc78c1a',            // Loja - Online (COMPARTILHA ESTOQUE COM MATRIZ)
  SHOPPING_SUL: '5b9446d5',      // Loja - Shopping Sul
  AGUAS_LINDAS: '0d06e7db',      // Loja - Águas Lindas Shopping
  ACESSORIOS: '11a1d7d3',        // Loja - Acessórios
};

// Constantes para compartilhamento de estoque
export const LOJA_MATRIZ_ID = LOJAS_IDS.MATRIZ;
export const LOJA_ONLINE_ID = LOJAS_IDS.ONLINE;

// Função para verificar se uma loja compartilha estoque com a Matriz
export const compartilhaEstoqueComMatriz = (lojaId: string): boolean => {
  return lojaId === LOJA_ONLINE_ID;
};

// Função para obter o ID da loja de estoque real (considerando compartilhamento)
export const getLojaEstoqueReal = (lojaId: string): string => {
  if (compartilhaEstoqueComMatriz(lojaId)) {
    return LOJA_MATRIZ_ID;
  }
  return lojaId;
};

const fornecedores = [
  'Apple Distribuidor BR',
  'TechSupply Imports',
  'MobileWorld Atacado',
  'Eletrônicos Premium',
  'FastCell Distribuição',
  'iStore Fornecedor',
  'TechnoImports',
  'GlobalCell Supply',
  'PhoneParts Brasil',
  'MegaTech Distribuidor'
];

let produtos: Produto[] = [
  {
    id: 'PROD-0010',
    imei: '352123456789012',
    marca: 'Apple',
    modelo: 'iPhone 15 Pro Max',
    cor: 'Titânio Natural',
    tipo: 'Novo',
    quantidade: 1,
    valorCusto: 7200.00,
    valorVendaSugerido: 15120.00,
    vendaRecomendada: 12999.00,
    saudeBateria: 100,
    loja: LOJAS_IDS.JK_SHOPPING,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Lacrado',
    historicoCusto: [
      { data: '2024-11-15', fornecedor: 'Apple Distribuidor BR', valor: 7200.00 },
      { data: '2024-10-20', fornecedor: 'TechSupply Imports', valor: 7350.00 },
      { data: '2024-09-10', fornecedor: 'MobileWorld Atacado', valor: 7100.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-10', usuario: 'Lucas Mendes', valorAntigo: null, valorNovo: 12999.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor'
  },
  {
    id: 'PROD-0011',
    imei: '352123456789013',
    marca: 'Apple',
    modelo: 'iPhone 15 Pro',
    cor: 'Azul Titânio',
    tipo: 'Novo',
    quantidade: 1,
    valorCusto: 6400.00,
    valorVendaSugerido: 13440.00,
    vendaRecomendada: 10999.00,
    saudeBateria: 100,
    loja: LOJAS_IDS.SHOPPING_SUL,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Lacrado',
    historicoCusto: [
      { data: '2024-11-18', fornecedor: 'Apple Distribuidor BR', valor: 6400.00 },
      { data: '2024-10-25', fornecedor: 'iStore Fornecedor', valor: 6500.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-08', usuario: 'Fernanda Lima', valorAntigo: null, valorNovo: 10999.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor'
  },
  {
    id: 'PROD-0012',
    imei: '352123456789014',
    marca: 'Apple',
    modelo: 'iPhone 14 Pro',
    cor: 'Roxo Profundo',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 3800.00,
    valorVendaSugerido: 6840.00,
    vendaRecomendada: 5499.00,
    saudeBateria: 92,
    loja: LOJAS_IDS.MATRIZ,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Excelente estado',
    pareceres: 'Sem riscos, bateria em ótimo estado',
    historicoCusto: [
      { data: '2024-11-10', fornecedor: 'TechSupply Imports', valor: 3800.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-05', usuario: 'Roberto Alves', valorAntigo: null, valorNovo: 5499.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor',
    timeline: [
      { id: 'TL-0012-1', tipo: 'entrada', data: '2024-11-10T09:00:00', titulo: 'Entrada via Nota de Compra', descricao: 'Produto recebido via Nota NC-2025-0002', responsavel: 'Carlos Oliveira' },
      { id: 'TL-0012-2', tipo: 'parecer_estoque', data: '2024-11-10T14:30:00', titulo: 'Análise Realizada', descricao: 'Produto em excelente estado, sem riscos ou marcas de uso', responsavel: 'Ana Costa' },
      { id: 'TL-0012-3', tipo: 'liberacao', data: '2024-11-10T14:35:00', titulo: 'Produto Liberado', descricao: 'Produto liberado para venda', responsavel: 'Sistema' }
    ]
  },
  {
    id: 'PROD-0013',
    imei: '352123456789015',
    marca: 'Apple',
    modelo: 'iPhone 13',
    cor: 'Preto',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 2400.00,
    valorVendaSugerido: 4320.00,
    vendaRecomendada: 3599.00,
    saudeBateria: 78,
    loja: LOJAS_IDS.ONLINE,
    estoqueConferido: true,
    assistenciaConferida: false,
    condicao: 'Bom estado',
    pareceres: 'Bateria abaixo de 80%, considerar troca',
    historicoCusto: [
      { data: '2024-11-05', fornecedor: 'MobileWorld Atacado', valor: 2400.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-06', usuario: 'Lucas Mendes', valorAntigo: null, valorNovo: 3599.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Base de Troca',
    timeline: [
      { id: 'TL-0013-1', tipo: 'entrada', data: '2024-11-05T11:00:00', titulo: 'Entrada via Base de Troca', descricao: 'Produto recebido via Base de Troca - Venda VEN-2024-0089', responsavel: 'Maria Santos' },
      { id: 'TL-0013-2', tipo: 'parecer_estoque', data: '2024-11-05T15:20:00', titulo: 'Encaminhado para Assistência', descricao: 'Bateria abaixo de 80%, encaminhar para verificação técnica', responsavel: 'Pedro Lima' },
      { id: 'TL-0013-3', tipo: 'parecer_assistencia', data: '2024-11-06T10:00:00', titulo: 'Conferência Realizada', descricao: 'Bateria funcional apesar de degradada, produto pode ser vendido com desconto', responsavel: 'Lucas Ferreira' },
      { id: 'TL-0013-4', tipo: 'liberacao', data: '2024-11-06T10:05:00', titulo: 'Produto Liberado', descricao: 'Produto liberado para venda', responsavel: 'Sistema' }
    ]
  },
  {
    id: 'PROD-0014',
    imei: '352123456789016',
    marca: 'Apple',
    modelo: 'iPhone 15',
    cor: 'Rosa',
    tipo: 'Novo',
    quantidade: 1,
    valorCusto: 5200.00,
    valorVendaSugerido: 10920.00,
    vendaRecomendada: 8999.00,
    saudeBateria: 100,
    loja: LOJAS_IDS.AGUAS_LINDAS,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Lacrado',
    historicoCusto: [
      { data: '2024-11-22', fornecedor: 'Apple Distribuidor BR', valor: 5200.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-09', usuario: 'Fernanda Lima', valorAntigo: null, valorNovo: 8999.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor'
  },
  {
    id: 'PROD-0015',
    imei: '352123456789017',
    marca: 'Apple',
    modelo: 'iPhone 12',
    cor: 'Azul',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 1900.00,
    valorVendaSugerido: 3420.00,
    saudeBateria: 68,
    loja: LOJAS_IDS.JK_SHOPPING,
    estoqueConferido: false,
    assistenciaConferida: false,
    condicao: 'Estado regular',
    pareceres: 'Bateria muito degradada, necessita troca urgente',
    historicoCusto: [
      { data: '2024-11-20', fornecedor: 'GlobalCell Supply', valor: 1900.00 }
    ],
    historicoValorRecomendado: [],
    statusNota: 'Pendente',
    origemEntrada: 'Base de Troca',
    timeline: [
      { id: 'TL-0015-1', tipo: 'entrada', data: '2024-11-20T08:30:00', titulo: 'Entrada via Base de Troca', descricao: 'Produto recebido via Base de Troca - Venda VEN-2024-0102', responsavel: 'Fernando Alves' }
    ]
  },
  {
    id: 'PROD-0016',
    imei: '352123456789018',
    marca: 'Apple',
    modelo: 'iPhone 14 Plus',
    cor: 'Amarelo',
    tipo: 'Novo',
    quantidade: 1,
    valorCusto: 5800.00,
    valorVendaSugerido: 12180.00,
    vendaRecomendada: 9499.00,
    saudeBateria: 100,
    loja: LOJAS_IDS.SHOPPING_SUL,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Lacrado',
    historicoCusto: [
      { data: '2024-11-19', fornecedor: 'Eletrônicos Premium', valor: 5800.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-07', usuario: 'Roberto Alves', valorAntigo: null, valorNovo: 9499.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor'
  },
  {
    id: 'PROD-0017',
    imei: '352123456789019',
    marca: 'Apple',
    modelo: 'iPhone SE 2022',
    cor: 'Branco',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 1400.00,
    valorVendaSugerido: 2520.00,
    vendaRecomendada: 2199.00,
    saudeBateria: 85,
    loja: LOJAS_IDS.MATRIZ,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Bom estado',
    historicoCusto: [
      { data: '2024-11-12', fornecedor: 'PhoneParts Brasil', valor: 1400.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-04', usuario: 'Lucas Mendes', valorAntigo: null, valorNovo: 2199.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor',
    timeline: [
      { id: 'TL-0017-1', tipo: 'entrada', data: '2024-11-12T10:00:00', titulo: 'Entrada via Nota de Compra', descricao: 'Produto recebido via Nota NC-2025-0005', responsavel: 'Carlos Oliveira' },
      { id: 'TL-0017-2', tipo: 'parecer_estoque', data: '2024-11-12T14:00:00', titulo: 'Análise Realizada', descricao: 'Produto em bom estado, funcionamento normal', responsavel: 'Ana Costa' },
      { id: 'TL-0017-3', tipo: 'liberacao', data: '2024-11-12T14:05:00', titulo: 'Produto Liberado', descricao: 'Produto liberado para venda', responsavel: 'Sistema' }
    ]
  },
  {
    id: 'PROD-0018',
    imei: '352123456789020',
    marca: 'Apple',
    modelo: 'iPhone 13 Pro',
    cor: 'Verde Alpino',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 3200.00,
    valorVendaSugerido: 5760.00,
    vendaRecomendada: 4799.00,
    saudeBateria: 88,
    loja: LOJAS_IDS.ONLINE,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Excelente estado',
    historicoCusto: [
      { data: '2024-11-08', fornecedor: 'TechnoImports', valor: 3200.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-03', usuario: 'Fernanda Lima', valorAntigo: null, valorNovo: 4799.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Base de Troca',
    timeline: [
      { id: 'TL-0018-1', tipo: 'entrada', data: '2024-11-08T09:30:00', titulo: 'Entrada via Base de Troca', descricao: 'Produto recebido via Base de Troca - Venda VEN-2024-0078', responsavel: 'Maria Santos' },
      { id: 'TL-0018-2', tipo: 'parecer_estoque', data: '2024-11-08T11:00:00', titulo: 'Análise Realizada', descricao: 'Produto em excelente estado, bateria acima de 85%', responsavel: 'Pedro Lima' },
      { id: 'TL-0018-3', tipo: 'liberacao', data: '2024-11-08T11:05:00', titulo: 'Produto Liberado', descricao: 'Produto liberado para venda', responsavel: 'Sistema' }
    ]
  },
  {
    id: 'PROD-0019',
    imei: '352123456789021',
    marca: 'Apple',
    modelo: 'iPhone 15 Pro',
    cor: 'Preto Espacial',
    tipo: 'Novo',
    quantidade: 1,
    valorCusto: 6400.00,
    valorVendaSugerido: 13440.00,
    saudeBateria: 100,
    loja: LOJAS_IDS.AGUAS_LINDAS,
    estoqueConferido: false,
    assistenciaConferida: false,
    condicao: 'Lacrado',
    historicoCusto: [
      { data: '2024-11-25', fornecedor: 'Apple Distribuidor BR', valor: 6400.00 }
    ],
    historicoValorRecomendado: [],
    statusNota: 'Pendente',
    origemEntrada: 'Fornecedor'
  },
  {
    id: 'PROD-0020',
    imei: '352123456789022',
    marca: 'Apple',
    modelo: 'iPhone 14',
    cor: 'Vermelho',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 3400.00,
    valorVendaSugerido: 6120.00,
    saudeBateria: 82,
    loja: LOJAS_IDS.JK_SHOPPING,
    estoqueConferido: true,
    assistenciaConferida: false,
    condicao: 'Bom estado',
    historicoCusto: [
      { data: '2024-11-14', fornecedor: 'FastCell Distribuição', valor: 3400.00 }
    ],
    historicoValorRecomendado: [],
    statusNota: 'Pendente',
    origemEntrada: 'Fornecedor',
    timeline: [
      { id: 'TL-0020-1', tipo: 'entrada', data: '2024-11-14T13:00:00', titulo: 'Entrada via Nota de Compra', descricao: 'Produto recebido via Nota NC-2025-0006', responsavel: 'Fernando Alves' },
      { id: 'TL-0020-2', tipo: 'parecer_estoque', data: '2024-11-14T16:30:00', titulo: 'Análise Realizada', descricao: 'Produto em bom estado, bateria aceitável', responsavel: 'Ana Costa' }
    ]
  },
  {
    id: 'PROD-0021',
    imei: '352123456789023',
    marca: 'Apple',
    modelo: 'iPhone 11',
    cor: 'Preto',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 1600.00,
    valorVendaSugerido: 2880.00,
    saudeBateria: 72,
    loja: LOJAS_IDS.SHOPPING_SUL,
    estoqueConferido: false,
    assistenciaConferida: false,
    condicao: 'Estado regular',
    pareceres: 'Bateria degradada, trocar antes da venda',
    historicoCusto: [
      { data: '2024-11-17', fornecedor: 'MegaTech Distribuidor', valor: 1600.00 }
    ],
    historicoValorRecomendado: [],
    statusNota: 'Pendente',
    origemEntrada: 'Base de Troca',
    timeline: [
      { id: 'TL-0021-1', tipo: 'entrada', data: '2024-11-17T10:00:00', titulo: 'Entrada via Base de Troca', descricao: 'Produto recebido via Base de Troca - Venda VEN-2024-0098', responsavel: 'Maria Santos' }
    ]
  }
];

// Exportar IDs de lojas para uso em outros módulos
export const ESTOQUE_LOJAS_IDS = LOJAS_IDS;

// Inicializa IDs existentes no sistema
const initializeExistingIds = () => {
  const allIds = produtos.map(p => p.id);
  initializeProductIds(allIds);
};

// Inicializa ao carregar o módulo
initializeExistingIds();

let notasCompra: NotaCompra[] = [
  {
    id: 'NC-2025-0001',
    data: '2024-11-05',
    numeroNota: 'NF-45678',
    fornecedor: 'Apple Distribuidor BR',
    valorTotal: 21000.00,
    status: 'Concluído',
    origem: 'Normal',
    produtos: [
      { marca: 'Apple', modelo: 'iPhone 15 Pro Max', cor: 'Titânio Natural', imei: '352123456789012', tipo: 'Novo', quantidade: 1, valorUnitario: 7200.00, valorTotal: 7200.00, saudeBateria: 100 },
      { marca: 'Apple', modelo: 'iPhone 15 Pro', cor: 'Azul Titânio', imei: '352123456789013', tipo: 'Novo', quantidade: 2, valorUnitario: 6400.00, valorTotal: 12800.00, saudeBateria: 100 }
    ],
    pagamento: {
      formaPagamento: 'Transferência Bancária',
      parcelas: 1,
      valorParcela: 21000.00,
      dataVencimento: '2024-11-15'
    },
    responsavelFinanceiro: 'Carlos Mendes'
  },
  {
    id: 'NC-2025-0002',
    data: '2024-11-10',
    numeroNota: 'NF-45679',
    fornecedor: 'TechSupply Imports',
    valorTotal: 7000.00,
    status: 'Concluído',
    produtos: [
      { marca: 'Apple', modelo: 'iPhone 14 Pro', cor: 'Roxo Profundo', imei: '352123456789014', tipo: 'Seminovo', quantidade: 1, valorUnitario: 3800.00, valorTotal: 3800.00, saudeBateria: 92 },
      { marca: 'Apple', modelo: 'iPhone 13 Pro', cor: 'Verde Alpino', imei: '352123456789020', tipo: 'Seminovo', quantidade: 1, valorUnitario: 3200.00, valorTotal: 3200.00, saudeBateria: 88 }
    ],
    pagamento: {
      formaPagamento: 'Boleto',
      parcelas: 2,
      valorParcela: 3500.00,
      dataVencimento: '2024-11-25'
    },
    responsavelFinanceiro: 'Ana Paula Silva'
  },
  {
    id: 'NC-2025-0003',
    data: '2024-11-15',
    numeroNota: 'NF-45680',
    fornecedor: 'MobileWorld Atacado',
    valorTotal: 2400.00,
    status: 'Concluído',
    produtos: [
      { marca: 'Apple', modelo: 'iPhone 13', cor: 'Preto', imei: '352123456789015', tipo: 'Seminovo', quantidade: 1, valorUnitario: 2400.00, valorTotal: 2400.00, saudeBateria: 78 }
    ],
    pagamento: {
      formaPagamento: 'Pix',
      parcelas: 1,
      valorParcela: 2400.00,
      dataVencimento: '2024-11-15'
    },
    responsavelFinanceiro: 'Carlos Mendes'
  },
  {
    id: 'NC-2025-0004',
    data: '2024-11-18',
    numeroNota: 'NF-45681',
    fornecedor: 'Eletrônicos Premium',
    valorTotal: 11000.00,
    status: 'Concluído',
    produtos: [
      { marca: 'Apple', modelo: 'iPhone 15', cor: 'Rosa', imei: '352123456789016', tipo: 'Novo', quantidade: 1, valorUnitario: 5200.00, valorTotal: 5200.00, saudeBateria: 100 },
      { marca: 'Apple', modelo: 'iPhone 14 Plus', cor: 'Amarelo', imei: '352123456789018', tipo: 'Novo', quantidade: 1, valorUnitario: 5800.00, valorTotal: 5800.00, saudeBateria: 100 }
    ],
    pagamento: {
      formaPagamento: 'Transferência Bancária',
      parcelas: 1,
      valorParcela: 11000.00,
      dataVencimento: '2024-11-22'
    },
    responsavelFinanceiro: 'Ana Paula Silva'
  },
  {
    id: 'NC-2025-0005',
    data: '2024-11-20',
    numeroNota: 'NF-45682',
    fornecedor: 'PhoneParts Brasil',
    valorTotal: 3300.00,
    status: 'Concluído',
    produtos: [
      { marca: 'Apple', modelo: 'iPhone SE 2022', cor: 'Branco', imei: '352123456789019', tipo: 'Seminovo', quantidade: 1, valorUnitario: 1400.00, valorTotal: 1400.00, saudeBateria: 85 },
      { marca: 'Apple', modelo: 'iPhone 12', cor: 'Azul', imei: '352123456789017', tipo: 'Seminovo', quantidade: 1, valorUnitario: 1900.00, valorTotal: 1900.00, saudeBateria: 68 }
    ],
    pagamento: {
      formaPagamento: 'Pix',
      parcelas: 1,
      valorParcela: 3300.00,
      dataVencimento: '2024-11-20'
    },
    responsavelFinanceiro: 'Carlos Mendes'
  },
  {
    id: 'NC-2025-0006',
    data: '2024-11-23',
    numeroNota: 'NF-45683',
    fornecedor: 'Apple Distribuidor BR',
    valorTotal: 6400.00,
    status: 'Pendente',
    produtos: [
      { marca: 'Apple', modelo: 'iPhone 15 Pro', cor: 'Preto Espacial', imei: '352123456789021', tipo: 'Novo', quantidade: 1, valorUnitario: 6400.00, valorTotal: 6400.00, saudeBateria: 100 }
    ]
  },
  {
    id: 'NC-2025-0007',
    data: '2024-11-24',
    numeroNota: 'NF-45684',
    fornecedor: 'FastCell Distribuição',
    valorTotal: 5000.00,
    status: 'Pendente',
    produtos: [
      { marca: 'Apple', modelo: 'iPhone 14', cor: 'Vermelho', imei: '352123456789022', tipo: 'Seminovo', quantidade: 1, valorUnitario: 3400.00, valorTotal: 3400.00, saudeBateria: 82 },
      { marca: 'Apple', modelo: 'iPhone 11', cor: 'Preto', imei: '352123456789023', tipo: 'Seminovo', quantidade: 1, valorUnitario: 1600.00, valorTotal: 1600.00, saudeBateria: 72 }
    ]
  },
  {
    id: 'NC-2025-0008',
    data: '2024-11-25',
    numeroNota: 'NF-45685',
    fornecedor: 'iStore Fornecedor',
    valorTotal: 19200.00,
    status: 'Pendente',
    produtos: [
      { marca: 'Apple', modelo: 'iPhone 15 Pro Max', cor: 'Branco', imei: '352123456789024', tipo: 'Novo', quantidade: 2, valorUnitario: 7200.00, valorTotal: 14400.00, saudeBateria: 100 },
      { marca: 'Apple', modelo: 'iPhone 14 Pro', cor: 'Dourado', imei: '352123456789025', tipo: 'Seminovo', quantidade: 1, valorUnitario: 4800.00, valorTotal: 4800.00, saudeBateria: 95 }
    ]
  }
];

let movimentacoes: Movimentacao[] = [
  {
    id: 'MOV-2025-0001',
    data: '2024-11-10',
    produto: 'iPhone 15 Pro',
    imei: '352123456789013',
    quantidade: 1,
    origem: 'Loja Centro',
    destino: 'Loja Shopping',
    responsavel: 'João Silva',
    motivo: 'Transferência de estoque',
    status: 'Pendente'
  },
  {
    id: 'MOV-2025-0002',
    data: '2024-11-15',
    produto: 'iPhone 13',
    imei: '352123456789015',
    quantidade: 1,
    origem: 'Loja Norte',
    destino: 'Loja Sul',
    responsavel: 'Maria Santos',
    motivo: 'Solicitação do gerente',
    status: 'Pendente'
  }
];

// Inicializar status de movimentação nos produtos que têm movimentações pendentes
const initializeMovimentacaoStatus = () => {
  movimentacoes.forEach(mov => {
    if (mov.status === 'Pendente') {
      const produto = produtos.find(p => p.imei === mov.imei);
      if (produto) {
        produto.statusMovimentacao = 'Em movimentação';
        produto.movimentacaoId = mov.id;
      }
    }
  });
};

// Executar inicialização
initializeMovimentacaoStatus();

// Funções de API
export const getProdutos = (): Produto[] => {
  return [...produtos];
};

export const getProdutoById = (id: string): Produto | null => {
  return produtos.find(p => p.id === id) || null;
};

export const updateProduto = (id: string, updates: Partial<Produto>): Produto | null => {
  const index = produtos.findIndex(p => p.id === id);
  if (index === -1) return null;
  produtos[index] = { ...produtos[index], ...updates };
  return produtos[index];
};

// Atualizar valor recomendado com histórico
export const updateValorRecomendado = (
  id: string, 
  novoValor: number, 
  usuario: string
): Produto | null => {
  const produto = produtos.find(p => p.id === id);
  if (!produto) return null;

  const historicoEntry: HistoricoValorRecomendado = {
    data: new Date().toISOString().split('T')[0],
    usuario,
    valorAntigo: produto.vendaRecomendada || null,
    valorNovo: novoValor
  };

  produto.vendaRecomendada = novoValor;
  if (!produto.historicoValorRecomendado) {
    produto.historicoValorRecomendado = [];
  }
  produto.historicoValorRecomendado.unshift(historicoEntry);

  return produto;
};

// Atualizar loja do produto (transferência rápida)
export const updateProdutoLoja = (id: string, novaLoja: string, responsavel: string): Produto | null => {
  const produto = produtos.find(p => p.id === id);
  if (!produto) return null;

  const lojaAntiga = produto.loja;
  produto.loja = novaLoja;

  // Registrar movimentação
  const newMovId = `MOV-${new Date().getFullYear()}-${String(movimentacoes.length + 1).padStart(4, '0')}`;
  movimentacoes.push({
    id: newMovId,
    data: new Date().toISOString().split('T')[0],
    produto: produto.modelo,
    imei: produto.imei,
    quantidade: produto.quantidade,
    origem: lojaAntiga,
    destino: novaLoja,
    responsavel,
    motivo: 'Transferência via tabela de produtos'
  });

  return produto;
};

export const getNotasCompra = (): NotaCompra[] => {
  return [...notasCompra];
};

export const getNotaById = (id: string): NotaCompra | null => {
  return notasCompra.find(n => n.id === id) || null;
};

export const addNotaCompra = (nota: Omit<NotaCompra, 'id' | 'status'>): NotaCompra => {
  const year = new Date().getFullYear();
  const num = notasCompra.filter(n => n.id.includes(String(year))).length + 1;
  const newId = nota.origem === 'Urgência' ? `URG-${year}-${String(num).padStart(4, '0')}` : `NC-${year}-${String(num).padStart(4, '0')}`;
  const newNota: NotaCompra = { ...nota, id: newId, status: 'Pendente', origem: nota.origem || 'Normal' };
  notasCompra.push(newNota);
  return newNota;
};

export const updateNota = (id: string, updates: Partial<NotaCompra>): NotaCompra | null => {
  const index = notasCompra.findIndex(n => n.id === id);
  if (index === -1) return null;
  notasCompra[index] = { ...notasCompra[index], ...updates };
  return notasCompra[index];
};

export const finalizarNota = (id: string, pagamento: NotaCompra['pagamento'], responsavelFinanceiro: string): NotaCompra | null => {
  const nota = notasCompra.find(n => n.id === id);
  if (!nota) return null;
  
  nota.pagamento = pagamento;
  nota.responsavelFinanceiro = responsavelFinanceiro;
  nota.status = 'Concluído';
  
  // Atualizar status dos produtos relacionados
  nota.produtos.forEach(prodNota => {
    const produto = produtos.find(p => p.imei === prodNota.imei);
    if (produto) {
      produto.statusNota = 'Concluído';
    }
  });
  
  return nota;
};

export const getMovimentacoes = (): Movimentacao[] => {
  return [...movimentacoes];
};

export const addMovimentacao = (mov: Omit<Movimentacao, 'id'>): Movimentacao => {
  const year = new Date().getFullYear();
  const num = movimentacoes.filter(m => m.id.includes(String(year))).length + 1;
  const newId = `MOV-${year}-${String(num).padStart(4, '0')}`;
  const newMov: Movimentacao = { 
    ...mov, 
    id: newId,
    status: 'Pendente' // Movimentação começa pendente
  };
  
  // Marcar produto como "Em movimentação"
  const produto = produtos.find(p => p.imei === mov.imei);
  if (produto) {
    produto.statusMovimentacao = 'Em movimentação';
    produto.movimentacaoId = newId;
    console.log(`Produto ${produto.id} marcado como "Em movimentação" (${mov.origem} → ${mov.destino})`);
  }
  
  movimentacoes.push(newMov);
  return newMov;
};

// Confirmar recebimento de uma movimentação
export const confirmarRecebimentoMovimentacao = (
  movId: string, 
  responsavel: string
): Movimentacao | null => {
  const mov = movimentacoes.find(m => m.id === movId);
  if (!mov) return null;
  
  mov.status = 'Recebido';
  mov.dataRecebimento = new Date().toISOString();
  mov.responsavelRecebimento = responsavel;
  
  // Atualizar loja do produto e limpar status de movimentação
  const produto = produtos.find(p => p.imei === mov.imei);
  if (produto) {
    produto.loja = mov.destino;
    produto.statusMovimentacao = null; // Limpar status de movimentação
    produto.movimentacaoId = undefined; // Limpar referência
    console.log(`Produto ${produto.id} transferido para ${mov.destino} após confirmação`);
  }
  
  return mov;
};

export const getLojas = (): string[] => {
  return Object.values(LOJAS_IDS);
};

export const getFornecedores = (): string[] => {
  return [...fornecedores];
};

export const getEstoqueStats = () => {
  const totalProdutos = produtos.length;
  const valorTotalEstoque = produtos.reduce((acc, p) => acc + p.valorCusto * p.quantidade, 0);
  const produtosBateriaFraca = produtos.filter(p => p.saudeBateria < 85).length;
  const notasPendentes = notasCompra.filter(n => n.status === 'Pendente').length;
  
  return {
    totalProdutos,
    valorTotalEstoque,
    produtosBateriaFraca,
    notasPendentes
  };
};

// Função para adicionar produto migrado do OS/Pendentes para o estoque principal
export const addProdutoMigrado = (produto: Produto): Produto => {
  // Verificar se o produto já existe (evitar duplicatas)
  const existente = produtos.find(p => p.id === produto.id);
  if (existente) {
    console.warn(`Produto ${produto.id} já existe no estoque. Atualizando...`);
    Object.assign(existente, produto);
    return existente;
  }
  
  produtos.push(produto);
  console.log(`Produto ${produto.id} migrado com sucesso para o estoque principal.`);
  return produto;
};

// Bloquear produtos em uma venda com sinal
export const bloquearProdutosEmVenda = (vendaId: string, produtoIds: string[]): boolean => {
  let sucesso = true;
  produtoIds.forEach(produtoId => {
    const produto = produtos.find(p => p.id === produtoId);
    if (produto) {
      produto.bloqueadoEmVendaId = vendaId;
      console.log(`Produto ${produtoId} bloqueado na venda ${vendaId}`);
    } else {
      sucesso = false;
    }
  });
  return sucesso;
};

// Desbloquear produtos de uma venda
export const desbloquearProdutosDeVenda = (vendaId: string): boolean => {
  let produtosDesbloqueados = 0;
  produtos.forEach(produto => {
    if (produto.bloqueadoEmVendaId === vendaId) {
      produto.bloqueadoEmVendaId = undefined;
      produtosDesbloqueados++;
    }
  });
  console.log(`${produtosDesbloqueados} produtos desbloqueados da venda ${vendaId}`);
  return produtosDesbloqueados > 0;
};

// Obter produtos disponíveis (não bloqueados e não em movimentação)
export const getProdutosDisponiveis = (): Produto[] => {
  return produtos.filter(p => p.quantidade > 0 && !p.bloqueadoEmVendaId && !p.statusMovimentacao);
};

// Obter produtos disponíveis para uma loja específica (considerando compartilhamento Online/Matriz)
export const getProdutosDisponiveisPorLoja = (lojaId: string): Produto[] => {
  const lojaEstoqueReal = getLojaEstoqueReal(lojaId);
  return produtos.filter(p => 
    p.quantidade > 0 && 
    !p.bloqueadoEmVendaId && 
    !p.statusMovimentacao && 
    p.loja === lojaEstoqueReal
  );
};

// Verificar se produto está bloqueado
export const isProdutoBloqueado = (produtoId: string): boolean => {
  const produto = produtos.find(p => p.id === produtoId);
  return produto?.bloqueadoEmVendaId !== undefined;
};

// Abater produto do estoque (considerando compartilhamento Online/Matriz)
export const abaterProdutoDoEstoque = (produtoId: string, lojaVendaId: string): boolean => {
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) return false;
  
  // Se a venda é na Online, abate do estoque da Matriz
  const lojaEstoqueReal = getLojaEstoqueReal(lojaVendaId);
  
  if (produto.loja === lojaEstoqueReal && produto.quantidade > 0) {
    produto.quantidade -= 1;
    console.log(`Produto ${produtoId} abatido do estoque da loja ${lojaEstoqueReal}`);
    return true;
  }
  
  return false;
};
