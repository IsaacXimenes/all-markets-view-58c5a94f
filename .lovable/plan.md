

## Plano: Ajustes Consignacao + Fornecedor no Estoque + Origem no Financeiro

### 1. Autocomplete no campo "Modelo" no Novo Lote (1.1)

**Arquivo:** `src/pages/OSConsignacao.tsx`

**Situacao atual:** O campo Modelo no formulario de novo lote ja usa Popover + Command com `produtosCadastro` (linhas 449-470). Isso ja funciona como autocomplete.

**Verificacao:** Ja implementado. Nenhuma mudanca necessaria.

---

### 2. Botao "$" nao deve abrir quadro de edicao (1.2)

**Arquivo:** `src/pages/OSConsignacao.tsx`

**Situacao atual:** O botao "$" chama `handleVerDetalhamento(lote, true, true)` que abre o detalhamento com `detalhamentoReadOnly=true` e `modoPagamento=true`. Porem, o quadro "Editar Itens do Lote" so aparece quando `!detalhamentoReadOnly && loteAberto` (linha 578), entao ja esta correto -- o quadro de edicao NAO aparece no modo pagamento.

**Mudanca necessaria:** Quando `modoPagamento=true`, a aba padrao das Tabs deve ser "pecas-usadas" em vez de "inventario", e os quadros "Finalizar Lote" e "Confirmar Devolucoes" nao devem aparecer. Alterar o `defaultValue` das Tabs para ser condicional.

---

### 3. Quadros Finalizar Lote e Devolucoes so na aba Inventario (1.3)

**Arquivo:** `src/pages/OSConsignacao.tsx`

**Situacao atual:** Os quadros "Finalizar Lote" (linhas 803-898) estao dentro do `TabsContent value="inventario"`, entao ja so aparecem na aba Inventario.

**Problema:** Precisa controlar via estado da aba ativa para garantir que na aba "pecas-usadas" esses quadros estejam ocultos. Como ja estao dentro de `TabsContent value="inventario"`, isso ja funciona. Nenhuma mudanca necessaria.

---

### 4. Automacao do status de pagamento (1.4)

**Arquivo:** `src/utils/solicitacaoPecasApi.ts`

**Situacao atual:** A funcao `finalizarNotaAssistencia` ja chama `confirmarPagamentoPorNotaId` (linhas 637-645), que por sua vez atualiza o status do item consignado para "Pago" e registra na timeline. A automacao JA ESTA implementada.

**Verificacao adicional:** O comprovante do financeiro nao esta sendo passado na chamada (linha 643: `undefined`). Alterar para passar o comprovante do pagamento quando disponivel. Isso requer propagar o `comprovante` da `finalizarNotaAssistencia` para a chamada `confirmarPagamentoPorNotaId`.

**Mudanca:**
- Na funcao `finalizarNotaAssistencia`, extrair o comprovante dos dados de pagamento (se houver) e passa-lo como 4o parametro de `confirmarPagamentoPorNotaId`.
- Adicionar `comprovante` a interface de dados de `finalizarNotaAssistencia`.

---

### 5. Trava de fechamento de lote (1.5)

**Arquivo:** `src/pages/OSConsignacao.tsx`

**Situacao atual:** O botao "Finalizar Lote" esta sempre habilitado quando o lote nao esta concluido (linha 804-898).

**Mudanca:**
- Calcular se ha itens com status `'Em Pagamento'` (pagamento pendente no financeiro).
- Se houver itens "Em Pagamento", desabilitar o botao "Finalizar Lote" e exibir tooltip/mensagem explicando que ha pagamentos pendentes.
- Manter habilitado se so houver itens "Disponivel" (para devolucao) ou "Pago"/"Consumido".
- Adicionar confirmacao individual para cada item devolvido: na acao de finalizar, exibir lista de itens disponiveis com checkbox individual para confirmar devolucao de cada um.

---

### 6. Coluna Fornecedor no Estoque > Assistencia (2.1)

**Arquivo:** `src/pages/OSPecas.tsx` e `src/utils/pecasApi.ts`

**Situacao atual:** A interface `Peca` nao tem campo `fornecedorId`. Para pecas de consignacao, o fornecedor pode ser recuperado via `loteConsignacaoId` -> `getLoteById` -> `fornecedorId`. Para pecas de solicitacao/nota de compra, o fornecedor pode ser recuperado via `notaCompraId` ou pela solicitacao vinculada.

**Mudanca:**
- Adicionar campo opcional `fornecedorId?: string` a interface `Peca` em `pecasApi.ts`.
- Ao criar pecas via consignacao (`criarLoteConsignacao`), preencher o `fornecedorId` com o do lote.
- Ao criar pecas via solicitacao de pecas, preencher o `fornecedorId` com o da solicitacao.
- Na tabela de `OSPecas.tsx`, adicionar coluna "Fornecedor" entre "Modelo" e "Valor Custo".
- Usar `getFornecedores()` para resolver o nome do fornecedor a partir do ID.
- Como fallback, para pecas de consignacao sem `fornecedorId`, buscar via `getLoteById(peca.loteConsignacaoId)?.fornecedorId`.

---

### 7. Origem do Servico no Financeiro (3.1)

**Arquivo:** `src/pages/FinanceiroNotasAssistencia.tsx`

**Situacao atual:** A nota de assistencia (`NotaAssistencia`) nao tem campo `origemEntrada`. Porem, as solicitacoes vinculadas (`SolicitacaoPeca`) possuem `origemEntrada` (Balcao/Garantia/Estoque).

**Mudanca:**
- Na tabela de notas pendentes, adicionar coluna "Origem" que resolva a origem do servico:
  - Para notas normais: buscar a solicitacao vinculada (`getSolicitacaoById`) e usar `origemEntrada`.
  - Para notas de consignacao: buscar os itens do lote e resolver via OS vinculada.
- Exibir como Badge colorido (Balcao = azul, Garantia = laranja, Estoque = verde).
- Tambem exibir no modal de detalhes/conferencia da nota.

---

### Resumo de arquivos a modificar

1. **`src/pages/OSConsignacao.tsx`** -- Tabs defaultValue condicional (modo pagamento), trava "Finalizar Lote" para pagamentos pendentes, confirmacao individual de devolucoes
2. **`src/utils/pecasApi.ts`** -- Adicionar `fornecedorId` a interface Peca
3. **`src/utils/consignacaoApi.ts`** -- Passar `fornecedorId` ao criar pecas
4. **`src/pages/OSPecas.tsx`** -- Coluna Fornecedor na tabela
5. **`src/utils/solicitacaoPecasApi.ts`** -- Passar comprovante na automacao de pagamento consignado
6. **`src/pages/FinanceiroNotasAssistencia.tsx`** -- Coluna Origem do Servico na tabela e no modal

### Detalhes tecnicos

**Trava de fechamento (item 5):**
```
const temPagamentoPendente = loteSelecionado.itens.some(i => i.status === 'Em Pagamento');
// Botao desabilitado quando temPagamentoPendente
```

**Fornecedor na Peca (item 6):**
```typescript
// pecasApi.ts - interface Peca
fornecedorId?: string;

// consignacaoApi.ts - criarLoteConsignacao
const pecaCriada = addPeca({
  ...
  fornecedorId: dados.fornecedorId, // NOVO
});
```

**Origem no Financeiro (item 7):**
```typescript
// Resolver origem a partir da solicitacao
const sol = getSolicitacaoById(nota.solicitacaoId);
const origem = sol?.origemEntrada || 'N/A';
```

