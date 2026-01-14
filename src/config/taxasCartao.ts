/**
 * Configuração de Taxas de Cartão de Crédito por Parcelas
 * 
 * Este arquivo centraliza as taxas aplicadas sobre o valor bruto pago pelo cliente.
 * A lógica nova calcula:
 * - Valor Final (bruto) = valor efetivamente pago pelo cliente
 * - Taxa da Máquina = Valor Final × (taxa% / 100)
 * - Valor Líquido = Valor Final - Taxa da Máquina
 * - Lucro Residual = Valor Líquido - Custo Total dos Produtos
 * 
 * Para editar as taxas, altere os valores neste arquivo.
 */

// Taxas de cartão de crédito por número de parcelas (em %)
export const TAXAS_CREDITO: Record<number, number> = {
  1: 0,      // 1x - À vista
  2: 5,      // 2x
  3: 7,      // 3x
  4: 8,      // 4x
  5: 10,     // 5x
  6: 12,     // 6x
  7: 14,     // 7x
  8: 16,     // 8x
  9: 18,     // 9x
  10: 20,    // 10x
  11: 22,    // 11x
  12: 24,    // 12x
  13: 26,    // 13x
  14: 28,    // 14x
  15: 30,    // 15x
  16: 32,    // 16x
  17: 34,    // 17x
  18: 36,    // 18x
  19: 38,    // 19x
  20: 40,    // 20x
  21: 42,    // 21x
  22: 44,    // 22x
  23: 46,    // 23x
  24: 48,    // 24x
  25: 50,    // 25x
  26: 52,    // 26x
  27: 54,    // 27x
  28: 56,    // 28x
  29: 58,    // 29x
  30: 60,    // 30x
  31: 62,    // 31x
  32: 64,    // 32x
  33: 66,    // 33x
  34: 68,    // 34x
  35: 70,    // 35x
  36: 72,    // 36x
};

// Taxa de débito padrão (em %)
export const TAXA_DEBITO = 2;

// Número máximo de parcelas
export const MAX_PARCELAS = 36;

/**
 * Obtém a taxa de crédito para um número de parcelas específico
 * @param parcelas Número de parcelas (1-36)
 * @returns Taxa em percentual
 */
export function getTaxaCredito(parcelas: number): number {
  if (parcelas < 1) return 0;
  if (parcelas > MAX_PARCELAS) return TAXAS_CREDITO[MAX_PARCELAS];
  return TAXAS_CREDITO[parcelas] ?? parcelas * 2; // fallback: 2% por parcela
}

/**
 * Calcula os valores da venda com base na nova lógica
 * @param valorFinal Valor bruto pago pelo cliente (com taxa implícita)
 * @param parcelas Número de parcelas
 * @param custoTotalProdutos Custo total dos produtos vendidos
 * @param meioPagamento Meio de pagamento
 * @returns Objeto com taxaMaquina, valorLiquido e lucroResidual
 */
export function calcularValoresVenda(
  valorFinal: number,
  parcelas: number,
  custoTotalProdutos: number,
  meioPagamento: 'Cartão Crédito' | 'Cartão Débito' | string
): {
  taxaPercent: number;
  taxaMaquina: number;
  valorLiquido: number;
  lucroResidual: number;
} {
  let taxaPercent = 0;

  if (meioPagamento === 'Cartão Crédito') {
    taxaPercent = getTaxaCredito(parcelas);
  } else if (meioPagamento === 'Cartão Débito') {
    taxaPercent = TAXA_DEBITO;
  }
  // Pix, Dinheiro, Transferência = 0% taxa

  const taxaMaquina = valorFinal * (taxaPercent / 100);
  const valorLiquido = valorFinal - taxaMaquina;
  const lucroResidual = valorLiquido - custoTotalProdutos;

  return {
    taxaPercent,
    taxaMaquina,
    valorLiquido,
    lucroResidual,
  };
}

/**
 * Formata taxa para exibição
 * @param taxa Taxa em percentual
 * @returns String formatada (ex: "10%")
 */
export function formatTaxa(taxa: number): string {
  return `${taxa.toFixed(1)}%`;
}
