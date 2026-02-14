// ============= API para Fluxo de Notas de Entrada de Produtos =============
// Esta API implementa a máquina de estados completa para o fluxo de notas
// CONCEITO: Lançamento Inicial (nota sem produtos) → Atuação Atual governa o fluxo

import { addNotification } from './notificationsApi';
import { migrarAparelhoNovoParaEstoque, ProdutoNota, ESTOQUE_SIA_LOJA_ID } from './estoqueApi';
import { migrarProdutosNotaParaPendentes } from './osApi';

// ============= TIPOS E INTERFACES =============

// 10 Status obrigatórios da nota
export type NotaEntradaStatus = 
  | 'Criada'
  | 'Aguardando Pagamento Inicial'
  | 'Pagamento Parcial Realizado'
  | 'Pagamento Concluido'
  | 'Aguardando Conferencia'
  | 'Conferencia Parcial'
  | 'Conferencia Concluida'
  | 'Aguardando Pagamento Final'
  | 'Com Divergencia'
  | 'Finalizada';

// Tipo de pagamento (imutável após primeiro pagamento)
// Novos nomes conforme especificação
export type TipoPagamentoNota = 'Pagamento Pos' | 'Pagamento Parcial' | 'Pagamento 100% Antecipado';

// Atuação Atual - indica qual área tem ação pendente
export type AtuacaoAtual = 'Estoque' | 'Financeiro' | 'Encerrado';

// Perfil do usuário para timeline
export type PerfilUsuario = 'Estoque' | 'Financeiro' | 'Sistema';

// Interface de produto na nota
export interface ProdutoNotaEntrada {
  id: string;
  tipoProduto: 'Aparelho' | 'Acessorio';
  marca: string;
  modelo: string;
  // Campos habilitados APENAS após recebimento
  imei?: string;
  cor?: string;
  categoria?: 'Novo' | 'Seminovo';
  capacidade?: '64 GB' | '128 GB' | '256 GB' | '512 GB' | '1 TB';
  percentualBateria?: number;
  // Campos preenchíveis antes do recebimento
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  // Status do produto
  statusRecebimento: 'Pendente' | 'Recebido';
  statusConferencia: 'Pendente' | 'Conferido';
  dataRecebimento?: string;
  dataConferencia?: string;
  responsavelConferencia?: string;
}

// Interface de entrada da timeline (imutável)
export interface TimelineNotaEntrada {
  id: string;
  dataHora: string;
  usuario: string;
  perfil: PerfilUsuario;
  acao: string;
  statusAnterior: NotaEntradaStatus;
  statusNovo: NotaEntradaStatus;
  impactoFinanceiro?: number;
  detalhes?: string;
}

// Interface de alerta automático
export interface AlertaNota {
  id: string;
  tipo: 'divergencia_valor' | 'conferencia_parcial_longa' | 'qtd_excedida' | 'imei_ausente' | 'status_critico';
  mensagem: string;
  dataGeracao: string;
  visto: boolean;
  resolvido: boolean;
}

// Interface principal da Nota de Entrada
export interface NotaEntrada {
  id: string;
  numeroNota: string;
  data: string;
  fornecedor: string;
  
  // Sistema de status
  status: NotaEntradaStatus;
  
  // Atuação Atual - controlado exclusivamente pelo sistema
  atuacaoAtual: AtuacaoAtual;
  
  // Tipo de pagamento
  tipoPagamento: TipoPagamentoNota;
  tipoPagamentoBloqueado: boolean;
  
  // Quantidades
  qtdInformada: number;          // Quantidade de aparelhos informada na nota
  qtdCadastrada: number;         // Quantidade de produtos cadastrados
  qtdConferida: number;          // Quantidade de produtos conferidos
  
  // Valores
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  valorConferido: number;
  
  // Produtos
  produtos: ProdutoNotaEntrada[];
  
  // Timeline imutável
  timeline: TimelineNotaEntrada[];
  
  // Alertas
  alertas: AlertaNota[];
  
  // Pagamento
  pagamentos: {
    data: string;
    valor: number;
    formaPagamento: string;
    contaPagamento?: string;
    comprovante?: string;
    responsavel: string;
    tipo: 'inicial' | 'parcial' | 'final';
  }[];
  
  // Metadados
  dataCriacao: string;
  dataFinalizacao?: string;
  responsavelCriacao: string;
  responsavelFinalizacao?: string;
  observacoes?: string;
  
  // Forma de pagamento preferida (informativo)
  formaPagamento?: 'Dinheiro' | 'Pix';
  
  // Flag de urgência
  urgente?: boolean;
}

// ============= ARMAZENAMENTO =============

let notasEntrada: NotaEntrada[] = [];
let proximoSequencial = 1; // Contador único para auto-incremento

// Função para gerar número de nota auto-incremental
export const gerarNumeroNotaAutoIncremental = (): string => {
  const ano = new Date().getFullYear();
  const sequencial = String(proximoSequencial).padStart(5, '0');
  proximoSequencial++;
  return `NE-${ano}-${sequencial}`;
};

// ============= MÁQUINA DE ESTADOS - TRANSIÇÕES VÁLIDAS =============

const transicoesValidas: Record<NotaEntradaStatus, NotaEntradaStatus[]> = {
  'Criada': ['Aguardando Pagamento Inicial', 'Aguardando Conferencia'],
  'Aguardando Pagamento Inicial': ['Pagamento Parcial Realizado', 'Pagamento Concluido'],
  'Pagamento Parcial Realizado': ['Aguardando Conferencia'],
  'Pagamento Concluido': ['Aguardando Conferencia'],
  'Aguardando Conferencia': ['Conferencia Parcial'],
  'Conferencia Parcial': ['Conferencia Parcial', 'Conferencia Concluida', 'Com Divergencia'],
  'Conferencia Concluida': ['Aguardando Pagamento Final', 'Finalizada'],
  'Aguardando Pagamento Final': ['Finalizada'],
  'Com Divergencia': ['Aguardando Pagamento Final', 'Finalizada'],
  'Finalizada': []
};

// Verificar se transição é válida
export const podeTransicionar = (statusAtual: NotaEntradaStatus, statusNovo: NotaEntradaStatus): boolean => {
  return transicoesValidas[statusAtual]?.includes(statusNovo) || false;
};

// ============= FUNÇÕES DE TIMELINE (IMUTÁVEL) =============

export const registrarTimeline = (
  nota: NotaEntrada,
  usuario: string,
  perfil: PerfilUsuario,
  acao: string,
  statusNovo: NotaEntradaStatus,
  impactoFinanceiro?: number,
  detalhes?: string
): void => {
  const entry: TimelineNotaEntrada = {
    id: `TL-${nota.id}-${String(nota.timeline.length + 1).padStart(4, '0')}`,
    dataHora: new Date().toISOString(),
    usuario,
    perfil,
    acao,
    statusAnterior: nota.status,
    statusNovo,
    impactoFinanceiro,
    detalhes
  };
  nota.timeline.push(entry);
  // Timeline NUNCA pode ser editada ou removida
};

// ============= FUNÇÕES DE ALERTA =============

