// API para gerenciar Trade-Ins pendentes (aparelhos com o cliente)
import { ItemTradeIn } from './vendasApi';
import { AnexoTemporario } from '@/components/estoque/BufferAnexos';

export interface TradeInPendente {
  id: string;
  vendaId: string;
  clienteId: string;
  clienteNome: string;
  tradeIn: ItemTradeIn;
  dataVenda: string;
  lojaVenda: string;
  vendedorId: string;
  vendedorNome: string;
  status: 'Aguardando Devolução' | 'Recebido';
  // Anexos originais da venda
  termoResponsabilidade?: AnexoTemporario;
  fotosAparelho?: AnexoTemporario[];
  // Dados do recebimento
  fotosRecebimento?: AnexoTemporario[];
  dataRecebimento?: string;
  responsavelRecebimentoId?: string;
  responsavelRecebimentoNome?: string;
  observacoesRecebimento?: string;
}

// Mock de dados para desenvolvimento
let tradeInsPendentes: TradeInPendente[] = [
  {
    id: 'TIP-001',
    vendaId: 'VEN-2025-0010',
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    tradeIn: {
      id: 'TRADE-PEND-001',
      modelo: 'iPhone 12',
      descricao: 'Aparelho em bom estado, tela sem trincas, bateria 80%',
      imei: '99-888777-666555-4',
      valorCompraUsado: 1800.00,
      imeiValidado: true,
      condicao: 'Semi-novo',
      tipoEntrega: 'Com o Cliente'
    },
    dataVenda: '2025-02-01T10:30:00',
    lojaVenda: 'db894e7d',
    vendedorId: '6dcbc817',
    vendedorNome: 'Cauã Victor',
    status: 'Aguardando Devolução',
    termoResponsabilidade: {
      id: 'termo-001',
      nome: 'Termo_Responsabilidade_JoaoSilva.pdf',
      tipo: 'application/pdf',
      tamanho: 125000,
      dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...'
    },
    fotosAparelho: [
      {
        id: 'foto-001',
        nome: 'frente_aparelho.jpg',
        tipo: 'image/jpeg',
        tamanho: 250000,
        dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
      },
      {
        id: 'foto-002',
        nome: 'verso_aparelho.jpg',
        tipo: 'image/jpeg',
        tamanho: 220000,
        dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
      }
    ]
  },
  {
    id: 'TIP-002',
    vendaId: 'VEN-2025-0011',
    clienteId: 'CLI-003',
    clienteNome: 'Pedro Oliveira',
    tradeIn: {
      id: 'TRADE-PEND-002',
      modelo: 'iPhone 11 Pro',
      descricao: 'Seminovo, pequeno arranhão na lateral, bateria 75%',
      imei: '88-777666-555444-3',
      valorCompraUsado: 1500.00,
      imeiValidado: true,
      condicao: 'Semi-novo',
      tipoEntrega: 'Com o Cliente'
    },
    dataVenda: '2025-01-28T14:15:00',
    lojaVenda: '3ac7e00c',
    vendedorId: '143ac0c2',
    vendedorNome: 'Antonio Sousa',
    status: 'Aguardando Devolução',
    termoResponsabilidade: {
      id: 'termo-002',
      nome: 'Termo_Pedro_Oliveira.pdf',
      tipo: 'application/pdf',
      tamanho: 118000,
      dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...'
    },
    fotosAparelho: [
      {
        id: 'foto-003',
        nome: 'iphone11pro_frente.jpg',
        tipo: 'image/jpeg',
        tamanho: 280000,
        dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
      }
    ]
  }
];

// ============= FUNÇÕES DE LEITURA =============

export function getTradeInsPendentes(): TradeInPendente[] {
  return [...tradeInsPendentes];
}

export function getTradeInsPendentesAguardando(): TradeInPendente[] {
  return tradeInsPendentes.filter(t => t.status === 'Aguardando Devolução');
}

export function getTradeInPendenteById(id: string): TradeInPendente | undefined {
  return tradeInsPendentes.find(t => t.id === id);
}

export function getTradeInPendenteByVendaId(vendaId: string): TradeInPendente | undefined {
  return tradeInsPendentes.find(t => t.vendaId === vendaId);
}

