

## Cronometro de Produtividade, Desvinculacao Financeira e Automacao de Custos

### Resumo

Tres funcionalidades independentes que se complementam: (1) cronometro de tempo liquido de bancada nas OS, (2) desvinculacao individual de notas de lotes no financeiro com retorno para assistencia, e (3) autopreenchimento de custo real ao selecionar pecas consignadas ou de retirada.

---

### 1. Cronometro de Produtividade (SLA Real)

**Objetivo**: Medir tempo liquido de bancada por OS, descontando pausas automaticamente.

#### 1.1. Novos campos na interface `OrdemServico`

**Arquivo: `src/utils/assistenciaApi.ts`**

Adicionar na interface `OrdemServico`:
```text
cronometro?: {
  status: 'parado' | 'em_andamento' | 'pausado' | 'finalizado';
  iniciadoEm?: string;        // ISO timestamp do inicio
  pausas: { inicio: string; fim?: string }[];
  finalizadoEm?: string;
  tempoLiquidoMs: number;     // Tempo total descontando pausas (milissegundos)
  editadoPor?: string;        // Se gestor editou manualmente
  tempoManualMs?: number;     // Override manual do gestor
}
```

Funcoes auxiliares:
- `iniciarCronometro(osId, responsavel)` - Registra inicio + timeline
- `pausarCronometro(osId, responsavel)` - Abre periodo de pausa + timeline
- `retomarCronometro(osId, responsavel)` - Fecha periodo de pausa + timeline
- `finalizarCronometro(osId, responsavel)` - Calcula tempo liquido final + timeline
- `editarTempoManual(osId, tempoMs, responsavel)` - Somente gestor
- `calcularTempoLiquido(cronometro)` - Soma os periodos ativos descontando pausas

#### 1.2. Componente de Cronometro

**Novo arquivo: `src/components/assistencia/CronometroOS.tsx`**

Props:
- `osId: string`
- `cronometro: CronometroOS | undefined`
- `onUpdate: (cronometro) => void`
- `readOnly?: boolean` (para visualizacao em Analise de Tratativas)
- `podeEditar?: boolean` (true somente para gestores)

Interface:
- Display digital do tempo em formato HH:MM:SS
- Botoes: "Iniciar Servico" (verde), "Pausar" (amarelo), "Retomar" (azul), "Finalizar" (vermelho)
- Logica: Quando em andamento, atualiza o display a cada segundo via `setInterval`
- Permissoes: O campo de tempo e somente leitura para tecnicos. Gestores veem um botao "Editar Tempo" que abre input manual

#### 1.3. Integracao nas Paginas

**Arquivo: `src/pages/OSAssistenciaEditar.tsx`**
- Inserir o componente `CronometroOS` logo acima do quadro de Pecas/Servicos
- Ao salvar a OS, persistir o estado do cronometro
- Permissao: Verificar `user?.colaborador?.cargo` para habilitar edicao manual (contem 'gestor' ou `eh_gestor`)

**Arquivo: `src/pages/OSAssistenciaNova.tsx`**
- Inserir o componente `CronometroOS` na secao de Pecas/Servicos (cronometro inicia como 'parado')
- Ao registrar a OS, salvar cronometro no estado inicial

**Arquivo: `src/pages/OSAnaliseGarantia.tsx`**
- Adicionar coluna "Tempo" na tabela de tratativas
- Exibir tempo formatado (HH:MM:SS) ou "-" se ainda nao iniciado
- Somente leitura (sem botoes de controle)

**Arquivo: `src/pages/OSAssistenciaDetalhes.tsx`**
- Exibir tempo gasto no detalhamento da OS (somente leitura)

---

### 2. Fluxo de Desvinculacao e Estorno Financeiro

**Objetivo**: Permitir remover uma nota individual de um lote de pagamento ainda nao pago, devolvendo-a para a assistencia.

#### 2.1. Nova funcao na API

**Arquivo: `src/utils/solicitacaoPecasApi.ts`**

Nova funcao `desvincularNotaDeLote`:
```text
desvincularNotaDeLote(notaId: string, motivo: string, responsavel: string):
  1. Localizar a nota e seu lote associado
  2. Validar que o lote ainda esta 'Pendente' (nao pago)
  3. Remover a solicitacao do array solicitacaoIds do lote
  4. Se lote ficou com 1 item, desmontar lote (remover LotePagamento)
  5. Recalcular valorTotal do lote
  6. Reverter status da solicitacao para 'Aprovada' (Pendente de Agrupamento)
  7. Remover/atualizar a nota financeira correspondente
  8. Registrar na timeline da OS: "Nota removida do Lote [ID] pelo Financeiro em [Data/Hora] - Motivo: [texto]"
  9. Retornar solicitacao atualizada
```

#### 2.2. Interface no Financeiro

**Arquivo: `src/pages/FinanceiroNotasAssistencia.tsx`**

