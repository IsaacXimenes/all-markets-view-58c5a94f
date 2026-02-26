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
  tipo: 'entrada' | 'validacao' | 'pagamento' | 'discrepancia' | 'alerta_sla' | 'parecer_estoque' | 'parecer_assistencia' | 'despesa' | 'liberacao' | 'saida_matriz' | 'retorno_matriz' | 'venda_matriz';
  titulo: string;
  descricao: string;
  responsavel?: string;
  valor?: number;
  aparelhoId?: string; // Para validações de aparelhos específicos
  comprovante?: string; // URL de comprovante
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
  lojaAtualId?: string; // Loja onde o produto está fisicamente (para movimentações Matriz)
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
  statusRetiradaPecas?: 'Pendente Assistência' | 'Em Desmonte' | 'Concluída' | 'Cancelada' | null; // Status do fluxo de retirada de peças
  retiradaPecasId?: string; // ID da retirada de peças ativa
  // Campos para controle de empréstimo via Garantia/Assistência
  statusEmprestimo?: 'Empréstimo - Assistência' | null; // Status quando aparelho está emprestado
  emprestimoGarantiaId?: string; // ID da garantia vinculada
  emprestimoClienteId?: string; // ID do cliente com o aparelho
  emprestimoClienteNome?: string; // Nome do cliente
  emprestimoOsId?: string; // ID da OS vinculada (se houver)
  emprestimoDataHora?: string; // Data/hora do empréstimo
  // Campo para controle de reserva para troca via Garantia
  bloqueadoEmTrocaGarantiaId?: string; // ID da garantia quando reservado para troca
  // Status de revisão técnica (invisível para venda)
  statusRevisaoTecnica?: 'Em Revisao Tecnica' | null;
  loteRevisaoId?: string; // ID do lote de revisão vinculado
  tagRetornoAssistencia?: boolean; // Tag para produtos retornados da assistência
}

// ============= INTERFACES MOVIMENTAÇÃO MATRIZ =============

// Interface para item individual da movimentação matriz
export interface MovimentacaoMatrizItem {
  aparelhoId: string;
  imei: string;
  modelo: string;
  cor: string;
  statusItem: 'Enviado' | 'Devolvido' | 'Vendido';
  dataHoraRetorno?: string;
  responsavelRetorno?: string;
  // Campos para conferência automática via venda
  vendaId?: string;           // ID da venda quando conferido automaticamente
  vendedorId?: string;        // ID do vendedor responsável
  vendedorNome?: string;      // Nome do vendedor
  conferenciaAutomatica?: boolean; // Flag para indicar conferência automática
}

// Interface principal da movimentação matriz
export interface MovimentacaoMatriz {
  id: string;
  dataHoraLancamento: string;
  responsavelLancamento: string;
  lojaOrigemId: string; // Sempre Matriz
  lojaDestinoId: string;
  statusMovimentacao: 'Pendente' | 'Atrasado' | 'Finalizado - Dentro do Prazo' | 'Finalizado - Atrasado';
  dataHoraLimiteRetorno: string; // 22:00 do mesmo dia
  itens: MovimentacaoMatrizItem[];
  timeline: TimelineEntry[];
}

// Produto individual dentro de uma nota
export interface ProdutoNota {
  id?: string; // ID único do produto na nota
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
  // Campos de conferência
  statusConferencia?: 'Pendente' | 'Conferido';
  dataConferencia?: string;
  responsavelConferencia?: string;
  // Novos campos para individualização
  capacidade?: '64 GB' | '128 GB' | '256 GB' | '512 GB' | '1 TB';
  percentualBateria?: number; // 0 a 100
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
  produtos: ProdutoNota[];
  pagamento?: {
    formaPagamento: string;
    parcelas: number;
    valorParcela: number;
    dataVencimento: string;
    comprovante?: string; // URL do comprovante
    contaPagamento?: string; // ID da conta financeira
  };
  responsavelFinanceiro?: string;
  // Campos para fluxo de conferência
  valorConferido?: number;
  valorPendente?: number;
  tipoPagamento?: 'Parcial' | '100% Antecipado' | 'Pós-Conferência'; // Novo campo para fluxo tripartite
  statusPagamento?: 'Aguardando Conferência' | 'Pago' | 'Parcialmente Pago';
  statusConferencia?: 'Em Conferência' | 'Conferência Completa' | 'Discrepância Detectada' | 'Finalizada com Pendência';
  dataConferenciaCompleta?: string;
  dataVencimento?: string;
  responsavelEstoque?: string;
  vendedorRegistro?: string; // Quem registrou (para urgências)
  discrepancia?: boolean;
  motivoDiscrepancia?: string;
  acaoRecomendada?: 'Cobrar Fornecedor' | 'Cobrar Estoque';
  fotoComprovante?: string; // URL da foto (urgências)
  timeline?: TimelineEntry[];
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
};

// ID do Estoque - SIA (origem das movimentações matriz)
const ESTOQUE_SIA_ID = 'dcc6547f';

// Constantes para compartilhamento de estoque
export const LOJA_MATRIZ_ID = LOJAS_IDS.MATRIZ;
export const LOJA_ONLINE_ID = LOJAS_IDS.ONLINE;
export const ESTOQUE_SIA_LOJA_ID = ESTOQUE_SIA_ID;

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

