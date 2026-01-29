// ============= API para Fluxo de Notas de Entrada de Produtos =============
// Esta API implementa a máquina de estados completa para o fluxo de notas

import { addNotification } from './notificationsApi';

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
export type TipoPagamentoNota = 'Antecipado' | 'Parcial' | 'Pos';

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
}

// ============= ARMAZENAMENTO =============

let notasEntrada: NotaEntrada[] = [];
let notaCounter = 0;

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

// ============= FUNÇÕES DE CRIAÇÃO =============

export const criarNotaEntrada = (dados: {
  numeroNota: string;
  data: string;
  fornecedor: string;
  tipoPagamento: TipoPagamentoNota;
  qtdInformada?: number;
  valorTotal?: number;
  produtos?: Omit<ProdutoNotaEntrada, 'id' | 'statusRecebimento' | 'statusConferencia'>[];
  responsavel: string;
  observacoes?: string;
}): NotaEntrada => {
  notaCounter++;
  const id = `NE-${new Date().getFullYear()}-${String(notaCounter).padStart(5, '0')}`;
  
  // Processar produtos se fornecidos
  const produtosProcessados: ProdutoNotaEntrada[] = (dados.produtos || []).map((p, idx) => ({
    id: `PROD-${id}-${String(idx + 1).padStart(3, '0')}`,
    tipoProduto: p.tipoProduto,
    marca: p.marca,
    modelo: p.modelo,
    quantidade: p.quantidade,
    custoUnitario: p.custoUnitario,
    custoTotal: p.custoUnitario * p.quantidade,
    // Campos de conferência inicializados
    statusRecebimento: 'Pendente' as const,
    statusConferencia: 'Pendente' as const
  }));
  
  const valorTotal = dados.valorTotal || produtosProcessados.reduce((acc, p) => acc + p.custoTotal, 0);
  const qtdCadastrada = produtosProcessados.length;
  const qtdInformada = dados.qtdInformada || qtdCadastrada;
  
  const novaNota: NotaEntrada = {
    id,
    numeroNota: dados.numeroNota,
    data: dados.data,
    fornecedor: dados.fornecedor,
    status: 'Criada',
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
    observacoes: dados.observacoes
  };
  
  // Registrar criação na timeline
  registrarTimeline(
    novaNota,
    dados.responsavel,
    'Estoque',
    'Nota de entrada criada',
    'Criada',
    valorTotal,
    `Tipo de pagamento: ${dados.tipoPagamento}, Qtd informada: ${qtdInformada}`
  );
  
  notasEntrada.push(novaNota);
  
  // Notificar módulos relevantes
  addNotification({
    type: 'nota_criada',
    title: 'Nova nota de entrada',
    description: `Nota ${id} criada - ${dados.fornecedor} - R$ ${valorTotal.toFixed(2)}`,
    targetUsers: ['estoque']
  });
  
  return novaNota;
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
  if (nota.tipoPagamento === 'Antecipado') {
    if (nota.valorPago >= nota.valorTotal) {
      transicionarStatus(notaId, 'Pagamento Concluido', pagamento.responsavel, 'Financeiro');
      // Após pagamento antecipado, vai para conferência
      transicionarStatus(notaId, 'Aguardando Conferencia', 'Sistema', 'Sistema');
    }
  } else if (nota.tipoPagamento === 'Parcial') {
    if (pagamento.tipo === 'inicial') {
      transicionarStatus(notaId, 'Pagamento Parcial Realizado', pagamento.responsavel, 'Financeiro');
      transicionarStatus(notaId, 'Aguardando Conferencia', 'Sistema', 'Sistema');
    } else if (pagamento.tipo === 'final' && nota.valorPago >= nota.valorTotal) {
      // Verificar se conferência está concluída
      if (nota.status === 'Aguardando Pagamento Final' || nota.status === 'Conferencia Concluida') {
        transicionarStatus(notaId, 'Finalizada', pagamento.responsavel, 'Financeiro');
        nota.dataFinalizacao = new Date().toISOString();
        nota.responsavelFinalizacao = pagamento.responsavel;
      }
    }
  } else if (nota.tipoPagamento === 'Pos') {
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
  const qtdNova = nota.qtdCadastrada + produtos.length;
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
    quantidade: p.quantidade,
    custoUnitario: p.custoUnitario,
    custoTotal: p.custoUnitario * p.quantidade,
    statusRecebimento: 'Pendente' as const,
    statusConferencia: 'Pendente' as const
  }));
  
  nota.produtos.push(...produtosProcessados);
  nota.qtdCadastrada = nota.produtos.length;
  
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
  nota.qtdConferida = nota.produtos.filter(p => p.statusConferencia === 'Conferido').length;
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
      if (nota.tipoPagamento === 'Pos') {
        nota.status = 'Aguardando Pagamento Final';
      }
      
      // Se for Parcial e tem pagamento pendente, vai para aguardando pagamento final
      if (nota.tipoPagamento === 'Parcial' && nota.valorPendente > 0) {
        nota.status = 'Aguardando Pagamento Final';
      }
      
      // Se for Antecipado (já pago), finaliza direto
      if (nota.tipoPagamento === 'Antecipado' && nota.valorPago >= nota.valorTotal) {
        nota.status = 'Finalizada';
        nota.dataFinalizacao = new Date().toISOString();
        nota.responsavelFinalizacao = dadosConferencia.responsavel;
      }
    }
  }
  
  // Verificar e atualizar alertas
  nota.alertas = [...nota.alertas.filter(a => !a.resolvido), ...verificarAlertasNota(nota)];
  
  return nota;
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

