

# Plano: Corrigir Localização de Produtos na Movimentação Matriz e Conferência Automática via Venda

## Problemas Identificados

### 1. Exibição de loja errada no modal de produtos
Na tela de vendas, ao exibir a loja de um produto, o sistema usa `obterNomeLoja(produto.loja)` -- ou seja, a loja de **cadastro original** (ex: "Estoque - SIA"). Porém, quando um produto foi transferido via Movimentação Matriz, o campo `lojaAtualId` contém a localização física real ("Loja - Matriz"). O sistema ignora esse campo na exibição.

### 2. Pool compartilhado Matriz/Online precisa ser corrigido
Atualmente `getLojasPorPoolEstoque` para Loja Matriz retorna `[Matriz, Online]`, permitindo que vendedores da Matriz vejam produtos da Online. O correto é que vendedores da **Matriz** vejam apenas produtos da Matriz (e os transferidos do SIA para lá), **sem** incluir produtos registrados na Online.

O compartilhamento deve ser **unidirecional**: somente vendas da Loja Online podem ver o estoque da Matriz. A Matriz não deve ver o estoque da Online.

### 3. Conferência automática não é acionada ao registrar venda
A função `conferirItensAutomaticamentePorVenda` existe e funciona, mas só é chamada quando alguém abre a tela de detalhes da movimentação. Quando uma venda é registrada com um produto que pertence a uma movimentação matriz ativa, a conferência deveria ocorrer imediatamente (mover o aparelho de "Enviado" para "Vendido" na movimentação).

---

## Alterações Planejadas

### 1. `src/utils/estoqueApi.ts` - Corrigir pool e criar conferência no ato da venda

**a) Ajustar `getLojasPorPoolEstoque`**: tornar o compartilhamento unidirecional
- Loja Online retorna `[Online, Matriz]` (pode ver estoque da Matriz)
- Loja Matriz retorna apenas `[Matriz]` (NÃO ve estoque da Online)
- Qualquer outra loja retorna `[propria]`

**b) Criar função `conferirProdutoMovimentacaoMatrizPorVenda(produtoId, vendaId, vendedorId, vendedorNome)`**: 
- Verifica se o produto tem `movimentacaoId` ativo
- Se sim, marca o item como "Vendido" na movimentação, registra a venda e o vendedor
- Adiciona entrada na timeline da movimentação
- Verifica se todos os itens foram finalizados e atualiza status da movimentação

### 2. `src/pages/VendasNova.tsx` - Exibir loja efetiva e integrar conferência

**a) Corrigir exibição da loja** em todas as ocorrências do modal de produtos:
- De: `obterNomeLoja(produto.loja)` 
- Para: `obterNomeLoja(produto.lojaAtualId || produto.loja)`
- Linhas afetadas: ~1334, ~1374, ~2809, ~2853, ~2912

**b) Integrar conferência automática** na função `handleConfirmarVenda`:
- Após registrar a venda, para cada item vendido que tenha `movimentacaoId`, chamar a nova função de conferência automática
- Isso move automaticamente o aparelho de "pendente de devolução" para "conferido/vendido" na aba de Movimentação Matriz

### 3. `src/pages/VendasFinalizarDigital.tsx` - Mesmas correções

**a) Corrigir exibição da loja** no modal de produtos:
- Mesma alteração: `obterNomeLoja(produto.lojaAtualId || produto.loja)`

**b) Integrar conferência automática** no fluxo de finalização da venda digital

---

## Detalhes Técnicos

### Nova função de conferência no ato da venda

```text
conferirProdutoMovimentacaoMatrizPorVenda(
  produtoId: string,
  vendaId: string, 
  vendedorId: string,
  vendedorNome: string
) => { sucesso: boolean }
```

Lógica:
1. Buscar o produto por ID
2. Se `produto.movimentacaoId` existe, buscar a movimentação
3. Encontrar o item correspondente na movimentação
4. Marcar como `statusItem: 'Vendido'`, registrar `vendaId`, `vendedorId`, `vendedorNome`, `conferenciaAutomatica: true`
5. Adicionar timeline entry
6. Verificar se movimentação completa e finalizar se necessário
7. Limpar `produto.movimentacaoId` após conferência

### Alteração no pool de estoque

```text
// Antes:
getLojasPorPoolEstoque(Matriz) => [Matriz, Online]  
getLojasPorPoolEstoque(Online) => [Matriz, Online]

// Depois:
getLojasPorPoolEstoque(Matriz) => [Matriz]           // Unidirecional
getLojasPorPoolEstoque(Online) => [Matriz, Online]    // Online acessa Matriz
```

### Fluxo completo corrigido

1. Estoquista cria Movimentação Matriz: produtos saem do SIA, `lojaAtualId` = Matriz
2. Vendedor da Matriz abre Nova Venda: vê produtos com `lojaAtualId = Matriz` mostrando "Loja - Matriz"
3. Vendedor seleciona o aparelho e registra a venda
4. Sistema automaticamente marca o aparelho como "Vendido" na movimentação matriz
5. Na aba Movimentações Matriz, o aparelho aparece em "Conferidos" com link para a venda

