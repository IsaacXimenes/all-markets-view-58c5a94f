// API de Valores Recomendados para Trade-In / Base de Troca

import { useAuthStore } from '@/store/authStore';

export interface ValorRecomendadoTroca {
  id: string;
  modelo: string;
  marca: string;
  condicao: 'Novo' | 'Semi-novo';
  valorMin: number;
  valorMax: number;
  valorSugerido: number;
  ultimaAtualizacao: string;
}

export interface LogValorTroca {
  id: string;
  tipo: 'criacao' | 'edicao' | 'exclusao';
  modelo: string;
  usuario: string;
  dataHora: string;
  detalhes: string;
}

// Tabela mock de valores recomendados para compra de aparelhos usados
let valoresRecomendados: ValorRecomendadoTroca[] = [
  // iPhones
  { id: 'VR-001', modelo: 'iPhone 16 Pro Max', marca: 'Apple', condicao: 'Novo', valorMin: 7500, valorMax: 8500, valorSugerido: 8000, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-002', modelo: 'iPhone 16 Pro Max', marca: 'Apple', condicao: 'Semi-novo', valorMin: 6500, valorMax: 7500, valorSugerido: 7000, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-003', modelo: 'iPhone 16 Pro', marca: 'Apple', condicao: 'Novo', valorMin: 6500, valorMax: 7500, valorSugerido: 7000, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-004', modelo: 'iPhone 16 Pro', marca: 'Apple', condicao: 'Semi-novo', valorMin: 5500, valorMax: 6500, valorSugerido: 6000, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-005', modelo: 'iPhone 16', marca: 'Apple', condicao: 'Novo', valorMin: 4800, valorMax: 5500, valorSugerido: 5200, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-006', modelo: 'iPhone 16', marca: 'Apple', condicao: 'Semi-novo', valorMin: 4000, valorMax: 4800, valorSugerido: 4400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-007', modelo: 'iPhone 15 Pro Max', marca: 'Apple', condicao: 'Novo', valorMin: 6000, valorMax: 7000, valorSugerido: 6500, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-008', modelo: 'iPhone 15 Pro Max', marca: 'Apple', condicao: 'Semi-novo', valorMin: 5000, valorMax: 6000, valorSugerido: 5500, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-009', modelo: 'iPhone 15 Pro', marca: 'Apple', condicao: 'Novo', valorMin: 5200, valorMax: 6200, valorSugerido: 5700, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-010', modelo: 'iPhone 15 Pro', marca: 'Apple', condicao: 'Semi-novo', valorMin: 4200, valorMax: 5200, valorSugerido: 4700, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-011', modelo: 'iPhone 15', marca: 'Apple', condicao: 'Novo', valorMin: 3800, valorMax: 4500, valorSugerido: 4200, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-012', modelo: 'iPhone 15', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3000, valorMax: 3800, valorSugerido: 3400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-013', modelo: 'iPhone 14 Pro Max', marca: 'Apple', condicao: 'Semi-novo', valorMin: 4000, valorMax: 5000, valorSugerido: 4500, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-014', modelo: 'iPhone 14 Pro', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3500, valorMax: 4300, valorSugerido: 3900, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-015', modelo: 'iPhone 14', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2500, valorMax: 3200, valorSugerido: 2800, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-016', modelo: 'iPhone 13 Pro Max', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3200, valorMax: 4000, valorSugerido: 3600, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-017', modelo: 'iPhone 13', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2000, valorMax: 2700, valorSugerido: 2300, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-018', modelo: 'iPhone 12', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1500, valorMax: 2000, valorSugerido: 1700, ultimaAtualizacao: '2025-12-01' },
  // Samsung
  { id: 'VR-019', modelo: 'Samsung Galaxy S24 Ultra', marca: 'Samsung', condicao: 'Novo', valorMin: 5500, valorMax: 6500, valorSugerido: 6000, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-020', modelo: 'Samsung Galaxy S24 Ultra', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 4500, valorMax: 5500, valorSugerido: 5000, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-021', modelo: 'Samsung Galaxy S24+', marca: 'Samsung', condicao: 'Novo', valorMin: 4000, valorMax: 4800, valorSugerido: 4400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-022', modelo: 'Samsung Galaxy S24+', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 3200, valorMax: 4000, valorSugerido: 3600, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-023', modelo: 'Samsung Galaxy S24', marca: 'Samsung', condicao: 'Novo', valorMin: 3000, valorMax: 3700, valorSugerido: 3400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-024', modelo: 'Samsung Galaxy S24', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 2300, valorMax: 3000, valorSugerido: 2600, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-025', modelo: 'Samsung Galaxy S23 Ultra', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 3500, valorMax: 4300, valorSugerido: 3900, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-026', modelo: 'Samsung Galaxy Z Flip 5', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 2500, valorMax: 3200, valorSugerido: 2800, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-027', modelo: 'Samsung Galaxy Z Fold 5', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 4500, valorMax: 5500, valorSugerido: 5000, ultimaAtualizacao: '2025-12-01' },
  // Xiaomi
  { id: 'VR-028', modelo: 'Xiaomi 14 Ultra', marca: 'Xiaomi', condicao: 'Novo', valorMin: 4000, valorMax: 4800, valorSugerido: 4400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-029', modelo: 'Xiaomi 14 Ultra', marca: 'Xiaomi', condicao: 'Semi-novo', valorMin: 3200, valorMax: 4000, valorSugerido: 3600, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-030', modelo: 'Xiaomi 14', marca: 'Xiaomi', condicao: 'Novo', valorMin: 2800, valorMax: 3500, valorSugerido: 3100, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-031', modelo: 'Xiaomi 14', marca: 'Xiaomi', condicao: 'Semi-novo', valorMin: 2200, valorMax: 2800, valorSugerido: 2500, ultimaAtualizacao: '2025-12-01' },
];

let logsValorTroca: LogValorTroca[] = [];

let nextId = 32;

const gerarId = (): string => {
  const id = `VR-${String(nextId).padStart(3, '0')}`;
  nextId++;
  return id;
};

const gerarLogId = (): string => {
  return `LOG-VT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
};

const getUsuarioLogado = (): string => {
  try {
    const state = useAuthStore.getState();
    return state.user?.colaborador?.nome || state.user?.username || 'Sistema';
  } catch {
    return 'Sistema';
  }
};

const registrarLog = (tipo: LogValorTroca['tipo'], modelo: string, detalhes: string) => {
  logsValorTroca.unshift({
    id: gerarLogId(),
    tipo,
    modelo,
    usuario: getUsuarioLogado(),
    dataHora: new Date().toISOString(),
    detalhes,
  });
};

// CRUD
export const getValoresRecomendadosTroca = (): ValorRecomendadoTroca[] => {
  return [...valoresRecomendados];
};

export const getValorRecomendado = (modelo: string, condicao: 'Novo' | 'Semi-novo'): ValorRecomendadoTroca | null => {
  return valoresRecomendados.find(
    v => v.modelo.toLowerCase() === modelo.toLowerCase() && v.condicao === condicao
  ) || null;
};

export const buscarValoresRecomendados = (busca: string): ValorRecomendadoTroca[] => {
  if (!busca.trim()) return [...valoresRecomendados];
  const termo = busca.toLowerCase();
  return valoresRecomendados.filter(
    v => v.modelo.toLowerCase().includes(termo) || v.marca.toLowerCase().includes(termo)
  );
};

export const criarValorRecomendado = (dados: Omit<ValorRecomendadoTroca, 'id' | 'ultimaAtualizacao'>): ValorRecomendadoTroca => {
  const novo: ValorRecomendadoTroca = {
    ...dados,
    id: gerarId(),
    ultimaAtualizacao: new Date().toISOString().split('T')[0],
  };
  valoresRecomendados.push(novo);
  registrarLog('criacao', novo.modelo, `Criado valor para ${novo.modelo} (${novo.condicao}): Min R$${novo.valorMin}, Max R$${novo.valorMax}, Sugerido R$${novo.valorSugerido}`);
  return novo;
};

export const editarValorRecomendado = (id: string, dados: Partial<Omit<ValorRecomendadoTroca, 'id'>>): ValorRecomendadoTroca | null => {
  const idx = valoresRecomendados.findIndex(v => v.id === id);
  if (idx === -1) return null;
  const anterior = { ...valoresRecomendados[idx] };
  const alteracoes: string[] = [];
  
  if (dados.valorMin !== undefined && dados.valorMin !== anterior.valorMin) alteracoes.push(`Val.Min: R$${anterior.valorMin} → R$${dados.valorMin}`);
  if (dados.valorMax !== undefined && dados.valorMax !== anterior.valorMax) alteracoes.push(`Val.Max: R$${anterior.valorMax} → R$${dados.valorMax}`);
  if (dados.valorSugerido !== undefined && dados.valorSugerido !== anterior.valorSugerido) alteracoes.push(`Val.Sugerido: R$${anterior.valorSugerido} → R$${dados.valorSugerido}`);
  if (dados.condicao !== undefined && dados.condicao !== anterior.condicao) alteracoes.push(`Condição: ${anterior.condicao} → ${dados.condicao}`);
  if (dados.modelo !== undefined && dados.modelo !== anterior.modelo) alteracoes.push(`Modelo: ${anterior.modelo} → ${dados.modelo}`);
  if (dados.marca !== undefined && dados.marca !== anterior.marca) alteracoes.push(`Marca: ${anterior.marca} → ${dados.marca}`);

  valoresRecomendados[idx] = { ...anterior, ...dados, ultimaAtualizacao: new Date().toISOString().split('T')[0] };
  
  if (alteracoes.length > 0) {
    registrarLog('edicao', valoresRecomendados[idx].modelo, alteracoes.join('; '));
  }
  return valoresRecomendados[idx];
};

export const excluirValorRecomendado = (id: string): boolean => {
  const idx = valoresRecomendados.findIndex(v => v.id === id);
  if (idx === -1) return false;
  const removido = valoresRecomendados[idx];
  valoresRecomendados.splice(idx, 1);
  registrarLog('exclusao', removido.modelo, `Removido valor para ${removido.modelo} (${removido.condicao})`);
  return true;
};

// Logs
export const getLogsValorTroca = (): LogValorTroca[] => {
  return [...logsValorTroca];
};

// Exportar CSV
export const exportarValoresCSV = (): string => {
  const header = 'ID,Modelo,Marca,Condição,Valor Mín,Valor Máx,Valor Sugerido,Última Atualização\n';
  const rows = valoresRecomendados.map(v =>
    `${v.id},${v.modelo},${v.marca},${v.condicao},${v.valorMin},${v.valorMax},${v.valorSugerido},${v.ultimaAtualizacao}`
  ).join('\n');
  return header + rows;
};
