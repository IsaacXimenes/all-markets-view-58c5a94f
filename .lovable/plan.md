

## Plano: Draft com Modal + Bloqueio Novo + Pagamento no Detalhe + Conferencia Centralizada

### 1. Draft/Rascunho com modal de confirmacao (como VendasNova)

**Arquivo:** `src/pages/EstoqueNotaCadastrar.tsx`

**Situacao atual:** O draft e carregado automaticamente ao abrir a tela, sem perguntar ao usuario. Exibe apenas um banner amarelo.

**Mudanca:**
- Usar o hook `useDraftVenda` (ja existente em `src/hooks/useDraftVenda.ts`) em vez da logica manual de localStorage. Este hook ja possui `getDraftAge`, `formatDraftAge`, `hasDraft`, `loadDraft`, `clearDraft`.
- Ao montar o componente, verificar `hasDraft()`. Se sim, exibir um **Dialog/modal** perguntando se deseja carregar o rascunho (mostrando o tempo salvo via `formatDraftAge`), identico ao de VendasNova.
- NAO carregar o draft automaticamente nos `useState`. Iniciar os campos vazios e so carregar se o usuario clicar "Carregar Rascunho" no modal.
- Manter o auto-save com debounce de 2s (ja existe), usando `saveDraft` do hook.
- Remover a logica manual de `loadDraft`/`salvarDraftSilencioso`/`draftSalvoRecente` e substituir pelo hook.
- O modal tera dois botoes: "Descartar" e "Carregar Rascunho".

### 2. Bloquear "Reportar Defeito" para categoria "Novo" no encaminhamento

**Arquivo:** `src/components/estoque/NotaDetalhesContent.tsx`

**Situacao atual:** `produtosElegiveis` ja filtra `p.categoria !== 'Novo'` (linha 187), portanto produtos "Novo" nao aparecem na lista de encaminhamento. Isso ja esta correto.

**Verificacao:** O filtro na linha 187 ja exclui itens com `categoria === 'Novo'`. Nenhuma mudanca necessaria aqui -- a funcionalidade ja esta implementada.

### 3. Financeiro: Botao "Pagar" abre detalhes da nota com quadro de pagamento

**Arquivo:** `src/pages/FinanceiroNotasPendencias.tsx`

**Situacao atual:** O botao "Pagar" (icone CreditCard na tabela) abre diretamente o modal `ModalFinalizarPagamento`. O detalhamento mostra `NotaDetalhesContent` com `showActions={false}`.

**Mudanca:**
- Alterar `handleAbrirPagamento`: em vez de abrir o modal de pagamento, navegar para o modo de detalhes (`setModoDetalhes(true)`) e marcar uma flag `mostrarPagamento` para exibir o quadro de pagamento abaixo da assistencia tecnica.
- No modo de detalhes, apos a secao de `NotaDetalhesContent`, adicionar uma nova secao com Card de "Pagamento" contendo:
  - Informacoes resumidas (valor total, pago, pendente)
  - Botao "Registrar Pagamento" que abre o `ModalFinalizarPagamento`
  - Historico de pagamentos (ja existe dentro de NotaDetalhesContent, mas sera reforçado)
- A flag `mostrarPagamento` controla se a secao de pagamento aparece visivel e com scroll automatico.

### 4. Remover botao "Conferir Produtos" e centralizar conferencia na tela de detalhes

**Arquivo:** `src/components/estoque/NotaDetalhesContent.tsx`

**Situacao atual:** Existe um botao "Conferir Produtos" que navega para `/estoque/nota/{id}/conferencia`. Na tabela de produtos, as colunas exibem ID, Tipo, Marca, Modelo, IMEI, Qtd, Custo, Status Rec., Status Conf. -- sem coluna de acao.

**Mudanca:**
- Remover o botao "Conferir Produtos" da barra de acoes superiores.
- Adicionar coluna **"Acao"** na tabela de produtos.
- Para produtos com `statusConferencia !== 'Conferido'` e que nao foram encaminhados para assistencia, exibir botao **"Conferir"** (verde) na coluna de acao. Este botao marca o produto como conferido diretamente, sem navegar para outra tela.
- Para produtos que foram encaminhados para assistencia e retornaram (ja tem os botoes Conferir/Recusar na secao de assistencia), manter como esta.
- A logica de conferir um produto individual: atualizar `statusConferencia` para `'Conferido'`, incrementar `qtdConferida` da nota, registrar na timeline. Reutilizar a funcao `finalizarConferencia` ou equivalente de `notaEntradaFluxoApi`.
- Resultado: toda a conferencia (tanto de aparelhos normais quanto de retornos de assistencia) acontece na mesma tela de detalhes.

### Detalhes tecnicos

**Arquivos modificados:**
- `src/pages/EstoqueNotaCadastrar.tsx` -- refatorar draft para usar `useDraftVenda` + modal de confirmacao
- `src/components/estoque/NotaDetalhesContent.tsx` -- remover botao "Conferir Produtos", adicionar coluna de acao com botao "Conferir" na tabela de produtos
- `src/pages/FinanceiroNotasPendencias.tsx` -- alterar "Pagar" para navegar para detalhes com quadro de pagamento

**APIs reutilizadas:**
- `useDraftVenda` de `hooks/useDraftVenda.ts`
- `getNotaEntradaById`, `podeEditarNota` de `notaEntradaFluxoApi`
- Funcoes de conferencia individual ja existentes em `notaEntradaFluxoApi`

