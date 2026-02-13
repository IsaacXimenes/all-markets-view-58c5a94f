// API para Retirada de Peças

import { Produto, getProdutoById, updateProduto } from './estoqueApi';
import { getProdutoPendenteById, updateProdutoPendente } from './osApi';
import { addPeca } from './pecasApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { addNotification } from './notificationsApi';

// ============= INTERFACES =============

export type RetiradaPecasStatus = 
  | 'Pendente Assistência' 
  | 'Em Desmonte' 
  | 'Concluída' 
  | 'Cancelada';

export interface PecaRetiradaItem {
  id: string;
  marca: string;
  nome: string;
  valorCustoPeca: number;
  quantidade: number;
}

export interface RetiradaPecasTimeline {
  id: string;
  dataHora: string;
  tipo: 'solicitacao_retirada_pecas' | 'desmonte_iniciado' | 'pecas_geradas' | 'desmonte_finalizado' | 'desmonte_cancelado';
  titulo: string;
  descricao: string;
  responsavel: string;
}

export interface LogAuditoriaRetirada {
  id: string;
  dataHora: string;
  usuario: string;
  detalhes: string;
  tipoAlteracao: 'criacao' | 'inicio_desmonte' | 'adicionar_peca' | 'remover_peca' | 'finalizar' | 'cancelar' | 'edicao';
}

export interface RetiradaPecas {
  id: string;
  aparelhoId: string;
  imeiOriginal: string;
  modeloOriginal: string;
  corOriginal: string;
  valorCustoAparelho: number;
  motivo: string;
  responsavelSolicitacao: string;
  dataSolicitacao: string;
  status: RetiradaPecasStatus;
  tecnicoResponsavel?: string;
  dataInicioDesmonte?: string;
  dataConclusao?: string;
  pecasRetiradas: PecaRetiradaItem[];
  timeline: RetiradaPecasTimeline[];
  lojaId: string;
  logsAuditoria: LogAuditoriaRetirada[];
}

// ============= DADOS MOCKADOS =============

let retiradasPecas: RetiradaPecas[] = [];
let retiradaIdCounter = 1;

// ============= FUNÇÕES DE API =============

// Gerar ID único para retirada
const generateRetiradaId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const id = `RET-${year}-${String(retiradaIdCounter++).padStart(4, '0')}`;
  return id;
};

