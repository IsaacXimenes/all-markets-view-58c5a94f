// API para Lista de Reparos (OS)
import { Produto, addProdutoMigrado } from './estoqueApi';
import { generateProductId, registerProductId, isProductIdRegistered } from './idManager';

export interface ParecerEstoque {
  id: string;
  data: string;
  status: 'Análise Realizada – Produto em ótimo estado' | 'Encaminhado para conferência da Assistência';
  observacoes: string;
  responsavel: string;
}

export interface ParecerAssistencia {
  id: string;
  data: string;
  status: 'Produto conferido' | 'Aguardando peça' | 'Ajustes realizados';
  observacoes: string;
  responsavel: string;
  pecas?: {
    descricao: string;
    valor: number;
    fornecedor: string;
  }[];
}

export interface TimelineEntry {
  id: string;
  data: string;
  tipo: 'entrada' | 'parecer_estoque' | 'parecer_assistencia' | 'despesa' | 'liberacao';
  titulo: string;
  descricao: string;
  responsavel?: string;
  valor?: number;
}

export interface ProdutoPendente {
  id: string; // PROD-XXXX - ID único e persistente
  imei: string;
  imagem?: string;
  marca: string;
  modelo: string;
  cor: string;
  tipo: 'Novo' | 'Seminovo';
  condicao: 'Novo' | 'Semi-novo';
  origemEntrada: 'Trade-In' | 'Nota de Entrada';
  notaOuVendaId?: string;
  valorCusto: number;
  saudeBateria: number;
  loja: string;
  dataEntrada: string;
  parecerEstoque?: ParecerEstoque;
  parecerAssistencia?: ParecerAssistencia;
  timeline: TimelineEntry[];
  custoAssistencia: number;
  statusGeral: 'Pendente Estoque' | 'Em Análise Assistência' | 'Aguardando Peça' | 'Liberado';
}

