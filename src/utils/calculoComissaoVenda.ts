// Cálculo de Comissão de Venda baseado na origem (Loja Física vs Online - Digital)

import { getLojaById } from './cadastrosApi';

export interface CalculoComissaoVendaInput {
  lojaVendaId: string;
  lucroResidual: number;
  colaboradorId?: string;
}

export interface ResultadoComissaoVenda {
  lojaVendaId: string;
  lojaVendaNome: string;
  percentualComissao: number; // 10 para 10% ou 6 para 6%
  valorComissao: number; // Valor em reais
  lucroResidual: number; // Lucro residual original (não alterado)
}

// ID fixo da loja online
export const LOJA_ONLINE_ID = 'LOJA-ONLINE';

// Percentuais de comissão
const COMISSAO_LOJA_FISICA = 10; // 10%
const COMISSAO_LOJA_ONLINE = 6;  // 6%

/**
 * Calcula a comissão de venda baseado na origem (loja física vs online)
 * 
 * Lógica:
 * 1. Verificar se lojaVendaId é "LOJA-ONLINE" (Online - Digital)
 * 2. Se for "LOJA-ONLINE": percentualComissao = 6%
 * 3. Se não for "LOJA-ONLINE": percentualComissao = 10%
 * 4. Calcular valorComissao = lucroResidual * (percentualComissao / 100)
 * 5. Retornar resultado
 * 
 * @throws Error se lucroResidual < 0
 * @throws Error se lojaVendaId não existe
 */
export function calcularComissaoVenda(input: CalculoComissaoVendaInput): ResultadoComissaoVenda {
  const { lojaVendaId, lucroResidual } = input;

  // Validação: lucro residual não pode ser negativo
  if (lucroResidual < 0) {
    throw new Error('Lucro residual não pode ser negativo');
  }

  // Buscar loja
  const loja = getLojaById(lojaVendaId);
  if (!loja) {
    throw new Error('Loja de venda não encontrada');
  }

  // Determinar percentual de comissão baseado na origem
  const isOnline = lojaVendaId === LOJA_ONLINE_ID;
  const percentualComissao = isOnline ? COMISSAO_LOJA_ONLINE : COMISSAO_LOJA_FISICA;

  // Calcular valor da comissão
  const valorComissao = lucroResidual * (percentualComissao / 100);

  return {
    lojaVendaId,
    lojaVendaNome: loja.nome,
    percentualComissao,
    valorComissao,
    lucroResidual
  };
}

/**
 * Retorna o percentual de comissão baseado na loja
 */
export function getPercentualComissao(lojaVendaId: string): number {
  return lojaVendaId === LOJA_ONLINE_ID ? COMISSAO_LOJA_ONLINE : COMISSAO_LOJA_FISICA;
}

/**
 * Verifica se uma loja é a loja online
 */
export function isLojaOnline(lojaVendaId: string): boolean {
  return lojaVendaId === LOJA_ONLINE_ID;
}
