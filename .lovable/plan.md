
## Gestao de Pecas em Consignacao

### Resumo

Implementar o fluxo completo de consignacao: cadastro de lotes com rastreabilidade, injecao automatica no Estoque-Assistencia com tag [CONSIGNADO], baixa automatica por uso em OS, repasse entre unidades, acerto de contas manual com integracao financeira, guia de devolucao com auditoria, e dossie historico imutavel.

---

### 1. Nova API de Consignacao (`src/utils/consignacaoApi.ts`) - ARQUIVO NOVO

**Interface `LoteConsignacao`:**
- `id`: string (CONS-001, CONS-002...)
- `fornecedorId`: string
- `dataCriacao`: string
- `responsavelCadastro`: string
- `status`: 'Aberto' | 'Em Acerto' | 'Pago' | 'Devolvido'
- `itens`: `ItemConsignacao[]`
- `timeline`: `TimelineConsignacao[]`

**Interface `ItemConsignacao`:**
- `id`: string (CONS-ITEM-001)
- `pecaId`: string (referencia ao PEC-XXXX injetado no estoque)
- `descricao`: string
- `modelo`: string
- `quantidade`: number
- `quantidadeOriginal`: number
- `valorCusto`: number
- `lojaAtualId`: string
- `status`: 'Disponivel' | 'Consumido' | 'Devolvido' | 'Em Acerto'
- `osVinculada?`: string (OS que consumiu)
- `dataConsumo?`: string
- `tecnicoConsumo?`: string
- `devolvidoPor?`: string
- `dataDevolucao?`: string

**Interface `TimelineConsignacao`:**
- `data`: string
- `tipo`: 'entrada' | 'consumo' | 'transferencia' | 'acerto' | 'devolucao' | 'pagamento'
- `descricao`: string
- `responsavel`: string

**Funcoes principais:**
- `criarLoteConsignacao(dados)`: Cria o lote, injeta pecas no estoque (via `addPeca` com origem 'Consignacao') e registra na timeline
- `getLotesConsignacao()`, `getLoteById(id)`
- `registrarConsumoConsignacao(loteId, itemId, osId, tecnico)`: Baixa automatica, registra consumo no dossie
- `transferirItemConsignacao(loteId, itemId, novaLojaId, responsavel)`: Transfere mantendo vinculo ao lote original
- `iniciarAcertoContas(loteId, responsavel)`: Muda status para 'Em Acerto', congela retiradas, calcula valor total consumido
- `confirmarDevolucaoItem(loteId, itemId, responsavel)`: Marca item como devolvido, remove do estoque
- `gerarLoteFinanceiro(loteId)`: Cria NotaAssistencia consolidada com tipo consignacao para o Financeiro
- `finalizarAcerto(loteId)`: Chamado apos confirmacao financeira, muda status para 'Pago'

**Integracao com `pecasApi.ts`:**
- Adicionar nova origem 'Consignacao' na interface `Peca` (campo `origem`)
- Adicionar campo opcional `loteConsignacaoId?: string` na interface `Peca`
- Ao criar lote, chamar `addPeca()` com origem 'Consignacao' e `loteConsignacaoId`
- Ao registrar consumo via OS, chamar `darBaixaPeca()` existente + registrar no dossie

---

### 2. Nova Pagina - Entrada de Consignacao (`src/pages/OSConsignacao.tsx`) - ARQUIVO NOVO

**Tela principal com 3 secoes:**

**2.1 Dashboard Cards:**
- Total de Lotes Abertos
- Pecas Consignadas Disponiveis
- Valor em Consignacao
- Lotes em Acerto

**2.2 Tabela de Lotes:**
- Colunas: ID | Fornecedor | Data Criacao | Qtd Itens | Valor Total | Consumidos | Disponiveis | Status | Acoes
- Badges de status: Aberto (azul), Em Acerto (amarelo), Pago (verde), Devolvido (cinza)
- Acoes: Ver Dossie, Iniciar Acerto (se Aberto)

**2.3 Modal "Novo Lote de Consignacao":**
- Fornecedor (AutocompleteFornecedor)
- Responsavel (auto-preenchido, disabled)
- Tabela de itens: Descricao | Modelo | Qtd | Valor Custo | Loja Destino
- Botao "Adicionar Item" e "Remover Item"
- Valor Total (soma automatica)
- Botao "Cadastrar Lote"

