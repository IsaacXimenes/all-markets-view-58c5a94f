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
  { id: 'VR-001', modelo: 'iPhone 7 – 32 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 50, valorMax: 50, valorSugerido: 50, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-002', modelo: 'iPhone 7 Plus – 32 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 100, valorMax: 100, valorSugerido: 100, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-003', modelo: 'iPhone 7 Plus – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 200, valorMax: 200, valorSugerido: 200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-004', modelo: 'iPhone 8 – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 50, valorMax: 50, valorSugerido: 50, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-005', modelo: 'iPhone 8 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 100, valorMax: 100, valorSugerido: 100, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-006', modelo: 'iPhone 8 Plus – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 200, valorMax: 200, valorSugerido: 200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-007', modelo: 'iPhone 8 Plus – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 300, valorMax: 300, valorSugerido: 300, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-008', modelo: 'iPhone X – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 200, valorMax: 200, valorSugerido: 200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-009', modelo: 'iPhone X – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 400, valorMax: 400, valorSugerido: 400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-010', modelo: 'iPhone XR – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 400, valorMax: 400, valorSugerido: 400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-011', modelo: 'iPhone XR – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 500, valorMax: 500, valorSugerido: 500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-012', modelo: 'iPhone XR – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 600, valorMax: 600, valorSugerido: 600, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-013', modelo: 'iPhone XS Max – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 500, valorMax: 500, valorSugerido: 500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-014', modelo: 'iPhone XS Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 700, valorMax: 700, valorSugerido: 700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-015', modelo: 'iPhone 11 – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 600, valorMax: 600, valorSugerido: 600, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-016', modelo: 'iPhone 11 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 800, valorMax: 800, valorSugerido: 800, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-017', modelo: 'iPhone 11 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1000, valorMax: 1000, valorSugerido: 1000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-018', modelo: 'iPhone 11 Pro – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 900, valorMax: 900, valorSugerido: 900, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-019', modelo: 'iPhone 11 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1100, valorMax: 1100, valorSugerido: 1100, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-020', modelo: 'iPhone 11 Pro Max – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1000, valorMax: 1000, valorSugerido: 1000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-021', modelo: 'iPhone 11 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1200, valorMax: 1200, valorSugerido: 1200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-022', modelo: 'iPhone 11 Pro Max – 512 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1400, valorMax: 1400, valorSugerido: 1400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-023', modelo: 'iPhone 12 – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1200, valorMax: 1200, valorSugerido: 1200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-024', modelo: 'iPhone 12 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1300, valorMax: 1300, valorSugerido: 1300, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-025', modelo: 'iPhone 12 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1500, valorMax: 1500, valorSugerido: 1500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-026', modelo: 'iPhone 12 Pro – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1750, valorMax: 1750, valorSugerido: 1750, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-027', modelo: 'iPhone 12 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1900, valorMax: 1900, valorSugerido: 1900, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-028', modelo: 'iPhone 12 Pro Max – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2200, valorMax: 2200, valorSugerido: 2200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-029', modelo: 'iPhone 12 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2300, valorMax: 2300, valorSugerido: 2300, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-030', modelo: 'iPhone 12 Pro Max – 512 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2450, valorMax: 2450, valorSugerido: 2450, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-031', modelo: 'iPhone 13 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 1700, valorMax: 1700, valorSugerido: 1700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-032', modelo: 'iPhone 13 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2000, valorMax: 2000, valorSugerido: 2000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-033', modelo: 'iPhone 13 Pro – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2400, valorMax: 2400, valorSugerido: 2400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-034', modelo: 'iPhone 13 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2500, valorMax: 2500, valorSugerido: 2500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-035', modelo: 'iPhone 13 Pro Max – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2700, valorMax: 2700, valorSugerido: 2700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-036', modelo: 'iPhone 13 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2900, valorMax: 2900, valorSugerido: 2900, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-037', modelo: 'iPhone 14 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2000, valorMax: 2000, valorSugerido: 2000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-038', modelo: 'iPhone 14 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2200, valorMax: 2200, valorSugerido: 2200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-039', modelo: 'iPhone 14 Plus – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2150, valorMax: 2150, valorSugerido: 2150, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-040', modelo: 'iPhone 14 Plus – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2400, valorMax: 2400, valorSugerido: 2400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-041', modelo: 'iPhone 14 Pro – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2700, valorMax: 2700, valorSugerido: 2700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-042', modelo: 'iPhone 14 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2900, valorMax: 2900, valorSugerido: 2900, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-043', modelo: 'iPhone 14 Pro Max – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3200, valorMax: 3200, valorSugerido: 3200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-044', modelo: 'iPhone 14 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3400, valorMax: 3400, valorSugerido: 3400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-045', modelo: 'iPhone 15 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2700, valorMax: 2700, valorSugerido: 2700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-046', modelo: 'iPhone 15 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3000, valorMax: 3000, valorSugerido: 3000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-047', modelo: 'iPhone 15 Plus – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 2900, valorMax: 2900, valorSugerido: 2900, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-048', modelo: 'iPhone 15 Plus – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3300, valorMax: 3300, valorSugerido: 3300, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-049', modelo: 'iPhone 15 Pro – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3400, valorMax: 3400, valorSugerido: 3400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-050', modelo: 'iPhone 15 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3600, valorMax: 3600, valorSugerido: 3600, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-051', modelo: 'iPhone 15 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 4000, valorMax: 4000, valorSugerido: 4000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-052', modelo: 'iPhone 15 Pro Max – 512 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 4300, valorMax: 4300, valorSugerido: 4300, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-053', modelo: 'iPhone 16 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3500, valorMax: 3500, valorSugerido: 3500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-054', modelo: 'iPhone 16 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3800, valorMax: 3800, valorSugerido: 3800, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-055', modelo: 'iPhone 16 Plus – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 3700, valorMax: 3700, valorSugerido: 3700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-056', modelo: 'iPhone 16 Plus – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 4000, valorMax: 4000, valorSugerido: 4000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-057', modelo: 'iPhone 16 Pro – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 4500, valorMax: 4500, valorSugerido: 4500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-058', modelo: 'iPhone 16 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 4700, valorMax: 4700, valorSugerido: 4700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-059', modelo: 'iPhone 16 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 5400, valorMax: 5400, valorSugerido: 5400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-060', modelo: 'iPhone 16 Pro Max – 512 GB', marca: 'Apple', condicao: 'Semi-novo', valorMin: 5600, valorMax: 5600, valorSugerido: 5600, ultimaAtualizacao: '2026-02-23' },
  // Samsung
  { id: 'VR-061', modelo: 'Samsung Galaxy S24 Ultra', marca: 'Samsung', condicao: 'Novo', valorMin: 5500, valorMax: 6500, valorSugerido: 6000, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-062', modelo: 'Samsung Galaxy S24 Ultra', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 4500, valorMax: 5500, valorSugerido: 5000, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-063', modelo: 'Samsung Galaxy S24+', marca: 'Samsung', condicao: 'Novo', valorMin: 4000, valorMax: 4800, valorSugerido: 4400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-064', modelo: 'Samsung Galaxy S24+', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 3200, valorMax: 4000, valorSugerido: 3600, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-065', modelo: 'Samsung Galaxy S24', marca: 'Samsung', condicao: 'Novo', valorMin: 3000, valorMax: 3700, valorSugerido: 3400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-066', modelo: 'Samsung Galaxy S24', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 2300, valorMax: 3000, valorSugerido: 2600, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-067', modelo: 'Samsung Galaxy S23 Ultra', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 3500, valorMax: 4300, valorSugerido: 3900, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-068', modelo: 'Samsung Galaxy Z Flip 5', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 2500, valorMax: 3200, valorSugerido: 2800, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-069', modelo: 'Samsung Galaxy Z Fold 5', marca: 'Samsung', condicao: 'Semi-novo', valorMin: 4500, valorMax: 5500, valorSugerido: 5000, ultimaAtualizacao: '2025-12-01' },
  // Xiaomi
  { id: 'VR-070', modelo: 'Xiaomi 14 Ultra', marca: 'Xiaomi', condicao: 'Novo', valorMin: 4000, valorMax: 4800, valorSugerido: 4400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-071', modelo: 'Xiaomi 14 Ultra', marca: 'Xiaomi', condicao: 'Semi-novo', valorMin: 3200, valorMax: 4000, valorSugerido: 3600, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-072', modelo: 'Xiaomi 14', marca: 'Xiaomi', condicao: 'Novo', valorMin: 2800, valorMax: 3500, valorSugerido: 3100, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-073', modelo: 'Xiaomi 14', marca: 'Xiaomi', condicao: 'Semi-novo', valorMin: 2200, valorMax: 2800, valorSugerido: 2500, ultimaAtualizacao: '2025-12-01' },
];

let logsValorTroca: LogValorTroca[] = [];

let nextId = 74;

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
