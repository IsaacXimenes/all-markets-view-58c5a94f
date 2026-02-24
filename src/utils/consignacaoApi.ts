// API para gestão de Peças em Consignação
import { addPeca, getPecaById, darBaixaPeca, deletePeca, updatePeca } from './pecasApi';
import { NotaAssistencia } from './solicitacaoPecasApi';

export interface TimelineConsignacao {
  data: string;
  tipo: 'entrada' | 'consumo' | 'transferencia' | 'acerto' | 'devolucao' | 'pagamento';
  descricao: string;
  responsavel: string;
  comprovanteUrl?: string;
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
  status: 'Disponivel' | 'Consumido' | 'Devolvido' | 'Em Acerto' | 'Em Pagamento' | 'Pago';
  osVinculada?: string;
  dataConsumo?: string;
  tecnicoConsumo?: string;
  devolvidoPor?: string;
  dataDevolucao?: string;
}

export interface PagamentoParcial {
  id: string;
  data: string;
  valor: number;
  itensIds: string[];
  notaFinanceiraId: string;
  status: 'Pendente' | 'Pago';
  comprovanteUrl?: string;
  dataPagamento?: string;
}

export interface LoteConsignacao {
  id: string;
  fornecedorId: string;
  dataCriacao: string;
  responsavelCadastro: string;
  status: 'Aberto' | 'Em Acerto' | 'Aguardando Pagamento' | 'Pago' | 'Devolvido' | 'Concluido';
  itens: ItemConsignacao[];
  timeline: TimelineConsignacao[];
  pagamentosParciais: PagamentoParcial[];
}

let lotes: LoteConsignacao[] = [];
let nextLoteId = 1;
let nextItemId = 1;
let nextPagamentoId = 1;

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
    pagamentosParciais: [],
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
  if (!lote || lote.status === 'Concluido') return false;

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
    if (lote.status === 'Concluido') continue;
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

// ========== ACERTO DE CONTAS (LEGADO - simplificado) ==========

export const iniciarAcertoContas = (loteId: string, responsavel: string): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Aberto') return false;

  // Não congela mais as peças disponíveis
  lote.status = 'Em Acerto';

  lote.timeline.push({
    data: new Date().toISOString(),
    tipo: 'acerto',
    descricao: `Acerto de contas iniciado.`,
    responsavel,
  });

  return true;
};

export const getValorConsumido = (lote: LoteConsignacao): number => {
  return lote.itens
    .filter(i => ['Consumido', 'Em Pagamento', 'Pago'].includes(i.status))
    .reduce((acc, i) => acc + (i.quantidadeOriginal - i.quantidade) * i.valorCusto, 0)
    + lote.itens
    .filter(i => i.status === 'Em Acerto' && i.quantidade < i.quantidadeOriginal)
    .reduce((acc, i) => acc + (i.quantidadeOriginal - i.quantidade) * i.valorCusto, 0);
};

// ========== PAGAMENTO PARCIAL ==========

