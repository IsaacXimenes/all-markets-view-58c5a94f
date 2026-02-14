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
  comprovante?: string;
  comprovanteNome?: string;
  contaDestino?: string;
}

export interface TimelineOS {
  data: string;
  fotos?: string[]; // URLs/base64 de fotos associadas ao evento
  tipo: 'registro' | 'status' | 'peca' | 'pagamento' | 'aprovacao' | 'rejeicao' | 'financeiro' | 'baixa_estoque' | 'foto' | 'conclusao_servico' | 'validacao_financeiro';
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
  status: 'Em Aberto' | 'Serviço concluído' | 'Em serviço' | 'Aguardando Peça' | 'Solicitação Enviada' | 'Em Análise' | 'Peça Recebida' | 'Aguardando Aprovação do Gestor' | 'Rejeitado pelo Gestor' | 'Pagamento - Financeiro' | 'Pagamento Finalizado' | 'Pagamento Concluído' | 'Aguardando Chegada da Peça' | 'Peça em Estoque / Aguardando Reparo' | 'Aguardando Recebimento' | 'Em Execução' | 'Aguardando Pagamento' | 'Aguardando Conferência' | 'Concluído' | 'Finalizado' | 'Aguardando Análise' | 'Solicitação de Peça' | 'Pendente de Pagamento' | 'Aguardando Financeiro' | 'Liquidado' | 'Recusada pelo Técnico';
  pecas: PecaServico[];
  pagamentos: Pagamento[];
  descricao: string;
  timeline: TimelineOS[];
  valorTotal: number;
  custoTotal: number;
  // Novos campos para origem e valor do produto
  origemOS?: 'Venda' | 'Garantia' | 'Estoque' | 'Balcão';
  vendaId?: string;
  garantiaId?: string;
  produtoId?: string;
  valorProdutoOrigem?: number;
  modeloAparelho?: string;
  imeiAparelho?: string;
  idVendaAntiga?: string;
  // Campos do fluxo de 3 etapas
  proximaAtuacao?: 'Técnico: Avaliar/Executar' | 'Vendedor: Registrar Pagamento' | 'Financeiro: Conferir Lançamento' | 'Gestor: Aprovar Peça' | 'Logística: Enviar Peça' | 'Concluído' | 'Técnico' | 'Gestor (Suprimentos)' | 'Técnico (Recebimento)' | 'Gestor/Vendedor' | 'Gestor (Conferência)' | 'Financeiro' | 'Atendente' | '-';
  valorCustoTecnico?: number;
  valorVendaTecnico?: number;
  fotosEntrada?: string[];
  resumoConclusao?: string;
  observacaoOrigem?: string;
  // Campos de recusa pelo técnico
  recusadaTecnico?: boolean;
  motivoRecusaTecnico?: string;
}

