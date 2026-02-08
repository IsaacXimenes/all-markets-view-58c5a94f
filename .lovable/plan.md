

# Plano: Correcao da Migracao de Produtos no Fluxo de Notas de Entrada

## Problema Identificado

A funcao `migrarProdutosConferidosPorCategoria` existe em `notaEntradaFluxoApi.ts` mas **nunca e chamada** por nenhuma pagina do sistema. Isso causa uma falha critica:

- **100% Antecipado**: Apos a conferencia no Estoque, a nota e auto-finalizada mas os produtos **nunca sao migrados** para Estoque > Produtos (novos) ou Aparelhos Pendentes (seminovos). Os produtos ficam "perdidos".
- **Pagamento Pos e Parcial**: Funcionam parcialmente porque a migracao acontece via `FinanceiroConferenciaNotas.tsx` usando o sistema legado (`estoqueApi.ts`). Porem, esse fluxo so cobre notas do sistema antigo (`NotaCompra`), nao as notas criadas pelo novo fluxo (`NotaEntrada`).

## Causa Raiz

Existem dois sistemas rodando em paralelo:

| Sistema | API | Tela | Migracao de Produtos |
|---------|-----|------|---------------------|
| Legado | `estoqueApi.ts` (`NotaCompra`) | `FinanceiroConferenciaNotas.tsx` | Sim - no momento do pagamento |
| Novo | `notaEntradaFluxoApi.ts` (`NotaEntrada`) | `EstoqueNotaConferencia.tsx` | NAO - funcao existe mas nunca e chamada |

## Solucao

Integrar a chamada de `migrarProdutosConferidosPorCategoria` no fluxo de conferencia do Estoque, garantindo que os produtos sejam migrados automaticamente ao concluir a conferencia.

### Arquivo: `src/pages/EstoqueNotaConferencia.tsx`

**Alteracao na funcao `handleSalvarConferencia`:**

Apos chamar `finalizarConferencia()` com sucesso, verificar se a nota atingiu 100% de conferencia. Se sim:

1. Chamar `migrarProdutosConferidosPorCategoria(resultado, responsavel)` para migrar os produtos conferidos
2. A funcao ja usa `ESTOQUE_SIA_LOJA_ID` como default (loja destino fixa)
3. Exibir toast detalhado com quantidades de novos e seminovos migrados

Logica:

```text
handleSalvarConferencia()
  |
  v
finalizarConferencia(nota.id, produtosIds, responsavel)
  |
  v  (se resultado.qtdConferida === resultado.qtdCadastrada)
  |
  migrarProdutosConferidosPorCategoria(notaOriginal, responsavel)
  |
  +--> Novos: migrarAparelhoNovoParaEstoque (loja SIA)
  +--> Seminovos: migrarProdutosNotaParaPendentes (loja SIA)
  |
  v
  Toast com resumo + navegar para /estoque/notas-pendencias
```

**Imports adicionais:**

- `migrarProdutosConferidosPorCategoria` de `notaEntradaFluxoApi`

### Fluxo Corrigido por Tipo de Pagamento

**Pagamento Pos:**
1. Estoque cadastra e confere produtos
2. Ao salvar conferencia 100%: `migrarProdutosConferidosPorCategoria` e chamada (produtos migram)
3. Status muda para "Aguardando Pagamento Final", atuacao vai para Financeiro
4. Financeiro paga e finaliza a nota

**Pagamento Parcial:**
1. Financeiro faz primeiro pagamento
2. Estoque cadastra e confere
3. Ao salvar conferencia 100%: `migrarProdutosConferidosPorCategoria` e chamada (produtos migram)
4. Se saldo pendente: vai para Financeiro para pagamento final
5. Financeiro paga e finaliza

**Pagamento 100% Antecipado:**
1. Financeiro paga 100%
2. Estoque cadastra e confere
3. Ao salvar conferencia 100%: `migrarProdutosConferidosPorCategoria` e chamada (produtos migram)
4. Nota e auto-finalizada (ja estava paga)

### Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/EstoqueNotaConferencia.tsx` | Adicionar chamada a `migrarProdutosConferidosPorCategoria` apos conferencia 100%, com import e toast detalhado |

Esta e uma correcao pontual de 1 arquivo que resolve a falha critica de produtos nao serem migrados no fluxo de notas de entrada do novo sistema.