export const verificarAlertasNota = (nota: NotaEntrada): AlertaNota[] => {
  const alertasNovos: AlertaNota[] = [];
  const agora = new Date();
  
  // 1. Divergência de valor
  if (nota.valorPago > 0 && nota.valorConferido > 0) {
    const tolerancia = nota.valorTotal * 0.0001; // 0,01%
    if (Math.abs(nota.valorPago - nota.valorConferido) > tolerancia) {
      alertasNovos.push({
        id: `ALERTA-${nota.id}-DIV-${Date.now()}`,
        tipo: 'divergencia_valor',
        mensagem: `Divergência: pago R$ ${nota.valorPago.toFixed(2)}, conferido R$ ${nota.valorConferido.toFixed(2)}`,
        dataGeracao: agora.toISOString(),
        visto: false,
        resolvido: false
      });
    }
  }
  
  // 2. Conferência parcial por muitos dias
  if (nota.status === 'Conferencia Parcial') {
    const ultimaConferencia = nota.produtos
      .filter(p => p.dataConferencia)
      .map(p => new Date(p.dataConferencia!))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    
    if (ultimaConferencia) {
      const diasParado = Math.ceil((agora.getTime() - ultimaConferencia.getTime()) / (1000 * 60 * 60 * 24));
      if (diasParado >= 5) {
        alertasNovos.push({
          id: `ALERTA-${nota.id}-CONF-${Date.now()}`,
          tipo: 'conferencia_parcial_longa',
          mensagem: `Nota parada há ${diasParado} dias em conferência parcial`,
          dataGeracao: agora.toISOString(),
          visto: false,
          resolvido: false
        });
      }
    }
  }
  
  // 3. Quantidade excedida
  if (nota.qtdCadastrada > nota.qtdInformada && nota.qtdInformada > 0) {
    alertasNovos.push({
      id: `ALERTA-${nota.id}-QTD-${Date.now()}`,
      tipo: 'qtd_excedida',
      mensagem: `Quantidade de produtos (${nota.qtdCadastrada}) excede o informado (${nota.qtdInformada})`,
      dataGeracao: agora.toISOString(),
      visto: false,
      resolvido: false
    });
  }
  
  // 4. IMEI ausente após recebimento (para Aparelhos)
  const aparelhosSemIMEI = nota.produtos.filter(
    p => p.tipoProduto === 'Aparelho' && p.statusRecebimento === 'Recebido' && !p.imei
  );
  if (aparelhosSemIMEI.length > 0) {
    alertasNovos.push({
      id: `ALERTA-${nota.id}-IMEI-${Date.now()}`,
      tipo: 'imei_ausente',
      mensagem: `${aparelhosSemIMEI.length} aparelho(s) recebido(s) aguardando IMEI`,
      dataGeracao: agora.toISOString(),
      visto: false,
      resolvido: false
    });
  }
  
  // 5. Status crítico por muitos dias
  const statusCriticos: NotaEntradaStatus[] = ['Aguardando Pagamento Inicial', 'Aguardando Pagamento Final', 'Com Divergencia'];
  if (statusCriticos.includes(nota.status)) {
    const dataCriacao = new Date(nota.dataCriacao);
    const diasNoStatus = Math.ceil((agora.getTime() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24));
    if (diasNoStatus >= 3) {
      alertasNovos.push({
        id: `ALERTA-${nota.id}-CRIT-${Date.now()}`,
        tipo: 'status_critico',
        mensagem: `Nota parada há ${diasNoStatus} dias em status crítico: ${nota.status}`,
        dataGeracao: agora.toISOString(),
        visto: false,
        resolvido: false
      });
    }
  }
  
  return alertasNovos;
};

// ============= FUNÇÕES DE ATUAÇÃO AUTOMÁTICA =============

// Definir atuação inicial baseada no tipo de pagamento
export const definirAtuacaoInicial = (tipoPagamento: TipoPagamentoNota): AtuacaoAtual => {
  switch (tipoPagamento) {
    case 'Pagamento Pos':
      return 'Estoque'; // Estoque cadastra e confere primeiro
    case 'Pagamento Parcial':
      return 'Financeiro'; // Financeiro faz primeiro pagamento
    case 'Pagamento 100% Antecipado':
      return 'Financeiro'; // Financeiro paga 100% primeiro
    default:
      return 'Estoque';
  }
};

// ============= FUNÇÕES DE CRIAÇÃO =============

// LANÇAMENTO INICIAL: Nota criada SEM produtos
export const criarNotaEntrada = (dados: {
  data: string;
  fornecedor: string;
  tipoPagamento: TipoPagamentoNota;
  qtdInformada?: number;
  valorTotal?: number;
  formaPagamento?: 'Dinheiro' | 'Pix';
  responsavel: string;
  observacoes?: string;
  urgente?: boolean;
  produtos?: {
    tipoProduto: 'Aparelho' | 'Acessorio';
    marca: string;
    modelo: string;
    imei?: string;
    cor?: string;
    categoria?: 'Novo' | 'Seminovo';
    quantidade: number;
    custoUnitario: number;
    custoTotal: number;
  }[];
}): NotaEntrada => {
  // Gerar número da nota usando contador auto-incremental
  const numeroNota = gerarNumeroNotaAutoIncremental();
  
  // ID é igual ao número da nota para consistência
  const id = numeroNota;
  
  // Processar produtos se fornecidos no lançamento
  const produtosProcessados: ProdutoNotaEntrada[] = [];
  let qtdCadastrada = 0;
  
  if (dados.produtos && dados.produtos.length > 0) {
    dados.produtos.forEach((p, idx) => {
      produtosProcessados.push({
        id: `PROD-${id}-${String(idx + 1).padStart(3, '0')}`,
        tipoProduto: p.tipoProduto,
        marca: p.marca,
        modelo: p.modelo,
        imei: p.imei,
        cor: p.cor,
        categoria: p.categoria,
        quantidade: p.quantidade,
        custoUnitario: p.custoUnitario,
        custoTotal: p.custoUnitario * p.quantidade,
        statusRecebimento: 'Pendente' as const,
        statusConferencia: 'Pendente' as const
      });
    });
    qtdCadastrada = produtosProcessados.reduce((acc, p) => acc + p.quantidade, 0);
  }
  
  const valorTotal = (dados.produtos && dados.produtos.length > 0)
    ? produtosProcessados.reduce((acc, p) => acc + p.custoTotal, 0)
    : (dados.valorTotal || 0);
  const qtdInformada = dados.qtdInformada || (qtdCadastrada > 0 ? qtdCadastrada : 0);
  
  // Definir atuação inicial automaticamente
  const atuacaoInicial = definirAtuacaoInicial(dados.tipoPagamento);
  
  // Definir status inicial baseado no tipo de pagamento
  let statusInicial: NotaEntradaStatus = 'Criada';
  if (dados.tipoPagamento === 'Pagamento Pos') {
    statusInicial = 'Aguardando Conferencia'; // Estoque primeiro
  } else {
    statusInicial = 'Aguardando Pagamento Inicial'; // Financeiro primeiro
  }
  
  const novaNota: NotaEntrada = {
    id,
    numeroNota,
    data: dados.data,
    fornecedor: dados.fornecedor,
    status: statusInicial,
    atuacaoAtual: atuacaoInicial,
    tipoPagamento: dados.tipoPagamento,
    tipoPagamentoBloqueado: false,
    qtdInformada,
    qtdCadastrada,
    qtdConferida: 0,
    valorTotal,
    valorPago: 0,
    valorPendente: valorTotal,
    valorConferido: 0,
    produtos: produtosProcessados,
    timeline: [],
    alertas: [],
    pagamentos: [],
    dataCriacao: new Date().toISOString(),
    responsavelCriacao: dados.responsavel,
    observacoes: dados.observacoes,
    formaPagamento: dados.formaPagamento,
    urgente: dados.urgente || false
  };
  
  // Registrar criação na timeline
  const produtosMsg = qtdCadastrada > 0 ? ` com ${qtdCadastrada} produto(s)` : '';
  registrarTimeline(
    novaNota,
    dados.responsavel,
    'Estoque',
    `Lançamento inicial da nota${produtosMsg}`,
    statusInicial,
    valorTotal,
    `Tipo de pagamento: ${dados.tipoPagamento}. Atuação inicial: ${atuacaoInicial}`
  );
  
  // Registrar definição do tipo de pagamento na timeline
  registrarTimeline(
    novaNota,
    'Sistema',
    'Sistema',
    `Tipo de pagamento definido: ${dados.tipoPagamento}`,
    statusInicial,
    undefined,
    `Atuação Atual definida automaticamente para: ${atuacaoInicial}`
  );
  
  notasEntrada.push(novaNota);
  
  // Notificar módulos relevantes baseado na atuação
  if (atuacaoInicial === 'Estoque') {
    addNotification({
      type: 'nota_criada',
      title: 'Nova nota de entrada',
      description: `Nota ${id} aguardando cadastro de produtos - ${dados.fornecedor}`,
      targetUsers: ['estoque']
    });
  } else {
    addNotification({
      type: 'pagamento_pendente',
      title: 'Nova nota aguardando pagamento',
      description: `Nota ${id} - ${dados.fornecedor} - R$ ${valorTotal.toFixed(2)}`,
      targetUsers: ['financeiro']
    });
  }
  
  return novaNota;
};
// ============= FUNÇÕES DE ALTERAÇÃO DE ATUAÇÃO =============

