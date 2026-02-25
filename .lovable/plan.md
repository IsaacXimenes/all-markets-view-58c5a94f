

## Plano: Ajustar cabecalhos do Painel de Rentabilidade para exibir Valor de Venda

### Problema

Atualmente os cabecalhos dos blocos colapsaveis exibem o **lucro** de cada categoria. O usuario quer que exibam o **valor cobrado/venda**.

### Alteracoes em `src/components/vendas/PainelRentabilidadeVenda.tsx`

Mudar o valor `total` passado ao `BlocoHeader` em cada bloco:

| Bloco | Atual (lucro) | Novo (valor cobrado) |
|-------|--------------|---------------------|
| Aparelhos | `aparelhos.totalLucro` | `aparelhos.totalVenda` |
| Acessorios | `acessorios.totalLucro` | `acessorios.totalVenda` |
| Base de Troca | `resumo.totalTradeIn` (ja correto) | `resumo.totalTradeIn` (manter - valor pago na troca) |
| Garantia Extendida | `garantiaExtendida.valor` (ja correto) | Manter |
| Logistica | `resumo.lucroEntrega` | `taxaEntrega` (valor cobrado do cliente) |
| Resumo Consolidado | Nao usa BlocoHeader | Adicionar destaque do Lucro Bruto no cabecalho da secao |

Adicionalmente, aplicar cores na margem dos acessorios e aparelhos:
- Verde: margem >= 30%
- Amarelo: margem >= 15% e < 30%
- Vermelho: margem < 15% ou negativa

### Arquivo afetado

`src/components/vendas/PainelRentabilidadeVenda.tsx` - 5 linhas de cabecalho + badges de margem coloridos

