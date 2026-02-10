// Gestão Administrativa API - Conferência de Caixa
import { getVendas, Venda, Pagamento } from './vendasApi';
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interfaces
export interface TotalPorMetodo {
  bruto: number;
  conferido: boolean;
  conferidoPor?: string;
  dataConferencia?: string;
}

export interface ConferenciaDiaria {
  id: string;
  data: string; // YYYY-MM-DD
  lojaId: string;
  lojaNome?: string;
  totaisPorMetodo: {
    [key: string]: TotalPorMetodo;
  };
  vendasTotal: number;
  statusConferencia: 'Não Conferido' | 'Parcial' | 'Conferido';
  ajustes: AjusteDivergencia[];
}

export interface AjusteDivergencia {
  id: string;
  metodoPagamento: string;
  valorDiferenca: number;
  justificativa: string;
  registradoPor: string;
  registradoPorNome: string;
  dataRegistro: string;
}

export interface LogAuditoria {
  id: string;
  conferenciaId: string;
  data: string;
  lojaId: string;
  acao: 'conferencia_marcada' | 'conferencia_desmarcada' | 'ajuste_registrado';
  metodoPagamento?: string;
  usuarioId: string;
  usuarioNome: string;
  dataHora: string;
  detalhes: string;
}

export interface VendaDrillDown {
  id: string;
  numero: number;
  dataHora: string;
  clienteNome: string;
  vendedorId: string;
  vendedorNome?: string;
  valor: number;
  metodoPagamento: string;
}

// Métodos de pagamento padrão
export const METODOS_PAGAMENTO = [
  'Pix',
  'Cartão Débito',
  'Cartão Crédito',
  'Dinheiro',
  'Transferência',
  'Fiado'
];

// Helpers para localStorage
const getConferenciaKey = (competencia: string, lojaId: string) => 
  `gestao_conferencia_${competencia}_${lojaId}`;

const getAjustesKey = (competencia: string, lojaId: string) => 
  `gestao_ajustes_${competencia}_${lojaId}`;

const getLogsKey = () => 'gestao_logs_auditoria';

// Funções de persistência
const getStoredConferencias = (competencia: string, lojaId: string): Record<string, Record<string, TotalPorMetodo>> => {
  const key = getConferenciaKey(competencia, lojaId);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : {};
};

const saveConferencias = (competencia: string, lojaId: string, data: Record<string, Record<string, TotalPorMetodo>>) => {
  const key = getConferenciaKey(competencia, lojaId);
  localStorage.setItem(key, JSON.stringify(data));
};

const getStoredAjustes = (competencia: string, lojaId: string): Record<string, AjusteDivergencia[]> => {
  const key = getAjustesKey(competencia, lojaId);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : {};
};

const saveAjustes = (competencia: string, lojaId: string, data: Record<string, AjusteDivergencia[]>) => {
  const key = getAjustesKey(competencia, lojaId);
  localStorage.setItem(key, JSON.stringify(data));
};

const getStoredLogs = (): LogAuditoria[] => {
  const stored = localStorage.getItem(getLogsKey());
  return stored ? JSON.parse(stored) : [];
};

const saveLogs = (logs: LogAuditoria[]) => {
  localStorage.setItem(getLogsKey(), JSON.stringify(logs));
};