export const alterarAtuacao = (
  notaId: string,
  novaAtuacao: AtuacaoAtual,
  usuario: string,
  motivo: string
): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === notaId);
  if (!nota) return null;
  
  const atuacaoAnterior = nota.atuacaoAtual;
  nota.atuacaoAtual = novaAtuacao;
  
  // Registrar alteração na timeline
  registrarTimeline(
    nota,
    usuario,
    'Sistema',
    `Atuação alterada de ${atuacaoAnterior} para ${novaAtuacao}`,
    nota.status,
    undefined,
    motivo
  );
  
  // Notificar módulo relevante
  if (novaAtuacao === 'Estoque') {
    addNotification({
      type: 'nota_criada',
      title: 'Nota aguardando ação do Estoque',
      description: `Nota ${notaId} - ${motivo}`,
      targetUsers: ['estoque']
    });
  } else if (novaAtuacao === 'Financeiro') {
    addNotification({
      type: 'pagamento_pendente',
      title: 'Nota aguardando ação do Financeiro',
      description: `Nota ${notaId} - ${motivo}`,
      targetUsers: ['financeiro']
    });
  } else if (novaAtuacao === 'Encerrado') {
    addNotification({
      type: 'conferencia_completa',
      title: 'Nota encerrada',
      description: `Nota ${notaId} finalizada com sucesso`,
      targetUsers: ['estoque', 'financeiro']
    });
  }
  
  return nota;
};

// ============= REJEIÇÃO DE NOTA PELO FINANCEIRO =============

export const rejeitarNota = (
  notaId: string,
  motivo: string,
  observacao: string,
  usuario: string
): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === notaId);
  if (!nota) return null;
  
  // Só pode rejeitar se atuação atual é do Financeiro
  if (nota.atuacaoAtual !== 'Financeiro') return null;
  
  const atuacaoAnterior = nota.atuacaoAtual;
  nota.atuacaoAtual = 'Estoque';
  
  // Registrar rejeição na timeline
  registrarTimeline(
    nota,
    usuario,
    'Financeiro',
    `Nota rejeitada pelo Financeiro`,
    nota.status,
    undefined,
    `Motivo: ${motivo}. Observação: ${observacao}`
  );
  
  // Notificar estoque
  addNotification({
    type: 'nota_criada',
    title: 'Nota rejeitada pelo Financeiro',
    description: `Nota ${notaId} devolvida ao Estoque. Motivo: ${motivo}`,
    targetUsers: ['estoque']
  });
  
  return nota;
};

// Verificar se usuário pode editar nota baseado na atuação
export const podeEditarNota = (nota: NotaEntrada, perfilUsuario: 'Estoque' | 'Financeiro'): boolean => {
  if (nota.atuacaoAtual === 'Encerrado') return false;
  return nota.atuacaoAtual === perfilUsuario;
};

// ============= FUNÇÕES DE TRANSIÇÃO DE STATUS =============

export const transicionarStatus = (
  notaId: string,
  novoStatus: NotaEntradaStatus,
  usuario: string,
  perfil: PerfilUsuario,
  detalhes?: string
): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === notaId);
  if (!nota) return null;
  
  // Verificar se transição é válida
  if (!podeTransicionar(nota.status, novoStatus)) {
    console.error(`Transição inválida: ${nota.status} -> ${novoStatus}`);
    return null;
  }
  
  const statusAnterior = nota.status;
  nota.status = novoStatus;
  
  // Registrar na timeline
  registrarTimeline(nota, usuario, perfil, `Status alterado para ${novoStatus}`, novoStatus, undefined, detalhes);
  
  // Notificar módulos relevantes
  if (novoStatus === 'Aguardando Pagamento Inicial' || novoStatus === 'Aguardando Pagamento Final') {
    addNotification({
      type: 'pagamento_pendente',
      title: 'Nota aguardando pagamento',
      description: `Nota ${notaId} aguardando pagamento - R$ ${nota.valorPendente.toFixed(2)}`,
      targetUsers: ['financeiro']
    });
  }
  
  if (novoStatus === 'Conferencia Concluida') {
    addNotification({
      type: 'conferencia_completa',
      title: 'Conferência concluída',
      description: `Nota ${notaId} com 100% dos aparelhos conferidos`,
      targetUsers: ['financeiro', 'estoque']
    });
  }
  
  if (novoStatus === 'Com Divergencia') {
    addNotification({
      type: 'divergencia',
      title: 'Divergência detectada',
      description: `Nota ${notaId} apresenta divergência. Verificar imediatamente.`,
      targetUsers: ['financeiro', 'estoque', 'gestor']
    });
  }
  
  return nota;
};

// ============= FUNÇÕES DE PAGAMENTO =============

export const registrarPagamento = (
  notaId: string,
  pagamento: {
    valor: number;
    formaPagamento: string;
    contaPagamento?: string;
    comprovante?: string;
    responsavel: string;
    tipo: 'inicial' | 'parcial' | 'final';
  }
): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === notaId);
  if (!nota) return null;
  
  // Verificar se nota está finalizada
  if (nota.status === 'Finalizada') {
    console.error('Não é possível registrar pagamento em nota finalizada');
    return null;
  }
  
  // Bloquear tipo de pagamento após primeiro pagamento
  if (!nota.tipoPagamentoBloqueado && nota.pagamentos.length === 0) {
    nota.tipoPagamentoBloqueado = true;
  }
  
  // Registrar pagamento
  nota.pagamentos.push({
    data: new Date().toISOString(),
    ...pagamento
  });
  
  // Atualizar valores
  nota.valorPago += pagamento.valor;
  nota.valorPendente = nota.valorTotal - nota.valorPago;
  
  // Registrar na timeline
  registrarTimeline(
    nota,
    pagamento.responsavel,
    'Financeiro',
    `Pagamento ${pagamento.tipo} registrado`,
    nota.status,
    pagamento.valor,
    `Via ${pagamento.formaPagamento}`
  );
  
  // Atualizar status conforme tipo de pagamento e regras
  if (nota.tipoPagamento === 'Pagamento 100% Antecipado') {
    if (nota.valorPago >= nota.valorTotal) {
      transicionarStatus(notaId, 'Pagamento Concluido', pagamento.responsavel, 'Financeiro');
      // Após pagamento antecipado, vai para conferência e muda atuação para Estoque
      transicionarStatus(notaId, 'Aguardando Conferencia', 'Sistema', 'Sistema');
      alterarAtuacao(notaId, 'Estoque', 'Sistema', 'Pagamento 100% concluído - aguardando conferência do estoque');
    }
  } else if (nota.tipoPagamento === 'Pagamento Parcial') {
    // Tolerância de R$ 0,01
    const quitado = Math.abs(nota.valorPendente) <= 0.01;
    
    if (nota.pagamentos.length === 1 && !quitado) {
      // Primeiro pagamento parcial - transicionar para estoque
      transicionarStatus(notaId, 'Pagamento Parcial Realizado', pagamento.responsavel, 'Financeiro');
      transicionarStatus(notaId, 'Aguardando Conferencia', 'Sistema', 'Sistema');
      alterarAtuacao(notaId, 'Estoque', 'Sistema', 'Pagamento parcial realizado - aguardando cadastro e conferência');
    } else if (quitado) {
      // Pagamento quitou o saldo
      if (nota.status === 'Aguardando Pagamento Final' || nota.status === 'Conferencia Concluida') {
        transicionarStatus(notaId, 'Finalizada', pagamento.responsavel, 'Financeiro');
        nota.dataFinalizacao = new Date().toISOString();
        nota.responsavelFinalizacao = pagamento.responsavel;
        alterarAtuacao(notaId, 'Encerrado', 'Sistema', 'Nota finalizada - todos os pagamentos e conferência concluídos');
      } else if (nota.status === 'Aguardando Pagamento Inicial' || nota.status === 'Pagamento Parcial Realizado') {
        // Pagou tudo antes da conferência
        transicionarStatus(notaId, 'Pagamento Concluido', pagamento.responsavel, 'Financeiro');
        transicionarStatus(notaId, 'Aguardando Conferencia', 'Sistema', 'Sistema');
        alterarAtuacao(notaId, 'Estoque', 'Sistema', 'Pagamento total concluído - aguardando conferência do estoque');
      }
    }
    // Se não quitou e não é primeiro pagamento, apenas registra (mantém status atual)
  } else if (nota.tipoPagamento === 'Pagamento Pos') {
    // Só pode pagar após conferência concluída
    if (nota.status !== 'Conferencia Concluida' && nota.status !== 'Aguardando Pagamento Final') {
      console.error('Pagamento Pós só pode ser feito após conferência concluída');
      // Reverter pagamento
      nota.valorPago -= pagamento.valor;
      nota.valorPendente = nota.valorTotal - nota.valorPago;
      nota.pagamentos.pop();
      return null;
    }
    
    if (nota.valorPago >= nota.valorTotal) {
      transicionarStatus(notaId, 'Finalizada', pagamento.responsavel, 'Financeiro');
      nota.dataFinalizacao = new Date().toISOString();
      nota.responsavelFinalizacao = pagamento.responsavel;
      alterarAtuacao(notaId, 'Encerrado', 'Sistema', 'Nota finalizada - pagamento pós-conferência concluído');
    }
  }
  
  return nota;
};

