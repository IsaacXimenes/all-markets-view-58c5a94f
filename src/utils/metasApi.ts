// API de Metas Mensais por Loja - localStorage

export interface MetaLoja {
  id: string;
  lojaId: string;
  mes: number;
  ano: number;
  metaFaturamento: number;
  metaAcessorios: number;
  metaGarantia: number;
  metaAssistencia: number;
  dataCriacao: string;
  ultimaAtualizacao: string;
}

const STORAGE_KEY = 'metas_lojas_data';
const COUNTER_KEY = 'metas_counter';

const now = new Date();
const mesAtual = now.getMonth() + 1;
const anoAtual = now.getFullYear();

const defaultMetas: MetaLoja[] = [
  {
    id: 'META-0001',
    lojaId: 'LOJA-001',
    mes: mesAtual,
    ano: anoAtual,
    metaFaturamento: 150000,
    metaAcessorios: 5000,
    metaGarantia: 12000,
    metaAssistencia: 10000,
    dataCriacao: '2026-02-01T00:00:00.000Z',
    ultimaAtualizacao: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'META-0002',
    lojaId: 'LOJA-002',
    mes: mesAtual,
    ano: anoAtual,
    metaFaturamento: 120000,
    metaAcessorios: 3500,
    metaGarantia: 8000,
    metaAssistencia: 7000,
    dataCriacao: '2026-02-01T00:00:00.000Z',
    ultimaAtualizacao: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'META-0003',
    lojaId: 'LOJA-ONLINE',
    mes: mesAtual,
    ano: anoAtual,
    metaFaturamento: 200000,
    metaAcessorios: 8000,
    metaGarantia: 15000,
    metaAssistencia: 12000,
    dataCriacao: '2026-02-01T00:00:00.000Z',
    ultimaAtualizacao: '2026-02-01T00:00:00.000Z',
  },
];

const loadFromStorage = <T>(key: string, defaultData: T): T => {
  const saved = localStorage.getItem(key);
  if (saved) return JSON.parse(saved);
  // Seed default data on first load
  saveToStorage(key, defaultData);
  return defaultData;
};

const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

let metas: MetaLoja[] = loadFromStorage(STORAGE_KEY, defaultMetas);
let counter = loadFromStorage(COUNTER_KEY, 4);

const gerarId = (): string => {
  const id = `META-${String(counter).padStart(4, '0')}`;
  counter++;
  saveToStorage(COUNTER_KEY, counter);
  return id;
};

export const getMetas = (): MetaLoja[] => [...metas];

export const getMetaByLojaEMes = (lojaId: string, mes: number, ano: number): MetaLoja | null => {
  return metas.find(m => m.lojaId === lojaId && m.mes === mes && m.ano === ano) || null;
};

export const addMeta = (data: Omit<MetaLoja, 'id' | 'dataCriacao' | 'ultimaAtualizacao'>): MetaLoja => {
  const existente = getMetaByLojaEMes(data.lojaId, data.mes, data.ano);
  if (existente) {
    return updateMeta(existente.id, data)!;
  }

  const nova: MetaLoja = {
    ...data,
    id: gerarId(),
    dataCriacao: new Date().toISOString(),
    ultimaAtualizacao: new Date().toISOString(),
  };
  metas.push(nova);
  saveToStorage(STORAGE_KEY, metas);
  return nova;
};

export const updateMeta = (id: string, data: Partial<Omit<MetaLoja, 'id' | 'dataCriacao'>>): MetaLoja | null => {
  const idx = metas.findIndex(m => m.id === id);
  if (idx === -1) return null;

  metas[idx] = {
    ...metas[idx],
    ...data,
    ultimaAtualizacao: new Date().toISOString(),
  };
  saveToStorage(STORAGE_KEY, metas);
  return metas[idx];
};

export const deleteMeta = (id: string): boolean => {
  const idx = metas.findIndex(m => m.id === id);
  if (idx === -1) return false;
  metas.splice(idx, 1);
  saveToStorage(STORAGE_KEY, metas);
  return true;
};
