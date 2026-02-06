// Fiado API - Modelo de Crédito Flexível com Amortizações Variáveis

export interface DividaFiado {
  id: string;
  vendaId: string;
  clienteId: string;
  clienteNome: string;
  lojaId: string;
  lojaNome: string;
  valorFinal: number;
  qtdVezes: number;
  tipoRecorrencia: 'Mensal' | 'Semanal';
  inicioCompetencia: string; // formato "MMM-YYYY"
  situacao: 'Em Aberto' | 'Quitado';
  dataCriacao: string;
}

export interface PagamentoFiado {
  id: string;
  dividaId: string;
  valor: number;
  dataPagamento: string;
  responsavel: string;
  comprovanteBase64?: string;
  comprovanteNome?: string;
}

// Mock data convertido do modelo anterior
let dividasFiado: DividaFiado[] = [
  {
    id: 'DIV-001',
    vendaId: 'VEN-2025-0050',
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    lojaId: 'db894e7d',
    lojaNome: 'Loja - JK Shopping',
    valorFinal: 1500,
    qtdVezes: 3,
    tipoRecorrencia: 'Mensal',
    inicioCompetencia: 'Dez-2024',
    situacao: 'Em Aberto',
    dataCriacao: '2024-12-01T10:00:00'
  },
  {
    id: 'DIV-002',
    vendaId: 'VEN-2025-0055',
    clienteId: 'CLI-003',
    clienteNome: 'Carlos Oliveira',
    lojaId: '3ac7e00c',
    lojaNome: 'Loja - Matriz',
    valorFinal: 2000,
    qtdVezes: 5,
    tipoRecorrencia: 'Mensal',
    inicioCompetencia: 'Dez-2024',
    situacao: 'Em Aberto',
    dataCriacao: '2024-12-05T14:00:00'
  },
  {
    id: 'DIV-003',
    vendaId: 'VEN-2025-0060',
    clienteId: 'CLI-005',
    clienteNome: 'Ana Paula Ferreira',
    lojaId: 'db894e7d',
    lojaNome: 'Loja - JK Shopping',
    valorFinal: 1500,
    qtdVezes: 2,
    tipoRecorrencia: 'Semanal',
    inicioCompetencia: 'Jan-2025',
    situacao: 'Em Aberto',
    dataCriacao: '2025-01-03T09:30:00'
  },
  {
    id: 'DIV-004',
    vendaId: 'VEN-2025-0062',
    clienteId: 'CLI-007',
    clienteNome: 'Roberto Mendes',
    lojaId: '5b9446d5',
    lojaNome: 'Loja - Shopping Sul',
    valorFinal: 1300,
    qtdVezes: 4,
    tipoRecorrencia: 'Mensal',
    inicioCompetencia: 'Jan-2025',
    situacao: 'Quitado',
    dataCriacao: '2025-01-08T11:00:00'
  }
];

let pagamentosFiado: PagamentoFiado[] = [
  // Pagamentos da dívida 1 (João Silva - R$ 1.500)
  {
    id: 'PGT-001',
    dividaId: 'DIV-001',
    valor: 500,
    dataPagamento: '2024-12-04T14:30:00',
    responsavel: 'Maria Santos'
  },
  {
    id: 'PGT-002',
    dividaId: 'DIV-001',
    valor: 500,
    dataPagamento: '2025-01-05T10:15:00',
    responsavel: 'Maria Santos'
  },
  // Pagamentos da dívida 2 (Carlos Oliveira - R$ 2.000)
  {
    id: 'PGT-003',
    dividaId: 'DIV-002',
    valor: 400,
    dataPagamento: '2024-12-10T16:45:00',
    responsavel: 'Pedro Costa'
  },
  // Pagamentos da dívida 4 (Roberto Mendes - R$ 1.300, quitado)
  {
    id: 'PGT-004',
    dividaId: 'DIV-004',
    valor: 500,
    dataPagamento: '2025-01-15T09:00:00',
    responsavel: 'João Gestor'
  },
  {
    id: 'PGT-005',
    dividaId: 'DIV-004',
    valor: 500,
    dataPagamento: '2025-02-10T14:20:00',
    responsavel: 'João Gestor'
  },
  {
    id: 'PGT-006',
    dividaId: 'DIV-004',
    valor: 300,
    dataPagamento: '2025-03-05T11:30:00',
    responsavel: 'João Gestor'
  }
];

