// Atividades dos Gestores API
import { format } from 'date-fns';

// Interfaces
export interface AtividadeCadastro {
  id: string;
  nome: string;
  tipoHorario: 'fixo' | 'aberto';
  horarioPrevisto?: string; // HH:mm
  pontuacaoBase: number;
  lojasAtribuidas: string[] | 'todas';
  ativa: boolean;
}

export interface ExecucaoAtividade {
  id: string;
  atividadeId: string;
  atividadeNome: string;
  data: string; // YYYY-MM-DD
  lojaId: string;
  gestorId: string;
  gestorNome: string;
  executado: boolean;
  horarioExecutado?: string; // ISO
  pontuacao: number;
  status: 'pendente' | 'executado' | 'executado_com_atraso';
  tipoHorario: 'fixo' | 'aberto';
  horarioPrevisto?: string;
  colaboradorDesignadoId?: string;
  colaboradorDesignadoNome?: string;
}

export interface LogAtividade {
  id: string;
  modulo: string;
  atividadeId: string;
  atividadeNome: string;
  data: string;
  gestorId: string;
  gestorNome: string;
  acao: 'marcou' | 'desmarcou';
  pontuacao: number;
  dataHora: string; // ISO
  detalhes: string;
}

// localStorage keys
const ATIVIDADES_KEY = 'atividades_cadastro';
const EXECUCAO_KEY_PREFIX = 'atividades_execucao_';
const LOGS_KEY = 'atividades_logs';

// Initial mock data
const MOCK_ATIVIDADES: AtividadeCadastro[] = [
  { id: 'ATV-001', nome: 'Abertura de Caixa', tipoHorario: 'fixo', horarioPrevisto: '09:00', pontuacaoBase: 1, lojasAtribuidas: 'todas', ativa: true },
  { id: 'ATV-002', nome: 'Verificação de Estoque', tipoHorario: 'aberto', pontuacaoBase: 1, lojasAtribuidas: 'todas', ativa: true },
  { id: 'ATV-003', nome: 'Conferência de Vitrine', tipoHorario: 'fixo', horarioPrevisto: '10:00', pontuacaoBase: 1, lojasAtribuidas: 'todas', ativa: true },
  { id: 'ATV-004', nome: 'Relatório de Vendas do Dia Anterior', tipoHorario: 'fixo', horarioPrevisto: '09:30', pontuacaoBase: 1, lojasAtribuidas: 'todas', ativa: true },
  { id: 'ATV-005', nome: 'Alinhamento com Equipe', tipoHorario: 'aberto', pontuacaoBase: 1, lojasAtribuidas: 'todas', ativa: true },
  { id: 'ATV-006', nome: 'Fechamento de Caixa', tipoHorario: 'fixo', horarioPrevisto: '18:00', pontuacaoBase: 1, lojasAtribuidas: 'todas', ativa: true },
  { id: 'ATV-007', nome: 'Envio de Relatório Final', tipoHorario: 'fixo', horarioPrevisto: '18:30', pontuacaoBase: 1, lojasAtribuidas: 'todas', ativa: true },
];

// === CRUD Atividades ===

export const getAtividades = (): AtividadeCadastro[] => {
  const stored = localStorage.getItem(ATIVIDADES_KEY);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(ATIVIDADES_KEY, JSON.stringify(MOCK_ATIVIDADES));
  return [...MOCK_ATIVIDADES];
};

export const addAtividade = (data: Omit<AtividadeCadastro, 'id'>): AtividadeCadastro => {
  const atividades = getAtividades();
  const id = `ATV-${String(atividades.length + 1).padStart(3, '0')}-${Date.now().toString(36)}`;
  const nova: AtividadeCadastro = { ...data, id };
  atividades.push(nova);
  localStorage.setItem(ATIVIDADES_KEY, JSON.stringify(atividades));
  return nova;
};

export const updateAtividade = (id: string, data: Partial<AtividadeCadastro>): void => {
  const atividades = getAtividades();
  const idx = atividades.findIndex(a => a.id === id);
  if (idx >= 0) {
    atividades[idx] = { ...atividades[idx], ...data };
    localStorage.setItem(ATIVIDADES_KEY, JSON.stringify(atividades));
  }
};

export const deleteAtividade = (id: string): void => {
  const atividades = getAtividades().filter(a => a.id !== id);
  localStorage.setItem(ATIVIDADES_KEY, JSON.stringify(atividades));
};

// === Execução Diária ===

const getExecucaoKey = (data: string) => `${EXECUCAO_KEY_PREFIX}${data}`;

