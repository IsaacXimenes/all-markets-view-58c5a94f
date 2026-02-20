

## Marcar pecas nao usadas como "Devolvida" ao finalizar o Acerto

### Contexto

Hoje, a funcao `confirmarDevolucaoItem` ja marca pecas individuais como "Devolvida" no estoque. Porem, ao finalizar o acerto (`finalizarAcerto`), os itens que ainda estao com status "Em Acerto" (sobras nao consumidas) nao sao atualizados -- ficam presos nesse status intermediario tanto no lote quanto no estoque.

O comportamento correto e: ao finalizar o acerto, toda peca que sobrou (status "Em Acerto") deve ser automaticamente marcada como **Devolvida** no estoque (quantidade zero) e no registro do lote.

### Alteracao

**Arquivo: `src/utils/consignacaoApi.ts` -- funcao `finalizarAcerto`**

Adicionar um loop antes de mudar o status do lote para "Pago", que percorre todos os itens com status "Em Acerto" e:
1. Marca o item do lote como "Devolvido" (com data e responsavel)
2. Atualiza a peca no estoque para `status: 'Devolvida'` e `quantidade: 0`
3. Registra na timeline a devolucao automatica

```text
finalizarAcerto(loteId)
  |
  +-- Para cada item com status "Em Acerto":
  |     - item.status = 'Devolvido'
  |     - item.dataDevolucao = agora
  |     - updatePeca(pecaId, { status: 'Devolvida', quantidade: 0 })
  |
  +-- lote.status = 'Pago'
  +-- Timeline: "Acerto finalizado..."
```

Apenas 1 arquivo sera alterado.
