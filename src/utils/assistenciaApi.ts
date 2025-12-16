// Assistência API - Mock Data

import { getClientes, getLojas, getColaboradoresByPermissao, getFornecedores, addCliente, Cliente } from './cadastrosApi';

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
}

export interface Pagamento {
  id: string;
  meio: string;
  valor: number;
  parcelas?: number;
}

export interface TimelineOS {
  data: string;
  tipo: 'registro' | 'status' | 'peca' | 'pagamento';
  descricao: string;
  responsavel: string;
}

export interface OrdemServico {
  id: string;
  dataHora: string;
  clienteId: string;
  setor: 'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA';
  tecnicoId: string;
  lojaId: string;
  status: 'Serviço concluído' | 'Em serviço' | 'Aguardando Peça';
  pecas: PecaServico[];
  pagamentos: Pagamento[];
  descricao: string;
  timeline: TimelineOS[];
  valorTotal: number;
  custoTotal: number;
}

// Mock data
let ordensServico: OrdemServico[] = [
  {
    id: 'OS-2025-0001',
    dataHora: '2025-01-10T09:30:00',
    clienteId: 'CLI-001',
    setor: 'GARANTIA',
    tecnicoId: 'COL-003',
    lojaId: 'LOJA-001',
    status: 'Serviço concluído',
    pecas: [
      { id: 'PC-001', peca: 'Troca de tela', imei: '123456789012345', valor: 450, percentual: 0, valorTotal: 450, servicoTerceirizado: false, unidadeServico: 'LOJA-001', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [
      { id: 'PAG-001', meio: 'Pix', valor: 450 }
    ],
    descricao: 'Troca de tela iPhone 13 em garantia',
    timeline: [
      { data: '2025-01-10T09:30:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Roberto Alves' },
      { data: '2025-01-10T14:00:00', tipo: 'status', descricao: 'Status alterado para Em serviço', responsavel: 'Roberto Alves' },
      { data: '2025-01-10T17:30:00', tipo: 'status', descricao: 'Serviço concluído', responsavel: 'Roberto Alves' }
    ],
    valorTotal: 450,
    custoTotal: 200
  },
  {
    id: 'OS-2025-0002',
    dataHora: '2025-01-11T10:00:00',
    clienteId: 'CLI-002',
    setor: 'GARANTIA',
    tecnicoId: 'COL-003',
    lojaId: 'LOJA-002',
    status: 'Serviço concluído',
    pecas: [
      { id: 'PC-002', peca: 'Troca de bateria', imei: '234567890123456', valor: 280, percentual: 10, valorTotal: 252, servicoTerceirizado: false, unidadeServico: 'LOJA-002', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [
      { id: 'PAG-002', meio: 'Cartão Débito', valor: 252 }
    ],
    descricao: 'Substituição de bateria degradada',
    timeline: [
      { data: '2025-01-11T10:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Roberto Alves' },
      { data: '2025-01-11T16:00:00', tipo: 'status', descricao: 'Serviço concluído', responsavel: 'Roberto Alves' }
    ],
    valorTotal: 252,
    custoTotal: 120
  },
  {
    id: 'OS-2025-0003',
    dataHora: '2025-01-12T11:30:00',
    clienteId: 'CLI-003',
    setor: 'ASSISTÊNCIA',
    tecnicoId: 'COL-003',
    lojaId: 'LOJA-001',
    status: 'Serviço concluído',
    pecas: [
      { id: 'PC-003', peca: 'Reparo placa lógica', imei: '345678901234567', valor: 800, percentual: 0, valorTotal: 800, servicoTerceirizado: true, descricaoTerceirizado: 'Micro solda especializada', fornecedorId: 'FORN-005', unidadeServico: 'LOJA-001', pecaNoEstoque: false, pecaDeFornecedor: true },
      { id: 'PC-004', peca: 'Limpeza interna', valor: 80, percentual: 0, valorTotal: 80, servicoTerceirizado: false, unidadeServico: 'LOJA-001', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [
      { id: 'PAG-003', meio: 'Cartão Crédito', valor: 880, parcelas: 3 }
    ],
    descricao: 'Reparo em placa lógica após queda com água',
    timeline: [
      { data: '2025-01-12T11:30:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Roberto Alves' },
      { data: '2025-01-12T14:00:00', tipo: 'peca', descricao: 'Peça enviada para terceirizado', responsavel: 'Roberto Alves' },
      { data: '2025-01-14T10:00:00', tipo: 'peca', descricao: 'Peça retornou do terceirizado', responsavel: 'Roberto Alves' },
      { data: '2025-01-14T17:00:00', tipo: 'status', descricao: 'Serviço concluído', responsavel: 'Roberto Alves' }
    ],
    valorTotal: 880,
    custoTotal: 450
  },
  {
    id: 'OS-2025-0004',
    dataHora: '2025-01-13T14:00:00',
    clienteId: 'CLI-004',
    setor: 'ASSISTÊNCIA',
    tecnicoId: 'COL-003',
    lojaId: 'LOJA-003',
    status: 'Serviço concluído',
    pecas: [
      { id: 'PC-005', peca: 'Troca conector de carga', imei: '456789012345678', valor: 180, percentual: 5, valorTotal: 171, servicoTerceirizado: false, unidadeServico: 'LOJA-003', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [
      { id: 'PAG-004', meio: 'Pix', valor: 171 }
    ],
    descricao: 'Troca de conector de carga danificado',
    timeline: [
      { data: '2025-01-13T14:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Roberto Alves' },
      { data: '2025-01-13T18:00:00', tipo: 'status', descricao: 'Serviço concluído', responsavel: 'Roberto Alves' }
    ],
    valorTotal: 171,
    custoTotal: 60
  },
  {
    id: 'OS-2025-0005',
    dataHora: '2025-01-14T09:00:00',
    clienteId: 'CLI-001',
    setor: 'TROCA',
    tecnicoId: 'COL-003',
    lojaId: 'LOJA-004',
    status: 'Serviço concluído',
    pecas: [
      { id: 'PC-006', peca: 'Troca aparelho em garantia estendida', imei: '567890123456789', valor: 0, percentual: 0, valorTotal: 0, servicoTerceirizado: false, unidadeServico: 'LOJA-004', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [],
    descricao: 'Troca de aparelho defeituoso por garantia estendida',
    timeline: [
      { data: '2025-01-14T09:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Roberto Alves' },
      { data: '2025-01-14T10:00:00', tipo: 'status', descricao: 'Serviço concluído - aparelho trocado', responsavel: 'Roberto Alves' }
    ],
    valorTotal: 0,
    custoTotal: 0
  },
  {
    id: 'OS-2025-0006',
    dataHora: '2025-01-15T15:30:00',
    clienteId: 'CLI-002',
    setor: 'ASSISTÊNCIA',
    tecnicoId: 'COL-003',
    lojaId: 'LOJA-001',
    status: 'Em serviço',
    pecas: [
      { id: 'PC-007', peca: 'Troca de câmera traseira', imei: '678901234567890', valor: 350, percentual: 0, valorTotal: 350, servicoTerceirizado: false, unidadeServico: 'LOJA-001', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [],
    descricao: 'Substituição de câmera com defeito de foco',
    timeline: [
      { data: '2025-01-15T15:30:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Roberto Alves' },
      { data: '2025-01-15T16:00:00', tipo: 'status', descricao: 'Status alterado para Em serviço', responsavel: 'Roberto Alves' }
    ],
    valorTotal: 350,
    custoTotal: 180
  },
  {
    id: 'OS-2025-0007',
    dataHora: '2025-01-10T08:00:00',
    clienteId: 'CLI-004',
    setor: 'GARANTIA',
    tecnicoId: 'COL-003',
    lojaId: 'LOJA-002',
    status: 'Aguardando Peça',
    pecas: [
      { id: 'PC-008', peca: 'Troca de display OLED', imei: '789012345678901', valor: 1200, percentual: 0, valorTotal: 1200, servicoTerceirizado: false, unidadeServico: 'LOJA-002', pecaNoEstoque: false, pecaDeFornecedor: true }
    ],
    pagamentos: [],
    descricao: 'Troca de display com burn-in - aguardando peça do fornecedor',
    timeline: [
      { data: '2025-01-10T08:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Roberto Alves' },
      { data: '2025-01-10T09:00:00', tipo: 'status', descricao: 'Aguardando Peça - pedido ao fornecedor', responsavel: 'Roberto Alves' }
    ],
    valorTotal: 1200,
    custoTotal: 650
  },
  {
    id: 'OS-2025-0008',
    dataHora: '2025-01-14T11:00:00',
    clienteId: 'CLI-003',
    setor: 'ASSISTÊNCIA',
    tecnicoId: 'COL-003',
    lojaId: 'LOJA-003',
    status: 'Em serviço',
    pecas: [
      { id: 'PC-009', peca: 'Troca de alto-falante', imei: '890123456789012', valor: 150, percentual: 0, valorTotal: 150, servicoTerceirizado: false, unidadeServico: 'LOJA-003', pecaNoEstoque: true, pecaDeFornecedor: false },
      { id: 'PC-010', peca: 'Limpeza de microfone', valor: 50, percentual: 0, valorTotal: 50, servicoTerceirizado: false, unidadeServico: 'LOJA-003', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [],
    descricao: 'Problemas de áudio - alto-falante e microfone',
    timeline: [
      { data: '2025-01-14T11:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Roberto Alves' },
      { data: '2025-01-14T11:30:00', tipo: 'status', descricao: 'Status alterado para Em serviço', responsavel: 'Roberto Alves' }
    ],
    valorTotal: 200,
    custoTotal: 80
  }
];

// Histórico de OS por cliente
export interface HistoricoOSCliente {
  osId: string;
  data: string;
  status: string;
  valorTotal: number;
  setor: string;
}

let osCounter = 9;

// API Functions
export const getOrdensServico = () => [...ordensServico];

export const getOrdemServicoById = (id: string) => ordensServico.find(os => os.id === id);

export const getNextOSNumber = () => {
  const nextNum = osCounter;
  const id = `OS-2025-${String(nextNum).padStart(4, '0')}`;
  return { numero: nextNum, id };
};

export const addOrdemServico = (os: Omit<OrdemServico, 'id'>) => {
  const { id } = getNextOSNumber();
  osCounter++;
  const newOS: OrdemServico = { ...os, id };
  ordensServico.push(newOS);
  return newOS;
};

export const updateOrdemServico = (id: string, updates: Partial<OrdemServico>) => {
  const index = ordensServico.findIndex(os => os.id === id);
  if (index !== -1) {
    ordensServico[index] = { ...ordensServico[index], ...updates };
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

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

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
