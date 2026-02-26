// Motoboy API - Gerenciamento de demandas e remuneração de motoboys
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';

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

// Adicionar nova demanda de motoboy
export const addDemandaMotoboy = (demanda: Omit<DemandaMotoboy, 'id'>): DemandaMotoboy => {
  const novaDemanda: DemandaMotoboy = {
    ...demanda,
    id: `DEM-${Date.now()}`
  };
  demandas.push(novaDemanda);
  console.log(`[MOTOBOY] Demanda ${novaDemanda.id} registrada para ${demanda.motoboyNome}`);
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

export const registrarPagamentoRemuneracao = (id: string): boolean => {
  const index = remuneracoes.findIndex(r => r.id === id);
  if (index === -1) return false;
  
  remuneracoes[index] = {
    ...remuneracoes[index],
    status: 'Pago',
    dataPagamento: new Date().toISOString().split('T')[0]
  };
  
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
  const { getVendas } = require('./vendasApi');
  const todasVendas = getVendas();

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