// ============= FUNÇÕES DE ESCRITA =============

export function addTradeInPendente(data: Omit<TradeInPendente, 'id'>): TradeInPendente {
  const novoId = `TIP-${String(tradeInsPendentes.length + 1).padStart(3, '0')}`;
  const novoTradeIn: TradeInPendente = {
    ...data,
    id: novoId,
    status: 'Aguardando Devolução'
  };
  tradeInsPendentes.push(novoTradeIn);
  return novoTradeIn;
}

export function registrarRecebimento(
  id: string,
  dados: {
    fotosRecebimento: AnexoTemporario[];
    responsavelRecebimentoId: string;
    responsavelRecebimentoNome: string;
    observacoesRecebimento?: string;
  }
): TradeInPendente | null {
  const index = tradeInsPendentes.findIndex(t => t.id === id);
  if (index === -1) return null;

  tradeInsPendentes[index] = {
    ...tradeInsPendentes[index],
    status: 'Recebido',
    dataRecebimento: new Date().toISOString(),
    ...dados
  };

  return tradeInsPendentes[index];
}

// ============= FUNÇÕES DE SLA =============

export interface SLAInfo {
  dias: number;
  horas: number;
  texto: string;
  nivel: 'normal' | 'atencao' | 'critico';
}

export function calcularSLA(dataVenda: string): SLAInfo {
  const diff = Date.now() - new Date(dataVenda).getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let nivel: 'normal' | 'atencao' | 'critico' = 'normal';
  if (dias >= 5) {
    nivel = 'critico';
  } else if (dias >= 3) {
    nivel = 'atencao';
  }

  return {
    dias,
    horas,
    texto: `${dias} dias e ${horas} horas`,
    nivel
  };
}

// ============= INTEGRAÇÃO COM ESTOQUE =============

/**
 * Função para migrar um trade-in recebido para Produtos Pendentes
 * Esta função deve ser chamada após registrar o recebimento
 */
export function migrarParaProdutosPendentes(tradeInPendenteId: string): boolean {
  const tradeIn = getTradeInPendenteById(tradeInPendenteId);
  if (!tradeIn || tradeIn.status !== 'Recebido') {
    return false;
  }

  // TODO: Integrar com osApi.addProdutoPendente quando conectar ao backend
  // Exemplo de estrutura esperada:
  // addProdutoPendente({
  //   modelo: tradeIn.tradeIn.modelo,
  //   imei: tradeIn.tradeIn.imei,
  //   condicao: tradeIn.tradeIn.condicao,
  //   valorCusto: tradeIn.tradeIn.valorCompraUsado,
  //   origem: 'Base de Troca',
  //   vendaOrigemId: tradeIn.vendaId,
  //   clienteOrigemId: tradeIn.clienteId,
  //   dataEntrada: tradeIn.dataRecebimento,
  //   fotosRecebimento: tradeIn.fotosRecebimento,
  //   termoResponsabilidade: tradeIn.termoResponsabilidade
  // });

  console.log('[BaseTrocasAPI] Migrando para Produtos Pendentes:', tradeIn.id);
  return true;
}

// ============= ESTATÍSTICAS =============

export interface EstatisticasBaseTrocas {
  total: number;
  aguardando: number;
  recebidos: number;
  valorTotalAguardando: number;
  mediaTempoSLA: number;
}

export function getEstatisticasBaseTrocas(): EstatisticasBaseTrocas {
  const aguardando = tradeInsPendentes.filter(t => t.status === 'Aguardando Devolução');
  const recebidos = tradeInsPendentes.filter(t => t.status === 'Recebido');

  const valorTotalAguardando = aguardando.reduce(
    (acc, t) => acc + t.tradeIn.valorCompraUsado, 
    0
  );

  // Calcular média de tempo em dias
  let totalDias = 0;
  aguardando.forEach(t => {
    const sla = calcularSLA(t.dataVenda);
    totalDias += sla.dias;
  });
  const mediaTempoSLA = aguardando.length > 0 ? totalDias / aguardando.length : 0;

  return {
    total: tradeInsPendentes.length,
    aguardando: aguardando.length,
    recebidos: recebidos.length,
    valorTotalAguardando,
    mediaTempoSLA
  };
}