// ============= FUNÇÕES DE CADASTRO DE PRODUTOS =============

export const cadastrarProdutosNota = (
  notaId: string,
  produtos: Omit<ProdutoNotaEntrada, 'id' | 'statusRecebimento' | 'statusConferencia'>[],
  usuario: string
): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === notaId);
  if (!nota) return null;
  
  // Verificar se nota está finalizada
  if (nota.status === 'Finalizada') {
    console.error('Não é possível cadastrar produtos em nota finalizada');
    return null;
  }
  
  // Verificar se quantidade não excede o informado
  const qtdNovaUnidades = produtos.reduce((acc, p) => acc + p.quantidade, 0);
  const qtdNova = nota.qtdCadastrada + qtdNovaUnidades;
  if (nota.qtdInformada > 0 && qtdNova > nota.qtdInformada) {
    // Gerar alerta mas permitir cadastro
    const alerta: AlertaNota = {
      id: `ALERTA-${notaId}-QTD-${Date.now()}`,
      tipo: 'qtd_excedida',
      mensagem: `Quantidade de produtos (${qtdNova}) excede o informado (${nota.qtdInformada})`,
      dataGeracao: new Date().toISOString(),
      visto: false,
      resolvido: false
    };
    nota.alertas.push(alerta);
  }
  
  // Processar e adicionar produtos
  const produtosProcessados: ProdutoNotaEntrada[] = produtos.map((p, idx) => ({
    id: `PROD-${notaId}-${String(nota.produtos.length + idx + 1).padStart(3, '0')}`,
    tipoProduto: p.tipoProduto,
    marca: p.marca,
    modelo: p.modelo,
    imei: p.imei,
    cor: p.cor,
    categoria: p.categoria,
    capacidade: p.capacidade,
    percentualBateria: p.percentualBateria,
    quantidade: p.quantidade,
    custoUnitario: p.custoUnitario,
    custoTotal: p.custoUnitario * p.quantidade,
    statusRecebimento: 'Pendente' as const,
    statusConferencia: 'Pendente' as const
  }));
  
  nota.produtos.push(...produtosProcessados);
  nota.qtdCadastrada = nota.produtos.reduce((acc, p) => acc + p.quantidade, 0);
  
  // Recalcular valor total
  nota.valorTotal = nota.produtos.reduce((acc, p) => acc + p.custoTotal, 0);
  nota.valorPendente = nota.valorTotal - nota.valorPago;
  
  // Registrar na timeline
  registrarTimeline(
    nota,
    usuario,
    'Estoque',
    `${produtos.length} produto(s) cadastrado(s)`,
    nota.status,
    produtosProcessados.reduce((acc, p) => acc + p.custoTotal, 0),
    `Total cadastrado: ${nota.qtdCadastrada}/${nota.qtdInformada}`
  );
  
  return nota;
};

// ============= FUNÇÕES DE CONFERÊNCIA =============

export const conferirProduto = (
  notaId: string,
  produtoId: string,
  dadosConferencia: {
    imei?: string;
    cor: string;
    categoria: 'Novo' | 'Seminovo';
    capacidade?: string;
    percentualBateria?: number;
    responsavel: string;
  }
): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === notaId);
  if (!nota) return null;
  
  // Verificar se nota está finalizada
  if (nota.status === 'Finalizada') {
    console.error('Não é possível conferir produtos em nota finalizada');
    return null;
  }
  
  const produto = nota.produtos.find(p => p.id === produtoId);
  if (!produto) return null;
  
  // Validar IMEI para aparelhos
  if (produto.tipoProduto === 'Aparelho' && !dadosConferencia.imei) {
    console.error('IMEI é obrigatório para aparelhos');
    return null;
  }
  
  // Verificar unicidade do IMEI
  if (dadosConferencia.imei) {
    const imeiExistente = nota.produtos.find(
      p => p.id !== produtoId && p.imei === dadosConferencia.imei
    );
    if (imeiExistente) {
      console.error('IMEI já existe nesta nota');
      return null;
    }
  }
  
  // Atualizar produto
  produto.imei = dadosConferencia.imei;
  produto.cor = dadosConferencia.cor;
  produto.categoria = dadosConferencia.categoria;
  produto.capacidade = dadosConferencia.capacidade as ProdutoNotaEntrada['capacidade'];
  produto.percentualBateria = dadosConferencia.percentualBateria;
  produto.statusRecebimento = 'Recebido';
  produto.statusConferencia = 'Conferido';
  produto.dataConferencia = new Date().toISOString();
  produto.responsavelConferencia = dadosConferencia.responsavel;
  
  // Atualizar contadores
  nota.qtdConferida = nota.produtos.filter(p => p.statusConferencia === 'Conferido').reduce((acc, p) => acc + p.quantidade, 0);
  nota.valorConferido = nota.produtos
    .filter(p => p.statusConferencia === 'Conferido')
    .reduce((acc, p) => acc + p.custoTotal, 0);
  
  // Registrar na timeline
  registrarTimeline(
    nota,
    dadosConferencia.responsavel,
    'Estoque',
    `Produto conferido: ${produto.modelo}`,
    nota.status,
    produto.custoTotal,
    `IMEI: ${dadosConferencia.imei || 'N/A'}, Cor: ${dadosConferencia.cor}, ${nota.qtdConferida}/${nota.qtdCadastrada}`
  );
  
  // Atualizar status da nota
  if (nota.qtdConferida > 0 && nota.qtdConferida < nota.qtdCadastrada) {
    if (nota.status === 'Aguardando Conferencia') {
      nota.status = 'Conferencia Parcial';
    }
  } else if (nota.qtdConferida === nota.qtdCadastrada && nota.qtdCadastrada > 0) {
    // Verificar se há divergência de valores
    const tolerancia = nota.valorTotal * 0.0001; // 0,01%
    if (nota.valorPago > 0 && Math.abs(nota.valorPago - nota.valorConferido) > tolerancia) {
      nota.status = 'Com Divergencia';
      nota.alertas.push({
        id: `ALERTA-${notaId}-DIV-${Date.now()}`,
        tipo: 'divergencia_valor',
        mensagem: `Divergência detectada: Pago R$ ${nota.valorPago.toFixed(2)}, Conferido R$ ${nota.valorConferido.toFixed(2)}`,
        dataGeracao: new Date().toISOString(),
        visto: false,
        resolvido: false
      });
    } else {
      nota.status = 'Conferencia Concluida';
      
      // Se for Pós-Conferência, vai para aguardando pagamento final
      if (nota.tipoPagamento === 'Pagamento Pos') {
        nota.status = 'Aguardando Pagamento Final';
        alterarAtuacao(nota.id, 'Financeiro', 'Sistema', 'Conferência 100% concluída - aguardando pagamento');
      }
      
      // Se for Parcial e tem pagamento pendente, vai para aguardando pagamento final
      if (nota.tipoPagamento === 'Pagamento Parcial' && nota.valorPendente > 0) {
        nota.status = 'Aguardando Pagamento Final';
        alterarAtuacao(nota.id, 'Financeiro', 'Sistema', 'Conferência concluída - aguardando pagamento final');
      }
      
      // Se for Antecipado (já pago), finaliza direto
      if (nota.tipoPagamento === 'Pagamento 100% Antecipado' && nota.valorPago >= nota.valorTotal) {
        nota.status = 'Finalizada';
        nota.dataFinalizacao = new Date().toISOString();
        nota.responsavelFinalizacao = dadosConferencia.responsavel;
        alterarAtuacao(nota.id, 'Encerrado', 'Sistema', 'Nota finalizada - pagamento antecipado já realizado');
      }
    }
  }
  
  // Verificar e atualizar alertas
  nota.alertas = [...nota.alertas.filter(a => !a.resolvido), ...verificarAlertasNota(nota)];
  
  return nota;
};