**2.4 Modal "Dossie do Lote" (Detalhamento):**
- Cabecalho: ID, Fornecedor, Data, Status, Valor Total, Responsavel
- 3 abas internas:
  - **Inventario**: Tabela com todos os itens (status individual, loja atual, OS vinculada se consumido)
  - **Timeline**: Historico imutavel cronologico de todas as acoes
  - **Devolucao**: Lista de itens nao consumidos com botao "Confirmar Devolucao" por item (exige usuario logado + data/hora)

**2.5 Modal "Iniciar Acerto de Contas":**
- Resumo: Itens consumidos x valor
- Lista detalhada dos itens consumidos (OS, tecnico, data)
- Lista de itens para devolucao (sobras)
- Botao "Gerar Lote Financeiro" -> cria nota no Financeiro
- Campos de pagamento: Forma (Pix/Dinheiro), Conta, Nome Recebedor, Chave Pix, Observacao

---

### 3. Integracao com Estoque-Assistencia (`src/pages/OSPecas.tsx`)

**Tag [CONSIGNADO]:**
- Na coluna "Descricao", pecas com `origem === 'Consignacao'` exibem badge `[CONSIGNADO]` em destaque (cor roxa/violeta)
- Adicionar 'Consignacao' como opcao no filtro de Origem
- No modal de detalhes, exibir campo "Lote Consignacao" com o ID do lote vinculado

**Integracao com darBaixaPeca:**
- Ao dar baixa em peca consignada via OS (fluxo existente), alem da baixa normal, chamar `registrarConsumoConsignacao` para registrar no dossie do lote

---

### 4. Integracao com Selecao de Pecas na OS

**Nos modais de criacao/edicao de OS** (OSAssistenciaNova, OSAssistenciaEditar, OSOficina):
- Pecas consignadas aparecem na lista de "Peca no Estoque" normalmente (ja injetadas pelo cadastro)
- Identificacao visual: badge [CONSIGNADO] ao lado do nome na lista de selecao
- A baixa automatica no estoque ja dispara o registro no dossie via integracao do item 3

---

### 5. Integracao Financeira (`src/pages/FinanceiroNotasAssistencia.tsx`)

- Notas geradas por acerto de consignacao exibem badge "Consignacao" (cor violeta) na coluna Tipo
- Modal de conferencia exibe: Lote ID, Fornecedor, lista detalhada de itens consumidos (OS, peca, valor)
- Ao finalizar nota de consignacao, chamar `finalizarAcerto` para atualizar status do lote para 'Pago'

---

### 6. Roteamento e Navegacao

**Nova rota em `src/App.tsx`:**
- `/os/consignacao` -> `OSConsignacao`

**Nova aba no `OSLayout.tsx`:**
- Adicionar tab "Consignacao" (icone PackageCheck) entre "Estoque - Assistencia" e "Retirada de Pecas"

---

### 7. Atualizacao de `pecasApi.ts`

- Adicionar 'Consignacao' ao tipo `origem` da interface `Peca`
- Adicionar campo `loteConsignacaoId?: string` na interface `Peca`
- Atualizar `darBaixaPeca` para, se a peca tiver `loteConsignacaoId`, disparar callback de registro de consumo

---

### Detalhes Tecnicos

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/consignacaoApi.ts` | **NOVO** - Interfaces e logica completa de consignacao |
| `src/utils/pecasApi.ts` | Adicionar origem 'Consignacao', campo `loteConsignacaoId`, hook de consumo em `darBaixaPeca` |
| `src/pages/OSConsignacao.tsx` | **NOVO** - Tela completa com dashboard, tabela de lotes, modais de cadastro/dossie/acerto |
| `src/pages/OSPecas.tsx` | Badge [CONSIGNADO], filtro 'Consignacao', campo lote no modal de detalhes |
| `src/pages/FinanceiroNotasAssistencia.tsx` | Badge "Consignacao", modal expandido para notas de acerto |
| `src/components/layout/OSLayout.tsx` | Nova tab "Consignacao" |
| `src/App.tsx` | Nova rota `/os/consignacao` |
| `src/utils/solicitacaoPecasApi.ts` | Tipo 'Consignacao' em NotaAssistencia para integracao financeira |

### Sequencia de Implementacao

1. `consignacaoApi.ts` + atualizacoes em `pecasApi.ts` (modelo de dados)
2. `OSConsignacao.tsx` (tela principal com todos os modais)
3. Roteamento (`App.tsx`) e navegacao (`OSLayout.tsx`)
4. Integracao `OSPecas.tsx` (tag visual + filtro)
5. Integracao `FinanceiroNotasAssistencia.tsx` (conferencia de acerto)
6. Integracao `solicitacaoPecasApi.ts` (tipo consignacao na nota)
