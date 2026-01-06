// API para gerenciamento de planos de garantia

export interface PlanoGarantia {
  id: string;
  nome: string;
  tipo: 'Apple' | 'Thiago Imports';
  meses: number;
  valor: number;
  modelos: string[];
  descricao: string;
  status: 'Ativo' | 'Inativo';
}

// Dados mock de planos de garantia
let planos: PlanoGarantia[] = [
  {
    id: 'PLAN-001',
    nome: 'Apple Care+ Standard',
    tipo: 'Apple',
    meses: 12,
    valor: 0,
    modelos: ['iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max'],
    descricao: 'Garantia Apple padrão de fábrica',
    status: 'Ativo'
  },
  {
    id: 'PLAN-002',
    nome: 'Proteção Thiago Basic',
    tipo: 'Thiago Imports',
    meses: 3,
    valor: 99,
    modelos: ['iPhone 12', 'iPhone 12 Mini', 'iPhone 11', 'iPhone XS', 'iPhone XR', 'iPhone X'],
    descricao: 'Proteção básica de 3 meses para seminovos',
    status: 'Ativo'
  },
  {
    id: 'PLAN-003',
    nome: 'Proteção Thiago Standard',
    tipo: 'Thiago Imports',
    meses: 6,
    valor: 179,
    modelos: ['iPhone 12', 'iPhone 12 Mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max', 'iPhone 13', 'iPhone 13 Mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max'],
    descricao: 'Proteção intermediária de 6 meses',
    status: 'Ativo'
  },
  {
    id: 'PLAN-004',
    nome: 'Proteção Thiago Gold',
    tipo: 'Thiago Imports',
    meses: 12,
    valor: 299,
    modelos: ['iPhone 13', 'iPhone 13 Mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max', 'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max'],
    descricao: 'Proteção premium de 12 meses com cobertura estendida',
    status: 'Ativo'
  },
  {
    id: 'PLAN-005',
    nome: 'Sem Garantia Adicional',
    tipo: 'Thiago Imports',
    meses: 0,
    valor: 0,
    modelos: [],
    descricao: 'Produto vendido sem garantia adicional',
    status: 'Ativo'
  }
];

let planoCounter = 6;

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

export const getPlanosPorModelo = (modelo: string): PlanoGarantia[] => {
  return planos.filter(p => 
    p.status === 'Ativo' && 
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
