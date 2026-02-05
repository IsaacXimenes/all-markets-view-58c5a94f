
# Plano: Correção da Filtragem de Produtos na Nova Venda após Movimentação Matriz

## Problema Identificado

Ao registrar uma **Movimentação Matriz**, o produto é transferido fisicamente para "Loja - Matriz", mas:
- Na tela **Nova Venda**, ao selecionar "Loja - Matriz", os produtos não aparecem
- No modal de seleção, eles ainda mostram "Estoque - SIA"

## Causa Raiz

A filtragem de produtos usa apenas `p.loja` (loja original de cadastro), mas **não considera `p.lojaAtualId`** (localização física atual após Movimentação Matriz).

```typescript
// Lógica atual (incorreta)
if (p.loja !== lojaEstoqueReal) return false;
```

Após Movimentação Matriz:
- `produto.loja = "ESTOQUE_SIA_ID"` (não muda)
- `produto.lojaAtualId = "LOJA_MATRIZ_ID"` (localização física real)

A filtragem precisa usar a localização física efetiva: `lojaAtualId || loja`.

---

## Alterações Necessárias

### 1. VendasNova.tsx - Filtro de Produtos Disponíveis (linha 554)

Atualizar a lógica de filtragem para considerar `lojaAtualId`:

```typescript
// ANTES (linha 551-555)
if (lojaVenda) {
  const lojaEstoqueReal = getLojaEstoqueReal(lojaVenda);
  if (p.loja !== lojaEstoqueReal) return false;
}

// DEPOIS
if (lojaVenda) {
  const lojaEstoqueReal = getLojaEstoqueReal(lojaVenda);
  // Usar localização física efetiva: lojaAtualId (se existir) ou loja original
  const lojaEfetivaProduto = p.lojaAtualId || p.loja;
  if (lojaEfetivaProduto !== lojaEstoqueReal) return false;
}
```

### 2. VendasNova.tsx - Filtro de Produtos de Outras Lojas (linha 574)

Atualizar também a lógica de exclusão:

```typescript
// ANTES (linha 574)
if (p.loja === lojaEstoqueReal) return false;

// DEPOIS
const lojaEfetivaProduto = p.lojaAtualId || p.loja;
if (lojaEfetivaProduto === lojaEstoqueReal) return false;
```

### 3. VendasNova.tsx - Filtro adicional do modal (linha 558)

Atualizar o filtro adicional:

```typescript
// ANTES (linha 558)
if (filtroLojaProduto && p.loja !== filtroLojaProduto) return false;

// DEPOIS
if (filtroLojaProduto) {
  const lojaEfetivaProduto = p.lojaAtualId || p.loja;
  if (lojaEfetivaProduto !== filtroLojaProduto) return false;
}
```

### 4. estoqueApi.ts - Função getProdutosDisponiveisPorLoja (linha 1176)

Atualizar a função de API para também considerar `lojaAtualId`:

```typescript
// ANTES (linha 1170-1178)
export const getProdutosDisponiveisPorLoja = (lojaId: string): Produto[] => {
  const lojaEstoqueReal = getLojaEstoqueReal(lojaId);
  return produtos.filter(p => 
    p.quantidade > 0 && 
    !p.bloqueadoEmVendaId && 
    !p.statusMovimentacao && 
    p.loja === lojaEstoqueReal
  );
};

// DEPOIS
export const getProdutosDisponiveisPorLoja = (lojaId: string): Produto[] => {
  const lojaEstoqueReal = getLojaEstoqueReal(lojaId);
  return produtos.filter(p => {
    if (p.quantidade <= 0) return false;
    if (p.bloqueadoEmVendaId) return false;
    if (p.statusMovimentacao) return false;
    // Usar localização física efetiva
    const lojaEfetivaProduto = p.lojaAtualId || p.loja;
    return lojaEfetivaProduto === lojaEstoqueReal;
  });
};
```

### 5. estoqueApi.ts - Função abaterProdutoDoEstoque (linha 1194)

Atualizar também a lógica de abatimento para considerar localização física:

```typescript
// ANTES (linha 1194)
if (produto.loja === lojaEstoqueReal && produto.quantidade > 0) {

// DEPOIS
const lojaEfetivaProduto = produto.lojaAtualId || produto.loja;
if (lojaEfetivaProduto === lojaEstoqueReal && produto.quantidade > 0) {
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/VendasNova.tsx` | Atualizar filtros `produtosFiltrados` e `produtosOutrasLojas` para usar `lojaAtualId \|\| loja` |
| `src/utils/estoqueApi.ts` | Atualizar `getProdutosDisponiveisPorLoja` e `abaterProdutoDoEstoque` para considerar `lojaAtualId` |

---

## Resultado Esperado

Após as correções:

1. **Nova Venda com Loja - Matriz selecionada**:
   - Produtos que vieram do Estoque - SIA via Movimentação Matriz aparecem na lista
   - Filtro considera a localização física real (`lojaAtualId`)

2. **Modal de Seleção de Produto**:
   - Exibe corretamente a loja atual do produto (usando `lojaAtualId`)
   - Produtos mostram "Loja - Matriz" quando transferidos via Movimentação Matriz

3. **Abatimento de Estoque**:
   - Ao finalizar venda, o sistema reconhece que o produto está fisicamente na Loja - Matriz
   - Abatimento funciona corretamente mesmo para produtos transferidos
