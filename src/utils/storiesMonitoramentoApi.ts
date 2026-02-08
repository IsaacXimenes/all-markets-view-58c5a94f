// Stories Monitoramento API - Prova Social via Instagram
import { getVendas, Venda } from './vendasApi';
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============= CONSTANTES =============
export const META_STORIES_PERCENTUAL = 70;

export const MOTIVOS_NAO_POSTAGEM = [
  'Cliente não possui Instagram',
  'Cliente recusou a postagem',
  'Vendedor não solicitou',
  'Story postado mas não repostado pela loja',
  'Problema técnico',
  'Outro'
] as const;

export type MotivoNaoPostagem = typeof MOTIVOS_NAO_POSTAGEM[number];

// ============= INTERFACES =============
export type StatusLote = 
  | 'Pendente Conf. Operacional' 
  | 'Aguardando Validação' 
  | 'Validado' 
  | 'Rejeitado Parcial';

export type StatusAnexo = 
  | 'Sem Anexo' 
  | 'Anexo Pendente' 
  | 'Anexado' 
  | 'Validado' 
  | 'Rejeitado';

export type SeloQualidade = 'Story Exemplo' | 'Excelente Engajamento' | null;

export interface AnexoStory {
  id: string;
  vendaMonitoramentoId: string;
  nome: string;
  tipo: string;
  tamanho: number;
  dataUrl: string; // Base64
  dataUpload: string;
}

export interface VendaMonitoramento {
  id: string;
  loteId: string;
  vendaId: string;
  vendaNumero: number;
  clienteNome: string;
  vendedorId: string;
  vendedorNome: string;
  valorVenda: number;
  lojaVenda: string;
  statusAnexo: StatusAnexo;
  motivoNaoPostagem?: MotivoNaoPostagem;
  seloQualidade?: SeloQualidade;
  observacaoConferencia?: string;
  observacaoValidacao?: string;
  anexos: AnexoStory[];
}

export interface LoteMonitoramento {
  id: string;
  data: string; // YYYY-MM-DD
  lojaId: string;
  lojaNome: string;
  totalVendas: number;
  vendasComStory: number;
  percentualStories: number;
  status: StatusLote;
  conferidoPor?: string;
  conferidoPorNome?: string;
  dataConferencia?: string;
  validadoPor?: string;
  validadoPorNome?: string;
  dataValidacao?: string;
  vendas: VendaMonitoramento[];
}

export interface IndicadoresStories {
  totalVendas: number;
  totalComStory: number;
  percentualGeral: number;
  metaAtingida: boolean;
  rankingLojas: { lojaId: string; lojaNome: string; totalVendas: number; comStory: number; percentual: number }[];
  rankingVendedores: { vendedorId: string; vendedorNome: string; totalVendas: number; comStory: number; percentual: number }[];
  motivosDistribuicao: { motivo: string; quantidade: number }[];
}

// ============= LOCAL STORAGE =============
const getLotesKey = (competencia: string) => `stories_lotes_${competencia}`;

const getStoredLotes = (competencia: string): LoteMonitoramento[] => {
  const stored = localStorage.getItem(getLotesKey(competencia));
  return stored ? JSON.parse(stored) : [];
};

const saveLotes = (competencia: string, lotes: LoteMonitoramento[]) => {
  localStorage.setItem(getLotesKey(competencia), JSON.stringify(lotes));
};

