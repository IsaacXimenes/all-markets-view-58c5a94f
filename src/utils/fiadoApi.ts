// Fiado API - Gerenciamento de parcelas de vendas no fiado
import { addMonths, differenceInDays, format, setDate } from 'date-fns';

export interface ParcelaFiado {
  id: string;
  vendaId: string;
  clienteId: string;
  clienteNome: string;
  lojaId: string;
  lojaNome: string;
  numeroParcela: number;
  totalParcelas: number;
  valorParcela: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'Pendente' | 'Pago' | 'Vencido';
  contaDestino?: string;
  responsavelPagamento?: string;
  observacao?: string;
}

// Mock data com exemplos
let parcelasFiado: ParcelaFiado[] = [
  // Venda 1 - Cliente com parcelas em dia
  {
    id: 'FIADO-VEN-2025-0050-1',
    vendaId: 'VEN-2025-0050',
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports - Centro',
    numeroParcela: 1,
    totalParcelas: 3,
    valorParcela: 500,
    dataVencimento: '2024-12-05T00:00:00',
    dataPagamento: '2024-12-04T14:30:00',
    status: 'Pago',
    contaDestino: 'Caixa Principal',
    responsavelPagamento: 'Maria Santos'
  },
  {
    id: 'FIADO-VEN-2025-0050-2',
    vendaId: 'VEN-2025-0050',
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports - Centro',
    numeroParcela: 2,
    totalParcelas: 3,
    valorParcela: 500,
    dataVencimento: '2025-01-05T00:00:00',
    dataPagamento: '2025-01-05T10:15:00',
    status: 'Pago',
    contaDestino: 'Caixa Principal',
    responsavelPagamento: 'Maria Santos'
  },
  {
    id: 'FIADO-VEN-2025-0050-3',
    vendaId: 'VEN-2025-0050',
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports - Centro',
    numeroParcela: 3,
    totalParcelas: 3,
    valorParcela: 500,
    dataVencimento: '2025-02-05T00:00:00',
    status: 'Pendente'
  },
  // Venda 2 - Cliente com parcela vencida
  {
    id: 'FIADO-VEN-2025-0055-1',
    vendaId: 'VEN-2025-0055',
    clienteId: 'CLI-003',
    clienteNome: 'Carlos Oliveira',
    lojaId: 'LOJA-002',
    lojaNome: 'Thiago Imports - Shopping',
    numeroParcela: 1,
    totalParcelas: 5,
    valorParcela: 400,
    dataVencimento: '2024-12-10T00:00:00',
    dataPagamento: '2024-12-10T16:45:00',
    status: 'Pago',
    contaDestino: 'Banco Itaú',
    responsavelPagamento: 'Pedro Costa'
  },
  {
    id: 'FIADO-VEN-2025-0055-2',
    vendaId: 'VEN-2025-0055',
    clienteId: 'CLI-003',
    clienteNome: 'Carlos Oliveira',
    lojaId: 'LOJA-002',
    lojaNome: 'Thiago Imports - Shopping',
    numeroParcela: 2,
    totalParcelas: 5,
    valorParcela: 400,
    dataVencimento: '2025-01-02T00:00:00',
    status: 'Vencido'
  },
  {
    id: 'FIADO-VEN-2025-0055-3',
    vendaId: 'VEN-2025-0055',
    clienteId: 'CLI-003',
    clienteNome: 'Carlos Oliveira',
    lojaId: 'LOJA-002',
    lojaNome: 'Thiago Imports - Shopping',
    numeroParcela: 3,
    totalParcelas: 5,
    valorParcela: 400,
    dataVencimento: '2025-02-10T00:00:00',
    status: 'Pendente'
  },
  {
    id: 'FIADO-VEN-2025-0055-4',
    vendaId: 'VEN-2025-0055',
    clienteId: 'CLI-003',
    clienteNome: 'Carlos Oliveira',
    lojaId: 'LOJA-002',
    lojaNome: 'Thiago Imports - Shopping',
    numeroParcela: 4,
    totalParcelas: 5,
    valorParcela: 400,
    dataVencimento: '2025-03-10T00:00:00',
    status: 'Pendente'
  },
  {
    id: 'FIADO-VEN-2025-0055-5',
    vendaId: 'VEN-2025-0055',
    clienteId: 'CLI-003',
    clienteNome: 'Carlos Oliveira',
    lojaId: 'LOJA-002',
    lojaNome: 'Thiago Imports - Shopping',
    numeroParcela: 5,
    totalParcelas: 5,
    valorParcela: 400,
    dataVencimento: '2025-04-10T00:00:00',
    status: 'Pendente'
  },
  // Venda 3 - Vence hoje
  {
    id: 'FIADO-VEN-2025-0060-1',
    vendaId: 'VEN-2025-0060',
    clienteId: 'CLI-005',
    clienteNome: 'Ana Paula Ferreira',
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports - Centro',
    numeroParcela: 1,
    totalParcelas: 2,
    valorParcela: 750,
    dataVencimento: new Date().toISOString().split('T')[0] + 'T00:00:00',
    status: 'Pendente'
  },
  {
    id: 'FIADO-VEN-2025-0060-2',
    vendaId: 'VEN-2025-0060',
    clienteId: 'CLI-005',
    clienteNome: 'Ana Paula Ferreira',
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports - Centro',
    numeroParcela: 2,
    totalParcelas: 2,
    valorParcela: 750,
    dataVencimento: '2025-02-08T00:00:00',
    status: 'Pendente'
  },
  // Venda 4 - Vence em 3 dias
  {
    id: 'FIADO-VEN-2025-0062-1',
    vendaId: 'VEN-2025-0062',
    clienteId: 'CLI-007',
    clienteNome: 'Roberto Mendes',
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports - Centro',
    numeroParcela: 1,
    totalParcelas: 4,
    valorParcela: 325,
    dataVencimento: '2025-01-11T00:00:00',
    status: 'Pendente'
  },
  {
    id: 'FIADO-VEN-2025-0062-2',
    vendaId: 'VEN-2025-0062',
    clienteId: 'CLI-007',
    clienteNome: 'Roberto Mendes',
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports - Centro',
    numeroParcela: 2,
    totalParcelas: 4,
    valorParcela: 325,
    dataVencimento: '2025-02-11T00:00:00',
    status: 'Pendente'
  },
  {
    id: 'FIADO-VEN-2025-0062-3',
    vendaId: 'VEN-2025-0062',
    clienteId: 'CLI-007',
    clienteNome: 'Roberto Mendes',
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports - Centro',
    numeroParcela: 3,
    totalParcelas: 4,
    valorParcela: 325,
    dataVencimento: '2025-03-11T00:00:00',
    status: 'Pendente'
  },
  {
    id: 'FIADO-VEN-2025-0062-4',
    vendaId: 'VEN-2025-0062',
    clienteId: 'CLI-007',
    clienteNome: 'Roberto Mendes',
    lojaId: 'LOJA-001',
    lojaNome: 'Thiago Imports - Centro',
    numeroParcela: 4,
    totalParcelas: 4,
    valorParcela: 325,
    dataVencimento: '2025-04-11T00:00:00',
    status: 'Pendente'
  }
];

