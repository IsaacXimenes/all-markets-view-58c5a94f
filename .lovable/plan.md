

# Plano: Correcoes no Fluxo de Notas de Entrada

## Visao Geral

Este plano corrige bugs de exibicao de quantidades e valores, realoca a funcionalidade de "Explodir Itens" para a tela de Conferencia, e ajusta a logica de pagamento parcial.

---

## 1. Correcao da Quantidade (qtdInformada / qtdCadastrada)

### Problema
Quando um produto e cadastrado com `quantidade: 4`, o sistema conta como `1` (uma linha na tabela) ao inves de `4` (total de unidades). Isso ocorre porque `qtdCadastrada = produtosProcessados.length` conta linhas, nao a soma das quantidades.

### Arquivos afetados

**`src/utils/notaEntradaFluxoApi.ts`**
- Na funcao `criarNotaEntrada` (linha ~360): trocar `qtdCadastrada = produtosProcessados.length` por `qtdCadastrada = produtosProcessados.reduce((acc, p) => acc + p.quantidade, 0)`
- Na funcao `cadastrarProdutosNota` (linha ~715): trocar `nota.qtdCadastrada = nota.produtos.length` por `nota.qtdCadastrada = nota.produtos.reduce((acc, p) => acc + p.quantidade, 0)`
- Na mesma logica, `qtdInformada` na criacao (linha ~366) deve usar a soma das quantidades: `dados.qtdInformada || (qtdCadastrada > 0 ? qtdCadastrada : 0)`
- Em `finalizarConferencia` e `conferirProdutoSimples`, o calculo de `qtdConferida` tambem deve somar quantidades: `nota.qtdConferida = nota.produtos.filter(p => p.statusConferencia === 'Conferido').reduce((acc, p) => acc + p.quantidade, 0)`

---

## 2. Correcao da Exibicao de Valor Pago

### Problema
Quando um pagamento parcial e registrado (ex: nota de R$ 2.000, pagamento de R$ 1.000), a tabela mostra "Valor Pago R$ 2.000" ao inves de "R$ 1.000".

### Analise
A tabela em `TabelaNotasPendencias.tsx` (linha 283) ja exibe `nota.valorPago` corretamente. O bug esta na funcao `registrarPagamento`:
- O `valorPago` acumula corretamente (`nota.valorPago += pagamento.valor`)
- Porem, para pagamentos Parciais, quando nao quitou e nao e o primeiro, o sistema "apenas registra" -- mas a logica de atualizacao de `valorPendente` funciona corretamente

A correcao real necessaria: adicionar uma coluna "Saldo Devedor" na tabela para clareza, e verificar se o valor passado ao `registrarPagamento` e o digitado pelo usuario (nao o `valorPendente`).

### Arquivos afetados

**`src/components/estoque/TabelaNotasPendencias.tsx`**
- Adicionar coluna "Saldo Devedor" na tabela, apos "Valor Pago"
- Exibir `formatCurrency(nota.valorPendente)` nesta nova coluna
- Para notas finalizadas, exibir "R$ 0,00" ou um badge "Quitado"

---

## 3. Realocacao de "Explodir Itens" para a Conferencia

### O que muda

**`src/pages/EstoqueNotaCadastrar.tsx`**
- Remover o botao "Gerar Unidades" (icone Layers) e a funcao `explodirItem`
- Remover o import de `Layers`
- Manter o quadro de produtos com campos condicionais (ja implementado)

**`src/pages/EstoqueNotaCadastrarProdutos.tsx`**
- Remover o botao "Gerar Unidades" e a funcao `explodirItem` desta tela tambem

**`src/pages/EstoqueNotaConferencia.tsx`**
- Adicionar o botao "Gerar Unidades" ao lado de itens com `quantidade > 1`
- Implementar funcao `explodirItem` que:
  1. Chama a API para substituir o item agrupado por N linhas individuais (quantidade = 1)
  2. Cada linha herda Tipo, Marca, Modelo, Custo Unitario
  3. Campos IMEI, Cor, Categoria ficam vazios para preenchimento na conferencia