// Dados mockados de produtos pendentes - IDs PROD-XXXX únicos para rastreabilidade
// IMPORTANTE: Estes IDs são DIFERENTES dos IDs em estoqueApi.ts para evitar duplicação
let produtosPendentes: ProdutoPendente[] = [
  // 3 produtos em Produtos Pendentes (IDs PROD-0001 a PROD-0003)
  {
    id: 'PROD-0001',
    imei: '352999888777001',
    marca: 'Apple',
    modelo: 'iPhone 13 Pro',
    cor: 'Grafite',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Nota de Entrada',
    notaOuVendaId: 'NC-2025-0010',
    valorCusto: 3100.00,
    saudeBateria: 86,
    loja: 'Loja Centro',
    dataEntrada: '2025-01-10',
    timeline: [
      {
        id: 'TL-001',
        data: '2025-01-10T09:30:00',
        tipo: 'entrada',
        titulo: 'Entrada via Nota de Compra',
        descricao: 'Produto PROD-0001 recebido da nota NC-2025-0010 - Fornecedor TechSupply Imports',
        responsavel: 'Lucas Mendes'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque'
  },
  {
    id: 'PROD-0002',
    imei: '352999888777002',
    marca: 'Apple',
    modelo: 'iPhone 14',
    cor: 'Azul',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Trade-In',
    notaOuVendaId: 'VEN-2025-0050',
    valorCusto: 3500.00,
    saudeBateria: 91,
    loja: 'Loja Shopping',
    dataEntrada: '2025-01-11',
    timeline: [
      {
        id: 'TL-002',
        data: '2025-01-11T10:00:00',
        tipo: 'entrada',
        titulo: 'Entrada via Trade-In',
        descricao: 'Produto PROD-0002 recebido como trade-in na venda VEN-2025-0050',
        responsavel: 'Roberto Alves'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque'
  },
  {
    id: 'PROD-0003',
    imei: '352999888777003',
    marca: 'Apple',
    modelo: 'iPhone 12 Mini',
    cor: 'Branco',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Nota de Entrada',
    notaOuVendaId: 'NC-2025-0012',
    valorCusto: 1800.00,
    saudeBateria: 72,
    loja: 'Loja Norte',
    dataEntrada: '2025-01-09',
    timeline: [
      {
        id: 'TL-004',
        data: '2025-01-09T08:30:00',
        tipo: 'entrada',
        titulo: 'Entrada via Nota de Compra',
        descricao: 'Produto PROD-0003 recebido da nota NC-2025-0012 - Fornecedor FastCell Distribuição',
        responsavel: 'Ana Paula'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque'
  },
  // 2 produtos em OS > Produtos para Análise (já encaminhados para assistência) - IDs PROD-0004 e PROD-0005
  {
    id: 'PROD-0004',
    imei: '352999888777004',
    marca: 'Apple',
    modelo: 'iPhone 11 Pro',
    cor: 'Verde Meia-Noite',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Trade-In',
    notaOuVendaId: 'VEN-2025-0045',
    valorCusto: 1500.00,
    saudeBateria: 78,
    loja: 'Loja Sul',
    dataEntrada: '2025-01-08',
    parecerEstoque: {
      id: 'PE-003',
      data: '2025-01-08T11:30:00',
      status: 'Encaminhado para conferência da Assistência',
      observacoes: 'Trade-in com bateria degradada, encaminhar para troca de bateria.',
      responsavel: 'Roberto Alves'
    },
    timeline: [
      {
        id: 'TL-006',
        data: '2025-01-08T10:00:00',
        tipo: 'entrada',
        titulo: 'Entrada via Trade-In',
        descricao: 'Produto PROD-0004 recebido como trade-in na venda VEN-2025-0045 - Cliente Maria Silva',
        responsavel: 'Vendedor João'
      },
      {
        id: 'TL-007',
        data: '2025-01-08T11:30:00',
        tipo: 'parecer_estoque',
        titulo: 'Parecer Estoque - Encaminhado Assistência',
        descricao: 'PROD-0004 encaminhado para conferência da Assistência. Bateria degradada.',
        responsavel: 'Roberto Alves'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Em Análise Assistência'
  },
  {
    id: 'PROD-0005',
    imei: '352999888777005',
    marca: 'Apple',
    modelo: 'iPhone 13',
    cor: 'Rosa',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Nota de Entrada',
    notaOuVendaId: 'NC-2025-0015',
    valorCusto: 2200.00,
    saudeBateria: 82,
    loja: 'Loja Oeste',
    dataEntrada: '2025-01-07',
    parecerEstoque: {
      id: 'PE-004',
      data: '2025-01-07T15:00:00',
      status: 'Encaminhado para conferência da Assistência',
      observacoes: 'Tela com pequeno risco, encaminhar para polimento.',
      responsavel: 'Fernanda Lima'
    },
    timeline: [
      {
        id: 'TL-009',
        data: '2025-01-07T10:30:00',
        tipo: 'entrada',
        titulo: 'Entrada via Nota de Compra',
        descricao: 'Produto PROD-0005 recebido da nota NC-2025-0015 - Fornecedor TechnoImports',
        responsavel: 'Vendedora Ana'
      },
      {
        id: 'TL-010',
        data: '2025-01-07T15:00:00',
        tipo: 'parecer_estoque',
        titulo: 'Parecer Estoque - Encaminhado Assistência',
        descricao: 'PROD-0005 encaminhado para conferência da Assistência. Tela com pequeno risco.',
        responsavel: 'Fernanda Lima'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Em Análise Assistência'
  }
];

// Registrar IDs dos produtos pendentes no sistema central
const initializePendingIds = () => {
  produtosPendentes.forEach(p => {
    registerProductId(p.id);
  });
};

// Inicializa ao carregar o módulo
initializePendingIds();

// Lista de produtos migrados para o estoque (para integração)
let produtosMigrados: Produto[] = [];

// Funções de API
export const getProdutosPendentes = (): ProdutoPendente[] => {
  // Retorna apenas produtos pendentes de parecer do estoque
  return produtosPendentes.filter(p => 
    !p.parecerEstoque || p.parecerEstoque.status !== 'Encaminhado para conferência da Assistência'
  );
};

export const getProdutoPendenteById = (id: string): ProdutoPendente | null => {
  return produtosPendentes.find(p => p.id === id) || null;
};

export const getProdutosParaAnaliseOS = (): ProdutoPendente[] => {
  // Retorna apenas produtos encaminhados para assistência
  return produtosPendentes.filter(p => 
    p.parecerEstoque?.status === 'Encaminhado para conferência da Assistência'
  );
};

export const getProdutosMigrados = (): Produto[] => {
  return [...produtosMigrados];
};

// Migrar produto para o estoque PRINCIPAL (via estoqueApi)
const migrarParaEstoque = (produto: ProdutoPendente, origemDeferimento: 'Estoque' | 'Assistência', responsavel: string): Produto => {
  // Adiciona entrada de liberação na timeline
  const timelineLiberacao: TimelineEntry = {
    id: `TL-LIB-${Date.now()}`,
    data: new Date().toISOString(),
    tipo: 'liberacao',
    titulo: 'Produto Liberado para Estoque',
    descricao: `Produto liberado após ${origemDeferimento === 'Estoque' ? 'análise do estoque' : 'conferência da assistência'}`,
    responsavel
  };

  const novoProduto: Produto = {
    id: produto.id, // ID PERSISTENTE - nunca muda
    imei: produto.imei,
    imagem: produto.imagem,
    marca: produto.marca,
    modelo: produto.modelo,
    cor: produto.cor,
    tipo: produto.tipo,
    quantidade: 1,
    valorCusto: produto.valorCusto + produto.custoAssistencia,
    valorVendaSugerido: (produto.valorCusto + produto.custoAssistencia) * 1.8,
    saudeBateria: produto.saudeBateria,
    loja: produto.loja,
    estoqueConferido: true,
    assistenciaConferida: origemDeferimento === 'Assistência',
    condicao: produto.condicao === 'Semi-novo' ? 'Seminovo' : 'Lacrado',
    historicoCusto: [
      { 
        data: new Date().toISOString().split('T')[0], 
        fornecedor: produto.origemEntrada === 'Trade-In' ? 'Trade-In' : 'Nota de Entrada', 
        valor: produto.valorCusto 
      }
    ],
    historicoValorRecomendado: [],
    statusNota: 'Concluído',
    origemEntrada: produto.origemEntrada === 'Trade-In' ? 'Trade-In' : 'Nota de Entrada',
    // PRESERVA A TIMELINE COMPLETA DO PRODUTO PENDENTE + LIBERAÇÃO
    timeline: [...produto.timeline, timelineLiberacao]
  };

  // Adiciona ao estoque PRINCIPAL via estoqueApi
  addProdutoMigrado(novoProduto);
  
  // Também mantém na lista local para referência
  produtosMigrados.push(novoProduto);
  
  console.log(`[OS API] Produto ${produto.id} migrado para estoque principal com sucesso!`);
  return novoProduto;
};

export const salvarParecerEstoque = (
  id: string, 
  status: ParecerEstoque['status'], 
  observacoes: string, 
  responsavel: string
): { produto: ProdutoPendente | null; migrado: boolean; produtoMigrado?: Produto } => {
  const produto = produtosPendentes.find(p => p.id === id);
  if (!produto) return { produto: null, migrado: false };

  const parecer: ParecerEstoque = {
    id: `PE-${Date.now()}`,
    data: new Date().toISOString(),
    status,
    observacoes,
    responsavel
  };

  produto.parecerEstoque = parecer;
  
  // Adicionar na timeline com ID do produto
  produto.timeline.push({
    id: `TL-${Date.now()}`,
    data: new Date().toISOString(),
    tipo: 'parecer_estoque',
    titulo: status === 'Análise Realizada – Produto em ótimo estado' 
      ? `Deferido Estoque – ${id}` 
      : `Parecer Estoque - Encaminhado Assistência – ${id}`,
    descricao: `${status}. ${observacoes}`,
    responsavel
  });

  // Se aprovado direto pelo estoque, migrar automaticamente
  if (status === 'Análise Realizada – Produto em ótimo estado') {
    // Adicionar registro de liberação na timeline
    produto.timeline.push({
      id: `TL-${Date.now()}-lib`,
      data: new Date().toISOString(),
      tipo: 'liberacao',
      titulo: `Deferido Estoque – ID ${id} liberado para estoque`,
      descricao: `Produto ${id} aprovado pelo estoque e liberado para venda.`,
      responsavel
    });

    produto.statusGeral = 'Liberado';
    
    // Migrar para estoque
    const produtoMigrado = migrarParaEstoque(produto, 'Estoque', responsavel);
    
    // Remover da lista de pendentes
    const index = produtosPendentes.findIndex(p => p.id === id);
    if (index !== -1) {
      produtosPendentes.splice(index, 1);
    }

    return { produto, migrado: true, produtoMigrado };
  } else {
    // Encaminhado para assistência
    produto.statusGeral = 'Em Análise Assistência';
    return { produto, migrado: false };
  }
};

export const salvarParecerAssistencia = (
  id: string,
  status: ParecerAssistencia['status'],
  observacoes: string,
  responsavel: string,
  pecas?: { descricao: string; valor: number; fornecedor: string }[]
): { produto: ProdutoPendente | null; migrado: boolean; produtoMigrado?: Produto } => {
  const produto = produtosPendentes.find(p => p.id === id);
  if (!produto) return { produto: null, migrado: false };

  const parecer: ParecerAssistencia = {
    id: `PA-${Date.now()}`,
    data: new Date().toISOString(),
    status,
    observacoes,
    responsavel,
    pecas
  };

  produto.parecerAssistencia = parecer;

  // Adicionar na timeline
  produto.timeline.push({
    id: `TL-${Date.now()}`,
    data: new Date().toISOString(),
    tipo: 'parecer_assistencia',
    titulo: `Parecer Assistência - ${status} – ${id}`,
    descricao: observacoes,
    responsavel
  });

  // Adicionar despesas na timeline
  if (pecas && pecas.length > 0) {
    let custoTotal = 0;
    pecas.forEach(peca => {
      custoTotal += peca.valor;
      produto.timeline.push({
        id: `TL-${Date.now()}-${Math.random()}`,
        data: new Date().toISOString(),
        tipo: 'despesa',
        titulo: `Despesa - ${peca.descricao}`,
        descricao: `Fornecedor: ${peca.fornecedor}`,
        valor: peca.valor,
        responsavel
      });
    });
    produto.custoAssistencia = (produto.custoAssistencia || 0) + custoTotal;
  }

  // Se produto conferido pela assistência, migrar automaticamente
  if (status === 'Produto conferido') {
    // Adicionar registro de liberação na timeline
    produto.timeline.push({
      id: `TL-${Date.now()}-lib`,
      data: new Date().toISOString(),
      tipo: 'liberacao',
      titulo: `Deferido Assistência – ID ${id} liberado para estoque`,
      descricao: `Produto ${id} conferido pela assistência e liberado para venda.`,
      responsavel
    });

    produto.statusGeral = 'Liberado';
    
    // Migrar para estoque
    const produtoMigrado = migrarParaEstoque(produto, 'Assistência', responsavel);
    
    // Remover da lista de pendentes
    const index = produtosPendentes.findIndex(p => p.id === id);
    if (index !== -1) {
      produtosPendentes.splice(index, 1);
    }

    return { produto, migrado: true, produtoMigrado };
  } else if (status === 'Aguardando peça') {
    produto.statusGeral = 'Aguardando Peça';
    return { produto, migrado: false };
  } else {
    // Ajustes realizados - ainda precisa do "Produto conferido"
    produto.statusGeral = 'Em Análise Assistência';
    return { produto, migrado: false };
  }
};

export const liberarProdutoPendente = (id: string): boolean => {
  // Esta função é mantida por compatibilidade mas a migração agora é automática
  const index = produtosPendentes.findIndex(p => p.id === id);
  if (index === -1) return false;
  return true;
};

export const addProdutoPendente = (produto: Omit<ProdutoPendente, 'id' | 'timeline' | 'custoAssistencia' | 'statusGeral'>): ProdutoPendente => {
  // Gerar ID único usando o sistema centralizado
  const newId = generateProductId();
  
  // Validar que o ID não está duplicado
  if (isProductIdRegistered(newId)) {
    console.error(`Erro de rastreabilidade – ID duplicado detectado: ${newId}`);
    throw new Error(`Erro de rastreabilidade – ID duplicado detectado: ${newId}`);
  }
  
  const newProduto: ProdutoPendente = {
    ...produto,
    id: newId,
    timeline: [
      {
        id: `TL-${Date.now()}`,
        data: new Date().toISOString(),
        tipo: 'entrada',
        titulo: produto.origemEntrada === 'Trade-In' ? 'Entrada via Trade-In' : 'Entrada via Nota de Compra',
        descricao: `Produto ${newId} recebido ${produto.origemEntrada === 'Trade-In' ? 'como trade-in' : 'via nota de compra'} - ${produto.notaOuVendaId || 'N/A'}`,
        responsavel: 'Sistema'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque'
  };

  produtosPendentes.push(newProduto);
  return newProduto;
};

// Função para adicionar produto pendente com ID específico (para trade-ins)
export const addProdutoPendenteComId = (
  id: string,
  produto: Omit<ProdutoPendente, 'id' | 'timeline' | 'custoAssistencia' | 'statusGeral'>
): ProdutoPendente => {
  // Validar que o ID não está duplicado
  if (isProductIdRegistered(id)) {
    console.error(`Erro de rastreabilidade – ID duplicado detectado: ${id}`);
    throw new Error(`Erro de rastreabilidade – ID duplicado detectado: ${id}`);
  }
  
  // Registrar o ID
  registerProductId(id);
  
  const newProduto: ProdutoPendente = {
    ...produto,
    id,
    timeline: [
      {
        id: `TL-${Date.now()}`,
        data: new Date().toISOString(),
        tipo: 'entrada',
        titulo: produto.origemEntrada === 'Trade-In' ? 'Entrada via Trade-In' : 'Entrada via Nota de Compra',
        descricao: `Produto ${id} recebido ${produto.origemEntrada === 'Trade-In' ? 'como trade-in' : 'via nota de compra'} - ${produto.notaOuVendaId || 'N/A'}`,
        responsavel: 'Sistema'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque'
  };

  produtosPendentes.push(newProduto);
  return newProduto;
};
