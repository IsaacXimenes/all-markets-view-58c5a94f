// Salário Colaborador API - Mock Data
// TODO: Integrar com Supabase - substituir mock por query real

import { getColaboradores, Colaborador } from './cadastrosApi';
import { getComissaoColaboradorPorLoja } from './comissaoPorLojaApi';

export interface SalarioColaborador {
  id: string;
  colaboradorId: string;
  salarioFixo: number;
  ajudaCusto: number;
  percentualComissao: number; // 0-100 com até 2 casas decimais
  createdAt: string;
  updatedAt: string;
}

export interface HistoricoSalario {
  id: string;
  salarioId: string;
  colaboradorId: string;
  usuarioId: string;
  usuarioNome: string;
  campoAlterado: 'Salário Fixo' | 'Ajuda de Custo' | 'Comissão';
  valorAnterior: string | null;
  valorNovo: string;
  tipoAcao: 'Criação' | 'Edição';
  createdAt: string;
}

const STORAGE_KEY = 'thiago_imports_salarios_colaboradores';
const HISTORICO_KEY = 'thiago_imports_historico_salarios';

// Inicializar dados mockados
const inicializarSalarios = (): SalarioColaborador[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Criar salários iniciais baseados nos colaboradores existentes
  const colaboradores = getColaboradores();
  const salariosIniciais: SalarioColaborador[] = colaboradores.map((col, index) => ({
    id: `SAL-${String(index + 1).padStart(3, '0')}`,
    colaboradorId: col.id,
    salarioFixo: col.salario || 2500,
    ajudaCusto: Math.floor(Math.random() * 500), // 0-500
    percentualComissao: Math.floor(Math.random() * 10) + 3, // 3-13%
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(salariosIniciais));
  return salariosIniciais;
};

let salarios: SalarioColaborador[] = inicializarSalarios();

// Inicializar histórico
let historicoSalarios: HistoricoSalario[] = (() => {
  const stored = localStorage.getItem(HISTORICO_KEY);
  return stored ? JSON.parse(stored) : [];
})();

const persistirDados = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(salarios));
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(historicoSalarios));
};

// CRUD Operations
export const getSalarios = (): SalarioColaborador[] => {
  return [...salarios];
};

export const getSalarioById = (id: string): SalarioColaborador | undefined => {
  return salarios.find(s => s.id === id);
};

export const getSalarioByColaboradorId = (colaboradorId: string): SalarioColaborador | undefined => {
  return salarios.find(s => s.colaboradorId === colaboradorId);
};

export const addSalario = (
  colaboradorId: string,
  salarioFixo: number,
  ajudaCusto: number,
  percentualComissao: number,
  usuarioId: string = 'SISTEMA',
  usuarioNome: string = 'Sistema'
): SalarioColaborador => {
  // Verificar se já existe
  const existente = getSalarioByColaboradorId(colaboradorId);
  if (existente) {
    throw new Error('Já existe um salário configurado para este colaborador');
  }

  const newId = `SAL-${String(salarios.length + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();
  
  const novoSalario: SalarioColaborador = {
    id: newId,
    colaboradorId,
    salarioFixo,
    ajudaCusto,
    percentualComissao,
    createdAt: now,
    updatedAt: now
  };
  
  salarios.push(novoSalario);
  
  // Registrar histórico para cada campo
  const camposHistorico: Array<{ campo: 'Salário Fixo' | 'Ajuda de Custo' | 'Comissão'; valor: string }> = [
    { campo: 'Salário Fixo', valor: `R$ ${salarioFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { campo: 'Ajuda de Custo', valor: `R$ ${ajudaCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { campo: 'Comissão', valor: `${percentualComissao}%` }
  ];
  
  camposHistorico.forEach(({ campo, valor }) => {
    historicoSalarios.push({
      id: `HSAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      salarioId: newId,
      colaboradorId,
      usuarioId,
      usuarioNome,
      campoAlterado: campo,
      valorAnterior: null,
      valorNovo: valor,
      tipoAcao: 'Criação',
      createdAt: now
    });
  });
  
  persistirDados();
  return novoSalario;
};

