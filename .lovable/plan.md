
# Plano: Substituir IDs brutos por nomes em exibições do sistema

## Problema
Em vários locais do sistema, campos que armazenam IDs de lojas, colaboradores ou fornecedores estao sendo exibidos diretamente na interface ao inves de resolver para seus nomes legíveis. O campo `produto.loja` e `venda.lojaVenda` armazenam IDs como `'db894e7d'` ou `'3ac7e00c'`, mas em alguns componentes sao renderizados sem passar por `obterNomeLoja()`.

## Locais identificados com ID bruto exibido

### 1. `src/pages/EstoqueProdutoDetalhes.tsx` (linha 440)
- **Campo**: `{produto.loja}` -- exibe ID da loja
- **Correção**: Importar `useCadastroStore` e usar `obterNomeLoja(produto.lojaAtualId || produto.loja)`

### 2. `src/pages/VendasNova.tsx` (linha 3484)
- **Campo**: `{produtoDetalhe.loja}` -- exibe ID da loja no modal de detalhes do produto
- **Correção**: Usar `obterNomeLoja(produtoDetalhe.lojaAtualId || produtoDetalhe.loja)` (o `obterNomeLoja` ja esta importado neste arquivo)

### 3. `src/pages/VendasEditar.tsx` (linha 2471)
- **Campo**: `{produtoDetalhe.loja}` -- exibe ID da loja no modal de detalhes do produto
- **Correção**: Importar/usar `obterNomeLoja` do `useCadastroStore` e substituir por `obterNomeLoja(produtoDetalhe.lojaAtualId || produtoDetalhe.loja)`

### 4. `src/pages/EstoqueAcessorios.tsx` (linha 463)
- **Campo**: `{acessorioSelecionado.loja}` -- exibe ID da loja no modal de edição de acessório
- **Correção**: Usar `getLojaNome(acessorioSelecionado.loja)` (o componente ja tem acesso ao `useCadastroStore` com `getLojaNome`)

### 5. `src/pages/FinanceiroFiado.tsx` (linha 314)
- **Campo**: `{venda.lojaVenda}` -- exibe ID da loja na tabela de vendas pendentes de fiado
- **Correção**: Importar `useCadastroStore`, criar helper `obterNomeLoja` e substituir por `obterNomeLoja(venda.lojaVenda)`

### 6. `src/pages/RHSalarioColaborador.tsx` (linha 229)
- **Campo**: `{salario.colaboradorId}` -- exibe ID bruto do colaborador na tabela
- **Nota**: A coluna seguinte ja mostra `salario.colaborador.nome`. O ID pode ser intencional como codigo de referência, mas se o objetivo for remover IDs brutos, pode ser ocultado ou substituído pelo nome

---

## Detalhes Técnicos

### Padrão de correção
Todos os locais seguem o mesmo padrão:
1. Verificar se `useCadastroStore` ja esta importado no componente
2. Se nao, importar e extrair `obterNomeLoja` e/ou `obterNomeColaborador`
3. Substituir `{campo.loja}` por `{obterNomeLoja(campo.lojaAtualId || campo.loja)}`
4. Substituir `{campo.vendedor}` por `{obterNomeColaborador(campo.vendedor)}`

### Arquivos a modificar (6 arquivos)
1. `src/pages/EstoqueProdutoDetalhes.tsx` -- 1 alteração
2. `src/pages/VendasNova.tsx` -- 1 alteração
3. `src/pages/VendasEditar.tsx` -- 1 alteração
4. `src/pages/EstoqueAcessorios.tsx` -- 1 alteração
5. `src/pages/FinanceiroFiado.tsx` -- importar store + 1 alteração
6. `src/pages/RHSalarioColaborador.tsx` -- importar store + substituir ID por nome

### Locais ja corretos (nao precisam de alteração)
- `VendaDetalhes.tsx` -- ja usa `getLojaNome()` e `getColaboradorNome()`
- `Vendas.tsx` -- ja usa `getLojaName()` e `getColaboradorNome()`
- `GarantiasNova.tsx` -- ja usa `obterNomeLoja()` e `obterNomeColaborador()`
- `FinanceiroPagamentosDowngrade.tsx` -- ja usa `obterNomeLoja()` e `obterNomeColaborador()`
- `FinanceiroConferencia.tsx` -- ja usa helpers locais
- `EstoqueAcessorios.tsx` tabela -- ja usa `getLojaNome()` na listagem
- `EstoqueMovimentacoes.tsx` -- ja usa `getLojaNome()` para origem/destino
- `nota.fornecedor` nos módulos de estoque -- armazena nome do fornecedor (nao ID), nao precisa de correção
- Campos `.responsavel` nos timelines -- armazenam nomes, nao IDs
