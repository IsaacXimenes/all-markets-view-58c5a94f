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
  meioPagamento: 'Pix' | 'Dinheiro' | 'Cartão Crédito' | 'Cartão Débito' | 'Transferência' | 'Outro';
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
const lojas = ['Loja Centro', 'Loja Shopping', 'Loja Norte', 'Loja Sul', 'Loja Oeste', 'Loja Leste', 'Administrativo'];

let contas: Conta[] = [
  {
    id: 'CTA-001',
    nome: 'Caixa Loja Centro',
    tipo: 'Caixa',
    lojaVinculada: 'Loja Centro',
    saldoAtual: 45230.50
  },
  {
    id: 'CTA-002',
    nome: 'Pix Loja Shopping',
    tipo: 'Pix',
    lojaVinculada: 'Loja Shopping',
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
    lojaVinculada: 'Loja Norte',
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
    lojaVinculada: 'Loja Sul',
    saldoAtual: 32100.25
  },
  {
    id: 'CTA-006',
    nome: 'Pix Loja Oeste',
    tipo: 'Pix',
    lojaVinculada: 'Loja Oeste',
    banco: 'PagBank',
    cnpj: '12.345.678/0003-52',
    saldoAtual: 54890.60
  },
  {
    id: 'CTA-007',
    nome: 'Conta Bancária Loja Leste',
    tipo: 'Conta Bancária',
    lojaVinculada: 'Loja Leste',
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

let pagamentos: Pagamento[] = [
  {
    id: 'PAG-2025-0001',
    data: '2025-01-15',
    descricao: 'Venda iPhone 15 Pro',
    valor: 8999.00,
    meioPagamento: 'Pix',
    conta: 'Pix Loja Shopping',
    loja: 'Loja Shopping',
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0002',
    data: '2025-01-16',
    descricao: 'Venda AirPods Pro',
    valor: 2499.00,
    meioPagamento: 'Cartão Crédito',
    conta: 'Conta Bancária Principal',
    loja: 'Loja Centro',
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0003',
    data: '2025-01-16',
    descricao: 'Venda Apple Watch',
    valor: 4799.00,
    meioPagamento: 'Dinheiro',
    conta: 'Caixa Loja Centro',
    loja: 'Loja Centro',
    status: 'Conferido'
  },
  {
    id: 'PAG-2025-0004',
    data: '2025-01-17',
    descricao: 'Venda MacBook Air',
    valor: 12999.00,
    meioPagamento: 'Transferência',
    conta: 'Conta Digital Norte',
    loja: 'Loja Norte',
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0005',
    data: '2025-01-17',
    descricao: 'Venda Capinha iPhone',
    valor: 149.90,
    meioPagamento: 'Pix',
    conta: 'Pix Loja Oeste',
    loja: 'Loja Oeste',
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0006',
    data: '2025-01-18',
    descricao: 'Venda iPad Pro',
    valor: 9999.00,
    meioPagamento: 'Cartão Débito',
    conta: 'Conta Bancária Loja Leste',
    loja: 'Loja Leste',
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0007',
    data: '2025-01-18',
    descricao: 'Venda Carregador MagSafe',
    valor: 399.00,
    meioPagamento: 'Dinheiro',
    conta: 'Caixa Loja Sul',
    loja: 'Loja Sul',
    status: 'Conferido'
  },
  {
    id: 'PAG-2025-0008',
    data: '2025-01-19',
    descricao: 'Venda Apple Pencil',
    valor: 1299.00,
    meioPagamento: 'Pix',
    conta: 'Pix Loja Shopping',
    loja: 'Loja Shopping',
    status: 'Pendente'
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
  return [...pagamentos];
};

export const conferirPagamento = (id: string): boolean => {
  const pagamento = pagamentos.find(p => p.id === id);
  if (!pagamento) return false;
  pagamento.status = 'Conferido';
  return true;
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

// Função para exportar para CSV
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(item => 
    Object.values(item).map(value => 
      typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    ).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const getLojas = () => lojas;
