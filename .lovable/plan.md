
## Plano de Implementacao - Ajustes Financeiro e Vendas

Este plano abrange 5 frentes de trabalho nos modulos Financeiro e Vendas.

---

### 1. Central de Despesas: Lancamento Recorrente Automatico e Encerramento

**Problema atual**: Ao salvar uma despesa recorrente mensal, o sistema so cria a proxima competencia quando o usuario paga a despesa atual e confirma o provisionamento. Nao ha opcao para encerrar a recorrencia.

**Solucao**:

**1.1 Lancamento automatico da proxima competencia**
- **Arquivo**: `src/pages/FinanceiroCentralDespesas.tsx` (funcao `handleLancar`)
- Ao salvar uma despesa com `recorrente: true` e `periodicidade: 'Mensal'` (ou Trimestral/Anual), o sistema chamara `provisionarProximoPeriodo` automaticamente apos o `addDespesa`, criando a proxima competencia com status "A vencer".

**1.2 Encerrar Recorrencia**
- **Arquivo**: `src/utils/financeApi.ts` - Adicionar campo `recorrenciaEncerrada?: boolean` e `dataEncerramentoRecorrencia?: string` na interface `Despesa`. Criar funcao `encerrarRecorrencia(id, dataEncerramento)`.
- **Arquivo**: `src/pages/FinanceiroCentralDespesas.tsx`:
  - Adicionar botao "Encerrar Recorrencia" (icone XCircle) nas acoes de despesas com `recorrente: true` e `status !== 'Pago'`.
  - Modal de confirmacao com campo de data de encerramento.
  - Ao confirmar, marca `recorrenciaEncerrada: true` e impede futuros provisionamentos automaticos.
  - Manter lancamentos ja criados intactos.

---

### 2. Teto Bancario: Filtros de Loja e Conta Financeira

**Problema atual**: A aba Teto Bancario so filtra por mes/ano. Nao ha filtros por loja ou conta especifica.

**Solucao**:
- **Arquivo**: `src/pages/FinanceiroTetoBancario.tsx`
  - Adicionar estados `filtroLoja` e `filtroConta` no componente.
  - Na area de filtros (Card de Periodo, linhas 562-598), adicionar:
    - AutocompleteLoja para filtro por loja
    - Select de Conta Financeira (populado com `contasFinanceiras`)
  - Na logica de `saldosPorConta` e nos cards de contas, aplicar os filtros:
    - Se `filtroLoja` definido, exibir apenas contas vinculadas aquela loja.
    - Se `filtroConta` definido, exibir apenas aquela conta especifica.
  - Aplicar os mesmos filtros na aba Emissao-NFE.

---

### 3. Gestao de Dinheiro por Loja

**Problema atual**: Existe um card unico "Caixa Dinheiro" consolidado. Nao ha visualizacao por loja individual.

**Solucao**:
- **Arquivo**: `src/pages/FinanceiroTetoBancario.tsx`
  - Substituir o card unico de "Caixa Dinheiro" por um grid de cards, um por loja ativa.
  - Para cada loja, calcular o total de pagamentos em dinheiro de vendas finalizadas no periodo cujo `lojaVenda` corresponda aquela loja.
  - Card por loja exibindo: nome da loja, saldo em dinheiro, quantidade de vendas em dinheiro.
  - Manter o totalizador geral abaixo dos cards individuais.

---

### 4. Persistencia de Acessorios e Garantias na Edicao (Conferencias)

**Problema atual**: Acessorios e garantias estendidas lancados na Nova Venda podem desaparecer ao editar a venda nas conferencias.

**Solucao**:
- **Arquivo**: `src/pages/VendasEditar.tsx`
  - Verificar que ao carregar a venda via `getVendaById` ou `getVendaComFluxo`, os campos `acessorios` e `garantias` sao corretamente mapeados para o estado local do componente.
  - Garantir que `updateVenda` persiste esses campos sem sobrescreve-los com arrays vazios.
- **Arquivo**: `src/pages/VendasConferenciaGestorDetalhes.tsx`
  - Ja exibe acessorios (linhas 129-131). Verificar se `dadosVenda.acessorios` chega preenchido.
- **Arquivo**: `src/utils/fluxoVendasApi.ts` / `src/utils/vendasApi.ts`
  - Auditar as funcoes de persistencia para garantir que `acessorios` e `garantiasEstendidas` sao salvos e carregados em todas as etapas do fluxo (localStorage keys).

---

### 5. Redimensionamento do Quadro de Conferencia do Gestor

**Problema atual**: O quadro lateral de conferencia nao ocupa 100% da altura disponivel.

**Solucao**:
- **Arquivo**: `src/pages/VendasConferenciaGestorDetalhes.tsx`
  - No container lateral (coluna direita, linha 184), adicionar classes `sticky top-4` e `h-fit` para que acompanhe o scroll.
  - Alternativamente, usar `min-h-[calc(100vh-12rem)]` no container lateral para que ocupe a altura total da area visivel.

---

### 6. Unificacao do Fluxo de Venda Balcao

**Problema atual**: A Venda Balcao (`VendasAcessorios.tsx`) atualmente apenas subtrai estoque e navega para `/vendas`. Nao chama `addVenda` nem `inicializarVendaNoFluxo`, portanto a venda NAO passa pelas conferencias (Lancamento, Gestor, Financeiro) e NAO gera registros de pagamento no fluxo financeiro.

**Solucao**:
- **Arquivo**: `src/pages/VendasAcessorios.tsx` (funcao `handleConfirmarVenda`, linhas 399-415)
  - Importar `addVenda` de `vendasApi` e `inicializarVendaNoFluxo` de `fluxoVendasApi`.
  - Ao confirmar a venda, chamar `addVenda` com os dados do formulario (cliente, loja, vendedor, acessorios como itens, pagamentos, etc.), seguido de `inicializarVendaNoFluxo` para inserir a venda no pipeline de conferencias.
  - Marcar a venda com `tipoVenda: 'Balcão'` para diferenciar nas conferencias.
  - A venda passara entao por: Conferencia Lancamento -> Conferencia Gestor -> Conferencia Financeiro -> Finalizado, exatamente como uma venda de aparelho.
  - O financeiro ao finalizar gerara os pagamentos via `criarPagamentosDeVenda` e atualizara o fluxo de caixa.

---

### Resumo de Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/financeApi.ts` | Campos `recorrenciaEncerrada`, `dataEncerramentoRecorrencia` na interface Despesa; funcao `encerrarRecorrencia` |
| `src/pages/FinanceiroCentralDespesas.tsx` | Auto-provisionamento ao lancar; botao e modal "Encerrar Recorrencia" |
| `src/pages/FinanceiroTetoBancario.tsx` | Filtros por Loja e Conta; cards de dinheiro por loja |
| `src/pages/VendasAcessorios.tsx` | Integracao com `addVenda` + `inicializarVendaNoFluxo` |
| `src/pages/VendasConferenciaGestorDetalhes.tsx` | Layout lateral fullheight |
| `src/pages/VendasEditar.tsx` | Auditoria de persistencia de acessorios/garantias |
| `src/utils/vendasApi.ts` / `src/utils/fluxoVendasApi.ts` | Auditoria de campos acessorios/garantias no fluxo |
