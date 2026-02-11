// Comissão por Loja API - Mock Data
// TODO: Integrar com Supabase - substituir mock por query real

import { getLojaById, getCargoNome } from './cadastrosApi';

export interface ComissaoPorLoja {
  id: string;
  lojaId: string;
  cargoId: string;
  percentualComissao: number; // 0-100 com até 2 casas decimais
  createdAt: string;
  updatedAt: string;
}

export interface HistoricoComissaoPorLoja {
  id: string;
  comissaoId: string;
  usuarioId: string;
  usuarioNome: string;
  percentualAnterior: number | null;
  percentualNovo: number;
  tipoAcao: 'Criação' | 'Edição' | 'Deleção';
  createdAt: string;
}

const STORAGE_KEY = 'thiago_imports_comissao_por_loja';
const HISTORICO_KEY = 'thiago_imports_historico_comissao_por_loja';

// Inicializar dados mockados
// Mapeamento de IDs - UUIDs reais do useCadastroStore:
// Lojas: db894e7d (JK Shopping), 3ac7e00c (Matriz), 5b9446d5 (Shopping Sul), fcc78c1a (Online)
const inicializarComissoesPorLoja = (): ComissaoPorLoja[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored) as ComissaoPorLoja[];
    // Detectar dados legados com IDs tipo "LOJA-001" e forçar re-inicialização
    const temIdLegado = parsed.some(c => c.lojaId.startsWith('LOJA-'));
    if (!temIdLegado) {
      return parsed;
    }
  }
  
  // Dados iniciais mockados com UUIDs reais
  const comissoesIniciais: ComissaoPorLoja[] = [
    { 
      id: 'CPL-001', 
      lojaId: 'db894e7d', // Loja - JK Shopping
      cargoId: 'CARGO-001', // Gerente
      percentualComissao: 3.5, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    { 
      id: 'CPL-002', 
      lojaId: '3ac7e00c', // Loja - Matriz
      cargoId: 'CARGO-001', 
      percentualComissao: 3.0, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    { 
      id: 'CPL-003', 
      lojaId: 'db894e7d', // Loja - JK Shopping
      cargoId: 'CARGO-002', // Supervisor
      percentualComissao: 2.0, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
  ];
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(comissoesIniciais));
  return comissoesIniciais;
};

let comissoesPorLoja: ComissaoPorLoja[] = inicializarComissoesPorLoja();

// Inicializar histórico
let historicoComissoes: HistoricoComissaoPorLoja[] = (() => {
  const stored = localStorage.getItem(HISTORICO_KEY);
  return stored ? JSON.parse(stored) : [];
})();

const persistirDados = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(comissoesPorLoja));
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(historicoComissoes));
};

// CRUD Operations
export const getComissoesPorLoja = (): ComissaoPorLoja[] => {
  return [...comissoesPorLoja];
};

export const getComissaoPorLojaById = (id: string): ComissaoPorLoja | undefined => {
  return comissoesPorLoja.find(c => c.id === id);
};

export const getComissaoPorLojaECargo = (lojaId: string, cargoId: string): ComissaoPorLoja | undefined => {
  return comissoesPorLoja.find(c => c.lojaId === lojaId && c.cargoId === cargoId);
};

export const addComissaoPorLoja = (
  lojaId: string, 
  cargoId: string, 
  percentualComissao: number,
  usuarioId: string = 'SISTEMA',
  usuarioNome: string = 'Sistema'
): ComissaoPorLoja => {
  // Verificar duplicata
  const existente = getComissaoPorLojaECargo(lojaId, cargoId);
  if (existente) {
    throw new Error('Já existe uma comissão configurada para esta loja e cargo');
  }

  const newId = `CPL-${String(comissoesPorLoja.length + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();
  
  const novaComissao: ComissaoPorLoja = {
    id: newId,
    lojaId,
    cargoId,
    percentualComissao,
    createdAt: now,
    updatedAt: now
  };
  
  comissoesPorLoja.push(novaComissao);
  
  // Registrar histórico
  const historico: HistoricoComissaoPorLoja = {
    id: `HCPL-${Date.now()}`,
    comissaoId: newId,
    usuarioId,
    usuarioNome,
    percentualAnterior: null,
    percentualNovo: percentualComissao,
    tipoAcao: 'Criação',
    createdAt: now
  };
  historicoComissoes.push(historico);
  
  persistirDados();
  return novaComissao;
};

export const updateComissaoPorLoja = (
  id: string, 
  percentualComissao: number,
  usuarioId: string = 'SISTEMA',
  usuarioNome: string = 'Sistema'
): ComissaoPorLoja | null => {
  const index = comissoesPorLoja.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  const comissaoAnterior = comissoesPorLoja[index].percentualComissao;
  const now = new Date().toISOString();
  
  comissoesPorLoja[index] = {
    ...comissoesPorLoja[index],
    percentualComissao,
    updatedAt: now
  };
  
  // Registrar histórico
  const historico: HistoricoComissaoPorLoja = {
    id: `HCPL-${Date.now()}`,
    comissaoId: id,
    usuarioId,
    usuarioNome,
    percentualAnterior: comissaoAnterior,
    percentualNovo: percentualComissao,
    tipoAcao: 'Edição',
    createdAt: now
  };
  historicoComissoes.push(historico);
  
  persistirDados();
  return comissoesPorLoja[index];
};

export const deleteComissaoPorLoja = (
  id: string,
  usuarioId: string = 'SISTEMA',
  usuarioNome: string = 'Sistema'
): boolean => {
  const comissao = comissoesPorLoja.find(c => c.id === id);
  if (!comissao) return false;
  
  // Registrar histórico antes de deletar
  const historico: HistoricoComissaoPorLoja = {
    id: `HCPL-${Date.now()}`,
    comissaoId: id,
    usuarioId,
    usuarioNome,
    percentualAnterior: comissao.percentualComissao,
    percentualNovo: 0,
    tipoAcao: 'Deleção',
    createdAt: new Date().toISOString()
  };
  historicoComissoes.push(historico);
  
  comissoesPorLoja = comissoesPorLoja.filter(c => c.id !== id);
  
  persistirDados();
  return true;
};

// Histórico
export const getHistoricoComissaoPorLoja = (comissaoId: string): HistoricoComissaoPorLoja[] => {
  return historicoComissoes
    .filter(h => h.comissaoId === comissaoId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getAllHistoricoComissoes = (): HistoricoComissaoPorLoja[] => {
  return [...historicoComissoes].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// Helpers para exibição
export const getComissaoPorLojaComDetalhes = () => {
  return comissoesPorLoja.map(c => {
    const loja = getLojaById(c.lojaId);
    const cargoNome = getCargoNome(c.cargoId);
    return {
      ...c,
      lojaNome: loja?.nome || c.lojaId,
      cargoNome
    };
  });
};

// Buscar comissão do colaborador baseado em sua loja e cargo
export const getComissaoColaboradorPorLoja = (lojaId: string, cargoId: string): number => {
  const comissao = getComissaoPorLojaECargo(lojaId, cargoId);
  return comissao?.percentualComissao || 0;
};
