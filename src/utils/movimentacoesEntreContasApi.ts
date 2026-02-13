// Movimentações entre Contas API

export interface MovimentacaoEntreConta {
  id: string;
  transacaoId: string;
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  dataHora: string;
  observacao: string;
  usuarioId: string;
  usuarioNome: string;
}

const STORAGE_KEY = 'movimentacoes_entre_contas';

const generateId = () => `MOV-${Date.now().toString(36).toUpperCase()}`;
const generateTransacaoId = () => `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

export const getMovimentacoesEntreConta = (): MovimentacaoEntreConta[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addMovimentacaoEntreConta = (data: Omit<MovimentacaoEntreConta, 'id' | 'transacaoId'>): MovimentacaoEntreConta => {
  const movimentacoes = getMovimentacoesEntreConta();
  const nova: MovimentacaoEntreConta = {
    ...data,
    id: generateId(),
    transacaoId: generateTransacaoId(),
  };
  movimentacoes.push(nova);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movimentacoes));
  return nova;
};

// Logs de auditoria para movimentações
export interface LogMovimentacao {
  id: string;
  movimentacaoId: string;
  transacaoId: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  observacao: string;
}

const LOGS_STORAGE_KEY = 'logs_movimentacoes_entre_contas';

export const getLogsMovimentacoes = (): LogMovimentacao[] => {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addLogMovimentacao = (mov: MovimentacaoEntreConta): void => {
  const logs = getLogsMovimentacoes();
  logs.push({
    id: `LOG-MOV-${Date.now().toString(36).toUpperCase()}`,
    movimentacaoId: mov.id,
    transacaoId: mov.transacaoId,
    dataHora: mov.dataHora,
    usuarioId: mov.usuarioId,
    usuarioNome: mov.usuarioNome,
    contaOrigemId: mov.contaOrigemId,
    contaDestinoId: mov.contaDestinoId,
    valor: mov.valor,
    observacao: mov.observacao,
  });
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
};
