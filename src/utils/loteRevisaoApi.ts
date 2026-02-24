// ============= API para Lotes de Revisão de Notas de Entrada =============
// Gerencia o encaminhamento em lote de aparelhos defeituosos para assistência

import { getNotaEntradaById, NotaEntrada, gerarCreditoFornecedor, registrarTimeline, atualizarAbatimentoNota } from './notaEntradaFluxoApi';
import { encaminharParaAnaliseGarantia, MetadadosEstoque } from './garantiasApi';
import { marcarProdutoRetornoAssistencia, marcarProdutoDevolvido } from './estoqueApi';

// ============= TIPOS E INTERFACES =============

export interface ItemRevisao {
  id: string;
  produtoNotaId: string;
  produtoId?: string;
  marca: string;
  modelo: string;
  imei?: string;
  motivoAssistencia: string;
  observacao?: string;
  responsavelRegistro: string;
  dataRegistro: string;
  osId?: string;
  custoReparo: number;
  statusReparo: 'Pendente' | 'Em Andamento' | 'Concluido';
}

export type LoteRevisaoStatus = 'Em Revisao' | 'Encaminhado' | 'Em Andamento' | 'Finalizado';

export interface LoteRevisao {
  id: string;
  notaEntradaId: string;
  numeroNota: string;
  fornecedor: string;
  valorOriginalNota: number;
  status: LoteRevisaoStatus;
  itens: ItemRevisao[];
  dataCriacao: string;
  responsavelCriacao: string;
  dataFinalizacao?: string;
  custoTotalReparos: number;
  valorLiquidoSugerido: number;
  osIds: string[];
}

export interface AbatimentoInfo {
  valorNota: number;
  custoReparos: number;
  valorLiquido: number;
  percentualReparo: number;
  alertaCritico: boolean; // > 15%
}

// ============= ARMAZENAMENTO =============

let lotesRevisao: LoteRevisao[] = [];
let proximoSequencialLote = 1;

const gerarIdLote = (numeroNota: string): string => {
  const seq = String(proximoSequencialLote).padStart(5, '0');
  proximoSequencialLote++;
  return `REV-NOTA-${seq}`;
};

// ============= FUNÇÕES CRUD =============

export const criarLoteRevisao = (
  notaEntradaId: string,
  itens: Omit<ItemRevisao, 'id' | 'osId' | 'custoReparo' | 'statusReparo'>[],
  responsavel: string
): LoteRevisao | null => {
  const nota = getNotaEntradaById(notaEntradaId);
  if (!nota) return null;

  const id = gerarIdLote(nota.numeroNota);

  const itensProcessados: ItemRevisao[] = itens.map((item, idx) => ({
    ...item,
    id: `${id}-ITEM-${String(idx + 1).padStart(3, '0')}`,
    custoReparo: 0,
    statusReparo: 'Pendente' as const
  }));

  const lote: LoteRevisao = {
    id,
    notaEntradaId,
    numeroNota: nota.numeroNota,
    fornecedor: nota.fornecedor,
    valorOriginalNota: nota.valorTotal,
    status: 'Em Revisao',
    itens: itensProcessados,
    dataCriacao: new Date().toISOString(),
    responsavelCriacao: responsavel,
    custoTotalReparos: 0,
    valorLiquidoSugerido: nota.valorTotal,
    osIds: []
  };

  lotesRevisao.push(lote);
  return lote;
};

export const getLotesRevisao = (): LoteRevisao[] => [...lotesRevisao];

export const getLoteRevisaoById = (id: string): LoteRevisao | undefined => 
  lotesRevisao.find(l => l.id === id);

export const getLoteRevisaoByNotaId = (notaId: string): LoteRevisao | undefined =>
  lotesRevisao.find(l => l.notaEntradaId === notaId);

export const atualizarItemRevisao = (
  loteId: string,
  itemId: string,
  updates: Partial<ItemRevisao>
): LoteRevisao | null => {
  const lote = lotesRevisao.find(l => l.id === loteId);
  if (!lote) return null;

  const itemIndex = lote.itens.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return null;

  lote.itens[itemIndex] = { ...lote.itens[itemIndex], ...updates };

  // Recalcular custo total
  lote.custoTotalReparos = lote.itens.reduce((acc, i) => acc + i.custoReparo, 0);
  lote.valorLiquidoSugerido = lote.valorOriginalNota - lote.custoTotalReparos;

  return lote;
};