export const getExecucoesDoDia = (data: string, lojaId?: string): ExecucaoAtividade[] => {
  const key = getExecucaoKey(data);
  const stored = localStorage.getItem(key);
  let execucoes: ExecucaoAtividade[] = stored ? JSON.parse(stored) : [];

  // Sincronizar com atividades cadastradas
  const atividades = getAtividades().filter(a => a.ativa);
  const atividadesParaLoja = atividades.filter(a => {
    if (a.lojasAtribuidas === 'todas') return true;
    return lojaId ? a.lojasAtribuidas.includes(lojaId) : true;
  });

  // Criar execuções faltantes
  let changed = false;
  for (const atv of atividadesParaLoja) {
    const existe = execucoes.find(e => e.atividadeId === atv.id && (!lojaId || e.lojaId === lojaId));
    if (!existe && lojaId) {
      execucoes.push({
        id: `EXEC-${atv.id}-${lojaId}-${data}`,
        atividadeId: atv.id,
        atividadeNome: atv.nome,
        data,
        lojaId,
        gestorId: '',
        gestorNome: '',
        executado: false,
        pontuacao: 0,
        status: 'pendente',
        tipoHorario: atv.tipoHorario,
        horarioPrevisto: atv.horarioPrevisto,
      });
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem(key, JSON.stringify(execucoes));
  }

  if (lojaId) {
    return execucoes.filter(e => e.lojaId === lojaId);
  }
  return execucoes;
};

export const toggleExecucao = (
  data: string,
  atividadeId: string,
  lojaId: string,
  gestorId: string,
  gestorNome: string
): ExecucaoAtividade => {
  const key = getExecucaoKey(data);
  const execucoes: ExecucaoAtividade[] = JSON.parse(localStorage.getItem(key) || '[]');
  const idx = execucoes.findIndex(e => e.atividadeId === atividadeId && e.lojaId === lojaId);

  if (idx < 0) throw new Error('Execução não encontrada');

  const exec = execucoes[idx];
  const atividade = getAtividades().find(a => a.id === atividadeId);
  const agora = new Date();
  const novoExecutado = !exec.executado;

  let pontuacao = 0;
  let status: ExecucaoAtividade['status'] = 'pendente';

  if (novoExecutado && atividade) {
    if (atividade.tipoHorario === 'fixo' && atividade.horarioPrevisto) {
      const [h, m] = atividade.horarioPrevisto.split(':').map(Number);
      const limitDate = new Date();
      limitDate.setHours(h, m, 59, 999);
      if (agora <= limitDate) {
        pontuacao = atividade.pontuacaoBase;
        status = 'executado';
      } else {
        pontuacao = atividade.pontuacaoBase * 0.5;
        status = 'executado_com_atraso';
      }
    } else {
      pontuacao = atividade?.pontuacaoBase ?? 1;
      status = 'executado';
    }
  }

  execucoes[idx] = {
    ...exec,
    executado: novoExecutado,
    horarioExecutado: novoExecutado ? agora.toISOString() : undefined,
    pontuacao,
    status,
    gestorId,
    gestorNome,
  };

  localStorage.setItem(key, JSON.stringify(execucoes));

  // Log
  const logs = getLogsAtividades();
  logs.unshift({
    id: `LOG-ATV-${Date.now()}`,
    modulo: 'Atividades Gestores',
    atividadeId,
    atividadeNome: exec.atividadeNome,
    data,
    gestorId,
    gestorNome,
    acao: novoExecutado ? 'marcou' : 'desmarcou',
    pontuacao,
    dataHora: agora.toISOString(),
    detalhes: novoExecutado
      ? `Atividade "${exec.atividadeNome}" marcada como executada. Pontuação: ${pontuacao}. Status: ${status === 'executado_com_atraso' ? 'Executado com Atraso' : 'Executado'}${exec.colaboradorDesignadoNome ? `. Colaborador designado: ${exec.colaboradorDesignadoNome}` : ''}`
      : `Atividade "${exec.atividadeNome}" desmarcada. Pontuação zerada.`,
  });
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));

  return execucoes[idx];
};

// === Atualizar Colaborador Designado ===

