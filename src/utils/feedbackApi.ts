// API de Feedback para Recursos Humanos - Mock Data

import { getColaboradores, getCargoNome, getLojaById, Colaborador } from '@/utils/cadastrosApi';

export interface FeedbackRegistro {
  id: string;
  colaboradorId: string;
  tipo: 'Advertência' | 'Advertência (2)' | 'Suspensão' | 'Suspensão (2)' | 'Suspensão (3)';
  texto: string;
  gestorId: string;
  gestorNome: string;
  dataHora: Date;
  referenciaAnterior?: string;
}

export interface ColaboradorFeedback {
  id: string;
  nome: string;
  cargo: string;
  loja: string;
  cpf: string;
}

// Mock de feedbacks
let feedbacks: FeedbackRegistro[] = [
  {
    id: 'FB-0001',
    colaboradorId: 'COL-001',
    tipo: 'Advertência',
    texto: 'Atraso recorrente nos últimos 3 dias. Colaborador foi orientado sobre a importância da pontualidade.',
    gestorId: 'COL-002',
    gestorNome: 'Fernanda Lima',
    dataHora: new Date('2025-01-10T09:30:00'),
  },
  {
    id: 'FB-0002',
    colaboradorId: 'COL-001',
    tipo: 'Advertência (2)',
    texto: 'Segunda advertência por atraso. Colaborador assinou termo de compromisso.',
    gestorId: 'COL-002',
    gestorNome: 'Fernanda Lima',
    dataHora: new Date('2025-01-15T14:00:00'),
    referenciaAnterior: 'FB-0001'
  },
  {
    id: 'FB-0003',
    colaboradorId: 'COL-003',
    tipo: 'Advertência',
    texto: 'Uso indevido de celular durante atendimento ao cliente.',
    gestorId: 'COL-002',
    gestorNome: 'Fernanda Lima',
    dataHora: new Date('2025-01-12T16:45:00'),
  },
  {
    id: 'FB-0004',
    colaboradorId: 'COL-004',
    tipo: 'Advertência',
    texto: 'Falta não justificada no dia 05/01/2025.',
    gestorId: 'COL-005',
    gestorNome: 'Marcos Silva',
    dataHora: new Date('2025-01-08T10:00:00'),
  },
  {
    id: 'FB-0005',
    colaboradorId: 'COL-001',
    tipo: 'Suspensão',
    texto: 'Terceira ocorrência de atraso. Suspensão de 1 dia aplicada conforme regulamento interno.',
    gestorId: 'COL-002',
    gestorNome: 'Fernanda Lima',
    dataHora: new Date('2025-01-20T11:15:00'),
    referenciaAnterior: 'FB-0002'
  },
];

// Contador para IDs
let feedbackIdCounter = 6;

// Converter Colaborador para ColaboradorFeedback
const toColaboradorFeedback = (col: Colaborador): ColaboradorFeedback => ({
  id: col.id,
  nome: col.nome,
  cargo: getCargoNome(col.cargo),
  loja: getLojaById(col.loja)?.nome || col.loja,
  cpf: col.cpf
});

// API Functions
export const getFeedbacks = () => [...feedbacks].sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime());

export const getFeedbackById = (id: string) => feedbacks.find(f => f.id === id);

export const getFeedbacksByColaborador = (colaboradorId: string) => 
  feedbacks.filter(f => f.colaboradorId === colaboradorId)
    .sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime());

export const getColaboradoresComFeedback = (): ColaboradorFeedback[] => {
  const idsComFeedback = new Set(feedbacks.map(f => f.colaboradorId));
  const colaboradores = getColaboradores().filter(c => idsComFeedback.has(c.id));
  return colaboradores.map(toColaboradorFeedback);
};

export const getTodosColaboradoresParaFeedback = (): ColaboradorFeedback[] => {
  const colaboradores = getColaboradores().filter(c => c.status === 'Ativo');
  return colaboradores.map(toColaboradorFeedback);
};

export const getUltimaNotificacao = (colaboradorId: string): Date | null => {
  const feedbacksColaborador = feedbacks.filter(f => f.colaboradorId === colaboradorId);
  if (feedbacksColaborador.length === 0) return null;
  return feedbacksColaborador.sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime())[0].dataHora;
};

export const getProximaAnotacao = (colaboradorId: string): string => {
  const feedbacksColaborador = feedbacks.filter(f => f.colaboradorId === colaboradorId);
  const count = feedbacksColaborador.length;
  
  if (count === 0) return 'Sem registros';
  if (count === 1) return 'Advertência (2)';
  if (count === 2) return 'Suspensão';
  return `Suspensão (${count - 1})`;
};

export const getContadorFeedbacks = (colaboradorId: string): number => {
  return feedbacks.filter(f => f.colaboradorId === colaboradorId).length;
};

export const addFeedback = (feedback: Omit<FeedbackRegistro, 'id'>): FeedbackRegistro => {
  const newId = `FB-${String(feedbackIdCounter++).padStart(4, '0')}`;
  const newFeedback: FeedbackRegistro = { ...feedback, id: newId };
  feedbacks.push(newFeedback);
  return newFeedback;
};

export const deleteFeedback = (id: string) => {
  feedbacks = feedbacks.filter(f => f.id !== id);
};

// Verificar se usuário atual é gestor (mock - simula permissão "Gestor" nos cargos)
// Cargos com permissão de gestor: Gerente Geral, Gerente Financeiro, Gerente de Estoque
const cargosGestores = ['Gerente Geral', 'Gerente Financeiro', 'Gerente de Estoque', 'Supervisor de Loja'];

export const isUsuarioGestor = (cargoNome: string): boolean => {
  return cargosGestores.some(c => cargoNome.toLowerCase().includes(c.toLowerCase()) || 
    cargoNome.toLowerCase().includes('gerente') ||
    cargoNome.toLowerCase().includes('supervisor'));
};

// Usuário logado mockado (gestor)
export const getUsuarioLogado = () => ({
  id: 'COL-002',
  nome: 'Fernanda Lima',
  cargo: 'Gerente Financeiro',
  isGestor: true
});

// Exportar CSV
export const exportFeedbacksToCSV = (data: any[], filename: string) => {
  const headers = Object.keys(data[0] || {});
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const value = row[h];
        if (value instanceof Date) {
          return value.toLocaleString('pt-BR');
        }
        return `"${String(value || '').replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.click();
};
