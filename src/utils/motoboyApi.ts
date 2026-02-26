// Motoboy API - Gerenciamento de demandas e remuneração de motoboys
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';

// Lazy imports to break circular dependency (motoboyApi <-> vendasApi)
let _vendasModule: any = null;
let _financeModule: any = null;

const getVendasModule = () => {
  if (!_vendasModule) {
    // Dynamic import resolved synchronously after first load
    import('./vendasApi').then(m => { _vendasModule = m; });
  }
  return _vendasModule;
};

const getFinanceModule = () => {
  if (!_financeModule) {
    import('./financeApi').then(m => { _financeModule = m; });
  }
  return _financeModule;
};

// Pre-warm lazy modules
import('./vendasApi').then(m => { _vendasModule = m; });
import('./financeApi').then(m => { _financeModule = m; });

export interface DemandaMotoboy {
  id: string;
  motoboyId: string;
  motoboyNome: string;
  data: string;
  tipo: 'Entrega' | 'Coleta' | 'Movimentação';
  descricao: string;
  lojaOrigem: string;
  lojaDestino: string;
  status: 'Concluída' | 'Pendente' | 'Cancelada';
  valorDemanda: number;
  vendaId?: string;
}

export interface RemuneracaoMotoboy {
  id: string;
  motoboyId: string;
  motoboyNome: string;
  competencia: string;
  periodoInicio: string;
  periodoFim: string;
  qtdDemandas: number;
  valorTotal: number;
  status: 'Pendente' | 'Pago';
  dataPagamento?: string;
  contaId?: string;
  contaNome?: string;
  comprovante?: string;
  comprovanteNome?: string;
  pagoPor?: string;
  observacoesPagamento?: string;
}

// Mock data de demandas
const demandas: DemandaMotoboy[] = [
  {
    id: 'DEM-001',
    motoboyId: 'a962efd4',
    motoboyNome: 'João Vitor Rezende Andrade de Souza',
    data: '2026-01-28',
    tipo: 'Entrega',
    descricao: 'Entrega iPhone 15 Pro Max - Cliente João Silva',
    lojaOrigem: 'SIA - Matriz',
    lojaDestino: 'Endereço cliente',
    status: 'Concluída',
    valorDemanda: 25.00,
    vendaId: 'VEN-2026-0010'
  },
  {
    id: 'DEM-002',
    motoboyId: 'a962efd4',
    motoboyNome: 'João Vitor Rezende Andrade de Souza',
    data: '2026-01-28',
    tipo: 'Coleta',
    descricao: 'Coleta aparelho para garantia',
    lojaOrigem: 'Endereço cliente',
    lojaDestino: 'SIA - Matriz',
    status: 'Concluída',
    valorDemanda: 25.00
  },
  {
    id: 'DEM-003',
    motoboyId: 'a962efd4',
    motoboyNome: 'João Vitor Rezende Andrade de Souza',
    data: '2026-01-29',
    tipo: 'Movimentação',
    descricao: 'Movimentação estoque entre lojas',
    lojaOrigem: 'SIA - Matriz',
    lojaDestino: 'JK Shopping',
    status: 'Concluída',
    valorDemanda: 30.00
  },
  {
    id: 'DEM-004',
    motoboyId: '3b3afac0',
    motoboyNome: 'Samuel Silva dos Santos Nonato',
    data: '2026-01-29',
    tipo: 'Entrega',
    descricao: 'Entrega MacBook Air - Cliente Maria Santos',
    lojaOrigem: 'JK Shopping',
    lojaDestino: 'Endereço cliente',
    status: 'Concluída',
    valorDemanda: 35.00,
    vendaId: 'VEN-2026-0012'
  },
  {
    id: 'DEM-005',
    motoboyId: '3b3afac0',
    motoboyNome: 'Samuel Silva dos Santos Nonato',
    data: '2026-01-30',
    tipo: 'Entrega',
    descricao: 'Entrega Apple Watch - Cliente Pedro Lima',
    lojaOrigem: 'Shopping Sul',
    lojaDestino: 'Endereço cliente',
    status: 'Concluída',
    valorDemanda: 25.00,
    vendaId: 'VEN-2026-0015'
  },
  {
    id: 'DEM-006',
    motoboyId: 'a962efd4',
    motoboyNome: 'João Vitor Rezende Andrade de Souza',
    data: '2026-01-30',
    tipo: 'Entrega',
    descricao: 'Entrega AirPods Pro',
    lojaOrigem: 'SIA - Matriz',
    lojaDestino: 'Endereço cliente',
    status: 'Pendente',
    valorDemanda: 20.00
  }
];

