

## Refatoracao da Conferencia Gestor (Assistencia) e Integracao com Financeiro

### Contexto do Problema

Atualmente, apos registrar o pagamento na aba "Nova Assistencia", a OS fica com status "Pendente de Pagamento" e atuacao "Gestor (Conferencia)". A aba "Conferencia Gestor" no modulo de Assistencia tem um layout simples (tabela + drawer basico), diferente do layout robusto da Conferencia do Gestor no modulo de Vendas. Alem disso, apos a aprovacao do gestor, a OS vai direto para "Liquidado" sem passar pela conferencia do financeiro.

### Fluxo Correto a Implementar

```text
Pagamento Registrado (Nova Assistencia)
    |
    v
Pendente de Pagamento / Gestor (Conferencia)
    |  [Gestor confere na aba Conferencia Gestor - Assistencia]
    |
    v
Aguardando Financeiro / Financeiro
    |  [Financeiro confere na aba Conferencia de Contas]
    |
    v
Liquidado / - 
    [Atualiza status em Nova Assistencia, Servicos, Conferencia Gestor]
    [Fica como historico em Conferencia de Contas do Financeiro]
```

---

### Plano de Implementacao

#### 1. Refatorar OSConferenciaGestor.tsx - Layout igual ao VendasConferenciaGestor

**Arquivo:** `src/pages/OSConferenciaGestor.tsx`

Reescrever completamente esta pagina para espelhar o layout da `VendasConferenciaGestor.tsx`, adaptado para OS de assistencia:

**Cards de somatorio por metodo de pagamento:**
- Linha de cards "Pendentes" (vermelho): Credito, Debito, Pix, Dinheiro, Boleto
- Linha de cards "Conferidos" (verde): mesmos metodos
- Cards de contadores: Pendente Conferencia, Aguardando Financeiro, Liquidado

**Filtros:**
- Data Inicio, Data Fim, Loja, Tecnico, Status, Metodo de Pagamento
- Botoes Limpar e Exportar CSV

**Tabela:**
- Colunas: No OS, Data, Cliente, Loja, Tecnico, V. Custo, V. Venda, Total Pago, Status, Acoes
- Linhas coloridas por status (laranja=pendente, verde=liquidado)
- Clique na linha abre drawer lateral

**Drawer lateral (full-height, mesmo modelo Vendas):**
- Info basica da OS (ID, Data, Cliente, Loja, Tecnico, Modelo)
- Resumo da Conclusao do tecnico
- Cards de Valor Custo e Valor Venda
- Pagamentos com comprovantes (usando ComprovantePreview)
- Validacao de Metodos de Pagamento (checkboxes por metodo, mesmo padrao de Vendas)
- Campo de Observacao do Gestor
- Botoes: Conferir (verde), Recusar (vermelho)
- Se ja conferido/liquidado: exibe estado bloqueado

**Logica de aprovacao:**
- Todos os checkboxes de metodo devem estar marcados para habilitar "Conferir"
- Ao conferir: salvar validacoes no localStorage (`validacao_pagamentos_os_${osId}`), salvar observacao do gestor (`observacao_gestor_os_${osId}`), atualizar status da OS para "Aguardando Financeiro" com atuacao "Financeiro"
- Ao recusar: modal com motivo obrigatorio, devolver para "Pendente de Pagamento" com atuacao "Atendente"

#### 2. Adicionar OS de Assistencia na Conferencia de Contas do Financeiro

**Arquivo:** `src/pages/FinanceiroConferencia.tsx`

- No hook `useFluxoVendas`, as OS de assistencia nao estao incluidas (ele busca vendas, nao OS)
- Criar uma secao ou aba dentro da Conferencia de Contas para OS de assistencia, OU integrar diretamente lendo as OS com status "Aguardando Financeiro" e atuacao "Financeiro"

**Abordagem:** Adicionar no `FinanceiroConferencia.tsx` a leitura de OS de assistencia junto com as vendas:
- Importar `getOrdensServico, updateOrdemServico, formatCurrency` de `assistenciaApi`
- Criar `linhasConferenciaOS` (mesmo formato de `LinhaConferencia`) a partir das OS com status "Aguardando Financeiro"
- Mesclar `linhasConferenciaOS` com `linhasConferencia` de vendas, adicionando um badge "Assistencia" para diferenciar
- Na acao de finalizar uma linha de OS: atualizar o status para "Liquidado" e atuacao "-", registrar na timeline
- OS finalizadas ficam como historico na tabela com status "Finalizado/Liquidado" e linha verde

#### 3. Atualizar interface OrdemServico

**Arquivo:** `src/utils/assistenciaApi.ts`

- Garantir que o tipo `Pagamento` inclui campos para comprovante (`comprovante?: string`, `comprovanteNome?: string`, `contaDestino?: string`)
- Confirmar que os pagamentos registrados no PagamentoQuadro salvam esses campos

#### 4. Atualizar status em todas as abas apos finalizacao

Quando o financeiro finaliza (marca como Liquidado) a OS na Conferencia de Contas:
- O status "Liquidado" ja e lido por `getOrdensServico()`, portanto a atualizacao e automatica em:
  - **Nova Assistencia** (OSAssistencia.tsx): mostra com badge "Liquidado"
  - **Servicos** (OSOficina.tsx): se o tecnico tiver a OS nas finalizadas locais, mostra atualizado
  - **Conferencia Gestor** (OSConferenciaGestor.tsx): mostra na tabela com badge verde "Liquidado"

---

### Detalhes Tecnicos

**OSConferenciaGestor.tsx - Nova estrutura:**
- Importar: `Checkbox, ComprovantePreview, AutocompleteLoja, AutocompleteColaborador`
- Estados: `validacoesPagamento[]`, `observacaoGestor`, `osSelecionada`
- Somatorio dinamico: calcular totais por metodo de pagamento das OS filtradas
- Persistencia: `validacao_pagamentos_os_${osId}`, `observacao_gestor_os_${osId}` no localStorage
- Ao aprovar: `updateOrdemServico(id, { status: 'Aguardando Financeiro', proximaAtuacao: 'Financeiro', timeline: [...] })`
- Ao recusar: `updateOrdemServico(id, { status: 'Pendente de Pagamento', proximaAtuacao: 'Atendente', timeline: [...] })`

**FinanceiroConferencia.tsx - Integracao:**
- Adicionar import de `getOrdensServico, getOrdemServicoById, updateOrdemServico` de `assistenciaApi`
- Adicionar import de `getClientes` de `cadastrosApi`
- Criar `linhasConferenciaOS` com mesma interface `LinhaConferencia` adaptada
- Concatenar `[...linhasConferencia, ...linhasConferenciaOS]` para a tabela unificada
- No `handleFinalizar` e `handleConfirmarConferencia`: detectar se e OS (ID comeca com "OS-") e usar `updateOrdemServico` em vez de `finalizarVenda`
- Badge "Assistencia" (azul) ao lado do ID para diferenciar de vendas

**Pagamento interface (assistenciaApi.ts):**
- Adicionar `comprovante?: string`, `comprovanteNome?: string`, `contaDestino?: string` na interface `Pagamento`

