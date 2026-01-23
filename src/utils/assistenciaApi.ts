// Assistência API - Mock Data

import { getClientes, getLojas, getColaboradoresByPermissao, getFornecedores, addCliente, Cliente } from './cadastrosApi';
import { getPecaById, getPecaByDescricao, updatePeca } from './pecasApi';
import { formatCurrency } from './formatUtils';

// Sistema centralizado de IDs para OS
let globalOSIdCounter = 100;
const registeredOSIds = new Set<string>();

const initializeOSIds = (existingIds: string[]) => {
  existingIds.forEach(id => registeredOSIds.add(id));
  existingIds.forEach(id => {
    const match = id.match(/OS-\d{4}-(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= globalOSIdCounter) {
        globalOSIdCounter = num + 1;
      }
    }
  });
};

const generateOSId = (): string => {
  const year = new Date().getFullYear();
  let newId: string;
  do {
    newId = `OS-${year}-${String(globalOSIdCounter).padStart(4, '0')}`;
    globalOSIdCounter++;
  } while (registeredOSIds.has(newId));
  
  registeredOSIds.add(newId);
  return newId;
};

export const isOSIdRegistered = (id: string): boolean => {
  return registeredOSIds.has(id);
};

export interface PecaServico {
  id: string;
  peca: string;
  imei?: string;
  valor: number;
  percentual: number;
  valorTotal: number;
  servicoTerceirizado: boolean;
  descricaoTerceirizado?: string;
  fornecedorId?: string;
  unidadeServico: string;
  pecaNoEstoque: boolean;
  pecaDeFornecedor: boolean;
  // Novos campos para fluxo de aprovação
  statusAprovacao?: 'Pendente' | 'Aguardando Aprovação' | 'Aprovado' | 'Rejeitado' | 'Pagamento - Financeiro' | 'Pagamento Finalizado' | 'Aguardando Chegada' | 'Em Estoque' | 'Utilizado' | 'Não Utilizado';
  motivoRejeicao?: string;
  contaOrigemPagamento?: string;
  dataPagamento?: string;
  dataRecebimento?: string;
}

export interface Pagamento {
  id: string;
  meio: string;
  valor: number;
  parcelas?: number;
}

export interface TimelineOS {
  data: string;
  tipo: 'registro' | 'status' | 'peca' | 'pagamento' | 'aprovacao' | 'rejeicao' | 'financeiro';
  descricao: string;
  responsavel: string;
  motivo?: string;
}

export interface OrdemServico {
  id: string;
  dataHora: string;
  clienteId: string;
  setor: 'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA';
  tecnicoId: string;
  lojaId: string;
  status: 'Serviço concluído' | 'Em serviço' | 'Aguardando Peça' | 'Solicitação Enviada' | 'Em Análise' | 'Peça Recebida' | 'Aguardando Aprovação do Gestor' | 'Rejeitado pelo Gestor' | 'Pagamento - Financeiro' | 'Pagamento Finalizado' | 'Aguardando Chegada da Peça' | 'Peça em Estoque / Aguardando Reparo';
  pecas: PecaServico[];
  pagamentos: Pagamento[];
  descricao: string;
  timeline: TimelineOS[];
  valorTotal: number;
  custoTotal: number;
  // Novos campos para origem e valor do produto
  origemOS?: 'Venda' | 'Garantia' | 'Estoque' | 'Avulso';
  vendaId?: string;
  garantiaId?: string;
  produtoId?: string;
  valorProdutoOrigem?: number; // Valor do produto da origem (Base de Troca)
  modeloAparelho?: string;
  imeiAparelho?: string;
}