// ============= GERAÇÃO DE LOTES =============
export const gerarLotesDiarios = (
  competencia: string,
  lojas: { id: string; nome: string }[]
): LoteMonitoramento[] => {
  const existentes = getStoredLotes(competencia);
  if (existentes.length > 0) return existentes;

  const vendas = getVendas();
  const [ano, mes] = competencia.split('-').map(Number);
  const inicioMes = startOfMonth(new Date(ano, mes - 1));
  const fimMes = endOfMonth(new Date(ano, mes - 1));
  // Limit to today
  const hoje = new Date();
  const fimReal = fimMes > hoje ? hoje : fimMes;
  if (inicioMes > hoje) return [];

  const dias = eachDayOfInterval({ start: inicioMes, end: fimReal });
  const lotes: LoteMonitoramento[] = [];

  for (const dia of dias) {
    const dataStr = format(dia, 'yyyy-MM-dd');

    for (const loja of lojas) {
      const vendasDoDia = vendas.filter(v => {
        const dv = format(new Date(v.dataHora), 'yyyy-MM-dd');
        return dv === dataStr && v.lojaVenda === loja.id && v.status !== 'Cancelada';
      });

      if (vendasDoDia.length === 0) continue;

      const loteId = `LOTE-${dataStr}-${loja.id}`;
      const vendasMon: VendaMonitoramento[] = vendasDoDia.map(v => ({
        id: `VM-${v.id}`,
        loteId,
        vendaId: v.id,
        vendaNumero: v.numero,
        clienteNome: v.clienteNome,
        vendedorId: v.vendedor,
        vendedorNome: '', // will be resolved in UI
        valorVenda: v.total,
        lojaVenda: v.lojaVenda,
        statusAnexo: 'Sem Anexo' as StatusAnexo,
        anexos: []
      }));

      lotes.push({
        id: loteId,
        data: dataStr,
        lojaId: loja.id,
        lojaNome: loja.nome,
        totalVendas: vendasMon.length,
        vendasComStory: 0,
        percentualStories: 0,
        status: 'Pendente Conf. Operacional',
        vendas: vendasMon
      });
    }
  }

  // Sort newest first
  lotes.sort((a, b) => b.data.localeCompare(a.data));
  saveLotes(competencia, lotes);
  return lotes;
};

// ============= GETTERS =============
export const getLotes = (
  competencia: string,
  lojaId?: string,
  status?: StatusLote
): LoteMonitoramento[] => {
  let lotes = getStoredLotes(competencia);
  if (lojaId && lojaId !== 'todas') lotes = lotes.filter(l => l.lojaId === lojaId);
  if (status) lotes = lotes.filter(l => l.status === status);
  return lotes;
};

export const getLoteById = (competencia: string, loteId: string): LoteMonitoramento | undefined => {
  const lotes = getStoredLotes(competencia);
  return lotes.find(l => l.id === loteId);
};

// ============= CONFERÊNCIA OPERACIONAL =============
export const salvarConferenciaOperacional = (
  competencia: string,
  loteId: string,
  vendasAtualizadas: VendaMonitoramento[],
  responsavelId: string,
  responsavelNome: string
): void => {
  const lotes = getStoredLotes(competencia);
  const idx = lotes.findIndex(l => l.id === loteId);
  if (idx === -1) return;

  const comStory = vendasAtualizadas.filter(v => v.statusAnexo === 'Anexado' || v.statusAnexo === 'Anexo Pendente').length;

  lotes[idx] = {
    ...lotes[idx],
    vendas: vendasAtualizadas,
    vendasComStory: comStory,
    percentualStories: lotes[idx].totalVendas > 0 ? Math.round((comStory / lotes[idx].totalVendas) * 100) : 0,
    status: 'Aguardando Validação',
    conferidoPor: responsavelId,
    conferidoPorNome: responsavelNome,
    dataConferencia: new Date().toISOString()
  };

  saveLotes(competencia, lotes);
};

// ============= VALIDAÇÃO ADMINISTRATIVA =============
export const salvarValidacao = (
  competencia: string,
  loteId: string,
  vendasValidadas: VendaMonitoramento[],
  responsavelId: string,
  responsavelNome: string
): void => {
  const lotes = getStoredLotes(competencia);
  const idx = lotes.findIndex(l => l.id === loteId);
  if (idx === -1) return;

  const comStoryValidado = vendasValidadas.filter(v => v.statusAnexo === 'Validado').length;
  const temRejeitado = vendasValidadas.some(v => v.statusAnexo === 'Rejeitado');

  lotes[idx] = {
    ...lotes[idx],
    vendas: vendasValidadas,
    vendasComStory: comStoryValidado,
    percentualStories: lotes[idx].totalVendas > 0 ? Math.round((comStoryValidado / lotes[idx].totalVendas) * 100) : 0,
    status: temRejeitado ? 'Rejeitado Parcial' : 'Validado',
    validadoPor: responsavelId,
    validadoPorNome: responsavelNome,
    dataValidacao: new Date().toISOString()
  };

  saveLotes(competencia, lotes);
};