// Conferência simplificada - apenas marca como conferido sem alterar dados
export const conferirProdutoSimples = (
  notaId: string,
  produtoId: string,
  responsavel: string
): NotaEntrada | null => {
  const notaOriginal = notasEntrada.find(n => n.id === notaId);
  if (!notaOriginal) return null;
  
  // Verificar se nota está finalizada
  if (notaOriginal.status === 'Finalizada') {
    console.error('Não é possível conferir produtos em nota finalizada');
    return null;
  }
  
  const produto = notaOriginal.produtos.find(p => p.id === produtoId);
  if (!produto) return null;
  
  // Verificar se já está conferido
  if (produto.statusConferencia === 'Conferido') {
    console.log('Produto já conferido');
    return null;
  }
  
  // Apenas atualiza status de conferência (dados já foram preenchidos no cadastro)
  produto.statusRecebimento = 'Recebido';
  produto.statusConferencia = 'Conferido';
  produto.dataConferencia = new Date().toISOString();
  produto.responsavelConferencia = responsavel;
  
  // Atualizar contadores
  notaOriginal.qtdConferida = notaOriginal.produtos.filter(p => p.statusConferencia === 'Conferido').reduce((acc, p) => acc + p.quantidade, 0);
  notaOriginal.valorConferido = notaOriginal.produtos
    .filter(p => p.statusConferencia === 'Conferido')
    .reduce((acc, p) => acc + p.custoTotal, 0);
  
  // Registrar na timeline
  registrarTimeline(
    notaOriginal,
    responsavel,
    'Estoque',
    `Produto conferido: ${produto.modelo}`,
    notaOriginal.status,
    produto.custoTotal,
    `${notaOriginal.qtdConferida}/${notaOriginal.qtdCadastrada} produtos conferidos`
  );
  
  // Atualizar status da nota
  if (notaOriginal.qtdConferida > 0 && notaOriginal.qtdConferida < notaOriginal.qtdCadastrada) {
    if (notaOriginal.status === 'Aguardando Conferencia') {
      notaOriginal.status = 'Conferencia Parcial';
    }
  } else if (notaOriginal.qtdConferida === notaOriginal.qtdCadastrada && notaOriginal.qtdCadastrada > 0) {
    // Verificar se há divergência de valores
    const tolerancia = notaOriginal.valorTotal * 0.0001;
    if (notaOriginal.valorPago > 0 && Math.abs(notaOriginal.valorPago - notaOriginal.valorConferido) > tolerancia) {
      notaOriginal.status = 'Com Divergencia';
      notaOriginal.alertas.push({
        id: `ALERTA-${notaId}-DIV-${Date.now()}`,
        tipo: 'divergencia_valor',
        mensagem: `Divergência detectada: Pago R$ ${notaOriginal.valorPago.toFixed(2)}, Conferido R$ ${notaOriginal.valorConferido.toFixed(2)}`,
        dataGeracao: new Date().toISOString(),
        visto: false,
        resolvido: false
      });
    } else {
      notaOriginal.status = 'Conferencia Concluida';
      
      if (notaOriginal.tipoPagamento === 'Pagamento Pos') {
        notaOriginal.status = 'Aguardando Pagamento Final';
        alterarAtuacao(notaOriginal.id, 'Financeiro', 'Sistema', 'Conferência 100% concluída - aguardando pagamento');
      }
      
      if (notaOriginal.tipoPagamento === 'Pagamento Parcial' && notaOriginal.valorPendente > 0) {
        notaOriginal.status = 'Aguardando Pagamento Final';
        alterarAtuacao(notaOriginal.id, 'Financeiro', 'Sistema', 'Conferência concluída - aguardando pagamento final');
      }
      
      if (notaOriginal.tipoPagamento === 'Pagamento 100% Antecipado' && notaOriginal.valorPago >= notaOriginal.valorTotal) {
        notaOriginal.status = 'Finalizada';
        notaOriginal.dataFinalizacao = new Date().toISOString();
        notaOriginal.responsavelFinalizacao = responsavel;
        alterarAtuacao(notaOriginal.id, 'Encerrado', 'Sistema', 'Nota finalizada - pagamento antecipado já realizado');
      }
    }
  }
  
  notaOriginal.alertas = [...notaOriginal.alertas.filter(a => !a.resolvido), ...verificarAlertasNota(notaOriginal)];
  
  // Retornar cópia profunda para forçar re-render do React
  return JSON.parse(JSON.stringify(notaOriginal));
};

// Finalizar conferência em lote - confirma múltiplos produtos de uma vez
export const finalizarConferencia = (
  notaId: string,
  produtosIds: string[],
  responsavel: string
): NotaEntrada | null => {
  const notaOriginal = notasEntrada.find(n => n.id === notaId);
  if (!notaOriginal) return null;
  
  // Verificar se nota está finalizada
  if (notaOriginal.status === 'Finalizada') {
    console.error('Não é possível conferir produtos em nota finalizada');
    return null;
  }
  
  // Conferir cada produto
  let produtosConferidos = 0;
  for (const produtoId of produtosIds) {
    const produto = notaOriginal.produtos.find(p => p.id === produtoId);
    if (produto && produto.statusConferencia !== 'Conferido') {
      produto.statusRecebimento = 'Recebido';
      produto.statusConferencia = 'Conferido';
      produto.dataConferencia = new Date().toISOString();
      produto.responsavelConferencia = responsavel;
      produtosConferidos++;
    }
  }
  
  if (produtosConferidos === 0) {
    console.log('Nenhum produto novo para conferir');
    return null;
  }
  
  // Atualizar contadores
  notaOriginal.qtdConferida = notaOriginal.produtos.filter(p => p.statusConferencia === 'Conferido').reduce((acc, p) => acc + p.quantidade, 0);
  notaOriginal.valorConferido = notaOriginal.produtos
    .filter(p => p.statusConferencia === 'Conferido')
    .reduce((acc, p) => acc + p.custoTotal, 0);
  
  // Registrar na timeline
  registrarTimeline(
    notaOriginal,
    responsavel,
    'Estoque',
    `Conferência salva: ${produtosConferidos} produto(s)`,
    notaOriginal.status,
    notaOriginal.valorConferido,
    `Total conferido: ${notaOriginal.qtdConferida}/${notaOriginal.qtdCadastrada}`
  );
  
  // Atualizar status da nota
  if (notaOriginal.qtdConferida > 0 && notaOriginal.qtdConferida < notaOriginal.qtdCadastrada) {
    if (notaOriginal.status === 'Aguardando Conferencia' || notaOriginal.status === 'Criada') {
      notaOriginal.status = 'Conferencia Parcial';
    }
  } else if (notaOriginal.qtdConferida === notaOriginal.qtdCadastrada && notaOriginal.qtdCadastrada > 0) {
    // Verificar se há divergência de valores
    const tolerancia = notaOriginal.valorTotal * 0.0001;
    if (notaOriginal.valorPago > 0 && Math.abs(notaOriginal.valorPago - notaOriginal.valorConferido) > tolerancia) {
      notaOriginal.status = 'Com Divergencia';
      notaOriginal.alertas.push({
        id: `ALERTA-${notaId}-DIV-${Date.now()}`,
        tipo: 'divergencia_valor',
        mensagem: `Divergência detectada: Pago R$ ${notaOriginal.valorPago.toFixed(2)}, Conferido R$ ${notaOriginal.valorConferido.toFixed(2)}`,
        dataGeracao: new Date().toISOString(),
        visto: false,
        resolvido: false
      });
    } else {
      notaOriginal.status = 'Conferencia Concluida';
      
      if (notaOriginal.tipoPagamento === 'Pagamento Pos') {
        notaOriginal.status = 'Aguardando Pagamento Final';
        alterarAtuacao(notaOriginal.id, 'Financeiro', 'Sistema', 'Conferência 100% concluída - aguardando pagamento');
      }
      
      if (notaOriginal.tipoPagamento === 'Pagamento Parcial' && notaOriginal.valorPendente > 0) {
        notaOriginal.status = 'Aguardando Pagamento Final';
        alterarAtuacao(notaOriginal.id, 'Financeiro', 'Sistema', 'Conferência concluída - aguardando pagamento final');
      }
      
      if (notaOriginal.tipoPagamento === 'Pagamento 100% Antecipado' && notaOriginal.valorPago >= notaOriginal.valorTotal) {
        notaOriginal.status = 'Finalizada';
        notaOriginal.dataFinalizacao = new Date().toISOString();
        notaOriginal.responsavelFinalizacao = responsavel;
        alterarAtuacao(notaOriginal.id, 'Encerrado', 'Sistema', 'Nota finalizada - pagamento antecipado já realizado');
      }
    }
  }
  
  notaOriginal.alertas = [...notaOriginal.alertas.filter(a => !a.resolvido), ...verificarAlertasNota(notaOriginal)];
  
  // Retornar cópia profunda para forçar re-render do React
  return JSON.parse(JSON.stringify(notaOriginal));
};

