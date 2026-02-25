// API de Metas Mensais por Loja - localStorage

export interface MetaLoja {
  id: string;
  lojaId: string;
  mes: number;
  ano: number;
  metaFaturamento: number;
  metaAcessorios: number;
  metaGarantia: number;
  dataCriacao: string;
  ultimaAtualizacao: string;
}

const STORAGE_KEY = 'metas_lojas_data';
const COUNTER_KEY = 'metas_counter';

const loadFromStorage = <T>(key: string, defaultData: T): T => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultData;
};

const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

let metas: MetaLoja[] = loadFromStorage(STORAGE_KEY, []);
let counter = loadFromStorage(COUNTER_KEY, 1);

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
