// API para Timeline Unificada

export interface TimelineEntry {
  id: string;
  entidadeId: string; // ID da OS, Garantia, Solicitação, Lote, Colaborador
  entidadeTipo: 'OS' | 'Garantia' | 'Solicitacao' | 'Lote' | 'Produto' | 'Colaborador';
  dataHora: string;
  tipo: string;
  titulo: string;
  descricao: string;
  usuarioId: string;
  usuarioNome: string;
  metadata?: Record<string, any>;
}

let timeline: TimelineEntry[] = [];

export const addTimelineEntry = (entry: Omit<TimelineEntry, 'id'>): TimelineEntry => {
  const newEntry: TimelineEntry = {
    ...entry,
    id: `TL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  timeline.push(newEntry);
  return newEntry;
};

export const getTimelineByEntidade = (entidadeId: string): TimelineEntry[] => {
  return timeline.filter(t => t.entidadeId === entidadeId)
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
};

export const getTimelineByTipo = (entidadeTipo: TimelineEntry['entidadeTipo']): TimelineEntry[] => {
  return timeline.filter(t => t.entidadeTipo === entidadeTipo)
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
};

export const getAllTimeline = (): TimelineEntry[] => {
  return [...timeline].sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
};

// Registrar eventos específicos
export const registrarSolicitacaoPeca = (
  osId: string, 
  pecaNome: string, 
  usuarioId: string, 
  usuarioNome: string
): TimelineEntry => {
  return addTimelineEntry({
    entidadeId: osId,
    entidadeTipo: 'OS',
    dataHora: new Date().toISOString(),
    tipo: 'solicitacao_peca',
    titulo: 'Peça Solicitada',
    descricao: `Solicitação de peça "${pecaNome}" criada`,
    usuarioId,
    usuarioNome
  });
};

export const registrarAprovacaoGestor = (
  solicitacaoId: string, 
  usuarioId: string, 
  usuarioNome: string,
  aprovado: boolean,
  motivo?: string
): TimelineEntry => {
  return addTimelineEntry({
    entidadeId: solicitacaoId,
    entidadeTipo: 'Solicitacao',
    dataHora: new Date().toISOString(),
    tipo: aprovado ? 'aprovacao_gestor' : 'recusa_gestor',
    titulo: aprovado ? 'Aprovado pelo Gestor' : 'Recusado pelo Gestor',
    descricao: motivo || (aprovado ? 'Solicitação aprovada' : 'Solicitação recusada'),
    usuarioId,
    usuarioNome
  });
};

export const registrarAdicaoLote = (
  loteId: string, 
  solicitacaoId: string,
  usuarioId: string, 
  usuarioNome: string
): TimelineEntry => {
  return addTimelineEntry({
    entidadeId: loteId,
    entidadeTipo: 'Lote',
    dataHora: new Date().toISOString(),
    tipo: 'adicao_lote',
    titulo: 'Solicitação Adicionada ao Lote',
    descricao: `Solicitação ${solicitacaoId} adicionada ao lote de pagamento`,
    usuarioId,
    usuarioNome
  });
};

export const registrarEnvioLoteFinanceiro = (
  loteId: string,
  usuarioId: string, 
  usuarioNome: string
): TimelineEntry => {
  return addTimelineEntry({
    entidadeId: loteId,
    entidadeTipo: 'Lote',
    dataHora: new Date().toISOString(),
    tipo: 'envio_financeiro',
    titulo: 'Lote Enviado para Financeiro',
    descricao: 'Lote de pagamento enviado para execução pelo financeiro',
    usuarioId,
    usuarioNome
  });
};

export const registrarPagamento = (
  loteId: string,
  fornecedorNome: string,
  formaPagamento: string,
  valor: number,
  usuarioId: string, 
  usuarioNome: string
): TimelineEntry => {
  return addTimelineEntry({
    entidadeId: loteId,
    entidadeTipo: 'Lote',
    dataHora: new Date().toISOString(),
    tipo: 'pagamento',
    titulo: 'Pagamento Registrado',
    descricao: `Pagamento de R$ ${valor.toFixed(2)} para ${fornecedorNome} via ${formaPagamento}`,
    usuarioId,
    usuarioNome,
    metadata: { fornecedorNome, formaPagamento, valor }
  });
};

// ===== TIMELINE DE RODÍZIO DE COLABORADORES =====

export const registrarInicioRodizio = (
  colaboradorId: string,
  colaboradorNome: string,
  lojaOrigemNome: string,
  lojaDestinoNome: string,
  dataInicio: string,
  dataFim: string,
  observacao: string,
  usuarioId: string,
  usuarioNome: string
): TimelineEntry => {
  return addTimelineEntry({
    entidadeId: colaboradorId,
    entidadeTipo: 'Colaborador',
    dataHora: new Date().toISOString(),
    tipo: 'rodizio_inicio',
    titulo: 'Rodízio Iniciado',
    descricao: `Rodízio de ${lojaOrigemNome} para ${lojaDestinoNome} (${dataInicio} a ${dataFim})`,
    usuarioId,
    usuarioNome,
    metadata: { lojaOrigemNome, lojaDestinoNome, dataInicio, dataFim, observacao, colaboradorNome }
  });
};

export const registrarAlteracaoRodizio = (
  colaboradorId: string,
  alteracao: string,
  observacao: string,
  usuarioId: string,
  usuarioNome: string
): TimelineEntry => {
  return addTimelineEntry({
    entidadeId: colaboradorId,
    entidadeTipo: 'Colaborador',
    dataHora: new Date().toISOString(),
    tipo: 'rodizio_alteracao',
    titulo: 'Rodízio Alterado',
    descricao: alteracao,
    usuarioId,
    usuarioNome,
    metadata: { observacao }
  });
};

export const registrarEncerramentoRodizio = (
  colaboradorId: string,
  motivo: string,
  usuarioId: string,
  usuarioNome: string
): TimelineEntry => {
  return addTimelineEntry({
    entidadeId: colaboradorId,
    entidadeTipo: 'Colaborador',
    dataHora: new Date().toISOString(),
    tipo: 'rodizio_encerramento',
    titulo: 'Rodízio Encerrado',
    descricao: motivo,
    usuarioId,
    usuarioNome
  });
};