// Função principal: consolidar vendas por dia
export const consolidarVendasPorDia = (
  competencia: string, // "2026-02"
  lojaId?: string,
  vendedorId?: string,
  todasLojasIds?: string[] // IDs de todas as lojas ativas para garantir exibição
): ConferenciaDiaria[] => {
  const vendas = getVendas();
  
  // Parsear competência para obter intervalo de datas
  const [ano, mes] = competencia.split('-').map(Number);
  const inicioMes = startOfMonth(new Date(ano, mes - 1));
  const fimMes = endOfMonth(new Date(ano, mes - 1));
  
  // Filtrar vendas da competência
  const vendasFiltradas = vendas.filter(v => {
    const dataVenda = new Date(v.dataHora);
    if (!isWithinInterval(dataVenda, { start: inicioMes, end: fimMes })) return false;
    if (v.status === 'Cancelada') return false;
    if (lojaId && lojaId !== 'todas' && v.lojaVenda !== lojaId) return false;
    if (vendedorId && vendedorId !== 'todos' && v.vendedor !== vendedorId) return false;
    return true;
  });
  
  // Agrupar por data + loja
  const vendasPorDiaLoja = new Map<string, Venda[]>();
  vendasFiltradas.forEach(v => {
    const dataStr = format(new Date(v.dataHora), 'yyyy-MM-dd');
    const key = `${dataStr}_${v.lojaVenda}`;
    const existing = vendasPorDiaLoja.get(key) || [];
    vendasPorDiaLoja.set(key, [...existing, v]);
  });
  
  // Gerar array de dias do mês
  const diasDoMes = eachDayOfInterval({ start: inicioMes, end: fimMes });
  
  // Coletar todas as lojas presentes nas vendas filtradas
  const lojasPresentes = new Set<string>();
  vendasFiltradas.forEach(v => lojasPresentes.add(v.lojaVenda));
  
  // Se filtrou por loja específica, garantir que ela apareça mesmo sem vendas
  if (lojaId && lojaId !== 'todas') {
    lojasPresentes.add(lojaId);
  }
  // Se passou todas as lojas ativas, garantir que todas apareçam
  if (todasLojasIds && todasLojasIds.length > 0 && (!lojaId || lojaId === 'todas')) {
    todasLojasIds.forEach(id => lojasPresentes.add(id));
  }
  
  const conferencias: ConferenciaDiaria[] = [];
  
  for (const dia of diasDoMes) {
    const dataStr = format(dia, 'yyyy-MM-dd');
    
    // Para cada loja, gerar uma linha (inclusive dias sem vendas)
    const lojasParaProcessar = Array.from(lojasPresentes);
    
    for (const lojaReal of lojasParaProcessar) {
      const key = `${dataStr}_${lojaReal}`;
      const vendasDoDiaLoja = vendasPorDiaLoja.get(key) || [];
      
      // Não pular dias sem vendas - exibir linha vazia
      
      // Buscar conferências salvas para esta loja específica
      const storedConferencias = getStoredConferencias(competencia, lojaReal);
      const storedAjustes = getStoredAjustes(competencia, lojaReal);
      
      // Consolidar totais por método de pagamento
      const totaisPorMetodo: Record<string, TotalPorMetodo> = {};
      
      METODOS_PAGAMENTO.forEach(metodo => {
        let total = 0;
        vendasDoDiaLoja.forEach(v => {
          v.pagamentos.forEach(p => {
            if (p.meioPagamento === metodo) {
              total += p.valor;
            }
          });
        });
        
        const conferenciaSalva = storedConferencias[dataStr]?.[metodo];
        const valorMudou = conferenciaSalva && conferenciaSalva.bruto !== total;
        
        totaisPorMetodo[metodo] = {
          bruto: total,
          conferido: valorMudou ? false : (conferenciaSalva?.conferido ?? false),
          conferidoPor: valorMudou ? undefined : conferenciaSalva?.conferidoPor,
          dataConferencia: valorMudou ? undefined : conferenciaSalva?.dataConferencia
        };
      });
      
      const vendasTotal = vendasDoDiaLoja.reduce((acc, v) => acc + v.total, 0);
      
      const metodosComValor = Object.entries(totaisPorMetodo)
        .filter(([_, dados]) => dados.bruto > 0);
      const metodosConferidos = metodosComValor.filter(([_, dados]) => dados.conferido);
      
      let statusConferencia: 'Não Conferido' | 'Parcial' | 'Conferido' = 'Não Conferido';
      if (metodosComValor.length > 0) {
        if (metodosConferidos.length === metodosComValor.length) {
          statusConferencia = 'Conferido';
        } else if (metodosConferidos.length > 0) {
          statusConferencia = 'Parcial';
        }
      }
      
      conferencias.push({
        id: `CONF-${dataStr}-${lojaReal}`,
        data: dataStr,
        lojaId: lojaReal,
        totaisPorMetodo,
        vendasTotal,
        statusConferencia,
        ajustes: storedAjustes[dataStr] || []
      });
    }
  }
  
  // Ordenar por data decrescente
  return conferencias.sort((a, b) => b.data.localeCompare(a.data));
};

// Obter vendas detalhadas para drill-down
export const getVendasPorDiaMetodo = (
  data: string,
  lojaId: string,
  metodoPagamento: string
): VendaDrillDown[] => {
  const vendas = getVendas();
  const resultado: VendaDrillDown[] = [];
  
  vendas.forEach(v => {
    const dataVenda = format(new Date(v.dataHora), 'yyyy-MM-dd');
    if (dataVenda !== data) return;
    if (v.status === 'Cancelada') return;
    if (lojaId && lojaId !== 'todas' && v.lojaVenda !== lojaId) return;
    
    v.pagamentos.forEach(p => {
      if (p.meioPagamento === metodoPagamento) {
        resultado.push({
          id: v.id,
          numero: v.numero,
          dataHora: v.dataHora,
          clienteNome: v.clienteNome,
          vendedorId: v.vendedor,
          valor: p.valor,
          metodoPagamento: p.meioPagamento
        });
      }
    });
  });
  
  return resultado;
};

// Obter todas as vendas de um dia (para modal de detalhes)
export const getVendasDoDia = (
  data: string,
  lojaId: string
): Venda[] => {
  const vendas = getVendas();
  
  return vendas.filter(v => {
    const dataVenda = format(new Date(v.dataHora), 'yyyy-MM-dd');
    if (dataVenda !== data) return false;
    if (v.status === 'Cancelada') return false;
    if (lojaId && lojaId !== 'todas' && v.lojaVenda !== lojaId) return false;
    return true;
  });
};

