// Comissões API - Mock Data

import { getColaboradores } from './cadastrosApi';

export interface ComissaoColaborador {
  colaboradorId: string;
  salarioFixo: number;
  percentualComissao: number;
}

export interface HistoricoComissao {
  id: string;
  colaboradorId: string;
  dataAlteracao: string;
  usuarioAlterou: string;
  fixoAnterior: number;
  fixoNovo: number;
  comissaoAnterior: number;
  comissaoNova: number;
}

const COMISSOES_KEY = 'thiago_imports_comissoes';
const HISTORICO_KEY = 'thiago_imports_historico_comissoes';

// Inicializar dados mockados
const inicializarComissoes = (): ComissaoColaborador[] => {
  const stored = localStorage.getItem(COMISSOES_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Dados iniciais mockados
  const colaboradores = getColaboradores();
  const comissoesIniciais: ComissaoColaborador[] = colaboradores.map(col => ({
    colaboradorId: col.id,
    salarioFixo: col.salario || 0,
    percentualComissao: Math.floor(Math.random() * 10) + 5 // 5-15%
  }));
  
  localStorage.setItem(COMISSOES_KEY, JSON.stringify(comissoesIniciais));
  return comissoesIniciais;
};

let comissoes: ComissaoColaborador[] = inicializarComissoes();

// Buscar comissão de um colaborador
export const getComissaoColaborador = (colaboradorId: string): { fixo: number; comissao: number } => {
  const comissao = comissoes.find(c => c.colaboradorId === colaboradorId);
  return {
    fixo: comissao?.salarioFixo || 0,
    comissao: comissao?.percentualComissao || 0
  };
};

// Buscar todas as comissões
export const getAllComissoes = (): ComissaoColaborador[] => {
  return comissoes;
};

// Atualizar comissão
export const updateComissaoColaborador = (
  colaboradorId: string, 
  fixo: number, 
  percentualComissao: number,
  usuarioAlterou: string = 'Sistema'
): void => {
  const existente = comissoes.find(c => c.colaboradorId === colaboradorId);
  
  // Registrar histórico
  if (existente) {
    addHistoricoComissao({
      id: `HIST-${Date.now()}`,
      colaboradorId,
      dataAlteracao: new Date().toISOString(),
      usuarioAlterou,
      fixoAnterior: existente.salarioFixo,
      fixoNovo: fixo,
      comissaoAnterior: existente.percentualComissao,
      comissaoNova: percentualComissao
    });
  }
  
  // Atualizar ou adicionar
  const index = comissoes.findIndex(c => c.colaboradorId === colaboradorId);
  if (index >= 0) {
    comissoes[index] = { colaboradorId, salarioFixo: fixo, percentualComissao };
  } else {
    comissoes.push({ colaboradorId, salarioFixo: fixo, percentualComissao });
  }
  
  // Persistir
  localStorage.setItem(COMISSOES_KEY, JSON.stringify(comissoes));
};

// Calcular comissão de uma venda
export const calcularComissaoVenda = (vendedorId: string, lucroVenda: number): number => {
  const { comissao } = getComissaoColaborador(vendedorId);
  if (lucroVenda <= 0) return 0; // Não há comissão em caso de prejuízo
  return lucroVenda * (comissao / 100);
};

// Histórico de alterações de comissão
let historicoComissoes: HistoricoComissao[] = (() => {
  const stored = localStorage.getItem(HISTORICO_KEY);
  return stored ? JSON.parse(stored) : [];
})();

export const addHistoricoComissao = (registro: HistoricoComissao): void => {
  historicoComissoes.push(registro);
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(historicoComissoes));
};

export const getHistoricoComissao = (colaboradorId: string): HistoricoComissao[] => {
  return historicoComissoes.filter(h => h.colaboradorId === colaboradorId);
};

export const getAllHistoricoComissoes = (): HistoricoComissao[] => {
  return historicoComissoes;
};
