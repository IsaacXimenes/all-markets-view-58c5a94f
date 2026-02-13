

# Correcao - Retirada de Pecas nao registra pecas e soma incorreta

## Causa Raiz

As funcoes `adicionarPecaRetirada` (linha 290-320) e `removerPecaRetirada` (linha 322-349) em `src/utils/retiradaPecasApi.ts` estao **sem instrucao `return`**. Ambas declaram retorno do tipo `{ sucesso: boolean; mensagem: string; retirada?: RetiradaPecas }`, mas o codigo termina apos o push do log de auditoria sem retornar nada.

Consequencia: na tela de detalhes (`AssistRetiradaPecasDetalhes.tsx`, linha 170), o `if (resultado.sucesso)` avalia `undefined` como falso, entao o toast de sucesso nunca aparece, o modal nao fecha e o `carregarDados()` nunca e chamado. A peca e adicionada internamente na API mock, mas a UI nao recarrega os dados, por isso a tabela e a soma ficam desatualizadas.

## Correcao

Adicionar `return { sucesso: true, mensagem: '...', retirada }` ao final de ambas as funcoes em `src/utils/retiradaPecasApi.ts`:

1. **`adicionarPecaRetirada`** (linha ~320): adicionar `return { sucesso: true, mensagem: 'Peca adicionada com sucesso', retirada };` antes do fechamento da funcao.

2. **`removerPecaRetirada`** (linha ~349): adicionar `return { sucesso: true, mensagem: 'Peca removida com sucesso', retirada };` antes do fechamento da funcao.

## Impacto

Com o retorno correto:
- O botao "Adicionar Peca" vai registrar a peca, fechar o modal e recarregar a tabela
- A soma do valor das pecas sera recalculada automaticamente via `carregarDados()` que chama `validarCustoRetirada`
- O card de "Prejuizo na Desmontagem" atualizara corretamente
- A remocao de pecas tambem funcionara e atualizara a soma

## Secao Tecnica

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/retiradaPecasApi.ts` | Adicionar return statements em `adicionarPecaRetirada` (linha 320) e `removerPecaRetirada` (linha 349) |

