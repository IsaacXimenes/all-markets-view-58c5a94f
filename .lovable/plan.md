

# Plano de Reestruturacao - Modulo de Assistencia e Estoque

## Visao Geral

Este plano abrange uma reestruturacao significativa do modulo de Assistencia (renomeacao, reordenacao e integracao de abas) e ajustes no modulo de Estoque (status, filtros, cards e renomeacao de origem).

---

## 1. Reestruturacao das Abas do Modulo de Assistencia

### 1.1 Renomear e Reordenar Abas

**Arquivos:** `src/components/layout/OSLayout.tsx`, `src/components/layout/AssistenciaLayout.tsx`

Alterar a lista de abas para:
1. Analise de Tratativas (primeira)
2. Nova Assistencia (renomeada de "Assistencia")
3. Estoque - Assistencia
4. Retirada de Pecas
5. Solicitacoes de Pecas
6. Historico de Notas
7. Movimentacao - Pecas (nova aba)

Remover: "Produtos para Analise" e "Historico de Assistencia" como abas independentes.

### 1.2 Integrar "Produtos para Analise" na aba "Analise de Tratativas"

**Arquivo:** `src/pages/OSAnaliseGarantia.tsx`

- Adicionar sub-tabs internas: "Tratativas" e "Produtos para Analise"
- Mover a logica completa de `OSProdutosAnalise.tsx` (filtros, tabela, modal de parecer) para dentro desta pagina como segunda sub-tab
- Manter a rota `/os/produtos-analise` redirecionando para `/os/analise-garantia?tab=produtos`
- Adicionar botao de tesoura (Scissors) para itens com Origem: Garantia aprovados, encaminhando para Retirada de Pecas

### 1.3 Integrar "Historico de Assistencia" na aba "Nova Assistencia"

**Arquivo:** `src/pages/OSAssistencia.tsx`

- Renomear titulo para "Nova Assistencia"
- Adicionar botao "Historico" (icone History) que abre um Collapsible ou modal lateral com a tabela de historico (conteudo de `OSHistoricoAssistencia.tsx`)

### 1.4 Nova aba "Movimentacao - Pecas"

**Arquivo novo:** `src/pages/OSMovimentacaoPecas.tsx`

- Criar pagina seguindo o layout de `EstoqueMovimentacoes.tsx` adaptado para pecas
- Rota: `/os/movimentacao-pecas`
- Registrar no `App.tsx`

---

## 2. Ajustes na Aba "Nova Assistencia" (formulario)

**Arquivo:** `src/pages/OSAssistenciaNova.tsx`

### 2.1 Remover campo "Setor"
- Remover o Select de setor do formulario (linhas que referenciam `setor`, `setSetor`)
- Manter a logica interna de setor como "ASSISTENCIA" por padrao ou inferido da origem

### 2.2 Corrigir selecao de estoque
- Revisar a filtragem de `pecasEstoque` para garantir que todos os aparelhos disponiveis aparecem
- Corrigir o handler de clique para adicionar/selecionar aparelho corretamente

### 2.3 Corrigir draft do vendedor
- Adicionar `vendedorId` ao objeto salvo/carregado pelo draft (`saveDraft` e `handleLoadDraft`)

### 2.4 Corrigir data D+1
- Verificar se `dataHora` esta sendo convertida com timezone local, corrigindo para `new Date().toISOString()` sem offset

### 2.5 Validacao visual com bordas vermelhas
- Adicionar classes condicionais `border-destructive` nos campos obrigatorios nao preenchidos (loja, tecnico, cliente, status)

---

## 3. Ajustes na Aba "Solicitacoes de Pecas"

**Arquivo:** `src/pages/OSSolicitacoesPecas.tsx` e `src/utils/solicitacaoPecasApi.ts`

### 3.1 Corrigir coluna Loja (LOJA-001 para nome real)
- Mock data em `solicitacaoPecasApi.ts` usa IDs legados ("LOJA-001", "LOJA-002", etc.)
- Atualizar mock data para usar UUIDs reais das lojas do cadastro
- Garantir que a coluna usa `obterNomeLoja(s.lojaSolicitante)` para exibicao

