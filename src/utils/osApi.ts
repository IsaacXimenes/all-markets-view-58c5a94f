// API para Lista de Reparos (OS)

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
  id: string;
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

// Dados mockados de produtos pendentes
let produtosPendentes: ProdutoPendente[] = [
  // 3 via Nota de Entrada
  {
    id: 'PEND-0001',
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
        descricao: 'Produto recebido da nota NC-2025-0010 - Fornecedor TechSupply Imports',
        responsavel: 'Lucas Mendes'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque'
  },
  {
    id: 'PEND-0002',
    imei: '352999888777002',
    marca: 'Apple',
    modelo: 'iPhone 14',
    cor: 'Azul',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Nota de Entrada',
    notaOuVendaId: 'NC-2025-0011',
    valorCusto: 3500.00,
    saudeBateria: 91,
    loja: 'Loja Shopping',
    dataEntrada: '2025-01-11',
    parecerEstoque: {
      id: 'PE-001',
      data: '2025-01-11T14:20:00',
      status: 'Análise Realizada – Produto em ótimo estado',
      observacoes: 'Produto em excelente estado, sem riscos ou danos. Bateria em ótima condição.',
      responsavel: 'Fernanda Lima'
    },
    timeline: [
      {
        id: 'TL-002',
        data: '2025-01-11T10:00:00',
        tipo: 'entrada',
        titulo: 'Entrada via Nota de Compra',
        descricao: 'Produto recebido da nota NC-2025-0011 - Fornecedor MobileWorld Atacado',
        responsavel: 'Roberto Alves'
      },
      {
        id: 'TL-003',
        data: '2025-01-11T14:20:00',
        tipo: 'parecer_estoque',
        titulo: 'Parecer Estoque - Aprovado',
        descricao: 'Análise Realizada – Produto em ótimo estado. Produto em excelente estado, sem riscos ou danos.',
        responsavel: 'Fernanda Lima'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque' // Será liberado automaticamente
  },
  {
    id: 'PEND-0003',
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
    parecerEstoque: {
      id: 'PE-002',
      data: '2025-01-09T16:00:00',
      status: 'Encaminhado para conferência da Assistência',
      observacoes: 'Bateria com saúde abaixo de 80%, necessita avaliação da assistência.',
      responsavel: 'Lucas Mendes'
    },
    timeline: [
      {
        id: 'TL-004',
        data: '2025-01-09T08:30:00',
        tipo: 'entrada',
        titulo: 'Entrada via Nota de Compra',
        descricao: 'Produto recebido da nota NC-2025-0012 - Fornecedor FastCell Distribuição',
        responsavel: 'Ana Paula'
      },
      {
        id: 'TL-005',
        data: '2025-01-09T16:00:00',
        tipo: 'parecer_estoque',
        titulo: 'Parecer Estoque - Encaminhado Assistência',
        descricao: 'Encaminhado para conferência da Assistência. Bateria com saúde abaixo de 80%.',
        responsavel: 'Lucas Mendes'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Em Análise Assistência'
  },
  // 2 via Trade-In
  {
    id: 'PEND-0004',
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
    parecerAssistencia: {
      id: 'PA-001',
      data: '2025-01-10T09:00:00',
      status: 'Aguardando peça',
      observacoes: 'Aguardando chegada de bateria nova do fornecedor.',
      responsavel: 'Carlos Técnico'
    },
    timeline: [
      {
        id: 'TL-006',
        data: '2025-01-08T10:00:00',
        tipo: 'entrada',
        titulo: 'Entrada via Trade-In',
        descricao: 'Produto recebido como trade-in na venda VEN-2025-0045 - Cliente Maria Silva',
        responsavel: 'Vendedor João'
      },
      {
        id: 'TL-007',
        data: '2025-01-08T11:30:00',
        tipo: 'parecer_estoque',
        titulo: 'Parecer Estoque - Encaminhado Assistência',
        descricao: 'Encaminhado para conferência da Assistência. Bateria degradada.',
        responsavel: 'Roberto Alves'
      },
      {
        id: 'TL-008',
        data: '2025-01-10T09:00:00',
        tipo: 'parecer_assistencia',
        titulo: 'Parecer Assistência - Aguardando Peça',
        descricao: 'Aguardando chegada de bateria nova do fornecedor.',
        responsavel: 'Carlos Técnico'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Aguardando Peça'
  },
  {
    id: 'PEND-0005',
    imei: '352999888777005',
    marca: 'Apple',
    modelo: 'iPhone 13',
    cor: 'Rosa',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Trade-In',
    notaOuVendaId: 'VEN-2025-0048',
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
    parecerAssistencia: {
      id: 'PA-002',
      data: '2025-01-09T14:00:00',
      status: 'Ajustes realizados',
      observacoes: 'Polimento realizado na tela e troca de película. Produto pronto.',
      responsavel: 'Carlos Técnico',
      pecas: [
        { descricao: 'Kit de polimento profissional', valor: 80.00, fornecedor: 'PhoneParts Brasil' },
        { descricao: 'Película de vidro temperado', valor: 45.00, fornecedor: 'TechSupply Imports' },
        { descricao: 'Mão de obra técnica', valor: 255.00, fornecedor: 'Interno' }
      ]
    },
    timeline: [
      {
        id: 'TL-009',
        data: '2025-01-07T10:30:00',
        tipo: 'entrada',
        titulo: 'Entrada via Trade-In',
        descricao: 'Produto recebido como trade-in na venda VEN-2025-0048 - Cliente Pedro Santos',
        responsavel: 'Vendedora Ana'
      },
      {
        id: 'TL-010',
        data: '2025-01-07T15:00:00',
        tipo: 'parecer_estoque',
        titulo: 'Parecer Estoque - Encaminhado Assistência',
        descricao: 'Encaminhado para conferência da Assistência. Tela com pequeno risco.',
        responsavel: 'Fernanda Lima'
      },
      {
        id: 'TL-011',
        data: '2025-01-09T14:00:00',
        tipo: 'parecer_assistencia',
        titulo: 'Parecer Assistência - Ajustes Realizados',
        descricao: 'Polimento realizado na tela e troca de película. Produto pronto.',
        responsavel: 'Carlos Técnico'
      },
      {
        id: 'TL-012',
        data: '2025-01-09T14:00:00',
        tipo: 'despesa',
        titulo: 'Despesa - Kit de polimento profissional',
        descricao: 'Fornecedor: PhoneParts Brasil',
        valor: 80.00,
        responsavel: 'Carlos Técnico'
      },
      {
        id: 'TL-013',
        data: '2025-01-09T14:00:00',
        tipo: 'despesa',
        titulo: 'Despesa - Película de vidro temperado',
        descricao: 'Fornecedor: TechSupply Imports',
        valor: 45.00,
        responsavel: 'Carlos Técnico'
      },
      {
        id: 'TL-014',
        data: '2025-01-09T14:00:00',
        tipo: 'despesa',
        titulo: 'Despesa - Mão de obra técnica',
        descricao: 'Fornecedor: Interno',
        valor: 255.00,
        responsavel: 'Carlos Técnico'
      }
    ],
    custoAssistencia: 380.00,
    statusGeral: 'Em Análise Assistência' // Ainda precisa do parecer "Produto conferido"
  }
];

// Funções de API
export const getProdutosPendentes = (): ProdutoPendente[] => {
  return [...produtosPendentes];
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

export const salvarParecerEstoque = (
  id: string, 
  status: ParecerEstoque['status'], 
  observacoes: string, 
  responsavel: string
): ProdutoPendente | null => {
  const produto = produtosPendentes.find(p => p.id === id);
  if (!produto) return null;

  const parecer: ParecerEstoque = {
    id: `PE-${Date.now()}`,
    data: new Date().toISOString(),
    status,
    observacoes,
    responsavel
  };

  produto.parecerEstoque = parecer;
  
  // Adicionar na timeline
  produto.timeline.push({
    id: `TL-${Date.now()}`,
    data: new Date().toISOString(),
    tipo: 'parecer_estoque',
    titulo: status === 'Análise Realizada – Produto em ótimo estado' 
      ? 'Parecer Estoque - Aprovado' 
      : 'Parecer Estoque - Encaminhado Assistência',
    descricao: `${status}. ${observacoes}`,
    responsavel
  });

  // Atualizar status geral
  if (status === 'Encaminhado para conferência da Assistência') {
    produto.statusGeral = 'Em Análise Assistência';
  }
  // Se aprovado direto, será migrado pela função de liberação

  return produto;
};

export const salvarParecerAssistencia = (
  id: string,
  status: ParecerAssistencia['status'],
  observacoes: string,
  responsavel: string,
  pecas?: { descricao: string; valor: number; fornecedor: string }[]
): ProdutoPendente | null => {
  const produto = produtosPendentes.find(p => p.id === id);
  if (!produto) return null;

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
    titulo: `Parecer Assistência - ${status}`,
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

  // Atualizar status geral
  if (status === 'Aguardando peça') {
    produto.statusGeral = 'Aguardando Peça';
  } else if (status === 'Produto conferido' || status === 'Ajustes realizados') {
    // Pode ser liberado se todas condições atendidas
    produto.statusGeral = 'Em Análise Assistência';
  }

  return produto;
};

export const liberarProdutoPendente = (id: string): boolean => {
  const index = produtosPendentes.findIndex(p => p.id === id);
  if (index === -1) return false;

  const produto = produtosPendentes[index];
  
  // Verificar se pode ser liberado
  const parecerEstoqueOK = produto.parecerEstoque?.status === 'Análise Realizada – Produto em ótimo estado';
  const parecerAssistenciaOK = produto.parecerAssistencia?.status === 'Produto conferido';
  
  // Pode liberar se: estoque OK OU (encaminhado p/ assistência E assistência OK)
  const podeLiberar = parecerEstoqueOK || 
    (produto.parecerEstoque?.status === 'Encaminhado para conferência da Assistência' && parecerAssistenciaOK);

  if (!podeLiberar) return false;

  // Adicionar na timeline
  produto.timeline.push({
    id: `TL-${Date.now()}`,
    data: new Date().toISOString(),
    tipo: 'liberacao',
    titulo: 'Produto Liberado para Estoque',
    descricao: 'Produto passou por todas as conferências e foi liberado para venda.',
    responsavel: 'Sistema'
  });

  produto.statusGeral = 'Liberado';
  
  // Remover da lista de pendentes (será tratado na UI)
  produtosPendentes.splice(index, 1);
  
  return true;
};

export const addProdutoPendente = (produto: Omit<ProdutoPendente, 'id' | 'timeline' | 'custoAssistencia' | 'statusGeral'>): ProdutoPendente => {
  const newId = `PEND-${String(produtosPendentes.length + 1).padStart(4, '0')}`;
  
  const newProduto: ProdutoPendente = {
    ...produto,
    id: newId,
    timeline: [
      {
        id: `TL-${Date.now()}`,
        data: new Date().toISOString(),
        tipo: 'entrada',
        titulo: produto.origemEntrada === 'Trade-In' ? 'Entrada via Trade-In' : 'Entrada via Nota de Compra',
        descricao: `Produto recebido ${produto.origemEntrada === 'Trade-In' ? 'como trade-in' : 'via nota de compra'} - ${produto.notaOuVendaId || 'N/A'}`,
        responsavel: 'Sistema'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque'
  };

  produtosPendentes.push(newProduto);
  return newProduto;
};