// Mock de remunerações - competências bi-mensais
let remuneracoes: RemuneracaoMotoboy[] = [
  {
    id: 'REM-001',
    motoboyId: 'a962efd4',
    motoboyNome: 'João Vitor Rezende Andrade de Souza',
    competencia: 'JAN-2026 - 1',
    periodoInicio: '2026-01-01',
    periodoFim: '2026-01-15',
    qtdDemandas: 12,
    valorTotal: 320.00,
    status: 'Pago',
    dataPagamento: '2026-01-16'
  },
  {
    id: 'REM-002',
    motoboyId: '3b3afac0',
    motoboyNome: 'Samuel Silva dos Santos Nonato',
    competencia: 'JAN-2026 - 1',
    periodoInicio: '2026-01-01',
    periodoFim: '2026-01-15',
    qtdDemandas: 8,
    valorTotal: 215.00,
    status: 'Pago',
    dataPagamento: '2026-01-16'
  },
  {
    id: 'REM-003',
    motoboyId: 'a962efd4',
    motoboyNome: 'João Vitor Rezende Andrade de Souza',
    competencia: 'JAN-2026 - 2',
    periodoInicio: '2026-01-16',
    periodoFim: '2026-01-31',
    qtdDemandas: 15,
    valorTotal: 405.00,
    status: 'Pendente'
  },
  {
    id: 'REM-004',
    motoboyId: '3b3afac0',
    motoboyNome: 'Samuel Silva dos Santos Nonato',
    competencia: 'JAN-2026 - 2',
    periodoInicio: '2026-01-16',
    periodoFim: '2026-01-31',
    qtdDemandas: 10,
    valorTotal: 285.00,
    status: 'Pendente'
  }
];

// Helpers para competência bi-mensal
const getMesesAbrev = () => ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

const getCompetenciaFromDate = (dateStr: string): { competencia: string; periodoInicio: string; periodoFim: string } => {
  const date = new Date(dateStr + 'T12:00:00');
  const meses = getMesesAbrev();
  const mes = meses[date.getMonth()];
  const ano = date.getFullYear();
  const dia = date.getDate();
  const ultimoDia = getDaysInMonth(date);

  if (dia <= 15) {
    return {
      competencia: `${mes}-${ano} - 1`,
      periodoInicio: `${ano}-${String(date.getMonth() + 1).padStart(2, '0')}-01`,
      periodoFim: `${ano}-${String(date.getMonth() + 1).padStart(2, '0')}-15`
    };
  } else {
    return {
      competencia: `${mes}-${ano} - 2`,
      periodoInicio: `${ano}-${String(date.getMonth() + 1).padStart(2, '0')}-16`,
      periodoFim: `${ano}-${String(date.getMonth() + 1).padStart(2, '0')}-${ultimoDia}`
    };
  }
};

// Criar ou atualizar remuneração do período ao adicionar demanda
const atualizarRemuneracaoPeriodo = (demanda: DemandaMotoboy) => {
  if (demanda.status !== 'Concluída') return;

  const { competencia, periodoInicio, periodoFim } = getCompetenciaFromDate(demanda.data);

  const existente = remuneracoes.find(
    r => r.motoboyId === demanda.motoboyId && r.competencia === competencia
  );

  if (existente) {
    existente.qtdDemandas += 1;
    existente.valorTotal += demanda.valorDemanda;
    console.log(`[MOTOBOY] Remuneração ${existente.id} atualizada: +1 demanda, total ${existente.valorTotal}`);
  } else {
    const novaRem: RemuneracaoMotoboy = {
      id: `REM-${Date.now()}`,
      motoboyId: demanda.motoboyId,
      motoboyNome: demanda.motoboyNome,
      competencia,
      periodoInicio,
      periodoFim,
      qtdDemandas: 1,
      valorTotal: demanda.valorDemanda,
      status: 'Pendente'
    };
    remuneracoes.push(novaRem);
    console.log(`[MOTOBOY] Nova remuneração ${novaRem.id} criada para ${demanda.motoboyNome} - ${competencia}`);
  }
};

