

## Plano de Implementacao - 5 Pendencias

### 1. Sincronizacao de Status: Recusa na Analise de Tratativas -> Estoque

**Arquivo:** `src/pages/OSAnaliseGarantia.tsx`

**Problema:** Ao recusar um registro de origem "Estoque", o `statusGeral` volta para "Pendente Estoque" mas os pareceres nao refletem o novo estado.

**Solucao:** Na funcao `handleConfirmarRecusa`, ao detectar `origem === 'Estoque'`, atualizar o produto pendente com:
- `parecerEstoque.status` preservado como "Encaminhado para conferencia da Assistencia"
- Adicionar campo `parecerAssistenciaStatus: 'Recusado'` ou atualizar `parecerAssistencia` com status "Recusado"
- Adicionar entrada na timeline do produto pendente registrando a recusa

**Arquivo:** `src/utils/osApi.ts`

Na funcao `updateProdutoPendente`, garantir que aceite atualizacoes parciais de `parecerAssistencia`.

### 2. Lookup Automatico de Loja ao Selecionar Tecnico

**Arquivo:** `src/pages/OSAnaliseGarantia.tsx`

**Problema:** Ao selecionar um tecnico no modal de aprovacao, o campo "Loja" nao e preenchido automaticamente.

**Solucao:** Adicionar um `useEffect` ou handler `onChange` no Select do tecnico que:
1. Busca o colaborador selecionado via `obterColaboradorById(tecnicoSelecionado)`
2. Preenche `setLojaSelecionada(colaborador.loja_id)` automaticamente
3. O campo de Loja continua editavel para casos excepcionais

### 3. Preenchimento Automatico do Parecer Estoque

**Arquivo:** `src/pages/EstoqueProdutosPendentes.tsx`

**Problema:** Os campos "Responsavel", "Data" e "Hora" do modal de Parecer Estoque nao sao preenchidos automaticamente.

**Solucao:** No modal de salvar parecer:
1. Obter o usuario logado via `useAuthStore` (campo `user.colaborador.nome`)
2. Preencher automaticamente:
   - **Responsavel:** `user.colaborador.nome` (read-only, preenchido no clique)
   - **Data:** `new Date().toISOString().split('T')[0]` (formato YYYY-MM-DD)
   - **Hora:** `new Date().toLocaleTimeString('pt-BR')` (formato HH:mm:ss)
3. Estes valores sao enviados para `salvarParecerEstoque()` e gravados no objeto `ParecerEstoque`

**Arquivo:** `src/utils/osApi.ts`

Atualizar a interface `ParecerEstoque` para incluir campos opcionais `hora` e `dataConfirmacao` separados, alem do `responsavel` que ja existe.

### 4. Correcao de Persistencia de Solicitacoes de Pecas

**Arquivo:** `src/pages/OSAssistenciaDetalhes.tsx`

**Problema:** Ao editar e salvar uma OS, as solicitacoes de pecas desaparecem.

**Causa raiz:** A funcao `handleSaveChanges` chama `updateOrdemServico()` que sobrescreve o objeto inteiro da OS. Como `solicitacoesPecas` vivem em um array separado (`solicitacaoPecasApi.ts`), o bug esta provavelmente na re-leitura apos o save - mas tambem pode estar no fato de que `handleSaveChanges` nao preserva certas propriedades.

**Solucao:**
1. Na funcao `handleSaveChanges`, preservar explicitamente todos os campos da OS que nao estao sendo editados (timeline, valorCustoTecnico, valorVendaTecnico, observacaoOrigem, etc.)
2. Apos o save, recarregar solicitacoes com `getSolicitacoesByOS(os.id)` - ja existe na linha 147-149 mas verificar que funciona
3. Garantir que `updateOrdemServico` em `assistenciaApi.ts` faz merge (`{ ...existing, ...updates }`) e nao substitui o array `timeline`

### 5. Conferencia do Gestor: Conta de Destino e Comprovante

**Arquivo:** `src/pages/OSConferenciaGestor.tsx`

**Problema a):** A "Conta de Destino" informada no pagamento nao aparece na conferencia do gestor.

**Solucao a):** No painel lateral, na secao "Pagamentos Registrados", adicionar a exibicao de `pag.contaDestino` resolvido para o nome da conta via `contasFinanceiras.find()`.

**Problema b):** O comprovante ja e exibido (linhas 703-707 com `ComprovantePreview`), mas verificar se esta sendo passado corretamente no registro do pagamento.

**Solucao b):** Confirmar que `handleSalvarPagamentoVendedor` em `OSAssistenciaDetalhes.tsx` persiste `comprovante`, `comprovanteNome` e `contaDestino` no array de pagamentos da OS.

### 6. Credito no Saldo ao Liquidar OS (Financeiro)

**Arquivo:** `src/pages/FinanceiroConferencia.tsx`

**Problema:** Ao finalizar uma OS no financeiro, o status muda para "Liquidado" mas nenhuma entrada e registrada no extrato da conta de destino.

**Causa raiz:** A funcao `handleFinalizar` para OS (linhas 706-721) apenas atualiza o status para "Liquidado" mas nao salva as validacoes financeiras com `contaDestinoId` no localStorage. O extrato (`FinanceiroExtratoContas.tsx`) le de `validacao_pagamentos_financeiro_${id}` para calcular entradas.

**Solucao:** Antes de chamar `updateOrdemServico` no bloco `isOS`, salvar as validacoes financeiras no localStorage:

```
localStorage.setItem(
  `validacao_pagamentos_financeiro_${vendaSelecionada.id}`,
  JSON.stringify(validacoesNormalizadas)
);
```

Isso ja acontece para vendas normais (linha 680-683), mas o bloco `isOS` (linhas 706-721) pula essa logica. A correcao e garantir que o mesmo fluxo de persistencia de validacoes seja executado para OS antes de chamar `updateOrdemServico`.

---

### Resumo de Arquivos a Alterar

| Arquivo | Alteracoes |
|---|---|
| `src/pages/OSAnaliseGarantia.tsx` | Atualizar pareceres ao recusar; auto-preencher loja ao selecionar tecnico |
| `src/utils/osApi.ts` | Expandir `updateProdutoPendente` para aceitar `parecerAssistencia`; adicionar campos de auditoria em `ParecerEstoque` |
| `src/pages/EstoqueProdutosPendentes.tsx` | Auto-preencher responsavel/data/hora no modal de parecer via `useAuthStore` |
| `src/pages/OSAssistenciaDetalhes.tsx` | Preservar campos existentes no save; persistir `contaDestino`/`comprovante` nos pagamentos |
| `src/pages/OSConferenciaGestor.tsx` | Exibir conta de destino nos pagamentos; importar `getContasFinanceiras` |
| `src/pages/FinanceiroConferencia.tsx` | Persistir validacoes financeiras para OS antes de liquidar |

