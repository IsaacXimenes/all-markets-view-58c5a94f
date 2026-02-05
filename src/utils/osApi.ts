// API para Lista de Reparos (OS)
import { Produto, addProdutoMigrado } from './estoqueApi';
import { generateProductId, registerProductId, isProductIdRegistered } from './idManager';

export interface ParecerEstoque {
  id: string;
  data: string;
  status: 'Análise Realizada – Produto em ótimo estado' | 'Encaminhado para conferência da Assistência' | 'Produto revisado e deferido';
  observacoes: string;
  responsavel: string;
  contadorEncaminhamento?: number;
}

export interface ParecerAssistencia {
  id: string;
  data: string;
  status: 'Validado pela assistência' | 'Aguardando peça' | 'Ajustes realizados';
  observacoes: string;
  responsavel: string;
  pecas?: {
    descricao: string;
    valor: number;
    fornecedor: string;
    origemPeca?: 'Fornecedor' | 'Tinha na Assistência';
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
  origemEntrada: 'Base de Troca' | 'Fornecedor' | 'Emprestado - Garantia' | 'NEGOCIADO';
  notaOuVendaId?: string;
  valorCusto: number;
  valorCustoOriginal: number; // Valor original preservado (não soma custo assistência)
  valorOrigem: number; // NOVO - Valor original de aquisição (nunca altera)
  saudeBateria: number;
  loja: string;
  dataEntrada: string;
  fornecedor?: string; // Nome do fornecedor para notas de entrada
  parecerEstoque?: ParecerEstoque;
  parecerAssistencia?: ParecerAssistencia;
  timeline: TimelineEntry[];
  custoAssistencia: number;
  statusGeral: 'Pendente Estoque' | 'Em Análise Assistência' | 'Aguardando Peça' | 'Liberado' | 'Retornado da Assistência' | 'Devolvido para Fornecedor';
  contadorEncaminhamentos: number;
}

// Dados mockados de produtos pendentes - IDs PROD-XXXX únicos para rastreabilidade
// IMPORTANTE: Estes IDs são DIFERENTES dos IDs em estoqueApi.ts para evitar duplicação
let produtosPendentes: ProdutoPendente[] = [
  // 3 produtos em Produtos Pendentes (IDs PROD-0001 a PROD-0003) - com SLA variado
  {
    id: 'PROD-0001',
    imei: '352999888777001',
    marca: 'Apple',
    modelo: 'iPhone 13 Pro',
    cor: 'Grafite',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Fornecedor',
    notaOuVendaId: 'NC-2025-0010',
    valorCusto: 3100.00,
    valorCustoOriginal: 3100.00,
    valorOrigem: 3100.00,
    saudeBateria: 86,
    loja: 'db894e7d', // Loja - JK Shopping
    dataEntrada: '2025-12-13', // 1 dia atrás - SLA normal
    timeline: [
      {
        id: 'TL-001',
        data: '2025-12-13T09:30:00',
        tipo: 'entrada',
        titulo: 'Entrada via Fornecedor',
        descricao: 'Produto PROD-0001 recebido da nota NC-2025-0010 - Fornecedor TechSupply Imports',
        responsavel: 'Lucas Mendes'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque',
    contadorEncaminhamentos: 0
  },
  {
    id: 'PROD-0002',
    imei: '352999888777002',
    marca: 'Apple',
    modelo: 'iPhone 14',
    cor: 'Azul',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Base de Troca',
    notaOuVendaId: 'VEN-2025-0050',
    valorCusto: 3500.00,
    valorCustoOriginal: 3500.00,
    valorOrigem: 3500.00,
    saudeBateria: 91,
    loja: '3ac7e00c', // Loja - Matriz
    dataEntrada: '2025-12-10', // 4 dias atrás - SLA amarelo
    timeline: [
      {
        id: 'TL-002',
        data: '2025-12-10T10:00:00',
        tipo: 'entrada',
        titulo: 'Entrada via Base de Troca',
        descricao: 'Produto PROD-0002 recebido como base de troca na venda VEN-2025-0050',
        responsavel: 'Roberto Alves'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque',
    contadorEncaminhamentos: 0
  },
  {
    id: 'PROD-0003',
    imei: '352999888777003',
    marca: 'Apple',
    modelo: 'iPhone 12 Mini',
    cor: 'Branco',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Fornecedor',
    notaOuVendaId: 'NC-2025-0012',
    valorCusto: 1800.00,
    valorCustoOriginal: 1800.00,
    valorOrigem: 1800.00,
    saudeBateria: 72,
    loja: '5b9446d5', // Loja - Shopping Sul
    dataEntrada: '2025-12-08', // 6 dias atrás - SLA vermelho
    timeline: [
      {
        id: 'TL-004',
        data: '2025-12-08T08:30:00',
        tipo: 'entrada',
        titulo: 'Entrada via Fornecedor',
        descricao: 'Produto PROD-0003 recebido da nota NC-2025-0012 - Fornecedor FastCell Distribuição',
        responsavel: 'Ana Paula'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque',
    contadorEncaminhamentos: 0
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
    origemEntrada: 'Base de Troca',
    notaOuVendaId: 'VEN-2025-0045',
    valorCusto: 1500.00,
    valorCustoOriginal: 1500.00,
    valorOrigem: 1500.00,
    saudeBateria: 78,
    loja: '0d06e7db', // Loja - Águas Lindas Shopping
    dataEntrada: '2025-12-09', // 5 dias atrás - SLA vermelho
    parecerEstoque: {
      id: 'PE-003',
      data: '2025-12-09T11:30:00',
      status: 'Encaminhado para conferência da Assistência',
      observacoes: 'Base de troca com bateria degradada, encaminhar para troca de bateria.',
      responsavel: 'Roberto Alves'
    },
    timeline: [
      {
        id: 'TL-006',
        data: '2025-12-09T10:00:00',
        tipo: 'entrada',
        titulo: 'Entrada via Base de Troca',
        descricao: 'Produto PROD-0004 recebido como base de troca na venda VEN-2025-0045 - Cliente Maria Silva',
        responsavel: 'Vendedor João'
      },
      {
        id: 'TL-007',
        data: '2025-12-09T11:30:00',
        tipo: 'parecer_estoque',
        titulo: 'Parecer Estoque - Encaminhado Assistência',
        descricao: 'PROD-0004 encaminhado para conferência da Assistência. Bateria degradada.',
        responsavel: 'Roberto Alves'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Em Análise Assistência',
    contadorEncaminhamentos: 1
  },
  {
    id: 'PROD-0005',
    imei: '352999888777005',
    marca: 'Apple',
    modelo: 'iPhone 13',
    cor: 'Rosa',
    tipo: 'Seminovo',
    condicao: 'Semi-novo',
    origemEntrada: 'Fornecedor',
    notaOuVendaId: 'NC-2025-0015',
    valorCusto: 2200.00,
    valorCustoOriginal: 2200.00,
    valorOrigem: 2200.00,
    saudeBateria: 82,
    loja: 'fcc78c1a', // Loja - Online
    dataEntrada: '2025-12-11', // 3 dias atrás - SLA amarelo
    parecerEstoque: {
      id: 'PE-004',
      data: '2025-12-11T15:00:00',
      status: 'Encaminhado para conferência da Assistência',
      observacoes: 'Tela com pequeno risco, encaminhar para polimento.',
      responsavel: 'Fernanda Lima'
    },
    timeline: [
      {
        id: 'TL-009',
        data: '2025-12-11T10:30:00',
        tipo: 'entrada',
        titulo: 'Entrada via Fornecedor',
        descricao: 'Produto PROD-0005 recebido da nota NC-2025-0015 - Fornecedor TechnoImports',
        responsavel: 'Vendedora Ana'
      },
      {
        id: 'TL-010',
        data: '2025-12-11T15:00:00',
        tipo: 'parecer_estoque',
        titulo: 'Parecer Estoque - Encaminhado Assistência',
        descricao: 'PROD-0005 encaminhado para conferência da Assistência. Tela com pequeno risco.',
        responsavel: 'Fernanda Lima'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Em Análise Assistência',
    contadorEncaminhamentos: 1
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
  // Retorna TODOS os produtos não liberados para manter visibilidade durante todo o fluxo
  return produtosPendentes.filter(p => p.statusGeral !== 'Liberado');
};

export const getProdutoPendenteById = (id: string): ProdutoPendente | null => {
  return produtosPendentes.find(p => p.id === id) || null;
};

export const getProdutosParaAnaliseOS = (): ProdutoPendente[] => {
  // Retorna produtos encaminhados para assistência ou aguardando peça
  return produtosPendentes.filter(p => 
    p.statusGeral === 'Em Análise Assistência' || p.statusGeral === 'Aguardando Peça'
  );
};

export const getProdutosMigrados = (): Produto[] => {
  return [...produtosMigrados];
};

// Calcular SLA em dias e horas
export const calcularSLA = (dataEntrada: string): { 
  dias: number; 
  horas: number; 
  texto: string; 
  cor: 'normal' | 'amarelo' | 'vermelho' 
} => {
  const hoje = new Date();
  const entrada = new Date(dataEntrada);
  const diffTime = Math.abs(hoje.getTime() - entrada.getTime());
  
  const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let cor: 'normal' | 'amarelo' | 'vermelho' = 'normal';
  if (dias >= 5) {
    cor = 'vermelho';
  } else if (dias >= 3) {
    cor = 'amarelo';
  }
  
  const texto = dias > 0 
    ? `${dias} dia${dias > 1 ? 's' : ''} e ${horas}h`
    : `${horas}h`;
  
  return { dias, horas, texto, cor };
};

// Migrar produto para o estoque PRINCIPAL (via estoqueApi)
// IMPORTANTE: NÃO soma custo assistência ao valor original
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

  // Usar valor original, NÃO somar custo assistência
  // Produtos validados diretamente pelo estoque ficam com vendaRecomendada pendente (null) e statusNota: 'Pendente'
  const novoProduto: Produto = {
    id: produto.id, // ID PERSISTENTE - nunca muda
    imei: produto.imei,
    imagem: produto.imagem,
    marca: produto.marca,
    modelo: produto.modelo,
    cor: produto.cor,
    tipo: produto.tipo,
    quantidade: 1,
    valorCusto: produto.valorCustoOriginal, // VALOR ORIGINAL PRESERVADO
    valorVendaSugerido: produto.valorCustoOriginal * 1.8, // Baseado no original
    vendaRecomendada: null, // Pendente - habilita botão "Informar Valor" na tela de Estoque > Produtos
    saudeBateria: produto.saudeBateria,
    loja: produto.loja,
    estoqueConferido: true,
    assistenciaConferida: origemDeferimento === 'Assistência',
    condicao: produto.condicao === 'Semi-novo' ? 'Seminovo' : 'Lacrado',
    historicoCusto: [
      { 
        data: new Date().toISOString().split('T')[0], 
        fornecedor: produto.origemEntrada, 
        valor: produto.valorCustoOriginal 
      }
    ],
    historicoValorRecomendado: [],
    statusNota: 'Pendente', // Pendente para habilitar informar valor recomendado
    origemEntrada: produto.origemEntrada,
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

  // Auto-incremento para encaminhamentos para assistência
  let contadorEncaminhamento = produto.contadorEncaminhamentos || 0;
  
  if (status === 'Encaminhado para conferência da Assistência') {
    contadorEncaminhamento++;
    produto.contadorEncaminhamentos = contadorEncaminhamento;
  }

  const parecer: ParecerEstoque = {
    id: `PE-${Date.now()}`,
    data: new Date().toISOString(),
    status,
    observacoes,
    responsavel,
    contadorEncaminhamento: status === 'Encaminhado para conferência da Assistência' ? contadorEncaminhamento : undefined
  };

  produto.parecerEstoque = parecer;
  
  // Adicionar na timeline com ID do produto e contador
  produto.timeline.push({
    id: `TL-${Date.now()}`,
    data: new Date().toISOString(),
    tipo: 'parecer_estoque',
    titulo: status === 'Análise Realizada – Produto em ótimo estado' 
      ? `Deferido Estoque – ${id}` 
      : status === 'Produto revisado e deferido'
        ? `Produto Revisado e Deferido – ${id}`
        : `Parecer Estoque - Encaminhado Assistência (${contadorEncaminhamento}) – ${id}`,
    descricao: `${status}. ${observacoes}`,
    responsavel
  });

  // ============= VALIDAÇÃO PROGRESSIVA =============
  // Se o produto veio de uma nota, atualizar validação progressiva
  if (produto.notaOuVendaId && produto.notaOuVendaId.startsWith('NC-') || produto.notaOuVendaId?.startsWith('URG-')) {
    try {
      // Importar dinamicamente para evitar dependência circular
      const { validarAparelhoNota, verificarConferenciaNota } = require('./estoqueApi');
      const { atualizarPendencia, getPendenciaPorNota } = require('./pendenciasFinanceiraApi');
      const { addNotification } = require('./notificationsApi');
      
      // Validar o aparelho na nota
      const resultado = validarAparelhoNota(produto.notaOuVendaId, produto.imei, {
        responsavel,
        observacoes
      });
      
      if (resultado.sucesso) {
        // Atualizar pendência financeira
        const conferencia = verificarConferenciaNota(produto.notaOuVendaId);
        
        atualizarPendencia(produto.notaOuVendaId, {
          valorConferido: resultado.nota?.valorConferido,
          aparelhosConferidos: conferencia.aparelhosConferidos,
          statusConferencia: resultado.conferidoCompleto 
            ? (resultado.discrepancia ? 'Discrepância Detectada' : 'Conferência Completa') 
            : 'Em Conferência',
          responsavel,
          aparelhoInfo: {
            modelo: `${produto.marca} ${produto.modelo}`,
            imei: produto.imei,
            valor: produto.valorCusto
          }
        });
        
        console.log(`[Validação Progressiva] Aparelho ${produto.imei} validado na nota ${produto.notaOuVendaId}. Progresso: ${conferencia.percentual}%`);
      }
    } catch (error) {
      console.warn('[Validação Progressiva] Erro ao atualizar nota:', error);
    }
  }

  // Se aprovado direto pelo estoque OU produto revisado e deferido
  if (status === 'Análise Realizada – Produto em ótimo estado' || status === 'Produto revisado e deferido') {
    produto.timeline.push({
      id: `TL-${Date.now()}-lib`,
      data: new Date().toISOString(),
      tipo: 'liberacao',
      titulo: `Deferido Estoque – ID ${id} liberado para estoque`,
      descricao: `Produto ${id} aprovado pelo estoque e liberado para venda.`,
      responsavel
    });

    produto.statusGeral = 'Liberado';
    
    const produtoMigrado = migrarParaEstoque(produto, 'Estoque', responsavel);
    
    const index = produtosPendentes.findIndex(p => p.id === id);
    if (index !== -1) {
      produtosPendentes.splice(index, 1);
    }

    return { produto, migrado: true, produtoMigrado };
  } else {
    // Encaminhado para assistência - criar registro na Análise de Tratativas
    produto.statusGeral = 'Em Análise Assistência';
    
    // Adicionar à Análise de Tratativas
    try {
      const { encaminharParaAnaliseGarantia } = require('./garantiasApi');
      encaminharParaAnaliseGarantia(
        produto.id,
        'Estoque',
        `${produto.marca} ${produto.modelo} - ${produto.cor} (IMEI: ${produto.imei})`
      );
    } catch (error) {
      console.warn('[salvarParecerEstoque] Erro ao encaminhar para análise:', error);
    }
    
    return { produto, migrado: false };
  }
};

export const salvarParecerAssistencia = (
  id: string,
  status: ParecerAssistencia['status'],
  observacoes: string,
  responsavel: string,
  pecas?: { descricao: string; valor: number; fornecedor: string; origemPeca?: 'Fornecedor' | 'Tinha na Assistência' }[]
): { produto: ProdutoPendente | null; migrado: boolean; produtoMigrado?: Produto; retornadoPendentes?: boolean } => {
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

  // Adicionar despesas na timeline (apenas para registro, NÃO soma ao custo do produto)
  if (pecas && pecas.length > 0) {
    let custoTotal = 0;
    pecas.forEach(peca => {
      custoTotal += peca.valor;
      produto.timeline.push({
        id: `TL-${Date.now()}-${Math.random()}`,
        data: new Date().toISOString(),
        tipo: 'despesa',
        titulo: `Despesa - ${peca.descricao}`,
        descricao: `Fornecedor: ${peca.fornecedor} | Origem: ${peca.origemPeca || 'N/A'}`,
        valor: peca.valor,
        responsavel
      });
    });
    // Custo assistência é registrado mas NÃO altera valor do produto
    produto.custoAssistencia = (produto.custoAssistencia || 0) + custoTotal;
  }

  // Se produto validado pela assistência -> RETORNA para Produtos Pendentes para revisão final do Estoque
  if (status === 'Validado pela assistência') {
    produto.timeline.push({
      id: `TL-${Date.now()}-ret`,
      data: new Date().toISOString(),
      tipo: 'parecer_assistencia',
      titulo: `Retornado para Revisão Final – ${id}`,
      descricao: `Produto ${id} validado pela assistência. Aguardando revisão final do Estoque para deferimento.`,
      responsavel
    });

    // Muda status para Retornado da Assistência (vai aparecer em Produtos Pendentes)
    produto.statusGeral = 'Retornado da Assistência';
    // Limpa parecer estoque para permitir novo parecer de deferimento
    produto.parecerEstoque = undefined;

    return { produto, migrado: false, retornadoPendentes: true };
  } else if (status === 'Aguardando peça') {
    produto.statusGeral = 'Aguardando Peça';
    return { produto, migrado: false };
  } else {
    // Ajustes realizados - ainda está na assistência
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

// Atualizar produto pendente (ex: parecer técnico)
export const updateProdutoPendente = (id: string, dados: Partial<ProdutoPendente>): ProdutoPendente | null => {
  const index = produtosPendentes.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  produtosPendentes[index] = {
    ...produtosPendentes[index],
    ...dados
  };
  
  // Se tem parecer assistência, adiciona na timeline
  if (dados.parecerAssistencia) {
    const timelineEntry = {
      id: `TL-${Date.now()}`,
      data: dados.parecerAssistencia.data || new Date().toISOString(),
      tipo: 'parecer_assistencia' as const,
      titulo: `Parecer Assistência - ${dados.parecerAssistencia.status}`,
      descricao: dados.parecerAssistencia.observacoes || '',
      responsavel: dados.parecerAssistencia.responsavel
    };
    
    produtosPendentes[index].timeline.push(timelineEntry);
  }
  
  return produtosPendentes[index];
};

export const addProdutoPendente = (
  produto: Omit<ProdutoPendente, 'id' | 'timeline' | 'custoAssistencia' | 'statusGeral' | 'valorCustoOriginal' | 'contadorEncaminhamentos'>,
  forcarCriacao: boolean = false
): ProdutoPendente => {
  // VALIDAÇÃO: Verificar se já existe produto com mesmo IMEI (evitar duplicatas)
  // EXCEÇÃO: Se forcarCriacao=true (ex: Base de Trocas), ignora verificação
  if (!forcarCriacao && produto.imei) {
    const jaExiste = produtosPendentes.find(p => p.imei === produto.imei);
    if (jaExiste) {
      console.log(`[OS API] Produto com IMEI ${produto.imei} já existe nos pendentes (ID: ${jaExiste.id}), retornando existente.`);
      return jaExiste;
    }
  }
  
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
    valorCustoOriginal: produto.valorCusto, // Preserva valor original
    timeline: [
      {
        id: `TL-${Date.now()}`,
        data: new Date().toISOString(),
        tipo: 'entrada',
        titulo: produto.origemEntrada === 'Base de Troca' ? 'Entrada via Base de Troca' : 'Entrada via Fornecedor',
        descricao: `Produto ${newId} recebido ${produto.origemEntrada === 'Base de Troca' ? 'como base de troca' : 'via nota de compra'} - ${produto.notaOuVendaId || 'N/A'}`,
        responsavel: 'Sistema'
      }
    ],
    custoAssistencia: 0,
    statusGeral: 'Pendente Estoque',
    contadorEncaminhamentos: 0
  };

  produtosPendentes.push(newProduto);
  console.log(`[OS API] Novo produto pendente criado: ${newId} (IMEI: ${produto.imei || 'N/A'}, forcarCriacao: ${forcarCriacao})`);
  return newProduto;
};

// Interface para trade-in vindo da venda
interface TradeInItem {
  id: string;
  produtoId?: string;
  modelo: string;
  descricao: string;
  imei: string;
  valorCompraUsado: number;
  imeiValidado: boolean;
  condicao: 'Novo' | 'Semi-novo';
}

// Migrar trade-ins da venda finalizada para Aparelhos Pendentes - Estoque
export const migrarTradeInsParaPendentes = (
  tradeIns: TradeInItem[],
  vendaId: string,
  lojaId: string,
  responsavel: string
): ProdutoPendente[] => {
  const produtosMigrados: ProdutoPendente[] = [];
  
  for (const tradeIn of tradeIns) {
    // Verificar se já não foi migrado (evitar duplicatas)
    const jaExiste = produtosPendentes.find(p => p.imei === tradeIn.imei);
    if (jaExiste) {
      console.log(`[OS API] Trade-in ${tradeIn.imei} já existe nos pendentes, ignorando duplicata.`);
      continue;
    }
    
    const newId = generateProductId();
    
    const novoProdutoPendente: ProdutoPendente = {
      id: newId,
      imei: tradeIn.imei,
      marca: 'Apple', // Por padrão, pode ser ajustado
      modelo: tradeIn.modelo,
      cor: 'N/A', // Definir cor padrão, será ajustado na análise
      tipo: 'Seminovo',
      condicao: tradeIn.condicao,
      origemEntrada: 'Base de Troca',
      notaOuVendaId: vendaId,
      valorCusto: tradeIn.valorCompraUsado,
      valorCustoOriginal: tradeIn.valorCompraUsado,
      valorOrigem: tradeIn.valorCompraUsado,
      saudeBateria: 80, // Valor padrão, será ajustado na análise
      loja: lojaId,
      dataEntrada: new Date().toISOString().split('T')[0],
      timeline: [
        {
          id: `TL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          data: new Date().toISOString(),
          tipo: 'entrada',
          titulo: 'Entrada via Base de Troca - Financeiro Finalizado',
          descricao: `Produto ${newId} migrado automaticamente após finalização financeira da venda ${vendaId}. Descrição: ${tradeIn.descricao}`,
          responsavel
        }
      ],
      custoAssistencia: 0,
      statusGeral: 'Pendente Estoque',
      contadorEncaminhamentos: 0
    };
    
    produtosPendentes.push(novoProdutoPendente);
    registerProductId(newId);
    produtosMigrados.push(novoProdutoPendente);
    
    console.log(`[OS API] Trade-in ${tradeIn.modelo} (IMEI: ${tradeIn.imei}) migrado para Aparelhos Pendentes - Estoque com ID ${newId}`);
  }
  
  return produtosMigrados;
};

// Interface para produtos de nota de entrada
interface ProdutoNota {
  marca: string;
  modelo: string;
  cor: string;
  imei: string;
  tipo: string;
  tipoProduto?: 'Aparelho' | 'Acessório';
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  saudeBateria?: number;
}

// Migrar produtos de nota de entrada para Aparelhos Pendentes - Estoque
export const migrarProdutosNotaParaPendentes = (
  produtos: ProdutoNota[],
  notaId: string,
  fornecedor: string,
  lojaDestino: string,
  responsavel: string,
  origemEntrada: 'Fornecedor' | 'Base de Troca' | 'Emprestado - Garantia' | 'NEGOCIADO' = 'Fornecedor'
): ProdutoPendente[] => {
  const produtosMigrados: ProdutoPendente[] = [];
  
  for (const produto of produtos) {
    // Ignorar acessórios - eles vão direto para o estoque de acessórios
    if (produto.tipoProduto === 'Acessório') {
      console.log(`[OS API] Produto ${produto.modelo} é acessório, ignorando migração para pendentes.`);
      continue;
    }
    
    // Verificar duplicata por IMEI
    const jaExiste = produtosPendentes.find(p => p.imei === produto.imei);
    if (jaExiste) {
      console.log(`[OS API] Produto ${produto.imei} já existe nos pendentes, ignorando duplicata.`);
      continue;
    }
    
    const newId = generateProductId();
    
    const novoProduto: ProdutoPendente = {
      id: newId,
      imei: produto.imei,
      marca: produto.marca,
      modelo: produto.modelo,
      cor: produto.cor,
      tipo: produto.tipo === 'Novo' ? 'Novo' : 'Seminovo',
      condicao: produto.tipo === 'Novo' ? 'Novo' : 'Semi-novo',
      origemEntrada: origemEntrada,
      notaOuVendaId: notaId,
      valorCusto: produto.valorUnitario,
      valorCustoOriginal: produto.valorUnitario,
      valorOrigem: produto.valorUnitario,
      saudeBateria: produto.saudeBateria || 100,
      loja: lojaDestino,
      dataEntrada: new Date().toISOString().split('T')[0],
      fornecedor: fornecedor,
      timeline: [
        {
          id: `TL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          data: new Date().toISOString(),
          tipo: 'entrada',
          titulo: 'Entrada via Nota de Compra - Financeiro Aprovado',
          descricao: `Produto ${newId} recebido via nota ${notaId} do fornecedor ${fornecedor}`,
          responsavel
        }
      ],
      custoAssistencia: 0,
      statusGeral: 'Pendente Estoque',
      contadorEncaminhamentos: 0
    };
    
    produtosPendentes.push(novoProduto);
    registerProductId(newId);
    produtosMigrados.push(novoProduto);
    
    console.log(`[OS API] Produto ${produto.marca} ${produto.modelo} (IMEI: ${produto.imei}) migrado para Aparelhos Pendentes com ID ${newId}`);
  }
  
  return produtosMigrados;
};
