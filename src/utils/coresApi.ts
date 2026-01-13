// Cores de Aparelhos API - Mock Data

export interface CorAparelho {
  id: string;
  nome: string;
  hexadecimal: string;
  status: 'Ativo' | 'Inativo';
}

// Cores Apple pré-preenchidas
let cores: CorAparelho[] = [
  { id: 'COR-001', nome: 'Preto', hexadecimal: '#000000', status: 'Ativo' },
  { id: 'COR-002', nome: 'Branco', hexadecimal: '#FFFFFF', status: 'Ativo' },
  { id: 'COR-003', nome: 'Prata', hexadecimal: '#C0C0C0', status: 'Ativo' },
  { id: 'COR-004', nome: 'Ouro', hexadecimal: '#FFD700', status: 'Ativo' },
  { id: 'COR-005', nome: 'Ouro Rosa', hexadecimal: '#B76E79', status: 'Ativo' },
  { id: 'COR-006', nome: 'Azul', hexadecimal: '#007AFF', status: 'Ativo' },
  { id: 'COR-007', nome: 'Azul Sierra', hexadecimal: '#69ABE5', status: 'Ativo' },
  { id: 'COR-008', nome: 'Azul Pacífico', hexadecimal: '#184E77', status: 'Ativo' },
  { id: 'COR-009', nome: 'Azul Ultramar', hexadecimal: '#2E4A87', status: 'Ativo' },
  { id: 'COR-010', nome: 'Vermelho (PRODUCT)RED', hexadecimal: '#FF0000', status: 'Ativo' },
  { id: 'COR-011', nome: 'Verde', hexadecimal: '#34C759', status: 'Ativo' },
  { id: 'COR-012', nome: 'Verde Alpino', hexadecimal: '#5E8C61', status: 'Ativo' },
  { id: 'COR-013', nome: 'Verde Meia-Noite', hexadecimal: '#1D3C34', status: 'Ativo' },
  { id: 'COR-014', nome: 'Roxo', hexadecimal: '#AF52DE', status: 'Ativo' },
  { id: 'COR-015', nome: 'Roxo Profundo', hexadecimal: '#1D1D3F', status: 'Ativo' },
  { id: 'COR-016', nome: 'Laranja', hexadecimal: '#FF9500', status: 'Ativo' },
  { id: 'COR-017', nome: 'Rosa', hexadecimal: '#FF2D55', status: 'Ativo' },
  { id: 'COR-018', nome: 'Cinza Espacial', hexadecimal: '#4A4A4A', status: 'Ativo' },
  { id: 'COR-019', nome: 'Grafite', hexadecimal: '#41424C', status: 'Ativo' },
  { id: 'COR-020', nome: 'Titânio Natural', hexadecimal: '#BEB8AE', status: 'Ativo' },
  { id: 'COR-021', nome: 'Titânio Preto', hexadecimal: '#3C3C3D', status: 'Ativo' },
  { id: 'COR-022', nome: 'Titânio Branco', hexadecimal: '#F0F0EC', status: 'Ativo' },
  { id: 'COR-023', nome: 'Titânio Azul', hexadecimal: '#394C60', status: 'Ativo' },
  { id: 'COR-024', nome: 'Estelar', hexadecimal: '#FAF7F2', status: 'Ativo' },
  { id: 'COR-025', nome: 'Meia-Noite', hexadecimal: '#2C2C2E', status: 'Ativo' },
  { id: 'COR-026', nome: 'Amarelo', hexadecimal: '#FFCC00', status: 'Ativo' },
  { id: 'COR-027', nome: 'Coral', hexadecimal: '#FF6F61', status: 'Ativo' },
];

// API Functions
export const getCores = () => [...cores];

export const getCorById = (id: string) => cores.find(c => c.id === id);

export const addCor = (cor: Omit<CorAparelho, 'id'>) => {
  const newId = `COR-${String(cores.length + 1).padStart(3, '0')}`;
  const newCor = { ...cor, id: newId };
  cores.push(newCor);
  return newCor;
};

export const updateCor = (id: string, updates: Partial<CorAparelho>) => {
  const index = cores.findIndex(c => c.id === id);
  if (index !== -1) {
    cores[index] = { ...cores[index], ...updates };
    return cores[index];
  }
  return null;
};

export const deleteCor = (id: string) => {
  cores = cores.filter(c => c.id !== id);
};

// Validar código hexadecimal
export const isValidHex = (hex: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
};
