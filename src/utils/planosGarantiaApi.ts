// API para gerenciamento de planos de garantia

export interface PlanoGarantia {
  id: string;
  nome: string;
  tipo: 'Apple' | 'Thiago Imports';
  condicao: 'Novo' | 'Seminovo' | 'Ambos';
  meses: number;
  valor: number;
  modelos: string[];
  descricao: string;
  status: 'Ativo' | 'Inativo';
}

// Modelos para cada categoria
const MODELOS_SEMINOVO_GERAL = [
  'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
  'iPhone 12', 'iPhone 12 Mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
  'iPhone 13', 'iPhone 13 Mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
  'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
  'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
  'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
  'iPhone XR'
];

const MODELOS_SEMINOVO_17 = [
  'iPhone 17', 'iPhone 17 Pro', 'iPhone 17 Pro Max'
];

const MODELOS_NOVO_GERAL = [
  'iPhone 13', 'iPhone 13 Mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
  'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
  'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
  'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max'
];

const MODELOS_NOVO_17 = [
  'iPhone 17', 'iPhone 17 Pro', 'iPhone 17 Pro Max'
];

// Dados mock de planos de garantia
let planos: PlanoGarantia[] = [
  // Silver Seminovo Geral - R$ 219,90
  {
    id: 'PLAN-001',
    nome: 'Silver',
    tipo: 'Thiago Imports',
    condicao: 'Seminovo',
    meses: 6,
    valor: 219.90,
    modelos: MODELOS_SEMINOVO_GERAL,
    descricao: 'Plano Silver 6 meses para seminovos',
    status: 'Ativo'
  },
  // Silver Seminovo iPhone 17 - R$ 249,90
  {
    id: 'PLAN-002',
    nome: 'Silver',
    tipo: 'Thiago Imports',
    condicao: 'Seminovo',
    meses: 6,
    valor: 249.90,
    modelos: MODELOS_SEMINOVO_17,
    descricao: 'Plano Silver 6 meses para iPhone 17 seminovos',
    status: 'Ativo'
  },
  // Silver Novo Geral - R$ 279,90
  {
    id: 'PLAN-003',
    nome: 'Silver',
    tipo: 'Thiago Imports',
    condicao: 'Novo',
    meses: 6,
    valor: 279.90,
    modelos: MODELOS_NOVO_GERAL,
    descricao: 'Plano Silver 6 meses para novos',
    status: 'Ativo'
  },
  // Silver Novo iPhone 17 - R$ 379,90
  {
    id: 'PLAN-004',
    nome: 'Silver',
    tipo: 'Thiago Imports',
    condicao: 'Novo',
    meses: 6,
    valor: 379.90,
    modelos: MODELOS_NOVO_17,
    descricao: 'Plano Silver 6 meses para iPhone 17 novos',
    status: 'Ativo'
  },
  // Gold Seminovo Geral - R$ 349,90
  {
    id: 'PLAN-005',
    nome: 'Gold',
    tipo: 'Thiago Imports',
    condicao: 'Seminovo',
    meses: 12,
    valor: 349.90,
    modelos: MODELOS_SEMINOVO_GERAL,
    descricao: 'Plano Gold 12 meses para seminovos',
    status: 'Ativo'
  },
  // Gold Seminovo iPhone 17 - R$ 379,90
  {
    id: 'PLAN-006',
    nome: 'Gold',
    tipo: 'Thiago Imports',
    condicao: 'Seminovo',
    meses: 12,
    valor: 379.90,
    modelos: MODELOS_SEMINOVO_17,
    descricao: 'Plano Gold 12 meses para iPhone 17 seminovos',
    status: 'Ativo'
  },
  // Gold Novo Geral - R$ 399,90
  {
    id: 'PLAN-007',
    nome: 'Gold',
    tipo: 'Thiago Imports',
    condicao: 'Novo',
    meses: 12,
    valor: 399.90,
    modelos: MODELOS_NOVO_GERAL,
    descricao: 'Plano Gold 12 meses para novos',
    status: 'Ativo'
  },
  // Gold Novo iPhone 17 - R$ 449,90
  {
    id: 'PLAN-008',
    nome: 'Gold',
    tipo: 'Thiago Imports',
    condicao: 'Novo',
    meses: 12,
    valor: 449.90,
    modelos: MODELOS_NOVO_17,
    descricao: 'Plano Gold 12 meses para iPhone 17 novos',
    status: 'Ativo'
  },
  // Sem Garantia Adicional
  {
    id: 'PLAN-009',
    nome: 'Sem Garantia Adicional',
    tipo: 'Thiago Imports',
    condicao: 'Ambos',
    meses: 0,
    valor: 0,
    modelos: [],
    descricao: 'Produto vendido sem garantia adicional',
    status: 'Ativo'
  }
];

let planoCounter = 10;

// Funções da API
export const getPlanosGarantia = (): PlanoGarantia[] => {
  return [...planos];
};

export const getPlanoById = (id: string): PlanoGarantia | null => {
  return planos.find(p => p.id === id) || null;
};

export const getPlanosAtivos = (): PlanoGarantia[] => {
  return planos.filter(p => p.status === 'Ativo');
};

export const getPlanosPorModelo = (modelo: string, condicao: 'Novo' | 'Seminovo'): PlanoGarantia[] => {
  return planos.filter(p => 
    p.status === 'Ativo' && 
    (p.condicao === condicao || p.condicao === 'Ambos') &&
    (p.modelos.length === 0 || p.modelos.some(m => modelo.toLowerCase().includes(m.toLowerCase())))
  );
};

export const addPlanoGarantia = (plano: Omit<PlanoGarantia, 'id'>): PlanoGarantia => {
  const novoPlano: PlanoGarantia = {
    ...plano,
    id: `PLAN-${String(planoCounter++).padStart(3, '0')}`
  };
  planos.push(novoPlano);
  return novoPlano;
};

export const updatePlanoGarantia = (id: string, updates: Partial<PlanoGarantia>): PlanoGarantia | null => {
  const index = planos.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  planos[index] = { ...planos[index], ...updates };
  return planos[index];
};

export const deletePlanoGarantia = (id: string): boolean => {
  const index = planos.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  planos.splice(index, 1);
  return true;
};

export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