// ============= FUNÇÃO DE EXPLOSÃO DE ITENS =============

export const explodirProdutoNota = (
  notaId: string,
  produtoId: string,
  usuario: string
): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === notaId);
  if (!nota) return null;

  const produtoIndex = nota.produtos.findIndex(p => p.id === produtoId);
  if (produtoIndex === -1) return null;

  const produto = nota.produtos[produtoIndex];
  if (produto.quantidade <= 1) return null;

  const novasLinhas: ProdutoNotaEntrada[] = Array.from(
    { length: produto.quantidade },
    (_, i) => ({
      id: `${produto.id}-U${String(i + 1).padStart(3, '0')}`,
      tipoProduto: produto.tipoProduto,
      marca: produto.marca,
      modelo: produto.modelo,
      quantidade: 1,
      custoUnitario: produto.custoUnitario,
      custoTotal: produto.custoUnitario,
      statusRecebimento: 'Pendente' as const,
      statusConferencia: 'Pendente' as const
    })
  );

  nota.produtos.splice(produtoIndex, 1, ...novasLinhas);
  // qtdCadastrada não muda (soma de quantidades permanece igual)

  registrarTimeline(nota, usuario, 'Estoque',
    `Item "${produto.modelo}" explodido em ${produto.quantidade} unidades`,
    nota.status);

  return JSON.parse(JSON.stringify(nota));
};

// ============= FUNÇÃO DE RECOLHER ITENS EXPLODIDOS =============

export const recolherProdutoNota = (
  notaId: string,
  prefixoProdutoId: string,
  usuario: string
): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === notaId);
  if (!nota) return null;

  // Encontrar todos os itens explodidos com o prefixo
  const itensExplodidos = nota.produtos.filter(p => p.id.startsWith(prefixoProdutoId + '-U'));
  if (itensExplodidos.length === 0) return null;

  // Validar que nenhum item esteja conferido
  const algumConferido = itensExplodidos.some(p => p.statusConferencia === 'Conferido');
  if (algumConferido) {
    console.error('Não é possível recolher itens já conferidos');
    return null;
  }

  // Reagrupar: somar quantidades e recriar item consolidado
  const totalQtd = itensExplodidos.reduce((acc, p) => acc + p.quantidade, 0);
  const primeiro = itensExplodidos[0];

  const itemConsolidado: ProdutoNotaEntrada = {
    id: prefixoProdutoId,
    tipoProduto: primeiro.tipoProduto,
    marca: primeiro.marca,
    modelo: primeiro.modelo,
    quantidade: totalQtd,
    custoUnitario: primeiro.custoUnitario,
    custoTotal: primeiro.custoUnitario * totalQtd,
    statusRecebimento: 'Pendente' as const,
    statusConferencia: 'Pendente' as const
  };

  // Remover itens explodidos e inserir o consolidado na posição do primeiro
  const primeiroIndex = nota.produtos.findIndex(p => p.id === itensExplodidos[0].id);
  nota.produtos = nota.produtos.filter(p => !p.id.startsWith(prefixoProdutoId + '-U'));
  nota.produtos.splice(primeiroIndex, 0, itemConsolidado);

  registrarTimeline(nota, usuario, 'Estoque',
    `Item "${primeiro.modelo}" recolhido de ${itensExplodidos.length} unidades para 1 linha (Qtd: ${totalQtd})`,
    nota.status);

  return JSON.parse(JSON.stringify(nota));
};

// ============= MIGRAÇÃO DE PRODUTOS POR CATEGORIA (NOVO VS SEMI-NOVO) =============

/**
 * Migra produtos conferidos para seus destinos corretos baseado na categoria:
 * - Novo: Vai direto para Estoque > Produtos (disponível para venda)
 * - Seminovo: Vai para Estoque > Produtos Pendentes (triagem necessária)
 */
export const migrarProdutosConferidosPorCategoria = (
  nota: NotaEntrada,
  responsavel: string,
  lojaDestino?: string
): { novos: number; seminovos: number } => {
  const loja = lojaDestino || ESTOQUE_SIA_LOJA_ID;
  let novos = 0;
  let seminovos = 0;
  
  // Filtrar apenas produtos conferidos que ainda não foram migrados
  const produtosConferidos = nota.produtos.filter(p => 
    p.statusConferencia === 'Conferido' && 
    p.tipoProduto === 'Aparelho'
  );
  
  // Separar por categoria
  const aparelhosNovos = produtosConferidos.filter(p => p.categoria === 'Novo');
  const aparelhosSeminovos = produtosConferidos.filter(p => p.categoria === 'Seminovo');
  
  // Migrar aparelhos NOVOS direto para estoque disponível
  for (const produto of aparelhosNovos) {
    try {
      const produtoNota: ProdutoNota = {
        marca: produto.marca,
        modelo: produto.modelo,
        cor: produto.cor || 'Não informada',
        imei: produto.imei || '',
        tipo: 'Novo',
        tipoProduto: 'Aparelho',
        quantidade: produto.quantidade,
        valorUnitario: produto.custoUnitario,
        valorTotal: produto.custoTotal,
        saudeBateria: produto.percentualBateria || 100,
        capacidade: produto.capacidade
      };
      
      migrarAparelhoNovoParaEstoque(
        produtoNota,
        nota.id,
        nota.fornecedor,
        loja,
        responsavel
      );
      novos++;
      
      console.log(`[NOTA ENTRADA] Produto NOVO ${produto.modelo} migrado para estoque disponível`);
    } catch (error) {
      console.error(`[NOTA ENTRADA] Erro ao migrar produto NOVO ${produto.id}:`, error);
    }
  }
  
  // Migrar aparelhos SEMI-NOVOS para Produtos Pendentes
  if (aparelhosSeminovos.length > 0) {
    const produtosParaMigrar: ProdutoNota[] = aparelhosSeminovos.map(p => ({
      marca: p.marca,
      modelo: p.modelo,
      cor: p.cor || 'Não informada',
      imei: p.imei || '',
      tipo: 'Seminovo' as const,
      tipoProduto: 'Aparelho',
      quantidade: p.quantidade,
      valorUnitario: p.custoUnitario,
      valorTotal: p.custoTotal,
      saudeBateria: p.percentualBateria || 100,
      capacidade: p.capacidade
    }));
    
    const migrados = migrarProdutosNotaParaPendentes(
      produtosParaMigrar,
      nota.id,
      nota.fornecedor,
      loja,
      responsavel,
      'Fornecedor'
    );
    
    seminovos = migrados.length;
    console.log(`[NOTA ENTRADA] ${seminovos} produtos SEMI-NOVOS migrados para pendentes`);
  }
  
  // Registrar migração na timeline da nota
  if (novos > 0 || seminovos > 0) {
    registrarTimeline(
      nota,
      responsavel,
      'Estoque',
      `Produtos migrados: ${novos} novo(s) para estoque, ${seminovos} seminovo(s) para pendentes`,
      nota.status,
      undefined,
      `Migração automática baseada na categoria dos produtos`
    );
  }
  
  return { novos, seminovos };
};