// Gerar ID único para item de peça
const generatePecaItemId = (): string => {
  return `PECA-RET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Obter todas as retiradas de peças
export const getRetiradasPecas = (): RetiradaPecas[] => {
  return [...retiradasPecas].sort((a, b) => 
    new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime()
  );
};

// Obter retiradas pendentes (para Assistência)
export const getRetiradasPecasPendentes = (): RetiradaPecas[] => {
  return retiradasPecas.filter(r => 
    r.status === 'Pendente Assistência' || r.status === 'Em Desmonte'
  ).sort((a, b) => 
    new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime()
  );
};

// Obter retirada por ID
export const getRetiradaPecasById = (id: string): RetiradaPecas | null => {
  return retiradasPecas.find(r => r.id === id) || null;
};

// Obter retirada por aparelho ID
export const getRetiradaPecasByAparelhoId = (aparelhoId: string): RetiradaPecas | null => {
  return retiradasPecas.find(r => r.aparelhoId === aparelhoId && r.status !== 'Cancelada') || null;
};

// Solicitar retirada de peças (chamada pelo Estoque)
export const solicitarRetiradaPecas = (
  aparelhoId: string,
  motivo: string,
  responsavel: string
): { sucesso: boolean; mensagem: string; retirada?: RetiradaPecas } => {
  const produto = getProdutoById(aparelhoId);
  const produtoPendente = !produto ? getProdutoPendenteById(aparelhoId) : null;
  
  if (!produto && !produtoPendente) {
    return { sucesso: false, mensagem: 'Aparelho não encontrado' };
  }
  
  // Verificar se já existe retirada ativa para este aparelho
  const retiradaExistente = retiradasPecas.find(
    r => r.aparelhoId === aparelhoId && r.status !== 'Cancelada' && r.status !== 'Concluída'
  );
  
  if (retiradaExistente) {
    return { sucesso: false, mensagem: 'Já existe uma solicitação de retirada ativa para este aparelho' };
  }
  
  const agora = new Date().toISOString();
  
  // Dados do aparelho (estoque principal ou pendente)
  const imei = produto?.imei || produtoPendente!.imei;
  const modelo = produto?.modelo || produtoPendente!.modelo;
  const cor = produto?.cor || produtoPendente!.cor;
  const valorCusto = produto?.valorCusto || produtoPendente!.valorCusto;
  const loja = produto?.loja || produtoPendente!.loja;
  
  const novaRetirada: RetiradaPecas = {
    id: generateRetiradaId(),
    aparelhoId,
    imeiOriginal: imei,
    modeloOriginal: modelo,
    corOriginal: cor,
    valorCustoAparelho: valorCusto,
    motivo,
    responsavelSolicitacao: responsavel,
    dataSolicitacao: agora,
    status: 'Pendente Assistência',
    pecasRetiradas: [],
    logsAuditoria: [],
    timeline: [{
      id: `TL-RET-${Date.now()}`,
      dataHora: agora,
      tipo: 'solicitacao_retirada_pecas',
      titulo: 'Solicitação de Retirada de Peças',
      descricao: `Solicitação criada por ${responsavel}. Motivo: ${motivo}`,
      responsavel
    }],
    lojaId: loja
  };
  
  // Adicionar log de auditoria na criação
  novaRetirada.logsAuditoria = [{
    id: `LOG-RET-${Date.now()}`,
    dataHora: agora,
    usuario: responsavel,
    detalhes: `Solicitação de retirada criada. Motivo: ${motivo}`,
    tipoAlteracao: 'criacao'
  }];

  retiradasPecas.push(novaRetirada);
  
  if (produto) {
    // Atualizar status do produto no estoque principal
    updateProduto(aparelhoId, {
      statusRetiradaPecas: 'Pendente Assistência',
      retiradaPecasId: novaRetirada.id
    });
    
    if (!produto.timeline) produto.timeline = [];
    produto.timeline.unshift({
      id: `TL-PROD-${Date.now()}-ret`,
      data: agora,
      tipo: 'entrada',
      titulo: 'Retirada de Peças Solicitada',
      descricao: `Aparelho enviado para desmonte. Motivo: ${motivo}`,
      responsavel
    });
  } else if (produtoPendente) {
    // Atualizar status do produto pendente
    updateProdutoPendente(aparelhoId, {
      statusGeral: 'Retirada de Peças'
    });
    
    produtoPendente.timeline.unshift({
      id: `TL-PROD-${Date.now()}-ret`,
      data: agora,
      tipo: 'entrada',
      titulo: 'Retirada de Peças Solicitada',
      descricao: `Aparelho pendente enviado para desmonte. Motivo: ${motivo}`,
      responsavel
    });
  }
  
  // Notificar Assistência sobre nova demanda
  addNotification({
    type: 'retirada_pecas',
    title: 'Nova Solicitação de Retirada de Peças',
    description: `Aparelho IMEI ${imei} (${modelo}) aguardando desmonte. Motivo: ${motivo}`,
    targetUsers: []
  });
  
  return { 
    sucesso: true, 
    mensagem: 'Solicitação de retirada de peças criada com sucesso', 
    retirada: novaRetirada 
  };
};

// Iniciar desmonte (chamada pela Assistência)
export const iniciarDesmonte = (
  retiradaId: string,
  tecnicoResponsavel: string
): { sucesso: boolean; mensagem: string; retirada?: RetiradaPecas } => {
  const retirada = retiradasPecas.find(r => r.id === retiradaId);
  
  if (!retirada) {
    return { sucesso: false, mensagem: 'Solicitação não encontrada' };
  }
  
  if (retirada.status !== 'Pendente Assistência') {
    return { sucesso: false, mensagem: 'Status inválido para iniciar desmonte' };
  }
  
  const agora = new Date().toISOString();
  
  retirada.status = 'Em Desmonte';
  retirada.tecnicoResponsavel = tecnicoResponsavel;
  retirada.dataInicioDesmonte = agora;
  
  retirada.timeline.unshift({
    id: `TL-RET-${Date.now()}-inicio`,
    dataHora: agora,
    tipo: 'desmonte_iniciado',
    titulo: 'Desmonte Iniciado',
    descricao: `Desmonte iniciado pelo técnico ${tecnicoResponsavel}`,
    responsavel: tecnicoResponsavel
  });

  // Log de auditoria
  if (!retirada.logsAuditoria) retirada.logsAuditoria = [];
  retirada.logsAuditoria.push({
    id: `LOG-RET-${Date.now()}-inicio`,
    dataHora: agora,
    usuario: tecnicoResponsavel,
    detalhes: `Desmonte iniciado`,
    tipoAlteracao: 'inicio_desmonte'
  });
  const produto = getProdutoById(retirada.aparelhoId);
  if (produto) {
    updateProduto(retirada.aparelhoId, {
      statusRetiradaPecas: 'Em Desmonte'
    });
    
    if (produto.timeline) {
      produto.timeline.unshift({
        id: `TL-PROD-${Date.now()}-desmonte`,
        data: agora,
        tipo: 'parecer_assistencia',
        titulo: 'Desmonte Iniciado',
        descricao: `Técnico ${tecnicoResponsavel} iniciou o desmonte do aparelho`,
        responsavel: tecnicoResponsavel
      });
    }
  }
  
  // Notificar Estoque sobre início do desmonte
  addNotification({
    type: 'retirada_pecas',
    title: 'Desmonte Iniciado',
    description: `Técnico ${tecnicoResponsavel} iniciou o desmonte do aparelho IMEI ${retirada.imeiOriginal}`,
    targetUsers: []
  });
  
  return { sucesso: true, mensagem: 'Desmonte iniciado com sucesso', retirada };
};

// Adicionar peça à lista de peças retiradas
export const adicionarPecaRetirada = (
  retiradaId: string,
  peca: Omit<PecaRetiradaItem, 'id'>
): { sucesso: boolean; mensagem: string; retirada?: RetiradaPecas } => {
  const retirada = retiradasPecas.find(r => r.id === retiradaId);
  
  if (!retirada) {
    return { sucesso: false, mensagem: 'Solicitação não encontrada' };
  }
  
  if (retirada.status !== 'Pendente Assistência' && retirada.status !== 'Em Desmonte') {
    return { sucesso: false, mensagem: 'Não é possível adicionar peças neste status' };
  }
  
  const novaPeca: PecaRetiradaItem = {
    ...peca,
    id: generatePecaItemId()
  };
  
  retirada.pecasRetiradas.push(novaPeca);

  // Log de auditoria
  if (!retirada.logsAuditoria) retirada.logsAuditoria = [];
  retirada.logsAuditoria.push({
    id: `LOG-RET-${Date.now()}-add`,
    dataHora: new Date().toISOString(),
    usuario: 'Usuário Sistema',
    detalhes: `Peça adicionada: ${peca.nome} (${peca.quantidade}x ${peca.valorCustoPeca.toFixed(2)})`,
    tipoAlteracao: 'adicionar_peca'
  });

  return { sucesso: true, mensagem: 'Peça adicionada com sucesso', retirada };
};

// Remover peça da lista
export const removerPecaRetirada = (
  retiradaId: string,
  pecaId: string
): { sucesso: boolean; mensagem: string; retirada?: RetiradaPecas } => {
  const retirada = retiradasPecas.find(r => r.id === retiradaId);
  
  if (!retirada) {
    return { sucesso: false, mensagem: 'Solicitação não encontrada' };
  }
  
  if (retirada.status !== 'Pendente Assistência' && retirada.status !== 'Em Desmonte') {
    return { sucesso: false, mensagem: 'Não é possível remover peças neste status' };
  }
  
  const pecaRemovida = retirada.pecasRetiradas.find(p => p.id === pecaId);
  retirada.pecasRetiradas = retirada.pecasRetiradas.filter(p => p.id !== pecaId);

  // Log de auditoria
  if (!retirada.logsAuditoria) retirada.logsAuditoria = [];
  retirada.logsAuditoria.push({
    id: `LOG-RET-${Date.now()}-rem`,
    dataHora: new Date().toISOString(),
    usuario: 'Usuário Sistema',
    detalhes: `Peça removida: ${pecaRemovida?.nome || pecaId}`,
    tipoAlteracao: 'remover_peca'
  });

  return { sucesso: true, mensagem: 'Peça removida com sucesso', retirada };
};

// Calcular soma das peças
export const calcularSomaPecas = (retiradaId: string): number => {
  const retirada = retiradasPecas.find(r => r.id === retiradaId);
  if (!retirada) return 0;
  
  return retirada.pecasRetiradas.reduce(
    (acc, peca) => acc + (peca.valorCustoPeca * peca.quantidade), 
    0
  );
};

// Validar se soma das peças cobre o custo do aparelho
export const validarCustoRetirada = (retiradaId: string): { 
  valido: boolean; 
  somaPecas: number; 
  custoAparelho: number; 
  diferenca: number 
} => {
  const retirada = retiradasPecas.find(r => r.id === retiradaId);
  if (!retirada) {
    return { valido: false, somaPecas: 0, custoAparelho: 0, diferenca: 0 };
  }
  
  const somaPecas = calcularSomaPecas(retiradaId);
  const custoAparelho = retirada.valorCustoAparelho;
  const diferenca = somaPecas - custoAparelho;
  
  return {
    valido: somaPecas >= custoAparelho,
    somaPecas,
    custoAparelho,
    diferenca
  };
};

// Finalizar desmonte (chamada pela Assistência)
export const finalizarDesmonte = (
  retiradaId: string,
  tecnicoResponsavel: string,
  lojaDestinoId: string
): { sucesso: boolean; mensagem: string; retirada?: RetiradaPecas; pecasGeradas?: number } => {
  const retirada = retiradasPecas.find(r => r.id === retiradaId);
  
  if (!retirada) {
    return { sucesso: false, mensagem: 'Solicitação não encontrada' };
  }
  
  if (retirada.status !== 'Em Desmonte') {
    return { sucesso: false, mensagem: 'O desmonte precisa ser iniciado primeiro' };
  }
  
  if (retirada.pecasRetiradas.length === 0) {
    return { sucesso: false, mensagem: 'Adicione pelo menos uma peça antes de finalizar' };
  }
  
  // Calcular custo (informativo, não bloqueia)
  const validacao = validarCustoRetirada(retiradaId);
  
  const agora = new Date().toISOString();
  
  // Criar peças no estoque da assistência
  let pecasGeradas = 0;
  for (const peca of retirada.pecasRetiradas) {
    addPeca({
      descricao: peca.nome,
      lojaId: lojaDestinoId,
      modelo: retirada.modeloOriginal,
      valorCusto: peca.valorCustoPeca,
      valorRecomendado: peca.valorCustoPeca * 1.5, // Markup padrão de 50%
      quantidade: peca.quantidade,
      dataEntrada: agora,
      origem: 'Retirada de Peça',
      status: 'Disponível'
    });
    pecasGeradas += peca.quantidade;
  }
  
  // Adicionar evento de peças geradas na timeline
  retirada.timeline.unshift({
    id: `TL-RET-${Date.now()}-pecas`,
    dataHora: agora,
    tipo: 'pecas_geradas',
    titulo: 'Peças Geradas',
    descricao: `${pecasGeradas} peça(s) adicionada(s) ao estoque da assistência`,
    responsavel: tecnicoResponsavel
  });
  
  // Finalizar retirada
  retirada.status = 'Concluída';
  retirada.dataConclusao = agora;

  // Log de auditoria
  if (!retirada.logsAuditoria) retirada.logsAuditoria = [];
  retirada.logsAuditoria.push({
    id: `LOG-RET-${Date.now()}-final`,
    dataHora: agora,
    usuario: tecnicoResponsavel,
    detalhes: `Desmonte finalizado. ${retirada.pecasRetiradas.length} peça(s) gerada(s). Valor total: R$ ${validacao.somaPecas.toFixed(2)}`,
    tipoAlteracao: 'finalizar'
  });
  
  retirada.timeline.unshift({
    id: `TL-RET-${Date.now()}-final`,
    dataHora: agora,
    tipo: 'desmonte_finalizado',
    titulo: 'Desmonte Finalizado',
    descricao: `Desmonte concluído. ${pecasGeradas} peça(s) gerada(s) no valor total de R$ ${validacao.somaPecas.toFixed(2)}`,
    responsavel: tecnicoResponsavel
  });
  
  // Atualizar produto original - marcar como desmontado
  const produto = getProdutoById(retirada.aparelhoId);
  if (produto) {
    updateProduto(retirada.aparelhoId, {
      statusNota: 'Concluído',
      quantidade: 0, // Zerar quantidade pois foi desmontado
      statusRetiradaPecas: 'Concluída'
    });
    
    if (produto.timeline) {
      produto.timeline.unshift({
        id: `TL-PROD-${Date.now()}-desmontado`,
        data: agora,
        tipo: 'liberacao',
        titulo: 'Aparelho Desmontado',
        descricao: `Aparelho desmontado. ${pecasGeradas} peça(s) gerada(s) para estoque.`,
        responsavel: tecnicoResponsavel
      });
    }
  }
  
  // Notificar Estoque sobre conclusão do desmonte
  addNotification({
    type: 'retirada_pecas',
    title: 'Desmonte Finalizado',
    description: `Aparelho IMEI ${retirada.imeiOriginal} desmontado. ${pecasGeradas} peça(s) gerada(s) e adicionadas ao estoque da assistência.`,
    targetUsers: []
  });
  
  return { 
    sucesso: true, 
    mensagem: 'Desmonte finalizado com sucesso', 
    retirada,
    pecasGeradas 
  };
};

// Cancelar retirada de peças
export const cancelarRetiradaPecas = (
  retiradaId: string,
  responsavel: string,
  motivo: string
): { sucesso: boolean; mensagem: string; retirada?: RetiradaPecas } => {
  const retirada = retiradasPecas.find(r => r.id === retiradaId);
  
  if (!retirada) {
    return { sucesso: false, mensagem: 'Solicitação não encontrada' };
  }
  
  if (retirada.status === 'Concluída') {
    return { sucesso: false, mensagem: 'Não é possível cancelar uma retirada já concluída' };
  }
  
  if (retirada.status === 'Cancelada') {
    return { sucesso: false, mensagem: 'Esta retirada já foi cancelada' };
  }
  
  const agora = new Date().toISOString();
  
  retirada.status = 'Cancelada';

  // Log de auditoria
  if (!retirada.logsAuditoria) retirada.logsAuditoria = [];
  retirada.logsAuditoria.push({
    id: `LOG-RET-${Date.now()}-cancel`,
    dataHora: agora,
    usuario: responsavel,
    detalhes: `Retirada cancelada. Motivo: ${motivo}`,
    tipoAlteracao: 'cancelar'
  });
  
  retirada.timeline.unshift({
    id: `TL-RET-${Date.now()}-cancel`,
    dataHora: agora,
    tipo: 'desmonte_cancelado',
    titulo: 'Retirada Cancelada',
    descricao: `Cancelada por ${responsavel}. Motivo: ${motivo}`,
    responsavel
  });
  
  // Reativar o produto no estoque
  const produto = getProdutoById(retirada.aparelhoId);
  if (produto) {
    updateProduto(retirada.aparelhoId, {
      statusNota: 'Concluído',
      statusRetiradaPecas: null,
      retiradaPecasId: undefined
    });
    
    if (produto.timeline) {
      produto.timeline.unshift({
        id: `TL-PROD-${Date.now()}-reativado`,
        data: agora,
        tipo: 'liberacao',
        titulo: 'Aparelho Reativado',
        descricao: `Retirada de peças cancelada. Aparelho disponível novamente no estoque.`,
        responsavel
      });
    }
  }
  
  return { sucesso: true, mensagem: 'Retirada cancelada com sucesso. Aparelho reativado.', retirada };
};

// Verificar se aparelho está disponível para retirada de peças
export const verificarDisponibilidadeRetirada = (aparelhoId: string): {
  disponivel: boolean;
  motivo?: string;
} => {
  const produto = getProdutoById(aparelhoId);
  
  if (produto) {
    // Verificar se está bloqueado em venda
    if (produto.bloqueadoEmVendaId) {
      return { disponivel: false, motivo: 'Aparelho está bloqueado em uma venda' };
    }
    
    // Verificar se está em movimentação
    if (produto.statusMovimentacao === 'Em movimentação') {
      return { disponivel: false, motivo: 'Aparelho está em movimentação' };
    }
    
    // Verificar se já tem retirada ativa
    const retiradaAtiva = retiradasPecas.find(
      r => r.aparelhoId === aparelhoId && r.status !== 'Cancelada' && r.status !== 'Concluída'
    );
    
    if (retiradaAtiva) {
      return { disponivel: false, motivo: 'Já existe uma solicitação de retirada ativa para este aparelho' };
    }
    
    // Verificar se quantidade é maior que 0
    if (produto.quantidade <= 0) {
      return { disponivel: false, motivo: 'Aparelho sem quantidade disponível' };
    }
    
    return { disponivel: true };
  }
  
  // Buscar em produtos pendentes
  const produtoPendente = getProdutoPendenteById(aparelhoId);
  
  if (produtoPendente) {
    // Verificar se já tem retirada ativa
    const retiradaAtiva = retiradasPecas.find(
      r => r.aparelhoId === aparelhoId && r.status !== 'Cancelada' && r.status !== 'Concluída'
    );
    
    if (retiradaAtiva) {
      return { disponivel: false, motivo: 'Já existe uma solicitação de retirada ativa para este aparelho' };
    }
    
    return { disponivel: true };
  }
  
  return { disponivel: false, motivo: 'Aparelho não encontrado' };
};

// Estatísticas de retiradas
export const getEstatisticasRetiradas = (): {
  pendentes: number;
  emDesmonte: number;
  concluidas: number;
  canceladas: number;
  valorTotalPecasGeradas: number;
} => {
  const pendentes = retiradasPecas.filter(r => r.status === 'Pendente Assistência').length;
  const emDesmonte = retiradasPecas.filter(r => r.status === 'Em Desmonte').length;
  const concluidas = retiradasPecas.filter(r => r.status === 'Concluída').length;
  const canceladas = retiradasPecas.filter(r => r.status === 'Cancelada').length;
  
  const valorTotalPecasGeradas = retiradasPecas
    .filter(r => r.status === 'Concluída')
    .reduce((acc, r) => acc + calcularSomaPecas(r.id), 0);
  
  return {
    pendentes,
    emDesmonte,
    concluidas,
    canceladas,
    valorTotalPecasGeradas
  };
};