// ============= INDICADORES =============
export const calcularIndicadores = (
  competencia: string,
  lojaId?: string
): IndicadoresStories => {
  const lotes = getLotes(competencia, lojaId);

  let totalVendas = 0;
  let totalComStory = 0;
  const lojaMap = new Map<string, { lojaNome: string; total: number; comStory: number }>();
  const vendedorMap = new Map<string, { vendedorNome: string; total: number; comStory: number }>();
  const motivosMap = new Map<string, number>();

  for (const lote of lotes) {
    totalVendas += lote.totalVendas;

    for (const v of lote.vendas) {
      const isStory = v.statusAnexo === 'Validado' || v.statusAnexo === 'Anexado' || v.statusAnexo === 'Anexo Pendente';
      if (isStory) totalComStory++;

      // Loja ranking
      const lojaData = lojaMap.get(lote.lojaId) || { lojaNome: lote.lojaNome, total: 0, comStory: 0 };
      lojaData.total++;
      if (isStory) lojaData.comStory++;
      lojaMap.set(lote.lojaId, lojaData);

      // Vendedor ranking
      const vendData = vendedorMap.get(v.vendedorId) || { vendedorNome: v.vendedorNome || v.vendedorId, total: 0, comStory: 0 };
      vendData.total++;
      if (isStory) vendData.comStory++;
      vendedorMap.set(v.vendedorId, vendData);

      // Motivos
      if (!isStory && v.motivoNaoPostagem) {
        motivosMap.set(v.motivoNaoPostagem, (motivosMap.get(v.motivoNaoPostagem) || 0) + 1);
      }
    }
  }

  const percentualGeral = totalVendas > 0 ? Math.round((totalComStory / totalVendas) * 100) : 0;

  return {
    totalVendas,
    totalComStory,
    percentualGeral,
    metaAtingida: percentualGeral >= META_STORIES_PERCENTUAL,
    rankingLojas: Array.from(lojaMap.entries())
      .map(([lojaId, d]) => ({
        lojaId,
        lojaNome: d.lojaNome,
        totalVendas: d.total,
        comStory: d.comStory,
        percentual: d.total > 0 ? Math.round((d.comStory / d.total) * 100) : 0
      }))
      .sort((a, b) => b.percentual - a.percentual),
    rankingVendedores: Array.from(vendedorMap.entries())
      .map(([vendedorId, d]) => ({
        vendedorId,
        vendedorNome: d.vendedorNome,
        totalVendas: d.total,
        comStory: d.comStory,
        percentual: d.total > 0 ? Math.round((d.comStory / d.total) * 100) : 0
      }))
      .sort((a, b) => b.percentual - a.percentual),
    motivosDistribuicao: Array.from(motivosMap.entries())
      .map(([motivo, quantidade]) => ({ motivo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
  };
};

// ============= HELPERS =============
export const getCompetenciasDisponiveisStories = (): { value: string; label: string }[] => {
  const competencias: { value: string; label: string }[] = [];
  const hoje = new Date();
  for (let i = 0; i < 12; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const value = format(data, 'yyyy-MM');
    const label = format(data, 'MMMM/yyyy', { locale: ptBR });
    competencias.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return competencias;
};

export const getPercentualColor = (percentual: number): 'green' | 'yellow' | 'red' => {
  if (percentual >= META_STORIES_PERCENTUAL) return 'green';
  if (percentual >= 50) return 'yellow';
  return 'red';
};

export const getStatusLoteColor = (status: StatusLote): string => {
  switch (status) {
    case 'Pendente Conf. Operacional': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    case 'Aguardando Validação': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    case 'Validado': return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'Rejeitado Parcial': return 'bg-red-500/20 text-red-700 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
  }
};

export const getStatusLoteRowClass = (status: StatusLote): string => {
  switch (status) {
    case 'Pendente Conf. Operacional': return 'bg-yellow-500/10';
    case 'Aguardando Validação': return 'bg-blue-500/10';
    case 'Validado': return 'bg-green-500/10';
    case 'Rejeitado Parcial': return 'bg-red-500/10';
    default: return '';
  }
};