export const encaminharLoteParaAssistencia = (
  loteId: string,
  responsavel: string
): LoteRevisao | null => {
  const lote = lotesRevisao.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Em Revisao') return null;

  // Encaminhar cada item para Análise de Tratativas (não criar OS diretamente)
  lote.itens.forEach(item => {
    const descricao = `Lote ${lote.id} — ${item.marca} ${item.modelo}${item.imei ? ` (IMEI: ${item.imei})` : ''}`;
    const observacao = `Motivo: ${item.motivoAssistencia}${item.observacao ? `\nObs: ${item.observacao}` : ''}\nNota: ${lote.numeroNota}`;
    const metadata: MetadadosEstoque = {
      notaEntradaId: lote.notaEntradaId,
      produtoNotaId: item.produtoNotaId,
      loteRevisaoId: lote.id,
      loteRevisaoItemId: item.id,
      imeiAparelho: item.imei,
      modeloAparelho: item.modelo,
      marcaAparelho: item.marca
    };
    encaminharParaAnaliseGarantia(item.produtoNotaId, 'Estoque', descricao, observacao, metadata);
  });

  lote.status = 'Encaminhado';

  return lote;
};

// ============= SINCRONIZAÇÃO NOTA ↔ LOTE =============

export const sincronizarNotaComLote = (
  loteId: string,
  responsavel: string
): NotaEntrada | null => {
  const lote = lotesRevisao.find(l => l.id === loteId);
  if (!lote) return null;

  const nota = getNotaEntradaById(lote.notaEntradaId);
  if (!nota) return null;

  // Calcular custo total dos itens concluídos
  const custoTotalConcluidos = lote.itens
    .filter(i => i.statusReparo === 'Concluido')
    .reduce((acc, i) => acc + i.custoReparo, 0);

  // Atualizar abatimento na nota
  atualizarAbatimentoNota(nota.id, custoTotalConcluidos);

  // Registrar na timeline da nota
  const isFinalizado = lote.status === 'Finalizado';
  const acao = isFinalizado
    ? `Retorno da Assistência - Lote ${lote.id} finalizado. Custo de reparos: R$ ${custoTotalConcluidos.toFixed(2)}. Abatimento aplicado.`
    : `Assistência - Item concluído no Lote ${lote.id}. Custo acumulado: R$ ${custoTotalConcluidos.toFixed(2)}.`;

  registrarTimeline(
    nota,
    responsavel,
    'Sistema',
    acao,
    nota.status,
    custoTotalConcluidos,
    `Valor original: R$ ${nota.valorTotal.toFixed(2)} | Valor líquido: R$ ${(nota.valorTotal - custoTotalConcluidos).toFixed(2)}`
  );

  // Para notas 100% Antecipadas finalizadas, registrar crédito na timeline
  if (isFinalizado && nota.tipoPagamento === 'Pagamento 100% Antecipado' && custoTotalConcluidos > 0) {
    // Gerar crédito ao fornecedor pelo custo de reparos
    gerarCreditoFornecedor(
      nota.fornecedor,
      custoTotalConcluidos,
      nota.id,
      `Crédito por custo de reparos - Lote ${lote.id}`
    );

    registrarTimeline(
      nota,
      'Sistema',
      'Sistema',
      `Crédito gerado para fornecedor: R$ ${custoTotalConcluidos.toFixed(2)}`,
      nota.status,
      custoTotalConcluidos,
      `Nota 100% antecipada - custo de reparos convertido em crédito ao fornecedor`
    );
  }

  return nota;
};

export const finalizarLoteRevisao = (
  loteId: string,
  responsavel: string
): LoteRevisao | null => {
  const lote = lotesRevisao.find(l => l.id === loteId);
  if (!lote) return null;

  lote.status = 'Finalizado';
  lote.dataFinalizacao = new Date().toISOString();

  // Recalcular custos com base nas OS vinculadas
  lote.custoTotalReparos = lote.itens.reduce((acc, i) => acc + i.custoReparo, 0);
  lote.valorLiquidoSugerido = lote.valorOriginalNota - lote.custoTotalReparos;

  // Sincronizar nota de entrada com abatimento
  sincronizarNotaComLote(loteId, responsavel);

  return lote;
};

// ============= LOGÍSTICA REVERSA =============

export type ResultadoReparo = 'Consertado' | 'Devolucao ao Fornecedor';

export interface ResultadoItemRevisao {
  itemId: string;
  resultado: ResultadoReparo;
}