export const gerarPagamentoParcial = (
  loteId: string,
  itemIds: string[],
  dadosPagamento: {
    formaPagamento: string;
    contaBancaria?: string;
    nomeRecebedor?: string;
    chavePix?: string;
    observacao?: string;
  },
  pushNota: (nota: NotaAssistencia) => void
): PagamentoParcial | null => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status === 'Concluido') return null;

  const itensSelecionados = lote.itens.filter(i => itemIds.includes(i.id) && i.status === 'Consumido');
  if (itensSelecionados.length === 0) return null;

  // Mudar status dos itens para 'Em Pagamento'
  itensSelecionados.forEach(item => {
    item.status = 'Em Pagamento';
  });

  const valorTotal = itensSelecionados.reduce((acc, i) => {
    const qtdConsumida = i.quantidadeOriginal - i.quantidade || i.quantidadeOriginal;
    return acc + i.valorCusto * qtdConsumida;
  }, 0);

  const notaId = `NOTA-CONS-${String(notaCounterRef++).padStart(3, '0')}`;

  const nota: NotaAssistencia = {
    id: notaId,
    solicitacaoId: loteId,
    fornecedor: lote.fornecedorId,
    lojaSolicitante: itensSelecionados[0]?.lojaAtualId || '',
    dataCriacao: new Date().toISOString(),
    valorTotal,
    status: 'Pendente',
    itens: itensSelecionados.map(i => ({
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

  pushNota(nota);

  const pagamentoId = `PAG-${String(nextPagamentoId++).padStart(3, '0')}`;
  const pagamento: PagamentoParcial = {
    id: pagamentoId,
    data: new Date().toISOString(),
    valor: valorTotal,
    itensIds: itemIds,
    notaFinanceiraId: notaId,
    status: 'Pendente',
  };

  lote.pagamentosParciais.push(pagamento);

  const detalhesForma = dadosPagamento.formaPagamento || 'Não informado';
  const detalhesConta = dadosPagamento.contaBancaria ? ` | Conta: ${dadosPagamento.contaBancaria}` : '';
  const detalhesRecebedor = dadosPagamento.nomeRecebedor ? ` | Recebedor: ${dadosPagamento.nomeRecebedor}` : '';
  const detalhesPix = dadosPagamento.chavePix ? ` | Chave Pix: ${dadosPagamento.chavePix}` : '';

  lote.timeline.push({
    data: new Date().toISOString(),
    tipo: 'pagamento',
    descricao: `Pagamento parcial gerado: ${notaId} - ${itensSelecionados.length} item(ns) - R$ ${valorTotal.toFixed(2)} | Forma: ${detalhesForma}${detalhesConta}${detalhesRecebedor}${detalhesPix}`,
    responsavel: lote.responsavelCadastro,
  });

  // Atualizar status do lote para Aguardando Pagamento
  if (lote.status === 'Aberto' || lote.status === 'Em Acerto') {
    lote.status = 'Aguardando Pagamento';
  }

  return pagamento;
};

export const confirmarPagamentoParcial = (loteId: string, pagamentoId: string, responsavel: string, comprovanteUrl?: string): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote) return false;

  const pagamento = lote.pagamentosParciais.find(p => p.id === pagamentoId);
  if (!pagamento || pagamento.status === 'Pago') return false;

  pagamento.status = 'Pago';
  pagamento.comprovanteUrl = comprovanteUrl;
  pagamento.dataPagamento = new Date().toISOString();

  // Mudar status dos itens vinculados para 'Pago'
  lote.itens.forEach(item => {
    if (pagamento.itensIds.includes(item.id) && item.status === 'Em Pagamento') {
      item.status = 'Pago';
    }
  });

  lote.timeline.push({
    data: new Date().toISOString(),
    tipo: 'pagamento',
    descricao: `Pagamento ${pagamento.notaFinanceiraId} confirmado pelo financeiro - R$ ${pagamento.valor.toFixed(2)}`,
    responsavel,
    comprovanteUrl,
  });

  // Verificar se todos os pagamentos foram pagos
  const todosPagos = lote.pagamentosParciais.every(p => p.status === 'Pago');
  const todosItensFinalizados = lote.itens.every(i => ['Pago', 'Devolvido'].includes(i.status));
  if (todosPagos && todosItensFinalizados) {
    lote.status = 'Concluido';
    lote.timeline.push({
      data: new Date().toISOString(),
      tipo: 'acerto',
      descricao: 'Todos os pagamentos confirmados. Lote concluído automaticamente.',
      responsavel,
    });
  }

  return true;
};

// ========== FINALIZAR LOTE ==========

export const finalizarLote = (
  loteId: string,
  responsavel: string,
  dadosPagamento: {
    formaPagamento: string;
    contaBancaria?: string;
    nomeRecebedor?: string;
    chavePix?: string;
    observacao?: string;
  },
  pushNota: (nota: NotaAssistencia) => void
): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status === 'Concluido') return false;

  const agora = new Date().toISOString();

  // Gerar pagamento parcial final para itens consumidos remanescentes
  const consumidosRemanescentes = lote.itens.filter(i => i.status === 'Consumido');
  if (consumidosRemanescentes.length > 0) {
    gerarPagamentoParcial(loteId, consumidosRemanescentes.map(i => i.id), dadosPagamento, pushNota);
  }

  // Marcar sobras como Devolvido
  lote.itens.filter(i => i.status === 'Disponivel').forEach(item => {
    item.status = 'Devolvido';
    item.dataDevolucao = agora;
    item.devolvidoPor = responsavel;
    if (item.pecaId) {
      updatePeca(item.pecaId, { status: 'Devolvida', quantidade: 0 });
    }
    lote.timeline.push({
      data: agora,
      tipo: 'devolucao',
      descricao: `${item.descricao} (${item.quantidade} un.) devolvido ao fornecedor no fechamento`,
      responsavel,
    });
  });

  // Se há pagamentos pendentes, aguardar pagamento; senão, concluído
  const temPagamentosPendentes = lote.pagamentosParciais.some(p => p.status === 'Pendente');
  lote.status = temPagamentosPendentes ? 'Aguardando Pagamento' : 'Concluido';
  lote.timeline.push({
    data: agora,
    tipo: 'acerto',
    descricao: temPagamentosPendentes 
      ? 'Lote finalizado. Aguardando confirmação de pagamento pelo financeiro.' 
      : 'Lote finalizado e devoluções confirmadas.',
    responsavel,
  });

  return true;
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
  const todosFinalizados = lote.itens.every(i => ['Consumido', 'Devolvido', 'Em Pagamento', 'Pago'].includes(i.status));
  if (todosFinalizados && lote.status === 'Aberto') {
    lote.status = 'Devolvido';
  }

  return true;
};

// ========== FINANCEIRO (legado) ==========

export const gerarLoteFinanceiro = (loteId: string, dadosPagamento?: {
  formaPagamento: string;
  contaBancaria?: string;
  nomeRecebedor?: string;
  chavePix?: string;
  observacao?: string;
}): NotaAssistencia | null => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote) return null;

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