export const atualizarColaboradorExecucao = (
  data: string,
  atividadeId: string,
  lojaId: string,
  colaboradorId: string,
  colaboradorNome: string
): void => {
  const key = getExecucaoKey(data);
  const execucoes: ExecucaoAtividade[] = JSON.parse(localStorage.getItem(key) || '[]');
  const idx = execucoes.findIndex(e => e.atividadeId === atividadeId && e.lojaId === lojaId);
  if (idx < 0) return;
  execucoes[idx] = {
    ...execucoes[idx],
    colaboradorDesignadoId: colaboradorId || undefined,
    colaboradorDesignadoNome: colaboradorNome || undefined,
  };
  localStorage.setItem(key, JSON.stringify(execucoes));
};

// === Logs ===

export const getLogsAtividades = (): LogAtividade[] => {
  const stored = localStorage.getItem(LOGS_KEY);
  return stored ? JSON.parse(stored) : [];
};

// === Dashboard helpers ===

export const calcularResumoExecucao = (execucoes: ExecucaoAtividade[]) => {
  const total = execucoes.length;
  const executados = execucoes.filter(e => e.executado).length;
  const pontuacaoObtida = execucoes.reduce((acc, e) => acc + e.pontuacao, 0);
  const pontuacaoMaxima = execucoes.reduce((acc, e) => {
    const atv = getAtividades().find(a => a.id === e.atividadeId);
    return acc + (atv?.pontuacaoBase ?? 1);
  }, 0);
  const percentual = total > 0 ? Math.round((executados / total) * 100) : 0;

  return { total, executados, pontuacaoObtida, pontuacaoMaxima, percentual };
};

export interface RankingGestor {
  gestorId: string;
  gestorNome: string;
  pontuacaoTotal: number;
  atividadesExecutadas: number;
  atividadesTotal: number;
  percentual: number;
}

export const calcularRankingGestores = (dataInicio: string, dataFim: string, lojaId?: string): RankingGestor[] => {
  const ranking = new Map<string, RankingGestor>();

  // Iterate over days in range
  const start = new Date(dataInicio);
  const end = new Date(dataFim);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dataStr = format(d, 'yyyy-MM-dd');
    const key = getExecucaoKey(dataStr);
    const stored = localStorage.getItem(key);
    if (!stored) continue;
    const execucoes: ExecucaoAtividade[] = JSON.parse(stored);

    for (const exec of execucoes) {
      if (lojaId && exec.lojaId !== lojaId) continue;
      if (!exec.gestorId) continue;

      const existing = ranking.get(exec.gestorId) || {
        gestorId: exec.gestorId,
        gestorNome: exec.gestorNome,
        pontuacaoTotal: 0,
        atividadesExecutadas: 0,
        atividadesTotal: 0,
        percentual: 0,
      };

      existing.atividadesTotal++;
      if (exec.executado) {
        existing.atividadesExecutadas++;
        existing.pontuacaoTotal += exec.pontuacao;
      }
      existing.percentual = existing.atividadesTotal > 0
        ? Math.round((existing.atividadesExecutadas / existing.atividadesTotal) * 100)
        : 0;

      ranking.set(exec.gestorId, existing);
    }
  }

  return Array.from(ranking.values()).sort((a, b) => b.pontuacaoTotal - a.pontuacaoTotal);
};

export interface ExecucaoPorLoja {
  lojaId: string;
  lojaNome: string;
  executadas: number;
  total: number;
  percentual: number;
  pontuacaoMedia: number;
}

export const calcularExecucaoPorLoja = (dataInicio: string, dataFim: string, getLojaNome: (id: string) => string): ExecucaoPorLoja[] => {
  const porLoja = new Map<string, { executadas: number; total: number; pontuacao: number }>();

  const start = new Date(dataInicio);
  const end = new Date(dataFim);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dataStr = format(d, 'yyyy-MM-dd');
    const key = getExecucaoKey(dataStr);
    const stored = localStorage.getItem(key);
    if (!stored) continue;
    const execucoes: ExecucaoAtividade[] = JSON.parse(stored);

    for (const exec of execucoes) {
      const existing = porLoja.get(exec.lojaId) || { executadas: 0, total: 0, pontuacao: 0 };
      existing.total++;
      if (exec.executado) {
        existing.executadas++;
        existing.pontuacao += exec.pontuacao;
      }
      porLoja.set(exec.lojaId, existing);
    }
  }

  return Array.from(porLoja.entries()).map(([lojaId, data]) => ({
    lojaId,
    lojaNome: getLojaNome(lojaId),
    executadas: data.executadas,
    total: data.total,
    percentual: data.total > 0 ? Math.round((data.executadas / data.total) * 100) : 0,
    pontuacaoMedia: data.total > 0 ? Math.round((data.pontuacao / data.total) * 100) / 100 : 0,
  })).sort((a, b) => b.percentual - a.percentual);
};
