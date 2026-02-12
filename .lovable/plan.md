

# Plano - Melhorias no Modulo de Assistencia (6 itens)

## 1. Origem da Compra "Thiago Imports" - Campo ID da Venda Antiga

**Arquivo:** `src/pages/OSAssistenciaNova.tsx`

- Adicionar novo estado `idVendaAntiga` (string)
- Quando `origemAparelho === 'Thiago Imports'`, exibir um campo de texto `Input` rotulado "ID da Venda Antiga" logo abaixo do bloco informativo verde
- O campo sera um input livre (type="text") para o usuario inserir o ID do sistema antigo
- Persistir o valor no rascunho (draft) e na OS criada via campo customizado `idVendaAntiga` no objeto da OS
- Na tela de edicao (`OSAssistenciaEditar.tsx`) e detalhes (`OSAssistenciaDetalhes.tsx`), exibir o campo quando preenchido

**Arquivo:** `src/utils/assistenciaApi.ts` - Adicionar campo opcional `idVendaAntiga?: string` na interface `OrdemServico`

---

## 2. Persistencia de Dados na Transicao (Analise de Tratativas -> Nova Assistencia)

**Problema atual:** A tela `OSAnaliseGarantia.tsx` cria a OS diretamente via `addOrdemServico` com `clienteId: ''` (vazio), sem passar dados do cliente nem do aparelho para a Nova Assistencia. Nao ha navegacao para a tela de Nova Assistencia com parametros.

**Correcao em `src/pages/OSAnaliseGarantia.tsx`:**
- Em vez de chamar `addOrdemServico` diretamente no `handleConfirmarAprovacao`, alterar o fluxo para:
  1. Aprovar o registro (chamar `aprovarAnaliseGarantia`)
  2. Atualizar o `statusGeral` do produto pendente
  3. Navegar para `/os/assistencia/nova` passando query params relevantes: `?analiseId={registroId}&origemAnalise=true`
  4. Remover a criacao automatica da OS nesta tela

**Correcao em `src/pages/OSAssistenciaNova.tsx`:**
- Detectar o parametro `analiseId` via `useSearchParams`
- Buscar os dados do registro de analise via `getRegistrosAnaliseGarantia()` para encontrar `origemId`, `origem`, `clienteDescricao`
- Se `origem === 'Garantia'`, buscar a garantia completa via `getGarantiaById(origemId)` para obter `clienteId`, `modelo`, `imei`, `lojaVenda`
- Pre-preencher os campos (cliente, modelo, IMEI, loja, setor) e bloquear os que vierem da origem

---

## 3. Quadro de Pecas/Servicos Editavel (modelo Nova Garantia)

**Problema:** O quadro atual de Pecas/Servicos na Nova Assistencia ja e editavel (adicionar, remover, modificar itens). A solicitacao pode se referir a replicar a flexibilidade de edicao inline que existe na Nova Garantia Manual.

**Acao:** O quadro atual ja suporta adicionar/remover/editar pecas com campos de valor, desconto, fornecedor, estoque e servico terceirizado. Validar que todas as acoes de edicao (alterar nome, valor, desconto, checkboxes) estao funcionais. Nenhuma alteracao estrutural necessaria - o quadro ja e editavel.

---

## 4. Quadro de Pagamentos - Replicar PagamentoQuadro da Nova Venda

**Problema:** O quadro de pagamentos na Nova Assistencia e simplificado (apenas meio, valor, parcelas), enquanto a Nova Venda usa o componente `PagamentoQuadro` completo com taxas de cartao, conta destino, maquina, comprovante, calculo de liquido, etc.

**Correcao em `src/pages/OSAssistenciaNova.tsx`:**
- Importar o componente `PagamentoQuadro` de `@/components/vendas/PagamentoQuadro`
- Substituir o quadro simplificado de pagamentos pelo componente `PagamentoQuadro`, passando:
  - `valorTotalProdutos={valorTotalPecas}` 
  - `custoTotalProdutos={0}`
  - `lojaVendaId={lojaId}`
  - `onPagamentosChange` para capturar os pagamentos formatados
- Remover o estado local `pagamentos` e handlers manuais (`handlePagamentoChange`, `addPagamento`, `removePagamento`)
- Manter compatibilidade com os pagamentos formatados na funcao `handleRegistrarOS`

---

## 5. Bug de Campo Obrigatorio "Setor"

**Problema:** O campo Setor foi removido da UI, mas a validacao ainda exige que esteja preenchido.