// Confirmar pagamento por notaFinanceiraId (chamado pelo Financeiro)
export const confirmarPagamentoPorNotaId = (
  loteId: string, notaFinanceiraId: string, responsavel: string, comprovanteUrl?: string
): boolean => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote) return false;

  const pagamento = lote.pagamentosParciais.find(p => p.notaFinanceiraId === notaFinanceiraId);
  if (!pagamento || pagamento.status === 'Pago') return false;

  return confirmarPagamentoParcial(loteId, pagamento.id, responsavel, comprovanteUrl);
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

// ========== EDITAR LOTE ==========

export interface EditarLoteInput {
  fornecedorId?: string;
  itens?: {
    id: string;
    descricao: string;
    modelo: string;
    quantidade: number;
    valorCusto: number;
    lojaDestinoId: string;
  }[];
  novosItens?: {
    descricao: string;
    modelo: string;
    quantidade: number;
    valorCusto: number;
    lojaDestinoId: string;
  }[];
  itensRemovidos?: string[];
}

export const editarLoteConsignacao = (loteId: string, dados: EditarLoteInput, responsavel: string): LoteConsignacao | null => {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Aberto') return null;

  const alteracoes: string[] = [];

  // Editar fornecedor
  if (dados.fornecedorId && dados.fornecedorId !== lote.fornecedorId) {
    alteracoes.push(`Fornecedor alterado`);
    lote.fornecedorId = dados.fornecedorId;
  }

  // Remover itens
  if (dados.itensRemovidos && dados.itensRemovidos.length > 0) {
    dados.itensRemovidos.forEach(itemId => {
      const item = lote.itens.find(i => i.id === itemId);
      if (item && item.status === 'Disponivel') {
        // Remover peça do estoque
        if (item.pecaId) {
          deletePeca(item.pecaId);
        }
        alteracoes.push(`Item removido: ${item.descricao}`);
      }
    });
    lote.itens = lote.itens.filter(i => !dados.itensRemovidos!.includes(i.id));
  }

  // Editar itens existentes
  if (dados.itens) {
    dados.itens.forEach(editItem => {
      const item = lote.itens.find(i => i.id === editItem.id);
      if (!item || item.status !== 'Disponivel') return;

      const changes: string[] = [];
      if (item.descricao !== editItem.descricao) changes.push(`desc: ${item.descricao} → ${editItem.descricao}`);
      if (item.modelo !== editItem.modelo) changes.push(`modelo: ${item.modelo} → ${editItem.modelo}`);
      if (item.quantidade !== editItem.quantidade) changes.push(`qtd: ${item.quantidade} → ${editItem.quantidade}`);
      if (item.valorCusto !== editItem.valorCusto) changes.push(`valor: R$${item.valorCusto} → R$${editItem.valorCusto}`);
      if (item.lojaAtualId !== editItem.lojaDestinoId) changes.push(`loja alterada`);

      item.descricao = editItem.descricao;
      item.modelo = editItem.modelo;
      item.quantidade = editItem.quantidade;
      item.quantidadeOriginal = editItem.quantidade;
      item.valorCusto = editItem.valorCusto;
      item.lojaAtualId = editItem.lojaDestinoId;

      // Atualizar peça no estoque
      if (item.pecaId) {
        updatePeca(item.pecaId, {
          descricao: editItem.descricao,
          modelo: editItem.modelo,
          quantidade: editItem.quantidade,
          valorCusto: editItem.valorCusto,
          lojaId: editItem.lojaDestinoId,
        });
      }

      if (changes.length > 0) {
        alteracoes.push(`${editItem.descricao}: ${changes.join(', ')}`);
      }
    });
  }

  // Adicionar novos itens
  if (dados.novosItens && dados.novosItens.length > 0) {
    dados.novosItens.forEach(novoItem => {
      const pecaCriada = addPeca({
        descricao: novoItem.descricao,
        lojaId: novoItem.lojaDestinoId,
        modelo: novoItem.modelo,
        valorCusto: novoItem.valorCusto,
        valorRecomendado: novoItem.valorCusto * 1.5,
        quantidade: novoItem.quantidade,
        dataEntrada: new Date().toISOString(),
        origem: 'Consignacao',
        status: 'Disponível',
        loteConsignacaoId: loteId,
      });

      const itemId = `CONS-ITEM-${String(nextItemId++).padStart(3, '0')}`;
      lote.itens.push({
        id: itemId,
        pecaId: pecaCriada.id,
        descricao: novoItem.descricao,
        modelo: novoItem.modelo,
        quantidade: novoItem.quantidade,
        quantidadeOriginal: novoItem.quantidade,
        valorCusto: novoItem.valorCusto,
        lojaAtualId: novoItem.lojaDestinoId,
        status: 'Disponivel',
      });
      alteracoes.push(`Novo item: ${novoItem.descricao} (${novoItem.quantidade} un.)`);
    });
  }

  if (alteracoes.length > 0) {
    lote.timeline.push({
      data: new Date().toISOString(),
      tipo: 'entrada',
      descricao: `Lote editado: ${alteracoes.join('; ')}`,
      responsavel,
    });
  }

  return lote;
};
