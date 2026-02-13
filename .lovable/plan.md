

## Detalhes da Nota em Tela Cheia (sem modal)

### Objetivo
Substituir o modal de detalhes por uma visualizacao full-screen inline. Ao clicar no olho, a listagem de notas e substituida pelo conteudo de detalhes da nota, com um botao "Voltar" para retornar a listagem.

### Abordagem

Usar um estado `notaDetalhes` no componente `FinanceiroNotasPendencias.tsx`. Quando preenchido, ao inves de renderizar os cards de resumo, filtros e tabela, renderiza o componente `NotaDetalhesContent` em tela cheia dentro do `FinanceiroLayout`, com um botao "Voltar" no topo.

### Detalhes tecnicos

**Arquivo:** `src/pages/FinanceiroNotasPendencias.tsx`

1. Remover o `Dialog` de detalhes e o estado `dialogDetalhes`
2. Remover imports de `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `ScrollArea`
3. Manter o estado `notaSelecionada` para controlar a visualizacao
4. Adicionar estado `modoDetalhes` (boolean) - quando true, exibe detalhes full-screen
5. No `handleVerDetalhes`: setar a nota e ativar `modoDetalhes = true`
6. No JSX: condicional - se `modoDetalhes && notaSelecionada`, renderizar:
   - Botao "Voltar" com seta (ArrowLeft) que reseta `modoDetalhes = false`
   - `NotaDetalhesContent` com `showActions={false}` ocupando toda a area
7. Caso contrario, renderizar o conteudo normal (cards, filtros, tabela)

Resultado: ao clicar no olho, a tela inteira muda para mostrar os detalhes da nota (mesma visao do Estoque), e o botao "Voltar" retorna a listagem.