**Correcao em `src/pages/OSAssistenciaNova.tsx`:**
- Na funcao `validarFormulario` (linha ~548): remover a validacao que exige `setor` (nao existe mais checagem explicita de setor nesta funcao, mas existe na UI de alerta de campos obrigatorios)
- No bloco de alerta de campos obrigatorios (linha ~1468): remover a linha `if (!setor) camposFaltando.push('Setor');`
- Na funcao `handleRegistrarOS`: usar um valor padrao `'ASSISTENCIA'` para setor caso esteja vazio, garantindo que a OS sera criada sem erro
- O campo `setor` continua existindo no formulario (linha ~920 com Select), entao verificar se a remocao se refere a visibilidade ou apenas a obrigatoriedade. Como o usuario diz que "o campo Setor foi removido", mas ele ainda existe na UI, a correcao sera remover a **obrigatoriedade** (remover do alerta e da validacao)

---

## 6. Melhorias na Retirada de Pecas e Edicao de OS

### 6.1 Botao de Edicao na Retirada de Pecas

**Arquivo:** `src/pages/AssistRetiradaPecas.tsx`
- Adicionar botao "Editar" ao lado do botao "Ver" (Eye) na coluna de acoes da tabela
- O botao navega para a pagina de detalhes com um parametro `?editar=true` para abrir em modo de edicao

**Arquivo:** `src/pages/AssistRetiradaPecasDetalhes.tsx`
- Detectar o parametro `?editar=true` e habilitar edicao dos campos editaveis (motivo, pecas)
- Registrar cada alteracao no array de timeline da retirada com data/hora, usuario e detalhes da mudanca

### 6.2 Logs de Auditoria na Retirada de Pecas

**Arquivo:** `src/pages/AssistRetiradaPecasDetalhes.tsx`
- Adicionar um Card "Logs de Auditoria" apos o Card de Timeline existente
- O card exibe uma tabela com colunas: Data/Hora, Usuario, Detalhes da Alteracao
- Cada acao (iniciar desmonte, adicionar peca, remover peca, finalizar, cancelar, editar) gera uma entrada no log

**Arquivo:** `src/utils/retiradaPecasApi.ts`
- Adicionar interface `LogAuditoriaRetirada` com campos `id`, `dataHora`, `usuario`, `detalhes`, `tipoAlteracao`
- Adicionar campo `logsAuditoria: LogAuditoriaRetirada[]` na interface `RetiradaPecas`
- Registrar logs em cada funcao que modifica o registro (iniciarDesmonte, finalizarDesmonte, adicionarPecaRetirada, removerPecaRetirada, cancelarRetiradaPecas)

### 6.3 Exibir Solicitacoes de Pecas na Edicao de OS

**Arquivo:** `src/pages/OSAssistenciaEditar.tsx`
- Importar `getSolicitacoesByOS` e `addSolicitacao` de `@/utils/solicitacaoPecasApi`
- Ao carregar a OS, buscar as solicitacoes vinculadas via `getSolicitacoesByOS(id)`
- Exibir o quadro de "Solicitacoes de Pecas" (mesmo layout da Nova Assistencia) com a lista existente e formulario para adicionar novas
- Ao salvar, persistir novas solicitacoes via `addSolicitacao`

---

## Secao Tecnica - Arquivos Alterados

| Arquivo | Alteracoes |
|---------|-----------|
| `src/utils/assistenciaApi.ts` | Adicionar `idVendaAntiga?: string` na interface `OrdemServico` |
| `src/utils/retiradaPecasApi.ts` | Adicionar interface `LogAuditoriaRetirada`, campo `logsAuditoria` em `RetiradaPecas`, registrar logs nas funcoes |
| `src/pages/OSAssistenciaNova.tsx` | Campo ID Venda Antiga, detectar `analiseId`, integrar `PagamentoQuadro`, remover obrigatoriedade de Setor |
| `src/pages/OSAnaliseGarantia.tsx` | Navegar para Nova Assistencia com params em vez de criar OS diretamente |
| `src/pages/OSAssistenciaEditar.tsx` | Exibir e gerenciar solicitacoes de pecas |
| `src/pages/OSAssistenciaDetalhes.tsx` | Exibir campo ID Venda Antiga quando preenchido |
| `src/pages/AssistRetiradaPecas.tsx` | Adicionar botao Editar na tabela |
| `src/pages/AssistRetiradaPecasDetalhes.tsx` | Modo edicao, card de Logs de Auditoria |