- Adicionar campos editaveis de IMEI, Cor e Categoria inline na tabela de conferencia (para itens explodidos)
- O botao de conferir so fica habilitado quando IMEI, Cor e Categoria estao preenchidos

**`src/utils/notaEntradaFluxoApi.ts`**
- Adicionar funcao `explodirProdutoNota(notaId, produtoId)` que:
  1. Encontra o produto agrupado
  2. Remove-o da lista
  3. Gera N novos produtos individuais (quantidade = 1)
  4. Recalcula `qtdCadastrada` (soma de quantidades, nao muda pois a soma permanece igual)
  5. Registra na timeline

---

## 4. Quadro de Produtos no Lancamento (ja implementado, ajustes menores)

O quadro de produtos com campos condicionais ja esta funcional. Ajustes:

**`src/pages/EstoqueNotaCadastrar.tsx`**
- Sem alteracoes adicionais alem da remocao do "Explodir Itens"

---

## 5. Pagamento Parcial Flexivel (ja implementado, verificacao)

O modal de pagamento parcial ja permite edicao de valor. Verificar:

**`src/pages/FinanceiroNotasPendencias.tsx`**
- Confirmar que `handleFinalizarPagamento` usa `dados.valorPagamento` corretamente (ja implementado na linha 120)

---

## 6. Resumo de Alteracoes por Arquivo

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/utils/notaEntradaFluxoApi.ts` | Modificar | Corrigir contagem de qtd (soma vs length) + nova funcao `explodirProdutoNota` |
| `src/components/estoque/TabelaNotasPendencias.tsx` | Modificar | Adicionar coluna "Saldo Devedor" |
| `src/pages/EstoqueNotaConferencia.tsx` | Modificar | Adicionar "Explodir Itens" + campos editaveis para itens individuais |
| `src/pages/EstoqueNotaCadastrar.tsx` | Modificar | Remover botao e funcao de "Explodir Itens" |
| `src/pages/EstoqueNotaCadastrarProdutos.tsx` | Modificar | Remover botao e funcao de "Explodir Itens" |

---

## 7. Detalhes Tecnicos

### Nova funcao explodirProdutoNota

```typescript
export const explodirProdutoNota = (
  notaId: string,
  produtoId: string,
  usuario: string
): NotaEntrada | null => {
  const nota = notasEntrada.find(n => n.id === notaId);
  if (!nota) return null;

  const produtoIndex = nota.produtos.findIndex(p => p.id === produtoId);
  if (produtoIndex === -1) return null;

  const produto = nota.produtos[produtoIndex];
  if (produto.quantidade <= 1) return null;

  const novasLinhas: ProdutoNotaEntrada[] = Array.from(
    { length: produto.quantidade },
    (_, i) => ({
      id: `${produto.id}-U${String(i + 1).padStart(3, '0')}`,
      tipoProduto: produto.tipoProduto,
      marca: produto.marca,
      modelo: produto.modelo,
      quantidade: 1,
      custoUnitario: produto.custoUnitario,
      custoTotal: produto.custoUnitario,
      statusRecebimento: 'Pendente' as const,
      statusConferencia: 'Pendente' as const
    })
  );

  nota.produtos.splice(produtoIndex, 1, ...novasLinhas);
  // qtdCadastrada nao muda (soma de quantidades permanece igual)

  registrarTimeline(nota, usuario, 'Estoque',
    `Item "${produto.modelo}" explodido em ${produto.quantidade} unidades`,
    nota.status);

  return JSON.parse(JSON.stringify(nota));
};
```

### Correcao de contagem de quantidades

```typescript
// ANTES (errado - conta linhas):
qtdCadastrada = produtosProcessados.length;

// DEPOIS (correto - soma quantidades):
qtdCadastrada = produtosProcessados.reduce((acc, p) => acc + p.quantidade, 0);
```

### Conferencia com campos editaveis

Na tela de conferencia, itens com quantidade = 1 e sem IMEI/Cor/Categoria devem exibir campos editaveis inline (Input para IMEI, Select para Cor e Categoria) para que o conferente preencha antes de marcar como conferido.