// Adicionar nova demanda de motoboy
export const addDemandaMotoboy = (demanda: Omit<DemandaMotoboy, 'id'>): DemandaMotoboy => {
  const novaDemanda: DemandaMotoboy = {
    ...demanda,
    id: `DEM-${Date.now()}`
  };
  demandas.push(novaDemanda);
  console.log(`[MOTOBOY] Demanda ${novaDemanda.id} registrada para ${demanda.motoboyNome}`);

  // Atualizar/criar remuneração automaticamente
  atualizarRemuneracaoPeriodo(novaDemanda);

  return novaDemanda;
};

export const getDemandas = (filtros?: {
  motoboyId?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: string;
}): DemandaMotoboy[] => {
  let resultado = [...demandas];
  
  if (filtros?.motoboyId) {
    resultado = resultado.filter(d => d.motoboyId === filtros.motoboyId);
  }
  if (filtros?.dataInicio) {
    resultado = resultado.filter(d => d.data >= filtros.dataInicio!);
  }
  if (filtros?.dataFim) {
    resultado = resultado.filter(d => d.data <= filtros.dataFim!);
  }
  if (filtros?.status && filtros.status !== 'todas') {
    resultado = resultado.filter(d => d.status === filtros.status);
  }
  
  return resultado.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
};

export const getRemuneracoes = (filtros?: {
  motoboyId?: string;
  competencia?: string;
  status?: string;
}): RemuneracaoMotoboy[] => {
  let resultado = [...remuneracoes];
  
  if (filtros?.motoboyId) {
    resultado = resultado.filter(r => r.motoboyId === filtros.motoboyId);
  }
  if (filtros?.competencia) {
    resultado = resultado.filter(r => r.competencia === filtros.competencia);
  }
  if (filtros?.status && filtros.status !== 'todos') {
    resultado = resultado.filter(r => r.status === filtros.status);
  }
  
  return resultado.sort((a, b) => {
    if (a.status === 'Pendente' && b.status === 'Pago') return -1;
    if (a.status === 'Pago' && b.status === 'Pendente') return 1;
    return new Date(b.periodoInicio).getTime() - new Date(a.periodoInicio).getTime();
  });
};

export const calcularRemuneracaoPeriodo = (
  motoboyId: string,
  periodoInicio: string,
  periodoFim: string
): { qtdDemandas: number; valorTotal: number } => {
  const demandasPeriodo = demandas.filter(d => 
    d.motoboyId === motoboyId &&
    d.data >= periodoInicio &&
    d.data <= periodoFim &&
    d.status === 'Concluída'
  );
  
  return {
    qtdDemandas: demandasPeriodo.length,
    valorTotal: demandasPeriodo.reduce((acc, d) => acc + d.valorDemanda, 0)
  };
};

export interface DadosPagamentoRemuneracao {
  contaId: string;
  contaNome: string;
  comprovante: string;
  comprovanteNome: string;
  pagoPor: string;
  observacoes?: string;
}

