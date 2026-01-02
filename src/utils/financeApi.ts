// Tipos
export interface Conta {
  id: string;
  nome: string;
  tipo: 'Caixa' | 'Pix' | 'Conta Bancária' | 'Conta Digital';
  lojaVinculada: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  cnpj?: string;
  saldoAtual: number;
}

export interface Pagamento {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  meioPagamento: 'Pix' | 'Dinheiro' | 'Cartão Crédito' | 'Cartão Débito' | 'Transferência' | 'Boleto' | 'Outro';
  conta: string;
  loja: string;
  status: 'Pendente' | 'Conferido';
}

export interface Despesa {
  id: string;
  tipo: 'Fixa' | 'Variável';
  data: string;
  descricao: string;
  valor: number;
  competencia: string;
  conta: string;
  observacoes?: string;
}

// Dados mockados
const lojas = ['LOJA-001', 'LOJA-002', 'LOJA-003', 'LOJA-004', 'LOJA-005', 'LOJA-006', 'Administrativo'];

let contas: Conta[] = [
  {
    id: 'CTA-001',
    nome: 'Caixa Loja Centro',
    tipo: 'Caixa',
    lojaVinculada: 'LOJA-001',
    saldoAtual: 45230.50
  },
  {
    id: 'CTA-002',
    nome: 'Pix Loja Shopping',
    tipo: 'Pix',
    lojaVinculada: 'LOJA-004',
    banco: 'Nubank',
    cnpj: '12.345.678/0001-90',
    saldoAtual: 89450.80
  },
  {
    id: 'CTA-003',
    nome: 'Conta Bancária Principal',
    tipo: 'Conta Bancária',
    lojaVinculada: 'Administrativo',
    banco: 'Banco do Brasil',
    agencia: '1234-5',
    conta: '98765-4',
    cnpj: '12.345.678/0001-90',
    saldoAtual: 325890.45
  },
  {
    id: 'CTA-004',
    nome: 'Conta Digital Norte',
    tipo: 'Conta Digital',
    lojaVinculada: 'LOJA-002',
    banco: 'Inter',
    agencia: '0001',
    conta: '123456-7',
    cnpj: '12.345.678/0002-71',
    saldoAtual: 67320.90
  },
  {
    id: 'CTA-005',
    nome: 'Caixa Loja Sul',
    tipo: 'Caixa',
    lojaVinculada: 'LOJA-003',
    saldoAtual: 32100.25
  },
  {
    id: 'CTA-006',
    nome: 'Pix Loja Oeste',
    tipo: 'Pix',
    lojaVinculada: 'LOJA-005',
    banco: 'PagBank',
    cnpj: '12.345.678/0003-52',
    saldoAtual: 54890.60
  },
  {
    id: 'CTA-007',
    nome: 'Conta Bancária Loja Leste',
    tipo: 'Conta Bancária',
    lojaVinculada: 'LOJA-006',
    banco: 'Santander',
    agencia: '4567-8',
    conta: '12345-6',
    cnpj: '12.345.678/0004-33',
    saldoAtual: 98760.35
  },
  {
    id: 'CTA-008',
    nome: 'Conta Digital Administrativo',
    tipo: 'Conta Digital',
    lojaVinculada: 'Administrativo',
    banco: 'C6 Bank',
    agencia: '0001',
    conta: '654321-9',
    cnpj: '12.345.678/0001-90',
    saldoAtual: 156780.50
  }
];