export const getNotasEntrada = (): NotaEntrada[] => {
  return notasEntrada.map(n => ({
    ...n,
    alertas: [...n.alertas.filter(a => !a.resolvido), ...verificarAlertasNota(n)]
  }));
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
  return notasEntrada.filter(n => n.status === status);
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
  return notasEntrada.filter(n => statusNaoFinalizados.includes(n.status));
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
      
      if (nota.tipoPagamento === 'Antecipado') {
        return nota.status === 'Aguardando Pagamento Inicial';
      }
      if (nota.tipoPagamento === 'Parcial') {
        return ['Aguardando Pagamento Inicial', 'Aguardando Pagamento Final'].includes(nota.status);
      }
      if (nota.tipoPagamento === 'Pos') {
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

// ============= INICIALIZAÇÃO COM DADOS MOCKADOS =============

export const inicializarNotasEntradaMock = (): void => {
  if (notasEntrada.length > 0) return;
  
  // Nota 1 - Antecipado, já paga, aguardando conferência
  const nota1 = criarNotaEntrada({
    numeroNota: 'NF-2025-00001',
    data: '2025-01-15',
    fornecedor: 'Apple Distribuidor BR',
    tipoPagamento: 'Antecipado',
    qtdInformada: 5,
    valorTotal: 32000,
    responsavel: 'Carlos Estoque'
  });
  registrarPagamento(nota1.id, {
    valor: 32000,
    formaPagamento: 'Pix',
    responsavel: 'Maria Financeiro',
    tipo: 'inicial'
  });
  
  // Nota 2 - Parcial, com pagamento inicial feito, em conferência
  const nota2 = criarNotaEntrada({
    numeroNota: 'NF-2025-00002',
    data: '2025-01-18',
    fornecedor: 'TechSupply Imports',
    tipoPagamento: 'Parcial',
    qtdInformada: 10,
    valorTotal: 45000,
    responsavel: 'Carlos Estoque'
  });
  registrarPagamento(nota2.id, {
    valor: 22500,
    formaPagamento: 'Transferência',
    responsavel: 'Maria Financeiro',
    tipo: 'inicial'
  });
  
  // Nota 3 - Pós-conferência, criada, aguardando conferência
  criarNotaEntrada({
    numeroNota: 'NF-2025-00003',
    data: '2025-01-20',
    fornecedor: 'MobileWorld Atacado',
    tipoPagamento: 'Pos',
    qtdInformada: 8,
    valorTotal: 28000,
    responsavel: 'Carlos Estoque'
  });
  // Transicionar para aguardando conferência (Pós vai direto)
  const nota3 = notasEntrada.find(n => n.numeroNota === 'NF-2025-00003');
  if (nota3) {
    transicionarStatus(nota3.id, 'Aguardando Conferencia', 'Sistema', 'Sistema');
  }
  
  // Nota 4 - Criada, sem produtos ainda
  criarNotaEntrada({
    numeroNota: 'NF-2025-00004',
    data: '2025-01-22',
    fornecedor: 'FastCell Distribuição',
    tipoPagamento: 'Pos',
    qtdInformada: 15,
    responsavel: 'Carlos Estoque'
  });
};

// Inicializar ao carregar módulo
inicializarNotasEntradaMock();
