// API de Valores Recomendados para Trade-In / Base de Troca

import { useAuthStore } from '@/store/authStore';

export interface ValorRecomendadoTroca {
  id: string;
  modelo: string;
  marca: string;
  condicao: 'Semi-novo';
  valorSugerido: number;
  ultimaAtualizacao: string;
}

export interface LogValorTroca {
  id: string;
  valorId: string;
  tipo: 'criacao' | 'edicao' | 'exclusao';
  modelo: string;
  usuario: string;
  dataHora: string;
  detalhes: string;
}

// Tabela mock de valores recomendados para compra de aparelhos usados
let valoresRecomendados: ValorRecomendadoTroca[] = [
  // iPhones
  { id: 'VR-001', modelo: 'iPhone 7 – 32 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 50, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-002', modelo: 'iPhone 7 Plus – 32 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 100, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-003', modelo: 'iPhone 7 Plus – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-004', modelo: 'iPhone 8 – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 50, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-005', modelo: 'iPhone 8 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 100, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-006', modelo: 'iPhone 8 Plus – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-007', modelo: 'iPhone 8 Plus – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 300, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-008', modelo: 'iPhone X – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-009', modelo: 'iPhone X – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-010', modelo: 'iPhone XR – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-011', modelo: 'iPhone XR – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-012', modelo: 'iPhone XR – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 600, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-013', modelo: 'iPhone XS Max – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-014', modelo: 'iPhone XS Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-015', modelo: 'iPhone 11 – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 600, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-016', modelo: 'iPhone 11 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 800, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-017', modelo: 'iPhone 11 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-018', modelo: 'iPhone 11 Pro – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 900, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-019', modelo: 'iPhone 11 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1100, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-020', modelo: 'iPhone 11 Pro Max – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-021', modelo: 'iPhone 11 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-022', modelo: 'iPhone 11 Pro Max – 512 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-023', modelo: 'iPhone 12 – 64 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-024', modelo: 'iPhone 12 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1300, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-025', modelo: 'iPhone 12 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-026', modelo: 'iPhone 12 Pro – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1750, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-027', modelo: 'iPhone 12 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1900, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-028', modelo: 'iPhone 12 Pro Max – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-029', modelo: 'iPhone 12 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2300, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-030', modelo: 'iPhone 12 Pro Max – 512 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2450, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-031', modelo: 'iPhone 13 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 1700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-032', modelo: 'iPhone 13 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-033', modelo: 'iPhone 13 Pro – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-034', modelo: 'iPhone 13 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-035', modelo: 'iPhone 13 Pro Max – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-036', modelo: 'iPhone 13 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2900, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-037', modelo: 'iPhone 14 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-038', modelo: 'iPhone 14 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-039', modelo: 'iPhone 14 Plus – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2150, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-040', modelo: 'iPhone 14 Plus – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-041', modelo: 'iPhone 14 Pro – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-042', modelo: 'iPhone 14 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2900, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-043', modelo: 'iPhone 14 Pro Max – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 3200, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-044', modelo: 'iPhone 14 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 3400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-045', modelo: 'iPhone 15 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-046', modelo: 'iPhone 15 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 3000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-047', modelo: 'iPhone 15 Plus – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 2900, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-048', modelo: 'iPhone 15 Plus – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 3300, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-049', modelo: 'iPhone 15 Pro – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 3400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-050', modelo: 'iPhone 15 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 3600, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-051', modelo: 'iPhone 15 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 4000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-052', modelo: 'iPhone 15 Pro Max – 512 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 4300, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-053', modelo: 'iPhone 16 – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 3500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-054', modelo: 'iPhone 16 – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 3800, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-055', modelo: 'iPhone 16 Plus – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 3700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-056', modelo: 'iPhone 16 Plus – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 4000, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-057', modelo: 'iPhone 16 Pro – 128 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 4500, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-058', modelo: 'iPhone 16 Pro – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 4700, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-059', modelo: 'iPhone 16 Pro Max – 256 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 5400, ultimaAtualizacao: '2026-02-23' },
  { id: 'VR-060', modelo: 'iPhone 16 Pro Max – 512 GB', marca: 'Apple', condicao: 'Semi-novo', valorSugerido: 5600, ultimaAtualizacao: '2026-02-23' },
  // Samsung
  { id: 'VR-061', modelo: 'Samsung Galaxy S24 Ultra', marca: 'Samsung', condicao: 'Semi-novo', valorSugerido: 6000, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-062', modelo: 'Samsung Galaxy S24+', marca: 'Samsung', condicao: 'Semi-novo', valorSugerido: 4400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-063', modelo: 'Samsung Galaxy S24', marca: 'Samsung', condicao: 'Semi-novo', valorSugerido: 3400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-064', modelo: 'Samsung Galaxy S23 Ultra', marca: 'Samsung', condicao: 'Semi-novo', valorSugerido: 3900, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-065', modelo: 'Samsung Galaxy Z Flip 5', marca: 'Samsung', condicao: 'Semi-novo', valorSugerido: 2800, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-066', modelo: 'Samsung Galaxy Z Fold 5', marca: 'Samsung', condicao: 'Semi-novo', valorSugerido: 5000, ultimaAtualizacao: '2025-12-01' },
  // Xiaomi
  { id: 'VR-067', modelo: 'Xiaomi 14 Ultra', marca: 'Xiaomi', condicao: 'Semi-novo', valorSugerido: 4400, ultimaAtualizacao: '2025-12-01' },
  { id: 'VR-068', modelo: 'Xiaomi 14', marca: 'Xiaomi', condicao: 'Semi-novo', valorSugerido: 3100, ultimaAtualizacao: '2025-12-01' },
];

let logsValorTroca: LogValorTroca[] = [];

let nextId = 69;

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

const registrarLog = (tipo: LogValorTroca['tipo'], valorId: string, modelo: string, detalhes: string) => {
  logsValorTroca.unshift({
    id: gerarLogId(),
    valorId,
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

export const getValorRecomendado = (modelo: string): ValorRecomendadoTroca | null => {
  return valoresRecomendados.find(
    v => v.modelo.toLowerCase() === modelo.toLowerCase()
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
  registrarLog('criacao', novo.id, novo.modelo, `Criado valor para ${novo.modelo}: Sugerido R$${novo.valorSugerido}`);
  return novo;
};

export const editarValorRecomendado = (id: string, dados: Partial<Omit<ValorRecomendadoTroca, 'id'>>): ValorRecomendadoTroca | null => {
  const idx = valoresRecomendados.findIndex(v => v.id === id);
  if (idx === -1) return null;
  const anterior = { ...valoresRecomendados[idx] };
  const alteracoes: string[] = [];
  
  if (dados.valorSugerido !== undefined && dados.valorSugerido !== anterior.valorSugerido) alteracoes.push(`Val.Sugerido: R$${anterior.valorSugerido} → R$${dados.valorSugerido}`);
  if (dados.modelo !== undefined && dados.modelo !== anterior.modelo) alteracoes.push(`Modelo: ${anterior.modelo} → ${dados.modelo}`);
  if (dados.marca !== undefined && dados.marca !== anterior.marca) alteracoes.push(`Marca: ${anterior.marca} → ${dados.marca}`);

  valoresRecomendados[idx] = { ...anterior, ...dados, ultimaAtualizacao: new Date().toISOString().split('T')[0] };
  
  if (alteracoes.length > 0) {
    registrarLog('edicao', id, valoresRecomendados[idx].modelo, alteracoes.join('\n'));
  }
  return valoresRecomendados[idx];
};

export const excluirValorRecomendado = (id: string): boolean => {
  const idx = valoresRecomendados.findIndex(v => v.id === id);
  if (idx === -1) return false;
  const removido = valoresRecomendados[idx];
  valoresRecomendados.splice(idx, 1);
  registrarLog('exclusao', id, removido.modelo, `Removido valor para ${removido.modelo}`);
  return true;
};

// Logs
export const getLogsValorTroca = (valorId?: string): LogValorTroca[] => {
  if (valorId) return logsValorTroca.filter(l => l.valorId === valorId);
  return [...logsValorTroca];
};

// Exportar CSV
export const exportarValoresCSV = (): string => {
  const header = 'ID,Modelo,Marca,Valor Sugerido,Última Atualização\n';
  const rows = valoresRecomendados.map(v =>
    `${v.id},${v.modelo},${v.marca},${v.valorSugerido},${v.ultimaAtualizacao}`
  ).join('\n');
  return header + rows;
};