// Pagamentos com 5 pendentes e 5 conferidos em 14/01/2025
let pagamentos: Pagamento[] = [
  // Pendentes (mais recentes primeiro ao ordenar)
  {
    id: 'PAG-2025-0001',
    data: '2025-01-14',
    descricao: 'Venda iPhone 15 Pro Max',
    valor: 12999.00,
    meioPagamento: 'Pix',
    conta: 'Pix Loja Shopping',
    loja: 'LOJA-004',
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0002',
    data: '2025-01-14',
    descricao: 'Venda MacBook Air M2',
    valor: 8499.00,
    meioPagamento: 'Cartão Crédito',
    conta: 'Conta Bancária Principal',
    loja: 'LOJA-001',
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0003',
    data: '2025-01-14',
    descricao: 'Venda Apple Watch Ultra 2',
    valor: 5999.00,
    meioPagamento: 'Dinheiro',
    conta: 'Caixa Loja Centro',
    loja: 'LOJA-001',
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0004',
    data: '2025-01-14',
    descricao: 'Venda AirPods Pro 2',
    valor: 2199.00,
    meioPagamento: 'Pix',
    conta: 'Pix Loja Oeste',
    loja: 'LOJA-005',
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0005',
    data: '2025-01-14',
    descricao: 'Venda iPad Pro 12.9"',
    valor: 9899.00,
    meioPagamento: 'Transferência',
    conta: 'Conta Digital Norte',
    loja: 'LOJA-002',
    status: 'Pendente'
  },
  // Conferidos
  {
    id: 'PAG-2025-0006',
    data: '2025-01-14',
    descricao: 'Venda iPhone 14',
    valor: 5499.00,
    meioPagamento: 'Cartão Débito',
    conta: 'Conta Bancária Loja Leste',
    loja: 'LOJA-006',
    status: 'Conferido'
  },
  {
    id: 'PAG-2025-0007',
    data: '2025-01-14',
    descricao: 'Venda Carregador MagSafe',
    valor: 399.00,
    meioPagamento: 'Dinheiro',
    conta: 'Caixa Loja Sul',
    loja: 'LOJA-003',
    status: 'Conferido'
  },
  {
    id: 'PAG-2025-0008',
    data: '2025-01-14',
    descricao: 'Venda Apple Pencil 2',
    valor: 1299.00,
    meioPagamento: 'Pix',
    conta: 'Pix Loja Shopping',
    loja: 'LOJA-004',
    status: 'Conferido'
  },
  {
    id: 'PAG-2025-0009',
    data: '2025-01-14',
    descricao: 'Venda Magic Keyboard',
    valor: 1599.00,
    meioPagamento: 'Cartão Crédito',
    conta: 'Conta Bancária Principal',
    loja: 'LOJA-001',
    status: 'Conferido'
  },
  {
    id: 'PAG-2025-0010',
    data: '2025-01-14',
    descricao: 'Venda iPhone 13',
    valor: 4299.00,
    meioPagamento: 'Boleto',
    conta: 'Conta Digital Administrativo',
    loja: 'LOJA-002',
    status: 'Conferido'
  }
];

let despesas: Despesa[] = [
  {
    id: 'DES-2025-0001',
    tipo: 'Fixa',
    data: '2025-01-05',
    descricao: 'Aluguel Loja Centro',
    valor: 8500.00,
    competencia: 'JAN-2025',
    conta: 'Conta Bancária Principal',
    observacoes: 'Pagamento mensal'
  },
  {
    id: 'DES-2025-0002',
    tipo: 'Fixa',
    data: '2025-01-05',
    descricao: 'Energia Elétrica - Todas as Lojas',
    valor: 4320.50,
    competencia: 'JAN-2025',
    conta: 'Conta Bancária Principal'
  },
  {
    id: 'DES-2025-0003',
    tipo: 'Fixa',
    data: '2025-01-10',
    descricao: 'Folha de Pagamento',
    valor: 125600.00,
    competencia: 'JAN-2025',
    conta: 'Conta Bancária Principal',
    observacoes: 'Salários + encargos'
  },
  {
    id: 'DES-2025-0004',
    tipo: 'Variável',
    data: '2025-01-12',
    descricao: 'Compra de Estoque - iPhones',
    valor: 89450.00,
    competencia: 'JAN-2025',
    conta: 'Conta Digital Administrativo',
    observacoes: '15 unidades iPhone 15 Pro'
  },
  {
    id: 'DES-2025-0005',
    tipo: 'Variável',
    data: '2025-01-15',
    descricao: 'Marketing Digital',
    valor: 3200.00,
    competencia: 'JAN-2025',
    conta: 'Conta Bancária Principal'
  },
  {
    id: 'DES-2025-0006',
    tipo: 'Fixa',
    data: '2025-01-05',
    descricao: 'Internet + Telefonia',
    valor: 980.00,
    competencia: 'JAN-2025',
    conta: 'Conta Bancária Principal'
  }
];

// Funções de API
export const getContas = (): Conta[] => {
  return [...contas];
};

export const addConta = (conta: Omit<Conta, 'id'>): Conta => {
  const newId = `CTA-${String(contas.length + 1).padStart(3, '0')}`;
  const newConta = { ...conta, id: newId };
  contas.push(newConta);
  return newConta;
};

