

# Plano - Correcoes no Modulo de Recursos Humanos (2 problemas)

## Problema 1: Modal "Registrar Novo FeedBack" com scroll horizontal

O `DialogContent` do modal de registro (linha 533) usa `max-w-2xl` com `overflow-hidden`, e o `ScrollArea` interno (linha 541) permite scroll vertical. Porem, os elementos internos como o grid de anexos (`grid-cols-2`, linha 627) e os cards de info/timeline podem ultrapassar a largura disponivel em telas menores ou no preview mobile, gerando scroll horizontal indesejado.

**Correcao em `src/pages/RHFeedback.tsx`:**
- Adicionar `overflow-x-hidden` no ScrollArea ou no container interno para impedir scroll horizontal
- Garantir que os elementos internos usem `min-w-0` e `overflow-hidden` para respeitar os limites do container
- Aplicar `w-full` explicito nos containers de grid para forcar confinamento

---

## Problema 2: Adicionar campo "Conta de Saida" no modal de Adiantamentos

O modal de Novo/Editar Adiantamento (linhas 590-704) nao possui campo para selecionar a conta financeira de onde o dinheiro sera retirado. O usuario precisa de um seletor de contas financeiras (usando as contas do cadastroStore).

**Correcao em `src/utils/adiantamentosApi.ts`:**
- Adicionar campo `contaSaidaId: string` na interface `Adiantamento`
- Atualizar os mocks existentes com valores de conta validos (ex: CTA-015 a CTA-019, que sao contas Dinheiro)

**Correcao em `src/pages/RHAdiantamentos.tsx`:**
- Adicionar `contaSaidaId` ao estado do formulario (`formData`)
- Adicionar um campo `Select` ou usar as contas financeiras do `cadastroStore` (via `obterContasFinanceiras()`) para selecionar a conta de saida
- Incluir o campo na validacao de campos obrigatorios
- Exibir a conta na tabela principal (nova coluna "Conta de Saida")
- Incluir no registro de historico de alteracoes ao editar
- Incluir no export CSV

---

## Secao Tecnica

| Arquivo | Alteracoes |
|---------|-----------|
| `src/pages/RHFeedback.tsx` | Adicionar `overflow-x-hidden` e `min-w-0` no ScrollArea do modal de registro para eliminar scroll horizontal |
| `src/utils/adiantamentosApi.ts` | Adicionar campo `contaSaidaId` na interface `Adiantamento` e nos mocks |
| `src/pages/RHAdiantamentos.tsx` | Adicionar campo Select de "Conta de Saida" no modal; nova coluna na tabela; incluir na validacao, historico e CSV |

