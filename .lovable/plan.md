

## Simplificacao do Quadro de Pecas, Centralizacao de Devolucao e Rastreabilidade Financeira

### Resumo

Remover o campo editavel "Valor (R$)" do quadro de Pecas/Servicos na OS, reposicionar os campos informativos de referencia. Remover o botao "Confirmar Devolucao" da aba Devolucao do dossie (centralizar no Acerto). Corrigir status de estoque para usar "Devolvida" em vez de "Reservada". Exibir timeline no dossie. Adicionar coluna "OS Vinculada" no detalhamento de notas financeiras.

---

### 1. Remover campo "Valor (R$)" e reposicionar referencias (`src/pages/OSAssistenciaNova.tsx`)

**Linhas 1274-1282**: Remover o bloco do campo "Valor (R$)" (Label + InputComMascara com mascara="moeda").

**Linhas 1229-1261**: Mover os campos "Valor Recomendado" e "Valor de Custo" para ficarem na mesma linha do seletor de peca (dentro do grid principal de 4 colunas). Em vez de aparecerem abaixo do botao de busca, eles ocuparao a 4a coluna (onde estava o "Valor R$"), lado a lado em um grid de 2 colunas compacto.

**Layout resultante da primeira linha do grid:**
- Coluna 1: Origem da Peca (Select)
- Colunas 2-3: Peca/Servico (busca ou input)
- Coluna 4: Valor Recomendado + Valor de Custo (2 campos read-only empilhados ou lado a lado)

Quando a origem nao e "estoque", o campo Valor (R$) editavel tambem deve ser removido - o valor sera calculado apenas via desconto/percentual sobre o valor recomendado ou inserido manualmente no campo existente. **Nota:** Para pecas de fornecedor ou servico terceirizado, manter um campo de valor editavel, pois nao ha referencia de estoque.

**Correcao**: Na verdade, o campo "Valor (R$)" e necessario para pecas que NAO vem do estoque (fornecedor, terceirizado). A remocao deve ser condicional: remover APENAS quando `pecaNoEstoque === true`, pois os valores de referencia ja informam o custo/recomendado. Para as demais origens, manter o campo editavel.

### 2. Remover botao "Confirmar Devolucao" da aba Devolucao (`src/pages/OSConsignacao.tsx`)

**Linhas 428-466** (TabsContent value="devolucao" no dossie): Remover o botao `<Button>Confirmar Devolucao</Button>` (linhas 445-454). Manter a listagem dos itens como somente leitura, exibindo apenas o status atual (Disponivel, Consumido, Devolvido) sem acao. A confirmacao de devolucao fisica ocorrera exclusivamente no fluxo de Acerto de Contas (view "acerto", linhas 585-650).

### 3. Corrigir status "Reservada" para "Devolvida" (`src/utils/pecasApi.ts` + `src/utils/consignacaoApi.ts`)

**Problema:** O tipo `Peca.status` so aceita `'Disponivel' | 'Reservada' | 'Utilizada'`. O requisito pede o status "Devolvida" que nao existe.

**Alteracao em `src/utils/pecasApi.ts` (linha 28):** Adicionar 'Devolvida' ao union type de status:
```
status: 'Disponivel' | 'Reservada' | 'Utilizada' | 'Devolvida';
```

**Alteracao em `src/utils/consignacaoApi.ts`:**
- `iniciarAcertoContas` (linha 207): Manter `updatePeca(item.pecaId, { status: 'Reservada' })` - este e um status intermediario valido durante o acerto.
- `confirmarDevolucaoItem` (linha 246): Trocar `{ status: 'Utilizada', quantidade: 0 }` para `{ status: 'Devolvida', quantidade: 0 }`.

**Alteracao em `src/pages/OSPecas.tsx`:** Adicionar badge visual para o novo status "Devolvida" (cinza, similar ao badge de "Devolvido" na consignacao).

### 4. Exibir Timeline no Dossie (`src/pages/OSConsignacao.tsx`)

**Linhas 354-358**: A timeline ja existe como uma aba separada no dossie (TabsTrigger value="timeline"). O requisito pede que seja exibida diretamente na tela de detalhamento, nao escondida em aba.

**Alteracao:** Mover o conteudo da aba "Timeline" para fora das Tabs, exibindo-o como um Card permanente abaixo das tabs de Inventario e Devolucao. Reduzir as tabs para apenas 2: "Inventario" e "Devolucao". A timeline ficara visivel como uma secao fixa na parte inferior do dossie.

### 5. Coluna "OS Vinculada" no Financeiro (`src/pages/FinanceiroNotasAssistencia.tsx`)

**Linhas 464-478** (secao "Itens Somente Leitura" no Dialog de conferencia): Adicionar a informacao de OS vinculada em cada item. 

**Problema:** A interface `NotaAssistencia.itens` nao possui campo `osId`. Para notas de consignacao, a OS vinculada esta nos itens do lote (`ItemConsignacao.osVinculada`). Para notas regulares, a OS esta em `NotaAssistencia.osId`.

**Solucao:** 
- Para notas de consignacao (`tipoConsignacao === true`): importar `getLoteById` e buscar os itens consumidos do lote, cruzando por `item.descricao` para exibir a OS vinculada de cada peca.
- Para notas regulares: exibir `notaSelecionada.osId` como valor fixo para todos os itens.
- Adicionar a interface `NotaAssistencia.itens` um campo opcional `osVinculada?: string` e preenche-lo no momento da geracao da nota em `consignacaoApi.ts` (`gerarLoteFinanceiro`).

---

### Detalhes Tecnicos

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/OSAssistenciaNova.tsx` | Remover campo "Valor (R$)" quando origem e estoque; mover Valor Recomendado e Valor de Custo para a mesma linha do seletor |
| `src/pages/OSConsignacao.tsx` | Remover botao "Confirmar Devolucao" da aba devolucao do dossie; mover timeline para fora das tabs como secao fixa |
| `src/utils/pecasApi.ts` | Adicionar 'Devolvida' ao union type de status |
| `src/utils/consignacaoApi.ts` | Trocar status de 'Utilizada' para 'Devolvida' em `confirmarDevolucaoItem` |
| `src/pages/OSPecas.tsx` | Adicionar badge para status 'Devolvida' |
| `src/utils/solicitacaoPecasApi.ts` | Adicionar campo opcional `osVinculada` na interface de itens de `NotaAssistencia` |
| `src/utils/consignacaoApi.ts` | Preencher `osVinculada` nos itens ao gerar nota financeira em `gerarLoteFinanceiro` |
| `src/pages/FinanceiroNotasAssistencia.tsx` | Exibir coluna "OS Vinculada" no quadro de itens do dialog de conferencia |

### Sequencia de Implementacao

1. `pecasApi.ts` - Adicionar status 'Devolvida'
2. `consignacaoApi.ts` - Corrigir status na devolucao + preencher osVinculada na nota
3. `solicitacaoPecasApi.ts` - Atualizar interface NotaAssistencia.itens
4. `OSAssistenciaNova.tsx` - Simplificar quadro de pecas
5. `OSConsignacao.tsx` - Remover botao devolucao do dossie + timeline fixa
6. `OSPecas.tsx` - Badge para status Devolvida
7. `FinanceiroNotasAssistencia.tsx` - Coluna OS Vinculada