export const updateConta = (id: string, updates: Partial<Conta>): Conta | null => {
  const index = contas.findIndex(c => c.id === id);
  if (index === -1) return null;
  contas[index] = { ...contas[index], ...updates };
  return contas[index];
};

export const deleteConta = (id: string): boolean => {
  const index = contas.findIndex(c => c.id === id);
  if (index === -1) return false;
  contas.splice(index, 1);
  return true;
};

export const getPagamentos = (): Pagamento[] => {
  // Ordenar: Pendentes primeiro, depois Conferidos
  // Dentro de cada grupo, ordenar por data mais recente (descendente)
  const sorted = [...pagamentos].sort((a, b) => {
    // Primeiro por status (Pendente antes de Conferido)
    if (a.status === 'Pendente' && b.status === 'Conferido') return -1;
    if (a.status === 'Conferido' && b.status === 'Pendente') return 1;
    // Depois por data (mais recente primeiro)
    return new Date(b.data).getTime() - new Date(a.data).getTime();
  });
  return sorted;
};

export const conferirPagamento = (id: string): boolean => {
  const pagamento = pagamentos.find(p => p.id === id);
  if (!pagamento) return false;
  pagamento.status = 'Conferido';
  return true;
};

// Interface para receber dados de venda para criar pagamento
export interface VendaParaPagamento {
  id: string;
  clienteNome: string;
  valorTotal: number;
  lojaVenda: string;
  pagamentos: Array<{
    meio: 'Pix' | 'Dinheiro' | 'Cartão Crédito' | 'Cartão Débito' | 'Transferência' | 'Boleto' | 'Outro';
    valor: number;
    contaId?: string;
  }>;
}

// Função para criar pagamentos automaticamente a partir de uma venda finalizada
export const criarPagamentosDeVenda = (venda: VendaParaPagamento): Pagamento[] => {
  const year = new Date().getFullYear();
  const createdPagamentos: Pagamento[] = [];
  
  venda.pagamentos.forEach((pag, index) => {
    const nextNum = pagamentos.filter(p => p.id.includes(String(year))).length + 1 + index;
    const newId = `PAG-${year}-${String(nextNum).padStart(4, '0')}`;
    
    // Encontrar conta padrão para o meio de pagamento
    let contaNome = pag.contaId ? contas.find(c => c.id === pag.contaId)?.nome : null;
    if (!contaNome) {
      // Mapear meio de pagamento para conta padrão
      if (pag.meio === 'Pix') {
        contaNome = contas.find(c => c.tipo === 'Pix' && c.lojaVinculada === venda.lojaVenda)?.nome || 'Conta Digital Administrativo';
      } else if (pag.meio === 'Dinheiro') {
        contaNome = contas.find(c => c.tipo === 'Caixa' && c.lojaVinculada === venda.lojaVenda)?.nome || 'Caixa Loja Centro';
      } else {
        contaNome = 'Conta Bancária Principal';
      }
    }
    
    const novoPagamento: Pagamento = {
      id: newId,
      data: new Date().toISOString().split('T')[0],
      descricao: `Venda #${venda.id} - ${venda.clienteNome}`,
      valor: pag.valor,
      meioPagamento: pag.meio,
      conta: contaNome,
      loja: venda.lojaVenda,
      status: 'Pendente'
    };
    
    pagamentos.push(novoPagamento);
    createdPagamentos.push(novoPagamento);
  });
  
  console.log(`[FINANCE] Criados ${createdPagamentos.length} pagamentos para venda ${venda.id}`);
  return createdPagamentos;
};

export const getDespesas = (): Despesa[] => {
  return [...despesas];
};

export const addDespesa = (despesa: Omit<Despesa, 'id'>): Despesa => {
  const year = new Date().getFullYear();
  const num = despesas.filter(d => d.id.includes(String(year))).length + 1;
  const newId = `DES-${year}-${String(num).padStart(4, '0')}`;
  const newDespesa = { ...despesa, id: newId };
  despesas.push(newDespesa);
  return newDespesa;
};

export const deleteDespesa = (id: string): boolean => {
  const index = despesas.findIndex(d => d.id === id);
  if (index === -1) return false;
  despesas.splice(index, 1);
  return true;
};

export const getLojas = () => lojas;
