

## Plano: Auto-save de Rascunho + Botoes de Conferir/Recusar na Assistencia da Nota

### 1. Auto-save automatico do rascunho (`src/pages/EstoqueNotaCadastrar.tsx`)

**Situacao atual:** O rascunho so e salvo ao clicar no botao "Salvar Rascunho".

**Mudanca:**
- Adicionar um `useEffect` com debounce (~2 segundos) que salva automaticamente o rascunho no `localStorage` sempre que qualquer campo do formulario mudar (fornecedor, produtos, pagamento, etc.).
- Remover o botao "Salvar Rascunho" da interface.
- Manter o botao "Descartar Rascunho" (aparece somente quando ha draft carregado).
- Exibir um indicador sutil de "Rascunho salvo automaticamente" (texto discreto, sem toast repetitivo).

### 2. Botoes de acao (Conferir / Recusar) na tabela de Assistencia Tecnica (`src/components/estoque/NotaDetalhesContent.tsx`)

**Situacao atual:** A tabela de itens do Lote de Revisao exibe Marca, Modelo, IMEI, Motivo, Status Reparo, Custo Reparo e Parecer, mas sem nenhuma coluna de acao.

**Mudanca:**
- Adicionar coluna **"Acao"** ao final da tabela de itens de assistencia.
- Para cada item cujo status da OS vinculada seja `'Servico Concluido - Validar Aparelho'`:
  - Exibir botao **"Conferir"** (verde) e botao **"Recusar"** (vermelho).
- **Conferir (Aprovar):**
  - Atualiza a OS para status `'Liquidado'` com `proximaAtuacao: '-'`.
  - Incorpora o custo de reparo ao produto no estoque (via `atualizarCustoAssistencia`).
  - Atualiza o item do lote para `statusReparo: 'Concluido'`.
  - Recalcula abatimento e sincroniza nota (`sincronizarNotaComLote`).
  - Registra evento na timeline da nota (retorno + abatimento confirmado).
  - Exibe toast de confirmacao.
- **Recusar:**
  - Abre um modal solicitando o **motivo da recusa** (campo obrigatorio).
  - Atualiza a OS para status `'Retrabalho - Recusado pelo Estoque'` com `proximaAtuacao: 'Tecnico'`.
  - Registra o motivo na timeline da OS.
  - Reverte o item do lote para `statusReparo: 'Em Andamento'`.
  - Registra evento na timeline da nota.
  - Exibe toast informando que a OS foi devolvida para retrabalho.
- Para itens com status diferente de "Validar Aparelho", a coluna exibe "-" ou o status atual (sem botoes).

### 3. Novos estados e modal de recusa (`src/components/estoque/NotaDetalhesContent.tsx`)

- Novos estados: `modalRecusaOpen`, `itemRecusa` (item sendo recusado), `motivoRecusa`.
- Modal de recusa com campo `Textarea` para motivo e botoes Cancelar/Confirmar Recusa.

### Detalhes tecnicos

**Arquivos modificados:**
- `src/pages/EstoqueNotaCadastrar.tsx` -- auto-save com debounce, remover botao manual
- `src/components/estoque/NotaDetalhesContent.tsx` -- coluna de acao, logica de conferir/recusar, modal de recusa

**APIs reutilizadas (sem alteracao):**
- `updateOrdemServico` de `assistenciaApi.ts`
- `atualizarCustoAssistencia`, `getProdutoByIMEI`, `updateProduto` de `estoqueApi.ts`
- `atualizarItemRevisao`, `sincronizarNotaComLote`, `registrarEventoTecnicoNaNota` de `loteRevisaoApi.ts`

**Logica de conferir** replica o comportamento existente em `OSAparelhosPendentes.tsx` (handleAprovar), mas integrado ao contexto da nota para que o usuario nao precise navegar para outra tela.

**Logica de recusar** replica o comportamento existente em `OSAparelhosPendentes.tsx` (handleRecusar), devolvendo a OS ao tecnico com motivo registrado.
