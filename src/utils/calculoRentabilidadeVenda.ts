// Funções puras de cálculo de rentabilidade para vendas
import { getAcessorioById, VendaAcessorio } from '@/utils/acessoriosApi';
import { getValorRecomendado } from '@/utils/valoresRecomendadosTrocaApi';
import { getTaxaEntregaById } from '@/utils/taxasEntregaApi';
import { calcularValoresVenda } from '@/config/taxasCartao';
import { ItemVenda, ItemTradeIn, Pagamento } from '@/utils/vendasApi';
import { LOJA_MATRIZ_ID, LOJA_ONLINE_ID } from '@/utils/estoqueApi';

// === Interfaces de resultado ===

export interface RentabilidadeItem {
  id: string;
  produto: string;
  valorCusto: number;
  valorVenda: number;
  lucro: number;
  margem: number;
}

export interface RentabilidadeAcessorio {
  id: string;
  descricao: string;
  quantidade: number;
  valorCusto: number;
  custoTotal: number;
  valorTotal: number;
  lucro: number;
  margem: number;
}

export interface AnaliseTradeIn {
  id: string;
  modelo: string;
  valorCompraUsado: number;
  valorSugerido: number | null;
  diferenca: number | null;
  status: 'economia' | 'acima' | 'sem_referencia';
}

export interface ResumoRentabilidade {
  custoAparelhos: number;
  vendaAparelhos: number;
  lucroAparelhos: number;
  custoAcessorios: number;
  vendaAcessorios: number;
  lucroAcessorios: number;
  totalTradeIn: number;
  valorGarantia: number;
  comissaoGarantia: number;
  taxaEntregaCobrada: number;
  custoEntregaParametrizado: number;
  lucroEntrega: number;
  custoTotal: number;
  valorVendaTotal: number;
  lucroBruto: number;
  comissaoLucro: number;
  comissaoFinal: number;
  percentualComissao: number;
  taxasCartao: number;
  lucroReal: number;
}

// === Funções de cálculo ===

export function calcularRentabilidadeAparelhos(itens: ItemVenda[]): {
  items: RentabilidadeItem[];
  totalCusto: number;
  totalVenda: number;
  totalLucro: number;
} {
  const items = itens.map(item => {
    const lucro = item.valorVenda - item.valorCusto;
    const margem = item.valorCusto > 0 ? (lucro / item.valorCusto) * 100 : 0;
    return {
      id: item.id,
      produto: item.produto,
      valorCusto: item.valorCusto,
      valorVenda: item.valorVenda,
      lucro,
      margem,
    };
  });

  return {
    items,
    totalCusto: items.reduce((s, i) => s + i.valorCusto, 0),
    totalVenda: items.reduce((s, i) => s + i.valorVenda, 0),
    totalLucro: items.reduce((s, i) => s + i.lucro, 0),
  };
}

export function calcularRentabilidadeAcessorios(acessoriosVenda: VendaAcessorio[]): {
  items: RentabilidadeAcessorio[];
  totalCusto: number;
  totalVenda: number;
  totalLucro: number;
} {
  const items = acessoriosVenda.map(av => {
    const acessorio = getAcessorioById(av.acessorioId);
    const valorCusto = acessorio?.valorCusto ?? 0;
    const custoTotal = valorCusto * av.quantidade;
    const lucro = av.valorTotal - custoTotal;
    const margem = custoTotal > 0 ? (lucro / custoTotal) * 100 : 0;
    return {
      id: av.id,
      descricao: av.descricao,
      quantidade: av.quantidade,
      valorCusto,
      custoTotal,
      valorTotal: av.valorTotal,
      lucro,
      margem,
    };
  });

  return {
    items,
    totalCusto: items.reduce((s, i) => s + i.custoTotal, 0),
    totalVenda: items.reduce((s, i) => s + i.valorTotal, 0),
    totalLucro: items.reduce((s, i) => s + i.lucro, 0),
  };
}