No modal de conferencia de notas que possuem `loteId`:
- Exibir lista de itens do lote com botao "Desvincular" por item
- Ao clicar em "Desvincular", abrir sub-dialog:
  - Campo obrigatorio "Motivo da Desvinculacao" (textarea)
  - Confirmacao em duas etapas (checkbox + botao)
- Apos desvincular, atualizar a lista de notas e exibir toast de sucesso

#### 2.3. Reflexo na Assistencia

**Arquivo: `src/pages/OSSolicitacoesPecas.tsx`**
- Solicitacoes com status 'Aprovada' e que ja passaram pelo financeiro devem exibir badge "Pendente de Agrupamento" (amarelo)
- Estas solicitacoes ficam disponiveis novamente para selecao em novos lotes ou encaminhamento individual

---

### 3. Automacao de Custos e Rastreabilidade

**Objetivo**: Quando o tecnico seleciona uma peca consignada ou de retirada no seletor avancado, o sistema busca automaticamente o valor de custo registrado na origem, eliminando digitacao manual.

#### 3.1. Autopreenchimento no Seletor Avancado

**Arquivo: `src/pages/OSAssistenciaEditar.tsx`** (e `OSAssistenciaNova.tsx`)

Na logica de selecao de peca no modal (quando o tecnico clica em uma peca do estoque):

Logica atual:
```text
pecaForm.valor = pecaEstoque.valorCusto (formatado como moeda)
```

Logica adicional a implementar:
- Se `pecaEstoque.loteConsignacaoId` (Consignado): buscar `pecaEstoque.valorCusto` automaticamente -> este e o valor atribuido na remessa de consignacao
- Se `pecaEstoque.origem === 'Retirada de Peca'`: buscar `pecaEstoque.valorCusto` automaticamente -> este e o valor atribuido no desmonte
- Marcar o campo de valor como somente leitura para estas origens (ja implementado para pecas de estoque)
- Preencher `valorCustoReal` com o mesmo valor no momento do salvamento

Isso ja esta parcialmente implementado (linhas 298-328 do OSAssistenciaEditar.tsx), mas o `valorCustoReal` e calculado no salvamento. A melhoria e:
1. Garantir que o valor exibido no seletor ja reflete o custo real da origem
2. Exibir label informativo: "Custo herdado de [Consignacao CONS-XXX / Retirada RET-XXX]"
3. Impedir edicao manual do campo de valor para essas origens

#### 3.2. Integracao com Cards Mestres

Nao requer alteracao adicional: o componente `CustoPorOrigemCards` ja consome `valorCustoReal` das pecas e calcula os totais por origem de servico. A automacao garante que os valores serao sempre fieis ao custo real registrado na origem.

#### 3.3. Label Informativo de Origem

**Arquivo: `src/pages/OSAssistenciaEditar.tsx`** (e `OSAssistenciaNova.tsx`)

No quadro de pecas adicionadas, abaixo dos badges de DNA, exibir texto informativo:
- Para Consignado: "Custo herdado do Lote CONS-XXX"
- Para Retirada: "Custo herdado do desmonte"
- Para Estoque Thiago: "Custo do estoque interno"

---

### Sequencia de Implementacao

1. Atualizar `src/utils/assistenciaApi.ts` (interface cronometro + funcoes)
2. Criar `src/components/assistencia/CronometroOS.tsx`
3. Atualizar `src/pages/OSAssistenciaEditar.tsx` (cronometro + automacao custo + label)
4. Atualizar `src/pages/OSAssistenciaNova.tsx` (cronometro + automacao custo + label)
5. Atualizar `src/pages/OSAnaliseGarantia.tsx` (coluna Tempo)
6. Atualizar `src/pages/OSAssistenciaDetalhes.tsx` (exibir tempo)
7. Atualizar `src/utils/solicitacaoPecasApi.ts` (funcao desvincularNotaDeLote)
8. Atualizar `src/pages/FinanceiroNotasAssistencia.tsx` (botao desvincular + modal)
9. Atualizar `src/pages/OSSolicitacoesPecas.tsx` (badge Pendente de Agrupamento)

### Arquivos Afetados

- `src/utils/assistenciaApi.ts` (interface + funcoes cronometro)
- `src/components/assistencia/CronometroOS.tsx` (novo)
- `src/pages/OSAssistenciaEditar.tsx` (cronometro + automacao custo)
- `src/pages/OSAssistenciaNova.tsx` (cronometro + automacao custo)
- `src/pages/OSAnaliseGarantia.tsx` (coluna Tempo)
- `src/pages/OSAssistenciaDetalhes.tsx` (exibir tempo)
- `src/utils/solicitacaoPecasApi.ts` (desvinculacao)
- `src/pages/FinanceiroNotasAssistencia.tsx` (UI desvinculacao)
- `src/pages/OSSolicitacoesPecas.tsx` (badge)