export const finalizarLoteComLogisticaReversa = (
  loteId: string,
  resultados: ResultadoItemRevisao[],
  responsavel: string
): LoteRevisao | null => {
  const lote = lotesRevisao.find(l => l.id === loteId);
  if (!lote) return null;

  lote.status = 'Finalizado';
  lote.dataFinalizacao = new Date().toISOString();
  lote.custoTotalReparos = lote.itens.reduce((acc, i) => acc + i.custoReparo, 0);
  lote.valorLiquidoSugerido = lote.valorOriginalNota - lote.custoTotalReparos;

  // Processar cada item conforme resultado
  let valorAbatimentoDevolucao = 0;
  resultados.forEach(res => {
    const item = lote.itens.find(i => i.id === res.itemId);
    if (!item) return;

    if (res.resultado === 'Consertado') {
      item.statusReparo = 'Concluido';
      // Marcar produto com tagRetornoAssistencia no estoqueApi
      if (item.imei) {
        marcarProdutoRetornoAssistencia(item.imei);
      }
    } else if (res.resultado === 'Devolucao ao Fornecedor') {
      item.statusReparo = 'Concluido';
      // Valor integral do aparelho abatido na nota
      const custoAparelho = lote.valorOriginalNota / lote.itens.length;
      valorAbatimentoDevolucao += custoAparelho;
      
      // Marcar produto como devolvido no estoque
      if (item.imei) {
        marcarProdutoDevolvido(item.imei);
      }
      
      // Gerar crédito para notas antecipadas
      const notaEntrada = getNotaEntradaById(lote.notaEntradaId);
      if (notaEntrada && notaEntrada.tipoPagamento === 'Pagamento 100% Antecipado') {
        gerarCreditoFornecedor(
          lote.fornecedor,
          custoAparelho,
          lote.notaEntradaId,
          `Devolução ao fornecedor - ${item.marca} ${item.modelo} (Lote ${lote.id})`
        );
      }
    }
  });

  // Aplicar abatimento de devoluções
  if (valorAbatimentoDevolucao > 0) {
    lote.valorLiquidoSugerido -= valorAbatimentoDevolucao;
  }

  // Sincronizar nota de entrada com abatimento total (reparos + devoluções)
  sincronizarNotaComLote(loteId, responsavel);

  return lote;
};

// Obter itens consertados (para retorno ao estoque com tag)
export const getItensConsertados = (loteId: string): ItemRevisao[] => {
  const lote = lotesRevisao.find(l => l.id === loteId);
  if (!lote || lote.status !== 'Finalizado') return [];
  return lote.itens.filter(i => i.statusReparo === 'Concluido');
};

export const calcularAbatimento = (loteId: string): AbatimentoInfo | null => {
  const lote = lotesRevisao.find(l => l.id === loteId);
  if (!lote) return null;

  const custoReparos = lote.itens.reduce((acc, i) => acc + i.custoReparo, 0);
  const percentualReparo = lote.valorOriginalNota > 0 
    ? (custoReparos / lote.valorOriginalNota) * 100 
    : 0;

  return {
    valorNota: lote.valorOriginalNota,
    custoReparos,
    valorLiquido: lote.valorOriginalNota - custoReparos,
    percentualReparo,
    alertaCritico: percentualReparo > 15
  };
};

// ============= MOCK DATA =============

const initMockData = () => {
  // Lote de revisão mock vinculado a uma nota existente
  const mockLote: LoteRevisao = {
    id: 'REV-NOTA-00001',
    notaEntradaId: 'NE-2025-00001',
    numeroNota: 'NE-2025-00001',
    fornecedor: 'Distribuidor Global Tech',
    valorOriginalNota: 15000,
    status: 'Encaminhado',
    itens: [
      {
        id: 'REV-NOTA-00001-ITEM-001',
        produtoNotaId: 'PROD-NE-2025-00001-001',
        marca: 'Apple',
        modelo: 'iPhone 14',
        imei: '350000111222333',
        motivoAssistencia: 'Display com manchas e touch falhando na parte inferior',
        responsavelRegistro: 'João Gestor',
        dataRegistro: '2025-01-20T10:00:00',
        osId: 'OS-2025-0012',
        custoReparo: 520,
        statusReparo: 'Em Andamento'
      },
      {
        id: 'REV-NOTA-00001-ITEM-002',
        produtoNotaId: 'PROD-NE-2025-00001-002',
        marca: 'Samsung',
        modelo: 'Galaxy S23',
        imei: '350000444555666',
        motivoAssistencia: 'Bateria inflada - risco de segurança',
        observacao: 'Aparelho veio lacrado mas com bateria visivelmente inflada',
        responsavelRegistro: 'João Gestor',
        dataRegistro: '2025-01-20T10:15:00',
        custoReparo: 95,
        statusReparo: 'Concluido'
      },
      {
        id: 'REV-NOTA-00001-ITEM-003',
        produtoNotaId: 'PROD-NE-2025-00001-003',
        marca: 'Apple',
        modelo: 'iPhone 15 Pro',
        imei: '350000777888999',
        motivoAssistencia: 'Câmera traseira com defeito de foco automático',
        responsavelRegistro: 'João Gestor',
        dataRegistro: '2025-01-20T10:30:00',
        custoReparo: 0,
        statusReparo: 'Pendente'
      }
    ],
    dataCriacao: '2025-01-20T10:00:00',
    responsavelCriacao: 'João Gestor',
    custoTotalReparos: 615,
    valorLiquidoSugerido: 14385,
    osIds: ['OS-2025-0012']
  };

  lotesRevisao.push(mockLote);
  proximoSequencialLote = 2;
};

initMockData();
