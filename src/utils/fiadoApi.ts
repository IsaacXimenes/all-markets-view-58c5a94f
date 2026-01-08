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

// Mock data
let parcelasFiado: ParcelaFiado[] = [];

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
