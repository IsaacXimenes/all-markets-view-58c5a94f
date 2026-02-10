// Agenda Eletrônica para Gestão Administrativa
// Reutilizável para Conferência Diária e Atividades dos Gestores

export interface AnotacaoGestao {
  id: string;
  chaveContexto: string; // "conferencia_LOJ001" ou "atividades_LOJ001"
  dataHora: string;      // ISO
  usuario: string;
  observacao: string;
  importante: boolean;
}

const STORAGE_KEY = 'anotacoes_gestao';

function getAll(): AnotacaoGestao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(data: AnotacaoGestao[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAnotacoesGestao(chaveContexto: string): AnotacaoGestao[] {
  return getAll()
    .filter(a => a.chaveContexto === chaveContexto)
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
}

export function registrarAnotacaoGestao(
  chaveContexto: string,
  usuario: string,
  observacao: string,
  importante: boolean
): AnotacaoGestao {
  const nova: AnotacaoGestao = {
    id: `ANGEST-${Date.now()}`,
    chaveContexto,
    dataHora: new Date().toISOString(),
    usuario,
    observacao,
    importante,
  };
  const todas = getAll();
  todas.push(nova);
  saveAll(todas);
  return nova;
}

export function temAnotacaoImportante(chaveContexto: string): boolean {
  return getAll().some(a => a.chaveContexto === chaveContexto && a.importante);
}