// ============= FUNÇÕES DE FINALIZAÇÃO =============

export const finalizarNota = (
  notaId: string,
  usuario: string,
  perfil: PerfilUsuario,
  forcar: boolean = false
): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === notaId);
  if (!nota) return null;
  
  // Verificar condições de finalização (a menos que seja forçado)
  if (!forcar) {
    // Conferência 100%
    if (nota.qtdConferida !== nota.qtdInformada && nota.qtdInformada > 0) {
      console.error(`Conferência incompleta: ${nota.qtdConferida}/${nota.qtdInformada}`);
      return null;
    }
    
    // Pagamento 100%
    if (nota.valorPago < nota.valorTotal) {
      console.error(`Pagamento incompleto: R$ ${nota.valorPago.toFixed(2)} / R$ ${nota.valorTotal.toFixed(2)}`);
      return null;
    }
    
    // Verificar divergências ativas
    const divergenciasAtivas = nota.alertas.filter(a => a.tipo === 'divergencia_valor' && !a.resolvido);
    if (divergenciasAtivas.length > 0) {
      console.error('Existem divergências não resolvidas');
      return null;
    }
  }
  
  nota.status = 'Finalizada';
  nota.dataFinalizacao = new Date().toISOString();
  nota.responsavelFinalizacao = usuario;
  
  registrarTimeline(
    nota,
    usuario,
    perfil,
    forcar ? 'Nota finalizada (forçado)' : 'Nota finalizada',
    'Finalizada',
    undefined,
    forcar ? 'Finalização forçada pelo gestor' : undefined
  );
  
  addNotification({
    type: 'nota_finalizada',
    title: 'Nota finalizada',
    description: `Nota ${notaId} finalizada com sucesso`,
    targetUsers: ['estoque', 'financeiro']
  });
  
  return nota;
};

// ============= FUNÇÕES DE CONSULTA =============

// Ordenar por dataCriacao (mais recente primeiro)
const ordenarPorDataCriacao = (a: NotaEntrada, b: NotaEntrada): number => {
  return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
};

export const getNotasEntrada = (): NotaEntrada[] => {
  return notasEntrada.map(n => ({
    ...n,
    alertas: [...n.alertas.filter(a => !a.resolvido), ...verificarAlertasNota(n)]
  })).sort(ordenarPorDataCriacao);
};

export const getNotaEntradaById = (id: string): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === id);
  if (!nota) return null;
  return {
    ...nota,
    alertas: [...nota.alertas.filter(a => !a.resolvido), ...verificarAlertasNota(nota)]
  };
};

export const getNotasEntradaPorStatus = (status: NotaEntradaStatus): NotaEntrada[] => {
  return notasEntrada.filter(n => n.status === status).sort(ordenarPorDataCriacao);
};

export const getNotasPendentes = (): NotaEntrada[] => {
  const statusNaoFinalizados: NotaEntradaStatus[] = [
    'Criada',
    'Aguardando Pagamento Inicial',
    'Pagamento Parcial Realizado',
    'Pagamento Concluido',
    'Aguardando Conferencia',
    'Conferencia Parcial',
    'Conferencia Concluida',
    'Aguardando Pagamento Final',
    'Com Divergencia'
  ];
  return notasEntrada.filter(n => statusNaoFinalizados.includes(n.status)).sort(ordenarPorDataCriacao);
};

// Obter TODAS as notas para o módulo Estoque (incluindo finalizadas para histórico)
export const getNotasParaEstoque = (): NotaEntrada[] => {
  // Retorna todas as notas - finalizadas ficam para histórico com indicação visual
  return [...notasEntrada].sort(ordenarPorDataCriacao);
};

// ============= REGRAS DE CAMPOS =============

export const podeEditarCampo = (
  nota: NotaEntrada,
  produto: ProdutoNotaEntrada,
  campo: keyof ProdutoNotaEntrada
): boolean => {
  // Nota finalizada = tudo bloqueado
  if (nota.status === 'Finalizada') return false;
  
  // Campos que só podem ser editados ANTES do recebimento
  const camposAntesRecebimento = ['tipoProduto', 'marca', 'modelo', 'quantidade', 'custoUnitario'];
  
  // Campos que só podem ser editados APÓS o recebimento
  const camposAposRecebimento = ['imei', 'cor', 'categoria', 'capacidade', 'percentualBateria'];
  
  if (camposAntesRecebimento.includes(campo as string)) {
    return produto.statusRecebimento === 'Pendente';
  }
  
  if (camposAposRecebimento.includes(campo as string)) {
    return produto.statusRecebimento === 'Recebido' || produto.statusConferencia === 'Pendente';
  }
  
  // custoTotal é sempre calculado
  if (campo === 'custoTotal') return false;
  
  return false;
};

// ============= VERIFICAÇÃO DE PERMISSÕES =============

export const podeRealizarAcao = (
  nota: NotaEntrada,
  acao: 'cadastrar_produtos' | 'conferir' | 'pagar' | 'finalizar',
  perfil: PerfilUsuario
): boolean => {
  if (nota.status === 'Finalizada') return false;
  
  switch (acao) {
    case 'cadastrar_produtos':
      return perfil === 'Estoque' && 
        ['Criada', 'Aguardando Conferencia', 'Conferencia Parcial'].includes(nota.status);
    
    case 'conferir':
      return perfil === 'Estoque' && 
        ['Aguardando Conferencia', 'Conferencia Parcial'].includes(nota.status);
    
    case 'pagar':
      if (perfil !== 'Financeiro') return false;
      
      if (nota.tipoPagamento === 'Pagamento 100% Antecipado') {
        return nota.status === 'Aguardando Pagamento Inicial';
      }
      if (nota.tipoPagamento === 'Pagamento Parcial') {
        return ['Aguardando Pagamento Inicial', 'Aguardando Pagamento Final'].includes(nota.status);
      }
      if (nota.tipoPagamento === 'Pagamento Pos') {
        return ['Conferencia Concluida', 'Aguardando Pagamento Final'].includes(nota.status);
      }
      return false;
    
    case 'finalizar':
      return nota.status === 'Conferencia Concluida' || 
        (nota.status === 'Aguardando Pagamento Final' && nota.valorPago >= nota.valorTotal);
    
    default:
      return false;
  }
};

// ============= FUNÇÕES PARA MÓDULO FINANCEIRO =============

// Interface compatível com o layout do FinanceiroNotasPendencias
export interface PendenciaFinanceiraConvertida {
  id: string;
  notaId: string;
  fornecedor: string;
  valorTotal: number;
  valorConferido: number;
  valorPendente: number;
  valorPago: number;
  statusPagamento: 'Pago' | 'Parcial' | 'Aguardando';
  statusConferencia: string;
  atuacaoAtual: AtuacaoAtual;
  tipoPagamento: TipoPagamentoNota;
  qtdInformada: number;
  qtdCadastrada: number;
  qtdConferida: number;
  dataCriacao: string;
  status: NotaEntradaStatus;
  timeline: TimelineNotaEntrada[];
  podeEditar: boolean;
  percentualConferencia: number;
  diasDecorridos: number;
  slaStatus: 'normal' | 'aviso' | 'critico';
  slaAlerta: boolean;
}

