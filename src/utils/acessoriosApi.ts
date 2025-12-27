// API de Acessórios - Gerenciamento de estoque de acessórios

export interface Acessorio {
  id: string;
  descricao: string;
  categoria: string;
  quantidade: number;
  valorCusto: number;
  loja: string;
}

export interface VendaAcessorio {
  id: string;
  acessorioId: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

// Dados mockados de acessórios
let acessorios: Acessorio[] = [
  {
    id: 'ACESS-001',
    descricao: 'Capa iPhone 15',
    categoria: 'Capas',
    quantidade: 25,
    valorCusto: 45.00,
    loja: 'Loja Centro'
  },
  {
    id: 'ACESS-002',
    descricao: 'Carregador USB-C 20W',
    categoria: 'Carregadores',
    quantidade: 18,
    valorCusto: 89.00,
    loja: 'Loja Centro'
  },
  {
    id: 'ACESS-003',
    descricao: 'Fone de Ouvido Bluetooth',
    categoria: 'Áudio',
    quantidade: 8,
    valorCusto: 120.00,
    loja: 'Loja Shopping'
  },
  {
    id: 'ACESS-004',
    descricao: 'Película Vidro iPhone 14',
    categoria: 'Películas',
    quantidade: 32,
    valorCusto: 25.00,
    loja: 'Loja Norte'
  },
  {
    id: 'ACESS-005',
    descricao: 'Cabo Lightning 1m',
    categoria: 'Cabos',
    quantidade: 5,
    valorCusto: 35.00,
    loja: 'Loja Sul'
  }
];

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
  const num = acessorios.length + 1;
  const newId = `ACESS-${String(num).padStart(3, '0')}`;
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

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const exportAcessoriosToCSV = (data: Acessorio[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = ['ID', 'Descrição', 'Categoria', 'Quantidade', 'Valor Custo', 'Loja'];
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.id,
      `"${row.descricao}"`,
      row.categoria,
      row.quantidade,
      row.valorCusto.toFixed(2),
      row.loja
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
