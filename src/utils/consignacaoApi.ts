// API para gestão de Peças em Consignação
import { addPeca, getPecaById, darBaixaPeca, deletePeca, updatePeca } from './pecasApi';
import { NotaAssistencia } from './solicitacaoPecasApi';

export interface TimelineConsignacao {
  data: string;
  tipo: 'entrada' | 'consumo' | 'transferencia' | 'acerto' | 'devolucao' | 'pagamento';
  descricao: string;
  responsavel: string;
}

export interface ItemConsignacao {
  id: string;
  pecaId: string;
  descricao: string;
  modelo: string;
  quantidade: number;
  quantidadeOriginal: number;
  valorCusto: number;
  lojaAtualId: string;
  status: 'Disponivel' | 'Consumido' | 'Devolvido' | 'Em Acerto';
  osVinculada?: string;
  dataConsumo?: string;
  tecnicoConsumo?: string;
  devolvidoPor?: string;
  dataDevolucao?: string;
}

export interface LoteConsignacao {
  id: string;
  fornecedorId: string;
  dataCriacao: string;
  responsavelCadastro: string;
  status: 'Aberto' | 'Em Acerto' | 'Pago' | 'Devolvido';
  itens: ItemConsignacao[];
  timeline: TimelineConsignacao[];
}

let lotes: LoteConsignacao[] = [];
let nextLoteId = 1;
let nextItemId = 1;

// Referência para notas de assistência (importação circular evitada via callback)
let notasAssistenciaRef: NotaAssistencia[] = [];
let notaCounterRef = 100;

export const setNotasRef = (notas: NotaAssistencia[], counter: number) => {
  notasAssistenciaRef = notas;
  notaCounterRef = counter;
};

// ========== GETTERS ==========

export const getLotesConsignacao = (): LoteConsignacao[] => [...lotes];

export const getLoteById = (id: string): LoteConsignacao | undefined =>
  lotes.find(l => l.id === id);

// ========== CRIAR LOTE ==========

export interface CriarLoteInput {
  fornecedorId: string;
  responsavel: string;
  itens: {
    descricao: string;
    modelo: string;
    quantidade: number;
    valorCusto: number;
    lojaDestinoId: string;
  }[];
}

export const criarLoteConsignacao = (dados: CriarLoteInput): LoteConsignacao => {
  const loteId = `CONS-${String(nextLoteId++).padStart(3, '0')}`;

  const itensConsignacao: ItemConsignacao[] = dados.itens.map(item => {
    // Injetar peça no estoque com origem Consignacao
    const pecaCriada = addPeca({
      descricao: item.descricao,
      lojaId: item.lojaDestinoId,
      modelo: item.modelo,
      valorCusto: item.valorCusto,
      valorRecomendado: item.valorCusto * 1.5,
      quantidade: item.quantidade,
      dataEntrada: new Date().toISOString(),
      origem: 'Consignacao',
      status: 'Disponível',
      loteConsignacaoId: loteId,
    });

    const itemId = `CONS-ITEM-${String(nextItemId++).padStart(3, '0')}`;
    return {
      id: itemId,
      pecaId: pecaCriada.id,
      descricao: item.descricao,
      modelo: item.modelo,
      quantidade: item.quantidade,
      quantidadeOriginal: item.quantidade,
      valorCusto: item.valorCusto,
      lojaAtualId: item.lojaDestinoId,
      status: 'Disponivel' as const,
    };
  });

  const lote: LoteConsignacao = {
    id: loteId,
    fornecedorId: dados.fornecedorId,
    dataCriacao: new Date().toISOString(),
    responsavelCadastro: dados.responsavel,
    status: 'Aberto',
    itens: itensConsignacao,
    timeline: [{
      data: new Date().toISOString(),
      tipo: 'entrada',
      descricao: `Lote criado com ${itensConsignacao.length} tipo(s) de peça(s)`,
      responsavel: dados.responsavel,
    }],
  };

  lotes.push(lote);
  return lote;
};

// ========== REGISTRAR CONSUMO ==========

export const registrarConsumoConsignacao = (
  loteId: string, itemId: string, osId: string, tecnico: string, quantidade: number = 1
): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status === 'Em Acerto') return false;

  const item = lote.itens.find(i => i.id === itemId);
  if (!item || item.status !== 'Disponivel') return false;

  item.quantidade -= quantidade;
  if (item.quantidade <= 0) {
    item.quantidade = 0;
    item.status = 'Consumido';
  }
  item.osVinculada = osId;
  item.dataConsumo = new Date().toISOString();
  item.tecnicoConsumo = tecnico;

  lote.timeline.push({
    data: new Date().toISOString(),
    tipo: 'consumo',
    descricao: `${quantidade}x ${item.descricao} consumido na OS ${osId}`,
    responsavel: tecnico,
  });

  return true;
};

// Busca consumo por pecaId (chamado pelo darBaixaPeca)
export const registrarConsumoPorPecaId = (pecaId: string, osId: string, tecnico: string, quantidade: number = 1): void => {
  for (const lote of lotes) {
    if (lote.status === 'Em Acerto') continue;
    const item = lote.itens.find(i => i.pecaId === pecaId && i.status === 'Disponivel');
    if (item) {
      registrarConsumoConsignacao(lote.id, item.id, osId, tecnico, quantidade);
      return;
    }
  }
};

// ========== TRANSFERÊNCIA ==========

