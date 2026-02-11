// Tipos
import { getContasFinanceiras, ContaFinanceira, addContaFinanceira, updateContaFinanceira, deleteContaFinanceira } from './cadastrosApi';

// Re-exportar tipos e funções de contas para manter compatibilidade
export type Conta = ContaFinanceira;
export const addConta = addContaFinanceira;
export const updateConta = updateContaFinanceira;
export const deleteConta = deleteContaFinanceira;
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

export const CATEGORIAS_DESPESA = [
  'Aluguel', 'Energia', 'Água', 'Internet/Telefonia', 'Salários', 'Impostos',
  'Marketing', 'Estoque', 'Manutenção', 'Material de Escritório', 'Frete/Logística', 'Outros'
];

export interface Despesa {
  id: string;
  tipo: 'Fixa' | 'Variável';
  data: string;
  descricao: string;
  valor: number;
  competencia: string;
  conta: string;
  observacoes?: string;
  lojaId: string;
  status: 'À vencer' | 'Vencido' | 'Pago';
  categoria: string;
  dataVencimento: string;
  dataPagamento: string | null;
  recorrente: boolean;
  periodicidade: 'Mensal' | 'Trimestral' | 'Anual' | null;
  pagoPor: string | null;
  recorrenciaEncerrada?: boolean;
  dataEncerramentoRecorrencia?: string;
}

// IDs das lojas reais do useCadastroStore
const LOJAS_FINANCE = {
  MATRIZ: '3ac7e00c',
  ONLINE: 'fcc78c1a',
  JK_SHOPPING: 'db894e7d',
  AGUAS_LINDAS: '0d06e7db',
  SHOPPING_SUL: '5b9446d5',
};

// Pagamentos com 5 pendentes e 5 conferidos em 14/01/2025
let pagamentos: Pagamento[] = [
  // Pendentes (mais recentes primeiro ao ordenar)
  {
    id: 'PAG-2025-0001',
    data: '2025-01-14',
    descricao: 'Venda iPhone 15 Pro Max',
    valor: 12999.00,
    meioPagamento: 'Pix',
    conta: 'Santander (Santander JK)',
    loja: LOJAS_FINANCE.JK_SHOPPING,
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0002',
    data: '2025-01-14',
    descricao: 'Venda MacBook Air M2',
    valor: 8499.00,
    meioPagamento: 'Cartão Crédito',
    conta: 'Bradesco Thiago Eduardo',
    loja: LOJAS_FINANCE.MATRIZ,
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0003',
    data: '2025-01-14',
    descricao: 'Venda Apple Watch Ultra 2',
    valor: 5999.00,
    meioPagamento: 'Dinheiro',
    conta: 'Santander (Unicred)',
    loja: LOJAS_FINANCE.MATRIZ,
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0004',
    data: '2025-01-14',
    descricao: 'Venda AirPods Pro 2',
    valor: 2199.00,
    meioPagamento: 'Pix',
    conta: 'Santander (Unicred TH Imports)',
    loja: LOJAS_FINANCE.AGUAS_LINDAS,
    status: 'Pendente'
  },
  {
    id: 'PAG-2025-0005',
    data: '2025-01-14',
    descricao: 'Venda iPad Pro 12.9"',
    valor: 9899.00,
    meioPagamento: 'Transferência',
    conta: 'Bradesco Thiago Imports',
    loja: LOJAS_FINANCE.ONLINE,
    status: 'Pendente'
  },
  // Conferidos
  {
    id: 'PAG-2025-0006',
    data: '2025-01-14',
    descricao: 'Venda iPhone 14',
    valor: 5499.00,
    meioPagamento: 'Cartão Débito',
    conta: 'Bradesco Acessórios',
    loja: LOJAS_FINANCE.SHOPPING_SUL,
    status: 'Conferido'
  },
  {
    id: 'PAG-2025-0007',
    data: '2025-01-14',
    descricao: 'Venda Carregador MagSafe',
    valor: 399.00,
    meioPagamento: 'Dinheiro',
    conta: 'Santander (Bradesco Shopping Sul)',
    loja: LOJAS_FINANCE.SHOPPING_SUL,
    status: 'Conferido'
  },
  {
    id: 'PAG-2025-0008',
    data: '2025-01-14',
    descricao: 'Venda Apple Pencil 2',
    valor: 1299.00,
    meioPagamento: 'Pix',
    conta: 'Sicoob (Sicoob JK)',
    loja: LOJAS_FINANCE.JK_SHOPPING,
    status: 'Conferido'
  },
  {
    id: 'PAG-2025-0009',
    data: '2025-01-14',
    descricao: 'Venda Magic Keyboard',
    valor: 1599.00,
    meioPagamento: 'Cartão Crédito',
    conta: 'Bradesco Thiago Eduardo',
    loja: LOJAS_FINANCE.MATRIZ,
    status: 'Conferido'
  },
  {
    id: 'PAG-2025-0010',
    data: '2025-01-14',
    descricao: 'Venda iPhone 13',
    valor: 4299.00,
    meioPagamento: 'Boleto',
    conta: 'Bradesco Thiago Imports',
    loja: LOJAS_FINANCE.ONLINE,
    status: 'Conferido'
  }
];