// Função para obter todas as lojas do mesmo pool de estoque compartilhado
// UNIDIRECIONAL: Online vê Matriz, mas Matriz NÃO vê Online
export const getLojasPorPoolEstoque = (lojaId: string): string[] => {
  if (lojaId === LOJA_ONLINE_ID) {
    return [LOJA_ONLINE_ID, LOJA_MATRIZ_ID]; // Online pode ver estoque da Matriz
  }
  // Matriz e qualquer outra loja: apenas ela mesma
  return [lojaId];
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
  // 1 produto por loja - JK Shopping (saúde bateria 95% - verde)
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
    saudeBateria: 95,
    loja: LOJAS_IDS.JK_SHOPPING,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Lacrado',
    historicoCusto: [
      { data: '2024-11-15', fornecedor: 'Apple Distribuidor BR', valor: 7200.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-10', usuario: 'Lucas Mendes', valorAntigo: null, valorNovo: 12999.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor'
  },
  // Matriz (saúde bateria 85% - normal)
  {
    id: 'PROD-0011',
    imei: '352123456789013',
    marca: 'Apple',
    modelo: 'iPhone 14 Pro',
    cor: 'Roxo Profundo',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 3800.00,
    valorVendaSugerido: 6840.00,
    vendaRecomendada: 5499.00,
    saudeBateria: 85,
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
    origemEntrada: 'Base de Troca',
    timeline: [
      { id: 'TL-0011-1', tipo: 'entrada', data: '2024-11-10T09:00:00', titulo: 'Entrada via Base de Troca', descricao: 'Produto recebido via Base de Troca', responsavel: 'Carlos Oliveira' }
    ]
  },
  // Shopping Sul (saúde bateria 78% - amarelo)
  {
    id: 'PROD-0012',
    imei: '352123456789014',
    marca: 'Apple',
    modelo: 'iPhone 13',
    cor: 'Preto',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 2400.00,
    valorVendaSugerido: 4320.00,
    vendaRecomendada: 3599.00,
    saudeBateria: 78,
    loja: LOJAS_IDS.SHOPPING_SUL,
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
    origemEntrada: 'Fornecedor'
  },
  // Águas Lindas (saúde bateria 65% - vermelho)
  {
    id: 'PROD-0013',
    imei: '352123456789015',
    marca: 'Apple',
    modelo: 'iPhone 12',
    cor: 'Azul',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 1900.00,
    valorVendaSugerido: 3420.00,
    saudeBateria: 65,
    loja: LOJAS_IDS.AGUAS_LINDAS,
    estoqueConferido: false,
    assistenciaConferida: false,
    condicao: 'Estado regular',
    pareceres: 'Bateria muito degradada, necessita troca urgente',
    historicoCusto: [
      { data: '2024-11-20', fornecedor: 'GlobalCell Supply', valor: 1900.00 }
    ],
    historicoValorRecomendado: [],
    statusNota: 'Pendente',
    origemEntrada: 'Base de Troca'
  },
  // Online (compartilha estoque com Matriz - saúde bateria 100% - verde)
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
    loja: LOJAS_IDS.ONLINE,
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
  // ============= PRODUTOS NO ESTOQUE - SIA (para movimentação matriz) =============
  {
    id: 'PROD-0020',
    imei: '352123456789100',
    marca: 'Apple',
    modelo: 'iPhone 15 Pro Max',
    cor: 'Titânio Azul',
    tipo: 'Novo',
    quantidade: 1,
    valorCusto: 7500.00,
    valorVendaSugerido: 15500.00,
    vendaRecomendada: 13499.00,
    saudeBateria: 100,
    loja: ESTOQUE_SIA_ID,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Lacrado',
    historicoCusto: [
      { data: '2025-01-20', fornecedor: 'Apple Distribuidor BR', valor: 7500.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-20', usuario: 'Eilanne Mota Alves', valorAntigo: null, valorNovo: 13499.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor'
  },
  {
    id: 'PROD-0021',
    imei: '352123456789101',
    marca: 'Apple',
    modelo: 'iPhone 15 Pro',
    cor: 'Titânio Preto',
    tipo: 'Novo',
    quantidade: 1,
    valorCusto: 6800.00,
    valorVendaSugerido: 13600.00,
    vendaRecomendada: 11999.00,
    saudeBateria: 100,
    loja: ESTOQUE_SIA_ID,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Lacrado',
    historicoCusto: [
      { data: '2025-01-18', fornecedor: 'TechSupply Imports', valor: 6800.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-18', usuario: 'Eilanne Mota Alves', valorAntigo: null, valorNovo: 11999.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor'
  },
  {
    id: 'PROD-0022',
    imei: '352123456789102',
    marca: 'Apple',
    modelo: 'iPhone 14 Pro Max',
    cor: 'Dourado',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 4200.00,
    valorVendaSugerido: 8400.00,
    vendaRecomendada: 6999.00,
    saudeBateria: 92,
    loja: ESTOQUE_SIA_ID,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Excelente estado',
    pareceres: 'Produto em perfeitas condições',
    historicoCusto: [
      { data: '2025-01-15', fornecedor: 'MobileWorld Atacado', valor: 4200.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-15', usuario: 'Athirson Paiva', valorAntigo: null, valorNovo: 6999.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Base de Troca',
    timeline: [
      { id: 'TL-0022-1', tipo: 'entrada', data: '2025-01-15T10:00:00', titulo: 'Entrada via Base de Troca', descricao: 'Produto recebido em troca', responsavel: 'Athirson Paiva' }
    ]
  },
  {
    id: 'PROD-0023',
    imei: '352123456789103',
    marca: 'Apple',
    modelo: 'iPhone 15',
    cor: 'Azul',
    tipo: 'Novo',
    quantidade: 1,
    valorCusto: 5400.00,
    valorVendaSugerido: 10800.00,
    vendaRecomendada: 9299.00,
    saudeBateria: 100,
    loja: ESTOQUE_SIA_ID,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Lacrado',
    historicoCusto: [
      { data: '2025-01-22', fornecedor: 'FastCell Distribuição', valor: 5400.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-22', usuario: 'Eilanne Mota Alves', valorAntigo: null, valorNovo: 9299.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor'
  },
  {
    id: 'PROD-0024',
    imei: '352123456789104',
    marca: 'Apple',
    modelo: 'iPhone 14',
    cor: 'Vermelho',
    tipo: 'Seminovo',
    quantidade: 1,
    valorCusto: 3200.00,
    valorVendaSugerido: 6400.00,
    vendaRecomendada: 5299.00,
    saudeBateria: 88,
    loja: ESTOQUE_SIA_ID,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Bom estado',
    pareceres: 'Pequenos riscos na traseira, funcionamento perfeito',
    historicoCusto: [
      { data: '2025-01-10', fornecedor: 'GlobalCell Supply', valor: 3200.00 }
    ],
    historicoValorRecomendado: [
      { data: '2025-01-10', usuario: 'Athirson Paiva', valorAntigo: null, valorNovo: 5299.00 }
    ],
    statusNota: 'Concluído',
    origemEntrada: 'Base de Troca',
    timeline: [
      { id: 'TL-0024-1', tipo: 'entrada', data: '2025-01-10T14:30:00', titulo: 'Entrada via Base de Troca', descricao: 'Produto recebido em troca de cliente', responsavel: 'Athirson Paiva' }
    ]
  }
];

// Exportar IDs de lojas para uso em outros módulos
export const ESTOQUE_LOJAS_IDS = LOJAS_IDS;

// Helper para derivar o status atual do aparelho
export const getStatusAparelho = (produto: Produto): string => {
  if (produto.statusRevisaoTecnica === 'Em Revisao Tecnica') return 'Em Revisão Técnica';
  if (produto.statusRetiradaPecas && produto.statusRetiradaPecas !== 'Cancelada') return 'Retirada de Peças';
  if (produto.quantidade === 0 && produto.statusNota === 'Concluído') return 'Vendido';
  if (produto.statusMovimentacao === 'Em movimentação') return 'Em movimentação';
  if (produto.statusEmprestimo === 'Empréstimo - Assistência') return 'Empréstimo';
  if (produto.bloqueadoEmTrocaGarantiaId) {
    return produto.quantidade === 0 ? 'Troca - Garantia' : 'Reservado para Troca';
  }
  if (produto.bloqueadoEmVendaId) return 'Bloqueado';
  if (produto.tagRetornoAssistencia) return 'Retorno de Assistência';
  return 'Disponível';
};

// Marcar produtos como disponíveis (usado pelo Caminho Verde)
export const marcarProdutosComoDisponiveis = (imeis: string[]): void => {
  for (const imei of imeis) {
    const imeiLimpo = imei.replace(/[^0-9]/g, '');
    const produto = produtos.find(p => p.imei.replace(/[^0-9]/g, '') === imeiLimpo);
    if (produto) {
      produto.estoqueConferido = true;
      produto.assistenciaConferida = true;
      produto.statusRevisaoTecnica = null;
      produto.tagRetornoAssistencia = false;
    }
  }
};

// Marcar produtos como Em Revisão Técnica (usado pelo Caminho Amarelo)
export const marcarProdutosEmRevisaoTecnica = (imeis: string[], loteRevisaoId: string): void => {
  for (const imei of imeis) {
    const imeiLimpo = imei.replace(/[^0-9]/g, '');
    const produto = produtos.find(p => p.imei.replace(/[^0-9]/g, '') === imeiLimpo);
    if (produto) {
      produto.statusRevisaoTecnica = 'Em Revisao Tecnica';
      produto.loteRevisaoId = loteRevisaoId;
    }
  }
};

// Marcar produto como retornado da assistência
export const marcarProdutoRetornoAssistencia = (imei: string): void => {
  const imeiLimpo = imei.replace(/[^0-9]/g, '');
  const produto = produtos.find(p => p.imei.replace(/[^0-9]/g, '') === imeiLimpo);
  if (produto) {
    produto.tagRetornoAssistencia = true;
    produto.statusRevisaoTecnica = null;
    produto.loteRevisaoId = undefined;
  }
};

// Marcar produto como devolvido ao fornecedor
export const marcarProdutoDevolvido = (imei: string): void => {
  const imeiLimpo = imei.replace(/[^0-9]/g, '');
  const produto = produtos.find(p => p.imei.replace(/[^0-9]/g, '') === imeiLimpo);
  if (produto) {
    produto.quantidade = 0;
    produto.statusRevisaoTecnica = null;
    produto.loteRevisaoId = undefined;
    produto.statusNota = 'Concluído';
  }
};

// Validar retorno de assistência (remover tag e tornar disponível)
export const validarRetornoAssistencia = (imei: string, responsavel: string): boolean => {
  const imeiLimpo = imei.replace(/[^0-9]/g, '');
  const produto = produtos.find(p => p.imei.replace(/[^0-9]/g, '') === imeiLimpo);
  if (!produto || !produto.tagRetornoAssistencia) return false;
  
  produto.tagRetornoAssistencia = false;
  produto.estoqueConferido = true;
  produto.assistenciaConferida = true;
  
  // Registrar na timeline
  if (!produto.timeline) produto.timeline = [];
  produto.timeline.push({
    id: `TL-${produto.id}-RET-${Date.now()}`,
    data: new Date().toISOString(),
    tipo: 'validacao',
    titulo: 'Retorno de Assistência Validado',
    descricao: `Aparelho validado pelo estoquista após retorno da assistência`,
    responsavel
  });
  
  return true;
};

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
  // NC-2025-0006 - 1 produto, 0% conferido
  {
    id: 'NC-2025-0006',
    data: '2024-11-23',
    numeroNota: 'NF-45683',
    fornecedor: 'Apple Distribuidor BR',
    valorTotal: 6400.00,
    status: 'Pendente',
    origem: 'Normal',
    valorConferido: 0,
    valorPendente: 6400.00,
    statusPagamento: 'Aguardando Conferência',
    statusConferencia: 'Em Conferência',
    produtos: [
      { 
        id: 'PROD-NC6-001',
        marca: 'Apple', 
        modelo: 'iPhone 15 Pro', 
        cor: 'Preto Espacial', 
        imei: '352123456789021', 
        tipo: 'Novo', 
        tipoProduto: 'Aparelho',
        quantidade: 1, 
        valorUnitario: 6400.00, 
        valorTotal: 6400.00, 
        saudeBateria: 100,
        statusConferencia: 'Pendente'
      }
    ],
    timeline: [
      {
        id: 'TL-NC6-001',
        data: '2024-11-23T09:00:00Z',
        tipo: 'entrada',
        titulo: 'Nota Cadastrada',
        descricao: 'Nota de entrada cadastrada no sistema',
        responsavel: 'Sistema'
      }
    ]
  },
  // NC-2025-0007 - 2 produtos, 50% conferido (1/2)
  {
    id: 'NC-2025-0007',
    data: '2024-11-24',
    numeroNota: 'NF-45684',
    fornecedor: 'FastCell Distribuição',
    valorTotal: 5000.00,
    status: 'Pendente',
    origem: 'Normal',
    valorConferido: 3400.00,
    valorPendente: 1600.00,
    statusPagamento: 'Aguardando Conferência',
    statusConferencia: 'Em Conferência',
    produtos: [
      { 
        id: 'PROD-NC7-001',
        marca: 'Apple', 
        modelo: 'iPhone 14', 
        cor: 'Vermelho', 
        imei: '352123456789022', 
        tipo: 'Seminovo', 
        tipoProduto: 'Aparelho',
        quantidade: 1, 
        valorUnitario: 3400.00, 
        valorTotal: 3400.00, 
        saudeBateria: 82,
        statusConferencia: 'Conferido',
        dataConferencia: '2024-11-25T14:30:00Z',
        responsavelConferencia: 'Ana Costa'
      },
      { 
        id: 'PROD-NC7-002',
        marca: 'Apple', 
        modelo: 'iPhone 11', 
        cor: 'Preto', 
        imei: '352123456789023', 
        tipo: 'Seminovo', 
        tipoProduto: 'Aparelho',
        quantidade: 1, 
        valorUnitario: 1600.00, 
        valorTotal: 1600.00, 
        saudeBateria: 72,
        statusConferencia: 'Pendente'
      }
    ],
    timeline: [
      {
        id: 'TL-NC7-002',
        data: '2024-11-25T14:30:00Z',
        tipo: 'validacao',
        titulo: 'Aparelho Validado',
        descricao: 'iPhone 14 Vermelho conferido - R$ 3.400,00. Progresso: 1/2 (50%)',
        responsavel: 'Ana Costa',
        valor: 3400.00
      },
      {
        id: 'TL-NC7-001',
        data: '2024-11-24T09:00:00Z',
        tipo: 'entrada',
        titulo: 'Nota Cadastrada',
        descricao: 'Nota de entrada cadastrada no sistema',
        responsavel: 'Sistema'
      }
    ]
  },
  // NC-2025-0008 - 3 produtos, 66% conferido (2/3)
  {
    id: 'NC-2025-0008',
    data: '2024-11-25',
    numeroNota: 'NF-45685',
    fornecedor: 'iStore Fornecedor',
    valorTotal: 19200.00,
    status: 'Pendente',
    origem: 'Normal',
    valorConferido: 12000.00,
    valorPendente: 7200.00,
    statusPagamento: 'Aguardando Conferência',
    statusConferencia: 'Em Conferência',
    produtos: [
      { 
        id: 'PROD-NC8-001',
        marca: 'Apple', 
        modelo: 'iPhone 15 Pro Max', 
        cor: 'Branco', 
        imei: '352123456789024', 
        tipo: 'Novo', 
        tipoProduto: 'Aparelho',
        quantidade: 1, 
        valorUnitario: 7200.00, 
        valorTotal: 7200.00, 
        saudeBateria: 100,
        statusConferencia: 'Conferido',
        dataConferencia: '2024-11-26T10:15:00Z',
        responsavelConferencia: 'Pedro Lima'
      },
      { 
        id: 'PROD-NC8-002',
        marca: 'Apple', 
        modelo: 'iPhone 15 Pro Max', 
        cor: 'Preto', 
        imei: '352123456789026', 
        tipo: 'Novo', 
        tipoProduto: 'Aparelho',
        quantidade: 1, 
        valorUnitario: 7200.00, 
        valorTotal: 7200.00, 
        saudeBateria: 100,
        statusConferencia: 'Pendente'
      },
      { 
        id: 'PROD-NC8-003',
        marca: 'Apple', 
        modelo: 'iPhone 14 Pro', 
        cor: 'Dourado', 
        imei: '352123456789025', 
        tipo: 'Seminovo', 
        tipoProduto: 'Aparelho',
        quantidade: 1, 
        valorUnitario: 4800.00, 
        valorTotal: 4800.00, 
        saudeBateria: 95,
        statusConferencia: 'Conferido',
        dataConferencia: '2024-11-26T14:30:00Z',
        responsavelConferencia: 'Ana Costa'
      }
    ],
    timeline: [
      {
        id: 'TL-NC8-003',
        data: '2024-11-26T14:30:00Z',
        tipo: 'validacao',
        titulo: 'Aparelho Validado',
        descricao: 'iPhone 14 Pro Dourado conferido - R$ 4.800,00. Progresso: 2/3 (66%)',
        responsavel: 'Ana Costa',
        valor: 4800.00
      },
      {
        id: 'TL-NC8-002',
        data: '2024-11-26T10:15:00Z',
        tipo: 'validacao',
        titulo: 'Aparelho Validado',
        descricao: 'iPhone 15 Pro Max Branco conferido - R$ 7.200,00. Progresso: 1/3 (33%)',
        responsavel: 'Pedro Lima',
        valor: 7200.00
      },
      {
        id: 'TL-NC8-001',
        data: '2024-11-25T09:00:00Z',
        tipo: 'entrada',
        titulo: 'Nota Cadastrada',
        descricao: 'Nota de entrada cadastrada no sistema',
        responsavel: 'Sistema'
      }
    ]
  },
  // URG-2025-0001 - Nota de Urgência com foto e vendedor
  {
    id: 'URG-2025-0001',
    data: '2024-11-26',
    numeroNota: 'URG-001',
    fornecedor: 'TechSupply Urgente',
    valorTotal: 3200.00,
    status: 'Pendente',
    origem: 'Urgência',
    statusUrgencia: 'Aguardando Financeiro',
    vendedorRegistro: 'Carlos Vendedor',
    fotoComprovante: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400',
    valorConferido: 0,
    valorPendente: 3200.00,
    statusPagamento: 'Aguardando Conferência',
    statusConferencia: 'Em Conferência',
    produtos: [
      {
        id: 'PROD-URG1-001',
        marca: 'Apple',
        modelo: 'iPhone 14 Pro Max',
        cor: 'Roxo Profundo',
        imei: '352123456789030',
        tipo: 'Seminovo',
        tipoProduto: 'Aparelho',
        quantidade: 1,
        valorUnitario: 3200.00,
        valorTotal: 3200.00,
        saudeBateria: 88,
        statusConferencia: 'Pendente'
      }
    ],
    timeline: [
      {
        id: 'TL-URG1-001',
        data: '2024-11-26T16:45:00Z',
        tipo: 'entrada',
        titulo: 'Urgência Registrada',
        descricao: 'Nota de urgência registrada por Carlos Vendedor',
        responsavel: 'Carlos Vendedor'
      }
    ]
  }
];

let movimentacoes: Movimentacao[] = [
  {
    id: 'MOV-2025-0001',
    data: '2024-11-10',
    produto: 'iPhone 14 Pro',
    imei: '352123456789013',
    quantidade: 1,
    origem: LOJAS_IDS.MATRIZ,         // ID válido: Loja - Matriz
    destino: LOJAS_IDS.JK_SHOPPING,   // ID válido: Loja - JK Shopping
    responsavel: 'João Silva',
    motivo: 'Transferência de estoque',
    status: 'Pendente'
  },
  {
    id: 'MOV-2025-0002',
    data: '2024-11-15',
    produto: 'iPhone 13',
    imei: '352123456789014',
    quantidade: 1,
    origem: LOJAS_IDS.SHOPPING_SUL,   // ID válido: Loja - Shopping Sul
    destino: LOJAS_IDS.AGUAS_LINDAS,  // ID válido: Loja - Águas Lindas Shopping
    responsavel: 'Maria Santos',
    motivo: 'Solicitação do gerente',
    status: 'Pendente'
  }
];

// ============= DADOS MOCKADOS - MOVIMENTAÇÕES MATRIZ =============
let movimentacoesMatriz: MovimentacaoMatriz[] = [];

// Contadores para IDs
let movMatrizIdCounter = 1;

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

// Atualizar custo de assistência atomicamente (soma ao existente)
export const atualizarCustoAssistencia = (produtoId: string, osId: string, custoReparo: number): Produto | null => {
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) return null;
  
  const custoAtual = produto.custoAssistencia || 0;
  produto.custoAssistencia = custoAtual + custoReparo;
  
  // Registrar na timeline do produto
  if (!produto.timeline) produto.timeline = [];
  produto.timeline.push({
    id: `TL-ASSIST-${Date.now()}`,
    tipo: 'parecer_assistencia',
    data: new Date().toISOString(),
    titulo: `Investimento em Reparo (${osId})`,
    descricao: `Custo de reparo: R$ ${custoReparo.toFixed(2)} — Custo acumulado: R$ ${produto.custoAssistencia.toFixed(2)}`,
    responsavel: 'Sistema',
    valor: custoReparo,
    aparelhoId: produtoId
  });
  
  return produto;
};

// Obter histórico de custos de reparo vinculados a um produto
export const getHistoricoCustosReparo = (produtoId: string): { osId: string; valor: number; data: string }[] => {
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto || !produto.timeline) return [];
  
  return produto.timeline
    .filter(t => t.tipo === 'parecer_assistencia' && t.titulo?.includes('Investimento em Reparo'))
    .map(t => ({
      osId: t.titulo?.match(/\(([^)]+)\)/)?.[1] || '',
      valor: t.valor || 0,
      data: t.data
    }));
};

// Obter produto por IMEI
export const getProdutoByIMEI = (imei: string): Produto | null => {
  return produtos.find(p => p.imei === imei) || null;
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
    const origemAnterior = produto.loja;
    produto.loja = mov.destino;
    produto.statusMovimentacao = null; // Limpar status de movimentação
    produto.movimentacaoId = undefined; // Limpar referência
    
    // Registrar na timeline do produto
    if (!produto.timeline) produto.timeline = [];
    produto.timeline.push({
      id: `TL-${produto.id}-MOV-${mov.id}`,
      tipo: 'entrada',
      data: new Date().toISOString(),
      titulo: 'Movimentação Finalizada',
      descricao: `Aparelho recebido na loja de destino. Origem: ${origemAnterior} → Destino: ${mov.destino}. Movimentação ${mov.id} concluída.`,
      responsavel: responsavel,
    });
    
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

// ============= MIGRAÇÃO DE APARELHO NOVO PARA ESTOQUE =============
// Função específica para aparelhos NOVOS - vão direto para estoque (sem triagem)

export const migrarAparelhoNovoParaEstoque = (
  produto: ProdutoNota,
  notaId: string,
  fornecedor: string,
  lojaDestino: string,
  responsavel: string
): Produto => {
  // Verificar duplicata por IMEI
  const jaExiste = produtos.find(p => p.imei === produto.imei);
  if (jaExiste) {
    console.warn(`[ESTOQUE API] Produto com IMEI ${produto.imei} já existe no estoque. Atualizando...`);
    return jaExiste;
  }
  
  const newId = generateProductId();
  
  const novoProduto: Produto = {
    id: newId,
    imei: produto.imei,
    marca: produto.marca,
    modelo: produto.modelo,
    cor: produto.cor,
    tipo: 'Novo',
    quantidade: 1,
    valorCusto: produto.valorUnitario,
    valorVendaSugerido: produto.valorUnitario * 1.8, // Margem sugerida padrão
    vendaRecomendada: undefined, // Pendente definição pelo gestor
    saudeBateria: produto.saudeBateria || 100,
    loja: lojaDestino,
    estoqueConferido: true, // Já conferido pela nota
    assistenciaConferida: true, // Não precisa passar pela assistência
    condicao: 'Lacrado',
    historicoCusto: [{
      data: new Date().toISOString().split('T')[0],
      fornecedor: fornecedor,
      valor: produto.valorUnitario
    }],
    historicoValorRecomendado: [],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor',
    timeline: [{
      id: `TL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: new Date().toISOString(),
      tipo: 'entrada',
      titulo: 'Entrada Direta via Nota de Compra',
      descricao: `Aparelho NOVO ${newId} adicionado ao estoque via nota ${notaId} - Fornecedor: ${fornecedor}`,
      responsavel
    }]
  };
  
  produtos.push(novoProduto);
  registerProductId(newId);
  
  console.log(`[ESTOQUE API] Aparelho NOVO ${produto.marca} ${produto.modelo} (IMEI: ${produto.imei}) adicionado diretamente ao estoque com ID ${newId}`);
  
  return novoProduto;
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
  const lojasPool = getLojasPorPoolEstoque(lojaId);
  return produtos.filter(p => {
    if (p.quantidade <= 0) return false;
    if (p.bloqueadoEmVendaId) return false;
    if (p.statusMovimentacao) return false;
    // Usar localização física efetiva: lojaAtualId (se existir) ou loja original
    const lojaEfetivaProduto = p.lojaAtualId || p.loja;
    return lojasPool.includes(lojaEfetivaProduto);
  });
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
  
  // Usar localização física efetiva: lojaAtualId (se existir) ou loja original
  const lojaEfetivaProduto = produto.lojaAtualId || produto.loja;
  if (lojaEfetivaProduto === lojaEstoqueReal && produto.quantidade > 0) {
    produto.quantidade -= 1;
    console.log(`Produto ${produtoId} abatido do estoque da loja ${lojaEstoqueReal}`);
    return true;
  }
  
  return false;
};

// ============= VALIDAÇÃO PROGRESSIVA DE APARELHOS =============

// Validar um aparelho individualmente e atualizar valorConferido da nota
export const validarAparelhoNota = (
  notaId: string,
  aparelhoImei: string,
  dados: {
    responsavel: string;
    observacoes?: string;
  }
): { sucesso: boolean; nota?: NotaCompra; percentualConferencia?: number; conferidoCompleto?: boolean; discrepancia?: boolean } => {
  const nota = notasCompra.find(n => n.id === notaId);
  if (!nota) return { sucesso: false };

  // Encontrar o aparelho na nota
  const aparelhoIndex = nota.produtos.findIndex(p => p.imei === aparelhoImei);
  if (aparelhoIndex === -1) return { sucesso: false };

  const aparelho = nota.produtos[aparelhoIndex];

  // Verificar se já foi conferido
  if (aparelho.statusConferencia === 'Conferido') {
    return { sucesso: false };
  }

  // Atribuir ID ao produto se não tiver
  if (!aparelho.id) {
    aparelho.id = `PROD-${nota.id}-${String(aparelhoIndex + 1).padStart(3, '0')}`;
  }

  // Marcar como conferido
  aparelho.statusConferencia = 'Conferido';
  aparelho.dataConferencia = new Date().toISOString();
  aparelho.responsavelConferencia = dados.responsavel;

  // Atualizar nota
  nota.produtos[aparelhoIndex] = aparelho;

  // Recalcular valores conferidos
  const aparelhosConferidos = nota.produtos.filter(p => p.statusConferencia === 'Conferido');
  const valorConferido = aparelhosConferidos.reduce((acc, p) => acc + p.valorTotal, 0);
  const totalAparelhos = nota.produtos.length;
  const percentualConferencia = Math.round((aparelhosConferidos.length / totalAparelhos) * 100);

  nota.valorConferido = valorConferido;
  nota.valorPendente = nota.valorTotal - valorConferido;
  nota.responsavelEstoque = dados.responsavel;

  // Verificar se atingiu 100%
  const conferidoCompleto = aparelhosConferidos.length === totalAparelhos;
  
  // Detectar discrepâncias (tolerância de 0.1%)
  let discrepancia = false;
  let statusConferencia: NotaCompra['statusConferencia'] = 'Em Conferência';

  if (conferidoCompleto) {
    const tolerancia = nota.valorTotal * 0.001;
    if (Math.abs(valorConferido - nota.valorTotal) > tolerancia) {
      discrepancia = true;
      nota.discrepancia = true;
      statusConferencia = 'Discrepância Detectada';
      
      if (valorConferido < nota.valorTotal) {
        nota.motivoDiscrepancia = `Valor conferido (${formatCurrency(valorConferido)}) menor que valor da nota (${formatCurrency(nota.valorTotal)})`;
        nota.acaoRecomendada = 'Cobrar Fornecedor';
      } else {
        nota.motivoDiscrepancia = `Valor conferido (${formatCurrency(valorConferido)}) maior que valor da nota (${formatCurrency(nota.valorTotal)})`;
        nota.acaoRecomendada = 'Cobrar Estoque';
      }
    } else {
      statusConferencia = 'Conferência Completa';
      nota.dataConferenciaCompleta = new Date().toISOString();
    }
  }

  nota.statusConferencia = statusConferencia;

  // Adicionar entrada na timeline
  if (!nota.timeline) {
    nota.timeline = [];
  }
  
  nota.timeline.unshift({
    id: `TL-${nota.id}-${String(nota.timeline.length + 1).padStart(3, '0')}`,
    data: new Date().toISOString(),
    tipo: 'validacao',
    titulo: `Aparelho Validado`,
    descricao: `${aparelho.marca} ${aparelho.modelo} (IMEI: ${aparelhoImei}) conferido. Progresso: ${aparelhosConferidos.length}/${totalAparelhos} (${percentualConferencia}%)`,
    responsavel: dados.responsavel,
    aparelhoId: aparelho.id,
    valor: aparelho.valorTotal
  });

  return {
    sucesso: true,
    nota,
    percentualConferencia,
    conferidoCompleto,
    discrepancia
  };
};

// Verificar conferência de uma nota
export const verificarConferenciaNota = (notaId: string): {
  conferido: boolean;
  percentual: number;
  discrepancia: boolean;
  motivo?: string;
  aparelhosConferidos: number;
  aparelhosTotal: number;
} => {
  const nota = notasCompra.find(n => n.id === notaId);
  if (!nota) return { conferido: false, percentual: 0, discrepancia: false, aparelhosConferidos: 0, aparelhosTotal: 0 };

  const aparelhosConferidos = nota.produtos.filter(p => p.statusConferencia === 'Conferido').length;
  const aparelhosTotal = nota.produtos.length;
  const percentual = Math.round((aparelhosConferidos / aparelhosTotal) * 100);
  const conferido = aparelhosConferidos === aparelhosTotal;
  
  return {
    conferido,
    percentual,
    discrepancia: nota.discrepancia || false,
    motivo: nota.motivoDiscrepancia,
    aparelhosConferidos,
    aparelhosTotal
  };
};

// Validar múltiplos aparelhos em lote
export const validarAparelhosEmLote = (
  notaId: string,
  aparelhoImeis: string[],
  responsavel: string,
  observacoes?: string
): { sucesso: boolean; validados: number; erros: string[]; nota?: NotaCompra } => {
  const nota = notasCompra.find(n => n.id === notaId);
  if (!nota) return { sucesso: false, validados: 0, erros: ['Nota não encontrada'] };

  const erros: string[] = [];
  let validados = 0;

  for (const imei of aparelhoImeis) {
    const resultado = validarAparelhoNota(notaId, imei, { responsavel, observacoes });
    if (resultado.sucesso) {
      validados++;
    } else {
      erros.push(`Falha ao validar IMEI ${imei}`);
    }
  }

  // Buscar nota atualizada
  const notaAtualizada = notasCompra.find(n => n.id === notaId);

  return {
    sucesso: validados > 0,
    validados,
    erros,
    nota: notaAtualizada || undefined
  };
};

// Helper para formatar moeda
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// ============= INTEGRAÇÃO COM FINANCEIRO =============

// Criar nota de compra e automaticamente criar pendência no Financeiro
export const criarNotaComPendencia = (notaData: Omit<NotaCompra, 'id' | 'status'>): NotaCompra => {
  // Importar dinamicamente para evitar dependência circular
  const { criarPendenciaFinanceira } = require('./pendenciasFinanceiraApi');
  // Criar a nota normalmente
  const novaNota = addNotaCompra(notaData);
  
  // Inicializar valores de conferência
  novaNota.valorConferido = 0;
  novaNota.valorPendente = novaNota.valorTotal;
  novaNota.statusConferencia = 'Em Conferência';
  novaNota.statusPagamento = 'Aguardando Conferência';
  
  // Criar pendência financeira automaticamente
  criarPendenciaFinanceira(novaNota);
  
  // Marcar como enviada para financeiro
  localStorage.setItem(`nota_status_${novaNota.id}`, 'Enviado para Financeiro');
  
  return novaNota;
};

// Atualizar status de pagamento da nota
export const atualizarStatusPagamento = (
  notaId: string, 
  status: 'Aguardando Conferência' | 'Pago' | 'Parcialmente Pago'
): NotaCompra | null => {
  const nota = notasCompra.find(n => n.id === notaId);
  if (!nota) return null;
  
  nota.statusPagamento = status;
  
  // Se pago, atualizar status geral
  if (status === 'Pago') {
    nota.status = 'Concluído';
    localStorage.setItem(`nota_status_${notaId}`, 'Concluído');
  }
  
  // Adicionar entrada na timeline
  if (!nota.timeline) nota.timeline = [];
  nota.timeline.unshift({
    id: `TL-${notaId}-${String(nota.timeline.length + 1).padStart(3, '0')}`,
    data: new Date().toISOString(),
    tipo: 'pagamento',
    titulo: 'Status de Pagamento Atualizado',
    descricao: `Status alterado para: ${status}`,
    responsavel: 'Sistema'
  });
  
  return nota;
};

// Sincronizar validação de aparelho com pendência financeira
export const sincronizarValidacaoComFinanceiro = (
  notaId: string,
  aparelhoInfo: { modelo: string; imei: string; valor: number },
  responsavel: string
): void => {
  const nota = notasCompra.find(n => n.id === notaId);
  if (!nota) return;
  
  const aparelhosConferidos = nota.produtos.filter(p => p.statusConferencia === 'Conferido').length;
  const valorConferido = nota.produtos
    .filter(p => p.statusConferencia === 'Conferido')
    .reduce((acc, p) => acc + p.valorTotal, 0);
  
  // Importar dinamicamente para evitar dependência circular
  const { atualizarPendencia } = require('./pendenciasFinanceiraApi');
  
  // Atualizar pendência no Financeiro
  atualizarPendencia(notaId, {
    valorConferido,
    aparelhosConferidos,
    statusConferencia: nota.statusConferencia,
    responsavel,
    aparelhoInfo
  });
};

// ============= FUNÇÕES MOVIMENTAÇÃO MATRIZ =============

// Obter ID da Matriz
export const getMatrizLojaId = (): string => {
  return LOJAS_IDS.MATRIZ;
};

// Obter ID do Estoque - SIA
export const getEstoqueSiaId = (): string => {
  return ESTOQUE_SIA_ID;
};

// Gerar ID único para movimentação matriz
const generateMovMatrizId = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const id = `MM-${dateStr}-${String(movMatrizIdCounter++).padStart(4, '0')}`;
  return id;
};

// Obter todas as movimentações matriz
export const getMovimentacoesMatriz = (filtros?: {
  status?: string;
  lojaDestinoId?: string;
  dataInicio?: string;
  dataFim?: string;
}): MovimentacaoMatriz[] => {
  // Verificar retornos atrasados antes de retornar
  verificarRetornosAtrasados();
  
  let result = [...movimentacoesMatriz];
  
  if (filtros?.status) {
    result = result.filter(m => m.statusMovimentacao === filtros.status);
  }
  
  if (filtros?.lojaDestinoId) {
    result = result.filter(m => m.lojaDestinoId === filtros.lojaDestinoId);
  }
  
  if (filtros?.dataInicio) {
    result = result.filter(m => m.dataHoraLancamento >= filtros.dataInicio!);
  }
  
  if (filtros?.dataFim) {
    result = result.filter(m => m.dataHoraLancamento <= filtros.dataFim!);
  }
  
  return result.sort((a, b) => 
    new Date(b.dataHoraLancamento).getTime() - new Date(a.dataHoraLancamento).getTime()
  );
};

// Obter movimentação matriz por ID
export const getMovimentacaoMatrizById = (id: string): MovimentacaoMatriz | null => {
  return movimentacoesMatriz.find(m => m.id === id) || null;
};

// Criar nova movimentação matriz (Estoque SIA → Loja Matriz)
// IMPORTANTE: Movimentações Matriz NÃO bloqueiam produtos - apenas atualizam lojaAtualId diretamente
export const criarMovimentacaoMatriz = (dados: {
  lojaDestinoId: string;
  responsavelLancamento: string;
  itens: Array<{ aparelhoId: string; imei: string; modelo: string; cor: string }>;
}): MovimentacaoMatriz => {
  const agora = new Date();
  const dataHoraLancamento = agora.toISOString();
  
  // Calcular limite de retorno: às 22:00 do mesmo dia
  const limite = new Date(agora);
  limite.setHours(22, 0, 0, 0); // Define para 22:00 do mesmo dia
  // Se já passou das 22h, usa 22h do dia seguinte
  if (agora.getHours() >= 22) {
    limite.setDate(limite.getDate() + 1);
  }
  const dataHoraLimiteRetorno = limite.toISOString();
  
  const novaMovimentacao: MovimentacaoMatriz = {
    id: generateMovMatrizId(),
    dataHoraLancamento,
    responsavelLancamento: dados.responsavelLancamento,
    lojaOrigemId: ESTOQUE_SIA_ID, // Origem fixa: Estoque - SIA
    lojaDestinoId: dados.lojaDestinoId, // Destino fixo: Loja - Matriz
    statusMovimentacao: 'Pendente', // Novo status inicial
    dataHoraLimiteRetorno,
    itens: dados.itens.map(item => ({
      ...item,
      statusItem: 'Enviado' as const
    })),
    timeline: [{
      id: `TL-${Date.now()}`,
      data: dataHoraLancamento,
      tipo: 'saida_matriz' as const,
      titulo: 'Movimentação Criada',
      descricao: `${dados.itens.length} aparelho(s) enviado(s) para Loja - Matriz`,
      responsavel: dados.responsavelLancamento
    }]
  };
  
  // Atualizar lojaAtualId de cada produto (transferência imediata - SEM bloqueio)
  dados.itens.forEach(item => {
    const produto = produtos.find(p => p.id === item.aparelhoId);
    if (produto) {
      // Apenas atualizar localização física - NÃO bloquear para venda
      produto.lojaAtualId = dados.lojaDestinoId; // Loja - Matriz
      produto.movimentacaoId = novaMovimentacao.id; // Referência para rastreabilidade
      // Limpar qualquer status de movimentação anterior (movimentações matriz não bloqueiam)
      produto.statusMovimentacao = null;
      
      // Adicionar entrada na timeline do produto
      if (!produto.timeline) produto.timeline = [];
      produto.timeline.unshift({
        id: `TL-PROD-${Date.now()}-${item.aparelhoId}`,
        data: dataHoraLancamento,
        tipo: 'saida_matriz',
        titulo: 'Transferência para Loja - Matriz',
        descricao: `Produto transferido do Estoque - SIA para Loja - Matriz (disponível para venda)`,
        responsavel: dados.responsavelLancamento
      });
    }
  });
  
  movimentacoesMatriz.push(novaMovimentacao);
  return novaMovimentacao;
};

// Registrar retorno de item da movimentação matriz
export const registrarRetornoItemMatriz = (
  movimentacaoId: string,
  aparelhoId: string,
  responsavelRetorno: string
): { sucesso: boolean; mensagem: string; movimentacao?: MovimentacaoMatriz } => {
  const movimentacao = movimentacoesMatriz.find(m => m.id === movimentacaoId);
  if (!movimentacao) {
    return { sucesso: false, mensagem: 'Movimentação não encontrada' };
  }
  
  const item = movimentacao.itens.find(i => i.aparelhoId === aparelhoId);
  if (!item) {
    return { sucesso: false, mensagem: 'Item não encontrado na movimentação' };
  }
  
  if (item.statusItem === 'Devolvido') {
    return { sucesso: false, mensagem: 'Item já foi devolvido' };
  }
  
  if (item.statusItem === 'Vendido') {
    return { sucesso: false, mensagem: 'Item foi vendido na loja destino' };
  }
  
  const agora = new Date();
  const agoraISO = agora.toISOString();
  
  // Atualizar item
  item.statusItem = 'Devolvido';
  item.dataHoraRetorno = agoraISO;
  item.responsavelRetorno = responsavelRetorno;
  
  // Atualizar produto - voltar para Estoque - SIA
  const produto = produtos.find(p => p.id === aparelhoId);
  if (produto) {
    produto.lojaAtualId = undefined; // Volta ao Estoque SIA (loja original)
    produto.movimentacaoId = undefined;
    
    // Adicionar entrada na timeline do produto
    if (!produto.timeline) produto.timeline = [];
    produto.timeline.unshift({
      id: `TL-PROD-${Date.now()}-${aparelhoId}-ret`,
      data: agoraISO,
      tipo: 'retorno_matriz',
      titulo: 'Retorno ao Estoque - SIA',
      descricao: `Produto devolvido ao Estoque - SIA`,
      responsavel: responsavelRetorno
    });
  }
  
  // Adicionar entrada na timeline da movimentação
  movimentacao.timeline.unshift({
    id: `TL-${Date.now()}-ret`,
    data: agoraISO,
    tipo: 'retorno_matriz',
    titulo: 'Item Conferido',
    descricao: `${item.modelo} ${item.cor} (IMEI: ${item.imei}) conferido e devolvido`,
    responsavel: responsavelRetorno
  });
  
  // Verificar se todos os itens foram devolvidos/vendidos
  const todosFinalizados = movimentacao.itens.every(
    i => i.statusItem === 'Devolvido' || i.statusItem === 'Vendido'
  );
  
  if (todosFinalizados) {
    // Determinar se dentro ou fora do prazo
    const limite = new Date(movimentacao.dataHoraLimiteRetorno);
    const statusAnterior = movimentacao.statusMovimentacao;
    
    if (statusAnterior === 'Atrasado' || agora >= limite) {
      movimentacao.statusMovimentacao = 'Finalizado - Atrasado';
    } else {
      movimentacao.statusMovimentacao = 'Finalizado - Dentro do Prazo';
    }
    
    movimentacao.timeline.unshift({
      id: `TL-${Date.now()}-conc`,
      data: agoraISO,
      tipo: 'retorno_matriz',
      titulo: 'Movimentação Finalizada',
      descricao: `Todos os itens conferidos - ${movimentacao.statusMovimentacao}`,
      responsavel: responsavelRetorno
    });
  }
  
  return { sucesso: true, mensagem: 'Retorno registrado com sucesso', movimentacao };
};

// Desfazer retorno de item da movimentação matriz (voltar para Pendente)
export const desfazerRetornoItemMatriz = (
  movimentacaoId: string,
  aparelhoId: string,
  responsavel: string
): { sucesso: boolean; mensagem: string; movimentacao?: MovimentacaoMatriz } => {
  const movimentacao = movimentacoesMatriz.find(m => m.id === movimentacaoId);
  if (!movimentacao) {
    return { sucesso: false, mensagem: 'Movimentação não encontrada' };
  }
  
  const item = movimentacao.itens.find(i => i.aparelhoId === aparelhoId);
  if (!item) {
    return { sucesso: false, mensagem: 'Item não encontrado na movimentação' };
  }
  
  if (item.statusItem !== 'Devolvido') {
    return { sucesso: false, mensagem: 'Item não está com status Devolvido' };
  }
  
  const agora = new Date().toISOString();
  
  // Reverter item para Enviado
  item.statusItem = 'Enviado';
  item.dataHoraRetorno = undefined;
  item.responsavelRetorno = undefined;
  
  // Atualizar produto - voltar para loja destino
  const produto = produtos.find(p => p.id === aparelhoId);
  if (produto) {
    produto.lojaAtualId = movimentacao.lojaDestinoId;
    produto.movimentacaoId = movimentacaoId;
    
    // Adicionar entrada na timeline do produto
    if (!produto.timeline) produto.timeline = [];
    produto.timeline.unshift({
      id: `TL-PROD-${Date.now()}-${aparelhoId}-undo`,
      data: agora,
      tipo: 'saida_matriz',
      titulo: 'Conferência Desfeita',
      descricao: `Conferência de retorno desfeita - produto retornou para Loja - Matriz`,
      responsavel
    });
  }
  
  // Adicionar entrada na timeline da movimentação
  movimentacao.timeline.unshift({
    id: `TL-${Date.now()}-undo`,
    data: agora,
    tipo: 'saida_matriz',
    titulo: 'Conferência Desfeita',
    descricao: `${item.modelo} ${item.cor} (IMEI: ${item.imei}) retornado para Pendentes`,
    responsavel
  });
  
  // Se a movimentação estava Finalizada, voltar para Pendente ou Atrasado
  if (movimentacao.statusMovimentacao.startsWith('Finalizado')) {
    const limite = new Date(movimentacao.dataHoraLimiteRetorno);
    const agoraDate = new Date();
    movimentacao.statusMovimentacao = agoraDate >= limite ? 'Atrasado' : 'Pendente';
  }
  
  return { sucesso: true, mensagem: 'Conferência desfeita com sucesso', movimentacao };
};

// Verificar e atualizar status para Atrasado quando passa das 22:00
export const verificarStatusMovimentacoesMatriz = (): void => {
  const agora = new Date();
  
  movimentacoesMatriz.forEach(mov => {
    if (mov.statusMovimentacao === 'Pendente') {
      const limite = new Date(mov.dataHoraLimiteRetorno);
      if (agora >= limite) {
        mov.statusMovimentacao = 'Atrasado';
        mov.timeline.unshift({
          id: `TL-${Date.now()}-atraso`,
          data: agora.toISOString(),
          tipo: 'alerta_sla',
          titulo: 'Status: Atrasado',
          descricao: 'O prazo limite de 22:00 foi ultrapassado',
          responsavel: 'Sistema'
        });
      }
    }
  });
};

// Alias para compatibilidade
export const verificarRetornosAtrasados = verificarStatusMovimentacoesMatriz;

// Marcar item como vendido (integração com vendas)
export const marcarItemVendidoMatriz = (
  imei: string
): { sucesso: boolean; movimentacaoId?: string } => {
  // Procurar em movimentações ativas se este IMEI está em alguma
  for (const mov of movimentacoesMatriz) {
    // Apenas movimentações não finalizadas
    if (!mov.statusMovimentacao.startsWith('Finalizado')) {
      const item = mov.itens.find(i => i.imei === imei && i.statusItem === 'Enviado');
      if (item) {
        item.statusItem = 'Vendido';
        
        mov.timeline.unshift({
          id: `TL-${Date.now()}-venda`,
          data: new Date().toISOString(),
          tipo: 'venda_matriz',
          titulo: 'Item Vendido',
          descricao: `${item.modelo} ${item.cor} vendido na loja destino`,
          responsavel: 'Sistema'
        });
        
        // Verificar se todos finalizados
        const todosFinalizados = mov.itens.every(
          i => i.statusItem === 'Devolvido' || i.statusItem === 'Vendido'
        );
        
        if (todosFinalizados) {
          // Determinar status de finalização baseado no prazo
          const agora = new Date();
          const limite = new Date(mov.dataHoraLimiteRetorno);
          mov.statusMovimentacao = (mov.statusMovimentacao === 'Atrasado' || agora >= limite)
            ? 'Finalizado - Atrasado'
            : 'Finalizado - Dentro do Prazo';
        }
        
        return { sucesso: true, movimentacaoId: mov.id };
      }
    }
  }
  
  return { sucesso: false };
};

// Obter produtos disponíveis no Estoque - SIA para movimentação matriz
export const getProdutosDisponivelMatriz = (): Produto[] => {
  return produtos.filter(p => 
    p.loja === ESTOQUE_SIA_ID && 
    !p.lojaAtualId && 
    !p.statusMovimentacao &&
    !p.bloqueadoEmVendaId &&
    p.statusNota === 'Concluído'
  );
};

// ============= CONFERÊNCIA AUTOMÁTICA VIA VENDA =============
import { buscarVendaPorImei } from './vendasApi';

// Conferir produto na movimentação matriz no ato do registro da venda
export const conferirProdutoMovimentacaoMatrizPorVenda = (
  produtoId: string,
  vendaId: string,
  vendedorId: string,
  vendedorNome: string
): { sucesso: boolean } => {
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto || !produto.movimentacaoId) {
    return { sucesso: false };
  }
  
  const movimentacao = movimentacoesMatriz.find(m => m.id === produto.movimentacaoId);
  if (!movimentacao || movimentacao.statusMovimentacao.startsWith('Finalizado')) {
    return { sucesso: false };
  }
  
  const item = movimentacao.itens.find(i => i.aparelhoId === produtoId);
  if (!item || item.statusItem !== 'Enviado') {
    return { sucesso: false };
  }
  
  const agoraISO = new Date().toISOString();
  
  // Marcar item como Vendido
  item.statusItem = 'Vendido';
  item.dataHoraRetorno = agoraISO;
  item.vendaId = vendaId;
  item.vendedorId = vendedorId;
  item.vendedorNome = vendedorNome;
  item.conferenciaAutomatica = true;
  
  // Timeline da movimentação
  movimentacao.timeline.unshift({
    id: `TL-${Date.now()}-venda-auto-${produtoId}`,
    data: agoraISO,
    tipo: 'venda_matriz',
    titulo: 'Conferido Automaticamente via Venda',
    descricao: `${item.modelo} ${item.cor} - Venda ${vendaId} por ${vendedorNome}`,
    responsavel: 'Sistema',
    aparelhoId: produtoId
  });
  
  // Limpar movimentacaoId do produto
  produto.movimentacaoId = undefined;
  
  // Verificar se movimentação finalizou
  const todosFinalizados = movimentacao.itens.every(
    i => i.statusItem === 'Devolvido' || i.statusItem === 'Vendido'
  );
  
  if (todosFinalizados) {
    const agora = new Date();
    const limite = new Date(movimentacao.dataHoraLimiteRetorno);
    movimentacao.statusMovimentacao = (movimentacao.statusMovimentacao === 'Atrasado' || agora >= limite)
      ? 'Finalizado - Atrasado'
      : 'Finalizado - Dentro do Prazo';
    
    movimentacao.timeline.unshift({
      id: `TL-${Date.now()}-auto-conc`,
      data: agoraISO,
      tipo: 'retorno_matriz',
      titulo: 'Movimentação Finalizada Automaticamente',
      descricao: `Todos os itens conferidos - ${movimentacao.statusMovimentacao}`,
      responsavel: 'Sistema'
    });
  }
  
  return { sucesso: true };
};

// Função de conferência automática de itens pendentes via venda
export const conferirItensAutomaticamentePorVenda = (
  movimentacaoId: string,
  obterNomeColaborador: (id: string) => string
): { 
  movimentacao: MovimentacaoMatriz | null; 
  itensConferidos: Array<{ imei: string; vendaId: string; vendedor: string }>; 
} => {
  const movimentacao = movimentacoesMatriz.find(m => m.id === movimentacaoId);
  if (!movimentacao) {
    return { movimentacao: null, itensConferidos: [] };
  }
  
  // Apenas movimentações não finalizadas
  if (movimentacao.statusMovimentacao.startsWith('Finalizado')) {
    return { movimentacao, itensConferidos: [] };
  }
  
  const agora = new Date();
  const agoraISO = agora.toISOString();
  const itensConferidos: Array<{ imei: string; vendaId: string; vendedor: string }> = [];
  
  // Para cada item pendente (Enviado), verificar se existe venda
  movimentacao.itens.forEach(item => {
    if (item.statusItem !== 'Enviado') return;
    
    const resultado = buscarVendaPorImei(item.imei);
    if (resultado) {
      const { venda } = resultado;
      const vendedorNome = obterNomeColaborador(venda.vendedor) || 'Vendedor Desconhecido';
      
      // Atualizar item
      item.statusItem = 'Vendido';
      item.dataHoraRetorno = agoraISO;
      item.vendaId = venda.id;
      item.vendedorId = venda.vendedor;
      item.vendedorNome = vendedorNome;
      item.conferenciaAutomatica = true;
      
      // Adicionar à lista de conferidos
      itensConferidos.push({
        imei: item.imei,
        vendaId: venda.id,
        vendedor: vendedorNome
      });
      
      // Adicionar entrada na timeline
      movimentacao.timeline.unshift({
        id: `TL-${Date.now()}-auto-${item.imei}`,
        data: agoraISO,
        tipo: 'venda_matriz',
        titulo: 'Conferido Automaticamente via Venda',
        descricao: `${item.modelo} ${item.cor} - Venda ${venda.id} por ${vendedorNome}`,
        responsavel: 'Sistema',
        aparelhoId: item.aparelhoId
      });
    }
  });
  
  // Verificar se movimentação finalizou
  const todosFinalizados = movimentacao.itens.every(
    i => i.statusItem === 'Devolvido' || i.statusItem === 'Vendido'
  );
  
  if (todosFinalizados && itensConferidos.length > 0) {
    const limite = new Date(movimentacao.dataHoraLimiteRetorno);
    movimentacao.statusMovimentacao = (movimentacao.statusMovimentacao === 'Atrasado' || agora >= limite)
      ? 'Finalizado - Atrasado'
      : 'Finalizado - Dentro do Prazo';
      
    movimentacao.timeline.unshift({
      id: `TL-${Date.now()}-auto-conc`,
      data: agoraISO,
      tipo: 'retorno_matriz',
      titulo: 'Movimentação Finalizada Automaticamente',
      descricao: `Todos os itens conferidos - ${movimentacao.statusMovimentacao}`,
      responsavel: 'Sistema'
    });
  }
  
  return { movimentacao, itensConferidos };
};
