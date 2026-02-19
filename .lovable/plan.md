

## Correção: Status "Vendido" incorreto após Retirada de Peças

### Problema Identificado

A função `getStatusAparelho` em `src/utils/estoqueApi.ts` determina o status exibido na aba de aparelhos. A ordem das verificações está errada:

```
Linha 489: quantidade === 0 && statusNota === 'Concluído' -> "Vendido"    (executa primeiro)
Linha 492: statusRetiradaPecas existente                  -> "Retirada de Peças" (nunca alcançado)
```

Quando o desmonte finaliza, ele define `quantidade: 0`, `statusNota: 'Concluído'` e `statusRetiradaPecas: 'Concluída'`. A condição da linha 489 captura primeiro e retorna "Vendido".

### Solucao

Mover a verificacao de `statusRetiradaPecas` para **antes** da verificacao de "Vendido", garantindo que aparelhos desmontados sejam corretamente identificados.

### Detalhes Tecnicos

**Arquivo: `src/utils/estoqueApi.ts`** (unica alteracao)

Reordenar a funcao `getStatusAparelho` (linhas 488-496):

```
Ordem atual (com bug):
1. quantidade === 0 && statusNota === 'Concluído' -> "Vendido"
2. statusMovimentacao === 'Em movimentação' -> "Em movimentação"
3. statusEmprestimo -> "Empréstimo"
4. statusRetiradaPecas -> "Retirada de Peças"     <-- nunca alcancado
5. bloqueadoEmTrocaGarantiaId -> "Reservado para Troca"
6. bloqueadoEmVendaId -> "Bloqueado"
7. fallback -> "Disponível"

Ordem corrigida:
1. statusRetiradaPecas (ativa, nao cancelada) -> "Retirada de Peças"
2. quantidade === 0 && statusNota === 'Concluído' -> "Vendido"
3. (demais verificacoes permanecem iguais)
```

Nenhum outro arquivo precisa ser alterado.