// Mock data
let ordensServico: OrdemServico[] = [
  {
    id: 'OS-2025-0001',
    dataHora: '2025-01-10T09:30:00',
    clienteId: 'CLI-001',
    setor: 'GARANTIA',
    tecnicoId: 'df31dae3', // Gabriel Soares Lima
    lojaId: '3ac7e00c', // Loja - Matriz
    status: 'Serviço concluído',
    pecas: [
      { id: 'PC-001', peca: 'Troca de tela', imei: '123456789012345', valor: 450, percentual: 0, valorTotal: 450, servicoTerceirizado: false, unidadeServico: '3ac7e00c', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [
      { id: 'PAG-001', meio: 'Pix', valor: 450 }
    ],
    descricao: 'Troca de tela iPhone 13 em garantia',
    timeline: [
      { data: '2025-01-10T09:30:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Gabriel Soares Lima' },
      { data: '2025-01-10T14:00:00', tipo: 'status', descricao: 'Status alterado para Em serviço', responsavel: 'Gabriel Soares Lima' },
      { data: '2025-01-10T17:30:00', tipo: 'status', descricao: 'Serviço concluído', responsavel: 'Gabriel Soares Lima' }
    ],
    valorTotal: 450,
    custoTotal: 200
  },
  {
    id: 'OS-2025-0002',
    dataHora: '2025-01-11T10:00:00',
    clienteId: 'CLI-002',
    setor: 'GARANTIA',
    tecnicoId: 'be61a9df', // Jeferson Sousa Cabral
    lojaId: 'db894e7d', // Loja - JK Shopping
    status: 'Serviço concluído',
    pecas: [
      { id: 'PC-002', peca: 'Troca de bateria', imei: '234567890123456', valor: 280, percentual: 10, valorTotal: 252, servicoTerceirizado: false, unidadeServico: 'db894e7d', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [
      { id: 'PAG-002', meio: 'Cartão Débito', valor: 252 }
    ],
    descricao: 'Substituição de bateria degradada',
    timeline: [
      { data: '2025-01-11T10:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Jeferson Sousa Cabral' },
      { data: '2025-01-11T16:00:00', tipo: 'status', descricao: 'Serviço concluído', responsavel: 'Jeferson Sousa Cabral' }
    ],
    valorTotal: 252,
    custoTotal: 120
  },
  {
    id: 'OS-2025-0003',
    dataHora: '2025-01-12T11:30:00',
    clienteId: 'CLI-003',
    setor: 'ASSISTÊNCIA',
    tecnicoId: '53a1a9ad', // Julio Cesar da Silva
    lojaId: '3ac7e00c', // Loja - Matriz
    status: 'Serviço concluído',
    pecas: [
      { id: 'PC-003', peca: 'Reparo placa lógica', imei: '345678901234567', valor: 800, percentual: 0, valorTotal: 800, servicoTerceirizado: true, descricaoTerceirizado: 'Micro solda especializada', fornecedorId: 'FORN-005', unidadeServico: '3ac7e00c', pecaNoEstoque: false, pecaDeFornecedor: true },
      { id: 'PC-004', peca: 'Limpeza interna', valor: 80, percentual: 0, valorTotal: 80, servicoTerceirizado: false, unidadeServico: '3ac7e00c', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [
      { id: 'PAG-003', meio: 'Cartão Crédito', valor: 880, parcelas: 3 }
    ],
    descricao: 'Reparo em placa lógica após queda com água',
    timeline: [
      { data: '2025-01-12T11:30:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Julio Cesar da Silva' },
      { data: '2025-01-12T14:00:00', tipo: 'peca', descricao: 'Peça enviada para terceirizado', responsavel: 'Julio Cesar da Silva' },
      { data: '2025-01-14T10:00:00', tipo: 'peca', descricao: 'Peça retornou do terceirizado', responsavel: 'Julio Cesar da Silva' },
      { data: '2025-01-14T17:00:00', tipo: 'status', descricao: 'Serviço concluído', responsavel: 'Julio Cesar da Silva' }
    ],
    valorTotal: 880,
    custoTotal: 450
  },
  {
    id: 'OS-2025-0004',
    dataHora: '2025-01-13T14:00:00',
    clienteId: 'CLI-004',
    setor: 'ASSISTÊNCIA',
    tecnicoId: '3a4e96c7', // Marcos Serra de Sousa
    lojaId: '5b9446d5', // Loja - Shopping Sul
    status: 'Serviço concluído',
    pecas: [
      { id: 'PC-005', peca: 'Troca conector de carga', imei: '456789012345678', valor: 180, percentual: 5, valorTotal: 171, servicoTerceirizado: false, unidadeServico: '5b9446d5', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [
      { id: 'PAG-004', meio: 'Pix', valor: 171 }
    ],
    descricao: 'Troca de conector de carga danificado',
    timeline: [
      { data: '2025-01-13T14:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Marcos Serra de Sousa' },
      { data: '2025-01-13T18:00:00', tipo: 'status', descricao: 'Serviço concluído', responsavel: 'Marcos Serra de Sousa' }
    ],
    valorTotal: 171,
    custoTotal: 60
  },
  {
    id: 'OS-2025-0005',
    dataHora: '2025-01-14T09:00:00',
    clienteId: 'CLI-001',
    setor: 'TROCA',
    tecnicoId: 'df31dae3', // Gabriel Soares Lima
    lojaId: '0d06e7db', // Loja - Águas Lindas Shopping
    status: 'Serviço concluído',
    pecas: [
      { id: 'PC-006', peca: 'Troca aparelho em garantia estendida', imei: '567890123456789', valor: 0, percentual: 0, valorTotal: 0, servicoTerceirizado: false, unidadeServico: '0d06e7db', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [],
    descricao: 'Troca de aparelho defeituoso por garantia estendida',
    timeline: [
      { data: '2025-01-14T09:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Gabriel Soares Lima' },
      { data: '2025-01-14T10:00:00', tipo: 'status', descricao: 'Serviço concluído - aparelho trocado', responsavel: 'Gabriel Soares Lima' }
    ],
    valorTotal: 0,
    custoTotal: 0
  },
  {
    id: 'OS-2025-0006',
    dataHora: '2025-01-15T15:30:00',
    clienteId: 'CLI-002',
    setor: 'ASSISTÊNCIA',
    tecnicoId: 'be61a9df', // Jeferson Sousa Cabral
    lojaId: '3ac7e00c', // Loja - Matriz
    status: 'Em serviço',
    pecas: [
      { id: 'PC-007', peca: 'Troca de câmera traseira', imei: '678901234567890', valor: 350, percentual: 0, valorTotal: 350, servicoTerceirizado: false, unidadeServico: '3ac7e00c', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [],
    descricao: 'Substituição de câmera com defeito de foco',
    timeline: [
      { data: '2025-01-15T15:30:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Jeferson Sousa Cabral' },
      { data: '2025-01-15T16:00:00', tipo: 'status', descricao: 'Status alterado para Em serviço', responsavel: 'Jeferson Sousa Cabral' }
    ],
    valorTotal: 350,
    custoTotal: 180
  },
  {
    id: 'OS-2025-0007',
    dataHora: '2025-01-10T08:00:00',
    clienteId: 'CLI-004',
    setor: 'GARANTIA',
    tecnicoId: '53a1a9ad', // Julio Cesar da Silva
    lojaId: 'db894e7d', // Loja - JK Shopping
    status: 'Aguardando Peça',
    pecas: [
      { id: 'PC-008', peca: 'Troca de display OLED', imei: '789012345678901', valor: 1200, percentual: 0, valorTotal: 1200, servicoTerceirizado: false, unidadeServico: 'db894e7d', pecaNoEstoque: false, pecaDeFornecedor: true }
    ],
    pagamentos: [],
    descricao: 'Troca de display com burn-in - aguardando peça do fornecedor',
    timeline: [
      { data: '2025-01-10T08:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Julio Cesar da Silva' },
      { data: '2025-01-10T09:00:00', tipo: 'status', descricao: 'Aguardando Peça - pedido ao fornecedor', responsavel: 'Julio Cesar da Silva' }
    ],
    valorTotal: 1200,
    custoTotal: 650
  },
  {
    id: 'OS-2025-0008',
    dataHora: '2025-01-14T11:00:00',
    clienteId: 'CLI-003',
    setor: 'ASSISTÊNCIA',
    tecnicoId: '3a4e96c7', // Marcos Serra de Sousa
    lojaId: '5b9446d5', // Loja - Shopping Sul
    status: 'Em serviço',
    pecas: [
      { id: 'PC-009', peca: 'Troca de alto-falante', imei: '890123456789012', valor: 150, percentual: 0, valorTotal: 150, servicoTerceirizado: false, unidadeServico: '5b9446d5', pecaNoEstoque: true, pecaDeFornecedor: false },
      { id: 'PC-010', peca: 'Limpeza de microfone', valor: 50, percentual: 0, valorTotal: 50, servicoTerceirizado: false, unidadeServico: '5b9446d5', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [],
    descricao: 'Problemas de áudio - alto-falante e microfone',
    timeline: [
      { data: '2025-01-14T11:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Marcos Serra de Sousa' },
      { data: '2025-01-14T11:30:00', tipo: 'status', descricao: 'Status alterado para Em serviço', responsavel: 'Marcos Serra de Sousa' }
    ],
    valorTotal: 200,
    custoTotal: 80
  },
  // OS-2025-0020 - Exemplo de fluxo completo com solicitação de peça
  {
    id: 'OS-2025-0020',
    dataHora: '2025-01-18T09:00:00',
    clienteId: 'CLI-001',
    setor: 'ASSISTÊNCIA',
    tecnicoId: 'df31dae3', // Gabriel Soares Lima
    lojaId: '3ac7e00c', // Loja - Matriz
    status: 'Solicitação Enviada',
    pecas: [
      { id: 'PC-020', peca: 'Bateria iPhone 13 Pro', imei: '999888777666001', valor: 280, percentual: 0, valorTotal: 280, servicoTerceirizado: false, unidadeServico: '3ac7e00c', pecaNoEstoque: false, pecaDeFornecedor: true }
    ],
    pagamentos: [],
    descricao: 'Troca de bateria - saúde em 65%, aguardando peça do fornecedor',
    timeline: [
      { data: '2025-01-18T09:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Gabriel Soares Lima' },
      { data: '2025-01-18T09:30:00', tipo: 'status', descricao: 'Status alterado para Aguardando Peça', responsavel: 'Gabriel Soares Lima' },
      { data: '2025-01-18T10:00:00', tipo: 'peca', descricao: 'Solicitação de peça SOL-020 enviada para análise da matriz', responsavel: 'Gabriel Soares Lima' }
    ],
    valorTotal: 280,
    custoTotal: 150
  }
];

// Inicializar IDs existentes
initializeOSIds(ordensServico.map(os => os.id));

// Histórico de OS por cliente
export interface HistoricoOSCliente {
  osId: string;
  data: string;
  status: string;
  valorTotal: number;
  setor: string;
}

// API Functions
export const getOrdensServico = () => [...ordensServico];

export const getOrdemServicoById = (id: string) => ordensServico.find(os => os.id === id);

export const getNextOSNumber = (): { numero: number; id: string } => {
  const year = new Date().getFullYear();
  const id = generateOSId();
  const match = id.match(/OS-\d{4}-(\d+)/);
  const numero = match ? parseInt(match[1]) : globalOSIdCounter;
  return { numero, id };
};

export const addOrdemServico = (os: Omit<OrdemServico, 'id'>) => {
  const id = generateOSId();
  const newOS: OrdemServico = { ...os, id };
  ordensServico.push(newOS);
  return newOS;
};

// Função para reduzir estoque de peças quando OS é concluída
const reduzirEstoquePecas = (pecas: PecaServico[]): void => {
  pecas.forEach(peca => {
    // Apenas reduz se a peça estava no estoque
    if (peca.pecaNoEstoque && !peca.servicoTerceirizado) {
      // Primeiro tenta buscar pelo ID, depois pelo nome/descrição
      let pecaEstoque = getPecaById(peca.id);
      
      // Se não encontrou pelo ID, busca pela descrição (nome da peça)
      if (!pecaEstoque) {
        pecaEstoque = getPecaByDescricao(peca.peca);
      }
      
      if (pecaEstoque && pecaEstoque.quantidade > 0) {
        updatePeca(pecaEstoque.id, { 
          quantidade: pecaEstoque.quantidade - 1,
          status: pecaEstoque.quantidade - 1 === 0 ? 'Utilizada' : pecaEstoque.status
        });
        console.log(`[ASSISTÊNCIA] Peça ${peca.peca} (ID: ${pecaEstoque.id}) reduzida do estoque`);
      } else {
        console.warn(`[ASSISTÊNCIA] Peça "${peca.peca}" não encontrada no estoque ou sem quantidade disponível`);
      }
    }
  });
};

export const updateOrdemServico = (id: string, updates: Partial<OrdemServico>) => {
  const index = ordensServico.findIndex(os => os.id === id);
  if (index !== -1) {
    const osAnterior = ordensServico[index];
    ordensServico[index] = { ...ordensServico[index], ...updates };
    
    // Se status mudou para 'Serviço concluído', reduzir estoque de peças
    if (updates.status === 'Serviço concluído' && osAnterior.status !== 'Serviço concluído') {
      reduzirEstoquePecas(ordensServico[index].pecas);
      console.log(`[ASSISTÊNCIA] OS ${id} concluída - peças reduzidas do estoque`);
    }
    
    return ordensServico[index];
  }
  return null;
};

export const getHistoricoOSCliente = (clienteId: string): HistoricoOSCliente[] => {
  return ordensServico
    .filter(os => os.clienteId === clienteId)
    .map(os => ({
      osId: os.id,
      data: os.dataHora,
      status: os.status,
      valorTotal: os.valorTotal,
      setor: os.setor
    }))
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 3);
};

export const verificarIMEIEmOSAtiva = (imei: string): OrdemServico | null => {
  return ordensServico.find(os => 
    os.status !== 'Serviço concluído' && 
    os.pecas.some(p => p.imei === imei)
  ) || null;
};

export const calcularSLADias = (dataHora: string): number => {
  const dataOS = new Date(dataHora);
  const hoje = new Date();
  const diffTime = Math.abs(hoje.getTime() - dataOS.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// formatCurrency removido - usar import { formatCurrency } from '@/utils/formatUtils'
export { formatCurrency } from '@/utils/formatUtils';

export const exportOSToCSV = (data: OrdemServico[], filename: string) => {
  const clientes = getClientes();
  const lojas = getLojas();
  const tecnicos = getColaboradoresByPermissao('Assistência');

  const csvData = data.map(os => {
    const cliente = clientes.find(c => c.id === os.clienteId);
    const loja = lojas.find(l => l.id === os.lojaId);
    const tecnico = tecnicos.find(t => t.id === os.tecnicoId);
    
    return {
      'Nº OS': os.id,
      'Data/Hora': new Date(os.dataHora).toLocaleString('pt-BR'),
      'Cliente': cliente?.nome || '-',
      'Setor': os.setor,
      'Técnico': tecnico?.nome || '-',
      'Loja': loja?.nome || '-',
      'Status': os.status,
      'SLA (dias)': calcularSLADias(os.dataHora),
      'Valor Total': formatCurrency(os.valorTotal),
      'Descrição': os.descricao
    };
  });

  const headers = Object.keys(csvData[0] || {});
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
