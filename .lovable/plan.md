

## Adicionar 4 Contas de Dinheiro para Assistencias

### O que sera feito

Adicionar 4 novas contas financeiras do tipo "Dinheiro" vinculadas as lojas de Assistencia, e inclui-las na secao "Contas Segregadas" do Extrato por Conta.

### Novas Contas

| ID | Nome | Vinculada a | CNPJ |
|---|---|---|---|
| CTA-022 | Dinheiro - Assistencia JK Shopping | Assistencia - Shopping JK (94dbe2b1) | 62.968.637/0001-23 |
| CTA-023 | Dinheiro - Assistencia Shopping Sul | Assistencia - Shopping Sul (ba1802b9) | 55.449.390/0001-73 |
| CTA-024 | Dinheiro - Assistencia Aguas Lindas | Assistencia - Aguas Lindas (be961085) | 56.221.743/0001-46 |
| CTA-025 | Dinheiro - Assistencia Online | Loja - Online (fcc78c1a) | 46.197.533/0001-06 |

Todas com: tipo "Dinheiro", saldo R$ 0,00, statusMaquina "Propria", status "Ativo", notaFiscal true.

### Alteracoes por Arquivo

**1. `src/utils/cadastrosApi.ts`**
- Inserir as 4 novas contas (CTA-022 a CTA-025) no array `contasFinanceiras`, logo antes do fechamento do array (apos CTA-021)

**2. `src/pages/FinanceiroExtratoContas.tsx`**
- Adicionar CTA-022, CTA-023, CTA-024, CTA-025 ao array `CONTAS_DINHEIRO_SEGREGADAS` (ou criar constante propria) para que aparecam na secao "Contas Segregadas"
- Adicionar os novos IDs na lista `ordemSegregadas` para manter a ordenacao correta dos cards (assistencia bancaria, depois dinheiro loja, depois dinheiro assistencia)

