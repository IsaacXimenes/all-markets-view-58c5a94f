

# Plano: 4 Correções no Módulo de Garantia

## 1. Ordenar coluna Data Abertura (mais nova para mais velha)

**Problema**: `dadosFiltrados` em `GarantiasEmAndamento.tsx` não tem ordenação. Os registros aparecem na ordem de inserção do array.

**Correção**: Adicionar `.sort()` ao final de `dadosFiltrados` (useMemo), ordenando por `tratativa.dataHora` em ordem decrescente (mais recente primeiro).

**Arquivo**: `src/pages/GarantiasEmAndamento.tsx` (~linha 128)

---

## 2. OS de "Assistência + Empréstimo" deve ir para Análise de Tratativas primeiro

**Problema**: Em `processarTratativaGarantia` (garantiasApi.ts, linha 975), a OS é criada com `status: 'Aguardando Análise'` e inserida diretamente no array de ordens de serviço via `addOrdemServico`. A aba "Nova Assistência" (`OSAssistencia.tsx`) mostra todas as OS incluindo as com status "Aguardando Análise". Porém, a aba "Análise de Tratativas" (`OSAnaliseGarantia.tsx`) busca dados de `getRegistrosAnaliseGarantia()`, que usa registros separados. A OS criada por garantia não gera um registro de análise, então não aparece na aba correta.

**Correção**: Em `processarTratativaGarantia`, após criar a OS para "Assistência + Empréstimo", chamar `encaminharParaAnaliseGarantia()` (que já existe e é usada para "Troca Direta"). Isso criará o registro na aba de Análise de Tratativas. Adicionalmente, a OS deve ser criada com um status intermediário como `'Aguardando Aprovação Análise'` para que NÃO apareça na lista da aba "Nova Assistência" até ser aprovada pela análise.

**Arquivo**: `src/utils/garantiasApi.ts` (~linha 970-1000)

---

## 3. Aparelho emprestado não fica com status "Empréstimo - Garantia"

**Problema**: Na função `aprovarTratativa` (garantiasApi.ts, linha 764), o `updateProduto` define `statusEmprestimo: 'Empréstimo - Assistência'`. Porém, a tratativa precisa ser aprovada primeiro (status "Aguardando Aprovação"). O fluxo está correto -- a marcação só ocorre após aprovação. O problema pode ser:
  - (a) O `updateProduto` não persiste em localStorage (estoque é in-memory), então ao recarregar a página o status se perde
  - (b) O campo `statusEmprestimo` não é reconhecido pela interface `Produto`

**Correção**: Verificar que `updateProduto` persiste as alterações e que o campo é incluído na interface. Se o estoque usa localStorage, verificar que o save é chamado. Caso contrário, garantir que o campo seja setado corretamente e exibido no estoque.

**Arquivo**: `src/utils/estoqueApi.ts` (verificar persistência de `updateProduto`)

---

## 4. "Nota de venda não encontrada para esta garantia" na Troca Direta

**Problema**: Em `GarantiasEmAndamento.tsx` (linha 474-483), ao clicar "Gerar Nota", o código busca a venda com:
```text
vendas.find(v => v.origemVenda === 'Troca Garantia' && v.observacoes?.includes(garantia.id))
```
A venda é criada dentro de `aprovarTratativa` via `addVenda()`. Porém, logo após a aprovação, `handleAprovarTratativa` (linha 190) chama `window.location.reload()`. O módulo de vendas (`vendasApi.ts`) usa dados **in-memory** sem persistência em localStorage, então ao recarregar a página, a venda criada na aprovação é perdida.

**Correção**: Adicionar persistência localStorage ao array de vendas em `vendasApi.ts`. Após cada `addVenda`, salvar o array em localStorage. Na inicialização, carregar de localStorage. Isso garante que a venda de garantia sobreviva ao reload da página.

**Arquivo**: `src/utils/vendasApi.ts` (adicionar load/save localStorage para o array `vendas`)

---

## Detalhes Técnicos

### Arquivo 1: `src/pages/GarantiasEmAndamento.tsx`
- Adicionar `.sort()` ao `dadosFiltrados` por data decrescente

### Arquivo 2: `src/utils/garantiasApi.ts`
- Em `processarTratativaGarantia`, adicionar chamada `encaminharParaAnaliseGarantia()` para tipo "Assistência + Empréstimo" (assim como já é feito para "Troca Direta")
- Criar OS com status que indique que ainda precisa passar pela análise

### Arquivo 3: `src/utils/estoqueApi.ts`
- Verificar e garantir que `updateProduto` persiste campos como `statusEmprestimo` em localStorage

### Arquivo 4: `src/utils/vendasApi.ts`
- Adicionar `saveToStorage` após `vendas.push()` em `addVenda`
- Inicializar `vendas` com `loadFromStorage('vendas_data', defaultVendas)` no topo do módulo
- Garantir que `vendaCounter` também seja persistido

### Sequência de Implementação
1. Ordenação da tabela (mais simples)
2. Persistência de vendas no localStorage (resolve nota não encontrada)
3. Registro de análise para Assistência + Empréstimo
4. Verificação de persistência do status de empréstimo no estoque