// Obter notas para o módulo Financeiro
// Exibe TODAS as notas (incluindo finalizadas para histórico)
export const getNotasParaFinanceiro = (): NotaEntrada[] => {
  // Retorna todas as notas - finalizadas ficam para histórico com indicação visual
  return [...notasEntrada].sort(ordenarPorDataCriacao);
};

// Converter NotaEntrada para formato compatível com a UI do Financeiro
export const converterNotaParaPendencia = (nota: NotaEntrada): PendenciaFinanceiraConvertida => {
  // Calcular percentual de conferência
  const percentualConferencia = nota.qtdInformada > 0 
    ? Math.round((nota.qtdConferida / nota.qtdInformada) * 100) 
    : 0;
  
  // Calcular dias decorridos
  const dataCriacao = new Date(nota.dataCriacao);
  const agora = new Date();
  const diasDecorridos = Math.ceil((agora.getTime() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determinar status SLA
  let slaStatus: 'normal' | 'aviso' | 'critico' = 'normal';
  let slaAlerta = false;
  if (diasDecorridos >= 7) {
    slaStatus = 'critico';
    slaAlerta = true;
  } else if (diasDecorridos >= 5) {
    slaStatus = 'aviso';
    slaAlerta = true;
  }
  
  // Determinar status de pagamento
  let statusPagamento: 'Pago' | 'Parcial' | 'Aguardando' = 'Aguardando';
  if (nota.valorPago >= nota.valorTotal && nota.valorTotal > 0) {
    statusPagamento = 'Pago';
  } else if (nota.valorPago > 0) {
    statusPagamento = 'Parcial';
  }
  
  return {
    id: `PEND-${nota.id}`,
    notaId: nota.id,
    fornecedor: nota.fornecedor,
    valorTotal: nota.valorTotal,
    valorConferido: nota.valorConferido,
    valorPendente: nota.valorPendente,
    valorPago: nota.valorPago,
    statusPagamento,
    statusConferencia: nota.status,
    atuacaoAtual: nota.atuacaoAtual,
    tipoPagamento: nota.tipoPagamento,
    qtdInformada: nota.qtdInformada,
    qtdCadastrada: nota.qtdCadastrada,
    qtdConferida: nota.qtdConferida,
    dataCriacao: nota.dataCriacao.split('T')[0],
    status: nota.status,
    timeline: nota.timeline,
    podeEditar: nota.atuacaoAtual === 'Financeiro',
    percentualConferencia,
    diasDecorridos,
    slaStatus,
    slaAlerta
  };
};

// ============= INICIALIZAÇÃO COM DADOS MOCKADOS =============

export const inicializarNotasEntradaMock = (): void => {
  if (notasEntrada.length > 0) return;
  
  // Resetar contador para inicialização limpa
  proximoSequencial = 1;
  
  // Criar notas com datas/horas distintas para ordenação correta
  // Nota 1 - Pagamento Pós, atuação Estoque, aguardando conferência (mais antiga)
  const nota1 = criarNotaEntradaComDataHora({
    data: '2026-01-15',
    dataCriacao: '2026-01-15T09:30:00',
    fornecedor: 'Apple Distribuidor BR',
    tipoPagamento: 'Pagamento Pos',
    qtdInformada: 5,
    valorTotal: 32000,
    formaPagamento: 'Pix',
    responsavel: 'Carlos Estoque'
  });
  // Cadastrar alguns produtos para permitir ação
  cadastrarProdutosNota(nota1.id, [{
    tipoProduto: 'Aparelho',
    marca: 'Apple',
    modelo: 'iPhone 14 Pro',
    quantidade: 2,
    custoUnitario: 6400,
    custoTotal: 12800
  }], 'Carlos Estoque');
  
  // Nota 2 - 100% Antecipado, atuação Financeiro, aguardando pagamento
  criarNotaEntradaComDataHora({
    data: '2026-01-18',
    dataCriacao: '2026-01-18T14:15:00',
    fornecedor: 'TechSupply Imports',
    tipoPagamento: 'Pagamento 100% Antecipado',
    qtdInformada: 10,
    valorTotal: 45000,
    formaPagamento: 'Pix',
    responsavel: 'Carlos Estoque'
  });
  
  // Nota 3 - Parcial, atuação Financeiro, aguardando pagamento inicial
  criarNotaEntradaComDataHora({
    data: '2026-01-20',
    dataCriacao: '2026-01-20T10:45:00',
    fornecedor: 'MobileWorld Atacado',
    tipoPagamento: 'Pagamento Parcial',
    qtdInformada: 8,
    valorTotal: 28000,
    formaPagamento: 'Dinheiro',
    responsavel: 'Carlos Estoque'
  });
  
  // Nota 4 - Pagamento Pós, atuação Estoque, sem produtos cadastrados ainda
  criarNotaEntradaComDataHora({
    data: '2026-01-22',
    dataCriacao: '2026-01-22T16:30:00',
    fornecedor: 'FastCell Distribuição',
    tipoPagamento: 'Pagamento Pos',
    qtdInformada: 15,
    valorTotal: 52000,
    formaPagamento: 'Pix',
    responsavel: 'Carlos Estoque'
  });
  
  // Nota 5 - Pagamento Pós, atuação Estoque (mais recente - para teste do botão +)
  criarNotaEntradaComDataHora({
    data: '2026-01-25',
    dataCriacao: '2026-01-25T11:00:00',
    fornecedor: 'GlobalPhones Brasil',
    tipoPagamento: 'Pagamento Pos',
    qtdInformada: 6,
    valorTotal: 24000,
    formaPagamento: 'Pix',
    responsavel: 'Carlos Estoque'
  });
};

// Função auxiliar para criar nota com data/hora específica (uso interno mockado)
const criarNotaEntradaComDataHora = (dados: {
  data: string;
  dataCriacao: string;
  fornecedor: string;
  tipoPagamento: TipoPagamentoNota;
  qtdInformada: number;
  valorTotal: number;
  formaPagamento: 'Pix' | 'Dinheiro';
  responsavel: string;
  observacoes?: string;
}): NotaEntrada => {
  const numeroNota = gerarNumeroNotaAutoIncremental();
  const id = numeroNota;
  
  const atuacaoInicial: AtuacaoAtual = dados.tipoPagamento === 'Pagamento Pos' ? 'Estoque' : 'Financeiro';
  
  let statusInicial: NotaEntradaStatus;
  if (dados.tipoPagamento === 'Pagamento 100% Antecipado') {
    statusInicial = 'Aguardando Pagamento Inicial';
  } else if (dados.tipoPagamento === 'Pagamento Parcial') {
    statusInicial = 'Aguardando Pagamento Inicial';
  } else {
    statusInicial = 'Aguardando Conferencia';
  }
  
  const novaNota: NotaEntrada = {
    id,
    numeroNota,
    data: dados.data,
    dataCriacao: dados.dataCriacao,
    fornecedor: dados.fornecedor,
    tipoPagamento: dados.tipoPagamento,
    tipoPagamentoBloqueado: false,
    qtdInformada: dados.qtdInformada,
    qtdCadastrada: 0,
    qtdConferida: 0,
    status: statusInicial,
    atuacaoAtual: atuacaoInicial,
    valorTotal: dados.valorTotal,
    valorPago: 0,
    valorPendente: dados.valorTotal,
    valorConferido: 0,
    formaPagamento: dados.formaPagamento,
    responsavelCriacao: dados.responsavel,
    observacoes: dados.observacoes,
    produtos: [],
    pagamentos: [],
    alertas: [],
    timeline: [{
      id: `TL-${Date.now()}`,
      dataHora: dados.dataCriacao,
      usuario: dados.responsavel,
      perfil: 'Estoque' as PerfilUsuario,
      acao: 'Nota criada',
      statusAnterior: statusInicial,
      statusNovo: statusInicial,
      impactoFinanceiro: dados.valorTotal,
      detalhes: `Tipo: ${dados.tipoPagamento} | Valor: R$ ${dados.valorTotal.toLocaleString('pt-BR')}`
    }]
  };
  
  notasEntrada.push(novaNota);
  return novaNota;
};

// Inicializar ao carregar módulo
inicializarNotasEntradaMock();