export const transferirItemConsignacao = (
  loteId: string, itemId: string, novaLojaId: string, responsavel: string
): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Aberto') return false;

  const item = lote.itens.find(i => i.id === itemId);
  if (!item || item.status !== 'Disponivel') return false;

  const lojaAnterior = item.lojaAtualId;
  item.lojaAtualId = novaLojaId;

  // Atualizar peça no estoque
  const peca = getPecaById(item.pecaId);
  if (peca) {
    peca.lojaId = novaLojaId;
  }

  lote.timeline.push({
    data: new Date().toISOString(),
    tipo: 'transferencia',
    descricao: `${item.descricao} transferido de loja ${lojaAnterior} para ${novaLojaId}`,
    responsavel,
  });

  return true;
};

// ========== ACERTO DE CONTAS ==========

export const iniciarAcertoContas = (loteId: string, responsavel: string): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Aberto') return false;

  lote.status = 'Em Acerto';
  lote.itens.forEach(item => {
    if (item.status === 'Disponivel') {
      item.status = 'Em Acerto';
      if (item.pecaId) {
        updatePeca(item.pecaId, { status: 'Utilizada' });
      }
    }
  });

  lote.timeline.push({
    data: new Date().toISOString(),
    tipo: 'acerto',
    descricao: `Acerto de contas iniciado. Retiradas congeladas.`,
    responsavel,
  });

  return true;
};

export const getValorConsumido = (lote: LoteConsignacao): number => {
  return lote.itens
    .filter(i => i.status === 'Consumido')
    .reduce((acc, i) => acc + (i.quantidadeOriginal - i.quantidade) * i.valorCusto, 0)
    + lote.itens
    .filter(i => i.status === 'Em Acerto' && i.quantidade < i.quantidadeOriginal)
    .reduce((acc, i) => acc + (i.quantidadeOriginal - i.quantidade) * i.valorCusto, 0);
};

// ========== DEVOLUÇÃO ==========

export const confirmarDevolucaoItem = (loteId: string, itemId: string, responsavel: string): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote) return false;

  const item = lote.itens.find(i => i.id === itemId);
  if (!item || item.status === 'Consumido' || item.status === 'Devolvido') return false;

  item.status = 'Devolvido';
  item.devolvidoPor = responsavel;
  item.dataDevolucao = new Date().toISOString();

  // Manter no estoque como histórico (indisponível)
  if (item.pecaId) {
    updatePeca(item.pecaId, { status: 'Devolvida', quantidade: 0 });
  }

  lote.timeline.push({
    data: new Date().toISOString(),
    tipo: 'devolucao',
    descricao: `${item.descricao} (${item.quantidade} un.) devolvido ao fornecedor`,
    responsavel,
  });

  // Verificar se todos os itens foram devolvidos ou consumidos
  const todosFinalizados = lote.itens.every(i => i.status === 'Consumido' || i.status === 'Devolvido');
  if (todosFinalizados && lote.status === 'Aberto') {
    lote.status = 'Devolvido';
  }

  return true;
};

// ========== FINANCEIRO ==========

export const gerarLoteFinanceiro = (loteId: string, dadosPagamento?: {
  formaPagamento: string;
  contaBancaria?: string;
  nomeRecebedor?: string;
  chavePix?: string;
  observacao?: string;
}): NotaAssistencia | null => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Em Acerto') return null;

  const valorTotal = getValorConsumido(lote);
  const itensConsumidos = lote.itens.filter(i =>
    i.status === 'Consumido' || (i.quantidade < i.quantidadeOriginal)
  );

  const nota: NotaAssistencia = {
    id: `NOTA-CONS-${String(notaCounterRef++).padStart(3, '0')}`,
    solicitacaoId: loteId,
    fornecedor: lote.fornecedorId,
    lojaSolicitante: itensConsumidos[0]?.lojaAtualId || '',
    dataCriacao: new Date().toISOString(),
    valorTotal,
    status: 'Pendente',
    itens: itensConsumidos.map(i => ({
      peca: i.descricao,
      quantidade: i.quantidadeOriginal - i.quantidade || i.quantidadeOriginal,
      valorUnitario: i.valorCusto,
      osVinculada: i.osVinculada,
    })),
    loteId: loteId,
    tipoConsignacao: true,
    ...(dadosPagamento && {
      formaPagamentoEncaminhamento: dadosPagamento.formaPagamento,
      contaBancariaEncaminhamento: dadosPagamento.contaBancaria,
      nomeRecebedor: dadosPagamento.nomeRecebedor,
      chavePixEncaminhamento: dadosPagamento.chavePix,
      observacaoEncaminhamento: dadosPagamento.observacao,
    }),
  };

  lote.timeline.push({
    data: new Date().toISOString(),
    tipo: 'pagamento',
    descricao: `Lote financeiro gerado: ${nota.id} - Valor: R$ ${valorTotal.toFixed(2)}`,
    responsavel: lote.responsavelCadastro,
  });

  return nota;
};

export const finalizarAcerto = (loteId: string): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Em Acerto') return false;

  const agora = new Date().toISOString();

  // Marcar sobras (Em Acerto) como Devolvido no lote e no estoque
  lote.itens.filter(i => i.status === 'Em Acerto').forEach(item => {
    item.status = 'Devolvido';
    item.dataDevolucao = agora;
    item.devolvidoPor = 'Financeiro';
    if (item.pecaId) {
      updatePeca(item.pecaId, { status: 'Devolvida', quantidade: 0 });
    }
    lote.timeline.push({
      data: agora,
      tipo: 'devolucao',
      descricao: `${item.descricao} (${item.quantidade} un.) devolvido automaticamente ao fornecedor`,
      responsavel: 'Financeiro',
    });
  });

  lote.status = 'Pago';
  lote.timeline.push({
    data: agora,
    tipo: 'pagamento',
    descricao: 'Acerto finalizado. Pagamento confirmado pelo financeiro.',
    responsavel: 'Financeiro',
  });

  return true;
};