### 3.2 Botao "Cancelar" solicitacao
- Adicionar status "Cancelada" ao tipo `SolicitacaoPeca`
- Adicionar funcao `cancelarSolicitacao(id, observacao)` na API
- Adicionar botao de cancelar (icone X) com modal de observacao obrigatoria
- Atualizar status da OS correspondente

---

## 4. Modulo de Estoque

### 4.1 Aba "Assistencia" (Estoque - Assistencia / OSPecas)

**Arquivo:** `src/pages/OSPecas.tsx`

- Adicionar 2 cards no topo: "Valor Total - Notas de Compra" e "Valor Total - Retirada de Pecas"
- Adicionar filtros: por Origem e por Modelo

### 4.2 Aba "Aparelhos Pendentes" - Encaminhamento

**Arquivo:** `src/pages/EstoqueProdutosPendentes.tsx` (ou detalhes)

- Ao encaminhar para assistencia, redirecionar para `/os/analise-garantia` (nao `/os/produtos-analise`)

### 4.3 Status de Aparelhos

**Arquivo:** `src/utils/estoqueApi.ts` e logica de status

- Quando OS tem setor "TROCA": status no estoque deve ser "Troca - Garantia" (nao "Vendido")
- Quando parecer e "Emprestado": status deve ser "Emprestado" (nao "Vendido")
- Registrar IMEI no retorno de emprestimo

### 4.4 Renomear "Manual" para "Produto Thiago"

- Buscar todas as referencias de origem "Manual" e renomear para "Produto Thiago"

---

## 5. Rotas e Navegacao

**Arquivo:** `src/App.tsx`

- Adicionar rota `/os/movimentacao-pecas` para `OSMovimentacaoPecas`
- Manter `/os/produtos-analise` como redirect para `/os/analise-garantia?tab=produtos`

---

## Detalhes Tecnicos

### Arquivos a criar:
- `src/pages/OSMovimentacaoPecas.tsx` - Nova aba de movimentacao de pecas

### Arquivos a modificar:
- `src/components/layout/OSLayout.tsx` - Reordenar abas, remover "Produtos para Analise" e "Historico de Assistencia", adicionar "Movimentacao - Pecas"
- `src/components/layout/AssistenciaLayout.tsx` - Mesma reestruturacao de abas
- `src/pages/OSAnaliseGarantia.tsx` - Integrar conteudo de Produtos para Analise com sub-tabs, adicionar botao tesoura
- `src/pages/OSAssistencia.tsx` - Renomear para "Nova Assistencia", integrar historico como modal/collapsible
- `src/pages/OSAssistenciaNova.tsx` - Remover campo setor, corrigir draft vendedor, corrigir data D+1, validacao visual, corrigir selecao estoque
- `src/pages/OSSolicitacoesPecas.tsx` - Corrigir nomes de loja, adicionar botao cancelar
- `src/utils/solicitacaoPecasApi.ts` - Atualizar IDs legados de loja, adicionar funcao cancelar, adicionar status "Cancelada"
- `src/pages/OSPecas.tsx` - Adicionar cards de valor por origem e filtros
- `src/utils/estoqueApi.ts` - Logica de status "Troca - Garantia" e "Emprestado"
- `src/App.tsx` - Adicionar rota de movimentacao pecas

### Sequenciamento:
1. Primeiro: atualizar APIs (solicitacaoPecasApi, estoqueApi) com novos status e funcoes
2. Segundo: reestruturar layouts de abas (OSLayout, AssistenciaLayout)
3. Terceiro: modificar paginas existentes (OSAnaliseGarantia, OSAssistencia, OSAssistenciaNova, OSSolicitacoesPecas, OSPecas)
4. Quarto: criar nova pagina OSMovimentacaoPecas
5. Quinto: atualizar App.tsx com novas rotas
6. Sexto: renomear "Manual" para "Produto Thiago" em todo o sistema