export function calcularAnaliseTradeIn(tradeIns: ItemTradeIn[]): AnaliseTradeIn[] {
  return tradeIns.map(t => {
    const recomendado = getValorRecomendado(t.modelo);
    const valorSugerido = recomendado?.valorSugerido ?? null;
    let diferenca: number | null = null;
    let status: AnaliseTradeIn['status'] = 'sem_referencia';

    if (valorSugerido !== null) {
      diferenca = valorSugerido - t.valorCompraUsado;
      status = t.valorCompraUsado <= valorSugerido ? 'economia' : 'acima';
    }

    return {
      id: t.id,
      modelo: t.modelo,
      valorCompraUsado: t.valorCompraUsado,
      valorSugerido,
      diferenca,
      status,
    };
  });
}

export function calcularComissaoHibrida(
  lucroBruto: number,
  valorGarantia: number,
  lojaVendaId: string
): {
  comissaoGarantia: number;
  lucroRestante: number;
  percentualComissao: number;
  comissaoLucro: number;
  comissaoFinal: number;
} {
  const comissaoGarantia = valorGarantia * 0.10;
  const lucroRestante = Math.max(0, lucroBruto - comissaoGarantia);
  const isMatrizOuOnline = lojaVendaId === LOJA_MATRIZ_ID || lojaVendaId === LOJA_ONLINE_ID;
  const percentualComissao = isMatrizOuOnline ? 6 : 10;
  const comissaoLucro = lucroRestante * (percentualComissao / 100);
  const comissaoFinal = comissaoGarantia + comissaoLucro;

  return { comissaoGarantia, lucroRestante, percentualComissao, comissaoLucro, comissaoFinal };
}

export function calcularTaxasCartao(pagamentos: Pagamento[]): number {
  let totalTaxas = 0;
  pagamentos.forEach(p => {
    const result = calcularValoresVenda(p.valor, p.parcelas || 1, 0, p.meioPagamento);
    totalTaxas += result.taxaMaquina;
  });
  return totalTaxas;
}

export function calcularLucroReal(params: {
  itens: ItemVenda[];
  acessoriosVenda: VendaAcessorio[];
  tradeIns: ItemTradeIn[];
  valorGarantia: number;
  taxaEntregaCobrada: number;
  localEntregaId: string;
  lojaVendaId: string;
  pagamentos: Pagamento[];
  totalVenda: number;
}): ResumoRentabilidade {
  const aparelhos = calcularRentabilidadeAparelhos(params.itens);
  const acessorios = calcularRentabilidadeAcessorios(params.acessoriosVenda);
  const totalTradeIn = params.tradeIns.reduce((s, t) => s + t.valorCompraUsado, 0);

  // Custo entrega parametrizado
  const taxaEntrega = params.localEntregaId ? getTaxaEntregaById(params.localEntregaId) : undefined;
  const custoEntregaParametrizado = taxaEntrega?.valor ?? 0;
  const lucroEntrega = params.taxaEntregaCobrada - custoEntregaParametrizado;

  const custoTotal = aparelhos.totalCusto + acessorios.totalCusto + totalTradeIn;
  const lucroBruto = params.totalVenda - custoTotal;

  const comissao = calcularComissaoHibrida(lucroBruto, params.valorGarantia, params.lojaVendaId);
  const taxasCartao = calcularTaxasCartao(params.pagamentos);

  const lucroReal = params.totalVenda - custoTotal - comissao.comissaoFinal - custoEntregaParametrizado - taxasCartao;

  return {
    custoAparelhos: aparelhos.totalCusto,
    vendaAparelhos: aparelhos.totalVenda,
    lucroAparelhos: aparelhos.totalLucro,
    custoAcessorios: acessorios.totalCusto,
    vendaAcessorios: acessorios.totalVenda,
    lucroAcessorios: acessorios.totalLucro,
    totalTradeIn,
    valorGarantia: params.valorGarantia,
    comissaoGarantia: comissao.comissaoGarantia,
    taxaEntregaCobrada: params.taxaEntregaCobrada,
    custoEntregaParametrizado,
    lucroEntrega,
    custoTotal,
    valorVendaTotal: params.totalVenda,
    lucroBruto,
    comissaoLucro: comissao.comissaoLucro,
    comissaoFinal: comissao.comissaoFinal,
    percentualComissao: comissao.percentualComissao,
    taxasCartao,
    lucroReal,
  };
}
