// Vales API - Mock Data

export interface HistoricoAlteracao {
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  campoAlterado: string;
  valorAnterior: string;
  valorNovo: string;
  tipoAcao: 'Criação' | 'Edição';
}

export interface Vale {
  id: string;
  dataLancamento: string;
  lancadoPor: string;
  lancadoPorNome: string;
  lojaId: string;
  colaboradorId: string;
  observacao: string;
  valorFinal: number;
  quantidadeVezes: number;
  inicioCompetencia: string; // Formato: "Jan-2026"
  historico: HistoricoAlteracao[];
}

// Mock Data - UUIDs reais do useCadastroStore
// Mapeamento de IDs:
// Lojas: db894e7d (JK Shopping), 3ac7e00c (Matriz), 5b9446d5 (Shopping Sul), fcc78c1a (Online)
// Colaboradores: b467c728 (Anna Beatriz), 143ac0c2 (Antonio Sousa), 428d37c2 (Bruno Alves), 6dcbc817 (Caua Victor)

let vales: Vale[] = [
  {
    id: 'VALE-001',
    dataLancamento: '2026-01-10T10:30:00',
    lancadoPor: 'b467c728', // Anna Beatriz Borges
    lancadoPorNome: 'Anna Beatriz Borges',
    lojaId: 'db894e7d', // Loja - JK Shopping
    colaboradorId: '6dcbc817', // Caua Victor Costa dos Santos
    observacao: 'Vale emergência - Despesa médica',
    valorFinal: 600,
    quantidadeVezes: 3,
    inicioCompetencia: 'Jan-2026',
    historico: [
      {
        dataHora: '2026-01-10T10:30:00',
        usuarioId: 'b467c728',
        usuarioNome: 'Anna Beatriz Borges',
        campoAlterado: '-',
        valorAnterior: '-',
        valorNovo: '-',
        tipoAcao: 'Criação'
      }
    ]
  },
  {
    id: 'VALE-002',
    dataLancamento: '2026-01-08T14:15:00',
    lancadoPor: '428d37c2', // Bruno Alves Peres
    lancadoPorNome: 'Bruno Alves Peres',
    lojaId: '3ac7e00c', // Loja - Matriz
    colaboradorId: '143ac0c2', // Antonio Sousa Silva
    observacao: 'Vale para material escolar',
    valorFinal: 400,
    quantidadeVezes: 2,
    inicioCompetencia: 'Fev-2026',
    historico: [
      {
        dataHora: '2026-01-08T14:15:00',
        usuarioId: '428d37c2',
        usuarioNome: 'Bruno Alves Peres',
        campoAlterado: '-',
        valorAnterior: '-',
        valorNovo: '-',
        tipoAcao: 'Criação'
      }
    ]
  },
  {
    id: 'VALE-003',
    dataLancamento: '2025-12-15T09:45:00',
    lancadoPor: 'b467c728', // Anna Beatriz Borges
    lancadoPorNome: 'Anna Beatriz Borges',
    lojaId: '5b9446d5', // Loja - Shopping Sul
    colaboradorId: '9812948d', // Gustavo de Souza dos Santos
    observacao: 'Vale para viagem familiar',
    valorFinal: 1200,
    quantidadeVezes: 4,
    inicioCompetencia: 'Dez-2025',
    historico: [
      {
        dataHora: '2025-12-15T09:45:00',
        usuarioId: 'b467c728',
        usuarioNome: 'Anna Beatriz Borges',
        campoAlterado: '-',
        valorAnterior: '-',
        valorNovo: '-',
        tipoAcao: 'Criação'
      }
    ]
  },
];

// API Functions
export const getVales = (): Vale[] => {
  return [...vales].sort((a, b) => 
    new Date(b.dataLancamento).getTime() - new Date(a.dataLancamento).getTime()
  );
};

export const getValeById = (id: string): Vale | undefined => {
  return vales.find(v => v.id === id);
};

export const addVale = (vale: Omit<Vale, 'id'>): Vale => {
  const id = `VALE-${String(vales.length + 1).padStart(3, '0')}`;
  const newVale: Vale = { ...vale, id };
  vales.push(newVale);
  return newVale;
};

export const updateVale = (id: string, updates: Partial<Vale>): Vale | undefined => {
  const index = vales.findIndex(v => v.id === id);
  if (index === -1) return undefined;
  
  vales[index] = { ...vales[index], ...updates };
  return vales[index];
};

export const deleteVale = (id: string): boolean => {
  const index = vales.findIndex(v => v.id === id);
  if (index === -1) return false;
  
  vales.splice(index, 1);
  return true;
};

// Helper para calcular valor da parcela
export const calcularValorParcela = (valorFinal: number, quantidadeVezes: number): number => {
  if (quantidadeVezes <= 0) return 0;
  return valorFinal / quantidadeVezes;
};

// Helper para gerar próximos 24 meses
export const getProximosMeses = (): string[] => {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const hoje = new Date();
  const resultado: string[] = [];
  
  for (let i = 0; i < 24; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear();
    resultado.push(`${mes}-${ano}`);
  }
  
  return resultado;
};

// Helper para calcular situação das parcelas
export const calcularSituacaoParcelas = (inicioCompetencia: string, quantidadeVezes: number): { pagas: number; total: number; percentual: number } => {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  // Parse início competência (ex: "Jan-2026")
  const [mesStr, anoStr] = inicioCompetencia.split('-');
  const mesIndex = meses.indexOf(mesStr);
  const ano = parseInt(anoStr);
  
  if (mesIndex === -1 || isNaN(ano)) {
    return { pagas: 0, total: quantidadeVezes, percentual: 0 };
  }
  
  const dataInicio = new Date(ano, mesIndex, 1);
  const hoje = new Date();
  const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  
  // Calcular quantas parcelas já venceram (mês atual conta como pago)
  let parcelasPagas = 0;
  for (let i = 0; i < quantidadeVezes; i++) {
    const mesParcela = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + i, 1);
    if (mesParcela <= mesAtual) {
      parcelasPagas++;
    }
  }
  
  const percentual = (parcelasPagas / quantidadeVezes) * 100;
  
  return { 
    pagas: parcelasPagas, 
    total: quantidadeVezes, 
    percentual 
  };
};

// Helper para converter competência em data para filtro
export const competenciaParaData = (competencia: string): Date | null => {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const [mesStr, anoStr] = competencia.split('-');
  const mesIndex = meses.indexOf(mesStr);
  const ano = parseInt(anoStr);
  
  if (mesIndex === -1 || isNaN(ano)) return null;
  
  return new Date(ano, mesIndex, 1);
};