// Mock data
let ordensServico: OrdemServico[] = [
  // 1. Aguardando Análise (entrada inicial - triagem)
  {
    id: 'OS-2025-0001',
    dataHora: '2025-01-20T09:30:00',
    clienteId: 'CLI-001',
    setor: 'GARANTIA',
    tecnicoId: 'df31dae3',
    lojaId: '3ac7e00c',
    status: 'Aguardando Análise',
    proximaAtuacao: 'Técnico: Avaliar/Executar',
    pecas: [],
    pagamentos: [],
    descricao: 'iPhone 14 Pro com tela trincada - aguardando triagem técnica',
    timeline: [
      { data: '2025-01-20T09:30:00', tipo: 'registro', descricao: 'OS registrada via balcão', responsavel: 'Fernando Lima' }
    ],
    valorTotal: 0,
    custoTotal: 0,
    modeloAparelho: 'iPhone 14 Pro',
    imeiAparelho: '123456789012345',
    origemOS: 'Balcão'
  },
  // 2. Em serviço (técnico trabalhando)
  {
    id: 'OS-2025-0002',
    dataHora: '2025-01-18T10:00:00',
    clienteId: 'CLI-002',
    setor: 'ASSISTÊNCIA',
    tecnicoId: 'be61a9df',
    lojaId: 'db894e7d',
    status: 'Em serviço',
    proximaAtuacao: 'Técnico',
    pecas: [
      { id: 'PC-002', peca: 'Troca de bateria', imei: '234567890123456', valor: 280, percentual: 0, valorTotal: 280, servicoTerceirizado: false, unidadeServico: 'db894e7d', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [],
    descricao: 'Substituição de bateria degradada - saúde 62%',
    timeline: [
      { data: '2025-01-18T10:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Jeferson Sousa Cabral' },
      { data: '2025-01-18T10:30:00', tipo: 'status', descricao: 'OS assumida pelo técnico', responsavel: 'Jeferson Sousa Cabral' }
    ],
    valorTotal: 280,
    custoTotal: 120,
    modeloAparelho: 'iPhone 13',
    imeiAparelho: '234567890123456',
    origemOS: 'Balcão'
  },
  // 3. Solicitação Enviada (aguardando aprovação do gestor para peça)
  {
    id: 'OS-2025-0003',
    dataHora: '2025-01-17T11:30:00',
    clienteId: 'CLI-003',
    setor: 'ASSISTÊNCIA',
    tecnicoId: '53a1a9ad',
    lojaId: '3ac7e00c',
    status: 'Solicitação Enviada',
    proximaAtuacao: 'Gestor (Suprimentos)',
    pecas: [
      { id: 'PC-003', peca: 'Display OLED iPhone 15', imei: '345678901234567', valor: 1200, percentual: 0, valorTotal: 1200, servicoTerceirizado: false, unidadeServico: '3ac7e00c', pecaNoEstoque: false, pecaDeFornecedor: true, statusAprovacao: 'Aguardando Aprovação' }
    ],
    pagamentos: [],
    descricao: 'Troca de display OLED com burn-in - peça solicitada à matriz',
    timeline: [
      { data: '2025-01-17T11:30:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Julio Cesar da Silva' },
      { data: '2025-01-17T12:00:00', tipo: 'status', descricao: 'Em serviço', responsavel: 'Julio Cesar da Silva' },
      { data: '2025-01-17T14:00:00', tipo: 'peca', descricao: 'Solicitação de peça enviada para aprovação do gestor', responsavel: 'Julio Cesar da Silva' }
    ],
    valorTotal: 1200,
    custoTotal: 650,
    modeloAparelho: 'iPhone 15',
    imeiAparelho: '345678901234567',
    origemOS: 'Garantia'
  },
  // 4. Aguardando Peça (peça aprovada, aguardando chegada)
  {
    id: 'OS-2025-0004',
    dataHora: '2025-01-15T14:00:00',
    clienteId: 'CLI-004',
    setor: 'GARANTIA',
    tecnicoId: '3a4e96c7',
    lojaId: '5b9446d5',
    status: 'Aguardando Peça',
    proximaAtuacao: 'Logística: Enviar Peça',
    pecas: [
      { id: 'PC-004', peca: 'Conector de carga USB-C', imei: '456789012345678', valor: 180, percentual: 0, valorTotal: 180, servicoTerceirizado: false, unidadeServico: '5b9446d5', pecaNoEstoque: false, pecaDeFornecedor: true, statusAprovacao: 'Aprovado' }
    ],
    pagamentos: [],
    descricao: 'Troca de conector de carga - peça aprovada, aguardando entrega',
    timeline: [
      { data: '2025-01-15T14:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Marcos Serra de Sousa' },
      { data: '2025-01-15T15:00:00', tipo: 'status', descricao: 'Solicitação de peça enviada', responsavel: 'Marcos Serra de Sousa' },
      { data: '2025-01-16T09:00:00', tipo: 'aprovacao', descricao: 'Peça aprovada pelo gestor', responsavel: 'João Gestor' },
      { data: '2025-01-16T10:00:00', tipo: 'financeiro', descricao: 'Pagamento ao fornecedor realizado', responsavel: 'João Gestor' }
    ],
    valorTotal: 180,
    custoTotal: 60,
    modeloAparelho: 'Samsung S24',
    imeiAparelho: '456789012345678',
    origemOS: 'Garantia'
  },
  // 5. Técnico (Recebimento) - peça chegou, técnico precisa confirmar
  {
    id: 'OS-2025-0005',
    dataHora: '2025-01-14T09:00:00',
    clienteId: 'CLI-001',
    setor: 'ASSISTÊNCIA',
    tecnicoId: 'df31dae3',
    lojaId: '0d06e7db',
    status: 'Peça Recebida',
    proximaAtuacao: 'Técnico (Recebimento)',
    pecas: [
      { id: 'PC-005', peca: 'Câmera traseira iPhone 14', imei: '567890123456789', valor: 350, percentual: 0, valorTotal: 350, servicoTerceirizado: false, unidadeServico: '0d06e7db', pecaNoEstoque: false, pecaDeFornecedor: true, statusAprovacao: 'Pagamento Finalizado' }
    ],
    pagamentos: [],
    descricao: 'Câmera com defeito de foco - peça recebida, aguardando confirmação do técnico',
    timeline: [
      { data: '2025-01-14T09:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Gabriel Soares Lima' },
      { data: '2025-01-14T10:00:00', tipo: 'peca', descricao: 'Solicitação de peça enviada', responsavel: 'Gabriel Soares Lima' },
      { data: '2025-01-15T09:00:00', tipo: 'aprovacao', descricao: 'Peça aprovada', responsavel: 'João Gestor' },
      { data: '2025-01-16T14:00:00', tipo: 'peca', descricao: 'Peça recebida na loja', responsavel: 'Logística' }
    ],
    valorTotal: 350,
    custoTotal: 180,
    modeloAparelho: 'iPhone 14',
    imeiAparelho: '567890123456789',
    origemOS: 'Balcão'
  },
  // 6. Finalizado (técnico concluiu, aguardando pagamento do vendedor)
  {
    id: 'OS-2025-0006',
    dataHora: '2025-01-12T15:30:00',
    clienteId: 'CLI-002',
    setor: 'ASSISTÊNCIA',
    tecnicoId: 'be61a9df',
    lojaId: '3ac7e00c',
    status: 'Finalizado',
    proximaAtuacao: 'Gestor/Vendedor',
    resumoConclusao: 'Reparo concluído com sucesso. Placa lógica restaurada via micro solda.',
    valorCustoTecnico: 450,
    valorVendaTecnico: 880,
    pecas: [
      { id: 'PC-006', peca: 'Reparo placa lógica', imei: '678901234567890', valor: 800, percentual: 0, valorTotal: 800, servicoTerceirizado: true, descricaoTerceirizado: 'Micro solda especializada', fornecedorId: 'FORN-005', unidadeServico: '3ac7e00c', pecaNoEstoque: false, pecaDeFornecedor: true },
      { id: 'PC-007', peca: 'Limpeza interna', valor: 80, percentual: 0, valorTotal: 80, servicoTerceirizado: false, unidadeServico: '3ac7e00c', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [],
    descricao: 'Reparo em placa lógica após queda com água',
    timeline: [
      { data: '2025-01-12T15:30:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Jeferson Sousa Cabral' },
      { data: '2025-01-12T16:00:00', tipo: 'status', descricao: 'Em serviço', responsavel: 'Jeferson Sousa Cabral' },
      { data: '2025-01-13T10:00:00', tipo: 'peca', descricao: 'Peça enviada para terceirizado', responsavel: 'Jeferson Sousa Cabral' },
      { data: '2025-01-15T10:00:00', tipo: 'peca', descricao: 'Peça retornou do terceirizado', responsavel: 'Jeferson Sousa Cabral' },
      { data: '2025-01-15T17:00:00', tipo: 'conclusao_servico', descricao: 'OS finalizada pelo técnico. Custo: R$ 450,00, Venda: R$ 880,00', responsavel: 'Jeferson Sousa Cabral' }
    ],
    valorTotal: 880,
    custoTotal: 450,
    modeloAparelho: 'iPhone 13 Pro Max',
    imeiAparelho: '678901234567890',
    origemOS: 'Balcão'
  },
  // 7. Serviço concluído (pagamento registrado, aguardando conferência)
  {
    id: 'OS-2025-0007',
    dataHora: '2025-01-10T08:00:00',
    clienteId: 'CLI-004',
    setor: 'GARANTIA',
    tecnicoId: '53a1a9ad',
    lojaId: 'db894e7d',
    status: 'Serviço concluído',
    proximaAtuacao: 'Gestor (Conferência)',
    resumoConclusao: 'Alto-falante e microfone substituídos com sucesso.',
    valorCustoTecnico: 80,
    valorVendaTecnico: 200,
    pecas: [
      { id: 'PC-008', peca: 'Alto-falante', imei: '789012345678901', valor: 150, percentual: 0, valorTotal: 150, servicoTerceirizado: false, unidadeServico: 'db894e7d', pecaNoEstoque: true, pecaDeFornecedor: false },
      { id: 'PC-009', peca: 'Microfone', valor: 50, percentual: 0, valorTotal: 50, servicoTerceirizado: false, unidadeServico: 'db894e7d', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [
      { id: 'PAG-007', meio: 'Pix', valor: 200 }
    ],
    descricao: 'Problemas de áudio - alto-falante e microfone substituídos',
    timeline: [
      { data: '2025-01-10T08:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Julio Cesar da Silva' },
      { data: '2025-01-10T09:00:00', tipo: 'status', descricao: 'Em serviço', responsavel: 'Julio Cesar da Silva' },
      { data: '2025-01-10T16:00:00', tipo: 'conclusao_servico', descricao: 'OS finalizada pelo técnico', responsavel: 'Julio Cesar da Silva' },
      { data: '2025-01-11T10:00:00', tipo: 'pagamento', descricao: 'Pagamento de R$ 200,00 via Pix registrado', responsavel: 'Fernando Lima' }
    ],
    valorTotal: 200,
    custoTotal: 80,
    modeloAparelho: 'Samsung S23',
    imeiAparelho: '789012345678901',
    origemOS: 'Garantia'
  },
  // 8. Concluído (conferência aprovada - finalizado)
  {
    id: 'OS-2025-0008',
    dataHora: '2025-01-08T11:00:00',
    clienteId: 'CLI-003',
    setor: 'ASSISTÊNCIA',
    tecnicoId: '3a4e96c7',
    lojaId: '5b9446d5',
    status: 'Concluído',
    proximaAtuacao: '-',
    resumoConclusao: 'Troca de tela realizada com sucesso. Aparelho testado e funcionando.',
    valorCustoTecnico: 200,
    valorVendaTecnico: 450,
    pecas: [
      { id: 'PC-010', peca: 'Troca de tela', imei: '890123456789012', valor: 450, percentual: 0, valorTotal: 450, servicoTerceirizado: false, unidadeServico: '5b9446d5', pecaNoEstoque: true, pecaDeFornecedor: false }
    ],
    pagamentos: [
      { id: 'PAG-008', meio: 'Cartão Crédito', valor: 450, parcelas: 2 }
    ],
    descricao: 'Troca de tela iPhone 13 - fluxo completo concluído',
    timeline: [
      { data: '2025-01-08T11:00:00', tipo: 'registro', descricao: 'OS registrada', responsavel: 'Marcos Serra de Sousa' },
      { data: '2025-01-08T12:00:00', tipo: 'status', descricao: 'Em serviço', responsavel: 'Marcos Serra de Sousa' },
      { data: '2025-01-08T17:00:00', tipo: 'conclusao_servico', descricao: 'OS finalizada pelo técnico', responsavel: 'Marcos Serra de Sousa' },
      { data: '2025-01-09T09:00:00', tipo: 'pagamento', descricao: 'Pagamento registrado pelo vendedor', responsavel: 'Fernando Lima' },
      { data: '2025-01-09T14:00:00', tipo: 'validacao_financeiro', descricao: 'Conferência aprovada pelo gestor', responsavel: 'João Gestor' }
    ],
    valorTotal: 450,
    custoTotal: 200,
    modeloAparelho: 'iPhone 13',
    imeiAparelho: '890123456789012',
    origemOS: 'Balcão'
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
    os.status !== 'Serviço concluído' && os.status !== 'Finalizado' && 
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