// Marcar/Desmarcar conferência
export const toggleConferencia = (
  competencia: string,
  data: string,
  lojaId: string,
  metodoPagamento: string,
  usuarioId: string,
  usuarioNome: string,
  valorBruto: number
): void => {
  const conferencias = getStoredConferencias(competencia, lojaId);
  
  if (!conferencias[data]) {
    conferencias[data] = {};
  }
  
  const estadoAtual = conferencias[data][metodoPagamento]?.conferido ?? false;
  const novoEstado = !estadoAtual;
  
  conferencias[data][metodoPagamento] = {
    bruto: valorBruto,
    conferido: novoEstado,
    conferidoPor: novoEstado ? usuarioId : undefined,
    dataConferencia: novoEstado ? new Date().toISOString() : undefined
  };
  
  saveConferencias(competencia, lojaId, conferencias);
  
  // Registrar log
  const logs = getStoredLogs();
  logs.unshift({
    id: `LOG-${Date.now()}`,
    conferenciaId: `CONF-${data}-${lojaId}`,
    data,
    lojaId,
    acao: novoEstado ? 'conferencia_marcada' : 'conferencia_desmarcada',
    metodoPagamento,
    usuarioId,
    usuarioNome,
    dataHora: new Date().toISOString(),
    detalhes: `${novoEstado ? 'Conferência marcada' : 'Conferência desmarcada'} para ${metodoPagamento} - Valor: R$ ${valorBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  });
  saveLogs(logs);
};

// Registrar ajuste/divergência
export const registrarAjuste = (
  competencia: string,
  data: string,
  lojaId: string,
  ajuste: Omit<AjusteDivergencia, 'id' | 'dataRegistro'>
): AjusteDivergencia => {
  const ajustes = getStoredAjustes(competencia, lojaId);
  
  if (!ajustes[data]) {
    ajustes[data] = [];
  }
  
  const novoAjuste: AjusteDivergencia = {
    ...ajuste,
    id: `AJU-${Date.now()}`,
    dataRegistro: new Date().toISOString()
  };
  
  ajustes[data].push(novoAjuste);
  saveAjustes(competencia, lojaId, ajustes);
  
  // Registrar log
  const logs = getStoredLogs();
  logs.unshift({
    id: `LOG-${Date.now()}`,
    conferenciaId: `CONF-${data}-${lojaId}`,
    data,
    lojaId,
    acao: 'ajuste_registrado',
    metodoPagamento: ajuste.metodoPagamento,
    usuarioId: ajuste.registradoPor,
    usuarioNome: ajuste.registradoPorNome,
    dataHora: new Date().toISOString(),
    detalhes: `Ajuste registrado para ${ajuste.metodoPagamento} - Diferença: R$ ${ajuste.valorDiferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${ajuste.justificativa}`
  });
  saveLogs(logs);
  
  return novoAjuste;
};

// Obter logs de auditoria
export const getLogsAuditoria = (
  competencia?: string,
  lojaId?: string
): LogAuditoria[] => {
  const logs = getStoredLogs();
  
  return logs.filter(log => {
    if (competencia) {
      const logCompetencia = log.data.substring(0, 7); // YYYY-MM
      if (logCompetencia !== competencia) return false;
    }
    if (lojaId && lojaId !== 'todas' && log.lojaId !== lojaId) return false;
    return true;
  });
};

// Calcular resumo para cards
export const calcularResumoConferencia = (conferencias: ConferenciaDiaria[]) => {
  let totalBruto = 0;
  let totalConferido = 0;
  let totalPendente = 0;
  let diasNaoConferidos = 0;
  
  conferencias.forEach(conf => {
    const totalDia = conf.vendasTotal;
    totalBruto += totalDia;
    
    // Calcular conferido vs pendente por método
    Object.values(conf.totaisPorMetodo).forEach(metodo => {
      if (metodo.bruto > 0) {
        if (metodo.conferido) {
          totalConferido += metodo.bruto;
        } else {
          totalPendente += metodo.bruto;
        }
      }
    });
    
    if (conf.statusConferencia === 'Não Conferido' && conf.vendasTotal > 0) {
      diasNaoConferidos++;
    }
  });
  
  return {
    totalBruto,
    totalConferido,
    totalPendente,
    diasNaoConferidos
  };
};

// Formatar data para exibição
export const formatarDataExibicao = (data: string): string => {
  const dataObj = parse(data, 'yyyy-MM-dd', new Date());
  return format(dataObj, 'dd/MM', { locale: ptBR });
};

// Obter competências disponíveis (últimos 12 meses)
export const getCompetenciasDisponiveis = (): { value: string; label: string }[] => {
  const competencias: { value: string; label: string }[] = [];
  const hoje = new Date();
  
  for (let i = 0; i < 12; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const value = format(data, 'yyyy-MM');
    const label = format(data, 'MMMM/yyyy', { locale: ptBR });
    competencias.push({ 
      value, 
      label: label.charAt(0).toUpperCase() + label.slice(1) 
    });
  }
  
  return competencias;
};