let despesas: Despesa[] = [
  // FEV-2026 - Pagas
  {
    id: 'DES-2026-0001',
    tipo: 'Fixa',
    data: '2026-02-03',
    descricao: 'Aluguel Loja Matriz',
    valor: 8500.00,
    competencia: 'FEV-2026',
    conta: 'Bradesco Thiago Eduardo',
    observacoes: 'Pagamento mensal',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'Pago',
    categoria: 'Aluguel',
    dataVencimento: '2026-02-10',
    dataPagamento: '2026-02-03',
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: 'João Gestor'
  },
  {
    id: 'DES-2026-0002',
    tipo: 'Fixa',
    data: '2026-02-04',
    descricao: 'Energia Elétrica - Todas as Lojas',
    valor: 4320.50,
    competencia: 'FEV-2026',
    conta: 'Santander (Unicred)',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'Pago',
    categoria: 'Energia',
    dataVencimento: '2026-02-15',
    dataPagamento: '2026-02-04',
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: 'João Gestor'
  },
  {
    id: 'DES-2026-0003',
    tipo: 'Fixa',
    data: '2026-02-05',
    descricao: 'Internet + Telefonia',
    valor: 980.00,
    competencia: 'FEV-2026',
    conta: 'Bradesco Thiago Eduardo',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'Pago',
    categoria: 'Internet/Telefonia',
    dataVencimento: '2026-02-05',
    dataPagamento: '2026-02-05',
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: 'João Gestor'
  },
  {
    id: 'DES-2026-0004',
    tipo: 'Variável',
    data: '2026-02-06',
    descricao: 'Frete Transportadora - Lote iPhones',
    valor: 2340.00,
    competencia: 'FEV-2026',
    conta: 'Bradesco Thiago Imports',
    observacoes: 'Lote 45 unidades SP → BSB',
    lojaId: LOJAS_FINANCE.ONLINE,
    status: 'Pago',
    categoria: 'Frete/Logística',
    dataVencimento: '2026-02-06',
    dataPagamento: '2026-02-06',
    recorrente: false,
    periodicidade: null,
    pagoPor: 'João Gestor'
  },
  // FEV-2026 - Vencidas
  {
    id: 'DES-2026-0005',
    tipo: 'Fixa',
    data: '2026-02-01',
    descricao: 'Aluguel Loja Águas Lindas',
    valor: 5800.00,
    competencia: 'FEV-2026',
    conta: 'Bradesco Thiago Eduardo',
    lojaId: LOJAS_FINANCE.AGUAS_LINDAS,
    status: 'Vencido',
    categoria: 'Aluguel',
    dataVencimento: '2026-02-05',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: null
  },
  {
    id: 'DES-2026-0006',
    tipo: 'Variável',
    data: '2026-02-01',
    descricao: 'Material de Escritório',
    valor: 450.00,
    competencia: 'FEV-2026',
    conta: 'Santander (Unicred)',
    lojaId: LOJAS_FINANCE.AGUAS_LINDAS,
    status: 'Vencido',
    categoria: 'Material de Escritório',
    dataVencimento: '2026-02-08',
    dataPagamento: null,
    recorrente: false,
    periodicidade: null,
    pagoPor: null
  },
  // FEV-2026 - À vencer
  {
    id: 'DES-2026-0007',
    tipo: 'Fixa',
    data: '2026-02-01',
    descricao: 'Folha de Pagamento - Fevereiro',
    valor: 128350.00,
    competencia: 'FEV-2026',
    conta: 'Bradesco Thiago Eduardo',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'À vencer',
    categoria: 'Salários',
    dataVencimento: '2026-02-15',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: null
  },
  {
    id: 'DES-2026-0008',
    tipo: 'Fixa',
    data: '2026-02-01',
    descricao: 'Aluguel Loja JK Shopping',
    valor: 12000.00,
    competencia: 'FEV-2026',
    conta: 'Santander (Santander JK)',
    lojaId: LOJAS_FINANCE.JK_SHOPPING,
    status: 'À vencer',
    categoria: 'Aluguel',
    dataVencimento: '2026-02-20',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: null
  },
  {
    id: 'DES-2026-0009',
    tipo: 'Variável',
    data: '2026-02-03',
    descricao: 'Manutenção Ar Condicionado',
    valor: 1850.00,
    competencia: 'FEV-2026',
    conta: 'Bradesco Thiago Eduardo',
    lojaId: LOJAS_FINANCE.SHOPPING_SUL,
    status: 'À vencer',
    categoria: 'Manutenção',
    dataVencimento: '2026-02-22',
    dataPagamento: null,
    recorrente: false,
    periodicidade: null,
    pagoPor: null
  },
  {
    id: 'DES-2026-0010',
    tipo: 'Fixa',
    data: '2026-02-01',
    descricao: 'Água - Todas as Lojas',
    valor: 720.00,
    competencia: 'FEV-2026',
    conta: 'Bradesco Thiago Eduardo',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'À vencer',
    categoria: 'Água',
    dataVencimento: '2026-02-25',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: null
  },
  // MAR-2026 - À vencer (futuras)
  {
    id: 'DES-2026-0011',
    tipo: 'Fixa',
    data: '2026-03-01',
    descricao: 'Aluguel Loja Matriz',
    valor: 8500.00,
    competencia: 'MAR-2026',
    conta: 'Bradesco Thiago Eduardo',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'À vencer',
    categoria: 'Aluguel',
    dataVencimento: '2026-03-10',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: null
  },
  {
    id: 'DES-2026-0012',
    tipo: 'Fixa',
    data: '2026-03-01',
    descricao: 'Folha de Pagamento - Março',
    valor: 130200.00,
    competencia: 'MAR-2026',
    conta: 'Bradesco Thiago Eduardo',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'À vencer',
    categoria: 'Salários',
    dataVencimento: '2026-03-10',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: null
  },
  {
    id: 'DES-2026-0013',
    tipo: 'Fixa',
    data: '2026-03-01',
    descricao: 'Impostos Trimestrais',
    valor: 18500.00,
    competencia: 'MAR-2026',
    conta: 'Bradesco Thiago Imports',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'À vencer',
    categoria: 'Impostos',
    dataVencimento: '2026-03-20',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Trimestral',
    pagoPor: null
  },
  {
    id: 'DES-2026-0014',
    tipo: 'Variável',
    data: '2026-03-05',
    descricao: 'Campanha Instagram Ads',
    valor: 4500.00,
    competencia: 'MAR-2026',
    conta: 'Santander (Unicred)',
    observacoes: 'Campanha Dia das Mulheres',
    lojaId: LOJAS_FINANCE.ONLINE,
    status: 'À vencer',
    categoria: 'Marketing',
    dataVencimento: '2026-03-15',
    dataPagamento: null,
    recorrente: false,
    periodicidade: null,
    pagoPor: null
  },
  {
    id: 'DES-2026-0015',
    tipo: 'Fixa',
    data: '2026-03-01',
    descricao: 'Aluguel Loja Shopping Sul',
    valor: 9200.00,
    competencia: 'MAR-2026',
    conta: 'Bradesco Thiago Eduardo',
    lojaId: LOJAS_FINANCE.SHOPPING_SUL,
    status: 'À vencer',
    categoria: 'Aluguel',
    dataVencimento: '2026-03-10',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: null
  },
  {
    id: 'DES-2026-0016',
    tipo: 'Variável',
    data: '2026-03-08',
    descricao: 'Compra de Estoque - Acessórios',
    valor: 15780.00,
    competencia: 'MAR-2026',
    conta: 'Bradesco Thiago Imports',
    observacoes: 'Capas, películas e carregadores',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'À vencer',
    categoria: 'Estoque',
    dataVencimento: '2026-03-18',
    dataPagamento: null,
    recorrente: false,
    periodicidade: null,
    pagoPor: null
  },
  // ABR-2026 - À vencer (futuras)
  {
    id: 'DES-2026-0017',
    tipo: 'Fixa',
    data: '2026-04-01',
    descricao: 'Aluguel Loja Matriz',
    valor: 8500.00,
    competencia: 'ABR-2026',
    conta: 'Bradesco Thiago Eduardo',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'À vencer',
    categoria: 'Aluguel',
    dataVencimento: '2026-04-10',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: null
  },
  {
    id: 'DES-2026-0018',
    tipo: 'Fixa',
    data: '2026-04-01',
    descricao: 'Folha de Pagamento - Abril',
    valor: 131500.00,
    competencia: 'ABR-2026',
    conta: 'Bradesco Thiago Eduardo',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'À vencer',
    categoria: 'Salários',
    dataVencimento: '2026-04-10',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: null
  },
  {
    id: 'DES-2026-0019',
    tipo: 'Variável',
    data: '2026-04-05',
    descricao: 'Marketing Digital - Páscoa',
    valor: 3800.00,
    competencia: 'ABR-2026',
    conta: 'Santander (Unicred)',
    lojaId: LOJAS_FINANCE.ONLINE,
    status: 'À vencer',
    categoria: 'Marketing',
    dataVencimento: '2026-04-15',
    dataPagamento: null,
    recorrente: false,
    periodicidade: null,
    pagoPor: null
  },
  {
    id: 'DES-2026-0020',
    tipo: 'Fixa',
    data: '2026-04-01',
    descricao: 'Energia Elétrica - Todas as Lojas',
    valor: 4550.00,
    competencia: 'ABR-2026',
    conta: 'Santander (Unicred)',
    lojaId: LOJAS_FINANCE.MATRIZ,
    status: 'À vencer',
    categoria: 'Energia',
    dataVencimento: '2026-04-15',
    dataPagamento: null,
    recorrente: true,
    periodicidade: 'Mensal',
    pagoPor: null
  }
];