export function getParcelasFiado(): ParcelaFiado[] {
  // Atualizar status de parcelas vencidas
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  parcelasFiado = parcelasFiado.map(p => {
    if (p.status === 'Pendente' && new Date(p.dataVencimento) < hoje) {
      return { ...p, status: 'Vencido' };
    }
    return p;
  });
  
  return [...parcelasFiado];
}

export function criarParcelasFiado(
  vendaId: string,
  clienteId: string,
  clienteNome: string,
  lojaId: string,
  lojaNome: string,
  valorTotal: number,
  numeroParcelas: number,
  diaVencimento: number
): ParcelaFiado[] {
  const valorParcela = valorTotal / numeroParcelas;
  const hoje = new Date();
  const novasParcelas: ParcelaFiado[] = [];
  
  for (let i = 0; i < numeroParcelas; i++) {
    // Calcular data de vencimento
    let dataVencimento = addMonths(hoje, i + 1);
    
    // Ajustar para o dia do vencimento escolhido
    const ultimoDiaMes = new Date(dataVencimento.getFullYear(), dataVencimento.getMonth() + 1, 0).getDate();
    const diaAjustado = Math.min(diaVencimento, ultimoDiaMes);
    dataVencimento = setDate(dataVencimento, diaAjustado);
    
    const parcela: ParcelaFiado = {
      id: `FIADO-${vendaId}-${i + 1}`,
      vendaId,
      clienteId,
      clienteNome,
      lojaId,
      lojaNome,
      numeroParcela: i + 1,
      totalParcelas: numeroParcelas,
      valorParcela,
      dataVencimento: dataVencimento.toISOString(),
      status: 'Pendente'
    };
    
    novasParcelas.push(parcela);
  }
  
  parcelasFiado.push(...novasParcelas);
  return novasParcelas;
}

export function pagarParcelaFiado(
  parcelaId: string,
  contaDestino: string,
  responsavel: string,
  observacao?: string
): ParcelaFiado | null {
  const index = parcelasFiado.findIndex(p => p.id === parcelaId);
  if (index === -1) return null;
  
  parcelasFiado[index] = {
    ...parcelasFiado[index],
    status: 'Pago',
    dataPagamento: new Date().toISOString(),
    contaDestino,
    responsavelPagamento: responsavel,
    observacao
  };
  
  return parcelasFiado[index];
}

export function getDiasParaVencimento(dataVencimento: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  return differenceInDays(vencimento, hoje);
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Estatísticas
export function getEstatisticasFiado() {
  const parcelas = getParcelasFiado();
  const pendentes = parcelas.filter(p => p.status === 'Pendente');
  const vencidas = parcelas.filter(p => p.status === 'Vencido');
  const pagas = parcelas.filter(p => p.status === 'Pago');
  
  return {
    totalPendentes: pendentes.length,
    totalVencidas: vencidas.length,
    totalPagas: pagas.length,
    valorPendente: pendentes.reduce((acc, p) => acc + p.valorParcela, 0),
    valorVencido: vencidas.reduce((acc, p) => acc + p.valorParcela, 0),
    valorRecebido: pagas.reduce((acc, p) => acc + p.valorParcela, 0)
  };
}
