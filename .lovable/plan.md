

## Plano: Conferir via Assistencia deve contabilizar na conferencia da nota

### Problema
Quando o usuario clica "Conferir" no quadro de Assistencia Tecnica (para aprovar o retorno de um aparelho), o sistema atualiza a OS e o lote de revisao, mas **nao marca o produto como conferido** na nota de entrada. Isso faz com que o progresso de conferencia nao suba (ex: fica 33% em vez de 66% ou 100%).

### Solucao
Adicionar uma chamada a `conferirProdutoSimples` dentro do handler `handleConferirItem` em `NotaDetalhesContent.tsx`. Isso vai:
- Marcar o `statusConferencia` do produto como `'Conferido'`
- Incrementar `qtdConferida` da nota
- Atualizar o status da nota (ex: `Conferencia Parcial` -> `Conferencia Concluida`)
- Registrar na timeline da nota

### Arquivo modificado
- `src/components/estoque/NotaDetalhesContent.tsx`

### Detalhe tecnico
No handler `handleConferirItem` (linha ~245), apos a logica existente de atualizar OS, lote e custos, adicionar:

```
// Conferir produto na nota (contabilizar no progresso)
conferirProdutoSimples(nota.id, item.produtoNotaId, nomeResponsavel);
```

Isso usa o `produtoNotaId` do item do lote para localizar o produto correto na nota e marca-lo como conferido, reutilizando a mesma funcao ja usada pelo botao "Conferir" da tabela de produtos.