export const updateSalario = (
  colaboradorId: string,
  updates: Partial<Pick<SalarioColaborador, 'salarioFixo' | 'ajudaCusto' | 'percentualComissao'>>,
  usuarioId: string = 'SISTEMA',
  usuarioNome: string = 'Sistema'
): SalarioColaborador | null => {
  const index = salarios.findIndex(s => s.colaboradorId === colaboradorId);
  if (index === -1) return null;
  
  const salarioAtual = salarios[index];
  const now = new Date().toISOString();
  
  // Registrar histórico para campos alterados
  if (updates.salarioFixo !== undefined && updates.salarioFixo !== salarioAtual.salarioFixo) {
    historicoSalarios.push({
      id: `HSAL-${Date.now()}-sf`,
      salarioId: salarioAtual.id,
      colaboradorId,
      usuarioId,
      usuarioNome,
      campoAlterado: 'Salário Fixo',
      valorAnterior: `R$ ${salarioAtual.salarioFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      valorNovo: `R$ ${updates.salarioFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      tipoAcao: 'Edição',
      createdAt: now
    });
  }
  
  if (updates.ajudaCusto !== undefined && updates.ajudaCusto !== salarioAtual.ajudaCusto) {
    historicoSalarios.push({
      id: `HSAL-${Date.now()}-ac`,
      salarioId: salarioAtual.id,
      colaboradorId,
      usuarioId,
      usuarioNome,
      campoAlterado: 'Ajuda de Custo',
      valorAnterior: `R$ ${salarioAtual.ajudaCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      valorNovo: `R$ ${updates.ajudaCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      tipoAcao: 'Edição',
      createdAt: now
    });
  }
  
  if (updates.percentualComissao !== undefined && updates.percentualComissao !== salarioAtual.percentualComissao) {
    historicoSalarios.push({
      id: `HSAL-${Date.now()}-pc`,
      salarioId: salarioAtual.id,
      colaboradorId,
      usuarioId,
      usuarioNome,
      campoAlterado: 'Comissão',
      valorAnterior: `${salarioAtual.percentualComissao}%`,
      valorNovo: `${updates.percentualComissao}%`,
      tipoAcao: 'Edição',
      createdAt: now
    });
  }
  
  salarios[index] = {
    ...salarioAtual,
    ...updates,
    updatedAt: now
  };
  
  persistirDados();
  return salarios[index];
};

export const deleteSalario = (colaboradorId: string): boolean => {
  const initialLength = salarios.length;
  salarios = salarios.filter(s => s.colaboradorId !== colaboradorId);
  persistirDados();
  return salarios.length < initialLength;
};

// Histórico
export const getHistoricoSalario = (colaboradorId: string): HistoricoSalario[] => {
  return historicoSalarios
    .filter(h => h.colaboradorId === colaboradorId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getAllHistoricoSalarios = (): HistoricoSalario[] => {
  return [...historicoSalarios].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// Helper para obter salário com dados do colaborador
export interface SalarioComColaborador extends SalarioColaborador {
  colaborador: Colaborador;
  comissaoPorLoja?: number;
}

export const getSalariosComColaboradores = (): SalarioComColaborador[] => {
  const colaboradores = getColaboradores();
  const result: SalarioComColaborador[] = [];
  
  for (const s of salarios) {
    const colaborador = colaboradores.find(c => c.id === s.colaboradorId);
    if (!colaborador) continue;
    
    // Buscar comissão por loja se aplicável (ex: gerente)
    const comissaoPorLoja = getComissaoColaboradorPorLoja(colaborador.loja, colaborador.cargo);
    
    result.push({
      ...s,
      colaborador,
      comissaoPorLoja: comissaoPorLoja > 0 ? comissaoPorLoja : undefined
    });
  }
  
  return result;
};
