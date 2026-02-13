

## Unificar visao de detalhes: Financeiro > Notas Pendentes

### Problema atual
No modulo **Estoque > Notas Pendentes**, ao clicar no icone de olho, o sistema navega para uma pagina completa de detalhes (`/estoque/nota/{id}`) com:
- Cards de status, atuacao, tipo de pagamento e progresso de conferencia
- Alertas ativos
- Informacoes completas da nota (numero, fornecedor, valores, quantidades, responsavel, observacoes)
- Tabela de produtos cadastrados (colapsavel)
- Timeline de eventos (colapsavel)
- Botoes de acao (Cadastrar Produtos, Conferir)

No modulo **Financeiro > Notas Pendentes**, ao clicar no olho, abre um modal (dialog) menor com informacoes resumidas e layout diferente.

### Solucao
Alterar o `handleVerDetalhes` no Financeiro para navegar para a mesma pagina de detalhes do Estoque (`/estoque/nota/{id}`), em vez de abrir o modal `ModalDetalhePendencia`.

### Detalhes tecnicos

**Arquivo:** `src/pages/FinanceiroNotasPendencias.tsx`

1. Alterar a funcao `handleVerDetalhes` para usar `navigate(`/estoque/nota/${nota.id}`)` em vez de abrir o dialog
2. Remover o estado `dialogDetalhes` e a conversao `notaParaModalDetalhes` (codigo morto)
3. Remover o componente `ModalDetalhePendencia` do JSX e seu import
4. Manter o modal de pagamento (`ModalFinalizarPagamento`) intacto, pois ele tem funcionalidade propria do financeiro

Dessa forma, ao clicar no olho no Financeiro, o usuario vera exatamente a mesma pagina de detalhes que ve no Estoque, com todas as informacoes, produtos e timeline.