export const registrarPagamentoRemuneracao = (id: string, dados?: DadosPagamentoRemuneracao): boolean => {
  const index = remuneracoes.findIndex(r => r.id === id);
  if (index === -1) return false;
  
  const rem = remuneracoes[index];
  const hoje = new Date().toISOString().split('T')[0];
  
  remuneracoes[index] = {
    ...rem,
    status: 'Pago',
    dataPagamento: hoje,
    ...(dados ? {
      contaId: dados.contaId,
      contaNome: dados.contaNome,
      comprovante: dados.comprovante,
      comprovanteNome: dados.comprovanteNome,
      pagoPor: dados.pagoPor,
      observacoesPagamento: dados.observacoes
    } : {})
  };

  // Integração financeira - lançar despesa no extrato
  if (dados) {
    try {
      // Lançar despesa no extrato financeiro
      const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      const competenciaFinanceira = `${meses[mesAtual]}-${anoAtual}`;

      const finApi = getFinanceModule();
      if (!finApi) { console.warn('[MOTOBOY] financeApi not loaded yet'); }
      (finApi?.addDespesa || (() => {}))({
        tipo: 'Variável' as const,
        data: hoje,
        descricao: `Pagamento Remuneração Motoboy - ${rem.motoboyNome} - Período ${new Date(rem.periodoInicio).toLocaleDateString('pt-BR')} a ${new Date(rem.periodoFim).toLocaleDateString('pt-BR')}`,
        valor: rem.valorTotal,
        competencia: competenciaFinanceira,
        conta: dados.contaNome,
        observacoes: dados.observacoes || '',
        lojaId: '3ac7e00c', // Matriz
        status: 'Pago' as const,
        categoria: 'Frete/Logística',
        dataVencimento: hoje,
        dataPagamento: hoje,
        recorrente: false,
        periodicidade: null,
        pagoPor: dados.pagoPor,
        comprovante: dados.comprovanteNome
      });
      console.log(`[MOTOBOY] Despesa financeira lançada para remuneração ${id}`);
    } catch (e) {
      console.error('[MOTOBOY] Erro ao lançar despesa financeira:', e);
    }
  }
  
  return true;
};

export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

// Competências bi-mensais: MMM-AAAA - 1 (01-15) e MMM-AAAA - 2 (16-fim)
export const gerarCompetencias = (): string[] => {
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const anoAtual = new Date().getFullYear();
  const competencias: string[] = [];
  
  for (let ano = anoAtual - 1; ano <= anoAtual + 1; ano++) {
    for (const mes of meses) {
      competencias.push(`${mes}-${ano} - 1`);
      competencias.push(`${mes}-${ano} - 2`);
    }
  }
  
  return competencias;
};

// Detalhamento de entregas para drill-down da remuneração
export interface DetalheEntregaRemuneracao {
  demandaId: string;
  vendaId: string;
  vendedor: string;
  produto: string;
  localizacao: string;
  valorEntrega: number;
  valorVenda: number;
}

export const getDetalheEntregasRemuneracao = (
  motoboyId: string,
  periodoInicio: string,
  periodoFim: string
): DetalheEntregaRemuneracao[] => {
  // Lazy import to avoid circular dependency
  const vendasMod = getVendasModule();
  const todasVendas = vendasMod?.getVendas ? vendasMod.getVendas() : [];

  const demandasPeriodo = demandas.filter(d =>
    d.motoboyId === motoboyId &&
    d.data >= periodoInicio &&
    d.data <= periodoFim &&
    d.status === 'Concluída'
  );

  return demandasPeriodo.map(d => {
    // Buscar dados reais da venda quando vendaId existir
    if (d.vendaId) {
      const venda = todasVendas.find((v: any) => v.id === d.vendaId);
      if (venda) {
        return {
          demandaId: d.id,
          vendaId: d.vendaId,
          vendedor: venda.vendedor || d.motoboyNome,
          produto: venda.itens?.map((i: any) => i.produto).join(', ') || d.descricao,
          localizacao: d.lojaDestino,
          valorEntrega: d.valorDemanda,
          valorVenda: venda.total || 0
        };
      }
    }
    // Fallback para demandas sem vendaId
    return {
      demandaId: d.id,
      vendaId: d.vendaId || '-',
      vendedor: d.motoboyNome,
      produto: d.descricao,
      localizacao: d.lojaDestino,
      valorEntrega: d.valorDemanda,
      valorVenda: 0
    };
  });
};

// Estatísticas gerais de motoboys
export const getEstatisticasMotoboys = () => {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  
  const demandasMes = demandas.filter(d => 
    new Date(d.data) >= inicioMes && new Date(d.data) <= fimMes
  );
  
  const remuneracoesPendentes = remuneracoes.filter(r => r.status === 'Pendente');
  
  return {
    totalDemandasMes: demandasMes.filter(d => d.status === 'Concluída').length,
    demandasPendentes: demandasMes.filter(d => d.status === 'Pendente').length,
    valorTotalMes: demandasMes.filter(d => d.status === 'Concluída').reduce((acc, d) => acc + d.valorDemanda, 0),
    remuneracoesPendentes: remuneracoesPendentes.length,
    valorPendentePagamento: remuneracoesPendentes.reduce((acc, r) => acc + r.valorTotal, 0)
  };
};
