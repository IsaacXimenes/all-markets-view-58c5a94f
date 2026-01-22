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
  {
    id: 'DES-2025-0001',
    tipo: 'Fixa',
    data: '2025-01-05',
    descricao: 'Aluguel Loja Matriz',
    valor: 8500.00,
    competencia: 'JAN-2025',
    conta: 'Bradesco Thiago Eduardo',
    observacoes: 'Pagamento mensal'
  },
  {
    id: 'DES-2025-0002',
    tipo: 'Fixa',
    data: '2025-01-05',
    descricao: 'Energia Elétrica - Todas as Lojas',
    valor: 4320.50,
    competencia: 'JAN-2025',
    conta: 'Santander (Unicred)'
  },
  {
    id: 'DES-2025-0003',
    tipo: 'Fixa',
    data: '2025-01-10',
    descricao: 'Folha de Pagamento',
    valor: 125600.00,
    competencia: 'JAN-2025',
    conta: 'Bradesco Thiago Eduardo',
    observacoes: 'Salários + encargos'
  },
  {
    id: 'DES-2025-0004',
    tipo: 'Variável',
    data: '2025-01-12',
    descricao: 'Compra de Estoque - iPhones',
    valor: 89450.00,
    competencia: 'JAN-2025',
    conta: 'Bradesco Thiago Imports',
    observacoes: '15 unidades iPhone 15 Pro'
  },
  {
    id: 'DES-2025-0005',
    tipo: 'Variável',
    data: '2025-01-15',
    descricao: 'Marketing Digital',
    valor: 3200.00,
    competencia: 'JAN-2025',
    conta: 'Santander (Unicred)'
  },
  {
    id: 'DES-2025-0006',
    tipo: 'Fixa',
    data: '2025-01-05',
    descricao: 'Internet + Telefonia',
    valor: 980.00,
    competencia: 'JAN-2025',
    conta: 'Bradesco Thiago Eduardo'
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

// Função helper para obter lojas ativas (usando os IDs reais)
export const getLojas = () => Object.values(LOJAS_FINANCE);
