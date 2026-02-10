// API de Acessórios - Gerenciamento de estoque de acessórios

// Sistema centralizado de IDs para acessórios
let globalAcessorioIdCounter = 100;
const registeredAcessorioIds = new Set<string>();

const initializeAcessorioIds = (existingIds: string[]) => {
  existingIds.forEach(id => registeredAcessorioIds.add(id));
  existingIds.forEach(id => {
    const match = id.match(/ACESS-(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= globalAcessorioIdCounter) {
        globalAcessorioIdCounter = num + 1;
      }
    }
  });
};

const generateAcessorioId = (): string => {
  let newId: string;
  do {
    newId = `ACESS-${String(globalAcessorioIdCounter).padStart(4, '0')}`;
    globalAcessorioIdCounter++;
  } while (registeredAcessorioIds.has(newId));
  
  registeredAcessorioIds.add(newId);
  return newId;
};

export const isAcessorioIdRegistered = (id: string): boolean => {
  return registeredAcessorioIds.has(id);
};

export interface HistoricoValorRecomendadoAcessorio {
  data: string;
  usuario: string;
  valorAntigo: number | null;
  valorNovo: number;
}

export interface Acessorio {
  id: string;
  descricao: string;
  categoria: string;
  quantidade: number;
  valorCusto: number;
  valorRecomendado?: number;
  historicoValorRecomendado?: HistoricoValorRecomendadoAcessorio[];
  loja: string;
}

export interface VendaAcessorio {
  id: string;
  acessorioId: string;
  descricao: string;
  quantidade: number;
  valorRecomendado: number;
  valorUnitario: number;
  valorTotal: number;
}

// Dados mockados de acessórios
// UUIDs reais do useCadastroStore:
// Lojas: 3ac7e00c (Matriz), db894e7d (JK Shopping), 5b9446d5 (Shopping Sul), 0d06e7db (Águas Lindas)
let acessorios: Acessorio[] = [
  {
    id: 'ACESS-0001',
    descricao: 'Capa iPhone 15',
    categoria: 'Capas',
    quantidade: 25,
    valorCusto: 45.00,
    valorRecomendado: 89.90,
    loja: '3ac7e00c'
  },
  {
    id: 'ACESS-0002',
    descricao: 'Carregador USB-C 20W',
    categoria: 'Carregadores',
    quantidade: 18,
    valorCusto: 89.00,
    valorRecomendado: 149.90,
    loja: '3ac7e00c'
  },
  {
    id: 'ACESS-0003',
    descricao: 'Fone de Ouvido Bluetooth',
    categoria: 'Áudio',
    quantidade: 8,
    valorCusto: 120.00,
    valorRecomendado: 249.90,
    loja: '0d06e7db'
  },
  {
    id: 'ACESS-0004',
    descricao: 'Película Vidro iPhone 14',
    categoria: 'Películas',
    quantidade: 32,
    valorCusto: 25.00,
    valorRecomendado: 49.90,
    loja: 'db894e7d'
  },
  {
    id: 'ACESS-0005',
    descricao: 'Cabo Lightning 1m',
    categoria: 'Cabos',
    quantidade: 5,
    valorCusto: 35.00,
    valorRecomendado: 69.90,
    loja: '5b9446d5'
  }
];

// Inicializar IDs existentes
initializeAcessorioIds(acessorios.map(a => a.id));

// Categorias de acessórios
const categoriasAcessorios = [
  'Capas',
  'Carregadores',
  'Cabos',
  'Películas',
  'Áudio',
  'Suportes',
  'Baterias Externas',
  'Outros'
];

// Funções de API
export const getAcessorios = (): Acessorio[] => {
  return [...acessorios];
};

export const getAcessorioById = (id: string): Acessorio | null => {
  return acessorios.find(a => a.id === id) || null;
};

export const getAcessoriosByLoja = (loja: string): Acessorio[] => {
  return acessorios.filter(a => a.loja === loja);
};

export const getCategoriasAcessorios = (): string[] => {
  return [...categoriasAcessorios];
};

export const updateAcessorioQuantidade = (id: string, novaQuantidade: number): Acessorio | null => {
  const acessorio = acessorios.find(a => a.id === id);
  if (!acessorio) return null;
  acessorio.quantidade = novaQuantidade;
  return acessorio;
};

export const subtrairEstoqueAcessorio = (id: string, quantidade: number): boolean => {
  const acessorio = acessorios.find(a => a.id === id);
  if (!acessorio || acessorio.quantidade < quantidade) return false;
  acessorio.quantidade -= quantidade;
  return true;
};

export const adicionarEstoqueAcessorio = (id: string, quantidade: number, valorCusto?: number): boolean => {
  const acessorio = acessorios.find(a => a.id === id);
  if (acessorio) {
    acessorio.quantidade += quantidade;
    if (valorCusto !== undefined) {
      acessorio.valorCusto = valorCusto;
    }
    return true;
  }
  return false;
};

export const addAcessorio = (acessorio: Omit<Acessorio, 'id'>): Acessorio => {
  const newId = generateAcessorioId();
  const novoAcessorio: Acessorio = { ...acessorio, id: newId };
  acessorios.push(novoAcessorio);
  return novoAcessorio;
};

// Buscar ou criar acessório por descrição
export const getOrCreateAcessorio = (
  descricao: string, 
  categoria: string, 
  quantidade: number, 
  valorCusto: number,
  loja: string
): Acessorio => {
  // Buscar acessório existente pela descrição
  const existente = acessorios.find(
    a => a.descricao.toLowerCase() === descricao.toLowerCase() && a.loja === loja
  );
  
  if (existente) {
    // Soma a quantidade
    existente.quantidade += quantidade;
    existente.valorCusto = valorCusto; // Atualiza custo
    return existente;
  }
  
  // Criar novo acessório
  return addAcessorio({
    descricao,
    categoria,
    quantidade,
    valorCusto,
    loja
  });
};

// formatCurrency removido - usar import { formatCurrency } from '@/utils/formatUtils'
export { formatCurrency } from '@/utils/formatUtils';

export const updateValorRecomendadoAcessorio = (
  id: string,
  novoValor: number,
  usuario: string
): Acessorio | null => {
  const acessorio = acessorios.find(a => a.id === id);
  if (!acessorio) return null;

  const historicoEntry: HistoricoValorRecomendadoAcessorio = {
    data: new Date().toISOString().split('T')[0],
    usuario,
    valorAntigo: acessorio.valorRecomendado || null,
    valorNovo: novoValor
  };

  acessorio.valorRecomendado = novoValor;
  if (!acessorio.historicoValorRecomendado) {
    acessorio.historicoValorRecomendado = [];
  }
  acessorio.historicoValorRecomendado.unshift(historicoEntry);

  return acessorio;
};

export const exportAcessoriosToCSV = (data: Acessorio[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = ['ID', 'Descrição', 'Categoria', 'Quantidade', 'Valor Custo', 'Valor Recomendado', 'Loja'];
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.id,
      `"${row.descricao}"`,
      row.categoria,
      row.quantidade,
      row.valorCusto.toFixed(2),
      row.valorRecomendado?.toFixed(2) || '',
      row.loja
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