let nextDividaId = 5;
let nextPagamentoId = 7;

// --- Funções de consulta ---

export function getDividasFiado(): DividaFiado[] {
  return [...dividasFiado];
}

export function getPagamentosDivida(dividaId: string): PagamentoFiado[] {
  return pagamentosFiado.filter(p => p.dividaId === dividaId);
}

export function getValorPagoDivida(dividaId: string): number {
  return pagamentosFiado
    .filter(p => p.dividaId === dividaId)
    .reduce((acc, p) => acc + p.valor, 0);
}

export function getSaldoDevedor(divida: DividaFiado): number {
  const valorPago = getValorPagoDivida(divida.id);
  return Math.max(0, divida.valorFinal - valorPago);
}

export function getProgressoDivida(divida: DividaFiado): number {
  const valorPago = getValorPagoDivida(divida.id);
  return Math.min(100, (valorPago / divida.valorFinal) * 100);
}

// --- Funções de mutação ---

export function criarDividaFiado(
  vendaId: string,
  clienteId: string,
  clienteNome: string,
  lojaId: string,
  lojaNome: string,
  valorFinal: number,
  qtdVezes: number,
  tipoRecorrencia: 'Mensal' | 'Semanal'
): DividaFiado {
  const agora = new Date();
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const divida: DividaFiado = {
    id: `DIV-${String(nextDividaId++).padStart(3, '0')}`,
    vendaId,
    clienteId,
    clienteNome,
    lojaId,
    lojaNome,
    valorFinal,
    qtdVezes,
    tipoRecorrencia,
    inicioCompetencia: `${meses[agora.getMonth()]}-${agora.getFullYear()}`,
    situacao: 'Em Aberto',
    dataCriacao: agora.toISOString()
  };

  dividasFiado.push(divida);
  return divida;
}

export function registrarPagamentoFiado(
  dividaId: string,
  valor: number,
  responsavel: string,
  comprovanteBase64?: string,
  comprovanteNome?: string
): PagamentoFiado | null {
  const divida = dividasFiado.find(d => d.id === dividaId);
  if (!divida || divida.situacao === 'Quitado') return null;

  const pagamento: PagamentoFiado = {
    id: `PGT-${String(nextPagamentoId++).padStart(3, '0')}`,
    dividaId,
    valor,
    dataPagamento: new Date().toISOString(),
    responsavel,
    comprovanteBase64,
    comprovanteNome
  };

  pagamentosFiado.push(pagamento);

  // Verificar quitação automática (tolerância de 0.01)
  const totalPago = getValorPagoDivida(dividaId);
  if (totalPago >= divida.valorFinal - 0.01) {
    divida.situacao = 'Quitado';
  }

  return pagamento;
}

// --- Estatísticas ---

export function getEstatisticasFiado() {
  const dividas = getDividasFiado();
  const emAberto = dividas.filter(d => d.situacao === 'Em Aberto');
  const quitadas = dividas.filter(d => d.situacao === 'Quitado');

  const valorTotalEmAberto = emAberto.reduce((acc, d) => acc + d.valorFinal, 0);
  const valorPagoEmAberto = emAberto.reduce((acc, d) => acc + getValorPagoDivida(d.id), 0);
  const saldoDevedor = valorTotalEmAberto - valorPagoEmAberto;

  const valorTotalQuitado = quitadas.reduce((acc, d) => acc + d.valorFinal, 0);

  return {
    totalEmAberto: emAberto.length,
    totalQuitadas: quitadas.length,
    valorTotalEmAberto,
    valorTotalQuitado,
    saldoDevedor,
    valorRecebido: valorPagoEmAberto + valorTotalQuitado
  };
}

// --- Formatação ---

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}