// Funções de API - Contas agora vêm do cadastrosApi
export const getContas = (): ContaFinanceira[] => {
  return getContasFinanceiras();
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
  const contas = getContasFinanceiras();
  
  venda.pagamentos.forEach((pag, index) => {
    const nextNum = pagamentos.filter(p => p.id.includes(String(year))).length + 1 + index;
    const newId = `PAG-${year}-${String(nextNum).padStart(4, '0')}`;
    
    // Encontrar conta padrão para o meio de pagamento
    let contaNome = pag.contaId ? contas.find(c => c.id === pag.contaId)?.nome : null;
    if (!contaNome) {
      // Mapear meio de pagamento para conta da loja
      const contasLoja = contas.filter(c => c.lojaVinculada === venda.lojaVenda && c.status === 'Ativo');
      if (contasLoja.length > 0) {
        // Preferir conta "Própria" para pagamentos (tem nota fiscal)
        const contaPropria = contasLoja.find(c => c.statusMaquina === 'Própria');
        contaNome = contaPropria?.nome || contasLoja[0].nome;
      } else {
        // Fallback para primeira conta ativa
        contaNome = contas.find(c => c.status === 'Ativo')?.nome || 'Conta não encontrada';
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

export const updateDespesa = (id: string, data: Partial<Despesa>): boolean => {
  const index = despesas.findIndex(d => d.id === id);
  if (index === -1) return false;
  despesas[index] = { ...despesas[index], ...data };
  return true;
};

// Marca despesa como Pago
export const pagarDespesa = (id: string, usuarioNome: string): boolean => {
  const index = despesas.findIndex(d => d.id === id);
  if (index === -1) return false;
  despesas[index] = {
    ...despesas[index],
    status: 'Pago',
    dataPagamento: new Date().toISOString().split('T')[0],
    pagoPor: usuarioNome,
  };
  return true;
};

// Provisiona próxima despesa recorrente
export const provisionarProximoPeriodo = (id: string): Despesa | null => {
  const despesa = despesas.find(d => d.id === id);
  if (!despesa || !despesa.recorrente) return null;
  if (despesa.recorrenciaEncerrada) return null;

  const venc = new Date(despesa.dataVencimento + 'T00:00:00');
  if (despesa.periodicidade === 'Mensal') venc.setMonth(venc.getMonth() + 1);
  else if (despesa.periodicidade === 'Trimestral') venc.setMonth(venc.getMonth() + 3);
  else if (despesa.periodicidade === 'Anual') venc.setFullYear(venc.getFullYear() + 1);

  const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const novaCompetencia = `${meses[venc.getMonth()]}-${venc.getFullYear()}`;

  const year = new Date().getFullYear();
  const num = despesas.filter(d => d.id.includes(String(year))).length + 1;
  const newId = `DES-${year}-${String(num).padStart(4, '0')}`;

  const nova: Despesa = {
    ...despesa,
    id: newId,
    data: new Date().toISOString().split('T')[0],
    competencia: novaCompetencia,
    dataVencimento: venc.toISOString().split('T')[0],
    dataPagamento: null,
    status: 'À vencer',
    pagoPor: null,
  };
  despesas.push(nova);
  return nova;
};

// Encerrar recorrência de uma despesa
export const encerrarRecorrencia = (id: string, dataEncerramento: string): boolean => {
  const index = despesas.findIndex(d => d.id === id);
  if (index === -1) return false;
  despesas[index] = {
    ...despesas[index],
    recorrenciaEncerrada: true,
    dataEncerramentoRecorrencia: dataEncerramento,
  };
  return true;
};

// Atualiza automaticamente Agendado -> Vencido
export const atualizarStatusVencidos = (): number => {
  const hoje = new Date().toISOString().split('T')[0];
  let count = 0;
  despesas.forEach(d => {
    if (d.status === 'À vencer' && d.dataVencimento < hoje) {
      d.status = 'Vencido';
      count++;
    }
  });
  return count;
};

// Função helper para obter lojas ativas (usando os IDs reais)
export const getLojas = () => Object.values(LOJAS_FINANCE);
